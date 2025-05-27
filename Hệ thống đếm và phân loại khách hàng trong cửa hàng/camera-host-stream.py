#!/usr/bin/env python3
"""
Camera Host Stream for Windows
Runs on Windows host to stream camera feed that Docker containers can access
"""
import cv2
import threading
import time
from flask import Flask, Response
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

# Global variables
camera = None
camera_lock = threading.Lock()
frame_buffer = None
buffer_lock = threading.Lock()

def initialize_camera():
    """Initialize camera with fallback options"""
    global camera
    
    print("Initializing camera on Windows host...")
    
    # Try different camera backends and indices
    backends = [cv2.CAP_DSHOW, cv2.CAP_MSMF, cv2.CAP_ANY]
    
    for backend in backends:
        for i in range(5):
            try:
                print(f"Trying camera {i} with backend {backend}")
                cap = cv2.VideoCapture(i, backend)
                if cap.isOpened():
                    # Test if we can read a frame
                    ret, frame = cap.read()
                    if ret and frame is not None:
                        print(f"Camera found at index {i} with backend {backend}")
                        
                        # Set camera properties for better performance
                        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                        cap.set(cv2.CAP_PROP_FPS, 15)
                        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                        
                        camera = cap
                        return True
                    cap.release()
            except Exception as e:
                print(f"Failed to initialize camera {i} with backend {backend}: {e}")
                continue
    
    print("No camera found on host!")
    return False

def capture_frames():
    """Continuously capture frames in background thread"""
    global frame_buffer, camera
    
    while True:
        try:
            with camera_lock:
                if camera is None or not camera.isOpened():
                    if not initialize_camera():
                        time.sleep(5)
                        continue
                
                ret, frame = camera.read()
                
                if ret and frame is not None:
                    with buffer_lock:
                        frame_buffer = frame.copy()
                else:
                    print("Failed to read frame, reinitializing camera...")
                    camera.release()
                    camera = None
                    time.sleep(1)
                    continue
                    
        except Exception as e:
            print(f"Error in capture thread: {e}")
            with camera_lock:
                if camera:
                    camera.release()
                    camera = None
            time.sleep(1)
        
        time.sleep(1/15)  # 15 FPS

def generate_frames():
    """Generate video frames for streaming"""
    while True:
        with buffer_lock:
            if frame_buffer is not None:
                frame = frame_buffer.copy()
            else:
                # Create a black frame with message if no camera
                frame = cv2.zeros((480, 640, 3), dtype=cv2.uint8)
                cv2.putText(frame, 'No Camera Available', (150, 200), 
                          cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
                cv2.putText(frame, 'Please check camera connection', (100, 250), 
                          cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        
        # Encode frame
        try:
            ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
            if ret:
                frame_bytes = buffer.tobytes()
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        except Exception as e:
            print(f"Error encoding frame: {e}")
        
        time.sleep(1/15)  # 15 FPS

@app.route('/video_feed')
def video_feed():
    """Video streaming route"""
    return Response(generate_frames(),
                   mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/health')
def health():
    """Health check endpoint"""
    return {'status': 'ok', 'camera_available': camera is not None and camera.isOpened()}

@app.route('/')
def index():
    return '''
    <html>
    <head><title>Camera Stream</title></head>
    <body>
        <h1>Camera Stream Running</h1>
        <p>Stream available at: <a href="/video_feed">/video_feed</a></p>
        <p>Health check: <a href="/health">/health</a></p>
        <img src="/video_feed" width="640" height="480" />
    </body>
    </html>
    '''

if __name__ == '__main__':
    print("Starting camera stream server on Windows host...")
    print("This will run on localhost:8554")
    print("Docker containers can access via host.docker.internal:8554")
    
    # Initialize camera
    initialize_camera()
    
    # Start capture thread
    capture_thread = threading.Thread(target=capture_frames, daemon=True)
    capture_thread.start()
    
    print("Camera stream server ready!")
    print("Access stream at: http://localhost:8554/video_feed")
    app.run(host='0.0.0.0', port=8554, debug=False, threaded=True)

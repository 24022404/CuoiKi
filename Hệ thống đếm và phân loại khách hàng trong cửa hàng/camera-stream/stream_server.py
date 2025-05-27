#!/usr/bin/env python3
"""
Camera Stream Server for Docker
Streams camera feed that can be accessed by other containers
"""
import cv2
import threading
import time
from flask import Flask, Response
from flask_cors import CORS

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
    
    # Try different camera indices
    for i in range(5):
        try:
            cap = cv2.VideoCapture(i)
            if cap.isOpened():
                # Test if we can read a frame
                ret, frame = cap.read()
                if ret and frame is not None:
                    print(f"Camera found at index {i}")
                    
                    # Set camera properties for better performance
                    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                    cap.set(cv2.CAP_PROP_FPS, 15)
                    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                    
                    camera = cap
                    return True
                cap.release()
        except Exception as e:
            print(f"Failed to initialize camera {i}: {e}")
            continue
    
    print("No camera found!")
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
                # Create a black frame if no camera
                frame = cv2.imread('no_camera.jpg')
                if frame is None:
                    frame = cv2.zeros((480, 640, 3), dtype=cv2.uint8)
                    cv2.putText(frame, 'No Camera Available', (150, 240), 
                              cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        
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

if __name__ == '__main__':
    print("Starting camera stream server...")
    
    # Initialize camera
    initialize_camera()
    
    # Start capture thread
    capture_thread = threading.Thread(target=capture_frames, daemon=True)
    capture_thread.start()
    
    print("Camera stream server ready on port 8554")
    app.run(host='0.0.0.0', port=8554, debug=False, threaded=True)

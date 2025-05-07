# Bản sửa lỗi cho app.py - sao chép nội dung này vào app.py nếu muốn áp dụng

from flask import Flask, request, jsonify, Response
from deepface import DeepFace
import cv2
import numpy as np
import threading
import time
import json
from flask_cors import CORS
from datetime import datetime
import os
import base64
from database import Database

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Initialize database
db = Database()

# Store the latest analysis results
latest_analysis = {
    "total_count": 0,
    "male_count": 0,
    "female_count": 0,
    "age_groups": {
        "young": 0,  # 0-20
        "adult": 0,  # 21-40
        "middle_aged": 0,  # 41-60
        "elderly": 0   # 60+
    },
    "timestamp": datetime.now().isoformat()
}

# Camera settings and variables
camera = None
processing_frame = False
processed_frame = None
detector_backends = ['opencv', 'ssd', 'mtcnn', 'retinaface']  # Danh sách các detector
current_detector_index = 0  # Bắt đầu với opencv
failed_detections = 0  # Đếm số lần không phát hiện được khuôn mặt
max_failed_detections = 30  # Số lần tối đa trước khi chuyển detector

def get_age_group(age):
    if age <= 20:
        return "young"
    elif age <= 40:
        return "adult"
    elif age <= 60:
        return "middle_aged"
    else:
        return "elderly"

def process_frame(frame):
    global latest_analysis, processing_frame, current_detector_index, failed_detections
    
    if processing_frame:
        return
    
    processing_frame = True
    
    try:
        # Log thông tin cấu hình
        current_detector = detector_backends[current_detector_index]
        print(f"Đang sử dụng detector: {current_detector}")
        
        # Resize frame for faster processing
        small_frame = cv2.resize(frame, (0, 0), fx=0.5, fy=0.5)
        
        # Convert to RGB for DeepFace
        rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
        
        # Analyze using DeepFace
        results = DeepFace.analyze(
            img_path=rgb_small_frame,
            actions=['age', 'gender'],
            enforce_detection=False,  # Đã thay đổi sang False để tránh lỗi khi không phát hiện được khuôn mặt
            detector_backend=current_detector
        )
        
        # If single face is detected, convert to list
        if isinstance(results, dict):
            results = [results]
        
        # Reset counts
        total_count = len(results)
        
        # Kiểm tra số khuôn mặt phát hiện được
        if total_count == 0:
            failed_detections += 1
            print(f"Không phát hiện khuôn mặt nào. Lần thử {failed_detections}/{max_failed_detections}")
            
            # Nếu quá nhiều lần không phát hiện được, thử chuyển sang detector khác
            if failed_detections >= max_failed_detections:
                current_detector_index = (current_detector_index + 1) % len(detector_backends)
                print(f"Đã chuyển sang detector: {detector_backends[current_detector_index]}")
                failed_detections = 0
        else:
            # Phát hiện thành công, reset đếm
            failed_detections = 0
            print(f"Đã phát hiện {total_count} khuôn mặt!")
                
        male_count = 0
        female_count = 0
        age_groups = {
            "young": 0,
            "adult": 0, 
            "middle_aged": 0,
            "elderly": 0
        }
        
        # Process each detected face
        for face in results:
            # Log thông tin khuôn mặt đã phát hiện
            print(f"Khuôn mặt: {face.get('gender', {}).get('dominant', 'Unknown')}, {face.get('age', 0)} tuổi")
            
            # Count by gender
            if face.get("gender", {}).get("dominant") == "Man":
                male_count += 1
            else:
                female_count += 1
                
            # Count by age group
            age = face.get("age", 0)
            age_group = get_age_group(age)
            age_groups[age_group] += 1
            
            # Draw on frame (for visualization)
            region = face.get("region", {})
            if region:
                x, y, w, h = region.get("x", 0), region.get("y", 0), region.get("w", 0), region.get("h", 0)
                x, y, w, h = int(x*2), int(y*2), int(w*2), int(h*2)  # Scale back to original size
                
                color = (0, 255, 0)  # Green for female
                if face.get("gender", {}).get("dominant") == "Man":
                    color = (255, 0, 0)  # Blue for male
                    
                cv2.rectangle(frame, (x, y), (x+w, y+h), color, 2)
                
                # Add text for age and gender
                gender = face.get("gender", {}).get("dominant", "Unknown")
                label = f"{gender}, {age}"
                cv2.putText(frame, label, (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
        
        # Update latest analysis
        latest_analysis = {
            "total_count": total_count,
            "male_count": male_count,
            "female_count": female_count,
            "age_groups": age_groups,
            "timestamp": datetime.now().isoformat()
        }
        
        # Save to database
        db.save_analysis(latest_analysis)
        
        # Add summary text to frame
        summary = f"Total: {total_count} | Male: {male_count} | Female: {female_count}"
        cv2.putText(frame, summary, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
        
        age_summary = f"Young: {age_groups['young']} | Adult: {age_groups['adult']} | Middle: {age_groups['middle_aged']} | Elderly: {age_groups['elderly']}"
        cv2.putText(frame, age_summary, (10, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        
        # Add detector info
        detector_info = f"Detector: {current_detector}"
        cv2.putText(frame, detector_info, (10, frame.shape[0] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        global processed_frame
        processed_frame = frame.copy()
        
    except Exception as e:
        print(f"Lỗi khi xử lý frame: {e}")
    
    finally:
        processing_frame = False

def gen_frames():
    global camera, processed_frame
    
    if camera is None:
        camera = cv2.VideoCapture(0)  # Use default camera
        
        # Thử thiết lập độ phân giải cao hơn cho webcam
        camera.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    
    while True:
        success, frame = camera.read()
        if not success:
            print("Không thể đọc được frame từ camera!")
            break
        
        # Process frame in a separate thread to avoid blocking
        threading.Thread(target=process_frame, args=(frame.copy(),)).start()
        
        # Use processed frame if available, otherwise use original
        display_frame = processed_frame if processed_frame is not None else frame
        
        # Convert to JPEG
        ret, buffer = cv2.imencode('.jpg', display_frame)
        frame_bytes = buffer.tobytes()
        
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        
        # Điều chỉnh tốc độ khung hình, tăng lên để giảm độ trễ
        time.sleep(0.05)

@app.route('/video_feed')
def video_feed():
    return Response(gen_frames(),
                   mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/analyze', methods=['POST'])
def analyze_image():
    try:
        # Get image data from request
        image_data = request.json.get('image')
        if not image_data or not image_data.startswith('data:image'):
            return jsonify({"error": "Invalid image data"}), 400
        
        # Extract base64 data
        image_data = image_data.split(',')[1]
        image_bytes = base64.b64decode(image_data)
        
        # Convert to image
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Process image
        process_frame(img)
        
        return jsonify(latest_analysis)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/latest_analysis')
def get_latest_analysis():
    return jsonify(latest_analysis)

@app.route('/historical_data')
def get_historical_data():
    data = db.get_historical_data()
    return jsonify(data)

@app.route('/')
def index():
    return jsonify({"status": "running", "message": "Customer Counting and Classification API"})

@app.route('/camera_status')
def camera_status():
    global camera
    if camera is None:
        try:
            init_camera()
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500
    
    if camera is not None and camera.isOpened():
        return jsonify({"status": "ok", "message": "Camera is working"})
    else:
        return jsonify({"status": "error", "message": "Camera is not available"}), 500

def init_camera():
    global camera
    try:
        camera = cv2.VideoCapture(0)  # Use default camera
        camera.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        
        if not camera.isOpened():
            print("Warning: Could not open camera. Video feed will not work.")
        else:
            print("Camera initialized successfully.")
    except Exception as e:
        print(f"Error initializing camera: {e}")

# Initialize camera when app starts
init_camera()

if __name__ == '__main__':
    print("\n" + "="*50)
    print("Starting Customer Counting and Classification API...")
    print("1. Truy cập API tại địa chỉ: http://localhost:5000")
    print("2. Mở giao diện web bằng cách mở file: frontend/index.html trong trình duyệt")
    print("3. Nếu gặp sự cố, hãy chạy: python test_camera.py để kiểm tra camera")
    print("="*50 + "\n")
    
    app.run(host='0.0.0.0', port=5000, debug=True)

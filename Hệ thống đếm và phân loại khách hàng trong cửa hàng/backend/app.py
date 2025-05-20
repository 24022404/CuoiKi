from flask import Flask, request, jsonify, Response
from deepface import DeepFace
import cv2
import numpy as np
import time
import threading
from flask_cors import CORS
from datetime import datetime
from threading import Thread
import base64
import os
from database import Database
import jwt
from functools import wraps
from datetime import datetime, timedelta
from face_analysis_utils import *

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
frame_lock = threading.Lock()
last_processed_frame = None
frame_count = 0
FRAME_INTERVAL = 5  # Cứ mỗi 5 frame thì xử lý 1 lần
input_frame = None
camera = None
processing = False  
detector_backends = ['opencv', 'ssd', 'mtcnn', 'retinaface']  # Danh sách các detector
current_detector_index = 0  # Bắt đầu với opencv
failed_detections = 0  # Đếm số lần không phát hiện được khuôn mặt
max_failed_detections = 30  # frame_lock Số lần tối đa trước khi chuyển detector

app.config['SECRET_KEY'] = 'your-secret-key-change-this'  # Change this in production!
app.config['JWT_EXPIRATION_DELTA'] = 24 * 60 * 60  # 24 hours in seconds

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]

        if not token:
            return jsonify({'message': 'Token is missing!'}), 401

        try:
            # Decode token
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            user_id = data.get('user_id')
            if not user_id:
                return jsonify({'message': 'Token payload missing user ID'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token is invalid'}), 401

        return f(user_id, *args, **kwargs)  # Trả lại user_id để dùng tiếp

    return decorated

def process_frame(frame):
    global latest_analysis
    try:
        detector = 'opencv'
        frame = enhance_frame(frame)
        rgb_small = preprocess_frame(frame)
        results = analyze_faces(rgb_small, detector)

        total_count = len(results)
        male_count = female_count = 0
        age_groups = {"young": 0, "adult": 0, "middle_aged": 0, "elderly": 0}

        for face in results:
            age = face.get("age", 0)
            region = face.get("region", {})
            gender, confidence = classify_gender(face)

            if gender == "Man":
                male_count += 1
            elif gender == "Woman":
                female_count += 1

            age_group = get_age_group(age)
            age_groups[age_group] += 1

            draw_face_overlay(frame, face, gender, age, region, confidence)

        latest_analysis = {
            "total_count": total_count,
            "male_count": male_count,
            "female_count": female_count,
            "age_groups": age_groups,
            "timestamp": datetime.now().isoformat()
        }

        draw_summary_overlay(frame, latest_analysis, detector)

    except Exception as e:
        print(f"Lỗi khi xử lý khung hình: {e}")

    return frame

def frame_processor():
    global input_frame, last_processed_frame, processing, frame_count
    while True:
        time.sleep(0.005)  # tránh busy-loop quá mức
        if processing:
            continue

        with frame_lock:
            frame = input_frame
            current_frame_count = frame_count

        if frame is None or current_frame_count % FRAME_INTERVAL != 0:
            continue

        processing = True
        try:
            processed = process_frame(frame)
            with frame_lock:
                last_processed_frame = processed.copy()
        except Exception as e:
            print("❌ Error in background processing:", e)
        finally:
            with frame_lock:
                input_frame = None
            processing = False

def gen_frames():
    global input_frame
    count = 0
    while True:
        success, frame = camera.read()
        if not success:
            break
        count += 1
        if count % FRAME_INTERVAL == 0:
            with frame_lock:
                input_frame = frame.copy()
        with frame_lock:
            output = last_processed_frame.copy() if last_processed_frame is not None else frame
        _, buffer = cv2.imencode('.jpg', output)
        yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
    camera.release()

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
@token_required
def get_historical_data(current_user):
    days = request.args.get('days', default=7, type=int)
    data = db.get_historical_data(days=days)
    return jsonify(data)

@app.route('/auth/login', methods=['POST'])
def login():
    data = request.json
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'message': 'Username and password are required!'}), 400
    
    user, message = db.authenticate_user(data['username'], data['password'])
    
    if not user:
        return jsonify({'message': message}), 401
    
    # Generate JWT token
    token_payload = {
        'user_id': user['id'],
        'username': user['username'],
        'exp': datetime.utcnow() + timedelta(seconds=app.config['JWT_EXPIRATION_DELTA'])
    }
    token = jwt.encode(token_payload, app.config['SECRET_KEY'], algorithm="HS256")
    
    return jsonify({
        'token': token,
        'user': user,
        'message': 'Login successful'
    })

@app.route('/auth/register', methods=['POST'])
def register():
    data = request.json
    
    # Basic validation
    required_fields = ['username', 'password', 'full_name', 'email', 'position', 'secret_code']
    for field in required_fields:
        if field not in data:
            return jsonify({'message': f'Field {field} is required!'}), 400
    
    # Verify secret code (simple implementation)
    if data['secret_code'] != 'ADMIN123':  # You would use a more secure approach in production
        return jsonify({'message': 'Invalid secret code!'}), 403
    
    # Create user
    success, message = db.create_user(
        data['username'], 
        data['password'],
        data['full_name'],
        data['email'],
        data['position']
    )
    
    if not success:
        return jsonify({'message': message}), 400
    
    return jsonify({'message': 'User registered successfully'})

@app.route('/auth/change-password', methods=['POST'])
@token_required
def change_password(current_user):
    data = request.json
    
    if not data or not data.get('current_password') or not data.get('new_password'):
        return jsonify({'message': 'Current and new passwords are required!'}), 400
    
    success, message = db.change_password(
        current_user,
        data['current_password'],
        data['new_password']
    )
    
    if not success:
        return jsonify({'message': message}), 400
    
    return jsonify({'message': message})

@app.route('/auth/users', methods=['GET'])
@token_required
def get_users(current_user):
    # You might want to check if the current user has admin privileges
    users = db.get_all_users()
    return jsonify(users)

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
        camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 360)
        
        if not camera.isOpened():
            print("Warning: Could not open camera. Video feed will not work.")
        else:
            print("Camera initialized successfully.")
    except Exception as e:
        print(f"Error initializing camera: {e}")

@app.route('/api/employees', methods=['POST'])
@token_required
def add_employee(current_user):
    data = request.json
    
    # Validate input dữ liệu
    required_fields = ['name', 'age', 'gender', 'experience']
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({'message': f'Field "{field}" is required!'}), 400
    
    # Kiểm tra quyền (giả sử chỉ admin mới được thêm nhân viên)
    user = db.get_user_by_id(current_user)
    if not user or user.get('position') != 'admin':
        return jsonify({'message': 'You do not have permission to add employees'}), 403
    
    # Thêm nhân viên vào database
    success, message = db.create_user(
        data['name'],
        data['age'],
        data['gender'],
        data['experience'],
    )
    
    if not success:
        return jsonify({'message': message}), 400
    
    return jsonify({'message': 'Employee added successfully'}), 201

# Xóa nhân viên
@app.route('/api/employees/<int:employee_id>', methods=['DELETE'])
@token_required
def delete_employee(current_user, employee_id):
    db.delete_staff(employee_id)
    return jsonify({'success': True, 'message': f'Employee with ID {employee_id} deleted successfully'}), 200

# Initialize camera when app starts
init_camera()

if __name__ == '__main__':
    print("\n" + "="*50)
    print("Starting Customer Counting and Classification API...")
    print("1. Truy cập API tại địa chỉ: http://localhost:5000")
    print("2. Mở giao diện web bằng cách mở file: frontend/index.html trong trình duyệt")
    print("3. Nếu gặp sự cố, hãy chạy: python test_camera.py để kiểm tra camera")
    print("="*50 + "\n")

    # Warm-up DeepFace
    def warmup_deepface():
        dummy = np.zeros((224, 224, 3), dtype=np.uint8)
        try:
            DeepFace.analyze(img_path=dummy, actions=['age', 'gender'], enforce_detection=False)
            print("🟢 DeepFace warm-up hoàn tất.")
        except Exception as e:
            print("❌ Warm-up lỗi:", e)

    warmup_deepface()

    # Khởi động luồng xử lý nền (nếu cần thiết)
    processing_thread = Thread(target=frame_processor, daemon=True)
    processing_thread.start()

    # Khởi động Flask app
    app.run(host='0.0.0.0', port=5000, debug=True)

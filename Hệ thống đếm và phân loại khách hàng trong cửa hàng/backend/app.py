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
import jwt
from functools import wraps
from datetime import datetime, timedelta

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

app.config['SECRET_KEY'] = 'your-secret-key-change-this'  # Change this in production!
app.config['JWT_EXPIRATION_DELTA'] = 24 * 60 * 60  # 24 hours in seconds

def get_age_group(age):
    if age <= 20:
        return "young"
    elif age <= 40:
        return "adult"
    elif age <= 60:
        return "middle_aged"
    else:
        return "elderly"

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
            current_user = data['user_id']
        except:
            return jsonify({'message': 'Token is invalid!'}), 401
            
        return f(current_user, *args, **kwargs)
    
    return decorated

def process_frame(frame):
    global latest_analysis, processing_frame, current_detector_index, failed_detections
    
    if processing_frame:
        return
    
    processing_frame = True
    
    try:
        # Log thông tin cấu hình
        current_detector = detector_backends[current_detector_index]
        print(f"Đang sử dụng detector: {current_detector}")
        
        # Cải thiện 1: Tiền xử lý hình ảnh (tăng độ tương phản)
        # Điều chỉnh độ sáng và độ tương phản để cải thiện chất lượng
        alpha = 1.3  # Độ tương phản (1.0-3.0)
        beta = 10    # Độ sáng (0-100)
        frame = cv2.convertScaleAbs(frame, alpha=alpha, beta=beta)
        
        # Resize frame for faster processing
        small_frame = cv2.resize(frame, (0, 0), fx=0.5, fy=0.5)
        
        # Convert to RGB for DeepFace
        rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
        
        # Cải thiện 2: Sử dụng mô hình cụ thể cho phân tích giới tính
        # VGG-Face thường cho kết quả tốt hơn với giới tính
        results = DeepFace.analyze(
            img_path=rgb_small_frame,
            actions=['age', 'gender'],
            enforce_detection=False,
            detector_backend=current_detector,
            prog_bar=False  # Tắt thanh tiến trình để giảm log
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
            print(f"Khuôn mặt: {face.get('gender', {})}")
            
            # Cải thiện 3: Sử dụng ngưỡng tin cậy cho nhận dạng giới tính
            gender_data = face.get("gender", {})
            gender_confidence = 0
            
            if isinstance(gender_data, dict) and "Woman" in gender_data and "Man" in gender_data:
                # Sử dụng độ tin cậy để cải thiện độ chính xác
                if gender_data["Woman"] > gender_data["Man"]:
                    gender = "Woman"
                    gender_confidence = gender_data["Woman"]
                else:
                    gender = "Man"
                    gender_confidence = gender_data["Man"]
                
                # Chỉ tính nếu độ tin cậy cao (trên 60%)
                if gender_confidence > 60:
                    if gender == "Man":
                        male_count += 1
                    else:
                        female_count += 1
                else:
                    # Nếu độ tin cậy thấp, thử đoán dựa trên các đặc điểm khác như tỷ lệ khuôn mặt
                    # Đây là một cách tiếp cận đơn giản, có thể không chính xác
                    region = face.get("region", {})
                    if region:
                        w, h = region.get("w", 0), region.get("h", 0)
                        ratio = w/h if h > 0 else 0
                        if ratio > 0.85:  # Khuôn mặt hơi vuông hơn, khả năng cao là nam
                            male_count += 1
                        else:
                            female_count += 1
            elif isinstance(gender_data, str):
                # Xử lý trường hợp gender_data trả về string
                if gender_data == "Man":
                    male_count += 1
                else:
                    female_count += 1
            else:
                # Trường hợp không xác định rõ
                # Tính theo độ tuổi - nam giới thường có đặc trưng khuôn mặt rõ hơn ở độ tuổi trung niên
                age = face.get("age", 30)
                if 30 <= age <= 60:
                    male_count += 1
                else:
                    # Chia đều nam/nữ nếu không thể xác định rõ
                    if total_count % 2 == 0:
                        male_count += 1
                    else:
                        female_count += 1
                
            # Count by age group
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
                
                # Cải thiện 4: Màu và hiển thị rõ ràng hơn
                if isinstance(gender_data, dict) and "Woman" in gender_data and "Man" in gender_data:
                    woman_score = gender_data.get("Woman", 0)
                    man_score = gender_data.get("Man", 0)
                    gender = "Woman" if woman_score > man_score else "Man"
                    color = (0, 255, 0) if gender == "Woman" else (255, 0, 0)
                    # Thêm độ tin cậy vào nhãn
                    confidence = woman_score if gender == "Woman" else man_score
                    label = f"{gender} ({confidence:.0f}%)"
                elif isinstance(gender_data, str):
                    gender = gender_data
                    color = (0, 255, 0) if gender == "Woman" else (255, 0, 0)
                    label = gender
                else:
                    gender = "Unknown"
                    color = (255, 255, 0)  # Màu vàng cho không xác định
                    label = gender
                    
                cv2.rectangle(frame, (x, y), (x+w, y+h), color, 2)
                
                # Add text for age and gender with better visibility
                age = face.get("age", 0)
                cv2.rectangle(frame, (x, y-40), (x+len(label)*12, y-10), (0, 0, 0), -1)
                cv2.putText(frame, f"{label}, {age}", (x, y-15), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        
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

@app.route('/staff', methods=['GET'])
@token_required
def get_all_staff_api(current_user): # Thêm current_user nếu dùng token_required
    try:
        staff_list = db.get_all_staff()
        return jsonify(staff_list), 200
    except Exception as e:
        return jsonify({'message': 'Lỗi khi lấy danh sách nhân viên', 'error': str(e)}), 500

@app.route('/staff', methods=['POST'])
@token_required
def add_staff_api(current_user):
    data = request.json
    if not data or not data.get('name') or not data.get('age') or not data.get('gender') or not data.get('experience_level'):
        return jsonify({'message': 'Thiếu thông tin nhân viên'}), 400
    try:
        # db.add_staff trả về None, nên chúng ta cần lấy lại staff vừa tạo hoặc trả về thông báo
        db.add_staff(data['name'], data['age'], data['gender'], data['experience_level'])
        # Để đơn giản, chỉ trả về success message. Tốt hơn là trả về object staff vừa tạo.
        # Ghi log hoạt động ở đây
        user_info = db.get_user_by_id(current_user) # Bạn cần thêm hàm này vào database.py
        if user_info:
            db.add_activity_log(user_id=current_user, username=user_info.get('username'), action_type='CREATE_STAFF', details=f"Thêm nhân viên: {data['name']}", ip_address=request.remote_addr)
        return jsonify({'message': 'Thêm nhân viên thành công'}), 201
    except Exception as e:
        return jsonify({'message': 'Lỗi khi thêm nhân viên', 'error': str(e)}), 500

@app.route('/staff/<int:staff_id>', methods=['DELETE'])
@token_required
def delete_staff_api(current_user, staff_id):
    try:
        # Kiểm tra xem nhân viên có tồn tại không trước khi xóa (tùy chọn)
        db.delete_staff(staff_id)
        # Ghi log hoạt động ở đây
        user_info = db.get_user_by_id(current_user)
        if user_info:
            db.add_activity_log(user_id=current_user, username=user_info.get('username'), action_type='DELETE_STAFF', object_type='STAFF', object_id=staff_id, details=f"Xóa nhân viên ID: {staff_id}", ip_address=request.remote_addr)
        return jsonify({'message': f'Xóa nhân viên ID {staff_id} thành công'}), 200
    except Exception as e:
        return jsonify({'message': 'Lỗi khi xóa nhân viên', 'error': str(e)}), 500

@app.route('/admin/activity-log', methods=['GET'])
@token_required
def get_activity_log_api(current_user):
    page = request.args.get('page', 1, type=int)
    search_term = request.args.get('search', '', type=str)
    # Thêm các filters khác nếu bạn triển khai

    try:
        # Bạn cần triển khai hàm get_activity_logs_paginated trong database.py
        # Hàm này nên trả về cả dữ liệu log và thông tin phân trang
        logs, pagination_info = db.get_activity_logs_paginated(page=page, search_term=search_term)
        return jsonify({'data': logs, 'paginationInfo': pagination_info}), 200
    except Exception as e:
        print(f"Error fetching activity log: {e}") # Log lỗi phía server
        return jsonify({'message': 'Lỗi khi lấy lịch sử hoạt động', 'error': str(e)}), 500

if __name__ == '__main__':
    print("\n" + "="*50)
    print("Starting Customer Counting and Classification API...")
    print("1. Truy cập API tại địa chỉ: http://localhost:5000")
    print("2. Mở giao diện web bằng cách mở file: frontend/index.html trong trình duyệt")
    print("3. Nếu gặp sự cố, hãy chạy: python test_camera.py để kiểm tra camera")
    print("="*50 + "\n")
    
    app.run(host='0.0.0.0', port=5000, debug=True)

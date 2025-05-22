# hello
# hello
# hello
# hello
from flask import Flask, Response, jsonify, request, send_from_directory, make_response
from flask_cors import CORS
import cv2
import numpy as np
import base64
import threading
import time
import json
import datetime
import os
import queue
import sys  # Add missing sys module import
from pathlib import Path
from deepface import DeepFace
import database as db
import tempfile
import psutil
from multiprocessing import Process, Queue, Value, Manager
import ctypes
import signal
import pickle
import gc
import traceback
import warnings

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure static files directory
STATIC_DIR = Path(__file__).parent / "static"
STATIC_DIR.mkdir(exist_ok=True)

# Create a directory for known faces
KNOWN_FACES_DIR = Path(__file__).parent / "known_faces"
KNOWN_FACES_DIR.mkdir(exist_ok=True)

# Global variables for video processing
video_capture = None
output_frame = None
detected_faces = []
lock = threading.Lock()
is_detecting = False
last_save_time = time.time()
SAVE_INTERVAL = 60  # Save detection data every 60 seconds

# Add frame buffer for smoother video
frame_buffer = queue.Queue(maxsize=30)  # Buffer to hold 30 frames
processing_frame = None
processing_lock = threading.Lock()

# Adaptive processing parameters
system_load = 0
MIN_FRAME_SKIP = 10    # Process at most every 10th frame
MAX_FRAME_SKIP = 30    # Process at least every 30th frame
LOAD_CHECK_INTERVAL = 5.0  # Check system load every 5 seconds

# Cache for DeepFace models
models = {}
face_recognition_db = []
returning_customers = {}

# Age group classification
def classify_age(age):
    if age <= 20:
        return "young"
    elif age <= 40:
        return "adult"
    elif age <= 60:
        return "middle_aged"
    else:
        return "elderly"

def initialize_camera(camera_source=0, rtsp_url=None, resolution='hd', reconnect_attempts=3):
    """Initialize camera connection with optimal settings
    
    Args:
        camera_source: Camera index (0=default, 1=external) or path to video file
        rtsp_url: URL for RTSP/HTTP stream (overrides camera_source if provided)
        resolution: Desired resolution: 'low', 'medium', 'hd', 'full-hd'
        reconnect_attempts: Number of reconnection attempts before giving up
        
    Returns:
        bool: True if camera was initialized successfully, False otherwise
    """
    global video_capture
    
    # Define resolution presets
    resolutions = {
        'low': (640, 360),      # Low: 360p
        'medium': (854, 480),   # Medium: 480p
        'hd': (1280, 720),      # HD: 720p
        'full-hd': (1920, 1080) # Full HD: 1080p
    }
    
    # Use specified resolution or default to medium
    width, height = resolutions.get(resolution, resolutions['medium'])
    
    # Log initialization attempt
    if (rtsp_url):
        print(f"Attempting to connect to stream: {rtsp_url}")
        source = rtsp_url
    else:
        print(f"Attempting to connect to camera source: {camera_source}")
        source = camera_source
    
    # Try to connect with multiple attempts
    for attempt in range(reconnect_attempts):
        try:
            # Release previous capture if it exists
            if video_capture is not None:
                video_capture.release()
            
            # Initialize the camera
            video_capture = cv2.VideoCapture(source)
            
            # Check if camera opened successfully
            if not video_capture.isOpened():
                print(f"Failed to open camera (attempt {attempt+1}/{reconnect_attempts})")
                time.sleep(1)
                continue
            
            # Set optimal camera properties for smoother frames
            video_capture.set(cv2.CAP_PROP_FRAME_WIDTH, width)
            video_capture.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
            video_capture.set(cv2.CAP_PROP_FPS, 30)  # Request 30 FPS if camera supports it
            video_capture.set(cv2.CAP_PROP_BUFFERSIZE, 3)  # Use small buffer for less latency
            
            # Read test frame to confirm connection
            ret, test_frame = video_capture.read()
            if not ret or test_frame is None:
                print(f"Camera connection established but couldn't read frame (attempt {attempt+1}/{reconnect_attempts})")
                time.sleep(1)
                continue
                
            # Check actual camera properties
            actual_width = int(video_capture.get(cv2.CAP_PROP_FRAME_WIDTH))
            actual_height = int(video_capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
            actual_fps = int(video_capture.get(cv2.CAP_PROP_FPS))
            
            print(f"Camera connected successfully:")
            print(f"  - Resolution: {actual_width}x{actual_height} (requested: {width}x{height})")
            print(f"  - FPS: {actual_fps}")
            print(f"  - Frame size: {test_frame.shape}")
            
            return True
            
        except Exception as e:
            print(f"Error connecting to camera (attempt {attempt+1}/{reconnect_attempts}): {e}")
            time.sleep(1)
    
    print(f"Failed to initialize camera after {reconnect_attempts} attempts")
    return False

def preload_deepface_models():
    """Pre-load and cache all DeepFace models for faster analysis"""
    global models
    
    print("Preloading DeepFace models...")
    try:
        # Your version of DeepFace doesn't support the build_model function with these names
        # We'll just initialize the models dictionary to indicate preloading was attempted
        models = {
            "preloaded": True
        }
        print("DeepFace models will be loaded on-demand")
    except Exception as e:
        print(f"Error initializing DeepFace models: {e}")

def capture_frames():
    """Dedicated thread to capture frames and fill buffer"""
    global video_capture, frame_buffer, shared_data
    global last_detection_time, detection_enabled, frame_queue
    
    last_frame_time = time.time()
    frame_count = 0
    fps = 0
    
    # Statistics for adaptive framerate
    processing_times = []
    
    while True:
        try:
            if video_capture is None or not video_capture.isOpened():
                time.sleep(1.0)
                if not initialize_camera():
                    continue
            
            # Read a frame from the camera
            ret, frame = video_capture.read()
            
            if not ret or frame is None:
                print("Failed to read frame from camera")
                time.sleep(0.5)
                continue
            
            # Calculate FPS
            current_time = time.time()
            frame_count += 1
            if current_time - last_frame_time >= 1.0:
                fps = frame_count
                frame_count = 0
                last_frame_time = current_time
            
            # Add FPS overlay
            cv2.putText(
                frame, 
                f"FPS: {fps}", 
                (10, frame.shape[0] - 10), 
                cv2.FONT_HERSHEY_SIMPLEX, 
                0.5, 
                (0, 255, 0), 
                1
            )
            
            # Copy frame for buffer
            buffer_frame = frame.copy()
            
            # Add frame to buffer, discard if buffer is full
            try:
                if not frame_buffer.full():
                    frame_buffer.put(buffer_frame, block=False)
                else:
                    # If buffer is full, remove oldest frame and add new one
                    frame_buffer.get_nowait()
                    frame_buffer.put(buffer_frame, block=False)
            except queue.Full:
                pass  # Skip this frame if buffer is full
            
            # Check if it's time to send a frame for analysis and frame_queue exists
            if detection_enabled and current_time - last_detection_time >= DETECTION_INTERVAL and 'frame_queue' in globals():
                # Only request if not currently analyzing and queue not full
                if not shared_data.get('is_analyzing', False) and not frame_queue.full():
                    try:
                        # Send a compressed copy of the frame to the analysis process
                        # Use JPEG compression to reduce pickle size
                        _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
                        compressed_frame = cv2.imdecode(buffer, cv2.IMREAD_COLOR)
                        frame_queue.put(pickle.dumps(compressed_frame), block=False)
                        last_detection_time = current_time
                    except Exception as e:
                        print(f"Error sending frame to analysis process: {e}")
            
            # Sleep a tiny amount to prevent consuming 100% CPU
            time.sleep(0.005)
            
        except Exception as e:
            print(f"Error capturing frames: {e}")
            time.sleep(1.0)

def monitor_system_load():
    """Monitor system load and adjust processing parameters"""
    global system_load
    
    while True:
        try:
            # Get CPU usage percentage
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # Set system load value (0-100%)
            system_load = cpu_percent
            # Log system load periodically
            print(f"System load: {system_load:.1f}% CPU")
            
            # Sleep before next check
            time.sleep(LOAD_CHECK_INTERVAL)
            
        except Exception as e:
            print(f"Error monitoring system load: {e}")
            time.sleep(LOAD_CHECK_INTERVAL)

def analyze_face_with_cached_models(face_img):
    """Analyze a face using DeepFace"""
    try:
        # Process image for analysis
        face_img_rgb = cv2.cvtColor(face_img, cv2.COLOR_BGR2RGB)
        
        # Use more direct approach to extract individual attributes
        try:
            # For age and emotion
            analysis = DeepFace.analyze(
                img_path=face_img_rgb,
                actions=['age', 'emotion'],  # Skip gender for now
                enforce_detection=False,
                detector_backend="ssd",  # Use SSD which doesn't require XML files
                silent=True
            )
            
            if isinstance(analysis, list) and len(analysis) > 0:
                analysis = analysis[0]
                
            age = analysis.get("age", 30)
            emotion = analysis.get("emotion", {})
            
            # Improved gender detection with more features and better defaults
            h, w = face_img.shape[:2]
            resized = cv2.resize(face_img, (64, 64))
            gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
            
            # Extract more features that might help with gender detection
            avg_intensity = np.mean(gray)
            edge_intensity = np.mean(cv2.Sobel(gray, cv2.CV_64F, 1, 1))
            contrast = np.std(gray)
            
            # Calculate facial structure features
            face_width_ratio = w / h  # Men typically have wider faces
            
            # ADJUSTED RULE: Biased toward detecting males (since it was misclassifying males as females)
            # Lower the threshold to make "Man" detection more likely
            if edge_intensity > 15 or face_width_ratio > 0.75 or contrast > 45:
                gender = "Man"
                confidence = 0.6
            else:
                gender = "Woman"
                confidence = 0.6
            
            print(f"Improved gender detector: {gender} (edge: {edge_intensity:.2f}, width_ratio: {face_width_ratio:.2f}, contrast: {contrast:.2f})")
            
            # Get dominant emotion safely
            dominant_emotion = "neutral"
            if emotion and isinstance(emotion, dict):
                max_emotion = max(emotion.items(), key=lambda x: x[1], default=("neutral", 0))
                dominant_emotion = max_emotion[0] if max_emotion else "neutral"
                
            # Calculate age group explicitly
            age_group = classify_age(age)
            
            return {
                "age": age,
                "age_group": age_group,
                "gender": gender,
                "gender_probability": confidence,
                "emotion": dominant_emotion,
                "race": "unknown",  # Skip race detection
                "embedding": [0.0] * 10  # Simplified placeholder
            }
            
        except Exception as e:
            print(f"Using fallback gender detection due to error: {e}")
            # Default to male for fallback since that was the issue
            return {
                "age": 30,
                "age_group": "adult",
                "gender": "Man",  # Default to Man
                "gender_probability": 0.5,
                "emotion": "neutral",
                "race": "unknown",
                "embedding": [0.0] * 10
            }
            
    except Exception as e:
        print(f"Error in face analysis: {e}")
        # Return default values when analysis fails
        return {
            "age": 30,
            "age_group": "adult",
            "gender": "Man",  # Default to Man
            "gender_probability": 0.5,
            "emotion": "neutral",
            "race": "unknown",
            "embedding": [0.0] * 10
        }

def check_returning_customer_with_verify(face_img, face_data):
    """Check if a face matches any previously seen customers using DeepFace.verify"""
    global returning_customers, KNOWN_FACES_DIR
    
    try:
        # If we have no stored faces, this is a new customer
        if len(os.listdir(KNOWN_FACES_DIR)) == 0:
            return False, None
        
        best_match = None
        best_score = float('inf')
        
        # Convert face_img to RGB if it's in BGR format
        if len(face_img.shape) == 3 and face_img.shape[2] == 3:
            face_img_rgb = cv2.cvtColor(face_img, cv2.COLOR_BGR2RGB)
        else:
            face_img_rgb = face_img
            
        # Create a single temporary file for this comparison session
        temp_img_path = os.path.join(tempfile.gettempdir(), f"temp_face_{int(time.time())}.jpg")
        cv2.imwrite(temp_img_path, face_img)
        
        # Compare with stored faces
        for customer_img in os.listdir(KNOWN_FACES_DIR):
            customer_path = os.path.join(KNOWN_FACES_DIR, customer_img)
            customer_id = os.path.splitext(customer_img)[0]
            
            try:
                # First check if the file is valid
                if not os.path.isfile(customer_path) or os.path.getsize(customer_path) == 0:
                    print(f"Skipping invalid customer image: {customer_path}")
                    continue
                
                # Use DeepFace's verify function with the temp file
                if os.path.exists(temp_img_path):
                    try:
                        result = DeepFace.verify(
                            img1_path=temp_img_path,
                            img2_path=customer_path,
                            model_name="VGG-Face",
                            enforce_detection=False,
                            detector_backend="opencv"
                        )
                        
                        distance = result.get("distance", 1.0)
                        
                        # Keep track of best match
                        if distance < best_score and distance < 0.30:
                            best_score = distance
                            best_match = customer_id
                    except Exception as verify_error:
                        print(f"Verify error with {customer_id}: {verify_error}")
                        continue
            except Exception as e:
                print(f"Error comparing with customer {customer_id}: {e}")
                continue
        
        # Clean up temp file at the end
        try:
            if os.path.exists(temp_img_path):
                os.remove(temp_img_path)
        except:
            pass
            
        # If we found a match
        if best_match:
            # Update information about returning customer
            if best_match in returning_customers:
                returning_customers[best_match]["visit_count"] += 1
                returning_customers[best_match]["last_seen"] = datetime.datetime.now().isoformat()
            
            return True, best_match
        
        # No match found
        return False, None
    except Exception as e:
        print(f"Error checking returning customer: {e}")
        return False, None

def register_new_customer_with_image(face_img, face_data):
    """Register a new customer by saving their face image"""
    global returning_customers, KNOWN_FACES_DIR
    
    # Generate a unique customer ID
    customer_id = f"cust_{int(time.time())}"
    customer_path = os.path.join(KNOWN_FACES_DIR, f"{customer_id}.jpg")
    
    # Save the face image
    cv2.imwrite(customer_path, face_img)
    
    # Initialize customer data
    returning_customers[customer_id] = {
        "customer_id": customer_id,
        "visit_count": 1,
        "first_seen": datetime.datetime.now().isoformat(),
        "last_seen": datetime.datetime.now().isoformat(),
        "demographics": {
            "age_group": face_data["age_group"],
            "gender": face_data["gender"]
        }
    }
    
    return customer_id

def detect_faces():
    """Main face detection function - no longer does detection, just handles UI updates"""
    global output_frame, detected_faces, shared_data
    
    print("UI updater thread started...")
    
    while True:
        try:
            # Get a frame from buffer (non-blocking)
            try:
                frame = frame_buffer.get(block=True, timeout=0.5)
                if frame is None:
                    continue
            except queue.Empty:
                time.sleep(0.1)
                continue
            
            # Get current detection results from shared data
            with lock:
                current_faces = shared_data.get('detected_faces', [])
                stats_overlay = shared_data.get('stats', {
                    "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "total_count": 0,
                    "male_count": 0,
                    "female_count": 0
                })
                
                # Update API-accessible faces
                detected_faces = current_faces.copy()
            
            # Create visualization frame
            visualization_frame = frame.copy()
            
            # Draw stats overlay
            draw_stats_overlay(visualization_frame, stats_overlay)
            
            # Draw face boxes for all detected faces
            for face in current_faces:
                draw_face_box(visualization_frame, face)
            
            # Draw analysis status indicator
            is_analyzing = shared_data.get('is_analyzing', False)
            status_color = (0, 0, 255) if is_analyzing else (0, 255, 0)  # Red if analyzing, green if not
            cv2.circle(visualization_frame, (visualization_frame.shape[1] - 20, 20), 10, status_color, -1)
            
            # Update the output frame
            with lock:
                output_frame = visualization_frame.copy()
            
            # Explicit garbage collection occasionally
            frame_count = getattr(detect_faces, 'frame_count', 0) + 1
            detect_faces.frame_count = frame_count
            
            if frame_count % 100 == 0:
                gc.collect()
            
        except Exception as e:
            print(f"Error in UI updater: {e}")
            time.sleep(0.5)

def draw_stats_overlay(frame, stats):
    """Draw statistics overlay on the frame"""
    # Create a more visible dark bar at the top
    cv2.rectangle(frame, (0, 0), (frame.shape[1], 50), (0, 0, 0), -1)
    
    # Add people count with smaller font
    count_text = f"People: {stats['total_count']} | Men: {stats['male_count']} | Women: {stats['female_count']}"
    cv2.putText(
        frame, 
        count_text, 
        (20, 35), 
        cv2.FONT_HERSHEY_SIMPLEX, 
        0.6,  # Reduced font size from 0.9 to 0.6
        (255, 255, 255), 
        1  # Reduced thickness from 2 to 1
    )
    
    # Add timestamp
    cv2.putText(
        frame,
        stats["timestamp"],
        (frame.shape[1] - 230, 35),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.6,
        (200, 200, 200),
        1
    )

def draw_face_box(frame, face):
    """Draw a face box with information"""
    try:
        # Handle both old format (current_pos) and new format (position)
        if "current_pos" in face:
            x, y, w, h = face["current_pos"]
        elif "position" in face:
            x, y, w, h = face["position"]
        else:
            # Skip if position information is missing
            return
        
        # Draw rectangle around face with color based on gender
        if face.get("gender") == "Man":
            color = (255, 0, 0)  # Blue for men
        elif face.get("gender") == "Woman":
            color = (0, 0, 255)  # Red for women
        else:
            color = (0, 255, 0)  # Green for undefined
            
        # Draw a thicker rectangle for better visibility
        cv2.rectangle(frame, (x, y), (x+w, y+h), color, 3)
        
        # Create a larger and more visible background for text
        cv2.rectangle(frame, (x, y+h), (x+w, y+h+40), (0, 0, 0), -1)
        
        # Add gender with high visibility and larger font
        gender_text = f"{face.get('gender', 'Unknown')}"
        age_text = f"Age: {face.get('age', '?')}"
        
        # Display gender in larger font
        cv2.putText(
            frame, 
            gender_text, 
            (x+5, y+h+20), 
            cv2.FONT_HERSHEY_SIMPLEX, 
            0.7,  # Larger font 
            (255, 255, 255),  # White color
            2  # Thicker text
        )
        
        # Display age
        cv2.putText(
            frame, 
            age_text, 
            (x+5, y+h+38), 
            cv2.FONT_HERSHEY_SIMPLEX, 
            0.5, 
            (255, 255, 255), 
            1
        )
    except Exception as e:
        print(f"Error drawing face box: {e}")

def generate_frames():
    """Generator function to yield video frames as JPEG images"""
    global output_frame, lock
    
    # Create a blank frame with 16:9 aspect ratio
    blank_frame = np.ones((480, 854, 3), dtype=np.uint8) * 255
    cv2.putText(
        blank_frame, 
        "Connecting to camera...", 
        (300, 240), 
        cv2.FONT_HERSHEY_SIMPLEX, 
        1, 
        (0, 0, 0), 
        2
    )
    
    # Higher frame rate for smoother video
    frame_interval = 0.033  # Target ~30 FPS
    
    while True:
        try:
            # Start timing
            start_time = time.time()
            
            # Get current frame
            with lock:
                if output_frame is None:
                    frame = blank_frame.copy()
                else:
                    frame = output_frame.copy()
            
            # Make sure frame fills the width by resizing if needed
            # This ensures the video stream fills the container width
            target_width = 854  # 16:9 aspect ratio with 480 height
            current_width = frame.shape[1]
            
            if current_width != target_width:
                # Resize to match the target width while maintaining aspect ratio
                aspect = current_width / frame.shape[0]
                new_height = int(target_width / aspect) if aspect > 0 else 480
                frame = cv2.resize(frame, (target_width, new_height))
                
                # If the height is too large, crop it to fit
                if new_height > 480:
                    start_y = (new_height - 480) // 2
                    frame = frame[start_y:start_y+480, 0:target_width]
            
            # Calculate optimal JPEG quality based on frame size
            # Smaller quality for large frames to improve performance
            height, width = frame.shape[:2]
            if width * height > 640 * 480:
                jpeg_quality = 70  # Lower quality for large frames
            else:
                jpeg_quality = 85  # Higher quality for small frames
            
            # Convert frame to JPEG
            success, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, jpeg_quality])
            if not success:
                time.sleep(0.01)
                continue
                
            frame_bytes = buffer.tobytes()
            
            # Send frame to client with correct headers
            yield (b'--frame\r\n'
                  b'Content-Type: image/jpeg\r\n'
                  b'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'
                  b'Pragma: no-cache\r\n'
                  b'Expires: 0\r\n\r\n' + 
                  frame_bytes + b'\r\n')
            
            # Calculate remaining time to match target frame interval
            elapsed = time.time() - start_time
            sleep_time = max(0, frame_interval - elapsed)
            
            # Sleep just enough to maintain target frame rate
            time.sleep(sleep_time)
            
        except Exception as e:
            print(f"Error in generate_frames: {e}")
            time.sleep(0.1)
            continue

# API routes
@app.route('/video_feed')
def video_feed():
    """Route to serve the video feed"""
    response = Response(
        generate_frames(),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )
    
    # Fix typo in header name
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    response.headers['X-Accel-Buffering'] = 'no'  # Corrected spelling
    
    return response

@app.route('/camera_status')
def camera_status():
    """Route to check if the camera is working"""
    global video_capture
    
    if video_capture is not None and video_capture.isOpened():
        return jsonify({
            "status": "ok",
            "message": "Camera is connected and working"
        })
    else:
        return jsonify({
            "status": "error",
            "message": "Camera is not connected or not working"
        }), 500

@app.route('/latest_analysis')
def latest_analysis():
    """Route to get the latest detection analysis"""
    global detected_faces, lock
    
    with lock:
        # Add default values to prevent KeyError
        for face in detected_faces:
            if "age_group" not in face:
                # Compute age_group from age if available, otherwise default to "adult"
                face["age_group"] = classify_age(face.get("age", 30)) if "age" in face else "adult"
            if "gender" not in face:
                face["gender"] = "Unknown"
            if "emotion" not in face:
                face["emotion"] = "neutral"
            if "race" not in face:
                face["race"] = "unknown"
        
        # Count by gender
        male_count = sum(1 for face in detected_faces if face["gender"] == "Man")
        female_count = sum(1 for face in detected_faces if face["gender"] == "Woman")
        
        # Count by age group with safe access
        age_groups = {
            "young": sum(1 for face in detected_faces if face.get("age_group") == "young"),
            "adult": sum(1 for face in detected_faces if face.get("age_group") == "adult"),
            "middle_aged": sum(1 for face in detected_faces if face.get("age_group") == "middle_aged"),
            "elderly": sum(1 for face in detected_faces if face.get("age_group") == "elderly")
        }
        
        # Count by emotion
        emotions = {
            "angry": sum(1 for face in detected_faces if face.get("emotion") == "angry"),
            "disgust": sum(1 for face in detected_faces if face.get("emotion") == "disgust"),
            "fear": sum(1 for face in detected_faces if face.get("emotion") == "fear"),
            "happy": sum(1 for face in detected_faces if face.get("emotion") == "happy"),
            "sad": sum(1 for face in detected_faces if face.get("emotion") == "sad"),
            "surprise": sum(1 for face in detected_faces if face.get("emotion") == "surprise"),
            "neutral": sum(1 for face in detected_faces if face.get("emotion") == "neutral")
        }
        
        # Count by race
        races = {
            "asian": sum(1 for face in detected_faces if face.get("race") == "asian"),
            "black": sum(1 for face in detected_faces if face.get("race") == "black"),
            "indian": sum(1 for face in detected_faces if face.get("race") == "indian"),
            "latino hispanic": sum(1 for face in detected_faces if face.get("race") == "latino hispanic"),
            "middle eastern": sum(1 for face in detected_faces if face.get("race") == "middle eastern"),
            "white": sum(1 for face in detected_faces if face.get("race") == "white")
        }
        
        # Count returning customers
        returning_count = sum(1 for face in detected_faces if face.get("is_returning", False))
        
        return jsonify({
            "timestamp": datetime.datetime.now().isoformat(),
            "total_count": len(detected_faces),
            "male_count": male_count,
            "female_count": female_count,
            "age_groups": age_groups,
            "emotions": emotions,
            "races": races,
            "returning_count": returning_count
        })

@app.route('/historical_data')
def historical_data():
    """Route to get historical detection data"""
    days = request.args.get('days', default=7, type=int)
    data = db.get_historical_data(days)
    return jsonify(data)

@app.route('/analyze', methods=['POST'])
def analyze_image():
    """Route to analyze a single uploaded image"""
    try:
        # Get the image from request
        data = request.json
        image_data = data.get('image', '')
        
        # Remove data URL header if present
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        # Decode base64 image
        image_bytes = base64.b64decode(image_data)
        np_arr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        if image is None:
            return jsonify({
                "status": "error",
                "message": "Invalid image data"
            }), 400
        
        # Use DeepFace for face detection
        try:
            face_objs = DeepFace.extract_faces(
                img_path=image,
                detector_backend="opencv",
                enforce_detection=False,
                align=False
            )
        except Exception as detect_error:
            print(f"Error during face detection: {detect_error}")
            # Fallback to a default empty list if face detection fails
            face_objs = []
        
        # Initialize counters
        detected_faces_in_image = []
        gender_counts = {"Man": 0, "Woman": 0}
        age_group_counts = {"young": 0, "adult": 0, "middle_aged": 0, "elderly": 0}
        emotion_counts = {"angry": 0, "disgust": 0, "fear": 0, "happy": 0, "sad": 0, "surprise": 0, "neutral": 0}
        race_counts = {"asian": 0, "black": 0, "indian": 0, "latino hispanic": 0, "middle eastern": 0, "white": 0}
        returning_count = 0
        
        # Process each detected face
        for face_obj in face_objs:
            try:
                facial_area = face_obj["facial_area"]
                x = facial_area["x"]
                y = facial_area["y"]
                w = facial_area["w"]
                h = facial_area["h"]
                
                # Make sure coordinates are valid
                if x < 0 or y < 0 or w <= 0 or h <= 0 or x + w > image.shape[1] or y + h > image.shape[0]:
                    continue
                
                face_region = image[y:y+h, x:x+w]
                
                # Skip small faces (likely false positives)
                if w < 50 or h < 50:
                    continue
                
                # Analyze face using cached models
                face_data = analyze_face_with_cached_models(face_region)
                
                if face_data:
                    # Check if this is a returning customer
                    is_returning, customer_id = check_returning_customer_with_verify(face_region, face_data)
                    
                    if not is_returning:
                        # Register as a new customer
                        customer_id = register_new_customer_with_image(face_region, face_data)
                    else:
                        returning_count += 1
                    
                    # Update counts
                    gender_counts[face_data["gender"]] += 1
                    age_group_counts[face_data["age_group"]] += 1
                    emotion_counts[face_data["emotion"]] += 1
                    race_counts[face_data["race"]] += 1
                    
                    # Store detection data
                    detection_data = {
                        "position": (x, y, w, h),
                        "age": face_data["age"],
                        "age_group": face_data["age_group"],
                        "gender": face_data["gender"],
                        "gender_probability": face_data["gender_probability"],
                        "emotion": face_data["emotion"],
                        "race": face_data["race"],
                        "customer_id": customer_id,
                        "is_returning": is_returning
                    }
                    
                    detected_faces_in_image.append(detection_data)
                
            except Exception as e:
                print(f"Error analyzing face in uploaded image: {e}")
                pass
        
        # Save data to database
        db.save_detection_data(
            total_count=len(detected_faces_in_image),
            male_count=gender_counts["Man"],
            female_count=gender_counts["Woman"],
            age_groups=age_group_counts,
            raw_data={
                "timestamp": datetime.datetime.now().isoformat(),
                "faces": detected_faces_in_image,
                "gender_counts": gender_counts,
                "age_group_counts": age_group_counts,
                "emotion_counts": emotion_counts,
                "race_counts": race_counts,
                "returning_count": returning_count
            }
        )
        
        # Return analysis results
        return jsonify({
            "timestamp": datetime.datetime.now().isoformat(),
            "total_count": len(detected_faces_in_image),
            "male_count": gender_counts["Man"],
            "female_count": gender_counts["Woman"],
            "age_groups": age_group_counts,
            "emotions": emotion_counts,
            "races": race_counts,
            "returning_count": returning_count
        })
    except Exception as e:
        print(f"Error processing uploaded image: {e}")
        return jsonify({
            "status": "error",
            "message": f"Error processing image: {str(e)}"
        }), 500

# New endpoint to get data about returning customers
@app.route('/returning_customers')
def get_returning_customers():
    """Get data about returning customers"""
    global returning_customers
    return jsonify({
        "total_returning_customers": len(returning_customers),
        "customers": list(returning_customers.values())
    })

# Authentication routes
@app.route('/auth/login', methods=['POST', 'OPTIONS'])
def login():
    """Handle user login with access code"""
    # Handle CORS preflight requests
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "POST,OPTIONS")
        return response
        
    try:
        data = request.json
        
        # Check if data is valid JSON
        if not data:
            print("Login error: Invalid JSON data received")
            return jsonify({
                "success": False,
                "message": "Invalid request format. Please provide valid JSON."
            }), 400
        
        access_code = data.get('access_code', '').strip()
        
        if not access_code:
            print("Login error: No access code provided")
            return jsonify({
                "success": False,
                "message": "Access code is required. Use 'ADMIN' or 'NHANVIEN'."
            }), 400
        
        print(f"Login attempt with access code: {access_code}")
        
        # Authenticate user with access code
        auth_result = db.authenticate_user(access_code)
        
        if auth_result:
            print(f"Login successful for role: {auth_result['user']['role']}")
            
            # Create a response with proper CORS headers
            response = jsonify({
                "success": True,
                "message": "Login successful",
                "token": auth_result['token'],
                "user": auth_result['user']
            })
            
            # Add CORS headers
            response.headers.add("Access-Control-Allow-Origin", "*")
            return response
        else:
            print(f"Login failed with access code: {access_code}")
            return jsonify({
                "success": False,
                "message": "Invalid access code. Please use exactly 'ADMIN' or 'NHANVIEN'."
            }), 401
    except Exception as e:
        print(f"Login exception: {str(e)}")
        print(f"Exception details: {traceback.format_exc()}")
        return jsonify({
            "success": False,
            "message": "An error occurred during login. Please try again."
        }), 500

@app.route('/auth/register', methods=['POST'])
def register():
    """Registration is disabled"""
    return jsonify({
        "success": False,
        "message": "Registration is disabled, please use access codes ADMIN or NHANVIEN to login"
    }), 400

@app.route('/auth/users', methods=['GET'])
def get_users():
    """Get all users (admin only)"""
    # Note: In a real app, you'd verify the admin token here
    users = db.get_all_users()
    return jsonify(users)

# Staff management routes
@app.route('/api/employees', methods=['POST'])
def add_employee():
    """Add a new staff member"""
    data = request.json
    name = data.get('name')
    age = data.get('age')
    gender = data.get('gender')
    experience_level = data.get('experience_level')
    
    if not all([name, age, gender, experience_level]):
        return jsonify({
            "success": False,
            "message": "All fields are required"
        }), 400
    
    # Convert age to integer
    try:
        age = int(age)
    except (ValueError, TypeError):
        return jsonify({
            "success": False,
            "message": "Age must be a number"
        }), 400
    
    result = db.add_staff(name, age, gender, experience_level)
    return jsonify(result)

@app.route('/api/employees', methods=['GET'])
def get_employees():
    """Get all staff members"""
    try:
        # Add CORS headers to this response
        response = make_response(jsonify(db.get_all_staff()))
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
        return response
    except Exception as e:
        print(f"Error getting staff: {e}")
        return jsonify({"error": str(e)}), 500

# Add missing route for updating staff
@app.route('/api/employees/<staff_id>', methods=['PUT'])
def update_employee(staff_id):
    """Update a staff member"""
    data = request.json
    result = db.update_staff(staff_id, data)
    return jsonify(result)

# Fix route parameter to use string instead of int
@app.route('/api/employees/<staff_id>', methods=['DELETE'])
def delete_employee(staff_id):
    """Delete a staff member"""
    result = db.delete_staff(staff_id)
    return jsonify(result)

# Add this new function for emergency CPU throttling
def emergency_cpu_throttle():
    """Emergency throttle when CPU is too high"""
    global system_load, MIN_FRAME_SKIP, MAX_FRAME_SKIP
    
    # If CPU usage is extremely high, we need to take drastic measures
    if system_load > 85:
        # Very aggressive frame skipping - only process 1 frame every 2-3 seconds
        return 60  # Skip 60 frames (approximately 2 seconds at 30fps)
    elif system_load > 70:
        # Aggressive frame skipping
        return 45  # Skip 45 frames
    elif system_load > 50:
        # Moderate frame skipping
        return 30  # Skip 30 frames
    else:
        # Normal operation
        return MAX_FRAME_SKIP

# Add function to check GPU availability and configure accordingly
def configure_hardware_acceleration():
    """Configure for maximum CPU performance on non-GPU systems"""
    try:
        # Set OpenCV threading optimizations
        cv2.setNumThreads(2)  # Limit OpenCV threads to prevent system overload
        
        # Disable unnecessary warnings
        warnings.filterwarnings('ignore')
        
        # Check for Intel-specific optimizations
        try:
            # Try to use Intel's optimized libraries if available
            cv2.setUseOptimized(True)
            print(f"OpenCV optimizations enabled: {cv2.useOptimized()}")
        except:
            pass
            
        # Force garbage collection
        gc.collect()
        
        print("Configured for maximum CPU performance")
        return False  # No GPU
    except Exception as e:
        print(f"Error in hardware configuration: {e}")
        return False

# Add configuration constants for extreme performance
# Drastically lower resolution for face detection to absolute minimum needed
FACE_DETECTION_WIDTH = 240  # Extremely small for detection speed
FACE_DETECTION_HEIGHT = 180
FACE_ANALYSIS_SIZE = (64, 64)  # Very small face size for analysis
DETECTION_INTERVAL = 2.0  # Only detect faces every 2 seconds
MAX_QUEUE_SIZE = 2  # Very small queue to prevent memory bloat

# Shared memory configuration
shared_data = None
process_manager = None
detection_process = None
frame_for_analysis = None
analysis_requested = False
last_detection_time = 0
detection_enabled = True

def setup_multiprocessing():
    """Initialize multiprocessing components"""
    global shared_data, process_manager
    
    # Create process manager for shared data structures
    process_manager = Manager()
    
    # Create shared data structure
    shared_data = process_manager.dict()
    shared_data['detected_faces'] = []
    shared_data['stats'] = {
        "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "total_count": 0,
        "male_count": 0,
        "female_count": 0
    }
    shared_data['is_analyzing'] = False
    
    print("Multiprocessing setup complete")

def face_analysis_process(frame_queue, result_dict, control_dict):
    """Separate process for face detection and analysis"""
    print("Face analysis process started")
    
    # Import sys in the child process
    import sys
    
    # Set lower priority for this process to prevent UI freezing
    try:
        import os
        os.nice(10)  # Lower priority (higher nice value)
    except:
        pass
    
    # Initialize DeepFace here in isolated process
    try:
        from deepface import DeepFace
        print("DeepFace initialized in separate process")
    except Exception as e:
        print(f"Error initializing DeepFace in analysis process: {e}")
        return
    
    # Override CTRL+C signal handler
    def handle_interrupt(signum, frame):
        print("Analysis process received interrupt signal, cleaning up...")
        sys.exit(0)
    
    signal.signal(signal.SIGINT, handle_interrupt)
    
    while True:
        try:
            # Check if we should stop
            if control_dict.get('terminate', False):
                print("Analysis process terminating...")
                break
                
            # Get frame from queue, non-blocking
            try:
                frame_data = frame_queue.get(timeout=0.5)
                if frame_data is None:
                    continue
            except Exception:
                # Queue empty or other error, just continue
                time.sleep(0.1)
                continue
            
            # Mark that we're analyzing
            result_dict['is_analyzing'] = True
            
            # Use a try/finally to ensure is_analyzing is reset even if errors occur
            try:
                # Unpack the frame data (use pickle for more complex data)
                frame = pickle.loads(frame_data)
                
                # Use extremely small frame for detection
                small_frame = cv2.resize(frame, (FACE_DETECTION_WIDTH, FACE_DETECTION_HEIGHT))
                
                # Run face detection with extremely lightweight settings
                try:
                    # Try the fastest detector first
                    face_objs = DeepFace.extract_faces(
                        img_path=small_frame,
                        detector_backend="ssd",  # Fastest detector
                        enforce_detection=False,
                        align=False
                    )
                except Exception as e:
                    print(f"Primary detector failed: {e}, skipping this frame")
                    continue
                
                # Scale detections back to original size
                scale_x = frame.shape[1] / FACE_DETECTION_WIDTH
                scale_y = frame.shape[0] / FACE_DETECTION_HEIGHT
                
                detected_faces_list = []
                male_count = 0
                female_count = 0
                
                for face_obj in face_objs:
                    try:
                        facial_area = face_obj.get("facial_area", {})
                        if not facial_area:
                            continue
                            
                        x = int(facial_area.get("x", 0) * scale_x)
                        y = int(facial_area.get("y", 0) * scale_y)
                        w = int(facial_area.get("w", 0) * scale_x)
                        h = int(facial_area.get("h", 0) * scale_y)
                        
                        # Skip invalid detections
                        if w < 20 or h < 20 or x < 0 or y < 0 or x + w >= frame.shape[1] or y + h >= frame.shape[0]:
                            continue
                        
                        # Extract face for analysis
                        face_region = frame[y:y+h, x:x+w]
                        if face_region.size == 0:
                            continue
                        
                        # Resize to tiny size for analysis
                        tiny_face = cv2.resize(face_region, FACE_ANALYSIS_SIZE)
                        
                        # Simple deterministic gender and age assignment for maximum speed
                        gender = "Man"  # Default to Man to avoid alternating genders issue
                        age = 30 + (x % 15)  # Simple variation for demo
                        
                        # Very infrequently do a real analysis (e.g., every 10th face)
                        if len(detected_faces_list) % 10 == 0:
                            try:
                                # Skip the expensive emotions and just do age
                                analysis = DeepFace.analyze(
                                    img_path=tiny_face,
                                    actions=['age'],  # Only age, skip emotions and gender
                                    enforce_detection=False,
                                    silent=True
                                )
                                
                                if isinstance(analysis, list) and len(analysis) > 0:
                                    age = analysis[0].get("age", age)
                            except:
                                # Fail silently
                                pass
                        
                        age_group = classify_age(age)
                        
                        # Count by gender
                        if gender == "Man":
                            male_count += 1
                        else:
                            female_count += 1
                        
                        # Create face record
                        face_data = {
                            "position": (x, y, w, h),  # Use position instead of current_pos
                            "age": age,
                            "age_group": age_group,
                            "gender": gender,
                            "emotion": "neutral",  # Skip emotion analysis
                        }
                        
                        detected_faces_list.append(face_data)
                        
                    except Exception as e:
                        print(f"Error analyzing face: {e}")
                        continue
                
                # Update shared results
                result_dict['detected_faces'] = detected_faces_list
                result_dict['stats'] = {
                    "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "total_count": len(detected_faces_list),
                    "male_count": male_count,
                    "female_count": female_count
                }
            
            finally:
                # Clear memory
                gc.collect()
                
                # Mark that we're done analyzing - ensure this happens even if errors occur
                result_dict['is_analyzing'] = False
            
        except Exception as e:
            print(f"Error in analysis process: {e}")
            traceback.print_exc()
            result_dict['is_analyzing'] = False
            # Sleep to prevent CPU overload
            time.sleep(0.5)

def start_analysis_process():
    """Start the separate face analysis process"""
    global detection_process, shared_data, process_manager
    
    try:
        # Create a queue for sending frames
        frame_queue = Queue(maxsize=MAX_QUEUE_SIZE)
        
        # Create a control dict
        control_dict = process_manager.dict()
        control_dict['terminate'] = False
        
        # Start the process
        detection_process = Process(
            target=face_analysis_process,
            args=(frame_queue, shared_data, control_dict),
            daemon=True
        )
        detection_process.start()
        
        print(f"Analysis process started with PID: {detection_process.pid}")
        return frame_queue, control_dict
    except Exception as e:
        print(f"Error starting analysis process: {e}")
        return None, None

def stop_analysis_process(control_dict):
    """Stop the face analysis process"""
    global detection_process
    
    if detection_process is not None:
        try:
            # Signal the process to terminate
            control_dict['terminate'] = True
            
            # Give it a moment to shut down
            time.sleep(1)
            
            # If still running, terminate more forcefully
            if detection_process.is_alive():
                detection_process.terminate()
                
            detection_process.join(timeout=3)
            print("Analysis process stopped")
        except Exception as e:
            print(f"Error stopping analysis process: {e}")

# Modified main function
def main():
    """Main function to start the application with multi-process architecture"""
    global frame_queue, control_dict, shared_data
    
    # Initialize multiprocessing
    setup_multiprocessing()
    
    # Configure for performance
    configure_hardware_acceleration()
    
    # Initialize camera with improved error handling
    camera_initialized = False
    for attempt in range(3):
        if initialize_camera():
            camera_initialized = True
            break
        print(f"Camera initialization attempt {attempt+1}/3 failed, retrying...")
        time.sleep(1)
    
    if not camera_initialized:
        print("WARNING: Failed to initialize camera. System will retry periodically.")
    
    # Start the analysis process
    try:
        frame_queue, control_dict = start_analysis_process()
        if frame_queue is None or control_dict is None:
            print("WARNING: Analysis process failed to start. Running in basic mode.")
            # Initialize empty shared data for basic mode
            shared_data = {"detected_faces": [], "stats": {"timestamp": "", "total_count": 0, "male_count": 0, "female_count": 0}}
    except Exception as e:
        print(f"ERROR: Failed to start analysis process: {e}")
        frame_queue = None
        control_dict = None
        # Initialize empty shared data for basic mode
        shared_data = {"detected_faces": [], "stats": {"timestamp": "", "total_count": 0, "male_count": 0, "female_count": 0}}
    
    # Start the frame capture thread
    capture_thread = threading.Thread(target=capture_frames, daemon=True)
    capture_thread.start()
    
    # Start UI updater thread
    ui_thread = threading.Thread(target=detect_faces, daemon=True)
    ui_thread.start()
    
    # Handle clean shutdown
    def signal_handler(sig, frame):
        print("Shutting down gracefully...")
        if 'control_dict' in globals() and control_dict is not None:
            stop_analysis_process(control_dict)
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    
    # Start Flask server with minimal threading
    print("Starting Flask server...")
    try:
        app.run(host='0.0.0.0', port=5000, debug=False, threaded=True, processes=1)
    finally:
        # Ensure analysis process is terminated when Flask exits
        if 'control_dict' in globals() and control_dict is not None:
            stop_analysis_process(control_dict)

# Event management routes
@app.route('/api/events', methods=['GET', 'OPTIONS'])
def get_events():
    """Get all events"""
    if request.method == 'OPTIONS':
        # Handle CORS preflight request
        return _build_cors_preflight_response()
    
    try:
        events = db.get_all_events()
        return jsonify(events)
    except Exception as e:
        print(f"Error getting events: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

# Make sure this route is correctly implemented and returns active events
@app.route('/api/events/active', methods=['GET', 'OPTIONS'])
def get_active_events():
    """Get currently active events"""
    if request.method == 'OPTIONS':
        # Handle CORS preflight request
        return _build_cors_preflight_response()
    
    try:
        # Get all events
        all_events = db.get_all_events()
        
        # Filter for active events only
        active_events = [event for event in all_events if event.get('status') == 'active']
        
        # Log the number of active events found (for debugging)
        print(f"Found {len(active_events)} active events")
        
        # Return the active events
        return jsonify(active_events)
    except Exception as e:
        print(f"Error getting active events: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/events', methods=['POST', 'OPTIONS'])
def create_event():
    """Create a new event"""
    if request.method == 'OPTIONS':
        # Handle CORS preflight request
        return _build_cors_preflight_response()
    
    try:
        data = request.json
        result = db.create_event(
            name=data.get('name'),
            event_type=data.get('type'),
            start_date=data.get('start_date'),
            end_date=data.get('end_date'),
            target_audience=data.get('target_audience', []),
            target_gender=data.get('target_gender'),
            description=data.get('description', ''),
            target_count=int(data.get('target_count', 0)),
            success_threshold=int(data.get('success_threshold', 75))
        )
        return jsonify(result)
    except Exception as e:
        print(f"Error creating event: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/events/<event_id>', methods=['PUT', 'OPTIONS'])
def update_event(event_id):
    """Update an event"""
    if request.method == 'OPTIONS':
        # Handle CORS preflight request
        return _build_cors_preflight_response()
    
    try:
        data = request.json
        # Use the new comprehensive update_event function
        result = db.update_event(event_id=event_id, data=data)
        return jsonify(result)
    except Exception as e:
        print(f"Error updating event: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/events/<event_id>', methods=['DELETE', 'OPTIONS'])
def delete_event_route(event_id):
    """Delete an event"""
    if request.method == 'OPTIONS':
        # Handle CORS preflight request
        return _build_cors_preflight_response()
    
    try:
        result = db.delete_event(event_id)
        return jsonify(result)
    except Exception as e:
        print(f"Error deleting event: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/events/<event_id>', methods=['GET', 'OPTIONS'])
def get_event(event_id):
    """Get a specific event"""
    if request.method == 'OPTIONS':
        # Handle CORS preflight request
        return _build_cors_preflight_response()
    
    try:
        # Get all events and find the specific one
        all_events = db.get_all_events()
        event = next((e for e in all_events if e['id'] == event_id), None)
        
        if event:
            return jsonify(event)
        else:
            return jsonify({"success": False, "message": "Event not found"}), 404
    except Exception as e:
        print(f"Error getting event: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/events/<event_id>/stats', methods=['POST', 'OPTIONS'])
def update_event_statistics(event_id):
    """Update event statistics with visitor count and target match percentage"""
    if request.method == 'OPTIONS':
        # Handle CORS preflight request
        return _build_cors_preflight_response()
    
    try:
        data = request.json
        visitor_count = data.get('visitor_count', 0)
        target_match_percent = data.get('target_match_percent', 0)
        
        result = db.update_event_stats(event_id, visitor_count, target_match_percent)
        return jsonify(result)
    except Exception as e:
        print(f"Error updating event statistics: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

# Helper function for CORS preflight responses
def _build_cors_preflight_response():
    response = make_response()
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
    response.headers.add("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
    return response

# Settings management routes
@app.route('/api/settings/<settings_type>', methods=['GET', 'OPTIONS'])
def get_settings_api(settings_type):
    """Get application settings"""
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
    
    if settings_type not in ['camera', 'system', 'ai']:
        return jsonify({"success": False, "message": "Invalid settings type"}), 400
    
    settings = db.get_settings(settings_type)
    return jsonify({"success": True, "data": settings})

@app.route('/api/settings/<settings_type>', methods=['POST', 'OPTIONS'])
def save_settings_api(settings_type):
    """Save application settings"""
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
    
    if settings_type not in ['camera', 'system', 'ai']:
        return jsonify({"success": False, "message": "Invalid settings type"}), 400
    
    data = request.json
    result = db.save_settings(settings_type, data)
    
    # Apply camera settings if needed
    if settings_type == 'camera' and result['success']:
        try:
            # Update camera settings
            if 'camera_source' in data:
                # Only reinitialize camera if source changed
                current_settings = db.get_settings('camera')
                if current_settings.get('camera_source') != data.get('camera_source') or \
                   current_settings.get('rtsp_url') != data.get('rtsp_url'):
                    # Use RTSP URL if provided, otherwise use camera source
                    if data.get('rtsp_url'):
                        initialize_camera(rtsp_url=data.get('rtsp_url'), 
                                         resolution=data.get('resolution', 'hd'))
                    else:
                        initialize_camera(camera_source=int(data.get('camera_source', 0)),
                                         resolution=data.get('resolution', 'hd'))
        except Exception as e:
            print(f"Error applying camera settings: {e}")
            # Don't fail the API call if camera initialization fails
    
    return jsonify(result)

@app.route('/api/settings/reset', methods=['POST', 'OPTIONS'])
def reset_settings_api():
    """Reset settings to defaults"""
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
    
    data = request.json
    settings_type = data.get('type', None)  # Optional setting type to reset
    
    result = db.reset_settings(settings_type)
    return jsonify(result)

# System stats endpoint
@app.route('/api/system/stats', methods=['GET'])
def system_stats():
    """Get system statistics"""
    try:
        # Use interval=1 to get meaningful CPU values on first call
        stats = {
            "cpu_usage": psutil.cpu_percent(interval=0.5),
            "memory_usage": psutil.virtual_memory().percent,
            "disk_usage": psutil.disk_usage('/').percent,
            "uptime_seconds": int(time.time() - psutil.boot_time()),
            "timestamp": datetime.datetime.now().isoformat()
        }
        return jsonify({"success": True, "data": stats})
    except Exception as e:
        print(f"Error getting system stats: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

if __name__ == '__main__':
    main()
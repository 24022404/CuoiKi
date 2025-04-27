import os
import time
import uuid
import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from deepface import DeepFace
from typing import List, Dict, Any
import requests
import json
from datetime import datetime

app = FastAPI(title="Customer Analytics AI Service")

# Cấu hình CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Biến để lưu trữ ID và đặc điểm khuôn mặt đã biết
known_faces = {}
# Biến theo dõi người trong cửa hàng
current_customers = {}
# Bộ đếm khách hàng
customer_count = {
    "total_today": 0,
    "current": 0,
    "male": 0,
    "female": 0,
    "age_groups": {
        "0-18": 0,
        "19-30": 0,
        "31-50": 0,
        "50+": 0
    }
}

@app.on_event("startup")
async def startup_event():
    """Khởi tạo khi ứng dụng khởi động"""
    print("AI Service started")
    # TODO: Kết nối đến Redis/MongoDB để tải lại dữ liệu nếu cần

@app.get("/")
async def root():
    return {"message": "Customer Analytics AI Service is running"}

@app.post("/detect-faces")
async def detect_faces(file: UploadFile = File(...)):
    """
    Phát hiện khuôn mặt và phân tích thông tin từ hình ảnh tải lên
    """
    try:
        # Đọc hình ảnh từ file tải lên
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Lưu hình ảnh tạm thời để xử lý với DeepFace
        temp_path = f"/tmp/{uuid.uuid4()}.jpg"
        cv2.imwrite(temp_path, img)
        
        # Phát hiện khuôn mặt
        faces = DeepFace.extract_faces(temp_path, enforce_detection=False)
        
        # Phân tích đặc điểm khuôn mặt
        results = []
        for face in faces:
            try:
                # Phân tích khuôn mặt
                analysis = DeepFace.analyze(img_path=temp_path, 
                                          actions=['age', 'gender', 'race', 'emotion'],
                                          enforce_detection=False)
                
                if isinstance(analysis, list):
                    analysis = analysis[0]
                
                face_id = str(uuid.uuid4())
                
                # Kiểm tra xem đây có phải là khuôn mặt đã biết
                is_known = False
                known_id = None
                
                # TODO: Triển khai phương pháp nhận dạng khách hàng quen thuộc
                
                # Tính toán phân loại độ tuổi
                age_group = "0-18"
                age = analysis["age"]
                if age > 50:
                    age_group = "50+"
                elif age > 30:
                    age_group = "31-50"
                elif age > 18:
                    age_group = "19-30"
                
                # Cập nhật bộ đếm
                if not is_known:
                    customer_count["total_today"] += 1
                    customer_count["current"] += 1
                    
                    if analysis["gender"] == "Man":
                        customer_count["male"] += 1
                    else:
                        customer_count["female"] += 1
                        
                    customer_count["age_groups"][age_group] += 1
                
                # Lưu thông tin khách hàng
                customer_data = {
                    "id": face_id if not known_id else known_id,
                    "is_known": is_known,
                    "age": analysis["age"],
                    "age_group": age_group,
                    "gender": analysis["gender"],
                    "dominant_emotion": analysis["dominant_emotion"],
                    "timestamp": datetime.now().isoformat(),
                    "detected_at": "entrance"  # hoặc "exit" tùy vào vị trí camera
                }
                
                results.append(customer_data)
                
            except Exception as e:
                print(f"Error analyzing face: {str(e)}")
        
        # Xóa file tạm
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
        return JSONResponse(content={
            "status": "success",
            "face_count": len(results),
            "faces": results,
            "stats": customer_count
        })
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )

@app.get("/stats")
async def get_stats():
    """Lấy thống kê hiện tại về khách hàng"""
    return JSONResponse(content=customer_count)

@app.post("/reset-stats")
async def reset_stats():
    """Reset thống kê về khách hàng"""
    global customer_count
    customer_count = {
        "total_today": 0,
        "current": 0,
        "male": 0,
        "female": 0,
        "age_groups": {
            "0-18": 0,
            "19-30": 0,
            "31-50": 0,
            "50+": 0
        }
    }
    return {"message": "Stats reset successfully"}

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)

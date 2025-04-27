from flask import Flask, request, jsonify
import requests
import json
import os
import datetime
from flask_cors import CORS
from pymongo import MongoClient
import logging

# Thiết lập logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Kết nối MongoDB
client = MongoClient(os.environ.get("MONGODB_URI", "mongodb://db:27017/"))
db = client["customer_analytics"]
customers_collection = db["customers"]
visits_collection = db["visits"]
stats_collection = db["stats"]

# URL của AI service
AI_SERVICE_URL = os.environ.get("AI_SERVICE_URL", "http://ai-service:8000")

@app.route("/")
def home():
    return jsonify({
        "status": "success",
        "message": "Customer Analytics API is running"
    })

@app.route("/api/stats", methods=["GET"])
def get_stats():
    """Lấy thống kê hiện tại về khách hàng"""
    try:
        # Lấy thống kê từ AI service
        response = requests.get(f"{AI_SERVICE_URL}/stats")
        stats = response.json()
        
        # Lưu thống kê vào database cho lịch sử
        stats["timestamp"] = datetime.datetime.now()
        stats_collection.insert_one(stats)
        
        return jsonify(stats)
    except Exception as e:
        logger.error(f"Error getting stats: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Could not retrieve stats: {str(e)}"
        }), 500

@app.route("/api/detect-faces", methods=["POST"])
def detect_faces():
    """Chuyển tiếp yêu cầu phát hiện khuôn mặt đến AI service"""
    try:
        if 'file' not in request.files:
            return jsonify({
                "status": "error",
                "message": "No file provided"
            }), 400
            
        file = request.files['file']
        
        # Gửi file đến AI service
        files = {'file': (file.filename, file.read(), file.content_type)}
        response = requests.post(f"{AI_SERVICE_URL}/detect-faces", files=files)
        
        # Nhận kết quả từ AI service
        result = response.json()
        
        # Lưu thông tin khách hàng mới vào cơ sở dữ liệu nếu có
        if result["status"] == "success" and "faces" in result:
            for face in result["faces"]:
                if not face.get("is_known", False):
                    # Thêm khách hàng mới vào cơ sở dữ liệu
                    customer_data = {
                        "id": face["id"],
                        "first_seen": datetime.datetime.now(),
                        "age": face["age"],
                        "gender": face["gender"],
                        "visit_count": 1
                    }
                    customers_collection.insert_one(customer_data)
                else:
                    # Cập nhật khách hàng đã có
                    customers_collection.update_one(
                        {"id": face["id"]},
                        {"$inc": {"visit_count": 1},
                         "$set": {"last_seen": datetime.datetime.now()}}
                    )
                
                # Ghi lại lần ghé thăm
                visit_data = {
                    "customer_id": face["id"],
                    "timestamp": datetime.datetime.now(),
                    "age": face["age"],
                    "gender": face["gender"],
                    "emotion": face["dominant_emotion"]
                }
                visits_collection.insert_one(visit_data)
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error detecting faces: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Could not process image: {str(e)}"
        }), 500

@app.route("/api/customers", methods=["GET"])
def get_customers():
    """Lấy danh sách khách hàng"""
    try:
        limit = int(request.args.get("limit", 100))
        customers = list(customers_collection.find({}, {'_id': 0}).limit(limit))
        
        return jsonify({
            "status": "success",
            "count": len(customers),
            "customers": customers
        })
    except Exception as e:
        logger.error(f"Error getting customers: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Could not retrieve customers: {str(e)}"
        }), 500

@app.route("/api/customers/<customer_id>", methods=["GET"])
def get_customer(customer_id):
    """Lấy thông tin của một khách hàng cụ thể"""
    try:
        customer = customers_collection.find_one({"id": customer_id}, {'_id': 0})
        
        if not customer:
            return jsonify({
                "status": "error",
                "message": "Customer not found"
            }), 404
            
        # Lấy lịch sử ghé thăm của khách hàng
        visits = list(visits_collection.find({"customer_id": customer_id}, {'_id': 0}))
        
        return jsonify({
            "status": "success",
            "customer": customer,
            "visits": visits
        })
    except Exception as e:
        logger.error(f"Error getting customer: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Could not retrieve customer: {str(e)}"
        }), 500

@app.route("/api/dashboard/summary", methods=["GET"])
def get_dashboard_summary():
    """Lấy dữ liệu tổng quan cho dashboard"""
    try:
        # Thống kê hiện tại
        response = requests.get(f"{AI_SERVICE_URL}/stats")
        current_stats = response.json()
        
        # Tổng số khách hàng
        total_customers = customers_collection.count_documents({})
        
        # Thống kê giới tính
        male_customers = customers_collection.count_documents({"gender": "Man"})
        female_customers = customers_collection.count_documents({"gender": "Woman"})
        
        # Thống kê độ tuổi
        age_groups = {
            "0-18": customers_collection.count_documents({"age": {"$lt": 19}}),
            "19-30": customers_collection.count_documents({"age": {"$gte": 19, "$lte": 30}}),
            "31-50": customers_collection.count_documents({"age": {"$gte": 31, "$lte": 50}}),
            "50+": customers_collection.count_documents({"age": {"$gt": 50}})
        }
        
        # Khách hàng thường xuyên (visit_count > 3)
        regular_customers = customers_collection.count_documents({"visit_count": {"$gt": 3}})
        
        return jsonify({
            "status": "success",
            "current_stats": current_stats,
            "total_customers": total_customers,
            "gender_stats": {
                "male": male_customers,
                "female": female_customers
            },
            "age_groups": age_groups,
            "regular_customers": regular_customers
        })
    except Exception as e:
        logger.error(f"Error getting dashboard summary: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Could not retrieve dashboard data: {str(e)}"
        }), 500

@app.route("/api/reset-stats", methods=["POST"])
def reset_stats():
    """Reset thống kê về khách hàng"""
    try:
        response = requests.post(f"{AI_SERVICE_URL}/reset-stats")
        
        # Lưu thời điểm reset vào cơ sở dữ liệu
        stats_collection.insert_one({
            "action": "reset",
            "timestamp": datetime.datetime.now()
        })
        
        return jsonify(response.json())
    except Exception as e:
        logger.error(f"Error resetting stats: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Could not reset stats: {str(e)}"
        }), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

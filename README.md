# Hệ thống đếm và phân loại khách hàng trong cửa hàng

Hệ thống AI giúp đếm và phân loại khách hàng trong cửa hàng sử dụng trí tuệ nhân tạo để phân tích hình ảnh từ camera an ninh. Hệ thống cung cấp khuyến nghị phân bổ nhân viên thông minh và đánh giá hiệu quả sự kiện dựa trên đối tượng khách hàng mục tiêu.

## 👥 Danh sách thành viên
- **24022404** - Nguyễn Đức Minh (Nhóm trưởng)
- **23020370** - Đồng Mạnh Hùng
- **23020345** - Phạm Tiến Dũng
- **20021180** - Nguyễn Tiến An
- **23020348** - Nguyễn Văn Duy

## 🐳 Docker Hub Repository

- **Backend**: https://hub.docker.com/r/nguyenducminh24022404/customer-analytics-backend
- **Frontend**: https://hub.docker.com/r/nguyenducminh24022404/customer-analytics-frontend

## 🚀 Hướng dẫn cho Thầy/Cô chạy hệ thống

### Yêu cầu hệ thống
- Docker và Docker Compose
- Python 3.8+ (cho camera stream trên Windows)
- Webcam hoặc camera IP
- Cổng 80, 5000, 6379, 8554 trống

### Bước 1: Clone repository
```bash
git clone [https://github.com/24022404/CuoiKi.git]
cd đến folder "Hệ thống đếm và phân loại khách hàng trong cửa hàng"
```

### Bước 2: Pull images từ Docker Hub (tùy chọn)
```bash
docker pull nguyenducminh24022404/customer-analytics-backend
docker pull nguyenducminh24022404/customer-analytics-frontend
```

### Bước 3: Chạy hệ thống
**⚠️ Quan trọng: Chạy theo thứ tự, terminal 1 trước rồi mới đến terminal 2**

#### Terminal 1: Camera stream (Windows host)
```bash
python camera-host-stream.py
```

#### Terminal 2: Docker containers
```bash
docker-compose up -d
```

### Bước 4: Truy cập hệ thống
- **Giao diện chính**: http://localhost
- **Trang quản trị**: http://localhost/admin.html

### Bước 5: Đăng nhập
- **Admin**: Sử dụng mã truy cập `ADMIN`
- **Nhân viên**: Sử dụng mã truy cập `NHANVIEN`

## 🎯 Tính năng chính

### 1. Đếm và phân loại khách hàng để phân bổ nhân viên

Hệ thống phân tích cơ cấu khách hàng để tối ưu hóa phân bổ nhân viên:

#### A. Phân bổ theo độ tuổi:
- **Ví dụ**: Phát hiện 60% khách hàng trong độ tuổi 0-20
- **Hệ thống đề xuất**: Tăng cường nhân viên trẻ (20-35 tuổi)
- **Lý do**: Nhân viên trẻ dễ đồng cảm và tương tác tốt với khách hàng trẻ

- **Ví dụ**: Phát hiện 50% khách hàng trên 60 tuổi
- **Hệ thống đề xuất**: Tăng cường nhân viên trung niên
- **Lý do**: Nhân viên có kinh nghiệm phục vụ tốt hơn cho khách hàng cao tuổi

#### B. Phân bổ theo giới tính:
- **Ví dụ**: Phát hiện 70% khách hàng là nam
- **Hệ thống đề xuất**: Cân đối nhân viên nam chiếm tỷ lệ cao hơn
- **Lý do**: Tạo sự thoải mái và đồng điệu cho khách hàng

- **Ví dụ**: Phát hiện 75% khách hàng là nữ
- **Hệ thống đề xuất**: Tăng cường nhân viên nữ phục vụ
- **Lý do**: Phụ nữ thường thoải mái hơn khi được nhân viên nữ tư vấn


### 2. Phân tích hiệu quả sự kiện

Hệ thống đánh giá hiệu quả sự kiện dựa trên đối tượng mục tiêu:

#### A. Sự kiện theo độ tuổi:
- **Ví dụ**: Sự kiện dành cho trẻ em (0-20 tuổi)
- Hệ thống đếm tỷ lệ khách hàng trong độ tuổi 0-20 so với tổng số
- **Đánh giá**: Nếu >85% khách hàng là trẻ em → Rất thành công

#### B. Sự kiện theo giới tính:
- **Ví dụ**: Sự kiện dành cho phụ nữ
- Hệ thống đếm tỷ lệ khách nữ so với tổng số
- **Đánh giá**: Nếu >70% khách hàng là nữ → Thành công

#### C. Mức độ thành công:
- **Rất thành công**: >85% đúng đối tượng mục tiêu
- **Thành công**: 70-85% đúng đối tượng
- **Trung bình**: 50-70% đúng đối tượng
- **Chưa thành công**: <50% đúng đối tượng

#### D. Báo cáo sau sự kiện:
- Tổng hợp số liệu thực tế

## 🏗️ Kiến trúc hệ thống

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend AI    │    │   Database      │
│   (HTML/JS)     │◄──►│ (Flask/DeepFace)│◄──►│   (Redis)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                        ▲
         │                        │
         ▼                        ▼
┌─────────────────┐    ┌─────────────────┐
│   Admin Panel   │    │  Camera Stream  │
│   (Management)  │    │ (OpenCV/Host)   │
└─────────────────┘    └─────────────────┘
```

### Thành phần hệ thống:

#### 1. Frontend - Người dùng
- Xem số lượng khách hàng hiện tại
- Thống kê theo thời gian thực
- Phân loại khách hàng (độ tuổi, giới tính)
- Khuyến nghị phân bổ nhân viên
- Báo cáo hiệu quả sự kiện

#### 2. Frontend - Admin
- Quản lý tài khoản người dùng
- Tạo và quản lý sự kiện
- Quản lý nhân viên
- Cấu hình hệ thống
- Xem nhật ký và lịch sử

#### 3. Backend - AI
- **Nhận diện khuôn mặt**: DeepFace với các detector backend (SSD, OpenCV)
- **Phân tích tuổi**: DeepFace age prediction models
- **Phân tích giới tính**: DeepFace gender prediction models  
- **Xử lý video**: OpenCV cho capture và preprocessing
- **API RESTful**: Flask framework

#### 4. Backend - Database
- Lưu trữ dữ liệu người dùng và sự kiện
- Thống kê khách hàng theo thời gian
- Kết quả phân tích AI
- Sao lưu tự động

## 📋 Use Cases chính

### UC1: Đăng nhập hệ thống
- **Actor**: Admin/Nhân viên
- **Mục tiêu**: Xác thực và cấp quyền truy cập
- **Flow**: Nhập mã truy cập → Xác thực → Truy cập hệ thống

### UC2: Hiển thị video và phân tích thời gian thực
- **Actor**: Nhân viên
- **Mục tiêu**: Theo dõi khách hàng trực tiếp
- **Flow**: Kết nối camera → Phân tích AI → Hiển thị kết quả

### UC3: Quản lý sự kiện
- **Actor**: Admin
- **Mục tiêu**: Tạo, sửa, xóa sự kiện
- **Flow**: Tạo sự kiện → Theo dõi hiệu quả → Đánh giá kết quả

### UC4: Quản lý nhân viên
- **Actor**: Admin
- **Mục tiêu**: Quản lý thông tin nhân viên
- **Flow**: Thêm/sửa/xóa nhân viên → Phân bổ theo khuyến nghị

## 🔧 Cấu hình hệ thống

### Đăng nhập
- **ADMIN**: Toàn quyền truy cập (trang chính + quản trị)
- **NHANVIEN**: Chỉ truy cập trang chính

### Camera
- Hỗ trợ webcam USB và camera IP
- RTSP stream
- Độ phân giải: 480p - 1080p
- FPS: 15-30

### AI
- **Framework chính**: DeepFace (TensorFlow backend)
- **Face Detection**: SSD, OpenCV detector backends
- **Models**: VGG-Face cho face recognition, Age/Gender prediction models
- **Độ chính xác tuổi**: ≥75%
- **Độ trễ xử lý**: ≤2 giây
- **Đồng thời**: Tối đa 20 người/khung hình

## 🛠️ Phát triển

### Cấu trúc thư mục
```
├── backend/
│   ├── app.py              # Flask backend chính
│   ├── database.py         # Thao tác cơ sở dữ liệu
│   └── requirements.txt    # Thư viện Python
├── frontend/
│   ├── index.html          # Giao diện chính
│   ├── admin.html          # Trang quản trị
│   ├── login.html          # Trang đăng nhập
│   └── script.js           # Logic JavaScript
├── docker-compose.yml      # Điều phối container
├── camera-host-stream.py   # Stream camera Windows
└── README.md
```

### Công nghệ sử dụng
- **Backend**: Flask + DeepFace + OpenCV
- **Frontend**: HTML/JS + Bootstrap 5
- **Database**: Redis
- **AI**: DeepFace cho nhận diện khuôn mặt
- **Container**: Docker + Docker Compose

### API chính
```
GET  /video_feed           # Stream video
GET  /latest_analysis      # Phân tích hiện tại
POST /auth/login           # Đăng nhập
GET  /api/events           # Quản lý sự kiện
GET  /api/employees        # Quản lý nhân viên
POST /analyze              # Phân tích ảnh
```

*Phát triển bởi nhóm sinh viên UET VNU cho môn Thực hành phát triển hệ thống trí tuệ nhân tạo*

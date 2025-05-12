# Hệ Thống Đếm và Phân Loại Khách Hàng trong Cửa Hàng

Một hệ thống sử dụng trí tuệ nhân tạo để đếm và phân loại khách hàng theo độ tuổi và giới tính, giúp tối ưu hóa việc phân bổ nhân viên và quản lý vận hành cửa hàng hiệu quả.

![Minh họa hệ thống](https://via.placeholder.com/800x400?text=Customer+Counting+and+Classification+System)

## Chức Năng Chính

- **Quay Video Thời Gian Thực**: Theo dõi khách hàng trong cửa hàng
- **Đếm Tổng Số Người**: Thống kê số lượng khách hàng hiện diện
- **Phân Tích Nhân Khẩu Học**:
  - Xác định độ tuổi của từng khách hàng
  - Xác định giới tính của từng khách hàng
- **Khuyến Nghị Phân Bổ Nhân Viên**:
  - Gợi ý về số lượng và loại nhân viên phù hợp dựa trên đặc điểm khách hàng

## Mục Đích Ứng Dụng

- **Tối Ưu Hóa Phân Bổ Nhân Viên**:
  - Khi có nhiều khách hàng trẻ → phân công nhiều nhân viên trẻ phục vụ
  - Khi có nhiều khách hàng lớn tuổi → phân công nhân viên chuyên nghiệp, có kinh nghiệm
- **Quản Lý Vận Hành Hiệu Quả**:
  - Điều chỉnh số lượng nhân viên theo lưu lượng khách

## Kiến Trúc Hệ Thống

```
┌─────────────┐           ┌───────────────┐         ┌─────────────────┐
│             │           │               │         │                 │
│  Web Camera │──────────▶│  Flask Server │────────▶│  Frontend UI    │
│             │           │  (DeepFace)   │         │  (HTML/JS/CSS)  │
└─────────────┘           └───────┬───────┘         └─────────────────┘
                                  │
                                  ▼
                          ┌───────────────┐
                          │  SQLite       │
                          │  Database     │
                          └───────────────┘
```

- **Frontend**: HTML, CSS, JavaScript với Bootstrap
- **Backend**: Python, Flask, OpenCV
- **AI Engine**: DeepFace (phân tích khuôn mặt, độ tuổi, giới tính)
- **Database**: SQLite (lưu trữ dữ liệu phân tích)

## Cài Đặt và Chạy Ứng Dụng

### Sử Dụng Docker (Khuyến nghị)

1. Cài đặt Docker và Docker Compose trên máy của bạn

2. Clone repo về máy:
   ```
   git clone <repository-url>
   cd "Hệ thống đếm và phân loại khách hàng trong cửa hàng"
   ```

3. Khởi động ứng dụng bằng Docker Compose:
   ```
   docker-compose up -d
   ```

4. Truy cập ứng dụng tại: `http://localhost:8080`

### Cài Đặt Thủ Công

1. Clone repo về máy:
   ```
   git clone <repository-url>
   cd "Hệ thống đếm và phân loại khách hàng trong cửa hàng"
   ```

2. Cài đặt các gói phụ thuộc:

   **Lưu ý quan trọng:** Dự án này sử dụng thư viện DeepFace đã được clone từ GitHub thay vì cài đặt qua pip để tránh lỗi đường dẫn dài trong Windows.

   Cách 1: Sử dụng file batch
   ```
   cd backend
   install_dependencies.bat
   ```

   Cách 2: Cài đặt thủ công
   ```
   cd backend
   pip install -r requirements.txt
   pip install numpy pandas gdown opencv-python pillow tensorflow==2.9.1 mtcnn retina-face
   ```

3. Chạy backend:
   ```
   python app.py
   ```
   **Quan trọng**: Backend phải đang chạy tại http://localhost:5000 để video feed hoạt động.

4. Mở frontend:
   - Sử dụng Live Server trong VSCode hoặc mở file `frontend/index.html` trong trình duyệt
   - Hoặc mở trình duyệt và truy cập `http://localhost:5500/frontend/index.html` (nếu dùng Live Server mặc định)

**Lưu ý**: Bạn phải đảm bảo Flask backend đang chạy trước khi mở frontend, nếu không video feed sẽ không hiển thị.

## Chụp Màn Hình Ứng Dụng

### Trang Chính
![Trang chính](https://via.placeholder.com/800x400?text=Home+Page)

### Bảng Điều Khiển Phân Tích
![Phân tích](https://via.placeholder.com/800x400?text=Analytics+Dashboard)

### Quản Lý Nhân Viên
![Quản lý nhân viên](https://via.placeholder.com/800x400?text=Staff+Management)

## Các Công Nghệ Sử Dụng

- **Frontend**:
  - HTML5, CSS3, JavaScript
  - Bootstrap 5
  - Chart.js (hiển thị biểu đồ)
  - Fetch API (giao tiếp với backend)

- **Backend**:
  - Python 3.8+
  - Flask (web framework)
  - Flask-CORS (cho phép cross-origin requests)
  - OpenCV (xử lý hình ảnh)
  - DeepFace (phân tích khuôn mặt, tuổi, giới tính)

- **Database**:
  - SQLite (lưu trữ dữ liệu phân tích)

- **DevOps**:
  - Docker (containerization)
  - Docker Compose (điều phối container)

## API Endpoints

- `GET /video_feed` - Stream video từ camera
- `GET /latest_analysis` - Lấy kết quả phân tích mới nhất
- `GET /historical_data` - Lấy dữ liệu lịch sử phân tích
- `POST /analyze` - Phân tích ảnh được upload
- `GET /camera_status` - Kiểm tra trạng thái camera

## Xử lý sự cố khi hệ thống không đếm được người

Nếu hệ thống không đếm được khách hàng mặc dù bạn đang ở phía trước camera, hãy thử các cách sau:

1. **Kiểm tra camera và DeepFace**:
   ```
   cd backend
   python test_camera.py
   ```
   Script này sẽ kiểm tra camera và DeepFace có hoạt động đúng không, đồng thời tạo hai ảnh `test_camera.jpg` và `test_faces.jpg` để bạn xem.

2. **Vấn đề về độ sáng và khoảng cách**:
   - Đảm bảo bạn ngồi trong khu vực có ánh sáng đầy đủ
   - Không quá gần hoặc quá xa camera (khoảng cách lý tưởng là 0.5-1.5m)
   - Tránh chuyển động quá nhanh trước camera

3. **Thiết lập tham số nhận diện**:
   - Mở file `backend/app.py` và tìm đến đoạn `DeepFace.analyze`
   - Thử các tham số detector_backend khác: 'opencv', 'ssd', 'mtcnn', 'retinaface'
   - Thử giảm giá trị enforce_detection xuống False
   
4. **Kiểm tra Console**:
   - Mở Console của trình duyệt bằng cách nhấn F12
   - Kiểm tra các lỗi kết nối API hoặc thông báo từ backend
   - Đảm bảo URL kết nối đến backend là chính xác

5. **Vấn đề về tài nguyên**:
   - Tắt các ứng dụng khác đang chạy để giải phóng CPU/RAM
   - Đảm bảo thiết bị của bạn đáp ứng yêu cầu tối thiểu về phần cứng

6. **Khởi động lại hoàn toàn**:
   - Đóng tất cả các cửa sổ Terminal/Command Prompt
   - Đóng trình duyệt web
   - Khởi động lại máy tính (trong một số trường hợp)
   - Khởi động lại quy trình từ đầu

## Docker Hub

Dự án này cũng được đóng gói và đẩy lên Docker Hub để dễ dàng triển khai:

- **Frontend Image**: `[username]/customer-counter-frontend:latest`
- **Backend Image**: `[username]/customer-counter-backend:latest`

Bạn có thể kéo và chạy các image này bằng lệnh:
```
docker pull [username]/customer-counter-frontend:latest
docker pull [username]/customer-counter-backend:latest
```

Hoặc đơn giản hơn, sử dụng file docker-compose.yml đã cung cấp.

## Đóng Góp

Các đóng góp cho dự án được chào đón! Vui lòng tạo issue hoặc pull request với các cải tiến.

## Nhóm Phát Triển

- Thành viên 1 (Trưởng nhóm)
- Thành viên 2
- Thành viên 3
- Thành viên 4
- Thành viên 5

## Giấy Phép

Dự án này được phân phối dưới giấy phép MIT.

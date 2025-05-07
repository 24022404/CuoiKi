# Hệ Thống Đếm và Phân Loại Khách Hàng trong Cửa Hàng

Một hệ thống sử dụng trí tuệ nhân tạo để đếm và phân loại khách hàng theo độ tuổi và giới tính, giúp tối ưu hóa việc phân bổ nhân viên và quản lý vận hành cửa hàng hiệu quả.

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

## Cài Đặt và Chạy Ứng Dụng

### Yêu Cầu Hệ Thống

- Python 3.8+
- Webcam hoặc camera IP
- Trình duyệt web hiện đại

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

### Xử lý sự cố khi hệ thống không đếm được người

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

### Xử lý sự cố khác

- Đảm bảo rằng thư mục deepface đã được clone vào cùng thư mục cha với dự án này (Cuối kì)
- Nếu không tìm thấy deepface, hãy kiểm tra đường dẫn trong file `backend/setup_deepface.py`
- Nếu video không hiển thị, hãy kiểm tra Console của trình duyệt (F12) để xem lỗi
- Đảm bảo webcam của bạn không bị chặn hoặc đang được sử dụng bởi ứng dụng khác
- Một số trình duyệt yêu cầu HTTPS để truy cập webcam - trong môi trường phát triển, bạn nên dùng Chrome hoặc Edge

### Sử Dụng Docker (Coming Soon)

Hướng dẫn sử dụng Docker sẽ được cập nhật sau.

## Cấu Trúc Dự Án

```
Hệ thống đếm và phân loại khách hàng trong cửa hàng/
├── backend/                 # Backend API và xử lý AI
│   ├── app.py               # Ứng dụng Flask chính
│   ├── database.py          # Xử lý cơ sở dữ liệu
│   └── requirements.txt     # Các gói phụ thuộc
├── frontend/                # Giao diện người dùng
│   ├── index.html           # Trang chính
│   ├── admin.html           # Trang quản trị
│   ├── styles.css           # CSS cho giao diện
│   ├── script.js            # JavaScript cho trang chính
│   └── admin.js             # JavaScript cho trang quản trị
└── README.md                # Tài liệu dự án
```

## Công Nghệ Sử Dụng

- **Backend**: Flask, DeepFace, OpenCV, SQLite
- **Frontend**: HTML5, CSS3, JavaScript, Bootstrap, Chart.js

## Đóng Góp

Các đóng góp cho dự án được chào đón! Vui lòng tạo issue hoặc pull request với các cải tiến.

## Giấy Phép

Dự án này được phân phối dưới giấy phép MIT.

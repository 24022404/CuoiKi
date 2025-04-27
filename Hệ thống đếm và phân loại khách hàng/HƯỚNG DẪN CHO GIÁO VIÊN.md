# Hướng Dẫn Sử Dụng Hệ Thống Đếm và Phân Loại Khách Hàng

## Yêu Cầu Hệ Thống
- Docker và Docker Compose
- Webcam (để sử dụng tính năng nhận diện khuôn mặt thời gian thực)

## Các Bước Thực Hiện

### 1. Tải Docker Image
```bash
docker pull nhom6/customer-analytics-frontend
docker pull nhom6/customer-analytics-admin
docker pull nhom6/customer-analytics-api
docker pull nhom6/customer-analytics-ai-service
```

### 2. Tải xuống và lưu file docker-compose.yml
File docker-compose.yml đã được cung cấp trong thư mục này.

### 3. Chạy hệ thống
```bash
docker-compose up -d
```

### 4. Truy cập ứng dụng
- Giao diện người dùng: http://localhost:3000
- Giao diện quản trị: http://localhost:3001

## Thông Tin Docker Hub
- Frontend: [nhom6/customer-analytics-frontend](https://hub.docker.com/r/nhom6/customer-analytics-frontend)
- Admin Dashboard: [nhom6/customer-analytics-admin](https://hub.docker.com/r/nhom6/customer-analytics-admin)
- Backend API: [nhom6/customer-analytics-api](https://hub.docker.com/r/nhom6/customer-analytics-api)
- AI Service: [nhom6/customer-analytics-ai-service](https://hub.docker.com/r/nhom6/customer-analytics-ai-service)

## Cách Sử Dụng
### Giao diện người dùng (http://localhost:3000):
1. Nhấn vào nút "Bắt đầu Camera" để kích hoạt camera
2. Hệ thống sẽ tự động nhận diện và phân tích khuôn mặt
3. Kết quả phân tích sẽ được hiển thị bên cạnh với biểu đồ phân bố

### Giao diện quản trị (http://localhost:3001):
1. Xem thống kê tổng quan về lưu lượng khách hàng
2. Xem danh sách khách hàng và chi tiết từng khách
3. Sử dụng nút "Reset Thống Kê" nếu muốn bắt đầu lại từ đầu

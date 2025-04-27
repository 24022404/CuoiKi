# Hệ Thống Đếm và Phân Loại Khách Hàng

## Thông tin nhóm
- Thành viên 1: [Họ tên] - [MSSV]
- Thành viên 2: [Họ tên] - [MSSV]
- Thành viên 3: [Họ tên] - [MSSV]
- Thành viên 4: [Họ tên] - [MSSV]
- Thành viên 5: [Họ tên] - [MSSV]
- Thành viên 6: [Họ tên] - [MSSV]

## Mô tả dự án
Hệ thống đếm và phân loại khách hàng sử dụng trí tuệ nhân tạo để giúp các cửa hàng hiểu rõ hơn về đối tượng khách hàng của mình. Hệ thống sử dụng camera để nhận diện khuôn mặt khách hàng, đếm số lượng và phân loại theo các tiêu chí như độ tuổi, giới tính, thời gian lưu lại cửa hàng, và phân biệt khách hàng mới/cũ.

### Tính năng chính
1. **Đếm số lượng khách hàng**: Thống kê số người vào/ra cửa hàng theo thời gian thực
2. **Phân loại khách hàng**: Phân loại theo độ tuổi, giới tính
3. **Theo dõi thời gian**: Đo lường thời gian khách hàng ở trong cửa hàng
4. **Nhận diện khách hàng thường xuyên**: Phân biệt khách hàng mới và khách hàng quay lại
5. **Báo cáo và thống kê**: Tạo báo cáo chi tiết về lưu lượng và hành vi khách hàng

## Hướng dẫn cài đặt và sử dụng
### Yêu cầu hệ thống
- Docker và Docker Compose
- Camera hoặc webcam (cho triển khai thực tế)

### Cài đặt
```bash
# Clone repository
git clone [URL repository của bạn]
cd hệ-thống-đếm-và-phân-loại-khách-hàng

# Khởi chạy hệ thống
docker-compose up -d
```

### Truy cập ứng dụng
- Giao diện người dùng: http://localhost:3000
- Giao diện quản trị: http://localhost:3001
- API backend: http://localhost:5000

## Docker Hub
[Link Docker Hub của dự án]

## Công nghệ sử dụng
- **Frontend**: React.js, Chart.js
- **Backend**: FastAPI/Flask, Deepface
- **Database**: MongoDB
- **Xử lý AI**: Python, OpenCV, Deepface
- **Container**: Docker

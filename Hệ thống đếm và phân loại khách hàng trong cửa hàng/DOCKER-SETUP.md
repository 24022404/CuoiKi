# Hướng dẫn chạy hệ thống với Docker

## Vấn đề về Camera trong Docker

Trên Windows, Docker containers không thể truy cập trực tiếp vào webcam/camera của hệ thống do hạn chế bảo mật. Để giải quyết vấn đề này, chúng ta sử dụng một camera stream server chạy trên Windows host.

## Kiến trúc hệ thống

```
Windows Host
├── camera-host-stream.py (chạy trên host, truy cập camera)
│   └── Cung cấp stream tại http://localhost:8554/video_feed
│
└── Docker Containers
    ├── backend-ai (kết nối đến host:8554 qua host.docker.internal)
    ├── frontend-user
    └── backend-db (Redis)
```

## Cách khởi động hệ thống

### Tự động (Khuyến nghị)

Chạy file batch script:
```cmd
start-system.bat
```

### Thủ công

1. **Cài đặt dependencies cho camera stream:**
   ```cmd
   pip install -r requirements-host.txt
   ```

2. **Khởi động camera stream trên host:**
   ```cmd
   python camera-host-stream.py
   ```
   
   Stream sẽ chạy tại: http://localhost:8554/video_feed

3. **Khởi động Docker containers:**
   ```cmd
   docker-compose up --build
   ```

## Cách dừng hệ thống

### Tự động
```cmd
stop-system.bat
```

### Thủ công
1. Dừng Docker containers: `docker-compose down`
2. Dừng camera stream: Đóng terminal hoặc Ctrl+C

## Truy cập hệ thống

- **Frontend:** http://localhost:80 hoặc http://localhost:8080
- **Backend API:** http://localhost:5000
- **Camera Stream:** http://localhost:8554/video_feed
- **Database:** Redis tại localhost:6379

## Xử lý sự cố

### Camera không hoạt động

1. Kiểm tra camera có đang được sử dụng bởi ứng dụng khác không
2. Đảm bảo camera-host-stream.py đang chạy
3. Kiểm tra stream tại: http://localhost:8554/video_feed
4. Restart camera stream nếu cần thiết

### Docker containers không thể kết nối camera

1. Kiểm tra `host.docker.internal` có hoạt động không
2. Đảm bảo firewall không chặn port 8554
3. Kiểm tra environment variable `CAMERA_SOURCE` trong docker-compose.yaml

### Lỗi khi build Docker

1. Đảm bảo Docker Desktop đang chạy
2. Xóa cache: `docker system prune -a`
3. Build lại: `docker-compose up --build --force-recreate`

## Tùy chọn Camera Source

Trong file docker-compose.yaml, bạn có thể thay đổi `CAMERA_SOURCE`:

```yaml
environment:
  - CAMERA_SOURCE=http://host.docker.internal:8554/video_feed  # Host stream
  - CAMERA_SOURCE=0  # Camera index (chỉ hoạt động trên Linux)
  - CAMERA_SOURCE=rtsp://camera_ip:port/stream  # RTSP camera
```

## Files quan trọng

- `camera-host-stream.py`: Camera stream server cho Windows host
- `docker-compose.yaml`: Cấu hình Docker containers
- `start-system.bat`: Script khởi động tự động
- `stop-system.bat`: Script dừng hệ thống
- `requirements-host.txt`: Dependencies cho camera stream

## Note

Giải pháp này được thiết kế đặc biệt cho Windows. Trên Linux, bạn có thể uncomment camera-stream service trong docker-compose.yaml và sử dụng device mapping để truy cập camera trực tiếp.

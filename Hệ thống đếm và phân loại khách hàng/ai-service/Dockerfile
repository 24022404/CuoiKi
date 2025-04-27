FROM python:3.9-slim

WORKDIR /app

# Cài đặt các gói phụ thuộc cho OpenCV
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Sao chép requirements và cài đặt các phụ thuộc Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Sao chép mã nguồn
COPY . .

# Tạo thư mục models nếu chưa tồn tại
RUN mkdir -p /app/models

# Khai báo cổng mạng sẽ sử dụng
EXPOSE 8000

# Khởi chạy ứng dụng
CMD ["python", "app.py"]

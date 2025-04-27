FROM python:3.9-slim

WORKDIR /app

# Cài đặt các phụ thuộc
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Sao chép mã nguồn
COPY . .

# Khai báo cổng mạng sẽ sử dụng
EXPOSE 5000

# Khởi chạy ứng dụng
CMD ["python", "app.py"]

Mọi người vào tự nhận nhiệm vụ lằm nhé
https://docs.google.com/spreadsheets/d/1eMwZ1l8ufROmZK0wkOPAWx5Ww9Q3R3y9WV3Z561oAlM/edit?gid=0#gid=0

# Hệ thống đếm và phân loại khách hàng trong cửa hàng

Hệ thống giúp đếm và phân loại khách hàng trong cửa hàng sử dụng trí tuệ nhân tạo để phân tích hình ảnh từ camera an ninh.

## Frontend - Người dùng

### Chức năng
- Xem số lượng khách hàng hiện tại trong cửa hàng
- Xem thống kê khách hàng theo thời gian thực
- Xem phân loại khách hàng (độ tuổi, giới tính)
- Nhận thông báo khi lượng khách vượt ngưỡng
- Hiện khuyến nghị phân bổ nhân viên (nhân viên trẻ, năng động => khách hàng trẻ, nhân viên lớn tuổi => khách hàng lớn tuổi)
- Hiện báo cáo hiệu quả sự kiện

## Frontend - Admin

### Chức năng
- Quản lý tài khoản người dùng (thêm, sửa, xóa)
- Tạo sự kiện
- Cấu hình mô hình AI và các thông số nhận diện
- Xem nhật ký hệ thống và lịch sử hoạt động
- Quản lý sao lưu và khôi phục dữ liệu

## Backend - AI

### Chức năng
- Nhận diện người trong hình ảnh từ camera
- Đếm số lượng người trong từng khu vực
- Phân loại khách hàng theo độ tuổi (trẻ em, thanh niên, trung niên, cao tuổi)
- Phân loại khách hàng theo giới tính

## Backend - Database

### Chức năng
- Lưu trữ thông tin người dùng(nhân viên) và phân quyền, lưu trữ thông tin sự kiện
- Lưu trữ dữ liệu thống kê khách hàng theo thời gian
- Lưu trữ kết quả phân tích từ mô hình AI
- Cung cấp API để frontend truy vấn dữ liệu
- Sao lưu và khôi phục dữ liệu tự động

### Đăng nhập
- Tài khoản mặc định: admin / admin123
- Mã xác nhận để đăng ký người dùng mới: ADMIN123

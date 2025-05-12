from database import Database

# Khởi tạo database và tạo user admin mặc định
db = Database()

# Kiểm tra người dùng admin đã tồn tại chưa
users = db.get_all_users()
print(f"Đã tìm thấy {len(users)} người dùng trong hệ thống.")

# In thông tin user admin
for user in users:
    if user["username"] == "admin":
        print(f"User admin đã tồn tại với ID: {user['id']}")
        print(f"Tên đầy đủ: {user['full_name']}")
        print(f"Vị trí: {user['position']}")
        print("Hãy sử dụng tài khoản này để đăng nhập: admin / admin123")

print("\nBạn có thể đăng ký người dùng mới với mã xác nhận: ADMIN123")
print("Database đã được khởi tạo thành công!")

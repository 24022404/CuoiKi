
# Hệ thống đếm và phân loại khách hàng trong cửa hàng

Hệ thống giúp đếm và phân loại khách hàng trong cửa hàng sử dụng trí tuệ nhân tạo để phân tích hình ảnh từ camera an ninh.

# Danh sách thành viên
- 24022404 - Nguyễn Đức Minh
- 23020370 - Đồng Mạnh Hùng
- 23020345 - Phạm Tiến Dũng
- 20021180 - Nguyễn Tiến An
- 23020348 - Nguyễn Văn Duy

# Liên kết Docker Hub

# Hướng dẫn chạy docker-compose up -d

# Nhiệm vụ

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
- Sử dụng mã truy cập: `ADMIN` hoặc `NHANVIEN`
- Vai trò ADMIN: Truy cập toàn bộ hệ thống (cả trang chính và trang quản trị)
- Vai trò NHANVIEN: Chỉ truy cập trang chính

# Use case
## 1. UC1: Đăng nhập
Tên: Đăng nhập 
Mô tả ngắn gọn: Người dùng truy cập hệ thống và được tự động kiểm tra trạng thái đăng nhập. Nếu chưa đăng nhập hoặc phiên đã hết hạn, hệ thống sẽ chuyển hướng người dùng đến trang đăng nhập.
Actor:
    Chính: Người dùng (Admin, Nhân viên)
Mục tiêu: Cấp quyền truy cập vào nội dung chính của ứng dụng cho người dùng đã xác thực.
Pre-condition:
    Người dùng đã mở trình duyệt và truy cập URL của ứng dụng.
    Người dùng đang ở giao diện đăng nhập của ứng dụng.
    Hệ thống Backend đang hoạt động và sẵn sàng xử lý các yêu cầu xác thực.
Main Flow:
    1. Người dùng nhập mã truy cập phù hợp.
    2. Hệ thống kiểm tra mã truy cập.
    3. Hệ thống kiểm tra hoàn tất và hiện thị thông báo "Đăng nhập thành công. Đang chuyển hướng..".
Alternative Flow:
    Bước 2: Mã truy cập không hợp lệ: Quay lại bước 1.
Post-condition:
    Người dùng đã được xác thực và có quyền truy cập vào các chức năng phù hợp với vai trò của họ.
    Giao diện người dùng được cập nhật để phản ánh trạng thái đăng nhập.
Exceptions:
    Lỗi hệ thống: Nếu có lỗi trong quá trình xử lý trạng thái đăng nhập, người dùng có thể không được chuyển hướng hoặc giao diện không hiển thị chính xác.

## 2. UC2: Đăng xuất:
Tên: Đăng xuất Người dùng
Mô tả ngắn gọn: Người dùng chủ động kết thúc phiên làm việc của mình trên hệ thống.
Actor:
Chính: Người dùng (Admin, Nhân viên)
Mục tiêu: Người dùng kết thúc phiên làm việc của mình và đăng xuất về trang chủ.
Pre-condition:
    Người dùng đã đăng nhập vào hệ thống.
Main Flow:
    1. Người dùng nhấp vào nút hiện thị quyền của mình (Nhân viên, Quản trị viên) trên giao diện.
    2. Người dùng nhấp vào nút "Đăng xuất" trên giao diện.
    3. Hệ thống chuyển hướng trình duyệt đến trang đăng nhập.
Alternative Flow: Không có.
Post-condition:
    Tất cả dữ liệu phiên đăng nhập của người dùng đã được xóa khỏi trình duyệt.
    Người dùng được chuyển hướng thành công đến trang đăng nhập.
Exceptions:
    Lỗi đăng xuất: Nếu có lỗi xảy ra trong quá trình xóa dữ liệu đăng nhập, hệ thống sẽ thông báo lỗi và có thể yêu cầu người dùng thử lại.

## 3. UC3: Hiển thị và Quản lý Nguồn cấp Dữ liệu Video 
Tên: Hiển thị và Quản lý Nguồn cấp Dữ liệu Video
Mô tả ngắn gọn: Hệ thống hiển thị luồng video trực tiếp từ camera và cho phép người dùng tạm dừng hoặc tiếp tục luồng video đó.
Actor:
Chính: Người dùng
Mục tiêu: Cho phép người dùng xem trực tiếp luồng video từ camera và kiểm soát trạng thái hiển thị (tạm dừng / tiếp tục).
Pre-condition:
    Người dùng đã đăng nhập và hệ thống đã kết nối được với camera.
Main Flow:
    1. Hệ thống hiển thị giao diện chính sau khi người dùng đăng nhập.
    2. Hệ thống tự động kết nối và hiển thị luồng video trực tiếp từ camera.
    3. Người dùng nhấp vào nút "Tạm Dừng".
    4. Hệ thống tạm dừng hiển thị luồng video.
    5. Nút "Tạm Dừng" chuyển thành "Tiếp Tục".
    6. Người dùng nhấp vào nút "Tiếp Tục".
    7. Hệ thống tiếp tục hiển thị luồng video.
    8. Nút "Tiếp Tục" chuyển lại thành "Tạm Dừng".
Alternative Flow: 
    Bước 2: Mất kết nối camera trong khi hiển thị:
        Hệ thống hiển thị thông báo lỗi "Không thể kết nối đến máy chủ. Vui lòng kiểm tra xem backend có đang chạy không."
Post-condition:
    Luồng video từ camera được hiển thị trên giao diện người dùng.
    Người dùng có thể tạm dừng hoặc tiếp tục luồng video theo ý muốn.
Exceptions:
    Không kết nối được Camera: Nếu không kết nối được với camera, luồng video sẽ không hiển thị và có thể có thông báo lỗi.

## 4. UC4: Hiển thị Dữ liệu Phân tích Khách hàng Thời gian Thực 
Tên: Hiển thị Dữ liệu Phân tích Khách hàng Thời gian Thực
Mô tả ngắn gọn: Hệ thống định kỳ truy xuất dữ liệu phân tích khách hàng mới nhất (tổng số người, phân bố giới tính, phân bố độ tuổi) và cập nhật hiển thị trên giao diện người dùng.
Actor:
    Chính: Người dùng
Mục tiêu: Quan sát đặc điểm khách hàng tại thời điểm hiện tại dựa trên hình ảnh thu từ camera.
Pre-condition:
    Người dùng đã đăng nhập.
    Thiết bị đã kết nối camera và có quyền truy cập.
Main Flow:
    1. Người dùng mở camera phân tích.
    2. Hệ thống bật camera và bắt đầu ghi nhận hình ảnh đầu vào.
    3. Hệ thống thực hiện phân tích hình ảnh theo thời gian thực
        Phát hiện khuôn mặt
        Xác định giới tính và độ tuổi
        Cập nhật số lượng người phát hiện được
        Tính toán phân bố giới tính, độ tuổi
        Cập nhật giao diện hiển thị theo thời gian thực
    4. Người dùng theo dõi số liệu được cập nhật tự động trên giao diện.
Alternative Flow:
    Bước 3: Không lấy được dữ liệu mới:
        Nếu có lỗi khi lấy dữ liệu từ Backend, các số liệu trên giao diện sẽ không được cập nhật trong chu kỳ đó.
Post-condition:
    Các chỉ số về tổng số người, giới tính và phân bố độ tuổi của khách hàng được hiển thị cập nhật trên giao diện người dùng.
Exceptions:
    Backend không phản hồi: Hệ thống không thể lấy dữ liệu phân tích từ Backend, khiến dữ liệu trên giao diện không được cập nhật.

## 5. UC5: Đưa ra Khuyến nghị Phân bổ Nhân viên
Tên: Đưa ra Khuyến nghị Phân bổ Nhân viên
Mô tả ngắn gọn: Dựa trên số lượng khách hàng tổng thể, phân bố giới tính và độ tuổi, hệ thống tự động tạo và hiển thị các đề xuất thực tế về việc điều chỉnh số lượng và cơ cấu nhân sự.
Actor:
    Chính: Người dùng
Mục tiêu: Cung cấp thông tin chi tiết và kịp thời để hỗ trợ quản lý đưa ra quyết định tối ưu về phân bổ nhân viên.
Pre-condition:
    UC5 đang hoạt động và đã có dữ liệu phân tích khách hàng.
Main Flow:
    1. Người dùng theo dõi Dashboard camera.
    2. Khi có đủ dữ liệu khách hàng (số lượng, giới tính, độ tuổi), hệ thống tự động phân tích.
    3. Người dùng sử dụng thông tin để đưa ra khuyến nghị.
Alternative Flow:
    Bước 3: Không có khách hàng nào:
        Hệ thống không hiển thị khuyến nghị, thông báo "Đang phân tích để đưa ra khuyến nghị phân bổ nhân viên.."
Post-condition:
    Các khuyến nghị về phân bổ nhân viên dựa trên dữ liệu khách hàng được hiển thị rõ ràng trên giao diện.
Exceptions:
    Dữ liệu thiếu/không hợp lệ: Nếu dữ liệu phân tích khách hàng không đầy đủ, các khuyến nghị có thể không chính xác hoặc không được tạo ra.

## 6. Tạo Sự kiện Mới
Tên: Tạo Sự kiện Mới
Mô tả ngắn gọn: Admin nhập thông tin chi tiết để tạo một sự kiện mới trong hệ thống.
Actor:
    Chính: Admin
Mục tiêu: Thêm một sự kiện mới vào cơ sở dữ liệu của hệ thống để có thể theo dõi và phân tích.
Pre-condition:
    Admin đã truy cập trang quản trị.
    Giao diện sự kiện đã được hiển thị.
Main Flow:
    1. Admin nhấp vào nút "Tạo Sự kiện Mới" trên trang quản lý sự kiện.
    2. Hệ thống hiển thị một biểu mẫu (form) để nhập thông tin sự kiện.
    3. Admin nhập các thông tin cần thiết vào biểu mẫu.
    4. Admin nhấp vào nút "Lưu".
    5. Hệ thống gửi thông tin sự kiện đến Backend để xử lý.
    6. Hệ thống lưu thông tin sự kiện và hiển thị thông báo thành công trên giao diện.
Alternative Flow:
    Bước 4: Thông tin không hợp lệ:
        Nếu Admin nhập không đầy đủ thông tin, hệ thống sẽ hiển thị thông báo lỗi và yêu cầu Admin nhập đầy đủ.
        Admin quay lại bước 3 để chỉnh sửa thông tin.
    Bước 5: Hủy tạo sự kiện:
        Admin nhấp vào nút "Hủy" hoặc đóng biểu mẫu.
        Hệ thống đóng biểu mẫu và không lưu sự kiện.
Post-condition:
    Sự kiện mới được tạo và lưu trữ trong hệ thống.
    Admin nhận được xác nhận về việc tạo sự kiện thành công.
Exceptions:
    Lỗi kết nối Backend: Hệ thống không thể gửi thông tin sự kiện đến Backend.
    Lỗi lưu trữ dữ liệu Backend: Backend không thể lưu sự kiện vì lỗi cơ sở dữ liệu.
    Xung đột dữ liệu: Tên sự kiện bị trùng hoặc có xung đột khác.

## 7: Chỉnh sửa Thông tin Sự kiện
Tên: Chỉnh sửa Thông tin Sự kiện
Mô tả ngắn gọn: Admin cập nhật thông tin chi tiết của một sự kiện đã có trong hệ thống.
Actor:
Chính: Admin
Mục tiêu: Cập nhật thông tin của một sự kiện để đảm bảo tính chính xác và phù hợp.
Pre-condition:
    Admin đã truy cập trang quản trị.
    Giao diện sự kiện đã được hiển thị.
    Sự kiện cần chỉnh sửa đã tồn tại trong danh sách.
Main Flow:
    1. Admin nhấp vào biểu tượng bút chì bên cạnh sự kiện cần chỉnh sửa.
    2. Hệ thống hiển thị biểu mẫu chỉnh sửa với tất cả thông tin hiện tại của sự kiện được điền sẵn.
    3. Admin thay đổi các thông tin cần thiết.
    4. Admin nhấp vào nút "Lưu thay đổi" hoặc "Cập nhật".
    5. Hệ thống gửi thông tin đã chỉnh sửa đến Backend.
    6. Hệ thống hiển thị thông báo thành công trên giao diện.
Alternative Flow:
    Bước 1: Kết nối bị lỗi:
        Hệ thống hiển thị thông báo lỗi: "Error: Lỗi kết nối với server khi lấy chi tiết sự kiện".
    Bước 5: Thông tin không hợp lệ:
        Nếu Admin nhập thông tin không hợp lệ, hệ thống sẽ hiển thị thông báo lỗi cụ thể và yêu cầu Admin sửa lại.
        Admin quay lại bước 4 để chỉnh sửa thông tin.
    Bước 5: Hủy chỉnh sửa:
        Admin nhấp vào nút "Hủy" hoặc đóng biểu mẫu.
        Hệ thống đóng biểu mẫu và không lưu các thay đổi, thông tin sự kiện được giữ nguyên.
Post-condition:
    Thông tin của sự kiện được cập nhật trong cơ sở dữ liệu.
    Admin nhận được xác nhận về việc cập nhật thành công.
Exceptions:
    Lỗi kết nối Backend: Hệ thống không thể gửi thông tin cập nhật đến Backend.
    Lỗi lưu trữ dữ liệu Backend: Backend không thể cập nhật sự kiện.
    Không tìm thấy sự kiện: Sự kiện bị xóa bởi Admin khác trong khi đang chỉnh sửa.
## 8. Xóa Sự kiện
Tên: Xóa Sự kiện
Mô tả ngắn gọn: Admin loại bỏ một sự kiện không còn cần thiết khỏi hệ thống.
Actor:
Chính: Admin
Mục tiêu: Xóa một sự kiện khỏi cơ sở dữ liệu và danh sách hiển thị.
Pre-condition:
    Admin đã truy cập trang quản trị.
    Giao diện sự kiện đã được hiển thị.
    Sự kiện cần xóa đã tồn tại trong danh sách.
Main Flow:
    1. Admin tìm và chọn một sự kiện từ danh sách.
    2. Admin nhấp vào hoặc biểu tượng thùng rác bên cạnh sự kiện đó.
    3. Hệ thống hiển thị hộp thoại xác nhận "Bạn có chắc muốn xóa sự kiện này ?".
    4. Admin nhấp vào nút "Xác nhận Xóa".
    5. Hệ thống gửi yêu cầu xóa sự kiện đến Backend.
    6. Hệ thống hiển thị thông báo "Xóa sự kiện thành công" trên giao diện.
Alternative Flow:
    Bước 4: Hủy xóa:
        Admin nhấp vào nút "Hủy" trong hộp thoại xác nhận.
        Hệ thống đóng hộp thoại xác nhận và không xóa sự kiện.
Post-condition:
    Sự kiện được xóa khỏi cơ sở dữ liệu của hệ thống.
    Admin nhận được xác nhận về việc xóa thành công.
Exceptions:
    Lỗi kết nối Backend: Hệ thống không thể gửi yêu cầu xóa đến Backend.
    Lỗi xóa dữ liệu Backend: Backend không thể xóa sự kiện.
    Không tìm thấy sự kiện: Sự kiện đã bị xóa bởi Admin khác trước đó.


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

---

## 1. UC1: Đăng nhập

-   **Mô tả**: Người dùng truy cập hệ thống và được tự động kiểm tra trạng thái đăng nhập. Nếu chưa đăng nhập hoặc phiên đã hết hạn, hệ thống sẽ chuyển hướng người dùng đến trang đăng nhập.
-   **Actor**:
    -   Chính: Người dùng (Admin, Nhân viên)
-   **Mục tiêu**:
    -   Cấp quyền truy cập vào nội dung chính của ứng dụng cho người dùng đã xác thực.
-   **Pre-condition**:
    -   Người dùng đã mở trình duyệt và truy cập URL của ứng dụng.
    -   Người dùng đang ở giao diện đăng nhập của ứng dụng.
    -   Hệ thống Backend đang hoạt động và sẵn sàng xử lý các yêu cầu xác thực.
-   **Main Flow**:
    -   **Bước 1**: Người dùng nhập mã truy cập phù hợp.
    -   **Bước 2**: Hệ thống kiểm tra mã truy cập.
    -   **Bước 3**: Hệ thống kiểm tra hoàn tất và hiển thị thông báo "Đăng nhập thành công. Đang chuyển hướng..".
-   **Alternative Flow**:
    -   **Bước 2**: Mã truy cập không hợp lệ: Quay lại bước 1.
-   **Post-condition**:
    -   Người dùng đã được xác thực và có quyền truy cập vào các chức năng phù hợp với vai trò của họ.
    -   Giao diện người dùng được cập nhật để phản ánh trạng thái đăng nhập.
-   **Exceptions**:
    -   Lỗi hệ thống: Nếu có lỗi trong quá trình xử lý trạng thái đăng nhập, người dùng có thể không được chuyển hướng hoặc giao diện không hiển thị chính xác.

---

## 2. UC2: Đăng xuất Người dùng

-   **Mô tả**: Người dùng chủ động kết thúc phiên làm việc trên hệ thống.
-   **Actor chính**: Người dùng (Admin, Nhân viên)
-   **Mục tiêu**: Kết thúc phiên làm việc và đăng xuất về trang chủ.
-   **Pre-condition**: Người dùng đã đăng nhập vào hệ thống.
-   **Main Flow**:
    -   **Bước 1**: Người dùng nhấp vào nút hiển thị quyền của mình (Nhân viên, Quản trị viên) trên giao diện.
    -   **Bước 2**: Người dùng nhấp vào nút "Đăng xuất" trên giao diện.
    -   **Bước 3**: Hệ thống chuyển hướng trình duyệt đến trang đăng nhập.
-   **Alternative Flow**:
    -   Không có
-   **Post-condition**:
    -   Tất cả dữ liệu phiên đăng nhập của người dùng đã được xóa khỏi trình duyệt.
    -   Người dùng được chuyển hướng thành công đến trang đăng nhập.
-   **Exceptions**:
    -   **Lỗi đăng xuất**: Nếu có lỗi xảy ra trong quá trình xóa dữ liệu đăng nhập, hệ thống sẽ thông báo lỗi và có thể yêu cầu người dùng thử lại.

---

## 3. UC3: Hiển thị và Quản lý Nguồn cấp Dữ liệu Video

-   **Mô tả**: Hệ thống hiển thị luồng video trực tiếp từ camera và cho phép người dùng tạm dừng hoặc tiếp tục luồng video.
-   **Actor chính**: Người dùng
-   **Mục tiêu**: Xem trực tiếp và kiểm soát trạng thái hiển thị luồng video từ camera.
-   **Pre-condition**: Người dùng đã đăng nhập và hệ thống đã kết nối được với camera.
-   **Main Flow**:
    -   **Bước 1**: Hệ thống hiển thị giao diện chính sau khi người dùng đăng nhập.
    -   **Bước 2**: Hệ thống tự động kết nối và hiển thị luồng video trực tiếp từ camera.
    -   **Bước 3**: Người dùng nhấp vào nút "Tạm Dừng".
    -   **Bước 4**: Hệ thống tạm dừng hiển thị luồng video.
    -   **Bước 5**: Nút "Tạm Dừng" chuyển thành "Tiếp Tục".
    -   **Bước 6**: Người dùng nhấp vào nút "Tiếp Tục".
    -   **Bước 7**: Hệ thống tiếp tục hiển thị luồng video.
    -   **Bước 8**: Nút "Tiếp Tục" chuyển lại thành "Tạm Dừng".
-   **Alternative Flow**:
    -   **Bước 2**: Mất kết nối camera trong khi hiển thị: Hệ thống hiển thị thông báo lỗi "Không thể kết nối đến máy chủ. Vui lòng kiểm tra xem backend có đang chạy không."
-   **Post-condition**:
    -   Luồng video từ camera được hiển thị trên giao diện người dùng.
    -   Người dùng có thể tạm dừng hoặc tiếp tục luồng video theo ý muốn.
-   **Exceptions**:
    -   **Không kết nối được Camera**: Nếu không kết nối được với camera, luồng video sẽ không hiển thị và có thể có thông báo lỗi.

---

## 4. UC4: Hiển thị Dữ liệu Phân tích Khách hàng Thời gian Thực

-   **Mô tả**: Hệ thống định kỳ truy xuất và cập nhật dữ liệu phân tích khách hàng mới nhất lên giao diện.
-   **Actor chính**: Người dùng
-   **Mục tiêu**: Quan sát đặc điểm khách hàng hiện tại dựa trên hình ảnh từ camera.
-   **Pre-condition**:
    -   Người dùng đã đăng nhập.
    -   Thiết bị đã kết nối camera và có quyền truy cập.
-   **Main Flow**:
    -   **Bước 1**: Người dùng mở camera phân tích.
    -   **Bước 2**: Hệ thống bật camera và bắt đầu ghi nhận hình ảnh đầu vào.
    -   **Bước 3**: Hệ thống thực hiện phân tích hình ảnh theo thời gian thực:
        -   Phát hiện khuôn mặt.
        -   Xác định giới tính và độ tuổi.
        -   Cập nhật số lượng người phát hiện được.
        -   Tính toán phân bố giới tính, độ tuổi.
        -   Cập nhật giao diện hiển thị theo thời gian thực.
    -   **Bước 4**: Người dùng theo dõi số liệu được cập nhật tự động trên giao diện.
-   **Alternative Flow**:
    -   **Bước 3**: Không lấy được dữ liệu mới: Nếu có lỗi khi lấy dữ liệu từ Backend, các số liệu trên giao diện sẽ không được cập nhật trong chu kỳ đó.
-   **Post-condition**:
    -   Các chỉ số tổng số người, giới tính và phân bố độ tuổi khách hàng được hiển thị cập nhật trên giao diện người dùng.
-   **Exceptions**:
    -   **Backend không phản hồi**: Hệ thống không thể lấy dữ liệu phân tích từ Backend, khiến dữ liệu trên giao diện không được cập nhật.

---

## 5. UC5: Đưa ra Khuyến nghị Phân bổ Nhân viên

-   **Mô tả**: Hệ thống tự động tạo và hiển thị đề xuất điều chỉnh số lượng và cơ cấu nhân sự dựa trên dữ liệu khách hàng.
-   **Actor chính**: Người dùng
-   **Mục tiêu**: Cung cấp thông tin chi tiết, kịp thời hỗ trợ quản lý phân bổ nhân viên tối ưu.
-   **Pre-condition**:
    -   UC5 đang hoạt động và đã có dữ liệu phân tích khách hàng.
-   **Main Flow**:
    -   **Bước 1**: Người dùng theo dõi Dashboard camera.
    -   **Bước 2**: Khi có đủ dữ liệu khách hàng (số lượng, giới tính, độ tuổi), hệ thống tự động phân tích.
    -   **Bước 3**: Người dùng sử dụng thông tin để đưa ra khuyến nghị.
-   **Alternative Flow**:
    -   **Bước 3**: Không có khách hàng nào: Hệ thống không hiển thị khuyến nghị, thông báo "Đang phân tích để đưa ra khuyến nghị phân bổ nhân viên..".
-   **Post-condition**:
    -   Các khuyến nghị về phân bổ nhân viên dựa trên dữ liệu khách hàng được hiển thị rõ ràng trên giao diện.
-   **Exceptions**:
    -   **Dữ liệu thiếu/không hợp lệ**: Nếu dữ liệu phân tích khách hàng không đầy đủ, các khuyến nghị có thể không chính xác hoặc không được tạo ra.

---

## 6. UC6: Tạo Sự kiện Mới

-   **Mô tả**: Admin nhập thông tin chi tiết để tạo một sự kiện mới trong hệ thống.
-   **Actor chính**: Admin
-   **Mục tiêu**: Thêm sự kiện mới vào cơ sở dữ liệu để theo dõi và phân tích.
-   **Pre-condition**:
    -   Admin đã truy cập trang quản trị.
    -   Giao diện sự kiện đã được hiển thị.
-   **Main Flow**:
    -   **Bước 1**: Admin nhấp vào nút "Tạo Sự kiện Mới" trên trang quản lý sự kiện.
    -   **Bước 2**: Hệ thống hiển thị biểu mẫu nhập thông tin sự kiện.
    -   **Bước 3**: Admin nhập các thông tin cần thiết vào biểu mẫu.
    -   **Bước 4**: Admin nhấp vào nút "Lưu".
    -   **Bước 5**: Hệ thống gửi thông tin sự kiện đến Backend để xử lý.
    -   **Bước 6**: Hệ thống lưu sự kiện và hiển thị thông báo thành công trên giao diện.
-   **Alternative Flow**:
    -   **Bước 4**: Thông tin không hợp lệ: Nếu thông tin nhập không đầy đủ, hệ thống hiển thị thông báo lỗi. Admin quay lại bước 3 để chỉnh sửa thông tin.
    -   **Bước 5**: Hủy tạo sự kiện: Admin nhấp "Hủy" hoặc đóng biểu mẫu. Hệ thống đóng biểu mẫu và không lưu sự kiện.
-   **Post-condition**:
    -   Sự kiện mới được tạo và lưu trong hệ thống.
    -   Admin nhận được xác nhận tạo sự kiện thành công.
-   **Exceptions**:
    -   **Lỗi kết nối Backend**: Không thể gửi thông tin sự kiện đến Backend.
    -   **Lỗi lưu trữ Backend**: Backend không lưu được sự kiện do lỗi cơ sở dữ liệu.
    -   **Xung đột dữ liệu**: Tên sự kiện trùng hoặc có xung đột khác.

---

## 7. UC7: Chỉnh sửa Thông tin Sự kiện

-   **Mô tả**: Admin cập nhật thông tin một sự kiện đã có trong hệ thống.
-   **Actor chính**: Admin
-   **Mục tiêu**: Cập nhật thông tin sự kiện để đảm bảo chính xác và phù hợp.
-   **Pre-condition**:
    -   Admin đã truy cập trang quản trị.
    -   Giao diện sự kiện hiển thị.
    -   Sự kiện cần chỉnh sửa tồn tại trong danh sách.
-   **Main Flow**:
    -   **Bước 1**: Admin nhấp vào biểu tượng bút chì bên cạnh sự kiện cần chỉnh sửa.
    -   **Bước 2**: Hệ thống hiển thị biểu mẫu chỉnh sửa với dữ liệu hiện tại của sự kiện.
    -   **Bước 3**: Admin thay đổi các thông tin cần thiết.
    -   **Bước 4**: Admin nhấp vào nút "Lưu thay đổi" hoặc "Cập nhật".
    -   **Bước 5**: Hệ thống gửi thông tin chỉnh sửa đến Backend.
    -   **Bước 6**: Hệ thống hiển thị thông báo thành công trên giao diện.
-   **Alternative Flow**:
    -   **Bước 1**: Lỗi kết nối: Hệ thống hiển thị lỗi "Error: Lỗi kết nối với server khi lấy chi tiết sự kiện".
    -   **Bước 5**: Không đầy đủ thông tin: Hệ thống hiển thị lỗi và yêu cầu Admin cập nhật thông tin đầy đủ.
    -   **Bước 5**: Hủy chỉnh sửa: Admin nhấp "Hủy" hoặc đóng biểu mẫu. Hệ thống đóng biểu mẫu, không lưu thay đổi, giữ nguyên thông tin.
-   **Post-condition**:
    -   Thông tin sự kiện được cập nhật trong cơ sở dữ liệu.
    -   Admin nhận xác nhận cập nhật thành công.
-   **Exceptions**:
    -   **Lỗi kết nối Backend**: Không gửi được thông tin cập nhật đến Backend.
    -   **Lỗi lưu trữ Backend**: Backend không thể cập nhật sự kiện.
    -   **Không tìm thấy sự kiện**: Sự kiện bị xóa bởi Admin khác trong lúc chỉnh sửa.

---

## 8. UC8: Xóa Sự kiện

-   **Mô tả**: Admin loại bỏ sự kiện không cần thiết khỏi hệ thống.
-   **Actor chính**: Admin
-   **Mục tiêu**: Xóa sự kiện khỏi cơ sở dữ liệu và danh sách hiển thị.
-   **Pre-condition**:
    -   Admin đã truy cập trang quản trị.
    -   Giao diện sự kiện hiển thị.
    -   Sự kiện cần xóa tồn tại trong danh sách.
-   **Main Flow**:
    -   **Bước 1**: Admin tìm và chọn sự kiện trong danh sách.
    -   **Bước 2**: Admin nhấp vào biểu tượng thùng rác bên cạnh sự kiện đó.
    -   **Bước 3**: Hệ thống hiển thị hộp thoại xác nhận "Bạn có chắc muốn xóa sự kiện này?".
    -   **Bước 4**: Admin nhấp vào nút "Xác nhận Xóa".
    -   **Bước 5**: Hệ thống gửi yêu cầu xóa sự kiện đến Backend.
    -   **Bước 6**: Hệ thống hiển thị thông báo "Xóa sự kiện thành công" trên giao diện.
-   **Alternative Flow**:
    -   **Bước 4**: Hủy xóa: Admin nhấp "Hủy" trong hộp thoại xác nhận. Hệ thống đóng hộp thoại và không xóa sự kiện.
-   **Post-condition**:
    -   Sự kiện được xóa khỏi cơ sở dữ liệu.
    -   Admin nhận được xác nhận xóa thành công.
-   **Exceptions**:
    -   **Lỗi kết nối Backend**: Không gửi yêu cầu xóa đến Backend.
    -   **Lỗi xóa dữ liệu Backend**: Backend không thể xóa sự kiện.
    -   **Không tìm thấy sự kiện**: Sự kiện đã bị xóa bởi Admin khác trước đó.

---

## 9. UC9: Thêm nhân viên mới

-   **Mô tả**: Người dùng thêm nhân viên mới vào hệ thống.
-   **Actor chính**: Quản trị viên
-   **Mục tiêu**: Thêm nhân viên mới với đầy đủ thông tin vào hệ thống quản lý nhân sự.
-   **Pre-condition**:
    -   Admin đã truy cập trang quản trị.
    -   Giao diện Quản Lý Nhân Viên hiển thị.
-   **Main Flow**:
    -   **Bước 1**: Admin nhấn vào nút Thêm Nhân Viên trên giao diện. 
    -   **Bước 2**: Hệ thống hiển thị biểu mẫu nhập thông tin nhân viên.
    -   **Bước 3**: Người dùng nhập thông tin nhân viên mới:
        -   Tên nhân viên.
        -   Tuổi.
        -   Giới tính .
        -   Mức độ kinh nghiệm.
    -   **Bước 4**: Người dùng nhấn nút "Thêm nhân viên".
    -   **Bước 5**: Hệ thống kiểm tra dữ liệu nhập liệu..
    -   **Bước 6**: Hệ thống kiểm tra hoàn tất và thông báo thành công.
-   **Alternative Flow**:
    -   **Bước 4**: Người dùng nhấn nút Hủy trong form sửa.
        -   Hệ thống đóng form.
        -   Không lưu thông tin nhân viên.
    -   **Bước 5**: Thông tin chưa đầy đủ: Hiển thị cảnh báo yêu cầu điền đủ thông tin.
-   **Post-condition**:
    -   Nhân viên mới được thêm vào hệ thống (nếu thành công).
    -   Giao diện danh sách nhân viên được cập nhật.
-   **Exceptions**:
    -   **Lỗi kết nối Backend**: Không thể gửi thông tin nhân viên đến Backend.
    -   **Lỗi lưu trữ Backend**: Backend không lưu được thông tin nhân viên do lỗi cơ sở dữ liệu.
    -   **Xung đột dữ liệu**: Tên nhân viên trùng hoặc có xung đột khác.

---

## 10. UC10: Sửa thông tin nhân viên

-   **Mô tả**: Người dùng chỉnh sửa thông tin của nhân viên đã có trong hệ thống.
-   **Actor chính**: Quản trị viên
-   **Mục tiêu**: Cập nhật chính xác thông tin nhân viên trong hệ thống quản lý nhân sự.
-   **Pre-condition**:
    -   Admin đã truy cập trang quản trị.
    -   Giao diện Quản Lý Nhân Viên hiển thị.
    -   Danh sách nhân viên đã tải sẵn.
-   **Main Flow**:
    -   **Bước 1**: Admin chọn nhân viên cần sửa trong danh sách.
    -   **Bước 2**: Admin nhấn biểu tượng bút chì bên cạnh thông tin nhân viên.
    -   **Bước 3**: Hệ thống hiển thị form chỉnh sửa với thông tin nhân viên đã có.
    -   **Bước 4**: Người dùng chỉnh sửa các trường thông tin:
        -   Tên nhân viên.
        -   Tuổi.
        -   Giới tính.
        -   Mức độ kinh nghiệm.
    -   **Bước 5**: Người dùng nhấn nút "Lưu thay đổi".
    -   **Bước 6**: Hệ thống kiểm tra dữ liệu nhập liệu.
    -   **Bước 7**: Hệ thống kiểm tra hoàn tất và thông báo thành công.
-   **Alternative Flow**:
    -   **Bước 4**: Người dùng nhấn nút Hủy trong form sửa.
            -   Hệ thống đóng form chỉnh sửa.
            -   Không lưu bất kỳ thay đổi nào.
    -   **Bước 5**: Thông tin chưa đầy đủ: Hiển thị cảnh báo yêu cầu điền đủ thông tin.
-   **Post-condition**:
    -   Thông tin nhân viên được cập nhật trong hệ thống .
    -   Giao diện danh sách nhân viên phản ánh đúng thông tin mới.
-   **Exceptions**:
    -   **Lỗi kết nối Backend**: Không thể gửi thông tin cập nhật đến Backend.
    -   **Lỗi lưu trữ Backend**: Backend không cập nhật được thông tin nhân viên do lỗi cơ sở dữ liệu.
    -   **Xung đột dữ liệu**: Thông tin cập nhật gây trùng lặp hoặc xung đột.

---

## 11. UC11: Xóa nhân viên

-   **Mô tả**: Người dùng xóa nhân viên khỏi hệ thống quản lý nhân sự.
-   **Actor chính**: Quản trị viên
-   **Mục tiêu**: Xóa nhân viên không còn làm việc hoặc không cần quản lý nữa khỏi hệ thống.
-   **Pre-condition**:
    -   Admin đã truy cập trang quản trị.
    -   Giao diện Quản Lý Nhân Viên hiển thị.
    -   Danh sách nhân viên đã tải sẵn.
-   **Main Flow**:
    -   **Bước 1**: Admin chọn nhân viên cần xóa trong danh sách.
    -   **Bước 2**: Admin nhấn biểu tượng thùng rác bên cạnh thông tin nhân viên.
    -   **Bước 3**: Hệ thống hiển thị hộp thoại xác nhận việc xóa.
    -   **Bước 4**: Admin xác nhận xóa.
    -   **Bước 5**: Hệ thống gửi yêu cầu xóa nhân viên.
    -   **Bước 6**: Hệ thống xử lý và trả về kết quả thành công.
-   **Alternative Flow**:
    -   **Bước 4**: Admin hủy thao tác xóa, hệ thống không thay đổi gì.
-   **Post-condition**:
    -   Nhân viên được xóa khỏi hệ thống (nếu thành công).
    -   Giao diện danh sách nhân viên cập nhật không còn nhân viên đã xóa.
-   **Exceptions**:
    -   **Lỗi kết nối Backend**: Không thể gửi yêu cầu xóa đến Backend.
    -   **Lỗi lưu trữ Backend**: Backend không xóa được do lỗi cơ sở dữ liệu hoặc nhân viên không tồn tại.
    -   **Ràng buộc dữ liệu**: Nhân viên không thể xóa nếu liên quan đến dữ liệu hoặc công việc chưa hoàn thành.

---

## 12. UC12: Cài đặt hệ thống với camera

-   **Mô tả**: Người dùng cấu hình và thiết lập các thông số cho hệ thống camera giám sát trong ứng dụng quản lý.
-   **Actor chính**: Quản trị viên
-   **Mục tiêu**: Cài đặt cấu hình camera đúng để hệ thống hoạt động ổn định và chính xác.
-   **Pre-condition**:
    -   Admin đã đăng nhập và truy cập vào giao diện cài đặt hệ thống.
    -   Giao diện Cài Đặt Camera hiển thị.
-   **Main Flow**:
    -   **Bước 2**: Hệ thống tải và hiển thị các thông số cấu hình camera hiện tại (ví dụ: loại camera, địa chỉ URL nguồn, độ phân giải, chế độ RTSP, v.v).
    -   **Bước 3**: Admin thay đổi các thông số cần thiết:
        -   Chọn loại nguồn camera.
        -   Nếu chọn RTSP, nhập URL RTSP vào trường tương ứng.
        -   Thiết lập các thông số  độ phân giải.
    -   **Bước 4**: Admin nhấn nút "Lưu cài đặt".
    -   **Bước 5**: Hệ thống gửi yêu cầu lưu cấu hình lên server.
    -   **Bước 6**: Server xử lý và trả về kết quả lưu thành công hoặc lỗi.
    -   **Bước 7**: Nếu thành công, hệ thống thông báo cấu hình đã được lưu và áp dụng.
-   **Alternative Flow**:
    -   **Bước 3**: Admin không nhập đầy đủ thông tin cần thiết (ví dụ URL RTSP khi chọn nguồn RTSP). Hệ thống hiển thị cảnh báo yêu cầu nhập đủ thông tin.
    -   **Bước 4**: Admin rời khỏi trang cài đặt mà không lưu thay đổi. Hệ thống bỏ qua các thay đổi vừa nhập.
-   **Post-condition**:
    -   Cấu hình camera được cập nhật và lưu trên hệ thống (nếu thành công).
    -   Camera sẽ hoạt động theo cấu hình mới.
-   **Exceptions**:
    -   **Lỗi kết nối Backend**: Không thể gửi dữ liệu cài đặt đến server.
    -   **Lỗi lưu trữ Backend**: Server không lưu được cấu hình do lỗi hệ thống.
    -   **Lỗi cấu hình không hợp lệ**: Thông số nhập vào không đúng định dạng hoặc không hợp lệ (ví dụ URL RTSP sai).

---

## 13. UC13: Lưu cài đặt hệ thống

-   **Mô tả**: Người dùng lưu các thay đổi trong cài đặt hệ thống như bật/tắt khởi động lại tự động, bật/tắt thông báo, thiết lập thời gian lưu trữ dữ liệu.
-   **Actor chính**: Quản trị viên
-   **Mục tiêu**: Lưu các cấu hình hệ thống nhằm đảm bảo hoạt động theo ý muốn.
-   **Pre-condition**:
    -   Admin đã truy cập giao diện cài đặt hệ thống.
    -   Các thông số cài đặt hiện tại được hiển thị đầy đủ.
-   **Main Flow**:
    -   **Bước 1**: Admin điều chỉnh các thiết lập hệ thống như bật/tắt khởi động lại tự động, bật/tắt thông báo, thay đổi số ngày lưu trữ dữ liệu.
    -   **Bước 2**: Admin nhấn nút "Lưu cài đặt".
    -   **Bước 3**: Hệ thống hiển thị trạng thái đang lưu và vô hiệu hóa nút để tránh thao tác trùng.
    -   **Bước 4**: Hệ thống gửi dữ liệu cài đặt và xử lý.
    -   **Bước 5**: Hệ thống trả về kết quả và hiển thị thông báo lưu thành công.
-   **Alternative Flow**:
    -   **Bước 5a**: Nếu server trả về lỗi, hệ thống hiển thị thông báo lỗi chi tiết cho người dùng.
-   **Post-condition**:
    -   Cài đặt hệ thống được lưu và áp dụng.
-   **Exceptions**:
    -   **Lỗi kết nối đến server**: Không thể gửi dữ liệu cài đặt đến server.
    -   **Lỗi lưu dữ liệu do backend hoặc cơ sở dữ liệu**.

---

## 14. UC14: Khôi phục cài đặt mặc định hệ thống

-   **Mô tả**: Người dùng khôi phục các thiết lập hệ thống về trạng thái mặc định ban đầu.
-   **Actor chính**: Quản trị viên
-   **Mục tiêu**: Đặt lại các thiết lập hệ thống về mặc định để khắc phục lỗi hoặc thiết lập lại trạng thái chuẩn.
-   **Pre-condition**:
    -   Admin đã truy cập giao diện cài đặt hệ thống.
-   **Main Flow**:
    -   **Bước 1**: Admin nhấn nút "Khôi phục cài đặt mặc định".
    -   **Bước 2**: Hệ thống hiển thị hộp thoại xác nhận hành động.
    -   **Bước 3**: Admin xác nhận muốn khôi phục cài đặt mặc định.
    -   **Bước 4**: Hệ thống hiển thị trạng thái đang khôi phục và vô hiệu hóa nút thao tác.
    -   **Bước 5**: Hệ thống gửi yêu cầu khôi phục cài đặt mặc định.
    -   **Bước 6**: Hệ thống hiển thị thông báo khôi phục hoàn tất 
    -   **Bước 7**: Giao diện tự động tải lại các cài đặt mặc định và áp dụng.
-   **Alternative Flow**:
    -   **Bước 3a**: Admin hủy xác nhận, hệ thống không thực hiện hành động khôi phục.
-   **Post-condition**:
    -   Hệ thống được đặt lại về cấu hình mặc định.
-   **Exceptions**:
    -   **Lỗi kết nối đến server**.
    -   **Lỗi không thể khôi phục do backend**.
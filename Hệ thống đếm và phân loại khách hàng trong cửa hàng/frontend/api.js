// API Service for communicating with backend

class ApiService {
    constructor() {
        this.baseUrl = 'http://localhost:5000';
        this.token = localStorage.getItem('adminToken');
    }

    // Helper method để tạo headers với token
    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': this.token ? `Bearer ${this.token}` : ''
        };
    }

    // Đăng nhập
    async login(username, password) {
        try {
            const response = await fetch(`${this.baseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            
            if (data.token) {
                // Lưu token vào localStorage và cập nhật token trong instance
                localStorage.setItem('adminToken', data.token);
                localStorage.setItem('adminUsername', data.user.username);
                this.token = data.token;
                return { success: true, user: data.user, message: data.message };
            } else {
                return { success: false, message: data.message || 'Đăng nhập thất bại' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Lỗi kết nối với server' };
        }
    }

    // Đăng ký
    async register(userData) {
        try {
            const response = await fetch(`${this.baseUrl}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();
            return { 
                success: response.ok, 
                message: data.message 
            };
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, message: 'Lỗi kết nối với server' };
        }
    }

    // Đăng xuất
    logout() {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUsername');
        this.token = null;
    }

    // Thay đổi mật khẩu
    async changePassword(currentPassword, newPassword) {
        try {
            const response = await fetch(`${this.baseUrl}/auth/change-password`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword
                })
            });

            const data = await response.json();
            return { 
                success: response.ok, 
                message: data.message 
            };
        } catch (error) {
            console.error('Change password error:', error);
            return { success: false, message: 'Lỗi kết nối với server' };
        }
    }
    async getStaff() {
        try {
            const response = await fetch(`${this.baseUrl}/staff`, { // Đặt tên API endpoint phù hợp
                method: 'GET',
                headers: this.getHeaders() // Quan trọng để gửi token
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Lỗi không xác định từ server' }));
                return { success: false, message: errorData.message || `Lỗi ${response.status}`, data: [] };
            }
            const data = await response.json();
            return { success: true, data: data };
        } catch (error) {
            console.error('Get Staff error:', error);
            return { success: false, message: 'Lỗi kết nối khi lấy danh sách nhân viên', data: [] };
        }
    }

    async addStaff(staffData) {
        try {
            const response = await fetch(`${this.baseUrl}/staff`, { // Đặt tên API endpoint phù hợp
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(staffData)
            });
            const data = await response.json();
            return { success: response.ok, message: data.message, data: data.staff }; // Giả sử backend trả về staff đã tạo
        } catch (error) {
            console.error('Add Staff error:', error);
            return { success: false, message: 'Lỗi kết nối khi thêm nhân viên' };
        }
    }

    async deleteStaff(staffId) {
        try {
            const response = await fetch(`${this.baseUrl}/staff/${staffId}`, { // Đặt tên API endpoint phù hợp
                method: 'DELETE',
                headers: this.getHeaders()
            });
            const data = await response.json();
            return { success: response.ok, message: data.message };
        } catch (error) {
            console.error('Delete Staff error:', error);
            return { success: false, message: 'Lỗi kết nối khi xóa nhân viên' };
        }
    }

    async getActivityLog(page = 1, searchTerm = '', filters = {}) {
        try {
            const params = new URLSearchParams();
            params.append('page', page);
            if (searchTerm) params.append('search', searchTerm);
            // Thêm filters vào params nếu có

            const response = await fetch(`${this.baseUrl}/admin/activity-log?${params.toString()}`, { // Đặt tên API endpoint phù hợp
                method: 'GET',
                headers: this.getHeaders()
            });
             if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Lỗi không xác định từ server' }));
                return { success: false, message: errorData.message || `Lỗi ${response.status}`, data: [], paginationInfo: {} };
            }
            const data = await response.json();
            // Giả sử API trả về { success: true, data: [...logs], paginationInfo: {...} }
            return { success: true, ...data };
        } catch (error) {
            console.error('Get activity log error:', error);
            return { success: false, message: 'Lỗi kết nối khi lấy lịch sử hoạt động', data: [], paginationInfo: {} };
        }
    }

    // Bạn cũng sẽ cần getAnalytics nếu admin.js gọi nó, mặc dù HTML không có chỗ hiển thị
    async getAnalytics(days = 7) {
        try {
            // Tạm thời trả về rỗng để không lỗi, nếu admin.html không dùng
            console.warn("apiService.getAnalytics được gọi, nhưng admin.html có thể không có chỗ hiển thị.");
            // Nếu cần, hãy fetch từ `${this.baseUrl}/historical_data?days=${days}`
            // const response = await fetch(`${this.baseUrl}/historical_data?days=${days}`, { headers: this.getHeaders() });
            // if (!response.ok) throw new Error('Failed to fetch analytics');
            // const data = await response.json();
            // return { success: true, data: data };
            return { success: true, data: [] }; // Trả về mảng rỗng để không lỗi chart
        } catch (error) {
            console.error('Get Analytics error:', error);
            return { success: false, message: 'Lỗi tải dữ liệu phân tích', data: [] };
        }
    }
    // API khác có thể thêm sau...
}

// Export instance
const apiService = new ApiService();

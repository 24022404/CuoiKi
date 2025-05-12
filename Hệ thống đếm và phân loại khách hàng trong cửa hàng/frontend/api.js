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

    // API khác có thể thêm sau...
}

// Export instance
const apiService = new ApiService();

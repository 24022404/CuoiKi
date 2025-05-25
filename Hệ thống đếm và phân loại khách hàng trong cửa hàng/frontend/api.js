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

    // Đăng nhập bằng mã truy cập
    async login(accessCode) {
        try {
            console.log(`Attempting login with access code: ${accessCode}`);
            
            // Validate access code format before sending
            if (!accessCode || accessCode.trim() === '') {
                return { success: false, message: 'Mã truy cập không được để trống' };
            }
            
            // Try to login with retries on network errors
            const maxRetries = 2;
            let lastError = null;
            
            for (let attempt = 0; attempt <= maxRetries; attempt++) {
                try {
                    const response = await fetch(`${this.baseUrl}/auth/login`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ access_code: accessCode.trim() })
                    });
                    
                    // Handle HTTP status errors
                    if (!response.ok) {
                        console.error(`Server returned status ${response.status}: ${response.statusText}`);
                        const errorBody = await response.text();
                        console.error(`Response body: ${errorBody}`);
                        throw new Error(`HTTP error: ${response.status}`);
                    }

                    const data = await response.json();
                    console.log("Login response:", data);

                    if (data.token) {
                        // Clear any existing tokens with better error handling
                        try {
                            localStorage.removeItem('adminToken');
                            localStorage.removeItem('adminUsername');
                            localStorage.removeItem('userRole');
                            console.log("Cleared existing tokens");
                        } catch (e) {
                            console.error("Error clearing tokens:", e);
                        }
                        
                        // Wait longer to ensure localStorage is clear
                        await new Promise(resolve => setTimeout(resolve, 300));
                        
                        // Set tokens with verification step
                        const setTokenWithVerification = async (key, value) => {
                            // Try to set token up to 3 times
                            for (let attempt = 0; attempt < 3; attempt++) {
                                try {
                                    localStorage.setItem(key, value);
                                    // Verify token was set correctly
                                    const storedValue = localStorage.getItem(key);
                                    if (storedValue === value) {
                                        console.log(`Token ${key} set and verified successfully`);
                                        return true;
                                    } else {
                                        console.warn(`Token ${key} verification failed on attempt ${attempt+1}, retrying...`);
                                        await new Promise(resolve => setTimeout(resolve, 100));
                                    }
                                } catch (e) {
                                    console.error(`Error setting ${key}:`, e);
                                    await new Promise(resolve => setTimeout(resolve, 100));
                                }
                            }
                            return false;
                        };
                        
                        // Set tokens with verification
                        const tokenSet = await setTokenWithVerification('adminToken', data.token);
                        const usernameSet = await setTokenWithVerification('adminUsername', data.user.username);
                        const roleSet = await setTokenWithVerification('userRole', data.user.role);
                        
                        if (tokenSet && usernameSet && roleSet) {
                            this.token = data.token;
                            console.log("Login successful, all localStorage items set and verified");
                        } else {
                            console.error("Failed to set some localStorage items");
                            // Try one more comprehensive attempt with session storage fallback
                            await new Promise(resolve => setTimeout(resolve, 500));
                            try {
                                localStorage.setItem('adminToken', data.token);
                                localStorage.setItem('adminUsername', data.user.username);
                                localStorage.setItem('userRole', data.user.role);
                                this.token = data.token;
                            } catch (storageError) {
                                // Fallback to cookies if localStorage fails
                                console.error("localStorage failed, using cookies as fallback", storageError);
                                document.cookie = `adminToken=${data.token};path=/;max-age=86400`;
                                document.cookie = `adminUsername=${data.user.username};path=/;max-age=86400`;
                                document.cookie = `userRole=${data.user.role};path=/;max-age=86400`;
                                this.token = data.token;
                            }
                        }
                        
                        console.log("Login status after setting tokens:", {
                            token: localStorage.getItem('adminToken') ? "Set" : "Not set",
                            username: localStorage.getItem('adminUsername'),
                            role: localStorage.getItem('userRole')
                        });
                        
                        return { success: true, user: data.user, message: data.message };
                    } else {
                        console.error("Login failed:", data.message);
                        return { success: false, message: data.message || 'Mã truy cập không hợp lệ' };
                    }
                } catch (error) {
                    lastError = error;
                    console.error(`Login attempt ${attempt+1}/${maxRetries+1} failed:`, error);
                    
                    if (attempt < maxRetries) {
                        // Wait before retry (exponential backoff)
                        const delay = Math.pow(2, attempt) * 500;
                        console.log(`Retrying in ${delay}ms...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }
            
            // If we get here, all retries failed
            console.error('All login attempts failed. Last error:', lastError);
            return { 
                success: false, 
                message: 'Không thể kết nối với máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.' 
            };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại.' };
        }
    }

    // Improved logout function with verification
    logout() {
        try {
            // Clear tokens with verification
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUsername');
            localStorage.removeItem('userRole');
            
            // Verify tokens were cleared
            const tokenCleared = !localStorage.getItem('adminToken');
            const usernameCleared = !localStorage.getItem('adminUsername');
            const roleCleared = !localStorage.getItem('userRole');
            
            if (tokenCleared && usernameCleared && roleCleared) {
                console.log("Logout successful, all localStorage items cleared");
            } else {
                console.error("Failed to clear some localStorage items");
                // Force clear again
                localStorage.clear();
            }
            
            this.token = null;
        } catch (e) {
            console.error("Error during logout:", e);
            // As a last resort, try to clear everything
            try {
                localStorage.clear();
                this.token = null;
            } catch (finalError) {
                console.error("Final error clearing localStorage:", finalError);
            }
        }
    }

    // Kiểm tra quyền người dùng
    isAdmin() {
        return localStorage.getItem('userRole') === 'admin';
    }

    // Kiểm tra người dùng đã đăng nhập
    isLoggedIn() {
        return !!this.token;
    }

    // Remove unused function - Just return not supported
    async changePassword(currentPassword, newPassword) {
        return { success: false, message: 'Chức năng này không được hỗ trợ' };
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

    // Thêm nhân viên
    async addStaff(staffData) {
        try {
            const response = await fetch(`${this.baseUrl}/api/employees`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(staffData)
            });

            if (!response.ok) {
                let errorMessage = `Lỗi máy chủ: ${response.status}`;
                try {
                    // Try to get a more specific message from the server response
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    // If parsing error JSON fails, use status text or the generic message
                    errorMessage = response.statusText || errorMessage;
                    console.warn("Could not parse error response as JSON for addStaff.");
                }
                console.error('Add staff API error response:', errorMessage);
                return { success: false, message: errorMessage };
            }

            const data = await response.json(); // Safe to parse JSON now
            return { 
                success: true, 
                message: data.message || 'Thêm nhân viên thành công', 
                data: data // Include returned data if backend sends it
            };
        } catch (error) { // Catches network errors or other unexpected errors during fetch
            console.error('Add staff network/fetch error:', error);
            return { success: false, message: 'Lỗi kết nối với server khi thêm nhân viên. Vui lòng kiểm tra kết nối mạng.' };
        }
    }

    // Add new method for updating staff
    async updateStaff(staffId, staffData) {
        try {
            const response = await fetch(`${this.baseUrl}/api/employees/${staffId}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(staffData)
            });

            const data = await response.json();
            return { success: response.ok, message: data.message || 'Cập nhật nhân viên thành công' };
        } catch (error) {
            console.error('Update staff error:', error);
            return { success: false, message: 'Lỗi kết nối với server khi cập nhật nhân viên' };
        }
    }

    // Lấy dữ liệu phân tích
    async getAnalytics(days) {
        try {
            const response = await fetch(`${this.baseUrl}/historical_data?days=${days}`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Error fetching analytics:', errorData);
                return { success: false, message: errorData.message || 'Lỗi khi lấy dữ liệu phân tích' };
            }

            const result = await response.json();
            return { success: result.success, data: result.data }; 

        } catch (error) {
            console.error('Error fetching analytics:', error);
            return { success: false, message: 'Lỗi kết nối với server khi lấy dữ liệu phân tích' };
        }
    }

    // Lấy dữ liệu nhân viên
    async getStaff() {
        try {
            // Try the employees endpoint first (which is more reliable for staff data)
            const response = await fetch(`${this.baseUrl}/api/employees`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                return { success: true, data: data };
            }
            
            // Fallback to users endpoint if employees fails
            const usersResponse = await fetch(`${this.baseUrl}/auth/users`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!usersResponse.ok) {
                const errorData = await usersResponse.json();
                console.error('Error fetching staff data:', errorData);
                return { success: false, message: errorData.message || 'Lỗi khi lấy dữ liệu nhân viên' };
            }

            const userData = await usersResponse.json();
            return { success: true, data: userData };
        } catch (error) {
            console.error('Error fetching staff data:', error);
            return { success: false, message: 'Lỗi kết nối với server khi lấy dữ liệu nhân viên' };
        }
    }

    // Xóa nhân viên
    async deleteStaff(staffId) {
        try {
            const response = await fetch(`${this.baseUrl}/api/employees/${staffId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });

            const data = await response.json();
            return { success: response.ok, message: data.message || 'Xóa nhân viên thành công' };
        } catch (error) {
            console.error('Delete staff error:', error);
            return { success: false, message: 'Lỗi kết nối với server khi xóa nhân viên' };
        }
    }

    // Get all events
    async getEvents() {
        try {
            const response = await fetch(`${this.baseUrl}/api/events`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Error fetching events:', errorData);
                return { success: false, message: errorData.message || 'Lỗi khi lấy dữ liệu sự kiện' };
            }

            const events = await response.json();
            return { success: true, data: events };
        } catch (error) {
            console.error('Error fetching events:', error);
            return { success: false, message: 'Lỗi kết nối với server khi lấy dữ liệu sự kiện' };
        }
    }

    // Create new event
    async createEvent(eventData) {
        try {
            const response = await fetch(`${this.baseUrl}/api/events`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(eventData)
            });

            const data = await response.json();
            return { success: response.ok, message: data.message || 'Tạo sự kiện thành công', data: data };
        } catch (error) {
            console.error('Event creation error:', error);
            return { success: false, message: 'Lỗi kết nối với server' };
        }
    }

    // Delete event
    async deleteEvent(eventId) {
        try {
            const response = await fetch(`${this.baseUrl}/api/events/${eventId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });

            const data = await response.json();
            return { success: response.ok, message: data.message || 'Xóa sự kiện thành công' };
        } catch (error) {
            console.error('Delete event error:', error);
            return { success: false, message: 'Lỗi kết nối với server khi xóa sự kiện' };
        }
    }

    // Update event
    async updateEvent(eventId, eventData) {
        try {
            const response = await fetch(`${this.baseUrl}/api/events/${eventId}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(eventData)
            });

            const data = await response.json();
            return { success: response.ok, message: data.message || 'Cập nhật sự kiện thành công' };
        } catch (error) {
            console.error('Update event error:', error);
            return { success: false, message: 'Lỗi kết nối với server khi cập nhật sự kiện' };
        }
    }

    // Get event details
    async getEventDetails(eventId) {
        try {
            const response = await fetch(`${this.baseUrl}/api/events/${eventId}`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                const errorData = await response.json();
                return { success: false, message: errorData.message || 'Lỗi khi lấy chi tiết sự kiện' };
            }

            const data = await response.json();
            return { success: true, data: data };
        } catch (error) {
            console.error('Error fetching event details:', error);
            return { success: false, message: 'Lỗi kết nối với server khi lấy chi tiết sự kiện' };
        }
    }

    // Get settings by type
    async getSettings(settingsType) {
        try {
            const response = await fetch(`${this.baseUrl}/api/settings/${settingsType}`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                const errorData = await response.json();
                return { success: false, message: errorData.message || `Lỗi khi lấy cài đặt ${settingsType}` };
            }

            const data = await response.json();
            return { success: data.success, data: data.data };
        } catch (error) {
            console.error(`Error fetching ${settingsType} settings:`, error);
            return { success: false, message: `Lỗi kết nối với server khi lấy cài đặt ${settingsType}` };
        }
    }

    // Save settings
    async saveSettings(settingsType, settingsData) {
        try {
            const response = await fetch(`${this.baseUrl}/api/settings/${settingsType}`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(settingsData)
            });

            const data = await response.json();
            return { 
                success: response.ok, 
                message: data.message || `Đã lưu cài đặt ${settingsType} thành công` 
            };
        } catch (error) {
            console.error(`Error saving ${settingsType} settings:`, error);
            return { success: false, message: `Lỗi kết nối với server khi lưu cài đặt ${settingsType}` };
        }
    }

    // Reset settings
    async resetSettings(settingsType = null) {
        try {
            const response = await fetch(`${this.baseUrl}/api/settings/reset`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ type: settingsType })
            });

            const data = await response.json();
            return { 
                success: response.ok, 
                message: data.message || 'Đã khôi phục cài đặt mặc định thành công' 
            };
        } catch (error) {
            console.error('Error resetting settings:', error);
            return { success: false, message: 'Lỗi kết nối với server khi khôi phục cài đặt mặc định' };
        }
    }

    // Get system stats
    async getSystemStats() {
        try {
            const response = await fetch(`${this.baseUrl}/api/system/stats`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                const errorData = await response.json();
                return { success: false, message: errorData.message || 'Lỗi khi lấy thông tin hệ thống' };
            }

            const data = await response.json();
            return { success: data.success, data: data.data };
        } catch (error) {
            console.error('Error fetching system stats:', error);
            return { success: false, message: 'Lỗi kết nối với server khi lấy thông tin hệ thống' };
        }
    }

    // API khác có thể thêm sau...
}

// Export instance
const apiService = new ApiService();
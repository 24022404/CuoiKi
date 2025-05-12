document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    checkLoginStatus();
    
    // Khởi tạo các biểu đồ và dữ liệu
    initCharts();
    loadAnalyticsData();
    loadStaffData();
    
    // Xử lý đăng nhập
    document.getElementById('loginButton').addEventListener('click', async function() {
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        
        if (!username || !password) {
            showError('loginError', 'Vui lòng nhập đầy đủ thông tin đăng nhập.');
            return;
        }
        
        const response = await apiService.login(username, password);
        
        if (response.success) {
            // Đóng modal và cập nhật UI
            const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
            loginModal.hide();
            
            checkLoginStatus();
            loadAnalyticsData(); // Tải dữ liệu sau khi đăng nhập
            loadStaffData();     // Tải dữ liệu nhân viên
        } else {
            showError('loginError', response.message || 'Đăng nhập thất bại');
        }
    });
    
    // Xử lý đăng xuất
    document.getElementById('logoutButton').addEventListener('click', function() {
        apiService.logout();
        checkLoginStatus();
    });
    
    // Xử lý thêm nhân viên
    document.getElementById('submitAddStaff').addEventListener('click', async function() {
        const name = document.getElementById('staffName').value;
        const age = document.getElementById('staffAge').value;
        const gender = document.querySelector('input[name="staffGender"]:checked').value;
        const experience = document.getElementById('staffExperience').value;
        
        if (!name || !age || !gender || !experience) {
            alert('Vui lòng điền đầy đủ thông tin nhân viên');
            return;
        }
        
        const staffData = {
            name: name,
            age: parseInt(age),
            gender: gender,
            experience_level: experience
        };
        
        const response = await apiService.addStaff(staffData);
        
        if (response.success) {
            // Đóng modal và làm mới dữ liệu
            const modal = bootstrap.Modal.getInstance(document.getElementById('addStaffModal'));
            modal.hide();
            document.getElementById('addStaffForm').reset();
            loadStaffData(); // Tải lại danh sách nhân viên
        } else {
            alert('Lỗi: ' + (response.message || 'Không thể thêm nhân viên'));
        }
    });
});

// Kiểm tra trạng thái đăng nhập
function checkLoginStatus() {
    // Lấy token từ localStorage
    const token = localStorage.getItem('adminToken');
    
    if (token) {
        // Người dùng đã đăng nhập
        document.getElementById('adminContent').style.display = 'block';
        document.getElementById('loginRequiredMessage').style.display = 'none';
        document.querySelector('.user-menu').style.display = 'block';
        document.querySelector('.login-menu').style.display = 'none';
        
        // Đặt tên người dùng hiện tại
        const username = localStorage.getItem('adminUsername') || 'Nhân viên';
        document.getElementById('currentUsername').textContent = username;
    } else {
        // Người dùng chưa đăng nhập
        document.getElementById('adminContent').style.display = 'none';
        document.getElementById('loginRequiredMessage').style.display = 'block';
        document.querySelector('.user-menu').style.display = 'none';
        document.querySelector('.login-menu').style.display = 'block';
    }
}

// Khởi tạo các biểu đồ
function initCharts() {
    // Chart.js - Biểu đồ xu hướng khách hàng
    const trendsCtx = document.getElementById('customerTrendsChart').getContext('2d');
    window.customerTrendsChart = new Chart(trendsCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Tổng số khách',
                    data: [],
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    borderWidth: 2,
                    fill: true
                },
                {
                    label: 'Nam',
                    data: [],
                    borderColor: '#1976d2',
                    backgroundColor: 'transparent',
                    borderWidth: 2
                },
                {
                    label: 'Nữ',
                    data: [],
                    borderColor: '#d81b60',
                    backgroundColor: 'transparent',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
    
    // Chart.js - Biểu đồ phân bố giới tính
    const genderCtx = document.getElementById('genderPieChart').getContext('2d');
    window.genderPieChart = new Chart(genderCtx, {
        type: 'pie',
        data: {
            labels: ['Nam', 'Nữ'],
            datasets: [{
                data: [0, 0],
                backgroundColor: ['#1976d2', '#d81b60']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
    
    // Chart.js - Biểu đồ phân bố độ tuổi
    const ageCtx = document.getElementById('agePieChart').getContext('2d');
    window.agePieChart = new Chart(ageCtx, {
        type: 'pie',
        data: {
            labels: ['Trẻ (0-20)', 'Thanh niên (21-40)', 'Trung niên (41-60)', 'Cao tuổi (60+)'],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: ['#4caf50', '#ff9800', '#795548', '#607d8b']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Tải dữ liệu phân tích từ API
async function loadAnalyticsData(timeFrame = 'week') {
    let days = 7;
    if (timeFrame === 'day') days = 1;
    if (timeFrame === 'month') days = 30;
    
    const response = await apiService.getAnalytics(days);
    
    if (response.success) {
        updateChartsWithData(response.data, timeFrame);
        updateAnalyticsTable(response.data);
    } else {
        console.error('Failed to load analytics data');
    }
}

// Cập nhật biểu đồ với dữ liệu từ API
function updateChartsWithData(data, timeFrame) {
    if (!data || data.length === 0) return;
    
    // Xử lý dữ liệu cho biểu đồ xu hướng
    const labels = [];
    const totalCounts = [];
    const maleCounts = [];
    const femaleCounts = [];
    const youngCounts = [];
    const adultCounts = [];
    const middleAgedCounts = [];
    const elderlyCounts = [];
    
    // Tính tổng cho biểu đồ phân bố
    let totalMale = 0;
    let totalFemale = 0;
    let totalYoung = 0;
    let totalAdult = 0;
    let totalMiddleAged = 0;
    let totalElderly = 0;
    
    // Format date cho biểu đồ
    data.forEach(item => {
        let date = new Date(item.timestamp);
        let label = '';
        
        if (timeFrame === 'day') {
            label = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (timeFrame === 'week') {
            label = date.toLocaleDateString([], { weekday: 'short', month: 'numeric', day: 'numeric' });
        } else {
            label = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
        
        labels.push(label);
        totalCounts.push(item.total_count);
        maleCounts.push(item.male_count);
        femaleCounts.push(item.female_count);
        
        // Tính tổng cho biểu đồ phân bố
        totalMale += item.male_count;
        totalFemale += item.female_count;
        
        // Thêm dữ liệu độ tuổi
        const ageGroups = item.age_groups;
        youngCounts.push(ageGroups.young);
        adultCounts.push(ageGroups.adult);
        middleAgedCounts.push(ageGroups.middle_aged);
        elderlyCounts.push(ageGroups.elderly);
        
        totalYoung += ageGroups.young;
        totalAdult += ageGroups.adult; 
        totalMiddleAged += ageGroups.middle_aged;
        totalElderly += ageGroups.elderly;
    });
    
    // Cập nhật biểu đồ xu hướng
    window.customerTrendsChart.data.labels = labels;
    window.customerTrendsChart.data.datasets[0].data = totalCounts;
    window.customerTrendsChart.data.datasets[1].data = maleCounts;
    window.customerTrendsChart.data.datasets[2].data = femaleCounts;
    window.customerTrendsChart.update();
    
    // Cập nhật biểu đồ phân bố giới tính
    window.genderPieChart.data.datasets[0].data = [totalMale, totalFemale];
    window.genderPieChart.update();
    
    // Cập nhật biểu đồ phân bố độ tuổi
    window.agePieChart.data.datasets[0].data = [totalYoung, totalAdult, totalMiddleAged, totalElderly];
    window.agePieChart.update();
}

// Cập nhật bảng phân tích
function updateAnalyticsTable(data) {
    const tableBody = document.getElementById('analyticsTableBody');
    tableBody.innerHTML = '';
    
    if (!data || data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Không có dữ liệu</td></tr>';
        return;
    }
    
    // Sắp xếp dữ liệu theo thời gian (mới nhất trước)
    data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Hiển thị 10 mục gần nhất
    data.slice(0, 10).forEach(item => {
        const date = new Date(item.timestamp);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const ageGroups = item.age_groups;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${item.total_count}</td>
            <td>${item.male_count}</td>
            <td>${item.female_count}</td>
            <td>${ageGroups.young}</td>
            <td>${ageGroups.adult}</td>
            <td>${ageGroups.middle_aged}</td>
            <td>${ageGroups.elderly}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Tải dữ liệu nhân viên từ API
async function loadStaffData() {
    const response = await apiService.getStaff();
    
    if (response.success) {
        updateStaffTable(response.data);
        generateStaffRecommendations(response.data);
    } else {
        console.error('Failed to load staff data');
    }
}

// Cập nhật bảng nhân viên
function updateStaffTable(staffData) {
    const tableBody = document.getElementById('staffTableBody');
    tableBody.innerHTML = '';
    
    if (!staffData || staffData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Không có nhân viên nào</td></tr>';
        return;
    }
    
    staffData.forEach(staff => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${staff.id}</td>
            <td>${staff.name}</td>
            <td>${staff.age}</td>
            <td>${staff.gender === 'male' ? 'Nam' : 'Nữ'}</td>
            <td>${formatExperienceLevel(staff.experience_level)}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editStaff(${staff.id})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteStaff(${staff.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Format cấp độ kinh nghiệm
function formatExperienceLevel(level) {
    switch(level) {
        case 'junior': return 'Mới (0-2 năm)';
        case 'intermediate': return 'Trung cấp (2-5 năm)';
        case 'senior': return 'Cao cấp (5+ năm)';
        default: return level;
    }
}

// Tạo khuyến nghị về nhân viên dựa trên dữ liệu
function generateStaffRecommendations(staffData) {
    const recommendationsBox = document.getElementById('staffRecommendations');
    
    // Tính toán dựa trên dữ liệu thực từ API
    // Dưới đây là một ví dụ đơn giản
    const totalStaff = staffData.length;
    const juniorStaff = staffData.filter(s => s.experience_level === 'junior').length;
    const seniorStaff = staffData.filter(s => s.experience_level === 'senior').length;
    const maleStaff = staffData.filter(s => s.gender === 'male').length;
    const femaleStaff = staffData.filter(s => s.gender === 'female').length;
    
    let recommendations = '<h5>Khuyến nghị phân bổ nhân viên:</h5><ul>';
    
    if (juniorStaff / totalStaff > 0.7) {
        recommendations += '<li>Cửa hàng có quá nhiều nhân viên mới, cần tuyển thêm nhân viên có kinh nghiệm.</li>';
    }
    
    if (seniorStaff / totalStaff < 0.2) {
        recommendations += '<li>Cửa hàng có ít nhân viên cao cấp, cần cân nhắc tuyển thêm hoặc đào tạo nâng cao.</li>';
    }
    
    if (Math.abs(maleStaff - femaleStaff) / totalStaff > 0.4) {
        const lessGender = maleStaff < femaleStaff ? 'nam' : 'nữ';
        recommendations += `<li>Sự chênh lệch giới tính lớn, cần cân nhắc tuyển thêm nhân viên ${lessGender}.</li>`;
    }
    
    recommendations += '<li>Phân công nhân viên trẻ phục vụ khách hàng trẻ, nhân viên lớn tuổi hỗ trợ khách hàng cao tuổi.</li>';
    recommendations += '</ul>';
    
    recommendationsBox.innerHTML = recommendations;
}

// Xóa nhân viên
async function deleteStaff(staffId) {
    if (confirm('Bạn có chắc muốn xóa nhân viên này?')) {
        const response = await apiService.deleteStaff(staffId);
        
        if (response.success) {
            loadStaffData(); // Tải lại danh sách
        } else {
            alert('Lỗi: ' + (response.message || 'Không thể xóa nhân viên'));
        }
    }
}

// Hiển thị thông báo lỗi
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

// Cập nhật biểu đồ theo khung thời gian
function updateChart(timeFrame) {
    // Cập nhật trạng thái active cho các button
    document.querySelectorAll('.btn-group .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Tải dữ liệu mới
    loadAnalyticsData(timeFrame);
}

// hello
// hello
// hello
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in and is admin
    const isAdmin = checkLoginStatus();
    if (!isAdmin) {
        // If not logged in or not admin, redirect to login page
        window.location.href = 'login.html';
        return;
    }
    
    // Khởi tạo các biểu đồ và dữ liệu
    initCharts();
    loadAnalyticsData();
    loadStaffData();
    loadEventsData(); // Load events data when page loads
    
    // Xử lý đăng xuất
    document.getElementById('logoutButton').addEventListener('click', function() {
        apiService.logout();
        window.location.href = 'login.html';
    });
    
    // Xử lý thêm nhân viên - FIX: Moved out of nested DOMContentLoaded
    document.getElementById('submitAddStaff').addEventListener('click', async function() {
        const button = this; // Reference to the button
        const originalButtonText = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<i class="bi bi-hourglass-split"></i> Đang thêm...';

        try {
            const name = document.getElementById('staffName').value;
            const age = document.getElementById('staffAge').value;
            const genderRadio = document.querySelector('input[name="staffGender"]:checked');
            const experience = document.getElementById('staffExperience').value;

            if (!name || !age || !genderRadio || !experience) {
                alert('Vui lòng điền đầy đủ thông tin nhân viên');
                // No return here, finally block will re-enable button
            } else {
                const gender = genderRadio.value;

                const staffData = {
                    name: name,
                    age: parseInt(age),
                    gender: gender,
                    experience_level: experience 
                };

                console.log("Submitting staff data:", staffData); // For debugging
                const response = await apiService.addStaff(staffData);
                console.log("API response for addStaff:", response); // For debugging

                if (response && response.success) {
                    const modalEl = document.getElementById('addStaffModal');
                    if (modalEl) {
                        const modalInstance = bootstrap.Modal.getInstance(modalEl);
                        if (modalInstance) modalInstance.hide();
                    }
                    const formEl = document.getElementById('addStaffForm');
                    if (formEl) formEl.reset();
                    
                    loadStaffData(); // Reload data
                    alert('Thêm nhân viên thành công!');
                } else {
                    const errorMessage = (response && response.message) ? response.message : 'Không thể thêm nhân viên. Phản hồi không hợp lệ từ server.';
                    alert('Lỗi: ' + errorMessage);
                }
            }
        } catch (error) {
            console.error("Error in submitAddStaff:", error);
            alert('Đã xảy ra lỗi trong quá trình thêm nhân viên. Vui lòng kiểm tra console (F12).');
        } finally {
            button.disabled = false;
            button.innerHTML = originalButtonText;
        }
    });

    // Add event handlers for Edit Staff Modal
    document.getElementById('editStaffForm').addEventListener('submit', function(e) {
        e.preventDefault(); // Prevent form submission
        submitEditStaff();
    });

    document.getElementById('submitEditStaff').addEventListener('click', function() {
        submitEditStaff();
    });
    
    // Event filter buttons
    document.getElementById('viewAllEvents').addEventListener('click', function() {
        filterEvents('all');
    });
    
    document.getElementById('viewActiveEvents').addEventListener('click', function() {
        filterEvents('active');
    });
    
    document.getElementById('viewUpcomingEvents').addEventListener('click', function() {
        filterEvents('upcoming');
    });
    
    // Add event form submission
    document.getElementById('submitAddEvent').addEventListener('click', function() {
        submitNewEvent();
    });

    // Load settings when settings tab is activated
    document.getElementById('settings-tab').addEventListener('click', function() {
        loadAllSettings();
    });
    
    // RTSP URL field toggle
    document.getElementById('cameraSource').addEventListener('change', function() {
        const rtspField = document.getElementById('rtspUrlField');
        if (this.value === 'rtsp') {
            rtspField.style.display = 'block';
        } else {
            rtspField.style.display = 'none';
        }
    });
    
    // Save camera settings
    document.getElementById('saveSettings').addEventListener('click', function() {
        saveCameraSettings();
    });
    
    // Save system settings
    document.getElementById('saveSystemSettings').addEventListener('click', function() {
        saveSystemSettings();
    });
    
    // Reset system settings
    document.getElementById('resetSystem').addEventListener('click', function() {
        resetSettings();
    });
    
    // Update threshold value display
    document.getElementById('successThreshold').addEventListener('input', function() {
        document.getElementById('thresholdValue').textContent = `${this.value}%`;
    });
    const editThresholdSlider = document.getElementById('editSuccessThreshold');
    const editThresholdValueDisplay = document.getElementById('editThresholdValue');
    if (editThresholdSlider && editThresholdValueDisplay) {
        editThresholdSlider.addEventListener('input', function() {
            editThresholdValueDisplay.textContent = `${this.value}%`;
        });
    }
});

// Kiểm tra trạng thái đăng nhập
function checkLoginStatus() {
    // Lấy token và role từ localStorage
    const token = localStorage.getItem('adminToken');
    const role = localStorage.getItem('userRole');
    
    if (!token) {
        return false;
    }
    
    // Nếu user không phải admin, redirect về trang chính
    if (role !== 'admin') {
        window.location.href = 'index.html';
        return false;
    }
    
    // Người dùng đã đăng nhập và là admin
    document.getElementById('adminContent').style.display = 'block';
    document.getElementById('loginRequiredMessage').style.display = 'none';
    document.querySelector('.user-menu').style.display = 'block';
    document.querySelector('.login-menu').style.display = 'none';
    
    // Đặt tên người dùng hiện tại
    const username = 'Quản trị viên';
    document.getElementById('currentUsername').textContent = username;
    
    return true;
}

// Khởi tạo biểu đồ
function initCharts() {
    // Biểu đồ xu hướng khách hàng
    const trendsCanvas = document.getElementById('customerTrendsChart');
    if (trendsCanvas) {
        const trendsCtx = trendsCanvas.getContext('2d');
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
                        grid: { display: false }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: { precision: 0 }
                    }
                }
            }
        });
    }

    // Biểu đồ phân bố giới tính
    const genderCanvas = document.getElementById('genderPieChart');
    if (genderCanvas) {
        const genderCtx = genderCanvas.getContext('2d');
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
                    legend: { position: 'bottom' }
                }
            }
        });
    }

    // Biểu đồ phân bố độ tuổi
    const ageCanvas = document.getElementById('agePieChart');
    if (ageCanvas) {
        const ageCtx = ageCanvas.getContext('2d');
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
                    legend: { position: 'bottom' }
                }
            }
        });
    }
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
    }
    else {
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
    try {
        // Get staff data from API
        const staffResponse = await apiService.getStaff();
        console.log("Staff API response:", staffResponse); // Debug log
        
        if (staffResponse.success) {
            // For employees endpoint
            let staffData = staffResponse.data;
            
            // Check if we got data from the employees endpoint
            if (!Array.isArray(staffData)) {
                // Fallback to employees API endpoint
                const employeesResponse = await fetch(`${apiService.baseUrl}/api/employees`, {
                    method: 'GET',
                    headers: apiService.getHeaders()
                });
                
                if (employeesResponse.ok) {
                    staffData = await employeesResponse.json();
                    console.log("Fallback employee data:", staffData); // Debug log
                } else {
                    console.error("Failed to fetch employees data:", employeesResponse.statusText);
                    return;
                }
            }
            
            updateStaffTable(staffData);
            generateStaffRecommendations(staffData);
        } else {
            console.error('Failed to load staff data:', staffResponse.message);
            
            // Fallback to direct API call if auth/users fails
            try {
                const employeesResponse = await fetch(`${apiService.baseUrl}/api/employees`, {
                    method: 'GET',
                    headers: apiService.getHeaders()
                });
                
                if (employeesResponse.ok) {
                    const staffData = await employeesResponse.json();
                    console.log("Direct employees API data:", staffData); // Debug log
                    updateStaffTable(staffData);
                    generateStaffRecommendations(staffData);
                }
            } catch (error) {
                console.error("Error in fallback staff fetch:", error);
            }
        }
    } catch (error) {
        console.error('Error in loadStaffData:', error);
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
        row.setAttribute('data-staff-id', staff.id); // Add data attribute for easy access
        
        row.innerHTML = `
            <td>${staff.id}</td>
            <td>${staff.name}</td>
            <td>${staff.age}</td>
            <td>${staff.gender === 'male' ? 'Nam' : 'Nữ'}</td>
            <td data-experience-level="${staff.experience_level}">${formatExperienceLevel(staff.experience_level)}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary edit-staff-btn" onclick="editStaff('${staff.id}')">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger delete-staff-btn" onclick="deleteStaff('${staff.id}')">
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
    
    // Simplified placeholder message
    let recommendations = '<h5>Khuyến nghị phân bổ nhân viên:</h5><ul>';
    recommendations += '<li>Đã chuyển tính năng phân tích chi tiết sang giao diện người dùng.</li>';
    recommendations += '<li>Vui lòng truy cập trang chính để xem khuyến nghị chi tiết.</li>';
    recommendations += '</ul>';
    
    recommendationsBox.innerHTML = recommendations;
}

// Xóa nhân viên
async function deleteStaff(staffId) {
    if (confirm('Bạn có chắc muốn xóa nhân viên này?')) {
        try {
            const response = await apiService.deleteStaff(staffId);
            
            if (response.success) {
                loadStaffData(); // Reload staff data
                alert('Xóa nhân viên thành công!');
            } else {
                alert('Lỗi: ' + (response.message || 'Không thể xóa nhân viên'));
            }
        } catch (error) {
            console.error('Error deleting staff:', error);
            alert('Đã xảy ra lỗi khi xóa nhân viên');
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

// Function to handle edit staff
function editStaff(staffId) {
    // First get the staff details
    const staffRow = document.querySelector(`tr[data-staff-id="${staffId}"]`);
    if (!staffRow) {
        console.error(`Staff row not found for ID: ${staffId}`);
        return;
    }
    
    // Get staff details from the row
    const name = staffRow.querySelector('td:nth-child(2)').textContent;
    const age = staffRow.querySelector('td:nth-child(3)').textContent;
    const gender = staffRow.querySelector('td:nth-child(4)').textContent === 'Nam' ? 'male' : 'female';
    const experience = staffRow.querySelector('td:nth-child(5)').getAttribute('data-experience-level') || 'junior';
    
    // Populate the edit form
    document.getElementById('editStaffId').value = staffId;
    document.getElementById('editStaffName').value = name;
    document.getElementById('editStaffAge').value = age;
    
    // Set gender radio buttons
    if (gender === 'male') {
        document.getElementById('editGenderMale').checked = true;
    } else {
        document.getElementById('editGenderFemale').checked = true;
    }
    
    // Set experience level
    document.getElementById('editStaffExperience').value = experience;
    
    // Show the modal
    const editModal = new bootstrap.Modal(document.getElementById('editStaffModal'));
    editModal.show();
}

// Function to submit edit staff changes
async function submitEditStaff() {
    const staffId = document.getElementById('editStaffId').value;
    const name = document.getElementById('editStaffName').value;
    const age = document.getElementById('editStaffAge').value;
    const gender = document.querySelector('input[name="editStaffGender"]:checked').value;
    const experience = document.getElementById('editStaffExperience').value;

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

    try {
        const response = await apiService.updateStaff(staffId, staffData);
        
        if (response.success) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('editStaffModal'));
            modal.hide();
            loadStaffData(); // Reload staff data
            alert('Cập nhật nhân viên thành công!');
        } else {
            alert('Lỗi: ' + (response.message || 'Không thể cập nhật nhân viên'));
        }
    } catch (error) {
        console.error('Error updating staff:', error);
        alert('Đã xảy ra lỗi khi cập nhật nhân viên');
    }
}

// Load events data from API
async function loadEventsData() {
    try {
        const eventsResponse = await apiService.getEvents();
        
        if (eventsResponse.success) {
            updateEventsTable(eventsResponse.data);
        } else {
            console.error('Failed to load events data:', eventsResponse.message);
        }
    } catch (error) {
        console.error('Error in loadEventsData:', error);
    }
}

// Update events tables (current/upcoming and past)
function updateEventsTable(eventsData) {
    if (!eventsData || !Array.isArray(eventsData)) {
        console.warn('Invalid events data received:', eventsData);
        return;
    }
    
    // Split events by status
    const currentAndUpcomingEvents = eventsData.filter(event => 
        event.status === 'active' || event.status === 'upcoming');
    
    const pastEvents = eventsData.filter(event => 
        event.status === 'completed');
    
    // Update current/upcoming events table
    const currentTableBody = document.getElementById('eventsTableBody');
    updateEventsTableContent(currentTableBody, currentAndUpcomingEvents);
    
    // Update past events table
    const pastTableBody = document.getElementById('pastEventsTableBody');
    updatePastEventsTableContent(pastTableBody, pastEvents);
    
    // Save data for filtering
    window.allEventsData = eventsData;
}

// Update current/upcoming events table content
function updateEventsTableContent(tableBody, events) {
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (!events || events.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Không có sự kiện nào</td></tr>';
        return;
    }
    
    events.forEach(event => {
        const row = document.createElement('tr');
        row.setAttribute('data-event-id', event.id);
        
        // Format dates
        const startDate = new Date(event.start_date).toLocaleDateString();
        const endDate = new Date(event.end_date).toLocaleDateString();
        
        // Format target audience badges
        let audienceBadges = '';
        if (event.target_audience && Array.isArray(event.target_audience)) {
            event.target_audience.forEach(audience => {
                let badgeClass = '';
                let audienceLabel = '';
                
                switch(audience) {
                    case 'young':
                        badgeClass = 'bg-success';
                        audienceLabel = 'Trẻ (0-20)';
                        break;
                    case 'adult':
                        badgeClass = 'bg-info';
                        audienceLabel = 'Thanh niên (21-40)';
                        break;
                    case 'middle_aged':
                        badgeClass = 'bg-warning';
                        audienceLabel = 'Trung niên (41-60)';
                        break;
                    case 'elderly':
                        badgeClass = 'bg-danger';
                        audienceLabel = 'Cao tuổi (60+)';
                        break;
                }
                
                audienceBadges += `<span class="badge ${badgeClass} me-1">${audienceLabel}</span>`;
            });
        }
        
        // Format gender target badge
        let genderBadge = '';
        switch(event.target_gender) {
            case 'male':
                genderBadge = '<span class="badge bg-info">Nam</span>';
                break;
            case 'female':
                genderBadge = '<span class="badge bg-danger">Nữ</span>';
                break;
            default:
                genderBadge = '<span class="badge bg-secondary">Tất cả</span>';
                break;
        }
        
        // Format status badge
        let statusBadge = '';
        switch(event.status) {
            case 'active':
                statusBadge = '<span class="badge bg-primary">Đang diễn ra</span>';
                break;
            case 'upcoming':
                statusBadge = '<span class="badge bg-secondary">Sắp diễn ra</span>';
                break;
            case 'completed':
                statusBadge = '<span class="badge bg-success">Đã kết thúc</span>';
                break;
        }
        
        row.innerHTML = `
            <td>${event.name}</td>
            <td>${startDate} - ${endDate}</td>
            <td>${audienceBadges}</td>
            <td>${genderBadge}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn btn-sm btn-outline-info view-event-btn" onclick="viewEvent('${event.id}')">
                    <i class="bi bi-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-primary edit-event-btn" onclick="editEvent('${event.id}')">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger delete-event-btn" onclick="deleteEvent('${event.id}')">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Update past events table content
function updatePastEventsTableContent(tableBody, events) {
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (!events || events.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Không có sự kiện đã kết thúc</td></tr>';
        return;
    }
    
    events.forEach(event => {
        const row = document.createElement('tr');
        row.setAttribute('data-event-id', event.id);
        
        // Format dates
        const startDate = new Date(event.start_date).toLocaleDateString();
        const endDate = new Date(event.end_date).toLocaleDateString();
        
        // Format target audience badges
        let audienceBadges = '';
        if (event.target_audience && Array.isArray(event.target_audience)) {
            event.target_audience.forEach(audience => {
                let badgeClass = '';
                let audienceLabel = '';
                
                switch(audience) {
                    case 'young':
                        badgeClass = 'bg-success';
                        audienceLabel = 'Trẻ (0-20)';
                        break;
                    case 'adult':
                        badgeClass = 'bg-info';
                        audienceLabel = 'Thanh niên (21-40)';
                        break;
                    case 'middle_aged':
                        badgeClass = 'bg-warning';
                        audienceLabel = 'Trung niên (41-60)';
                        break;
                    case 'elderly':
                        badgeClass = 'bg-danger';
                        audienceLabel = 'Cao tuổi (60+)';
                        break;
                }
                
                audienceBadges += `<span class="badge ${badgeClass} me-1">${audienceLabel}</span>`;
            });
        }
        
        // Format gender target badge
        let genderBadge = '';
        switch(event.target_gender) {
            case 'male':
                genderBadge = '<span class="badge bg-info">Nam</span>';
                break;
            case 'female':
                genderBadge = '<span class="badge bg-danger">Nữ</span>';
                break;
            default:
                genderBadge = '<span class="badge bg-secondary">Tất cả</span>';
                break;
        }
        
        // Determine success rate badge
        let successBadge = '';
        const matchPercent = event.target_match_percent || 0;
        
        if (matchPercent >= 85) {
            successBadge = '<span class="badge bg-success">Rất thành công</span>';
        } else if (matchPercent >= 70) {
            successBadge = '<span class="badge bg-success">Thành công</span>';
        } else if (matchPercent >= 50) {
            successBadge = '<span class="badge bg-warning">Trung bình</span>';
        } else {
            successBadge = '<span class="badge bg-danger">Chưa thành công</span>';
        }
        
        row.innerHTML = `
            <td>${event.name}</td>
            <td>${startDate} - ${endDate}</td>
            <td>${audienceBadges}</td>
            <td>${genderBadge}</td>
            <td>${event.visitor_count || 0}</td>
            <td>${matchPercent}%</td>
            <td>${successBadge}</td>
            <td>
                <button class="btn btn-sm btn-outline-info" onclick="viewEventReport('${event.id}')">
                    <i class="bi bi-file-text"></i> Báo cáo
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Filter events by status
function filterEvents(status) {
    // Update button active states
    document.querySelectorAll('.btn-group .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`view${status.charAt(0).toUpperCase() + status.slice(1)}Events`).classList.add('active');
    
    if (!window.allEventsData) return;
    
    let filteredEvents;
    
    switch(status) {
        case 'active':
            filteredEvents = window.allEventsData.filter(event => event.status === 'active');
            break;
        case 'upcoming':
            filteredEvents = window.allEventsData.filter(event => event.status === 'upcoming');
            break;
        default: // 'all' or any other value
            filteredEvents = window.allEventsData.filter(event => 
                event.status === 'active' || event.status === 'upcoming');
            break;
    }
    
    const tableBody = document.getElementById('eventsTableBody');
    updateEventsTableContent(tableBody, filteredEvents);
}

// View event details
function viewEvent(eventId) {
    // Fetch event details from the database
    apiService.getEventDetails(eventId)
        .then(response => {
            if (response.success) {
                const event = response.data;
                
                // Parse JSON fields if needed
                const targetAudience = typeof event.target_audience === 'string' 
                    ? JSON.parse(event.target_audience) 
                    : event.target_audience;
                
                // Format dates for display
                const startDate = new Date(event.start_date).toLocaleDateString('vi-VN');
                const endDate = new Date(event.end_date).toLocaleDateString('vi-VN');
                
                // Create audience badges HTML
                let audienceBadges = '';
                if (Array.isArray(targetAudience)) {
                    targetAudience.forEach(audience => {
                        let badgeClass = '';
                        let audienceLabel = '';
                        
                        switch(audience) {
                            case 'young':
                                badgeClass = 'bg-success';
                                audienceLabel = 'Trẻ (0-20)';
                                break;
                            case 'adult':
                                badgeClass = 'bg-info';
                                audienceLabel = 'Thanh niên (21-40)';
                                break;
                            case 'middle_aged':
                                badgeClass = 'bg-warning';
                                audienceLabel = 'Trung niên (41-60)';
                                break;
                            case 'elderly':
                                badgeClass = 'bg-danger';
                                audienceLabel = 'Cao tuổi (60+)';
                                break;
                        }
                        
                        audienceBadges += `<span class="badge ${badgeClass} me-1">${audienceLabel}</span>`;
                    });
                }
                
                // Create gender badge
                let genderBadge = '';
                switch(event.target_gender) {
                    case 'male':
                        genderBadge = '<span class="badge bg-info">Nam</span>';
                        break;
                    case 'female':
                        genderBadge = '<span class="badge bg-danger">Nữ</span>';
                        break;
                    default:
                        genderBadge = '<span class="badge bg-secondary">Tất cả</span>';
                }
                
                // Create event details modal content
                const modalContent = `
                    <div class="modal-header">
                        <h5 class="modal-title">Chi Tiết Sự Kiện: ${event.name}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <p><strong>Tên sự kiện:</strong> ${event.name}</p>
                                <p><strong>Loại sự kiện:</strong> ${event.type || 'Không xác định'}</p>
                                <p><strong>Thời gian:</strong> ${startDate} - ${endDate}</p>
                            </div>
                            <div class="col-md-6">
                                <p><strong>Đối tượng mục tiêu:</strong> ${audienceBadges || 'Không xác định'}</p>
                                <p><strong>Giới tính mục tiêu:</strong> ${genderBadge}</p>
                                <p><strong>Số lượng mục tiêu:</strong> ${event.target_count || 'Không giới hạn'}</p>
                            </div>
                        </div>
                        
                        <div class="mb-3">
                            <p><strong>Mô tả sự kiện:</strong></p>
                            <p class="text-muted">${event.description || 'Không có mô tả'}</p>
                        </div>
                        
                        <div class="mb-3">
                            <p><strong>Trạng thái:</strong> 
                                <span class="badge ${
                                    event.status === 'active' ? 'bg-primary' : 
                                    event.status === 'upcoming' ? 'bg-secondary' : 'bg-success'
                                }">
                                    ${
                                        event.status === 'active' ? 'Đang diễn ra' :
                                        event.status === 'upcoming' ? 'Sắp diễn ra' : 'Đã kết thúc'
                                    }
                                </span>
                            </p>
                        </div>
                        
                        <div class="mb-3">
                            <p><strong>Thống kê hiện tại:</strong></p>
                            <div class="row">
                                <div class="col-md-6">
                                    <p>Số lượng khách: ${event.visitor_count || 0}</p>
                                </div>
                                <div class="col-md-6">
                                    <p>Tỷ lệ phù hợp: ${event.target_match_percent || 0}%</p>
                                </div>
                            </div>
                            <div class="progress" style="height: 25px;">
                                <div class="progress-bar ${
                                    event.target_match_percent >= 85 ? 'bg-success' :
                                    event.target_match_percent >= 70 ? 'bg-info' :
                                    event.target_match_percent >= 50 ? 'bg-warning' : 'bg-danger'
                                }" role="progressbar" 
                                    style="width: ${event.target_match_percent || 0}%;" 
                                    aria-valuenow="${event.target_match_percent || 0}" 
                                    aria-valuemin="0" aria-valuemax="100">
                                    ${event.target_match_percent || 0}% phù hợp mục tiêu
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
                        <button type="button" class="btn btn-primary" onclick="editEvent('${event.id}')">
                            <i class="bi bi-pencil"></i> Chỉnh sửa
                        </button>
                    </div>
                `;
                
                // Create and show the modal
                const modalElement = document.createElement('div');
                modalElement.className = 'modal fade';
                modalElement.id = 'viewEventModal';
                modalElement.tabIndex = '-1';
                modalElement.innerHTML = `
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            ${modalContent}
                        </div>
                    </div>
                `;
                
                // Remove any existing instance of the modal
                const existingModal = document.getElementById('viewEventModal');
                if (existingModal) {
                    existingModal.remove();
                }
                
                // Add the modal to the document
                document.body.appendChild(modalElement);
                
                // Show the modal
                const modal = new bootstrap.Modal(modalElement);
                modal.show();
            } else {
                alert('Error: ' + (response.message || 'Failed to load event details'));
            }
        })
        .catch(error => {
            console.error('Error viewing event:', error);
            alert('Failed to load event details. Please try again.');
        });
}

// Edit event
async function editEvent(eventId) {
    try {
        // Fetch event details
        const response = await apiService.getEventDetails(eventId);
        
        if (!response.success) {
            alert('Error: ' + (response.message || 'Failed to load event details'));
            return;
        }
        
        const event = response.data;
        
        // Populate form with event data
        document.getElementById('editEventId').value = event.id;
        document.getElementById('editEventName').value = event.name;
        document.getElementById('editEventType').value = event.type;
        
        // Format dates for the datetime-local input
        // Trim off any timezone info as datetime-local doesn't support it
        let startDate = event.start_date;
        let endDate = event.end_date;
        if (startDate.includes('T')) {
            startDate = startDate.split('T')[0] + 'T' + startDate.split('T')[1].split('.')[0];
        }
        if (endDate.includes('T')) {
            endDate = endDate.split('T')[0] + 'T' + endDate.split('T')[1].split('.')[0];
        }
        
        document.getElementById('editEventStartDate').value = startDate;
        document.getElementById('editEventEndDate').value = endDate;
        document.getElementById('editEventDescription').value = event.description || '';
        document.getElementById('editEventTarget').value = event.target_count || 0;
        document.getElementById('editSuccessThreshold').value = event.success_threshold || 75;
        
        // Set target audience checkboxes
        const targetAudience = Array.isArray(event.target_audience) ? event.target_audience : [];
        document.getElementById('editTargetYoung').checked = targetAudience.includes('young');
        document.getElementById('editTargetAdult').checked = targetAudience.includes('adult');
        document.getElementById('editTargetMiddleAged').checked = targetAudience.includes('middle_aged');
        document.getElementById('editTargetElderly').checked = targetAudience.includes('elderly');
        
        // Set target gender radio button
        const targetGender = event.target_gender || 'all';
        document.getElementById(`editTarget${targetGender.charAt(0).toUpperCase() + targetGender.slice(1)}`).checked = true;
        
        // Update threshold value display
        document.getElementById('editThresholdValue').textContent = `${event.success_threshold || 75}%`;
        
        // Show the edit modal
        const editModal = new bootstrap.Modal(document.getElementById('editEventModal'));
        editModal.show();
    } catch (error) {
        console.error('Error loading event details:', error);
        alert('Failed to load event details. Please try again.');
    }
}

// Add this new function to handle event update submission
async function submitEditEvent() {
    const eventId = document.getElementById('editEventId').value;
    const name = document.getElementById('editEventName').value;
    const type = document.getElementById('editEventType').value;
    const startDate = document.getElementById('editEventStartDate').value;
    const endDate = document.getElementById('editEventEndDate').value;
    const description = document.getElementById('editEventDescription').value;
    const targetCount = document.getElementById('editEventTarget').value;
    const successThreshold = document.getElementById('editSuccessThreshold').value;
    
    // Get target audience (checkboxes)
    const targetAudience = [];
    document.querySelectorAll('input[name="editTargetAudience"]:checked').forEach(checkbox => {
        targetAudience.push(checkbox.value);
    });
    
    // Get target gender (radio buttons)
    const targetGender = document.querySelector('input[name="editTargetGender"]:checked').value;
    
    // Validate form
    if (!name || !type || !startDate || !endDate || targetAudience.length === 0) {
        alert('Vui lòng điền đầy đủ thông tin sự kiện');
        return;
    }
    
    // Create event data object
    const eventData = {
        name: name,
        type: type,
        start_date: startDate,
        end_date: endDate,
        target_audience: targetAudience,
        target_gender: targetGender,
        description: description,
        target_count: parseInt(targetCount) || 0,
        success_threshold: parseInt(successThreshold) || 75
    };
    
    try {
        const response = await apiService.updateEvent(eventId, eventData);
        
        if (response.success) {
            // Close modal and refresh event data
            const modal = bootstrap.Modal.getInstance(document.getElementById('editEventModal'));
            modal.hide();
            
            // Reload events data
            loadEventsData();
            
            alert('Cập nhật sự kiện thành công!');
        } else {
            alert('Lỗi: ' + (response.message || 'Không thể cập nhật sự kiện'));
        }
    } catch (error) {
        console.error('Error updating event:', error);
        alert('Đã xảy ra lỗi khi cập nhật sự kiện');
    }
}

// Delete event
async function deleteEvent(eventId) {
    if (confirm('Bạn có chắc muốn xóa sự kiện này?')) {
        try {
            const response = await apiService.deleteEvent(eventId);
            
            if (response.success) {
                loadEventsData(); // Reload events data
                alert('Xóa sự kiện thành công!');
            } else {
                alert('Lỗi: ' + (response.message || 'Không thể xóa sự kiện'));
            }
        } catch (error) {
            console.error('Error deleting event:', error);
            alert('Đã xảy ra lỗi khi xóa sự kiện');
        }
    }
}

// View event report
function viewEventReport(eventId) {
    // This would typically populate a modal with a detailed event report
    alert(`Viewing report for event with ID: ${eventId}`);
    // Future implementation: Fetch event report data and display in a modal
}

// Submit new event
async function submitNewEvent() {
    // Get form values
    const name = document.getElementById('eventName').value;
    const type = document.getElementById('eventType').value;
    const startDate = document.getElementById('eventStartDate').value;
    const endDate = document.getElementById('eventEndDate').value;
    const description = document.getElementById('eventDescription').value;
    const targetCount = document.getElementById('eventTarget').value;
    const successThreshold = document.getElementById('successThreshold').value;
    
    // Get target audience (checkboxes)
    const targetAudience = [];
    document.querySelectorAll('input[name="targetAudience"]:checked').forEach(checkbox => {
        targetAudience.push(checkbox.value);
    });
    
    // Get target gender (radio buttons)
    const targetGender = document.querySelector('input[name="targetGender"]:checked').value;
    
    // Validate form
    if (!name || !type || !startDate || !endDate || targetAudience.length === 0) {
        alert('Vui lòng điền đầy đủ thông tin sự kiện');
        return;
    }
    
    // Create event data object
    const eventData = {
        name: name,
        type: type,
        start_date: startDate,
        end_date: endDate,
        target_audience: targetAudience,
        target_gender: targetGender,
        description: description,
        target_count: parseInt(targetCount) || 0,
        success_threshold: parseInt(successThreshold) || 75
    };
    
    try {
        const response = await apiService.createEvent(eventData);
        
        if (response.success) {
            // Close modal and refresh event data
            const modal = bootstrap.Modal.getInstance(document.getElementById('addEventModal'));
            modal.hide();
            
            // Clear form
            document.getElementById('addEventForm').reset();
            
            // Reload events data
            loadEventsData();
            
            alert('Tạo sự kiện thành công!');
        } else {
            alert('Lỗi: ' + (response.message || 'Không thể tạo sự kiện'));
        }
    } catch (error) {
        console.error('Error creating event:', error);
        alert('Đã xảy ra lỗi khi tạo sự kiện');
    }
}

// Load all settings
async function loadAllSettings() {
    await loadCameraSettings();
    await loadSystemSettings();
}

// Load camera settings
async function loadCameraSettings() {
    try {
        const response = await apiService.getSettings('camera');
        
        if (response.success && response.data) {
            const settings = response.data;
            
            // Set detection sensitivity
            document.getElementById('detectionSensitivity').value = settings.detection_sensitivity || 50;
            
            // Set camera source
            const cameraSource = document.getElementById('cameraSource');
            cameraSource.value = settings.camera_source || '0';
            
            // Set RTSP URL if available
            document.getElementById('rtspUrl').value = settings.rtsp_url || '';
            
            // Show/hide RTSP URL field
            const rtspField = document.getElementById('rtspUrlField');
            rtspField.style.display = cameraSource.value === 'rtsp' ? 'block' : 'none';
            
            // Show success message
            showToast('Đã tải cài đặt camera thành công', 'success');
        } else {
            console.error('Failed to load camera settings:', response.message);
        }
    } catch (error) {
        console.error('Error loading camera settings:', error);
    }
}

// Load system settings
async function loadSystemSettings() {
    try {
        const response = await apiService.getSettings('system');
        
        if (response.success && response.data) {
            const settings = response.data;
            
            // Set auto restart toggle
            document.getElementById('enableAutoRestart').checked = settings.enable_auto_restart !== false;
            
            // Set notifications toggle
            document.getElementById('enableNotifications').checked = settings.enable_notifications !== false;
            
            // Set data retention
            const retentionSelect = document.getElementById('dataRetention');
            retentionSelect.value = settings.data_retention_days || '30';
            
            // Show success message
            showToast('Đã tải cài đặt hệ thống thành công', 'success');
        } else {
            console.error('Failed to load system settings:', response.message);
        }
    } catch (error) {
        console.error('Error loading system settings:', error);
    }
}

// Save camera settings
async function saveCameraSettings() {
    try {
        // Show loading indicator
        const saveButton = document.getElementById('saveSettings');
        const originalText = saveButton.innerHTML;
        saveButton.innerHTML = '<i class="bi bi-hourglass"></i> Đang lưu...';
        saveButton.disabled = true;
        
        // Get settings values
        const detectionSensitivity = parseInt(document.getElementById('detectionSensitivity').value);
        const cameraSource = document.getElementById('cameraSource').value;
        const rtspUrl = document.getElementById('rtspUrl').value;
        
        // Create settings object
        const settings = {
            detection_sensitivity: detectionSensitivity,
            camera_source: cameraSource,
            rtsp_url: rtspUrl
        };
        
        // Save settings
        const response = await apiService.saveSettings('camera', settings);
        
        // Restore button
        saveButton.innerHTML = originalText;
        saveButton.disabled = false;
        
        if (response.success) {
            showToast('Đã lưu cài đặt camera thành công', 'success');
            
            // Refresh video feed if there's one on the page
            const videoFeed = document.getElementById('videoFeed');
            if (videoFeed) {
                videoFeed.src = `${apiService.baseUrl}/video_feed?t=${new Date().getTime()}`;
            }
        } else {
            showToast(response.message || 'Lỗi khi lưu cài đặt camera', 'error');
        }
    } catch (error) {
        console.error('Error saving camera settings:', error);
        document.getElementById('saveSettings').disabled = false;
        showToast('Lỗi kết nối với server khi lưu cài đặt camera', 'error');
    }
}

// Save system settings
async function saveSystemSettings() {
    try {
        // Show loading indicator
        const saveButton = document.getElementById('saveSystemSettings');
        const originalText = saveButton.innerHTML;
        saveButton.innerHTML = '<i class="bi bi-hourglass"></i> Đang lưu...';
        saveButton.disabled = true;
        
        // Get settings values
        const enableAutoRestart = document.getElementById('enableAutoRestart').checked;
        const enableNotifications = document.getElementById('enableNotifications').checked;
        const dataRetention = parseInt(document.getElementById('dataRetention').value);
        
        // Create settings object
        const settings = {
            enable_auto_restart: enableAutoRestart,
            enable_notifications: enableNotifications,
            data_retention_days: dataRetention
        };
        
        // Save settings
        const response = await apiService.saveSettings('system', settings);
        
        // Restore button
        saveButton.innerHTML = originalText;
        saveButton.disabled = false;
        
        if (response.success) {
            showToast('Đã lưu cài đặt hệ thống thành công', 'success');
        } else {
            showToast(response.message || 'Lỗi khi lưu cài đặt hệ thống', 'error');
        }
    } catch (error) {
        console.error('Error saving system settings:', error);
        document.getElementById('saveSystemSettings').disabled = false;
        showToast('Lỗi kết nối với server khi lưu cài đặt hệ thống', 'error');
    }
}

// Reset settings
async function resetSettings() {
    // Ask for confirmation
    if (!confirm('Bạn có chắc chắn muốn khôi phục cài đặt mặc định không?')) {
        return;
    }
    
    try {
        // Show loading indicator
        const resetButton = document.getElementById('resetSystem');
        const originalText = resetButton.innerHTML;
        resetButton.innerHTML = '<i class="bi bi-hourglass"></i> Đang khôi phục...';
        resetButton.disabled = true;
        
        // Reset settings
        const response = await apiService.resetSettings();
        
        // Restore button
        resetButton.innerHTML = originalText;
        resetButton.disabled = false;
        
        if (response.success) {
            showToast('Đã khôi phục cài đặt mặc định thành công', 'success');
            
            // Reload settings
            loadAllSettings();
            
            // Refresh video feed if there's one on the page
            const videoFeed = document.getElementById('videoFeed');
            if (videoFeed) {
                videoFeed.src = `${apiService.baseUrl}/video_feed?t=${new Date().getTime()}`;
            }
        } else {
            showToast(response.message || 'Lỗi khi khôi phục cài đặt mặc định', 'error');
        }
    } catch (error) {
        console.error('Error resetting settings:', error);
        document.getElementById('resetSystem').disabled = false;
        showToast('Lỗi kết nối với server khi khôi phục cài đặt mặc định', 'error');
    }
}

// Show toast message
function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.style.position = 'fixed';
        toastContainer.style.top = '20px';
        toastContainer.style.right = '20px';
        toastContainer.style.zIndex = '1050';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast show bg-${type === 'error' ? 'danger' : type}`;
    toast.role = 'alert';
    toast.ariaLive = 'assertive';
    toast.ariaAtomic = 'true';
    
    // Create toast header
    const toastHeader = document.createElement('div');
    toastHeader.className = 'toast-header';
    
    const title = type.charAt(0).toUpperCase() + type.slice(1);
    toastHeader.innerHTML = `
        <strong class="me-auto">
            <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            ${title}
        </strong>
        <small>bây giờ</small>
        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
    `;
    
    // Create toast body
    const toastBody = document.createElement('div');
    toastBody.className = 'toast-body text-white';
    toastBody.textContent = message;
    
    // Assemble toast
    toast.appendChild(toastHeader);
    toast.appendChild(toastBody);
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Remove after 5 seconds
    setTimeout(() => {
        toast.remove();
    }, 5000);
    
    // Add click listener to close button
    const closeButton = toast.querySelector('.btn-close');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            toast.remove();
        });
    }
}
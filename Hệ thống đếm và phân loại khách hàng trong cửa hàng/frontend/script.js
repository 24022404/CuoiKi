// hello
// Global variables
let isVideoPaused = false;
let videoFeed = null;
let capturedImageData = null;
const API_URL = 'http://localhost:5000';
// Add redirect guard to prevent loops
let isRedirecting = false;
// Add login check tracking
let loginCheckCount = 0;
let lastLoginCheck = 0;

// Function to check login status with improved reliability
function checkLoginStatus() {
    const token = localStorage.getItem('adminToken');
    const role = localStorage.getItem('userRole');
    
    // Add timestamp and count for debugging
    const now = Date.now();
    loginCheckCount++;
    
    // Prevent too frequent checks (throttle to max once per second)
    if (now - lastLoginCheck < 1000 && loginCheckCount > 1) {
        console.log("Throttling login check - too frequent");
        return token !== null; // Return cached result
    }
    
    lastLoginCheck = now;
    console.log(`Checking login status [${loginCheckCount}]:`, { 
        token: token ? "exists" : "missing", 
        role,
        time: new Date().toISOString()
    });
    
    // Comprehensive check of all required auth items
    if (!token || !role) {
        console.log("Login check failed: Missing token or role");
        
        // Clean up any partial login state
        if (token || role) {
            console.warn("Found incomplete login state, clearing...");
            try {
                localStorage.removeItem('adminToken');
                localStorage.removeItem('adminUsername');
                localStorage.removeItem('userRole');
            } catch (e) {
                console.error("Error clearing incomplete state:", e);
            }
        }
        
        return false;
    }
    
    // User is logged in - update UI
    try {
        document.getElementById('contentContainer').style.display = 'block';
        document.getElementById('loginRequiredMessage').style.display = 'none';
        document.querySelector('.user-menu').style.display = 'block';
        document.querySelector('.login-menu').style.display = 'none';
        
        // Set current username
        const username = (role === 'admin') ? 'Quản trị viên' : 'Nhân viên';
        document.getElementById('currentUsername').textContent = username;
        
        // Show admin button if user is admin
        if (role === 'admin') {
            document.getElementById('adminButton').style.display = 'block';
        } else {
            document.getElementById('adminButton').style.display = 'none';
        }
    } catch (e) {
        console.error("Error updating UI after login check:", e);
        // Non-fatal error, still return true if we have valid tokens
    }
    
    return true;
}

// Global logout function that can be called from anywhere
window.performLogout = function() {
    console.log("Global logout function triggered");
    try {
        // Clear tokens directly instead of calling apiService
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUsername');
        localStorage.removeItem('userRole');
        
        console.log("Logout successful, redirecting to login page");
        window.location.href = 'login.html';
    } catch (error) {
        console.error("Error during logout:", error);
        alert("Có lỗi xảy ra khi đăng xuất. Vui lòng thử lại.");
    }
};

// DOM elements
document.addEventListener('DOMContentLoaded', () => {
    // Add logout handler globally with improved reliability
    const logoutButtons = document.querySelectorAll('#logoutButton, .logout-button');
    
    logoutButtons.forEach(button => {
        if (button) {
            // Remove any existing event listeners (if possible)
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            // Add new event listener
            newButton.addEventListener('click', function(e) {
                e.preventDefault();
                console.log("Logout button clicked");
                window.performLogout();
            });
        }
    });
    
    // Check if we are on login page (prevent redirect loop)
    if (window.location.href.includes('login.html')) {
        console.log("On login page, skipping login check");
        return;
    }
    
    // Use a more reliable approach to check login status
    console.log("Performing initial login check...");
    let isLoggedIn = false;
    
    // Try multiple times with delay to ensure localStorage is properly read
    // This handles race conditions with localStorage
    const checkWithRetry = async () => {
        for (let attempt = 0; attempt < 3; attempt++) {
            isLoggedIn = checkLoginStatus();
            if (isLoggedIn) break;
            
            // Wait between attempts
            if (attempt < 2) { // Don't wait after last attempt
                console.log(`Login check attempt ${attempt+1} failed, retrying...`);
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }
        
        // Final decision after retries
        if (!isLoggedIn && !isRedirecting) {
            // If not logged in, redirect to login page
            console.log("Not logged in after multiple attempts, redirecting to login page");
            isRedirecting = true;
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 100);
            return;
        } else if (isLoggedIn) {
            console.log("Successfully verified logged in state");
        }
    };
    
    // Execute the retry function
    checkWithRetry();
    
    // Initialize elements
    videoFeed = document.getElementById('videoFeed');
    const toggleVideoBtn = document.getElementById('toggleVideo');
    const captureImageBtn = document.getElementById('captureImage');
    const videoStatus = document.getElementById('videoStatus');
    const saveImageBtn = document.getElementById('saveImage');
    
    // Check backend connection
    checkBackendConnection();
    
    // Initialize data refresh
    refreshAnalyticsData();
    setInterval(refreshAnalyticsData, 5000); // Refresh every 5 seconds
    
    // Toggle video feed
    toggleVideoBtn.addEventListener('click', () => {
        if (isVideoPaused) {
            // Resume video
            videoFeed.src = `${API_URL}/video_feed?t=${new Date().getTime()}`;
            toggleVideoBtn.innerHTML = '<i class="bi bi-pause-fill"></i> Tạm Dừng';
            isVideoPaused = false;
        } else {
            // Pause video by setting a blank image
            videoFeed.src = '';
            toggleVideoBtn.innerHTML = '<i class="bi bi-play-fill"></i> Tiếp Tục';
            isVideoPaused = true;
        }
    });
    
    // Capture image
    captureImageBtn.addEventListener('click', captureImage);
    
    // Save captured image
    saveImageBtn.addEventListener('click', saveImage);

    // Check for active events on page load
    checkActiveEvents();
    
    // Set up interval to periodically check for active events and update the report
    setInterval(checkActiveEvents, 60000); // Check every minute
});

// Check if backend is running
function checkBackendConnection() {
    const videoStatus = document.getElementById('videoStatus');
    
    fetch(`${API_URL}/camera_status`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Backend server is not available');
            }
            return response.json();
        })
        .then(data => {
            if (data.status === 'ok') {
                videoStatus.classList.add('d-none');
            } else {
                showError('Camera Error', data.message);
            }
        })
        .catch(error => {
            console.error('Error connecting to backend:', error);
            videoStatus.textContent = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra xem backend có đang chạy không.';
            videoStatus.classList.remove('d-none');
            videoStatus.classList.remove('alert-info');
            videoStatus.classList.add('alert-danger');
        });
}

// Refresh analytics data from backend
function refreshAnalyticsData() {
    fetch(`${API_URL}/latest_analysis`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch analytics data');
            }
            return response.json();
        })
        .then(data => {
            updateCounters(data);
            updateAgeGroups(data);
            generateRecommendations(data);
        })
        .catch(error => {
            console.error('Error fetching analytics data:', error);
        });
}

// Update the counter displays
function updateCounters(data) {
    document.getElementById('totalCount').textContent = data.total_count;
    document.getElementById('maleCount').textContent = data.male_count;
    document.getElementById('femaleCount').textContent = data.female_count;
    
    // Force immediate update of event visitor counts to ensure consistency
    updateEventVisitorCounts(data);
}

// New function to ensure consistent event visitor counts
function updateEventVisitorCounts(data) {
    // Function modified to no longer update visitor counts
    const eventStatus = document.getElementById('eventStatus');
    if (eventStatus && !eventStatus.classList.contains('d-none')) {
        // Check for active events to update other UI elements if needed
        fetch(`${API_URL}/api/events/active`)
            .then(response => response.json())
            .then(event => {
                if (event && event.id) {
                    // We still update stats in the database but don't display them
                    analyzeEventEffectiveness(event);
                }
            })
            .catch(error => console.error('Error checking for active events:', error));
    }
}

// Update age group displays
function updateAgeGroups(data) {
    const ageGroups = data.age_groups;
    const total = data.total_count || 1; // Avoid division by zero
    
    // Update counters
    document.getElementById('youngCount').textContent = ageGroups.young;
    document.getElementById('adultCount').textContent = ageGroups.adult;
    document.getElementById('middleAgedCount').textContent = ageGroups.middle_aged;
    document.getElementById('elderlyCount').textContent = ageGroups.elderly;
    
    // Update progress bars
    document.getElementById('youngBar').style.width = `${(ageGroups.young / total) * 100}%`;
    document.getElementById('adultBar').style.width = `${(ageGroups.adult / total) * 100}%`;
    document.getElementById('middleAgedBar').style.width = `${(ageGroups.middle_aged / total) * 100}%`;
    document.getElementById('elderlyBar').style.width = `${(ageGroups.elderly / total) * 100}%`;
    
    // If we have an active event, check if customers match the target audience
    updateEventEffectiveness(data);
}

// Generate staffing recommendations based on customer data
function generateRecommendations(data) {
    const recommendationsElement = document.getElementById('recommendations');
    let recommendations = '';
    
    // Tạo khuyến nghị dựa trên số lượng khách hàng
    if (data.total_count === 0) {
        recommendations = '<p>Chưa phát hiện khách hàng nào. Đảm bảo camera đang hoạt động và có người trong tầm nhìn.</p>';
    } else {
        recommendations = '<h6>Khuyến Nghị Phân Bổ Nhân Viên:</h6><ul>';
        
        // Khuyến nghị dựa trên tổng số người
        if (data.total_count > 10) {
            recommendations += '<li>Đông khách: Cần bổ sung thêm nhân viên phục vụ.</li>';
        } else if (data.total_count > 5) {
            recommendations += '<li>Lượng khách trung bình: Duy trì số lượng nhân viên hiện tại.</li>';
        } else {
            recommendations += '<li>Ít khách: Có thể điều chuyển bớt nhân viên.</li>';
        }
        
        // Khuyến nghị chi tiết dựa trên phân bố độ tuổi
        const ageGroups = data.age_groups;
        const totalAges = ageGroups.young + ageGroups.adult + ageGroups.middle_aged + ageGroups.elderly;
        
        if (totalAges > 0) {
            // Tính phần trăm cho mỗi nhóm tuổi
            const youngPercent = Math.round((ageGroups.young / totalAges) * 100);
            const adultPercent = Math.round((ageGroups.adult / totalAges) * 100);
            const middleAgedPercent = Math.round((ageGroups.middle_aged / totalAges) * 100);
            const elderlyPercent = Math.round((ageGroups.elderly / totalAges) * 100);
            
            // Phát hiện nhóm tuổi chiếm đa số
            if (youngPercent >= 50) {
                recommendations += `<li><strong>Phát hiện ${youngPercent}% khách hàng trẻ (0-20 tuổi)</strong>: 
                Nên tăng cường nhân viên trẻ (20-35 tuổi). Nhân viên trẻ dễ đồng cảm và tương tác tốt với khách hàng trẻ.</li>`;
            }
            
            if (elderlyPercent >= 40) {
                recommendations += `<li><strong>Phát hiện ${elderlyPercent}% khách hàng cao tuổi (trên 60)</strong>: 
                Nên tăng cường nhân viên trung niên có kinh nghiệm. Nhân viên có kinh nghiệm phục vụ tốt hơn cho khách hàng cao tuổi.</li>`;
            }
            
            if (adultPercent + middleAgedPercent >= 60) {
                recommendations += `<li><strong>Phát hiện ${adultPercent + middleAgedPercent}% khách hàng trưởng thành (21-60 tuổi)</strong>: 
                Nên phân bổ nhân viên đa dạng về độ tuổi để phục vụ tốt nhất cho nhóm khách hàng chính.</li>`;
            }
        }
        
        // Khuyến nghị dựa trên phân bố giới tính
        const totalGender = data.male_count + data.female_count;
        if (totalGender > 0) {
            const malePercent = Math.round((data.male_count / totalGender) * 100);
            const femalePercent = Math.round((data.female_count / totalGender) * 100);
            
            if (malePercent >= 70) {
                recommendations += `<li><strong>Phát hiện ${malePercent}% khách hàng nam</strong>: 
                Nên cân đối nhân viên nam chiếm tỷ lệ cao hơn. Điều này tạo sự thoải mái và đồng điệu cho khách hàng nam.</li>`;
            } 
            else if (femalePercent >= 70) {
                recommendations += `<li><strong>Phát hiện ${femalePercent}% khách hàng nữ</strong>: 
                Nên tăng cường nhân viên nữ phục vụ. Phụ nữ thường thoải mái hơn khi được nhân viên nữ tư vấn.</li>`;
            }
            else {
                recommendations += '<li>Tỷ lệ nam/nữ tương đối cân bằng: Nên duy trì số lượng nhân viên nam và nữ tương đương.</li>';
            }
        }
        
        // Bổ sung khuyến nghị về cập nhật liên tục
        if (data.total_count > 3) {
            recommendations += '<li><i>Lưu ý: Hệ thống đang theo dõi sự thay đổi cơ cấu khách hàng theo thời gian thực. Đề xuất sẽ được cập nhật tự động khi phát hiện thay đổi > 20% trong cơ cấu khách hàng.</i></li>';
        }
        
        recommendations += '</ul>';
    }
    
    recommendationsElement.innerHTML = recommendations;
    
    // Remove the code that updates event recommendations
}

// Capture current video frame
function captureImage() {
    if (isVideoPaused) {
        showError('Video Paused', 'Please resume the video before capturing an image.');
        return;
    }
    
    // Create canvas to capture frame
    const canvas = document.createElement('canvas');
    const video = document.getElementById('videoFeed');
    
    // Check if video is available
    if (!video || !video.complete) {
        showError('Video Not Ready', 'The video feed is not ready for capture. Please wait.');
        return;
    }
    
    // Set canvas dimensions to match video
    canvas.width = video.width;
    canvas.height = video.height;
    
    // Draw video frame to canvas
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get image data as base64
    capturedImageData = canvas.toDataURL('image/jpeg');
    
    // Display in modal
    const capturedImage = document.getElementById('capturedImage');
    capturedImage.src = capturedImageData;
    
    // Analyze the captured image
    analyzeImage(capturedImageData);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('capturedImageModal'));
    modal.show();
}

// Analyze captured image using backend API
function analyzeImage(imageData) {
    const analysisElement = document.getElementById('capturedImageAnalysis');
    analysisElement.innerHTML = '<p class="text-center"><i class="bi bi-arrow-repeat spinning"></i> Đang phân tích ảnh...</p>';
    
    fetch(`${API_URL}/analyze`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageData }),
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Image analysis failed');
            }
            return response.json();
        })
        .then(data => {
            // Display analysis results
            let analysis = `<h5>Kết Quả Phân Tích</h5>
                            <p>Tổng số người: <strong>${data.total_count}</strong></p>
                            <div class="row">
                                <div class="col-6">
                                    <p>Nam: <strong>${data.male_count}</strong></p>
                                </div>
                                <div class="col-6">
                                    <p>Nữ: <strong>${data.female_count}</strong></p>
                                </div>
                            </div>
                            <h6>Phân Bố Độ Tuổi:</h6>
                            <ul>
                                <li>Trẻ (0-20): <strong>${data.age_groups.young}</strong></li>
                                <li>Thanh niên (21-40): <strong>${data.age_groups.adult}</strong></li>
                                <li>Trung niên (41-60): <strong>${data.age_groups.middle_aged}</strong></li>
                                <li>Cao tuổi (60+): <strong>${data.age_groups.elderly}</strong></li>
                            </ul>`;
            
            analysisElement.innerHTML = analysis;
        })
        .catch(error => {
            console.error('Error analyzing image:', error);
            analysisElement.innerHTML = '<p class="text-danger">Không thể phân tích ảnh. Vui lòng thử lại.</p>';
        });
}

// Save captured image to device
function saveImage() {
    if (!capturedImageData) {
        return;
    }
    
    // Create a link element to download the image
    const link = document.createElement('a');
    link.download = `customer-snapshot-${new Date().toISOString().replace(/:/g, '-')}.jpg`;
    link.href = capturedImageData;
    link.click();
}

// Show error message
function showError(title, message) {
    // You can implement a toast or alert system here
    console.error(`${title}: ${message}`);
    alert(`${title}: ${message}`);
}

// Add a class for spinning icons
document.head.insertAdjacentHTML('beforeend', `
    <style>
        .spinning {
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
    </style>
`);

// Check for active events and update the event report section
function checkActiveEvents() {
    const eventStatus = document.getElementById('eventStatus');
    const eventStatusText = document.getElementById('eventStatusText');
    const eventReportContent = document.getElementById('eventReportContent');
    const noEventContent = document.getElementById('noEventContent');
    const activeEventsContainer = document.getElementById('activeEventsContainer');
    
    // Show loading state
    if (eventStatus) {
        eventStatus.className = 'alert alert-info border-0 shadow-sm mb-4 d-flex align-items-center';
        eventStatusText.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i> Đang kiểm tra sự kiện...';
    }
    
    fetch(`${API_URL}/api/events/active`)
        .then(response => response.json())
        .then(events => {
            if (Array.isArray(events) && events.length > 0) {
                // Show event status
                eventStatus.className = 'alert alert-success border-0 shadow-sm mb-4 d-flex align-items-center';
                eventStatusText.innerHTML = `<i class="bi bi-calendar-check me-2"></i> Đang có ${events.length} sự kiện diễn ra`;
                
                // Show event content and hide no-event message
                if (eventReportContent) eventReportContent.style.display = 'block';
                if (noEventContent) noEventContent.style.display = 'none';
                
                // Clear previous events
                if (activeEventsContainer) activeEventsContainer.innerHTML = '';
                
                // Add each event
                events.forEach(event => {
                    const eventCard = createEventCard(event);
                    if (activeEventsContainer) activeEventsContainer.appendChild(eventCard);
                });
            } else {
                // No active events
                eventStatus.className = 'alert alert-secondary border-0 shadow-sm mb-4 d-flex align-items-center';
                eventStatusText.innerHTML = '<i class="bi bi-calendar-x me-2"></i> Không có sự kiện nào đang diễn ra';
                
                // Hide event content and show no-event message
                if (eventReportContent) eventReportContent.style.display = 'none';
                if (noEventContent) noEventContent.style.display = 'block';
            }
        })
        .catch(error => {
            console.error('Error checking for active events:', error);
            eventStatus.className = 'alert alert-danger border-0 shadow-sm mb-4 d-flex align-items-center';
            eventStatusText.innerHTML = '<i class="bi bi-exclamation-triangle me-2"></i> Lỗi khi kiểm tra sự kiện';
        });
}

// Create event card without target/visitor metrics
function createEventCard(event) {
    const startDate = new Date(event.start_date).toLocaleDateString();
    const endDate = new Date(event.end_date).toLocaleDateString();
    
    const card = document.createElement('div');
    card.className = 'card mb-3 shadow-sm';
    
    // Format event type for display
    let eventTypeLabel = 'Sự kiện';
    switch (event.type) {
        case 'Khuyến mãi': eventTypeLabel = 'Khuyến mãi'; break;
        case 'Giảm giá': eventTypeLabel = 'Giảm giá'; break;
        case 'Ra mắt sản phẩm': eventTypeLabel = 'Ra mắt sản phẩm'; break;
        case 'Ngày hội khách hàng': eventTypeLabel = 'Ngày hội khách hàng'; break;
    }
    
    card.innerHTML = `
        <div class="card-header bg-primary text-white">
            <h5 class="mb-0">${event.name}</h5>
        </div>
        <div class="card-body">
            <div class="row mb-3">
                <div class="col-md-6">
                    <p class="mb-1"><strong>Loại sự kiện:</strong> ${eventTypeLabel}</p>
                    <p class="mb-1"><strong>Thời gian:</strong> ${startDate} - ${endDate}</p>
                </div>
                <div class="col-md-6">
                    <p class="mb-1"><strong>Mô tả:</strong></p>
                    <p class="text-muted">${event.description || 'Không có mô tả'}</p>
                </div>
            </div>
        </div>
    `;
    
    return card;
}

// Update event effectiveness based on customer data
function updateEventEffectiveness(data) {
    // Check for active events but don't update visitor counts
    fetch(`${API_URL}/api/events/active`)
        .then(response => response.json())
        .then(events => {
            if (Array.isArray(events) && events.length > 0) {
                // We have active events, but we're not displaying metrics now
                console.log("Active events found, but metrics display is disabled");
            }
        })
        .catch(error => console.error('Error checking for active events:', error));
}

// Add click handler for the "View All Events" button
document.addEventListener('DOMContentLoaded', function() {
    // ...existing code...
    
    // Initial fetch of active events
    if (isUserLoggedIn()) {
        fetchActiveEvents();
        
        // Set up periodic refresh of events (every 5 minutes)
        setInterval(fetchActiveEvents, 5 * 60 * 1000);
    }
});

// Check for active events and display event information
function checkActiveEvents() {
    const eventStatus = document.getElementById('eventStatus');
    const eventStatusText = document.getElementById('eventStatusText');
    const eventReportContent = document.getElementById('eventReportContent');
    const noEventContent = document.getElementById('noEventContent');
    const activeEventsContainer = document.getElementById('activeEventsContainer');
    
    fetch(`${API_URL}/api/events/active`)
        .then(response => response.json())
        .then(events => {
            if (events && events.length > 0) {
                // We have active events
                eventStatus.className = 'alert alert-success border-0 shadow-sm mb-4 d-flex align-items-center';
                eventStatusText.textContent = `Có ${events.length} sự kiện đang diễn ra`;
                eventReportContent.style.display = 'block';
                noEventContent.style.display = 'none';
                
                // Clear previous event cards
                activeEventsContainer.innerHTML = '';
                
                // Add event cards for each active event
                events.forEach(event => {
                    // Parse JSON strings to objects if needed
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
                    
                    // Create event card with complete information
                    const eventCard = `
                        <div class="card mb-3 shadow-sm event-card">
                            <div class="card-header d-flex justify-content-between align-items-center">
                                <h5 class="mb-0">${event.name}</h5>
                                <span class="badge bg-primary">Đang diễn ra</span>
                            </div>
                            <div class="card-body">
                                <div class="row mb-2">
                                    <div class="col-md-6">
                                        <p class="mb-1"><strong>Thời gian:</strong> ${startDate} - ${endDate}</p>
                                        <p class="mb-1"><strong>Loại sự kiện:</strong> ${event.type || 'Không xác định'}</p>
                                    </div>
                                    <div class="col-md-6">
                                        <p class="mb-1"><strong>Độ tuổi mục tiêu:</strong> ${audienceBadges || 'Không xác định'}</p>
                                        <p class="mb-1"><strong>Giới tính mục tiêu:</strong> ${genderBadge}</p>
                                    </div>
                                </div>
                                
                                <div class="mb-3">
                                    <p class="mb-1"><strong>Mô tả:</strong></p>
                                    <p class="text-muted">${event.description || 'Không có mô tả'}</p>
                                </div>
                            </div>
                        </div>
                    `;
                    
                    activeEventsContainer.innerHTML += eventCard;
                });
                
                // Update event visitor counts based on current detected faces
                updateEventStats(events);
            } else {
                // No active events
                eventStatus.className = 'alert alert-secondary border-0 shadow-sm mb-4 d-flex align-items-center';
                eventStatusText.textContent = 'Không có sự kiện nào đang diễn ra';
                eventReportContent.style.display = 'none';
                noEventContent.style.display = 'block';
            }
        })
        .catch(error => {
            console.error('Error checking for active events:', error);
            eventStatus.className = 'alert alert-warning border-0 shadow-sm mb-4 d-flex align-items-center';
            eventStatusText.textContent = 'Không thể kiểm tra sự kiện. Vui lòng thử lại sau.';
        });
}

// New function to update event statistics based on detected faces
function updateEventStats(events) {
    if (!events || !events.length) return;
    
    // Get latest analysis data
    fetch(`${API_URL}/latest_analysis`)
        .then(response => response.json())
        .then(data => {
            // Update each active event's statistics
            events.forEach(event => {
                // Calculate match percentage based on target audience and gender
                let matchedCount = 0;
                let totalCount = data.total_count || 0;
                
                if (totalCount === 0) return; // Skip if no people detected
                
                const targetAudience = typeof event.target_audience === 'string' 
                    ? JSON.parse(event.target_audience) 
                    : event.target_audience;
                
                // Count people matching target age groups
                if (Array.isArray(targetAudience) && targetAudience.length > 0) {
                    targetAudience.forEach(audience => {
                        matchedCount += data.age_groups[audience] || 0;
                    });
                }
                
                // Further filter by target gender if specified
                if (event.target_gender === 'male') {
                    matchedCount = Math.min(matchedCount, data.male_count);
                } else if (event.target_gender === 'female') {
                    matchedCount = Math.min(matchedCount, data.female_count);
                }
                
                // Calculate match percentage
                const matchPercent = totalCount > 0 ? Math.round((matchedCount / totalCount) * 100) : 0;
                
                // Update the event stats in the database
                fetch(`${API_URL}/api/events/${event.id}/stats`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        visitor_count: totalCount,
                        target_match_percent: matchPercent
                    })
                })
                .catch(error => console.error(`Error updating stats for event ${event.id}:`, error));
            });
        })
        .catch(error => console.error('Error fetching analysis data for event stats:', error));
}
// ...existing code...

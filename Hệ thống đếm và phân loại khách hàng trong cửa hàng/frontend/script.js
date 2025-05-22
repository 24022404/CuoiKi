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
    
    // Set loading state
    eventStatusText.textContent = "Đang tải dữ liệu sự kiện...";
    eventStatus.className = "alert alert-primary border-0 shadow-sm mb-4 d-flex align-items-center";
    
    // Fetch active events from API
    fetch(`${API_URL}/api/events/active`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(events => {
        if (events && Array.isArray(events) && events.length > 0) {
            // We have active events
            eventStatusText.textContent = `Đang diễn ra ${events.length} sự kiện`;
            eventStatus.className = "alert alert-success border-0 shadow-sm mb-4 d-flex align-items-center";
            
            // Show event content and hide no-event message
            eventReportContent.classList.remove('d-none');
            noEventContent.style.display = 'none';
            
            // Clear previous events
            activeEventsContainer.innerHTML = '';
            
            // Render each event
            events.forEach(event => renderEventCard(event, activeEventsContainer));
        } else {
            // No active events
            eventStatusText.textContent = "Không có sự kiện nào đang diễn ra";
            eventStatus.className = "alert alert-info border-0 shadow-sm mb-4 d-flex align-items-center";
            
            // Hide event content and show no-event message
            eventReportContent.classList.add('d-none');
            noEventContent.style.display = 'block';
        }
    })
    .catch(error => {
        console.error('Error fetching events:', error);
        eventStatusText.textContent = "Lỗi khi tải dữ liệu sự kiện";
        eventStatus.className = "alert alert-danger border-0 shadow-sm mb-4 d-flex align-items-center";
        
        // Hide event content and show no-event message
        eventReportContent.classList.add('d-none');
        noEventContent.style.display = 'block';
    });
}

// Add function to render an event card
function renderEventCard(event, container) {
    // Format dates for display
    const startDate = new Date(event.start_date).toLocaleString();
    const endDate = new Date(event.end_date).toLocaleString();
    
    // Create the event card element
    const eventCard = document.createElement('div');
    eventCard.className = 'card event-card mb-3';
    eventCard.innerHTML = `
        <div class="card-body p-4" style="background: linear-gradient(135deg, #f8f9fa, #e2f0fb);">
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <div class="d-flex align-items-center mb-2">
                        <span class="badge bg-success me-2 pulse-animation">ĐANG DIỄN RA</span>
                        <h5 class="card-title fw-bold mb-0">${event.name}</h5>
                    </div>
                    <p class="text-muted mb-3">${event.description || 'Không có mô tả'}</p>
                </div>
                <div class="text-end">
                    <span class="badge ${getEventTypeBadgeClass(event.type)}">${formatEventType(event.type)}</span>
                </div>
            </div>
            
            <div class="row mt-3">
                <div class="col-md-6">
                    <div class="event-info-item d-flex">
                        <i class="bi bi-clock-fill text-primary me-2"></i>
                        <div>
                            <p class="text-muted small mb-0">Bắt đầu</p>
                            <p class="fw-medium mb-2">${startDate}</p>
                        </div>
                    </div>
                    <div class="event-info-item d-flex">
                        <i class="bi bi-clock-history text-primary me-2"></i>
                        <div>
                            <p class="text-muted small mb-0">Kết thúc</p>
                            <p class="fw-medium mb-0">${endDate}</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="event-info-item d-flex">
                        <i class="bi bi-people-fill text-primary me-2"></i>
                        <div>
                            <p class="text-muted small mb-0">Đối tượng mục tiêu</p>
                            <div class="event-badge-container">
                                ${renderAudienceBadges(event.target_audience)}
                            </div>
                        </div>
                    </div>
                    <div class="event-info-item d-flex mt-2">
                        <i class="bi bi-gender-ambiguous text-primary me-2"></i>
                        <div>
                            <p class="text-muted small mb-0">Giới tính mục tiêu</p>
                            <span class="badge ${getGenderBadgeClass(event.target_gender)}">${formatGender(event.target_gender)}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="mt-3 pt-2 border-top">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <span class="text-primary"><i class="bi bi-people"></i> Khách: <strong>${event.visitor_count || 0}</strong></span>
                        <span class="ms-3 text-success"><i class="bi bi-bullseye"></i> Đúng đối tượng: <strong>${event.target_match_percent || 0}%</strong></span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add to container
    container.appendChild(eventCard);
}

// Helper functions for event display
function getEventTypeBadgeClass(type) {
    switch (type) {
        case 'promotion': return 'bg-warning';
        case 'sale': return 'bg-danger';
        case 'product_launch': return 'bg-info';
        case 'customer_day': return 'bg-success';
        default: return 'bg-secondary';
    }
}

function formatEventType(type) {
    switch (type) {
        case 'promotion': return 'Khuyến mãi';
        case 'sale': return 'Giảm giá';
        case 'product_launch': return 'Ra mắt sản phẩm';
        case 'customer_day': return 'Ngày hội khách hàng';
        default: return 'Khác';
    }
}

function getGenderBadgeClass(gender) {
    switch (gender) {
        case 'male': return 'bg-info';
        case 'female': return 'bg-danger';
        default: return 'bg-secondary';
    }
}

function formatGender(gender) {
    switch (gender) {
        case 'male': return 'Nam';
        case 'female': return 'Nữ';
        default: return 'Tất cả';
    }
}

function renderAudienceBadges(targetAudience) {
    if (!targetAudience || !Array.isArray(targetAudience) || targetAudience.length === 0) {
        return '<span class="badge bg-secondary">Tất cả</span>';
    }
    
    const badges = {
        'young': '<span class="badge bg-success me-1">Trẻ (0-20)</span>',
        'adult': '<span class="badge bg-info me-1">Thanh niên (21-40)</span>',
        'middle_aged': '<span class="badge bg-warning me-1">Trung niên (41-60)</span>',
        'elderly': '<span class="badge bg-danger me-1">Cao tuổi (60+)</span>'
    };
    
    return targetAudience.map(audience => badges[audience] || '').join('');
}

// View event details function (placeholder)
function viewEventDetails(eventId) {
    console.log(`Viewing details for event ${eventId}`);
    // This would typically open a modal or navigate to a details page
    alert(`Đang xem chi tiết sự kiện: ${eventId}`);
}

// Update init function to check for active events
document.addEventListener('DOMContentLoaded', function() {
    // ...existing code...
    
    // Check active events if user is logged in
    if (checkLoginStatus()) {
        // Fetch initial data
        fetchCustomerCounts();
        
        // Check for active events
        checkActiveEvents();
        
        // Set up intervals
        setInterval(fetchCustomerCounts, 5000);
        setInterval(checkActiveEvents, 30000); // Check events every 30 seconds
    }
});

// Update event details in the UI
function updateEventDetails(event) {
    document.getElementById('eventName').textContent = event.name;
    
    // Format dates for display
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);
    
    document.getElementById('eventStartTime').textContent = startDate.toLocaleString();
    document.getElementById('eventEndTime').textContent = endDate.toLocaleString();
    
    // Format and display target audience
    let targetAudienceText = '-';
    if (event.target_audience && Array.isArray(event.target_audience) && event.target_audience.length > 0) {
        const audienceLabels = {
            'young': 'Trẻ (0-20)',
            'adult': 'Thanh niên (21-40)',
            'middle_aged': 'Trung niên (41-60)',
            'elderly': 'Cao tuổi (60+)'
        };
        
        targetAudienceText = event.target_audience
            .map(audience => audienceLabels[audience] || audience)
            .join(', ');
    }
    document.getElementById('eventTargetAudience').textContent = targetAudienceText;
    
    // Format and display target gender
    let targetGenderText = '-';
    switch(event.target_gender) {
        case 'male':
            targetGenderText = 'Nam';
            break;
        case 'female':
            targetGenderText = 'Nữ';
            break;
        case 'all':
            targetGenderText = 'Tất cả';
            break;
        default:
            targetGenderText = event.target_gender || 'Tất cả';
    }
    document.getElementById('eventTargetGender').textContent = targetGenderText;
}

// Analyze event effectiveness based on customer data and event targets
function analyzeEventEffectiveness(event) {
    // Fetch latest customer analytics
    fetch(`${API_URL}/latest_analysis`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch analytics data');
            }
            return response.json();
        })
        .then(data => {
            const targetAudience = Array.isArray(event.target_audience) ? event.target_audience : [];
            const targetGender = event.target_gender || 'all';
            
            // Calculate audience match percentage
            let audienceMatches = 0;
            let totalCustomers = data.total_count || 0;
            
            if (totalCustomers === 0) {
                return;
            }
            
            // Calculate how many customers match the target demographics
            if (targetAudience.includes('young')) {
                audienceMatches += data.age_groups.young || 0;
            }
            if (targetAudience.includes('adult')) {
                audienceMatches += data.age_groups.adult || 0;
            }
            if (targetAudience.includes('middle_aged')) {
                audienceMatches += data.age_groups.middle_aged || 0;
            }
            if (targetAudience.includes('elderly')) {
                audienceMatches += data.age_groups.elderly || 0;
            }
            
            // Adjust for gender target if specified
            if (targetGender === 'male') {
                const maleRatio = data.male_count / totalCustomers;
                audienceMatches = Math.round(audienceMatches * maleRatio);
            } else if (targetGender === 'female') {
                const femaleRatio = data.female_count / totalCustomers;
                audienceMatches = Math.round(audienceMatches * femaleRatio);
            }
            
            // Calculate match percentage
            const matchPercent = Math.round((audienceMatches / totalCustomers) * 100);
            
            // Save event statistics to database via API but don't update UI displays
            updateEventStats(event.id, totalCustomers, matchPercent, audienceMatches);
        })
        .catch(error => {
            console.error('Error analyzing event effectiveness:', error);
        });
}

// Update event statistics in the database
function updateEventStats(eventId, visitorCount, matchPercent, targetMatches) {
    console.log(`Updating event stats: ID=${eventId}, visitors=${visitorCount}, matches=${targetMatches}, percent=${matchPercent}%`);
    
    fetch(`${API_URL}/api/events/${eventId}/stats`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            visitor_count: visitorCount,
            target_match_percent: matchPercent,
            target_matches: targetMatches
        })
    })
    .then(response => {
        if (!response.ok) {
            console.error('Failed to update event statistics', response.status, response.statusText);
            throw new Error('Failed to update event statistics');
        }
        return response.json();
    })
    .then(data => {
        console.log('Event statistics updated successfully:', data);
    })
    .catch(error => {
        console.error('Error updating event statistics:', error);
    });
}

// Add this function to update event information including new target audience and gender fields
function updateEventInformation(eventData) {
    // Update event basic information
    document.getElementById('eventName').textContent = eventData.name || '-';
    document.getElementById('eventStartTime').textContent = formatDateTime(eventData.start_date) || '-';
    document.getElementById('eventEndTime').textContent = formatDateTime(eventData.end_date) || '-';
    
    // Format and display target audience
    let targetAudienceText = '-';
    if (eventData.target_audience && Array.isArray(eventData.target_audience) && eventData.target_audience.length > 0) {
        const audienceLabels = {
            'young': 'Trẻ (0-20)',
            'adult': 'Thanh niên (21-40)',
            'middle_aged': 'Trung niên (41-60)',
            'elderly': 'Cao tuổi (60+)'
        };
        
        targetAudienceText = eventData.target_audience
            .map(audience => audienceLabels[audience] || audience)
            .join(', ');
    }
    document.getElementById('eventTargetAudience').textContent = targetAudienceText;
    
    // Format and display target gender
    let targetGenderText = '-';
    switch(eventData.target_gender) {
        case 'male':
            targetGenderText = 'Nam';
            break;
        case 'female':
            targetGenderText = 'Nữ';
            break;
        case 'all':
            targetGenderText = 'Tất cả';
            break;
        default:
            targetGenderText = eventData.target_gender || 'Tất cả';
    }
    document.getElementById('eventTargetGender').textContent = targetGenderText;
}

// Helper function to format date and time
function formatDateTime(dateTimeStr) {
    if (!dateTimeStr) return '-';
    
    try {
        const date = new Date(dateTimeStr);
        return date.toLocaleString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        console.error('Error formatting date:', e);
        return dateTimeStr;
    }
}

// Update event effectiveness based on customer data
function updateEventEffectiveness(data) {
    // Get current active event if any
    fetch(`${API_URL}/api/events/active`)
        .then(response => response.json())
        .then(event => {
            if (event) {
                analyzeEventEffectiveness(event);
            }
        })
        .catch(error => console.error('Error checking for active event:', error));
}

// Analyze event effectiveness based on customer data and event targets
function analyzeEventEffectiveness(event) {
    // Fetch latest customer analytics
    fetch(`${API_URL}/latest_analysis`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch analytics data');
            }
            return response.json();
        })
        .then(data => {
            console.log('Event effectiveness analysis data:', data);
            console.log('Event target settings:', event);
            
            // Validate target audience is an array
            const targetAudience = Array.isArray(event.target_audience) ? event.target_audience : [];
            const targetGender = event.target_gender || 'all';
            
            // Calculate audience match percentage
            let audienceMatches = 0;
            let totalCustomers = data.total_count || 0;
            
            if (totalCustomers === 0) {
                console.log('No customers detected, skipping target audience calculation');
                return;
            }
            
            // Ensure age_groups object exists
            const ageGroups = data.age_groups || {};
            console.log('Age groups data:', ageGroups);
            
            // Calculate how many customers match the target demographics with better validation
            if (targetAudience.includes('young') && typeof ageGroups.young === 'number') {
                audienceMatches += ageGroups.young;
                console.log(`Added ${ageGroups.young} young customers to match count`);
            }
            if (targetAudience.includes('adult') && typeof ageGroups.adult === 'number') {
                audienceMatches += ageGroups.adult;
                console.log(`Added ${ageGroups.adult} adult customers to match count`);
            }
            if (targetAudience.includes('middle_aged') && typeof ageGroups.middle_aged === 'number') {
                audienceMatches += ageGroups.middle_aged;
                console.log(`Added ${ageGroups.middle_aged} middle-aged customers to match count`);
            }
            if (targetAudience.includes('elderly') && typeof ageGroups.elderly === 'number') {
                audienceMatches += ageGroups.elderly;
                console.log(`Added ${ageGroups.elderly} elderly customers to match count`);
            }
            
            console.log(`Initial audience matches (age only): ${audienceMatches}`);
            
            // Adjust for gender target if specified with validation against division by zero
            if (targetGender === 'male' && data.male_count > 0 && totalCustomers > 0) {
                const maleRatio = data.male_count / totalCustomers;
                const previousMatches = audienceMatches;
                audienceMatches = Math.round(audienceMatches * maleRatio);
                console.log(`Applied male filter: ${previousMatches} * ${maleRatio} = ${audienceMatches}`);
            } else if (targetGender === 'female' && data.female_count > 0 && totalCustomers > 0) {
                const femaleRatio = data.female_count / totalCustomers;
                const previousMatches = audienceMatches;
                audienceMatches = Math.round(audienceMatches * femaleRatio);
                console.log(`Applied female filter: ${previousMatches} * ${femaleRatio} = ${audienceMatches}`);
            }
            
            // Default to at least 0 matches (prevent negative numbers)
            audienceMatches = Math.max(0, audienceMatches);
            
            // Calculate match percentage with validation against division by zero
            const matchPercent = totalCustomers > 0 ? Math.round((audienceMatches / totalCustomers) * 100) : 0;
            
            console.log(`Final calculation: ${audienceMatches} matches out of ${totalCustomers} customers (${matchPercent}%)`);
            
            // Update UI with target audience matches - ensure elements exist before updating
            const eventTargetVisitors = document.getElementById('eventTargetVisitors');
            if (eventTargetVisitors) {
                eventTargetVisitors.textContent = audienceMatches;
                // Add data attribute for tracking
                eventTargetVisitors.setAttribute('data-match-percent', matchPercent);
                console.log(`Updated eventTargetVisitors element with value: ${audienceMatches}`);
            } else {
                console.warn('eventTargetVisitors element not found in DOM');
            }
            
            // Also update the total visitors count to ensure consistency
            const eventTotalVisitors = document.getElementById('eventTotalVisitors');
            if (eventTotalVisitors) {
                eventTotalVisitors.textContent = totalCustomers;
                console.log(`Updated eventTotalVisitors element with value: ${totalCustomers}`);
            } else {
                console.warn('eventTotalVisitors element not found in DOM');
            }
            
            // Save event statistics to database via API with target matches info
            updateEventStats(event.id, totalCustomers, matchPercent, audienceMatches);
        })
        .catch(error => {
            console.error('Error analyzing event effectiveness:', error);
        });
}

// Generate staff recommendations for the current event - Function kept for reference but not called
function generateEventStaffRecommendations(event, data) {
    // This function is no longer used as the staff recommendations section has been removed
    // Code kept for reference
}

// Update the function to fetch active events
async function fetchActiveEvents() {
    try {
        // Use the active events endpoint instead of the general events endpoint
        const response = await fetch(`${API_URL}/api/events/active`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch active events');
        }

        const activeEvents = await response.json();
        
        // Update UI based on whether there are active events
        const eventStatus = document.getElementById('eventStatus');
        const eventStatusText = document.getElementById('eventStatusText');
        const eventReportContent = document.getElementById('eventReportContent');
        const noEventContent = document.getElementById('noEventContent');
        const activeEventsContainer = document.getElementById('activeEventsContainer');
        
        // Clear previous events
        activeEventsContainer.innerHTML = '';
        
        if (activeEvents && activeEvents.length > 0) {
            // Show report content and hide no event message
            eventReportContent.classList.remove('d-none');
            noEventContent.classList.add('d-none');
            
            // Update status message
            eventStatus.classList.remove('alert-info', 'alert-warning');
            eventStatus.classList.add('alert-success');
            eventStatusText.textContent = `Đang có ${activeEvents.length} sự kiện diễn ra`;
            
            // Create a card for each active event
            activeEvents.forEach(event => {
                const eventCard = createEventCard(event);
                activeEventsContainer.appendChild(eventCard);
            });
        } else {
            // Show no event message and hide report content
            eventReportContent.classList.add('d-none');
            noEventContent.classList.remove('d-none');
            
            // Update status message
            eventStatus.classList.remove('alert-success', 'alert-warning');
            eventStatus.classList.add('alert-info');
            eventStatusText.textContent = 'Không có sự kiện nào đang diễn ra';
        }
        
        return activeEvents;
    } catch (error) {
        console.error('Error fetching active events:', error);
        // Show error status
        const eventStatus = document.getElementById('eventStatus');
        const eventStatusText = document.getElementById('eventStatusText');
        
        eventStatus.classList.remove('alert-success', 'alert-info');
        eventStatus.classList.add('alert-warning');
        eventStatusText.textContent = 'Lỗi khi tải dữ liệu sự kiện';
        
        return [];
    }
}

// Helper function to create an event card
function createEventCard(event) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card border-0 bg-gradient shadow-sm mb-3 event-card';
    cardDiv.style.background = 'linear-gradient(135deg, #f8f9fa, #e2f0fb)';
    
    // Format the target audience for display
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
            genderBadge = '<span class="badge bg-primary">Nam</span>';
            break;
        case 'female':
            genderBadge = '<span class="badge bg-danger">Nữ</span>';
            break;
        default:
            genderBadge = '<span class="badge bg-secondary">Tất cả</span>';
            break;
    }
    
    // Format dates
    const startDate = new Date(event.start_date).toLocaleString('vi-VN');
    const endDate = new Date(event.end_date).toLocaleString('vi-VN');
    
    cardDiv.innerHTML = `
        <div class="card-body p-4">
            <div class="d-flex align-items-center mb-3">
                <span class="badge bg-success me-2 pulse-animation">ĐANG DIỄN RA</span>
                <h5 class="card-title fw-bold mb-0">${event.name}</h5>
            </div>
            
            <div class="row mt-3">
                <div class="col-md-6">
                    <div class="event-info-item">
                        <i class="bi bi-clock-fill text-primary me-2"></i>
                        <div>
                            <p class="text-muted small mb-0">Thời gian bắt đầu</p>
                            <p class="fw-medium mb-3">${startDate}</p>
                        </div>
                    </div>
                    <div class="event-info-item">
                        <i class="bi bi-clock-history text-primary me-2"></i>
                        <div>
                            <p class="text-muted small mb-0">Thời gian kết thúc</p>
                            <p class="fw-medium mb-0">${endDate}</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="event-info-item">
                        <i class="bi bi-people-fill text-primary me-2"></i>
                        <div>
                            <p class="text-muted small mb-0">Đối tượng mục tiêu</p>
                            <div class="event-badge-container">${audienceBadges}</div>
                        </div>
                    </div>
                    <div class="event-info-item">
                        <i class="bi bi-gender-ambiguous text-primary me-2"></i>
                        <div>
                            <p class="text-muted small mb-0">Giới tính mục tiêu</p>
                            <div>${genderBadge}</div>
                        </div>
                    </div>
                </div>
            </div>
            
            ${event.description ? `
            <div class="mt-3 pt-3 border-top">
                <p class="text-muted small mb-1">Mô tả</p>
                <p class="mb-0">${event.description}</p>
            </div>
            ` : ''}
        </div>
    `;
    
    return cardDiv;
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

// ...existing code...

// Global variables
let isVideoPaused = false;
let videoFeed = null;
let capturedImageData = null;
const API_URL = 'http://localhost:5000';

// DOM elements
document.addEventListener('DOMContentLoaded', () => {
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
}

// Generate staffing recommendations based on customer data
function generateRecommendations(data) {
    const recommendationsElement = document.getElementById('recommendations');
    let recommendations = '';
    
    // Tạo khuyến nghị dựa trên số lượng khách hàng
    if (data.total_count === 0) {
        recommendations = '<p>Chưa phát hiện khách hàng nào. Đảm bảo camera đang hoạt động và có người trong tầm nhìn.</p>';
    } else {
        recommendations = '<h6>Khuyến Nghị Nhân Sự:</h6><ul>';
        
        // Khuyến nghị dựa trên tổng số người
        if (data.total_count > 10) {
            recommendations += '<li>Đông khách: Cần bổ sung thêm nhân viên phục vụ.</li>';
        } else if (data.total_count > 5) {
            recommendations += '<li>Lượng khách trung bình: Duy trì số lượng nhân viên hiện tại.</li>';
        } else {
            recommendations += '<li>Ít khách: Có thể điều chuyển bớt nhân viên.</li>';
        }
        
        // Khuyến nghị dựa trên phân bố độ tuổi
        const ageGroups = data.age_groups;
        if (ageGroups.young > Math.max(ageGroups.adult, ageGroups.middle_aged, ageGroups.elderly)) {
            recommendations += '<li>Nhiều khách hàng trẻ: Nên bố trí nhân viên trẻ, năng động.</li>';
        } else if (ageGroups.elderly > Math.max(ageGroups.young, ageGroups.adult, ageGroups.middle_aged)) {
            recommendations += '<li>Nhiều khách hàng cao tuổi: Nên bố trí nhân viên có kinh nghiệm, kiên nhẫn.</li>';
        }
        
        // Khuyến nghị dựa trên giới tính
        if (data.male_count > data.female_count * 2) {
            recommendations += '<li>Đa số khách hàng nam: Cân nhắc điều chỉnh sản phẩm trưng bày phù hợp.</li>';
        } else if (data.female_count > data.male_count * 2) {
            recommendations += '<li>Đa số khách hàng nữ: Cân nhắc điều chỉnh sản phẩm trưng bày phù hợp.</li>';
        }
        
        recommendations += '</ul>';
    }
    
    recommendationsElement.innerHTML = recommendations;
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

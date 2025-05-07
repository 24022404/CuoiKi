// Configuration
const API_URL = 'http://localhost:5000';
let ageChart, historicalChart;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Check if backend is available
    checkBackendConnection();
    
    // Initialize charts
    initAgeChart();
    initHistoricalChart();
    
    // Start refreshing data
    refreshData();
    setInterval(refreshData, 5000);
    
    // Load historical data
    loadHistoricalData();
});

// Check if backend server is running
function checkBackendConnection() {
    // Try to get video feed
    const videoFeed = document.getElementById('video-feed');
    videoFeed.src = `${API_URL}/video_feed`;
    
    // Add error handling for video feed
    videoFeed.onerror = function() {
        showBackendError();
    };
    
    // Also do a direct check
    fetch(`${API_URL}/`)
        .then(response => {
            if (response.ok) {
                // Backend is running, nothing to do
                console.log("Backend connection successful");
            } else {
                showBackendError();
            }
        })
        .catch(error => {
            showBackendError();
        });
}

function showBackendError() {
    // Create error message
    const videoContainer = document.querySelector('.card-body.text-center');
    if (!document.getElementById('backend-error')) {
        const errorDiv = document.createElement('div');
        errorDiv.id = 'backend-error';
        errorDiv.className = 'alert alert-danger mt-3';
        errorDiv.innerHTML = `
            <strong>Không thể kết nối đến backend!</strong>
            <p>Đảm bảo rằng bạn đã chạy Flask backend với lệnh:</p>
            <pre>cd backend
python app.py</pre>
            <p>Backend phải đang chạy tại địa chỉ: ${API_URL}</p>
        `;
        videoContainer.appendChild(errorDiv);
    }
}

// Refresh current data
function refreshData() {
    fetch(`${API_URL}/latest_analysis`)
        .then(response => response.json())
        .then(data => {
            updateStatistics(data);
            updateAgeChart(data);
            generateStaffRecommendations(data);
        })
        .catch(error => {
            console.error('Error fetching latest analysis:', error);
            // Don't show error message here as we already handle it in checkBackendConnection
        });
}

// Update statistics display
function updateStatistics(data) {
    document.getElementById('total-count').textContent = data.total_count;
    document.getElementById('male-count').textContent = data.male_count;
    document.getElementById('female-count').textContent = data.female_count;
}

// Initialize age distribution chart
function initAgeChart() {
    const ctx = document.getElementById('age-chart').getContext('2d');
    ageChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Young (0-20)', 'Adult (21-40)', 'Middle-aged (41-60)', 'Elderly (60+)'],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: [
                    '#36A2EB',  // Blue
                    '#FFCE56',  // Yellow
                    '#4BC0C0',  // Teal
                    '#FF6384'   // Red
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            legend: {
                position: 'bottom'
            }
        }
    });
}

// Update age chart with new data
function updateAgeChart(data) {
    const ageGroups = data.age_groups;
    ageChart.data.datasets[0].data = [
        ageGroups.young,
        ageGroups.adult,
        ageGroups.middle_aged,
        ageGroups.elderly
    ];
    ageChart.update();
}

// Generate staff recommendations based on customer demographics
function generateStaffRecommendations(data) {
    const recommendationsElement = document.getElementById('staff-recommendations');
    const recommendations = [];
    
    // Clear previous recommendations
    recommendationsElement.innerHTML = '';
    
    // Total count recommendation
    if (data.total_count > 10) {
        recommendations.push({
            title: 'High Traffic Alert',
            text: `Currently ${data.total_count} customers in store. Consider adding more staff to the floor.`
        });
    } else if (data.total_count < 3) {
        recommendations.push({
            title: 'Low Traffic Alert',
            text: `Only ${data.total_count} customers in store. Consider reducing floor staff.`
        });
    }
    
    // Age-based recommendations
    const ageGroups = data.age_groups;
    if (ageGroups.young > ageGroups.adult && ageGroups.young > ageGroups.middle_aged && ageGroups.young > ageGroups.elderly) {
        recommendations.push({
            title: 'Young Customer Majority',
            text: 'Majority of customers are young. Consider assigning younger staff members who can better relate to their preferences.'
        });
    } else if (ageGroups.elderly > 0 && ageGroups.elderly >= ageGroups.young) {
        recommendations.push({
            title: 'Elderly Customers Present',
            text: 'Significant number of elderly customers. Ensure experienced staff are available to provide assistance.'
        });
    }
    
    // Gender-based recommendations
    if (data.male_count > 2 * data.female_count) {
        recommendations.push({
            title: 'Male-Dominated Customer Base',
            text: 'Currently more male customers. Consider adjusting staff accordingly.'
        });
    } else if (data.female_count > 2 * data.male_count) {
        recommendations.push({
            title: 'Female-Dominated Customer Base',
            text: 'Currently more female customers. Consider adjusting staff accordingly.'
        });
    }
    
    // Display recommendations
    if (recommendations.length === 0) {
        recommendationsElement.innerHTML = '<p>No specific recommendations at this time.</p>';
    } else {
        recommendations.forEach(rec => {
            const recBox = document.createElement('div');
            recBox.classList.add('recommendation-box');
            
            const recTitle = document.createElement('div');
            recTitle.classList.add('recommendation-title');
            recTitle.textContent = rec.title;
            
            const recText = document.createElement('div');
            recText.textContent = rec.text;
            
            recBox.appendChild(recTitle);
            recBox.appendChild(recText);
            recommendationsElement.appendChild(recBox);
        });
    }
}

// Initialize historical data chart
function initHistoricalChart() {
    const ctx = document.getElementById('historical-chart').getContext('2d');
    historicalChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Total Customers',
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    data: []
                },
                {
                    label: 'Male',
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    data: []
                },
                {
                    label: 'Female',
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    data: []
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                xAxes: [{
                    type: 'time',
                    time: {
                        unit: 'hour',
                        displayFormats: {
                            hour: 'MMM D, HH:mm'
                        }
                    },
                    scaleLabel: {
                        display: true,
                        labelString: 'Time'
                    }
                }],
                yAxes: [{
                    scaleLabel: {
                        display: true,
                        labelString: 'Count'
                    },
                    ticks: {
                        beginAtZero: true
                    }
                }]
            }
        }
    });
}

// Load historical data for charts
function loadHistoricalData() {
    fetch(`${API_URL}/historical_data`)
        .then(response => response.json())
        .then(data => {
            updateHistoricalChart(data);
        })
        .catch(error => console.error('Error fetching historical data:', error));
}

// Update historical chart with data
function updateHistoricalChart(data) {
    if (!data || data.length === 0) return;
    
    const labels = data.map(item => new Date(item.timestamp));
    const totalData = data.map(item => item.total_count);
    const maleData = data.map(item => item.male_count);
    const femaleData = data.map(item => item.female_count);
    
    historicalChart.data.labels = labels;
    historicalChart.data.datasets[0].data = totalData;
    historicalChart.data.datasets[1].data = maleData;
    historicalChart.data.datasets[2].data = femaleData;
    
    historicalChart.update();
}

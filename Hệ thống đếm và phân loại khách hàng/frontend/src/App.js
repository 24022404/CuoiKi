import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { Bar, Pie } from 'react-chartjs-2';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

function App() {
  const [stats, setStats] = useState({
    total_today: 0,
    current: 0,
    male: 0,
    female: 0,
    age_groups: {
      "0-18": 0,
      "19-30": 0,
      "31-50": 0,
      "50+": 0
    }
  });

  const [streaming, setStreaming] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [detectedFaces, setDetectedFaces] = useState([]);

  // Lấy thống kê từ API
  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    // Lấy thống kê ban đầu khi tải trang
    fetchStats();

    // Cập nhật thống kê mỗi 30 giây
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreaming(true);
        captureAndAnalyze();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setStreaming(false);
    }
  };

  const captureAndAnalyze = async () => {
    if (!streaming) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) return;
    
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Chuyển canvas thành blob để gửi lên server
    canvas.toBlob(async (blob) => {
      const formData = new FormData();
      formData.append('file', blob, 'capture.jpg');
      
      try {
        const response = await fetch('http://localhost:5000/api/detect-faces', {
          method: 'POST',
          body: formData,
        });
        
        const data = await response.json();
        if (data.status === 'success') {
          setDetectedFaces(data.faces);
          setStats(data.stats);
          
          // Vẽ khung xung quanh khuôn mặt được phát hiện
          if (data.faces && data.faces.length > 0) {
            data.faces.forEach(face => {
              // TODO: Vẽ khung và thông tin lên canvas
            });
          }
        }
      } catch (error) {
        console.error('Error analyzing image:', error);
      }
      
      // Tiếp tục phân tích nếu vẫn đang streaming
      if (streaming) {
        setTimeout(captureAndAnalyze, 1000);
      }
    });
  };

  // Cấu hình dữ liệu cho biểu đồ giới tính
  const genderData = {
    labels: ['Nam', 'Nữ'],
    datasets: [
      {
        data: [stats.male, stats.female],
        backgroundColor: ['#36A2EB', '#FF6384'],
        hoverBackgroundColor: ['#36A2EB', '#FF6384'],
      },
    ],
  };

  // Cấu hình dữ liệu cho biểu đồ độ tuổi
  const ageData = {
    labels: ['0-18', '19-30', '31-50', '50+'],
    datasets: [
      {
        label: 'Số lượng theo độ tuổi',
        data: [
          stats.age_groups['0-18'],
          stats.age_groups['19-30'],
          stats.age_groups['31-50'],
          stats.age_groups['50+'],
        ],
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
          'rgba(255, 159, 64, 0.6)',
          'rgba(255, 99, 132, 0.6)',
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <Container fluid className="app-container p-4">
      <h1 className="text-center mb-4">Hệ Thống Đếm và Phân Loại Khách Hàng</h1>
      
      <Row className="mb-4">
        <Col md={6}>
          <Card className="shadow">
            <Card.Header className="bg-primary text-white">
              <h3>Camera</h3>
            </Card.Header>
            <Card.Body className="text-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', maxHeight: '400px', display: streaming ? 'block' : 'none' }}
              />
              <canvas 
                ref={canvasRef} 
                style={{ display: 'none' }}
              />
              {!streaming ? (
                <div className="camera-placeholder">
                  <i className="fas fa-video fa-5x mb-3"></i>
                  <p>Camera không hoạt động</p>
                </div>
              ) : null}
              <div className="mt-3">
                {!streaming ? (
                  <Button variant="success" onClick={startCamera}>
                    <i className="fas fa-play me-2"></i>Bắt đầu Camera
                  </Button>
                ) : (
                  <Button variant="danger" onClick={stopCamera}>
                    <i className="fas fa-stop me-2"></i>Dừng Camera
                  </Button>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6}>
          <Card className="shadow h-100">
            <Card.Header className="bg-success text-white">
              <h3>Thống Kê</h3>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6} className="mb-3">
                  <Card className="stat-card bg-primary text-white">
                    <Card.Body className="text-center">
                      <h2>{stats.total_today}</h2>
                      <p>Tổng khách hôm nay</p>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6} className="mb-3">
                  <Card className="stat-card bg-success text-white">
                    <Card.Body className="text-center">
                      <h2>{stats.current}</h2>
                      <p>Khách hiện tại</p>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
              
              <Row className="mt-3">
                <Col md={6}>
                  <h4 className="text-center mb-2">Phân loại giới tính</h4>
                  <div style={{ height: '200px' }}>
                    <Pie data={genderData} options={{ maintainAspectRatio: false }} />
                  </div>
                </Col>
                <Col md={6}>
                  <h4 className="text-center mb-2">Phân loại độ tuổi</h4>
                  <div style={{ height: '200px' }}>
                    <Bar 
                      data={ageData} 
                      options={{ 
                        maintainAspectRatio: false,
                        scales: {
                          y: {
                            beginAtZero: true
                          }
                        }
                      }} 
                    />
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row>
        <Col>
          <Card className="shadow">
            <Card.Header className="bg-info text-white">
              <h3>Khách hàng được phát hiện</h3>
            </Card.Header>
            <Card.Body>
              <div className="detected-faces">
                {detectedFaces.length === 0 ? (
                  <p className="text-center">Chưa phát hiện khách hàng</p>
                ) : (
                  <Row>
                    {detectedFaces.map(face => (
                      <Col key={face.id} md={4} className="mb-3">
                        <Card>
                          <Card.Body>
                            <h5>{face.is_known ? 'Khách hàng cũ' : 'Khách hàng mới'}</h5>
                            <p>Giới tính: {face.gender === 'Man' ? 'Nam' : 'Nữ'}</p>
                            <p>Tuổi: {face.age} ({face.age_group})</p>
                            <p>Cảm xúc: {face.dominant_emotion}</p>
                          </Card.Body>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default App;

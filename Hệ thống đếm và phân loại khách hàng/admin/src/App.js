import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Form, Modal } from 'react-bootstrap';
import { Line, Pie, Bar } from 'react-chartjs-2';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { 
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';

// Đăng ký các thành phần Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

function App() {
  const [dashboardData, setDashboardData] = useState({
    current_stats: {
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
    },
    total_customers: 0,
    gender_stats: {
      male: 0,
      female: 0
    },
    age_groups: {
      "0-18": 0,
      "19-30": 0,
      "31-50": 0,
      "50+": 0
    },
    regular_customers: 0
  });
  
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [timeRange, setTimeRange] = useState('today');

  useEffect(() => {
    // Lấy dữ liệu tổng quan cho dashboard
    fetchDashboardData();
    
    // Lấy danh sách khách hàng
    fetchCustomers();
    
    // Cập nhật dữ liệu mỗi 30 giây
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/dashboard/summary');
      const data = await response.json();
      if (data.status === 'success') {
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/customers');
      const data = await response.json();
      if (data.status === 'success') {
        setCustomers(data.customers);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleCustomerClick = async (customerId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/customers/${customerId}`);
      const data = await response.json();
      if (data.status === 'success') {
        setSelectedCustomer(data);
        setShowCustomerModal(true);
      }
    } catch (error) {
      console.error('Error fetching customer details:', error);
    }
  };

  const handleResetStats = async () => {
    if (window.confirm('Bạn có chắc chắn muốn reset thống kê không?')) {
      try {
        const response = await fetch('http://localhost:5000/api/reset-stats', {
          method: 'POST'
        });
        const data = await response.json();
        if (data.message === 'Stats reset successfully') {
          alert('Đã reset thống kê thành công!');
          fetchDashboardData();
        }
      } catch (error) {
        console.error('Error resetting stats:', error);
        alert('Lỗi khi reset thống kê!');
      }
    }
  };

  // Cấu hình dữ liệu biểu đồ giới tính
  const genderData = {
    labels: ['Nam', 'Nữ'],
    datasets: [
      {
        data: [dashboardData.gender_stats.male, dashboardData.gender_stats.female],
        backgroundColor: ['#36A2EB', '#FF6384'],
        hoverBackgroundColor: ['#36A2EB', '#FF6384'],
      },
    ],
  };

  // Cấu hình dữ liệu biểu đồ độ tuổi
  const ageData = {
    labels: ['0-18', '19-30', '31-50', '50+'],
    datasets: [
      {
        label: 'Số lượng theo độ tuổi',
        data: [
          dashboardData.age_groups['0-18'],
          dashboardData.age_groups['19-30'],
          dashboardData.age_groups['31-50'],
          dashboardData.age_groups['50+'],
        ],
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
          'rgba(255, 159, 64, 0.6)',
          'rgba(255, 99, 132, 0.6)',
        ],
      },
    ],
  };

  // Dữ liệu giả cho biểu đồ lưu lượng theo thời gian
  const trafficData = {
    labels: ['7:00', '8:00', '9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'],
    datasets: [
      {
        label: 'Lưu lượng khách hàng',
        data: [12, 19, 25, 37, 42, 53, 48, 43, 55, 62, 45, 35],
        fill: false,
        backgroundColor: 'rgb(75, 192, 192)',
        borderColor: 'rgba(75, 192, 192, 0.8)',
        tension: 0.4
      }
    ],
  };

  return (
    <Container fluid className="admin-container p-4">
      <Row className="mb-4">
        <Col>
          <h1 className="text-center">Bảng Điều Khiển Quản Trị</h1>
          <h5 className="text-center text-secondary">
            Hệ thống đếm và phân loại khách hàng
          </h5>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={3}>
          <Card className="shadow stats-card bg-primary text-white">
            <Card.Body className="text-center">
              <h1>{dashboardData.total_customers}</h1>
              <h5>Tổng số khách hàng</h5>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="shadow stats-card bg-success text-white">
            <Card.Body className="text-center">
              <h1>{dashboardData.current_stats.total_today}</h1>
              <h5>Khách hàng hôm nay</h5>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="shadow stats-card bg-info text-white">
            <Card.Body className="text-center">
              <h1>{dashboardData.current_stats.current}</h1>
              <h5>Khách hiện tại</h5>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="shadow stats-card bg-warning text-white">
            <Card.Body className="text-center">
              <h1>{dashboardData.regular_customers}</h1>
              <h5>Khách hàng thường xuyên</h5>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={8}>
          <Card className="shadow h-100">
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="m-0">Lưu Lượng Khách Hàng</h4>
                <Form.Select 
                  style={{ width: '200px' }}
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                >
                  <option value="today">Hôm nay</option>
                  <option value="week">Tuần này</option>
                  <option value="month">Tháng này</option>
                </Form.Select>
              </div>
            </Card.Header>
            <Card.Body>
              <div style={{ height: '300px' }}>
                <Line 
                  data={trafficData} 
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
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="shadow h-100">
            <Card.Header>
              <h4 className="m-0">Phân Bố Giới Tính</h4>
            </Card.Header>
            <Card.Body className="text-center">
              <div style={{ height: '300px' }}>
                <Pie 
                  data={genderData} 
                  options={{ 
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom'
                      }
                    }
                  }} 
                />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={4}>
          <Card className="shadow h-100">
            <Card.Header>
              <h4 className="m-0">Phân Bố Độ Tuổi</h4>
            </Card.Header>
            <Card.Body>
              <div style={{ height: '300px' }}>
                <Bar 
                  data={ageData} 
                  options={{ 
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true
                      }
                    },
                    plugins: {
                      legend: {
                        display: false
                      }
                    }
                  }} 
                />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={8}>
          <Card className="shadow h-100">
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="m-0">Danh Sách Khách Hàng</h4>
                <Button variant="primary" onClick={fetchCustomers}>
                  <i className="fas fa-sync-alt me-2"></i>Làm mới
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <Table hover responsive>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Giới tính</th>
                      <th>Độ tuổi</th>
                      <th>Lần ghé thăm</th>
                      <th>Lần đầu ghé thăm</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map(customer => (
                      <tr key={customer.id}>
                        <td>{customer.id.substring(0, 8)}...</td>
                        <td>{customer.gender === 'Man' ? 'Nam' : 'Nữ'}</td>
                        <td>{customer.age}</td>
                        <td>{customer.visit_count}</td>
                        <td>{new Date(customer.first_seen).toLocaleDateString()}</td>
                        <td>
                          <Button 
                            variant="info" 
                            size="sm"
                            onClick={() => handleCustomerClick(customer.id)}
                          >
                            Chi tiết
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md={12}>
          <Card className="shadow">
            <Card.Header>
              <h4 className="m-0">Quản Lý Hệ Thống</h4>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={4}>
                  <Card className="bg-light">
                    <Card.Body>
                      <h5>Reset Thống Kê</h5>
                      <p>Xóa tất cả các thống kê hiện tại để bắt đầu đếm lại từ đầu.</p>
                      <Button variant="danger" onClick={handleResetStats}>
                        <i className="fas fa-redo-alt me-2"></i>Reset Thống Kê
                      </Button>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="bg-light">
                    <Card.Body>
                      <h5>Xuất Báo Cáo</h5>
                      <p>Tải xuống báo cáo về khách hàng trong khoảng thời gian đã chọn.</p>
                      <Button variant="success">
                        <i className="fas fa-file-export me-2"></i>Xuất Báo Cáo
                      </Button>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="bg-light">
                    <Card.Body>
                      <h5>Cấu Hình Hệ Thống</h5>
                      <p>Điều chỉnh các tham số và thiết lập của hệ thống.</p>
                      <Button variant="primary">
                        <i className="fas fa-cogs me-2"></i>Cấu Hình
                      </Button>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modal hiển thị chi tiết khách hàng */}
      <Modal 
        show={showCustomerModal} 
        onHide={() => setShowCustomerModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Chi Tiết Khách Hàng</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedCustomer && (
            <>
              <Row>
                <Col md={6}>
                  <h5>Thông tin khách hàng</h5>
                  <p><strong>ID:</strong> {selectedCustomer.customer.id}</p>
                  <p><strong>Giới tính:</strong> {selectedCustomer.customer.gender === 'Man' ? 'Nam' : 'Nữ'}</p>
                  <p><strong>Độ tuổi:</strong> {selectedCustomer.customer.age}</p>
                  <p><strong>Lần ghé thăm:</strong> {selectedCustomer.customer.visit_count}</p>
                  <p><strong>Lần đầu ghé thăm:</strong> {new Date(selectedCustomer.customer.first_seen).toLocaleString()}</p>
                  {selectedCustomer.customer.last_seen && (
                    <p><strong>Lần ghé thăm gần đây:</strong> {new Date(selectedCustomer.customer.last_seen).toLocaleString()}</p>
                  )}
                </Col>
                <Col md={6}>
                  <h5>Lịch sử ghé thăm</h5>
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    <Table hover size="sm">
                      <thead>
                        <tr>
                          <th>Thời gian</th>
                          <th>Cảm xúc</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedCustomer.visits.map((visit, index) => (
                          <tr key={index}>
                            <td>{new Date(visit.timestamp).toLocaleString()}</td>
                            <td>{visit.emotion}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </Col>
              </Row>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCustomerModal(false)}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default App;

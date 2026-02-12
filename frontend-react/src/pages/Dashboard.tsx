import { Row, Col, Card, Statistic, Button, Space, Empty } from 'antd';
import { UserOutlined, FileOutlined, TeamOutlined, ShoppingOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/store';
import './Dashboard.css';
const Dashboard = () => {
  const { user } = useAuthStore();
  return (
    <div className="dashboard-container">
      <Row gutter={[16, 16]} className="dashboard-welcome">
        <Col xs={24}>
          <Card>
            <Space direction="vertical" style={{ width: '100%' }}>
              <h2>欢迎回来，{user?.username}！</h2>
              <p>这是你的仪表盘。选择左侧菜单开始管理应用。</p>
            </Space>
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic title="用户总数" value={1234} prefix={<UserOutlined />} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic title="订单数量" value={5678} prefix={<ShoppingOutlined />} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic title="团队成员" value={89} prefix={<TeamOutlined />} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic title="内容数量" value={234} prefix={<FileOutlined />} valueStyle={{ color: '#f5222d' }} />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]} className="dashboard-footer">
        <Col xs={24}>
          <Card title="快速操作">
            <Space>
              <Button type="primary">新建用户</Button>
              <Button>查看报告</Button>
              <Button danger>系统维护</Button>
            </Space>
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card title="最近活动">
            <Empty description="暂无数据" />
          </Card>
        </Col>
      </Row>
    </div>
  );
};
export default Dashboard;
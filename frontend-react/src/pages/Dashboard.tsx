import { Row, Col, Card, Statistic, Button, Space, Empty, Divider } from 'antd'
import { UserOutlined, FileOutlined, TeamOutlined, ShoppingOutlined, LogoutOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store'
import { useLogout } from '@/hooks'
import './Dashboard.css'

const Dashboard = () => {
  const { user } = useAuthStore()
  const { mutate: logout, isPending } = useLogout()

  return (
    <div className="dashboard-container">
      <Row gutter={[16, 16]} className="dashboard-welcome">
        <Col xs={24}>
          <Card>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2>欢迎回来，{user?.username || user?.email}！</h2>
                  <p>这是你的仪表盘。</p>
                </div>
                <Button
                  type="primary"
                  danger
                  icon={<LogoutOutlined />}
                  loading={isPending}
                  onClick={() => logout()}
                >
                  登出
                </Button>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card title="用户信息">
            <Space direction="vertical" style={{ width: '100%' }}>
              <p>
                <strong>ID:</strong> {user?.id}
              </p>
              <p>
                <strong>用户名:</strong> {user?.username}
              </p>
              <p>
                <strong>邮箱:</strong> {user?.email}
              </p>
              {user?.roles && (
                <p>
                  <strong>角色:</strong> {user.roles.join(', ')}
                </p>
              )}
              {user?.createdAt && (
                <p>
                  <strong>创建时间:</strong> {new Date(user.createdAt).toLocaleString()}
                </p>
              )}
            </Space>
          </Card>
        </Col>
      </Row>

      <Divider />

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
  )
}

export default Dashboard
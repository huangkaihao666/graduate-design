import React from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Layout, Menu, Button, Space, Modal } from 'antd'
import { HomeOutlined, LogoutOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store'

const { Header, Sider, Content } = Layout

const AdminLayout: React.FC = () => {
  const navigate = useNavigate()
  const { clearAuth } = useAuthStore()

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0b1020' }}>
        <div style={{ color: '#fff', fontWeight: 900, cursor: 'pointer' }} onClick={() => navigate('/admin')}>
          🎛️ 管理后台
        </div>
        <Space>
          <Button onClick={() => navigate('/cases')}>返回平台</Button>
          <Button
            danger
            icon={<LogoutOutlined />}
            onClick={() => {
              Modal.confirm({
                title: '确认退出管理后台？',
                content: '退出后需要重新进行管理员登录。',
                okText: '退出',
                okButtonProps: { danger: true },
                cancelText: '取消',
                onOk: () => {
                  clearAuth()
                  navigate('/admin/login')
                },
              })
            }}
          >
            退出
          </Button>
        </Space>
      </Header>
      <Layout>
        <Sider width={220} theme="light">
          <Menu
            mode="inline"
            items={[
              { key: 'home', label: '概览', icon: <HomeOutlined />, onClick: () => navigate('/admin') },
            ]}
          />
        </Sider>
        <Content style={{ background: '#f8fafc' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default AdminLayout


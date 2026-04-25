import React from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Layout, Menu, Button, Space, Modal } from 'antd'
import { HomeOutlined, LogoutOutlined, UserOutlined, FileTextOutlined, WarningOutlined, BarChartOutlined, ControlOutlined, RobotOutlined, TagsOutlined, NotificationOutlined, BookOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { useAdminAuthStore } from '@/store'
import './AdminLayout.less'

const { Header, Sider, Content } = Layout

const AdminLayout: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { clearAuth } = useAdminAuthStore()
  const queryClient = useQueryClient()

  const selectedKey = (() => {
    if (location.pathname.startsWith('/admin/stats')) return 'stats'
    if (location.pathname.startsWith('/admin/rooms')) return 'rooms'
    if (location.pathname.startsWith('/admin/users')) return 'users'
    if (location.pathname.startsWith('/admin/messages')) return 'messages'
    if (location.pathname.startsWith('/admin/agents-audit')) return 'agents-audit'
    if (location.pathname.startsWith('/admin/knowledge-bases')) return 'knowledge-bases'
    if (location.pathname.startsWith('/admin/tags')) return 'tags'
    if (location.pathname.startsWith('/admin/announcements')) return 'announcements'
    return 'home'
  })()

  return (
    <Layout className="admin-shell">
      <Header className="admin-header">
        <div className="admin-header-left" onClick={() => navigate('/admin')}>
          <span className="admin-logo" aria-hidden="true">
            <ControlOutlined />
          </span>
          <span className="admin-title">管理后台</span>
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
                  queryClient.clear()
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
        <Sider width={228} theme="light" className="admin-sider">
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            items={[
              { key: 'home',          label: '概览',       icon: <HomeOutlined />,         onClick: () => navigate('/admin') },
              { key: 'stats',         label: '数据面板',    icon: <BarChartOutlined />,      onClick: () => navigate('/admin/stats') },
              { key: 'rooms',         label: '房间管理',    icon: <FileTextOutlined />,      onClick: () => navigate('/admin/rooms') },
              { key: 'users',         label: '用户管理',    icon: <UserOutlined />,          onClick: () => navigate('/admin/users') },
              { key: 'messages',      label: '消息审核',    icon: <WarningOutlined />,       onClick: () => navigate('/admin/messages') },
              { type: 'divider' as const },
              { key: 'agents-audit',    label: '智能体审核',  icon: <RobotOutlined />,         onClick: () => navigate('/admin/agents-audit') },
              { key: 'knowledge-bases', label: '知识库审核',  icon: <BookOutlined />,          onClick: () => navigate('/admin/knowledge-bases') },
              { key: 'tags',            label: '话题标签',    icon: <TagsOutlined />,          onClick: () => navigate('/admin/tags') },
              { key: 'announcements',   label: '系统公告',    icon: <NotificationOutlined />,  onClick: () => navigate('/admin/announcements') },
            ]}
          />
        </Sider>
        <Content className="admin-content">
          <div className="admin-content-inner">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

export default AdminLayout


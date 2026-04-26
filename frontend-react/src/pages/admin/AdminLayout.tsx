import React, { useEffect, useRef } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ConfigProvider, Layout, Menu, Button, Space, Modal, notification } from 'antd'
import { HomeOutlined, LogoutOutlined, UserOutlined, FileTextOutlined, WarningOutlined, BarChartOutlined, ControlOutlined, RobotOutlined, TagsOutlined, NotificationOutlined, BookOutlined, AlertOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as adminApi from '@/api/admin'
import { useAdminAuthStore } from '@/store'
import './AdminLayout.less'

// 管理端专属 token：覆盖全局 indigo 主题色，换成暖灰中性风格
const adminTheme = {
  token: {
    colorPrimary: '#1a1612',
    colorBgContainer: 'rgba(255,253,249,0.9)',
    colorBgLayout: '#faf8f4',
    colorBorder: 'rgba(26,22,18,0.1)',
    colorBorderSecondary: 'rgba(26,22,18,0.06)',
    colorText: '#1a1612',
    colorTextSecondary: '#6b6459',
    colorTextTertiary: '#b0a89c',
    colorFillAlter: '#f3f0ea',
    colorFill: 'rgba(26,22,18,0.04)',
    borderRadius: 10,
  },
  components: {
    Menu: {
      itemSelectedBg: 'rgba(26,22,18,0.07)',
      itemSelectedColor: '#1a1612',
      itemHoverBg: '#f3f0ea',
      itemHoverColor: '#1a1612',
      itemColor: '#6b6459',
      colorBgContainer: 'transparent',
      itemActiveBg: 'rgba(26,22,18,0.07)',
      inkBarColor: 'transparent',
    },
    Table: {
      headerBg: '#f3f0ea',
      headerColor: '#6b6459',
      rowHoverBg: '#f3f0ea',
      colorBgContainer: 'rgba(255,253,249,0.9)',
      borderColor: 'rgba(26,22,18,0.06)',
    },
    Layout: {
      headerBg: '#faf8f4',
      siderBg: '#faf8f4',
      bodyBg: '#faf8f4',
    },
    Card: {
      colorBgContainer: 'rgba(255,253,249,0.9)',
    },
  },
}

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
    if (location.pathname.startsWith('/admin/emotion-alerts')) return 'emotion-alerts'
    return 'home'
  })()

  const [notifApi, notifHolder] = notification.useNotification()
  const notifiedRef = useRef(false)

  const { data: alertStats } = useQuery({
    queryKey: ['admin-alert-stats'],
    queryFn: () => adminApi.getAdminAlertStats(),
    refetchInterval: 60000,
  })
  const unhandledCount = (alertStats as any)?.totalUnhandled ?? 0
  const highCount = (alertStats as any)?.highCount ?? 0

  // 首次加载有待处理预警时弹出通知
  useEffect(() => {
    if (notifiedRef.current) return
    if (unhandledCount <= 0) return
    notifiedRef.current = true
    notifApi.warning({
      message: '存在未处理的情绪预警',
      description: (
        <span>
          当前有 <strong style={{ color: '#dc2626' }}>{unhandledCount}</strong> 条预警待处理
          {highCount > 0 && <>，其中 <strong style={{ color: '#dc2626' }}>{highCount}</strong> 条高风险，请及时跟进。</>}
        </span>
      ),
      btn: (
        <Button
          size="small"
          danger
          style={{ borderRadius: 7, fontWeight: 600 }}
          onClick={() => {
            navigate('/admin/emotion-alerts')
            notification.destroy('emotion-alert-notif')
          }}
        >
          前往处理
        </Button>
      ),
      key: 'emotion-alert-notif',
      duration: 8,
      icon: <AlertOutlined style={{ color: '#dc2626' }} />,
      placement: 'topRight',
    })
  }, [unhandledCount, highCount, notifApi, navigate])

  return (
    <ConfigProvider theme={adminTheme}>
    {notifHolder}
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
              { type: 'divider' as const },
              {
                key: 'emotion-alerts',
                icon: <AlertOutlined />,
                onClick: () => navigate('/admin/emotion-alerts'),
                label: (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    情绪预警
                    {unhandledCount > 0 && (
                      <span style={{
                        background: '#dc2626',
                        color: '#fff',
                        borderRadius: 10,
                        padding: '0 6px',
                        fontSize: 11,
                        fontWeight: 700,
                        lineHeight: '18px',
                        minWidth: 18,
                        textAlign: 'center',
                      }}>
                        {unhandledCount > 99 ? '99+' : unhandledCount}
                      </span>
                    )}
                  </span>
                ),
              },
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
    </ConfigProvider>
  )
}

export default AdminLayout


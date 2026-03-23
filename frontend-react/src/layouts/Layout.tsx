import { Layout as AntLayout, Menu, Dropdown, Avatar, Space, Button, Drawer, Modal, Badge } from 'antd'
import {
  LogoutOutlined,
  UserOutlined,
  SettingOutlined,
  MenuOutlined,
  CompassOutlined,
  FileTextOutlined,
  PlusOutlined,
  RobotOutlined,
  AppstoreOutlined,
  BellOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store'
import { useLogout } from '@/hooks'
import { useState } from 'react'
import './Layout.less'

const { Header, Sider, Content } = AntLayout

const NAV_ITEMS = [
  {
    key: 'cases',
    label: '辩论广场',
    icon: <CompassOutlined />,
    path: '/cases',
    desc: '发现最新案件',
  },
  {
    key: 'create',
    label: '发起辩论',
    icon: <PlusOutlined />,
    path: '/create',
    desc: '提交你的困惑',
  },
  {
    key: 'my-cases',
    label: '我的案件',
    icon: <FileTextOutlined />,
    path: '/my-cases',
    desc: '管理发布的案件',
  },
  {
    key: 'agents',
    label: 'AI 图鉴',
    icon: <RobotOutlined />,
    path: '/agents',
    desc: '三位 AI 专家介绍',
  },
  {
    key: 'profile',
    label: '个人中心',
    icon: <UserOutlined />,
    path: '/me',
    desc: '查看个人资料',
  },
]

const Layout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()
  const handleLogout = useLogout()
  const [drawerVisible, setDrawerVisible] = useState(false)

  const getSelectedKey = () => {
    if (location.pathname.includes('/cases')) return 'cases'
    if (location.pathname.includes('/create')) return 'create'
    if (location.pathname.includes('/my-cases')) return 'my-cases'
    if (location.pathname.includes('/agents')) return 'agents'
    if (location.pathname.includes('/me') || location.pathname.includes('/profile')) return 'profile'
    return 'cases'
  }

  const userMenuItems = [
    {
      key: 'profile',
      label: '个人中心',
      icon: <UserOutlined />,
      onClick: () => navigate('/me'),
    },
    {
      key: 'settings',
      label: '账号设置',
      icon: <SettingOutlined />,
      onClick: () => navigate('/settings'),
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      label: '退出登录',
      icon: <LogoutOutlined />,
      danger: true,
      onClick: () => {
        Modal.confirm({
          title: '确认退出登录？',
          content: '退出后需要重新登录才能继续使用平台功能。',
          okText: '退出',
          okButtonProps: { danger: true },
          cancelText: '取消',
          centered: true,
          onOk: () => handleLogout(),
        })
      },
    },
  ]

  const sideMenuItems = NAV_ITEMS.map((item) => ({
    key: item.key,
    label: item.label,
    icon: item.icon,
    onClick: () => {
      navigate(item.path)
      setDrawerVisible(false)
    },
  }))

  const selectedKey = getSelectedKey()

  return (
    <AntLayout className="app-layout">
      {/* ── 顶部导航 ── */}
      <Header className="app-header">
        <div className="header-inner">
          {/* 左侧 */}
          <div className="header-left">
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setDrawerVisible(true)}
              className="mobile-menu-trigger"
            />
            <div
              className="app-logo"
              onClick={() => navigate('/cases')}
            >
              <div className="app-logo-icon">⚖️</div>
              <div className="app-logo-text">
                <span className="app-logo-name">决策辩论庭</span>
                <span className="app-logo-sub">AI 多智能体平台</span>
              </div>
            </div>
          </div>

          {/* 中间导航（桌面版） */}
          <nav className="header-nav">
            {NAV_ITEMS.slice(0, 4).map((item) => (
              <button
                key={item.key}
                className={`header-nav-item ${selectedKey === item.key ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <span className="nav-item-icon">{item.icon}</span>
                <span className="nav-item-label">{item.label}</span>
                {selectedKey === item.key && <span className="nav-item-indicator" />}
              </button>
            ))}
          </nav>

          {/* 右侧用户区 */}
          <Space size={8} className="header-right">
            <Button
              type="text"
              icon={<AppstoreOutlined />}
              className="header-icon-btn"
              onClick={() => navigate('/cases')}
              title="辩论广场"
            />
            <Badge dot offset={[-2, 2]}>
              <Button
                type="text"
                icon={<BellOutlined />}
                className="header-icon-btn"
                title="通知"
              />
            </Badge>
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
              <button className="user-menu-trigger">
                <Avatar
                  size={34}
                  src={user?.avatar}
                  icon={<UserOutlined />}
                  className="user-avatar"
                />
                <span className="user-name-text">{user?.name || user?.email?.split('@')[0]}</span>
              </button>
            </Dropdown>
          </Space>
        </div>
      </Header>

      <AntLayout className="app-body">
        {/* ── 侧边栏（桌面） ── */}
        <Sider width={220} className="app-sider">
          <div className="sider-inner">
            <Menu
              items={sideMenuItems}
              selectedKeys={[selectedKey]}
              mode="inline"
              className="sider-menu"
            />

            {/* 侧边栏底部装饰 */}
            <div className="sider-footer">
              <div className="sider-footer-card">
                <div className="sider-footer-icon">🤖</div>
                <div className="sider-footer-text">
                  <div className="sider-footer-title">AI 正在运行</div>
                  <div className="sider-footer-desc">3 位专家待命中</div>
                </div>
                <div className="sider-footer-dot" />
              </div>
            </div>
          </div>
        </Sider>

        {/* ── 移动端抽屉 ── */}
        <Drawer
          title={
            <div className="drawer-title">
              <span className="drawer-title-icon">⚖️</span>
              <span>决策辩论庭</span>
            </div>
          }
          placement="left"
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          className="mobile-nav-drawer"
          width={260}
        >
          <Menu
            items={sideMenuItems}
            selectedKeys={[selectedKey]}
            mode="inline"
            className="drawer-menu"
          />
        </Drawer>

        {/* ── 主内容区 ── */}
        <Content className="app-content">
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  )
}

export default Layout

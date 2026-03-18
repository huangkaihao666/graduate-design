import { Layout as AntLayout, Menu, Dropdown, Avatar, Space, Button, Drawer } from 'antd'
import { LogoutOutlined, UserOutlined, SettingOutlined, MenuOutlined, HomeOutlined, FileTextOutlined, PlusOutlined, DashboardOutlined, RobotOutlined } from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store'
import { useLogout } from '@/hooks'
import { useState } from 'react'
import './Layout.less'

const { Header, Sider, Content } = AntLayout

const Layout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()
  const handleLogout = useLogout()
  const [drawerVisible, setDrawerVisible] = useState(false)

  // 确定当前选中的菜单项
  const getSelectedKey = () => {
    if (location.pathname.includes('/cases')) return 'cases'
    if (location.pathname.includes('/create')) return 'create'
    if (location.pathname.includes('/my-cases')) return 'my-cases'
    if (location.pathname.includes('/agents')) return 'agents'
    if (location.pathname.includes('/me') || location.pathname.includes('/profile')) return 'profile'
    if (location.pathname.includes('/dashboard')) return 'dashboard'
    return 'cases'
  }

  const userMenuItems = [
    { key: 'profile', label: '个人中心', icon: <UserOutlined />, onClick: () => navigate('/me') },
    { key: 'settings', label: '设置', icon: <SettingOutlined />, onClick: () => navigate('/settings') },
    { type: 'divider' as const },
    { key: 'logout', label: '登出', icon: <LogoutOutlined />, onClick: () => handleLogout(), danger: true },
  ]

  const sideMenuItems = [
    { key: 'cases', label: '案件列表', icon: <HomeOutlined />, onClick: () => { navigate('/cases'); setDrawerVisible(false) } },
    { key: 'create', label: '创建案件', icon: <PlusOutlined />, onClick: () => { navigate('/create'); setDrawerVisible(false) } },
    { key: 'my-cases', label: '我的案件', icon: <FileTextOutlined />, onClick: () => { navigate('/my-cases'); setDrawerVisible(false) } },
    { key: 'profile', label: '个人中心', icon: <UserOutlined />, onClick: () => { navigate('/me'); setDrawerVisible(false) } },
    { key: 'agents', label: 'Agent 图鉴', icon: <RobotOutlined />, onClick: () => { navigate('/agents'); setDrawerVisible(false) } },
    { type: 'divider' as const },
    { key: 'dashboard', label: '管理后台', icon: <DashboardOutlined />, onClick: () => { navigate('/dashboard'); setDrawerVisible(false) } },
  ]

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Header className="layout-header">
        <div className="layout-header-content">
          {/* 左侧 Logo 和菜单按钮 */}
          <div className="header-left">
            <Button 
              type="text" 
              icon={<MenuOutlined className="menu-button" />}
              onClick={() => setDrawerVisible(true)}
              className="mobile-menu-btn"
            />
            <div 
              className="layout-logo"
              onClick={() => navigate('/cases')}
              style={{ cursor: 'pointer' }}
            >
              <span className="logo-icon">🎭</span>
              <span className="logo-text">辩论平台</span>
            </div>
          </div>

          {/* 右侧用户菜单 */}
          <Space size="large">
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
              <Button type="text" className="user-menu-btn">
                <Avatar 
                  size={32} 
                  src={user?.avatar} 
                  icon={<UserOutlined />}
                  style={{ backgroundColor: '#667eea' }}
                />
                <span className="user-name">{user?.name}</span>
              </Button>
            </Dropdown>
          </Space>
        </div>
      </Header>

      <AntLayout className="main-layout">
        {/* 侧边栏 - 桌面版 */}
        <Sider width={220} theme="light" className="layout-sider">
          <Menu 
            items={sideMenuItems}
            selectedKeys={[getSelectedKey()]}
            defaultSelectedKeys={['cases']}
            mode="inline"
          />
        </Sider>

        {/* 抽屉 - 移动版 */}
        <Drawer
          title="导航菜单"
          placement="left"
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          className="mobile-drawer"
        >
          <Menu 
            items={sideMenuItems}
            selectedKeys={[getSelectedKey()]}
            mode="vertical"
          />
        </Drawer>

        <Content className="layout-content">
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  )
}

export default Layout
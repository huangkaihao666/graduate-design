import { Layout as AntLayout, Menu, Dropdown, Avatar, Space, Button, Drawer, Modal } from 'antd'
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
  SunOutlined,
  MoonOutlined,
  HeartOutlined,
  ToolOutlined,
  TeamOutlined,
  TrophyOutlined,
} from '@ant-design/icons'
import NotificationDropdown from '@/components/NotificationDropdown/NotificationDropdown'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore, useUIStore } from '@/store'
import { useLogout } from '@/hooks'
import { useState, useCallback } from 'react'
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
    label: '我的足迹',
    icon: <FileTextOutlined />,
    path: '/my-cases',
    desc: '案件、点赞与收藏',
  },
  {
    key: 'counseling',
    label: 'AI 共情师',
    icon: <HeartOutlined />,
    path: '/counseling',
    desc: '倾诉与情绪辅导',
  },
  {
    key: 'agents',
    label: 'AI 图鉴',
    icon: <RobotOutlined />,
    path: '/agents',
    desc: '三位 AI 专家介绍',
  },
  {
    key: 'create-agent',
    label: '创建智能体',
    icon: <ToolOutlined />,
    path: '/create-agent',
    desc: '自定义 AI 专家',
  },
  {
    key: 'feed',
    label: '关注动态',
    icon: <TeamOutlined />,
    path: '/feed',
    desc: '关注用户的最新辩论',
  },
  {
    key: 'achievements',
    label: '成就中心',
    icon: <TrophyOutlined />,
    path: '/achievements',
    desc: '等级、徽章与排行榜',
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
  const { themeMode, toggleTheme } = useUIStore()
  const handleLogout = useLogout()
  const [drawerVisible, setDrawerVisible] = useState(false)

  const handleToggleTheme = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const btn = e.currentTarget
    const rect = btn.getBoundingClientRect()
    // 点击中心坐标
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    // 计算到最远角的距离（到屏幕最远角 = 对角线终点）
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    )

    // 如果浏览器支持 View Transitions API
    if (typeof document.startViewTransition === 'function') {
      const nextTheme = themeMode === 'light' ? 'dark' : 'light'

      const transition = document.startViewTransition(() => {
        // ① 同步修改 data-theme → CSS 变量立即切换 → View Transition 截到真实 new 快照
        document.body.setAttribute('data-theme', nextTheme)
        // ② 更新 React 状态 → antd ConfigProvider 算法跟进（可以异步）
        toggleTheme()
      })

      transition.ready.then(() => {
        // new 层（新主题快照）始终从点击位置圆形扩展覆盖 old 层（旧主题快照）
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${endRadius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 500,
            easing: 'ease-in-out',
            pseudoElement: '::view-transition-new(root)',
          },
        )
      })
    } else {
      // 降级：直接切换
      toggleTheme()
    }
  }, [toggleTheme, themeMode])

  const getSelectedKey = () => {
    if (location.pathname.includes('/my-cases')) return 'my-cases'
    if (location.pathname.includes('/create-agent')) return 'create-agent'
    if (location.pathname.includes('/cases')) return 'cases'
    if (location.pathname.includes('/create')) return 'create'
    if (location.pathname.includes('/counseling')) return 'counseling'
    if (location.pathname.includes('/agents')) return 'agents'
    if (location.pathname.includes('/feed')) return 'feed'
    if (location.pathname.includes('/achievements')) return 'achievements'
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
                <span className="app-logo-name">智辩助手</span>
                <span className="app-logo-sub">多智能体协同决策平台</span>
              </div>
            </div>
          </div>

          {/* 右侧用户区 */}
          <Space size={8} className="header-right">
            <Button
              type="text"
              icon={<AppstoreOutlined />}
              className="header-icon-btn"
              onClick={() => navigate('/cases')}
              title="辩论广场"
            />
            <NotificationDropdown />
            {/* 深浅色切换 */}
            <Button
              type="text"
              icon={themeMode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
              className="header-icon-btn theme-toggle-btn"
              onClick={handleToggleTheme}
              title={themeMode === 'dark' ? '切换为亮色模式' : '切换为深色模式'}
            />
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
                  <div className="sider-footer-title">智能体运行中</div>
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
              <span>智辩助手</span>
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

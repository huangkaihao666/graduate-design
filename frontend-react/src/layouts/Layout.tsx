import { Layout as AntLayout, Menu, Dropdown, Avatar, Space, Button } from 'antd';
import { LogoutOutlined, UserOutlined, SettingOutlined } from '@ant-design/icons';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { useLogout } from '@/hooks';
import './Layout.css';
const { Header, Sider, Content } = AntLayout;
const Layout = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { mutate: logout } = useLogout();
  const userMenuItems = [
    { key: 'profile', label: '个人资料', icon: <UserOutlined />, onClick: () => navigate('/profile') },
    { key: 'settings', label: '设置', icon: <SettingOutlined />, onClick: () => navigate('/settings') },
    { type: 'divider' },
    { key: 'logout', label: '登出', icon: <LogoutOutlined />, onClick: () => logout(), danger: true },
  ];
  const sideMenuItems = [
    { key: 'dashboard', label: '仪表盘', onClick: () => navigate('/dashboard') },
    { key: 'users', label: '用户管理', onClick: () => navigate('/users') },
    { key: 'settings', label: '系统设置', onClick: () => navigate('/system-settings') },
  ];
  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Header className="layout-header">
        <div className="layout-header-content">
          <h2 className="layout-logo">React Admin</h2>
          <Space>
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
              <Button type="text" icon={<Avatar size="small" src={user?.avatar} icon={<UserOutlined />} />}>
                {user?.username}
              </Button>
            </Dropdown>
          </Space>
        </div>
      </Header>
      <AntLayout>
        <Sider width={200} theme="light">
          <Menu items={sideMenuItems} defaultSelectedKeys={['dashboard']} />
        </Sider>
        <Content className="layout-content">
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
};
export default Layout;
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { flushSync } from 'react-dom'
import { Form, Input, Button, Card, Tabs, message, Divider, Space, Typography, Tooltip } from 'antd'
import { LockOutlined, MailOutlined, UserOutlined, EyeInvisibleOutlined, EyeOutlined, BgColorsOutlined } from '@ant-design/icons'
import type { TabsProps } from 'antd'
import * as authApi from '@/api/auth'
import { useAuthStore } from '@/store'
import { useUIStore } from '@/store'
import './Auth.less'

const { Title, Text } = Typography

interface LoginFormData {
  email: string
  password: string
}

interface RegisterFormData {
  name: string
  email: string
  password: string
  confirmPassword: string
}

const Auth: React.FC = () => {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const { themeMode, setThemeMode } = useUIStore()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('login')
  const [loginForm] = Form.useForm<LoginFormData>()
  const [registerForm] = Form.useForm<RegisterFormData>()

  // 处理登录
  const handleLogin = async (values: LoginFormData) => {
    setLoading(true)
    try {
      const response = await authApi.login({
        email: values.email,
        password: values.password,
      })
      // 拦截器已提取 data，所以这里的 response 就是 LoginResponse
      const loginData = response as any

      // 保存双 Token 和用户信息，使用 flushSync 确保同步更新
      flushSync(() => {
        login({
          user: loginData.user,
          accessToken: loginData.accessToken,
          refreshToken: loginData.refreshToken,
        })
      })

      message.success('登录成功！')
      // 导航到 dashboard
      navigate('/dashboard', { replace: true })
    } catch (error) {
      console.error('Login error:', error)
      message.error('登录失败，请检查邮箱和密码')
    } finally {
      setLoading(false)
    }
  }

  // 处理注册
  const handleRegister = async (values: RegisterFormData) => {
    if (values.password !== values.confirmPassword) {
      message.error('两次输入的密码不一致')
      return
    }

    setLoading(true)
    try {
      const response = await authApi.register({
        name: values.name,
        email: values.email,
        password: values.password,
      })
      // 拦截器已提取 data，所以这里的 response 就是 LoginResponse
      const loginData = response as any
      // 保存双 Token 和用户信息，使用 flushSync 确保同步更新
      flushSync(() => {
        login({
          user: loginData.user,
          accessToken: loginData.accessToken,
          refreshToken: loginData.refreshToken,
        })
      })
      message.success('注册成功！')
      // 导航到 dashboard
      navigate('/dashboard', { replace: true })
    } catch (error) {
      console.error('Register error:', error)
      message.error('注册失败，请检查输入信息')
    } finally {
      setLoading(false)
    }
  }

  // 密码验证规则
  const validatePassword = (password: string) => {
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumber = /\d/.test(password)

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      return '密码需要包含大小写字母和数字'
    }
    if (password.length < 8) {
      return '密码至少需要8个字符'
    }
    return ''
  }

  const items: TabsProps['items'] = [
    {
      key: 'login',
      label: '登录',
      children: (
        <Form
          form={loginForm}
          onFinish={handleLogin}
          layout="vertical"
          autoComplete="off"
          className="auth-form"
        >
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱' },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="请输入邮箱地址"
              size="large"
              allowClear
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入密码"
              size="large"
              iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
              allowClear
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={loading}
              block
              className="auth-button"
            >
              登录
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'register',
      label: '注册',
      children: (
        <Form
          form={registerForm}
          onFinish={handleRegister}
          layout="vertical"
          autoComplete="off"
          className="auth-form"
        >
          <Form.Item
            name="name"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 2, message: '用户名至少2个字符' },
              { max: 100, message: '用户名不超过100个字符' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="请输入用户名"
              size="large"
              allowClear
            />
          </Form.Item>

          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱' },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="请输入邮箱地址"
              size="large"
              allowClear
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请输入密码' },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve()
                  const error = validatePassword(value)
                  return error ? Promise.reject(new Error(error)) : Promise.resolve()
                },
              },
            ]}
            tooltip="密码需要至少8个字符，包含大小写字母和数字"
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请设置密码（大小写字母+数字）"
              size="large"
              iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
              allowClear
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="确认密码"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'))
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请再次输入密码"
              size="large"
              iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
              allowClear
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={loading}
              block
              className="auth-button"
            >
              注册
            </Button>
          </Form.Item>

          <Text type="secondary" className="terms">
            注册即表示同意我们的服务条款和隐私政策
          </Text>
        </Form>
      ),
    },
  ]

  return (
    <div className={`auth-container ${themeMode}`}>
      <div className="auth-background">
        <div className="bg-blur" />
        <div className="floating-shapes">
          <div className="shape shape-1" />
          <div className="shape shape-2" />
          <div className="shape shape-3" />
        </div>
      </div>

      <div className="auth-content">
        {/* 左侧品牌区域 */}
        <div className="auth-brand">
          <div className="brand-logo">
            <div className="logo-icon">💡</div>
          </div>
          <Title level={2} className="brand-title">
            生活决策论坛
          </Title>
          <Text className="brand-subtitle">
            多智能体众包辩论平台
          </Text>
          <div className="brand-features">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div className="feature-item">
                <span className="feature-icon">🤖</span>
                <span>AI多角色观点碰撞</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">💬</span>
                <span>实时众包决策</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">⚡</span>
                <span>秒速获得多维建议</span>
              </div>
            </Space>
          </div>
        </div>

        {/* 右侧表单区域 */}
        <div className="auth-form-container">
          <Card className="auth-card">
            <div className="auth-header">
              <Tabs
                items={items}
                activeKey={activeTab}
                onChange={setActiveTab}
                className="auth-tabs"
                tabBarStyle={{
                  marginBottom: '24px',
                }}
              />
            </div>

            <Divider>或继续使用</Divider>

            <div className="social-login">
              <Button size="large" block className="social-button">
                微信登录
              </Button>
              <Button size="large" block className="social-button">
                支付宝登录
              </Button>
            </div>
          </Card>

          <div className="auth-footer">
            <Space size="small" className="footer-controls">
              <Text type="secondary" className="footer-text">
                © 2024 生活决策论坛 · 为生活决策提供智能支持
              </Text>
              <Tooltip title={themeMode === 'dark' ? '切换为亮色' : '切换为深色'}>
                <Button
                  type="text"
                  size="small"
                  icon={<BgColorsOutlined />}
                  onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
                />
              </Tooltip>
            </Space>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Auth

import { useState } from 'react'
import { Form, Input, Button, Card, Space, Typography, Checkbox, Tabs, message } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons'
import { useLogin, useRegister } from '@/hooks'
import './Login.css'

const { Title, Text } = Typography

interface LoginFormValues {
  email: string
  password: string
  remember?: boolean
}

interface RegisterFormValues {
  username: string
  email: string
  password: string
  confirmPassword: string
}

const Login = () => {
  const [activeTab, setActiveTab] = useState('login')
  const [loginForm] = Form.useForm<LoginFormValues>()
  const [registerForm] = Form.useForm<RegisterFormValues>()

  const { mutate: login, isPending: loginPending, error: loginError } = useLogin()
  const { mutate: register, isPending: registerPending, error: registerError } = useRegister()

  const handleLogin = async (values: LoginFormValues) => {
    try {
      login({
        email: values.email,
        password: values.password,
      })
    } catch (err) {
      console.error('Login error:', err)
    }
  }

  const handleRegister = async (values: RegisterFormValues) => {
    if (values.password !== values.confirmPassword) {
      message.error('两次输入的密码不一致')
      return
    }

    try {
      register({
        username: values.username,
        email: values.email,
        password: values.password,
      })
    } catch (err) {
      console.error('Register error:', err)
    }
  }

  const loginTabContent = (
    <Form<LoginFormValues>
      form={loginForm}
      layout="vertical"
      autoComplete="off"
      onFinish={handleLogin}
      requiredMark="optional"
    >
      <Form.Item
        label="邮箱"
        name="email"
        rules={[
          { required: true, message: '请输入邮箱' },
          { type: 'email', message: '请输入有效的邮箱地址' },
        ]}
      >
        <Input placeholder="输入邮箱" prefix={<MailOutlined />} size="large" disabled={loginPending} />
      </Form.Item>

      <Form.Item
        label="密码"
        name="password"
        rules={[
          { required: true, message: '请输入密码' },
          { min: 6, message: '密码至少 6 个字符' },
        ]}
      >
        <Input.Password placeholder="输入密码" prefix={<LockOutlined />} size="large" disabled={loginPending} />
      </Form.Item>

      <Form.Item name="remember" valuePropName="checked" initialValue={false}>
        <Checkbox>记住我</Checkbox>
      </Form.Item>

      {loginError && (
        <Form.Item>
          <div className="login-error">{typeof loginError === 'string' ? loginError : '登录失败'}</div>
        </Form.Item>
      )}

      <Form.Item>
        <Button type="primary" htmlType="submit" block size="large" loading={loginPending}>
          登录
        </Button>
      </Form.Item>
    </Form>
  )

  const registerTabContent = (
    <Form<RegisterFormValues>
      form={registerForm}
      layout="vertical"
      autoComplete="off"
      onFinish={handleRegister}
      requiredMark="optional"
    >
      <Form.Item
        label="用户名"
        name="username"
        rules={[
          { required: true, message: '请输入用户名' },
          { min: 3, message: '用户名至少 3 个字符' },
        ]}
      >
        <Input placeholder="输入用户名" prefix={<UserOutlined />} size="large" disabled={registerPending} />
      </Form.Item>

      <Form.Item
        label="邮箱"
        name="email"
        rules={[
          { required: true, message: '请输入邮箱' },
          { type: 'email', message: '请输入有效的邮箱地址' },
        ]}
      >
        <Input placeholder="输入邮箱" prefix={<MailOutlined />} size="large" disabled={registerPending} />
      </Form.Item>

      <Form.Item
        label="密码"
        name="password"
        rules={[
          { required: true, message: '请输入密码' },
          { min: 6, message: '密码至少 6 个字符' },
        ]}
      >
        <Input.Password placeholder="输入密码" prefix={<LockOutlined />} size="large" disabled={registerPending} />
      </Form.Item>

      <Form.Item
        label="确认密码"
        name="confirmPassword"
        rules={[
          { required: true, message: '请确认密码' },
          { min: 6, message: '密码至少 6 个字符' },
        ]}
      >
        <Input.Password placeholder="确认密码" prefix={<LockOutlined />} size="large" disabled={registerPending} />
      </Form.Item>

      {registerError && (
        <Form.Item>
          <div className="login-error">{typeof registerError === 'string' ? registerError : '注册失败'}</div>
        </Form.Item>
      )}

      <Form.Item>
        <Button type="primary" htmlType="submit" block size="large" loading={registerPending}>
          注册
        </Button>
      </Form.Item>
    </Form>
  )

  return (
    <div className="login-container">
      <Card className="login-card">
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div className="login-header">
            <Title level={2} style={{ margin: 0 }}>
              React Admin System
            </Title>
            <Text type="secondary">欢迎使用</Text>
          </div>

          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'login',
                label: '登录',
                children: loginTabContent,
              },
              {
                key: 'register',
                label: '注册',
                children: registerTabContent,
              },
            ]}
          />
        </Space>
      </Card>
    </div>
  )
}

export default Login
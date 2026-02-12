import { Form, Input, Button, Card, Space, Typography, Checkbox } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useLogin } from '@/hooks'
import './Login.css'

const { Title, Text } = Typography

interface LoginFormValues {
  username: string
  password: string
  remember?: boolean
}

const Login = () => {
  const [form] = Form.useForm<LoginFormValues>()
  const { mutate: login, isPending } = useLogin()

  const onFinish = async (values: LoginFormValues) => {
    login({ username: values.username, password: values.password })
  }

  return (
    <div className="login-container">
      <Card className="login-card">
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div className="login-header">
            <Title level={2} style={{ margin: 0 }}>
              React Admin System
            </Title>
            <Text type="secondary">Welcome back</Text>
          </div>
          <Form<LoginFormValues>
            form={form}
            layout="vertical"
            autoComplete="off"
            onFinish={onFinish}
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
              <Input placeholder="输入用户名" prefix={<UserOutlined />} size="large" disabled={isPending} />
            </Form.Item>
            <Form.Item
              label="密码"
              name="password"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少 6 个字符' },
              ]}
            >
              <Input.Password placeholder="输入密码" prefix={<LockOutlined />} size="large" disabled={isPending} />
            </Form.Item>
            <Form.Item name="remember" valuePropName="checked" initialValue={false}>
              <Checkbox>记住我</Checkbox>
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block size="large" loading={isPending}>
                登录
              </Button>
            </Form.Item>
          </Form>
          <div className="login-footer">
            <Text type="secondary">没有账户？</Text>
            <a href="/register">立即注册</a>
          </div>
        </Space>
      </Card>
    </div>
  )
}

export default Login
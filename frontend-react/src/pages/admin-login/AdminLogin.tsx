import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Form, Input, Space, message } from 'antd'
import { LockOutlined, MailOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import * as authApi from '@/api/auth'
import { useAuthStore } from '@/store'
import './AdminLogin.less'

const AdminLogin: React.FC = () => {
  const navigate = useNavigate()
  const { login, clearAuth } = useAuthStore()
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true)
    try {
      const resp = await authApi.adminLogin(values)
      login(resp as any)
      message.success('管理员登录成功')
      navigate('/admin', { replace: true })
    } catch (e: any) {
      clearAuth()
      const backendMsg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message
      message.error(backendMsg || '管理员登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-login-page">
      <Card className="admin-login-card" bordered={false}>
        <div className="admin-login-head">
          <h1 className="admin-login-title">🎛️ 管理后台 · 管理员登录</h1>
          <div className="admin-login-sub">仅管理员账号可进入后台。普通用户请返回辩论平台。</div>
          <div className="admin-login-actions">
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/cases')}>
              返回平台
            </Button>
          </div>
        </div>

        <div style={{ padding: 18 }}>
          <Form layout="vertical" onFinish={onFinish}>
            <Form.Item name="email" label="邮箱" rules={[{ required: true, message: '请输入邮箱' }]}>
              <Input prefix={<MailOutlined />} placeholder="admin@example.com" autoComplete="email" />
            </Form.Item>
            <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" autoComplete="current-password" />
            </Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button type="primary" htmlType="submit" loading={loading}>
                登录后台
              </Button>
            </Space>
          </Form>
        </div>
      </Card>
    </div>
  )
}

export default AdminLogin


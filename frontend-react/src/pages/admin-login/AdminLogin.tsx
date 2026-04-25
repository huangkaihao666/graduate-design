import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Form, Input, message } from 'antd'
import { LockOutlined, MailOutlined, ArrowLeftOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import * as authApi from '@/api/auth'
import { useAdminAuthStore } from '@/store'
import './AdminLogin.less'

const AdminLogin: React.FC = () => {
  const navigate = useNavigate()
  const { login, clearAuth } = useAdminAuthStore()
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true)
    try {
      const resp = await authApi.adminLogin(values)
      login(resp as any)
      message.success('欢迎回来，管理员')
      navigate('/admin', { replace: true })
    } catch (e: any) {
      clearAuth()
      const backendMsg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message
      message.error(backendMsg || '账号或密码错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="adm-page">
      {/* 背景图 */}
      <div className="adm-bg-image" />
      <div className="adm-bg-overlay" />

      {/* 动态光晕 */}
      <div className="adm-orbs">
        <div className="adm-orb adm-orb-1" />
        <div className="adm-orb adm-orb-2" />
      </div>

      {/* 扫描线 */}
      <div className="adm-scanline" />

      {/* 登录卡片 */}
      <div className="adm-card">
        {/* 顶部徽标区 */}
        <div className="adm-badge">
          <SafetyCertificateOutlined className="adm-badge-icon" />
          <span className="adm-badge-label">管理员专属入口</span>
        </div>

        <h1 className="adm-title">后台管理中心</h1>
        <p className="adm-sub">仅限授权管理员访问，所有操作将被记录</p>

        <Form layout="vertical" onFinish={onFinish} className="adm-form">
          <Form.Item
            name="email"
            label="管理员邮箱"
            rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '邮箱格式不正确' }]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="请输入管理员邮箱"
              autoComplete="email"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="登录密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入登录密码"
              autoComplete="current-password"
              size="large"
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            size="large"
            className="adm-submit-btn"
            icon={<LockOutlined />}
          >
            安全登录
          </Button>
        </Form>

        <div className="adm-footer">
          <Button
            type="link"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/cases')}
            className="adm-back-btn"
          >
            返回平台首页
          </Button>
        </div>
      </div>
    </div>
  )
}

export default AdminLogin

import React from 'react'
import { Card, Form, Input, Button, message, Switch, Divider } from 'antd'
import { LockOutlined } from '@ant-design/icons'
import './Settings.less'

const Settings: React.FC = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = React.useState(false)

  const handleChangePassword = async () => {
    try {
      setLoading(true)
      // TODO: 调用修改密码的 API
      message.success('密码已修改成功')
      form.resetFields()
    } catch (error) {
      message.error('密码修改失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>系统设置</h1>
        <p>管理您的账户和应用偏好设置</p>
      </div>

      {/* 密码设置 */}
      <Card className="settings-card">
        <div className="card-title">
          <LockOutlined className="title-icon" />
          <span>修改密码</span>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleChangePassword}
        >
          <Form.Item
            label="当前密码"
            name="currentPassword"
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Input.Password placeholder="输入当前密码" />
          </Form.Item>

          <Form.Item
            label="新密码"
            name="newPassword"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少 6 个字符' },
            ]}
          >
            <Input.Password placeholder="输入新密码（至少 6 个字符）" />
          </Form.Item>

          <Form.Item
            label="确认新密码"
            name="confirmPassword"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次输入密码不一致'))
                },
              }),
            ]}
          >
            <Input.Password placeholder="再次输入新密码" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              修改密码
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Divider />

      {/* 通知设置 */}
      <Card className="settings-card">
        <div className="card-title">
          <span>📢 通知设置</span>
        </div>

        <div className="settings-group">
          <div className="setting-item">
            <div className="setting-label">
              <span className="label-title">邮件通知</span>
              <span className="label-desc">接收重要活动和更新的邮件通知</span>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="setting-item">
            <div className="setting-label">
              <span className="label-title">新评论通知</span>
              <span className="label-desc">当有新评论时立即通知</span>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="setting-item">
            <div className="setting-label">
              <span className="label-title">案件更新通知</span>
              <span className="label-desc">当案件状态变更时通知</span>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      </Card>

      {/* 隐私设置 */}
      <Card className="settings-card">
        <div className="card-title">
          <span>🔒 隐私设置</span>
        </div>

        <div className="settings-group">
          <div className="setting-item">
            <div className="setting-label">
              <span className="label-title">公开个人资料</span>
              <span className="label-desc">允许其他用户看到您的个人信息</span>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="setting-item">
            <div className="setting-label">
              <span className="label-title">显示参与记录</span>
              <span className="label-desc">允许他人看到您参与的案件</span>
            </div>
            <Switch />
          </div>
        </div>
      </Card>
    </div>
  )
}

export default Settings

import React from 'react'
import { Card, Button, Input, Avatar, Space, message, Divider } from 'antd'
import { SaveOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store'
import { useNavigate } from 'react-router-dom'
import './Profile.less'

const Profile: React.FC = () => {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = React.useState(false)
  const [form, setForm] = React.useState({
    name: user?.name || '',
    email: user?.email || '',
    bio: '',
  })

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    try {
      // TODO: 调用更新用户信息的 API
      message.success('个人信息已更新')
      setIsEditing(false)
    } catch (error) {
      message.error('更新失败，请重试')
    }
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>个人资料</h1>
        <p>管理您的个人信息和账户设置</p>
      </div>

      <Card className="profile-card">
        <div className="profile-content">
          {/* 头像部分 */}
          <div className="profile-avatar-section">
            <Avatar
              size={120}
              src={user?.avatar}
              style={{ backgroundColor: '#667eea' }}
            />
            <Button type="primary" onClick={() => setIsEditing(!isEditing)}>
              {isEditing ? '取消编辑' : '编辑信息'}
            </Button>
          </div>

          <Divider />

          {/* 信息部分 */}
          <div className="profile-info-section">
            <div className="form-group">
              <label>用户名</label>
              <Input
                value={form.name}
                onChange={e => handleChange('name', e.target.value)}
                disabled={!isEditing}
                placeholder="输入用户名"
              />
            </div>

            <div className="form-group">
              <label>邮箱</label>
              <Input
                value={form.email}
                onChange={e => handleChange('email', e.target.value)}
                disabled
                placeholder="邮箱地址"
              />
            </div>

            <div className="form-group">
              <label>个人签名</label>
              <Input.TextArea
                value={form.bio}
                onChange={e => handleChange('bio', e.target.value)}
                disabled={!isEditing}
                placeholder="输入个人签名"
                rows={4}
              />
            </div>
          </div>

          {isEditing && (
            <Space style={{ width: '100%', justifyContent: 'flex-end', marginTop: 24 }}>
              <Button onClick={() => setIsEditing(false)}>取消</Button>
              <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
                保存
              </Button>
            </Space>
          )}
        </div>
      </Card>

      <Card className="profile-card">
        <h3>账户设置</h3>
        <div className="settings-group">
          <Button block onClick={() => navigate('/settings')}>
            修改密码
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default Profile

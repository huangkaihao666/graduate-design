import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Space } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import Profile from '@/pages/profile/Profile'
import './Me.less'

const Me: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="me-page">
      <div className="me-shell">
        <div className="me-topbar">
          <div className="me-brand" onClick={() => navigate('/cases')}>
            <div className="logo">🎭</div>
            <div className="title">辩论平台 · 个人中心</div>
          </div>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/cases')}>
              返回案件列表
            </Button>
          </Space>
        </div>

        <div className="me-hero">
          <h1>个人主页</h1>
          <p>在这里管理你的资料、案件、投票与画像。所有数据均来自数据库实时计算。</p>
        </div>

        <div className="me-tabs">
          <Profile />
        </div>
      </div>
    </div>
  )
}

export default Me


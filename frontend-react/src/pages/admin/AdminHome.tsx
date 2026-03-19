import React from 'react'
import { Card, Space, Tag, Typography } from 'antd'
import { useAuthStore } from '@/store'

const { Title, Paragraph, Text } = Typography

const AdminHome: React.FC = () => {
  const { user } = useAuthStore()
  return (
    <div style={{ padding: 18 }}>
      <Card style={{ borderRadius: 16 }}>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <Title level={3} style={{ margin: 0 }}>
            🎛️ 管理后台
          </Title>
          <Paragraph style={{ margin: 0, color: '#475569' }}>
            管理功能稍后接入。当前仅完成后台抽离与管理员登录鉴权。
          </Paragraph>
          <div>
            <Text type="secondary">当前账号：</Text>
            <Tag color="purple" style={{ marginLeft: 8 }}>
              {(user as any)?.email || (user as any)?.name}
            </Tag>
            <Tag color={(user as any)?.role === 'ADMIN' ? 'green' : 'default'}>
              role={(user as any)?.role || 'USER'}
            </Tag>
          </div>
        </Space>
      </Card>
    </div>
  )
}

export default AdminHome


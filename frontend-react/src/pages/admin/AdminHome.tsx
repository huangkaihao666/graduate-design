import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button, Card, Col, Row, Space, Statistic, Table, Tag, Typography } from 'antd'
import { useAuthStore } from '@/store'
import * as adminApi from '@/api/admin'

const { Title, Paragraph, Text } = Typography

const AdminHome: React.FC = () => {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => adminApi.getAdminOverview(),
  })

  const { data: hotTopics, isLoading: hotLoading } = useQuery({
    queryKey: ['admin-hot-topics'],
    queryFn: () => adminApi.getAdminHotTopics(5),
  })

  const hotRows = useMemo(() => (Array.isArray(hotTopics) ? hotTopics : []), [hotTopics])

  return (
    <div style={{ padding: 18 }}>
      <Row gutter={[14, 14]}>
        <Col xs={24}>
          <Card style={{ borderRadius: 16 }}>
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <div>
                <Title level={3} style={{ margin: 0 }}>
                  🎛️ 管理后台 · 概览
                </Title>
                <Paragraph style={{ margin: '6px 0 0', color: '#475569' }}>
                  快速掌握核心指标，并一键进入常用管理页面。
                </Paragraph>
              </div>
              <div>
                <Text type="secondary">当前账号：</Text>
                <Tag color="purple" style={{ marginLeft: 8 }}>
                  {(user as any)?.email || (user as any)?.name}
                </Tag>
                <Tag color={(user as any)?.role === 'ADMIN' ? 'green' : 'default'}>
                  role={(user as any)?.role || 'USER'}
                </Tag>
              </div>

              <Space wrap>
                <Button type="primary" onClick={() => navigate('/admin/rooms')}>
                  房间管理
                </Button>
                <Button onClick={() => navigate('/admin/users')}>用户管理</Button>
                <Button onClick={() => navigate('/admin/messages')}>消息审核</Button>
                <Button onClick={() => navigate('/admin/stats')}>数据面板</Button>
              </Space>
            </Space>
          </Card>
        </Col>

        <Col xs={24} md={6}>
          <Card style={{ borderRadius: 16 }} loading={overviewLoading}>
            <Statistic title="总案件数" value={(overview as any)?.rooms ?? 0} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card style={{ borderRadius: 16 }} loading={overviewLoading}>
            <Statistic title="总用户数" value={(overview as any)?.users ?? 0} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card style={{ borderRadius: 16 }} loading={overviewLoading}>
            <Statistic title="今日新用户" value={(overview as any)?.todayUsers ?? 0} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card style={{ borderRadius: 16 }} loading={overviewLoading}>
            <Statistic title="活跃用户" value={(overview as any)?.activeUsers ?? 0} />
          </Card>
        </Col>

        <Col xs={24}>
          <Card style={{ borderRadius: 16 }} title="热门房间（Top 5）" loading={hotLoading}>
            <Table
              rowKey="id"
              dataSource={hotRows}
              pagination={false}
              size="small"
              columns={[
                { title: 'ID', dataIndex: 'id', width: 70 },
                { title: '标题', dataIndex: 'title', ellipsis: true },
                {
                  title: '状态',
                  dataIndex: 'status',
                  width: 110,
                  render: (v: string) => (
                    <Tag color={v === 'LIVE' ? 'blue' : v === 'WAITING' ? 'gold' : 'default'}>{v}</Tag>
                  ),
                },
                { title: '围观', dataIndex: 'viewCount', width: 90 },
                { title: '评论', dataIndex: 'commentCount', width: 90 },
                {
                  title: '创建时间',
                  dataIndex: 'createdAt',
                  width: 170,
                  render: (v: string) => (v ? new Date(v).toLocaleString() : '-'),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default AdminHome


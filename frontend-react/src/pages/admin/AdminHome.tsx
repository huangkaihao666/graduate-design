import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button, Card, Col, Row, Space, Statistic, Table, Tag, Typography } from 'antd'
import {
  FileTextOutlined,
  UserOutlined,
  LikeOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  StopOutlined,
  UserAddOutlined,
} from '@ant-design/icons'
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

  const ov = overview as any
  const hotRows = useMemo(() => (Array.isArray(hotTopics) ? hotTopics : []), [hotTopics])

  return (
    <div style={{ padding: 18 }}>
      <Row gutter={[14, 14]}>
        {/* 顶部欢迎卡 */}
        <Col xs={24}>
          <Card style={{ borderRadius: 16 }}>
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <div>
                <Title level={3} style={{ margin: 0 }}>🎛️ 管理后台 · 概览</Title>
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
                <Button type="primary" onClick={() => navigate('/admin/rooms')}>房间管理</Button>
                <Button onClick={() => navigate('/admin/users')}>用户管理</Button>
                <Button onClick={() => navigate('/admin/messages')}>消息审核</Button>
                <Button onClick={() => navigate('/admin/stats')}>数据面板</Button>
              </Space>
            </Space>
          </Card>
        </Col>

        {/* ── 案件统计 ── */}
        <Col xs={24}>
          <Text type="secondary" style={{ fontSize: 12, paddingLeft: 4 }}>案件数据</Text>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16 }} loading={overviewLoading}>
            <Statistic
              title="总案件数"
              value={ov?.totalRooms ?? 0}
              prefix={<FileTextOutlined style={{ color: '#6366F1' }} />}
              valueStyle={{ color: '#6366F1' }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16 }} loading={overviewLoading}>
            <Statistic
              title="进行中"
              value={ov?.liveRooms ?? 0}
              prefix={<PlayCircleOutlined style={{ color: '#3B82F6' }} />}
              valueStyle={{ color: '#3B82F6' }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16 }} loading={overviewLoading}>
            <Statistic
              title="已结案"
              value={ov?.closedRooms ?? 0}
              prefix={<CheckCircleOutlined style={{ color: '#10B981' }} />}
              valueStyle={{ color: '#10B981' }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16 }} loading={overviewLoading}>
            <Statistic
              title="总投票数"
              value={ov?.totalVotes ?? 0}
              prefix={<LikeOutlined style={{ color: '#F59E0B' }} />}
              valueStyle={{ color: '#F59E0B' }}
              suffix={<span style={{ fontSize: 13, color: '#94A3B8' }}>（今日 +{ov?.todayVotes ?? 0}）</span>}
            />
          </Card>
        </Col>

        {/* ── 用户统计 ── */}
        <Col xs={24}>
          <Text type="secondary" style={{ fontSize: 12, paddingLeft: 4 }}>用户数据</Text>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16 }} loading={overviewLoading}>
            <Statistic
              title="总用户数"
              value={ov?.totalUsers ?? 0}
              prefix={<UserOutlined style={{ color: '#8B5CF6' }} />}
              valueStyle={{ color: '#8B5CF6' }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16 }} loading={overviewLoading}>
            <Statistic
              title="今日新增"
              value={ov?.todayUsers ?? 0}
              prefix={<UserAddOutlined style={{ color: '#06B6D4' }} />}
              valueStyle={{ color: '#06B6D4' }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16 }} loading={overviewLoading}>
            <Statistic
              title="本周新增"
              value={ov?.weekUsers ?? 0}
              prefix={<UserAddOutlined style={{ color: '#10B981' }} />}
              valueStyle={{ color: '#10B981' }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16 }} loading={overviewLoading}>
            <Statistic
              title="封禁用户"
              value={ov?.bannedUsers ?? 0}
              prefix={<StopOutlined style={{ color: '#EF4444' }} />}
              valueStyle={{ color: ov?.bannedUsers > 0 ? '#EF4444' : undefined }}
            />
          </Card>
        </Col>

        {/* ── 热门房间 ── */}
        <Col xs={24}>
          <Card style={{ borderRadius: 16 }} title="热门房间（Top 5）" loading={hotLoading}>
            <Table
              rowKey="id"
              dataSource={hotRows}
              pagination={false}
              size="small"
              columns={[
                { title: 'ID', dataIndex: 'id', width: 55 },
                { title: '标题', dataIndex: 'title', ellipsis: true },
                { title: '发起人', dataIndex: 'ownerName', width: 100, ellipsis: true },
                {
                  title: '状态',
                  dataIndex: 'status',
                  width: 90,
                  render: (v: string) => (
                    <Tag color={v === 'LIVE' ? 'blue' : v === 'WAITING' ? 'gold' : 'default'}>
                      {v === 'LIVE' ? '进行中' : v === 'WAITING' ? '待开始' : '已结案'}
                    </Tag>
                  ),
                },
                { title: '围观', dataIndex: 'viewCount', width: 70 },
                { title: '评论', dataIndex: 'commentCount', width: 70 },
                { title: '投票', dataIndex: 'voteCount', width: 70 },
                {
                  title: '创建时间',
                  dataIndex: 'createdAt',
                  width: 150,
                  render: (v: string) => (v ? new Date(v).toLocaleString('zh-CN') : '-'),
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

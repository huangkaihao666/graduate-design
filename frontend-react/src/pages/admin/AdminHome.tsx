import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button, Skeleton, Table, Tag } from 'antd'
import {
  FileTextOutlined,
  UserOutlined,
  LikeOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  StopOutlined,
  UserAddOutlined,
} from '@ant-design/icons'
import { useAdminAuthStore } from '@/store/adminAuthStore'
import * as adminApi from '@/api/admin'
import './AdminHome.less'

const AdminHome: React.FC = () => {
  const { user } = useAdminAuthStore()
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

  const caseStats = [
    { label: '总案件数', value: ov?.totalRooms ?? 0, icon: <FileTextOutlined />, color: '#6366f1', suffix: null },
    { label: '进行中', value: ov?.liveRooms ?? 0, icon: <PlayCircleOutlined />, color: '#3b82f6', suffix: null },
    { label: '已结案', value: ov?.closedRooms ?? 0, icon: <CheckCircleOutlined />, color: '#10b981', suffix: null },
    { label: '总投票数', value: ov?.totalVotes ?? 0, icon: <LikeOutlined />, color: '#f59e0b', suffix: `今日 +${ov?.todayVotes ?? 0}` },
  ]

  const userStats = [
    { label: '总用户数', value: ov?.totalUsers ?? 0, icon: <UserOutlined />, color: '#8b5cf6', suffix: null },
    { label: '今日新增', value: ov?.todayUsers ?? 0, icon: <UserAddOutlined />, color: '#06b6d4', suffix: null },
    { label: '本周新增', value: ov?.weekUsers ?? 0, icon: <UserAddOutlined />, color: '#10b981', suffix: null },
    { label: '封禁用户', value: ov?.bannedUsers ?? 0, icon: <StopOutlined />, color: ov?.bannedUsers > 0 ? '#ef4444' : '#b0a89c', suffix: null },
  ]

  return (
    <div className="ah-page">
      {/* 欢迎 Banner */}
      <div className="ah-welcome">
        <div className="ah-welcome-inner">
          <h2 className="ah-welcome-title">🎛️ 管理后台 · 概览</h2>
          <p className="ah-welcome-sub">快速掌握核心指标，并一键进入常用管理页面。</p>
          <div className="ah-user-row">
            <span className="ah-user-label">当前账号：</span>
            <Tag color="purple" style={{ borderRadius: 6, fontWeight: 600 }}>
              {(user as any)?.email || (user as any)?.name}
            </Tag>
            <Tag
              color={(user as any)?.role === 'ADMIN' ? 'green' : 'default'}
              style={{ borderRadius: 6, fontWeight: 600 }}
            >
              role={(user as any)?.role || 'USER'}
            </Tag>
          </div>
          <div className="ah-quick-btns">
            <Button className="ah-quick-btn ah-quick-btn-primary" onClick={() => navigate('/admin/rooms')}>
              房间管理
            </Button>
            {['用户管理', '消息审核', '数据面板'].map((label, i) => (
              <Button
                key={label}
                className="ah-quick-btn ah-quick-btn-default"
                onClick={() => navigate(['/admin/users', '/admin/messages', '/admin/stats'][i])}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* 案件数据 */}
      <span className="ah-section-label">案件数据</span>
      <div className="ah-stats-grid">
        {caseStats.map(({ label, value, icon, color, suffix }) => (
          <div key={label} className="ah-stat-card" style={{ '--stat-color': color } as React.CSSProperties}>
            {overviewLoading ? (
              <Skeleton active paragraph={{ rows: 1 }} title={{ width: '60%' }} />
            ) : (
              <>
                <span className="ah-stat-label">{label}</span>
                <div className="ah-stat-value-row">
                  <span className="ah-stat-icon" style={{ color }}>{icon}</span>
                  <span className="ah-stat-num" style={{ color }}>{value}</span>
                  {suffix && <span className="ah-stat-suffix">（{suffix}）</span>}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* 用户数据 */}
      <span className="ah-section-label">用户数据</span>
      <div className="ah-stats-grid">
        {userStats.map(({ label, value, icon, color, suffix }) => (
          <div key={label} className="ah-stat-card" style={{ '--stat-color': color } as React.CSSProperties}>
            {overviewLoading ? (
              <Skeleton active paragraph={{ rows: 1 }} title={{ width: '60%' }} />
            ) : (
              <>
                <span className="ah-stat-label">{label}</span>
                <div className="ah-stat-value-row">
                  <span className="ah-stat-icon" style={{ color }}>{icon}</span>
                  <span className="ah-stat-num" style={{ color }}>{value}</span>
                  {suffix && <span className="ah-stat-suffix">（{suffix}）</span>}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* 热门房间 */}
      <div className="ah-hot-card">
        <div className="ah-hot-header">
          <h3 className="ah-hot-title">热门房间</h3>
          <span className="ah-hot-badge">Top 5</span>
        </div>
        <Table
          className="ah-table"
          rowKey="id"
          dataSource={hotRows}
          loading={hotLoading}
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
                <Tag
                  color={v === 'LIVE' ? 'blue' : v === 'WAITING' ? 'gold' : 'default'}
                  style={{ borderRadius: 6, fontWeight: 600, fontSize: 11 }}
                >
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
              render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-',
            },
          ]}
        />
      </div>
    </div>
  )
}

export default AdminHome

import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, Col, Row, Statistic, Table, Tag } from 'antd'
import {
  FileTextOutlined,
  UserOutlined,
  LikeOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  UserAddOutlined,
  StopOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import * as adminApi from '@/api/admin'

const StatsAdmin: React.FC = () => {
  const { data: overview } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => adminApi.getAdminOverview(),
  })
  const { data: trends } = useQuery({
    queryKey: ['admin-trends'],
    queryFn: () => adminApi.getAdminTrends(14),
  })
  const { data: hotTopics } = useQuery({
    queryKey: ['admin-hot-topics'],
    queryFn: () => adminApi.getAdminHotTopics(10),
  })

  const ov = overview as any

  const trendOption = useMemo(() => {
    const list = Array.isArray(trends) ? trends : []
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['新增案件', '新增用户', '新增投票'], bottom: 0 },
      grid: { left: 36, right: 20, top: 16, bottom: 40 },
      xAxis: { type: 'category', data: list.map((i: any) => i.date), axisLabel: { fontSize: 11 } },
      yAxis: { type: 'value', minInterval: 1 },
      series: [
        {
          name: '新增案件',
          type: 'line',
          smooth: true,
          data: list.map((i: any) => i.rooms ?? i.count ?? 0),
          areaStyle: { color: 'rgba(99,102,241,0.1)' },
          lineStyle: { color: '#6366F1', width: 2 },
          itemStyle: { color: '#6366F1' },
        },
        {
          name: '新增用户',
          type: 'line',
          smooth: true,
          data: list.map((i: any) => i.users ?? 0),
          areaStyle: { color: 'rgba(16,185,129,0.08)' },
          lineStyle: { color: '#10B981', width: 2 },
          itemStyle: { color: '#10B981' },
        },
        {
          name: '新增投票',
          type: 'line',
          smooth: true,
          data: list.map((i: any) => i.votes ?? 0),
          areaStyle: { color: 'rgba(245,158,11,0.08)' },
          lineStyle: { color: '#F59E0B', width: 2 },
          itemStyle: { color: '#F59E0B' },
        },
      ],
    }
  }, [trends])

  return (
    <div>
      <Row gutter={[14, 14]}>
        {/* ── 案件 ── */}
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16 }}>
            <Statistic
              title="总案件数"
              value={ov?.totalRooms ?? 0}
              prefix={<FileTextOutlined style={{ color: '#6366F1' }} />}
              valueStyle={{ color: '#6366F1' }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16 }}>
            <Statistic
              title="进行中"
              value={ov?.liveRooms ?? 0}
              prefix={<PlayCircleOutlined style={{ color: '#3B82F6' }} />}
              valueStyle={{ color: '#3B82F6' }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16 }}>
            <Statistic
              title="已结案"
              value={ov?.closedRooms ?? 0}
              prefix={<CheckCircleOutlined style={{ color: '#10B981' }} />}
              valueStyle={{ color: '#10B981' }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16 }}>
            <Statistic
              title="总投票数"
              value={ov?.totalVotes ?? 0}
              prefix={<LikeOutlined style={{ color: '#F59E0B' }} />}
              valueStyle={{ color: '#F59E0B' }}
              suffix={<span style={{ fontSize: 12, color: '#94A3B8' }}>今日 +{ov?.todayVotes ?? 0}</span>}
            />
          </Card>
        </Col>

        {/* ── 用户 ── */}
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16 }}>
            <Statistic
              title="总用户数"
              value={ov?.totalUsers ?? 0}
              prefix={<UserOutlined style={{ color: '#8B5CF6' }} />}
              valueStyle={{ color: '#8B5CF6' }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16 }}>
            <Statistic
              title="今日新增用户"
              value={ov?.todayUsers ?? 0}
              prefix={<UserAddOutlined style={{ color: '#06B6D4' }} />}
              valueStyle={{ color: '#06B6D4' }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16 }}>
            <Statistic
              title="本周新增用户"
              value={ov?.weekUsers ?? 0}
              prefix={<UserAddOutlined style={{ color: '#10B981' }} />}
              valueStyle={{ color: '#10B981' }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 16 }}>
            <Statistic
              title="封禁用户"
              value={ov?.bannedUsers ?? 0}
              prefix={<StopOutlined style={{ color: '#EF4444' }} />}
              valueStyle={{ color: ov?.bannedUsers > 0 ? '#EF4444' : undefined }}
            />
          </Card>
        </Col>

        {/* ── 趋势图 ── */}
        <Col xs={24} md={14}>
          <Card style={{ borderRadius: 16 }} title="近 14 天趋势（案件 / 用户 / 投票）">
            <ReactECharts option={trendOption as any} style={{ height: 320 }} />
          </Card>
        </Col>

        {/* ── 热门话题 ── */}
        <Col xs={24} md={10}>
          <Card style={{ borderRadius: 16 }} title="热门话题排行（Top 10）">
            <Table
              rowKey="id"
              dataSource={Array.isArray(hotTopics) ? hotTopics : []}
              pagination={false}
              columns={[
                { title: 'ID', dataIndex: 'id', width: 50 },
                { title: '标题', dataIndex: 'title', ellipsis: true },
                {
                  title: '状态',
                  dataIndex: 'status',
                  width: 80,
                  render: (v: string) => (
                    <Tag color={v === 'LIVE' ? 'blue' : v === 'WAITING' ? 'gold' : 'default'}>
                      {v === 'LIVE' ? '进行中' : v === 'WAITING' ? '待开始' : '已结案'}
                    </Tag>
                  ),
                },
                { title: '围观', dataIndex: 'viewCount', width: 60 },
                { title: '评论', dataIndex: 'commentCount', width: 60 },
                { title: '投票', dataIndex: 'voteCount', width: 60 },
              ]}
              size="small"
              scroll={{ y: 280 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default StatsAdmin

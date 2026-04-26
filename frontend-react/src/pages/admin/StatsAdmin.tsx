import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Table, Tag } from 'antd'
import {
  FileTextOutlined, UserOutlined, LikeOutlined,
  PlayCircleOutlined, CheckCircleOutlined,
  UserAddOutlined, StopOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import * as adminApi from '@/api/admin'
import './StatsAdmin.less'

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

  const stats = [
    { label: '总案件数',    value: ov?.totalRooms ?? 0,  icon: <FileTextOutlined />,   color: '#6366f1', suffix: null },
    { label: '进行中',      value: ov?.liveRooms ?? 0,   icon: <PlayCircleOutlined />, color: '#3b82f6', suffix: null },
    { label: '已结案',      value: ov?.closedRooms ?? 0, icon: <CheckCircleOutlined />,color: '#10b981', suffix: null },
    { label: '总投票数',    value: ov?.totalVotes ?? 0,  icon: <LikeOutlined />,       color: '#f59e0b', suffix: `今日 +${ov?.todayVotes ?? 0}` },
    { label: '总用户数',    value: ov?.totalUsers ?? 0,  icon: <UserOutlined />,       color: '#8b5cf6', suffix: null },
    { label: '今日新增用户',value: ov?.todayUsers ?? 0,  icon: <UserAddOutlined />,    color: '#06b6d4', suffix: null },
    { label: '本周新增用户',value: ov?.weekUsers ?? 0,   icon: <UserAddOutlined />,    color: '#10b981', suffix: null },
    { label: '封禁用户',    value: ov?.bannedUsers ?? 0, icon: <StopOutlined />,       color: ov?.bannedUsers > 0 ? '#ef4444' : '#b0a89c', suffix: null },
  ]

  const trendOption = useMemo(() => {
    const list = Array.isArray(trends) ? trends : []
    return {
      tooltip: { trigger: 'axis', backgroundColor: '#faf8f4', borderColor: 'rgba(26,22,18,0.1)', textStyle: { color: '#1a1612', fontSize: 12 } },
      legend: { data: ['新增案件', '新增用户', '新增投票'], bottom: 0, textStyle: { color: '#6b6459', fontSize: 11 } },
      grid: { left: 36, right: 20, top: 16, bottom: 40 },
      xAxis: { type: 'category', data: list.map((i: any) => i.date), axisLabel: { fontSize: 11, color: '#b0a89c' }, axisLine: { lineStyle: { color: 'rgba(26,22,18,0.1)' } } },
      yAxis: { type: 'value', minInterval: 1, axisLabel: { color: '#b0a89c', fontSize: 11 }, splitLine: { lineStyle: { color: 'rgba(26,22,18,0.06)' } } },
      series: [
        { name: '新增案件', type: 'line', smooth: true, data: list.map((i: any) => i.rooms ?? i.count ?? 0), areaStyle: { color: 'rgba(99,102,241,0.08)' }, lineStyle: { color: '#6366f1', width: 2 }, itemStyle: { color: '#6366f1' } },
        { name: '新增用户', type: 'line', smooth: true, data: list.map((i: any) => i.users ?? 0), areaStyle: { color: 'rgba(16,185,129,0.07)' }, lineStyle: { color: '#10b981', width: 2 }, itemStyle: { color: '#10b981' } },
        { name: '新增投票', type: 'line', smooth: true, data: list.map((i: any) => i.votes ?? 0), areaStyle: { color: 'rgba(245,158,11,0.07)' }, lineStyle: { color: '#f59e0b', width: 2 }, itemStyle: { color: '#f59e0b' } },
      ],
    }
  }, [trends])

  return (
    <div className="sa-page">
      <div className="sa-stats-grid">
        {stats.map(({ label, value, icon, color, suffix }) => (
          <div key={label} className="sa-stat-card" style={{ '--stat-color': color } as React.CSSProperties}>
            <span className="sa-stat-label">{label}</span>
            <div className="sa-stat-value-row">
              <span className="sa-stat-icon" style={{ color }}>{icon}</span>
              <span className="sa-stat-num" style={{ color }}>{value}</span>
              {suffix && <span className="sa-stat-suffix">{suffix}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="sa-charts-row">
        <div className="sa-chart-card">
          <div className="sa-chart-header">
            <h3 className="sa-chart-title">近 14 天趋势</h3>
          </div>
          <div className="sa-chart-body">
            <ReactECharts option={trendOption as any} style={{ height: 300 }} />
          </div>
        </div>

        <div className="sa-chart-card">
          <div className="sa-chart-header">
            <h3 className="sa-chart-title">热门话题排行</h3>
          </div>
          <Table
            className="sa-table"
            rowKey="id"
            dataSource={Array.isArray(hotTopics) ? hotTopics : []}
            pagination={false}
            size="small"
            scroll={{ y: 260 }}
            columns={[
              { title: 'ID', dataIndex: 'id', width: 45 },
              { title: '标题', dataIndex: 'title', ellipsis: true },
              {
                title: '状态',
                dataIndex: 'status',
                width: 72,
                render: (v: string) => (
                  <Tag
                    color={v === 'LIVE' ? 'blue' : v === 'WAITING' ? 'gold' : 'default'}
                    style={{ borderRadius: 6, fontWeight: 600, fontSize: 10 }}
                  >
                    {v === 'LIVE' ? '进行中' : v === 'WAITING' ? '待开始' : '已结案'}
                  </Tag>
                ),
              },
              { title: '围观', dataIndex: 'viewCount', width: 52 },
            ]}
          />
        </div>
      </div>
    </div>
  )
}

export default StatsAdmin

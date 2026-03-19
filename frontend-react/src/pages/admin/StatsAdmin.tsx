import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, Col, Row, Space, Statistic, Table, Tag } from 'antd'
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

  const trendOption = useMemo(() => {
    const list = Array.isArray(trends) ? trends : []
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 30, right: 20, top: 20, bottom: 30 },
      xAxis: { type: 'category', data: list.map((i: any) => i.date) },
      yAxis: { type: 'value' },
      series: [
        {
          type: 'line',
          smooth: true,
          data: list.map((i: any) => i.count),
          areaStyle: { color: 'rgba(99,102,241,0.18)' },
          lineStyle: { color: '#667eea', width: 3 },
          itemStyle: { color: '#667eea' },
        },
      ],
    }
  }, [trends])

  return (
    <div>
      <Row gutter={[14, 14]}>
        <Col xs={24} md={6}>
          <Card style={{ borderRadius: 16 }}>
            <Statistic title="总案件数" value={(overview as any)?.rooms ?? 0} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card style={{ borderRadius: 16 }}>
            <Statistic title="总用户数" value={(overview as any)?.users ?? 0} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card style={{ borderRadius: 16 }}>
            <Statistic title="今日新用户" value={(overview as any)?.todayUsers ?? 0} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card style={{ borderRadius: 16 }}>
            <Statistic title="活跃用户" value={(overview as any)?.activeUsers ?? 0} />
          </Card>
        </Col>

        <Col xs={24} md={14}>
          <Card style={{ borderRadius: 16 }} title="案件发布趋势（近 14 天）">
            <ReactECharts option={trendOption as any} style={{ height: 320 }} />
          </Card>
        </Col>
        <Col xs={24} md={10}>
          <Card style={{ borderRadius: 16 }} title="热门话题排行">
            <Table
              rowKey="id"
              dataSource={Array.isArray(hotTopics) ? hotTopics : []}
              pagination={false}
              columns={[
                { title: 'ID', dataIndex: 'id', width: 70 },
                { title: '标题', dataIndex: 'title', ellipsis: true },
                {
                  title: '状态',
                  dataIndex: 'status',
                  width: 100,
                  render: (v: string) => (
                    <Tag color={v === 'LIVE' ? 'blue' : v === 'WAITING' ? 'gold' : 'default'}>{v}</Tag>
                  ),
                },
                { title: '围观', dataIndex: 'viewCount', width: 80 },
                { title: '评论', dataIndex: 'commentCount', width: 80 },
              ]}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default StatsAdmin


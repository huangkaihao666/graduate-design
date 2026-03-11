import React, { useState } from 'react'
import { Row, Col, Input, Select, Button, Spin, Empty, Tabs, message } from 'antd'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { CaseCard } from '@/components/CaseCard'
import * as roomApi from '@/api/rooms'
import './Home.less'

interface Agent {
  [key: string]: any
}

export const Home: React.FC = () => {
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [status, setStatus] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [search, setSearch] = useState('')

  // 获取案件列表
  const {
    data: roomsData,
    isLoading: roomsLoading,
    refetch: refetchRooms,
  } = useQuery({
    queryKey: ['rooms', page, pageSize, status, sortBy, search],
    queryFn: () =>
      roomApi.getRooms({
        page,
        pageSize,
        status: status === 'all' ? undefined : status,
        sort: sortBy,
        search: search || undefined,
      }),
    staleTime: 5 * 60 * 1000, // 5 分钟缓存
  })

  // 获取所有 Agents
  const { data: agentsData } = useQuery({
    queryKey: ['agents'],
    queryFn: roomApi.getAllAgents,
    staleTime: Infinity,
  })

  const agents: Agent = {}
  // agentsData 现在直接是数组（经过拦截器处理）
  if (agentsData && Array.isArray(agentsData)) {
    agentsData.forEach((agent: any) => {
      agents[agent.id] = agent
    })
  }

  // roomsData 现在是 { data: [...], pagination: {...} } 的对象
  const roomsList = (roomsData as any)?.data || []
  const pagination = (roomsData as any)?.pagination || {}

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const handleRefresh = async () => {
    await refetchRooms()
    message.success('刷新成功')
  }

  const tabItems = [
    {
      key: 'all',
      label: '全部案件',
      children: (
        <div className="cases-grid">
          {roomsLoading ? (
            <Spin className="spinner-center" />
          ) : roomsList.length === 0 ? (
            <Empty description="暂无案件" />
          ) : (
            <Row gutter={[16, 16]}>
              {roomsList.map((room: any) => (
                <Col key={room.id} xs={24} sm={12} md={8} lg={6}>
                  <CaseCard room={room} agents={agents} />
                </Col>
              ))}
            </Row>
          )}
        </div>
      ),
    },
    {
      key: 'WAITING',
      label: '等待中',
      children: (
        <div className="cases-grid">
          {roomsLoading ? (
            <Spin className="spinner-center" />
          ) : roomsList.length === 0 ? (
            <Empty description="暂无等待中的案件" />
          ) : (
            <Row gutter={[16, 16]}>
              {roomsList.map((room: any) => (
                <Col key={room.id} xs={24} sm={12} md={8} lg={6}>
                  <CaseCard room={room} agents={agents} />
                </Col>
              ))}
            </Row>
          )}
        </div>
      ),
    },
    {
      key: 'LIVE',
      label: '进行中',
      children: (
        <div className="cases-grid">
          {roomsLoading ? (
            <Spin className="spinner-center" />
          ) : roomsList.length === 0 ? (
            <Empty description="暂无进行中的案件" />
          ) : (
            <Row gutter={[16, 16]}>
              {roomsList.map((room: any) => (
                <Col key={room.id} xs={24} sm={12} md={8} lg={6}>
                  <CaseCard room={room} agents={agents} />
                </Col>
              ))}
            </Row>
          )}
        </div>
      ),
    },
    {
      key: 'CLOSED',
      label: '已结束',
      children: (
        <div className="cases-grid">
          {roomsLoading ? (
            <Spin className="spinner-center" />
          ) : roomsList.length === 0 ? (
            <Empty description="暂无已结束的案件" />
          ) : (
            <Row gutter={[16, 16]}>
              {roomsList.map((room: any) => (
                <Col key={room.id} xs={24} sm={12} md={8} lg={6}>
                  <CaseCard room={room} agents={agents} />
                </Col>
              ))}
            </Row>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="home-page">
      <div className="home-header">
        <h1 className="home-title">🎭 案件辩论</h1>
        <p className="home-subtitle">发现最新的案件，参与热烈的辩论讨论</p>

        {/* 搜索和过滤 */}
        <div className="home-filters">
          {/* 搜索栏 */}
          <div className="search-bar">
            <Input.Search
              placeholder="搜索案件标题或内容..."
              allowClear
              onSearch={handleSearch}
              prefix={<SearchOutlined />}
              size="large"
              enterButton
            />
          </div>

          {/* 排序选项 */}
          <div className="filter-controls">
            <Select
              value={sortBy}
              onChange={setSortBy}
              options={[
                { label: '📅 最新发布', value: 'newest' },
                { label: '🔥 热度排序', value: 'hot' },
                { label: '📝 我的案件', value: 'mine' },
              ]}
              placeholder="选择排序方式"
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={roomsLoading}
            >
              刷新
            </Button>
          </div>
        </div>
      </div>

      {/* Tab 页签 */}
      <Tabs
        activeKey={status}
        onChange={(key) => {
          setStatus(key)
          setPage(1)
        }}
        items={tabItems}
      />

      {/* 分页信息 */}
      {!roomsLoading && pagination.total > 0 && (
        <div className="pagination-info">
          <span>
            共 {pagination.total} 个案件，第 {page} 页
          </span>
        </div>
      )}
    </div>
  )
}

export default Home

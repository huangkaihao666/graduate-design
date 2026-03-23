import React, { useState } from 'react'
import { Row, Col, Input, Select, Button, Spin, Empty, Tag } from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  FireOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  PlusOutlined,
  RightOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { CaseCard } from '@/components/CaseCard'
import * as roomApi from '@/api/rooms'
import './Home.less'

interface Agent {
  [key: string]: any
}

const STATUS_TABS = [
  { key: 'all',     label: '全部',    icon: <ThunderboltOutlined /> },
  { key: 'WAITING', label: '等待中',  icon: <ClockCircleOutlined /> },
  { key: 'LIVE',    label: '进行中',  icon: <FireOutlined /> },
  { key: 'CLOSED',  label: '已结束',  icon: null },
]

export const Home: React.FC = () => {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [pageSize] = useState(12)
  const [status, setStatus] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [search, setSearch] = useState('')

  const {
    data: roomsData,
    isLoading: roomsLoading,
    refetch: refetchRooms,
    isFetching,
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
    staleTime: 5 * 60 * 1000,
  })

  const { data: agentsData } = useQuery({
    queryKey: ['agents'],
    queryFn: roomApi.getAllAgents,
    staleTime: Infinity,
  })

  const agents: Agent = {}
  if (agentsData && Array.isArray(agentsData)) {
    agentsData.forEach((agent: any) => {
      agents[agent.id] = agent
    })
  }

  const roomsList = (roomsData as any)?.data || []
  const pagination = (roomsData as any)?.pagination || {}

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const handleRefresh = async () => {
    await refetchRooms()
  }

  return (
    <div className="home-page">
      {/* ── Hero Banner ── */}
      <div className="home-hero">
        <div className="hero-content">
          <div className="hero-badge">
            <FireOutlined />
            <span>AI 多智能体辩论平台</span>
          </div>
          <h1 className="hero-title">
            让 AI 专家团队
            <br />
            <span className="hero-title-highlight">为你的人生抉择辩论</span>
          </h1>
          <p className="hero-desc">
            三位 AI 专家：直言现实者 · 共情辅导师 · 理性律师
            <br />
            从不同维度深度分析你的生活难题，众包智慧助力决策
          </p>
          <div className="hero-actions">
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              className="hero-btn-primary"
              onClick={() => navigate('/create')}
            >
              发起辩论
            </Button>
            <Button
              size="large"
              className="hero-btn-secondary"
              icon={<RightOutlined />}
              iconPosition="end"
              onClick={() => document.getElementById('case-list')?.scrollIntoView({ behavior: 'smooth' })}
            >
              浏览案件
            </Button>
          </div>
        </div>

        {/* 右侧 Agent 预览 */}
        <div className="hero-agents">
          <div className="hero-agent-card agent-a">
            <div className="hero-agent-emoji">⚡</div>
            <div className="hero-agent-name">直言现实者</div>
            <div className="hero-agent-tag">博弈论 · 谬误识别</div>
          </div>
          <div className="hero-agent-card agent-b" style={{ marginTop: 24 }}>
            <div className="hero-agent-emoji">💚</div>
            <div className="hero-agent-name">共情辅导师</div>
            <div className="hero-agent-tag">心理学 · NVC</div>
          </div>
          <div className="hero-agent-card agent-c">
            <div className="hero-agent-emoji">⚖️</div>
            <div className="hero-agent-name">理性律师</div>
            <div className="hero-agent-tag">民法 · 劳动法</div>
          </div>
        </div>

        {/* 背景装饰 */}
        <div className="hero-bg-orb orb-1" />
        <div className="hero-bg-orb orb-2" />
        <div className="hero-bg-grid" />
      </div>

      {/* ── 案件列表区 ── */}
      <div className="case-list-section" id="case-list">
        {/* 工具栏 */}
        <div className="list-toolbar">
          <div className="toolbar-left">
            {/* 状态筛选标签 */}
            <div className="status-filter">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.key}
                  className={`status-tab ${status === tab.key ? 'active' : ''}`}
                  onClick={() => { setStatus(tab.key); setPage(1) }}
                >
                  {tab.icon && <span className="tab-icon">{tab.icon}</span>}
                  {tab.label}
                  {tab.key === 'LIVE' && (
                    <span className="live-dot" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="toolbar-right">
            {/* 搜索 */}
            <Input.Search
              placeholder="搜索案件..."
              allowClear
              onSearch={handleSearch}
              className="search-input"
              prefix={<SearchOutlined />}
              enterButton={<SearchOutlined />}
            />

            {/* 排序 */}
            <Select
              value={sortBy}
              onChange={(v) => { setSortBy(v); setPage(1) }}
              className="sort-select"
              options={[
                { label: '最新发布', value: 'newest' },
                { label: '最热排序', value: 'hot' },
                { label: '我的案件', value: 'mine' },
              ]}
            />

            <Button
              icon={<ReloadOutlined spin={isFetching} />}
              onClick={handleRefresh}
              className="refresh-btn"
            />
          </div>
        </div>

        {/* 分类 Tag 行（附加标签） */}
        <div className="topic-tags">
          {['全部', '感情困惑', '职场抉择', '家庭关系', '财务规划', '人际关系', '个人成长'].map((tag, i) => (
            <Tag
              key={tag}
              className={`topic-tag ${i === 0 ? 'active' : ''}`}
            >
              {tag}
            </Tag>
          ))}
        </div>

        {/* 卡片网格 */}
        {roomsLoading ? (
          <div className="list-loading">
            <Spin size="large" />
            <p>加载案件中…</p>
          </div>
        ) : roomsList.length === 0 ? (
          <div className="list-empty">
            <Empty
              description={
                <span>
                  暂无案件
                  <Button type="link" onClick={() => navigate('/create')}>发起第一个辩论</Button>
                </span>
              }
            />
          </div>
        ) : (
          <>
            <Row gutter={[20, 20]} className="case-grid">
              {roomsList.map((room: any, index: number) => (
                <Col key={room.id} xs={24} sm={12} md={8} lg={6} style={{ '--card-index': index } as React.CSSProperties}>
                  <CaseCard room={room} agents={agents} />
                </Col>
              ))}
            </Row>

            {/* 分页 */}
            {pagination.total > pageSize && (
              <div className="list-pagination">
                <Button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="page-btn"
                >
                  上一页
                </Button>
                <span className="page-info">
                  第 {page} 页 · 共 {Math.ceil(pagination.total / pageSize)} 页 · {pagination.total} 个案件
                </span>
                <Button
                  disabled={page >= Math.ceil(pagination.total / pageSize)}
                  onClick={() => setPage((p) => p + 1)}
                  className="page-btn"
                >
                  下一页
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Home

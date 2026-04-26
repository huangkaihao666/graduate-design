import React, { useState } from 'react'
import { Row, Col, Input, Select, Button, Skeleton, Empty, Tag } from 'antd'
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
import * as tagsApi from '@/api/tags'
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
  const [activeTagId, setActiveTagId] = useState<number | null>(null)

  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.getTags,
    staleTime: 5 * 60 * 1000,
  })
  const tagList = tagsData || []

  const {
    data: roomsData,
    isLoading: roomsLoading,
    refetch: refetchRooms,
    isFetching,
  } = useQuery({
    queryKey: ['rooms', page, pageSize, status, sortBy, search, activeTagId],
    queryFn: () =>
      roomApi.getRooms({
        page,
        pageSize,
        status: status === 'all' ? undefined : status,
        sort: sortBy,
        search: search || undefined,
        tagId: activeTagId ?? undefined,
      }),
    staleTime: 0,
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
        {/* 背景装饰 */}
        <div className="hero-bg-grid" />
        <div className="hero-bg-orb orb-1" />
        <div className="hero-bg-orb orb-2" />

        {/* 左侧：文字 + 按钮 + 数据统计 */}
        <div className="hero-content">
          <div className="hero-badge">
            <FireOutlined />
            <span>多智能体协同 · 个性化 RAG · 大学生辅助平台</span>
          </div>
          <h1 className="hero-title">
            <span>AI 智能体辅助决策</span>
            <span className="hero-title-highlight">RAG 情绪伙伴陪你成长</span>
          </h1>
          <p className="hero-desc">
            三位 AI 专家从逻辑、情感、综合三视角分析你的难题，提供多角度参考，个性化 RAG 情绪记忆图谱让情绪伙伴越聊越懂你
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
              浏览话题
            </Button>
          </div>
          {/* 底部数据统计行 */}
          <div className="hero-stats">
            <div className="hero-stat-item">
              <span className="hero-stat-num">3</span>
              <span className="hero-stat-label">AI 专家</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat-item">
              <span className="hero-stat-num">RAG</span>
              <span className="hero-stat-label">知识增强</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat-item">
              <span className="hero-stat-num">实时</span>
              <span className="hero-stat-label">流式辩论</span>
            </div>
          </div>
        </div>

        {/* 右侧：Agent 卡片列 */}
        <div className="hero-agents">
          <div className="hero-agent-card agent-a">
            <div className="hero-agent-emoji">⚡</div>
            <div className="hero-agent-info">
              <div className="hero-agent-name">直言现实者</div>
              <div className="hero-agent-tag">博弈论 · 谬误识别</div>
            </div>
          </div>
          <div className="hero-agent-card agent-b">
            <div className="hero-agent-emoji">💚</div>
            <div className="hero-agent-info">
              <div className="hero-agent-name">温柔共情者</div>
              <div className="hero-agent-tag">心理学 · NVC</div>
            </div>
          </div>
          <div className="hero-agent-card agent-c">
            <div className="hero-agent-emoji">⚖️</div>
            <div className="hero-agent-info">
              <div className="hero-agent-name">中立观察者</div>
              <div className="hero-agent-tag">民法 · 劳动法</div>
            </div>
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
              placeholder="搜索话题..."
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
                { label: '我发布的', value: 'mine' },
              ]}
            />

            <Button
              icon={<ReloadOutlined spin={isFetching} />}
              onClick={handleRefresh}
              className="refresh-btn"
            />
          </div>
        </div>

        {/* 话题标签筛选栏 */}
        {tagList.length > 0 && (
          <div className="topic-tags">
            <Tag
              className={`topic-tag ${activeTagId === null ? 'active' : ''}`}
              onClick={() => { setActiveTagId(null); setPage(1) }}
            >
              全部
            </Tag>
            {tagList.map((tag) => (
              <Tag
                key={tag.id}
                className={`topic-tag ${activeTagId === tag.id ? 'active' : ''}`}
                color={activeTagId === tag.id ? tag.color : undefined}
                onClick={() => { setActiveTagId(tag.id); setPage(1) }}
              >
                {tag.name}
              </Tag>
            ))}
          </div>
        )}

        {/* 卡片网格 */}
        {roomsLoading ? (
          <Row gutter={[20, 20]} className="case-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <Col key={i} xs={24} sm={12} md={8} lg={6}>
                <div className="case-card-skeleton">
                  <Skeleton.Image active style={{ width: '100%', height: 140, borderRadius: 12 }} />
                  <div style={{ padding: '12px 16px' }}>
                    <Skeleton active title={{ width: '70%' }} paragraph={{ rows: 2, width: ['90%', '60%'] }} />
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        ) : roomsList.length === 0 ? (
          <div className="list-empty">
            <Empty
              description={
                <span>
                  暂无话题
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
                  第 {page} 页 · 共 {Math.ceil(pagination.total / pageSize)} 页 · {pagination.total} 个话题
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

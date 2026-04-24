import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Avatar,
  Badge,
  Card,
  Input,
  Modal,
  Select,
  Skeleton,
  Space,
  Tabs,
  Tag,
  Typography,
  List,
  Button,
  Empty,
} from 'antd'
import { EyeOutlined, RobotOutlined, ToolOutlined, UserOutlined } from '@ant-design/icons'
import * as agentsApi from '@/api/agents'
import * as customAgentsApi from '@/api/customAgents'
import type { CustomAgent } from '@/api/customAgents'
import { useNavigate } from 'react-router-dom'

import './Agents.less'

const { Paragraph, Text } = Typography

type AgentSort = agentsApi.AgentSort

export const Agents: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'system' | 'custom'>('system')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<AgentSort>('winRate')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')

  const [activeId, setActiveId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['agents-gallery', search, sort, order],
    queryFn: () => agentsApi.getAgents({ search: search.trim() || undefined, sort, order }),
  })

  const agents = Array.isArray(data) ? data : []

  const activeAgent = useMemo(() => agents.find((a: any) => a.id === activeId) || null, [agents, activeId])

  const { data: casesData, isLoading: casesLoading } = useQuery({
    queryKey: ['agent-cases', activeId],
    queryFn: () => agentsApi.getAgentCases(String(activeId), 5),
    enabled: !!activeId && detailOpen,
  })

  const recentCases = Array.isArray(casesData) ? casesData : []

  // ─── 用户自建智能体 ──────────────────────────────────────────
  const { data: customData, isLoading: customLoading } = useQuery({
    queryKey: ['public-custom-agents', search],
    queryFn: () => customAgentsApi.getPublicCustomAgents({ search: search.trim() || undefined }),
    enabled: activeTab === 'custom',
  })
  const customAgents: CustomAgent[] = customData?.data || []

  const sortOptions = [
    { value: 'winRate', label: '胜率' },
    { value: 'participateCount', label: '参与案件数' },
    { value: 'fans', label: '粉丝数' },
    { value: 'name', label: '名字' },
  ]

  return (
    <div className="agents-page">
      <div className="agents-hero">
        <div>
          <h1 className="agents-hero-title">🤖 AI Agent 图鉴</h1>
          <div className="agents-hero-sub">浏览智能体的人设、金句与数据表现，选择你喜欢的辩论风格。</div>
        </div>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k as 'system' | 'custom')}
        className="agents-tabs"
        items={[
          { key: 'system', label: <Space><RobotOutlined />系统智能体</Space> },
          {
            key: 'custom',
            label: (
              <Space>
                <ToolOutlined />
                用户创建
                {customAgents.length > 0 && (
                  <Badge count={customAgents.length} size="small" color="#6366f1" />
                )}
              </Space>
            ),
          },
        ]}
        tabBarExtraContent={
          activeTab === 'custom' ? (
            <Button
              type="primary"
              size="small"
              icon={<ToolOutlined />}
              onClick={() => navigate('/create-agent')}
            >
              创建我的智能体
            </Button>
          ) : null
        }
      />

      <div className="agents-toolbar">
        <Input.Search
          allowClear
          placeholder={activeTab === 'system' ? '搜索 Agent 名字 / 性格 / 简介' : '搜索用户创建的智能体'}
          style={{ maxWidth: 420 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {activeTab === 'system' && (
          <Space wrap>
            <Select
              value={sort}
              onChange={(v) => setSort(v)}
              options={sortOptions}
              style={{ width: 160 }}
            />
            <Select
              value={order}
              onChange={(v) => setOrder(v)}
              options={[
                { value: 'desc', label: '从高到低' },
                { value: 'asc', label: '从低到高' },
              ]}
              style={{ width: 140 }}
            />
          </Space>
        )}
      </div>

      {/* ── 系统智能体 Tab ── */}
      {activeTab === 'system' && (
        isLoading ? (
          <div className="agents-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="agent-card" bodyStyle={{ padding: 16 }}>
                <Skeleton active avatar={{ size: 56, shape: 'circle' }} title={{ width: '60%' }} paragraph={{ rows: 2, width: ['80%', '50%'] }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 14 }}>
                  {[0,1,2].map(j => <Skeleton.Button key={j} active block style={{ height: 52, borderRadius: 10 }} />)}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="agents-grid">
            {agents.map((agent: any) => (
              <Card
                key={agent.id}
                className="agent-card"
                hoverable
                onClick={() => {
                  setActiveId(agent.id)
                  setDetailOpen(true)
                }}
                bodyStyle={{ padding: 16 }}
              >
                <div className="agent-card-top">
                  <Space size={12}>
                    <Avatar size={56} src={agent.avatar} style={{ background: '#667eea', fontWeight: 900 }}>
                      {!agent.avatar ? String(agent.name || 'A')[0] : ''}
                    </Avatar>
                    <div style={{ minWidth: 0 }}>
                      <h3 className="agent-name">{agent.name}</h3>
                      <div className="agent-persona">
                        {agent.personality ? <Tag color="blue">{agent.personality}</Tag> : <Text type="secondary">—</Text>}
                      </div>
                    </div>
                  </Space>
                  <Tag icon={<EyeOutlined />} color="purple">
                    查看详情
                  </Tag>
                </div>

                <Paragraph className="agent-desc" ellipsis={{ rows: 2 }}>
                  {agent.description || '暂无简介'}
                </Paragraph>

                <div className="agent-stats-row">
                  <div className="stat-box">
                    <div className="stat-label">胜率</div>
                    <div className="stat-value">{Math.round((agent.winRate || 0) * 100)}%</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-label">参与案件</div>
                    <div className="stat-value">{agent.participateCount ?? 0}</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-label">粉丝</div>
                    <div className="stat-value">{agent.fans ?? 0}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {/* ── 用户创建 Tab ── */}
      {activeTab === 'custom' && (
        customLoading ? (
          <div className="agents-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="agent-card" bodyStyle={{ padding: 16 }}>
                <Skeleton active avatar={{ size: 56, shape: 'circle' }} title={{ width: '60%' }} paragraph={{ rows: 2 }} />
              </Card>
            ))}
          </div>
        ) : customAgents.length === 0 ? (
          <Empty
            description={
              <div>
                <div>暂无用户创建的公开智能体</div>
                <Text type="secondary">成为第一个创建并公开智能体的用户！</Text>
              </div>
            }
          >
            <Button type="primary" icon={<ToolOutlined />} onClick={() => navigate('/create-agent')}>
              创建我的智能体
            </Button>
          </Empty>
        ) : (
          <div className="agents-grid">
            {customAgents.map((agent) => (
              <Card
                key={agent.id}
                className="agent-card agent-card-custom"
                hoverable
                bodyStyle={{ padding: 16 }}
              >
                <div className="agent-card-top">
                  <Space size={12}>
                    <Avatar size={56} src={agent.avatar} style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', fontWeight: 900 }}>
                      {!agent.avatar ? String(agent.name || 'A')[0] : ''}
                    </Avatar>
                    <div style={{ minWidth: 0 }}>
                      <h3 className="agent-name">{agent.name}</h3>
                      <div className="agent-persona">
                        {agent.personality ? <Tag color="purple">{agent.personality}</Tag> : null}
                        <Tag color="default" style={{ fontSize: 11 }}>
                          <UserOutlined /> 用户创建
                        </Tag>
                      </div>
                    </div>
                  </Space>
                </div>

                <Paragraph className="agent-desc" ellipsis={{ rows: 2 }}>
                  {agent.description || '暂无简介'}
                </Paragraph>

                {agent.domainsArr && agent.domainsArr.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                    {agent.domainsArr.slice(0, 3).map((d) => (
                      <Tag key={d} style={{ fontSize: 11, borderRadius: 4 }}>{d}</Tag>
                    ))}
                  </div>
                )}

                {agent.creator && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    创建者：{agent.creator.name}
                  </Text>
                )}
              </Card>
            ))}
          </div>
        )
      )}

      <Modal
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={860}
        destroyOnClose
        title={
          <div className="agent-modal-head">
            <Avatar size={44} src={activeAgent?.avatar} style={{ background: '#667eea', fontWeight: 900 }}>
              {!activeAgent?.avatar ? String(activeAgent?.name || 'A')[0] : ''}
            </Avatar>
            <div>
              <h2>{activeAgent?.name || 'Agent'}</h2>
              {activeAgent?.personality && <Tag color="blue">{activeAgent.personality}</Tag>}
            </div>
          </div>
        }
      >
        {!activeAgent ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : (
          <Space direction="vertical" size={14} style={{ width: '100%' }}>
            <Card size="small" title="人设简介" className="agent-card">
              <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                {activeAgent.description || '暂无'}
              </Paragraph>
            </Card>

            {activeAgent.signature && (
              <Card size="small" title="历史高赞金句" className="agent-card">
                <div className="quote-box">{activeAgent.signature}</div>
              </Card>
            )}

            <Card size="small" title="统计数据" className="agent-card">
              <Space wrap>
                <Tag color="green">胜率：{Math.round((activeAgent.winRate || 0) * 100)}%</Tag>
                <Tag color="blue">参与案件：{activeAgent.participateCount ?? 0}</Tag>
                <Tag color="purple">粉丝：{activeAgent.fans ?? 0}</Tag>
              </Space>
            </Card>

            <Card
              size="small"
              title="参与案件（最近 5 个）"
              className="agent-card"
              extra={
                <Button
                  size="small"
                  onClick={() => {
                    // 目前没有 agent 专属案件页，这里先保持弹窗内查看
                  }}
                >
                  刷新
                </Button>
              }
            >
              {casesLoading ? (
                <Skeleton active paragraph={{ rows: 4 }} />
              ) : (
                <List
                  dataSource={recentCases}
                  locale={{ emptyText: '暂无参与案件' }}
                  renderItem={(item: any) => (
                    <List.Item>
                      <List.Item.Meta
                        title={
                          <Space wrap>
                            <Text strong>{item.title}</Text>
                            <Tag color={item.status === 'LIVE' ? 'blue' : item.status === 'WAITING' ? 'gold' : 'default'}>
                              {item.status === 'LIVE' ? '进行中' : item.status === 'WAITING' ? '待开始' : '已结束'}
                            </Tag>
                          </Space>
                        }
                        description={
                          <Space wrap>
                            <Text type="secondary">创建于 {new Date(item.createdAt).toLocaleDateString()}</Text>
                            <Text type="secondary">
                              发起人：{item.owner?.name || item.owner?.email || `用户${item.owner?.id}`}
                            </Text>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Space>
        )}
      </Modal>
    </div>
  )
}

export default Agents


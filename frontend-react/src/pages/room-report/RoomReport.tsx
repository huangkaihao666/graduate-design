import React, { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Avatar,
  Button,
  Card,
  Collapse,
  Divider,
  Progress,
  Skeleton,
  Space,
  Tag,
  Typography,
  message,
} from 'antd'
import { ArrowLeftOutlined, CopyOutlined, ShareAltOutlined } from '@ant-design/icons'
import * as roomApi from '@/api/rooms'
import './RoomReport.less'

const { Paragraph, Text } = Typography

type Winner =
  | { type: 'NO_VOTES' }
  | { type: 'TIE'; topPercent?: number }
  | { type: 'WIN'; agentId: string; topPercent?: number }

const getRoundLabel = (round: number) =>
  round === 1 ? '阐述观点' : round === 2 ? '交叉反驳' : round === 3 ? '律师裁决' : '辩论回顾'

const getRankLabel = (rank: number) =>
  rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : `${rank}th`

export const RoomReport: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const roomId = Number(id || 0)

  const { data, isLoading } = useQuery({
    queryKey: ['room-report', roomId],
    queryFn: () => roomApi.getRoomReport(roomId),
    enabled: !!roomId,
  })

  const report = (data as any) || null
  const room = report?.room
  const voteStats = report?.voteStats
  const debateMessages = Array.isArray(report?.debateMessages) ? report.debateMessages : []
  const agents = Array.isArray(room?.agents) ? room.agents : []

  const agentMap = useMemo(() => {
    const m: Record<string, any> = {}
    agents.forEach((a: any) => {
      m[a.id] = a
    })
    return m
  }, [agents])

  const winner: Winner | null = voteStats?.winner || null

  const rounds = useMemo(() => {
    const byRound: Record<string, any[]> = {}
    debateMessages.forEach((m: any) => {
      const r = Number(m.roundNumber || 0)
      const key = String(r || 0)
      byRound[key] = byRound[key] || []
      byRound[key].push(m)
    })
    // round=0 代表无法分轮的回退数据
    const keys = Object.keys(byRound).sort((a, b) => Number(a) - Number(b))
    return keys.map((k) => ({ round: Number(k), items: byRound[k] }))
  }, [debateMessages])

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      message.success('链接已复制')
    } catch {
      message.error('复制失败，请手动复制地址栏链接')
    }
  }

  const handleNativeShare = async () => {
    const title = room?.title ? `结案报告｜${room.title}` : '结案报告'
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({
          title,
          url: window.location.href,
          text: '分享本次 AI 辩论的结案报告',
        })
      } else {
        await handleCopyLink()
      }
    } catch {
      // 用户取消 share，不提示
    }
  }

  if (isLoading) {
    return (
      <div className="room-report-page">
        {/* Hero 骨架 */}
        <div style={{ background: '#F0F0FF', borderRadius: 20, padding: '28px 32px', marginBottom: 24 }}>
          <Skeleton active title={{ width: '30%' }} paragraph={{ rows: 3, width: ['50%', '70%', '40%'] }} />
        </div>
        {/* 主内容骨架 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>
          <Skeleton active paragraph={{ rows: 10 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Skeleton active paragraph={{ rows: 4 }} />
            <Skeleton active paragraph={{ rows: 5 }} />
          </div>
        </div>
      </div>
    )
  }

  if (!report || !room) {
    return (
      <div className="room-report-page">
        <Card className="report-card">
          <Paragraph style={{ textAlign: 'center', marginBottom: 16 }}>报告不存在或无权限访问</Paragraph>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Button onClick={() => navigate('/cases')}>返回列表</Button>
          </div>
        </Card>
      </div>
    )
  }

  const finalAdviceRaw = report?.finalAdvice?.raw || null
  const ranking = Array.isArray(voteStats?.ranking) ? voteStats.ranking : []

  const winnerAgent =
    winner && winner.type === 'WIN' ? agentMap[(winner as any).agentId] : null

  return (
    <div className="room-report-page">
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(`/debate/${room.id}`)}
        style={{ marginBottom: 10 }}
      >
        返回辩论室
      </Button>

      <div className="room-report-hero">
        <div className="room-report-title">
          <div style={{ minWidth: 0 }}>
            <h1>📊 结案报告</h1>
            <Paragraph style={{ margin: '6px 0 0', color: '#334155' }} ellipsis={{ rows: 2, expandable: true }}>
              <Text strong>案件：</Text>
              {room.title}
            </Paragraph>
          </div>

          <Space>
            <Tag color={room.status === 'CLOSED' ? 'green' : room.status === 'LIVE' ? 'blue' : 'gold'}>
              {room.status === 'CLOSED' ? '已结案' : room.status === 'LIVE' ? '进行中' : '待开始'}
            </Tag>
          </Space>
        </div>

        <div className="room-report-sub">
          <span>
            <Text type="secondary">发起人：</Text>
            <Space size={6}>
              <Avatar size={20} src={room.owner?.avatar} />
              <span>{room.owner?.name || room.owner?.email || `用户${room.owner?.id}`}</span>
            </Space>
          </span>
          <span>
            <Text type="secondary">创建时间：</Text>
            {room.createdAt ? new Date(room.createdAt).toLocaleString() : '-'}
          </span>
          <span>
            <Text type="secondary">投票：</Text>
            {typeof voteStats?.totalVotes === 'number' ? `${voteStats.totalVotes} 票` : '-'}
          </span>
        </div>

        <Divider style={{ margin: '12px 0' }} />

        <div className="agent-row">
          {agents.map((a: any) => (
            <span key={a.id} className="agent-chip">
              <Avatar size={22} src={a.avatar} />
              <span className="name">{a.name}</span>
              {a.personality && <Tag color="blue">{a.personality}</Tag>}
            </span>
          ))}
        </div>
      </div>

      <div className="room-report-grid">
        <Card className="report-card" title="🧾 辩论回顾（可折叠）">
          <Collapse
            accordion={false}
            items={rounds.map((r) => ({
              key: String(r.round),
              label: r.round ? `Round ${r.round} · ${getRoundLabel(r.round)}` : '回顾（无轮次信息）',
              children: (
                <Space direction="vertical" size={14} style={{ width: '100%' }}>
                  {r.items.map((m: any) => {
                    const agent = agentMap[m.agentId]
                    return (
                      <Card
                        key={m.id}
                        size="small"
                        style={{ borderRadius: 12 }}
                        title={
                          <Space size={10}>
                            <Avatar size={28} src={agent?.avatar} />
                            <span style={{ fontWeight: 800 }}>{agent?.name || m.agentId}</span>
                            {m.createdAt && (
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {new Date(m.createdAt).toLocaleTimeString()}
                              </Text>
                            )}
                          </Space>
                        }
                      >
                        {m.reasoning && String(m.reasoning).trim().length > 0 && (
                          <>
                            <Collapse
                              size="small"
                              items={[
                                {
                                  key: 'reasoning',
                                  label: '思考过程（可展开）',
                                  children: <div className="advice-reasoning">{m.reasoning}</div>,
                                },
                              ]}
                            />
                            <Divider style={{ margin: '12px 0' }} />
                          </>
                        )}
                        <div className="advice-raw">{m.content}</div>
                      </Card>
                    )
                  })}
                </Space>
              ),
            }))}
          />
        </Card>

        <Space direction="vertical" size={14}>
          <Card className="report-card" title="⚖️ 律师最终建议（Bot C）" extra={<Tag color="purple">Round 3</Tag>}>
            {!finalAdviceRaw ? (
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                暂无律师建议（可能是辩论未完整结束或服务重启导致上下文丢失）
              </Paragraph>
            ) : (
              <>
                {finalAdviceRaw.reasoning && String(finalAdviceRaw.reasoning).trim().length > 0 && (
                  <>
                    <Collapse
                      size="small"
                      items={[
                        {
                          key: 'reasoning',
                          label: '分析过程（可展开）',
                          children: <div className="advice-reasoning">{finalAdviceRaw.reasoning}</div>,
                        },
                      ]}
                    />
                    <Divider style={{ margin: '12px 0' }} />
                  </>
                )}
                <div className="advice-raw">{finalAdviceRaw.content}</div>
              </>
            )}
          </Card>

          <Card
            className="report-card"
            title="🏆 支持率与胜出方"
            extra={
              winner?.type === 'NO_VOTES' ? (
                <Tag color="default">暂无投票</Tag>
              ) : winner?.type === 'TIE' ? (
                <Tag color="gold">平票</Tag>
              ) : (
                <Tag color="green">已决出</Tag>
              )
            }
          >
            <div className="winner-wrap">
              <div className="winner-main">
                <Avatar size={52} src={winnerAgent?.avatar} style={{ background: '#6366f1' }}>
                  {!winnerAgent?.avatar && winner?.type === 'WIN'
                    ? String(winnerAgent?.name || 'W')[0]
                    : ''}
                </Avatar>
                <div>
                  <div className="winner-name">
                    {winner?.type === 'WIN'
                      ? `${winnerAgent?.name || (winner as any).agentId} · 胜者`
                      : winner?.type === 'TIE'
                        ? '暂时平票'
                        : '暂无投票结果'}
                  </div>
                  <div className="winner-meta">
                    {winner?.type === 'NO_VOTES'
                      ? '未投票用户视为弃权，建议以“律师裁决”作为结论参考'
                      : `总计 ${voteStats?.totalVotes ?? 0} 票`}
                  </div>
                </div>
              </div>
              {winner?.type === 'WIN' && typeof (winner as any).topPercent === 'number' && (
                <Progress
                  type="circle"
                  percent={Math.min(100, Math.max(0, Number((winner as any).topPercent)))}
                  size={74}
                  strokeColor={{ '0%': '#667eea', '100%': '#764ba2' }}
                />
              )}
            </div>

            <Divider style={{ margin: '14px 0' }} />

            <div className="rank-list">
              {ranking.slice(0, 3).map((r: any) => {
                const agent = agentMap[r.agentId]
                const color = r.rank === 1 ? '#2563eb' : r.rank === 2 ? '#16a34a' : '#64748b'
                return (
                  <div key={r.agentId} className="rank-item">
                    <div className="rank-left">
                      <span className="label" style={{ color }}>
                        {getRankLabel(r.rank)}
                      </span>
                      <Avatar size={26} src={agent?.avatar} />
                      <span className="agent">{agent?.name || r.agentId}</span>
                    </div>
                    <div style={{ minWidth: 150 }}>
                      <Progress
                        percent={Number(r.percent || 0)}
                        size="small"
                        strokeColor={color}
                        format={(p) => `${p}% (${r.count}票)`}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          <Card className="report-card" title="🔗 分享">
            <div className="share-row">
              <Button icon={<CopyOutlined />} onClick={handleCopyLink}>
                复制链接
              </Button>
              <Button icon={<ShareAltOutlined />} type="primary" onClick={handleNativeShare}>
                一键分享
              </Button>
            </div>
          </Card>
        </Space>
      </div>
    </div>
  )
}

export default RoomReport


import React from 'react'
import { Card, Button, Tag, Avatar, Space, Tabs, Input, Divider, Skeleton, message } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import * as roomApi from '@/api/rooms'
import './CaseDetail.less'

const CaseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [comment, setComment] = React.useState('')

  // 获取案件详情
  const { data: room, isLoading: roomLoading } = useQuery({
    queryKey: ['case-detail', id],
    queryFn: () => roomApi.getRoomById(parseInt(id || '0')),
    enabled: !!id,
  })

  // 获取所有 Agents
  const { data: agentsData } = useQuery({
    queryKey: ['agents'],
    queryFn: roomApi.getAllAgents,
    staleTime: Infinity,
  })

  const agents: Record<string, any> = {}
  if (agentsData && Array.isArray(agentsData)) {
    (agentsData as any[]).forEach((agent: any) => {
      agents[agent.id] = agent
    })
  }

  const handleSubmitComment = () => {
    if (!comment.trim()) {
      message.warning('请输入评论')
      return
    }
    // TODO: 调用提交评论的 API
    message.success('评论已发布')
    setComment('')
  }

  if (roomLoading) {
    return (
      <div className="case-detail-page">
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    )
  }

  if (!room) {
    return (
      <div className="case-detail-page">
        <Card>
          <p style={{ textAlign: 'center' }}>案件不存在或已被删除</p>
          <Button onClick={() => navigate('/cases')} style={{ display: 'block', margin: '0 auto' }}>
            返回列表
          </Button>
        </Card>
      </div>
    )
  }

  const caseData = room.data || room

  return (
    <div className="case-detail-page">
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/cases')}
        className="back-button"
      >
        返回列表
      </Button>

      {/* 头部信息 */}
      <div className="case-header">
        {caseData.image && (
          <div className="case-banner">
            <img src={caseData.image} alt={caseData.title} />
          </div>
        )}

        <Card className="case-header-info">
          <div className="title-section">
            <h1>{caseData.title}</h1>
            <Tag color={
              caseData.status === 'LIVE'
                ? 'blue'
                : caseData.status === 'WAITING'
                ? 'orange'
                : 'default'
            }>
              {caseData.status === 'LIVE'
                ? '进行中'
                : caseData.status === 'WAITING'
                ? '即将开始'
                : '已结束'}
            </Tag>
          </div>

          <div className="meta-info">
            <Space separator="|" style={{ fontSize: 14, color: 'rgba(0,0,0,0.45)' }}>
              <span>👀 {caseData.viewCount || 0} 人浏览</span>
              <span>💬 {caseData.commentCount || 0} 条评论</span>
              <span>📅 {new Date(caseData.createdAt).toLocaleDateString()}</span>
            </Space>
          </div>

          {caseData.owner && (
            <div className="owner-section">
              <Avatar src={caseData.owner.avatar} />
              <span>{caseData.owner.name}</span>
            </div>
          )}
        </Card>
      </div>

      {/* 主体内容 */}
      <div className="case-content">
        <Card title="案件描述" className="content-card">
          <div className="description">
            {caseData.content}
          </div>
        </Card>

        {/* 参与 Agents */}
        {caseData.agents && caseData.agents.length > 0 && (
          <Card title="参与讨论的 AI Agent" className="content-card">
            <Space wrap size="large">
              {caseData.agents.map((agentId: string) => {
                const agent = agents[agentId]
                return agent ? (
                  <div key={agentId} className="agent-card">
                    <Avatar src={agent.avatar} size={64} />
                    <div className="agent-info">
                      <p className="agent-name">{agent.name}</p>
                      <p className="agent-desc">{agent.personality}</p>
                      <p className="agent-stats">胜率: {agent.winRate || 0}%</p>
                    </div>
                  </div>
                ) : null
              })}
            </Space>
          </Card>
        )}

        {/* 讨论区 */}
        <Card title="讨论和评论" className="content-card">
          <Tabs
            items={[
              {
                key: 'comments',
                label: `评论 (${caseData.commentCount || 0})`,
                children: (
                  <div className="comments-section">
                    <div className="comment-input">
                      <Input.TextArea
                        rows={4}
                        placeholder="发表您的观点..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                      />
                      <Button
                        type="primary"
                        onClick={handleSubmitComment}
                        style={{ marginTop: 16 }}
                      >
                        发表评论
                      </Button>
                    </div>

                    <Divider />

                    {/* TODO: 渲染评论列表 */}
                    <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(0,0,0,0.45)' }}>
                      暂无评论，成为第一个评论者吧！
                    </div>
                  </div>
                ),
              },
              {
                key: 'votes',
                label: '投票统计',
                children: (
                  <div className="votes-section">
                    {/* TODO: 显示投票统计 */}
                    <p>投票统计信息将在这里显示</p>
                  </div>
                ),
              },
            ]}
          />
        </Card>
      </div>
    </div>
  )
}

export default CaseDetail

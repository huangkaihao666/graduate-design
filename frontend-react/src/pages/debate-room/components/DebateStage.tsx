import React, { useEffect, useRef, useState } from 'react'
import { Avatar, Empty, Button, Collapse } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'
import './DebateStage.less'

interface Message {
  id: string
  agentId: string
  content: string
  reasoning?: string
  roundNumber: number
  createdAt: Date
  isTyping?: boolean
}

interface DebateStageProps {
  messages: Message[]
  agents: Record<string, any>
  typingAgents: Set<string>
  currentRound: number
  roomStatus?: 'WAITING' | 'LIVE' | 'CLOSED' | string
  isOwner?: boolean
  canStart?: boolean
  onStartDebate?: () => void
  canClose?: boolean
  onCloseDebate?: () => void
  canViewReport?: boolean
  onViewReport?: () => void
}

export const DebateStage: React.FC<DebateStageProps> = ({
  messages,
  agents,
  typingAgents,
  currentRound,
  roomStatus,
  isOwner,
  canStart,
  onStartDebate,
  canClose,
  onCloseDebate,
  canViewReport,
  onViewReport,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  // 自动滚动到最新消息
  useEffect(() => {
    if (!autoScroll) return
    // 流式输出时频繁更新，使用 auto 避免“锁住滚动”
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [messages])

  const handleScroll = () => {
    const el = containerRef.current
    if (!el) return
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    // 贴近底部(<=80px)时保持自动滚动，否则允许用户自由滚动查看历史
    setAutoScroll(distanceToBottom <= 80)
  }

  const roundLabel =
    currentRound === 1
      ? '阐述观点（Round 1）'
      : currentRound === 2
        ? '交叉反驳（Round 2）'
        : '律师裁决（Round 3）'

  const activeTypingName = (() => {
    const first = Array.from(typingAgents)[0]
    if (!first) return null
    const agent = agents[first]
    return agent?.name ? `${agent.name} 正在发言中…` : '正在发言中…'
  })()

  return (
    <div className="debate-stage">
      <div className="stage-header">
        <h2>🎭 AI 辩论舞台</h2>
        <div className="stage-header-center">
          <span className="round-phase">{roundLabel}</span>
          {activeTypingName && (
            <span className="speaking-hint">{activeTypingName}</span>
          )}
        </div>
        <div className="stage-header-right">
          <span className="round-badge">Round {currentRound}</span>
          {isOwner && canStart && onStartDebate && (
            <Button type="primary" size="small" onClick={onStartDebate} style={{ marginLeft: 12 }}>
              🚀 开始辩论
            </Button>
          )}
          {isOwner && canClose && onCloseDebate && (
            <Button danger size="small" onClick={onCloseDebate} style={{ marginLeft: 12 }}>
              ✅ 结案
            </Button>
          )}
          {canViewReport && onViewReport && (
            <Button size="small" type="primary" onClick={onViewReport} style={{ marginLeft: 12 }}>
              📊 结案报告
            </Button>
          )}
        </div>
      </div>

      <div className="messages-container" ref={containerRef} onScroll={handleScroll}>
        {messages.length === 0 ? (
          <Empty
            description={
              roomStatus === 'CLOSED'
                ? '辩论已结束，正在加载历史记录…'
                : '辩论尚未开始，请等待...'
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          messages.map((message, idx) => {
            const prev = idx > 0 ? messages[idx - 1] : null
            const isFirstOfRound = !prev || prev.roundNumber !== message.roundNumber
            const agent = agents[message.agentId]
            if (!agent) return null

            return (
              <React.Fragment key={message.id}>
                {isFirstOfRound && (
                  <div className="round-divider">
                    <span className="round-divider-badge">Round {message.roundNumber}</span>
                    <span className="round-divider-text">
                      {message.roundNumber === 1
                        ? '阐述观点'
                        : message.roundNumber === 2
                          ? '交叉反驳'
                          : '律师裁决'}
                    </span>
                  </div>
                )}

                <div className="message-item">
                <div className="message-header">
                  <Avatar src={agent.avatar} size={40} />
                  <div className="message-meta">
                    <span className="agent-name">{agent.name}</span>
                    <span className="message-time">
                      Round {message.roundNumber} · {new Date(message.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                <div className="message-content">
                  {message.reasoning && message.reasoning.trim().length > 0 && (
                    <div className="reasoning-wrap">
                      <Collapse
                        size="small"
                        items={[
                          {
                            key: 'reasoning',
                            label: '思考过程（可展开）',
                            children: (
                              <div className="reasoning-text">{message.reasoning}</div>
                            ),
                          },
                        ]}
                      />
                    </div>
                  )}
                  <div className="answer-text">{message.content}</div>
                  {message.isTyping && (
                    <span className="typing-cursor">▊</span>
                  )}
                </div>
                </div>
              </React.Fragment>
            )
          })
        )}

        {/* 正在输入指示器 */}
        {Array.from(typingAgents).map((agentId) => {
          const agent = agents[agentId]
          if (!agent) return null

          return (
            <div key={`typing-${agentId}`} className="typing-indicator">
              <Avatar src={agent.avatar} size={32} />
              <span className="typing-text">
                {agent.name} 正在输入
                <LoadingOutlined style={{ marginLeft: 8 }} />
              </span>
            </div>
          )
        })}

        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}

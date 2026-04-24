import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Input, Button, Avatar, Empty } from 'antd'
import { SendOutlined, UserOutlined, BulbOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store'
import './ChatPanel.less'

interface ChatMessage {
  id: number
  senderId: number
  senderType?: 'HUMAN' | 'SYSTEM'
  content: string
  createdAt: string
}

interface ChatPanelProps {
  messages: ChatMessage[]
  onlineCount: number
  onSendMessage: (content: string) => void
  opinionCollecting?: boolean
  opinionCountdown?: number
  opinionResult?: { validCount: number; validForA: number; validForB: number } | null
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onlineCount,
  onSendMessage,
  opinionCollecting = false,
  opinionCountdown = 0,
  opinionResult = null,
}) => {
  const { user } = useAuthStore()
  const [inputValue, setInputValue] = useState('')
  const [lastSendTime, setLastSendTime] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const currentUserId = user?.id
  const currentUserDisplayName = useMemo(() => {
    if (!user) return ''
    return user.name || user.username || user.email || `用户 ${user.id}`
  }, [user])
  const currentUserAvatar = user?.avatar

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!inputValue.trim()) return

    // 限流：3秒内只能发送一次
    const now = Date.now()
    if (now - lastSendTime < 3000) {
      return
    }

    onSendMessage(inputValue.trim())
    setInputValue('')
    setLastSendTime(now)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 征集中的 placeholder 动态变化
  const inputPlaceholder = opinionCollecting
    ? '说说你支持哪方？观点将影响第二轮辩论...'
    : '说点什么...'

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h3>💬 实时弹幕</h3>
        <span className="online-count">
          <span className="online-dot" />
          {onlineCount} 人在线
        </span>
      </div>

      {/* 观点征集提示条 */}
      {opinionCollecting && (
        <div className="opinion-banner opinion-banner--collecting">
          <div className="opinion-banner-left">
            <BulbOutlined className="opinion-banner-icon" />
            <div>
              <div className="opinion-banner-title">观点征集中</div>
              <div className="opinion-banner-desc">你的发言将影响第二轮 AI 辩论走向</div>
            </div>
          </div>
          <div className="opinion-countdown">
            <span className="opinion-countdown-num">{opinionCountdown}</span>
            <span className="opinion-countdown-unit">s</span>
          </div>
        </div>
      )}

      {/* 征集结束结果提示 */}
      {!opinionCollecting && opinionResult && (
        <div className="opinion-banner opinion-banner--result">
          <CheckCircleOutlined className="opinion-banner-icon" />
          <div className="opinion-banner-result-text">
            已收集 <strong>{opinionResult.validCount}</strong> 条观点注入第二轮辩论
            {(opinionResult.validForA > 0 || opinionResult.validForB > 0) && (
              <span className="opinion-stance-hint">
                （支持A {opinionResult.validForA} · 支持B {opinionResult.validForB}）
              </span>
            )}
          </div>
        </div>
      )}

      <div className="chat-messages">
        {messages.length === 0 ? (
          <Empty
            description="还没有人发言，快来抢沙发吧！"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          messages.map((msg) => {
            if (msg.senderType === 'SYSTEM' || msg.senderId === 0) {
              return (
                <div key={msg.id} className="chat-system-message">
                  <span className="system-text">{msg.content}</span>
                </div>
              )
            }

            return (
              <div
                key={msg.id}
                className={`chat-message ${msg.senderId === currentUserId ? 'chat-message-self' : 'chat-message-other'}`}
              >
                <Avatar
                  size="small"
                  src={msg.senderId === currentUserId ? currentUserAvatar : undefined}
                  style={
                    msg.senderId === currentUserId
                      ? { backgroundColor: '#3182ce', color: '#fff' }
                      : { backgroundColor: '#e2e8f0', color: '#2d3748' }
                  }
                  icon={<UserOutlined />}
                />
                <div className="message-content">
                  <div className="message-header">
                    <span className="sender-name">
                      {msg.senderId === currentUserId
                        ? currentUserDisplayName || '我'
                        : `用户 ${msg.senderId}`}
                    </span>
                    <span className="message-time">
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="message-text">{msg.content}</div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <Input.TextArea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={inputPlaceholder}
          autoSize={{ minRows: 2, maxRows: 4 }}
          maxLength={200}
          className={opinionCollecting ? 'opinion-input-active' : ''}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          disabled={!inputValue.trim()}
        >
          发送
        </Button>
      </div>
    </div>
  )
}

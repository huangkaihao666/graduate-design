import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Input, Button, Avatar, Empty } from 'antd'
import { SendOutlined, UserOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store'
import './ChatPanel.less'

interface ChatMessage {
  id: number
  senderId: number
  content: string
  createdAt: string
}

interface ChatPanelProps {
  messages: ChatMessage[]
  onlineCount: number
  onSendMessage: (content: string) => void
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onlineCount,
  onSendMessage,
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

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h3>💬 实时弹幕</h3>
        <span className="online-count">
          <UserOutlined /> {onlineCount} 人在线
        </span>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <Empty
            description="还没有人发言，快来抢沙发吧！"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`chat-message ${msg.senderId === currentUserId ? 'chat-message-self' : 'chat-message-other'}`}
            >
              <Avatar
                size="small"
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
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <Input.TextArea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="说点什么..."
          autoSize={{ minRows: 2, maxRows: 4 }}
          maxLength={200}
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

import React, { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { Button, Input, Avatar, Skeleton, Tooltip, message as antMessage } from 'antd'
import {
  PlusOutlined,
  SendOutlined,
  DeleteOutlined,
  HeartOutlined,
  UserOutlined,
  MessageOutlined,
  CloseOutlined,
  MenuOutlined,
  RobotOutlined,
  CheckOutlined,
} from '@ant-design/icons'
import type { AvailableAgent } from '@/api/counseling'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/store'
import * as counselingApi from '@/api/counseling'
import type { Session, CounselingMessage } from '@/api/counseling'
import './Counseling.less'

const { TextArea } = Input

// ── 本地类型（扩展 API 类型，支持流式 isTyping 状态） ─────────

interface Message extends CounselingMessage {
  isTyping?: boolean
  isThinking?: boolean  // 深度思考阶段，显示跳动动画
}

// ── 快速话题 ──────────────────────────────────────────────────

const QUICK_TOPICS = [
  { emoji: '📚', label: '学业压力' },
  { emoji: '💔', label: '感情困惑' },
  { emoji: '👥', label: '人际关系' },
  { emoji: '🎯', label: '职业迷茫' },
  { emoji: '🏠', label: '家庭矛盾' },
  { emoji: '😔', label: '情绪低落' },
]

// ── 辅助函数 ──────────────────────────────────────────────────

const formatTime = (iso: string) => {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

// ── 主组件 ────────────────────────────────────────────────────

export const Counseling: React.FC = () => {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // 辅导师选择器
  const [availableAgents, setAvailableAgents] = useState<AvailableAgent[]>([])
  const [showAgentPicker, setShowAgentPicker] = useState(false)
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null) // null = 默认共情师
  const [pendingQuickTopic, setPendingQuickTopic] = useState<string | undefined>(undefined)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<any>(null)
  const prefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 从结案报告跳转携带的 roomId
  const roomIdFromReport = searchParams.get('roomId')
  const roomTitleFromReport = searchParams.get('roomTitle')

  useEffect(() => {
    loadSessions()
    loadAvailableAgents()
  }, [])

  const loadAvailableAgents = async () => {
    try {
      const data = await counselingApi.getAvailableAgents()
      setAvailableAgents(data)
    } catch {
      // 静默失败，降级为只显示默认共情师
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadSessions = async () => {
    setLoadingSessions(true)
    try {
      const data = await counselingApi.getSessions()
      setSessions(data)
    } catch {
      // 静默失败
    } finally {
      setLoadingSessions(false)
    }
  }

  const loadMessages = async (sessionId: number) => {
    setLoadingMessages(true)
    try {
      const data = await counselingApi.getMessages(sessionId)
      setMessages(data)
    } catch {
      setMessages([])
    } finally {
      setLoadingMessages(false)
    }
  }

  // 新建会话后轮询等待开场白，每 1 秒检查一次，最多等 10 秒
  // 用 ref 追踪"用户是否已主动发消息"，发过消息后立即停止轮询，避免覆盖流式状态
  const userHasSentRef = useRef(false)
  const pollForOpening = useCallback((sessionId: number) => {
    userHasSentRef.current = false
    let attempts = 0
    const maxAttempts = 6
    const timer = setInterval(async () => {
      // 用户已发消息，停止轮询，不再覆盖 messages
      if (userHasSentRef.current) {
        clearInterval(timer)
        return
      }
      attempts++
      try {
        const data = await counselingApi.getMessages(sessionId)
        // 只有纯 ASSISTANT 消息（开场白）才更新，有 USER 消息说明用户已开始聊，停止
        if (data.length > 0 && data.every(m => m.role === 'ASSISTANT')) {
          setMessages(data)
          clearInterval(timer)
          return
        }
        if (data.some(m => m.role === 'USER')) {
          clearInterval(timer)
          return
        }
      } catch { /* ignore */ }
      if (attempts >= maxAttempts) clearInterval(timer)
    }, 1000)
  }, [])

  const handleSelectSession = (session: Session) => {
    setActiveSession(session)
    loadMessages(session.id)
    if (window.innerWidth < 768) setSidebarOpen(false)
  }

  const handleNewSession = (quickTopic?: string) => {
    // 有自建智能体可选时，展示选择器；否则直接用默认共情师创建
    if (availableAgents.length > 1) {
      setPendingQuickTopic(quickTopic)
      setShowAgentPicker(true)
    } else {
      doCreateSession(null, quickTopic)
    }
  }

  const doCreateSession = async (counselorBotId: string | null, quickTopic?: string) => {
    setShowAgentPicker(false)
    try {
      const newSession = await counselingApi.createSession({
        roomId: roomIdFromReport ? parseInt(roomIdFromReport) : undefined,
        roomTitle: roomTitleFromReport ? decodeURIComponent(roomTitleFromReport) : undefined,
        counselorBotId,
      })
      setSessions((prev) => [newSession, ...prev])
      setActiveSession(newSession)
      setMessages([])
      pollForOpening(newSession.id)
      if (quickTopic) {
        setInputValue(quickTopic + '，')
        setTimeout(() => inputRef.current?.focus(), 100)
      } else {
        setTimeout(() => inputRef.current?.focus(), 100)
      }
      if (window.innerWidth < 768) setSidebarOpen(false)
    } catch {
      antMessage.error('创建会话失败，请重试')
    }
  }

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: number) => {
    e.stopPropagation()
    try {
      await counselingApi.deleteSession(sessionId)
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      if (activeSession?.id === sessionId) {
        setActiveSession(null)
        setMessages([])
      }
    } catch {
      antMessage.error('删除失败')
    }
  }

  // 用户打字时防抖 300ms 触发预检索，让 RAG 检索在用户思考时并行完成
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setInputValue(val)

    if (!activeSession || !val.trim() || sending) return

    if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current)
    prefetchTimerRef.current = setTimeout(() => {
      counselingApi.prefetchMemories(activeSession.id, val.trim()).catch(() => {})
    }, 300)
  }, [activeSession, sending])

  const handleSend = async () => {
    if (!inputValue.trim() || sending || !activeSession) return

    // 标记用户已发消息，停止开场白轮询
    userHasSentRef.current = true

    // 清掉还未触发的预检索 timer（点发送时不需要再预检索）
    if (prefetchTimerRef.current) {
      clearTimeout(prefetchTimerRef.current)
      prefetchTimerRef.current = null
    }

    const content = inputValue.trim()
    setInputValue('')
    setSending(true)

    // 乐观插入用户消息
    const userMsg: Message = {
      id: Date.now(),
      sessionId: activeSession.id,
      role: 'USER',
      content,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])

    // 插入占位 AI 消息（初始为思考中动画）
    const placeholderId = Date.now() + 1
    const placeholder: Message = {
      id: placeholderId,
      sessionId: activeSession.id,
      role: 'ASSISTANT',
      content: '',
      createdAt: new Date().toISOString(),
      isTyping: true,
      isThinking: true,
    }
    setMessages((prev) => [...prev, placeholder])

    // 更新会话标题（第一条消息）
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSession.id && s.title === '新的对话'
          ? { ...s, title: content.slice(0, 20), updatedAt: new Date().toISOString() }
          : s
      )
    )

    try {
      const token = useAuthStore.getState().accessToken
      const response = await fetch(
        `/api/v1/counseling/sessions/${activeSession.id}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content }),
        }
      )

      if (!response.ok || !response.body) {
        throw new Error('请求失败')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value, { stream: true })
        const lines = text.split('\n')
        for (const line of lines) {
          if (!line.startsWith('data:')) continue
          try {
            const payload = JSON.parse(line.slice(5).trim())
            if (payload.type === 'thinking') {
              // 思考阶段：保持跳动动画，不更新内容
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === placeholderId ? { ...m, isThinking: true } : m
                )
              )
            } else if (payload.type === 'chunk') {
              accContent += payload.content
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === placeholderId
                    ? { ...m, content: accContent, isTyping: true, isThinking: false }
                    : m
                )
              )
            } else if (payload.type === 'done') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === placeholderId
                    ? { ...m, content: accContent, isTyping: false, isThinking: false }
                    : m
                )
              )
            } else if (payload.type === 'error') {
              throw new Error(payload.message)
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => m.id !== placeholderId))
      antMessage.error(err?.message || '发送失败，请重试')
    } finally {
      // 保底：流结束后如果占位符还在 isTyping/isThinking 状态，停止动画
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholderId
            ? { ...m, isTyping: false, isThinking: false }
            : m
        )
      )
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── 渲染：会话列表侧边栏 ──────────────────────────────────

  const renderSidebar = () => (
    <div className={`counseling-sidebar ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <div className="sidebar-header">
        <div className="sidebar-title">
          <HeartOutlined className="sidebar-title-icon" />
          <span>AI 共情师</span>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="small"
          onClick={() => handleNewSession()}
          className="new-session-btn"
        >
          新对话
        </Button>
      </div>

      <div className="session-list">
        {loadingSessions ? (
          <div className="session-list-loading">
            {[1, 2, 3].map((i) => (
              <div key={i} className="session-skeleton">
                <Skeleton active title={{ width: '70%' }} paragraph={{ rows: 1, width: '50%' }} />
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="session-list-empty">
            <MessageOutlined className="empty-icon" />
            <p>还没有对话记录</p>
            <p className="empty-hint">点击「新对话」开始</p>
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className={`session-item ${activeSession?.id === session.id ? 'session-item-active' : ''}`}
              onClick={() => handleSelectSession(session)}
            >
              <div className="session-item-main">
                <div className="session-item-title">{session.title}</div>
                {session.summary && (
                  <div className="session-item-summary">{session.summary}</div>
                )}
                <div className="session-item-meta">
                  <span className="session-item-time">{formatTime(session.updatedAt)}</span>
                  {session.counselorName && session.counselorName !== '默认共情师' && (
                    <span className="session-item-agent-tag">
                      <RobotOutlined style={{ fontSize: 10, marginRight: 2 }} />
                      {session.counselorName}
                    </span>
                  )}
                  {session.status === 'ACTIVE' && (
                    <span className="session-item-active-dot" />
                  )}
                </div>
              </div>
              <Tooltip title="删除对话">
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  className="session-delete-btn"
                  onClick={(e) => handleDeleteSession(e, session.id)}
                />
              </Tooltip>
            </div>
          ))
        )}
      </div>
    </div>
  )

  // ── 渲染：欢迎卡片（无会话时） ────────────────────────────

  const renderWelcome = () => (
    <div className="counseling-welcome">
      <div className="welcome-card">
        <div className="welcome-avatar">
          <div className="welcome-avatar-ring" />
          <div className="welcome-avatar-inner">💚</div>
        </div>
        <h2 className="welcome-title">你好，我是你的专属辅导师</h2>
        <p className="welcome-desc">
          无论学业压力、感情困惑还是日常烦恼，
          <br />
          都可以随时跟我说说。这里是你的私密空间。
        </p>

        {roomIdFromReport && roomTitleFromReport && (
          <div className="welcome-context-tip">
            <span className="context-tip-icon">💬</span>
            <span>已关联案件：<strong>{decodeURIComponent(roomTitleFromReport)}</strong></span>
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              onClick={() => navigate('/counseling')}
              className="context-tip-close"
            />
          </div>
        )}

        <div className="welcome-topics">
          <p className="welcome-topics-label">快速开始</p>
          <div className="welcome-topics-grid">
            {QUICK_TOPICS.map((topic) => (
              <button
                key={topic.label}
                className="topic-chip"
                onClick={() => handleNewSession(topic.label)}
              >
                <span className="topic-emoji">{topic.emoji}</span>
                <span>{topic.label}</span>
              </button>
            ))}
          </div>
        </div>

        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          onClick={() => handleNewSession()}
          className="welcome-start-btn"
        >
          开始新对话
        </Button>
      </div>
    </div>
  )

  // ── 渲染：聊天区 ──────────────────────────────────────────

  const renderChat = () => (
    <div className="counseling-chat">
      {/* 聊天头部 */}
      <div className="chat-topbar">
        <Button
          type="text"
          icon={<MenuOutlined />}
          className="chat-topbar-menu-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        />
        <div className="chat-topbar-info">
          <div className="chat-topbar-avatar">
            {activeSession?.counselorBotId ? <RobotOutlined /> : '💚'}
          </div>
          <div>
            <div className="chat-topbar-name">
              {activeSession?.counselorName || 'AI 共情师'}
            </div>
            <div className="chat-topbar-status">
              <span className="status-dot" />
              在线
            </div>
          </div>
        </div>
        {activeSession?.roomTitle && (
          <div className="chat-topbar-context">
            <span className="context-badge">
              💬 关联案件：{activeSession.roomTitle}
            </span>
          </div>
        )}
      </div>

      {/* 消息列表 */}
      <div className="chat-messages">
        {loadingMessages ? (
          <div className="messages-loading">
            {[1, 2].map((i) => (
              <div key={i} className={`message-skeleton ${i % 2 === 0 ? 'skeleton-right' : ''}`}>
                <Skeleton avatar active paragraph={{ rows: 2 }} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="messages-empty">
            <div className="messages-empty-avatar">💚</div>
            <div className="messages-empty-bubble">
              {activeSession?.roomId
                ? `我已了解你的案件背景，我们可以直接从这里开始聊。你现在感觉怎么样？`
                : `你好！很高兴见到你。今天有什么想聊的吗？无论什么都可以说说。`
              }
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`message-row ${msg.role === 'USER' ? 'message-row-user' : 'message-row-assistant'}`}
            >
              {/* 头像统一放第一位，row-reverse 会让用户消息的头像显示在右侧 */}
              {msg.role === 'ASSISTANT' ? (
                <div className="message-avatar message-avatar-assistant">💚</div>
              ) : (
                <Avatar
                  size={36}
                  src={user?.avatar}
                  icon={<UserOutlined />}
                  className="message-avatar message-avatar-user"
                />
              )}
              <div className={`message-bubble ${msg.role === 'USER' ? 'bubble-user' : 'bubble-assistant'}`}>
                {msg.isThinking ? (
                  // 深度思考阶段：跳动点动画
                  <div className="bubble-content bubble-thinking-dots">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                ) : (
                  <div className="bubble-content">
                    {msg.role === 'ASSISTANT' ? (
                      <div className="bubble-markdown">
                        <ReactMarkdown
                          components={{
                            // 链接在新标签页打开，不显示图片（共情师不需要）
                            a: ({ href, children }) => (
                              <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
                            ),
                            img: () => null,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                        {msg.isTyping && <span className="typing-cursor">|</span>}
                      </div>
                    ) : (
                      <>
                        {msg.content}
                      </>
                    )}
                  </div>
                )}
                {!msg.isTyping && !msg.isThinking && (
                  <div className="bubble-time">{formatTime(msg.createdAt)}</div>
                )}
              </div>
            </div>
          ))
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入区 */}
      <div className="chat-input-area">
        <div className="chat-input-wrapper">
          <TextArea
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="说说你的感受... （Enter 发送，Shift+Enter 换行）"
            autoSize={{ minRows: 1, maxRows: 5 }}
            maxLength={500}
            className="chat-input"
            disabled={sending}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            disabled={!inputValue.trim() || sending}
            loading={sending}
            className="chat-send-btn"
          />
        </div>
        <div className="chat-input-hint">
          你的对话内容仅用于提供辅导服务，完全保密
        </div>
      </div>
    </div>
  )

  // ── 渲染：辅导师选择器 ────────────────────────────────────

  const renderAgentPicker = () => (
    <div className="agent-picker-overlay" onClick={() => setShowAgentPicker(false)}>
      <div className="agent-picker-card" onClick={(e) => e.stopPropagation()}>
        <div className="agent-picker-title">选择你的辅导师</div>
        <div className="agent-picker-list">
          {availableAgents.map((agent) => (
            <div
              key={agent.id ?? '__default__'}
              className={`agent-picker-item ${selectedAgentId === agent.id ? 'agent-picker-item-selected' : ''}`}
              onClick={() => setSelectedAgentId(agent.id)}
            >
              <div className="agent-picker-avatar">
                {agent.isSystem ? '💚' : <RobotOutlined />}
              </div>
              <div className="agent-picker-info">
                <div className="agent-picker-name">
                  {agent.name}
                  {agent.isSystem && <span className="agent-picker-recommend">推荐</span>}
                </div>
                <div className="agent-picker-desc">{agent.description}</div>
              </div>
              {selectedAgentId === agent.id && (
                <CheckOutlined className="agent-picker-check" />
              )}
            </div>
          ))}
        </div>
        {selectedAgentId !== null && (
          <div className="agent-picker-warning">
            ⚠️ 自建智能体的风格由你定义，体验可能与默认共情师不同
          </div>
        )}
        <div className="agent-picker-actions">
          <Button onClick={() => setShowAgentPicker(false)}>取消</Button>
          <Button
            type="primary"
            onClick={() => doCreateSession(selectedAgentId, pendingQuickTopic)}
          >
            开始对话
          </Button>
        </div>
      </div>
    </div>
  )

  // ── 主渲染 ────────────────────────────────────────────────

  return (
    <div className="counseling-page">
      {renderSidebar()}

      <div className="counseling-main">
        {!activeSession ? renderWelcome() : renderChat()}
      </div>

      {showAgentPicker && renderAgentPicker()}
    </div>
  )
}

export default Counseling

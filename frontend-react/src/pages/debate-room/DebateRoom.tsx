import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, message, Tabs } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import * as roomApi from '@/api/rooms'
import * as authApi from '@/api/auth'
import { useAuthStore } from '@/store'
import { LeftPanel } from './components/LeftPanel'
import { DebateStage } from './components/DebateStage'
import { ChatPanel } from './components/ChatPanel'
import { VoteBar } from './components/VoteBar'
import './DebateRoom.less'

interface Message {
  id: string
  agentId: string
  content: string
  roundNumber: number
  createdAt: Date
  isTyping?: boolean
}

interface ChatMessage {
  id: number
  senderId: number
  content: string
  createdAt: string
}

export const DebateRoom: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { accessToken, refreshToken, setAccessToken, clearAuth } = useAuthStore()
  
  const [socket, setSocket] = useState<Socket | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [onlineCount, setOnlineCount] = useState(0)
  const [currentRound, setCurrentRound] = useState(1)
  const [isOwner, setIsOwner] = useState(false)
  const [typingAgents, setTypingAgents] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState('debate')

  // 未登录用户直接跳转到登录页
  useEffect(() => {
    if (!accessToken) {
      navigate('/login')
    }
  }, [accessToken, navigate])

  // 获取案件详情
  const { data: room, isLoading } = useQuery({
    queryKey: ['room-detail', id],
    queryFn: () => roomApi.getRoomById(parseInt(id || '0')),
    enabled: !!id,
  })

  // 获取 Agents
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

  // 初始化 WebSocket
  useEffect(() => {
    if (!id || !accessToken || !room) return

    const roomData = (room as any).data || room

    console.log('🔥 [DEBUG] Connecting to WebSocket: http://localhost:3000')
    
    const socketInstance = io('http://localhost:3000', {
      auth: {
        token: accessToken,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })

    socketInstance.on('connect', () => {
      console.log('✅ WebSocket connected:', socketInstance.id)
      // 加入房间
      socketInstance.emit('joinRoom', {
        roomId: parseInt(id),
        ownerId: roomData.ownerId,
      })
    })

    socketInstance.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error)
      message.error('连接失败，请检查后端服务是否启动')
    })

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(`🔄 WebSocket reconnected after ${attemptNumber} attempts`)
      message.success('重新连接成功')
    })

    socketInstance.on('joinedRoom', (data: any) => {
      console.log('Joined room:', data)
      setIsOwner(data.isOwner)
      setOnlineCount(data.onlineCount)
    })

    socketInstance.on('userJoined', (data: any) => {
      setOnlineCount(data.onlineCount)
    })

    socketInstance.on('userLeft', (data: any) => {
      setOnlineCount(data.onlineCount)
    })

    // 辩论开始
    socketInstance.on('debateStarted', (data: any) => {
      message.success('辩论已开始！')
      setCurrentRound(data.round)
    })

    // 轮次变化
    socketInstance.on('roundChanged', (data: any) => {
      setCurrentRound(data.round)
      message.info(`进入第 ${data.round} 轮`)
    })

    // Agent 正在输入
    socketInstance.on('agentTyping', (data: any) => {
      setTypingAgents((prev) => new Set(prev).add(data.agentId))
    })

    // 接收消息 chunk（打字机效果）
    socketInstance.on('messageChunk', (data: any) => {
      setMessages((prev) => {
        const existingIndex = prev.findIndex(
          (m) => m.agentId === data.agentId && m.roundNumber === data.roundNumber && m.isTyping
        )
        
        if (existingIndex >= 0) {
          const updated = [...prev]
          updated[existingIndex] = {
            ...updated[existingIndex],
            content: updated[existingIndex].content + data.chunk,
          }
          return updated
        } else {
          return [
            ...prev,
            {
              id: `${data.agentId}-${data.roundNumber}`,
              agentId: data.agentId,
              content: data.chunk,
              roundNumber: data.roundNumber,
              createdAt: new Date(),
              isTyping: true,
            },
          ]
        }
      })
    })

    // 消息完成
    socketInstance.on('messageComplete', (data: any) => {
      setTypingAgents((prev) => {
        const updated = new Set(prev)
        updated.delete(data.agentId)
        return updated
      })
      
      setMessages((prev) =>
        prev.map((m) =>
          m.agentId === data.agentId && m.roundNumber === data.roundNumber
            ? { ...m, isTyping: false }
            : m
        )
      )
    })

    // 辩论结束
    socketInstance.on('debateFinished', () => {
      message.success('辩论已结束！')
    })

    // 投票更新
    socketInstance.on('voteUpdate', (data: any) => {
      console.log('Vote update:', data)
    })

    // 新消息
    socketInstance.on('newMessage', (data: any) => {
      setChatMessages((prev) => [...prev, data])
    })

    // 房间历史聊天记录（刷新页面后初始化）
    socketInstance.on('chatHistory', (data: any[]) => {
      if (Array.isArray(data)) {
        setChatMessages(data)
      }
    })

    const tryRefreshAndReconnect = async (reason?: string) => {
      if (!refreshToken) {
        message.error('登录已过期，请重新登录')
        clearAuth()
        navigate('/login')
        return
      }

      try {
        const resp = await authApi.refreshToken(refreshToken)
        const newToken = (resp as any)?.accessToken
        if (!newToken) throw new Error('刷新 Token 失败')

        setAccessToken(newToken)
        socketInstance.auth = { token: newToken }
        if (socketInstance.connected) socketInstance.disconnect()
        socketInstance.connect()
        if (reason) message.info('登录已刷新，正在重连…')
      } catch (e: any) {
        message.error(e?.message || '登录已过期，请重新登录')
        clearAuth()
        navigate('/login')
      }
    }

    socketInstance.on('wsError', (data: any) => {
      const err = (data?.error || '').toString()
      if (
        err.includes('jwt expired') ||
        err.includes('invalid token') ||
        err.includes('Unauthorized') ||
        err.includes('请先登录') ||
        err.includes('未登录')
      ) {
        void tryRefreshAndReconnect(err)
        return
      }
      message.error(data?.error || 'WebSocket 错误')
    })

    socketInstance.on('disconnect', () => {
      console.log('WebSocket disconnected')
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.emit('leaveRoom', { roomId: parseInt(id) })
      socketInstance.disconnect()
    }
  }, [id, accessToken, refreshToken, room])

  const handleStartDebate = async () => {
    try {
      await fetch(`http://localhost:3000/api/v1/rooms/${id}/start`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      message.success('辩论即将开始')
    } catch (error) {
      message.error('开始辩论失败')
    }
  }

  const handleSendMessage = (content: string) => {
    if (!socket) return
    socket.emit(
      'sendMessage',
      {
        roomId: parseInt(id!),
        content,
      },
      (resp: any) => {
        if (!resp?.success) {
          message.error(resp?.error || '发送失败')
        }
      }
    )
  }

  const handleVote = (agentId: string) => {
    if (!socket) return
    socket.emit(
      'vote',
      {
        roomId: parseInt(id!),
        agentId,
      },
      (resp: any) => {
        if (!resp?.success) {
          message.error(resp?.error || '投票失败')
          return
        }
        message.success('投票成功')
      }
    )
  }

  if (isLoading || !room) {
    return <div className="debate-room-loading">加载中...</div>
  }

  const roomData = room.data || room

  // 移动端使用 Tab 切换
  const mobileTabItems = [
    {
      key: 'info',
      label: '案件信息',
      children: <LeftPanel room={roomData} agents={agents} currentRound={currentRound} />,
    },
    {
      key: 'debate',
      label: 'AI 辩论',
      children: (
        <DebateStage
          messages={messages}
          agents={agents}
          typingAgents={typingAgents}
          currentRound={currentRound}
        />
      ),
    },
    {
      key: 'chat',
      label: '弹幕聊天',
      children: (
        <ChatPanel
          messages={chatMessages}
          onlineCount={onlineCount}
          onSendMessage={handleSendMessage}
        />
      ),
    },
  ]

  return (
    <div className="debate-room">
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/cases')}
        className="back-button"
      >
        返回
      </Button>

      {/* 桌面版：三栏布局 */}
      <div className="debate-room-desktop">
        <div className="left-panel">
          <LeftPanel room={roomData} agents={agents} currentRound={currentRound} />
          {isOwner && roomData.status === 'WAITING' && (
            <div className="owner-controls">
              <Button type="primary" block onClick={handleStartDebate}>
                🚀 开始辩论
              </Button>
            </div>
          )}
        </div>

        <div className="center-panel">
          <DebateStage
            messages={messages}
            agents={agents}
            typingAgents={typingAgents}
            currentRound={currentRound}
          />
        </div>

        <div className="right-panel">
          <ChatPanel
            messages={chatMessages}
            onlineCount={onlineCount}
            onSendMessage={handleSendMessage}
          />
        </div>
      </div>

      {/* 移动版：Tab 切换 */}
      <div className="debate-room-mobile">
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={mobileTabItems} />
      </div>

      {/* 底部投票条 */}
      <VoteBar
        agents={Object.values(agents).filter((a: any) =>
          roomData.agents?.includes(a.id)
        )}
        onVote={handleVote}
        onlineCount={onlineCount}
      />
    </div>
  )
}

export default DebateRoom

import React, { useState, useEffect, useRef } from 'react'
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
  reasoning?: string
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
  const { accessToken, refreshToken, setAccessToken, clearAuth, user } = useAuthStore()
  
  const [socket, setSocket] = useState<Socket | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [onlineCount, setOnlineCount] = useState(0)
  const [currentRound, setCurrentRound] = useState(1)
  const [isOwner, setIsOwner] = useState(false)
  const [typingAgents, setTypingAgents] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState('debate')
  const [roomStatus, setRoomStatus] = useState<'WAITING' | 'LIVE' | 'CLOSED' | string>('WAITING')
  const lastRoundToastRef = useRef<number | null>(null)
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({})
  const [totalVotes, setTotalVotes] = useState(0)

  // 缓冲流式 chunk（区分 reasoning/answer），避免频繁 setState 导致舞台滚动卡死
  const pendingChunksRef = useRef<Map<string, { reasoning: string[]; answer: string[] }>>(new Map())
  const flushTimerRef = useRef<number | null>(null)

  const getRoundPhaseLabel = (round: number) =>
    round === 1 ? '阐述观点' : round === 2 ? '交叉反驳' : '律师裁决'

  const notifyEnterRound = (round: number) => {
    if (!round || Number.isNaN(round)) return
    if (lastRoundToastRef.current === round) return
    lastRoundToastRef.current = round
    message.info(`进入第 ${round} 轮：${getRoundPhaseLabel(round)}`)
  }

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
    setRoomStatus(roomData.status)

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
      setCurrentRound(data.round)
      setRoomStatus('LIVE')
      notifyEnterRound(Number(data.round))
    })

    // 轮次变化
    socketInstance.on('roundChanged', (data: any) => {
      setCurrentRound(data.round)
      notifyEnterRound(Number(data.round))
    })

    // Agent 正在输入
    socketInstance.on('agentTyping', (data: any) => {
      setTypingAgents((prev) => new Set(prev).add(data.agentId))
    })

    // 接收消息 chunk（打字机效果）
    socketInstance.on('messageChunk', (data: any) => {
      const key = `${data.agentId}-${data.roundNumber}`
      const entry = pendingChunksRef.current.get(key) || { reasoning: [], answer: [] }
      const kind = data.kind === 'reasoning' ? 'reasoning' : 'answer'
      entry[kind].push(String(data.chunk ?? ''))
      pendingChunksRef.current.set(key, entry)
    })

    // 消息完成
    socketInstance.on('messageComplete', (data: any) => {
      setTypingAgents((prev) => {
        const updated = new Set(prev)
        updated.delete(data.agentId)
        return updated
      })

      // 先刷掉该条消息剩余 chunk，再标记完成
      const key = `${data.agentId}-${data.roundNumber}`
      const entry = pendingChunksRef.current.get(key)
      if (entry && (entry.answer.length > 0 || entry.reasoning.length > 0)) {
        const answerText = entry.answer.join('')
        const reasoningText = entry.reasoning.join('')
        pendingChunksRef.current.delete(key)
        setMessages((prev) => {
          const existingIndex = prev.findIndex((m) => m.id === key)
          if (existingIndex >= 0) {
            const updated = [...prev]
            updated[existingIndex] = {
              ...updated[existingIndex],
              content: updated[existingIndex].content + answerText,
              reasoning: (updated[existingIndex].reasoning || '') + reasoningText,
              isTyping: false,
            }
            return updated
          }
          return [
            ...prev,
            {
              id: key,
              agentId: data.agentId,
              content: answerText,
              reasoning: reasoningText,
              roundNumber: data.roundNumber,
              createdAt: new Date(),
              isTyping: false,
            },
          ]
        })
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.agentId === data.agentId && m.roundNumber === data.roundNumber
              ? {
                  ...m,
                  isTyping: false,
                  // 服务端会带最终的 content/reasoning，这里兜底写入
                  content: data.content ? String(data.content) : m.content,
                  reasoning: data.reasoning ? String(data.reasoning) : m.reasoning,
                }
              : m
          )
        )
      }
    })

    // 辩论结束
    socketInstance.on('debateFinished', () => {
      message.success('辩论已结束！')
      setRoomStatus('CLOSED')
    })

    // 投票更新
    socketInstance.on('voteUpdate', (data: any) => {
      console.log('Vote update:', data)
      if (data?.counts && typeof data?.totalVotes === 'number') {
        setVoteCounts(data.counts)
        setTotalVotes(data.totalVotes)
      }
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

    // 定时批量刷入 chunk，降低渲染频率
    flushTimerRef.current = window.setInterval(() => {
      if (pendingChunksRef.current.size === 0) return

      const entries = Array.from(pendingChunksRef.current.entries())
      pendingChunksRef.current.clear()

      setMessages((prev) => {
        let updated = prev
        for (const [key, chunks] of entries) {
          const answerText = chunks.answer.join('')
          const reasoningText = chunks.reasoning.join('')
          const [agentId, roundStr] = key.split('-')
          const roundNumber = Number(roundStr) || 1

          const existingIndex = updated.findIndex((m) => m.id === key)
          if (existingIndex >= 0) {
            const nextArr = [...updated]
            nextArr[existingIndex] = {
              ...nextArr[existingIndex],
              content: nextArr[existingIndex].content + answerText,
              reasoning: (nextArr[existingIndex].reasoning || '') + reasoningText,
              isTyping: true,
            }
            updated = nextArr
          } else {
            updated = [
              ...updated,
              {
                id: key,
                agentId,
                content: answerText,
                reasoning: reasoningText,
                roundNumber,
                createdAt: new Date(),
                isTyping: true,
              },
            ]
          }
        }
        return updated
      })
    }, 50)

    return () => {
      socketInstance.emit('leaveRoom', { roomId: parseInt(id) })
      socketInstance.disconnect()
      if (flushTimerRef.current) {
        window.clearInterval(flushTimerRef.current)
        flushTimerRef.current = null
      }
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
    if (!socket) return Promise.resolve(false)
    return new Promise<boolean>((resolve) => {
      socket.emit(
      'vote',
      {
        roomId: parseInt(id!),
        agentId,
      },
      (resp: any) => {
        if (!resp?.success) {
          message.error(resp?.error || '投票失败')
          resolve(false)
          return
        }
        if (resp?.counts && typeof resp?.totalVotes === 'number') {
          setVoteCounts(resp.counts)
          setTotalVotes(resp.totalVotes)
        }
        message.success('投票成功')
        resolve(true)
      }
      )
    })
  }

  if (isLoading || !room) {
    return <div className="debate-room-loading">加载中...</div>
  }

  const roomData = room.data || room

  // 双保险：既依赖 WebSocket 返回的 isOwner，也用登录用户和 ownerId 再算一遍
  const isRealOwner =
    isOwner ||
    (!!user &&
      (roomData.ownerId === user.id ||
        roomData.ownerId === Number(user.id)))

  // 移动端使用 Tab 切换
  const mobileTabItems = [
    {
      key: 'info',
      label: '案件信息',
      children: (
        <LeftPanel room={roomData} agents={agents} currentRound={currentRound} />
      ),
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
        </div>

        <div className="center-panel">
          <DebateStage
            messages={messages}
            agents={agents}
            typingAgents={typingAgents}
            currentRound={currentRound}
            isOwner={isRealOwner}
            canStart={roomStatus === 'WAITING'}
            onStartDebate={handleStartDebate}
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
      {roomStatus === 'CLOSED' && (
        <VoteBar
          agents={Object.values(agents).filter((a: any) =>
            roomData.agents?.includes(a.id)
          )}
          onVote={handleVote}
          onlineCount={onlineCount}
          voteCounts={voteCounts}
          totalVotes={totalVotes}
        />
      )}
    </div>
  )
}

export default DebateRoom

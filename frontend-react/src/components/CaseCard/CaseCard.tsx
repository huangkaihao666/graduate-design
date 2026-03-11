import React from 'react'
import { Card, Avatar, Space, Tag } from 'antd'
import { EyeOutlined, MessageOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { Room } from '@/types/common'
import './CaseCard.less'

interface CaseCardProps {
  room: Room
  agents: Record<string, any>
}

export const CaseCard: React.FC<CaseCardProps> = ({ room, agents }) => {
  const navigate = useNavigate()

  // 计算两边投票数
  const voteStats = room.votes || {}
  const agentIds = room.agents || []
  const firstHalf = agentIds.slice(0, Math.ceil(agentIds.length / 2))
  const secondHalf = agentIds.slice(Math.ceil(agentIds.length / 2))

  const firstVotes = firstHalf.reduce((sum, id) => sum + (voteStats[id] || 0), 0)
  const secondVotes = secondHalf.reduce((sum, id) => sum + (voteStats[id] || 0), 0)
  const totalVotes = firstVotes + secondVotes

  const firstPercent = totalVotes > 0 ? (firstVotes / totalVotes) * 100 : 50
  const secondPercent = totalVotes > 0 ? (secondVotes / totalVotes) * 100 : 50

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'LIVE':
        return 'blue'
      case 'WAITING':
        return 'orange'
      case 'CLOSED':
        return 'default'
      default:
        return 'default'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'LIVE':
        return '进行中'
      case 'WAITING':
        return '即将开始'
      case 'CLOSED':
        return '已结束'
      default:
        return status
    }
  }

  const handleCardClick = () => {
    navigate(`/cases/${room.id}`)
  }

  return (
    <Card
      className="case-card"
      hoverable
      onClick={handleCardClick}
      cover={
        room.image ? (
          <div className="case-card-image">
            <img alt="case-cover" src={room.image} />
          </div>
        ) : (
          <div className="case-card-image placeholder">
            <span>案件图片</span>
          </div>
        )
      }
    >
      {/* 状态标签 */}
      <div className="case-card-header">
        <Tag color={getStatusColor(room.status)}>{getStatusLabel(room.status)}</Tag>
      </div>

      {/* 标题 */}
      <h3 className="case-card-title">{room.title}</h3>

      {/* 描述 */}
      <p className="case-card-description">{room.content.substring(0, 80)}...</p>

      {/* Agent 头像 */}
      <div className="case-card-agents">
        <Space size="small">
          {room.agents?.map((agentId: string) => {
            const agent = agents?.[agentId]
            return (
              <Avatar
                key={agentId}
                src={agent?.avatar}
                alt={agent?.name}
                size="small"
              />
            )
          })}
        </Space>
      </div>

      {/* 进度条 - 双方对比 */}
      <div className="case-card-progress">
        <div className="progress-bar">
          <div
            className="progress-first"
            style={{ width: `${firstPercent}%` }}
          />
          <div
            className="progress-second"
            style={{ width: `${secondPercent}%` }}
          />
        </div>
        <div className="progress-labels">
          <span className="label-first">{firstVotes} 票</span>
          <span className="label-second">{secondVotes} 票</span>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="case-card-stats">
        <Space size="middle" separator="|" style={{ width: '100%', justifyContent: 'space-around' }}>
          <div className="stat-item">
            <EyeOutlined className="stat-icon" />
            <span>{room.viewCount}</span>
          </div>
          <div className="stat-item">
            <MessageOutlined className="stat-icon" />
            <span>{room.commentCount}</span>
          </div>
          <div className="stat-item">
            <span className="stat-time">
              {new Date(room.createdAt).toLocaleDateString()}
            </span>
          </div>
        </Space>
      </div>

      {/* 发起人信息 */}
      <div className="case-card-owner">
        <Avatar src={room.owner?.avatar} size={24} />
        <span className="owner-name">{room.owner?.name}</span>
      </div>
    </Card>
  )
}

export default CaseCard

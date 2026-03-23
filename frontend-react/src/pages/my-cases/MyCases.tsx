import React, { useState } from 'react'
import { Row, Col, Tabs, Skeleton, Empty, Button } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { CaseCard } from '@/components/CaseCard'
import * as roomApi from '@/api/rooms'
import './MyCases.less'

interface Agent {
  [key: string]: any
}

const MyCases: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('all')

  // 获取我的案件列表
  const {
    data: roomsData,
    isLoading: roomsLoading,
  } = useQuery({
    queryKey: ['my-cases', activeTab],
    queryFn: () =>
      roomApi.getRooms({
        page: 1,
        pageSize: 100,
        sort: 'mine',
      }),
    staleTime: 5 * 60 * 1000,
  })

  // 获取所有 Agents
  const { data: agentsData } = useQuery({
    queryKey: ['agents'],
    queryFn: roomApi.getAllAgents,
    staleTime: Infinity,
  })

  const agents: Agent = {}
  if (agentsData && Array.isArray(agentsData)) {
    agentsData.forEach((agent: any) => {
      agents[agent.id] = agent
    })
  }

  // roomsData 已经过拦截器处理，直接是 { data: [...], pagination: {...} } 格式
  const roomsList = (roomsData as any)?.data || []

  // 按状态筛选
  const liveRooms = roomsList.filter((room: any) => room.status === 'LIVE')
  const archivedRooms = roomsList.filter((room: any) => room.status === 'CLOSED')

  const tabItems = [
    {
      key: 'all',
      label: `全部 (${roomsList.length})`,
      children: (
        <div className="cases-grid">
          {roomsLoading ? (
            <Row gutter={[16, 16]}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Col key={i} xs={24} sm={12} md={8} lg={6}>
                  <Skeleton active avatar={{ size: 'large', shape: 'square' }} paragraph={{ rows: 3 }} />
                </Col>
              ))}
            </Row>
          ) : roomsList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <Empty description="暂无案件" />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/create')}
                style={{ marginTop: 16 }}
              >
                创建案件
              </Button>
            </div>
          ) : (
            <Row gutter={[16, 16]}>
              {roomsList.map((room: any) => (
                <Col key={room.id} xs={24} sm={12} md={8} lg={6}>
                  <CaseCard room={room} agents={agents} />
                </Col>
              ))}
            </Row>
          )}
        </div>
      ),
    },
    {
      key: 'live',
      label: `进行中 (${liveRooms.length})`,
      children: (
        <div className="cases-grid">
          {roomsLoading ? (
            <Row gutter={[16, 16]}>
              {Array.from({ length: 4 }).map((_, i) => (
                <Col key={i} xs={24} sm={12} md={8} lg={6}>
                  <Skeleton active avatar={{ size: 'large', shape: 'square' }} paragraph={{ rows: 3 }} />
                </Col>
              ))}
            </Row>
          ) : liveRooms.length === 0 ? (
            <Empty description="暂无进行中的案件" />
          ) : (
            <Row gutter={[16, 16]}>
              {liveRooms.map((room: any) => (
                <Col key={room.id} xs={24} sm={12} md={8} lg={6}>
                  <CaseCard room={room} agents={agents} />
                </Col>
              ))}
            </Row>
          )}
        </div>
      ),
    },
    {
      key: 'archived',
      label: `已结束 (${archivedRooms.length})`,
      children: (
        <div className="cases-grid">
          {roomsLoading ? (
            <Row gutter={[16, 16]}>
              {Array.from({ length: 4 }).map((_, i) => (
                <Col key={i} xs={24} sm={12} md={8} lg={6}>
                  <Skeleton active avatar={{ size: 'large', shape: 'square' }} paragraph={{ rows: 3 }} />
                </Col>
              ))}
            </Row>
          ) : archivedRooms.length === 0 ? (
            <Empty description="暂无已结束的案件" />
          ) : (
            <Row gutter={[16, 16]}>
              {archivedRooms.map((room: any) => (
                <Col key={room.id} xs={24} sm={12} md={8} lg={6}>
                  <CaseCard room={room} agents={agents} />
                </Col>
              ))}
            </Row>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="my-cases-page">
      <div className="my-cases-header">
        <h1>📝 我的案件</h1>
        <p>管理您创建的所有案件</p>
        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          onClick={() => navigate('/create')}
        >
          创建新案件
        </Button>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
      />
    </div>
  )
}

export default MyCases

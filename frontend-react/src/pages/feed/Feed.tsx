import React, { useState } from 'react'
import { Avatar, Button, Empty, Pagination, Skeleton, Tabs } from 'antd'
import { TeamOutlined, UserOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store'
import { CaseCard } from '@/components/CaseCard'
import * as usersApi from '@/api/users'
import * as roomApi from '@/api/rooms'
import './Feed.less'

const Feed: React.FC = () => {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const userId = user?.id!
  const [feedPage, setFeedPage] = useState(1)

  const { data: feedData, isLoading: feedLoading } = useQuery({
    queryKey: ['feed', feedPage],
    queryFn: () => usersApi.getFeed({ page: feedPage, pageSize: 15 }),
    enabled: !!userId,
  })

  const { data: followingData, isLoading: followingLoading } = useQuery({
    queryKey: ['following', userId],
    queryFn: () => usersApi.getFollowing(userId),
    enabled: !!userId,
  })

  const { data: followCountsData } = useQuery({
    queryKey: ['follow-counts', userId],
    queryFn: () => usersApi.getFollowCounts(userId),
    enabled: !!userId,
  })

  const { data: agentsData } = useQuery({
    queryKey: ['agents'],
    queryFn: roomApi.getAllAgents,
    staleTime: Infinity,
  })

  const agents: Record<string, any> = {}
  if (agentsData && Array.isArray(agentsData)) {
    agentsData.forEach((a: any) => { agents[a.id] = a })
  }

  const unfollowMutation = useMutation({
    mutationFn: (targetId: number) => usersApi.unfollowUser(targetId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['following', userId] })
      void queryClient.invalidateQueries({ queryKey: ['follow-counts', userId] })
      void queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })

  const feedRooms = feedData?.data || []
  const feedPagination = feedData?.pagination || {}
  const followingList = (followingData as any) || []
  const counts = followCountsData as any

  return (
    <div className="feed-page">
      <div className="feed-container">
        <div className="feed-header">
          <div className="feed-title">
            <TeamOutlined className="feed-title-icon" />
            <span>关注动态</span>
          </div>
          <div className="feed-counts">
            <span className="feed-count-item">
              <strong>{counts?.following ?? 0}</strong> 关注
            </span>
            <span className="feed-count-sep">·</span>
            <span className="feed-count-item">
              <strong>{counts?.followers ?? 0}</strong> 粉丝
            </span>
          </div>
        </div>

        <div className="feed-layout">
          {/* ── 左侧动态流 ── */}
          <div className="feed-main">
            <Tabs
              defaultActiveKey="timeline"
              className="feed-tabs"
              items={[
                {
                  key: 'timeline',
                  label: '最新动态',
                  children: (
                    <div className="feed-timeline">
                      {feedLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                          <Skeleton key={i} active className="feed-skeleton" />
                        ))
                      ) : feedRooms.length === 0 ? (
                        <Empty
                          className="feed-empty"
                          description={
                            <div className="feed-empty-text">
                              <div>暂无动态</div>
                              <div className="feed-empty-sub">去关注一些用户，他们发起辩论时会出现在这里</div>
                            </div>
                          }
                        >
                          <Button type="primary" onClick={() => navigate('/cases')}>
                            去发现用户
                          </Button>
                        </Empty>
                      ) : (
                        <>
                          <div className="feed-cards">
                            {feedRooms.map((room: any) => (
                              <div key={room.id} className="feed-card-wrap">
                                <div className="feed-card-meta">
                                  <Avatar
                                    size={24}
                                    src={room.owner?.avatar}
                                    icon={<UserOutlined />}
                                    className="feed-card-avatar"
                                  />
                                  <span
                                    className="feed-card-username"
                                    onClick={() => navigate(`/cases`)}
                                  >
                                    {room.owner?.name || '未知用户'}
                                  </span>
                                  <span className="feed-card-action">发起了辩论</span>
                                </div>
                                <CaseCard room={room} agents={agents} />
                              </div>
                            ))}
                          </div>
                          {feedPagination.total > 15 && (
                            <div className="feed-pagination">
                              <Pagination
                                current={feedPage}
                                total={feedPagination.total}
                                pageSize={15}
                                onChange={setFeedPage}
                                showSizeChanger={false}
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </div>

          {/* ── 右侧关注列表 ── */}
          <aside className="feed-sidebar">
            <div className="feed-sidebar-card">
              <div className="feed-sidebar-title">
                <TeamOutlined /> 我的关注
                <span className="feed-sidebar-count">{followingList.length}</span>
              </div>
              {followingLoading ? (
                <Skeleton active paragraph={{ rows: 3 }} />
              ) : followingList.length === 0 ? (
                <div className="feed-sidebar-empty">还没有关注任何人</div>
              ) : (
                <div className="feed-following-list">
                  {followingList.map((u: any) => (
                    <div key={u.id} className="feed-following-item">
                      <Avatar size={36} src={u.avatar} icon={<UserOutlined />} />
                      <div className="feed-following-info">
                        <div className="feed-following-name">{u.name}</div>
                        {u.bio && <div className="feed-following-bio">{u.bio}</div>}
                      </div>
                      <Button
                        size="small"
                        className="feed-unfollow-btn"
                        loading={unfollowMutation.isPending}
                        onClick={() => unfollowMutation.mutate(u.id)}
                      >
                        取消关注
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

export default Feed

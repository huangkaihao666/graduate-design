import React, { useState } from 'react'
import { Avatar, Progress, Tabs, Tooltip } from 'antd'
import { TrophyOutlined, UserOutlined, RiseOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import * as achievementsApi from '@/api/achievements'
import type { Achievement } from '@/api/achievements'
import './Achievements.less'

const LEVEL_COLORS = [
  { min: 1,  max: 4,  label: '青铜', color: '#CD7F32', bg: '#FDF3E7' },
  { min: 5,  max: 9,  label: '白银', color: '#9CA3AF', bg: '#F3F4F6' },
  { min: 10, max: 19, label: '黄金', color: '#F59E0B', bg: '#FFFBEB' },
  { min: 20, max: 49, label: '铂金', color: '#6366F1', bg: '#EEF2FF' },
  { min: 50, max: 99, label: '钻石', color: '#8B5CF6', bg: '#F5F3FF' },
]

const getLevelInfo = (level: number) =>
  LEVEL_COLORS.find((l) => level >= l.min && level <= l.max) || LEVEL_COLORS[0]

const Achievements: React.FC = () => {
  const [tab, setTab] = useState('badges')

  const { data: myData, isLoading } = useQuery({
    queryKey: ['my-achievements'],
    queryFn: achievementsApi.getMyAchievements,
  })

  const { data: leaderboard, isLoading: lbLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: achievementsApi.getLeaderboard,
    enabled: tab === 'leaderboard',
  })

  const levelInfo = getLevelInfo(myData?.level ?? 1)
  const unlockedCount = myData?.achievements?.filter((a) => a.unlocked).length ?? 0
  const totalCount = myData?.achievements?.length ?? 0

  return (
    <div className="ach-page">
      <div className="ach-container">

        {/* ── 顶部：等级卡 ── */}
        <div className="ach-level-card" style={{ borderColor: levelInfo.color }}>
          {isLoading ? (
            <div className="ach-level-skeleton" />
          ) : (
            <>
              <div className="ach-level-left">
                <div className="ach-level-badge" style={{ background: levelInfo.color }}>
                  Lv.{myData?.level ?? 1}
                </div>
                <div className="ach-level-info">
                  <div className="ach-level-title" style={{ color: levelInfo.color }}>
                    {levelInfo.label}段位
                  </div>
                  <div className="ach-level-exp">
                    {myData?.exp ?? 0} / {myData?.nextLevelExp ?? 100} 经验
                  </div>
                  <div className="ach-level-unlocked">
                    已解锁 {unlockedCount} / {totalCount} 成就
                  </div>
                </div>
              </div>
              <div className="ach-level-right">
                <div className="ach-level-icon">🏆</div>
                <Progress
                  type="circle"
                  percent={myData?.progress ?? 0}
                  size={80}
                  strokeColor={levelInfo.color}
                  format={(p) => (
                    <span style={{ color: levelInfo.color, fontWeight: 700, fontSize: 14 }}>
                      {p}%
                    </span>
                  )}
                />
                <div className="ach-level-next">距下一级还差 {(myData?.nextLevelExp ?? 100) - (myData?.exp ?? 0)} 经验</div>
              </div>
            </>
          )}
        </div>

        {/* ── Tabs ── */}
        <Tabs
          activeKey={tab}
          onChange={setTab}
          className="ach-tabs"
          items={[
            {
              key: 'badges',
              label: (
                <span><TrophyOutlined /> 成就徽章</span>
              ),
              children: (
                <div className="ach-badges-grid">
                  {isLoading
                    ? Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="ach-badge-card ach-badge-skeleton" />
                      ))
                    : (myData?.achievements ?? []).map((a: Achievement) => (
                        <Tooltip
                          key={a.id}
                          title={
                            <div>
                              <div style={{ fontWeight: 700 }}>{a.name}</div>
                              <div style={{ fontSize: 12, marginTop: 4 }}>{a.description}</div>
                              <div style={{ fontSize: 11, color: '#ccc', marginTop: 4 }}>
                                解锁条件：{a.condition}
                              </div>
                              <div style={{ fontSize: 11, color: '#facc15', marginTop: 2 }}>
                                +{a.expReward} 经验
                              </div>
                            </div>
                          }
                        >
                          <div className={`ach-badge-card ${a.unlocked ? 'unlocked' : 'locked'}`}>
                            <div className="ach-badge-icon">{a.icon}</div>
                            <div className="ach-badge-name">{a.name}</div>
                            <div className="ach-badge-exp">+{a.expReward} exp</div>
                            {a.unlocked && <div className="ach-badge-check">✓</div>}
                          </div>
                        </Tooltip>
                      ))}
                </div>
              ),
            },
            {
              key: 'leaderboard',
              label: (
                <span><RiseOutlined /> 经验排行榜</span>
              ),
              children: (
                <div className="ach-leaderboard">
                  {lbLoading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="ach-lb-item ach-lb-skeleton" />
                      ))
                    : (leaderboard ?? []).map((entry) => {
                        const li = getLevelInfo(entry.level)
                        return (
                          <div
                            key={entry.id}
                            className={`ach-lb-item ${entry.rank <= 3 ? `rank-${entry.rank}` : ''}`}
                          >
                            <div className="ach-lb-rank">
                              {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : entry.rank}
                            </div>
                            <Avatar size={40} src={entry.avatar} icon={<UserOutlined />} />
                            <div className="ach-lb-info">
                              <div className="ach-lb-name">{entry.name}</div>
                              <div className="ach-lb-level" style={{ color: li.color }}>
                                {li.label} · Lv.{entry.level}
                              </div>
                            </div>
                            <div className="ach-lb-exp">
                              <span className="ach-lb-exp-num">{entry.exp}</span>
                              <span className="ach-lb-exp-label">经验</span>
                            </div>
                          </div>
                        )
                      })}
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  )
}

export default Achievements

import { httpClient } from './client'

export interface Achievement {
  id: number
  name: string
  description: string
  icon: string
  condition: string
  expReward: number
  unlocked?: boolean
}

export interface UserAchievements {
  exp: number
  level: number
  nextLevelExp: number
  currentLevelExp: number
  progress: number
  achievements: Achievement[]
}

export interface LeaderboardEntry {
  rank: number
  id: number
  name: string
  avatar?: string
  exp: number
  level: number
}

export const getMyAchievements = (): Promise<UserAchievements> =>
  httpClient.get('/achievements/me')

export const getUserAchievements = (userId: number): Promise<UserAchievements> =>
  httpClient.get(`/achievements/users/${userId}`)

export const getLeaderboard = (): Promise<LeaderboardEntry[]> =>
  httpClient.get('/achievements/leaderboard')

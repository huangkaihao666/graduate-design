import { httpClient } from './client'

export interface Tag {
  id: number
  name: string
  color: string
  weight: number
  _count?: { rooms: number }
}

export const getTags = (): Promise<Tag[]> => {
  return httpClient.get('/tags') as any
}

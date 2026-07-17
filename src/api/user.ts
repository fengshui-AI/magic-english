import { apiRequest } from './client'
import type { User } from '../types'

export interface UpdateUserInput {
  name?: string
  grade?: number
  ageSegment?: 'low' | 'mid' | 'high'
  avatarUrl?: string
}

export const userApi = {
  me: () => apiRequest<{ user: User }>('/users/me'),

  get: (id: string) => apiRequest<{ user: User }>(`/users/${id}`),

  update: (id: string, input: UpdateUserInput) =>
    apiRequest<{ user: User }>(`/users/${id}`, { method: 'PATCH', body: input }),
}

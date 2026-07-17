import { apiRequest } from './client'
import type { User } from '../types'

export interface AuthResponse {
  user: User
  token: string
}

export interface RegisterInput {
  name: string
  phone?: string
  role?: 'child' | 'parent'
  grade?: number
  ageSegment?: 'low' | 'mid' | 'high'
}

export interface LoginInput {
  phone: string
}

export const authApi = {
  register: (input: RegisterInput) =>
    apiRequest<AuthResponse>('/auth/register', { method: 'POST', body: input }),

  login: (input: LoginInput) =>
    apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: input }),

  me: () => apiRequest<{ user: User }>('/auth/me'),

  refresh: () => apiRequest<AuthResponse>('/auth/refresh', { method: 'POST' }),
}

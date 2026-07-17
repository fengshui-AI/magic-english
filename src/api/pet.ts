import { apiRequest } from './client'
import type { PetData } from '../stores/pet'

export interface CreatePetInput {
  name: string
  birthPlace: 'seaside' | 'forest' | 'stargrass' | 'flower' | 'valley'
  personality?: 'outgoing' | 'focused' | 'gentle' | 'curious' | 'quiet'
  specialty?: 'memory' | 'pronounce' | 'creative' | 'persistent' | 'balanced'
}

export interface UpdatePetInput {
  name?: string
  stage?: 'seed' | 'sprout' | 'bloom' | 'fruit'
  stageProgress?: number
  totalLearningMinutes?: number
}

export interface PetEvolution {
  id: string
  petId: string
  fromStage: string
  toStage: string
  triggeredAt: string
  totalMinutesAtTrigger: number
}

export const petApi = {
  /** 获取当前用户的豆豆 */
  mine: () => apiRequest<{ pet: PetData }>('/pets/mine'),

  create: (input: CreatePetInput) =>
    apiRequest<{ pet: PetData }>('/pets', { method: 'POST', body: input }),

  get: (id: string) => apiRequest<{ pet: PetData }>(`/pets/${id}`),

  update: (id: string, input: UpdatePetInput) =>
    apiRequest<{ pet: PetData }>(`/pets/${id}`, { method: 'PATCH', body: input }),

  stageHistory: (id: string) =>
    apiRequest<{ history: PetEvolution[] }>(`/pets/${id}/stage-history`),
}

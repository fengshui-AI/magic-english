import { describe, it, expect } from 'vitest'
import { registerSchema } from '../routes/auth.js'
import { createPetSchema, updatePetSchema, validatePetUpdatePayload } from '../routes/pets.js'

describe('Auth routes validation', () => {
  it('requires ageSegment for child registration', () => {
    const result = registerSchema.safeParse({
      name: '小明',
      role: 'child',
      grade: 3,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.ageSegment).toBeDefined()
    }
  })

  it('allows parent registration without ageSegment', () => {
    const result = registerSchema.safeParse({
      name: '爸爸',
      role: 'parent',
      grade: 3,
    })
    expect(result.success).toBe(true)
  })
})

describe('Pet routes validation', () => {
  it('accepts magic_garden alias and maps it to forest', () => {
    const result = createPetSchema.parse({
      name: '豆豆',
      birthPlace: 'magic_garden',
    })
    expect(result.birthPlace).toBe('forest')
  })

  it('rejects unknown birthPlace values', () => {
    const result = createPetSchema.safeParse({
      name: '豆豆',
      birthPlace: 'lava_cave',
    })
    expect(result.success).toBe(false)
  })

  it('does not allow birthPlace changes on update via strict schema', () => {
    const result = updatePetSchema.safeParse({
      birthPlace: 'forest',
    } as any)
    expect(result.success).toBe(false)
  })

  it('allows name change when pet is in seed stage', () => {
    const result = updatePetSchema.safeParse({
      name: '新豆豆',
    })
    expect(result.success).toBe(true)
    expect(validatePetUpdatePayload(result.data, { stage: 'seed' })).toBeNull()
  })

  it('disallows name change when pet is beyond seed stage', () => {
    const result = updatePetSchema.safeParse({
      name: '新豆豆',
    })
    expect(result.success).toBe(true)
    const error = validatePetUpdatePayload(result.data, { stage: 'sprout' })
    expect(error).toBe('Name may only be changed when the pet is in seed stage')
  })
})

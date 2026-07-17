import { reactive, computed } from 'vue'
import { authApi, setToken, clearToken } from '../api'
import type { User } from '../types'
import type { RegisterInput, LoginInput } from '../api/auth'

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
  error: string | null
}

export const authStore = reactive<AuthState>({
  user: null,
  token: localStorage.getItem('auth_token'),
  loading: false,
  error: null,
})

export const isLoggedIn = computed(() => !!authStore.token && !!authStore.user)

export async function register(input: RegisterInput) {
  authStore.loading = true
  authStore.error = null
  try {
    const res = await authApi.register(input)
    authStore.user = res.user
    authStore.token = res.token
    setToken(res.token)
    return res
  } catch (e: any) {
    authStore.error = e.message || 'Registration failed'
    throw e
  } finally {
    authStore.loading = false
  }
}

export async function login(input: LoginInput) {
  authStore.loading = true
  authStore.error = null
  try {
    const res = await authApi.login(input)
    authStore.user = res.user
    authStore.token = res.token
    setToken(res.token)
    return res
  } catch (e: any) {
    authStore.error = e.message || 'Login failed'
    throw e
  } finally {
    authStore.loading = false
  }
}

export async function fetchMe() {
  if (!authStore.token) return
  authStore.loading = true
  try {
    const res = await authApi.me()
    authStore.user = res.user
  } catch {
    // Token 过期，清除
    clearToken()
    authStore.token = null
    authStore.user = null
  } finally {
    authStore.loading = false
  }
}

export async function refreshToken() {
  if (!authStore.token) return
  try {
    const res = await authApi.refresh()
    authStore.user = res.user
    authStore.token = res.token
    setToken(res.token)
  } catch {
    clearToken()
    authStore.token = null
    authStore.user = null
  }
}

export function logout() {
  clearToken()
  authStore.user = null
  authStore.token = null
}

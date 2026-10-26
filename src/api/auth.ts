import { api } from './client'

export interface UserInfo {
  userId: string
  name: string
  group: string | null
  department: string | null
  access: string
  mustChangePassword: boolean
}

export interface LoginResponse {
  token: string
  expiresAt: string
  user: UserInfo
}

export const authApi = {
  login: (userId: string, password: string) => api.post<LoginResponse>('/api/auth/login', { userId, password }),
  me: () => api.get<UserInfo>('/api/auth/me'),
}

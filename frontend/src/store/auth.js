import { create } from 'zustand'
import { authAPI } from '../api/api'

export const useAuth = create((set) => ({
  user: null,
  token: localStorage.getItem('ecrm_token'),
  loading: false,

  login: async (email, password) => {
    set({ loading: true })
    try {
      const { data } = await authAPI.login(email, password)
      localStorage.setItem('ecrm_token', data.access_token)
      set({ token: data.access_token, user: data.user, loading: false })
      return { ok: true }
    } catch (e) {
      set({ loading: false })
      return { ok: false, error: e.response?.data?.detail || 'Login failed' }
    }
  },

  logout: async () => {
    try { await authAPI.logout() } catch {}
    localStorage.removeItem('ecrm_token')
    set({ user: null, token: null })
  },

  hydrate: async () => {
    try {
      const { data } = await authAPI.me()
      set({ user: data })
    } catch {
      localStorage.removeItem('ecrm_token')
      set({ user: null, token: null })
    }
  },
}))

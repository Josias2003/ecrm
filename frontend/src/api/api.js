import axios from 'axios'
import { API_CONFIG } from '../config'

const TOKEN_KEY = 'ecrm_token'

const client = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
})

client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  login: (email, password) => {
    // supports: login(email, password) and login({ email, password })
    if (typeof email === 'object' && email) return client.post('/api/auth/login', email)
    return client.post('/api/auth/login', { email, password })
  },
  me: () => client.get('/api/auth/me'),
  logout: () => client.post('/api/auth/logout'),
}

export const usersAPI = {
  list: (skip = 0, limit = 50) => client.get('/api/users', { params: { skip, limit } }),
  create: (data) => client.post('/api/users', data),
  update: (id, data) => client.patch(`/api/users/${id}`, data),
  delete: (id) => client.delete(`/api/users/${id}`),
}

export const schoolsAPI = {
  list: (params) => client.get('/api/schools', { params }),
  get: (id) => client.get(`/api/schools/${id}`),
  create: (data) => client.post('/api/schools', data),
  update: (id, data) => client.patch(`/api/schools/${id}`, data),
  delete: (id) => client.delete(`/api/schools/${id}`),
  verifyGPS: (id) => client.patch(`/api/schools/${id}/verify-gps`),
  exportCSV: (params) => client.get('/api/schools/export/csv', { params, responseType: 'blob' }),
  geojson: (params) => client.get('/api/schools/export/geojson', { params }),
}

export const teachersAPI = {
  list: (params) => client.get('/api/teachers', { params }),
  create: (data) => client.post('/api/teachers', data),
  update: (id, data) => client.patch(`/api/teachers/${id}`, data),
  delete: (id) => client.delete(`/api/teachers/${id}`),
  workload: (params) => client.get('/api/teachers/workload/analysis', { params }),
}

export const feedbackAPI = {
  list: (params) => client.get('/api/feedback', { params }),
  submit: (data) => client.post('/api/feedback', data),
  update: (id, data) => client.patch(`/api/feedback/${id}`, data),
}

export const alertsAPI = {
  list: (params) => client.get('/api/alerts', { params }),
  resolve: (id) => client.patch(`/api/alerts/${id}/resolve`),
}

export const analyticsAPI = {
  national: () => client.get('/api/analytics/national'),
  districts: () => client.get('/api/analytics/districts'),
  gaps: (params) => client.get('/api/analytics/resource-gaps', { params }),
  trends: (params) => client.get('/api/analytics/enrollment-trends', { params }),
  gisSummary: () => client.get('/api/analytics/gis-summary'),
  riskScores: (params) => client.get('/api/analytics/risk-scores', { params }),
}

export const logsAPI = {
  list: (params) => client.get('/api/logs', { params }),
}

export const enrollmentAPI = {
  get: (sid) => client.get(`/api/enrollment/${sid}`),
}

export default client

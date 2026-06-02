const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
}

export const THEME = {
  navy: '#0F172A',
  blue: '#2563EB',
  cyan: '#06B6D4',
  green: '#10B981',
  yellow: '#F59E0B',
  red: '#EF4444',
  purple: '#8B5CF6',
  border: '#E2E8F0',
  bg: '#F8FAFC',
  text: '#0F172A',
  text2: '#64748B',
}

export const ROLE_LABELS = {
  admin: 'System Admin',
  reb: 'REB Officer',
  district: 'District Officer',
  school: 'School Head',
  enumerator: 'Field Enumerator',
  community: 'Community Member',
}

export const STATUS_COLORS = {
  good: '#10B981',
  moderate: '#F59E0B',
  critical: '#EF4444',
}

import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { alertsAPI, feedbackAPI } from '../api/api'
import { PageHeader, Card, CardBody, Badge, Empty } from '../components/UI'
import SchoolEmptyState from '../components/SchoolEmptyState'
import { Bell, AlertTriangle, MessageSquare } from 'lucide-react'
import { formatLabel } from '../utils/format'

export default function NotificationsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const { data: alerts = [] } = useQuery({
    queryKey: ['notif-alerts', user?.school_id, user?.district, user?.role],
    queryFn: () => alertsAPI.list({
      school_id: user?.role === 'school' ? user.school_id : undefined,
      district: user?.role === 'district' ? user.district : undefined,
      resolved: false,
      limit: 50,
    }).then(r => r.data),
    enabled: ['school', 'district', 'reb'].includes(user?.role),
  })

  const { data: feedback = [] } = useQuery({
    queryKey: ['notif-feedback', user?.school_id],
    queryFn: () => feedbackAPI.list({ school_id: user?.school_id, limit: 30 }).then(r => r.data),
    enabled: user?.role === 'school' && !!user?.school_id,
  })

  if (user?.role === 'school' && !user?.school_id) {
    return (
      <div>
        <PageHeader title="Notifications" sub="All caught up!" />
        <SchoolEmptyState />
      </div>
    )
  }

  const recentFb = feedback.filter(f => ['reviewed', 'resolved', 'closed'].includes(f.status)).slice(0, 10)
  const items = [
    ...alerts.map(a => ({
      id: `alert-${a.id}`,
      type: 'alert',
      title: a.alert_type?.replace(/_/g, ' ') || 'Resource alert',
      sub: a.school_name || a.description?.slice(0, 80),
      date: a.created_at?.slice(0, 10),
      level: a.level,
      path: '/alerts',
    })),
    ...recentFb.map(f => ({
      id: `fb-${f.id}`,
      type: 'feedback',
      title: `Issue ${formatLabel(f.status)}`,
      sub: f.description?.slice(0, 80),
      date: f.created_at?.slice(0, 10),
      level: f.status === 'resolved' ? 'good' : 'moderate',
      path: '/feedback',
    })),
  ].sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  return (
    <div>
      <PageHeader
        title="Notifications"
        sub={items.length ? `${items.length} notification${items.length > 1 ? 's' : ''}` : 'All caught up!'}
      />

      <Card>
        <CardBody>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <Bell size={48} color="var(--text3)" strokeWidth={1.2} style={{ marginBottom: 16 }} />
              <Empty title="No notifications" desc="You're all caught up!" />
            </div>
          ) : (
            items.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.path)}
                style={{
                  display: 'flex', gap: 14, width: '100%', textAlign: 'left',
                  padding: '14px 0', border: 'none', borderBottom: '1px solid var(--border)',
                  background: 'transparent', cursor: 'pointer',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: item.type === 'alert' ? '#FEF2F2' : '#EFF6FF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {item.type === 'alert'
                    ? <AlertTriangle size={18} color="#EF4444" />
                    : <MessageSquare size={18} color="#2563EB" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3 }}>{item.sub}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{item.date}</div>
                </div>
                <Badge status={item.level === 'critical' ? 'critical' : item.level === 'good' ? 'good' : 'moderate'} label={formatLabel(item.level || 'info')} />
              </button>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  )
}

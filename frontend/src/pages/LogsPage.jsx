import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { logsAPI } from '../api/api'
import { PageHeader, Card, CardBody, Table, Select, Field, Badge } from '../components/UI'

const ACTION_TYPES = ['', 'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'FEEDBACK', 'RESOLVE', 'GPS_VERIFY', 'CHAT', 'SYSTEM']

export default function LogsPage() {
  const [actionType, setActionType] = useState('')

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs', actionType],
    queryFn: () => logsAPI.list({ limit: 100, action_type: actionType || undefined }).then(r => r.data),
  })

  return (
    <div>
      <PageHeader title="Audit Logs" sub="Who did what across the system" />
      <Card>
        <CardBody>
          <div style={{ maxWidth: 220, marginBottom: 16 }}>
            <Field label="Filter by action">
              <Select
                options={ACTION_TYPES.map(a => ({ value: a, label: a || 'All actions' }))}
                value={actionType}
                onChange={e => setActionType(e.target.value)}
              />
            </Field>
          </div>
          <Table
            loading={isLoading}
            columns={[
              { key: 'created_at', label: 'When', render: v => v?.replace('T', ' ').slice(0, 19) },
              { key: 'user_name', label: 'User', render: v => v || 'System' },
              { key: 'action_type', label: 'Action', render: v => <Badge status="reviewed" label={v} dot={false} /> },
              { key: 'description', label: 'Description' },
              { key: 'ip_address', label: 'IP', render: v => v || '—' },
            ]}
            data={logs}
            empty="No audit logs found"
          />
        </CardBody>
      </Card>
    </div>
  )
}

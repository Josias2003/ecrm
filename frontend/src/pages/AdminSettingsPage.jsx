import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsAPI } from '../api/api'
import { PageHeader, Card, CardBody, Field, Input, Btn, Alert } from '../components/UI'
import toast from 'react-hot-toast'

const apiErr = (e) => toast.error(
  typeof e?.response?.data?.detail === 'string' ? e.response.data.detail : 'Save failed'
)

export default function AdminSettingsPage() {
  const qc = useQueryClient()
  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => settingsAPI.list().then(r => r.data),
  })
  const [draft, setDraft] = useState({})

  const saveM = useMutation({
    mutationFn: ({ key, value }) => settingsAPI.update(key, { value }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system-settings'] })
      toast.success('Setting saved')
    },
    onError: apiErr,
  })

  const val = (key, fallback) => draft[key] ?? settings.find(s => s.key === key)?.value ?? fallback

  if (isLoading) return null

  return (
    <div>
      <PageHeader title="System Settings" sub="Platform configuration — changes are audited" />
      <Alert type="info">These settings control registration policy, password rules, and gap-analysis weights.</Alert>
      <Card style={{ marginTop: 16 }}>
        <CardBody>
          <div style={{ display: 'grid', gap: 16, maxWidth: 560 }}>
            {settings.map(s => (
              <div key={s.key} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
                <Field label={s.label || s.key}>
                  <Input value={val(s.key, s.value)} onChange={e => setDraft(p => ({ ...p, [s.key]: e.target.value }))} />
                </Field>
                <Btn size="sm" onClick={() => saveM.mutate({ key: s.key, value: val(s.key, s.value) })} disabled={saveM.isPending}>
                  Save
                </Btn>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersAPI, schoolsAPI } from '../api/api'
import { PageHeader, Card, CardBody, Table, Badge, Btn, Modal, Field, Input, Select, Alert } from '../components/UI'
import { DISTRICT_NAMES } from '../constants/rwandaDistricts'
import toast from 'react-hot-toast'

const ROLE_LABELS = {
  reb: 'REB Officer', district: 'District Officer', school: 'School Head',
  enumerator: 'Enumerator', community: 'Community',
}

const apiErr = (e) => toast.error(
  typeof e?.response?.data?.detail === 'string' ? e.response.data.detail : 'Action failed'
)

export default function RegistrationsPage() {
  const qc = useQueryClient()
  const [review, setReview] = useState(null)
  const [form, setForm] = useState({ role: '', district: '', school_id: '', rejection_reason: '' })

  const { data: pending = [], isLoading } = useQuery({
    queryKey: ['pending-registrations'],
    queryFn: () => usersAPI.pending().then(r => r.data),
  })

  const district = form.district || review?.district
  const { data: schools = [] } = useQuery({
    queryKey: ['reg-schools', district],
    queryFn: () => schoolsAPI.list({ district, limit: 500 }).then(r => r.data),
    enabled: Boolean(district) && form.role === 'school',
  })

  const approveM = useMutation({
    mutationFn: ({ id, data }) => usersAPI.approve(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pending-registrations'] })
      qc.invalidateQueries({ queryKey: ['users'] })
      setReview(null)
      toast.success('Registration approved')
    },
    onError: apiErr,
  })

  const rejectM = useMutation({
    mutationFn: ({ id, data }) => usersAPI.reject(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pending-registrations'] })
      setReview(null)
      toast.success('Registration rejected')
    },
    onError: apiErr,
  })

  function openReview(row) {
    setReview(row)
    setForm({
      role: row.role,
      district: row.district || 'Gasabo',
      school_id: row.school_id ? String(row.school_id) : '',
      rejection_reason: '',
    })
  }

  return (
    <div>
      <PageHeader
        title="Pending Registrations"
        sub={`${pending.length} account(s) awaiting administrator approval`}
      />

      {pending.length === 0 && !isLoading && (
        <Alert type="success">No pending registrations. New applications will appear here.</Alert>
      )}

      <Card>
        <CardBody>
          <Table loading={isLoading} columns={[
            { key: 'full_name', label: 'Applicant' },
            { key: 'email', label: 'Email' },
            { key: 'role', label: 'Role', render: v => <Badge status="info" label={ROLE_LABELS[v] || v} /> },
            { key: 'district', label: 'District', render: v => v || '—' },
            { key: 'phone', label: 'Phone', render: v => v || '—' },
            { key: 'created_at', label: 'Applied', render: v => v?.slice(0, 10) },
            { key: 'id', label: '', render: (v, row) => (
              <Btn size="sm" onClick={() => openReview(row)}>Review</Btn>
            )},
          ]} data={pending} />
        </CardBody>
      </Card>

      <Modal open={!!review} onClose={() => setReview(null)} title={`Review — ${review?.full_name}`} width={520}>
        {review && (
          <>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14 }}>
              {review.email} · requested {ROLE_LABELS[review.role] || review.role}
              {review.organization && ` · ${review.organization}`}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Approved role">
                <Select options={['reb', 'district', 'school', 'enumerator', 'community']} value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} />
              </Field>
              <Field label="District">
                <Select options={['National', ...DISTRICT_NAMES]} value={form.district} onChange={e => setForm(p => ({ ...p, district: e.target.value, school_id: '' }))} />
              </Field>
              {form.role === 'school' && (
                <Field label="School *" full>
                  <Select
                    options={[{ value: '', label: 'Select school…' }, ...schools.map(s => ({ value: String(s.id), label: s.name }))]}
                    value={form.school_id}
                    onChange={e => setForm(p => ({ ...p, school_id: e.target.value }))}
                  />
                </Field>
              )}
              <Field label="Rejection reason (if rejecting)" full>
                <Input value={form.rejection_reason} onChange={e => setForm(p => ({ ...p, rejection_reason: e.target.value }))} placeholder="Optional for approval" />
              </Field>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <Btn variant="outline" onClick={() => setReview(null)}>Cancel</Btn>
              <Btn variant="danger" onClick={() => rejectM.mutate({ id: review.id, data: { rejection_reason: form.rejection_reason || 'Not approved' } })} disabled={rejectM.isPending}>
                Reject
              </Btn>
              <Btn onClick={() => approveM.mutate({
                id: review.id,
                data: {
                  role: form.role,
                  district: form.district,
                  school_id: form.role === 'school' && form.school_id ? Number(form.school_id) : null,
                },
              })} disabled={approveM.isPending}>
                Approve
              </Btn>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}

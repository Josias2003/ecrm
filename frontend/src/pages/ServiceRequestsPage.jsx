import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { requestsAPI } from '../api/api'
import { useAuth } from '../store/auth'
import { PageHeader, Card, CardBody, Table, Badge, Btn, Modal, Field, Input, Select, Textarea } from '../components/UI'
import { canSubmitServiceRequest, canManageServiceRequests } from '../utils/permissions'
import toast from 'react-hot-toast'

const TYPES = [
  ['role_change', 'Role / assignment change'],
  ['school_assignment', 'School assignment fix'],
  ['account_unlock', 'Account unlock'],
  ['data_correction', 'Data correction'],
  ['other', 'Other'],
]

const apiErr = (e) => toast.error(
  typeof e?.response?.data?.detail === 'string' ? e.response.data.detail : 'Action failed'
)

export default function ServiceRequestsPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const isAdmin = canManageServiceRequests(user?.role)
  const canSubmit = canSubmitServiceRequest(user?.role)
  const [filter, setFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [noteRow, setNoteRow] = useState(null)
  const [form, setForm] = useState({ request_type: 'other', title: '', description: '' })
  const [adminNote, setAdminNote] = useState('')

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['service-requests', filter],
    queryFn: () => requestsAPI.list(filter ? { status: filter } : {}).then(r => r.data),
  })

  const createM = useMutation({
    mutationFn: d => requestsAPI.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-requests'] })
      setCreateOpen(false)
      setForm({ request_type: 'other', title: '', description: '' })
      toast.success('Request submitted')
    },
    onError: apiErr,
  })

  const updateM = useMutation({
    mutationFn: ({ id, data }) => requestsAPI.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-requests'] })
      setNoteRow(null)
      toast.success('Request updated')
    },
    onError: apiErr,
  })

  if (!isAdmin) {
    return (
      <div>
        <PageHeader title="Service Requests" sub="Contact the system administrator for account or data fixes"
          action={canSubmit ? <Btn onClick={() => setCreateOpen(true)}>+ New Request</Btn> : null} />
        <Card><CardBody>
          <Table columns={[
            { key: 'title', label: 'Title' },
            { key: 'request_type', label: 'Type' },
            { key: 'status', label: 'Status', render: v => <Badge status={v === 'pending' ? 'pending' : v === 'resolved' ? 'good' : 'reviewed'} label={v} /> },
            { key: 'created_at', label: 'Submitted', render: v => v?.slice(0, 10) },
          ]} data={rows} loading={isLoading} />
        </CardBody></Card>
        <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Submit Request">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Type"><Select options={TYPES.map(([v, l]) => ({ value: v, label: l }))} value={form.request_type} onChange={e => setForm(p => ({ ...p, request_type: e.target.value }))} /></Field>
            <Field label="Title"><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></Field>
            <Field label="Description"><Textarea rows={4} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></Field>
            <Btn onClick={() => createM.mutate(form)} disabled={createM.isPending}>Submit</Btn>
          </div>
        </Modal>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Service Requests" sub={`${rows.filter(r => r.status === 'pending').length} pending`} />
      <div style={{ marginBottom: 16 }}>
        <Select options={[['', 'All'], ['pending', 'Pending'], ['approved', 'Approved'], ['resolved', 'Resolved'], ['rejected', 'Rejected']]} value={filter} onChange={e => setFilter(e.target.value)} />
      </div>
      <Card><CardBody>
        <Table loading={isLoading} columns={[
          { key: 'title', label: 'Request' },
          { key: 'user_name', label: 'From', render: (v, row) => <div><strong>{v}</strong><div style={{ fontSize: 11, color: 'var(--text2)' }}>{row.user_email}</div></div> },
          { key: 'request_type', label: 'Type' },
          { key: 'status', label: 'Status', render: v => <Badge status={v === 'pending' ? 'pending' : v === 'resolved' ? 'good' : 'reviewed'} label={v} /> },
          { key: 'created_at', label: 'Date', render: v => v?.slice(0, 10) },
          { key: 'id', label: '', render: (v, row) => (
            <Btn size="sm" variant="outline" onClick={() => { setNoteRow(row); setAdminNote(row.admin_note || '') }}>Manage</Btn>
          )},
        ]} data={rows} />
      </CardBody></Card>

      <Modal open={!!noteRow} onClose={() => setNoteRow(null)} title={noteRow?.title}>
        {noteRow && (
          <>
            <p style={{ fontSize: 13, marginBottom: 12 }}>{noteRow.description}</p>
            <Field label="Admin note"><Textarea rows={3} value={adminNote} onChange={e => setAdminNote(e.target.value)} /></Field>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
              {['approved', 'resolved', 'rejected'].map(s => (
                <Btn key={s} size="sm" variant={s === 'rejected' ? 'danger' : 'outline'}
                  onClick={() => updateM.mutate({ id: noteRow.id, data: { status: s, admin_note: adminNote } })}>
                  {s}
                </Btn>
              ))}
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}

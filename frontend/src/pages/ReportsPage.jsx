import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reportsAPI, reportAssignmentsAPI, schoolsAPI } from '../api/api'
import { useAuth } from '../store/auth'
import { canAssignReportTasks } from '../utils/permissions'
import {
  PageHeader, Card, CardBody, Btn, Field, Input, Table, Select, Alert, StatCard, Textarea,
} from '../components/UI'
import {
  Download, FileText, Building2, Package, Scale, MapPin, MessageSquare, TrendingUp,
  Wifi, Droplets, Users, ClipboardList, Shield, Send, CheckCircle, Clock,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatColumnKey } from '../utils/format'

const CATEGORY_ICONS = {
  Overview: Building2,
  Connectivity: Wifi,
  Facilities: Building2,
  Resources: Package,
  Staffing: Users,
  'Field Mapping': MapPin,
  Accountability: MessageSquare,
  Platform: Shield,
}

const TYPE_ICONS = {
  enrollment_trends: TrendingUp,
  district_overview: Scale,
  gps_coverage: MapPin,
  no_internet: Wifi,
  no_water: Droplets,
}

function monthStart() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function statusLabel(status) {
  const map = {
    pending: 'Pending',
    in_progress: 'In Progress',
    submitted: 'Submitted',
    accepted: 'Accepted',
    rejected: 'Rejected',
  }
  return map[status] || formatColumnKey(status)
}

function ReportTasksPanel({ types, user }) {
  const qc = useQueryClient()
  const [tab, setTab] = useState('incoming')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    report_type: '',
    title: '',
    instructions: '',
    assigned_to_id: '',
    school_id: '',
    due_date: '',
    assignee_role: 'district',
  })

  const { data: incoming = [] } = useQuery({
    queryKey: ['report-assignments', 'incoming'],
    queryFn: () => reportAssignmentsAPI.list({ scope: 'incoming' }).then(r => r.data),
    enabled: !!user,
  })

  const { data: outgoing = [] } = useQuery({
    queryKey: ['report-assignments', 'outgoing'],
    queryFn: () => reportAssignmentsAPI.list({ scope: 'outgoing' }).then(r => r.data),
    enabled: canAssignReportTasks(user?.role),
  })

  const { data: assignees = [] } = useQuery({
    queryKey: ['report-assignees', form.assignee_role, form.school_id],
    queryFn: () => reportAssignmentsAPI.assignees({
      role_filter: form.assignee_role,
      school_id: form.school_id || undefined,
    }).then(r => r.data),
    enabled: showForm && canAssignReportTasks(user?.role),
  })

  const { data: schools = [] } = useQuery({
    queryKey: ['assign-schools'],
    queryFn: () => schoolsAPI.list({ limit: 500 }).then(r => r.data),
    enabled: showForm && user?.role === 'district',
  })

  const createMut = useMutation({
    mutationFn: (data) => reportAssignmentsAPI.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report-assignments'] })
      toast.success('Report task assigned')
      setShowForm(false)
      setForm(f => ({ ...f, title: '', instructions: '', assigned_to_id: '', school_id: '', due_date: '' }))
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Could not assign task'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => reportAssignmentsAPI.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report-assignments'] })
      toast.success('Task updated')
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Update failed'),
  })

  const assignableRoles = useMemo(() => {
    if (user?.role === 'reb') return [{ value: 'district', label: 'District Officer' }]
    if (user?.role === 'district') return [
      { value: 'school', label: 'School Head' },
      { value: 'enumerator', label: 'Field Enumerator' },
    ]
    if (user?.role === 'admin') return [
      { value: 'district', label: 'District Officer' },
      { value: 'school', label: 'School Head' },
      { value: 'enumerator', label: 'Field Enumerator' },
    ]
    return []
  }, [user?.role])

  const reportOptions = types.map(t => ({ value: t.type, label: t.label }))

  const submitAssign = () => {
    if (!form.report_type || !form.title.trim() || !form.assigned_to_id) {
      toast.error('Select report type, title, and assignee')
      return
    }
    createMut.mutate({
      report_type: form.report_type,
      title: form.title.trim(),
      instructions: form.instructions.trim() || undefined,
      assigned_to_id: Number(form.assigned_to_id),
      school_id: form.school_id ? Number(form.school_id) : undefined,
      due_date: form.due_date || undefined,
    })
  }

  const taskColumns = [
    { key: 'title', label: 'Task' },
    { key: 'report_label', label: 'Report Type' },
    { key: 'requested_by_name', label: 'Requested By' },
    { key: 'assigned_to_name', label: 'Assigned To' },
    { key: 'school_name', label: 'School' },
    { key: 'due_date', label: 'Due Date', render: v => v ? String(v).slice(0, 10) : '—' },
    { key: 'status', label: 'Status', render: v => statusLabel(v) },
    { key: 'actions', label: 'Actions', render: (_, row) => (
      <TaskActions row={row} user={user} onUpdate={(id, data) => updateMut.mutate({ id, data })} />
    ) },
  ]

  const rows = tab === 'incoming' ? incoming : outgoing

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <Btn variant={tab === 'incoming' ? 'primary' : 'outline'} onClick={() => setTab('incoming')}>
          <Clock size={14} /> Assigned to Me ({incoming.length})
        </Btn>
        {canAssignReportTasks(user?.role) && (
          <Btn variant={tab === 'outgoing' ? 'primary' : 'outline'} onClick={() => setTab('outgoing')}>
            <Send size={14} /> Sent by Me ({outgoing.length})
          </Btn>
        )}
        {canAssignReportTasks(user?.role) && (
          <Btn onClick={() => setShowForm(!showForm)} style={{ marginLeft: 'auto' }}>
            <ClipboardList size={14} /> Assign Report Task
          </Btn>
        )}
      </div>

      {showForm && canAssignReportTasks(user?.role) && (
        <Card style={{ marginBottom: 18 }}>
          <CardBody>
            <div style={{ fontWeight: 700, marginBottom: 14 }}>New Report Task</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              <Field label="Report to produce">
                <Select
                  options={[{ value: '', label: 'Select report…' }, ...reportOptions]}
                  value={form.report_type}
                  onChange={e => {
                    const t = types.find(x => x.type === e.target.value)
                    setForm(f => ({
                      ...f,
                      report_type: e.target.value,
                      title: t ? `Produce: ${t.label}` : f.title,
                    }))
                  }}
                />
              </Field>
              <Field label="Assignee role">
                <Select
                  options={assignableRoles}
                  value={form.assignee_role}
                  onChange={e => setForm(f => ({ ...f, assignee_role: e.target.value, assigned_to_id: '' }))}
                />
              </Field>
              {user?.role === 'district' && form.assignee_role === 'school' && (
                <Field label="School (optional)">
                  <Select
                    options={[
                      { value: '', label: 'Any head in district' },
                      ...schools.map(s => ({ value: String(s.id), label: s.name })),
                    ]}
                    value={form.school_id}
                    onChange={e => setForm(f => ({ ...f, school_id: e.target.value, assigned_to_id: '' }))}
                  />
                </Field>
              )}
              <Field label="Assign to">
                <Select
                  options={[
                    { value: '', label: 'Select person…' },
                    ...assignees.map(a => ({
                      value: String(a.id),
                      label: `${a.full_name} (${formatColumnKey(a.role)})`,
                    })),
                  ]}
                  value={form.assigned_to_id}
                  onChange={e => setForm(f => ({ ...f, assigned_to_id: e.target.value }))}
                />
              </Field>
              <Field label="Due date">
                <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
              </Field>
              <Field label="Task title" style={{ gridColumn: '1 / -1' }}>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Schools without internet — Gasabo" />
              </Field>
              <Field label="Instructions" style={{ gridColumn: '1 / -1' }}>
                <Textarea
                  rows={3}
                  value={form.instructions}
                  onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
                  placeholder="What should the assignee verify or submit before you export the report?"
                />
              </Field>
            </div>
            <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
              <Btn onClick={submitAssign} disabled={createMut.isPending}>Assign Task</Btn>
              <Btn variant="outline" onClick={() => setShowForm(false)}>Cancel</Btn>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody>
          <Table
            columns={taskColumns}
            data={rows}
            empty={tab === 'incoming' ? 'No report tasks assigned to you' : 'No report tasks sent yet'}
          />
        </CardBody>
      </Card>
    </div>
  )
}

function TaskActions({ row, user, onUpdate }) {
  const isAssignee = row.assigned_to_id === user?.id
  const isRequester = row.requested_by_id === user?.id
  const isAdmin = user?.role === 'admin'

  if (isAssignee && row.status === 'pending') {
    return <Btn size="sm" variant="outline" onClick={() => onUpdate(row.id, { status: 'in_progress' })}>Start</Btn>
  }
  if (isAssignee && ['pending', 'in_progress'].includes(row.status)) {
    return <Btn size="sm" onClick={() => onUpdate(row.id, { status: 'submitted', response_note: 'Data verified and submitted.' })}>Submit</Btn>
  }
  if ((isRequester || isAdmin) && row.status === 'submitted') {
    return (
      <div style={{ display: 'flex', gap: 6 }}>
        <Btn size="sm" onClick={() => onUpdate(row.id, { status: 'accepted' })}><CheckCircle size={12} /> Accept</Btn>
        <Btn size="sm" variant="outline" onClick={() => onUpdate(row.id, { status: 'rejected' })}>Reject</Btn>
      </div>
    )
  }
  return <span style={{ color: 'var(--text2)', fontSize: 12 }}>{statusLabel(row.status)}</span>
}

export default function ReportsPage() {
  const { user } = useAuth()
  const [pageTab, setPageTab] = useState('run')
  const [templateId, setTemplateId] = useState('')
  const [from, setFrom] = useState(monthStart())
  const [to, setTo] = useState(todayStr())
  const [preset, setPreset] = useState('this_month')
  const [activeCategory, setActiveCategory] = useState('')

  const { data: types = [], isLoading: typesLoading, isError: typesError } = useQuery({
    queryKey: ['report-types'],
    queryFn: () => reportsAPI.types().then(r => r.data),
    retry: 2,
  })

  const categories = useMemo(() => {
    const map = {}
    types.forEach(t => {
      const cat = t.category_label || 'Overview'
      if (!map[cat]) map[cat] = []
      map[cat].push(t)
    })
    return Object.entries(map)
  }, [types])

  useEffect(() => {
    if (!templateId && types.length) {
      setTemplateId(types[0].type)
      setActiveCategory(types[0].category_label || 'Overview')
    }
  }, [types, templateId])

  const activeType = types.find(t => t.type === templateId) || types[0]
  const type = activeType?.type || ''

  const { data: preview, isLoading: previewLoading, isError: previewError, error: previewErr } = useQuery({
    queryKey: ['report-preview', type, from, to],
    queryFn: () => reportsAPI.preview({ type, from_date: from, to_date: to }).then(r => r.data),
    enabled: !!type && pageTab === 'run',
    retry: 1,
  })

  const applyPreset = (p) => {
    setPreset(p)
    const now = new Date()
    if (p === 'this_month') {
      setFrom(monthStart())
      setTo(todayStr())
    } else if (p === 'last_month') {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const end = new Date(now.getFullYear(), now.getMonth(), 0)
      setFrom(lm.toISOString().slice(0, 10))
      setTo(end.toISOString().slice(0, 10))
    } else if (p === 'ytd') {
      setFrom(`${now.getFullYear()}-01-01`)
      setTo(todayStr())
    }
  }

  const downloadReport = async (format) => {
    if (!type) { toast.error('Select a report type'); return }
    const fmt = format === 'xlsx' ? 'xlsx' : 'pdf'
    const ext = fmt === 'xlsx' ? 'xlsx' : 'pdf'
    try {
      const r = await reportsAPI.export({ type, from_date: from, to_date: to, format: fmt })
      const url = URL.createObjectURL(r.data)
      const a = document.createElement('a')
      const label = (activeType?.label || type).replace(/\s+/g, '_')
      a.href = url
      a.download = `ECRM_${label}_${from}_${to}.${ext}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(fmt === 'xlsx' ? 'Excel report downloaded' : 'PDF report downloaded')
    } catch {
      toast.error(fmt === 'xlsx' ? 'Excel export failed' : 'PDF export failed')
    }
  }

  const columns = preview?.rows?.length
    ? Object.keys(preview.rows[0]).map(k => ({ key: k, label: k.includes('_') ? formatColumnKey(k) : k }))
    : []

  const filteredTypes = activeCategory
    ? types.filter(t => (t.category_label || 'Overview') === activeCategory)
    : types

  const showTasksTab = user?.role !== 'community'

  return (
    <div>
      <PageHeader
        title="Reports"
        sub="Criterion reports and assigned tasks — scoped to your role"
        action={
          pageTab === 'run' ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn onClick={() => downloadReport('pdf')} disabled={!type || previewLoading}>
                <Download size={15} /> PDF
              </Btn>
              <Btn variant="outline" onClick={() => downloadReport('xlsx')} disabled={!type || previewLoading}>
                <Download size={15} /> Excel
              </Btn>
            </div>
          ) : null
        }
      />

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <Btn variant={pageTab === 'run' ? 'primary' : 'outline'} onClick={() => setPageTab('run')}>
          <FileText size={14} /> Run Report
        </Btn>
        {showTasksTab && (
          <Btn variant={pageTab === 'tasks' ? 'primary' : 'outline'} onClick={() => setPageTab('tasks')}>
            <ClipboardList size={14} /> Report Tasks
          </Btn>
        )}
      </div>

      {pageTab === 'tasks' && <ReportTasksPanel types={types} user={user} />}

      {pageTab === 'run' && (
        <>
          {typesError && (
            <Alert type="danger">Could not load report types. Restart the backend API.</Alert>
          )}

          {categories.length > 1 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {categories.map(([cat]) => {
                const Icon = CATEGORY_ICONS[cat] || FileText
                const active = activeCategory === cat
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setActiveCategory(cat)
                      const first = types.find(t => t.category_label === cat)
                      if (first) setTemplateId(first.type)
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
                      border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                      background: active ? 'var(--primary-light, #EFF6FF)' : 'var(--card)',
                      fontWeight: active ? 600 : 500, fontSize: 13,
                    }}
                  >
                    <Icon size={14} /> {cat}
                  </button>
                )
              })}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 22 }}>
            {filteredTypes.map(tpl => {
              const Icon = TYPE_ICONS[tpl.type] || CATEGORY_ICONS[tpl.category_label] || FileText
              const active = templateId === tpl.type
              return (
                <button
                  key={tpl.type}
                  type="button"
                  onClick={() => setTemplateId(tpl.type)}
                  style={{
                    textAlign: 'left', padding: 20, borderRadius: 14,
                    border: `2px solid ${active ? '#2563EB' : 'var(--border)'}`,
                    background: active ? '#2563EB08' : 'var(--card)',
                    cursor: 'pointer', boxShadow: active ? 'var(--sh)' : 'var(--sh-sm)',
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, marginBottom: 14,
                    background: '#2563EB18', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={22} color="#2563EB" />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{tpl.label}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text2)', lineHeight: 1.5 }}>{tpl.description}</div>
                </button>
              )
            })}
          </div>

          {typesLoading && !types.length && (
            <Card style={{ marginBottom: 18 }}><CardBody>
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--text2)' }}>Loading report types…</div>
            </CardBody></Card>
          )}

          {!typesLoading && !types.length && (
            <Alert type="info">No report types available for your role.</Alert>
          )}

          <Card style={{ marginBottom: 18 }}>
            <CardBody>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto auto', gap: 14, alignItems: 'end' }}>
                <Field label="Period preset">
                  <Select
                    options={[
                      { value: 'this_month', label: 'This month' },
                      { value: 'last_month', label: 'Last month' },
                      { value: 'ytd', label: 'Year to date' },
                      { value: 'custom', label: 'Custom range' },
                    ]}
                    value={preset}
                    onChange={e => applyPreset(e.target.value)}
                  />
                </Field>
                <Field label="From">
                  <Input type="date" value={from} onChange={e => { setFrom(e.target.value); setPreset('custom') }} />
                </Field>
                <Field label="To">
                  <Input type="date" value={to} onChange={e => { setTo(e.target.value); setPreset('custom') }} />
                </Field>
                <Btn onClick={() => downloadReport('pdf')} disabled={!type || previewLoading} style={{ height: 42 }}>
                  <Download size={15} /> PDF
                </Btn>
                <Btn variant="outline" onClick={() => downloadReport('xlsx')} disabled={!type || previewLoading} style={{ height: 42 }}>
                  <Download size={15} /> Excel
                </Btn>
              </div>
              {activeType && activeType.dated === false && (
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 10 }}>
                  This report uses current registry data. Large reports export in landscape PDF or full Excel.
                </div>
              )}
            </CardBody>
          </Card>

          {previewLoading && (
            <Card><CardBody>
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>Generating preview…</div>
            </CardBody></Card>
          )}

          {previewError && (
            <Alert type="danger">
              Preview failed: {previewErr?.response?.data?.detail || 'Check API connection and try again.'}
            </Alert>
          )}

          {preview && !previewLoading && (
            <>
              {preview.insights?.length > 0 && (
                <Card style={{ marginBottom: 18 }}>
                  <CardBody>
                    <div style={{ fontWeight: 700, marginBottom: 10 }}>Insights</div>
                    <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text2)', fontSize: 13, lineHeight: 1.6 }}>
                      {preview.insights.map((line, i) => <li key={i}>{line}</li>)}
                    </ul>
                  </CardBody>
                </Card>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14, marginBottom: 18 }}>
                {Object.entries(preview.summary || {}).map(([k, v]) => (
                  <StatCard key={k} label={k} value={v} accent="blue" />
                ))}
              </div>

              <Card>
                <CardBody>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FileText size={16} /> {activeType?.label || preview.label}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
                        {preview.category_label && `${preview.category_label} · `}
                        Period: {preview.period_from} → {preview.period_to} · {preview.rows?.length || 0} records
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Btn variant="outline" onClick={() => downloadReport('pdf')}><Download size={15} /> PDF</Btn>
                      <Btn variant="outline" onClick={() => downloadReport('xlsx')}><Download size={15} /> Excel</Btn>
                    </div>
                  </div>
                  <Table
                    columns={columns}
                    data={preview.rows || []}
                    empty="No records for this scope"
                  />
                </CardBody>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  )
}

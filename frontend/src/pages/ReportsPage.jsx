import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsAPI } from '../api/api'
import { PageHeader, Card, CardBody, Btn, Field, Input, Table, Select, Alert, StatCard } from '../components/UI'
import { Download, FileText, Building2, Users, Package, Scale } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatColumnKey, formatLabel } from '../utils/format'

const TEMPLATES = [
  {
    type: 'schools_summary',
    title: 'Infrastructure Gap Report',
    description: 'Facility coverage, status breakdown, and infrastructure deficits by school.',
    icon: Building2,
    color: '#2563EB',
  },
  {
    type: 'district_overview',
    title: 'Teacher Deployment Summary',
    description: 'District staffing levels, pupil–teacher ratios, and deployment gaps.',
    icon: Users,
    color: '#10B981',
  },
  {
    type: 'alerts_summary',
    title: 'Resource Allocation Brief',
    description: 'Active resource alerts and shortage priorities for intervention planning.',
    icon: Package,
    color: '#F59E0B',
  },
  {
    type: 'district_overview',
    title: 'Equity Index Analysis',
    description: 'Regional comparison of school conditions and equity disparities.',
    icon: Scale,
    color: '#8B5CF6',
    alias: 'equity_index',
  },
]

function monthStart() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function todayStr() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

function templateKey(tpl) {
  return tpl.alias || tpl.type
}

export default function ReportsPage() {
  const [templateId, setTemplateId] = useState('')
  const [from, setFrom] = useState(monthStart())
  const [to, setTo] = useState(todayStr())
  const [preset, setPreset] = useState('this_month')

  const { data: types = [], isLoading: typesLoading, isError: typesError } = useQuery({
    queryKey: ['report-types'],
    queryFn: () => reportsAPI.types().then(r => r.data),
    retry: 2,
  })

  const allowedTypes = new Set(types.map(t => t.type))
  const visibleTemplates = TEMPLATES.filter(t => allowedTypes.has(t.type))

  useEffect(() => {
    if (!templateId && visibleTemplates.length) setTemplateId(templateKey(visibleTemplates[0]))
  }, [visibleTemplates, templateId])

  const activeTemplate = visibleTemplates.find(t => templateKey(t) === templateId) || visibleTemplates[0]
  const type = activeTemplate?.type || ''

  const { data: preview, isLoading: previewLoading, isError: previewError, error: previewErr } = useQuery({
    queryKey: ['report-preview', type, from, to],
    queryFn: () => reportsAPI.preview({ type, from_date: from, to_date: to }).then(r => r.data),
    enabled: !!type,
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

  const downloadPdf = async () => {
    if (!type) { toast.error('Select a report type'); return }
    try {
      const r = await reportsAPI.export({ type, from_date: from, to_date: to, format: 'pdf' })
      const url = URL.createObjectURL(r.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `ECRM_${type}_${from}_${to}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('PDF report downloaded')
    } catch {
      toast.error('PDF export failed — ensure the API server is running')
    }
  }

  const columns = preview?.rows?.length
    ? Object.keys(preview.rows[0]).map(k => ({ key: k, label: formatColumnKey(k) }))
    : []

  return (
    <div>
      <PageHeader
        title="Reports"
        sub="Decision-ready PDF reports scoped to your role and period"
        action={
          <Btn onClick={downloadPdf} disabled={!type || previewLoading}>
            <Download size={15} /> Download PDF
          </Btn>
        }
      />

      {typesError && (
        <div style={{ marginBottom: 16 }}>
          <Alert type="danger">
            Could not load report types. Restart the backend API (<code>uvicorn app.main:app --reload --port 8000</code>).
          </Alert>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 22 }}>
        {visibleTemplates.map(tpl => {
          const Icon = tpl.icon
          const active = templateId === templateKey(tpl)
          return (
            <button
              key={templateKey(tpl)}
              type="button"
              onClick={() => setTemplateId(templateKey(tpl))}
              style={{
                textAlign: 'left',
                padding: 20,
                borderRadius: 14,
                border: `2px solid ${active ? tpl.color : 'var(--border)'}`,
                background: active ? `${tpl.color}08` : 'var(--card)',
                cursor: 'pointer',
                boxShadow: active ? 'var(--sh)' : 'var(--sh-sm)',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12, marginBottom: 14,
                background: `${tpl.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={22} color={tpl.color} />
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{tpl.title}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text2)', lineHeight: 1.5 }}>{tpl.description}</div>
            </button>
          )
        })}
      </div>

      {typesLoading && !visibleTemplates.length && (
        <Card style={{ marginBottom: 18 }}><CardBody>
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--text2)' }}>Loading report templates...</div>
        </CardBody></Card>
      )}

      {!typesLoading && !visibleTemplates.length && (
        <Alert type="info">No report templates available for your role.</Alert>
      )}

      <Card style={{ marginBottom: 18 }}>
        <CardBody>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14, alignItems: 'end' }}>
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
            <Btn onClick={downloadPdf} disabled={!type || previewLoading} style={{ height: 42 }}>
              <Download size={15} /> Export PDF
            </Btn>
          </div>
        </CardBody>
      </Card>

      {previewLoading && (
        <Card><CardBody>
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>Generating preview...</div>
        </CardBody></Card>
      )}

      {previewError && (
        <Alert type="danger">
          Preview failed: {previewErr?.response?.data?.detail || 'Check API connection and try again.'}
        </Alert>
      )}

      {preview && !previewLoading && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14, marginBottom: 18 }}>
            {Object.entries(preview.summary || {}).map(([k, v]) => (
              <StatCard key={k} label={formatColumnKey(k)} value={v} accent="blue" />
            ))}
          </div>

          <Card>
            <CardBody>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={16} /> {activeTemplate?.title || preview.label || formatLabel(preview.type)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
                    Period: {preview.period_from} → {preview.period_to} · {preview.rows?.length || 0} records
                  </div>
                </div>
                <Btn variant="outline" onClick={downloadPdf}><Download size={15} /> PDF</Btn>
              </div>
              <Table
                columns={columns}
                data={preview.rows || []}
                empty="No records for this period and scope"
              />
            </CardBody>
          </Card>
        </>
      )}
    </div>
  )
}

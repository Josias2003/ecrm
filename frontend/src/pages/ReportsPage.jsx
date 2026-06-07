import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsAPI } from '../api/api'
import { PageHeader, Card, CardBody, Btn, Field, Input, Table, Select, Alert, StatCard } from '../components/UI'
import { Download, FileText, Lightbulb } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatColumnKey, formatLabel } from '../utils/format'

function monthStart() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function todayStr() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

export default function ReportsPage() {
  const [type, setType] = useState('')
  const [from, setFrom] = useState(monthStart())
  const [to, setTo] = useState(todayStr())
  const [preset, setPreset] = useState('this_month')

  const { data: types = [], isLoading: typesLoading, isError: typesError } = useQuery({
    queryKey: ['report-types'],
    queryFn: () => reportsAPI.types().then(r => r.data),
    retry: 2,
  })

  useEffect(() => {
    if (!type && types.length) setType(types[0].type)
  }, [types, type])

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

  const selectedMeta = types.find(t => t.type === type)

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

      <Card style={{ marginBottom: 18 }}>
        <CardBody>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 14, alignItems: 'end' }}>
            <Field label="Report type">
              <Select
                options={typesLoading
                  ? [{ value: '', label: 'Loading...' }]
                  : types.length
                    ? types.map(t => ({ value: t.type, label: t.label }))
                    : [{ value: '', label: 'No reports for your role' }]}
                value={type}
                onChange={e => setType(e.target.value)}
                disabled={typesLoading || !types.length}
              />
              {selectedMeta?.description && (
                <span style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4, display: 'block' }}>
                  {selectedMeta.description}
                </span>
              )}
            </Field>
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

          {preview.insights?.length > 0 && (
            <Card style={{ marginBottom: 18 }}>
              <CardBody>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Lightbulb size={18} color="var(--amber)" />
                  <span style={{ fontWeight: 700, fontSize: 14 }}>Executive Insights</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--text2)', fontSize: 13.5, lineHeight: 1.8 }}>
                  {preview.insights.map((line, i) => <li key={i}>{line}</li>)}
                </ul>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardBody>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={16} /> {preview.label || formatLabel(preview.type)}
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

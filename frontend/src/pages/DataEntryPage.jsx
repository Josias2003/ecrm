import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../store/auth'
import { schoolsAPI } from '../api/api'
import { PageHeader, Card, CardBody, CardHeader, Btn, Field, Input, Textarea, Alert, Tabs } from '../components/UI'
import SchoolEmptyState from '../components/SchoolEmptyState'
import { School, ClipboardList, Users, Package, BookOpen, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'

const COLLECTIONS = [
  { id: 'survey', label: 'School Survey', sub: 'Enrollment & staffing', icon: School, path: '/schools', color: '#2563EB' },
  { id: 'infra', label: 'Infrastructure Audit', sub: 'Facilities checklist', icon: ClipboardList, path: '/schools', color: '#10B981' },
  { id: 'teachers', label: 'Teacher Census', sub: 'Staff roster update', icon: Users, path: '/teachers', color: '#8B5CF6' },
  { id: 'resources', label: 'Resource Inventory', sub: 'Books, desks, labs', icon: Package, path: '/resources', color: '#F59E0B' },
  { id: 'enrollment', label: 'Enrollment Update', sub: 'Student counts', icon: BookOpen, path: null, color: '#06B6D4' },
]

export default function DataEntryPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab] = useState('new')
  const [activeForm, setActiveForm] = useState(null)
  const [gpsStatus, setGpsStatus] = useState('')
  const [form, setForm] = useState({ students_boys: '', students_girls: '', teachers_male: '', teachers_female: '', notes: '' })

  const { data: school, isLoading } = useQuery({
    queryKey: ['data-entry-school', user?.school_id],
    queryFn: () => schoolsAPI.get(user.school_id).then(r => r.data),
    enabled: !!user?.school_id,
  })

  const saveM = useMutation({
    mutationFn: d => schoolsAPI.update(user.school_id, d),
    onSuccess: () => {
      qc.invalidateQueries(['data-entry-school'])
      qc.invalidateQueries(['school', user?.school_id])
      toast.success('Data saved and synced')
      setActiveForm(null)
    },
    onError: e => toast.error(e.response?.data?.detail || 'Save failed'),
  })

  const captureGps = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported')
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGpsStatus(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`)
        toast.success('GPS captured')
      },
      () => toast.error('Could not capture location — allow browser permission'),
    )
  }

  const submitEnrollment = () => {
    const payload = {
      students_boys: Number(form.students_boys) || 0,
      students_girls: Number(form.students_girls) || 0,
      teachers_male: Number(form.teachers_male) || 0,
      teachers_female: Number(form.teachers_female) || 0,
    }
    if (gpsStatus) {
      const [lat, lng] = gpsStatus.split(',').map(s => parseFloat(s.trim()))
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        payload.latitude = lat
        payload.longitude = lng
        payload.gps_verified = true
      }
    }
    saveM.mutate(payload)
  }

  if (!user?.school_id) {
    return (
      <div>
        <PageHeader title="Data Collection" sub="Collect and sync field data" />
        <SchoolEmptyState />
      </div>
    )
  }

  if (isLoading) {
    return <PageHeader title="Data Collection" sub="Loading..." />
  }

  return (
    <div>
      <PageHeader
        title="Data Collection"
        sub="Collect and sync field data"
        action={<span style={{ fontSize: 12, fontWeight: 600, color: '#10B981', background: '#ECFDF5', padding: '6px 12px', borderRadius: 20 }}>● Online</span>}
      />

      <Alert type="info" style={{ marginBottom: 18 }}>
        Changes save directly to the database when you submit. Offline draft sync is not enabled in this version.
      </Alert>

      <Tabs
        tabs={[{ id: 'new', label: 'New Collection' }, { id: 'history', label: 'Collection History (0)' }]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'history' && (
        <Card><CardBody>
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>No collection history yet</div>
        </CardBody></Card>
      )}

      {tab === 'new' && !activeForm && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {COLLECTIONS.map(col => {
            const Icon = col.icon
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => col.path ? navigate(col.path) : setActiveForm('enrollment')}
                style={{
                  textAlign: 'left', padding: 22, borderRadius: 14, border: '1px solid var(--border)',
                  background: 'var(--card)', cursor: 'pointer', boxShadow: 'var(--sh-sm)',
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12, marginBottom: 14,
                  background: `${col.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={22} color={col.color} />
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{col.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>Start new collection</div>
              </button>
            )
          })}
        </div>
      )}

      {tab === 'new' && activeForm === 'enrollment' && (
        <Card>
          <CardHeader
            title="Enrollment Update"
            action={<Btn variant="outline" size="sm" onClick={() => setActiveForm(null)}>Cancel</Btn>}
          />
          <CardBody>
            <Alert type="warning" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <span><strong>{gpsStatus ? 'Location captured' : 'Location not captured'}</strong> — {school?.name}</span>
                <Btn size="sm" variant="outline" onClick={captureGps}><MapPin size={14} /> Capture GPS</Btn>
              </div>
            </Alert>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Total male students"><Input type="number" value={form.students_boys} onChange={e => setForm(p => ({ ...p, students_boys: e.target.value }))} /></Field>
              <Field label="Total female students"><Input type="number" value={form.students_girls} onChange={e => setForm(p => ({ ...p, students_girls: e.target.value }))} /></Field>
              <Field label="Male teachers"><Input type="number" value={form.teachers_male} onChange={e => setForm(p => ({ ...p, teachers_male: e.target.value }))} /></Field>
              <Field label="Female teachers"><Input type="number" value={form.teachers_female} onChange={e => setForm(p => ({ ...p, teachers_female: e.target.value }))} /></Field>
              <Field label="Additional notes" full><Textarea rows={3} placeholder="Any additional observations..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></Field>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <Btn variant="outline" onClick={() => setActiveForm(null)}>Cancel</Btn>
              <Btn onClick={submitEnrollment} disabled={saveM.isPending}>{saveM.isPending ? 'Saving...' : 'Submit & Sync'}</Btn>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}

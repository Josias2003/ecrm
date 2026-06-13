import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../store/auth'
import { schoolsAPI, teachersAPI, dataEntryAPI } from '../api/api'
import { PageHeader, Card, CardBody, CardHeader, Btn, Field, Input, Textarea, Alert, Tabs, Table, Checkbox, Select } from '../components/UI'
import SchoolEmptyState from '../components/SchoolEmptyState'
import { School, ClipboardList, Users, Package, BookOpen, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatLabel } from '../utils/format'

const COLLECTIONS = [
  { id: 'survey', label: 'School Survey', sub: 'Enrollment & staffing', icon: School, color: '#2563EB' },
  { id: 'infra', label: 'Infrastructure Audit', sub: 'Facilities checklist', icon: ClipboardList, color: '#10B981' },
  { id: 'teachers', label: 'Teacher Census', sub: 'Add staff record', icon: Users, color: '#8B5CF6' },
  { id: 'resources', label: 'Resource Inventory', sub: 'Books, desks, rooms', icon: Package, color: '#F59E0B' },
  { id: 'enrollment', label: 'Enrollment Update', sub: 'Student counts & GPS', icon: BookOpen, color: '#06B6D4' },
]

const TYPE_LABELS = Object.fromEntries(COLLECTIONS.map(c => [c.id, c.label]))

const EMPTY_TEACHER = {
  full_name: '', gender: 'Male', subject: '', qualification: 'A2', employment_type: 'Permanent',
}

export default function DataEntryPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [tab, setTab] = useState('new')
  const [activeForm, setActiveForm] = useState(null)
  const [notes, setNotes] = useState('')
  const [gpsStatus, setGpsStatus] = useState('')

  const [survey, setSurvey] = useState({
    students_boys: '', students_girls: '', teachers_male: '', teachers_female: '',
    classrooms: '', classrooms_good: '',
  })
  const [infra, setInfra] = useState({
    classrooms: '', classrooms_good: '', toilets_boys: '', toilets_girls: '',
    has_library: false, has_ict_lab: false, has_science_lab: false,
    has_water: false, has_electricity: false, has_internet: false,
    has_fence: false, has_canteen: false,
  })
  const [resources, setResources] = useState({ textbooks: '', desks: '', classrooms: '' })
  const [enrollment, setEnrollment] = useState({
    students_boys: '', students_girls: '', teachers_male: '', teachers_female: '',
  })
  const [teacherForm, setTeacherForm] = useState(EMPTY_TEACHER)

  const schoolId = user?.school_id

  const { data: school, isLoading } = useQuery({
    queryKey: ['data-entry-school', schoolId],
    queryFn: () => schoolsAPI.get(schoolId).then(r => r.data),
    enabled: !!schoolId,
  })

  const { data: history = [] } = useQuery({
    queryKey: ['data-entry-history', schoolId],
    queryFn: () => dataEntryAPI.list({ school_id: schoolId }).then(r => r.data),
    enabled: !!schoolId,
  })

  const invalidate = () => {
    qc.invalidateQueries(['data-entry-school', schoolId])
    qc.invalidateQueries(['data-entry-history', schoolId])
    qc.invalidateQueries(['school', schoolId])
    qc.invalidateQueries(['history', schoolId])
  }

  const saveSchoolM = useMutation({
    mutationFn: async ({ type, payload, note }) => {
      await schoolsAPI.update(schoolId, payload)
      await dataEntryAPI.record({ school_id: schoolId, collection_type: type, notes: note || undefined })
    },
    onSuccess: () => {
      invalidate()
      toast.success('Saved and recorded in collection history')
      setActiveForm(null)
      setNotes('')
    },
    onError: e => toast.error(e.response?.data?.detail || 'Save failed'),
  })

  const addTeacherM = useMutation({
    mutationFn: async ({ teacher, note }) => {
      await teachersAPI.create({ ...teacher, school_id: schoolId })
      await dataEntryAPI.record({ school_id: schoolId, collection_type: 'teachers', notes: note || undefined })
    },
    onSuccess: () => {
      invalidate()
      qc.invalidateQueries(['teachers', schoolId])
      toast.success('Teacher added and recorded')
      setTeacherForm(EMPTY_TEACHER)
      setNotes('')
      setActiveForm(null)
    },
    onError: e => toast.error(e.response?.data?.detail || 'Could not add teacher'),
  })

  const loadFromSchool = (type) => {
    if (!school) return
    if (type === 'survey') {
      setSurvey({
        students_boys: String(school.students_boys ?? ''),
        students_girls: String(school.students_girls ?? ''),
        teachers_male: String(school.teachers_male ?? ''),
        teachers_female: String(school.teachers_female ?? ''),
        classrooms: String(school.classrooms ?? ''),
        classrooms_good: String(school.classrooms_good ?? ''),
      })
    }
    if (type === 'infra') {
      setInfra({
        classrooms: String(school.classrooms ?? ''),
        classrooms_good: String(school.classrooms_good ?? ''),
        toilets_boys: String(school.toilets_boys ?? ''),
        toilets_girls: String(school.toilets_girls ?? ''),
        has_library: !!school.has_library,
        has_ict_lab: !!school.has_ict_lab,
        has_science_lab: !!school.has_science_lab,
        has_water: !!school.has_water,
        has_electricity: !!school.has_electricity,
        has_internet: !!school.has_internet,
        has_fence: !!school.has_fence,
        has_canteen: !!school.has_canteen,
      })
    }
    if (type === 'resources') {
      setResources({
        textbooks: String(school.textbooks ?? ''),
        desks: String(school.desks ?? ''),
        classrooms: String(school.classrooms ?? ''),
      })
    }
    if (type === 'enrollment') {
      setEnrollment({
        students_boys: String(school.students_boys ?? ''),
        students_girls: String(school.students_girls ?? ''),
        teachers_male: String(school.teachers_male ?? ''),
        teachers_female: String(school.teachers_female ?? ''),
      })
    }
  }

  const openForm = (id) => {
    setActiveForm(id)
    loadFromSchool(id)
    setNotes('')
  }

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
      () => toast.error('Could not capture location'),
    )
  }

  const num = (v) => Number(v) || 0

  const submitSurvey = () => {
    saveSchoolM.mutate({
      type: 'survey',
      note: notes,
      payload: {
        students_boys: num(survey.students_boys),
        students_girls: num(survey.students_girls),
        teachers_male: num(survey.teachers_male),
        teachers_female: num(survey.teachers_female),
        classrooms: num(survey.classrooms),
        classrooms_good: num(survey.classrooms_good),
      },
    })
  }

  const submitInfra = () => {
    saveSchoolM.mutate({
      type: 'infra',
      note: notes,
      payload: {
        classrooms: num(infra.classrooms),
        classrooms_good: num(infra.classrooms_good),
        toilets_boys: num(infra.toilets_boys),
        toilets_girls: num(infra.toilets_girls),
        has_library: infra.has_library,
        has_ict_lab: infra.has_ict_lab,
        has_science_lab: infra.has_science_lab,
        has_water: infra.has_water,
        has_electricity: infra.has_electricity,
        has_internet: infra.has_internet,
        has_fence: infra.has_fence,
        has_canteen: infra.has_canteen,
      },
    })
  }

  const submitResources = () => {
    saveSchoolM.mutate({
      type: 'resources',
      note: notes,
      payload: {
        textbooks: num(resources.textbooks),
        desks: num(resources.desks),
        classrooms: num(resources.classrooms),
      },
    })
  }

  const submitEnrollment = () => {
    const payload = {
      students_boys: num(enrollment.students_boys),
      students_girls: num(enrollment.students_girls),
      teachers_male: num(enrollment.teachers_male),
      teachers_female: num(enrollment.teachers_female),
    }
    if (gpsStatus) {
      const [lat, lng] = gpsStatus.split(',').map(s => parseFloat(s.trim()))
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        payload.latitude = lat
        payload.longitude = lng
        payload.gps_verified = true
      }
    }
    saveSchoolM.mutate({ type: 'enrollment', note: notes, payload })
  }

  const submitTeacher = () => {
    if (!teacherForm.full_name.trim()) {
      toast.error('Teacher name is required')
      return
    }
    addTeacherM.mutate({
      teacher: {
        full_name: teacherForm.full_name.trim(),
        gender: teacherForm.gender,
        subject: teacherForm.subject.trim() || 'General',
        qualification: teacherForm.qualification,
        employment_type: teacherForm.employment_type,
        join_year: new Date().getFullYear(),
        status: 'Active',
      },
      note: notes,
    })
  }

  const pending = saveSchoolM.isPending || addTeacherM.isPending

  if (!schoolId) {
    return (
      <div>
        <PageHeader title="Data Entry" sub="Collect and sync field data for your school" />
        <SchoolEmptyState />
      </div>
    )
  }

  if (isLoading) return <PageHeader title="Data Entry" sub="Loading..." />

  return (
    <div>
      <PageHeader
        title="Data Entry"
        sub={`${school?.name} — submit updates that save to the database and collection history`}
      />

      <Tabs
        tabs={[
          { id: 'new', label: 'New Collection' },
          { id: 'history', label: `Collection History (${history.length})` },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'history' && (
        <Card>
          <CardBody>
            {history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>
                No collections yet. Submit a form under New Collection.
              </div>
            ) : (
              <Table
                columns={[
                  { key: 'created_at', label: 'Date', render: v => v?.slice(0, 16).replace('T', ' ') },
                  { key: 'collection_type', label: 'Type', render: v => TYPE_LABELS[v] || formatLabel(v) },
                  { key: 'user_name', label: 'Submitted by' },
                  { key: 'notes', label: 'Notes', render: v => v || '—' },
                ]}
                data={history}
              />
            )}
          </CardBody>
        </Card>
      )}

      {tab === 'new' && !activeForm && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {COLLECTIONS.map(col => {
            const Icon = col.icon
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => openForm(col.id)}
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
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>{col.sub}</div>
              </button>
            )
          })}
        </div>
      )}

      {tab === 'new' && activeForm && (
        <Card>
          <CardHeader
            title={TYPE_LABELS[activeForm]}
            action={<Btn variant="outline" size="sm" onClick={() => setActiveForm(null)}>Back</Btn>}
          />
          <CardBody>
            <Field label="Collection notes" full>
              <Textarea rows={2} placeholder="Optional observations for this submission..." value={notes} onChange={e => setNotes(e.target.value)} />
            </Field>

            {activeForm === 'survey' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 16 }}>
                <Field label="Male students"><Input type="number" value={survey.students_boys} onChange={e => setSurvey(p => ({ ...p, students_boys: e.target.value }))} /></Field>
                <Field label="Female students"><Input type="number" value={survey.students_girls} onChange={e => setSurvey(p => ({ ...p, students_girls: e.target.value }))} /></Field>
                <Field label="Male teachers"><Input type="number" value={survey.teachers_male} onChange={e => setSurvey(p => ({ ...p, teachers_male: e.target.value }))} /></Field>
                <Field label="Female teachers"><Input type="number" value={survey.teachers_female} onChange={e => setSurvey(p => ({ ...p, teachers_female: e.target.value }))} /></Field>
                <Field label="Classrooms total"><Input type="number" value={survey.classrooms} onChange={e => setSurvey(p => ({ ...p, classrooms: e.target.value }))} /></Field>
                <Field label="Usable classrooms"><Input type="number" value={survey.classrooms_good} onChange={e => setSurvey(p => ({ ...p, classrooms_good: e.target.value }))} /></Field>
              </div>
            )}

            {activeForm === 'infra' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 16 }}>
                  <Field label="Classrooms"><Input type="number" value={infra.classrooms} onChange={e => setInfra(p => ({ ...p, classrooms: e.target.value }))} /></Field>
                  <Field label="Usable classrooms"><Input type="number" value={infra.classrooms_good} onChange={e => setInfra(p => ({ ...p, classrooms_good: e.target.value }))} /></Field>
                  <Field label="Toilets (boys)"><Input type="number" value={infra.toilets_boys} onChange={e => setInfra(p => ({ ...p, toilets_boys: e.target.value }))} /></Field>
                  <Field label="Toilets (girls)"><Input type="number" value={infra.toilets_girls} onChange={e => setInfra(p => ({ ...p, toilets_girls: e.target.value }))} /></Field>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 14 }}>
                  {[['Library', 'has_library'], ['ICT Lab', 'has_ict_lab'], ['Science Lab', 'has_science_lab'],
                    ['Water', 'has_water'], ['Electricity', 'has_electricity'], ['Internet', 'has_internet'],
                    ['Fence', 'has_fence'], ['Canteen', 'has_canteen']].map(([l, k]) => (
                    <Checkbox key={k} label={l} checked={infra[k]} onChange={e => setInfra(p => ({ ...p, [k]: e.target.checked }))} />
                  ))}
                </div>
              </>
            )}

            {activeForm === 'resources' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 16 }}>
                <Field label="Textbooks"><Input type="number" value={resources.textbooks} onChange={e => setResources(p => ({ ...p, textbooks: e.target.value }))} /></Field>
                <Field label="Desks"><Input type="number" value={resources.desks} onChange={e => setResources(p => ({ ...p, desks: e.target.value }))} /></Field>
                <Field label="Classrooms"><Input type="number" value={resources.classrooms} onChange={e => setResources(p => ({ ...p, classrooms: e.target.value }))} /></Field>
              </div>
            )}

            {activeForm === 'enrollment' && (
              <>
                <Alert type="info" style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <span>{gpsStatus ? `GPS: ${gpsStatus}` : 'GPS not captured'}</span>
                    <Btn size="sm" variant="outline" onClick={captureGps}><MapPin size={14} /> Capture GPS</Btn>
                  </div>
                </Alert>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
                  <Field label="Male students"><Input type="number" value={enrollment.students_boys} onChange={e => setEnrollment(p => ({ ...p, students_boys: e.target.value }))} /></Field>
                  <Field label="Female students"><Input type="number" value={enrollment.students_girls} onChange={e => setEnrollment(p => ({ ...p, students_girls: e.target.value }))} /></Field>
                  <Field label="Male teachers"><Input type="number" value={enrollment.teachers_male} onChange={e => setEnrollment(p => ({ ...p, teachers_male: e.target.value }))} /></Field>
                  <Field label="Female teachers"><Input type="number" value={enrollment.teachers_female} onChange={e => setEnrollment(p => ({ ...p, teachers_female: e.target.value }))} /></Field>
                </div>
              </>
            )}

            {activeForm === 'teachers' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 16 }}>
                <Field label="Full name *"><Input value={teacherForm.full_name} onChange={e => setTeacherForm(p => ({ ...p, full_name: e.target.value }))} /></Field>
                <Field label="Gender"><Select options={['Male', 'Female']} value={teacherForm.gender} onChange={e => setTeacherForm(p => ({ ...p, gender: e.target.value }))} /></Field>
                <Field label="Subject"><Input value={teacherForm.subject} onChange={e => setTeacherForm(p => ({ ...p, subject: e.target.value }))} /></Field>
                <Field label="Qualification"><Select options={['A0', 'A1', 'A2', 'Bachelor', 'Master']} value={teacherForm.qualification} onChange={e => setTeacherForm(p => ({ ...p, qualification: e.target.value }))} /></Field>
                <Field label="Contract"><Select options={['Permanent', 'Contract', 'Volunteer']} value={teacherForm.employment_type} onChange={e => setTeacherForm(p => ({ ...p, employment_type: e.target.value }))} /></Field>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
              <Btn variant="outline" onClick={() => setActiveForm(null)}>Cancel</Btn>
              <Btn
                onClick={() => {
                  if (activeForm === 'survey') submitSurvey()
                  else if (activeForm === 'infra') submitInfra()
                  else if (activeForm === 'resources') submitResources()
                  else if (activeForm === 'enrollment') submitEnrollment()
                  else if (activeForm === 'teachers') submitTeacher()
                }}
                disabled={pending}
              >
                {pending ? 'Saving...' : 'Submit & record'}
              </Btn>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}

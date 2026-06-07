import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersAPI, schoolsAPI } from '../api/api'
import {
  Card, CardBody, Badge, Btn, StatCard, Alert, Table,
  Modal, Field, Input, Select, Tabs, PageHeader,
} from '../components/UI'
import { DISTRICT_NAMES } from '../constants/rwandaDistricts'
import { Users, School, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'

const apiErr = (e) => toast.error(
  typeof e?.response?.data?.detail === 'string'
    ? e.response.data.detail
    : 'Action failed — ensure the API server is running'
)

const ROLES = ['admin', 'reb', 'district', 'school', 'enumerator', 'community']
const ROLE_LABELS = {
  admin: 'System Admin',
  reb: 'REB Officer',
  district: 'District Officer',
  school: 'School Head',
  enumerator: 'Enumerator',
  community: 'Community',
}
const roleColors = {
  admin: 'critical', reb: 'reviewed', district: 'pending',
  school: 'good', enumerator: 'info', community: 'moderate',
}

const EMPTY_FORM = {
  full_name: '',
  email: '',
  password: '',
  role: 'district',
  district: 'Gasabo',
  school_id: '',
  is_active: true,
}

function genPassword() {
  const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function roleNeedsDistrict(role) {
  return ['district', 'enumerator', 'school'].includes(role)
}

function roleNeedsSchool(role) {
  return role === 'school'
}

function defaultDistrictForRole(role) {
  if (['admin', 'reb'].includes(role)) return 'National'
  return 'Gasabo'
}

function buildPayload(form) {
  const payload = {
    full_name: form.full_name.trim(),
    email: form.email.trim(),
    role: form.role,
    is_active: form.is_active,
  }
  if (form.password) payload.password = form.password
  if (['admin', 'reb'].includes(form.role)) {
    payload.district = 'National'
    payload.school_id = null
  } else if (form.role === 'community') {
    payload.district = form.district && form.district !== 'National' ? form.district : null
    payload.school_id = null
  } else if (form.role === 'school') {
    payload.district = form.district
    payload.school_id = form.school_id ? Number(form.school_id) : null
  } else {
    payload.district = form.district
    payload.school_id = null
  }
  return payload
}

function assignmentSummary(form, schoolName) {
  const parts = [ROLE_LABELS[form.role] || form.role]
  if (['admin', 'reb'].includes(form.role)) parts.push('National scope')
  else if (form.role === 'community') {
    parts.push(form.district && form.district !== 'National' ? form.district : 'No district filter')
  } else {
    parts.push(form.district)
    if (form.role === 'school' && schoolName) parts.push(schoolName)
  }
  return parts.join(' · ')
}

export default function UsersPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('users')
  const [filterRole, setFilterRole] = useState('')
  const [filterDistrict, setFilterDistrict] = useState('')
  const [filterActive, setFilterActive] = useState('')
  const [filterUnassigned, setFilterUnassigned] = useState(false)

  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editUser, setEditUser] = useState(null)
  const [editForm, setEditForm] = useState(null)

  const listParams = useMemo(() => {
    const p = {}
    if (filterRole) p.role = filterRole
    if (filterDistrict) p.district = filterDistrict
    if (filterActive !== '') p.is_active = filterActive === 'active'
    if (filterUnassigned) p.unassigned = true
    return p
  }, [filterRole, filterDistrict, filterActive, filterUnassigned])

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users', listParams],
    queryFn: () => usersAPI.list(0, 500, listParams).then(r => r.data),
  })

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users-all'],
    queryFn: () => usersAPI.list(0, 500).then(r => r.data),
  })

  const { data: gaps } = useQuery({
    queryKey: ['user-assignment-gaps'],
    queryFn: () => usersAPI.assignmentGaps().then(r => r.data),
  })

  const assignmentDistrict = wizardOpen
    ? (roleNeedsDistrict(form.role) ? form.district : '')
    : (editForm && roleNeedsDistrict(editForm.role) ? editForm.district : '')

  const { data: schools = [] } = useQuery({
    queryKey: ['admin-schools-pick', assignmentDistrict],
    queryFn: () => schoolsAPI.list({ district: assignmentDistrict, limit: 500 }).then(r => r.data),
    enabled: Boolean(assignmentDistrict) && assignmentDistrict !== 'National',
  })

  const schoolOptions = useMemo(
    () => schools.map(s => ({
      value: String(s.id),
      label: `${s.name} (${s.school_code || `SCH-${String(s.id).padStart(3, '0')}`})`,
    })),
    [schools],
  )

  const selectedSchoolName = useMemo(() => {
    const id = form.school_id || editForm?.school_id
    if (!id) return null
    const s = schools.find(x => String(x.id) === String(id))
    return s?.name || users.find(u => String(u.school_id) === String(id))?.school_name
  }, [form.school_id, editForm?.school_id, schools, users])

  const createM = useMutation({
    mutationFn: d => usersAPI.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['user-assignment-gaps'] })
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      closeWizard()
      toast.success('User provisioned')
    },
    onError: apiErr,
  })

  const updateM = useMutation({
    mutationFn: ({ id, data }) => usersAPI.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['user-assignment-gaps'] })
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      setEditUser(null)
      setEditForm(null)
      toast.success('User updated')
    },
    onError: apiErr,
  })

  const togM = useMutation({
    mutationFn: ({ id, active }) => usersAPI.update(id, { is_active: active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['user-assignment-gaps'] })
      toast.success('User status updated')
    },
    onError: apiErr,
  })

  const setF = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))
  const setE = (k) => (e) => setEditForm(p => ({ ...p, [k]: e.target.value }))

  function closeWizard() {
    setWizardOpen(false)
    setWizardStep(1)
    setForm(EMPTY_FORM)
  }

  function openWizard(preset = {}) {
    const role = preset.role || 'district'
    setForm({
      ...EMPTY_FORM,
      ...preset,
      role,
      district: preset.district || defaultDistrictForRole(role),
      school_id: preset.school_id != null ? String(preset.school_id) : '',
      password: preset.password || genPassword(),
    })
    setWizardStep(1)
    setWizardOpen(true)
    setTab('users')
  }

  function openEdit(row) {
    setEditUser(row)
    setEditForm({
      full_name: row.full_name,
      email: row.email,
      password: '',
      role: row.role,
      district: row.district || defaultDistrictForRole(row.role),
      school_id: row.school_id ? String(row.school_id) : '',
      is_active: row.is_active,
    })
  }

  useEffect(() => {
    if (!wizardOpen) return
    if (['admin', 'reb'].includes(form.role)) {
      setForm(p => ({ ...p, district: 'National', school_id: '' }))
    } else if (form.role === 'community') {
      setForm(p => ({ ...p, school_id: '' }))
    } else if (!roleNeedsSchool(form.role)) {
      setForm(p => ({ ...p, school_id: '' }))
    }
  }, [form.role, wizardOpen])

  useEffect(() => {
    if (!editUser || !editForm) return
    if (['admin', 'reb'].includes(editForm.role)) {
      setEditForm(p => ({ ...p, district: 'National', school_id: '' }))
    } else if (editForm.role === 'community') {
      setEditForm(p => ({ ...p, school_id: '' }))
    } else if (!roleNeedsSchool(editForm.role)) {
      setEditForm(p => ({ ...p, school_id: '' }))
    }
  }, [editForm?.role, editUser])

  function wizardNext() {
    if (wizardStep === 1) {
      if (!form.full_name.trim() || !form.email.trim() || form.password.length < 8) {
        toast.error('Name, email, and password (min 8 chars) are required')
        return
      }
    }
    if (wizardStep === 3) {
      if (roleNeedsDistrict(form.role) && (!form.district || form.district === 'National')) {
        toast.error('Select a district for this role')
        return
      }
      if (roleNeedsSchool(form.role) && !form.school_id) {
        toast.error('School Head must be linked to a school')
        return
      }
    }
    if (wizardStep < 4) setWizardStep(s => s + 1)
    else createM.mutate(buildPayload(form))
  }

  function renderAssignmentFields(target, setter, values) {
    const role = values.role
    if (['admin', 'reb'].includes(role)) {
      return (
        <Alert type="info">
          <strong>{ROLE_LABELS[role]}</strong> operates at national scope. No district or school assignment.
        </Alert>
      )
    }
    if (role === 'community') {
      return (
        <Field label="Home district (optional)">
          <Select
            options={['', ...DISTRICT_NAMES]}
            value={values.district === 'National' ? '' : (values.district || '')}
            onChange={e => setter === 'wizard'
              ? setForm(p => ({ ...p, district: e.target.value }))
              : setEditForm(p => ({ ...p, district: e.target.value }))}
          />
          <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 6 }}>
            Optional — limits map and feedback to a local area.
          </div>
        </Field>
      )
    }
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="District *">
          <Select
            options={DISTRICT_NAMES}
            value={values.district}
            onChange={e => {
              const d = e.target.value
              if (setter === 'wizard') setForm(p => ({ ...p, district: d, school_id: '' }))
              else setEditForm(p => ({ ...p, district: d, school_id: '' }))
            }}
          />
        </Field>
        {roleNeedsSchool(role) && (
          <Field label="School *">
            <Select
              options={[{ value: '', label: 'Select school…' }, ...schoolOptions]}
              value={values.school_id}
              onChange={e => setter === 'wizard'
                ? setForm(p => ({ ...p, school_id: e.target.value }))
                : setEditForm(p => ({ ...p, school_id: e.target.value }))}
              disabled={!values.district || values.district === 'National'}
            />
            {schoolOptions.length > 0 && values.school_id && (
              <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 6 }}>
                {schoolOptions.find(o => o.value === String(values.school_id))?.label}
              </div>
            )}
            {!schoolOptions.length && values.district && (
              <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 6 }}>No schools in this district</div>
            )}
          </Field>
        )}
      </div>
    )
  }

  const activeCount = users.filter(u => u.is_active).length
  const inactiveCount = users.length - activeCount

  return (
    <div>
      <PageHeader
        title="User Management"
        sub="Provision accounts and assign district / school scope"
        action={<Btn onClick={() => openWizard()}>+ Provision User</Btn>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        <StatCard label="Total Users" value={users.length} sub="All roles" accent="blue" icon={Users} />
        <StatCard label="Active" value={activeCount} sub="Can sign in" accent="green" />
        <StatCard label="Schools w/o Head" value={gaps?.unassigned_school_count ?? '—'} sub="Assignment gap" accent="amber" icon={School} />
        <StatCard label="Districts w/o Officer" value={gaps?.unassigned_district_count ?? '—'} sub="Assignment gap" accent="red" icon={MapPin} trend="down" />
      </div>

      <Tabs
        tabs={[
          { id: 'users', label: 'All Users' },
          { id: 'gaps', label: `Assignment Gaps${gaps ? ` (${gaps.unassigned_school_count + gaps.unassigned_district_count + gaps.incomplete_user_count})` : ''}` },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'users' && (
        <>
          <Card style={{ marginBottom: 16 }}>
            <CardBody>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
                <Field label="Role">
                  <Select options={['', ...ROLES]} value={filterRole} onChange={e => setFilterRole(e.target.value)} />
                </Field>
                <Field label="District">
                  <Select options={['', 'National', ...DISTRICT_NAMES]} value={filterDistrict} onChange={e => setFilterDistrict(e.target.value)} />
                </Field>
                <Field label="Status">
                  <Select options={[['', 'All'], ['active', 'Active'], ['inactive', 'Inactive']]} value={filterActive} onChange={e => setFilterActive(e.target.value)} />
                </Field>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, paddingBottom: 8 }}>
                  <input type="checkbox" checked={filterUnassigned} onChange={e => setFilterUnassigned(e.target.checked)} />
                  Incomplete assignment only
                </label>
                <Btn variant="outline" size="sm" onClick={() => { setFilterRole(''); setFilterDistrict(''); setFilterActive(''); setFilterUnassigned(false) }}>
                  Clear filters
                </Btn>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Table loading={isLoading} columns={[
                { key: 'full_name', label: 'User', render: (v, row) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                      background: 'linear-gradient(135deg,#2563EB,#06B6D4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: '#fff',
                    }}>
                      {v?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <strong>{v}</strong>
                      <div style={{ fontSize: 11, color: 'var(--text2)' }}>{row.email}</div>
                    </div>
                  </div>
                )},
                { key: 'role', label: 'Role', render: v => <Badge status={roleColors[v] || 'info'} label={ROLE_LABELS[v] || v} /> },
                { key: 'district', label: 'District', render: v => v || '—' },
                { key: 'school_name', label: 'School', render: (v, row) => {
                  if (row.role !== 'school') return '—'
                  if (!v && !row.school_id) return <Badge status="critical" label="Unassigned" />
                  return v || `ID ${row.school_id}`
                }},
                { key: 'is_active', label: 'Status', render: v => <Badge status={v ? 'good' : 'critical'} label={v ? 'Active' : 'Inactive'} /> },
                { key: 'created_at', label: 'Created', render: v => v?.slice(0, 10) },
                { key: 'id', label: 'Actions', render: (v, row) => (
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    <Btn size="sm" variant="outline" onClick={() => openEdit(row)}>Edit</Btn>
                    <Btn size="sm" variant="outline" onClick={() => togM.mutate({ id: v, active: !row.is_active })}>
                      {row.is_active ? 'Deactivate' : 'Activate'}
                    </Btn>
                  </div>
                )},
              ]} data={users} />
            </CardBody>
          </Card>
        </>
      )}

      {tab === 'gaps' && (
        <div style={{ display: 'grid', gap: 16 }}>
          {(gaps?.incomplete_user_count > 0) && (
            <Alert type="warning">
              {gaps.incomplete_user_count} active user(s) have incomplete assignments. Fix via Edit or deactivate.
            </Alert>
          )}

          <Card>
            <CardBody>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <strong>Schools without an active School Head</strong>
                <Badge status="warning" label={`${gaps?.unassigned_school_count ?? 0} schools`} />
              </div>
              <Table columns={[
                { key: 'school_code', label: 'Code' },
                { key: 'name', label: 'School' },
                { key: 'district', label: 'District' },
                { key: 'id', label: '', render: (v, row) => (
                  <Btn size="sm" onClick={() => openWizard({ role: 'school', district: row.district, school_id: v })}>
                    Assign Head
                  </Btn>
                )},
              ]} data={(gaps?.unassigned_schools || []).slice(0, 50)} empty="All schools have an active head" />
              {(gaps?.unassigned_school_count > 50) && (
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 8 }}>Showing first 50 of {gaps.unassigned_school_count}</div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <strong>Districts without an active District Officer</strong>
                <Badge status="critical" label={`${gaps?.unassigned_district_count ?? 0} districts`} />
              </div>
              <Table columns={[
                { key: 'district', label: 'District', render: v => v },
                { key: 'action', label: '', render: (_, row) => (
                  <Btn size="sm" onClick={() => openWizard({ role: 'district', district: row.district })}>Assign Officer</Btn>
                )},
              ]} data={(gaps?.unassigned_districts || []).map(d => ({ district: d }))} empty="All districts have an active officer" />
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <strong style={{ display: 'block', marginBottom: 12 }}>Users with incomplete assignments</strong>
              <Table columns={[
                { key: 'full_name', label: 'User' },
                { key: 'role', label: 'Role', render: v => ROLE_LABELS[v] || v },
                { key: 'issue', label: 'Issue' },
                { key: 'id', label: '', render: v => (
                  <Btn size="sm" variant="outline" onClick={() => {
                    const u = allUsers.find(x => x.id === v)
                    if (u) openEdit(u)
                  }}>Fix</Btn>
                )},
              ]} data={gaps?.incomplete_users || []} empty="No incomplete assignments" />
            </CardBody>
          </Card>
        </div>
      )}

      {/* Provision wizard */}
      <Modal open={wizardOpen} onClose={closeWizard} title={`Provision User — Step ${wizardStep} of 4`}>
        <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
          {[1, 2, 3, 4].map(s => (
            <div key={s} style={{
              flex: 1, height: 4, borderRadius: 4,
              background: wizardStep >= s ? 'var(--blue)' : 'var(--border)',
            }} />
          ))}
        </div>

        {wizardStep === 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Full Name *"><Input value={form.full_name} onChange={setF('full_name')} placeholder="e.g. Uwimana Alice" /></Field>
            <Field label="Email *"><Input type="email" value={form.email} onChange={setF('email')} placeholder="name@reb.rw" /></Field>
            <Field label="Temporary Password *">
              <div style={{ display: 'flex', gap: 8 }}>
                <Input type="text" value={form.password} onChange={setF('password')} style={{ flex: 1 }} />
                <Btn variant="outline" onClick={() => setForm(p => ({ ...p, password: genPassword() }))}>Generate</Btn>
              </div>
            </Field>
            <Field label="Active on create">
              <Select options={[['true', 'Yes — can sign in'], ['false', 'No — inactive']]} value={String(form.is_active)} onChange={e => setForm(p => ({ ...p, is_active: e.target.value === 'true' }))} />
            </Field>
          </div>
        )}

        {wizardStep === 2 && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14 }}>Official roles are provisioned by admin only. Assignment fields appear in the next step.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {ROLES.map(r => (
                <button key={r} type="button" onClick={() => setForm(p => ({ ...p, role: r, district: defaultDistrictForRole(r) }))}
                  style={{
                    padding: '14px 16px', borderRadius: 10, textAlign: 'left', cursor: 'pointer',
                    border: form.role === r ? '2px solid var(--blue)' : '1px solid var(--border)',
                    background: form.role === r ? 'var(--blue-lt)' : 'var(--card)',
                  }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{ROLE_LABELS[r]}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>
                    {r === 'school' && 'Requires one school'}
                    {r === 'district' && 'One district scope'}
                    {r === 'enumerator' && 'Field data in one district'}
                    {r === 'reb' && 'National read scope'}
                    {r === 'admin' && 'System operations only'}
                    {r === 'community' && 'Optional local district'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {wizardStep === 3 && renderAssignmentFields('wizard', 'wizard', form)}

        {wizardStep === 4 && (
          <div style={{ fontSize: 14, lineHeight: 1.7 }}>
            <p><strong>{form.full_name}</strong> · {form.email}</p>
            <p>{assignmentSummary(form, selectedSchoolName)}</p>
            <p style={{ color: 'var(--text2)' }}>Status: {form.is_active ? 'Active' : 'Inactive'} · Password set (share securely)</p>
            <Alert type="info">User must sign in on the landing page with these credentials. Scope is enforced by role.</Alert>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <Btn variant="outline" onClick={closeWizard}>Cancel</Btn>
          {wizardStep > 1 && <Btn variant="outline" onClick={() => setWizardStep(s => s - 1)}>Back</Btn>}
          <Btn onClick={wizardNext} disabled={createM.isPending}>
            {wizardStep < 4 ? 'Next' : (createM.isPending ? 'Creating...' : 'Create User')}
          </Btn>
        </div>
      </Modal>

      {/* Edit / reassign */}
      <Modal open={!!editUser} onClose={() => { setEditUser(null); setEditForm(null) }} title={`Edit User — ${editUser?.full_name}`}>
        {editForm && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Full Name"><Input value={editForm.full_name} onChange={setE('full_name')} /></Field>
              <Field label="Email"><Input type="email" value={editForm.email} onChange={setE('email')} /></Field>
              <Field label="New Password (optional)"><Input type="password" value={editForm.password} onChange={setE('password')} placeholder="Leave blank to keep" /></Field>
              <Field label="Role">
                <Select options={ROLES} value={editForm.role} onChange={setE('role')} />
              </Field>
            </div>
            <div style={{ marginTop: 14 }}>{renderAssignmentFields('edit', 'edit', editForm)}</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <Btn variant="outline" onClick={() => { setEditUser(null); setEditForm(null) }}>Cancel</Btn>
              <Btn onClick={() => updateM.mutate({ id: editUser.id, data: buildPayload(editForm) })} disabled={updateM.isPending}>
                {updateM.isPending ? 'Saving...' : 'Save Changes'}
              </Btn>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}

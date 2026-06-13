import { useState } from 'react'
import { useAuth } from '../store/auth'
import { authAPI } from '../api/api'
import { PageHeader, Card, CardBody, Field, Input, Btn, Badge } from '../components/UI'
import toast from 'react-hot-toast'

const ROLE_LABELS = {
  admin: 'System Administrator', reb: 'REB Officer', district: 'District Officer',
  school: 'School Head', enumerator: 'Field Enumerator', community: 'Community Member',
}

export default function ProfilePage() {
  const { user, hydrate } = useAuth()
  const [name, setName] = useState(user?.full_name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [organization, setOrganization] = useState(user?.organization || '')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [saving, setSaving] = useState(false)

  const saveProfile = async () => {
    if (!name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    try {
      await authAPI.updateProfile({
        full_name: name.trim(),
        phone: phone.trim() || null,
        organization: organization.trim() || null,
      })
      await hydrate()
      toast.success('Profile updated')
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Update failed')
    } finally { setSaving(false) }
  }

  const changePassword = async () => {
    if (newPw.length < 8) { toast.error('New password must be at least 8 characters'); return }
    if (newPw !== confirmPw) { toast.error('Passwords do not match'); return }
    setSaving(true)
    try {
      await authAPI.changePassword({ current_password: currentPw, new_password: newPw })
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
      toast.success('Password changed')
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Password change failed')
    } finally { setSaving(false) }
  }

  return (
    <div>
      <PageHeader title="Profile" sub="Your account information" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <Card>
          <CardBody>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 20 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: 'linear-gradient(135deg,#3B82F6,#06B6D4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800, fontSize: 18,
              }}>
                {user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{user?.full_name}</div>
                <div style={{ fontSize: 13, color: 'var(--text2)' }}>{user?.email}</div>
                <div style={{ marginTop: 8 }}><Badge status="reviewed" label={ROLE_LABELS[user?.role] || user?.role} /></div>
              </div>
            </div>
            <Field label="Full name">
              <Input value={name} onChange={e => setName(e.target.value)} />
            </Field>
            <Field label="Phone">
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+250 7XX XXX XXX" />
            </Field>
            <Field label="Organization">
              <Input value={organization} onChange={e => setOrganization(e.target.value)} placeholder="School or institution" />
            </Field>
            <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text2)' }}>
              District: <strong>{user?.district || 'National'}</strong>
            </div>
            <div style={{ marginTop: 20 }}>
              <Btn onClick={saveProfile} disabled={saving}>{saving ? 'Saving...' : 'Save Profile'}</Btn>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div style={{ fontWeight: 700, marginBottom: 16 }}>Change Password</div>
            <Field label="Current password">
              <Input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} />
            </Field>
            <Field label="New password">
              <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} />
            </Field>
            <Field label="Confirm new password">
              <Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} />
            </Field>
            <div style={{ marginTop: 20 }}>
              <Btn onClick={changePassword} disabled={saving}>{saving ? 'Saving...' : 'Change Password'}</Btn>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

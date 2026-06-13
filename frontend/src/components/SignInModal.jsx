import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { authAPI } from '../api/api'
import { Modal, Btn, Input, Field, Select } from './UI'
import { DISTRICT_NAMES } from '../constants/rwandaDistricts'
import toast from 'react-hot-toast'

const DEMOS = [
  { role: 'admin', label: 'System Admin', email: 'admin@reb.rw', pass: 'Admin@1234' },
  { role: 'reb', label: 'REB Officer', email: 'uwase@mineduc.gov.rw', pass: 'Reb@1234' },
  { role: 'district', label: 'District Officer', email: 'eric@gasabo.gov.rw', pass: 'District@1' },
  { role: 'school', label: 'School Head', email: 'paul@school.rw', pass: 'School@1234' },
  { role: 'enumerator', label: 'Enumerator', email: 'rose@reb.rw', pass: 'Field@1234' },
  { role: 'community', label: 'Community', email: 'david@gmail.com', pass: 'Comm@1234' },
]

const REGISTER_ROLES = ['reb', 'district', 'school', 'enumerator', 'community']

export default function SignInModal({ open, onClose, initialMode = 'login' }) {
  const { login, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selected, setSelected] = useState(null)
  const [mode, setMode] = useState(initialMode)
  const [resetStep, setResetStep] = useState(1)
  const [otp, setOtp] = useState('')
  const [newPass, setNewPass] = useState('')
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [regLoading, setRegLoading] = useState(false)
  const [regForm, setRegForm] = useState({
    full_name: '', email: '', password: '', role: 'community',
    phone: '', organization: '', district: '', school_id: '',
  })

  useEffect(() => {
    if (open) setMode(initialMode)
  }, [open, initialMode])

  const pick = (d) => { setSelected(d.role); setEmail(d.email); setPassword(d.pass) }

  const handleClose = () => {
    setMode('login')
    setResetStep(1)
    onClose()
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!email || !password) { toast.error('Enter email and password'); return }
    const r = await login(email, password)
    if (r.ok) {
      toast.success('Welcome back!')
      handleClose()
      navigate('/dashboard')
    } else toast.error(r.error)
  }

  const submitRegister = async (e) => {
    e.preventDefault()
    setRegLoading(true)
    try {
      const payload = {
        full_name: regForm.full_name.trim(),
        email: regForm.email.trim(),
        password: regForm.password,
        role: regForm.role,
        phone: regForm.phone || undefined,
        organization: regForm.organization || undefined,
        district: regForm.district || undefined,
        school_id: regForm.role === 'school' && regForm.school_id ? Number(regForm.school_id) : undefined,
      }
      const r = await authAPI.register(payload)
      toast.success(r.data?.message || 'Registration submitted')
      setMode('login')
      setEmail(regForm.email)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    } finally {
      setRegLoading(false)
    }
  }

  const requestOtp = async (e) => {
    e.preventDefault()
    if (!resetEmail.trim()) { toast.error('Enter your email'); return }
    setResetLoading(true)
    try {
      const r = await authAPI.forgotPassword(resetEmail.trim())
      if (r.data?.dev_otp) toast.success(`Demo OTP: ${r.data.dev_otp}`, { duration: 12000 })
      else toast.success('OTP sent to your email')
      setResetStep(2)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not send OTP')
    } finally {
      setResetLoading(false)
    }
  }

  const resetPassword = async (e) => {
    e.preventDefault()
    if (!otp.trim() || newPass.length < 8) { toast.error('Enter OTP and password (min 8 chars)'); return }
    setResetLoading(true)
    try {
      await authAPI.resetPassword({ email: resetEmail.trim(), otp: otp.trim(), new_password: newPass })
      toast.success('Password reset — sign in with your new password')
      setEmail(resetEmail)
      setPassword('')
      setMode('login')
      setResetStep(1)
      setOtp('')
      setNewPass('')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Reset failed')
    } finally {
      setResetLoading(false)
    }
  }

  const title = mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Reset Password'

  return (
    <Modal open={open} onClose={handleClose} title={title} width={520}>
      {mode === 'register' ? (
        <form onSubmit={submitRegister} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 13, color: 'var(--text2)' }}>
            Official roles require administrator approval. Community accounts are activated immediately.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Full name *"><Input value={regForm.full_name} onChange={e => setRegForm(p => ({ ...p, full_name: e.target.value }))} required /></Field>
            <Field label="Email *"><Input type="email" value={regForm.email} onChange={e => setRegForm(p => ({ ...p, email: e.target.value }))} required /></Field>
            <Field label="Password *"><Input type="password" value={regForm.password} onChange={e => setRegForm(p => ({ ...p, password: e.target.value }))} required /></Field>
            <Field label="Phone"><Input value={regForm.phone} onChange={e => setRegForm(p => ({ ...p, phone: e.target.value }))} /></Field>
            <Field label="Role *"><Select options={REGISTER_ROLES} value={regForm.role} onChange={e => setRegForm(p => ({ ...p, role: e.target.value }))} /></Field>
            <Field label="Organization"><Input value={regForm.organization} onChange={e => setRegForm(p => ({ ...p, organization: e.target.value }))} /></Field>
            {['district', 'enumerator', 'school', 'community'].includes(regForm.role) && (
              <Field label={regForm.role === 'community' ? 'Home district (optional)' : 'District *'}>
                <Select options={regForm.role === 'community' ? ['', ...DISTRICT_NAMES] : DISTRICT_NAMES} value={regForm.district} onChange={e => setRegForm(p => ({ ...p, district: e.target.value, school_id: '' }))} />
              </Field>
            )}
            {regForm.role === 'school' && (
              <p style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--text2)' }}>
                Your school will be assigned by an administrator when your account is approved.
              </p>
            )}
          </div>
          <Btn type="submit" disabled={regLoading} style={{ width: '100%', justifyContent: 'center' }}>
            {regLoading ? 'Submitting...' : 'Submit Registration'}
          </Btn>
          <button type="button" onClick={() => setMode('login')} style={{ fontSize: 12, color: 'var(--text2)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Already have an account? Sign in
          </button>
        </form>
      ) : mode === 'login' ? (
        <>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>Select a demo role to auto-fill credentials</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 18 }}>
            {DEMOS.map(d => (
              <div key={d.role} onClick={() => pick(d)}
                style={{
                  border: `2px solid ${selected === d.role ? 'var(--blue)' : 'var(--border)'}`,
                  borderRadius: 10, padding: '10px 6px', textAlign: 'center', cursor: 'pointer',
                  background: selected === d.role ? 'var(--blue-lt)' : '#fff',
                }}>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: selected === d.role ? 'var(--blue)' : 'var(--text2)' }}>{d.label}</div>
              </div>
            ))}
          </div>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Email"><Input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></Field>
            <Field label="Password"><Input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></Field>
            <button type="button" onClick={() => { setMode('reset'); setResetEmail(email); setResetStep(1) }}
              style={{ fontSize: 12, color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 600 }}>
              Forgot password?
            </button>
            <Btn type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>{loading ? 'Signing in...' : 'Sign In'}</Btn>
          </form>
          <button type="button" onClick={() => setMode('register')} style={{ marginTop: 14, fontSize: 13, color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', width: '100%', fontWeight: 600 }}>
            Create an account
          </button>
        </>
      ) : (
        <>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
            {resetStep === 1 ? 'Enter your email for a one-time code' : 'Enter OTP and new password'}
          </p>
          {resetStep === 1 ? (
            <form onSubmit={requestOtp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Email"><Input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required /></Field>
              <Btn type="submit" disabled={resetLoading}>{resetLoading ? 'Sending...' : 'Send OTP'}</Btn>
            </form>
          ) : (
            <form onSubmit={resetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="OTP"><Input value={otp} onChange={e => setOtp(e.target.value)} required /></Field>
              <Field label="New password"><Input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} required /></Field>
              <Btn type="submit" disabled={resetLoading}>{resetLoading ? 'Resetting...' : 'Reset Password'}</Btn>
            </form>
          )}
          <button type="button" onClick={() => { setMode('login'); setResetStep(1) }}
            style={{ marginTop: 14, fontSize: 12, color: 'var(--text2)', background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}>
            ← Back to sign in
          </button>
        </>
      )}
    </Modal>
  )
}

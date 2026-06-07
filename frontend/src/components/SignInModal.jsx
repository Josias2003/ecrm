import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { authAPI } from '../api/api'
import { Modal, Btn, Input, Field } from './UI'
import toast from 'react-hot-toast'

const DEMOS = [
  { role: 'admin', label: 'System Admin', email: 'admin@reb.rw', pass: 'Admin@1234' },
  { role: 'reb', label: 'REB Officer', email: 'uwase@mineduc.gov.rw', pass: 'Reb@1234' },
  { role: 'district', label: 'District Officer', email: 'eric@gasabo.gov.rw', pass: 'District@1' },
  { role: 'school', label: 'School Head', email: 'paul@school.rw', pass: 'School@1234' },
  { role: 'enumerator', label: 'Enumerator', email: 'rose@reb.rw', pass: 'Field@1234' },
  { role: 'community', label: 'Community', email: 'david@gmail.com', pass: 'Comm@1234' },
]

export default function SignInModal({ open, onClose }) {
  const { login, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selected, setSelected] = useState(null)
  const [mode, setMode] = useState('login')
  const [resetStep, setResetStep] = useState(1)
  const [otp, setOtp] = useState('')
  const [newPass, setNewPass] = useState('')
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

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

  return (
    <Modal open={open} onClose={handleClose} title={mode === 'login' ? 'Sign In' : 'Reset Password'} width={480}>
      {mode === 'login' ? (
        <>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
            Select a demo role to auto-fill credentials
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 18 }}>
            {DEMOS.map(d => (
              <div key={d.role} onClick={() => pick(d)}
                style={{
                  border: `2px solid ${selected === d.role ? 'var(--blue)' : 'var(--border)'}`,
                  borderRadius: 10, padding: '10px 6px', textAlign: 'center', cursor: 'pointer',
                  background: selected === d.role ? 'var(--blue-lt)' : '#fff',
                }}>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: selected === d.role ? 'var(--blue)' : 'var(--text2)' }}>
                  {d.label}
                </div>
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
            <Btn type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Btn>
          </form>
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

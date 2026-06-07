import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { authAPI } from '../api/api'
import { CSS, Btn, Input, Field } from '../components/UI'
import toast from 'react-hot-toast'

const DEMOS = [
  { role:'admin',      label:'System Admin',     email:'admin@reb.rw',            pass:'Admin@1234' },
  { role:'reb',        label:'REB Officer',       email:'uwase@mineduc.gov.rw',    pass:'Reb@1234' },
  { role:'district',   label:'District Officer',  email:'eric@gasabo.gov.rw',      pass:'District@1' },
  { role:'school',     label:'School Head',       email:'paul@school.rw',          pass:'School@1234' },
  { role:'enumerator', label:'Field Enumerator',  email:'rose@reb.rw',             pass:'Field@1234' },
  { role:'community',  label:'Community Member',  email:'david@gmail.com',         pass:'Comm@1234' },
]

const BG_SQUARES = [
  { w:140, t:60, l:40, rot:12, o:.14 },
  { w:90, t:'auto', b:100, r:80, rot:-8, o:.1 },
  { w:70, t:140, r:'18%', rot:22, o:.09 },
  { w:110, b:140, l:'12%', rot:-15, o:.11 },
  { w:50, t:'35%', l:'8%', rot:30, o:.08 },
]

export default function LoginPage() {
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

  const submit = async (e) => {
    e.preventDefault()
    if (!email || !password) { toast.error('Enter email and password'); return }
    const r = await login(email, password)
    if (r.ok) { toast.success('Welcome back!'); navigate('/dashboard') }
    else toast.error(r.error)
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
    if (!otp.trim() || otp.trim().length < 4) { toast.error('Enter the OTP code'); return }
    if (newPass.length < 8) { toast.error('Password must be at least 8 characters'); return }
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
    <div style={{
      minHeight:'100vh',
      background:'linear-gradient(135deg, #0F172A 0%, #1E3A5F 50%, #0F172A 100%)',
      display:'flex', alignItems:'center', justifyContent:'center',
      position:'relative', overflow:'hidden', padding:20,
    }}>
      <style>{CSS}</style>
      {BG_SQUARES.map((s, i) => (
        <div key={i} style={{
          position:'absolute', width:s.w, height:s.w, borderRadius:18,
          top:s.t, left:s.l, right:s.r, bottom:s.b,
          background:'linear-gradient(135deg, rgba(59,130,246,.3), rgba(6,182,212,.15))',
          opacity:s.o, transform:`rotate(${s.rot}deg)`, pointerEvents:'none',
        }}/>
      ))}
      {[[400,-100,-100],[280,'auto','auto',-60,-60]].map((v,i)=>(
        <div key={`o${i}`} style={{ position:'absolute', width:v[0], height:v[0],
          top:v[1]??undefined, right:v[2]??undefined, bottom:v[3]??undefined, left:v[4]??undefined,
          borderRadius:'50%', background:'radial-gradient(circle,rgba(37,99,235,.2) 0%,transparent 70%)',
          pointerEvents:'none' }}/>
      ))}

      <div style={{ display:'flex', gap:40, maxWidth:960, width:'100%',
        alignItems:'flex-start', position:'relative', zIndex:1,
        flexWrap:'wrap', justifyContent:'center' }}>

        <div style={{ maxWidth:350, color:'#fff', paddingTop:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:30 }}>
            <div style={{ width:48, height:48, borderRadius:13, flexShrink:0,
              background:'linear-gradient(135deg,#2563EB,#06B6D4)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily:'Syne', fontSize:17, fontWeight:800, color:'#fff' }}>EC</div>
            <div>
              <div style={{ fontFamily:'Syne', fontSize:20, fontWeight:800 }}>ECRM</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.45)', marginTop:1 }}>
                Education Community Resource Mapping
              </div>
            </div>
          </div>
          <h1 style={{ fontFamily:'Syne', fontSize:34, fontWeight:800, lineHeight:1.2,
            marginBottom:14, background:'linear-gradient(135deg,#fff,rgba(255,255,255,.7))',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            Mapping Rwanda's Education Resources
          </h1>
          <p style={{ fontSize:14, color:'rgba(255,255,255,.55)', lineHeight:1.8, marginBottom:28 }}>
            Track school infrastructure, teacher deployment, and resource gaps across Kigali's public schools.
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[
              '35 schools mapped with GPS verification',
              'Real-time resource gap detection & alerts',
              'Role-based dashboards for all stakeholders',
              'Secure OTP password recovery',
            ].map(t => (
              <div key={t} style={{ display:'flex', alignItems:'center', gap:10,
                fontSize:13, color:'rgba(255,255,255,.72)' }}>
                <span style={{ color:'#10B981', flexShrink:0, fontSize:15 }}>✓</span>{t}
              </div>
            ))}
          </div>
        </div>

        <div style={{ background:'#fff', borderRadius:20, padding:'36px 36px',
          width:420, maxWidth:'100%', boxShadow:'0 24px 80px rgba(0,0,0,.35)',
          animation:'fadeUp .35s ease' }}>
          {mode === 'login' ? (
            <>
              <h2 style={{ fontFamily:'Syne', fontSize:22, fontWeight:800,
                color:'var(--text)', marginBottom:4 }}>Sign In</h2>
              <p style={{ fontSize:13, color:'var(--text2)', marginBottom:20 }}>
                Select your role to auto-fill demo credentials
              </p>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:20 }}>
                {DEMOS.map(d => (
                  <div key={d.role} onClick={() => pick(d)}
                    style={{ border:`2px solid ${selected===d.role?'var(--blue)':'var(--border)'}`,
                      borderRadius:12, padding:'11px 6px', textAlign:'center', cursor:'pointer',
                      background: selected===d.role ? 'var(--blue-lt)' : '#fff',
                      transition:'all .15s' }}>
                    <div style={{ fontSize:10.5, fontWeight:600, lineHeight:1.3,
                      color: selected===d.role ? 'var(--blue)' : 'var(--text2)' }}>
                      {d.label}
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <Field label="Email Address">
                  <Input type="email" placeholder="your@email.rw"
                    value={email} onChange={e => setEmail(e.target.value)} required />
                </Field>
                <Field label="Password">
                  <Input type="password" placeholder="••••••••"
                    value={password} onChange={e => setPassword(e.target.value)} required />
                </Field>
                <button type="button" onClick={() => { setMode('reset'); setResetEmail(email); setResetStep(1) }}
                  style={{ fontSize:12.5, color:'var(--blue)', background:'none', border:'none',
                    cursor:'pointer', textAlign:'left', marginTop:-4, padding:0, fontWeight:600 }}>
                  Forgot password?
                </button>
                <Btn type="submit" disabled={loading}
                  style={{ width:'100%', justifyContent:'center', padding:'12px' }}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Btn>
              </form>
            </>
          ) : (
            <>
              <h2 style={{ fontFamily:'Syne', fontSize:22, fontWeight:800,
                color:'var(--text)', marginBottom:4 }}>Reset Password</h2>
              <p style={{ fontSize:13, color:'var(--text2)', marginBottom:20 }}>
                {resetStep === 1 ? 'Enter your email to receive a one-time code' : 'Enter the OTP and your new password'}
              </p>
              {resetStep === 1 ? (
                <form onSubmit={requestOtp} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  <Field label="Email Address">
                    <Input type="email" placeholder="your@email.rw"
                      value={resetEmail} onChange={e => setResetEmail(e.target.value)} required />
                  </Field>
                  <Btn type="submit" disabled={resetLoading}
                    style={{ width:'100%', justifyContent:'center', padding:'12px' }}>
                    {resetLoading ? 'Sending...' : 'Send OTP'}
                  </Btn>
                </form>
              ) : (
                <form onSubmit={resetPassword} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  <Field label="OTP Code">
                    <Input placeholder="6-digit code" value={otp}
                      onChange={e => setOtp(e.target.value)} required />
                  </Field>
                  <Field label="New Password">
                    <Input type="password" placeholder="Min. 8 characters"
                      value={newPass} onChange={e => setNewPass(e.target.value)} required />
                  </Field>
                  <Btn type="submit" disabled={resetLoading}
                    style={{ width:'100%', justifyContent:'center', padding:'12px' }}>
                    {resetLoading ? 'Resetting...' : 'Reset Password'}
                  </Btn>
                </form>
              )}
              <button type="button" onClick={() => { setMode('login'); setResetStep(1) }}
                style={{ marginTop:16, fontSize:12.5, color:'var(--text2)', background:'none',
                  border:'none', cursor:'pointer', width:'100%', textAlign:'center' }}>
                ← Back to sign in
              </button>
            </>
          )}

          <div style={{ marginTop:18, padding:'12px 14px', background:'var(--bg2)',
            borderRadius:10, fontSize:11.5, color:'var(--text2)', lineHeight:1.7 }}>
            <strong style={{ color:'var(--text)' }}>Demo system</strong> — click any role above,
            then sign in. OTP is shown in a toast for demo accounts.
          </div>
        </div>
      </div>
    </div>
  )
}

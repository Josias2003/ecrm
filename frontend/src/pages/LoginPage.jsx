import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { CSS, Btn, Input, Field } from '../components/UI'
import toast from 'react-hot-toast'

const DEMOS = [
  { role:'admin',      label:'System Admin',     email:'admin@reb.rw',            pass:'Admin@1234',  icon:'🛡️' },
  { role:'reb',        label:'REB Officer',       email:'uwase@mineduc.gov.rw',    pass:'Reb@1234',    icon:'🏛️' },
  { role:'district',   label:'District Officer',  email:'eric@gasabo.gov.rw',      pass:'District@1',  icon:'📍' },
  { role:'school',     label:'School Head',       email:'paul@school.rw',          pass:'School@1234', icon:'🏫' },
  { role:'enumerator', label:'Field Enumerator',  email:'rose@reb.rw',             pass:'Field@1234',  icon:'📋' },
  { role:'community',  label:'Community Member',  email:'david@gmail.com',         pass:'Comm@1234',   icon:'👥' },
]

export default function LoginPage() {
  const { login, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selected, setSelected] = useState(null)

  const pick = (d) => { setSelected(d.role); setEmail(d.email); setPassword(d.pass) }

  const submit = async (e) => {
    e.preventDefault()
    if (!email || !password) { toast.error('Enter email and password'); return }
    const r = await login(email, password)
    if (r.ok) { toast.success('Welcome back!'); navigate('/dashboard') }
    else toast.error(r.error)
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--navy)',
      display:'flex', alignItems:'center', justifyContent:'center',
      position:'relative', overflow:'hidden', padding:20 }}>
      <style>{CSS}</style>
      {/* Ambient orbs */}
      {[[400,-100,-100],[280,'auto','auto',-60,-60],[180,'45%','18%']].map((v,i)=>(
        <div key={i} style={{ position:'absolute', width:v[0], height:v[0],
          top:v[1]??undefined, right:v[2]??undefined, bottom:v[3]??undefined, left:v[4]??undefined,
          borderRadius:'50%', background:'radial-gradient(circle,rgba(37,99,235,.25) 0%,transparent 70%)',
          pointerEvents:'none' }}/>
      ))}

      <div style={{ display:'flex', gap:40, maxWidth:960, width:'100%',
        alignItems:'flex-start', position:'relative', zIndex:1,
        flexWrap:'wrap', justifyContent:'center' }}>

        {/* Hero */}
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
            A centralised GIS-powered platform for tracking school infrastructure,
            teacher deployment, and resource gaps across Kigali's public schools.
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[
              '35 schools mapped with GPS verification',
              'Real-time Leaflet GIS with OpenStreetMap tiles',
              'Automatic resource gap detection & alerts',
              'Role-based dashboards for all stakeholders',
              'Enrollment trends with 4-year history',
              'CSV export for all school data',
            ].map(t => (
              <div key={t} style={{ display:'flex', alignItems:'center', gap:10,
                fontSize:13, color:'rgba(255,255,255,.72)' }}>
                <span style={{ color:'#10B981', flexShrink:0, fontSize:15 }}>✓</span>{t}
              </div>
            ))}
          </div>
        </div>

        {/* Login card */}
        <div style={{ background:'#fff', borderRadius:20, padding:'36px 36px',
          width:420, maxWidth:'100%', boxShadow:'0 24px 80px rgba(0,0,0,.35)',
          animation:'fadeUp .35s ease' }}>
          <h2 style={{ fontFamily:'Syne', fontSize:22, fontWeight:800,
            color:'var(--text)', marginBottom:4 }}>Sign In</h2>
          <p style={{ fontSize:13, color:'var(--text2)', marginBottom:20 }}>
            Select your role to auto-fill demo credentials
          </p>

          {/* Role grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:20 }}>
            {DEMOS.map(d => (
              <div key={d.role} onClick={() => pick(d)}
                style={{ border:`2px solid ${selected===d.role?'var(--blue)':'var(--border)'}`,
                  borderRadius:12, padding:'11px 6px', textAlign:'center', cursor:'pointer',
                  background: selected===d.role ? 'var(--blue-lt)' : '#fff',
                  transition:'all .15s' }}>
                <div style={{ fontSize:22, marginBottom:4 }}>{d.icon}</div>
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
            <Btn type="submit" disabled={loading}
              style={{ width:'100%', justifyContent:'center', padding:'12px' }}>
              {loading ? '⏳ Signing in...' : 'Sign In →'}
            </Btn>
          </form>

          <div style={{ marginTop:18, padding:'12px 14px', background:'var(--bg2)',
            borderRadius:10, fontSize:11.5, color:'var(--text2)', lineHeight:1.7 }}>
            <strong style={{ color:'var(--text)' }}>Demo system</strong> — click any role above,
            then sign in. Database is seeded with 35 schools, 2000+ teachers, and 150+ feedback records.
          </div>
        </div>
      </div>
    </div>
  )
}

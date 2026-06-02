import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from './store/auth'
import { CSS, PageLoad } from './components/UI'
import LoginPage from './pages/LoginPage'
import GISMapPage from './pages/GISMapPage'
import SchoolsPage from './pages/SchoolsPage'
import TeachersPage from './pages/TeachersPage'
import FeedbackPage from './pages/FeedbackPage'
import AlertsPage from './pages/AlertsPage'
import AnalyticsPage from './pages/AnalyticsPage'
import UsersPage from './pages/UsersPage'
import DashboardRouter from './pages/DashboardRouter'

const ROLE_LABELS = {
  admin:'System Admin', reb:'REB Officer', district:'District Officer',
  school:'School Head', enumerator:'Field Enumerator', community:'Community Member'
}

const NAV_CONFIG = {
  admin:     [
    { path:'/dashboard', label:'Dashboard',    icon:'📊' },
    { path:'/schools',   label:'Schools',      icon:'🏫' },
    { path:'/gis',       label:'GIS Map',      icon:'🗺️', highlight:true },
    { path:'/teachers',  label:'Teachers',     icon:'👨‍🏫' },
    { path:'/feedback',  label:'Feedback',     icon:'💬' },
    { path:'/alerts',    label:'Alerts',       icon:'🔔' },
    { path:'/analytics', label:'Analytics',    icon:'📈' },
    { path:'/users',     label:'Users',        icon:'👥' },
  ],
  reb:       [
    { path:'/dashboard', label:'Dashboard',    icon:'📊' },
    { path:'/schools',   label:'All Schools',  icon:'🏫' },
    { path:'/gis',       label:'National GIS', icon:'🗺️', highlight:true },
    { path:'/teachers',  label:'Teachers',     icon:'👨‍🏫' },
    { path:'/feedback',  label:'Feedback',     icon:'💬' },
    { path:'/alerts',    label:'Alerts',       icon:'🔔' },
    { path:'/analytics', label:'Analytics',    icon:'📈' },
  ],
  district:  [
    { path:'/dashboard', label:'Dashboard',    icon:'📊' },
    { path:'/schools',   label:'My Schools',   icon:'🏫' },
    { path:'/gis',       label:'District Map', icon:'🗺️', highlight:true },
    { path:'/teachers',  label:'Teachers',     icon:'👨‍🏫' },
    { path:'/feedback',  label:'Feedback',     icon:'💬' },
    { path:'/alerts',    label:'Alerts',       icon:'🔔' },
    { path:'/analytics', label:'Analytics',    icon:'📈' },
  ],
  school:    [
    { path:'/dashboard', label:'Dashboard',    icon:'📊' },
    { path:'/gis',       label:'School on Map',icon:'🗺️', highlight:true },
    { path:'/teachers',  label:'My Teachers',  icon:'👨‍🏫' },
    { path:'/feedback',  label:'Feedback',     icon:'💬' },
    { path:'/alerts',    label:'Alerts',       icon:'🔔' },
  ],
  enumerator:[
    { path:'/dashboard', label:'Collect Data', icon:'📝' },
    { path:'/schools',   label:'Schools',      icon:'🏫' },
    { path:'/gis',       label:'Field Map',    icon:'🗺️', highlight:true },
  ],
  community: [
    { path:'/dashboard', label:'Report Issue', icon:'📨' },
    { path:'/feedback',  label:'My Reports',   icon:'🔍' },
    { path:'/gis',       label:'School Map',   icon:'🗺️', highlight:true },
  ],
}

function Sidebar({ user, pendingAlerts }) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const nav = NAV_CONFIG[user.role] || NAV_CONFIG.admin
  const initials = user.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()

  return (
    <aside style={{ width:256, minWidth:256, background:'var(--navy)',
      display:'flex', flexDirection:'column', height:'100vh',
      position:'fixed', left:0, top:0, zIndex:100, overflow:'hidden' }}>

      {/* Ambient glow */}
      <div style={{ position:'absolute', top:-80, right:-80, width:220, height:220,
        borderRadius:'50%',
        background:'radial-gradient(circle,rgba(37,99,235,.28) 0%,transparent 70%)',
        pointerEvents:'none' }}/>

      {/* Brand */}
      <div style={{ padding:'24px 20px 18px', borderBottom:'1px solid rgba(255,255,255,.08)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:11 }}>
          <div style={{ width:40, height:40, borderRadius:11, flexShrink:0,
            background:'linear-gradient(135deg,#2563EB,#06B6D4)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontFamily:'Syne', fontSize:15, fontWeight:800, color:'#fff' }}>EC</div>
          <div>
            <div style={{ fontFamily:'Syne', fontSize:15, fontWeight:800, color:'#fff',
              letterSpacing:.3 }}>ECRM</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.38)', marginTop:1 }}>
              Rwanda · Resource Mapping
            </div>
          </div>
        </div>
      </div>

      {/* User */}
      <div style={{ padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,.08)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10,
          background:'rgba(255,255,255,.07)', borderRadius:10, padding:'9px 11px' }}>
          <div style={{ width:34, height:34, borderRadius:9, flexShrink:0,
            background:'linear-gradient(135deg,#2563EB,#06B6D4)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:11, fontWeight:700, color:'#fff' }}>{initials}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12.5, fontWeight:600, color:'#fff',
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {user.full_name}
            </div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', marginTop:1,
              textTransform:'uppercase', letterSpacing:.5 }}>
              {ROLE_LABELS[user.role]}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, overflowY:'auto', padding:'10px 10px' }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.28)', padding:'6px 10px 8px',
          letterSpacing:1.2, textTransform:'uppercase', fontWeight:600 }}>Menu</div>
        {nav.map(item => (
          <NavLink key={item.path} to={item.path}
            style={({ isActive }) => ({
              display:'flex', alignItems:'center', gap:10, padding:'8px 10px',
              borderRadius:9, marginBottom:2, fontSize:13, fontWeight:500,
              color: isActive ? '#fff' : 'rgba(255,255,255,.55)',
              background: isActive
                ? 'rgba(37,99,235,.28)'
                : item.highlight ? 'rgba(6,182,212,.06)' : 'transparent',
              textDecoration:'none', transition:'all .15s', position:'relative',
            })}>
            {({ isActive }) => (<>
              {isActive && (
                <span style={{ position:'absolute', left:0, top:'50%',
                  transform:'translateY(-50%)', width:3, height:'60%',
                  background:'#60A5FA', borderRadius:'0 3px 3px 0' }}/>
              )}
              <span style={{ fontSize:16, width:20, textAlign:'center', flexShrink:0 }}>
                {item.icon}
              </span>
              <span style={{ flex:1 }}>{item.label}</span>
              {item.path==='/alerts' && pendingAlerts > 0 && (
                <span style={{ background:'var(--red)', color:'#fff', fontSize:10,
                  fontWeight:700, padding:'2px 6px', borderRadius:20,
                  minWidth:18, textAlign:'center' }}>{pendingAlerts}</span>
              )}
              {item.highlight && !isActive && (
                <span style={{ background:'rgba(6,182,212,.2)', color:'#06B6D4',
                  fontSize:9, fontWeight:700, padding:'1px 5px',
                  borderRadius:4, letterSpacing:.3 }}>GIS</span>
              )}
            </>)}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding:'12px 16px', borderTop:'1px solid rgba(255,255,255,.08)' }}>
        <button onClick={() => { logout(); navigate('/login') }}
          style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 10px',
            borderRadius:9, width:'100%', border:'none', background:'transparent',
            fontSize:13, color:'rgba(255,255,255,.42)', cursor:'pointer',
            fontFamily:'Inter', transition:'all .15s' }}
          onMouseEnter={e => { e.currentTarget.style.background='rgba(239,68,68,.15)'; e.currentTarget.style.color='#FCA5A5' }}
          onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(255,255,255,.42)' }}>
          🚪 Sign Out
        </button>
      </div>
    </aside>
  )
}

function Topbar({ user }) {
  const location = useLocation()
  const pageName = {
    '/dashboard':'Dashboard', '/schools':'Schools', '/gis':'GIS Map — Geospatial View',
    '/teachers':'Teacher Management', '/feedback':'Feedback & Reports',
    '/alerts':'Resource Alerts', '/analytics':'Analytics', '/users':'User Management',
  }[location.pathname] || 'ECRM'

  return (
    <header style={{ height:62, background:'#fff', borderBottom:'1px solid var(--border)',
      display:'flex', alignItems:'center', padding:'0 26px', gap:14, flexShrink:0 }}>
      <div style={{ flex:1 }}>
        <h1 style={{ fontFamily:'Syne', fontSize:18, fontWeight:800, color:'var(--text)' }}>
          {pageName}
        </h1>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7,
          background:'var(--bg2)', border:'1.5px solid var(--border)',
          borderRadius:9, padding:'6px 12px' }}>
          <span style={{ fontSize:13 }}>🔍</span>
          <input placeholder="Search schools, districts..."
            style={{ border:'none', background:'transparent', fontSize:13,
              color:'var(--text)', outline:'none', width:180 }}/>
        </div>
        <div style={{ fontSize:11.5, color:'var(--text2)', padding:'5px 12px',
          background:'var(--bg2)', borderRadius:8, border:'1px solid var(--border)' }}>
          {user.district !== 'National' ? `📍 ${user.district}` : '🌍 National'}
        </div>
      </div>
    </header>
  )
}

function AppShell({ user }) {
  const [pendingAlerts, setPendingAlerts] = useState(0)

  useEffect(() => {
    import('./api/api').then(({ alertsAPI }) => {
      alertsAPI.list({ resolved: false }).then(r => {
        setPendingAlerts(r.data?.length || 0)
      }).catch(() => {})
    })
  }, [])

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      <Sidebar user={user} pendingAlerts={pendingAlerts} />
      <div style={{ marginLeft:256, flex:1, display:'flex',
        flexDirection:'column', minHeight:'100vh', overflow:'hidden' }}>
        <Topbar user={user} />
        <main style={{ flex:1, padding:'24px 28px', overflowY:'auto' }}>
          <Routes>
            <Route path="/dashboard" element={<DashboardRouter />} />
            <Route path="/gis"       element={<GISMapPage />} />
            <Route path="/schools"   element={<SchoolsPage />} />
            <Route path="/teachers"  element={<TeachersPage />} />
            <Route path="/feedback"  element={<FeedbackPage />} />
            <Route path="/alerts"    element={<AlertsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/users"     element={<UsersPage />} />
            <Route path="*"          element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  const { user, token, hydrate } = useAuth()
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    if (token && !user) hydrate().finally(() => setBooting(false))
    else setBooting(false)
  }, [])

  if (booting) return <><style>{CSS}</style><PageLoad /></>

  return (
    <BrowserRouter>
      <style>{CSS}</style>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
        <Route path="/*"     element={user ? <AppShell user={user} /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}

import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from './store/auth'
import { CSS, PageLoad } from './components/UI'
import {
  Search,
  Bell,
  ChevronLeft,
  ChevronRight,
  Settings,
  LogOut,
  User,
  LayoutDashboard,
  School,
  Map as MapIcon,
  UserRound,
  MessageSquare,
  BellRing,
  BarChart3,
  Users as UsersIcon,
  ClipboardList,
  Flag,
} from 'lucide-react'
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
    { path:'/dashboard', label:'Dashboard',    icon:LayoutDashboard },
    { path:'/schools',   label:'Schools',      icon:School },
    { path:'/gis',       label:'GIS Map',      icon:MapIcon, highlight:true },
    { path:'/teachers',  label:'Teachers',     icon:UserRound },
    { path:'/feedback',  label:'Feedback',     icon:MessageSquare },
    { path:'/alerts',    label:'Alerts',       icon:BellRing },
    { path:'/analytics', label:'Analytics',    icon:BarChart3 },
    { path:'/users',     label:'Users',        icon:UsersIcon },
  ],
  reb:       [
    { path:'/dashboard', label:'Dashboard',    icon:LayoutDashboard },
    { path:'/schools',   label:'All Schools',  icon:School },
    { path:'/gis',       label:'National GIS', icon:MapIcon, highlight:true },
    { path:'/teachers',  label:'Teachers',     icon:UserRound },
    { path:'/feedback',  label:'Feedback',     icon:MessageSquare },
    { path:'/alerts',    label:'Alerts',       icon:BellRing },
    { path:'/analytics', label:'Analytics',    icon:BarChart3 },
  ],
  district:  [
    { path:'/dashboard', label:'Dashboard',    icon:LayoutDashboard },
    { path:'/schools',   label:'My Schools',   icon:School },
    { path:'/gis',       label:'District Map', icon:MapIcon, highlight:true },
    { path:'/teachers',  label:'Teachers',     icon:UserRound },
    { path:'/feedback',  label:'Feedback',     icon:MessageSquare },
    { path:'/alerts',    label:'Alerts',       icon:BellRing },
    { path:'/analytics', label:'Analytics',    icon:BarChart3 },
  ],
  school:    [
    { path:'/dashboard', label:'Dashboard',    icon:LayoutDashboard },
    { path:'/gis',       label:'School on Map',icon:MapIcon, highlight:true },
    { path:'/teachers',  label:'My Teachers',  icon:UserRound },
    { path:'/feedback',  label:'Feedback',     icon:MessageSquare },
    { path:'/alerts',    label:'Alerts',       icon:BellRing },
  ],
  enumerator:[
    { path:'/dashboard', label:'Collect Data', icon:ClipboardList },
    { path:'/schools',   label:'Schools',      icon:School },
    { path:'/gis',       label:'Field Map',    icon:MapIcon, highlight:true },
  ],
  community: [
    { path:'/dashboard', label:'Report Issue', icon:Flag },
    { path:'/feedback',  label:'My Reports',   icon:Search },
    { path:'/gis',       label:'School Map',   icon:MapIcon, highlight:true },
  ],
}

function Sidebar({ user, pendingAlerts, collapsed, onToggle }) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const nav = NAV_CONFIG[user.role] || NAV_CONFIG.admin
  const initials = user.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()

  return (
    <aside style={{ width:collapsed?64:240, minWidth:collapsed?64:240, background:'var(--navy)',
      display:'flex', flexDirection:'column', height:'100vh',
      position:'fixed', left:0, top:0, zIndex:100, overflow:'hidden',
      transition:'width 200ms ease, min-width 200ms ease' }}>

      <div style={{ position:'absolute', top:14, right:collapsed?10:14, width:collapsed?40:40, display:'flex', justifyContent:'center', zIndex:2 }}>
        <button
          onClick={onToggle}
          aria-label="Toggle sidebar"
          style={{
            width:collapsed?36:36,
            height:36,
            borderRadius:10,
            border:'1px solid rgba(226,232,240,.16)',
            background:'rgba(255,255,255,.04)',
            color:'rgba(148,163,184,.95)',
            cursor:'pointer',
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
          }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Brand */}
      <div style={{ padding:'72px 16px 18px', borderBottom:'1px solid rgba(255,255,255,.08)',
        transition:'padding 200ms ease' }}>
        <div style={{ display:'flex', alignItems:'center', gap:11 }}>
          <div style={{ width:40, height:40, borderRadius:11, flexShrink:0,
            background:'linear-gradient(135deg,#2563EB,#06B6D4)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontFamily:'Syne', fontSize:15, fontWeight:800, color:'#fff' }}>EC</div>
          {!collapsed && (
            <div style={{transition:'opacity 200ms ease'}}>
              <div style={{ fontFamily:'Syne', fontSize:15, fontWeight:800, color:'#fff',
                letterSpacing:.3 }}>ECRM</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.38)', marginTop:1 }}>
                Rwanda · Resource Mapping
              </div>
            </div>
          )}
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
          {!collapsed && (
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
          )}
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, overflowY:'auto', padding:'10px 10px', transition:'padding 200ms ease' }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.28)', padding:'6px 10px 8px',
          letterSpacing:1.2, textTransform:'uppercase', fontWeight:600 }}>Menu</div>
        {nav.map(item => (
          <NavLink key={item.path} to={item.path}
            style={({ isActive }) => ({
              display:'flex', alignItems:'center', gap:10, padding:'8px 10px',
              borderRadius:10, marginBottom:2, fontSize:13, fontWeight:500,
              color: isActive ? '#F8FAFC' : 'rgba(148,163,184,.92)',
              background: isActive ? 'rgba(59,130,246,0.08)' : 'transparent',
              borderLeft: isActive ? '3px solid #3B82F6' : '3px solid transparent',
              textDecoration:'none', transition:'all .15s', position:'relative',
            })}>
            {({ isActive }) => {
              const IconComp = item.icon
              return (
                <>
                  {isActive && null}
                  <span
                    style={{
                      width:20,
                      textAlign:'center',
                      flexShrink:0,
                      display:'flex',
                      alignItems:'center',
                      justifyContent:'center',
                      color: isActive ? '#F8FAFC' : 'rgba(148,163,184,.92)',
                    }}
                  >
                    {typeof IconComp === 'string' ? (
                      IconComp
                    ) : (
                      <IconComp size={20} />
                    )}
                  </span>
                  {!collapsed && <span style={{ flex:1 }}>{item.label}</span>}
                  {!collapsed && item.path==='/alerts' && pendingAlerts > 0 && (
                    <span style={{ background:'var(--red)', color:'#fff', fontSize:10,
                      fontWeight:700, padding:'2px 6px', borderRadius:20,
                      minWidth:18, textAlign:'center' }}>{pendingAlerts}</span>
                  )}
                  {item.highlight && !isActive && !collapsed && (
                    <span style={{ background:'rgba(6,182,212,.2)', color:'#06B6D4',
                      fontSize:9, fontWeight:700, padding:'1px 5px',
                      borderRadius:4, letterSpacing:.3 }}>GIS</span>
                  )}
                </>
              )
            }}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding:'12px 16px', borderTop:'1px solid rgba(255,255,255,.08)' }}>
        <button onClick={() => { logout(); navigate('/login') }}
          style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 10px',
            borderRadius:10, width:'100%', border:'none', background:'transparent',
            fontSize:13, color:'rgba(148,163,184,.85)', cursor:'pointer',
            fontFamily:'Inter', transition:'all .15s' }}
          onMouseEnter={e => { e.currentTarget.style.background='rgba(239,68,68,.15)'; e.currentTarget.style.color='#FCA5A5' }}
          onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(255,255,255,.42)' }}>
          {collapsed ? <LogOut size={16} /> : <>🚪 Sign Out</>}
        </button>
      </div>
    </aside>
  )
}

function Topbar({ user, pendingAlerts, onLogout }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const pageName = {
    '/dashboard':'Dashboard', '/schools':'Schools', '/gis':'GIS Map — Geospatial View',
    '/teachers':'Teacher Management', '/feedback':'Feedback & Reports',
    '/alerts':'Resource Alerts', '/analytics':'Analytics', '/users':'User Management',
  }[location.pathname] || 'ECRM'

  return (
    <header
      style={{
        height:62,
        background:'#fff',
        borderBottom:'1px solid var(--border)',
        display:'grid',
        gridTemplateColumns:'minmax(220px,1fr) 400px auto',
        alignItems:'center',
        padding:'0 24px',
        gap:14,
        flexShrink:0,
        position:'sticky',
        top:0,
        zIndex:50,
      }}
    >
      <div style={{minWidth:0}}>
        <h1 style={{ fontFamily:'Inter', fontSize:18, fontWeight:700, color:'#0F172A', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {pageName}
        </h1>
      </div>

      <div style={{ display:'flex', alignItems:'center' }}>
        <div
          style={{
            width:'100%',
            display:'flex',
            alignItems:'center',
            gap:10,
            background:'#fff',
            border:'1.5px solid var(--border)',
            borderRadius:12,
            padding:'10px 12px',
            transition:'border-color 150ms ease, box-shadow 150ms ease',
          }}
        >
          <Search size={16} style={{ color:'#94A3B8', flexShrink:0 }} />
          <input
            placeholder="Search schools, districts..."
            style={{
              border:'none',
              background:'transparent',
              fontSize:13.5,
              color:'var(--text)',
              outline:'none',
              width:'100%',
            }}
          />
        </div>
      </div>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:12 }}>
        <button
          aria-label="Notifications"
          onClick={()=>navigate('/alerts')}
          style={{
            width:42,
            height:42,
            borderRadius:12,
            border:'1px solid var(--border)',
            background:'var(--bg2)',
            cursor:'pointer',
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
            position:'relative',
          }}
        >
          <Bell size={18} style={{ color:'#0F172A' }} />
          {pendingAlerts > 0 && (
            <span
              style={{
                position:'absolute',
                top:7,
                right:7,
                background:'var(--red)',
                color:'#fff',
                fontSize:11,
                fontWeight:800,
                padding:'2px 6px',
                borderRadius:999,
                border:'2px solid #fff',
              }}
            >
              {pendingAlerts}
            </span>
          )}
        </button>

        <div style={{ position:'relative' }}>
          <button
            onClick={()=>setOpen(v=>!v)}
            style={{
              width:42,
              height:42,
              borderRadius:14,
              border:'1px solid var(--border)',
              background:'var(--bg2)',
              cursor:'pointer',
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              gap:10,
            }}
          >
            <User size={18} style={{ color:'#0F172A' }} />
            <span style={{ display:'none' }} />
          </button>

          {open && (
            <div
              style={{
                position:'absolute',
                right:0,
                top:46,
                width:220,
                background:'#fff',
                border:'1px solid var(--border)',
                borderRadius:12,
                boxShadow:'0 12px 40px rgba(0,0,0,.12)',
                overflow:'hidden',
                zIndex:2000,
              }}
            >
              <button
                onClick={() => { setOpen(false); navigate('/dashboard') }}
                style={{ width:'100%', textAlign:'left', padding:'12px 14px', background:'transparent', border:'none', cursor:'pointer', fontWeight:600, color:'#0F172A' }}
              >
                Profile
              </button>
              <button
                onClick={() => { setOpen(false); navigate('/analytics') }}
                style={{ width:'100%', textAlign:'left', padding:'12px 14px', background:'transparent', border:'none', cursor:'pointer', fontWeight:600, color:'#0F172A' }}
              >
                Settings
              </button>
              <div style={{ height:1, background:'#EEF2F7' }} />
              <button
                onClick={() => { setOpen(false); onLogout?.() }}
                style={{ width:'100%', textAlign:'left', padding:'12px 14px', background:'transparent', border:'none', cursor:'pointer', fontWeight:700, color:'var(--red)', display:'flex', alignItems:'center', gap:10 }}
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function AppShell({ user }) {
  const [pendingAlerts, setPendingAlerts] = useState(0)
  const [collapsed, setCollapsed] = useState(false)
  const { logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    import('./api/api').then(({ alertsAPI }) => {
      alertsAPI.list({ resolved: false }).then(r => {
        setPendingAlerts(r.data?.length || 0)
      }).catch(() => {})
    })
  }, [])

  useEffect(() => {
    const apply = () => setCollapsed(window.innerWidth < 1024)
    apply()
    window.addEventListener('resize', apply)
    return () => window.removeEventListener('resize', apply)
  }, [])

  const onLogout = () => {
    logout()
    navigate('/login')
  }

  const sidebarWidth = collapsed ? 64 : 240

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      <Sidebar user={user} pendingAlerts={pendingAlerts} collapsed={collapsed} onToggle={()=>setCollapsed(v=>!v)} />
      <div style={{ marginLeft:sidebarWidth, flex:1, display:'flex',
        flexDirection:'column', minHeight:'100vh', overflow:'hidden' }}>
        <Topbar user={user} pendingAlerts={pendingAlerts} onLogout={onLogout} />
        <main style={{ flex:1, padding:'24px 24px', overflowY:'auto' }}>
          <div style={{ maxWidth:1400, margin:'0 auto' }}>
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
          </div>
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

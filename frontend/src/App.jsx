import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from './store/auth'
import { CSS, PageLoad } from './components/UI'
import SidebarNav from './components/SidebarNav'
import TopbarSecondaryNav from './components/TopbarSecondaryNav'
import { getNavForRole, getNavGroupContext, getPageBreadcrumb } from './config/navConfig'
import {
  Search,
  Bell,
  ChevronUp,
  PanelLeftClose,
  PanelLeft,
  Settings,
  LogOut,
  User,
} from 'lucide-react'
import LandingPage from './pages/LandingPage'
import GISMapPage from './pages/GISMapPage'
import SchoolsPage from './pages/SchoolsPage'
import TeachersPage from './pages/TeachersPage'
import FeedbackPage from './pages/FeedbackPage'
import AlertsPage from './pages/AlertsPage'
import AnalyticsPage from './pages/AnalyticsPage'
import UsersPage from './pages/UsersPage'
import DashboardRouter from './pages/DashboardRouter'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import ReportsPage from './pages/ReportsPage'
import ResourcesPage from './pages/ResourcesPage'
import DistrictsPage from './pages/DistrictsPage'
import GapAnalysisPage from './pages/GapAnalysisPage'
import DataEntryPage from './pages/DataEntryPage'
import NotificationsPage from './pages/NotificationsPage'
import LogsPage from './pages/LogsPage'
import ChatPage from './pages/ChatPage'
import RegistrationsPage from './pages/RegistrationsPage'
import ServiceRequestsPage from './pages/ServiceRequestsPage'
import AdminSettingsPage from './pages/AdminSettingsPage'
import { useTheme } from './store/theme'

const ROLE_LABELS = {
  admin:'System Administrator', reb:'REB Officer', district:'District Officer',
  school:'School Head', enumerator:'Field Enumerator', community:'Community Member'
}

const ROUTE_ROLES = {
  '/schools':   ['admin', 'reb', 'district', 'enumerator', 'school'],
  '/gis':       ['admin', 'reb', 'district', 'enumerator', 'community', 'school'],
  '/teachers':  ['admin', 'reb', 'district', 'school'],
  '/feedback':  ['reb', 'district', 'school', 'community'],
  '/alerts':    ['reb', 'district', 'enumerator'],
  '/analytics': ['admin', 'reb', 'district'],
  '/resources': ['admin', 'reb', 'district', 'school'],
  '/districts': ['admin', 'reb', 'district'],
  '/gap-analysis': ['admin', 'reb', 'district'],
  '/users':     ['admin'],
  '/registrations': ['admin'],
  '/requests':  ['admin', 'reb', 'district', 'school', 'enumerator', 'community'],
  '/admin-settings': ['admin'],
  '/logs':      ['admin'],
  '/chat':      ['admin', 'reb', 'district', 'school', 'enumerator'],
  '/data-entry': ['school'],
  '/notifications': ['school'],
  '/reports':   ['admin', 'reb', 'district', 'school', 'enumerator', 'community'],
}

function ProtectedRoute({ path, user, children }) {
  const roles = ROUTE_ROLES[path]
  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

function Sidebar({ user, pendingAlerts, collapsed, onToggle }) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const nav = getNavForRole(user.role, { pendingAlerts })
  const initials = user.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <aside style={{ width:collapsed?64:240, minWidth:collapsed?64:240, background:'var(--navy)',
      display:'flex', flexDirection:'column', height:'100vh',
      position:'fixed', left:0, top:0, zIndex:100, overflow:'hidden',
      transition:'width 200ms ease, min-width 200ms ease' }}>

      {/* Brand — top row */}
      <div style={{
        padding: collapsed ? '14px 10px' : '14px 14px',
        borderBottom:'1px solid rgba(255,255,255,.08)',
        display:'flex', alignItems:'center', gap:10,
        justifyContent: collapsed ? 'center' : 'flex-start',
        transition:'padding 200ms ease',
      }}>
        <div style={{ width:36, height:36, borderRadius:10, flexShrink:0,
          background:'linear-gradient(135deg,#2563EB,#06B6D4)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:14, fontWeight:700, color:'#fff' }}>EC</div>
        {!collapsed && (
          <div style={{ minWidth:0 }}>
            <div style={{ fontFamily:'var(--font-heading)', fontSize:15, fontWeight:700, color:'#fff', letterSpacing:.3 }}>ECRM</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.38)', marginTop:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              Rwanda · Resource Mapping
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex:1, overflowY:'auto', padding:'10px 10px', transition:'padding 200ms ease' }}>
        {!collapsed && (
          <div style={{ fontSize:10, color:'rgba(255,255,255,.28)', padding:'6px 10px 8px',
            letterSpacing:1.2, textTransform:'uppercase', fontWeight:600 }}>Menu</div>
        )}
        <SidebarNav items={nav} collapsed={collapsed} />
      </nav>

      {/* Collapse + user — bottom */}
      <div style={{ padding:'10px 10px 12px', borderTop:'1px solid rgba(255,255,255,.08)', position:'relative' }}>
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            display:'flex', alignItems:'center', gap:10, width:'100%',
            padding: collapsed ? '9px 0' : '9px 10px',
            marginBottom:8, borderRadius:10,
            border:'1px solid rgba(226,232,240,.12)',
            background:'rgba(255,255,255,.04)',
            color:'rgba(148,163,184,.95)',
            cursor:'pointer',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
        >
          {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
          {!collapsed && <span style={{ fontSize:12.5, fontWeight:600 }}>Collapse menu</span>}
        </button>

        <button
          onClick={() => setMenuOpen(v => !v)}
          style={{
            display:'flex', alignItems:'center', gap:10, width:'100%',
            padding:'9px 10px', borderRadius:10, border:'none',
            background:'rgba(255,255,255,.07)', cursor:'pointer',
          }}
        >
          <div style={{ width:34, height:34, borderRadius:9, flexShrink:0,
            background:'linear-gradient(135deg,#2563EB,#06B6D4)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:11, fontWeight:700, color:'#fff' }}>{initials}</div>
          {!collapsed && (
            <>
              <div style={{ flex:1, minWidth:0, textAlign:'left' }}>
                <div style={{ fontSize:12.5, fontWeight:600, color:'#fff',
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {user.full_name}
                </div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', marginTop:1,
                  textTransform:'uppercase', letterSpacing:.5 }}>
                  {ROLE_LABELS[user.role]}
                </div>
              </div>
              <ChevronUp size={16} style={{ color:'rgba(148,163,184,.85)', transform: menuOpen ? 'rotate(180deg)' : 'none', transition:'transform .15s' }} />
            </>
          )}
        </button>

        {menuOpen && (
          <div style={{
            position:'absolute', bottom:'100%', left:10, right:10, marginBottom:8,
            background:'#1E293B', border:'1px solid rgba(255,255,255,.1)',
            borderRadius:12, overflow:'hidden', boxShadow:'0 12px 40px rgba(0,0,0,.35)', zIndex:200,
          }}>
            {[
              { label:'Profile', icon:User, path:'/profile' },
              { label:'Settings', icon:Settings, path:'/settings' },
            ].map(item => (
              <button
                key={item.path}
                onClick={() => { setMenuOpen(false); navigate(item.path) }}
                style={{
                  display:'flex', alignItems:'center', gap:10, width:'100%',
                  padding:'11px 14px', border:'none', background:'transparent',
                  color:'#F8FAFC', fontSize:13, fontWeight:600, cursor:'pointer', textAlign:'left',
                }}
              >
                <item.icon size={16} /> {item.label}
              </button>
            ))}
            <div style={{ height:1, background:'rgba(255,255,255,.08)' }} />
            <button
              onClick={() => { setMenuOpen(false); handleLogout() }}
              style={{
                display:'flex', alignItems:'center', gap:10, width:'100%',
                padding:'11px 14px', border:'none', background:'transparent',
                color:'#FCA5A5', fontSize:13, fontWeight:600, cursor:'pointer', textAlign:'left',
              }}
            >
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}

function Topbar({ pendingAlerts, user }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const navOpts = { pendingAlerts }
  const breadcrumb = getPageBreadcrumb(user?.role, location.pathname, navOpts)
  const groupCtx = getNavGroupContext(user?.role, location.pathname, navOpts)

  const pageName = {
    '/dashboard':'Dashboard', '/schools':'Schools', '/gis':'GIS Map — Geospatial View',
    '/teachers':'Teacher Management', '/feedback':'Feedback & Reports',
    '/alerts':'Resource Alerts', '/analytics':'Analytics', '/users':'User Management',
    '/profile':'Profile', '/settings':'Settings', '/reports':'Reports',
    '/logs':'Audit Logs', '/chat':'Team Chat',
    '/registrations':'Pending Registrations', '/requests':'Service Requests',
    '/admin-settings':'System Settings', '/gap-analysis':'Gap Analysis',
    '/resources':'Resource inventory', '/districts':'Districts',
    '/data-entry':'Data Entry', '/notifications':'Alerts & updates',
  }[location.pathname] || 'ECRM'

  const title = breadcrumb?.group
    ? `${breadcrumb.root} · ${breadcrumb.group}`
    : breadcrumb?.root || pageName

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    setSearch(params.get('q') || '')
  }, [location.search])

  const submitSearch = (event) => {
    event.preventDefault()
    const query = search.trim()
    if (!query) return
    const target = location.pathname === '/teachers' ? '/teachers'
      : location.pathname === '/feedback' ? '/feedback'
      : location.pathname === '/alerts' ? '/alerts'
      : '/schools'
    navigate(`${target}?q=${encodeURIComponent(query)}`)
  }

  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 50, flexShrink: 0 }}>
      <header
        style={{
          height: 62,
          background: 'var(--topbar)',
          borderBottom: groupCtx ? 'none' : '1px solid var(--border)',
          display: 'grid',
          gridTemplateColumns: 'minmax(220px,1fr) 400px auto',
          alignItems: 'center',
          padding: '0 24px',
          gap: 14,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {title}
          </h1>
        </div>

      <form onSubmit={submitSearch} style={{ display:'flex', alignItems:'center' }}>
        <div
          style={{
            width:'100%',
            display:'flex',
            alignItems:'center',
            gap:10,
            background:'var(--card)',
            border:'1.5px solid var(--border)',
            borderRadius:12,
            padding:'10px 12px',
            transition:'border-color 150ms ease, box-shadow 150ms ease',
          }}
        >
          <Search size={16} style={{ color:'#94A3B8', flexShrink:0 }} />
          <input
            value={search}
            onChange={e=>setSearch(e.target.value)}
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
          {search && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={()=>{ setSearch(''); navigate(location.pathname) }}
              style={{ border:'none', background:'transparent', color:'#94A3B8', cursor:'pointer', fontWeight:800 }}
            >
              x
            </button>
          )}
        </div>
      </form>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:12 }}>
        <button
          aria-label="Notifications"
          onClick={() => navigate(user?.role === 'school' ? '/notifications' : '/alerts')}
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
          <Bell size={18} style={{ color:'var(--text)' }} />
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
                border:'2px solid var(--topbar)',
              }}
            >
              {pendingAlerts}
            </span>
          )}
        </button>
      </div>
    </header>
      {groupCtx && (
        <TopbarSecondaryNav
          groupLabel={groupCtx.group.label}
          items={groupCtx.children}
        />
      )}
    </div>
  )
}

function AppShell({ user }) {
  const [pendingAlerts, setPendingAlerts] = useState(0)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('ecrm-sidebar-collapsed')
      if (saved !== null) return saved === '1'
    } catch { /* ignore */ }
    return window.innerWidth < 1024
  })
  const { init: initTheme } = useTheme()

  useEffect(() => { initTheme() }, [initTheme])

  useEffect(() => {
    if (!['reb','district','school'].includes(user?.role)) return
    import('./api/api').then(({ alertsAPI }) => {
      const params = { resolved: false }
      if (user?.role === 'school' && user.school_id) params.school_id = user.school_id
      if (user?.role === 'district' && user.district) params.district = user.district
      alertsAPI.list(params).then(r => {
        setPendingAlerts(r.data?.length || 0)
      }).catch(() => {})
    })
  }, [user?.role, user?.school_id, user?.district])

  useEffect(() => {
    try { localStorage.setItem('ecrm-sidebar-collapsed', collapsed ? '1' : '0') } catch { /* ignore */ }
  }, [collapsed])

  const toggleSidebar = () => setCollapsed(v => !v)

  const sidebarWidth = collapsed ? 64 : 240

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      <Sidebar user={user} pendingAlerts={pendingAlerts} collapsed={collapsed} onToggle={toggleSidebar} />
      <div style={{ marginLeft:sidebarWidth, flex:1, display:'flex',
        flexDirection:'column', minHeight:'100vh', overflow:'hidden' }}>
        <Topbar pendingAlerts={pendingAlerts} user={user} />
        <main style={{ flex:1, padding:'24px 24px', overflowY:'auto' }}>
          <div style={{ maxWidth:1400, margin:'0 auto' }}>
            <Routes>
              <Route path="/dashboard" element={<DashboardRouter />} />
              <Route path="/gis"       element={<ProtectedRoute path="/gis" user={user}><GISMapPage /></ProtectedRoute>} />
              <Route path="/schools"   element={<ProtectedRoute path="/schools" user={user}><SchoolsPage /></ProtectedRoute>} />
              <Route path="/teachers"  element={<ProtectedRoute path="/teachers" user={user}><TeachersPage /></ProtectedRoute>} />
              <Route path="/feedback"  element={<ProtectedRoute path="/feedback" user={user}><FeedbackPage /></ProtectedRoute>} />
              <Route path="/alerts"    element={<ProtectedRoute path="/alerts" user={user}><AlertsPage /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute path="/analytics" user={user}><AnalyticsPage /></ProtectedRoute>} />
              <Route path="/users"     element={<ProtectedRoute path="/users" user={user}><UsersPage /></ProtectedRoute>} />
              <Route path="/registrations" element={<ProtectedRoute path="/registrations" user={user}><RegistrationsPage /></ProtectedRoute>} />
              <Route path="/requests" element={<ProtectedRoute path="/requests" user={user}><ServiceRequestsPage /></ProtectedRoute>} />
              <Route path="/admin-settings" element={<ProtectedRoute path="/admin-settings" user={user}><AdminSettingsPage /></ProtectedRoute>} />
              <Route path="/profile"   element={<ProfilePage />} />
              <Route path="/settings"  element={<SettingsPage />} />
              <Route path="/reports"   element={<ProtectedRoute path="/reports" user={user}><ReportsPage /></ProtectedRoute>} />
              <Route path="/resources" element={<ProtectedRoute path="/resources" user={user}><ResourcesPage /></ProtectedRoute>} />
              <Route path="/districts" element={<ProtectedRoute path="/districts" user={user}><DistrictsPage /></ProtectedRoute>} />
              <Route path="/gap-analysis" element={<ProtectedRoute path="/gap-analysis" user={user}><GapAnalysisPage /></ProtectedRoute>} />
              <Route path="/data-entry" element={<ProtectedRoute path="/data-entry" user={user}><DataEntryPage /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute path="/notifications" user={user}><NotificationsPage /></ProtectedRoute>} />
              <Route path="/logs"      element={<ProtectedRoute path="/logs" user={user}><LogsPage /></ProtectedRoute>} />
              <Route path="/chat"      element={<ProtectedRoute path="/chat" user={user}><ChatPage /></ProtectedRoute>} />
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
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/*" element={user ? <AppShell user={user} /> : <Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

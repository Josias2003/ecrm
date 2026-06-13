import {
  LayoutDashboard, School, Map as MapIcon, UserRound, Package, MapPinned,
  MessageSquare, BellRing, FileText, Scale, BarChart3, Users as UsersIcon,
  UserPlus, Wrench, MessagesSquare, ScrollText, Settings, ClipboardList,
  ClipboardPen, Flag, Search, Layers, LineChart, Shield,
} from 'lucide-react'

/** @returns {NavEntry[]} */
export function getNavForRole(role, { pendingAlerts = 0 } = {}) {
  const alertBadge = pendingAlerts > 0 ? pendingAlerts : undefined

  const configs = {
    admin: [
      { type: 'link', path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
      { type: 'link', path: '/gis', label: 'GIS Map', icon: MapIcon, highlight: true },
      { type: 'link', path: '/schools', label: 'Schools', icon: School },
      {
        type: 'group', id: 'education', label: 'Education', icon: Layers,
        children: [
          { path: '/teachers', label: 'Teachers', icon: UserRound },
          { path: '/resources', label: 'Resources', icon: Package },
          { path: '/districts', label: 'Districts', icon: MapPinned },
        ],
      },
      {
        type: 'group', id: 'users-access', label: 'Users', icon: UsersIcon,
        children: [
          { path: '/users', label: 'Manage users', icon: UsersIcon },
          { path: '/registrations', label: 'Registrations', icon: UserPlus },
        ],
      },
      {
        type: 'group', id: 'insights', label: 'Insights', icon: LineChart,
        children: [
          { path: '/analytics', label: 'Analytics', icon: BarChart3 },
          { path: '/gap-analysis', label: 'Gap Analysis', icon: Scale },
          { path: '/reports', label: 'Reports', icon: FileText },
        ],
      },
      {
        type: 'group', id: 'system', label: 'System', icon: Shield,
        children: [
          { path: '/logs', label: 'Audit logs', icon: ScrollText },
          { path: '/requests', label: 'Service requests', icon: Wrench },
          { path: '/admin-settings', label: 'Platform settings', icon: Settings },
        ],
      },
      { type: 'link', path: '/chat', label: 'Team Chat', icon: MessagesSquare },
    ],

    reb: [
      { type: 'link', path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { type: 'link', path: '/gis', label: 'GIS Map', icon: MapIcon, highlight: true },
      { type: 'link', path: '/schools', label: 'Schools', icon: School },
      {
        type: 'group', id: 'education', label: 'Education', icon: Layers,
        children: [
          { path: '/teachers', label: 'Teachers', icon: UserRound },
          { path: '/resources', label: 'Resources', icon: Package },
          { path: '/districts', label: 'Districts', icon: MapPinned },
        ],
      },
      { type: 'link', path: '/feedback', label: 'Feedback', icon: MessageSquare },
      {
        type: 'group', id: 'operations', label: 'Operations', icon: BellRing,
        children: [
          { path: '/alerts', label: 'Alerts', icon: BellRing, badge: alertBadge },
        ],
      },
      {
        type: 'group', id: 'insights', label: 'Insights', icon: LineChart,
        children: [
          { path: '/analytics', label: 'Analytics', icon: BarChart3 },
          { path: '/gap-analysis', label: 'Gap Analysis', icon: Scale },
          { path: '/reports', label: 'Reports', icon: FileText },
        ],
      },
      { type: 'link', path: '/chat', label: 'Team Chat', icon: MessagesSquare },
    ],

    district: [
      { type: 'link', path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { type: 'link', path: '/schools', label: 'My Schools', icon: School },
      { type: 'link', path: '/gis', label: 'District Map', icon: MapIcon, highlight: true },
      { type: 'link', path: '/teachers', label: 'Teachers', icon: UserRound },
      {
        type: 'group', id: 'resources-cases', label: 'Resources & cases', icon: Package,
        children: [
          { path: '/resources', label: 'Resources', icon: Package },
          { path: '/feedback', label: 'Feedback', icon: MessageSquare },
          { path: '/alerts', label: 'Alerts', icon: BellRing, badge: alertBadge },
        ],
      },
      {
        type: 'group', id: 'insights', label: 'Insights', icon: LineChart,
        children: [
          { path: '/analytics', label: 'Analytics', icon: BarChart3 },
          { path: '/reports', label: 'Reports', icon: FileText },
          { path: '/gap-analysis', label: 'Gap Analysis', icon: Scale },
          { path: '/districts', label: 'Districts', icon: MapPinned },
        ],
      },
      { type: 'link', path: '/chat', label: 'Team Chat', icon: MessagesSquare },
    ],

    school: [
      { type: 'link', path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { type: 'link', path: '/schools', label: 'My School', icon: School },
      { type: 'link', path: '/teachers', label: 'Teachers', icon: UserRound },
      { type: 'link', path: '/feedback', label: 'Feedback', icon: MessageSquare },
      {
        type: 'group', id: 'school-ops', label: 'School ops', icon: ClipboardPen,
        children: [
          { path: '/resources', label: 'Resources', icon: Package },
          { path: '/data-entry', label: 'Data Entry', icon: ClipboardPen },
          { path: '/notifications', label: 'Alerts & updates', icon: BellRing, badge: alertBadge },
        ],
      },
      {
        type: 'group', id: 'more', label: 'More', icon: FileText,
        children: [
          { path: '/reports', label: 'Reports', icon: FileText },
          { path: '/requests', label: 'Service requests', icon: Wrench },
        ],
      },
      { type: 'link', path: '/chat', label: 'Team Chat', icon: MessagesSquare },
    ],

    enumerator: [
      { type: 'link', path: '/dashboard', label: 'Collect Data', icon: ClipboardList },
      { type: 'link', path: '/schools', label: 'Schools', icon: School },
      { type: 'link', path: '/gis', label: 'Field Map', icon: MapIcon, highlight: true },
      { type: 'link', path: '/reports', label: 'Reports', icon: FileText },
      { type: 'link', path: '/chat', label: 'Team Chat', icon: MessagesSquare },
    ],

    community: [
      { type: 'link', path: '/dashboard', label: 'Report Issue', icon: Flag },
      { type: 'link', path: '/feedback', label: 'My Reports', icon: Search },
      { type: 'link', path: '/gis', label: 'School Map', icon: MapIcon, highlight: true },
      { type: 'link', path: '/reports', label: 'Reports', icon: FileText },
    ],
  }

  return configs[role] || configs.community
}

export function isGroupActive(children, pathname) {
  return children.some(c => pathname === c.path || pathname.startsWith(`${c.path}/`))
}

/** Active nav group context for topbar secondary menu */
export function getNavGroupContext(role, pathname, options = {}) {
  const nav = getNavForRole(role, options)
  for (const entry of nav) {
    if (entry.type === 'group' && isGroupActive(entry.children, pathname)) {
      return { group: entry, children: entry.children }
    }
  }
  return null
}

/** Breadcrumb: group label + current page label */
export function getPageBreadcrumb(role, pathname, options = {}) {
  const nav = getNavForRole(role, options)
  for (const entry of nav) {
    if (entry.type === 'link' && (pathname === entry.path || pathname.startsWith(`${entry.path}/`))) {
      return { root: entry.label, group: null }
    }
    if (entry.type === 'group') {
      const child = entry.children.find(c => pathname === c.path || pathname.startsWith(`${c.path}/`))
      if (child) return { root: entry.label, group: child.label }
    }
  }
  return null
}

import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { isGroupActive } from '../config/navConfig'

const linkStyle = (isActive, collapsed, indent = 0) => ({
  display: 'flex', alignItems: 'center', gap: 10,
  padding: collapsed ? '8px 10px' : `8px 10px 8px ${10 + indent}px`,
  borderRadius: 10, marginBottom: 2, fontSize: 13, fontWeight: 500,
  color: isActive ? '#F8FAFC' : 'rgba(148,163,184,.92)',
  background: isActive ? 'rgba(59,130,246,0.08)' : 'transparent',
  borderLeft: isActive ? '3px solid #3B82F6' : '3px solid transparent',
  textDecoration: 'none', transition: 'all .15s',
  justifyContent: collapsed ? 'center' : 'flex-start',
})

function NavIcon({ icon: Icon, active }) {
  return (
    <span style={{
      width: 20, textAlign: 'center', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: active ? '#F8FAFC' : 'rgba(148,163,184,.92)',
    }}>
      <Icon size={20} />
    </span>
  )
}

function NavLeaf({ item, collapsed, indent = 0 }) {
  return (
    <NavLink to={item.path}
      title={collapsed ? item.label : undefined}
      style={({ isActive }) => linkStyle(isActive, collapsed, indent)}>
      {({ isActive }) => (
        <>
          <NavIcon icon={item.icon} active={isActive} />
          {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
          {!collapsed && item.badge != null && item.badge > 0 && (
            <span style={{
              background: 'var(--red)', color: '#fff', fontSize: 10,
              fontWeight: 700, padding: '2px 6px', borderRadius: 20, minWidth: 18, textAlign: 'center',
            }}>{item.badge}</span>
          )}
          {item.highlight && !isActive && !collapsed && (
            <span style={{
              background: 'rgba(6,182,212,.2)', color: '#06B6D4',
              fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
            }}>GIS</span>
          )}
        </>
      )}
    </NavLink>
  )
}

function NavGroup({ group, collapsed }) {
  const { pathname } = useLocation()
  const childActive = isGroupActive(group.children, pathname)
  const [open, setOpen] = useState(childActive)
  const [hover, setHover] = useState(false)
  const Icon = group.icon
  const expanded = open || hover

  useEffect(() => {
    if (childActive) setOpen(true)
  }, [childActive])

  return (
    <div
      style={{ marginBottom: 2 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        type="button"
        title={collapsed ? group.label : undefined}
        aria-expanded={expanded}
        onClick={() => setOpen(v => !v)}
        style={{
          ...linkStyle(childActive, collapsed),
          width: '100%',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          background: childActive || expanded ? 'rgba(59,130,246,0.06)' : 'transparent',
        }}
      >
        <NavIcon icon={Icon} active={childActive} />
        {!collapsed && (
          <>
            <span style={{ flex: 1 }}>{group.label}</span>
            <ChevronDown size={14} style={{
              opacity: 0.6,
              transform: expanded ? 'rotate(180deg)' : 'none',
              transition: 'transform .15s',
              flexShrink: 0,
            }} />
          </>
        )}
      </button>

      {expanded && group.children.map(child => (
        <NavLeaf key={child.path} item={child} collapsed={collapsed} indent={collapsed ? 0 : 14} />
      ))}
    </div>
  )
}

export default function SidebarNav({ items, collapsed }) {
  return (
    <>
      {items.map(entry => {
        if (entry.type === 'group') {
          return <NavGroup key={entry.id} group={entry} collapsed={collapsed} />
        }
        return <NavLeaf key={entry.path} item={entry} collapsed={collapsed} />
      })}
    </>
  )
}

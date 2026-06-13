import { NavLink } from 'react-router-dom'

export default function TopbarSecondaryNav({ items, groupLabel }) {
  if (!items?.length) return null

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '0 24px 12px',
      borderTop: '1px solid var(--border)',
      background: 'var(--topbar)',
      flexWrap: 'wrap',
    }}>
      <span style={{
        fontSize: 11, fontWeight: 700, color: 'var(--text2)',
        textTransform: 'uppercase', letterSpacing: 0.8, marginRight: 8,
      }}>
        {groupLabel}
      </span>
      {items.map(item => (
        <NavLink
          key={item.path}
          to={item.path}
          style={({ isActive }) => ({
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
            color: isActive ? 'var(--text)' : 'var(--text2)',
            background: isActive ? 'var(--card)' : 'transparent',
            border: isActive ? '1px solid var(--border)' : '1px solid transparent',
            boxShadow: isActive ? 'var(--sh-sm)' : 'none',
          })}
        >
          {item.label}
          {item.badge != null && item.badge > 0 && (
            <span style={{
              background: 'var(--red)', color: '#fff', fontSize: 10,
              fontWeight: 700, padding: '1px 6px', borderRadius: 20,
            }}>{item.badge}</span>
          )}
        </NavLink>
      ))}
    </div>
  )
}

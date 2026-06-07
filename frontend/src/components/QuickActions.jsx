import { useNavigate } from 'react-router-dom'

export default function QuickActions({ actions }) {
  const navigate = useNavigate()
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
      gap: 14,
      marginBottom: 22,
    }}>
      {actions.map(({ label, sub, icon: Icon, path, onClick, color = '#2563EB' }) => (
        <button
          key={label}
          type="button"
          onClick={() => (onClick ? onClick() : navigate(path))}
          style={{
            textAlign: 'left',
            padding: '18px 16px',
            borderRadius: 14,
            border: '1px solid var(--border)',
            background: 'var(--card)',
            cursor: 'pointer',
            boxShadow: 'var(--sh-sm)',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = 'var(--sh)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = ''
            e.currentTarget.style.boxShadow = 'var(--sh-sm)'
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 10, marginBottom: 12,
            background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={20} color={color} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>{sub}</div>
        </button>
      ))}
    </div>
  )
}

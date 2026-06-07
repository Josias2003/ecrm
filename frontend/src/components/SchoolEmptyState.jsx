import { School } from 'lucide-react'
import { Btn } from './UI'

export default function SchoolEmptyState({ title = 'No school assigned', message, action }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: 420, padding: 40, textAlign: 'center',
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: 20, background: 'var(--bg2)',
        border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 20,
      }}>
        <School size={36} color="var(--text3)" strokeWidth={1.5} />
      </div>
      <h2 style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800, margin: '0 0 10px', color: 'var(--text)' }}>
        {title}
      </h2>
      <p style={{ fontSize: 14, color: 'var(--text2)', maxWidth: 400, lineHeight: 1.6, margin: '0 0 20px' }}>
        {message || 'Contact your district administrator to assign you to a school.'}
      </p>
      {action}
    </div>
  )
}

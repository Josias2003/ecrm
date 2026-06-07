import { Modal, Badge, Btn } from './UI'
import { Users, BookOpen, MapPin, Building2 } from 'lucide-react'

export default function SchoolDetailModal({ school, open, onClose, onEdit }) {
  if (!school) return null
  const stu = (school.students_boys || 0) + (school.students_girls || 0)
  const tea = (school.teachers_male || 0) + (school.teachers_female || 0)
  const ratio = stu && tea ? (stu / tea).toFixed(1) : '—'

  const metrics = [
    { label: 'Students', value: stu, sub: `${school.students_boys || 0} boys · ${school.students_girls || 0} girls`, icon: Users },
    { label: 'Teachers', value: tea, sub: `${school.teachers_male || 0}M · ${school.teachers_female || 0}F`, icon: Users },
    { label: 'P:T Ratio', value: `1:${ratio}`, sub: 'Pupil to teacher', icon: Building2 },
    { label: 'Classrooms', value: school.classrooms || 0, sub: `${school.classrooms_good || 0} usable`, icon: Building2 },
    { label: 'Textbooks', value: school.textbooks || 0, icon: BookOpen },
    { label: 'Desks', value: school.desks || 0, icon: Building2 },
  ]

  const facilities = [
    ['Library', school.has_library],
    ['ICT Lab', school.has_ict_lab],
    ['Science Lab', school.has_science_lab],
    ['Water', school.has_water],
    ['Electricity', school.has_electricity],
    ['Internet', school.has_internet],
    ['Fence', school.has_fence],
    ['Canteen', school.has_canteen],
  ]

  return (
    <Modal open={open} onClose={onClose} title={school.name} width={640}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <Badge status={school.status} size="lg" />
        <Badge status={school.school_type} size="lg" dot={false} />
        <Badge status={school.ownership} size="lg" dot={false} />
        {school.gps_verified
          ? <Badge status="good" label="GPS Verified" size="lg" />
          : <Badge status="pending" label="GPS Unverified" size="lg" />}
      </div>

      <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
        {school.district} · {school.sector} · {school.school_type}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
        {metrics.map(({ label, value, sub, icon: Icon }) => (
          <div key={label} style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase' }}>{label}</span>
              <Icon size={14} style={{ color: 'var(--blue)' }} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{value}</div>
            {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{sub}</div>}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {facilities.map(([label, ok]) => (
          <span key={label} style={{
            padding: '4px 11px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: ok ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.1)',
            color: ok ? '#065F46' : '#991B1B',
          }}>
            {ok ? 'Available' : 'Missing'} · {label}
          </span>
        ))}
      </div>

      {school.latitude && (
        <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px', fontSize: 13, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>
            <MapPin size={14} /> GPS Coordinates
          </div>
          <div style={{ fontFamily: 'monospace' }}>
            {Number(school.latitude).toFixed(6)}, {Number(school.longitude).toFixed(6)}
          </div>
          {school.distance_to_road_km != null && (
            <div style={{ marginTop: 6, color: 'var(--text2)' }}>
              {school.distance_to_road_km} km to nearest road
            </div>
          )}
        </div>
      )}

      {onEdit && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
          <Btn variant="outline" onClick={() => { onClose(); onEdit(school) }}>Edit GPS</Btn>
        </div>
      )}
    </Modal>
  )
}

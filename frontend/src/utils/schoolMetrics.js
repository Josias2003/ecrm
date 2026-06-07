/** Display helpers — metrics come from API / database (SchoolOut fields). */

export function schoolCode(school) {
  return school?.school_code || (school?.id ? `SCH-${String(school.id).padStart(3, '0')}` : '—')
}

export function infrastructureScore(school) {
  return school?.infrastructure_score ?? 0
}

export function connectivityLabel(school) {
  return school?.connectivity_label || 'None'
}

export function totalStudents(school) {
  if (school?.total_students != null) return school.total_students
  return (school?.students_boys || 0) + (school?.students_girls || 0)
}

export function scoreColor(pct) {
  if (pct >= 80) return '#10B981'
  if (pct >= 60) return '#2563EB'
  if (pct >= 40) return '#F59E0B'
  return '#EF4444'
}

export function connectivityBadgeStatus(label) {
  if (!label || label === 'None') return 'critical'
  if (label.includes('Internet &')) return 'good'
  return 'moderate'
}

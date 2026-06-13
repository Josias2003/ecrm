/** Role-based UI capabilities — must mirror backend route guards */

export function canSubmitServiceRequest(role) {
  return role && role !== 'admin'
}

export function canManageServiceRequests(role) {
  return role === 'admin'
}

export function canResolveAlerts(role) {
  return ['reb', 'district'].includes(role)
}

export function canForwardAlerts(role) {
  return role === 'district'
}

export function canRegisterSchool(role) {
  return ['admin', 'district', 'enumerator'].includes(role)
}

export function canEditSchool(role, schoolId, user) {
  if (role === 'admin') return true
  if (role === 'district' || role === 'enumerator') return true
  if (role === 'school') return schoolId === user?.school_id
  return false
}

export function canDeleteSchool(role) {
  return ['admin', 'district'].includes(role)
}

export function canManageTeachers(role) {
  return ['admin', 'district', 'school'].includes(role)
}

export function canReviewFeedback(role) {
  return ['reb', 'district'].includes(role)
}

export function canSubmitFeedback(role) {
  return ['community', 'school'].includes(role)
}

export function canUseDataEntry(role) {
  return role === 'school' && !!role
}

export function canCreateChatRoom(role) {
  return ['reb', 'district'].includes(role)
}

export function canAccessAdminSettings(role) {
  return role === 'admin'
}

export function canAssignReportTasks(role) {
  return ['admin', 'reb', 'district'].includes(role)
}

export function canReceiveReportTasks(role) {
  return ['district', 'school', 'enumerator'].includes(role)
}

export function formatLabel(value) {
  if (!value) return '—'
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

export function formatColumnKey(key) {
  return formatLabel(key)
}

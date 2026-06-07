import { Pencil, Trash2, Eye } from 'lucide-react'

const btnStyle = {
  width: 32,
  height: 32,
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--card)',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--text2)',
}

export default function IconActions({ onView, onEdit, onDelete, showView = true, showEdit = true, showDelete = true }) {
  return (
    <div style={{ display: 'flex', gap: 5 }}>
      {showView && onView && (
        <button type="button" title="View" aria-label="View" style={btnStyle} onClick={onView}>
          <Eye size={15} />
        </button>
      )}
      {showEdit && onEdit && (
        <button type="button" title="Edit" aria-label="Edit" style={btnStyle} onClick={onEdit}>
          <Pencil size={15} />
        </button>
      )}
      {showDelete && onDelete && (
        <button type="button" title="Delete" aria-label="Delete" style={{ ...btnStyle, color: '#EF4444' }} onClick={onDelete}>
          <Trash2 size={15} />
        </button>
      )}
    </div>
  )
}

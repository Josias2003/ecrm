import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { chatAPI } from '../api/api'
import { useAuth } from '../store/auth'
import { PageHeader, Card, CardBody, Btn, Textarea, Modal, Field, Input, Select } from '../components/UI'
import { Search, X, Reply } from 'lucide-react'
import toast from 'react-hot-toast'
import { CHAT_PRESETS } from '../constants/rebDefaults'
import { formatLabel } from '../utils/format'

const ROOM_CATEGORIES = [
  { key: 'national', label: 'National' },
  { key: 'role_group', label: 'By role' },
  { key: 'district_group', label: 'District head masters' },
  { key: 'district', label: 'District teams' },
  { key: 'custom_group', label: 'Other groups' },
  { key: 'direct', label: 'Direct messages' },
]

function groupRooms(rooms) {
  const buckets = Object.fromEntries(ROOM_CATEGORIES.map(c => [c.key, []]))
  for (const r of rooms) {
    const key = r.scope === 'direct' ? 'direct' : r.scope
    if (buckets[key]) buckets[key].push(r)
  }
  return ROOM_CATEGORIES
    .map(c => ({ ...c, rooms: buckets[c.key] }))
    .filter(g => g.rooms.length > 0)
}

export default function ChatPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [roomId, setRoomId] = useState(null)
  const [text, setText] = useState('')
  const [search, setSearch] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [showContacts, setShowContacts] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [roomTitle, setRoomTitle] = useState('')
  const [roomPreset, setRoomPreset] = useState('')
  const bottomRef = useRef(null)
  const canCreateRoom = ['reb', 'district'].includes(user?.role)

  const { data: rooms = [] } = useQuery({
    queryKey: ['chat-rooms'],
    queryFn: () => chatAPI.rooms().then(r => r.data),
    refetchInterval: 15000,
  })

  const { data: contacts = [] } = useQuery({
    queryKey: ['chat-contacts'],
    queryFn: () => chatAPI.contacts().then(r => r.data),
    enabled: ['reb', 'district', 'school', 'enumerator'].includes(user?.role),
  })

  const { data: apiPresets = [], isError: presetsError } = useQuery({
    queryKey: ['chat-presets'],
    queryFn: () => chatAPI.presets().then(r => r.data),
    enabled: canCreateRoom,
    retry: 1,
  })
  const presets = apiPresets.length ? apiPresets : CHAT_PRESETS

  const groupedRooms = useMemo(() => groupRooms(rooms), [rooms])

  const q = search.trim().toLowerCase()
  const filteredGroups = useMemo(() => {
    if (!q) return groupedRooms
    return groupedRooms
      .map(g => ({
        ...g,
        rooms: g.rooms.filter(r =>
          r.title.toLowerCase().includes(q) ||
          g.label.toLowerCase().includes(q) ||
          (r.district || '').toLowerCase().includes(q),
        ),
      }))
      .filter(g => g.rooms.length > 0)
  }, [groupedRooms, q])

  const filteredContacts = useMemo(() => {
    if (!q) return contacts
    return contacts.filter(c =>
      c.full_name.toLowerCase().includes(q) ||
      c.role.toLowerCase().includes(q) ||
      (c.district || '').toLowerCase().includes(q),
    )
  }, [contacts, q])

  useEffect(() => {
    if (!roomId && rooms.length) setRoomId(rooms[0].id)
  }, [rooms, roomId])

  const { data: messages = [] } = useQuery({
    queryKey: ['chat-messages', roomId],
    queryFn: () => chatAPI.messages(roomId).then(r => r.data),
    enabled: !!roomId,
    refetchInterval: 5000,
  })

  const filteredMessages = useMemo(() => {
    if (!q) return messages
    return messages.filter(m =>
      m.content.toLowerCase().includes(q) ||
      (m.author_name || '').toLowerCase().includes(q),
    )
  }, [messages, q])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, roomId])

  const sendM = useMutation({
    mutationFn: (payload) => chatAPI.send(roomId, payload),
    onSuccess: () => {
      setText('')
      setReplyTo(null)
      qc.invalidateQueries(['chat-messages', roomId])
    },
    onError: e => toast.error(e.response?.data?.detail || 'Send failed'),
  })

  const startDirect = useMutation({
    mutationFn: (userId) => chatAPI.direct(userId),
    onSuccess: (r) => {
      qc.invalidateQueries(['chat-rooms'])
      setRoomId(r.data.id)
      setShowContacts(false)
      toast.success('Direct chat opened')
    },
    onError: e => toast.error(e.response?.data?.detail || 'Could not start chat'),
  })

  const createRoomM = useMutation({
    mutationFn: (data) => chatAPI.createRoom(data),
    onSuccess: (r) => {
      qc.invalidateQueries(['chat-rooms'])
      setRoomId(r.data.id)
      setCreateOpen(false)
      setRoomTitle('')
      setRoomPreset('')
      toast.success('Group created')
    },
    onError: e => toast.error(e.response?.data?.detail || 'Could not create room'),
  })

  const activeRoom = rooms.find(r => r.id === roomId)

  const handleSend = () => {
    if (!text.trim() || !roomId) return
    sendM.mutate({
      content: text.trim(),
      reply_to_id: replyTo?.id || undefined,
    })
  }

  return (
    <div>
      <PageHeader
        title="Team Chat"
        sub="Rooms grouped by category · Reply to any message · Search rooms and messages"
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            {canCreateRoom && (
              <Btn variant="outline" onClick={() => setCreateOpen(true)}>+ Create group</Btn>
            )}
            {contacts.length > 0 && (
              <Btn variant="outline" onClick={() => setShowContacts(v => !v)}>
                {showContacts ? 'Hide contacts' : 'Message someone'}
              </Btn>
            )}
          </div>
        }
      />

      <div style={{ marginBottom: 14, position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
        <Input
          placeholder="Search rooms, people, or messages..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: 38, maxWidth: '100%' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: showContacts ? '220px 260px 1fr' : '260px 1fr', gap: 16, minHeight: 480 }}>
        {showContacts && (
          <Card hover={false}>
            <CardBody style={{ padding: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', marginBottom: 10 }}>Contacts</div>
              {filteredContacts.map(c => (
                <button
                  key={c.id}
                  onClick={() => startDirect.mutate(c.id)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '8px 10px', marginBottom: 6, borderRadius: 8,
                    border: '1px solid var(--border)', background: 'var(--bg2)',
                    cursor: 'pointer', fontSize: 12,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{c.full_name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)' }}>{formatLabel(c.role)}{c.district ? ` · ${c.district}` : ''}</div>
                </button>
              ))}
              {filteredContacts.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>No contacts match</div>
              )}
            </CardBody>
          </Card>
        )}

        <Card hover={false}>
          <CardBody style={{ padding: 12, maxHeight: 520, overflowY: 'auto' }}>
            {filteredGroups.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--text3)' }}>
                {q ? 'No rooms match your search' : `No rooms yet${canCreateRoom ? ' — create a group' : ''}`}
              </div>
            )}
            {filteredGroups.map(group => (
              <div key={group.key} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, paddingLeft: 2 }}>
                  {group.label}
                </div>
                {group.rooms.map(r => (
                  <button
                    key={r.id}
                    onClick={() => { setRoomId(r.id); setReplyTo(null) }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '9px 12px', marginBottom: 5, borderRadius: 10,
                      border: roomId === r.id ? '1px solid var(--blue)' : '1px solid var(--border)',
                      background: roomId === r.id ? 'var(--blue-lt)' : 'var(--bg2)',
                      cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    }}
                  >
                    {r.title}
                    {r.district && group.key !== 'district' && (
                      <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500, marginTop: 2 }}>{r.district}</div>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </CardBody>
        </Card>

        <Card hover={false}>
          <CardBody style={{ display: 'flex', flexDirection: 'column', height: 520, padding: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>{activeRoom?.title || 'Select a room'}</div>
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12, paddingRight: 4 }}>
              {filteredMessages.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: 24 }}>
                  {q ? 'No messages match your search' : 'No messages yet'}
                </div>
              )}
              {filteredMessages.map(m => {
                const mine = m.user_id === user?.id
                return (
                  <div key={m.id} style={{ marginBottom: 14, textAlign: mine ? 'right' : 'left' }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>
                      {m.author_name} · {formatLabel(m.author_role)}
                    </div>
                    <div style={{
                      display: 'inline-block', maxWidth: '78%', padding: '10px 12px', borderRadius: 12,
                      background: mine ? 'var(--blue)' : 'var(--bg)',
                      color: mine ? '#fff' : 'var(--text)',
                      border: mine ? 'none' : '1px solid var(--border)',
                      fontSize: 13, textAlign: 'left',
                    }}>
                      {m.reply_to_id && (
                        <div style={{
                          fontSize: 11, padding: '6px 8px', borderRadius: 8, marginBottom: 8,
                          background: mine ? 'rgba(255,255,255,.15)' : 'var(--bg2)',
                          borderLeft: `3px solid ${mine ? '#fff' : 'var(--blue)'}`,
                        }}>
                          <div style={{ fontWeight: 600, opacity: 0.9 }}>{m.reply_author_name}</div>
                          <div style={{ opacity: 0.75, marginTop: 2 }}>{m.reply_content}</div>
                        </div>
                      )}
                      {m.content}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                      <span style={{ fontSize: 10, color: 'var(--text3)' }}>
                        {m.created_at?.replace('T', ' ').slice(0, 16)}
                      </span>
                      <button
                        onClick={() => setReplyTo(m)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: 10, color: 'var(--blue)', background: 'none', border: 'none',
                          cursor: 'pointer', fontWeight: 600, padding: 0,
                        }}
                      >
                        <Reply size={11} /> Reply
                      </button>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {replyTo && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8,
                padding: '8px 10px', borderRadius: 8, background: 'var(--blue-lt)',
                border: '1px solid var(--blue-md)',
              }}>
                <div style={{ flex: 1, fontSize: 12 }}>
                  <div style={{ fontWeight: 600, color: 'var(--blue)' }}>Replying to {replyTo.author_name}</div>
                  <div style={{ color: 'var(--text2)', marginTop: 2 }}>{replyTo.content?.slice(0, 80)}{replyTo.content?.length > 80 ? '…' : ''}</div>
                </div>
                <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2 }}>
                  <X size={14} />
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <Textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={replyTo ? 'Write your reply...' : 'Type a message...'}
                style={{ minHeight: 44, flex: 1 }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
              />
              <Btn onClick={handleSend} disabled={!text.trim() || !roomId || sendM.isPending}>Send</Btn>
            </div>
          </CardBody>
        </Card>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create group room" width={480}>
        <Field label="Room name *">
          <Input placeholder="e.g. Gasabo Head Masters" value={roomTitle}
            onChange={e => setRoomTitle(e.target.value)} />
        </Field>
        <Field label="Add members (preset)">
          <Select
            options={[{ value: '', label: '— Select preset —' }, ...presets.map(p => ({ value: p.id, label: p.label }))]}
            value={roomPreset}
            onChange={e => {
              setRoomPreset(e.target.value)
              if (!roomTitle && e.target.value) {
                const p = presets.find(x => x.id === e.target.value)
                if (p) setRoomTitle(p.label)
              }
            }}
          />
        </Field>
        <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 8 }}>
          Presets add all matching users (e.g. all head masters in Gasabo).
          {presetsError && <span style={{ display: 'block', color: 'var(--amber)', marginTop: 6 }}>API offline — using built-in presets.</span>}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <Btn variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Btn>
          <Btn
            onClick={() => {
              if (!roomTitle.trim()) { toast.error('Enter a room name'); return }
              if (!roomPreset) { toast.error('Select a member preset'); return }
              createRoomM.mutate({ title: roomTitle.trim(), preset: roomPreset })
            }}
            disabled={createRoomM.isPending}
          >
            {createRoomM.isPending ? 'Creating...' : 'Create room'}
          </Btn>
        </div>
      </Modal>
    </div>
  )
}

import { ROLE_FEATURES } from '../constants/roleFeatures'
import { Card, CardHeader, CardBody } from './UI'
import { CircleCheck } from 'lucide-react'

export default function RoleCapabilities({ role }) {
  const info = ROLE_FEATURES[role]
  if (!info) return null

  return (
    <div style={{ marginBottom: 22 }}>
    <Card>
      <CardHeader
        title={`Your role: ${info.label}`}
        action={
          <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>
            Use cases: {info.useCases.join(' · ')}
          </span>
        }
      />
      <CardBody>
        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12, fontWeight: 600 }}>
          Implemented in this system
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 8 }}>
          {info.implemented.map(item => (
            <div
              key={item}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '10px 12px', borderRadius: 10,
                background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 12.5,
              }}
            >
              <CircleCheck size={15} color="#10B981" style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
    </div>
  )
}

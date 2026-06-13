import { useNavigate } from 'react-router-dom'
import { useTheme } from '../store/theme'
import { useAuth } from '../store/auth'
import { canSubmitServiceRequest } from '../utils/permissions'
import { PageHeader, Card, CardBody, Btn } from '../components/UI'
export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <div>
      <PageHeader title="Settings" sub="Appearance and preferences" />
      {canSubmitServiceRequest(user?.role) && (
        <Card style={{ maxWidth: 480, marginBottom: 16 }}>
          <CardBody>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Need help from system admin?</div>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>
              Submit a service request for role changes, account issues, or data corrections.
            </p>
            <Btn variant="outline" onClick={() => navigate('/requests')}>Service Requests</Btn>
          </CardBody>
        </Card>
      )}      <Card style={{ maxWidth: 480 }}>
        <CardBody>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Theme</div>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
            Choose how ECRM looks on your device. Your preference is saved locally.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { id: 'light', label: 'Light' },
              { id: 'dark', label: 'Dark' },
            ].map(t => (
              <Btn
                key={t.id}
                variant={theme === t.id ? 'primary' : 'outline'}
                onClick={() => setTheme(t.id)}
              >
                {t.label}
              </Btn>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

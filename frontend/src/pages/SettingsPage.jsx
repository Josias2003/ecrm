import { useTheme } from '../store/theme'
import { PageHeader, Card, CardBody, Btn } from '../components/UI'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()

  return (
    <div>
      <PageHeader title="Settings" sub="Appearance and preferences" />
      <Card style={{ maxWidth: 480 }}>
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

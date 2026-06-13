import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { analyticsAPI } from '../api/api'
import { useAuth } from '../store/auth'
import { PageHeader, Card, CardHeader, CardBody, Table, Badge, StatCard, Alert } from '../components/UI'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { scoreColor } from '../utils/schoolMetrics'

export default function GapAnalysisPage() {
  const { user } = useAuth()

  const { data: weights } = useQuery({
    queryKey: ['equity-weights'],
    queryFn: () => analyticsAPI.equityWeights().then(r => r.data),
  })

  const wInfra = weights?.infra ?? 30
  const wTeachers = weights?.teachers ?? 25
  const wResources = weights?.resources ?? 25
  const wConn = weights?.connectivity ?? 20

  const { data: dists = [] } = useQuery({
    queryKey: ['gap-districts'],
    queryFn: () => analyticsAPI.districts().then(r => r.data),
  })
  const { data: risks = [] } = useQuery({
    queryKey: ['gap-risks', user?.district],
    queryFn: () => analyticsAPI.riskScores({
      district: user?.role === 'district' ? user.district : undefined,
      limit: 100,
    }).then(r => r.data),
  })

  const districtScores = useMemo(() => {
    return dists.map(d => {
      const infra = d.total_schools
        ? (d.good_schools * 100 + d.moderate_schools * 50) / d.total_schools
        : 0
      const teachers = d.avg_pupil_teacher_ratio
        ? Math.max(0, 100 - (d.avg_pupil_teacher_ratio - 35) * 2)
        : 50
      const conn = d.total_schools
        ? (d.schools_with_electricity / d.total_schools) * 100
        : 0
      const resources = d.total_schools
        ? Math.max(0, 100 - d.critical_schools / d.total_schools * 100)
        : 0
      const equity = Math.round(
        (infra * wInfra + teachers * wTeachers + resources * wResources + conn * wConn) / 100,
      )
      return { district: d.district, equity, infra: Math.round(infra), teachers: Math.round(teachers), resources: Math.round(resources), conn: Math.round(conn) }
    }).sort((a, b) => a.equity - b.equity)
  }, [dists, wInfra, wTeachers, wResources, wConn])

  const nationalEquity = districtScores.length
    ? Math.round(districtScores.reduce((a, d) => a + d.equity, 0) / districtScores.length)
    : 0

  const lowest = districtScores[0]
  const highest = districtScores[districtScores.length - 1]

  return (
    <div>
      <PageHeader title="Gap Analysis" sub="District equity scores using platform-configured weights" />

      <Alert type="info" style={{ marginBottom: 18 }}>
        Weights from Platform Settings: Infrastructure {wInfra}% · Teachers {wTeachers}% · Resources {wResources}% · Connectivity {wConn}%
        {user?.role === 'admin' && ' — change these under System → Platform settings.'}
      </Alert>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        <StatCard label="National Equity Index" value={`${nationalEquity}%`} sub="Weighted average" accent="blue" />
        <StatCard label="Lowest District" value={lowest ? `${lowest.equity}%` : '—'} sub={lowest?.district || '—'} accent="red" />
        <StatCard label="Highest District" value={highest ? `${highest.equity}%` : '—'} sub={highest?.district || '—'} accent="green" />
        <StatCard label="Priority Schools" value={risks.filter(r => r.priority === 'high').length} sub="High intervention" accent="amber" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 18, marginBottom: 18 }}>
        <Card>
          <CardHeader title="District Equity Ranking" sub="Lower score = greater need" />
          <CardBody>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={districtScores.slice(0, 15)} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="district" width={90} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                <Bar dataKey="equity" fill="#2563EB" radius={[0, 4, 4, 0]} name="Equity %" />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Priority Schools" />
          <CardBody>
            <Table
              columns={[
                { key: 'rank', label: '#', render: v => `#${v}` },
                { key: 'school_name', label: 'School' },
                { key: 'district', label: 'District' },
                { key: 'equity', label: 'Score', render: v => (
                  <span style={{ fontWeight: 700, color: scoreColor(v) }}>{v}%</span>
                ) },
                { key: 'priority', label: 'Priority', render: v => <Badge status={v === 'high' ? 'critical' : 'moderate'} label={v} /> },
              ]}
              data={risks.slice(0, 12)}
              empty="No risk data for your scope"
            />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="District Breakdown" />
        <CardBody>
          <Table
            columns={[
              { key: 'district', label: 'District', render: v => <strong>{v}</strong> },
              { key: 'equity', label: 'Equity', render: v => <Badge status={v < 50 ? 'critical' : v < 70 ? 'moderate' : 'good'} label={`${v}%`} /> },
              { key: 'infra', label: 'Infra' },
              { key: 'teachers', label: 'Teachers' },
              { key: 'resources', label: 'Resources' },
              { key: 'conn', label: 'Power' },
            ]}
            data={districtScores}
            empty="No district data"
          />
        </CardBody>
      </Card>
    </div>
  )
}

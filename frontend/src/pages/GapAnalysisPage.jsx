import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { analyticsAPI } from '../api/api'
import { useAuth } from '../store/auth'
import { PageHeader, Card, CardHeader, CardBody, Table, Badge, StatCard } from '../components/UI'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { scoreColor } from '../utils/schoolMetrics'

export default function GapAnalysisPage() {
  const { user } = useAuth()
  const [wInfra, setWInfra] = useState(30)
  const [wTeachers, setWTeachers] = useState(25)
  const [wResources, setWResources] = useState(25)
  const [wConn, setWConn] = useState(20)

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
  const underserved = districtScores.filter(d => d.equity < 50).length
  const gapSpread = districtScores.length
    ? districtScores[districtScores.length - 1].equity - districtScores[0].equity
    : 0
  const criticalSchools = risks.filter(r => r.risk_score >= 60).length

  const prioritySchools = [...risks]
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 10)
    .map((r, i) => ({
      ...r,
      rank: i + 1,
      equity: Math.max(0, 100 - r.risk_score),
    }))

  return (
    <div>
      <PageHeader
        title="Gap Analysis & Equity Index"
        sub="District disparities and priority schools — weighted from live data"
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        <StatCard label="National Equity" value={`${nationalEquity}%`} sub="Weighted average" accent="blue" />
        <StatCard label="Critical Schools" value={criticalSchools} sub="Risk score 60+" accent="red" />
        <StatCard label="Underserved Districts" value={underserved} sub="Equity below 50%" accent="amber" />
        <StatCard label="Equity Gap" value={`${gapSpread}%`} sub="Max − min district" accent="purple" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
        <Card>
          <CardHeader title="Index weights" />
          <CardBody>
            {[
              ['Infrastructure', wInfra, setWInfra],
              ['Teacher coverage', wTeachers, setWTeachers],
              ['Learning materials', wResources, setWResources],
              ['Connectivity', wConn, setWConn],
            ].map(([label, val, set]) => (
              <div key={label} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span>{label}</span>
                  <strong>{val}%</strong>
                </div>
                <input
                  type="range"
                  min={0}
                  max={50}
                  value={val}
                  onChange={e => set(+e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            ))}
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 8 }}>
              Total weight: {wInfra + wTeachers + wResources + wConn}% (normalized in score)
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="District ranking" sub="Lowest equity first" />
          <CardBody>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={districtScores.slice(0, 12)} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="district" width={88} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="equity" fill="#2563EB" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Priority schools" sub="Lowest equity / highest risk" />
        <CardBody>
          <Table
            columns={[
              { key: 'rank', label: '#' },
              { key: 'name', label: 'School', render: v => <strong>{v}</strong> },
              { key: 'district', label: 'District' },
              {
                key: 'equity',
                label: 'Equity',
                render: v => <span style={{ color: scoreColor(v), fontWeight: 700 }}>{v}%</span>,
              },
              { key: 'students', label: 'Students' },
              {
                key: 'risk_score',
                label: 'Risk',
                render: v => <Badge status={v >= 60 ? 'critical' : v >= 35 ? 'moderate' : 'good'} label={v} />,
              },
            ]}
            data={prioritySchools}
            empty="No schools in scope"
          />
        </CardBody>
      </Card>
    </div>
  )
}

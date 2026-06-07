import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { analyticsAPI } from '../api/api'
import { useAuth } from '../store/auth'
import { PageHeader, Card, CardBody, Table, Badge, Pagination } from '../components/UI'
import { PAGE_SIZE, pageSlice, totalPages as calcTotalPages } from '../utils/pagination'
import { scoreColor } from '../utils/schoolMetrics'

export default function DistrictsPage() {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')

  const { data: dists = [], isLoading } = useQuery({
    queryKey: ['districts-page'],
    queryFn: () => analyticsAPI.districts().then(r => r.data),
  })

  const scoped = user?.role === 'district' && user.district
    ? dists.filter(d => d.district === user.district)
    : dists

  const filtered = scoped.filter(d =>
    !q.trim() || d.district.toLowerCase().includes(q.toLowerCase()),
  )

  const enriched = filtered.map(d => {
    const infraPct = d.total_schools
      ? Math.round((d.good_schools * 100 + d.moderate_schools * 50) / d.total_schools)
      : 0
    const connPct = d.total_schools
      ? Math.round((d.schools_with_electricity || 0) / d.total_schools * 100)
      : 0
    return { ...d, infraPct, connPct }
  })

  const total = enriched.length
  const pages = calcTotalPages(total)
  const rows = pageSlice(enriched, page)

  return (
    <div>
      <PageHeader
        title="District Overview"
        sub={`${total} districts · schools, students, and infrastructure indices`}
      />

      <div style={{ marginBottom: 18 }}>
        <input
          placeholder="Search district..."
          value={q}
          onChange={e => { setQ(e.target.value); setPage(1) }}
          style={{
            padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border)',
            width: '100%', maxWidth: 320, fontSize: 13,
          }}
        />
      </div>

      <Card>
        <CardBody>
          <Table
            loading={isLoading}
            columns={[
              { key: 'district', label: 'District', render: v => <strong>{v}</strong> },
              {
                key: 'district_officer',
                label: 'District Officer',
                render: (v, r) => r.officer_assigned
                  ? <span>{v}</span>
                  : <Badge status="critical" label="Unassigned" />,
              },
              { key: 'total_schools', label: 'Schools' },
              { key: 'total_students', label: 'Students', render: v => v?.toLocaleString() },
              { key: 'total_teachers', label: 'Teachers' },
              {
                key: 'infraPct',
                label: 'Infrastructure',
                render: v => (
                  <span style={{ fontWeight: 700, color: scoreColor(v) }}>{v}%</span>
                ),
              },
              {
                key: 'connPct',
                label: 'Connectivity',
                render: v => (
                  <span style={{ fontWeight: 600, color: scoreColor(v) }}>{v}%</span>
                ),
              },
              {
                key: 'critical_schools',
                label: 'Critical',
                render: v => <Badge status={v > 0 ? 'critical' : 'good'} label={v} />,
              },
              {
                key: 'avg_pupil_teacher_ratio',
                label: 'P:T',
                render: v => `1:${v}`,
              },
            ]}
            data={rows}
            empty="No district data"
          />
          <Pagination
            page={page}
            totalPages={pages}
            totalItems={total}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </CardBody>
      </Card>
    </div>
  )
}

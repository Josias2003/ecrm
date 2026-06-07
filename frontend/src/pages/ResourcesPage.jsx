import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { analyticsAPI } from '../api/api'
import { useAuth } from '../store/auth'
import { PageHeader, Card, CardBody, Badge, Table, StatCard, Pagination } from '../components/UI'
import SchoolEmptyState from '../components/SchoolEmptyState'
import { PAGE_SIZE, pageSlice, totalPages as calcTotalPages } from '../utils/pagination'
import { formatLabel } from '../utils/format'

const CATEGORIES = ['', 'Textbook', 'Furniture', 'ICT', 'Infrastructure']

export default function ResourcesPage() {
  const { user } = useAuth()
  const isSchoolHead = user?.role === 'school'
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['resource-inventory', user?.role, user?.school_id, user?.district, category],
    queryFn: () => analyticsAPI.resourceInventory({
      category: category || undefined,
      school_id: isSchoolHead ? user.school_id : undefined,
      district: user?.role === 'district' ? user.district : undefined,
    }).then(r => r.data),
    enabled: !isSchoolHead || !!user?.school_id,
  })

  if (isSchoolHead && !user?.school_id) {
    return (
      <div>
        <PageHeader title="Resource Inventory" sub="Track and manage educational resources" />
        <SchoolEmptyState />
      </div>
    )
  }

  const filtered = data?.rows || []
  const summary = data?.summary || {}
  const totalItems = filtered.length
  const pages = calcTotalPages(totalItems)
  const rows = pageSlice(filtered, page)
  const byCategory = summary.by_category || {}

  return (
    <div>
      <PageHeader
        title="Resource Inventory"
        sub={isSchoolHead ? 'Track and manage educational resources' : 'Resource gaps from live school records'}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        <StatCard label={isSchoolHead ? 'Total Resources' : 'Line items'} value={summary.total_units ?? 0} sub={`${summary.line_items ?? 0} records`} accent="blue" />
        <StatCard label={isSchoolHead ? 'Adequacy Index' : 'Adequacy'} value={`${summary.adequacy_pct ?? 0}%`} sub="Meeting required qty" accent={(summary.adequacy_pct ?? 0) >= 70 ? 'green' : 'amber'} />
        <StatCard label="Shortage Items" value={summary.shortages ?? 0} sub="Below required quantity" accent="red" />
        <StatCard label="Categories" value={summary.categories ?? 0} sub="Active types" accent="purple" />
      </div>

      {Object.keys(byCategory).length > 0 && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', width: '100%' }}>By category</span>
          {Object.entries(byCategory).map(([cat, info]) => (
            <div key={cat} style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', minWidth: 120 }}>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>{cat}</div>
              <div style={{ fontWeight: 700 }}>{info.items} items</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{info.units} units</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {CATEGORIES.map(c => (
          <button
            key={c || 'all'}
            type="button"
            onClick={() => { setCategory(c); setPage(1) }}
            style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
              border: `1.5px solid ${category === c ? 'var(--blue)' : 'var(--border)'}`,
              background: category === c ? 'var(--blue-lt)' : 'var(--card)',
              color: category === c ? 'var(--blue)' : 'var(--text2)',
            }}
          >
            {c || 'All categories'}
          </button>
        ))}
      </div>

      <Card>
        <CardBody>
          <Table
            loading={isLoading}
            columns={[
              { key: 'name', label: 'Resource', render: v => <strong>{v}</strong> },
              { key: 'category', label: 'Category', render: v => <Badge status="info" label={v} /> },
              ...(!isSchoolHead ? [
                { key: 'school_name', label: 'School' },
                { key: 'district', label: 'District' },
              ] : []),
              { key: 'available', label: 'Available' },
              { key: 'required', label: 'Required' },
              {
                key: 'gap',
                label: 'Gap',
                render: v => (
                  <span style={{ fontWeight: 700, color: v < 0 ? '#EF4444' : '#10B981' }}>
                    {v > 0 ? `+${v}` : v}
                  </span>
                ),
              },
              {
                key: 'condition',
                label: 'Status',
                render: v => (
                  <Badge
                    status={v === 'Good' ? 'good' : v === 'Fair' ? 'moderate' : 'critical'}
                    label={formatLabel(v)}
                  />
                ),
              },
            ]}
            data={rows}
            empty="No resource records in scope"
          />
          <Pagination
            page={page}
            totalPages={pages}
            totalItems={totalItems}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </CardBody>
      </Card>
    </div>
  )
}

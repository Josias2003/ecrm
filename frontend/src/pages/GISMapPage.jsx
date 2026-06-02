import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { schoolsAPI, analyticsAPI } from '../api/api'
import { useAuth } from '../store/auth'
import GISMap from '../components/GISMap'
import { Card, CardHeader, CardBody, Badge, Btn, StatCard, Alert, PageHeader, Modal, Field, Input } from '../components/UI'
import toast from 'react-hot-toast'
import { MapPin, Layers, Download } from 'lucide-react'

export default function GISMapPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [filterDistrict, setFilterDistrict] = useState(user?.role === 'district' ? user.district : '')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterGPS, setFilterGPS] = useState('')
  const [selectedSchool, setSelectedSchool] = useState(null)
  const [gpsModalOpen, setGpsModalOpen] = useState(false)
  const [gpsSchool, setGpsSchool] = useState(null)
  const [newLat, setNewLat] = useState('')
  const [newLng, setNewLng] = useState('')
  const [locating, setLocating] = useState(false)

  const { data: schools = [] } = useQuery({
    queryKey: ['schools-gis', filterDistrict, filterStatus, filterType],
    queryFn: () => schoolsAPI.list({
      district: filterDistrict || undefined,
      status:   filterStatus   || undefined,
      school_type: filterType  || undefined,
    }).then(r => r.data)
  })

  const { data: gisSummary = {} } = useQuery({
    queryKey: ['gis-summary'],
    queryFn: () => analyticsAPI.gisSummary().then(r => r.data)
  })

  const verifyMut = useMutation({
    mutationFn: id => schoolsAPI.verifyGPS(id),
    onSuccess: () => {
      qc.invalidateQueries(['schools-gis'])
      qc.invalidateQueries(['gis-summary'])
      toast.success('GPS coordinates verified!')
    }
  })

  const updateGPSMut = useMutation({
    mutationFn: ({ id, lat, lng }) => schoolsAPI.update(id, {
      latitude: lat, longitude: lng, gps_verified: false
    }),
    onSuccess: () => {
      qc.invalidateQueries(['schools-gis'])
      setGpsModalOpen(false)
      toast.success('GPS coordinates updated. Verify when on-site.')
    }
  })

  const filtered = schools.filter(s => {
    if (filterGPS === 'verified')   return s.gps_verified
    if (filterGPS === 'unverified') return !s.gps_verified
    return true
  })

  const mappable = filtered.filter(s => s.latitude && s.longitude)
  const unmapped = schools.filter(s => !s.latitude || !s.longitude)

  const locateMe = () => {
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setNewLat(pos.coords.latitude.toFixed(6))
        setNewLng(pos.coords.longitude.toFixed(6))
        setLocating(false)
        toast.success('GPS location captured!')
      },
      () => { setLocating(false); toast.error('Could not get your location. Enable GPS.') },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const exportGeoJSON = async () => {
    try {
      const r = await schoolsAPI.geojson({ district: filterDistrict || undefined })
      const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'ecrm_schools.geojson'; a.click()
      URL.revokeObjectURL(url)
      toast.success('GeoJSON exported')
    } catch { toast.error('Export failed') }
  }

  return (
    <div>
      <PageHeader
        title="GIS Map — Geospatial School View"
        sub={`${mappable.length} schools plotted · ${gisSummary.gps_verified || 0} GPS verified · ${unmapped.length} without coordinates`}
        action={
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn variant="outline" onClick={exportGeoJSON}><Download size={15}/> GeoJSON</Btn>
          </div>
        }
      />

      {unmapped.length > 0 && (
        <Alert type="warning">
          <strong>{unmapped.length} schools</strong> have no GPS coordinates yet.
          Field enumerators should update them on-site.
        </Alert>
      )}

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>
        <StatCard label="Total Mapped"  value={mappable.length}                  sub="Schools on map"     accent="blue"   icon={MapPin}/>
        <StatCard label="GPS Verified"  value={gisSummary.gps_verified||0}       sub="Field-confirmed"    accent="green"  icon={MapPin}/>
        <StatCard label="Unverified"    value={gisSummary.total_mapped?(gisSummary.total_mapped-(gisSummary.gps_verified||0)):0} sub="Need field check" accent="amber"  icon={MapPin}/>
        <StatCard label="Coverage"      value={`${gisSummary.coverage_pct||0}%`} sub="Schools with GPS"   accent="cyan"   icon={Layers}/>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text2)' }}>Filter:</span>
        {[
          { val: filterDistrict, set: setFilterDistrict, options: [['', 'All Districts'], ['Gasabo','Gasabo'], ['Kicukiro','Kicukiro'], ['Nyarugenge','Nyarugenge']], disabled: user?.role==='district' },
          { val: filterStatus,   set: setFilterStatus,   options: [['','All Statuses'],['good','Good'],['moderate','Moderate'],['critical','Critical']] },
          { val: filterType,     set: setFilterType,     options: [['','All Types'],['Primary','Primary'],['Secondary','Secondary']] },
          { val: filterGPS,      set: setFilterGPS,      options: [['','All GPS'],['verified','Verified'],['unverified','Unverified']] },
        ].map((f, i) => (
          <select key={i} value={f.val} onChange={e => f.set(e.target.value)} disabled={f.disabled}
            style={{ padding: '7px 12px', border: '1.5px solid var(--border)', borderRadius: 9,
              fontSize: 12.5, background: '#fff', cursor: f.disabled ? 'not-allowed' : 'pointer',
              opacity: f.disabled ? .6 : 1 }}>
            {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
        <button onClick={() => { setFilterDistrict(user?.role==='district'?user.district:''); setFilterStatus(''); setFilterType(''); setFilterGPS('') }}
          style={{ padding: '7px 14px', borderRadius: 9, border: '1.5px solid var(--border)',
            background: '#fff', cursor: 'pointer', fontSize: 12.5, color: 'var(--text2)' }}>
          ↺ Reset
        </button>
      </div>

      {/* Main GIS Map */}
      <Card style={{ marginBottom: 20 }}>
        <CardBody style={{ padding: 20 }}>
          <GISMap
            schools={filtered}
            filterDistrict={filterDistrict || undefined}
            onSchoolClick={setSelectedSchool}
            height={520}
          />
        </CardBody>
      </Card>

      {/* School detail panel */}
      {selectedSchool && (
        <Card style={{ marginBottom: 20, animation: 'slideIn .25s ease' }}>
          <CardHeader
            title={selectedSchool.name}
            subtitle={`${selectedSchool.district} · ${selectedSchool.sector} · ${selectedSchool.school_type}`}
            action={
              <div style={{ display: 'flex', gap: 8 }}>
                {['admin','reb','district','enumerator'].includes(user?.role) && (
                  <>
                    <Btn size="sm" variant="outline" onClick={() => {
                      setGpsSchool(selectedSchool)
                      setNewLat(selectedSchool.latitude || '')
                      setNewLng(selectedSchool.longitude || '')
                      setGpsModalOpen(true)
                    }}>📍 Edit GPS</Btn>
                    {!selectedSchool.gps_verified && (
                      <Btn size="sm" onClick={() => verifyMut.mutate(selectedSchool.id)}
                        disabled={verifyMut.isPending}>
                        {verifyMut.isPending ? '...' : '✓ Verify GPS'}
                      </Btn>
                    )}
                  </>
                )}
                <button onClick={() => setSelectedSchool(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text2)' }}>×</button>
              </div>
            }
          />
          <CardBody>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
              {[
                ['Students', (selectedSchool.students_boys||0)+(selectedSchool.students_girls||0), '👩‍🎓'],
                ['Teachers', (selectedSchool.teachers_male||0)+(selectedSchool.teachers_female||0), '👨‍🏫'],
                ['Classrooms', selectedSchool.classrooms, '🏫'],
                ['Textbooks', selectedSchool.textbooks, '📚'],
              ].map(([l, v, ic]) => (
                <div key={l} style={{ background: 'var(--bg2)', borderRadius: 9, padding: '11px 13px' }}>
                  <div style={{ fontSize: 18, marginBottom: 3 }}>{ic}</div>
                  <div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800 }}>{v}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text2)' }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <Badge status={selectedSchool.status} size="lg" />
              <Badge status={selectedSchool.school_type} size="lg" />
              {selectedSchool.gps_verified
                ? <Badge status="good" label="📍 GPS Verified" size="lg" />
                : <Badge status="pending" label="📍 GPS Unverified" size="lg" />}
            </div>
            <div style={{ background: 'var(--bg2)', borderRadius: 9, padding: '11px 14px', fontSize: 12.5 }}>
              <div style={{ fontWeight: 600, color: 'var(--text2)', marginBottom: 4 }}>GPS COORDINATES</div>
              <div style={{ fontFamily: 'monospace', fontSize: 13 }}>
                {selectedSchool.latitude?.toFixed(6)}°S, {selectedSchool.longitude?.toFixed(6)}°E
              </div>
              {selectedSchool.distance_to_road_km && (
                <div style={{ marginTop: 6, color: 'var(--text2)' }}>
                  🛣️ {selectedSchool.distance_to_road_km} km to nearest road
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Schools without GPS */}
      {unmapped.length > 0 && (
        <Card>
          <CardHeader title="Schools Without GPS" subtitle="Coordinates needed — assign a field enumerator"
            action={<Badge status="warning" label={`${unmapped.length} schools`} size="lg" />} />
          <CardBody>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12 }}>
              {unmapped.slice(0, 12).map(s => (
                <div key={s.id} style={{ background: 'var(--bg2)', borderRadius: 10, padding: '12px 14px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text2)' }}>{s.district} · {s.sector}</div>
                  </div>
                  {['admin','reb','district','enumerator'].includes(user?.role) && (
                    <Btn size="sm" variant="outline" onClick={() => {
                      setGpsSchool(s); setNewLat(''); setNewLng(''); setGpsModalOpen(true)
                    }}>📍 Add GPS</Btn>
                  )}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* GPS Edit Modal */}
      <Modal open={gpsModalOpen} onClose={() => setGpsModalOpen(false)} title={`GPS Coordinates — ${gpsSchool?.name || ''}`}>
        <Alert type="info">
          Enter coordinates manually or click <strong>"Use My Location"</strong> if you are physically at the school.
        </Alert>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
          <Field label="Latitude (decimal degrees, e.g. -1.94500)">
            <Input type="number" step="0.00001" placeholder="-1.94500"
              value={newLat} onChange={e => setNewLat(e.target.value)} />
          </Field>
          <Field label="Longitude (decimal degrees, e.g. 30.08500)">
            <Input type="number" step="0.00001" placeholder="30.08500"
              value={newLng} onChange={e => setNewLng(e.target.value)} />
          </Field>
        </div>
        <Btn variant="outline" onClick={locateMe} disabled={locating} style={{ width: '100%', justifyContent: 'center', marginBottom: 16 }}>
          {locating ? '⏳ Getting location...' : '📍 Use My Current Location (GPS)'}
        </Btn>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Btn variant="outline" onClick={() => setGpsModalOpen(false)}>Cancel</Btn>
          <Btn onClick={() => {
            if (!newLat || !newLng) { toast.error('Enter both coordinates'); return }
            updateGPSMut.mutate({ id: gpsSchool.id, lat: parseFloat(newLat), lng: parseFloat(newLng) })
          }} disabled={updateGPSMut.isPending}>
            {updateGPSMut.isPending ? 'Saving...' : '💾 Save Coordinates'}
          </Btn>
        </div>
      </Modal>
    </div>
  )
}

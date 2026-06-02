import { useEffect, useRef, useState } from 'react'
import { Badge, Card, CardHeader, CardBody } from './UI'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'

const STATUS_COLOR = { good: '#10B981', moderate: '#F59E0B', critical: '#EF4444' }

function createIcon(L, status, verified) {
  const c = STATUS_COLOR[status] || '#94A3B8'
  const ring = verified ? '#2563EB' : '#94A3B8'
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
      <circle cx="16" cy="16" r="14" fill="${c}" stroke="${ring}" stroke-width="${verified ? 3 : 1.5}" opacity="0.9"/>
      <circle cx="16" cy="16" r="7" fill="white" opacity="0.9"/>
      <polygon points="16,30 10,22 22,22" fill="${c}" opacity="0.9"/>
    </svg>`
  return L.divIcon({
    html: svg, className: '', iconSize: [32, 40], iconAnchor: [16, 40], popupAnchor: [0, -40]
  })
}

export default function GISMap({ schools = [], onSchoolClick, filterDistrict, height = 500 }) {
  const mapRef = useRef(null)
  const instanceRef = useRef(null)
  const markersRef = useRef([])
  const clusterRef = useRef(null)
  const [mapReady, setMapReady] = useState(false)
  const [stats, setStats] = useState({ total: 0, good: 0, moderate: 0, critical: 0, verified: 0 })

  useEffect(() => {
    if (instanceRef.current) return
    Promise.all([import('leaflet'), import('leaflet.markercluster')]).then(([{ default: L }]) => {
      if (!mapRef.current || instanceRef.current) return
      const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: true })
        .setView([-1.955, 30.085], 12)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map)

      // District boundary layers
      const districtColors = {
        Gasabo: '#2563EB', Kicukiro: '#10B981', Nyarugenge: '#F59E0B'
      }

      const cluster = L.markerClusterGroup({
        chunkedLoading: true,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
      })
      cluster.addTo(map)

      clusterRef.current = cluster
      instanceRef.current = { map, L, districtColors }
      setMapReady(true)
    })
    return () => {
      if (instanceRef.current?.map) {
        instanceRef.current.map.remove()
        instanceRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!mapReady || !instanceRef.current) return
    const { map, L } = instanceRef.current
    const cluster = clusterRef.current

    // Clear old markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    if (cluster) cluster.clearLayers()

    const filtered = schools.filter(s => {
      if (!s.latitude || !s.longitude) return false
      if (filterDistrict && s.district !== filterDistrict) return false
      return true
    })

    const st = { total: filtered.length, good: 0, moderate: 0, critical: 0, verified: 0 }
    const bounds = []

    filtered.forEach(school => {
      const stu = (school.students_boys || 0) + (school.students_girls || 0)
      const tea = (school.teachers_male || 0) + (school.teachers_female || 0)
      const tlt = (school.toilets_boys || 0) + (school.toilets_girls || 0)

      st[school.status] = (st[school.status] || 0) + 1
      if (school.gps_verified) st.verified++

      const icon = createIcon(L, school.status, school.gps_verified)
      const marker = L.marker([school.latitude, school.longitude], { icon })

      const popupContent = `
        <div style="font-family:Inter,sans-serif;min-width:220px;padding:2px">
          <div style="font-weight:700;font-size:14px;margin-bottom:4px;color:#0F172A">${school.name}</div>
          <div style="font-size:11.5px;color:#475569;margin-bottom:10px">${school.district} · ${school.sector} · ${school.school_type}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:10px">
            ${[['👩‍🎓', stu, 'Students'], ['👨‍🏫', tea, 'Teachers'], ['🏫', school.classrooms, 'Rooms']].map(([ic, v, l]) =>
        `<div style="background:#F8FAFC;border-radius:7px;padding:7px 6px;text-align:center">
                <div style="font-size:16px">${ic}</div>
                <div style="font-family:Syne,sans-serif;font-size:16px;font-weight:800">${v}</div>
                <div style="font-size:9.5px;color:#475569">${l}</div>
              </div>`).join('')}
          </div>
          <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px">
            ${[['💧', school.has_water], ['⚡', school.has_electricity], ['📚', school.has_library], ['💻', school.has_ict_lab]].map(([ic, v]) =>
        `<span style="padding:2px 7px;border-radius:6px;font-size:11px;font-weight:600;
                  background:${v ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.12)'};
                  color:${v ? '#065F46' : '#991B1B'}">${ic}</span>`).join('')}
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;
              font-size:11px;font-weight:600;
              background:${school.status === 'good' ? '#ECFDF5' : school.status === 'moderate' ? '#FFFBEB' : '#FEF2F2'};
              color:${school.status === 'good' ? '#065F46' : school.status === 'moderate' ? '#92400E' : '#991B1B'}">
              ● ${school.status}
            </span>
            ${school.gps_verified ? '<span style="font-size:11px;color:#2563EB;font-weight:600">📍 GPS Verified</span>' : '<span style="font-size:11px;color:#94A3B8">📍 Unverified</span>'}
          </div>
          ${school.latitude ? `<div style="margin-top:8px;font-size:10.5px;color:#94A3B8;font-family:monospace">${school.latitude.toFixed(5)}°S, ${school.longitude.toFixed(5)}°E</div>` : ''}
        </div>
      `
      marker.bindPopup(popupContent, { maxWidth: 260 })
      marker.on('click', () => { if (onSchoolClick) onSchoolClick(school) })
      if (cluster) cluster.addLayer(marker)
      else marker.addTo(map)
      markersRef.current.push(marker)
      bounds.push([school.latitude, school.longitude])
    })

    if (bounds.length > 1) {
      try { map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 }) } catch {}
    }
    setStats(st)
  }, [mapReady, schools, filterDistrict])

  return (
    <div>
      {/* Map stats bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        {[
          [`${stats.total} Mapped`, '#2563EB', '🗺️'],
          [`${stats.good} Good`, '#10B981', '✅'],
          [`${stats.moderate} Moderate`, '#F59E0B', '⚠️'],
          [`${stats.critical} Critical`, '#EF4444', '🔴'],
          [`${stats.verified} GPS Verified`, '#8B5CF6', '📍'],
        ].map(([label, color, icon]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 9, background: '#fff',
            border: '1px solid var(--border)', fontSize: 12.5, fontWeight: 600, color }}>
            <span>{icon}</span>{label}
          </div>
        ))}
      </div>

      {/* Leaflet map container */}
      <div ref={mapRef} style={{ height, borderRadius: 12, overflow: 'hidden',
        border: '1px solid var(--border)', background: '#DBEAFE' }} />

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12 }}>
        {[['#10B981', 'Good condition'], ['#F59E0B', 'Moderate condition'],
          ['#EF4444', 'Critical — needs action'], ['#2563EB', 'GPS field-verified']].map(([c, l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
            <span style={{ color: 'var(--text2)' }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'

import { RWANDA_CENTER, RWANDA_BOUNDS } from '../constants/rwandaDistricts'

const STATUS_COLOR = { good: '#10B981', moderate: '#F59E0B', critical: '#EF4444' }

const TILE_LAYERS = [
  {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
      crossOrigin: true,
    },
  },
  {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    options: {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      maxZoom: 20,
      subdomains: 'abcd',
      crossOrigin: true,
    },
  },
]

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]))
}

function hasCoordinates(school) {
  return Number.isFinite(Number(school.latitude)) && Number.isFinite(Number(school.longitude))
}

function createIcon(L, status, verified) {
  const color = STATUS_COLOR[status] || '#94A3B8'
  const ring = verified ? '#2563EB' : '#94A3B8'
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
      <circle cx="16" cy="16" r="14" fill="${color}" stroke="${ring}" stroke-width="${verified ? 3 : 1.5}" opacity="0.9"/>
      <circle cx="16" cy="16" r="7" fill="white" opacity="0.9"/>
      <polygon points="16,30 10,22 22,22" fill="${color}" opacity="0.9"/>
    </svg>`

  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40],
  })
}

function createPopupContent(school) {
  const students = (school.students_boys || 0) + (school.students_girls || 0)
  const teachers = (school.teachers_male || 0) + (school.teachers_female || 0)
  const statusBg = school.status === 'good' ? '#ECFDF5' : school.status === 'moderate' ? '#FFFBEB' : '#FEF2F2'
  const statusColor = school.status === 'good' ? '#065F46' : school.status === 'moderate' ? '#92400E' : '#991B1B'

  const metrics = [
    ['Students', students],
    ['Teachers', teachers],
    ['Rooms', school.classrooms || 0],
  ].map(([label, value]) => `
    <div style="background:#F8FAFC;border-radius:7px;padding:7px 6px;text-align:center">
      <div style="font-family:Syne,sans-serif;font-size:16px;font-weight:800">${escapeHtml(value)}</div>
      <div style="font-size:9.5px;color:#475569">${escapeHtml(label)}</div>
    </div>
  `).join('')

  const facilities = [
    ['Water', school.has_water],
    ['Power', school.has_electricity],
    ['Library', school.has_library],
    ['ICT', school.has_ict_lab],
  ].map(([label, enabled]) => `
    <span style="padding:2px 7px;border-radius:6px;font-size:11px;font-weight:600;
      background:${enabled ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.12)'};
      color:${enabled ? '#065F46' : '#991B1B'}">${escapeHtml(label)}</span>
  `).join('')

  return `
    <div style="font-family:Inter,sans-serif;min-width:220px;padding:2px">
      <div style="font-weight:700;font-size:14px;margin-bottom:4px;color:#0F172A">${escapeHtml(school.name)}</div>
      <div style="font-size:11.5px;color:#475569;margin-bottom:10px">
        ${escapeHtml(school.district)} &middot; ${escapeHtml(school.sector)} &middot; ${escapeHtml(school.school_type)}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:10px">${metrics}</div>
      <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px">${facilities}</div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;
          font-size:11px;font-weight:600;background:${statusBg};color:${statusColor}">
          ${escapeHtml(school.status)}
        </span>
        <span style="font-size:11px;color:${school.gps_verified ? '#2563EB' : '#94A3B8'};font-weight:600">
          ${school.gps_verified ? 'GPS Verified' : 'GPS Unverified'}
        </span>
      </div>
      <div style="margin-top:8px;font-size:10.5px;color:#94A3B8;font-family:monospace">
        ${Number(school.latitude).toFixed(5)}, ${Number(school.longitude).toFixed(5)}
      </div>
    </div>
  `
}

export default function GISMap({ schools = [], onSchoolClick, filterDistrict, highlightSchoolId, height = 500 }) {
  const mapRef = useRef(null)
  const instanceRef = useRef(null)
  const markersRef = useRef([])
  const markerBySchoolRef = useRef({})
  const clusterRef = useRef(null)
  const resizeObserverRef = useRef(null)
  const [mapReady, setMapReady] = useState(false)
  const [mapError, setMapError] = useState('')
  const [tilesLoading, setTilesLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, good: 0, moderate: 0, critical: 0, verified: 0 })

  useEffect(() => {
    if (instanceRef.current) return undefined
    let cancelled = false

    const initMap = async () => {
      try {
        const { default: L } = await import('leaflet')
        window.L = L
        await import('leaflet.markercluster')

        if (!mapRef.current || instanceRef.current || cancelled) return

        const map = L.map(mapRef.current, {
          zoomControl: true,
          scrollWheelZoom: true,
          preferCanvas: true,
        }).setView(RWANDA_CENTER, 8)

        const addTileLayer = (index = 0) => {
          const provider = TILE_LAYERS[index]
          const tileLayer = L.tileLayer(provider.url, provider.options)
          let fallbackApplied = false

          tileLayer.on('load', () => {
            if (!cancelled) {
              setTilesLoading(false)
              setMapError('')
            }
          })

          tileLayer.on('tileerror', () => {
            if (fallbackApplied) return
            fallbackApplied = true
            if (TILE_LAYERS[index + 1]) {
              map.removeLayer(tileLayer)
              addTileLayer(index + 1)
            } else if (!cancelled) {
              setTilesLoading(false)
              setMapError('Map tiles could not be loaded. Check internet access or the tile provider.')
            }
          })

          tileLayer.addTo(map)
        }

        addTileLayer()

        const cluster = L.markerClusterGroup({
          chunkedLoading: true,
          spiderfyOnMaxZoom: true,
          showCoverageOnHover: false,
        })
        cluster.addTo(map)

        resizeObserverRef.current = new ResizeObserver(() => {
          requestAnimationFrame(() => map.invalidateSize())
        })
        resizeObserverRef.current.observe(mapRef.current)

        requestAnimationFrame(() => map.invalidateSize())

        clusterRef.current = cluster
        instanceRef.current = { map, L }
        setMapReady(true)
      } catch {
        if (!cancelled) {
          setTilesLoading(false)
          setMapError('GIS map failed to initialize. Refresh the page and try again.')
        }
      }
    }

    initMap()

    return () => {
      cancelled = true
      resizeObserverRef.current?.disconnect()
      resizeObserverRef.current = null
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

    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []
    markerBySchoolRef.current = {}
    if (cluster) cluster.clearLayers()

    const filtered = schools.filter(school => {
      if (!hasCoordinates(school)) return false
      if (filterDistrict && school.district !== filterDistrict) return false
      return true
    })

    const nextStats = { total: filtered.length, good: 0, moderate: 0, critical: 0, verified: 0 }
    const bounds = []

    filtered.forEach(school => {
      const latitude = Number(school.latitude)
      const longitude = Number(school.longitude)

      nextStats[school.status] = (nextStats[school.status] || 0) + 1
      if (school.gps_verified) nextStats.verified += 1

      const marker = L.marker([latitude, longitude], {
        icon: createIcon(L, school.status, school.gps_verified),
      })

      marker.bindPopup(createPopupContent({ ...school, latitude, longitude }), { maxWidth: 280 })
      marker.on('click', () => { if (onSchoolClick) onSchoolClick(school) })

      if (cluster) cluster.addLayer(marker)
      else marker.addTo(map)

      markersRef.current.push(marker)
      markerBySchoolRef.current[school.id] = marker
      bounds.push([latitude, longitude])
    })

    if (bounds.length > 1) {
      try { map.fitBounds(bounds, { padding: [40, 40], maxZoom: filterDistrict ? 13 : 10 }) } catch {}
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 14)
    } else {
      try { map.fitBounds(RWANDA_BOUNDS, { padding: [30, 30] }) } catch { map.setView(RWANDA_CENTER, 8) }
    }

    requestAnimationFrame(() => map.invalidateSize())
    setStats(nextStats)
  }, [mapReady, schools, filterDistrict, onSchoolClick])

  useEffect(() => {
    if (!mapReady || !instanceRef.current || !highlightSchoolId) return
    const { map } = instanceRef.current
    const marker = markerBySchoolRef.current[highlightSchoolId]
    if (!marker) return
    const latLng = marker.getLatLng()
    map.setView(latLng, Math.max(map.getZoom(), 14), { animate: true })
    marker.openPopup()
  }, [mapReady, highlightSchoolId])

  const statusMessage = mapError
    || (!mapReady ? 'Loading GIS map...' : tilesLoading ? 'Loading base map tiles...' : stats.total === 0 ? 'No mapped schools match the current filters.' : '')

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        {[
          [`${stats.total} Mapped`, '#2563EB', 'Map'],
          [`${stats.good} Good`, '#10B981', 'Good'],
          [`${stats.moderate} Moderate`, '#F59E0B', 'Warn'],
          [`${stats.critical} Critical`, '#EF4444', 'Risk'],
          [`${stats.verified} GPS Verified`, '#8B5CF6', 'GPS'],
        ].map(([label, color, icon]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 9, background: '#fff',
            border: '1px solid var(--border)', fontSize: 12.5, fontWeight: 600, color }}>
            <span style={{ fontSize: 10, fontWeight: 800, opacity: 0.7 }}>{icon}</span>{label}
          </div>
        ))}
      </div>

      <div style={{ position: 'relative' }}>
        <div ref={mapRef} style={{ height, borderRadius: 12, overflow: 'hidden',
          border: '1px solid var(--border)', background: '#DBEAFE' }} />
        {statusMessage && (
          <div style={{ position: 'absolute', left: 12, bottom: 12, zIndex: 500,
            maxWidth: 360, padding: '9px 12px', borderRadius: 10,
            background: 'rgba(255,255,255,.94)', border: '1px solid var(--border)',
            boxShadow: 'var(--sh-sm)', fontSize: 12.5, color: mapError ? '#991B1B' : 'var(--text2)' }}>
            {statusMessage}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12, flexWrap: 'wrap' }}>
        {[
          ['#10B981', 'Good condition'],
          ['#F59E0B', 'Moderate condition'],
          ['#EF4444', 'Critical - needs action'],
          ['#2563EB', 'GPS field-verified'],
        ].map(([color, label]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
            <span style={{ color: 'var(--text2)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

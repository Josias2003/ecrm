import { memo } from 'react'
import { Field, Input, Select, Checkbox, Btn } from './UI'
import toast from 'react-hot-toast'
import { MapPin } from 'lucide-react'

const DISTRICTS = ['Gasabo', 'Kicukiro', 'Nyarugenge']
const SECTORS = {
  Gasabo: ['Remera', 'Kacyiru', 'Kimironko', 'Gisozi', 'Kinyinya', 'Jabana', 'Jali', 'Nduba', 'Ndera', 'Rusororo', 'Rutunga', 'Bumbogo', 'Gatsata', 'Gikomero', 'Gaculiro'],
  Kicukiro: ['Niboye', 'Kanombe', 'Nyanza', 'Gahanga', 'Masaka', 'Kagarama', 'Kigarama', 'Gatenga', 'Busanza', 'Rubungo'],
  Nyarugenge: ['Nyamirambo', 'Biryogo', 'Muhima', 'Rwezamenyo', 'Kimisagara', 'Gitega', 'Kanyinya', 'Mageragere', 'Kigali', 'Nyakabanda'],
}

function SchoolFormFields({ form, setForm, lockDistrict }) {
  const set = (k) => (e) => setForm(p => ({
    ...p,
    [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value,
  }))

  const useLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setForm(p => ({
          ...p,
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
        }))
        toast.success('Location captured')
      },
      () => toast.error('Could not get your location'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <Field label="School Name *">
          <Input placeholder="e.g. GS Remera" value={form.name} onChange={set('name')} required />
        </Field>
        <Field label="District *">
          <Select options={DISTRICTS} value={form.district} onChange={set('district')} disabled={lockDistrict} />
        </Field>
        <Field label="Sector *">
          <Select options={['', ...(SECTORS[form.district] || [])]} value={form.sector} onChange={set('sector')} />
        </Field>
        <Field label="Cell"><Input placeholder="Cell name" value={form.cell || ''} onChange={set('cell')} /></Field>
        <Field label="Type *">
          <Select options={['Primary', 'Secondary']} value={form.school_type} onChange={set('school_type')} />
        </Field>
        <Field label="Ownership">
          <Select options={['Public', 'Private', 'Faith-based']} value={form.ownership} onChange={set('ownership')} />
        </Field>
      </div>
      <div style={{ marginBottom: 14 }}>
        <Btn variant="outline" onClick={useLocation} style={{ marginBottom: 10 }}>
          <MapPin size={15} /> Use My Current Location
        </Btn>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Latitude (optional manual)">
            <Input type="number" step="0.00001" placeholder="-1.95000" value={form.latitude ?? ''} onChange={set('latitude')} />
          </Field>
          <Field label="Longitude (optional manual)">
            <Input type="number" step="0.00001" placeholder="30.08500" value={form.longitude ?? ''} onChange={set('longitude')} />
          </Field>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <Field label="Students (Boys)"><Input type="number" min="0" value={form.students_boys ?? 0} onChange={set('students_boys')} /></Field>
        <Field label="Students (Girls)"><Input type="number" min="0" value={form.students_girls ?? 0} onChange={set('students_girls')} /></Field>
        <Field label="Teachers (Male)"><Input type="number" min="0" value={form.teachers_male ?? 0} onChange={set('teachers_male')} /></Field>
        <Field label="Teachers (Female)"><Input type="number" min="0" value={form.teachers_female ?? 0} onChange={set('teachers_female')} /></Field>
        <Field label="Classrooms (Total)"><Input type="number" min="0" value={form.classrooms ?? 0} onChange={set('classrooms')} /></Field>
        <Field label="Classrooms (Usable)"><Input type="number" min="0" value={form.classrooms_good ?? 0} onChange={set('classrooms_good')} /></Field>
        <Field label="Textbooks"><Input type="number" min="0" value={form.textbooks ?? 0} onChange={set('textbooks')} /></Field>
        <Field label="Desks"><Input type="number" min="0" value={form.desks ?? 0} onChange={set('desks')} /></Field>
        <Field label="Toilets (Boys)"><Input type="number" min="0" value={form.toilets_boys ?? 0} onChange={set('toilets_boys')} /></Field>
        <Field label="Toilets (Girls)"><Input type="number" min="0" value={form.toilets_girls ?? 0} onChange={set('toilets_girls')} /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
        {[['Library', 'has_library'], ['ICT Lab', 'has_ict_lab'], ['Science Lab', 'has_science_lab'],
          ['Water', 'has_water'], ['Electricity', 'has_electricity'], ['Internet', 'has_internet'],
          ['Fence', 'has_fence'], ['Canteen', 'has_canteen']].map(([l, k]) => (
          <Checkbox key={k} label={l} checked={!!form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.checked }))} />
        ))}
      </div>
    </>
  )
}

export default memo(SchoolFormFields)

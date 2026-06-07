import { useState, useCallback, useEffect, useRef } from 'react'
import SchoolFormFields from '../components/SchoolFormFields'
import { formatLabel } from '../utils/format'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { schoolsAPI, teachersAPI, feedbackAPI, alertsAPI, analyticsAPI, usersAPI, logsAPI } from '../api/api'
import { useAuth } from '../store/auth'
import { Card, CardHeader, CardBody, Badge, Btn, StatCard, Alert, Table,
         Modal, Field, Input, Select, Textarea, Tabs, Empty, PageHeader,
         ProgressBar, DonutChart, Checkbox } from '../components/UI'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
         CartesianGrid, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts'
import {
  School, Users, BookOpen, AlertTriangle, TrendingUp, Download,
  Building2, Armchair, CircleCheck, Droplets, Zap, Monitor, MapPin,
  Library, FlaskConical, Globe, Lock, UtensilsCrossed, UserRound,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { DISTRICT_NAMES, sectorsFor } from '../constants/rwandaDistricts'

const apiErr = (e) => toast.error(
  typeof e?.response?.data?.detail === 'string'
    ? e.response.data.detail
    : 'Action failed — ensure the API server is running'
)

const textMatches = (query, values) => {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return values.some(value => String(value ?? '').toLowerCase().includes(q))
}

// ════════════════════════════════════════════════════════════════════
// SCHOOLS PAGE
// ════════════════════════════════════════════════════════════════════
const EMPTY_SCHOOL = {
  name:'',district:'Gasabo',sector:'',cell:'',school_type:'Primary',ownership:'Public',
  latitude:'',longitude:'',students_boys:0,students_girls:0,teachers_male:0,teachers_female:0,
  classrooms:0,classrooms_good:0,textbooks:0,desks:0,toilets_boys:0,toilets_girls:0,
  has_library:false,has_ict_lab:false,has_science_lab:false,has_water:false,
  has_electricity:false,has_internet:false,has_fence:false,has_canteen:false,
  distance_to_road_km:'',
}

export function SchoolsPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const [fd, setFd] = useState(user?.role==='district'?user.district:'')
  const [fs, setFs] = useState('')
  const [ft, setFt] = useState('')
  const [view, setView] = useState('list')
  const [addOpen, setAddOpen] = useState(false)
  const [editS, setEditS] = useState(null)
  const [detailS, setDetailS] = useState(null)
  const [form, setForm] = useState(EMPTY_SCHOOL)

  const { data: schools=[], isLoading } = useQuery({
    queryKey:['schools',fd,fs,ft],
    queryFn:()=>schoolsAPI.list({district:fd||undefined,status:fs||undefined,school_type:ft||undefined}).then(r=>r.data)
  })
  const visibleSchools = schools.filter(s => textMatches(q, [
    s.name, s.district, s.sector, s.school_type, s.ownership, s.status,
  ]))

  const createM = useMutation({
    mutationFn: d => schoolsAPI.create(d),
    onSuccess: () => { qc.invalidateQueries(['schools']); setAddOpen(false); toast.success('School registered') },
    onError: apiErr,
  })
  const updateM = useMutation({
    mutationFn: ({ id, d }) => schoolsAPI.update(id, d),
    onSuccess: () => { qc.invalidateQueries(['schools']); setEditS(null); toast.success('School updated') },
    onError: apiErr,
  })
  const deleteM = useMutation({
    mutationFn: id => schoolsAPI.delete(id),
    onSuccess: () => { qc.invalidateQueries(['schools']); toast.success('School removed') },
    onError: apiErr,
  })

  const openEdit = s => { setForm({...s,latitude:s.latitude||'',longitude:s.longitude||'',distance_to_road_km:s.distance_to_road_km||''}); setEditS(s) }
  const openAdd = () => { setForm({...EMPTY_SCHOOL, district: user?.role==='district'?user.district:EMPTY_SCHOOL.district}); setAddOpen(true) }
  const saveSchool = useCallback(() => {
    if (!form.name?.trim()) { toast.error('School name is required'); return }
    if (!form.sector) { toast.error('Sector is required'); return }
    const payload = { ...form, latitude: form.latitude === '' ? null : Number(form.latitude), longitude: form.longitude === '' ? null : Number(form.longitude) }
    if (editS) updateM.mutate({ id: editS.id, d: payload })
    else createM.mutate(payload)
  }, [form, editS, createM, updateM])

  const exportCSV = async () => {
    try {
      const r = await schoolsAPI.exportCSV({ district: fd||undefined })
      const url = URL.createObjectURL(r.data)
      const a = document.createElement('a'); a.href=url; a.download='ecrm_schools.csv'; a.click()
      URL.revokeObjectURL(url); toast.success('CSV exported')
    } catch { toast.error('Export failed') }
  }

  const canEditSchool = (s) => {
    if (user?.role === 'district' || user?.role === 'enumerator') return true
    if (user?.role === 'school') return s.id === user.school_id
    return false
  }
  const canEdit = user?.role === 'district' || user?.role === 'enumerator' || user?.role === 'school'
  const canDel  = user?.role === 'district'
  const lockDistrict = ['district', 'enumerator'].includes(user?.role)
  const schoolAutoOpened = useRef(false)

  useEffect(() => {
    if (schoolAutoOpened.current) return
    if (user?.role === 'school' && schools.length === 1) {
      schoolAutoOpened.current = true
      const s = schools[0]
      setForm({ ...s, latitude: s.latitude || '', longitude: s.longitude || '', distance_to_road_km: s.distance_to_road_km || '' })
      setEditS(s)
    }
  }, [schools, user?.role])

  return (
    <div>
      <PageHeader title={user?.role==='school'?'My School':'Schools'}
        sub={user?.role==='school'?'View and update your school profile':`${visibleSchools.length} schools found${q ? ` for "${q}"` : ''}`}
        action={<div style={{display:'flex',gap:10}}>
          {user?.role!=='school'&&<Btn variant="outline" onClick={exportCSV}><Download size={15}/> CSV</Btn>}
          {canEdit&&user?.role!=='school'&&<Btn onClick={openAdd}>+ Register School</Btn>}
        </div>}/>

      <div style={{display:'flex',gap:10,marginBottom:18,flexWrap:'wrap'}}>
        <Input placeholder="Search school, sector, district..." value={q}
          onChange={e=>setSearchParams(e.target.value ? { q:e.target.value } : {})}
          style={{maxWidth:280}}/>
        <select value={fd} onChange={e=>setFd(e.target.value)} disabled={user?.role==='district'}
          style={{padding:'7px 12px',border:'1.5px solid var(--border)',borderRadius:9,fontSize:12.5,background:'#fff',cursor:'pointer'}}>
          <option value="">All Districts</option>
          {DISTRICT_NAMES.map(d=><option key={d}>{d}</option>)}
        </select>
        <select value={fs} onChange={e=>setFs(e.target.value)}
          style={{padding:'7px 12px',border:'1.5px solid var(--border)',borderRadius:9,fontSize:12.5,background:'#fff',cursor:'pointer'}}>
          <option value="">All Statuses</option>
          {['good','moderate','critical'].map(s=><option key={s}>{s}</option>)}
        </select>
        <select value={ft} onChange={e=>setFt(e.target.value)}
          style={{padding:'7px 12px',border:'1.5px solid var(--border)',borderRadius:9,fontSize:12.5,background:'#fff',cursor:'pointer'}}>
          <option value="">All Types</option>
          {['Primary','Secondary'].map(t=><option key={t}>{t}</option>)}
        </select>
        <Tabs tabs={[{id:'list',label:'List'},{id:'cards',label:'Cards'}]} active={view} onChange={setView}/>
      </div>

      {view==='list'&&(
        <Card><CardBody>
          <Table loading={isLoading} columns={[
            {key:'name',label:'School',render:v=><strong>{v}</strong>},
            {key:'district',label:'District'},{key:'sector',label:'Sector'},
            {key:'school_type',label:'Type',render:v=><Badge status={v}/>},
            {key:'students_boys',label:'Students',render:(v,r)=>((r.students_boys||0)+(r.students_girls||0)).toLocaleString()},
            {key:'teachers_male',label:'Teachers',render:(v,r)=>(r.teachers_male||0)+(r.teachers_female||0)},
            {key:'gps_verified',label:'GPS',render:v=><Badge status={v?'good':'pending'} label={v?'✓ Verified':'Pending'}/>},
            {key:'status',label:'Status',render:v=><Badge status={v}/>},
            {key:'id',label:'Actions',render:(v,row)=>(
              <div style={{display:'flex',gap:5}}>
                <Btn size="sm" variant="ghost" onClick={()=>setDetailS(row)}>View</Btn>
                {canEditSchool(row)&&<Btn size="sm" variant="outline" onClick={()=>openEdit(row)}>Edit</Btn>}
                {canDel&&<Btn size="sm" variant="danger" onClick={()=>{if(confirm('Delete?'))deleteM.mutate(v)}}>Del</Btn>}
              </div>
            )},
          ]} data={visibleSchools} empty="No schools found"/>
        </CardBody></Card>
      )}

      {view==='cards'&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
          {visibleSchools.map(s=>{
            const stu=(s.students_boys||0)+(s.students_girls||0)
            const tea=(s.teachers_male||0)+(s.teachers_female||0)
            return (
              <div key={s.id} onClick={()=>setDetailS(s)}
                style={{background:'#fff',borderRadius:13,border:'1px solid var(--border)',
                  padding:18,cursor:'pointer',boxShadow:'var(--sh-sm)',transition:'all .2s',
                  borderLeft:`4px solid ${s.status==='good'?'var(--green)':s.status==='moderate'?'var(--amber)':'var(--red)'}`}}
                onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='var(--sh)'}}
                onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='var(--sh-sm)'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                  <div><div style={{fontWeight:700,fontSize:14}}>{s.name}</div>
                    <div style={{fontSize:12,color:'var(--text2)',marginTop:2}}>{s.district} · {s.sector}</div></div>
                  <Badge status={s.status}/>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:10}}>
                  {[
                    {Icon:Users,v:stu,l:'Students',c:'#2563EB'},
                    {Icon:UserRound,v:tea,l:'Teachers',c:'#10B981'},
                    {Icon:Building2,v:s.classrooms,l:'Rooms',c:'#F59E0B'},
                  ].map(({Icon,v,l,c})=>(
                    <div key={l} style={{background:'var(--bg2)',borderRadius:8,padding:'8px 9px',textAlign:'center',border:'1px solid var(--border)'}}>
                      <div style={{display:'flex',justifyContent:'center',marginBottom:4}}><Icon size={14} color={c}/></div>
                      <div style={{fontSize:15,fontWeight:700,color:'var(--text)'}}>{v}</div>
                      <div style={{fontSize:9.5,color:'var(--text2)'}}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                  {[
                    {Icon:Droplets,v:s.has_water,l:'Water'},
                    {Icon:Zap,v:s.has_electricity,l:'Power'},
                    {Icon:BookOpen,v:s.has_library,l:'Library'},
                    {Icon:Monitor,v:s.has_ict_lab,l:'ICT'},
                    {Icon:MapPin,v:s.gps_verified,l:'GPS'},
                  ].map(({Icon,v,l})=>(
                    <span key={l} title={l} style={{padding:'4px 7px',borderRadius:6,display:'inline-flex',alignItems:'center',
                      background:v?'rgba(16,185,129,.1)':'rgba(239,68,68,.1)'}}>
                      <Icon size={12} color={v?'#10B981':'#EF4444'}/>
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Detail Modal */}
      <Modal open={!!detailS} onClose={()=>setDetailS(null)} title={detailS?.name||''} width={640}>
        {detailS&&(<>
          <div style={{display:'flex',gap:8,marginBottom:16}}>
            <Badge status={detailS.status} size="lg"/>
            <Badge status={detailS.school_type} size="lg"/>
            <Badge status={detailS.ownership} size="lg"/>
            {detailS.gps_verified&&<Badge status="good" label="GPS Verified" size="lg"/>}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
            {[
              {l:'Students (Boys)',v:detailS.students_boys,Icon:Users,c:'#2563EB'},
              {l:'Students (Girls)',v:detailS.students_girls,Icon:Users,c:'#EC4899'},
              {l:'Teachers (M)',v:detailS.teachers_male,Icon:UserRound,c:'#10B981'},
              {l:'Teachers (F)',v:detailS.teachers_female,Icon:UserRound,c:'#8B5CF6'},
              {l:'Classrooms',v:detailS.classrooms,Icon:Building2,c:'#F59E0B'},
              {l:'Usable',v:detailS.classrooms_good,Icon:CircleCheck,c:'#22C55E'},
              {l:'Textbooks',v:detailS.textbooks,Icon:BookOpen,c:'#3B82F6'},
              {l:'Desks',v:detailS.desks,Icon:Armchair,c:'#6366F1'},
              {l:'Toilets (B)',v:detailS.toilets_boys,Icon:Users,c:'#06B6D4'},
              {l:'Toilets (G)',v:detailS.toilets_girls,Icon:Users,c:'#F472B6'},
            ].map(({l,v,Icon,c})=>(
              <div key={l} style={{background:'var(--bg2)',borderRadius:9,padding:'10px 12px',border:'1px solid var(--border)'}}>
                <div style={{width:28,height:28,borderRadius:7,background:`${c}18`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:6}}>
                  <Icon size={14} color={c}/>
                </div>
                <div style={{fontSize:18,fontWeight:700,color:'var(--text)'}}>{v||0}</div>
                <div style={{fontSize:10,color:'var(--text2)',marginTop:2}}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{display:'flex',gap:7,flexWrap:'wrap',marginBottom:14}}>
            {[
              {l:'Library',v:detailS.has_library,Icon:Library},
              {l:'ICT Lab',v:detailS.has_ict_lab,Icon:Monitor},
              {l:'Science Lab',v:detailS.has_science_lab,Icon:FlaskConical},
              {l:'Water',v:detailS.has_water,Icon:Droplets},
              {l:'Electricity',v:detailS.has_electricity,Icon:Zap},
              {l:'Internet',v:detailS.has_internet,Icon:Globe},
              {l:'Fence',v:detailS.has_fence,Icon:Lock},
              {l:'Canteen',v:detailS.has_canteen,Icon:UtensilsCrossed},
            ].map(({l,v,Icon})=>(
              <span key={l} style={{padding:'5px 11px',borderRadius:8,fontSize:12,fontWeight:600,display:'inline-flex',alignItems:'center',gap:6,
                background:v?'rgba(16,185,129,.1)':'rgba(239,68,68,.1)',color:v?'#065F46':'#991B1B'}}>
                <Icon size={13} color={v?'#10B981':'#EF4444'}/>{l}
              </span>
            ))}
          </div>
          {detailS.latitude&&<div style={{background:'var(--bg2)',borderRadius:9,padding:'10px 13px',fontSize:12.5,border:'1px solid var(--border)'}}>
            <div style={{fontWeight:600,color:'var(--text2)',marginBottom:3}}>GPS COORDINATES</div>
            <div style={{fontFamily:'monospace',fontSize:12}}>{detailS.latitude}°, {detailS.longitude}°</div>
            {detailS.distance_to_road_km&&<div style={{marginTop:4,color:'var(--text2)',fontSize:12}}>{detailS.distance_to_road_km} km to road</div>}
          </div>}
          {canEditSchool(detailS)&&<div style={{display:'flex',gap:10,marginTop:16,justifyContent:'flex-end'}}>
            <Btn variant="outline" onClick={()=>{openEdit(detailS);setDetailS(null)}}>Edit School</Btn>
          </div>}
        </>)}
      </Modal>

      {/* Add/Edit Modal */}
      {(addOpen||editS)&&(
        <Modal open width={700} onClose={()=>{setAddOpen(false);setEditS(null)}}
          title={editS?`Edit — ${editS.name}`:'Register New School'}>
          <SchoolFormFields form={form} setForm={setForm} lockDistrict={lockDistrict} />
          <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
            <Btn variant="outline" onClick={()=>{setAddOpen(false);setEditS(null)}}>Cancel</Btn>
            <Btn onClick={saveSchool}
              disabled={createM.isPending||updateM.isPending}>
              {createM.isPending||updateM.isPending?'Saving...':editS?'Update School':'Register School'}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// TEACHERS PAGE
// ════════════════════════════════════════════════════════════════════
export function TeachersPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const [schoolFilter, setSchoolFilter] = useState(user?.school_id||'')
  const [statusFilter, setStatusFilter] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editT, setEditT] = useState(null)
  const [form, setForm] = useState({school_id:'',full_name:'',gender:'Female',subject:'',qualification:'A1',employment_type:'Permanent',status:'Active',join_year:new Date().getFullYear(),phone:''})

  const { data: teachers=[], isLoading } = useQuery({
    queryKey:['teachers',schoolFilter,statusFilter],
    queryFn:()=>teachersAPI.list({school_id:schoolFilter||undefined,status:statusFilter||undefined}).then(r=>r.data)
  })
  const { data: workload=[] } = useQuery({
    queryKey:['workload'],
    queryFn:()=>teachersAPI.workload({}).then(r=>r.data)
  })
  const { data: schools=[] } = useQuery({ queryKey:['schools-sel'], queryFn:()=>schoolsAPI.list({}).then(r=>r.data) })
  const schoolById = Object.fromEntries(schools.map(s => [s.id, s]))
  const visibleTeachers = teachers.filter(t => textMatches(q, [
    t.full_name, t.gender, t.subject, t.qualification, t.employment_type,
    t.status, t.phone, schoolById[t.school_id]?.name,
  ]))

  const addM = useMutation({ mutationFn:d=>teachersAPI.create(d), onSuccess:()=>{ qc.invalidateQueries(['teachers']); setAddOpen(false); toast.success('Teacher added') }, onError: apiErr })
  const updM = useMutation({ mutationFn:({id,d})=>teachersAPI.update(id,d), onSuccess:()=>{ qc.invalidateQueries(['teachers']); setEditT(null); toast.success('Teacher updated') }, onError: apiErr })
  const delM = useMutation({ mutationFn:id=>teachersAPI.delete(id), onSuccess:()=>{ qc.invalidateQueries(['teachers']); toast.success('Teacher removed') }, onError: apiErr })

  const set = k=>e=>setForm(p=>({...p,[k]:e.target.type==='number'?Number(e.target.value):e.target.value}))
  const qualData = ['A2','A1','A0','Masters','PhD'].map(q=>({name:q,value:teachers.filter(t=>t.qualification===q).length})).filter(d=>d.value>0)
  const COLORS = ['#2563EB','#10B981','#F59E0B','#8B5CF6','#EF4444']
  const canEdit = ['district','school'].includes(user?.role)

  const TeacherForm = () => (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
      <Field label="School"><Select options={[{value:'',label:'— Select —'},...schools.map(s=>({value:s.id,label:s.name}))]}
        value={form.school_id} onChange={e=>setForm(p=>({...p,school_id:+e.target.value}))}/></Field>
      <Field label="Full Name"><Input placeholder="e.g. Alice Uwimana" value={form.full_name} onChange={set('full_name')}/></Field>
      <Field label="Gender"><Select options={['Female','Male']} value={form.gender} onChange={set('gender')}/></Field>
      <Field label="Subject"><Input placeholder="e.g. Mathematics" value={form.subject} onChange={set('subject')}/></Field>
      <Field label="Qualification"><Select options={['A2','A1','A0','Masters','PhD']} value={form.qualification} onChange={set('qualification')}/></Field>
      <Field label="Employment Type"><Select options={['Permanent','Contract','Volunteer']} value={form.employment_type} onChange={set('employment_type')}/></Field>
      <Field label="Status"><Select options={['Active','Absent','Transferred']} value={form.status} onChange={set('status')}/></Field>
      <Field label="Join Year"><Input type="number" value={form.join_year} onChange={set('join_year')}/></Field>
      <Field label="Phone (optional)" full><Input placeholder="+250 7XX XXX XXX" value={form.phone} onChange={set('phone')}/></Field>
    </div>
  )

  return (
    <div>
      <PageHeader title="Teacher Management"
        sub={`${teachers.length} teachers · ${teachers.filter(t=>t.status==='Active').length} active`}
        action={canEdit&&<Btn onClick={()=>setAddOpen(true)}>+ Add Teacher</Btn>}/>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:22}}>
        <StatCard label="Total"    value={teachers.length} sub="Teachers" accent="blue" icon={Users}/>
        <StatCard label="Active"   value={teachers.filter(t=>t.status==='Active').length}  sub="Currently active"  accent="green"/>
        <StatCard label="Absent"   value={teachers.filter(t=>t.status==='Absent').length}  sub="Currently absent"  accent="red" trend="down"/>
        <StatCard label="Overloaded Schools" value={workload.filter(w=>w.overloaded).length} sub="P:T ratio > 1:50" accent="amber" trend="down"/>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:18,marginBottom:18}}>
        <Card>
          <CardHeader title="Teacher Roster"
            action={
              <div style={{display:'flex',gap:8}}>
                <select value={schoolFilter} onChange={e=>setSchoolFilter(e.target.value)}
                  style={{padding:'6px 10px',border:'1.5px solid var(--border)',borderRadius:8,fontSize:12,background:'#fff'}}>
                  <option value="">All Schools</option>
                  {schools.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
                  style={{padding:'6px 10px',border:'1.5px solid var(--border)',borderRadius:8,fontSize:12,background:'#fff'}}>
                  <option value="">All</option>
                  {['Active','Absent','Transferred'].map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
            }/>
          <CardBody>
            <Table loading={isLoading} columns={[
              {key:'full_name',label:'Name',render:v=><strong>{v}</strong>},
              {key:'gender',label:'Gender'},
              {key:'subject',label:'Subject'},
              {key:'qualification',label:'Qual.',render:v=><Badge status="reviewed" label={v}/>},
              {key:'employment_type',label:'Type',render:v=><Badge status="info" label={v}/>},
              {key:'join_year',label:'Since'},
              {key:'status',label:'Status',render:v=><Badge status={v}/>},
              {key:'id',label:'',render:(v,row)=>canEdit&&(
                <div style={{display:'flex',gap:5}}>
                  <Btn size="sm" variant="outline" onClick={()=>{setForm({...row});setEditT(row)}}>Edit</Btn>
                  <Btn size="sm" variant="danger" onClick={()=>{if(confirm('Remove?'))delM.mutate(v)}}>Del</Btn>
                </div>
              )},
            ]} data={teachers}/>
          </CardBody>
        </Card>
        <div style={{display:'flex',flexDirection:'column',gap:18}}>
          <Card><CardHeader title="By Qualification"/><CardBody>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart><Pie data={qualData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65}
                label={({name,value})=>`${name}:${value}`} labelLine={false} fontSize={11}>
                {qualData.map((_,i)=><Cell key={i} fill={COLORS[i]}/>)}
              </Pie><Tooltip contentStyle={{borderRadius:10,fontSize:12}}/></PieChart>
            </ResponsiveContainer>
          </CardBody></Card>
          <Card><CardHeader title="Workload Alerts" subtitle="P:T > 1:50"/><CardBody>
            {workload.filter(w=>w.overloaded).slice(0,5).map(w=>(
              <div key={w.school_id} style={{padding:'8px 0',borderBottom:'1px solid var(--bg)'}}>
                <div style={{fontWeight:600,fontSize:13}}>{w.school_name}</div>
                <div style={{fontSize:11.5,color:'var(--red)',marginTop:2}}>Ratio 1:{w.ratio} · Gap: {w.teacher_gap} teachers needed</div>
              </div>
            ))}
            {workload.filter(w=>w.overloaded).length===0&&<Empty icon="✅" title="No overloaded schools"/>}
          </CardBody></Card>
        </div>
      </div>

      {(addOpen||editT)&&(
        <Modal open width={640} onClose={()=>{setAddOpen(false);setEditT(null)}} title={editT?`Edit — ${editT.full_name}`:'Add Teacher'}>
          <TeacherForm/>
          <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:20}}>
            <Btn variant="outline" onClick={()=>{setAddOpen(false);setEditT(null)}}>Cancel</Btn>
            <Btn onClick={()=>editT?updM.mutate({id:editT.id,d:form}):addM.mutate(form)}
              disabled={addM.isPending||updM.isPending}>
              {addM.isPending||updM.isPending?'Saving...':editT?'Update':'Add Teacher'}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// FEEDBACK PAGE
// ════════════════════════════════════════════════════════════════════
export function FeedbackPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [statusF, setStatusF] = useState('')
  const [typeF, setTypeF] = useState('')
  const [submitOpen, setSubmitOpen] = useState(false)
  const [threadOpen, setThreadOpen] = useState(false)
  const [threadRow, setThreadRow] = useState(null)
  const [threadText, setThreadText] = useState('')
  const [actionNote, setActionNote] = useState('')
  const [form, setForm] = useState({school_id:'',issue_type:'Infrastructure',description:'',reporter_name:'',reporter_contact:''})

  const { data: feedback=[], isLoading } = useQuery({
    queryKey:['feedback-all',statusF,typeF],
    queryFn:()=>feedbackAPI.list({status:statusF||undefined,issue_type:typeF||undefined}).then(r=>r.data)
  })
  const { data: schools=[] } = useQuery({
    queryKey:['schools-fb'],
    queryFn:()=>schoolsAPI.list({}).then(r=>r.data),
    enabled: ['community','school'].includes(user?.role),
  })
  const { data: threadMessages=[] } = useQuery({
    queryKey:['feedback-messages',threadRow?.id],
    queryFn:()=>feedbackAPI.messages(threadRow.id).then(r=>r.data),
    enabled:!!threadRow?.id && threadOpen,
    refetchInterval: threadOpen ? 5000 : false,
  })

  const updM = useMutation({
    mutationFn:({id,d})=>feedbackAPI.update(id,d),
    onSuccess:()=>{
      qc.invalidateQueries(['feedback-all'])
      qc.invalidateQueries(['feedback-messages',threadRow?.id])
      setActionNote('')
      toast.success('Issue updated')
    },
    onError:e=>toast.error(e.response?.data?.detail||'Update failed'),
  })
  const msgM = useMutation({
    mutationFn:({id,content})=>feedbackAPI.sendMessage(id,{content}),
    onSuccess:()=>{
      setThreadText('')
      qc.invalidateQueries(['feedback-messages',threadRow?.id])
    },
    onError:e=>toast.error(e.response?.data?.detail||'Message failed'),
  })
  const forwardM = useMutation({
    mutationFn:id=>feedbackAPI.forward(id),
    onSuccess:()=>{ qc.invalidateQueries(['feedback-all']); toast.success('Forwarded to REB') },
    onError:e=>toast.error(e.response?.data?.detail||'Forward failed'),
  })
  const reopenM = useMutation({
    mutationFn:id=>feedbackAPI.reopen(id),
    onSuccess:()=>{ qc.invalidateQueries(['feedback-all']); toast.success('Issue reopened') },
    onError:e=>toast.error(e.response?.data?.detail||'Reopen failed'),
  })
  const subM = useMutation({
    mutationFn:d=>feedbackAPI.submit(d),
    onSuccess:()=>{
      qc.invalidateQueries(['feedback-all'])
      setSubmitOpen(false)
      setForm({school_id:'',issue_type:'Infrastructure',description:'',reporter_name:'',reporter_contact:''})
      toast.success('Report submitted')
    },
    onError:e=>toast.error(e.response?.data?.detail||'Submit failed'),
  })

  const canReview = ['reb','district'].includes(user?.role)
  const canSubmit = ['community','school'].includes(user?.role)
  const canMessage = ['reb','district','community','school'].includes(user?.role)
  const pending = feedback.filter(f=>f.status==='pending').length

  const openThread = (row) => {
    setThreadRow(row)
    setActionNote(row.reviewer_note||'')
    setThreadOpen(true)
  }

  const submitAction = (type) => {
    if (!threadRow) return
    const needsNote = type === 'resolved' || type === 'closed'
    if (needsNote && actionNote.trim().length < 12) {
      toast.error('Add a note (min 12 characters) when resolving or closing')
      return
    }
    updM.mutate({
      id: threadRow.id,
      d: { status: type, reviewer_note: actionNote.trim() || undefined },
    })
  }

  const title = user?.role === 'community' ? 'My Reports'
    : user?.role === 'school' ? 'My Issues'
    : user?.role === 'reb' ? 'Forwarded Issues'
    : 'Feedback & Community Reports'

  return (
    <div>
      <PageHeader title={title}
        sub={`${feedback.length} total · ${pending} pending`}
        action={canSubmit ? <Btn onClick={()=>setSubmitOpen(true)}>+ Submit Report</Btn> : null}/>

      {pending>0&&canReview&&<Alert type="warning"><strong>{pending} reports</strong> are pending review.</Alert>}

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:22}}>
        <StatCard label="Pending"  value={feedback.filter(f=>f.status==='pending').length}  sub="Awaiting review" accent="amber"/>
        <StatCard label="Reviewed" value={feedback.filter(f=>f.status==='reviewed').length} sub="In progress" accent="blue"/>
        <StatCard label="Resolved" value={feedback.filter(f=>f.status==='resolved').length} sub="Action taken" accent="green"/>
        <StatCard label="Closed"   value={feedback.filter(f=>f.status==='closed').length}   sub="No action possible" accent="cyan"/>
      </div>

      <div style={{display:'flex',gap:10,marginBottom:18,flexWrap:'wrap'}}>
        {['','pending','reviewed','resolved','closed'].map(s=>(
          <button key={s} onClick={()=>setStatusF(s)}
            style={{padding:'6px 14px',borderRadius:8,fontSize:12.5,fontWeight:600,cursor:'pointer',
              border:`1.5px solid ${statusF===s?'var(--blue)':'var(--border)'}`,
              background:statusF===s?'var(--blue-lt)':'var(--card)',
              color:statusF===s?'var(--blue)':'var(--text2)'}}>
            {s||'All Statuses'}
          </button>
        ))}
      </div>

      <Card><CardBody>
        <Table loading={isLoading} columns={[
          {key:'description',label:'Issue',render:v=><span style={{fontSize:12}}>{v?.length>75?v.slice(0,75)+'…':v}</span>},
          {key:'issue_type',label:'Type',render:v=><Badge status="reviewed" label={formatLabel(v)}/>},
          {key:'school_name',label:'School',render:v=>v||'—'},
          {key:'reporter_name',label:'Reporter',render:v=>v||'Anonymous'},
          {key:'created_at',label:'Date',render:v=>v?.slice(0,10)},
          {key:'status',label:'Status',render:v=><Badge status={v} label={formatLabel(v)}/>},
          {key:'id',label:'',render:(v,row)=>(
            <Btn size="sm" variant="outline" onClick={()=>openThread(row)}>Open</Btn>
          )},
        ]} data={feedback} empty="No feedback found"/>
      </CardBody></Card>

      <Modal open={threadOpen} onClose={()=>{setThreadOpen(false);setThreadRow(null)}} width={640}
        title={threadRow ? `Issue #${threadRow.id} · ${formatLabel(threadRow.status)}` : 'Issue thread'}>
        {threadRow && <>
          <div style={{background:'var(--bg2)',borderRadius:10,padding:12,marginBottom:14,border:'1px solid var(--border)'}}>
            <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>{threadRow.description}</div>
            <div style={{fontSize:11,color:'var(--text2)'}}>
              {formatLabel(threadRow.issue_type)} · {threadRow.school_name||'—'} · {threadRow.created_at?.slice(0,10)}
            </div>
          </div>
          <div style={{maxHeight:260,overflowY:'auto',marginBottom:14,paddingRight:4}}>
            {threadMessages.length===0 && (
              <p style={{fontSize:12,color:'var(--text3)',textAlign:'center',padding:20}}>No messages yet — start the conversation</p>
            )}
            {threadMessages.map(m=>{
              const mine = m.user_id === user?.id
              return (
                <div key={m.id} style={{marginBottom:12,textAlign:mine?'right':'left'}}>
                  <div style={{fontSize:10,color:'var(--text3)',marginBottom:4}}>{m.author_name} · {formatLabel(m.author_role)}</div>
                  <div style={{
                    display:'inline-block',maxWidth:'85%',padding:'10px 12px',borderRadius:12,fontSize:13,
                    background:mine?'var(--blue)':'var(--bg)',color:mine?'#fff':'var(--text)',
                    border:mine?'none':'1px solid var(--border)',textAlign:'left',
                  }}>{m.content}</div>
                </div>
              )
            })}
          </div>
          {canMessage && (
            <div style={{display:'flex',gap:8,marginBottom:14}}>
              <Textarea value={threadText} onChange={e=>setThreadText(e.target.value)}
                placeholder="Reply in this thread…" style={{minHeight:44,flex:1}}
                onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();if(threadText.trim())msgM.mutate({id:threadRow.id,content:threadText.trim()})}}}/>
              <Btn onClick={()=>threadText.trim()&&msgM.mutate({id:threadRow.id,content:threadText.trim()})}
                disabled={!threadText.trim()||msgM.isPending}>Send</Btn>
            </div>
          )}
          {canReview && (
            <>
              <Field label="Officer note (required to resolve/close)">
                <Textarea value={actionNote} onChange={e=>setActionNote(e.target.value)}
                  placeholder="Status update or resolution details…" style={{minHeight:70}}/>
              </Field>
              <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:14}}>
                {threadRow.status==='pending'&&<Btn size="sm" onClick={()=>submitAction('reviewed')} disabled={updM.isPending}>Mark Reviewed</Btn>}
                {['pending','reviewed'].includes(threadRow.status)&&<>
                  <Btn size="sm" variant="success" onClick={()=>submitAction('resolved')} disabled={updM.isPending}>Resolve</Btn>
                  <Btn size="sm" variant="ghost" onClick={()=>submitAction('closed')} disabled={updM.isPending}>Close</Btn>
                </>}
                {user?.role==='district'&&!threadRow.forwarded_to_reb&&['reviewed','resolved'].includes(threadRow.status)&&
                  <Btn size="sm" variant="outline" onClick={()=>forwardM.mutate(threadRow.id)} disabled={forwardM.isPending}>Forward to REB</Btn>}
                {['resolved','closed'].includes(threadRow.status)&&
                  <Btn size="sm" variant="outline" onClick={()=>reopenM.mutate(threadRow.id)} disabled={reopenM.isPending}>Reopen</Btn>}
              </div>
            </>
          )}
        </>}
      </Modal>

      <Modal open={submitOpen} onClose={()=>setSubmitOpen(false)} title="Submit a Report">
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <Field label="School *">
            <Select options={[{value:'',label:'— Select school —'},...schools.map(s=>({value:s.id,label:s.name}))]}
              value={form.school_id} onChange={e=>setForm(p=>({...p,school_id:e.target.value}))}/>
          </Field>
          <Field label="Issue Type">
            <Select options={['Infrastructure','Teacher Absence','Resources','Sanitation','Safety','Administration']}
              value={form.issue_type} onChange={e=>setForm(p=>({...p,issue_type:e.target.value}))}/>
          </Field>
          <div style={{gridColumn:'1/-1'}}><Field label="Description *">
            <Textarea placeholder="Describe the issue in detail..." value={form.description}
              onChange={e=>setForm(p=>({...p,description:e.target.value}))} style={{minHeight:100}}/>
          </Field></div>
        </div>
        <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:20}}>
          <Btn variant="outline" onClick={()=>setSubmitOpen(false)}>Cancel</Btn>
          <Btn onClick={()=>{
            if(!form.school_id){toast.error('Select a school');return}
            if(!form.description?.trim()||form.description.trim().length<12){toast.error('Description must be at least 12 characters');return}
            subM.mutate({...form,school_id:+form.school_id})
          }} disabled={subM.isPending}>
            {subM.isPending?'Submitting...':'Submit Report'}
          </Btn>
        </div>
      </Modal>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// ALERTS PAGE
// ════════════════════════════════════════════════════════════════════
export function AlertsPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [levelF, setLevelF] = useState('')
  const [resolved, setResolved] = useState(false)
  const [resolveOpen, setResolveOpen] = useState(false)
  const [resolveId, setResolveId] = useState(null)
  const [resolveNote, setResolveNote] = useState('')

  const { data: alerts=[], isLoading } = useQuery({
    queryKey:['alerts-page',levelF,resolved],
    queryFn:()=>alertsAPI.list({level:levelF||undefined,resolved}).then(r=>r.data)
  })

  const resolveM = useMutation({
    mutationFn:({id,note})=>alertsAPI.resolve(id,{resolution_note:note}),
    onSuccess:()=>{
      qc.invalidateQueries(['alerts-page'])
      setResolveOpen(false)
      setResolveNote('')
      toast.success('Alert resolved')
    },
    onError:e=>toast.error(e.response?.data?.detail||'Resolve failed'),
  })
  const forwardM = useMutation({
    mutationFn:id=>alertsAPI.forward(id),
    onSuccess:()=>{ qc.invalidateQueries(['alerts-page']); toast.success('Forwarded to REB') },
    onError:e=>toast.error(e.response?.data?.detail||'Forward failed'),
  })
  const reopenM = useMutation({
    mutationFn:id=>alertsAPI.reopen(id),
    onSuccess:()=>{ qc.invalidateQueries(['alerts-page']); toast.success('Alert reopened') },
    onError:e=>toast.error(e.response?.data?.detail||'Reopen failed'),
  })

  const canResolve = ['reb','district'].includes(user?.role)
  const pageTitle = user?.role === 'reb' ? 'Forwarded Alerts' : 'Resource Alerts'
  const critical = alerts.filter(a=>a.level==='critical').length

  return (
    <div>
      <PageHeader title={pageTitle} sub={`${alerts.length} shown · ${critical} critical`}/>

      {critical>0&&<Alert type="danger"><strong>{critical} critical alerts</strong> require immediate action.</Alert>}

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:22}}>
        <StatCard label="Critical" value={alerts.filter(a=>a.level==='critical').length} sub="Immediate action" accent="red" trend="down"/>
        <StatCard label="Warning"  value={alerts.filter(a=>a.level==='warning').length}  sub="Monitor closely"  accent="amber"/>
        <StatCard label="Info"     value={alerts.filter(a=>a.level==='info').length}     sub="Informational"    accent="blue"/>
      </div>

      <div style={{display:'flex',gap:10,marginBottom:18,alignItems:'center'}}>
        {['','critical','warning','info'].map(l=>(
          <button key={l} onClick={()=>setLevelF(l)}
            style={{padding:'6px 14px',borderRadius:8,fontSize:12.5,fontWeight:600,cursor:'pointer',
              border:`1.5px solid ${levelF===l?'var(--blue)':'var(--border)'}`,
              background:levelF===l?'var(--blue-lt)':'#fff',color:levelF===l?'var(--blue)':'var(--text2)'}}>
            {l ? formatLabel(l) : 'All Levels'}
          </button>
        ))}
        <label style={{display:'flex',alignItems:'center',gap:8,marginLeft:'auto',fontSize:13,fontWeight:600,cursor:'pointer'}}>
          <input type="checkbox" checked={resolved} onChange={e=>setResolved(e.target.checked)} style={{width:14,height:14}}/>
          Show resolved
        </label>
      </div>

      <Card><CardBody>
        <Table loading={isLoading} columns={[
          {key:'level',label:'Level',render:v=><Badge status={v==='critical'?'critical':v==='warning'?'moderate':'reviewed'} label={formatLabel(v)}/>},
          {key:'alert_type',label:'Type',render:v=><Badge status="info" label={formatLabel(v)}/>},
          {key:'school_name',label:'School',render:v=>v||'—'},
          {key:'message',label:'Message',render:v=><span style={{fontSize:12.5}}>{v}</span>},
          {key:'created_at',label:'Raised',render:v=>v?.slice(0,10)},
          {key:'is_resolved',label:'Status',render:v=><Badge status={v?'good':'pending'} label={v?'Resolved':'Active'}/>},
          {key:'id',label:'Actions',render:(v,row)=>(
            <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
              {canResolve&&!row.is_resolved&&<Btn size="sm" variant="success" onClick={()=>{ setResolveId(v); setResolveOpen(true) }}>Resolve</Btn>}
              {user?.role==='district'&&!row.forwarded_to_reb&&!row.is_resolved&&
                <Btn size="sm" variant="outline" onClick={()=>forwardM.mutate(v)} disabled={forwardM.isPending}>Forward</Btn>}
              {canResolve&&row.is_resolved&&
                <Btn size="sm" variant="outline" onClick={()=>reopenM.mutate(v)} disabled={reopenM.isPending}>Reopen</Btn>}
            </div>
          )},
        ]} data={alerts} empty="No alerts found"/>
      </CardBody></Card>

      <Modal open={resolveOpen} onClose={()=>setResolveOpen(false)} title="Resolve Alert">
        <Field label="Resolution note (required)">
          <Textarea value={resolveNote} onChange={e=>setResolveNote(e.target.value)}
            placeholder="Describe the action taken to address this alert…" style={{minHeight:90}}/>
        </Field>
        <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:16}}>
          <Btn variant="outline" onClick={()=>setResolveOpen(false)}>Cancel</Btn>
          <Btn onClick={()=>{
            if (resolveNote.trim().length<12) { toast.error('Note must be at least 12 characters'); return }
            resolveM.mutate({id:resolveId,note:resolveNote.trim()})
          }} disabled={resolveM.isPending}>{resolveM.isPending?'Saving...':'Confirm Resolve'}</Btn>
        </div>
      </Modal>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// ANALYTICS PAGE
// ════════════════════════════════════════════════════════════════════
export function AnalyticsPage() {
  const { user } = useAuth()
  const isReb = user?.role === 'reb'
  const district = user?.role === 'district' ? user.district : undefined
  const { data: n={} }     = useQuery({ queryKey:['national'], queryFn:()=>analyticsAPI.national().then(r=>r.data), enabled: isReb })
  const { data: dists=[] } = useQuery({ queryKey:['districts'], queryFn:()=>analyticsAPI.districts().then(r=>r.data) })
  const { data: gaps={} }  = useQuery({ queryKey:['gaps',district], queryFn:()=>analyticsAPI.gaps({ district }).then(r=>r.data) })
  const { data: trends=[] }= useQuery({ queryKey:['trends-all',district], queryFn:()=>analyticsAPI.trends({ district }).then(r=>r.data) })
  const { data: gis={} }   = useQuery({ queryKey:['gis-sum'], queryFn:()=>analyticsAPI.gisSummary().then(r=>r.data) })

  return (
    <div>
      <PageHeader title="Analytics" sub="Comprehensive insights across all schools and districts"/>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:22}}>
        <StatCard label="Good Schools"     value={n.good_schools||0}     sub={`${n.total_schools?Math.round((n.good_schools/n.total_schools)*100):0}% of total`} accent="green"/>
        <StatCard label="Moderate Schools" value={n.moderate_schools||0} sub={`${n.total_schools?Math.round((n.moderate_schools/n.total_schools)*100):0}% of total`} accent="amber"/>
        <StatCard label="Critical Schools" value={n.critical_schools||0} sub={`${n.total_schools?Math.round((n.critical_schools/n.total_schools)*100):0}% of total`} accent="red" trend="down"/>
        <StatCard label="GPS Coverage"     value={`${gis.coverage_pct||0}%`} sub={`${gis.gps_verified||0} verified`} accent="cyan"/>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18,marginBottom:18}}>
        <Card><CardHeader title="Students by District"/><CardBody>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dists} barGap={8}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="district" tick={{fontSize:12}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:11}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{borderRadius:10,fontSize:12}}/>
              <Bar dataKey="total_students" fill="#2563EB" name="Students" radius={[5,5,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </CardBody></Card>

        <Card><CardHeader title="Status Distribution by District"/><CardBody>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dists}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="district" tick={{fontSize:12}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:11}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{borderRadius:10,fontSize:12}}/>
              <Legend/>
              <Bar dataKey="good_schools"     fill="#10B981" name="Good"     stackId="a" radius={[4,4,0,0]}/>
              <Bar dataKey="moderate_schools" fill="#F59E0B" name="Moderate" stackId="a"/>
              <Bar dataKey="critical_schools" fill="#EF4444" name="Critical" stackId="a"/>
            </BarChart>
          </ResponsiveContainer>
        </CardBody></Card>
      </div>

      {trends.length>0&&(
        <Card style={{marginBottom:18}}><CardHeader title="National Enrollment Trend (2022–2025)"/><CardBody>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="year" tick={{fontSize:12}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:11}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{borderRadius:10,fontSize:12}}/>
              <Legend/>
              <Line type="monotone" dataKey="total"   stroke="#2563EB" name="Total Students" strokeWidth={2.5} dot={{r:4}}/>
              <Line type="monotone" dataKey="boys"    stroke="#06B6D4" name="Boys"  strokeWidth={2} strokeDasharray="5 3" dot={{r:3}}/>
              <Line type="monotone" dataKey="girls"   stroke="#F59E0B" name="Girls" strokeWidth={2} strokeDasharray="5 3" dot={{r:3}}/>
              <Line type="monotone" dataKey="teachers"stroke="#10B981" name="Teachers" strokeWidth={2} dot={{r:3}}/>
            </LineChart>
          </ResponsiveContainer>
        </CardBody></Card>
      )}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}}>
        <Card><CardHeader title="Resource Gaps — National"/><CardBody>
          <ProgressBar label="Textbooks coverage"    have={gaps.textbooks?.have}  need={gaps.textbooks?.need}/>
          <ProgressBar label="Desks coverage"        have={gaps.desks?.have}       need={gaps.desks?.need}/>
          <ProgressBar label="Toilet capacity"       have={gaps.toilets?.have}     need={gaps.toilets?.need}/>
          <ProgressBar label="Classroom capacity"    have={gaps.classrooms?.have}  need={gaps.classrooms?.need}/>
        </CardBody></Card>
        <Card><CardHeader title="Facility Coverage (% of Schools)"/><CardBody>
          {n.total_schools>0&&[
            ['Water',       n.schools_with_water,      '#06B6D4'],
            ['Electricity', n.schools_with_electricity, '#F59E0B'],
            ['Library',     n.schools_with_library,     '#8B5CF6'],
            ['ICT Lab',     n.schools_with_ict,         '#2563EB'],
            ['GPS Verified',n.schools_gps_verified,     '#10B981'],
          ].map(([l,v,c])=>(
            <ProgressBar key={l} label={l} have={v||0} need={n.total_schools} color={c}/>
          ))}
        </CardBody></Card>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// USERS PAGE
// ════════════════════════════════════════════════════════════════════
export function UsersPage() {
  const qc = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({full_name:'',email:'',password:'',role:'district',district:'Gasabo',school_id:null})
  const { data: users=[], isLoading } = useQuery({ queryKey:['users'], queryFn:()=>usersAPI.list().then(r=>r.data) })

  const addM = useMutation({ mutationFn:d=>usersAPI.create(d), onSuccess:()=>{ qc.invalidateQueries(['users']); setAddOpen(false); toast.success('User created') }, onError: apiErr })
  const delM = useMutation({ mutationFn:id=>usersAPI.delete(id), onSuccess:()=>{ qc.invalidateQueries(['users']); toast.success('User removed') }, onError: apiErr })
  const togM = useMutation({ mutationFn:({id,active})=>usersAPI.update(id,{is_active:active}), onSuccess:()=>{ qc.invalidateQueries(['users']); toast.success('User status updated') }, onError: apiErr })

  const roleColors = {admin:'critical',reb:'reviewed',district:'pending',school:'good',enumerator:'info',community:'moderate'}
  const set = k=>e=>setForm(p=>({...p,[k]:e.target.value}))

  return (
    <div>
      <PageHeader title="User Management" sub={`${users.length} system users`}
        action={<Btn onClick={()=>setAddOpen(true)}>+ Create User</Btn>}/>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:22}}>
        <StatCard label="Total Users"  value={users.length} sub="All roles" accent="blue"/>
        <StatCard label="Active"       value={users.filter(u=>u.is_active).length}  sub="Can sign in" accent="green"/>
        <StatCard label="Inactive"     value={users.filter(u=>!u.is_active).length} sub="Deactivated" accent="red" trend="down"/>
      </div>

      <Card><CardBody>
        <Table loading={isLoading} columns={[
          {key:'full_name',label:'User',render:(v,row)=>(
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:32,height:32,borderRadius:9,flexShrink:0,
                background:'linear-gradient(135deg,#2563EB,#06B6D4)',
                display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#fff'}}>
                {v?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
              </div>
              <div><strong>{v}</strong><div style={{fontSize:11,color:'var(--text2)'}}>{row.email}</div></div>
            </div>
          )},
          {key:'role',label:'Role',render:v=><Badge status={roleColors[v]||'info'} label={v}/>},
          {key:'district',label:'District'},
          {key:'is_active',label:'Status',render:v=><Badge status={v?'good':'critical'} label={v?'Active':'Inactive'}/>},
          {key:'created_at',label:'Created',render:v=>v?.slice(0,10)},
          {key:'id',label:'Actions',render:(v,row)=>(
            <div style={{display:'flex',gap:5}}>
              <Btn size="sm" variant="outline" onClick={()=>togM.mutate({id:v,active:!row.is_active})}>
                {row.is_active?'Deactivate':'Activate'}
              </Btn>
              <Btn size="sm" variant="danger" onClick={()=>{if(confirm('Remove?'))delM.mutate(v)}}>Remove</Btn>
            </div>
          )},
        ]} data={users}/>
      </CardBody></Card>

      <Modal open={addOpen} onClose={()=>setAddOpen(false)} title="Create New User">
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <Field label="Full Name *"><Input placeholder="e.g. Uwimana Alice" value={form.full_name} onChange={set('full_name')}/></Field>
          <Field label="Email *"><Input type="email" placeholder="name@reb.rw" value={form.email} onChange={set('email')}/></Field>
          <Field label="Password *"><Input type="password" placeholder="Min 8 chars" value={form.password} onChange={set('password')}/></Field>
          <Field label="Role"><Select options={['admin','reb','district','school','enumerator','community']} value={form.role} onChange={set('role')}/></Field>
          <Field label="District"><Select options={['National', ...DISTRICT_NAMES]} value={form.district} onChange={set('district')}/></Field>
        </div>
        <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:20}}>
          <Btn variant="outline" onClick={()=>setAddOpen(false)}>Cancel</Btn>
          <Btn onClick={()=>addM.mutate(form)} disabled={addM.isPending}>{addM.isPending?'Creating...':'Create User'}</Btn>
        </div>
      </Modal>
    </div>
  )
}

export default SchoolsPage

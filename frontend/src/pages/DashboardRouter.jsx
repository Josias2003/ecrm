import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { analyticsAPI, alertsAPI, feedbackAPI, schoolsAPI, reportsAPI, systemAPI, logsAPI, usersAPI } from '../api/api'
import toast from 'react-hot-toast'
import { StatCard, Card, CardHeader, CardBody, DonutChart, ProgressBar,
         Badge, Alert, Table, Btn, Tabs, Empty, PageHeader } from '../components/UI'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
         CartesianGrid, LineChart, Line, Legend } from 'recharts'
import { useState } from 'react'
import {
  School, Users, BookOpen, AlertTriangle, TrendingUp, MapPin, Download,
  Armchair, Building2, CircleCheck, Droplets, Zap, Globe, Lock, UtensilsCrossed,
  Library, FlaskConical, Monitor, MessageSquare,
} from 'lucide-react'
import { formatLabel } from '../utils/format'

function monthStart() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

async function downloadReport(type) {
  try {
    const r = await reportsAPI.export({ type, from_date: monthStart(), to_date: todayStr(), format: 'pdf' })
    const url = URL.createObjectURL(r.data)
    const a = document.createElement('a')
    a.href = url
    a.download = `ECRM_${type}_${monthStart()}_${todayStr()}.pdf`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('PDF report downloaded')
  } catch {
    toast.error('PDF export failed')
  }
}

// ── SYSTEM ADMIN DASHBOARD (technical only) ───────────────────────
function AdminDashboard() {
  const navigate = useNavigate()
  const { data: health = {} } = useQuery({ queryKey:['system-health'], queryFn:()=>systemAPI.healthStats().then(r=>r.data) })
  const { data: logs=[] } = useQuery({ queryKey:['admin-logs'], queryFn:()=>logsAPI.list({limit:12}).then(r=>r.data) })
  const { data: users=[] } = useQuery({ queryKey:['admin-users'], queryFn:()=>usersAPI.list(0,200).then(r=>r.data) })

  return (
    <div>
      <PageHeader title="System Health"
        sub="Technical administration — users, security, and platform status"
        action={<Btn variant="outline" onClick={()=>navigate('/users')}>Manage Users</Btn>}/>

      <Alert type="info">System admin manages accounts and platform health only. Education operations are handled by REB and district officers.</Alert>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14,marginBottom:22}}>
        <StatCard label="API Status" value={health.api_status==='ok'?'Online':'Issue'} sub="ECRM backend" accent="green"/>
        <StatCard label="Active Users" value={health.active_users||0} sub={`${health.inactive_users||0} inactive`} accent="blue"/>
        <StatCard label="Audit Events" value={health.audit_events_24h||0} sub="Last 24 hours" accent="cyan"/>
        <StatCard label="Failed Logins" value={health.failed_logins_24h||0} sub="Last 24 hours" accent={health.failed_logins_24h>0?'red':'green'}/>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}}>
        <Card><CardHeader title="Users by Role"/><CardBody>
          {Object.entries(health.users_by_role||{}).map(([role,count])=>(
            <div key={role} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--border)',fontSize:13}}>
              <span style={{textTransform:'capitalize',color:'var(--text2)'}}>{role}</span>
              <strong>{count}</strong>
            </div>
          ))}
          <div style={{marginTop:14,fontSize:12,color:'var(--text3)'}}>
            {users.length} accounts loaded · {health.total_schools||0} schools in database (read-only)
          </div>
        </CardBody></Card>

        <Card><CardHeader title="Recent Audit Activity" action={<Btn size="sm" variant="outline" onClick={()=>navigate('/logs')}>View all</Btn>}/><CardBody>
          {(logs||[]).slice(0,8).map(l=>(
            <div key={l.id} style={{display:'flex',gap:11,padding:'9px 0',borderBottom:'1px solid var(--bg)'}}>
              <Badge status={l.action_type==='LOGIN_FAILED'?'critical':'reviewed'} label={l.action_type} dot={false}/>
              <div style={{flex:1}}>
                <div style={{fontSize:12.5}}>{l.description}</div>
                <div style={{fontSize:11,color:'var(--text3)'}}>{l.user_name||'System'} · {l.created_at?.replace('T',' ').slice(0,16)}</div>
              </div>
            </div>
          ))}
        </CardBody></Card>
      </div>
    </div>
  )
}

// ── REB DASHBOARD ─────────────────────────────────────────────────
function REBDashboard() {
  const [tab, setTab] = useState('overview')
  const { data: n={} }     = useQuery({ queryKey:['national'], queryFn:()=>analyticsAPI.national().then(r=>r.data) })
  const { data: dists=[] } = useQuery({ queryKey:['districts'], queryFn:()=>analyticsAPI.districts().then(r=>r.data) })
  const { data: gaps={} }  = useQuery({ queryKey:['gaps'], queryFn:()=>analyticsAPI.gaps({}).then(r=>r.data) })
  const { data: trends=[] }= useQuery({ queryKey:['trends'], queryFn:()=>analyticsAPI.trends({}).then(r=>r.data) })
  const totalTea = dists.reduce((a,d)=>a+d.total_teachers,0)
  const ratio = n.total_students&&totalTea ? (n.total_students/totalTea).toFixed(1) : '—'

  return (
    <div>
      <PageHeader title="National Education Overview"
        sub={`Rwanda Education Board · ${n.total_schools||0} public schools`}
        action={<Btn onClick={() => downloadReport('district_overview')}><Download size={16}/> Export National Report</Btn>}/>
      {n.critical_schools>0&&<Alert type="warning"><strong>{n.critical_schools} schools</strong> in critical condition — resource intervention required.</Alert>}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14,marginBottom:22}}>
        <StatCard label="Schools"    value={n.total_schools||0} sub="Public mapped" icon={School} accent="blue"/>
        <StatCard label="Students"   value={n.total_students?(n.total_students/1000).toFixed(1)+'K':'—'} sub="Enrolled" icon={Users} accent="green"/>
        <StatCard label="P:T Ratio"  value={`1:${ratio}`} sub="National average" icon={TrendingUp} accent="amber"/>
        <StatCard label="GPS Mapped" value={n.schools_gps_verified||0} sub="Coordinates verified" icon={MapPin} accent="cyan"/>
      </div>
      <Tabs tabs={[{id:'overview',label:'Overview'},{id:'districts',label:'Districts'},{id:'trends',label:'Trends'},{id:'resources',label:'Resources'}]} active={tab} onChange={setTab}/>
      {tab==='overview'&&(<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}}>
        <Card><CardHeader title="Schools by Status"/><CardBody><DonutChart good={n.good_schools} moderate={n.moderate_schools} critical={n.critical_schools}/></CardBody></Card>
        <Card><CardHeader title="Facilities"/><CardBody>
          <ProgressBar label="Water"       have={n.schools_with_water}      need={n.total_schools} color="#3B82F6"/>
          <ProgressBar label="Electricity" have={n.schools_with_electricity} need={n.total_schools} color="#F59E0B"/>
          <ProgressBar label="Library"     have={n.schools_with_library}     need={n.total_schools} color="#8B5CF6"/>
          <ProgressBar label="ICT Lab"     have={n.schools_with_ict}         need={n.total_schools} color="#06B6D4"/>
        </CardBody></Card>
      </div>)}
      {tab==='districts'&&(
        <Card><CardBody>
          <Table columns={[
            {key:'district',label:'District',render:v=><strong>{v}</strong>},
            {key:'total_schools',label:'Schools'},
            {key:'total_students',label:'Students',render:v=>v?.toLocaleString()},
            {key:'total_teachers',label:'Teachers'},
            {key:'avg_pupil_teacher_ratio',label:'P:T Ratio',render:v=>`1:${v}`},
            {key:'schools_with_water',label:'Water',render:(v,r)=>`${v}/${r.total_schools}`},
            {key:'critical_schools',label:'Critical',render:v=><Badge status={v>0?'critical':'good'} label={v}/>},
          ]} data={dists}/>
        </CardBody></Card>
      )}
      {tab==='trends'&&trends.length>0&&(
        <Card><CardHeader title="Enrollment Trends (2022–2025)"/><CardBody>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="year" tick={{fontSize:12}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:11}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{borderRadius:10,border:'1px solid var(--border)',fontSize:12}}/>
              <Legend/>
              <Line type="monotone" dataKey="total" stroke="#2563EB" name="Total Students" strokeWidth={2.5} dot={{r:4}}/>
              <Line type="monotone" dataKey="boys"  stroke="#06B6D4" name="Boys"  strokeWidth={2} dot={{r:3}} strokeDasharray="5 3"/>
              <Line type="monotone" dataKey="girls" stroke="#F59E0B" name="Girls" strokeWidth={2} dot={{r:3}} strokeDasharray="5 3"/>
            </LineChart>
          </ResponsiveContainer>
        </CardBody></Card>
      )}
      {tab==='resources'&&(<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}}>
        <Card><CardHeader title="Resource Gaps"/><CardBody>
          <ProgressBar label="Textbooks" have={gaps.textbooks?.have} need={gaps.textbooks?.need}/>
          <ProgressBar label="Desks"     have={gaps.desks?.have}     need={gaps.desks?.need}/>
          <ProgressBar label="Toilets"   have={gaps.toilets?.have}   need={gaps.toilets?.need}/>
          <ProgressBar label="Classrooms"have={gaps.classrooms?.have}need={gaps.classrooms?.need}/>
        </CardBody></Card>
        <Card><CardHeader title="By District"/><CardBody>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dists}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="district" tick={{fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:11}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{borderRadius:10,fontSize:12}}/>
              <Bar dataKey="good_schools"     fill="#10B981" name="Good"     stackId="a" radius={[4,4,0,0]}/>
              <Bar dataKey="moderate_schools" fill="#F59E0B" name="Moderate" stackId="a"/>
              <Bar dataKey="critical_schools" fill="#EF4444" name="Critical" stackId="a"/>
            </BarChart>
          </ResponsiveContainer>
        </CardBody></Card>
      </div>)}
    </div>
  )
}

// ── DISTRICT DASHBOARD ─────────────────────────────────────────────
function DistrictDashboard() {
  const { user } = useAuth()
  const [tab, setTab] = useState('overview')
  const { data: schools=[] } = useQuery({ queryKey:['schools',user?.district], queryFn:()=>schoolsAPI.list({district:user?.district}).then(r=>r.data) })
  const { data: feedback=[] }= useQuery({ queryKey:['feedback',user?.district], queryFn:()=>feedbackAPI.list({district:user?.district}).then(r=>r.data) })
  const { data: alerts=[] }  = useQuery({ queryKey:['alerts',user?.district], queryFn:()=>alertsAPI.list({district:user?.district,resolved:false}).then(r=>r.data) })
  const { data: gaps={} }    = useQuery({ queryKey:['gaps',user?.district], queryFn:()=>analyticsAPI.gaps({district:user?.district}).then(r=>r.data) })
  const { data: risk=[] }    = useQuery({ queryKey:['risk',user?.district], queryFn:()=>analyticsAPI.riskScores({ district: user?.district, limit: 8 }).then(r=>r.data) })

  const stu = schools.reduce((a,s)=>a+(s.students_boys||0)+(s.students_girls||0),0)
  const tea = schools.reduce((a,s)=>a+(s.teachers_male||0)+(s.teachers_female||0),0)
  const critical = schools.filter(s=>s.status==='critical').length
  const pending  = feedback.filter(f=>f.status==='pending').length

  return (
    <div>
      <PageHeader title={`${user?.district} District`}
        sub={`${schools.length} schools · ${stu.toLocaleString()} students`}
        action={<Btn onClick={() => downloadReport('schools_summary')}><Download size={16}/> Export District Report</Btn>}/>
      {critical>0&&<Alert type="danger"><strong>{critical} school{critical>1?'s':''}</strong> in critical condition — immediate action required.</Alert>}
      {alerts.filter(a=>a.level==='critical').length>0&&<Alert type="warning"><strong>{alerts.filter(a=>a.level==='critical').length} critical alerts</strong> active in your district.</Alert>}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14,marginBottom:22}}>
        <StatCard label="Schools"          value={schools.length} sub={user?.district} icon={School} accent="blue"/>
        <StatCard label="Students"         value={stu.toLocaleString()} sub="Enrolled" icon={Users} accent="green"/>
        <StatCard label="Pending Feedback" value={pending} sub="Need review" icon={AlertTriangle} accent="amber" trend={pending>0?'down':null}/>
        <StatCard label="Active Alerts"    value={alerts.length} sub="Resource gaps" icon={AlertTriangle} accent="red" trend={alerts.length>0?'down':null}/>
      </div>
      <Tabs tabs={[{id:'overview',label:'Overview'},{id:'schools',label:'Schools'},{id:'feedback',label:`Feedback (${pending})`},{id:'resources',label:'Resources'}]} active={tab} onChange={setTab}/>
      {tab==='overview'&&(<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}}>
        <Card><CardHeader title="School Status"/><CardBody>
          <DonutChart good={schools.filter(s=>s.status==='good').length} moderate={schools.filter(s=>s.status==='moderate').length} critical={critical}/>
        </CardBody></Card>
        <Card><CardHeader title="Resource Gaps"/><CardBody>
          <ProgressBar label="Textbooks" have={gaps.textbooks?.have} need={gaps.textbooks?.need}/>
          <ProgressBar label="Desks"     have={gaps.desks?.have}     need={gaps.desks?.need}/>
          <ProgressBar label="Toilets"   have={gaps.toilets?.have}   need={gaps.toilets?.need}/>
          <ProgressBar label="Classrooms"have={gaps.classrooms?.have}need={gaps.classrooms?.need}/>
        </CardBody></Card>
        <Card hover={false} style={{gridColumn:'1/-1', border:'none', boxShadow:'none', background:'transparent'}}><CardHeader title="Top Risk Schools (Your District)" subtitle="Prioritize site visits and interventions"/>
          <CardBody>
            <Table columns={[
              { key:'name', label:'School', render:(v)=> <strong>{v}</strong> },
              { key:'status', label:'Status', render:v=> <Badge status={v} dot={false}/> },
              { key:'pupil_teacher_ratio', label:'P:T', render:v=>(
                <div style={{fontFamily:'monospace',textAlign:'center',width:'100%'}}>{v ? `1:${v}` : '—'}</div>
              ) },
              { key:'risk_score', label:'Risk', render:v=>{
                const score = Number(v || 0)
                const color = score >= 35 ? '#EF4444' : score >= 25 ? '#F59E0B' : '#22C55E'
                return (
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <span style={{width:8,height:8,borderRadius:'50%',background:color}}/>
                    <span style={{fontWeight:900,color}}>{score}/100</span>
                  </div>
                )
              } },
            ]} data={risk} empty="No risk data"/>
          </CardBody>
        </Card>
      </div>)}
      {tab==='schools'&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(270px,1fr))',gap:14}}>
          {schools.map(s=>{
            const stu=(s.students_boys||0)+(s.students_girls||0)
            const tea=(s.teachers_male||0)+(s.teachers_female||0)
            return (
              <div key={s.id} style={{background:'#fff',borderRadius:13,border:'1px solid var(--border)',
                padding:18,boxShadow:'var(--sh-sm)',transition:'all .2s',
                borderLeft:`4px solid ${s.status==='good'?'var(--green)':s.status==='moderate'?'var(--amber)':'var(--red)'}`}}
                onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='var(--sh)'}}
                onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='var(--sh-sm)'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:14}}>{s.name}</div>
                    <div style={{fontSize:12,color:'var(--text2)',marginTop:2}}>{s.sector} · {s.school_type}</div>
                  </div>
                  <Badge status={s.status}/>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
                  {[['Students',stu,'👩‍🎓'],['Teachers',tea,'👨‍🏫']].map(([l,v,ic])=>(
                    <div key={l} style={{background:'var(--bg2)',borderRadius:8,padding:'8px 10px'}}>
                      <div style={{fontSize:16}}>{ic}</div>
                      <div style={{fontFamily:'Syne',fontSize:18,fontWeight:800}}>{v}</div>
                      <div style={{fontSize:10,color:'var(--text2)'}}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                  {[['💧',s.has_water],['⚡',s.has_electricity],['📚',s.has_library],['💻',s.has_ict_lab]].map(([ic,v],i)=>(
                    <span key={i} style={{padding:'2px 7px',borderRadius:6,fontSize:11,fontWeight:600,
                      background:v?'rgba(16,185,129,.1)':'rgba(239,68,68,.1)',color:v?'#065F46':'#991B1B'}}>{ic}</span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
      {tab==='feedback'&&(
        <Card><CardBody>
          <Table columns={[
            {key:'description',label:'Issue',render:v=><span style={{fontSize:12}}>{v?.slice(0,70)}{v?.length>70?'…':''}</span>},
            {key:'issue_type',label:'Type',render:v=><Badge status="reviewed" label={v}/>},
            {key:'reporter_name',label:'Reporter',render:v=>v||'Anonymous'},
            {key:'created_at',label:'Date',render:v=>v?.slice(0,10)},
            {key:'status',label:'Status',render:v=><Badge status={v}/>},
          ]} data={feedback} empty="No feedback for your district"/>
        </CardBody></Card>
      )}
      {tab==='resources'&&(
        <Card><CardHeader title="Resource Coverage"/><CardBody>
          <ProgressBar label="Textbooks" have={gaps.textbooks?.have} need={gaps.textbooks?.need}/>
          <ProgressBar label="Desks"     have={gaps.desks?.have}     need={gaps.desks?.need}/>
          <ProgressBar label="Toilets"   have={gaps.toilets?.have}   need={gaps.toilets?.need}/>
          <ProgressBar label="Classrooms"have={gaps.classrooms?.have}need={gaps.classrooms?.need}/>
        </CardBody></Card>
      )}
    </div>
  )
}

// ── SCHOOL HEAD DASHBOARD ──────────────────────────────────────────
function SchoolDashboard() {
  const { user } = useAuth()
  const [tab, setTab] = useState('overview')
  const { data: school } = useQuery({
    queryKey:['school',user?.school_id],
    queryFn:()=>user?.school_id?schoolsAPI.get(user.school_id).then(r=>r.data):null,
    enabled:!!user?.school_id
  })
  const { data: teachers=[] } = useQuery({
    queryKey:['teachers',user?.school_id],
    queryFn:()=>import('../api/api').then(m=>m.teachersAPI.list({school_id:user?.school_id}).then(r=>r.data)),
    enabled:!!user?.school_id
  })
  const { data: feedback=[] } = useQuery({
    queryKey:['feedback-school',user?.school_id],
    queryFn:()=>feedbackAPI.list({school_id:user?.school_id}).then(r=>r.data),
    enabled:!!user?.school_id
  })
  const { data: alerts=[] } = useQuery({
    queryKey:['alerts-school',user?.school_id],
    queryFn:()=>alertsAPI.list({school_id:user?.school_id,resolved:false}).then(r=>r.data),
    enabled:!!user?.school_id
  })
  const { data: history=[] } = useQuery({
    queryKey:['history',user?.school_id],
    queryFn:()=>import('../api/api').then(m=>m.enrollmentAPI.get(user.school_id).then(r=>r.data)),
    enabled:!!user?.school_id
  })
  const s = school||{}
  const stu=(s.students_boys||0)+(s.students_girls||0)
  const tea=(s.teachers_male||0)+(s.teachers_female||0)
  const ratio=stu&&tea?(stu/tea).toFixed(1):'—'

  return (
    <div>
      <PageHeader title={s.name||'My School'}
        sub={`${s.district} · ${s.sector} · ${s.school_type}`}
        action={<div style={{display:'flex',gap:8,alignItems:'center'}}>{s.status&&<Badge status={s.status} size="lg"/>}</div>}/>
      {alerts.filter(a=>a.level==='critical').length>0&&<Alert type="danger">{alerts.filter(a=>a.level==='critical').length} critical resource alerts for your school.</Alert>}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:22}}>
        <StatCard label="Students"   value={stu}         sub={`${s.students_boys||0} boys · ${s.students_girls||0} girls`} icon={Users} accent="blue"/>
        <StatCard label="Teachers"   value={tea}         sub={`${s.teachers_male||0}M · ${s.teachers_female||0}F`} icon={Users} accent="green"/>
        <StatCard label="P:T Ratio"  value={`1:${ratio}`}sub="Pupil to teacher" icon={TrendingUp} accent="amber"/>
        <StatCard label="Classrooms" value={s.classrooms||0} sub={`${s.classrooms_good||0} usable`} icon={School} accent="cyan"/>
      </div>
      <Tabs tabs={[{id:'overview',label:'Overview'},{id:'resources',label:'Resources'},{id:'teachers',label:'Teachers'},{id:'history',label:'History'},{id:'feedback',label:'Feedback'}]} active={tab} onChange={setTab}/>
      {tab==='overview'&&(<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}}>
        <Card><CardHeader title="Inventory"/><CardBody>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {[
              {l:'Textbooks',v:s.textbooks,Icon:BookOpen,c:'#2563EB'},
              {l:'Desks',v:s.desks,Icon:Armchair,c:'#8B5CF6'},
              {l:'Toilets (Boys)',v:s.toilets_boys,Icon:Users,c:'#06B6D4'},
              {l:'Toilets (Girls)',v:s.toilets_girls,Icon:Users,c:'#EC4899'},
              {l:'Classrooms',v:s.classrooms,Icon:Building2,c:'#F59E0B'},
              {l:'Usable Rooms',v:s.classrooms_good,Icon:CircleCheck,c:'#10B981'},
            ].map(({l,v,Icon,c})=>(
              <div key={l} style={{background:'var(--bg2)',borderRadius:10,padding:14,border:'1px solid var(--border)'}}>
                <div style={{width:34,height:34,borderRadius:9,background:`${c}18`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:8}}>
                  <Icon size={17} color={c}/>
                </div>
                <div style={{fontFamily:'Syne',fontSize:22,fontWeight:800,color:'var(--text)'}}>{v||0}</div>
                <div style={{fontSize:11,color:'var(--text2)',marginTop:2}}>{l}</div>
              </div>
            ))}
          </div>
        </CardBody></Card>
        <Card><CardHeader title="Facilities"/><CardBody>
          {[
            {l:'Library',v:s.has_library,Icon:Library},
            {l:'ICT Lab',v:s.has_ict_lab,Icon:Monitor},
            {l:'Science Lab',v:s.has_science_lab,Icon:FlaskConical},
            {l:'Running Water',v:s.has_water,Icon:Droplets},
            {l:'Electricity',v:s.has_electricity,Icon:Zap},
            {l:'Internet',v:s.has_internet,Icon:Globe},
            {l:'Fence',v:s.has_fence,Icon:Lock},
            {l:'Canteen',v:s.has_canteen,Icon:UtensilsCrossed},
          ].map(({l,v,Icon})=>(
            <div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
              <div style={{display:'flex',gap:10,alignItems:'center'}}>
                <div style={{width:30,height:30,borderRadius:8,background:v?'#ECFDF5':'#FEF2F2',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <Icon size={15} color={v?'#10B981':'#EF4444'}/>
                </div>
                <span style={{fontWeight:600,fontSize:13}}>{l}</span>
              </div>
              <Badge status={v?'good':'critical'} label={v?'Available':'Missing'}/>
            </div>
          ))}
        </CardBody></Card>
      </div>)}
      {tab==='resources'&&(<Card><CardHeader title="Resource vs Requirements"/><CardBody>
        <ProgressBar label="Textbooks (1 per student)" have={s.textbooks} need={stu}/>
        <ProgressBar label="Desks (1 per student)"     have={s.desks}     need={stu}/>
        <ProgressBar label="Toilet capacity boys (1:30)"  have={(s.toilets_boys||0)*30}  need={s.students_boys||1}/>
        <ProgressBar label="Toilet capacity girls (1:30)" have={(s.toilets_girls||0)*30} need={s.students_girls||1}/>
        <ProgressBar label="Classroom capacity (40/room)" have={(s.classrooms||0)*40}    need={stu}/>
      </CardBody></Card>)}
      {tab==='teachers'&&(<Card><CardHeader title="Teacher Roster" subtitle={`${teachers.length} records`}/><CardBody>
        <Table columns={[
          {key:'full_name',label:'Name',render:v=><strong>{v}</strong>},
          {key:'gender',label:'Gender'},
          {key:'subject',label:'Subject'},
          {key:'qualification',label:'Qual.',render:v=><Badge status="reviewed" label={v}/>},
          {key:'employment_type',label:'Contract',render:v=><Badge status="info" label={v}/>},
          {key:'join_year',label:'Since'},
          {key:'status',label:'Status',render:v=><Badge status={v}/>},
        ]} data={teachers}/>
      </CardBody></Card>)}
      {tab==='history'&&history.length>0&&(<Card><CardHeader title="Enrollment History"/><CardBody>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
            <XAxis dataKey="year" tick={{fontSize:12}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fontSize:11}} axisLine={false} tickLine={false}/>
            <Tooltip contentStyle={{borderRadius:10,fontSize:12}}/>
            <Legend/>
            <Line type="monotone" dataKey="students_boys"  stroke="#2563EB" name="Boys"  strokeWidth={2} dot={{r:4}}/>
            <Line type="monotone" dataKey="students_girls" stroke="#F59E0B" name="Girls" strokeWidth={2} dot={{r:4}}/>
          </LineChart>
        </ResponsiveContainer>
      </CardBody></Card>)}
      {tab==='feedback'&&(<Card><CardHeader title="Submitted Issues"/><CardBody>
        {feedback.length===0?<Empty title="No issues yet" desc="Reports you submit will appear here with status updates"/>:
          feedback.map(f=>(
            <div key={f.id} style={{display:'flex',gap:12,padding:'12px 0',borderBottom:'1px solid var(--border)'}}>
              <div style={{width:32,height:32,borderRadius:8,background:'var(--blue-lt)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <MessageSquare size={15} color="var(--blue)"/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600}}>{f.description?.slice(0,120)}{f.description?.length>120?'…':''}</div>
                <div style={{fontSize:11,color:'var(--text2)',marginTop:3}}>{formatLabel(f.issue_type)} · {f.created_at?.slice(0,10)}</div>
              </div>
              <Badge status={f.status}/>
            </div>
          ))
        }
      </CardBody></Card>)}
    </div>
  )
}

// ── ENUMERATOR DASHBOARD ──────────────────────────────────────────
function EnumeratorDashboard() {
  const { user } = useAuth()
  return (
    <div>
      <PageHeader title="Field Data Collection" sub="Submit and sync school data from the field"/>
      <Alert type="info">Navigate to <strong>Schools</strong> to register new schools with GPS, or use the <strong>GIS Map</strong> to view existing locations.</Alert>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:22}}>
        <StatCard label="Your District" value={user?.district} sub="Assigned area" accent="blue"/>
        <StatCard label="Mode"          value="Online"          sub="Data syncing live" accent="green"/>
        <StatCard label="Action"        value="Collect GPS"     sub="Use Schools page" accent="cyan"/>
      </div>
      <Card><CardHeader title="Quick Guide"/><CardBody>
        {[['1. Register a school','Go to Schools → Register School. Fill all fields and capture GPS coordinates.','Step 1'],
          ['2. Verify GPS on site','Open the school on the GIS Map and verify coordinates when physically at the school.','Step 2'],
          ['3. Update locations','Use the Field Map to correct or add GPS for schools missing coordinates.','Step 3'],
        ].map(([title,desc,step])=>(
          <div key={title} style={{display:'flex',gap:14,padding:'14px 0',borderBottom:'1px solid var(--bg)'}}>
            <span style={{fontSize:12,fontWeight:700,color:'var(--blue)',flexShrink:0,width:48}}>{step}</span>
            <div><div style={{fontWeight:700,fontSize:14,marginBottom:3}}>{title}</div>
            <div style={{fontSize:13,color:'var(--text2)'}}>{desc}</div></div>
          </div>
        ))}
      </CardBody></Card>
    </div>
  )
}

// ── COMMUNITY DASHBOARD ────────────────────────────────────────────
function CommunityDashboard() {
  return (
    <div>
      <PageHeader title="Community Portal" sub="Report issues · Track progress · View schools"/>
      <Alert type="info">Your reports are reviewed by the District Education Officer and help improve schools in your community.</Alert>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:22}}>
        <div style={{background:'#fff',borderRadius:13,padding:22,border:'1px solid var(--border)',textAlign:'center',cursor:'pointer'}}
          onClick={()=>window.location.href='/feedback'}>
          <div style={{fontSize:40,marginBottom:10}}>📨</div>
          <div style={{fontFamily:'Syne',fontSize:16,fontWeight:800,marginBottom:5}}>Submit a Report</div>
          <div style={{fontSize:13,color:'var(--text2)'}}>Report an issue at your local school</div>
        </div>
        <div style={{background:'#fff',borderRadius:13,padding:22,border:'1px solid var(--border)',textAlign:'center',cursor:'pointer'}}
          onClick={()=>window.location.href='/feedback'}>
          <div style={{fontSize:40,marginBottom:10}}>🔍</div>
          <div style={{fontFamily:'Syne',fontSize:16,fontWeight:800,marginBottom:5}}>Track Reports</div>
          <div style={{fontSize:13,color:'var(--text2)'}}>See status of submitted reports</div>
        </div>
        <div style={{background:'#fff',borderRadius:13,padding:22,border:'1px solid var(--border)',textAlign:'center',cursor:'pointer'}}
          onClick={()=>window.location.href='/gis'}>
          <div style={{fontSize:40,marginBottom:10}}>🗺️</div>
          <div style={{fontFamily:'Syne',fontSize:16,fontWeight:800,marginBottom:5}}>View School Map</div>
          <div style={{fontSize:13,color:'var(--text2)'}}>See all schools on the GIS map</div>
        </div>
      </div>
    </div>
  )
}

// ── ROUTER ─────────────────────────────────────────────────────────
export default function DashboardRouter() {
  const { user } = useAuth()
  const map = {
    admin: AdminDashboard, reb: REBDashboard, district: DistrictDashboard,
    school: SchoolDashboard, enumerator: EnumeratorDashboard, community: CommunityDashboard,
  }
  const Comp = map[user?.role] || AdminDashboard
  return <Comp />
}

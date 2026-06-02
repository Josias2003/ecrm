import { Loader2, AlertTriangle, CheckCircle, Info, X, ChevronDown } from 'lucide-react'

/* ── DESIGN TOKENS ─────────────────────────────────────────────── */
export const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300..900;1,14..32,300..900&family=Syne:wght@700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --navy:#0D1B2A;--navy2:#162032;--navy3:#1E3050;
  --blue:#2563EB;--blue-h:#1D4ED8;--blue-lt:#EFF6FF;--blue-md:#BFDBFE;
  --cyan:#06B6D4;--green:#10B981;--amber:#F59E0B;--red:#EF4444;--purple:#8B5CF6;
  --bg:#F1F5F9;--bg2:#F8FAFC;--white:#fff;
  --border:#E2E8F0;--border2:#CBD5E1;
  --text:#0F172A;--text2:#475569;--text3:#94A3B8;
  --r:12px;--r-lg:16px;
  --sh-sm:0 1px 3px rgba(0,0,0,.08),0 1px 2px rgba(0,0,0,.04);
  --sh:0 4px 16px rgba(0,0,0,.08);
  --sh-lg:0 12px 40px rgba(0,0,0,.12);
}
body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased}
h1,h2,h3{font-family:'Syne',sans-serif}
button,input,select,textarea{font-family:inherit}
a{text-decoration:none;color:inherit}
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--border2);border-radius:99px}
.leaflet-container{border-radius:var(--r)}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes modalIn{from{opacity:0;transform:scale(.95) translateY(8px)}to{opacity:1;transform:scale(1)}}
@keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
`

/* ── BADGE ─────────────────────────────────────────────────────── */
const BS = {
  good:     {bg:'#ECFDF5',c:'#065F46',dot:'#10B981'},
  moderate: {bg:'#FFFBEB',c:'#92400E',dot:'#F59E0B'},
  critical: {bg:'#FEF2F2',c:'#991B1B',dot:'#EF4444'},
  pending:  {bg:'#FFFBEB',c:'#92400E',dot:'#F59E0B'},
  reviewed: {bg:'#EFF6FF',c:'#1E40AF',dot:'#2563EB'},
  resolved: {bg:'#ECFDF5',c:'#065F46',dot:'#10B981'},
  Active:   {bg:'#ECFDF5',c:'#065F46',dot:'#10B981'},
  Absent:   {bg:'#FEF2F2',c:'#991B1B',dot:'#EF4444'},
  info:     {bg:'#EFF6FF',c:'#1E40AF',dot:'#2563EB'},
  warning:  {bg:'#FFFBEB',c:'#92400E',dot:'#F59E0B'},
  Public:   {bg:'#EFF6FF',c:'#1E40AF',dot:'#2563EB'},
  Primary:  {bg:'#F5F3FF',c:'#5B21B6',dot:'#8B5CF6'},
  Secondary:{bg:'#FFF7ED',c:'#9A3412',dot:'#F97316'},
}
export const Badge = ({ status, label, size = 'sm' }) => {
  const s = BS[status] || {bg:'#F1F5F9',c:'#475569',dot:'#94A3B8'}
  return (
    <span style={{display:'inline-flex',alignItems:'center',gap:5,
      padding: size==='lg' ? '5px 12px' : '3px 9px',
      borderRadius:20,fontSize: size==='lg' ? 13 : 11.5,fontWeight:600,
      background:s.bg,color:s.c}}>
      <span style={{width:6,height:6,borderRadius:'50%',background:s.dot,flexShrink:0}}/>
      {label ?? status}
    </span>
  )
}

/* ── STAT CARD ─────────────────────────────────────────────────── */
const ACCENTS = {blue:'#2563EB',green:'#10B981',amber:'#F59E0B',red:'#EF4444',cyan:'#06B6D4',purple:'#8B5CF6'}
export const StatCard = ({ label, value, sub, icon: Icon, accent='blue', trend }) => {
  const c = ACCENTS[accent]
  return (
    <div style={{background:'#fff',borderRadius:14,padding:'20px 22px',border:'1px solid var(--border)',
      boxShadow:'var(--sh-sm)',borderTop:`3px solid ${c}`,position:'relative',overflow:'hidden',
      transition:'transform .2s,box-shadow .2s',cursor:'default'}}
      onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='var(--sh)'}}
      onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='var(--sh-sm)'}}>
      {Icon && <Icon size={28} style={{position:'absolute',right:18,top:18,color:c,opacity:.13}}/>}
      <div style={{fontSize:11,fontWeight:600,color:'var(--text2)',textTransform:'uppercase',letterSpacing:.6}}>{label}</div>
      <div style={{fontFamily:'Syne',fontSize:30,fontWeight:800,color:'var(--text)',margin:'6px 0 4px',lineHeight:1}}>{value ?? '—'}</div>
      {sub && <div style={{fontSize:12,color:trend==='down'?'var(--red)':trend==='up'?'var(--green)':'var(--text2)',fontWeight:500}}>{sub}</div>}
    </div>
  )
}

/* ── CARD ──────────────────────────────────────────────────────── */
export const Card = ({ children, style }) => (
  <div style={{background:'#fff',borderRadius:14,border:'1px solid var(--border)',
    boxShadow:'var(--sh-sm)',overflow:'hidden',...style}}>{children}</div>
)
export const CardHeader = ({ title, subtitle, action }) => (
  <div style={{padding:'18px 22px 0',display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
    <div>
      <div style={{fontWeight:700,fontSize:14.5,color:'var(--text)'}}>{title}</div>
      {subtitle && <div style={{fontSize:12,color:'var(--text2)',marginTop:2}}>{subtitle}</div>}
    </div>
    {action}
  </div>
)
export const CardBody = ({ children, style }) => <div style={{padding:'18px 22px',...style}}>{children}</div>

/* ── PROGRESS BAR ──────────────────────────────────────────────── */
export const ProgressBar = ({ label, have, need, color }) => {
  const pct = Math.min((have / Math.max(need,1))*100, 100)
  const c = color || (pct>80?'#10B981':pct>50?'#F59E0B':'#EF4444')
  return (
    <div style={{marginBottom:14}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
        <span style={{fontSize:13,fontWeight:500}}>{label}</span>
        <span style={{fontSize:13,fontWeight:700,color:c}}>{(have||0).toLocaleString()} / {(need||0).toLocaleString()}</span>
      </div>
      <div style={{height:7,background:'var(--bg)',borderRadius:99,overflow:'hidden'}}>
        <div style={{height:'100%',width:`${pct}%`,background:c,borderRadius:99,transition:'width .6s ease'}}/>
      </div>
    </div>
  )
}

/* ── DONUT CHART ───────────────────────────────────────────────── */
export const DonutChart = ({ good=0, moderate=0, critical=0 }) => {
  const total = good+moderate+critical || 1
  const R=40, cx=50, cy=50, circ=2*Math.PI*R
  const slices = [{v:good,c:'#10B981'},{v:moderate,c:'#F59E0B'},{v:critical,c:'#EF4444'}]
  let off=0
  return (
    <div style={{display:'flex',alignItems:'center',gap:24}}>
      <svg width={100} height={100} viewBox="0 0 100 100">
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--border)" strokeWidth={13}/>
        {slices.map((s,i)=>{
          const dash=(s.v/total)*circ
          const el=<circle key={i} cx={cx} cy={cy} r={R} fill="none" stroke={s.c}
            strokeWidth={13} strokeDasharray={`${dash} ${circ-dash}`}
            strokeDashoffset={-off} transform="rotate(-90 50 50)"/>
          off+=dash; return el
        })}
        <text x="50" y="46" textAnchor="middle" fontSize="12" fontWeight="800"
          fill="var(--text)" fontFamily="Syne">{good+moderate+critical}</text>
        <text x="50" y="59" textAnchor="middle" fontSize="8" fill="var(--text2)">schools</text>
      </svg>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {[['Good',good,'#10B981'],['Moderate',moderate,'#F59E0B'],['Critical',critical,'#EF4444']].map(([l,n,c])=>(
          <div key={l} style={{display:'flex',alignItems:'center',gap:8,fontSize:13}}>
            <span style={{width:10,height:10,borderRadius:'50%',background:c,flexShrink:0}}/>
            <strong>{n}</strong><span style={{color:'var(--text2)'}}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── BUTTON ────────────────────────────────────────────────────── */
export const Btn = ({children,onClick,variant='primary',size='md',disabled,type='button',style={}}) => {
  const V = {
    primary: {background:'var(--blue)',color:'#fff',border:'none'},
    outline: {background:'#fff',color:'var(--text)',border:'1.5px solid var(--border)'},
    danger:  {background:'var(--red)',color:'#fff',border:'none'},
    ghost:   {background:'transparent',color:'var(--text2)',border:'none'},
    success: {background:'var(--green)',color:'#fff',border:'none'},
    amber:   {background:'var(--amber)',color:'#fff',border:'none'},
  }
  const S = {
    sm: {padding:'5px 12px',fontSize:12,borderRadius:8},
    md: {padding:'9px 18px',fontSize:13.5,borderRadius:10},
    lg: {padding:'12px 24px',fontSize:14,borderRadius:11},
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{display:'inline-flex',alignItems:'center',gap:7,fontWeight:600,
        cursor:disabled?'not-allowed':'pointer',opacity:disabled?.6:1,
        transition:'all .15s',...V[variant],...S[size],...style}}
      onMouseEnter={e=>{if(!disabled&&variant==='primary')e.currentTarget.style.background='var(--blue-h)'}}
      onMouseLeave={e=>{if(!disabled&&variant==='primary')e.currentTarget.style.background='var(--blue)'}}>
      {children}
    </button>
  )
}

/* ── INPUT / SELECT / TEXTAREA ─────────────────────────────────── */
const IS = {padding:'9px 12px',border:'1.5px solid var(--border)',borderRadius:9,
  fontSize:13.5,color:'var(--text)',outline:'none',background:'#fff',
  transition:'border-color .15s',width:'100%'}
const focus = e => e.target.style.borderColor='var(--blue)'
const blur  = e => e.target.style.borderColor='var(--border)'

export const Input    = p => <input    style={IS} {...p} onFocus={focus} onBlur={blur}/>
export const Textarea = p => <textarea style={{...IS,minHeight:80,resize:'vertical'}} {...p} onFocus={focus} onBlur={blur}/>
export const Select   = ({options=[],...p}) => (
  <select style={IS} {...p} onFocus={focus} onBlur={blur}>
    {options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}
  </select>
)
export const Field = ({label,children,error,full}) => (
  <div style={{display:'flex',flexDirection:'column',gap:5,...(full?{gridColumn:'1/-1'}:{})}}>
    {label && <label style={{fontSize:12,fontWeight:600,color:'var(--text2)'}}>{label}</label>}
    {children}
    {error && <span style={{fontSize:11.5,color:'var(--red)'}}>{error}</span>}
  </div>
)
export const Checkbox = ({label,checked,onChange}) => (
  <label style={{display:'flex',alignItems:'center',gap:9,cursor:'pointer',fontWeight:600,fontSize:13.5}}>
    <input type="checkbox" checked={checked} onChange={onChange} style={{width:15,height:15}}/>{label}
  </label>
)

/* ── MODAL ─────────────────────────────────────────────────────── */
export const Modal = ({open,onClose,title,children,width=560}) => {
  if(!open) return null
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,.55)',
      display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,
      backdropFilter:'blur(4px)'}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:18,width,maxWidth:'96vw',maxHeight:'90vh',
        overflowY:'auto',boxShadow:'var(--sh-lg)',animation:'modalIn .22s ease'}}
        onClick={e=>e.stopPropagation()}>
        <div style={{padding:'22px 26px 0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h2 style={{fontFamily:'Syne',fontSize:18,fontWeight:800}}>{title}</h2>
          <button onClick={onClose} style={{width:32,height:32,borderRadius:8,
            border:'1.5px solid var(--border)',background:'#fff',cursor:'pointer',
            fontSize:17,color:'var(--text2)',display:'flex',alignItems:'center',justifyContent:'center',
            transition:'all .15s'}}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--red)';e.currentTarget.style.color='#fff'}}
            onMouseLeave={e=>{e.currentTarget.style.background='#fff';e.currentTarget.style.color='var(--text2)'}}>
            <X size={16}/>
          </button>
        </div>
        <div style={{padding:'18px 26px 26px'}}>{children}</div>
      </div>
    </div>
  )
}

/* ── DATA TABLE ────────────────────────────────────────────────── */
export const Table = ({columns,data,empty='No records found',loading}) => (
  <div style={{overflowX:'auto'}}>
    <table style={{width:'100%',borderCollapse:'collapse'}}>
      <thead>
        <tr>{columns.map(c=>(
          <th key={c.key} style={{fontSize:11,fontWeight:700,color:'var(--text2)',
            textTransform:'uppercase',letterSpacing:.6,padding:'10px 14px',
            textAlign:'left',borderBottom:'2px solid var(--border)',whiteSpace:'nowrap'}}>
            {c.label}
          </th>
        ))}</tr>
      </thead>
      <tbody>
        {loading ? (
          <tr><td colSpan={columns.length} style={{padding:40,textAlign:'center'}}><Spinner/></td></tr>
        ) : data.length===0 ? (
          <tr><td colSpan={columns.length} style={{padding:40,textAlign:'center',color:'var(--text3)',fontSize:14}}>{empty}</td></tr>
        ) : data.map((row,i)=>(
          <tr key={i}
            onMouseEnter={e=>e.currentTarget.style.background='var(--bg2)'}
            onMouseLeave={e=>e.currentTarget.style.background=''}>
            {columns.map(c=>(
              <td key={c.key} style={{padding:'11px 14px',borderBottom:'1px solid var(--bg)',fontSize:13,...(c.style||{})}}>
                {c.render ? c.render(row[c.key],row) : row[c.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

/* ── TABS ──────────────────────────────────────────────────────── */
export const Tabs = ({tabs,active,onChange}) => (
  <div style={{display:'flex',gap:3,background:'var(--bg)',padding:4,
    borderRadius:10,width:'fit-content',marginBottom:20}}>
    {tabs.map(t=>(
      <button key={t.id} onClick={()=>onChange(t.id)}
        style={{padding:'7px 15px',borderRadius:7,fontSize:13,fontWeight:600,
          cursor:'pointer',border:'none',transition:'all .15s',
          background:active===t.id?'#fff':'transparent',
          color:active===t.id?'var(--text)':'var(--text2)',
          boxShadow:active===t.id?'var(--sh-sm)':'none'}}>
        {t.label}{t.badge?` (${t.badge})`:''}
      </button>
    ))}
  </div>
)

/* ── ALERT BANNER ──────────────────────────────────────────────── */
export const Alert = ({type='info',children,onClose}) => {
  const M = {
    info:    {bg:'#EFF6FF',border:'#BFDBFE',c:'#1E40AF',Icon:Info},
    warning: {bg:'#FFFBEB',border:'#FDE68A',c:'#92400E',Icon:AlertTriangle},
    danger:  {bg:'#FEF2F2',border:'#FECACA',c:'#991B1B',Icon:AlertTriangle},
    success: {bg:'#ECFDF5',border:'#A7F3D0',c:'#065F46',Icon:CheckCircle},
  }[type]||{}
  return (
    <div style={{display:'flex',alignItems:'center',gap:10,padding:'11px 14px',
      borderRadius:10,marginBottom:16,background:M.bg,
      border:`1px solid ${M.border}`,color:M.c,fontSize:13}}>
      {M.Icon && <M.Icon size={16} style={{flexShrink:0}}/>}
      <div style={{flex:1}}>{children}</div>
      {onClose && <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:M.c,fontSize:16,lineHeight:1}}>×</button>}
    </div>
  )
}

/* ── SPINNER / LOADING ─────────────────────────────────────────── */
export const Spinner = ({size=24,color='var(--blue)'}) => (
  <Loader2 size={size} color={color} style={{animation:'spin 1s linear infinite'}}/>
)
export const PageLoad = () => (
  <div style={{display:'flex',alignItems:'center',justifyContent:'center',
    height:'100vh',flexDirection:'column',gap:14}}>
    <Spinner size={38}/><span style={{color:'var(--text2)',fontSize:14}}>Loading ECRM...</span>
  </div>
)

/* ── EMPTY STATE ───────────────────────────────────────────────── */
export const Empty = ({icon='📭',title='Nothing here',desc}) => (
  <div style={{textAlign:'center',padding:'48px 20px'}}>
    <div style={{fontSize:48,marginBottom:12,opacity:.4}}>{icon}</div>
    <div style={{fontFamily:'Syne',fontSize:15,fontWeight:700,color:'var(--text)',marginBottom:6}}>{title}</div>
    {desc&&<div style={{fontSize:13.5,color:'var(--text2)'}}>{desc}</div>}
  </div>
)

/* ── PAGE HEADER ───────────────────────────────────────────────── */
export const PageHeader = ({title,sub,action}) => (
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:22}}>
    <div>
      <h1 style={{fontFamily:'Syne',fontSize:22,fontWeight:800,color:'var(--text)'}}>{title}</h1>
      {sub&&<p style={{fontSize:13,color:'var(--text2)',marginTop:3}}>{sub}</p>}
    </div>
    {action}
  </div>
)

/* ── SECTION TITLE ─────────────────────────────────────────────── */
export const SectionTitle = ({children}) => (
  <div style={{fontSize:11,fontWeight:700,color:'var(--text2)',textTransform:'uppercase',
    letterSpacing:.8,marginBottom:12}}>{children}</div>
)

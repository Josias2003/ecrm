import { Loader2, AlertTriangle, CheckCircle, Info, X, ChevronDown } from 'lucide-react'

/* ── DESIGN TOKENS ─────────────────────────────────────────────── */
export const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300..900;1,14..32,300..900&family=Syne:wght@700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root,[data-theme="light"]{
  --navy:#0F172A;--navy2:#111D33;--navy3:#1E3050;
  --blue:#3B82F6;--blue-h:#2563EB;--blue-lt:#EFF6FF;--blue-md:#BFDBFE;
  --cyan:#14B8A6;--green:#22C55E;--amber:#F59E0B;--red:#EF4444;--purple:#8B5CF6;
  --bg:#F8FAFC;--bg2:#FFFFFF;--white:#fff;
  --border:#E2E8F0;--border2:#CBD5E1;
  --text:#0F172A;--text2:#64748B;--text3:#94A3B8;
  --card:#fff;--topbar:#fff;
  --r:12px;--r-lg:16px;
  --sh-sm:0 1px 3px rgba(0,0,0,.08),0 1px 2px rgba(0,0,0,.04);
  --sh:0 4px 16px rgba(0,0,0,.08);
  --sh-lg:0 12px 40px rgba(0,0,0,.12);
}
[data-theme="dark"]{
  --navy:#0B1220;--navy2:#0F172A;--navy3:#1E293B;
  --blue:#60A5FA;--blue-h:#3B82F6;--blue-lt:rgba(59,130,246,.15);--blue-md:rgba(59,130,246,.25);
  --cyan:#2DD4BF;--green:#4ADE80;--amber:#FBBF24;--red:#F87171;--purple:#A78BFA;
  --bg:#0F172A;--bg2:#1E293B;--white:#1E293B;
  --border:#334155;--border2:#475569;
  --text:#F8FAFC;--text2:#94A3B8;--text3:#64748B;
  --card:#1E293B;--topbar:#1E293B;
  --sh-sm:0 1px 3px rgba(0,0,0,.3);
  --sh:0 4px 16px rgba(0,0,0,.35);
  --sh-lg:0 12px 40px rgba(0,0,0,.45);
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
  moderate: {bg:'#FEF3C7',c:'#92400E',dot:'#F59E0B'},
  critical: {bg:'#FEF2F2',c:'#991B1B',dot:'#EF4444'},
  pending:  {bg:'#FEF3C7',c:'#92400E',dot:'#F59E0B'},
  reviewed: {bg:'#EFF6FF',c:'#1E40AF',dot:'#2563EB'},
  resolved: {bg:'#ECFDF5',c:'#065F46',dot:'#10B981'},
  closed:   {bg:'#F1F5F9',c:'#475569',dot:'#94A3B8'},
  Active:   {bg:'#ECFDF5',c:'#065F46',dot:'#10B981'},
  Absent:   {bg:'#FEF2F2',c:'#991B1B',dot:'#EF4444'},
  info:     {bg:'#EFF6FF',c:'#1E40AF',dot:'#2563EB'},
  warning:  {bg:'#FFFBEB',c:'#92400E',dot:'#F59E0B'},
  Public:   {bg:'#EFF6FF',c:'#1E40AF',dot:'#2563EB'},
  Primary:  {bg:'#F5F3FF',c:'#5B21B6',dot:'#8B5CF6'},
  Secondary:{bg:'#FFF7ED',c:'#9A3412',dot:'#F97316'},
}
export const Badge = ({ status, label, size = 'sm', dot = true }) => {
  const s = BS[status] || {bg:'#F1F5F9',c:'#475569',dot:'#94A3B8'}
  return (
    <span style={{display:'inline-flex',alignItems:'center',gap:5,
      padding: size==='lg' ? '6px 12px' : '4px 10px',
      borderRadius:20,fontSize: size==='lg' ? 13 : 11.5,fontWeight:600,
      background:s.bg,color:s.c}}>
      {dot && <span style={{width:6,height:6,borderRadius:'50%',background:s.dot,flexShrink:0}}/>}
      {label ?? status}
    </span>
  )
}

/* ── STAT CARD ─────────────────────────────────────────────────── */
const ACCENTS = {blue:'#2563EB',green:'#10B981',amber:'#F59E0B',red:'#EF4444',cyan:'#06B6D4',purple:'#8B5CF6'}
export const StatCard = ({ label, value, sub, icon: Icon, accent='blue', trend }) => {
  const c = ACCENTS[accent]
  const isAlert = accent === 'red'
  return (
    <div style={{
      background:'var(--card)',
      borderRadius:12,
      padding:'20px 20px',
      border:'1px solid var(--border)',
      boxShadow:'var(--sh-sm)',
      borderBottom:`3px solid ${c}`,
      position:'relative',
      overflow:'hidden',
      transition:'transform 200ms ease, box-shadow 200ms ease',
      cursor:'default',
      transform:'translateZ(0)',
    }}
      onMouseEnter={e=>{
        e.currentTarget.style.transform='translateY(-2px)'
        e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'
      }}
      onMouseLeave={e=>{
        e.currentTarget.style.transform=''
        e.currentTarget.style.boxShadow='var(--sh-sm)'
      }}>
      {Icon && <Icon size={20} style={{position:'absolute',right:16,top:16,color:c,opacity:.16}}/>}
      <div style={{fontSize:12,fontWeight:600,color:'#64748B',textTransform:'uppercase',letterSpacing:'0.05em'}}>{label}</div>
      <div style={{fontSize:32,fontWeight:700,color:isAlert ? c : '#0F172A',margin:'8px 0 6px',lineHeight:1}}>{value ?? '—'}</div>
      {sub && (
        <div style={{fontSize:13,color:isAlert ? c : '#94A3B8',fontWeight:600}}>
          {sub}
        </div>
      )}
    </div>
  )
}

/* ── CARD ──────────────────────────────────────────────────────── */
export const Card = ({ children, style, hover = true }) => (
  <div
    style={{
      background:'var(--card)',
      borderRadius:12,
      border:'1px solid var(--border)',
      boxShadow:'var(--sh-sm)',
      overflow:'hidden',
      transition:'transform 200ms ease, box-shadow 200ms ease',
      ...style
    }}
    onMouseEnter={hover ? (e=>{
      e.currentTarget.style.transform='translateY(-2px)'
      e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'
    }) : undefined}
    onMouseLeave={hover ? (e=>{
      e.currentTarget.style.transform=''
      e.currentTarget.style.boxShadow='var(--sh-sm)'
    }) : undefined}
  >
    {children}
  </div>
)
export const CardHeader = ({ title, subtitle, action }) => (
  <div style={{padding:'18px 20px 0',display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
    <div>
      <div style={{fontWeight:700,fontSize:14.5,color:'var(--text)'}}>{title}</div>
      {subtitle && <div style={{fontSize:12,color:'var(--text2)',marginTop:2}}>{subtitle}</div>}
    </div>
    {action}
  </div>
)
export const CardBody = ({ children, style }) => <div style={{padding:'18px 20px',...style}}>{children}</div>

/* ── PROGRESS BAR ──────────────────────────────────────────────── */
export const ProgressBar = ({ label, have, need, color }) => {
  const pct = Math.min((have / Math.max(need,1))*100, 100)
  const c = color || (pct>80?'#22C55E':pct>50?'#F59E0B':'#EF4444')
  return (
    <div style={{padding:'10px 0',borderBottom:'1px solid #EEF2F7',minHeight:40}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:8}}>
        <span style={{fontSize:13,fontWeight:600,color:'#64748B'}}>{label}</span>
        <span style={{fontSize:13,fontWeight:700,color:c,whiteSpace:'nowrap'}}>
          {(have||0).toLocaleString()} / {(need||0).toLocaleString()}
        </span>
      </div>
      <div style={{height:8,background:'#F1F5F9',borderRadius:999,overflow:'hidden'}}>
        <div style={{height:'100%',width:`${pct}%`,background:c,borderRadius:999,transition:'width .6s ease'}}/>
      </div>
    </div>
  )
}

/* ── DONUT CHART ───────────────────────────────────────────────── */
export const DonutChart = ({ good=0, moderate=0, critical=0 }) => {
  const total = good+moderate+critical || 1
  const size = 140
  const R=52, cx=size/2, cy=size/2, circ=2*Math.PI*R
  const slices = [{v:good,c:'#10B981'},{v:moderate,c:'#F59E0B'},{v:critical,c:'#EF4444'}]
  let off=0
  return (
    <div style={{display:'flex',alignItems:'center',gap:24,flexWrap:'wrap'}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{flexShrink:0}}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--border)" strokeWidth={14}/>
        {slices.map((s,i)=>{
          const dash=(s.v/total)*circ
          const el=<circle key={i} cx={cx} cy={cy} r={R} fill="none" stroke={s.c}
            strokeWidth={13} strokeDasharray={`${dash} ${circ-dash}`}
            strokeDashoffset={-off} transform={`rotate(-90 ${cx} ${cy})`}/>
          off+=dash; return el
        })}
        <text x={cx} y={cy-6} textAnchor="middle" fontSize="18" fontWeight="900"
          fill="#0F172A" fontFamily="Syne">{total}</text>
        <text x={cx} y={cy+15} textAnchor="middle" fontSize="12" fill="#94A3B8" fontWeight="700">Schools</text>
      </svg>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {[['Good',good,'#22C55E'],['Moderate',moderate,'#F59E0B'],['Critical',critical,'#EF4444']].map(([l,n,c])=>(
          <div key={l} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,fontSize:13}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{width:8,height:8,borderRadius:'50%',background:c,flexShrink:0}}/>
              <span style={{color:'#64748B',fontWeight:600}}>{l}</span>
            </div>
            <strong style={{color:'#0F172A'}}>{n}</strong>
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
    outline: {background:'var(--card)',color:'var(--text)',border:'1.5px solid var(--border)'},
    danger:  {background:'var(--red)',color:'#fff',border:'none'},
    ghost:   {background:'transparent',color:'var(--text2)',border:'none'},
    success: {background:'var(--green)',color:'#fff',border:'none'},
    amber:   {background:'var(--amber)',color:'#fff',border:'none'},
  }
  const S = {
    sm: {padding:'5px 12px',fontSize:12,borderRadius:8},
    md: {padding:'12px 20px',fontSize:14,borderRadius:12},
    lg: {padding:'14px 26px',fontSize:14,borderRadius:12},
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{display:'inline-flex',alignItems:'center',gap:7,fontWeight:600,
        cursor:disabled?'not-allowed':'pointer',opacity:disabled?.6:1,
        transition:'all 150ms ease',...V[variant],...S[size],...style}}
      onMouseEnter={e=>{if(!disabled&&variant==='primary')e.currentTarget.style.background='var(--blue-h)'}}
      onMouseLeave={e=>{
        if(!disabled&&variant==='primary')e.currentTarget.style.background='var(--blue)'
        if(!disabled)e.currentTarget.style.transform='scale(1)'
      }}
      onMouseDown={e=>{if(!disabled)e.currentTarget.style.transform='scale(0.97)'}}
      onMouseUp={e=>{if(!disabled)e.currentTarget.style.transform='scale(1)'}}>
      {children}
    </button>
  )
}

/* ── INPUT / SELECT / TEXTAREA ─────────────────────────────────── */
const IS = {padding:'9px 12px',border:'1.5px solid var(--border)',borderRadius:9,
  fontSize:13.5,color:'var(--text)',outline:'none',background:'var(--card)',
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
      <div style={{background:'var(--card)',borderRadius:18,width,maxWidth:'96vw',maxHeight:'90vh',
        overflowY:'auto',boxShadow:'var(--sh-lg)',animation:'modalIn .22s ease'}}
        onClick={e=>e.stopPropagation()}>
        <div style={{padding:'22px 26px 0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h2 style={{fontSize:17,fontWeight:700,color:'var(--text)'}}>{title}</h2>
          <button onClick={onClose} style={{width:32,height:32,borderRadius:8,
            border:'1.5px solid var(--border)',background:'var(--card)',cursor:'pointer',
            fontSize:17,color:'var(--text2)',display:'flex',alignItems:'center',justifyContent:'center',
            transition:'all .15s'}}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--red)';e.currentTarget.style.color='#fff'}}
            onMouseLeave={e=>{e.currentTarget.style.background='var(--card)';e.currentTarget.style.color='var(--text2)'}}>
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
    <table style={{width:'100%',borderCollapse:'collapse',minWidth:560}}>
      <thead>
        <tr>{columns.map(c=>(
          <th
            key={c.key}
            style={{
              position:'sticky',
              top:0,
              zIndex:3,
              fontSize:11,
              fontWeight:700,
              color:'#94A3B8',
              textTransform:'uppercase',
              letterSpacing:'0.05em',
              padding:'10px 14px',
              textAlign:'left',
              background:'var(--bg2)',
              borderBottom:'1px solid var(--border)',
              whiteSpace:'nowrap',
            }}
          >
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
          <tr
            key={i}
            style={{height:48, background: i%2===1 ? 'var(--bg)' : 'var(--card)', transition:'background 150ms ease'}}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--bg2)'}}
            onMouseLeave={e=>{e.currentTarget.style.background=i%2===1 ? 'var(--bg)' : 'var(--card)'}}
          >
            {columns.map((c,colIdx)=>(
              <td
                key={c.key}
                style={{
                  padding:'0 14px',
                  borderBottom:'1px solid #EEF2F7',
                  fontSize:13,
                  verticalAlign:'middle',
                  ...(c.style || {}),
                  ...(colIdx===0
                    ? { position:'sticky', left:0, background:'var(--card)', zIndex:2 }
                    : {}),
                }}
              >
                {c.render ? c.render(row[c.key],row) : row[c.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

/* ── PAGINATION ────────────────────────────────────────────────── */
export const Pagination = ({ page, totalPages, totalItems, pageSize, onPageChange }) => {
  if (!totalItems || totalItems <= pageSize) return null
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalItems)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)',
      flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 12.5, color: 'var(--text2)' }}>
        Showing {start}–{end} of {totalItems}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Btn size="sm" variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Btn>
        <span style={{ fontSize: 12.5, fontWeight: 600, padding: '0 8px', color: 'var(--text2)' }}>
          Page {page} of {totalPages}
        </span>
        <Btn size="sm" variant="outline" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next
        </Btn>
      </div>
    </div>
  )
}

/* ── TABS ──────────────────────────────────────────────────────── */
export const Tabs = ({tabs,active,onChange}) => (
  <div style={{display:'flex',gap:3,background:'#F1F5F9',padding:4,
    borderRadius:12,width:'fit-content',marginBottom:20}}>
    {tabs.map(t=>(
      <button key={t.id} onClick={()=>onChange(t.id)}
        style={{padding:'8px 16px',borderRadius:999,fontSize:14,fontWeight:500,
          cursor:'pointer',border:'none',transition:'all .15s',
          background:active===t.id?'#fff':'transparent',
          color:active===t.id?'#0F172A':'#64748B',
          boxShadow:active===t.id?'0 1px 3px rgba(0,0,0,0.1)':'none'}}>
        {t.label}{t.badge?` (${t.badge})`:''}
      </button>
    ))}
  </div>
)

/* ── ALERT BANNER ──────────────────────────────────────────────── */
export const Alert = ({type='info',children,onClose, toast = false}) => {
  const M = {
    info:    {bg:'#EFF6FF',border:'#BFDBFE',c:'#1E40AF',Icon:Info},
    warning: {bg:'#FFFBEB',border:'#FDE68A',c:'#92400E',Icon:AlertTriangle},
    danger:  {bg:'#FEF2F2',border:'#FECACA',c:'#991B1B',Icon:AlertTriangle},
    success: {bg:'#ECFDF5',border:'#A7F3D0',c:'#065F46',Icon:CheckCircle},
  }[type]||{}
  return (
    <div
      style={{
        display:'flex',
        alignItems:'center',
        gap:10,
        padding:'11px 14px',
        borderRadius:12,
        marginBottom: toast ? 0 : 16,
        background:M.bg,
        border:`1px solid ${M.border}`,
        color:M.c,
        fontSize:13,
        boxShadow:'0 4px 12px rgba(0,0,0,0.06)',
        transition:'transform 150ms ease',
        ...(toast
          ? { position:'fixed', top:80, right:24, zIndex:1200, width:440, maxWidth:'calc(100vw - 48px)' }
          : {}),
      }}
    >
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
  <div style={{
    display:'flex', alignItems:'center', justifyContent:'center',
    height:'100vh', flexDirection:'column', gap:18,
    background:'linear-gradient(135deg, #0F172A 0%, #1E3A5F 45%, #0F172A 100%)',
    position:'relative', overflow:'hidden',
  }}>
    {[
      { w:120, t:40, l:60, o:.12 },
      { w:80, t:'auto', b:80, r:100, o:.1 },
      { w:60, t:120, r:'20%', o:.08 },
      { w:100, b:120, l:'15%', o:.1 },
    ].map((s,i) => (
      <div key={i} style={{
        position:'absolute', width:s.w, height:s.w, borderRadius:16,
        top:s.t, left:s.l, right:s.r, bottom:s.b,
        background:'linear-gradient(135deg, rgba(59,130,246,.35), rgba(6,182,212,.2))',
        opacity:s.o, transform:`rotate(${i*15}deg)`,
      }}/>
    ))}
    <div style={{ display:'flex', gap:8, position:'relative', zIndex:1 }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          width:10, height:10, borderRadius:'50%', background:'#60A5FA',
          animation:`fadeUp 1s ease ${i*0.2}s infinite alternate`,
        }}/>
      ))}
    </div>
    <span style={{ color:'rgba(255,255,255,.7)', fontSize:14, position:'relative', zIndex:1 }}>Loading ECRM...</span>
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
      <h1 style={{fontFamily:'Inter',fontSize:22,fontWeight:700,color:'var(--text)'}}>{title}</h1>
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

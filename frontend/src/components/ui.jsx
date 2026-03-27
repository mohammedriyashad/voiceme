import React from 'react'

export function Card({ children, style }) {
  return (
    <div style={{
      background:'var(--card)', border:'1px solid var(--border)',
      borderRadius:'var(--radius)', overflow:'hidden',
      display:'flex', flexDirection:'column', ...style,
    }}>{children}</div>
  )
}

export function CardHeader({ icon, title, right }) {
  return (
    <div style={{
      padding:'9px 13px', borderBottom:'1px solid var(--border)',
      display:'flex', alignItems:'center', gap:7, flexShrink:0,
      background:'rgba(255,255,255,.015)',
    }}>
      {icon && <span>{icon}</span>}
      <span style={{ fontSize:9, fontWeight:700, letterSpacing:'2px',
        textTransform:'uppercase', color:'var(--muted)' }}>{title}</span>
      {right && <div style={{ flex:1, display:'flex', justifyContent:'flex-end' }}>{right}</div>}
    </div>
  )
}

export function CardBody({ children, style }) {
  return <div style={{ flex:1, overflow:'hidden', padding:10, ...style }}>{children}</div>
}

const BTN = {
  primary: { background:'linear-gradient(135deg,var(--cyan),var(--violet))', color:'#060B14', border:'none' },
  ghost:   { background:'var(--card2)', border:'1px solid var(--border2)', color:'var(--muted)' },
  danger:  { background:'rgba(255,90,90,.12)', border:'1px solid rgba(255,90,90,.3)', color:'var(--red)' },
  green:   { background:'rgba(0,229,160,.1)',  border:'1px solid rgba(0,229,160,.3)',  color:'var(--green)' },
  amber:   { background:'rgba(245,158,11,.1)', border:'1px solid rgba(245,158,11,.3)', color:'var(--amber)' },
}

export function Btn({ children, variant='ghost', size='md', onClick, disabled, style }) {
  return (
    <button
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      style={{
        border:'none', borderRadius: size==='sm' ? 6 : 'var(--radius-sm)',
        padding: size==='sm' ? '4px 10px' : '7px 14px',
        fontFamily:'var(--font)', fontSize: size==='sm' ? 10 : 11,
        fontWeight:700, cursor: disabled ? 'not-allowed' : 'pointer',
        display:'inline-flex', alignItems:'center', gap:6,
        transition:'all .2s', letterSpacing:'.2px', whiteSpace:'nowrap',
        opacity: disabled ? .45 : 1,
        ...BTN[variant], ...style,
      }}
    >{children}</button>
  )
}

export function StatCard({ value, label, color='var(--cyan)' }) {
  return (
    <div style={{
      background:'var(--surface)', border:'1px solid var(--border)',
      borderRadius:10, padding:'10px 12px',
      display:'flex', flexDirection:'column', alignItems:'center', gap:3,
    }}>
      <div style={{ fontSize:20, fontWeight:800, color }}>{value}</div>
      <div style={{ fontSize:9, color:'var(--muted)', letterSpacing:'.5px', textTransform:'uppercase' }}>{label}</div>
    </div>
  )
}

export function SignalBox({ title, icon, name, meaning, hints=[] }) {
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:10 }}>
      <div style={{ fontSize:9, fontWeight:700, letterSpacing:'1.8px', textTransform:'uppercase',
        color:'var(--muted)', marginBottom:7 }}>{title}</div>
      <div style={{
        display:'flex', alignItems:'center', gap:9,
        background:'rgba(0,200,240,.04)', border:'1px solid rgba(0,200,240,.12)',
        borderRadius:7, padding:'8px 10px', marginBottom:6,
      }}>
        <span style={{ fontSize:22 }}>{icon}</span>
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--cyan)' }}>{name}</div>
          <div style={{ fontSize:10, color:'var(--muted)', marginTop:1 }}>{meaning}</div>
        </div>
      </div>
      {hints.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4 }}>
          {hints.map((h,i) => (
            <div key={i} style={{ fontSize:9, color:'var(--muted)',
              background:'var(--card)', borderRadius:5, padding:'3px 7px' }}>
              {h.icon} → <span style={{ color:'var(--cyan)' }}>{h.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function FusionRow({ label, value, active }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:7,
      padding:'4px 0', borderBottom:'1px solid var(--border)', fontSize:11 }}>
      <div style={{ color:'var(--muted)', width:64, fontSize:9, flexShrink:0,
        paddingTop:2, letterSpacing:'.5px', textTransform:'uppercase' }}>{label}</div>
      <div style={{ color: active ? 'var(--cyan)' : 'var(--text)',
        fontWeight:600, flex:1, wordBreak:'break-word', fontSize:10 }}>{value || '—'}</div>
    </div>
  )
}

export function Toast({ message, type='success', onClose }) {
  React.useEffect(() => { const t=setTimeout(onClose,3000); return ()=>clearTimeout(t) }, [onClose])
  const colors = { success:'var(--green)', error:'var(--red)', warning:'var(--amber)' }
  return (
    <div style={{
      position:'fixed', bottom:20, right:20, zIndex:999,
      background:'var(--card2)', border:'1px solid var(--border2)',
      borderRadius:10, padding:'10px 16px', fontSize:12, fontWeight:600,
      color: colors[type]||colors.success, animation:'slideUp .3s ease',
      boxShadow:'0 8px 24px rgba(0,0,0,.4)',
    }}>{message}</div>
  )
}

export function Modal({ show, onClose, title, children }) {
  if (!show) return null
  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,.7)',
      zIndex:100, display:'flex', alignItems:'center', justifyContent:'center',
      backdropFilter:'blur(4px)',
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:'var(--card)', border:'1px solid var(--border2)',
        borderRadius:16, padding:24, width:420, maxWidth:'95vw',
        maxHeight:'85vh', overflowY:'auto', animation:'slideUp .25s ease',
      }}>
        <div style={{ fontSize:16, fontWeight:800, marginBottom:16 }}>{title}</div>
        {children}
      </div>
    </div>
  )
}

export function Input({ label, ...props }) {
  return (
    <div style={{ marginBottom:14 }}>
      {label && <label style={{ fontSize:10, fontWeight:700, letterSpacing:'.8px',
        textTransform:'uppercase', color:'var(--muted)', display:'block', marginBottom:5 }}>{label}</label>}
      <input style={{
        background:'var(--surface)', border:'1px solid var(--border2)',
        borderRadius:'var(--radius-sm)', padding:'8px 12px',
        color:'var(--text)', fontFamily:'var(--font)', fontSize:12,
        outline:'none', width:'100%',
      }} {...props}/>
    </div>
  )
}

export function Skeleton({ w='100%', h=40, r=8 }) {
  return (
    <div style={{
      width:w, height:h, borderRadius:r,
      background:'linear-gradient(90deg,var(--surface) 25%,rgba(255,255,255,.04) 50%,var(--surface) 75%)',
      backgroundSize:'400px 100%', animation:'shimmer 1.4s infinite',
    }}/>
  )
}

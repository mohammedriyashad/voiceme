
import React, { useState, useRef, useCallback } from 'react'
import { useStore } from './utils/store'
import Dashboard from './pages/Dashboard'
import Profiles  from './pages/Profiles'
import Alerts    from './pages/Alerts'
import Reports   from './pages/Reports'
import Symbols   from './pages/Symbols'

// ── WebSocket singleton ───────────────────────────────────────
const WS_URL = 'ws://localhost:8000/api/camera/ws'

const TABS = [
  { id:'dashboard', label:'📊 Dashboard' },
  { id:'profiles',  label:'👤 Profiles'  },
  { id:'alerts',    label:'🔔 Alerts'    },
  { id:'reports',   label:'📄 Reports'   },
  { id:'symbols',   label:'🖼️ Symbols'   },
]
const PAGES = { dashboard:Dashboard, profiles:Profiles,
                alerts:Alerts, reports:Reports, symbols:Symbols }

export default function App() {
  const [tab, setTab] = useState('dashboard')
  const wsRef        = useRef(null)
  const timerRef     = useRef(null)

  const { setEmotion, setGesture, setPose, setWsConnected,
          addAlert, incStat, setLatency,
          wsConnected, emotion, gesture, pose, alertCount } = useStore()

  // ── Stable send function stored on window so CameraPanel can use it
  const send = useCallback((payload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN)
      wsRef.current.send(JSON.stringify(payload))
  }, [])
  window._aacSend = send

  // ── WebSocket connect
  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws
      ws.onopen  = () => { setWsConnected(true); console.log('[WS] Connected ✓') }
      ws.onclose = () => {
        setWsConnected(false)
        timerRef.current = setTimeout(connect, 3000)
      }
      ws.onerror = () => setWsConnected(false)
      ws.onmessage = (e) => {
        const t0 = performance.now()
        const d  = JSON.parse(e.data)

        if (d.emotion) {
          setEmotion(d.emotion)
          console.log('[Emotion]', d.emotion.display_label, d.emotion.confidence_pct + '%')
        }
        if (d.gesture) {
          setGesture(d.gesture)
          if (d.gesture.name !== 'none')
            console.log('[Gesture]', d.gesture.name, d.gesture.meaning)
        }
        if (d.pose) setPose(d.pose)
        if (d.alert) { addAlert(d.alert); incStat('alerts') }
        setLatency(Math.round(performance.now() - t0))
      }
    } catch { timerRef.current = setTimeout(connect, 3000) }
  }, [])

  React.useEffect(() => {
    connect()
    return () => { clearTimeout(timerRef.current); wsRef.current?.close() }
  }, [])

  const Page = PAGES[tab]

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh',
      position:'relative', zIndex:1 }}>

      {/* TOP BAR */}
      <header style={{
        display:'flex', alignItems:'center', gap:12,
        padding:'0 16px', height:54, flexShrink:0,
        background:'rgba(12,21,36,0.97)',
        borderBottom:'1px solid var(--border)',
      }}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          <div style={{ width:36, height:36, borderRadius:10, flexShrink:0,
            background:'linear-gradient(135deg,var(--cyan),var(--violet))',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🗣️</div>
          <div>
            <div style={{ fontSize:16, fontWeight:800 }}>
              Voice<span style={{ color:'var(--cyan)' }}>Me</span> AAC
            </div>
            <div style={{ fontSize:9, color:'var(--muted)', letterSpacing:'1.5px', textTransform:'uppercase' }}>
              Advanced · Phi-2 · Python
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:2, background:'var(--surface)',
          border:'1px solid var(--border)', borderRadius:10, padding:3 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding:'5px 14px', borderRadius:7, cursor:'pointer',
              fontSize:11, fontWeight: tab===t.id ? 700 : 500,
              color: tab===t.id ? 'var(--text)' : 'var(--muted)',
              background: tab===t.id ? 'var(--card2)' : 'none',
              border:'none', transition:'all .2s', fontFamily:'var(--font)',
            }}>
              {t.label}
              {t.id==='alerts' && alertCount > 0 && (
                <span style={{ marginLeft:5, background:'var(--red)', color:'white',
                  borderRadius:'50%', width:16, height:16,
                  display:'inline-flex', alignItems:'center',
                  justifyContent:'center', fontSize:9, fontWeight:700 }}>
                  {alertCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Status pills */}
        <div style={{ display:'flex', gap:6, alignItems:'center',
          marginLeft:'auto', flexWrap:'wrap' }}>
          {[
            { label:'CAM',     on: false },
            { label:'GESTURE', on: gesture.name!=='none'&&gesture.name!=='No hand detected' },
            { label:'POSE',    on: pose.name!=='normal'&&pose.name!=='unknown' },
            { label:'EMOTION', on: emotion.confidence > 0.3 },
            { label:'SERVER',  on: wsConnected },
          ].map(p => (
            <div key={p.label} style={{ display:'flex', alignItems:'center', gap:5,
              background:'var(--card)', border:'1px solid var(--border)',
              borderRadius:18, padding:'4px 10px',
              fontSize:10, fontWeight:700, color:'var(--muted)' }}>
              <span style={{ width:6, height:6, borderRadius:'50%',
                background: p.on ? 'var(--green)' : 'var(--muted2)',
                boxShadow:  p.on ? '0 0 6px var(--green)' : 'none',
                animation:  p.on ? 'pulse 1.5s infinite' : 'none',
                display:'inline-block' }}/>
              {p.label}
            </div>
          ))}
        </div>
      </header>

      {/* PAGE */}
      <main style={{ flex:1, overflow:'hidden', padding:10 }}>
        <Page/>
      </main>
    </div>
  )
}

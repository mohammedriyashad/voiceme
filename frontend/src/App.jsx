// src/App.jsx — VoiceMe AAC v3 — Warm Light Theme + Groq + 2-Way Conversation
import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useStore }  from './utils/store'
import Dashboard     from './pages/Dashboard'
import Profiles      from './pages/Profiles'
import Alerts        from './pages/Alerts'
import Reports       from './pages/Reports'
import Symbols       from './pages/Symbols'
import { StatusPill } from './components/ui'
import axios from 'axios'

const WS_URL = 'ws://localhost:8000/api/camera/ws'

const TABS = [
  { id:'dashboard', label:'🏠 Home',     emoji:'🏠' },
  { id:'profiles',  label:'👤 Profiles', emoji:'👤' },
  { id:'alerts',    label:'🔔 Alerts',   emoji:'🔔' },
  { id:'reports',   label:'📄 Reports',  emoji:'📄' },
  { id:'symbols',   label:'🖼️ Symbols',  emoji:'🖼️' },
]
const PAGES = { dashboard:Dashboard, profiles:Profiles,
                alerts:Alerts, reports:Reports, symbols:Symbols }

export default function App() {
  const [tab, setTab] = useState('dashboard')
  const wsRef         = useRef(null)
  const timerRef      = useRef(null)

  const {
    setEmotion, setGesture, setPose, setWsConnected,
    addAlert, incStat, setLatency,
    wsConnected, emotion, gesture, pose, alertCount,
    activeProfile,
  } = useStore()

  // ── Stable send function ──────────────────────────────────
  const send = useCallback((payload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN)
      wsRef.current.send(JSON.stringify(payload))
  }, [])
  window._aacSend = send

  // ── WebSocket connect ─────────────────────────────────────
  const connect = useCallback(() => {
    try {
      const ws     = new WebSocket(WS_URL)
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
        if (d.emotion) setEmotion(d.emotion)
        if (d.gesture) setGesture(d.gesture)
        if (d.pose)    setPose(d.pose)
        if (d.alert)   { addAlert(d.alert); incStat('alerts') }
        setLatency(Math.round(performance.now() - t0))
      }
    } catch { timerRef.current = setTimeout(connect, 3000) }
  }, [])

  useEffect(() => {
    connect()
    return () => { clearTimeout(timerRef.current); wsRef.current?.close() }
  }, [])

  const Page = PAGES[tab]

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'relative', zIndex: 1,
    }}>

      {/* ── TOP BAR ── */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 16px', height: 56, flexShrink: 0,
        background: 'var(--card)',
        borderBottom: '2px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12,
            background: 'linear-gradient(135deg, var(--primary), var(--primary2))',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 20,
            boxShadow: '0 3px 10px rgba(244,132,95,0.35)',
          }}>🗣️</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text)' }}>
              Voice<span style={{ color: 'var(--primary)' }}>Me</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)',
                marginLeft: 6 }}>AAC</span>
            </div>
            <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '1.5px',
              textTransform: 'uppercase', fontWeight: 700 }}>
              Groq · Llama3 · 2-Way Communication
            </div>
          </div>
        </div>

        {/* Active profile badge */}
        {activeProfile && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: 'rgba(244,132,95,.08)',
            border: '1.5px solid rgba(244,132,95,.25)',
            borderRadius: 20, padding: '5px 13px',
          }}>
            <span style={{ fontSize: 16 }}>🧒</span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)' }}>
                {activeProfile.name}
              </div>
              <div style={{ fontSize: 9, color: 'var(--muted)' }}>Active session</div>
            </div>
          </div>
        )}

        {/* Navigation tabs */}
        <div style={{
          display: 'flex', gap: 2,
          background: 'var(--surface)',
          border: '1.5px solid var(--border)',
          borderRadius: 12, padding: 3,
          marginLeft: activeProfile ? 0 : 'auto',
        }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '6px 14px', borderRadius: 9, cursor: 'pointer',
              fontSize: 11, fontWeight: tab === t.id ? 800 : 500,
              color: tab === t.id ? 'var(--primary)' : 'var(--muted)',
              background: tab === t.id ? 'var(--card)' : 'none',
              border: 'none', transition: 'all .2s',
              fontFamily: 'var(--font)',
              boxShadow: tab === t.id ? 'var(--shadow-sm)' : 'none',
            }}>
              {t.label}
              {t.id === 'alerts' && alertCount > 0 && (
                <span style={{
                  marginLeft: 5, background: 'var(--red)',
                  color: 'white', borderRadius: '50%',
                  width: 16, height: 16,
                  display: 'inline-flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 9, fontWeight: 900,
                }}>{alertCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Status pills */}
        <div style={{
          display: 'flex', gap: 6, alignItems: 'center',
          marginLeft: 'auto', flexWrap: 'wrap',
        }}>
          <StatusPill label="CAM"     active={false}/>
          <StatusPill label="GESTURE" active={gesture.name !== 'none' && gesture.name !== 'No hand detected'}/>
          <StatusPill label="EMOTION" active={emotion.confidence > 0.3}/>
          <StatusPill label="GROQ"    active={wsConnected}/>
        </div>
      </header>

      {/* ── PAGE CONTENT ── */}
      <main style={{ flex: 1, overflow: 'hidden', padding: 10 }}>
        <Page/>
      </main>
    </div>
  )
}
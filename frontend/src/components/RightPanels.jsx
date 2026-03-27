import React from 'react'
import { useStore }  from '../utils/store'
import { useSpeech } from '../hooks/useSpeech'
import { Card, CardHeader, CardBody, FusionRow, StatCard } from './ui'

// ── Mic ──────────────────────────────────────────────────────
export function MicPanel() {
  const { speechText } = useStore()
  const { listening, interim, toggle } = useSpeech()
  return (
    <Card style={{ flexShrink:0 }}>
      <CardHeader icon="🎤" title="Audio Input"/>
      <CardBody style={{ textAlign:'center', padding:10 }}>
        <div onClick={toggle} style={{
          width:52, height:52, borderRadius:'50%',
          border:`2px solid ${listening ? 'var(--red)' : 'var(--border2)'}`,
          cursor:'pointer', display:'flex', alignItems:'center',
          justifyContent:'center', fontSize:22,
          background: listening ? 'rgba(255,90,90,.1)' : 'var(--surface)',
          transition:'all .3s', margin:'0 auto 7px',
          animation: listening ? 'micPulse 1s infinite' : 'none',
        }}>🎤</div>
        <div style={{ fontSize:10, color:'var(--muted)', marginBottom:7 }}>
          {listening ? '🔴 Listening…' : 'Click to listen'}
        </div>
        <div style={{
          background:'var(--surface)', border:'1px solid var(--border)',
          borderRadius:7, padding:'7px 9px', fontSize:11, color:'var(--muted)',
          minHeight:32, textAlign:'left', lineHeight:1.5, fontStyle:'italic',
        }}>
          {speechText
            ? <><span style={{ color:'var(--text)', fontStyle:'normal' }}>{speechText}</span>
                {interim && <span style={{ color:'var(--muted)' }}> {interim}</span>}</>
            : interim || 'Transcript appears here…'
          }
        </div>
      </CardBody>
    </Card>
  )
}

// ── Fusion ───────────────────────────────────────────────────
export function FusionPanel() {
  const { emotion, gesture, pose, symbols, speechText } = useStore()
  const symStr  = symbols.map(s=>s.label).join(', ') || null
  const gesHas  = gesture.name !== 'none' && gesture.name !== 'No hand detected'
  const poseHas = pose.name !== 'normal' && pose.name !== 'unknown'
  const emoHas  = emotion.confidence > 0.3

  const intent = [
    emoHas  ? `${emotion.emoji} ${emotion.display_label}` : null,
    gesHas  ? `${gesture.icon} ${gesture.meaning}`        : null,
    poseHas ? `${pose.icon} ${pose.meaning}`              : null,
    symStr  ? symStr                                       : null,
    speechText ? `"${speechText}"`                        : null,
  ].filter(Boolean).join(' | ')

  return (
    <Card style={{ flexShrink:0 }}>
      <CardHeader icon="⚡" title="Intent Fusion"/>
      <CardBody style={{ padding:9 }}>
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)',
          borderRadius:10, padding:9 }}>
          <FusionRow label="Emotion" active={emoHas}
            value={emoHas ? `${emotion.emoji} ${emotion.display_label} (${emotion.confidence_pct}%)` : null}/>
          <FusionRow label="Gesture" active={gesHas}
            value={gesHas ? `${gesture.icon} ${gesture.meaning}` : null}/>
          <FusionRow label="Pose"    active={poseHas}
            value={poseHas ? `${pose.icon} ${pose.meaning}` : null}/>
          <FusionRow label="Symbols" active={!!symStr} value={symStr}/>
          <FusionRow label="Speech"  active={!!speechText} value={speechText}/>
          <div style={{ display:'flex', alignItems:'flex-start', gap:7, padding:'4px 0', fontSize:11 }}>
            <div style={{ color:'var(--cyan)', width:64, fontSize:9, flexShrink:0,
              paddingTop:2, letterSpacing:'.5px', textTransform:'uppercase', fontWeight:700 }}>→ Intent</div>
            <div style={{ color:'var(--cyan)', fontWeight:600, flex:1,
              wordBreak:'break-word', fontSize:10 }}>
              {intent || 'Awaiting signals…'}
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

// ── Stats ────────────────────────────────────────────────────
export function StatsPanel() {
  const { stats } = useStore()
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7, flexShrink:0 }}>
      <StatCard value={stats.symbols}       label="Symbols"  color="var(--cyan)"/>
      <StatCard value={stats.messages}      label="Messages" color="var(--violet)"/>
      <StatCard value={`${stats.latency}ms`} label="Latency" color="var(--green)"/>
      <StatCard value={stats.alerts}        label="Alerts"   color="var(--amber)"/>
    </div>
  )
}

// ── History ──────────────────────────────────────────────────
export function HistoryPanel() {
  const { history } = useStore()
  const speak = (txt) => {
    if (window.speechSynthesis.speaking) window.speechSynthesis.cancel()
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(txt))
  }
  return (
    <Card style={{ flex:1, minHeight:0 }}>
      <CardHeader icon="📋" title="Session History"/>
      <CardBody style={{ padding:7, overflowY:'auto' }}>
        {history.length === 0
          ? <div style={{ textAlign:'center', padding:18, color:'var(--muted)', fontSize:11 }}>
              No messages yet
            </div>
          : history.map((h,i) => (
            <div key={i} onClick={() => speak(h.sentence)} style={{
              background:'var(--surface)', border:'1px solid var(--border)',
              borderRadius:8, padding:'7px 10px', cursor:'pointer',
              transition:'all .2s', marginBottom:5,
            }}
            onMouseEnter={e=>e.currentTarget.style.borderColor='var(--violet)'}
            onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
              <div style={{ fontSize:9, color:'var(--muted)', fontFamily:'var(--mono)' }}>
                {h.time} · {h.emoji} {h.gesture}
              </div>
              <div style={{ fontSize:11, fontWeight:600, marginTop:2, lineHeight:1.4 }}>
                {h.sentence}
              </div>
              {h.symbols?.length > 0 && (
                <div style={{ display:'flex', gap:3, marginTop:3 }}>
                  {h.symbols.map((s,j) => (
                    <span key={j} style={{ fontSize:8, padding:'1px 5px', borderRadius:7,
                      background:'rgba(108,99,255,.15)', color:'#C4B5FD' }}>{s}</span>
                  ))}
                </div>
              )}
            </div>
          ))
        }
      </CardBody>
    </Card>
  )
}

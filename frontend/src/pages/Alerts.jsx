// src/pages/Alerts.jsx — Fixed alert display with mark all read
import React, { useState, useEffect } from 'react'
import { getAlerts, markAlertRead } from '../utils/api'
import { useStore } from '../utils/store'
import { Btn, Toast } from '../components/ui'
import axios from 'axios'

export default function Alerts() {
  const [alerts,  setAlerts]  = useState([])
  const [stats,   setStats]   = useState({ total:0, unread:0, distress:0 })
  const [toast,   setToast]   = useState(null)
  const [filter,  setFilter]  = useState('all')  // all | unread | distress
  const { removeAlert, clearAlerts } = useStore()

  const load = async () => {
    const r = await getAlerts().catch(() => ({ data: [] }))
    setAlerts(r.data || [])
    // Get stats
    const s = await axios.get('/api/alerts/stats').catch(() => ({ data: {} }))
    setStats(s.data || {})
  }
  useEffect(() => { load() }, [])

  const handleRead = async (id) => {
    await markAlertRead(id)
    removeAlert(id)
    load()
  }

  const handleMarkAllRead = async () => {
    await axios.patch('/api/alerts/read-all').catch(() => {})
    clearAlerts()
    setToast({ msg: '✅ All alerts marked as read' })
    load()
  }

  const handleClearPending = async () => {
    await axios.delete('/api/alerts/clear-pending').catch(() => {})
    clearAlerts()
    setToast({ msg: 'Notification badge cleared' })
  }

  // Filter alerts
  const filtered = alerts.filter(a => {
    if (filter === 'unread')   return !a.is_read
    if (filter === 'distress') return a.type === 'distress'
    return true
  })

  const ALERT_STYLES = {
    distress: {
      bg:     'rgba(224,82,82,.07)',
      border: 'rgba(224,82,82,.35)',
      dot:    '#E05252',
      badge:  { bg:'rgba(224,82,82,.12)', color:'#E05252' },
    },
    warning: {
      bg:     'rgba(245,166,35,.07)',
      border: 'rgba(245,166,35,.35)',
      dot:    '#F5A623',
      badge:  { bg:'rgba(245,166,35,.12)', color:'#B8860B' },
    },
    info: {
      bg:     'rgba(91,164,207,.07)',
      border: 'rgba(91,164,207,.3)',
      dot:    '#5BA4CF',
      badge:  { bg:'rgba(91,164,207,.12)', color:'#3A7FA8' },
    },
  }

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', gap:12 }}>
      {toast && <Toast message={toast.msg} type={toast.type||'success'} onClose={()=>setToast(null)}/>}

      {/* Header */}
      <div style={{
        display:'flex', alignItems:'center',
        justifyContent:'space-between', flexShrink:0, flexWrap:'wrap', gap:8,
      }}>
        <div>
          <div style={{ fontSize:18, fontWeight:900 }}>🔔 Caregiver Alerts</div>
          <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>
            Only real distress signals are shown — no false positives
          </div>
        </div>
        <div style={{ display:'flex', gap:7 }}>
          <Btn variant="ghost" onClick={load}>↻ Refresh</Btn>
          <Btn variant="amber" onClick={handleMarkAllRead}>✓ Mark All Read</Btn>
          <Btn variant="ghost" onClick={handleClearPending}>🔕 Clear Badge</Btn>
        </div>
      </div>

      {/* Stats row */}
      <div style={{
        display:'grid', gridTemplateColumns:'repeat(3,1fr)',
        gap:10, flexShrink:0,
      }}>
        {[
          { label:'Total Alerts',    value: stats.total    || 0, color:'var(--text2)',   icon:'🔔' },
          { label:'Unread',          value: stats.unread   || 0, color:'var(--primary)', icon:'📬' },
          { label:'Distress Events', value: stats.distress || 0, color:'var(--red)',     icon:'🚨' },
        ].map((s,i) => (
          <div key={i} style={{
            background:'var(--card)', border:'1.5px solid var(--border)',
            borderRadius:12, padding:'12px 16px',
            display:'flex', alignItems:'center', gap:10,
            boxShadow:'var(--shadow-sm)',
          }}>
            <span style={{ fontSize:24 }}>{s.icon}</span>
            <div>
              <div style={{ fontSize:22, fontWeight:900, color:s.color }}>{s.value}</div>
              <div style={{ fontSize:9, color:'var(--muted)', textTransform:'uppercase',
                letterSpacing:'.5px', fontWeight:700 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{
        display:'flex', gap:6, flexShrink:0,
        background:'var(--surface)', borderRadius:10,
        border:'1.5px solid var(--border)', padding:4,
        alignSelf:'flex-start',
      }}>
        {[
          { id:'all',      label:'All' },
          { id:'unread',   label:'Unread' },
          { id:'distress', label:'🚨 Distress Only' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding:'5px 14px', borderRadius:7, cursor:'pointer',
            fontSize:11, fontWeight: filter===f.id ? 800 : 500,
            color:      filter===f.id ? 'var(--primary)' : 'var(--muted)',
            background: filter===f.id ? 'var(--card)' : 'none',
            border:'none', fontFamily:'var(--font)',
            boxShadow: filter===f.id ? 'var(--shadow-sm)' : 'none',
            transition:'all .2s',
          }}>{f.label}</button>
        ))}
      </div>

      {/* Alert list */}
      <div style={{ overflowY:'auto', flex:1 }}>
        {filtered.length === 0 ? (
          <div style={{
            textAlign:'center', padding:40,
            background:'var(--card)', borderRadius:16,
            border:'2px dashed var(--border)',
            color:'var(--muted)',
          }}>
            <div style={{ fontSize:48, marginBottom:10 }}>✅</div>
            <div style={{ fontSize:14, fontWeight:700, color:'var(--text2)' }}>
              {filter === 'distress'
                ? 'No distress events recorded'
                : 'No alerts in this category'}
            </div>
            <div style={{ fontSize:11, marginTop:6 }}>
              The system only triggers alerts for real sustained distress
            </div>
          </div>
        ) : (
          filtered.map(a => {
            const st = ALERT_STYLES[a.type] || ALERT_STYLES.info
            return (
              <div key={a.id} style={{
                background: a.is_read ? 'var(--card)' : st.bg,
                border: `1.5px solid ${a.is_read ? 'var(--border)' : st.border}`,
                borderRadius:12, padding:'12px 16px', marginBottom:8,
                display:'flex', alignItems:'flex-start', gap:12,
                opacity: a.is_read ? 0.65 : 1,
                transition:'all .2s',
              }}>
                {/* Status dot */}
                <div style={{
                  width:10, height:10, borderRadius:'50%',
                  background: a.is_read ? 'var(--muted2)' : st.dot,
                  flexShrink:0, marginTop:5,
                  boxShadow: a.is_read ? 'none' : `0 0 8px ${st.dot}`,
                }}/>

                {/* Content */}
                <div style={{ flex:1 }}>
                  <div style={{
                    display:'flex', alignItems:'center',
                    gap:8, marginBottom:5, flexWrap:'wrap',
                  }}>
                    {/* Type badge */}
                    <span style={{
                      fontSize:10, fontWeight:800, padding:'2px 9px',
                      borderRadius:10, letterSpacing:'.5px',
                      background: st.badge.bg, color: st.badge.color,
                    }}>
                      {a.emoji} {a.label?.toUpperCase() || a.type?.toUpperCase()}
                    </span>
                    <span style={{ fontSize:10, color:'var(--muted)' }}>
                      {new Date(a.timestamp).toLocaleString()}
                    </span>
                    {a.is_read && (
                      <span style={{
                        fontSize:9, color:'var(--muted)',
                        background:'var(--surface)',
                        border:'1px solid var(--border)',
                        borderRadius:8, padding:'1px 7px',
                      }}>READ</span>
                    )}
                  </div>

                  {/* Message */}
                  <div style={{
                    fontSize:13, fontWeight:700,
                    color:'var(--text)', marginBottom:5,
                  }}>{a.message}</div>

                  {/* Signal details */}
                  <div style={{
                    display:'flex', gap:8, flexWrap:'wrap',
                    fontSize:10, color:'var(--muted2)',
                  }}>
                    {a.emotion && (
                      <span>😊 Emotion: <b style={{ color:'var(--text2)' }}>{a.emotion}</b></span>
                    )}
                    {a.gesture && (
                      <span>🤲 Gesture: <b style={{ color:'var(--text2)' }}>{a.gesture}</b></span>
                    )}
                  </div>
                </div>

                {/* Mark read button */}
                {!a.is_read && (
                  <Btn size="sm" variant="ghost" onClick={() => handleRead(a.id)}>
                    ✓ Read
                  </Btn>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Alert explanation */}
      <div style={{
        flexShrink:0, padding:'10px 14px',
        background:'rgba(91,164,207,.06)',
        border:'1.5px solid rgba(91,164,207,.2)',
        borderRadius:10, fontSize:10, color:'var(--muted)',
        lineHeight:1.7,
      }}>
        ℹ️ <b>When do alerts trigger?</b> Only when the child shows sustained distress
        (angry/fearful emotion &gt;60% confidence + fist gesture or rocking pose)
        for 5+ consecutive detections, with a minimum 60-second gap between alerts.
      </div>
    </div>
  )
}
import React, { useState, useEffect } from 'react'
import { getAlerts, markAlertRead } from '../utils/api'
import { useStore } from '../utils/store'
import { Btn, Toast } from '../components/ui'

const TYPE_STYLE = {
  distress: { border:'var(--red)',   label:'🚨 DISTRESS', color:'var(--red)'   },
  warning:  { border:'var(--amber)', label:'⚠️ WARNING',  color:'var(--amber)' },
  info:     { border:'var(--cyan)',  label:'ℹ️ INFO',     color:'var(--cyan)'  },
}

export default function Alerts() {
  const [alerts, setAlerts] = useState([])
  const [toast,  setToast]  = useState(null)
  const { removeAlert } = useStore()

  const load = () => getAlerts().then(r => setAlerts(r.data||[])).catch(()=>{})
  useEffect(() => { load() }, [])

  const handleRead = async (id) => {
    await markAlertRead(id)
    removeAlert(id)
    setToast({ msg:'Marked as read' })
    load()
  }

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', gap:12 }}>
      {toast && <Toast message={toast.msg} onClose={()=>setToast(null)}/>}

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:800 }}>🔔 Caregiver Alerts</div>
          <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>
            Auto-triggered when distress signals are detected
          </div>
        </div>
        <Btn variant="ghost" onClick={load}>↻ Refresh</Btn>
      </div>

      {/* Alert list */}
      <div style={{ overflowY:'auto', flex:1 }}>
        {alerts.length === 0
          ? <div style={{ color:'var(--muted)', padding:24, textAlign:'center',
              background:'var(--card)', borderRadius:12, border:'1px solid var(--border)' }}>
              ✅ No alerts. System is monitoring for distress signals.
            </div>
          : alerts.map(a => {
            const ts = TYPE_STYLE[a.type] || TYPE_STYLE.info
            return (
              <div key={a.id} style={{
                background:'var(--surface)', borderRadius:9,
                borderLeft:`3px solid ${ts.border}`,
                padding:'10px 14px', marginBottom:8,
                display:'flex', alignItems:'flex-start', gap:10,
                opacity: a.is_read ? 0.6 : 1,
              }}>
                <div style={{ width:8, height:8, borderRadius:'50%',
                  background:ts.border, flexShrink:0, marginTop:5 }}/>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                    <span style={{ fontSize:10, fontWeight:700, color:ts.color,
                      letterSpacing:'.5px' }}>{ts.label}</span>
                    <span style={{ fontSize:10, color:'var(--muted)' }}>
                      {new Date(a.timestamp).toLocaleString()}
                    </span>
                    {a.is_read && (
                      <span style={{ fontSize:9, color:'var(--muted)',
                        background:'var(--card)', borderRadius:8, padding:'1px 6px' }}>
                        READ
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize:13, fontWeight:600 }}>{a.message}</div>
                  <div style={{ fontSize:10, color:'var(--muted)', marginTop:3 }}>
                    Emotion: <b>{a.emotion||'—'}</b> · Gesture: <b>{a.gesture||'—'}</b>
                  </div>
                </div>
                {!a.is_read && (
                  <Btn size="sm" variant="ghost" onClick={()=>handleRead(a.id)}>✓ Read</Btn>
                )}
              </div>
            )
          })
        }
      </div>
    </div>
  )
}

import React, { useState, useEffect } from 'react'
import { listReports, generateReport } from '../utils/api'
import { useStore } from '../utils/store'
import { Btn, Toast } from '../components/ui'

export default function Reports() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [toast,   setToast]   = useState(null)
  const { activeSessionId } = useStore()

  const load = () => listReports().then(r => setReports(r.data?.reports||[])).catch(()=>{})
  useEffect(() => { load() }, [])

  const generate = async () => {
    if (!activeSessionId) {
      setToast({ msg:'Activate a profile and session first!', type:'error' }); return
    }
    setLoading(true)
    await generateReport(activeSessionId).catch(()=>{})
    setLoading(false)
    setToast({ msg:'PDF report generated!' })
    load()
  }

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', gap:12 }}>
      {toast && <Toast message={toast.msg} type={toast.type||'success'} onClose={()=>setToast(null)}/>}

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:800 }}>📄 Session Reports</div>
          <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>
            Generate and download PDF reports for each session
          </div>
        </div>
        <Btn variant="primary" onClick={generate} disabled={loading}>
          {loading ? '⏳ Generating…' : '📄 Generate PDF'}
        </Btn>
      </div>

      {/* Reports list */}
      <div style={{ overflowY:'auto', flex:1 }}>
        {reports.length === 0
          ? <div style={{ color:'var(--muted)', padding:24, textAlign:'center',
              background:'var(--card)', borderRadius:12, border:'1px solid var(--border)' }}>
              No reports yet. Run a session and click Generate PDF.
            </div>
          : reports.map((r,i) => (
            <div key={i} style={{
              display:'flex', alignItems:'center', gap:12,
              background:'var(--surface)', border:'1px solid var(--border)',
              borderRadius:10, padding:'12px 14px', marginBottom:7,
            }}>
              <span style={{ fontSize:28 }}>📄</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:700 }}>{r.filename}</div>
                <div style={{ fontSize:10, color:'var(--muted)', marginTop:2 }}>
                  {r.created} · {r.size_kb} KB
                </div>
              </div>
              <a href={`/api/reports/download/${r.filename}`} download style={{ textDecoration:'none' }}>
                <Btn variant="primary" size="sm">⬇ Download</Btn>
              </a>
            </div>
          ))
        }
      </div>
    </div>
  )
}
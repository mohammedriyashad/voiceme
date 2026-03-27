import React, { useState, useEffect } from 'react'
import { searchSymbols, getCustomSymbols, uploadCustomSymbol } from '../utils/api'
import { useStore } from '../utils/store'
import { Btn, Toast, Skeleton } from '../components/ui'

export default function Symbols() {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [custom,  setCustom]  = useState([])
  const [label,   setLabel]   = useState('')
  const [file,    setFile]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [toast,   setToast]   = useState(null)
  const { addSymbol, activeProfile } = useStore()

  useEffect(() => {
    getCustomSymbols().then(r => setCustom(r.data?.symbols||[])).catch(()=>{})
  }, [])

  const search = async () => {
    if (!query.trim()) return
    setLoading(true)
    const r = await searchSymbols(query, 12).catch(()=>({data:{results:[]}}))
    setResults(r.data?.results||[])
    setLoading(false)
  }

  const upload = async () => {
    if (!label.trim()||!file) { setToast({msg:'Label and file required!',type:'error'}); return }
    const fd = new FormData()
    fd.append('label', label); fd.append('file', file)
    if (activeProfile) fd.append('child_id', activeProfile.id)
    const r = await uploadCustomSymbol(fd).catch(()=>null)
    if (r?.data?.url) {
      setToast({msg:`✓ Uploaded: ${label}`})
      setLabel(''); setFile(null)
      getCustomSymbols().then(r=>setCustom(r.data?.symbols||[])).catch(()=>{})
    }
  }

  const sym = { background:'var(--surface)', border:'1px solid var(--border)',
    borderRadius:9, padding:'6px 4px', textAlign:'center', cursor:'pointer',
    transition:'all .2s', display:'flex', flexDirection:'column', alignItems:'center', gap:3 }

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', gap:12 }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
      <div style={{ fontSize:18, fontWeight:800, flexShrink:0 }}>🖼️ Symbol Manager</div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, flex:1, minHeight:0 }}>

        {/* Search panel */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)',
          borderRadius:14, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ padding:'9px 13px', borderBottom:'1px solid var(--border)',
            fontSize:9, fontWeight:700, letterSpacing:'2px',
            textTransform:'uppercase', color:'var(--muted)' }}>
            🔍 ARASAAC Search
          </div>
          <div style={{ flex:1, padding:12, display:'flex', flexDirection:'column', gap:9 }}>
            <div style={{ display:'flex', gap:7 }}>
              <input value={query} onChange={e=>setQuery(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&search()}
                placeholder="Search symbol (e.g. hospital, angry)…"
                style={{ flex:1, background:'var(--surface)', border:'1px solid var(--border2)',
                  borderRadius:'var(--radius-sm)', padding:'8px 12px', color:'var(--text)',
                  fontFamily:'var(--font)', fontSize:12, outline:'none' }}/>
              <Btn variant="primary" onClick={search}>Search</Btn>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(80px,1fr))',
              gap:7, overflowY:'auto', flex:1 }}>
              {loading ? Array(8).fill(0).map((_,i)=><Skeleton key={i} h={90} r={9}/>)
               : results.length===0
                ? <div style={{ gridColumn:'1/-1', color:'var(--muted)', fontSize:11, padding:10 }}>
                    Enter keyword to search ARASAAC database…
                  </div>
                : results.map((p,i) => (
                  <div key={i} style={sym}
                    onClick={()=>{ addSymbol(p); setToast({msg:`Added: ${p.label}`}) }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--violet)';e.currentTarget.style.transform='translateY(-2px)'}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.transform='none'}}>
                    {p.url&&<img src={p.url} alt={p.label} style={{width:44,height:44,objectFit:'contain'}}/>}
                    <span style={{fontSize:9,fontWeight:600,color:'var(--muted)'}}>{p.label}</span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>

        {/* Upload panel */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)',
          borderRadius:14, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ padding:'9px 13px', borderBottom:'1px solid var(--border)',
            fontSize:9, fontWeight:700, letterSpacing:'2px',
            textTransform:'uppercase', color:'var(--muted)' }}>
            ⬆ Upload Custom Symbol
          </div>
          <div style={{ flex:1, padding:12, display:'flex', flexDirection:'column', gap:10, overflowY:'auto' }}>
            <input value={label} onChange={e=>setLabel(e.target.value)}
              placeholder="Symbol label e.g. My Toy"
              style={{ background:'var(--surface)', border:'1px solid var(--border2)',
                borderRadius:'var(--radius-sm)', padding:'8px 12px', color:'var(--text)',
                fontFamily:'var(--font)', fontSize:12, outline:'none', width:'100%' }}/>
            <input type="file" accept="image/*" onChange={e=>setFile(e.target.files[0])}
              style={{ background:'var(--surface)', border:'1px solid var(--border2)',
                borderRadius:'var(--radius-sm)', padding:6, color:'var(--text)',
                fontFamily:'var(--font)', fontSize:12, width:'100%' }}/>
            <Btn variant="primary" onClick={upload} style={{ justifyContent:'center' }}>
              ⬆ Upload Symbol
            </Btn>
            <div style={{ fontSize:10, color:'var(--muted)' }}>
              Custom symbols are saved to the database and appear in your symbol board.
            </div>
            {/* Custom symbol list */}
            {custom.map((s,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8,
                padding:'6px 0', borderBottom:'1px solid var(--border)' }}>
                {s.url&&<img src={s.url} style={{width:28,height:28,objectFit:'contain',borderRadius:4}}/>}
                <span style={{fontSize:11,fontWeight:600,flex:1}}>{s.label}</span>
                <Btn size="sm" variant="ghost"
                  onClick={()=>addSymbol({id:String(s.id),label:s.label,url:s.url})}>＋ Add</Btn>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

import React, { useState, useEffect } from 'react'
import { useStore } from '../utils/store'
import { addSymbol as apiAdd, removeSymbol as apiRemove, clearSymbols as apiClear } from '../utils/api'
import { Card, CardHeader, CardBody, Btn, Skeleton } from './ui'

const CATS = [
  { l:'Needs',      i:'🙏', w:['eat','drink','toilet','sleep','pain','help'] },
  { l:'Feelings',   i:'💭', w:['happy','sad','angry','scared','tired','sick'] },
  { l:'Activities', i:'🎯', w:['play','music','read','outside','stop','go'] },
  { l:'People',     i:'👥', w:['mom','dad','doctor','teacher','friend','family'] },
  { l:'Places',     i:'📍', w:['home','school','hospital','park','car','bedroom'] },
  { l:'Objects',    i:'📦', w:['food','water','toy','medicine','book','phone'] },
]

const cache = {}

async function fetchPics(words) {
  const out = []
  for (const w of words) {
    if (cache[w]) { out.push(cache[w]); continue }
    try {
      const r = await fetch(`/api/symbols/search/${encodeURIComponent(w)}?limit=1`)
      const d = await r.json()
      const p = d.results?.[0] || { id:w, label:w, url:null }
      cache[w] = p; out.push(p)
    } catch { out.push({ id:w, label:w, url:null }) }
  }
  return out
}

export default function SymbolBoard() {
  const [activeCat, setActiveCat] = useState(0)
  const [pics, setPics]           = useState([])
  const [loading, setLoading]     = useState(true)
  const { symbols, addSymbol, removeSymbol, clearSymbols, incStat } = useStore()

  useEffect(() => {
    setLoading(true)
    fetchPics(CATS[activeCat].w).then(p => { setPics(p); setLoading(false) })
  }, [activeCat])

  const handleAdd = async (sym) => {
    addSymbol(sym); incStat('symbols')
    await apiAdd(sym).catch(() => {})
  }
  const handleRemove = async (i) => {
    removeSymbol(i)
    await apiRemove(i).catch(() => {})
  }
  const handleClear = async () => {
    clearSymbols()
    await apiClear().catch(() => {})
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10, flex:1, minHeight:0 }}>

      {/* Message strip */}
      <Card style={{ flexShrink:0 }}>
        <CardHeader icon="🖼️" title="Symbol Message Strip"
          right={<Btn size="sm" variant="ghost" onClick={handleClear}>🗑 Clear</Btn>}/>
        <CardBody style={{ padding:9 }}>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, alignItems:'center', minHeight:50 }}>
            {symbols.length === 0
              ? <span style={{ color:'var(--muted)', fontSize:11, fontStyle:'italic' }}>
                  Tap symbols below to build your message…
                </span>
              : symbols.map((s,i) => (
                <div key={i} onClick={() => handleRemove(i)} title="Click to remove" style={{
                  display:'inline-flex', alignItems:'center', gap:4,
                  background:'rgba(108,99,255,.15)', border:'1px solid rgba(108,99,255,.35)',
                  borderRadius:6, padding:'3px 8px', fontSize:10, fontWeight:600,
                  color:'#C4B5FD', cursor:'pointer', animation:'chipIn .2s ease',
                }}>
                  {s.url && <img src={s.url} alt={s.label}
                    style={{ width:20, height:20, objectFit:'contain' }}/>}
                  <span>{s.label}</span>
                  <span style={{ fontSize:8, opacity:.5 }}>✕</span>
                </div>
              ))
            }
          </div>
        </CardBody>
      </Card>

      {/* Symbol grid */}
      <Card style={{ flex:1, minHeight:0 }}>
        <CardHeader icon="🎨" title="ARASAAC Symbol Board"/>
        <CardBody style={{ display:'flex', flexDirection:'column', gap:8, padding:9 }}>
          {/* Category tabs */}
          <div style={{ display:'flex', gap:5, flexWrap:'wrap', flexShrink:0 }}>
            {CATS.map((c,i) => (
              <button key={i} onClick={() => setActiveCat(i)} style={{
                background: activeCat===i ? 'rgba(0,200,240,.1)' : 'var(--card)',
                border:`1px solid ${activeCat===i ? 'var(--cyan)' : 'var(--border)'}`,
                borderRadius:16, padding:'4px 10px', fontSize:10, fontWeight:600,
                cursor:'pointer', color: activeCat===i ? 'var(--cyan)' : 'var(--muted)',
                transition:'all .2s', fontFamily:'var(--font)',
              }}>{c.i} {c.l}</button>
            ))}
          </div>
          {/* Symbols */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(80px,1fr))',
            gap:7, overflowY:'auto', flex:1 }}>
            {loading
              ? Array(6).fill(0).map((_,i) => <Skeleton key={i} h={90} r={9}/>)
              : pics.map((p,i) => (
                <div key={i} onClick={() => handleAdd(p)} style={{
                  background:'var(--surface)', border:'1px solid var(--border)',
                  borderRadius:9, padding:'6px 4px', textAlign:'center',
                  cursor:'pointer', transition:'all .2s',
                  display:'flex', flexDirection:'column', alignItems:'center', gap:3,
                }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--violet)';e.currentTarget.style.transform='translateY(-2px)'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.transform='none'}}
                >
                  {p.url
                    ? <img src={p.url} alt={p.label}
                        style={{ width:44, height:44, objectFit:'contain' }}
                        onError={e=>e.target.style.display='none'}/>
                    : <span style={{ fontSize:28 }}>🖼️</span>
                  }
                  <span style={{ fontSize:9, fontWeight:600, color:'var(--muted)' }}>{p.label}</span>
                </div>
              ))
            }
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

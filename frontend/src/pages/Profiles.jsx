import React, { useState, useEffect } from 'react'
import { getProfiles, createProfile, activateProfile, deleteProfile } from '../utils/api'
import { useStore } from '../utils/store'
import { Btn, Modal, Input, Toast } from '../components/ui'

export default function Profiles() {
  const [profiles,  setProfiles]  = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form,      setForm]      = useState({ name:'', age:'', notes:'' })
  const [toast,     setToast]     = useState(null)
  const { activeProfile, setActiveProfile, setActiveSessionId } = useStore()

  const load = () => getProfiles().then(r => setProfiles(r.data)).catch(() => {})
  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.name.trim()) { setToast({ msg:'Name is required!', type:'error' }); return }
    await createProfile({ name:form.name, age:parseInt(form.age)||null, notes:form.notes })
    setShowModal(false)
    setForm({ name:'', age:'', notes:'' })
    setToast({ msg:'Profile created!' })
    load()
  }

  const handleActivate = async (p) => {
    const { data } = await activateProfile(p.id)
    setActiveProfile(p)
    setActiveSessionId(data.session_id)
    setToast({ msg:`Activated: ${p.name}` })
    load()
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this profile and all its data?')) return
    await deleteProfile(id)
    load()
    setToast({ msg:'Profile deleted', type:'warning' })
  }

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', gap:12 }}>
      {toast && <Toast message={toast.msg} type={toast.type||'success'} onClose={()=>setToast(null)}/>}

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:800 }}>👤 Child Profiles</div>
          <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>
            Create profiles and activate sessions for each child
          </div>
        </div>
        <Btn variant="primary" onClick={() => setShowModal(true)}>＋ New Profile</Btn>
      </div>

      {/* Profile Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',
        gap:10, overflowY:'auto', flex:1 }}>
        {profiles.length === 0
          ? <div style={{ color:'var(--muted)', padding:24 }}>No profiles yet. Create one!</div>
          : profiles.map(p => (
            <div key={p.id} onClick={() => handleActivate(p)} style={{
              background:'var(--card)',
              border:`1px solid ${activeProfile?.id===p.id ? 'var(--green)' : 'var(--border)'}`,
              borderRadius:12, padding:14,
              display:'flex', alignItems:'center', gap:12,
              cursor:'pointer', transition:'all .2s', position:'relative',
              boxShadow: activeProfile?.id===p.id ? '0 0 16px rgba(0,229,160,.15)' : 'none',
            }}
            onMouseEnter={e=>{ if(activeProfile?.id!==p.id) e.currentTarget.style.borderColor='var(--cyan)' }}
            onMouseLeave={e=>{ if(activeProfile?.id!==p.id) e.currentTarget.style.borderColor='var(--border)' }}
            >
              {activeProfile?.id===p.id && (
                <div style={{
                  position:'absolute', top:8, right:8,
                  background:'var(--green)', color:'#060B14',
                  borderRadius:10, padding:'2px 8px',
                  fontSize:9, fontWeight:700, letterSpacing:'.5px',
                }}>✓ ACTIVE</div>
              )}
              {/* Avatar */}
              <div style={{
                width:48, height:48, borderRadius:'50%',
                background:'linear-gradient(135deg,var(--violet),var(--cyan))',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:22, flexShrink:0, overflow:'hidden',
              }}>
                {p.photo_path
                  ? <img src={p.photo_path} alt={p.name}
                      style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                  : '🧒'}
              </div>
              {/* Info */}
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700 }}>{p.name}</div>
                <div style={{ fontSize:10, color:'var(--muted)', marginTop:2 }}>
                  {p.age ? `Age ${p.age} · ` : ''}{p.session_count||0} sessions
                </div>
                {p.notes && (
                  <div style={{ fontSize:10, color:'var(--muted2)', marginTop:4 }}>
                    {p.notes.slice(0,60)}{p.notes.length>60?'…':''}
                  </div>
                )}
              </div>
              {/* Delete */}
              <Btn size="sm" variant="danger"
                onClick={e=>{e.stopPropagation(); handleDelete(p.id)}}>🗑</Btn>
            </div>
          ))
        }
      </div>

      {/* Create Modal */}
      <Modal show={showModal} onClose={()=>setShowModal(false)} title="➕ Create Child Profile">
        <Input label="Child's Name *" value={form.name}
          onChange={e=>setForm(f=>({...f,name:e.target.value}))}
          placeholder="e.g. Arjun"/>
        <Input label="Age" type="number" value={form.age}
          onChange={e=>setForm(f=>({...f,age:e.target.value}))}
          placeholder="e.g. 8" min="1" max="25"/>
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:10, fontWeight:700, letterSpacing:'.8px',
            textTransform:'uppercase', color:'var(--muted)', display:'block', marginBottom:5 }}>
            Caregiver Notes
          </label>
          <textarea value={form.notes} rows={3}
            onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
            placeholder="Communication preferences or observations…"
            style={{ background:'var(--surface)', border:'1px solid var(--border2)',
              borderRadius:'var(--radius-sm)', padding:'8px 12px', color:'var(--text)',
              fontFamily:'var(--font)', fontSize:12, outline:'none',
              width:'100%', resize:'vertical' }}/>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <Btn variant="primary" onClick={handleCreate} style={{ flex:1, justifyContent:'center' }}>
            Save Profile
          </Btn>
          <Btn variant="ghost" onClick={()=>setShowModal(false)}>Cancel</Btn>
        </div>
      </Modal>
    </div>
  )
}

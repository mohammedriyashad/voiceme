// src/pages/Profiles.jsx — Shows personalised greeting on create/activate
import React, { useState, useEffect } from 'react'
import { getProfiles, createProfile, activateProfile, deleteProfile } from '../utils/api'
import { useStore } from '../utils/store'
import { Btn, Modal, Input, Toast, Card } from '../components/ui'
import axios from 'axios'

export default function Profiles() {
  const [profiles,    setProfiles]    = useState([])
  const [showModal,   setShowModal]   = useState(false)
  const [form,        setForm]        = useState({ name:'', age:'', notes:'' })
  const [toast,       setToast]       = useState(null)
  const [greeting,    setGreeting]    = useState(null)   // ← name greeting
  const [activating,  setActivating]  = useState(null)

  const { activeProfile, setActiveProfile, setActiveSessionId, setSentence } = useStore()

  const load = () => getProfiles().then(r => setProfiles(r.data)).catch(() => {})
  useEffect(() => { load() }, [])

  // ── Speak text helper ──────────────────────────────────────
  const speak = (text) => {
    if (!text) return
    if (window.speechSynthesis.speaking) window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 0.85; u.pitch = 1.1
    const voices = window.speechSynthesis.getVoices()
    const pv = voices.find(v =>
      v.name.includes('Samantha') || v.name.includes('Karen') ||
      v.name.includes('Google UK English Female')
    )
    if (pv) u.voice = pv
    window.speechSynthesis.speak(u)
  }

  // ── Create profile ─────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.name.trim()) {
      setToast({ msg: 'Please enter the child\'s name!', type: 'error' })
      return
    }
    try {
      const { data } = await createProfile({
        name:  form.name.trim(),
        age:   parseInt(form.age) || null,
        notes: form.notes,
      })
      setShowModal(false)
      setForm({ name: '', age: '', notes: '' })

      // Show and speak the welcome message
      const welcomeMsg = data.message || `✅ Profile created for ${form.name}!`
      setGreeting({
        type:    'created',
        name:    form.name,
        message: welcomeMsg,
        id:      data.id,
      })
      speak(welcomeMsg)
      setToast({ msg: welcomeMsg })
      load()

      // Auto-dismiss greeting after 6 seconds
      setTimeout(() => setGreeting(null), 6000)
    } catch (e) {
      setToast({ msg: 'Failed to create profile. Try again.', type: 'error' })
    }
  }

  // ── Activate profile ───────────────────────────────────────
  const handleActivate = async (p) => {
    setActivating(p.id)
    try {
      const { data } = await activateProfile(p.id)

      setActiveProfile(p)
      setActiveSessionId(data.session_id)

      // Show personalised greeting with child's name
      const greetMsg = data.greeting || `Hello ${p.name}! How may I help you today?`
      setGreeting({
        type:    'activated',
        name:    p.name,
        message: greetMsg,
        session: data.session_id,
        age:     data.age,
      })

      // Speak greeting aloud
      speak(greetMsg)

      // Set as current sentence
      setSentence(greetMsg)

      // Call the LLM greet endpoint to add to conversation
      await axios.post('/api/llm/greet').catch(() => {})

      setToast({ msg: `✅ Session started for ${p.name}!` })
      load()

      // Auto-dismiss after 8 seconds
      setTimeout(() => setGreeting(null), 8000)
    } catch (e) {
      setToast({ msg: 'Failed to activate profile.', type: 'error' })
    }
    setActivating(null)
  }

  // ── Delete profile ─────────────────────────────────────────
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete profile for ${name}? This cannot be undone.`)) return
    await deleteProfile(id)
    load()
    setToast({ msg: `Profile for ${name} deleted`, type: 'warning' })
  }

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', gap:12 }}>
      {toast && <Toast message={toast.msg} type={toast.type||'success'} onClose={()=>setToast(null)}/>}

      {/* ── Greeting Banner ── */}
      {greeting && (
        <div style={{
          background: greeting.type === 'activated'
            ? 'linear-gradient(135deg, rgba(244,132,95,.15), rgba(232,168,124,.15))'
            : 'rgba(91,168,126,.1)',
          border: `2px solid ${greeting.type === 'activated' ? 'rgba(244,132,95,.4)' : 'rgba(91,168,126,.4)'}`,
          borderRadius: 16, padding: '18px 22px',
          display: 'flex', alignItems: 'center', gap: 16,
          animation: 'greetIn .4s ease', flexShrink: 0,
          boxShadow: 'var(--shadow-md)',
        }}>
          {/* Big emoji avatar */}
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            background: greeting.type === 'activated'
              ? 'linear-gradient(135deg, var(--primary), var(--primary2))'
              : 'linear-gradient(135deg, var(--accent), #4A90C4)',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 30, flexShrink: 0,
            boxShadow: 'var(--shadow-md)',
          }}>
            {greeting.type === 'activated' ? '🧒' : '✅'}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 13, fontWeight: 900,
              color: greeting.type === 'activated' ? 'var(--primary)' : 'var(--green)',
              marginBottom: 4,
            }}>
              {greeting.type === 'activated'
                ? `👋 Session started for ${greeting.name}!`
                : `✅ Profile created for ${greeting.name}!`
              }
            </div>
            <div style={{
              fontSize: 16, fontWeight: 700, color: 'var(--text)',
              lineHeight: 1.5,
            }}>
              "{greeting.message}"
            </div>
            {greeting.type === 'activated' && (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                🔊 This message is being spoken aloud to the child.
                Go to <b>Home</b> tab to start the conversation.
              </div>
            )}
          </div>

          {/* Dismiss */}
          <button onClick={() => setGreeting(null)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 18, color: 'var(--muted)', padding: '4px 8px',
          }}>✕</button>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>👤 Child Profiles</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
            Create a profile for each child. Activate to start a session.
          </div>
        </div>
        <Btn variant="primary" onClick={() => setShowModal(true)}>
          ＋ New Profile
        </Btn>
      </div>

      {/* ── Profile Grid ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
        gap: 12, overflowY: 'auto', flex: 1,
      }}>
        {profiles.length === 0 ? (
          <div style={{
            gridColumn: '1/-1', textAlign: 'center', padding: 40,
            color: 'var(--muted)', background: 'var(--card)',
            borderRadius: 16, border: '2px dashed var(--border)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>👤</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>No profiles yet</div>
            <div style={{ fontSize: 11, marginTop: 6 }}>
              Create a profile for each child you work with
            </div>
          </div>
        ) : profiles.map(p => (
          <div key={p.id} style={{
            background: 'var(--card)',
            border: `2px solid ${activeProfile?.id === p.id ? 'var(--primary)' : 'var(--border)'}`,
            borderRadius: 16, padding: 16,
            display: 'flex', alignItems: 'center', gap: 14,
            transition: 'all .2s', position: 'relative',
            boxShadow: activeProfile?.id === p.id
              ? '0 4px 20px rgba(244,132,95,.2)' : 'var(--shadow-sm)',
          }}>
            {/* Active badge */}
            {activeProfile?.id === p.id && (
              <div style={{
                position: 'absolute', top: 10, right: 10,
                background: 'var(--primary)', color: 'white',
                borderRadius: 10, padding: '2px 9px',
                fontSize: 9, fontWeight: 900, letterSpacing: '.5px',
              }}>✓ ACTIVE SESSION</div>
            )}

            {/* Avatar */}
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), var(--primary2))',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 26, flexShrink: 0,
              overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
            }}>
              {p.photo_path
                ? <img src={p.photo_path} alt={p.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                : '🧒'
              }
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text)' }}>
                {p.name}
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                {p.age ? `${p.age} years old · ` : ''}{p.session_count || 0} sessions
              </div>
              {p.notes && (
                <div style={{
                  fontSize: 10, color: 'var(--muted2)', marginTop: 5,
                  background: 'var(--surface)', borderRadius: 7,
                  padding: '3px 8px', display: 'inline-block',
                }}>
                  📝 {p.notes.slice(0, 55)}{p.notes.length > 55 ? '…' : ''}
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
              <Btn
                variant="primary" size="sm"
                disabled={activating === p.id}
                onClick={() => handleActivate(p)}
              >
                {activating === p.id ? '⏳' : activeProfile?.id === p.id ? '✓ Active' : '▶ Activate'}
              </Btn>
              <Btn
                variant="danger" size="sm"
                onClick={() => handleDelete(p.id, p.name)}
              >🗑 Delete</Btn>
            </div>
          </div>
        ))}
      </div>

      {/* ── Create Modal ── */}
      <Modal show={showModal} onClose={() => setShowModal(false)} title="➕ Create Child Profile">
        <div style={{
          background: 'rgba(244,132,95,.06)',
          border: '1px solid rgba(244,132,95,.2)',
          borderRadius: 10, padding: '10px 14px', marginBottom: 16,
          fontSize: 11, color: 'var(--text2)', lineHeight: 1.6,
        }}>
          💡 Once created, activate the profile to start a session.
          The system will greet the child by name.
        </div>
        <Input
          label="Child's Name *"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Arjun, Priya, Sam"
          autoFocus
        />
        <Input
          label="Age"
          type="number"
          value={form.age}
          onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
          placeholder="e.g. 8"
          min="1" max="25"
        />
        <div style={{ marginBottom: 16 }}>
          <label style={{
            fontSize: 10, fontWeight: 800, letterSpacing: '.8px',
            textTransform: 'uppercase', color: 'var(--muted)',
            display: 'block', marginBottom: 6,
          }}>Communication Notes (optional)</label>
          <textarea
            value={form.notes}
            rows={3}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="e.g. Prefers visual symbols, responds well to music..."
            style={{
              background: 'var(--surface)', border: '1.5px solid var(--border2)',
              borderRadius: 'var(--radius-sm)', padding: '9px 13px',
              color: 'var(--text)', fontFamily: 'var(--font)',
              fontSize: 12, outline: 'none', width: '100%', resize: 'vertical',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn
            variant="primary"
            onClick={handleCreate}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            ✅ Create Profile
          </Btn>
          <Btn variant="ghost" onClick={() => setShowModal(false)}>Cancel</Btn>
        </div>
      </Modal>
    </div>
  )
}
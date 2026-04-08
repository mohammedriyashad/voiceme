// src/components/ConversationPanel.jsx
// The core 2-way communication panel
// AI greets child → child communicates → AI responds as caregiver

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useStore } from '../utils/store'
import { Btn, TypingIndicator } from './ui'
import axios from 'axios'

// ── Message bubble component ──────────────────────────────────
function MessageBubble({ msg }) {
  const isAI = msg.role === 'assistant'

  return (
    <div style={{
      display: 'flex',
      flexDirection: isAI ? 'row' : 'row-reverse',
      alignItems: 'flex-end',
      gap: 8,
      marginBottom: 14,
      animation: 'fadeIn .3s ease',
    }}>
      {/* Avatar */}
      <div style={{
        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
        background: isAI
          ? 'linear-gradient(135deg, var(--primary), var(--primary2))'
          : 'linear-gradient(135deg, var(--accent), #4A90C4)',
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 18,
        boxShadow: 'var(--shadow-sm)',
      }}>
        {isAI ? '🤖' : '🧒'}
      </div>

      {/* Bubble */}
      <div style={{
        maxWidth: '75%',
        background: isAI ? 'var(--card)' : 'linear-gradient(135deg,var(--accent),#4A90C4)',
        border: isAI ? '1.5px solid var(--border)' : 'none',
        borderRadius: isAI ? '18px 18px 18px 4px' : '18px 18px 4px 18px',
        padding: '11px 15px',
        boxShadow: 'var(--shadow-sm)',
      }}>
        {/* Speaker label */}
        <div style={{
          fontSize: 9, fontWeight: 800, letterSpacing: '1px',
          textTransform: 'uppercase', marginBottom: 4,
          color: isAI ? 'var(--primary)' : 'rgba(255,255,255,0.75)',
        }}>
          {isAI ? '🤖 AI Caregiver' : '🧒 Child'}
        </div>

        {/* Message text */}
        <div style={{
          fontSize: 14, fontWeight: 600, lineHeight: 1.5,
          color: isAI ? 'var(--text)' : 'white',
        }}>
          {msg.content}
        </div>

        {/* Signals used (for child messages) */}
        {!isAI && msg.signals && (
          <div style={{
            display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6,
          }}>
            {msg.signals.map((s, i) => (
              <span key={i} style={{
                fontSize: 9, padding: '2px 7px', borderRadius: 10,
                background: 'rgba(255,255,255,0.25)',
                color: 'white', fontWeight: 700,
              }}>{s}</span>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <div style={{
          fontSize: 9, marginTop: 5,
          color: isAI ? 'var(--muted2)' : 'rgba(255,255,255,0.6)',
          textAlign: isAI ? 'left' : 'right',
        }}>
          {msg.time}
        </div>
      </div>
    </div>
  )
}

// ── Main ConversationPanel ────────────────────────────────────
export default function ConversationPanel() {
  const [messages,   setMessages]   = useState([])
  const [isTyping,   setIsTyping]   = useState(false)
  const [hasGreeted, setHasGreeted] = useState(false)
  const [autoTimer,  setAutoTimer]  = useState(null)
  const bottomRef = useRef(null)

  const {
    emotion, gesture, pose, symbols,
    speechText, activeProfile,
    setSentence, setGenerating, isGenerating,
    addHistory, incStat,
  } = useStore()

  // ── Scroll to bottom on new message ──────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // ── Greet when profile is activated ──────────────────────
  useEffect(() => {
    if (activeProfile && !hasGreeted) {
      setTimeout(() => sendGreeting(), 800)
    }
  }, [activeProfile])

  // ── Auto-respond when child signals detected ──────────────
  useEffect(() => {
    const hasSignal =
      (emotion.confidence_pct > 35 && emotion.label !== 'neutral') ||
      (gesture.name !== 'none' && gesture.name !== 'No hand detected') ||
      symbols.length > 0 ||
      speechText

    if (hasSignal && hasGreeted && !isGenerating) {
      // Debounce 2.5 seconds
      clearTimeout(autoTimer)
      const t = setTimeout(() => sendResponse(), 2500)
      setAutoTimer(t)
    }
    return () => clearTimeout(autoTimer)
  }, [emotion.label, emotion.confidence_pct, gesture.name, symbols.length, speechText])

  // ── Add message to chat ───────────────────────────────────
  const addMessage = (role, content, signals = []) => {
    const msg = {
      role, content, signals,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages(prev => [...prev, msg])
    return msg
  }

  // ── Speak text aloud ──────────────────────────────────────
  const speak = (text) => {
    if (!text) return
    if (window.speechSynthesis.speaking) window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 0.85; u.pitch = 1.1; u.volume = 1
    const voices = window.speechSynthesis.getVoices()
    const pv = voices.find(v =>
      v.name.includes('Samantha') || v.name.includes('Karen') ||
      v.name.includes('Google UK English Female') ||
      v.name.includes('Microsoft Zira')
    )
    if (pv) u.voice = pv
    window.speechSynthesis.speak(u)
  }

  // ── Step 1: Greet the child ───────────────────────────────
  const sendGreeting = async () => {
    setIsTyping(true)
    try {
      const { data } = await axios.post('/api/llm/greet')
      const sentence = data.sentence
      setIsTyping(false)
      addMessage('assistant', sentence)
      setSentence(sentence)
      speak(sentence)
      setHasGreeted(true)
    } catch (e) {
      setIsTyping(false)
      const fallback = `👋 Hello ${activeProfile?.name || 'there'}! Good ${getTimePeriod()}! How may I help you today?`
      addMessage('assistant', fallback)
      speak(fallback)
      setHasGreeted(true)
    }
  }

  // ── Step 2: Child signals → AI response ──────────────────
  const sendResponse = async () => {
    if (isGenerating) return
    setGenerating(true)

    // Build signals list for display
    const signals = []
    if (emotion.confidence_pct > 35 && emotion.label !== 'neutral')
      signals.push(`${emotion.emoji} ${emotion.display_label}`)
    if (gesture.name !== 'none' && gesture.name !== 'No hand detected')
      signals.push(`${gesture.icon} ${gesture.meaning}`)
    if (pose.name !== 'normal' && pose.name !== 'unknown')
      signals.push(`${pose.icon} ${pose.meaning}`)
    symbols.forEach(s => signals.push(`🖼️ ${s.label}`))
    if (speechText) signals.push(`🗣️ "${speechText}"`)

    if (signals.length === 0) { setGenerating(false); return }

    // Show child's signals as a message
    addMessage('user', signals.join(' · '), signals)

    // AI types...
    setIsTyping(true)
    try {
      const { data } = await axios.post('/api/llm/respond')
      const sentence = data.sentence
      setIsTyping(false)
      addMessage('assistant', sentence)
      setSentence(sentence)
      speak(sentence)
      addHistory({
        time:     new Date().toLocaleTimeString(),
        sentence,
        emoji:    emotion.emoji,
        gesture:  gesture.icon,
        symbols:  symbols.map(s => s.label).slice(0, 3),
      })
      incStat('messages')
    } catch (e) {
      setIsTyping(false)
      const fallback = '🤗 I understand you. I am here to help!'
      addMessage('assistant', fallback)
      speak(fallback)
    }
    setGenerating(false)
  }

  // ── Manual send button ────────────────────────────────────
  const handleManualSend = () => {
    clearTimeout(autoTimer)
    sendResponse()
  }

  // ── Reset conversation ────────────────────────────────────
  const resetConversation = async () => {
    await axios.post('/api/llm/reset').catch(() => {})
    setMessages([])
    setHasGreeted(false)
    setTimeout(() => sendGreeting(), 500)
  }

  const getTimePeriod = () => {
    const h = new Date().getHours()
    if (h < 12) return 'morning'
    if (h < 17) return 'afternoon'
    return 'evening'
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', background: 'var(--surface)',
      borderRadius: 'var(--radius)',
      border: '1.5px solid var(--border)',
      boxShadow: 'var(--shadow-md)',
      overflow: 'hidden',
    }}>

      {/* Header */}
      <div style={{
        padding: '12px 16px',
        background: 'linear-gradient(135deg, var(--primary), var(--primary2))',
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(255,255,255,0.25)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 20,
        }}>🤖</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 900, color: 'white' }}>
            AI Caregiver Assistant
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>
            {activeProfile
              ? `Talking with ${activeProfile.name} · ${getTimePeriod()}`
              : 'Activate a profile to start'}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 7 }}>
          <Btn size="sm" variant="ghost"
            style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none' }}
            onClick={resetConversation}>
            🔄 Reset
          </Btn>
          <Btn size="sm" onClick={handleManualSend} disabled={isGenerating}
            style={{ background: 'white', color: 'var(--primary)', border: 'none', fontWeight: 800 }}>
            💬 Respond
          </Btn>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Empty state */}
        {messages.length === 0 && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--muted)', textAlign: 'center', gap: 10,
          }}>
            <div style={{ fontSize: 48 }}>🗣️</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)' }}>
              {activeProfile
                ? `Activating session for ${activeProfile.name}…`
                : 'Select a profile to start communication'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 240 }}>
              The AI caregiver will greet the child and ask how to help.
              The child communicates through emotion, gesture, and symbols.
            </div>
          </div>
        )}

        {/* Messages list */}
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg}/>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), var(--primary2))',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 18,
            }}>🤖</div>
            <div style={{
              background: 'var(--card)',
              border: '1.5px solid var(--border)',
              borderRadius: '18px 18px 18px 4px',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <TypingIndicator/>
            </div>
          </div>
        )}

        <div ref={bottomRef}/>
      </div>

      {/* Signal status bar */}
      <div style={{
        padding: '10px 14px',
        background: 'var(--card)',
        borderTop: '1.5px solid var(--border)',
        display: 'flex', alignItems: 'center',
        gap: 8, flexShrink: 0, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--muted)',
          textTransform: 'uppercase', letterSpacing: '1px' }}>
          Live signals:
        </span>
        {emotion.confidence_pct > 30 && (
          <span style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 10,
            background: 'rgba(244,132,95,.1)',
            border: '1px solid rgba(244,132,95,.3)',
            color: 'var(--primary)', fontWeight: 700,
          }}>
            {emotion.emoji} {emotion.display_label} {emotion.confidence_pct}%
          </span>
        )}
        {gesture.name !== 'none' && gesture.name !== 'No hand detected' && (
          <span style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 10,
            background: 'rgba(91,164,207,.1)',
            border: '1px solid rgba(91,164,207,.3)',
            color: 'var(--accent)', fontWeight: 700,
          }}>
            {gesture.icon} {gesture.meaning}
          </span>
        )}
        {symbols.map((s, i) => (
          <span key={i} style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 10,
            background: 'rgba(91,168,126,.1)',
            border: '1px solid rgba(91,168,126,.3)',
            color: 'var(--green)', fontWeight: 700,
          }}>
            🖼️ {s.label}
          </span>
        ))}
        {!emotion.confidence_pct && gesture.name === 'none' && symbols.length === 0 && (
          <span style={{ fontSize: 10, color: 'var(--muted)', fontStyle: 'italic' }}>
            Waiting for child to communicate…
          </span>
        )}
      </div>
    </div>
  )
}
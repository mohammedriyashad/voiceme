import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useStore } from '../utils/store'
import { generateSentence } from '../utils/api'
import { Btn } from './ui'

export default function AIOutput() {
  const {
    sentence, setSentence, isGenerating, setGenerating,
    symbols, speechText, gesture, emotion,
    addHistory, incStat,
  } = useStore()

  const [speaking,       setSpeaking]       = useState(false)
  const [lockedEmotion,  setLockedEmotion]  = useState(null)  // ← first captured emotion
  const [emotionLocked,  setEmotionLocked]  = useState(false) // ← lock flag
  const timerRef        = useRef(null)
  const hasGeneratedRef = useRef(false)     // prevent duplicate auto-generate

  // ── Step 1: Lock the FIRST emotion detected by camera ──────
  useEffect(() => {
    if (
      !emotionLocked &&
      emotion.confidence_pct > 30 &&          // only if confidence > 30%
      emotion.label !== 'neutral'              // ignore neutral as first signal
    ) {
      setLockedEmotion(emotion)
      setEmotionLocked(true)
      console.log('[AIOutput] Emotion locked:', emotion.display_label, emotion.confidence_pct + '%')
    }
  }, [emotion.label, emotion.confidence_pct])

  // ── Step 2: Auto-generate once when emotion is locked ──────
  useEffect(() => {
    if (emotionLocked && !hasGeneratedRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        hasGeneratedRef.current = true
        generate()
      }, 1500)   // 1.5s after locking emotion → generate
    }
  }, [emotionLocked])

  // ── Step 3: Also trigger when symbols or speech added ──────
  useEffect(() => {
    if (symbols.length > 0 || speechText) {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => generate(), 2000)
    }
  }, [symbols.length, speechText])

  // ── Core generate function ──────────────────────────────────
  const generate = useCallback(async () => {
    if (isGenerating) return

    // Need at least one signal
    const hasSignal =
      emotionLocked ||
      symbols.length > 0 ||
      speechText ||
      (gesture.name !== 'none' && gesture.name !== 'No hand detected')

    if (!hasSignal) return

    setGenerating(true)
    try {
      const { data } = await generateSentence()
      const sent = data.sentence || 'I need help communicating.'
      setSentence(sent)
      speakText(sent)
      addHistory({
        time:     new Date().toLocaleTimeString(),
        sentence: sent,
        emoji:    (lockedEmotion || emotion).emoji,
        gesture:  gesture.icon,
        symbols:  symbols.map(s => s.label).slice(0, 3),
      })
      incStat('messages')
    } catch {
      setSentence('I need help right now.')
    }
    setGenerating(false)
  }, [isGenerating, emotionLocked, symbols, speechText, gesture, emotion, lockedEmotion])

  // ── TTS ──────────────────────────────────────────────────────
  const speakText = (txt) => {
    if (!txt) return
    if (window.speechSynthesis.speaking) window.speechSynthesis.cancel()
    const u    = new SpeechSynthesisUtterance(txt)
    u.rate     = 0.85; u.pitch = 1.05; u.volume = 1
    const voices = window.speechSynthesis.getVoices()
    const pv   = voices.find(v =>
      v.name.includes('Samantha') || v.name.includes('Karen') ||
      v.name.includes('Google UK English Female')
    )
    if (pv) u.voice = pv
    u.onstart = () => setSpeaking(true)
    u.onend   = () => setSpeaking(false)
    window.speechSynthesis.speak(u)
  }

  const toggleSpeak = () => {
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return }
    if (sentence) speakText(sentence)
  }

  // ── Reset emotion lock for next interaction ───────────────
  const resetAndGenerate = () => {
    setLockedEmotion(null)
    setEmotionLocked(false)
    hasGeneratedRef.current = false
    generate()
  }

  // ── Emotion lock status indicator ─────────────────────────
  const showLocked = emotionLocked && lockedEmotion

  return (
    <div style={{
      background:'linear-gradient(135deg,rgba(0,200,240,.05),rgba(108,99,255,.05))',
      border:'1px solid rgba(0,200,240,.25)', borderRadius:12, padding:14, flexShrink:0,
    }}>
      {/* Label row */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
        <div style={{ fontSize:9, fontWeight:700, letterSpacing:'2px',
          textTransform:'uppercase', color:'var(--cyan)' }}>
          🤖 Phi-2 LLM Output
        </div>

        {/* Emotion lock badge */}
        {showLocked && (
          <div style={{
            display:'flex', alignItems:'center', gap:5,
            background:'rgba(0,229,160,.1)', border:'1px solid rgba(0,229,160,.3)',
            borderRadius:20, padding:'2px 10px', fontSize:10, fontWeight:700,
            color:'var(--green)',
          }}>
            <span style={{ width:5, height:5, borderRadius:'50%',
              background:'var(--green)', display:'inline-block',
              boxShadow:'0 0 5px var(--green)' }}/>
            {lockedEmotion.emoji} {lockedEmotion.display_label} locked ({lockedEmotion.confidence_pct}%)
          </div>
        )}

        {/* Waiting badge */}
        {!showLocked && !sentence && (
          <div style={{
            display:'flex', alignItems:'center', gap:5,
            background:'rgba(245,158,11,.1)', border:'1px solid rgba(245,158,11,.3)',
            borderRadius:20, padding:'2px 10px', fontSize:10, fontWeight:700,
            color:'var(--amber)',
          }}>
            <span style={{ animation:'pulse 1s infinite', display:'inline-block',
              width:5, height:5, borderRadius:'50%', background:'var(--amber)' }}/>
            Waiting for first emotion…
          </div>
        )}
      </div>

      {/* Generated sentence */}
      <div style={{ fontSize:19, fontWeight:700, lineHeight:1.5, minHeight:28, marginBottom:10 }}>
        {isGenerating
          ? <span style={{ color:'var(--cyan)', fontSize:16 }}>
              ⏳ Phi-2 generating
              <span style={{ animation:'blink .6s infinite' }}>▋</span>
            </span>
          : sentence || (
            <span style={{ color:'var(--muted)', fontSize:14, fontStyle:'italic' }}>
              Sentence will appear here once emotion is detected…
            </span>
          )
        }
      </div>

      {/* Action buttons */}
      <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
        <Btn variant="primary" onClick={resetAndGenerate} disabled={isGenerating}>
          🧠 {isGenerating ? 'Thinking…' : 'Regenerate'}
        </Btn>
        <Btn variant="green" onClick={toggleSpeak}
          style={speaking ? {
            background:'rgba(255,90,90,.1)',
            borderColor:'rgba(255,90,90,.3)',
            color:'var(--red)',
          } : {}}>
          {speaking ? '⏹ Stop' : '🔊 Speak'}
        </Btn>
        <Btn variant="ghost"
          onClick={() => sentence && navigator.clipboard.writeText(sentence)}>
          📋 Copy
        </Btn>
        {/* Reset lock button */}
        {emotionLocked && (
          <Btn variant="amber" onClick={() => {
            setLockedEmotion(null)
            setEmotionLocked(false)
            hasGeneratedRef.current = false
          }}>
            🔄 New Emotion
          </Btn>
        )}
      </div>

      {/* Info strip */}
      <div style={{ marginTop:10, padding:'7px 10px',
        background:'rgba(0,0,0,.2)', borderRadius:8,
        fontSize:10, color:'var(--muted)', display:'flex', gap:12, flexWrap:'wrap' }}>
        <span>📍 Strategy: <b style={{ color:'var(--cyan)' }}>Lock first emotion → generate once</b></span>
        <span>🔁 Click <b style={{ color:'var(--text)' }}>New Emotion</b> to reset for next interaction</span>
      </div>
    </div>
  )
}

import React, { useState, useRef, useCallback } from 'react'
import { useStore } from '../utils/store'
import { generateSentence } from '../utils/api'
import { Btn } from './ui'

export default function AIOutput() {
  const {
    sentence, setSentence, isGenerating, setGenerating,
    symbols, speechText, gesture, emotion,
    addHistory, incStat,
  } = useStore()

  const [speaking, setSpeaking] = useState(false)
  const timerRef = useRef(null)

  const generate = useCallback(async () => {
    const hasInput = symbols.length || speechText ||
      (gesture.name !== 'none' && gesture.name !== 'No hand detected')
    if (!hasInput || isGenerating) return

    setGenerating(true)
    try {
      const { data } = await generateSentence()
      const sent = data.sentence || 'I need help communicating.'
      setSentence(sent)
      speakText(sent)
      addHistory({
        time: new Date().toLocaleTimeString(),
        sentence: sent,
        emoji: emotion.emoji,
        gesture: gesture.icon,
        symbols: symbols.map(s=>s.label).slice(0,3),
      })
      incStat('messages')
    } catch {
      setSentence('I need help right now.')
    }
    setGenerating(false)
  }, [symbols, speechText, gesture, emotion, isGenerating])

  // Auto-generate 2.5s after last signal change
  React.useEffect(() => {
    if (symbols.length || speechText) {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(generate, 2500)
    }
  }, [symbols, speechText])

  const speakText = (txt) => {
    if (!txt) return
    if (window.speechSynthesis.speaking) window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(txt)
    u.rate=0.85; u.pitch=1.05; u.volume=1
    const voices = window.speechSynthesis.getVoices()
    const pv = voices.find(v =>
      v.name.includes('Samantha')||v.name.includes('Karen')||
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

  return (
    <div style={{
      background:'linear-gradient(135deg,rgba(0,200,240,.05),rgba(108,99,255,.05))',
      border:'1px solid rgba(0,200,240,.25)', borderRadius:12, padding:14, flexShrink:0,
    }}>
      <div style={{ fontSize:9, fontWeight:700, letterSpacing:'2px',
        textTransform:'uppercase', color:'var(--cyan)', marginBottom:8 }}>
        🤖 Phi-2 LLM Output — Auto Display + Speak
      </div>
      <div style={{ fontSize:19, fontWeight:700, lineHeight:1.5, minHeight:28 }}>
        {isGenerating
          ? <span style={{ color:'var(--cyan)' }}>Generating<span style={{ animation:'blink .6s infinite' }}>▋</span></span>
          : sentence || 'Waiting for inputs…'
        }
      </div>
      <div style={{ display:'flex', gap:7, marginTop:10, flexWrap:'wrap' }}>
        <Btn variant="primary" onClick={generate} disabled={isGenerating}>
          🧠 {isGenerating ? 'Thinking…' : 'Generate (Phi-2)'}
        </Btn>
        <Btn variant="green" onClick={toggleSpeak}
          style={speaking ? { background:'rgba(255,90,90,.1)', borderColor:'rgba(255,90,90,.3)', color:'var(--red)' } : {}}>
          {speaking ? '⏹ Stop' : '🔊 Speak'}
        </Btn>
        <Btn variant="ghost" onClick={() => sentence && navigator.clipboard.writeText(sentence)}>
          📋 Copy
        </Btn>
      </div>
    </div>
  )
}
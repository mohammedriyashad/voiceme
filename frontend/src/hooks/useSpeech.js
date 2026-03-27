// src/hooks/useSpeech.js
import { useRef, useState, useCallback } from 'react'
import { updateSpeech } from '../utils/api'
import { useStore } from '../utils/store'

export function useSpeech() {
  const recogRef  = useRef(null)
  const [listening, setListening] = useState(false)
  const [interim,   setInterim]   = useState('')
  const { setSpeechText, speechText } = useStore()

  const setup = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return false
    const r          = new SR()
    r.continuous     = true
    r.interimResults = true
    r.lang           = 'en-US'

    r.onresult = async (e) => {
      let fin = '', int = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        e.results[i].isFinal
          ? (fin += e.results[i][0].transcript)
          : (int += e.results[i][0].transcript)
      }
      setInterim(int)
      if (fin) {
        const next = (speechText + ' ' + fin).trim()
        setSpeechText(next)
        setInterim('')
        await updateSpeech(next).catch(() => {})
      }
    }
    r.onend = () => { if (recogRef.current?._running) r.start() }
    recogRef.current = r
    recogRef.current._running = false
    return true
  }, [speechText])

  const toggle = useCallback(() => {
    if (!recogRef.current) { if (!setup()) return }
    if (listening) {
      recogRef.current._running = false
      recogRef.current.stop()
      setListening(false)
    } else {
      recogRef.current._running = true
      recogRef.current.start()
      setListening(true)
    }
  }, [listening, setup])

  return { listening, interim, toggle }
}
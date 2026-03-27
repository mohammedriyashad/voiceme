// src/hooks/useWebSocket.js
import { useEffect, useRef, useCallback } from 'react'
import { useStore } from '../utils/store'

const WS_URL = 'ws://localhost:8000/api/camera/ws'

export function useWebSocket() {
  const ws        = useRef(null)
  const reconnect = useRef(null)
  const { setEmotion, setGesture, setPose, setWsConnected, addAlert, incStat, setLatency } = useStore()

  const connect = useCallback(() => {
    try {
      ws.current = new WebSocket(WS_URL)

      ws.current.onopen = () => {
        setWsConnected(true)
        console.log('[WS] Connected to Python backend')
      }

      ws.current.onclose = () => {
        setWsConnected(false)
        // Reconnect after 3s
        reconnect.current = setTimeout(connect, 3000)
      }

      ws.current.onerror = () => setWsConnected(false)

      ws.current.onmessage = (e) => {
        const t0   = performance.now()
        const data = JSON.parse(e.data)

        if (data.emotion) setEmotion(data.emotion)
        if (data.gesture) setGesture(data.gesture)
        if (data.pose)    setPose(data.pose)
        if (data.alert)   { addAlert(data.alert); incStat('alerts') }

        setLatency(Math.round(performance.now() - t0))
      }
    } catch(err) {
      console.warn('[WS] Connect failed:', err)
      reconnect.current = setTimeout(connect, 3000)
    }
  }, [])

  const send = useCallback((payload) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(payload))
    }
  }, [])

  const disconnect = useCallback(() => {
    clearTimeout(reconnect.current)
    ws.current?.close()
    setWsConnected(false)
  }, [])

  useEffect(() => {
    connect()
    return () => { clearTimeout(reconnect.current); ws.current?.close() }
  }, [])

  return { send, disconnect }
}
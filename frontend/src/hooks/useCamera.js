// src/hooks/useCamera.js
import { useRef, useState, useCallback } from 'react'

export function useCamera(onFrame) {
  const videoRef    = useRef(null)
  const canvasRef   = useRef(null)
  const offscreen   = useRef(document.createElement('canvas'))
  const intervalRef = useRef(null)
  const [active, setActive] = useState(false)

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width:640, height:480, facingMode:'user' },
        audio: false,
      })
      const vid = videoRef.current
      vid.srcObject = stream
      await new Promise(r => { vid.onloadedmetadata = r })

      const c   = canvasRef.current
      c.width   = vid.videoWidth  || 640
      c.height  = vid.videoHeight || 480

      setActive(true)

      // Send frame every 120ms (~8fps) to Python backend
      intervalRef.current = setInterval(() => {
        const off = offscreen.current
        off.width  = 320
        off.height = 240
        off.getContext('2d').drawImage(vid, 0, 0, 320, 240)
        onFrame(off.toDataURL('image/jpeg', 0.7))
      }, 120)

    } catch(err) {
      alert('Camera error: ' + err.message)
    }
  }, [onFrame])

  const stop = useCallback(() => {
    clearInterval(intervalRef.current)
    const vid = videoRef.current
    if (vid?.srcObject) vid.srcObject.getTracks().forEach(t => t.stop())
    if (vid) vid.srcObject = null
    setActive(false)
  }, [])

  return { videoRef, canvasRef, active, start, stop }
}

import React, { useCallback, useEffect, useRef } from 'react'
import { useCamera } from '../hooks/useCamera'
import { useStore }  from '../utils/store'
import { Card, CardHeader, CardBody, Btn } from './ui'

export default function CameraPanel() {
  const { emotion, wsConnected, activeProfile } = useStore()
  const annotatedRef = useRef(null)  // holds latest annotated frame from Python

  // Send frame to Python via window._aacSend (set in App.jsx)
  const sendFrame = useCallback((frame) => {
    if (window._aacSend) window._aacSend({ frame })
  }, [])

  const { videoRef, canvasRef, active, start, stop } = useCamera(sendFrame)

  // Draw annotated frame returned by Python onto canvas
  useEffect(() => {
    const store = useStore.getState()
    // Listen to WS messages via a store subscription isn't available
    // Instead we patch window._onAnnotatedFrame from App
  }, [])

  return (
    <Card style={{ flexShrink:0 }}>
      <CardHeader
        icon="📷"
        title="Live Camera — Python Backend"
        right={
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ width:6, height:6, borderRadius:'50%',
              background: wsConnected ? 'var(--green)' : 'var(--red)',
              display:'inline-block',
              boxShadow: wsConnected ? '0 0 6px var(--green)' : 'none' }}/>
            <span style={{ fontSize:10, color: wsConnected ? 'var(--green)' : 'var(--red)' }}>
              {wsConnected ? 'Connected' : 'Offline'}
            </span>
          </div>
        }
      />
      <CardBody style={{ padding:8 }}>
        {/* Profile label */}
        <div style={{ fontSize:10, color:'var(--muted)', marginBottom:6, textAlign:'center' }}>
          {activeProfile ? `👤 Active: ${activeProfile.name}` : '⚠️ No profile selected'}
        </div>

        {/* Camera viewport */}
        <div style={{ position:'relative', borderRadius:10, overflow:'hidden',
          background:'#000', aspectRatio:'4/3' }}>

          {/* Raw webcam video */}
          <video ref={videoRef} autoPlay muted playsInline
            style={{ position:'absolute', inset:0, width:'100%', height:'100%',
              objectFit:'cover', zIndex:1 }}/>

          {/* Annotated canvas (Python draws skeleton + labels here) */}
          <canvas ref={canvasRef} id="gestureCanvas"
            style={{ position:'absolute', inset:0, width:'100%', height:'100%', zIndex:2 }}/>

          {/* Emotion overlay bar */}
          <div style={{
            position:'absolute', bottom:0, left:0, right:0, zIndex:3,
            padding:'6px 10px',
            background:'linear-gradient(transparent,rgba(0,0,0,.9))',
            display:'flex', alignItems:'center', gap:7,
          }}>
            <div style={{
              display:'flex', alignItems:'center', gap:5,
              background:'rgba(0,0,0,.7)', border:'1px solid var(--border)',
              borderRadius:16, padding:'3px 9px',
              fontSize:12, fontWeight:600,
            }}>
              <span style={{ fontSize:16 }}>{emotion.emoji}</span>
              <span style={{ color:'var(--cyan)', fontSize:11 }}>
                {emotion.display_label}
              </span>
            </div>
            {/* Confidence bar */}
            <div style={{ flex:1, height:4, background:'var(--border)', borderRadius:2 }}>
              <div style={{
                height:'100%', borderRadius:2, transition:'width .5s',
                width:`${emotion.confidence_pct||0}%`,
                background:'linear-gradient(90deg,var(--cyan),var(--violet))',
              }}/>
            </div>
            <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--green)', minWidth:32 }}>
              {emotion.confidence_pct||0}%
            </span>
          </div>
        </div>

        {/* Camera controls */}
        <div style={{ display:'flex', gap:6, marginTop:8 }}>
          {!active
            ? <Btn variant="primary" onClick={start}
                style={{ flex:1, justifyContent:'center' }}>
                ▶ Start Camera
              </Btn>
            : <Btn variant="danger" onClick={stop}
                style={{ flex:1, justifyContent:'center' }}>
                ■ Stop Camera
              </Btn>
          }
        </div>

        {/* Hint */}
        {!active && (
          <div style={{ fontSize:10, color:'var(--muted)', textAlign:'center',
            marginTop:6, lineHeight:1.5 }}>
            Click Start to activate webcam.<br/>
            Python will process emotion + gesture + pose in real-time.
          </div>
        )}
      </CardBody>
    </Card>
  )
}

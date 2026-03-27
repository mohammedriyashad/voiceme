import React from 'react'
import CameraPanel from '../components/CameraPanel'
import SymbolBoard from '../components/SymbolBoard'
import AIOutput    from '../components/AIOutput'
import { MicPanel, FusionPanel, StatsPanel, HistoryPanel } from '../components/RightPanels'
import { SignalBox } from '../components/ui'
import { useStore } from '../utils/store'

const GESTURE_HINTS = [
  { icon:'☝️', label:'Need help' }, { icon:'✌️', label:"I'm okay"  },
  { icon:'👍', label:'Yes/Good'  }, { icon:'✊', label:'Stop/No'   },
  { icon:'🖐️', label:'I want'   }, { icon:'🤙', label:'Talk to me' },
]
const POSE_HINTS = [
  { icon:'🙋', label:'Attention'     }, { icon:'🤐', label:'Uncomfortable' },
  { icon:'😔', label:'Sad/withdrawn' }, { icon:'🔄', label:'Anxious'       },
]

export default function Dashboard() {
  const { gesture, pose } = useStore()
  return (
    <div style={{ display:'flex', gap:10, height:'100%', overflow:'hidden' }}>

      {/* LEFT */}
      <div style={{ display:'flex', flexDirection:'column', gap:10,
        width:300, flexShrink:0, overflowY:'auto', scrollbarWidth:'none' }}>
        <CameraPanel/>
        <SignalBox
          title="🤲 Gesture — MediaPipe + ML"
          icon={gesture.icon}
          name={gesture.name === 'none' ? 'No hand detected' : gesture.name}
          meaning={gesture.meaning}
          hints={GESTURE_HINTS}
        />
        <SignalBox
          title="🧍 Pose — MediaPipe Pose"
          icon={pose.icon}
          name={pose.meaning}
          meaning={pose.name}
          hints={POSE_HINTS}
        />
      </div>

      {/* CENTER */}
      <div style={{ display:'flex', flexDirection:'column', gap:10, flex:1, minWidth:0 }}>
        <SymbolBoard/>
        <AIOutput/>
      </div>

      {/* RIGHT */}
      <div style={{ display:'flex', flexDirection:'column', gap:10,
        width:260, flexShrink:0, overflowY:'auto', scrollbarWidth:'none' }}>
        <MicPanel/>
        <FusionPanel/>
        <StatsPanel/>
        <HistoryPanel/>
      </div>
    </div>
  )
}

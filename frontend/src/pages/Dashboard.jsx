// src/pages/Dashboard.jsx — New 2-way communication layout
import React from 'react'
import CameraPanel      from '../components/CameraPanel'
import SymbolBoard      from '../components/SymbolBoard'
import ConversationPanel from '../components/ConversationPanel'
import { MicPanel, FusionPanel, StatsPanel, HistoryPanel } from '../components/RightPanels'
import { SignalBox } from '../components/ui'
import { useStore } from '../utils/store'

const GESTURE_HINTS = [
  { icon:'☝️', label:'Need help'  }, { icon:'✌️', label:"I'm okay"   },
  { icon:'👍', label:'Yes / Good' }, { icon:'✊', label:'Stop / No'  },
  { icon:'🖐️', label:'I want'    }, { icon:'🤙', label:'Talk to me' },
]
const POSE_HINTS = [
  { icon:'🙋', label:'Attention'      }, { icon:'🤐', label:'Uncomfortable' },
  { icon:'😔', label:'Sad/withdrawn'  }, { icon:'🔄', label:'Anxious'       },
]

export default function Dashboard() {
  const { gesture, pose } = useStore()

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '280px 1fr 260px',
      gridTemplateRows: '1fr',
      gap: 10,
      height: '100%',
      overflow: 'hidden',
    }}>

      {/* ── LEFT: Camera + Signals ── */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 10,
        overflowY: 'auto', scrollbarWidth: 'none',
      }}>
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

      {/* ── CENTER: 2-Way Conversation + Symbol Board ── */}
      <div style={{
        display: 'grid',
        gridTemplateRows: '1fr 260px',
        gap: 10,
        minWidth: 0,
        minHeight: 0,
      }}>
        {/* 2-Way Conversation Panel — MAIN FEATURE */}
        <ConversationPanel/>

        {/* Symbol Board — child input */}
        <SymbolBoard compact={true}/>
      </div>

      {/* ── RIGHT: Mic + Fusion + Stats + History ── */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 10,
        overflowY: 'auto', scrollbarWidth: 'none',
      }}>
        <MicPanel/>
        <FusionPanel/>
        <StatsPanel/>
        <HistoryPanel/>
      </div>

    </div>
  )
}
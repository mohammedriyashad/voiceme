// src/utils/store.js — Global state with Zustand
import { create } from 'zustand'

export const useStore = create((set, get) => ({
  // ── Active profile / session ──────────────────────────────
  activeProfile:   null,
  activeSessionId: null,
  setActiveProfile:   (p)   => set({ activeProfile: p }),
  setActiveSessionId: (sid) => set({ activeSessionId: sid }),

  // ── Real-time signals (updated by WebSocket) ──────────────
  emotion: { label:'neutral', display_label:'Neutral', emoji:'😐', confidence:0, confidence_pct:0 },
  gesture: { name:'none', icon:'✋', meaning:'No hand detected', confidence:0 },
  pose:    { name:'normal', icon:'🧍', meaning:'Normal posture' },
  setEmotion: (e) => set({ emotion: e }),
  setGesture: (g) => set({ gesture: g }),
  setPose:    (p) => set({ pose: p }),

  // ── Symbol board ─────────────────────────────────────────
  symbols: [],
  addSymbol:    (s)  => set(st => ({ symbols: [...st.symbols, s] })),
  removeSymbol: (i)  => set(st => ({ symbols: st.symbols.filter((_,idx)=>idx!==i) })),
  clearSymbols: ()   => set({ symbols: [] }),

  // ── Speech ────────────────────────────────────────────────
  speechText: '',
  setSpeechText: (t) => set({ speechText: t }),

  // ── Generated sentence ────────────────────────────────────
  sentence:    '',
  isGenerating: false,
  setSentence:    (s) => set({ sentence: s }),
  setGenerating:  (b) => set({ isGenerating: b }),

  // ── Connection status ─────────────────────────────────────
  wsConnected:  false,
  setWsConnected: (b) => set({ wsConnected: b }),

  // ── Alerts ────────────────────────────────────────────────
  pendingAlerts: [],
  alertCount:    0,
  addAlert:  (a) => set(st => ({ pendingAlerts:[a,...st.pendingAlerts], alertCount:st.alertCount+1 })),
  clearAlerts:   () => set({ pendingAlerts:[], alertCount:0 }),
  removeAlert:(id)=> set(st=>({ pendingAlerts:st.pendingAlerts.filter(a=>a.id!==id), alertCount:Math.max(0,st.alertCount-1) })),

  // ── Session stats ─────────────────────────────────────────
  stats: { symbols:0, messages:0, latency:0, alerts:0 },
  incStat: (key) => set(st => ({ stats:{ ...st.stats, [key]:st.stats[key]+1 } })),
  setLatency: (ms)=> set(st => ({ stats:{ ...st.stats, latency:ms } })),

  // ── History ───────────────────────────────────────────────
  history: [],
  addHistory: (h) => set(st => ({ history:[h,...st.history].slice(0,50) })),
}))
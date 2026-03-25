"""utils/state.py — Shared real-time state across all modules"""
from dataclasses import dataclass, field
from typing import Optional
import numpy as np


@dataclass
class AppState:
    # ── Active child profile ──────────────────────────────────
    active_child_id:   Optional[int] = None
    active_child_name: str           = "Unknown"
    active_session_id: Optional[int] = None

    # ── Module outputs (written by camera WS) ─────────────────
    emotion: dict = field(default_factory=lambda: {
        "label": "neutral", "display_label": "Neutral",
        "emoji": "😐", "intent": "calm", "confidence": 0.0,
        "confidence_pct": 0.0,
    })
    gesture: dict = field(default_factory=lambda: {
        "name": "none", "icon": "✋",
        "meaning": "No hand detected", "intent": "", "confidence": 0.0,
    })
    pose: dict = field(default_factory=lambda: {
        "name": "normal", "icon": "🧍",
        "meaning": "Normal posture", "intent": "",
    })

    # ── User inputs ───────────────────────────────────────────
    speech_text: str = ""
    symbols: list    = field(default_factory=list)   # [{id,label,url}]

    # ── LLM output ────────────────────────────────────────────
    last_sentence:  str  = ""
    is_generating:  bool = False

    # ── Camera ────────────────────────────────────────────────
    camera_active:  bool             = False
    current_frame:  Optional[object] = None   # BGR numpy array

    # ── Alerts ────────────────────────────────────────────────
    pending_alerts: list = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "child_id":   self.active_child_id,
            "child_name": self.active_child_name,
            "session_id": self.active_session_id,
            "emotion":    self.emotion,
            "gesture":    self.gesture,
            "pose":       self.pose,
            "symbols":    self.symbols,
            "speech":     self.speech_text,
            "sentence":   self.last_sentence,
        }

    def check_distress(self) -> Optional[dict]:
        """Return alert dict if distress signals detected, else None."""
        distress_emotions  = {"angry", "fear", "disgust"}
        distress_gestures  = {"fist", "pointing_up"}
        distress_poses     = {"rocking", "arms_crossed", "head_down"}

        score = 0
        if self.emotion.get("label") in distress_emotions and self.emotion.get("confidence", 0) > 0.5:
            score += 2
        if self.gesture.get("name") in distress_gestures:
            score += 1
        if self.pose.get("name") in distress_poses:
            score += 1

        if score >= 2:
            return {
                "type":    "distress" if score >= 3 else "warning",
                "emotion": self.emotion.get("display_label", ""),
                "gesture": self.gesture.get("meaning", ""),
                "pose":    self.pose.get("meaning", ""),
                "score":   score,
            }
        return None


app_state = AppState()
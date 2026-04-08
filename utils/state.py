"""utils/state.py — Shared real-time state with emotion locking"""
import time
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class AppState:
    # ── Active profile / session ──────────────────────────────
    active_child_id:   Optional[int] = None
    active_child_name: str           = "Unknown"
    active_session_id: Optional[int] = None

    # ── Module outputs ────────────────────────────────────────
    emotion: dict = field(default_factory=lambda: {
        "label": "neutral", "display_label": "Neutral", "emoji": "😐",
        "intent": "calm", "confidence": 0.0, "confidence_pct": 0.0,
    })

    # ── Locked emotion (first confident emotion captured) ─────
    locked_emotion:      Optional[dict] = None
    emotion_lock_time:   float          = 0.0
    emotion_is_locked:   bool           = False

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
    symbols: list    = field(default_factory=list)

    # ── LLM output ────────────────────────────────────────────
    last_sentence:  str  = ""
    is_generating:  bool = False

    # ── Camera ────────────────────────────────────────────────
    camera_active:  bool             = False
    current_frame:  Optional[object] = None

    # ── Alerts ────────────────────────────────────────────────
    pending_alerts: list = field(default_factory=list)

    def update_emotion(self, emo: dict):
        """
        Update emotion. Lock the FIRST confident non-neutral emotion.
        Once locked, it stays until manually reset.
        """
        self.emotion = emo

        # Lock first confident emotion (confidence > 40%, not neutral)
        if (
            not self.emotion_is_locked
            and emo.get("confidence", 0) > 0.40
            and emo.get("label", "neutral") != "neutral"
        ):
            self.locked_emotion    = emo
            self.emotion_lock_time = time.time()
            self.emotion_is_locked = True
            print(f"[State] Emotion LOCKED: {emo['display_label']} ({emo['confidence_pct']}%)")

    def reset_emotion_lock(self):
        """Call this between sessions or when caregiver resets."""
        self.locked_emotion    = None
        self.emotion_lock_time = 0.0
        self.emotion_is_locked = False
        print("[State] Emotion lock RESET")

    def get_active_emotion(self) -> dict:
        """Return locked emotion if available, else current."""
        if self.emotion_is_locked and self.locked_emotion:
            return self.locked_emotion
        return self.emotion

    def to_dict(self) -> dict:
        return {
            "child_id":        self.active_child_id,
            "child_name":      self.active_child_name,
            "session_id":      self.active_session_id,
            "emotion":         self.get_active_emotion(),
            "emotion_locked":  self.emotion_is_locked,
            "gesture":         self.gesture,
            "pose":            self.pose,
            "symbols":         self.symbols,
            "speech":          self.speech_text,
            "sentence":        self.last_sentence,
        }

    def check_distress(self) -> Optional[dict]:
        """Return alert dict if distress signals detected."""
        distress_emotions = {"angry", "fear", "disgust"}
        distress_gestures = {"fist", "pointing_up"}
        distress_poses    = {"rocking", "arms_crossed", "head_down"}

        score = 0
        emo = self.get_active_emotion()
        if emo.get("label") in distress_emotions and emo.get("confidence", 0) > 0.5:
            score += 2
        if self.gesture.get("name") in distress_gestures:
            score += 1
        if self.pose.get("name") in distress_poses:
            score += 1

        if score >= 2:
            return {
                "type":    "distress" if score >= 3 else "warning",
                "emotion": emo.get("display_label", ""),
                "gesture": self.gesture.get("meaning", ""),
                "pose":    self.pose.get("meaning", ""),
                "score":   score,
            }
        return None


app_state = AppState()

"""
utils/state.py
Fixed alert system:
- Alerts only trigger on REAL distress (score >= 3, not just 2)
- 60 second cooldown between alerts (no spamming)
- Requires SUSTAINED distress (3 consecutive detections)
- Neutral/normal states never trigger alerts
"""
import time
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class AppState:
    # ── Active profile / session ──────────────────────────────
    active_child_id:    Optional[int] = None
    active_child_name:  str           = "Unknown"
    active_session_id:  Optional[int] = None

    # ── Module outputs ────────────────────────────────────────
    emotion: dict = field(default_factory=lambda: {
        "label": "neutral", "display_label": "Neutral",
        "emoji": "😐", "intent": "calm",
        "confidence": 0.0, "confidence_pct": 0.0,
    })

    # ── Locked emotion (first confident emotion captured) ─────
    locked_emotion:    Optional[dict] = None
    emotion_lock_time: float          = 0.0
    emotion_is_locked: bool           = False

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

    # ── Alert system — FIXED ──────────────────────────────────
    pending_alerts:          list  = field(default_factory=list)
    last_alert_time:         float = 0.0      # timestamp of last alert sent
    alert_cooldown_seconds:  int   = 60       # minimum 60s between alerts
    distress_counter:        int   = 0        # consecutive distress detections
    distress_threshold:      int   = 5        # need 5 consecutive before alert
    last_distress_score:     int   = 0

    # ── Emotion lock ──────────────────────────────────────────
    def update_emotion(self, emo: dict):
        """Update emotion and lock first confident non-neutral one."""
        self.emotion = emo
        if (
            not self.emotion_is_locked
            and emo.get("confidence", 0) > 0.45
            and emo.get("label", "neutral") != "neutral"
        ):
            self.locked_emotion    = emo
            self.emotion_lock_time = time.time()
            self.emotion_is_locked = True
            print(f"[State] Emotion LOCKED: {emo['display_label']} ({emo['confidence_pct']}%)")

    def reset_emotion_lock(self):
        self.locked_emotion    = None
        self.emotion_lock_time = 0.0
        self.emotion_is_locked = False
        print("[State] Emotion lock RESET")

    def get_active_emotion(self) -> dict:
        if self.emotion_is_locked and self.locked_emotion:
            return self.locked_emotion
        return self.emotion

    def to_dict(self) -> dict:
        return {
            "child_id":       self.active_child_id,
            "child_name":     self.active_child_name,
            "session_id":     self.active_session_id,
            "emotion":        self.get_active_emotion(),
            "emotion_locked": self.emotion_is_locked,
            "gesture":        self.gesture,
            "pose":           self.pose,
            "symbols":        self.symbols,
            "speech":         self.speech_text,
            "sentence":       self.last_sentence,
        }

    # ── FIXED: Smart distress detection ──────────────────────
    def check_distress(self) -> Optional[dict]:
        """
        Only return alert if:
        1. Score is HIGH (>= 3, not just 2)
        2. Cooldown has passed (60 seconds since last alert)
        3. Distress is SUSTAINED (5 consecutive detections)
        4. Confidence is high enough (> 60%)

        This prevents false positives and alert spam.
        """
        now = time.time()

        # ── Cooldown check ─────────────────────────────────
        if now - self.last_alert_time < self.alert_cooldown_seconds:
            # Still in cooldown — silently track but don't alert
            return None

        # ── Score calculation ──────────────────────────────
        DISTRESS_EMOTIONS  = {"angry", "fear", "disgust"}
        DISTRESS_GESTURES  = {"fist"}              # only fist, not pointing_up (that means help)
        DISTRESS_POSES     = {"rocking", "head_down"}  # arms_crossed alone is NOT distress

        score = 0
        emo   = self.get_active_emotion()

        # Emotion must be distress AND high confidence
        if (emo.get("label") in DISTRESS_EMOTIONS
                and emo.get("confidence", 0) > 0.60):  # raised from 0.5 to 0.6
            score += 2

        # Gesture
        if self.gesture.get("name") in DISTRESS_GESTURES:
            score += 1

        # Pose — only strong distress poses
        if self.pose.get("name") in DISTRESS_POSES:
            score += 1

        # ── Sustained detection counter ────────────────────
        if score >= 3:
            self.distress_counter += 1
        else:
            # Reset counter if distress dropped
            self.distress_counter = 0
            return None

        # ── Only alert after sustained distress ───────────
        if self.distress_counter < self.distress_threshold:
            return None   # not sustained enough yet

        # ── Real alert — reset counter and cooldown ────────
        self.distress_counter = 0
        self.last_alert_time  = now
        self.last_distress_score = score

        alert_type = "distress" if score >= 4 else "warning"
        print(f"[State] DISTRESS ALERT triggered: {alert_type} (score={score})")

        return {
            "type":    alert_type,
            "emotion": emo.get("display_label", ""),
            "gesture": self.gesture.get("meaning", ""),
            "pose":    self.pose.get("meaning", ""),
            "score":   score,
        }


app_state = AppState()
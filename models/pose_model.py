"""models/pose_model.py — MediaPipe Pose body language detection"""
import cv2
import numpy as np
import mediapipe as mp

POSE_MAP = {
    "hand_raised":     {"icon": "🙋", "meaning": "Hand raised",     "intent": "asking for attention"},
    "arms_crossed":    {"icon": "🤐", "meaning": "Arms crossed",    "intent": "feeling closed off or uncomfortable"},
    "leaning_forward": {"icon": "🫱", "meaning": "Leaning forward", "intent": "interested or trying to reach"},
    "rocking":         {"icon": "🔄", "meaning": "Rocking",         "intent": "feeling anxious or seeking comfort"},
    "head_down":       {"icon": "😔", "meaning": "Head down",       "intent": "feeling sad or withdrawn"},
    "normal":          {"icon": "🧍", "meaning": "Normal posture",  "intent": ""},
    "unknown":         {"icon": "❓", "meaning": "Not detected",    "intent": ""},
}

mp_pose    = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils
mp_styles  = mp.solutions.drawing_styles

class PoseDetector:
    def __init__(self, confidence: float = 0.5):
        self.pose = mp_pose.Pose(
            static_image_mode=False, model_complexity=0,
            min_detection_confidence=confidence, min_tracking_confidence=0.5,
        )
        self._sh_history = []

    def process(self, frame: np.ndarray) -> tuple:
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        rgb.flags.writeable = False
        results = self.pose.process(rgb)
        rgb.flags.writeable = True
        annotated = frame.copy()

        if not results.pose_landmarks:
            return annotated, self._result("unknown")

        mp_drawing.draw_landmarks(annotated, results.pose_landmarks,
                                  mp_pose.POSE_CONNECTIONS,
                                  landmark_drawing_spec=mp_styles.get_default_pose_landmarks_style())

        lm    = results.pose_landmarks.landmark
        label = self._classify(lm)
        res   = self._result(label)
        cv2.putText(annotated, f"{res['icon']} {res['meaning']}",
                    (10, 115), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (180, 100, 255), 2)
        return annotated, res

    def _classify(self, lm) -> str:
        NS, LS, RS = 0, 11, 12
        LE, RE, LW, RW, LH, RH = 13, 14, 15, 16, 23, 24

        sh_y   = (lm[LS].y + lm[RS].y) / 2
        mid_x  = (lm[LS].x + lm[RS].x) / 2

        if lm[LW].y < lm[LS].y - 0.05 or lm[RW].y < lm[RS].y - 0.05:
            return "hand_raised"
        if lm[NS].y > sh_y + 0.06:
            return "head_down"
        if lm[LW].x > mid_x and lm[RW].x < mid_x:
            return "arms_crossed"
        if abs(lm[NS].x - mid_x) > 0.13:
            return "leaning_forward"

        self._sh_history.append(sh_y)
        if len(self._sh_history) > 20: self._sh_history.pop(0)
        if len(self._sh_history) == 20 and np.std(self._sh_history) > 0.012:
            return "rocking"

        return "normal"

    def _result(self, label: str) -> dict:
        info = POSE_MAP.get(label, POSE_MAP["unknown"])
        return {"name": label, "icon": info["icon"],
                "meaning": info["meaning"], "intent": info["intent"]}

pose_detector = PoseDetector()
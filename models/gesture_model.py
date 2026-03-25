"""models/gesture_model.py — MediaPipe Hands + trained ML classifier"""
import os, pickle, cv2
import numpy as np
import mediapipe as mp

GESTURE_MAP = {
    "thumbs_up":   {"icon": "👍", "meaning": "Yes / Good",       "intent": "approving or saying yes"},
    "thumbs_down": {"icon": "👎", "meaning": "No / Stop",        "intent": "refusing or saying no"},
    "open_hand":   {"icon": "🖐️", "meaning": "I want something", "intent": "requesting something"},
    "fist":        {"icon": "✊", "meaning": "Stop / No more",   "intent": "wanting to stop"},
    "pointing_up": {"icon": "☝️", "meaning": "Need help",        "intent": "asking for help or attention"},
    "peace":       {"icon": "✌️", "meaning": "I am okay",        "intent": "feeling okay"},
    "call_me":     {"icon": "🤙", "meaning": "Talk to me",       "intent": "wanting to communicate"},
    "rock_on":     {"icon": "🤘", "meaning": "Excited",          "intent": "feeling excited or happy"},
    "none":        {"icon": "✋", "meaning": "No hand detected", "intent": ""},
}

MODEL_FILE   = os.path.join("models", "gesture_classifier.pkl")
mp_hands     = mp.solutions.hands
mp_drawing   = mp.solutions.drawing_utils
mp_styles    = mp.solutions.drawing_styles


class GestureDetector:
    def __init__(self, confidence: float = 0.65):
        self.hands = mp_hands.Hands(
            static_image_mode=False, max_num_hands=1,
            min_detection_confidence=confidence,
            min_tracking_confidence=0.5, model_complexity=0,
        )
        self.clf = self.encoder = None
        if os.path.exists(MODEL_FILE):
            with open(MODEL_FILE, "rb") as f:
                data = pickle.load(f)
            self.clf, self.encoder = data["model"], data["encoder"]
            print(f"[Gesture] ML model loaded ✓")
        else:
            print("[Gesture] Using rule-based classifier (run train_gesture_model.py to improve)")

    def process(self, frame: np.ndarray) -> tuple:
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        rgb.flags.writeable = False
        results = self.hands.process(rgb)
        rgb.flags.writeable = True
        annotated = frame.copy()

        if not results.multi_hand_landmarks:
            return annotated, self._result("none", 0.0)

        lm = results.multi_hand_landmarks[0]
        mp_drawing.draw_landmarks(annotated, lm, mp_hands.HAND_CONNECTIONS,
                                  mp_styles.get_default_hand_landmarks_style(),
                                  mp_styles.get_default_hand_connections_style())

        features = [v for pt in lm.landmark for v in (pt.x, pt.y, pt.z)]

        if self.clf is not None:
            proba = self.clf.predict_proba([features])[0]
            idx   = proba.argmax()
            label = self.encoder.classes_[idx]
            conf  = float(proba[idx])
        else:
            label, conf = self._rules(lm)

        res = self._result(label, conf)
        cv2.putText(annotated, f"{res['icon']} {res['meaning']} ({int(conf*100)}%)",
                    (10, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 200, 0), 2)
        return annotated, res

    def _result(self, label: str, confidence: float) -> dict:
        info = GESTURE_MAP.get(label, GESTURE_MAP["none"])
        return {"name": label, "icon": info["icon"], "meaning": info["meaning"],
                "intent": info["intent"], "confidence": round(confidence, 3)}

    def _rules(self, lm) -> tuple:
        p = lm.landmark
        i_up = p[8].y < p[6].y; m_up = p[12].y < p[10].y
        r_up = p[16].y < p[14].y; k_up = p[20].y < p[18].y
        th   = p[4].y < p[3].y
        fs   = [i_up, m_up, r_up, k_up]
        if not any(fs) and not th:           return "fist",        0.85
        if all(fs) and th:                   return "open_hand",   0.90
        if not any(fs) and th:               return "thumbs_up",   0.90
        if not any(fs) and not th:           return "thumbs_down", 0.85
        if i_up and m_up and not r_up and not k_up: return "peace", 0.88
        if i_up and not m_up and not r_up and not k_up: return "pointing_up", 0.88
        if not i_up and not m_up and not r_up and k_up and th: return "call_me", 0.80
        if i_up and not m_up and not r_up and k_up: return "rock_on", 0.78
        return "open_hand", 0.60

gesture_detector = GestureDetector()
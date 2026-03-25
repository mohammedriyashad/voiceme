"""models/emotion_model.py — DeepFace facial emotion detection"""
import cv2
import numpy as np
from deepface import DeepFace

EMOTION_MAP = {
    "happy":    {"emoji": "😊", "label": "Happy",        "intent": "feeling happy or excited",        "alert": False},
    "sad":      {"emoji": "😢", "label": "Sad",           "intent": "feeling sad or upset",            "alert": True},
    "angry":    {"emoji": "😠", "label": "Frustrated",    "intent": "feeling frustrated or angry",     "alert": True},
    "fear":     {"emoji": "😨", "label": "Anxious",       "intent": "feeling scared or anxious",       "alert": True},
    "disgust":  {"emoji": "🤢", "label": "Uncomfortable", "intent": "feeling uncomfortable or sick",   "alert": True},
    "surprise": {"emoji": "😲", "label": "Surprised",     "intent": "feeling surprised or confused",   "alert": False},
    "neutral":  {"emoji": "😐", "label": "Neutral",       "intent": "calm and neutral",                "alert": False},
}

class EmotionDetector:
    def __init__(self, threshold: float = 0.45, backend: str = "opencv"):
        self.threshold = threshold
        self.backend   = backend

    def analyse(self, frame: np.ndarray) -> dict:
        try:
            result = DeepFace.analyze(
                img_path=frame, actions=["emotion"],
                detector_backend=self.backend,
                enforce_detection=False, silent=True,
            )
            if isinstance(result, list):
                result = result[0]
            scores     = result.get("emotion", {})
            best_label = max(scores, key=scores.get)
            confidence = scores[best_label] / 100.0
            info       = EMOTION_MAP.get(best_label, EMOTION_MAP["neutral"])
            return {
                "label":          best_label,
                "display_label":  info["label"],
                "emoji":          info["emoji"],
                "intent":         info["intent"],
                "alert":          info["alert"],
                "confidence":     round(confidence, 3),
                "confidence_pct": round(confidence * 100, 1),
                "all_scores":     {k: round(v, 1) for k, v in scores.items()},
                "error":          None,
            }
        except Exception as e:
            n = EMOTION_MAP["neutral"]
            return {"label": "neutral", "display_label": n["label"], "emoji": n["emoji"],
                    "intent": n["intent"], "alert": False, "confidence": 0.0,
                    "confidence_pct": 0.0, "all_scores": {}, "error": str(e)}

    def draw(self, frame: np.ndarray, result: dict) -> np.ndarray:
        txt   = f"{result['emoji']} {result['display_label']} ({result['confidence_pct']}%)"
        color = (0, 80, 255) if result.get("alert") else (0, 220, 160)
        cv2.putText(frame, txt, (10, 32), cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
        bar_w = int(result["confidence"] * 180)
        cv2.rectangle(frame, (10, 44), (10 + bar_w, 52), color, -1)
        return frame

emotion_detector = EmotionDetector()
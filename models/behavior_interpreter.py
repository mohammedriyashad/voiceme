"""models/behavior_interpreter.py — Multimodal signal fusion (Phase 5)"""
from utils.state import app_state


def fuse() -> dict:
    signals = []

    e = app_state.emotion
    if e.get("confidence", 0) > 0.4:
        signals.append({"source": "facial_emotion", "value": e["display_label"],
                        "intent": e["intent"], "confidence": e["confidence"]})

    g = app_state.gesture
    if g.get("name") not in ("none", "unknown") and g.get("confidence", 0) > 0.5:
        signals.append({"source": "hand_gesture", "value": g["meaning"],
                        "intent": g["intent"], "confidence": g["confidence"]})

    p = app_state.pose
    if p.get("name") not in ("normal", "unknown"):
        signals.append({"source": "body_pose", "value": p["meaning"],
                        "intent": p["intent"], "confidence": 0.7})

    syms = [s["label"] for s in app_state.symbols]
    if syms:
        signals.append({"source": "symbol_board", "value": ", ".join(syms),
                        "intent": f"user selected: {', '.join(syms)}", "confidence": 0.95})

    sp = app_state.speech_text.strip()
    if sp:
        signals.append({"source": "speech", "value": sp,
                        "intent": f'user said: "{sp}"', "confidence": 0.90})

    return {
        "signals":   signals,
        "has_input": bool(signals),
        "emotion":   e, "gesture": g, "pose": p,
        "symbols":   syms, "speech": sp,
    }


def context_string(fused: dict) -> str:
    if not fused["has_input"]:
        return "No signals detected."
    return "\n".join(
        f"- {s['source'].replace('_',' ').title()}: {s['value']} ({int(s['confidence']*100)}%)"
        for s in fused["signals"]
    )
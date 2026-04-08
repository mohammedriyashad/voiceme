"""
routes/llm.py
Groq + Llama3 conversational caregiver endpoints.

Endpoints:
  POST /api/llm/greet          — Initial greeting when profile activated
  POST /api/llm/respond        — Child communicated → AI responds
  POST /api/llm/reset          — Reset conversation
  GET  /api/llm/history        — Get conversation history
  POST /api/llm/reset-emotion  — Reset emotion lock
"""

import json
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from models.llm_model          import generate_response
from models.behavior_interpreter import fuse
from utils.state               import app_state
from utils.database            import get_db, Message, Alert

router = APIRouter()

# ── In-memory conversation history per session ────────────────
# Format: [{"role": "user"|"assistant", "content": "..."}]
_conversation: list = []


def _save_message_to_db(sentence: str, db: Session):
    """Save generated message to database if session is active."""
    if not app_state.active_session_id:
        return
    try:
        msg = Message(
            session_id   = app_state.active_session_id,
            sentence     = sentence,
            emotion      = app_state.get_active_emotion().get("label", ""),
            gesture      = app_state.gesture.get("meaning", ""),
            pose         = app_state.pose.get("meaning", ""),
            symbols_used = json.dumps([s["label"] for s in app_state.symbols]),
            speech_text  = app_state.speech_text,
            confidence   = app_state.get_active_emotion().get("confidence", 0.0),
        )
        db.add(msg)
        db.commit()
    except Exception as e:
        print(f"[LLM Route] DB save error: {e}")


# ── POST /api/llm/greet ───────────────────────────────────────
@router.post("/greet")
async def greet(db: Session = Depends(get_db)):
    """
    Called when a child profile is activated.
    Returns time-based greeting + 'How may I help you?'
    Auto-speaks on frontend.
    """
    global _conversation
    _conversation = []  # fresh conversation

    sentence = await generate_response(
        fused={}, conversation_history=[], is_greeting=True
    )

    # Add to conversation history as assistant turn
    _conversation.append({"role": "assistant", "content": sentence})

    _save_message_to_db(sentence, db)
    app_state.last_sentence = sentence

    return {
        "sentence":     sentence,
        "is_greeting":  True,
        "timestamp":    datetime.now().isoformat(),
    }


# ── POST /api/llm/respond ─────────────────────────────────────
@router.post("/respond")
async def respond(db: Session = Depends(get_db)):
    """
    Main endpoint — child has communicated via signals.
    Fuses all signals → Groq → caregiver response.
    """
    global _conversation

    if app_state.is_generating:
        return {"sentence": app_state.last_sentence, "cached": True}

    app_state.is_generating = True

    try:
        # Fuse all multimodal signals
        fused_data = fuse()

        # Build child's turn for history
        child_context_parts = []
        if fused_data["emotion"].get("confidence", 0) > 0.35:
            child_context_parts.append(
                f"Feeling {fused_data['emotion'].get('display_label','').lower()}"
            )
        if fused_data["symbols"]:
            child_context_parts.append(
                f"selected symbols: {', '.join(fused_data['symbols'])}"
            )
        if fused_data["gesture"].get("name","none") not in ("none","No hand detected"):
            child_context_parts.append(fused_data["gesture"].get("meaning",""))
        if fused_data["speech"]:
            child_context_parts.append(f'said: "{fused_data["speech"]}"')

        child_turn = " | ".join(child_context_parts) if child_context_parts else "communicating"
        _conversation.append({"role": "user", "content": child_turn})

        # Generate caregiver response
        sentence = await generate_response(
            fused=fused_data,
            conversation_history=_conversation,
            is_greeting=False,
        )

        # Add assistant response to history
        _conversation.append({"role": "assistant", "content": sentence})

        # Keep history manageable (last 10 turns)
        if len(_conversation) > 10:
            _conversation = _conversation[-10:]

        _save_message_to_db(sentence, db)
        app_state.last_sentence = sentence

        # Check for distress alert
        alert = app_state.check_distress()
        if alert:
            a = Alert(
                child_id   = app_state.active_child_id,
                alert_type = alert["type"],
                message    = sentence,
                emotion    = alert["emotion"],
                gesture    = alert["gesture"],
            )
            db.add(a)
            db.commit()
            app_state.pending_alerts.append({
                "id":      a.id,
                "type":    a.alert_type,
                "message": sentence,
                "emotion": alert["emotion"],
            })

        return {
            "sentence":     sentence,
            "alert":        alert,
            "fused":        fused_data,
            "turn_count":   len(_conversation),
            "timestamp":    datetime.now().isoformat(),
        }

    finally:
        app_state.is_generating = False


# ── GET /api/llm/history ──────────────────────────────────────
@router.get("/history")
async def get_history():
    """Return full conversation history for this session."""
    return {
        "history":     _conversation,
        "turn_count":  len(_conversation),
        "session_id":  app_state.active_session_id,
    }


# ── POST /api/llm/reset ───────────────────────────────────────
@router.post("/reset")
async def reset_conversation():
    """Reset conversation — called when starting new interaction."""
    global _conversation
    _conversation = []
    app_state.reset_emotion_lock()
    app_state.symbols.clear()
    app_state.speech_text = ""
    app_state.last_sentence = ""
    return {"message": "Conversation reset", "history": []}


# ── POST /api/llm/reset-emotion ───────────────────────────────
@router.post("/reset-emotion")
async def reset_emotion():
    """Reset emotion lock for next interaction."""
    app_state.reset_emotion_lock()
    return {"message": "Emotion lock reset", "locked": False}


# ── POST /api/llm/generate (backward compat) ─────────────────
@router.post("/generate")
async def generate(db: Session = Depends(get_db)):
    """Backward compatible endpoint — same as /respond."""
    return await respond(db)
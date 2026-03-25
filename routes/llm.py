"""routes/llm.py — Phi-2 sentence generation endpoint"""
import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from models.llm_model import generate_sentence_async
from utils.state      import app_state
from utils.database   import get_db, Message

router = APIRouter()

@router.post("/generate")
async def generate(db: Session = Depends(get_db)):
    if app_state.is_generating:
        return {"sentence": app_state.last_sentence, "cached": True}
    app_state.is_generating = True
    try:
        sentence = await generate_sentence_async()
    finally:
        app_state.is_generating = False

    # Auto-save to DB if session active
    if app_state.active_session_id:
        msg = Message(
            session_id   = app_state.active_session_id,
            sentence     = sentence,
            emotion      = app_state.emotion.get("label", ""),
            gesture      = app_state.gesture.get("meaning", ""),
            pose         = app_state.pose.get("meaning", ""),
            symbols_used = json.dumps([s["label"] for s in app_state.symbols]),
            speech_text  = app_state.speech_text,
            confidence   = app_state.emotion.get("confidence", 0.0),
        )
        db.add(msg); db.commit()

    # Check for distress alert
    alert = app_state.check_distress()
    if alert:
        from utils.database import Alert
        a = Alert(
            child_id   = app_state.active_child_id,
            alert_type = alert["type"],
            message    = sentence,
            emotion    = alert["emotion"],
            gesture    = alert["gesture"],
        )
        db.add(a); db.commit()
        app_state.pending_alerts.append({
            "id": a.id, "type": a.alert_type,
            "message": sentence, "emotion": alert["emotion"],
        })

    return {
        "sentence": sentence,
        "alert":    alert,
        "state":    app_state.to_dict(),
    }
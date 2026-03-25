"""routes/alerts.py — Caregiver alert panel"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from utils.database import get_db, Alert
from utils.state    import app_state

router = APIRouter()

@router.get("/")
def get_alerts(child_id: int = None, unread_only: bool = False,
               db: Session = Depends(get_db)):
    q = db.query(Alert)
    if child_id:   q = q.filter(Alert.child_id == child_id)
    if unread_only: q = q.filter(Alert.is_read == False)
    alerts = q.order_by(Alert.timestamp.desc()).limit(50).all()
    return [{"id": a.id, "child_id": a.child_id, "timestamp": str(a.timestamp),
             "type": a.alert_type, "message": a.message,
             "emotion": a.emotion, "gesture": a.gesture,
             "is_read": a.is_read} for a in alerts]

@router.post("/trigger")
def trigger_alert(data: dict, db: Session = Depends(get_db)):
    alert = Alert(
        child_id   = app_state.active_child_id,
        alert_type = data.get("type", "warning"),
        message    = data.get("message", ""),
        emotion    = data.get("emotion", ""),
        gesture    = data.get("gesture", ""),
    )
    db.add(alert); db.commit(); db.refresh(alert)
    # Push to in-memory pending alerts
    app_state.pending_alerts.append({
        "id":        alert.id,
        "type":      alert.alert_type,
        "message":   alert.message,
        "emotion":   alert.emotion,
        "timestamp": str(alert.timestamp),
    })
    return {"alert_id": alert.id, "type": alert.alert_type}

@router.patch("/{alert_id}/read")
def mark_read(alert_id: int, db: Session = Depends(get_db)):
    a = db.query(Alert).filter(Alert.id == alert_id).first()
    if not a: raise HTTPException(404, "Alert not found")
    a.is_read = True; db.commit()
    app_state.pending_alerts = [x for x in app_state.pending_alerts if x["id"] != alert_id]
    return {"message": "Marked as read"}

@router.get("/pending")
def pending_alerts():
    return {"alerts": app_state.pending_alerts, "count": len(app_state.pending_alerts)}

@router.delete("/clear")
def clear_all_pending():
    app_state.pending_alerts.clear()
    return {"message": "Cleared"}
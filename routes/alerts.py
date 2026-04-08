"""
routes/alerts.py
Fixed:
- Alerts only show real distress events
- Clear all functionality
- Proper read/unread management
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from utils.database import get_db, Alert
from utils.state    import app_state

router = APIRouter()

# Alert type definitions for display
ALERT_INFO = {
    "distress": {"emoji": "🚨", "label": "Distress Detected",  "color": "#E05252"},
    "warning":  {"emoji": "⚠️",  "label": "Warning Signal",    "color": "#F5A623"},
    "info":     {"emoji": "ℹ️",  "label": "Information",       "color": "#5BA4CF"},
}


@router.get("/")
def get_alerts(
    child_id:    int  = None,
    unread_only: bool = False,
    limit:       int  = 30,
    db: Session = Depends(get_db),
):
    q = db.query(Alert).order_by(Alert.timestamp.desc())
    if child_id:    q = q.filter(Alert.child_id == child_id)
    if unread_only: q = q.filter(Alert.is_read == False)
    alerts = q.limit(limit).all()

    return [
        {
            "id":         a.id,
            "child_id":   a.child_id,
            "timestamp":  str(a.timestamp),
            "type":       a.alert_type,
            "emoji":      ALERT_INFO.get(a.alert_type, ALERT_INFO["info"])["emoji"],
            "label":      ALERT_INFO.get(a.alert_type, ALERT_INFO["info"])["label"],
            "message":    a.message,
            "emotion":    a.emotion,
            "gesture":    a.gesture,
            "is_read":    a.is_read,
        }
        for a in alerts
    ]


@router.post("/trigger")
def trigger_alert(data: dict, db: Session = Depends(get_db)):
    """Manually trigger an alert (called from LLM route on distress)."""
    alert = Alert(
        child_id   = app_state.active_child_id,
        alert_type = data.get("type", "warning"),
        message    = data.get("message", ""),
        emotion    = data.get("emotion", ""),
        gesture    = data.get("gesture", ""),
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)

    payload = {
        "id":      alert.id,
        "type":    alert.alert_type,
        "emoji":   ALERT_INFO.get(alert.alert_type, ALERT_INFO["info"])["emoji"],
        "message": alert.message,
        "emotion": alert.emotion,
        "time":    datetime.now().strftime("%H:%M"),
    }
    app_state.pending_alerts.append(payload)

    print(f"[Alert] {alert.alert_type.upper()} triggered for child {app_state.active_child_id}")
    return {"alert_id": alert.id, "type": alert.alert_type}


@router.patch("/{alert_id}/read")
def mark_read(alert_id: int, db: Session = Depends(get_db)):
    a = db.query(Alert).filter(Alert.id == alert_id).first()
    if not a:
        raise HTTPException(404, "Alert not found")
    a.is_read = True
    db.commit()
    app_state.pending_alerts = [
        x for x in app_state.pending_alerts if x.get("id") != alert_id
    ]
    return {"message": "Marked as read"}


@router.patch("/read-all")
def mark_all_read(db: Session = Depends(get_db)):
    """Mark all alerts as read and clear pending."""
    db.query(Alert).filter(Alert.is_read == False).update({"is_read": True})
    db.commit()
    app_state.pending_alerts.clear()
    return {"message": "All alerts marked as read"}


@router.delete("/clear-pending")
def clear_pending():
    """Clear in-memory pending alerts (UI badge)."""
    app_state.pending_alerts.clear()
    return {"message": "Pending alerts cleared"}


@router.get("/pending")
def pending_alerts():
    return {
        "alerts": app_state.pending_alerts,
        "count":  len(app_state.pending_alerts),
    }


@router.get("/stats")
def alert_stats(db: Session = Depends(get_db)):
    """Stats for dashboard."""
    total    = db.query(Alert).count()
    unread   = db.query(Alert).filter(Alert.is_read == False).count()
    distress = db.query(Alert).filter(Alert.alert_type == "distress").count()
    return {"total": total, "unread": unread, "distress": distress}
"""routes/reports.py — Session PDF report generation"""
import json, os
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session as DBSession

from utils.database import get_db, Session, ChildProfile, Alert
from models.pdf_report import generate_report
from utils.config import config

router = APIRouter()

@router.post("/generate/{session_id}")
def generate_session_report(session_id: int, db: DBSession = Depends(get_db)):
    sess = db.query(Session).filter(Session.id == session_id).first()
    if not sess: raise HTTPException(404, "Session not found")

    child = db.query(ChildProfile).filter(ChildProfile.id == sess.child_id).first()
    child_name = child.name if child else "Unknown"

    # Build message list
    messages = [
        {"timestamp":  m.timestamp,
         "sentence":   m.sentence,
         "emotion":    m.emotion,
         "gesture":    m.gesture,
         "pose":       m.pose,
         "symbols":    json.loads(m.symbols_used or "[]")}
        for m in sess.messages
    ]

    # Duration
    duration = "In progress"
    if sess.ended_at:
        delta   = sess.ended_at - sess.started_at
        minutes = int(delta.total_seconds() // 60)
        seconds = int(delta.total_seconds() % 60)
        duration = f"{minutes}m {seconds}s"

    # Alert count
    alert_count = db.query(Alert).filter(Alert.child_id == sess.child_id).count()

    session_data = {
        "date":          sess.started_at.strftime("%d %B %Y"),
        "time":          sess.started_at.strftime("%I:%M %p"),
        "duration":      duration,
        "symbols_count": sum(len(json.loads(m.get("symbols", "[]") if isinstance(m.get("symbols"), str) else "[]"))
                            for m in messages),
    }

    pdf_path = generate_report(child_name, session_data, messages, alert_count)
    return {"pdf_path": pdf_path, "filename": os.path.basename(pdf_path)}

@router.get("/download/{filename}")
def download_report(filename: str):
    path = os.path.join(config.REPORTS_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(404, "Report not found")
    return FileResponse(path, media_type="application/pdf",
                        filename=filename, headers={"Content-Disposition": f"attachment; filename={filename}"})

@router.get("/list")
def list_reports():
    files = []
    if os.path.exists(config.REPORTS_DIR):
        for f in sorted(os.listdir(config.REPORTS_DIR), reverse=True):
            if f.endswith(".pdf"):
                full = os.path.join(config.REPORTS_DIR, f)
                files.append({"filename": f, "size_kb": round(os.path.getsize(full)/1024, 1),
                               "created": datetime.fromtimestamp(os.path.getctime(full)).strftime("%d %b %Y %H:%M")})
    return {"reports": files}
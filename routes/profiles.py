"""routes/profiles.py — Child profiles, sessions, messages CRUD"""
import json, os, shutil
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel

from utils.database import get_db, ChildProfile, Session as DBSession, Message, Alert
from utils.state    import app_state
from utils.config   import config

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────
class ProfileCreate(BaseModel):
    name:  str
    age:   Optional[int] = None
    notes: Optional[str] = ""

class ProfileUpdate(BaseModel):
    name:  Optional[str] = None
    age:   Optional[int] = None
    notes: Optional[str] = None


# ── Profiles ──────────────────────────────────────────────────
@router.get("/")
def list_profiles(db: Session = Depends(get_db)):
    profiles = db.query(ChildProfile).order_by(ChildProfile.created_at.desc()).all()
    return [{"id": p.id, "name": p.name, "age": p.age,
             "notes": p.notes, "photo_path": p.photo_path,
             "session_count": len(p.sessions)} for p in profiles]

@router.post("/")
def create_profile(data: ProfileCreate, db: Session = Depends(get_db)):
    profile = ChildProfile(name=data.name, age=data.age, notes=data.notes)
    db.add(profile); db.commit(); db.refresh(profile)
    return {"id": profile.id, "name": profile.name, "message": "Profile created"}

@router.get("/{profile_id}")
def get_profile(profile_id: int, db: Session = Depends(get_db)):
    p = db.query(ChildProfile).filter(ChildProfile.id == profile_id).first()
    if not p: raise HTTPException(404, "Profile not found")
    return {"id": p.id, "name": p.name, "age": p.age, "notes": p.notes,
            "photo_path": p.photo_path, "preferred_symbols": json.loads(p.preferred_symbols or "[]"),
            "sessions": [{"id": s.id, "started_at": str(s.started_at),
                          "message_count": len(s.messages)} for s in p.sessions[-10:]]}

@router.put("/{profile_id}")
def update_profile(profile_id: int, data: ProfileUpdate, db: Session = Depends(get_db)):
    p = db.query(ChildProfile).filter(ChildProfile.id == profile_id).first()
    if not p: raise HTTPException(404, "Profile not found")
    if data.name  is not None: p.name  = data.name
    if data.age   is not None: p.age   = data.age
    if data.notes is not None: p.notes = data.notes
    db.commit()
    return {"message": "Updated"}

@router.delete("/{profile_id}")
def delete_profile(profile_id: int, db: Session = Depends(get_db)):
    p = db.query(ChildProfile).filter(ChildProfile.id == profile_id).first()
    if not p: raise HTTPException(404, "Profile not found")
    db.delete(p); db.commit()
    return {"message": "Deleted"}

@router.post("/{profile_id}/photo")
async def upload_photo(profile_id: int, file: UploadFile = File(...),
                       db: Session = Depends(get_db)):
    p = db.query(ChildProfile).filter(ChildProfile.id == profile_id).first()
    if not p: raise HTTPException(404, "Profile not found")
    ext  = os.path.splitext(file.filename)[1]
    path = os.path.join(config.UPLOAD_DIR, f"profile_{profile_id}{ext}")
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    p.photo_path = "/" + path
    db.commit()
    return {"photo_path": p.photo_path}


# ── Active profile selection ──────────────────────────────────
@router.post("/{profile_id}/activate")
def activate_profile(profile_id: int, db: Session = Depends(get_db)):
    p = db.query(ChildProfile).filter(ChildProfile.id == profile_id).first()
    if not p: raise HTTPException(404, "Profile not found")
    app_state.active_child_id   = p.id
    app_state.active_child_name = p.name
    # Start new session
    sess = DBSession(child_id=p.id)
    db.add(sess); db.commit(); db.refresh(sess)
    app_state.active_session_id = sess.id
    return {"message": f"Activated: {p.name}", "session_id": sess.id}


# ── Sessions & Messages ───────────────────────────────────────
@router.post("/sessions/{session_id}/end")
def end_session(session_id: int, db: Session = Depends(get_db)):
    sess = db.query(DBSession).filter(DBSession.id == session_id).first()
    if not sess: raise HTTPException(404, "Session not found")
    sess.ended_at = datetime.utcnow()
    db.commit()
    app_state.active_session_id = None
    return {"message": "Session ended", "ended_at": str(sess.ended_at)}

@router.post("/sessions/{session_id}/message")
def save_message(session_id: int, data: dict, db: Session = Depends(get_db)):
    msg = Message(
        session_id   = session_id,
        sentence     = data.get("sentence", ""),
        emotion      = data.get("emotion", "neutral"),
        gesture      = data.get("gesture", ""),
        pose         = data.get("pose", ""),
        symbols_used = json.dumps(data.get("symbols", [])),
        speech_text  = data.get("speech", ""),
        confidence   = data.get("confidence", 0.0),
    )
    db.add(msg); db.commit()
    return {"message_id": msg.id}

@router.get("/sessions/{session_id}/messages")
def get_messages(session_id: int, db: Session = Depends(get_db)):
    msgs = db.query(Message).filter(Message.session_id == session_id).all()
    return [{"id": m.id, "timestamp": str(m.timestamp), "sentence": m.sentence,
             "emotion": m.emotion, "gesture": m.gesture, "pose": m.pose,
             "symbols": json.loads(m.symbols_used or "[]")} for m in msgs]
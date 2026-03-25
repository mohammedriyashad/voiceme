"""routes/speech.py"""
from fastapi import APIRouter
from pydantic import BaseModel
from utils.state import app_state

router = APIRouter()

class SpeechPayload(BaseModel):
    text: str

@router.post("/update")
async def update(p: SpeechPayload):
    app_state.speech_text = p.text
    return {"speech_text": app_state.speech_text}

@router.delete("/clear")
async def clear():
    app_state.speech_text = ""
    return {"status": "cleared"}

@router.get("/current")
async def current():
    return {"speech_text": app_state.speech_text}
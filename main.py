"""
main.py — VoiceMe AAC Advanced System
FastAPI application entry point.
Run: python main.py
"""

import uvicorn
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from utils.database import init_db
from utils.config   import config

from routes import camera, llm, speech, symbols, profiles, alerts, reports

# ── Init DB ───────────────────────────────────────────────────
init_db()

# ── App ───────────────────────────────────────────────────────
app = FastAPI(
    title       = "VoiceMe AAC — Advanced System",
    description = "AI-Driven Assistive Communication for Non-Verbal Autistic Individuals",
    version     = "2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins  = ["*"],
    allow_methods  = ["*"],
    allow_headers  = ["*"],
)

# ── Static + Templates ────────────────────────────────────────
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# ── Routes ────────────────────────────────────────────────────
app.include_router(camera.router,   prefix="/api/camera",   tags=["Camera"])
app.include_router(llm.router,      prefix="/api/llm",      tags=["LLM"])
app.include_router(speech.router,   prefix="/api/speech",   tags=["Speech"])
app.include_router(symbols.router,  prefix="/api/symbols",  tags=["Symbols"])
app.include_router(profiles.router, prefix="/api/profiles", tags=["Profiles"])
app.include_router(alerts.router,   prefix="/api/alerts",   tags=["Alerts"])
app.include_router(reports.router,  prefix="/api/reports",  tags=["Reports"])

# ── Pages ─────────────────────────────────────────────────────
@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/health")
async def health():
    return {
        "status"  : "ok",
        "version" : "2.0.0",
        "features": ["Phi-2 LLM", "DeepFace Emotion", "MediaPipe Gesture+Pose",
                     "Child Profiles", "Caregiver Alerts", "PDF Reports", "Custom Symbols"],
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host=config.HOST, port=config.PORT, reload=False)
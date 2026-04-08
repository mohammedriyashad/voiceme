"""utils/config.py — Central configuration"""
import os
from dotenv import load_dotenv
load_dotenv()

class Config:
    # Groq LLM
    GROQ_API_KEY  = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL    = os.getenv("GROQ_MODEL", "llama3-8b-8192")

    # Server
    HOST          = os.getenv("HOST", "0.0.0.0")
    PORT          = int(os.getenv("PORT", 8000))
    DEBUG         = os.getenv("DEBUG", "True").lower() == "true"
    SECRET_KEY    = os.getenv("SECRET_KEY", "voiceme-secret")

    # Camera
    CAMERA_INDEX  = int(os.getenv("CAMERA_INDEX", 0))
    CAMERA_WIDTH  = int(os.getenv("CAMERA_WIDTH", 640))
    CAMERA_HEIGHT = int(os.getenv("CAMERA_HEIGHT", 480))

    # Models
    EMOTION_THRESHOLD = float(os.getenv("EMOTION_THRESHOLD", 0.40))
    GESTURE_THRESHOLD = float(os.getenv("GESTURE_THRESHOLD", 0.65))

    # Paths
    UPLOAD_DIR    = os.getenv("UPLOAD_DIR", "static/uploads")
    REPORTS_DIR   = os.getenv("REPORTS_DIR", "reports")
    DB_PATH       = os.getenv("DB_PATH", "aac_system.db")

    # ARASAAC
    ARASAAC_API_URL = os.getenv("ARASAAC_API_URL", "https://api.arasaac.org/v1")
    ARASAAC_LANG    = os.getenv("ARASAAC_LANG", "en")

    @classmethod
    def init_dirs(cls):
        for d in [cls.UPLOAD_DIR, cls.REPORTS_DIR, "static/css", "static/js", "datasets"]:
            os.makedirs(d, exist_ok=True)

config = Config()
config.init_dirs()
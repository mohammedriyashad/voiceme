"""utils/config.py — Central configuration loaded from .env"""
import os
from dotenv import load_dotenv
load_dotenv()

class Config:
    HOST              = os.getenv("HOST", "0.0.0.0")
    PORT              = int(os.getenv("PORT", 8000))
    DEBUG             = os.getenv("DEBUG", "True").lower() == "true"
    SECRET_KEY        = os.getenv("SECRET_KEY", "change-me-please-use-random-string")

    CAMERA_INDEX      = int(os.getenv("CAMERA_INDEX", 0))
    CAMERA_WIDTH      = int(os.getenv("CAMERA_WIDTH", 640))
    CAMERA_HEIGHT     = int(os.getenv("CAMERA_HEIGHT", 480))

    EMOTION_THRESHOLD = float(os.getenv("EMOTION_THRESHOLD", 0.45))
    GESTURE_THRESHOLD = float(os.getenv("GESTURE_THRESHOLD", 0.65))

    PHI2_MAX_TOKENS   = int(os.getenv("PHI2_MAX_NEW_TOKENS", 80))
    PHI2_TEMPERATURE  = float(os.getenv("PHI2_TEMPERATURE", 0.7))

    UPLOAD_DIR        = os.getenv("UPLOAD_DIR", "static/uploads")
    REPORTS_DIR       = os.getenv("REPORTS_DIR", "reports")
    PROFILES_DIR      = os.getenv("PROFILES_DIR", "profiles")
    DB_PATH           = os.getenv("DB_PATH", "aac_system.db")

    ARASAAC_API_URL   = os.getenv("ARASAAC_API_URL", "https://api.arasaac.org/v1")
    ARASAAC_LANG      = os.getenv("ARASAAC_LANG", "en")

    # Ensure directories exist
    @classmethod
    def init_dirs(cls):
        for d in [cls.UPLOAD_DIR, cls.REPORTS_DIR, cls.PROFILES_DIR,
                  "static/css", "static/js", "datasets", "evaluation"]:
            os.makedirs(d, exist_ok=True)

config = Config()
config.init_dirs()
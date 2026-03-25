"""routes/camera.py — WebSocket: runs emotion + gesture + pose, streams results"""
import cv2, base64, asyncio
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from models.emotion_model import emotion_detector
from models.gesture_model import gesture_detector
from models.pose_model    import pose_detector
from utils.state          import app_state

router = APIRouter()

def _decode(b64: str) -> np.ndarray:
    _, enc = (b64.split(",", 1) if "," in b64 else ("", b64))
    arr = np.frombuffer(base64.b64decode(enc), dtype=np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)

def _encode(frame: np.ndarray, q: int = 72) -> str:
    _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, q])
    return "data:image/jpeg;base64," + base64.b64encode(buf).decode()

def _run_models(frame: np.ndarray):
    annotated, ges  = gesture_detector.process(frame.copy())
    annotated, pose = pose_detector.process(annotated)
    emo             = emotion_detector.analyse(frame.copy())
    annotated       = emotion_detector.draw(annotated, emo)
    app_state.emotion = emo
    app_state.gesture = ges
    app_state.pose    = pose
    alert = app_state.check_distress()
    return annotated, emo, ges, pose, alert

@router.websocket("/ws")
async def camera_ws(websocket: WebSocket):
    await websocket.accept()
    app_state.camera_active = True
    loop = asyncio.get_event_loop()
    try:
        while True:
            data  = await websocket.receive_json()
            frame = _decode(data.get("frame", ""))
            if frame is None:
                continue
            app_state.current_frame = frame
            annotated, emo, ges, pose, alert = await loop.run_in_executor(
                None, _run_models, frame
            )
            payload = {
                "annotated_frame": _encode(annotated),
                "emotion":  emo,
                "gesture":  ges,
                "pose":     {"name": pose["name"], "icon": pose["icon"], "meaning": pose["meaning"]},
                "alert":    alert,
                "state":    app_state.to_dict(),
            }
            await websocket.send_json(payload)
    except WebSocketDisconnect:
        pass
    finally:
        app_state.camera_active = False
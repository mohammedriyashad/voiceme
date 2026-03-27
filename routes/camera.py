"""
routes/camera.py
WebSocket: receives browser frames → runs emotion + gesture + pose → sends back results
"""
import cv2, base64, asyncio, time
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from models.emotion_model import emotion_detector
from models.gesture_model import gesture_detector
from models.pose_model    import pose_detector
from utils.state          import app_state

router = APIRouter()

# Track time for emotion (run every 600ms to avoid lag)
_last_emotion_time = 0.0
_emotion_interval  = 0.6   # seconds

def _decode(b64: str) -> np.ndarray:
    """Decode base64 JPEG string → BGR numpy array"""
    try:
        if ',' in b64:
            b64 = b64.split(',', 1)[1]
        arr = np.frombuffer(base64.b64decode(b64), dtype=np.uint8)
        frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        return frame
    except Exception as e:
        print(f'[Camera] Decode error: {e}')
        return None

def _encode(frame: np.ndarray, quality: int = 75) -> str:
    """Encode BGR numpy array → base64 JPEG string"""
    _, buf = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, quality])
    return 'data:image/jpeg;base64,' + base64.b64encode(buf).decode()

def _run_models(frame: np.ndarray, run_emotion: bool = True):
    """Run all CV models on one frame (runs in thread pool)"""
    global _last_emotion_time

    # ── 1. Gesture detection (fast ~5ms) ────────────────────
    annotated, ges = gesture_detector.process(frame.copy())

    # ── 2. Pose detection (draws on annotated frame) ────────
    annotated, pose = pose_detector.process(annotated)

    # ── 3. Emotion detection (slower ~100ms, rate limited) ──
    emo = None
    now = time.time()
    if run_emotion and (now - _last_emotion_time) >= _emotion_interval:
        emo = emotion_detector.analyse(frame.copy())
        _last_emotion_time = now
        if emo and not emo.get('error'):
            # Draw emotion label on frame
            annotated = emotion_detector.draw(annotated, emo)
            # Update global state
            app_state.emotion = emo

    # Update gesture and pose state
    if ges:
        app_state.gesture = ges
    if pose:
        app_state.pose = pose

    # Check for distress
    alert = app_state.check_distress()

    return annotated, emo, ges, pose, alert


@router.websocket('/ws')
async def camera_ws(websocket: WebSocket):
    await websocket.accept()
    app_state.camera_active = True
    loop    = asyncio.get_event_loop()
    frame_n = 0

    print('[Camera WS] Client connected')

    try:
        while True:
            # Receive frame from browser
            try:
                data = await asyncio.wait_for(websocket.receive_json(), timeout=5.0)
            except asyncio.TimeoutError:
                continue

            b64 = data.get('frame', '')
            if not b64:
                continue

            # Decode frame
            frame = _decode(b64)
            if frame is None:
                continue

            frame_n += 1
            app_state.current_frame = frame

            # Run emotion every 5th frame to reduce CPU load
            run_emotion = (frame_n % 5 == 0)

            # Run all models in thread pool (non-blocking)
            annotated, emo, ges, pose, alert = await loop.run_in_executor(
                None, _run_models, frame, run_emotion
            )

            # Encode annotated frame
            annotated_b64 = _encode(annotated, quality=70)

            # Build response
            response = {
                'annotated_frame': annotated_b64,
                'gesture': {
                    'name':       ges.get('name', 'none'),
                    'icon':       ges.get('icon', '✋'),
                    'meaning':    ges.get('meaning', 'No hand detected'),
                    'confidence': ges.get('confidence', 0.0),
                },
                'pose': {
                    'name':    pose.get('name', 'normal'),
                    'icon':    pose.get('icon', '🧍'),
                    'meaning': pose.get('meaning', 'Normal posture'),
                },
                'alert': alert,
                'frame_n': frame_n,
            }

            # Add emotion only when freshly computed
            if emo and not emo.get('error'):
                response['emotion'] = {
                    'label':          emo.get('label', 'neutral'),
                    'display_label':  emo.get('display_label', 'Neutral'),
                    'emoji':          emo.get('emoji', '😐'),
                    'confidence':     emo.get('confidence', 0.0),
                    'confidence_pct': emo.get('confidence_pct', 0.0),
                    'all_scores':     emo.get('all_scores', {}),
                }

            await websocket.send_json(response)

    except WebSocketDisconnect:
        print('[Camera WS] Client disconnected')
    except Exception as e:
        print(f'[Camera WS] Error: {e}')
    finally:
        app_state.camera_active = False
        app_state.current_frame = None
        print('[Camera WS] Connection closed')

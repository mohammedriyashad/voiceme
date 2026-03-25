"""
datasets/train_gesture_model.py
Phase 3 — Collect webcam samples + train gesture classifier.

Usage:
  python datasets/train_gesture_model.py --collect
  python datasets/train_gesture_model.py --train
  python datasets/train_gesture_model.py --test
"""
import os, sys, argparse, pickle
import cv2
import numpy as np
import mediapipe as mp
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
from sklearn.preprocessing import LabelEncoder

CLASSES        = ["thumbs_up","thumbs_down","open_hand","fist","pointing_up","peace","call_me","rock_on"]
SAMPLES        = 200
DATA_FILE      = "datasets/gesture_data.npy"
LABEL_FILE     = "datasets/gesture_labels.npy"
MODEL_FILE     = "models/gesture_classifier.pkl"
mp_hands       = mp.solutions.hands
mp_drawing     = mp.solutions.drawing_utils


def collect():
    os.makedirs("datasets", exist_ok=True)
    all_data   = list(np.load(DATA_FILE,  allow_pickle=True)) if os.path.exists(DATA_FILE)  else []
    all_labels = list(np.load(LABEL_FILE, allow_pickle=True)) if os.path.exists(LABEL_FILE) else []
    print(f"Existing samples: {len(all_data)}")

    cap   = cv2.VideoCapture(0)
    hands = mp_hands.Hands(static_image_mode=False, max_num_hands=1,
                           min_detection_confidence=0.7)

    for gesture in CLASSES:
        print(f"\n{'='*50}\n  Gesture: {gesture.upper()}\n  Press SPACE to start\n{'='*50}")
        while True:
            ret, frame = cap.read()
            frame = cv2.flip(frame, 1)
            cv2.putText(frame, f"NEXT: {gesture}", (20,40),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0,255,255), 2)
            cv2.putText(frame, "Press SPACE to start collecting", (20,80),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255,255,0), 2)
            cv2.imshow("AAC — Gesture Collection", frame)
            if cv2.waitKey(1) & 0xFF == ord(' '): break

        count = 0
        while count < SAMPLES:
            ret, frame = cap.read()
            if not ret: continue
            frame  = cv2.flip(frame, 1)
            rgb    = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            result = hands.process(rgb)
            if result.multi_hand_landmarks:
                lm = result.multi_hand_landmarks[0]
                mp_drawing.draw_landmarks(frame, lm, mp_hands.HAND_CONNECTIONS)
                features = [v for pt in lm.landmark for v in (pt.x, pt.y, pt.z)]
                all_data.append(features)
                all_labels.append(gesture)
                count += 1
                cv2.putText(frame, f"{gesture}: {count}/{SAMPLES}",
                            (20,40), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0,255,0), 2)
            cv2.imshow("AAC — Gesture Collection", frame)
            if cv2.waitKey(1) & 0xFF == ord('q'): break
        print(f"  Collected {count} samples for {gesture}")

    cap.release(); cv2.destroyAllWindows(); hands.close()
    np.save(DATA_FILE,  np.array(all_data))
    np.save(LABEL_FILE, np.array(all_labels))
    print(f"\n[SAVED] {len(all_data)} total samples")


def train():
    if not os.path.exists(DATA_FILE):
        print("[ERROR] No data. Run --collect first."); sys.exit(1)
    X  = np.load(DATA_FILE,  allow_pickle=True)
    y  = np.load(LABEL_FILE, allow_pickle=True)
    print(f"[INFO] {len(X)} samples, {len(set(y))} classes")
    le = LabelEncoder()
    ye = le.fit_transform(y)
    X_tr, X_te, y_tr, y_te = train_test_split(X, ye, test_size=0.2,
                                               random_state=42, stratify=ye)
    print("[INFO] Training RandomForest …")
    clf = RandomForestClassifier(n_estimators=300, max_depth=20,
                                  random_state=42, n_jobs=-1)
    clf.fit(X_tr, y_tr)
    y_pred = clf.predict(X_te)
    print("\n── Classification Report ──")
    print(classification_report(y_te, y_pred, target_names=le.classes_))
    print(f"Accuracy: {accuracy_score(y_te, y_pred)*100:.1f}%")
    os.makedirs("models", exist_ok=True)
    with open(MODEL_FILE, "wb") as f:
        pickle.dump({"model": clf, "encoder": le}, f)
    print(f"[SAVED] {MODEL_FILE}")


def test():
    if not os.path.exists(MODEL_FILE):
        print("[ERROR] No model. Run --train first."); sys.exit(1)
    with open(MODEL_FILE, "rb") as f:
        data = pickle.load(f)
    clf, le = data["model"], data["encoder"]
    cap     = cv2.VideoCapture(0)
    hands   = mp_hands.Hands(static_image_mode=False, max_num_hands=1,
                              min_detection_confidence=0.7)
    print("Press Q to quit")
    while True:
        ret, frame = cap.read()
        if not ret: break
        frame  = cv2.flip(frame, 1)
        rgb    = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = hands.process(rgb)
        if result.multi_hand_landmarks:
            lm       = result.multi_hand_landmarks[0]
            mp_drawing.draw_landmarks(frame, lm, mp_hands.HAND_CONNECTIONS)
            features = [v for pt in lm.landmark for v in (pt.x, pt.y, pt.z)]
            proba    = clf.predict_proba([features])[0]
            idx      = proba.argmax()
            label    = le.classes_[idx]
            conf     = proba[idx]
            cv2.putText(frame, f"{label} ({int(conf*100)}%)",
                        (20,50), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0,255,100), 2)
        cv2.imshow("AAC — Gesture Test", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'): break
    cap.release(); cv2.destroyAllWindows()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--collect", action="store_true")
    parser.add_argument("--train",   action="store_true")
    parser.add_argument("--test",    action="store_true")
    args = parser.parse_args()
    if args.collect: collect()
    elif args.train: train()
    elif args.test:  test()
    else:
        print("Usage:\n  --collect\n  --train\n  --test")
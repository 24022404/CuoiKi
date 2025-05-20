import cv2
import os
from deepface import DeepFace
    
def enhance_frame(frame, alpha=1.3, beta=10):
    return cv2.convertScaleAbs(frame, alpha=alpha, beta=beta)

def preprocess_frame(frame):
    small = cv2.resize(frame, (0, 0), fx=0.5, fy=0.5)
    rgb_small = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)
    return rgb_small

def analyze_faces(rgb_frame, detector='mtcnn'):
    from time import time
    start = time()
    results = DeepFace.analyze(
        img_path=rgb_frame,
        actions=['age', 'gender'],
        enforce_detection=False,
        detector_backend=detector,
    )
    print(f"Số khuôn mặt detect được: {len(results)}")
    for i, result in enumerate(results):
        print(f"[{i}] gender: {result['gender']}, age: {result['age']}, box: {result['region']}")
    print(f"DeepFace.analyze took {time() - start:.2f}s")
    if isinstance(results, dict):
        return [results]
    return results

def classify_gender(face):
    gender_data = face.get("gender", {})
    region = face.get("region", {})
    age = face.get("age", 0)

    gender = "Unknown"
    confidence = 0

    if isinstance(gender_data, dict):
        if "Woman" in gender_data and "Man" in gender_data:
            if gender_data["Woman"] > gender_data["Man"]:
                gender, confidence = "Woman", gender_data["Woman"]
            else:
                gender, confidence = "Man", gender_data["Man"]

            if confidence <= 60:
                w, h = region.get("w", 0), region.get("h", 1)
                ratio = w / h if h != 0 else 0
                if ratio > 0.85:
                    gender = "Man"
                else:
                    gender = "Woman"
    elif isinstance(gender_data, str):
        gender = gender_data
    else:
        if 30 <= age <= 60:
            gender = "Man"
        else:
            gender = "Woman"

    return gender, confidence

def get_age_group(age):
    if age < 18:
        return "young"
    elif age < 35:
        return "adult"
    elif age < 60:
        return "middle_aged"
    else:
        return "elderly"

def draw_face_overlay(frame, face, gender, age, region, confidence):
    x, y, w, h = map(int, [region.get(k, 0) for k in ('x', 'y', 'w', 'h')])
    x, y, w, h = x * 2, y * 2, w * 2, h * 2
    color = (255, 0, 0) if gender == "Man" else (0, 255, 0)
    label = f"{gender} ({confidence:.0f}%)" if confidence else gender

    cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)
    cv2.rectangle(frame, (x, y - 40), (x + len(label) * 12, y - 10), (0, 0, 0), -1)
    cv2.putText(frame, f"{label}, {age}", (x, y - 15),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

def extract_face_crop(frame, region):
    x, y, w, h = map(int, [region.get(k, 0) for k in ('x', 'y', 'w', 'h')])
    x, y, w, h = x * 2, y * 2, w * 2, h * 2
    return frame[y:y + h, x:x + w]

def draw_summary_overlay(frame, stats, detector):
    cv2.putText(frame,
                f"Total: {stats['total_count']} | Male: {stats['male_count']} | Female: {stats['female_count']}",
                (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
    age_text = (f"Young: {stats['age_groups']['young']} | Adult: {stats['age_groups']['adult']} | "
                f"Middle: {stats['age_groups']['middle_aged']} | Elderly: {stats['age_groups']['elderly']}")
    cv2.putText(frame, age_text, (10, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
    cv2.putText(frame, f"Detector: {detector}",
                (10, frame.shape[0] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

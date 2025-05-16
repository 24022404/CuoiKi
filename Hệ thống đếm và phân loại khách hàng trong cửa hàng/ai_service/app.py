from flask import Flask, request, jsonify
from deepface import DeepFace
import cv2
import numpy as np
import base64

app = Flask(__name__)


def get_age_group(age):
    if age <= 20:
        return "young"
    elif age <= 40:
        return "adult"
    elif age <= 60:
        return "middle_aged"
    else:
        return "elderly"


@app.route("/analyze", methods=["POST"])
def analyze_image():
    try:
        image_data = request.json.get('image')
        if not image_data:
            return jsonify({"error": "No image data provided"}), 400

        # Extract base64 string (remove header if present)
        if image_data.startswith("data:image"):
            image_data = image_data.split(",")[1]

        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        result = DeepFace.analyze(
            img_path=img,
            actions=['age', 'gender'],
            enforce_detection=False
        )

        # If result is a single dict, convert to list
        if isinstance(result, dict):
            result = [result]

        analysis = {
            "total_count": len(result),
            "male_count": 0,
            "female_count": 0,
            "age_groups": {
                "young": 0,
                "adult": 0,
                "middle_aged": 0,
                "elderly": 0
            },
            "timestamp": request.json.get('timestamp')  # optional from client
        }

        for face in result:
            gender = face.get("gender", {}).get("dominant")
            age = face.get("age", 0)

            if gender == "Man":
                analysis["male_count"] += 1
            elif gender == "Woman":
                analysis["female_count"] += 1

            group = get_age_group(age)
            analysis["age_groups"][group] += 1

        return jsonify(analysis)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)

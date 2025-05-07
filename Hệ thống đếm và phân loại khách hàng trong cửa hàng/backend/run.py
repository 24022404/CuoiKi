import os
import sys
from app import app

if __name__ == "__main__":
    print("Starting Customer Analytics Backend...")
    print("Open your browser to http://localhost:5000 to view the API")
    print("To view the frontend, open frontend/index.html in your browser")
    app.run(host='0.0.0.0', port=5000, debug=True)

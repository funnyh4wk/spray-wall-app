from fastapi import FastAPI, File, UploadFile, Request
from fastapi.staticfiles import StaticFiles
import uvicorn
import os
import urllib.request
import urllib.parse
import json
import base64
import time
import hashlib

app = FastAPI()

# Твои доступы (я всё перенес)
FIREBASE_URL = "https://spray-wall-v2-default-rtdb.europe-west1.firebasedatabase.app/"
CLOUDINARY_CLOUD_NAME = "hz7ii1gc"
CLOUDINARY_API_KEY = "228359521481238"
CLOUDINARY_API_SECRET = "MvS2MySwEvuQRN3n-qG6bKdK-Bg"

# Защита папки
if not os.path.exists("static"):
    os.makedirs("static")

# ==========================================
# 1. МОСТ ДЛЯ БАЗЫ ДАННЫХ FIREBASE
# ==========================================
@app.post("/api/db/get")
async def get_db(request: Request):
    data = await request.json()
    path = data.get("path")
    url = f"{FIREBASE_URL}{path}.json"
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception:
        return None

@app.post("/api/db/save")
async def save_db(request: Request):
    data = await request.json()
    path = data.get("path")
    method = data.get("method", "PUT")
    payload = data.get("payload")
    url = f"{FIREBASE_URL}{path}.json"
    try:
        if payload is not None:
            encoded_data = json.dumps(payload).encode('utf-8')
            req = urllib.request.Request(url, data=encoded_data, method=method)
        else:
            req = urllib.request.Request(url, method=method)
        with urllib.request.urlopen(req) as response:
            return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ==========================================
# 2. МОСТ ДЛЯ ФОТОК В CLOUDINARY
# ==========================================
@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        encoded_string = base64.b64encode(contents).decode("utf-8")
        
        timestamp = str(int(time.time()))
        string_to_sign = f"timestamp={timestamp}{CLOUDINARY_API_SECRET}"
        signature = hashlib.sha1(string_to_sign.encode()).hexdigest()

        url = f"https://api.cloudinary.com/v1_1/{CLOUDINARY_CLOUD_NAME}/image/upload"
        data = urllib.parse.urlencode({
            "file": "data:image/jpeg;base64," + encoded_string,
            "api_key": CLOUDINARY_API_KEY,
            "timestamp": timestamp,
            "signature": signature
        }).encode("utf-8")

        req = urllib.request.Request(url, data=data, method="POST")
        with urllib.request.urlopen(req) as response:
            res = json.loads(response.read().decode("utf-8"))
            return {"status": "ok", "url": res["secure_url"]}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/delete_image")
async def delete_image(request: Request):
    data = await request.json()
    image_url = data.get("url")
    if not image_url or "cloudinary.com" not in image_url: return {"status": "ignored"}
    try:
        public_id = image_url.split('/')[-1].rsplit('.', 1)[0]
        timestamp = str(int(time.time()))
        string_to_sign = f"public_id={public_id}&timestamp={timestamp}{CLOUDINARY_API_SECRET}"
        signature = hashlib.sha1(string_to_sign.encode()).hexdigest()
        
        url = f"https://api.cloudinary.com/v1_1/{CLOUDINARY_CLOUD_NAME}/image/destroy"
        payload = urllib.parse.urlencode({"public_id": public_id, "api_key": CLOUDINARY_API_KEY, "timestamp": timestamp, "signature": signature}).encode("utf-8")
        req = urllib.request.Request(url, data=payload, method="POST")
        with urllib.request.urlopen(req) as response:
            return {"status": "deleted"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ==========================================
# 3. РАЗДАЧА ИНТЕРФЕЙСА (Должно быть в самом конце!)
# ==========================================
app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
import os
import time
import shutil
import requests
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Any, Optional

import firebase_admin
from firebase_admin import auth as firebase_auth

if not firebase_admin._apps:
    firebase_admin.initialize_app(options={'projectId': 'spray-wall-v2'})

app = FastAPI()
security = HTTPBearer()

# 🔥 ТВОЙ ВЕЧНЫЙ FIREBASE (Данные больше никогда не удалятся)
DB_URL = "https://spray-wall-v2-default-rtdb.europe-west1.firebasedatabase.app"

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        # Проверяем токен и передаем его дальше
        firebase_auth.verify_id_token(token)
        return token 
    except Exception as e:
        raise HTTPException(status_code=401, detail="Hacker!")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs("static", exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
app.mount("/", StaticFiles(directory="static", html=True), name="static")

class DBRequest(BaseModel):
    path: str
    payload: Optional[Any] = None
    method: Optional[str] = "PUT"

@app.post("/api/db/save")
def db_save(req: DBRequest, token: str = Depends(verify_token)):
    url = f"{DB_URL}/{req.path}.json?auth={token}"
    if req.method == "DELETE":
        requests.delete(url)
    elif req.method == "PATCH":
        requests.patch(url, json=req.payload)
    else:
        requests.put(url, json=req.payload)
    return {"status": "ok"}

@app.post("/api/db/get")
def db_get(req: DBRequest, token: str = Depends(verify_token)):
    url = f"{DB_URL}/{req.path}.json?auth={token}"
    resp = requests.get(url)
    if resp.status_code == 200:
        return resp.json()
    return None

@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...), token: str = Depends(verify_token)):
    ext = file.filename.split(".")[-1]
    filename = f"{int(time.time())}_{token[:10]}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"status": "ok", "url": f"/uploads/{filename}"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
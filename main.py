import os
import time
import shutil
import json
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Any, Optional

import firebase_admin
from firebase_admin import credentials, db, auth as firebase_auth

# --- 1. АБСОЛЮТНАЯ ЗАЩИТА: Читаем секретный ключ из переменных Render ---
firebase_cred_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT")

if not firebase_admin._apps:
    if firebase_cred_json:
        # Если мы на Render, берем ключ из надежного сейфа (переменных)
        cred_dict = json.loads(firebase_cred_json)
        cred = credentials.Certificate(cred_dict)
    else:
        # ЗАЩИТА ОТ ДУРАКА: Если ты запустил код на домашнем компе и забыл про ключ, 
        # Питон попытается найти файл serviceAccountKey.json рядом с main.py
        # (Никогда не заливай этот файл на GitHub!)
        cred = credentials.Certificate("serviceAccountKey.json")
        
    firebase_admin.initialize_app(cred, {
        'databaseURL': 'https://spray-wall-v2-default-rtdb.europe-west1.firebasedatabase.app',
        'projectId': 'spray-wall-v2'
    })

app = FastAPI()
security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
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
    ref = db.reference(req.path)
    try:
        if req.method == "DELETE":
            ref.delete()
        elif req.method == "PATCH":
            ref.update(req.payload)
        else:
            ref.set(req.payload)
        return {"status": "ok"}
    except Exception as e:
        print("Firebase DB Error:", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/db/get")
def db_get(req: DBRequest, token: str = Depends(verify_token)):
    ref = db.reference(req.path)
    try:
        data = ref.get()
        return data
    except Exception as e:
        print("Firebase DB Error:", str(e))
        raise HTTPException(status_code=500, detail=str(e))

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
    #test

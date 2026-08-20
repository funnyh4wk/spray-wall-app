import os
import json
import shutil
import time
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Any, Optional

import firebase_admin
from firebase_admin import auth as firebase_auth

# --- 1. НАСТРОЙКА БЕЗОПАСНОСТИ FIREBASE ---
# Говорим Питону, ключи какого проекта Гугла проверять
if not firebase_admin._apps:
    firebase_admin.initialize_app(options={'projectId': 'spray-wall-v2'})

app = FastAPI()
security = HTTPBearer()

# --- 2. ВЫШИБАЛА (СЕКЬЮРИТИ) ---
def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        # Питон проверяет криптографическую печать Гугла
        decoded_token = firebase_auth.verify_id_token(token)
        return decoded_token # Если всё ок, пускаем дальше
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Get out of here, hacker!",
            headers={"WWW-Authenticate": "Bearer"},
        )

# --- 3. НАСТРОЙКА ПАПОК И CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_FILE = "database.json"
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs("static", exist_ok=True)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
app.mount("/", StaticFiles(directory="static", html=True), name="static")

# --- Вспомогательные функции БД ---
def load_db():
    if not os.path.exists(DB_FILE): return {}
    try:
        with open(DB_FILE, "r", encoding="utf-8") as f: return json.load(f)
    except: return {}

def save_db(data):
    with open(DB_FILE, "w", encoding="utf-8") as f: json.dump(data, f, ensure_ascii=False, indent=2)

def get_by_path(d, path_list):
    for key in path_list:
        if isinstance(d, dict) and key in d: d = d[key]
        else: return None
    return d

def set_by_path(d, path_list, value):
    for key in path_list[:-1]:
        if key not in d or not isinstance(d[key], dict): d[key] = {}
        d = d[key]
    d[path_list[-1]] = value

def delete_by_path(d, path_list):
    for key in path_list[:-1]:
        if key not in d or not isinstance(d[key], dict): return
        d = d[key]
    if path_list[-1] in d: del d[path_list[-1]]

# --- 4. API ЭНДПОИНТЫ (ТЕПЕРЬ ПОД ОХРАНОЙ) ---
class DBRequest(BaseModel):
    path: str
    payload: Optional[Any] = None
    method: Optional[str] = "PUT"

# Обрати внимание на `user = Depends(verify_token)`. 
# Если запроса нет пропуска от Гугла - функция даже не запустится!

@app.post("/api/db/save")
def db_save(req: DBRequest, user = Depends(verify_token)):
    db = load_db()
    path_parts = [p for p in req.path.split("/") if p]
    
    if req.method == "DELETE":
        delete_by_path(db, path_parts)
    elif req.method == "PATCH":
        current = get_by_path(db, path_parts) or {}
        if isinstance(current, dict) and isinstance(req.payload, dict):
            current.update(req.payload)
            set_by_path(db, path_parts, current)
        else:
            set_by_path(db, path_parts, req.payload)
    else:
        set_by_path(db, path_parts, req.payload)
        
    save_db(db)
    return {"status": "ok"}

@app.post("/api/db/get")
def db_get(req: DBRequest, user = Depends(verify_token)):
    db = load_db()
    path_parts = [p for p in req.path.split("/") if p]
    data = get_by_path(db, path_parts)
    return data

@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...), user = Depends(verify_token)):
    ext = file.filename.split(".")[-1]
    filename = f"{int(time.time())}_{user['uid']}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"status": "ok", "url": f"/uploads/{filename}"}

class DeleteImageReq(BaseModel):
    url: str

@app.post("/api/delete_image")
def delete_image(req: DeleteImageReq, user = Depends(verify_token)):
    try:
        filename = req.url.split("/")[-1]
        filepath = os.path.join(UPLOAD_DIR, filename)
        if os.path.exists(filepath):
            os.remove(filepath)
        return {"status": "ok"}
    except:
        return {"status": "error"}
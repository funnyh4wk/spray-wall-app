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

# Подключаем ключ
firebase_cred_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT")

if not firebase_admin._apps:
    if firebase_cred_json:
        cred_dict = json.loads(firebase_cred_json)
        cred = credentials.Certificate(cred_dict)
    else:
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
        decoded_token = firebase_auth.verify_id_token(token)
        return decoded_token # Отдаем расшифрованный токен
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

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

# 🔥 УМНЫЙ ПРОВЕРЯЮЩИЙ ПРАВ (ТОТАЛЬНАЯ ЗАЩИТА)
def check_permissions(uid: str, path: str, method: str, payload: Any) -> bool:
    try:
        user_data = db.reference(f"users/{uid}").get() or {}
        # 1. Бог-админ (MASTER_UID) может всё
        if user_data.get("is_global_admin", False): return True
        
        can_create_gyms = user_data.get("can_create_gyms", False)

        parts = [p for p in path.strip("/").split("/") if p]
        if not parts: return False
        root = parts[0]

        # 2. Профили: каждый меняет только свой
        if root == "users":
            if len(parts) > 1 and parts[1] != uid: return False
            if isinstance(payload, dict): # Защита от повышения прав
                payload.pop("is_global_admin", None)
                payload.pop("can_create_gyms", None)
            return True

        # 3. Журнал пролазов: каждый пишет только себе
        if root == "user_ascents":
            if len(parts) > 1 and parts[1] != uid: return False
            return True

        # 4. Друзья
        if root in ["friend_requests", "friends"]:
            return uid in parts

        # 5. Скалодромы
        if root == "gyms":
            if method in ["PUT", "PATCH"]: return can_create_gyms
            if method == "DELETE" and len(parts) > 1:
                return db.reference(f"gym_roles/{parts[1]}/{uid}").get() == "admin"

        # 6. Роли на скалодроме
        if root == "gym_roles":
            if len(parts) > 1:
                gym_id = parts[1]
                if method in ["PUT", "PATCH"] and len(parts) > 2 and parts[2] == uid and payload == "admin":
                    return can_create_gyms # Разрешаем создателю зала выдать себе админа
                return db.reference(f"gym_roles/{gym_id}/{uid}").get() == "admin"

        # 7. Сектора
        if root == "gym_sectors":
            if len(parts) > 1:
                return db.reference(f"gym_roles/{parts[1]}/{uid}").get() in ["admin", "setter"]

        # 8. Трассы
        if root == "boulders":
            boulder_id = parts[1] if len(parts) > 1 else None
            # Удаление трассы
            if method == "DELETE":
                b_data = db.reference(f"boulders/{boulder_id}").get() or {}
                if b_data.get("author_id") == uid: return True # Автор может удалить свою
                return db.reference(f"gym_roles/{b_data.get('gym_id')}/{uid}").get() in ["admin", "setter"]
            
            # Создание / Редактирование
            if method in ["PUT", "PATCH"]:
                b_data = db.reference(f"boulders/{boulder_id}").get()
                if not b_data: # Если трасса новая
                    r_type = payload.get("route_type") if isinstance(payload, dict) else "custom"
                    if r_type == "official":
                        gym_id = payload.get("gym_id") if isinstance(payload, dict) else None
                        return db.reference(f"gym_roles/{gym_id}/{uid}").get() in ["admin", "setter"]
                return True # Все могут добавлять кастомные трассы или обновлять счетчик пролазов
                
        return False
    except Exception as e:
        print("Auth Check Error:", e)
        return False

@app.post("/api/db/save")
def db_save(req: DBRequest, decoded_token: dict = Depends(verify_token)):
    uid = decoded_token.get("uid")
    
    # Запрашиваем пропуск у нашего проверяющего
    if not check_permissions(uid, req.path, req.method, req.payload):
        raise HTTPException(status_code=403, detail="Access Denied. You do not have permission.")

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
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/db/get")
def db_get(req: DBRequest, decoded_token: dict = Depends(verify_token)):
    ref = db.reference(req.path)
    try:
        return ref.get()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...), decoded_token: dict = Depends(verify_token)):
    ext = file.filename.split(".")[-1]
    uid = decoded_token.get("uid", "user")
    filename = f"{int(time.time())}_{uid[:10]}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"status": "ok", "url": f"/uploads/{filename}"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
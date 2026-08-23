import os
import json
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Any, Optional

import firebase_admin
from firebase_admin import credentials, db, auth as firebase_auth
import cloudinary
import cloudinary.uploader

# 🔥 ТВОЯ ПОЧТА И КЛЮЧИ CLOUDINARY 🔥
MASTER_EMAIL = "funnyh4wk@gmail.com"

cloudinary.config(
    cloud_name = "spraywall",
    api_key = "228359521481238",
    api_secret = "MvS2MySwEvuQRN3n-qG6bKdK-Bg",
    secure = True
)

# Подключаем базу Firebase
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
        return decoded_token 
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class DBRequest(BaseModel):
    path: str
    payload: Optional[Any] = None
    method: Optional[str] = "PUT"

class ImageDeleteReq(BaseModel):
    url: str

def check_permissions(decoded_token: dict, path: str, method: str, payload: Any) -> bool:
    try:
        uid = decoded_token.get("uid")
        email = decoded_token.get("email", "")

        if email.lower() == MASTER_EMAIL.lower(): return True
        
        user_data = db.reference(f"users/{uid}").get() or {}
        if user_data.get("is_global_admin", False): return True
        
        can_create_gyms = user_data.get("can_create_gyms", False)

        parts = [p for p in path.strip("/").split("/") if p]
        if not parts: return False
        root = parts[0]

        if root == "users":
            if len(parts) > 1 and parts[1] != uid: return False
            if len(parts) > 2 and parts[2] in ["is_global_admin", "can_create_gyms"]: return False
            if isinstance(payload, dict): 
                payload.pop("is_global_admin", None)
                payload.pop("can_create_gyms", None)
            return True

        if root == "user_ascents":
            if len(parts) > 1 and parts[1] != uid: return False
            return True

        if root in ["friend_requests", "friends"]:
            return uid in parts

        if root == "gyms":
            if method in ["PUT", "PATCH"]: return can_create_gyms
            if method == "DELETE" and len(parts) > 1:
                return db.reference(f"gym_roles/{parts[1]}/{uid}").get() == "admin"

        if root == "gym_roles":
            if len(parts) > 1:
                gym_id = parts[1]
                if method in ["PUT", "PATCH"] and len(parts) > 2 and parts[2] == uid:
                    if payload == "admin": return can_create_gyms
                    if payload == "user": return True
                return db.reference(f"gym_roles/{gym_id}/{uid}").get() == "admin"

        if root == "gym_sectors":
            if len(parts) > 1:
                return db.reference(f"gym_roles/{parts[1]}/{uid}").get() in ["admin", "setter"]

        if root == "boulders":
            boulder_id = parts[1] if len(parts) > 1 else None
            if method == "DELETE":
                b_data = db.reference(f"boulders/{boulder_id}").get() or {}
                if b_data.get("author_id") == uid: return True
                return db.reference(f"gym_roles/{b_data.get('gym_id')}/{uid}").get() in ["admin", "setter"]
            
            if method in ["PUT", "PATCH"]:
                b_data = db.reference(f"boulders/{boulder_id}").get()
                if not b_data: 
                    r_type = payload.get("route_type") if isinstance(payload, dict) else "custom"
                    if r_type == "official":
                        gym_id = payload.get("gym_id") if isinstance(payload, dict) else None
                        return db.reference(f"gym_roles/{gym_id}/{uid}").get() in ["admin", "setter"]
                return True

        if root == "profile_likes":
            if len(parts) > 2 and parts[2] == uid:
                return True
                
        return False
    except Exception as e:
        print("Auth Check Error:", e)
        return False

@app.post("/api/db/save")
def db_save(req: DBRequest, decoded_token: dict = Depends(verify_token)):
    if not check_permissions(decoded_token, req.path, req.method, req.payload):
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

# 🔥 ЗАГРУЗКА В CLOUDINARY 🔥
@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...), decoded_token: dict = Depends(verify_token)):
    try:
        result = cloudinary.uploader.upload(file.file, folder="spraywall_routes")
        return {"status": "ok", "url": result.get("secure_url")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 🔥 УДАЛЕНИЕ ИЗ CLOUDINARY 🔥
@app.post("/api/delete_image")
def delete_image(req: ImageDeleteReq, decoded_token: dict = Depends(verify_token)):
    try:
        if "cloudinary.com" in req.url:
            parts = req.url.split("/")
            filename_with_ext = parts[-1]
            folder = parts[-2]
            public_id = f"{folder}/{filename_with_ext.split('.')[0]}"
            cloudinary.uploader.destroy(public_id)
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

os.makedirs("static", exist_ok=True)
app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
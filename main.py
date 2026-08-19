from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import uvicorn
import os

app = FastAPI()

# Говорим серверу: "Возьми папку static и покажи её всему интернету"
app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    # Запускаем наш сервер
    uvicorn.run("main:app", host="0.0.0.0", port=port)
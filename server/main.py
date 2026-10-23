
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="PocketMetaEditor API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://pocketmetaeditor.ayomidemodeyin.workers.dev",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.get("/")
def root():
    return {
        "app": "PocketMetaEditor",
        "status": "online",
        "mode": "prototype",
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "PocketMetaEditor API",
        "compiler_ready": False,
        "mt5_worker_ready": False,
    }

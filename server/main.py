
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="PocketMetaEditor API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://pocketmetaeditor.ayomidemodeyin.workers.dev"
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


class CompileRequest(BaseModel):
    code: str = ""
    filename: str = "main.mq5"


@app.get("/")
def root():
    return {
        "app": "PocketMetaEditor",
        "status": "online",
        "mode": "prototype"
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "PocketMetaEditor API",
        "compiler_ready": False,
        "mt5_worker_ready": False
    }


@app.post("/compile")
def compile_code(request: CompileRequest):
    return {
        "success": False,
        "status": "compiler_not_configured",
        "message": (
            "The API endpoint is working, but the Windows "
            "MetaEditor compiler has not been configured."
        ),
        "filename": request.filename,
        "build_output": (
            "Compilation unavailable: no real MQL5 compiler "
            "is connected yet."
        )
    }

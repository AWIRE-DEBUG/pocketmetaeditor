
import re

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(
    title="PocketMetaEditor API",
    version="0.3.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://pocketmetaeditor.ayomidemodeyin.workers.dev"
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

MAX_CODE_CHARS = 200_000


class SourceRequest(BaseModel):
    code: str = Field(
        min_length=1,
        max_length=MAX_CODE_CHARS
    )
    filename: str = Field(
        default="main.mq5",
        min_length=1,
        max_length=100
    )


def check_source(request: SourceRequest):
    filename = request.filename

    if not re.fullmatch(
        r"[A-Za-z0-9_-][A-Za-z0-9_.-]*\.mq5",
        filename,
        flags=re.IGNORECASE
    ):
        return "Invalid filename. Use a simple .mq5 filename."

    if "\x00" in request.code:
        return "Source code contains an invalid null character."

    return None


@app.get("/")
def root():
    return {
        "app": "PocketMetaEditor",
        "status": "online",
        "mode": "prototype",
        "version": "0.3.0"
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "PocketMetaEditor API",
        "compiler_ready": False,
        "mt5_worker_ready": False
    }


@app.post("/validate")
def validate_source(request: SourceRequest):
    error = check_source(request)

    if error:
        return {
            "valid": False,
            "message": error
        }

    return {
        "valid": True,
        "filename": request.filename,
        "characters": len(request.code),
        "message": (
            "Basic source checks passed. "
            "This is not a compiler syntax check."
        )
    }


@app.post("/compile")
def compile_code(request: SourceRequest):
    error = check_source(request)

    if error:
        return {
            "success": False,
            "status": "invalid_source",
            "message": error
        }

    return {
        "success": False,
        "status": "compiler_not_configured",
        "message": (
            "Source checks passed, but no Windows "
            "MetaEditor compiler is connected."
        ),
        "filename": request.filename,
        "build_output": (
            "No compilation was performed. "
            "Connect a secured Windows compiler worker."
        )
    }

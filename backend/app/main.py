from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import UPLOAD_DIR
from .database import SessionLocal, ensure_schema
from .routers import auth, customers, files, invoices, products, reports
from .seed import seed_if_empty

ensure_schema()
with SessionLocal() as db:
    seed_if_empty(db)

try:
    from .storage import ensure_folders

    ensure_folders()
    print("Google Drive ready.")
except Exception as exc:
    print("Google Drive not ready:", exc)

app = FastAPI(title="Harsh Hardware", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(customers.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(invoices.router, prefix="/api")
app.include_router(files.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.mount("/uploads/signatures", StaticFiles(directory=str(UPLOAD_DIR)), name="signatures")


@app.get("/api/health")
def health():
    return {"ok": True}

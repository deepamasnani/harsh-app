from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "harsh.db"
UPLOAD_DIR = BASE_DIR / "uploads" / "signatures"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

SECRET_KEY = "harsh-hardware-change-me-in-production"
JWT_ALG = "HS256"
TOKEN_DAYS = 7

SHOP = {
    "name": "Harsh Hardware",
    "tagline": "Cement · Steel · Plumbing · Paint",
    "address": "Main Market, Your Town",
    "phone": "98765 43210",
    "gstin": "",
}

GDRIVE_OAUTH_CLIENT_FILE = BASE_DIR / "gdrive-oauth-client.json"
GDRIVE_TOKEN_FILE = BASE_DIR / "gdrive-token.json"
GDRIVE_ROOT_FOLDER_NAME = "Harsh Hardware"
GDRIVE_ROOT_FOLDER_ID = ""  # optional: paste the Drive folder ID from the URL
GDRIVE_FOLDER_SIGNATURES = "signatures"
GDRIVE_FOLDER_INVOICES = "invoices"

# Default accounts — change after first login.
ADMIN_USER = "admin"
ADMIN_PASS = "admin123"
STAFF_USER = "staff"
STAFF_PASS = "staff123"

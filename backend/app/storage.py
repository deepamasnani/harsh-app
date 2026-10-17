import io
import re
from datetime import timezone
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaIoBaseDownload, MediaIoBaseUpload

from .config import (
    GDRIVE_FOLDER_INVOICES,
    GDRIVE_FOLDER_SIGNATURES,
    GDRIVE_OAUTH_CLIENT_FILE,
    GDRIVE_ROOT_FOLDER_ID,
    GDRIVE_ROOT_FOLDER_NAME,
    GDRIVE_TOKEN_FILE,
    UPLOAD_DIR,
)
from .utils import IST

FOLDER_MIME = "application/vnd.google-apps.folder"
DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive.file"]

_service = None
_root_id = None
_folder_cache = {}


class DriveNotConfigured(RuntimeError):
    pass


def folder_slug(name):
    raw = re.sub(r"[^\w]+", "_", (name or "").strip(), flags=re.UNICODE)
    return raw.strip("_") or "unknown"


def invoice_object_key(inv):
    created = inv.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    day = created.astimezone(IST).strftime("%Y-%m-%d")
    return "%s/%s/%s.pdf" % (folder_slug(inv.customer_name), day, inv.number)


def signature_object_key(inv):
    return "%s.png" % inv.number


def invoice_signature_key(inv):
    pdf_key = invoice_object_key(inv)
    if pdf_key.endswith(".pdf"):
        return pdf_key[:-4] + ".png"
    return "%s/%s.png" % (pdf_key.rsplit("/", 1)[0], inv.number)


def local_signature_bytes(inv):
    candidates = [UPLOAD_DIR / ("%s.png" % inv.number)]
    if inv.signature_path:
        candidates.append(Path(inv.signature_path))
    seen = set()
    for path in candidates:
        resolved = str(path)
        if resolved in seen:
            continue
        seen.add(resolved)
        if path.exists() and path.is_file():
            return path.read_bytes()
    return None


def _escape(value):
    return (value or "").replace("\\", "\\\\").replace("'", "\\'")


def _save_token(creds):
    GDRIVE_TOKEN_FILE.write_text(creds.to_json())


def load_credentials():
    if not GDRIVE_TOKEN_FILE.exists():
        raise DriveNotConfigured(
            "Google Drive is not signed in. Put the OAuth client JSON at %s "
            "then run: python connect_drive.py"
            % GDRIVE_OAUTH_CLIENT_FILE
        )
    creds = Credentials.from_authorized_user_file(str(GDRIVE_TOKEN_FILE), DRIVE_SCOPES)
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
        _save_token(creds)
    if not creds or not creds.valid:
        raise DriveNotConfigured(
            "Google Drive login expired. Run: python connect_drive.py"
        )
    return creds


def client():
    global _service
    if _service is not None:
        return _service
    _service = build("drive", "v3", credentials=load_credentials(), cache_discovery=False)
    return _service


def _list_files(query, page_size=10):
    return (
        client()
        .files()
        .list(
            q=query,
            spaces="drive",
            fields="files(id, name)",
            pageSize=page_size,
        )
        .execute()
        .get("files", [])
    )


def _find_child(parent_id, name, folder=False):
    cache_key = (parent_id, name, folder)
    if cache_key in _folder_cache:
        return _folder_cache[cache_key]
    bits = [
        "name = '%s'" % _escape(name),
        "'%s' in parents" % parent_id,
        "trashed = false",
    ]
    if folder:
        bits.append("mimeType = '%s'" % FOLDER_MIME)
    else:
        bits.append("mimeType != '%s'" % FOLDER_MIME)
    matches = _list_files(" and ".join(bits), page_size=1)
    file_id = matches[0]["id"] if matches else None
    if file_id and folder:
        _folder_cache[cache_key] = file_id
    return file_id


def _create_folder(parent_id, name):
    created = (
        client()
        .files()
        .create(
            body={
                "name": name,
                "mimeType": FOLDER_MIME,
                "parents": [parent_id],
            },
            fields="id",
        )
        .execute()
    )
    file_id = created["id"]
    _folder_cache[(parent_id, name, True)] = file_id
    return file_id


def _child_folder(parent_id, name, create=False):
    existing = _find_child(parent_id, name, folder=True)
    if existing:
        return existing
    if create:
        return _create_folder(parent_id, name)
    return None


def _root_folder_id():
    global _root_id
    if _root_id:
        return _root_id
    if GDRIVE_ROOT_FOLDER_ID.strip():
        _root_id = GDRIVE_ROOT_FOLDER_ID.strip()
        return _root_id
    matches = _list_files(
        "name = '%s' and mimeType = '%s' and trashed = false"
        % (_escape(GDRIVE_ROOT_FOLDER_NAME), FOLDER_MIME),
        page_size=5,
    )
    if matches:
        _root_id = matches[0]["id"]
        return _root_id
    _root_id = _create_folder("root", GDRIVE_ROOT_FOLDER_NAME)
    return _root_id


def _walk(parts, create=False):
    parent = _root_folder_id()
    for name in parts:
        parent = _child_folder(parent, name, create=create)
        if not parent:
            return None
    return parent


def ensure_folders():
    _walk([GDRIVE_FOLDER_SIGNATURES], create=True)
    _walk([GDRIVE_FOLDER_INVOICES], create=True)


def _put_file(parent_id, filename, data, content_type):
    payload = data if isinstance(data, (bytes, bytearray)) else bytes(data)
    media = MediaIoBaseUpload(io.BytesIO(payload), mimetype=content_type, resumable=False)
    existing = _find_child(parent_id, filename, folder=False)
    if existing:
        client().files().update(fileId=existing, media_body=media).execute()
        return existing
    created = (
        client()
        .files()
        .create(
            body={"name": filename, "parents": [parent_id]},
            media_body=media,
            fields="id",
        )
        .execute()
    )
    return created["id"]


def _get_file(parent_id, filename):
    file_id = _find_child(parent_id, filename, folder=False)
    if not file_id:
        return None
    request = client().files().get_media(fileId=file_id)
    buf = io.BytesIO()
    downloader = MediaIoBaseDownload(buf, request)
    done = False
    while not done:
        _, done = downloader.next_chunk()
    return buf.getvalue()


def put_bytes(folder, key, data, content_type):
    parts = [folder] + [p for p in key.split("/") if p]
    filename = parts[-1]
    parent = _walk(parts[:-1], create=True)
    _put_file(parent, filename, data, content_type)
    return key


def get_bytes(folder, key):
    global _service
    try:
        parts = [folder] + [p for p in key.split("/") if p]
        filename = parts[-1]
        parent = _walk(parts[:-1], create=False)
        if not parent:
            return None
        return _get_file(parent, filename)
    except DriveNotConfigured:
        return None
    except HttpError as exc:
        if exc.resp.status in (404, 403):
            return None
        _service = None
        return None
    except Exception:
        _service = None
        return None


def put_signature(inv, png_bytes):
    key = signature_object_key(inv)
    payload = png_bytes if isinstance(png_bytes, (bytes, bytearray)) else bytes(png_bytes)
    (UPLOAD_DIR / key).write_bytes(payload)
    try:
        put_bytes(GDRIVE_FOLDER_SIGNATURES, key, payload, "image/png")
        put_bytes(GDRIVE_FOLDER_INVOICES, invoice_signature_key(inv), payload, "image/png")
    except Exception:
        pass
    return key


def put_invoice_pdf(inv, pdf_bytes):
    key = invoice_object_key(inv)
    try:
        put_bytes(GDRIVE_FOLDER_INVOICES, key, pdf_bytes, "application/pdf")
    except Exception:
        pass
    return key


def get_signature(inv):
    local = local_signature_bytes(inv)
    if local:
        return local
    data = get_bytes(GDRIVE_FOLDER_SIGNATURES, signature_object_key(inv))
    if data:
        return data
    return get_bytes(GDRIVE_FOLDER_INVOICES, invoice_signature_key(inv))


def get_invoice_pdf(inv):
    return get_bytes(GDRIVE_FOLDER_INVOICES, invoice_object_key(inv))

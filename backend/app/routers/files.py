from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Invoice, User
from ..storage import get_invoice_pdf, get_signature

router = APIRouter(prefix="/files", tags=["files"])


@router.get("/signature/{invoice_id}")
def signature_file(invoice_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    inv = db.get(Invoice, invoice_id)
    if not inv or not inv.signature_path:
        raise HTTPException(status_code=404, detail="Signature not found")
    data = get_signature(inv)
    if not data:
        raise HTTPException(status_code=404, detail="Signature not found")
    return Response(content=data, media_type="image/png")


@router.get("/invoice/{invoice_id}")
def invoice_pdf(invoice_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    inv = db.get(Invoice, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    data = get_invoice_pdf(inv)
    if not data:
        raise HTTPException(status_code=404, detail="PDF not found yet")
    filename = "%s.pdf" % inv.number
    return Response(
        content=data,
        media_type="application/pdf",
        headers={"Content-Disposition": 'inline; filename="%s"' % filename},
    )

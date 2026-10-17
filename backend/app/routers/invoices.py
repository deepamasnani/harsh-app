import base64
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from ..auth import get_current_user, require_admin
from ..config import SHOP, UPLOAD_DIR
from ..database import get_db
from ..models import Invoice, InvoiceItem, Payment, Product, User
from ..pdf import build_invoice_pdf
from ..routers.customers import get_or_create_customer
from ..storage import get_signature, put_invoice_pdf, put_signature
from ..utils import amount_in_words, customer_key, is_today, money, today_bounds_utc

router = APIRouter(prefix="/invoices", tags=["invoices"])


class ItemIn(BaseModel):
    product_id: int
    quantity: float


class InvoiceCreate(BaseModel):
    customer_name: str
    customer_phone: str = ""
    customer_shop: str = ""
    notes: str = ""
    items: List[ItemIn]


class DeliverBody(BaseModel):
    payment: str  # paid | credit
    signature: Optional[str] = None
    amount_paid: float = 0  # cash collected now; rest becomes credit


class PayBody(BaseModel):
    amount: Optional[float] = None
    note: str = ""


def next_number(db: Session) -> str:
    last = db.query(Invoice).order_by(Invoice.id.desc()).first()
    n = (last.id + 1) if last else 1
    return f"HH-{n:05d}"


def invoice_out(inv: Invoice, *, with_items: bool = True) -> dict:
    paid = money(inv.amount_paid)
    total = money(inv.total)
    balance = money(max(0, total - paid))
    data = {
        "id": inv.id,
        "number": inv.number,
        "customer_id": inv.customer_id,
        "customer_name": inv.customer_name,
        "customer_phone": inv.customer_phone,
        "customer_shop": inv.customer_shop,
        "customer_key": customer_key(inv.customer_name, inv.customer_phone, inv.customer_id),
        "notes": inv.notes,
        "status": inv.status,
        "subtotal": inv.subtotal,
        "total": total,
        "amount_paid": paid,
        "balance": balance,
        "amount_words": amount_in_words(total),
        "signature_url": f"/api/files/signature/{inv.id}" if inv.signature_path else None,
        "pdf_url": f"/api/files/invoice/{inv.id}",
        "created_at": inv.created_at.isoformat() + "Z",
        "delivered_at": inv.delivered_at.isoformat() + "Z" if inv.delivered_at else None,
        "settled_at": inv.settled_at.isoformat() + "Z" if inv.settled_at else None,
        "item_count": len(inv.items),
        "shop": SHOP,
        "payments": [
            {
                "id": p.id,
                "amount": money(p.amount),
                "kind": p.kind,
                "note": p.note,
                "created_at": p.created_at.isoformat() + "Z",
            }
            for p in (inv.payments or [])
        ],
    }
    if with_items:
        data["items"] = [
            {
                "id": it.id,
                "sku": it.sku,
                "name": it.name,
                "unit": it.unit,
                "quantity": it.quantity,
                "unit_price": it.unit_price,
                "line_total": it.line_total,
            }
            for it in inv.items
        ]
    return data


@router.get("")
def list_invoices(
    status: str = "",
    q: str = "",
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Invoice).options(selectinload(Invoice.items), selectinload(Invoice.payments)).order_by(Invoice.created_at.desc())
    if status:
        query = query.filter(Invoice.status == status)
    if q.strip():
        like = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Invoice.number.ilike(like),
                Invoice.customer_name.ilike(like),
                Invoice.customer_phone.ilike(like),
                Invoice.customer_shop.ilike(like),
            )
        )
    if user.role == "staff":
        start, end = today_bounds_utc()
        query = query.filter(
            Invoice.status != "cancelled",
            Invoice.created_at >= start,
            Invoice.created_at < end,
        )
    return [invoice_out(inv, with_items=False) for inv in query.all()]


@router.get("/{invoice_id}")
def get_invoice(invoice_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    inv = (
        db.query(Invoice)
        .options(selectinload(Invoice.items), selectinload(Invoice.payments))
        .filter(Invoice.id == invoice_id)
        .first()
    )
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if user.role == "staff" and (inv.status == "cancelled" or not is_today(inv.created_at)):
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice_out(inv)


@router.post("")
def create_invoice(body: InvoiceCreate, db: Session = Depends(get_db), user: User = Depends(require_admin)):
    if not body.customer_name.strip():
        raise HTTPException(status_code=400, detail="Customer name is required")
    if not body.items:
        raise HTTPException(status_code=400, detail="Add at least one item")

    lines = []
    subtotal = 0.0
    products = []

    for row in body.items:
        if row.quantity <= 0:
            raise HTTPException(status_code=400, detail="Quantity must be more than 0")
        product = db.get(Product, row.product_id)
        if not product or not product.is_active:
            raise HTTPException(status_code=400, detail=f"Unknown product id {row.product_id}")
        line_total = round(product.price * row.quantity, 2)
        subtotal += line_total
        lines.append(
            InvoiceItem(
                product_id=product.id,
                sku=product.sku,
                name=product.name,
                unit=product.unit,
                quantity=row.quantity,
                unit_price=product.price,
                line_total=line_total,
            )
        )
        products.append((product, row.quantity))

    cust = get_or_create_customer(db, body.customer_name, body.customer_phone, body.customer_shop)

    inv = Invoice(
        number=next_number(db),
        customer_id=cust.id,
        customer_name=cust.name,
        customer_phone=cust.phone,
        customer_shop=cust.shop,
        notes=body.notes.strip(),
        status="pending",
        subtotal=round(subtotal, 2),
        total=round(subtotal, 2),
        amount_paid=0,
        items=lines,
    )
    for product, qty in products:
        product.stock = round(product.stock - qty, 3)
    db.add(inv)
    db.commit()
    db.refresh(inv)
    inv = db.query(Invoice).options(selectinload(Invoice.items), selectinload(Invoice.payments)).filter(Invoice.id == inv.id).first()
    _archive_invoice(inv)
    return invoice_out(inv)


def _save_signature(inv: Invoice, data_url: str) -> str:
    raw = data_url.split(",", 1)[-1]
    try:
        blob = base64.b64decode(raw)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid signature image")
    if len(blob) < 80:
        raise HTTPException(status_code=400, detail="Signature is empty")
    key = put_signature(inv, blob)
    return key


def _archive_invoice(inv: Invoice):
    sig = None
    if inv.signature_path:
        sig = get_signature(inv)
        if not sig:
            local = UPLOAD_DIR / ("%s.png" % inv.number)
            if local.exists():
                sig = local.read_bytes()
    pdf_bytes = build_invoice_pdf(inv, sig)
    put_invoice_pdf(inv, pdf_bytes)


def _load(db: Session, invoice_id: int):
    return (
        db.query(Invoice)
        .options(selectinload(Invoice.items), selectinload(Invoice.payments))
        .filter(Invoice.id == invoice_id)
        .first()
    )


def _apply_cash(inv: Invoice, amount, kind, note=""):
    amount = money(amount)
    remaining = money(max(0, inv.total - (inv.amount_paid or 0)))
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Enter an amount greater than 0")
    if amount > remaining + 0.001:
        raise HTTPException(status_code=400, detail="Amount is more than what is due")
    inv.amount_paid = money((inv.amount_paid or 0) + amount)
    inv.payments.append(Payment(amount=amount, kind=kind, note=note or ""))
    if money(inv.total - inv.amount_paid) <= 0:
        inv.status = "settled" if inv.status == "credit" else "paid"
        inv.amount_paid = money(inv.total)
        if inv.status == "settled":
            inv.settled_at = datetime.utcnow()
    return inv


@router.post("/{invoice_id}/deliver")
def deliver(
    invoice_id: int,
    body: DeliverBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    inv = _load(db, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if inv.status != "pending":
        raise HTTPException(status_code=400, detail="This receipt is already closed")
    if user.role == "staff" and not is_today(inv.created_at):
        raise HTTPException(status_code=404, detail="Invoice not found")
    if body.payment not in ("paid", "credit"):
        raise HTTPException(status_code=400, detail="payment must be paid or credit")

    cash = money(body.amount_paid)
    if cash < 0:
        raise HTTPException(status_code=400, detail="Part payment cannot be negative")
    if cash > inv.total:
        raise HTTPException(status_code=400, detail="Part payment cannot exceed the bill")

    if body.payment == "paid" or cash >= inv.total:
        inv.status = "paid"
        inv.amount_paid = money(inv.total)
        if cash > 0 or body.payment == "paid":
            inv.payments.append(Payment(amount=money(inv.total), kind="delivery", note="Collected in full"))
    else:
        if not body.signature:
            raise HTTPException(status_code=400, detail="Customer signature is required for the remaining credit")
        inv.signature_path = _save_signature(inv, body.signature)
        inv.status = "credit"
        inv.amount_paid = cash
        if cash > 0:
            inv.payments.append(Payment(amount=cash, kind="delivery", note="Part payment on delivery"))

    inv.delivered_at = datetime.utcnow()
    db.commit()
    inv = _load(db, inv.id)
    _archive_invoice(inv)
    return invoice_out(inv)


@router.post("/{invoice_id}/pay")
def pay(
    invoice_id: int,
    body: PayBody,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    inv = _load(db, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if inv.status != "credit":
        raise HTTPException(status_code=400, detail="Part payment is only for open credit")
    if body.amount is None:
        raise HTTPException(status_code=400, detail="Enter the amount collected")
    _apply_cash(inv, body.amount, "settlement", body.note)
    db.commit()
    inv = _load(db, inv.id)
    _archive_invoice(inv)
    return invoice_out(inv)


@router.post("/{invoice_id}/settle")
def settle(invoice_id: int, body: PayBody = PayBody(), db: Session = Depends(get_db), user: User = Depends(require_admin)):
    inv = _load(db, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if inv.status != "credit":
        raise HTTPException(status_code=400, detail="Only credit invoices can be settled")
    remaining = money(max(0, inv.total - (inv.amount_paid or 0)))
    amount = money(body.amount) if body.amount is not None else remaining
    _apply_cash(inv, amount, "settlement", body.note or "")
    db.commit()
    inv = _load(db, inv.id)
    _archive_invoice(inv)
    return invoice_out(inv)


@router.post("/{invoice_id}/cancel")
def cancel(invoice_id: int, db: Session = Depends(get_db), user: User = Depends(require_admin)):
    inv = _load(db, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if inv.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending bills can be cancelled")
    for item in inv.items:
        if item.product_id:
            product = db.get(Product, item.product_id)
            if product:
                product.stock = round(product.stock + item.quantity, 3)
    inv.status = "cancelled"
    db.commit()
    return invoice_out(inv)

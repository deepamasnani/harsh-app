from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, selectinload

from ..auth import require_admin
from ..database import get_db
from ..models import Invoice, Product, User
from ..utils import customer_key, money

router = APIRouter(tags=["reports"])


def _balance(inv: Invoice) -> float:
    return money(max(0, (inv.total or 0) - (inv.amount_paid or 0)))


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), user: User = Depends(require_admin)):
    from datetime import datetime

    start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    invoices = db.query(Invoice).all()
    today = [i for i in invoices if i.created_at >= start]
    credit = [i for i in invoices if i.status == "credit"]
    return {
        "today_bills": len([i for i in today if i.status != "cancelled"]),
        "today_amount": round(sum(i.total for i in today if i.status != "cancelled"), 2),
        "pending_deliveries": len([i for i in invoices if i.status == "pending"]),
        "pending_amount": round(sum(i.total for i in invoices if i.status == "pending"), 2),
        "credit_count": len(credit),
        "credit_outstanding": round(sum(_balance(i) for i in credit), 2),
        "low_stock": db.query(Product)
        .filter(Product.is_active.is_(True), Product.stock <= 10)
        .count(),
        "sku_count": db.query(Product).filter(Product.is_active.is_(True)).count(),
    }


@router.get("/credits")
def credits(db: Session = Depends(get_db), user: User = Depends(require_admin)):
    rows = (
        db.query(Invoice)
        .options(selectinload(Invoice.items), selectinload(Invoice.payments))
        .filter(Invoice.status == "credit")
        .order_by(Invoice.delivered_at.desc())
        .all()
    )

    grouped = {}
    for inv in rows:
        key = customer_key(inv.customer_name, inv.customer_phone, inv.customer_id)
        if key not in grouped:
            grouped[key] = {
                "key": key,
                "customer_name": inv.customer_name,
                "customer_phone": inv.customer_phone,
                "customer_shop": inv.customer_shop,
                "invoice_count": 0,
                "outstanding": 0.0,
                "invoices": [],
            }
        due = _balance(inv)
        grouped[key]["invoice_count"] += 1
        grouped[key]["outstanding"] = money(grouped[key]["outstanding"] + due)
        grouped[key]["invoices"].append(
            {
                "id": inv.id,
                "number": inv.number,
                "total": money(inv.total),
                "amount_paid": money(inv.amount_paid or 0),
                "balance": due,
                "delivered_at": inv.delivered_at.isoformat() + "Z" if inv.delivered_at else None,
                "created_at": inv.created_at.isoformat() + "Z",
            }
        )

    customers = sorted(grouped.values(), key=lambda c: c["outstanding"], reverse=True)
    return {
        "total_outstanding": round(sum(c["outstanding"] for c in customers), 2),
        "customer_count": len(customers),
        "customers": customers,
    }

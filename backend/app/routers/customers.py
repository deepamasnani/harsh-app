from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..auth import require_admin
from ..database import get_db
from ..models import Customer, User
from ..utils import customer_key, name_key

router = APIRouter(prefix="/customers", tags=["customers"])


def get_or_create_customer(db: Session, name: str, phone: str = "", shop: str = "") -> Customer:
    key = name_key(name)
    if not key:
        raise HTTPException(status_code=400, detail="Customer name is required")
    existing = db.query(Customer).filter(Customer.name_key == key).first()
    if existing:
        return existing
    cust = Customer(
        name=name.strip(),
        name_key=key,
        phone=(phone or "").strip(),
        shop=(shop or "").strip() or name.strip(),
    )
    db.add(cust)
    db.flush()
    return cust


def customer_out(c: Customer) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "phone": c.phone or "",
        "shop": c.shop or "",
        "customer_key": customer_key(c.name, c.phone, c.id),
    }


@router.get("")
def list_customers(
    q: str = Query(""),
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    query = db.query(Customer).order_by(Customer.name.asc())
    if q.strip():
        like = "%%%s%%" % q.strip()
        query = query.filter(
            or_(Customer.name.ilike(like), Customer.phone.ilike(like), Customer.shop.ilike(like))
        )
    return [customer_out(c) for c in query.limit(40).all()]

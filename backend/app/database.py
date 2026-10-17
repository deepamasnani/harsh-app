from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base

from .config import DB_PATH

engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def ensure_schema():
    Base.metadata.create_all(bind=engine)
    insp = inspect(engine)
    inv_cols = {c["name"] for c in insp.get_columns("invoices")}
    with engine.begin() as conn:
        if "amount_paid" not in inv_cols:
            conn.execute(text("ALTER TABLE invoices ADD COLUMN amount_paid FLOAT DEFAULT 0"))
        if "customer_id" not in inv_cols:
            conn.execute(text("ALTER TABLE invoices ADD COLUMN customer_id INTEGER"))

    with SessionLocal() as db:
        from .models import Customer, Invoice
        from .utils import name_key

        for inv in db.query(Invoice).all():
            paid = inv.amount_paid or 0
            if inv.status in ("paid", "settled") and paid == 0:
                inv.amount_paid = inv.total
            elif inv.amount_paid is None:
                inv.amount_paid = 0

            if not inv.customer_id and inv.customer_name:
                key = name_key(inv.customer_name)
                if not key:
                    continue
                cust = db.query(Customer).filter(Customer.name_key == key).first()
                if not cust:
                    cust = Customer(
                        name=inv.customer_name.strip(),
                        name_key=key,
                        phone=(inv.customer_phone or "").strip(),
                        shop=(inv.customer_shop or inv.customer_name).strip(),
                    )
                    db.add(cust)
                    db.flush()
                inv.customer_id = cust.id
                inv.customer_name = cust.name
                inv.customer_phone = cust.phone
                inv.customer_shop = cust.shop
        db.commit()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

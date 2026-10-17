from sqlalchemy.orm import Session

from .auth import hash_password
from .config import ADMIN_PASS, ADMIN_USER, STAFF_PASS, STAFF_USER
from .models import Product, User

SAMPLE_PRODUCTS = [
    ("CEM-50", "OPC Cement 50 kg", "bag", 380, 120, "Cement"),
    ("PPC-50", "PPC Cement 50 kg", "bag", 360, 80, "Cement"),
    ("WCEM-1", "White Cement 1 kg", "kg", 45, 90, "Cement"),
    ("TMT-08", "TMT Bar 8 mm", "kg", 62, 500, "Steel"),
    ("TMT-10", "TMT Bar 10 mm", "kg", 62, 600, "Steel"),
    ("TMT-12", "TMT Bar 12 mm", "kg", 61, 800, "Steel"),
    ("TMT-16", "TMT Bar 16 mm", "kg", 61, 400, "Steel"),
    ("WIR-BND", "Binding Wire", "kg", 72, 50, "Steel"),
    ("BRK-RED", "Red Clay Brick", "nos", 9.5, 5000, "Bricks"),
    ("BRK-FLY", "Fly Ash Brick", "nos", 8, 3000, "Bricks"),
    ("SND-RVR", "River Sand", "cft", 55, 400, "Aggregates"),
    ("AGG-20", "20 mm Aggregate", "cft", 48, 300, "Aggregates"),
    ("AGG-10", "10 mm Aggregate", "cft", 50, 200, "Aggregates"),
    ("PVC-1", "PVC Pipe 1 inch (10 ft)", "nos", 210, 40, "Plumbing"),
    ("PVC-05", "PVC Pipe 1/2 inch (10 ft)", "nos", 95, 50, "Plumbing"),
    ("ELB-1", "PVC Elbow 1 inch", "nos", 18, 200, "Plumbing"),
    ("TAP-15", "Brass Tap 15 mm", "nos", 185, 35, "Plumbing"),
    ("PNT-WHT", "Interior Paint White 1 L", "ltr", 240, 24, "Paint"),
    ("PUT-20", "Wall Putty 20 kg", "bag", 420, 40, "Paint"),
    ("PLY-18", "Plywood 18 mm 8x4", "sht", 1850, 15, "Wood"),
    ("NAL-2", "Nails 2 inch", "kg", 95, 25, "Hardware"),
    ("SCR-1", "Wood Screws 1 inch", "box", 60, 40, "Hardware"),
    ("CEM-GRT", "Tile Grout 1 kg", "kg", 55, 30, "Tiles"),
    ("ADL-20", "Tile Adhesive 20 kg", "bag", 480, 25, "Tiles"),
]


def seed_if_empty(db: Session) -> None:
    if db.query(User).count() == 0:
        db.add_all(
            [
                User(
                    username=ADMIN_USER,
                    password_hash=hash_password(ADMIN_PASS),
                    role="admin",
                    full_name="Owner",
                ),
                User(
                    username=STAFF_USER,
                    password_hash=hash_password(STAFF_PASS),
                    role="staff",
                    full_name="Delivery staff",
                ),
            ]
        )

    if db.query(Product).count() == 0:
        db.add_all(
            [
                Product(
                    sku=sku,
                    name=name,
                    unit=unit,
                    price=price,
                    stock=stock,
                    category=category,
                )
                for sku, name, unit, price, stock, category in SAMPLE_PRODUCTS
            ]
        )

    db.commit()

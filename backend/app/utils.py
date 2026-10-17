import re
from datetime import datetime, timedelta, timezone


IST = timezone(timedelta(hours=5, minutes=30))


def today_bounds_utc():
    """Start/end of the current calendar day in India, as naive UTC datetimes."""
    now = datetime.now(IST)
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=1)
    return (
        start.astimezone(timezone.utc).replace(tzinfo=None),
        end.astimezone(timezone.utc).replace(tzinfo=None),
    )


def is_today(dt):
    if not dt:
        return False
    naive = dt.replace(tzinfo=None) if getattr(dt, "tzinfo", None) else dt
    start, end = today_bounds_utc()
    return start <= naive < end


def name_key(name):
    return re.sub(r"\s+", " ", (name or "").strip()).lower()


def customer_key(name, phone="", customer_id=None):
    """Folder id: saved customer, else unique name."""
    if customer_id:
        return "c-%s" % customer_id
    slug = re.sub(r"[^a-z0-9]+", "-", name_key(name)).strip("-")
    return "n-" + (slug or "unknown")


def money(n):
    return round(float(n or 0), 2)


ONES = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
]
TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]


def _two_digit(n: int) -> str:
    if n < 20:
        return ONES[n]
    return (TENS[n // 10] + (" " + ONES[n % 10] if n % 10 else "")).strip()


def _three_digit(n: int) -> str:
    if n < 100:
        return _two_digit(n)
    rest = _two_digit(n % 100)
    return (ONES[n // 100] + " Hundred" + (" " + rest if rest else "")).strip()


def amount_in_words(amount: float) -> str:
    """Indian numbering: crore / lakh / thousand."""
    n = int(round(amount))
    if n == 0:
        return "Zero Rupees only"
    parts = []
    crore, n = divmod(n, 10_000_000)
    lakh, n = divmod(n, 100_000)
    thousand, n = divmod(n, 1_000)
    if crore:
        parts.append(_three_digit(crore) + " Crore")
    if lakh:
        parts.append(_two_digit(lakh) + " Lakh")
    if thousand:
        parts.append(_two_digit(thousand) + " Thousand")
    if n:
        parts.append(_three_digit(n))
    return " ".join(parts) + " Rupees only"

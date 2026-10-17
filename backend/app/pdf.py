import os
import tempfile

from fpdf import FPDF

from .config import SHOP
from .utils import amount_in_words, money


def _rs(n):
    return "Rs. {:,.2f}".format(money(n))


class InvoicePDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 18)
        self.cell(0, 10, SHOP.get("name") or "Invoice", ln=1)
        self.set_font("Helvetica", "", 10)
        tag = SHOP.get("tagline") or ""
        if tag:
            self.cell(0, 5, tag, ln=1)
        addr = ", ".join([p for p in [SHOP.get("address"), SHOP.get("phone")] if p])
        if addr:
            self.cell(0, 5, addr, ln=1)
        self.ln(4)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.cell(0, 10, "Page %s" % self.page_no(), align="C")


def build_invoice_pdf(inv, signature_png=None):
    pdf = InvoicePDF()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()
    pdf.set_font("Helvetica", "", 11)
    pdf.cell(95, 6, "Bill to: %s" % (inv.customer_name or ""), ln=0)
    pdf.cell(95, 6, "Invoice %s" % inv.number, ln=1, align="R")
    if inv.customer_phone:
        pdf.cell(95, 6, inv.customer_phone, ln=0)
    else:
        pdf.cell(95, 6, "", ln=0)
    created = inv.created_at.strftime("%d %b %Y %H:%M") if inv.created_at else ""
    pdf.cell(95, 6, created, ln=1, align="R")
    if inv.customer_shop and inv.customer_shop != inv.customer_name:
        pdf.cell(0, 6, inv.customer_shop, ln=1)
    pdf.cell(0, 6, "Status: %s" % inv.status, ln=1)
    pdf.ln(3)

    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(80, 8, "Item", border=1)
    pdf.cell(30, 8, "Qty", border=1, align="R")
    pdf.cell(40, 8, "Rate", border=1, align="R")
    pdf.cell(40, 8, "Amount", border=1, align="R", ln=1)
    pdf.set_font("Helvetica", "", 10)
    for it in inv.items or []:
        name = (it.name or "")[:42]
        pdf.cell(80, 8, name, border=1)
        qty = ("%s %s" % (it.quantity, it.unit)).strip()
        pdf.cell(30, 8, qty, border=1, align="R")
        pdf.cell(40, 8, _rs(it.unit_price), border=1, align="R")
        pdf.cell(40, 8, _rs(it.line_total), border=1, align="R", ln=1)

    pdf.ln(2)
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "Total  %s" % _rs(inv.total), ln=1, align="R")
    pdf.set_font("Helvetica", "", 10)
    if inv.amount_paid:
        pdf.cell(0, 6, "Received  %s" % _rs(inv.amount_paid), ln=1, align="R")
    due = money(max(0, (inv.total or 0) - (inv.amount_paid or 0)))
    if due and inv.status == "credit":
        pdf.cell(0, 6, "Balance due  %s" % _rs(due), ln=1, align="R")
    pdf.set_font("Helvetica", "I", 9)
    pdf.multi_cell(0, 5, amount_in_words(inv.total))

    if signature_png:
        pdf.ln(4)
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(0, 6, "Customer signature (credit)", ln=1)
        tmp_path = None
        try:
            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                tmp.write(signature_png)
                tmp_path = tmp.name
            pdf.image(tmp_path, w=70)
        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.unlink(tmp_path)

    out = pdf.output()
    return bytes(out) if isinstance(out, (bytes, bytearray)) else out.encode("latin-1")

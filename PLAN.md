# Harsh Hardware — Product Plan

A two-user web app for a hardware / building-materials shop.

The owner (admin) sits at the counter, takes phone orders, bills them, and sends the receipt to delivery staff. Staff only see receipts. If the shopkeeper cannot pay on delivery, they sign on the phone and the amount is stored as credit. The owner can later open any invoice, print it, and track who still owes money.

---

## 1. Who uses it

There are exactly two logins. Roles never overlap.

| Role | Person | What they can do |
|---|---|---|
| **Admin** | Business owner | Inventory, Excel import, billing, all invoices, print, creditors, settle credit |
| **Staff** | Delivery person | Pending + completed receipts only. Collect cash or a signature for credit. |

Default logins (change after first run):

- Admin: `admin` / `admin123`
- Staff: `staff` / `staff123`

---

## 2. How a real day works

1. A customer (usually a shopkeeper) calls the owner for materials.
2. Owner opens **Billing**, types the shop name / phone, searches SKUs, taps quantities.
3. Owner hits **Generate & send to staff**. Stock is reduced. A numbered invoice appears on the staff phone.
4. Staff loads the material and goes to the shop.
5. **If cash is collected:** staff taps **Collected cash**. Done.
6. **If they want credit:** staff hands the phone to the customer. Customer signs in a large box. Staff taps **Save as credit**. That invoice is now a creditor record.
7. Owner can open **Invoices** any time and print a copy. **Creditors** shows outstanding signed dues, grouped by customer. When someone later pays, owner taps **Mark settled**.

---

## 3. Screens

### Admin (desktop + phone)

- **Home** — today’s bills, pending deliveries, outstanding credit.
- **Inventory** — search, add/edit SKUs, stock, Excel/CSV import.
- **Billing** — phone-order POS. Sticky search, cart, send to staff.
- **Invoices** — every receipt (pending / paid / credit / settled / cancelled), print.
- **Creditors** — outstanding signed credit by customer, settle later.

### Staff (phone-first)

- Looks like a delivery app, not an ERP. Large type, large buttons.
- **Receipts** — pending on top, recent completed below.
- **Receipt detail** — items, total, then either:
  - Collected cash
  - Customer signature → Save as credit
- Signature canvas is full-width, high-DPI, `touch-action: none`, zoom locked while signing so a finger does not pan the page.

### Print

A dedicated invoice page (shop header, item table, totals, amount in words, signature if present). Uses browser print. Works for A4; also readable on a phone.

---

## 4. Data model

```
User        id, username, password_hash, role, full_name
Product     sku, name, unit, price, stock, category, is_active
Invoice     number, customer_name/phone/shop, status, totals,
            signature file, timestamps, notes
InvoiceItem snapshot of sku/name/unit/qty/price at billing time
```

Invoice statuses:

- `pending` — sent to staff, not yet delivered
- `paid` — cash collected
- `credit` — signed, money outstanding
- `settled` — credit later paid
- `cancelled` — admin voided a pending bill; stock restored

Stock moves when the bill is created (counter is the source of truth). Cancel restores it.

Excel/CSV import upserts by SKU. Columns: `sku`, `name`, `unit`, `price`, `stock`, `category`.

---

## 5. Tech

| Layer | Choice | Why |
|---|---|---|
| Backend | Python **FastAPI** + SQLAlchemy + SQLite | Fast to run locally, one-file DB, easy to swap Postgres later |
| Auth | JWT, 7-day expiry | Staff should not re-login every delivery |
| Import | openpyxl | Real Excel `.xlsx` plus CSV |
| Frontend | **React + Vite + Tailwind** | Best fit for a phone signature UI and a counter POS |
| Signature | Custom canvas | Control over DPR, scroll lock, empty-ink check |
| Print | Dedicated route + print CSS | No modal hacks |

Shop display name / address live in `backend/app/config.py`.

---

## 6. API (all under `/api`)

- `POST /auth/login` · `GET /auth/me`
- `GET/POST /products` · `PUT/DELETE /products/:id` · `POST /products/import`
- `GET/POST /invoices` · `GET /invoices/:id`
- `POST /invoices/:id/deliver` `{ payment: "paid" \| "credit", signature? }`
- `POST /invoices/:id/settle` · `POST /invoices/:id/cancel`
- `GET /credits` · `GET /dashboard`

Staff tokens are rejected on inventory, billing, settle, and cancel.

---

## 7. Frontend structure

Two shells, same design tokens (workshop ledger: charcoal + brass/amber, serif brand, grotesk UI).

- Admin: sidebar on desktop, bottom nav on phone.
- Staff: phone column, thumb-reach primary actions.

Billing is optimized for a live phone call: search never loses focus, quantity steppers are fat, send button is always visible.

---

## 8. What “done” looks like for testing

1. Log in as admin, see seeded hardware SKUs.
2. Import the sample CSV (optional).
3. Create a bill for a shop, send to staff.
4. Log in as staff on a phone (or DevTools mobile view), open the receipt.
5. Save one as cash, one as credit with a signature.
6. Back as admin: print the signed invoice, see it under Creditors, mark it settled.

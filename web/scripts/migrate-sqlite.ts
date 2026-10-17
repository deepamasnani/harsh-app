/**
 * Copy harsh.db (old FastAPI app) into Neon Postgres.
 * Usage: npx tsx scripts/migrate-sqlite.ts
 */
import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";

const sqlitePath =
  process.env.SQLITE_PATH || path.resolve(__dirname, "../../backend/harsh.db");
if (!fs.existsSync(sqlitePath)) {
  console.error("SQLite file not found:", sqlitePath);
  process.exit(1);
}

const db = new Database(sqlitePath, { readonly: true });
const prisma = new PrismaClient();

function rows(sql: string) {
  return db.prepare(sql).all() as any[];
}

async function main() {
  const users = rows("SELECT * FROM users");
  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: { passwordHash: u.password_hash, role: u.role, fullName: u.full_name },
      create: {
        id: u.id,
        username: u.username,
        passwordHash: u.password_hash,
        role: u.role,
        fullName: u.full_name,
      },
    });
  }

  const products = rows("SELECT * FROM products");
  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {
        name: p.name,
        unit: p.unit,
        price: p.price,
        stock: p.stock,
        category: p.category,
        isActive: Boolean(p.is_active),
      },
      create: {
        id: p.id,
        sku: p.sku,
        name: p.name,
        unit: p.unit,
        price: p.price,
        stock: p.stock,
        category: p.category,
        isActive: Boolean(p.is_active),
      },
    });
  }

  const customers = rows("SELECT * FROM customers");
  for (const c of customers) {
    await prisma.customer.upsert({
      where: { nameKey: c.name_key },
      update: { name: c.name, phone: c.phone || "", shop: c.shop || "" },
      create: {
        id: c.id,
        name: c.name,
        nameKey: c.name_key,
        phone: c.phone || "",
        shop: c.shop || "",
      },
    });
  }

  const invoices = rows("SELECT * FROM invoices");
  for (const i of invoices) {
    await prisma.invoice.upsert({
      where: { number: i.number },
      update: {},
      create: {
        id: i.id,
        number: i.number,
        customerId: i.customer_id || null,
        customerName: i.customer_name,
        customerPhone: i.customer_phone || "",
        customerShop: i.customer_shop || "",
        notes: i.notes || "",
        status: i.status,
        subtotal: i.subtotal || 0,
        total: i.total || 0,
        amountPaid: i.amount_paid || 0,
        signaturePath: i.signature_path || null,
        createdAt: i.created_at ? new Date(i.created_at) : new Date(),
        deliveredAt: i.delivered_at ? new Date(i.delivered_at) : null,
        settledAt: i.settled_at ? new Date(i.settled_at) : null,
      },
    });
  }

  const items = rows("SELECT * FROM invoice_items");
  for (const it of items) {
    const exists = await prisma.invoiceItem.findFirst({
      where: { id: it.id },
    });
    if (exists) continue;
    await prisma.invoiceItem.create({
      data: {
        id: it.id,
        invoiceId: it.invoice_id,
        productId: it.product_id || null,
        sku: it.sku,
        name: it.name,
        unit: it.unit,
        quantity: it.quantity,
        unitPrice: it.unit_price,
        lineTotal: it.line_total,
      },
    });
  }

  try {
    const payments = rows("SELECT * FROM payments");
    for (const p of payments) {
      const exists = await prisma.payment.findFirst({ where: { id: p.id } });
      if (exists) continue;
      await prisma.payment.create({
        data: {
          id: p.id,
          invoiceId: p.invoice_id,
          amount: p.amount,
          kind: p.kind,
          note: p.note || "",
          createdAt: p.created_at ? new Date(p.created_at) : new Date(),
        },
      });
    }
  } catch {
    console.log("No payments table in sqlite");
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"User"', 'id'), coalesce((SELECT max(id) FROM "User"), 1))`
  );
  for (const table of ["Product", "Customer", "Invoice", "InvoiceItem", "Payment"]) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), coalesce((SELECT max(id) FROM "${table}"), 1))`
    );
  }

  console.log("Copied", {
    users: users.length,
    products: products.length,
    customers: customers.length,
    invoices: invoices.length,
    items: items.length,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

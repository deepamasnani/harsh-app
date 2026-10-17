/**
 * Wipe invoices, credits, customers, and products, then import a stock workbook.
 * Usage: npx tsx scripts/reset-import-stock.ts "/path/to/stock.xlsx"
 */
import fs from "fs";
import { PrismaClient } from "@prisma/client";
import { parseStockWorkbook } from "../lib/stock-import";

const file = process.argv[2];
if (!file || !fs.existsSync(file)) {
  console.error("Workbook not found:", file);
  process.exit(1);
}

const prisma = new PrismaClient();

async function resetSequences() {
  for (const table of ["Product", "Customer", "Invoice", "InvoiceItem", "Payment"]) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), 1, false)`
    );
  }
}

async function main() {
  const products = parseStockWorkbook(fs.readFileSync(file));
  if (!products.length) {
    console.error("No products parsed from", file);
    process.exit(1);
  }

  const deleted = await prisma.$transaction([
    prisma.payment.deleteMany(),
    prisma.invoiceItem.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.product.deleteMany(),
  ]);

  await resetSequences();

  const chunk = 100;
  for (let i = 0; i < products.length; i += chunk) {
    await prisma.product.createMany({ data: products.slice(i, i + chunk) });
  }

  const byCat = products.reduce<Record<string, number>>((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});

  console.log("Removed", {
    payments: deleted[0].count,
    invoiceItems: deleted[1].count,
    invoices: deleted[2].count,
    customers: deleted[3].count,
    products: deleted[4].count,
  });
  console.log("Imported", products.length, "SKUs", byCat);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

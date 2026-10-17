import { prisma } from "./db";
import { nameKey } from "./money";

export async function getOrCreateCustomer(name: string, phone = "", shopName = "") {
  const key = nameKey(name);
  if (!key) throw new Error("Customer name is required");
  const phoneTrim = (phone || "").trim();
  const shopTrim = (shopName || "").trim();
  const existing = await prisma.customer.findUnique({ where: { nameKey: key } });
  if (existing) {
    const nextPhone = phoneTrim || existing.phone;
    const nextShop = shopTrim || existing.shop;
    if (nextPhone !== existing.phone || nextShop !== existing.shop) {
      return prisma.customer.update({
        where: { id: existing.id },
        data: { phone: nextPhone, shop: nextShop },
      });
    }
    return existing;
  }
  return prisma.customer.create({
    data: {
      name: name.trim(),
      nameKey: key,
      phone: phoneTrim,
      shop: shopTrim || name.trim(),
    },
  });
}

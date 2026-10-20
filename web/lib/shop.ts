export function shop() {
  return {
    name: process.env.SHOP_NAME || "Meraki Edge Band",
    tagline: process.env.SHOP_TAGLINE || "PVC · Wood · Glass edge banding",
    address: process.env.SHOP_ADDRESS || "Main Market, Your Town",
    phone: process.env.SHOP_PHONE || "98765 43210",
    gstin: process.env.SHOP_GSTIN || "",
  };
}

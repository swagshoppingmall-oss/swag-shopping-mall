import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { DEMO_PRODUCTS } from "../lib/demo-products.js";

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

for (const product of DEMO_PRODUCTS) {
  await db.collection("products").doc(product.id).set({ ...product, updatedAt: new Date() }, { merge: true });
}
await db.collection("coupons").doc("WELCOME10").set({
  code: "WELCOME10", type: "percent", value: 10, maxDiscount: 25000,
  minOrder: 50000, active: true,
}, { merge: true });
console.log(`Seeded ${DEMO_PRODUCTS.length} products and WELCOME10. Create the first admin by setting its custom claim from a trusted Admin SDK environment.`);

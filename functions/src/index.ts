import { createHmac, timingSafeEqual } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { defineSecret } from "firebase-functions/params";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import Razorpay from "razorpay";

initializeApp();
const db = getFirestore();
const razorpayKeyId = defineSecret("RAZORPAY_KEY_ID");
const razorpayKeySecret = defineSecret("RAZORPAY_KEY_SECRET");

type CartLine = { productId: string; quantity: number };
type Address = { name: string; phone: string; line1: string; city: string; state: string; pincode: string };

function assertAddress(value: unknown): asserts value is Address {
  if (!value || typeof value !== "object") throw new HttpsError("invalid-argument", "Delivery address is required.");
  const address = value as Record<string, unknown>;
  if (["name", "phone", "line1", "city", "state", "pincode"].some((key) =>
    typeof address[key] !== "string" || !(address[key] as string).trim())) {
    throw new HttpsError("invalid-argument", "Complete all delivery address fields.");
  }
  if (!/^\d{10}$/.test(address.phone as string) || !/^\d{6}$/.test(address.pincode as string)) {
    throw new HttpsError("invalid-argument", "Enter a valid 10-digit phone and 6-digit PIN code.");
  }
}

function assertLines(value: unknown): asserts value is CartLine[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 50) {
    throw new HttpsError("invalid-argument", "Cart must contain between 1 and 50 products.");
  }
  for (const line of value) {
    if (!line || typeof line.productId !== "string" || !/^[\w-]{1,100}$/.test(line.productId) ||
      !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99) {
      throw new HttpsError("invalid-argument", "Cart contains an invalid product or quantity.");
    }
  }
  if (new Set(value.map((line: CartLine) => line.productId)).size !== value.length) {
    throw new HttpsError("invalid-argument", "Each product may appear only once in the cart.");
  }
}

async function getPricedItems(lines: CartLine[]) {
  const products = await Promise.all(lines.map(async (line) => {
    const snap = await db.collection("products").doc(line.productId).get();
    if (!snap.exists) throw new HttpsError("not-found", `Product ${line.productId} is no longer available.`);
    const product = snap.data()!;
    if (product.active === false || !Number.isInteger(product.stock) || product.stock < line.quantity) {
      throw new HttpsError("failed-precondition", `${product.name ?? "A product"} does not have enough stock.`);
    }
    if (!Number.isInteger(product.price) || product.price < 1) {
      throw new HttpsError("failed-precondition", `${product.name ?? "A product"} has an invalid price.`);
    }
    return { productId: line.productId, name: String(product.name), price: product.price, quantity: line.quantity };
  }));
  return products;
}

async function getDiscount(couponCode: unknown, subtotal: number) {
  if (typeof couponCode !== "string" || !couponCode.trim()) return 0;
  const normalizedCode = couponCode.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{1,40}$/.test(normalizedCode)) {
    throw new HttpsError("invalid-argument", "Discount code format is invalid.");
  }
  const couponSnap = await db.collection("coupons").doc(normalizedCode).get();
  const coupon = couponSnap.data();
  if (!couponSnap.exists || coupon?.active !== true ||
    (coupon.expiresAt && coupon.expiresAt.toMillis() < Date.now()) ||
    (coupon.minOrder && subtotal < coupon.minOrder)) {
    throw new HttpsError("failed-precondition", "This discount code is invalid or expired.");
  }
  return coupon.type === "percent"
    ? Math.min(Math.floor(subtotal * coupon.value / 100), coupon.maxDiscount ?? subtotal)
    : Math.min(coupon.value, subtotal);
}

export const createRazorpayOrder = onCall(
  { secrets: [razorpayKeyId, razorpayKeySecret], maxInstances: 10 },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Sign in before checkout.");
    const data = request.data as { items?: unknown; address?: unknown; couponCode?: unknown };
    assertLines(data?.items);
    assertAddress(data.address);

    const items = await getPricedItems(data.items);
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discount = await getDiscount(data.couponCode, subtotal);

    const total = Math.max(0, subtotal - discount);
    if (total < 1) throw new HttpsError("failed-precondition", "Order total must be at least ₹1.");
    const razorpay = new Razorpay({ key_id: razorpayKeyId.value(), key_secret: razorpayKeySecret.value() });
    const paymentOrder = await razorpay.orders.create({
      amount: total,
      currency: "INR",
      receipt: `bz_${request.auth.uid.slice(0, 10)}_${Date.now()}`,
      notes: { userId: request.auth.uid },
    });
    const draftRef = db.collection("checkoutDrafts").doc(String(paymentOrder.id));
    await draftRef.create({
      userId: request.auth.uid,
      customerEmail: typeof request.auth.token.email === "string" ? request.auth.token.email : null,
      items, address: data.address,
      subtotal, discount, total, couponCode: data.couponCode ?? null,
      paymentOrderId: paymentOrder.id, status: "pending", createdAt: FieldValue.serverTimestamp(),
    });
    return { orderId: paymentOrder.id, amount: total, currency: "INR", keyId: razorpayKeyId.value() };
  },
);

export const createCashOnDeliveryOrder = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in before checkout.");
  const data = request.data as { items?: unknown; address?: unknown; couponCode?: unknown };
  assertLines(data?.items);
  assertAddress(data.address);

  const items = await getPricedItems(data.items);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = await getDiscount(data.couponCode, subtotal);
  const total = Math.max(0, subtotal - discount);
  if (total < 1) throw new HttpsError("failed-precondition", "Order total must be at least ₹1.");

  const orderRef = db.collection("orders").doc();
  await db.runTransaction(async (transaction) => {
    const productRefs = items.map((item) => db.collection("products").doc(item.productId));
    const productSnaps = await Promise.all(productRefs.map((ref) => transaction.get(ref)));
    productSnaps.forEach((snap, index) => {
      const product = snap.data();
      const item = items[index];
      if (!snap.exists || !product || product.active === false || !Number.isInteger(product.stock) ||
        product.stock < item.quantity || product.price !== item.price) {
        throw new HttpsError("failed-precondition", `${item.name} is no longer available at the requested price and quantity.`);
      }
    });

    transaction.create(orderRef, {
      userId: request.auth!.uid,
      customerEmail: typeof request.auth!.token.email === "string" ? request.auth!.token.email : null,
      items,
      address: data.address,
      subtotal,
      discount,
      total,
      couponCode: typeof data.couponCode === "string" ? data.couponCode.trim().toUpperCase() || null : null,
      status: "confirmed",
      payment: { provider: "cod", method: "cod", status: "due" },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    productSnaps.forEach((snap, index) => {
      transaction.update(productRefs[index], { stock: snap.data()!.stock - items[index].quantity });
    });
  });
  return { orderId: orderRef.id };
});

export const verifyRazorpayPayment = onCall(
  { secrets: [razorpayKeyId, razorpayKeySecret], maxInstances: 10 },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Sign in before verifying payment.");
    const { razorpay_order_id: paymentOrderId, razorpay_payment_id: paymentId, razorpay_signature: signature } =
      request.data ?? {};
    if (typeof paymentOrderId !== "string" || typeof paymentId !== "string" || typeof signature !== "string") {
      throw new HttpsError("invalid-argument", "Payment verification details are incomplete.");
    }
    const expected = createHmac("sha256", razorpayKeySecret.value())
      .update(`${paymentOrderId}|${paymentId}`).digest("hex");
    const actualBytes = Buffer.from(signature, "hex");
    const expectedBytes = Buffer.from(expected, "hex");
    if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) {
      throw new HttpsError("permission-denied", "Payment signature verification failed.");
    }
    const razorpay = new Razorpay({ key_id: razorpayKeyId.value(), key_secret: razorpayKeySecret.value() });
    const payment = await razorpay.payments.fetch(paymentId);
    if (payment.order_id !== paymentOrderId || payment.status !== "captured" || payment.currency !== "INR") {
      throw new HttpsError("failed-precondition", "The payment is not captured for this order.");
    }

    const draftRef = db.collection("checkoutDrafts").doc(paymentOrderId);
    const orderRef = db.collection("orders").doc(paymentOrderId);
    const result = await db.runTransaction(async (transaction) => {
      const draftSnap = await transaction.get(draftRef);
      if (!draftSnap.exists) throw new HttpsError("not-found", "Checkout session has expired.");
      const draft = draftSnap.data()!;
      if (draft.userId !== request.auth!.uid) throw new HttpsError("permission-denied", "This checkout belongs to another user.");
      if (draft.total !== payment.amount) throw new HttpsError("failed-precondition", "Captured payment amount does not match the checkout total.");
      if (draft.status === "paid") return { orderId: paymentOrderId, alreadyProcessed: true };

      const productRefs = draft.items.map((item: { productId: string }) => db.collection("products").doc(item.productId));
      const productSnaps = await Promise.all(productRefs.map((ref: FirebaseFirestore.DocumentReference) => transaction.get(ref)));
      productSnaps.forEach((snap, index) => {
        const item = draft.items[index];
        const stock = snap.data()?.stock;
        if (!snap.exists || !Number.isInteger(stock) || stock < item.quantity) {
          throw new HttpsError("failed-precondition", `${item.name} is no longer available in the requested quantity.`);
        }
      });
      const order = {
        ...draft,
        status: "confirmed",
        payment: { provider: "razorpay", orderId: paymentOrderId, paymentId, verified: true },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      transaction.create(orderRef, order);
      productSnaps.forEach((snap, index) => {
        transaction.update(productRefs[index], { stock: snap.data()!.stock - draft.items[index].quantity });
      });
      transaction.create(db.collection("transactions").doc(paymentId), {
        userId: request.auth!.uid, orderId: paymentOrderId, paymentId, amount: draft.total,
        currency: "INR", status: "captured", provider: "razorpay",
        createdAt: FieldValue.serverTimestamp(),
      });
      transaction.update(draftRef, { status: "paid", paymentId, orderId: paymentOrderId });
      return { orderId: paymentOrderId, alreadyProcessed: false };
    });
    return result;
  },
);

export const updateOrderStatus = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to continue.");
  const caller = await getAuth().getUser(request.auth.uid);
  if (
    caller.customClaims?.admin !== true &&
    caller.email?.toLowerCase() !== "admin@swagshoppingmall.com"
  ) {
    throw new HttpsError("permission-denied", "Admin access is required.");
  }
  const { orderId, status } = request.data ?? {};
  const allowed = ["confirmed", "processing", "shipped", "delivered", "cancelled"];
  if (typeof orderId !== "string" || !allowed.includes(status)) {
    throw new HttpsError("invalid-argument", "Invalid order status.");
  }
  const ref = db.collection("orders").doc(orderId);
  await db.runTransaction(async (transaction) => {
    const order = await transaction.get(ref);
    if (!order.exists) throw new HttpsError("not-found", "Order not found.");
    if (order.data()?.status === "delivered" || order.data()?.status === "cancelled") {
      throw new HttpsError("failed-precondition", "A completed or cancelled order cannot be changed.");
    }
    transaction.update(ref, { status, updatedAt: FieldValue.serverTimestamp() });
  });
  return { success: true };
});

export const setAdminRole = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to continue.");
  const caller = await getAuth().getUser(request.auth.uid);
  if (caller.customClaims?.admin !== true) throw new HttpsError("permission-denied", "Only an existing admin can grant admin access.");
  const { uid, admin } = request.data ?? {};
  if (typeof uid !== "string" || typeof admin !== "boolean") throw new HttpsError("invalid-argument", "A user ID and role are required.");
  const target = await getAuth().getUser(uid);
  await getAuth().setCustomUserClaims(uid, { ...target.customClaims, admin });
  return { success: true };
});

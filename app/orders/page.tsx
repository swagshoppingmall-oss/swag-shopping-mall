"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check, MapPin, PackageCheck, ShoppingBag, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useStore } from "@/components/store-provider";
import { formatPrice } from "@/lib/utils";
import type { StoreOrder } from "@/lib/types";

function dateLabel(createdAt: StoreOrder["createdAt"]) {
  if (!createdAt) return "Just placed";
  const date = createdAt instanceof Date
    ? createdAt
    : typeof createdAt === "string"
      ? new Date(createdAt)
      : createdAt.toDate();
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

export default function OrdersPage() {
  const { user, orders, demoLoginEnabled, advanceDemoOrder } = useStore();
  const shouldReduceMotion = useReducedMotion();
  const [placedId, setPlacedId] = useState<string | null>(null);
  const [isDemoOrder, setIsDemoOrder] = useState(false);
  const [isCodOrder, setIsCodOrder] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setPlacedId(params.get("placed"));
    setIsDemoOrder(params.get("demo") === "1");
    setIsCodOrder(params.get("cod") === "1");
  }, []);
  const placedOrder = placedId ? orders.find((order) => order.id === placedId) : undefined;
  const placedItemCount = placedOrder?.items.reduce((quantity, item) => quantity + item.quantity, 0);
  const placedProgress = Math.max(0, ["confirmed", "processing", "shipped", "delivered"].indexOf(placedOrder?.status ?? "confirmed"));
  if (!user) return <div className="shell page-shell"><div className="empty-state"><PackageCheck size={34} /><h2>Your good things will be here.</h2><p>Sign in to see your orders and delivery updates.</p><Link href="/login?next=/orders" className="button button-dark">Sign in <ArrowRight size={16} /></Link></div></div>;
  return <div className="shell page-shell"><div className="page-heading"><span className="eyebrow">The journey home</span><h1>Your orders<span className="brand-dot">.</span></h1><p>All your good things, from our shelves to your door.</p></div>
    {placedId && <motion.section className="order-confirmation" aria-labelledby="order-confirmation-title"
      initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}>
      <div className="order-confirmation-art" aria-hidden="true">
        <motion.span className="order-confirmation-sparkle"
          initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.5, rotate: -25 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}><Sparkles size={22} /></motion.span>
        <motion.span className="order-confirmation-check"
          initial={shouldReduceMotion ? false : { scale: 0.55, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.12, type: "spring", stiffness: 220, damping: 14 }}><Check size={34} strokeWidth={3} /></motion.span>
      </div>
      <span className="eyebrow">{isDemoOrder ? "DEMO ORDER" : "ORDER CONFIRMED"}</span>
      <h2 id="order-confirmation-title">{isDemoOrder ? "Your demo order is in!" : "Good things are on their way!"}</h2>
      <p className="order-confirmation-message">
        {isDemoOrder ? "This was a preview order—no payment was processed." : isCodOrder ? "Your order is confirmed. Pay cash when it arrives." : "Payment received. Your order is confirmed."}
      </p>
      <p className="order-confirmation-number">Order #{placedId}</p>
      <div className="confirmation-progress" aria-label="Order progress">
        {["Confirmed", "Preparing", "On the way", "Delivered"].map((step, index) => {
          const complete = index <= placedProgress;
          return <div className={`confirmation-progress-step ${complete ? "complete" : ""}`} key={step}>
            <span>{complete ? <Check size={12} /> : index + 1}</span><small>{step}</small>
          </div>;
        })}
      </div>
      {placedOrder && <div className="order-confirmation-summary">
        <span><ShoppingBag size={15} /> {placedItemCount} {placedItemCount === 1 ? "item" : "items"}</span>
        {placedOrder.address?.city && <span><MapPin size={15} /> Delivering to {placedOrder.address.city}</span>}
        <strong>{formatPrice(placedOrder.total)}</strong>
      </div>}
      <div className="order-confirmation-actions">
        {placedOrder
          ? <a className="button button-dark" href="#placed-order">Track this order <ArrowRight size={16} /></a>
          : <button className="button button-dark confirmation-track-pending" type="button" disabled>Loading order details…</button>}
        <Link className="button button-outline" href="/">Continue shopping</Link>
      </div>
    </motion.section>}
    {orders.length ? <div className="orders-list">{orders.map((order) => <OrderCard key={order.id} order={order} highlight={order.id === placedId} demoMode={demoLoginEnabled && user.isDemo === true} onAdvance={() => advanceDemoOrder(order.id)} />)}</div> : placedId ? <p className="order-history-loading">Loading your order details…</p> : <div className="empty-state"><PackageCheck size={34} /><h2>No orders yet.</h2><p>Your next everyday favourite is just around the corner.</p><Link href="/" className="button button-dark">Find something good</Link></div>}
  </div>;
}

function OrderCard({ order, highlight, demoMode, onAdvance }: { order: StoreOrder; highlight: boolean; demoMode: boolean; onAdvance: () => void }) {
  const steps = ["confirmed", "processing", "shipped", "delivered"];
  const current = steps.indexOf(order.status);
  return <article id={highlight ? "placed-order" : undefined} className={`order-card ${highlight ? "highlight-order" : ""}`}><div className="order-card-top"><div><span className="product-category">ORDER #{order.id.slice(-10).toUpperCase()}</span><h2>{dateLabel(order.createdAt)}</h2></div><span className={`order-status status-${order.status}`}>{order.status}</span></div>
    <div className="order-items">{order.items.map((item, index) => <div className="order-item" key={`${item.productId}-${item.option ?? "default"}-${index}`}><span>{item.quantity} × {item.name}{item.option ? ` · Size ${item.option}` : ""}</span><strong>{formatPrice(item.price * item.quantity)}</strong></div>)}</div>
    <div className="order-card-bottom"><span>Delivering to {order.address.city}, {order.address.state}</span><strong>{order.payment?.provider === "demo" ? `${order.payment.method === "cod" ? "Demo · Cash on delivery" : "Demo · Payment simulated"} · ${formatPrice(order.total)}` : order.payment?.provider === "cod" ? `Cash due on delivery · ${formatPrice(order.total)}` : `Total paid · ${formatPrice(order.total)}`}</strong></div>
    {order.status !== "cancelled" && <div className="order-progress">{steps.map((step, index) => <span key={step} className={index <= current ? "complete" : ""}><i />{step}</span>)}</div>}
    {demoMode && order.status !== "delivered" && order.status !== "cancelled" && <button className="demo-track-button" onClick={onAdvance}>Advance demo tracking →</button>}
  </article>;
}

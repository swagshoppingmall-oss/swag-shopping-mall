"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, PackageCheck } from "lucide-react";
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
  const [placedId, setPlacedId] = useState<string | null>(null);
  const [isDemoOrder, setIsDemoOrder] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setPlacedId(params.get("placed"));
    setIsDemoOrder(params.get("demo") === "1");
  }, []);
  if (!user) return <div className="shell page-shell"><div className="empty-state"><PackageCheck size={34} /><h2>Your good things will be here.</h2><p>Sign in to see your orders and delivery updates.</p><Link href="/login?next=/orders" className="button button-dark">Sign in <ArrowRight size={16} /></Link></div></div>;
  return <div className="shell page-shell"><div className="page-heading"><span className="eyebrow">The journey home</span><h1>Your orders<span className="brand-dot">.</span></h1><p>All your good things, from our shelves to your door.</p></div>
    {placedId && <div className="success-banner"><span>✓</span><div><strong>{isDemoOrder ? "Demo order placed. No payment was processed." : "Payment received. Your order is confirmed."}</strong><small>Order #{placedId} · We’ll get your good things ready.</small></div></div>}
    {orders.length ? <div className="orders-list">{orders.map((order) => <OrderCard key={order.id} order={order} highlight={order.id === placedId} demoMode={demoLoginEnabled && user.isDemo === true} onAdvance={() => advanceDemoOrder(order.id)} />)}</div> : <div className="empty-state"><PackageCheck size={34} /><h2>No orders yet.</h2><p>Your next everyday favourite is just around the corner.</p><Link href="/" className="button button-dark">Find something good</Link></div>}
  </div>;
}

function OrderCard({ order, highlight, demoMode, onAdvance }: { order: StoreOrder; highlight: boolean; demoMode: boolean; onAdvance: () => void }) {
  const steps = ["confirmed", "processing", "shipped", "delivered"];
  const current = steps.indexOf(order.status);
  return <article className={`order-card ${highlight ? "highlight-order" : ""}`}><div className="order-card-top"><div><span className="product-category">ORDER #{order.id.slice(-10).toUpperCase()}</span><h2>{dateLabel(order.createdAt)}</h2></div><span className={`order-status status-${order.status}`}>{order.status}</span></div>
    <div className="order-items">{order.items.map((item) => <div className="order-item" key={item.productId}><span>{item.quantity} × {item.name}</span><strong>{formatPrice(item.price * item.quantity)}</strong></div>)}</div>
    <div className="order-card-bottom"><span>Delivering to {order.address.city}, {order.address.state}</span><strong>{order.payment?.provider === "demo" ? `${order.payment.method === "cod" ? "Demo · Cash on delivery" : "Demo · Payment simulated"} · ${formatPrice(order.total)}` : `Total paid · ${formatPrice(order.total)}`}</strong></div>
    {order.status !== "cancelled" && <div className="order-progress">{steps.map((step, index) => <span key={step} className={index <= current ? "complete" : ""}><i />{step}</span>)}</div>}
    {demoMode && order.status !== "delivered" && order.status !== "cancelled" && <button className="demo-track-button" onClick={onAdvance}>Advance demo tracking →</button>}
  </article>;
}

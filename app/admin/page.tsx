"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { BarChart3, Boxes, Eye, Mail, MapPin, PackageCheck, Pencil, Phone, Plus, Settings, ShoppingBag, Tags, Trash2, UserRound, X } from "lucide-react";
import { useStore } from "@/components/store-provider";
import { auth, db, firebaseConfigured, functions } from "@/lib/firebase";
import type { Product, StoreOrder } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

const blankProduct: Omit<Product, "id"> = { name: "", category: "Grocery", price: 0, mrp: 0, unit: "", stock: 0, rating: 0, reviews: 0, image: "", images: [], description: "", hasSizeOptions: false, sizeOptions: [], sizePrices: {}, tags: [], active: true };
type ProductForm = typeof blankProduct;

function isFashionCategory(category: string) {
  return /fashion|apparel|clothing|footwear|shoes/i.test(category);
}

function defaultSizeOptions(category: string) {
  return /footwear|shoes/i.test(category) ? "6, 7, 8, 9, 10, 11" : "S, M, L, XL, XXL";
}

function initialSizePricing(product: Product | null, category: string) {
  const options = product?.sizeOptions?.length ? product.sizeOptions : defaultSizeOptions(category).split(",").map((option) => option.trim());
  if (!product) return options.map((option) => `${option}: `).join("\n");
  return options.map((option) => `${option}: ${((product.sizePrices?.[option] ?? product.price) / 100).toFixed(2)}`).join("\n");
}

export default function AdminPage() {
  const {
    user, isAdmin, products, categories, categoryImages, saveCategory, deleteCategory, orders: demoOrders, demoLoginEnabled,
    cashOnDeliveryEnabled, setCashOnDeliveryEnabled,
    saveDemoProduct, deleteDemoProduct, setDemoOrderStatus,
  } = useStore();
  const [liveOrders, setLiveOrders] = useState<StoreOrder[]>([]);
  const orders = demoLoginEnabled && user?.isDemo ? demoOrders : liveOrders;
  const [activeTab, setActiveTab] = useState<"overview" | "products" | "orders" | "settings" | "categories">("overview");
  const [editing, setEditing] = useState<Product | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<StoreOrder | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryImage, setCategoryImage] = useState("");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [categoryBusy, setCategoryBusy] = useState(false);

  useEffect(() => {
    if (!isAdmin || !firebaseConfigured || user?.isDemo) return;
    return onSnapshot(query(collection(db, "orders"), orderBy("createdAt", "desc")), (snapshot) => {
      setLiveOrders(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as StoreOrder)));
    }, (cause) => setError(cause.message));
  }, [isAdmin, user]);

  const metrics = useMemo(() => {
    const paid = orders.filter((order) => order.status !== "cancelled");
    const revenue = paid.reduce((total, order) => total + order.total, 0);
    const sales = new Map<string, { name: string; quantity: number }>();
    const today = new Date();
    const weeklySales = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      return { date, key: date.toISOString().slice(0, 10), revenue: 0 };
    });
    const weeklySalesByDate = new Map(weeklySales.map((day) => [day.key, day]));
    paid.forEach((order) => order.items.forEach((item) => {
      const previous = sales.get(item.productId) ?? { name: item.name, quantity: 0 };
      previous.quantity += item.quantity;
      sales.set(item.productId, previous);
    }));
    paid.forEach((order) => {
      const createdAt = order.createdAt;
      const date = createdAt
        ? createdAt instanceof Date
          ? createdAt
          : typeof createdAt === "string"
            ? new Date(createdAt)
            : createdAt.toDate()
        : null;
      const day = date && weeklySalesByDate.get(date.toISOString().slice(0, 10));
      if (day) day.revenue += order.total;
    });
    return {
      revenue, orderCount: orders.length,
      weeklyRevenue: weeklySales.reduce((total, day) => total + day.revenue, 0),
      weeklySales,
      topProducts: [...sales.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5),
    };
  }, [orders]);

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const hasSizeOptions = form.get("hasSizeOptions") === "true";
    const returnAvailable = form.get("returnAvailable") === "true";
    const returnDays = Number(form.get("returnDays"));
    const sizePricingText = String(form.get("sizePricing") ?? "");
    const sizePricingRows = hasSizeOptions ? sizePricingText.split("\n").filter((line) => line.trim()).map((line) => {
      const separator = line.lastIndexOf(":");
      const option = separator < 1 ? "" : line.slice(0, separator).trim();
      const rawPrice = separator < 1 ? "" : line.slice(separator + 1).trim();
      const price = Number(rawPrice);
      return { option, price, valid: Boolean(option) && Boolean(rawPrice) && Number.isFinite(price) && price > 0 };
    }) : [];
    const options = sizePricingRows.map((row) => row.option);
    if (hasSizeOptions && (!sizePricingRows.length ||
      sizePricingRows.some((row) => !row.valid) ||
      new Set(options).size !== options.length)) {
      setError("Enter each size once with a price in rupees, one per line (for example “M: 499”).");
      setBusy(false);
      return;
    }
    if (returnAvailable && (!Number.isInteger(returnDays) || returnDays < 1)) {
      setError("Enter a whole number of at least 1 for the return window.");
      setBusy(false);
      return;
    }
    const sizePrices = Object.fromEntries(sizePricingRows.map(({ option, price }) => [option, Math.round(price * 100)]));
    const product: ProductForm = {
      name: String(form.get("name")).trim(), category: String(form.get("category")),
      price: hasSizeOptions ? Math.min(...Object.values(sizePrices)) : Math.round(Number(form.get("price")) * 100),
      mrp: Math.round(Number(form.get("mrp")) * 100),
      unit: String(form.get("unit")).trim(), stock: Number(form.get("stock")), rating: Number(form.get("rating")),
      reviews: editing?.reviews ?? 0,
      image: String(form.get("image")).trim(),
      images: [...new Set(["image", "image2", "image3"].map((field) => String(form.get(field) ?? "").trim()).filter(Boolean))],
      description: String(form.get("description")).trim(),
      specifications: parseSpecifications(String(form.get("specifications") ?? "")),
      hasSizeOptions,
      sizeOptions: options,
      sizePrices,
      tags: String(form.get("tags")).split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean), active: true,
      returnAvailable,
      returnDays: returnAvailable ? returnDays : editing?.returnDays ?? 7,
    };
    const specificationsText = String(form.get("specifications") ?? "");
    if (specificationsText.split("\n").some((line) => {
      if (!line.trim()) return false;
      const separator = line.indexOf(":");
      return separator < 1 || !line.slice(0, separator).trim() || !line.slice(separator + 1).trim();
    })) {
      setError("Enter each specification as “Label: value”, one per line, with both fields filled in.");
      setBusy(false);
      return;
    }
    try {
      if (demoLoginEnabled && user?.isDemo) saveDemoProduct(product, editing?.id);
      else if (editing) await updateDoc(doc(db, "products", editing.id), { ...product, updatedAt: serverTimestamp() });
      else await addDoc(collection(db, "products"), { ...product, updatedAt: serverTimestamp() });
      setEditing(null);
      setAdding(false);
    } catch (cause) {
      setError(productWriteError(cause, "Product could not be saved."));
    } finally { setBusy(false); }
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`Remove “${product.name}” from the catalog?`)) return;
    try {
      if (demoLoginEnabled && user?.isDemo) deleteDemoProduct(product.id);
      else await deleteDoc(doc(db, "products", product.id));
    }
    catch (cause) { setError(productWriteError(cause, "Product could not be removed.")); }
  }

  async function changeStatus(orderId: string, status: string) {
    setError("");
    try {
      if (demoLoginEnabled && user?.isDemo) setDemoOrderStatus(orderId, status);
      else {
        const updateStatus = httpsCallable(functions, "updateOrderStatus");
        await updateStatus({ orderId, status });
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Order status could not be updated."); }
  }

  async function updateCashOnDelivery(enabled: boolean) {
    setError("");
    setSettingsBusy(true);
    try {
      await setCashOnDeliveryEnabled(enabled);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Payment settings could not be updated.");
    } finally {
      setSettingsBusy(false);
    }
  }

  async function submitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setCategoryBusy(true);
    try {
      await saveCategory(categoryName, editingCategory ?? undefined, categoryImage);
      setCategoryName("");
      setCategoryImage("");
      setEditingCategory(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Category could not be saved.");
    } finally {
      setCategoryBusy(false);
    }
  }

  async function removeCategory(name: string) {
    if (!window.confirm(`Delete the “${name}” category?`)) return;
    setError("");
    setCategoryBusy(true);
    try {
      await deleteCategory(name);
      if (editingCategory === name) {
        setEditingCategory(null);
        setCategoryName("");
        setCategoryImage("");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Category could not be deleted.");
    } finally {
      setCategoryBusy(false);
    }
  }

  if (!user || !isAdmin) return <div className="shell page-shell"><div className="empty-state"><span className="admin-lock">✳</span><h2>Admin studio.</h2><p>{!user ? "Sign in with an administrator account to manage Swag Shopping Mall." : "This account doesn't have administrator access."}</p><Link href={!user ? "/login" : "/"} className="button button-dark">{!user ? "Sign in" : "Back to shop"}</Link></div></div>;
  return <div className="admin-shell"><aside className="admin-sidebar"><Link href="/" className="brand"><span className="brand-mark">S</span><span>Swag Shopping Mall</span></Link><span className="admin-eyebrow">ADMIN STUDIO</span>{(["overview", "products", "categories", "orders", "settings"] as const).map((tab) => <button key={tab} className={`admin-nav ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>{tab === "overview" ? <BarChart3 size={18} /> : tab === "products" ? <Boxes size={18} /> : tab === "orders" ? <ShoppingBag size={18} /> : tab === "categories" ? <Tags size={18} /> : <Settings size={18} />}{tab[0].toUpperCase() + tab.slice(1)}</button>)}<Link href="/" className="admin-back">← Back to storefront</Link></aside>
    <main className="admin-main"><div className="admin-topbar"><div><span className="eyebrow">YOUR SWAG SHOPPING MALL, AT A GLANCE</span><h1>{activeTab === "overview" ? "A good day to grow." : activeTab === "products" ? "Your shelves." : activeTab === "orders" ? "The journey home." : activeTab === "categories" ? "Your collections." : "Store settings."}</h1></div><span className="admin-user"><span className="admin-avatar">{(user.displayName ?? user.email ?? "A")[0].toUpperCase()}</span>{user.displayName ?? user.email}</span></div>
      {demoLoginEnabled && user.isDemo && <div className="demo-catalog-note"><span>✦</span><p><strong>Demo admin workspace.</strong> Changes to products and order statuses are saved only in this browser.</p></div>}
      {error && <p className="form-error admin-error">{error}</p>}
      {activeTab === "overview" && <><div className="metric-grid"><Metric icon={<BarChart3 />} label="Total revenue" value={formatPrice(metrics.revenue)} note="From confirmed orders" /><Metric icon={<ShoppingBag />} label="Orders placed" value={String(metrics.orderCount)} note={`${orders.filter((order) => ["confirmed", "processing"].includes(order.status)).length} need attention`} /><Metric icon={<PackageCheck />} label="Items listed" value={String(products.length)} note={`${products.filter((product) => product.stock < 10).length} running low`} /><Metric icon={<BarChart3 />} label="Sales · last 7 days" value={formatPrice(metrics.weeklyRevenue)} note="Rolling seven-day revenue" /></div>
        <div className="admin-panels"><section className="admin-panel"><div className="panel-heading"><div><span className="eyebrow">ON THE MOVE</span><h2>Recent orders</h2></div><button onClick={() => setActiveTab("orders")} className="text-link">See all →</button></div>{orders.slice(0, 5).length ? orders.slice(0, 5).map((order) => <div className="recent-order" key={order.id}><span className="recent-order-icon"><ShoppingBag size={16} /></span><span><strong>{order.address?.name ?? "Customer"}</strong><small>#{order.id.slice(-8).toUpperCase()} · {order.items.length} items</small></span><b>{formatPrice(order.total)}</b><span className={`order-status status-${order.status}`}>{order.status}</span></div>) : <p className="admin-empty">Your first order is just around the corner.</p>}</section><section className="admin-panel"><div className="panel-heading"><div><span className="eyebrow">CUSTOMER FAVOURITES</span><h2>Top-selling products</h2></div></div>{metrics.topProducts.length ? metrics.topProducts.map((item, index) => <div className="top-product" key={item.name}><span className="top-rank">0{index + 1}</span><strong>{item.name}</strong><span>{item.quantity} sold</span></div>) : <p className="admin-empty">The bestsellers will show up after your first sale.</p>}</section></div>
        <section className="admin-panel sales-panel"><div className="panel-heading"><div><span className="eyebrow">A WEEK IN THE MAKING</span><h2>Revenue, day by day</h2></div><strong>{formatPrice(metrics.weeklyRevenue)}</strong></div><div className="sales-chart">{metrics.weeklySales.map((day) => { const peak = Math.max(...metrics.weeklySales.map((item) => item.revenue), 1); return <div className="sales-day" key={day.key}><span>{day.revenue ? formatPrice(day.revenue) : "—"}</span><div className="sales-bar-track"><i style={{ height: `${Math.max(day.revenue ? day.revenue / peak * 100 : 0, 3)}%` }} /></div><small>{day.date.toLocaleDateString("en-IN", { weekday: "short" })}</small></div>; })}</div></section></>}
      {activeTab === "products" && <section className="admin-panel admin-table-panel"><div className="panel-heading"><div><span className="eyebrow">THE GOOD STUFF</span><h2>{products.length} products on the shelf</h2></div><button className="button button-dark admin-add" onClick={() => { setEditing(null); setAdding(true); }}><Plus size={16} /> Add product</button></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Product</th><th>Category</th><th>Size options</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td><span className="table-product"><img src={product.image} alt="" /><span><strong>{product.name}</strong><small>{product.unit}</small></span></span></td><td>{product.category}</td><td>{product.hasSizeOptions ? <span className="admin-size-options-enabled">Enabled · {product.sizeOptions?.join(", ")}</span> : <span className="admin-size-options-disabled">Disabled</span>}</td><td>{formatPrice(product.price)}</td><td><span className={product.stock < 10 ? "low-stock" : ""}>{product.stock} units</span></td><td><span className="table-actions"><button onClick={() => { setEditing(product); setAdding(true); }} aria-label={`Edit ${product.name}`}><Pencil size={16} /></button><button onClick={() => deleteProduct(product)} aria-label={`Delete ${product.name}`}><Trash2 size={16} /></button></span></td></tr>)}</tbody></table></div></section>}
      {activeTab === "categories" && <section className="admin-panel">
        <div className="panel-heading"><div><span className="eyebrow">ORGANIZE THE SHOP</span><h2>Product categories</h2></div></div>
        <form className="category-admin-form" onSubmit={submitCategory}>
          <label>{editingCategory ? "Update category name" : "New category"}<input value={categoryName} maxLength={40} required placeholder="e.g. Personal Care" onChange={(event) => setCategoryName(event.target.value)} /></label>
          <label className="category-image-field">Category image URL <span>Optional</span><input type="url" value={categoryImage} placeholder="https://..." onChange={(event) => setCategoryImage(event.target.value)} /></label>
          {categoryImage && <img className="category-image-preview" src={categoryImage} alt="Category preview" />}
          <button className="button button-dark" disabled={categoryBusy || !categoryName.trim()}>{categoryBusy ? "Saving..." : editingCategory ? "Save changes" : <><Plus size={15} /> Add category</>}</button>
          {editingCategory && <button type="button" className="button button-outline" disabled={categoryBusy} onClick={() => { setEditingCategory(null); setCategoryName(""); setCategoryImage(""); }}>Cancel</button>}
        </form>
        <div className="category-admin-list">{categories.map((name) => <div className="category-admin-row" key={name}>
          <span className="category-admin-info">{categoryImages[name] ? <img src={categoryImages[name]} alt="" /> : <span className="category-admin-placeholder"><Tags size={17} /></span>}<span><strong>{name}</strong><small>{products.filter((product) => product.category === name).length} products</small></span></span>
          <span className="table-actions"><button disabled={categoryBusy} aria-label={`Edit ${name}`} onClick={() => { setEditingCategory(name); setCategoryName(name); setCategoryImage(categoryImages[name] ?? ""); }}><Pencil size={16} /></button><button disabled={categoryBusy} aria-label={`Delete ${name}`} onClick={() => removeCategory(name)}><Trash2 size={16} /></button></span>
        </div>)}</div>
      </section>}
      {activeTab === "orders" && <section className="admin-panel admin-table-panel"><div className="panel-heading"><div><span className="eyebrow">CUSTOMER ORDERS</span><h2>{orders.length} orders</h2></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Order / customer</th><th>Items</th><th>Order total</th><th>Status</th><th>Manage</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><span className="table-customer"><strong>{order.address?.name ?? "Customer"}</strong><small>#{order.id.slice(-9).toUpperCase()} · {order.address?.city}</small></span></td><td>{order.items.map((item) => `${item.quantity} × ${item.name}${item.option ? ` · Size ${item.option}` : ""}`).join(", ")}</td><td>{formatPrice(order.total)}</td><td><span className={`order-status status-${order.status}`}>{order.status}</span></td><td><span className="order-manage"><button className="customer-details-button" onClick={() => setSelectedOrder(order)}><Eye size={14} /> Customer details</button><select className="status-select" aria-label="Update order status" value={order.status} onChange={(event) => changeStatus(order.id, event.target.value)}>{["confirmed", "processing", "shipped", "delivered", "cancelled"].map((status) => <option key={status}>{status}</option>)}</select></span></td></tr>)}</tbody></table></div></section>}
      {activeTab === "settings" && <section className="admin-panel"><div className="panel-heading"><div><span className="eyebrow">CHECKOUT OPTIONS</span><h2>Payment methods</h2></div></div><div className="payment-setting"><div><strong>Cash on delivery</strong><p>Allow customers to pay in cash when their order is delivered. This setting is disabled by default.</p><small>Status: {cashOnDeliveryEnabled ? "Enabled" : "Disabled"}</small></div><button type="button" className={`payment-setting-toggle ${cashOnDeliveryEnabled ? "enabled" : ""}`} role="switch" aria-checked={cashOnDeliveryEnabled} aria-label="Enable cash on delivery" disabled={settingsBusy} onClick={() => updateCashOnDelivery(!cashOnDeliveryEnabled)}><span /></button></div></section>}
    </main>
    {adding && <ProductModal product={editing} categories={categories} busy={busy} onClose={() => { setAdding(false); setEditing(null); }} onSubmit={saveProduct} />}
    {selectedOrder && <CustomerDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
  </div>;
}

function productWriteError(cause: unknown, fallback: string) {
  if (
    typeof cause === "object" &&
    cause !== null &&
    "code" in cause &&
    cause.code === "permission-denied"
  ) {
    return "Firestore denied this request. Deploy firestore.rules and confirm this account has the admin claim; sign out and back in after setting the claim.";
  }
  return cause instanceof Error ? cause.message : fallback;
}

function parseSpecifications(value: string): Record<string, string> {
  return Object.fromEntries(value.split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.indexOf(":");
      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
    }));
}

function Metric({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note: string }) {
  return <article className="metric-card"><div className="metric-icon">{icon}</div><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function ProductModal({ product, categories, busy, onClose, onSubmit }: { product: Product | null; categories: string[]; busy: boolean; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const initialCategory = product?.category ?? categories[0] ?? "Grocery";
  const [category, setCategory] = useState(initialCategory);
  const [hasSizeOptions, setHasSizeOptions] = useState(product?.hasSizeOptions ?? isFashionCategory(initialCategory));
  const [sizePricing, setSizePricing] = useState(initialSizePricing(product, initialCategory));
  const [returnAvailable, setReturnAvailable] = useState(product?.returnAvailable !== false);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><form className="product-modal" onSubmit={onSubmit}><div className="modal-heading"><div><span className="eyebrow">THE SWAG SHOPPING MALL SHELF</span><h2>{product ? "A little update." : "Something good."}</h2></div><button type="button" onClick={onClose} aria-label="Close"><X size={19} /></button></div><div className="form-grid">
    <label className="field-wide">Product name<input name="name" required defaultValue={product?.name ?? ""} /></label>
    <label>Category<select name="category" value={category} onChange={(event) => {
      const nextCategory = event.target.value;
      setCategory(nextCategory);
      if (!product && isFashionCategory(nextCategory)) setHasSizeOptions(true);
      if (!product) setSizePricing(initialSizePricing(null, nextCategory));
    }} required>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
    <label>Pack / unit<input name="unit" required placeholder="e.g. 1 kg" defaultValue={product?.unit ?? ""} /></label>
    {hasSizeOptions
      ? <p className="field-wide size-price-note">The product’s starting price will be set automatically to its lowest size price.</p>
      : <label>Selling price (₹)<input name="price" type="number" min="1" step="0.01" required defaultValue={product ? product.price / 100 : ""} /></label>}
    <label>Original price (₹)<input name="mrp" type="number" min="1" step="0.01" required defaultValue={product ? product.mrp / 100 : ""} /></label>
    <label>Stock quantity<input name="stock" type="number" min="0" required defaultValue={product?.stock ?? 0} /></label>
    <label>Rating (0–5)<input name="rating" type="number" min="0" max="5" step="0.1" required defaultValue={product?.rating ?? 0} /></label>
    <div className="field-wide admin-product-images">
      <div><strong>Product images</strong><small>Add up to 3 image URLs. The first image appears in the catalog; customers can switch views on the product page.</small></div>
      <label>Main image URL<input name="image" type="url" required placeholder="https://..." defaultValue={product?.images?.[0] ?? product?.image ?? ""} /></label>
      <label>Second image URL <span>Optional</span><input name="image2" type="url" placeholder="https://..." defaultValue={product?.images?.[1] ?? ""} /></label>
      <label>Third image URL <span>Optional</span><input name="image3" type="url" placeholder="https://..." defaultValue={product?.images?.[2] ?? ""} /></label>
    </div>
    <label className="field-wide">Description<textarea name="description" rows={3} required defaultValue={product?.description ?? ""} /></label>
    <label className="field-wide size-options-toggle">
      <input type="checkbox" name="hasSizeOptions" value="true" checked={hasSizeOptions} onChange={(event) => setHasSizeOptions(event.target.checked)} />
      <span><strong>Customers must choose a size</strong><small>Enable for apparel, footwear, or any product with options.</small></span>
    </label>
    {hasSizeOptions && <label className="field-wide">Size and price (₹)<textarea name="sizePricing" rows={5} required value={sizePricing} onChange={(event) => setSizePricing(event.target.value)} placeholder={/footwear|shoes/i.test(category) ? "6: 699\n7: 699\n8: 749" : "S: 499\nM: 499\nL: 549\nXL: 599"} /><small>One option per line as “Size: price”. Prices are entered in rupees. Example: XL: 599.</small></label>}
    <label className="field-wide size-options-toggle">
      <input type="checkbox" name="returnAvailable" value="true" checked={returnAvailable} onChange={(event) => setReturnAvailable(event.target.checked)} />
      <span><strong>Returns available</strong><small>Let customers return this product within a set number of days.</small></span>
    </label>
    {returnAvailable && <label>Return window (days)<input name="returnDays" type="number" min="1" step="1" required defaultValue={product?.returnDays ?? 7} /></label>}
    <label className="field-wide">Product specifications<textarea name="specifications" rows={4} placeholder={"Material: 100% cotton\nCare: Machine washable"} defaultValue={Object.entries(product?.specifications ?? {}).map(([label, value]) => `${label}: ${value}`).join("\n")} /><small>One specification per line, in “Label: value” format.</small></label>
    <label className="field-wide">Tags, comma separated<input name="tags" placeholder="popular, organic" defaultValue={product?.tags?.join(", ") ?? ""} /></label>
  </div><div className="modal-actions"><button type="button" className="button button-outline" onClick={onClose}>Cancel</button><button className="button button-dark" disabled={busy}>{busy ? "Saving..." : product ? "Save changes" : "Add to shelf"}</button></div></form></div>;
}

function CustomerDetailsModal({ order, onClose }: { order: StoreOrder; onClose: () => void }) {
  const [customerEmail, setCustomerEmail] = useState(order.customerEmail ?? "");
  const [emailError, setEmailError] = useState("");
  useEffect(() => {
    if (customerEmail || !firebaseConfigured || order.userId.startsWith("bazaar-demo-")) return;
    let active = true;
    getDoc(doc(db, "users", order.userId)).then((snapshot) => {
      if (active && snapshot.exists() && typeof snapshot.data().email === "string") {
        setCustomerEmail(snapshot.data().email);
      }
    }).catch((cause: unknown) => {
      if (active) setEmailError(cause instanceof Error ? cause.message : "Could not load the customer profile.");
    });
    return () => { active = false; };
  }, [customerEmail, order.userId]);
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="customer-details-modal" role="dialog" aria-modal="true" aria-labelledby="customer-details-title">
      <div className="modal-heading"><div><span className="eyebrow">ORDER #{order.id.slice(-9).toUpperCase()}</span><h2 id="customer-details-title">Customer details</h2></div><button type="button" onClick={onClose} aria-label="Close customer details"><X size={19} /></button></div>
      <div className="customer-profile-card"><span className="customer-profile-avatar"><UserRound size={22} /></span><span><strong>{order.address?.name || "Name not provided"}</strong><small>Customer account · {order.userId}</small></span></div>
      <div className="customer-details-grid">
        <CustomerDetail icon={<Mail size={16} />} label="Email address" value={customerEmail || (emailError ? "Could not load customer email" : "Not available for this order")} />
        <CustomerDetail icon={<Phone size={16} />} label="Phone number" value={order.address?.phone || "Not provided"} />
        <CustomerDetail icon={<MapPin size={16} />} label="Delivery address" value={[order.address?.line1, order.address?.city, order.address?.state, order.address?.pincode].filter(Boolean).join(", ") || "Address not available"} wide />
      </div>
      {emailError && <p className="form-error customer-email-error">{emailError}</p>}
      <div className="customer-order-summary"><div><span>Order total</span><strong>{formatPrice(order.total)}</strong></div><div><span>Order status</span><strong className={`order-status status-${order.status}`}>{order.status}</strong></div><div><span>Items</span><strong>{order.items.reduce((total, item) => total + item.quantity, 0)} items · {order.items.map((item) => `${item.name}${item.option ? ` (size ${item.option})` : ""}`).join(", ")}</strong></div><div><span>Payment</span><strong>{order.payment?.provider === "demo" ? "Demo payment · Not charged" : order.payment?.provider === "razorpay" ? "Razorpay · Verified" : order.payment?.provider || "Not recorded"}</strong></div></div>
      <div className="modal-actions"><button type="button" className="button button-dark" onClick={onClose}>Done</button></div>
    </section>
  </div>;
}

function CustomerDetail({ icon, label, value, wide = false }: { icon: React.ReactNode; label: string; value: string; wide?: boolean }) {
  return <div className={`customer-detail ${wide ? "field-wide" : ""}`}><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></div>;
}

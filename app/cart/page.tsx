"use client";

import Link from "next/link";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useStore } from "@/components/store-provider";
import { getProductPrice, hasProductOptions, isCartOptionValid, parseCartLineKey } from "@/lib/cart";
import { formatPrice } from "@/lib/utils";

export default function CartPage() {
  const { products, cart, setQuantity, removeFromCart } = useStore();
  const lines = Object.entries(cart).map(([key, quantity]) => {
    const { productId, option } = parseCartLineKey(key);
    return {
      key,
      option,
      product: products.find((item) => item.id === productId),
      quantity,
      productQuantity: Object.entries(cart).reduce((total, [otherKey, otherQuantity]) =>
        parseCartLineKey(otherKey).productId === productId ? total + otherQuantity : total, 0),
    };
  }).filter((line) => line.product);
  const subtotal = lines.reduce((sum, line) => sum + getProductPrice(line.product!, line.option) * line.quantity, 0);
  return <div className="shell page-shell">
    <div className="page-heading"><span className="eyebrow">Your good finds</span><h1>Your bag<span className="brand-dot">.</span></h1><p>{lines.length} {lines.length === 1 ? "kind" : "kinds"} of good things, ready when you are.</p></div>
    {!lines.length ? <div className="empty-state"><ShoppingBag size={36} strokeWidth={1.4} /><h2>Your bag is having a quiet moment.</h2><p>Let's find something lovely to bring home.</p><Link className="button button-dark" href="/">Explore the shop <ArrowRight size={16} /></Link></div> :
      <div className="cart-layout"><div className="cart-lines">
        {lines.map(({ product, quantity, option, key, productQuantity }) => { const unitPrice = getProductPrice(product!, option); return <article className="cart-line" key={key}><Link href={`/product/${product!.id}`} className="cart-thumb"><img src={product!.image} alt={product!.name} /></Link><div className="cart-line-info"><span className="product-category">{product!.category} · {product!.unit}</span><Link href={`/product/${product!.id}`} className="cart-product-title">{product!.name}</Link>{isCartOptionValid(product!, option) ? option && <span className="cart-selected-option">Size: <strong>{option}</strong></span> : <Link href={`/product/${product!.id}`} className="cart-missing-option">{hasProductOptions(product!) ? "Remove, then choose a size" : "Options changed · remove and re-add"}</Link>}<strong>{formatPrice(unitPrice)}</strong><span className="cart-stock">{product!.stock >= productQuantity ? "In stock, ready to ship" : `Only ${product!.stock} available`}</span></div><div className="quantity-control"><button onClick={() => setQuantity(key, quantity - 1)} aria-label="Reduce quantity"><Minus size={14} /></button><span>{quantity}</span><button onClick={() => setQuantity(key, quantity + 1)} disabled={productQuantity >= product!.stock} aria-label="Increase quantity"><Plus size={14} /></button></div><strong className="line-total">{formatPrice(unitPrice * quantity)}</strong><button className="remove-line" onClick={() => removeFromCart(key)} aria-label="Remove item"><Trash2 size={17} /></button></article>; })}
        <Link href="/" className="continue-shopping">← Keep finding good things</Link>
      </div><aside className="order-summary"><h2>The little details</h2><div className="summary-row"><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></div><div className="summary-row"><span>Delivery</span><strong>{subtotal >= 99900 ? "On us" : "Calculated at checkout"}</strong></div><div className="summary-row summary-total"><span>Total</span><strong>{formatPrice(subtotal)}</strong></div><p className="summary-note">Taxes included. Shipping perks applied at checkout.</p><Link href="/checkout" className="button button-dark checkout-button">Continue to checkout <ArrowRight size={17} /></Link><div className="secure-note">🔒 &nbsp;Secure checkout powered by Razorpay</div></aside></div>}
  </div>;
}

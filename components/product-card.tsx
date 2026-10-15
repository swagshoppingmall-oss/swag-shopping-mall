"use client";

import Link from "next/link";
import { Heart, Star } from "lucide-react";
import { useStore } from "@/components/store-provider";
import type { Product } from "@/lib/types";
import { formatPrice, discountPercent } from "@/lib/utils";

export function ProductCard({ product }: { product: Product }) {
  const { addToCart, toggleFavorite, favorites, cart } = useStore();
  const saved = favorites.includes(product.id);
  const unavailable = product.stock < 1;
  return <article className="product-card">
    <div className="product-image-wrap">
      <Link href={`/product/${product.id}`} className="product-image-link">
        <img className="product-image" src={product.image} alt={product.name} loading="lazy" />
      </Link>
      {discountPercent(product.mrp, product.price) > 0 && <span className="discount-badge">{discountPercent(product.mrp, product.price)}% off</span>}
      <button className={`favorite-button ${saved ? "is-favorite" : ""}`} onClick={() => toggleFavorite(product.id)} aria-label={saved ? "Remove from saved items" : "Save item"}><Heart size={17} fill={saved ? "currentColor" : "none"} /></button>
      {product.stock < 6 && product.stock > 0 && <span className="stock-badge">Only {product.stock} left</span>}
    </div>
    <div className="product-card-info">
      <span className="product-category">{product.category} <span>· {product.unit}</span></span>
      <Link href={`/product/${product.id}`} className="product-title">{product.name}</Link>
      <div className="rating-line"><span className="rating-pill"><Star size={12} fill="currentColor" /> {product.rating?.toFixed(1) ?? "New"}</span><span className="review-count">({product.reviews ?? 0} reviews)</span></div>
      <div className="product-price-line"><strong>{formatPrice(product.price)}</strong>{product.mrp > product.price && <del>{formatPrice(product.mrp)}</del>}</div>
      <button className={`add-button ${cart[product.id] ? "added" : ""}`} onClick={() => addToCart(product.id)} disabled={unavailable}>{unavailable ? "Out of stock" : cart[product.id] ? `Add another · ${cart[product.id]} in bag` : "Add to bag"}<span>{unavailable ? "–" : "+"}</span></button>
    </div>
  </article>;
}

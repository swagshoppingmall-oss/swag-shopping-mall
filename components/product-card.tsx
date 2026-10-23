"use client";

import Link from "next/link";
import { Heart, Star } from "lucide-react";
import { useStore } from "@/components/store-provider";
import type { Product } from "@/lib/types";
import { getStartingPrice, hasProductOptions } from "@/lib/cart";
import { formatPrice, discountPercent } from "@/lib/utils";

export function ProductCard({ product }: { product: Product }) {
  const { addToCart, toggleFavorite, favorites, cart } = useStore();
  const saved = favorites.includes(product.id);
  const unavailable = product.stock < 1;
  const needsOption = hasProductOptions(product);
  const displayPrice = getStartingPrice(product);
  return <article className="product-card">
    <div className="product-image-wrap">
      <Link href={`/product/${product.id}`} className="product-image-link">
        <img className="product-image" src={product.image} alt={product.name} loading="lazy" />
      </Link>
      {discountPercent(product.mrp, displayPrice) > 0 && <span className="discount-badge">{discountPercent(product.mrp, displayPrice)}% off</span>}
      <button className={`favorite-button ${saved ? "is-favorite" : ""}`} onClick={() => toggleFavorite(product.id)} aria-label={saved ? "Remove from saved items" : "Save item"}><Heart size={17} fill={saved ? "currentColor" : "none"} /></button>
      {product.stock < 6 && product.stock > 0 && <span className="stock-badge">Only {product.stock} left</span>}
    </div>
    <div className="product-card-info">
      <span className="product-category">{product.category} <span>· {product.unit}</span></span>
      <Link href={`/product/${product.id}`} className="product-title">{product.name}</Link>
      <section className="product-card-details" aria-label="Product details">
        <span>Product details</span>
        <p>{product.description}</p>
      </section>
      <div className="rating-line"><span className="rating-pill"><Star size={12} fill="currentColor" /> {product.rating?.toFixed(1) ?? "New"}</span><span className="review-count">({product.reviews ?? 0} reviews)</span></div>
      <div className="product-price-line"><strong>{needsOption ? "From " : ""}{formatPrice(displayPrice)}</strong>{product.mrp > displayPrice && <del>{formatPrice(product.mrp)}</del>}</div>
      {needsOption
        ? unavailable
          ? <button className="add-button" disabled>Out of stock <span>–</span></button>
          : <Link className="add-button" href={`/product/${product.id}`} aria-label={`Choose a size for ${product.name}`}>Choose a size <span>›</span></Link>
        : <button className={`add-button ${cart[product.id] ? "added" : ""}`} onClick={() => addToCart(product.id)} disabled={unavailable}>{unavailable ? "Out of stock" : cart[product.id] ? `Add another · ${cart[product.id]} in bag` : "Add to bag"}<span>{unavailable ? "–" : "+"}</span></button>}
    </div>
  </article>;
}

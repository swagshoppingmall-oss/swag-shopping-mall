"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { useStore } from "@/components/store-provider";

export default function WishlistPage() {
  const { products, favorites } = useStore();
  const saved = products.filter((product) => favorites.includes(product.id));
  return <div className="shell page-shell"><div className="page-heading"><span className="eyebrow">A list for later</span><h1>Your saved things<span className="brand-dot">.</span></h1><p>Good finds worth coming back for.</p></div>
    {saved.length ? <div className="product-grid">{saved.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="empty-state"><Heart size={34} strokeWidth={1.4} /><h2>Nothing saved just yet.</h2><p>Tap the heart on anything you love to keep it close.</p><Link className="button button-dark" href="/">Find your favourites</Link></div>}
  </div>;
}

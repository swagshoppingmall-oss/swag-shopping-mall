"use client";

import { ArrowRight, BadgeCheck, Leaf, PackageCheck, Sparkles, Star, Truck } from "lucide-react";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { useStore } from "@/components/store-provider";
import { firebaseConfigured } from "@/lib/firebase";

export default function HomePage() {
  const { products, categories, loading, category, search, setCategory } = useStore();
  const normalized = search.trim().toLowerCase();
  const filtered = products.filter((product) =>
    (category === "All" || product.category === category) &&
    (!normalized || `${product.name} ${product.category} ${product.description} ${(product.tags ?? []).join(" ")}`.toLowerCase().includes(normalized)),
  );
  const featured = filtered.filter((product) => product.tags?.some((tag) => ["popular", "bestseller"].includes(tag)));
  return <div>
    <section className="hero shell">
      <div className="hero-copy">
        <span className="hero-kicker"><Sparkles size={14} /> THE FEEL-GOOD EDIT FOR EVERY DAY</span>
        <h1>Little joys.<br />Great finds.<br /><em>Better prices.</em></h1>
        <p>Make every day a little brighter with thoughtfully picked essentials for your home, kitchen, and grocery shelf.</p>
        <div className="hero-actions">
          <button className="button button-dark hero-cta" onClick={() => { setCategory("All"); document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" }); }}>Explore the collection <ArrowRight size={17} /></button>
          <span className="hero-delivery"><Truck size={16} /> Free delivery over ₹999</span>
        </div>
        <div className="hero-social-proof">
          <div className="hero-avatars" aria-hidden="true"><span>A</span><span>M</span><span>S</span><span>+</span></div>
          <div className="hero-social-copy"><span className="hero-stars"><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /><strong>4.9</strong></span><small>Loved by happy homes everywhere</small></div>
        </div>
        <div className="hero-proof"><span><BadgeCheck size={16} /> Quality checked</span><span><Leaf size={16} /> Thoughtfully sourced</span></div>
      </div>
      <div className="hero-visual">
        <div className="hero-image-halo" />
        <img className="hero-main-image" src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=85" alt="Colorful fresh produce and everyday groceries in a bright market" />
        <div className="hero-stamp"><span>thoughtfully</span><strong>GOOD<br />FINDS</strong><span>for every day</span></div>
        <div className="hero-note"><span className="note-check">✓</span><span><strong>Goodness, delivered</strong><small>From our shelves to your home</small></span></div>
        <div className="hero-photo-chip"><img src="https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=180&q=80" alt="" /><span><small>A little golden goodness</small><strong>Wild forest honey</strong></span><span className="chip-sparkle">✦</span></div>
        <div className="hero-image-caption"><span className="caption-dot" /> A good day starts at home</div>
      </div>
    </section>
    <section className="trust-strip"><div className="shell trust-items"><span><Truck size={19} /><strong>Free delivery</strong> above ₹999</span><span><BadgeCheck size={19} /><strong>Quality first</strong> always</span><span><PackageCheck size={19} /><strong>Easy returns</strong> within 7 days</span></div></section>
    <section className="shop-section shell" id="shop">
      <div className="section-heading"><div><span className="eyebrow">The Swag Shopping Mall edit</span><h2>{search ? `Results for “${search}”` : category === "All" ? "Little things, big difference." : category}</h2><p>Considered essentials at prices that just make sense.</p></div><Link href="/products" className="text-link">Browse all products <ArrowRight size={15} /></Link></div>
      {!firebaseConfigured && <div className="demo-catalog-note"><span>✦</span><p><strong>You're browsing the Swag Shopping Mall sample shop.</strong> Products are for preview—connect Firebase to use live inventory and checkout.</p></div>}
      <div className="quick-categories">{["All", ...categories].map((item) => <button key={item} className={`category-chip ${category === item ? "active" : ""}`} onClick={() => setCategory(item)}>{item === "All" ? "Everything" : item}</button>)}</div>
      {loading ? <div className="loading-state"><span className="spinner" />Gathering the good stuff...</div>
        : filtered.length ? <div className="product-grid">{(featured.length && !search && category === "All" ? [...featured, ...filtered.filter((item) => !featured.includes(item))] : filtered).slice(0, 4).map((product) => <ProductCard key={product.id} product={product} />)}</div>
          : <div className="empty-state"><span className="empty-icon">⌕</span><h3>Nothing on this shelf just yet.</h3><p>{products.length ? "Try another search or browse all of our finds." : "Connect Firebase and seed the catalog to get the shop started."}</p><button className="button button-outline" onClick={() => setCategory("All")}>Browse everything</button></div>}
      {!loading && filtered.length > 4 && <div className="home-products-cta"><Link href="/products" className="button button-outline">See all {filtered.length} products <ArrowRight size={15} /></Link></div>}
    </section>
    <section className="brand-note"><div className="shell brand-note-inner"><span className="eyebrow">A little less middle, a lot more value</span><h2>Good things should feel good<br />to buy. <em>And to bring home.</em></h2><Link href="/#shop" className="text-link">Meet your new favourites <ArrowRight size={16} /></Link></div><div className="brand-note-mark">S</div></section>
  </div>;
}

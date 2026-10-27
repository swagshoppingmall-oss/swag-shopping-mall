"use client";

import { ArrowRight, Baby, BadgeCheck, Car, CookingPot, Dumbbell, Footprints, Grid2X2, House, Laptop, Monitor, Package, PackageCheck, Shirt, ShoppingBasket, Smartphone, Sparkles, Truck } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { useStore } from "@/components/store-provider";
import { firebaseConfigured } from "@/lib/firebase";

const heroCategories = [
  { label: "Fashion", image: "photo-1483985988355-763728e1935b" },
  { label: "Sports", image: "photo-1571019613454-1cb2f99b2d8b" },
  { label: "Mobiles", image: "photo-1511707171634-5f897ff02aa9" },
  { label: "Home appliances", image: "photo-1583847268964-b28dc8f51f92" },
  { label: "Grocery", image: "photo-1542838132-92c53300491e" },
  { label: "Kitchen", image: "photo-1556911220-e15b29be8c8f" },
  { label: "Home decor", image: "photo-1600210492486-724fe5c67fb0" },
  { label: "Beauty", image: "photo-1596462502278-27bfdc403348" },
  { label: "Footwear", image: "photo-1542291026-7eec264c27ff" },
  { label: "Electronics", image: "photo-1498049794561-7780e7231661" },
].map((item) => ({
  ...item,
  src: `https://images.unsplash.com/${item.image}?auto=format&fit=crop&w=1600&q=80`,
}));

function categoryIcon(name: string) {
  const category = name.toLowerCase();
  if (name === "All") return <Grid2X2 size={24} strokeWidth={1.7} />;
  if (/fashion|apparel|clothing|wear/.test(category)) return <Shirt size={24} strokeWidth={1.7} />;
  if (/mobile|phone/.test(category)) return <Smartphone size={24} strokeWidth={1.7} />;
  if (/electronic|laptop|computer/.test(category)) return <Laptop size={24} strokeWidth={1.7} />;
  if (/beauty|personal care|skin/.test(category)) return <Sparkles size={24} strokeWidth={1.7} />;
  if (/home|living|decor|furniture/.test(category)) return <House size={24} strokeWidth={1.7} />;
  if (/appliance|tv|audio/.test(category)) return <Monitor size={24} strokeWidth={1.7} />;
  if (/toy|baby|kids/.test(category)) return <Baby size={24} strokeWidth={1.7} />;
  if (/grocery|food|market/.test(category)) return <ShoppingBasket size={24} strokeWidth={1.7} />;
  if (/kitchen|cook|dining/.test(category)) return <CookingPot size={24} strokeWidth={1.7} />;
  if (/footwear|shoe/.test(category)) return <Footprints size={24} strokeWidth={1.7} />;
  if (/sport|fitness|outdoor/.test(category)) return <Dumbbell size={24} strokeWidth={1.7} />;
  if (/auto|car|vehicle/.test(category)) return <Car size={24} strokeWidth={1.7} />;
  return <Package size={24} strokeWidth={1.7} />;
}

export default function HomePage() {
  const shouldReduceMotion = useReducedMotion();
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);
  const { products, categories, categoryImages, loading, category, search, setCategory } = useStore();
  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveHeroSlide((current) => (current + 1) % heroCategories.length);
    }, 2000);
    heroCategories.forEach(({ src }) => {
      const image = new Image();
      image.src = src;
    });
    return () => window.clearInterval(timer);
  }, []);
  const normalized = search.trim().toLowerCase();
  const filtered = products.filter((product) =>
    (category === "All" || product.category === category) &&
    (!normalized || `${product.name} ${product.category} ${product.description} ${(product.tags ?? []).join(" ")}`.toLowerCase().includes(normalized)),
  );
  const featured = filtered.filter((product) => product.tags?.some((tag) => ["popular", "bestseller"].includes(tag)));
  const categoryShowcase = ["All", ...categories].map((item) => ({ name: item, icon: categoryIcon(item) }));
  return <div>
    <section className="hero shell hero-editorial" aria-label="Featured shopping categories">
      <div className="hero-slideshow" aria-hidden="true">
        <AnimatePresence initial={false}>
          <motion.img
            key={heroCategories[activeHeroSlide].label}
            className="hero-slideshow-image"
            src={heroCategories[activeHeroSlide].src}
            alt=""
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.12, x: 36 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.04, x: -24 }}
            transition={shouldReduceMotion ? { duration: 0.15 } : { duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          />
        </AnimatePresence>
      </div>
      <div className="hero-copy">
        <span className="hero-kicker">A LITTLE LESS MIDDLE, A LOT MORE VALUE</span>
        <h1>Good things should feel good<br className="hero-desktop-break" /> to buy. <em>And to bring home.</em></h1>
        <p className="hero-slide-category">Discover something good in <strong>{heroCategories[activeHeroSlide].label}</strong></p>
        <Link className="hero-editorial-link" href="#shop" onClick={() => setCategory("All")}>
          Meet your new favourites <ArrowRight size={17} />
        </Link>
        <div className="hero-slide-controls" aria-label="Choose a featured category">
          {heroCategories.map((item, index) => (
            <button
              key={item.label}
              type="button"
              className={index === activeHeroSlide ? "active" : ""}
              aria-label={`Show ${item.label}`}
              aria-pressed={index === activeHeroSlide}
              onClick={() => setActiveHeroSlide(index)}
            />
          ))}
        </div>
      </div>
    </section>
    <section className="trust-strip"><div className="shell trust-items"><span><Truck size={19} /><strong>Free delivery</strong> above ₹999</span><span><BadgeCheck size={19} /><strong>Quality first</strong> always</span><span><PackageCheck size={19} /><strong>Product-specific</strong> return policies</span></div></section>
    <section className="category-showcase-section shell" aria-label="Shop by category">
      <div className="category-showcase">
        {categoryShowcase.map((item) => <button key={item.name} type="button" className={`category-showcase-card ${category === item.name ? "selected" : ""}`} onClick={() => {
          setCategory(item.name);
          document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
        }} aria-pressed={category === item.name}>
          <span className="category-showcase-icon" aria-hidden="true">{categoryImages[item.name] ? <img src={categoryImages[item.name]} alt="" loading="lazy" /> : item.icon}</span>
          <span className="category-showcase-label">{item.name === "All" ? "For You" : item.name}</span>
        </button>)}
      </div>
    </section>
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

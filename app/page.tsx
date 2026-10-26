"use client";

import { ArrowRight, Baby, BadgeCheck, Car, CookingPot, Dumbbell, Footprints, Grid2X2, House, Laptop, Leaf, Monitor, Package, PackageCheck, Shirt, ShoppingBasket, Smartphone, Sparkles, Star, Truck } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { useStore } from "@/components/store-provider";
import { firebaseConfigured } from "@/lib/firebase";

const heroSlides = [
  {
    label: "Fresh groceries",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=85",
    alt: "Colorful fresh produce and everyday groceries in a bright market",
  },
  {
    label: "Everyday fashion",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=85",
    alt: "Fashion shopper browsing a clothing collection",
  },
  {
    label: "Home appliances",
    image: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=85",
    alt: "Modern home kitchen with useful appliances",
  },
  {
    label: "Smart mobiles",
    image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=85",
    alt: "Smartphone showcasing a colorful screen",
  },
];

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
    const interval = window.setInterval(() => {
      setActiveHeroSlide((current) => (current + 1) % heroSlides.length);
    }, 3000);
    return () => window.clearInterval(interval);
  }, []);
  const normalized = search.trim().toLowerCase();
  const filtered = products.filter((product) =>
    (category === "All" || product.category === category) &&
    (!normalized || `${product.name} ${product.category} ${product.description} ${(product.tags ?? []).join(" ")}`.toLowerCase().includes(normalized)),
  );
  const featured = filtered.filter((product) => product.tags?.some((tag) => ["popular", "bestseller"].includes(tag)));
  const categoryShowcase = ["All", ...categories].map((item) => ({ name: item, icon: categoryIcon(item) }));
  return <div>
    <section className="hero shell">
      <div className="hero-copy">
        <span className="hero-kicker"><Sparkles size={14} /> THE FEEL-GOOD EDIT FOR EVERY DAY</span>
        <h1>Little joys.<br />Great finds.<br /><em>Better prices.</em></h1>
        <div className="hero-intro">
          <p>Make every day a little brighter with thoughtfully picked essentials for your home, kitchen, and grocery shelf.</p>
          <div className="hero-mobile-feature">
            <img src="https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=360&q=85" alt="Golden honey in a glass jar" />
            <span>Everyday good finds</span>
          </div>
        </div>
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
        <div className="hero-carousel" aria-label={`${heroSlides[activeHeroSlide].label}, slide ${activeHeroSlide + 1} of ${heroSlides.length}`}>
          <AnimatePresence initial={false}>
            <motion.div
              key={heroSlides[activeHeroSlide].image}
              className="hero-carousel-slide"
              initial={shouldReduceMotion
                ? { opacity: 1, scale: 1, x: 0, rotateY: 0, filter: "blur(0px)" }
                : { opacity: 0, scale: 1.08, x: 34, rotateY: 7, filter: "blur(3px)" }}
              animate={shouldReduceMotion
                ? { opacity: 1, scale: 1, x: 0, rotateY: 0, filter: "blur(0px)" }
                : { opacity: 1, scale: 1, x: 0, rotateY: 0, filter: "blur(0px)" }}
              exit={shouldReduceMotion
                ? { opacity: 1 }
                : { opacity: 0, scale: 0.96, x: -34, rotateY: -6, filter: "blur(3px)" }}
              transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.9, ease: "easeOut" }}
            >
              <img className="hero-main-image" src={heroSlides[activeHeroSlide].image} alt={heroSlides[activeHeroSlide].alt} />
            </motion.div>
          </AnimatePresence>
        </div>
        <motion.div className="hero-shopping-mark hero-mark-fashion" aria-hidden="true"
          initial={{ opacity: 1, scale: 1 }}
          animate={shouldReduceMotion ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1, y: [0, -8, 0], rotate: [-4, 3, -4] }}
          transition={{ duration: 3.2, delay: 0.2, repeat: shouldReduceMotion ? 0 : Infinity, ease: "easeInOut" }}>
          <span className="hero-mark-icon"><Shirt size={17} /></span><span>Style picks</span>
        </motion.div>
        <motion.div className="hero-shopping-mark hero-mark-home" aria-hidden="true"
          initial={{ opacity: 1, scale: 1 }}
          animate={shouldReduceMotion ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1, y: [0, -9, 0], rotate: [3, -4, 3] }}
          transition={{ duration: 3.5, delay: 0.55, repeat: shouldReduceMotion ? 0 : Infinity, ease: "easeInOut" }}>
          <span className="hero-mark-icon"><House size={17} /></span><span>Home finds</span>
        </motion.div>
        <motion.div className="hero-shopping-mark hero-mark-daily" aria-hidden="true"
          initial={{ opacity: 1, scale: 1 }}
          animate={shouldReduceMotion ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1, y: [0, -7, 0], rotate: [-3, 4, -3] }}
          transition={{ duration: 3.8, delay: 0.8, repeat: shouldReduceMotion ? 0 : Infinity, ease: "easeInOut" }}>
          <span className="hero-mark-icon"><ShoppingBasket size={17} /></span><span>Daily essentials</span>
        </motion.div>
        <div className="hero-stamp"><span>thoughtfully</span><strong>GOOD<br />FINDS</strong><span>for every day</span></div>
        <div className="hero-note"><span className="note-check">✓</span><span><strong>Goodness, delivered</strong><small>From our shelves to your home</small></span></div>
        <div className="hero-photo-chip"><img src="https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=180&q=80" alt="" /><span><small>A little golden goodness</small><strong>Wild forest honey</strong></span><span className="chip-sparkle">✦</span></div>
        <div className="hero-image-caption"><span className="caption-dot" /> {heroSlides[activeHeroSlide].label}</div>
        <div className="hero-carousel-dots" aria-label="Choose hero image">
          {heroSlides.map((slide, index) => <button key={slide.label} type="button" className={activeHeroSlide === index ? "active" : ""} aria-label={`Show ${slide.label}`} aria-pressed={activeHeroSlide === index} onClick={() => setActiveHeroSlide(index)} />)}
        </div>
      </div>
    </section>
    <section className="trust-strip"><div className="shell trust-items"><span><Truck size={19} /><strong>Free delivery</strong> above ₹999</span><span><BadgeCheck size={19} /><strong>Quality first</strong> always</span><span><PackageCheck size={19} /><strong>Easy returns</strong> within 7 days</span></div></section>
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

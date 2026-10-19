"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownWideNarrow, RotateCcw, SlidersHorizontal } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { useStore } from "@/components/store-provider";
import { firebaseConfigured } from "@/lib/firebase";
import { formatPrice } from "@/lib/utils";

type SortOrder = "featured" | "price-low" | "price-high" | "rating" | "name";

export default function ProductsPage() {
  const { products, categories: storeCategories, loading, category, setCategory, search } = useStore();
  const [sort, setSort] = useState<SortOrder>("featured");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);

  const highestPrice = Math.max(0, ...products.map((product) => product.price));
  const priceLimit = maxPrice === null ? highestPrice : Math.min(maxPrice, highestPrice);
  const categories = useMemo(() => ["All", ...storeCategories], [storeCategories]);
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const visibleProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      const matchesCategory = category === "All" || product.category === category;
      const searchableText = `${product.name} ${product.category} ${product.description} ${(product.tags ?? []).join(" ")}`.toLocaleLowerCase();
      return matchesCategory &&
        (!normalizedSearch || searchableText.includes(normalizedSearch)) &&
        product.price <= priceLimit &&
        (!inStockOnly || product.stock > 0);
    });

    return filtered.sort((first, second) => {
      switch (sort) {
        case "price-low": return first.price - second.price;
        case "price-high": return second.price - first.price;
        case "rating": return second.rating - first.rating || second.reviews - first.reviews;
        case "name": return first.name.localeCompare(second.name);
        default:
          return Number(second.tags?.some((tag) => ["popular", "bestseller"].includes(tag))) -
            Number(first.tags?.some((tag) => ["popular", "bestseller"].includes(tag))) ||
            second.rating - first.rating;
      }
    });
  }, [products, category, normalizedSearch, priceLimit, inStockOnly, sort]);

  function clearFilters() {
    setCategory("All");
    setInStockOnly(false);
    setMaxPrice(null);
    setSort("featured");
  }

  return <div className="shell page-shell catalog-page">
    <div className="catalog-intro">
      <span className="eyebrow"><SlidersHorizontal size={13} /> THE SWAG SHOPPING MALL COLLECTION</span>
      <h1>{normalizedSearch ? <>Finding <em>“{search.trim()}”</em></> : category === "All" ? <>Good things for<br /><em>every kind of day.</em></> : <>{category}, picked<br /><em>with a little more care.</em></>}</h1>
      <p>Everyday favourites, thoughtfully chosen and priced to feel good.</p>
      <div className="catalog-intro-orb" />
    </div>

    {!firebaseConfigured && <div className="demo-catalog-note"><span>✦</span><p><strong>You're browsing the Swag Shopping Mall sample shop.</strong> Products are for preview—connect Firebase to use live inventory and checkout.</p></div>}

    <div className="catalog-toolbar">
      <div className="catalog-category-filters" aria-label="Filter by category">
        {categories.map((item) => <button key={item} className={`category-chip ${category === item ? "active" : ""}`} aria-pressed={category === item} onClick={() => setCategory(item)}>{item === "All" ? "Everything" : item}</button>)}
      </div>
      <label className="catalog-sort"><ArrowDownWideNarrow size={15} /><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value as SortOrder)} aria-label="Sort products">
        <option value="featured">Featured</option>
        <option value="price-low">Price: low to high</option>
        <option value="price-high">Price: high to low</option>
        <option value="rating">Top rated</option>
        <option value="name">Name: A to Z</option>
      </select></label>
    </div>

    <div className="catalog-layout">
      <aside className="catalog-filters">
        <div className="catalog-filter-title"><SlidersHorizontal size={16} /><strong>Make it yours</strong></div>
        <div className="filter-group">
          <span className="filter-label">YOUR BUDGET</span>
          <strong className="price-range-label">{highestPrice ? `Up to ${formatPrice(priceLimit)}` : "No products yet"}</strong>
          <input className="price-range" type="range" min="0" max={Math.max(highestPrice, 1)} step="500" value={priceLimit} onChange={(event) => setMaxPrice(Number(event.target.value))} aria-label="Maximum product price" />
          <div className="range-endpoints"><span>₹0</span><span>{formatPrice(highestPrice)}</span></div>
        </div>
        <div className="filter-group stock-filter">
          <label><input type="checkbox" checked={inStockOnly} onChange={(event) => setInStockOnly(event.target.checked)} /><span className="custom-checkbox" /> <span>In stock only</span></label>
        </div>
        <button className="clear-filters" onClick={clearFilters}><RotateCcw size={13} /> Clear all filters</button>
      </aside>

      <section className="catalog-results" aria-live="polite">
        <div className="catalog-results-heading"><div><strong>{visibleProducts.length}</strong> {visibleProducts.length === 1 ? "lovely find" : "lovely finds"}<span>{category !== "All" ? ` in ${category}` : ""}{normalizedSearch ? ` for “${search.trim()}”` : ""}</span></div><span>Prices include all taxes</span></div>
        {loading ? <div className="loading-state"><span className="spinner" />Gathering the good stuff...</div>
          : visibleProducts.length ? <div className="product-grid">{visibleProducts.map((product) => <ProductCard key={product.id} product={product} />)}</div>
            : <div className="empty-state catalog-empty"><span className="empty-icon">⌕</span><h2>No matches on this shelf.</h2><p>Try a different category, search, or budget.</p><button className="button button-dark" onClick={clearFilters}>Clear filters</button></div>}
      </section>
    </div>
    <div className="catalog-back-home"><Link href="/">← Back to Swag Shopping Mall</Link></div>
  </div>;
}

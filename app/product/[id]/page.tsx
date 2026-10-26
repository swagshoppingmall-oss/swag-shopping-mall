"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Heart, Plus, ShieldCheck, Star, Truck } from "lucide-react";
import { useStore } from "@/components/store-provider";
import { ProductCard } from "@/components/product-card";
import { cartLineKey, getProductOptions, getProductPrice, getStartingPrice, hasProductOptions } from "@/lib/cart";
import { formatPrice, discountPercent } from "@/lib/utils";

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { products, loading, addToCart, cart, favorites, toggleFavorite } = useStore();
  const [selectedOption, setSelectedOption] = useState("");
  const [selectedImage, setSelectedImage] = useState("");
  useEffect(() => setSelectedOption(""), [id]);
  useEffect(() => setSelectedImage(""), [id]);
  const product = products.find((item) => item.id === id);
  if (!product && loading) return <section className="shell page-shell"><Link href="/products" className="back-link"><ArrowLeft size={16} /> Back to all good things</Link><div className="loading-state"><span className="spinner" />Finding your good thing...</div></section>;
  if (!product) return <section className="shell page-shell empty-state"><h2>We couldn't find that item.</h2><p>It may have moved off our shelves.</p><Link className="button button-dark" href="/products">Back to all products</Link></section>;
  const needsOption = hasProductOptions(product);
  const productImages = [...new Set([product.image, ...(product.images ?? [])].filter(Boolean))].slice(0, 3);
  const shownImage = productImages.includes(selectedImage) ? selectedImage : productImages[0] ?? product.image;
  const productOptions = getProductOptions(product);
  const shownPrice = needsOption
    ? selectedOption ? getProductPrice(product, selectedOption) : getStartingPrice(product)
    : product.price;
  const selectedCartQuantity = needsOption ? cart[cartLineKey(product.id, selectedOption)] ?? 0 : cart[product.id] ?? 0;
  const related = products.filter((item) => item.category === product.category && item.id !== product.id).slice(0, 4);
  return <div className="shell page-shell">
    <Link href="/products" className="back-link"><ArrowLeft size={16} /> Back to all good things</Link>
    <div className="detail-layout">
      <div className="detail-gallery">
        <div className="detail-image"><img src={shownImage} alt={`${product.name} view ${Math.max(productImages.indexOf(shownImage), 0) + 1}`} />{discountPercent(product.mrp, shownPrice) > 0 && <span className="discount-badge">{discountPercent(product.mrp, shownPrice)}% off</span>}</div>
        {productImages.length > 1 && <div className="detail-thumbnails" aria-label="More product images">{productImages.map((image, index) => <button key={image} type="button" className={`detail-thumbnail ${shownImage === image ? "selected" : ""}`} onClick={() => setSelectedImage(image)} aria-label={`Show image ${index + 1} of ${product.name}`} aria-pressed={shownImage === image}><img src={image} alt="" /></button>)}</div>}
      </div>
      <div className="detail-copy">
        <span className="eyebrow">{product.category} <span>·</span> {product.unit}</span>
        <h1>{product.name}</h1>
        <div className="detail-rating"><span className="rating-pill"><Star size={13} fill="currentColor" /> {product.rating.toFixed(1)}</span><span>{product.reviews} verified reviews</span></div>
        <div className="detail-price"><strong>{needsOption && !selectedOption ? "From " : ""}{formatPrice(shownPrice)}</strong>{product.mrp > shownPrice && <><del>{formatPrice(product.mrp)}</del><span className="save-label">Save {discountPercent(product.mrp, shownPrice)}%</span></>}<small>Inclusive of all taxes</small></div>
        <p className="detail-description">{product.description}</p>
        {needsOption && <fieldset className="product-option-picker">
          <legend>Choose {product.category.toLowerCase().includes("footwear") || product.category.toLowerCase().includes("shoe") ? "shoe size" : "size"} <span>{selectedOption ? `· ${selectedOption} selected` : "· Required"}</span></legend>
          <div className="product-option-list">{productOptions.map((option) => <button key={option} type="button" className={`product-option ${selectedOption === option ? "selected" : ""}`} aria-pressed={selectedOption === option} onClick={() => setSelectedOption(option)}>{option}</button>)}</div>
        </fieldset>}
        <div className={`availability ${product.stock > 0 ? "" : "unavailable"}`}><span />{product.stock > 0 ? `${product.stock} available · Ready to ship` : "Currently out of stock"}</div>
        <div className="detail-actions"><button className="button button-dark detail-add" disabled={product.stock < 1 || (needsOption && !selectedOption)} onClick={() => addToCart(product.id, 1, needsOption ? selectedOption : undefined)}>{needsOption && !selectedOption ? "Choose a size" : selectedCartQuantity ? `Add another (${selectedCartQuantity} in bag)` : "Add to bag"} <Plus size={17} /></button><button className={`detail-save ${favorites.includes(product.id) ? "is-favorite" : ""}`} onClick={() => toggleFavorite(product.id)}><Heart size={18} fill={favorites.includes(product.id) ? "currentColor" : "none"} /> {favorites.includes(product.id) ? "Saved" : "Save for later"}</button></div>
        <div className="delivery-points"><span><Truck size={18} /><span><strong>Free delivery</strong><small>On orders above ₹999</small></span></span><span><ShieldCheck size={18} /><span><strong>Goodness guaranteed</strong><small>7-day easy returns</small></span></span></div>
        <section className="product-specifications" aria-labelledby="product-specifications-title">
          <h2 id="product-specifications-title">Product specifications</h2>
          <p className="specification-description">{product.description}</p>
          <dl>
            <div><dt>Category</dt><dd>{product.category}</dd></div>
            <div><dt>Pack size</dt><dd>{product.unit}</dd></div>
            {needsOption && <div><dt>Available sizes</dt><dd>{productOptions.join(", ")}</dd></div>}
            <div><dt>Customer rating</dt><dd>{product.rating.toFixed(1)} out of 5 ({product.reviews} reviews)</dd></div>
            <div><dt>Availability</dt><dd>{product.stock > 0 ? "In stock" : "Out of stock"}</dd></div>
            {Object.entries(product.specifications ?? {}).map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
        </section>
      </div>
    </div>
    {!!related.length && <section className="related-section"><div className="section-heading"><div><span className="eyebrow">More to love</span><h2>Goes nicely with.</h2></div></div><div className="product-grid">{related.map((item) => <ProductCard key={item.id} product={item} />)}</div></section>}
  </div>;
}

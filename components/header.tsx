"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Heart, Home, LogOut, Search, ShoppingBag, Store, UserRound } from "lucide-react";
import { useStore } from "@/components/store-provider";

const categories = ["All", "Grocery", "Home & Living", "Kitchen"];

export function Header() {
  const { cart, category, setCategory, search, setSearch, user, isAdmin, signOutUser } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const cartCount = Object.values(cart).reduce((sum, value) => sum + value, 0);

  function selectCategory(value: string) {
    setCategory(value);
    if (pathname !== "/products") router.push("/products");
  }

  return (
    <>
      <div className="announcement">Thoughtful goods, fair prices <span>·</span> Free delivery on orders over ₹999</div>
      <header className="site-header">
        <div className="header-main shell">
          <Link className="brand" href="/" aria-label="Swag Shopping Mall home"><span className="brand-mark">S</span><span>Swag Shopping Mall</span></Link>
          <form className="search-box" onSubmit={(event) => { event.preventDefault(); router.push("/products"); }}>
            <Search size={18} />
            <input aria-label="Search products" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search for everyday good things..." />
            <button type="submit" aria-label="Search"><span>Search</span></button>
          </form>
          <nav className="header-actions" aria-label="Account and shopping">
            <Link href="/wishlist" className="icon-action"><Heart size={20} /><span className="action-label">Saved</span></Link>
            {user ? (
              <button className="icon-action account-action" onClick={() => void signOutUser()} title={`Sign out ${user.displayName ?? user.email}`}>
                <LogOut size={19} /><span className="action-label">Sign out</span>
              </button>
            ) : <Link href="/login" className="icon-action"><UserRound size={20} /><span className="action-label">Account</span></Link>}
            <Link href="/cart" className="icon-action cart-action"><ShoppingBag size={20} /><span className="action-label">Cart</span>{cartCount > 0 && <span className="cart-count">{cartCount}</span>}</Link>
          </nav>
        </div>
        <div className="category-bar"><div className="shell category-inner">
          {categories.map((item) => <button key={item} className={`category-link ${category === item ? "selected" : ""}`} onClick={() => selectCategory(item)}>{item === "All" ? "Shop all" : item}</button>)}
          <Link href="/orders" className="category-link orders-link">My orders</Link>
          {isAdmin && <Link href="/admin" className="category-link admin-link">Admin studio</Link>}
          <span className="bulk-note">A little more, a lot less.</span>
        </div></div>
      </header>
      <nav className="mobile-tab-bar" aria-label="Mobile navigation">
        <Link href="/" className={`mobile-tab ${pathname === "/" ? "active" : ""}`} aria-current={pathname === "/" ? "page" : undefined}>
          <Home size={19} /><span>Home</span>
        </Link>
        <Link href="/products" className={`mobile-tab ${pathname === "/products" || pathname.startsWith("/product/") ? "active" : ""}`} aria-current={pathname === "/products" || pathname.startsWith("/product/") ? "page" : undefined}>
          <Store size={19} /><span>Shop</span>
        </Link>
        <Link href="/wishlist" className={`mobile-tab ${pathname === "/wishlist" ? "active" : ""}`} aria-current={pathname === "/wishlist" ? "page" : undefined}>
          <Heart size={19} /><span>Saved</span>
        </Link>
        <Link href="/cart" className={`mobile-tab ${pathname === "/cart" || pathname === "/checkout" ? "active" : ""}`} aria-current={pathname === "/cart" || pathname === "/checkout" ? "page" : undefined}>
          <span className="mobile-tab-icon"><ShoppingBag size={19} />{cartCount > 0 && <span className="mobile-tab-count">{cartCount}</span>}</span><span>Cart</span>
        </Link>
        <Link href={user ? "/orders" : "/login"} className={`mobile-tab ${pathname === "/login" || pathname === "/orders" ? "active" : ""}`} aria-current={pathname === "/login" || pathname === "/orders" ? "page" : undefined}>
          <UserRound size={19} /><span>Account</span>
        </Link>
      </nav>
    </>
  );
}

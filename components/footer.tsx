import Link from "next/link";

export function Footer() {
  return <footer className="footer">
    <div className="shell footer-inner">
      <div className="footer-main">
        <div className="footer-brand-block">
          <Link className="brand footer-brand" href="/"><span className="brand-mark">S</span><span>Swag Shopping Mall</span></Link>
          <p>Thoughtful finds for everyday living.<br />Good quality, feel-good prices.</p>
          <span className="footer-promise"><span aria-hidden="true">✦</span> Made for your everyday</span>
        </div>
        <nav className="footer-nav" aria-label="Footer navigation">
          <div className="footer-link-group">
            <span className="footer-link-heading">Explore</span>
            <Link href="/products">Shop all</Link>
            <Link href="/wishlist">Saved items</Link>
          </div>
          <div className="footer-link-group">
            <span className="footer-link-heading">Your account</span>
            <Link href="/orders">Track an order</Link>
            <Link href="/login">Sign in</Link>
          </div>
        </nav>
      </div>
      <div className="footer-bottom">
        <span className="copyright">© {new Date().getFullYear()} Swag Shopping Mall. All rights reserved.</span>
        <span className="footer-bottom-note">A little more joy in every order.</span>
        <a className="footer-bottom-note" href="https://minah-tech.web.app">Developed BY MINAH-TECH</a>
      </div>
    </div>
  </footer>;
}

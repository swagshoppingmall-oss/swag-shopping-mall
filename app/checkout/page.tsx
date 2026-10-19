"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { ArrowLeft, ArrowRight, Check, CreditCard, LockKeyhole, Pencil, Tag, Truck, Wallet } from "lucide-react";
import { useStore } from "@/components/store-provider";
import { db, firebaseConfigured, functions } from "@/lib/firebase";
import type { DeliveryAddress } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const initialAddress: DeliveryAddress = { name: "", phone: "", line1: "", city: "", state: "", pincode: "" };

export default function CheckoutPage() {
  const { products, cart, user, demoLoginEnabled, cashOnDeliveryEnabled, placeDemoOrder, clearCart } = useStore();
  const router = useRouter();
  const [address, setAddress] = useState(initialAddress);
  const [savedAddress, setSavedAddress] = useState<DeliveryAddress | null>(null);
  const [addressLoading, setAddressLoading] = useState(true);
  const [addressEditing, setAddressEditing] = useState(true);
  const [savingAddress, setSavingAddress] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [pendingVerification, setPendingVerification] = useState<Record<string, string> | null>(null);
  const [offerMessage, setOfferMessage] = useState("");
  const [offerApplied, setOfferApplied] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const lines = Object.entries(cart).map(([productId, quantity]) => ({ productId, quantity, product: products.find((item) => item.id === productId) })).filter((line) => line.product);
  const subtotal = lines.reduce((total, line) => total + line.product!.price * line.quantity, 0);
  const demoMode = demoLoginEnabled && user?.isDemo === true;
  const discount = demoMode && offerApplied ? Math.min(Math.floor(subtotal * 0.1), 25000) : 0;

  useEffect(() => {
    let cancelled = false;
    async function loadSavedAddress() {
      setAddressLoading(true);
      setMessage("");
      if (!user) {
        setAddress(initialAddress);
        setSavedAddress(null);
        setAddressEditing(true);
        setAddressLoading(false);
        return;
      }
      try {
        let value: unknown = null;
        if (demoMode) {
          const stored = localStorage.getItem(`bazaar-address-${user.uid}`);
          value = stored ? JSON.parse(stored) as unknown : null;
        } else if (firebaseConfigured) {
          const snapshot = await getDoc(doc(db, "users", user.uid));
          value = snapshot.data()?.deliveryAddress ?? null;
        }
        if (cancelled) return;
        if (isDeliveryAddress(value)) {
          setAddress(value);
          setSavedAddress(value);
          setAddressEditing(false);
        } else {
          setAddress({ ...initialAddress, name: user.displayName ?? "" });
          setSavedAddress(null);
          setAddressEditing(true);
        }
      } catch (cause) {
        if (cancelled) return;
        console.error("Unable to load the saved delivery address.", cause);
        setMessage("Your saved address could not be loaded. You can enter it again below.");
        setAddress({ ...initialAddress, name: user.displayName ?? "" });
        setSavedAddress(null);
        setAddressEditing(true);
      } finally {
        if (!cancelled) setAddressLoading(false);
      }
    }
    void loadSavedAddress();
    return () => { cancelled = true; };
  }, [demoMode, user?.uid, user?.displayName]);

  useEffect(() => {
    if (window.Razorpay) { setScriptReady(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setScriptReady(true);
    script.onerror = () => setMessage("Payment checkout could not be loaded. Check your connection and try again.");
    document.body.appendChild(script);
    return () => { script.onload = null; script.onerror = null; };
  }, []);

  useEffect(() => {
    if (!cashOnDeliveryEnabled && paymentMethod === "cod") setPaymentMethod("upi");
  }, [cashOnDeliveryEnabled, paymentMethod]);

  async function confirmPayment(response: Record<string, string>) {
    try {
      const verify = httpsCallable(functions, "verifyRazorpayPayment");
      const verified = await verify(response);
      const confirmed = verified.data as { orderId: string };
      setPendingVerification(null);
      clearCart();
      router.replace(`/orders?placed=${encodeURIComponent(confirmed.orderId)}`);
    } catch (cause) {
      console.error("Payment completed, but server verification did not finish.", cause);
      setPendingVerification(response);
      setMessage("Payment was received but confirmation is pending. Retry confirmation here before starting another payment.");
    } finally {
      setBusy(false);
    }
  }

  function applyOffer() {
    setOfferMessage("");
    setOfferApplied(false);
    if (demoMode) {
      if (couponCode.trim().toUpperCase() !== "WELCOME10") {
        setOfferMessage("Try the sample code WELCOME10.");
        return;
      }
      if (subtotal < 50000) {
        setOfferMessage("WELCOME10 applies to orders of ₹500 or more.");
        return;
      }
      setCouponCode("WELCOME10");
      setOfferApplied(true);
      setOfferMessage("10% off applied — up to ₹250 off!");
      return;
    }
    if (!couponCode.trim()) {
      setOfferMessage("Enter a discount code to apply it.");
      return;
    }
    setOfferMessage("Your discount code will be verified securely before payment.");
  }

  function isAddressComplete(value: DeliveryAddress) {
    return Object.values(value).every((field) => field.trim()) &&
      /^\d{10}$/.test(value.phone) && /^\d{6}$/.test(value.pincode);
  }

  async function persistAddress() {
    if (!user) throw new Error("Sign in before saving a delivery address.");
    if (!isAddressComplete(address)) {
      throw new Error("Complete the address with a valid 10-digit phone number and 6-digit PIN code.");
    }
    if (demoMode) {
      localStorage.setItem(`bazaar-address-${user.uid}`, JSON.stringify(address));
    } else if (firebaseConfigured) {
      await setDoc(doc(db, "users", user.uid), {
        deliveryAddress: address,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } else {
      throw new Error("Connect Firebase before saving a delivery address.");
    }
    setSavedAddress(address);
    setAddressEditing(false);
  }

  async function saveAddress() {
    setMessage("");
    setSavingAddress(true);
    try {
      await persistAddress();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Your address could not be saved.");
    } finally {
      setSavingAddress(false);
    }
  }

  async function pay(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    if (!user) { router.push("/login?next=/checkout"); return; }
    if (paymentMethod === "cod" && !cashOnDeliveryEnabled) {
      setPaymentMethod("upi");
      setMessage("Cash on delivery is currently unavailable. Choose another payment method.");
      return;
    }
    if (!isAddressComplete(address)) {
      setMessage("Enter a complete delivery address with a valid phone number and PIN code.");
      setAddressEditing(true);
      return;
    }
    if (demoMode) {
      if (paymentMethod === "fail") {
        setMessage("Demo payment failed as requested. No order or charge was created—choose another option to try again.");
        return;
      }
      setBusy(true);
      try {
        await persistAddress();
        const order = placeDemoOrder(address, offerApplied ? couponCode : "", paymentMethod);
        router.replace(`/orders?placed=${encodeURIComponent(order.id)}&demo=1`);
      } catch (cause) {
        setMessage(cause instanceof Error ? cause.message : "We couldn't create the demo order.");
        setBusy(false);
      }
      return;
    }
    if (!firebaseConfigured) { setMessage("Connect Firebase before placing an order."); return; }
    if (!lines.length) { setMessage("Your bag is empty."); return; }
    if (pendingVerification) {
      setBusy(true);
      await confirmPayment(pendingVerification);
      return;
    }

    if (paymentMethod === "cod" && !demoMode) {
      setBusy(true);
      try {
        await persistAddress();
        const createOrder = httpsCallable<
          { items: Array<{ productId: string; quantity: number }>; address: DeliveryAddress; couponCode?: string },
          { orderId: string }
        >(functions, "createCashOnDeliveryOrder");
        const result = await createOrder({
          items: lines.map(({ productId, quantity }) => ({ productId, quantity })),
          address,
          ...(couponCode.trim() ? { couponCode: couponCode.trim().toUpperCase() } : {}),
        });
        clearCart();
        router.replace(`/orders?placed=${encodeURIComponent(result.data.orderId)}&cod=1`);
      } catch (cause) {
        setMessage(cause instanceof Error ? cause.message : "We couldn't place your cash-on-delivery order.");
        setBusy(false);
      }
      return;
    }

    const RazorpayCheckout = window.Razorpay;
    if (!scriptReady || !RazorpayCheckout) {
      setMessage("Payment checkout is still loading. Please try again in a moment.");
      return;
    }
    setBusy(true);
    try {
      await persistAddress();
      const createOrder = httpsCallable<
        { items: Array<{ productId: string; quantity: number }>; address: DeliveryAddress; couponCode?: string },
        { orderId: string; amount: number; currency: string; keyId: string }
      >(functions, "createRazorpayOrder");
      const result = await createOrder({
        items: lines.map(({ productId, quantity }) => ({ productId, quantity })),
        address,
        ...(couponCode.trim() ? { couponCode: couponCode.trim().toUpperCase() } : {}),
      });
      const { orderId, amount, currency, keyId } = result.data;
      const razorpay = new RazorpayCheckout({
        key: keyId,
        amount,
        currency,
        name: "Swag Shopping Mall",
        description: "Good things, headed your way",
        order_id: orderId,
        prefill: { name: address.name, email: user.email ?? "", contact: address.phone },
        notes: { deliveryCity: address.city },
        theme: { color: "#344b40" },
        handler: async (response: Record<string, string>) => {
          setPendingVerification(response);
          await confirmPayment(response);
        },
        modal: {
          ondismiss: () => setBusy(false),
        },
      });
      razorpay.open();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "We couldn't start checkout. Please try again.");
      setBusy(false);
    }
  }

  if (!lines.length) return <div className="shell page-shell"><div className="empty-state"><h2>Your bag is empty.</h2><p>Add a few good things before heading to checkout.</p><Link className="button button-dark" href="/">Back to the shop</Link></div></div>;

  const submitLabel = busy
    ? demoMode ? "Creating your test order..." : pendingVerification ? "Confirming your order..." : "Opening secure checkout..."
    : demoMode
      ? paymentMethod === "fail"
        ? <>Simulate payment failure <ArrowRight size={17} /></>
        : <>Place demo order · {formatPrice(subtotal - discount)} <ArrowRight size={17} /></>
      : pendingVerification
        ? <>Retry order confirmation <ArrowRight size={17} /></>
        : paymentMethod === "cod"
          ? <>Place order · pay on delivery <ArrowRight size={17} /></>
          : <>Continue to secure payment <ArrowRight size={17} /></>;

  return <div className="shell page-shell checkout-page">
    <Link href="/cart" className="back-link"><ArrowLeft size={16} /> Back to your bag</Link>
    <div className="page-heading"><span className="eyebrow">Almost at your door</span><h1>Checkout<span className="brand-dot">.</span></h1><p>A few details, then your good things are on their way.</p></div>
    <div className="checkout-layout"><form className="checkout-form" onSubmit={pay}>
      <section className="checkout-section"><div className="address-heading"><div className="checkout-section-title"><span>01</span><div><h2>Where should we send it?</h2><p>{savedAddress ? "Saved delivery address" : "Delivery address"}</p></div></div>{savedAddress && !addressEditing && <button type="button" className="text-link address-edit-button" onClick={() => { setAddress(savedAddress); setAddressEditing(true); }}><Pencil size={14} /> Edit address</button>}</div>
        {addressLoading ? <p className="address-loading">Loading your saved address…</p> : savedAddress && !addressEditing ? <div className="saved-address"><strong>{savedAddress.name}</strong><span>{savedAddress.phone}</span><span>{savedAddress.line1}</span><span>{savedAddress.city}, {savedAddress.state} {savedAddress.pincode}</span></div> : <><div className="form-grid">{([
          ["name", "Full name", "e.g. Asha Sharma", "text"],
          ["phone", "Phone number", "10-digit mobile number", "tel"],
          ["line1", "Street address", "House / flat, street, area", "text"],
          ["city", "City", "Your city", "text"],
          ["state", "State", "Your state", "text"],
          ["pincode", "PIN code", "6-digit PIN code", "text"],
        ] as const).map(([field, label, placeholder, type]) => <label key={field} className={field === "line1" ? "field-wide" : ""}>{label}<input required value={address[field]} type={type} inputMode={field === "phone" || field === "pincode" ? "numeric" : undefined} pattern={field === "phone" ? "[0-9]{10}" : field === "pincode" ? "[0-9]{6}" : undefined} maxLength={field === "phone" ? 10 : field === "pincode" ? 6 : undefined} placeholder={placeholder} onChange={(event) => setAddress({ ...address, [field]: event.target.value })} /></label>)}</div><div className="address-form-actions"><button type="button" className="text-link" onClick={saveAddress} disabled={savingAddress || !isAddressComplete(address)}>{savingAddress ? "Saving address…" : "Save address"}</button>{savedAddress && <button type="button" className="text-link" onClick={() => { setAddress(savedAddress); setAddressEditing(false); setMessage(""); }}>Cancel</button>}</div></>}
      </section>
      <section className="checkout-section coupon-section"><div className="checkout-section-title"><span>02</span><div><h2>Have a little something extra?</h2><p>Apply a discount code</p></div></div><div className="coupon-input"><Tag size={17} /><input value={couponCode} onChange={(event) => { setCouponCode(event.target.value.toUpperCase()); setOfferApplied(false); setOfferMessage(""); }} placeholder="Enter discount code" /><button type="button" onClick={applyOffer}>{offerApplied ? "Applied ✓" : "Apply"}</button></div><p className={`coupon-hint ${offerApplied ? "offer-success" : offerMessage ? "offer-error" : ""}`}>{offerMessage || (demoMode ? "Try WELCOME10 for 10% off orders over ₹500 (up to ₹250 off)." : "Eligible offers are verified securely when you place your order.")}</p></section>
      <section className="checkout-section demo-payment-section"><div className="checkout-section-title"><span>03</span><div><h2>{demoMode ? "Try a payment option" : "Payment method"}</h2><p>{demoMode ? "No real charge—this is a safe demo checkout." : "Choose how you’d like to pay."}</p></div></div><div className="demo-payment-options"><label className={paymentMethod === "upi" ? "selected" : ""}><input type="radio" name="payment-method" value="upi" checked={paymentMethod === "upi"} disabled={busy || Boolean(pendingVerification)} onChange={() => setPaymentMethod("upi")} /><Wallet size={17} /><span><strong>UPI / online</strong><small>{demoMode ? "Simulate a successful payment" : "Pay securely with Razorpay"}</small></span><Check size={15} /></label>{cashOnDeliveryEnabled && <label className={paymentMethod === "cod" ? "selected" : ""}><input type="radio" name="payment-method" value="cod" checked={paymentMethod === "cod"} disabled={busy || Boolean(pendingVerification)} onChange={() => setPaymentMethod("cod")} /><CreditCard size={17} /><span><strong>Cash on delivery</strong><small>{demoMode ? "Test the COD order flow" : "Pay in cash when your order arrives"}</small></span><Check size={15} /></label>}{demoMode && <label className={paymentMethod === "fail" ? "selected" : ""}><input type="radio" name="payment-method" value="fail" checked={paymentMethod === "fail"} disabled={busy} onChange={() => setPaymentMethod("fail")} /><LockKeyhole size={17} /><span><strong>Payment failure</strong><small>Test a declined payment</small></span><Check size={15} /></label>}</div></section>
      {!user && <p className="form-error">Please <Link href="/login?next=/checkout">sign in</Link> before checkout.</p>}
      {message && <p className="form-error">{message}</p>}
      <button className="button button-dark place-order-button" disabled={busy || addressLoading || savingAddress || (!demoMode && paymentMethod !== "cod" && !scriptReady && !pendingVerification)}>{submitLabel}</button>
      <p className="secure-note"><LockKeyhole size={14} /> {demoMode ? "Demo only · No money will be charged" : paymentMethod === "cod" ? "No payment is taken now · Pay when your order arrives" : "Payments securely processed by Razorpay"}</p>
    </form>
    <aside className="order-summary checkout-summary"><h2>A little recap</h2><div className="checkout-items">{lines.map(({ product, quantity }) => <div className="checkout-item" key={product!.id}><img src={product!.image} alt="" /><span><strong>{product!.name}</strong><small>Qty {quantity} · {product!.unit}</small></span><b>{formatPrice(product!.price * quantity)}</b></div>)}</div><div className="summary-row"><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></div>{discount > 0 && <div className="summary-row demo-discount"><span>WELCOME10 · 10% off</span><strong>−{formatPrice(discount)}</strong></div>}<div className="summary-row"><span>Delivery</span><strong>{subtotal >= 99900 ? "On us" : "At checkout"}</strong></div><div className="summary-row summary-total"><span>{demoMode ? "Demo total" : paymentMethod === "cod" ? "Order total" : "Total before offer"}</span><strong>{formatPrice(subtotal - discount)}</strong></div><p className="summary-note">{demoMode ? "Preview order only. No payment will be processed." : paymentMethod === "cod" ? "Pay the order total in cash when it's delivered." : "Any valid discount will be applied securely before payment."}</p><div className="delivery-estimate"><Truck size={18} /><span><strong>Thoughtful things, on their way</strong><small>Usually delivered in 3–5 business days</small></span></div></aside></div>
  </div>;
}

function isDeliveryAddress(value: unknown): value is DeliveryAddress {
  if (!value || typeof value !== "object") return false;
  const address = value as Record<string, unknown>;
  return ["name", "phone", "line1", "city", "state", "pincode"]
    .every((field) => typeof address[field] === "string") &&
    typeof address.phone === "string" && /^\d{10}$/.test(address.phone) &&
    typeof address.pincode === "string" && /^\d{6}$/.test(address.pincode);
}

"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { ArrowLeft, ArrowRight, Leaf } from "lucide-react";
import { auth, db, firebaseConfigured } from "@/lib/firebase";
import { ADMIN_EMAIL } from "@/lib/admin";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useStore } from "@/components/store-provider";
import { DEMO_ADMIN, DEMO_CUSTOMER } from "@/lib/demo-auth";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { user, demoLoginEnabled, signInDemo } = useStore();
  const [returnTo, setReturnTo] = useState("/");

  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get("next");
    if (next?.startsWith("/") && !next.startsWith("//")) setReturnTo(next);
  }, []);

  async function handleAuth(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (demoLoginEnabled && mode === "login" && signInDemo(email, password)) {
      router.replace(email.trim().toLowerCase() === DEMO_ADMIN.email ? "/admin" : returnTo);
      return;
    }
    if (!firebaseConfigured) {
      setError(demoLoginEnabled
        ? "Those demo credentials don't match. Use the sample customer details below."
        : "Add your Firebase settings to .env.local to enable sign in.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(credential.user, { displayName: name });
        await setDoc(doc(db, "users", credential.user.uid), { name, email, role: "customer", createdAt: serverTimestamp() });
        router.replace(returnTo);
      } else {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        const token = await credential.user.getIdTokenResult();
        router.replace(
          token.claims.admin === true || credential.user.email?.toLowerCase() === ADMIN_EMAIL
            ? "/admin"
            : returnTo,
        );
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message.replace("Firebase: ", "") : "We couldn't sign you in. Please try again.");
    } finally { setBusy(false); }
  }

  if (user) return <div className="shell page-shell"><div className="empty-state"><span className="eyebrow">Already at home</span><h2>You're signed in.</h2><Link href="/" className="button button-dark">Back to the shop</Link></div></div>;
  return <div className="auth-page"><div className="auth-card">
    <Link href="/" className="back-link"><ArrowLeft size={16} /> Back to Swag Shopping Mall</Link>
    <div className="auth-brand"><span className="brand-mark">S</span><span>Swag Shopping Mall</span></div>
    <span className="eyebrow">Good to have you here</span><h1>{mode === "login" ? "Welcome back." : "Come on in."}</h1><p>{mode === "login" ? "Sign in to pick up where you left off." : "A little account makes every order easier."}</p>
    {demoLoginEnabled && mode === "login" && <div className="demo-login-card">
      <div><span className="demo-login-label">LOCAL PREVIEW ACCOUNTS</span><strong>Choose your demo</strong><small>Everything stays in this browser. No real payments.</small></div>
      <div className="demo-account-choice"><span>Shop as a customer</span><dl><div><dt>Email</dt><dd>{DEMO_CUSTOMER.email}</dd></div><div><dt>Password</dt><dd>{DEMO_CUSTOMER.password}</dd></div></dl><button type="button" onClick={() => { setEmail(DEMO_CUSTOMER.email); setPassword(DEMO_CUSTOMER.password); setError(""); }}>Use demo customer</button></div>
      <div className="demo-account-choice"><span>Manage the demo shop</span><dl><div><dt>Email</dt><dd>{DEMO_ADMIN.email}</dd></div><div><dt>Password</dt><dd>{DEMO_ADMIN.password}</dd></div></dl><button type="button" onClick={() => { setEmail(DEMO_ADMIN.email); setPassword(DEMO_ADMIN.password); setError(""); }}>Use demo admin</button></div>
    </div>}
    <form onSubmit={handleAuth} className="form-stack">
      {mode === "signup" && <label>Your name<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="How should we call you?" /></label>}
      <label>Email address<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
      <label>Password<input required type="password" minLength={6} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" /></label>
      {error && <p className="form-error">{error}</p>}
      <button className="button button-dark form-submit" disabled={busy}>{busy ? "One moment..." : mode === "login" ? "Sign in" : "Create account"} <ArrowRight size={17} /></button>
    </form>
    <div className="auth-switch">{mode === "login" ? "New to Swag Shopping Mall?" : "Already have an account?"} <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}>{mode === "login" ? "Create an account" : "Sign in"}</button></div>
    <div className="auth-assurance"><Leaf size={15} /> Your details stay yours, always.</div>
  </div></div>;
}

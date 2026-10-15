"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { auth, db, firebaseConfigured } from "@/lib/firebase";
import { ADMIN_EMAIL } from "@/lib/admin";
import { DEMO_PRODUCTS } from "@/lib/demo-products";
import { DEMO_ADMIN, DEMO_CUSTOMER, DEMO_LOGIN_ENABLED } from "@/lib/demo-auth";
import type { Product, StoreOrder } from "@/lib/types";

type StoreUser = Pick<User, "uid" | "email" | "displayName"> & { isDemo?: boolean };

type StoreContextValue = {
  products: Product[];
  user: StoreUser | null;
  isAdmin: boolean;
  demoLoginEnabled: boolean;
  signInDemo: (email: string, password: string) => boolean;
  signOutUser: () => Promise<void>;
  saveDemoProduct: (product: Omit<Product, "id">, productId?: string) => void;
  deleteDemoProduct: (productId: string) => void;
  setDemoOrderStatus: (orderId: string, status: string) => void;
  cart: Record<string, number>;
  favorites: string[];
  orders: StoreOrder[];
  loading: boolean;
  search: string;
  setSearch: (search: string) => void;
  setCategory: (category: string) => void;
  category: string;
  addToCart: (id: string, amount?: number) => void;
  setQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  toggleFavorite: (id: string) => void;
  clearCart: () => void;
  placeDemoOrder: (address: StoreOrder["address"], couponCode: string, paymentMethod: string) => StoreOrder;
  advanceDemoOrder: (orderId: string) => void;
};

const StoreContext = createContext<StoreContextValue | null>(null);
const demoLoginEnabled = DEMO_LOGIN_ENABLED && !firebaseConfigured;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(DEMO_PRODUCTS);
  const [user, setUser] = useState<StoreUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [favorites, setFavorites] = useState<string[]>([]);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("bazaar-cart");
      const savedFavorites = localStorage.getItem("bazaar-favorites");
      if (demoLoginEnabled && localStorage.getItem("bazaar-demo-user") === DEMO_CUSTOMER.uid) {
        setUser({
          uid: DEMO_CUSTOMER.uid,
          email: DEMO_CUSTOMER.email,
          displayName: DEMO_CUSTOMER.displayName,
          isDemo: true,
        });
      } else if (demoLoginEnabled && localStorage.getItem("bazaar-demo-user") === DEMO_ADMIN.uid) {
        setUser({
          uid: DEMO_ADMIN.uid,
          email: DEMO_ADMIN.email,
          displayName: DEMO_ADMIN.displayName,
          isDemo: true,
        });
        setIsAdmin(true);
      }
      if (demoLoginEnabled) {
        const savedProducts = localStorage.getItem("bazaar-demo-products");
        if (savedProducts) setProducts(JSON.parse(savedProducts) as Product[]);
        const savedOrders = localStorage.getItem("bazaar-demo-orders");
        if (savedOrders) {
          const parsedOrders = JSON.parse(savedOrders) as Array<StoreOrder & { createdAt?: string }>;
          setOrders(parsedOrders.map((order) => ({
            ...order,
            createdAt: order.createdAt ? new Date(order.createdAt) : undefined,
          })));
        }
      }
      if (savedCart) setCart(JSON.parse(savedCart));
      if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
    } catch (error) {
      console.error("Could not restore saved shopping preferences.", error);
    } finally {
      setPreferencesLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!firebaseConfigured) {
      setLoading(false);
      return;
    }
    const stop = onSnapshot(collection(db, "products"), (snapshot) => {
      const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(rows.filter((product) => product.active !== false));
      setLoading(false);
    }, (error) => {
      console.error("Unable to load the product catalog.", error);
      setLoading(false);
    });
    return stop;
  }, []);

  useEffect(() => {
    if (!firebaseConfigured) return;
    return onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser && demoLoginEnabled) {
        const demoUserId = localStorage.getItem("bazaar-demo-user");
        const demoAccount = demoUserId === DEMO_CUSTOMER.uid
          ? DEMO_CUSTOMER
          : demoUserId === DEMO_ADMIN.uid
            ? DEMO_ADMIN
            : null;
        if (demoAccount) {
          setUser({
            uid: demoAccount.uid,
            email: demoAccount.email,
            displayName: demoAccount.displayName,
            isDemo: true,
          });
          setIsAdmin(demoAccount.uid === DEMO_ADMIN.uid);
          setOrders([]);
          return;
        }
      }
      setUser(currentUser ? {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName,
      } : null);
      setOrders([]);
      setIsAdmin(false);
      if (!currentUser) return;
      try {
        const token = await currentUser.getIdTokenResult();
        setIsAdmin(token.claims.admin === true || currentUser.email?.toLowerCase() === ADMIN_EMAIL);
      } catch (error) {
        console.error("Unable to verify account role.", error);
      }
    });
  }, []);

  useEffect(() => {
    if (!firebaseConfigured || !user || user.isDemo) return;
    return onSnapshot(
      query(collection(db, "orders"), where("userId", "==", user.uid)),
      (snapshot) => {
        setOrders(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as StoreOrder))
          .sort((a, b) => orderTimestamp(b) - orderTimestamp(a)));
      },
      (error) => console.error("Unable to load order history.", error),
    );
  }, [user]);

  useEffect(() => {
    if (!preferencesLoaded) return;
    localStorage.setItem("bazaar-cart", JSON.stringify(cart));
  }, [cart, preferencesLoaded]);
  useEffect(() => {
    if (!preferencesLoaded) return;
    localStorage.setItem("bazaar-favorites", JSON.stringify(favorites));
  }, [favorites, preferencesLoaded]);
  useEffect(() => {
    if (!preferencesLoaded || !demoLoginEnabled || !user?.isDemo) return;
    localStorage.setItem("bazaar-demo-orders", JSON.stringify(orders));
  }, [orders, preferencesLoaded, user]);
  useEffect(() => {
    if (!preferencesLoaded || !demoLoginEnabled) return;
    localStorage.setItem("bazaar-demo-products", JSON.stringify(products));
  }, [products, preferencesLoaded]);

  const addToCart = useCallback((id: string, amount = 1) => {
    setCart((previous) => {
      const product = products.find((item) => item.id === id);
      const current = previous[id] ?? 0;
      return { ...previous, [id]: Math.min(current + amount, product?.stock ?? 99, 99) };
    });
  }, [products]);
  const setQuantity = useCallback((id: string, quantity: number) => {
    setCart((previous) => {
      if (quantity <= 0) {
        const next = { ...previous };
        delete next[id];
        return next;
      }
      const product = products.find((item) => item.id === id);
      return { ...previous, [id]: Math.min(quantity, product?.stock ?? 99, 99) };
    });
  }, [products]);
  const removeFromCart = useCallback((id: string) => {
    setCart((previous) => {
      const next = { ...previous };
      delete next[id];
      return next;
    });
  }, []);
  const toggleFavorite = useCallback((id: string) => {
    setFavorites((previous) => previous.includes(id)
      ? previous.filter((item) => item !== id)
      : [...previous, id]);
  }, []);
  const clearCart = useCallback(() => setCart({}), []);
  const placeDemoOrder = useCallback((address: StoreOrder["address"], couponCode: string, paymentMethod: string) => {
    if (!demoLoginEnabled || !user?.isDemo) throw new Error("Sign in with the local demo customer to place a preview order.");
    if (!Object.keys(cart).length) throw new Error("Your bag is empty.");

    const items = Object.entries(cart).map(([productId, quantity]) => {
      const product = products.find((item) => item.id === productId);
      if (!product || product.active === false || product.stock < quantity) {
        throw new Error(`${product?.name ?? "A product"} is no longer available in the requested quantity.`);
      }
      return { productId, name: product.name, price: product.price, quantity };
    });
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    let discount = 0;
    if (couponCode.trim()) {
      if (couponCode.trim().toUpperCase() !== "WELCOME10" || subtotal < 50000) {
        throw new Error("WELCOME10 is a demo offer for orders of ₹500 or more.");
      }
      discount = Math.min(Math.floor(subtotal * 10 / 100), 25000);
    }

    const orderId = `DEMO-${Date.now().toString(36).toUpperCase()}`;
    const order: StoreOrder = {
      id: orderId,
      userId: user.uid,
      customerEmail: user.email ?? undefined,
      items,
      address,
      subtotal,
      discount,
      total: subtotal - discount,
      status: "confirmed",
      createdAt: new Date(),
      payment: { provider: "demo", method: paymentMethod, paymentId: "DEMO-PAYMENT" },
    };
    setProducts((previous) => previous.map((product) => {
      const line = cart[product.id];
      return line ? { ...product, stock: Math.max(0, product.stock - line) } : product;
    }));
    setOrders((previous) => {
      return [order, ...previous];
    });
    setCart({});
    return order;
  }, [cart, products, user]);
  const advanceDemoOrder = useCallback((orderId: string) => {
    if (!demoLoginEnabled || !user?.isDemo) return;
    const stages = ["confirmed", "processing", "shipped", "delivered"];
    setOrders((previous) => {
      const next = previous.map((order) => {
        if (order.id !== orderId) return order;
        const index = stages.indexOf(order.status);
        return index >= 0 && index < stages.length - 1
          ? { ...order, status: stages[index + 1] }
          : order;
      });
      return next;
    });
  }, [user]);
  const signInDemo = useCallback((email: string, password: string) => {
    if (!demoLoginEnabled) return false;
    const normalizedEmail = email.trim().toLowerCase();
    const account = normalizedEmail === DEMO_CUSTOMER.email && password === DEMO_CUSTOMER.password
      ? DEMO_CUSTOMER
      : normalizedEmail === DEMO_ADMIN.email && password === DEMO_ADMIN.password
        ? DEMO_ADMIN
        : null;
    if (!account) return false;
    const demoUser: StoreUser = {
      uid: account.uid,
      email: account.email,
      displayName: account.displayName,
      isDemo: true,
    };
    setUser(demoUser);
    setIsAdmin(account.uid === DEMO_ADMIN.uid);
    localStorage.setItem("bazaar-demo-user", account.uid);
    return true;
  }, []);
  const signOutUser = useCallback(async () => {
    if (user?.isDemo) {
      localStorage.removeItem("bazaar-demo-user");
      setUser(null);
      setIsAdmin(false);
      return;
    }
    if (firebaseConfigured) await signOut(auth);
  }, [user]);
  const saveDemoProduct = useCallback((product: Omit<Product, "id">, productId?: string) => {
    if (!demoLoginEnabled || !user?.isDemo || !isAdmin) throw new Error("Demo administrator access is required.");
    setProducts((previous) => {
      const id = productId ?? `demo-product-${Date.now().toString(36)}`;
      const next = productId
        ? previous.map((item) => item.id === productId ? { ...product, id } : item)
        : [...previous, { ...product, id }];
      return next;
    });
  }, [demoLoginEnabled, isAdmin, user]);
  const deleteDemoProduct = useCallback((productId: string) => {
    if (!demoLoginEnabled || !user?.isDemo || !isAdmin) throw new Error("Demo administrator access is required.");
    setProducts((previous) => {
      return previous.filter((item) => item.id !== productId);
    });
  }, [demoLoginEnabled, isAdmin, user]);
  const setDemoOrderStatus = useCallback((orderId: string, status: string) => {
    if (!demoLoginEnabled || !user?.isDemo || !isAdmin) throw new Error("Demo administrator access is required.");
    const allowed = ["confirmed", "processing", "shipped", "delivered", "cancelled"];
    if (!allowed.includes(status)) throw new Error("Choose a valid demo order status.");
    const existing = orders.find((order) => order.id === orderId);
    if (!existing) throw new Error("Demo order not found.");
    if (["delivered", "cancelled"].includes(existing.status) && status !== existing.status) {
      throw new Error("A delivered or cancelled demo order cannot be changed.");
    }
    if (status === "cancelled" && existing.status !== "cancelled") {
      setProducts((previous) => previous.map((product) => {
        const returnedQuantity = existing.items
          .filter((item) => item.productId === product.id)
          .reduce((total, item) => total + item.quantity, 0);
        return returnedQuantity ? { ...product, stock: product.stock + returnedQuantity } : product;
      }));
    }
    setOrders((previous) => previous.map((order) => order.id === orderId ? { ...order, status } : order));
  }, [demoLoginEnabled, isAdmin, orders, user]);
  const value = useMemo(() => ({
    products, user, isAdmin, demoLoginEnabled, signInDemo, signOutUser,
    saveDemoProduct, deleteDemoProduct, setDemoOrderStatus,
    cart, favorites, orders, loading, search, setSearch,
    category, setCategory, addToCart, setQuantity, removeFromCart, toggleFavorite, clearCart,
    placeDemoOrder, advanceDemoOrder,
  }), [products, user, isAdmin, cart, favorites, orders, loading, search, category,
    demoLoginEnabled, signInDemo, signOutUser, saveDemoProduct, deleteDemoProduct, setDemoOrderStatus,
    addToCart, setQuantity, removeFromCart, toggleFavorite, clearCart,
    placeDemoOrder, advanceDemoOrder]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

function orderTimestamp(order: StoreOrder) {
  if (!order.createdAt) return 0;
  if (order.createdAt instanceof Date) return order.createdAt.getTime();
  if (typeof order.createdAt === "string") return new Date(order.createdAt).getTime();
  return order.createdAt.toDate().getTime();
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used inside StoreProvider.");
  return context;
}

export const DEMO_LOGIN_ENABLED = process.env.NODE_ENV === "development";

export const DEMO_CUSTOMER = {
  email: "demo@bazaar.test",
  password: "BazaarDemo123!",
  uid: "bazaar-demo-customer",
  displayName: "Demo Customer",
} as const;

export const DEMO_ADMIN = {
  email: "admin@bazaar.test",
  password: "BazaarAdmin123!",
  uid: "bazaar-demo-admin",
  displayName: "Demo Admin",
} as const;

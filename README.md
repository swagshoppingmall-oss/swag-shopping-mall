# Swag Shopping Mall

A responsive wholesale-to-customer storefront for Swag Shopping Mall, built with Next.js, Firebase Authentication/Firestore/Cloud Functions, and Razorpay. Product prices, order totals, coupons, stock checks, and payment verification are handled on trusted server code; the browser never receives the Razorpay secret. Checkout supports Razorpay online payments and cash on delivery.

## Stack

- Next.js 16 App Router, React, TypeScript, responsive custom CSS
- Firebase Authentication (email/password), Firestore
- Firebase callable Cloud Functions and Razorpay Checkout
- Firestore security rules protect admin-managed data and server-owned orders

## Get started

1. Install Node.js 24.12+ and Firebase CLI, then install the root dependencies:

   ```sh
   npm install
   ```

   For a local storefront preview before Firebase is configured, run `npm run dev` and use a development-only account shown on the login page:

   - Demo customer: `demo@bazaar.test` / `BazaarDemo123!`
   - Demo administrator: `admin@bazaar.test` / `BazaarAdmin123!`

   Demo checkout supports sample coupon `WELCOME10`, simulated successful payment, COD, and a declined-payment test. Preview orders, inventory, order tracking, and admin catalog/order changes persist in this browser's local storage only. No payment is charged, no Firebase data is written, and demo accounts cannot authenticate against Firebase. Demo access is disabled in production.

2. The Firebase web app configuration for project `swag-shopping-mall` is in `.env.example`, and `.firebaserc` selects that project for Firebase CLI commands. `.env.local` is already populated for local development. In Firebase Console, enable Email/Password and Google sign-in under Authentication and create the Firestore database if they are not already enabled. The Firebase web API key is a public client identifier; restrict it to the app's domains in Google Cloud. Never put Razorpay secrets in `NEXT_PUBLIC_*` variables.

3. Install the Functions dependencies and configure Razorpay secrets in the Firebase project:

   ```sh
   cd functions
   npm install
   cd ..
   firebase functions:secrets:set RAZORPAY_KEY_ID
   firebase functions:secrets:set RAZORPAY_KEY_SECRET
   ```

   Ensure the Firebase CLI is signed in to an account with access to `swag-shopping-mall`. The server callable returns the configured public key ID to the signed-in customer. Use test-mode Razorpay keys until ready for production.

4. Start Firestore, Authentication, and Functions emulators in one terminal, and the web app in another:

   ```sh
   firebase emulators:start
   npm run dev
   ```

   Set `NEXT_PUBLIC_FIREBASE_EMULATORS=true` in `.env.local` to connect the browser SDK to the local Auth, Firestore, and Functions emulators. Deploy a Functions emulator build with `cd functions && npm run build` first.

5. The storefront includes eight sample products in `lib/demo-products.ts`, so the catalog is visible immediately before Firebase is configured. Local demo mode supports end-to-end preview authentication, coupon application, simulated payment success/failure, COD, order history/tracking, demo inventory, and admin catalog/order controls. Demo changes stay in browser storage; Firebase is required for live authentication, inventory, payment, and orders. To copy the sample catalog into Firestore, run the seeder from a trusted environment authenticated with Firebase Application Default Credentials:

   ```sh
   npm run seed
   ```

   This adds eight example products and a `WELCOME10` coupon (10% off, ₹500 minimum, ₹250 maximum discount). Seed data is in `scripts/seed-products.ts`; prices are stored as integer paise.

6. To grant administrator access to the existing Firebase Authentication user `admin@swagshoppingmall.com`, first sign in with Google Application Default Credentials using an account authorized to manage Firebase Authentication, then run the Admin SDK script from the project root:

   ```powershell
   gcloud auth application-default login
   $env:FIREBASE_PROJECT_ID="swag-shopping-mall"
   npx tsx scripts/set-admin.ts
   ```

   The script sets the `admin` custom claim for that exact email. Have the user sign out and back in; on their next login, the app opens `/admin`. Keep the script in a trusted environment and never expose service-account credentials or grant claims from client code. For local development, the demo administrator remains available as a browser-only preview; it does not grant Firebase permissions.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Build the production storefront |
| `npm run seed` | Add/update example products and the sample coupon |
| `npm run seed:users` | Create optional sample Auth users and Firestore profiles |
| `npx tsx scripts/set-admin.ts` | Grant the configured Firebase project admin claim to `admin@swagshoppingmall.com` |
| `npm run lint` | Type-check the storefront |
| `npm run emulate` | Start Firebase emulators |
| `npm run deploy:firebase` | Deploy Firestore rules, indexes, and Cloud Functions |
| `cd functions && npm run build` | Compile Cloud Functions |

## Included functionality

- Search and category filtering, product detail pages, availability, cart and quantity controls, persistent wishlist
- Firebase email/password and Google authentication, customer orders and order status tracking
- Razorpay online payments and cash-on-delivery orders with server-calculated item pricing and discounts, stock validation, and transactional inventory decrement
- Safe payment recovery: a captured payment with a transient verification failure can be re-verified from checkout without creating a second charge
- Admin custom-claim authorization, catalog CRUD, order status management, sales totals, order average, low-stock count, and top-selling products
- In-app order confirmations/status updates through Firestore snapshots

## Security and deployment notes

- Deploy rules, indexes, and Functions with `firebase deploy --only firestore:rules,firestore:indexes,functions`. Deploy the Next.js app to Vercel (or another Node-compatible host) with the `NEXT_PUBLIC_*` Firebase configuration. Do not commit `.env.local` or service-account keys.
- Only a trusted Admin SDK can set the `admin` custom claim. The client-side `users/{uid}.role` profile value is descriptive and does not grant permissions. The local demo administrator does not grant Firebase permissions.
- Firestore denies all client order/transaction writes. The Functions validate the signed-in user, server-read prices/stock/coupon details, verify Razorpay's HMAC signature, and atomically write paid or cash-on-delivery orders and decrement stock.
- A Razorpay payment that succeeds but cannot be verified from the browser remains recoverable: check Razorpay's payment dashboard and the associated `checkoutDrafts/{razorpayOrderId}` record before asking a customer to retry. Do not manually change order or transaction documents from an untrusted client.
- Production readiness still requires business-specific shipping/tax rules, customer support/contact details, email/SMS notification delivery, privacy/terms pages, refund operations, monitoring, and deployment-secret configuration.

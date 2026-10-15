import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

initializeApp({ credential: applicationDefault() });
const auth = getAuth();
const db = getFirestore();

async function ensureUser(emailName: string, passwordName: string, displayName: string) {
  const email = process.env[emailName];
  const password = process.env[passwordName];
  if (!email && !password) return;
  if (!email || !password || password.length < 8) {
    throw new Error(`Set both ${emailName} and ${passwordName}; the password must be at least 8 characters.`);
  }
  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch (error) {
    if (!(typeof error === "object" && error !== null && "code" in error &&
      error.code === "auth/user-not-found")) throw error;
    user = await auth.createUser({ email, password, displayName, emailVerified: false });
  }
  await db.collection("users").doc(user.uid).set({
    name: user.displayName ?? displayName,
    email,
    role: "customer",
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  console.log(`Seeded customer profile for ${email}.`);
}

await ensureUser("BAZAAR_SAMPLE_CUSTOMER_EMAIL", "BAZAAR_SAMPLE_CUSTOMER_PASSWORD", "Sample Swag Shopping Mall Customer");
console.log("Customer seed complete. Provide email/password environment variables to create the sample account; no default credentials are created.");

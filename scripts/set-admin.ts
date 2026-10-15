import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const adminEmail = "admin@swagshoppingmall.com";

initializeApp({
  credential: applicationDefault(),
  projectId: process.env.FIREBASE_PROJECT_ID ?? "swag-shopping-mall",
});

async function main() {
  const auth = getAuth();
  const user = await auth.getUserByEmail(adminEmail);
  await auth.setCustomUserClaims(user.uid, {
    ...user.customClaims,
    admin: true,
  });

  console.log(`Granted admin access to ${adminEmail}. Ask them to sign out and back in to refresh their role.`);
}

main().catch((error: unknown) => {
  console.error("Could not grant admin access.", error);
  process.exitCode = 1;
});

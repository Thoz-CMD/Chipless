import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getDatabase, type Database } from "firebase-admin/database";

type FirebaseTokenVerification = {
  uid: string;
};

function getAdminApp() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ?.replace(/^"|"$/g, "")
    .replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are required.",
    );
  }

  return (
    getApps()[0] ??
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      databaseURL:
        process.env.FIREBASE_DATABASE_URL ??
        process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    })
  );
}

export function getFirebaseAdminDatabase(): Database {
  return getDatabase(getAdminApp());
}

export async function verifyFirebaseIdToken(
  idToken: string,
): Promise<FirebaseTokenVerification> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY is required.");
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      cache: "no-store",
    },
  );
  const responseValue: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error("Firebase authentication failed.");
  }

  const users =
    responseValue && typeof responseValue === "object"
      ? (responseValue as Record<string, unknown>).users
      : null;
  const firstUser = Array.isArray(users) ? users[0] : null;
  const uid =
    firstUser && typeof firstUser === "object"
      ? (firstUser as Record<string, unknown>).localId
      : null;

  if (typeof uid !== "string" || uid.length === 0) {
    throw new Error("Firebase authentication failed.");
  }

  return { uid };
}

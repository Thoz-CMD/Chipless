import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getDatabase, type Database } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function getFirebaseDatabaseUrl(): string | undefined {
  return firebaseConfig.databaseURL;
}

const requiredFirebaseConfigKeys = [
  "apiKey",
  "authDomain",
  "databaseURL",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
] as const;

export class FirebaseConfigError extends Error {
  constructor(missingKeys: string[]) {
    super(
      `Firebase config is incomplete. Missing environment variables: ${missingKeys.join(
        ", ",
      )}. Create .env.local from .env.example and fill in your Firebase Web App config.`,
    );
    this.name = "FirebaseConfigError";
  }
}

function assertFirebaseConfig() {
  const missingKeys = requiredFirebaseConfigKeys
    .filter((key) => !firebaseConfig[key])
    .map((key) => {
      switch (key) {
        case "apiKey":
          return "NEXT_PUBLIC_FIREBASE_API_KEY";
        case "authDomain":
          return "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN";
        case "databaseURL":
          return "NEXT_PUBLIC_FIREBASE_DATABASE_URL";
        case "projectId":
          return "NEXT_PUBLIC_FIREBASE_PROJECT_ID";
        case "storageBucket":
          return "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET";
        case "messagingSenderId":
          return "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID";
        case "appId":
          return "NEXT_PUBLIC_FIREBASE_APP_ID";
      }
    });

  if (missingKeys.length > 0) {
    throw new FirebaseConfigError(missingKeys);
  }
}

export function getFirebaseApp(): FirebaseApp {
  assertFirebaseConfig();

  return getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function getRealtimeDatabase(): Database {
  return getDatabase(getFirebaseApp());
}

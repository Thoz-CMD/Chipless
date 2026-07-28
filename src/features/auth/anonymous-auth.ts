import { FirebaseError } from "firebase/app";
import { signInAnonymously, type UserCredential } from "firebase/auth";

import { getFirebaseAuth } from "@/lib/firebase/client";

export class AnonymousSignInError extends Error {
  readonly code?: string;

  constructor(message: string, options?: ErrorOptions & { code?: string }) {
    super(message, options);
    this.name = "AnonymousSignInError";
    this.code = options?.code;
  }
}

export async function signInWithAnonymousAccount(): Promise<UserCredential> {
  try {
    return await signInAnonymously(getFirebaseAuth());
  } catch (error) {
    if (error instanceof FirebaseError) {
      throw new AnonymousSignInError(
        `Anonymous sign-in failed (${error.code}): ${error.message}`,
        { cause: error, code: error.code },
      );
    }

    throw new AnonymousSignInError("Anonymous sign-in failed.", {
      cause: error,
    });
  }
}

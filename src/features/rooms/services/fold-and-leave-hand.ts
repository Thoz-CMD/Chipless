import { getFirebaseAuth } from "@/lib/firebase/client";

export class FoldAndLeaveHandError extends Error {
  readonly code?: string;

  constructor(message: string, options?: ErrorOptions & { code?: string }) {
    super(message, options);
    this.name = "FoldAndLeaveHandError";
    this.code = options?.code;
  }
}

export async function foldAndLeaveHand({
  roomId,
}: {
  roomId: string;
}): Promise<{ pendingLeave: boolean }> {
  const currentUser = getFirebaseAuth().currentUser;

  if (!currentUser) {
    throw new FoldAndLeaveHandError("Please sign in first.", {
      code: "unauthenticated",
    });
  }

  const uid = currentUser.uid;
  let idToken: string;

  try {
    idToken = await currentUser.getIdToken();
  } catch {
    throw new FoldAndLeaveHandError("Unable to get auth token.", {
      code: "unauthenticated",
    });
  }

  const response = await fetch("/api/fold-and-leave-hand", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId, uid, idToken }),
  });

  if (!response.ok) {
    const data: unknown = await response.json().catch(() => null);
    const message =
      data && typeof data === "object" && "error" in data
        ? String((data as Record<string, unknown>).error)
        : "Unable to fold and leave hand.";

    throw new FoldAndLeaveHandError(message, {
      code: `http-${response.status}`,
    });
  }

  return { pendingLeave: true };
}

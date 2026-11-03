import { getFirebaseAuth } from "@/lib/firebase/client";

export async function loadDealerCards(
  roomId: string,
  handNumber: number,
): Promise<readonly string[] | null> {
  const user = getFirebaseAuth().currentUser;

  if (!user) {
    return null;
  }

  const params = new URLSearchParams({
    roomId,
    handNumber: String(handNumber),
    uid: user.uid,
    idToken: await user.getIdToken(),
  });
  const response = await fetch(`/api/dealer/my-cards?${params.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const value: unknown = await response.json().catch(() => null);
  if (!value || typeof value !== "object") {
    return null;
  }

  const cards = (value as Record<string, unknown>).cards;
  return Array.isArray(cards) && cards.every((card) => typeof card === "string")
    ? cards
    : null;
}

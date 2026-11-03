import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getDatabaseUrl(): string | null {
  return (
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ??
    process.env.FIREBASE_DATABASE_URL ??
    null
  );
}

function buildDatabaseUrl(
  databaseUrl: string,
  path: string,
  idToken: string,
): string {
  return `${databaseUrl.replace(/\/$/, "")}/${path}.json?auth=${encodeURIComponent(
    idToken,
  )}`;
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const roomId = searchParams.get("roomId");
  const handNumber = searchParams.get("handNumber");
  const uid = searchParams.get("uid");
  const idToken = searchParams.get("idToken");
  const databaseUrl = getDatabaseUrl();

  if (
    !databaseUrl ||
    !roomId ||
    !handNumber ||
    !uid ||
    !idToken ||
    !/^\d+$/.test(handNumber)
  ) {
    return NextResponse.json(
      {
        error: databaseUrl
          ? "Room ID, hand number, UID, and ID token are required."
          : "Firebase database URL is not configured.",
      },
      { status: databaseUrl ? 400 : 500 },
    );
  }

  try {
    const response = await fetch(
      buildDatabaseUrl(
        databaseUrl,
        `dealerHands/${encodeURIComponent(roomId)}/${handNumber}/${encodeURIComponent(uid)}/cards`,
        idToken,
      ),
      { cache: "no-store" },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Unable to load private cards." },
        { status: response.status },
      );
    }

    const cards: unknown = await response.json();

    if (
      !Array.isArray(cards) ||
      !cards.every((card) => typeof card === "string")
    ) {
      return NextResponse.json(
        { error: "Private cards are not available." },
        { status: 404 },
      );
    }

    return NextResponse.json({ cards });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load private cards.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

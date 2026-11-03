import { NextResponse } from "next/server";

import {
  createDealerDeckToken,
  dealHoleCards,
} from "@/features/game/services/dealer-deck";

export const runtime = "nodejs";

type DealHandPayload = {
  roomId: string;
  uid: string;
  idToken: string;
};

function isDealHandPayload(value: unknown): value is DealHandPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Record<string, unknown>;

  return (
    typeof payload.roomId === "string" &&
    payload.roomId.trim().length > 0 &&
    typeof payload.uid === "string" &&
    payload.uid.trim().length > 0 &&
    typeof payload.idToken === "string" &&
    payload.idToken.trim().length > 0
  );
}

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

export async function POST(request: Request) {
  const databaseUrl = getDatabaseUrl();
  const payload: unknown = await request.json().catch(() => null);

  if (!databaseUrl) {
    return NextResponse.json(
      { error: "Firebase database URL is not configured." },
      { status: 500 },
    );
  }

  if (!isDealHandPayload(payload)) {
    return NextResponse.json(
      { error: "Room ID, authenticated UID, and ID token are required." },
      { status: 400 },
    );
  }

  try {
    const roomPath = `rooms/${encodeURIComponent(payload.roomId)}`;
    const [roomResponse, playersResponse] = await Promise.all([
      fetch(buildDatabaseUrl(databaseUrl, roomPath, payload.idToken), {
        cache: "no-store",
      }),
      fetch(
        buildDatabaseUrl(
          databaseUrl,
          `roomPlayers/${encodeURIComponent(payload.roomId)}`,
          payload.idToken,
        ),
        { cache: "no-store" },
      ),
    ]);

    if (!roomResponse.ok || !playersResponse.ok) {
      return NextResponse.json(
        { error: "Unable to read room state." },
        { status: roomResponse.status || playersResponse.status },
      );
    }

    const roomValue: unknown = await roomResponse.json();
    const playersValue: unknown = await playersResponse.json();

    if (!roomValue || typeof roomValue !== "object") {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }

    const room = roomValue as Record<string, unknown>;
    const settings =
      room.settings && typeof room.settings === "object"
        ? (room.settings as Record<string, unknown>)
        : null;

    if (room.hostUid !== payload.uid) {
      return NextResponse.json(
        { error: "Only the room host can deal the opening hand." },
        { status: 403 },
      );
    }

    if (settings?.roomMode !== "dealer") {
      return NextResponse.json(
        { error: "This room is not using Web Dealer mode." },
        { status: 409 },
      );
    }

    const players =
      playersValue && typeof playersValue === "object"
        ? Object.values(playersValue as Record<string, unknown>)
        : [];
    const playerUids = players
      .filter(
        (player): player is Record<string, unknown> =>
          Boolean(player) && typeof player === "object",
      )
      .map((player) => player.uid)
      .filter(
        (uid): uid is string => typeof uid === "string" && uid.length > 0,
      );

    if (playerUids.length < 2 || playerUids.length > 9) {
      return NextResponse.json(
        { error: "Web Dealer requires 2-9 players." },
        { status: 400 },
      );
    }

    const deal = dealHoleCards(playerUids);
    const deckToken = createDealerDeckToken(deal.remainingDeck);

    return NextResponse.json({
      playerCards: deal.playerCards,
      deckToken,
      remainingCardCount: deal.remainingDeck.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to deal cards.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

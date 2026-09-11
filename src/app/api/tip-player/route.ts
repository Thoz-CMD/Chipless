import { NextResponse } from "next/server";

type TipPlayerPayload = {
  roomId: string;
  fromUid: string;
  toUid: string;
  amount: number;
  idToken: string;
};

function isTipPlayerPayload(value: unknown): value is TipPlayerPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Record<string, unknown>;

  return (
    typeof payload.roomId === "string" &&
    payload.roomId.length > 0 &&
    typeof payload.fromUid === "string" &&
    payload.fromUid.length > 0 &&
    typeof payload.toUid === "string" &&
    payload.toUid.length > 0 &&
    typeof payload.amount === "number" &&
    payload.amount > 0 &&
    typeof payload.idToken === "string" &&
    payload.idToken.length > 0
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

  if (!databaseUrl) {
    return NextResponse.json(
      { error: "Firebase database URL is not configured." },
      { status: 500 },
    );
  }

  const payload: unknown = await request.json().catch(() => null);

  if (!isTipPlayerPayload(payload)) {
    return NextResponse.json(
      { error: "Invalid tip player payload." },
      { status: 400 },
    );
  }

  const { roomId, fromUid, toUid, amount, idToken } = payload;

  try {
    // Get current game state to get player names
    const gameStateUrl = buildDatabaseUrl(
      databaseUrl,
      `rooms/${roomId}/gameState`,
      idToken,
    );
    const gameStateResponse = await fetch(gameStateUrl, { cache: "no-store" });

    if (!gameStateResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch game state." },
        { status: gameStateResponse.status },
      );
    }

    const gameState: unknown = await gameStateResponse.json();

    if (!gameState || typeof gameState !== "object") {
      return NextResponse.json(
        { error: "Invalid game state." },
        { status: 400 },
      );
    }

    const state = gameState as Record<string, unknown>;
    const settlements = state.settlements as Record<string, unknown> | undefined || {};
    const handNumber = typeof state.handNumber === "number" ? state.handNumber : 0;

    // Get player names
    const playersUrl = buildDatabaseUrl(
      databaseUrl,
      `roomPlayers/${roomId}`,
      idToken,
    );
    const playersResponse = await fetch(playersUrl, { cache: "no-store" });

    if (!playersResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch players." },
        { status: playersResponse.status },
      );
    }

    const playersData: unknown = await playersResponse.json();
    
    if (!playersData || typeof playersData !== "object") {
      return NextResponse.json(
        { error: "Invalid players data." },
        { status: 400 },
      );
    }

    const players = playersData as Record<string, Record<string, unknown>>;
    const fromPlayer = players[fromUid];
    const toPlayer = players[toUid];

    const fromName = typeof fromPlayer?.displayName === "string" ? fromPlayer.displayName : "Player";
    const toName = typeof toPlayer?.displayName === "string" ? toPlayer.displayName : "Player";

    console.log("[tip-player] Creating tip settlement:", {
      fromUid,
      fromName,
      toUid,
      toName,
      amount,
      handNumber,
    });

    // Create a special settlement entry for the tip
    // Use string key for tip settlements (e.g., "tip_1", "tip_2", "tip_3")
    const existingTipKeys = Object.keys(settlements).filter(k => k.startsWith("tip_"));
    const nextTipNumber = existingTipKeys.length + 1;
    const tipKey = `tip_${nextTipNumber}`;
    
    // Use negative handNumber for sorting (so tips appear at the end)
    const tipHandNumber = -(Object.keys(settlements).length + 1);
    
    console.log("[tip-player] Tip settlement key:", {
      settlementsCount: Object.keys(settlements).length,
      tipKey,
      tipHandNumber,
    });
    
    const tipSettlement = {
      handNumber: tipHandNumber,
      pot: amount,
      winnerUid: toUid,
      winnerName: toName,
      playerResults: {
        [fromUid]: {
          uid: fromUid,
          displayName: fromName,
          contribution: amount,
          net: -amount,
        },
        [toUid]: {
          uid: toUid,
          displayName: toName,
          contribution: 0,
          net: amount,
        },
      },
      isTip: true,
      timestamp: Date.now(),
    };

    console.log("[tip-player] Tip settlement object:", tipSettlement);

    // Add the tip settlement using string key
    const settlementUrl = buildDatabaseUrl(
      databaseUrl,
      `rooms/${roomId}/gameState/settlements/${tipKey}`,
      idToken,
    );

    const settlementResponse = await fetch(settlementUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tipSettlement),
    });

    console.log("[tip-player] Settlement response:", {
      ok: settlementResponse.ok,
      status: settlementResponse.status,
    });

    if (!settlementResponse.ok) {
      const errorText = await settlementResponse.text();
      console.error("[tip-player] Settlement failed:", errorText);
      return NextResponse.json(
        { error: "Failed to create tip settlement." },
        { status: settlementResponse.status },
      );
    }

    // Send tip notification
    const tipNotificationUrl = buildDatabaseUrl(
      databaseUrl,
      `roomTipNotifications/${roomId}`,
      idToken,
    );

    const notificationData = {
      fromUid,
      fromName,
      toUid,
      amount,
      timestamp: Date.now(),
    };

    // Don't wait for notification - fire and forget
    fetch(tipNotificationUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(notificationData),
    }).catch(err => console.error("[tip-player] Failed to send notification:", err));

    return NextResponse.json({ 
      ok: true,
      tipAmount: amount,
      from: fromName,
      to: toName,
    });
  } catch (error) {
    console.error("[tip-player] Error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}

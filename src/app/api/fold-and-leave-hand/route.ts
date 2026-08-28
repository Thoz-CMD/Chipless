import { NextResponse } from "next/server";

import {
  foldPlayerOutOfTurn,
  isHoldemGameState,
} from "@/features/game/logic/texas-holdem";

type FoldAndLeaveHandPayload = {
  roomId: string;
  uid: string;
  idToken: string;
};

function isFoldAndLeaveHandPayload(
  value: unknown,
): value is FoldAndLeaveHandPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Record<string, unknown>;

  return (
    typeof payload.roomId === "string" &&
    payload.roomId.length > 0 &&
    typeof payload.uid === "string" &&
    payload.uid.length > 0 &&
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
  return `${databaseUrl.replace(/\/$/, "")}/${path}.json?auth=${encodeURIComponent(idToken)}`;
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

  if (!isFoldAndLeaveHandPayload(payload)) {
    return NextResponse.json(
      { error: "Invalid fold-and-leave payload." },
      { status: 400 },
    );
  }

  const { roomId, uid, idToken } = payload;

  // 1. Read the current hand state
  const handUrl = buildDatabaseUrl(
    databaseUrl,
    `rooms/${encodeURIComponent(roomId)}/gameState/hand`,
    idToken,
  );
  const handResponse = await fetch(handUrl, { cache: "no-store" });

  if (!handResponse.ok) {
    return NextResponse.json(
      { error: "Unable to read hand state." },
      { status: handResponse.status },
    );
  }

  const handValue: unknown = await handResponse.json();

  // If no active hand or already in summary, skip fold — just mark pendingLeave
  if (!isHoldemGameState(handValue) || handValue.bettingRound === "summary") {
    const pendingLeaveUrl = buildDatabaseUrl(
      databaseUrl,
      `roomPlayers/${encodeURIComponent(roomId)}/${encodeURIComponent(uid)}/pendingLeave`,
      idToken,
    );
    await fetch(pendingLeaveUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(true),
    });

    return NextResponse.json({ ok: true, pendingLeave: true, folded: false });
  }

  // 2. Apply fold out-of-turn logic
  const nextHandState = foldPlayerOutOfTurn(handValue, uid);

  // 3. Write the updated hand and pendingLeave flag in two separate calls
  //    (REST API PATCH on hand path, then PUT on pendingLeave)
  const [handWriteResponse, pendingLeaveResponse] = await Promise.all([
    fetch(handUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextHandState),
    }),
    fetch(
      buildDatabaseUrl(
        databaseUrl,
        `roomPlayers/${encodeURIComponent(roomId)}/${encodeURIComponent(uid)}/pendingLeave`,
        idToken,
      ),
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(true),
      },
    ),
  ]);

  if (!handWriteResponse.ok) {
    const errorText = await handWriteResponse.text().catch(() => "");
    return NextResponse.json(
      { error: `Unable to update hand state. ${errorText}` },
      { status: handWriteResponse.status },
    );
  }

  if (!pendingLeaveResponse.ok) {
    return NextResponse.json(
      { error: "Unable to set pending leave flag." },
      { status: pendingLeaveResponse.status },
    );
  }

  return NextResponse.json({ ok: true, pendingLeave: true, folded: true });
}

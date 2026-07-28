import { NextResponse } from "next/server";

type LeaveRoomPayload = {
  roomId: string;
  uid: string;
  idToken: string;
};

function isLeaveRoomPayload(value: unknown): value is LeaveRoomPayload {
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
  return `${databaseUrl.replace(/\/$/, "")}/${path}.json?auth=${encodeURIComponent(
    idToken,
  )}`;
}

async function deleteIfRoomEmpty({
  databaseUrl,
  roomId,
  idToken,
}: {
  databaseUrl: string;
  roomId: string;
  idToken: string;
}): Promise<void> {
  const playersUrl = buildDatabaseUrl(databaseUrl, `roomPlayers/${roomId}`, idToken);
  const playersResponse = await fetch(playersUrl, { cache: "no-store" });

  if (!playersResponse.ok) {
    return;
  }

  const players: unknown = await playersResponse.json();

  if (players !== null) {
    return;
  }

  await Promise.all([
    fetch(buildDatabaseUrl(databaseUrl, `rooms/${roomId}`, idToken), {
      method: "DELETE",
    }),
    fetch(buildDatabaseUrl(databaseUrl, `roomSecrets/${roomId}`, idToken), {
      method: "DELETE",
    }),
  ]);
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

  if (!isLeaveRoomPayload(payload)) {
    return NextResponse.json({ error: "Invalid leave room payload." }, { status: 400 });
  }

  const roomId = encodeURIComponent(payload.roomId);
  const uid = encodeURIComponent(payload.uid);
  const playerUrl = buildDatabaseUrl(
    databaseUrl,
    `roomPlayers/${roomId}/${uid}`,
    payload.idToken,
  );
  const deleteResponse = await fetch(playerUrl, { method: "DELETE" });

  if (!deleteResponse.ok) {
    return NextResponse.json(
      { error: "Unable to remove player from room." },
      { status: deleteResponse.status },
    );
  }

  await deleteIfRoomEmpty({
    databaseUrl,
    roomId,
    idToken: payload.idToken,
  });

  return NextResponse.json({ ok: true });
}

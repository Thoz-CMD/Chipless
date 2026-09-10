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
  const playersUrl = buildDatabaseUrl(
    databaseUrl,
    `roomPlayers/${roomId}`,
    idToken,
  );
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

async function preservePlayerHistory({
  databaseUrl,
  roomId,
  uid,
  idToken,
}: {
  databaseUrl: string;
  roomId: string;
  uid: string;
  idToken: string;
}): Promise<void> {
  const playerUrl = buildDatabaseUrl(
    databaseUrl,
    `roomPlayers/${roomId}/${uid}`,
    idToken,
  );
  const playerResponse = await fetch(playerUrl, { cache: "no-store" });

  if (!playerResponse.ok) {
    return;
  }

  const playerData: unknown = await playerResponse.json();

  if (!playerData || typeof playerData !== 'object') {
    return;
  }

  const player = playerData as Record<string, unknown>;
  const seatIndex = player.seatIndex;
  const displayName = player.displayName;
  const photoUrl = player.photoUrl;
  const joinedAt = player.joinedAt;

  // Save player's seat position to their own roomPlayerHistory
  // This is safe because the idToken authenticates as the current user (uid)
  // and we're only writing to roomPlayerHistory/${roomId}/${uid}
  if (typeof seatIndex === 'number' || typeof displayName === 'string') {
    const historyData: Record<string, unknown> = {};
    
    if (typeof seatIndex === 'number') {
      historyData.seatIndex = seatIndex;
    }
    
    if (typeof displayName === 'string') {
      historyData.displayName = displayName;
    }
    
    if (typeof photoUrl === 'string') {
      historyData.photoUrl = photoUrl;
    }
    
    if (typeof joinedAt === 'number' || typeof joinedAt === 'string') {
      historyData.joinedAt = joinedAt;
    }

    console.log('[leave-room] Saving player history:', {
      roomId,
      uid,
      historyData,
    });

    const historyUrl = buildDatabaseUrl(
      databaseUrl,
      `roomPlayerHistory/${roomId}/${uid}`,
      idToken,
    );

    try {
      const response = await fetch(historyUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(historyData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[leave-room] Failed to save player history:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
      } else {
        console.log('[leave-room] Player history saved successfully');
      }
    } catch (error) {
      console.error('[leave-room] Exception while saving player history:', error);
      // Don't throw - this is not critical for leaving the room
    }
  } else {
    console.log('[leave-room] No seat index or display name to save:', {
      seatIndex,
      displayName,
    });
  }
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
    return NextResponse.json(
      { error: "Invalid leave room payload." },
      { status: 400 },
    );
  }

  const roomId = encodeURIComponent(payload.roomId);
  const uid = encodeURIComponent(payload.uid);

  // Preserve player history before deleting
  await preservePlayerHistory({
    databaseUrl,
    roomId: payload.roomId,
    uid: payload.uid,
    idToken: payload.idToken,
  });

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

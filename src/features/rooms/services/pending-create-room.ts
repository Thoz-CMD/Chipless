import {
  createRoomSchema,
  type CreateRoomFormValues,
} from "@/lib/validations/create-room";

const pendingCreateRoomKey = "chipless.pendingCreateRoom";

function getSessionStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage;
}

export function savePendingCreateRoom(values: CreateRoomFormValues): void {
  getSessionStorage()?.setItem(pendingCreateRoomKey, JSON.stringify(values));
}

export function loadPendingCreateRoom(): CreateRoomFormValues | null {
  const rawValue = getSessionStorage()?.getItem(pendingCreateRoomKey);

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue);
    const result = createRoomSchema.safeParse(parsedValue);

    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function clearPendingCreateRoom(): void {
  getSessionStorage()?.removeItem(pendingCreateRoomKey);
}

const lastPlayerNameKey = "chipless.lastPlayerName";
const lastPlayerPhotoKey = "chipless.lastPlayerPhoto";

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function saveLastPlayerName(name: string): void {
  const trimmed = name.trim();

  if (trimmed.length > 0) {
    getLocalStorage()?.setItem(lastPlayerNameKey, trimmed);
  }
}

export function loadLastPlayerName(): string {
  const value = getLocalStorage()?.getItem(lastPlayerNameKey);

  return typeof value === "string" ? value.trim() : "";
}

export function saveLastPlayerPhoto(photoUrl?: string): void {
  if (photoUrl) {
    getLocalStorage()?.setItem(lastPlayerPhotoKey, photoUrl);
  } else {
    getLocalStorage()?.removeItem(lastPlayerPhotoKey);
  }
}

export function loadLastPlayerPhoto(): string {
  const value = getLocalStorage()?.getItem(lastPlayerPhotoKey);

  return typeof value === "string" ? value : "";
}

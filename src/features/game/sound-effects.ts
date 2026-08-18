"use client";

const soundSources = {
  chip: "/sounds/chip.mp3",
  card: "/sounds/card.mp3",
  turn: "/sounds/turn.mp3",
  winner: "/sounds/winner.mp3",
  check: "/sounds/check.mp3",
  fold: "/sounds/fold.mp3",
} as const;

const soundVolumes = {
  chip: 0.4,
  card: 0.5,
  turn: 0.5,
  winner: 0.5,
  check: 0.5,
  fold: 0.5,
} as const;

type SoundName = keyof typeof soundSources;

const soundCooldownMs = 250;
const audioCache = new Map<SoundName, HTMLAudioElement>();
let lastSoundStartedAt = 0;

function getAudio(soundName: SoundName): HTMLAudioElement | null {
  if (typeof window === "undefined") {
    return null;
  }

  const cachedAudio = audioCache.get(soundName);

  if (cachedAudio) {
    return cachedAudio;
  }

  const audio = new Audio(soundSources[soundName]);
  audio.preload = "auto";
  audio.volume = soundVolumes[soundName];
  audioCache.set(soundName, audio);

  return audio;
}

function playSound(
  soundName: SoundName,
  { ignoreCooldown = false }: { ignoreCooldown?: boolean } = {},
) {
  const audio = getAudio(soundName);

  if (!audio) {
    return;
  }

  const now = Date.now();

  if (!ignoreCooldown && now - lastSoundStartedAt < soundCooldownMs) {
    return;
  }

  for (const cachedAudio of audioCache.values()) {
    cachedAudio.pause();
    cachedAudio.currentTime = 0;
  }

  lastSoundStartedAt = now;
  audio.pause();
  audio.currentTime = 0;
  audio.volume = soundVolumes[soundName];
  void audio.play().catch(() => {
    // Browsers can block audio until the user interacts with the page.
  });
}

export function playChipSound() {
  playSound("chip");
}

export function playCardSound() {
  playSound("card");
}

export function playTurnAlertSound() {
  playSound("turn");
}

export function playWinnerSound() {
  playSound("winner", { ignoreCooldown: true });
}

export function playCheckSound() {
  playSound("check");
}

export function playFoldSound() {
  playSound("fold");
}

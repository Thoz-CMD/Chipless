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
const soundBufferCache = new Map<SoundName, AudioBuffer>();
const loadingBufferCache = new Map<SoundName, Promise<AudioBuffer | null>>();
const activeSources = new Set<AudioBufferSourceNode>();
let lastSoundStartedAt = 0;
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (audioContext) {
    return audioContext;
  }

  const AudioContextConstructor =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextConstructor) {
    return null;
  }

  audioContext = new AudioContextConstructor();
  return audioContext;
}

function stopActiveSources() {
  for (const source of activeSources) {
    try {
      source.stop();
    } catch {
      // Ignore already-stopped sources.
    }
  }

  activeSources.clear();
}

async function loadSoundBuffer(soundName: SoundName): Promise<AudioBuffer | null> {
  const cachedBuffer = soundBufferCache.get(soundName);

  if (cachedBuffer) {
    return cachedBuffer;
  }

  const cachedLoadingPromise = loadingBufferCache.get(soundName);

  if (cachedLoadingPromise) {
    return cachedLoadingPromise;
  }

  const loadingPromise = (async () => {
    const context = getAudioContext();

    if (!context) {
      return null;
    }

    const response = await fetch(soundSources[soundName]);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = await context.decodeAudioData(arrayBuffer);

    soundBufferCache.set(soundName, buffer);
    return buffer;
  })();

  loadingBufferCache.set(soundName, loadingPromise);

  try {
    return await loadingPromise;
  } finally {
    loadingBufferCache.delete(soundName);
  }
}

export function primeGameSounds() {
  const context = getAudioContext();

  if (!context) {
    return;
  }

  void context.resume().catch(() => {
    // Browsers can require a user gesture before audio starts.
  });
}

async function playSound(
  soundName: SoundName,
  { ignoreCooldown = false }: { ignoreCooldown?: boolean } = {},
) {
  const context = getAudioContext();

  if (!context) {
    return;
  }

  const now = Date.now();

  if (!ignoreCooldown && now - lastSoundStartedAt < soundCooldownMs) {
    return;
  }

  const buffer = await loadSoundBuffer(soundName);

  if (!buffer) {
    return;
  }

  if (context.state === "suspended") {
    try {
      await context.resume();
    } catch {
      return;
    }
  }

  stopActiveSources();

  const source = context.createBufferSource();
  const gain = context.createGain();

  gain.gain.value = soundVolumes[soundName];
  source.buffer = buffer;
  source.connect(gain);
  gain.connect(context.destination);

  activeSources.add(source);
  lastSoundStartedAt = now;

  source.onended = () => {
    activeSources.delete(source);
  };

  source.start(0);
}

export function playChipSound() {
  void playSound("chip");
}

export function playCardSound() {
  void playSound("card");
}

export function playTurnAlertSound() {
  void playSound("turn");
}

export function playWinnerSound() {
  void playSound("winner", { ignoreCooldown: true });
}

export function playCheckSound() {
  void playSound("check");
}

export function playFoldSound() {
  void playSound("fold");
}

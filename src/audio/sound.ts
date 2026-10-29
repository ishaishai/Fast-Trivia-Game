import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useSettings } from '@/stores/settings';

const SOURCES = {
  tap: require('../../assets/sounds/tap.wav'),
  tick: require('../../assets/sounds/tick.wav'),
  correct: require('../../assets/sounds/correct.wav'),
  wrong: require('../../assets/sounds/wrong.wav'),
  silent: require('../../assets/sounds/silent.wav'),
  skip: require('../../assets/sounds/skip.wav'),
  open: require('../../assets/sounds/open.wav'),
  sunrise: require('../../assets/sounds/sunrise.wav'),
  sunset: require('../../assets/sounds/sunset.wav'),
  crown: require('../../assets/sounds/crown.wav'),
} as const;

export type SoundName = keyof typeof SOURCES;

const VOLUME: Partial<Record<SoundName, number>> = { tap: 0.35, tick: 0.4, skip: 0.55, sunrise: 0.6, sunset: 0.6 };

const players = new Map<SoundName, AudioPlayer>();
let configured = false;

function player(name: SoundName): AudioPlayer | null {
  try {
    if (!configured) {
      configured = true;
      void setAudioModeAsync({ playsInSilentMode: false }).catch(() => {});
    }
    let p = players.get(name);
    if (!p) {
      p = createAudioPlayer(SOURCES[name]);
      p.volume = VOLUME[name] ?? 0.8;
      players.set(name, p);
    }
    return p;
  } catch {
    return null;
  }
}

/** Load the run's sounds ahead of time so the first answer isn't late. */
export function preloadSounds(): void {
  (['correct', 'wrong', 'silent', 'skip', 'tick', 'sunrise', 'sunset'] as SoundName[]).forEach(player);
}

export function play(name: SoundName): void {
  if (!useSettings.getState().sound) return;
  const p = player(name);
  if (!p) return;
  try {
    void p.seekTo(0);
    p.play();
  } catch {
    // Sound is decoration. A failure is never an error the player should see.
  }
}

// Генератор звуков через Web Audio API (без внешних файлов)
// Все звуки синтезируются на лету, работают даже offline

type SoundType =
  | 'click'
  | 'success'
  | 'error'
  | 'capture'
  | 'build'
  | 'coins'
  | 'fanfare'
  | 'dice';

// Глобальная громкость (0.0 - 1.0). Сохраняется в localStorage.
const VOLUME_KEY = 'eco-empire-sound-enabled';

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtx = new Ctor();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

export function isSoundEnabled(): boolean {
  if (typeof localStorage === 'undefined') return true;
  const v = localStorage.getItem(VOLUME_KEY);
  return v !== 'off';
}

export function toggleSound(): boolean {
  const nowEnabled = !isSoundEnabled();
  localStorage.setItem(VOLUME_KEY, nowEnabled ? 'on' : 'off');
  return nowEnabled;
}

// Разблокировка AudioContext после первого клика (требование браузеров)
export function unlockAudio(): void {
  const ctx = getCtx();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

// === Индивидуальные звуки ===

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.15,
  delay: number = 0,
  freqEnd?: number
) {
  const ctx = getCtx();
  if (!ctx || !isSoundEnabled()) return;

  const now = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (freqEnd !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), now + duration);
  }

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration + 0.05);
}

function playNoise(duration: number, volume: number = 0.1, delay: number = 0) {
  const ctx = getCtx();
  if (!ctx || !isSoundEnabled()) return;

  const now = ctx.currentTime + delay;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 1000;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start(now);
  noise.stop(now + duration + 0.05);
}

export function playClick(): void {
  playTone(800, 0.05, 'square', 0.08);
}

export function playSuccess(): void {
  playTone(523, 0.1, 'sine', 0.12, 0);
  playTone(659, 0.1, 'sine', 0.12, 0.08);
  playTone(784, 0.15, 'sine', 0.12, 0.16);
}

export function playError(): void {
  playTone(220, 0.15, 'sawtooth', 0.1, 0);
  playTone(165, 0.2, 'sawtooth', 0.1, 0.12);
}

export function playCapture(): void {
  // Барабан + восходящий тон
  playNoise(0.08, 0.15, 0);
  playTone(200, 0.2, 'sine', 0.12, 0.05, 600);
}

export function playBuild(): void {
  // Три коротких "стукa"
  playNoise(0.04, 0.12, 0);
  playNoise(0.04, 0.12, 0.12);
  playNoise(0.04, 0.12, 0.24);
  playTone(600, 0.15, 'triangle', 0.1, 0.35, 800);
}

export function playCoins(): void {
  // Звон монет — несколько высоких нот
  playTone(1200, 0.06, 'triangle', 0.08, 0);
  playTone(1400, 0.06, 'triangle', 0.08, 0.08);
  playTone(1600, 0.06, 'triangle', 0.08, 0.16);
  playTone(1800, 0.08, 'triangle', 0.08, 0.24);
}

export function playFanfare(): void {
  // Короткая фанфара (4 ноты мажорного аккорда)
  playTone(523, 0.15, 'square', 0.12, 0);      // C
  playTone(659, 0.15, 'square', 0.12, 0.15);   // E
  playTone(784, 0.15, 'square', 0.12, 0.30);   // G
  playTone(1047, 0.3, 'square', 0.14, 0.45);   // C (октава)
}

export function playDice(): void {
  // Тряска кубика: серия быстрых щелчков + результат
  for (let i = 0; i < 6; i++) {
    playNoise(0.03, 0.08, i * 0.05);
    playTone(400 + Math.random() * 200, 0.03, 'square', 0.05, i * 0.05);
  }
  playTone(800, 0.1, 'triangle', 0.1, 0.35);
}

// Универсальная функция
export function playSound(type: SoundType): void {
  switch (type) {
    case 'click': playClick(); break;
    case 'success': playSuccess(); break;
    case 'error': playError(); break;
    case 'capture': playCapture(); break;
    case 'build': playBuild(); break;
    case 'coins': playCoins(); break;
    case 'fanfare': playFanfare(); break;
    case 'dice': playDice(); break;
  }
}

// Разблокировать аудио при первом взаимодействии
if (typeof window !== 'undefined') {
  const unlock = () => {
    unlockAudio();
    window.removeEventListener('click', unlock);
    window.removeEventListener('touchstart', unlock);
  };
  window.addEventListener('click', unlock);
  window.addEventListener('touchstart', unlock);
}

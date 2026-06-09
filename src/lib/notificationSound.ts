'use client';

/**
 * Plays a soft two-note chime using the Web Audio API.
 * No audio file needed — works in all modern browsers.
 * Only plays after user interaction (browser autoplay policy).
 */
export function playNotificationChime(): void {
  if (typeof window === 'undefined') return;

  try {
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playNote = (freq: number, start: number, duration: number, vol = 0.18) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + start);
      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(vol, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);
      osc.start(now + start);
      osc.stop(now + start + duration);
    };

    // A5 → C#6 ascending chime
    playNote(880, 0, 0.35);
    playNote(1108, 0.18, 0.45);

    // Auto-close context to free resources
    setTimeout(() => ctx.close().catch(() => {}), 1000);
  } catch {
    // Browser may block audio — silently ignore
  }
}

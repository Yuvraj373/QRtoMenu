// New-order chime made with Web Audio, so there is no sound file to load.
// Browsers only allow audio after the user has clicked something on the page.
let ctx;

const context = () => {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
};

export const unlockSound = () => context();
export const soundReady = () => ctx?.state === 'running';

export function playChime() {
  const ac = context();
  if (!ac) return;
  const t = ac.currentTime;
  [880, 1175, 1568, 1175, 1568].forEach((freq, i) => {
    const start = t + i * 0.14;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.35, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.45);
    osc.connect(gain).connect(ac.destination);
    osc.start(start);
    osc.stop(start + 0.5);
  });
}

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

// Phone-style "trrring trrring" for the customer when their order is ready
export function playRing() {
  const ac = context();
  if (!ac) return;
  const t = ac.currentTime;
  for (let burst = 0; burst < 2; burst++) {
    for (let i = 0; i < 10; i++) {
      const start = t + burst * 0.9 + i * 0.06;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'square';
      osc.frequency.value = i % 2 ? 1400 : 1750;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.055);
      osc.connect(gain).connect(ac.destination);
      osc.start(start);
      osc.stop(start + 0.06);
    }
  }
}

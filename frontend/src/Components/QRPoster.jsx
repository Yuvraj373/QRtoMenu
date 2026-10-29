import { useEffect, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { DownloadIcon } from './Icons';

// Poster size: 4:5.5 portrait, ~A6 at 300dpi — sharp when printed as a table card
const W = 1200;
const H = 1650;
const FONT = "'Plus Jakarta Sans', system-ui, sans-serif";
const INK = '#1c1917';

const TEMPLATES = [
  { id: 'classic', label: 'Classic' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'dark', label: 'Dark' },
];

// White text on light theme colours (yellow, etc.) is unreadable — pick ink instead
function readableOn(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? INK : '#ffffff';
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

// Draws text centred at y, shrinking the font until it fits maxWidth
function fitText(ctx, text, y, { size, weight = 800, color, maxWidth = W - 160, spacing = 0, min = 28 }) {
  if (!text) return;
  let s = size;
  ctx.letterSpacing = `${spacing}px`;
  do {
    ctx.font = `${weight} ${s}px ${FONT}`;
    s -= 2;
  } while (ctx.measureText(text).width > maxWidth && s > min);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, W / 2, y);
  ctx.letterSpacing = '0px';
}

function drawQR(ctx, qr, x, y, size, brand, initial) {
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, x - 36, y - 36, size + 72, size + 72, 40);
  ctx.fill();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qr, x, y, size, size);
  ctx.imageSmoothingEnabled = true;

  // Centre badge with the restaurant initial (level-H QR tolerates ~30% loss; this covers ~4%)
  const r = size * 0.1;
  const cx = x + size / 2;
  const cy = y + size / 2;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, r + 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = brand;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = readableOn(brand);
  ctx.font = `800 ${r * 1.15}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initial, cx, cy + r * 0.06);
}

function footerLine(s) {
  return [s.address, s.phone].filter(Boolean).join('   •   ');
}

function pill(ctx, text, y, bg, fg) {
  ctx.font = `800 40px ${FONT}`;
  ctx.letterSpacing = '6px';
  const w = ctx.measureText(text).width + 110;
  ctx.fillStyle = bg;
  roundRect(ctx, (W - w) / 2, y - 52, w, 84, 42);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, W / 2 + 3, y - 10);
  ctx.letterSpacing = '0px';
}

function drawPoster(canvas, qr, s, template) {
  const ctx = canvas.getContext('2d');
  const brand = /^#[0-9a-f]{6}$/i.test(s.themeColor) ? s.themeColor : '#ef4444';
  const onBrand = readableOn(brand);
  const name = s.restaurantName || 'Our Menu';
  const meta = [s.since, s.tagline].filter(Boolean).join('  •  ').toUpperCase();
  const initial = name.trim()[0]?.toUpperCase() || 'M';
  const qrSize = 640;
  const qx = (W - qrSize) / 2;

  ctx.clearRect(0, 0, W, H);

  if (template === 'classic') {
    ctx.fillStyle = brand;
    ctx.fillRect(0, 0, W, H);
    // soft decorative circles
    ctx.fillStyle = 'rgba(255,255,255,0.09)';
    ctx.beginPath(); ctx.arc(W - 60, 80, 300, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.beginPath(); ctx.arc(40, H - 60, 280, 0, Math.PI * 2); ctx.fill();

    fitText(ctx, meta, 150, { size: 34, weight: 700, color: onBrand === INK ? 'rgba(28,25,23,0.7)' : 'rgba(255,255,255,0.8)', spacing: 6 });
    fitText(ctx, name, 265, { size: 116, color: onBrand });

    ctx.fillStyle = '#ffffff';
    roundRect(ctx, 90, 340, W - 180, 1080, 56);
    ctx.fill();
    pill(ctx, 'SCAN FOR MENU', 470, brand, onBrand);
    drawQR(ctx, qr, qx, 560, qrSize, brand, initial);
    fitText(ctx, 'Open your phone camera and scan the code', 1335, { size: 34, weight: 600, color: '#78716c', maxWidth: W - 300 });

    fitText(ctx, footerLine(s), 1530, { size: 36, weight: 600, color: onBrand });
  }

  if (template === 'minimal') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = brand;
    ctx.lineWidth = 22;
    roundRect(ctx, 40, 40, W - 80, H - 80, 60);
    ctx.stroke();

    fitText(ctx, meta, 200, { size: 34, weight: 700, color: brand, spacing: 6 });
    fitText(ctx, name, 320, { size: 120, color: INK });
    ctx.fillStyle = brand;
    roundRect(ctx, W / 2 - 60, 375, 120, 10, 5);
    ctx.fill();

    ctx.strokeStyle = '#e7e5e4';
    ctx.lineWidth = 4;
    roundRect(ctx, qx - 40, 470, qrSize + 80, qrSize + 80, 44);
    ctx.stroke();
    drawQR(ctx, qr, qx, 510, qrSize, brand, initial);

    pill(ctx, 'SCAN FOR MENU', 1330, brand, onBrand);
    fitText(ctx, footerLine(s), 1480, { size: 34, weight: 600, color: '#57534e' });
  }

  if (template === 'dark') {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#292524');
    g.addColorStop(1, '#0c0a09');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = brand;
    ctx.globalAlpha = 0.35;
    ctx.beginPath(); ctx.arc(W / 2, 880, 520, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    fitText(ctx, meta, 170, { size: 34, weight: 700, color: brand === INK ? '#a8a29e' : brand, spacing: 6 });
    fitText(ctx, name, 290, { size: 120, color: '#ffffff' });
    fitText(ctx, 'Scan for Menu', 400, { size: 56, weight: 700, color: 'rgba(255,255,255,0.75)' });

    drawQR(ctx, qr, qx, 540, qrSize, brand, initial);

    fitText(ctx, 'Open your phone camera and scan the code', 1350, { size: 34, weight: 600, color: 'rgba(255,255,255,0.6)', maxWidth: W - 300 });
    ctx.fillStyle = brand;
    roundRect(ctx, W / 2 - 60, 1420, 120, 8, 4);
    ctx.fill();
    fitText(ctx, footerLine(s), 1530, { size: 34, weight: 600, color: '#d6d3d1' });
  }
}

const slug = (s) => (s || 'menu').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export default function QRPoster({ settings, url }) {
  const [template, setTemplate] = useState('classic');
  const qrRef = useRef(null);
  const posterRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    // Canvas text needs the web font loaded first, or it falls back to a system font
    Promise.all([document.fonts.load(`800 40px ${FONT}`), document.fonts.load(`600 40px ${FONT}`), document.fonts.load(`700 40px ${FONT}`)])
      .catch(() => {})
      .then(() => {
        if (!cancelled && qrRef.current && posterRef.current) drawPoster(posterRef.current, qrRef.current, settings, template);
      });
    return () => {
      cancelled = true;
    };
  }, [settings, template, url]);

  const fileName = `${slug(settings.restaurantName)}-menu-qr-${template}.png`;

  const download = () => {
    posterRef.current.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, 'image/png');
  };

  const downloadPlain = () => {
    const a = document.createElement('a');
    a.href = qrRef.current.toDataURL('image/png');
    a.download = `${slug(settings.restaurantName)}-qr-only.png`;
    a.click();
  };

  const print = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const img = posterRef.current.toDataURL('image/png');
    w.document.write(
      `<!doctype html><title>${fileName}</title><style>@page{size:A6 portrait;margin:0}html,body{margin:0;height:100%}body{display:grid;place-items:center}img{width:100%;height:100%;object-fit:contain}</style><img src="${img}" onload="setTimeout(()=>{print()},100)">`
    );
    w.document.close();
  };

  return (
    <div>
      {/* High-res source QR (hidden); quiet zone of 2 modules keeps scanning reliable */}
      <QRCodeCanvas ref={qrRef} value={url} size={1000} level="H" marginSize={2} fgColor="#000000" bgColor="#ffffff" className="hidden" />

      <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-100 rounded-xl">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTemplate(t.id)}
            className={`h-9 rounded-lg text-xs font-bold transition ${template === t.id ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500 hover:text-stone-800'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <canvas ref={posterRef} width={W} height={H} className="mt-4 w-full max-w-[300px] mx-auto block rounded-xl shadow-lg ring-1 ring-stone-200" />

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={download} className="col-span-2 inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-brand text-white font-bold text-sm hover:brightness-110 transition">
          <DownloadIcon className="w-4 h-4" /> Download poster
        </button>
        <button type="button" onClick={print} className="h-10 rounded-xl bg-stone-100 text-stone-700 font-bold text-xs hover:bg-stone-200 transition">
          🖨️ Print
        </button>
        <button type="button" onClick={downloadPlain} className="h-10 rounded-xl bg-stone-100 text-stone-700 font-bold text-xs hover:bg-stone-200 transition">
          QR only (PNG)
        </button>
      </div>
    </div>
  );
}

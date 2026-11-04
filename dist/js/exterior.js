// Cảnh quan ngoài trời quanh chánh điện + mô hình ngoại thất từng ngôi chùa.
// Hoàn toàn dựng bằng thủ tục: hình khối, shader, họa tiết vẽ canvas (không cần file ảnh).
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
import { buildStatue } from './statues.js';

const V3 = THREE.Vector3;
const PI = Math.PI, TAU = Math.PI * 2;
const C = (hex) => new THREE.Color(hex);
const PERLIN = new ImprovedNoise();
const nz = (x, y, z = 0) => PERLIN.noise(x, y, z); // ~[-1, 1]
function fbm(x, y, oct = 4, seed = 0) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += a * nz(x * f, y * f, seed + i * 7.31); f *= 2.03; a *= 0.5; }
  return s;
}
function mulberry(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const glf = (x) => (Number.isInteger(x) ? x.toFixed(1) : String(x));

/* =====================================================================
   HỌA TIẾT CANVAS (dùng chung, ghi nhớ)
   ===================================================================== */
const TEX = new Map();
function ctex(key, w, h, draw, { repeat = true, srgb = true } = {}) {
  if (TEX.has(key)) return TEX.get(key);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  t.userData.shared = true;
  TEX.set(key, t);
  return t;
}
const WHITE = new THREE.Color(1, 1, 1), BLACK = new THREE.Color(0, 0, 0);
function shade(hex, k) { const c = C(hex); if (k >= 0) c.lerp(WHITE, k); else c.lerp(BLACK, -k); return c.getStyle(); }
function rgba(hex, a) { const c = C(hex); return `rgba(${Math.round(c.r ** (1 / 2.2) * 255)},${Math.round(c.g ** (1 / 2.2) * 255)},${Math.round(c.b ** (1 / 2.2) * 255)},${a})`; }
const rr = Math.random;
function speckle(g, w, h, n, cols, r0, r1, a0 = 0.05, a1 = 0.18) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = rgba(cols[(rr() * cols.length) | 0], a0 + rr() * (a1 - a0));
    g.beginPath(); g.arc(rr() * w, rr() * h, r0 + rr() * (r1 - r0), 0, TAU); g.fill();
  }
}

const tileTex = (color) => ctex('tile' + color, 256, 256, (g, w, h) => {
  g.fillStyle = color; g.fillRect(0, 0, w, h);
  const cols = 8, rows = 8, cw = w / cols, rh = h / rows;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = c * cw, y = r * rh, cover = c % 2 === 0;
    const grd = g.createLinearGradient(x, 0, x + cw, 0);
    grd.addColorStop(0, shade(color, cover ? -0.55 : -0.3));
    grd.addColorStop(0.5, shade(color, cover ? 0.16 : -0.12));
    grd.addColorStop(1, shade(color, cover ? -0.55 : -0.3));
    g.fillStyle = grd; g.fillRect(x, y, cw, rh);
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(x, y + rh - 4, cw, 4);
    g.fillStyle = 'rgba(255,235,210,0.12)'; g.fillRect(x, y, cw, 2);
    g.fillStyle = rr() < 0.5 ? `rgba(0,0,0,${rr() * 0.16})` : `rgba(255,225,190,${rr() * 0.1})`; g.fillRect(x, y, cw, rh);
  }
  speckle(g, w, h, 160, ['#2a3a1a', '#1a1a10', '#5a5a3a'], 1, 5, 0.04, 0.18);
});

const plasterTex = (color) => ctex('plaster' + color, 256, 256, (g, w, h) => {
  g.fillStyle = color; g.fillRect(0, 0, w, h);
  speckle(g, w, h, 300, [shade(color, -0.25), shade(color, 0.2)], 4, 26, 0.03, 0.09);
  for (let i = 0; i < 22; i++) {
    const x = rr() * w, len = 20 + rr() * 90;
    const grd = g.createLinearGradient(0, 0, 0, len);
    grd.addColorStop(0, 'rgba(40,30,20,0.14)'); grd.addColorStop(1, 'rgba(40,30,20,0)');
    g.fillStyle = grd; g.fillRect(x, 0, 2 + rr() * 8, len);
  }
  speckle(g, w, h, 600, ['#000000', '#ffffff'], 0.5, 1.5, 0.05, 0.15);
});

const stoneTex = (color = '#a49c8e') => ctex('stone' + color, 256, 256, (g, w, h) => {
  g.fillStyle = shade(color, -0.35); g.fillRect(0, 0, w, h);
  const n = 4, s = w / n;
  for (let r = 0; r < n; r++) for (let c = -1; c < n; c++) {
    const off = (r % 2) * s * 0.5;
    g.fillStyle = shade(color, (rr() - 0.5) * 0.22);
    g.fillRect(c * s + off + 2, r * s + 2, s - 4, s - 4);
  }
  speckle(g, w, h, 900, ['#000000', '#ffffff', '#6a6040'], 0.5, 2.2, 0.04, 0.16);
  speckle(g, w, h, 40, ['#3a4a2a', '#2a2a20'], 4, 16, 0.04, 0.12);
});

const brickTex = (color) => ctex('brick' + color, 256, 256, (g, w, h) => {
  g.fillStyle = shade(color, -0.4); g.fillRect(0, 0, w, h);
  const rows = 16, cols = 4, bh = h / rows, bw = w / cols;
  for (let r = 0; r < rows; r++) for (let c = -1; c < cols; c++) {
    g.fillStyle = shade(color, (rr() - 0.5) * 0.3);
    g.fillRect(c * bw + (r % 2) * bw / 2 + 1.5, r * bh + 1.5, bw - 3, bh - 3);
  }
  speckle(g, w, h, 500, ['#000000', '#ffffff'], 0.5, 2, 0.04, 0.12);
});

const rockTex = () => ctex('rockx', 256, 256, (g, w, h) => {
  g.fillStyle = '#8c887e'; g.fillRect(0, 0, w, h);
  speckle(g, w, h, 260, ['#6a665c', '#a8a498', '#5a5a4a', '#7a7a60'], 3, 18, 0.1, 0.3);
  for (let i = 0; i < 60; i++) {
    const x = rr() * w; g.strokeStyle = `rgba(40,38,34,${0.08 + rr() * 0.2})`; g.lineWidth = 1 + rr() * 3;
    g.beginPath(); g.moveTo(x, rr() * h * 0.5); g.lineTo(x + (rr() - 0.5) * 12, h * (0.5 + rr() * 0.5)); g.stroke();
  }
  speckle(g, w, h, 900, ['#000000', '#ffffff'], 0.5, 1.6, 0.05, 0.16);
});

// họa tiết chi tiết sáng (nhân với màu đỉnh của địa hình)
const detailTex = (kind) => ctex('detail' + kind, 256, 256, (g, w, h) => {
  g.fillStyle = kind === 'rock' ? '#efeee8' : '#f0f2e8'; g.fillRect(0, 0, w, h);
  if (kind === 'rock') {
    speckle(g, w, h, 220, ['#c8c4b8', '#ffffff', '#b0ac9c'], 3, 16, 0.08, 0.22);
    for (let i = 0; i < 40; i++) { const x = rr() * w; g.strokeStyle = `rgba(120,114,100,${0.05 + rr() * 0.12})`; g.lineWidth = 1 + rr() * 3; g.beginPath(); g.moveTo(x, rr() * h * 0.4); g.lineTo(x + (rr() - 0.5) * 10, h * (0.4 + rr() * 0.6)); g.stroke(); }
  } else {
    speckle(g, w, h, 260, ['#c8d0b0', '#ffffff', '#d8d0a8'], 4, 18, 0.12, 0.3);
    for (let i = 0; i < 2600; i++) { g.strokeStyle = rr() < 0.5 ? 'rgba(150,160,120,0.45)' : 'rgba(255,255,240,0.4)'; const x = rr() * w, y = rr() * h; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rr() - 0.5) * 3, y - 3 - rr() * 5); g.stroke(); }
  }
  speckle(g, w, h, 800, ['#808070', '#ffffff'], 0.5, 1.5, 0.1, 0.25);
});
const barkTex = (color = '#5a4636') => ctex('bark' + color, 128, 256, (g, w, h) => {
  g.fillStyle = color; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) {
    const x = rr() * w; g.strokeStyle = rr() < 0.6 ? `rgba(0,0,0,${0.15 + rr() * 0.3})` : `rgba(255,240,220,${0.06 + rr() * 0.1})`;
    g.lineWidth = 1 + rr() * 3; g.beginPath(); g.moveTo(x, 0);
    for (let y = 0; y <= h; y += 16) g.lineTo(x + Math.sin(y * 0.05 + i) * 3, y);
    g.stroke();
  }
});
const bambooTex = () => ctex('bamboo', 64, 256, (g, w, h) => {
  const grd = g.createLinearGradient(0, 0, w, 0);
  grd.addColorStop(0, '#4e6a26'); grd.addColorStop(0.5, '#86a446'); grd.addColorStop(1, '#4e6a26');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 64) { g.fillStyle = 'rgba(40,50,10,0.75)'; g.fillRect(0, y, w, 3); g.fillStyle = 'rgba(230,240,180,0.35)'; g.fillRect(0, y + 3, w, 2); }
  speckle(g, w, h, 80, ['#3a4a1a', '#a0a060'], 0.5, 2, 0.1, 0.25);
});
const palmTrunkTex = () => ctex('palmtrunk', 64, 256, (g, w, h) => {
  g.fillStyle = '#7a6e5c'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 9) { g.fillStyle = `rgba(40,32,24,${0.3 + rr() * 0.3})`; g.fillRect(0, y, w, 2 + rr() * 2); }
  speckle(g, w, h, 120, ['#3a3020', '#b0a690'], 0.5, 3, 0.1, 0.3);
});

// cụm lá (alpha) — nhiều loại
function leafTex(kind) {
  return ctex('leaf' + kind, 256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const cfg = {
      broad: { hue: [88, 112], sat: [35, 55], lit: [18, 34], n: 260, len: [7, 13], wid: 0.45 },
      banyan: { hue: [90, 110], sat: [40, 60], lit: [14, 28], n: 300, len: [6, 11], wid: 0.55 },
      sao: { hue: [80, 100], sat: [35, 50], lit: [20, 34], n: 260, len: [6, 12], wid: 0.5 },
      pine: { hue: [95, 125], sat: [25, 40], lit: [13, 26], n: 900, len: [9, 18], wid: 0.16 },
      bamboo: { hue: [70, 92], sat: [40, 58], lit: [24, 40], n: 300, len: [16, 30], wid: 0.22 },
      flower: { hue: [90, 110], sat: [35, 50], lit: [20, 32], n: 220, len: [7, 12], wid: 0.5, petals: 120 },
      shrub: { hue: [85, 115], sat: [35, 55], lit: [16, 32], n: 300, len: [5, 9], wid: 0.5 },
    }[kind];
    const R = w * 0.47;
    for (let i = 0; i < cfg.n; i++) {
      const a = rr() * TAU, d = Math.sqrt(rr()) * R;
      const x = w / 2 + Math.cos(a) * d, y = h / 2 + Math.sin(a) * d;
      const L = cfg.len[0] + rr() * (cfg.len[1] - cfg.len[0]);
      const lit = cfg.lit[0] + rr() * (cfg.lit[1] - cfg.lit[0]) + (1 - d / R) * -4 + (y < h / 2 ? 5 : -3);
      g.fillStyle = `hsl(${cfg.hue[0] + rr() * (cfg.hue[1] - cfg.hue[0])},${cfg.sat[0] + rr() * (cfg.sat[1] - cfg.sat[0])}%,${lit}%)`;
      g.save(); g.translate(x, y);
      g.rotate(kind === 'bamboo' ? PI / 2 + (rr() - 0.5) * 1.6 : kind === 'pine' ? a + (rr() - 0.5) * 0.6 : rr() * TAU);
      g.beginPath(); g.ellipse(0, 0, L, Math.max(1, L * cfg.wid), 0, 0, TAU); g.fill();
      if (cfg.wid > 0.3) { g.strokeStyle = 'rgba(255,255,220,0.12)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-L, 0); g.lineTo(L, 0); g.stroke(); }
      g.restore();
    }
    if (cfg.petals) for (let i = 0; i < cfg.petals; i++) {
      const a = rr() * TAU, d = Math.sqrt(rr()) * R * 0.95;
      g.fillStyle = `hsl(${325 + rr() * 25},${70 + rr() * 20}%,${55 + rr() * 15}%)`;
      g.beginPath(); g.arc(w / 2 + Math.cos(a) * d, h / 2 + Math.sin(a) * d, 2.5 + rr() * 4, 0, TAU); g.fill();
    }
  }, { repeat: false });
}
const frondTex = () => ctex('frond', 128, 512, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  for (let y = 6; y < h; y += 5) {
    const t = y / h, len = w * 0.5 * Math.sin(PI * Math.min(1, t * 1.08)) ** 0.6;
    for (const s of [-1, 1]) {
      g.strokeStyle = `hsl(${78 + rr() * 22},${45 + rr() * 15}%,${22 + rr() * 14}%)`;
      g.lineWidth = 2.6; g.beginPath(); g.moveTo(w / 2, y); g.quadraticCurveTo(w / 2 + s * len * 0.6, y - 10, w / 2 + s * len, y - 26 * (1 - t) - 4); g.stroke();
    }
  }
  g.strokeStyle = '#8a8a4a'; g.lineWidth = 4; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
}, { repeat: false });
const lotusLeafTex = () => ctex('lotusleaf', 128, 128, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  const grd = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
  grd.addColorStop(0, '#9ab85a'); grd.addColorStop(0.25, '#5c8a34'); grd.addColorStop(0.9, '#3e6e2a'); grd.addColorStop(1, '#2e5220');
  g.fillStyle = grd; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 1, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(200,230,150,0.35)'; g.lineWidth = 1;
  for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU; g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(w / 2 + Math.cos(a) * w * 0.48, h / 2 + Math.sin(a) * h * 0.48); g.stroke(); }
  g.globalCompositeOperation = 'destination-out';
  g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(w, h / 2 - 5); g.lineTo(w, h / 2 + 5); g.fill();
  g.globalCompositeOperation = 'source-over';
}, { repeat: false });
const grassTex = (color = '#5c7a34') => ctex('grass' + color, 256, 256, (g, w, h) => {
  g.fillStyle = color; g.fillRect(0, 0, w, h);
  speckle(g, w, h, 300, [shade(color, -0.3), shade(color, 0.15), '#7a7a3a'], 4, 20, 0.05, 0.14);
  for (let i = 0; i < 2600; i++) {
    g.strokeStyle = rr() < 0.5 ? rgba(shade(color, -0.35), 0.4) : rgba(shade(color, 0.25), 0.35);
    const x = rr() * w, y = rr() * h; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rr() - 0.5) * 3, y - 3 - rr() * 5); g.stroke();
  }
});
const riceTex = () => ctex('rice', 512, 512, (g, w, h) => {
  g.fillStyle = '#6a7a4a'; g.fillRect(0, 0, w, h);
  const greens = ['#7aa040', '#8db04a', '#6a9a3a', '#a8b45a', '#5e8e3c', '#9cc060', '#7a9a8a'];
  let y = 0;
  while (y < h) {
    const rh = 30 + rr() * 60; let x = 0;
    while (x < w) {
      const rw = 40 + rr() * 110;
      g.fillStyle = greens[(rr() * greens.length) | 0]; g.fillRect(x + 2, y + 2, rw - 4, rh - 4);
      for (let k = 0; k < 14; k++) { g.fillStyle = 'rgba(40,60,20,0.12)'; g.fillRect(x + 2, y + 4 + k * (rh / 14), rw - 4, 1); }
      x += rw;
    }
    y += rh;
  }
  speckle(g, w, h, 400, ['#2a3a1a', '#c0c080'], 1, 4, 0.04, 0.12);
});
const woodTex = (color = '#6a3a22') => ctex('wood' + color, 128, 128, (g, w, h) => {
  g.fillStyle = color; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(0,0,0,${0.06 + rr() * 0.12})`; g.lineWidth = 1 + rr() * 2; const y = rr() * h; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w / 3, y + 4, (2 * w) / 3, y - 4, w, y); g.stroke(); }
});

// mặt tiền: các gian cửa bức bàn / cửa sổ (vẽ một lần cho cả mặt)
function facadeTex({ bays = 5, wall = '#d9c8a8', door = '#6a2a16', frame = '#3a1a0e', style = 'viet', h = 1 } = {}) {
  const key = ['fac', bays, wall, door, frame, style].join('|');
  return ctex(key, 128 * bays, 256, (g, w, H) => {
    g.fillStyle = wall; g.fillRect(0, 0, w, H);
    speckle(g, w, H, 80 * bays, [shade(wall, -0.25), shade(wall, 0.15)], 3, 18, 0.03, 0.08);
    const bw = w / bays;
    for (let b = 0; b < bays; b++) {
      const x0 = b * bw;
      if (style === 'khmer') {
        const ww = bw * 0.42, wx = x0 + (bw - ww) / 2, wy = H * 0.3, wh = H * 0.55;
        g.fillStyle = '#d9a43a'; g.beginPath(); g.moveTo(wx - 8, wy + wh + 6); g.lineTo(wx - 8, wy); g.quadraticCurveTo(x0 + bw / 2, wy - 60, wx + ww + 8, wy); g.lineTo(wx + ww + 8, wy + wh + 6); g.fill();
        g.fillStyle = '#7a1e10'; g.fillRect(wx, wy, ww, wh);
        g.strokeStyle = '#f0c860'; g.lineWidth = 2; g.strokeRect(wx + 3, wy + 3, ww - 6, wh - 6); g.beginPath(); g.moveTo(wx + ww / 2, wy); g.lineTo(wx + ww / 2, wy + wh); g.stroke();
        g.fillStyle = '#e8b64a'; g.fillRect(x0, H * 0.9, bw, H * 0.1);
      } else {
        const dw = bw * (style === 'plaster' ? 0.5 : 0.84), dx = x0 + (bw - dw) / 2, dy = style === 'plaster' ? H * 0.28 : H * 0.12, dh = H - dy - (style === 'plaster' ? H * 0.06 : 0);
        g.fillStyle = frame; g.fillRect(dx - 5, dy - 5, dw + 10, dh + 5);
        const leaves = style === 'plaster' ? 2 : 4;
        for (let l = 0; l < leaves; l++) {
          const lx = dx + (l * dw) / leaves + 2, lw = dw / leaves - 4;
          g.fillStyle = door; g.fillRect(lx, dy, lw, dh);
          g.fillStyle = shade(door, -0.45);
          for (let gy = dy + 8; gy < dy + dh * 0.45; gy += 9) g.fillRect(lx + 4, gy, lw - 8, 4);
          g.strokeStyle = shade(door, 0.2); g.lineWidth = 2;
          g.strokeRect(lx + 4, dy + dh * 0.52, lw - 8, dh * 0.2); g.strokeRect(lx + 4, dy + dh * 0.76, lw - 8, dh * 0.2);
        }
        if (style !== 'plaster') { g.fillStyle = shade(frame, 0.1); g.fillRect(x0, 0, bw, dy - 5); g.fillStyle = shade(door, -0.2); for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(x0 + bw * (k + 1) / 4, dy * 0.5, dy * 0.28, 0, TAU); g.fill(); } }
        else { g.fillStyle = shade(wall, -0.18); g.fillRect(x0, H * 0.18, bw, 5); }
      }
    }
    if (style !== 'khmer') { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, H - 6, w, 6); }
  });
}
// mặt tầng tháp (một mặt, lặp theo số cạnh)
function towerFaceTex(kind, color) {
  return ctex('tface' + kind + color, 128, 256, (g, w, h) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    speckle(g, w, h, 140, [shade(color, -0.3), shade(color, 0.15)], 2, 10, 0.05, 0.14);
    if (kind === 'brick') { g.strokeStyle = rgba(shade(color, -0.45), 0.35); g.lineWidth = 1; for (let y = 0; y < h; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } }
    g.fillStyle = shade(color, -0.25); g.fillRect(0, 0, 5, h); g.fillRect(w - 5, 0, 5, h);
    const aw = w * 0.42, ax = (w - aw) / 2, ay = h * 0.3, ah = h * 0.6;
    g.fillStyle = shade(color, kind === 'white' ? -0.15 : 0.18);
    g.beginPath(); g.moveTo(ax - 7, ay + ah); g.lineTo(ax - 7, ay); g.arc(w / 2, ay, aw / 2 + 7, PI, 0); g.lineTo(ax + aw + 7, ay + ah); g.fill();
    g.fillStyle = kind === 'white' ? '#3a3026' : '#2a120c';
    g.beginPath(); g.moveTo(ax, ay + ah); g.lineTo(ax, ay); g.arc(w / 2, ay, aw / 2, PI, 0); g.lineTo(ax + aw, ay + ah); g.fill();
    if (kind !== 'white') {
      g.fillStyle = kind === 'brick' ? '#f2ede0' : '#d9a443';
      g.beginPath(); g.ellipse(w / 2, ay + ah * 0.62, aw * 0.3, ah * 0.3, 0, 0, TAU); g.fill();
      g.beginPath(); g.arc(w / 2, ay + ah * 0.22, aw * 0.14, 0, TAU); g.fill();
    }
  });
}
const pedimentTex = () => ctex('pediment', 256, 128, (g, w, h) => {
  g.fillStyle = '#c8861e'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 9; i++) {
    g.strokeStyle = i % 2 ? '#f6d270' : '#8a4a10'; g.lineWidth = 3;
    g.beginPath(); g.ellipse(w / 2, h, w * 0.08 * (i + 1), h * 0.11 * (i + 1), 0, PI, 0); g.stroke();
  }
  g.fillStyle = '#ffe08a'; g.beginPath(); g.arc(w / 2, h * 0.62, 14, 0, TAU); g.fill();
});

// bản đồ pháp tuyến mặt nước (DataTexture tuần hoàn)
function waterNormalTex() {
  if (TEX.has('waterN')) return TEX.get('waterN');
  const N = 128, hgt = new Float32Array(N * N), R = mulberry(11), waves = [];
  for (let i = 0; i < 28; i++) {
    const kx = Math.round((R() * 2 - 1) * 9), ky = Math.round((R() * 2 - 1) * 9);
    if (!kx && !ky) continue;
    waves.push([kx, ky, R() * TAU, 1 / Math.hypot(kx, ky) ** 1.1]);
  }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let s = 0;
    for (const [kx, ky, ph, a] of waves) s += a * Math.sin((TAU * (kx * x + ky * y)) / N + ph);
    hgt[y * N + x] = s;
  }
  const data = new Uint8Array(N * N * 4), k = 2.2;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = hgt[y * N + ((x + 1) % N)] - hgt[y * N + ((x - 1 + N) % N)];
    const dy = hgt[((y + 1) % N) * N + x] - hgt[((y - 1 + N) % N) * N + x];
    const n = new V3(-dx * k, -dy * k, 1).normalize(), i = (y * N + x) * 4;
    data[i] = (n.x * 0.5 + 0.5) * 255; data[i + 1] = (n.y * 0.5 + 0.5) * 255; data[i + 2] = (n.z * 0.5 + 0.5) * 255; data[i + 3] = 255;
  }
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
  t.needsUpdate = true; t.userData.shared = true;
  TEX.set('waterN', t);
  return t;
}
function texRepeat(tex, x, y) { const t = tex.clone(); t.repeat.set(x, y); t.needsUpdate = true; t.userData = {}; return t; }

/* =====================================================================
   MÔI TRƯỜNG: bầu trời, sương phối cảnh (aerial perspective), vật liệu
   ===================================================================== */
// el: độ cao mặt trời (độ), az: phương vị (0 = phía trước chánh điện +z, 90 = +x)
const MOODS = {
  pond: { el: 38, az: 125, zen: '#3f7ac0', hor: '#cfdde6', gnd: '#a5b0a6', sun: '#fff0da', sunI: 2.7, glow: 1.0, cloud: 0.5, fog: 0.0042, fogHF: 0.015, fogBase: -3, amb: 0.55, skyI: 1.25 },
  lake: { el: 17, az: -115, zen: '#4b80c2', hor: '#efdcc0', gnd: '#b0a894', sun: '#ffd49a', sunI: 2.8, glow: 1.5, cloud: 0.36, fog: 0.0038, fogHF: 0.012, fogBase: -1.5, amb: 0.5, skyI: 1.25 },
  cave: { el: 40, az: 15, zen: '#5e94cc', hor: '#d8e4dd', gnd: '#a6b2a6', sun: '#fff2dc', sunI: 2.6, glow: 0.9, cloud: 0.5, fog: 0.0052, fogHF: 0.022, fogBase: -42, amb: 0.55, skyI: 1.2 },
  clouds: { el: 12, az: 50, zen: '#2858a6', hor: '#f2d4b6', gnd: '#e4d6cc', sun: '#ffc888', sunI: 3.0, glow: 1.8, cloud: 0.3, fog: 0.0016, fogHF: 0.01, fogBase: -38, amb: 0.45, skyI: 1.2 },
  cuuphong: { el: 30, az: -60, zen: '#3a7cc8', hor: '#e4e6dc', gnd: '#a8b0a4', sun: '#fff0d6', sunI: 2.9, glow: 1.2, cloud: 0.42, fog: 0.0009, fogHF: 0.006, fogBase: -8, amb: 0.54, skyI: 1.22 },
  hoangoc: { el: 28, az: 60, zen: '#3f86cf', hor: '#e8ecdf', gnd: '#b0b8a8', sun: '#ffeed2', sunI: 2.8, glow: 1.2, cloud: 0.5, fog: 0.0011, fogHF: 0.006, fogBase: -6, amb: 0.56, skyI: 1.22 },
  sontra: { el: 40, az: 70, zen: '#2c74cc', hor: '#d8e8ee', gnd: '#b0b8a8', sun: '#fff4e0', sunI: 3.0, glow: 1.0, cloud: 0.4, fog: 0.0012, fogHF: 0.006, fogBase: -40, amb: 0.56, skyI: 1.2 },
  nuisam: { el: 38, az: 120, zen: '#3a7ccc', hor: '#e6e6d4', gnd: '#b0b29a', sun: '#fff0d0', sunI: 2.9, glow: 1.0, cloud: 0.45, fog: 0.0013, fogHF: 0.006, fogBase: -10, amb: 0.56, skyI: 1.2 },
  fansipan: { el: 36, az: 62, zen: '#2f6cc4', hor: '#dfe6e6', gnd: '#b4b8ac', sun: '#fff2dc', sunI: 2.9, glow: 1.1, cloud: 0.42, fog: 0.00085, fogHF: 0.003, fogBase: -330, amb: 0.56, skyI: 1.2 },
  baden: { el: 34, az: 115, zen: '#4f8bd0', hor: '#e4e2d4', gnd: '#b0b29a', sun: '#fff0d0', sunI: 2.7, glow: 1.0, cloud: 0.5, fog: 0.0019, fogHF: 0.006, fogBase: -70, amb: 0.55, skyI: 1.2 },
  mountain: { el: 30, az: 130, zen: '#5a8ec6', hor: '#d4dedb', gnd: '#a8b0a2', sun: '#fff0d6', sunI: 2.6, glow: 0.95, cloud: 0.45, fog: 0.0048, fogHF: 0.014, fogBase: -26, amb: 0.55, skyI: 1.2 },
  river: { el: 6, az: 48, zen: '#3c5890', hor: '#ffb57a', gnd: '#c0948a', sun: '#ff9a50', sunI: 2.6, glow: 2.2, cloud: 0.42, fog: 0.0032, fogHF: 0.014, fogBase: -6, amb: 0.42, skyI: 1.15 },
  palm: { el: 62, az: 150, zen: '#2a6ad0', hor: '#d3e6f2', gnd: '#b4bcb4', sun: '#fff6e6', sunI: 3.1, glow: 0.75, cloud: 0.45, fog: 0.0024, fogHF: 0.012, fogBase: -1, amb: 0.6, skyI: 1.3 },
  citadel: { el: 26, az: 140, zen: '#4a7cbc', hor: '#e8dcc4', gnd: '#aaa890', sun: '#ffe0b0', sunI: 2.7, glow: 1.2, cloud: 0.45, fog: 0.0036, fogHF: 0.014, fogBase: -3, amb: 0.55, skyI: 1.2 },
  garden: { el: 33, az: -135, zen: '#4683cc', hor: '#e6dec6', gnd: '#a8ac94', sun: '#ffe4bc', sunI: 2.8, glow: 1.05, cloud: 0.42, fog: 0.0032, fogHF: 0.014, fogBase: -1, amb: 0.55, skyI: 1.25 },
};

const GLSL_COMMON = /* glsl */`
#ifndef XOCT
#define XOCT 5
#endif
uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uGround; uniform vec3 uSunDir; uniform vec3 uSunCol;
uniform float uFogDen; uniform float uFogHF; uniform float uFogBase; uniform float uTime;
float xhash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float xnoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(xhash(i), xhash(i + vec2(1.0, 0.0)), u.x), mix(xhash(i + vec2(0.0, 1.0)), xhash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float xfbm(vec2 p) { float s = 0.0; float a = 0.5; for (int i = 0; i < XOCT; i++) { s += a * xnoise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= 0.5; } return s; }
float xfbm3(vec2 p) { float s = 0.0; float a = 0.5; for (int i = 0; i < 3; i++) { s += a * xnoise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= 0.5; } return s / 0.875; }
vec3 skyCol(vec3 d) {
  float hz = 1.0 - clamp(d.y, 0.0, 1.0);
  vec3 c = mix(uZenith, uHorizon, pow(hz, 3.5));
  float sd = max(dot(d, uSunDir), 0.0);
  c += uSunCol * (pow(sd, 3.0) * 0.22 * hz * hz + pow(sd, 24.0) * 0.32 + pow(sd, 300.0) * 1.2);
  c = mix(c, uGround, smoothstep(0.0, -0.3, d.y));
  return c;
}
vec3 aerial(vec3 col, vec3 wp) {
  vec3 v = wp - cameraPosition; float dist = length(v); vec3 d = v / max(dist, 1e-3);
  float y0 = clamp(cameraPosition.y - uFogBase, -15.0, 400.0); float y1 = clamp(wp.y - uFogBase, -15.0, 400.0);
  float dy = y1 - y0; float e0 = exp(-uFogHF * y0); float e1 = exp(-uFogHF * y1);
  float avg = abs(dy * uFogHF) < 1e-3 ? e0 : (e0 - e1) / (uFogHF * dy);
  float f = 1.0 - exp(-dist * uFogDen * min(avg, 3.0));
  vec3 fd = normalize(vec3(d.x, max(d.y, 0.0) * 0.4 + 0.02, d.z));
  return mix(col, skyCol(fd), f);
}
`;

function makeEnv(view, quality = 'high', opts = {}) {
  const M = { ...(MOODS[view] || MOODS.garden), ...(opts.mood || {}) };
  const hq = quality !== 'low';
  const el = THREE.MathUtils.degToRad(M.el), az = THREE.MathUtils.degToRad(M.az);
  const sunDir = new V3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).normalize();
  const U = {
    uZenith: { value: C(M.zen).multiplyScalar(M.skyI * 0.92) },
    uHorizon: { value: C(M.hor).multiplyScalar(M.skyI * 0.88) },
    uGround: { value: C(M.gnd).multiplyScalar(M.skyI * 0.85) },
    uSunDir: { value: sunDir },
    uSunCol: { value: C(M.sun).multiplyScalar(M.glow) },
    uFogDen: { value: M.fog * 0.72 * (opts.fogScale ?? 1) }, uFogHF: { value: M.fogHF }, uFogBase: { value: M.fogBase },
    uTime: { value: 0 }, uWind: { value: 1 }, uCloud: { value: M.cloud }, uSunBoost: { value: new THREE.Color(0, 0, 0) },
    uAmb: { value: C(M.zen).lerp(C(M.hor), 0.55).multiplyScalar(M.amb * (opts.ambScale ?? 1)) },
  };
  const cache = new Map();
  const defs = hq ? {} : { XOCT: 3 };
  function patch(mat, o = {}) {
    mat.fog = false;
    mat.defines = { ...(mat.defines || {}), ...defs };
    const key = `ext|${o.wind || 0}|${o.windBase || 0}|${o.detail || 0}|${o.noFlip ? 1 : 0}`;
    mat.customProgramCacheKey = () => key;
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      let vs = sh.vertexShader, fs = sh.fragmentShader;
      vs = vs.replace('#include <common>', '#include <common>\nvarying vec3 vAW;\nuniform float uTime;\nuniform float uWind;');
      if (o.wind) vs = vs.replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          vec3 ip = modelMatrix[3].xyz;
          #ifdef USE_INSTANCING
            ip += instanceMatrix[3].xyz;
          #endif
          float hh = max(position.y - ${glf(o.windBase || 0)}, 0.0);
          float sw = sin(uTime * 1.3 + ip.x * 0.31 + ip.z * 0.17) * 0.7 + sin(uTime * 2.3 + ip.z * 0.43 + position.y * 0.6) * 0.3;
          float fl = sin(uTime * 5.0 + position.x * 2.0 + position.z * 1.7 + ip.x) * 0.25;
          transformed.x += (sw + fl) * hh * hh * uWind * ${glf(o.wind)};
          transformed.z += (sw * 0.5 - fl) * hh * hh * uWind * ${glf(o.wind)};
        }`);
      vs = vs.replace('#include <project_vertex>', `#include <project_vertex>
        {
          vec4 aw = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            aw = instanceMatrix * aw;
          #endif
          vAW = (modelMatrix * aw).xyz;
        }`);
      fs = fs.replace('#include <common>', '#include <common>\nvarying vec3 vAW;\nuniform vec3 uAmb;\nuniform vec3 uSunBoost;\n' + GLSL_COMMON);
      if (o.detail) fs = fs.replace('#include <color_fragment>', `#include <color_fragment>
        { float dn = xfbm3(vAW.xz * ${glf(o.detail)}); float dn2 = xnoise(vAW.xz * ${glf(o.detail * 11)});
          diffuseColor.rgb *= 0.66 + 0.5 * dn + 0.18 * dn2; }`);
      if (o.noFlip) fs = fs.replace('#include <normal_fragment_begin>', THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;', ''));
      fs = fs.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        { vec3 wn = inverseTransformDirection(normal, viewMatrix);
          reflectedLight.indirectDiffuse += diffuseColor.rgb * (uAmb * (0.62 + 0.38 * wn.y) + uSunBoost * max(dot(wn, uSunDir), 0.0) * RECIPROCAL_PI); }`);
      fs = fs.replace('#include <opaque_fragment>', `#include <opaque_fragment>
        gl_FragColor.rgb = aerial(gl_FragColor.rgb, vAW);`);
      sh.vertexShader = vs; sh.fragmentShader = fs;
    };
    return mat;
  }
  function std(key, params = {}, o = {}) {
    if (key && cache.has(key)) return cache.get(key);
    const m = patch(new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, ...params }), o);
    if (key) cache.set(key, m);
    return m;
  }
  return { view, M, U, hq, quality, sunDir, std, patch, defs, sunColor: C(M.sun), sunI: M.sunI, far: opts.far || 900 };
}

/* ---------- bầu trời (vòm theo camera, vẽ ở mặt phẳng xa) ---------- */
function makeSky(env, bumpFar) {
  const mat = new THREE.ShaderMaterial({
    name: 'ExtSky',
    uniforms: env.U,
    defines: { ...env.defs },
    vertexShader: /* glsl */`varying vec3 vDir;
      void main() { vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: GLSL_COMMON + /* glsl */`
      uniform float uCloud; varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        vec3 c = skyCol(d);
        float sd = dot(d, uSunDir);
        c += uSunCol * smoothstep(0.99955, 0.99985, sd) * 14.0;
        if (uCloud > 0.0 && d.y > 0.0) {
          vec2 p = d.xz / (d.y + 0.08) * 0.75 + uTime * vec2(0.005, 0.0022);
          float n = xfbm(p * 1.3 + vec2(3.7, 1.1));
          float th = 0.78 - uCloud * 0.42;
          float cov = smoothstep(th, th + 0.22, n);
          float n2 = xfbm(p * 1.3 + vec2(3.7, 1.1) + uSunDir.xz * 0.07);
          float lit = clamp(0.55 + (n - n2) * 5.0, 0.0, 1.0);
          vec3 base = mix(uHorizon * 0.78, uZenith * 0.55 + uHorizon * 0.45, 0.4);
          vec3 cc = mix(base, uHorizon * 0.9 + uSunCol * 0.45, lit);
          cc += uSunCol * pow(max(sd, 0.0), 6.0) * 0.8 * (1.0 - cov * 0.7);
          float fade = smoothstep(0.0, 0.22, d.y);
          c = mix(c, cc, cov * fade * 0.92);
        }
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), mat);
  sky.name = 'sky';
  sky.frustumCulled = false; sky.renderOrder = -1e6; sky.matrixAutoUpdate = false;
  sky.onBeforeRender = (r, s, cam) => {
    const e = cam.matrixWorld.elements;
    sky.matrixWorld.makeTranslation(e[12], e[13], e[14]);
    // camera chánh điện có far nhỏ: nới ra để thấy núi xa (sương che biên)
    if (bumpFar && cam.isPerspectiveCamera && !cam.userData.extVirtual && cam.far < env.far) { cam.far = env.far; cam.updateProjectionMatrix(); }
  };
  return sky;
}

/* ---------- mặt nước (phản chiếu thật khi 'high') ---------- */
const WATER_SHADER = {
  name: 'ExtWater',
  uniforms: {
    color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: new THREE.Matrix4() }, tNormal: { value: null },
    uDeep: { value: new THREE.Color() }, uWave: { value: 1 }, uScale: { value: 1 }, uRefl: { value: 1 }, uAmb: { value: new THREE.Color() },
  },
  vertexShader: /* glsl */`uniform mat4 textureMatrix; varying vec4 vUvR; varying vec3 vW;
    void main() { vUvR = textureMatrix * vec4(position, 1.0); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: GLSL_COMMON + /* glsl */`
    uniform sampler2D tDiffuse; uniform sampler2D tNormal; uniform vec3 uDeep; uniform float uWave; uniform float uScale; uniform float uRefl; uniform vec3 uAmb;
    varying vec4 vUvR; varying vec3 vW;
    void main() {
      vec3 toC = cameraPosition - vW; float dist = length(toC); vec3 V = toC / dist;
      vec2 p = vW.xz * uScale;
      vec2 n1 = texture2D(tNormal, p * 0.045 + uTime * vec2(0.011, 0.006)).xy * 2.0 - 1.0;
      vec2 n2 = texture2D(tNormal, p * 0.12 + uTime * vec2(-0.008, 0.014)).xy * 2.0 - 1.0;
      vec2 n3 = texture2D(tNormal, p * 0.37 + uTime * vec2(0.021, -0.012)).xy * 2.0 - 1.0;
      vec2 sl = (n1 + n2 * 0.7 + n3 * 0.45) * uWave * (0.2 + 0.8 * exp(-dist * 0.015));
      vec3 N = normalize(vec3(sl.x, 1.0, sl.y));
      float cosT = max(dot(N, V), 0.0);
      float fres = 0.02 + 0.98 * pow(1.0 - cosT, 5.0);
      vec3 R = reflect(-V, N);
      vec3 refl = skyCol(normalize(vec3(R.x, abs(R.y), R.z)));
      #ifdef REFL
        vec2 ruv = vUvR.xy / vUvR.w + sl * 0.03;
        refl = mix(refl, texture2D(tDiffuse, ruv).rgb, uRefl);
      #endif
      vec3 body = uDeep * (uAmb * 1.6 + uSunCol * max(uSunDir.y, 0.0) * 0.3);
      vec3 col = mix(body, refl, fres);
      float sdot = max(dot(R, uSunDir), 0.0);
      col += uSunCol * (pow(sdot, 500.0) * 40.0 + pow(sdot, 50.0) * 0.5) * (0.4 + 0.6 * uWave);
      col = aerial(col, vW);
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
};
function makeWater(env, geo, { y = 0, deep = '#2a4a44', wave = 1, scale = 1, reflect, size } = {}) {
  const useRefl = reflect ?? env.hq;
  let mesh;
  if (useRefl) {
    const s = size || (env.hq ? 512 : 256);
    mesh = new Reflector(geo, { textureWidth: s, textureHeight: s, clipBias: 0.003, multisample: 0, shader: WATER_SHADER });
    mesh.camera.userData.extVirtual = true;
    mesh.material.defines = { ...env.defs, REFL: '' };
  } else {
    mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({ ...WATER_SHADER, uniforms: THREE.UniformsUtils.clone(WATER_SHADER.uniforms), defines: { ...env.defs } }));
  }
  const u = mesh.material.uniforms;
  for (const k of Object.keys(env.U)) u[k] = env.U[k];
  u.tNormal.value = waterNormalTex();
  u.uDeep.value = C(deep); u.uWave.value = wave; u.uScale.value = scale;
  mesh.rotation.x = -PI / 2; mesh.position.y = y;
  mesh.receiveShadow = false; mesh.castShadow = false;
  mesh.userData.water = true;
  mesh.userData.noWalk = true; // mặt nước: không đi lên được
  return mesh;
}

/* ---------- cụm mây nổi (sprite) trên biển mây ---------- */
const puffTex = () => ctex('puff', 128, 128, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  for (let i = 0; i < 26; i++) {
    const a = rr() * TAU, d = rr() * w * 0.24, x = w / 2 + Math.cos(a) * d, y = h * 0.56 + Math.sin(a) * d * 0.55, r = w * (0.12 + rr() * 0.16);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    const sh = Math.round(255 - Math.max(0, (y - h * 0.45)) * 1.1);
    gr.addColorStop(0, `rgba(${sh},${sh},${Math.min(255, sh + 8)},0.55)`); gr.addColorStop(1, `rgba(${sh},${sh},${sh},0)`);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
}, { repeat: false });
function cloudPuffs(env, y, n, r0, r1, seed = 3) {
  const grp = new THREE.Group(), R = mulberry(seed);
  const lit = env.U.uHorizon.value.clone().multiplyScalar(0.55).add(env.U.uSunCol.value.clone().multiplyScalar(0.3));
  const shd = env.U.uZenith.value.clone().multiplyScalar(0.5).add(env.U.uHorizon.value.clone().multiplyScalar(0.25));
  const hz = env.U.uHorizon.value;
  for (let i = 0; i < n; i++) {
    const a = R() * TAU, r = Math.sqrt(lerp(r0 * r0, r1 * r1, R()));
    const x = Math.sin(a) * r, z = Math.cos(a) * r;
    const toward = Math.max(0, (x * env.sunDir.x + z * env.sunDir.z) / r);
    const col = shd.clone().lerp(lit, 0.55 + 0.45 * toward).lerp(hz.clone().multiplyScalar(0.85), Math.min(0.85, r / (r1 * 1.1)));
    const m = new THREE.SpriteMaterial({ map: puffTex(), color: col, transparent: true, depthWrite: false, fog: false, opacity: 0.9 });
    const sp = new THREE.Sprite(m);
    const s = lerp(40, 110, R()) * (0.6 + r / r1);
    sp.scale.set(s * 1.8, s * 0.7, 1);
    sp.position.set(x, y + s * 0.12, z);
    sp.renderOrder = 3;
    grp.add(sp);
  }
  return grp;
}

/* ---------- biển mây ---------- */
function makeCloudSea(env, y, radius = 900) {
  const mat = new THREE.ShaderMaterial({
    uniforms: env.U, defines: { ...env.defs }, transparent: true, depthWrite: false, fog: false,
    vertexShader: /* glsl */`varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: GLSL_COMMON + /* glsl */`
      varying vec3 vW;
      void main() {
        vec2 p = vW.xz * 0.0075 + uTime * vec2(0.0035, 0.0012);
        float n = xfbm(p); float n2 = xnoise(p * 7.0 + 1.7);
        float dens = smoothstep(0.25, 0.7, n * 0.85 + n2 * 0.15);
        float ns = xfbm(p + uSunDir.xz * 0.045);
        float lit = clamp(0.5 + (n - ns) * 7.0, 0.0, 1.0);
        vec3 shd = (uZenith * 0.7 + uHorizon * 0.3) * 0.62;
        vec3 hi = uHorizon * 0.5 + uSunCol * 0.32;
        vec3 col = mix(shd, hi, lit * (0.4 + 0.6 * dens)) * (0.55 + 0.5 * dens);
        float a = mix(0.62, 1.0, dens);
        col = aerial(col, vW);
        float edge = 1.0 - smoothstep(${glf(radius * 0.7)}, ${glf(radius)}, length(vW.xz));
        gl_FragColor = vec4(col, a * edge);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 64), mat);
  m.rotation.x = -PI / 2; m.position.y = y; m.renderOrder = 2;
  return m;
}

/* =====================================================================
   HÌNH KHỐI CƠ BẢN
   ===================================================================== */
// ống thuôn dọc đường cong (thân cây, đầu đao, rồng…)
function taperTube(pts, rFn, radial = 7, segs = 0, uvS = 1) {
  const curve = new THREE.CatmullRomCurve3(pts);
  const n = segs || Math.max(4, pts.length * 3);
  const fr = curve.computeFrenetFrames(n, false);
  const len = curve.getLength();
  const pos = [], nor = [], uv = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, P = curve.getPointAt(t), N = fr.normals[i], B = fr.binormals[i], r = rFn(t);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * TAU, ca = Math.cos(a), sa = Math.sin(a);
      const nx = ca * N.x + sa * B.x, ny = ca * N.y + sa * B.y, nzz = ca * N.z + sa * B.z;
      pos.push(P.x + r * nx, P.y + r * ny, P.z + r * nzz); nor.push(nx, ny, nzz);
      uv.push(j / radial, (t * len) / uvS);
    }
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = a + radial + 1;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}
// hộp có UV theo mét (họa tiết lặp đúng tỉ lệ)
function boxUV(w, h, d, s = 1) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, (uv.getX(i) * dims[f][0]) / s, (uv.getY(i) * dims[f][1]) / s); }
  return g;
}
function cylUV(rt, rb, h, seg, s = 1, open = false) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);
  const uv = g.attributes.uv, circ = TAU * Math.max(rt, rb);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * circ) / s, (uv.getY(i) * h) / s);
  return g;
}
function addColor(geo, col) {
  const c = C(col), n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}
function place(geo, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, s = 1) {
  const m = new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new V3(s, s, s));
  return geo.applyMatrix4(m);
}
function merge(list) { const g = mergeGeometries(list.map((x) => (x.index ? x : x)), false); list.forEach((x) => x.dispose()); return g; }
function mesh(geo, mat, o = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = o.cast ?? false; m.receiveShadow = o.receive ?? true;
  if (o.pos) m.position.set(...o.pos);
  if (o.rot) m.rotation.set(...o.rot);
  if (o.scale) m.scale.set(...(Array.isArray(o.scale) ? o.scale : [o.scale, o.scale, o.scale]));
  return m;
}

/* ---------- địa hình lưới cực (mặt đất + núi xa) ---------- */
function polarTerrain(env, { r0, r1, segA = 256, segR = 64, h, col, lin = false, detail = 0.05, mat }) {
  const pos = [], idx = [], uv = [];
  for (let i = 0; i <= segR; i++) {
    const t = i / segR, r = lin ? lerp(r0, r1, t) : r0 * Math.pow(r1 / r0, t);
    for (let j = 0; j <= segA; j++) {
      const a = (j / segA) * TAU, x = Math.sin(a) * r, z = Math.cos(a) * r;
      pos.push(x, h(x, z, r, a), z); uv.push(x / 6, z / 6);
    }
  }
  for (let i = 0; i < segR; i++) for (let j = 0; j < segA; j++) {
    const a = i * (segA + 1) + j, b = a + segA + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const P = g.attributes.position, Nn = g.attributes.normal, cols = new Float32Array(P.count * 3), tmp = new THREE.Color();
  for (let i = 0; i < P.count; i++) {
    col(tmp, P.getX(i), P.getY(i), P.getZ(i), Nn.getY(i));
    cols[i * 3] = tmp.r; cols[i * 3 + 1] = tmp.g; cols[i * 3 + 2] = tmp.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const m = mesh(g, mat || env.std('terrain' + detail, { vertexColors: true, roughness: 1 }, { detail }));
  return m;
}
// lớp núi theo vòng: đỉnh thay đổi theo góc
function ridge(a, r, { rc, width, H, freq = 2, seed = 0, sharp = 1, base = 0.35 }) {
  const ca = Math.cos(a), sa = Math.sin(a);
  const n = fbm(ca * freq + seed, sa * freq - seed, 4, seed);
  const rd = 1 - Math.abs(nz(ca * freq * 2.3 + seed * 2, sa * freq * 2.3, seed + 5));
  const peak = H * Math.max(0, base + n * 1.5) * (0.55 + 0.45 * Math.pow(rd, sharp));
  const dr = (r - rc) / width;
  return peak * Math.exp(-dr * dr * 2.2);
}
const terrCol = (t, y, ny, { grass = '#4f6a2c', forest = '#2f4a22', rock = '#7a766a', sand, waterY = -1e9, snowY } = {}) => {
  const k = nz(y * 0.02, ny * 3, 1.7) * 0.5 + 0.5;
  t.set(forest).lerp(C(grass), Math.min(1, Math.max(0, k * 0.8)));
  if (ny < 0.72) t.lerp(C(rock), Math.min(1, (0.72 - ny) * 2.8));
  if (sand && y < waterY + 0.8) t.lerp(C(sand), Math.min(1, (waterY + 0.8 - y) / 1.2));
  return t;
};

/* ---------- núi đá vôi (karst) ---------- */
function karstGeo(seed, segA = 30, segY = 22, aspect = 0.42) {
  const pos = [], idx = [];
  for (let iy = 0; iy <= segY; iy++) {
    const t = iy / segY;
    const prof = Math.pow(Math.max(0, 1 - Math.pow(t, 5)), 0.42) * (1.05 - 0.3 * t) + (t < 0.06 ? (0.06 - t) * 4 : 0);
    for (let ia = 0; ia <= segA; ia++) {
      const th = (ia / segA) * TAU, ca = Math.cos(th), sa = Math.sin(th);
      const n = 1 + 0.3 * nz(ca * 1.2 + seed, sa * 1.2, t * 1.4 + seed) + 0.12 * nz(ca * 5 + seed, sa * 5, t * 0.6) + 0.05 * nz(ca * 11, sa * 11, t * 6 + seed);
      const r = aspect * prof * n;
      pos.push(sa * r, t + 0.04 * nz(ca * 2, sa * 2, seed + 9), ca * r);
    }
  }
  for (let iy = 0; iy < segY; iy++) for (let ia = 0; ia < segA; ia++) {
    const a = iy * (segA + 1) + ia, b = a + segA + 1;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const P = g.attributes.position, Nn = g.attributes.normal, cols = new Float32Array(P.count * 3), c = new THREE.Color();
  const rock = C('#8e8a80'), rock2 = C('#6a675e'), veg = C('#3a5626'), veg2 = C('#557236');
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i), ny = Nn.getY(i);
    const v = nz(x * 6 + seed, y * 5, z * 6) * 0.9 + (ny - 0.3) * 2.4 + (y < 0.12 ? 0.6 : 0);
    c.copy(rock).lerp(rock2, nz(x * 3, y * 14, z * 3 + seed) * 0.5 + 0.5);
    c.lerp(veg, smooth(-0.1, 0.35, v)).lerp(veg2, smooth(0.4, 1.0, v) * 0.6);
    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(P.count * 2), 2));
  return g;
}
function karstField(env, list, seed = 3) {
  // list: [x, z, height, yBase, widthScale]
  const grp = new THREE.Group();
  const mat = env.std('karst', { vertexColors: true, roughness: 1, map: texRepeat(detailTex('rock'), 6, 6) }, { detail: 0.11 });
  const variants = [karstGeo(seed), karstGeo(seed + 17, 30, 22, 0.5), karstGeo(seed + 41, 30, 22, 0.36)];
  const byV = [[], [], []];
  list.forEach((k, i) => byV[i % 3].push(k));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), R = mulberry(seed);
  byV.forEach((arr, vi) => {
    if (!arr.length) return;
    const im = new THREE.InstancedMesh(variants[vi], mat, arr.length);
    arr.forEach(([x, z, hgt, yb = 0, ws = 1], i) => {
      q.setFromEuler(new THREE.Euler(0, R() * TAU, 0));
      m4.compose(new V3(x, yb - hgt * 0.05, z), q, new V3(hgt * ws, hgt, hgt * ws));
      im.setMatrixAt(i, m4);
    });
    im.receiveShadow = true;
    grp.add(im);
  });
  return grp;
}

/* =====================================================================
   CÂY CỐI
   ===================================================================== */
const TREES = {
  broad: { h: [7, 11], trunk: 0.28, crownY: 0.55, crown: [3.4, 2.6, 3.4], blobs: 7, cards: 12, card: 1.9, bark: '#5a4a3a', leaf: 'broad', wind: 0.0006 },
  banyan: { h: [10, 14], trunk: 0.75, crownY: 0.45, crown: [7.5, 3.6, 7.5], blobs: 12, cards: 14, card: 2.6, bark: '#6a5e50', leaf: 'banyan', roots: true, wind: 0.00025 },
  sao: { h: [22, 30], trunk: 0.5, crownY: 0.72, crown: [5.5, 4.5, 5.5], blobs: 9, cards: 13, card: 2.6, bark: '#6a5a48', leaf: 'sao', wind: 0.00012 },
  pine: { h: [9, 15], trunk: 0.26, crownY: 0.5, crown: [3.2, 3.6, 3.2], blobs: 7, cards: 16, card: 2.3, bark: '#5a3e2c', leaf: 'pine', flat: true, wind: 0.0004 },
  flower: { h: [4.5, 6.5], trunk: 0.18, crownY: 0.5, crown: [2.6, 1.8, 2.6], blobs: 6, cards: 10, card: 1.5, bark: '#6a5a4a', leaf: 'flower', wind: 0.001 },
  bodhi: { h: [12, 16], trunk: 0.7, crownY: 0.42, crown: [7, 4.6, 7], blobs: 12, cards: 15, card: 2.7, bark: '#7a7060', leaf: 'banyan', wind: 0.0002 },
  shrub: { h: [1, 1.6], trunk: 0.0, crownY: 0.0, crown: [1.1, 0.75, 1.1], blobs: 3, cards: 10, card: 1.0, bark: '#4a3a2a', leaf: 'shrub', wind: 0.004 },
};
function cardsAround(out, center, crownC, radius, n, size, R, { flat = false, droop = 0 } = {}) {
  const { pos, nor, uv, col, idx } = out;
  for (let k = 0; k < n; k++) {
    const dir = new V3(R() * 2 - 1, (R() * 2 - 1) * (flat ? 0.35 : 0.85), R() * 2 - 1).normalize();
    const p = center.clone().addScaledVector(dir, radius * (0.45 + 0.55 * Math.sqrt(R())));
    const s = size * (0.75 + R() * 0.5);
    const u = new V3(R() - 0.5, flat ? (R() - 0.5) * 0.3 : R() - 0.5, R() - 0.5).normalize();
    const w = new V3().crossVectors(u, flat ? new V3(0, 1, 0) : new V3(R() - 0.5, R() - 0.5, R() - 0.5).normalize());
    if (w.lengthSq() < 1e-4) w.set(1, 0, 0);
    w.normalize();
    if (flat) { u.set(R() - 0.5, 0.06 * (R() - 0.5), R() - 0.5).normalize(); w.crossVectors(u, new V3(0, 1, 0)).normalize(); w.y = 0.12 * (R() - 0.5); }
    const base = pos.length / 3;
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (const [a, b] of corners) {
      const q = p.clone().addScaledVector(u, a * s * 0.5).addScaledVector(w, b * s * 0.5);
      if (droop) q.y -= droop * s * (a + 1) * 0.25;
      pos.push(q.x, q.y, q.z);
      const nn = q.clone().sub(crownC); nn.y = nn.y * 1.2 + (flat ? 0.6 : 0.25) * radius; nn.normalize();
      nor.push(nn.x, nn.y, nn.z);
      uv.push((a + 1) / 2, (b + 1) / 2);
      const ao = Math.min(1, Math.max(0.35, 0.55 + (q.y - crownC.y) / (radius * 2.6) + q.clone().sub(crownC).setY(0).length() / (radius * 4)));
      col.push(ao, ao, ao);
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
}
function cardGeo(o) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(o.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(o.nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(o.uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(o.col, 3));
  g.setIndex(o.idx);
  return g;
}
function makeTree(kind, seed, lod = 1) {
  const P = TREES[kind], R = mulberry(seed);
  const H = lerp(P.h[0], P.h[1], R());
  const trunks = [];
  const L = { pos: [], nor: [], uv: [], col: [], idx: [] };
  const cy = H * P.crownY + P.crown[1] * 0.5;
  const crownC = new V3((R() - 0.5) * 0.8, cy, (R() - 0.5) * 0.8);
  if (P.trunk > 0) {
    const top = new V3(crownC.x * 0.8, H * P.crownY + (kind === 'sao' ? P.crown[1] * 0.3 : 0), crownC.z * 0.8);
    const mid = new V3(top.x * 0.3 + (R() - 0.5) * 0.4, top.y * 0.45, top.z * 0.3 + (R() - 0.5) * 0.4);
    trunks.push(taperTube([new V3(0, -0.6, 0), new V3(0, 0.2, 0), mid, top], (t) => P.trunk * (1 - 0.5 * t) * (1 + Math.max(0, 0.12 - t) * 7), 8, 10, 1.2));
    const nb = Math.max(3, Math.round(P.blobs * 0.6));
    for (let b = 0; b < nb; b++) {
      const a = (b / nb) * TAU + R() * 0.6;
      const from = mid.clone().lerp(top, 0.4 + R() * 0.6);
      const to = crownC.clone().add(new V3(Math.cos(a) * P.crown[0] * 0.65, (R() - 0.2) * P.crown[1] * 0.4, Math.sin(a) * P.crown[2] * 0.65));
      const m = from.clone().lerp(to, 0.5); m.y += P.crown[1] * 0.15;
      trunks.push(taperTube([from, m, to], (t) => P.trunk * 0.42 * (1 - 0.75 * t), 5, 6, 1.2));
    }
    if (P.roots) for (let r = 0; r < 8; r++) {
      const a = R() * TAU, d = P.crown[0] * (0.25 + R() * 0.5);
      const x = Math.cos(a) * d, z = Math.sin(a) * d, y0 = H * P.crownY + R() * 1.5;
      trunks.push(taperTube([new V3(x, y0, z), new V3(x + 0.1, y0 * 0.5, z), new V3(x, -0.3, z)], (t) => 0.06 + 0.1 * t, 4, 4, 1.2));
    }
  }
  const nb = Math.max(2, Math.round(P.blobs * lod));
  for (let b = 0; b < nb; b++) {
    let c;
    if (P.flat) {
      const t = b / (nb - 1 || 1);
      const a = R() * TAU, d = (1 - t * 0.6) * P.crown[0] * 0.75 * R();
      c = new V3(crownC.x + Math.cos(a) * d, H * P.crownY + t * P.crown[1] * 1.4, crownC.z + Math.sin(a) * d);
      cardsAround(L, c, crownC, P.crown[0] * (0.55 - t * 0.2), Math.round(P.cards * lod), P.card, R, { flat: true });
    } else {
      const v = new V3(R() * 2 - 1, R() * 1.6 - 0.6, R() * 2 - 1);
      if (v.length() > 1) v.normalize();
      c = crownC.clone().add(new V3(v.x * P.crown[0] * 0.62, v.y * P.crown[1] * 0.55, v.z * P.crown[2] * 0.62));
      cardsAround(L, c, crownC, Math.max(P.crown[0], P.crown[1]) * 0.48, Math.round(P.cards * lod), P.card, R);
    }
  }
  return { trunk: trunks.length ? merge(trunks) : null, leaves: cardGeo(L), height: H };
}
function bambooClump(seed, lod = 1) {
  const R = mulberry(seed), culms = [], L = { pos: [], nor: [], uv: [], col: [], idx: [] };
  const n = Math.round(16 * lod);
  for (let i = 0; i < n; i++) {
    const a = R() * TAU, d = R() * 0.9, x = Math.cos(a) * d, z = Math.sin(a) * d;
    const H = 8 + R() * 6, lean = 0.12 + R() * 0.25;
    const pts = [];
    for (let k = 0; k <= 5; k++) { const t = k / 5; pts.push(new V3(x + Math.cos(a) * lean * H * t * t, H * t - 0.3, z + Math.sin(a) * lean * H * t * t)); }
    const r0 = 0.05 + R() * 0.035;
    culms.push(taperTube(pts, (t) => r0 * (1 - 0.6 * t), 5, 10, 0.9));
    const curve = new THREE.CatmullRomCurve3(pts);
    const nl = Math.round(13 * lod);
    for (let k = 0; k < nl; k++) {
      const t = 0.35 + R() * 0.65, p = curve.getPointAt(t);
      const cc = new V3(p.x * 0.3, p.y - 1.5, p.z * 0.3);
      cardsAround(L, p, cc, 0.9, 1, 2.1, R, { droop: 0.5 });
    }
  }
  return { trunk: merge(culms), leaves: cardGeo(L), height: 12 };
}
function palmTree(seed, lod = 1) {
  const R = mulberry(seed);
  const H = 9 + R() * 6, bend = 1 + R() * 2.5, a = R() * TAU;
  const dx = Math.cos(a), dz = Math.sin(a);
  const pts = [];
  for (let k = 0; k <= 6; k++) { const t = k / 6; pts.push(new V3(dx * bend * t * t, H * t - 0.3, dz * bend * t * t)); }
  const trunk = taperTube(pts, (t) => 0.2 * (1 - 0.3 * t) * (1 + Math.max(0, 0.1 - t) * 5), 7, 14, 1.2);
  const top = pts.at(-1);
  const L = { pos: [], nor: [], uv: [], col: [], idx: [] };
  const nf = Math.round(15 * Math.max(0.7, lod));
  for (let f = 0; f < nf; f++) {
    const phi = (f / nf) * TAU + R() * 0.3;
    const el = lerp(0.9, -0.5, (f % 3) / 2) + (R() - 0.5) * 0.3;
    const len = 4 + R() * 1.4, droop = 0.55 + R() * 0.4, segs = 8;
    const hx = Math.cos(phi), hz = Math.sin(phi);
    const side = new V3(-hz, 0, hx);
    const base = L.pos.length / 3;
    for (let s = 0; s <= segs; s++) {
      const t = s / segs;
      const along = Math.cos(el) * t * len, up = Math.sin(el) * t * len - droop * t * t * len;
      const sp = new V3(top.x + hx * along, top.y + up, top.z + hz * along);
      const w = 0.75 * Math.pow(Math.sin(PI * Math.min(1, t * 1.05 + 0.04)), 0.6);
      for (const sd of [-1, 1]) {
        const q = sp.clone().addScaledVector(side, sd * w); q.y -= w * 0.28;
        L.pos.push(q.x, q.y, q.z);
        const nn = new V3(hx * 0.3, 1, hz * 0.3).addScaledVector(side, sd * 0.4).normalize();
        L.nor.push(nn.x, nn.y, nn.z);
        L.uv.push(sd < 0 ? 0 : 1, t);
        const ao = 0.6 + 0.4 * t; L.col.push(ao, ao, ao);
      }
    }
    for (let s = 0; s < segs; s++) { const i0 = base + s * 2; L.idx.push(i0, i0 + 1, i0 + 3, i0, i0 + 3, i0 + 2); }
  }
  const nuts = [];
  for (let k = 0; k < 5; k++) { const aa = R() * TAU; nuts.push(place(new THREE.SphereGeometry(0.16, 6, 5), top.x + Math.cos(aa) * 0.25, top.y - 0.35, top.z + Math.sin(aa) * 0.25)); }
  nuts.forEach((g) => { g.deleteAttribute('uv'); g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); });
  return { trunk: merge([trunk, ...nuts]), leaves: cardGeo(L), height: H };
}
// đặt nhiều cây bằng InstancedMesh: list = [{x,y,z,s,ry}]
function forest(env, kind, list, { variants = 3, seed = 1, cast = false } = {}) {
  const grp = new THREE.Group();
  if (!list.length) return grp;
  const lod = env.hq ? 1 : 0.6;
  const P = TREES[kind] || {};
  const leafKind = kind === 'bamboo' ? 'bamboo' : kind === 'palm' ? 'frond' : P.leaf;
  const wind = kind === 'bamboo' ? 0.0016 : kind === 'palm' ? 0.0007 : P.wind;
  const barkMap = kind === 'bamboo' ? bambooTex() : kind === 'palm' ? palmTrunkTex() : barkTex(P.bark);
  const barkMat = env.std('bark' + kind, { map: barkMap, roughness: 0.95 }, { wind });
  const leafMat = env.std('leaf' + kind, {
    map: leafKind === 'frond' ? frondTex() : leafTex(leafKind), alphaTest: 0.42, side: THREE.DoubleSide, vertexColors: true, roughness: 0.82,
    alphaToCoverage: env.hq,
  }, { wind, noFlip: true });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (let v = 0; v < variants; v++) {
    const items = list.filter((_, i) => i % variants === v);
    if (!items.length) continue;
    const t = kind === 'bamboo' ? bambooClump(seed * 31 + v, lod) : kind === 'palm' ? palmTree(seed * 31 + v, lod) : makeTree(kind, seed * 31 + v, lod);
    const parts = [[t.trunk, barkMat], [t.leaves, leafMat]];
    for (const [geo, mat] of parts) {
      if (!geo) continue;
      const im = new THREE.InstancedMesh(geo, mat, items.length);
      items.forEach((it, i) => {
        q.setFromEuler(new THREE.Euler(0, it.ry ?? (i * 2.39 + v), 0));
        const s = it.s ?? 1;
        m4.compose(new V3(it.x, it.y ?? 0, it.z), q, new V3(s, s * (it.sy ?? 1), s));
        im.setMatrixAt(i, m4);
      });
      im.castShadow = cast; im.receiveShadow = true;
      im.computeBoundingSphere();
      grp.add(im);
    }
  }
  return grp;
}
// rải điểm ngẫu nhiên trong vành khăn, tránh vùng cấm
function scatter(n, { r0, r1, seed = 1, avoid = () => false, y = () => 0, s = [0.8, 1.2], arc }) {
  const R = mulberry(seed), out = [];
  let tries = 0;
  while (out.length < n && tries++ < n * 40) {
    const a = arc ? lerp(arc[0], arc[1], R()) : R() * TAU, r = Math.sqrt(lerp(r0 * r0, r1 * r1, R()));
    const x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (avoid(x, z)) continue;
    const yy = y(x, z);
    if (yy === null) continue;
    out.push({ x, z, y: yy, s: lerp(s[0], s[1], R()) });
  }
  return out;
}

/* ---------- sen, đá, thuyền ---------- */
function lotusPatch(env, pts, wy, R = mulberry(5)) {
  // pts: [{x,z,s}]
  const grp = new THREE.Group();
  const leafGeo = new THREE.CircleGeometry(1, 18);
  const p = leafGeo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, 0.12 * (x * x + y * y)); }
  leafGeo.computeVertexNormals();
  leafGeo.rotateX(-PI / 2);
  const leafMat = env.std('lotusleaf', { map: lotusLeafTex(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 }, { wind: 0.002 });
  const lim = new THREE.InstancedMesh(leafGeo, leafMat, pts.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  const raised = [];
  pts.forEach((pt, i) => {
    const up = R() < 0.3;
    const yy = wy + (up ? 0.25 + R() * 0.7 : 0.02 + R() * 0.02);
    q.setFromEuler(new THREE.Euler(up ? (R() - 0.5) * 0.5 : 0, R() * TAU, up ? (R() - 0.5) * 0.5 : 0));
    m4.compose(new V3(pt.x, yy, pt.z), q, new V3(pt.s, pt.s, pt.s));
    lim.setMatrixAt(i, m4);
    if (up) raised.push([pt.x, yy, pt.z]);
  });
  lim.receiveShadow = true;
  grp.add(lim);
  // cuống lá & hoa
  if (raised.length) {
    const stem = new THREE.CylinderGeometry(0.015, 0.02, 1, 4); stem.translate(0, -0.5, 0);
    const sm = new THREE.InstancedMesh(stem, env.std('lotusstem', { color: '#4f6e2a' }), raised.length);
    raised.forEach(([x, y, z], i) => { m4.compose(new V3(x, y, z), q.identity(), new V3(1, y - wy + 0.1, 1)); sm.setMatrixAt(i, m4); });
    grp.add(sm);
  }
  const petals = [];
  for (let ring = 0; ring < 2; ring++) {
    const n = ring ? 6 : 8;
    for (let k = 0; k < n; k++) {
      const pg = new THREE.SphereGeometry(0.5, 6, 6, 0, PI * 0.7, 0, PI * 0.5);
      pg.scale(0.28, 0.75, 0.16);
      pg.translate(0, 0, 0.06);
      pg.rotateX(ring ? -0.35 : -0.75);
      pg.rotateY((k / n) * TAU + ring * 0.4);
      const pa = pg.attributes.position, cc = new Float32Array(pa.count * 3);
      for (let i = 0; i < pa.count; i++) { const t = Math.min(1, pa.getY(i) / 0.4); const c = C('#fbe6ec').lerp(C('#e25a8a'), t); cc[i * 3] = c.r; cc[i * 3 + 1] = c.g; cc[i * 3 + 2] = c.b; }
      pg.setAttribute('color', new THREE.BufferAttribute(cc, 3));
      petals.push(pg);
    }
  }
  const pod = addColor(new THREE.CylinderGeometry(0.07, 0.05, 0.08, 8), '#e8c040');
  pod.translate(0, 0.08, 0);
  const flowerGeo = mergeGeometries([...petals, pod].map((g) => { g.deleteAttribute('uv'); return g.index ? g : g; }), false);
  const nflow = Math.max(4, Math.round(pts.length * 0.12));
  const fim = new THREE.InstancedMesh(flowerGeo, env.std('lotusflower', { vertexColors: true, roughness: 0.6, side: THREE.DoubleSide }), nflow);
  for (let i = 0; i < nflow; i++) {
    const pt = pts[(R() * pts.length) | 0];
    q.setFromEuler(new THREE.Euler((R() - 0.5) * 0.2, R() * TAU, 0));
    m4.compose(new V3(pt.x + (R() - 0.5), wy + 0.5 + R() * 0.6, pt.z + (R() - 0.5)), q, new V3(1, 1, 1).multiplyScalar(0.8 + R() * 0.5));
    fim.setMatrixAt(i, m4);
  }
  grp.add(fim);
  return grp;
}
function rocks(env, list, color = '#8a857a', seed = 2) {
  const geo = new THREE.IcosahedronGeometry(1, 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const v = new V3().fromBufferAttribute(p, i); const k = 1 + 0.28 * nz(v.x * 1.7 + seed, v.y * 1.7, v.z * 1.7); p.setXYZ(i, v.x * k, v.y * k * 0.7, v.z * k); }
  geo.computeVertexNormals();
  const im = new THREE.InstancedMesh(geo, env.std('rock' + color, { color, map: texRepeat(rockTex(), 1, 1), roughness: 0.95 }), list.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), R = mulberry(seed);
  list.forEach(([x, y, z, s, sy = 1], i) => { q.setFromEuler(new THREE.Euler(R() * 0.4, R() * TAU, R() * 0.4)); m4.compose(new V3(x, y, z), q, new V3(s, s * sy, s * (0.8 + R() * 0.4))); im.setMatrixAt(i, m4); });
  im.receiveShadow = true;
  return im;
}
function boatGeo(kind = 'sampan') {
  const L = kind === 'dragon' ? 12 : 5, W = kind === 'dragon' ? 1.3 : 0.9, D = 0.45, segs = 12, ring = 7;
  const pos = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, x = (t - 0.5) * L, w = W * Math.pow(Math.sin(PI * t), 0.55) * 0.5, sheer = 0.25 * Math.pow(Math.abs(t - 0.5) * 2, 3);
    for (let j = 0; j <= ring; j++) {
      const a = PI * (j / ring);
      pos.push(x, -Math.sin(a) * D * (0.3 + 0.7 * Math.sin(PI * t)) + sheer + D * 0.5 * 0, -Math.cos(a) * w);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < ring; j++) { const a = i * (ring + 1) + j, b = a + ring + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  addColor(g, kind === 'dragon' ? '#a83a1a' : '#4a5a5a');
  const parts = [g];
  if (kind === 'dragon') {
    const head = addColor(taperTube([new V3(L / 2 - 0.3, 0.1, 0), new V3(L / 2 + 0.4, 0.6, 0), new V3(L / 2 + 0.5, 1.4, 0), new V3(L / 2 + 0.9, 1.6, 0)], (t) => 0.28 * (1 - 0.5 * t), 6, 8), '#e0a020');
    const tail = addColor(taperTube([new V3(-L / 2 + 0.3, 0.1, 0), new V3(-L / 2 - 0.3, 0.6, 0), new V3(-L / 2 - 0.2, 1.3, 0)], (t) => 0.2 * (1 - 0.8 * t), 5, 6), '#e0a020');
    const cabin = addColor(boxUV(5, 1.4, 1.2), '#c84a20'); cabin.translate(0, 0.7, 0);
    const roof = addColor(boxUV(5.6, 0.12, 1.6), '#e0b040'); roof.translate(0, 1.45, 0);
    parts.push(head, tail, cabin, roof);
  } else {
    // người chèo với nón lá
    const body = addColor(new THREE.CylinderGeometry(0.16, 0.22, 0.7, 6), '#3a4a6a'); body.translate(-1.6, 0.35, 0);
    const hat = addColor(new THREE.ConeGeometry(0.32, 0.2, 10), '#e8dcb0'); hat.translate(-1.6, 0.85, 0);
    const p2 = addColor(new THREE.CylinderGeometry(0.15, 0.2, 0.5, 6), '#8a2a2a'); p2.translate(0.8, 0.25, 0);
    const hat2 = addColor(new THREE.ConeGeometry(0.3, 0.18, 10), '#e8dcb0'); hat2.translate(0.8, 0.6, 0);
    parts.push(body, hat, p2, hat2);
  }
  parts.forEach((p) => { if (!p.attributes.uv) p.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(p.attributes.position.count * 2), 2)); });
  return merge(parts);
}

/* =====================================================================
   KIẾN TRÚC: mái cong đao, điện, tháp, cổng tam quan, chùa Khmer
   ===================================================================== */
// mái chồng diêm / mái 4 mái có đầu đao cong vút. Gốc ở tâm diềm mái (y = 0).
function hipRoof(env, o) {
  const g = new THREE.Group();
  const { w, d, h } = o;
  const s = o.scale ?? Math.min(w, d) / 7;
  const lift = o.lift ?? s * 0.75, flare = o.flare ?? s * 0.45;
  const rl = Math.max(0.001, (o.ridge ?? Math.max(w - d * 0.95, w * 0.22)) / 2);
  const vMax = o.vMax ?? 1, thick = o.thick ?? Math.max(0.12, s * 0.16);
  const hw = w / 2, hd = d / 2, segU = o.segU ?? 18, segV = 9;
  const span = Math.min(hw, hd) * 1.05;
  const prof = (v) => v * (0.55 + 0.45 * v);
  const eave = (x, z, t, sx, sz) => { const k = Math.pow(t, 3); return new V3(x + sx * flare * k, lift * Math.pow(t, 2.2), z + sz * flare * k); };
  const tOf = (a, half) => Math.min(1, Math.max(0, (Math.abs(a) - (half - span)) / span));
  const sides = [
    { n: segU, E: (u) => { const x = lerp(-hw, hw, u); return eave(x, hd, tOf(x, hw), Math.sign(x), 1); }, R: (u) => new V3(lerp(-hw, hw, u) * (rl / hw), h, 0), L: w },
    { n: segU, E: (u) => { const x = lerp(hw, -hw, u); return eave(x, -hd, tOf(x, hw), Math.sign(x), -1); }, R: (u) => new V3(lerp(hw, -hw, u) * (rl / hw), h, 0), L: w },
    { n: Math.round(segU * Math.max(0.5, d / w)), E: (u) => { const z = lerp(hd, -hd, u); return eave(hw, z, tOf(z, hd), 1, Math.sign(z)); }, R: () => new V3(rl, h, 0), L: d },
    { n: Math.round(segU * Math.max(0.5, d / w)), E: (u) => { const z = lerp(-hd, hd, u); return eave(-hw, z, tOf(z, hd), -1, Math.sign(z)); }, R: () => new V3(-rl, h, 0), L: d },
  ];
  const top = { pos: [], uv: [], idx: [] }, bot = { pos: [], idx: [] };
  const P = (sd, u, v) => { const E = sd.E(u), R = sd.R(u); const k = v * vMax; return new V3(lerp(E.x, R.x, k), E.y + (R.y - E.y) * prof(k), lerp(E.z, R.z, k)); };
  for (const sd of sides) {
    const b0 = top.pos.length / 3, slope = Math.hypot(Math.min(hw, hd), h);
    for (let i = 0; i <= sd.n; i++) for (let j = 0; j <= segV; j++) {
      const p = P(sd, i / sd.n, j / segV);
      top.pos.push(p.x, p.y, p.z); top.uv.push(((i / sd.n) * sd.L) / 2, ((j / segV) * vMax * slope) / 2);
      bot.pos.push(p.x, p.y - thick, p.z);
    }
    for (let i = 0; i < sd.n; i++) for (let j = 0; j < segV; j++) {
      const a = b0 + i * (segV + 1) + j, b = a + segV + 1;
      top.idx.push(a, b, a + 1, b, b + 1, a + 1);
      bot.idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
    // diềm (fascia) nối mép trên/dưới
    for (let i = 0; i < sd.n; i++) {
      const a = b0 + i * (segV + 1), b = a + segV + 1, base = bot.pos.length / 3;
      for (const k of [a, b]) { bot.pos.push(top.pos[k * 3], top.pos[k * 3 + 1], top.pos[k * 3 + 2]); }
      for (const k of [a, b]) { bot.pos.push(top.pos[k * 3], top.pos[k * 3 + 1] - thick, top.pos[k * 3 + 2]); }
      bot.idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
    }
  }
  const tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.Float32BufferAttribute(top.pos, 3));
  tg.setAttribute('uv', new THREE.Float32BufferAttribute(top.uv, 2));
  tg.setIndex(top.idx); tg.computeVertexNormals();
  const bg = new THREE.BufferGeometry();
  bg.setAttribute('position', new THREE.Float32BufferAttribute(bot.pos, 3));
  bg.setIndex(bot.idx); bg.computeVertexNormals();
  const tileM = env.std('tile' + o.tile + (o.metal ? 'm' : ''), { map: tileTex(o.tile), roughness: o.metal ? 0.45 : 0.82, metalness: o.metal ? 0.65 : 0 });
  const underM = env.std('under' + (o.under || '#4a2a1a'), { color: o.under || '#4a2a1a', roughness: 0.9, side: THREE.DoubleSide });
  g.add(mesh(tg, tileM, { cast: true }), mesh(bg, underM, { cast: false }));
  // bờ nóc, bờ dải, đầu đao
  const ridgeM = env.std('ridge' + (o.ridgeCol || o.tile), { color: o.ridgeCol || shade(o.tile, 0.12), roughness: 0.7, metalness: o.metal ? 0.6 : 0 });
  const orn = [];
  const corners = [[sides[0], 1, 1, 1], [sides[0], 0, -1, 1], [sides[1], 0, 1, -1], [sides[1], 1, -1, -1]];
  for (const [sd, ue, sx, sz] of corners) {
    const pts = [];
    for (let j = 6; j >= 0; j--) { const p = P(sd, ue, j / 6); p.y += s * 0.07; pts.push(p); }
    const c = pts.at(-1), dg = new V3(sx, 0, sz).normalize();
    const cs = s * (o.curl ?? 0.85);
    pts.push(c.clone().addScaledVector(dg, 0.42 * cs).add(new V3(0, 0.16 * cs, 0)));
    pts.push(c.clone().addScaledVector(dg, 0.72 * cs).add(new V3(0, 0.55 * cs, 0)));
    pts.push(c.clone().addScaledVector(dg, 0.78 * cs).add(new V3(0, 0.9 * cs, 0)));
    pts.push(c.clone().addScaledVector(dg, 0.64 * cs).add(new V3(0, 1.02 * cs, 0)));
    const fr = 7 / pts.length;
    orn.push(taperTube(pts, (t) => s * (t < fr ? 0.1 : 0.1 * (1 - ((t - fr) / (1 - fr)) * 0.75)), 6, 30));
  }
  if (vMax >= 1) {
    if (rl > 0.3) {
      orn.push(place(boxUV(rl * 2 + s * 0.3, s * 0.3, s * 0.24), 0, h + s * 0.12, 0));
      for (const k of [-1, 1]) orn.push(taperTube([new V3(k * (rl - s * 0.1), h + s * 0.12, 0), new V3(k * (rl + s * 0.22), h + s * 0.3, 0), new V3(k * (rl + s * 0.3), h + s * 0.62, 0), new V3(k * (rl + s * 0.16), h + s * 0.8, 0)], (t) => s * 0.14 * (1 - 0.65 * t), 6, 14));
    }
    const ornament = o.ornament ?? 'dragon';
    if (ornament === 'dragon' && rl > 0.6) {
      const dl = Math.min(rl * 0.8, s * 2.6);
      for (const k of [-1, 1]) orn.push(taperTube([new V3(k * dl, h + s * 0.2, 0), new V3(k * dl * 0.75, h + s * 0.42, 0), new V3(k * dl * 0.5, h + s * 0.25, 0), new V3(k * dl * 0.28, h + s * 0.45, 0), new V3(k * s * 0.32, h + s * 0.5, 0)], (t) => s * 0.075 * (1 - 0.3 * t) * (t > 0.88 ? 1.5 : 1), 6, 24));
      orn.push(place(new THREE.SphereGeometry(s * 0.14, 12, 8), 0, h + s * 0.55, 0));
      for (let f = 0; f < 7; f++) { const a = (f / 7) * TAU; orn.push(place(new THREE.ConeGeometry(s * 0.035, s * 0.15, 5), Math.cos(a) * s * 0.19, h + s * 0.55 + Math.sin(a) * s * 0.19, 0, 0, 0, a - PI / 2)); }
    } else if (ornament !== 'none') {
      const pts = [[0.001, 0], [0.18, 0.04], [0.22, 0.2], [0.1, 0.38], [0.16, 0.55], [0.08, 0.75], [0.02, 0.95], [0.001, 1]].map(([r, y]) => new THREE.Vector2(r * s * 1.4, y * s * 1.4));
      const lg = new THREE.LatheGeometry(pts, 12); lg.translate(0, h + s * 0.15, 0); orn.push(lg);
    }
  }
  orn.forEach((x) => { if (x.attributes.uv === undefined) x.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(x.attributes.position.count * 2), 2)); });
  const ornGeo = mergeGeometries(orn.map((x) => (x.index ? x : x.toNonIndexed ? x : x)).map((x) => (x.index ? x.toNonIndexed() : x)), false);
  orn.forEach((x) => x.dispose());
  const om = mesh(ornGeo, o.ornMat || ridgeM, { cast: true });
  g.add(om);
  g.userData.topY = (R) => h; // tiện dụng
  return g;
}
// thân nhà: hộp với mặt tiền vẽ cửa
function hallBody(env, w, h, d, { front, side, back, top = '#3a2a20' }) {
  const mats = [side, side, env.std('roofcap' + top, { color: top }), env.std('roofcap' + top, { color: top }), front, back || side];
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
  m.position.y = h / 2; m.castShadow = true; m.receiveShadow = true;
  return m;
}
function texMat(env, key, tex, rx, ry, extra = {}) { return env.std(key + rx + 'x' + ry, { map: texRepeat(tex, rx, ry), roughness: 0.85, ...extra }); }
function stairs(env, width, rise, run, mat) {
  const n = Math.max(2, Math.round(rise / 0.17)), sh = rise / n, sd = run / n, list = [];
  for (let i = 0; i < n; i++) list.push(place(boxUV(width, sh * (i + 1), sd, 1), 0, (sh * (i + 1)) / 2, run - sd * (i + 0.5)));
  // trả về khối bậc đi lên theo hướng -z (bậc cao nhất ở z = 0)
  return mesh(merge(list), mat, { cast: true });
}
function columns(env, pts, h, r, color, base = true) {
  const list = [];
  for (const [x, z] of pts) {
    list.push(place(cylUV(r, r * 1.08, h, 12, 1), x, h / 2, z));
    if (base) list.push(place(cylUV(r * 1.5, r * 1.6, 0.25, 12, 1), x, 0.12, z));
  }
  return mesh(merge(list), env.std('col' + color, { color, roughness: 0.45 }), { cast: true });
}
function balustrade(env, path, h = 0.8, color = '#a8a090', closed = false) {
  const list = [];
  const pts = closed ? [...path, path[0]] : path;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], L = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(x1 - x0, z1 - z0);
    const n = Math.max(1, Math.round(L / 1.6));
    for (let k = 0; k <= n; k++) list.push(place(boxUV(0.22, h, 0.22), lerp(x0, x1, k / n), h / 2, lerp(z0, z1, k / n)));
    list.push(place(boxUV(0.14, 0.14, L), (x0 + x1) / 2, h - 0.05, (z0 + z1) / 2, a));
    list.push(place(boxUV(0.1, 0.1, L), (x0 + x1) / 2, h * 0.35, (z0 + z1) / 2, a));
  }
  return mesh(merge(list), env.std('balu' + color, { color, map: stoneTex(color), roughness: 0.9 }), { cast: true });
}
// điện thờ kiểu Việt (một hoặc hai tầng mái)
function hall(env, o) {
  const g = new THREE.Group();
  const ph = o.plinth ?? 0.9, ver = o.ver ?? 1.6, over = o.over ?? 1.4;
  const pw = o.w + ver * 2 + 1.0, pd = o.d + ver * 2 + 1.0;
  const stoneM = texMat(env, 'plinth', stoneTex(o.stone || '#a49c8e'), 1, 1);
  if (ph > 0) {
    g.add(mesh(boxUV(pw, ph, pd, 2.5), stoneM, { pos: [0, ph / 2, 0], cast: true }));
    if (o.steps !== false) { const st = stairs(env, o.stepW || o.w * 0.4, ph, ph * 2.2, stoneM); st.position.set(0, 0, pd / 2); g.add(st); }
  }
  const body = new THREE.Group(); body.position.y = ph; g.add(body);
  const bays = o.bays || Math.max(3, Math.round(o.w / 3.2)) | 1;
  const ft = facadeTex({ bays, wall: o.wall, door: o.door, frame: o.frame, style: o.style || 'viet' });
  const st = facadeTex({ bays: Math.max(2, Math.round(o.d / 3.4)), wall: o.wall, door: o.door, frame: o.frame, style: o.sideStyle || o.style || 'viet' });
  const frontM = env.std(null, { map: ft, roughness: 0.8 }), sideM = env.std(null, { map: st, roughness: 0.8 });
  body.add(hallBody(env, o.w, o.h, o.d, { front: frontM, side: sideM, back: sideM }));
  // cột hiên
  const cx = o.w / 2 + ver * 0.75, cz = o.d / 2 + ver * 0.75, pts = [];
  const nx = Math.max(2, bays + 1), nzc = Math.max(2, Math.round(o.d / 3.2) + 1);
  for (let i = 0; i < nx; i++) { const x = lerp(-cx, cx, i / (nx - 1)); pts.push([x, cz], [x, -cz]); }
  for (let i = 1; i < nzc - 1; i++) { const z = lerp(-cz, cz, i / (nzc - 1)); pts.push([cx, z], [-cx, z]); }
  body.add(columns(env, pts, o.h + 0.3, o.colR || 0.24, o.col || '#8a2a18'));
  // xà đầu cột
  const beamM = env.std('beam' + (o.under || '#4a2a1a'), { color: o.under || '#4a2a1a', roughness: 0.85 });
  body.add(mesh(merge([place(boxUV(cx * 2 + 0.6, 0.35, 0.3), 0, o.h + 0.2, cz), place(boxUV(cx * 2 + 0.6, 0.35, 0.3), 0, o.h + 0.2, -cz), place(boxUV(0.3, 0.35, cz * 2 + 0.6), cx, o.h + 0.2, 0), place(boxUV(0.3, 0.35, cz * 2 + 0.6), -cx, o.h + 0.2, 0)]), beamM));
  // mái
  const rw = cx * 2 + over * 2, rd = cz * 2 + over * 2, rh = o.roofH ?? rd * 0.42;
  const roofCfg = { tile: o.tile || '#7a3a24', ridgeCol: o.ridgeCol, under: o.under, metal: o.metal, ornament: o.ornament, ornMat: o.ornMat };
  const eaveY = o.h + 0.35;
  if ((o.tiers || 1) >= 2) {
    const lower = hipRoof(env, { ...roofCfg, w: rw, d: rd, h: rh, vMax: 0.42 });
    lower.position.y = eaveY; body.add(lower);
    const yb = eaveY + rh * 0.42 * (0.55 + 0.45 * 0.42) - 0.1, bandH = o.bandH ?? Math.max(1.2, o.h * 0.32);
    const iw = lerp(rw / 2, Math.max(0.001, (rw - rd * 0.95) / 2), 0.42) * 2 * 0.9, idd = rd * 0.58 * 0.9;
    const band = new THREE.Mesh(boxUV(iw, bandH, idd, 1.5), texMat(env, 'band' + o.wall, plasterTex(o.bandCol || o.wall), 1, 1));
    band.position.y = yb + bandH / 2; band.castShadow = true; body.add(band);
    const upper = hipRoof(env, { ...roofCfg, w: iw + over * 2.2, d: idd + over * 2.2, h: rh * 0.72 });
    upper.position.y = yb + bandH; body.add(upper);
    g.userData.top = ph + yb + bandH + rh * 0.72;
  } else {
    const roof = hipRoof(env, { ...roofCfg, w: rw, d: rd, h: rh });
    roof.position.y = eaveY; body.add(roof);
    g.userData.top = ph + eaveY + rh;
  }
  g.userData.plinth = ph; g.userData.pd = pd; g.userData.pw = pw;
  return g;
}
// tháp nhiều tầng (lục giác / bát giác / vuông)
function tieredTower(env, o) {
  const g = new THREE.Group();
  const { sides, tiers } = o;
  let y = 0;
  const faceM = (r, h) => env.std(null, { map: texRepeat(towerFaceTex(o.face || 'brick', o.color), sides, 1), roughness: 0.85 });
  const corniceM = env.std('cornice' + o.cornice, { color: o.cornice, map: plasterTex(o.cornice), roughness: 0.85 });
  if (o.base) {
    g.add(mesh(cylUV(o.r0 * 1.6, o.r0 * 1.75, o.base, sides, 1), texMat(env, 'tbase', stoneTex('#a8a090'), 1, 1), { pos: [0, o.base / 2, 0], rot: [0, PI / sides, 0], cast: true }));
    y = o.base;
  }
  for (let i = 0; i < tiers; i++) {
    const t = tiers > 1 ? i / (tiers - 1) : 0;
    const r = lerp(o.r0, o.rTop, t), h = i === 0 ? o.h0 : o.hTier * (1 - t * (o.hShrink ?? 0.25));
    const body = mesh(new THREE.CylinderGeometry(r * 0.97, r, h, sides, 1), faceM(r, h), { pos: [0, y + h / 2, 0], rot: [0, PI / sides, 0], cast: true });
    g.add(body);
    y += h;
    if (o.roof === 'curved') {
      const rf = hipRoof(env, { w: r * 2.9, d: r * 2.9, h: r * 0.75, tile: o.tile, ridge: 0.01, ornament: 'none', scale: r * 0.42, under: o.under });
      rf.position.y = y; g.add(rf);
      y += r * 0.5;
    } else {
      g.add(mesh(new THREE.CylinderGeometry(r * 1.2, r * 1.0, h * 0.14, sides, 1), corniceM, { pos: [0, y + h * 0.07, 0], rot: [0, PI / sides, 0], cast: true }));
      g.add(mesh(new THREE.CylinderGeometry(r * 1.05, r * 1.2, h * 0.08, sides, 1), corniceM, { pos: [0, y + h * 0.18, 0], rot: [0, PI / sides, 0], cast: true }));
      y += h * 0.22;
    }
  }
  // chóp
  const finM = env.std('finial' + (o.finial || '#c8a040'), { color: o.finial || '#c8a040', metalness: 0.7, roughness: 0.35 });
  const fh = o.finialH ?? o.rTop * 2.4;
  const pts = [[0.001, 0], [0.5, 0], [0.55, 0.1], [0.3, 0.2], [0.42, 0.32], [0.2, 0.45], [0.28, 0.55], [0.1, 0.7], [0.06, 0.9], [0.001, 1]].map(([r, yy]) => new THREE.Vector2(r * o.rTop * 1.2, yy * fh));
  g.add(mesh(new THREE.LatheGeometry(pts, 12), finM, { pos: [0, y, 0], cast: true }));
  g.userData.height = y + fh;
  return g;
}
// cổng tam quan
function gate(env, o) {
  const g = new THREE.Group();
  const wallM = texMat(env, 'gatewall' + o.wall, plasterTex(o.wall), 0.5, 0.5);
  const darkM = env.std('gatedark', { color: '#1a120c', roughness: 1 });
  const parts = [[0, o.w || 4.4, o.h || 5.2, 1], [-1, (o.w || 4.4) * 0.72, (o.h || 5.2) * 0.75, 0.8], [1, (o.w || 4.4) * 0.72, (o.h || 5.2) * 0.75, 0.8]];
  let x = 0;
  for (const [k, w, h, s] of parts) {
    const cxp = k === 0 ? 0 : k * ((o.w || 4.4) / 2 + w / 2 + 0.1);
    const blk = mesh(boxUV(w, h, 2.4, 1.5), wallM, { pos: [cxp, h / 2, 0], cast: true });
    g.add(blk);
    g.add(mesh(new THREE.PlaneGeometry(w * 0.5, h * 0.62), darkM, { pos: [cxp, h * 0.31, 1.21] }));
    g.add(mesh(new THREE.CircleGeometry(w * 0.25, 16, 0, PI), darkM, { pos: [cxp, h * 0.62, 1.21] }));
    const rf = hipRoof(env, { w: w + 1.6, d: 3.6, h: 1.4 * s, tile: o.tile, ornament: k === 0 ? 'dragon' : 'none', under: o.under, scale: 0.6 * s });
    rf.position.set(cxp, h, 0); g.add(rf);
  }
  return g;
}
// mái Khmer: nhiều lớp mái dốc, chóp naga
function khmerRoof(env, o) {
  const g = new THREE.Group();
  const tileM = env.std('ktile', { map: texRepeat(tileTex('#d8641c'), 1, 1), roughness: 0.6 });
  const trimM = env.std('ktrim', { color: '#f0b838', metalness: 0.75, roughness: 0.3 });
  const pedM = env.std('kped', { map: pedimentTex(), metalness: 0.5, roughness: 0.45, side: THREE.DoubleSide });
  const underM = env.std('kunder', { color: '#6a2a10', side: THREE.DoubleSide });
  const trims = [];
  const gable = (len, span, hgt, y0, z0) => {
    const segL = 2, segV = 8, pos = [], uv = [], idx = [];
    for (const sd of [-1, 1]) {
      const b0 = pos.length / 3;
      for (let i = 0; i <= segL; i++) for (let j = 0; j <= segV; j++) {
        const v = j / segV, z = z0 + lerp(-len / 2, len / 2, i / segL);
        const x = sd * (span / 2) * (1 - v), y = y0 + hgt * (v * (0.7 + 0.3 * v));
        pos.push(x, y, z); uv.push((z / 2) * 1, (v * Math.hypot(span / 2, hgt)) / 2);
      }
      for (let i = 0; i < segL; i++) for (let j = 0; j < segV; j++) {
        const a = b0 + i * (segV + 1) + j, b = a + segV + 1;
        if (sd > 0) idx.push(a, a + 1, b, b, a + 1, b + 1); else idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    gg.setIndex(idx); gg.computeVertexNormals();
    g.add(mesh(gg, tileM, { cast: true }));
    const ug = gg.clone(); ug.translate(0, -0.15, 0); g.add(mesh(ug, underM));
    for (const ez of [-1, 1]) {
      const zz = z0 + ez * len / 2;
      // tam giác đầu hồi
      const sh = new THREE.Shape(); sh.moveTo(-span / 2 * 0.92, 0); sh.lineTo(span / 2 * 0.92, 0); sh.lineTo(0, hgt * 0.95); sh.closePath();
      const pg = new THREE.ShapeGeometry(sh); pg.translate(0, y0, zz - ez * 0.15);
      const puv = pg.attributes.uv; for (let i = 0; i < puv.count; i++) puv.setXY(i, puv.getX(i) / span + 0.5, puv.getY(i) / hgt);
      g.add(mesh(pg, pedM));
      // viền rắn naga dọc mái hồi + đầu naga cong ở chân + sừng chovea ở đỉnh
      for (const sd of [-1, 1]) {
        const pts = [];
        for (let k = 0; k <= 6; k++) { const v = k / 6; pts.push(new V3(sd * (span / 2) * (1 - v), y0 + hgt * (v * (0.7 + 0.3 * v)) + 0.12, zz)); }
        pts.reverse();
        const foot = pts.at(-1);
        pts.push(foot.clone().add(new V3(sd * 0.5, 0.2, 0)), foot.clone().add(new V3(sd * 0.75, 0.75, 0)), foot.clone().add(new V3(sd * 0.55, 1.05, 0)));
        trims.push(taperTube(pts, (t) => (t < 0.7 ? 0.13 : 0.13 * (1 - (t - 0.7) * 2.2)), 5, 24));
      }
      const apex = new V3(0, y0 + hgt + 0.1, zz);
      trims.push(taperTube([apex, apex.clone().add(new V3(0, 0.6, ez * 0.25)), apex.clone().add(new V3(0, 1.4, ez * 0.1)), apex.clone().add(new V3(0, 2.1, ez * 0.45))], (t) => 0.16 * (1 - t * 0.85), 6, 14));
    }
    trims.push(taperTube([new V3(0, y0 + hgt + 0.08, z0 - len / 2), new V3(0, y0 + hgt + 0.08, z0 + len / 2)], () => 0.12, 6, 2));
  };
  const { w, d, y } = o;
  const H = w * 0.62;
  gable(d * 0.5, w * 0.78, H, y + 1.6, 0);
  for (const ez of [-1, 1]) gable(d * 0.24, w * 0.9, H * 0.86, y + 0.7, ez * d * 0.36);
  for (const ez of [-1, 1]) gable(d * 0.18, w * 1.0, H * 0.72, y - 0.1, ez * d * 0.53);
  // mái hiên hai bên
  const skM = env.std('ktileD', { map: tileTex('#d8641c'), roughness: 0.6, side: THREE.DoubleSide });
  for (const sd of [-1, 1]) {
    const x0 = sd * w * 0.36, x1 = sd * w * 0.62, y0 = y + 1.0, y1 = y - 0.35, z0 = -d * 0.55, z1 = d * 0.55;
    const pos = [x0, y0, z0, x0, y0, z1, x1, y1, z0, x1, y1, z1];
    const sl = Math.hypot(x1 - x0, y1 - y0) / 2;
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    gg.setAttribute('uv', new THREE.Float32BufferAttribute([z0 / 2, sl, z1 / 2, sl, z0 / 2, 0, z1 / 2, 0], 2));
    gg.setIndex(sd > 0 ? [0, 1, 2, 2, 1, 3] : [0, 2, 1, 2, 3, 1]); gg.computeVertexNormals();
    g.add(mesh(gg, skM, { cast: true }));
  }
  trims.forEach((t) => t.deleteAttribute('uv'));
  g.add(mesh(mergeGeometries(trims, false), trimM, { cast: true }));
  trims.forEach((t) => t.dispose());
  return g;
}
function khmerHall(env, o) {
  const g = new THREE.Group();
  const ph = o.plinth ?? 1.8;
  const baseM = texMat(env, 'kbase', plasterTex('#efe6d2'), 1, 1);
  g.add(mesh(boxUV(o.w + 4, ph, o.d + 4, 2), baseM, { pos: [0, ph / 2, 0], cast: true }));
  g.add(mesh(boxUV(o.w + 4.3, 0.18, o.d + 4.3), env.std('ktrim', { color: '#f0b838', metalness: 0.75, roughness: 0.3 }), { pos: [0, ph, 0] }));
  const st = stairs(env, 3.2, ph, ph * 2, baseM); st.position.set(0, 0, (o.d + 4) / 2); g.add(st);
  // lan can rắn naga hai bên bậc
  const nagaM = env.std('naga', { color: '#2f8a5a', metalness: 0.4, roughness: 0.4 });
  for (const sd of [-1, 1]) {
    const z0 = (o.d + 4) / 2, z1 = z0 + ph * 2;
    const pts = [new V3(sd * 1.8, ph + 0.5, z0 - 0.2), new V3(sd * 1.8, ph * 0.55 + 0.5, (z0 + z1) / 2), new V3(sd * 1.8, 0.6, z1), new V3(sd * 1.8, 1.3, z1 + 0.4), new V3(sd * 1.8, 2.0, z1 + 0.2)];
    g.add(mesh(taperTube(pts, (t) => 0.18 * (t > 0.75 ? 1.5 : 1), 7, 24), nagaM, { cast: true }));
    g.add(mesh(new THREE.SphereGeometry(0.5, 10, 8, 0, PI), env.std('ktrim', {}), { pos: [sd * 1.8, 2.1, z1 + 0.15], scale: [1, 1.3, 0.4] }));
  }
  const body = new THREE.Group(); body.position.y = ph; g.add(body);
  const ft = facadeTex({ bays: 3, wall: '#f2d9a0', style: 'khmer' }), stx = facadeTex({ bays: Math.round(o.d / 3), wall: '#f2d9a0', style: 'khmer' });
  body.add(hallBody(env, o.w, o.h, o.d, { front: env.std(null, { map: ft }), side: env.std(null, { map: stx }), back: env.std(null, { map: ft }) }));
  const pts = [];
  const cx = o.w / 2 + 1.2, cz = o.d / 2 + 1.2;
  for (let i = 0; i < 4; i++) { const x = lerp(-cx, cx, i / 3); pts.push([x, cz], [x, -cz]); }
  for (let i = 1; i < Math.round(o.d / 3); i++) { const z = lerp(-cz, cz, i / Math.round(o.d / 3)); pts.push([cx, z], [-cx, z]); }
  body.add(columns(env, pts, o.h, 0.26, '#f4e2b0'));
  const rf = khmerRoof(env, { w: o.w + 3.4, d: o.d + 3.6, y: o.h });
  body.add(rf);
  g.userData.top = ph + o.h + (o.w + 3.4) * 0.62 + 3.5;
  return g;
}
function khmerStupa(env, s = 1) {
  const g = new THREE.Group();
  const wm = texMat(env, 'kstupa', plasterTex('#f0e8d8'), 1, 1), gm = env.std('ktrim', { color: '#f0b838', metalness: 0.75, roughness: 0.3 });
  let y = 0;
  for (let i = 0; i < 3; i++) { const w = (3 - i * 0.7) * s, h = 0.7 * s; g.add(mesh(boxUV(w, h, w), wm, { pos: [0, y + h / 2, 0], cast: true })); y += h; }
  const bell = [[0.001, 0], [0.9, 0], [1.0, 0.25], [0.85, 0.55], [0.5, 0.75], [0.3, 0.85], [0.25, 1.0]].map(([r, yy]) => new THREE.Vector2(r * s, yy * 2 * s));
  g.add(mesh(new THREE.LatheGeometry(bell, 16), wm, { pos: [0, y, 0], cast: true })); y += 2 * s;
  const spire = [[0.25, 0], [0.3, 0.1], [0.15, 0.3], [0.2, 0.4], [0.08, 0.6], [0.1, 0.7], [0.02, 0.95], [0.001, 1]].map(([r, yy]) => new THREE.Vector2(r * s, yy * 3 * s));
  g.add(mesh(new THREE.LatheGeometry(spire, 12), gm, { pos: [0, y, 0], cast: true }));
  return g;
}
function boundaryWall(env, pts, h = 2.2, color = '#d8c8a8', tile = '#7a3a24', closed = true) {
  const list = [], caps = [];
  const P = closed ? [...pts, pts[0]] : pts;
  for (let i = 0; i < P.length - 1; i++) {
    const [x0, z0] = P[i], [x1, z1] = P[i + 1], L = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(x1 - x0, z1 - z0);
    list.push(place(boxUV(0.4, h, L, 1.5), (x0 + x1) / 2, h / 2, (z0 + z1) / 2, a));
    caps.push(place(boxUV(0.9, 0.18, L + 0.4, 1), (x0 + x1) / 2, h + 0.06, (z0 + z1) / 2, a));
  }
  const g = new THREE.Group();
  g.add(mesh(merge(list), texMat(env, 'bwall' + color, plasterTex(color), 1, 1)));
  g.add(mesh(merge(caps), env.std('tile' + tile + 'cap', { map: tileTex(tile), roughness: 0.8 })));
  return g;
}

/* =====================================================================
   THÀNH PHẦN CẢNH CHUNG
   ===================================================================== */
function treeline(env, { rc, width = 30, H = 14, seed = 1, color = '#2c4222', arc }) {
  const m = polarTerrain(env, {
    r0: rc, r1: rc + width, lin: true, segR: 5, segA: env.hq ? 420 : 240, detail: 0.08,
    h: (x, z, r, a) => {
      const t = (r - rc) / width, bell = Math.sin(PI * t) ** 0.6;
      let k = 1;
      if (arc) { const d = Math.atan2(Math.sin(a - arc[0]), Math.cos(a - arc[0])); k = smooth(arc[1], arc[1] * 0.7, Math.abs(d)); }
      return H * k * bell * (0.55 + 0.3 * (nz(Math.cos(a) * 30, Math.sin(a) * 30, seed) * 0.5 + 0.5) + 0.25 * Math.abs(nz(Math.cos(a) * 90, Math.sin(a) * 90, seed + 3))) - 2;
    },
    col: (t, x, y) => t.set(color).lerp(C('#4a6232'), Math.max(0, nz(x * 0.05, y * 0.2, seed) * 0.6)),
  });
  return m;
}
function cityBlocks(env, { n = 30, r0 = 200, r1 = 450, seed = 3, arc = null, hmin = 8, hmax = 40 }) {
  const R = mulberry(seed), geo = boxUV(1, 1, 1, 0.12);
  geo.translate(0, 0.5, 0);
  const im = new THREE.InstancedMesh(geo, env.std('city', { map: plasterTex('#e8e2d6'), roughness: 0.9 }), n);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
  const pal = ['#c8c0b0', '#b8b4ac', '#d0c6b8', '#a8acb0', '#c0b0a0', '#98a4a8', '#d2cab8'];
  for (let i = 0; i < n; i++) {
    const a = arc ? lerp(arc[0], arc[1], R()) : R() * TAU, r = lerp(r0, r1, R());
    q.setFromEuler(new THREE.Euler(0, a + (R() - 0.5) * 0.3, 0));
    const h = lerp(hmin, hmax, R() ** 2);
    m4.compose(new V3(Math.sin(a) * r, -1, Math.cos(a) * r), q, new V3(lerp(10, 26, R()), h, lerp(10, 22, R())));
    im.setMatrixAt(i, m4); im.setColorAt(i, col.set(pal[(R() * pal.length) | 0]));
  }
  return im;
}
function paving(env, w, d, y, color = '#a49c8e', key = 'pave') {
  const geo = new THREE.PlaneGeometry(w, d); geo.rotateX(-PI / 2);
  const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / 3, (uv.getY(i) * d) / 3);
  return mesh(geo, env.std(key + color, { map: stoneTex(color), roughness: 0.9 }), { pos: [0, y, 0] });
}
// lưới mặt núi đá (vách) có lỗ cửa động hình elip ở (cx, cy), mặt hướng +z
function cliffFace(env, { cx = 0, cy = 3.4, rx = 5.2, ry = 4.6, z0 = 0, ext = 95, top = 70, bottom = -50, lean = 0.25, foot = 0.55, seed = 4, curve = 0 }) {
  const segA = env.hq ? 120 : 72, segR = env.hq ? 46 : 30, K = ext / Math.max(rx, ry);
  const pos = [], idx = [], uv = [];
  for (let i = 0; i <= segR; i++) {
    const t = i / segR, k = 1 + Math.pow(t, 1.7) * K;
    for (let j = 0; j <= segA; j++) {
      const a = (j / segA) * TAU;
      const x = cx + Math.cos(a) * rx * k * (1 + 0.08 * nz(a * 2, seed) * Math.min(1, t * 6));
      let y = cy + Math.sin(a) * ry * k * (1 + 0.08 * nz(a * 3, seed + 1) * Math.min(1, t * 6));
      y = Math.min(top + nz(x * 0.03, seed) * 12, Math.max(bottom, y));
      const amp = 0.25 + Math.min(1, t * 3) * 5;
      let z = z0 + amp * 1.5 * fbm(x * 0.05, y * 0.05, 4, seed) - Math.max(0, y - cy - ry) * lean + Math.max(0, -y) * foot - x * x * curve;
      z += 0.6 * nz(x * 0.4, y * 0.4, seed + 2) * Math.min(1, t * 4);
      pos.push(x, y, z); uv.push(x / 6, y / 6);
    }
  }
  for (let i = 0; i < segR; i++) for (let j = 0; j < segA; j++) {
    const a = i * (segA + 1) + j, b = a + segA + 1;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const P = g.attributes.position, N = g.attributes.normal, cols = new Float32Array(P.count * 3), c = new THREE.Color();
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), zz = P.getZ(i), ny = N.getY(i);
    c.set('#8a867a').lerp(C('#5e5a50'), nz(x * 0.2, y * 0.6, seed) * 0.5 + 0.5);
    const veg = ny * 2.4 + nz(x * 0.06, y * 0.06, seed + 7) * 1.5 + 0.15;
    c.lerp(C('#3c5a28'), smooth(0.0, 0.6, veg)).lerp(C('#56743a'), smooth(0.8, 1.4, veg) * 0.5);
    if (Math.hypot((x - cx) / rx, (y - cy) / ry) < 1.6) c.multiplyScalar(0.75);
    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return mesh(g, env.std('cliff', { vertexColors: true, map: detailTex('rock'), roughness: 1, side: THREE.DoubleSide }, { detail: 0.12 }), { cast: false });
}
const CAVE_MOUTH = { cy: 3.4, rx: 5.2, ry: 4.6, zOff: 2.6 };

function boats(env, kind, n, pathFn, y, speed = 0.01, seed = 9) {
  const geo = boatGeo(kind), R = mulberry(seed);
  const mat = env.std('boat' + kind, { vertexColors: true, roughness: 0.75, side: THREE.DoubleSide });
  const list = [];
  const grp = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const b = mesh(geo, mat, { cast: false });
    b.userData = { t: R(), sp: speed * (0.6 + R() * 0.8) * (R() < 0.5 ? -1 : 1), off: (R() - 0.5) };
    grp.add(b); list.push(b);
  }
  grp.userData.update = (dt, time) => {
    for (const b of list) {
      const u = b.userData; u.t = (u.t + u.sp * dt + 1) % 1;
      const p = pathFn(u.t, u.off), p2 = pathFn((u.t + 0.002 * Math.sign(u.sp) + 1) % 1, u.off);
      b.position.set(p.x, y + Math.sin(time * 1.6 + u.off * 9) * 0.04, p.z);
      b.rotation.y = Math.atan2(p2.x - p.x, p2.z - p.z) - PI / 2;
      b.rotation.z = Math.sin(time * 1.3 + u.off * 5) * 0.03;
    }
  };
  return grp;
}

// vỏ ngoài chánh điện (nền, hiên, mái) khi ngồi bên trong nhìn ra
const HALL_STYLE = {
  wood: { outer: '#d6c6a4', tile: '#7a4a32', under: '#3a2216', col: '#7a2a18' },
  lacquer: { outer: '#a8402a', tile: '#8a5a32', under: '#4a1a10', col: '#a3261a', ridge: '#c89a50' },
  bronze: { outer: '#7a5a2e', tile: '#8a6a3a', under: '#4a3820', col: '#8a6a34', metal: true },
  plaster: { outer: '#efe6d2', tile: '#8a4a2e', under: '#5a4030', col: '#a8503a' },
  khmer: { outer: '#f2d9a0', tile: '#d8641c', under: '#6a2a10', col: '#f0c050' },
};
function hallShell(c) {
  const { env, g, W, D, H, gy, theme } = c;
  const st = { ...(HALL_STYLE[theme.wall] || HALL_STYLE.wood), ...(theme.hallStyle || {}) }, T = 0.4, hw = W / 2, hd = D / 2;
  const stoneM = texMat(env, 'plinth', stoneTex('#a49c8e'), 1, 1);
  if (gy < -0.05 && theme.view !== 'pond') {
    const pw = W + 2 * T + 4, pd = D + 2 * T + 4;
    g.add(mesh(boxUV(pw, -gy, pd, 2.5), stoneM, { pos: [0, gy / 2 - 0.02, 0], cast: true }));
    const s = stairs(env, Math.min(8, W * 0.4), -gy, -gy * 2.4, stoneM); s.position.set(0, gy, pd / 2); g.add(s);
  }
  // hàng cột hiên trước + xà
  const cz = hd + T + 1.5, n = Math.max(4, Math.round(W / 3.4));
  const pts = []; for (let i = 0; i <= n; i++) pts.push([lerp(-hw - T - 1.5, hw + T + 1.5, i / n), cz]);
  for (let i = 1; i < Math.max(2, Math.round(D / 4)); i++) { const z = lerp(cz, -hd - T - 1.5, i / Math.max(2, Math.round(D / 4))); pts.push([hw + T + 1.5, z], [-hw - T - 1.5, z]); }
  pts.push([hw + T + 1.5, -hd - T - 1.5], [-hw - T - 1.5, -hd - T - 1.5]);
  if (theme.view !== 'pond') g.add(columns(env, pts, H + 0.4, 0.26, st.col));
  if (theme.wall === 'khmer') {
    g.add(khmerRoof(env, { w: W + 2 * T + 3.2, d: D + 2 * T + 3.2, y: H + 0.25 }));
  } else {
    const over = theme.view === 'pond' ? 2.0 : 3.2;
    const rf = hipRoof(env, { w: W + 2 * T + over * 2, d: D + 2 * T + over * 2, h: Math.min(D, W) * 0.36 + 2, tile: st.tile, under: st.under, metal: st.metal, ridgeCol: st.ridge, scale: Math.max(1.2, Math.min(W, D) / 9) });
    rf.position.y = H + 0.4; g.add(rf);
  }
  // xà viền đỡ mái
  const beam = env.std('beam' + st.under, { color: st.under, roughness: 0.85 });
  const bw = W + 2 * T + 3, bd = D + 2 * T + 3;
  g.add(mesh(merge([place(boxUV(bw, 0.45, 0.35), 0, H + 0.2, bd / 2), place(boxUV(bw, 0.45, 0.35), 0, H + 0.2, -bd / 2), place(boxUV(0.35, 0.45, bd), bw / 2, H + 0.2, 0), place(boxUV(0.35, 0.45, bd), -bw / 2, H + 0.2, 0)]), beam));
  // trần hiên (che phần giữa mái và tường)
  const ceil = new THREE.PlaneGeometry(bw, bd); ceil.rotateX(PI / 2);
  g.add(mesh(ceil, env.std('soffit' + st.under, { color: st.under, side: THREE.DoubleSide }), { pos: [0, H + 0.05, 0] }));
  return st;
}

/* =====================================================================
   CÁC CẢNH THEO "view"
   ===================================================================== */
const VIEWS = {};

/* ---------- Hồ sen vuông – Chùa Một Cột ---------- */
VIEWS.pond = (c) => {
  const { env, g, I } = c;
  const hw = I ? c.W / 2 : 0, hd = I ? c.D / 2 : 0;
  const wy = I ? -3.2 : -0.5, rimY = I ? -2.4 : 0.25;
  const P = I ? Math.max(hw, hd) + 12 : 7.5, yard = P + (I ? 16 : 10);
  g.add(makeWater(env, new THREE.PlaneGeometry(P * 2, P * 2), { y: wy, deep: '#24402c', wave: 0.3, scale: 1.4 }));
  const stoneM = texMat(env, 'pondrim', stoneTex('#9a9284'), 1, 1);
  const rh = rimY + 0.15 - (wy - 1.2), ry = (rimY + 0.15 + wy - 1.2) / 2, rim = [];
  for (const s of [-1, 1]) { rim.push(place(boxUV(P * 2 + 1.6, rh, 0.8, 1.5), 0, ry, s * (P + 0.4)), place(boxUV(0.8, rh, P * 2, 1.5), s * (P + 0.4), ry, 0)); }
  g.add(mesh(merge(rim), stoneM));
  const bal = balustrade(env, [[1.8, P + 0.4], [P + 0.4, P + 0.4], [P + 0.4, -P - 0.4], [-P - 0.4, -P - 0.4], [-P - 0.4, P + 0.4], [-1.8, P + 0.4]], 0.75, '#b0a898');
  bal.position.y = rimY + 0.15; g.add(bal);
  const sh = new THREE.Shape([[-yard, -yard], [yard, -yard], [yard, yard], [-yard, yard]].map(([x, y]) => new THREE.Vector2(x, y)));
  const q = P + 0.79; sh.holes.push(new THREE.Path([[-q, -q], [-q, q], [q, q], [q, -q]].map(([x, y]) => new THREE.Vector2(x, y))));
  const yg = new THREE.ShapeGeometry(sh); yg.rotateX(-PI / 2);
  const yuv = yg.attributes.uv; for (let i = 0; i < yuv.count; i++) yuv.setXY(i, yuv.getX(i) / 3, yuv.getY(i) / 3);
  g.add(mesh(yg, env.std('brickyard', { map: brickTex('#9a5a40'), roughness: 0.95 }), { pos: [0, rimY + 0.14, 0] }));
  // sen
  const R = mulberry(21), lot = [];
  const nL = (env.hq ? 1 : 0.55) * (I ? 520 : 170);
  for (let i = 0; i < nL; i++) {
    const x = (R() * 2 - 1) * (P - 0.8), z = (R() * 2 - 1) * (P - 0.8);
    if (I && Math.abs(x) < hw + 2.2 && Math.abs(z) < hd + 2.2) continue;
    if (!I && (Math.hypot(x, z) < 2.6 || (Math.abs(x) < 1.6 && z > 0))) continue;
    if (I && Math.abs(x) < 1.8 && z > 0) continue;
    if (nz(x * 0.15, z * 0.15, 3) < -0.25) continue;
    lot.push({ x, z, s: 0.35 + R() * 0.45 });
  }
  g.add(lotusPatch(env, lot, wy));
  const woodM = env.std('pwood', { map: woodTex('#5a2a18'), roughness: 0.7 });
  if (I) {
    // trụ đá & con sơn đỡ chánh điện
    g.add(mesh(cylUV(1.4, 1.6, -0.45 - wy + 1.2, 24, 1.5), texMat(env, 'pillar', stoneTex('#8e887c'), 1, 1), { pos: [0, (wy - 1.2 - 0.45) / 2, 0], cast: true }));
    const br = [];
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * TAU, ex = Math.max(-hw - 1.2, Math.min(hw + 1.2, Math.sin(a) * 30)), ez = Math.max(-hd - 1.2, Math.min(hd + 1.2, Math.cos(a) * 30));
      br.push(taperTube([new V3(Math.sin(a) * 1.3, -2.6, Math.cos(a) * 1.3), new V3(ex * 0.45, -1.1, ez * 0.45), new V3(ex * 0.85, -0.5, ez * 0.85)], (t) => 0.2 - 0.06 * t, 6, 8));
    }
    g.add(mesh(merge(br), woodM, { cast: true }));
    g.add(mesh(boxUV(c.W + 3.2, 0.45, c.D + 3.2, 1), woodM, { pos: [0, -0.24, 0], cast: true }));
    const dk = balustrade(env, [[1.6, hd + 1.5], [hw + 1.5, hd + 1.5], [hw + 1.5, -hd - 1.5], [-hw - 1.5, -hd - 1.5], [-hw - 1.5, hd + 1.5], [-1.6, hd + 1.5]], 0.85, '#6a2a18');
    g.add(dk);
    const s = stairs(env, 2.6, -rimY, P - hd - 1.6, stoneM); s.position.set(0, rimY + 0.14, hd + 1.6); g.add(s);
    // điện phụ hai bên + cổng
    for (const sd of [-1, 1]) {
      const h2 = hall(env, { w: 14, d: 7, h: 3.4, plinth: 0.6, wall: '#d8c8a4', door: '#6a2a16', frame: '#3a1a0e', tile: '#6a4a3a', under: '#3a2216' });
      h2.rotation.y = -sd * PI / 2; h2.position.set(sd * (P + 9), rimY + 0.14, -4); g.add(h2);
    }
    const gt = gate(env, { wall: '#d8c8a4', tile: '#6a4a3a', under: '#3a2216' }); gt.position.set(0, rimY + 0.14, yard - 1); g.add(gt);
  } else {
    // Chùa Một Cột: trụ đá, con sơn, đài vuông, mái cong
    const top = 3.3;
    g.add(mesh(cylUV(0.55, 0.62, top - wy + 0.6, 20, 1), texMat(env, 'pillar', stoneTex('#8e887c'), 1, 1), { pos: [0, (top + wy - 0.6) / 2, 0], cast: true }));
    const br = [];
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU + PI / 8;
      br.push(taperTube([new V3(Math.sin(a) * 0.5, 1.6, Math.cos(a) * 0.5), new V3(Math.sin(a) * 1.0, 2.6, Math.cos(a) * 1.0), new V3(Math.sin(a) * 1.75, top - 0.05, Math.cos(a) * 1.75)], (t) => 0.11 - 0.03 * t, 6, 8));
    }
    g.add(mesh(merge(br), woodM, { cast: true }));
    g.add(mesh(boxUV(4.0, 0.3, 4.0), woodM, { pos: [0, top + 0.15, 0], cast: true }));
    const bl = balustrade(env, [[0.7, 1.95], [1.95, 1.95], [1.95, -1.95], [-1.95, -1.95], [-1.95, 1.95], [-0.7, 1.95]], 0.5, '#7a2a18');
    bl.position.y = top + 0.3; g.add(bl);
    const pav = new THREE.Group(); pav.position.y = top + 0.3; g.add(pav);
    const fm = env.std(null, { map: facadeTex({ bays: 1, wall: '#7a2a18', door: '#8a3018', frame: '#4a1a0e' }) });
    pav.add(hallBody(env, 2.7, 2.1, 2.7, { front: fm, side: fm, back: fm }));
    pav.add(columns(env, [[1.5, 1.5], [-1.5, 1.5], [1.5, -1.5], [-1.5, -1.5]], 2.3, 0.12, '#8a2a18', false));
    const rf = hipRoof(env, { w: 5.2, d: 5.2, h: 1.7, ridge: 1.3, tile: '#6a5040', under: '#3a2216', scale: 0.62, curl: 1.15 });
    rf.position.y = 2.3; pav.add(rf);
    const s = stairs(env, 1.8, top + 0.3 - (rimY + 0.14), 8.5, stoneM); s.position.set(0, rimY + 0.14, 2.0); g.add(s);
    const h2 = hall(env, { w: 13, d: 7, h: 3.3, plinth: 0.6, wall: '#d8c8a4', door: '#6a2a16', frame: '#3a1a0e', tile: '#6a4a3a', under: '#3a2216' });
    h2.position.set(0, rimY + 0.14, -P - 9); g.add(h2);
    g.add(boundaryWall(env, [[-yard + 0.5, -yard + 0.5], [yard - 0.5, -yard + 0.5], [yard - 0.5, yard - 0.5], [3, yard - 0.5]], 1.8, '#d8c8a8', '#6a4a3a', false));
    g.add(boundaryWall(env, [[-3, yard - 0.5], [-yard + 0.5, yard - 0.5], [-yard + 0.5, -yard + 0.5]], 1.8, '#d8c8a8', '#6a4a3a', false));
    c.camera = { pos: [-10.5, 6.3, 14.5], target: [0, 3.6, 0] };
  }
  // mặt đất, cây, chân trời
  g.add(polarTerrain(env, {
    r0: yard * 0.97, r1: 900, segR: 50, segA: 200,
    h: (x, z, r) => rimY + 0.08 - 0.3 * smooth(yard, yard + 20, r) + ridge(Math.atan2(x, z), r, { rc: 520, width: 130, H: 38, freq: 1.4, seed: 2 }),
    col: (t, x, y, z, ny) => terrCol(t, y, ny, { grass: '#5e7a34', forest: '#3a5a28' }),
    mat: env.std('ground_pond', { vertexColors: true, map: detailTex('grass'), roughness: 1 }, { detail: 0.05 }),
  }));
  const blocked = (x, z) => (Math.abs(x) < P + 2.5 && Math.abs(z) < P + 2.5) || (Math.abs(x) < 5 && z > 0) || (I && Math.abs(z + 4) < 6 && Math.abs(x) > P + 2 && Math.abs(x) < P + 17) || (!I && z < -P - 3 && z > -P - 16 && Math.abs(x) < 9);
  const ring = (n, r0, r1, kind, seed, s, inYard) => forest(env, kind, scatter(n, { r0, r1, seed, s, avoid: (x, z) => blocked(x, z) || (inYard ? Math.max(Math.abs(x), Math.abs(z)) > yard - 2 || (!I && x < -2 && z > -2) : Math.max(Math.abs(x), Math.abs(z)) < yard - 3), y: () => rimY + 0.1 }), { seed });
  g.add(ring(env.hq ? 26 : 14, yard - 4, yard + 34, 'broad', 3, [0.9, 1.4], false));
  g.add(ring(env.hq ? 10 : 6, P + 3, yard * 1.3, 'flower', 7, [0.8, 1.1], true));
  g.add(ring(4, yard + 4, yard + 26, 'bodhi', 11, [0.9, 1.2], false));
  g.add(treeline(env, { rc: 150, H: 16, seed: 3 }));
  g.add(cityBlocks(env, { n: 26, r0: 260, r1: 480, seed: 4, hmin: 10, hmax: 50 }));
  return { groundY: rimY };
};

/* ---------- Hồ Tây – Chùa Trấn Quốc ---------- */
VIEWS.lake = (c) => {
  const { env, g, I } = c;
  const hw = I ? c.W / 2 : 6, hd = I ? c.D / 2 : 5;
  const wy = -1.6, gy = I ? -0.8 : 0;
  const a = I ? hw + 17 : 16, b = I ? hd + 18 : 14;
  const island = (x, z) => {
    const e = Math.pow(Math.abs(x) / a, 4) + Math.pow(Math.abs(z) / b, 4) + 0.1 * nz(x * 0.1, z * 0.1, 2);
    let y = e < 1 ? gy : gy - (Math.pow(e, 0.25) - 1) * 9;
    if (x < 0 && Math.abs(z + (I ? 2 : 1)) < 4.5) y = Math.max(y, gy - 0.25 - smooth(3.5, 4.5, Math.abs(z + 2)) * 3);
    return y;
  };
  const far = (x, z, r, ang) => -6 + 9 * smooth(380, 430, r) + ridge(ang, r, { rc: 600, width: 140, H: 55, freq: 1.3, seed: 7 });
  const h = (x, z, r, ang) => Math.max(island(x, z), far(x, z, r, ang));
  g.add(makeWater(env, new THREE.PlaneGeometry(1800, 1800), { y: wy, deep: '#2c4240', wave: 0.75, scale: 1 }));
  const col = (t, x, y, z, ny) => terrCol(t, y, ny, { grass: '#5c7a32', forest: '#3a5626', sand: '#8a7a5a', waterY: wy });
  g.add(polarTerrain(env, { r0: 0.5, r1: 150, lin: true, segR: 75, segA: env.hq ? 220 : 140, h, col, mat: env.std('ground_lake', { vertexColors: true, map: detailTex('grass'), roughness: 1 }, { detail: 0.05 }) }));
  g.add(polarTerrain(env, { r0: 150, r1: 1000, segR: 40, segA: 256, h, col }));
  g.add(treeline(env, { rc: 430, width: 40, H: 18, seed: 5 }));
  g.add(cityBlocks(env, { n: 34, r0: 470, r1: 560, seed: 8, hmin: 12, hmax: 70 }));
  // sân lát gạch quanh chánh điện
  g.add(paving(env, I ? c.W + 14 : 22, I ? c.D + 16 : 26, gy + 0.03, '#a8a090'));
  // bảo tháp Lục Độ Đài Sen (11 tầng, đỏ gạch)
  const tw = tieredTower(env, { sides: 6, tiers: 11, r0: 1.45, rTop: 0.85, h0: 2.3, hTier: 1.18, color: '#a8442c', face: 'brick', cornice: '#b8664a', base: 1.0, finial: '#d8d0c0', finialH: 3.2, hShrink: 0.2 });
  const tpos = I ? [hw + 8.5, gy, hd - 4] : [-6, gy, 6];
  tw.position.set(...tpos); g.add(tw);
  g.add(rocks(env, [[tpos[0] + 3.5, gy, tpos[2] + 2, 0.7], [tpos[0] - 3, gy, tpos[2] + 3, 0.5], [tpos[0] + 2, gy, tpos[2] - 3.5, 0.6]]));
  if (!I) {
    const h1 = hall(env, { w: 12, d: 7, h: 3.4, plinth: 0.7, wall: '#c8a878', door: '#6a2a16', frame: '#3a1a0e', tile: '#7a4a32', under: '#3a2216' });
    h1.position.set(4, gy, -3); g.add(h1);
    const h2 = hall(env, { w: 10, d: 6, h: 3.2, plinth: 0.6, wall: '#c8a878', door: '#6a2a16', frame: '#3a1a0e', tile: '#7a4a32', under: '#3a2216', steps: false });
    h2.position.set(4, gy, -11); g.add(h2);
    const gt = gate(env, { wall: '#d8c8a4', tile: '#6a4a3a', under: '#3a2216', w: 3.2, h: 4 }); gt.rotation.y = -PI / 2; gt.position.set(-a + 4, gy, -1); g.add(gt);
    c.camera = { pos: [26, 8, 38], target: [-2, 5, 0] };
  } else {
    const h2 = hall(env, { w: 12, d: 7, h: 3.4, plinth: 0.6, wall: '#c8a878', door: '#6a2a16', frame: '#3a1a0e', tile: '#7a4a32', under: '#3a2216' });
    h2.rotation.y = PI / 2; h2.position.set(-hw - 10, gy, -4); g.add(h2);
  }
  const avoid = (x, z) => (Math.abs(x) < hw + 4 && Math.abs(z) < hd + 5) || Math.hypot(x - tpos[0], z - tpos[2]) < 4 || island(x, z) < gy - 0.1 || (!I && z > -2 && x > -11);
  g.add(forest(env, 'bodhi', [{ x: tpos[0] + (I ? 6 : -7), y: gy, z: tpos[2] - 8, s: 1.1 }]));
  g.add(forest(env, 'broad', scatter(I ? (env.hq ? 24 : 14) : 10, { r0: 6, r1: Math.max(a, b), seed: 4, avoid, y: () => gy, s: [0.8, 1.3] }), { seed: 4 }));
  g.add(forest(env, 'flower', scatter(8, { r0: 5, r1: Math.max(a, b) * 0.8, seed: 6, avoid, y: () => gy, s: [0.8, 1.1] }), { seed: 6 }));
  const bt = boats(env, 'sampan', 4, (t, off) => new V3(Math.sin(t * TAU) * (120 + off * 60), 0, Math.cos(t * TAU) * (95 + off * 40)), wy + 0.05, 0.004, 3);
  g.add(bt); c.upd.push(bt.userData.update);
  return { groundY: gy };
};

/* ---------- Thung lũng suối Yến – Chùa Hương ---------- */
VIEWS.cave = (c) => {
  const { env, g, I } = c;
  const hd = I ? c.D / 2 : 0;
  const z0 = I ? hd + CAVE_MOUTH.zOff : 0;
  const vy = -44, wy = I ? -45.2 : -0.6;
  if (I) {
    g.add(cliffFace(env, { cy: CAVE_MOUTH.cy, rx: CAVE_MOUTH.rx + 0.3, ry: CAVE_MOUTH.ry + 0.3, z0, ext: 110, top: 80, bottom: vy - 4 }));
    const stoneM = texMat(env, 'ledge', stoneTex('#9a9284'), 1, 1);
    g.add(mesh(boxUV(18, 3, 9, 2), stoneM, { pos: [1, -1.52, z0 + 4.2], cast: true }));
    g.add(balustrade(env, [[-7.5, z0 + 8.4], [9.8, z0 + 8.4], [9.8, z0 + 1]], 0.9, '#a8a090'));
    g.add(rocks(env, [[-8, -1, z0 + 6, 2.2], [-9.5, 0, z0 + 2, 2.8, 1.3], [11, -0.5, z0 + 3, 2.4], [12, -2, z0 + 8, 3], [-10, -3, z0 + 9, 3, 0.8]]));
    const riverZ = (x) => 100 + 22 * Math.sin(x / 55);
    const h = (x, z, r, ang) => {
      const dz = z - z0;
      if (dz < 3) return 25;
      let y = vy + 0.0022 * x * x + 6 * fbm(x * 0.02, z * 0.02, 3, 5);
      y = Math.max(y, -2 - Math.pow(Math.max(0, dz - 3), 1.15) * 1.6);
      const dd = Math.abs(z - riverZ(x));
      y = Math.min(y, lerp(vy - 3.5, y, smooth(7, 16, dd)));
      y += ridge(ang, r, { rc: 330, width: 110, H: 85, freq: 2.2, seed: 9, sharp: 2 }) + ridge(ang, r, { rc: 560, width: 150, H: 150, freq: 1.6, seed: 13 });
      return y;
    };
    const col = (t, x, y, z, ny) => {
      terrCol(t, y, ny, { grass: '#6a8a3a', forest: '#3a5a26', sand: '#7a7a5a', waterY: wy });
      if (y < vy + 3 && y > wy + 0.3) t.lerp(C(nz(x * 0.05, z * 0.05) > 0 ? '#8aa848' : '#a8b058'), 0.55);
      return t;
    };
    g.add(polarTerrain(env, { r0: hd + 3, r1: 1000, segR: env.hq ? 90 : 60, segA: env.hq ? 260 : 160, h, col }));
    g.add(makeWater(env, new THREE.PlaneGeometry(1400, 600), { y: wy, deep: '#2a4a3a', wave: 0.4, reflect: false }).translateY(-150));
    const kl = [], R = mulberry(17);
    for (let i = 0; i < (env.hq ? 46 : 28); i++) {
      const x = (R() * 2 - 1) * 380, z = 70 + R() * 420;
      if (Math.abs(z - riverZ(x)) < 25) continue;
      kl.push([x, z, 45 + R() * 90, vy - 2, 0.7 + R() * 0.6]);
    }
    for (const sd of [-1, 1]) for (let i = 0; i < 6; i++) kl.push([sd * (70 + R() * 90), 25 + R() * 60, 60 + R() * 70, vy, 0.8 + R() * 0.4]);
    g.add(karstField(env, kl, 5));
    const trees = scatter(env.hq ? 70 : 35, { r0: 40, r1: 220, seed: 8, arc: [-1.2, 1.2], y: (x, z) => { const y = h(x, z, Math.hypot(x, z), Math.atan2(x, z)); return y < wy + 0.6 || y > vy + 25 ? null : y; }, s: [1, 1.6] });
    g.add(forest(env, 'broad', trees, { seed: 12 }));
    g.add(forest(env, 'bamboo', [{ x: -9, y: -1, z: z0 + 1, s: 0.9 }, { x: 11.5, y: -1, z: z0 + 0.5, s: 0.8 }, { x: -12, y: -2, z: z0 + 5 }], { seed: 3 }));
    const bt = boats(env, 'sampan', env.hq ? 7 : 4, (t, off) => { const x = lerp(-220, 220, t); return new V3(x, 0, riverZ(x) + off * 6); }, wy + 0.05, 0.006, 5);
    bt.scale.setScalar(1); g.add(bt); c.upd.push(bt.userData.update);
    return { groundY: 0 };
  }
  // ---- mô hình: núi đá, cửa động, bậc đá, bến thuyền ----
  const cy = 21, rx = 6.5, ry = 7.5;
  g.add(cliffFace(env, { cy, rx, ry, z0: 0, ext: 70, top: 46, bottom: -3, lean: 0.4, foot: 0.4, seed: 6, curve: 0.012 }));
  const tun = new THREE.CylinderGeometry(1, 0.8, 12, 24, 1, true); tun.rotateX(PI / 2); tun.scale(rx, ry, 1); tun.translate(0, cy, -6);
  g.add(mesh(tun, env.std('tunnel', { color: '#120e0b', side: THREE.BackSide, roughness: 1 })));
  const glow = mesh(new THREE.CircleGeometry(1.0, 24), new THREE.MeshBasicMaterial({ color: '#c07030' }), { pos: [0, cy - 3.5, -11.6] });
  g.add(glow);
  g.add(mesh(new THREE.CircleGeometry(Math.max(rx, ry) * 1.1, 24), env.std('tunnelend', { color: '#120e0a' }), { pos: [0, cy, -11.9] }));
  g.add(karstField(env, [[4, -50, 92, -2, 0.75], [-40, -40, 74, -2, 0.75], [44, -44, 80, -2, 0.75], [-80, -55, 66, -2, 0.8], [84, -60, 72, -2, 0.8], [8, -100, 110, -2, 0.9], [-30, -95, 96, -2, 0.85]], 9));
  const stoneM = texMat(env, 'hsstep', stoneTex('#8a8476'), 1, 1);
  const pier = (x, y, z, w, d, hgt) => g.add(mesh(boxUV(w, hgt, d, 2), stoneM, { pos: [x, y - hgt / 2, z], cast: true }));
  let s = stairs(env, 2.6, 5, 8, stoneM); s.position.set(-9, 0, 12); g.add(s);
  pier(-9, 5, 10.5, 3.2, 3, 5);
  s = stairs(env, 2.6, 5.5, 9, stoneM); s.rotation.y = -PI / 2; s.position.set(1, 5, 10.5); g.add(s);
  pier(-3.5, 5, 10.5, 9, 3, 5); pier(2.4, 10.5, 10.5, 3.2, 3.2, 10.5);
  s = stairs(env, 2.6, cy - ry - 10.5 + 0.3, 6.5, stoneM); s.position.set(2.4, 10.5, 3.6); g.add(s);
  pier(2.4, 10.5, 6.8, 2.6, 6.6, 10.5);
  pier(0, cy - ry + 0.3, 1.5, 12, 6, 2);
  g.add(balustrade(env, [[-5.5, 4.3], [5.5, 4.3]], 0.8, '#a8a090').translateY(cy - ry + 0.3));
  const gt = gate(env, { wall: '#c8b890', tile: '#5a4a3a', under: '#3a2216', w: 3.2, h: 4.2 }); gt.position.set(-9, 0, 19); g.add(gt);
  g.add(paving(env, 60, 14, 0.02, '#9a9284'));
  const gg = (x, z, r) => (z > 7 && z < 24 ? 0 : z >= 24 && z < 62 ? -3 : z >= 62 ? -0.2 + 0.5 * fbm(x * 0.05, z * 0.05) : 0) + ridge(Math.atan2(x, z), r, { rc: 420, width: 120, H: 110, freq: 2.4, seed: 4, sharp: 2 });
  g.add(polarTerrain(env, { r0: 20, r1: 1000, segR: 70, segA: 220, h: (x, z, r) => (z < 0 ? -1 : gg(x, z, r)), col: (t, x, y, z, ny) => { terrCol(t, y, ny, { grass: '#6a8a3a', forest: '#3a5a26' }); if (z > 62 && y < 1) t.lerp(C(nz(x * 0.05, z * 0.05) > 0 ? '#8aa848' : '#a8b058'), 0.6); return t; } }));
  g.add(makeWater(env, new THREE.PlaneGeometry(1400, 38), { y: wy, deep: '#2a4a3a', wave: 0.4 }).translateY(-43));
  const kl = [], R = mulberry(23);
  for (let i = 0; i < 26; i++) kl.push([(R() * 2 - 1) * 300, 90 + R() * 350, 40 + R() * 70, -1, 0.8 + R() * 0.5]);
  g.add(karstField(env, kl, 13));
  const bt = boats(env, 'sampan', 7, (t, off) => new V3(lerp(-60, 60, t), 0, 30 + off * 14), wy + 0.05, 0.01, 7);
  g.add(bt); c.upd.push(bt.userData.update);
  g.add(forest(env, 'broad', scatter(30, { r0: 66, r1: 160, seed: 3, arc: [-1, 1], y: () => 0, s: [0.9, 1.4] }), { seed: 5 }));
  g.add(forest(env, 'bamboo', [{ x: -14, z: 14 }, { x: 8, z: 15 }, { x: -18, z: 9 }, { x: 14, z: 12 }].map((p) => ({ ...p, y: 0 })), { seed: 2 }));
  g.add(forest(env, 'broad', [{ x: -20, z: 3, y: 0, s: 1.2 }, { x: 18, z: 4, y: 0, s: 1.3 }, { x: -26, z: 16, y: 0 }, { x: 24, z: 18, y: 0 }], { seed: 9 }));
  c.camera = { pos: [44, 24, 100], target: [-2, 20, 0] };
  return { groundY: 0 };
};

/* ---------- Đỉnh Yên Tử trên biển mây ---------- */
VIEWS.clouds = (c) => {
  const { env, g, I } = c;
  const hw = I ? c.W / 2 : 3, hd = I ? c.D / 2 : 3;
  const R0 = Math.max(hw, hd) + (I ? 6 : 4), gy = I ? -0.6 : 0, cloudY = I ? -34 : -26;
  const peak = (x, z, r, ang) => {
    if (r < R0) return gy - 0.05;
    const d = r - R0;
    let y = gy - 0.05 - Math.pow(d, 1.22) * (I ? 1.05 : 1.6) + fbm(x * 0.05, z * 0.05, 4, 3) * Math.min(d, 18) * 0.35 + (d > 1.5 ? Math.abs(nz(x * 0.3, z * 0.3, 7)) * Math.min(d, 6) * 0.5 : 0);
    const spur = Math.max(Math.exp(-Math.pow(Math.sin(ang - 1.57), 2) * 18), Math.exp(-Math.pow(Math.sin(ang + 1.3), 2) * 14) * 0.8);
    y = Math.max(y, gy - 1.5 - d * 0.42 + fbm(x * 0.08, z * 0.08, 3, 6) * 4 - (1 - spur) * 200);
    return y;
  };
  const h = (x, z, r, ang) => Math.max(peak(x, z, r, ang), cloudY - 40 + ridge(ang, r, { rc: 230, width: 70, H: 70, freq: 2.6, seed: 2, sharp: 2, base: 0.45 }) + ridge(ang, r, { rc: 470, width: 130, H: 140, freq: 1.8, seed: 8, base: 0.45 }));
  const col = (t, x, y, z, ny) => { terrCol(t, y, ny, { grass: '#5a7034', forest: '#2e4a26', rock: '#8a857a' }); if (ny < 0.9) t.lerp(C('#837e72'), Math.min(1, (0.9 - ny) * 3.5) * (0.6 + 0.4 * nz(x * 0.2, z * 0.2, 2))); return t; };
  g.add(polarTerrain(env, { r0: 0.5, r1: 140, lin: true, segR: 80, segA: env.hq ? 200 : 140, h, col, mat: env.std('ground_peak', { vertexColors: true, map: detailTex('rock'), roughness: 1 }, { detail: 0.08 }) }));
  g.add(polarTerrain(env, { r0: 140, r1: 1000, segR: 40, segA: 256, h, col }));
  g.add(makeCloudSea(env, cloudY));
  if (env.hq) g.add(makeCloudSea(env, cloudY + 5, 700));
  g.add(cloudPuffs(env, cloudY, env.hq ? 90 : 45, I ? 40 : 45, 600, 5));
  const pave = I ? paving(env, c.W + 10, c.D + 10, gy, '#9a948a') : paving(env, 9, 9, gy + 0.02, '#9a948a');
  g.add(pave);
  const e = I ? [c.W / 2 + 5, c.D / 2 + 5] : [4.5, 4.5];
  const bl = balustrade(env, [[2, e[1]], [e[0], e[1]], [e[0], -e[1]], [-e[0], -e[1]], [-e[0], e[1]], [-2, e[1]]], 0.75, '#9a948a');
  bl.position.y = gy; g.add(bl);
  const stoneM = texMat(env, 'ytstep', stoneTex('#9a948a'), 1, 1);
  const s = stairs(env, 3, 10, 16, stoneM); s.position.set(0, gy - 10, e[1]); g.add(s);
  const rk = [], R = mulberry(31);
  for (let i = 0; i < 40; i++) { const a = R() * TAU, r = R0 + 0.5 + R() * 12; const x = Math.sin(a) * r, z = Math.cos(a) * r; if (Math.abs(x) < 3 && z > 0) continue; rk.push([x, peak(x, z, r, a) + 0.3, z, 0.8 + R() * 2.2, 0.8]); }
  g.add(rocks(env, rk, '#8a857a', 4));
  const pines = scatter(env.hq ? 46 : 26, { r0: R0 + 1.5, r1: R0 + 46, seed: 12, avoid: (x, z) => (Math.abs(x) < 4 && z > 0) || (!I && (z > -4 || Math.hypot(x, z) < R0 + 5)), y: (x, z) => { const r = Math.hypot(x, z), y = peak(x, z, r, Math.atan2(x, z)); return y < cloudY + 4 ? null : y - 0.3; }, s: [0.7, 1.25] });
  g.add(forest(env, 'pine', pines, { seed: 7, variants: 4 }));
  g.add(forest(env, 'bamboo', scatter(env.hq ? 12 : 6, { r0: R0 + 0.5, r1: R0 + 9, seed: 5, avoid: (x, z) => (Math.abs(x) < 4 && z > 0) || (!I && z > -3), y: (x, z) => peak(x, z, Math.hypot(x, z), Math.atan2(x, z)) - 0.2, s: [0.6, 0.9] }), { seed: 4 }));
  if (!I) {
    const t = hall(env, { w: 3.6, d: 3.0, h: 2.3, plinth: 0.5, ver: 0.6, over: 0.7, wall: '#8a6a3a', door: '#6a4a24', frame: '#4a3418', col: '#8a6a34', tile: '#9a7a44', under: '#4a3820', metal: true, ornament: 'gourd', bays: 1, stepW: 1.6 });
    t.position.y = gy; g.add(t);
    c.camera = { pos: [16, 9, 21], target: [0, 0.4, -3] };
  }
  return { groundY: gy };
};

/* ---------- Núi đá vôi Ninh Bình – Bái Đính ---------- */
VIEWS.mountain = (c) => {
  const { env, g, I } = c;
  const hw = I ? c.W / 2 : 12, hd = I ? c.D / 2 : 8;
  const gy = I ? -0.9 : 0, plainY = gy - 25.5;
  const yx = hw + (I ? 16 : 14), yz0 = -hd - (I ? 10 : 8), yz1 = hd + (I ? 22 : 18);
  const h = (x, z, r, ang) => {
    const dx = Math.max(0, Math.abs(x) - yx), dz = z > yz1 ? z - yz1 : z < yz0 ? yz0 - z : 0, d = Math.hypot(dx, dz);
    if (d <= 0) return gy - 0.05;
    const front = smooth(-0.2, 0.6, z / Math.max(1, r));
    const hill = gy + d * 0.2 + fbm(x * 0.03, z * 0.03, 4, 2) * 6 * Math.min(1, d / 15);
    const down = Math.max(plainY - 0.6, gy - d * 0.55 + fbm(x * 0.05, z * 0.05, 3, 4) * 2);
    let y = lerp(hill, down, front);
    y += ridge(ang, r, { rc: 520, width: 160, H: 90, freq: 2.8, seed: 3, sharp: 2.5 });
    return y;
  };
  const col = (t, x, y, z, ny) => terrCol(t, y, ny, { grass: '#5e7c34', forest: '#2f4c24', rock: '#86827a' });
  g.add(polarTerrain(env, { r0: 0.5, r1: 160, lin: true, segR: 80, segA: env.hq ? 200 : 140, h, col, mat: env.std('ground_mtn', { vertexColors: true, map: detailTex('grass'), roughness: 1 }, { detail: 0.05 }) }));
  g.add(polarTerrain(env, { r0: 160, r1: 1000, segR: 40, segA: 256, h, col }));
  const rice = new THREE.CircleGeometry(900, 64); rice.rotateX(-PI / 2);
  const ruv = rice.attributes.uv; for (let i = 0; i < ruv.count; i++) ruv.setXY(i, ruv.getX(i) * 22, ruv.getY(i) * 22);
  g.add(mesh(rice, env.std('rice', { map: riceTex(), roughness: 0.9 }, { detail: 0.02 }), { pos: [0, plainY, 0] }));
  g.add(makeWater(env, new THREE.CircleGeometry(70, 48), { y: plainY + 0.05, deep: '#2c4a44', wave: 0.3 }).translateX(70).translateY(-150));
  g.add(paving(env, yx * 2, yz1 - yz0, gy, '#a49c8e').translateZ((yz1 + yz0) / 2));
  const bl = balustrade(env, [[-yx, yz1], [-5, yz1]], 0.85, '#a8a090'); bl.position.y = gy; g.add(bl);
  const br = balustrade(env, [[5, yz1], [yx, yz1]], 0.85, '#a8a090'); br.position.y = gy; g.add(br);
  const stoneM = texMat(env, 'bdstep', stoneTex('#a09888'), 1, 1);
  const s = stairs(env, 10, 12, 22, stoneM); s.position.set(0, gy - 12, yz1); g.add(s);
  const kl = [], R = mulberry(41);
  for (let i = 0; i < (env.hq ? 60 : 36); i++) {
    const a = R() * TAU, r = 70 + Math.pow(R(), 0.8) * 420, x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (z < -30 && r < 110) continue;
    kl.push([x, z, 40 + R() * 95, plainY - 1, 0.65 + R() * 0.6]);
  }
  g.add(karstField(env, kl, 7));
  const bell = (x, z) => {
    const t = tieredTower(env, { sides: 4, tiers: 3, r0: 2.6, rTop: 1.9, h0: 4.2, hTier: 2.4, color: '#c8a070', face: 'ochre', tile: '#6a3a28', under: '#3a2216', roof: 'curved', base: 0.8, finial: '#b08a3a', finialH: 1.4 });
    t.position.set(x, gy, z); g.add(t);
  };
  bell(-hw - (I ? 9 : 9), hd + 8); bell(hw + (I ? 9 : 9), hd + 8);
  const trees = scatter(env.hq ? 80 : 40, { r0: 22, r1: 150, seed: 6, avoid: (x, z) => (Math.abs(x) < yx + 2 && z > yz0 - 2 && z < yz1 + 26), y: (x, z) => { const y = h(x, z, Math.hypot(x, z), Math.atan2(x, z)); return y < plainY + 1 ? null : y - 0.2; }, s: [0.9, 1.4] });
  g.add(forest(env, 'broad', trees.filter((_, i) => i % 3), { seed: 3 }));
  g.add(forest(env, 'pine', trees.filter((_, i) => !(i % 3)), { seed: 4 }));
  g.add(forest(env, 'flower', [[-yx + 3, yz1 - 3], [yx - 3, yz1 - 3], [-yx + 3, yz0 + 3], [yx - 3, yz0 + 3]].map(([x, z]) => ({ x, z, y: gy, s: 1 })), { seed: 2 }));
  if (!I) {
    const hl = hall(env, { w: 20, d: 11, h: 5.2, tiers: 2, plinth: 1.6, wall: '#8a5a3a', door: '#5a2a14', frame: '#3a1a0e', col: '#6a3a20', tile: '#6a3a28', under: '#3a2216', stepW: 8, bays: 7 });
    hl.position.y = gy; g.add(hl);
    c.camera = { pos: [30, 9, 58], target: [0, 9, 0] };
  }
  return { groundY: gy };
};

/* ---------- Núi Bà Huyền – Chùa Bà Linh Phong (cảm hứng Núi Bà Đen, Tây Ninh) ----------
   Chùa trên thềm lưng chừng núi; sau lưng núi dựng cao tới đỉnh có tượng Phật Bà bằng đồng;
   trước mặt đồng bằng và hồ nước xa. Ga cáp treo cạnh sân, tuyến cáp có trụ chạy lên đỉnh và xuống chân núi. */
function giantGuanyin(env, s = 1) {
  // tượng Phật Bà đại tượng: áo choàng đồng đen rộng, mặt tay ánh đồng đỏ, mão nhiều tầng, đứng trên đài sen và bệ tròn nhiều cấp
  const g = new THREE.Group();
  const stone = env.std('gyBase', { map: texRepeat(stoneTex('#b8b0a0'), 4, 1), roughness: 0.85 });
  const gold = env.std('gyGold', { color: '#c9a050', roughness: 0.3, metalness: 0.85 });
  const qa = buildStatue('quanam', 'bronze_dark', { halo: false });
  // môi trường ngoài trời chỉ phản chiếu phòng tối: hạ độ kim loại, nâng màu để áo đen vẫn còn hình khối dưới nắng
  qa.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    if (!o.material?.color) return;
    const m = (o.material = o.material.clone());
    m.metalness = Math.min(m.metalness, 0.45);
    m.roughness = Math.max(m.roughness, 0.42);
    m.clearcoat = 0.25;
    m.color.multiplyScalar(0.62);
  });
  const S = (43 / qa.userData.height) * s;
  qa.scale.setScalar(S); qa.position.y = -4.0 * s; g.add(qa);
  // bệ tròn ba cấp, gờ vàng
  g.add(mesh(new THREE.CylinderGeometry(11.8 * s, 12.2 * s, 3.2 * s, 48), stone, { pos: [0, -5.6 * s, 0], cast: true }));
  g.add(mesh(new THREE.CylinderGeometry(14 * s, 14.6 * s, 1.6 * s, 48), stone, { pos: [0, -7.6 * s, 0], cast: true }));
  g.add(mesh(new THREE.TorusGeometry(11.9 * s, 0.25 * s, 8, 48), gold, { pos: [0, -4.0 * s, 0], rot: [PI / 2, 0, 0] }));
  return g;
}
const cabinTex = () => ctex('cabin', 128, 128, (g, w, h) => {
  g.fillStyle = '#c8302a'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#f4efe6'; g.fillRect(0, h * 0.62, w, h * 0.38);
  g.fillStyle = '#25384a'; for (let i = 0; i < 3; i++) g.fillRect(8 + i * 40, 16, 32, 48);
  g.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 3; i++) g.fillRect(10 + i * 40, 18, 8, 44);
}, { repeat: false });
function cabinMesh(env) {
  const g = new THREE.Group();
  const body = env.std('cabinBody', { map: cabinTex(), roughness: 0.5, metalness: 0.2 });
  const dark = env.std('cabinDark', { color: '#2a2a2e', roughness: 0.5, metalness: 0.6 });
  g.add(mesh(new THREE.BoxGeometry(2.3, 2.1, 2.3), body, { pos: [0, -3.6, 0], cast: true }));
  g.add(mesh(new THREE.BoxGeometry(2.5, 0.25, 2.5), dark, { pos: [0, -2.45, 0] }));
  g.add(mesh(new THREE.BoxGeometry(2.4, 0.2, 2.4), dark, { pos: [0, -4.7, 0] }));
  g.add(mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.3, 6), dark, { pos: [0, -1.25, 0] }));
  g.add(mesh(new THREE.BoxGeometry(0.9, 0.35, 0.5), dark, { pos: [0, -0.05, 0] }));
  return g;
}
// dải phù điêu rồng trên bệ đá Đại tượng
const dragonBandTex = () => ctex('dragonband', 512, 128, (g, w, h) => {
  g.fillStyle = '#6c685e'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#4a463e'; g.fillRect(14, 14, w - 28, h - 28);
  g.strokeStyle = '#c8a24e'; g.lineWidth = 4; g.strokeRect(22, 22, w - 44, h - 44);
  g.lineWidth = 7; g.lineCap = 'round';
  for (const k of [-1, 1]) { g.beginPath(); for (let i = 0; i <= 44; i++) { const x = w / 2 + k * (28 + i * 4.3), y = h / 2 + Math.sin(i * 0.42) * 20; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  g.beginPath(); g.arc(w / 2, h / 2, 17, 0, TAU); g.stroke();
}, { repeat: false });
const signTex = (text, sub) => ctex('sign' + text, 512, 128, (g, w, h) => {
  g.fillStyle = '#7a1e12'; g.fillRect(0, 0, w, h); g.strokeStyle = '#e8c060'; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12);
  g.fillStyle = '#ffe2a0'; g.textAlign = 'center'; g.font = 'bold 50px sans-serif'; g.fillText(text, w / 2, 66);
  g.font = '26px sans-serif'; g.fillText(sub, w / 2, 104);
}, { repeat: false });
function cableStation(env, w = 9, d = 7, h = 4.6, label = 'GA CÁP TREO', sub = 'Chùa Bà · lên đỉnh núi') {
  const g = new THREE.Group();
  const roofM = env.std('stRoof', { color: '#8a2a16', roughness: 0.7 });
  const colM = env.std('stCol', { color: '#d9d2c4', roughness: 0.6 });
  const pts = [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]];
  g.add(mesh(merge(pts.map(([x, z]) => place(new THREE.CylinderGeometry(0.28, 0.32, h, 10), x, h / 2, z))), colM, { cast: true }));
  const roof = new THREE.ConeGeometry(Math.hypot(w, d) * 0.62, 2.2, 4, 1); roof.rotateY(PI / 4); roof.scale(w / d, 1, 1);
  g.add(mesh(roof, roofM, { pos: [0, h + 1.1, 0], cast: true }));
  g.add(mesh(new THREE.BoxGeometry(w + 0.6, 0.4, d + 0.6), env.std('stBeam', { color: '#5a3020', roughness: 0.8 }), { pos: [0, h + 0.1, 0] }));
  // bánh xe quay cáp
  g.add(mesh(new THREE.TorusGeometry(1.6, 0.18, 8, 28), env.std('cabinDark', { color: '#2a2a2e', roughness: 0.5, metalness: 0.6 }), { pos: [0, h + 0.9 - 2.5, 0], rot: [PI / 2, 0, 0] }));
  const sg = new THREE.PlaneGeometry(4.4, 1.1);
  g.add(mesh(sg, env.std('sign' + label + sub, { map: signTex(label, sub), roughness: 0.6, side: THREE.DoubleSide }), { pos: [0, h - 0.7, d / 2 + 0.36] }));
  return g;
}
VIEWS.baden = (c) => {
  const { env, g, I } = c;
  const hw = I ? c.W / 2 : 12, hd = I ? c.D / 2 : 8;
  const gy = I ? -0.9 : 0, plainY = gy - 62;
  const S = { x: -12, z: -240, H: gy + 172 };
  const yx0 = -hw - 12, yx1 = hw + 34, yz0 = -hd - 9, yz1 = hd + 20;
  const base = (x, z) => {
    const d = Math.hypot(x - S.x, z - S.z);
    let y = plainY + (S.H - plainY) * Math.exp(-3.0 * (d / 330) ** 2);
    y = Math.max(y, plainY + 96 * Math.exp(-((Math.hypot(x + 270, z + 150) / 150) ** 2)), plainY + 70 * Math.exp(-((Math.hypot(x - 250, z + 200) / 130) ** 2)));
    const k = Math.min(1, (y - plainY) / 40);
    y += fbm(x * 0.018, z * 0.018, 4, 5) * 16 * k + Math.abs(nz(x * 0.06, z * 0.06, 3)) * 5 * k;
    // đỉnh: một bãi bằng cho tượng Phật Bà
    const ds = Math.hypot(x - S.x, z - S.z);
    if (ds < 34) y = lerp(S.H, y, smooth(26, 34, ds));
    return y;
  };
  const yardD = (x, z) => Math.hypot(x < yx0 ? yx0 - x : x > yx1 ? x - yx1 : 0, z < yz0 ? yz0 - z : z > yz1 ? z - yz1 : 0);
  const h = (x, z) => { const d = yardD(x, z); return d <= 0 ? gy - 0.05 : lerp(gy - 0.05, base(x, z), smooth(0, 24, d)); };
  const col = (t, x, y, z, ny) => terrCol(t, y, ny, { grass: '#46652a', forest: '#20401b', rock: '#6e6a62' });
  const tmat = env.std('ground_baden', { vertexColors: true, map: detailTex('grass'), roughness: 1 }, { detail: 0.05 });
  g.add(polarTerrain(env, { r0: 0.5, r1: 330, lin: true, segR: 120, segA: env.hq ? 220 : 150, h: (x, z) => h(x, z), col, mat: tmat }));
  g.add(polarTerrain(env, { r0: 330, r1: 1200, segR: 40, segA: 200, h: (x, z) => h(x, z), col }));
  const rice = new THREE.CircleGeometry(1400, 64); rice.rotateX(-PI / 2);
  const ruv = rice.attributes.uv; for (let i = 0; i < ruv.count; i++) ruv.setXY(i, ruv.getX(i) * 30, ruv.getY(i) * 30);
  g.add(mesh(rice, env.std('rice', { map: riceTex(), roughness: 0.9 }, { detail: 0.02 }), { pos: [0, plainY - 0.3, 0] }));
  // hồ nước lớn dưới đồng bằng (gợi hồ Dầu Tiếng)
  const lake = makeWater(env, new THREE.CircleGeometry(260, 56), { y: plainY + 0.05, deep: '#2e5058', wave: 0.3 }); lake.position.x = 420; lake.position.z = 560; lake.scale.z = 0.6; g.add(lake);
  // sân thềm lát đá, lan can, bậc đá dẫn xuống núi
  g.add(paving(env, yx1 - yx0, yz1 - yz0, gy, '#a8a090').translateX((yx0 + yx1) / 2).translateZ((yz0 + yz1) / 2));
  for (const seg of [[[yx0, yz1], [-5, yz1]], [[5, yz1], [yx1, yz1]], [[yx1, yz1], [yx1, yz0]], [[yx0, yz1], [yx0, yz0]]]) { const b = balustrade(env, seg, 0.85, '#b0a690'); b.position.y = gy; g.add(b); }
  const stoneM = texMat(env, 'bdstep', stoneTex('#a09888'), 1, 1);
  const st = stairs(env, 9, 14, 30, stoneM); st.position.set(0, gy - 14, yz1); g.add(st);
  // đá tảng granite đặc trưng núi Bà
  const R = mulberry(77), rl = [];
  for (let i = 0; i < (env.hq ? 150 : 90); i++) {
    const a = R() * TAU, r = 30 + Math.pow(R(), 0.7) * 170, x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (yardD(x, z) < 3) continue;
    rl.push([x, h(x, z) - 0.4, z, 1.2 + R() * 3.6, 0.6 + R() * 0.5]);
  }
  for (const [x, z, sc] of [[yx0 - 2, yz0 + 4, 3.2], [yx0 - 1, hd + 6, 2.4], [yx1 + 2, yz0 + 2, 3.6], [-hw - 6, yz0 - 3, 4.2]]) rl.push([x, gy - 0.3, z, sc, 0.7]);
  g.add(rocks(env, rl, '#8c8478', 12));
  // rừng nhiệt đới trên sườn núi
  const trees = scatter(env.hq ? 340 : 190, { r0: 24, r1: 320, seed: 9, avoid: (x, z) => yardD(x, z) < 4 || (Math.abs(x) < 7 && z > yz1 && z < yz1 + 40), y: (x, z) => { const y = h(x, z); return y < plainY + 1 || y > S.H - 22 ? null : y - 0.2; }, s: [1.0, 1.8] });
  g.add(forest(env, 'broad', trees.filter((_, i) => i % 4), { seed: 5 }));
  g.add(forest(env, 'flower', trees.filter((_, i) => !(i % 4)), { seed: 6 }));
  g.add(forest(env, 'palm', [[yx0 + 3, yz1 - 3], [yx1 - 3, yz1 - 3], [yx0 + 3, yz0 + 3]].map(([x, z]) => ({ x, z, y: gy, s: 1.1 })), { seed: 3 }));
  // rừng dày phủ thân núi và những bãi đá granite lớn – nét đặc trưng của núi Bà
  const RM = mulberry(41), mtTrees = [], mtRocks = [];
  for (let i = 0, n = env.hq ? 520 : 280; i < n; i++) {
    const a = RM() * TAU, r = 36 + Math.pow(RM(), 0.8) * 230, x = S.x + Math.sin(a) * r, z = S.z + Math.cos(a) * r;
    if (yardD(x, z) < 6) continue;
    const y = h(x, z); if (y < plainY + 2) continue;
    mtTrees.push({ x, z, y: y - 0.3, s: 1.3 + RM() * 1.2 });
  }
  for (let c = 0; c < (env.hq ? 46 : 30); c++) {
    const a = RM() * TAU, r = 38 + RM() * 200, cx = S.x + Math.sin(a) * r, cz = S.z + Math.cos(a) * r;
    if (yardD(cx, cz) < 8) continue;
    for (let k = 0, m = 3 + Math.floor(RM() * 5); k < m; k++) { const x = cx + (RM() - 0.5) * 16, z = cz + (RM() - 0.5) * 16; mtRocks.push([x, h(x, z) - 0.8, z, 2.5 + RM() * 6, 0.55 + RM() * 0.4]); }
  }
  g.add(forest(env, 'broad', mtTrees.filter((_, i) => i % 5), { seed: 12 }));
  g.add(forest(env, 'pine', mtTrees.filter((_, i) => !(i % 5)), { seed: 13 }));
  g.add(rocks(env, mtRocks, '#7a746a', 31));
  // tượng Phật Bà trên đỉnh, quay mặt về phía chùa
  const statue = giantGuanyin(env, 1.15);
  statue.position.set(S.x, S.H + 8.4 * 1.15 - 0.4, S.z); statue.rotation.y = Math.atan2(-S.x, -S.z); g.add(statue);
  g.add(mesh(new THREE.CylinderGeometry(30, 33, 9, 40), env.std('summitPave', { map: texRepeat(stoneTex('#aaa294'), 8, 8), roughness: 0.9 }), { pos: [S.x, S.H - 4.3, S.z], receive: true }));

  // sân đỉnh: lư hương đồng, cột đèn đá, lan can vòng quanh
  const fy = statue.rotation.y, fwd = (d, side = 0) => [S.x + Math.sin(fy) * d + Math.cos(fy) * side, S.z + Math.cos(fy) * d - Math.sin(fy) * side];
  const urn = new THREE.LatheGeometry([[0, 0], [1.4, 0], [1.6, 0.4], [1.0, 0.9], [1.9, 1.6], [2.2, 2.6], [2.0, 3.0], [1.7, 3.0], [1.6, 2.8], [0, 2.8]].map(([x, y]) => new THREE.Vector2(x, y)), 24);
  const [ux, uz] = fwd(19); g.add(mesh(urn, env.std('gyBronze', { color: '#8e6c3e', roughness: 0.38, metalness: 0.7 }), { pos: [ux, S.H + 0.2, uz], cast: true }));
  const lamps = [];
  for (const side of [-7, 7]) for (const d of [14, 24]) { const [lx, lz] = fwd(d, side); lamps.push(new THREE.BoxGeometry(0.9, 2.4, 0.9).translate(lx, S.H + 1.4, lz), new THREE.BoxGeometry(1.5, 1.2, 1.5).translate(lx, S.H + 3.2, lz), new THREE.ConeGeometry(1.3, 0.9, 4).rotateY(PI / 4).translate(lx, S.H + 4.25, lz)); }
  g.add(mesh(merge(lamps), env.std('summitLamp', { map: texRepeat(stoneTex('#b0a898'), 1, 1), roughness: 0.85 }), { cast: true }));
  const rim = []; for (let i = 0; i < 40; i++) { const a0 = (i / 40) * TAU, a1 = ((i + 1) / 40) * TAU; if (Math.abs(((a0 - Math.atan2(30, 20) + PI) % TAU) - PI) < 0.35) continue; rim.push([[S.x + Math.sin(a0) * 29.4, S.z + Math.cos(a0) * 29.4], [S.x + Math.sin(a1) * 29.4, S.z + Math.cos(a1) * 29.4]]); }
  for (const seg of rim) { const bl = balustrade(env, seg, 0.9, '#b0a690'); bl.position.y = S.H + 0.2; g.add(bl); }

  /* ---- tuyến cáp treo ---- */
  const M = new V3(hw + 22, gy, hd + 1);                  // ga cạnh chùa (ga Chùa Bà)
  const T = new V3(S.x + 30, S.H, S.z + 20);               // ga đỉnh núi
  const F = new V3(hw + 70, plainY, yz1 + 330);            // ga chân núi
  const CH = 6;                                            // cáp cao hơn sàn ga
  const leg = (A, B, n, hA, hB) => {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const f = i / n, x = lerp(A.x, B.x, f), z = lerp(A.z, B.z, f);
      let y = i === 0 ? hA : i === n ? hB : h(x, z) + 17;
      out.push(new V3(x, y, z));
    }
    // cáp không cắm vào sườn núi
    for (let k = 0; k < 3; k++) for (let i = 1; i < out.length - 1; i++) {
      for (const j of [i - 1, i]) { const a = out[j], b = out[j + 1], m = a.clone().lerp(b, 0.5); const gnd = h(m.x, m.z); if (m.y - gnd < 8) { out[i].y += 8 - (m.y - gnd); } }
    }
    return out;
  };
  const up = leg(M, T, 8, M.y + CH, T.y + CH), down = leg(F, M, 7, F.y + CH, M.y + CH);
  const line = [...down, ...up.slice(1)];                  // chân núi → ga chùa → đỉnh
  const dark = env.std('cabinDark', { color: '#2a2a2e', roughness: 0.5, metalness: 0.6 });
  const towerM = env.std('cableTower', { color: '#d8d4cc', roughness: 0.6, metalness: 0.3 });
  const parts = [], cables = [];
  line.forEach((p, i) => {
    const isSt = [0, down.length - 1, line.length - 1].includes(i);
    if (!isSt) {
      // trụ giàn thép 4 chân thu nhỏ dần, giằng chéo, xà ngang có puli
      const gnd = h(p.x, p.z) - 1, th = p.y - gnd, nb = line[i + 1] || line[i - 1], yaw = Math.atan2(nb.x - p.x, nb.z - p.z);
      const tower = [], B = 1.6 + th * 0.05, T0 = 0.55;
      const leg = (ax, az, bx, bz, y0, y1, r) => { const a = new V3(ax, y0, az), b = new V3(bx, y1, bz), d = b.clone().sub(a), L = d.length(); const c = new THREE.CylinderGeometry(r, r, L, 5); c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), d.normalize())); c.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); tower.push(c); };
      const cs = [[1, 1], [1, -1], [-1, -1], [-1, 1]], w = (y) => lerp(B, T0, y / th);
      for (const [sx, sz] of cs) leg(sx * B, sz * B, sx * T0, sz * T0, 0, th, 0.14);
      for (let y = 3; y < th - 1; y += 3.2) for (let k = 0; k < 4; k++) { const [ax, az] = cs[k], [bx, bz] = cs[(k + 1) % 4], wa = w(y), wb = w(y + 3.2); leg(ax * wa, az * wa, bx * wb, bz * wb, y, Math.min(th, y + 3.2), 0.06); leg(ax * wa, az * wa, bx * wa, bz * wa, y, y, 0.07); }
      tower.push(new THREE.BoxGeometry(4.6, 0.45, 0.7).translate(0, th + 0.2, 0));
      for (const sx of [-1.6, 1.6]) tower.push(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12).rotateZ(PI / 2).translate(sx, th + 0.5, 0));
      const tg = merge(tower); tg.rotateY(yaw + PI / 2); tg.translate(p.x, gnd, p.z); parts.push(tg);
    }
    if (i) for (const off of [-1.6, 1.6]) {
      const a = line[i - 1].clone(), b = p.clone(), dir = b.clone().sub(a), len = dir.length();
      const side = new V3(dir.z, 0, -dir.x).normalize().multiplyScalar(off);
      const cg = new THREE.CylinderGeometry(0.06, 0.06, len, 4); cg.translate(0, len / 2, 0);
      cg.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), dir.normalize()));
      cg.translate(a.x + side.x, a.y + 0.4, a.z + side.z); cables.push(cg);
    }
  });
  g.add(mesh(merge(parts), towerM, { cast: true }));
  g.add(mesh(merge(cables), dark));
  for (const [P, label, sub] of [[M, 'GA CÁP TREO', 'Chùa Bà · lên đỉnh núi'], [T, 'GA ĐỈNH NÚI', 'Tượng Phật Bà'], [F, 'GA CHÂN NÚI', 'Núi Bà Huyền']]) {
    const sg = cableStation(env, 9, 7, CH - 1.4, label, sub); sg.position.set(P.x, P.y, P.z); sg.rotation.y = Math.atan2(-(T.x - M.x), -(T.z - M.z)) + PI; g.add(sg);
  }
  // cabin chạy vòng: một chiều lên bên phải, chiều về bên trái
  const segLen = [], cum = [0];
  for (let i = 1; i < line.length; i++) { segLen.push(line[i].distanceTo(line[i - 1])); cum.push(cum[i - 1] + segLen[i - 1]); }
  const total = cum[cum.length - 1];
  const at = (sv, off, out) => {
    sv = ((sv % total) + total) % total;
    let i = 1; while (i < cum.length - 1 && cum[i] < sv) i++;
    const a = line[i - 1], b = line[i], f = (sv - cum[i - 1]) / segLen[i - 1];
    out.copy(a).lerp(b, f);
    const side = new V3(b.z - a.z, 0, -(b.x - a.x)).normalize();
    out.addScaledVector(side, off); out.y += 0.4;
    return Math.atan2(b.x - a.x, b.z - a.z);
  };
  const cabins = [], N = env.hq ? 16 : 10;
  for (let i = 0; i < N; i++) { const cb = cabinMesh(env); g.add(cb); cabins.push({ cb, s: (i / N) * total, dirn: i % 2 ? 1 : -1 }); }
  const tmp = new V3();
  c.upd.push((dt) => {
    for (const k of cabins) { k.s += dt * 4.2 * k.dirn; const yaw = at(k.s, k.dirn > 0 ? 1.6 : -1.6, tmp); k.cb.position.copy(tmp); k.cb.rotation.y = yaw; }
  });
  // cabin riêng cho người chơi đi (thế giới điều khiển)
  const ride = cabinMesh(env); ride.visible = false; g.add(ride);
  const upPath = up.map((p, i) => { const q = p.clone(); const nx = up[Math.min(i + 1, up.length - 1)], pv = up[Math.max(i - 1, 0)]; const side = new V3(nx.z - pv.z, 0, -(nx.x - pv.x)).normalize(); return q.addScaledVector(side, 1.6).add(new V3(0, 0.4, 0)); });
  c.cable = { station: { x: M.x, z: M.z, r: 4.5 }, path: upPath, cabin: ride, statue: new V3(S.x, S.H + 30, S.z), facing: statue.rotation.y, summit: T.clone() };

  if (!I) {
    const hl = hall(env, { w: 20, d: 11, h: 5.2, tiers: 2, plinth: 1.6, wall: '#e9c46a', door: '#8a1e12', frame: '#4a1a0e', col: '#a3261a', tile: '#a0301c', under: '#4a2216', stepW: 8, bays: 7 });
    hl.position.y = gy; g.add(hl);
    c.camera = { pos: [70, 40, 120], target: [0, 30, -60] };
  }
  return { groundY: gy };
};

/* ---------- Đỉnh Fansipan – Chùa Kim Sơn Bảo Thắng (quần thể tâm linh Fansipan, Sa Pa, Lào Cai) ----------
   Dựng theo tư liệu thật, thu gọn khoảng cách cho vừa vùng đi bộ: chánh điện trên đỉnh, tháp đá 11 tầng trên trục chính,
   hành lang tả vu – hữu vu, lầu Đại Hồng Chung 8 mái, cổng Thanh Vân Đắc Lộ với 80 bậc đá, đường La Hán 18 tượng đồng,
   Đại tượng A Di Đà ngồi cao 21,5 m và chóp đỉnh 3.143 m. Dưới biển mây: thung lũng Mường Hoa, thị trấn Sa Pa, ga Hoàng Liên. */
function gridTerrain(env, { x0, x1, z0, z1, nx, nz, h, col, mat }) {
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const x = lerp(x0, x1, i / nx), z = lerp(z0, z1, j / nz);
    pos.push(x, h(x, z), z); uv.push(x / 8, z / 8);
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = j * (nx + 1) + i, b = a + nx + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const P = g.attributes.position, Nn = g.attributes.normal, cols = new Float32Array(P.count * 3), tmp = new THREE.Color();
  for (let i = 0; i < P.count; i++) { col(tmp, P.getX(i), P.getY(i), P.getZ(i), Nn.getY(i)); cols[i * 3] = tmp.r; cols[i * 3 + 1] = tmp.g; cols[i * 3 + 2] = tmp.b; }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return mesh(g, mat);
}
// đường lát đá bám theo các điểm {x, z, y}
function paveRibbon(env, pts, w, color) {
  const pos = [], uv = [], idx = [];
  let run = 0;
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz) || 1, sx = dz / L, sz = -dx / L;
    if (i) run += Math.hypot(p.x - pts[i - 1].x, p.z - pts[i - 1].z);
    pos.push(p.x - sx * w / 2, p.y, p.z - sz * w / 2, p.x + sx * w / 2, p.y, p.z + sz * w / 2);
    uv.push(0, run / 3, w / 3, run / 3);
    if (i) { const k = (i - 1) * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return mesh(g, env.std('ribbon' + color, { map: stoneTex(color), roughness: 0.95, side: THREE.DoubleSide }));
}
// một pho La Hán: 3 dáng (đứng giơ tay, ngồi, đứng chống gậy), cao chừng 2,5 m
function arhatGeo(kind, x, y, z, ry) {
  const list = [];
  // thân áo có nếp dọc rủ xuống
  const robe = (p) => { const l = new THREE.LatheGeometry(p.map(([a, b]) => new THREE.Vector2(a, b)), 16), q = l.attributes.position; for (let i = 0; i < q.count; i++) { const px = q.getX(i), py = q.getY(i), pz = q.getZ(i), a = Math.atan2(px, pz), f = 1 + 0.07 * Math.sin(a * 9) * Math.max(0, 1 - py / 1.7); q.setXYZ(i, px * f, py, pz * f); } list.push(l); };
  // ống tay áo rộng dần về phía bàn tay
  const sleeve = (a, b, r0, r1) => { const A = new V3(...a), B = new V3(...b), d = B.clone().sub(A), L = d.length(), c = new THREE.CylinderGeometry(r1, r0, L, 8); c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), d.clone().normalize())); c.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); list.push(c, new THREE.SphereGeometry(r1 * 0.62, 8, 6).translate(...b)); };
  const head = (hy) => {
    list.push(new THREE.SphereGeometry(0.235, 14, 12).scale(0.92, 1.05, 1).translate(0, hy, 0.02));
    for (const k of [-1, 1]) list.push(new THREE.SphereGeometry(0.07, 6, 5).scale(0.6, 1.5, 0.7).translate(k * 0.22, hy - 0.02, 0));
    list.push(new THREE.SphereGeometry(0.05, 6, 5).translate(0, hy - 0.04, 0.24));
    list.push(new THREE.SphereGeometry(0.13, 8, 6).scale(1, 0.7, 0.7).translate(0, hy - 0.2, 0.14)); // râu cằm
    list.push(new THREE.CylinderGeometry(0.1, 0.13, 0.16, 8).translate(0, hy - 0.26, 0));
  };
  if (kind === 1) {
    // ngồi xếp bằng, đặt tay trên gối
    robe([[0, 0], [0.74, 0], [0.8, 0.14], [0.66, 0.3], [0.4, 0.42], [0.36, 0.86], [0.3, 1.08], [0.14, 1.2], [0, 1.22]]);
    head(1.45);
    sleeve([0.3, 1.04, 0], [0.5, 0.6, 0.3], 0.1, 0.17); sleeve([-0.3, 1.04, 0], [-0.5, 0.6, 0.3], 0.1, 0.17);
  } else {
    robe([[0, 0], [0.6, 0], [0.56, 0.3], [0.46, 0.9], [0.38, 1.4], [0.36, 1.78], [0.24, 1.98], [0, 2.02]]);
    head(2.26);
    if (kind === 0) { sleeve([0.32, 1.86, 0], [0.5, 2.46, 0.16], 0.1, 0.15); sleeve([-0.32, 1.86, 0], [-0.34, 1.3, 0.26], 0.1, 0.19); }
    else { sleeve([0.32, 1.86, 0], [0.46, 1.34, 0.3], 0.1, 0.18); sleeve([-0.32, 1.86, 0], [-0.3, 1.34, 0.32], 0.1, 0.18); list.push(new THREE.CylinderGeometry(0.035, 0.035, 2.6, 6).translate(0.5, 1.3, 0.34)); }
  }
  const g = mergeGeometries(list.map((q) => { const n = q.index ? q.toNonIndexed() : q; n.deleteAttribute('uv'); n.computeVertexNormals(); return n; })); list.forEach((q) => q.dispose());
  return place(g, x, y, z, ry);
}
function steelSummit(env) {
  // chóp inox tam giác đánh dấu độ cao trên đỉnh
  const g = new THREE.Group();
  g.add(mesh(new THREE.ConeGeometry(1.15, 3.6, 3, 1), env.std('summitSteel', { color: '#d6dade', metalness: 0.9, roughness: 0.28 }), { pos: [0, 2.5, 0], cast: true }));
  g.add(mesh(new THREE.CylinderGeometry(1.9, 2.2, 0.7, 3), texMat(env, 'summitbase', stoneTex('#7c776c'), 1, 1), { pos: [0, 0.35, 0], cast: true }));
  const board = new THREE.PlaneGeometry(1.5, 0.6);
  g.add(mesh(board, env.std('summitTag', { map: signTex('3.143 m', 'Fansipan'), roughness: 0.6 }), { pos: [0, 1.15, 1.32], rot: [-0.12, 0, 0] }));
  return g;
}
function stoneChurch(env) {
  // nhà thờ đá Sa Pa: thân nhà xây đá xám, mái ngói, tháp chuông vuông phía trước, thánh giá trên đỉnh
  const g = new THREE.Group();
  const st = texMat(env, 'churchstone', stoneTex('#8c887e'), 2, 2), tile = env.std('churchtile', { map: tileTex('#6e4a3a'), roughness: 0.9 });
  g.add(mesh(boxUV(10, 7, 24, 3), st, { pos: [0, 3.5, -3], cast: true }));
  const roof = new THREE.ConeGeometry(1, 3.6, 4, 1); roof.rotateY(PI / 4); roof.scale(5.8 * Math.SQRT2 * 1.01, 1, 12.5 * Math.SQRT2);
  g.add(mesh(roof, tile, { pos: [0, 8.8, -3], cast: true }));
  g.add(mesh(boxUV(5.4, 17, 5.4, 3), st, { pos: [0, 8.5, 10.4], cast: true }));
  g.add(mesh(new THREE.ConeGeometry(4.0, 4.6, 4).rotateY(PI / 4), tile, { pos: [0, 19.3, 10.4], cast: true }));
  const dark = env.std('churchdark', { color: '#1e1a16', roughness: 1 }), win = [];
  win.push(place(new THREE.PlaneGeometry(2, 4), 0, 2.2, 13.12), place(new THREE.PlaneGeometry(1.4, 2.6), 0, 12.6, 13.12));
  for (const k of [-1, 1]) for (let i = 0; i < 4; i++) win.push(place(new THREE.PlaneGeometry(1.1, 3), k * 5.02, 3.6, 5 - i * 5, k * PI / 2));
  g.add(mesh(merge(win), dark));
  const cr = env.std('churchcross', { color: '#e4e0d4', roughness: 0.6 });
  g.add(mesh(merge([new THREE.BoxGeometry(0.18, 1.8, 0.18), new THREE.BoxGeometry(1.0, 0.18, 0.18).translate(0, 0.3, 0)]), cr, { pos: [0, 22.4, 10.4] }));
  return g;
}
function trainMesh(env) {
  const g = new THREE.Group();
  const body = env.std('mhTrain', { color: '#a8201a', roughness: 0.45, metalness: 0.2 }), glass = env.std('mhGlass', { color: '#20303c', roughness: 0.25, metalness: 0.5 });
  for (let i = 0; i < 2; i++) {
    g.add(mesh(new THREE.BoxGeometry(2.6, 2.3, 7.2), body, { pos: [0, 1.5, i * 7.8], cast: true }));
    g.add(mesh(new THREE.BoxGeometry(2.66, 0.9, 6.4), glass, { pos: [0, 1.9, i * 7.8] }));
    g.add(mesh(new THREE.BoxGeometry(2.8, 0.2, 7.4), env.std('mhTrim', { color: '#e8c060', roughness: 0.4, metalness: 0.5 }), { pos: [0, 2.75, i * 7.8] }));
  }
  return g;
}
VIEWS.fansipan = (c) => {
  const { env, g, I } = c;
  const hw = I ? c.W / 2 : 15, hd = I ? c.D / 2 : 13;
  const gy = I ? -0.9 : 0, STEPS = 13.6; // 80 bậc đá × 0,17 m
  const landY = gy - STEPS, terrY = gy + 9, peakY = gy + 11.5, townY = gy - 190;
  const STONE = '#8f8b80', STONE_D = '#6f6b62', TILE = '#5c5349', WOOD = '#5a3a22', UNDER = '#35251a';
  const clampBox = (x, z, x0, x1, z0, z1) => Math.hypot(x < x0 ? x0 - x : x > x1 ? x - x1 : 0, z < z0 ? z0 - z : z > z1 ? z - z1 : 0);
  const yard = (x, z) => clampBox(x, z, -48, 42, -20, 40), land = (x, z) => clampBox(x, z, -14, 44, 62, 80);
  const terr = (x, z) => Math.hypot(x, z + 62) - 16, peak = (x, z) => Math.hypot(x - 36, z + 50) - 8;
  // đường La Hán (nam → bắc) và lối từ thềm tượng lên chóp đỉnh
  const curve = (ctrl, n) => { const k = new THREE.CatmullRomCurve3(ctrl.map((p) => new V3(p[0], p[2], p[1]))); return k.getPoints(n).map((p) => ({ x: p.x, y: p.y, z: p.z })); };
  const road = curve([[-24, -18, gy], [-31, -36, gy + 3], [-27, -54, gy + 6.5], [-14, -62, terrY]], 44);
  const road2 = curve([[12, -58, terrY], [24, -55, gy + 10.4], [31, -51, peakY]], 14);
  const nearRoad = (x, z) => { let best = 1e9, by = 0; for (const R of [road, road2]) for (const p of R) { const d = Math.hypot(p.x - x, p.z - z); if (d < best) { best = d; by = p.y; } } return [best, by]; };
  // núi tự nhiên: đỉnh gò đá sau chùa, đổ dần xuống thung lũng, xa xa là dãy Hoàng Liên Sơn thấp hơn đỉnh
  const nature = (x, z) => {
    const r = Math.hypot(x, z), a = Math.atan2(x, z);
    const spur = 1 + 0.2 * Math.sin(a * 5 + 1.1) + 0.12 * Math.sin(a * 11 + 0.4) + 0.07 * Math.sin(a * 23); // các sống đá toả xuống từ đỉnh
    const fall = gy - 2 - Math.pow(Math.max(0, r - 46), 1.32) * 0.5 * spur;
    const k1 = Math.exp(-((Math.hypot(x + 6, z + 76) / 58) ** 2)), k2 = Math.exp(-((Math.hypot(x - 38, z + 54) / 34) ** 2));
    const knob = gy - 70 + 64 * k1 + 75 * k2 - (1 - Math.max(k1, k2)) * 500; // hai gò đá sau chùa, xa ra thì chìm hẳn vào sườn núi
    const dT = Math.hypot(x, z - 800);
    const rk = Math.max(0, r - 48);
    const rough = fbm(x * 0.03, z * 0.03, 4, 11) * Math.min(20, rk * 0.22) + Math.abs(nz(x * 0.1, z * 0.1, 5)) * Math.min(9, rk * 0.12) + Math.abs(nz(x * 0.27, z * 0.27, 9)) * Math.min(2.6, rk * 0.05);
    const floor = gy - 258 + fbm(x * 0.006, z * 0.006, 3, 4) * 34;
    const crest = 0.55 + 0.45 * Math.abs(Math.sin(a * 3.1 + 0.7) * Math.cos(a * 7.3)) + fbm(a * 3, r * 0.004, 3, 8) * 0.25; // các đỉnh của dãy Hoàng Liên Sơn, đều thấp hơn Fansipan
    const range = 235 * crest * Math.max(Math.exp(-(((r - 1180) / 240) ** 2)), z < 0 ? Math.exp(-(((r - 640) / 200) ** 2)) : 0, Math.abs(x) > 260 && z > 0 ? Math.exp(-(((Math.abs(x) - 560) / 210) ** 2)) * 0.8 : 0);
    let y = Math.max(Math.max(fall, knob) + rough, floor + range);
    if (dT < 330) y = lerp(townY - 0.3 + fbm(x * 0.012, z * 0.012, 2, 7) * 3 * smooth(90, 200, dT), y, smooth(170, 330, dT));
    return y;
  };
  const h = (x, z) => {
    let y = nature(x, z);
    const [dr, ry] = nearRoad(x, z);
    if (dr < 11) y = lerp(ry - 0.06, y, smooth(2.6, 11, dr));
    const dp = terr(x, z); if (dp < 10) y = lerp(terrY - 0.05, y, smooth(0, 10, dp));
    const dk = peak(x, z); if (dk < 8) y = lerp(peakY - 0.05, y, smooth(0, 8, dk));
    const dl = land(x, z); if (dl < 14) y = lerp(landY - 0.05, y, smooth(0, 14, dl));
    // dốc đá nối sân xuống bãi ga (phía đông), bậc đá chính ở giữa
    if (x > -14 && x < 44 && z > 40 && z < 62) y = lerp(gy - 0.05, landY - 0.05, smooth(0, 1, (z - 40) / 22));
    const dy = yard(x, z); if (dy < 12) y = lerp(gy - 0.05, y, smooth(0, 12, dy));
    return y;
  };
  // ruộng bậc thang Mường Hoa: đất chia bậc theo đường đồng mức
  const inVal = (x, z) => Math.abs(x) < 330 && z > 210 && z < 650;
  const hOuter = (x, z) => (inVal(x, z) || (Math.abs(x) < 200 && z > 650 && z < 960) ? h(x, z) - 4 : h(x, z));
  const terrCols = ['#c6ad4a', '#8aa63e', '#a8b04a', '#d0b656', '#73983a'];
  const terraceH = (x, z) => { const y = h(x, z) + fbm(x * 0.02, z * 0.02, 2, 2) * 2.5; return y > townY + 6 ? y : Math.floor(y / 2.4) * 2.4 + 0.5; };
  const terrColFn = (t, x, y, z, ny) => {
    if (y > townY + 12 || ny < 0.72) { terrCol(t, y, ny, { grass: '#4f6a2c', forest: '#284a22', rock: '#6e6a62' }); return; }
    const k = Math.abs(Math.floor(y / 2.4) + Math.floor(fbm(x * 0.01, z * 0.01, 2, 9) * 3)) % terrCols.length; t.set(terrCols[k]); t.multiplyScalar(0.92 + nz(x * 0.2, z * 0.2, 3) * 0.14);
  };
  const col = (t, x, y, z, ny) => {
    const alpine = y > gy - 70;
    terrCol(t, y, ny, alpine ? { grass: '#55603a', forest: '#3c4a2c', rock: '#615d54' } : { grass: '#49682c', forest: '#22461f', rock: '#6a665c' });
    if (alpine && ny < 0.93) t.lerp(C('#625e55'), Math.min(1, (0.93 - ny) * 5));
  };
  const tmat = env.std('ground_fansipan', { vertexColors: true, map: detailTex('grass'), roughness: 1 }, { detail: 0.05 });
  g.add(polarTerrain(env, { r0: 0.5, r1: 170, lin: true, segR: 110, segA: env.hq ? 300 : 200, h: hOuter, col, mat: tmat }));
  g.add(polarTerrain(env, { r0: 170, r1: 1500, segR: 56, segA: 240, h: hOuter, col }));
  g.add(gridTerrain(env, { x0: -340, x1: 340, z0: 200, z1: 660, nx: env.hq ? 230 : 130, nz: env.hq ? 160 : 90, h: terraceH, col: terrColFn, mat: env.std('ground_muonghoa', { vertexColors: true, map: detailTex('grass'), roughness: 1 }, { detail: 0.03 }) }));
  g.add(gridTerrain(env, { x0: -210, x1: 210, z0: 640, z1: 970, nx: 70, nz: 56, h, col: (t, x, y, z, ny) => { terrCol(t, y, ny, { grass: '#5d7a3a', forest: '#3f5f2c', rock: '#6e6a60' }); t.multiplyScalar(0.94 + nz(x * 0.05, z * 0.05, 4) * 0.1); }, mat: env.std('ground_sapa', { vertexColors: true, map: detailTex('grass'), roughness: 1 }, { detail: 0.03 }) }));
  // biển mây quanh sườn: chỉ thấy từ trên nhìn xuống, cáp treo xuyên qua
  g.add(makeCloudSea(env, gy - 92, 470));
  g.add(cloudPuffs(env, gy - 88, env.hq ? 70 : 34, 90, 440, 7));

  /* ---- sân chùa, lan can, bậc đá ---- */
  g.add(paving(env, 90, 60, gy, STONE, 'kspave').translateX(-3).translateZ(10));
  g.add(paving(env, 58, 18, landY, STONE, 'kspave').translateX(15).translateZ(71));
  g.add(paveRibbon(env, road.map((p) => ({ ...p, y: p.y + 0.02 })), 4.2, STONE));
  g.add(paveRibbon(env, road2.map((p) => ({ ...p, y: p.y + 0.02 })), 3, STONE));
  const pTerr = new THREE.CircleGeometry(16, 40); pTerr.rotateX(-PI / 2); g.add(mesh(pTerr, env.std('terrPave', { map: texRepeat(stoneTex(STONE), 6, 6), roughness: 0.95 }), { pos: [0, terrY, -62], receive: true }));
  const pPeak = new THREE.CircleGeometry(8, 24); pPeak.rotateX(-PI / 2); g.add(mesh(pPeak, env.std('peakPave', { map: texRepeat(stoneTex(STONE_D), 3, 3), roughness: 0.95 }), { pos: [36, peakY, -50], receive: true }));
  const rail = (path, y) => { const b = balustrade(env, path, 0.95, STONE); b.position.y = y; g.add(b); };
  rail([[-48, 40], [-6, 40]], gy); rail([[42, 40], [42, -20]], gy); rail([[-48, 40], [-48, -20]], gy);
  rail([[-14, 80], [44, 80], [44, 62]], landY); rail([[-14, 62], [-14, 80]], landY);
  const sm = texMat(env, 'ksstep', stoneTex(STONE_D), 1, 1);
  const st80 = stairs(env, 10, STEPS, 22, sm); st80.position.set(0, landY, 40); g.add(st80);
  const walls = [place(boxUV(0.6, STEPS + 0.9, 22, 3), -5.3, landY + (STEPS + 0.9) / 2, 51), place(boxUV(0.6, STEPS + 0.9, 22, 3), 5.3, landY + (STEPS + 0.9) / 2, 51)];
  g.add(mesh(merge(walls), texMat(env, 'kswall', stoneTex(STONE_D), 1, 2)));

  /* ---- biển chú giải cho khách tham quan ---- */
  const plaque = (x, y, z, ry, a, b) => {
    const p = new THREE.Group();
    p.add(mesh(new THREE.PlaneGeometry(3, 0.75), env.std('sign' + a + b, { map: signTex(a, b), roughness: 0.6, side: THREE.DoubleSide }), { pos: [0, 1.75, 0] }));
    p.add(mesh(merge([new THREE.BoxGeometry(0.12, 1.5, 0.12).translate(-1.3, 0.75, 0), new THREE.BoxGeometry(0.12, 1.5, 0.12).translate(1.3, 0.75, 0)]), env.std('plqPost', { color: '#3a2a1e', roughness: 0.8 })));
    p.position.set(x, y, z); p.rotation.y = ry; g.add(p);
  };

  /* ---- tháp đá 11 tầng trên trục chính ---- */
  const pagoda = tieredTower(env, { sides: 4, tiers: 11, r0: 2.7, rTop: 1.05, h0: 2.8, hTier: 1.42, hShrink: 0.2, face: 'brick', color: '#958b78', cornice: '#7a7468', base: 0.9, finial: '#8a7a50' });
  pagoda.position.set(0, gy, 28); g.add(pagoda);
  plaque(6.5, gy, 28, 0, 'BẢO THÁP 11 TẦNG', 'Ốp đá sa thạch · dáng tháp Phổ Minh');

  /* ---- hành lang tả vu, hữu vu ---- */
  for (const k of [-1, 1]) {
    const lv = hall(env, { w: 18, d: 5, h: 3.2, plinth: 0.35, ver: 0.8, over: 0.9, steps: false, roofH: 2.2, wall: '#6d5238', door: '#4a2c18', frame: '#2e1c10', col: WOOD, tile: TILE, under: UNDER, stone: STONE, bays: 7 });
    lv.position.set(k * 22, gy, 29); lv.rotation.y = -k * PI / 2; g.add(lv);
  }
  plaque(-16.5, gy, 15.5, 0.5, 'TẢ VU · HỮU VU', 'Hành lang hai bên thượng điện');

  /* ---- lầu Đại Hồng Chung: bố cục thẳng đứng, cao 35 m, 8 mái ---- */
  const bell = tieredTower(env, { sides: 8, tiers: 4, r0: 4.4, rTop: 2.7, h0: 8, hTier: 5.6, hShrink: 0.18, roof: 'curved', face: 'plaster', color: '#7a6548', tile: TILE, under: UNDER, base: 1, finial: '#8a7a50', finialH: 4 });
  bell.position.set(-36, gy, 20); g.add(bell);
  plaque(-28, gy, 27, 0.6, 'ĐẠI HỒNG CHUNG', 'Vọng Lĩnh Cao Đài · cao 35 m');

  /* ---- cổng Thanh Vân Đắc Lộ, đầu 80 bậc đá ---- */
  const tv = gate(env, { wall: '#807c72', tile: TILE, under: UNDER, w: 3.4, h: 4.2 });
  tv.position.set(-8, landY, 72); tv.scale.setScalar(0.8); g.add(tv);
  plaque(2.5, landY, 66.5, 0.3, 'THANH VÂN ĐẮC LỘ', 'Từ đây 80 bậc đá lên chùa');

  /* ---- đường La Hán: 18 tượng đồng trên bệ đá chẻ, cây đỗ quyên hai bên ---- */
  const bronzeDk = env.std('ksBronze', { color: '#4a4034', roughness: 0.5, metalness: 0.65 }), piles = [], arhats = [];
  const roadPts = road.filter((_, i) => i > 3 && i < 43);
  for (let i = 0; i < 18; i++) {
    const p = roadPts[Math.floor(((i >> 1) + 0.3) / 9 * roadPts.length)], q = roadPts[Math.min(roadPts.length - 1, Math.floor(((i >> 1) + 0.3) / 9 * roadPts.length) + 1)];
    const dx = q.x - p.x, dz = q.z - p.z, L = Math.hypot(dx, dz) || 1, k = i % 2 ? 1 : -1, sx = (dz / L) * k, sz = (-dx / L) * k;
    const x = p.x + sx * 3.6, z = p.z + sz * 3.6, base = p.y + 0.45;
    piles.push(place(boxUV(1.9, 0.9, 1.9, 1), x, p.y, z));
    arhats.push(arhatGeo(i % 3, x, base, z, Math.atan2(-sx, -sz)));
  }
  g.add(mesh(merge(piles), texMat(env, 'ksPile', stoneTex('#7d6a50'), 0.5, 0.5), { cast: true }));
  g.add(mesh(merge(arhats), bronzeDk, { cast: true }));
  plaque(-21, gy, -20, 2.7, 'ĐƯỜNG LA HÁN', '18 tượng đồng · lên Đại tượng');

  /* ---- Đại tượng A Di Đà: đồng sẫm, ngồi trên đài sen, bệ đá khối chạm rồng ---- */
  const buddha = buildStatue('amida', 'bronze', { halo: false }); const BS = 21.5 / 5.3;
  buddha.traverse((o) => { if (o.isMesh && o.material?.color) { o.material = o.material.clone(); o.material.color.multiplyScalar(0.42); o.material.roughness = 0.5; o.castShadow = true; } });
  const baseM = env.std('ksBase', { map: dragonBandTex(), roughness: 0.85 }), baseTop = env.std('ksBaseTop', { map: texRepeat(stoneTex('#6c685e'), 3, 3), roughness: 0.9 });
  g.add(mesh(new THREE.BoxGeometry(23, 3.4, 23), [baseM, baseM, baseTop, baseTop, baseM, baseM], { pos: [0, terrY + 1.7, -71], cast: true }));
  g.add(mesh(boxUV(19, 1, 19, 3), baseTop, { pos: [0, terrY + 3.9, -71], cast: true }));
  buddha.scale.setScalar(BS); buddha.position.set(0, terrY + 4.3, -71); g.add(buddha);
  plaque(-8, terrY, -56, 0.35, 'ĐẠI TƯỢNG A DI ĐÀ', 'Đồng ghép, tượng ngồi cao 21,5 m');
  const censer = new THREE.LatheGeometry([[0, 0], [1, 0], [1.1, 0.3], [0.7, 0.6], [1.3, 1.1], [1.5, 1.8], [1.3, 2.1], [0, 2]].map(([a, b]) => new THREE.Vector2(a, b)), 20);
  g.add(mesh(censer, bronzeDk, { pos: [0, terrY, -54], cast: true }));

  /* ---- tượng Quan Thế Âm trên tảng đá cao ---- */
  const qa = buildStatue('quanam', 'bronze');
  qa.traverse((o) => { if (o.isMesh && o.material?.color) { o.material = o.material.clone(); o.material.color.multiplyScalar(0.6); } });
  qa.scale.setScalar(1.2); qa.position.set(-40, gy + 3.2, -6); qa.rotation.y = 0.5; g.add(qa);
  g.add(rocks(env, [[-40, gy - 0.2, -6, 4.4, 0.8], [-37, gy - 0.3, -9, 3, 0.7], [-43, gy - 0.3, -3, 2.6, 0.7]], '#6f6b62', 44));
  plaque(-33, gy, -2, 1.0, 'QUAN THẾ ÂM BỒ TÁT', 'Trên tảng đá cao');

  /* ---- chóp đỉnh 3.143 m ---- */
  const sum = steelSummit(env); sum.position.set(36, peakY, -50); sum.rotation.y = -0.5; g.add(sum);

  /* ---- đá tảng, thông, đỗ quyên, trúc lùn ---- */
  const avoid = (x, z) => yard(x, z) < 2 || land(x, z) < 2 || terr(x, z) < 1 || peak(x, z) < 1 || nearRoad(x, z)[0] < 5.5 || (Math.abs(x) < 46 && z > 38 && z < 64);
  const onGround = (x, z) => { const y = hOuter(x, z); return y; };
  const R = mulberry(143), rk = [];
  for (let i = 0; i < (env.hq ? 340 : 170); i++) { const a = R() * TAU, r = 18 + R() * 150, x = Math.sin(a) * r, z = Math.cos(a) * r; if (avoid(x, z)) continue; const yr = onGround(x, z); if (Math.abs(onGround(x + 2, z) - yr) + Math.abs(onGround(x, z + 2) - yr) > 5) continue; const sr = 0.8 + R() * 2.8; rk.push([x, yr - sr * 0.3, z, sr, 0.55 + R() * 0.4]); }
  g.add(rocks(env, rk, '#67635a', 12));
  g.add(forest(env, 'flower', scatter(env.hq ? 90 : 45, { r0: 22, r1: 100, seed: 31, avoid, y: onGround, s: [0.5, 0.9] }), { seed: 31 }));
  g.add(forest(env, 'pine', scatter(env.hq ? 300 : 130, { r0: 44, r1: 240, seed: 32, avoid, y: onGround, s: [0.7, 1.3] }), { seed: 32, variants: 3 }));
  g.add(forest(env, 'broad', scatter(env.hq ? 260 : 120, { r0: 200, r1: 480, seed: 33, avoid: () => false, y: (x, z) => { const y = hOuter(x, z); return y < gy - 80 && y > townY - 40 && !inVal(x, z) ? y : null; }, s: [1.5, 2.3] }), { seed: 33 }));

  /* ---- thị trấn Sa Pa ---- */
  const tx = 0, tz = 800, ty = townY;
  const sapa = new THREE.Group(); sapa.position.set(tx, ty, tz); g.add(sapa);
  // quảng trường, nhà thờ đá nhìn ra quảng trường
  sapa.add(paving(env, 70, 44, 0.3, '#a8a498', 'sqpave').translateX(30).translateZ(14));
  const church = stoneChurch(env); church.position.set(30, 0.3, -22); sapa.add(church);
  const sign = new THREE.PlaneGeometry(14, 3.5);
  sapa.add(mesh(sign, env.std('signsapa', { map: signTex('SA PA', 'Lào Cai · độ cao khoảng 1.600 m'), side: THREE.DoubleSide, roughness: 0.6 }), { pos: [30, 3.6, 36] }));
  // hồ Sa Pa
  const lake = makeWater(env, new THREE.CircleGeometry(52, 40), { y: ty + 0.45, deep: '#3c5c5e', wave: 0.3 }); lake.position.x = tx - 110; lake.position.z = tz - 54; lake.scale.z = 0.62; g.add(lake);
  // nhà phố mái đỏ, tường trắng men theo đường
  const R2 = mulberry(1600), walls2 = [], roofs = [], nh = env.hq ? 170 : 90;
  for (let i = 0; i < nh; i++) {
    const a = R2() * TAU, r = 44 + R2() * 130, x = Math.sin(a) * r * 1.1, z = Math.cos(a) * r * 0.9;
    if ((x > -8 && x < 72 && z > -44 && z < 44) || Math.hypot(x + 110, (z + 54) / 0.62) < 60) continue;
    const w = 6 + R2() * 5, d = 7 + R2() * 7, H = 4 + R2() * R2() * 13, ry = Math.round(R2() * 2) * (PI / 2) + (R2() - 0.5) * 0.1;
    const yy = h(tx + x, tz + z) - ty;
    walls2.push(addColor(place(boxUV(w, H, d, 3), x, yy + H / 2, z, ry), ['#ece6da', '#e0d6c4', '#f0ead8', '#d8d0c0'][i % 4]));
    const rf = new THREE.ConeGeometry(0.72, 2.2, 4, 1); rf.rotateY(PI / 4); rf.scale(w, 1, d);
    roofs.push(addColor(place(rf, x, yy + H + 1.1, z, ry), ['#9a4a30', '#8a3c28', '#a65a3a', '#6e4a3c'][i % 4]));
  }
  const vcm = env.std('sapaHouse', { vertexColors: true, roughness: 0.85 });
  sapa.add(mesh(merge(walls2.map((q) => q.index ? q.toNonIndexed() : q)), vcm), mesh(merge(roofs.map((q) => q.index ? q.toNonIndexed() : q)), vcm));
  // bản Cát Cát: nhà gỗ thấp mái sẫm của người H'Mông, nằm dưới thung lũng cạnh thị trấn
  const R3 = mulberry(2), huts = [];
  for (let i = 0; i < (env.hq ? 34 : 18); i++) {
    const x = 165 + (R3() - 0.5) * 90, z = 640 + (R3() - 0.5) * 70, y = h(x, z), ry = R3() * 3;
    huts.push(addColor(place(boxUV(5, 2.6, 7, 3), x, y + 1.3, z, ry), '#4a3626'));
    const rf = new THREE.ConeGeometry(0.75, 2, 4, 1); rf.rotateY(PI / 4); rf.scale(5.2, 1, 7.4);
    huts.push(addColor(place(rf, x, y + 3.5, z, ry), '#2e2a26'));
  }
  g.add(mesh(merge(huts.map((q) => q.index ? q.toNonIndexed() : q)), vcm));

  /* ---- cáp treo 3 dây: ga Hoàng Liên (Sa Pa) → ga Fansipan ---- */
  const M = new V3(30, landY, 68), F = new V3(70, h(70, 640) + 2, 640), CH = 6;
  const n = 9, line = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n, x = lerp(F.x, M.x, f), z = lerp(F.z, M.z, f);
    line.push(new V3(x, i === 0 ? F.y + CH : i === n ? M.y + CH : Math.max(hOuter(x, z), inVal(x, z) ? h(x, z) : -1e9) + 22, z));
  }
  for (let k = 0; k < 3; k++) for (let i = 1; i < n; i++) for (const j of [i - 1, i]) { const m = line[j].clone().lerp(line[j + 1], 0.5), gnd = hOuter(m.x, m.z); if (m.y - gnd < 12) line[i].y += 12 - (m.y - gnd); }
  const parts = [], cables = [];
  line.forEach((p, i) => {
    if (i && i < n) {
      const gnd = h(p.x, p.z) - 1, th = p.y - gnd, B = 1.8 + th * 0.05, T0 = 0.6, tw = [], nb = line[i + 1], yaw = Math.atan2(nb.x - p.x, nb.z - p.z);
      const bar = (ax, az, ay, bx, bz, by, r) => { const a = new V3(ax, ay, az), b = new V3(bx, by, bz), d = b.clone().sub(a), L = d.length(), cy = new THREE.CylinderGeometry(r, r, L, 5); cy.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), d.normalize())); cy.translate((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2); tw.push(cy); };
      const cs = [[1, 1], [1, -1], [-1, -1], [-1, 1]], wd = (y) => lerp(B, T0, y / th);
      for (const [sx, sz] of cs) bar(sx * B, sz * B, 0, sx * T0, sz * T0, th, 0.16);
      for (let y = 4; y < th - 2; y += 5) for (let k = 0; k < 4; k++) { const [ax, az] = cs[k], [bx, bz] = cs[(k + 1) % 4]; bar(ax * wd(y), az * wd(y), y, bx * wd(y + 5), bz * wd(y + 5), Math.min(th, y + 5), 0.08); }
      tw.push(new THREE.BoxGeometry(5.2, 0.5, 0.8).translate(0, th + 0.2, 0));
      const tg = merge(tw); tg.rotateY(yaw + PI / 2); tg.translate(p.x, gnd, p.z); parts.push(tg);
    }
    if (i) for (const off of [-1.8, 1.8, 0]) {
      const a = line[i - 1], dir = p.clone().sub(a), len = dir.length(), side = new V3(dir.z, 0, -dir.x).normalize().multiplyScalar(off);
      const cg = new THREE.CylinderGeometry(0.06, 0.06, len, 4); cg.translate(0, len / 2, 0);
      cg.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), dir.normalize()));
      cg.translate(a.x + side.x, a.y + (off ? 0.4 : 1.0), a.z + side.z); cables.push(cg);
    }
  });
  g.add(mesh(merge(parts), env.std('fpTower', { color: '#d8d4cc', roughness: 0.6, metalness: 0.3 }), { cast: true }));
  g.add(mesh(merge(cables), env.std('cabinDark', { color: '#2a2a2e', roughness: 0.5, metalness: 0.6 })));
  for (const [P, a, b] of [[M, 'GA FANSIPAN', 'Cáp treo · gần 3.000 m'], [F, 'GA HOÀNG LIÊN', 'Cáp treo Fansipan · Sa Pa']]) {
    const sg = cableStation(env, 13, 9, CH - 1.4, a, b); sg.position.copy(P); sg.rotation.y = Math.atan2(F.x - M.x, F.z - M.z) + PI; g.add(sg);
  }
  // Bảo An Thiền Tự cạnh ga đi (độ cao 1.604 m)
  const baoan = hall(env, { w: 13, d: 8, h: 4, plinth: 0.8, wall: '#6d5238', door: '#4a2c18', frame: '#2e1c10', col: WOOD, tile: TILE, under: UNDER, stone: STONE, bays: 3 });
  baoan.position.set(F.x + 28, h(F.x + 28, F.z + 6), F.z + 6); baoan.rotation.y = 0.2; g.add(baoan);
  // cabin chạy hai chiều
  const segLen = [], cum = [0];
  for (let i = 1; i < line.length; i++) { segLen.push(line[i].distanceTo(line[i - 1])); cum.push(cum[i - 1] + segLen[i - 1]); }
  const total = cum.at(-1), tmp = new V3();
  const at = (sv, off, out) => {
    sv = ((sv % total) + total) % total;
    let i = 1; while (i < cum.length - 1 && cum[i] < sv) i++;
    const a = line[i - 1], b = line[i]; out.copy(a).lerp(b, (sv - cum[i - 1]) / segLen[i - 1]);
    out.addScaledVector(new V3(b.z - a.z, 0, -(b.x - a.x)).normalize(), off); out.y += 0.4;
    return Math.atan2(b.x - a.x, b.z - a.z);
  };
  const cabins = [], NC = env.hq ? 10 : 6;
  for (let i = 0; i < NC; i++) { const cb = cabinMesh(env); cb.scale.setScalar(1.25); g.add(cb); cabins.push({ cb, s: (i / NC) * total, dirn: i % 2 ? 1 : -1 }); }
  // tàu leo núi Mường Hoa: từ thị trấn tới ga Hoàng Liên
  const rail0 = new V3(26, townY + 0.6, 700), rail1 = new V3(F.x - 8, F.y + 0.3, F.z + 12);
  const tr = [], rdir = rail1.clone().sub(rail0), rlen = rdir.length();
  for (const off of [-0.8, 0.8]) { const cg = new THREE.CylinderGeometry(0.1, 0.1, rlen, 4); cg.translate(0, rlen / 2, 0); cg.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), rdir.clone().normalize())); const sd = new V3(rdir.z, 0, -rdir.x).normalize().multiplyScalar(off); cg.translate(rail0.x + sd.x, rail0.y, rail0.z + sd.z); tr.push(cg); }
  g.add(mesh(merge(tr), env.std('cabinDark', { color: '#2a2a2e', roughness: 0.5, metalness: 0.6 })));
  const train = trainMesh(env); train.rotation.y = Math.atan2(rdir.x, rdir.z); g.add(train);
  let trainT = 0;
  c.upd.push((dt) => {
    for (const k of cabins) { k.s += dt * 5 * k.dirn; const yaw = at(k.s, k.dirn > 0 ? 1.8 : -1.8, tmp); k.cb.position.copy(tmp); k.cb.rotation.y = yaw; }
    trainT = (trainT + dt * 0.05) % 2; const f = trainT < 1 ? trainT : 2 - trainT; train.position.copy(rail0).lerp(rail1, 0.05 + f * 0.8); train.position.y += 0.1;
  });
  const ride = cabinMesh(env); ride.scale.setScalar(1.25); ride.visible = false; g.add(ride);
  const upPath = line.map((p, i) => { const q = p.clone(), nx = line[Math.min(i + 1, n)], pv = line[Math.max(i - 1, 0)]; return q.add(new V3(nx.z - pv.z, 0, -(nx.x - pv.x)).normalize().multiplyScalar(1.8)).add(new V3(0, 0.4, 0)); });
  const W = (x, y, z) => [tx + x, ty + y, tz + z];
  c.cable = {
    station: { x: M.x, z: M.z, r: 7 }, path: upPath, cabin: ride, statue: new V3(0, terrY + 18, -71), facing: 0, summit: M.clone(), speed: 17, oneWay: true,
    tour: [
      { from: W(82, 42, 92), to: W(44, 22, 64), look: W(30, 8, -14), dur: 10, text: 'Thị trấn Sa Pa: nhà thờ đá xám nhìn ra quảng trường, nơi có phiên chợ tình tối thứ bảy.' },
      { from: W(-34, 34, 18), to: W(-150, 36, 2), look: W(-110, 0, -54), dur: 9, text: 'Hồ Sa Pa giữa thị trấn, mây núi soi bóng mặt nước.' },
      { from: [230, townY + 40, 720], to: [150, townY - 10, 520], look: [60, townY - 62, 420], dur: 11, text: 'Thung lũng Mường Hoa: ruộng bậc thang men sườn núi, bên cạnh là bản Cát Cát của người H’Mông.' },
      { from: [130, townY + 30, 730], to: [108, F.y + 14, 668], look: [F.x, F.y + 4, F.z], dur: 9, text: 'Tàu leo núi Mường Hoa chạy từ thị trấn tới ga Hoàng Liên, cạnh Bảo An Thiền Tự (độ cao 1.604 m).' },
    ],
    say: {
      btn: 'Tham quan Sa Pa & đi cáp treo',
      hint: 'Bạn đang ở sân chùa. Ga cáp treo ở bãi dưới 80 bậc đá – lại gần để tham quan Sa Pa và đi cáp treo.',
      go: 'Đang đưa bạn xuống ga cáp treo… tới nơi bấm “Tham quan Sa Pa & đi cáp treo”.',
      up: 'Cáp treo ba dây dài khoảng 6.292 m, chênh cao 1.410 m, vượt thung lũng Mường Hoa xuyên biển mây lên gần đỉnh Fansipan…',
      top: 'Đại tượng A Di Đà bằng đồng cao 21,5 m trên đỉnh Fansipan – “nóc nhà Đông Dương”. Nam mô A Di Đà Phật.',
    },
  };

  if (!I) {
    const hl = hall(env, { w: 22, d: 14, h: 5, plinth: 0.9, wall: '#6d5238', door: '#4a2c18', frame: '#2e1c10', col: WOOD, tile: TILE, under: UNDER, stone: STONE, bays: 5 });
    hl.position.y = gy; g.add(hl);
    c.camera = { pos: [46, 26, 84], target: [0, 10, -20] };
  }
  return { groundY: gy, walkR: 78 };
};

/* ---------- Sông Hương hoàng hôn – Thiên Mụ ---------- */
VIEWS.river = (c) => {
  const { env, g, I } = c;
  const hw = I ? c.W / 2 : 6, hd = I ? c.D / 2 : 4;
  const gy = I ? -0.8 : 0, wy = I ? -7 : -2.6, bankZ = hd + (I ? 26 : 16);
  const h = (x, z, r, ang) => {
    let y = gy - 0.05 + (z < -hd - 10 ? Math.min(20, (-hd - 10 - z) * 0.12) : 0) + fbm(x * 0.03, z * 0.03, 3, 1) * (z < bankZ ? 0.6 : 0);
    if (z > bankZ) y = lerp(y, wy - 3, smooth(bankZ, bankZ + 7, z));
    y = Math.max(y, lerp(wy - 3, wy + 3, smooth(240, 270, z)) + (z > 260 ? ridge(ang, r, { rc: 360, width: 80, H: 40, freq: 3, seed: 5 }) : 0));
    y += ridge(ang, r, { rc: 600, width: 150, H: 85, freq: 1.7, seed: 9 }) * smooth(0.0, 0.5, z / Math.max(r, 1));
    return y;
  };
  const col = (t, x, y, z, ny) => terrCol(t, y, ny, { grass: '#5a7a30', forest: '#2e4a24', sand: '#8a7a5a', waterY: wy });
  g.add(polarTerrain(env, { r0: 0.5, r1: 160, lin: true, segR: 80, segA: env.hq ? 200 : 140, h, col, mat: env.std('ground_river', { vertexColors: true, map: detailTex('grass'), roughness: 1 }, { detail: 0.05 }) }));
  g.add(polarTerrain(env, { r0: 160, r1: 1000, segR: 40, segA: 256, h, col }));
  g.add(makeWater(env, new THREE.PlaneGeometry(1800, 1800), { y: wy, deep: '#28403e', wave: 0.6 }));
  g.add(paving(env, I ? c.W + 14 : 30, I ? c.D + 14 : 34, gy + 0.03, '#a49c8e'));
  const tpos = I ? [-7, gy, hd + 17] : [0, gy, 6];
  const tw = tieredTower(env, { sides: 8, tiers: 7, r0: 2.4, rTop: 1.45, h0: 3.6, hTier: 2.4, color: '#c89a68', face: 'ochre', cornice: '#a87a50', base: 1.4, finial: '#b08a3a', finialH: 3.6, hShrink: 0.18 });
  tw.position.set(...tpos); g.add(tw);
  const stoneM = texMat(env, 'tmstep', stoneTex('#a09888'), 1, 1);
  const s = stairs(env, 8, gy - wy, 12, stoneM); s.position.set(I ? 6 : 0, wy, bankZ); g.add(s);
  if (I) {
    const pv = hall(env, { w: 4, d: 4, h: 3, plinth: 0.6, ver: 0.6, over: 0.8, wall: '#a8402a', door: '#8a2a16', frame: '#4a1a0e', col: '#a3261a', tile: '#8a5a32', under: '#4a1a10', bays: 1, ornament: 'gourd' });
    pv.position.set(13, gy, hd + 11); g.add(pv);
  } else {
    const gt = gate(env, { wall: '#c8b088', tile: '#8a5a32', under: '#4a1a10' }); gt.position.set(0, gy, -6); g.add(gt);
    const hl = hall(env, { w: 13, d: 8, h: 3.8, plinth: 0.8, wall: '#a8402a', door: '#8a2a16', frame: '#4a1a0e', col: '#a3261a', tile: '#8a5a32', under: '#4a1a10' });
    hl.position.set(0, gy, -20); g.add(hl);
    for (const sd of [-1, 1]) { const pv = hall(env, { w: 3.6, d: 3.6, h: 2.8, plinth: 0.5, ver: 0.5, over: 0.7, wall: '#a8402a', door: '#8a2a16', frame: '#4a1a0e', col: '#a3261a', tile: '#8a5a32', under: '#4a1a10', bays: 1, ornament: 'gourd' }); pv.position.set(sd * 10, gy, 4); g.add(pv); }
    c.camera = { pos: [17, 1.2, 56], target: [0, 8.5, 0] };
  }
  const avoid = (x, z) => (Math.abs(x) < hw + 5 && z > -hd - 6 && z < hd + 6) || Math.hypot(x - tpos[0], z - tpos[2]) < 6 || z > bankZ - 3 || (!I && Math.abs(x) < 8 && z < 4 && z > -26) || (Math.abs(x - (I ? 6 : 0)) < 6 && z > bankZ - 8);
  g.add(forest(env, 'pine', scatter(env.hq ? 40 : 22, { r0: 10, r1: 80, seed: 3, avoid, y: (x, z) => h(x, z, Math.hypot(x, z), Math.atan2(x, z)) - 0.1, s: [0.9, 1.3] }), { seed: 3, variants: 4 }));
  g.add(forest(env, 'flower', scatter(8, { r0: 8, r1: 30, seed: 9, avoid, y: () => gy, s: [0.8, 1.1] }), { seed: 9 }));
  g.add(treeline(env, { rc: 275, width: 30, H: 14, seed: 4, color: '#2a3a20', arc: [0, 1.4] }));
  const bt = boats(env, 'dragon', 2, (t, off) => new V3(lerp(-300, 300, t), 0, bankZ + 60 + off * 60), wy + 0.1, 0.004, 2);
  g.add(bt); c.upd.push(bt.userData.update);
  const sp = boats(env, 'sampan', 3, (t, off) => new V3(lerp(-300, 300, t), 0, bankZ + 30 + off * 80), wy + 0.05, 0.006, 6);
  g.add(sp); c.upd.push(sp.userData.update);
  return { groundY: gy };
};

/* ---------- Sân chùa Nam Bộ, hàng dừa – Vĩnh Nghiêm ---------- */
VIEWS.palm = (c) => {
  const { env, g, I } = c;
  const hw = I ? c.W / 2 : 11, hd = I ? c.D / 2 : 7;
  const gy = I ? -0.6 : 0, yard = Math.max(hw, hd) + (I ? 30 : 24);
  g.add(paving(env, yard * 2, yard * 2, gy, '#b8b0a2'));
  g.add(polarTerrain(env, {
    r0: yard * 0.97, r1: 1000, segR: 40, segA: 200,
    h: (x, z, r, ang) => gy - 0.08 + ridge(ang, r, { rc: 700, width: 120, H: 30, freq: 1.5, seed: 1 }),
    col: (t, x, y, z, ny) => terrCol(t, y, ny, { grass: '#6a8a3a', forest: '#456a2c' }),
    mat: env.std('ground_palm', { vertexColors: true, map: detailTex('grass'), roughness: 1 }, { detail: 0.05 }),
  }));
  g.add(boundaryWall(env, [[-6, yard], [-yard, yard], [-yard, -yard], [yard, -yard], [yard, yard], [6, yard]], 2.4, '#efe2c8', '#8a4a2e', false).translateY(gy));
  const gt = gate(env, { wall: '#efe2c8', tile: '#8a4a2e', under: '#5a4030' }); gt.position.set(0, gy, yard); g.add(gt);
  g.add(cityBlocks(env, { n: env.hq ? 60 : 36, r0: I ? yard + 140 : 320, r1: I ? 520 : 650, seed: 6, hmin: 8, hmax: I ? 60 : 45 }));
  const tpos = I ? [-hw - 14, gy, hd + 6] : [-17, gy, 4];
  const tw = tieredTower(env, { sides: 4, tiers: 7, r0: 3.2, rTop: 2.0, h0: 5, hTier: 3.4, color: '#efe6d4', face: 'white', tile: '#7a4a30', under: '#5a4030', roof: 'curved', base: 1.2, finial: '#b08a3a', finialH: 2.4, hShrink: 0.15 });
  tw.position.set(...tpos); g.add(tw);
  const avoid = (x, z) => (Math.abs(x) < hw + 6 && Math.abs(z) < hd + 7) || Math.hypot(x - tpos[0], z - tpos[2]) < 7 || (Math.abs(x) < 6 && z > 0) || Math.abs(x) > yard - 2 || Math.abs(z) > yard - 2 || (!I && x > -4 && z > 6);
  g.add(forest(env, 'palm', scatter(env.hq ? 30 : 18, { r0: 10, r1: yard * 1.3, seed: 4, avoid, y: () => gy, s: [0.85, 1.2] }), { seed: 4, variants: 4 }));
  g.add(forest(env, 'flower', scatter(10, { r0: 10, r1: yard, seed: 8, avoid, y: () => gy, s: [0.8, 1.1] }), { seed: 8 }));
  g.add(forest(env, 'shrub', scatter(env.hq ? 60 : 30, { r0: 8, r1: yard, seed: 2, avoid, y: () => gy, s: [0.8, 1.4] }), { seed: 2 }));
  g.add(forest(env, 'palm', scatter(env.hq ? 40 : 20, { r0: yard + 6, r1: yard + 60, seed: 14, y: () => gy, s: [0.9, 1.3] }), { seed: 14, variants: 3 }));
  if (!I) {
    const hl = hall(env, { w: 22, d: 13, h: 5, tiers: 2, plinth: 1.4, wall: '#efe2c8', door: '#7a3a1e', frame: '#4a2412', col: '#a8503a', tile: '#8a4a2e', under: '#5a4030', bays: 7, stepW: 8 });
    hl.position.y = gy; g.add(hl);
    c.camera = { pos: [28, 15, 54], target: [-5, 11, 0] };
  }
  return { groundY: gy };
};

/* ---------- Vườn chùa Khmer – Chùa Dơi ---------- */
VIEWS.garden = (c) => {
  const { env, g, I } = c;
  const hw = I ? c.W / 2 : 7, hd = I ? c.D / 2 : 11;
  const gy = I ? -0.8 : 0;
  const pond = [32, 6], pr = 10;
  const h = (x, z, r, ang) => {
    let y = gy - 0.05 + fbm(x * 0.02, z * 0.02, 3, 4) * 0.5 * smooth(30, 60, r);
    const dp = Math.hypot(x - pond[0], z - pond[1]);
    if (dp < pr + 3) y = lerp(gy - 2.5, y, smooth(pr - 1, pr + 3, dp));
    return y + ridge(ang, r, { rc: 700, width: 100, H: 12, freq: 1.5, seed: 2 });
  };
  const col = (t, x, y, z, ny) => terrCol(t, y, ny, { grass: '#5e7e30', forest: '#4a6a2a', sand: '#7a6a4a', waterY: gy - 1.2 });
  g.add(polarTerrain(env, { r0: 0.5, r1: 160, lin: true, segR: 70, segA: env.hq ? 200 : 140, h, col, mat: env.std('ground_garden', { vertexColors: true, map: detailTex('grass'), roughness: 1 }, { detail: 0.05 }) }));
  g.add(polarTerrain(env, { r0: 160, r1: 1000, segR: 30, segA: 200, h, col }));
  g.add(makeWater(env, new THREE.CircleGeometry(pr + 1, 40), { y: gy - 1.2, deep: '#2a3a28', wave: 0.3 }).translateX(pond[0]).translateY(-pond[1]));
  g.add(lotusPatch(env, scatter(env.hq ? 80 : 40, { r0: 0, r1: pr - 1, seed: 3, s: [0.35, 0.7] }).map((p) => ({ ...p, x: p.x + pond[0], z: p.z + pond[1] })), gy - 1.2));
  g.add(paving(env, I ? c.W + 8 : 18, I ? c.D + 10 : 30, gy + 0.03, '#b0a898'));
  const path = new THREE.PlaneGeometry(4, 60); path.rotateX(-PI / 2);
  g.add(mesh(path, env.std('pathk', { map: texRepeat(stoneTex('#b0a898'), 1, 15), roughness: 0.9 }), { pos: [0, gy + 0.02, hd + 34] }));
  const stupas = I ? [[-hw - 9, hd + 10, 1.1], [hw + 9, hd + 10, 1.1], [-hw - 14, -6, 1.4]] : [[-12, 12, 1.0], [12, 12, 1.0], [-16, -8, 1.3]];
  for (const [x, z, s] of stupas) { const st = khmerStupa(env, s); st.position.set(x, gy, z); g.add(st); }
  const avoid = (x, z) => (Math.abs(x) < hw + 5 && Math.abs(z) < hd + 7) || Math.abs(x) < 4 || Math.hypot(x - pond[0], z - pond[1]) < pr + 2 || stupas.some(([sx, sz]) => Math.hypot(x - sx, z - sz) < 5);
  g.add(forest(env, 'sao', scatter(env.hq ? 34 : 20, { r0: 16, r1: 90, seed: 7, avoid, y: () => gy - 0.1, s: [0.85, 1.25] }), { seed: 7 }));
  g.add(forest(env, 'banyan', scatter(5, { r0: 22, r1: 60, seed: 3, avoid, y: () => gy - 0.1, s: [0.8, 1.1] }), { seed: 3, variants: 2 }));
  g.add(forest(env, 'palm', scatter(10, { r0: 14, r1: 50, seed: 5, avoid, y: () => gy, s: [0.8, 1] }), { seed: 5 }));
  g.add(forest(env, 'shrub', scatter(env.hq ? 50 : 25, { r0: 10, r1: 40, seed: 9, avoid, y: () => gy, s: [0.8, 1.5] }), { seed: 9 }));
  g.add(treeline(env, { rc: 170, width: 50, H: 24, seed: 6, color: '#2e4624' }));
  if (!I) {
    const kh = khmerHall(env, { w: 10, d: 18, h: 4.6, plinth: 1.8 });
    kh.position.y = gy; g.add(kh);
    c.camera = { pos: [21, 8, 36], target: [0, 6.5, 0] };
  }
  return { groundY: gy };
};

/* ---------- Cố đô Lam Kinh (Thanh Hoá): sông Ngọc, cầu Bạch, Ngọ môn, sân rồng, chính điện chữ Công, chín toà Thái miếu, núi Dầu ---------- */
// dùng chung: con nghê đá ngồi canh cửa
function stoneNghe(env, s = 1) {
  const m = env.std('nghe', { map: texRepeat(stoneTex('#9a9286'), 1, 1), roughness: 0.9 });
  const parts = [
    place(boxUV(1.4, 0.5, 1.8), 0, 0.25, 0),                                        // bệ
    place(new THREE.SphereGeometry(0.55, 12, 8), 0, 0.95, -0.25, 0, 0, 0, 1),       // thân
    place(new THREE.SphereGeometry(0.42, 12, 8), 0, 1.55, 0.25),                     // đầu
    place(new THREE.ConeGeometry(0.16, 0.5, 6), 0, 1.9, -0.05, 0, -0.6),               // bờm
    place(cylUV(0.12, 0.14, 0.7, 6), -0.28, 0.75, 0.42), place(cylUV(0.12, 0.14, 0.7, 6), 0.28, 0.75, 0.42),
  ].map((x) => (x.index ? x.toNonIndexed() : x));
  const g = mesh(merge(parts), m, { cast: true }); g.scale.setScalar(s);
  return g;
}
// cầu đá cong một nhịp (cầu Bạch) bắc theo trục x, mặt cầu đi được
function archBridge(env, len, w, rise, color = '#a8a090') {
  const m = texMat(env, 'bridge' + color, stoneTex(color), 1, 1), list = [], n = 14;
  for (let i = 0; i < n; i++) {
    const x0 = lerp(-len / 2, len / 2, i / n), x1 = lerp(-len / 2, len / 2, (i + 1) / n);
    const y0 = rise * Math.sin(PI * (i / n)), y1 = rise * Math.sin(PI * ((i + 1) / n));
    const L = Math.hypot(x1 - x0, y1 - y0), a = Math.atan2(y1 - y0, x1 - x0);
    list.push(place(boxUV(L + 0.05, 0.35, w), (x0 + x1) / 2, (y0 + y1) / 2 - 0.17, 0, 0, 0, a));
    for (const s of [-1, 1]) list.push(place(boxUV(L + 0.05, 0.55, 0.22), (x0 + x1) / 2, (y0 + y1) / 2 + 0.27, s * (w / 2 - 0.11), 0, 0, a));
  }
  return mesh(merge(list.map((x) => (x.index ? x.toNonIndexed() : x))), m, { cast: true });
}
VIEWS.citadel = (c) => {
  const { env, g, I } = c;
  const hw = I ? c.W / 2 : 11, hd = I ? c.D / 2 : 6;
  const gy = I ? -1.8 : 0;                      // chính điện dựng trên nền cao, thềm rồng chín bậc
  const yardY = gy, sanZ0 = hd + (I ? 2.5 : 4), sanZ1 = hd + (I ? 30 : 26);
  const riverZ = sanZ1 + (I ? 12 : 9), wy = yardY - 1.4;
  // địa hình: đồng bằng quanh khu điện, núi Dầu phía sau (-z), núi Chúa xa xa phía trước bên kia sông Chu
  const flatX = (I ? c.W / 2 + 13 : 20) + 6, flatZ0 = -hd - (I ? 62 : 46), flatZ1 = sanZ1 + 5;
  const h = (x, z, r, ang) => {
    // khu điện (sân rồng, chính điện, Thái miếu) phẳng tuyệt đối; ra ngoài mới gợn và lên núi
    const dOut = Math.hypot(Math.max(0, Math.abs(x) - flatX), z < flatZ0 ? flatZ0 - z : z > flatZ1 ? z - flatZ1 : 0);
    const k = smooth(0, 30, dOut);
    let y = yardY - 0.06 + fbm(x * 0.02, z * 0.02, 3, 4) * 0.5 * k;
    const dr = Math.abs(z - riverZ - 2 * Math.sin(x * 0.04));
    y = lerp(wy - 1.2, y, smooth(3.2, 6.5, dr));                                      // lòng sông Ngọc
    y += k * 70 * Math.exp(-(((x + 10) / 150) ** 2) - (((z + 190) / 90) ** 2));         // núi Dầu
    y += k * ridge(ang, r, { rc: 520, width: 140, H: 60, freq: 1.6, seed: 11 });
    return y;
  };
  const col = (t, x, y, z, ny) => terrCol(t, y, ny, { grass: '#5a7a30', forest: '#2f4c22', sand: '#8a7a5a', waterY: wy });
  g.add(polarTerrain(env, { r0: 0.5, r1: 170, lin: true, segR: 90, segA: env.hq ? 220 : 150, h, col, mat: env.std('ground_citadel', { vertexColors: true, map: detailTex('grass'), roughness: 1 }, { detail: 0.05 }) }));
  g.add(polarTerrain(env, { r0: 170, r1: 1000, segR: 40, segA: 220, h, col }));
  // sông Ngọc uốn trước Ngọ môn (dải nước nông) – không phản chiếu để nhẹ máy
  const rv = makeWater(env, new THREE.PlaneGeometry(900, 9), { y: wy, deep: '#2c4a40', wave: 0.35, reflect: false }); rv.position.z = riverZ; g.add(rv);
  // cầu Bạch cong bắc qua sông, giếng ngọc bên bờ
  const br = archBridge(env, 12, 4.2, 1.9); br.rotation.y = PI / 2; br.position.set(0, wy - 0.2, riverZ); g.add(br);
  const well = new THREE.Group(); well.position.set(-17, yardY, riverZ - 8);
  well.add(mesh(cylUV(1.9, 2.0, 0.7, 20, 1, true), texMat(env, 'well', stoneTex('#8e887c'), 2, 0.4, { side: THREE.DoubleSide }), { pos: [0, 0.35, 0], cast: true }));
  const wellW = makeWater(env, new THREE.CircleGeometry(1.8, 20), { y: 0.1, deep: '#1e3a34', wave: 0.15, reflect: false }); well.add(wellW);
  g.add(well);
  // sân rồng lát đá, ba lối đi (lối giữa lát đá sáng hơn)
  const sanW = I ? c.W + 26 : 40, sanD = sanZ1 - sanZ0;
  g.add(paving(env, sanW, sanD, yardY + 0.02, '#9e968a', 'sanrong').translateZ((sanZ0 + sanZ1) / 2));
  for (const x of [-7, 0, 7]) g.add(paving(env, x ? 2.4 : 4, sanD, yardY + 0.04, '#b8b0a2', 'loidi').translateX(x).translateZ((sanZ0 + sanZ1) / 2));
  // Ngọ môn ba gian + hai nghê đá
  const ng = gate(env, { wall: '#8a3a22', tile: '#6a4030', under: '#3a140c', w: 4.6, h: 5.4 }); ng.position.set(0, yardY, sanZ1); g.add(ng);
  // cửa cả mặt trong (nhìn từ sân rồng ra)
  const doorM = env.std('gatedark', { color: '#1a120c', roughness: 1 });
  for (const [x, w, hh] of [[0, 4.6, 5.4], [-(2.3 + 1.656 + 0.1), 3.312, 4.05], [2.3 + 1.656 + 0.1, 3.312, 4.05]]) {
    const d = mesh(new THREE.PlaneGeometry(w * 0.5, hh * 0.62), doorM, { pos: [x, yardY + hh * 0.31, sanZ1 - 1.21] }); d.rotation.y = PI; g.add(d);
    const a = mesh(new THREE.CircleGeometry(w * 0.25, 16, 0, PI), doorM, { pos: [x, yardY + hh * 0.62, sanZ1 - 1.21] }); a.rotation.y = PI; g.add(a);
  }
  for (const s of [-1, 1]) { const n = stoneNghe(env, 1.1); n.position.set(s * 4.6, yardY, sanZ1 + 3); g.add(n); }
  // tường thành hình cánh cung ôm khu điện
  const arcWall = []; const RW = I ? Math.max(hw, hd) + 52 : 52;
  for (let i = 0; i <= 18; i++) { const a = lerp(-2.25, 2.25, i / 18) + PI; arcWall.push([Math.sin(a) * RW, Math.cos(a) * RW * 0.78]); }
  g.add(boundaryWall(env, arcWall, 2.2, '#b8a890', '#6a4030', false).translateY(yardY));
  for (const s of [-1, 1]) g.add(boundaryWall(env, [[s * RW * Math.sin(2.25), -Math.cos(2.25) * RW * 0.78], [s * (sanW / 2 + 1), sanZ1], [s * 8.6, sanZ1]], 2.2, '#b8a890', '#6a4030', false).translateY(yardY));
  // chính điện chữ Công: tiền điện (I: chính là gian đang đứng) – nhà thiêu hương – hậu điện
  const LAQ = { wall: '#8a2a18', door: '#7a1e10', frame: '#3a140c', col: '#8a2014', tile: '#6a4030', under: '#3a140c', ridgeCol: '#c89a50', stone: '#9a9286' };
  if (I) {
    const mid = hall(env, { ...LAQ, w: 10, d: 6, h: 6, plinth: -gy, steps: false, bays: 3 }); mid.position.set(0, gy, -hd - 6); g.add(mid);
    const back = hall(env, { ...LAQ, w: c.W * 0.82, d: 12, h: 7.5, plinth: -gy, steps: false, tiers: 2 }); back.position.set(0, gy, -hd - 18); g.add(back);
  } else {
    const front = hall(env, { ...LAQ, w: 22, d: 11, h: 5.6, plinth: 1.8, tiers: 2, stepW: 8, bays: 9 }); g.add(front);
    const mid = hall(env, { ...LAQ, w: 7, d: 5, h: 4.4, plinth: 1.8, steps: false, bays: 3 }); mid.position.z = -10; g.add(mid);
    const back = hall(env, { ...LAQ, w: 18, d: 9, h: 5, plinth: 1.8, steps: false, tiers: 2, bays: 7 }); back.position.z = -19; g.add(back);
  }
  // chín toà Thái miếu xếp hình cánh cung phía sau
  const tz = I ? -hd - 36 : -34, tr = I ? 30 : 24;
  for (let i = 0; i < 9; i++) {
    const a = lerp(-1.15, 1.15, i / 8), tm = hall(env, { ...LAQ, w: 6, d: 4.6, h: 3.2, plinth: 0.9, bays: 3, stepW: 2.4, ornament: 'gourd' });
    tm.position.set(Math.sin(a) * tr, yardY, tz + (1 - Math.cos(a)) * tr * 0.55); tm.rotation.y = -a * 0.6; g.add(tm);
  }
  // rừng lim, rừng Phú Lâm và hàng cây quanh sân
  const avoid = (x, z) => (Math.abs(x) < hw + 6 && z > -hd - (I ? 26 : 26) && z < sanZ1 + 4) || Math.abs(z - riverZ) < 7 || (z < tz + 10 && z > tz - 10 && Math.abs(x) < tr + 6) || Math.hypot(x + 17, z - riverZ + 8) < 4;
  const hy = (x, z) => h(x, z, Math.hypot(x, z), Math.atan2(x, z)) - 0.15;
  g.add(forest(env, 'broad', scatter(env.hq ? 120 : 70, { r0: 22, r1: 160, seed: 21, avoid, y: hy, s: [1.0, 1.6] }), { seed: 21 }));
  g.add(forest(env, 'bodhi', [[-sanW / 2 + 3, sanZ1 - 4], [sanW / 2 - 3, sanZ1 - 4], [-sanW / 2 + 3, sanZ0 + 4], [sanW / 2 - 3, sanZ0 + 4]].map(([x, z]) => ({ x, z, y: yardY, s: 1.1 })), { seed: 4 }));
  g.add(forest(env, 'pine', scatter(env.hq ? 60 : 30, { r0: 120, r1: 260, seed: 23, avoid, y: hy, s: [1.2, 1.8] }), { seed: 23, variants: 3 }));
  g.add(treeline(env, { rc: 330, width: 40, H: 18, seed: 9 }));
  if (!I) c.camera = { pos: [44, 20, 62], target: [0, 4, -6] };
  // khu di tích rộng: đi được ra ngoài Ngọ môn, qua cầu Bạch (máy chủ giới hạn toạ độ ±80 m)
  return { groundY: gy, walkR: 78 };
};

/* ---------- Đồi chùa ven biển: Linh Ứng Bãi Bụt, bán đảo Sơn Trà ---------- */
function roadSign(env, g, x, y, z, ry, a, b) {
  const p = new THREE.Group();
  p.add(mesh(new THREE.PlaneGeometry(3, 0.75), env.std('sign' + a + b, { map: signTex(a, b), roughness: 0.6, side: THREE.DoubleSide }), { pos: [0, 1.75, 0] }));
  p.add(mesh(merge([new THREE.BoxGeometry(0.12, 1.5, 0.12).translate(-1.3, 0.75, 0), new THREE.BoxGeometry(0.12, 1.5, 0.12).translate(1.3, 0.75, 0)]), env.std('plqPost', { color: '#3a2a1e', roughness: 0.8 })));
  p.position.set(x, y, z); p.rotation.y = ry; g.add(p);
}
// đường dạo vòng quanh khuôn viên rộng, thêm nhánh nối về sân, nhà nghỉ chân và cây bóng mát
function wideGarden(env, g, { h, gy, r, color, spokes, avoid, trees, seed, tile, col, under, wall }) {
  const ring = Array.from({ length: 73 }, (_, i) => { const t = (i / 72) * TAU, x = Math.sin(t) * r, z = Math.cos(t) * r; return { x, z, y: h(x, z) + 0.12 }; });
  g.add(paveRibbon(env, ring, 4, color));
  for (const [x0, z0, x1, z1] of spokes) {
    const pts = Array.from({ length: 16 }, (_, i) => { const x = lerp(x0, x1, i / 15), z = lerp(z0, z1, i / 15); return { x, z, y: h(x, z) + 0.12 }; });
    g.add(paveRibbon(env, pts, 3.4, color));
  }
  const blocks = [];
  for (const a of [0.75, 2.4, 3.9, 5.5]) {
    const x = Math.sin(a) * (r + 13), z = Math.cos(a) * (r + 13);
    const pv = hall(env, { w: 4, d: 4, h: 3, plinth: 0.4, ver: 0.6, over: 0.8, wall, door: '#8a2a16', frame: '#4a1a0e', col, tile, under, bays: 1 });
    pv.position.set(x, h(x, z), z); pv.rotation.y = a + PI; g.add(pv); blocks.push([x, z, 4.6]);
  }
  const clear = (x, z) => avoid(x, z) || Math.abs(Math.hypot(x, z) - r) < 4 || blocks.some(([a, b, c]) => Math.hypot(x - a, z - b) < c + 3);
  const y = (x, z) => h(x, z) - 0.05;
  for (const [kind, n, sc, sd] of trees) g.add(forest(env, kind, scatter(env.hq ? n : Math.ceil(n * 0.55), { r0: 34, r1: r + 24, seed: seed + sd, avoid: clear, y, s: sc }), { seed: seed + sd }));
  return blocks;
}
const boxDist = (x, z, x0, x1, z0, z1) => Math.hypot(x < x0 ? x0 - x : x > x1 ? x - x1 : 0, z < z0 ? z0 - z : z > z1 ? z - z1 : 0);
VIEWS.sontra = (c) => {
  const { env, g, I } = c;
  const hd = I ? c.D / 2 : 13;
  const gy = I ? -0.9 : 0, wy = gy - 52, X0 = -44, X1 = 44, Z0 = -18, Z1 = 50, ER = 108;
  const STONE = '#b4aa98', WHITE = '#e6e1d6';
  const yard = (x, z) => boxDist(x, z, X0, X1, Z0, Z1);
  const h = (x, z) => {
    const r = Math.hypot(x, z), a = Math.atan2(x, z), rough = fbm(x * 0.02, z * 0.02, 4, 3);
    // sau lưng là núi Sơn Trà, trước mặt sườn đổ xuống biển Đông
    let y = z > 120 ? gy - 1 - (z - 120) * 0.72 : z < -112 ? gy - 1 + (-112 - z) * 0.6 : gy - 1;
    y += Math.abs(x) > 112 ? -(Math.abs(x) - 112) * 0.3 * smooth(-40, 60, z) : 0;
    y += rough * Math.min(16, Math.max(0, r - ER) * 0.3);
    if (z < 40) y += ridge(a, r, { rc: 620, width: 200, H: 150, freq: 2.3, seed: 6 }) * smooth(20, -120, z);
    y = Math.max(y, wy - 5);
    y = lerp(gy - 0.05 + rough * 0.6, y, smooth(ER, ER + 26, r)); // đồi rộng đi dạo được
    const d = yard(x, z);
    return d < 10 ? lerp(gy - 0.05, y, smooth(0, 10, d)) : y;
  };
  const col = (t, x, y, z, ny) => terrCol(t, y, ny, { grass: '#4f7a34', forest: '#2a5226', rock: '#6f6a5c', sand: '#d8c89a', waterY: wy });
  const tmat = env.std('ground_sontra', { vertexColors: true, map: detailTex('grass'), roughness: 1 }, { detail: 0.05 });
  g.add(polarTerrain(env, { r0: 0.5, r1: 170, lin: true, segR: 90, segA: env.hq ? 240 : 150, h, col, mat: tmat }));
  g.add(polarTerrain(env, { r0: 170, r1: 1500, segR: 50, segA: 240, h, col }));
  g.add(makeWater(env, new THREE.PlaneGeometry(4000, 4000), { y: wy, deep: '#1c6f86', wave: 0.8 }));
  g.add(paving(env, X1 - X0, Z1 - Z0, gy, STONE, 'lupave').translateZ((Z0 + Z1) / 2));
  const edge = balustrade(env, Array.from({ length: 56 }, (_, i) => [Math.sin((i / 56) * TAU) * (ER + 1), Math.cos((i / 56) * TAU) * (ER + 1)]), 1, WHITE, true); edge.position.y = gy; g.add(edge);
  if (!I) {
    const hl = hall(env, { w: 26, d: 20, h: 7, plinth: 1, wall: '#e8d3a0', door: '#8a2a16', frame: '#5a2a16', col: '#b8352a', tile: '#9a4a26', under: '#5a3a24', ornament: 'dragon' });
    hl.position.set(0, gy, -2); g.add(hl);
    c.camera = { pos: [78, 26, 104], target: [8, 14, 6] };
  }
  /* tam quan và lối vào hai hàng La Hán đá trắng */
  const tq = gate(env, { wall: '#e8d3a0', tile: '#9a4a26', under: '#5a3a24', w: 4.6, h: 5.4 }); tq.position.set(0, gy, Z1 - 1); g.add(tq);
  roadSign(env, g, 10.5, gy, Z1 - 4, 0.2, 'CỔNG TAM QUAN', 'Chùa Vọng Hải · Sơn Trà, Đà Nẵng');
  const piles = [], arhats = [], z0 = hd + 7, dz = (Z1 - 5 - z0) / 8;
  for (let i = 0; i < 18; i++) {
    const k = i % 2 ? 1 : -1, x = k * 6.2, z = z0 + (i >> 1) * dz;
    piles.push(place(boxUV(1.8, 0.8, 1.8, 1), x, gy + 0.4, z));
    arhats.push(arhatGeo(i % 3, x, gy + 0.8, z, -k * PI / 2));
  }
  g.add(mesh(merge(piles), texMat(env, 'luPile', stoneTex('#a89e8c'), 0.5, 0.5), { cast: true }));
  g.add(mesh(merge(arhats), env.std('luArhat', { color: WHITE, roughness: 0.7 }), { cast: true }));
  roadSign(env, g, -11, gy, z0 + 2, 0.5, '18 VỊ LA HÁN', 'Đá trắng, mỗi vị một thần thái');
  /* tượng Quan Thế Âm trên đài sen, mặt hướng ra biển */
  const QX = 29, QZ = 20, QR = 9;
  const stoneW = env.std('luWhite', { map: texRepeat(stoneTex(WHITE), 3, 3), roughness: 0.85 });
  g.add(mesh(cylUV(QR, QR + 1, 1.6, 40, 2), stoneW, { pos: [QX, gy + 0.8, QZ], cast: true }));
  const petals = [];
  for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 18; i++) {
    const t = ((i + ring * 0.5) / 18) * TAU, R = QR - 1.2 - ring * 2.2;
    const p = new THREE.SphereGeometry(1, 10, 8); p.scale(1.5, 2.2, 0.7); p.rotateX(-0.45); p.rotateY(t);
    petals.push(place(p, QX + Math.sin(t) * R, gy + 2.6 + ring * 1.1, QZ + Math.cos(t) * R));
  }
  g.add(mesh(merge(petals), env.std('luPetal', { color: '#f4eee2', roughness: 0.6 }), { cast: true }));
  const qa = buildStatue('quanam', 'white', { halo: false });
  const qs = 40 / qa.userData.height;
  qa.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  qa.scale.setScalar(qs); qa.position.set(QX, gy + 3.2, QZ); g.add(qa);
  roadSign(env, g, QX - 11, gy, QZ + 11, -0.5, 'QUAN THẾ ÂM BỒ TÁT', 'Cao 67 m ngoài đời · hướng biển Đông');
  /* tháp Xá Lợi và cây xanh */
  const tw = tieredTower(env, { sides: 8, tiers: 7, r0: 3, rTop: 1.5, h0: 4, hTier: 2.8, hShrink: 0.2, face: 'plaster', color: '#e8dcc0', cornice: '#9a4a26', base: 1, finial: '#c8a040', finialH: 4 });
  tw.position.set(-29, gy, 20); g.add(tw);
  roadSign(env, g, -20, gy, 28, 0.5, 'THÁP XÁ LỢI', 'Bảy tầng, thờ xá lợi và tượng Phật');
  g.add(forest(env, 'bodhi', [[-38, 40], [38, 42], [-38, -8], [40, -10], [-16, 44], [17, 44]].map(([x, z]) => ({ x, z, y: gy, s: 1.05 })), { seed: 8 }));
  const garden = wideGarden(env, g, { h, gy, r: 78, color: '#b0a690', spokes: [[-44, 8, -78, 8], [44, 8, 78, 8], [0, 50, 0, 78]], avoid: (x, z) => yard(x, z) < 6 || Math.abs(x) < 3 && z > 50, trees: [['bodhi', 24, [0.8, 1.1], 1], ['broad', 30, [0.7, 1.1], 2], ['flower', 34, [0.7, 1], 3]], seed: 60, tile: '#9a4a26', col: '#b8352a', under: '#5a3a24', wall: '#e8d3a0' });
  const avoid = (x, z) => yard(x, z) < 3;
  const ground = (x, z) => { const y = h(x, z); return y > wy + 2 ? y - 0.1 : null; };
  g.add(forest(env, 'broad', scatter(env.hq ? 240 : 110, { r0: 118, r1: 420, seed: 41, avoid, y: ground, s: [0.9, 1.6] }), { seed: 41 }));
  g.add(rocks(env, [[60, h(60, 130), 130, 5, 0.7], [-62, h(-62, 136), 136, 6, 0.7], [20, h(20, 150), 150, 7, 0.7], [-24, h(-24, 162), 162, 6, 0.7]], '#77725f', 17));
  const bt = boats(env, 'sampan', 5, (t, off) => new V3(lerp(-600, 600, t), 0, 240 + off * 200), wy + 0.05, 0.004, 5);
  g.add(bt); c.upd.push(bt.userData.update);
  return { groundY: gy, walkR: ER, blocks: [[QX, QZ, QR + 1.2], [-29, 20, 5], ...garden], noGarden: (x, z) => yard(x, z) < 5 };
};

/* ---------- Miếu dưới chân núi: Bà Chúa Xứ Núi Sam, Châu Đốc ---------- */
VIEWS.nuisam = (c) => {
  const { env, g, I } = c;
  const gy = I ? -0.6 : 0, X0 = -40, X1 = 40, Z0 = -18, Z1 = 42, ER = 106;
  const STONE = '#a89e8c', TILE = '#2f7f6f', WALL = '#efdca4', RED = '#b03020', UNDER = '#4a2616';
  const yard = (x, z) => boxDist(x, z, X0, X1, Z0, Z1 + 14);
  const h = (x, z) => {
    const r = Math.hypot(x, z), a = Math.atan2(x, z);
    // đồng bằng phẳng, núi Sam một mình nhô lên sau lưng miếu; xa xa là dãy Thất Sơn
    const dn = Math.hypot(x * 0.9, z + 240);
    let y = gy - 0.5 + fbm(x * 0.012, z * 0.012, 3, 2) * 0.7;
    y += 175 * Math.exp(-((dn / 175) ** 2)) * (0.86 + fbm(x * 0.012, z * 0.012, 4, 7) * 0.32);
    y += ridge(a, r, { rc: 1050, width: 230, H: 150, freq: 3.3, seed: 12 }) * smooth(120, -180, z);
    y = lerp(gy - 0.05 + fbm(x * 0.03, z * 0.03, 2, 4) * 0.5, y, smooth(ER, ER + 30, r)); // khuôn viên rộng đi dạo được
    const d = yard(x, z);
    return d < 14 ? lerp(gy - 0.05, y, smooth(0, 14, d)) : y;
  };
  const col = (t, x, y, z, ny) => {
    if (Math.hypot(x, z) < ER + 4) { t.set('#6f9a42'); t.multiplyScalar(0.92 + nz(x * 0.08, z * 0.08, 3) * 0.12); return; }
    if (y < gy + 2) { const k = Math.abs(Math.floor(x / 36) + Math.floor(z / 26)) % 3; t.set(['#7aa23c', '#90ad48', '#a8b352'][k]); t.multiplyScalar(0.94 + nz(x * 0.08, z * 0.08, 3) * 0.1); return; }
    terrCol(t, y, ny, { grass: '#4f7032', forest: '#2c5228', rock: '#6f6a5a' });
  };
  const tmat = env.std('ground_nuisam', { vertexColors: true, map: detailTex('grass'), roughness: 1 }, { detail: 0.05 });
  g.add(polarTerrain(env, { r0: 0.5, r1: 170, lin: true, segR: 90, segA: env.hq ? 240 : 150, h, col, mat: tmat }));
  g.add(polarTerrain(env, { r0: 170, r1: 1500, segR: 56, segA: 256, h, col }));
  g.add(paving(env, X1 - X0, Z1 - Z0, gy, STONE, 'nspave').translateZ((Z0 + Z1) / 2));
  g.add(paving(env, 130, 12, gy - 0.01, '#7c776c', 'nsroad').translateZ(Z1 + 7));
  const edge = balustrade(env, Array.from({ length: 56 }, (_, i) => [Math.sin((i / 56) * TAU) * (ER + 1), Math.cos((i / 56) * TAU) * (ER + 1)]), 1, '#c8bc9e', true); edge.position.y = gy; g.add(edge);
  const roofTop = (y, w, d, rh) => { const rf = hipRoof(env, { w, d, h: rh, tile: TILE, under: UNDER, ornament: 'dragon', ridgeCol: '#e0b84a' }); rf.position.y = y; return rf; };
  if (!I) {
    const hl = hall(env, { w: 28, d: 24, h: 7, plinth: 0.8, wall: WALL, door: '#8a2a16', frame: '#5a2a16', col: RED, tile: TILE, under: UNDER, ornament: 'dragon' });
    hl.position.set(0, gy, 0); g.add(hl);
    c.camera = { pos: [50, 20, 84], target: [0, 9, 0] };
  }
  /* mái tam cấp lợp ngói xanh, dáng sen nở: hai tầng mái dựng trên mái chính */
  const W = I ? c.W : 28, D = I ? c.D : 24, H = I ? c.H : 8, y0 = gy + (I ? 0.6 : 0) + H + Math.min(W, D) * 0.2 + 2;
  const bandM = texMat(env, 'nsband', plasterTex(WALL), 1, 1);
  g.add(mesh(boxUV(W * 0.5, 3, D * 0.5, 2), bandM, { pos: [0, y0 + 1.5, 0], cast: true }));
  g.add(roofTop(y0 + 3, W * 0.68, D * 0.68, 4));
  g.add(mesh(boxUV(W * 0.26, 2.6, D * 0.26, 2), bandM, { pos: [0, y0 + 7.4, 0], cast: true }));
  g.add(roofTop(y0 + 8.7, W * 0.42, D * 0.42, 4));
  /* cổng, lư hương lớn, đèn lồng đỏ */
  const gt = gate(env, { wall: WALL, tile: TILE, under: UNDER, w: 4.8, h: 5.4 }); gt.position.set(0, gy, Z1 - 1); g.add(gt);
  roadSign(env, g, 10, gy, Z1 - 4, 0.25, 'MIẾU BÀ THẤT SƠN', 'Di tích quốc gia · Châu Đốc, An Giang');
  const burner = new THREE.LatheGeometry([[0, 0], [1.3, 0], [1.4, 0.3], [0.9, 0.7], [1.6, 1.2], [1.8, 2], [1.5, 2.3], [0, 2.2]].map(([a, b]) => new THREE.Vector2(a, b)), 20);
  g.add(mesh(burner, env.std('nsBurner', { color: '#6a5230', roughness: 0.45, metalness: 0.7 }), { pos: [0, gy, D / 2 + 13], cast: true }));
  const posts = [], lamps = [];
  for (const k of [-1, 1]) for (let i = 0; i < 6; i++) {
    const x = k * 12, z = D / 2 + 7 + i * ((Z1 - D / 2 - 11) / 5);
    posts.push(place(new THREE.CylinderGeometry(0.09, 0.12, 3.6, 8), x, gy + 1.8, z));
    const l = new THREE.SphereGeometry(0.42, 12, 10); l.scale(1, 0.85, 1); lamps.push(place(l, x, gy + 3.25, z));
  }
  g.add(mesh(merge(posts), env.std('nsPost', { color: '#4a2e1c', roughness: 0.8 }), { cast: true }));
  g.add(mesh(merge(lamps), env.std('nsLamp', { color: '#e23a24', emissive: '#c8200f', emissiveIntensity: 0.65, roughness: 0.5 })));
  /* phố lễ vật bên đường */
  const R = mulberry(77), walls = [], roofs = [], shopBlocks = [];
  for (const k of [-1, 1]) for (let i = 0; i < 6; i++) {
    const w = 7 + R() * 3, H2 = 3.4 + R() * 2.6, d = 8, x = k * (26 + i * 11), z = Z1 + 20 + R() * 2;
    shopBlocks.push([x, z, 6.5]);
    walls.push(addColor(place(boxUV(w, H2, d, 3), x, gy + H2 / 2, z), ['#efe4cc', '#e8d6b0', '#dfe6d4', '#f0dcc4'][i % 4]));
    roofs.push(addColor(place(boxUV(w + 1, 0.3, d + 2.4, 3), x, gy + H2 + 0.12, z - 0.6, 0, -0.08), ['#b9472a', '#3f8a78', '#c8782e'][i % 3]));
  }
  const house = env.std('nsHouse', { vertexColors: true, roughness: 0.9 });
  g.add(mesh(merge(walls), house, { cast: true }), mesh(merge(roofs), house, { cast: true }));
  /* lăng Thoại Ngọc Hầu nằm đối diện miếu */
  const lang = hall(env, { w: 13, d: 9, h: 3.8, plinth: 1.6, wall: '#b8ac90', door: '#4a3020', frame: '#2e1c10', col: '#7a6a50', tile: '#6a5a48', under: '#3a2a1c', stone: '#6f7a78', bays: 3, stepW: 7 });
  lang.position.set(0, gy, Z1 + 27); lang.rotation.y = PI; g.add(lang);
  roadSign(env, g, 11, gy, Z1 + 16, 3.4, 'LĂNG THOẠI NGỌC HẦU', 'Đối diện Miếu Bà · di tích quốc gia');
  /* cây */
  g.add(forest(env, 'bodhi', [[-33, 36], [33, 36], [-33, -8], [33, -8], [-24, 30], [24, 30]].map(([x, z]) => ({ x, z, y: gy, s: 1 })), { seed: 6 }));
  const garden = wideGarden(env, g, { h, gy, r: 84, color: '#a89e8c', spokes: [[-40, 10, -84, 10], [40, 10, 84, 10], [0, -18, 0, -84]], avoid: (x, z) => yard(x, z) < 6 || Math.abs(z - (Z1 + 22)) < 15, trees: [['palm', 30, [0.8, 1.2], 1], ['bodhi', 18, [0.8, 1.1], 2], ['flower', 30, [0.7, 1], 3]], seed: 70, tile: TILE, col: RED, under: UNDER, wall: WALL });
  const avoid = (x, z) => yard(x, z) < 3 || (Math.abs(z - (Z1 + 22)) < 12);
  const ground = (x, z) => h(x, z) - 0.1;
  g.add(forest(env, 'broad', scatter(env.hq ? 260 : 120, { r0: 116, r1: 460, seed: 51, avoid: (x, z) => avoid(x, z) || h(x, z) < gy + 3, y: ground, s: [1, 1.7] }), { seed: 51 }));
  g.add(forest(env, 'palm', scatter(env.hq ? 90 : 45, { r0: 116, r1: 360, seed: 52, avoid: (x, z) => avoid(x, z) || h(x, z) > gy + 2, y: ground, s: [0.9, 1.3] }), { seed: 52 }));
  return { groundY: gy, walkR: ER, blocks: [[0, D / 2 + 13, 2.2], [0, Z1 + 27, 10], ...shopBlocks, ...garden], noGarden: (x, z) => yard(x, z) < 5 || Math.hypot(x, z - Z1 - 27) < 14 || (z > Z1 + 12 && z < Z1 + 28) };
};

/* ---------- Quần thể ven hồ giữa núi đá vôi: hồ lớn, ba điện đá, vườn cột kinh ---------- */
VIEWS.cuuphong = (c) => {
  const { env, g, I } = c;
  const gy = I ? -0.7 : 0, wy = gy - 3, X0 = -68, X1 = 68, Z0 = -24, Z1 = 106, ER = 150;
  const STONE = '#8c877c', WALL = '#77726a', TILE = '#51453a', UNDER = '#2e241c', COL = '#5c4a38';
  const hd = I ? c.D / 2 : 14, ponds = [[-84, 64, 17], [84, 64, 17]];
  const yard = (x, z) => boxDist(x, z, X0, X1, Z0, hd + 20);
  const axis = (x, z) => boxDist(x, z, -24, 24, hd + 20, Z1 + 4);
  const h = (x, z) => {
    const r = Math.hypot(x, z), a = Math.atan2(x, z), rough = fbm(x * 0.02, z * 0.02, 3, 11);
    let y = gy - 0.05 + rough * 0.8 * smooth(0, 16, Math.min(yard(x, z), axis(x, z)));
    for (const [px, pz, pr] of ponds) { const d = Math.hypot(x - px, z - pz); if (d < pr + 3) y = lerp(wy - 1, y, smooth(pr - 2, pr + 3, d)); }
    // ngoài khuôn viên: trước mặt là hồ, sau lưng là dãy núi đá
    const far = wy - 4 + smooth(40, -130, z) * (18 + ridge(a, r, { rc: 560, width: 240, H: 150, freq: 3.1, seed: 8 }));
    return lerp(y, far, smooth(ER + 3, ER + 30, r));
  };
  const col = (t, x, y, z, ny) => terrCol(t, y, ny, { grass: '#5d8238', forest: '#2f5428', rock: '#77736a', sand: '#9a8d6c', waterY: wy });
  const tmat = env.std('ground_cuuphong', { vertexColors: true, map: detailTex('grass'), roughness: 1 }, { detail: 0.05 });
  g.add(polarTerrain(env, { r0: 0.5, r1: 200, lin: true, segR: 100, segA: env.hq ? 260 : 160, h, col, mat: tmat }));
  g.add(polarTerrain(env, { r0: 200, r1: 1500, segR: 50, segA: 240, h, col }));
  g.add(makeWater(env, new THREE.PlaneGeometry(4000, 4000), { y: wy, deep: '#1f6a68', wave: 0.5 }));
  for (const [px, pz, pr] of ponds) {
    g.add(makeWater(env, new THREE.CircleGeometry(pr + 1, 36), { y: gy - 1.1, deep: '#264e3e', wave: 0.3, reflect: false }).translateX(px).translateY(-pz));
    g.add(lotusPatch(env, scatter(env.hq ? 70 : 34, { r0: 0, r1: pr - 2, seed: 6, s: [0.4, 0.75] }).map((p) => ({ ...p, x: p.x + px, z: p.z + pz })), gy - 1.1));
  }
  // núi đá vôi mọc lên từ mặt hồ, càng xa càng cao
  const R = mulberry(31), kl = [];
  for (let i = 0; i < (env.hq ? 44 : 24); i++) {
    const t = R() * TAU, rr = 230 + R() * 520;
    kl.push([Math.sin(t) * rr, Math.cos(t) * rr, 45 + (rr - 230) * 0.12 + R() * 60, wy - 2, 0.7 + R() * 0.5]);
  }
  g.add(karstField(env, kl, 23));
  g.add(paving(env, X1 - X0, hd + 20 - Z0, gy, STONE, 'cppave').translateZ((Z0 + hd + 20) / 2));
  g.add(paving(env, 48, Z1 + 4 - hd - 20, gy, '#a09a8c', 'cpaxis').translateZ((Z1 + 4 + hd + 20) / 2));
  const edge = balustrade(env, Array.from({ length: 72 }, (_, i) => [Math.sin((i / 72) * TAU) * (ER + 1), Math.cos((i / 72) * TAU) * (ER + 1)]), 1, '#a8a294', true); edge.position.y = gy; g.add(edge);
  const hallO = { wall: WALL, door: '#3e2a1c', frame: '#2a1c12', col: COL, tile: TILE, under: UNDER, stone: '#6f6a60', ornament: 'dragon' };
  if (!I) {
    const hl = hall(env, { ...hallO, w: 30, d: 24, h: 8, tiers: 2, plinth: 1.2 }); hl.position.set(0, gy, 0); g.add(hl);
    c.camera = { pos: [76, 34, 150], target: [0, 8, 34] };
  }
  /* hai điện đá hai bên điện chính */
  for (const k of [-1, 1]) { const hl = hall(env, { ...hallO, w: 24, d: 18, h: 7, tiers: 2, plinth: 1.2, stepW: 9 }); hl.position.set(k * 50, gy, -3); g.add(hl); }
  roadSign(env, g, -38, gy, 14, 0.3, 'ĐIỆN QUAN ÂM', 'Vách đá chạm kể chuyện Phật');
  roadSign(env, g, 38, gy, 14, -0.3, 'ĐIỆN GIÁO CHỦ', 'Tượng đồng nguyên khối');
  /* vạc đồng và bồ đề trước sân */
  const urn = new THREE.LatheGeometry([[0, 0], [1.1, 0], [1.3, 0.5], [1, 0.9], [2.1, 1.6], [2.4, 2.8], [2.2, 3.5], [1.8, 3.4], [0, 3]].map(([a, b]) => new THREE.Vector2(a, b)), 22);
  g.add(mesh(urn, env.std('cpUrn', { color: '#6a5230', roughness: 0.42, metalness: 0.72 }), { pos: [0, gy, hd + 13], cast: true }));
  g.add(forest(env, 'bodhi', [[-14, hd + 13], [14, hd + 13]].map(([x, z]) => ({ x, z, y: gy, s: 1.2 })), { seed: 12 }));
  /* vườn cột kinh: 32 cột đá dọc trục vào */
  const parts = [], blocks = [];
  for (let i = 0; i < 8; i++) for (const k of [-1, 1]) for (const xx of [9, 18]) {
    const x = k * xx, z = hd + 26 + (i / 7) * (Z1 - hd - 34);
    parts.push(place(boxUV(2.6, 0.7, 2.6, 1), x, gy + 0.35, z), place(cylUV(0.72, 0.82, 11, 8, 1), x, gy + 6.2, z), place(cylUV(1.25, 0.72, 0.7, 8, 1), x, gy + 12, z), place(new THREE.ConeGeometry(0.85, 1.6, 8).toNonIndexed(), x, gy + 13.2, z));
    blocks.push([x, z, 1.7]);
  }
  g.add(mesh(merge(parts.map((x) => (x.index ? x.toNonIndexed() : x))), texMat(env, 'cpColumn', stoneTex('#6c6a64'), 1, 2), { cast: true }));
  roadSign(env, g, 4.5, gy, hd + 24, -0.3, 'VƯỜN CỘT KINH', '32 cột đá khắc lời kinh');
  const tq = gate(env, { wall: '#9a948a', tile: TILE, under: UNDER, w: 6, h: 7 }); tq.position.set(0, gy, Z1); g.add(tq);
  roadSign(env, g, 12, gy, Z1 - 5, 0.25, 'CHÙA CỬU PHONG', 'Hồ lớn giữa muôn đỉnh núi đá');
  /* gian chùa ngọc và ngọn tháp ở vườn sau */
  const jade = hall(env, { w: 9, d: 8, h: 3.6, plinth: 0.9, ver: 0.8, over: 1, wall: '#d6e6d8', door: '#3e6a5a', frame: '#2a4a40', col: '#5e9c86', tile: '#3f8a74', under: '#2a4a40', bays: 3, ornament: 'gourd' });
  jade.position.set(-60, gy, -62); jade.rotation.y = 0.5; g.add(jade);
  roadSign(env, g, -50, gy, -50, 0.5, 'GIAN CHÙA NGỌC', 'Nơi tịnh tâm sau vườn');
  const tw = tieredTower(env, { sides: 8, tiers: 7, r0: 4, rTop: 2, h0: 5, hTier: 3.2, hShrink: 0.2, face: 'plaster', color: '#a7a397', cornice: TILE, base: 1.2, finial: '#c8a040', finialH: 4 });
  tw.position.set(60, gy, -62); g.add(tw);
  const pos = [[-60, -62, 7.5], [60, -62, 6.5], [0, hd + 13, 2.8], ...ponds.map(([x, z, r]) => [x, z, r + 0.5])];
  const nope = (x, z) => yard(x, z) < 6 || axis(x, z) < 4 || pos.some(([a, b, r]) => Math.hypot(x - a, z - b) < r + 4);
  const garden = wideGarden(env, g, { h, gy, r: 124, color: '#a09a8c', spokes: [[-68, 8, -124, 8], [68, 8, 124, 8], [0, Z1 + 4, 0, 124], [0, -24, 0, -124]], avoid: nope, trees: [['bodhi', 40, [0.8, 1.15], 1], ['broad', 80, [0.7, 1.15], 2], ['flower', 60, [0.7, 1], 3]], seed: 80, tile: TILE, col: COL, under: UNDER, wall: '#a39d90' });
  const ground = (x, z) => { const y = h(x, z); return y > wy + 1 ? y - 0.1 : null; };
  g.add(forest(env, 'broad', scatter(env.hq ? 200 : 90, { r0: 155, r1: 520, seed: 81, avoid: (x, z) => z > 20, y: ground, s: [1, 1.7] }), { seed: 81 }));
  const bt = boats(env, 'sampan', 7, (t, off) => new V3(lerp(-700, 700, t), 0, 200 + off * 300), wy + 0.05, 0.004, 8);
  g.add(bt); c.upd.push(bt.userData.update);
  return { groundY: gy, walkR: ER, blocks: [...pos, [-50, -3, 16], [50, -3, 16], ...blocks, ...garden], noGarden: (x, z) => nope(x, z) };
};

/* ---------- Đồi thông cao nguyên: rồng và cột khảm mảnh sành, tháp chuông bảy tầng, đồi hoa ---------- */
function mosaicTex() {
  return ctex('mosaic', 512, 512, (g, w, h) => {
    const R = mulberry(9), cols = ['#1f7f62', '#2aa39a', '#e6b52e', '#d4552a', '#2a5fb8', '#f4ead2', '#6fb544', '#b52a3e', '#17594a'];
    g.fillStyle = '#1b4f45'; g.fillRect(0, 0, w, h);
    for (let y = -16; y < h + 16; y += 22) for (let x = -16; x < w + 16; x += 22) {
      const cx = x + 11 + R() * 5, cy = y + 11 + R() * 5, n = 3 + Math.floor(R() * 3), r = 11 + R() * 5, a0 = R() * TAU;
      g.fillStyle = cols[Math.floor(R() * cols.length)];
      g.beginPath();
      for (let i = 0; i < n; i++) { const a = a0 + (i / n) * TAU + (R() - 0.5) * 0.6; g[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
      g.closePath(); g.fill();
    }
  });
}
VIEWS.hoangoc = (c) => {
  const { env, g, I } = c;
  const gy = I ? -0.7 : 0, X0 = -54, X1 = 54, Z0 = -24, Z1 = 78, ER = 140;
  const TILE = '#b5552c', WALL = '#f0d48a', RED = '#a8321f', UNDER = '#5a2e1a';
  const hd = I ? c.D / 2 : 14, pond = [-82, 42, 15];
  const yard = (x, z) => boxDist(x, z, X0, X1, Z0, Z1);
  const h = (x, z) => {
    const r = Math.hypot(x, z), a = Math.atan2(x, z), d = yard(x, z);
    // đồi thoai thoải đi dạo được; ngoài khuôn viên là những quả đồi thông nối nhau
    let y = gy - 0.05 + (fbm(x * 0.016, z * 0.016, 3, 6) + 0.2) * 5 * smooth(2, 44, d);
    const dp = Math.hypot(x - pond[0], z - pond[1]);
    if (dp < pond[2] + 5) y = lerp(gy - 2.4, y, smooth(pond[2] - 2, pond[2] + 5, dp));
    const hills = gy + 3 + (r - ER) * 0.14 + fbm(x * 0.008, z * 0.008, 4, 3) * 34 + ridge(a, r, { rc: 620, width: 260, H: 150, freq: 2.7, seed: 14 });
    return lerp(y, hills, smooth(ER + 2, ER + 40, r));
  };
  const col = (t, x, y, z, ny) => terrCol(t, y, ny, { grass: '#5f8a3a', forest: '#2d5530', rock: '#6f6a5a' });
  const tmat = env.std('ground_hoangoc', { vertexColors: true, map: detailTex('grass'), roughness: 1 }, { detail: 0.05 });
  g.add(polarTerrain(env, { r0: 0.5, r1: 190, lin: true, segR: 100, segA: env.hq ? 260 : 160, h, col, mat: tmat }));
  g.add(polarTerrain(env, { r0: 190, r1: 1500, segR: 50, segA: 240, h, col }));
  g.add(makeWater(env, new THREE.CircleGeometry(pond[2] + 1, 36), { y: gy - 1.1, deep: '#2a5a60', wave: 0.3, reflect: false }).translateX(pond[0]).translateY(-pond[1]));
  g.add(paving(env, X1 - X0, Z1 - Z0, gy, '#b4a890', 'hnpave').translateZ((Z0 + Z1) / 2));
  const mos = env.std('hnMosaic', { map: mosaicTex(), roughness: 0.45, metalness: 0.15 });
  if (!I) {
    const hl = hall(env, { w: 26, d: 22, h: 7, tiers: 2, plinth: 1, wall: WALL, door: '#7a2a16', frame: '#4a1e10', col: RED, tile: TILE, under: UNDER, ornament: 'dragon' });
    hl.position.y = gy; g.add(hl);
    c.camera = { pos: [62, 28, 118], target: [-4, 10, 24] };
  }
  /* rồng khảm uốn lượn bên trái lối vào, dài 49 m như ngoài đời */
  const pts = [], blocks = [], fins = [];
  for (let i = 0; i <= 22; i++) {
    const t = i / 22, z = lerp(Z1 - 6, hd + 12, t), x = -25 + Math.sin(t * PI * 2.4) * 6, y = gy + 2.1 + Math.sin(t * PI * 5) * 1.25;
    pts.push(new V3(x, y, z)); blocks.push([x, z, 2.2]);
    if (i % 2 && i < 21) fins.push(place(new THREE.ConeGeometry(0.42, 1.25, 5), x, y + 1.15, z));
    if (i % 7 === 3) for (const k of [-1, 1]) fins.push(place(cylUV(0.3, 0.42, y - gy, 7, 1), x + k * 0.8, (y + gy) / 2, z));
  }
  const body = (t) => 0.22 + Math.sin(Math.min(1, t * 1.6) * PI * 0.5) * 0.92;
  g.add(mesh(taperTube(pts, body, 10, 110, 0.18), mos, { cast: true }));
  const H0 = pts[pts.length - 1], head = [...fins];
  const skull = new THREE.SphereGeometry(1.75, 14, 10); skull.scale(1, 0.92, 1.35);
  head.push(place(skull, H0.x, H0.y + 0.35, H0.z - 0.9), place(boxUV(1.9, 0.75, 2.8, 1), H0.x, H0.y + 0.55, H0.z - 3.1), place(boxUV(1.6, 0.34, 2.3, 1), H0.x, H0.y - 0.45, H0.z - 2.8, 0, -0.2));
  for (const k of [-1, 1]) {
    head.push(place(new THREE.ConeGeometry(0.3, 2.8, 7), H0.x + k * 0.85, H0.y + 2.5, H0.z - 0.1, 0, -0.55, k * 0.28));
    head.push(place(new THREE.ConeGeometry(0.1, 2.4, 5), H0.x + k * 1, H0.y + 0.6, H0.z - 4.4, 0, 1.25, k * 0.55)); // râu
  }
  g.add(mesh(merge(head.map((x) => (x.index ? x.toNonIndexed() : x))), mos, { cast: true }));
  const eyes = []; for (const k of [-1, 1]) eyes.push(place(new THREE.SphereGeometry(0.32, 10, 8), H0.x + k * 1, H0.y + 1, H0.z - 2.05));
  g.add(mesh(merge(eyes), env.std('hnEye', { color: '#f4c63a', emissive: '#a86a10', emissiveIntensity: 0.5, roughness: 0.3 })));
  /* bồn hoa khảm dọc trục vào, hàng thông che bóng */
  const beds = [], blooms = [], R0 = mulberry(44);
  for (const k of [-1, 1]) for (let i = 0; i < 5; i++) {
    const x = k * 8, z = hd + 16 + i * ((Z1 - hd - 28) / 4);
    beds.push(place(boxUV(3.2, 0.9, 5, 1), x, gy + 0.45, z)); blocks.push([x, z - 1.3, 2.3], [x, z + 1.3, 2.3]);
    for (let j = 0; j < 26; j++) blooms.push(addColor(place(new THREE.IcosahedronGeometry(0.17 + R0() * 0.1, 1).toNonIndexed(), x + (R0() - 0.5) * 2.5, gy + 1.05 + R0() * 0.2, z + (R0() - 0.5) * 4.2), ['#d94f6c', '#f0c23a', '#b06ad8', '#f4f0e4'][j % 4]));
  }
  g.add(mesh(merge(beds.map((x) => (x.index ? x.toNonIndexed() : x))), mos, { cast: true }), mesh(merge(blooms), env.std('hnBloom', { vertexColors: true, roughness: 0.8 })));
  g.add(forest(env, 'pine', [[-44, 26], [-46, 48], [-44, 68], [46, 72], [46, -8], [-46, -10], [18, 70], [-16, -20], [16, -20]].map(([x, z]) => ({ x, z, y: gy, s: 1.15 })), { seed: 33 }));
  roadSign(env, g, -13, gy, hd + 42, 0.5, 'RỒNG VE CHAI', 'Khảm từ vỏ chai, mảnh sành');
  /* hai cột rồng khảm trước cửa và đài chuông lớn */
  for (const k of [-1, 1]) { g.add(mesh(cylUV(0.8, 0.9, 8.5, 14, 2), mos, { pos: [k * 9, gy + 4.25, hd + 5], cast: true })); blocks.push([k * 9, hd + 5, 1.5]); }
  const tw = tieredTower(env, { sides: 8, tiers: 7, r0: 5, rTop: 2.5, h0: 6, hTier: 3.8, hShrink: 0.18, face: 'plaster', color: '#efd9a0', cornice: TILE, base: 1.6, finial: '#c8a040', finialH: 5 });
  tw.position.set(30, gy, 44); g.add(tw); blocks.push([30, 44, 7.5]);
  roadSign(env, g, 18, gy, 54, -0.5, 'THÁP CHUÔNG BẢY TẦNG', 'Vọng tiếng chuông khắp đồi thông');
  const BX = 31, BZ = 12;
  g.add(columns(env, [[-3.5, -3.5], [3.5, -3.5], [-3.5, 3.5], [3.5, 3.5]].map(([x, z]) => [BX + x, BZ + z]), 5.2, 0.28, RED));
  const rf = hipRoof(env, { w: 10, d: 10, h: 3, tile: TILE, under: UNDER, ornament: 'gourd' }); rf.position.set(BX, gy + 5.2, BZ); g.add(rf);
  const bell = new THREE.LatheGeometry([[0, 3.5], [0.65, 3.4], [0.9, 2.6], [1, 1.5], [1.25, 0.4], [1.55, 0]].map(([a, b]) => new THREE.Vector2(a, b)), 26);
  g.add(mesh(bell, env.std('hnBell', { color: '#6a5428', roughness: 0.4, metalness: 0.75, side: THREE.DoubleSide }), { pos: [BX, gy + 1.3, BZ], cast: true }));
  blocks.push([BX, BZ, 5.4]);
  /* tượng Quan Thế Âm trắng trên đồi sau chùa */
  const QZ = -66;
  const qa = buildStatue('quanam', 'white', { halo: false }); qa.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  const qy = h(0, QZ); qa.scale.setScalar(16 / qa.userData.height); qa.position.set(0, qy + 1.3, QZ); g.add(qa);
  g.add(mesh(cylUV(5, 5.6, 1.4, 28, 2), env.std('hnBase', { map: texRepeat(stoneTex('#e6e0d2'), 3, 3), roughness: 0.85 }), { pos: [0, qy + 0.6, QZ], cast: true }));
  blocks.push([0, QZ, 6.2]);
  const tq = gate(env, { wall: WALL, tile: TILE, under: UNDER, w: 5, h: 5.8 }); tq.position.set(0, gy, Z1); g.add(tq);
  roadSign(env, g, 10.5, gy, Z1 - 4, 0.25, 'CHÙA HOA NGỌC', 'Đà Lạt · ngàn mảnh sành thành hoa');
  /* đồi hoa cẩm tú cầu: những bụi tròn tím xanh */
  const R = mulberry(61), bush = [];
  const fields = [[72, 24, 24], [-68, -46, 22], [74, -58, 20]];
  for (const [fx, fz, fr] of fields) for (let i = 0; i < (env.hq ? 380 : 140); i++) {
    const t = R() * TAU, rr = Math.sqrt(R()) * fr, x = fx + Math.sin(t) * rr, z = fz + Math.cos(t) * rr, s = 0.42 + R() * 0.36;
    if (((x - fx) * 0.5 + z) % 5 < 1.1) continue; // chừa luống đi giữa đồi hoa
    bush.push(addColor(place(new THREE.IcosahedronGeometry(s, 1).toNonIndexed(), x, h(x, z) + s * 0.3, z), ['#7f78d6', '#5f8fe0', '#b08ad8', '#e088b8'][Math.floor(R() * 4)]));
  }
  g.add(mesh(merge(bush), env.std('hnBush', { vertexColors: true, roughness: 0.85 })));
  const pos = [[pond[0], pond[1], pond[2] + 0.5], ...fields];
  const nope = (x, z) => yard(x, z) < 6 || pos.some(([a, b, r]) => Math.hypot(x - a, z - b) < r + 3) || Math.hypot(x, z - QZ) < 11;
  const garden = wideGarden(env, g, { h, gy, r: 112, color: '#ab9f88', spokes: [[-54, 8, -112, 8], [54, 8, 112, 8], [0, Z1, 0, 112], [0, -24, 0, -56]], avoid: nope, trees: [['pine', 130, [0.9, 1.4], 1], ['flower', 34, [0.7, 1], 3]], seed: 90, tile: TILE, col: RED, under: UNDER, wall: WALL });
  const ground = (x, z) => h(x, z) - 0.1;
  g.add(forest(env, 'pine', scatter(env.hq ? 460 : 200, { r0: 146, r1: 560, seed: 91, y: ground, s: [1, 1.8] }), { seed: 91, variants: 4 }));
  return { groundY: gy, walkR: ER, blocks: [...blocks, ...garden], noGarden: nope };
};

// hướng nắng riêng cho ảnh mô hình (để mặt tiền được chiếu sáng)
const MODEL_MOOD = { lamkinh: { az: 50, el: 30 }, tranho: { az: 70, el: 24 }, thienmau: { az: 40, el: 7 }, nhattru: { az: 60, el: 40 }, huongson: { az: 40, el: 38, fogBase: -3, fogHF: 0.02 }, baison: { az: 55, el: 32 }, vinhan: { az: 40, el: 50 }, doivang: { az: 60, el: 34 }, linhson: { az: 50, el: 30 } };
const VIEW_OF = { linhung: 'sontra', nuisam: 'nuisam', lamkinh: 'citadel', nhattru: 'pond', tranho: 'lake', huongson: 'cave', dinhmay: 'clouds', baison: 'mountain', thienmau: 'river', vinhan: 'palm', doivang: 'garden', linhson: 'baden', kimson: 'fansipan', cuuphong: 'cuuphong', hoangoc: 'hoangoc' };

function disposeGroup(g) {
  const geos = new Set(), mats = new Set();
  g.traverse((o) => {
    if (o.isReflector) { o.dispose(); return; }
    if (o.geometry) geos.add(o.geometry);
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => mats.add(m));
    if (o.isInstancedMesh) o.dispose();
  });
  geos.forEach((x) => x.dispose());
  mats.forEach((m) => {
    for (const k of ['map', 'emissiveMap']) if (m[k] && !m[k].userData?.shared) m[k].dispose();
    m.dispose();
  });
}

/* =====================================================================
   API
   ===================================================================== */
// Thế giới bên ngoài chánh điện (chánh điện đặt tại gốc toạ độ, sàn y = 0)
export function buildSurroundings(scene, theme, quality = 'high') {
  const view = theme.view || 'garden';
  const env = makeEnv(view, quality);
  const g = new THREE.Group(); g.name = 'surroundings';
  g.add(makeSky(env, true));
  const [W, D, H] = theme.size;
  const c = { env, g, I: true, W, D, H, theme, upd: [] };
  const res = (VIEWS[view] || VIEWS.garden)(c);
  c.gy = res.groundY ?? 0;
  let style = HALL_STYLE.wood;
  if (theme.wall !== 'rock') style = hallShell(c);
  scene.add(g);
  // nền trời làm màu dự phòng; sương mù cảnh quan do shader riêng xử lý, sương scene chỉ cho nội thất
  const bg = env.U.uHorizon.value.clone();
  scene.background = bg;
  const fogC = new THREE.Color(theme.fog || '#140c08');
  scene.fog = new THREE.Fog(fogC, Math.max(W, D) * 1.0, Math.max(W, D) * 2.6);
  const wallMat = theme.wall === 'rock' ? null : env.std('outerwall', { map: texRepeat(plasterTex(style.outer), 0.4, 0.4), roughness: 0.9, metalness: theme.wall === 'bronze' ? 0.5 : 0 });
  return {
    group: g, env,
    groundY: c.gy,
    walkR: res.walkR || 0,
    blocks: res.blocks || null,
    noGarden: res.noGarden || null,
    forest: (kind, list, o) => forest(env, kind, list, o),
    cable: c.cable || null,
    mouth: theme.wall === 'rock' ? { ...CAVE_MOUTH, z: D / 2 + CAVE_MOUTH.zOff } : null,
    sun: { dir: env.sunDir.clone(), color: env.sunColor.clone(), intensity: env.sunI },
    outerWallMaterial: wallMat,
    material: (params, o) => env.std(null, params, o),
    boostSun(i) { env.U.uSunBoost.value.copy(env.sunColor).multiplyScalar(i); },
    update(dt, time) { env.U.uTime.value = time; for (const u of c.upd) u(dt, time); },
    dispose() { scene.remove(g); disposeGroup(g); },
  };
}

// Mô hình ngoại thất ngôi chùa cho thẻ xem trước trên bản đồ
export function buildTempleModel(templeId, theme = {}, opts = {}) {
  const view = theme.view || VIEW_OF[templeId] || 'garden';
  const quality = opts.quality || (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches ? 'low' : 'high');
  const env = makeEnv(view, quality, { far: 2000, fogScale: 0.55, mood: MODEL_MOOD[templeId] });
  const g = new THREE.Group(); g.name = 'templeModel:' + templeId;
  g.add(makeSky(env, false));
  const c = { env, g, I: false, theme, upd: [], camera: null };
  (VIEWS[view] || VIEWS.garden)(c);
  const sun = new THREE.DirectionalLight(env.sunColor, env.sunI);
  sun.position.copy(env.sunDir).multiplyScalar(90);
  sun.castShadow = true;
  sun.shadow.mapSize.set(env.hq ? 2048 : 1024, env.hq ? 2048 : 1024);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 220 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
  g.add(sun, sun.target);
  const cam = c.camera || { pos: [20, 10, 30], target: [0, 4, 0] };
  return {
    group: g,
    camera: { pos: cam.pos, target: cam.target, fov: 40, far: 2000 },
    update(dt, time) { env.U.uTime.value = time; for (const u of c.upd) u(dt, time); },
    dispose() { g.parent?.remove(g); disposeGroup(g); },
  };
}

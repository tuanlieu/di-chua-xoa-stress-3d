// Thẻ "khoe" thành tích (ảnh 1080x1350) + chia sẻ Facebook / Zalo / hệ thống
const loadImg = (src) => new Promise((ok, err) => { const i = new Image(); i.onload = () => ok(i); i.onerror = err; i.src = src; });

export const shareUrl = (user) => `${location.origin}${location.pathname}?ref=${encodeURIComponent(user?.id || 1)}`;

// chữ vẽ lên canvas: bỏ thẻ HTML/SVG (headline, icon phái có thể là <svg>)
const plain = (s) => String(s ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

export async function makeCard({ user, sect, temple, headline, shot }) {
  const W = 1080, H = 1350;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#2a160a'); bg.addColorStop(1, '#0e0804');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);

  // ảnh chánh điện
  if (shot) {
    try {
      const img = await loadImg(shot);
      const bw = W - 80, bh = 700, s = Math.max(bw / img.width, bh / img.height);
      g.save(); g.beginPath(); g.roundRect(40, 40, bw, bh, 36); g.clip();
      g.drawImage(img, 40 + (bw - img.width * s) / 2, 40 + (bh - img.height * s) / 2, img.width * s, img.height * s);
      const fade = g.createLinearGradient(0, 480, 0, 740);
      fade.addColorStop(0, 'rgba(14,8,4,0)'); fade.addColorStop(1, 'rgba(14,8,4,.92)');
      g.fillStyle = fade; g.fillRect(40, 40, bw, bh);
      g.restore();
    } catch {}
  }
  const glow = g.createRadialGradient(W / 2, 760, 0, W / 2, 760, 520);
  glow.addColorStop(0, 'rgba(246,190,90,.28)'); glow.addColorStop(1, 'rgba(246,190,90,0)');
  g.fillStyle = glow; g.fillRect(0, 300, W, 900);

  g.textAlign = 'center';
  g.fillStyle = '#f6d27e'; g.font = '600 34px -apple-system, Segoe UI, Roboto, sans-serif';
  g.fillText('☸  NIỆM PHẬT ONLINE', W / 2, 100);

  g.font = '800 64px -apple-system, Segoe UI, Roboto, sans-serif';
  g.fillStyle = '#fff4dc';
  g.fillText(plain(headline), W / 2, 660, W - 120);

  g.font = '700 58px Georgia, serif'; g.fillStyle = '#ffe08a';
  g.fillText(user.name, W / 2, 810, W - 120);
  g.font = '500 34px -apple-system, Segoe UI, Roboto, sans-serif'; g.fillStyle = '#e8cfa0';
  g.fillText(plain(`${sect?.icon || ''} ${sect?.name || ''} · Cấp ${user.level} · ${user.honor || user.title}`), W / 2, 866, W - 120);

  const st = user.stats || {};
  const tiles = [
    ['🙇', st.bows || 0, 'lạy'], ['📿', st.rounds || 0, 'chuỗi hạt'],
    ['🧘', st.meditateMin || 0, 'phút thiền'], ['🔥', user.streak || 0, 'ngày liên tiếp'],
  ];
  const tw = (W - 80 - 3 * 20) / 4;
  tiles.forEach(([ic, n, label], i) => {
    const x = 40 + i * (tw + 20), y = 920;
    g.fillStyle = 'rgba(255,255,255,.07)'; g.beginPath(); g.roundRect(x, y, tw, 190, 28); g.fill();
    g.font = '44px serif'; g.fillStyle = '#fff'; g.fillText(ic, x + tw / 2, y + 60);
    g.font = '800 50px -apple-system, Segoe UI, Roboto, sans-serif'; g.fillStyle = '#ffe08a'; g.fillText(Number(n).toLocaleString('vi-VN'), x + tw / 2, y + 125);
    g.font = '500 24px -apple-system, Segoe UI, Roboto, sans-serif'; g.fillStyle = '#c9b089'; g.fillText(label, x + tw / 2, y + 162);
  });

  g.font = '500 30px -apple-system, Segoe UI, Roboto, sans-serif'; g.fillStyle = '#e8cfa0';
  g.fillText(temple ? `Tại ${temple}` : 'Lên chùa mọi lúc, mọi nơi', W / 2, 1190);
  g.fillStyle = '#f6d27e'; g.beginPath(); g.roundRect(W / 2 - 300, 1230, 600, 76, 38); g.fill();
  g.font = '700 32px -apple-system, Segoe UI, Roboto, sans-serif'; g.fillStyle = '#3a2205';
  g.fillText(`Trải nghiệm tại ${location.host || 'Đi Chùa Xõa Stress 3D'}`, W / 2, 1280);

  return new Promise((ok) => c.toBlob((b) => ok({ blob: b, url: URL.createObjectURL(b) }), 'image/jpeg', 0.9));
}

export async function nativeShare(blob, text, url) {
  if (!navigator.share) return false;
  const file = new File([blob], 'niemphat.jpg', { type: 'image/jpeg' });
  const data = navigator.canShare?.({ files: [file] }) ? { files: [file], text: `${text}\n${url}` } : { text, url };
  try { await navigator.share(data); return true; } catch (e) { return e.name === 'AbortError' ? null : false; }
}

export function facebookShare(url) {
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'width=640,height=640');
}

export async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; } catch { return false; }
}

export function download(url, name = 'niemphat.jpg') {
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
}

// Mưa cánh sen (DOM, nhẹ)
export function petalShower(n = 36, chars = ['🌸', '🌸', '✨']) {
  const layer = document.createElement('div');
  layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:46;overflow:hidden';
  document.body.appendChild(layer);
  for (let i = 0; i < n; i++) {
    const p = document.createElement('span');
    const size = 14 + Math.random() * 16, dur = 2.8 + Math.random() * 2.2, x = Math.random() * 100;
    p.textContent = chars[(Math.random() * chars.length) | 0];
    p.style.cssText = `position:absolute;left:${x}vw;top:-40px;font-size:${size}px;opacity:.95;transition:transform ${dur}s cubic-bezier(.3,.6,.5,1),opacity ${dur}s;`;
    layer.appendChild(p);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      p.style.transform = `translate(${(Math.random() - 0.5) * 30}vw, ${105 + Math.random() * 10}vh) rotate(${Math.random() * 720 - 360}deg)`;
      p.style.opacity = '0.2';
    }));
  }
  setTimeout(() => layer.remove(), 5500);
}

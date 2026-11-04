// Bản đồ hành hương: bản đồ Việt Nam kéo/thu phóng được, tuyến chùa, ấn chùa và mô hình 3D ngoại thất từng chùa.
import * as THREE from 'three';
import { ic } from './icons.js';

// Đường viền đất liền Việt Nam (giản lược, kinh độ/vĩ độ)
const VN = [[102.14, 22.4], [102.6, 22.73], [103.3, 22.78], [103.96, 22.5], [104.5, 22.8], [105.0, 23.1], [105.35, 23.35], [105.9, 22.95], [106.7, 22.86], [106.6, 22.4], [107.0, 21.95], [107.5, 21.6], [108.0, 21.55],
  [107.4, 21.2], [106.8, 20.8], [106.5, 20.3], [106.0, 19.9], [105.8, 19.3], [105.7, 18.9], [106.2, 18.3], [106.5, 17.8], [107.1, 17.1], [107.8, 16.6], [108.3, 16.0], [108.8, 15.4], [109.1, 14.8], [109.3, 13.8], [109.3, 12.8], [109.2, 12.0], [108.8, 11.3], [108.0, 10.7], [107.2, 10.4], [106.8, 10.3], [106.6, 9.8], [106.2, 9.3], [105.4, 8.7], [104.8, 8.6], [104.8, 9.3], [105.0, 9.9], [104.5, 10.4],
  [105.1, 10.9], [105.8, 11.0], [106.2, 11.5], [106.4, 11.9], [107.5, 12.3], [107.6, 13.5], [107.5, 14.5], [107.6, 15.4], [107.2, 15.9], [106.8, 16.4], [106.3, 17.2], [105.6, 18.0], [105.1, 18.7], [104.4, 19.2], [104.0, 19.4], [104.4, 19.8], [104.6, 20.3], [104.0, 20.6], [103.2, 20.8], [102.9, 21.2], [102.6, 21.7]];
// Vị trí hiển thị (đã giãn cụm Hà Nội cho dễ chạm) – [kinh độ, vĩ độ]
const POS = { linhung: [108.15, 15.75], nuisam: [105.05, 10.75], kimson: [103.45, 22.15], lamkinh: [104.6, 19.4], tranho: [104.9, 22.45], nhattru: [104.2, 21.85], dinhmay: [107.3, 21.15], huongson: [104.0, 20.85], baison: [104.9, 20.25], thienmau: [107.7, 16.45], vinhan: [106.7, 10.85], doivang: [105.8, 9.45], linhson: [105.75, 11.55], cuuphong: [106.0, 20.75], hoangoc: [108.45, 12.0] };
const REAL = { linhung: [108.277, 16.1], nuisam: [105.07, 10.68], kimson: [103.775, 22.303], lamkinh: [105.41, 19.93], nhattru: [105.834, 21.036], tranho: [105.837, 21.048], huongson: [105.75, 20.62], dinhmay: [106.72, 21.15], baison: [105.86, 20.27], thienmau: [107.545, 16.453], vinhan: [106.68, 10.79], doivang: [105.97, 9.59], linhson: [106.17, 11.38], cuuphong: [105.82, 20.56], hoangoc: [108.5, 11.87] };

const W = 640, H = 900, L0 = 101.8, L1 = 113.6, B0 = 8.1, B1 = 23.6;
const px = ([lon, lat]) => [((lon - L0) / (L1 - L0)) * W, ((B1 - lat) / (B1 - B0)) * H];

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// Địa hình trang trí: núi Tây Bắc, Trường Sơn, Tây Nguyên và hai con sông lớn
const PEAKS = [[103.1, 21.9], [103.7, 22.2], [104.2, 21.6], [103.5, 21.4], [104.8, 22.2], [105.6, 22.5], [106.2, 22.2], [105.3, 18.9], [105.9, 18.1], [106.4, 17.5], [107.3, 16.2], [107.9, 15.2], [108.2, 14.2], [108.3, 13.1], [108.0, 12.3]];
const RIVERS = [[[103.6, 22.55], [104.6, 21.8], [105.85, 21.05], [106.55, 20.3]], [[105.1, 10.9], [105.7, 10.4], [106.4, 9.65]]];
const poly = (pts) => pts.map((p) => px(p).map((v) => v.toFixed(1)).join(',')).join(' ');
// Pin vẽ quanh gốc toạ độ để co giãn riêng, giữ kích thước dễ chạm khi phóng to bản đồ
function pinSvg(t, { visited, current, selected, route, duyenId, online, friends, stamps }) {
  const v = visited.has(t.id), on = t.id === selected, here = t.id === current, duyen = t.id === duyenId;
  const col = here ? '#5fd47a' : v ? '#f2c46d' : '#e8743a';
  const ring = ['#2a1a0c', '#2a1a0c', '#b98149', '#dfe6ea', '#fff2b0'][stamps[t.id]?.level || 0];
  const lw = t.name.length * 10.6 + 14, n = online[t.id] || 0, fr = friends[t.id]?.length || 0;
  const [x, y] = px(POS[t.id] || [106, 16]), [rx, ry] = px(REAL[t.id] || POS[t.id]);
  return `<g class="pinb${on ? ' on' : ''}${route && !route.temples.includes(t.id) ? ' dim' : ''}" data-id="${t.id}">
    <line x1="${rx.toFixed(1)}" y1="${ry.toFixed(1)}" x2="${x}" y2="${y}" stroke="rgba(255,240,200,.55)" stroke-width="1.5" stroke-dasharray="3 3" vector-effect="non-scaling-stroke"/>
    <circle class="real" data-r="3" cx="${rx.toFixed(1)}" cy="${ry.toFixed(1)}" r="3" fill="#fff"/>
    <g class="pinh" data-x="${x}" data-y="${y}" transform="translate(${x} ${y})">
      ${on ? `<circle class="halo" r="20" fill="${col}"/>` : ''}
      ${duyen ? '<circle class="duyen" r="19" fill="none" stroke="#ffe08a" stroke-width="3"/>' : ''}
      <circle r="${on ? 17 : 14}" fill="${col}" stroke="${ring}" stroke-width="${(stamps[t.id]?.level || 0) > 1 ? 3.5 : 2.5}"/>
      <use href="#i-temple" x="-10" y="-10" width="20" height="20" color="#2a1a0c"/>
      <g class="plab"><rect x="20" y="-15" rx="10" width="${lw}" height="30" fill="rgba(20,14,8,.82)" stroke="${on ? col : 'rgba(255,255,255,.15)'}" stroke-width="1.5"/>
      <text x="27" y="6" fill="#fff" font-size="18" font-weight="700">${esc(t.name)}</text></g>
      ${n ? `<circle cx="11" cy="-12" r="8.5" fill="#35b45a" stroke="#10301a" stroke-width="1.5"/><text x="11" y="-8" fill="#fff" font-size="11" font-weight="800" text-anchor="middle">${n > 99 ? '99' : n}</text>` : ''}
      ${fr ? `<circle cx="-11" cy="-12" r="8.5" fill="#4d8fd6" stroke="#10243a" stroke-width="1.5"/><text x="-11" y="-8" fill="#fff" font-size="11" font-weight="800" text-anchor="middle">${fr}</text>` : ''}
      <rect x="-22" y="-22" width="44" height="44" fill="transparent"/>
    </g>
  </g>`;
}
function routeSvg(route, visited) {
  if (!route) return '';
  const pts = route.temples.filter((id) => POS[id]);
  return pts.slice(1).map((id, i) => {
    const [x1, y1] = px(POS[pts[i]]), [x2, y2] = px(POS[id]), done = visited.has(id) && visited.has(pts[i]);
    return `<line class="rt${done ? ' done' : ''}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  }).join('');
}
function mapSvg(temples, o) {
  const islands = (lon, lat, n, seed) => Array.from({ length: n }, (_, i) => {
    const [x, y] = px([lon + Math.sin(i * 2.3 + seed) * 0.7, lat + Math.cos(i * 1.7 + seed) * 0.6]);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${1.6 + (i % 3) * 0.6}" fill="#c9b27c"/>`;
  }).join('');
  const [hx, hy] = px([112.2, 16.4]), [tx, ty] = px([112.4, 11.2]), [sx, sy] = px([110.9, 13.8]);
  const peaks = PEAKS.map((p) => { const [x, y] = px(p); return `<path d="M${(x - 9).toFixed(1)} ${(y + 6).toFixed(1)}l9 -14 9 14z" fill="#4c6a3e" stroke="rgba(255,255,255,.18)" stroke-width="1"/>`; }).join('');
  return `<svg class="map-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
    <defs>
      <linearGradient id="land" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5f7f4a"/><stop offset=".55" stop-color="#7d8f52"/><stop offset="1" stop-color="#6f9a54"/></linearGradient>
      <filter id="sh"><feDropShadow dx="0" dy="3" stdDeviation="4" flood-opacity=".45"/></filter>
    </defs>
    <rect width="${W}" height="${H}" fill="#12333f"/>
    ${Array.from({ length: 14 }, (_, i) => `<path d="M0 ${60 + i * 62} q150 -14 300 0 t300 0" stroke="rgba(255,255,255,.04)" fill="none"/>`).join('')}
    <polygon points="${poly(VN)}" fill="url(#land)" stroke="#e8d9a6" stroke-width="2" stroke-linejoin="round" filter="url(#sh)"/>
    ${peaks}
    ${RIVERS.map((r) => `<polyline points="${poly(r)}" fill="none" stroke="#7fc2d8" stroke-width="2" stroke-linecap="round" opacity=".75"/>`).join('')}
    ${islands(112.2, 16.4, 9, 1)}${islands(112.4, 11.2, 12, 4)}
    <text x="${hx}" y="${hy + 34}" text-anchor="middle" fill="#e8d9a6" font-size="17" font-style="italic">QĐ. Hoàng Sa</text>
    <text x="${tx}" y="${ty + 36}" text-anchor="middle" fill="#e8d9a6" font-size="17" font-style="italic">QĐ. Trường Sa</text>
    <text x="${sx}" y="${sy}" text-anchor="middle" fill="rgba(232,217,166,.42)" font-size="20" font-style="italic" letter-spacing="4">Biển Đông</text>
    <g text-anchor="middle" fill="#f6d27a" font-size="14" font-weight="700">
      <text x="${tx}" y="${sy + 22}">Trường Sa, Hoàng Sa</text><text x="${tx}" y="${sy + 39}">là của Việt Nam</text>
      <text x="${tx}" y="${sy + 58}" font-size="12" font-weight="500" font-style="italic">Truong Sa, Hoang Sa</text><text x="${tx}" y="${sy + 73}" font-size="12" font-weight="500" font-style="italic">belong to Vietnam</text>
    </g>
    <text x="${W - 24}" y="${H - 24}" text-anchor="end" fill="rgba(232,217,166,.5)" font-size="16" letter-spacing="3">VIỆT NAM</text>
    ${routeSvg(o.route, o.visited)}
    ${temples.map((t) => pinSvg(t, o)).join('')}
  </svg>`;
}

// Kéo để di chuyển, chụm hai ngón / lăn chuột để thu phóng: chỉ đổi viewBox nên pin giữ nguyên, không vẽ lại
function panZoom(svg, view, onTap) {
  const pts = new Map();
  let start = null, tween = 0;
  const apply = () => {
    view.x = Math.max(0, Math.min(W - view.w, view.x)); view.y = Math.max(0, Math.min(H - view.w * (H / W), view.y));
    svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.w * (H / W)}`);
    const s = Math.pow(view.w / W, 0.72); // pin nhỏ lại chậm hơn bản đồ: phóng to thì cụm chùa tách nhau ra
    svg.querySelectorAll('.pinh').forEach((g) => g.setAttribute('transform', `translate(${g.dataset.x} ${g.dataset.y}) scale(${s.toFixed(3)})`));
    svg.querySelectorAll('circle.real').forEach((c) => c.setAttribute('r', (3 * s).toFixed(2)));
  };
  const unit = () => { const r = svg.getBoundingClientRect(); return Math.max(view.w / r.width, (view.w * (H / W)) / r.height); };
  const zoomAt = (cx, cy, nw) => {
    nw = Math.max(W / 6, Math.min(W, nw));
    const r = svg.getBoundingClientRect(), u = unit();
    const mx = view.x + (cx - r.left - r.width / 2) * u + view.w / 2, my = view.y + (cy - r.top - r.height / 2) * u + (view.w * (H / W)) / 2;
    const k = nw / view.w;
    view.x = mx - (mx - view.x) * k; view.y = my - (my - view.y) * k; view.w = nw;
    apply();
  };
  const spread = () => { const [a, b] = [...pts.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };
  svg.onpointerdown = (e) => {
    cancelAnimationFrame(tween);
    if (e.isPrimary) pts.clear(); // ngón đầu tiên: bỏ các ngón cũ bị mất pointerup, nếu không chạm sẽ bị hiểu nhầm là chụm phóng to
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    start = pts.size === 1 ? { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y } : pts.size === 2 ? { ...spread(), w: view.w } : start;
    view.moved = false;
  };
  svg.onpointermove = (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) { const s = spread(); view.moved = true; zoomAt(s.x, s.y, start.w * (start.d / Math.max(1, s.d))); return; }
    if (pts.size !== 1 || !start || start.w) return;
    if (!view.moved && Math.hypot(e.clientX - start.x, e.clientY - start.y) < (e.pointerType === 'mouse' ? 6 : 12)) return; // ngón tay luôn rung nhẹ khi chạm
    if (!view.moved) { view.moved = true; svg.setPointerCapture?.(e.pointerId); }
    const u = unit();
    view.x = start.vx - (e.clientX - start.x) * u; view.y = start.vy - (e.clientY - start.y) * u;
    apply();
  };
  svg.onpointerup = svg.onpointercancel = (e) => {
    const tap = e.type === 'pointerup' && pts.size === 1 && pts.has(e.pointerId) && !view.moved;
    pts.delete(e.pointerId);
    if (tap) onTap?.(e.clientX, e.clientY);
    if (pts.size === 1) { const [p] = pts.values(); start = { x: p.x, y: p.y, vx: view.x, vy: view.y }; } else if (!pts.size) start = null;
  };
  svg.onwheel = (e) => { e.preventDefault(); zoomAt(e.clientX, e.clientY, view.w * (e.deltaY > 0 ? 1.15 : 0.87)); };
  const flyTo = (x, y, w) => {
    cancelAnimationFrame(tween);
    const a = { ...view }, t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / 450), e = 1 - (1 - k) ** 3;
      view.x = a.x + (x - a.x) * e; view.y = a.y + (y - a.y) * e; view.w = a.w + (w - a.w) * e;
      apply();
      if (k < 1) tween = requestAnimationFrame(step);
    };
    tween = requestAnimationFrame(step);
  };
  apply();
  return {
    zoom: (f) => { const r = svg.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, view.w * f); },
    fit: (ids) => {
      const ps = ids.map((id) => px(POS[id])).filter(Boolean);
      if (!ps.length) return flyTo(0, 0, W);
      const xs = ps.map((p) => p[0]), ys = ps.map((p) => p[1]);
      const w = Math.max(W / 2.6, Math.min(W, Math.max(Math.max(...xs) - Math.min(...xs) + 280, (Math.max(...ys) - Math.min(...ys) + 200) * (W / H))));
      flyTo((Math.min(...xs) + Math.max(...xs)) / 2 - w / 2 + 70, (Math.min(...ys) + Math.max(...ys)) / 2 - (w * (H / W)) / 2, w);
    },
    reset: () => flyTo(0, 0, W),
  };
}

// Khung xem mô hình 3D ngoại thất (tự xoay, kéo để xoay)
function modelViewer(canvas, templeId, theme, onReady) {
  let alive = true, raf = 0, model = null, renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); } catch { return { dispose() {} }; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#bcd4e6');
  const cam = new THREE.PerspectiveCamera(38, 1, 0.1, 600);
  const target = new THREE.Vector3(0, 3, 0);
  let yaw = 0.6, pitch = 0.32, dist = 30, drag = null;
  const size = () => { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  canvas.onpointerdown = (e) => { drag = { x: e.clientX, y: e.clientY, yaw, pitch }; };
  canvas.onpointermove = (e) => { if (!drag) return; yaw = drag.yaw - (e.clientX - drag.x) * 0.01; pitch = Math.max(0.05, Math.min(1.2, drag.pitch + (e.clientY - drag.y) * 0.006)); };
  canvas.onpointerup = canvas.onpointerleave = () => (drag = null);
  canvas.onwheel = (e) => { e.preventDefault(); dist = Math.max(8, Math.min(120, dist * (1 + Math.sign(e.deltaY) * 0.1))); };

  import('./exterior.js').then(({ buildTempleModel }) => {
    if (!alive) return;
    model = buildTempleModel(templeId, theme);
    scene.add(model.group);
    requestAnimationFrame(() => requestAnimationFrame(() => onReady?.()));
    if (model.camera) {
      target.fromArray(model.camera.target);
      const off = new THREE.Vector3().fromArray(model.camera.pos).sub(target);
      dist = off.length(); yaw = Math.atan2(off.x, off.z); pitch = Math.asin(off.y / dist);
    }
    if (!model.group.getObjectByProperty('isLight', true)) {
      scene.add(new THREE.HemisphereLight('#fff6e0', '#4a5a3a', 1.2));
      const sun = new THREE.DirectionalLight('#ffe7c0', 2.2); sun.position.set(20, 30, 15); scene.add(sun);
    }
  }).catch((e) => console.warn('exterior', e));

  let last = performance.now();
  const loop = (t) => {
    if (!alive) return;
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    if (!drag) yaw += dt * 0.12;
    size();
    cam.position.set(target.x + Math.sin(yaw) * Math.cos(pitch) * dist, target.y + Math.sin(pitch) * dist, target.z + Math.cos(yaw) * Math.cos(pitch) * dist);
    cam.lookAt(target);
    model?.update?.(dt, t / 1000);
    renderer.render(scene, cam);
  };
  raf = requestAnimationFrame(loop);
  return {
    dispose() {
      alive = false; cancelAnimationFrame(raf);
      model?.dispose?.();
      scene.traverse((o) => { o.geometry?.dispose(); [].concat(o.material || []).forEach((m) => { m.map?.dispose(); m.dispose(); }); });
      renderer.dispose(); renderer.forceContextLoss?.();
    },
  };
}

const NO_PILGRIM = { today: null, visitedToday: [], stamps: {}, tiers: [], routes: [], temples: {}, friends: {}, journal: { days: 0, rows: [] } };
const rewardLine = (r = {}, items = {}) => [r.sen && `${ic('sen')} ${r.sen}`, r.ngoc && `${ic('ngoc')} ${r.ngoc}`, ...Object.entries(r.items || {}).map(([k, n]) => `${n} ${esc(items[k]?.name || k)}`)].filter(Boolean).join(' · ');
const sealText = (name) => name.replace(/^(Chùa Bà|Chùa|Động|Thiền viện)\s+/, '').split(/\s+/).map((w) => w[0]).join('').slice(0, 3);
const shortDate = (d) => (d ? d.slice(8) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4) : '');

export function openMap({ temples, stories = {}, visited, current, focus, online = {}, pilgrim, items = {}, onEnter, onStory, onClaim, onShare }) {
  let el = document.getElementById('mapView');
  if (!el) { el = document.createElement('section'); el.id = 'mapView'; el.className = 'mapview'; document.body.appendChild(el); }
  el.classList.remove('hidden');
  let p = pilgrim || NO_PILGRIM;
  let selected = focus || current || temples[0].id, viewer = null, tab = 'map', routeId = '', collapsed = innerWidth < 600 && innerHeight > innerWidth, pz = null;
  const view = { x: 0, y: 0, w: W, moved: false };
  const nameOf = (id) => temples.find((t) => t.id === id)?.name || '';
  const route = () => p.routes.find((r) => r.id === routeId) || null;
  const duyenId = () => p.today?.duyen?.id;

  const stopViewer = () => { viewer?.dispose(); viewer = null; };
  const close = () => { stopViewer(); el.classList.add('hidden'); el.innerHTML = ''; };

  const todayStrip = () => {
    const d = p.today;
    if (!d) return '';
    const l = d.lunar, up = l.major || l.next;
    const holy = l.holy ? `<span class="tchip holy">${ic('spark')} ${esc(l.holy.name)} · ×${l.holy.mult} công đức</span>`
      : up ? `<span class="tchip">${ic('sun')} Âm lịch ${esc(l.label)} · còn ${up.inDays} ngày đến ${esc(up.name)}</span>` : `<span class="tchip">${ic('sun')} Âm lịch ${esc(l.label)}</span>`;
    const went = p.visitedToday.includes(d.duyen.id);
    return `<div class="map-today">${holy}
      <button class="tchip duyen${went ? ' ok' : ''}" id="mvDuyen">${ic(went ? 'check' : 'lotus')} Chùa duyên: <b>${esc(nameOf(d.duyen.id))}</b>${went ? ' · đã nhận' : ` · ${rewardLine(d.duyen.reward, items)}`}</button>
      <span class="tchip">Mai: ${esc(nameOf(d.duyen.tomorrow))}</span></div>`;
  };

  const cardHtml = (t) => {
    const st = stories[t.id] || {}, s = p.stamps[t.id], w = p.temples[t.id], fr = p.friends[t.id] || [];
    const stamp = s ? `<div class="mc-stamp"><span class="seal mini lv${s.level}">${esc(sealText(t.name))}</span><div><b>Ấn ${esc(s.tier)}</b> · đã về ${s.days} ngày${s.next ? `<div class="bar"><i style="width:${(s.days / s.next.days) * 100}%"></i></div><small>Còn ${s.next.days - s.days} ngày đến ấn ${esc(s.next.name)} · ${rewardLine(s.next.reward, items)}</small>` : '<small>Bạn đã đạt bậc ấn cao nhất của chùa này</small>'}</div></div>` : '';
    return `
      <div class="mv-wrap"${collapsed ? ' hidden' : ''}><canvas id="mvCanvas"></canvas><div class="mv-load" id="mvLoad">Đang dựng mô hình chùa…</div></div>
      <div class="mc-body">
        <div class="mc-title"><button class="mc-nav" data-step="-1" aria-label="Chùa trước">${ic('back')}</button><h4>${esc(t.name)}</h4><button class="mc-nav next" data-step="1" aria-label="Chùa sau">${ic('back')}</button><button class="mc-nav fold${collapsed ? ' up' : ''}" id="mvFold" aria-label="Thu gọn">${ic('back')}</button></div>
        <div class="tags">${t.id === duyenId() ? `<span class="tag gold">${ic('lotus')} Chùa duyên hôm nay</span>` : ''}${online[t.id] ? `<span class="tag green"><i class="dot"></i> ${online[t.id]} đang online</span>` : ''}${fr.length ? `<span class="tag blue">${ic('users')} ${esc(fr.map((f) => f.name).slice(0, 2).join(', '))}${fr.length > 2 ? ` +${fr.length - 2}` : ''} đang ở đây</span>` : ''}${visited.has(t.id) ? `<span class="tag">${ic('check')} Đã viếng</span>` : '<span class="tag gold">Chưa viếng · +10 công đức</span>'}</div>
        <div class="mc-more"${collapsed ? ' hidden' : ''}>
          <div class="real">${ic('pin')} ${esc(t.place)} · Gợi cảm hứng từ <b>${esc(st.real || t.inspired)}</b>${st.founded ? ` · ${esc(st.founded)}` : ''}</div>
          <p class="mc-intro">${esc(st.intro || t.description)}</p>
          ${stamp}
          ${w ? `<div class="mc-week">${ic('medal')} Hộ tự tuần: <b>${esc(w.top.name)}</b> (${w.top.score.toLocaleString('vi-VN')})<small>${w.people} người tu tập ở đây tuần này</small></div>` : `<div class="mc-week">${ic('medal')} Tuần này chưa có Hộ tự. Bạn có thể là người đầu tiên.</div>`}
        </div>
        <div class="row-btns">
          ${t.id === current ? `<button class="btn ghost" id="mvBack">${ic('back')} Về chánh điện</button>` : `<button class="btn gold" id="mvGo">${ic('pray')} Vào chùa</button>`}
          <button class="btn ghost" id="mvStory">${ic('story')} Sự tích chùa</button>
        </div>
      </div>`;
  };

  const drawCard = () => {
    stopViewer();
    const card = el.querySelector('.map-card'), t = temples.find((x) => x.id === selected);
    if (!card || !t) return;
    card.innerHTML = cardHtml(t);
    card.classList.toggle('collapsed', collapsed);
    card.querySelector('#mvBack')?.addEventListener('click', close);
    card.querySelector('#mvGo')?.addEventListener('click', () => { close(); onEnter(t.id); });
    card.querySelector('#mvStory').onclick = () => onStory(t.id);
    card.querySelector('#mvFold').onclick = () => { collapsed = !collapsed; drawCard(); };
    card.querySelectorAll('[data-step]').forEach((b) => (b.onclick = () => {
      const i = temples.findIndex((x) => x.id === selected);
      select(temples[(i + +b.dataset.step + temples.length) % temples.length].id);
    }));
    if (collapsed) return;
    const ld = card.querySelector('#mvLoad'), cv = card.querySelector('#mvCanvas');
    setTimeout(() => { if (!cv.isConnected || viewer) return; viewer = modelViewer(cv, t.id, t.theme, () => ld.classList.add('done')); }, 60);
  };

  const drawSvg = () => {
    const area = el.querySelector('.map-area');
    area.querySelector('.map-svg')?.remove();
    area.insertAdjacentHTML('afterbegin', mapSvg(temples, { visited, current, selected, route: route(), duyenId: duyenId(), online, friends: p.friends, stamps: p.stamps }));
    const svg = area.querySelector('.map-svg');
    // Chọn ghim gần điểm chạm nhất, không theo ghim nằm trên cùng: cụm chùa miền Bắc chồng lên nhau
    pz = panZoom(svg, view, (cx, cy) => {
      let best = null, bd = Infinity;
      svg.querySelectorAll('.pinb').forEach((g) => {
        const m = g.querySelector('.pinh').getScreenCTM(), d = Math.hypot(m.e - cx, m.f - cy);
        if (d < Math.max(24, 22 * m.a) && d < bd) { best = g.dataset.id; bd = d; }
      });
      if (best) select(best);
    });
    // chỉ chuột mới cần: chuyển nút trong DOM giữa lúc chạm có thể làm mất cú chạm trên điện thoại
    svg.querySelectorAll('.pinb').forEach((g) => { g.onpointerenter = (e) => { if (e.pointerType === 'mouse') g.parentNode.appendChild(g); }; }); // chùa đang trỏ vào nổi lên trên các chùa gần đó
    svg.querySelector('.pinb.on')?.parentNode.appendChild(svg.querySelector('.pinb.on'));
  };

  function select(id) {
    selected = id;
    if (tab !== 'map') { tab = 'map'; draw(); return; }
    drawSvg(); drawCard();
  }

  const routeChips = () => p.routes.length ? `<div class="map-chips"><button class="chip${routeId ? '' : ' on'}" data-route="">Tất cả</button>${p.routes.map((r) => `<button class="chip${r.id === routeId ? ' on' : ''}" data-route="${r.id}">${r.claimed ? ic('check') : ''}${esc(r.name)} ${r.progress}/${r.temples.length}</button>`).join('')}</div>` : '';

  const drawMap = (body) => {
    body.innerHTML = `<div class="map-wrap">
      <div class="map-area">
        ${routeChips()}
        <div class="map-zoom"><button data-z="0.7" aria-label="Phóng to">+</button><button data-z="1.4" aria-label="Thu nhỏ">−</button><button data-z="0" aria-label="Xem toàn bản đồ">${ic('expand')}</button></div>
        <div class="map-legend"><i style="background:#e8743a"></i>Chưa viếng<i style="background:#f2c46d"></i>Đã viếng<i style="background:#5fd47a"></i>Bạn ở đây</div>
      </div>
      <div class="map-card"></div></div>`;
    drawSvg(); drawCard();
    body.querySelectorAll('[data-z]').forEach((b) => (b.onclick = () => (+b.dataset.z ? pz.zoom(+b.dataset.z) : pz.reset())));
    body.querySelectorAll('[data-route]').forEach((b) => (b.onclick = () => {
      routeId = b.dataset.route;
      body.querySelectorAll('[data-route]').forEach((c) => c.classList.toggle('on', c === b));
      drawSvg();
      const r = route();
      if (r) pz.fit(r.temples); else pz.reset();
    }));
  };

  const drawPassport = (body) => {
    const got = temples.filter((t) => p.stamps[t.id]).length;
    const days = new Map(p.journal.rows.map((r) => [r.day, r.exp])), n = p.journal.days;
    const base = p.today ? Date.parse(p.today.day + 'T00:00:00Z') : Date.now();
    const cells = Array.from({ length: n }, (_, i) => {
      const k = new Date(base - (n - 1 - i) * 864e5).toISOString().slice(0, 10), v = days.get(k) || 0;
      return `<i class="d${v >= 200 ? 3 : v >= 50 ? 2 : v > 0 ? 1 : 0}" title="${shortDate(k)}: ${v} công đức"></i>`;
    }).join('');
    const active = p.journal.rows.length;
    body.innerHTML = `<div class="map-scroll">
      <h4>${ic('medal')} Hộ chiếu hành hương <small>${got}/${temples.length} ấn chùa</small></h4>
      <div class="bar pp"><i style="width:${(got / temples.length) * 100}%"></i></div>
      <div class="seals">${temples.map((t) => {
        const s = p.stamps[t.id];
        return `<button class="seal-card" data-pick="${t.id}"><span class="seal ${s ? 'lv' + s.level : 'off'}">${esc(sealText(t.name))}</span><b>${esc(t.name)}</b><small>${s ? `Ấn ${esc(s.tier)} · ${s.days} ngày<br>Từ ${shortDate(s.first)}` : 'Chưa có ấn'}</small></button>`;
      }).join('')}</div>
      <p class="map-note">Mỗi ngày về chùa được tính một lần. ${p.tiers.filter((x) => x.days > 1).map((x) => `${x.days} ngày: ấn ${esc(x.name)}`).join(' · ')}.</p>
      ${n ? `<h4>${ic('fire')} Nhật ký tu tập <small>${active}/${n} ngày gần đây</small></h4><div class="journal">${cells}</div>` : ''}
      ${onShare && got ? `<button class="btn gold" id="mvShare">${ic('share')} Khoe hộ chiếu ${got}/${temples.length} chùa</button>` : ''}
    </div>`;
    body.querySelectorAll('[data-pick]').forEach((b) => (b.onclick = () => select(b.dataset.pick)));
    body.querySelector('#mvShare')?.addEventListener('click', () => { close(); onShare(`Tôi đã có ${got}/${temples.length} ấn chùa trên hành trình hành hương`); });
  };

  const drawRoutes = (body) => {
    body.innerHTML = `<div class="map-scroll">${p.routes.map((r) => `
      <div class="route-card${r.claimed ? ' claimed' : ''}">
        <div class="rc-head"><b>${esc(r.name)}</b><span>${r.progress}/${r.temples.length}</span></div>
        <p>${esc(r.description)}</p>
        <div class="rc-chain">${r.temples.map((id) => `<button class="${visited.has(id) ? 'ok' : ''}" data-pick="${id}" title="${esc(nameOf(id))}">${visited.has(id) ? ic('check') : esc(sealText(nameOf(id)))}</button>`).join('<u></u>')}</div>
        <div class="rc-foot"><small>Thưởng: ${rewardLine(r.reward, items)}</small>
          ${r.claimed ? `<span class="tag">${ic('check')} Đã nhận</span>` : r.done && r.questId ? `<button class="btn small gold" data-claim="${r.questId}">Nhận thưởng</button>` : `<button class="btn small ghost" data-show="${r.id}">Xem đường đi</button>`}</div>
      </div>`).join('') || '<div class="empty">Chưa tải được tuyến hành hương</div>'}</div>`;
    body.querySelectorAll('[data-pick]').forEach((b) => (b.onclick = () => select(b.dataset.pick)));
    body.querySelectorAll('[data-show]').forEach((b) => (b.onclick = () => {
      routeId = b.dataset.show; tab = 'map'; draw();
      const r = route(); if (r) pz.fit(r.temples);
    }));
    body.querySelectorAll('[data-claim]').forEach((b) => (b.onclick = async () => {
      b.disabled = true;
      const ok = await onClaim?.(b.dataset.claim);
      if (!ok) { b.disabled = false; return; }
      p = { ...p, routes: p.routes.map((r) => (r.questId === b.dataset.claim ? { ...r, claimed: true } : r)) };
      drawRoutes(body);
    }));
  };

  function draw() {
    stopViewer();
    el.innerHTML = `
      <div class="map-head"><h3>${ic('map')} Bản đồ hành hương</h3>
        <div class="map-tabs">${[['map', 'Bản đồ'], ['passport', 'Hộ chiếu'], ['routes', 'Tuyến']].map(([k, v]) => `<button class="${tab === k ? 'on' : ''}" data-tab="${k}">${v}</button>`).join('')}</div>
        <button class="x" id="mvClose" aria-label="Đóng">${ic('close')}</button></div>
      ${todayStrip()}
      <div class="map-body"></div>`;
    el.querySelector('#mvClose').onclick = close;
    el.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { tab = b.dataset.tab; draw(); }));
    el.querySelector('#mvDuyen')?.addEventListener('click', () => select(duyenId()));
    const body = el.querySelector('.map-body');
    (tab === 'map' ? drawMap : tab === 'passport' ? drawPassport : drawRoutes)(body);
  }
  draw();
  return { close };
}

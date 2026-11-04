// Vườn chùa ở phần khuôn viên mở rộng của các chùa cũ: cây bồ đề, đèn đá, tháp nhỏ, ghế đá.
// Vị trí cố định theo từng chùa nên mọi người thấy giống nhau; độ cao lấy từ mặt đất thật. Chỉ tháp là chắn đường.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// bán kính đi lại. Động Hương Sơn là hang, Đỉnh Mây đã kín vách núi nên giữ nguyên.
export const GROUND_R = { nhattru: 85, tranho: 110, baison: 85, thienmau: 85, vinhan: 85, doivang: 85, linhson: 62, linhung: 108, nuisam: 106, cuuphong: 146, hoangoc: 136 };

// loại cây theo vùng miền, dùng đúng cây của cảnh chùa để hợp với phần sẵn có
const TREE_KIND = { vinhan: ['palm', 'flower'], doivang: ['palm', 'broad'], thienmau: ['pine', 'broad'], linhung: ['bodhi', 'flower'], nuisam: ['palm', 'bodhi'], cuuphong: ['bodhi', 'broad'], hoangoc: ['pine', 'flower'] };
const at = (g, x, y, z) => g.translate(x, y, z);
function lanternParts() {
  const stone = mergeGeometries([
    at(new THREE.CylinderGeometry(0.34, 0.42, 0.22, 8), 0, 0.11, 0), at(new THREE.CylinderGeometry(0.11, 0.15, 0.85, 8), 0, 0.64, 0),
    at(new THREE.CylinderGeometry(0.3, 0.2, 0.12, 6), 0, 1.12, 0), at(new THREE.ConeGeometry(0.46, 0.34, 6), 0, 1.68, 0), at(new THREE.SphereGeometry(0.08, 8, 6), 0, 1.9, 0),
  ]);
  const glow = at(new THREE.CylinderGeometry(0.2, 0.2, 0.34, 6), 0, 1.34, 0);
  return [[stone, { color: '#9a958a', roughness: 0.95 }], [glow, { color: '#ffd98a', emissive: '#ffb648', emissiveIntensity: 0.9 }]];
}
function stupaParts() {
  const tiers = [[1.5, 0.5], [1.15, 0.9], [0.95, 0.75], [0.75, 0.65], [0.55, 0.55]];
  let y = 0;
  const stone = mergeGeometries(tiers.flatMap(([r, h]) => {
    const body = at(new THREE.CylinderGeometry(r * 0.86, r * 0.92, h, 8), 0, y + h / 2, 0);
    const eave = at(new THREE.CylinderGeometry(r * 1.08, r * 0.92, 0.14, 8), 0, y + h + 0.07, 0);
    y += h + 0.14;
    return [body, eave];
  }));
  const tip = at(new THREE.ConeGeometry(0.28, 0.9, 8), 0, y + 0.45, 0);
  return [[stone, { color: '#a89f8e', roughness: 0.95 }], [tip, { color: '#c8963e', roughness: 0.4, metalness: 0.75 }]];
}
function benchParts() {
  const stone = mergeGeometries([
    at(new THREE.BoxGeometry(1.7, 0.12, 0.5), 0, 0.48, 0), at(new THREE.BoxGeometry(0.2, 0.44, 0.42), -0.62, 0.22, 0), at(new THREE.BoxGeometry(0.2, 0.44, 0.42), 0.62, 0.22, 0),
  ]);
  return [[stone, { color: '#8e8a80', roughness: 0.95 }]];
}

// sinh số giả ngẫu nhiên theo tên chùa
function seeded(id) {
  let h = 2166136261;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)), (h >>> 0) / 4294967296);
}
// độ cao mặt đất, thử từ dưới thấp lên vì mỗi chùa có nền cao thấp khác nhau
function groundY(w, x, z) {
  for (const from of [-8, -4, 0, 4]) { const y = w.groundAt(x, z, from); if (y !== null) return y; }
  return null;
}

export function buildGrounds(w, id) {
  const R = GROUND_R[id], od = w.od;
  w.gardenBlock = null;
  if (!R || !od) return;
  const rnd = seeded(id), low = w.quality === 'low';
  const inner = Math.max(od.W, od.D) / 2 + 12; // chừa sân chùa có sẵn
  const spots = { tree: [], lantern: [], stupa: [], bench: [] };
  const used = [];
  const place = (kind, x, z, face = 0, s = 1) => {
    const r = Math.hypot(x, z);
    if (od.noGarden?.(x, z)) return;
    if (r < inner || r > R - 2 || used.some(([a, b]) => Math.hypot(a - x, b - z) < (kind === 'tree' ? 10 : 3.5))) return;
    const y = groundY(w, x, z);
    if (y === null) return;
    used.push([x, z]);
    spots[kind].push({ x, y, z, face, s });
  };
  const ring = (r, n, fn) => { const off = rnd() * 6.28; for (let i = 0; i < n; i++) { const t = off + (i / n) * Math.PI * 2; fn(Math.sin(t) * r, Math.cos(t) * r, t, i); } };
  const k = low ? 0.6 : 1;
  // đèn đá theo vòng đường dạo, ghế đá xen giữa, tháp nhỏ ở vòng xa, cây rải khắp
  ring(R * 0.62, Math.round(26 * k), (x, z, t, i) => { if (i % 5 === 2) place('bench', x, z, t + Math.PI / 2); else if (i % 2 === 0) place('lantern', x, z); });
  ring(R * 0.84, Math.round(9 * k), (x, z, t) => place('stupa', x, z, t, 0.85 + rnd() * 0.4));
  for (let i = 0; i < 60 * k; i++) {
    const t = rnd() * 6.28, r = inner + rnd() * (R - inner);
    place('tree', Math.sin(t) * r, Math.cos(t) * r, rnd() * 6.28, 0.75 + rnd() * 0.35);
  }
  w.gardenBlock = spots.stupa.map((o) => [o.x, o.z, 1.7 * o.s]);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(), sc = new THREE.Vector3();
  const add = (parts, list) => {
    if (!list.length) return;
    for (const [geo, params] of parts) {
      const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial(params), list.length);
      list.forEach((o, i) => mesh.setMatrixAt(i, m4.compose(p.set(o.x, o.y, o.z), q.setFromAxisAngle(up, o.face), sc.setScalar(o.s))));
      mesh.castShadow = !low;
      od.group.add(mesh);
    }
  };
  const [k1, k2] = TREE_KIND[id] || ['bodhi', 'flower'];
  const tall = spots.tree.filter((_, i) => i % 3 !== 2), small = spots.tree.filter((_, i) => i % 3 === 2);
  od.group.add(od.forest(k1, tall.map((o) => ({ ...o, ry: o.face })), { seed: 7, cast: !low }), od.forest(k2, small.map((o) => ({ ...o, ry: o.face })), { seed: 11, cast: !low }));
  add(lanternParts(), spots.lantern); add(stupaParts(), spots.stupa); add(benchParts(), spots.bench);
}

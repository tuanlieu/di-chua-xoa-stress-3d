// Linh thú đồng hành: dựng bằng hình khối như đồ trang bị, gộp thành ít lần vẽ để máy yếu vẫn chạy được.
// Hình và vật liệu dùng chung giữa mọi người chơi; mỗi con chỉ giữ phần chuyển động riêng.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const GLAZE = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.12 });
const GLOW = new THREE.MeshStandardMaterial({ color: '#fff2c2', emissive: '#ffc95e', emissiveIntensity: 1.6, roughness: 0.2 });
const V = (a) => new THREE.Vector3(...a);

function paint(g, color) {
  if (g.index) g = g.toNonIndexed();
  g.deleteAttribute('uv');
  const c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}
function piece(geo, color, p = [0, 0, 0], s = [1, 1, 1], r = [0, 0, 0]) {
  const m = new THREE.Matrix4().compose(V(p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), V(s));
  return paint(geo.clone().applyMatrix4(m), color);
}
const ball = new THREE.SphereGeometry(1, 12, 9), small = new THREE.SphereGeometry(1, 8, 6), spike = new THREE.ConeGeometry(1, 1, 6);
const O = (color, p, s, r) => piece(ball, color, p, Array.isArray(s) ? s : [s, s, s], r);
const o = (color, p, s, r) => piece(small, color, p, Array.isArray(s) ? s : [s, s, s], r);
// nét cong thuôn dần: sừng, râu, lọn bờm; flat < 1 thì dẹt như dải lụa
function lock(points, r0, r1, color, { seg = 8, rad = 5, flat = 1, color2 } = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map(V)), fr = curve.computeFrenetFrames(seg, false);
  const pos = [], nor = [], col = [], idx = [], a = new THREE.Color(color), b = new THREE.Color(color2 || color), c = new THREE.Color(), p = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    const t = i / seg, r = r0 + (r1 - r0) * t;
    curve.getPointAt(t, p); c.copy(a).lerp(b, t);
    for (let j = 0; j < rad; j++) {
      const q = (j / rad) * Math.PI * 2, cs = Math.cos(q), sn = Math.sin(q);
      n.copy(fr.normals[i]).multiplyScalar(cs * flat).addScaledVector(fr.binormals[i], sn);
      pos.push(p.x + n.x * r, p.y + n.y * r, p.z + n.z * r);
      n.normalize(); nor.push(n.x, n.y, n.z); col.push(c.r, c.g, c.b);
      const k = j === rad - 1 ? 1 - rad : 1;
      if (i < seg) { const v = i * rad + j; idx.push(v, v + k, v + rad, v + k, v + rad + k, v + rad); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g.toNonIndexed();
}
const merged = (parts) => mergeGeometries(parts);
const mirror = (fn) => [...fn(-1), ...fn(1)];

let haloMap;
function aura(color, size) {
  if (!haloMap) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 2, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(0.35, 'rgba(255,255,255,.28)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    haloMap = new THREE.CanvasTexture(c);
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloMap, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5 }));
  s.scale.setScalar(size);
  return s;
}

/* ---------- Thanh Long: thân liền uốn lượn phủ vảy, sừng hươu, râu dài, đuổi theo long châu ---------- */
const D = { top: '#0d6f6b', body: '#1aa184', belly: '#f4e2a6', gold: '#f0bd42', mane: '#8ff0d0', mane2: '#2bb99a', white: '#fff8e6', dark: '#120f0b', red: '#c63c2e', iris: '#ffcf4a' };
let scaleMat;
function dragonMaterial() {
  if (scaleMat) return scaleMat;
  const W = 256, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  // chiều ngang là quanh thân: giữa ảnh là lưng, hai mép là bụng
  const g = x.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, D.belly); g.addColorStop(0.16, D.belly); g.addColorStop(0.22, D.body); g.addColorStop(0.5, D.top); g.addColorStop(0.78, D.body); g.addColorStop(0.84, D.belly); g.addColorStop(1, D.belly);
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  const cols = 9, rows = 6, w = W / cols, h = H / rows;
  for (let r = 0; r < rows + 1; r++) for (let i = -1; i <= cols; i++) {
    const cx = (i + (r % 2 ? 0.5 : 0)) * w + w / 2, cy = r * h;
    const u = cx / W, onBelly = u < 0.2 || u > 0.8;
    x.beginPath(); x.moveTo(cx - w * 0.5, cy - h * 0.1); x.quadraticCurveTo(cx, cy + h * 1.05, cx + w * 0.5, cy - h * 0.1);
    x.lineWidth = 2.2; x.strokeStyle = onBelly ? 'rgba(170,120,40,.55)' : 'rgba(4,50,50,.6)'; x.stroke();
    if (!onBelly) { x.beginPath(); x.ellipse(cx, cy + h * 0.28, w * 0.2, h * 0.18, 0, 0, 7); x.fillStyle = 'rgba(160,255,225,.2)'; x.fill(); }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.wrapT = THREE.RepeatWrapping; tex.wrapS = THREE.RepeatWrapping; tex.anisotropy = 4;
  scaleMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, metalness: 0.08, emissive: '#04352f', emissiveIntensity: 0.22 });
  return scaleMat;
}
let dragonGeo;
function buildDragon() {
  const fin = lock([[0, 0, 0.06], [0, 0.11, -0.03], [0, 0.17, -0.2]], 0.075, 0.004, D.gold, { flat: 0.16, seg: 5, rad: 5, color2: D.mane });
  const claw = merged([
    lock([[0, 0, 0], [0.0, -0.1, -0.05], [0, -0.2, 0.05]], 0.05, 0.03, D.body, { seg: 6, rad: 6, color2: D.belly }),
    O(D.belly, [0, -0.215, 0.07], [0.05, 0.028, 0.05]),
    ...[-1, 0, 1].map((i) => lock([[i * 0.03, -0.22, 0.1], [i * 0.05, -0.24, 0.16], [i * 0.055, -0.285, 0.19]], 0.012, 0.002, D.gold, { seg: 4, rad: 4 })),
    ...[-1, 1].map((s) => lock([[s * 0.04, -0.03, -0.04], [s * 0.08, -0.03, -0.13], [s * 0.1, -0.09, -0.2]], 0.03, 0.003, D.mane, { flat: 0.3, seg: 5, rad: 4 })),
  ]);
  const flame = merged([-2, -1, 0, 1, 2].map((i) => lock([[0, 0, 0], [i * 0.035, i * 0.05, -0.17], [i * 0.1, i * 0.12, -0.42 + Math.abs(i) * 0.08]], 0.05, 0.004, i % 2 ? D.mane2 : D.gold, { flat: 0.25, seg: 7, color2: D.mane })));
  return { fin, claw, flame };
}
let dragonHeadGeo;
function dragonChibiHead() { // đầu tròn mắt to, sừng nhỏ, hai sợi râu ngắn
  if (dragonHeadGeo) return dragonHeadGeo;
  const c = '#23b091', gold = '#f3c75a', b = [];
  face(b, c, { r: 0.3, y: 0.03, z: 0.1, muzzle: '#c9f2d8', blush: '#ff9d8c' });
  for (const s of [-1, 1]) {
    b.push(lock([[s * 0.12, 0.28, 0.06], [s * 0.2, 0.42, 0.02], [s * 0.27, 0.52, 0.0]], 0.032, 0.02, gold, { seg: 5, rad: 5 }));
    b.push(lock([[s * 0.2, 0.42, 0.02], [s * 0.13, 0.49, 0.03], [s * 0.1, 0.54, 0.03]], 0.02, 0.014, gold, { seg: 4, rad: 4 }));
    b.push(O(c, [s * 0.33, 0.12, 0.02], [0.1, 0.045, 0.07], [0, 0, s * 0.35]));
    b.push(lock([[s * 0.13, -0.05, 0.37], [s * 0.28, -0.04, 0.42], [s * 0.38, 0.03, 0.38]], 0.012, 0.005, gold, { seg: 5, rad: 4 }));
  }
  return (dragonHeadGeo = merged(b));
}
function makeDragon(hq) {
  dragonGeo ||= buildDragon();
  const R = hq ? 24 : 16, M = hq ? 10 : 8, LEN = 1.45, F = hq ? 11 : 8, root = new THREE.Group();
  // thân: một ống liền, đỉnh được tính lại mỗi khung hình theo đường uốn
  const count = (R + 1) * M, pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), uv = new Float32Array(count * 2), idx = [];
  for (let i = 0; i <= R; i++) for (let j = 0; j < M; j++) {
    uv.set([j / (M - 1), (i / R) * 7], (i * M + j) * 2);
    const k = j === M - 1 ? 0 : 1; // đường nối nằm giữa bụng
    if (i < R && j < M - 1) { const v = i * M + j; idx.push(v, v + M, v + k, v + k, v + M, v + M + k); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  const body = new THREE.Mesh(geo, dragonMaterial()); body.frustumCulled = false; body.castShadow = hq;
  const fin = new THREE.InstancedMesh(dragonGeo.fin, GLAZE, F); fin.frustumCulled = false;
  const claws = new THREE.InstancedMesh(dragonGeo.claw, GLAZE, 4); claws.frustumCulled = false;
  const head = new THREE.Mesh(dragonChibiHead(), GLAZE); head.castShadow = hq;
  const flame = new THREE.Mesh(dragonGeo.flame, GLAZE);
  const pearl = new THREE.Group();
  pearl.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), GLOW), aura('#ffd98a', 0.5));
  root.add(body, fin, claws, head, flame, pearl);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), T = new THREE.Vector3(), S = new THREE.Vector3(), N = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), qq = new THREE.Quaternion(), sc = new THREE.Vector3(), v = new THREE.Vector3(), e = new THREE.Euler();
  const spine = (t, time, out, k) => {
    const w = time * (1.9 + k * 1.5);
    return out.set(Math.sin(t * 8.2 - w) * (0.05 + t * 0.42), Math.sin(t * 6.1 - w * 0.8 + 1) * (0.04 + t * 0.22), 0.06 - t * LEN);
  };
  // radius(t): cổ thon, phình giữa thân, thuôn dài về đuôi
  const radius = (t) => (t < 0.14 ? 0.15 + (t / 0.14) * 0.09 : 0.24 * Math.pow(1 - (t - 0.14) / 0.86, 0.75) + 0.012);
  const frame = (t, time, k) => {
    spine(Math.max(0, t - 0.015), time, a, k); spine(Math.min(1, t + 0.015), time, b, k);
    T.copy(a).sub(b).normalize(); S.crossVectors(up, T).normalize(); N.crossVectors(T, S).normalize();
    spine(t, time, a, k);
    m.makeBasis(S, N, T); q.setFromRotationMatrix(m); // trục +z của khung hướng về phía đầu
  };
  return {
    root, fly: true, hover: 0.95, keep: 2.2, speed: 4.4,
    anim(time, moving) {
      const k = moving ? 1 : 0;
      for (let i = 0; i <= R; i++) {
        const t = i / R; frame(t, time, k);
        const r = radius(t);
        for (let j = 0; j < M; j++) {
          const ang = (j / (M - 1)) * Math.PI * 2, x = Math.sin(ang), y = -Math.cos(ang);
          v.copy(S).multiplyScalar(x * r).addScaledVector(N, y * r * 1.06);
          const p = (i * M + j) * 3;
          pos[p] = a.x + v.x; pos[p + 1] = a.y + v.y; pos[p + 2] = a.z + v.z;
          v.normalize(); nor[p] = v.x; nor[p + 1] = v.y; nor[p + 2] = v.z;
        }
      }
      geo.attributes.position.needsUpdate = true; geo.attributes.normal.needsUpdate = true;
      for (let i = 0; i < F; i++) {
        const t = 0.1 + (i / F) * 0.86; frame(t, time, k);
        const r = radius(t);
        v.copy(N).multiplyScalar(r * 0.92).add(a);
        const z = THREE.MathUtils.clamp(r * 3.2, 0.2, 0.68);
        fin.setMatrixAt(i, m.compose(v, q, sc.set(z, z, z)));
      }
      fin.instanceMatrix.needsUpdate = true;
      [[0.2, -1], [0.2, 1], [0.64, -1], [0.64, 1]].forEach(([t, side], i) => {
        frame(t, time, k);
        const r = radius(t), z = 0.45 + r;
        v.copy(S).multiplyScalar(side * r * 0.86).addScaledVector(N, -r * 0.3).add(a);
        e.set(Math.sin(time * 2.8 + i * 1.7) * 0.42 - 0.15, 0, side * 0.55);
        claws.setMatrixAt(i, m.compose(v, qq.copy(q).multiply(new THREE.Quaternion().setFromEuler(e)), sc.set(z, z, z)));
      });
      claws.instanceMatrix.needsUpdate = true;
      frame(0, time, k);
      head.position.copy(a); head.quaternion.copy(q);
      frame(1, time, k);
      flame.position.copy(a); flame.quaternion.copy(q);
      pearl.position.set(Math.sin(time * 1.5) * 0.14, Math.sin(time * 2.1) * 0.08 + 0.14, 0.9 + Math.sin(time * 1.1) * 0.05);
    },
    dispose() { geo.dispose(); fin.dispose(); claws.dispose(); },
  };
}

/* ---------- bộ khung chung cho thú bốn chân ---------- */
const quads = new Map();
function quad(key, build, { legs, tailAt, keep, speed, hop = false, gait = 9, swing = 0.55 }) {
  if (!quads.has(key)) quads.set(key, build());
  const g = quads.get(key), root = new THREE.Group(), body = new THREE.Group();
  const trunk = new THREE.Mesh(g.body, GLAZE); trunk.castShadow = true; body.add(trunk); root.add(body);
  const parts = legs.map((p) => { const m = new THREE.Mesh(g.leg, GLAZE); m.position.set(...p); m.castShadow = true; root.add(m); return m; });
  const tail = g.tail ? new THREE.Mesh(g.tail, GLAZE) : null;
  if (tail) { tail.position.set(...tailAt); body.add(tail); }
  return {
    root, fly: false, keep, speed,
    anim(time, moving) {
      if (hop) {
        const k = moving ? Math.abs(Math.sin(time * 7)) : 0;
        root.children[0].position.y = k * 0.2 + (moving ? 0 : Math.sin(time * 2.1) * 0.006);
        parts.forEach((l, i) => { l.position.y = legs[i][1] + k * 0.2; l.rotation.x = moving ? (i < 2 ? -k * 0.8 : k * 0.8) : 0; });
      } else {
        const a = moving ? swing : 0;
        parts.forEach((l, i) => { l.rotation.x = Math.sin(time * gait + (i === 0 || i === 3 ? 0 : Math.PI)) * a; });
        body.position.y = moving ? Math.abs(Math.sin(time * gait)) * 0.022 : Math.sin(time * 1.6) * 0.006;
      }
      if (tail) tail.rotation.y = Math.sin(time * (moving ? 7 : 1.6)) * 0.3;
    },
    dispose() {},
  };
}

/* ---------- Dáng chibi dùng chung: đầu to, thân tròn, chân ngắn, mắt long lanh ---------- */
const headBall = new THREE.SphereGeometry(1, 20, 14);
const HEAD = { y: 0.68, z: 0.15, r: 0.34 };
function face(b, c, { blush = '#ff9fb2', eye = '#20140e', r = HEAD.r, y = HEAD.y, z = HEAD.z, muzzle } = {}) {
  b.push(piece(headBall, c, [0, y, z], [r, r * 0.93, r * 0.95]));
  for (const s of [-1, 1]) {
    const x = s * r * 0.47, ey = y + r * 0.03, ez = z + r * 0.8;
    b.push(O(eye, [x, ey, ez], [r * 0.23, r * 0.27, r * 0.12]));
    b.push(o('#ffffff', [x - r * 0.07, ey + r * 0.1, ez + r * 0.1], r * 0.085), o('#ffffff', [x + r * 0.07, ey - r * 0.08, ez + r * 0.1], r * 0.04));
    b.push(o(blush, [s * r * 0.72, y - r * 0.26, z + r * 0.62], [r * 0.15, r * 0.08, r * 0.05]));
  }
  if (muzzle) b.push(O(muzzle, [0, y - r * 0.3, z + r * 0.76], [r * 0.32, r * 0.23, r * 0.22]));
  b.push(o('#4a2a22', [0, y - r * 0.2, z + r * 0.97], [r * 0.08, r * 0.06, r * 0.05]));
  b.push(lock([[-r * 0.13, y - r * 0.36, z + r * 0.95], [0, y - r * 0.44, z + r * 0.99], [r * 0.13, y - r * 0.36, z + r * 0.95]], 0.008, 0.008, '#5a2c26', { seg: 6, rad: 4 }));
}
const stub = (c, paw) => merged([O(c, [0, -0.07, 0], [0.095, 0.11, 0.1]), O(paw, [0, -0.135, 0.02], [0.1, 0.05, 0.115])]);
const collar = (b, red, gold) => b.push(piece(new THREE.TorusGeometry(0.17, 0.024, 6, 18), red, [0, 0.44, 0.1], [1, 1, 0.95], [1.35, 0, 0]), O(gold, [0, 0.39, 0.27], 0.042));
const STUB_LEGS = [[-0.13, 0.15, 0.13], [0.13, 0.15, 0.13], [-0.14, 0.15, -0.17], [0.14, 0.15, -0.17]];

/* Sư Tử Xanh: bờm tròn xanh đậm như đám mây, lưng đội đài sen */
function buildLion() {
  const C = { body: '#58c2b4', fur: '#c9f2e2', mane: '#1d6f9c', mane2: '#2f9ccb', gold: '#f3c344', red: '#cf3a30', petal: '#f7a9bd', petal2: '#fde0e6' };
  const b = [O(C.body, [0, 0.3, -0.03], [0.25, 0.22, 0.29]), O(C.fur, [0, 0.26, 0.12], [0.16, 0.14, 0.13])];
  // bờm: vòng bông tròn ôm quanh mặt
  for (const [n, rr, z, sz, col] of [[12, 0.33, 0.06, 0.13, C.mane], [9, 0.25, -0.02, 0.13, C.mane2]]) for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    b.push(o(i % 2 ? col : C.mane2, [Math.cos(t) * rr, HEAD.y + Math.sin(t) * rr * 0.95, z], sz));
  }
  face(b, C.fur, { r: 0.28, y: HEAD.y, z: 0.17, muzzle: '#ffffff', blush: '#ff8fa8' });
  for (const s of [-1, 1]) b.push(o(C.mane2, [s * 0.25, HEAD.y + 0.29, 0.03], 0.075), o(C.petal, [s * 0.25, HEAD.y + 0.29, 0.08], 0.04));
  b.push(O(C.gold, [0, HEAD.y + 0.2, 0.39], 0.035));
  collar(b, C.red, C.gold);
  // đài sen nhỏ trên lưng
  b.push(piece(new THREE.CylinderGeometry(0.15, 0.17, 0.035, 14), C.red, [0, 0.52, -0.16]));
  for (let i = 0; i < 7; i++) { const t = (i / 7) * Math.PI * 2; b.push(o(C.petal, [Math.sin(t) * 0.09, 0.57, -0.16 + Math.cos(t) * 0.09], [0.042, 0.06, 0.042], [Math.cos(t) * 0.7, 0, -Math.sin(t) * 0.7])); }
  b.push(o(C.gold, [0, 0.58, -0.16], 0.04));
  const tail = merged([lock([[0, 0, 0], [0, 0.1, -0.1], [0, 0.22, -0.13]], 0.032, 0.026, C.body, { seg: 6, rad: 5 }), o(C.mane, [0, 0.27, -0.13], 0.075), o(C.mane2, [0.03, 0.31, -0.11], 0.05)]);
  return { body: merged(b), leg: stub(C.body, C.fur), tail };
}
const makeLion = () => quad('lion', buildLion, { legs: STUB_LEGS, tailAt: [0, 0.32, -0.3], keep: 1.5, speed: 3.6, gait: 11 });

/* Hươu Lộc Uyển: nâu mật, đốm trắng to, gạc tròn nhỏ */
function buildDeer() {
  const C = { body: '#d29a58', light: '#fbeed4', dark: '#8c5a2e', gold: '#e8b84a', red: '#cf3a30', pink: '#f4b3b6' };
  const b = [O(C.body, [0, 0.3, -0.03], [0.21, 0.2, 0.27]), O(C.light, [0, 0.25, 0.1], [0.13, 0.12, 0.11])];
  for (const [x, y, z] of [[0.13, 0.42, -0.1], [-0.15, 0.38, -0.02], [0.03, 0.47, -0.17], [-0.06, 0.45, 0.02], [0.18, 0.31, -0.16], [-0.18, 0.29, -0.17]]) b.push(o(C.light, [x, y, z], 0.04));
  face(b, C.body, { muzzle: C.light });
  for (const s of [-1, 1]) {
    b.push(O(C.body, [s * 0.36, HEAD.y + 0.13, 0.08], [0.12, 0.055, 0.075], [0, 0, s * 0.3]), o(C.pink, [s * 0.37, HEAD.y + 0.13, 0.125], [0.075, 0.03, 0.03], [0, 0, s * 0.3]));
    b.push(lock([[s * 0.13, HEAD.y + 0.27, 0.1], [s * 0.2, HEAD.y + 0.42, 0.08], [s * 0.3, HEAD.y + 0.52, 0.06]], 0.034, 0.024, C.gold, { seg: 6, rad: 5 }));
    b.push(lock([[s * 0.2, HEAD.y + 0.42, 0.08], [s * 0.12, HEAD.y + 0.5, 0.1], [s * 0.1, HEAD.y + 0.56, 0.1]], 0.024, 0.018, C.gold, { seg: 4, rad: 5 }));
    b.push(o(C.gold, [s * 0.3, HEAD.y + 0.52, 0.06], 0.03), o(C.gold, [s * 0.1, HEAD.y + 0.56, 0.1], 0.024));
  }
  collar(b, C.red, C.gold);
  return { body: merged(b), leg: stub(C.body, C.dark), tail: merged([O(C.body, [0, 0.03, -0.03], [0.06, 0.07, 0.06]), o(C.light, [0, 0, -0.06], 0.04)]) };
}
const makeDeer = () => quad('deer', buildDeer, { legs: STUB_LEGS, tailAt: [0, 0.38, -0.29], keep: 1.4, speed: 3.8, gait: 11 });

/* Thỏ Ngọc: trắng tròn, một tai cụp, dấu trăng vàng trên trán */
function buildRabbit() {
  const C = { white: '#fbf7ef', pink: '#f7b6c4', gold: '#f0c04a', jade: '#54c8a4', red: '#cf3a30' };
  const b = [O(C.white, [0, 0.28, -0.04], [0.23, 0.22, 0.26]), O('#ffffff', [0, 0.24, 0.11], [0.13, 0.12, 0.1])];
  face(b, C.white, { muzzle: '#ffffff', blush: '#ff9db4' });
  // tai phải thẳng, tai trái cụp
  b.push(lock([[0.13, HEAD.y + 0.26, 0.08], [0.17, HEAD.y + 0.4, 0.05], [0.19, HEAD.y + 0.54, 0.02]], 0.068, 0.05, C.white, { seg: 7, rad: 7, flat: 0.55 }));
  b.push(lock([[0.13, HEAD.y + 0.28, 0.115], [0.17, HEAD.y + 0.4, 0.09], [0.19, HEAD.y + 0.51, 0.065]], 0.035, 0.024, C.pink, { seg: 7, rad: 6, flat: 0.4 }));
  b.push(lock([[-0.13, HEAD.y + 0.26, 0.08], [-0.2, HEAD.y + 0.42, 0.06], [-0.34, HEAD.y + 0.36, 0.04], [-0.42, HEAD.y + 0.2, 0.04]], 0.068, 0.05, C.white, { seg: 8, rad: 7, flat: 0.55 }));
  b.push(lock([[-0.2, HEAD.y + 0.41, 0.1], [-0.33, HEAD.y + 0.35, 0.08], [-0.4, HEAD.y + 0.22, 0.08]], 0.032, 0.022, C.pink, { seg: 6, rad: 6, flat: 0.4 }));
  b.push(piece(new THREE.TorusGeometry(0.05, 0.015, 5, 12, Math.PI * 1.35), C.gold, [0, HEAD.y + 0.2, HEAD.z + 0.29], [1, 1, 1], [-0.4, 0, 0.8]));
  b.push(piece(new THREE.TorusGeometry(0.16, 0.02, 6, 16), C.red, [0, 0.43, 0.09], [1, 1, 0.95], [1.35, 0, 0]), O(C.jade, [0, 0.37, 0.25], 0.045));
  return { body: merged(b), leg: stub(C.white, C.pink), tail: O('#ffffff', [0, 0, 0], 0.09) };
}
const makeRabbit = () => quad('rabbit', buildRabbit, { legs: STUB_LEGS, tailAt: [0, 0.3, -0.3], keep: 1.2, speed: 3.6, hop: true });

/* Nghê: cam đồng, lông xoắn vàng quanh đầu, đuôi lửa */
function buildNghe() {
  const C = { body: '#e0813a', light: '#ffd9a0', gold: '#f6c34a', flame: '#f05a28', red: '#c9302a' };
  const b = [O(C.body, [0, 0.3, -0.03], [0.24, 0.21, 0.28]), O(C.light, [0, 0.25, 0.11], [0.15, 0.13, 0.12])];
  face(b, C.body, { muzzle: C.light, blush: '#ff7f70' });
  // bờm xoắn và lông mày lửa
  for (let i = 0; i < 9; i++) {
    const t = -0.35 + (i / 8) * (Math.PI + 0.7), x = Math.cos(t) * 0.33, y = HEAD.y + Math.sin(t) * 0.31;
    b.push(lock([[x, y, 0.05], [x * 1.25, y + (y - HEAD.y) * 0.3 + 0.02, 0.02], [x * 1.35 + (x > 0 ? -0.05 : 0.05), y + (y - HEAD.y) * 0.5 + 0.08, 0]], 0.05, 0.012, i % 2 ? C.gold : C.flame, { seg: 5, rad: 5, color2: C.gold }));
  }
  for (const s of [-1, 1]) b.push(lock([[s * 0.08, HEAD.y + 0.17, 0.44], [s * 0.2, HEAD.y + 0.22, 0.4], [s * 0.3, HEAD.y + 0.3, 0.33]], 0.022, 0.008, C.gold, { seg: 5, rad: 4 }));
  b.push(lock([[0, HEAD.y + 0.29, 0.22], [0, HEAD.y + 0.4, 0.2], [0, HEAD.y + 0.48, 0.13]], 0.04, 0.008, C.gold, { seg: 5, rad: 5 }));
  // lưng có 3 cụm lửa
  for (const z of [0.0, -0.13, -0.25]) b.push(lock([[0, 0.49 + z * 0.3, z], [0, 0.57 + z * 0.3, z - 0.04], [0, 0.61 + z * 0.3, z - 0.1]], 0.036, 0.006, C.flame, { seg: 4, rad: 4, color2: C.gold }));
  collar(b, C.red, C.gold);
  const tail = merged([-0.1, 0, 0.1].map((s) => lock([[0, 0, 0], [s * 0.5, 0.11, -0.1], [s * 1.5, 0.25, -0.14]], 0.045, 0.008, C.flame, { seg: 5, rad: 5, color2: C.gold })));
  return { body: merged(b), leg: stub(C.body, C.light), tail };
}
const makeNghe = () => quad('nghe', buildNghe, { legs: STUB_LEGS, tailAt: [0, 0.34, -0.3], keep: 1.5, speed: 3.6, gait: 11 });

/* Chu Tước: chim lửa đỏ son tròn xoe, mào vàng, đuôi phượng dài, bay vỗ cánh theo chủ */
const PHOENIX = { body: '#e8452f', deep: '#b92a26', belly: '#ffd88f', gold: '#f6c33f', flame: '#ff8a34', tip: '#ffe08a', blue: '#39b6c8' };
let phoenixGeo;
function buildPhoenix() {
  const C = PHOENIX, b = [O(C.body, [0, 0, -0.06], [0.2, 0.2, 0.25]), O(C.belly, [0, -0.05, 0.08], [0.15, 0.13, 0.13])];
  face(b, C.body, { r: 0.27, y: 0.25, z: 0.1, blush: '#ffb08f' });
  b.push(O(C.gold, [0, 0.19, 0.36], [0.075, 0.045, 0.075]), piece(spike, C.flame, [0, 0.19, 0.44], [0.05, 0.09, 0.03], [Math.PI / 2, 0, 0]));
  // mào ba lọn lửa và viên ngọc trên trán
  for (const [x, h, z] of [[0, 0.3, -0.02], [-0.09, 0.22, 0.02], [0.09, 0.22, 0.02]]) b.push(lock([[x, 0.48, 0.08], [x * 1.3, 0.48 + h * 0.6, 0.05], [x * 1.9, 0.48 + h, z - 0.08]], 0.042, 0.008, C.flame, { seg: 6, rad: 5, color2: C.tip }), o(C.tip, [x * 1.9, 0.48 + h, z - 0.08], 0.022));
  b.push(o(C.blue, [0, 0.46, 0.27], 0.032));
  for (const s of [-1, 1]) b.push(O(C.gold, [s * 0.08, -0.2, 0.0], [0.045, 0.035, 0.065]));
  const wing = (s) => {
    const w = [];
    for (let i = 0; i < 6; i++) {
      const a = -0.15 + i * 0.26, d = 0.2 - i * 0.012, x = Math.cos(a) * d * s, z = -Math.sin(a) * d;
      w.push(O(i % 2 ? C.flame : C.body, [x, 0, z], [0.2 - i * 0.012, 0.018, 0.058], [0, s * a, 0]));
      w.push(o(C.tip, [Math.cos(a) * (d + 0.17) * s, 0.002, -Math.sin(a) * (d + 0.17)], [0.035, 0.016, 0.03]));
    }
    w.push(O(C.deep, [s * 0.08, 0.018, -0.03], [0.12, 0.028, 0.09]));
    return merged(w);
  };
  const tail = [];
  for (const [x, y, n] of [[0, 0.02, 0.92], [-0.17, 0.0, 0.72], [0.17, 0.0, 0.72], [-0.32, -0.04, 0.54], [0.32, -0.04, 0.54]]) {
    const end = [x * 1.25, y + 0.12, -n];
    tail.push(lock([[x * 0.1, 0, 0], [x * 0.5, y - 0.1, -n * 0.45], [x, y - 0.06, -n * 0.8], end], 0.05, 0.022, C.body, { seg: 10, rad: 6, flat: 0.5, color2: C.gold }));
    tail.push(O(C.tip, end, [0.07, 0.03, 0.08]), O(C.blue, [end[0], end[1] + 0.015, end[2]], [0.036, 0.024, 0.042]), o(C.deep, [end[0], end[1] + 0.03, end[2]], 0.014));
  }
  return { body: merged(b), wingL: wing(-1), wingR: wing(1), tail: merged(tail) };
}
function makePhoenix() {
  phoenixGeo ||= buildPhoenix();
  const root = new THREE.Group(), body = new THREE.Group();
  const trunk = new THREE.Mesh(phoenixGeo.body, GLAZE); trunk.castShadow = true;
  const wl = new THREE.Mesh(phoenixGeo.wingL, GLAZE), wr = new THREE.Mesh(phoenixGeo.wingR, GLAZE), tail = new THREE.Mesh(phoenixGeo.tail, GLAZE);
  wl.position.set(-0.15, 0.05, -0.05); wr.position.set(0.15, 0.05, -0.05); tail.position.set(0, -0.01, -0.26);
  const glow = aura('#ff9a45', 1.15); glow.position.z = -0.08;
  body.add(trunk, wl, wr, tail, glow); root.add(body);
  return {
    root, fly: true, hover: 0.85, keep: 1.6, speed: 4.2,
    anim(time, moving) {
      const f = Math.sin(time * (moving ? 13 : 5)) * (moving ? 0.72 : 0.42) + 0.12;
      wl.rotation.z = -f; wr.rotation.z = f;
      body.position.y = -f * 0.05;
      body.rotation.x = moving ? 0.16 : 0;
      tail.rotation.x = Math.sin(time * 2.4) * 0.09 - 0.04; tail.rotation.y = Math.sin(time * 1.7) * 0.12;
    },
    dispose() {},
  };
}

/* Huyền Vũ: rùa mai sẫm viền vàng, mặt tròn hiền, rắn nhỏ ló qua vai lắc lư (đặt ở vị trí đuôi) */
function buildXuanwu() {
  const C = { skin: '#7fcdb0', light: '#d9f3df', shell: '#24566e', plate: '#3a86a0', gold: '#f2c74f', snake: '#6c9fe0', snake2: '#d6e6ff', red: '#cf3a30' };
  const b = [O(C.shell, [0, 0.33, -0.05], [0.33, 0.235, 0.37]), O(C.light, [0, 0.2, -0.04], [0.3, 0.09, 0.34])];
  b.push(piece(new THREE.TorusGeometry(1, 0.05, 6, 24), C.gold, [0, 0.235, -0.05], [0.335, 0.375, 0.5], [Math.PI / 2, 0, 0]));
  // các ô mai: một ô giữa, sáu ô quanh, viên vàng ở tâm
  const plate = (x, y, z, r) => { const n = V([x, (y - 0.33) * 2.2, z]).normalize(); b.push(piece(new THREE.CylinderGeometry(r, r, 0.02, 6), C.gold, [x, y, z], [1.14, 1, 1.14], [Math.asin(n.z), 0, -Math.asin(n.x)]), piece(new THREE.CylinderGeometry(r * 0.86, r * 0.86, 0.024, 6), C.plate, [x + n.x * 0.006, y + 0.006, z + n.z * 0.006], [1.1, 1, 1.1], [Math.asin(n.z), 0, -Math.asin(n.x)])); };
  plate(0, 0.558, -0.05, 0.07);
  for (let i = 0; i < 6; i++) { const t = (i / 6) * Math.PI * 2 + 0.52, x = Math.cos(t) * 0.135, z = -0.05 + Math.sin(t) * 0.15, e = 1 - (x / 0.33) ** 2 - ((z + 0.05) / 0.37) ** 2; plate(x, 0.322 + 0.235 * Math.sqrt(Math.max(e, 0)), z, 0.062); }
  b.push(o(C.gold, [0, 0.575, -0.05], 0.028));
  face(b, C.skin, { r: 0.3, y: 0.56, z: 0.27, muzzle: C.light, blush: '#ff9d9d' });
  for (const s of [-1, 1]) b.push(o(C.skin, [s * 0.1, 0.84, 0.28], 0.018));
  b.push(piece(new THREE.TorusGeometry(0.145, 0.022, 6, 16), C.red, [0, 0.335, 0.27], [1, 1, 0.9], [1.25, 0, 0]), O(C.gold, [0, 0.27, 0.41], 0.038));
  const leg = merged([O(C.skin, [0, -0.06, 0], [0.11, 0.1, 0.115]), O(C.light, [0, -0.125, 0.025], [0.115, 0.04, 0.13])]);
  const tail = [lock([[0, -0.06, 0.04], [0.16, -0.1, -0.08], [0.38, -0.02, -0.02], [0.47, 0.13, 0.04], [0.41, 0.26, 0.1], [0.47, 0.38, 0.18]], 0.062, 0.042, C.snake, { seg: 16, rad: 7, color2: C.snake2 })];
  const hx = 0.47, hy = 0.44, hz = 0.24;
  tail.push(O(C.snake, [hx, hy, hz], [0.105, 0.095, 0.11]), O(C.snake2, [hx, hy - 0.035, hz + 0.055], [0.058, 0.04, 0.05]));
  for (const s of [-1, 1]) tail.push(O('#20140e', [hx + s * 0.046, hy + 0.012, hz + 0.082], [0.024, 0.028, 0.016]), o('#ffffff', [hx + s * 0.046 - 0.006, hy + 0.024, hz + 0.095], 0.009));
  tail.push(lock([[hx, hy - 0.04, hz + 0.1], [hx, hy - 0.055, hz + 0.16], [hx + 0.016, hy - 0.05, hz + 0.19]], 0.008, 0.003, C.red, { seg: 4, rad: 4 }));
  return { body: merged(b), leg, tail: merged(tail) };
}
const makeXuanwu = () => quad('xuanwu', buildXuanwu, { legs: [[-0.23, 0.15, 0.15], [0.23, 0.15, 0.15], [-0.24, 0.15, -0.24], [0.24, 0.15, -0.24]], tailAt: [0, 0.32, -0.3], keep: 1.5, speed: 3.2, gait: 7, swing: 0.4 });

/* Bạch Tượng Lục Nha: voi trắng sáu ngà trong giấc mộng của hoàng hậu Ma Da, cũng là voi của Bồ Tát Phổ Hiền.
   Đài sen đội ngọc sáng trên lưng, vòng sen vàng lơ lửng xoay quanh, vòi và tai cử động riêng. */
const E = { white: '#fff9ee', shade: '#f0e4d2', pink: '#f7b9c4', gold: '#f5c84c', gold2: '#ffe08a', red: '#c8322e', blue: '#2f6fb0', jade: '#54c8a4', petal: '#f8a6bd', petal2: '#fde3e8', ivory: '#fffdf4' };
let elephantParts;
function buildElephant() {
  const b = [O(E.white, [0, 0.33, -0.05], [0.29, 0.26, 0.33]), O(E.shade, [0, 0.25, 0.1], [0.17, 0.14, 0.13])];
  face(b, E.white, { r: 0.35, y: 0.7, z: 0.14, blush: '#ffa6ba', eye: '#1c1420' });
  // miện vàng trên trán, ở giữa là ngọc xanh
  b.push(piece(new THREE.TorusGeometry(0.2, 0.022, 6, 22, Math.PI), E.gold, [0, 0.87, 0.34], [1, 0.7, 1], [-0.42, 0, 0]));
  b.push(O(E.gold, [0, 0.98, 0.33], [0.075, 0.09, 0.04]), O(E.blue, [0, 0.98, 0.365], [0.046, 0.056, 0.022]), o(E.gold2, [-0.12, 0.93, 0.34], 0.03), o(E.gold2, [0.12, 0.93, 0.34], 0.03));
  // sáu ngà: ba đôi xếp tầng, đầu ngà bọc vàng
  for (const s of [-1, 1]) for (const [x, y, z, l] of [[0.12, 0.56, 0.42, 0.26], [0.2, 0.54, 0.38, 0.22], [0.27, 0.53, 0.32, 0.18]]) {
    b.push(lock([[s * x, y, z], [s * (x + 0.02), y - l * 0.3, z + l * 0.45], [s * (x + 0.03), y - l * 0.12, z + l * 0.9]], 0.024, 0.008, E.ivory, { seg: 6, rad: 6, color2: E.gold }));
  }
  // yên gấm đỏ viền vàng, tua rua hai bên hông
  b.push(O(E.red, [0, 0.46, -0.18], [0.23, 0.11, 0.21]), piece(new THREE.TorusGeometry(0.225, 0.018, 6, 24), E.gold, [0, 0.445, -0.18], [1, 0.92, 1], [Math.PI / 2, 0, 0]));
  for (const s of [-1, 1]) for (const z of [-0.28, -0.16, -0.04]) b.push(lock([[s * 0.24, 0.42, z], [s * 0.27, 0.34, z]], 0.012, 0.008, E.gold, { seg: 3, rad: 4 }), o(E.red, [s * 0.272, 0.32, z], 0.022));
  // đài sen hai tầng trên lưng
  for (const [n, r, y, tilt, sz, col] of [[10, 0.15, 0.6, 1.0, 0.12, E.petal], [7, 0.075, 0.635, 0.5, 0.095, E.petal2]]) for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    b.push(o(col, [Math.sin(t) * r, y, -0.2 + Math.cos(t) * r], [sz * 0.55, sz * 0.75, sz * 0.55], [Math.cos(t) * tilt, 0, -Math.sin(t) * tilt]));
  }
  b.push(O(E.gold, [0, 0.655, -0.2], [0.05, 0.028, 0.05]));
  const leg = merged([O(E.white, [0, -0.07, 0], [0.11, 0.12, 0.11]), O(E.shade, [0, -0.14, 0.02], [0.115, 0.05, 0.125]), piece(new THREE.TorusGeometry(0.105, 0.016, 5, 16), E.gold, [0, -0.06, 0], [1, 1, 1], [Math.PI / 2, 0, 0]), o(E.ivory, [-0.05, -0.15, 0.115], 0.02), o(E.ivory, [0.05, -0.15, 0.115], 0.02)]);
  const tail = merged([lock([[0, 0, 0], [0, -0.06, -0.07], [0, -0.14, -0.08]], 0.02, 0.014, E.white, { seg: 5, rad: 5 }), o(E.gold, [0, -0.16, -0.08], 0.032)]);
  return { body: merged(b), leg, tail };
}
function elephantExtras() {
  if (elephantParts) return elephantParts;
  // vòi cong, có ngấn vàng, gốc đặt ở mũi để lắc quanh đó
  const trunk = merged([
    lock([[0, 0, -0.04], [0, -0.1, 0.07], [0, -0.24, 0.1], [0, -0.33, 0.17], [0, -0.3, 0.28]], 0.095, 0.044, E.white, { seg: 12, rad: 9, color2: E.shade }),
    piece(new THREE.TorusGeometry(0.083, 0.012, 5, 16), E.gold, [0, -0.12, 0.08], [1, 1, 1], [1.3, 0, 0]),
    o(E.pink, [0, -0.285, 0.31], [0.034, 0.036, 0.016], [0.5, 0, 0]),
  ]);
  const ear = merged([
    O(E.white, [0.19, 0, 0], [0.2, 0.2, 0.035]), O(E.pink, [0.19, -0.005, 0.024], [0.14, 0.14, 0.018]),
    piece(new THREE.TorusGeometry(0.2, 0.011, 5, 26), E.gold, [0.19, 0, 0.012]),
  ]);
  // sáu đoá sen vàng lơ lửng: sáu căn thanh tịnh
  const lotus = [];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2, cx = Math.cos(a) * 0.86, cz = Math.sin(a) * 0.86;
    for (let i = 0; i < 8; i++) { const t = (i / 8) * Math.PI * 2; lotus.push(o(i % 2 ? E.petal : E.petal2, [cx + Math.sin(t) * 0.06, 0.008, cz + Math.cos(t) * 0.06], [0.03, 0.016, 0.065], [0.35 * -Math.cos(t), t, 0])); }
    lotus.push(o(E.gold, [cx, 0.03, cz], 0.03));
  }
  return (elephantParts = { trunk, ear, lotus: merged(lotus) });
}
function makeElephant(hq) {
  const pet = quad('elephant', buildElephant, { legs: [[-0.17, 0.17, 0.14], [0.17, 0.17, 0.14], [-0.18, 0.17, -0.2], [0.18, 0.17, -0.2]], tailAt: [0, 0.42, -0.36], keep: 1.7, speed: 3.5, gait: 8, swing: 0.4 });
  const x = elephantExtras(), body = pet.root.children[0], base = pet.anim;
  const mesh = (g, p) => { const m = new THREE.Mesh(g, GLAZE); m.position.set(...p); m.castShadow = hq; body.add(m); return m; };
  const trunk = mesh(x.trunk, [0, 0.62, 0.44]), earL = mesh(x.ear, [0.31, 0.74, 0.03]), earR = mesh(x.ear, [-0.31, 0.74, 0.03]);
  earR.scale.x = -1;
  const ring = new THREE.Mesh(x.lotus, GLAZE); ring.position.y = 0.45; pet.root.add(ring);
  // vầng sáng sau đầu và ngọc như ý trên đài sen
  const halo = aura('#ffe39a', 1.75); halo.position.set(0, 0.74, -0.34); body.add(halo);
  const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), GLOW); pearl.position.set(0, 0.74, -0.2); body.add(pearl);
  const glow = aura('#ffd98a', 0.42); glow.position.copy(pearl.position); body.add(glow);
  pet.anim = (time, moving) => {
    base(time, moving);
    trunk.rotation.x = Math.sin(time * 1.3) * 0.12 + (moving ? Math.sin(time * 8) * 0.1 : 0);
    trunk.rotation.z = Math.sin(time * 0.9) * 0.14;
    const flap = Math.sin(time * (moving ? 5 : 1.7)) * 0.22;
    earL.rotation.y = -0.35 + flap; earR.rotation.y = 0.35 - flap;
    ring.rotation.y = time * 0.55;
    ring.position.y = 0.45 + Math.sin(time * 1.2) * 0.05;
    pearl.position.y = glow.position.y = 0.74 + Math.sin(time * 1.8) * 0.018;
    halo.material.opacity = 0.34 + Math.sin(time * 1.5) * 0.1;
    glow.material.opacity = 0.55 + Math.sin(time * 2.6) * 0.2;
  };
  pet.dispose = () => { halo.material.dispose(); glow.material.dispose(); pearl.geometry.dispose(); };
  return pet;
}

/* Trâu Vàng: dáng trâu nước Việt Nam mạ vàng, sừng cong rộng, không dây xỏ mũi (tâm đã được điều phục như trong Thập Mục Ngưu Đồ), bước đi có sen vàng và kim quang quanh mình */
const OX = { body: '#ffc93c', deep: '#e49a1f', light: '#fff0bd', horn: '#fff3c9', tip: '#d9941f', red: '#b92c26', gold2: '#ffe08a', dark: '#5b3410', petal: '#ffcf5c', petal2: '#fff0b8' };
const OX_GOLD = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.34, metalness: 0.28, emissive: '#7a4e00', emissiveIntensity: 0.45 });
let oxParts;
function buildOx() {
  const b = [O(OX.body, [0, 0.33, -0.05], [0.29, 0.25, 0.34]), O(OX.deep, [0, 0.46, 0.04], [0.17, 0.1, 0.14]), O(OX.light, [0, 0.24, 0.11], [0.16, 0.13, 0.12])];
  face(b, OX.body, { r: 0.33, y: 0.68, z: 0.16, muzzle: OX.light, blush: '#ff9d5c', eye: '#2a170b' });
  // sừng trâu cong rộng ra hai bên rồi vểnh lên, tai ngang dưới sừng, chỏm lông giữa trán
  for (const s of [-1, 1]) {
    b.push(lock([[s * 0.17, 0.92, 0.18], [s * 0.42, 0.97, 0.12], [s * 0.6, 1.08, 0.04], [s * 0.55, 1.26, 0]], 0.062, 0.012, OX.horn, { seg: 10, rad: 7, color2: OX.tip }));
    b.push(O(OX.deep, [s * 0.38, 0.76, 0.1], [0.115, 0.05, 0.075], [0, 0, s * -0.22]), O(OX.light, [s * 0.39, 0.76, 0.135], [0.07, 0.028, 0.03], [0, 0, s * -0.22]));
  }
  b.push(O(OX.deep, [0, 0.98, 0.25], [0.085, 0.05, 0.07]));
  // yếm đỏ viền vàng có chuông nhỏ
  b.push(piece(new THREE.TorusGeometry(0.19, 0.026, 6, 20), OX.red, [0, 0.43, 0.1], [1, 1, 0.95], [1.35, 0, 0]), O(OX.gold2, [0, 0.37, 0.29], 0.05), o(OX.dark, [0, 0.345, 0.325], 0.014));
  // khăn gấm đỏ trên lưng, ở giữa là pháp luân vàng
  b.push(O(OX.red, [0, 0.5, -0.17], [0.2, 0.08, 0.19]), piece(new THREE.TorusGeometry(0.195, 0.016, 6, 24), OX.gold2, [0, 0.49, -0.17], [1, 0.95, 1], [Math.PI / 2, 0, 0]));
  b.push(piece(new THREE.TorusGeometry(0.075, 0.012, 6, 18), OX.gold2, [0, 0.585, -0.17], [1, 1, 1], [Math.PI / 2, 0, 0]), o(OX.gold2, [0, 0.59, -0.17], 0.024));
  for (let i = 0; i < 4; i++) { const t = (i / 4) * Math.PI; b.push(piece(new THREE.CylinderGeometry(0.006, 0.006, 0.15, 4), OX.gold2, [0, 0.585, -0.17], [1, 1, 1], [Math.PI / 2, 0, t])); }
  const leg = merged([O(OX.body, [0, -0.07, 0], [0.105, 0.115, 0.105]), O(OX.dark, [0, -0.14, 0.02], [0.105, 0.045, 0.115]), piece(new THREE.TorusGeometry(0.1, 0.014, 5, 16), OX.gold2, [0, -0.09, 0], [1, 1, 1], [Math.PI / 2, 0, 0])]);
  const tail = merged([lock([[0, 0, 0], [0, -0.08, -0.06], [0, -0.17, -0.07]], 0.018, 0.012, OX.deep, { seg: 5, rad: 5 }), O(OX.gold2, [0, -0.2, -0.07], [0.04, 0.06, 0.04])]);
  return { body: merged(b), leg, tail };
}
function oxExtras() {
  if (oxParts) return oxParts;
  // tám đoá sen vàng quanh chân: Bát Chánh Đạo; và những đốm kim quang bay chậm
  const lotus = [], motes = [];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2, cx = Math.cos(a) * 0.72, cz = Math.sin(a) * 0.72;
    for (let i = 0; i < 8; i++) { const t = (i / 8) * Math.PI * 2; lotus.push(o(i % 2 ? OX.petal : OX.petal2, [cx + Math.sin(t) * 0.055, 0.008, cz + Math.cos(t) * 0.055], [0.028, 0.015, 0.06], [0.35 * -Math.cos(t), t, 0])); }
    lotus.push(o(OX.gold2, [cx, 0.028, cz], 0.026));
  }
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, r = 0.5 + (i % 3) * 0.12; motes.push(o('#ffe9a8', [Math.cos(a) * r, 0.25 + ((i * 7) % 12) * 0.075, Math.sin(a) * r], 0.016 + (i % 2) * 0.008)); }
  return (oxParts = { lotus: merged(lotus), motes: merged(motes) });
}
function makeOx() {
  const pet = quad('ox', buildOx, { legs: [[-0.17, 0.16, 0.13], [0.17, 0.16, 0.13], [-0.18, 0.16, -0.2], [0.18, 0.16, -0.2]], tailAt: [0, 0.42, -0.37], keep: 1.7, speed: 3.5, gait: 8, swing: 0.38 });
  pet.root.traverse((m) => { if (m.isMesh) m.material = OX_GOLD; });
  const x = oxExtras(), body = pet.root.children[0], base = pet.anim;
  const ring = new THREE.Mesh(x.lotus, OX_GOLD); ring.position.y = 0.04; pet.root.add(ring);
  const motes = new THREE.Mesh(x.motes, GLOW); pet.root.add(motes);
  const halo = aura('#ffc94f', 2.1); halo.position.set(0, 0.74, -0.32); body.add(halo);
  pet.anim = (time, moving) => {
    base(time, moving);
    body.rotation.x = moving ? Math.sin(time * 8) * 0.018 : Math.sin(time * 0.8) * 0.012;
    ring.rotation.y = -time * 0.4;
    motes.rotation.y = time * 0.5;
    motes.position.y = Math.sin(time * 0.9) * 0.05;
    halo.material.opacity = 0.42 + Math.sin(time * 1.4) * 0.12;
  };
  pet.dispose = () => { halo.material.dispose(); };
  return pet;
}

const TAG = { thuong: '#d9d0bd', quy: '#7fd7c0', hiem: '#c9a2ff', toi_thuong: '#ffd76a' };
// bảng tên nhỏ trên đầu linh thú đang lang thang ngoài sân
export function beastTag(name, rank) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 56;
  const x = c.getContext('2d');
  x.font = '700 28px system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  const w = Math.min(246, x.measureText(name).width + 32);
  x.fillStyle = 'rgba(20,12,6,.72)'; x.beginPath(); x.roundRect(128 - w / 2, 6, w, 44, 22); x.fill();
  x.fillStyle = TAG[rank] || '#fff'; x.fillText(name, 128, 29);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  s.scale.set(1.5, 0.33, 1);
  return s;
}

const MODELS = { su_tu_xanh: makeLion, thanh_long: makeDragon, huou: makeDeer, tho_ngoc: makeRabbit, nghe: makeNghe, chu_tuoc: makePhoenix, huyen_vu: makeXuanwu, bach_tuong: makeElephant, trau_vang: makeOx };
export function makePet(data, hq = true) {
  const make = MODELS[data?.model];
  if (!make) return null;
  const pet = make(hq);
  pet.scale = data.scale || 1;
  return pet;
}

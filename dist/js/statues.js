// Tượng thờ dựng hoàn toàn bằng thủ tục (không dùng file mô hình):
//  - thân & đầu "tạc" bằng hàm khoảng cách (SDF) rồi lưới hoá bằng surface-nets,
//    kèm che khuất (AO) để tô màu vết lõm như sơn mài thếp vàng;
//  - tòa sen bằng cánh sen tham số (2–3 tầng), hào quang bằng hình đùn + hoa văn canvas;
//  - tóc xoắn ốc dùng InstancedMesh, xếp thành hàng đều, vân xoắn bằng bản đồ nổi.
// kind: shakya | amida | quanam | khmer — mat: gold | bronze | white | stone | jade
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const { abs, sqrt, min, max, sin, cos, atan2, PI, pow, exp } = Math;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

/* =====================================================================
   SDF cơ bản
   ===================================================================== */
function smin(a, b, k) { const h = max(k - abs(a - b), 0) / k; return min(a, b) - h * h * k * 0.25; }
function smax(a, b, k) { const h = max(k - abs(a - b), 0) / k; return max(a, b) + h * h * k * 0.25; }
const sph = (x, y, z, r) => sqrt(x * x + y * y + z * z) - r;
function ell(x, y, z, a, b, c) {
  const X = x / a, Y = y / b, Z = z / c;
  const k0 = sqrt(X * X + Y * Y + Z * Z);
  const X2 = X / a, Y2 = Y / b, Z2 = Z / c;
  const k1 = sqrt(X2 * X2 + Y2 * Y2 + Z2 * Z2);
  return k1 < 1e-9 ? -min(a, b, c) : (k0 * (k0 - 1)) / k1;
}
// đoạn thẳng bo tròn, bán kính thuôn r1→r2
function seg(a, b, r1, r2 = r1) {
  const [ax, ay, az] = a, dx = b[0] - ax, dy = b[1] - ay, dz = b[2] - az, l2 = dx * dx + dy * dy + dz * dz;
  return (x, y, z) => {
    const px = x - ax, py = y - ay, pz = z - az;
    let t = (px * dx + py * dy + pz * dz) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const qx = px - dx * t, qy = py - dy * t, qz = pz - dz * t;
    return sqrt(qx * qx + qy * qy + qz * qz) - (r1 + (r2 - r1) * t);
  };
}
const norm3 = (v) => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
// dải nổi hẹp (nếp áo, gờ mày…): 1 ở giữa, 0 ở |t|>=1
const bump = (t) => { const s = 1 - t * t; return s > 0 ? s * s : 0; };

/* =====================================================================
   Lưới hoá SDF: surface nets dải hẹp + chiếu lên bề mặt + pháp tuyến & AO từ SDF
   ===================================================================== */
function polygonize(f, b0, b1, h, aoSteps, aoF = f, { keep = null, nE = 0.3 } = {}) {
  const B = 4;
  const nbx = Math.ceil((b1[0] - b0[0]) / (h * B)), nby = Math.ceil((b1[1] - b0[1]) / (h * B)), nbz = Math.ceil((b1[2] - b0[2]) / (h * B));
  const nx = nbx * B + 1, ny = nby * B + 1, nz = nbz * B + 1, sxy = nx * ny;
  const cx = nbx + 1, cy = nby + 1, cz = nbz + 1, Bh = B * h;
  const C = new Float32Array(cx * cy * cz);
  for (let k = 0; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) C[i + cx * (j + cy * k)] = f(b0[0] + i * Bh, b0[1] + j * Bh, b0[2] + k * Bh);
  const F = new Float32Array(nx * ny * nz).fill(NaN);
  const thr = Bh * 2.0, blocks = [];
  for (let bk = 0; bk < nbz; bk++) for (let bj = 0; bj < nby; bj++) for (let bi = 0; bi < nbx; bi++) {
    let mn = 1e9;
    for (let c = 0; c < 8; c++) { const v = abs(C[bi + (c & 1) + cx * (bj + ((c >> 1) & 1) + cy * (bk + (c >> 2)))]); if (v < mn) mn = v; }
    if (mn > thr) continue;
    blocks.push(bi, bj, bk);
    for (let k = 0; k <= B; k++) for (let j = 0; j <= B; j++) for (let i = 0; i <= B; i++) {
      const gi = bi * B + i, gj = bj * B + j, gk = bk * B + k, id = gi + nx * gj + sxy * gk;
      if (F[id] !== F[id]) F[id] = f(b0[0] + gi * h, b0[1] + gj * h, b0[2] + gk * h);
    }
  }
  const off = [0, 1, nx, 1 + nx, sxy, 1 + sxy, nx + sxy, 1 + nx + sxy];
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const v = new Float32Array(8), cell = new Map(), P = [];
  for (let b = 0; b < blocks.length; b += 3) {
    const bi = blocks[b], bj = blocks[b + 1], bk = blocks[b + 2];
    for (let k = 0; k < B; k++) for (let j = 0; j < B; j++) for (let i = 0; i < B; i++) {
      const gi = bi * B + i, gj = bj * B + j, gk = bk * B + k, base = gi + nx * gj + sxy * gk;
      let m = 0;
      for (let c = 0; c < 8; c++) { v[c] = F[base + off[c]]; if (v[c] < 0) m |= 1 << c; }
      if (m === 0 || m === 255) continue;
      if (keep && !keep(b0[0] + (gi + 0.5) * h, b0[1] + (gj + 0.5) * h, b0[2] + (gk + 0.5) * h)) continue;
      let sx = 0, sy = 0, sz = 0, n = 0;
      for (const [a, bb] of E) {
        if ((v[a] < 0) === (v[bb] < 0)) continue;
        const t = v[a] / (v[a] - v[bb]);
        sx += (a & 1) + t * ((bb & 1) - (a & 1));
        sy += ((a >> 1) & 1) + t * (((bb >> 1) & 1) - ((a >> 1) & 1));
        sz += (a >> 2) + t * ((bb >> 2) - (a >> 2));
        n++;
      }
      cell.set(base, P.length / 3);
      P.push(b0[0] + (gi + sx / n) * h, b0[1] + (gj + sy / n) * h, b0[2] + (gk + sz / n) * h);
    }
  }
  const I = [];
  const quad = (a, b, c, d, dir, axis) => {
    if (a === undefined || b === undefined || c === undefined || d === undefined) return;
    const ux = P[b * 3] - P[a * 3], uy = P[b * 3 + 1] - P[a * 3 + 1], uz = P[b * 3 + 2] - P[a * 3 + 2];
    const wx = P[c * 3] - P[a * 3], wy = P[c * 3 + 1] - P[a * 3 + 1], wz = P[c * 3 + 2] - P[a * 3 + 2];
    const cr = axis === 0 ? uy * wz - uz * wy : axis === 1 ? uz * wx - ux * wz : ux * wy - uy * wx;
    if (cr * dir > 0) I.push(a, b, c, a, c, d); else I.push(a, d, c, a, c, b);
  };
  for (const [base, vi] of cell) {
    const gi = base % nx, gj = ((base / nx) | 0) % ny, gk = (base / sxy) | 0;
    const s0 = F[base] < 0;
    if (gj > 0 && gk > 0 && s0 !== F[base + 1] < 0) quad(vi, cell.get(base - nx), cell.get(base - nx - sxy), cell.get(base - sxy), s0 ? 1 : -1, 0);
    if (gi > 0 && gk > 0 && s0 !== F[base + nx] < 0) quad(vi, cell.get(base - 1), cell.get(base - 1 - sxy), cell.get(base - sxy), s0 ? 1 : -1, 1);
    if (gi > 0 && gj > 0 && s0 !== F[base + sxy] < 0) quad(vi, cell.get(base - 1), cell.get(base - 1 - nx), cell.get(base - nx), s0 ? 1 : -1, 2);
  }
  // chiếu đỉnh lên mặt, pháp tuyến bằng gradient tứ diện, AO dọc pháp tuyến
  const N = P.length / 3, nrm = new Float32Array(N * 3), ao = new Float32Array(N), e = h * nE;
  const grad = (x, y, z, out) => {
    const a = f(x + e, y - e, z - e), b = f(x - e, y - e, z + e), c = f(x - e, y + e, z - e), d = f(x + e, y + e, z + e);
    let gx = a - b - c + d, gy = -a - b + c + d, gz = -a + b - c + d;
    const l = sqrt(gx * gx + gy * gy + gz * gz) || 1;
    out[0] = gx / l; out[1] = gy / l; out[2] = gz / l; out[3] = (a + b + c + d) / 4;
  };
  const g = [0, 0, 0, 0];
  for (let i = 0; i < N; i++) {
    let x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
    grad(x, y, z, g);
    const dd = clamp(g[3], -0.6 * h, 0.6 * h);
    x -= g[0] * dd; y -= g[1] * dd; z -= g[2] * dd;
    P[i * 3] = x; P[i * 3 + 1] = y; P[i * 3 + 2] = z;
    grad(x, y, z, g);
    nrm[i * 3] = g[0]; nrm[i * 3 + 1] = g[1]; nrm[i * 3 + 2] = g[2];
    let occ = 0;
    for (const s of aoSteps) occ += clamp((s - aoF(x + g[0] * s, y + g[1] * s, z + g[2] * s)) / s, 0, 1);
    ao[i] = 1 - occ / aoSteps.length;
  }
  // tam giác bị gập ngược ở nếp gãy: đảo chiều để không thành lỗ
  for (let i = 0; i < I.length; i += 3) {
    const a = I[i] * 3, b = I[i + 1] * 3, c = I[i + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], wx = P[c] - P[a], wy = P[c + 1] - P[a + 1], wz = P[c + 2] - P[a + 2];
    const d = (uy * wz - uz * wy) * (nrm[a] + nrm[b] + nrm[c]) + (uz * wx - ux * wz) * (nrm[a + 1] + nrm[b + 1] + nrm[c + 1]) + (ux * wy - uy * wx) * (nrm[a + 2] + nrm[b + 2] + nrm[c + 2]);
    if (d < 0) { const t = I[i + 1]; I[i + 1] = I[i + 2]; I[i + 2] = t; }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  geo.setAttribute('ao', new THREE.BufferAttribute(ao, 1));
  geo.setIndex(I);
  geo.computeBoundingSphere();
  return geo;
}

/* =====================================================================
   Bàn tay (khung cục bộ: cổ tay ở gốc, ngón theo +z, mu tay +y, ngón cái phía +x)
   Tay thon, ngón dài hơi cong ra sau theo kiểu tượng Phật, có đệm lòng bàn tay
   ===================================================================== */
function makeHand({ o, F, B, T, curl = [0.1, 0.1, 0.12, 0.15], thumb = null, thumbMid = null, spread = 0.012, s = 1, flare = 0 }) {
  F = norm3(F); B = norm3(B); T = norm3(T ?? cross3(B, F));
  const L = [0.17, 0.195, 0.182, 0.145];
  const fingers = L.map((len, i) => {
    const fx = (0.054 - i * 0.036) * s, c = curl[i];
    const base = [fx, -0.002 * s, 0.165 * s - abs(i - 1.2) * 0.006 * s];
    const a1 = 0.42 * len * s, a2 = 0.32 * len * s, a3 = 0.26 * len * s;
    const mid = [fx * 1.03 + (i - 1.5) * spread * 0.45 * s, base[1] - c * a1 * 0.9 + flare * a1 * 0.25, base[2] + a1 * (1 - c * 0.28)];
    const mid2 = [fx * 1.05 + (i - 1.5) * spread * 0.8 * s, mid[1] - c * a2 * 1.25 + flare * a2 * 0.4, mid[2] + a2 * (1 - c * 0.8)];
    const tip = [fx * 1.07 + (i - 1.5) * spread * s, mid2[1] - c * a3 * 1.5 + flare * a3 * 0.7, mid2[2] + a3 * max(0.05, 1 - c * 1.3)];
    const r = (0.0192 - (i === 3 ? 0.0015 : 0)) * s;
    const s1 = seg(base, mid, r, r * 0.92), s2 = seg(mid, mid2, r * 0.92, r * 0.82), s3 = seg(mid2, tip, r * 0.82, r * 0.68);
    return (x, y, z) => min(s1(x, y, z), s2(x, y, z), s3(x, y, z));
  });
  const tb = [0.056 * s, -0.016 * s, 0.03 * s], tm = (thumbMid || [0.112, -0.036, 0.098]).map((q) => q * s);
  const tt = thumb ? thumb.map((q) => q * s) : [0.125 * s, -0.046 * s, 0.178 * s];
  const t1 = seg(tb, tm, 0.031 * s, 0.022 * s), t2 = seg(tm, tt, 0.022 * s, 0.0165 * s);
  const wrist = seg([0, 0.002 * s, -0.05 * s], [0, 0, 0.03 * s], 0.052 * s, 0.05 * s);
  return (x, y, z) => {
    const px = x - o[0], py = y - o[1], pz = z - o[2];
    const lx = px * T[0] + py * T[1] + pz * T[2], ly = px * B[0] + py * B[1] + pz * B[2], lz = px * F[0] + py * F[1] + pz * F[2];
    const bd = sph(lx, ly, lz - 0.12 * s, 0.42 * s);
    if (bd > 0.35) return bd;
    let d = ell(lx, ly + 0.003 * s, lz - 0.09 * s, 0.083 * s, 0.042 * s, 0.098 * s);
    d = smin(d, ell(lx - 0.052 * s, ly + 0.02 * s, lz - 0.055 * s, 0.04 * s, 0.024 * s, 0.06 * s), 0.02 * s); // gò ngón cái
    d = smin(d, wrist(lx, ly, lz), 0.04 * s);
    let fd = fingers[0](lx, ly, lz);
    for (let i = 1; i < 4; i++) fd = smin(fd, fingers[i](lx, ly, lz), 0.0035 * s);
    d = smin(d, fd, 0.018 * s);
    d = smin(d, min(t1(lx, ly, lz), t2(lx, ly, lz)), 0.022 * s);
    return d;
  };
}

/* =====================================================================
   Đầu (khung thô: gốc ở tầm mắt, mặt nhìn +z; rồi phóng theo P.scale)
   Theo tượng Việt: mặt tròn đầy, cằm tròn, miệng nhỏ, cổ ngắn ba ngấn.
   P: { fem, slender, ush: 'round'|'cone'|null, crown: 'lotus'|'fan'|null, bald, smile, cut, scale }
   ===================================================================== */
function hairline(x, z, P) {
  const c = z / (sqrt(x * x + z * z) + 1e-6);
  return c > 0 ? mix(0.085, 0.235, pow(c, 1.4)) : mix(0.085, -0.2, c * c);
}
const HY = 2.74, HZ = 0.03, HEAD_S = 1.1; // vị trí, tỉ lệ đầu trong toạ độ thân ngồi: đầu lớn như tượng Việt
const MY = 0.178; // tầm miệng dưới mắt
const qHairY = (x) => 0.238 - 0.62 * pow(abs(x), 1.25); // chân tóc Quan Âm: rẽ giữa, chảy xuống thái dương
const eyeY = (u, sl) => -0.017 + 0.021 * u * u - 0.004 * (1 - u * u) + (0.008 + 0.006 * sl) * u;
const browY = (ax, sl, fem) => 0.113 + 0.008 * sl - (2.05 + 0.5 * fem) * (ax - 0.15) * (ax - 0.15);
// mão sen nhiều tầng: vành, tầng cánh sen lớn, tầng nhỏ, ngọc đỉnh, huy hiệu trước
function lotusCrown(x, y, z) {
  const zc = z + 0.035, r = sqrt(x * x + zc * zc), a = atan2(x, zc);
  // vành ôm trán rồi loe, đỉnh là năm cánh sen nhọn
  const petal = pow(abs(cos(a * 2.5)), 1.6);
  let d = smax(smax(r - (0.355 + (y - 0.26) * 0.16), 0.255 - y - 0.1 * sstep(0.1, -0.4, zc / (r + 1e-6)), 0.02), y - (0.5 + 0.13 * petal), 0.015);
  d -= 0.012 * bump((y - 0.285) / 0.028);
  // bên trong: chóp sen, ngọc đỉnh
  let t2 = smax(r - (0.22 - (y - 0.45) * 0.62), 0.4 - y, 0.03);
  d = smin(d, t2, 0.03);
  d = smin(d, ell(x, y - 0.78, zc, 0.05, 0.07, 0.05), 0.02);
  d = smin(d, ell(x, y - 0.44, z - 0.34, 0.075, 0.1, 0.028), 0.018);
  d = smin(d, sph(x, y - 0.44, z - 0.368, 0.027), 0.008);
  return d;
}
// mão Bà: vòm cao, quạt tròn lớn sau đầu kết hạt
function fanCrown(x, y, z) {
  const zc = z + 0.03, dy = y - 0.62;
  let d = smin(ell(x, y - 0.4, zc, 0.5, 0.38, 0.44), ell(x, dy, z + 0.14, 0.78, 0.74, 0.12), 0.08);
  d = smax(d, 0.235 - y - 0.12 * sstep(0.1, -0.4, z), 0.02);
  d -= 0.014 * (0.5 + 0.5 * sin(x * 42) * sin(y * 42)) * sstep(0.28, 0.34, y);
  d -= 0.018 * bump((sqrt(x * x + dy * dy) - 0.68) / 0.035) * sstep(0.0, 0.25, y);
  d = smin(d, sph(x, y - 0.46, z - 0.42, 0.055), 0.012);
  return d;
}
function makeRawHead(P) {
  const sl = P.slender ? 1 : 0, fem = P.fem ? 1 : 0, sm = P.smile ? 1 : 0;
  const jw = 0.345 - 0.03 * sl - 0.008 * fem + 0.03 * sm;
  const neck = seg([0, -0.3, -0.075], [0, -1.0, -0.09], 0.205 - 0.035 * sl - 0.035 * fem, 0.235 - 0.035 * fem);
  const cut = P.cut ?? -0.66;
  const ns = 1.06 - 0.1 * fem + 0.03 * sl + 0.16 * sm;
  const mw = 1 - 0.08 * fem + 0.04 * sl;
  const noseRidge = seg([0, 0.075, 0.348], [0, -0.082 * ns, 0.392], 0.026, 0.034 * ns);
  return (x, y, z) => {
    const ax = abs(x);
    let d = ell(x, y - 0.06, z + 0.035, 0.372 - 0.018 * sl - 0.012 * fem, 0.405, 0.405);
    if (d > 0.9) return d;
    if (P.ush || P.bald) d = smin(d, ell(x, y - 0.2, z + 0.03, 0.335 - 0.02 * sl, 0.25, 0.37), 0.1);
    // khối mặt: rộng, má đầy, cằm tròn không góc hàm
    d = smin(d, ell(x, y + 0.075 + 0.025 * sl, z - 0.05, jw, 0.285 + 0.035 * sl, 0.31), 0.13);
    d = smin(d, ell(x, y + 0.19 + 0.035 * sl, z - 0.085, 0.268 - 0.05 * sl - 0.012 * fem + 0.05 * sm, 0.16, 0.264), 0.12);
    d = smin(d, ell(x, y - 0.13, z - 0.2, 0.262, 0.135, 0.155), 0.12);
    d = smin(d, ell(x, y + 0.318 + 0.04 * sl, z - 0.225, 0.118 - 0.018 * sl, 0.062, 0.08), 0.09);
    d = smin(d, ell(ax - 0.18 + 0.012 * sl, y + 0.085 - 0.03 * sm, z - 0.205 - 0.02 * sm, 0.148 + 0.02 * sm, 0.13 + 0.015 * sm, 0.13), 0.11);
    d = smin(d, ell(x, y + 0.37 + 0.035 * sl + 0.03 * sm, z - 0.03, 0.19 + 0.08 * sm, 0.08 + 0.02 * sm, 0.17 + 0.04 * sm), 0.1);
    // hốc mắt nông, nhãn cầu tròn dưới mí đầy
    d = smax(d, -ell(ax - 0.135, y + 0.012, z - 0.432, 0.122, 0.058, 0.082), 0.08);
    const lift = y + 0.006 - (0.09 + 0.07 * sl) * (ax - 0.135);
    d = smin(d, ell(ax - 0.135, lift, z - 0.298, 0.096, 0.054, 0.05), 0.05);
    // mũi ngắn thẳng, cánh mũi đầy
    if (ax < 0.14 && y < 0.16 && y > -0.22 && z > 0.2) {
      d = smin(d, noseRidge(x, y, z), 0.05);
      d = smin(d, ell(x, y + 0.1 * ns, z - 0.386, 0.042 * ns, 0.034 * ns, 0.038 * ns), 0.028);
      d = smin(d, ell(ax - 0.054 * ns, y + 0.11 * ns, z - 0.352, 0.034 * ns, 0.026 * ns, 0.03), 0.026);
      d += 0.0028 * bump(Math.hypot(ax - 0.028 * ns, y + 0.128 * ns) / 0.015) * sstep(0.3, 0.37, z);
    }
    if (ax < 0.24 && y < -0.1 && y > -0.33 && z > 0.18) {
      if (sm) {
        // miệng cười rộng hở răng, khoé lên cao
        const ux = x / 0.165;
        if (abs(ux) < 1.1) {
          const ym = -0.2 + 0.055 * ux * ux, h = 0.032 * (1 - ux * ux);
          d += 0.024 * sstep(h + 0.008, max(h - 0.006, 0), abs(y - ym + h * 0.5 - 0.012)) * sstep(1.05, 0.9, abs(ux));
          d -= 0.008 * bump((y - ym - 0.008 + 0.012) / 0.012) * bump(ux / 1.1);
        }
      } else {
        // môi nhỏ đầy, trên hình cánh cung, khoé hơi nhếch
        const bow = 0.004 * bump(ax / 0.03);
        d = smin(d, ell(x, y + MY - 0.024 - bow * 0.5, z - 0.352, 0.09 * mw, 0.02, 0.032), 0.018);
        d = smin(d, ell(x, y + MY + 0.026, z - 0.346, 0.072 * mw, 0.026, 0.032), 0.018);
        const ux = x / (0.104 * mw);
        if (abs(ux) < 1.25) {
          const ym = -MY + (0.01 + 0.003 * sl) * ux * ux + 0.005 * ux * ux * ux * ux - 0.003 * bump(ux / 0.3);
          d += 0.0095 * bump((y - ym) / 0.0105) * bump(ux / 1.25);
        }
        d += 0.002 * bump(x / 0.014) * sstep(-MY + 0.03, -MY + 0.042, y) * sstep(-MY + 0.078, -MY + 0.06, y);
        d += 0.0045 * bump((y + MY + 0.056) / 0.017) * bump(x / 0.075);
      }
    }
    // khe mắt khép hờ (Di Lặc: hai vành cung cười), nếp mí, chân mày cong
    if (z > 0.15 && y > -0.09 && y < 0.2) {
      const u = (ax - 0.135) / 0.088;
      if (abs(u) < 1.35) {
        const env = bump(u / 1.35), ys = sm ? 0.006 - 0.03 * u * u : eyeY(u, sl);
        d += 0.0062 * bump((y - ys) / 0.015) * env;
        d -= 0.004 * sstep(0, 0.014, y - ys) * sstep(0.065, 0.03, y - ys) * env;
        d += 0.0032 * sstep(0, -0.014, y - ys) * sstep(-0.05, -0.022, y - ys) * env;
        if (!sm) d += 0.0016 * bump((y - ys - 0.043 + 0.012 * u * u) / 0.007) * env;
      }
      if (ax < 0.33) {
        const yb = browY(ax, sl, fem) + 0.012 * sm;
        d -= (0.0028 - 0.0006 * fem) * bump((y - yb) / (0.03 - 0.005 * fem)) * sstep(0.015, 0.07, ax) * sstep(0.325, 0.25, ax);
        d += 0.002 * bump((y - yb + 0.038) / 0.026) * bump((ax - 0.16) / 0.15);
      }
    }
    // tai dài áp đầu, dái tai dày xẻ
    if (ax > 0.24 && y < 0.2 && y > -0.5 && z < 0.14) {
      let ea = ell(ax - 0.362, y - 0.02, z + 0.062, 0.036, 0.118, 0.074);
      ea = smin(ea, ell(ax - 0.356, y + 0.225 + 0.02 * sl, z + 0.022, 0.04, 0.13 + 0.02 * sl, 0.054), 0.055);
      ea = smax(ea, -ell(ax - 0.4, y - 0.012, z + 0.058, 0.026, 0.074, 0.044), 0.018);
      ea = smax(ea, -ell(ax - 0.38, y + 0.24 + 0.02 * sl, z + 0.022, 0.05, 0.068, 0.0085), 0.009);
      d = smin(d, ea, 0.06);
    }
    // cổ ngắn, ba ngấn mềm
    let nd = neck(x, y, z);
    if (y < -0.4 && y > -0.74) {
      const sag = 0.05 * (1 - clamp((x * x) / 0.05, 0, 1)) * sstep(-0.1, 0.15, z);
      for (const yf of [-0.47, -0.54, -0.61]) nd += 0.0062 * bump((y - yf + sag) / 0.0125);
    }
    d = smin(d, nd, 0.075);
    if (P.ush === 'round') d = smin(d, ell(x, y - 0.4, z + 0.04, 0.2, 0.13, 0.2), 0.06);
    if (P.ush === 'cone') d = smin(d, ell(x, y - 0.46, z + 0.05, 0.19, 0.225, 0.19), 0.07);
    if (P.crown) {
      // tóc rẽ ngôi nổi mềm dưới vành mão, vòng sau tai
      const hm = sstep(-0.012, 0.012, y - qHairY(x)) * sstep(-0.3, -0.05, z + 0.02);
      d -= 0.006 * hm;
      d = min(d, P.crown === 'fan' ? fanCrown(x, y, z) : lotusCrown(x, y, z));
      // khăn buông từ mão sau tai xuống vai
      let v = ell(x, y + 0.26, z + 0.22, 0.455, 0.72, 0.17);
      v -= 0.012 * fold(x * 22 + sin(y * 4) * 0.8);
      d = min(d, smax(v, y - 0.34, 0.03));
    }
    return max(d, cut - y);
  };
}
function makeHead(P) {
  const raw = makeRawHead(P), S = P.scale || 1;
  return (x, y, z) => raw(x / S, y / S, z / S) * S;
}
// vùng tóc để rải ốc tóc (toạ độ thô của đầu)
function hairMask(x, y, z, P) {
  if (P.crown || P.bald) return false;
  if (y < hairline(x, z, P) + 0.008) return false;
  if (abs(x) > 0.3 && y < 0.17 && z > -0.2) return false; // quanh tai
  return true;
}

/* =====================================================================
   Nếp vải: vài nếp sâu, lớn, đỉnh tròn
   ===================================================================== */
const fold = (u) => pow(0.5 + 0.5 * cos(u), 0.72);
// khối tiện theo mặt cắt elip đổi dần theo chiều cao: bảng [y, rộng x, sâu z, tâm z]
function loft(tab) {
  const n = tab.length;
  return (y) => {
    let i = 0;
    while (i < n - 2 && y > tab[i + 1][0]) i++;
    const a = tab[i], b = tab[i + 1], t = clamp((y - a[0]) / (b[0] - a[0]), 0, 1), u = t * t * (3 - 2 * t);
    return [mix(a[1], b[1], u), mix(a[2], b[2], u), mix(a[3], b[3], u)];
  };
}
const SEAT_LOFT = loft([[0.3, 1.3, 0.46, 0.1], [0.85, 1.14, 0.42, 0.07], [1.3, 1.06, 0.4, 0.03], [1.68, 1.02, 0.36, 0], [1.9, 0.86, 0.31, -0.02], [2.04, 0.5, 0.25, -0.04], [2.2, 0.27, 0.21, -0.05], [2.4, 0.24, 0.2, -0.06]]);
const CAPE_LOFT = loft([[0, 1.26, 0.62, 0.02], [0.6, 1.2, 0.58, 0.02], [1.6, 1.22, 0.52, 0.03], [2.6, 1.2, 0.5, 0.03], [3.4, 1.18, 0.45, 0.02], [3.95, 1.1, 0.38, 0], [4.24, 0.9, 0.32, -0.02], [4.42, 0.48, 0.26, -0.04], [4.62, 0.27, 0.21, -0.05], [4.9, 0.24, 0.2, -0.05]]);

/* =====================================================================
   Thân ngồi (mặt tòa y=0, nhìn +z; trái tượng = +x). Khối tam giác liền:
   áo phủ hai vai, tay chìm trong áo, chỉ vài rãnh sâu tách cánh tay.
   cfg: { robe: 'both'|'right-bare'|'belly', mudra: 'abhaya'|'dhyana'|'earth'|'knee', slender, sash, foot }
   ===================================================================== */
function makeSeated(cfg) {
  const sl = cfg.slender ? 1 : 0, w = sl ? 0.84 : 1, bare = cfg.robe === 'right-bare', belly = cfg.robe === 'belly';
  const SH = (sx) => [sx * 0.78 * w, 1.86, -0.02];
  const ELX = 0.98 * w, ELY = 1.08;
  const arm = (sh, el, wr, r0 = 0.2, r1 = 0.17, r2 = 0.125) => {
    const u = seg(sh, el, r0, r1), f = seg(el, wr, r1 * 0.96, r2);
    return (x, y, z) => smin(u(x, y, z), f(x, y, z), 0.06);
  };
  const hands = [], HS = sl ? 1.32 : 1.5;
  const palmUp = { F: [-1, 0.02, 0.1], B: [0, -0.82, -0.57], T: [0.1, -0.57, 0.82], curl: [0.16, 0.16, 0.18, 0.2], thumb: [0.115, -0.05, 0.19], s: HS };
  let armL, armR, sleeveL = null, sleeveR = null;
  const lap = (o) => hands.push(makeHand({ ...palmUp, o }));
  if (cfg.mudra === 'dhyana') {
    armL = arm(SH(1), [ELX, ELY, 0.14], [0.42, 0.72, 0.62]);
    armR = arm(SH(-1), [-ELX, ELY, 0.14], [-0.42, 0.76, 0.62]);
    hands.push(makeHand({ ...palmUp, o: [0.3, 0.71, 0.64], thumbMid: [0.122, -0.11, 0.115], thumb: [0.062, -0.142, 0.178] }));
    hands.push(makeHand({ ...palmUp, o: [-0.3, 0.76, 0.64], F: [1, 0.02, 0.1], thumbMid: [0.122, -0.09, 0.115], thumb: [0.062, -0.104, 0.178] }));
    sleeveL = sleeveR = true;
  } else if (cfg.mudra === 'abhaya') {
    // tay phải giơ ngang ngực (thí vô uý), tay trái ngửa trên gối như Tam Chúc
    armL = arm(SH(1), [ELX, ELY, 0.14], [0.46, 0.74, 0.64]);
    lap([0.36, 0.72, 0.66]);
    const wr = [-0.72 * w, 1.42, 0.62];
    armR = arm(SH(-1), [-ELX * 0.98, 1.0, 0.3], wr, 0.2, 0.17, 0.11);
    hands.push(makeHand({ o: wr, F: [0.08, 1, 0.1], B: [0, -0.1, -1], T: [1, 0, 0.08], curl: [0.1, 0.08, 0.08, 0.1], thumb: [0.135, -0.03, 0.13], flare: 0.12, s: HS * 0.98 }));
    sleeveL = sleeveR = true;
  } else if (cfg.mudra === 'earth') {
    armL = arm(SH(1), [ELX, ELY, 0.08], [0.42, 0.68, 0.5], 0.17, 0.125, 0.08);
    lap([0.34, 0.66, 0.54]);
    const wr = [-0.98 * w, 0.72, 0.68];
    armR = arm(SH(-1), [-0.95 * w, 1.15, 0.14], wr, 0.17, 0.115, 0.08);
    hands.push(makeHand({ o: wr, F: [-0.06, -0.72, 0.68], B: [-0.05, 0.68, 0.72], T: [1, 0, 0.08], curl: [0.05, 0.05, 0.06, 0.08], s: HS }));
    sleeveL = true;
  } else {
    // Di Lặc: tay phải đặt gối, tay trái nâng hạt ngọc
    armL = arm(SH(1), [ELX * 1.02, 1.05, 0.16], [0.86, 0.72, 0.62]);
    armR = arm(SH(-1), [-ELX * 1.02, 1.05, 0.16], [-0.92, 0.66, 0.68]);
    hands.push(makeHand({ o: [-0.92, 0.66, 0.72], F: [0.1, -0.5, 0.86], B: [0, 0.86, 0.5], T: [1, 0, -0.1], curl: [0.14, 0.14, 0.16, 0.2], s: HS }));
    hands.push(makeHand({ o: [0.86, 0.74, 0.66], F: [-0.5, 0.06, 0.8], B: [0, -0.9, -0.2], T: [0.8, -0.2, 0.5], curl: [0.42, 0.46, 0.5, 0.56], thumb: [0.11, -0.05, 0.16], s: HS }));
    sleeveL = sleeveR = false;
  }
  const footR = cfg.foot ? (() => {
    const heel = [0.5, 0.56, 0.84], toe = [1.05, 0.49, 0.8];
    const Fz = norm3([toe[0] - heel[0], toe[1] - heel[1], toe[2] - heel[2]]);
    let By = norm3([0.02, 0.8, 0.6]); const Tx = norm3(cross3(By, Fz)); By = cross3(Fz, Tx);
    const len = Math.hypot(toe[0] - heel[0], toe[1] - heel[1], toe[2] - heel[2]);
    const toes = [0, 1, 2, 3, 4].map((i) => [-0.07 + i * 0.037, len * (0.965 - i * i * 0.012 - (i ? 0.03 : 0))]);
    return (x, y, z) => {
      const px = x - heel[0], py = y - heel[1], pz = z - heel[2];
      const lx = px * Tx[0] + py * Tx[1] + pz * Tx[2], ly = px * By[0] + py * By[1] + pz * By[2], lz = px * Fz[0] + py * Fz[1] + pz * Fz[2];
      const bd = sph(lx, ly, lz - len * 0.5, len * 0.75);
      if (bd > 0.35) return bd;
      let d = ell(lx, ly + 0.05, lz - len * 0.4, 0.09, 0.066, len * 0.42);
      for (let i = 0; i < 5; i++) { const t = toes[i], r = i === 0 ? 0.03 : 0.0225 - i * 0.0013, dz = lz - t[1], q = dz > 0.02 ? dz - 0.02 : dz < -0.05 ? dz + 0.05 : 0; d = smin(d, sqrt((lx - t[0]) ** 2 + (ly + 0.045) ** 2 + q * q) - r, 0.007); }
      return d;
    };
  })() : null;
  const shinTop = seg([-1.14 * w, 0.32, 0.66], [0.6, 0.42, 0.78], 0.22, 0.14);
  const shinLow = seg([1.14 * w, 0.28, 0.56], [-0.2, 0.3, 0.46], 0.18, 0.13);
  const neck = seg([0, 1.8, -0.05], [0, 2.1, -0.05], 0.27, 0.19);
  const nB = norm3([-0.62, 0.785, 0]);
  const mask = bare
    ? (x, y) => (x + 0.64 * w) * nB[0] + (y - 1.29) * nB[1]
    : belly
      ? (x, y, z) => min(0.22 + (1.95 - y) * 0.5 - abs(x), z * 3 - 0.1)
      : (x, y, z) => min(0.05 + (y - 1.34) * 0.5 - abs(x), z * 3 - 0.1);
  // rãnh sâu tách cánh tay khỏi thân: từ nách xuống hông
  const groove = (ax, y) => { const xg = mix(0.52 * w, 0.72 * w, sstep(0.75, 1.55, y)); return bump((ax - xg) / 0.075) * sstep(0.82, 1.0, y) * sstep(1.62, 1.42, y); };
  const body = (x, y, z) => {
    const ax = abs(x), lap0 = ell(x, y - 0.22, z - 0.22, 1.38 * w, 0.28, 0.68);
    if (y > 2.3) return y - 2.24;
    let t, base;
    const aL = armL(x, y, z), aR = armR(x, y, z), ar = min(aL, aR);
    if (sl) {
      // Khmer: thân thon, tay tách rõ
      t = ell(x, y - 0.74, z - 0.01, 0.56, 0.44, 0.34);
      t = smin(t, ell(x, y - 1.14, z, 0.5, 0.44, 0.29), 0.26);
      t = smin(t, ell(x, y - 1.5, z, 0.58, 0.42, 0.31), 0.28);
      t = smin(t, ell(x, y - 1.84, z + 0.035, 0.76, 0.17, 0.25), 0.26);
      t = smin(t, neck(x, y, z), 0.1);
      base = smin(smin(t, aL, 0.1), aR, 0.08);
    } else {
      // khối tam giác liền vai xuống gối: tay nằm trong khối áo
      const [W, D, zc] = SEAT_LOFT(y), kx = x / W, kz = (z - zc) / D;
      t = (sqrt(kx * kx + kz * kz) - 1) * D * 1.05;
      if (belly) t = smin(t, ell(x, y - 0.86, z - 0.3, 0.92, 0.72, 0.62), 0.16);
      t = smin(t, neck(x, y, z), 0.08);
      base = smin(t, aL - 0.03, 0.14);
      base = smin(base, aR - 0.03, 0.14);
    }
    const m = mask(x, y, z), onFront = sstep(0.0, 0.14, z);
    let d = base - 0.024 * sstep(0.04, -0.04, m) * (bare ? sstep(-0.01, 0.07, aR - t + 0.05) : 1);
    d -= 0.04 * bump(m / 0.13) * (bare ? sstep(-0.01, 0.07, aR - t + 0.05) : 1); // mép áo cuộn dày
    const on = sstep(-0.06, -0.16, m);
    if (bare) {
      const trunk = sstep(-0.02, 0.12, ar - t);
      const px = x - 0.8 * w, py = y - 2.02, pr = sqrt(px * px + py * py), th = atan2(-px, -py);
      if (y > 0.5 && z > -0.2) d -= 0.03 * on * trunk * sstep(0.45, 0.85, pr) * sstep(0.56, 0.78, y) * fold(th * 22 + sin(pr * 3) * 1.1);
    } else if (!belly) {
      // bốn nếp U lớn trên ngực, bụng, sáu nếp dày dọc hai vạt tay áo
      const xs = ax / 0.6, u = y - 0.34 * xs * xs;
      d -= 0.075 * on * onFront * sstep(0.62, 0.8, y) * sstep(1.22, 1.02, u) * sstep(0.72, 0.5, ax) * fold(u * 15.5);
      const sleeveFold = fold(ax * 13.5 + y * 2.8 + 0.5 * sin(y * 2.2));
      d -= 0.085 * sstep(0.56, 0.78, ax) * sstep(0.55, 0.95, y) * sstep(1.84, 1.5, y) * sleeveFold;
      // rãnh sâu từ nách: tách tay áo khỏi ngực
      d += 0.055 * bump((ax - 0.68 - 0.05 * sin(y * 2.8)) / 0.06) * sstep(0.74, 0.94, y) * sstep(1.62, 1.38, y) * onFront;
      // yếm áo trong: dây buộc ngang
      const yb = 1.33 + 0.04 * x * x;
      if (z > 0.1) d -= 0.018 * bump((y - yb) / 0.04) * (1 - on);
      if (ax < 0.2 && y > 1.12 && y < 1.44 && z > 0.1) d = smin(d, ell(x, y - 1.3, z - 0.42, 0.075, 0.05, 0.05), 0.03);
    }
    if (belly && z > 0.1) d += 0.012 * bump(Math.hypot(x, y - 0.8) / 0.05); // rốn
    if (cfg.sash && y > 0.95 && y < 2.15 && z > 0) {
      const xs = 0.31 + (1.95 - y) * 0.04, dx = abs(x - xs);
      const end = 1.05 + 0.08 * (1 - min(1, dx / 0.09));
      d -= sstep(0.1, 0.075, dx) * sstep(end - 0.02, end + 0.02, y) * (0.022 + 0.005 * fold((x - xs) * 62));
    }
    // chân xếp bằng: một khối lớn, ống chân trên bắt chéo, vài nếp sâu từ gối vào lòng
    let lp = lap0;
    lp = smin(lp, ell(ax - 1.1 * w, y - 0.28, z - 0.46, 0.34, 0.27, 0.42), 0.22);
    lp = smin(lp, shinTop(x, y, z), 0.14);
    const kx = ax - 1.24 * w, ky = y - 0.34, kr = sqrt(kx * kx + ky * ky);
    lp -= 0.07 * fold(atan2(ky, -kx) * 15 + sin(kr * 3.2) * 1.2) * sstep(0.28, 0.62, kr) * sstep(0.14, 0.42, z) * sstep(0.01, 0.1, y);
    lp -= 0.045 * fold(y * 19 + 0.35 * x + 0.8 * sin(x * 2.4)) * sstep(0.7, 0.92, z) * sstep(0.62, 0.3, ax) * sstep(0.02, 0.08, y);
    d = smin(d, lp, 0.15);
    return max(d, -0.02 - y);
  };
  const ext = (x, y, z) => {
    let d = 1e9;
    if (footR) d = footR(x, y, z);
    for (const hnd of hands) d = min(d, hnd(x, y, z));
    return d;
  };
  return { body, ext };
}

/* =====================================================================
   Quan Âm đứng theo tượng Tây Bổ Đà: áo choàng rộng phủ kín hai vai,
   tay áo lớn buông quá gối, thân như khối cột vững, mở chữ V lộ áo trong
   ===================================================================== */
const QHY = 5.18, QHZ = 0.05, QHEAD_S = 1.12, QTOP = 6.25;
const Q = { shL: [0.84, 4.2, -0.02], shR: [-0.84, 4.2, -0.02], elL: [0.92, 3.3, 0.1], elR: [-0.92, 3.34, 0.14], wrL: [0.36, 3.26, 0.56], wrR: [-0.54, 4.04, 0.52] };
function makeStanding() {
  const armUL = seg(Q.shL, Q.elL, 0.24, 0.2), armUR = seg(Q.shR, Q.elR, 0.24, 0.2);
  const foreL = seg(Q.elL, Q.wrL, 0.19, 0.145), foreR = seg(Q.elR, Q.wrR, 0.19, 0.135);
  const handL = makeHand({ o: [0.33, 3.26, 0.6], F: [-1, 0.03, 0.26], B: [0, -1, 0.03], T: [0.26, 0, 1], curl: [0.3, 0.34, 0.38, 0.44], thumb: [0.11, 0.0, 0.16], s: 1.45 });
  const handR = makeHand({ o: [-0.52, 4.06, 0.56], F: [0.1, 1, 0.1], B: [0, -0.1, -1], T: [1, 0, 0.1], curl: [0.62, 0.1, 0.09, 0.12], thumb: [0.066, -0.062, 0.2], flare: 0.1, s: 1.42 });
  const neck = seg([0, 4.3, -0.05], [0, 4.72, -0.05], 0.3, 0.17);
  // tay áo lớn: khối dày buông từ cẳng tay, đáy cong, vài nếp sâu
  const sleeve = (el, wr, hem0, hem1) => {
    const dx = wr[0] - el[0], dz = wr[2] - el[2], ll = dx * dx + dz * dz;
    return (x, y, z) => {
      const px = x - el[0], pz = z - el[2];
      const tt = (px * dx + pz * dz) / ll, tc = clamp(tt, -0.25, 1);
      const qx = px - dx * tc, qz = pz - dz * tc, ds = sqrt(qx * qx + qz * qz);
      const tq = clamp(tt, 0, 1), top = mix(el[1], wr[1], tq) + 0.1;
      const hem = mix(hem0, hem1, tq) + 0.7 * (tq - 0.35) * (tq - 0.35);
      const fl = fold(tt * 7.5 + sin(y * 1.6) * 0.9) * 0.05 * sstep(top - 0.1, top - 0.5, y);
      const th = 0.21 * sstep(hem - 0.02, hem + 0.45, y) + 0.05;
      return smax(smax(ds - th - fl, hem - y + 0.22 * pow(clamp(ds / 0.28, 0, 1), 2), 0.14), y - top, 0.12);
    };
  };
  const slL = sleeve(Q.elL, Q.wrL, 0.95, 1.5), slR = sleeve(Q.elR, Q.wrR, 1.05, 2.25);
  const body = (x, y, z) => {
    const ax = abs(x);
    if (y > 4.88) return y - 4.82;
    // khối vai rộng tròn, ngực đầy
    let t = ell(x, y - 3.8, z, 0.62, 0.62, 0.36);
    t = smin(t, ell(x, y - 4.26, z + 0.02, 0.92, 0.2, 0.32), 0.26);
    t = smin(t, ell(x, y - 4.42, z + 0.03, 0.46, 0.17, 0.25), 0.2);
    t = smin(t, neck(x, y, z), 0.12);
    // áo trong: khối cột xoè nhẹ về gấu
    const rx = mix(0.62, 0.72, sstep(3.2, 1.2, y)) + 0.2 * sstep(0.9, 0.03, y), rz = mix(0.36, 0.44, sstep(3.2, 1.2, y)) + 0.2 * sstep(0.9, 0.03, y);
    const kx = x / rx, kz = (z - 0.03) / rz, kr = sqrt(kx * kx + kz * kz), th = atan2(x, z);
    let sk = (kr - 1) * min(rx, rz) * 1.04;
    sk = smax(sk, y - 3.75, 0.2);
    if (y < 3.2) {
      const gr = sstep(3.1, 0.8, y);
      // nếp chữ V lớn trước váy và nếp dọc hai bên
      const v = y + 1.3 * ax;
      sk -= 0.05 * gr * fold(v * 10) * sstep(0.45, 0.2, ax) * sstep(0.0, 0.3, z) * sstep(0.2, 0.8, y);
      sk -= (0.02 + 0.05 * gr) * fold(th * 8 + 0.8 * sin(y * 1.1 + th)) * sstep(0.1, 0.4, ax);
    }
    sk = smax(sk, 0.03 + 0.018 * sin(th * 7) - y, 0.03);
    const aU = smin(armUL(x, y, z), armUR(x, y, z), 0.01), aF = min(foreL(x, y, z), foreR(x, y, z));
    let d = smin(t, sk, 0.2);
    // áo trong: cổ tròn ngang ngực, đai và nơ, hai dải lụa
    const nl = 4.28 + 0.34 * x * x;
    if (z > 0) d -= 0.018 * sstep(0.03, -0.03, y - nl) + 0.012 * bump((y - nl) / 0.055);
    const belt = 3.3 + 0.04 * x * x;
    if (z > 0) d -= 0.022 * bump((y - belt) / 0.075);
    if (z > 0.1 && y < 3.3 && y > 1.5) {
      for (const sg of [-1, 1]) { const xr = sg * (0.065 + (3.3 - y) * 0.03), hw = 0.065; d -= 0.024 * sstep(hw + 0.02, hw - 0.012, abs(x - xr)) * sstep(1.5, 1.66, y); }
    }
    if (z > 0 && abs(y - 3.28) < 0.2 && ax < 0.24) { d = smin(d, ell(x, y - 3.28, z - 0.42, 0.075, 0.06, 0.05), 0.03); d = smin(d, ell(ax - 0.13, y - 3.28 + 0.05 * ax, z - 0.4, 0.09, 0.05, 0.04), 0.03); }
    // áo choàng khối chuông: mặt cắt elip rộng từ vai xuống gấu, hở chữ V trước
    const [CW, CD, CZ] = CAPE_LOFT(y), cx = x / CW, cz = (z - CZ) / CD;
    let cape = (sqrt(cx * cx + cz * cz) - 1) * CD * 1.05;
    cape = smax(cape, 0.02 - y, 0.03);
    // vài nếp đứng sâu, to quanh áo, lượn theo chiều cao
    const cth = atan2(x, z - CZ), gF = sstep(4.05, 3.3, y);
    cape -= 0.085 * gF * fold(cth * 9 + 0.7 * sin(y * 1.3 + cth * 2));
    cape -= 0.03 * sstep(4.3, 3.7, y) * sstep(0.3, 0.6, ax) * fold(ax * 8 + y * 2);
    // vạt áo mở chữ V: hẹp ở cổ, rộng ở gấu, viền lật dày
    const vm = 0.2 + (4.42 - y) * 0.09 + max(0, y - 4.2) * 0.3 - ax;
    const fr = sstep(-0.02, 0.2, z);
    cape = mix(cape, smax(cape, 0.03 + 0 * vm - sstep(-0.1, 0.03, vm) * 0 + (vm > 0 ? vm : -1), 0.02), fr);
    cape -= 0.035 * bump((vm + 0.012) / 0.06) * fr * sstep(4.6, 4.3, y);
    // hai cánh tay áo nổi: từ vai đến cẳng tay + vạt rủ dưới cẳng tay
    cape = smin(cape, smin(smin(aU - 0.02, aF - 0.03, 0.08), smin(slL(x, y, z), slR(x, y, z), 0.02), 0.08), 0.2);
    d = smin(d, cape, 0.03);
    // cổ tay lộ khỏi miệng tay áo
    d = min(d, min(foreL(x, y, z) + 0.075, foreR(x, y, z) + 0.065));
    return max(d, -y);
  };
  const ext = (x, y, z) => {
    let d = min(handL(x, y, z), handR(x, y, z));
    if (y < 0.3) d = min(d, max(min(ell(x - 0.24, y - 0.055, z - 0.72, 0.11, 0.07, 0.15), ell(x + 0.24, y - 0.055, z - 0.72, 0.11, 0.07, 0.15)), -y));
    return d;
  };
  return { body, ext };
}

/* =====================================================================
   Phật nằm: đầu về -x, nằm nghiêng phải, mặt nhìn +z. Đầu dựng riêng rồi xoay 90°.
   ===================================================================== */
const NB_HEAD = [-2.3, 1.02, 0.04];
function makeReclining() {
  const shoulderSeg = seg([-1.4, 0.72, 0], [-1.05, 0.66, 0], 0.62, 0.6);
  const legs = seg([0.55, 0.62, 0.04], [2.62, 0.44, 0.06], 0.6, 0.33);
  const armTop = seg([-1.18, 1.3, 0.34], [0.32, 1.03, 0.52], 0.24, 0.14);
  const armUnder = seg([-1.5, 0.42, 0.22], [-2.72, 0.34, 0.3], 0.2, 0.17);
  const hand = makeHand({ o: [0.32, 1.02, 0.56], F: [1, -0.16, 0.02], B: [0.03, 0.2, 0.98], T: [0.16, 0.97, -0.2], curl: [0.1, 0.1, 0.12, 0.15], s: 1.42 });
  const nk = seg([-1.75, 0.98, 0.0], [-1.05, 0.86, 0], 0.26, 0.34);
  const body = (x, y, z) => {
    let t = shoulderSeg(x, y, z);
    t = smin(t, ell(x + 0.45, y - 0.72, z, 0.9, 0.68, 0.56), 0.3);
    t = smin(t, ell(x - 0.32, y - 0.76, z, 0.95, 0.72, 0.6), 0.32);
    t = smin(t, legs(x, y, z), 0.26);
    t = smin(t, nk(x, y, z), 0.12);
    let d = smin(t, armTop(x, y, z), 0.12);
    d = smin(d, armUnder(x, y, z), 0.12);
    // bàn chân xếp chồng ở cuối, phủ gấu áo
    d = smin(d, ell(x - 2.86, y - 0.34, z - 0.1, 0.17, 0.3, 0.24), 0.1);
    // gối đỡ đầu
    let pil = ell(x + 2.42, y - 0.3, z - 0.02, 0.88, 0.34, 0.62);
    pil -= 0.012 * fold(x * 18) * sstep(0.1, 0.3, z);
    // nếp dài chạy dọc thân, vài nếp sâu lượn theo hông và chân
    const u = y + 0.1 * (x - 0.3) * (x - 0.3) * 0.5 - 0.04 * x;
    d -= 0.075 * fold(u * 9.5 + 0.9 * sin(x * 1.4)) * sstep(-0.1, 0.25, z) * sstep(-1.05, -0.65, x) * sstep(0.06, 0.2, y);
    // gấu áo chảy xuống bệ
    d = smin(d, ell(x - 0.2, y - 0.06, z - 0.42, 2.7, 0.12, 0.2) - 0.012 * fold(x * 9), 0.14);
    d = min(d, pil);
    return max(d, -0.02 - y);
  };
  return { body, ext: hand };
}

/* =====================================================================
   Vật liệu: sơn mài thếp vàng, đồng hun, sứ trắng, đá, ngọc
   ===================================================================== */
const PAL = {
  gold: { base: '#e8c274', hi: '#f8e4b4', low: '#7a4a1c', metal: 0.82, rough: 0.43, cc: 0.2, ccr: 0.42, env: 1.0, nz: 0.07, hair: '#54391c', halo: '#f0c25e', glow: '#ffb347' },
  bronze: { base: '#8a5e34', hi: '#c08a52', low: '#2a2a20', metal: 0.85, rough: 0.5, cc: 0.25, ccr: 0.45, env: 0.85, nz: 0.16, hair: '#3a2a1c', halo: '#a87a44', glow: '#e08a3a' },
  white: { base: '#f3efe7', hi: '#fbf8f2', low: '#a89e90', metal: 0, rough: 0.38, cc: 0.55, ccr: 0.22, env: 0.55, nz: 0.015, hair: '#3a3632', halo: '#f2e2b8', glow: '#ffd890' },
  stone: { base: '#a49d90', hi: '#c2bbae', low: '#3e3a34', metal: 0, rough: 0.9, cc: 0, ccr: 0.5, env: 0.35, nz: 0.2, hair: '#5a554c', halo: '#a49d90', glow: '#c8a060' },
  bronze_dark: { base: '#3a3c42', hi: '#7a7c84', low: '#101014', metal: 0.72, rough: 0.27, cc: 1, ccr: 0.12, env: 1.6, nz: 0.03, hair: '#1a1a20', halo: '#c79a44', glow: '#ffb347', skin: '#a0663e' },
  wood_gold: { base: '#e3b65a', hi: '#f6dc98', low: '#7c1e10', metal: 0.62, rough: 0.48, cc: 0.15, ccr: 0.5, env: 1.0, nz: 0.06, hair: '#2a1610', halo: '#d8a544', glow: '#ffb347', crease: 0.2 },
  stone_blue: { base: '#667a86', hi: '#8ea2ae', low: '#28363e', metal: 0, rough: 0.82, cc: 0, ccr: 0.5, env: 0.4, nz: 0.14, hair: '#2c3a42', halo: '#7a8e9a', glow: '#a0b8c8' },
  jackfruit: { base: '#9a642a', hi: '#bb8446', low: '#351c0a', metal: 0, rough: 0.46, cc: 0.35, ccr: 0.35, env: 0.6, nz: 0.05, hair: '#3a2210', halo: '#b07a34', glow: '#e0a050', grain: 0.11 },
  jade: { base: '#5a9c7c', hi: '#a6dcbe', low: '#0e3022', metal: 0, rough: 0.16, cc: 1, ccr: 0.08, env: 0.7, nz: 0.1, hair: '#2a5a44', halo: '#8cc8a8', glow: '#9ee8c0' },
};
const envHook = () => function (r, scene, cam, geo, mat) {
  if (mat && !mat.envMap && scene.environment) { mat.envMap = scene.environment; mat.needsUpdate = true; }
};
function makeMats(name) {
  const p = PAL[name] || PAL.gold;
  const phys = (o) => new THREE.MeshPhysicalMaterial({ metalness: p.metal, roughness: p.rough, clearcoat: p.cc, clearcoatRoughness: p.ccr, envMapIntensity: p.env, ...o });
  const body = phys({ color: 0xffffff, vertexColors: true });
  const hair = phys({ color: p.hair, roughness: Math.min(1, p.rough + 0.12) });
  const halo = new THREE.MeshStandardMaterial({ color: p.halo, metalness: p.metal * 0.9, roughness: p.rough + 0.05, emissive: p.glow, emissiveIntensity: 0.0, envMapIntensity: p.env });
  return { p, body, hair, halo };
}
// tô màu theo AO + nhiễu thấp tần (vá vàng lá, vân đá)
// nét vẽ trên tượng sứ (mày, mi, môi, tóc mai): tranh mịn chiếu từ phía trước, không phụ thuộc mắt lưới
function faceCanvas(P) {
  return cached('facetex:' + (P.fem ? 'f' : 'm') + (P.crown ? 'h' : ''), () => {
    const SZ = 1024, c = document.createElement('canvas'); c.width = c.height = SZ;
    const g = c.getContext('2d'), sl = P.slender ? 1 : 0, fem = P.fem ? 1 : 0;
    g.fillStyle = '#fff'; g.fillRect(0, 0, SZ, SZ);
    const X = (x) => SZ / 2 + (x / 1.0) * SZ, Y = (y) => SZ / 2 - (y / 1.0) * SZ; // ô [-0.5, 0.5] thô
    g.lineCap = 'round'; g.lineJoin = 'round';
    const curve = (fn, a, b, n = 28) => { g.beginPath(); for (let i = 0; i <= n; i++) { const t = a + ((b - a) * i) / n, [x, y] = fn(t); i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)); } };
    for (const sg of [-1, 1]) {
      // mày mảnh, thuôn hai đầu
      g.strokeStyle = 'rgba(58,48,44,.8)';
      for (let i = 0; i < 24; i++) {
        const a0 = 0.05 + (i / 24) * 0.255, a1 = a0 + 0.255 / 24 + 0.002;
        g.lineWidth = 0.8 + 3.2 * sin(PI * pow((i + 0.5) / 24, 0.75));
        g.beginPath(); g.moveTo(X(sg * a0), Y(browY(a0, sl, fem))); g.lineTo(X(sg * a1), Y(browY(a1, sl, fem))); g.stroke();
      }
      // mép mí trên
      g.strokeStyle = 'rgba(46,38,36,.82)'; g.lineWidth = 2.8;
      curve((u) => [sg * (0.135 + u * 0.09), eyeY(u, sl) + 0.003], -1.1, 1.18); g.stroke();
      g.strokeStyle = 'rgba(70,56,50,.3)'; g.lineWidth = 1.6;
      curve((u) => [sg * (0.135 + u * 0.09), eyeY(u, sl) + 0.043 - 0.012 * u * u], -0.85, 1.0); g.stroke();
    }
    // tóc đen rẽ ngôi lộ dưới khăn
    if (P.crown) {
      // má hồng rất nhẹ cho sứ khỏi lạnh
      for (const sg of [-1, 1]) {
        const cx = X(sg * 0.17), cy = Y(-0.13), gr = g.createRadialGradient(cx, cy, 2, cx, cy, 120);
        gr.addColorStop(0, 'rgba(232,180,160,.2)'); gr.addColorStop(1, 'rgba(232,180,160,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, 120, 0, PI * 2); g.fill();
      }
    }
    // môi hồng phớt
    const mw = 1 - 0.1 * fem + 0.04 * sl;
    const ym = (ux) => -MY + 0.01 * ux * ux + 0.005 * ux ** 4 - 0.003 * bump(ux / 0.3);
    g.fillStyle = 'rgba(206,128,116,.38)';
    g.beginPath();
    for (let i = 0; i <= 30; i++) { const ux = -1 + (i / 15); const ax = abs(ux) * 0.092 * mw; g.lineTo(X(ux * 0.092 * mw), Y(ym(ux) + 0.022 * (1 - ux * ux) + 0.006 * bump(ax / 0.03 - 0.7))); }
    for (let i = 0; i <= 30; i++) { const ux = 1 - (i / 15); g.lineTo(X(ux * 0.092 * mw), Y(ym(ux) - 0.042 * (1 - ux * ux * ux * ux))); }
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(120,62,56,.62)'; g.lineWidth = 1.8;
    curve((ux) => [ux * 0.096 * mw, ym(ux)], -1, 1); g.stroke();
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    return tex;
  });
}
// gán uv chiếu thẳng cho lưới đầu; phần sau gáy rơi vào góc trắng của tranh
function faceUV(geo, oy, oz, S) {
  const pos = geo.attributes.position, uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), back = pos.getZ(i) - oz < -0.12 * S;
    uv[i * 2] = 0.5 + x / S;
    uv[i * 2 + 1] = back ? 0.995 : 0.5 + (pos.getY(i) - oy) / S;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}
// màu vùng tóc dưới ốc: sẫm để khe giữa các ốc không lộ sáng
function hairPaint(geo, oy, oz, S, P, p) {
  const pos = geo.attributes.position, n = pos.count, out = new Float32Array(n * 3).fill(1);
  const h = new THREE.Color(p.hair), b = new THREE.Color(p.base);
  const rr = min(1, (h.r / b.r) * 0.55), gg = min(1, (h.g / b.g) * 0.55), bb = min(1, (h.b / b.b) * 0.55);
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i) / S, y = (pos.getY(i) - oy) / S, z = (pos.getZ(i) - oz) / S;
    const w = sstep(-0.004, 0.012, y - hairline(x, z, P)) * (y > -0.65 ? 1 : 0) * (abs(x) > 0.3 && y < 0.17 && z > -0.2 ? 0 : 1);
    if (w > 0) { out[i * 3] = mix(1, rr, w); out[i * 3 + 1] = mix(1, gg, w); out[i * 3 + 2] = mix(1, bb, w); }
  }
  return out;
}
function colorize(geo, p, extraDark = 0, paint = null) {
  const pos = geo.attributes.position, ao = geo.attributes.ao, n = pos.count;
  const base = new THREE.Color(p.base), lo = new THREE.Color(p.low), hi = new THREE.Color(p.hi);
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const a = ao ? ao.getX(i) : 1;
    const t = sstep(0.22, 0.86, a - extraDark);
    const nz = sin(x * 5.3 + sin(y * 3.1)) * cos(z * 4.7 + y * 1.9) * 0.5 + sin(x * 17.1 + y * 13.7 + z * 11.3) * 0.25;
    const k = (1 + p.nz * nz) * (p.grain ? 1 + p.grain * sin(y * 7 + sin(x * 3 + z * 2) * 4 + sin(y * 40 + x * 9) * 0.5) : 1);
    const h = sstep(0.82, 1.0, a) * 0.2;
    col[i * 3] = (mix(lo.r, base.r, t) * k) * (1 - h) + hi.r * h;
    col[i * 3 + 1] = (mix(lo.g, base.g, t) * k) * (1 - h) + hi.g * h;
    col[i * 3 + 2] = (mix(lo.b, base.b, t) * k) * (1 - h) + hi.b * h;
    if (paint) for (let c = 0; c < 3; c++) col[i * 3 + c] *= paint[i * 3 + c];
  }
  const g = new THREE.BufferGeometry();
  for (const k of ['position', 'normal', 'uv']) if (geo.attributes[k]) g.setAttribute(k, geo.attributes[k]);
  g.setIndex(geo.index);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.boundingSphere = geo.boundingSphere;
  return g;
}

/* =====================================================================
   Tòa sen
   ===================================================================== */
function petalGeo(L, W, o = {}) {
  const { cup = 0.1, bend = 0.12, thick = 0.05, nu = 10, nv = 12, rim = 0.012, sharp = 0.6 } = o;
  const pos = [], ao = [], idx = [];
  const wv = (v) => W * pow(sin(PI * pow(v, 0.72)), sharp) * (1 - 0.3 * v * v * v) + W * 0.14 * (1 - v);
  const rs = W / 0.25;
  const grid = (side) => {
    const start = pos.length / 3;
    for (let j = 0; j <= nv; j++) {
      const v = 1 - pow(1 - j / nv, 1.25);
      const w = wv(v), s = pow(sin(PI * min(v * 1.05, 1)), 0.5);
      for (let i = 0; i <= nu; i++) {
        const u = -1 + (2 * i) / nu, e = 1 - u * u;
        let z = bend * v * v + cup * e * s;
        if (side > 0) {
          const de = (1 - abs(u)) * w; // khoảng cách tới mép → gờ viền kép
          z += rim * exp(-((de - 0.045 * rs) ** 2) / (0.0005 * rs * rs)) * sstep(0.02, 0.15, v);
          z += rim * 0.6 * exp(-((u * w) ** 2) / (0.0004 * rs * rs)) * sstep(0.15, 0.4, v) * sstep(0.95, 0.7, v);
        } else z -= thick * sqrt(e) * pow(sin(PI * min(v, 1)), 0.6) + 0.004;
        pos.push(u * w, L * v, z);
        ao.push(side > 0 ? mix(0.42, 1, sstep(0, 0.5, v)) * (0.8 + 0.2 * e) : 0.45);
      }
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const a = start + j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
      if (side > 0) idx.push(a, b, d, a, d, c); else idx.push(a, d, b, a, c, d);
    }
  };
  grid(1); grid(-1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('ao', new THREE.Float32BufferAttribute(ao, 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
function petalRing(petal, n, r, y, tilt, phase = 0, down = false) {
  const geos = [], e = new THREE.Euler();
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * PI * 2;
    e.set(down ? -tilt : tilt, 0, down ? PI : 0, 'XYZ');
    const m = new THREE.Matrix4().makeRotationY(a).multiply(new THREE.Matrix4().makeTranslation(0, y, r)).multiply(new THREE.Matrix4().makeRotationFromEuler(e));
    const g = petal.clone(); g.applyMatrix4(m); geos.push(g);
  }
  return mergeGeometries(geos);
}
function latheAO(pts, segs, aoFn) {
  const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segs);
  const pos = g.attributes.position, ao = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) ao[i] = aoFn ? aoFn(pos.getY(i), Math.hypot(pos.getX(i), pos.getZ(i))) : 1;
  g.setAttribute('ao', new THREE.BufferAttribute(ao, 1));
  return g;
}
const GEO = new Map();
const cached = (k, fn) => { if (!GEO.has(k)) GEO.set(k, fn()); return GEO.get(k); };

// 'maha' (Bắc tông, 3 tầng cánh ngửa + 1 tầng cánh úp), 'khmer' (cánh thon), 'stand' (Quan Âm)
function throneGeos(style) {
  return cached('throne:' + style, () => {
    const out = [];
    if (style === 'khmer') {
      out.push(latheAO([[0, 0], [2.05, 0], [2.05, 0.14], [1.95, 0.18], [1.95, 0.24], [1.82, 0.3], [1.7, 0.34], [1.7, 0.4], [1.5, 0.46], [1.32, 0.5], [1.32, 0.66], [1.45, 0.7], [1.5, 0.76]], 48, (y, r) => (r < 1.4 && y > 0.48 ? 0.55 : 0.9 + 0.1 * sstep(0, 0.3, y))));
      out.push(petalRing(petalGeo(0.32, 0.12, { cup: 0.04, bend: 0.06, nu: 6, nv: 8, sharp: 0.8 }), 28, 1.55, 0.48, -0.25, 0, true));
      out.push(latheAO([[1.3, 0.62], [1.45, 0.8], [1.55, 1.05], [1.58, 1.3], [1.52, 1.42], [1.2, 1.45], [0, 1.45]], 48, (y) => mix(0.4, 0.85, sstep(0.7, 1.4, y))));
      out.push(petalRing(petalGeo(0.58, 0.15, { cup: 0.06, bend: 0.1, nu: 8, nv: 12, sharp: 0.85 }), 26, 1.48, 0.72, 0.42));
      out.push(petalRing(petalGeo(0.5, 0.14, { cup: 0.055, bend: 0.1, nu: 8, nv: 12, sharp: 0.85 }), 26, 1.56, 0.98, 0.3, PI / 26));
      return { parts: out, seat: 1.45 };
    }
    if (style === 'plinth') {
      // bệ tròn nhiều cấp cho tượng Di Lặc, Bà: đơn giản, vững
      out.push(latheAO([[0, 0], [1.92, 0], [1.92, 0.14], [1.84, 0.18], [1.78, 0.3], [1.6, 0.36], [1.56, 0.84], [1.66, 0.9], [1.72, 1.0], [1.72, 1.08], [1.6, 1.13], [0, 1.15]], 56, (y, r) => (r < 1.6 && y > 0.3 && y < 0.9 ? 0.72 : 0.95)));
      out.push(petalRing(petalGeo(0.3, 0.2, { cup: 0.04, bend: 0.05, nu: 6, nv: 6 }), 24, 1.6, 0.56, 0.1));
      return { parts: out, seat: 1.15 };
    }
    const S = style === 'stand' ? 0.78 : 1;
    const sc = (pts) => pts.map(([r, y]) => [r * S, y * S]);
    out.push(latheAO(sc([[0, 0], [1.98, 0], [1.98, 0.1], [1.92, 0.13], [1.92, 0.19], [1.78, 0.23], [1.62, 0.27], [1.48, 0.31], [1.36, 0.38], [1.32, 0.45], [1.32, 0.56]]), 56, (y, r) => (r < 1.4 * S && y > 0.35 * S ? 0.55 : 0.95)));
    out.push(petalRing(petalGeo(0.36 * S, 0.22 * S, { cup: 0.05 * S, bend: 0.06 * S, nu: 8, nv: 8 }), 20, 1.44 * S, 0.6 * S, -0.55, 0, true));
    out.push(latheAO(sc([[1.2, 0.45], [1.24, 0.6], [1.28, 0.9], [1.22, 1.1], [1.1, 1.15], [0, 1.15]]), 48, (y) => mix(0.3, 0.7, sstep(0.6 * S, 1.1 * S, y))));
    out.push(petalRing(petalGeo(0.74 * S, 0.33 * S, { cup: 0.11 * S, bend: 0.16 * S }), 16, 1.22 * S, 0.48 * S, 0.8));
    out.push(petalRing(petalGeo(0.62 * S, 0.29 * S, { cup: 0.1 * S, bend: 0.12 * S }), 16, 1.16 * S, 0.66 * S, 0.56, PI / 16));
    out.push(petalRing(petalGeo(0.44 * S, 0.24 * S, { cup: 0.08 * S, bend: 0.08 * S, nu: 8, nv: 10 }), 16, 1.08 * S, 0.86 * S, 0.34, 0));
    return { parts: out, seat: 1.15 * S };
  });
}

/* =====================================================================
   Hào quang & vòm
   ===================================================================== */
// lấy mẫu đều đường gấp khúc
function resample(pts, step) {
  const out = [pts[0].clone()];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], L = a.distanceTo(b);
    let t = step - carry;
    while (t <= L) { out.push(a.clone().lerp(b, t / L)); t += step; }
    carry = L - (t - step);
  }
  return out;
}
// đường viền lưỡi lửa: dịch đường cơ sở ra ngoài theo pháp tuyến, ngọn nghiêng về phía trên
function flameOutline(base, closed, tongue, amp, lean = 0.5) {
  const pts = resample(base, tongue / 18), n = pts.length;
  const total = (n - 1) * (tongue / 18), k = Math.max(1, Math.round(total / tongue)), L = total / k;
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = pts[closed ? (i - 1 + n) % n : max(0, i - 1)], b = pts[closed ? (i + 1) % n : min(n - 1, i + 1)];
    let tx = b.x - a.x, ty = b.y - a.y; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const up = ty >= 0 ? 1 : -1;
    let t = ((i * tongue) / 18 % L) / L;
    if (up < 0) t = 1 - t;
    const wv = pow(t, 1 + lean), sw = sin(PI * wv);
    const f = pow(sw, 1.3);
    const edge = closed ? 1 : sstep(0, 0.04, i / n) * sstep(1, 0.96, i / n);
    const g = amp * f * edge, sh = amp * 0.45 * lean * pow(sw, 4) * edge;
    out.push(new THREE.Vector2(pts[i].x + ty * g + tx * up * sh, pts[i].y - tx * g + ty * up * sh));
  }
  return out;
}
// trả về texture nổi (đen nền) + texture màu (nền tối hơn để tượng nổi bật trên hào quang)
function haloTex(draw) {
  const mk = (bg) => {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, 512, 512);
    g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineCap = 'round';
    draw(g);
    return new THREE.CanvasTexture(c);
  };
  const t = mk('#000'), col = mk('#8a7a6a');
  col.colorSpace = THREE.SRGBColorSpace;
  t.color = col;
  return t;
}
function fitUV(geo) {
  geo.computeBoundingBox();
  const bb = geo.boundingBox, uv = geo.attributes.uv, pos = geo.attributes.position;
  const w = bb.max.x - bb.min.x, h = bb.max.y - bb.min.y;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) - bb.min.x) / w, (pos.getY(i) - bb.min.y) / h);
  return [bb.min.x, bb.min.y, w, h];
}
const EXT = { depth: 0.04, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1, curveSegments: 4 };
// vầng hào quang tròn sau đầu
function headHalo(R) {
  return cached('hhalo:' + R, () => {
    const base = [];
    for (let i = 0; i <= 96; i++) { const a = PI / 2 - (i / 96) * PI * 2; base.push(new THREE.Vector2(cos(a) * R, sin(a) * R)); }
    const geo = new THREE.ExtrudeGeometry(new THREE.Shape(flameOutline(base, true, R * 0.33, R * 0.2, 0.0)), EXT);
    const [x0, y0, W] = fitUV(geo);
    const tex = haloTex((g) => {
      const s = 512 / W, cx = -x0 * s, cy = 512 + y0 * s;
      g.translate(cx, cy);
      g.lineWidth = 7; g.beginPath(); g.arc(0, 0, R * 0.97 * s, 0, PI * 2); g.stroke();
      g.lineWidth = 3; g.beginPath(); g.arc(0, 0, R * 0.87 * s, 0, PI * 2); g.stroke();
      for (let i = 0; i < 40; i++) { const a = (i / 40) * PI * 2; g.beginPath(); g.arc(cos(a) * R * 0.92 * s, sin(a) * R * 0.92 * s, 4, 0, PI * 2); g.fill(); }
      g.lineWidth = 3;
      for (let i = 0; i < 20; i++) {
        g.save(); g.rotate((i / 20) * PI * 2);
        g.beginPath(); g.moveTo(0, R * 0.6 * s);
        g.bezierCurveTo(R * 0.14 * s, R * 0.66 * s, R * 0.1 * s, R * 0.78 * s, 0, R * 0.84 * s);
        g.bezierCurveTo(-R * 0.1 * s, R * 0.78 * s, -R * 0.14 * s, R * 0.66 * s, 0, R * 0.6 * s); g.stroke();
        g.restore();
      }
      g.lineWidth = 4; g.beginPath(); g.arc(0, 0, R * 0.58 * s, 0, PI * 2); g.stroke();
      g.globalAlpha = 0.45; g.lineWidth = 1.5;
      for (let i = 0; i < 72; i++) { const a = (i / 72) * PI * 2; g.beginPath(); g.moveTo(cos(a) * R * 0.3 * s, sin(a) * R * 0.3 * s); g.lineTo(cos(a) * R * 0.55 * s, sin(a) * R * 0.55 * s); g.stroke(); }
    });
    return { geo, tex };
  });
}
// thân quang hình cánh sen nhọn có viền lửa
function auraBase(y0, y1, W, N = 60) {
  const left = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    left.push(new THREE.Vector2(-W * pow(sin(PI * (0.3 + 0.7 * s)), 0.8), y0 + (y1 - y0) * s));
  }
  return left;
}
function bodyAura() {
  return cached('aura', () => {
    const y0 = 1.0, y1 = 6.25, left = auraBase(y0, y1, 2.0);
    const base = [...left, ...left.slice(0, -1).reverse().map((p) => new THREE.Vector2(-p.x, p.y))];
    const geo = new THREE.ExtrudeGeometry(new THREE.Shape(flameOutline(base, false, 0.5, 0.26, 1.0)), EXT);
    const [x0, yb, W, H] = fitUV(geo);
    const tex = haloTex((g) => {
      const X = (x) => ((x - x0) / W) * 512, Y = (y) => (1 - (y - yb) / H) * 512;
      const band = (k, lw) => {
        g.lineWidth = lw; g.beginPath();
        left.forEach((p, i) => { const q = [X(p.x * k), Y(y0 + (p.y - y0) * (0.5 + 0.5 * k))]; i ? g.lineTo(...q) : g.moveTo(...q); });
        [...left].reverse().forEach((p) => g.lineTo(X(-p.x * k), Y(y0 + (p.y - y0) * (0.5 + 0.5 * k))));
        g.stroke();
      };
      band(0.97, 6); band(0.84, 3);
      for (let i = 1; i < left.length - 1; i++) { const p = left[i]; for (const sx of [1, -1]) { g.beginPath(); g.arc(X(sx * p.x * 0.905), Y(y0 + (p.y - y0) * 0.9525), 3.5, 0, PI * 2); g.fill(); } }
      // tia sáng toả từ đầu
      const hy = 4.4;
      g.globalAlpha = 0.4; g.lineWidth = 1.5;
      for (let i = 0; i < 110; i++) { const a = (i / 110) * PI * 2; g.beginPath(); g.moveTo(X(cos(a) * 1.05), Y(hy + sin(a) * 1.05)); g.lineTo(X(cos(a) * 4.5), Y(hy + sin(a) * 4.5)); g.stroke(); }
      g.globalAlpha = 1;
      // mây cuộn hai bên thân
      g.lineWidth = 3;
      for (let i = 0; i < 7; i++) {
        const t = 0.06 + i * 0.085, p = left[Math.round(t * (left.length - 1))];
        for (const sx of [1, -1]) {
          const cx = X(sx * p.x * 0.72), cy = Y(y0 + (p.y - y0) * 0.92);
          g.beginPath(); for (let k = 0; k < 34; k++) { const a = k * 0.33, rr = 1.5 + k * 0.42; g.lineTo(cx + sx * cos(a) * rr, cy + sin(a) * rr); } g.stroke();
          g.beginPath(); g.moveTo(cx + sx * 15, cy); g.quadraticCurveTo(cx + sx * 26, cy - 16, cx + sx * 40, cy - 6); g.stroke();
        }
      }
    });
    return { geo, tex };
  });
}
// vầng quang lá bồ đề theo tượng Tam Chúc: nền lá nhọn, viền rộng chạm dây lá, tâm trơn sau thân
function bodhiAura() {
  return cached('bodhi', () => {
    const y0 = 0.55, y1 = 7.0, N = 72, right = [];
    for (let i = 0; i <= N; i++) {
      const s = i / N, hw = 2.25 * pow(sin(PI * pow(s, 0.68)), 0.72) * (1 - 0.1 * s) + 0.0;
      right.push(new THREE.Vector2(hw + 0.28 * (1 - s) * (1 - s), y0 + (y1 - y0) * s));
    }
    const base = [...right, ...right.slice(0, -1).reverse().map((p) => new THREE.Vector2(-p.x, p.y))];
    const geo = new THREE.ExtrudeGeometry(new THREE.Shape(flameOutline(base, false, 0.34, 0.12, 0.8)), EXT);
    const [x0, yb, W, H] = fitUV(geo);
    const tex = haloTex((g) => {
      const X = (x) => ((x - x0) / W) * 512, Y = (y) => (1 - (y - yb) / H) * 512;
      const path = (k) => { g.beginPath(); right.forEach((p, i) => { const q = [X(p.x * k), Y(y0 + (p.y - y0) * (0.08 + 0.92 * k))]; i ? g.lineTo(...q) : g.moveTo(...q); }); [...right].reverse().forEach((p) => g.lineTo(X(-p.x * k), Y(y0 + (p.y - y0) * (0.08 + 0.92 * k)))); };
      g.lineWidth = 5; path(0.965); g.stroke(); g.lineWidth = 3; path(0.66); g.stroke();
      // dây lá cuốn dày trong vành
      g.lineWidth = 2.2;
      for (let i = 2; i < right.length - 1; i += 1) {
        const p = right[i], k = 0.82, ky = y0 + (p.y - y0) * (0.08 + 0.92 * k);
        for (const sx of [1, -1]) {
          const cx = X(sx * p.x * k), cy = Y(ky);
          g.beginPath(); for (let t = 0; t < 26; t++) { const a = t * 0.42 + i, rr = 1 + t * 0.62; g.lineTo(cx + cos(a) * rr * sx, cy + sin(a) * rr); } g.stroke();
          g.beginPath(); g.moveTo(cx - sx * 18, cy + 10); g.quadraticCurveTo(cx - sx * 4, cy - 16, cx + sx * 16, cy - 8); g.stroke();
        }
      }
      // tia mảnh toả trong lòng, vòng tròn sau đầu
      const hy = 4.45; g.globalAlpha = 0.5; g.lineWidth = 1.4;
      for (let i = 0; i < 96; i++) { const a = (i / 96) * PI * 2; g.beginPath(); g.moveTo(X(cos(a) * 0.98), Y(hy + sin(a) * 0.98)); g.lineTo(X(cos(a) * 1.4), Y(hy + sin(a) * 1.4)); g.stroke(); }
      g.globalAlpha = 1; g.lineWidth = 4; g.beginPath(); g.arc(X(0), Y(hy), (0.96 / W) * 512, 0, PI * 2); g.stroke();
    });
    return { geo, tex };
  });
}
// vòm nhọn (khung lửa kanok) kiểu Khmer
function khmerArch() {
  return cached('arch', () => {
    const y0 = 1.3, y1 = 6.75, N = 60, outer = [];
    for (let i = 0; i <= N; i++) {
      const s = i / N, u = max(0, (s - 0.32) / 0.68);
      const hw = 2.2 * (s < 0.32 ? 1 : (1 - u) * (1 + 0.95 * u - 0.1 * u * u));
      outer.push(new THREE.Vector2(-hw, y0 + (y1 - y0) * s));
    }
    const base = [...outer, ...outer.slice(0, -1).reverse().map((p) => new THREE.Vector2(-p.x, p.y))];
    const fl = flameOutline(base, false, 0.56, 0.4, 0.9);
    const sh = new THREE.Shape(fl);
    const inner = outer.map((p) => new THREE.Vector2(p.x * 0.86, y0 + 0.3 + (p.y - y0) * 0.86));
    sh.holes.push(new THREE.Path([...inner, ...inner.slice(0, -1).reverse().map((p) => new THREE.Vector2(-p.x, p.y))]));
    const geo = new THREE.ExtrudeGeometry(sh, { ...EXT, depth: 0.1, bevelThickness: 0.03, bevelSize: 0.03 });
    const [x0, yb, W, H] = fitUV(geo);
    const tex = haloTex((g) => {
      const X = (x) => ((x - x0) / W) * 512, Y = (y) => (1 - (y - yb) / H) * 512;
      for (let i = 1; i < outer.length - 1; i++) { const p = outer[i]; for (const sx of [1, -1]) { g.beginPath(); g.arc(X(sx * p.x * 0.93), Y(y0 + (p.y - y0) * 0.95), 3.5, 0, PI * 2); g.fill(); } }
      g.lineWidth = 3; g.beginPath();
      outer.forEach((p, i) => { const q = [X(p.x * 0.975), Y(y0 + (p.y - y0) * 0.985)]; i ? g.lineTo(...q) : g.moveTo(...q); });
      [...outer].reverse().forEach((p) => g.lineTo(X(-p.x * 0.975), Y(y0 + (p.y - y0) * 0.985)));
      g.stroke();
    });
    return { geo, tex };
  });
}
function haloMesh(geo, tex, mats, glow = 0.35) {
  const m = mats.halo.clone();
  m.bumpMap = tex; m.bumpScale = 2.5; m.emissiveMap = tex; m.emissiveIntensity = glow; m.map = tex.color;
  const me = new THREE.Mesh(geo, m);
  me.onBeforeRender = envHook(m);
  me.castShadow = false; me.receiveShadow = true;
  return me;
}

/* =====================================================================
   Ốc tóc (InstancedMesh)
   ===================================================================== */
function curlGeo() {
  return cached('curl', () => {
    const R0 = 0.0305, H0 = 0.027, A = 8, rings = [[0.56, 0.84], [1, 0.26]];
    const pos = [0, H0, 0], nor = [0, 1, 0], uv = [0.5, 0], idx = [];
    rings.forEach(([r, h], j) => {
      for (let i = 0; i < A; i++) {
        const a = (i / A) * 2 * PI;
        pos.push(cos(a) * r * R0, h * H0, sin(a) * r * R0);
        const ny = j ? 0.42 : 0.82, nh = sqrt(1 - ny * ny);
        nor.push(cos(a) * nh, ny, sin(a) * nh);
        uv.push(i / A, j ? 0.98 : 0.55);
      }
    });
    for (let i = 0; i < A; i++) {
      const a = 1 + i, b = 1 + (i + 1) % A, c = 1 + A + i, d = 1 + A + (i + 1) % A;
      idx.push(0, b, a, a, b, d, a, d, c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
  });
}
// ốc xoắn vẽ bằng bản đồ nổi (toạ độ uv của lathe: u quanh trục, v từ đỉnh ra mép) để khỏi tốn tam giác
function curlBump() {
  return cached('curlbump', () => {
    const SZ = 128, c = document.createElement('canvas'); c.width = c.height = SZ;
    const g = c.getContext('2d'), im = g.createImageData(SZ, SZ);
    for (let j = 0; j < SZ; j++) for (let i = 0; i < SZ; i++) {
      const u = i / SZ, v = j / SZ, w = 0.5 + 0.5 * cos(2 * PI * (u + v * 2.0));
      const q = Math.round(255 * pow(w, 0.7)), k = (i + j * SZ) * 4;
      im.data[k] = im.data[k + 1] = im.data[k + 2] = q; im.data[k + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 2;
    return t;
  });
}
// xếp ốc tóc thành hàng đều quanh đầu: một hàng bám chân tóc, rồi các vòng từ đỉnh xuống
function curlTransforms(hf, P, spacing) {
  const c0 = [0, 0.16, -0.035], out = [], S = P.scale || 1;
  const raw = (x, y, z) => hf(x * S, y * S, z * S) / S;
  const surf = (dx, dy, dz) => {
    let a = 1.0, b = 0.03;
    for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (raw(c0[0] + dx * m, c0[1] + dy * m, c0[2] + dz * m) > 0) a = m; else b = m; }
    return [c0[0] + dx * a, c0[1] + dy * a, c0[2] + dz * a];
  };
  const dir = (th, ph) => [sin(th) * cos(ph), sin(ph), cos(th) * cos(ph)];
  const cells = new Map(), lim2 = (spacing * 0.8) ** 2;
  const key = (a, b, c) => `${a},${b},${c}`;
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const tryAdd = (q) => {
    const cx = Math.floor(q[0] / spacing), cy = Math.floor(q[1] / spacing), cz = Math.floor(q[2] / spacing);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
      const l = cells.get(key(cx + a, cy + b, cz + c));
      if (l) for (const r of l) { const dx = r[0] - q[0], dy = r[1] - q[1], dz = r[2] - q[2]; if (dx * dx + dy * dy + dz * dz < lim2) return false; }
    }
    const k = key(cx, cy, cz); if (!cells.has(k)) cells.set(k, []); cells.get(k).push(q);
    const e = 0.004, gx = raw(q[0] + e, q[1], q[2]) - raw(q[0] - e, q[1], q[2]), gy = raw(q[0], q[1] + e, q[2]) - raw(q[0], q[1] - e, q[2]), gz = raw(q[0], q[1], q[2] + e) - raw(q[0], q[1], q[2] - e), l = Math.hypot(gx, gy, gz) || 1;
    out.push([q[0] * S, q[1] * S, q[2] * S, gx / l, gy / l, gz / l, rnd() * PI * 2]);
    return true;
  };
  // hàng chân tóc: theo đúng đường chân tóc phía trước
  const NH = 420;
  let lastQ = null;
  for (let i = 0; i < NH; i++) {
    const th = -PI + (i / NH) * 2 * PI;
    let lo = -0.9, hi = 1.5;
    for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2, q = surf(...dir(th, m)); if (hairMask(q[0], q[1], q[2], P)) hi = m; else lo = m; }
    const q = surf(...dir(th, hi + 0.012));
    if (!hairMask(q[0], q[1], q[2], P)) continue;
    if (!lastQ || Math.hypot(q[0] - lastQ[0], q[1] - lastQ[1], q[2] - lastQ[2]) > spacing * 0.92) { if (tryAdd(q)) lastQ = q; }
  }
  // các vòng từ đỉnh xuống, bước đo theo cung thật trên mặt
  let ph = PI / 2 - 0.001, row = 0, prev = surf(...dir(0, ph));
  while (ph > -1.1) {
    const n = max(1, Math.round((() => { let L = 0, q0 = surf(...dir(0, ph)), q = q0; for (let i = 1; i <= 36; i++) { const r = surf(...dir((i / 36) * 2 * PI, ph)); L += Math.hypot(r[0] - q[0], r[1] - q[1], r[2] - q[2]); q = r; } return L; })() / spacing));
    for (let i = 0; i < n; i++) {
      const th = ((i + (row % 2 ? 0.5 : 0)) / n) * 2 * PI + 0.13 * row;
      const q = surf(...dir(th, ph));
      if (hairMask(q[0], q[1], q[2], P)) tryAdd(q);
    }
    let L = 0;
    while (L < spacing * 0.87 && ph > -1.1) { ph -= 0.004; const r = surf(...dir(0, ph)); L += Math.hypot(r[0] - prev[0], r[1] - prev[1], r[2] - prev[2]); prev = r; }
    row++;
  }
  // lấp khe còn trống giữa hàng chân tóc và các vòng
  for (let j = 0; j < 90; j++) for (let i = 0; i < 180; i++) {
    const q = surf(...dir(((i + (j % 2) * 0.5) / 180) * 2 * PI, -0.9 + (j / 90) * 1.6));
    if (hairMask(q[0], q[1], q[2], P) && q[1] < hairline(q[0], q[2], P) + 0.11) tryAdd(q);
  }
  return out;
}

/* =====================================================================
   Lắp ráp
   ===================================================================== */
const KIND = {
  shakya: { seated: { robe: 'both', mudra: 'abhaya' }, head: { ush: 'round' }, throne: 'maha' },
  amida: { seated: { robe: 'both', mudra: 'dhyana' }, head: { ush: 'round' }, throne: 'maha' },
  khmer: { seated: { robe: 'right-bare', mudra: 'earth', foot: true, slender: true, sash: true }, head: { ush: 'cone', slender: true }, throne: 'khmer', top: 3.98, height: 7.2, topY: 6.1 },
  quanam_seat: { seated: { robe: 'both', mudra: 'dhyana' }, head: { fem: true, crown: 'lotus' }, throne: 'maha', top: 3.82, hy: 2.72 },
  bachua: { seated: { robe: 'both', mudra: 'dhyana' }, head: { fem: true, crown: 'fan', scale: 1.14 }, throne: 'plinth', top: 3.68, hy: 2.72, noAura: true, red: true },
  dilac: { seated: { robe: 'belly', mudra: 'knee' }, head: { bald: true, smile: true, scale: 1.26 }, throne: 'plinth', top: 3.36, hy: 2.62, noAura: true },
};
// bước lưới: mặt thật mịn, phần còn lại của đầu vừa, vùng tóc (bị ốc che) thô để dành tam giác
const FACE_H = 0.0095, HEAD_H = 0.021, SKULL_H = 0.042;

// Hàm dáng tượng (nhẹ), còn lưới dựng từ các hàm này tính rất nặng nên tách riêng
function figureShape(kind) {
  if (kind === 'quanam') {
    const HP = { fem: true, crown: 'lotus', scale: QHEAD_S }, S = makeStanding();
    return { HP, hf: makeHead(HP), sf: S.body, S };
  }
  if (kind === 'nietban') {
    const HP = { ush: 'round', scale: 1.28 }, S = makeReclining();
    return { HP, hf: makeHead(HP), sf: S.body, S };
  }
  const K = KIND[kind], HP = { ...K.head, scale: K.head.scale || HEAD_S };
  return { HP, hf: makeHead(HP), S: makeSeated(K.seated) };
}
// đặt đầu trong toạ độ thân
const headPos = (kind) => (kind === 'quanam' ? [QHY, QHZ] : kind === 'nietban' ? [0, 0] : [KIND[kind].hy || HY, HZ]);
function computeFigure(kind, { hf, S, HP }) {
  const k = HP.scale, [oy, oz] = headPos(kind), all = (x, y, z) => min(S.body(x, y, z), S.ext(x, y, z));
  const H = (x, y, z) => hf(x, y - oy, z - oz);
  const A2 = kind === 'nietban' ? H : (x, y, z) => min(H(x, y, z), S.body(x, y, z));
  const allH = kind === 'nietban' ? all : (x, y, z) => min(all(x, y, z), H(x, y, z));
  const b0 = [-(HP.crown === 'fan' ? 0.95 : 0.54) * k, oy - 0.84 * k, -0.62 * k], b1 = [(HP.crown === 'fan' ? 0.95 : 0.54) * k, oy + (HP.crown === 'fan' ? 1.42 : HP.crown ? 0.92 : 0.72) * k, 0.56 * k];
  const inHair = (x, y, z, m) => { const lx = x / k, ly = (y - oy) / k, lz = (z - oz) / k; return ly > hairline(lx, lz, HP) + m && !(abs(lx) > 0.3 && ly < 0.17 && lz > -0.2); };
  const isFace = (x, y, z, m) => { const lz = (z - oz) / k, ly = (y - oy) / k; return lz > 0.06 - m && ly > -0.46 + m && ly < 0.26 + m && abs(x / k) < 0.36 - m; };
  const hasCurl = !!HP.ush, AO = [0.008, 0.025, 0.06];
  const parts = [
    polygonize(H, b0, b1, FACE_H * (HP.crown ? 1.1 : 1), AO, A2, { keep: (x, y, z) => isFace(x, y, z, 0) && !(hasCurl && inHair(x, y, z, 0.028)), nE: 0.7 }),
    polygonize(H, b0, b1, HEAD_H, AO, A2, { keep: (x, y, z) => !isFace(x, y, z, -0.04) && !(hasCurl && inHair(x, y, z, 0.05)), nE: 0.5 }),
  ];
  if (hasCurl) parts.push(polygonize(H, b0, b1, SKULL_H, [0.02, 0.05], A2, { keep: (x, y, z) => inHair(x, y, z, 0.01), nE: 0.5 }));
  const out = { head: mergeGeometries(parts), curls: hasCurl ? Float32Array.from(curlTransforms(hf, HP, 0.0475).flat()) : new Float32Array(0) };
  if (kind === 'quanam') {
    out.body = polygonize(S.body, [-1.42, -0.02, -0.72], [1.42, 4.92, 1.0], 0.034, [0.04, 0.12, 0.3], allH, { nE: 1 });
    out.ext = polygonize(S.ext, [-0.95, -0.02, -0.1], [0.75, 4.75, 1.05], 0.0155, [0.01, 0.03, 0.08], all);
  } else if (kind === 'nietban') {
    out.body = polygonize(S.body, [-3.4, -0.04, -0.82], [3.25, 1.75, 0.92], 0.031, [0.04, 0.12, 0.3], all, { nE: 1 });
    out.ext = polygonize(S.ext, [0.15, 0.6, 0.2], [1.2, 1.4, 0.95], 0.0135, [0.01, 0.03, 0.08], all);
  } else {
    out.body = polygonize(S.body, [-1.62, -0.04, -0.72], [1.62, 2.3, 1.22], 0.029, [0.03, 0.09, 0.22], allH, { nE: 1 });
    out.ext = polygonize(S.ext, [-1.5, 0.0, 0.0], [1.3, 2.1, 1.3], 0.0155, [0.01, 0.03, 0.08], all);
  }
  return out;
}
const BAKED = new Map();
export function figureGeos(kind) {
  return cached('fig:' + kind, () => { const shape = figureShape(kind); return { ...(BAKED.get(kind) || computeFigure(kind, shape)), HP: shape.HP, hf: shape.hf, sf: shape.sf }; });
}
/* Lưới tượng tính sẵn (tools/bake-statues.cjs): điện thoại khỏi mất vài giây tính SDF. Đổi dáng tượng thì chạy lại công cụ và tăng BAKE_V.
   Tệp: 'NPF2', rồi 3 phần head/body/ext, mỗi phần [số đỉnh, số chỉ số (Uint32), khung (6 Float32), vị trí Int16×3, pháp tuyến Int16×3, AO Uint8, căn lề 4 byte, hiệu chỉ số Int32], cuối cùng [số Float32 của ốc tóc (Uint32), các Float32: x y z nx ny nz góc]. */
const BAKE_V = 4, BAKE_MAGIC = 0x3246504e;
export const BAKED_KINDS = ['shakya', 'amida', 'khmer', 'quanam', 'quanam_seat', 'bachua', 'dilac', 'nietban'];
export function encodeFigure(fig) {
  const parts = [new Uint32Array([BAKE_MAGIC])];
  for (const name of ['head', 'body', 'ext']) {
    const g = fig[name], P = g.attributes.position.array, N = g.attributes.normal.array, A = g.attributes.ao.array, I = g.index.array;
    const bb = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    for (let i = 0; i < P.length; i++) { const c = i % 3; if (P[i] < bb[c]) bb[c] = P[i]; if (P[i] > bb[c + 3]) bb[c + 3] = P[i]; }
    const qp = new Int16Array(P.length), qn = new Int16Array(N.length), qa = new Uint8Array((A.length + 3) & ~3), di = new Int32Array(I.length);
    for (let i = 0; i < P.length; i++) { const c = i % 3; qp[i] = Math.round(((P[i] - bb[c]) / (bb[c + 3] - bb[c] || 1)) * 65535) - 32768; }
    for (let i = 0; i < N.length; i++) qn[i] = Math.round(N[i] * 32767);
    for (let i = 0; i < A.length; i++) qa[i] = Math.round(clamp(A[i], 0, 1) * 255);
    for (let i = 0, last = 0; i < I.length; i++) { di[i] = I[i] - last; last = I[i]; }
    parts.push(new Uint32Array([P.length / 3, I.length]), new Float32Array(bb), qp, qn, qa, di);
  }
  const curls = fig.curls || new Float32Array(0);
  parts.push(new Uint32Array([curls.length]), curls);
  return parts;
}
function decodeFigure(buf) {
  const head = new Uint32Array(buf, 0, 1);
  if (head[0] !== BAKE_MAGIC) throw new Error('sai định dạng');
  let at = 4;
  const part = () => {
    const [nv, ni] = new Uint32Array(buf, at, 2); at += 8;
    const bb = new Float32Array(buf, at, 6); at += 24;
    const qp = new Int16Array(buf, at, nv * 3); at += nv * 6;
    const qn = new Int16Array(buf, at, nv * 3); at += nv * 6;
    const qa = new Uint8Array(buf, at, nv); at += (nv + 3) & ~3;
    const di = new Int32Array(buf, at, ni); at += ni * 4;
    const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), A = new Float32Array(nv), I = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    for (let i = 0; i < P.length; i++) { const c = i % 3; P[i] = bb[c] + ((qp[i] + 32768) / 65535) * (bb[c + 3] - bb[c]); N[i] = qn[i] / 32767; }
    for (let i = 0; i < nv; i++) A[i] = qa[i] / 255;
    for (let i = 0, last = 0; i < ni; i++) { last += di[i]; I[i] = last; }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(P, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    g.setAttribute('ao', new THREE.BufferAttribute(A, 1));
    g.setIndex(new THREE.BufferAttribute(I, 1));
    return g;
  };
  const fig = { head: part(), body: part(), ext: part() };
  const nc = new Uint32Array(buf, at, 1)[0]; at += 4;
  fig.curls = new Float32Array(buf.slice(at, at + nc * 4)); at += nc * 4;
  if (at !== buf.byteLength) throw new Error('sai độ dài');
  return fig;
}
const baking = new Map();
// Tải lưới tính sẵn. Lỗi mạng hay tệp hỏng cũng không sao: buildStatue tự tính như cũ.
export function preloadFigures(kinds) {
  return Promise.resolve();
}
function addMesh(g, geo, mat, cast = true) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast; m.receiveShadow = true;
  m.onBeforeRender = envHook(mat);
  g.add(m);
  return m;
}
// tìm mặt trước theo trục z (bisection) — dùng đặt bạch hào, chuỗi hạt
function surfaceZ(f, x, y, z0 = 1, z1 = -0.2) {
  let a = z0, b = z1;
  for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (f(x, y, m) > 0) a = m; else b = m; }
  return a;
}
const M4 = new THREE.Matrix4(), QT = new THREE.Quaternion(), V3 = new THREE.Vector3(), ONE = new THREE.Vector3(1, 1, 1);

// Tổng cao tượng Quan Âm: thấp để đứng trong chánh điện vẫn thấy trọn đầu từ camera người chơi
const QA_H = 3.8;
// chất da riêng: đồng đen có mặt, tay ánh đồng đỏ như tượng Tây Bổ Đà
const skinOf = (p) => (p.skin ? { ...p, base: p.skin, hi: '#c89268', low: '#3a2214' } : p);
function makeSkin(mats) {
  if (!mats.p.skin) return mats.body;
  const m = mats.body.clone(); m.clearcoat = 0.6; m.roughness = 0.34; return m;
}
function faceMat(mats, fig, kind, oy, oz, matName) {
  if (matName !== 'white') return null;
  faceUV(fig.head, oy, oz, fig.HP.scale);
  const m = mats.body.clone(); m.map = faceCanvas(fig.HP); return m;
}
function buildQuanAm(g, fig, mats, matName, halo = true) {
  const p = mats.p;
  const T = throneGeos('stand');
  for (const part of T.parts) addMesh(g, colorize(part, p), mats.body);
  const FS = (QA_H - 0.08 - T.seat) / QTOP;
  const f = new THREE.Group();
  f.scale.setScalar(FS); f.position.y = T.seat - 0.02;
  g.add(f);
  const skin = makeSkin(mats), ps = skinOf(p);
  addMesh(f, colorize(fig.body, p), mats.body);
  const veil = p.skin ? cached('veilpaint', () => { const pos = fig.head.attributes.position, o = new Float32Array(pos.count * 3).fill(1); for (let i = 0; i < pos.count; i++) { const lz = (pos.getZ(i) - QHZ) / QHEAD_S, ly = (pos.getY(i) - QHY) / QHEAD_S, lx = abs(pos.getX(i) / QHEAD_S); if (ly < 0.26 && (lz < -0.05 || lx > 0.4 || ly < -0.52)) { o[i * 3] = 0.27; o[i * 3 + 1] = 0.3; o[i * 3 + 2] = 0.42; } } return o; }) : null;
  addMesh(f, colorize(fig.head, ps, 0, veil), faceMat(mats, fig, 'quanam', QHY, QHZ, matName) || skin);
  addMesh(f, colorize(fig.ext, ps), skin);
  const white = matName === 'white', bright = white || matName === 'bronze_dark';
  const accent = bright ? new THREE.MeshPhysicalMaterial({ color: white ? '#d8b06a' : '#b8784a', metalness: 0.9, roughness: 0.32, clearcoat: 0.4 }) : mats.hair;
  // bình cam lồ trên lòng bàn tay trái + cành dương liễu
  const vase = cached('vase', () => latheAO([[0, 0], [0.05, 0.0], [0.058, 0.012], [0.05, 0.03], [0.078, 0.07], [0.096, 0.13], [0.086, 0.2], [0.05, 0.26], [0.027, 0.32], [0.027, 0.37], [0.042, 0.41], [0.046, 0.425], [0.02, 0.43]], 24, (y) => mix(0.6, 1, sstep(0, 0.12, y))));
  const vx = 0.14, vy = 3.3, vz = 0.74, VS = 1.25;
  const vm = addMesh(f, colorize(vase, ps), skin); vm.position.set(vx, vy, vz); vm.scale.setScalar(VS);
  const willowMat = white ? new THREE.MeshStandardMaterial({ color: '#6f9a5c', roughness: 0.6 }) : mats.hair;
  const stem = new THREE.CatmullRomCurve3([[0, 0, 0], [0.004, 0.13, 0.0], [0.03, 0.27, 0.012], [0.095, 0.37, 0.03], [0.17, 0.37, 0.05], [0.23, 0.28, 0.062], [0.262, 0.15, 0.07]].map(([a, b, c]) => new THREE.Vector3(a, b, c)));
  const st = addMesh(f, new THREE.TubeGeometry(stem, 24, 0.006, 5), willowMat, false); st.position.set(vx, vy + 0.415 * VS, vz); st.scale.setScalar(VS);
  const leaf = cached('willowleaf', () => { const l = new THREE.SphereGeometry(0.02, 6, 3); l.scale(0.3, 2.1, 0.1); l.translate(0, -0.038, 0); return l; });
  const NL = 26, leaves = new THREE.InstancedMesh(leaf, willowMat, NL);
  for (let i = 0; i < NL; i++) {
    const pt = stem.getPoint(0.34 + (i / (NL - 1)) * 0.66);
    QT.setFromEuler(new THREE.Euler(0.22 * sin(i * 2.1), i * 1.3, (i % 2 ? 0.34 : -0.34) * (1 - (0.5 * i) / NL)));
    M4.compose(V3.set(pt.x * VS + vx, pt.y * VS + vy + 0.415 * VS, pt.z * VS + vz), QT, ONE.clone().multiplyScalar(VS));
    leaves.setMatrixAt(i, M4);
  }
  f.add(leaves);
  // chuỗi anh lạc trên ngực áo trong
  const NB = 41, beads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.024, 10, 7), accent, NB);
  for (let i = 0; i < NB; i++) {
    const t = (i / (NB - 1)) * 2 - 1, x = t * 0.26, y = 4.28 - 0.3 * (1 - t * t);
    const z = surfaceZ(fig.sf, x, y, 0.8, -0.1) + 0.004;
    M4.compose(V3.set(x, y, z), QT.identity(), ONE.clone().multiplyScalar(i === (NB - 1) / 2 ? 2.2 : 1));
    beads.setMatrixAt(i, M4);
  }
  beads.castShadow = true;
  f.add(beads);
  // hào quang tròn
  if (halo) {
    const hh = headHalo(0.95);
    const hm = haloMesh(hh.geo, hh.tex, mats, 0.4);
    hm.position.set(0, QHY + 0.2, -0.72);
    hm.scale.setScalar(1.05);
    f.add(hm);
  }
  g.userData.height = QA_H;
  return g;
}
function addCurls(f, fig, mats, oy, oz) {
  const tr = fig.curls, nCurl = tr.length / 7;
  if (!nCurl) return;
  mats.hair.bumpMap = curlBump(); mats.hair.bumpScale = 1.3;
  const curls = new THREE.InstancedMesh(curlGeo(), mats.hair, nCurl);
  const up = new THREE.Vector3(0, 1, 0), q2 = new THREE.Quaternion(), n = new THREE.Vector3();
  for (let i = 0; i < nCurl; i++) {
    const c = i * 7, nx = tr[c + 3], ny = tr[c + 4], nz = tr[c + 5];
    n.set(nx, ny, nz);
    QT.setFromUnitVectors(up, n); q2.setFromAxisAngle(up, tr[c + 6]); QT.multiply(q2);
    M4.compose(V3.set(tr[c] - nx * 0.004, tr[c + 1] + oy - ny * 0.004, tr[c + 2] + oz - nz * 0.004), QT, ONE);
    curls.setMatrixAt(i, M4);
  }
  curls.castShadow = true; curls.onBeforeRender = envHook(mats.hair);
  f.add(curls);
}
function addUrna(f, fig, p, oy, oz) {
  const ub = 0.082 * fig.HP.scale, uz = surfaceZ(fig.hf, 0, ub, 0.7, 0.2);
  const urna = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 9), new THREE.MeshPhysicalMaterial({ color: p.hi, metalness: p.metal * 0.6, roughness: 0.2, clearcoat: 1, emissive: p.glow, emissiveIntensity: 0.12 }));
  urna.position.set(0, oy + ub, oz + uz - 0.005);
  f.add(urna);
}
// Phật nằm: bệ dài, thân lưới, đầu xoay 90°
function buildReclining(g, fig, mats, matName) {
  const p = mats.p, H0 = 0.62, SC = 0.92;
  const plat = cached('nbplat', () => {
    const box = (w, h, d, y) => { const b = new THREE.BoxGeometry(w, h, d, 1, 1, 1); b.deleteAttribute('uv'); const g2 = b.toNonIndexed(); g2.translate(0, y, 0); const n = g2.attributes.position.count; g2.setAttribute('ao', new THREE.BufferAttribute(new Float32Array(n).fill(0.9), 1)); return g2; };
    return mergeGeometries([box(6.5, 0.14, 2.3, 0.07), box(6.25, 0.34, 2.05, 0.31), box(6.5, 0.14, 2.3, 0.55)]);
  });
  addMesh(g, colorize(plat, p), mats.body);
  const f = new THREE.Group(); f.scale.setScalar(SC); f.position.y = H0; g.add(f);
  addMesh(f, colorize(fig.body, p), mats.body);
  addMesh(f, colorize(fig.ext, p), mats.body);
  const hg = new THREE.Group(); hg.position.set(NB_HEAD[0], NB_HEAD[1], NB_HEAD[2]); hg.rotation.z = PI / 2; f.add(hg);
  addMesh(hg, colorize(fig.head, p, 0, cached('hairpaint:nietban:' + matName, () => hairPaint(fig.head, 0, 0, fig.HP.scale, fig.HP, p))), mats.body);
  addCurls(hg, fig, mats, 0, 0);
  addUrna(hg, fig, p, 0, 0);
  g.userData.height = 2.5;
  return g;
}

// tô đỏ áo, vàng viền, da sáng cho tượng Bà
function baPaint(geo) {
  const pos = geo.attributes.position, n = pos.count, out = new Float32Array(n * 3).fill(1);
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), ax = abs(x), gold = sstep(0.09, 0.03, abs(0.05 + (y - 1.34) * 0.44 - ax)) + sstep(0.14, 0.06, abs(y - 0.05));
    const w = clamp(gold, 0, 1);
    out[i * 3] = mix(1.0, 1, w); out[i * 3 + 1] = mix(0.2, 1, w); out[i * 3 + 2] = mix(0.16, 1, w);
  }
  return out;
}
const AURA_DEFAULT = { bronze_dark: 'bodhi', wood_gold: 'bodhi' };
const SEAT_DEF = { top: 3.5 };
export function buildStatue(kind = 'shakya', matName = 'gold', { halo = true, aura } = {}) {
  if (!KIND[kind] && kind !== 'quanam' && kind !== 'nietban') kind = 'shakya';
  const mats = makeMats(matName);
  const p = mats.p;
  const g = new THREE.Group();
  const fig = figureGeos(kind);
  if (kind === 'quanam') return buildQuanAm(g, fig, mats, matName, halo);
  if (kind === 'nietban') return buildReclining(g, fig, mats, matName);

  const K = KIND[kind], khmer = kind === 'khmer', oy = K.hy || HY;
  const T = throneGeos(K.throne);
  for (const part of T.parts) addMesh(g, colorize(part, p), mats.body);
  const topY = K.topY || 5.3;
  const FS = (topY - T.seat) / (K.top || SEAT_DEF.top);
  const f = new THREE.Group();
  f.scale.setScalar(FS); f.position.y = T.seat - 0.01;
  g.add(f);
  addMesh(f, colorize(fig.body, p, 0, K.red ? cached('bapaint', () => baPaint(fig.body)) : null), mats.body);
  const fm = faceMat(mats, fig, kind, oy, HZ, matName);
  const headPaint = fig.HP.ush ? cached('hairpaint:' + kind + ':' + matName, () => hairPaint(fig.head, oy, HZ, fig.HP.scale, fig.HP, p)) : null;
  addMesh(f, colorize(fig.head, p, 0, headPaint), fm || mats.body);
  addMesh(f, colorize(fig.ext, p), mats.body);
  addCurls(f, fig, mats, oy, HZ);
  if (!fig.HP.bald) addUrna(f, fig, p, oy, HZ);
  g.userData.height = K.height || 5.3;
  if (khmer) {
    // ngọn lửa rasmi trên nhục kế
    const rasmi = cached('rasmi', () => {
      const pts = [];
      for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push(new THREE.Vector2(0.075 * pow(1 - t, 0.9) * (1 + 0.35 * sin(t * PI * 3) * (1 - t)) + 0.002, t * 0.5)); }
      const g2 = new THREE.LatheGeometry(pts, 16);
      const pos = g2.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), a0 = atan2(z, x), a = a0 + y * 3.5, r = Math.hypot(x, z) * (1 + 0.25 * cos(3 * a0));
        pos.setXYZ(i, cos(a) * r + 0.04 * sin(y * 7) * y, y, sin(a) * r);
      }
      g2.computeVertexNormals();
      g2.setAttribute('ao', new THREE.BufferAttribute(new Float32Array(pos.count).fill(0.95), 1));
      return g2;
    });
    addMesh(f, colorize(rasmi, p), mats.body).position.set(0, 3.48, HZ - 0.055);
    const A = khmerArch();
    const am = haloMesh(A.geo, A.tex, mats, 0.3);
    am.position.set(0, 0, -1.05);
    g.add(am);
    return g;
  }
  if (!halo || K.noAura) return g;
  const headY = f.position.y + oy * FS;
  const style = aura || AURA_DEFAULT[matName] || 'classic';
  if (style === 'none') return g;
  if (style === 'bodhi') {
    const au = bodhiAura(), goldHalo = { ...mats, halo: new THREE.MeshStandardMaterial({ color: '#d8a544', metalness: 0.75, roughness: 0.38, emissive: '#ffb347', emissiveIntensity: 0, envMapIntensity: 1 }) };
    const am = haloMesh(au.geo, au.tex, goldHalo, 0.28);
    am.position.set(0, 0, -0.92);
    g.add(am);
    return g;
  }
  const hh = headHalo(0.95);
  const hm = haloMesh(hh.geo, hh.tex, mats, 0.45);
  hm.position.set(0, headY + 0.06, -0.66);
  g.add(hm);
  const au = bodyAura();
  const am = haloMesh(au.geo, au.tex, mats, 0.22);
  am.position.set(0, 0, -0.9);
  g.add(am);
  return g;
}

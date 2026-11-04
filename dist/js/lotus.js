// Đài sen cho bồ đoàn: nhiều tầng cánh nhọn, lòng cánh khum, gốc nhạt dần ra đầu cánh đậm.
// Hình dùng chung cho mọi bồ đoàn, chỉ dựng khi có người ngồi đài sen; màu đặt ở vật liệu.
import * as THREE from 'three';

const TIERS = [
  // số cánh, bán kính gốc → đầu cánh, độ cao, nửa bề rộng, lệch góc, độ sáng
  { n: 13, r0: 0.44, r1: 0.82, h: 0.2, w: 0.2, off: 0, shade: 0.82 },
  { n: 11, r0: 0.46, r1: 0.71, h: 0.33, w: 0.2, off: 0.5, shade: 0.92 },
  { n: 9, r0: 0.47, r1: 0.6, h: 0.44, w: 0.19, off: 0, shade: 1 },
];
const SEG_U = 7, SEG_V = 4, THICK = 0.035;

function petalsGeometry() {
  const pos = [], col = [], idx = [];
  const row = SEG_V + 1, grid = (SEG_U + 1) * row;
  for (const T of TIERS) for (let k = 0; k < T.n; k++) {
    const a = ((k + T.off) / T.n) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
    const cx = T.r0 + (T.r1 - T.r0) * 0.8, cy = T.h * 0.12; // điểm kéo đường cong: vươn ra rồi mới cong lên
    const start = pos.length / 3;
    for (const face of [1, -1]) for (let i = 0; i <= SEG_U; i++) {
      const u = i / SEG_U, w = 1 - u;
      // sống cánh là đường cong bậc hai trong mặt phẳng (bán kính, cao)
      const r = w * w * T.r0 + 2 * w * u * cx + u * u * T.r1, y = 2 * w * u * cy + u * u * T.h + 0.012;
      let tr = 2 * w * (cx - T.r0) + 2 * u * (T.r1 - cx), ty = 2 * w * cy + 2 * u * (T.h - cy);
      const len = Math.hypot(tr, ty); tr /= len; ty /= len;
      const nr = -ty, ny = tr; // pháp tuyến hướng vào lòng hoa
      const half = T.w * Math.pow(Math.sin(Math.PI * Math.pow(u * 0.985 + 0.015, 0.68)), 0.72); // bầu ở giữa, thon nhọn ở đầu
      for (let j = 0; j <= SEG_V; j++) {
        const v = (j / SEG_V) * 2 - 1, x = v * half;
        const dish = (v * v - 0.35) * half * 0.42; // hai mép cong vào lòng cánh
        const bulge = face * THICK * Math.sqrt(Math.max(0, 1 - v * v)) * Math.sin(Math.PI * u);
        const rr = r + nr * (dish + bulge), yy = y + ny * (dish + bulge);
        pos.push(ca * rr - sa * x, yy, sa * rr + ca * x);
        // gốc sáng, đầu cánh đậm, gân dọc mờ
        const g = T.shade * (1.65 - 1.0 * Math.pow(u, 1.2)) * (1 - 0.06 * Math.abs(Math.sin(v * 9)));
        col.push(g, g, g);
      }
    }
    for (const [o, flip] of [[0, false], [grid, true]]) for (let i = 0; i < SEG_U; i++) for (let j = 0; j < SEG_V; j++) {
      const p = start + o + i * row + j;
      if (flip) idx.push(p, p + row, p + 1, p + 1, p + row, p + row + 1);
      else idx.push(p, p + 1, p + row, p + 1, p + row + 1, p + row);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Đệm tròn phồng giữa đài, tâm hình đặt giống hộp bồ đoàn thường (cao 0.19, tâm 0.095)
function padGeometry() {
  const h = 0.095, r = 0.53;
  const pts = [[0, -h], [r * 0.9, -h], [r, -h * 0.55], [r * 1.02, 0], [r * 0.98, h * 0.5], [r * 0.86, h * 0.86], [r * 0.6, h * 0.98], [0, h]];
  return new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 28);
}

let petalsGeo, padGeo;
export const lotusPad = () => (padGeo ||= padGeometry());
export function makeLotusPetals(color) {
  petalsGeo ||= petalsGeometry();
  const m = new THREE.Mesh(petalsGeo, new THREE.MeshPhysicalMaterial({ color, vertexColors: true, roughness: 0.5, sheen: 1, sheenRoughness: 0.4, sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.5), clearcoat: 0.35, clearcoatRoughness: 0.35, side: THREE.DoubleSide }));
  m.castShadow = false; m.receiveShadow = false;
  return m;
}
// Đệm màu nhạt hơn cánh, như lòng sen
const _c = new THREE.Color(), CREAM = new THREE.Color('#f7e7bd');
export const lotusPadColor = (look) => _c.set(look.color).lerp(CREAM, look.metal ? 0.15 : 0.55);

// Bồ đoàn may thật: gối tròn căng bông, may xếp ly về nút giữa, viền nẹp quanh hông, đặt trên toạ cụ vuông viền thêu.
// Hình và vải dùng chung cho mọi bồ đoàn; màu riêng đặt ở vật liệu.
import * as THREE from 'three';
import { canvasTex } from './textures.js';

// mặt cắt từ nút giữa ra hông rồi vòng xuống đáy: [bán kính, cao, độ sáng, độ sâu nếp xếp]
const PROFILE = [
  [0, 0.102, 0.62, 0], [0.032, 0.1, 0.62, 0], [0.052, 0.086, 0.42, 0],
  [0.1, 0.092, 0.72, 0.5], [0.2, 0.108, 0.92, 1], [0.33, 0.115, 1, 1], [0.45, 0.104, 1, 0.75], [0.54, 0.07, 0.94, 0.4], [0.586, 0.03, 0.8, 0.12],
  [0.606, 0.016, 1.12, 0], [0.612, 0, 1.15, 0], [0.606, -0.016, 0.92, 0], // nẹp viền
  [0.585, -0.034, 0.6, 0.1], [0.55, -0.068, 0.5, 0.2], [0.47, -0.095, 0.3, 0.2],
];
const SEG = 32, PLEATS = 16;
let geo, fabric, rug;

export function cushionGeo() {
  if (geo) return geo;
  const pos = [], col = [], uv = [], idx = [];
  PROFILE.forEach(([r, y, shade, fold]) => {
    for (let j = 0; j < SEG; j++) {
      const a = (j / SEG) * Math.PI * 2, crease = Math.pow(0.5 + 0.5 * Math.cos(a * PLEATS), 3); // nếp hẹp, giữa hai nếp căng phồng
      const puff = 1 + 0.012 * Math.sin(a * 3 + 1) * (r > 0.1 ? 1 : 0); // may tay, không tròn tuyệt đối
      const rr = r * puff * (1 - 0.018 * crease * fold), x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      const yy = y - 0.016 * crease * fold + 0.003 * Math.sin(a * 2);
      pos.push(x, yy, z);
      const s = shade * (1 - 0.42 * crease * fold);
      col.push(s, s, s);
      uv.push(x * 2.4 + 0.5, (z + yy * 1.2) * 2.4 + 0.5); // chiếu từ trên xuống: vân vải không có đường nối
    }
  });
  for (let i = 0; i < PROFILE.length - 1; i++) for (let j = 0; j < SEG; j++) {
    const a = i * SEG + j, b = (i + 1) * SEG + j, c = (i + 1) * SEG + (j + 1) % SEG, d = i * SEG + (j + 1) % SEG;
    idx.push(a, c, b, a, d, c);
  }
  geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// vải dệt thô: sợi ngang dọc đan nhau, sợi đậm nhạt không đều
export function cushionFabric() {
  return fabric ||= canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, w, h);
    // sợi nhỏ, chênh sáng nhẹ: nhìn gần thấy vải dệt, nhìn xa chỉ còn mặt vải mịn
    for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
      const over = ((x + y) / 2) % 2 === 0, v = (over ? 232 : 208) + Math.random() * 14 - 7 | 0;
      g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, 2, 2);
    }
  }, [1, 1]);
}

// toạ cụ: nền đỏ trầm, viền nâu vàng có hoa văn chữ nhật lặp
export function rugTex() {
  return rug ||= canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#5a1f18'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,190,130'},0.05)`; g.fillRect(Math.random() * w, Math.random() * h, 3, 1); }
    g.strokeStyle = '#a97f3e'; g.lineWidth = 14; g.strokeRect(11, 11, w - 22, h - 22);
    g.strokeStyle = '#3a130e'; g.lineWidth = 2; g.strokeRect(22, 22, w - 44, h - 44);
    g.fillStyle = '#6d4a20'; for (let i = 8; i < w - 8; i += 16) for (const [x, y] of [[i, 9], [i, h - 13], [9, i], [w - 13, i]]) g.fillRect(x, y, 4, 4);
  });
}

// vải bố xám của bồ đoàn mặc định trông như khối bê tông dưới ánh đèn chùa: ngả ấm thành màu vải thô
export const cushionColor = (look) => (!look?.color || look.color === '#3b3a3c' ? '#8f6a3e' : look.color);

// mặt mai rùa: lưới lục giác sẫm trên nền sáng, nhân với màu bồ đoàn
let shell;
export function shellTex() {
  // lưới lặp khít: 3 bán kính ngang đúng một chu kỳ ảnh, hai hàng dọc đúng một chu kỳ ảnh
  return shell ||= canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#6b4714'; g.fillRect(0, 0, w, h);
    const RX = w / 3, RY = h / 3.46, DX = RX * 1.5, DY = h / 2;
    const hex = (x, y, k) => { g.beginPath(); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * RX * k, y + Math.sin(a) * RY * k); } g.closePath(); };
    for (let c = -1; c <= 3; c++) for (let r = -1; r <= 2; r++) {
      const x = c * DX, y = r * DY + (c % 2 ? DY / 2 : 0);
      const fill = g.createRadialGradient(x - RX * 0.2, y - RY * 0.25, 2, x, y, RX);
      fill.addColorStop(0, '#ffffff'); fill.addColorStop(0.65, '#e9e0c8'); fill.addColorStop(1, '#a8926a');
      hex(x, y, 0.93); g.fillStyle = fill; g.fill();
      // vân tuổi đồng tâm của mai rùa thật
      g.strokeStyle = 'rgba(92,60,18,.42)'; g.lineWidth = 2;
      for (const k of [0.74, 0.55, 0.36]) { hex(x, y, k); g.stroke(); }
    }
  }, [1, 1]);
}
export const cushionMap = (look) => (look?.shell ? shellTex() : cushionFabric());

export function cushionMaterial(look) {
  return new THREE.MeshStandardMaterial({ color: cushionColor(look), map: cushionMap(look), vertexColors: true, roughness: look?.metal ? 0.45 : 0.95, metalness: look?.metal || 0 });
}

// đài sen dùng mặt phẳng trơn và không có màu theo đỉnh: chuyển qua lại thì đổi luôn vật liệu
export function setCushionFabric(m, on) {
  if (m.vertexColors === on) return;
  m.vertexColors = on; m.map = on ? cushionFabric() : null; m.needsUpdate = true;
}

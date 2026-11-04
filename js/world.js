// Thế giới 3D: chánh điện, người chơi, người khác, NPC, điều khiển cảm ứng.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GROUND_R, buildGrounds } from './grounds.js';
import { makePet, beastTag } from './pets.js';
import { buildTemple } from './temple.js';
import { makeAvatar, animateAvatar, setSeated, disposeAvatar, setGhost, startFight, HERO_LIST, HERO_MAP, setDancing, setBoxingGloves, triggerUltimate } from './avatar.js';

// Cỡ nhân vật trong chùa: nhỏ lại cho chánh điện đỡ chật khi đông người; tên giữ nguyên cỡ để vẫn dễ đọc
const AV_SCALE = 0.82;
// Vòng hào quang: bậc cao có thêm tia sáng. Mọi nhân vật dùng chung ảnh theo bậc.
const HALO_TEX = {};
function haloTexture(tier) {
  if (HALO_TEX[tier]) return HALO_TEX[tier];
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 18, 64, 64, 62);
  gr.addColorStop(0, 'rgba(255,225,150,.05)'); gr.addColorStop(0.62, 'rgba(255,214,130,.55)'); gr.addColorStop(0.74, 'rgba(255,226,160,.95)'); gr.addColorStop(0.84, 'rgba(255,196,96,.28)'); gr.addColorStop(1, 'rgba(255,180,70,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  if (tier >= 2) {
    g.strokeStyle = 'rgba(255,224,150,.5)'; g.lineWidth = 2;
    const n = tier >= 3 ? 24 : 12;
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, r0 = 50, r1 = i % 2 ? 58 : 63; g.beginPath(); g.moveTo(64 + Math.cos(a) * r0, 64 + Math.sin(a) * r0); g.lineTo(64 + Math.cos(a) * r1, 64 + Math.sin(a) * r1); g.stroke(); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return (HALO_TEX[tier] = t);
}

// Pháp danh ngẫu nhiên cho Phật tử ảo
const PD_A = ['Diệu', 'Minh', 'Tâm', 'Thiện', 'Nhuận', 'Chánh', 'Huệ', 'Thanh', 'Tịnh', 'Phước', 'Đức', 'Nguyên', 'Quảng', 'Từ', 'Hạnh', 'Như', 'Viên', 'An'];
const PD_B = ['An', 'Hạnh', 'Hiền', 'Liên', 'Ngọc', 'Tâm', 'Từ', 'Quang', 'Huệ', 'Nguyên', 'Tuệ', 'Hòa', 'Lạc', 'Thảo', 'Như', 'Nhàn', 'Châu', 'Hương', 'Trí', 'Đạo', 'Bảo', 'Phúc', 'Giác', 'Duyên', 'Thiện', 'Minh'];
function phapDanh(used) {
  for (let k = 0; k < 40; k++) {
    const a = PD_A[Math.floor(Math.random() * PD_A.length)], b = PD_B[Math.floor(Math.random() * PD_B.length)];
    const n = `${a} ${b}`;
    if (a !== b && !used.has(n) && n !== 'Quảng Đức') { used.add(n); return n; }
  }
  return 'Phật tử';
}
import { labelTex, honorLabelTex, rand, canvasTex } from './textures.js';
import { drawIcon, emoteColor, EMOTES } from './icons.js';

let LOC_GEO = null, LOC_MAT = null;
function glowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,230,150,1)'); gr.addColorStop(0.35, 'rgba(255,200,90,0.45)'); gr.addColorStop(1, 'rgba(255,180,60,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const SKINS = ['#f1c7a3', '#e0a67e', '#d98b5f', '#b9734a'];
const lerpAngle = (a, b, t) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;

export { phapDanh };
const playerLabel = (p) => (p.honor ? honorLabelTex(p.name, p.honor, p.level) : labelTex(p.name, `Cấp ${p.level}`));
const fitLabel = (label, p) => { label.scale.set(1.6 / AV_SCALE, (p.honor ? 0.6 : 0.4) / AV_SCALE, 1); label.position.y = p.honor ? 2.45 : 2.35; };

export class World {
  constructor(canvas, joyEl, itemsById) {
    this.canvas = canvas;
    this.joyEl = joyEl;
    this.items = itemsById;
    this.quality = localStorage.getItem('niemphat:quality') || (matchMedia('(pointer: coarse)').matches ? 'low' : 'high');
    this.showNames = true;
    this.showNpc = true;

    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true }));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.applyQuality();

    this.scene = new THREE.Scene();
    this.scene.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.35;
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 900);
    this.cam = { yaw: 0, pitch: 0.2, dist: 5, target: new THREE.Vector3(), lastUser: 0 };

    this.remotes = new Map();
    this.perfLevel = 0; this.perfFrame = 0; this.perfT = 0; this.perfSum = 0; this.perfN = 0; this.perfLow = 0; this.perfGood = 0; this.perfFps = 0;
    this.npcs = [];
    this.input = { x: 0, y: 0 };
    this.keys = {};
    this.clock = new THREE.Clock();
    this.ray = new THREE.Raycaster();
    this.running = false;

    // vòng sáng điểm chạm
    this.ripple = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.45, 40), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0, side: THREE.DoubleSide }));
    this.ripple.rotation.x = -Math.PI / 2;
    this.rippleT = 1;

    this.bindInput();
    addEventListener('resize', () => this.resize());
    this.resize();
  }

  applyQuality() {
    const hq = this.quality === 'high';
    this.renderer.setPixelRatio(hq ? Math.min(devicePixelRatio, 2) : Math.min(devicePixelRatio, 1.25));
    this.renderer.shadowMap.enabled = hq;
  }
  setQuality(q) {
    this.quality = q; localStorage.setItem('niemphat:quality', q);
    this.applyQuality();
    if (this.templeData) this.enterTemple(this.templeData, this.me, true);
  }

  resize() {
    this.renderer.setSize(innerWidth, innerHeight);
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.fov = this.camera.aspect < 0.8 ? 64 : 52;
    this.camera.updateProjectionMatrix();
  }

  /* ---------------- chùa ---------------- */
  enterTemple(temple, me, keepPos = false) {
    const prevPos = keepPos && this.player ? this.player.root.position.clone() : null;
    this.faded?.clear(); this.camOcc = undefined; if (this.ride) { this.ride.cb.cabin.visible = false; this.ride = null; if (this.player) this.player.root.visible = true; }
    if (this.temple) this.temple.dispose();
    this.npcs.forEach(disposeAvatar); this.npcs = []; this.npcNames = new Set();
    if (this.abbot) { disposeAvatar(this.abbot); this.abbot = null; }
    if (this.hermit) { disposeAvatar(this.hermit); this.hermit = null; }
    (this.tellers || []).forEach(disposeAvatar); this.tellers = []; this.tellerJob = null;
    this.remotes.forEach((r) => disposeAvatar(r.av)); this.remotes.clear();
    this.clearLoc();
    this.clearBeasts();
    this.templeData = temple;
    this.templeId = temple.id;
    this.temple = buildTemple(this.scene, temple.theme, this.quality);
    this.prepareOutdoor();
    this._fogIn = null; this._fogOut = undefined; this.walkPath = null; this.groundY = 0;
    this.scene.add(this.ripple);
    this.me = me;
    this.setPlayerLook(me);
    const b = this.temple.bounds;
    const p = prevPos || new THREE.Vector3(0, 0, Math.min(b.maxZ - 3.5, (this.temple.cushions.at(-1)?.pos.z ?? 0) - 1));
    this.player.root.position.set(p.x, 0, p.z);
    this.player.root.rotation.y = 0;
    setSeated(this.player, false);
    this.seat = null;
    this.walkTarget = null;
    this.cam.yaw = 0; this.cam.pitch = 0.24; this.cam.dist = temple.theme.size[0] < 14 ? 5 : 6.2;
    this.cam.target.set(p.x, 2, p.z - 1);
    this.spawnNpcs(temple.npc || 0);
    this.spawnAbbot(temple);
    this.spawnHermit(temple);
    this.spawnTellers(temple);
    this.emitContext();
  }

  /* ---------------- đi ra ngoài chùa ---------------- */
  prepareOutdoor() {
    const od = this.temple.outdoor;
    this.od = od;
    this.groundCache = new Map();
    this.waterMeshes = null;
    if (!od) return;
    // các mặt có thể đứng lên: bỏ trời, nước, vật trong suốt, sprite
    const list = [];
    od.group.updateMatrixWorld(true);
    od.group.traverse((o) => {
      if (!o.isMesh || o.name === 'sky' || o.userData.noWalk) return;
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      if (!m || m.transparent || o.isInstancedMesh) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const bb = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
      if (bb.min.y > 12) return;
      list.push({ o, bb });
    });
    this.walkMeshes = list;
    this.outR = od.walkR || GROUND_R[this.templeId] || Math.max(od.W, od.D) / 2 + 28; // đi xa tối đa quanh chùa
    buildGrounds(this, this.templeId);
    if (od.blocks) this.gardenBlock = [...(this.gardenBlock || []), ...od.blocks];
  }
  // độ cao mặt đất ngoài trời tại (x,z), tìm từ ngang ngực trở xuống; null nếu không đứng được
  groundAt(x, z, fromY) {
    const key = `${Math.round(x * 4)},${Math.round(z * 4)},${Math.round(fromY)}`;
    if (this.groundCache.has(key)) return this.groundCache.get(key);
    const objs = this.walkMeshes.filter(({ bb }) => x >= bb.min.x && x <= bb.max.x && z >= bb.min.z && z <= bb.max.z && bb.min.y <= fromY + 1.6).map((e) => e.o);
    this.groundRay ||= new THREE.Raycaster();
    this.groundRay.set(new THREE.Vector3(x, fromY + 1.6, z), new THREE.Vector3(0, -1, 0));
    this.groundRay.far = 6;
    // tính cả nước để biết khi nào phía dưới là mặt nước
    const water = (this.waterMeshes ||= (() => { const w = []; this.od.group.traverse((o) => { if (o.userData.noWalk && o.isMesh) w.push(o); }); return w; })());
    const hit = this.groundRay.intersectObjects([...objs, ...water], false)[0];
    const y = !hit || hit.object.userData.noWalk ? null : hit.point.y;
    if (this.groundCache.size > 4000) this.groundCache.clear();
    this.groundCache.set(key, y);
    return y;
  }
  isInside(x, z) { const od = this.od; return !od || (Math.abs(x) < od.hw && Math.abs(z) < od.hd); }
  // trả về độ cao đứng được tại (x,z) hoặc null
  walkable(x, z, curY = 0) {
    const b = this.temple.bounds, od = this.od;
    if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) return 0; // trong chánh điện
    if (!od) return null;
    // khe cửa chính
    if (Math.abs(x) < od.doorW / 2 - 0.35 && z > od.hd - 1.2 && z < od.hd + 1.2) return 0;
    // ngoài tường (tường dày ~0.4)
    if (Math.abs(x) < od.hw + 0.7 && Math.abs(z) < od.hd + 0.7) return null;
    if (Math.hypot(x, z) > this.outR) return null;
    if (this.gardenBlock?.some(([a, b, r]) => Math.hypot(x - a, z - b) < r)) return null; // tháp trong vườn chùa
    const y = this.groundAt(x, z, curY);
    if (y === null || Math.abs(y - curY) > 0.75) return null; // vực, tường, mặt nước
    return y;
  }
  get outside() { return this.player && !this.isInside(this.player.root.position.x, this.player.root.position.z); }
  // tự đi ra sân hoặc vào chánh điện qua cửa chính
  goThroughDoor() {
    const od = this.od; if (!od || !this.player) return;
    if (this.seat) this.stand();
    const out = !this.outside;
    const path = out ? [new THREE.Vector3(0, 0, od.hd - 1.5), new THREE.Vector3(0, 0, od.hd + 3.2), new THREE.Vector3(0, 0, od.hd + 6)] : [new THREE.Vector3(0, 0, od.hd + 1.6), new THREE.Vector3(0, 0, od.hd - 2.5)];
    this.walkPath = path.slice(1);
    this.walkTarget = { pos: path[0], cushion: null };
    // nếu vướng gì không tới được cửa thì sau vài giây đưa thẳng ra/vào
    this.doorTrip = { out, until: this.clock.elapsedTime + 3 + this.player.root.position.distanceTo(path[0]) / 2.2, turn: 0 };
  }
  checkDoorTrip(dt) {
    const d = this.doorTrip; if (!d) return;
    const od = this.od, P = this.player;
    if (this.outside !== d.out && this.clock.elapsedTime > d.until) {
      let z = od.hd - 2.5, y = 0;
      if (d.out) for (const dz of [6, 4.5, 3.2]) {
        const g = this.groundAt(0, od.hd + dz, 2) ?? this.groundAt(0, od.hd + dz, -2);
        if (g !== null) { z = od.hd + dz; y = g; break; }
      }
      P.root.position.set(0, y, z); this.groundY = y;
      this.walkTarget = null; this.walkPath = null;
    }
    if (this.outside === d.out && !this.walkTarget) {
      // quay camera nhìn ra phong cảnh (hoặc về phía tượng Phật khi vào)
      const goal = d.out ? Math.PI : 0;
      this.cam.yaw = lerpAngle(this.cam.yaw, goal, Math.min(1, dt * 3));
      d.turn += dt;
      if (d.turn > 1.2) this.doorTrip = null;
    }
  }
  updateFog() {
    const out = this.outside;
    if (out === this._fogOut || !this.scene.fog) return;
    this._fogOut = out;
    if (!this._fogIn) this._fogIn = [this.scene.fog.near, this.scene.fog.far];
    [this.scene.fog.near, this.scene.fog.far] = out ? [400, 2500] : this._fogIn;
  }

  /* ---------------- sư trụ trì ---------------- */
  spawnAbbot(temple) {
    const info = this.abbotInfo?.(temple) || { name: 'Thầy trụ trì' };
    const av = makeAvatar({ hero: 'naruto_sage', appearance: { hero: 'naruto_sage', hair: 'troc', skin: '#f5cba7' }, robe: { color: '#c98a2e', sash: '#8a3f14' } });
    setSeated(av, false);
    av.root.scale.setScalar(0.95);
    const b = this.temple.bounds;
    const x = Math.min(b.maxX - 1.2, Math.max(2.6, (temple.theme.size[0] / 2) * 0.32));
    const z = b.minZ + 0.6;
    av.root.position.set(x, 0, z);
    // avatar nhìn về -z khi rotation = 0 → quay ra phía đại chúng (+z), hơi nghiêng vào giữa
    av.homeRot = Math.atan2(0.4, -1);
    av.root.rotation.y = av.homeRot;
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex(info.name, 'Lục Đạo Trụ Trì · chạm để thưa chuyện', '#ffd36b'), depthWrite: false, transparent: true }));
    label.scale.set(1.9, 0.48, 1); label.position.y = 2.25;
    av.root.add(label);
    // vầng sáng nhẹ dưới chân để dễ nhận ra
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.6, 40), new THREE.MeshBasicMaterial({ color: '#ffd36b', transparent: true, opacity: 0.45, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; av.root.add(ring); av.ring = ring;
    this.scene.add(av.root);
    this.abbot = av;
  }
  // Lão hành khất đứng phía đối diện thầy trụ trì
  spawnHermit(temple) {
    const av = makeAvatar({ hero: 'shanks', appearance: { hero: 'shanks', hair: 'dai', skin: '#c99a78' }, robe: { color: '#7a6a52', sash: '#4a3a28' } });
    setSeated(av, false);
    av.root.scale.setScalar(0.92);
    const b = this.temple.bounds;
    av.root.position.set(-Math.min(-b.minX - 1.2, Math.max(2.6, (temple.theme.size[0] / 2) * 0.32)), 0, b.minZ + 0.6);
    av.homeRot = Math.atan2(-0.4, -1);
    av.root.rotation.y = av.homeRot;
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex('Lão Hành Khất', 'Chạm để xem duyên', '#d9c9a8'), depthWrite: false, transparent: true }));
    label.scale.set(1.9, 0.48, 1); label.position.y = 2.25;
    av.root.add(label);
    this.scene.add(av.root);
    this.hermit = av;
  }
  /* ---------------- người kể chuyện ngoài sân ---------------- */
  // tìm các ô đi tới được từ cửa chính (loang theo lưới 1 m), rồi đặt vài người kể chuyện ở chỗ thoáng
  // duyệt dần từng ô bằng generator: mỗi ô là một lần dò mặt đất, chạy một mạch làm đơ máy vài giây
  *reachableSpots() {
    const od = this.od; if (!od) return [];
    const start = [0, Math.round(od.hd + 2)], key = (x, z) => x + ',' + z;
    const y0 = this.walkable(start[0], start[1], 0);
    if (y0 === null) return [];
    const seen = new Map([[key(...start), y0]]), q = [[...start, y0]], out = [];
    const lim = Math.min(this.outR - 4, Math.max(od.W, od.D) / 2 + 18);
    while (q.length && seen.size < 2500) {
      const [x, z, y] = q.shift();
      const inHall = Math.abs(x) < od.hw + 2.5 && Math.abs(z) < od.hd + 2.5;
      if (!inHall) out.push({ x, z, y });
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, nz = z + dz, k = key(nx, nz);
        if (seen.has(k) || Math.hypot(nx, nz) > lim) continue;
        const ny = this.walkable(nx, nz, y);
        seen.set(k, ny);
        if (ny !== null && !this.isInside(nx, nz)) q.push([nx, nz, ny]);
        yield;
      }
    }
    // chỗ thoáng: cả 4 ô xung quanh cũng đi được
    return out.filter(({ x, z }) => [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dz]) => seen.get(key(x + dx, z + dz)) != null));
  }
  // Người kể chuyện đứng ngoài sân, lúc vào chùa chưa thấy: tìm chỗ đứng sau, chia nhỏ từng lượt để không làm chậm việc vào chùa
  zoomBy(k) { this.cam.dist = THREE.MathUtils.clamp(this.cam.dist * k, 2.2, 14); }
  // Dịch shader trước khung hình đầu, không chặn trang (màn chờ vẫn chạy). Máy chậm quá thì không đợi thêm.
  async warmUp(maxMs = 6000) {
    try {
      this.camera.updateMatrixWorld();
      await Promise.race([this.renderer.compileAsync(this.scene, this.camera), new Promise((ok) => setTimeout(ok, maxMs))]);
    } catch {}
  }
  spawnTellers(temple) {
    const list = this.tellerInfo?.(temple) || [];
    if (!list.length) return;
    if (!this.od) return this.placeTellers(temple, list, null);
    const job = (this.tellerJob = {}), it = this.reachableSpots(), t0 = performance.now() + 400;
    const step = () => {
      if (this.tellerJob !== job) return; // đã đổi chùa
      // máy yếu mỗi khung hình rất lâu: càng chờ lâu càng làm nhiều mỗi lượt, kẻo người kể chuyện không bao giờ ra
      const now = performance.now(), end = now + Math.min(50, 6 + (now - t0) / 100);
      let r;
      while (performance.now() < end) { r = it.next(); if (r.done) return this.placeTellers(temple, list, r.value); }
      setTimeout(step, 16);
    };
    setTimeout(step, 400);
  }
  placeTellers(temple, list, found) {
    const b = this.temple.bounds;
    // chùa trong hang (không có sân): đứng hai bên lối vào trong động
    const spots = found || [{ x: b.minX + 1.2, z: b.maxZ - 1.5, y: 0 }, { x: b.maxX - 1.2, z: b.maxZ - 2.5, y: 0 }];
    if (!spots.length) return;
    const od = this.od || { hd: b.maxZ + 1, hw: b.maxX }, chosen = [];
    if (!this.od) chosen.push(...spots);
    // người thứ nhất ở sân trước (dễ gặp khi bước ra), những người sau ở xa nhau
    const front = spots.filter((p) => p.z > od.hd + 2.5 && Math.abs(p.x) > 1.5 && Math.abs(p.x) < od.hw + 8);
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    if (front.length && !chosen.length) chosen.push(pick(front));
    while (chosen.length < list.length) {
      let best = null, bd = -1;
      for (let i = 0; i < 40; i++) {
        const c = pick(spots), d = Math.min(...chosen.map((o) => Math.hypot(o.x - c.x, o.z - c.z)), 99);
        if (d > bd) { bd = d; best = c; }
      }
      if (!best) break;
      chosen.push(best);
    }
    const ROBES = [['#7a5a3e', '#d9b25a'], ['#6f8fb8', '#e6bd45'], ['#b8c0c8', '#c9a24a'], ['#efeae0', '#c9a24a']];
    const SK = ['#d9a07a', '#c98d64', '#e2b08a', '#b97c55'];
    list.forEach((info, i) => {
      const at = chosen[i]; if (!at) return;
      const [color, sash] = ROBES[(i + temple.id.length) % ROBES.length];
      const av = makeAvatar({ appearance: { hair: info.hair || (i % 2 ? 'bui' : 'ngan'), gender: i % 2 ? 'nu' : 'nam', skin: SK[i % SK.length] }, robe: { color, sash } });
      setSeated(av, false);
      av.root.scale.setScalar(AV_SCALE);
      av.root.position.set(at.x, at.y, at.z);
      av.baseY = at.y;
      av.homeRot = Math.atan2(-at.x, -(od.hd + 4 - at.z)) + Math.PI; // nhìn về phía cửa chùa
      av.root.rotation.y = av.homeRot;
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex(info.name, info.role + ' · chạm để nghe kể', '#9fd4ff'), depthWrite: false, transparent: true }));
      label.scale.set(2.1 / AV_SCALE, 0.53 / AV_SCALE, 1); label.position.y = 2.15; av.root.add(label); av.label = label;
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.6, 40), new THREE.MeshBasicMaterial({ color: '#9fd4ff', transparent: true, opacity: 0.4, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; av.root.add(ring); av.ring = ring;
      av.tellerIdx = i;
      this.scene.add(av.root);
      this.tellers.push(av);
    });
  }
  /* ---------------- cáp treo (Núi Bà Huyền) ---------------- */
  nearCable() {
    const cb = this.od?.cable, p = this.player?.root.position;
    return !!(cb && p && this.outside && Math.hypot(p.x - cb.station.x, p.z - cb.station.z) < cb.station.r);
  }
  rideCable() {
    const cb = this.od?.cable; if (!cb || this.ride) return;
    const pts = cb.path, cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
    this.ride = { cb, pts, cum, L: cum.at(-1), s: 0, phase: cb.tour ? 'tour' : 'up', t: 0, stop: -1, look: new THREE.Vector3().copy(pts[1]) };
    this.walkTarget = null; this.walkPath = null;
    this.player.root.visible = false;
    cb.cabin.visible = true;
    if (!cb.tour) this.onRide?.('up');
    this.emitContext();
  }
  endRide() {
    const r = this.ride; if (!r) return;
    r.cb.cabin.visible = false;
    this.ride = null;
    this.player.root.visible = true;
    this.camOcc = undefined;
    this.cam.target.set(this.player.root.position.x, (this.groundY || 0) + 1.9, this.player.root.position.z);
    this.onRide?.('end');
    this.emitContext();
  }
  rideCamera(dt, time) {
    const r = this.ride, { pts, cum } = r, cabin = r.cb.cabin;
    if (r.phase === 'tour') {
      // tham quan dưới chân núi trước khi lên cáp: máy quay lướt qua từng điểm
      const list = r.cb.tour;
      if (r.stop < 0 || r.t >= list[r.stop].dur) {
        r.stop++; r.t = 0;
        if (r.stop >= list.length) { r.phase = 'up'; this.onRide?.('up'); }
        else {
          const st = list[r.stop];
          this.camera.position.set(...st.from); r.look.set(...st.look);
          this.onRide?.('stop', st.text);
        }
      }
      if (r.phase === 'tour') {
        const st = list[r.stop]; r.t += dt;
        const k = THREE.MathUtils.smoothstep(r.t / st.dur, 0, 1);
        this.camera.position.set(...st.from).lerp(new THREE.Vector3(...st.to), k);
        this.camera.lookAt(r.look);
        cabin.position.copy(pts[0]);
        return;
      }
    }
    if (r.phase === 'up' || r.phase === 'down') {
      r.s += (r.phase === 'up' ? 1 : -1) * dt * (r.cb.speed || 13) * Math.min(1, 0.25 + Math.min(r.s, r.L - r.s) / 25);
      if (r.phase === 'up' && r.s >= r.L) { r.s = r.L; r.phase = 'top'; r.t = 0; this.onRide?.('top'); }
      if (r.phase === 'down' && r.s <= 0) { this.endRide(); return; }
    } else if ((r.t += dt) > 12) {
      if (r.cb.oneWay) { this.endRide(); return; }
      r.phase = 'down'; this.onRide?.('down');
    }
    let i = 1; while (i < cum.length - 1 && cum[i] < r.s) i++;
    const a = pts[i - 1], b = pts[i], f = THREE.MathUtils.clamp((r.s - cum[i - 1]) / (cum[i] - cum[i - 1]), 0, 1);
    cabin.position.copy(a).lerp(b, f);
    const dir = b.clone().sub(a).normalize(); if (r.phase === 'down') dir.negate();
    cabin.rotation.y = Math.atan2(dir.x, dir.z);
    cabin.rotation.z = Math.sin(time * 1.3) * 0.015;
    let pos, look;
    if (r.phase === 'top') {
      // quanh tượng Phật Bà trên đỉnh
      const st = r.cb.statue, ang = r.cb.facing - 0.9 + r.t * 0.15;
      pos = new THREE.Vector3(st.x + Math.sin(ang) * 58, st.y - 6 + Math.sin(r.t * 0.5) * 3, st.z + Math.cos(ang) * 58);
      look = st.clone().add(new THREE.Vector3(0, -4, 0));
    } else {
      const side = new THREE.Vector3(dir.z, 0, -dir.x);
      pos = cabin.position.clone().addScaledVector(dir, -10).addScaledVector(side, 5).add(new THREE.Vector3(0, 1.5, 0));
      // nhìn xuôi đường cáp; lên thì hướng dần về tượng, xuống thì ngắm đồng bằng
      look = r.phase === 'up' ? cabin.position.clone().addScaledVector(dir, 30).lerp(r.cb.statue, Math.min(0.6, r.s / r.L)) : cabin.position.clone().addScaledVector(dir, 40).add(new THREE.Vector3(0, -12, 0));
    }
    this.camera.position.lerp(pos, Math.min(1, dt * 3));
    r.look.lerp(look, Math.min(1, dt * 3));
    this.camera.lookAt(r.look);
  }
  nearTeller(d = 2.6) {
    if (!this.player) return -1;
    const p = this.player.root.position;
    let best = -1, bd = d;
    for (const t of this.tellers || []) {
      const dd = Math.hypot(t.root.position.x - p.x, t.root.position.z - p.z);
      if (dd < bd) { bd = dd; best = t.tellerIdx; }
    }
    return best;
  }
  nearAbbot(d = 2.6) {
    if (!this.abbot || !this.player) return false;
    const a = this.abbot.root.position, p = this.player.root.position;
    return Math.hypot(a.x - p.x, a.z - p.z) < d;
  }

  look(user) {
    const eq = user.equipped || {};
    const robe = this.items[eq.robe]?.data || this.items.ao_lam?.data;
    const beads = this.items[eq.beads]?.data;
    const cushion = this.items[eq.cushion]?.data;
    return { appearance: user.appearance, robe, beads, cushion, hat: this.items[eq.hat]?.data, staff: this.items[eq.staff]?.data, cloud: this.items[eq.cloud]?.data, pet: this.items[eq.pet]?.data };
  }

  setPlayerLook(user) {
    this.me = user;
    const old = this.player;
    const lk = this.look(user);
    const av = makeAvatar(lk);
    av.root.scale.setScalar(AV_SCALE);
    av.look = lk;
    this.setHalo(av, user.level);
    const marker = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.24, 4), new THREE.MeshStandardMaterial({ color: 0xffd36b, emissive: 0xffa21a, emissiveIntensity: 0.8 }));
    marker.rotation.x = Math.PI; marker.position.y = 1.62;
    av.upper.add(marker); av.marker = marker;
    av.onBow = () => this.onBow?.();
    if (old) {
      av.groundY = old.groundY || 0;
      av.root.position.copy(old.root.position);
      av.root.rotation.y = old.root.rotation.y;
      setSeated(av, old.seated);
      if (old.dancing) setDancing(av, true);
      if (old.boxingMode) setBoxingGloves(av, true);
      av.bowing = old.bowing; av.bowT = old.bowT; av.meditating = old.meditating;
      disposeAvatar(old);
    }
    if (this.meQuy) setGhost(av, true);
    this.player = av;
    this.scene.add(av.root);
    if (this.seat) this.temple.setCushionLook(this.seat, lk.cushion);
  }

  /* ---------------- NPC ---------------- */
  spawnNpcs(n) {
    const free = this.temple.cushions.filter((c) => !c.occupant);
    free.sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(n, free.length - 2); i++) this.addNpc(free[i], i);
    // Thêm DJ Kakashi, Đội nhảy Pháp Phục Sansa (dance-sleeves) & Võ Sĩ Ace ở Quảng Trường Sân Chùa Ngoài Trời
    if (this.temple.stressZones) {
      const djZ = this.temple.stressZones.dj;
      const djNpc = makeAvatar({ hero: 'kakashi', outfit: 'dj_rave', groundY: djZ.pos.y, appearance: { hero: 'kakashi', outfit: 'dj_rave' } });
      setSeated(djNpc, false);
      setDancing(djNpc, true);
      djNpc.root.scale.setScalar(AV_SCALE * 1.05);
      djNpc.root.position.set(djZ.pos.x, djZ.pos.y, djZ.pos.z - 2.35);
      djNpc.root.rotation.y = Math.PI;
      djNpc.npc = true; djNpc.isStageNpc = true;
      const djLbl = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex('DJ Kakashi', '🎧 Chú Đại Bi Vinahouse', '#00f0ff'), depthWrite: false, transparent: true }));
      djLbl.scale.set(1.65 / AV_SCALE, 0.42 / AV_SCALE, 1); djLbl.position.y = 2.15;
      djNpc.root.add(djLbl);
      this.scene.add(djNpc.root);
      this.npcs.push(djNpc);

      // 2 Đạo hữu mặc Pháp Phục Sansa Hàn Quốc (tay áo rộng dance-sleeves) quẩy trên sàn DJ ngoài sân
      const partyDancers = [
        { hero: 'luffy_g5', outfit: 'sansa_sage', name: 'Thần Nika (Pháp Phục Sansa)', sub: '🍃 Vũ Điệu Tay Áo Rộng 108 BPM', dx: -1.18, dz: -0.25, yaw: 0.25 },
        { hero: 'minato', outfit: 'sansa_lotus', name: 'Tia Chớp Vàng (Sansa Maru)', sub: '🌸 Pháp Phục Hồng Sen Hàn Quốc', dx: 1.18, dz: -0.25, yaw: -0.25 },
      ];
      for (const pd of partyDancers) {
        const dNpc = makeAvatar({ hero: pd.hero, outfit: pd.outfit, groundY: djZ.pos.y, appearance: { hero: pd.hero, outfit: pd.outfit } });
        setSeated(dNpc, false);
        setDancing(dNpc, true);
        dNpc.root.scale.setScalar(AV_SCALE);
        dNpc.root.position.set(djZ.pos.x + pd.dx, djZ.pos.y, djZ.pos.z + pd.dz);
        dNpc.root.rotation.y = pd.yaw;
        dNpc.npc = true; dNpc.isStageNpc = true; dNpc.isOutdoorPartyNpc = true;
        const pLbl = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex(pd.name, pd.sub, '#f4c2af'), depthWrite: false, transparent: true, opacity: 0.9 }));
        pLbl.scale.set(1.65 / AV_SCALE, 0.40 / AV_SCALE, 1); pLbl.position.y = 2.1;
        dNpc.root.add(pLbl); dNpc.label = pLbl;
        this.scene.add(dNpc.root);
        this.npcs.push(dNpc);
      }

      const bxZ = this.temple.stressZones.boxing;
      const bxNpc = makeAvatar({ hero: 'ace', outfit: 'boxing_champ', groundY: bxZ.pos.y, appearance: { hero: 'ace', outfit: 'boxing_champ' } });
      setSeated(bxNpc, false);
      setBoxingGloves(bxNpc, true);
      bxNpc.root.scale.setScalar(AV_SCALE * 1.05);
      bxNpc.root.position.set(bxZ.pos.x - 1.68, bxZ.pos.y, bxZ.pos.z - 0.18);
      bxNpc.root.rotation.y = 0;
      bxNpc.npc = true; bxNpc.isBoxerNpc = true; bxNpc.nextPunch = 2.5;
      const bxLbl = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex('Hỏa Quyền Ace', '🥊 HLV Đấm Bốc Xả Nghiệp', '#ff6b4a'), depthWrite: false, transparent: true }));
      bxLbl.scale.set(1.75 / AV_SCALE, 0.42 / AV_SCALE, 1); bxLbl.position.y = 2.15;
      bxNpc.root.add(bxLbl);
      this.scene.add(bxNpc.root);
      this.npcs.push(bxNpc);
    }
  }
  addNpc(cu, idx = 0) {
    const heroDef = HERO_LIST[(idx + Math.floor(Math.random() * HERO_LIST.length)) % HERO_LIST.length];
    const av = makeAvatar({ hero: heroDef.id, autoSansaOutfit: true, appearance: { hero: heroDef.id, skin: heroDef.skin } });
    av.root.scale.setScalar(AV_SCALE);
    av.npc = true; av.cushion = cu; cu.occupant = av;
    av.root.position.set(cu.pos.x, av.baseY, cu.pos.z);
    av.root.rotation.y = rand(-0.08, 0.08);
    av.bowing = Math.random() < 0.4; av.bowT = Math.random();
    av.bowSlow = rand(1.8, 2.6); // NPC lạy chậm rãi, mỗi người một nhịp
    av.nextChange = rand(8, 30);
    av.npcName = `${heroDef.name} (${phapDanh(this.npcNames ||= new Set())})`;
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex(av.npcName, `${av.outfit?.name || heroDef.title}`, '#d9c9a8'), depthWrite: false, transparent: true, opacity: 0.85 }));
    label.scale.set(1.45 / AV_SCALE, 0.34 / AV_SCALE, 1); label.position.y = 1.95; label.visible = false;
    av.root.add(label); av.label = label;
    av.root.visible = this.showNpc;
    this.scene.add(av.root);
    this.npcs.push(av);
  }
  // NPC nhường chỗ cho người thật
  evictNpc(cu) {
    const npc = cu.occupant;
    if (!npc?.npc) return;
    disposeAvatar(npc);
    this.npcs.splice(this.npcs.indexOf(npc), 1);
    cu.occupant = null;
    const free = this.temple.cushions.filter((c) => !c.occupant && c !== this.seat);
    if (free.length > 2) this.addNpc(free[Math.floor(Math.random() * free.length)]);
  }
  setShowNpc(on) { this.showNpc = on; this.applyNpcVisible(); }
  applyNpcVisible() { const on = this.showNpc !== false && this.perfLevel < 3; this.npcs.forEach((n) => (n.root.visible = on)); }
  setShowNames(on) { this.showNames = on; this.perfT = 0; this.remotes.forEach((r) => (r.label.visible = on)); this.npcs.forEach((n) => n.label && (n.label.visible = on)); }

  /* ---------------- người chơi khác ---------------- */
  applyRoom(players, myId) {
    const seen = new Set();
    for (const p of players) {
      if (p.id === myId) continue;
      seen.add(p.id);
      const sig = JSON.stringify([p.appearance, p.equipped, p.q]);
      const tag = p.name + '|' + p.level + '|' + (p.honor || '');
      let r = this.remotes.get(p.id);
      if (r && r.sig === sig && r.tag !== tag) {
        // lên cấp/đổi tên: chỉ thay nhãn, không dựng lại avatar
        r.label.material.map.dispose();
        r.label.material.map = playerLabel(p);
        r.label.material.needsUpdate = true;
        fitLabel(r.label, p);
        r.tag = tag;
        if (!p.q) this.setHalo(r.av, p.level);
      }
      if (!r || r.sig !== sig) {
        const prev = r;
        if (prev) { disposeAvatar(prev.av); if (prev.cushion?.occupant === prev.av) prev.cushion.occupant = null; }
        const lk = this.look(p);
        const av = makeAvatar(lk);
        av.root.scale.setScalar(AV_SCALE);
        av.look = lk;
        if (p.q) setGhost(av, true); else this.setHalo(av, p.level);
        const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: playerLabel(p), depthWrite: false, transparent: true }));
        fitLabel(label, p); label.visible = this.showNames;
        av.root.add(label);
        av.root.position.set(p.x, 0, p.z);
        this.scene.add(av.root);
        r = { av, label, sig, tag, x: p.x, z: p.z, r: p.r, cushion: null };
        this.remotes.set(p.id, r);
      }
      r.x = p.x; r.z = p.z; r.r = p.r; r.a = p.a; r.y = p.y || 0;
      const cu = p.seat >= 0 ? this.temple.cushions[p.seat] : null;
      if (cu !== r.cushion) {
        if (r.cushion?.occupant === r.av) { r.cushion.occupant = null; this.temple.setCushionLook(r.cushion, null); }
        if (cu) {
          if (cu.occupant?.npc) this.evictNpc(cu);
          if (!cu.occupant || cu.occupant === r.av) { cu.occupant = r.av; this.temple.setCushionLook(cu, r.av.look.cushion); }
        }
        r.cushion = cu;
      }
      setSeated(r.av, !!cu);
      r.av.bowing = p.a === 2;
      r.av.meditating = p.a === 3;
    }
    for (const [id, r] of this.remotes) {
      if (seen.has(id)) continue;
      if (r.cushion?.occupant === r.av) { r.cushion.occupant = null; this.temple.setCushionLook(r.cushion, null); }
      disposeAvatar(r.av);
      this.remotes.delete(id);
    }
  }

  // Linh thú đi theo chủ ngoài sân, vị trí do từng máy tự tính nên không tốn thêm băng thông.
  // Chủ vào trong chùa thì linh thú ẩn đi; bước ra lại mới hiện bên cạnh, luôn ở phía ngoài.
  updatePets(dt, time) {
    const me = this.player;
    if (!me) return;
    this.petT = (this.petT || 0) - dt;
    if (this.petT <= 0) {
      this.petT = 0.5;
      const cap = [this.quality === 'high' ? 20 : 8, 4, 0, 0][this.perfLevel], list = [];
      for (const r of this.remotes.values()) if (r.av.look?.pet) list.push([Math.hypot(r.av.root.position.x - me.root.position.x, r.av.root.position.z - me.root.position.z), r.av]);
      list.sort((a, b) => a[0] - b[0]);
      this.petShow = new Set(list.slice(0, cap).map((e) => e[1]));
    }
    this.stepPet(me, dt, time, true);
    for (const r of this.remotes.values()) this.stepPet(r.av, dt, time, !!this.petShow?.has(r.av));
  }

  stepPet(av, dt, time, allowed) {
    const data = av.look?.pet;
    if (!data) return;
    const pet = (av.pet ||= makePet(data, this.quality === 'high'));
    if (!pet) return;
    if (pet.root.parent !== this.scene) this.scene.add(pet.root);
    const o = av.root.position, R = pet.root;
    if (!allowed || this.isInside(o.x, o.z)) { R.visible = false; pet.out = false; return; }
    if (!pet.out) {
      // hiện ở phía xa toà nhà so với chủ, không bao giờ nằm trong chùa
      const l = Math.hypot(o.x, o.z) || 1, nx = o.x + (o.x / l) * 1.5, nz = o.z + (o.z / l) * 1.5;
      R.position.x = this.isInside(nx, nz) ? o.x : nx; R.position.z = this.isInside(nx, nz) ? o.z : nz;
      pet.out = true; pet.s = 0; pet.frame = 0; pet.y = av.baseY || 0;
    }
    R.visible = true;
    const dx = o.x - R.position.x, dz = o.z - R.position.z, d = Math.hypot(dx, dz);
    let moving = false;
    if (d > 16) { pet.out = false; return; } // tụt quá xa: hiện lại cạnh chủ ở khung hình sau
    if (d > pet.keep) {
      const step = Math.min(d - pet.keep, Math.max(pet.speed, d * 1.6) * dt), nx = R.position.x + (dx / d) * step, nz = R.position.z + (dz / d) * step;
      if (!this.isInside(nx, nz)) { R.position.x = nx; R.position.z = nz; moving = step > 0.002; }
    }
    if (d > 0.3) R.rotation.y = lerpAngle(R.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 6));
    // bám mặt đất, cứ vài khung hình dò một lần
    if ((pet.frame = (pet.frame || 0) + 1) % 4 === 1) {
      const g = this.od ? this.groundAt(R.position.x, R.position.z, av.baseY || 0) : null;
      pet.gy = g === null || g === undefined ? (av.baseY || 0) : g;
    }
    pet.y += ((pet.gy ?? 0) - pet.y) * Math.min(1, dt * 10);
    R.position.y = pet.y + (pet.fly ? pet.hover + Math.sin(time * 1.3) * 0.07 : 0);
    pet.s = Math.min(1, (pet.s || 0) + dt * 2.5);
    R.scale.setScalar(pet.scale * AV_SCALE * pet.s);
    pet.anim(time, moving);
  }

  netState() {
    const p = this.player;
    if (!p) return null;
    return {
      x: +p.root.position.x.toFixed(2), z: +p.root.position.z.toFixed(2), y: +(this.groundY || 0).toFixed(2), r: +p.root.rotation.y.toFixed(2),
      seat: this.seat ? this.seat.index : -1,
      a: p.meditating ? 3 : p.bowing || p.bowT > 0 ? 2 : this.moving ? 1 : 0,
    };
  }

  /* ---------------- ngồi / đứng ---------------- */
  nearestFreeCushion(maxDist = 1.3) {
    const p = this.player.root.position;
    let best = null, bd = maxDist;
    for (const c of this.temple.cushions) {
      if (c.occupant && !c.occupant.npc) continue;
      const d = Math.hypot(c.pos.x - p.x, c.pos.z - p.z);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }
  // Tự đi tới bồ đoàn trống gần nhất (đến nơi sẽ tự ngồi xuống)
  walkToSeat() {
    if (this.meQuy) return false;
    if (this.outside) return false;
    const cu = this.nearestFreeCushion(Infinity);
    if (!cu) return false;
    this.walkPath = null;
    this.walkTarget = { pos: cu.pos.clone(), cushion: cu };
    return true;
  }
  setQuy(on) { this.meQuy = on; if (this.player) setGhost(this.player, on); }

  sit(cu = this.nearestFreeCushion()) {
    if (!cu || this.meQuy) return false;
    if (cu.occupant?.npc) this.evictNpc(cu);
    if (cu.occupant && cu.occupant !== this.player) return false;
    this.seat = cu; cu.occupant = this.player;
    this.walkTarget = null;
    this.player.root.position.set(cu.pos.x, 0, cu.pos.z);
    this.player.root.rotation.y = 0;
    setSeated(this.player, true);
    this.temple.setCushionLook(cu, this.player.look.cushion);
    this.cam.lastUser = 0;
    this.emitContext();
    return true;
  }
  stand() {
    if (!this.seat) return;
    this.setBowing(false, true);
    this.player.meditating = false;
    this.temple.setCushionLook(this.seat, null);
    this.seat.occupant = null;
    this.seat = null;
    setSeated(this.player, false);
    this.player.root.position.z += 0.9;
    this.emitContext();
  }
  setBowing(on, immediate = false) {
    this.player.bowing = on;
    if (immediate) this.player.bowT = 0;
  }
  get seated() { return !!this.seat; }
  // Mõ gỗ và dùi đặt trước bồ đoàn khi tụng kinh
  showMo(on) {
    if (this.mo) { this.scene.remove(this.mo.group); this.mo.group.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); }); this.mo = null; }
    if (!on || !this.seat) return;
    const group = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: '#8a4a1e', roughness: 0.45 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), wood);
    body.scale.set(1.1, 0.8, 1); body.position.y = 0.16; body.castShadow = true;
    const slit = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.012, 6, 20, Math.PI), new THREE.MeshStandardMaterial({ color: '#2a1408', roughness: 1 }));
    slit.position.set(0, 0.14, -0.19); slit.rotation.z = Math.PI;
    const pivot = new THREE.Group(); pivot.position.set(0.42, 0.34, 0); pivot.rotation.z = 0.45;
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.42, 8), new THREE.MeshStandardMaterial({ color: '#c79a5c', roughness: 0.6 }));
    stick.rotation.z = Math.PI / 2; stick.position.x = -0.18;
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), new THREE.MeshStandardMaterial({ color: '#5a3a22', roughness: 0.8 }));
    tip.position.x = -0.4;
    pivot.add(stick, tip);
    group.add(body, slit, pivot);
    group.position.set(this.seat.pos.x + 0.8, 0, this.seat.pos.z - 0.25); // đặt bên phải để camera sau lưng vẫn thấy
    this.scene.add(group);
    this.mo = { group, body, pivot, t: 1 };
  }
  strikeMo() { if (this.mo) this.mo.t = 0; }
  // Đẩy khung hình lên trên để nhân vật không bị bảng kinh che (px = 0: trả về bình thường)
  liftView(px, sideX = 0) {
    const c = this.camera, el = this.renderer.domElement, w = el.clientWidth, h = el.clientHeight;
    if (px > 0 || sideX > 0) {
      c.setViewOffset(w, h, sideX, px, w, h);
      // lùi xa và hạ thấp góc nhìn để vẫn thấy tượng Phật phía trên
      this.camBefore ||= { dist: this.cam.dist, pitch: this.cam.pitch };
      this.cam.dist = 7.6; this.cam.pitch = 0.1;
    } else {
      c.clearViewOffset();
      if (this.camBefore) { Object.assign(this.cam, this.camBefore); this.camBefore = null; }
    }
  }

  emitContext() {
    const p = this.player?.root.position;
    const nearDoor = !!(this.od && p && !this.seat && Math.abs(p.x) < this.od.doorW / 2 + 1.5 && Math.abs(p.z - this.od.hd) < 3.5);
    const ctx = { seated: !!this.seat, canSit: !this.seat && !this.outside && !!this.nearestFreeCushion(), canTalk: !this.seat && this.nearAbbot(), teller: this.seat || this.ride ? -1 : this.nearTeller(), cable: this.ride ? 'riding' : (!this.seat && this.nearCable() ? 'near' : null), door: nearDoor ? (this.outside ? 'in' : 'out') : null, outside: this.outside };
    const sig = JSON.stringify(ctx);
    if (sig !== this.ctxSig) { this.ctxSig = sig; this.onContext?.(ctx); }
  }

  /* ---------------- điều khiển ---------------- */
  bindInput() {
    const c = this.canvas;
    const pointers = new Map();
    let joyId = null, joyOrigin = null, pinch = null;
    const knob = this.joyEl.querySelector('.knob');
    const R = 52;

    const showJoy = (x, y) => { this.joyEl.style.left = x - 65 + 'px'; this.joyEl.style.top = y - 65 + 'px'; this.joyEl.classList.add('on'); knob.style.transform = 'translate(0,0)'; };
    const hideJoy = () => { this.joyEl.classList.remove('on'); this.input.x = this.input.y = 0; };

    c.addEventListener('pointerdown', (e) => {
      try { c.setPointerCapture(e.pointerId); } catch {}
      const isTouch = e.pointerType !== 'mouse';
      if (isTouch && joyId === null && e.clientX < innerWidth * 0.45 && e.clientY > innerHeight * 0.35) {
        joyId = e.pointerId; joyOrigin = { x: e.clientX, y: e.clientY, t: e.timeStamp };
        showJoy(e.clientX, e.clientY);
        return;
      }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: e.timeStamp }); // timeStamp: máy yếu xử lý sự kiện trễ vẫn nhận đúng là chạm
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), dist: this.cam.dist };
      }
    });
    c.addEventListener('pointermove', (e) => {
      if (e.pointerId === joyId) {
        let dx = e.clientX - joyOrigin.x, dy = e.clientY - joyOrigin.y;
        const len = Math.hypot(dx, dy);
        if (len > R) { dx *= R / len; dy *= R / len; }
        knob.style.transform = `translate(${dx}px, ${dy}px)`;
        this.input.x = dx / R; this.input.y = dy / R;
        return;
      }
      const p = pointers.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (pointers.size === 2 && pinch) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        this.cam.dist = THREE.MathUtils.clamp(pinch.dist * (pinch.d / d), 2.2, 14);
      } else if (pointers.size === 1) {
        this.cam.yaw -= dx * 0.006;
        this.cam.pitch = THREE.MathUtils.clamp(this.cam.pitch + dy * 0.004, -0.05, 1.2);
        this.cam.lastUser = performance.now();
      }
    });
    const end = (e) => {
      if (e.pointerId === joyId) {
        joyId = null; hideJoy();
        // chạm nhanh ở vùng cần điều khiển vẫn là chạm (vào bồ đoàn, bia, người khác)
        if (e.type === 'pointerup' && Math.hypot(e.clientX - joyOrigin.x, e.clientY - joyOrigin.y) < 10 && e.timeStamp - joyOrigin.t < 350) this.tap(e.clientX, e.clientY);
        return;
      }
      const p = pointers.get(e.pointerId);
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (p && e.type === 'pointerup' && e.button === 0 && Math.hypot(e.clientX - p.sx, e.clientY - p.sy) < 10 && e.timeStamp - p.t < 350) this.tap(e.clientX, e.clientY);
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('contextmenu', (e) => e.preventDefault()); // chuột phải dùng để xoay, không mở menu trình duyệt
    c.addEventListener('wheel', (e) => { e.preventDefault(); this.zoomBy(1 + Math.sign(e.deltaY) * 0.1); }, { passive: false });

    addEventListener('keydown', (e) => { if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') this.keys[e.code] = true; });
    addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    addEventListener('blur', () => { this.keys = {}; });
  }

  tap(x, y) {
    if (!this.temple) return;
    const ndc = new THREE.Vector2((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camera);
    // Chạm vào Bao Cát Đấm Bốc Xả Nghiệp?
    if (this.temple.bagMeshes?.length) {
      const hitBag = this.ray.intersectObjects(this.temple.bagMeshes, false)[0];
      if (hitBag) {
        const idx = hitBag.object.userData.bagIdx ?? 2;
        this.punchStressBag(idx);
        return;
      }
    }
    // Chạm vào Đại Mõ Neon Phản Lực?
    if (this.temple.giantMuyuMesh && this.ray.intersectObject(this.temple.giantMuyuMesh, false).length) {
      this.hitHyperMuyu();
      return;
    }
    // Chạm vào Sàn DJ Ánh Trăng ngoài sân chùa?
    if (this.temple.djStageMesh && this.ray.intersectObject(this.temple.djStageMesh, false).length) {
      this.teleportToZone('dj');
      this.onDjStageTap?.();
      return;
    }
    // Chạm vào sàn Võ Đài Đấm Bốc ngoài sân chùa?
    if (this.temple.boxStageMesh && this.ray.intersectObject(this.temple.boxStageMesh, false).length) {
      this.teleportToZone('boxing');
      this.punchStressBag();
      return;
    }
    // chạm vào thầy trụ trì?
    if (this.abbot && this.ray.intersectObject(this.abbot.root, true).length) { this.onTalk?.(); return; }
    if (this.hermit && this.ray.intersectObject(this.hermit.root, true).length) { this.onHermit?.(); return; }
    for (const t of this.tellers || []) if (this.ray.intersectObject(t.root, true).length) { this.onTell?.(t.tellerIdx); return; }
    // chạm vào Phật tử khác → mở thẻ (gửi lời chúc, tặng hương, kết bạn)
    if (this.remotes.size) {
      const hit = this.ray.intersectObjects([...this.remotes.values()].filter((r) => !r.culled).map((r) => r.av.root), true)[0];
      if (hit) {
        for (const [id, r] of this.remotes) { let o = hit.object; while (o && o !== r.av.root) o = o.parent; if (o) { this.onPlayerTap?.(id); return; } }
      }
    }
    // chạm vào bồ đoàn?
    const meshes = this.temple.cushions.map((c) => c.mesh);
    const hitC = this.ray.intersectObjects(meshes, false)[0];
    // chạm vào bia công đức (nếu không có bồ đoàn nằm gần hơn)
    const hitM = this.temple.meritStele?.visible && this.ray.intersectObject(this.temple.meritStele, true)[0];
    if (hitM && (!hitC || hitM.distance < hitC.distance)) { this.onMerit?.(); return; }
    let target, cushion = null;
    if (hitC) {
      cushion = this.temple.cushions.find((c) => c.mesh === hitC.object);
      if (cushion.occupant && !cushion.occupant.npc && cushion.occupant !== this.player) { this.onToast?.('Chỗ này đã có người ngồi'); return; }
      target = cushion.pos.clone();
    } else {
      const hit = new THREE.Vector3();
      if (!this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -this.player.root.position.y), hit)) return;
      const nearC = this.temple.cushions.find((c) => Math.hypot(c.pos.x - hit.x, c.pos.z - hit.z) < 0.75 && (!c.occupant || c.occupant.npc));
      if (nearC) { cushion = nearC; target = nearC.pos.clone(); } else target = hit;
    }
    if (cushion === this.seat) return;
    if (this.seat) this.stand();
    const b = this.temple.bounds;
    if (!this.outside && !cushion) {
      // chạm ra ngoài khi đang trong điện: nếu chạm vào khoảng cửa/ra phía cửa thì đi qua cửa, còn lại giữ trong điện
      if (this.od && target.z > b.maxZ + 0.5 && Math.abs(target.x) < this.od.hw) { this.goThroughDoor(); return; }
      target.x = THREE.MathUtils.clamp(target.x, b.minX, b.maxX);
      target.z = THREE.MathUtils.clamp(target.z, b.minZ, b.maxZ);
    }
    this.walkPath = null;
    this.walkTarget = { pos: target, cushion };
    this.ripple.position.set(target.x, 0.2, target.z);
    this.rippleT = 0;
  }

  /* ---------------- tự giảm hiển thị khi đông hoặc máy yếu; bản thân người chơi không bao giờ bị ẩn ---------------- */
  // Bậc 1: chỉ hiện tên người gần, tối đa 4 linh thú. Bậc 2: thêm chỉ linh thú của mình, người xa cử động thưa.
  // Bậc 3: ẩn người ngoài 25 người gần nhất, ẩn Phật tử ảo, giảm độ phân giải. Hạ bậc nhanh khi giật, lên lại chậm để khỏi nhấp nháy.
  tickPerf(raw, dt) {
    this.perfFrame++;
    if (this.perfLevel >= 2 && this.perfFrame % (this.perfLevel >= 3 ? 30 : 12) === 0) this.renderer.shadowMap.needsUpdate = true;
    if (raw < 0.5 && !document.hidden) { this.perfSum += raw; this.perfN++; } // bỏ khung hình lúc đổi tab, tải chùa
    this.perfT -= dt;
    if (this.perfT > 0) return;
    this.perfT = 0.5;
    if (this.perfSum >= 1) {
      const fps = this.perfN / this.perfSum, cur = this.perfLoad || 0;
      this.perfFps = fps; this.perfSum = 0; this.perfN = 0;
      const want = fps < 20 ? 3 : fps < 26 ? 2 : fps < 35 ? 1 : 0;
      if (want > cur) {
        if ((this.perfLow += 1) >= 3) {
          // vừa nới ra đã giật lại thì lần sau đợi lâu gấp đôi
          if (performance.now() - (this.perfEased || -1e9) < 30e3) this.perfPatience = Math.min(64, (this.perfPatience || 8) * 2);
          this.perfLoad = Math.min(3, cur + 1); this.perfLow = 0; this.perfGood = 0;
        }
      } else this.perfLow = 0;
      if (fps > 50 && cur > 0) {
        if ((this.perfGood += 1) >= (this.perfPatience || 8)) { this.perfLoad = cur - 1; this.perfGood = 0; this.perfEased = performance.now(); }
      } else this.perfGood = 0;
    }
    const n = this.remotes.size, crowd = n > 100 ? 3 : n > 60 ? 2 : n > 30 ? 1 : 0, level = Math.max(crowd, this.perfLoad || 0);
    if (level !== this.perfLevel) this.setPerfLevel(level);
    this.rankRemotes();
  }
  setPerfLevel(level) {
    const was = this.perfLevel;
    this.perfLevel = level;
    this.renderer.shadowMap.autoUpdate = level < 2; // từ bậc 2 bóng đổ chỉ vẽ lại thưa, xem tickPerf
    if ((was >= 3) !== (level >= 3)) {
      this.applyNpcVisible();
      const hq = this.quality === 'high';
      this.renderer.setPixelRatio(level >= 3 ? 1 : hq ? Math.min(devicePixelRatio, 2) : Math.min(devicePixelRatio, 1.25));
    }
    this.petT = 0;
  }
  rankRemotes() {
    const me = this.player?.root.position, L = this.perfLevel;
    if (!me) return;
    const list = [...this.remotes.values()];
    if (L >= 2) for (const r of list) r.d = Math.hypot(r.av.root.position.x - me.x, r.av.root.position.z - me.z);
    if (L >= 2) list.sort((a, b) => a.d - b.d);
    list.forEach((r, i) => {
      const d = L >= 2 ? r.d : Math.hypot(r.av.root.position.x - me.x, r.av.root.position.z - me.z);
      const culled = L >= 3 && i >= 40;
      if (r.culled !== culled) { r.culled = culled; r.av.root.visible = !culled; }
      r.far = L >= 2 && d > 15;
      r.label.visible = this.showNames && (L === 0 || (L === 1 ? d < 22 : i < 8));
    });
  }

  /* ---------------- linh thú hoang: đi thong thả quanh chỗ hiện, tới gần thì hiện nút kết duyên ---------------- */
  setBeasts(list) {
    this.beasts ||= new Map();
    const want = new Set(list.map((b) => b.id));
    for (const id of [...this.beasts.keys()]) if (!want.has(id)) this.removeBeast(id);
    for (const b of list) if (!this.beasts.has(b.id)) this.addBeast(b);
  }
  addBeast(b) {
    if (!this.od) return;
    const pet = makePet({ model: b.model }, this.quality === 'high');
    if (!pet) return;
    const R = pet.root, tag = beastTag(this.beastName?.(b.item) || '', b.rank);
    tag.position.set(0, { huou: 1.45, tho_ngoc: 1.55, nghe: 1.35, su_tu_xanh: 1.3, thanh_long: 0.8, chu_tuoc: 1.0, huyen_vu: 1.35, bach_tuong: 1.6, trau_vang: 1.7 }[b.model] ?? 1.5, 0);
    R.add(tag);
    R.position.set(b.x, 0, b.z);
    R.rotation.y = Math.random() * 6.28;
    this.scene.add(R);
    pet.gy = this.groundAt(b.x, b.z, 0) ?? (this.od.groundY || 0); pet.y = pet.gy;
    this.beasts.set(b.id, { ...b, pet, tag, tx: b.x, tz: b.z, wait: Math.random() * 4, frame: 0 });
  }
  removeBeast(id) {
    const e = this.beasts?.get(id); if (!e) return;
    this.beasts.delete(id);
    this.scene.remove(e.pet.root);
    e.tag.material.map.dispose(); e.tag.material.dispose();
    e.pet.dispose?.();
    if (this.nearBeastId === id) { this.nearBeastId = null; this.onBeastNear?.(null); }
  }
  clearBeasts() { for (const id of [...(this.beasts?.keys() || [])]) this.removeBeast(id); }
  beastDist(id) {
    const e = this.beasts?.get(id), p = this.player?.root.position; // tính từ chỗ hiện, là mốc máy chủ dùng để kiểm tra
    return e && p ? Math.hypot(e.x - p.x, e.z - p.z) : Infinity;
  }
  tickBeasts(dt, time) {
    if (!this.beasts?.size) return;
    const p = this.player?.root.position;
    let best = null, bestD = 3;
    for (const [id, e] of this.beasts) {
      const R = e.pet.root, d = p ? Math.hypot(R.position.x - p.x, R.position.z - p.z) : Infinity;
      R.visible = d < 70 && !this.isInside(p?.x ?? 0, p?.z ?? 0);
      if (!R.visible) continue;
      if (d < bestD && !e.tried && Math.hypot(e.x - p.x, e.z - p.z) < 4.2) { best = id; bestD = d; }
      let moving = false;
      if (d < 6 || id === this.bondId) { // có người lại gần thì đứng yên, quay về phía họ
        R.rotation.y = lerpAngle(R.rotation.y, Math.atan2(p.x - R.position.x, p.z - R.position.z), Math.min(1, dt * 3));
      } else if ((e.wait -= dt) <= 0) {
        const dx = e.tx - R.position.x, dz = e.tz - R.position.z, l = Math.hypot(dx, dz);
        if (l < 0.1) { // điểm mới cách chỗ hiện tối đa 2 m, luôn nằm ngoài toà nhà
          const a = Math.random() * 6.28, r = Math.random() * 2, nx = e.x + Math.cos(a) * r, nz = e.z + Math.sin(a) * r;
          if (!this.isInside(nx, nz) && this.groundAt(nx, nz, e.pet.gy) !== null) { e.tx = nx; e.tz = nz; }
          e.wait = 2 + Math.random() * 5;
        } else {
          const st = Math.min(l, e.pet.speed * 0.45 * dt);
          R.position.x += (dx / l) * st; R.position.z += (dz / l) * st;
          R.rotation.y = lerpAngle(R.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 4));
          moving = true;
        }
      }
      if ((e.frame = e.frame + 1) % 6 === 1) { const g = this.groundAt(R.position.x, R.position.z, e.pet.gy); if (g !== null && g !== undefined) e.pet.gy = g; }
      e.pet.y += (e.pet.gy - e.pet.y) * Math.min(1, dt * 8);
      R.position.y = e.pet.y + (e.pet.fly ? e.pet.hover + Math.sin(time * 1.3) * 0.07 : 0);
      R.scale.setScalar(e.pet.scale * AV_SCALE);
      if (this.perfLevel < 2 || moving) e.pet.anim(time, moving);
    }
    if (best !== this.nearBeastId && !this.bondId) { this.nearBeastId = best; this.onBeastNear?.(best ? this.beasts.get(best) : null); }
  }

  /* ---------------- lộc chùa: hoa sen vàng ngoài khuôn viên ---------------- */
  // list: [{id,x,z}] – thay toàn bộ; gone: id vừa có người nhận
  setLoc(list) {
    this.loc ||= new Map();
    const want = new Set(list.map((l) => l.id));
    for (const [id, o] of this.loc) if (!want.has(id)) this.removeLoc(id, false);
    for (const l of list) if (!this.loc.has(l.id)) this.addLoc(l);
  }
  addLoc({ id, x, z }) {
    if (!this.od || !this.walkMeshes) return;
    // độ cao mặt đất: chiếu tia từ trên cao xuống
    const ray = new THREE.Raycaster(new THREE.Vector3(x, 40, z), new THREE.Vector3(0, -1, 0), 0, 80);
    const hit = ray.intersectObjects(this.walkMeshes.filter(({ bb }) => x >= bb.min.x && x <= bb.max.x && z >= bb.min.z && z <= bb.max.z).map((e) => e.o), false)[0];
    const y = hit ? hit.point.y : (this.od.groundY || 0);
    if (!LOC_GEO) {
      const petal = new THREE.SphereGeometry(0.16, 10, 6); petal.scale(1, 0.45, 2.1); petal.translate(0, 0, 0.26);
      LOC_GEO = { petal, core: new THREE.SphereGeometry(0.12, 12, 8) };
      LOC_MAT = { gold: new THREE.MeshStandardMaterial({ color: '#ffd36a', emissive: '#e8a020', emissiveIntensity: 0.9, roughness: 0.35, metalness: 0.3 }),
        glow: new THREE.SpriteMaterial({ map: glowTex(), color: '#ffcf60', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }) };
    }
    const g = new THREE.Group(), flower = new THREE.Group();
    for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(LOC_GEO.petal, LOC_MAT.gold); m.rotation.y = (i / 8) * Math.PI * 2; m.rotation.x = -0.5; flower.add(m); }
    flower.add(new THREE.Mesh(LOC_GEO.core, LOC_MAT.gold));
    const glow = new THREE.Sprite(LOC_MAT.glow); glow.scale.set(2.4, 2.4, 1);
    g.add(flower, glow);
    g.position.set(x, y + 0.9, z);
    g.userData = { id, baseY: y + 0.9, flower, glow, phase: Math.random() * 6 };
    this.scene.add(g);
    this.loc.set(id, g);
  }
  removeLoc(id, burst = true) {
    const g = this.loc?.get(id); if (!g) return;
    this.loc.delete(id);
    if (!burst) { this.scene.remove(g); return; }
    g.userData.dying = 0; (this.locDying ||= []).push(g); // bay lên rồi tan
  }
  clearLoc() { for (const id of [...(this.loc?.keys() || [])]) this.removeLoc(id, false); for (const g of this.locDying || []) this.scene.remove(g); this.locDying = []; }
  tickLoc(dt, time) {
    if (this.locDying?.length) this.locDying = this.locDying.filter((g) => {
      const u = g.userData; u.dying += dt; g.position.y += dt * 2.5; g.scale.setScalar(Math.max(0.01, 1 - u.dying));
      if (u.dying < 1) return true; this.scene.remove(g); return false;
    });
    if (!this.loc?.size) return;
    const p = this.player?.root.position;
    for (const [id, g] of this.loc) {
      const u = g.userData;
      g.position.y = u.baseY + Math.sin(time * 2 + u.phase) * 0.15;
      u.flower.rotation.y += dt * 0.8;
      u.glow.material.opacity = 0.55 + Math.sin(time * 3 + u.phase) * 0.2;
      // đi tới gần thì nhận lộc (mỗi bông chỉ hỏi máy chủ một lần mỗi 4 giây)
      if (p && this.onLoc && Math.hypot(g.position.x - p.x, g.position.z - p.z) < 1.6 && Math.abs(g.position.y - 0.9 - (this.groundY || 0)) < 3) {
        const now = performance.now();
        if (!u.tried || now - u.tried > 4000) { u.tried = now; this.onLoc(id); }
      }
    }
  }

  /* ---------------- vòng lặp ---------------- */
  start() {
    if (this.running) return;
    this.running = true;
    this.clock.getDelta();
    const loop = () => {
      if (!this.running) return;
      this.tick();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  stop() { this.running = false; }

  tick() {
    const raw = this.clock.getDelta(), dt = Math.min(raw, 0.05);
    const time = this.clock.elapsedTime;
    if (!this.temple) return;
    this.tickPerf(raw, dt);
    if (this.mo && this.mo.t < 1) {
      const m = this.mo; m.t = Math.min(1, m.t + dt / 0.18);
      const k = Math.sin(m.t * Math.PI); // dùi nện xuống rồi nhấc lên, mõ nảy nhẹ
      m.pivot.rotation.z = 0.45 - k * 0.65;
      m.body.scale.set(1.1 + k * 0.05, 0.8 - k * 0.06, 1 + k * 0.05);
    }
    const P = this.player;

    // nhập liệu di chuyển
    let ix = this.input.x, iy = this.input.y;
    if (this.keys.KeyW || this.keys.ArrowUp) iy = -1;
    if (this.keys.KeyS || this.keys.ArrowDown) iy = 1;
    if (this.keys.KeyA || this.keys.ArrowLeft) ix = -1;
    if (this.keys.KeyD || this.keys.ArrowRight) ix = 1;
    if (this.ride) { ix = 0; iy = 0; this.walkTarget = null; }
    const mag = Math.min(1, Math.hypot(ix, iy));
    let mx = 0, mz = 0;
    if (mag > 0.15) {
      if (this.seat) this.stand();
      this.walkTarget = null;
      const yaw = this.cam.yaw;
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
      mx = (fx * -iy + rx * ix); mz = (fz * -iy + rz * ix);
      const l = Math.hypot(mx, mz) || 1;
      mx = (mx / l) * mag; mz = (mz / l) * mag;
    } else if (this.walkTarget) {
      const dx = this.walkTarget.pos.x - P.root.position.x, dz = this.walkTarget.pos.z - P.root.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.08) {
        const cu = this.walkTarget.cushion;
        this.walkTarget = this.walkPath?.length ? { pos: this.walkPath.shift(), cushion: null } : null;
        if (cu) this.sit(cu);
      } else { mx = dx / d; mz = dz / d; if (d < 0.3) { mx *= d / 0.3; mz *= d / 0.3; } }
    }
    this.moving = Math.hypot(mx, mz) > 0.01;
    if (this.moving) {
      const speed = 2.8;
      const pp = P.root.position, cy = this.groundY ?? 0;
      const nx = pp.x + mx * speed * dt, nz = pp.z + mz * speed * dt;
      let y;
      // trượt theo từng trục khi bị chặn (tường, mép nước…)
      if ((y = this.walkable(nx, nz, cy)) !== null) { pp.x = nx; pp.z = nz; }
      else if ((y = this.walkable(nx, pp.z, cy)) !== null) pp.x = nx;
      else if ((y = this.walkable(pp.x, nz, cy)) !== null) pp.z = nz;
      else if (this.walkTarget && !this.walkTarget.cushion) { this.walkTarget = null; this.walkPath = null; }
      if (y !== null && y !== undefined) this.groundY = y;
      P.root.rotation.y = lerpAngle(P.root.rotation.y, Math.atan2(-mx, -mz), Math.min(1, dt * 10));
    }
    if (!this.seat) {
      P.groundY = this.groundY || 0;
      P.baseY = P.groundY;
    }
    this.checkDoorTrip(dt);
    this.updateFog();
    animateAvatar(P, dt, time, this.moving);
    P.marker.position.y = 1.62 + Math.sin(time * 3) * 0.05;
    P.marker.rotation.y += dt * 2;

    // người khác: nội suy
    for (const r of this.remotes.values()) {
      const a = r.av.root;
      const tx = r.cushion ? r.cushion.pos.x : r.x, tz = r.cushion ? r.cushion.pos.z : r.z;
      const dx = tx - a.position.x, dz = tz - a.position.z;
      const moving = Math.hypot(dx, dz) > 0.05 && !r.cushion;
      a.position.x += dx * Math.min(1, dt * 8);
      a.position.z += dz * Math.min(1, dt * 8);
      a.rotation.y = lerpAngle(a.rotation.y, r.faceUntil > performance.now() ? r.faceY : r.cushion ? 0 : r.r, Math.min(1, dt * 8));
      if (!r.cushion) r.av.baseY = r.y || 0;
      if (r.culled) continue;
      if (r.far && (this.perfFrame & 1)) continue; // máy đang quá tải: người ở xa cử động cách khung hình
      animateAvatar(r.av, r.far ? dt * 2 : dt, time, moving || r.a === 1);
    }
    this.updatePets(dt, time);
    // NPC
    const pp = this.player?.root.position;
    if (this.perfLevel < 3) for (const n of this.npcs) {
      // tên Phật tử ảo chỉ hiện khi đứng gần, tránh che tượng và Bảng vàng
      if (n.label && pp) n.label.visible = this.showNames && Math.hypot(n.root.position.x - pp.x, n.root.position.z - pp.z) < 4.5;
      if (n.isBoxerNpc) {
        n.nextPunch = (n.nextPunch || 3) - dt;
        if (n.nextPunch <= 0) {
          n.nextPunch = rand(2.4, 4.5);
          triggerUltimate(n);
          this.temple.hitBag?.(0, 0.7);
        }
      } else if (!n.isStageNpc) {
        n.nextChange -= dt;
        if (n.nextChange <= 0) { n.bowing = !n.bowing; n.nextChange = n.bowing ? rand(10, 30) : rand(15, 40); }
      }
      animateAvatar(n, dt, time, false);
    }

    if (this.abbot) {
      const ab = this.abbot, near = this.nearAbbot(4);
      const want = near ? Math.atan2(ab.root.position.x - this.player.root.position.x, ab.root.position.z - this.player.root.position.z) : ab.homeRot;
      ab.root.rotation.y = lerpAngle(ab.root.rotation.y, want, Math.min(1, dt * 3));
      ab.ring.material.opacity = 0.3 + Math.sin(time * 2) * 0.15;
      animateAvatar(ab, dt, time, false);
    }
    if (this.hermit) {
      const h = this.hermit, p = this.player?.root.position;
      const want = p && Math.hypot(h.root.position.x - p.x, h.root.position.z - p.z) < 4 ? Math.atan2(h.root.position.x - p.x, h.root.position.z - p.z) : h.homeRot;
      h.root.rotation.y = lerpAngle(h.root.rotation.y, want, Math.min(1, dt * 3));
      animateAvatar(h, dt, time, false);
    }
    for (const t of this.tellers || []) {
      const p = this.player?.root.position; if (!p) break;
      const d = Math.hypot(t.root.position.x - p.x, t.root.position.z - p.z);
      const want = d < 5 ? Math.atan2(t.root.position.x - p.x, t.root.position.z - p.z) : t.homeRot;
      t.root.rotation.y = lerpAngle(t.root.rotation.y, want, Math.min(1, dt * 2.5));
      t.label.visible = d < 12;
      t.ring.material.opacity = 0.25 + Math.sin(time * 2 + t.phase) * 0.15;
      // khi có người đến gần thì khẽ gật đầu như đang trò chuyện
      animateAvatar(t, dt, time, false);
      if (d < 3.2) t.head.rotation.x = Math.sin(time * 2.2 + t.phase) * 0.08;
    }
    this.tickLoc(dt, time);
    this.tickBeasts(dt, time);
    this.temple.update(dt, time);
    if (this.rippleT < 1) {
      this.rippleT += dt * 1.3;
      this.ripple.material.opacity = 0.8 * (1 - this.rippleT);
      this.ripple.scale.setScalar(1 + this.rippleT * 1.2);
    }

    // camera: khi đang ngồi và không chạm, xoay dần về phía tượng Phật
    const cam = this.cam;
    if (this.seat && performance.now() - cam.lastUser > 2500) {
      cam.yaw = lerpAngle(cam.yaw, 0, Math.min(1, dt * 1.2));
      cam.pitch += (0.18 - cam.pitch) * Math.min(1, dt * 1.2);
    }
    const fwdX = -Math.sin(cam.yaw), fwdZ = -Math.cos(cam.yaw);
    const gy = this.seat ? 0 : (this.groundY || 0);
    const want = new THREE.Vector3(P.root.position.x + fwdX * 1.0, gy + 1.65, P.root.position.z + fwdZ * 1.0);
    cam.target.lerp(want, Math.min(1, dt * 6));
    const cp = Math.cos(cam.pitch);
    const pos = new THREE.Vector3(
      cam.target.x + Math.sin(cam.yaw) * cp * cam.dist,
      cam.target.y + Math.sin(cam.pitch) * cam.dist + 0.6,
      cam.target.z + Math.cos(cam.yaw) * cp * cam.dist,
    );
    const [W, D, H] = this.templeData.theme.size;
    if (!this.outside) {
      pos.x = THREE.MathUtils.clamp(pos.x, -W / 2 + 0.4, W / 2 - 0.4);
      pos.z = THREE.MathUtils.clamp(pos.z, -D / 2 + 0.4, D / 2 - 0.4);
      pos.y = THREE.MathUtils.clamp(pos.y, 0.6, H - 0.4);
      if (this.faded?.size) {
        for (const [o, orig] of this.faded) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); o.material = orig; }
        this.faded.clear();
      }
    } else {
      // ngoài trời: không chui xuống đất, không lọt vào trong tường chánh điện
      pos.y = Math.max(pos.y, gy + 0.6);
      const od = this.od;
      if (Math.abs(pos.x) < od.hw + 0.6 && Math.abs(pos.z) < od.hd + 0.6 && pos.y < H) {
        const ex = od.hw + 0.6 - Math.abs(pos.x), ez = od.hd + 0.6 - Math.abs(pos.z);
        if (ex < ez) pos.x = Math.sign(pos.x || 1) * (od.hw + 0.6); else pos.z = Math.sign(pos.z || 1) * (od.hd + 0.6);
      }
      // vật nhỏ (cột, cây) che nhân vật → làm mờ đi; vật lớn (vách núi, tường) → kéo camera lại gần
      const head = new THREE.Vector3(P.root.position.x, gy + 1.3, P.root.position.z);
      const dir = pos.clone().sub(head), full = dir.length(); dir.normalize();
      const lo = head.clone().min(pos), hi = head.clone().max(pos);
      const cand = this.walkMeshes.filter(({ bb }) => bb.max.x >= lo.x && bb.min.x <= hi.x && bb.max.z >= lo.z && bb.min.z <= hi.z && bb.max.y >= lo.y && bb.min.y <= hi.y);
      this.camRay ||= new THREE.Raycaster();
      this.camRay.set(head, dir); this.camRay.far = full;
      const hits = cand.length ? this.camRay.intersectObjects(cand.map((e) => e.o), false) : [];
      const small = (o) => { const e = cand.find((c) => c.o === o); return e && Math.min(e.bb.max.x - e.bb.min.x, e.bb.max.z - e.bb.min.z) < 3; };
      const big = hits.find((h) => !small(h.object));
      const fadeNow = new Set(hits.filter((h) => small(h.object) && (!big || h.distance < big.distance)).map((h) => h.object));
      this.faded ||= new Map();
      for (const o of fadeNow) if (!this.faded.has(o)) {
        const orig = o.material; this.faded.set(o, orig);
        o.material = (Array.isArray(orig) ? orig : [orig]).map((m) => Object.assign(m.clone(), { transparent: true, opacity: 0.25, depthWrite: false }));
        if (!Array.isArray(orig)) o.material = o.material[0];
      }
      for (const [o, orig] of this.faded) if (!fadeNow.has(o)) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); o.material = orig; this.faded.delete(o); }
      const goal = big ? Math.max(1.2, big.distance - 0.3) : full;
      this.camOcc = Math.min(goal, (this.camOcc ?? full) + dt * 4); // vào nhanh, lùi ra từ từ
      pos.copy(head).addScaledVector(dir, this.camOcc);
    }
    if (this.ride) this.rideCamera(dt, time);
    else { this.camera.position.copy(pos); this.camera.lookAt(cam.target); }

    if (!this.seat && !this._ctxT) { this._ctxT = 0; }
    this._ctxT = (this._ctxT || 0) + dt;
    if (this._ctxT > 0.2) { this._ctxT = 0; this.emitContext(); }

    this.renderer.render(this.scene, this.camera);
  }

  /* ---------------- biểu cảm & hiệu ứng ---------------- */
  // Chan: hai người quay mặt vào nhau rồi diễn động tác đấm đá
  playChan(from, to) {
    const get = (id) => (id === this.me?.id ? this.player : this.remotes.get(id)?.av);
    const a = get(from), b = get(to);
    if (a) startFight(a, 'hit');
    if (b) startFight(b, 'hurt');
    if (!a || !b) return;
    const dx = b.root.position.x - a.root.position.x, dz = b.root.position.z - a.root.position.z;
    if (Math.hypot(dx, dz) < 0.01) return;
    a.root.rotation.y = Math.atan2(-dx, -dz);
    b.root.rotation.y = Math.atan2(dx, dz);
    for (const [id, y] of [[from, a.root.rotation.y], [to, b.root.rotation.y]]) { const r = this.remotes.get(id); if (r) r.faceUntil = performance.now() + 1300, r.faceY = y; }
  }
  showEmote(id, e) {
    const av = id === this.me?.id ? this.player : this.remotes.get(id)?.av;
    if (!av) return;
    const tex = canvasTex(128, 128, (g) => {
      g.fillStyle = 'rgba(40,24,10,.55)'; g.beginPath(); g.arc(64, 64, 58, 0, Math.PI * 2); g.fill();
      if (EMOTES.includes(e)) drawIcon(g, e, 24, 24, 80, emoteColor(e), () => (tex.needsUpdate = true));
      else { g.font = '72px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffd36b'; g.fillText(e, 64, 70); }
    });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sp.scale.set(0.7, 0.7, 1);
    sp.position.set(0, 2.2, 0);
    av.root.add(sp);
    const t0 = performance.now();
    const step = () => {
      const k = (performance.now() - t0) / 2200;
      if (k >= 1) { av.root.remove(sp); tex.dispose(); sp.material.dispose(); return; }
      sp.position.y = 2.2 + k * 1.2;
      sp.material.opacity = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // Hào quang sau đầu theo cấp: cấp 1 chưa có, càng lên cấp càng sáng và rộng. Sprite đặt ngang đầu nên phần đầu tự che phía trước.
  setHalo(av, level) {
    if (!av?.upper) return;
    const tier = level >= 50 ? 3 : level >= 20 ? 2 : level >= 2 ? 1 : 0;
    if (av.haloTier === tier) return;
    if (av.haloSprite) { av.haloSprite.removeFromParent(); av.haloSprite.material.dispose(); av.haloSprite = null; }
    av.haloTier = tier;
    if (!tier) return;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTexture(tier), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: [0, 0.6, 0.85, 1][tier] }));
    const sc = [0, 1.25, 1.5, 1.9][tier];
    sp.scale.set(sc, sc, 1); sp.position.set(0, 0.97, 0);
    av.upper.add(sp); av.haloSprite = sp;
  }

  // Hào quang khi thăng cấp
  glow(id) {
    const av = id === this.me?.id ? this.player : this.remotes.get(id)?.av;
    if (!av) return;
    // Không dùng PointLight: thêm/bớt đèn khiến three.js biên dịch lại shader của mọi vật liệu → máy đứng hình vài giây.
    // Thay bằng vòng sáng + quầng sáng cộng màu (additive), không ảnh hưởng ánh sáng cảnh.
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.05, 8, 48), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    ring.rotation.x = Math.PI / 2;
    const haloTex = canvasTex(128, 128, (g) => {
      const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,220,140,.9)'); gr.addColorStop(0.4, 'rgba(255,190,90,.35)'); gr.addColorStop(1, 'rgba(255,170,60,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    });
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.position.y = 1.2; halo.scale.set(2.6, 2.6, 1);
    av.root.add(ring, halo);
    const t0 = performance.now();
    const step = () => {
      const k = (performance.now() - t0) / 2500;
      if (k >= 1) { av.root.remove(ring, halo); ring.geometry.dispose(); ring.material.dispose(); haloTex.dispose(); halo.material.dispose(); return; }
      ring.position.y = 0.2 + k * 2.2;
      ring.scale.setScalar(1 + Math.sin(k * Math.PI) * 0.5);
      ring.material.opacity = 1 - k;
      halo.material.opacity = Math.sin(k * Math.PI);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  bowingCount() {
    let n = this.player.bowing ? 1 : 0;
    for (const r of this.remotes.values()) if (r.a === 2) n++;
    return n;
  }

  /* ---------------- KHU VỰC XÕA STRESS NGOÀI SÂN CHÙA (SANSA MARU × NARUTO/ONE PIECE 3D) ---------------- */
  teleportToZone(zoneKey = 'hall') {
    if (!this.temple?.stressZones || !this.player) return null;
    const z = this.temple.stressZones[zoneKey] || this.temple.stressZones.hall;
    if (this.seat) this.stand();
    this.walkTarget = null;
    this.walkPath = null;
    this.doorTrip = null;
    const gy = z.pos.y || 0;
    this.groundY = gy;
    this.player.groundY = gy;
    this.player.baseY = gy;
    this.player.root.position.copy(z.pos);
    this.player.root.rotation.y = z.yaw ?? 0;
    this.cam.yaw = z.yaw ?? 0;
    this.cam.pitch = 0.22;
    this.cam.dist = zoneKey === 'hall' ? 5.8 : 4.8;
    this.cam.lastUser = performance.now();
    this.updateFog();
    // Chuyển trạng thái theo khu vực
    if (zoneKey === 'dj') {
      this.toggleDjDance(true);
      setBoxingGloves(this.player, false);
    } else if (zoneKey === 'boxing') {
      this.toggleDjDance(false);
      setBoxingGloves(this.player, true);
    } else {
      this.toggleDjDance(false);
      setBoxingGloves(this.player, false);
    }
    this.emitContext();
    return z;
  }

  toggleDjDance(force) {
    if (!this.player) return false;
    const on = force !== undefined ? !!force : !this.player.dancing;
    if (on && this.seat) this.stand();
    setDancing(this.player, on);
    this.temple?.setDjParty?.(on);
    // Cho các NPC ở Sàn DJ ngoài sân chùa nhún nhảy cuồng nhiệt (giữ nguyên sự thanh tịnh trong Chánh Điện)
    this.npcs.forEach((n) => {
      if (n.isOutdoorPartyNpc) {
        setDancing(n, true);
      }
    });
    return on;
  }

  punchStressBag(bagIdx) {
    if (!this.temple || !this.player) return null;
    if (this.seat) this.stand();
    this.doorTrip = null;
    const bz = this.temple.stressZones?.boxing;
    if (bz && this.player.root.position.distanceTo(bz.pos) > 3.4) {
      const gy = bz.pos.y || 0;
      this.groundY = gy;
      this.player.groundY = gy;
      this.player.baseY = gy;
      this.player.root.position.copy(bz.pos);
      this.cam.yaw = bz.yaw ?? 0;
      this.cam.dist = 4.6;
      this.updateFog();
    }
    setDancing(this.player, false);
    setBoxingGloves(this.player, true);
    this.player.root.rotation.y = 0; // hướng về phía 5 bao cát trước mặt
    triggerUltimate(this.player);
    const idx = bagIdx !== undefined ? bagIdx : Math.floor(Math.random() * 5);
    const bagDef = this.temple.hitBag?.(idx, 1.25);
    this.onBagHit?.(bagDef);
    return bagDef;
  }

  hitHyperMuyu() {
    if (!this.temple || !this.player) return;
    if (this.seat) this.stand();
    this.doorTrip = null;
    const mz = this.temple.stressZones?.muyu;
    if (mz && this.player.root.position.distanceTo(mz.pos) > 3.6) {
      const gy = mz.pos.y || 0;
      this.groundY = gy;
      this.player.groundY = gy;
      this.player.baseY = gy;
      this.player.root.position.copy(mz.pos);
      this.cam.yaw = mz.yaw ?? 0;
      this.updateFog();
    }
    this.player.root.rotation.y = 0;
    triggerUltimate(this.player);
    this.temple.hitGiantMuyu?.();
    this.onGiantMuyuHit?.();
  }

  screenshot() {
    this.renderer.render(this.scene, this.camera);
    return this.canvas.toDataURL('image/jpeg', 0.92);
  }
}

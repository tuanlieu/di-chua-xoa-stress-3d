// Màn lần tràng hạt 3D
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { beadTex, rand } from './textures.js';

const N = 30;

export class BeadsView {
  constructor(canvas, onBead) {
    this.canvas = canvas;
    this.onBead = onBead;
    this.offset = 0;
    this.anim = null;
    this.running = false;
  }

  init() {
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true }));
    r.setPixelRatio(Math.min(devicePixelRatio, 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 0.85;
    const s = (this.scene = new THREE.Scene());
    s.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    this.camera.position.set(0, 0, 17);
    s.add(new THREE.HemisphereLight(0xffffff, 0xe8d8c0, 1.2));
    const dl = new THREE.DirectionalLight(0xffffff, 1.6); dl.position.set(3, 4, 8); s.add(dl);

    const pts = [];
    for (let i = 0; i < 64; i++) {
      const t = (i / 64) * Math.PI * 2, sn = Math.sin(t);
      pts.push(new THREE.Vector3(1.25 * Math.cos(t), 3.3 * Math.sign(sn) * Math.pow(Math.abs(sn), 0.55), 1.6 * Math.cos(t)));
    }
    this.curve = new THREE.CatmullRomCurve3(pts, true);
    s.add(new THREE.Mesh(new THREE.TubeGeometry(this.curve, 200, 0.02, 6, true), new THREE.MeshStandardMaterial({ color: 0x8a5a2a })));
    this.mat = new THREE.MeshPhysicalMaterial({ roughness: 0.4, envMapIntensity: 0.5 });
    const geo = new THREE.SphereGeometry(0.36, 40, 28);
    this.beads = [];
    for (let i = 0; i < N; i++) {
      const m = new THREE.Mesh(geo, this.mat);
      m.rotation.set(rand(0, 6), rand(0, 6), rand(0, 6));
      this.beads.push(m); s.add(m);
    }
    // hạt mẫu châu + tua
    this.guru = new THREE.Mesh(new THREE.SphereGeometry(0.46, 40, 28), this.mat);
    s.add(this.guru);
    this.tassel = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.1, 16), new THREE.MeshStandardMaterial({ color: 0xb02a2a, roughness: 0.9 }));
    s.add(this.tassel);
    this.layout();

    let sy = null, sx = null;
    this.canvas.addEventListener('pointerdown', (e) => { sy = e.clientY; sx = e.clientX; });
    this.canvas.addEventListener('pointerup', (e) => {
      if (sy === null) return;
      const dy = e.clientY - sy, dx = Math.abs(e.clientX - sx);
      sy = null;
      if (dy > -30 && dx < 80) this.advance();
    });
    addEventListener('resize', () => this.resize());
  }

  setSkin(data = {}) {
    if (!this.renderer) this.init();
    this.mat.map = beadTex(data);
    this.mat.roughness = data.gloss ? 0.12 : 0.4;
    this.mat.envMapIntensity = data.gloss ? 1.2 : 0.5;
    this.mat.metalness = data.metal || 0;
    // đồ hiếm, đồ quý: thêm lớp men bóng
    this.mat.clearcoat = data.rank ? 1 : 0;
    this.mat.clearcoatRoughness = 0.08;
    if (data.rank) { this.mat.roughness = data.metal ? 0.24 : 0.16; this.mat.envMapIntensity = 1.5; }
    this.mat.needsUpdate = true;
  }

  layout() {
    const pos = (u) => this.curve.getPointAt(((u % 1) + 1) % 1);
    this.beads.forEach((m, i) => m.position.copy(pos((i + this.offset + 0.5) / (N + 1))));
    const gp = pos((this.offset) / (N + 1));
    this.guru.position.copy(gp);
    this.tassel.position.set(gp.x, gp.y - 0.9, gp.z);
    this.tassel.visible = gp.y < 0;
  }

  advance() {
    if (this.anim) { this.offset = this.anim.to; }
    this.anim = { from: this.offset, to: this.offset + 1, t: 0 };
    navigator.vibrate?.(8);
    this.onBead?.();
  }

  resize() {
    if (!this.renderer) return;
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.position.z = this.camera.aspect < 0.7 ? 17 : 15;
    this.camera.updateProjectionMatrix();
  }

  start() {
    if (!this.renderer) this.init();
    this.resize();
    this.running = true;
    let last = performance.now();
    const loop = (now) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (this.anim) {
        this.anim.t = Math.min(1, this.anim.t + dt / 0.28);
        const e = 1 - Math.pow(1 - this.anim.t, 3);
        this.offset = this.anim.from + (this.anim.to - this.anim.from) * e;
        if (this.anim.t >= 1) this.anim = null;
        this.layout();
      }
      this.beads.forEach((m) => { m.rotation.y += dt * 0.05; });
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  stop() { this.running = false; }
}

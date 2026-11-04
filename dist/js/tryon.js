// Xem thử trang phục 3D trong cửa hàng: nhân vật của người chơi mặc món đồ đang xem, kéo để xoay.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeAvatar, animateAvatar, disposeAvatar, setSeated } from './avatar.js';
import { lotusPad, lotusPadColor, makeLotusPetals } from './lotus.js';
import { cushionGeo, cushionMaterial, setCushionFabric } from './cushion.js';

export function mountTryOn(canvas, { appearance, robe, beads, cushion, hat, staff, cloud, pose = 'sit', rot: rot0 = 0.35, spin = true }) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch { return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  // phản chiếu môi trường để chỉ kim tuyến, hạt đá, đài sen có ánh thật
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = env.texture;
  scene.environmentIntensity = 0.55;
  scene.add(new THREE.HemisphereLight('#fff1d8', '#4a2a14', 0.9));
  const key = new THREE.DirectionalLight('#ffe9c8', 2.2); key.position.set(2, 4, -4); scene.add(key);
  const rim = new THREE.DirectionalLight('#ffd9a0', 1.6); rim.position.set(-3, 2.5, 3.5); scene.add(rim);
  const seat = cushionMaterial(cushion);
  setCushionFabric(seat, !cushion?.lotus);
  const cu = new THREE.Mesh(cushion?.lotus ? lotusPad() : cushionGeo(), seat);
  cu.position.y = 0.095; scene.add(cu);
  let petals = null;
  if (cushion?.lotus) {
    seat.color.copy(lotusPadColor(cushion));
    petals = makeLotusPetals(cushion.petal || cushion.color);
    petals.material.metalness = (cushion.metal || 0) * 0.4;
    scene.add(petals);
  }
  const cam = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  // mũ lông trĩ, trượng cao hơn người: lùi xa cho thấy trọn món đồ
  const place = (sit) => {
    if (hat || staff || !sit) { cam.position.set(0, 1.7, -5.6); cam.lookAt(0, 1.15, 0); }
    else { cam.position.set(0, 1.5, -3.9); cam.lookAt(0, 0.85, 0); }
  };
  const av = makeAvatar({ appearance, robe, beads, hat, staff, cloud });
  scene.add(av.root);
  // ngồi thiền trên bồ đoàn, hoặc đứng cho thấy trọn áo và mây dưới chân
  const setPose = (p) => {
    const sit = p !== 'stand';
    setSeated(av, sit); av.meditating = sit;
    cu.visible = sit; if (petals) petals.visible = sit;
    place(sit);
  };
  setPose(pose);

  let rot = rot0, drag = null, started = false, last = performance.now();
  canvas.style.touchAction = 'none';
  canvas.onpointerdown = (e) => { drag = e.clientX; canvas.setPointerCapture?.(e.pointerId); };
  canvas.onpointermove = (e) => { if (drag !== null) { rot += (e.clientX - drag) * 0.01; drag = e.clientX; } };
  canvas.onpointerup = canvas.onpointercancel = () => (drag = null);
  const loop = (t) => {
    // thẻ đóng (canvas bị gỡ hoặc ẩn) thì giải phóng WebGL
    const gone = !canvas.isConnected || (started && !canvas.clientWidth);
    if (gone) {
      disposeAvatar(av); seat.dispose(); petals?.material.dispose();
      env.dispose(); pmrem.dispose();
      renderer.dispose(); renderer.forceContextLoss?.();
      return;
    }
    started = true;
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (w && canvas.width !== Math.floor(w * renderer.getPixelRatio())) { renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    if (drag === null && spin) rot += dt * 0.5;
    av.root.rotation.y = rot;
    animateAvatar(av, dt, t / 1000, false);
    renderer.render(scene, cam);
  };
  requestAnimationFrame(loop);
  return {
    setPose,
    // vẽ lại ngay rồi lấy ảnh, vì WebGL xoá bộ đệm sau mỗi khung hình
    snapshot() { renderer.render(scene, cam); return canvas.toDataURL('image/png'); },
  };
}

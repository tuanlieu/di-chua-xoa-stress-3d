// Ảnh nhỏ 3D cho thẻ cửa hàng: dùng một renderer tạm, vẽ lần lượt, lưu ảnh lại, xong việc thì giải phóng WebGL.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeAvatar, animateAvatar, disposeAvatar, setSeated, beadMaterial } from './avatar.js';
import { lotusPad, lotusPadColor, makeLotusPetals } from './lotus.js';
import { cushionGeo, cushionMaterial, setCushionFabric } from './cushion.js';
import { beadTex } from './textures.js';
import { makePet } from './pets.js';

const SIZE = 144;
const cache = new Map();
const beadGeo = new THREE.SphereGeometry(1, 20, 14);

function robeScene(scene, cam, it, appearance) {
  const av = makeAvatar({ appearance, robe: it.data });
  av.meditating = true;
  animateAvatar(av, 0.05, 0, false);
  av.root.rotation.y = 0.45;
  scene.add(av.root);
  cam.position.set(0, 1.05, -3.1); cam.lookAt(0, 0.62, 0);
  return () => disposeAvatar(av);
}
function beadsScene(scene, cam, it) {
  const d = it.data;
  const mat = d.rank ? beadMaterial(d) : new THREE.MeshStandardMaterial({ map: beadTex(d), roughness: d.gloss ? 0.15 : 0.45 });
  for (let i = 0; i < 14; i++) {
    const t = (i / 14) * Math.PI * 2, b = new THREE.Mesh(beadGeo, mat);
    b.position.set(Math.cos(t) * 0.8, Math.sin(t) * 0.8, 0); b.scale.setScalar(0.17);
    scene.add(b);
  }
  cam.position.set(0, 0, 3.6); cam.lookAt(0, 0, 0);
  return () => { if (!d.rank) mat.dispose(); };
}
function cushionScene(scene, cam, it) {
  const d = it.data, seat = cushionMaterial(d);
  setCushionFabric(seat, !d.lotus);
  scene.add(new THREE.Mesh(d.lotus ? lotusPad() : cushionGeo(), seat));
  let petals = null;
  if (d.lotus) {
    seat.color.copy(lotusPadColor(d));
    petals = makeLotusPetals(d.petal || d.color);
    petals.material.metalness = (d.metal || 0) * 0.4;
    petals.position.y = -0.095;
    scene.add(petals);
  }
  cam.position.set(0, 1.25, 2.1); cam.lookAt(0, 0.08, 0);
  return () => { seat.dispose(); petals?.material.dispose(); };
}
// mũ, pháp khí, mây: nhân vật mang món đồ, khung hình bám theo món đó
function gearScene(scene, cam, it, appearance) {
  const av = makeAvatar({ appearance, robe: { color: '#8f6a3e', sash: '#6b2416' }, [it.type]: it.data });
  setSeated(av, it.type !== 'cloud');
  animateAvatar(av, 0.05, 0, false);
  av.root.rotation.y = it.type === 'staff' ? -0.25 : 0.45;
  scene.add(av.root);
  if (it.type === 'hat') { cam.position.set(0, 2.1, -3.6); cam.lookAt(0, 1.42, 0); }
  else if (it.type === 'staff') { cam.position.set(-0.3, 1.5, -5.6); cam.lookAt(0.3, 1.2, 0); }
  else { cam.position.set(0, 1.2, -3.8); cam.lookAt(0, 0.55, 0); }
  return () => disposeAvatar(av);
}
function petScene(scene, cam, it) {
  const pet = makePet(it.data, true);
  if (!pet) return () => {};
  pet.anim(1.2, false);
  pet.root.rotation.y = 0.75;
  scene.add(pet.root);
  if (pet.fly) { cam.position.set(1.2, 1.5, 3.7); cam.lookAt(-0.3, 0.1, -0.2); } else { cam.position.set(0.6, 1.0, 2.3); cam.lookAt(0, 0.68, 0); }
  return () => pet.dispose();
}
const SCENES = { pet: petScene, robe: robeScene, beads: beadsScene, cushion: cushionScene, hat: gearScene, staff: gearScene, cloud: gearScene };

let queue = [], running = false;
async function drain(appearance) {
  running = true;
  let renderer = null, pmrem, env;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(SIZE, SIZE, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    pmrem = new THREE.PMREMGenerator(renderer);
    env = pmrem.fromScene(new RoomEnvironment(), 0.04);
    while (queue.length) {
      const { it, el } = queue.shift();
      if (!cache.has(it.id)) {
        const scene = new THREE.Scene();
        scene.environment = env.texture; scene.environmentIntensity = 0.55;
        scene.add(new THREE.HemisphereLight('#fff1d8', '#4a2a14', 0.9));
        const key = new THREE.DirectionalLight('#ffe9c8', 2.2); key.position.set(2, 4, -3); scene.add(key);
        const fill = new THREE.DirectionalLight('#ffe9c8', 1.4); fill.position.set(-2, 3, 4); scene.add(fill);
        const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 30);
        const done = SCENES[it.type](scene, cam, it, appearance);
        renderer.render(scene, cam);
        cache.set(it.id, renderer.domElement.toDataURL('image/png'));
        done();
      }
      if (el.isConnected) setThumb(el, cache.get(it.id));
      await new Promise((r) => setTimeout(r)); // nhường khung hình giữa các món
    }
  } catch { queue = []; /* không có WebGL: giữ biểu tượng phẳng */ }
  env?.dispose(); pmrem?.dispose();
  renderer?.dispose(); renderer?.forceContextLoss?.();
  running = false;
}
function setThumb(el, src) {
  el.classList.remove('tint'); el.classList.add('thumb'); el.removeAttribute('style');
  el.innerHTML = `<img src="${src}" alt="" width="72" height="72">`;
}
export function paintThumbs(root, items, appearance) {
  const wait = [];
  root.querySelectorAll('[data-thumb]').forEach((el) => {
    const it = items[el.dataset.thumb];
    if (!it || !SCENES[it.type]) return;
    if (cache.has(it.id)) setThumb(el, cache.get(it.id)); else wait.push({ it, el });
  });
  if (!wait.length) return;
  queue = wait;
  if (!running) drain(appearance);
}

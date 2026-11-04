// Hệ thống Nhân vật 3D Chibi Anime (12 Nhân vật từ ảnh tham khảo characters-naruto-onpine.jpg)
// Tư thế hỗ trợ: đứng, đi, ngồi thiền, lạy Phật, nhảy DJ (dancing), đấm bốc & tung tuyệt chiêu (fight / ultimate).
import * as THREE from 'three';
import { addGear } from './gear.js';

export const HERO_LIST = [
  {
    id: 'luffy_g5',
    name: 'Luffy Gear 5',
    title: 'Thần Mặt Trời Nika',
    quote: 'Nhịp trống giải phóng! Xõa hết áp lực!',
    skillName: 'Gomu Gomu no Bajrang Gun',
    skillColor: '#f8fafc',
    robeColor: '#ffffff',
    pantsColor: '#f1f5f9',
    sashColor: '#7e22ce',
    skin: '#f3c6a5',
    aura: '#e2e8f0',
  },
  {
    id: 'naruto_sage',
    name: 'Naruto Lục Đạo',
    title: 'Cửu Vĩ Tiên Nhân',
    quote: 'Tâm bất biến giữa dòng đời vạn biến, dattebayo!',
    skillName: 'Siêu Đại Ngọc Rasenshuriken',
    skillColor: '#facc15',
    robeColor: '#f59e0b',
    pantsColor: '#1e1b18',
    sashColor: '#fef08a',
    skin: '#f5cba7',
    aura: '#fde047',
  },
  {
    id: 'zoro',
    name: 'Roronoa Zoro',
    title: 'Tam Kiếm Phái',
    quote: 'Chém bay phiền não bằng Tam Thiên Thế Giới!',
    skillName: 'Tam Kiếm Phái: Luyện Ngục Quỷ Trảm',
    skillColor: '#22c55e',
    robeColor: '#14532d',
    pantsColor: '#111827',
    sashColor: '#dc2626',
    skin: '#e8b892',
    aura: '#4ade80',
  },
  {
    id: 'sasuke',
    name: 'Sasuke Uchiha',
    title: 'Lôi Kiếm Chidori',
    quote: 'Ngàn chim hót xé tan bóng tối stress!',
    skillName: 'Chidori – Thiên Điểu Lôi Kích',
    skillColor: '#38bdf8',
    robeColor: '#64748b',
    pantsColor: '#0f172a',
    sashColor: '#6b21a8',
    skin: '#f8dcc4',
    aura: '#60a5fa',
  },
  {
    id: 'sanji',
    name: 'Vinsmoke Sanji',
    title: 'Hắc Cước Hỏa Diễm',
    quote: 'Một cú đá Diable Jambe nướng chín mọi deadline!',
    skillName: 'Diable Jambe – Cú Đá Hỏa Diễm',
    skillColor: '#f97316',
    robeColor: '#18181b',
    pantsColor: '#09090b',
    sashColor: '#eab308',
    skin: '#f5cba7',
    aura: '#fb923c',
  },
  {
    id: 'kakashi',
    name: 'Kakashi Hatake',
    title: 'Ninja Sao Chép',
    quote: 'Đọc sách tịnh tâm, mọi chuyện cứ để Kamui lo.',
    skillName: 'Lôi Thiết – Raikiri Cắt Sét',
    skillColor: '#38bdf8',
    robeColor: '#3f6212',
    pantsColor: '#1e293b',
    sashColor: '#334155',
    skin: '#f5d0b5',
    aura: '#7dd3fc',
  },
  {
    id: 'law',
    name: 'Trafalgar Law',
    title: 'Bác Sĩ Tử Thần',
    quote: 'ROOM! Phẫu thuật tách toàn bộ muộn phiền ra khỏi đầu!',
    skillName: 'ROOM – Gamma Knife',
    skillColor: '#2dd4bf',
    robeColor: '#facc15',
    pantsColor: '#1d4ed8',
    sashColor: '#18181b',
    skin: '#ecc19c',
    aura: '#5eead4',
  },
  {
    id: 'itachi',
    name: 'Itachi Uchiha',
    title: 'Ảo Thuật Akatsuki',
    quote: 'Tha thứ cho bản thân và mỉm cười an nhiên.',
    skillName: 'Amaterasu – Thiên Chiếu Hắc Hỏa',
    skillColor: '#ef4444',
    robeColor: '#18181b',
    pantsColor: '#0f172a',
    sashColor: '#dc2626',
    skin: '#f3d1b8',
    aura: '#f87171',
  },
  {
    id: 'ace',
    name: 'Portgas D. Ace',
    title: 'Hỏa Quyền Bất Diệt',
    quote: 'Sống không hối tiếc! Đốt cháy mọi âu lo!',
    skillName: 'Hiken – Hỏa Quyền Đại Viêm Đế',
    skillColor: '#ff5722',
    robeColor: '#d97706',
    pantsColor: '#18181b',
    sashColor: '#f97316',
    skin: '#e5b085',
    aura: '#fb923c',
  },
  {
    id: 'shanks',
    name: 'Shanks Tóc Đỏ',
    title: 'Tứ Hoàng Bá Vương',
    quote: 'Nể mặt tôi, hôm nay hãy gác công việc lại và quẩy lên!',
    skillName: 'Thần Tị – Kamusari Haki Bá Vương',
    skillColor: '#dc2626',
    robeColor: '#f8fafc',
    pantsColor: '#573b26',
    sashColor: '#b91c1c',
    skin: '#e6b48e',
    aura: '#f87171',
  },
  {
    id: 'minato',
    name: 'Minato Namikaze',
    title: 'Tia Chớp Vàng Làng Lá',
    quote: 'Nhanh hơn cả tốc độ deadline dí!',
    skillName: 'Phi Lôi Thần Thuật – Rasengan',
    skillColor: '#fde047',
    robeColor: '#f8fafc',
    pantsColor: '#1e293b',
    sashColor: '#ef4444',
    skin: '#f8d8be',
    aura: '#facc15',
  },
  {
    id: 'kaido',
    name: 'Kaido Bách Thú',
    title: 'Sinh Vật Mạnh Nhất',
    quote: 'Worororo! Mọi áp lực đều không thể làm trầy da ta!',
    skillName: 'Lôi Minh Bát Quái – Hassaikai',
    skillColor: '#a855f7',
    robeColor: '#581c87',
    pantsColor: '#1e293b',
    sashColor: '#e2e8f0',
    skin: '#c68b65',
    aura: '#c084fc',
  },
];

export const HERO_MAP = Object.fromEntries(HERO_LIST.map((h) => [h.id, h]));

// Bộ Sưu Tập Đồ Trang Phục 3D (Tham khảo Pháp Phục Sansa Temple Hàn Quốc ?room=maru & Đồ Lễ Hội Sân Chùa)
export const OUTFIT_LIST = [
  {
    id: 'default',
    name: 'Nguyên Bản Anime',
    badge: 'Mặc định',
    desc: 'Trang phục chiến đấu đặc trưng của từng nhân vật 3D.',
    icon: '⚡',
    swatch: '#f59e0b',
  },
  {
    id: 'sansa_sage',
    name: 'Pháp Phục Sansa (Lá Thông)',
    badge: 'Sansa Maru',
    desc: 'Áo tràng Hàn Quốc nguyên khối (#bdc5ad) kèm tay áo rộng dance-sleeves & tràng hạt.',
    icon: '🍃',
    swatch: '#bdc5ad',
    robeColor: '#bdc5ad',
    pantsColor: '#8f9b8c',
    sashColor: '#e8dfcc',
    sansaRobe: true,
    wideSleeves: true,
    malaColor: '#78350f',
  },
  {
    id: 'sansa_lotus',
    name: 'Pháp Phục Sansa (Hồng Sen)',
    badge: 'Sansa Maru',
    desc: 'Pháp phục lụa mềm Hàn Quốc tông Hồng Sen Phấn (#e5b0aa) thanh lịch, tay áo rộng bay bổng.',
    icon: '🌸',
    swatch: '#e5b0aa',
    robeColor: '#e5b0aa',
    pantsColor: '#cbbdab',
    sashColor: '#fff1e6',
    sansaRobe: true,
    wideSleeves: true,
    malaColor: '#9d3e37',
  },
  {
    id: 'sansa_celadon',
    name: 'Pháp Phục Sansa (Bạch Ngọc)',
    badge: 'Sansa Maru',
    desc: 'Áo tràng thiền viện núi cao Hàn Quốc tông Lam Bạch Ngọc (#b9c8c2) dịu mắt.',
    icon: '🏔️',
    swatch: '#b9c8c2',
    robeColor: '#b9c8c2',
    pantsColor: '#7c8179',
    sashColor: '#e8f3f0',
    sansaRobe: true,
    wideSleeves: true,
    malaColor: '#3e5449',
  },
  {
    id: 'sansa_kasa',
    name: 'Đại Y Thiền Sư (Cà Sa Đỏ Vàng)',
    badge: 'Chánh Điện',
    desc: 'Pháp phục Jangsam vàng lúa mạch (#dfc890) khoác Y Hậu Kasa đỏ son (#b94048) trang nghiêm.',
    icon: '袈',
    swatch: '#b94048',
    robeColor: '#dfc890',
    pantsColor: '#a69b84',
    sashColor: '#b94048',
    sansaRobe: true,
    wideSleeves: true,
    kasaColor: '#b94048',
    malaColor: '#b45309',
  },
  {
    id: 'hanbok_maru',
    name: 'Lễ Phục Hanbok Chùa Cổ',
    badge: 'Hàn Quốc',
    desc: 'Áo Durumagi Hanbok 2 tầng lụa Lam Khói Chiều (#adbcdb) & nơ Goreum truyền thống.',
    icon: '🎐',
    swatch: '#adbcdb',
    robeColor: '#adbcdb',
    pantsColor: '#343a50',
    sashColor: '#9d3e37',
    sansaRobe: true,
    wideSleeves: true,
    hanbokRibbon: '#9d3e37',
  },
  {
    id: 'boxing_champ',
    name: 'Võ Phục Đấm Bốc Hoàng Kim',
    badge: 'Võ Đài',
    desc: 'Đai vô địch mạ vàng, băng trán chiến binh & đôi Găng Tay Đấm Bốc 3D đỏ rực luôn bật sẵn!',
    icon: '🥊',
    swatch: '#ef4444',
    robeColor: '#18181b',
    pantsColor: '#b91c1c',
    sashColor: '#facc15',
    boxingGear: true,
  },
  {
    id: 'dj_rave',
    name: 'Đồ Lễ Hội Neon Cyber-Lotus',
    badge: 'Sàn DJ',
    desc: 'Áo khoác Rave phát sáng LED Neon, kính Cyber Visor & tai nghe DJ 3D quẩy banh sân chùa!',
    icon: '🎧',
    swatch: '#38bdf8',
    robeColor: '#0f172a',
    pantsColor: '#1e1b4b',
    sashColor: '#38bdf8',
    djGear: true,
  },
];

export const OUTFIT_MAP = Object.fromEntries(OUTFIT_LIST.map((o) => [o.id, o]));

const ROBE_PROFILE = [[0, 0], [0.36, 0], [0.42, 0.08], [0.40, 0.25], [0.35, 0.45], [0.26, 0.62], [0.14, 0.72], [0, 0.74]].map(([x, y]) => new THREE.Vector2(x, y));
const SKIRT_PROFILE = [[0.41, 0.05], [0.39, 0.16], [0.37, 0.3], [0.35, 0.42], [0.34, 0.5]].map(([x, y]) => new THREE.Vector2(x, y));

const G = {
  // Tỷ lệ Chibi 2.5 đầu chuẩn theo ảnh tham khảo characters-naruto-onpine.jpg: đầu to biểu cảm, thân gọn khỏe
  head: new THREE.SphereGeometry(0.46, 36, 28),
  facePatch: new THREE.SphereGeometry(0.463, 32, 24, -Math.PI * 0.82, Math.PI * 0.64, Math.PI * 0.24, Math.PI * 0.54),
  torso: new THREE.LatheGeometry(ROBE_PROFILE, 32),
  arm: new THREE.CapsuleGeometry(0.105, 0.28, 6, 12),
  hand: new THREE.SphereGeometry(0.095, 14, 12),
  glove: new THREE.SphereGeometry(0.145, 16, 12),
  lap: new THREE.SphereGeometry(1, 24, 16),
  leg: new THREE.CylinderGeometry(0.105, 0.095, 0.38, 12),
  ear: new THREE.SphereGeometry(0.085, 10, 8),
  eye: new THREE.SphereGeometry(0.02, 8, 6),
  skirt: new THREE.LatheGeometry(SKIRT_PROFILE, 32),
  foot: new THREE.SphereGeometry(0.085, 12, 8),
  spike: new THREE.ConeGeometry(0.15, 0.42, 7),
  cloudPuff: new THREE.SphereGeometry(0.16, 14, 12),
  orb: new THREE.SphereGeometry(0.075, 14, 12),
};

const mats = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.65, ...opts }));
  return mats.get(key);
}

export function beadMaterial(b) {
  const base = new THREE.Color(b?.c1 || '#d97706');
  return new THREE.MeshPhysicalMaterial({ color: base, roughness: 0.25, metalness: b?.metal || 0.2, clearcoat: 1 });
}

const FACE_TEX_CACHE = new Map();
function makeHeroFaceTex(heroId) {
  if (FACE_TEX_CACHE.has(heroId)) return FACE_TEX_CACHE.get(heroId);
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const g = c.getContext('2d');
  const hero = HERO_MAP[heroId] || HERO_LIST[0];

  // Nền da mặt mịn màng
  g.clearRect(0, 0, 512, 512);

  // Vẽ lông mày, mắt, sẹo, râu và biểu cảm từng nhân vật đúng theo ảnh characters-naruto-onpine.jpg
  const drawAnimeEye = (cx, cy, irisColor, type = 'normal', isLeft = true) => {
    g.save();
    g.translate(cx, cy);
    if (type === 'wink') {
      // Mắt nhắm có vết sẹo dọc (Zoro mắt trái)
      g.strokeStyle = '#3b2314'; g.lineWidth = 8; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-36, 4); g.quadraticCurveTo(0, 14, 36, 2); g.stroke();
      g.strokeStyle = '#7c2d12'; g.lineWidth = 5;
      g.beginPath(); g.moveTo(4, -54); g.lineTo(-6, 52); g.stroke();
      g.restore();
      return;
    }
    // Khung tròng trắng mắt anime lớn
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(0, 0, 42, 34, 0, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 7; g.strokeStyle = '#1e140e';
    g.stroke();

    // Tròng mắt theo hệ (Gear 5, Sharingan, Rinnegan, Sage, chuẩn)
    if (type === 'rinnegan') {
      g.fillStyle = '#a855f7';
      g.beginPath(); g.ellipse(0, 0, 38, 30, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#3b0764'; g.lineWidth = 3;
      for (const r of [10, 20, 30]) { g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); }
      g.fillStyle = '#1e1b4b'; g.beginPath(); g.arc(0, 0, 5, 0, Math.PI * 2); g.fill();
    } else if (type === 'sharingan') {
      g.fillStyle = '#dc2626';
      g.beginPath(); g.arc(0, 0, 27, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#450a0a'; g.lineWidth = 3;
      g.beginPath(); g.arc(0, 0, 16, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#09090b'; g.beginPath(); g.arc(0, 0, 7, 0, Math.PI * 2); g.fill();
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2;
        g.beginPath(); g.arc(Math.cos(a) * 16, Math.sin(a) * 16, 4.5, 0, Math.PI * 2); g.fill();
      }
    } else if (type === 'nika') {
      g.fillStyle = '#ef4444';
      g.beginPath(); g.arc(0, 0, 26, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#7f1d1d'; g.lineWidth = 4;
      g.beginPath(); g.arc(0, 0, 17, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#111827'; g.beginPath(); g.arc(0, 0, 8, 0, Math.PI * 2); g.fill();
    } else if (type === 'sage') {
      // Mắt Lục Đạo vàng cam chữ thập
      g.fillStyle = '#f59e0b';
      g.beginPath(); g.arc(0, 0, 27, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#1c1917';
      g.fillRect(-3, -22, 6, 44);
      g.fillRect(-18, -4, 36, 8);
    } else {
      const gr = g.createRadialGradient(0, -6, 4, 0, 0, 28);
      gr.addColorStop(0, irisColor);
      gr.addColorStop(1, '#111827');
      g.fillStyle = gr;
      g.beginPath(); g.arc(0, 0, 26, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#09090b';
      g.beginPath(); g.arc(0, 0, 11, 0, Math.PI * 2); g.fill();
    }

    // Đốm sáng mắt anime long lanh
    g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(-10, -10, 8, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(9, 8, 4, 0, Math.PI * 2); g.fill();

    // Mi mắt trên dày sắc nét
    g.strokeStyle = '#111827'; g.lineWidth = 10; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-44, -8); g.quadraticCurveTo(0, -38, 44, -8); g.stroke();
    g.restore();
  };

  // Lông mày
  const drawBrow = (cx, cy, color = '#1e1b18', angle = 0.12, curly = false) => {
    g.save();
    g.translate(cx, cy);
    g.rotate(angle);
    g.strokeStyle = color; g.lineWidth = 10; g.lineCap = 'round';
    g.beginPath();
    g.moveTo(-38, 0);
    g.quadraticCurveTo(0, -10, 38, 0);
    if (curly) g.arc(28, -12, 12, Math.PI * 0.5, Math.PI * 2.3);
    g.stroke();
    g.restore();
  };

  const L_X = 166, R_X = 346, EYE_Y = 235;

  if (hero.id === 'luffy_g5') {
    drawAnimeEye(L_X, EYE_Y, '#ef4444', 'nika', true);
    drawAnimeEye(R_X, EYE_Y, '#ef4444', 'nika', false);
    drawBrow(L_X, 178, '#f8fafc', 0.05, true);
    drawBrow(R_X, 178, '#f8fafc', -0.05, true);
    // Sẹo dưới mắt trái của Luffy
    g.strokeStyle = '#7c2d12'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(L_X - 24, EYE_Y + 46); g.quadraticCurveTo(L_X, EYE_Y + 54, L_X + 22, EYE_Y + 46); g.stroke();
    g.beginPath(); g.moveTo(L_X - 10, EYE_Y + 42); g.lineTo(L_X - 12, EYE_Y + 56); g.moveTo(L_X + 8, EYE_Y + 42); g.lineTo(L_X + 10, EYE_Y + 56); g.stroke();
    // Nụ cười rộng rạng rỡ của Thần Nika
    g.fillStyle = '#ffffff'; g.strokeStyle = '#1e1b18'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(175, 325); g.quadraticCurveTo(256, 340, 337, 325); g.quadraticCurveTo(256, 405, 175, 325); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(190, 352); g.quadraticCurveTo(256, 362, 322, 352); g.stroke();
  } else if (hero.id === 'naruto_sage') {
    // Quầng mắt cam Tiên Nhân
    g.fillStyle = 'rgba(234,88,12,0.45)';
    g.beginPath(); g.ellipse(L_X, EYE_Y, 50, 38, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(R_X, EYE_Y, 50, 38, 0, 0, Math.PI * 2); g.fill();
    drawAnimeEye(L_X, EYE_Y, '#f59e0b', 'sage');
    drawAnimeEye(R_X, EYE_Y, '#f59e0b', 'sage');
    drawBrow(L_X, 182, '#d97706', 0.16);
    drawBrow(R_X, 182, '#d97706', -0.16);
    // 6 vết râu mèo Cửu Vĩ
    g.strokeStyle = '#451a03'; g.lineWidth = 5; g.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const y = 290 + i * 20;
      g.beginPath(); g.moveTo(88, y - 4); g.lineTo(148, y); g.stroke();
      g.beginPath(); g.moveTo(364, y); g.lineTo(424, y - 4); g.stroke();
    }
    // Miệng mỉm cười tự tin
    g.strokeStyle = '#451a03'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(212, 345); g.quadraticCurveTo(256, 368, 304, 342); g.stroke();
  } else if (hero.id === 'zoro') {
    drawAnimeEye(L_X, EYE_Y, '#1e293b', 'normal');
    drawAnimeEye(R_X, EYE_Y, '#1e293b', 'wink'); // Mắt trái nhắm có sẹo
    drawBrow(L_X, 180, '#15803d', 0.22);
    drawBrow(R_X, 180, '#15803d', -0.22);
    g.strokeStyle = '#3b2314'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(215, 348); g.quadraticCurveTo(256, 342, 302, 334); g.stroke();
  } else if (hero.id === 'sasuke') {
    drawAnimeEye(L_X, EYE_Y, '#dc2626', 'sharingan');
    drawAnimeEye(R_X, EYE_Y, '#a855f7', 'rinnegan');
    drawBrow(L_X, 180, '#0f172a', 0.22);
    drawBrow(R_X, 180, '#0f172a', -0.22);
    g.strokeStyle = '#3b2314'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(222, 350); g.lineTo(290, 346); g.stroke();
  } else if (hero.id === 'sanji') {
    drawAnimeEye(L_X, EYE_Y, '#1d4ed8', 'normal');
    drawAnimeEye(R_X, EYE_Y, '#1d4ed8', 'normal');
    drawBrow(L_X, 178, '#ca8a04', 0.1, true);
    drawBrow(R_X, 178, '#ca8a04', -0.1, true);
    // Râu dê Sanji & nụ cười lịch lãm
    g.strokeStyle = '#451a03'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(210, 340); g.quadraticCurveTo(256, 362, 304, 336); g.stroke();
    g.fillStyle = '#ca8a04';
    g.beginPath(); g.moveTo(242, 382); g.lineTo(270, 382); g.lineTo(256, 412); g.closePath(); g.fill();
  } else if (hero.id === 'kakashi') {
    drawAnimeEye(L_X, EYE_Y, '#1e293b', 'normal');
    drawAnimeEye(R_X, EYE_Y, '#dc2626', 'wink');
    drawBrow(L_X, 182, '#cbd5e1', 0.05);
    // Khẩu trang ninja che nửa dưới khuôn mặt
    g.fillStyle = '#1e293b';
    g.beginPath(); g.moveTo(60, 275); g.quadraticCurveTo(256, 250, 452, 275); g.lineTo(452, 490); g.lineTo(60, 490); g.closePath(); g.fill();
    g.strokeStyle = '#334155'; g.lineWidth = 5; g.stroke();
  } else if (hero.id === 'law') {
    // Quầng mắt đặc trưng của Bác sĩ Law
    g.fillStyle = 'rgba(30,41,59,0.28)';
    g.beginPath(); g.ellipse(L_X, EYE_Y + 6, 46, 36, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(R_X, EYE_Y + 6, 46, 36, 0, 0, Math.PI * 2); g.fill();
    drawAnimeEye(L_X, EYE_Y, '#eab308', 'normal');
    drawAnimeEye(R_X, EYE_Y, '#eab308', 'normal');
    drawBrow(L_X, 182, '#0f172a', 0.16);
    drawBrow(R_X, 182, '#0f172a', -0.16);
    g.strokeStyle = '#1e1b18'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(216, 344); g.quadraticCurveTo(256, 354, 300, 336); g.stroke();
    // Râu cằm Law
    g.fillStyle = '#0f172a';
    g.fillRect(236, 385, 40, 18);
  } else if (hero.id === 'itachi') {
    drawAnimeEye(L_X, EYE_Y, '#dc2626', 'sharingan');
    drawAnimeEye(R_X, EYE_Y, '#dc2626', 'sharingan');
    drawBrow(L_X, 182, '#0f172a', 0.14);
    drawBrow(R_X, 182, '#0f172a', -0.14);
    // Hai đường nếp đặc trưng dưới mắt Itachi
    g.strokeStyle = '#451a03'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(L_X + 26, EYE_Y + 28); g.lineTo(L_X + 42, EYE_Y + 75); g.stroke();
    g.beginPath(); g.moveTo(R_X - 26, EYE_Y + 28); g.lineTo(R_X - 42, EYE_Y + 75); g.stroke();
    g.lineWidth = 5;
    g.beginPath(); g.moveTo(224, 352); g.lineTo(288, 352); g.stroke();
  } else if (hero.id === 'ace') {
    drawAnimeEye(L_X, EYE_Y, '#1e293b', 'normal');
    drawAnimeEye(R_X, EYE_Y, '#1e293b', 'normal');
    drawBrow(L_X, 180, '#0f172a', 0.18);
    drawBrow(R_X, 180, '#0f172a', -0.18);
    // Tàn nhang trên má Ace & nụ cười rạng rỡ
    g.fillStyle = '#7c2d12';
    for (const [dx, dy] of [[-12, 0], [0, 6], [12, -2], [-6, 12], [8, 10]]) {
      g.beginPath(); g.arc(L_X - 18 + dx, EYE_Y + 46 + dy, 3, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(R_X + 18 + dx, EYE_Y + 46 + dy, 3, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = '#ffffff'; g.strokeStyle = '#1e1b18'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(192, 334); g.quadraticCurveTo(256, 344, 320, 334); g.quadraticCurveTo(256, 386, 192, 334); g.fill(); g.stroke();
  } else if (hero.id === 'shanks') {
    drawAnimeEye(L_X, EYE_Y, '#1e293b', 'normal');
    drawAnimeEye(R_X, EYE_Y, '#1e293b', 'normal');
    drawBrow(L_X, 180, '#7f1d1d', 0.18);
    drawBrow(R_X, 180, '#7f1d1d', -0.18);
    // 3 vết sẹo dài qua mắt trái của Shanks
    g.strokeStyle = '#991b1b'; g.lineWidth = 4.5;
    for (const dx of [-12, 0, 12]) {
      g.beginPath(); g.moveTo(L_X + dx + 8, EYE_Y - 58); g.lineTo(L_X + dx - 10, EYE_Y + 58); g.stroke();
    }
    // Râu lún phún quanh cằm
    g.strokeStyle = '#451a03'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(212, 344); g.quadraticCurveTo(256, 356, 300, 340); g.stroke();
  } else if (hero.id === 'minato') {
    drawAnimeEye(L_X, EYE_Y, '#0284c7', 'normal');
    drawAnimeEye(R_X, EYE_Y, '#0284c7', 'normal');
    drawBrow(L_X, 182, '#ca8a04', 0.1);
    drawBrow(R_X, 182, '#ca8a04', -0.1);
    g.strokeStyle = '#451a03'; g.lineWidth = 5.5;
    g.beginPath(); g.moveTo(214, 344); g.quadraticCurveTo(256, 366, 298, 344); g.stroke();
  } else if (hero.id === 'kaido') {
    drawAnimeEye(L_X, EYE_Y, '#dc2626', 'normal');
    drawAnimeEye(R_X, EYE_Y, '#dc2626', 'normal');
    drawBrow(L_X, 174, '#09090b', 0.32);
    drawBrow(R_X, 174, '#09090b', -0.32);
    // Râu rồng & miệng gầm dữ dội của Kaido
    g.fillStyle = '#ffffff'; g.strokeStyle = '#09090b'; g.lineWidth = 6;
    g.beginPath(); g.roundRect(190, 332, 132, 42, 12); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(190, 353); g.lineTo(322, 353); g.stroke();
    g.strokeStyle = '#09090b'; g.lineWidth = 10; g.lineCap = 'round';
    g.beginPath(); g.moveTo(190, 330); g.quadraticCurveTo(120, 350, 95, 425); g.stroke();
    g.beginPath(); g.moveTo(322, 330); g.quadraticCurveTo(392, 350, 417, 425); g.stroke();
  }

  // Mũi 3D shading nhẹ ở giữa
  g.fillStyle = 'rgba(120,53,15,0.22)';
  g.beginPath(); g.moveTo(256, 268); g.lineTo(246, 296); g.lineTo(264, 296); g.closePath(); g.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  FACE_TEX_CACHE.set(heroId, tex);
  return tex;
}

function m(geo, material, x = 0, y = 0, z = 0, o = {}) {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  if (o.scale) mesh.scale.set(...o.scale);
  if (o.rot) mesh.rotation.set(...o.rot);
  mesh.castShadow = o.cast ?? true;
  return mesh;
}

// Vẽ tóc, mũ, băng trán, sừng 3D đặc trưng cho từng nhân vật
function buildHeroHead3D(head, hero) {
  const id = hero.id;

  // Băng trán Ninja Làng Lá 3D (Naruto, Kakashi, Itachi, Minato)
  const addHeadband = (bandColor = '#1e293b', plateColor = '#cbd5e1', slanted = false, crossed = false) => {
    const hb = new THREE.Group();
    hb.add(m(new THREE.CylinderGeometry(0.468, 0.468, 0.14, 32, 1, true), mat(bandColor, { roughness: 0.5, side: THREE.DoubleSide }), 0, 0.16, 0));
    const plate = m(new THREE.BoxGeometry(0.34, 0.11, 0.04), mat(plateColor, { metalness: 0.85, roughness: 0.25 }), 0, 0.16, -0.46);
    if (crossed) {
      plate.add(m(new THREE.BoxGeometry(0.30, 0.018, 0.05), mat('#09090b'), 0, 0, 0.01));
    }
    hb.add(plate);
    if (slanted) hb.rotation.z = -0.24;
    head.add(hb);
  };

  if (id === 'luffy_g5') {
    // Tóc mây trắng xoăn bồng bềnh 3D + Mũ rơm đeo lưng
    const cloudM = mat('#f8fafc', { emissive: '#e2e8f0', emissiveIntensity: 0.25, roughness: 0.35 });
    head.add(m(new THREE.SphereGeometry(0.47, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.55), cloudM, 0, 0.04, 0.02));
    const puffs = [
      [0, 0.48, -0.12, 1.3], [-0.26, 0.42, -0.08, 1.15], [0.26, 0.42, -0.08, 1.15],
      [-0.42, 0.24, 0.05, 1.05], [0.42, 0.24, 0.05, 1.05], [0, 0.56, 0.08, 1.25],
      [-0.2, 0.36, 0.32, 1.1], [0.2, 0.36, 0.32, 1.1], [0, 0.18, 0.42, 1.1],
    ];
    for (const [px, py, pz, sc] of puffs) {
      head.add(m(G.cloudPuff, cloudM, px, py, pz, { scale: [sc, sc, sc] }));
    }
    // Ngọn mây uốn cong trên đỉnh
    head.add(m(G.spike, cloudM, 0.05, 0.66, -0.1, { rot: [-0.3, 0, -0.25], scale: [1.1, 1.1, 1.1] }));
  } else if (id === 'naruto_sage') {
    // Tóc vàng phát sáng Lục Đạo với 2 sừng Chakra + Băng trán vàng
    const hairM = mat('#facc15', { emissive: '#f59e0b', emissiveIntensity: 0.45, roughness: 0.3 });
    head.add(m(new THREE.SphereGeometry(0.47, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM, 0, 0.03, 0.02));
    addHeadband('#f59e0b', '#fef08a');
    // Hai sừng tóc Kurama Lục Đạo
    for (const s of [-1, 1]) {
      head.add(m(G.spike, hairM, s * 0.26, 0.54, -0.08, { rot: [-0.15, 0, -s * 0.35], scale: [1.15, 1.35, 1.1] }));
      head.add(m(G.spike, hairM, s * 0.40, 0.36, 0.06, { rot: [0.1, 0, -s * 0.75], scale: [0.95, 1.05, 0.95] }));
      head.add(m(G.spike, hairM, s * 0.16, 0.14, -0.42, { rot: [2.4, 0, s * 0.2], scale: [0.45, 0.65, 0.45] }));
    }
    head.add(m(G.spike, hairM, 0, 0.55, 0.12, { rot: [0.25, 0, 0], scale: [1.1, 1.1, 1.1] }));
  } else if (id === 'zoro') {
    // Tóc xanh rêu gai nhọn + 3 khuyên tai vàng bên trái
    const hairM = mat('#22c55e', { roughness: 0.55 });
    head.add(m(new THREE.SphereGeometry(0.47, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM, 0, 0.04, 0.02));
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      head.add(m(G.spike, hairM, Math.sin(a) * 0.28, 0.44, Math.cos(a) * 0.24, { rot: [Math.cos(a) * 0.45, 0, -Math.sin(a) * 0.45], scale: [0.9, 0.85, 0.9] }));
    }
    // 3 khuyên tai vàng Haramaki bên tai trái (+x)
    const goldM = mat('#facc15', { metalness: 0.85, roughness: 0.2 });
    for (let k = 0; k < 3; k++) {
      head.add(m(new THREE.CylinderGeometry(0.015, 0.015, 0.09, 8), goldM, 0.44 + k * 0.022, -0.11, -0.02));
    }
  } else if (id === 'sasuke') {
    // Tóc đen ánh xanh gai xòe hai bên và ôm má
    const hairM = mat('#0f172a', { roughness: 0.45 });
    head.add(m(new THREE.SphereGeometry(0.475, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.58), hairM, 0, 0.03, 0.03));
    for (const s of [-1, 1]) {
      head.add(m(G.spike, hairM, s * 0.36, 0.08, -0.26, { rot: [2.5, 0, -s * 0.25], scale: [0.85, 1.35, 0.65] }));
      head.add(m(G.spike, hairM, s * 0.44, 0.32, 0.14, { rot: [0.3, 0, -s * 0.95], scale: [1.1, 1.3, 1.0] }));
      head.add(m(G.spike, hairM, s * 0.38, 0.12, 0.26, { rot: [0.6, 0, -s * 1.1], scale: [1.0, 1.2, 0.9] }));
    }
    head.add(m(G.spike, hairM, 0, 0.18, -0.43, { rot: [2.7, 0, 0], scale: [0.55, 0.95, 0.45] }));
  } else if (id === 'sanji') {
    // Tóc vàng rẽ ngôi che một bên mắt
    const hairM = mat('#facc15', { roughness: 0.45 });
    head.add(m(new THREE.SphereGeometry(0.478, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.56), hairM, 0, 0.04, 0.01));
    // Mái tóc vàng che bên mắt trái (-x)
    head.add(m(G.spike, hairM, -0.18, 0.12, -0.39, { rot: [2.85, 0, 0.22], scale: [1.45, 1.45, 0.55] }));
    head.add(m(G.spike, hairM, 0.28, 0.18, -0.34, { rot: [2.75, 0, -0.35], scale: [0.95, 1.15, 0.5] }));
  } else if (id === 'kakashi') {
    // Tóc bạch kim dựng nghiêng + băng trán che mắt trái
    const hairM = mat('#e2e8f0', { roughness: 0.45 });
    head.add(m(new THREE.SphereGeometry(0.47, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM, 0, 0.04, 0.02));
    addHeadband('#1e293b', '#cbd5e1', true);
    for (let i = 0; i < 6; i++) {
      head.add(m(G.spike, hairM, -0.08 + i * 0.07, 0.52 - i * 0.03, -0.05 + (i % 2) * 0.12, { rot: [-0.2, 0, 0.48], scale: [1.1, 1.35, 1.0] }));
    }
  } else if (id === 'law') {
    // Mũ lông vòm trắng chấm đen đặc trưng của Trafalgar Law
    const hatTex = (() => {
      if (typeof document === 'undefined') return null;
      const c = document.createElement('canvas'); c.width = 256; c.height = 256;
      const g = c.getContext('2d');
      g.fillStyle = '#f8fafc'; g.fillRect(0, 0, 256, 256);
      g.fillStyle = '#1e1b18';
      for (const [x, y, r] of [[45, 180, 18], [110, 170, 22], [180, 185, 19], [230, 175, 16], [75, 130, 15], [150, 125, 17], [210, 135, 14]]) {
        g.beginPath(); g.ellipse(x, y, r * 1.2, r * 0.85, 0.2, 0, Math.PI * 2); g.fill();
      }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    const hatM = new THREE.MeshStandardMaterial({ map: hatTex, roughness: 0.8 });
    head.add(m(new THREE.SphereGeometry(0.50, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.54), hatM, 0, 0.08, -0.01));
    head.add(m(new THREE.TorusGeometry(0.46, 0.065, 12, 32), hatM, 0, 0.10, -0.01, { rot: [Math.PI / 2 - 0.08, 0, 0] }));
  } else if (id === 'itachi') {
    // Tóc đen dài hai bên má + băng trán gạch ngang
    const hairM = mat('#09090b', { roughness: 0.45 });
    head.add(m(new THREE.SphereGeometry(0.475, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.56), hairM, 0, 0.04, 0.02));
    addHeadband('#1e293b', '#cbd5e1', false, true);
    for (const s of [-1, 1]) {
      head.add(m(new THREE.CapsuleGeometry(0.085, 0.42, 6, 10), hairM, s * 0.38, -0.08, -0.22, { rot: [0.1, 0, s * 0.12] }));
    }
  } else if (id === 'ace') {
    // Tóc đen xoăn + Mũ cao bồi cam gắn 2 huy hiệu xanh & dây hạt đỏ
    const hairM = mat('#18181b', { roughness: 0.5 });
    head.add(m(new THREE.SphereGeometry(0.47, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM, 0, 0.03, 0.02));
    const hatM = mat('#ea580c', { roughness: 0.6 });
    const brim = m(new THREE.CylinderGeometry(0.74, 0.74, 0.045, 32), hatM, 0, 0.24, 0);
    brim.scale.set(1.05, 1, 0.92);
    const crown = m(new THREE.CylinderGeometry(0.36, 0.44, 0.30, 24), hatM, 0, 0.38, 0);
    // Dây hạt đỏ + 2 huy hiệu mặt cười xanh trên mũ Ace
    const redBeadM = mat('#dc2626', { roughness: 0.3 });
    const blueBadgeM = mat('#38bdf8', { roughness: 0.3 });
    head.add(brim, crown);
    head.add(m(new THREE.TorusGeometry(0.42, 0.032, 10, 24), redBeadM, 0, 0.27, 0, { rot: [Math.PI / 2, 0, 0] }));
    for (const s of [-1, 1]) {
      head.add(m(new THREE.CylinderGeometry(0.085, 0.085, 0.03, 16), blueBadgeM, s * 0.14, 0.35, -0.41, { rot: [Math.PI / 2, 0, 0] }));
    }
  } else if (id === 'shanks') {
    // Tóc đỏ rực rẽ ngôi lãng tử
    const hairM = mat('#b91c1c', { roughness: 0.48 });
    head.add(m(new THREE.SphereGeometry(0.48, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.58), hairM, 0, 0.04, 0.01));
    for (const s of [-1, 1]) {
      head.add(m(G.spike, hairM, s * 0.34, 0.06, -0.28, { rot: [2.6, 0, -s * 0.22], scale: [0.85, 1.25, 0.55] }));
    }
  } else if (id === 'minato') {
    // Tóc vàng Tia Chớp Vàng với 2 lọn dài hai bên má + băng trán
    const hairM = mat('#fde047', { roughness: 0.4 });
    head.add(m(new THREE.SphereGeometry(0.475, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM, 0, 0.04, 0.02));
    addHeadband('#1e3a8a', '#cbd5e1');
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      head.add(m(G.spike, hairM, Math.sin(a) * 0.30, 0.46, Math.cos(a) * 0.26, { rot: [Math.cos(a) * 0.4, 0, -Math.sin(a) * 0.4], scale: [1.05, 1.15, 1.0] }));
    }
    for (const s of [-1, 1]) {
      head.add(m(G.spike, hairM, s * 0.38, -0.08, -0.25, { rot: [3.0, 0, s * 0.08], scale: [0.75, 1.45, 0.55] }));
    }
  } else if (id === 'kaido') {
    // Bờm tóc đen dữ dội + Cặp sừng trâu khổng lồ cong vút
    const hairM = mat('#18181b', { roughness: 0.65 });
    const hornM = mat('#d6d3d1', { roughness: 0.35, metalness: 0.15 });
    head.add(m(new THREE.SphereGeometry(0.50, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.65), hairM, 0, 0.05, 0.06));
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 1.4 - Math.PI * 0.7;
      head.add(m(G.spike, hairM, Math.sin(a) * 0.42, 0.25 + (i % 3) * 0.12, 0.18 + Math.cos(a) * 0.22, { rot: [0.6, 0, -Math.sin(a) * 0.8], scale: [1.2, 1.35, 1.2] }));
    }
    // Cặp sừng Kaido uốn cong 3D
    for (const s of [-1, 1]) {
      const pts = [
        new THREE.Vector3(s * 0.28, 0.28, -0.05),
        new THREE.Vector3(s * 0.62, 0.24, -0.08),
        new THREE.Vector3(s * 0.78, 0.46, -0.04),
        new THREE.Vector3(s * 0.72, 0.74, 0.02),
      ];
      const curve = new THREE.CatmullRomCurve3(pts);
      head.add(m(new THREE.TubeGeometry(curve, 20, 0.095, 12, false), hornM));
      head.add(m(new THREE.ConeGeometry(0.095, 0.22, 12), hornM, s * 0.70, 0.82, 0.03, { rot: [0, 0, s * 0.25] }));
    }
  }
}

// Trang bị vũ khí, áo choàng và hiệu ứng nguyên tố 3D trên cơ thể nhân vật
function buildHeroProps3D(upper, hands, legR, hero) {
  const id = hero.id;
  const vfxGroup = new THREE.Group();
  upper.add(vfxGroup);

  if (id === 'luffy_g5') {
    // Khăn mây trắng bay lơ lửng quanh vai + Mũ rơm đeo sau lưng
    const cloudM = mat('#ffffff', { emissive: '#e2e8f0', emissiveIntensity: 0.35, roughness: 0.3 });
    const scarf = m(new THREE.TorusGeometry(0.52, 0.075, 12, 32, Math.PI * 1.35), cloudM, 0, 0.62, 0.08, { rot: [0.35, 0, -0.35] });
    vfxGroup.add(scarf);
    // Mũ rơm đeo lưng
    const strawM = mat('#facc15', { roughness: 0.7 });
    const sh = new THREE.Group();
    sh.position.set(0, 0.48, 0.36); sh.rotation.x = 1.35;
    sh.add(m(new THREE.CylinderGeometry(0.38, 0.38, 0.03, 24), strawM));
    sh.add(m(new THREE.SphereGeometry(0.22, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), strawM, 0, 0.01, 0));
    sh.add(m(new THREE.CylinderGeometry(0.225, 0.225, 0.05, 20), mat('#dc2626'), 0, 0.04, 0));
    upper.add(sh);
  } else if (id === 'naruto_sage') {
    // 6 Cầu Hắc Đạo Ngọc (Truth-Seeking Orbs) bay lơ lửng thành vòng tròn sau lưng
    const orbM = mat('#09090b', { emissive: '#78350f', emissiveIntensity: 0.3, roughness: 0.15, metalness: 0.8 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 1.2 - Math.PI * 0.6;
      vfxGroup.add(m(G.orb, orbM, Math.sin(a) * 0.58, 0.55 + Math.cos(a) * 0.32, 0.32));
    }
  } else if (id === 'zoro') {
    // 3 Thanh Kiếm Katana (Tam Kiếm Phái) đeo bên hông phải
    const hilts = ['#f8fafc', '#dc2626', '#9333ea'];
    for (let k = 0; k < 3; k++) {
      const sw = new THREE.Group();
      sw.position.set(-0.38, 0.22 + k * 0.065, 0.05);
      sw.rotation.set(0.55 + k * 0.08, 0.15, 0.1);
      sw.add(m(new THREE.CylinderGeometry(0.022, 0.018, 0.78, 8), mat('#111827', { roughness: 0.3 }), 0, -0.1, 0.12, { rot: [Math.PI / 2, 0, 0] }));
      sw.add(m(new THREE.CylinderGeometry(0.055, 0.055, 0.018, 12), mat('#facc15', { metalness: 0.85 }), 0, 0.02, -0.26, { rot: [Math.PI / 2, 0, 0] }));
      sw.add(m(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 8), mat(hilts[k]), 0, 0.06, -0.38, { rot: [Math.PI / 2, 0, 0] }));
      upper.add(sw);
    }
  } else if (id === 'sasuke') {
    // Tuyệt chiêu Lôi Kiếm Chidori phóng sét xanh rực trên bàn tay trái
    const chidori = new THREE.Group();
    const boltM = new THREE.MeshBasicMaterial({ color: '#38bdf8' });
    const coreM = new THREE.MeshBasicMaterial({ color: '#e0f2fe', transparent: true, opacity: 0.88 });
    chidori.add(m(new THREE.SphereGeometry(0.14, 14, 12), coreM, 0, 0, 0, { cast: false }));
    for (let i = 0; i < 6; i++) {
      const bar = m(new THREE.ConeGeometry(0.03, 0.38, 5), boltM, 0, 0, 0, { rot: [i * 1.1, i * 0.8, i * 1.5], cast: false });
      chidori.add(bar);
    }
    hands[1].add(chidori);
    vfxGroup.userData.chidori = chidori;
  } else if (id === 'sanji') {
    // Ngọn lửa Hắc Cước Diable Jambe bốc cháy ở chân phải
    const fire = new THREE.Group();
    fire.position.set(0, -0.12, -0.04);
    fire.add(m(new THREE.ConeGeometry(0.15, 0.38, 10), new THREE.MeshBasicMaterial({ color: '#f97316', transparent: true, opacity: 0.85 }), 0, 0.08, 0, { cast: false }));
    fire.add(m(new THREE.ConeGeometry(0.10, 0.28, 10), new THREE.MeshBasicMaterial({ color: '#fef08a' }), 0, 0.06, 0, { cast: false }));
    legR.add(fire);
    vfxGroup.userData.fireLeg = fire;
  } else if (id === 'law') {
    // Thanh trường kiếm Kikoku vác chéo trên vai
    const kikoku = new THREE.Group();
    kikoku.position.set(0.18, 0.56, 0.24);
    kikoku.rotation.set(0.3, 0, -0.78);
    kikoku.add(m(new THREE.CylinderGeometry(0.025, 0.022, 1.35, 10), mat('#1e1b18'), 0, 0, 0));
    kikoku.add(m(new THREE.CylinderGeometry(0.028, 0.028, 0.36, 10), mat('#dc2626'), 0, 0.52, 0));
    kikoku.add(m(new THREE.SphereGeometry(0.065, 10, 8), mat('#f8fafc'), 0, 0.33, 0));
    upper.add(kikoku);
  } else if (id === 'itachi') {
    // Cổ áo choàng Akatsuki cao che cằm + họa tiết mây đỏ
    const colM = mat('#18181b', { roughness: 0.7, side: THREE.DoubleSide });
    upper.add(m(new THREE.CylinderGeometry(0.28, 0.24, 0.22, 24, 1, true), colM, 0, 0.68, 0));
    upper.add(m(new THREE.CylinderGeometry(0.27, 0.23, 0.21, 24, 1, true), mat('#991b1b', { side: THREE.BackSide }), 0, 0.68, 0));
  } else if (id === 'ace') {
    // Vòng cổ hạt đỏ + Hai nắm đấm rực lửa Hỏa Quyền (Mera Mera)
    upper.add(m(new THREE.TorusGeometry(0.24, 0.038, 10, 24), mat('#dc2626', { roughness: 0.3 }), 0, 0.62, -0.04, { rot: [Math.PI / 2 + 0.25, 0, 0] }));
    for (const h of hands) {
      const f = new THREE.Group();
      f.add(m(new THREE.SphereGeometry(0.14, 12, 10), new THREE.MeshBasicMaterial({ color: '#f97316', transparent: true, opacity: 0.82 }), 0, 0, 0, { cast: false }));
      f.add(m(new THREE.ConeGeometry(0.11, 0.26, 8), new THREE.MeshBasicMaterial({ color: '#fde047' }), 0, 0.1, 0, { cast: false }));
      h.add(f);
    }
  } else if (id === 'shanks') {
    // Áo choàng Tứ Hoàng đen + Thanh kiếm Tây dương Gryphon bên tay phải
    const cape = m(new THREE.CylinderGeometry(0.28, 0.52, 0.78, 20, 1, true, -Math.PI * 0.55, Math.PI * 1.1), mat('#0f172a', { side: THREE.DoubleSide }), 0, 0.32, 0.06);
    upper.add(cape);
    const sword = new THREE.Group();
    sword.add(m(new THREE.BoxGeometry(0.025, 0.06, 0.72), mat('#e2e8f0', { metalness: 0.9, roughness: 0.15 }), 0, -0.02, -0.38));
    sword.add(m(new THREE.TorusGeometry(0.08, 0.018, 8, 16, Math.PI), mat('#eab308', { metalness: 0.85 }), 0, 0, -0.02, { rot: [0, Math.PI / 2, 0] }));
    hands[0].add(sword);
  } else if (id === 'minato') {
    // Áo choàng Hokage Đệ Tứ trắng viền lửa đỏ + Kunai Phi Lôi Thần
    const cloak = m(new THREE.CylinderGeometry(0.27, 0.50, 0.76, 20, 1, true, -Math.PI * 0.6, Math.PI * 1.2), mat('#f8fafc', { side: THREE.DoubleSide }), 0, 0.32, 0.05);
    const flameHem = m(new THREE.CylinderGeometry(0.49, 0.51, 0.14, 20, 1, true, -Math.PI * 0.6, Math.PI * 1.2), mat('#dc2626', { side: THREE.DoubleSide }), 0, -0.01, 0.05);
    upper.add(cloak, flameHem);
  } else if (id === 'kaido') {
    // Áo choàng lông tím Bách Thú + Chùy gai sắt Hassaikai khổng lồ
    const furM = mat('#581c87', { roughness: 0.9 });
    for (let i = -3; i <= 3; i++) {
      upper.add(m(new THREE.SphereGeometry(0.18, 12, 10), furM, i * 0.13, 0.54 - Math.abs(i) * 0.04, 0.22, { scale: [1, 1.3, 1] }));
    }
    const club = new THREE.Group();
    const ironM = mat('#1e293b', { metalness: 0.75, roughness: 0.35 });
    club.add(m(new THREE.CylinderGeometry(0.04, 0.12, 0.88, 12), ironM, 0, 0.18, -0.18, { rot: [1.1, 0, 0] }));
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      club.add(m(new THREE.ConeGeometry(0.035, 0.11, 6), ironM, Math.cos(a) * 0.11, 0.32 + (k % 2) * 0.12, -0.32 + Math.sin(a) * 0.11, { rot: [0, 0, -a] }));
    }
    hands[0].add(club);
  }

  return vfxGroup;
}

// Vầng sáng dưới chân nhân vật
const auraGeo = new THREE.CircleGeometry(1.15, 40);
let auraTexCache = null;
function auraDisc(color) {
  if (!auraTexCache && typeof document !== 'undefined') {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(128, 128, 18, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255,255,255,.78)');
    grad.addColorStop(0.7, 'rgba(255,255,255,.25)');
    grad.addColorStop(0.88, 'rgba(255,255,255,.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
    auraTexCache = new THREE.CanvasTexture(c);
  }
  const disc = new THREE.Mesh(
    auraGeo,
    new THREE.MeshBasicMaterial({ color, map: auraTexCache, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.03;
  disc.renderOrder = 1;
  return disc;
}

let autoHeroIdx = 0;
function resolveHero(opts = {}) {
  const ap = opts.appearance || {};
  if (ap.hero && HERO_MAP[ap.hero]) return HERO_MAP[ap.hero];
  if (opts.hero && HERO_MAP[opts.hero]) return HERO_MAP[opts.hero];
  // Gán tự động đa dạng cả 12 tướng cho NPC / đạo hữu trong chùa
  const seedStr = `${ap.hair || ''}:${ap.skin || ''}:${opts.robe?.color || ''}`;
  if (seedStr !== '::') {
    let h = 0;
    for (let i = 0; i < seedStr.length; i++) h = (h * 31 + seedStr.charCodeAt(i)) >>> 0;
    return HERO_LIST[(h + (autoHeroIdx++)) % HERO_LIST.length];
  }
  return HERO_LIST[(autoHeroIdx++) % HERO_LIST.length];
}

let autoOutfitIdx = 0;
function resolveOutfit(opts = {}) {
  const ap = opts.appearance || {};
  if (ap.outfit && OUTFIT_MAP[ap.outfit]) return OUTFIT_MAP[ap.outfit];
  if (opts.outfit && OUTFIT_MAP[opts.outfit]) return OUTFIT_MAP[opts.outfit];
  if (opts.autoSansaOutfit) {
    const sansaIds = ['sansa_sage', 'sansa_lotus', 'sansa_celadon', 'sansa_kasa', 'hanbok_maru', 'default'];
    return OUTFIT_MAP[sansaIds[(autoOutfitIdx++) % sansaIds.length]] || OUTFIT_LIST[0];
  }
  return OUTFIT_LIST[0];
}

export function makeAvatar(opts = {}) {
  const hero = resolveHero(opts);
  const outfit = resolveOutfit(opts);
  const useOutfitColors = outfit && outfit.id !== 'default';
  const rColor = useOutfitColors && outfit.robeColor ? outfit.robeColor : hero.robeColor;
  const pColor = useOutfitColors && outfit.pantsColor ? outfit.pantsColor : hero.pantsColor;
  const sColor = useOutfitColors && outfit.sashColor ? outfit.sashColor : hero.sashColor;

  const skinM = mat(hero.skin, { roughness: 0.52 });
  const robeM = mat(rColor, {
    roughness: outfit?.sansaRobe ? 0.82 : (hero.id === 'naruto_sage' && !useOutfitColors ? 0.3 : 0.65),
    emissive: outfit?.djGear ? '#0284c7' : (hero.id === 'naruto_sage' && !useOutfitColors ? '#b45309' : '#000000'),
    emissiveIntensity: outfit?.djGear ? 0.32 : (hero.id === 'naruto_sage' && !useOutfitColors ? 0.35 : 0),
  });
  const pantsM = mat(pColor, { roughness: outfit?.sansaRobe ? 0.82 : 0.7 });
  const sashM = mat(sColor, { roughness: 0.5, metalness: outfit?.boxingGear ? 0.75 : 0.08 });

  const root = new THREE.Group();
  const upper = new THREE.Group();
  root.add(upper);

  // Thân áo 3D Chibi (riêng Ace, Kaido hoặc bộ Võ Phục Đấm Bốc lộ cơ ngực khỏe khoắn)
  const bareChest = !outfit?.sansaRobe && !outfit?.djGear && (outfit?.boxingGear || hero.id === 'ace' || hero.id === 'kaido');
  const torsoMat = bareChest ? skinM : robeM;
  upper.add(m(G.torso, torsoMat, 0, -0.05, 0, { scale: [1, 1, 0.88] }));
  // Đai thắt lưng / Sash đặc trưng
  upper.add(m(new THREE.CylinderGeometry(0.39, 0.41, 0.14, 28), sashM, 0, 0.14, 0));

  // Tay & Bàn tay + Tay áo rộng Hàn Quốc (dance-sleeves từ Sansa Temple ?room=maru) + Găng tay đấm bốc
  const arms = [], hands = [], boxingGloves = [], danceSleeves = [];
  const sleeveGeo = new THREE.ConeGeometry(0.24, 0.42, 18, 1, true);
  const sleeveMat = mat(rColor, { roughness: 0.82, side: THREE.DoubleSide });
  for (const s of [-1, 1]) {
    const a = m(G.arm, torsoMat, s * 0.30, 0.38, -0.12, { rot: [1.0, 0, s * 0.5] });
    if (outfit?.wideSleeves) {
      // Tay áo trường sam Hàn Quốc (One_continuous_soft_robe / dance-sleeves) rủ mềm quanh cánh tay
      const slv = m(sleeveGeo, sleeveMat, 0, -0.04, 0.04, { rot: [Math.PI, 0, 0], scale: [0.85, 1.0, 1.25] });
      a.add(slv);
      danceSleeves.push(slv);
    }
    const h = m(G.hand, skinM, s * 0.05, 0.5, -0.36);
    const glv = m(G.glove, mat('#ef4444', { roughness: 0.3, metalness: 0.15 }), 0, 0, -0.03, { scale: [1.1, 1.0, 1.25] });
    glv.visible = !!outfit?.boxingGear;
    h.add(glv);
    arms.push(a); hands.push(h); boxingGloves.push(glv);
    upper.add(a, h);
  }

  // Chi tiết 3D đặc trưng của Bộ Sưu Tập Trang Phục Sansa Temple (?room=maru) & Lễ Hội
  if (outfit?.sansaRobe) {
    // Cổ áo giao lĩnh chữ V Hàn Quốc (Beopbok / 승복) & Vạt xếp nếp prayerCloth
    const collarMat = mat('#f8fafc', { roughness: 0.75 });
    upper.add(m(new THREE.TorusGeometry(0.21, 0.035, 10, 24), collarMat, 0, 0.62, -0.02, { rot: [Math.PI / 2 + 0.22, 0, 0] }));
    const foldMat = mat(sColor, { roughness: 0.78 });
    upper.add(m(new THREE.BoxGeometry(0.22, 0.46, 0.04), foldMat, 0, 0.34, -0.33, { rot: [-0.12, 0, 0.18] }));
  }
  if (outfit?.malaColor) {
    // Chuỗi Tràng Hạt 108 Hạt gỗ Bồ Đề đeo cổ chuẩn Thiền viện Sansa
    const beadMat = mat(outfit.malaColor, { roughness: 0.45 });
    for (let b = 0; b < 16; b++) {
      const ang = (b / 16) * Math.PI * 2;
      upper.add(m(new THREE.SphereGeometry(0.032, 8, 8), beadMat, Math.sin(ang) * 0.25, 0.56 - Math.cos(ang) * 0.10, -0.05 - Math.cos(ang) * 0.24));
    }
  }
  if (outfit?.kasaColor) {
    // Y Hậu Cà Sa (Kasa / 가사) đỏ son viền vàng vắt chéo vai trái xuống hông phải
    const kasaMat = mat(outfit.kasaColor, { roughness: 0.6, side: THREE.DoubleSide });
    const kasaSash = m(new THREE.CylinderGeometry(0.37, 0.41, 0.44, 24, 1, true, -0.8, 3.6), kasaMat, 0, 0.36, 0, { rot: [0, 0, 0.34] });
    const goldRing = m(new THREE.TorusGeometry(0.065, 0.016, 10, 20), mat('#facc15', { metalness: 0.85, roughness: 0.2 }), -0.18, 0.48, -0.31);
    upper.add(kasaSash, goldRing);
  }
  if (outfit?.hanbokRibbon) {
    // Nơ áo Hanbok Goreum truyền thống Hàn Quốc trước ngực
    const ribMat = mat(outfit.hanbokRibbon, { roughness: 0.55 });
    upper.add(m(new THREE.TorusGeometry(0.075, 0.022, 8, 18), ribMat, 0.08, 0.48, -0.35, { rot: [0.2, 0.3, 0.5] }));
    upper.add(m(new THREE.BoxGeometry(0.055, 0.34, 0.02), ribMat, 0.06, 0.28, -0.37, { rot: [0, 0, -0.12] }));
    upper.add(m(new THREE.BoxGeometry(0.055, 0.28, 0.02), ribMat, 0.13, 0.30, -0.36, { rot: [0, 0, -0.26] }));
  }
  if (outfit?.boxingGear) {
    // Đai Vô Địch Đấm Bốc Hoàng Kim (Champion Belt) trước bụng
    const beltGold = mat('#facc15', { metalness: 0.88, roughness: 0.18 });
    upper.add(m(new THREE.CylinderGeometry(0.32, 0.32, 0.04, 20), beltGold, 0, 0.15, -0.36, { rot: [Math.PI / 2, 0, 0], scale: [1.2, 1, 0.75] }));
    upper.add(m(new THREE.SphereGeometry(0.055, 12, 10), mat('#dc2626', { metalness: 0.5, roughness: 0.2 }), 0, 0.15, -0.39));
  }
  if (outfit?.djGear) {
    // Viền cổ áo LED Neon phát sáng Cyber-Lotus
    const neonMat = new THREE.MeshBasicMaterial({ color: '#38bdf8' });
    const neonPink = new THREE.MeshBasicMaterial({ color: '#f43f5e' });
    upper.add(m(new THREE.TorusGeometry(0.25, 0.026, 10, 24), neonMat, 0, 0.62, 0, { rot: [Math.PI / 2 + 0.15, 0, 0], cast: false }));
    upper.add(m(new THREE.TorusGeometry(0.40, 0.018, 10, 28), neonPink, 0, 0.14, 0, { rot: [Math.PI / 2, 0, 0], cast: false }));
  }

  // Đầu Chibi lớn biểu cảm + Mặt Anime sắc nét + Tóc/Mũ/Sừng 3D
  const head = new THREE.Group();
  head.position.y = 0.98;
  head.add(m(G.head, skinM));
  const faceTex = makeHeroFaceTex(hero.id);
  if (faceTex) {
    const faceMesh = m(G.facePatch, new THREE.MeshStandardMaterial({ map: faceTex, transparent: true, roughness: 0.45, depthWrite: false }), 0, 0, 0, { cast: false });
    head.add(faceMesh);
  }
  for (const s of [-1, 1]) {
    head.add(m(G.ear, skinM, s * 0.44, -0.02, 0.02, { scale: [0.6, 1, 0.8] }));
  }
  // Hai node mắt ẩn để giữ tương thích hoàn toàn với code nhắm mắt khi thiền
  const eyes = [m(G.eye, skinM, -0.13, 0, -0.42), m(G.eye, skinM, 0.13, 0, -0.42)];
  eyes.forEach((e) => { e.visible = false; head.add(e); });

  buildHeroHead3D(head, hero);

  // Phụ kiện đầu theo Bộ Trang Phục (Kính Cyber Visor & Tai nghe DJ hoặc Băng trán Võ sĩ)
  if (outfit?.djGear) {
    const visorMat = new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.86 });
    head.add(m(new THREE.CylinderGeometry(0.475, 0.475, 0.13, 24, 1, true, -Math.PI * 0.34, Math.PI * 0.68), visorMat, 0, 0.03, 0, { rot: [0, Math.PI, 0], cast: false }));
    const hpBand = m(new THREE.TorusGeometry(0.49, 0.032, 10, 28, Math.PI), mat('#0f172a', { metalness: 0.8 }), 0, 0.04, 0);
    head.add(hpBand);
    for (const s of [-1, 1]) {
      head.add(m(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 16), mat('#1e293b', { metalness: 0.7 }), s * 0.48, 0.0, 0.02, { rot: [0, 0, Math.PI / 2] }));
      head.add(m(new THREE.TorusGeometry(0.10, 0.018, 8, 18), new THREE.MeshBasicMaterial({ color: '#f43f5e' }), s * 0.52, 0.0, 0.02, { rot: [0, Math.PI / 2, 0], cast: false }));
    }
  } else if (outfit?.boxingGear) {
    head.add(m(new THREE.CylinderGeometry(0.47, 0.47, 0.10, 28, 1, true), mat('#dc2626', { roughness: 0.5, side: THREE.DoubleSide }), 0, 0.18, 0));
  }

  upper.add(head);

  // Chân, Giày và Vạt áo (One_continuous_soft_robe)
  const lap = m(G.lap, outfit?.sansaRobe ? robeM : pantsM, 0, 0.12, -0.06, { scale: [0.52, 0.17, 0.42] });
  const legs = new THREE.Group();
  const legL = m(G.leg, pantsM, -0.14, 0.2, 0), legR = m(G.leg, pantsM, 0.14, 0.2, 0);
  const shoeM = mat(outfit?.sansaRobe ? '#f8fafc' : '#1e1b18', { roughness: 0.65 });
  for (const l of [legL, legR]) {
    l.add(m(G.foot, shoeM, 0, -0.19, -0.05, { scale: [0.95, 0.65, 1.4] }));
  }
  legs.add(legL, legR);
  const skirt = m(G.skirt, robeM, 0, 0, 0, { scale: outfit?.sansaRobe ? [1.02, 0.96, 0.96] : [0.95, 0.85, 0.85] });
  skirt.visible = !!outfit?.sansaRobe || ['itachi', 'zoro', 'naruto_sage', 'minato'].includes(hero.id);
  legs.add(skirt);
  root.add(lap, legs);

  // Đạo cụ 3D & Hiệu ứng nguyên tố
  const vfxGroup = buildHeroProps3D(upper, hands, legR, hero);

  // Quả cầu Tuyệt Chiêu 3D (hiện lên khi tung đòn đấm bốc / xả stress)
  const ultSphere = m(
    new THREE.SphereGeometry(0.28, 20, 16),
    new THREE.MeshBasicMaterial({ color: hero.skillColor, transparent: true, opacity: 0 }),
    0, 0.58, -0.68,
    { cast: false }
  );
  upper.add(ultSphere);

  if (hero.id === 'kaido') {
    root.scale.setScalar(1.12);
  }

  const av = {
    root, upper, head, lap, legs, legL, legR, skirt, arms, hands, eyes,
    boxingGloves, danceSleeves, vfxGroup, ultSphere, hero, outfit,
    groundY: opts.groundY || 0,
    pose: 'sit', bowing: false, bowT: 0, walk: 0, meditate: 0,
    dancing: false, danceStyle: 0, boxingMode: !!outfit?.boxingGear, ultTimer: 0,
    onBow: null, phase: Math.random() * 10,
  };
  av.aura = auraDisc(opts.robe?.aura || outfit?.swatch || hero.aura);
  root.add(av.aura);

  addGear(av, opts);
  setSeated(av, true);
  return av;
}

export function setSeated(av, on) {
  if (av.cloud) av.cloud.visible = !on;
  av.seated = on;
  if (on) av.dancing = false;
  av.lap.visible = on;
  av.legs.visible = !on;
  av.upper.position.y = on ? 0.3 : 0.4;
  av.baseY = (av.groundY || 0) + (on ? 0.17 : 0);
  av.root.position.y = av.baseY;
}

export function setDancing(av, on, style = 0) {
  if (on && av.seated) setSeated(av, false);
  av.dancing = on;
  av.danceStyle = style;
  if (!on) {
    av.upper.rotation.set(0, 0, 0);
    av.head.rotation.set(0, 0, 0);
  }
}

export function setBoxingGloves(av, on) {
  const show = on || !!av.outfit?.boxingGear;
  av.boxingMode = show;
  av.boxingGloves?.forEach((g) => (g.visible = show));
}

export function triggerUltimate(av) {
  startFight(av, 'hit');
  av.ultTimer = 0.85;
}

export const BOW_TIME = 2.6;
const ss = THREE.MathUtils.smoothstep;
const _sh = new THREE.Vector3(), _d = new THREE.Vector3(), _down = new THREE.Vector3(0, -1, 0);

const pulse = (t, a, b) => { const u = (t - a) / (b - a); return u <= 0 || u >= 1 ? 0 : Math.sin(u * Math.PI); };
const FIGHT_HIT = 0.72, FIGHT_HURT = 1.0;
export function startFight(av, kind) { av.fight = { kind, t: 0, dur: kind === 'hit' ? FIGHT_HIT : FIGHT_HURT }; }

function fightArms(av, t) {
  const pr = [pulse(t, 0.22, 0.48), pulse(t, 0, 0.26)]; // Liên hoàn đấm cực bốc
  av.hands.forEach((h, i) => {
    const s = i ? 1 : -1, x = pr[i];
    h.position.set(s * (0.22 - x * 0.14), 0.62 + x * 0.05, -0.28 - x * 0.72);
  });
  av.arms.forEach((a, i) => {
    const s = i ? 1 : -1, h = av.hands[i].position;
    _sh.set(s * 0.27, 0.58, -0.04);
    _d.subVectors(h, _sh); const len = _d.length();
    a.position.copy(_sh).addScaledVector(_d, 0.5);
    a.quaternion.setFromUnitVectors(_down, _d.normalize());
    a.scale.set(1, len / 0.44, 1);
  });
}

function fightBody(av, f) {
  const t = f.t;
  if (f.kind === 'hit') {
    const pu = pulse(t, 0, 0.26) + pulse(t, 0.22, 0.48), kick = pulse(t, 0.45, 0.72);
    av.upper.rotation.y = (pulse(t, 0, 0.26) - pulse(t, 0.22, 0.48)) * 0.55 + kick * 0.35;
    av.upper.rotation.x = -0.24 * pu + 0.32 * kick;
    av.upper.position.z = -0.14 * pu;
    av.legR.rotation.x = kick * 1.75;
    av.legL.rotation.x = -kick * 0.25;
    av.root.position.y = av.baseY + kick * 0.18;
  } else {
    const hurt = pulse(t, 0, f.dur);
    av.upper.rotation.x = 0.5 * hurt;
    av.upper.position.z = 0.14 * hurt;
    av.upper.rotation.y = Math.sin(t * 22) * 0.16 * hurt;
    av.head.rotation.z = Math.sin(t * 18) * 0.28 * hurt;
    av.legL.rotation.x = -0.3 * hurt; av.legR.rotation.x = -0.18 * hurt;
  }
}

export function animateAvatar(av, dt, time, moving = false) {
  av.gearTick?.(time, moving);
  if (av.aura) {
    av.aura.material.opacity = (av.dancing || av.ultTimer > 0) ? 0.78 : (0.38 + 0.16 * Math.sin(time * 1.8 + av.phase));
    av.aura.rotation.z = time * (av.dancing ? 1.5 : 0.25);
  }
  if (av.vfxGroup?.userData.chidori) {
    av.vfxGroup.userData.chidori.rotation.set(time * 16, time * 12, time * 9);
  }
  if (av.ultTimer > 0) {
    av.ultTimer = Math.max(0, av.ultTimer - dt);
    const k = av.ultTimer / 0.85;
    av.ultSphere.material.opacity = Math.sin(k * Math.PI) * 0.85;
    const sc = 0.5 + (1 - k) * 2.2;
    av.ultSphere.scale.setScalar(sc);
  } else if (av.ultSphere) {
    av.ultSphere.material.opacity = 0;
  }

  // Lạy Phật
  if (av.bowing || av.bowT > 0) {
    av.bowT += dt / (BOW_TIME * (av.bowSlow || 1));
    if (av.bowT >= 1) { av.bowT = av.bowing ? av.bowT - 1 : 0; av.onBow?.(); }
  }
  const f = av.fight;
  if (f) { f.t += dt; if (f.t >= f.dur) av.fight = null; }
  const p = av.bowT;
  const amt = p < 0.45 ? ss(p, 0, 0.45) : p < 0.6 ? 1 : 1 - ss(p, 0.6, 1);
  av.upper.rotation.x = -1.15 * amt;
  av.upper.position.z = -0.12 * amt;
  av.head.rotation.x = -0.3 * amt;

  // Thiền định
  const target = av.meditating ? 1 : 0;
  av.meditate += (target - av.meditate) * Math.min(1, dt * 4);
  const k = av.meditate;
  av.hands.forEach((h, i) => {
    const s = i ? 1 : -1;
    if (av.boxingMode && !av.seated && !av.bowing) {
      // Tư thế thủ võ đài đấm bốc
      const bob = Math.sin(time * 7 + i) * 0.04;
      h.position.set(s * 0.22, 0.64 + bob, -0.36);
    } else {
      h.position.set(s * (0.05 + k * 0.05), 0.5 - k * 0.32, -0.36 + k * 0.02);
    }
  });

  // Vũ điệu Xõa Stress trên Sàn DJ (tương tự #party-dance 108 BPM của Sansa Temple + Vũ điệu Thần Nika)
  if (av.dancing && !moving && !av.seated && !av.bowing) {
    const beat = time * 11.31 + av.phase; // 108 BPM * 2 * PI / 60 = 11.31 rad/s chuẩn Sansa Temple
    const bounce = Math.abs(Math.sin(beat));
    av.root.position.y = av.baseY + bounce * 0.22;
    av.upper.rotation.z = Math.sin(beat * 0.5) * 0.24;
    av.upper.rotation.y = Math.cos(beat * 0.5) * 0.35;
    av.head.rotation.z = -Math.sin(beat * 0.5) * 0.18;
    av.head.rotation.x = Math.sin(beat) * 0.15;
    av.legL.rotation.x = Math.sin(beat) * 0.55;
    av.legR.rotation.x = -Math.sin(beat) * 0.55;
    av.hands.forEach((h, i) => {
      const s = i ? 1 : -1;
      h.position.set(
        s * (0.36 + Math.sin(beat * 0.5 + s * 0.7) * 0.14),
        0.82 + Math.sin(beat + i * Math.PI) * 0.24,
        -0.22 + Math.cos(beat * 0.5) * 0.08
      );
    });
    if (av.danceSleeves?.length) {
      av.danceSleeves.forEach((slv, i) => {
        const s = i ? 1 : -1;
        slv.scale.set(1.18 + Math.sin(beat + i) * 0.18, 1.15, 1.55 + Math.cos(beat * 0.5) * 0.25);
        slv.rotation.z = s * Math.sin(beat * 0.5) * 0.32;
      });
    }
  } else if (av.danceSleeves?.length) {
    av.danceSleeves.forEach((slv) => {
      slv.scale.set(0.85, 1.0, 1.25);
      slv.rotation.z = 0;
    });
  }

  av.arms.forEach((a, i) => {
    const s = i ? 1 : -1, h = av.hands[i].position;
    _sh.set(s * 0.27, 0.58, -0.04);
    _d.subVectors(h, _sh); const len = _d.length();
    a.position.copy(_sh).addScaledVector(_d, 0.5);
    a.quaternion.setFromUnitVectors(_down, _d.normalize());
    a.scale.set(1, len / 0.44, 1);
  });
  if (av.fight?.kind === 'hit') fightArms(av, av.fight.t);
  if (k > 0.01) av.head.rotation.x = Math.min(av.head.rotation.x, -0.15 * k);

  // Bước đi
  if (moving) {
    av.walk += dt * 10;
    av.legL.rotation.x = Math.sin(av.walk) * 0.6;
    av.legR.rotation.x = -Math.sin(av.walk) * 0.6;
    av.root.position.y = av.baseY + Math.abs(Math.sin(av.walk)) * 0.06;
    av.skirt.rotation.z = Math.sin(av.walk) * 0.035;
  } else if (!av.dancing) {
    av.legL.rotation.x *= 0.8; av.legR.rotation.x *= 0.8; av.skirt.rotation.z *= 0.8;
    av.root.position.y = av.baseY;
  }
  if (av.fight) fightBody(av, av.fight);
  av.head.position.y = 0.98 + Math.sin(time * 1.8 + av.phase) * 0.009;
}

export function setGhost(av, on) {
  if (!!av.ghost === on) return;
  av.ghost = on;
  if (!on) av.ghostMats?.forEach((g) => g.dispose());
  av.ghostMats = on ? [] : null;
  av.root.traverse((o) => {
    if (!o.isMesh || o === av.aura) return;
    if (on) {
      const g = new THREE.MeshStandardMaterial({ color: 0x5f6f7f, emissive: 0x1c2a38, transparent: true, opacity: 0.62, depthWrite: false });
      o.userData.real = o.material; o.material = g; av.ghostMats.push(g);
    } else if (o.userData.real) { o.material = o.userData.real; delete o.userData.real; }
  });
}

export function disposeAvatar(av) {
  av.ghostMats?.forEach((g) => g.dispose());
  av.root.removeFromParent();
  if (av.pet) { av.pet.root.removeFromParent(); av.pet.dispose(); av.pet = null; }
  av.aura?.material.dispose();
  av.root.traverse((o) => { if (o.isSprite) { o.material.map?.dispose(); o.material.dispose(); } });
}

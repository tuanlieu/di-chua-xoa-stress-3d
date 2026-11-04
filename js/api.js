// Hybrid Self-Contained & Multiplayer Engine (Hỗ trợ cả Chế độ Tĩnh / Offline lẫn Server Multiplayer)
const THEME = window.__GAME_THEME__ || (location.pathname.includes('nha-tho') ? 'church' : 'temple');
const PREFIX = 'chuaxoa:';
const TKEY = `${PREFIX}token`;

export const token = {
  get: () => localStorage.getItem(TKEY) || '',
  set: (t) => localStorage.setItem(TKEY, t),
  clear: () => localStorage.removeItem(TKEY),
};

export const local = {
  get: (k, d = null) => {
    try { const v = localStorage.getItem(PREFIX + k); return v === null ? d : JSON.parse(v); } catch { return d; }
  },
  set: (k, v) => {
    try { v === null ? localStorage.removeItem(PREFIX + k) : localStorage.setItem(PREFIX + k, JSON.stringify(v)); } catch {}
  },
};

export function prepareProof() {}
export async function takeProof() { return { nonce: 'local', res: '0' }; }

let metaCache = null;
let contentCache = null;

async function ensureMeta() {
  if (!metaCache) {
    metaCache = (typeof window !== 'undefined' && window.__STATIC_META__)
      ? JSON.parse(JSON.stringify(window.__STATIC_META__))
      : await (await fetch('./data/meta.json')).json();
    metaCache.paymentMode = 'mock';
    metaCache.serverNow = Date.now();
    metaCache.chantAudio = null;
    // Mở khóa tất cả gói nạp Ngọc miễn phí / thử nghiệm và giảm cấp độ yêu cầu để trải nghiệm trọn vẹn
    if (metaCache.packages) {
      metaCache.packages = metaCache.packages.map((p) => ({ ...p, vnd: 0, tag: p.tag || 'Tặng miễn phí' }));
    }
  }
  return metaCache;
}

async function ensureContent() {
  if (!contentCache) {
    contentCache = (typeof window !== 'undefined' && window.__STATIC_CONTENT__)
      ? JSON.parse(JSON.stringify(window.__STATIC_CONTENT__))
      : await (await fetch('./data/content.json')).json();
  }
  return contentCache;
}

// Danh sách bạn đồng tu / giáo hữu AI sinh động trong chánh điện / thánh đường
const AI_PEERS = THEME === 'church' ? [
  { id: 1001, name: 'Maria Thanh Tâm', sect: 'tinhdo', level: 12, title: 'Ca viên Tâm Thành', honor: 'Ánh Sáng Tin Yêu', streak: 21, appearance: { gender: 'nu', hair: 'dai', skin: '#f3c6a8' }, equipped: { robe: 'ao_trang', beads: 'chuoi_ngoc', cushion: 'bo_doan_sen', hat: null, staff: null, cloud: null, pet: 'pet_hac' }, stats: { bows: 640, beads: 3200, rounds: 32, meditateMin: 180 } },
  { id: 1002, name: 'Giuse Minh Đức', sect: 'lamte', level: 15, title: 'Huynh trưởng Nhiệt Thành', honor: 'Hiệp Sĩ Hòa Bình', streak: 35, appearance: { gender: 'nam', hair: 'ngan', skin: '#e6b18a' }, equipped: { robe: 'ao_vang', beads: 'chuoi_ho_phach', cushion: 'bo_doan_do', hat: null, staff: null, cloud: null, pet: 'pet_nai' }, stats: { bows: 1120, beads: 5400, rounds: 50, meditateMin: 310 } },
  { id: 1003, name: 'Têrêsa Hồng Ân', sect: 'truclam', level: 9, title: 'Giáo hữu Hiền Hòa', honor: '', streak: 14, appearance: { gender: 'nu', hair: 'bui', skin: '#f3c6a8' }, equipped: { robe: 'ao_sen', beads: 'chuoi_pha_le', cushion: 'bo_doan_xanh', hat: null, staff: null, cloud: null, pet: 'pet_tho' }, stats: { bows: 410, beads: 2160, rounds: 20, meditateMin: 145 } },
  { id: 1004, name: 'Phanxicô Bảo Lộc', sect: 'taodong', level: 18, title: 'Tông đồ Bác Ái', honor: 'Trái Tim Nhân Hậu', streak: 49, appearance: { gender: 'nam', hair: 'ngan', skin: '#d98b5f' }, equipped: { robe: 'ao_gam', beads: 'chuoi_bo_de', cushion: 'bo_doan_sen', hat: null, staff: null, cloud: null, pet: 'pet_su_tu' }, stats: { bows: 1890, beads: 8640, rounds: 80, meditateMin: 520 } },
  { id: 1005, name: 'Anna Diệu Hiền', sect: 'tinhdo', level: 11, title: 'Ca viên Tâm Thành', honor: '', streak: 19, appearance: { gender: 'nu', hair: 'dai', skin: '#e6b18a' }, equipped: { robe: 'ao_lam', beads: 'chuoi_go', cushion: 'bo_doan_nau', hat: null, staff: null, cloud: null, pet: null }, stats: { bows: 530, beads: 2700, rounds: 25, meditateMin: 160 } },
  { id: 1006, name: 'Phêrô Quốc Khánh', sect: 'lamte', level: 7, title: 'Người Mới Tín Thác', honor: '', streak: 8, appearance: { gender: 'nam', hair: 'ngan', skin: '#c47548' }, equipped: { robe: 'ao_nau', beads: 'chuoi_go', cushion: 'bo_doan_nau', hat: null, staff: null, cloud: null, pet: null }, stats: { bows: 240, beads: 1080, rounds: 10, meditateMin: 75 } },
] : [
  { id: 1001, name: 'Naruto Lục Đạo (Minh Tâm)', sect: 'tinhdo', level: 18, title: 'Hokage Chánh Niệm', honor: 'Lục Đạo Hiền Nhân', streak: 21, appearance: { hero: 'naruto_sage', gender: 'nam', hair: 'ngan', skin: '#f5cba7' }, equipped: { robe: 'ao_sen', beads: 'chuoi_ngoc', cushion: 'bo_doan_sen', hat: null, staff: null, cloud: null, pet: 'pet_hac' }, stats: { bows: 640, beads: 3240, rounds: 30, meditateMin: 180 } },
  { id: 1002, name: 'Roronoa Zoro (Tam Kiếm Thiền)', sect: 'truclam', level: 16, title: 'Kiếm Hào Tĩnh Định', honor: 'Tam Kiếm Đoạn Phiền Não', streak: 35, appearance: { hero: 'zoro', gender: 'nam', hair: 'ngan', skin: '#f1c29b' }, equipped: { robe: 'ao_vang', beads: 'chuoi_bo_de', cushion: 'bo_doan_do', hat: null, staff: null, cloud: null, pet: 'pet_nai' }, stats: { bows: 1120, beads: 5400, rounds: 50, meditateMin: 310 } },
  { id: 1003, name: 'Sasuke Uchiha (Lôi Tâm)', sect: 'lamte', level: 17, title: 'Luân Hồi Giác Ngộ', honor: 'Chidori Tịnh Quang', streak: 14, appearance: { hero: 'sasuke', gender: 'nam', hair: 'ngan', skin: '#f8d5b8' }, equipped: { robe: 'ao_lam', beads: 'chuoi_pha_le', cushion: 'bo_doan_xanh', hat: null, staff: null, cloud: null, pet: 'pet_tho' }, stats: { bows: 410, beads: 2160, rounds: 20, meditateMin: 145 } },
  { id: 1004, name: 'Itachi Uchiha (Từ Bi Nhẫn)', sect: 'taodong', level: 22, title: 'Bồ Tát Trong Bóng Tối', honor: 'Hộ Pháp Tâm Thành', streak: 49, appearance: { hero: 'itachi', gender: 'nam', hair: 'dai', skin: '#f5d0b5' }, equipped: { robe: 'ao_gam', beads: 'chuoi_ho_phach', cushion: 'bo_doan_sen', hat: null, staff: null, cloud: null, pet: 'pet_su_tu' }, stats: { bows: 1890, beads: 8640, rounds: 80, meditateMin: 520 } },
  { id: 1005, name: 'Trafalgar Law (Bác Sĩ Tâm)', sect: 'tinhdo', level: 14, title: 'Phẫu Thuật Âu Lo', honor: 'ROOM Tịnh Tâm', streak: 19, appearance: { hero: 'law', gender: 'nam', hair: 'ngan', skin: '#f0c49e' }, equipped: { robe: 'ao_trang', beads: 'chuoi_go', cushion: 'bo_doan_nau', hat: null, staff: null, cloud: null, pet: null }, stats: { bows: 530, beads: 2700, rounds: 25, meditateMin: 160 } },
  { id: 1006, name: 'Minato Tia Chớp Vàng', sect: 'lamte', level: 19, title: 'Tia Chớp Giải Thoát', honor: '', streak: 12, appearance: { hero: 'minato', gender: 'nam', hair: 'ngan', skin: '#f7d2b4' }, equipped: { robe: 'ao_nau', beads: 'chuoi_go', cushion: 'bo_doan_nau', hat: null, staff: null, cloud: null, pet: null }, stats: { bows: 240, beads: 1080, rounds: 10, meditateMin: 75 } },
];

const GREET_PRESETS = THEME === 'church' ? [
  'Nguyện xin Chúa ban bình an cho bạn và gia đình ✝️',
  'Mẹ Maria luôn đồng hành và che chở bạn nhé 🌹',
  'Chúc bạn một ngày tràn đầy hồng ân và niềm vui 🕊️',
  'Cùng hiệp thông cầu nguyện trong tình yêu thương 🙏',
] : [
  'Chúc đạo hữu thân tâm thường an lạc 🙏',
  'Nguyện đem công đức này hồi hướng cho tất cả 🌸',
  'Tùy hỷ công đức tu tập tinh tấn của bạn 🪷',
  'Nam mô A Di Đà Phật, chúc gia đình vạn sự bình an ✨',
];

const DEFAULT_WISHES = THEME === 'church' ? [
  { id: 501, user_id: 1001, name: 'Maria Thanh Tâm', text: 'Xin Chúa ban bình an và sức khỏe cho cha mẹ con ✝️', likes: 18, created_at: Date.now() - 12 * 60e3 },
  { id: 502, user_id: 1002, name: 'Giuse Minh Đức', text: 'Nguyện xin Đức Mẹ nâng đỡ những người đang gặp khó khăn 🌹', likes: 24, created_at: Date.now() - 28 * 60e3 },
  { id: 503, user_id: 1003, name: 'Têrêsa Hồng Ân', text: 'Cầu cho thế giới hòa bình, mọi người biết yêu thương nhau 🕊️', likes: 15, created_at: Date.now() - 45 * 60e3 },
  { id: 504, user_id: 1004, name: 'Phanxicô Bảo Lộc', text: 'Tạ ơn Chúa vì muôn hồng ân Chúa đã ban cho gia đình con 🙏', likes: 31, created_at: Date.now() - 80 * 60e3 },
] : [
  { id: 501, user_id: 1001, name: 'Diệu Liên Hoa', text: 'Nguyện cho cha mẹ thân tâm an lạc, bách niên giai lão 🪷', likes: 18, created_at: Date.now() - 12 * 60e3 },
  { id: 502, user_id: 1002, name: 'Tâm Minh Đức', text: 'Cầu cho quốc thái dân an, mưa thuận gió hòa, chúng sinh an vui 🙏', likes: 24, created_at: Date.now() - 28 * 60e3 },
  { id: 503, user_id: 1003, name: 'Thanh Tịnh Tâm', text: 'Nguyện buông bỏ muộn phiền, giữ tâm sáng như trăng rằm ✨', likes: 15, created_at: Date.now() - 45 * 60e3 },
  { id: 504, user_id: 1004, name: 'Thiện Phúc An', text: 'Nam mô Quán Thế Âm Bồ Tát, cầu bình an cho mọi nhà 🌸', likes: 31, created_at: Date.now() - 80 * 60e3 },
];

const DEFAULT_QUE = THEME === 'church' ? [
  { rank: 'Hồng Ân Viên Mãn', name: 'Ánh Sáng Đức Tin', text: '“Chúa là mục tử chăn dắt tôi, tôi chẳng thiếu thốn gì.” (Tv 23,1)', advice: 'Hôm nay hãy trao gửi một lời nói dịu dàng và phó thác mọi âu lo trong tay Chúa.' },
  { rank: 'Bình An Thánh Đức', name: 'Hoa Hồng Mân Côi', text: '“Phúc thay ai kiến tạo hòa bình, vì họ sẽ được gọi là con Thiên Chúa.” (Mt 5,9)', advice: 'Hãy dành 5 phút tĩnh lặng cầu nguyện và tha thứ cho những điều nhỏ nhặt.' },
  { rank: 'Cậy Trông Vững Bền', name: 'Ngọn Đèn Trong Đêm', text: '“Lời Chúa là ngọn đèn soi cho con bước, là ánh sáng chỉ đường cho con đi.” (Tv 119,105)', advice: 'Kiên nhẫn trong công việc hôm nay, ơn lành sẽ đến từ sự trung tín của bạn.' },
  { rank: 'Bác Ái Yêu Thương', name: 'Khí Cụ Bình An', text: '“Đức mến thì nhẫn nhục, hiền hậu, không ghen tương, không tự phụ.” (1 Cr 13,4)', advice: 'Chia sẻ niềm vui hoặc giúp đỡ một người bạn đang cần lắng nghe hôm nay.' },
] : [
  { rank: 'Thượng Cát · Tâm An', name: 'Hoa Sen Nở Sớm', text: 'Trăng trong đáy nước lòng thanh tịnh, gió thoảng hương sen dạ nhẹ nhàng.', advice: 'Hôm nay thuận lợi khi giữ lời nói hòa ái, làm việc thiện nhỏ và giữ tâm bình thản.' },
  { rank: 'Đại Cát · Thuận Duyên', name: 'Mây Lành Hội Tụ', text: 'Gieo nhân lành ắt gặt quả ngọt, bước chân chánh niệm vạn sự hanh thông.', advice: 'Hãy mỉm cười với người xung quanh và dành vài phút tĩnh tâm lắng nghe hơi thở.' },
  { rank: 'Trung Cát · Tĩnh Định', name: 'Trúc Xanh Vững Chãi', text: 'Gió lay cành trúc không xao động, giữ vững sơ tâm vượt dặm dài.', advice: 'Việc gì chưa rõ hãy chậm lại một nhịp, thở sâu ba hơi trước khi quyết định.' },
  { rank: 'An Lành · Phước Báo', name: 'Suối Nguồn Từ Bi', text: 'Một niệm từ bi muôn oán giải, lòng biết ơn mở cửa phúc lành.', advice: 'Gửi lời hỏi thăm cha mẹ hoặc người thân để kết nối yêu thương hôm nay.' },
];

const LOC_BLESSINGS = THEME === 'church' ? [
  'Xin Thiên Chúa chúc lành và gìn giữ bạn trong bình an.',
  'Đức Mẹ Maria ban cho bạn đóa hồng ân sủng và niềm cậy trông.',
  'Tình yêu Chúa luôn sưởi ấm trái tim bạn mỗi ngày.',
  'Hãy vui mừng luôn mãi và cầu nguyện không ngừng.',
] : [
  'Tâm an thì cảnh an, mỗi bước chân là một đóa sen nở.',
  'Nguyện cho bạn thân khỏe tâm an, phước huệ song tu.',
  'Buông một chút phiền não, thêm một phần thảnh thơi.',
  'Một câu niệm Phật tiêu trừ muôn ngàn vọng tưởng.',
];

function getDB() {
  let db = local.get('db_v2');
  if (!db) {
    db = {
      user: null,
      account: { username: '', hasPassword: false },
      inventory: {
        huong_tram: 15,
        nen_sap: 10,
        hoa_dang: 10,
        den_hoa_dang: 8,
        hat_bo_de: 3,
        hat_sen_hong: 3,
      },
      visited: [],
      questsProgress: {},
      questsClaimed: {},
      lanterns: DEFAULT_WISHES.map((w) => ({ ...w, temple: 'nhattru', temple_name: THEME === 'church' ? 'Nhà Thờ Đức Bà Sài Gòn' : 'Chùa Một Cột' })),
      friends: [1001, 1002],
      incoming: [1003],
      outgoing: [],
      dms: {
        1001: [
          { id: 1, from: 1001, text: THEME === 'church' ? 'Chào bạn! Rất vui được cùng đi lễ và cầu nguyện tại Thánh đường hôm nay ✝️' : 'A Di Đà Phật! Hoan hỷ được cùng bạn hành hương lễ Phật hôm nay 🪷', at: Date.now() - 600e3 }
        ]
      },
      sangha: {
        id: 1,
        name: THEME === 'church' ? 'Ca Đoàn Ánh Sáng & Bình An' : 'Đạo Tràng Liên Hoa Tịnh Tâm',
        code: THEME === 'church' ? 'ANBINH' : 'SENBAO',
        max: 10,
        goal: 1000,
        total: 1250,
        claimed: false,
        isOwner: true,
        idleDays: 7,
        msgs: [
          { id: 1, from: 1001, name: AI_PEERS[0].name, text: THEME === 'church' ? 'Mến chào anh chị em trong hội đoàn! Cùng đọc kinh cầu bình an nhé 🙏' : 'Chào đại chúng! Chúc mọi người buổi tu tập thật an lạc 🙏', at: Date.now() - 1800e3 }
        ]
      },
      mails: [
        {
          id: 1,
          title: THEME === 'church' ? 'Quà Chào Mừng Giáo Hữu Mới ✝️' : 'Quà Chào Mừng Đạo Hữu Mới 🪷',
          body: THEME === 'church'
            ? 'Chào mừng bạn đến với Đi Nhà Thờ Online – Thánh Đường Bình An!\nChúng mình gửi tặng bạn gói Hồng Ân khởi đầu để bạn thoải mái thắp nến, dâng hoa, thỉnh chuỗi Mân Côi và chia sẻ cùng bạn bè.'
            : 'Chào mừng bạn đến với Đi Chùa Online – Tịnh Tâm Lạc Cảnh!\nChúng mình gửi tặng bạn gói Phước Lành khởi đầu để bạn thoải mái thắp hương, thả đèn hoa đăng, thỉnh pháp khí và chia sẻ cùng bạn bè.',
          sen: 500,
          ngoc: 200,
          personal: true,
          created_at: Date.now() - 300e3,
          read_at: null,
          claimed_at: null,
        }
      ],
      plants: [],
      fruit: 5,
      sala: { left: 5, daily: 5, me: 120, total: 120, robeAt: 1080 },
      stamps: {},
      visitedToday: [],
      journal: [{ day: new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10), exp: 120 }],
      wheelDay: '',
      queDay: '',
      queData: null,
      petsLeft: 10,
      petWins: 2,
      hermitOwned: false,
      legendAward: null,
    };
    local.set('db_v2', db);
  }
  return db;
}

function saveDB(db) {
  local.set('db_v2', db);
}

function computeLevel(exp, meta) {
  const levels = meta?.levels || [
    { level: 1, exp: 0, title: THEME === 'church' ? 'Tân Tòng Tín Thác' : 'Phật tử Sơ Tâm', sen: 20 },
    { level: 2, exp: 50, title: THEME === 'church' ? 'Giáo Hữu Chăm Ngoan' : 'Phật tử Tinh Tấn', sen: 30 },
    { level: 3, exp: 150, title: THEME === 'church' ? 'Ca Viên Tâm Thành' : 'Cư sĩ Thanh Tịnh', sen: 50 },
    { level: 4, exp: 320, title: THEME === 'church' ? 'Huynh Trưởng Nhiệt Thành' : 'Hành giả Chánh Niệm', sen: 80 },
    { level: 5, exp: 600, title: THEME === 'church' ? 'Tông Đồ Bác Ái' : 'Thiền sinh An Định', sen: 120 },
    { level: 6, exp: 1000, title: THEME === 'church' ? 'Chứng Nhân Tin Mừng' : 'Hộ Pháp Tâm Thành', sen: 180 },
    { level: 7, exp: 1600, title: THEME === 'church' ? 'Khí Cụ Bình An' : 'Bồ Tát Giữa Đời', sen: 250 },
  ];
  let cur = levels[0], next = null;
  for (let i = 0; i < levels.length; i++) {
    if (exp >= levels[i].exp) {
      cur = levels[i];
      next = levels[i + 1] || null;
    }
  }
  return { level: cur.level, title: cur.title, expNext: next ? next.exp : cur.exp + 1000 };
}

function buildQuests(db, meta) {
  const raw = meta?.quests || [
    { id: 'q_bow', name: THEME === 'church' ? 'Quỳ cầu nguyện 3 lần' : 'Lạy Phật 3 lạy', description: THEME === 'church' ? 'Vào Cung Thánh, quỳ trên ghế quỳ và cầu nguyện 3 lần' : 'Vào chánh điện, ngồi bồ đoàn và lạy Phật 3 lần', period: 'daily', metric: 'bow', target: 3, reward: { sen: 30, exp: 20 } },
    { id: 'q_incense', name: THEME === 'church' ? 'Thắp nến / dâng hương' : 'Dâng hương trầm', description: THEME === 'church' ? 'Dâng một nén hương trầm hoặc nến cầu nguyện' : 'Thắp một nén hương trầm tại chánh điện', period: 'daily', metric: 'incense', target: 1, reward: { sen: 25, exp: 15 } },
    { id: 'q_bead', name: THEME === 'church' ? 'Lần 1 chuỗi Mân Côi' : 'Lần 1 chuỗi 108 hạt', description: THEME === 'church' ? 'Hoàn thành 1 vòng chuỗi hạt cầu nguyện' : 'Hoàn thành 1 vòng chuỗi tràng hạt 108 hạt', period: 'daily', metric: 'round', target: 1, reward: { sen: 40, ngoc: 5, exp: 30 } },
    { id: 'q_chant', name: THEME === 'church' ? 'Đọc trọn 1 bài Kinh / Thánh Vịnh' : 'Tụng trọn 1 bài kinh', description: THEME === 'church' ? 'Mở mục Đọc Kinh và hoàn thành một bài kinh' : 'Mở mục Tụng Kinh và tụng hết một bài kinh', period: 'daily', metric: 'chant', target: 1, reward: { sen: 50, ngoc: 5, exp: 40 } },
    { id: 'q_visit3', name: THEME === 'church' ? 'Hành hương 3 Nhà Thờ' : 'Hành hương 3 ngôi chùa', description: THEME === 'church' ? 'Mở Bản đồ và viếng thăm 3 Nhà Thờ khác nhau' : 'Mở Bản đồ và viếng thăm 3 ngôi chùa khác nhau', period: 'weekly', metric: 'visit', target: 3, reward: { sen: 100, ngoc: 20, exp: 80 } },
    { id: 'q_share', name: THEME === 'church' ? 'Chia sẻ Thiệp Bình An cho bạn bè' : 'Chia sẻ Thiệp An Lành cho bạn bè', description: 'Bấm nút Khoe / Chia sẻ để lan tỏa bình an', period: 'daily', metric: 'share', target: 1, reward: { sen: 50, ngoc: 10, exp: 25 } },
  ];
  return raw.map((q) => {
    const baseMetric = q.metric.split(':')[0];
    let prog = db.questsProgress[q.id] || db.questsProgress[baseMetric] || 0;
    if (baseMetric === 'visit' || baseMetric === 'temples_all') prog = db.visited.length;
    if (baseMetric === 'level') prog = db.user?.level || 1;
    if (baseMetric === 'streak') prog = db.user?.streak || 1;
    const progress = Math.min(q.target, prog);
    const done = progress >= q.target;
    const claimed = !!db.questsClaimed[q.id];
    return { ...q, progress, done, claimed };
  });
}

function getProfilePayload(db, meta) {
  if (!db.user) return null;
  const lv = computeLevel(db.user.exp || 0, meta);
  db.user.level = lv.level;
  db.user.title = lv.title;
  db.user.expNext = lv.expNext;
  return {
    user: db.user,
    account: db.account,
    inventory: db.inventory,
    quests: buildQuests(db, meta),
    visited: db.visited,
  };
}

function bumpMetric(db, metric, amount = 1, templeId = '') {
  db.questsProgress[metric] = (db.questsProgress[metric] || 0) + amount;
  if (templeId) {
    const tk = `${metric}:${templeId}`;
    db.questsProgress[tk] = (db.questsProgress[tk] || 0) + amount;
  }
}

function addExpAndSen(db, meta, expGain, senGain = 0, ngocGain = 0) {
  const prevLv = db.user.level || 1;
  db.user.exp = (db.user.exp || 0) + expGain;
  db.user.sen = (db.user.sen || 0) + senGain;
  db.user.ngoc = (db.user.ngoc || 0) + ngocGain;
  const lv = computeLevel(db.user.exp, meta);
  const levelUps = [];
  if (lv.level > prevLv) {
    const bonusSen = lv.level * 50;
    db.user.sen += bonusSen;
    levelUps.push({ level: lv.level, title: lv.title, sen: bonusSen });
  }
  db.user.level = lv.level;
  db.user.title = lv.title;
  db.user.expNext = lv.expNext;
  return levelUps;
}

export async function api(path, opts = {}) {
  const meta = await ensureMeta();
  const db = getDB();
  const url = new URL(path, location.origin);
  const p = url.pathname.replace(/^\/api/, '');
  const method = (opts.method || 'GET').toUpperCase();
  const body = opts.body || {};

  if (p === '/meta') return meta;
  if (p === '/content') return await ensureContent();
  if (p === '/build') return { build: document.querySelector('meta[name=build]')?.content || 'local' };
  if (p === '/capacity') return { ok: true, full: false, busy: false, online: 28, max: 500, perTemple: 100 };
  if (p === '/online') {
    const counts = {};
    meta.temples.forEach((t, i) => { counts[t.id] = 6 + ((i * 7 + (Date.now() / 60000 | 0)) % 18); });
    return counts;
  }

  if (p === '/register' && method === 'POST') {
    const id = Math.floor(2000 + Math.random() * 8000);
    const tk = `tok_${THEME}_${id}_${Date.now().toString(36)}`;
    db.user = {
      id,
      name: (body.name || (THEME === 'church' ? 'Giáo Hữu Bình An' : 'Phật Tử An Lạc')).trim().slice(0, 28),
      sect: body.sect || Object.keys(meta.sects)[0] || 'tinhdo',
      level: 1,
      title: THEME === 'church' ? 'Tân Tòng Tín Thác' : 'Phật tử Sơ Tâm',
      honor: THEME === 'church' ? 'Khí Cụ Bình An' : 'Tâm Sáng Như Sen',
      exp: 20,
      expNext: 50,
      sen: 500,
      ngoc: 200,
      streak: 1,
      bestStreak: 1,
      duc: 100,
      quy: false,
      quySec: 0,
      quyNeed: 1800,
      noChan: false,
      invites: 1,
      createdAt: Date.now(),
      buffUntil: 0,
      avatar: null,
      appearance: body.appearance || { hero: 'luffy_g5', gender: 'nam', hair: 'ngan', skin: '#f5cba7' },
      equipped: {
        robe: body.robe || 'ao_lam',
        beads: 'chuoi_go',
        cushion: 'bo_doan_nau',
        hat: null,
        staff: null,
        cloud: null,
        pet: 'pet_nai',
      },
      stats: { bows: 0, beads: 0, rounds: 0, meditateMin: 0, strollMin: 0, chants: 0 },
    };
    // Tặng sẵn 1 bạn đồng hành (Nai Vàng / Chiên Con) trong túi đồ
    db.inventory.pet_nai = 1;
    saveDB(db);
    token.set(tk);
    return { token: tk, ...getProfilePayload(db, meta) };
  }

  // Nếu chưa có user nhưng có token, tự khởi tạo nhân vật mặc định để không bao giờ lỗi 401
  if (!db.user) {
    db.user = {
      id: 2026,
      name: THEME === 'church' ? 'Maria Hồng Ân' : 'Tâm An Lạc',
      sect: 'tinhdo',
      level: 3,
      title: THEME === 'church' ? 'Ca Viên Tâm Thành' : 'Cư sĩ Thanh Tịnh',
      honor: THEME === 'church' ? 'Khí Cụ Bình An' : 'Tâm Sáng Như Sen',
      exp: 180,
      expNext: 320,
      sen: 680,
      ngoc: 250,
      streak: 3,
      bestStreak: 3,
      duc: 100,
      quy: false,
      quySec: 0,
      quyNeed: 1800,
      noChan: false,
      invites: 2,
      createdAt: Date.now() - 3 * 864e5,
      buffUntil: 0,
      avatar: null,
      appearance: { hero: 'luffy_g5', gender: 'nam', hair: 'ngan', skin: '#f5cba7' },
      equipped: {
        robe: 'ao_lam',
        beads: 'chuoi_go',
        cushion: 'bo_doan_nau',
        hat: null,
        staff: null,
        cloud: null,
        pet: 'pet_nai',
      },
      stats: { bows: 18, beads: 216, rounds: 2, meditateMin: 15, strollMin: 10, chants: 2 },
    };
    db.inventory.pet_nai = 1;
    saveDB(db);
  }

  if (p === '/me' && method === 'GET') {
    return getProfilePayload(db, meta);
  }

  if (p === '/me' && method === 'PUT') {
    if (body.name) db.user.name = String(body.name).trim().slice(0, 28);
    if (body.appearance) db.user.appearance = { ...db.user.appearance, ...body.appearance };
    saveDB(db);
    return getProfilePayload(db, meta);
  }

  if (p === '/me/name-rule') {
    return { fee: { nextAt: 0, ngoc: 0, why: 'first' }, freeRefs: 1, words: [], names: [] };
  }

  if (p === '/me/sect' && method === 'POST') {
    if (body.sect && meta.sects[body.sect]) db.user.sect = body.sect;
    saveDB(db);
    return getProfilePayload(db, meta);
  }

  if (p === '/me/avatar') {
    db.user.avatar = method === 'DELETE' ? null : (body.image || null);
    saveDB(db);
    return getProfilePayload(db, meta);
  }

  if (p === '/login' && method === 'POST') {
    const tk = token.get() || `tok_${THEME}_2026`;
    token.set(tk);
    return { token: tk, ...getProfilePayload(db, meta) };
  }

  if (p === '/account' && method === 'POST') {
    db.account = { username: body.username || 'nguoidung', hasPassword: true };
    saveDB(db);
    return { username: db.account.username, hasPassword: true };
  }

  if (p === '/checkin' && method === 'POST') {
    const reward = { sen: 60, ngoc: 10, items: { huong_tram: 2, den_hoa_dang: 1 } };
    db.user.sen += reward.sen;
    db.user.ngoc += reward.ngoc;
    db.inventory.huong_tram = (db.inventory.huong_tram || 0) + 2;
    db.inventory.den_hoa_dang = (db.inventory.den_hoa_dang || 0) + 1;
    const duyenTemple = meta.temples[new Date().getDate() % meta.temples.length];
    saveDB(db);
    return {
      ...getProfilePayload(db, meta),
      checkin: {
        streak: db.user.streak || 1,
        day: ((db.user.streak || 1) - 1) % 7 + 1,
        shield: 3,
        shieldUsed: 0,
        shieldEarned: false,
        reward,
        week: [{ sen: 20 }, { sen: 30 }, { sen: 40 }, { sen: 50 }, { sen: 60 }, { sen: 80 }, { sen: 150 }],
        today: {
          teaching: THEME === 'church'
            ? { text: 'Bình an của Chúa ở cùng anh chị em. Hãy yêu thương nhau như Thầy đã yêu thương anh em.', src: 'Tin Mừng theo Thánh Gioan' }
            : { text: 'Quá khứ đã qua, tương lai chưa tới, chỉ có giây phút hiện tại là đáng trân quý nhất.', src: 'Kinh Nhất Dạ Hiền Giả' },
          duyen: { id: duyenTemple.id, reward: { sen: 50, exp: 30 } },
          lunar: { label: '15/04', holy: { name: THEME === 'church' ? 'Ngày Hồng Ân Hiệp Thông' : 'Ngày vía lành cát tường', mult: 2 } },
        },
        questsDone: [],
      },
    };
  }

  if (p === '/practice' && method === 'POST') {
    const type = body.type;
    const count = Number(body.count || 1);
    const temple = body.temple || meta.temples[0].id;
    let gained = 0;
    const extra = {};

    if (type === 'visit') {
      const firstHere = !db.visited.includes(temple);
      if (firstHere) {
        db.visited.push(temple);
        gained = 20;
      } else {
        gained = 5;
      }
      if (!db.visitedToday.includes(temple)) {
        db.visitedToday.push(temple);
        const st = db.stamps[temple] || { level: 1, tier: 'Đồng', days: 0, first: new Date().toISOString().slice(0, 10) };
        st.days += 1;
        st.level = st.days >= 7 ? 3 : st.days >= 3 ? 2 : 1;
        st.tier = st.level === 3 ? 'Vàng' : st.level === 2 ? 'Bạc' : 'Đồng';
        db.stamps[temple] = st;
        extra.stamp = { name: st.tier, days: st.days, reward: { sen: 20 } };
        db.user.sen += 20;
      } else {
        extra.already = true;
      }
      bumpMetric(db, 'visit', 1, temple);
    } else if (type === 'bow') {
      db.user.stats.bows = (db.user.stats.bows || 0) + count;
      gained = count * 5;
      extra.together = 2; // luôn có đạo hữu / giáo hữu AI đồng tâm cầu nguyện cùng
      bumpMetric(db, 'bow', count, temple);
    } else if (type === 'bead') {
      const prevRounds = Math.floor((db.user.stats.beads || 0) / 108);
      db.user.stats.beads = (db.user.stats.beads || 0) + count;
      const newRounds = Math.floor(db.user.stats.beads / 108);
      const diff = Math.max(0, newRounds - prevRounds);
      db.user.stats.rounds = newRounds;
      gained = count * 1 + diff * 40;
      if (diff > 0) {
        extra.rounds = diff;
        extra.roundExp = diff * 40;
        bumpMetric(db, 'round', diff, temple);
      }
    } else if (type === 'mo') {
      gained = Math.ceil(count * 1.5);
      bumpMetric(db, 'mo', count, temple);
    } else if (type === 'chant_done') {
      gained = 45;
      db.user.duc = Math.min(100, (db.user.duc || 100) + 5);
      bumpMetric(db, 'chant', 1, temple);
    } else if (type === 'meditate_start') {
      db._medStart = Date.now();
      saveDB(db);
      return { ok: true };
    } else if (type === 'meditate_end') {
      const mins = Math.max(1, Math.round((Date.now() - (db._medStart || (Date.now() - 60000))) / 60000));
      db.user.stats.meditateMin = (db.user.stats.meditateMin || 0) + mins;
      gained = mins * 12;
      extra.minutes = mins;
      bumpMetric(db, 'meditate_min', mins, temple);
    } else if (type === 'bell') {
      gained = 10;
      bumpMetric(db, 'bell', 1, temple);
    } else if (type === 'sweep' || type === 'plant') {
      gained = 25;
      bumpMetric(db, type, 1, temple);
    } else if (type === 'sit' || type === 'stroll') {
      gained = 6;
      if (type === 'stroll') db.user.stats.strollMin = (db.user.stats.strollMin || 0) + 1;
    }

    if (db.user.buffUntil > Date.now()) gained = Math.ceil(gained * 1.2);
    const levelUps = addExpAndSen(db, meta, gained, Math.ceil(gained * 0.4));
    saveDB(db);
    return { ...getProfilePayload(db, meta), gained, extra, levelUps, questsDone: [] };
  }

  if (p === '/use' && method === 'POST') {
    const it = body.item;
    if ((db.inventory[it] || 0) > 0) db.inventory[it]--;
    if (it === 'huong_tram') db.user.buffUntil = Date.now() + 10 * 60e3;
    bumpMetric(db, 'incense', 1, body.temple);
    const levelUps = addExpAndSen(db, meta, 15, 10);
    saveDB(db);
    return { ...getProfilePayload(db, meta), gained: 15, levelUps };
  }

  if (p === '/lanterns' && method === 'GET') {
    return db.lanterns.map((l) => ({ ...l, mine: l.user_id === db.user.id }));
  }

  if (p === '/lanterns' && method === 'POST') {
    const text = (body.text || (THEME === 'church' ? 'Xin Chúa ban bình an cho gia đình con ✝️' : 'Nguyện cầu bình an cho muôn loài 🪷')).trim();
    const tObj = meta.temples.find((t) => t.id === body.temple) || meta.temples[0];
    if ((db.inventory.den_hoa_dang || 0) > 0) db.inventory.den_hoa_dang--;
    const lantern = {
      id: Date.now(),
      user_id: db.user.id,
      name: db.user.name,
      text,
      temple: tObj.id,
      temple_name: tObj.name,
      likes: 1,
      liked: false,
      created_at: Date.now(),
    };
    db.lanterns.unshift(lantern);
    addExpAndSen(db, meta, 20, 15);
    saveDB(db);
    setTimeout(() => emitWsEvent({ t: 'lantern', lantern }), 200);
    return { ...getProfilePayload(db, meta), lantern, pending: false };
  }

  if (p.startsWith('/lanterns/') && p.endsWith('/rejoice') && method === 'POST') {
    const id = Number(p.split('/')[2]);
    const l = db.lanterns.find((x) => x.id === id);
    if (l && !l.liked) { l.liked = true; l.likes = (l.likes || 0) + 1; }
    bumpMetric(db, 'rejoice', 1);
    addExpAndSen(db, meta, 5, 5);
    saveDB(db);
    return { ...getProfilePayload(db, meta), likes: l ? l.likes : 1, gained: 5 };
  }

  if (p === '/activity') {
    return db.lanterns.slice(0, 10).map((l) => ({
      uid: l.user_id,
      name: l.name,
      kind: 'lantern',
      text: THEME === 'church' ? 'vừa thắp đèn nguyện ước' : 'vừa thả đèn hoa đăng',
      wish: l.text,
      temple: l.temple,
      temple_name: l.temple_name,
      ref: l.id,
      at: l.created_at,
    }));
  }

  if (p === '/shop/buy' && method === 'POST') {
    const item = meta.items.find((i) => i.id === body.item);
    if (!item) throw new Error('Không tìm thấy vật phẩm');
    const cur = body.currency === 'ngoc' ? 'ngoc' : 'sen';
    const price = cur === 'ngoc' ? (item.price_ngoc || 0) : (item.price_sen || 0);
    if (db.user[cur] < price) throw new Error(cur === 'ngoc' ? 'Không đủ Ngọc' : 'Không đủ Sen');
    db.user[cur] -= price;
    db.inventory[item.id] = (db.inventory[item.id] || 0) + 1;
    saveDB(db);
    return getProfilePayload(db, meta);
  }

  if (p === '/equip' && method === 'POST') {
    if (body.unequip) {
      db.user.equipped[body.unequip] = null;
    } else if (body.item) {
      const it = meta.items.find((i) => i.id === body.item);
      if (it) db.user.equipped[it.type] = it.id;
    }
    saveDB(db);
    return getProfilePayload(db, meta);
  }

  if (p === '/topup' && method === 'POST') {
    const pack = meta.packages.find((x) => x.id === body.package) || { id: 'p1', label: '100 Ngọc', ngoc: 100, vnd: 0 };
    const order = { id: Date.now() % 100000, label: pack.label, ngoc: pack.ngoc || parseInt(pack.label, 10) || 100, vnd: 0, status: 'pending' };
    db._lastOrder = order;
    saveDB(db);
    return { paymentMode: 'mock', order };
  }

  if (p.startsWith('/topup/') && p.endsWith('/mock-pay') && method === 'POST') {
    const ngoc = db._lastOrder?.ngoc || 200;
    db.user.ngoc = (db.user.ngoc || 0) + ngoc;
    saveDB(db);
    return getProfilePayload(db, meta);
  }

  if (p.startsWith('/quests/') && p.endsWith('/claim') && method === 'POST') {
    const qid = p.split('/')[2];
    const qs = buildQuests(db, meta);
    const q = qs.find((x) => x.id === qid) || { reward: { sen: 50, exp: 30 } };
    db.questsClaimed[qid] = true;
    const rw = q.reward || { sen: 50, exp: 30 };
    addExpAndSen(db, meta, rw.exp || 0, rw.sen || 0, rw.ngoc || 0);
    for (const [k, n] of Object.entries(rw.items || {})) db.inventory[k] = (db.inventory[k] || 0) + n;
    saveDB(db);
    return { ...getProfilePayload(db, meta), reward: rw };
  }

  if (p === '/leaderboard') {
    const rows = [
      ...AI_PEERS.map((a, idx) => ({ ...a, score: 2400 - idx * 310 })),
      { id: db.user.id, name: db.user.name, sect: db.user.sect, title: db.user.title, honor: db.user.honor, avatar: db.user.avatar, score: (db.user.exp || 100) + 450 },
    ].sort((a, b) => b.score - a.score).map((r, i) => ({ ...r, rank: i + 1 }));
    const sects = Object.keys(meta.sects).map((k, i) => ({ sect: k, score: 5200 - i * 640 }));
    const me = rows.find((r) => r.id === db.user.id);
    return { rows, sects, me };
  }

  if (p === '/pilgrim') {
    const duyenTemple = meta.temples[new Date().getDate() % meta.temples.length];
    const tomorrowTemple = meta.temples[(new Date().getDate() + 1) % meta.temples.length];
    const friendsByTemple = {};
    AI_PEERS.slice(0, 3).forEach((a, i) => {
      const tid = meta.temples[i % meta.temples.length].id;
      (friendsByTemple[tid] ||= []).push({ id: a.id, name: a.name });
    });
    return {
      today: {
        day: new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10),
        lunar: { label: '15/04', holy: { name: THEME === 'church' ? 'Ngày Hồng Ân Hiệp Thông' : 'Ngày rằm cát tường', mult: 1.5 } },
        duyen: { id: duyenTemple.id, tomorrow: tomorrowTemple.id, reward: { sen: 50, ngoc: 5 } },
      },
      visitedToday: db.visitedToday || [],
      stamps: db.stamps || {},
      tiers: [{ days: 1, name: 'Đồng' }, { days: 3, name: 'Bạc' }, { days: 7, name: 'Vàng' }],
      routes: [
        {
          id: 'r_bac',
          name: THEME === 'church' ? 'Hành Hương Giáo Tỉnh Miền Bắc' : 'Tuyến Cổ Tự Miền Bắc',
          description: THEME === 'church' ? 'Viếng thăm các Nhà Thờ cổ kính miền Bắc' : 'Hành hương qua các ngôi cổ tự linh thiêng miền Bắc',
          temples: meta.temples.filter((t) => t.region === 'Bắc').slice(0, 4).map((t) => t.id),
          progress: db.visited.length,
          done: db.visited.length >= 2,
          claimed: false,
          reward: { sen: 150, ngoc: 20 },
        },
        {
          id: 'r_nam',
          name: THEME === 'church' ? 'Hành Hương Giáo Tỉnh Miền Nam' : 'Tuyến Danh Lam Miền Trung & Nam',
          description: THEME === 'church' ? 'Viếng thăm các Thánh đường nổi tiếng miền Trung và miền Nam' : 'Hành hương các danh lam thắng cảnh miền Trung và miền Nam',
          temples: meta.temples.filter((t) => t.region !== 'Bắc').slice(0, 4).map((t) => t.id),
          progress: db.visited.length,
          done: db.visited.length >= 3,
          claimed: false,
          reward: { sen: 200, ngoc: 30 },
        },
      ],
      temples: Object.fromEntries(meta.temples.map((t, i) => [t.id, { top: { name: AI_PEERS[i % AI_PEERS.length].name, score: 1280 - i * 40 }, people: 18 + i * 3 }])),
      friends: friendsByTemple,
      journal: { days: 28, rows: db.journal || [] },
    };
  }

  if (p === '/stele') {
    return AI_PEERS.slice(0, 5).map((a, i) => ({ name: a.name, title: a.title, score: 950 - i * 110 }));
  }

  if (p === '/donations') {
    return AI_PEERS.slice(0, 5).map((a) => ({ name: a.name }));
  }

  if (p === '/wheel' && method === 'GET') {
    const segs = [
      { label: '30 Sen', pct: 30, sen: 30 },
      { label: '50 Sen', pct: 25, sen: 50 },
      { label: '20 Ngọc', pct: 15, ngoc: 20 },
      { label: THEME === 'church' ? '3 Nến Cầu Nguyện' : '3 Nén Hương Trầm', pct: 15, item: 'huong_tram' },
      { label: THEME === 'church' ? '2 Đèn Nguyện Ước' : '2 Đèn Hoa Đăng', pct: 10, item: 'den_hoa_dang' },
      { label: '100 Ngọc Quý', pct: 5, ngoc: 100, rare: true },
    ];
    return { segs, can: true, rareLevel: 1, rareCap: 99 };
  }

  if (p === '/wheel' && method === 'POST') {
    const idx = Math.floor(Math.random() * 6);
    const rewards = [
      { sen: 30 },
      { sen: 50 },
      { ngoc: 20 },
      { item: 'huong_tram' },
      { item: 'den_hoa_dang' },
      { ngoc: 100, rare: true },
    ];
    const r = rewards[idx];
    if (r.sen) db.user.sen += r.sen;
    if (r.ngoc) db.user.ngoc += r.ngoc;
    if (r.item) db.inventory[r.item] = (db.inventory[r.item] || 0) + 2;
    saveDB(db);
    return { idx, ...r };
  }

  if (p === '/que' && method === 'GET') {
    const today = new Date().toDateString();
    return { que: db.queDay === today ? db.queData : null };
  }

  if (p === '/que' && method === 'POST') {
    const today = new Date().toDateString();
    const q = DEFAULT_QUE[Math.floor(Math.random() * DEFAULT_QUE.length)];
    db.queDay = today;
    db.queData = q;
    const reward = { sen: 30, exp: 15 };
    addExpAndSen(db, meta, reward.exp, reward.sen);
    saveDB(db);
    return { ...getProfilePayload(db, meta), que: q, reward, already: false };
  }

  if (p === '/loc' && method === 'GET') {
    return {
      spawns: [
        { id: 101, x: -7.5, z: 16.5 },
        { id: 102, x: 8.2, z: 19.0 },
        { id: 103, x: -5.0, z: 24.5 },
      ],
    };
  }

  if (p === '/loc/claim' && method === 'POST') {
    const blessing = LOC_BLESSINGS[Math.floor(Math.random() * LOC_BLESSINGS.length)];
    addExpAndSen(db, meta, 20, 35, 5);
    bumpMetric(db, 'loc', 1, body.temple);
    saveDB(db);
    return {
      ...getProfilePayload(db, meta),
      gained: 20,
      blessing,
      label: '35 Sen & 5 Ngọc',
      left: 8,
    };
  }

  if (p === '/pets' && method === 'GET') {
    const petItems = meta.items.filter((i) => i.type === 'pet');
    return {
      left: db.petsLeft ?? 10,
      daily: 10,
      rareLevel: 1,
      pity: { wins: db.petWins || 2, need: 5 },
      species: petItems.map((it, idx) => ({
        item: it.id,
        rank: it.data?.rank || 'thuong',
        owned: (db.inventory[it.id] || 0) > 0,
        appear: 25 - idx * 2,
        chance: 85,
      })),
    };
  }

  if (p === '/pets/spawns') {
    const petItems = meta.items.filter((i) => i.type === 'pet');
    const p1 = petItems[0] || { id: 'pet_nai', data: { kind: 'deer', rank: 'thuong' } };
    const p2 = petItems[1] || { id: 'pet_hac', data: { kind: 'crane', rank: 'quy' } };
    const p3 = petItems[2] || { id: 'pet_tho', data: { kind: 'rabbit', rank: 'thuong' } };
    return {
      spawns: [
        { id: 201, item: p1.id, kind: p1.data.kind, rank: p1.data.rank || 'thuong', x: 7.5, z: 14.5, seed: 11 },
        { id: 202, item: p2.id, kind: p2.data.kind, rank: p2.data.rank || 'quy', x: -8.2, z: 20.0, seed: 22 },
        { id: 203, item: p3.id, kind: p3.data.kind, rank: p3.data.rank || 'thuong', x: 6.0, z: 25.5, seed: 33 },
      ],
    };
  }

  if (p === '/pets/bond/start' && method === 'POST') {
    return { ms: 2400 };
  }

  if (p === '/pets/bond/finish' && method === 'POST') {
    const petItems = meta.items.filter((i) => i.type === 'pet');
    const map = { 201: petItems[0]?.id || 'pet_nai', 202: petItems[1]?.id || 'pet_hac', 203: petItems[2]?.id || 'pet_tho' };
    const itemId = map[body.id] || petItems[0]?.id || 'pet_nai';
    const dup = (db.inventory[itemId] || 0) > 0;
    db.inventory[itemId] = (db.inventory[itemId] || 0) + 1;
    db.user.equipped.pet = itemId;
    bumpMetric(db, 'pet', 1, body.temple);
    addExpAndSen(db, meta, 30, dup ? 50 : 20);
    saveDB(db);
    return {
      ...getProfilePayload(db, meta),
      ok: true,
      gone: true,
      dup,
      item: itemId,
      sen: 50,
      left: 9,
      gained: 30,
    };
  }

  if (p.startsWith('/garden/')) {
    return { trees: 6 };
  }

  if (p.startsWith('/plants/') && method === 'GET' && p !== '/plants/harvest' && p !== '/plants/exchange') {
    const tid = p.split('/')[2];
    return { plants: (db.plants || []).filter((x) => x.temple === tid), cap: 50 };
  }

  if (p === '/garden-mine') {
    return { perUser: 5, mine: db.plants || [], fruit: db.fruit || 5 };
  }

  if (p === '/plants' && method === 'POST') {
    const tObj = meta.temples.find((t) => t.id === body.temple) || meta.temples[0];
    if ((db.inventory[body.item] || 0) > 0) db.inventory[body.item]--;
    const plant = {
      id: Date.now(),
      item: body.item,
      temple: tObj.id,
      templeName: tObj.name,
      x: body.x || 5,
      z: body.z || 16,
      owner: db.user.name,
      fruits: 0,
      max: 5,
      per: 3,
      ripe: 1,
      nextAt: Date.now() + 864e5,
    };
    db.plants.push(plant);
    saveDB(db);
    setTimeout(() => emitWsEvent({ t: 'plant', p: plant }), 100);
    return getProfilePayload(db, meta);
  }

  if (p === '/plants/harvest' && method === 'POST') {
    const pl = (db.plants || []).find((x) => x.id === body.id);
    const got = pl ? pl.per || 3 : 3;
    if (pl) { pl.ripe = 0; pl.fruits = (pl.fruits || 0) + 1; }
    db.fruit = (db.fruit || 0) + got;
    saveDB(db);
    return { ...getProfilePayload(db, meta), got };
  }

  if (p === '/plants/exchange' && method === 'POST') {
    const qty = db.fruit || 0;
    db.fruit = 0;
    db.user.ngoc = (db.user.ngoc || 0) + qty;
    saveDB(db);
    return { ...getProfilePayload(db, meta), ngoc: qty };
  }

  if (p === '/sala/board') {
    return {
      left: db.sala?.left ?? 5,
      daily: 5,
      me: db.sala?.me ?? 120,
      total: db.sala?.total ?? 120,
      robeAt: 1080,
      nextAt: Date.now() + 3600e3,
      rows: AI_PEERS.slice(0, 5).map((a, i) => ({ name: a.name, flowers: 380 - i * 55 })),
    };
  }

  if (p === '/sala/start' && method === 'POST') {
    return { seed: (Date.now() & 0x7fffffff) || 12345, dur: 45000 };
  }

  if (p === '/sala/claim' && method === 'POST') {
    const fl = Number(body.flowers || 20);
    const sen = fl * 2;
    db.sala.me = (db.sala.me || 0) + fl;
    db.sala.total = (db.sala.total || 0) + fl;
    db.user.sen += sen;
    const robe = db.sala.total >= 1080 && !db.inventory.ao_hoa_sala;
    if (robe) db.inventory.ao_hoa_sala = 1;
    saveDB(db);
    return {
      ...getProfilePayload(db, meta),
      flowers: fl,
      sen,
      total: db.sala.total,
      robeAt: 1080,
      left: 5,
      robe,
    };
  }

  if (p === '/hermit') {
    return { owned: !!db.hermitOwned, level: db.user.level, minLevel: 1, fated: true, left: 3, price: 100 };
  }

  if (p === '/hermit/exchange' && method === 'POST') {
    db.hermitOwned = true;
    db.user.sen = Math.max(0, (db.user.sen || 0) - 100);
    saveDB(db);
    return getProfilePayload(db, meta);
  }

  if (p === '/legend/book') {
    const legends = [
      { id: 'lac', story: THEME === 'church' ? 'Chứng Nhân Đức Tin' : 'Con Rồng Cháu Tiên', title: THEME === 'church' ? 'Khí Cụ Bình An' : 'Tâm Sáng Như Sen', line: THEME === 'church' ? 'Đem yêu thương vào nơi oán thù, đem bình an vào nơi chia rẽ.' : 'Giữ trọn tâm từ bi và trí tuệ giữa cuộc đời.', count: 12, mine: 1, holders: [db.user.name, AI_PEERS[0].name] },
      { id: 'auco', story: THEME === 'church' ? 'Hoa Hồng Thánh Thiện' : 'Sen Hồng Nở Rộ', title: THEME === 'church' ? 'Ánh Sáng Tin Yêu' : 'Sen Vàng Tinh Tấn', line: THEME === 'church' ? 'Mỗi lời kinh là một đóa hồng dâng lên Thiên Chúa.' : 'Mỗi bước chân chánh niệm nở một đóa sen vàng.', count: 8, mine: 0, holders: [AI_PEERS[0].name, AI_PEERS[1].name] },
    ];
    return { cap: 100, legends };
  }

  if (p === '/legend/mine') {
    return {
      award: {
        id: 'lac',
        uid: db.user.id,
        title: db.user.honor || (THEME === 'church' ? 'Khí Cụ Bình An' : 'Tâm Sáng Như Sen'),
        story: THEME === 'church' ? 'Hồng Ân Thánh Đường' : 'Duyên Lành Cửa Phật',
        line: THEME === 'church' ? 'Người gieo mầm bình an và bác ái.' : 'Người gieo mầm an lạc và từ bi.',
      },
    };
  }

  if (p === '/players' && method === 'GET') {
    const q = (url.searchParams.get('q') || '').toLowerCase();
    return AI_PEERS.filter((a) => !q || a.name.toLowerCase().includes(q) || String(a.id) === q).map((a) => ({
      ...a,
      online: meta.temples[0].id,
      relation: db.friends.includes(a.id) ? 'ok' : 'none',
    }));
  }

  if (p.startsWith('/players/')) {
    const pid = Number(p.split('/')[2]);
    if (pid === db.user.id) {
      return { ...db.user, relation: 'self', greets: GREET_PRESETS, sangha: { name: db.sangha.name } };
    }
    const peer = AI_PEERS.find((a) => a.id === pid) || AI_PEERS[0];
    return {
      ...peer,
      online: meta.temples[0].id,
      relation: db.friends.includes(peer.id) ? 'ok' : db.incoming.includes(peer.id) ? 'pending_in' : db.outgoing.includes(peer.id) ? 'pending_out' : 'none',
      greets: GREET_PRESETS,
      sangha: { name: db.sangha.name },
    };
  }

  if (p === '/greet' && method === 'POST') {
    if (body.kind === 'huong' && (db.inventory.huong_tram || 0) > 0) db.inventory.huong_tram--;
    addExpAndSen(db, meta, 10, 10);
    saveDB(db);
    return { ...getProfilePayload(db, meta), gained: 10 };
  }

  if (p === '/greetings') return [];

  if (p === '/friends' && method === 'GET') {
    const mapPeer = (id) => {
      const a = AI_PEERS.find((x) => x.id === id) || AI_PEERS[0];
      return { ...a, online: meta.temples[0].id };
    };
    return {
      friends: db.friends.map(mapPeer),
      incoming: db.incoming.map(mapPeer),
      outgoing: db.outgoing.map(mapPeer),
    };
  }

  if (p.startsWith('/friends/') && method === 'POST') {
    const pid = Number(p.split('/')[2]);
    if (p.endsWith('/withdraw')) {
      db.outgoing = db.outgoing.filter((x) => x !== pid);
      saveDB(db);
      return { status: 'none', withdrawn: true };
    }
    db.incoming = db.incoming.filter((x) => x !== pid);
    if (!db.friends.includes(pid)) db.friends.push(pid);
    saveDB(db);
    return { status: 'ok' };
  }

  if (p.startsWith('/friends/') && method === 'DELETE') {
    const pid = Number(p.split('/')[2]);
    db.friends = db.friends.filter((x) => x !== pid);
    saveDB(db);
    return { status: 'none' };
  }

  if (p === '/dm' && method === 'GET') {
    const threads = db.friends.map((fid) => {
      const peer = AI_PEERS.find((x) => x.id === fid) || AI_PEERS[0];
      const msgs = db.dms[fid] || [{ id: 1, from: fid, text: GREET_PRESETS[0], at: Date.now() - 300e3 }];
      return { user: peer, last: msgs[msgs.length - 1], unread: 0 };
    });
    return {
      unread: 0,
      threads,
      sangha: { name: db.sangha.name, unread: 0, last: db.sangha.msgs[db.sangha.msgs.length - 1] },
    };
  }

  if (p.startsWith('/dm/') && method === 'GET') {
    const fid = Number(p.split('/')[2]);
    const peer = AI_PEERS.find((x) => x.id === fid) || AI_PEERS[0];
    const msgs = db.dms[fid] || [{ id: 1, from: fid, text: GREET_PRESETS[0], at: Date.now() - 300e3 }];
    db.dms[fid] = msgs;
    saveDB(db);
    return { user: peer, msgs, unread: 0, friend: true };
  }

  if (p.startsWith('/dm/') && method === 'POST') {
    const fid = Number(p.split('/')[2]);
    const peer = AI_PEERS.find((x) => x.id === fid) || AI_PEERS[0];
    const msgs = (db.dms[fid] ||= []);
    const msg = { id: Date.now(), from: db.user.id, text: body.text || '', at: Date.now() };
    msgs.push(msg);
    saveDB(db);
    // AI bạn đồng tu phản hồi thân thiện sau 1.5s
    setTimeout(() => {
      const reply = {
        id: Date.now() + 1,
        from: fid,
        text: THEME === 'church'
          ? `Cảm ơn ${db.user.name}! Nguyện xin Chúa và Mẹ Maria luôn ban ơn bình an cho bạn nhé ✝️🌹`
          : `A Di Đà Phật! Cảm ơn đạo hữu ${db.user.name}, chúc bạn tu tập tinh tấn và luôn an lạc nhé 🪷🙏`,
        at: Date.now(),
      };
      msgs.push(reply);
      saveDB(db);
      emitWsEvent({ t: 'dm', from: peer, msg: reply });
    }, 1400);
    return { msg };
  }

  if (p.startsWith('/gift/') && method === 'POST') {
    const fid = Number(p.split('/')[2]);
    const msgs = (db.dms[fid] ||= []);
    const gift = body.sen ? { sen: body.sen } : { item: body.item, qty: body.qty || 1 };
    if (body.sen) db.user.sen = Math.max(0, db.user.sen - body.sen);
    if (body.item && db.inventory[body.item]) db.inventory[body.item]--;
    const msg = { id: Date.now(), from: db.user.id, kind: 'gift', gift, text: body.text || '', at: Date.now() };
    msgs.push(msg);
    saveDB(db);
    return { ...getProfilePayload(db, meta), msg };
  }

  if (p === '/sangha' && method === 'GET') {
    if (!db.sangha) return {};
    return {
      sangha: {
        ...db.sangha,
        members: [
          { ...db.user, owner: true, online: meta.temples[0].id, week: 450, idleDays: 0 },
          ...AI_PEERS.slice(0, 4).map((a, i) => ({ ...a, owner: false, online: meta.temples[i % meta.temples.length].id, week: 320 - i * 40, idleDays: 0 })),
        ],
      },
    };
  }

  if (p === '/sangha' && method === 'POST') {
    db.sangha = {
      id: Date.now(),
      name: (body.name || (THEME === 'church' ? 'Ca Đoàn Hồng Ân' : 'Đạo Tràng An Lạc')).trim(),
      code: 'ANLAC8',
      max: 10,
      goal: 1000,
      total: 1100,
      claimed: false,
      isOwner: true,
      idleDays: 7,
      msgs: [],
    };
    saveDB(db);
    return { ok: true };
  }

  if (p === '/sangha/top' || p === '/sangha/open') {
    return [
      { id: 1, name: THEME === 'church' ? 'Ca Đoàn Ánh Sáng & Bình An' : 'Đạo Tràng Liên Hoa Tịnh Tâm', members: 6, max: 10, owner: AI_PEERS[0].name, score: 2850 },
      { id: 2, name: THEME === 'church' ? 'Huynh Đoàn Mân Côi Việt Nam' : 'Đạo Tràng Trúc Lâm Viên Giác', members: 8, max: 10, owner: AI_PEERS[1].name, score: 2340 },
    ];
  }

  if (p === '/sangha/join' && method === 'POST') {
    db.sangha ||= { id: 1, name: THEME === 'church' ? 'Ca Đoàn Ánh Sáng & Bình An' : 'Đạo Tràng Liên Hoa Tịnh Tâm', code: 'ANBINH', max: 10, goal: 1000, total: 1250, claimed: false, isOwner: false, idleDays: 7, msgs: [] };
    saveDB(db);
    return { ok: true };
  }

  if (p === '/sangha/leave' && method === 'POST') {
    db.sangha = null;
    saveDB(db);
    return { ok: true };
  }

  if (p === '/sangha/claim' && method === 'POST') {
    if (db.sangha) db.sangha.claimed = true;
    db.user.sen += 50;
    db.inventory.huong_tram = (db.inventory.huong_tram || 0) + 1;
    saveDB(db);
    return { ...getProfilePayload(db, meta), reward: { sen: 50 } };
  }

  if (p === '/sangha/chat' && method === 'GET') {
    const s = db.sangha || { id: 1, name: 'Đạo Tràng', msgs: [] };
    return { sangha: { id: s.id, name: s.name, owner: true, count: 5 }, msgs: s.msgs || [] };
  }

  if (p === '/sangha/chat' && method === 'POST') {
    const msg = { id: Date.now(), from: db.user.id, name: db.user.name, text: body.text || '', at: Date.now() };
    if (db.sangha) db.sangha.msgs.push(msg);
    saveDB(db);
    return { msg };
  }

  if (p === '/mail' && method === 'GET') {
    const mails = db.mails || [];
    const unread = mails.filter((m) => !m.read_at).length;
    return { mails, unread };
  }

  if (p === '/mail/read-all' && method === 'POST') {
    (db.mails || []).forEach((m) => (m.read_at ||= Date.now()));
    saveDB(db);
    return { unread: 0 };
  }

  if (p.startsWith('/mail/') && p.endsWith('/read') && method === 'POST') {
    const id = Number(p.split('/')[2]);
    const m = (db.mails || []).find((x) => x.id === id);
    if (m) m.read_at = Date.now();
    saveDB(db);
    return { unread: (db.mails || []).filter((x) => !x.read_at).length };
  }

  if (p.startsWith('/mail/') && p.endsWith('/claim') && method === 'POST') {
    const id = Number(p.split('/')[2]);
    const m = (db.mails || []).find((x) => x.id === id);
    const gift = { sen: m?.sen || 0, ngoc: m?.ngoc || 0 };
    if (m && !m.claimed_at) {
      m.claimed_at = m.read_at = Date.now();
      db.user.sen += gift.sen;
      db.user.ngoc += gift.ngoc;
      saveDB(db);
    }
    return { ...getProfilePayload(db, meta), unread: (db.mails || []).filter((x) => !x.read_at).length, gift };
  }

  if (p.startsWith('/mail/') && method === 'DELETE') {
    const id = Number(p.split('/')[2]);
    db.mails = (db.mails || []).filter((x) => x.id !== id);
    saveDB(db);
    return { unread: db.mails.filter((x) => !x.read_at).length };
  }

  if (p === '/share' && method === 'POST') {
    const reward = { sen: 30, exp: 20 };
    bumpMetric(db, 'share', 1);
    addExpAndSen(db, meta, reward.exp, reward.sen);
    saveDB(db);
    return { ...getProfilePayload(db, meta), rewarded: true, reward };
  }

  if (p === '/feedback' && method === 'POST') return { ok: true };

  if (p === '/chan' && method === 'POST') {
    db.user.duc = Math.max(20, (db.user.duc || 100) - 10);
    saveDB(db);
    setTimeout(() => emitWsEvent({ t: 'chan', from: db.user.id, to: body.to, name: db.user.name }), 80);
    return getProfilePayload(db, meta);
  }

  if (p === '/chan/pref' && method === 'POST') {
    db.user.noChan = !body.on;
    saveDB(db);
    return getProfilePayload(db, meta);
  }

  if (p === '/quy/listen' && method === 'POST') {
    db.user.quy = false;
    db.user.duc = 100;
    saveDB(db);
    return getProfilePayload(db, meta);
  }

  return {};
}

export const post = (path, body) => api(path, { method: 'POST', body });

/* =====================================================================
   HYBRID WEBSOCKET + BROADCASTCHANNEL + AI FELLOWS ENGINE
   Cho phép nhiều tab / bạn bè cùng phòng thấy nhau + AI đồng tu sống động
   ===================================================================== */
const activeSockets = new Set();
const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(`${PREFIX}room_sync`) : null;
const tabPeers = new Map();

function emitWsEvent(obj) {
  const data = JSON.stringify(obj);
  for (const ws of activeSockets) {
    if (ws.readyState === 1 && typeof ws.onmessage === 'function') {
      ws.onmessage({ data });
    }
  }
}

if (bc) {
  bc.onmessage = (ev) => {
    const m = ev.data;
    if (!m) return;
    if (m.type === 'state') {
      tabPeers.set(m.player.id, { ...m.player, at: Date.now() });
    } else if (m.type === 'event') {
      emitWsEvent(m.payload);
    }
  };
}

const NativeWS = window.WebSocket;

class HybridWebSocket extends EventTarget {
  constructor(url) {
    super();
    this.url = url;
    this.readyState = 0; // CONNECTING
    this.binaryType = 'arraybuffer';
    this.currentTemple = 'nhattru';
    this.roomCode = new URLSearchParams(location.search).get('room') || 'chung';
    activeSockets.add(this);

    // Thử kết nối tới server.js nếu đang chạy máy chủ Node.js (bỏ qua trên file:// hoặc GitHub Pages tĩnh)
    const isStaticHost = window.__STATIC_HOST__ === true || location.protocol === 'file:' || /\.(github\.io|pages\.dev|netlify\.app|vercel\.app)$/i.test(location.hostname);
    if (!isStaticHost) {
      try {
        const real = new NativeWS(url);
        this._real = real;
        real.onmessage = (ev) => {
          if (typeof ev.data === 'string') {
            try {
              const parsed = JSON.parse(ev.data);
              if (parsed.t === 'peer_state' && parsed.player) {
                tabPeers.set(parsed.player.id, { ...parsed.player, at: Date.now() });
                return;
              }
            } catch {}
          }
          this.onmessage?.(ev);
        };
        real.onerror = () => {};
      } catch {}
    }

    setTimeout(() => {
      this.readyState = 1; // OPEN
      const evt = new Event('open');
      this.dispatchEvent(evt);
      this.onopen?.(evt);
    }, 60);

    // Cập nhật vị trí các đạo hữu / giáo hữu AI và bạn cùng phòng mỗi 1.2 giây
    this._tick = setInterval(() => {
      if (this.readyState !== 1) return;
      this._broadcastRoom();
    }, 1200);
  }

  _broadcastRoom() {
    const t = Date.now() / 1000;
    // Vị trí các đệm quỳ / bồ đoàn trong chánh điện (x: -3.3, -1.1, 1.1, 3.3; z: 0.6, 2.3, 4.0)
    const seats = [
      { idx: 1, x: -1.1, z: 0.6 },
      { idx: 2, x: 1.1, z: 0.6 },
      { idx: 4, x: -3.3, z: 2.3 },
      { idx: 7, x: 3.3, z: 2.3 },
    ];
    const aiPlayers = AI_PEERS.slice(0, 5).map((peer, i) => {
      if (i < 4) {
        const s = seats[i];
        // Chu kỳ lạy / cầu nguyện đồng tâm
        const bowing = Math.sin(t * 0.4 + i) > 0.15;
        return {
          ...peer,
          x: s.x,
          z: s.z,
          y: 0,
          r: Math.PI,
          seat: s.idx,
          a: bowing ? 2 : 1, // bit 1 = seated, bit 2 = bowing
        };
      }
      // Người thứ 5 đi dạo nhẹ nhàng quanh chánh điện / sân
      const angle = t * 0.28;
      return {
        ...peer,
        x: Math.sin(angle) * 4.2,
        z: 5.5 + Math.cos(angle) * 1.4,
        y: 0,
        r: angle + Math.PI / 2,
        seat: -1,
        a: 0,
      };
    });

    // Gộp thêm người chơi thật từ các tab khác hoặc từ server.js trong cùng phòng
    const now = Date.now();
    for (const [id, p] of tabPeers.entries()) {
      if (now - p.at > 15000) tabPeers.delete(id);
      else if (p.temple === this.currentTemple && p.room === this.roomCode) aiPlayers.push(p);
    }

    const msg = {
      t: 'room',
      temple: this.currentTemple,
      online: 14 + aiPlayers.length,
      players: aiPlayers,
    };
    this.onmessage?.({ data: JSON.stringify(msg) });
  }

  send(raw) {
    try {
      const m = JSON.parse(raw);
      if (m.t === 'join') {
        this.currentTemple = m.temple || 'nhattru';
        setTimeout(() => {
          this.onmessage?.({ data: JSON.stringify({ t: 'joined', temple: this.currentTemple }) });
          this._broadcastRoom();
        }, 40);
      } else if (m.t === 's') {
        const db = getDB();
        if (db.user) {
          const payload = {
            ...db.user,
            x: m.x || 0,
            z: m.z || 4,
            y: m.y || 0,
            r: m.r || 0,
            seat: m.seat ?? -1,
            a: (m.bow ? 2 : 0) | (m.med ? 4 : 0) | ((m.seat ?? -1) >= 0 ? 1 : 0),
            temple: this.currentTemple,
            room: this.roomCode,
          };
          bc?.postMessage({ type: 'state', player: payload });
          if (this._real?.readyState === 1) {
            this._real.send(JSON.stringify({ t: 'peer_state', player: payload }));
          }
        }
      } else if (m.t === 'emote') {
        const db = getDB();
        if (db.user) {
          const ev = { t: 'emote', id: db.user.id, e: m.e };
          emitWsEvent(ev);
          bc?.postMessage({ type: 'event', payload: ev });
        }
      }
      if (this._real?.readyState === 1) this._real.send(raw);
    } catch {}
  }

  close() {
    this.readyState = 3;
    clearInterval(this._tick);
    activeSockets.delete(this);
    try { this._real?.close(); } catch {}
  }
}

window.WebSocket = function(url, protocols) {
  if (typeof url === 'string' && url.includes('/ws')) {
    return new HybridWebSocket(url);
  }
  return new NativeWS(url, protocols);
};

import { preloadFigures } from './statues.js';
import * as THREE from 'three';
import { api, post, token, local, prepareProof, takeProof } from './api.js';
import { Sound } from './audio.js';
import { KINH } from './kinh.js';
import { World } from './world.js';
import { BeadsView } from './beads.js';
import { makeAvatar, animateAvatar, setSeated, setDancing, HERO_LIST, HERO_MAP, OUTFIT_LIST, OUTFIT_MAP, triggerUltimate } from './avatar.js';
import { ic, injectIcons, ITEM_ICON, TYPE_ICON, EMOTES } from './icons.js';
import { openMap } from './mapview.js';
import { runChore, showGardenTrees, showPlants, CHORE_NAME, choreHint } from './chores.js';
import { mountTryOn } from './tryon.js';
import { showLoader, hideLoader, setLoader, nextFrames, skeleton, busy, startCoach, howtoHtml } from './help.js';
import { paintThumbs } from './thumbs.js';
import { makeCard, nativeShare, facebookShare, copyText, download, shareUrl, petalShower } from './share.js';

const $ = (id) => document.getElementById(id);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmt = (n) => Number(n || 0).toLocaleString('vi-VN');
const show = (el, on = true) => (typeof el === 'string' ? $(el) : el)?.classList.toggle('hidden', !on);

// Ghi lỗi gần nhất vào DOM để dễ chẩn đoán
addEventListener('error', (e) => (document.body.dataset.err = `${e.message} @${e.filename}:${e.lineno}`));
addEventListener('unhandledrejection', (e) => (document.body.dataset.err = String(e.reason?.stack || e.reason)));

const S = { meta: null, items: {}, profile: null, temple: null, ws: null, view: 'boot', bow: 'idle', pendingBeads: 0, beadShown: 0 };
const ROUND_NAMES = ['thứ nhất', 'thứ hai', 'thứ ba', 'thứ tư', 'thứ năm', 'thứ sáu', 'thứ bảy', 'thứ tám', 'thứ chín', 'thứ mười'];
const TEMPLE_ICON = {};
const TEMPLE_BG = { linhung: '#dfeef2', nuisam: '#eaf0d8', nhattru: '#e6f0dc', tranho: '#dbe8f0', huongson: '#e2ddd5', dinhmay: '#e4ecf6', baison: '#f0e3d0', thienmau: '#f6e0cc', vinhan: '#e2f2e6', doivang: '#fbe6c0', linhson: '#f6e4cc', kimson: '#e6ebee', cuuphong: '#dce9e4', hoangoc: '#f3e8cf' };

/* =====================================================================
   TIỆN ÍCH GIAO DIỆN
   ===================================================================== */
let toastT;
function toast(msg, ms = 2600) {
  const t = $('toast'); t.innerHTML = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms);
}
// Thông báo của chùa. fx='love': thiệp hỷ sự (cầu duyên, cưới hỏi) với hoa và tim rơi.
function announce(text, fx) {
  if (fx !== 'love') return toast('<svg class="i"><use href="#i-megaphone"/></svg> ' + esc(text), 7000);
  document.querySelector('.hy-card')?.remove();
  const el = document.createElement('div');
  el.className = 'hy-card';
  el.innerHTML = `<div class="hy-inner"><div class="hy-glyph">囍</div><div class="hy-title">Cầu duyên</div><div class="hy-text">${esc(text)}</div><div class="hy-foot">Nam mô A Di Đà Phật</div></div>`;
  document.body.appendChild(el);
  const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 600); };
  el.onclick = close; setTimeout(close, 10000);
  try { Sound.success(); } catch {}
  petalShower(46, ['🌸', '💗', '💕', '🌸', '✨', '🏮']);
  setTimeout(() => el.isConnected && petalShower(30, ['🌸', '💗', '✨']), 3800);
}
// Lời chúc cuối tuần: 6-8h sáng thứ Bảy, Chủ nhật giờ Việt Nam, mỗi máy một lời ngẫu nhiên, mỗi ngày một lần. Chạy ở máy người chơi nên không tốn tải máy chủ.
const WEEKEND_WISHES = [
  'Chúc bạn cuối tuần an lành, tâm sáng như nắng sớm.',
  'Sáng cuối tuần thong thả, chúc bạn thân khoẻ, tâm an.',
  'Chúc gia đình bạn một ngày nghỉ sum vầy, đầm ấm.',
  'Chúc bạn cuối tuần nhẹ nhàng, buông bớt lo toan.',
  'Mong mỗi hơi thở sáng nay đều mang lại bình an cho bạn.',
  'Chúc bạn một ngày nghỉ nhiều nụ cười, nhiều điều lành.',
  'Cuối tuần chậm lại một chút, chúc bạn gặp được chính mình.',
  'Chúc bạn và người thân luôn mạnh khoẻ, phước lành tròn đầy.',
  'Chúc bạn sáng nay lòng nhẹ như hoa sen nở trên hồ.',
  'Một câu niệm Phật đầu ngày, chúc bạn cả ngày hoan hỷ.',
  'Chúc bạn cuối tuần gieo được nhiều hạt lành, gặt nhiều niềm vui.',
  'Chúc bạn ngày nghỉ an nhiên, việc gì cũng thuận duyên.',
];
function weekendWish() {
  const vn = new Date(Date.now() + 7 * 36e5), day = vn.getUTCDay(), hour = vn.getUTCHours(), key = vn.toISOString().slice(0, 10);
  if ((day !== 0 && day !== 6) || hour < 6 || hour >= 8 || S.view !== 'hall' || S.coaching || document.querySelector('.hy-card') || local.get('wish') === key) return;
  local.set('wish', key);
  const el = document.createElement('div');
  el.className = 'hy-card';
  el.innerHTML = `<div class="hy-inner"><div class="hy-glyph">福</div><div class="hy-title">Lời chúc cuối tuần</div><div class="hy-text">${esc(WEEKEND_WISHES[Math.floor(Math.random() * WEEKEND_WISHES.length)])}</div><div class="hy-foot">Nam mô A Di Đà Phật</div></div>`;
  document.body.appendChild(el);
  const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 600); };
  el.onclick = close; setTimeout(close, 10000);
  try { Sound.success(); } catch {}
  petalShower(30, ['🌸', '🪷', '✨']);
}
setInterval(weekendWish, 6e4);
function floater(text) {
  const f = document.createElement('div');
  f.className = 'floater'; f.innerHTML = text;
  f.style.left = 40 + Math.random() * 20 + '%';
  $('floaters').appendChild(f);
  setTimeout(() => f.remove(), 1500);
}
// Hộp thoại có hàng đợi: không để hộp sau đè mất hộp trước
const modalQueue = [];
function modal(html, onReady, { replace = false } = {}) {
  if (!replace && !$('modal').classList.contains('hidden')) { modalQueue.push([html, onReady]); return; }
  $('modalCard').innerHTML = html;
  show('modal');
  onReady?.($('modalCard'));
}
function closeModal() {
  show('modal', false);
  if (modalQueue.length) { const [h, f] = modalQueue.shift(); setTimeout(() => modal(h, f), 250); }
}
$('modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });

function sheet(title, tabs, render, initial) {
  $('sheetTitle').textContent = title;
  const tabsEl = $('sheetTabs');
  tabsEl.innerHTML = (tabs || []).map((t) => `<button data-tab="${t[0]}">${t[1]}</button>`).join('');
  const select = (k) => {
    $$('button', tabsEl).forEach((b) => b.classList.toggle('on', b.dataset.tab === k));
    tabsEl.querySelector('.on')?.scrollIntoView({ block: 'nearest', inline: 'center' });
    S.sheetTab = k;
    render($('sheetBody'), k);
  };
  $$('button', tabsEl).forEach((b) => (b.onclick = () => select(b.dataset.tab)));
  // vẽ lại khi hồ sơ thay đổi (refresh=true): tab chỉ hiển thị dữ liệu tải từ máy chủ có thể bỏ qua để khỏi nháy
  S.sheetRender = () => render($('sheetBody'), S.sheetTab, true);
  show('sheet');
  select(initial || tabs?.[0]?.[0]);
}
const closeSheet = () => { show('sheet', false); S.sheetRender = null; };
$('sheetClose').onclick = closeSheet;
$('sheet').addEventListener('click', (e) => { if (e.target.id === 'sheet') closeSheet(); });

const sectOf = (id) => S.meta.sects[id] || Object.values(S.meta.sects)[0];
const qty = (id) => S.profile?.inventory?.[id] || 0;
const owns = (id) => S.items[id]?.data?.default || qty(id) > 0;

/* =====================================================================
   HỒ SƠ & KẾT QUẢ
   ===================================================================== */
/* ---------- Ngạ quỷ: hết tích đức thì chỉ đi lại được, đứng yên nghe kinh đủ lâu để trở lại ---------- */
const quyL = { on: false, timer: null, beat: null, i: 0 };
function stopQuyListen() {
  quyL.on = false; clearTimeout(quyL.timer); clearInterval(quyL.beat);
  Sound.stopLine(); $('quyListen').classList.remove('on');
  $('quyListen').textContent = 'Nghe kinh';
}
function applyQuy(prev) {
  const u = S.profile?.user;
  if (!u) return;
  document.body.classList.toggle('is-quy', u.quy);
  S.world?.setQuy(u.quy);
  show('quyBar', u.quy);
  if (u.quy) {
    const left = Math.max(0, u.quyNeed - u.quySec);
    $('quyFill').style.width = `${(u.quySec / u.quyNeed) * 100}%`;
    $('quyLeft').textContent = `Còn ${Math.ceil(left / 60)} phút nghe kinh`;
    if (prev && !prev.quy) { closeModal(); Sound.bigBell(); toast('Bạn đã hết tích đức và hoá thành ngạ quỷ', 5000); }
  } else if (prev?.quy) {
    stopQuyListen(); Sound.bigBell(); petalShower(24);
    toast(`${ic('lotus')} Nghiệp đã nhẹ, bạn trở lại làm người. Tích đức: ${u.duc}`, 5000);
  }
}
async function quyBeat() {
  try { setProfile(await post('/quy/listen', {})); } catch (e) { stopQuyListen(); toast(e.message); }
}
function quySpeak() {
  if (!quyL.on) return;
  const k = KINH.find((x) => x.id === 'tamkinh');
  Sound.sayLine(lineUrl(k, quyL.i)).then((ms) => {
    quyL.i = (quyL.i + 1) % k.lines.length;
    if (quyL.on) quyL.timer = setTimeout(quySpeak, ms + 900);
  });
}
function setProfile(data) {
  if (!data?.user) return;
  const prev = S.profile?.user;
  // phản hồi gọn (q): chỉ có tiến độ nhiệm vụ, túi đồ và danh sách chùa đã viếng giữ nguyên
  if (data.q) {
    if (!S.profile) return;
    const q = new Map(data.q.map((x) => [x[0], x]));
    data = { ...S.profile, user: data.user, quests: S.profile.quests.map((o) => { const x = q.get(o.id); return x ? { ...o, progress: x[1], claimed: !!x[2], done: !!x[3] } : o; }) };
  }
  S.profile = { user: data.user, account: data.account || S.profile?.account, inventory: data.inventory, quests: data.quests, visited: data.visited };
  renderHud();
  applyQuy(prev);
  if (S.world && prev && JSON.stringify([prev.appearance, prev.equipped]) !== JSON.stringify([data.user.appearance, data.user.equipped])) S.world.setPlayerLook(data.user);
  S.sheetRender?.();
}

// Xử lý phần thưởng / thăng cấp / nhiệm vụ trả về từ server
function handleResult(r, { silent = false } = {}) {
  if (!r) return;
  setProfile(r);
  if (r.gained && !silent) floater(`+${r.gained} công đức`);
  for (const id of r.questsDone || []) {
    const q = S.profile.quests.find((x) => x.id === id);
    if (q) setTimeout(() => toast(`<svg class="i"><use href="#i-check"/></svg> Hoàn thành: <b>${esc(q.name)}</b><br><small>Mở <svg class="i"><use href="#i-scroll"/></svg> Nhiệm vụ để nhận thưởng</small>`), 300);
  }
  if (r.levelUps?.length) celebrateLevel(r.levelUps.at(-1));
  if (r.extra?.abbotGift) abbotGiftModal(r.extra.abbotGift);
}
// Thầy trụ trì tặng tăng bào khi thiền hoặc đi dạo đủ lâu
function abbotGiftModal(id) {
  const it = S.items[id], abbot = ABBOTS[S.temple?.id] || 'Thầy trụ trì';
  Sound.success?.(); petalShower(30);
  modal(`<div class="big">${ic('lotus')}</div><h3>${esc(abbot)} tặng bạn ${esc(it?.name || 'tăng bào')}</h3>
    <p>Thầy thấy con tinh tấn đã lâu, xin tặng con tấm tăng bào này. Nam mô A Di Đà Phật.</p>
    <button class="btn gold" id="mEq">Mặc ngay</button><button class="btn ghost" id="mX">Để sau</button>`, (m) => {
    m.querySelector('#mX').onclick = closeModal;
    m.querySelector('#mEq').onclick = async () => { closeModal(); try { setProfile(await post('/equip', { item: id })); } catch (e) { toast(e.message); } };
  });
}

const honorChip = (u) => (u?.honor ? `<span class="honor">${ic('spark')} ${esc(u.honor)}</span>` : '');
const legendText = (a) => (a.title ? `có duyên nhận danh hiệu <b>${esc(a.title)}</b>` : `có duyên nhận <b>${esc(a.label)}</b>`);
const shareLegend = (a) => {
  const what = a.title ? `danh hiệu ${a.title}` : a.label;
  openShare(`Có duyên nhận ${what}`, { url: `${location.origin}/s/${a.uid}/a/${a.id}`, text: `${S.profile.user.name} có duyên nhận ${what} (${a.story}) tại Niệm Phật Online. Cùng lên chùa với mình nhé!` });
};
// Người nhận thấy thẻ chúc mừng có nút Khoe; người khác thấy dải thông báo, không che màn hình
function onLegend(a) {
  if (a.uid === S.profile?.user.id) {
    api('/me').then(setProfile).catch(() => {});
    Sound.success(); setTimeout(() => Sound.bigBell(), 400);
    petalShower(60, ['🌸', '✨', '🐉', '🏮']);
    S.world?.glow(a.uid);
    const gifts = [a.itemName, a.sen ? `${a.sen} Sen` : '', ...Object.entries(a.items).map(([k, n]) => `${n} ${S.items[k]?.name || k}`)].filter(Boolean).join(', ');
    modal(`<div class="big">${ic('spark')}</div><div class="legend-kicker">Duyên truyền thuyết · ${esc(a.story)}</div>
      <h3 class="legend-name">${esc(a.title || a.label)}</h3>
      <p>${esc(a.line)}</p>
      ${a.title ? `<p class="muted">Bạn là người thứ <b>${a.no}/${a.cap}</b> mang danh hiệu này. Mọi người sẽ thấy danh hiệu trên đầu nhân vật của bạn.</p>` : ''}
      ${gifts ? `<p>Đã vào tài khoản: <b>${esc(gifts)}</b></p>` : ''}
      <button class="btn gold" id="mShare">Khoe ngay ${ic('spark')}</button><button class="btn ghost" id="mClose">Hồi hướng công đức ${ic('pray')}</button>`, (el) => {
      el.querySelector('#mClose').onclick = closeModal;
      el.querySelector('#mShare').onclick = () => { closeModal(); shareLegend(a); };
    });
    return;
  }
  Sound.chime?.();
  document.querySelector('.legend-banner')?.remove();
  const el = document.createElement('div');
  el.className = 'legend-banner';
  el.innerHTML = `${ic('spark')}<div><b>${esc(a.name)}</b> ${legendText(a)}<small>Duyên truyền thuyết · ${esc(a.story)}</small></div>`;
  document.body.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 500); }, 7000);
}

// Người khác kết duyên linh thú: thường thì không chen ngang thông báo đang hiện, quý hiếm thì hiện ngay
function onPetBond(p) {
  if (p.uid === S.profile?.user.id) return;
  const old = document.querySelector('.legend-banner');
  if (old && p.rank === 'thuong') return;
  old?.remove();
  const it = S.items[p.item];
  Sound.chime?.();
  const el = document.createElement('div');
  el.className = `legend-banner pet-banner rank-${p.rank}`;
  el.innerHTML = `<span class="pet-banner-pic">${itemIcon(it)}</span><div><b>${esc(p.name)}</b> vừa kết duyên với <b>${esc(it?.name || 'linh thú')}</b><small>${PET_RANK[p.rank] || ''} · ${esc(p.templeName || 'Sân chùa')}</small></div>`;
  document.body.appendChild(el);
  paintThumbs(el, S.items, S.profile.user.appearance);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 500); }, 7000);
}
// Chính mình kết duyên được loài mới
function celebrateBond(r, it) {
  const rare = ['hiem', 'toi_thuong'].includes(it.data.rank);
  Sound.success(); setTimeout(() => Sound.bigBell(), 400);
  petalShower(rare ? 70 : 40, ['🌸', '✨', '🪷', '🏮']);
  S.world?.glow(S.profile.user.id);
  modal(`<div class="legend-kicker">Kết duyên thành công · ${PET_RANK[it.data.rank] || 'Linh thú'}</div>
    <div class="bond-pic rank-${it.data.rank}">${itemIcon(it)}</div>
    <h3 class="legend-name">${esc(it.name)}</h3>
    <p>${esc(it.description.split('.')[0])}.</p>
    <p class="muted">Đã về Sổ linh thú · hôm nay còn ${r.left} lượt kết duyên</p>
    <button class="btn gold" id="mEq">Cho đi cùng</button><button class="btn gold" id="mShare">Khoe ngay ${ic('spark')}</button><button class="btn ghost" id="mOk">Để sau</button>`, (el) => {
    el.querySelector('#mOk').onclick = closeModal;
    el.querySelector('#mShare').onclick = () => { closeModal(); openShare(`Tôi vừa kết duyên với ${it.name}`); };
    el.querySelector('#mEq').onclick = async () => { closeModal(); try { setProfile(await post('/equip', { item: r.item })); } catch (e) { toast(e.message); } };
    paintThumbs(el, S.items, S.profile.user.appearance);
  });
}

function celebrateLevel(l) {
  Sound.success(); setTimeout(() => Sound.bigBell(), 400);
  petalShower(48);
  S.world?.glow(S.profile.user.id);
  S.world?.setHalo?.(S.world.player, l.level);
  sendWs({ t: 'emote', e: 'sen' });
  modal(`
    <div class="big"><svg class="i"><use href="#i-sen"/></svg></div>
    <h3>Thăng cấp ${l.level}!</h3>
    <p>Bạn đã đạt <b>${esc(l.title)}</b><br>Phần thưởng: <svg class="i"><use href="#i-sen"/></svg> ${l.sen} Sen</p>
    <button class="btn gold" id="mShare">Khoe ngay <svg class="i"><use href="#i-spark"/></svg></button>
    <button class="btn ghost" id="mClose">Tiếp tục tu tập</button>`, (el) => {
    el.querySelector('#mClose').onclick = closeModal;
    el.querySelector('#mShare').onclick = () => { closeModal(); openShare(`Vừa thăng cấp ${l.level}!`); };
  });
}

// Quà hệ thống: popup cùng kiểu thăng cấp. Quà trực tiếp đã vào tài khoản, quà trong thư phải mở hòm thư để nhận.
const giftPopup = (title, lines, note, buttons, onReady, pic) => {
  if (S.coaching) return setTimeout(() => giftPopup(title, lines, note, buttons, onReady, pic), 2000); // đợi xong hướng dẫn tân thủ
  Sound.success?.(); petalShower(36);
  modal(`
    ${pic || '<div class="big"><svg class="i"><use href="#i-sen"/></svg></div>'}
    <h3>${title}</h3>
    <p>${lines.join('<br>')}${note ? `<br><i>“${esc(note)}”</i>` : ''}</p>
    ${buttons}`, onReady);
};
const shownGifts = new Set();
async function showAdminGifts(gifts) {
  try { setProfile(await api('/me')); } catch {}
  for (const g of gifts) {
    if (shownGifts.has(g.id)) continue;
    shownGifts.add(g.id);
    const it = g.item && Object.values(S.items).find((i) => i.name === g.item); // hiện đúng hình vật phẩm, giống cửa hàng
    const lines = [g.sen && `${ic('sen')} ${fmt(g.sen)} Sen`, g.ngoc && `${ic('ngoc')} ${fmt(g.ngoc)} Ngọc`, g.item && `<b>${g.qty} ${esc(g.item)}</b>`].filter(Boolean);
    giftPopup('Bạn nhận được quà!', ['Niệm Phật Online vừa tặng bạn:', ...lines, 'Quà đã vào tài khoản của bạn.'], g.note, `
      <button class="btn gold" id="mShare">Khoe ngay ${ic('spark')}</button>
      <button class="btn ghost" id="mClose">Tiếp tục tu tập</button>`, (el) => {
      sendWs({ t: 'giftSeen', id: g.id });
      if (it) paintThumbs(el, S.items, S.profile.user.appearance);
      el.querySelector('#mClose').onclick = closeModal;
      el.querySelector('#mShare').onclick = () => { closeModal(); openShare('Vừa nhận quà từ Niệm Phật Online!'); };
    }, it && `<div class="gift-pic">${itemIcon(it)}</div>`);
  }
}
/* ---------- Vòng quay lộc mỗi ngày ---------- */
// Bản sao trong localStorage chỉ để bớt gọi máy chủ; mọi quyết định thưởng vẫn do máy chủ kiểm tra
const vnDay = () => new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
const keep = (k, v) => { try { local.set(k, v); } catch {} }; // đầy bộ nhớ hoặc trình duyệt chặn thì thôi, lần sau gọi máy chủ
async function refreshWheel(force) {
  const key = `wheel:${S.profile?.user.id}`, c = force ? null : local.get(key);
  try {
    if (c?.day === vnDay()) S.wheel = c.data; // mỗi ngày quay một lượt: trong ngày chỉ đổi khi quay, lúc đó gọi force
    else { S.wheel = await api('/wheel'); keep(key, { day: vnDay(), data: S.wheel }); }
    $('wheelBadge').classList.toggle('hidden', !S.wheel.can); $('wheelBadge').textContent = S.wheel.can ? '1' : '';
  } catch {}
}
// Khung nổi dưới màn hình như tụng kinh, tràng hạt: cảnh chùa vẫn chạy phía trên
let wheelSpinning = false;
async function openWheel() {
  await refreshWheel(true);
  if (!S.wheel) return toast('Chưa tải được vòng quay, bạn thử lại nhé');
  const { segs, can, rareLevel, rareCap } = S.wheel, step = 360 / segs.length;
  const stops = segs.map((_, i) => `${i % 2 ? '#f6e3b4' : '#fff6e0'} ${i * step}deg ${(i + 1) * step}deg`).join(',');
  $('wheelBox').innerHTML = `<div class="wheel-wrap"><i class="wheel-pin"></i><div class="wheel" id="wheel" style="background:conic-gradient(${stops})">
      ${segs.map((s, i) => `<span style="transform:rotate(${(i + 0.5) * step}deg)"><b>${esc(s.label)}</b></span>`).join('')}</div></div>
    <div class="wheel-side">
      <h3>Vòng quay lộc</h3>
      <button class="btn gold" id="wSpin" ${can ? '' : 'disabled'}>${can ? 'Quay ngay' : 'Hôm nay đã quay, mai quay tiếp nhé'}</button>
      <p class="wheel-odds">Mỗi ngày 1 lượt miễn phí. Tỉ lệ: ${segs.map((s) => `${esc(s.label)} ${s.pct}%`).join(', ')}. Đồ quý cần cấp ${rareLevel} trở lên, toàn server tối đa ${rareCap} món/ngày; nếu không đủ điều kiện sẽ nhận 50 Sen.</p>
    </div>`;
  S.view = 'wheel';
  show('hud', false); show('lanternLayer', false); show('wheelView');
  const btn = $('wSpin');
  btn.onclick = async () => {
    btn.disabled = true; wheelSpinning = true;
    let r;
    try { r = await post('/wheel'); } catch (e) { btn.disabled = false; wheelSpinning = false; return toast(esc(e.message)); }
    $('wheel').style.transform = `rotate(${360 * 6 + 360 - (r.idx + 0.5) * step}deg)`;
    setTimeout(() => { wheelSpinning = false; wheelResult(r, segs[r.idx].label); }, 4300);
  };
}
function leaveWheel() {
  if (wheelSpinning || S.view !== 'wheel') return;
  show('wheelView', false); show('lanternLayer'); resumeHall();
}
$('btnWheelBack').onclick = leaveWheel;
async function wheelResult(r, label) {
  try { setProfile(await api('/me')); } catch {}
  refreshWheel(true);
  leaveWheel();
  const it = r.item && S.items[r.item];
  const lines = [r.rare ? 'Bạn quay trúng đồ quý:' : 'Vòng quay lộc tặng bạn:', it ? `<b>${esc(it.name)}</b>` : `${ic('sen')} ${esc(label)}`, 'Quà đã vào tài khoản của bạn.'];
  giftPopup(r.rare ? 'Đại cát đại lợi!' : 'Chúc mừng bạn!', lines, null, `
    <button class="btn gold" id="mShare">Khoe ngay ${ic('spark')}</button>
    <button class="btn ghost" id="mClose">Tiếp tục tu tập</button>`, (el) => {
    if (it) paintThumbs(el, S.items, S.profile.user.appearance);
    el.querySelector('#mClose').onclick = closeModal;
    el.querySelector('#mShare').onclick = () => { closeModal(); openShare(it ? `Vừa quay trúng ${it.name}!` : 'Vừa quay lộc ở Niệm Phật Online!'); };
  }, it && `<div class="gift-pic">${itemIcon(it)}</div>`);
}
function mailGiftPopup(lines, note) {
  giftPopup('Bạn có quà trong hòm thư!', [...lines, 'Mở hòm thư để nhận quà nhé.'], note, `
    <button class="btn gold" id="mOpen">Mở hòm thư ${ic('mail')}</button>
    <button class="btn ghost" id="mClose">Để sau</button>`, (el) => {
    el.querySelector('#mClose').onclick = closeModal;
    el.querySelector('#mOpen').onclick = () => { closeModal(); setTimeout(openMail, 260); };
  });
}

/* =====================================================================
   HUD
   ===================================================================== */
function renderHud() {
  $('btnPet')?.classList.toggle('wait', !hasPet());
  const u = S.profile.user, sect = sectOf(u.sect);
  $('meName').textContent = u.name;
  $('meTitle').innerHTML = `${u.honor ? `<span class="honor-t">${esc(u.honor)}</span>` : esc(u.title)}${u.streak ? ` · ${ic('fire')}${u.streak}` : ''}`;
  $('meLv').textContent = u.level;
  $('meAva').innerHTML = u.avatar ? `<img src="${u.avatar}" alt="">` : sect.icon; $('meAva').style.background = sect.color;
  $('meAva').style.background = sect.color;
  $('meXp').style.width = u.expNext ? Math.min(100, (u.exp / u.expNext) * 100) + '%' : '100%';
  $('wSen').textContent = fmt(u.sen);
  $('wNgoc').textContent = fmt(u.ngoc);
  const claimable = S.profile.quests.filter((q) => q.done && !q.claimed).length;
  $('qBadge').textContent = claimable; show('qBadge', claimable > 0);
  $$('[data-qty]').forEach((b) => (b.textContent = '×' + qty(b.dataset.qty)));
  const buff = u.buffUntil - Date.now();
  show('buffBadge', buff > 0);
  if (buff > 0) $('buffBadge').innerHTML = `<svg class="i"><use href="#i-incense"/></svg> Hương trầm +20% · ${Math.ceil(buff / 60000)} phút`;
}
setInterval(() => { if (S.profile && S.view === 'hall') renderHud(); }, 30000);

function renderBowBtn() {
  $('btnBow').classList.toggle('on', S.bow === 'bowing');
  $('btnBow').classList.toggle('wait', S.bow === 'stopping');
  $('bowLabel').textContent = S.bow === 'bowing' ? 'Dừng lạy' : S.bow === 'stopping' ? 'Đang dừng…' : 'Lạy Phật';
}

/* =====================================================================
   KHỞI ĐỘNG
   ===================================================================== */
// iPhone: sau khi gõ phím (đăng nhập, đặt tên) Safari có thể để trang lệch lên trên, phần đầu các màn bị che mất nút đóng
const fixViewport = () => { if (scrollY || document.documentElement.scrollTop || document.body.scrollTop) { scrollTo(0, 0); document.documentElement.scrollTop = 0; document.body.scrollTop = 0; } };
addEventListener('focusout', () => setTimeout(fixViewport, 80));
addEventListener('scroll', () => { if (!document.activeElement?.matches?.('input,textarea,select')) fixViewport(); }, { passive: true });
visualViewport?.addEventListener('resize', () => setTimeout(fixViewport, 80));
async function boot() {
  injectIcons();
  const bb = (p) => $('bootBar') && ($('bootBar').style.width = p + '%');
  bb(15);
  try {
    const build = document.querySelector('meta[name=build]')?.content, cm = local.get('meta');
    // giữ 5 phút và chỉ dùng cho đúng bản web này; đồng hồ máy chủ tính tiếp theo thời gian đã trôi
    if (cm?.build === build && build && Date.now() - cm.at < 300e3 && Date.now() >= cm.at) S.meta = { ...cm.data, serverNow: cm.data.serverNow + Date.now() - cm.at };
    else { S.meta = await api('/meta'); keep('meta', { at: Date.now(), build, data: S.meta }); }
    bb(55);
  } catch {
    $('bootMsg').textContent = 'Không kết nối được máy chủ. Vui lòng thử lại.';
    return;
  }
  for (const sc of Object.values(S.meta.sects)) sc.icon = ic('sect-' + sc.id);
  S.items = Object.fromEntries(S.meta.items.map((i) => [i.id, i]));
  const ref = new URLSearchParams(location.search).get('ref');
  if (ref) local.set('ref', ref);
  // nguồn người dùng: chỉ giữ lần đầu đến trang, gửi kèm khi tạo nhân vật
  if (!local.get('src')) {
    const q = new URLSearchParams(location.search);
    local.set('src', { u: q.get('utm_source') || '', m: q.get('utm_medium') || '', c: q.get('utm_campaign') || '', r: document.referrer || '', fb: q.has('fbclid'), g: q.has('gclid'), tt: q.has('ttclid') });
  }

  if (token.get()) {
    try {
      setProfile(await api('/me')); bb(100);
      await new Promise((r) => setTimeout(r, 250));
      $('welcomeText').innerHTML = `A Di Đà Phật, <b>${esc(S.profile.user.name)}</b><br>${esc(S.profile.user.title)}`;
      show('boot', false); show('welcome');
      $('btnEnter').onclick = () => { Sound.init(); show('welcome', false); const last = local.get('temple'); enterTemple(S.meta.temples.find((t) => t.id === last) ? last : S.meta.temples[0].id); };
      return;
    } catch (e) {
      if (e.status === 401) token.clear();
      else if (e.status === 403) { $('bootMsg').textContent = 'Tài khoản đã bị khoá.'; return; }
    }
  }
  show('boot', false);
  openSetup('new');
}

/* =====================================================================
   TẠO / SỬA NHÂN VẬT (12 NHÂN VẬT 3D NARUTO × ONE PIECE)
   ===================================================================== */
const setup = { step: 2, mode: 'new', ap: { hero: 'luffy_g5', outfit: 'sansa_sage', gender: 'nam', hair: 'ngan', skin: '#f5cba7' }, robe: 'ao_lam', sect: 'tinhdo', temple: null };
let preview;

// Tọa độ cắt ảnh tham khảo 4 cột x 3 hàng (characters-naruto-online.jpg)
const HERO_SPRITE_POS = {
  luffy_g5: '0% 0%',
  naruto_sage: '33.33% 0%',
  zoro: '66.66% 0%',
  sasuke: '100% 0%',
  sanji: '0% 50%',
  kakashi: '33.33% 50%',
  law: '66.66% 50%',
  itachi: '100% 50%',
  ace: '0% 100%',
  shanks: '33.33% 100%',
  minato: '66.66% 100%',
  kaido: '100% 100%',
};

function renderHeroGrid(container, currentHero, onSelect) {
  if (!container) return;
  container.innerHTML = HERO_LIST.map((h) => `
    <button type="button" class="hero-card ${h.id === currentHero ? 'on' : ''}" data-hero="${h.id}">
      <span class="hc-thumb" style="background-position:${HERO_SPRITE_POS[h.id] || '0% 0%'}"></span>
      <span class="hc-meta">
        <b>${esc(h.name)}</b>
        <small>${esc(h.title)}</small>
      </span>
    </button>
  `).join('');
  $$('.hero-card', container).forEach((btn) => {
    btn.onclick = () => {
      const h = HERO_MAP[btn.dataset.hero] || HERO_LIST[0];
      $$('.hero-card', container).forEach((x) => x.classList.toggle('on', x === btn));
      onSelect(h);
    };
  });
}

function renderOutfitGrid(container, currentOutfit, onSelect) {
  if (!container) return;
  const cur = currentOutfit || 'default';
  container.innerHTML = OUTFIT_LIST.map((o) => `
    <button type="button" class="outfit-card ${o.id === cur ? 'on' : ''}" data-outfit="${o.id}" title="${esc(o.desc)}">
      <span class="oc-swatch" style="background:${o.swatch}">${o.icon}</span>
      <span class="oc-meta">
        <b>${esc(o.name)}</b>
        <small>${esc(o.badge)} · ${esc(o.desc)}</small>
      </span>
    </button>
  `).join('');
  $$('.outfit-card', container).forEach((btn) => {
    btn.onclick = () => {
      const o = OUTFIT_MAP[btn.dataset.outfit] || OUTFIT_LIST[0];
      $$('.outfit-card', container).forEach((x) => x.classList.toggle('on', x === btn));
      onSelect(o);
    };
  });
}

function initPreview() {
  if (preview) return;
  const canvas = $('previewCanvas');
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  r.setPixelRatio(Math.min(devicePixelRatio, 2));
  r.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#fff6e5', '#3a4838', 1.45));
  const key = new THREE.DirectionalLight('#ffe8b8', 2.4); key.position.set(2.2, 4.2, -4); scene.add(key);
  const rim = new THREE.PointLight('#00f0ff', 7, 9); rim.position.set(-2.2, 2.5, 2.2); scene.add(rim);
  const cush = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.14, 32), new THREE.MeshStandardMaterial({ color: '#242b23', metalness: 0.5, roughness: 0.4 }));
  cush.position.y = -0.07; scene.add(cush);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.025, 8, 48), new THREE.MeshBasicMaterial({ color: '#ffd36b' }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.01; scene.add(ring);
  const halo = new THREE.Mesh(new THREE.CircleGeometry(1.65, 48), new THREE.MeshBasicMaterial({ color: '#f6c060', transparent: true, opacity: 0.14 }));
  halo.position.set(0, 1.15, 0.8); scene.add(halo);
  const cam = new THREE.PerspectiveCamera(36, 1, 0.1, 50);
  cam.position.set(0, 1.38, -4.2); cam.lookAt(0, 0.92, 0);
  preview = { r, scene, cam, av: null, rot: Math.PI, drag: null, halo };
  canvas.addEventListener('pointerdown', (e) => (preview.drag = e.clientX));
  addEventListener('pointerup', () => (preview.drag = null));
  canvas.addEventListener('pointermove', (e) => { if (preview.drag !== null) { preview.rot += (e.clientX - preview.drag) * 0.01; preview.drag = e.clientX; } });
  const clock = new THREE.Clock();
  const loop = () => {
    if (S.view !== 'setup') return;
    const dt = clock.getDelta();
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (r.domElement.width !== Math.floor(w * r.getPixelRatio())) { r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    if (preview.av) {
      if (preview.drag === null) preview.rot += dt * 0.45;
      preview.av.root.rotation.y = preview.rot;
      animateAvatar(preview.av, dt, clock.elapsedTime, false);
    }
    halo.lookAt(cam.position);
    r.render(scene, cam);
    requestAnimationFrame(loop);
  };
  preview.loop = loop;
}
function rebuildPreview(playAction = false) {
  if (!preview) return;
  if (preview.av) preview.scene.remove(preview.av.root);
  const robe = S.items[setup.robe]?.data;
  const beads = S.items[S.profile?.user?.equipped?.beads || 'chuoi_go']?.data;
  const heroId = setup.ap.hero || 'luffy_g5';
  const outfitId = setup.ap.outfit || 'default';
  const heroDef = HERO_MAP[heroId] || HERO_LIST[0];
  const outfitDef = OUTFIT_MAP[outfitId] || OUTFIT_LIST[0];
  preview.av = makeAvatar({ hero: heroId, outfit: outfitId, appearance: setup.ap, robe: robe && { color: robe.color, sash: robe.sash }, beads });
  setSeated(preview.av, false);
  preview.av.meditating = false;
  if (outfitDef.wideSleeves || outfitDef.djGear) {
    setDancing(preview.av, true);
  }
  if (playAction) triggerUltimate(preview.av);
  preview.scene.add(preview.av.root);
  const badge = $('previewHeroBadge');
  if (badge) badge.innerHTML = `🦸 <b>${esc(heroDef.name)}</b> · 👘 <b>${esc(outfitDef.name)}</b> · Kéo để xoay 360°`;
}

function chipGroup(id, value, onPick) {
  $$(`#${id} button`).forEach((b) => {
    b.classList.toggle('on', b.dataset.v === value);
    b.onclick = () => { $$(`#${id} button`).forEach((x) => x.classList.remove('on')); b.classList.add('on'); onPick(b.dataset.v); rebuildPreview(); };
  });
}


// Thỉnh Phật ban tên: client ghép ngẫu nhiên 2 đến 4 chữ, máy chủ kiểm tra lại lúc đăng ký (giữ danh sách khớp server/names.js)
const NAME_WORDS = 'An Ái Ân Anh Ánh Bách Bạch Bảo Băng Bình Bích Bồ Cát Cẩm Cầm Chánh Châu Chân Chí Chiêu Chính Chơn Chung Công Cúc Cung Cường Dạ Danh Dao Diên Diễm Diệp Diệu Doanh Du Duy Duyên Dũng Dung Dương Đại Đan Đào Đạo Đạt Đăng Điền Điệp Định Đoan Đông Đức Gia Giác Giang Giao Hà Hạ Hải Hàm Hân Hạnh Hào Hảo Hằng Hậu Hiên Hiền Hiển Hiệp Hiếu Hinh Hoa Hòa Hoài Hoan Hoàng Hồng Huân Huệ Hùng Hưng Hương Hữu Huy Huyền Huỳnh Hy Hỷ Kha Khả Khai Khang Khánh Khiêm Khiết Khoa Khôi Khởi Khuê Khương Kiên Kiến Kiều Kim Kính Kỳ Lạc Lam Lâm Lan Lãng Lễ Liên Liêm Linh Lĩnh Long Lộc Lợi Luân Lương Lưu Ly Mai Mẫn Mạnh Mây Miên Minh Mộc Mộng Mỹ Nam Nga Ngân Nghi Nghĩa Nghiêm Ngọc Nguyên Nguyệt Nhã Nhạc Nhàn Nhân Nhật Nhi Nhiên Nhu Như Nhuận Nhung Ninh Oanh Pháp Phi Phong Phú Phúc Phụng Phương Phước Quân Quang Quảng Quế Quý Quyên Quỳnh Sa San Sang Sen Sơn Song Sương Tâm Tài Tấn Tân Thái Thanh Thành Thảo Thắm Thăng Thiên Thiền Thiện Thịnh Thọ Thông Thu Thuận Thục Thùy Thủy Thư Thương Thường Thy Tiên Tiến Tiệp Tín Tinh Tịnh Toàn Trà Trang Trâm Trân Trí Trinh Trúc Trung Trường Tú Tuấn Tuệ Tùng Tường Tuyền Tuyết Từ Tự Uyên Uy Vân Văn Vi Viên Việt Vinh Vĩnh Vũ Vy Xuân Xuyến Yên Yến Ý Ẩn Ấn Âm Ngộ Ngôn Nguyện Bối Biên Lệ Hội Thuyên Tịch Nghị Sáng Bằng Thoại Thạch Mẫu Bổn Thuần Trừng Tĩnh Hoành Liễu Đình Nhẫn Diệm Cơ Đỉnh Vọng Khanh Tuân Lực Chương Kiệt Mậu Quyền Hoằng Thúy Tuyên Vượng Viễn Vạn Nhạn Tố Thiều Nghiên Quỳ Ngưng Nhất Bửu Tôn Thánh Hòe Thiêm Phấn'.split(' ');
function grantName() {
  let name = '';
  for (let i = 0; i < 40; i++) {
    const r = Math.random(), n = r < 0.03 ? 2 : r < 0.6 ? 3 : 4, words = [];
    while (words.length < n) { const w = NAME_WORDS[Math.floor(Math.random() * NAME_WORDS.length)]; if (!words.includes(w)) words.push(w); }
    name = words.join(' ');
    if (name.length <= 24) break;
  }
  $('fName').value = name; setup.nameSig = 'client';
}
$('btnDice').onclick = () => { $('btnDice').animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 400 }); grantName(); };

// Bộ lọc tên ở client: chép từ bộ lọc trong server/index.js, sửa bên đó thì chép lại
const nameFilter = (() => {
const HOMO = { а: 'a', е: 'e', о: 'o', р: 'p', с: 'c', х: 'x', у: 'y', і: 'i', ј: 'j', ԁ: 'd', ѕ: 's', ɡ: 'g', ν: 'v', ο: 'o', α: 'a', ε: 'e', ι: 'i', κ: 'k', τ: 't', ƒ: 'f', ʟ: 'l', ɴ: 'n', ᴍ: 'm', ᴅ: 'd', 'ı': 'i' };
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's' };
const normWord = (s) => String(s).normalize('NFKC').toLowerCase().replace(/[​-‍⁠﻿­]/g, '')
  .replace(/[аеорсхуіјԁѕɡνοαειкτƒʟɴᴍᴅı]/g, (c) => HOMO[c] || c).normalize('NFC').replace(/\s+/g, ' ').trim();
const normText = (s) => retone(normWord(s));
const TONE_O = { ò: 'à', ó: 'á', ỏ: 'ả', õ: 'ã', ọ: 'ạ' }, TONE_OE = { ò: 'è', ó: 'é', ỏ: 'ẻ', õ: 'ẽ', ọ: 'ẹ' }, TONE_U = { ù: 'ỳ', ú: 'ý', ủ: 'ỷ', ũ: 'ỹ', ụ: 'ỵ' };
const retone = (s) => s.replace(/([òóỏõọ])([ae])(?![\p{L}])/gu, (m, o, v) => 'o' + (v === 'a' ? TONE_O[o] : TONE_OE[o]))
  .replace(/([ùúủũụ])y(?![\p{L}])/gu, (m, u) => 'u' + TONE_U[u]);
const parseWords = (v) => [...new Set(String(v || '').split(/[\n,]/).map(normWord).filter(Boolean))];
const keyWords = (list) => [...new Set(list.map(normText).filter(Boolean))];
const unaccent = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').normalize('NFC');
const squeeze = (s) => s.replace(/(\p{L})\1+/gu, '$1'); // "folllloow" → "folow"
const squash = (s) => s.replace(/[^\p{L}]/gu, ''); // bỏ mọi thứ không phải chữ cái
const escRe = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordsRe = (words) => words.length ? new RegExp(`(?<![\\p{L}\\p{N}])(?:${words.map((w) => escRe(w).replace(/ /g, '\\s+')).join('|')})(?![\\p{L}\\p{N}])`, 'u') : null;
const anyRe = (words) => words.length ? new RegExp(words.map(escRe).join('|'), 'u') : null;
const mixedRe = (words) => words.length ? new RegExp(`(?<![\\p{L}\\p{N}])(?:${words.map((w) => [...w].map((c) => {
  const b = unaccent(c); return c === ' ' ? '\\s+' : b !== c ? `[${c}${b}]` : escRe(c);
}).join('')).join('|')})(?![\\p{L}\\p{N}])`, 'gu') : null;
function makeMatcher(words, { fuzzy = false } = {}) {
  const plain = [...new Set(words.map(unaccent).filter((w) => w.includes(' ') || w.length >= 5))];
  const long = [...new Set(words.map(squash).filter((w) => w.length >= 6))];
  return {
    re: wordsRe(words),
    sq: wordsRe([...new Set(words.map(squeeze).filter((w) => w.replace(/ /g, '').length >= 3))]),
    plain: wordsRe(plain),
    long: anyRe(long), longPlain: anyRe([...new Set(long.map(unaccent))]), fuzzy,
    // cụm nhiều chữ gõ thiếu dấu một phần ("To Nâm" ~ "tô nâm"): mỗi chữ có dấu khớp chính nó hoặc bản không dấu
    mixed: mixedRe(words.filter((w) => w.includes(' ') && w !== unaccent(w))),
  };
}
const LINK_RE = /https?:|www\.|t\.me\/|(?<![\p{L}\p{N}])[\p{L}\p{N}-]{2,}\s?(?:\.|\(\.\)|\[\.\]|chấm|cham|dot)\s?(?:com|net|org|vn|me|io|xyz|info|top|shop|site|link|ly|gg|tv|co|cc|pro|online|store|app)(?![\p{L}])/iu;
const PHONE_RE = /(?:\+?84|0)\d{8,10}|\d{9,}/;
function variantsOf(raw) {
  const t = normText(raw);
  const leet = t.replace(/(?<=\p{L})[013457@$]+(?=\p{L})|(?<=\p{L})[0134@$](?![\p{L}\p{N}])|(?<![\p{L}\p{N}])[@$](?=\p{L})/gu, (m) => [...m].map((c) => LEET[c] || c).join(''));
  const joinBy = (src, sep) => src.replace(new RegExp(`(?<![\\p{L}\\p{N}])\\p{L}(?:${sep}\\p{L}(?![\\p{L}\\p{N}])){2,}`, 'gu'), (m) => m.replace(/[^\p{L}]/gu, ''));
  const vs = new Set([t, leet]);
  for (const v of [t, leet]) { vs.add(joinBy(v, '[._\\-*+,~|/]{1,3}')); vs.add(joinBy(v, '\\s{1,3}')); }
  return { t, list: [...vs] };
}
function matches(m, raw) {
  const { t, list } = variantsOf(raw);
  if (m.re && list.some((v) => m.re.test(v))) return true;
  if (m.sq && list.some((v) => m.sq.test(squeeze(v)))) return true;
  const noAccent = m.fuzzy || t === unaccent(t);
  if (m.plain && noAccent && list.some((v) => m.plain.test(m.fuzzy ? unaccent(v) : v))) return true;
  if (m.long && list.some((v) => m.long.test(squash(v)))) return true;
  if (m.mixed && list.some((v) => [...v.matchAll(m.mixed)].some((x) => x[0] !== unaccent(x[0])))) return true;
  if (m.longPlain && noAccent && list.some((v) => m.longPlain.test(squash(v)))) return true;
  return false;
}
  return (rule) => {
    const w = makeMatcher(keyWords(rule.words)), n = makeMatcher(keyWords(rule.names), { fuzzy: true });
    return (raw) => {
      if (matches(w, raw) || matches(n, raw)) return true;
      const t = normWord(raw);
      if (LINK_RE.test(t) || LINK_RE.test(t.replace(/(?<=\p{L})\s*[.]\s*(?=\p{L})/gu, '.'))) return true;
      return PHONE_RE.test(t.replace(/(?<=\d)[\s.\-_,()]+(?=\d)/g, ''));
    };
  };
})();
let nameRule = null; // { fee, bad } khi đang sửa nhân vật
async function loadNameRule() {
  nameRule = null;
  let hint = $('fNameHint');
  if (!hint) { hint = document.createElement('small'); hint.id = 'fNameHint'; hint.style.cssText = 'display:block;margin-top:4px;opacity:.75'; $('fName').closest('.name-row').after(hint); }
  hint.textContent = '';
  $('fName').readOnly = true; show('btnDice', false);
  try {
    const r = await api('/me/name-rule');
    nameRule = { fee: r.fee, bad: nameFilter(r) };
    const left = r.fee.nextAt - Date.now();
    if (setup.mode !== 'edit') return;
    if (left > 0) { hint.textContent = `Bạn đổi tên lại được sau ${Math.ceil(left / 864e5)} ngày`; return; }
    $('fName').readOnly = false; show('btnDice');
    hint.textContent = r.fee.why === 'first' ? `Lần đổi tên đầu miễn phí, các lần sau ${r.fee.ngoc || 20} Ngọc.`
      : r.fee.ngoc ? `Mỗi lần đổi tên ${r.fee.ngoc} Ngọc. Mời từ ${r.freeRefs} bạn thật (cấp 3 trở lên) thì được miễn phí.`
      : 'Bạn được đổi tên miễn phí, 7 ngày một lần.';
  } catch { hint.textContent = 'Chưa tải được quy định đổi tên, bạn mở lại nhé'; }
}

function openSetup(mode) {
  prepareProof();
  setup.mode = mode;
  setup.step = 2;
  if (mode === 'edit') {
    const u = S.profile.user;
    setup.ap = { hero: 'luffy_g5', ...u.appearance };
    setup.robe = u.equipped.robe;
    $('fName').value = u.name;
    setup.nameSig = '';
  } else {
    setup.ap.hero ||= 'luffy_g5';
    if (!setup.nameSig) grantName();
  }
  $('fName').readOnly = false;
  const hint0 = $('fNameHint'); if (hint0) hint0.textContent = '';
  if (mode === 'edit') loadNameRule(); else show('btnDice');
  S.view = 'setup';
  show('hud', false); show('setup');
  initPreview(); rebuildPreview(); requestAnimationFrame(preview.loop);
  renderHeroGrid($('fHeroGrid'), setup.ap.hero, (h) => {
    setup.ap.hero = h.id;
    setup.ap.skin = h.skin;
    Sound.chime?.();
    rebuildPreview(true);
  });
  renderOutfitGrid($('fOutfitGrid'), setup.ap.outfit || 'default', (o) => {
    setup.ap.outfit = o.id;
    Sound.chime?.();
    rebuildPreview(true);
  });
  chipGroup('fGender', setup.ap.gender, (v) => (setup.ap.gender = v));
  chipGroup('fHair', setup.ap.hair, (v) => (setup.ap.hair = v));
  chipGroup('fRobe', setup.robe, (v) => (setup.robe = v));
  show('fRobeWrap', mode === 'new');
  show('btnRestore', mode === 'new');
  show('fSectWrap', mode === 'new');
  show('consentWrap', mode === 'new');
  $('setupTitle').textContent = mode === 'edit' ? 'Đổi Hoá Thân 3D & Hồ Sơ' : 'Chọn Nhân Vật 3D & Vào Chùa';
  $('fMore').open = false;
  $('fSkin').innerHTML = S.meta.appearance.skin.map((c) => `<button data-v="${c}" style="background:${c}" class="${c === setup.ap.skin ? 'on' : ''}"></button>`).join('');
  $$('#fSkin button').forEach((b) => (b.onclick = () => { setup.ap.skin = b.dataset.v; $$('#fSkin button').forEach((x) => x.classList.toggle('on', x === b)); rebuildPreview(); }));
  renderSetupStep();
}

function renderSetupStep() {
  $$('.step').forEach((s) => show(s, +s.dataset.step === setup.step));
  $$('.steps i').forEach((d, i) => d.classList.toggle('on', i < setup.step));
  show($$('.steps')[0], false);
  $('btnPrev').textContent = setup.mode === 'edit' ? 'Huỷ' : 'Quay lại';
  $('btnPrev').style.visibility = setup.mode === 'new' ? 'hidden' : 'visible';
  show($$('.setup-nav')[0], setup.step === 2);
  $('btnNext').innerHTML = setup.mode === 'edit' ? 'Lưu' : '<svg class="i"><use href="#i-pray"/></svg> Vào chùa';
  if (setup.step === 1) renderServers();
  if (setup.step === 2) {
    warmTemple(setup.temple || S.meta.temples[0].id);
    $('sectList').innerHTML = Object.values(S.meta.sects).map((s) => `
      <button class="sect ${s.id === setup.sect ? 'on' : ''}" data-id="${s.id}" style="--sc:${s.color}">
        <span class="ic">${s.icon}</span><b>${s.name}</b><p>${esc(s.desc)}</p><small>Ưu thế: ${esc(s.bonusText)}</small><span class="link" data-guide="${s.id}">${ic('book')} Tìm hiểu về ${s.name}</span>
      </button>`).join('');
    $$('#sectList [data-guide]').forEach((b) => (b.onclick = (e) => { e.stopPropagation(); openGuide(b.dataset.guide); }));
    $$('#sectList .sect').forEach((b) => (b.onclick = () => { setup.sect = b.dataset.id; $$('#sectList .sect').forEach((x) => x.classList.toggle('on', x === b)); }));
  }
}
const SERVERS = [
  { host: 'chua-xoa-stress', path: './index.html', also: [], name: '🔥 Đi Chùa Xõa Stress 3D – Sansa UI × 12 Nhân Vật 3D', desc: 'Sàn DJ Chú Đại Bi Remix, Đấm Bốc Xả Nghiệp, Đại Mõ Phản Lực & 12 Nhân Vật 3D' },
];
const serverHere = (s) => s.host === 'chua-xoa-stress';
const serverUrl = (s) => s.path || '../index.html';
// Chùa hay máy chủ đầy thì mời sang máy chủ kia; mỗi máy chủ có tiến độ riêng nên phải nói rõ trước khi đi
function serverSwitch() {
  const here = SERVERS.find(serverHere) || SERVERS[0], others = SERVERS.filter((x) => x !== here && !x.closed).reverse(); // máy chủ mới nhất trước, thường còn nhiều chỗ nhất
  return `${others.map((to) => `<a class="btn gold" href="${serverUrl(to)}">Sang ${to.name}</a>`).join('')}<small>Mỗi máy chủ có tiến độ và Ngọc riêng. Nhân vật ở đây vẫn được giữ nguyên.</small>`;
}
function renderServers() {
  const here = SERVERS.find(serverHere) || SERVERS[0], open = SERVERS.filter((s) => !s.closed);
  $('serverList').innerHTML = open.map((s) => `<button class="server" data-host="${s.host}"><span class="server-dot"></span><span class="server-main"><b>${s.name}</b><small>${s.desc}</small></span><span class="server-load" data-load="${s.host}"></span></button>`).join('');
  // Người đã có tài khoản ở máy chủ đóng đăng ký vẫn phải về được máy chủ cũ
  let old = $('serverOld');
  if (!old) { old = document.createElement('div'); old.id = 'serverOld'; old.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:6px;margin-top:12px'; $('serverList').after(old); }
  old.innerHTML = SERVERS.filter((s) => s.closed).map((s) => (s === here ? `<button class="link" data-old-here>Đã có tài khoản ở ${s.name}? Đăng nhập</button>` : `<a class="link" href="https://${s.host}/?login=1">Đã có tài khoản ở ${s.name}? Đăng nhập</a>`)).join('');
  const oldHere = old.querySelector('[data-old-here]');
  if (oldHere) oldHere.onclick = () => $('btnRestore').click();
  if (here.closed && new URLSearchParams(location.search).has('login')) setTimeout(() => $('btnRestore').click());
  $$('#serverList .server').forEach((b) => (b.onclick = () => {
    const s = SERVERS.find((x) => x.host === b.dataset.host);
    if (s === here) { setup.step = 2; renderSetupStep(); } else location.href = serverUrl(s);
  }));
  // Máy không trả lời trong 2 giây coi như đang bận. Máy nhẹ nhất lên đầu; máy đầy, quá tải bị làm mờ, trừ khi không còn máy nào khác.
  Promise.all(open.map(() => api.capacity().catch(() => null))).then((caps) => {
    const list = $('serverList');
    const rows = open.map((s, i) => ({ s, c: caps[i], el: list.querySelector(`[data-load="${s.host}"]`), k: caps[i]?.max ? caps[i].online / caps[i].max : 9 }));
    if (rows.some((r) => !r.el)) return;
    const good = rows.filter((r) => r.k < 1 && !r.c?.busy).sort((x, y) => x.k - y.k);
    const first = good.findIndex((r) => r.c.online < r.s.preferUnder);
    if (first > 0) good.unshift(...good.splice(first, 1));
    for (const r of rows) {
      const off = !good.includes(r), full = r.k >= 1 && r.k < 9;
      r.el.textContent = r.k === 9 ? 'Chưa rõ' : full ? 'Đã đầy' : r.c.busy ? 'Đang đông' : r.k > 0.75 ? 'Đông' : 'Còn chỗ';
      r.el.className = `server-load ${off ? 'full' : r.k > 0.75 ? 'busy' : 'free'}`;
      if (r.c?.max) r.el.closest('.server').querySelector('small').textContent = `${r.s.desc} · ${r.c.online.toLocaleString('vi-VN')} người đang online`;
      if (good.length) r.el.closest('.server').classList.toggle('off', off); // chỉ làm mờ, vẫn bấm được: người đã có tài khoản phải về đúng máy chủ cũ
    }
    if (!good.length) return;
    [...good, ...rows.filter((r) => !good.includes(r))].forEach((r) => list.append(r.el.closest('.server')));
    good[0].el.textContent = 'Nên chọn';
    good[0].el.closest('.server').classList.add('best');
  });
}

$('btnPrev').onclick = () => {
  if (setup.mode === 'edit') { show('setup', false); resumeHall(); return; }
  if (setup.step === 2) { setup.step = 1; renderSetupStep(); }
};
$('btnNext').onclick = async () => {
  const name = $('fName').value.trim();
  if (setup.mode === 'edit') {
    if (name !== S.profile.user.name) {
      if (!nameRule || nameRule.fee.nextAt > Date.now()) { toast('Hiện chưa đổi tên được'); return; }
      if (name.length < 2) { toast('Tên cần ít nhất 2 ký tự'); return; }
      if (nameRule.bad(name)) { toast('Tên có từ ngữ chưa phù hợp, bạn chọn tên khác nhé'); return; }
      const cost = nameRule.fee.ngoc;
      if (cost > S.profile.user.ngoc) { toast(`Đổi tên cần ${cost} Ngọc, bạn đang có ${fmt(S.profile.user.ngoc)} Ngọc. Mời bạn nạp thêm ở Cửa hàng`); return; }
      if (!confirm(`Đổi tên thành "${name}"? ${cost ? `Lần này tốn ${cost} Ngọc.` : 'Lần này miễn phí.'}`)) return;
    }
    try { setProfile(await api('/me', { method: 'PUT', body: { name, nameSig: setup.nameSig, appearance: setup.ap } })); toast('Đã lưu nhân vật'); show('setup', false); resumeHall(); }
    catch (e) { toast(e.message); }
    return;
  }
  if (!$('fConsent').checked) { toast('Bạn hãy tick đồng ý Điều khoản & Chính sách để vào chùa'); $('consentWrap').classList.add('shake'); setTimeout(() => $('consentWrap').classList.remove('shake'), 600); return; }
  Sound.init();
  $('btnNext').disabled = true;
  try {
    const r = await post('/register', { name, nameSig: setup.nameSig, appearance: setup.ap, sect: setup.sect, robe: setup.robe, ref: local.get('ref'), consent: true, source: local.get('src'), proof: await takeProof() });
    token.set(r.token);
    setProfile(r);
    show('setup', false);
    await enterTemple(setup.temple || S.meta.temples[0].id);
    const sect = sectOf(r.user.sect);
    modal(`<div class="big">${sect.icon}</div><h3>Chào mừng ${esc(r.user.name)}</h3>
      <p>Bạn đã gia nhập <b>${sect.name}</b>.<br>Quà nhập môn: <svg class="i"><use href="#i-sen"/></svg> 100 Sen, 3 nén hương trầm, 2 cây nến và 1 đèn hoa đăng.
      ${r.referral ? `<br><br><svg class="i"><use href="#i-users"/></svg> Kết duyên cùng <b>${esc(r.referral.refName)}</b>: +${r.referral.reward.sen} Sen` : ''}</p>
      <p class="muted">Đến một bồ đoàn trống, bấm <b>Ngồi xuống</b> rồi <b>Lạy Phật</b> nhé.</p>
      <button class="btn gold" id="mOk">Nam mô A Di Đà Phật <svg class="i"><use href="#i-pray"/></svg></button>`, (el) => (el.querySelector('#mOk').onclick = () => { closeModal(); const ask = () => setTimeout(() => accountModal({ first: true }), 300); if (S.coaching) S.afterCoach = ask; else ask(); }));
    local.set('ref', null);
  } catch (e) { toast(e.message); }
  $('btnNext').disabled = false;
};
// Đăng nhập trên máy khác bằng tên đăng nhập + mật khẩu (hoặc mã khôi phục)
$('btnRestore').onclick = () => {
  modal(`<h3>Đăng nhập</h3><p class="muted">Dùng tên đăng nhập và mật khẩu bạn đã tạo trong Hồ sơ.</p>
    <form class="acc-form" id="mLogin" autocomplete="on">
      <label>Tên đăng nhập<input name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required></label>
      <label>Mật khẩu<input name="password" type="password" autocomplete="current-password" required></label>
      <button class="btn gold" type="submit">Đăng nhập</button>
    </form>
    <button class="link" id="mCodeLogin">Chưa tạo mật khẩu? Đăng nhập bằng mã khôi phục</button>
    <button class="btn ghost" id="mX">Huỷ</button>`, (el) => {
    el.querySelector('#mX').onclick = closeModal;
    el.querySelector('#mCodeLogin').onclick = () => { closeModal(); setTimeout(restoreByCode, 250); };
    el.querySelector('#mLogin').onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target), btn = e.target.querySelector('button');
      btn.disabled = true;
      try {
        const r = await post('/login', { username: f.get('username'), password: f.get('password') });
        token.set(r.token);
        setProfile(await api('/me')); closeModal(); show('setup', false); show('welcome', false); Sound.init?.();
        enterTemple(local.get('temple') || S.meta.temples[0].id);
      } catch (err) { toast(err.message); }
      btn.disabled = false;
    };
  });
};
function restoreByCode() {
  modal(`<h3>Khôi phục tài khoản</h3><p>Dán mã khôi phục (xem trong Hồ sơ trên thiết bị cũ).</p>
    <textarea class="wish" id="mCode" placeholder="Mã khôi phục…"></textarea>
    <button class="btn gold" id="mGo">Khôi phục</button><button class="btn ghost" id="mX">Huỷ</button>`, (el) => {
    el.querySelector('#mX').onclick = closeModal;
    el.querySelector('#mGo').onclick = async () => {
      token.set(el.querySelector('#mCode').value.trim());
      try { setProfile(await api('/me')); closeModal(); show('setup', false); enterTemple(local.get('temple') || S.meta.temples[0].id); }
      catch { token.clear(); toast('Mã không đúng'); }
    };
  });
}
// Tạo / đổi tên đăng nhập + mật khẩu để vào lại tài khoản trên máy khác
function accountModal({ first = false } = {}) {
  const acc = S.profile?.account || {};
  modal(`<div class="big">${ic('lock')}</div><h3>${acc.username ? 'Đổi mật khẩu đăng nhập' : 'Tạo tài khoản đăng nhập'}</h3>
    <p class="muted">${first ? 'Đặt tên đăng nhập và mật khẩu để giữ công đức, vật phẩm và vào lại trên điện thoại hay máy tính khác.' : 'Dùng để đăng nhập trên thiết bị khác.'}</p>
    <form class="acc-form" id="mAcc" autocomplete="on">
      <label>Tên đăng nhập<input name="username" value="${esc(acc.username || '')}" autocomplete="username" autocapitalize="none" spellcheck="false" minlength="3" maxlength="24" pattern="[a-zA-Z0-9][a-zA-Z0-9_.]{2,23}" placeholder="vd: minhtam_99" required><small>3–24 ký tự: chữ không dấu, số, dấu chấm, gạch dưới</small></label>
      ${acc.hasPassword ? '<label>Mật khẩu hiện tại<input name="current" type="password" autocomplete="current-password" required></label>' : ''}
      <label>Mật khẩu${acc.hasPassword ? ' mới' : ''}<input name="password" type="password" autocomplete="new-password" minlength="6" maxlength="72" required></label>
      <label>Nhập lại mật khẩu<input name="password2" type="password" autocomplete="new-password" minlength="6" maxlength="72" required></label>
      <button class="btn gold" type="submit">Lưu tài khoản</button>
    </form>
    <button class="btn ghost" id="mLater">${first ? 'Để sau' : 'Huỷ'}</button>`, (el) => {
    el.querySelector('#mLater').onclick = () => { if (first) local.set('accAsked', Date.now()); closeModal(); };
    el.querySelector('#mAcc').onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      if (f.get('password') !== f.get('password2')) return toast('Hai lần nhập mật khẩu chưa khớp');
      const btn = e.target.querySelector('button'); btn.disabled = true;
      try {
        const r = await post('/account', { username: f.get('username'), password: f.get('password'), current: f.get('current') || '' });
        S.profile.account = { username: r.username, hasPassword: true };
        closeModal(); S.sheetRender?.();
        toast(`${ic('check')} Đã lưu tài khoản <b>${esc(r.username)}</b>. Từ nay bạn đăng nhập được trên mọi thiết bị.`, 5000);
      } catch (err) { toast(err.message); }
      btn.disabled = false;
    };
  }, { replace: true });
}

/* =====================================================================
   DANH SÁCH CHÙA
   ===================================================================== */
async function renderTempleList(el, { pick, selected }) {
  let online = {}, per = 100;
  try { [online, per] = await Promise.all([api('/online'), api('/capacity').then((c) => c.perTemple || 100)]); } catch {}
  const visited = new Set(S.profile?.visited || []);
  const regions = ['Bắc', 'Trung', 'Nam'];
  el.innerHTML = regions.map((rg) => {
    const ts = S.meta.temples.filter((t) => t.region === rg);
    if (!ts.length) return '';
    return `<div class="region">Miền ${rg}</div>` + ts.map((t) => `
      <button class="temple ${t.id === selected ? 'on' : ''}" data-id="${t.id}">
        <span class="thumb" style="background:${TEMPLE_BG[t.id] || '#efe5d3'}">${ic('temple')}</span>
        <span><b>${esc(t.name)}</b><div class="meta">${esc(t.place)} · cảm hứng ${esc(t.inspired)}</div>
        <p>${esc(t.description)}</p>
        <span class="tags">${online[t.id] >= per && S.temple?.id !== t.id ? `<span class="tag red">Đã đủ ${per} người</span>` : online[t.id] ? `<span class="tag green">● ${online[t.id]}/${per} đang online</span>` : ''}${visited.has(t.id) ? '<span class="tag">✓ Đã viếng</span>' : '<span class="tag gold">Chưa viếng · +10 công đức</span>'}${S.temple?.id === t.id ? '<span class="tag gold">Bạn đang ở đây</span>' : ''}</span></span>
      </button>`).join('');
  }).join('');
  $$('.temple', el).forEach((b) => (b.onclick = () => {
    if (online[b.dataset.id] >= per && S.temple?.id !== b.dataset.id) return toast(`${ic('temple')} Chùa này đã đủ ${per} người, mời bạn chọn chùa khác hoặc quay lại sau`);
    pick(b.dataset.id);
  }));
}
// Chùa đã đủ người: gợi ý các chùa còn chỗ (ít người trước), hoặc thử lại
function showTempleFull(m) {
  const name = S.meta.temples.find((t) => t.id === m.temple)?.name || 'Chùa';
  const free = S.meta.temples.filter((t) => t.id !== m.temple && (m.counts[t.id] || 0) < m.max).sort((a, b) => (m.counts[a.id] || 0) - (m.counts[b.id] || 0)).slice(0, 4);
  modal(`<div class="big">${ic('temple')}</div><h3>${esc(name)} đã đủ ${m.max} người</h3>
    <p>Mỗi chùa đón tối đa ${m.max} người cùng lúc để ai cũng được tu tập an lành. Mời bạn viếng chùa khác:</p>
    ${free.map((t) => `<button class="btn ghost" data-go="${t.id}">${esc(t.name)} · ${m.counts[t.id] || 0} người</button>`).join('')}
    <button class="btn ghost" id="mRetry">Thử vào lại ${esc(name)}</button><div class="full-fund">${serverSwitch()}</div>`, (el) => {
    el.querySelectorAll('[data-go]').forEach((b) => (b.onclick = () => { closeModal(); enterTemple(b.dataset.go); }));
    el.querySelector('#mRetry').onclick = () => { closeModal(); sendWs({ t: 'join', temple: m.temple, v: 4 }); };
  }, { replace: true });
}

/* =====================================================================
   VÀO CHÙA
   ===================================================================== */

/* =====================================================================
   TƯ LIỆU: HƯỚNG DẪN THIỀN PHÁI & SỰ TÍCH CHÙA
   ===================================================================== */
let contentP = null;
const loadContent = () => (contentP ||= api('/content').then((c) => (S.content = c)).catch(() => { contentP = null; return { guides: {}, stories: {}, tales: {} }; }));
const list = (a, tag = 'ul') => (a?.length ? `<${tag}>${a.map((x) => `<li>${esc(x)}</li>`).join('')}</${tag}>` : '');
const sources = (a) => (a?.length ? `<h4>${ic('book')} Tư liệu tham khảo</h4><p class="src">${a.map((x) => { const m = /(https?:\/\/\S+)/.exec(x); return m ? `${esc(x.replace(m[1], '').replace(/[–:-]\s*$/, ''))} <a href="${esc(m[1])}" target="_blank" rel="noopener">${esc(m[1])}</a>` : esc(x); }).join('<br>')}</p>` : '');

function guideHtml(g, sect) {
  if (!g) return '<div class="empty">Tư liệu đang được biên soạn…</div>';
  return `<div class="guide-hero" style="background:${sect.color}">${ic('sect-' + sect.id)}<div><b>${esc(g.name || sect.name)}</b><small>${esc(g.subtitle || '')}</small></div></div>
    <div class="prose">
      ${g.origin ? `<p class="lead">${esc(g.origin)}</p>` : ''}
      ${g.history?.length ? `<h4>${ic('scroll')} Lịch sử</h4>${g.history.map((x) => `<p>${esc(x)}</p>`).join('')}` : ''}
      ${g.essence?.length ? `<h4>${ic('wheel')} Tinh yếu giáo pháp</h4>${list(g.essence)}` : ''}
      ${g.practice?.length ? `<h4>${ic('meditate')} Pháp môn tu tập</h4>${g.practice.map((x) => `<p><b>${esc(x.title)}.</b> ${esc(x.text)}</p>`).join('')}` : ''}
      ${g.daily?.length ? `<h4>${ic('sun')} Thời khóa hằng ngày</h4>${list(g.daily, 'ol')}` : ''}
      ${g.chants?.length ? `<h4>${ic('pray')} Kinh kệ, câu niệm</h4>${g.chants.map((c) => `<div class="chant"><b>${esc(c.name)}</b>${esc(c.text)}</div>`).join('')}` : ''}
      ${g.inApp ? `<h4>${ic('spark')} Tu tập trong Niệm Phật Online</h4><p>${esc(g.inApp)}</p>` : ''}
      ${sources(g.sources)}
    </div>`;
}

function openHelp(tab = 'start') {
  sheet('Cách chơi', [['start', 'Bắt đầu'], ['practice', 'Hành trì'], ['grow', 'Cấp độ & quà'], ['community', 'Cộng đồng'], ['faq', 'Hỏi đáp']], (el, k) => {
    el.innerHTML = howtoHtml(k, { sects: S.meta.sects, exp: S.meta.exp }); el.scrollTop = 0;
    if ($('hCoach')) $('hCoach').onclick = () => { closeSheet(); setTimeout(() => startCoach(), 300); };
  }, tab);
}
async function openGuide(id = S.profile?.user.sect || 'truclam') {
  const c = await loadContent();
  sheet('Hướng dẫn tu tập', Object.values(S.meta.sects).map((s) => [s.id, s.name]), (el, tab) => {
    el.innerHTML = guideHtml(c.guides[tab], sectOf(tab)); el.scrollTop = 0;
  }, id);
}
function storyHtml(t, st) {
  if (!st) return `<div class="prose"><p>${esc(t.description)}</p></div>`;
  return `<div class="prose">
    <p class="real" style="color:var(--muted);font-size:13px">${ic('pin')} ${esc(st.location || t.place)}${st.founded ? ` · ${esc(st.founded)}` : ''}<br>Lấy cảm hứng từ <b>${esc(st.real || t.inspired)}</b></p>
    ${st.intro ? `<p class="lead">${esc(st.intro)}</p>` : ''}
    ${st.story?.length ? `<h4>${ic('story')} Sự tích</h4>${st.story.map((x) => `<p>${esc(x)}</p>`).join('')}` : ''}
    ${st.highlights?.length ? `<h4>${ic('temple')} Điểm đặc sắc</h4>${list(st.highlights)}` : ''}
    ${st.visitTip ? `<h4>${ic('pray')} Khi viếng chùa</h4><p>${esc(st.visitTip)}</p>` : ''}
    ${sources(st.sources)}
  </div>`;
}
async function openStory(id = S.temple?.id) {
  const t = S.meta.temples.find((x) => x.id === id); if (!t) return;
  const c = await loadContent();
  sheet(t.name, null, (el) => { el.innerHTML = storyHtml(t, c.stories[id]); el.scrollTop = 0; });
}
async function openMapView({ focus } = {}) {
  const [c, online, pilgrim] = await Promise.all([loadContent(), api('/online').catch(() => ({})), loadPilgrim(60e3)]);
  openMap({
    temples: S.meta.temples, stories: c.stories, visited: new Set(S.profile.visited), current: S.temple?.id, focus, online: online.temples || online, pilgrim, items: S.items,
    onEnter: (id) => enterTemple(id),
    onStory: (id) => openStory(id),
    onShare: (headline) => openShare(esc(headline)),
    onClaim: async (id) => {
      try {
        const r = await post(`/quests/${id}/claim`);
        Sound.success(); petalShower(24); toast(`${ic('gift')} Nhận: ${rewardText(r.reward)}`);
        handleResult(r, { silent: true });
        return true;
      } catch (e) { toast(e.message); return false; }
    },
  });
}

// Sổ hành hương: âm lịch, chùa duyên, ấn chùa. Nạp lại mỗi lần mở bản đồ và sau mỗi lần vào chùa.
async function loadPilgrim(maxAge = 300e3) {
  const key = `pilgrim:${S.profile?.user.id}`, c = local.get(key);
  try {
    if (c?.day === vnDay() && Date.now() - c.at < maxAge && Date.now() >= c.at) S.pilgrim = c.data;
    else { S.pilgrim = await api('/pilgrim'); keep(key, { day: vnDay(), at: Date.now(), data: S.pilgrim }); }
    renderTodayHints();
  } catch {}
  return S.pilgrim;
}
function renderTodayHints() {
  const d = S.pilgrim?.today; if (!d) return;
  const ev = S.meta.event, holy = d.lunar.holy;
  const parts = [ev.multiplier > 1 && `${ev.name || 'Sự kiện'} · ×${ev.multiplier} công đức`, holy && `${holy.name} · ×${holy.mult} công đức`].filter(Boolean);
  show('evBanner', parts.length > 0);
  if (parts.length) $('evBanner').innerHTML = `${ic('spark')} ${parts.map(esc).join(' · ')}`;
  show('mapDot', !S.pilgrim.visitedToday.includes(d.duyen.id));
}
// Báo các phần thưởng hành hương của lượt viếng đầu tiên trong ngày
function visitNotes(x = {}) {
  const notes = [];
  if (x.stamp) notes.push(x.stamp.days === 1 ? `${ic('medal')} Nhận ấn <b>${esc(S.temple.name)}</b>. Xem trong Hộ chiếu hành hương` : `${ic('medal')} Ấn <b>${esc(x.stamp.name)}</b> tại ${esc(S.temple.name)}: ${rewardText(x.stamp.reward)}`);
  if (x.duyen) notes.push(`${ic('lotus')} Đúng chùa duyên hôm nay: ${rewardText(x.duyen)}`);
  notes.forEach((n, i) => setTimeout(() => { Sound.chime?.(); toast(n, 3500); }, 700 + i * 3000));
}


/* =====================================================================
   SƯ TRỤ TRÌ: giới thiệu chùa, kể sự tích, hướng dẫn lễ Phật
   ===================================================================== */
// Nhân vật hư cấu cho các ngôi chùa trong game (không phải người thật)
const ABBOTS = { nhattru: 'Thầy Tâm Liên', tranho: 'Thầy Quảng Hồ', huongson: 'Thầy Diệu Sơn', dinhmay: 'Thầy Trúc Vân', baison: 'Thầy Bảo Sơn', thienmau: 'Thầy Hương Giang', vinhan: 'Thầy Vĩnh Tâm', doivang: 'Sư cả Kim Tâm', linhson: 'Thầy Huyền Không', kimson: 'Thầy Kim Đỉnh', linhung: 'Thầy Minh Ứng', nuisam: 'Cụ Từ Thanh Sam', cuuphong: 'Thầy Tịnh Phong', hoangoc: 'Thầy Ngọc Liên' };
// Lão Hành Khất: cảm hứng từ ông lão bán bí kiếp cho cậu bé trong phim Tuyệt Đỉnh Kungfu. Cậu bé dốc tiền mua sách, bị đánh vì cứu cô bé bán kẹo, về sau mới hiểu tài năng thật ở trong mình.
const HERMIT_LESSONS = ['Thức thứ nhất: Thở. Chưa thở được thì chưa làm được gì.', 'Thức thứ hai: Lắng. Nghe người khác nói hết câu.', 'Thức thứ ba: Nhịn. Lời nặng để qua đêm rồi hãy nói.', 'Thức thứ tư: Xả. Nắm chặt bao nhiêu, mỏi tay bấy nhiêu.', 'Thức thứ năm: Tha. Người đầu tiên được nhẹ lòng là mình.', 'Thức thứ sáu: Cho. Có cây kẹo cũng chia cho người khác một nửa.', 'Thức thứ bảy: Niệm. Một câu Phật hiệu, trăm mối lo tan.', 'Thức cuối: Vạn Phật quy tâm. Không tìm đâu xa, tuyệt học ở ngay trong lòng bạn.'];
async function talkHermit() {
  const head = `<div class="abbot-head"><span class="ava" style="background:#7a6a52">${ic('book')}</span><div><b>Lão Hành Khất</b><small>Bán bí kiếp, chỉ bán cho người hữu duyên</small></div></div>`;
  const say = (html, opts, bind) => modal(`${head}<div class="abbot-say">${html}</div><div class="abbot-opts">${opts}</div>`, (el) => {
    el.querySelector('#hBye').onclick = closeModal;
    bind?.(el);
  }, { replace: true });
  const bye = `<button class="btn ghost" id="hBye">${ic('pray')} Con xin phép cụ</button>`;
  let st;
  try { st = await api('/hermit'); } catch (e) { toast(e.message); return; }
  Sound.chime?.();
  const greet = '<p>Này, khoan đã! Lão nhìn cốt cách của con là biết ngay: kỳ tài ngàn năm có một. Hoà bình thế giới trông cả vào con đấy!</p>';
  if (st.owned) return say(`<p>Lại là con à? Bí kiếp bán rồi miễn trả lại nhé. Nhưng lão nói thật: chiêu hay nhất không nằm trong sách đâu, đọc đi rồi biết.</p>${HERMIT_LESSONS.map((l) => `<p>${esc(l)}</p>`).join('')}`, bye);
  if (st.level < st.minLevel) return say(`${greet}<p>Mà khoan, con còn non quá, sách này đọc chưa nổi. Tu tập tới cấp ${st.minLevel} rồi quay lại gặp lão.</p>`, bye);
  if (!st.fated) return say(`<p>Lão nhìn tướng con một lúc rồi lắc đầu: hôm nay chưa phải. Kỳ tài thì con vẫn là kỳ tài, câu đó lão nói với ai cũng thật lòng cả.</p><p>Cứ chăm niệm Phật, lạy Phật rồi hôm khác ghé lại, biết đâu duyên tới.</p>`, bye);
  if (!st.left) return say(`${greet}<p>Khổ nỗi hôm nay lão bán hết hàng rồi. Ngày mai con ghé lại xem duyên còn không nhé.</p>`, bye);
  say(`${greet}<p>Cuốn <b>Bí Kiếp Vạn Phật Thần Chưởng</b> này cả đời lão chỉ bán cho người hữu duyên, mà hôm nay người đó là con. Lão để lại đúng <b>${st.price.toLocaleString('vi-VN')} Sen</b>, không mặc cả. Đổi xong cả game sẽ biết tên con.</p>`,
    `<button class="btn gold" id="hOk">${ic('book')} Đổi ${st.price.toLocaleString('vi-VN')} Sen lấy bí kiếp</button>${bye}`, (el) => {
      el.querySelector('#hOk').onclick = async () => {
        try { await post('/hermit/exchange'); closeModal(); } catch (e) { toast(e.message); }
      };
    });
}

async function talkAbbot({ first = false } = {}) {
  const t = S.temple; if (!t) return;
  if (first && (!$('modal').classList.contains('hidden') || !$('coach').classList.contains('hidden'))) { setTimeout(() => talkAbbot({ first }), 1500); return; }
  const c = await loadContent(), st = c.stories[t.id] || {}, name = ABBOTS[t.id] || 'Thầy trụ trì';
  const u = S.profile.user, sect = sectOf(u.sect);
  const head = `<div class="abbot-head"><span class="ava" style="background:#c98a2e">${ic('pray')}</span><div><b>${esc(name)}</b><small>${t.id === 'nuisam' ? 'Thủ từ' : 'Trụ trì'} ${esc(t.name)}</small></div></div>`;
  const say = (html, opts) => modal(`${head}<div class="abbot-say">${html}</div><div class="abbot-opts">${opts}</div>`, (el) => {
    el.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => go(b.dataset.a)));
  }, { replace: true });
  const menu = `<button class="btn ghost" data-a="story">${ic('story')} Thầy kể sự tích chùa</button>
    <button class="btn ghost" data-a="hl">${ic('temple')} Chùa có gì đặc sắc ạ?</button>
    <button class="btn ghost" data-a="how">${ic('bow')} Con nên lễ Phật thế nào?</button>
    <button class="btn ghost" data-a="sect">${ic('book')} Về pháp môn ${esc(sect.name)}</button>
    <button class="btn gold" data-a="bye">${ic('pray')} Con xin phép thầy</button>`;
  let page = 0;
  const go = (a) => {
    Sound.chime?.();
    if (a === 'bye') { closeModal(); return; }
    if (a === 'menu') return say(`<p>Con còn muốn hỏi gì nữa không?</p>`, menu);
    if (a === 'story' || a === 'more') {
      if (a === 'story') page = 0;
      const ps = st.story || [t.description];
      const last = page >= ps.length - 1;
      say(`<p>${esc(ps[page])}</p>${st.story ? `<small class="muted">(${page + 1}/${ps.length})</small>` : ''}`,
        last ? `<button class="btn ghost" data-a="full">${ic('scroll')} Đọc toàn văn & nguồn</button><button class="btn gold" data-a="menu">Dạ, con hiểu rồi</button>` : `<button class="btn gold" data-a="more">Thầy kể tiếp ạ</button><button class="btn ghost" data-a="menu">Con hỏi chuyện khác</button>`);
      page++;
      return;
    }
    if (a === 'full') { closeModal(); openStory(t.id); return; }
    if (a === 'hl') return say(st.highlights?.length ? `<p>Chùa mình có mấy điều con nên biết:</p><ul>${st.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>` : `<p>${esc(t.description)}</p>`, `<button class="btn gold" data-a="menu">Dạ</button>`);
    if (a === 'how') return say(`<p>Vào chánh điện, con chắp tay đứng ngay ngắn trước Phật, giữ tâm lắng lại. Lạy ba lạy: mỗi lạy năm vóc sát đất, quán tưởng mình đang đảnh lễ chư Phật. Rồi con ngồi trên bồ đoàn, lần chuỗi hạt niệm “Nam mô A Di Đà Phật”, hoặc thiền theo hơi thở.</p>${st.visitTip ? `<p>${esc(st.visitTip)}</p>` : ''}<p>Cuối buổi nhớ <b>hồi hướng công đức</b> cho mọi người, mọi loài.</p>`,
      `<button class="btn ghost" data-a="help">${ic('book')} Xem cách chơi</button><button class="btn gold" data-a="menu">Dạ, con cảm ơn thầy</button>`);
    if (a === 'help') { closeModal(); openHelp('practice'); return; }
    if (a === 'sect') { closeModal(); openGuide(u.sect); return; }
  };
  say(first
    ? `<p>A Di Đà Phật! Chào ${esc(u.name)} về thăm ${esc(t.name)}. Thầy là ${esc(name)}, trụ trì nơi đây.</p><p>${esc(st.intro || t.description)}</p><p>Con muốn nghe thầy kể chuyện chùa không?</p>`
    : `<p>A Di Đà Phật! ${esc(u.name)} cần hỏi thầy điều gì?</p>`, menu);
}

// người kể chuyện ngoài sân: chọn chuyện để nghe, nghe hết thì nhận chút công đức (mỗi chuyện một lần/ngày, tính ở máy)
async function talkTeller(i) {
  const t = S.temple; if (!t) return;
  const c = await loadContent(), p = c.tales?.[t.id]?.[i]; if (!p) return;
  const heard = local.get('heard', {}), day = new Date().toDateString();
  const head = `<div class="abbot-head"><span class="ava" style="background:#4d7aa6">${ic('story')}</span><div><b>${esc(p.name)}</b><small>${esc(p.role)} · ${esc(t.name)}</small></div></div>`;
  const say = (html, opts) => modal(`${head}<div class="abbot-say">${html}</div><div class="abbot-opts">${opts}</div>`, (el) => {
    el.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => go(b.dataset.a)));
  }, { replace: true });
  const others = (c.tales[t.id] || []).length - 1;
  const menu = () => p.tales.map((x, k) => `<button class="btn ghost" data-a="t${k}">${ic(heard[`${t.id}:${i}:${k}`] === day ? 'check' : 'scroll')} ${esc(x.title)}</button>`).join('')
    + `<button class="btn ghost" data-a="full">${ic('story')} Đọc sự tích chùa</button><button class="btn gold" data-a="bye">${ic('pray')} Cảm ơn ${esc(p.name.split(' ')[0].toLowerCase())}</button>`;
  const go = (a) => {
    Sound.chime?.();
    if (a === 'bye') return closeModal();
    if (a === 'full') { closeModal(); openStory(t.id); return; }
    if (a === 'menu') return say(`<p>Còn chuyện này nữa, muốn nghe không?</p>`, menu());
    const k = +a.slice(1), tale = p.tales[k];
    heard[`${t.id}:${i}:${k}`] = day; local.set('heard', heard);
    say(`<h4 class="tale-title">${esc(tale.title)}</h4><p>${esc(tale.text)}</p>`,
      `<button class="btn gold" data-a="menu">Kể thêm chuyện khác</button><button class="btn ghost" data-a="bye">Cảm ơn, tôi đi dạo tiếp</button>`);
    if (Object.keys(heard).filter((x) => x.startsWith(t.id + ':') && heard[x] === day).length === p.tales.length * (others + 1)) toast(`${ic('sen')} Bạn đã nghe hết chuyện của ${esc(t.name)} hôm nay`);
  };
  say(`<p>Chào ${esc(S.profile.user.name)}! Tôi là ${esc(p.name)}, ${esc(p.role.toLowerCase())} ở đây. Bạn ghé ${esc(t.name)} lần này, có muốn nghe tôi kể vài chuyện xưa không?</p>`, menu());
}

// Tượng lớn ngoài trời dựng theo khung cảnh, còn lại lấy từ danh sách tượng trong chánh điện
const VIEW_STATUES = { fansipan: ['amida', 'quanam'], sontra: ['quanam'] };
const statueKinds = (t) => [...(t.theme.statues || []).map((s) => s.kind), ...(VIEW_STATUES[t.theme.view] || [])];
// Người mới đang chọn chùa thì tải sẵn tượng của chùa đó; chờ dừng tay mới tải để bấm thử nhiều chùa không tốn mạng
let warmTimer;
function warmTemple(id) {
  clearTimeout(warmTimer);
  warmTimer = setTimeout(() => {
    const t = S.meta.temples.find((x) => x.id === id);
    if (t) preloadFigures(statueKinds(t));
    loadContent();
  }, 800);
}
async function enterTemple(id) {
  const t = S.meta.temples.find((x) => x.id === id) || S.meta.temples[0];
  S.temple = t;
  local.set('temple', t.id);
  if (!S.world) {
    S.world = new World($('scene'), $('joy'), S.items);
    S.world.onBow = onBowDone;
    S.world.onContext = renderCtx;
  S.world.onRide = (ph, text) => {
    const say = S.world.od?.cable?.say;
    if (ph === 'stop') return toast(`${ic('map')} ${esc(text)}`, 8000);
    if (say && ph === 'up') return toast(`${ic('map')} ${esc(say.up)}`, 7000);
    if (say && ph === 'top') { Sound.bell(Sound.now + 0.05, 220, 0.3, 6); return toast(`${ic('lotus')} ${esc(say.top)}`, 7000); }
    if (ph === 'up') toast(`${ic('map')} Cáp treo đang đưa bạn lên đỉnh núi Bà Huyền – ngọn núi cao nhất Nam Bộ…`, 5000);
    else if (ph === 'top') { Sound.bell(Sound.now + 0.05, 220, 0.3, 6); toast(`${ic('lotus')} Đỉnh núi: tượng Phật Bà Linh Phong bằng đồng hướng về đồng bằng. Nam mô Quán Thế Âm Bồ Tát.`, 6000); }
    else if (ph === 'down') toast('Cáp treo đưa bạn về lại ga Chùa Bà…', 3500);
  };
    S.world.onToast = toast;
    S.world.onTalk = () => talkAbbot();
    S.world.onHermit = () => talkHermit();
    S.world.abbotInfo = (t) => ({ name: ABBOTS[t.id] || 'Thầy trụ trì' });
    S.world.onTell = (i) => talkTeller(i);
    S.world.onPlayerTap = (id) => openPlayerCard(id);
    S.world.onLoc = (id) => claimLocTap(id);
    S.world.beastName = (item) => S.items[item]?.name || 'Linh thú';
    S.world.onBeastNear = (b) => showBond(b);
    // mở trễ: cú click trình duyệt phát sau khi chạm sẽ rơi vào nền sheet và đóng nó ngay
    S.world.onMerit = () => {};
    S.world.tellerInfo = (t) => (S.content?.tales?.[t.id] || []).map(({ name, role }) => ({ name, role }));
    S.world.setShowNpc(local.get('npc', true));
    S.world.setShowNames(local.get('names', true));
    S.world.onBagHit = (bagDef) => onStressBagPunched(bagDef);
    S.world.onGiantMuyuHit = () => onHyperMuyuStruck();
    S.world.onDjStageTap = () => activateDjStage();
  }
  stopBowing(true);
  showLoader(`Đang về ${t.name}`);
  await nextFrames(3); // cho màn chờ hiện ra trước khi dựng cảnh (việc dựng chạy đồng bộ)
  await Promise.all([loadContent().catch(() => null), preloadFigures(statueKinds(t))]);
  setLoader(55, 'An vị tượng Phật');
  await nextFrames(1);
  S.world.enterTemple(t, S.profile.user);
  loadLoc(t.id);
  loadBeasts(t.id);
  refreshQue();
  S.plants = []; refreshPlants(t.id);
  api(`/garden/${t.id}`).then((g) => { if (S.temple?.id === t.id) showGardenTrees(S.world, g.trees); }).catch(() => {});
  setLoader(80, 'Thắp đèn chánh điện');
  await S.world.warmUp();
  S.world.start();
  applyQuy();
  await nextFrames(3);
  hideLoader();
  S.view = 'hall';
  // người dùng cũ chưa có tên đăng nhập: nhắc tạo (mỗi 3 ngày một lần, không chen vào lần đầu tạo nhân vật)
  if (S.profile?.account && !S.profile.account.username && Date.now() - (local.get('accAsked') || 0) > 3 * 864e5 && Date.now() - (S.profile.user.createdAt || 0) > 36e5) {
    local.set('accAsked', Date.now()); setTimeout(() => accountModal({ first: true }), 2500);
  }
  setTimeout(showNews, 3000);
  show('hud');
  $('tName').textContent = t.name;
  $('guide').classList.remove('fade');
  setTimeout(() => $('guide').classList.add('fade'), 9000);
  renderTodayHints();
  Sound.init();
  if (S.meta.chantAudio && !Sound.recording) Sound.setRecording(S.meta.chantAudio);
  Sound.setActive(true);
  Sound.setTempleMusic(t.id);
  Sound.bell(Sound.now + 0.2, 174, 0.3, 8);
  connectWs();
  loadStele();
  loadLanterns();
  refreshMail(); refreshDm(); renderTicker();
  try { const r = await post('/practice', { type: 'visit', temple: t.id }); handleResult(r); visitNotes(r.extra); if (!r.extra?.already) localStorage.removeItem(`niemphat:pilgrim:${S.profile.user.id}`); } catch {} // lần đầu vào chùa trong ngày thì sổ hành hương đổi
  loadPilgrim();
  restorePending();
  if (!S.inboxChecked) { S.inboxChecked = true; setTimeout(showInbox, 1500); }
  maybeOfferInstall();
  if (!local.get('coached')) { local.set('coached', 1); S.coaching = true; setTimeout(() => startCoach({ onDone: () => { S.coaching = false; S.afterCoach?.(); S.afterCoach = null; } }), 900); }
  if (local.get('checkinDay') !== new Date().toDateString()) dailyCheckin();
  const op = new URLSearchParams(location.search).get('open');
  if (['rank', 'quests', 'map', 'guide', 'community'].includes(op) && !S.openedParam) { S.openedParam = 1; setTimeout(() => openSheet(op), 1200); }
  if (!local.get('story:' + t.id)) {
    local.set('story:' + t.id, 1);
    setTimeout(() => talkAbbot({ first: true }), local.get('coached') ? 1500 : 0);
  }
  if (S.meta.announcement && local.get('ann') !== S.meta.announcement) { announce(S.meta.announcement, S.meta.announcementFx); local.set('ann', S.meta.announcement); }
}

function resumeHall() {
  S.view = 'hall';
  show('hud');
  S.world?.start();
  Sound.setActive(true);
}

async function dailyCheckin() {
  try {
    const r = await post('/checkin');
    local.set('checkinDay', new Date().toDateString());
    setProfile(r);
    const c = r.checkin;
    if (!c) return;
    const days = c.week.map((w, i) => `<div style="flex:1;padding:8px 2px;border-radius:12px;background:${i < c.day ? '#f6d27e' : '#efe5d3'};font-size:11px;font-weight:700">N${i + 1}<br>${i === 6 ? '<svg class="i"><use href="#i-gift"/></svg>' : '<svg class="i"><use href="#i-sen"/></svg>'}${w.sen}</div>`).join('');
    setTimeout(() => {
      Sound.chime();
      modal(`<div class="big"><svg class="i"><use href="#i-fire"/></svg></div><h3>Ngày thứ ${c.streak} liên tiếp</h3>
        <p>Cảm ơn bạn đã lên chùa hôm nay. Quà điểm danh:<br><b><svg class="i"><use href="#i-sen"/></svg> ${c.reward.sen} Sen${c.reward.ngoc ? ` · <svg class="i"><use href="#i-ngoc"/></svg> ${c.reward.ngoc} Ngọc` : ''}${c.reward.items ? ' · ' + Object.entries(c.reward.items).map(([k, n]) => `${n} ${S.items[k]?.name || k}`).join(', ') : ''}</b></p>
        <div style="display:flex;gap:4px;margin:6px 0">${days}</div>
        ${c.shieldUsed ? `<p class="checkin-note">${ic('incense')} Bạn lỡ ${c.shieldUsed} ngày, ${c.shieldUsed} nén hương giữ chuỗi đã giữ lại hành trình cho bạn.</p>` : ''}
        ${c.shieldEarned ? `<p class="checkin-note">${ic('incense')} Tròn 7 ngày: thêm 1 nén hương giữ chuỗi.</p>` : ''}
        <p class="muted">Giữ chuỗi 7 ngày để nhận quà lớn <svg class="i"><use href="#i-gift"/></svg> · Hương giữ chuỗi: ${c.shield}</p>
        ${c.today ? `<blockquote class="teaching">“${esc(c.today.teaching.text)}”<small>${esc(c.today.teaching.src)}</small></blockquote>
        <p class="checkin-note">${ic('lotus')} Chùa duyên hôm nay: <b>${esc(templeName(c.today.duyen.id))}</b> · ${rewardText(c.today.duyen.reward)}${c.today.lunar.holy ? `<br>${ic('spark')} ${esc(c.today.lunar.holy.name)}: ×${c.today.lunar.holy.mult} công đức` : ''}</p>` : ''}
        <button class="btn gold" id="mOk">Nhận quà <svg class="i"><use href="#i-pray"/></svg></button>
        ${c.today && c.today.duyen.id !== S.temple?.id ? `<button class="btn ghost" id="mDuyen">${ic('map')} Nhận quà và về chùa duyên</button>` : ''}`, (el) => {
        el.querySelector('#mOk').onclick = () => { closeModal(); petalShower(20); };
        el.querySelector('#mDuyen')?.addEventListener('click', () => { closeModal(); petalShower(20); openMapView({ focus: c.today.duyen.id }); });
      });
      for (const id of c.questsDone || []) { const q = S.profile.quests.find((x) => x.id === id); if (q) toast(`<svg class="i"><use href="#i-check"/></svg> Hoàn thành: <b>${esc(q.name)}</b>`); }
    }, 1200);
  } catch {}
}

async function loadStele() {
  try { S.world.temple.setStele(await api('/stele?temple=' + S.temple.id), S.temple.name); } catch {}
  try { S.world.temple.setMerit(await api('/donations')); } catch {}
}
setInterval(() => { if (S.view === 'hall' && S.temple) loadStele(); }, 60000);

/* =====================================================================
   MẠNG (WebSocket)
   ===================================================================== */
let wsRetry = 0, lastSent = '';
function connectWs() {
  if (S.idle) return;
  if (S.ws && S.ws.readyState <= 1) { sendWs({ t: 'join', temple: S.temple.id, v: 4 }); return; }
  const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws?token=${token.get()}`);
  S.ws = ws;
  const profs = new Map(); // hồ sơ người chơi khác (máy chủ chỉ gửi khi mới vào/thay đổi)
  const states = new Map(); // trạng thái người chơi trong phòng (giao thức v3: nhận phần thay đổi)
  ws.addEventListener('open', () => { if (document.hidden) sendWs({ t: 'vis', h: true }); });
  ws.onopen = () => { wsRetry = 0; if (wsWasOpen) chatResync(); wsWasOpen = true; if (S.full) { S.full = false; clearInterval(fullT); show('fullScreen', false); toast(`${ic('pray')} Đã có chỗ, mời bạn vào chùa`); } sendWs({ t: 'join', temple: S.temple.id, v: 4 }); };
  ws.binaryType = 'arraybuffer';
  ws.onmessage = (ev) => {
    let m;
    if (ev.data instanceof ArrayBuffer) {
      // v4: trạng thái phòng dạng nhị phân (xem packRoom ở máy chủ)
      const v = new DataView(ev.data), kind = v.getUint8(0), n = v.getUint16(3, true);
      let o = 5;
      if (kind === 2) states.clear();
      for (let i = 0; i < n; i++, o += 15) {
        const id = v.getUint32(o, true);
        states.set(id, [id, v.getInt16(o + 4, true) / 100, v.getInt16(o + 6, true) / 100, v.getInt16(o + 8, true) / 100, v.getInt16(o + 10, true) / 1000, v.getInt16(o + 12, true), v.getUint8(o + 14)]);
      }
      const g = v.getUint16(o, true); o += 2;
      for (let i = 0; i < g; i++, o += 4) states.delete(v.getUint32(o, true));
      m = { t: 'room2', temple: S.temple?.id, s: [...states.values()], online: v.getUint16(1, true) };
    } else { try { m = JSON.parse(ev.data); } catch { return; } }
    if (m.t === 'prof') { for (const p of m.p) profs.set(p.id, p); return; }
    if (m.t === 'room3') {
      // máy chủ gửi toàn bộ (s) định kỳ, còn lại chỉ người vừa đổi (d) và người vừa rời (g)
      for (const p of m.p || []) profs.set(p.id, p);
      if (m.temple !== states.temple) { states.clear(); states.temple = m.temple; }
      if (m.s) { states.clear(); for (const e of m.s) states.set(e[0], e); }
      for (const e of m.d || []) states.set(e[0], e);
      for (const id of m.g || []) states.delete(id);
      m.s = [...states.values()]; m.t = 'room2';
    }
    if (m.t === 'room2') {
      for (const p of m.p || []) profs.set(p.id, p);
      m.players = [];
      for (const [id, x, z, y, r, seat, a] of m.s) { const p = profs.get(id); if (p) m.players.push({ ...p, x, z, y, r, seat, a }); }
      m.t = 'room';
    }
    if (m.t === 'roomFull') { states.clear(); S.world?.applyRoom([], S.profile.user.id); return showTempleFull(m); }
    if (m.t === 'joined') { states.clear(); if (m.build) checkBuild(m.build); return; }
    if (m.t === 'room') {
      if (m.temple !== S.temple?.id) return;
      if (S.view === 'hall' || S.view === 'beads' || S.view === 'chant' || S.view === 'meditate' || S.view === 'wheel') S.world.applyRoom(m.players, S.profile.user.id);
      $('tOnline').innerHTML = `<i class="dot"></i> ${m.online} đang online`;
      const n = S.world.bowingCount();
      if (n >= 2 && S.bow === 'bowing') $('tOnline').innerHTML += ` · <svg class="i"><use href="#i-fire"/></svg> Đồng tâm ${n} người cùng lạy`;
    } else if (m.t === 'lantern') {
      launchLantern(m.lantern); dockAdd(m.lantern);
    } else if (m.t === 'chore') {
      // người khác đang làm công quả: chỉ vẽ đạo cụ, tối đa vài người cùng lúc cho máy đỡ nặng
      const av = S.world?.remotes.get(m.id)?.av;
      if (av && m.id !== S.profile.user.id && (S.choreSeen || 0) < 6) { S.choreSeen = (S.choreSeen || 0) + 1; const end = () => S.choreSeen--; runChore(S.world, m.k, { onDone: end, onCancel: end }, av); }
    } else if (m.t === 'plant') {
      if (m.p) S.plants = [...(S.plants || []).filter((p) => p.id !== m.p.id), m.p];
      if (m.ripeOff) S.plants = (S.plants || []).map((p) => (p.id === m.ripeOff ? { ...p, ripe: false } : p));
      showPlants(S.world, S.plants || []);
    } else if (m.t === 'tree') {
      showGardenTrees(S.world, m.n);
    } else if (m.t === 'bell' && m.id !== S.profile.user.id) {
      Sound.bigBell();
    } else if (m.t === 'offer' && m.id !== S.profile.user.id) {
      applyOfferVisual(m.item);
    } else if (m.t === 'greet') {
      Sound.chime(); petalShower(14, ['🌸', '✨', '🪷']);
      toast(`${ic(m.kind === 'huong' ? 'incense' : 'pray')} <b>${esc(m.from.name)}</b> ${m.kind === 'huong' ? 'tặng bạn một nén hương' : 'gửi lời chúc'}: “${esc(m.text)}”${m.gift ? ` (+${m.gift} Sen)` : ''}`, 6500);
      if (m.gift) api('/me').then(setProfile).catch(() => {});
      api('/greetings').catch(() => {}); // đánh dấu đã xem
    } else if (m.t === 'friend') {
      toast(m.status === 'ok' ? `${ic('users')} <b>${esc(m.from.name)}</b> đã là bạn đồng tu của bạn` : `${ic('users')} <b>${esc(m.from.name)}</b> muốn kết bạn đồng tu – mở Cộng đồng → Đồng tu`, 6500);
    } else if (m.t === 'friendgone') {
      refreshMail(true);
      if (S.sheetKind === 'community' && !$('sheet').classList.contains('hidden')) $('sheetTabs').querySelector('[data-tab=friends].on')?.click();
    } else if (m.t === 'chan') {
      S.world.playChan(m.from, m.to);
      for (const [at, e, id] of [[150, '👊', m.from], [450, '👊', m.from], [850, '🦶', m.from], [860, '💥', m.to]]) setTimeout(() => S.world?.showEmote(id, e), at);
      for (const at of [0.15, 0.45, 0.85]) Sound.mok(Sound.now + at, 0.7);
      if (m.to === S.profile?.user.id) toast(`<b>${esc(m.name)}</b> vừa chan bạn. Không muốn chơi thì tắt trong Cài đặt`, 4000);
    } else if (m.t === 'emote') {
      S.world.showEmote(m.id, m.e);
    } else if (m.t === 'legend') {
      onLegend(m.award);
    } else if (m.t === 'petbond') {
      onPetBond(m);
    } else if (m.t === 'feed') {
      feed(`${ic(m.icon === 'beads' || m.icon === '📿' ? 'beads' : 'spark')} ${esc(m.text)}`);
    } else if (m.t === 'topup') {
      topupDone(m.order, m.ngoc);
    } else if (m.t === 'dm') {
      onDm(m);
    } else if (m.t === 'sg') {
      onSangha(m);
    } else if (m.t === 'sgdel') {
      if (sgChat) { sgChat.msgs = sgChat.msgs.filter((x) => x.id !== m.id); drawSg(); }
    } else if (m.t === 'mail') {
      if (m.gift) mailGiftPopup([m.gift.sen && `${ic('sen')} ${fmt(m.gift.sen)} Sen`, m.gift.ngoc && `${ic('ngoc')} ${fmt(m.gift.ngoc)} Ngọc`].filter(Boolean), m.title);
      else if (!m.quiet) { Sound.chime?.(); toast(`${ic('mail')} Bạn có thư mới: <b>${esc(m.title)}</b>`, 5000); }
      refreshMail(true);
    } else if (m.t === 'adminGift') {
      showAdminGifts(m.gifts);
    } else if (m.t === 'donated') {
      Sound.success?.(); petalShower(40); loadStele();
      modal(`<div class="big">${ic('heart')}</div><h3>Đã nhận ${fmt(m.amount)} đ</h3>
        <p>Niệm Phật Online xin tuỳ hỷ công đức của bạn. Nguyện hồi hướng cho bạn và gia quyến thân tâm an lạc, vạn sự cát tường.<br>Nam mô A Di Đà Phật 🙏</p>
        <button class="btn gold" id="mClose">A Di Đà Phật</button>`, (el) => { el.querySelector('#mClose').onclick = closeModal; });
    } else if (m.t === 'rejoiced') {
      Sound.chime(); toast(`<svg class="i"><use href="#i-pray"/></svg> <b>${esc(m.by)}</b> vừa tùy hỷ đèn hoa đăng của bạn (+2 Sen)`);
      api('/me').then(setProfile).catch(() => {});
    } else if (m.t === 'loc') {
      if (m.spawns) S.world?.setLoc(m.spawns);
      if (m.gone) S.world?.removeLoc(m.gone);
    } else if (m.t === 'pet') {
      if (m.spawns) S.world?.setBeasts(m.spawns);
      if (m.gone) { if (m.gone === bond.id && m.by !== S.profile.user.id) cancelBond('Linh thú vừa kết duyên với người khác rồi'); S.world?.removeBeast(m.gone); }
    } else if (m.t === 'fund') {
      if (S.meta) { S.meta.fund = m.fund; paintFund(); }
    } else if (m.t === 'ticker') {
      S.meta.tickers = m.tickers || (m.ticker ? [m.ticker] : []);
      if (m.now) tickIdx = Math.max(0, S.meta.tickers.findIndex((t) => t.text === m.now)); // tin mới (cảm ơn ủng hộ) hiện ngay
      renderTicker(!!m.now);
    } else if (m.t === 'announce') {
      announce(m.text, m.fx); local.set('ann', m.text);
    }
  };
  ws.onclose = (e) => {
    if (e.code === 4003) { toast('Tài khoản đã bị khoá'); return; }
    if (e.code === 4000) { toast('Tài khoản đang được dùng ở nơi khác'); return; }
    if (e.code === 4008) return showFull();
    if (S.idle) return;
    setTimeout(connectWs, Math.min(15000, 1000 * 2 ** wsRetry++));
  };
}
// Chùa đã đủ người trực tuyến: hiện màn chờ, cứ 20 giây thử vào lại
let fullT;
async function showFull() {
  S.full = true;
  let cap = {}; try { cap = await api('/capacity'); } catch {}
  $('fullMsg').innerHTML = `Hiện có <b>${cap.online ?? '…'}/${cap.max ?? 200}</b> người đang hành trì trực tuyến – chùa đã đủ chỗ.<br>Mời bạn tĩnh tâm chờ giây lát, hệ thống sẽ tự đưa bạn vào khi có chỗ trống.`;
  $('fullFund').innerHTML = serverSwitch();
  show('fullScreen', true);
  let n = 20;
  clearInterval(fullT);
  fullT = setInterval(() => {
    $('fullCount').textContent = `Thử lại sau ${--n} giây`;
    if (n <= 0) { clearInterval(fullT); $('fullCount').textContent = 'Đang thử vào…'; connectWs(); }
  }, 1000);
}
// Kêu gọi góp chi phí máy chủ mới: tự nguyện, không phải điều kiện để vào chùa. Số điện thoại vào mục Góp ý ở trang quản trị
// Tiến độ quỹ mở máy chủ mới: thanh công khai ở thẻ Ủng hộ; đủ mục tiêu thì ẩn phần kêu gọi (.fund-ask)
const fundDone = () => { const f = S.meta?.fund; return !!f && f.raised >= f.goal; };
const fundBar = () => `<div class="fund" data-fund><div class="fund-top"><b>${ic('heart')} Quỹ mở máy chủ mới</b><span data-fund-pct></span></div><div class="fund-track"><i data-fund-fill></i></div><small data-fund-text></small></div>`;
function paintFund() {
  const f = S.meta?.fund;
  if (!f) return;
  const done = fundDone(), pct = Math.min(100, (f.raised / f.goal) * 100);
  $$('[data-fund]').forEach((el) => {
    el.classList.toggle('done', done);
    el.querySelector('[data-fund-pct]').textContent = `${pct < 10 && pct > 0 ? pct.toFixed(1).replace('.', ',') : Math.floor(pct)}%`;
    el.querySelector('[data-fund-fill]').style.width = `${pct}%`;
    el.querySelector('[data-fund-text]').textContent = done
      ? `Đã đủ ${fmt(f.goal)} đ và dừng nhận ủng hộ. Cảm ơn quý Phật tử, nam mô A Di Đà Phật.`
      : `Đã nhận ${fmt(f.raised)} đ / ${fmt(f.goal)} đ. Đủ thì dừng nhận.`;
  });
  $$('.fund-ask').forEach((el) => el.classList.toggle('hidden', done));
}
$('fullRetry').onclick = () => { clearInterval(fullT); $('fullCount').textContent = 'Đang thử vào…'; connectWs(); };
/* Lâu không thao tác: mời xác nhận trong 60 giây rồi ngắt kết nối để nhường chỗ, bấm là vào lại.
   Đang ngồi thiền có hẹn giờ thì không tính vì buổi thiền tự kết thúc. */
const IDLE_MS = 20 * 60e3, IDLE_WARN = 60;
let idleAt = Date.now(), idleLeft = 0;
for (const ev of ['pointerdown', 'keydown', 'wheel']) addEventListener(ev, () => { idleAt = Date.now(); }, { capture: true, passive: true });
function idleCheck() {
  if (S.idle || S.full || !S.temple || !S.ws) return;
  if (S.view === 'meditate' || quyL.on || Date.now() - idleAt < IDLE_MS) { idleLeft = 0; return show('idleWarn', false); }
  if (document.hidden) return idleOut();
  if (!idleLeft) { idleLeft = IDLE_WARN; Sound.chime(); show('idleWarn', true); }
  $('idleCount').textContent = `Tự ngắt sau ${idleLeft} giây`;
  if (--idleLeft <= 0) idleOut();
}
function idleOut() {
  S.idle = true; idleLeft = 0;
  show('idleWarn', false); show('idleScreen', true);
  if (S.view === 'chant') leaveChant();
  Sound.setActive(false);
  S.world?.stop();
  S.ws?.close(4100, 'Lâu không thao tác');
}
$('idleStay').onclick = () => { idleAt = Date.now(); idleLeft = 0; show('idleWarn', false); };
$('idleBack').onclick = () => {
  S.idle = false; idleAt = Date.now();
  show('idleScreen', false);
  S.world?.start();
  Sound.setActive(true);
  connectWs();
};
setInterval(idleCheck, 1000);
document.addEventListener('visibilitychange', idleCheck);
function sendWs(m) { if (S.ws?.readyState === 1) S.ws.send(JSON.stringify(m)); }
setInterval(() => {
  if (!S.world || !S.temple) return;
  const st = S.world.netState();
  if (!st) return;
  const sig = JSON.stringify(st);
  if (sig !== lastSent || Math.random() < 0.05) { lastSent = sig; sendWs({ t: 's', ...st }); }
}, 200);

let feedT;
function feed(text) {
  const el = $('guide');
  el.innerHTML = text; el.classList.remove('fade');
  clearTimeout(feedT); feedT = setTimeout(() => el.classList.add('fade'), 5000);
}

/* =====================================================================
   NGỒI / LẠY
   ===================================================================== */
function renderCtx(ctx) {
  Sound.setOutdoors(!!ctx.outside);
  const b = $('btnCtx');
  const tell = ctx.teller >= 0 && !ctx.seated;
  show(b, ctx.seated || ctx.canSit || ctx.canTalk || tell || !!ctx.door || !!ctx.cable);
  b.dataset.act = ctx.cable === 'riding' ? 'unride' : ctx.seated ? '' : ctx.canTalk ? 'talk' : tell ? 'tell' : ctx.cable ? 'ride' : ctx.door && !ctx.canSit ? 'door' : '';
  b.dataset.teller = ctx.teller;
  b.textContent = b.dataset.act === 'unride' ? 'Rời cáp treo' : b.dataset.act === 'ride' ? (S.world?.od?.cable?.say?.btn || 'Đi cáp treo lên đỉnh') : ctx.seated ? 'Đứng dậy' : b.dataset.act === 'talk' ? 'Thưa chuyện với thầy' : b.dataset.act === 'tell' ? 'Nghe kể chuyện' : b.dataset.act === 'door' ? (ctx.door === 'out' ? 'Ra sân ngắm cảnh' : 'Vào chánh điện') : 'Ngồi xuống';
  const ob = $('btnOut');
  show(ob, !!S.world?.od && !ctx.seated && !ctx.cable);
  show('btnChore', !!ctx.outside && !ctx.seated && !ctx.cable);
  if (ctx.outside) $('guide').classList.add('fade'); // chữ hướng dẫn ngồi bồ đoàn chỉ dành cho trong chánh điện
  ob.innerHTML = ctx.outside ? `${ic('temple')} Vào chánh điện` : `${ic('map')} Ra sân ngắm cảnh`;
  if (ctx.outside !== S.wasOutside) { S.wasOutside = ctx.outside; if (ctx.outside) toast(S.world?.od?.cable?.say ? `${ic('map')} ${esc(S.world.od.cable.say.hint)}` : S.world?.od?.cable ? `${ic('map')} Bạn đang ở sân chùa. Ga cáp treo ở bên phải sân – lại gần để đi cáp treo lên đỉnh núi viếng tượng Phật Bà.` : `${ic('map')} Bạn đang ở sân chùa. Đi dạo ngắm cảnh, bấm “Vào chánh điện” khi muốn quay lại lễ Phật.`, 5000); }
  if (!ctx.seated && S.bow !== 'idle') stopBowing(true);
}
$('btnOut').onclick = () => { Sound.chime?.(); S.world.goThroughDoor(); };
// Công quả: ra sân quét lá, trồng cây
function doChore(kind) {
  if (!S.world?.od) return toast('Chùa này không có sân để làm công quả');
  if (!S.world.outside) { S.world.goThroughDoor(); return toast(`${ic('map')} Ra tới sân rồi bấm <b>Công quả</b> để ${CHORE_NAME[kind].toLowerCase()}`, 5000); }
  if (S.chore) return;
  toast(choreHint(kind), 3000);
  sendWs({ t: 'chore', k: kind });
  S.chore = runChore(S.world, kind, {
    onCancel: () => { S.chore = null; toast('Đã dừng công quả vì bạn đi chỗ khác'); },
    onDone: async () => {
      S.chore = null;
      try {
        const r = await post('/practice', { type: kind, temple: S.temple.id });
        Sound.success(); petalShower(10); toast(`${ic('lotus')} ${CHORE_NAME[kind]} xong, công đức +${r.gained}`);
        handleResult(r, { silent: true });
      } catch (e) { toast(e.message); }
    },
  });
}
// Vườn Phật: trồng cây mua ở Cửa hàng, hái quả quý đổi Ngọc
const nameOfPlant = (id) => S.items[id]?.name || 'Cây';
function refreshPlants(templeId) {
  api(`/plants/${templeId}`).then((g) => {
    if (S.temple?.id !== templeId) return;
    S.plants = g.plants; S.plantCap = g.cap;
    showPlants(S.world, S.plants);
  }).catch(() => {});
}
async function openGarden() {
  let g;
  try { g = await api('/garden-mine'); } catch (e) { return toast(e.message); }
  const stock = S.meta.items.filter((i) => i.type === 'plant');
  const n = S.plants?.length || 0, cap = S.plantCap || 50;
  const treeRow = (p) => {
    const here = p.temple === S.temple?.id;
    const next = p.nextAt ? new Date(p.nextAt).toLocaleDateString('vi-VN') : '';
    return `<div class="card"><div class="body"><b>${esc(nameOfPlant(p.item))}</b> <small>${esc(p.templeName)}</small><p>Đã hái ${p.fruits}/${p.max} lần${p.ripe ? ` · <b>${p.ripe * p.per} quả chín</b>` : next ? ` · chín ngày ${next}` : ' · đã hái hết'}</p></div>
      <div class="side">${p.ripe ? (here ? `<button class="btn small gold" data-harvest="${p.id}">Hái</button>` : '<small>Đến chùa này để hái</small>') : ''}</div></div>`;
  };
  modal(`<h3>Vườn Phật</h3><p class="muted">Vườn chùa này có ${n}/${cap} cây. Mỗi người trồng tối đa ${g.perUser} cây ở một chùa. Cây trồng ngay chỗ bạn đang đứng ngoài sân.</p>
    ${stock.map((i) => `<div class="card"><div class="body"><b>${esc(i.name)}</b> <small>có ${qty(i.id)}</small></div><div class="side">${qty(i.id) ? `<button class="btn small gold" data-plant="${i.id}">Trồng</button>` : `<button class="btn small ghost" data-toshop="1">${ic('ngoc')} ${i.price_ngoc}</button>`}</div></div>`).join('')}
    ${g.mine.length ? `<h4 style="margin:12px 0 6px">Cây của bạn</h4>${g.mine.map(treeRow).join('')}` : ''}
    <p style="margin:12px 0 8px">Quả quý: <b>${fmt(g.fruit)}</b> · 1 quả đổi 1 Ngọc</p>
    ${g.fruit ? `<button class="btn gold" id="mEx">Đổi ${fmt(g.fruit)} quả lấy ${fmt(g.fruit)} Ngọc</button>` : ''}<button class="btn ghost" id="mX">Đóng</button>`, (el) => {
    el.querySelector('#mX').onclick = closeModal;
    const ex = el.querySelector('#mEx');
    if (ex) ex.onclick = async () => {
      ex.disabled = true;
      try { const r = await post('/plants/exchange', { qty: g.fruit }); setProfile(r); Sound.success(); toast(`${ic('ngoc')} Nhận ${r.ngoc} Ngọc`); closeModal(); } catch (e) { ex.disabled = false; toast(e.message); }
    };
    el.querySelectorAll('[data-toshop]').forEach((b) => (b.onclick = () => { closeModal(); openSheet('shop', 'plant'); }));
    el.querySelectorAll('[data-plant]').forEach((b) => (b.onclick = async () => {
      if (!S.world?.outside) return toast('Bạn ra ngoài sân rồi mới trồng được');
      const p = S.world.player.root.position;
      if (Math.abs(p.x) < 3.5) return toast('Đây là lối đi chính, bạn sang bên một chút rồi trồng nhé');
      if (S.world.groundAt(p.x, p.z, p.y + 1) === null) return toast('Chỗ này không trồng được, bạn đi chỗ khác nhé');
      b.disabled = true;
      sendWs({ t: 's', ...S.world.netState() });
      await new Promise((r) => setTimeout(r, 1100)); // vị trí báo về tiến trình chính mỗi giây
      try { const r = await post('/plants', { temple: S.temple.id, item: b.dataset.plant, x: p.x, z: p.z }); setProfile(r); Sound.success(); petalShower(10); toast(`${ic('lotus')} Đã trồng ${nameOfPlant(b.dataset.plant)}, 7 ngày sau cây có quả`); closeModal(); } catch (e) { b.disabled = false; toast(e.message); }
    }));
    el.querySelectorAll('[data-harvest]').forEach((b) => (b.onclick = async () => {
      b.disabled = true;
      try { const r = await post('/plants/harvest', { id: Number(b.dataset.harvest) }); setProfile(r); Sound.success(); toast(`${ic('lotus')} Hái được ${r.got} quả quý`); closeModal(); setTimeout(openGarden, 300); } catch (e) { b.disabled = false; toast(e.message); }
    }));
  });
}

// Hứng hoa sala: lớp vẽ trong suốt nằm trên cảnh chùa, cảnh vẫn chạy phía sau
const salaSprite = (gold) => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'); x.translate(32, 32);
  for (let i = 0; i < 5; i++) { x.rotate(Math.PI * 2 / 5); x.fillStyle = gold ? '#f7cfdc' : '#f6efc6'; x.beginPath(); x.ellipse(0, -15, 8, 15, 0, 0, 7); x.fill(); }
  x.fillStyle = gold ? '#f2b53c' : '#d9b13f'; x.beginPath(); x.arc(0, 0, 6, 0, 7); x.fill();
  return c;
};
async function openSala() {
  let b;
  try { b = await api('/sala/board'); } catch (e) { return toast(e.message); }
  const when = new Date(b.nextAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  modal(`<div class="big">${ic('lotus')}</div><h3>Hứng hoa sala</h3>
    <p>Kinh Đại Bát Niết Bàn kể đôi cây sala ở Câu Thi Na nở hoa trái mùa, rắc lên thân Đức Phật để cúng dường. Kéo khay hứng hoa sala vàng trắng 45 giây, hoa mạn-đà-la hồng từ trời tính 3 bông.</p>
    <p class="muted">Hôm nay còn ${b.left}/${b.daily} lượt · Tuần này ${fmt(b.me)} hoa · Đủ ${fmt(b.robeAt)} hoa (đang có ${fmt(b.total)}) nhận Áo Hoa Sala.</p>
    <h4 style="margin:10px 0 6px">Bảng tuần này <small class="muted">cập nhật mỗi 3 tiếng, lần tới ${when}</small></h4>
    <div style="max-height:170px;overflow:auto;margin-bottom:10px">${b.rows.map((r, i) => `<div style="display:flex;justify-content:space-between;padding:3px 2px"><span>${i + 1}. ${esc(r.name)}</span><b>${fmt(r.flowers)}</b></div>`).join('') || '<div class="empty" style="padding:10px">Chưa có ai trên bảng, bảng sẽ có ở lần cập nhật tới</div>'}</div>
    ${b.left ? '<button class="btn gold" id="mGo">Bắt đầu</button>' : ''}<button class="btn ghost" id="mX">Để sau</button>`, (el) => {
    el.querySelector('#mX').onclick = closeModal;
    const go = el.querySelector('#mGo');
    if (go) go.onclick = async () => {
      go.disabled = true;
      try { const s = await post('/sala/start', { temple: S.temple.id }); closeModal(); runSala(s); } catch (e) { go.disabled = false; toast(e.message); }
    };
  });
}
function runSala(s) {
  const templeId = S.temple.id;
  let seed = s.seed;
  const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const flowers = Array.from({ length: 60 }, (_, i) => ({ at: i * (s.dur - 4000) / 60 + rnd() * 300, x: 0.06 + rnd() * 0.88, fall: 2600 + rnd() * 1200, sway: rnd() * 6.28, spin: rnd() * 6.28, gold: i % 10 === 9, done: false }));
  const c = document.createElement('canvas');
  c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:28;touch-action:none;cursor:grab';
  const hud = document.createElement('div');
  hud.style.cssText = 'position:fixed;top:calc(12px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:29;display:flex;gap:12px;align-items:center;background:rgba(20,16,8,.6);color:#fff;padding:6px 14px;border-radius:20px;font-size:15px';
  hud.innerHTML = '<b id="salaN">0 hoa</b><span id="salaT">45s</span><button class="btn small ghost" id="salaX">Dừng</button>';
  document.body.append(c, hud);
  const ctx = c.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  let W = 0, H = 0;
  const size = () => { W = innerWidth; H = innerHeight; c.width = W * dpr; c.height = H * dpr; };
  size(); addEventListener('resize', size);
  const sp = salaSprite(false), spGold = salaSprite(true);
  let tray = 0.5, score = 0, over = false, raf = 0;
  const start = performance.now();
  const pop = [];
  const moved = (e) => { tray = Math.max(0.04, Math.min(0.96, e.clientX / W)); };
  c.addEventListener('pointerdown', (e) => { c.setPointerCapture(e.pointerId); moved(e); });
  c.addEventListener('pointermove', moved);
  c.addEventListener('contextmenu', (e) => e.preventDefault());
  const keys = {};
  const key = (e) => { if (e.code === 'ArrowLeft' || e.code === 'ArrowRight' || e.code === 'KeyA' || e.code === 'KeyD') { keys[e.code] = e.type === 'keydown'; e.preventDefault(); } if (e.type === 'keydown') e.stopPropagation(); };
  document.addEventListener('keydown', key, true); document.addEventListener('keyup', key, true);
  if (S.world) S.world.keys = {};
  const stop = () => {
    over = true; cancelAnimationFrame(raf);
    removeEventListener('resize', size); document.removeEventListener('keydown', key, true); document.removeEventListener('keyup', key, true);
    c.remove(); hud.remove();
  };
  hud.querySelector('#salaX').onclick = () => { stop(); toast('Đã dừng, lượt này không tính'); };
  const finish = async () => {
    stop();
    try {
      const r = await post('/sala/claim', { temple: templeId, flowers: score });
      setProfile(r); Sound.success(); petalShower(16);
      modal(`<div class="big">${ic('lotus')}</div><h3>Hứng được ${r.flowers} hoa</h3><p>Nhận ${ic('sen')} ${r.sen} Sen. Tổng cộng ${fmt(r.total)}/${fmt(r.robeAt)} hoa, hôm nay còn ${r.left} lượt.</p>${r.robe ? '<p><b>Bạn nhận được Áo Hoa Sala, mở Túi đồ để mặc.</b></p>' : ''}<button class="btn gold" id="mX">Nam mô A Di Đà Phật</button>`, (m) => { m.querySelector('#mX').onclick = closeModal; });
    } catch (e) { toast(e.message); }
  };
  let lastT = start;
  const frame = (now) => {
    if (over) return;
    const t = now - start, dt = now - lastT; lastT = now;
    if (keys.ArrowLeft || keys.KeyA) tray = Math.max(0.04, tray - dt * 0.0011);
    if (keys.ArrowRight || keys.KeyD) tray = Math.min(0.96, tray + dt * 0.0011);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const half = Math.max(46, Math.min(90, W * 0.11)), ty = H - 86 - (navigator.maxTouchPoints ? 40 : 0);
    const tx = tray * W;
    for (const f of flowers) {
      if (f.done || t < f.at) continue;
      const k = (t - f.at) / f.fall;
      if (k > 1.1) { f.done = true; continue; }
      const y = k * H - 20, x = f.x * W + Math.sin(f.sway + k * 5) * 26;
      if (y > ty - 12 && y < ty + 16 && Math.abs(x - tx) < half) {
        f.done = true; score += f.gold ? 3 : 1;
        pop.push({ x, y, at: now, text: f.gold ? '+3' : '+1' });
        if (f.gold) Sound.chime?.();
        hud.querySelector('#salaN').textContent = `${score} hoa`;
        continue;
      }
      const r = f.gold ? 19 : 13;
      ctx.save(); ctx.translate(x, y); ctx.rotate(f.spin + k * 4); ctx.drawImage(f.gold ? spGold : sp, -r, -r, r * 2, r * 2); ctx.restore();
    }
    ctx.fillStyle = 'rgba(120,86,40,.92)'; ctx.strokeStyle = '#e6c56a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(tx - half, ty); ctx.lineTo(tx + half, ty); ctx.quadraticCurveTo(tx + half * 0.7, ty + 26, tx, ty + 26); ctx.quadraticCurveTo(tx - half * 0.7, ty + 26, tx - half, ty); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
    for (let i = pop.length - 1; i >= 0; i--) { const p = pop[i], a = (now - p.at) / 600; if (a > 1) { pop.splice(i, 1); continue; } ctx.fillStyle = `rgba(255,240,180,${1 - a})`; ctx.fillText(p.text, p.x, p.y - a * 30); }
    hud.querySelector('#salaT').textContent = `${Math.max(0, Math.ceil((s.dur - t) / 1000))}s`;
    if (t >= s.dur) { finish(); return; }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
}

function choreMenu() {
  modal(`<div class="big">${ic('spark')}</div><h3>Công quả</h3><p>Đứng yên tại chỗ trong lúc làm. Mỗi ngày mỗi chùa được quét sân 3 lượt và trồng 1 cây. Cây bạn trồng ở lại sân cho mọi người cùng ngắm.</p>
    <button class="btn gold" data-c="sweep">Quét sân</button><button class="btn gold" data-c="plant">Trồng cây</button><button class="btn gold" id="mGarden">Vườn Phật</button><button class="btn gold" id="mSala">Hứng hoa sala</button><button class="btn ghost" id="mX">Để sau</button>`, (el) => {
    el.querySelector('#mX').onclick = closeModal;
    el.querySelector('#mGarden').onclick = () => { closeModal(); setTimeout(openGarden, 260); };
    el.querySelector('#mSala').onclick = () => { closeModal(); setTimeout(openSala, 260); };
    el.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => { closeModal(); doChore(b.dataset.c); }));
  });
}
$('btnChore').onclick = choreMenu;

/* ---------- Chữ chạy: thông báo ngắn chạy ngang đầu màn hình, chạm để đến nơi được giới thiệu ---------- */
let tickIdx = 0;
const tickList = () => (S.meta?.tickers || (S.meta?.ticker ? [S.meta.ticker] : [])).filter((t) => t?.text);
let tickShown = null;
// Tin mới đến giữa chừng chỉ vào hàng đợi: dòng đang chạy phải chạy hết lượt, trừ khi force (cảm ơn ủng hộ hiện ngay)
function renderTicker(force = false) {
  const list = tickList(), el = $('ticker');
  show(el, !!list.length); $('hud').classList.toggle('has-ticker', !!list.length);
  if (!list.length) { tickShown = null; return; }
  if (tickShown && !force) return;
  const t = list[tickIdx % list.length], txt = $('tickerTxt');
  tickShown = t.text;
  txt.textContent = t.text + (t.link ? '  ·  Chạm để đến ngay' : '');
  el.classList.toggle('link', !!t.link);
  el.dataset.link = t.link || '';
  // chạy lại từ đầu, tốc độ đều ~70px/giây bất kể độ dài chữ
  txt.style.animation = 'none'; void txt.offsetWidth; txt.style.animation = '';
  requestAnimationFrame(() => { const w = txt.scrollWidth + el.clientWidth; txt.style.animationDuration = `${Math.max(8, w / 70)}s`; });
}
// hết một lượt chạy thì sang dòng kế tiếp (danh sách có thể đã đổi trong lúc chạy)
$('tickerTxt').addEventListener('animationiteration', () => {
  const list = tickList();
  if (!list.length) return renderTicker(true);
  const at = list.findIndex((t) => t.text === tickShown);
  tickIdx = at < 0 ? tickIdx % list.length : at + 1;
  if (list[tickIdx % list.length].text !== tickShown) renderTicker(true);
});
$('ticker').onclick = () => {
  const link = $('ticker').dataset.link; if (!link || !S.world) return;
  const cable = link.startsWith('cable:'), id = cable ? link.slice(6) : link;
  if (!S.meta.temples.some((x) => x.id === id)) return;
  Sound.chime?.();
  if (S.temple?.id !== id) enterTemple(id);
  if (cable) goToCable(id);
};
// Đưa người chơi ra sân rồi đi tới ga cáp treo
function goToCable(id) {
  const until = Date.now() + 25000;
  const step = () => {
    const w = S.world;
    if (Date.now() > until || S.temple?.id !== id) return;
    if (!w?.od?.cable || !w.player || S.view !== 'hall') return setTimeout(step, 400);
    if (w.ride || w.nearCable()) return;
    if (!w.outside) { if (!w.doorTrip) w.goThroughDoor(); return setTimeout(step, 500); }
    const st = w.od.cable.station, P = w.player.root.position;
    // đi dọc sân tới ngang ga rồi rẽ vào; vướng cây/đá quá 8 giây thì đưa thẳng tới cạnh ga
    w.walkPath = [new THREE.Vector3(st.x, 0, st.z)];
    w.walkTarget = { pos: new THREE.Vector3(st.x * 0.5, 0, Math.max(P.z, st.z + 4)), cushion: null };
    toast(`${ic('map')} ${esc(w.od.cable.say?.go || 'Đang đưa bạn tới ga cáp treo… tới nơi bấm “Đi cáp treo lên đỉnh”.')}`, 4500);
    setTimeout(() => {
      if (S.temple?.id !== id || !w.outside || w.ride || w.nearCable()) return;
      for (let r = 1; r <= 4; r += 0.5) for (let a = 0; a < 6.28; a += 0.4) {
        const x = st.x + Math.cos(a) * r, z = st.z + Math.sin(a) * r, y = w.walkable(x, z, w.groundY ?? 0);
        if (y !== null && y !== undefined) { w.walkTarget = null; w.walkPath = null; P.set(x, y, z); w.groundY = y; w.emitContext?.(); return; }
      }
    }, 8000);
  };
  setTimeout(step, 600);
}
$('btnCtx').onclick = () => { const act = $('btnCtx').dataset.act; if (act === 'talk') return talkAbbot(); if (act === 'tell') return talkTeller(+$('btnCtx').dataset.teller); if (act === 'door') return S.world.goThroughDoor(); if (act === 'ride') { Sound.chime?.(); return S.world.rideCable(); } if (act === 'unride') return S.world.endRide(); if (S.world.seated) S.world.stand(); else if (S.world.sit()) Sound.chime(); };

function stopBowing(immediate) {
  if (!S.world?.player) return;
  S.world.setBowing(false, immediate);
  S.bow = immediate || S.world.player.bowT === 0 ? 'idle' : 'stopping';
  renderBowBtn();
}
$('btnBow').onclick = () => {
  if (S.bow === 'idle') {
    if (!S.world.seated && !S.world.sit()) { toast('Hãy đến gần một bồ đoàn trống để ngồi lạy'); return; }
    S.world.player.meditating = false;
    S.world.setBowing(true);
    S.bow = 'bowing';
  } else if (S.bow === 'bowing') stopBowing(false);
  renderBowBtn();
};
async function onBowDone() {
  Sound.chime();
  if (S.bow === 'stopping' && S.world.player.bowT === 0) { S.bow = 'idle'; renderBowBtn(); }
  S.pendingBows = (S.pendingBows || 0) + 1;
  if (S.pendingBows === 1) S.bowsAt = Date.now();
  if (S.pendingBows >= 4) sendBows();
}
// Lạy, hạt, mõ chưa kịp gửi được giữ lại khi đóng trang; lần sau vào chùa gửi nốt. Máy chủ vẫn giới hạn tốc độ như thường.
function savePending() {
  if (!S.profile) return;
  const p = { bows: S.pendingBows || 0, beads: S.pendingBeads || 0, tap: chant.tap || 0 };
  if (p.bows || p.beads || p.tap) keep(`pending:${S.profile.user.id}`, { ...p, at: Date.now() });
  else localStorage.removeItem(`niemphat:pending:${S.profile.user.id}`);
}
function restorePending() {
  if (S.pendingRestored) return;
  S.pendingRestored = true;
  const p = local.get(`pending:${S.profile.user.id}`);
  if (!p || Date.now() - p.at > 36e5) return;
  S.pendingBows = (S.pendingBows || 0) + Math.min(10, p.bows | 0);
  S.bowsAt = Date.now();
  S.pendingBeads += Math.min(60, p.beads | 0);
  chant.tap = (chant.tap || 0) + Math.min(60, p.tap | 0);
}
setInterval(() => { if (S.pendingRestored) savePending(); }, 2000);
addEventListener('pagehide', () => { if (S.pendingRestored) savePending(); });
document.addEventListener('visibilitychange', () => { if (S.pendingRestored) savePending(); });
// Gom vài lạy gửi một lần cho nhẹ máy chủ; dừng lạy thì gửi nốt ngay
async function sendBows() {
  if (S.sendingBows || !S.pendingBows || !S.temple) return;
  const n = Math.min(5, S.pendingBows);
  S.pendingBows -= n; S.sendingBows = true;
  try {
    const r = await post('/practice', { type: 'bow', count: n, lite: true, temple: S.temple.id });
    handleResult(r);
    if (r.extra?.together) floater(`<svg class="i"><use href="#i-fire"/></svg> Đồng tâm +${r.extra.together * 5}%`);
    const b = r.user.stats.bows, hit = [108, 500, 1000, 3000, 10000].find((m) => b >= m && b - n < m);
    if (hit) milestone(`${fmt(hit)} lạy`, '<svg class="i"><use href="#i-bow"/></svg>');
  } catch (e) { if (e.status === 429) S.pendingBows += n; else toast(e.message); } finally { S.sendingBows = false; }
}
setInterval(() => { if (S.pendingBows && (S.bow !== 'bowing' || Date.now() - S.bowsAt > 10000)) { S.bowsAt = Date.now(); sendBows(); } }, 1000);

function milestone(what, icon) {
  petalShower(30); Sound.success();
  modal(`<div class="big">${icon}</div><h3>Cột mốc ${what}!</h3><p>Sự tinh tấn của bạn thật đáng tùy hỷ.</p>
    <button class="btn gold" id="mShare">Khoe ngay <svg class="i"><use href="#i-spark"/></svg></button><button class="btn ghost" id="mClose">Tiếp tục</button>`, (el) => {
    el.querySelector('#mClose').onclick = closeModal;
    el.querySelector('#mShare').onclick = () => { closeModal(); openShare(`Cột mốc ${what}!`); };
  });
}

/* =====================================================================
   TRÀNG HẠT
   ===================================================================== */
const beads = new BeadsView($('beadsCanvas'), () => {
  S.beadShown++;
  S.pendingBeads++;
  Sound.click();
  if (S.beadShown % 108 === 0) { Sound.bell(Sound.now + 0.05, 220, 0.3, 6); }
  renderBeadCount();
});
function renderBeadCount() {
  const st = S.profile.user.stats;
  $('beadNum').textContent = S.beadShown % 108;
  const round = Math.floor(S.beadShown / 108) - Math.floor((st.beads || 0) / 108) + (st.rounds || 0);
  $('beadRound').textContent = 'Vòng ' + (ROUND_NAMES[round] || `thứ ${round + 1}`) + ` · tổng ${fmt(st.rounds || 0)} chuỗi`;
}
setInterval(async () => {
  if (!S.pendingBeads || !S.temple) return;
  const n = Math.min(30, S.pendingBeads);
  S.pendingBeads -= n;
  try {
    const r = await post('/practice', { type: 'bead', count: n, lite: true, temple: S.temple.id });
    handleResult(r, { silent: true });
    $('beadGain').textContent = `+${r.gained} công đức`;
    if (r.extra?.rounds) {
      petalShower(26);
      toast(`<svg class="i"><use href="#i-beads"/></svg> Tròn một chuỗi 108 hạt! +${r.extra.roundExp} công đức`);
    }
  } catch (e) { if (e.status !== 429) toast(e.message); }
}, 4000); // gom hạt cho nhẹ máy chủ

// Lần hạt ngay trên bồ đoàn như tụng kinh: cảnh chùa vẫn chạy, chuỗi hạt nằm ở khung dưới
let beadWaitSeat = 0;
$('btnBeads').onclick = () => {
  stopBowing(true);
  if (!S.world.seated && !S.world.sit()) {
    if (!S.world.walkToSeat()) { toast('Hãy vào chánh điện, ngồi lên bồ đoàn để lần hạt'); return; }
    beadWaitSeat = Date.now() + 20000;
    toast(`${ic('cushion')} Đang đến bồ đoàn…`);
    return;
  }
  beadWaitSeat = 0;
  S.view = 'beads';
  S.beadShown = S.profile.user.stats.beads || 0;
  beads.setSkin(S.items[S.profile.user.equipped.beads]?.data);
  renderBeadCount();
  $('beadGain').textContent = '';
  Sound.setActive(false);
  S.world.player.meditating = true;
  show('hud', false); show('lanternLayer', false); show('beadsView');
  liftForBeads();
  beads.start();
};
function liftForBeads() {
  const box = $('beadsView');
  if (matchMedia('(max-height: 480px)').matches) S.world.liftView(0, box.offsetWidth / 2);
  else S.world.liftView(Math.max(box.offsetHeight * 0.55, box.offsetHeight - innerHeight * 0.18));
}
addEventListener('resize', () => { if (S.view === 'beads') liftForBeads(); });
$('btnBeadsBack').onclick = () => {
  beads.stop();
  S.world.liftView(0);
  if (S.world.player) S.world.player.meditating = false;
  show('beadsView', false); show('lanternLayer'); resumeHall();
};
// đứng dậy khỏi bồ đoàn thì kết thúc, vừa tới bồ đoàn thì bắt đầu
setInterval(() => {
  if (S.view === 'beads' && !S.world?.seated) $('btnBeadsBack').click();
  if (beadWaitSeat && S.view === 'hall') { if (S.world.seated) $('btnBeads').click(); else if (Date.now() > beadWaitSeat || !S.world.walkTarget) beadWaitSeat = 0; }
}, 500);

/* =====================================================================
   THIỀN
   ===================================================================== */
let med = { min: 5, start: 0, timer: null };
$('btnMeditate').onclick = () => {
  if (!S.world.seated && !S.world.sit()) { toast('Hãy đến gần một bồ đoàn trống để ngồi thiền'); return; }
  stopBowing(true);
  show('medView'); show('medPick'); show('medRun', false);
  $$('#medDur button').forEach((b) => (b.onclick = () => { med.min = +b.dataset.m; $$('#medDur button').forEach((x) => x.classList.toggle('on', x === b)); }));
};
$('medCancel').onclick = () => show('medView', false);
$('medStart').onclick = async () => {
  try { await post('/practice', { type: 'meditate_start', temple: S.temple.id }); } catch (e) { toast(e.message); return; }
  S.view = 'meditate';
  S.world.player.meditating = true;
  Sound.setActive(false);
  Sound.bigBell();
  show('medPick', false); show('medRun'); show('hud', false);
  med.start = Date.now();
  $('medInfo').textContent = med.min ? `Mục tiêu ${med.min} phút · ${sectOf(S.profile.user.sect).name} ${S.profile.user.sect === 'truclam' ? '×1.3' : ''}` : 'Thiền tự do · tối đa 60 phút';
  let phase = 0;
  med.timer = setInterval(() => {
    const s = Math.floor((Date.now() - med.start) / 1000);
    $('medTime').textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    const p = (s % 10) / 10;
    const txt = p < 0.4 ? 'Hít vào…' : p < 0.5 ? 'Giữ…' : 'Thở ra…';
    if (txt !== $('breathText').textContent) $('breathText').textContent = txt;
    if ((med.min && s >= med.min * 60) || s >= 3600) endMeditation(true);
    if (s && s % 60 === 0 && phase !== s) { phase = s; Sound.chime(); }
  }, 250);
};
$('medStop').onclick = () => endMeditation(false);
async function endMeditation(completed) {
  clearInterval(med.timer);
  Sound.bigBell();
  S.world.player.meditating = false;
  show('medView', false);
  resumeHall();
  try {
    const r = await post('/practice', { type: 'meditate_end', temple: S.temple.id });
    handleResult(r, { silent: true });
    if (r.extra.minutes > 0) {
      modal(`<div class="big"><svg class="i"><use href="#i-meditate"/></svg></div><h3>${completed ? 'Viên mãn' : 'Xả thiền'}</h3><p>Bạn đã thiền ${r.extra.minutes} phút<br>+${r.gained} công đức</p>
        <p class="muted">“Tâm an thì cảnh an.”</p><button class="btn gold" id="mShare">Khoe ngay <svg class="i"><use href="#i-spark"/></svg></button><button class="btn ghost" id="mOk">Hồi hướng công đức <svg class="i"><use href="#i-pray"/></svg></button>`, (el) => {
        el.querySelector('#mOk').onclick = closeModal;
        el.querySelector('#mShare').onclick = () => { closeModal(); openShare(`Vừa thiền ${r.extra.minutes} phút`); };
      });
    } else toast('Thiền chưa đủ 1 phút nên chưa ghi nhận công đức');
  } catch (e) { toast(e.message); }
}
// ngồi tĩnh: mỗi phút +công đức
setInterval(async () => {
  if (S.idle || S.view !== 'hall' || !S.world?.seated || S.bow !== 'idle' || document.hidden) return;
  try { handleResult(await post('/practice', { type: 'sit', lite: true, temple: S.temple.id })); } catch {}
}, 60000);
// đi dạo ngoài sân: mỗi phút có di chuyển thật mới tính
setInterval(async () => {
  const w = S.world, p = w?.player?.root.position, last = S.strollAt;
  S.strollAt = p ? [p.x, p.z] : null;
  if (S.idle || S.view !== 'hall' || !w?.outside || !p || !last || document.hidden || Math.hypot(p.x - last[0], p.z - last[1]) < 3) return;
  try { handleResult(await post('/practice', { type: 'stroll', lite: true, temple: S.temple.id })); } catch {}
}, 60000);

/* =====================================================================
   DÂNG LỄ & ĐÈN HOA ĐĂNG
   ===================================================================== */
const hasPet = () => Object.keys(S.profile?.inventory || {}).some((id) => S.items[id]?.type === 'pet' && qty(id) > 0);
if ($('btnPet')) $('btnPet').onclick = () => {
  if (hasPet()) return openSheet('bag', 'pet');
  modal(`<div class="big">${ic('pet')}</div><h3>Bạn chưa có linh thú</h3>
    <p>Thỉnh linh thú ở Cửa hàng, làm nhiệm vụ để tích Ngọc, hoặc ra sân chùa đi tới gần linh thú để kết duyên.</p>
    <button class="btn gold" id="mShop">Đến Cửa hàng</button><button class="btn ghost" id="mQuest">Làm nhiệm vụ</button><button class="btn ghost" id="mX">Để sau</button>`, (m) => {
    m.querySelector('#mShop').onclick = () => { closeModal(); openSheet('shop', 'pet'); };
    m.querySelector('#mQuest').onclick = () => { closeModal(); openSheet('quests'); };
    m.querySelector('#mX').onclick = closeModal;
  });
};
$('btnOffer').onclick = (e) => { e.stopPropagation(); show('offerMenu', $('offerMenu').classList.contains('hidden')); };
document.addEventListener('pointerdown', (e) => { if (!e.target.closest('#offerMenu, #btnOffer')) show('offerMenu', false); });
function applyOfferVisual(item) {
  if (item === 'huong_tram') S.world.temple.addIncense();
  if (item === 'nen_sap') S.world.temple.brightenCandles();
  if (item === 'hoa_dang') S.world.temple.offerFlowers();
}
$$('[data-offer]').forEach((b) => (b.onclick = async () => {
  show('offerMenu', false);
  const it = b.dataset.offer;
  if (it === 'bell') {
    try { const r = await post('/practice', { type: 'bell', temple: S.temple.id }); Sound.bigBell(); handleResult(r); } catch (e) { toast(e.message); }
    return;
  }
  if (it === 'den_hoa_dang') return openLanternForm();
  if (!qty(it)) { toast(`Bạn đã hết ${S.items[it].name}. Mua thêm ở <svg class="i"><use href="#i-shop"/></svg> Cửa hàng`); return; }
  try {
    const r = await post('/use', { item: it, temple: S.temple.id });
    applyOfferVisual(it); Sound.chime(); handleResult(r);
    if (it === 'huong_tram') toast('<svg class="i"><use href="#i-incense"/></svg> Đã thắp hương · +20% công đức trong 10 phút');
  } catch (e) { toast(e.message); }
}));

function openLanternForm() {
  if (!qty('den_hoa_dang')) { toast('Bạn cần một Đèn hoa đăng (mua ở <svg class="i"><use href="#i-shop"/></svg> Cửa hàng)'); return; }
  modal(`<div class="big"><svg class="i"><use href="#i-lantern"/></svg></div><h3>Thả đèn hoa đăng</h3><p>Lời nguyện sẽ bay lên cho mọi người trong chùa cùng thấy.</p>
    <textarea class="wish" id="mWish" maxlength="120" placeholder="Nguyện cho gia đình bình an…"></textarea>
    <button class="btn gold" id="mGo">Thả đèn</button><button class="btn ghost" id="mX">Huỷ</button>`, (el) => {
    el.querySelector('#mX').onclick = closeModal;
    el.querySelector('#mGo').onclick = async () => {
      try {
        const r = await post('/lanterns', { text: el.querySelector('#mWish').value, temple: S.temple.id });
        closeModal(); setProfile(r); Sound.bell(Sound.now, 523, 0.15, 3);
        if (r.pending) toast('Đã nhận lời nguyện. Đèn sẽ bay lên sau khoảng 1 phút khi được duyệt', 5000);
      } catch (e) { toast(e.message); }
    };
  });
}

function launchLantern(l, delay = 0) {
  setTimeout(() => {
    if (S.view === 'setup' || S.view === 'chant') return;
    const d = document.createElement('div');
    d.className = 'lantern';
    d.style.left = 5 + Math.random() * 55 + '%';
    d.innerHTML = `<div class="l"><svg class="i"><use href="#i-lantern"/></svg></div><p><b>${esc(l.name)}</b>: ${esc(l.text)}</p>`;
    $('lanternLayer').appendChild(d);
    setTimeout(() => d.remove(), 16500);
  }, delay);
}
// Khung Đèn nguyện bên phải trên PC: luôn hiện, tắt được, nhớ lựa chọn trên máy này
const dockAgo = (t) => { const m = Math.max(1, Math.round((Date.now() - t) / 6e4)); return m < 60 ? `${m} phút trước` : m < 1440 ? `${Math.round(m / 60)} giờ trước` : `${Math.round(m / 1440)} ngày trước`; };
const dockFits = matchMedia('(min-width: 1100px) and (min-height: 600px)');
const dock = { scope: 'temple', list: [] };
const dockOn = () => local.get('wishDock') !== 'off';
function renderDockList() {
  $('wdCount').textContent = dock.list.length ? `${dock.list.length} ngọn đèn đang sáng` : '';
  $('wdList').innerHTML = dock.list.map((l) => `<div class="wd-item${l.mine ? ' mine' : ''}" id="wl${l.id}">
      <p class="wd-text">“${esc(l.text)}”</p>
      <div class="wd-foot"><span><b>${esc(l.name)}</b><small>${dock.scope === 'all' && l.temple_name ? esc(l.temple_name) + ' · ' : ''}${dockAgo(l.created_at)}</small></span>
      ${l.mine ? `<em>${ic('pray')} ${l.likes}</em>` : `<button class="wd-like${l.liked ? ' done' : ''}" data-wl="${l.id}" ${l.liked ? 'disabled' : ''}>${ic('pray')} ${l.likes}</button>`}</div></div>`).join('')
    || `<div class="wd-empty">${ic('lantern')}<p>Chưa có đèn nào. Hãy thả ngọn đèn đầu tiên!</p></div>`;
  $$('[data-wl]', $('wdList')).forEach((b) => (b.onclick = async () => {
    try {
      const r = await post(`/lanterns/${b.dataset.wl}/rejoice`), l = dock.list.find((x) => x.id === +b.dataset.wl);
      if (l) { l.liked = true; l.likes = r.likes; }
      renderDockList(); Sound.chime(); handleResult(r, { silent: true });
    } catch (e) { toast(e.message); }
  }));
}
/* Lịch sử hoạt động: bấm dòng nào thì tới đúng chùa, đúng người hoặc đúng ngọn đèn đó */
const ACT_ICON = { lantern: 'lantern', level: 'spark', item: 'spark', legend: 'spark', loc: 'lotus', pet: 'lotus' };
function renderActivity(box, list) {
  box.innerHTML = list.map((a, i) => `<button class="act-row${a.uid === S.profile?.user.id ? ' mine' : ''}" data-ai="${i}">
      <span class="act-ic">${ic(ACT_ICON[a.kind] || 'spark')}</span>
      <span class="act-body"><span><b>${esc(a.name)}</b> ${esc(a.text)}</span>${a.wish ? `<i>“${esc(a.wish)}”</i>` : ''}<small>${a.temple_name ? esc(a.temple_name) + ' · ' : ''}${dockAgo(a.at)}</small></span></button>`).join('')
    || `<div class="wd-empty">${ic('spark')}<p>Chưa có hoạt động nào.</p></div>`;
  $$('[data-ai]', box).forEach((b) => (b.onclick = () => activityGo(list[+b.dataset.ai])));
}
async function activityGo(a) {
  closeSheet();
  if (a.temple && S.temple?.id !== a.temple) {
    if (!S.meta.temples.some((t) => t.id === a.temple)) return toast('Chùa này hiện chưa mở');
    await enterTemple(a.temple);
  }
  if (a.kind === 'lantern') {
    launchLantern({ text: a.wish, name: a.name });
    if (dockFits.matches && dockOn()) {
      dock.scope = 'temple'; dock.focus = a.ref; loadDock();
    } else toast(`${ic('lantern')} <b>${esc(a.name)}</b>: “${esc(a.wish)}”`, 5000);
  } else if (a.kind === 'loc' || a.kind === 'pet') {
    if (S.world && !S.world.outside) S.world.goThroughDoor(); // lộc và linh thú ở ngoài sân
  } else openPlayerCard(a.uid);
}
let dockActT = 0;
async function loadDock() {
  const on = dockFits.matches && dockOn() && !!S.temple;
  show('wishDock', on); show('wdOpen', dockFits.matches && !dockOn());
  clearTimeout(dockActT);
  if (!on) return;
  $$('[data-wd]', $('wishDock')).forEach((b) => b.classList.toggle('on', b.dataset.wd === dock.scope));
  $('wdRelease').classList.toggle('hidden', dock.scope === 'act');
  if (dock.scope === 'act') {
    $('wdCount').textContent = 'Hoạt động gần đây';
    try { renderActivity($('wdList'), await api('/activity')); } catch {}
    dockActT = setTimeout(loadDock, 30e3);
    return;
  }
  try { dock.list = await api(dock.scope === 'all' ? '/lanterns?all=1' : `/lanterns?temple=${S.temple.id}`); renderDockList(); } catch {}
  if (dock.focus) {
    const el = $(`wl${dock.focus}`); dock.focus = 0;
    if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('flash'); } else toast('Ngọn đèn này đã trôi xa, không còn trong danh sách của chùa');
  }
}
function dockAdd(l) {
  if (!dockFits.matches || !dockOn() || dock.scope === 'act') return;
  dock.list = [{ likes: 0, liked: false, mine: l.user_id === S.profile?.user.id, temple_name: S.temple?.name, ...l }, ...dock.list.filter((x) => x.id !== l.id)].slice(0, 60);
  renderDockList();
}
$('wdClose').onclick = () => { local.set('wishDock', 'off'); loadDock(); };
$('wdOpen').onclick = () => { local.set('wishDock', 'on'); loadDock(); };
$('wdRelease').onclick = () => openLanternForm();
$$('[data-wd]', $('wishDock')).forEach((b) => (b.onclick = () => { dock.scope = b.dataset.wd; loadDock(); }));
dockFits.addEventListener('change', loadDock);
async function loadLanterns() {
  loadDock();
  try { (await api('/lanterns?temple=' + S.temple.id)).slice(0, 4).forEach((l, i) => launchLantern(l, 2500 + i * 4000)); } catch {}
}

/* =====================================================================
   KHOE / CHIA SẺ
   ===================================================================== */
/* =====================================================================
   TƯƠNG TÁC GIỮA PHẬT TỬ: thẻ Phật tử, lời chúc, tặng hương, bạn đồng tu, thời khoá
   ===================================================================== */
const templeName = (id) => S.meta.temples.find((t) => t.id === id)?.name || '';
const REL_BTN = { none: ['Kết bạn đồng tu', 'gold'], pending_out: ['Thu hồi lời mời', 'ghost'], pending_in: ['Đồng ý kết bạn', 'gold'], ok: ['Bạn đồng tu', 'ghost'] };
const GEAR_LABEL = { robe: 'Áo', hat: 'Mũ', staff: 'Pháp khí', beads: 'Tràng hạt', cushion: 'Bồ đoàn', cloud: 'Mây', pet: 'Linh thú' };
async function openPlayerCard(id) {
  let p;
  try { p = await api('/players/' + id); } catch (e) { toast(e.message); return; }
  const sect = sectOf(p.sect);
  const gear = Object.keys(GEAR_LABEL).map((t) => S.items[p.equipped?.[t]]).filter(Boolean);
  const relBtn = () => { const [t, c] = REL_BTN[p.relation] || REL_BTN.none; return `<button class="btn ${c}" id="pcFriend">${ic(p.relation === 'ok' ? 'check' : 'users')} ${t}</button>`; };
  modal(`<div class="pcard">
      <button class="pcard-x" id="pcX" title="Đóng" aria-label="Đóng">${ic('close')}</button>
      <div class="pcard-head" style="--sc:${sect.color}">${avaHtml(p)}<div><b>${esc(p.name)}</b><p>${sect.icon} ${esc(sect.name)} · Cấp ${p.level}</p><small>${esc(p.title)}${p.online ? ` · <span class="on">đang ở ${esc(templeName(p.online))}</span>` : ''}</small>${honorChip(p)}</div></div>
      <div class="pcard-stats"><div><b>${fmt(p.stats.bows)}</b><small>lạy</small></div><div><b>${fmt(p.stats.rounds)}</b><small>chuỗi hạt</small></div><div><b>${fmt(p.streak)}</b><small>ngày liên tiếp</small></div></div>
      ${p.relation === 'self' ? `<p class="pcard-chip">${ic('lotus')} Tích đức <b>${S.profile.user.duc}/100</b></p>` : ''}
      ${p.sangha ? `<p class="pcard-chip">${ic('temple')} Đạo tràng <b>${esc(p.sangha.name)}</b></p>` : ''}
      <div class="region">Đang trang bị</div>
      <div class="pcard-gear"><canvas class="tryon"></canvas><div class="pcard-items">${gear.map((it) => `<div class="pcard-item">${itemIcon(it)}<span><small>${GEAR_LABEL[it.type]}</small>${esc(it.name)}</span></div>`).join('')}</div></div>
      ${p.relation === 'self' ? '' : `
      ${S.profile.user.noChan ? '' : `<button class="btn small pcard-chan" id="pcChan">🦶 Chan <small>−10 tích đức, bạn còn ${S.profile.user.duc}</small></button>`}
      <div class="region">Gửi lời chúc</div>
      <div class="pcard-greets">${p.greets.map((g, i) => `<button class="chip" data-g="${i}">${esc(g)}</button>`).join('')}</div>
      <div class="pcard-own"><input id="pcText" maxlength="80" placeholder="Hoặc tự viết lời chúc…"><button class="btn small gold" id="pcSend">Gửi</button></div>
      <div class="pcard-acts"><button class="btn" id="pcIncense">${ic('incense')} Tặng hương <small>${qty('huong_tram')}</small></button><span id="pcRel">${relBtn()}</span></div>
      ${p.relation === 'ok' ? `<div class="pcard-acts"><button class="btn gold" id="pcChat">${ic('chat')} Nhắn tin</button><button class="btn" id="pcGift">${ic('gift')} Tặng quà</button></div>` : '<p class="muted pcard-hint">Kết bạn đồng tu để nhắn tin riêng và tặng quà cho nhau.</p>'}`}
      </div>`, (el) => {
    el.querySelector('#pcX').onclick = closeModal;
    paintThumbs(el, S.items, p.appearance);
    const worn = (t) => S.items[p.equipped?.[t]]?.data;
    mountTryOn(el.querySelector('.tryon'), { appearance: p.appearance, robe: worn('robe'), beads: worn('beads'), cushion: worn('cushion'), hat: worn('hat'), staff: worn('staff'), cloud: worn('cloud') });
    if (p.relation === 'self') return;
    const chanBtn = el.querySelector('#pcChan');
    if (chanBtn) chanBtn.onclick = async () => {
      // lần chan cuối sẽ hoá ngạ quỷ: bắt bấm lần nữa để khỏi lỡ tay
      if (S.profile.user.duc <= 10 && !chanBtn.dataset.sure) { chanBtn.dataset.sure = 1; chanBtn.innerHTML = 'Bấm lần nữa: bạn sẽ hoá ngạ quỷ, cần nghe kinh 30 phút'; return; }
      try {
        const r = await post('/chan', { to: p.id });
        setProfile(r); closeModal();
        if (r.user.duc > 0 && r.user.duc <= 30) toast(`Tích đức còn ${r.user.duc}. Về 0 sẽ hoá ngạ quỷ. Tụng trọn một bài kinh được +5`, 4500);
      } catch (e) { toast(e.message); }
    };
    const send = async (kind, text) => {
      try {
        const r = await post('/greet', { to: p.id, kind, text });
        setProfile(r); handleResult(r, { silent: true }); Sound.chime();
        sendWs({ t: 'emote', e: kind === 'huong' ? 'sen' : 'pray' });
        toast(kind === 'huong' ? `${ic('incense')} Đã tặng nén hương cho <b>${esc(p.name)}</b>` : `${ic('pray')} Đã gửi lời chúc tới <b>${esc(p.name)}</b>`);
        closeModal();
      } catch (e) { toast(e.message); }
    };
    el.querySelectorAll('[data-g]').forEach((b) => (b.onclick = () => send('chuc', p.greets[+b.dataset.g])));
    el.querySelector('#pcSend').onclick = () => { const t = el.querySelector('#pcText').value.trim(); if (t) send('chuc', t); };
    el.querySelector('#pcIncense').onclick = () => send('huong');
    if (el.querySelector('#pcChat')) { el.querySelector('#pcChat').onclick = () => openChat(p.id); el.querySelector('#pcGift').onclick = () => openChat(p.id, { gift: true }); }
    const wireRel = () => {
      el.querySelector('#pcFriend').onclick = async () => {
        try {
          if (p.relation === 'pending_out') {
            const r = await post(`/friends/${p.id}/withdraw`); p.relation = r.status;
            toast(`${ic('users')} ${r.withdrawn ? `Đã thu hồi lời mời gửi <b>${esc(p.name)}</b>` : `<b>${esc(p.name)}</b> đã đồng ý kết bạn trước đó`}`);
          } else if (p.relation === 'ok') { if (!confirm(`Huỷ kết bạn đồng tu với ${p.name}?`)) return; await api('/friends/' + p.id, { method: 'DELETE' }); p.relation = 'none'; }
          else { p.relation = (await post('/friends/' + p.id, { accept: p.relation === 'pending_in' })).status; toast(p.relation === 'ok' ? `${ic('users')} Đã kết bạn đồng tu với <b>${esc(p.name)}</b>` : `${ic('users')} Đã gửi lời mời kết bạn tới <b>${esc(p.name)}</b>`); }
        } catch (e) { toast(e.message); return; }
        el.querySelector('#pcRel').innerHTML = relBtn(); wireRel();
      };
    };
    wireRel();
  });
}
// Lời chúc nhận được khi vắng mặt
async function showInbox() {
  const gs = await api('/greetings').catch(() => []);
  if (!gs.length) return;
  modal(`<div class="big">${ic('pray')}</div><h3>Thư chúc của đạo hữu</h3>
    <div class="inbox">${gs.slice(0, 8).map((g) => `<div class="inbox-row"><span class="inbox-ic">${ic(g.kind === 'huong' ? 'incense' : 'pray')}</span><div><b>${esc(g.name)}</b>${g.kind === 'huong' ? ' tặng bạn một nén hương' : ''}<p>“${esc(g.text)}”</p></div></div>`).join('')}</div>
    ${gs.length > 8 ? `<p class="muted">… và ${gs.length - 8} lời chúc khác</p>` : ''}
    <button class="btn gold" id="ibOk">${ic('pray')} Tùy hỷ, cảm ơn</button>`, (el) => (el.querySelector('#ibOk').onclick = closeModal));
}
// Thời khoá tụng chung: báo trước 60 phút, trong giờ ×2 công đức
{
  let offset = null, lastLive = null;
  const tick = () => {
    const el = $('sessPill');
    if (!el || !S.meta?.sessions) return;
    if (offset === null) offset = (S.meta.serverNow || Date.now()) - Date.now();
    const d = new Date(Date.now() + offset + 7 * 3600e3), m = d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60;
    let live = null, next = null, wait = 1e9;
    for (const s of S.meta.sessions) {
      if (m >= s.start && m < s.start + s.len) live = s;
      let w = s.start - m; if (w < 0) w += 1440;
      if (w < wait) { wait = w; next = s; }
    }
    if (live) { el.className = 'sess live'; el.innerHTML = `${ic('bell')} ${live.name} · ×2 công đức · còn ${Math.ceil(live.start + live.len - m)}′`; }
    else if (wait <= 60) { el.className = 'sess soon'; el.innerHTML = `${ic('bell')} ${next.name} sau ${Math.ceil(wait)} phút`; }
    else el.className = 'sess hidden';
    if (live && lastLive !== live.id && S.view === 'hall') {
      Sound.bigBell?.();
      toast(`${ic('bell')} <b>${live.name}</b> bắt đầu – cùng đại chúng lạy Phật, niệm Phật trong ${live.len} phút để nhận ×2 công đức`, 7000);
    }
    lastLive = live?.id || null;
  };
  setInterval(tick, 15000); setTimeout(tick, 2500);
}

async function openShare(headline = 'Hôm nay tôi đã lên chùa <svg class="i"><use href="#i-pray"/></svg>', opts = {}) {
  const u = S.profile.user;
  const shot = S.world ? S.world.screenshot() : null;
  toast('Đang tạo ảnh…', 1200);
  const card = await makeCard({ user: u, sect: sectOf(u.sect), temple: S.temple?.name, headline, shot });
  const url = opts.url || shareUrl(u);
  const text = opts.text || `${headline.replace(/<[^>]*>/g, '').trim()} – ${u.name} (${u.title}) đang tu tập tại Niệm Phật Online. Cùng lên chùa với mình nhé!`;
  const claim = async () => {
    try {
      const r = await post('/share');
      setProfile(r);
      if (r.rewarded) { Sound.success(); toast(`<svg class="i"><use href="#i-gift"/></svg> Cảm ơn bạn đã lan tỏa! +${r.reward.sen} Sen, +${r.reward.exp} công đức`); handleResult(r, { silent: true }); }
    } catch {}
  };
  modal(`<h3>Khoe thành tích <svg class="i"><use href="#i-spark"/></svg></h3>
    <img src="${card.url}" style="width:100%;border-radius:16px;box-shadow:0 6px 20px rgba(0,0,0,.2)" alt="Thẻ thành tích" />
    <p class="muted">Chia sẻ mỗi ngày nhận <svg class="i"><use href="#i-sen"/></svg> 30 Sen. Bạn bè vào qua link của bạn thì cả hai cùng được <svg class="i"><use href="#i-sen"/></svg> 100 Sen.</p>
    ${navigator.share ? '<button class="btn gold" id="sNative"><svg class="i"><use href="#i-share"/></svg> Chia sẻ (Zalo, Facebook, Messenger…)</button>' : ''}
    <div class="row-btns" style="justify-content:center">
      <button class="btn small" style="background:#1877f2;color:#fff" id="sFb">Facebook</button>
      <button class="btn small" style="background:#0068ff;color:#fff" id="sZalo">Zalo</button>
      <button class="btn small ghost" id="sDl">Tải ảnh</button>
      <button class="btn small ghost" id="sCopy">Sao chép link</button>
    </div>
    <button class="btn ghost" id="sX">Đóng</button>`, (el) => {
    el.querySelector('#sX').onclick = closeModal;
    el.querySelector('#sNative')?.addEventListener('click', async () => { const ok = await nativeShare(card.blob, text, url); if (ok) claim(); });
    el.querySelector('#sFb').onclick = () => { facebookShare(url); claim(); };
    el.querySelector('#sZalo').onclick = async () => {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) { const ok = await nativeShare(card.blob, text, url); if (ok) claim(); return; }
      await copyText(`${text}\n${url}`);
      download(card.url);
      toast('Đã sao chép lời mời và tải ảnh. Hãy dán vào Zalo nhé!', 4000);
      window.open('https://chat.zalo.me/', '_blank');
      claim();
    };
    el.querySelector('#sDl').onclick = () => { download(card.url); claim(); };
    el.querySelector('#sCopy').onclick = async () => { await copyText(`${text}\n${url}`); toast('Đã sao chép link mời'); claim(); };
  });
}

/* =====================================================================
   BẢNG MENU (bottom sheets)
   ===================================================================== */
$$('.side-menu [data-sheet]').forEach((b) => (b.onclick = () => openSheet(b.dataset.sheet)));
$('meChip').onclick = () => openSheet('profile');
$('tName').onclick = () => openStory();
$('btnHelp').onclick = () => openHelp();
$('btnShare').onclick = () => { if (S.profile) openShare(); };
// Cộng đồng Facebook: mở tab mới để không mất phiên trong chùa
$('btnFb').onclick = () => modal(`<div class="big">${ic('fb')}</div><h3>Cộng đồng Niệm Phật Online</h3><p>Theo dõi TikTok và Facebook để cập nhật nội dung mới.</p>
  <a class="btn gold wide" href="https://www.tiktok.com/@tuanlieu0809?is_from_webapp=1&amp;sender_device=pc" target="_blank" rel="noopener">${ic('heart')} Thích trang TikTok</a>
  <a class="btn gold wide" href="https://www.facebook.com/phamtuan5890/" target="_blank" rel="noopener">${ic('heart')} Thích trang Facebook</a>
  <button class="btn ghost" id="mX">Để sau</button>`, (el) => (el.querySelector('#mX').onclick = closeModal));
// Đổi máy chủ ngay trong game: sang trang máy chủ kia, phiên ở máy này vẫn giữ nguyên
$('btnServer').onclick = () => {
  const here = SERVERS.find(serverHere) || SERVERS[0], list = SERVERS.filter((s) => !s.closed || s === here);
  modal(`<div class="big">${ic('server')}</div><h3>Đổi máy chủ</h3><p>Mỗi máy chủ có nhân vật, tiến độ và Ngọc riêng. Nhân vật ở máy chủ này vẫn được giữ nguyên, quay lại lúc nào cũng được.</p>
    <div class="server-list">${list.map((s) => `<a class="server${s === here ? ' best' : ''}" ${s === here ? 'aria-current="true"' : `href="${serverUrl(s)}"`}><span class="server-dot"></span><span class="server-main"><b>${s.name}</b><small>${s.desc}</small></span><span class="server-load" data-sw-load="${s.host}">${s === here ? 'Đang ở đây' : ''}</span></a>`).join('')}</div>
    <button class="btn ghost" id="mX">Đóng</button>`, (el) => {
    el.querySelector('#mX').onclick = closeModal;
    for (const s of list) {
      api.capacity().then((c) => {
        const load = el.querySelector(`[data-sw-load="${s.host}"]`);
        if (!load || !c?.max) return;
        load.closest('.server').querySelector('small').textContent = `${s.desc} · ${c.online.toLocaleString('vi-VN')} người đang online`;
        if (s === here) return;
        const k = c.online / c.max;
        load.textContent = k >= 1 ? 'Đã đầy' : c.busy ? 'Đang đông' : k > 0.75 ? 'Đông' : 'Còn chỗ';
        load.className = `server-load ${k >= 1 || c.busy ? 'full' : k > 0.75 ? 'busy' : 'free'}`;
      }).catch(() => {});
    }
  });
};
$('btnDonate').hidden = true;
// bấm vào số Ngọc: mở thẳng màn hình nạp
$('wNgoc').parentElement.classList.add('tap');
$('wNgoc').parentElement.onclick = () => { if (S.profile) { Sound.chime?.(); openSheet('shop', 'ngoc'); } };
$('btnMail').onclick = () => { if (S.profile) openMail(); };
$('btnWheel').onclick = () => { if (S.profile) openWheel(); };
// Gieo quẻ: mỗi ngày một quẻ, gieo rồi thì mở lại vẫn xem được quẻ hôm nay
const queCard = (q) => `<div class="que-card"><span class="que-rank">${esc(q.rank)}</span><h3>${esc(q.name)}</h3><p>${esc(q.text)}</p><p class="que-advice"><b>Lời nhắc hôm nay:</b> ${esc(q.advice)}</p></div>`;
async function refreshQue() {
  try { S.que = (await api('/que')).que; $('queBadge').classList.toggle('hidden', !!S.que); $('queBadge').textContent = S.que ? '' : '1'; } catch {}
}
async function openQue() {
  await refreshQue();
  if (S.que) return modal(`<h3>Quẻ hôm nay</h3>${queCard(S.que)}<p class="muted">Mỗi ngày gieo một quẻ, ngày mai quay lại nhé.</p><button class="btn gold" id="mX">Nam mô A Di Đà Phật</button>`, (el) => (el.querySelector('#mX').onclick = closeModal));
  modal(`<div class="big que-tube">${ic('story')}</div><h3>Gieo quẻ đầu ngày</h3><p>Thành tâm niệm một câu Phật hiệu rồi gieo. Mỗi ngày chỉ gieo một quẻ, quẻ là lời nhắc tu tập chứ không phải lời tiên đoán.</p>
    <button class="btn gold" id="mCast">Gieo quẻ</button><button class="btn ghost" id="mX">Để sau</button>`, (el) => {
    el.querySelector('#mX').onclick = closeModal;
    el.querySelector('#mCast').onclick = (e) => busy(e.target, async () => {
      el.querySelector('.que-tube').classList.add('shake-tube');
      Sound.chime?.();
      await new Promise((r) => setTimeout(r, 1200));
      try {
        const r = await post('/que');
        S.que = r.que; show('queBadge', false);
        handleResult(r, { silent: true });
        Sound.success(); petalShower(14);
        modal(`<h3>Quẻ hôm nay</h3>${queCard(r.que)}${r.already ? '' : `<p class="muted">Quà gieo quẻ: ${rewardText(r.reward)}</p>`}<button class="btn gold" id="mX">Nam mô A Di Đà Phật</button>`, (c) => (c.querySelector('#mX').onclick = closeModal), { replace: true });
      } catch (err) { toast(err.message); }
    });
  });
}
$('btnQue').onclick = () => { if (S.profile) openQue(); };

function rewardText(r = {}) {
  const parts = [];
  if (r.sen) parts.push(`<svg class="i"><use href="#i-sen"/></svg> ${r.sen}`);
  if (r.ngoc) parts.push(`<svg class="i"><use href="#i-ngoc"/></svg> ${r.ngoc}`);
  if (r.exp) parts.push(`<svg class="i"><use href="#i-spark"/></svg> ${r.exp} công đức`);
  for (const [k, n] of Object.entries(r.items || {})) parts.push(`${ic(ITEM_ICON[k] || 'gift')} ${n} ${S.items[k]?.name || k}`);
  return parts.join(' · ');
}
const itemIcon = (it) => it.type === 'plant' || it.type === 'fruit' ? `<span class="ic tint" style="background:${it.data.color}">${ic(it.type === 'fruit' ? 'spark' : 'lotus')}</span>` : ITEM_ICON[it.id]
  ? `<span class="ic">${ic(ITEM_ICON[it.id])}</span>`
  : `<span class="ic tint" data-thumb="${it.id}" style="background:${it.data.color || it.data.c1}">${ic(TYPE_ICON[it.type] || 'gift')}</span>`;


// Ảnh đại diện: ảnh tải lên, hoặc chữ cái đầu trên nền màu thiền phái
const avaHtml = (p, cls = '') => p.avatar
  ? `<span class="ava ${cls}"><img src="${esc(p.avatar)}" alt="" loading="lazy"></span>`
  : `<span class="ava ${cls}" style="background:${sectOf(p.sect)?.color || '#6b4a2a'}">${esc((p.name || '?').trim().split(/\s+/).pop()[0] || '?').toUpperCase()}</span>`;

// Chọn ảnh → cắt vuông giữa → thu về 256px JPEG → tải lên
function pickAvatar() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return;
    try {
      const bmp = await createImageBitmap(f);
      const side = Math.min(bmp.width, bmp.height), c = document.createElement('canvas');
      c.width = c.height = 256;
      c.getContext('2d').drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, 256, 256);
      let q = 0.86, data = c.toDataURL('image/jpeg', q);
      while (data.length > 320000 && q > 0.4) data = c.toDataURL('image/jpeg', (q -= 0.12));
      setProfile(await post('/me/avatar', { image: data }));
      toast('Đã cập nhật ảnh đại diện'); Sound.chime();
      if (S.sheetKind === 'profile') openSheet('profile');
    } catch (e) { toast(esc(e.message || 'Không đọc được ảnh')); }
  };
  inp.click();
}

// Nhiệm vụ: bấm là tới đúng chỗ làm. Cấp độ và chuỗi ngày không có nơi nào để đi nên không có nút.
const QUEST_TABS = { here: 'Chùa này', daily: 'Hằng ngày', weekly: 'Hằng tuần', achievement: 'Thành tựu' };
const QUEST_SEAT = { bow: 'btnBow', mo: 'btnChant', chant: 'btnChant', round: 'btnBeads', meditate_min: 'btnMeditate' };
const questHasGo = (q) => {
  const m = q.metric.split(':')[0];
  return !!QUEST_SEAT[m] || ['incense', 'bell', 'visit', 'temples_all', 'route', 'share', 'rejoice', 'invite', 'loc', 'pet', 'sweep', 'plant'].includes(m);
};
// Chờ người chơi ở đúng phía cửa (trong chánh điện hoặc ngoài sân) rồi mới làm tiếp
function questSide(outside, then, id = S.temple?.id) {
  const until = Date.now() + 25000;
  const step = () => {
    const w = S.world;
    if (Date.now() > until || S.temple?.id !== id) return;
    if (!w?.player || S.view !== 'hall' || w.doorTrip) return setTimeout(step, 300);
    if (!!w.outside !== outside) { w.goThroughDoor(); return setTimeout(step, 400); }
    then(w);
  };
  step();
}
function questSeat(btn) {
  questSide(false, (w) => {
    if (btn === 'btnBow' && S.bow !== 'idle') return;
    if (w.seated || w.sit()) return $(btn).click();
    if (!w.walkToSeat()) return toast('Chưa có bồ đoàn trống, bạn đợi một lát nhé');
    toast(`${ic('cushion')} Đang đến bồ đoàn…`);
    const until = Date.now() + 20000;
    const wait = () => {
      if (S.view !== 'hall' || Date.now() > until) return;
      if (w.seated) return $(btn).click();
      if (w.walkTarget) setTimeout(wait, 300);
    };
    wait();
  });
}
function questOffer(it) {
  questSide(false, () => {
    show('offerMenu', true);
    const b = $('offerMenu').querySelector(`[data-offer="${it}"]`);
    b?.classList.remove('flash'); void b?.offsetWidth; b?.classList.add('flash');
  });
}
async function questGo(q) {
  closeSheet();
  const [m, arg] = q.metric.split(':');
  if (m === 'share') return openShare();
  if (m === 'rejoice') return openSheet('community', 'wishes');
  if (m === 'invite') return openSheet('community', 'invite');
  if (m === 'visit') return openMapView();
  if (m === 'temples_all' || m === 'route') {
    const p = await loadPilgrim().catch(() => null);
    const list = m === 'route' ? p?.routes?.find((r) => r.id === arg)?.temples : S.meta.temples.map((t) => t.id);
    return openMapView({ focus: list?.find((id) => !S.profile.visited.includes(id)) });
  }
  if (!S.world?.player || S.view !== 'hall') return toast('Hãy vào chùa trước nhé');
  if (arg && ['loc', 'pet', 'bow'].includes(m) && arg !== S.temple?.id) await enterTemple(arg);
  if (QUEST_SEAT[m]) return questSeat(QUEST_SEAT[m]);
  if (m === 'sweep' || m === 'plant') return doChore(m);
  if (m === 'incense') return questOffer('huong_tram');
  if (m === 'bell') return questOffer('bell');
  if (m === 'loc') questSide(true, () => toast(`${ic('lotus')} Đi tới gần hoa sen vàng phát sáng trong sân để nhận lộc`, 5000));
  if (m === 'pet') questSide(true, () => toast(`${ic('pet')} Đi tới gần linh thú trong sân để kết duyên`, 5000));
}
function openSheet(kind, initial) {
  S.sheetKind = kind;
  show('offerMenu', false);
  const u = () => S.profile.user;
  if (kind === 'quests') {
    // Chùa này: gộp việc riêng của chùa đang ở với việc hằng ngày, hằng tuần làm được ngay tại đây; việc chưa xong lên trước
    const atTemple = (q) => { const [m, arg] = q.metric.split(':'); return arg ? arg === S.temple?.id && m !== 'route' : q.period !== 'achievement' && !!QUEST_SEAT[m] || ['incense', 'bell', 'loc', 'pet', 'sweep', 'plant'].includes(m) && q.period !== 'achievement'; };
    const inTab = (q, tab) => (tab === 'here' ? atTemple(q) : q.period === tab);
    sheet('Nhiệm vụ', [['here', 'Chùa này'], ['daily', 'Hằng ngày'], ['weekly', 'Hằng tuần'], ['achievement', 'Thành tựu']], (el, tab) => {
      const rank = (q) => (q.done && !q.claimed ? 0 : q.claimed ? 2 : 1);
      const qs = S.profile.quests.filter((q) => inTab(q, tab)).sort((a, b) => (tab === 'here' ? rank(a) - rank(b) : 0));
      const gifts = S.profile.quests.filter((q) => q.done && !q.claimed);
      $$('button', $('sheetTabs')).forEach((b) => {
        const n = gifts.filter((q) => inTab(q, b.dataset.tab)).length;
        b.innerHTML = `${QUEST_TABS[b.dataset.tab]}${n ? ` <i class="tab-dot">${n > 9 ? '9+' : n}</i>` : ''}`;
      });
      el.innerHTML = (tab === 'here' ? `<p class="muted quest-here">Việc làm được ngay tại <b>${esc(S.temple?.name || '')}</b></p>` : '') + (gifts.length ? `<button class="quest-gifts" id="questGifts">${ic('gift')} <b>${gifts.length} quà chưa nhận</b><span>Đến nhận ›</span></button>` : '') + qs.map((q) => `
        <div class="card ${q.claimed ? 'claimed' : q.done ? 'done' : ''}${!q.done && questHasGo(q) ? ' go' : ''}"${!q.done && questHasGo(q) ? ` data-go="${q.id}"` : ''}>
          <div class="body"><b>${esc(q.name)}</b><p>${esc(q.description)}</p>
            <div class="bar"><i style="width:${(q.progress / q.target) * 100}%"></i></div>
            <div class="rw">${q.progress}/${q.target} · ${rewardText(q.reward)}</div></div>
          <div class="side">${q.claimed ? '✓' : q.done ? `<button class="btn small gold" data-claim="${q.id}">Nhận</button>` : questHasGo(q) ? `<button class="btn small ghost">${q.metric === 'share' ? 'Khoe' : 'Đi'}</button>` : ''}</div>
        </div>`).join('') || '<div class="empty">Chưa có nhiệm vụ</div>';
      $$('[data-claim]', el).forEach((b) => (b.onclick = () => busy(b, async () => {
        try {
          const r = await post(`/quests/${b.dataset.claim}/claim`);
          Sound.success(); petalShower(16); toast(`<svg class="i"><use href="#i-gift"/></svg> Nhận: ${rewardText(r.reward)}`);
          handleResult(r, { silent: true });
        } catch (e) { toast(e.message); }
      })));
      $$('[data-go]', el).forEach((c) => (c.onclick = () => questGo(S.profile.quests.find((q) => q.id === c.dataset.go))));
      if ($('questGifts')) $('questGifts').onclick = () => {
        const g = gifts.find((q) => inTab(q, S.sheetTab)) || gifts[0];
        if (!inTab(g, S.sheetTab)) $(`sheetTabs`).querySelector(`[data-tab="${g.period}"]`).click();
        const card = $('sheetBody').querySelector(`[data-claim="${g.id}"]`)?.closest('.card');
        if (!card) return;
        card.scrollIntoView({ block: 'center', behavior: 'smooth' });
        card.classList.remove('flash'); void card.offsetWidth; card.classList.add('flash');
      };
    });
  }

  if (kind === 'bag') {
    sheet('Túi đồ', [['consumable', 'Lễ vật'], ['plant', 'Cây Phật'], ['robe', 'Áo tràng'], ['beads', 'Tràng hạt'], ['cushion', 'Bồ đoàn'], ['hat', 'Mũ'], ['staff', 'Pháp khí'], ['cloud', 'Mây'], ['pet', 'Linh thú']], (el, tab) => {
      if (tab === 'pet') return renderPetBook(el);
      if (tab === 'plant') {
        const own = S.meta.items.filter((i) => (i.type === 'plant' || i.type === 'fruit') && qty(i.id) > 0);
        el.innerHTML = own.map((it) => `<div class="card">${itemIcon(it)}<div class="body"><b>${esc(it.name)}</b> <small>×${qty(it.id)}</small><p>${esc(it.description)}</p></div></div>`).join('') + '<p class="muted" style="padding:10px 2px">Ra sân chùa, bấm Công quả rồi chọn Vườn Phật để trồng cây, hái quả và đổi Ngọc.</p>';
        return;
      }
      const list = S.meta.items.filter((i) => i.type === tab && (tab === 'consumable' ? qty(i.id) > 0 : owns(i.id)));
      el.innerHTML = list.map((it) => {
        const equipped = u().equipped[it.type] === it.id;
        return `<div class="card">${itemIcon(it)}<div class="body"><b>${esc(it.name)}</b>${tab === 'consumable' ? ` <small>×${qty(it.id)}</small>` : ''}<p>${esc(it.description)}</p></div>
          <div class="side">${tab === 'consumable'
            ? `<button class="btn small gold" data-use="${it.id}">Dùng</button>`
            : equipped ? (['hat', 'staff', 'cloud', 'pet'].includes(tab) ? `<button class="btn small ghost" data-unequip="${tab}">Tháo</button>` : '<span class="tag gold">Đang dùng</span>') : `<button class="btn small gold" data-equip="${it.id}">Dùng</button>`}</div></div>`;
      }).join('') || `<div class="empty">Túi trống. Ghé <svg class="i"><use href="#i-shop"/></svg> Cửa hàng hoặc làm <svg class="i"><use href="#i-scroll"/></svg> Nhiệm vụ để nhận thêm.</div>`;
      paintThumbs(el, S.items, u().appearance);
      $$('[data-use]', el).forEach((b) => (b.onclick = () => { closeSheet(); $(`offerMenu`).querySelector(`[data-offer="${b.dataset.use}"]`).click(); }));
      $$('[data-unequip]', el).forEach((b) => (b.onclick = async () => {
        try { setProfile(await post('/equip', { unequip: b.dataset.unequip })); toast('Đã tháo'); } catch (e) { toast(e.message); }
      }));
      $$('[data-equip]', el).forEach((b) => (b.onclick = async () => {
        try { setProfile(await post('/equip', { item: b.dataset.equip })); Sound.chime(); toast('Đã thay đổi'); } catch (e) { toast(e.message); }
      }));
    }, initial);
  }

  if (kind === 'shop') {
    sheet('Cửa hàng', [['consumable', 'Lễ vật'], ['plant', 'Cây Phật'], ['robe', 'Áo tràng'], ['beads', 'Tràng hạt'], ['cushion', 'Bồ đoàn'], ['hat', 'Mũ'], ['staff', 'Pháp khí'], ['cloud', 'Mây'], ['pet', 'Linh thú'], ['ngoc', '<svg class="i"><use href="#i-ngoc"/></svg> Nạp Ngọc']], (el, tab) => {
      if (tab === 'ngoc') {
        el.innerHTML = `<p class="muted" style="margin-bottom:10px">Ngọc chỉ dùng mua đồ trang trí, <b>không</b> mua được công đức hay thứ hạng.${S.meta.paymentMode === 'mock' ? ' <br><svg class="i"><use href="#i-warn"/></svg> Đang ở chế độ thanh toán thử nghiệm.' : ' Thanh toán bằng chuyển khoản ngân hàng (quét mã QR), Ngọc tự cộng sau vài giây.'}</p>` +
          S.meta.packages.map((p) => `<div class="card${p.hot ? ' pack-hot' : ''}">${p.hot ? `<em class="pack-rib">${p.hot}</em>` : ''}<span class="ic"><svg class="i"><use href="#i-ngoc"/></svg></span><div class="body"><b>${p.label}</b> ${p.tag ? `<span class="tag gold">${p.tag}</span>` : ''}<p>${fmt(p.vnd)} đ</p></div>
            <div class="side"><button class="btn small gold" data-pack="${p.id}">Nạp</button></div></div>`).join('');
        $$('[data-pack]', el).forEach((b) => (b.onclick = async () => {
          try {
            const r = await post('/topup', { package: b.dataset.pack });
            if (r.paymentMode === 'mock') {
              modal(`<h3>Thanh toán thử nghiệm</h3><p>Đơn #${r.order.id}: ${r.order.label} – ${fmt(r.order.vnd)} đ</p><p class="muted">Bản thử: bấm xác nhận để giả lập đã thanh toán.</p>
                <button class="btn gold" id="mPay">Xác nhận đã thanh toán</button><button class="btn ghost" id="mX">Huỷ</button>`, (m) => {
                m.querySelector('#mX').onclick = closeModal;
                m.querySelector('#mPay').onclick = async () => { try { setProfile(await post(`/topup/${r.order.id}/mock-pay`)); closeModal(); Sound.success(); toast(`<svg class="i"><use href="#i-ngoc"/></svg> +${r.order.ngoc} Ngọc`); } catch (e) { toast(e.message); } };
              });
            } else if (r.pay) payModal(r.order, r.pay);
            else toast(`Đã tạo đơn #${r.order.id}. Vui lòng chờ xác nhận thanh toán.`);
          } catch (e) { toast(e.message); }
        }));
        return;
      }
      const list = S.meta.items.filter((i) => i.type === tab && !i.data.default);
      el.innerHTML = list.map((it) => {
        const locked = u().level < it.unlock_level;
        const stack = tab === 'consumable' || tab === 'plant';
        const have = !stack && owns(it.id);
        const rank = it.data.rank;
        return `<div class="card${rank ? ' rank-' + rank : ''}">${itemIcon(it)}<div class="body"><b>${esc(it.name)}</b>${rank ? ` <span class="tag rank">${PET_RANK[rank] || 'Hiếm'}</span>` : ''}${stack ? ` <small>(có ${qty(it.id)})</small>` : ''}<p>${esc(it.description)}</p>
          ${it.data.legend && !have ? `<div class="lock">${ic('spark')} Không bán. Chỉ có khi được Duyên truyền thuyết trao tặng</div>` : ''}${locked ? `<div class="lock"><svg class="i"><use href="#i-lock"/></svg> Cần cấp ${it.unlock_level}</div>` : ''}${it.id === 'ao_hoa_sala' && !have ? `<div class="lock">${ic('lotus')} Hứng đủ 1080 hoa sala để nhận</div>` : it.data.gift && !have ? `<div class="lock">${ic('lotus')} Trụ trì tặng khi thiền hoặc đi dạo đủ 60 phút · đã thiền ${u().stats?.meditateMin || 0}, đã dạo ${u().stats?.strollMin || 0} phút</div>` : ''}</div>
          <div class="side">${!stack && tab !== 'pet' ? `<button class="btn small ghost" data-try="${it.id}">${ic('spark')} Xem thử</button>` : ''}${have ? '<span class="tag green">Đã có</span>' : `
            ${it.price_sen ? `<button class="btn small gold" data-buy="${it.id}" data-cur="sen" ${locked ? 'disabled' : ''}><svg class="i"><use href="#i-sen"/></svg> ${it.price_sen}</button>` : ''}
            ${it.price_ngoc ? `<button class="btn small ghost" data-buy="${it.id}" data-cur="ngoc" ${locked ? 'disabled' : ''}><svg class="i"><use href="#i-ngoc"/></svg> ${it.price_ngoc}</button>` : ''}`}</div></div>`;
      }).join('');
      paintThumbs(el, S.items, u().appearance);
      $$('[data-try]', el).forEach((b) => (b.onclick = () => {
        const it = S.items[b.dataset.try], eq = u().equipped, d = (t) => (it.type === t ? it.data : S.items[eq[t]]?.data);
        modal(`<h3>${esc(it.name)}</h3><canvas class="tryon"></canvas><p class="muted">Kéo để xoay · chỉ xem thử, chưa mua</p><button class="btn gold" id="mX">Đóng</button>`, (m) => {
          m.querySelector('#mX').onclick = closeModal;
          mountTryOn(m.querySelector('.tryon'), { appearance: u().appearance, robe: d('robe'), beads: d('beads'), cushion: d('cushion'), hat: d('hat'), staff: d('staff'), cloud: d('cloud') });
        });
      }));
      $$('[data-buy]', el).forEach((b) => (b.onclick = () => busy(b, async () => {
        try {
          setProfile(await post('/shop/buy', { item: b.dataset.buy, currency: b.dataset.cur }));
          Sound.success();
          const it = S.items[b.dataset.buy];
          if (it.type === 'plant') toast(`Đã mua ${it.name}. Ra sân chùa, bấm Công quả rồi chọn Vườn Phật để trồng`, 5000);
          else if (it.type !== 'consumable') {
            modal(`<div class="big">${it.type === 'robe' ? '<svg class="i"><use href="#i-robe"/></svg>' : it.type === 'beads' ? '<svg class="i"><use href="#i-beads"/></svg>' : '<svg class="i"><use href="#i-sen"/></svg>'}</div><h3>${esc(it.name)}</h3><p>Đã thêm vào bộ sưu tập của bạn.</p>
              <button class="btn gold" id="mEq">Dùng ngay</button><button class="btn ghost" id="mX">Để sau</button>`, (m) => {
              m.querySelector('#mX').onclick = closeModal;
              m.querySelector('#mEq').onclick = async () => { setProfile(await post('/equip', { item: it.id })); closeModal(); petalShower(14); };
            });
          } else toast(`Đã mua ${it.name}`);
        } catch (e) {
          toast(e.message);
          if (b.dataset.cur === 'ngoc' && e.message === 'Không đủ Ngọc') $('sheetTabs').querySelector('[data-tab=ngoc]').click(); // thiếu Ngọc: đưa thẳng tới chỗ nạp
        }
      })));
    }, initial);
  }

  if (kind === 'rank') {
    const f = { period: 'week', sect: '', temple: '' };
    sheet('Bảng xếp hạng tinh tấn', [['week', 'Tuần này'], ['month', 'Tháng này'], ['all', 'Tất cả']], async (el, tab, refresh) => {
      if (refresh) return;
      f.period = tab;
      const draw = async () => {
        el.innerHTML = skeleton(4);
        let d;
        try { d = await api(`/leaderboard?period=${f.period}&sect=${f.sect}&temple=${f.temple}`); } catch (e) { el.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
        const max = Math.max(1, ...d.sects.map((s) => s.score));
        const medal = (i) => (i <= 3 ? `<i class="medal m${i}">${i}</i>` : i);
        el.innerHTML = `
          <div class="filters">
            <select id="fSect"><option value="">Mọi thiền phái</option>${Object.values(S.meta.sects).map((s) => `<option value="${s.id}" ${f.sect === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}</select>
            <select id="fTemple"><option value="">Mọi ngôi chùa</option>${S.meta.temples.map((t) => `<option value="${t.id}" ${f.temple === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select>
          </div>
          ${!f.sect && d.sects.length ? `<div class="region">Thiền phái tinh tấn</div><div class="sect-bars">${d.sects.map((s) => `<div class="sect-bar"><span>${sectOf(s.sect).icon} ${sectOf(s.sect).name}</span><div class="bar"><i style="width:${(s.score / max) * 100}%;background:${sectOf(s.sect).color}"></i></div><span>${fmt(s.score)}</span></div>`).join('')}</div>` : ''}
          <div class="region">Phật tử tinh tấn</div>
          ${d.rows.length ? `<div class="podium">${[1, 0, 2].map((k) => { const r = d.rows[k]; if (!r) return '<div></div>'; return `<div class="pl p${k + 1}">${k === 0 ? `<svg class="crown"><use href="#i-trophy"/></svg>` : ''}${avaHtml(r)}<b>${esc(r.name)}</b><small>${fmt(r.score)} điểm</small><div class="pstep">${k + 1}</div></div>`; }).join('')}</div>` : ''}
          ${d.rows.slice(3).map((r) => `<div class="rank-row ${r.id === u().id ? 'me' : ''}"><span class="no">${medal(r.rank)}</span>${avaHtml(r)}<span><b>${esc(r.name)}</b><small>${sectOf(r.sect).icon} ${esc(r.title)}</small>${honorChip(r)}</span><span class="sc">${fmt(r.score)}</span></div>`).join('') || (d.rows.length ? '' : '<div class="empty">Chưa có ai. Hãy là người đầu tiên!</div>')}
          <div class="me-rank">${d.me ? `<div class="rank-row me"><span class="no">${d.me.rank}</span>${avaHtml(u())}<span><b>Bạn</b><small>Điểm tinh tấn = công đức từ hành trì</small></span><span class="sc">${fmt(d.me.score)}</span></div>` : '<p class="muted">Bạn chưa có điểm trong giai đoạn này. Lạy Phật, lần hạt, thiền định để ghi danh nhé.</p>'}</div>`;
        $('fSect').onchange = (e) => { f.sect = e.target.value; draw(); };
        $('fTemple').onchange = (e) => { f.temple = e.target.value; draw(); };
      };
      draw();
    });
  }

  if (kind === 'map') { openMapView(); return; }
  if (kind === 'guide') { openGuide(); return; }
  if (kind === 'temples') {
    sheet('Hành hương', null, (el) => renderTempleList(el, { selected: S.temple?.id, pick: (id) => { closeSheet(); if (id !== S.temple.id) enterTemple(id); } }));
  }

  if (kind === 'community') {
    let scope = 'all';
    const ago = (t) => { const m = Math.max(1, Math.round((Date.now() - t) / 6e4)); return m < 60 ? `${m} phút trước` : m < 1440 ? `${Math.round(m / 60)} giờ trước` : `${Math.round(m / 1440)} ngày trước`; };
    const EMO_NAMES = { pray: 'Chắp tay', sen: 'Hoa sen', wheel: 'Pháp luân', smile: 'Hoan hỷ' };
    sheet('Cộng đồng', [['wishes', 'Đèn nguyện'], ['friends', 'Đồng tu'], ['chat', `Tin nhắn${S.dm.unread ? ` <i class="tab-dot">${S.dm.unread > 9 ? '9+' : S.dm.unread}</i>` : ''}`], ['sangha', 'Đạo tràng'], ['invite', 'Mời bạn'], ['emote', 'Biểu cảm']], async (el, tab, refresh) => {
      if (tab === 'wishes' && !refresh) {
        const draw = async () => {
          const list = $('cmList', el);
          list.innerHTML = skeleton(4);
          if (scope === 'act') {
            const acts = await api('/activity').catch(() => []);
            if (!$('cmCount', el)) return;
            $('cmCount', el).textContent = 'Hoạt động gần đây · bấm để tới đúng chỗ';
            renderActivity(list, acts);
            return;
          }
          const ls = await api(scope === 'all' ? '/lanterns?all=1' : `/lanterns?temple=${S.temple.id}`).catch(() => []);
          if (!$('cmCount', el)) return; // đã chuyển sang tab khác trong lúc tải
          $('cmCount', el).textContent = ls.length ? `${ls.length} ngọn đèn đang sáng` : 'Chưa có ngọn đèn nào';
          list.innerHTML = ls.map((l) => `
            <div class="wish-card${l.mine ? ' mine' : ''}">
              <div class="wish-lamp">${ic('lantern')}</div>
              <div class="wish-main">
                <div class="wish-top"><b>${esc(l.name)}</b>${l.mine ? '<span class="tag gold">Của bạn</span>' : ''}</div>
                <p class="wish-text">“${esc(l.text)}”</p>
                <div class="wish-meta">${ic('temple')} ${esc(l.temple_name)} · ${ago(l.created_at)}</div>
              </div>
              ${l.mine ? `<div class="wish-like done" title="Lượt tùy hỷ">${ic('pray')}<b>${l.likes}</b></div>`
                : `<button class="wish-like${l.liked ? ' done' : ''}" data-like="${l.id}" ${l.liked ? 'disabled' : ''}>${ic('pray')}<b>${l.likes}</b><small>${l.liked ? 'Đã tùy hỷ' : 'Tùy hỷ'}</small></button>`}
            </div>`).join('') || `<div class="wish-empty">${ic('lantern')}<p>Chưa có đèn nào${scope === 'all' ? '' : ' ở chùa này'}. Hãy thả ngọn đèn đầu tiên!</p></div>`;
          $$('[data-like]', list).forEach((b) => (b.onclick = async () => {
            try {
              const r = await post(`/lanterns/${b.dataset.like}/rejoice`);
              b.disabled = true; b.classList.add('done', 'pop');
              b.innerHTML = `${ic('pray')}<b>${r.likes}</b><small>Đã tùy hỷ</small>`;
              Sound.chime(); handleResult(r, { silent: true });
            } catch (e) { toast(e.message); }
          }));
        };
        el.innerHTML = `<div class="comm">
          <div class="comm-hero wish-hero">
            <div class="hero-glow"></div>
            <div class="hero-ic">${ic('lantern')}</div>
            <div class="hero-body"><b>Đèn nguyện đại chúng</b><p id="cmCount">Đang thắp đèn…</p><small>Tùy hỷ là vui với điều thiện của người khác – chủ đèn nhận ${ic('sen')} 2 Sen mỗi lượt.</small></div>
          </div>
          <div class="comm-bar">
            <div class="seg"><button data-scope="all" class="${scope === 'all' ? 'on' : ''}">Mọi chùa</button><button data-scope="here" class="${scope === 'here' ? 'on' : ''}">${esc(S.temple?.name || 'Chùa này')}</button><button data-scope="act" class="${scope === 'act' ? 'on' : ''}">Hoạt động</button></div>
            <button class="btn small gold" id="cmRelease">${ic('lantern')} Thả đèn</button>
          </div>
          <div id="cmList"></div></div>`;
        $$('[data-scope]', el).forEach((b) => (b.onclick = () => { scope = b.dataset.scope; $$('[data-scope]', el).forEach((x) => x.classList.toggle('on', x === b)); draw(); }));
        $('cmRelease').onclick = () => { closeSheet(); openLanternForm(); };
        draw();
      }
      if (tab === 'chat' && !refresh) {
        el.innerHTML = `<div class="comm">${skeleton(3)}</div>`;
        const d = await api('/dm').catch(() => ({ threads: [], unread: 0 }));
        S.dm.unread = d.unread; S.dm.sg = d.sangha?.unread || 0; dmBadge();
        el.innerHTML = `<div class="comm">
          <div class="comm-hero friend-hero"><div class="hero-glow"></div><div class="hero-ic">${ic('chat')}</div>
            <div class="hero-body"><b>Tin nhắn riêng</b><p>Trò chuyện, tặng quà với bạn đồng tu</p><small>Chỉ bạn đồng tu mới nhắn được cho nhau. Lời lẽ hoà nhã, ái ngữ nhé.</small></div></div>
          ${d.sangha ? `<div class="friend-row${d.sangha.unread ? ' unread' : ''}" id="sgRow"><span class="ava sg-ava">${ic('temple')}</span><div class="fr-body"><b>${esc(d.sangha.name)}</b><small>${d.sangha.last ? `${d.sangha.last.from === S.profile.user.id ? 'Bạn' : esc(d.sangha.last.name)}: ${esc(d.sangha.last.text.slice(0, 40))}` : 'Nhóm đạo tràng · gửi lời chào đầu tiên'}</small></div>
            <div class="fr-side">${d.sangha.last ? `<small>${ago(d.sangha.last.at)}</small>` : ''}${d.sangha.unread ? `<i class="tab-dot">${d.sangha.unread}</i>` : ''}</div></div>` : ''}
          ${d.threads.map((t) => `<div class="friend-row${t.unread ? ' unread' : ''}" data-chat="${t.user.id}">${avaHtml(t.user)}<div class="fr-body"><b>${esc(t.user.name)}</b><small>${t.last.from === S.profile.user.id ? 'Bạn: ' : ''}${t.last.kind === 'gift' ? `${ic('gift')} ${esc(giftText(t.last.gift))}` : esc(t.last.text)}</small></div>
            <div class="fr-side"><small>${ago(t.last.at)}</small>${t.unread ? `<i class="tab-dot">${t.unread}</i>` : ''}</div></div>`).join('')
            || `<div class="wish-empty">${ic('chat')}<p>Chưa có cuộc trò chuyện nào. Vào tab <b>Đồng tu</b>, chạm vào một bạn để nhắn tin hoặc tặng quà.</p></div>`}</div>`;
        $$('[data-chat]', el).forEach((r) => (r.onclick = () => openChat(+r.dataset.chat)));
        if ($('sgRow')) $('sgRow').onclick = openSgChat;
      }
      if (tab === 'friends' && !refresh) {
        el.innerHTML = `<div class="comm">${skeleton(3)}</div>`;
        const d = await api('/friends').catch(() => ({ friends: [], incoming: [], outgoing: [] }));
        const row = (f, side = '') => `<div class="friend-row" data-pid="${f.id}">${avaHtml(f)}<div class="fr-body"><b>${esc(f.name)}</b><small>Cấp ${f.level} · ${f.online ? `<span class="on">đang ở ${esc(templeName(f.online))}</span>` : `${fmt(f.streak)} ngày liên tiếp`}</small></div>${side}</div>`;
        const on = d.friends.filter((f) => f.online).length;
        el.innerHTML = `<div class="comm">
          <div class="comm-hero friend-hero"><div class="hero-glow"></div><div class="hero-ic">${ic('users')}</div>
            <div class="hero-body"><b>Bạn đồng tu</b><p>${d.friends.length ? `${on}/${d.friends.length} bạn đang online` : 'Cùng nhau tinh tấn'}</p><small>Chạm vào một Phật tử trong chùa để gửi lời chúc, tặng hương hoặc kết bạn.</small></div></div>
          <div class="fr-search"><input id="frQ" placeholder="Tìm đạo hữu theo pháp danh hoặc mã số" maxlength="30" autocomplete="off"><button class="btn small gold" id="frGo">Tìm</button></div>
          <div id="frRes"></div>
          ${d.incoming.length ? `<div class="region">Lời mời kết bạn</div>${d.incoming.map((f) => row(f, `<button class="btn small gold" data-acc="${f.id}">Đồng ý</button>`)).join('')}` : ''}
          <div class="region">Bạn đồng tu (${d.friends.length})</div>
          ${d.friends.map((f) => row(f, `<button class="btn small ghost icon-btn" data-chat="${f.id}" title="Nhắn tin" aria-label="Nhắn tin">${ic('chat')}</button>` + (f.online ? (f.online === S.temple.id ? '<span class="tag green">Cùng chùa</span>' : `<button class="btn small gold" data-go="${f.online}">Đến chùa</button>`) : ''))).join('')
            || `<div class="wish-empty">${ic('users')}<p>Chưa có bạn đồng tu. Chạm vào một Phật tử trong chùa để kết bạn, hoặc mời bạn bè qua link.</p></div>`}
          ${d.outgoing.length ? `<div class="region">Đang chờ đồng ý</div>${d.outgoing.map((f) => row(f, `<button class="btn small ghost" data-unreq="${f.id}">Thu hồi</button>`)).join('')}` : ''}</div>`;
        const reTab = () => $('sheetTabs').querySelector('[data-tab=friends]').click();
        $$('[data-acc]', el).forEach((b) => (b.onclick = async (e) => { e.stopPropagation(); try { await post('/friends/' + b.dataset.acc, { accept: true }); toast(`${ic('users')} Đã kết bạn đồng tu`); reTab(); } catch (er) { toast(er.message); } }));
        $$('[data-unreq]', el).forEach((b) => (b.onclick = async (e) => { e.stopPropagation(); try { const r = await post(`/friends/${b.dataset.unreq}/withdraw`); toast(`${ic('users')} ${r.withdrawn ? 'Đã thu hồi lời mời' : 'Bạn ấy đã đồng ý kết bạn trước đó'}`); reTab(); } catch (er) { toast(er.message); } }));
        $$('[data-go]', el).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); closeSheet(); enterTemple(b.dataset.go); }));
        $$('[data-chat]', el).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); openChat(+b.dataset.chat); }));
        $$('[data-pid]', el).forEach((r) => (r.onclick = () => openPlayerCard(+r.dataset.pid)));
        const search = async () => {
          const q = $('frQ').value.trim(); if (!q) return;
          $('frRes').innerHTML = skeleton(2);
          const rs = await api('/players?q=' + encodeURIComponent(q)).catch((e) => { toast(e.message); return []; });
          const lbl = { ok: '<span class="tag green">Đồng tu</span>', pending_out: '<span class="tag">Đã gửi</span>', pending_in: '<span class="tag gold">Mời bạn</span>' };
          $('frRes').innerHTML = rs.length ? `<div class="region">Kết quả (${rs.length})</div>${rs.map((f) => row(f, lbl[f.relation] || `<button class="btn small gold" data-add="${f.id}">Kết bạn</button>`)).join('')}` : '<p class="muted" style="margin:6px 2px 10px">Không tìm thấy đạo hữu nào.</p>';
          $$('[data-pid]', $('frRes')).forEach((r) => (r.onclick = () => openPlayerCard(+r.dataset.pid)));
          $$('[data-add]', $('frRes')).forEach((b) => (b.onclick = async (e) => {
            e.stopPropagation();
            try { const st = (await post('/friends/' + b.dataset.add, {})).status; b.outerHTML = st === 'ok' ? lbl.ok : lbl.pending_out; toast(`${ic('users')} ${st === 'ok' ? 'Đã kết bạn đồng tu' : 'Đã gửi lời mời kết bạn'}`); } catch (er) { toast(er.message); }
          }));
        };
        $('frGo').onclick = search; $('frQ').onkeydown = (e) => { if (e.key === 'Enter') search(); };
      }
      if (tab === 'sangha' && !refresh) {
        el.innerHTML = `<div class="comm">${skeleton(3)}</div>`;
        const [{ sangha: s } = {}, top = [], open = []] = await Promise.all([api('/sangha').catch(() => ({})), api('/sangha/top').catch(() => []), api('/sangha/open').catch(() => [])]);
        const reTab = () => $('sheetTabs').querySelector('[data-tab=sangha]').click();
        const topHtml = top.length ? `<div class="region">Đạo tràng tinh tấn tuần này</div>${top.slice(0, 10).map((t, i) => `
          <div class="rank-row${s && t.id === s.id ? ' me' : ''}"><i class="medal m${i + 1}">${i + 1}</i><b>${esc(t.name)}</b><small>${t.members} người</small><span>${fmt(t.score)}</span></div>`).join('')}` : '';
        if (!s) {
          el.innerHTML = `<div class="comm">
            <div class="comm-hero sangha-hero"><div class="hero-glow"></div><div class="hero-ic">${ic('temple')}</div>
              <div class="hero-body"><b>Đạo tràng</b><p>Cùng nhau tu tập, cùng nhận quà</p><small>Nhóm tối đa 10 người. Mỗi tuần đạt mục tiêu công đức chung, mỗi thành viên nhận ${ic('sen')} 50 Sen và 1 nén hương.</small></div></div>
            <div class="sg-form"><input id="sgName" maxlength="30" placeholder="Tên đạo tràng (VD: Gia đình Sen Hồng)"><button class="btn gold" id="sgCreate">Lập mới</button></div>
            <div class="sg-form"><input id="sgCode" maxlength="6" placeholder="Mã đạo tràng (6 ký tự)" autocapitalize="characters"><button class="btn" id="sgJoin">Gia nhập</button></div>
            <div class="region">Đạo tràng đang nhận thành viên${open.length ? ` (${open.length})` : ''}</div>
            ${open.map((t) => `<div class="friend-row sg-open"><span class="sg-ic">${ic('temple')}</span><div class="fr-body"><b>${esc(t.name)}</b><small>${t.members}/${t.max} người · trưởng nhóm ${esc(t.owner || '')} · ${fmt(t.score)} công đức tuần</small></div><button class="btn small gold" data-sgid="${t.id}">Gia nhập</button></div>`).join('')
              || `<div class="wish-empty">${ic('temple')}<p>Chưa có đạo tràng nào còn chỗ. Hãy lập đạo tràng đầu tiên và mời bạn bè cùng tu!</p></div>`}
            ${topHtml}</div>`;
          $$('[data-sgid]', el).forEach((b) => (b.onclick = async () => { b.disabled = true; try { await post('/sangha/join', { id: +b.dataset.sgid }); Sound.success(); toast('Đã gia nhập đạo tràng'); reTab(); } catch (e) { toast(e.message); b.disabled = false; } }));
          $('sgCreate').onclick = async () => { try { await post('/sangha', { name: $('sgName').value }); Sound.success(); toast('Đã lập đạo tràng – gửi mã cho bạn bè để cùng tu'); reTab(); } catch (e) { toast(e.message); } };
          $('sgJoin').onclick = async () => { try { await post('/sangha/join', { code: $('sgCode').value }); Sound.success(); toast('Đã gia nhập đạo tràng'); reTab(); } catch (e) { toast(e.message); } };
        } else {
          const pct = Math.min(100, (s.total / s.goal) * 100), done = s.total >= s.goal;
          el.innerHTML = `<div class="comm">
            <div class="comm-hero sangha-hero"><div class="hero-glow"></div><div class="hero-ic">${ic('temple')}</div>
              <div class="hero-body"><b>${esc(s.name)}</b><p>${s.members.length}/${s.max} thành viên · mã <span class="sg-code">${esc(s.code)}</span></p>
                <div class="perk-bar light"><i style="width:${pct}%"></i></div><small>Tuần này ${fmt(s.total)} / ${fmt(s.goal)} công đức${done ? ' – đã đạt!' : ''}</small></div></div>
            <div class="row-btns">${done && !s.claimed ? `<button class="btn gold" id="sgClaim">${ic('gift')} Nhận thưởng tuần</button>` : s.claimed ? '<span class="tag green">Đã nhận thưởng tuần này</span>' : ''}
              <button class="btn gold" id="sgChatBtn">${ic('chat')} Nhắn tin nhóm</button>
              <button class="btn ghost" id="sgInvite">${ic('share')} Mời vào đạo tràng</button></div>
            <div class="region">Thành viên · công đức tuần</div>
            ${s.members.map((m) => `<div class="friend-row" data-pid="${m.id}">${avaHtml(m)}<div class="fr-body"><b>${esc(m.name)}${m.owner ? ' <span class="tag gold">Trưởng</span>' : ''}</b><small>${m.online ? `<span class="on">đang ở ${esc(templeName(m.online))}</span>` : `Cấp ${m.level} · ${m.idleDays >= s.idleDays ? `vắng ${m.idleDays} ngày` : `${fmt(m.streak)} ngày liên tiếp`}`}</small></div><span class="sg-week">${fmt(m.week)}</span>${s.isOwner && !m.owner && !m.online && m.idleDays >= s.idleDays ? `<button class="btn small ghost" data-sgkick="${m.id}" data-name="${esc(m.name)}">Mời ra</button>` : ''}</div>`).join('')}
            ${topHtml}
            <button class="btn ghost wide" id="sgLeave" style="margin-top:12px;color:#a0522d">Rời đạo tràng</button></div>`;
          if ($('sgClaim')) $('sgClaim').onclick = async () => { try { const r = await post('/sangha/claim'); setProfile(r); petalShower(24); Sound.success(); toast(`${ic('gift')} +${r.reward.sen} Sen và 1 nén hương`); reTab(); } catch (e) { toast(e.message); } };
          $('sgChatBtn').onclick = openSgChat;
          $('sgInvite').onclick = async () => {
            const text = `Mời bạn vào đạo tràng "${s.name}" trên Niệm Phật Online: mở Cộng đồng → Đạo tràng, nhập mã ${s.code}`, url = shareUrl(u());
            if (navigator.share) { try { await navigator.share({ text, url }); } catch {} } else { await copyText(`${text}\n${url}`); toast('Đã sao chép lời mời'); }
          };
          $$('[data-sgkick]', el).forEach((k) => (k.onclick = async (e) => {
            e.stopPropagation();
            if (!confirm(`Mời ${k.dataset.name} ra khỏi đạo tràng để nhường chỗ?`)) return;
            try { await post('/sangha/kick', { id: +k.dataset.sgkick }); toast('Đã nhường chỗ, thành viên sẽ nhận được thư báo'); reTab(); } catch (x) { toast(x.message); }
          }));
          $('sgLeave').onclick = async () => { if (!confirm('Rời đạo tràng?')) return; await post('/sangha/leave'); reTab(); };
          $$('[data-pid]', el).forEach((r) => (r.onclick = () => { if (+r.dataset.pid !== S.profile.user.id) openPlayerCard(+r.dataset.pid); }));
        }
      }
      if (tab === 'invite') {
        const us = u(), url = shareUrl(us), n = Math.min(3, us.invites);
        el.innerHTML = `<div class="comm">
          <div class="comm-hero invite-hero">
            <div class="hero-glow"></div>
            <div class="hero-ic">${ic('users')}</div>
            <div class="hero-body"><b>Kết duyên tu tập</b><p>Rủ bạn cùng lên chùa, cả hai cùng có quà.</p></div>
          </div>
          <div class="perk-list">
            <div class="perk"><span class="perk-ic">${ic('sen')}</span><div><b>Mỗi người bạn đăng ký</b><p>Cả hai nhận 100 Sen và 2 nén hương</p></div></div>
            <div class="perk"><span class="perk-ic">${ic('gift')}</span><div><b>Mời đủ 3 người</b><p>Nhận Bồ đoàn đài sen</p><div class="perk-bar"><i style="width:${(n / 3) * 100}%"></i></div><small>${us.invites >= 3 ? 'Đã đạt – tùy hỷ công đức!' : `Đã mời ${us.invites}/3`}</small></div></div>
          </div>
          <div class="invite-link"><span>${esc(url.replace(/^https?:\/\//, ''))}</span><button class="btn small ghost" id="iCopy">Sao chép</button></div>
          <button class="btn gold wide" id="iShare">${ic('share')} Chia sẻ link mời</button>
          <div class="invite-stats"><div><b>${fmt(us.invites)}</b><small>bạn đã mời</small></div><div><b>${fmt(us.streak)}</b><small>ngày tu liên tiếp</small></div></div></div>`;
        $('iShare').onclick = () => { closeSheet(); openShare(); };
        $('iCopy').onclick = async () => { await copyText(url); toast('Đã sao chép link mời'); };
      }
      if (tab === 'emote') {
        el.innerHTML = `<div class="comm">
          <p class="muted" style="margin:2px 2px 12px">Gửi biểu cảm – mọi người trong chùa sẽ thấy phía trên đầu bạn.</p>
          <div class="emo-grid">${EMOTES.map((e) => `<button class="emo-tile" data-emo="${e}"><span>${ic(e)}</span><small>${EMO_NAMES[e] || ''}</small></button>`).join('')}</div></div>`;
        $$('[data-emo]', el).forEach((b) => (b.onclick = () => { sendWs({ t: 'emote', e: b.dataset.emo }); closeSheet(); }));
      }
    }, initial);
  }

  if (kind === 'profile') {
    sheet('Hồ sơ tu tập', [['me', 'Của tôi'], ['honor', 'Danh hiệu'], ['collection', 'Bộ sưu tập'], ['account', 'Tài khoản']], (el, tab, refresh) => {
      const us = u(), st = us.stats, sect = sectOf(us.sect);
      if (tab === 'honor') { if (!refresh) renderHonorBook(el); return; }
      if (tab === 'me') {
        const days = Math.max(1, Math.ceil((Date.now() - us.createdAt) / 864e5));
        el.innerHTML = `
          <div class="ava-edit">${avaHtml(us)}<div class="body" style="flex:1;min-width:0"><b style="font-size:17px">${esc(us.name)}</b><p class="muted" style="margin:2px 0 6px">${sect.icon} ${sect.name} · Cấp ${us.level} · ${esc(us.title)}</p>${honorChip(us)}
            <div class="row-btns" style="margin:0"><button class="btn small gold" id="pAva">${ic('camera')} ${us.avatar ? 'Đổi ảnh' : 'Tải ảnh đại diện'}</button>${us.avatar ? '<button class="btn small ghost" id="pAvaDel">Gỡ ảnh</button>' : ''}</div></div></div>
          <div class="my-char">
            <div class="my-char-stage"><canvas class="tryon" id="pChar"></canvas><small>Kéo để xoay nhân vật</small></div>
            <div class="my-char-btns"><div class="wd-tabs my-pose"><button data-pose="sit" class="on">Ngồi thiền</button><button data-pose="stand">Đứng</button></div><button class="btn small ghost" id="pCharSave">${ic('camera')} Lưu ảnh</button></div>
            <div class="my-char-items">${Object.keys(GEAR_LABEL).map((t) => S.items[us.equipped?.[t]]).filter(Boolean).map((it) => `<div class="pcard-item">${itemIcon(it)}<span><small>${GEAR_LABEL[it.type]}</small>${esc(it.name)}</span></div>`).join('')}</div>
          </div>
          <div class="card"><div class="body"><div class="bar"><i style="width:${us.expNext ? (us.exp / us.expNext) * 100 : 100}%"></i></div><div class="rw">${fmt(us.exp)} / ${fmt(us.expNext)} công đức đến cấp tiếp theo</div></div></div>
          <div class="stat-grid">
            <div class="stat"><b>${fmt(st.bows)}</b><small><svg class="i"><use href="#i-bow"/></svg> Lạy Phật</small></div>
            <div class="stat"><b>${fmt(st.rounds)}</b><small><svg class="i"><use href="#i-beads"/></svg> Chuỗi tràng hạt (${fmt(st.beads)} hạt)</small></div>
            <div class="stat"><b>${fmt(st.meditateMin)}</b><small><svg class="i"><use href="#i-meditate"/></svg> Phút thiền</small></div>
            <div class="stat"><b>${fmt(us.streak)} <svg class="i"><use href="#i-fire"/></svg></b><small>Ngày liên tiếp (kỷ lục ${fmt(us.bestStreak)})</small></div>
            <div class="stat"><b>${S.profile.visited.length}/${S.meta.temples.length}</b><small><svg class="i"><use href="#i-temple"/></svg> Chùa đã viếng</small></div>
            <div class="stat"><b>${fmt(days)}</b><small>Ngày đồng hành</small></div>
          </div>
          <div class="row-btns"><button class="btn gold" id="pShare"><svg class="i"><use href="#i-spark"/></svg> Khoe thành tích</button><button class="btn gold hidden" id="pLegend">${ic('spark')} Khoe duyên lành</button><button class="btn ghost" id="pEdit">Sửa nhân vật</button><button class="btn ghost" id="pSect">Đổi phái (200 <svg class="i"><use href="#i-ngoc"/></svg>)</button></div>`;
        $('pShare').onclick = () => { closeSheet(); openShare(); };
        api('/legend/mine').then(({ award }) => { const b = $('pLegend'); if (!award || !b) return; show(b); b.onclick = () => { closeSheet(); shareLegend(award); }; }).catch(() => {});
        const worn = (t) => S.items[us.equipped?.[t]]?.data;
        const char = mountTryOn($('pChar'), { appearance: us.appearance, robe: worn('robe') || S.items.ao_lam?.data, beads: worn('beads'), cushion: worn('cushion'), hat: worn('hat'), staff: worn('staff'), cloud: worn('cloud') });
        paintThumbs(el, S.items, us.appearance);
        $$('[data-pose]', el).forEach((b) => (b.onclick = () => { char?.setPose(b.dataset.pose); $$('[data-pose]', el).forEach((x) => x.classList.toggle('on', x === b)); }));
        $('pCharSave').onclick = () => { if (char) download(char.snapshot(), `nhan-vat-${us.id}.png`); };
        $('pAva').onclick = pickAvatar;
        if ($('pAvaDel')) $('pAvaDel').onclick = async () => {
          try { setProfile(await api('/me/avatar', { method: 'DELETE' })); openSheet('profile'); } catch (e) { toast(e.message); }
        };
        $('pEdit').onclick = () => { closeSheet(); S.world.stop(); Sound.setActive(false); openSetup('edit'); };
        $('pSect').onclick = () => {
          el.innerHTML = `<p class="muted">Đổi thiền phái tốn 200 <svg class="i"><use href="#i-ngoc"/></svg>. Cấp độ và công đức được giữ nguyên.</p><div class="sect-list">${Object.values(S.meta.sects).map((s) => `
            <button class="sect ${s.id === us.sect ? 'on' : ''}" data-id="${s.id}" style="--sc:${s.color}"><span class="ic">${s.icon}</span><b>${s.name}</b><p>${esc(s.desc)}</p><small>${esc(s.bonusText)}</small></button>`).join('')}</div>`;
          $$('.sect', el).forEach((b) => (b.onclick = async () => {
            if (b.dataset.id === us.sect) return;
            try { setProfile(await post('/me/sect', { sect: b.dataset.id })); toast(`Đã gia nhập ${sectOf(b.dataset.id).name}`); petalShower(20); } catch (e) { toast(e.message); }
          }));
        };
      }
      if (tab === 'collection') {
        const types = [['robe', 'Áo tràng'], ['beads', 'Tràng hạt'], ['cushion', 'Bồ đoàn']];
        const all = S.meta.items.filter((i) => !['consumable', 'plant', 'fruit'].includes(i.type));
        const got = all.filter((i) => owns(i.id)).length;
        const badges = S.profile.quests.filter((q) => q.period === 'achievement');
        el.innerHTML = `<div class="card"><span class="ic"><svg class="i"><use href="#i-bag"/></svg></span><div class="body"><b>Bộ sưu tập ${got}/${all.length}</b><div class="bar"><i style="width:${(got / all.length) * 100}%"></i></div></div></div>` +
          types.map(([t, n]) => `<div class="region">${n}</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:8px">${all.filter((i) => i.type === t).map((i) => `
            <div class="stat" style="text-align:center;${owns(i.id) ? '' : 'opacity:.35;filter:grayscale(1)'}"><div style="width:40px;height:40px;border-radius:50%;margin:0 auto 6px;background:${i.data.color || i.data.c1}"></div><small>${esc(i.name)}</small></div>`).join('')}</div>`).join('') +
          `<div class="region">Huy hiệu</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px">${badges.map((q) => `
            <div class="stat" style="text-align:center;${q.done ? '' : 'opacity:.35;filter:grayscale(1)'}"><div style="font-size:28px">${q.done ? '<svg class="i"><use href="#i-medal"/></svg>' : '<svg class="i"><use href="#i-lock"/></svg>'}</div><small>${esc(q.name)}</small></div>`).join('')}</div>`;
      }
      if (tab === 'account') {
        const acc = S.profile.account || {};
        el.innerHTML = `<div class="acc-box ${acc.username ? 'ok' : ''}">${acc.username
            ? `<div><b>${ic('check')} Tên đăng nhập: ${esc(acc.username)}</b><small>Đăng nhập trên máy khác bằng tên này và mật khẩu của bạn.</small></div><button class="btn small ghost" id="aAcc">Đổi mật khẩu</button>`
            : `<div><b>${ic('lock')} Chưa có tài khoản đăng nhập</b><small>Tạo tên đăng nhập + mật khẩu để không mất công đức khi đổi máy.</small></div><button class="btn small gold" id="aAcc">Tạo ngay</button>`}</div>
          <p class="muted">Hoặc giữ <b>mã khôi phục</b> để đăng nhập trên máy khác. Không chia sẻ mã cho ai.</p>
          <div class="code" id="rcode">••••••••••••••••</div>
          <div class="row-btns"><button class="btn ghost" id="aShow">Hiện mã</button><button class="btn ghost" id="aCopy">Sao chép mã</button></div>
          <div class="row-btns"><button class="btn ghost" id="aOut" style="color:#a0522d">Đăng xuất khỏi máy này</button></div>`;
        $('aAcc').onclick = () => accountModal();
        $('aShow').onclick = () => ($('rcode').textContent = token.get());
        $('aCopy').onclick = async () => { await copyText(token.get()); toast('Đã sao chép mã khôi phục'); };
        $('aOut').onclick = () => {
          if (!confirm(acc.username ? `Đăng xuất? Bạn vào lại bằng tên đăng nhập "${acc.username}" và mật khẩu.` : 'Bạn chưa tạo tên đăng nhập. Đã lưu mã khôi phục chưa? Nếu chưa, bạn sẽ mất tài khoản này.')) return;
          token.clear(); location.reload();
        };
      }
    });
  }

  if (kind === 'support') {
    sheet('Góp ý', [['place', 'Đề xuất chùa'], ['feature', 'Góp ý tính năng']], (el, tab, refresh) => {
      if (refresh) return;
      const place = tab === 'place';
      el.innerHTML = `<div class="comm">
        <div class="comm-hero fb-hero"><div class="hero-glow"></div><div class="hero-ic">${ic(place ? 'pin' : 'chat')}</div>
          <div class="hero-body"><b>${place ? 'Đề xuất chùa / địa điểm' : 'Góp ý cho Niệm Phật Online'}</b>
          <p>${place ? 'Bạn muốn hành hương tới ngôi chùa nào? Đội ngũ sẽ dựng chùa được đề xuất nhiều nhất.' : 'Tính năng bạn mong muốn, điều chưa hài lòng hay lỗi gặp phải – mọi góp ý đều được đọc.'}</p></div></div>
        <div class="fb-form">
          ${place ? `<label>Tên chùa / địa điểm<input id="fbPlace" maxlength="120" placeholder="VD: Chùa Bái Đính – Ninh Bình"></label>` : `<div class="fb-kinds">${[['feature', 'Tính năng mới'], ['bug', 'Báo lỗi'], ['other', 'Khác']].map(([k, t], i) => `<button class="chip${i ? '' : ' on'}" data-k="${k}">${t}</button>`).join('')}</div>`}
          <label>${place ? 'Vì sao bạn muốn có chùa này? (cảnh đẹp, kiến trúc, kỷ niệm…)' : 'Nội dung góp ý'}<textarea id="fbText" rows="5" maxlength="1000" placeholder="${place ? 'VD: Chùa có Bảo tháp và hành lang La Hán rất đẹp…' : 'VD: Mong có thêm tụng kinh Phổ Môn, chế độ ban đêm…'}"></textarea></label>
          <label>Liên hệ (không bắt buộc)<input id="fbContact" maxlength="80" placeholder="Zalo / email để đội ngũ phản hồi"></label>
          <button class="btn gold wide" id="fbSend">${ic('check')} Gửi ${place ? 'đề xuất' : 'góp ý'}</button>
        </div></div>`;
      let kind = place ? 'place' : 'feature';
      $$('[data-k]', el).forEach((b) => (b.onclick = () => { kind = b.dataset.k; $$('[data-k]', el).forEach((x) => x.classList.toggle('on', x === b)); }));
      $('fbSend').onclick = async () => {
        try {
          await post('/feedback', { kind, place: $('fbPlace')?.value, text: $('fbText').value, contact: $('fbContact').value });
          Sound.chime(); petalShower(12, ['🪷', '✨']);
          el.innerHTML = `<div class="comm"><div class="wish-empty">${ic('pray')}<p><b>Cảm ơn bạn đã góp ý!</b><br>Đội ngũ sẽ đọc kỹ và cải thiện Niệm Phật Online. A Di Đà Phật 🙏</p>
            <button class="btn ghost" id="fbMore">Gửi thêm</button></div></div>`;
          $('fbMore').onclick = () => $('sheetTabs').querySelector(`[data-tab=${tab}]`).click();
        } catch (e) { toast(e.message); }
      };
    }, initial === 'donate' ? 'place' : initial);
  }

  if (kind === 'settings') {
    sheet('Cài đặt', null, (el) => {
      el.innerHTML = `
        ${canInstall() ? `<button class="btn gold" id="oInstall" style="width:100%;margin-bottom:8px">${ic('upload')} Cài ứng dụng lên màn hình chính</button>` : isStandalone() ? `<p class="muted" style="font-size:12px;margin-bottom:6px">${ic('check')} Đang chạy dạng ứng dụng</p>` : ''}
        <div class="setting-links"><button class="btn ghost small" id="oHelp">Cách chơi</button><button class="btn ghost small" id="oShare">${ic('share')} Chia sẻ</button></div>
        <label class="setting"><svg class="i"><use href="#i-bell"/></svg> Âm thanh <input type="checkbox" id="oSound" ${Sound.enabled ? 'checked' : ''}></label>
        <label class="setting"><svg class="i"><use href="#i-drum"/></svg> Tiếng mõ niệm Phật nền <input type="checkbox" id="oChant" ${Sound.chanting ? 'checked' : ''}></label>
        <label class="setting"><svg class="i"><use href="#i-sound"/></svg> Tiếng niệm “Nam mô A Di Đà Phật” của đại chúng <input type="checkbox" id="oVoice" ${Sound.voice ? 'checked' : ''}></label>
        <label class="setting">🦶 Chơi chan với mọi người <input type="checkbox" id="oChan" ${S.profile.user.noChan ? '' : 'checked'}></label>
        <label class="setting"><svg class="i"><use href="#i-sound"/></svg> Nhạc nền riêng của từng chùa <input type="checkbox" id="oMusic" ${Sound.musicOn ? 'checked' : ''}></label>
        <div class="vol-box">
          ${[['master', 'sound', 'Âm lượng tổng'], ['music', 'sound', 'Nhạc nền chùa'], ['rhythm', 'drum', 'Mõ & chuông'], ['voice', 'pray', 'Tiếng niệm đại chúng'], ['sfx', 'bell', 'Hiệu ứng (chuông dâng lễ, lần hạt)']].map(([k, icn, label]) => `
          <label class="setting vol">${ic(icn)} <span>${label}</span><input type="range" min="0" max="100" data-vol="${k}" value="${Math.round(Sound.vol[k] * 100)}"><b>${Math.round(Sound.vol[k] * 100)}</b></label>`).join('')}
        </div>
        <label class="setting">Nhịp mõ <input type="range" id="oTempo" min="50" max="120" value="${Sound.tempo}"><span id="oTempoV">${Sound.tempo}</span></label>
        <label class="setting"><svg class="i"><use href="#i-palette"/></svg> Đồ hoạ <select id="oQ"><option value="high" ${S.world.quality === 'high' ? 'selected' : ''}>Đẹp</option><option value="low" ${S.world.quality === 'low' ? 'selected' : ''}>Mượt (máy yếu)</option></select></label>
        <label class="setting"><svg class="i"><use href="#i-tag"/></svg> Hiện tên người khác <input type="checkbox" id="oNames" ${S.world.showNames ? 'checked' : ''}></label>
        ${fsSupported() ? `<label class="setting">${ic('expand')} Toàn màn hình (nên dùng khi xoay ngang) <input type="checkbox" id="oFull" ${fsActive() ? 'checked' : ''}></label>` : '<p class="muted" style="font-size:12px;margin:6px 0">Mẹo: trên iPhone, bấm Chia sẻ → “Thêm vào MH chính” để chơi toàn màn hình, xoay ngang thoải mái.</p>'}
        <label class="setting"><svg class="i"><use href="#i-child"/></svg> Hiện chú tiểu NPC (không tính vào số online) <input type="checkbox" id="oNpc" ${S.world.showNpc ? 'checked' : ''}></label>
        <button class="btn ghost wide" id="oSupport" style="margin-top:8px">${ic('heart')} Góp ý cho đội ngũ phát triển</button>
        <a class="btn ghost wide" href="/chinh-sach.html" target="_blank" rel="noopener" style="margin-top:8px">${ic('book')} Điều khoản & Chính sách</a>
        <p class="muted" style="margin-top:8px">Phím tắt máy tính: W A S D đi lại · B lạy · T tràng hạt · E ngồi/đứng</p>`;
      el.querySelector('#oHelp').onclick = () => { closeSheet(); openHelp(); };
      el.querySelector('#oShare').onclick = () => { closeSheet(); openShare(); };
      $('oSound').onchange = (e) => Sound.setEnabled(e.target.checked);
      $$('[data-vol]', el).forEach((r) => (r.oninput = () => {
        Sound.init(); Sound.setVolume(r.dataset.vol, r.value / 100); r.nextElementSibling.textContent = r.value;
        clearTimeout(r._t); r._t = setTimeout(() => (r.dataset.vol === 'voice' ? null : r.dataset.vol === 'rhythm' ? Sound.mok(Sound.now, 0.45) : Sound.chime()), 120);
      }));
      $('oChant').onchange = (e) => Sound.setChanting(e.target.checked);
      $('oChan').onchange = async (e) => { try { setProfile(await post('/chan/pref', { on: e.target.checked })); } catch (x) { e.target.checked = !e.target.checked; toast(x.message); } };
      $('oMusic').onchange = (e) => { Sound.init(); Sound.setMusicOn(e.target.checked); };
      $('oVoice').onchange = (e) => { Sound.voice = e.target.checked; local.set('voice2', Sound.voice); Sound.refreshLoop(); };
      $('oTempo').oninput = (e) => { Sound.tempo = +e.target.value; $('oTempoV').textContent = Sound.tempo; local.set('tempo', Sound.tempo); };
      $('oQ').onchange = (e) => S.world.setQuality(e.target.value);
      $('oNames').onchange = (e) => { S.world.setShowNames(e.target.checked); local.set('names', e.target.checked); };
      if ($('oFull')) $('oFull').onchange = async (e) => { await toggleFullscreen(); e.target.checked = fsActive(); };
      if ($('oInstall')) $('oInstall').onclick = () => { closeSheet(); installApp(); };
      $('oSupport').onclick = () => openSheet('support', 'feature');
      $('oNpc').onchange = (e) => { S.world.setShowNpc(e.target.checked); local.set('npc', e.target.checked); };
    });
  }
}

/* ---------- Nạp Ngọc bằng chuyển khoản: mã QR SePay, webhook báo về thì tự cộng Ngọc ---------- */
let payWatch = null;
const isMobile = () => matchMedia('(pointer: coarse)').matches || innerWidth < 600;
function payModal(order, pay) {
  const qr = `https://qr.sepay.vn/img?acc=${encodeURIComponent(pay.account)}&bank=${encodeURIComponent(SEPAY_BANK[pay.bank] || pay.bank)}&amount=${pay.amount}&des=${encodeURIComponent(pay.content)}&template=compact`;
  const mobile = isMobile();
  const rows = `<div class="dn-rows pay-rows">
      <div class="dn-row"><span>Số tiền</span><b class="pay-amt">${fmt(pay.amount)} đ</b><button class="btn small ghost" data-cp="${pay.amount}">Chép</button></div>
      <div class="dn-row"><span>Nội dung</span><b class="pay-ct">${esc(pay.content)}</b><button class="btn small gold" data-cp="${esc(pay.content)}">Chép</button></div>
      <div class="dn-row"><span>Số tài khoản</span><b>${esc(pay.account)}</b><button class="btn small ghost" data-cp="${esc(pay.account)}">Chép</button></div>
      <div class="dn-row"><span>Ngân hàng</span><b>${esc(BANK_NAME[pay.bank] || pay.bank)}</b></div>
      <div class="dn-row"><span>Chủ tài khoản</span><b>${esc(pay.name)}</b></div>
    </div>`;
  const qrBox = `<div class="dn-qr"><img src="${qr}" alt="Mã QR chuyển khoản ${fmt(pay.amount)} đ" width="260" height="300"><small>${mobile ? 'Lưu ảnh QR, mở app ngân hàng rồi chọn quét mã từ ảnh. Hoặc quét bằng điện thoại khác' : 'Mở app ngân hàng → quét mã QR · đã điền sẵn số tiền và nội dung'}</small>
      ${mobile ? `<a class="btn small ghost" href="${qr}" download="nap-ngoc-${order.id}.png" target="_blank" rel="noopener">${ic('upload')} Lưu ảnh QR</a>` : ''}</div>`;
  modal(`<div class="pay${mobile ? ' m' : ''}"><h3>${ic('ngoc')} Nạp ${order.ngoc} Ngọc · ${fmt(pay.amount)} đ</h3>
    ${qrBox + rows}
    <p class="dn-wait" id="payWait">${ic('check')} Đang chờ chuyển khoản… Giữ đúng <b>nội dung</b> và <b>số tiền</b>, Ngọc tự cộng sau vài giây – có thể quay lại đây sau khi chuyển.</p>
    <button class="btn ghost" id="mX">Đóng</button></div>`, (m) => {
    m.querySelector('#mX').onclick = () => { stopPayWatch(); closeModal(); };
    $$('[data-cp]', m).forEach((b) => (b.onclick = async () => { const ok = await copyText(b.dataset.cp); toast(ok ? `Đã chép: ${esc(b.dataset.cp)}` : b.dataset.cp); if (ok) { b.textContent = 'Đã chép'; setTimeout(() => (b.textContent = 'Chép'), 1500); } }));
  }, { replace: true });
  // dự phòng khi mất kết nối realtime: hỏi trạng thái đơn mỗi 5 giây trong 15 phút
  stopPayWatch();
  const until = Date.now() + 15 * 60e3;
  const check = async () => {
    if (!$('payWait') || Date.now() > until) return stopPayWatch();
    try { const r = await api(`/topup/${order.id}`); if (r.order.status === 'paid') topupDone(order.id, r.order.ngoc); } catch {}
  };
  payWatch = setInterval(check, 5000);
  // chuyển khoản xong quay lại từ app ngân hàng: kiểm tra ngay
  payVis = () => { if (!document.hidden) check(); };
  document.addEventListener('visibilitychange', payVis);
}
let payVis = null;
function stopPayWatch() { clearInterval(payWatch); payWatch = null; if (payVis) document.removeEventListener('visibilitychange', payVis); payVis = null; }
let lastTopup = 0;
async function topupDone(orderId, ngoc) {
  if (lastTopup === orderId) return; // WS và hỏi định kỳ cùng báo
  lastTopup = orderId; stopPayWatch();
  try { setProfile(await api('/me')); } catch {}
  if ($('payWait')) closeModal();
  Sound.success?.(); petalShower(30);
  toast(`${ic('ngoc')} Đã nạp thành công +${ngoc} Ngọc. Cảm ơn bạn!`, 6000);
}

/* ---------- Tin nhắn riêng & tặng quà giữa bạn đồng tu ---------- */
S.dm = { unread: 0 };
const GIFT_SEN = [10, 20, 50, 100, 200];
const giftText = (g) => g?.sen ? `${fmt(g.sen)} Sen` : g ? `${g.qty} ${g.name || S.items[g.item]?.name || g.item}` : '';
function dmBadge() { const n = S.dm.unread + (S.dm.sg || 0), b = $('cBadge'); b.textContent = n > 9 ? '9+' : n; b.classList.toggle('hidden', !n); }
async function refreshDm() { try { const d = await api('/dm'); S.dm.unread = d.unread; S.dm.sg = d.sangha?.unread || 0; dmBadge(); } catch {} }
let wsWasOpen = false;
let chat = null; // cuộc trò chuyện đang mở { id, user, msgs }
const mergeMsgs = (a, b) => [...new Map([...a, ...b].map((m) => [m.id, m])).values()].sort((x, y) => x.id - y.id);
const nearBottom = (el) => !el || el.scrollHeight - el.scrollTop - el.clientHeight < 80; // đang đọc tin cũ thì không kéo xuống
let readT = 0;
const markRead = (fn) => { clearTimeout(readT); readT = setTimeout(fn, 1500); }; // nhiều tin liên tiếp chỉ báo đã đọc một lần
// mất kết nối rồi nối lại: lấy bù tin đã lỡ
function chatResync() {
  refreshDm();
  if (chat && $('chatList')) { const id = chat.id; api(`/dm/${id}`).then((r) => { if (chat?.id !== id) return; const go = nearBottom($('chatList')); chat.msgs = mergeMsgs(chat.msgs, r.msgs); drawChat(go); }).catch(() => {}); }
  if (sgOpen()) api('/sangha/chat').then((r) => { if (!sgOpen()) return; const go = nearBottom($('sgList')); sgChat.msgs = mergeMsgs(sgChat.msgs, r.msgs); drawSg(go); }).catch(() => {});
}
function onDm(m) {
  const g = m.msg.kind === 'gift';
  if (g) { api('/me').then(setProfile).catch(() => {}); Sound.success?.(); }
  if (chat && chat.id === m.from.id && $('chatList') && !$('modal').classList.contains('hidden')) {
    const go = nearBottom($('chatList')), id = chat.id; chat.msgs = mergeMsgs(chat.msgs, [m.msg]); drawChat(go);
    markRead(() => api(`/dm/${id}`).then((r) => { S.dm.unread = r.unread; dmBadge(); }).catch(() => {}));
  } else {
    S.dm.unread++; dmBadge(); if (!g) Sound.chime?.();
    toast(g ? `${ic('gift')} <b>${esc(m.from.name)}</b> tặng bạn ${esc(giftText(m.msg.gift))}${m.msg.text ? `: “${esc(m.msg.text)}”` : ''}` : `${ic('chat')} <b>${esc(m.from.name)}</b>: ${esc(m.msg.text.slice(0, 80))}`, 6000);
  }
}
const dmTime = (t) => { const d = new Date(t), today = new Date().toDateString() === d.toDateString(); return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + (today ? '' : ` · ${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`); };
function drawChat(scroll) {
  const el = $('chatList'); if (!el) return;
  const me = S.profile.user.id;
  el.innerHTML = (chat.more ? '<button class="link chat-more" id="chatMore">Xem tin cũ hơn</button>' : '') + (chat.msgs.map((m) => m.kind === 'gift'
    ? `<div class="chat-gift${m.from === me ? ' me' : ''}">${ic('gift')} ${m.from === me ? 'Bạn đã tặng' : `${esc(chat.user.name)} tặng bạn`} <b>${esc(giftText(m.gift))}</b>${m.text ? `<p>“${esc(m.text)}”</p>` : ''}<small>${dmTime(m.at)}</small></div>`
    : `<div class="chat-msg${m.from === me ? ' me' : ''}"><span>${esc(m.text).replace(/\n/g, '<br>')}</span><small>${dmTime(m.at)}</small></div>`).join('')
    || `<div class="chat-empty">${ic('pray')}<p>Gửi lời chào đầu tiên tới <b>${esc(chat.user.name)}</b>.<br>Nam mô A Di Đà Phật!</p></div>`);
  if (scroll) el.scrollTop = el.scrollHeight;
  if ($('chatMore')) $('chatMore').onclick = async () => {
    const r = await api(`/dm/${chat.id}?before=${chat.msgs[0].id}`).catch(() => null); if (!r) return;
    chat.more = r.msgs.length >= 40; chat.msgs = [...r.msgs, ...chat.msgs]; const h = el.scrollHeight; drawChat(); el.scrollTop = el.scrollHeight - h;
  };
}
async function openChat(id, { gift = false } = {}) {
  let r; try { r = await api(`/dm/${id}`); } catch (e) { toast(e.message); return; }
  closeSheet?.();
  chat = { id, user: r.user, msgs: r.msgs, more: r.msgs.length >= 40 };
  S.dm.unread = r.unread; dmBadge();
  modal(`<div class="chat">
      <div class="chat-head">${avaHtml(r.user)}<div><b>${esc(r.user.name)}</b><small>Cấp ${r.user.level} · ${esc(r.user.title)}</small>${honorChip(r.user)}</div><button class="help-btn" id="chatX" aria-label="Đóng">${ic('close')}</button></div>
      <div class="chat-list" id="chatList"></div>
      ${r.friend ? `<div class="chat-gift-pick hidden" id="giftPick"></div>
      <div class="chat-input"><button class="btn ghost icon-btn" id="chatGift" title="Tặng quà" aria-label="Tặng quà">${ic('gift')}</button><textarea id="chatText" rows="1" maxlength="300" placeholder="Nhắn cho ${esc(r.user.name)}…"></textarea><button class="btn gold icon-btn" id="chatSend" aria-label="Gửi">${ic('send')}</button></div>`
      : '<p class="muted chat-off">Hai bạn không còn là bạn đồng tu nên không nhắn tiếp được.</p>'}
    </div>`, (el) => {
    el.querySelector('#chatX').onclick = () => { chat = null; closeModal(); };
    drawChat(true);
    if (!r.friend) return;
    const ta = el.querySelector('#chatText');
    let sending = false;
    const send = async () => {
      const text = ta.value.trim(); if (!text || sending) return;
      sending = true; ta.value = ''; ta.style.height = '';
      try { const { msg } = await post(`/dm/${id}`, { text }); if (chat?.id === id) { chat.msgs = mergeMsgs(chat.msgs, [msg]); drawChat(true); } } catch (e) { if (!ta.value) ta.value = text; toast(e.message); }
      sending = false;
    };
    el.querySelector('#chatSend').onclick = send;
    ta.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };
    ta.oninput = () => { ta.style.height = ''; ta.style.height = Math.min(96, ta.scrollHeight) + 'px'; };
    const pick = el.querySelector('#giftPick');
    const drawPick = () => {
      const items = S.meta.items.filter((i) => i.type === 'consumable' && qty(i.id) > 0);
      pick.innerHTML = `<div class="gp-h"><b>${ic('gift')} Tặng quà cho ${esc(r.user.name)}</b><small>Sen: ${fmt(S.profile.user.sen)}</small></div>
        <div class="gp-row">${GIFT_SEN.map((n) => `<button class="chip" data-gs="${n}" ${S.profile.user.sen < n ? 'disabled' : ''}>${ic('sen')} ${n}</button>`).join('')}</div>
        ${items.length ? `<div class="gp-row">${items.map((i) => `<button class="chip" data-gi="${i.id}">${ic(ITEM_ICON[i.id] || 'gift')} ${esc(i.name)} <small>×${qty(i.id)}</small></button>`).join('')}</div>` : '<p class="muted">Túi chưa có lễ vật để tặng (mua ở Cửa hàng).</p>'}
        <input id="gpText" maxlength="80" placeholder="Lời nhắn kèm quà (không bắt buộc)">
        <p class="muted">Tặng Sen từ cấp 3, tối đa 500 Sen/ngày · lễ vật tối đa 30/ngày.</p>`;
      const give = async (body, label) => {
        if (!confirm(`Tặng ${label} cho ${r.user.name}?`)) return;
        try {
          const res = await post(`/gift/${id}`, { ...body, text: pick.querySelector('#gpText').value });
          setProfile(res); chat.msgs.push(res.msg); drawChat(true); pick.classList.add('hidden');
          Sound.success?.(); petalShower(18); toast(`${ic('gift')} Đã tặng ${esc(label)} cho <b>${esc(r.user.name)}</b>`);
        } catch (e) { toast(e.message); }
      };
      $$('[data-gs]', pick).forEach((b) => (b.onclick = () => give({ sen: +b.dataset.gs }, `${b.dataset.gs} Sen`)));
      $$('[data-gi]', pick).forEach((b) => (b.onclick = () => give({ item: b.dataset.gi, qty: 1 }, `1 ${S.items[b.dataset.gi]?.name || b.dataset.gi}`)));
    };
    el.querySelector('#chatGift').onclick = () => { if (pick.classList.toggle('hidden')) return; drawPick(); };
    if (gift) { pick.classList.remove('hidden'); drawPick(); } else if (!matchMedia('(pointer: coarse)').matches) ta.focus();
  }, { replace: true });
}

/* ---------- Nhắn tin nhóm đạo tràng ---------- */
let sgChat = null;
const sgOpen = () => sgChat && $('sgList') && !$('modal').classList.contains('hidden');
function onSangha(m) {
  if (sgOpen() && sgChat.id === m.sangha.id) {
    const go = nearBottom($('sgList')); sgChat.msgs = mergeMsgs(sgChat.msgs, [m.msg]); drawSg(go);
    markRead(() => api('/sangha/chat').catch(() => {})); // đánh dấu đã đọc
    return;
  }
  S.dm.sg = (S.dm.sg || 0) + 1; dmBadge(); Sound.chime?.();
  toast(`${ic('temple')} <b>${esc(m.sangha.name)}</b> · ${esc(m.msg.name)}: ${esc(m.msg.text.slice(0, 60))}`, 4000);
}
function drawSg(scroll) {
  const el = $('sgList'); if (!el || !sgChat) return;
  const me = S.profile.user.id;
  el.innerHTML = (sgChat.more ? '<button class="link chat-more" id="sgMore">Xem tin cũ hơn</button>' : '') + (sgChat.msgs.map((m) => `<div class="chat-msg${m.from === me ? ' me' : ''}">
      ${m.from === me ? '' : `<small class="sg-name" data-pid="${m.from}">${esc(m.name)}</small>`}<span>${esc(m.text).replace(/\n/g, '<br>')}</span>
      <small>${dmTime(m.at)}${m.from === me || sgChat.owner ? ` · <button class="link sg-del" data-del="${m.id}">Xoá</button>` : ''}</small></div>`).join('')
    || `<div class="chat-empty">${ic('pray')}<p>Gửi lời chào đầu tiên tới đạo tràng <b>${esc(sgChat.name)}</b>.<br>Nam mô A Di Đà Phật!</p></div>`);
  if (scroll) el.scrollTop = el.scrollHeight;
  $$('[data-del]', el).forEach((b) => (b.onclick = async () => {
    if (!confirm('Xoá tin nhắn này?')) return;
    try { await api(`/sangha/chat/${b.dataset.del}`, { method: 'DELETE' }); sgChat.msgs = sgChat.msgs.filter((x) => x.id !== +b.dataset.del); drawSg(); } catch (e) { toast(e.message); }
  }));
  if ($('sgMore')) $('sgMore').onclick = async () => {
    const r = await api(`/sangha/chat?before=${sgChat.msgs[0].id}`).catch(() => null); if (!r) return;
    sgChat.more = r.msgs.length >= 40; sgChat.msgs = [...r.msgs, ...sgChat.msgs]; const h = el.scrollHeight; drawSg(); el.scrollTop = el.scrollHeight - h;
  };
}
async function openSgChat() {
  let r; try { r = await api('/sangha/chat'); } catch (e) { toast(e.message); return; }
  closeSheet?.();
  sgChat = { id: r.sangha.id, name: r.sangha.name, owner: r.sangha.owner, msgs: r.msgs, more: r.msgs.length >= 40 };
  S.dm.sg = 0; dmBadge();
  modal(`<div class="chat">
      <div class="chat-head"><span class="ava sg-ava">${ic('temple')}</span><div><b>${esc(r.sangha.name)}</b><small>Nhóm đạo tràng · ${r.sangha.count} thành viên</small></div><button class="help-btn" id="sgX" aria-label="Đóng">${ic('close')}</button></div>
      <div class="chat-list" id="sgList"></div>
      <div class="chat-input"><textarea id="sgText" rows="1" maxlength="300" placeholder="Nhắn cho cả đạo tràng…"></textarea><button class="btn gold icon-btn" id="sgSend" aria-label="Gửi">${ic('send')}</button></div>
    </div>`, (el) => {
    el.querySelector('#sgX').onclick = () => { sgChat = null; closeModal(); };
    drawSg(true);
    const ta = el.querySelector('#sgText');
    let sending = false;
    const send = async () => {
      const text = ta.value.trim(); if (!text || sending) return;
      sending = true; ta.value = ''; ta.style.height = '';
      try { const { msg } = await post('/sangha/chat', { text }); if (sgChat) { sgChat.msgs = mergeMsgs(sgChat.msgs, [msg]); drawSg(true); } } catch (e) { if (!ta.value) ta.value = text; toast(e.message); }
      sending = false;
    };
    el.querySelector('#sgSend').onclick = send;
    ta.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };
    ta.oninput = () => { ta.style.height = ''; ta.style.height = Math.min(96, ta.scrollHeight) + 'px'; };
  }, { replace: true });
}

/* ---------- Hòm thư hệ thống: thông báo riêng / chung, có thể kèm quà Sen, Ngọc ---------- */
S.mail = { mails: [], unread: 0 };
function mailBadge() {
  const n = S.mail.unread, b = $('mailBadge');
  b.textContent = n > 9 ? '9+' : n; b.classList.toggle('hidden', !n);
}
// Có thư mới máy chủ báo qua WS (force); chuyển chùa không cần tải lại nếu vừa tải trong 5 phút
async function refreshMail(force) {
  if (!S.profile) return;
  refreshWheel();
  if (!force && S.mailAt && Date.now() - S.mailAt < 300e3) return;
  S.mailAt = Date.now();
  try {
    S.mail = await api('/mail'); mailBadge(); if ($('mailList')) renderMail();
    // lần đầu mỗi phiên: nhắc quà trong thư được gửi lúc người này offline
    if (!S.mailGiftChecked) {
      S.mailGiftChecked = true;
      const g = S.mail.mails.filter((x) => (x.sen || x.ngoc) && !x.claimed_at);
      const sen = g.reduce((a, x) => a + x.sen, 0), ngoc = g.reduce((a, x) => a + x.ngoc, 0);
      if (g.length) mailGiftPopup([sen && `${ic('sen')} ${fmt(sen)} Sen`, ngoc && `${ic('ngoc')} ${fmt(ngoc)} Ngọc`].filter(Boolean));
    }
  } catch {}
}
setInterval(() => { if (!document.hidden) refreshMail(true); }, 10 * 60e3);
const mailWhen = (t) => { const d = (Date.now() - t) / 1000; return d < 60 ? 'vừa xong' : d < 3600 ? `${d / 60 | 0} phút trước` : d < 86400 ? `${d / 3600 | 0} giờ trước` : new Date(t).toLocaleDateString('vi-VN'); };
const mailGift = (m) => [m.sen && `${ic('sen')} ${fmt(m.sen)}`, m.ngoc && `${ic('ngoc')} ${fmt(m.ngoc)}`].filter(Boolean).join(' ');
function openMail() {
  modal(`<div class="mail-head"><h3>${ic('mail')} Hòm thư</h3><button class="btn small ghost" id="mAll">Đọc hết</button></div>
    <div id="mailList" class="mail-list"><p class="muted">Đang tải…</p></div>
    <button class="btn ghost" id="mX">Đóng</button>`, (el) => {
    el.querySelector('#mX').onclick = closeModal;
    el.querySelector('#mAll').onclick = async () => { try { await post('/mail/read-all'); S.mail.mails.forEach((m) => (m.read_at ||= Date.now())); S.mail.unread = 0; mailBadge(); renderMail(); } catch (e) { toast(e.message); } };
    renderMail(); refreshMail(true);
  }, { replace: true });
}
function renderMail(openId) {
  const el = $('mailList'); if (!el) return;
  const list = S.mail.mails;
  if (!list.length) { el.innerHTML = `<div class="mail-empty">${ic('mail')}<p>Chưa có thư nào.<br>Thông báo và quà từ Niệm Phật Online sẽ gửi về đây.</p></div>`; return; }
  el.innerHTML = list.map((m) => {
    const gift = mailGift(m), open = m.id === openId;
    return `<div class="mail-item${m.read_at ? '' : ' unread'}${open ? ' open' : ''}" data-mail="${m.id}">
      <div class="mail-row"><i class="mail-dot"></i><div class="mail-t"><b>${esc(m.title)}</b><small>${m.personal ? 'Thư riêng' : 'Thông báo chung'} · ${mailWhen(m.created_at)}</small></div>${gift ? `<span class="mail-gift${m.claimed_at ? ' done' : ''}">${ic('gift')}</span>` : ''}</div>
      ${open ? `<div class="mail-body">${esc(m.body || '').replace(/\n/g, '<br>') || '<span class="muted">(Không có nội dung)</span>'}
        ${gift ? `<div class="mail-reward"><span>Quà kèm: ${gift}</span>${m.claimed_at ? '<span class="tag">Đã nhận</span>' : `<button class="btn small gold" data-claim="${m.id}">Nhận quà</button>`}</div>` : ''}
        <div class="mail-act">${m.link ? `<button class="btn small gold" data-go="${esc(m.link)}">Xem ngay</button>` : ''}<button class="link" data-del="${m.id}">Xoá thư</button></div></div>` : ''}
    </div>`;
  }).join('');
  $$('[data-mail] .mail-row', el).forEach((r) => (r.onclick = async () => {
    const id = +r.parentElement.dataset.mail, m = list.find((x) => x.id === id);
    renderMail(openId === id ? null : id);
    if (!m.read_at) { m.read_at = Date.now(); try { S.mail.unread = (await post(`/mail/${id}/read`)).unread; mailBadge(); } catch {} }
  }));
  $$('[data-claim]', el).forEach((b) => (b.onclick = async (e) => {
    e.stopPropagation(); b.disabled = true;
    try {
      const id = +b.dataset.claim, r = await post(`/mail/${id}/claim`);
      setProfile(r); S.mail.unread = r.unread; mailBadge();
      const m = list.find((x) => x.id === id); m.claimed_at = m.read_at = Date.now();
      Sound.success?.(); toast(`${ic('gift')} Đã nhận ${mailGift(r.gift)}`); renderMail(id);
    } catch (err) { b.disabled = false; toast(err.message); }
  }));
  $$('[data-go]', el).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); closeModal(); openSheet('community', b.dataset.go); }));
  $$('[data-del]', el).forEach((b) => (b.onclick = async (e) => {
    e.stopPropagation();
    try { const id = +b.dataset.del; S.mail.unread = (await api(`/mail/${id}`, { method: 'DELETE' })).unread; S.mail.mails = list.filter((x) => x.id !== id); mailBadge(); renderMail(); } catch (err) { toast(err.message); }
  }));
}

/* ---------- Ủng hộ đội ngũ phát triển: mã VietQR chuyển khoản ---------- */
const BANK_NAME = { MB: 'MB Bank (Quân Đội)' }, SEPAY_BANK = { MB: 'MBBank' };
function renderDonate(el) {
  const d = S.meta.donate;
  if (!d) { el.innerHTML = '<p class="muted">Chưa mở nhận ủng hộ.</p>'; return; }
  const info = `UNG HO NIEM PHAT ${d.tag || ''}${S.profile.user.id}`;
  // mã QR SePay: chuyển khoản xong SePay báo về máy chủ, app tự cảm ơn trong vài giây
  const qr = (amt) => `https://qr.sepay.vn/img?acc=${encodeURIComponent(d.account)}&bank=${encodeURIComponent(SEPAY_BANK[d.bank] || d.bank)}&amount=${amt || ''}&des=${encodeURIComponent(info)}&template=compact`;
  const AMTS = [20000, 50000, 100000, 200000, 500000];
  el.innerHTML = `<div class="comm">
    <div class="comm-hero donate-hero"><div class="hero-glow"></div><div class="hero-ic">${ic('heart')}</div>
      <div class="hero-body"><b>Ủng hộ đội ngũ phát triển</b><p>Niệm Phật Online miễn phí cho mọi người. Sự tuỳ hỷ của bạn giúp duy trì máy chủ và dựng thêm nhiều ngôi chùa mới.</p></div></div>
    ${fundBar()}
    <div class="fund-ask"><div class="fb-kinds dn-amts">${AMTS.map((a) => `<button class="chip" data-a="${a}">${fmt(a / 1000)}k</button>`).join('')}<button class="chip on" data-a="">Tuỳ tâm</button></div>
    <div class="dn-qr"><img id="dnQr" src="${qr('')}" alt="Mã VietQR chuyển khoản ${esc(d.account)}" width="260" height="300"><small id="dnAmt">Quét bằng app ngân hàng bất kỳ · tự nhập số tiền</small></div>
    <div class="dn-rows">
      <div class="dn-row"><span>Ngân hàng</span><b>${esc(BANK_NAME[d.bank] || d.bank)}</b></div>
      <div class="dn-row"><span>Số tài khoản</span><b>${esc(d.account)}</b><button class="btn small ghost" data-cp="${esc(d.account)}">Sao chép</button></div>
      <div class="dn-row"><span>Chủ tài khoản</span><b>${esc(d.name)}</b></div>
      <div class="dn-row"><span>Nội dung</span><b>${esc(info)}</b><button class="btn small ghost" data-cp="${esc(info)}">Sao chép</button></div>
    </div>
    <a class="btn ghost wide" id="dnSave" href="${qr('')}" download="ung-ho-niem-phat.png" target="_blank" rel="noopener">${ic('upload')} Mở / lưu ảnh mã QR</a>
    <p class="dn-wait">${ic('check')} Giữ nguyên nội dung chuyển khoản – hệ thống tự xác nhận và gửi lời cảm ơn sau vài giây.</p></div>
    <div id="dnWall"></div>
    <p class="muted dn-note">Mọi đóng góp là tự nguyện và không kèm vật phẩm trong game. Nam mô A Di Đà Phật 🙏</p></div>`;
  paintFund();
  api('/donations').then((rows) => {
    if (rows.length && $('dnWall')) $('dnWall').innerHTML = `<div class="dn-wall"><b>${ic('heart')} Tuỳ hỷ gần đây</b><div>${rows.map((r) => `<span class="tag">${esc(r.name)}</span>`).join('')}</div></div>`;
  }).catch(() => {});
  $$('[data-a]', el).forEach((b) => (b.onclick = () => {
    $$('[data-a]', el).forEach((x) => x.classList.toggle('on', x === b));
    const a = +b.dataset.a || 0;
    $('dnQr').src = $('dnSave').href = qr(a);
    $('dnAmt').textContent = a ? `Số tiền: ${fmt(a)} đ · quét bằng app ngân hàng bất kỳ` : 'Quét bằng app ngân hàng bất kỳ · tự nhập số tiền';
  }));
  $$('[data-cp]', el).forEach((b) => (b.onclick = async () => { toast((await copyText(b.dataset.cp)) ? 'Đã sao chép' : b.dataset.cp); }));
}

/* ---------- phím tắt ---------- */
addEventListener('keydown', (e) => {
  if (S.view === 'chant') { if (e.code === 'Space' && !e.repeat) { e.preventDefault(); hitMo(false); } else if (e.code === 'Escape') leaveChant(); return; }
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
  if (S.view === 'beads') {
    if (['Space', 'ArrowDown', 'Enter'].includes(e.code)) { e.preventDefault(); beads.advance(); }
    if (e.code === 'Escape' || e.code === 'KeyT') $('btnBeadsBack').click();
    return;
  }
  if (S.view !== 'hall' || !$('sheet').classList.contains('hidden') || !$('modal').classList.contains('hidden')) return;
  if (e.code === 'KeyB') $('btnBow').click();
  if (e.code === 'KeyT') $('btnBeads').click();
  if (e.code === 'KeyE') $('btnCtx').click();
});


/* =====================================================================
   ỨNG DỤNG (PWA): cài lên màn hình chính, chạy toàn màn hình
   ===================================================================== */
const isStandalone = () => matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || navigator.standalone === true;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
let installEvt = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; maybeOfferInstall(); });
addEventListener('appinstalled', () => { installEvt = null; local.set('installed', 1); toast(`${ic('check')} Đã cài Niệm Phật Online lên màn hình chính`); });
const canInstall = () => !isStandalone() && (installEvt || isIOS);
async function installApp() {
  if (installEvt) {
    installEvt.prompt();
    const { outcome } = await installEvt.userChoice.catch(() => ({}));
    installEvt = null;
    if (outcome === 'accepted') Sound.success?.();
    return;
  }
  modal(`<div class="big">${ic('upload')}</div><h3>Cài ứng dụng trên iPhone/iPad</h3>
    <p style="text-align:left">1. Mở trang này bằng <b>Safari</b>.<br>2. Bấm nút <b>Chia sẻ</b> ${ic('share')} ở thanh dưới.<br>3. Chọn <b>“Thêm vào MH chính”</b> (Add to Home Screen).<br>4. Mở biểu tượng <b>Niệm Phật</b> để chơi toàn màn hình, xoay ngang thoải mái.</p>
    <button class="btn gold" id="mOk">Đã hiểu</button>`, (el) => (el.querySelector('#mOk').onclick = closeModal));
}
// Gợi ý cài sau khi người chơi đã ở chùa một lúc (mỗi 3 ngày tối đa một lần)
function maybeOfferInstall() {
  if (!canInstall() || S.view !== 'hall' || local.get('installed')) return;
  const last = local.get('installAsk', 0);
  if (Date.now() - last < 3 * 864e5) return;
  local.set('installAsk', Date.now());
  setTimeout(() => {
    if (!$('modal').classList.contains('hidden') || !$('coach').classList.contains('hidden')) return;
    modal(`<div class="big"><img src="/img/icon-192.png" alt="" style="width:72px;height:72px;border-radius:18px"></div><h3>Cài Niệm Phật Online</h3>
      <p>Thêm chùa vào màn hình chính để mở nhanh như ứng dụng, chơi toàn màn hình, không cần gõ địa chỉ.</p>
      <button class="btn gold" id="mIns">${ic('upload')} Cài ứng dụng</button><button class="btn ghost" id="mOk">Để sau</button>`, (el) => {
      el.querySelector('#mOk').onclick = closeModal;
      el.querySelector('#mIns').onclick = () => { closeModal(); installApp(); };
    });
  }, 60000);
}

/* ---------- Toàn màn hình trên web ---------- */
const fsSupported = () => !!(document.fullscreenEnabled || document.webkitFullscreenEnabled) && !isStandalone();
const fsActive = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
async function toggleFullscreen() {
  try {
    if (fsActive()) await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else {
      const de = document.documentElement;
      await (de.requestFullscreen ? de.requestFullscreen({ navigationUI: 'hide' }) : de.webkitRequestFullscreen());
      // trên điện thoại cho phép xoay tự do khi toàn màn hình
      screen.orientation?.unlock?.();
    }
  } catch { toast('Trình duyệt không cho phép toàn màn hình'); }
}
function renderFsBtn() {
  const b = $('btnFull'); if (!b) return;
  b.classList.toggle('hidden', !fsSupported());
  b.innerHTML = ic(fsActive() ? 'compress' : 'expand');
  b.title = fsActive() ? 'Thoát toàn màn hình' : 'Toàn màn hình';
}
$('btnFull').onclick = toggleFullscreen;
document.addEventListener('fullscreenchange', renderFsBtn);
document.addEventListener('webkitfullscreenchange', renderFsBtn);

renderFsBtn();
if (['127.0.0.1', 'localhost'].includes(location.hostname)) { window.__S = S; window.__enter = enterTemple; } // chỉ để kiểm thử cục bộ
boot();

/* Tự cập nhật: khi máy chủ có bản mới thì tải lại trang (ngay nếu đang ẩn, hoặc hiện thanh thông báo mời tải lại).
   Mã build đến từ /api/build (kiểm tra định kỳ) và từ WebSocket mỗi lần vào chùa/kết nối lại (ngay sau khi máy chủ khởi động lại). */
// Mỗi máy chờ ngẫu nhiên trong 20 phút mới mời tải lại: rải đều số người cùng tải lại khi đang đông
const UPDATE_SPREAD = 20 * 60e3;
let updateTimer = null;
function checkBuild(build) {
  const mine = document.querySelector('meta[name=build]')?.content;
  if (!mine || !build) return;
  if (build === mine) { clearTimeout(updateTimer); updateTimer = null; return; } // bản mới đã bị rút lại
  if (updateTimer || document.querySelector('.update-bar')) return;
  updateTimer = setTimeout(showUpdate, Math.random() * UPDATE_SPREAD);
}
function showUpdate() {
  if (document.hidden) return location.reload();
  const bar = document.createElement('div');
  bar.className = 'update-bar';
  bar.innerHTML = `<span>${ic('spark')} Chùa vừa được nâng cấp (rộng hơn, mượt hơn). Vui lòng tải lại để dùng bản mới.</span><button class="btn small gold">Tải lại</button>`;
  bar.querySelector('button').onclick = () => location.reload();
  document.body.appendChild(bar);
}
{
  const mine = document.querySelector('meta[name=build]')?.content;
  const check = async () => {
    if (!mine) return;
    try { checkBuild((await api('/build')).build); } catch {}
  };
  setInterval(check, 90000);
}
// tab ẩn / tắt màn hình: báo máy chủ tạm ngừng gửi vị trí người khác (tiết kiệm băng thông, pin)
document.addEventListener('visibilitychange', () => sendWs({ t: 'vis', h: document.hidden }));

/* ---------- Lộc chùa: hoa sen vàng quanh khuôn viên, đi tới gần để nhận vật phẩm / lời chúc ---------- */
function loadLoc(templeId) {
  api(`/loc?temple=${encodeURIComponent(templeId)}`).then((r) => {
    if (S.temple?.id !== templeId) return;
    S.world?.setLoc(r.spawns || []);
    if (r.spawns?.length) setTimeout(() => toast(`${ic('lotus')} Quanh khuôn viên chùa có hoa sen vàng phát sáng. Ra sân, đi tới gần để nhận lộc hoặc lời chúc!`, 6000), 4000);
  }).catch(() => {});
}
let locBusy = false;
async function claimLocTap(id) {
  if (locBusy || !S.temple) return;
  locBusy = true;
  try {
    const r = await post('/loc/claim', { temple: S.temple.id, id });
    S.world?.removeLoc(id);
    handleResult(r);
    Sound.chime?.();
    modal(`<div class="big">${ic('lotus')}</div><h3>Bạn vừa nhận được lộc chùa</h3>
      <p class="loc-blessing">“${esc(r.blessing)}”</p>
      <p>Quà: <b>${esc(r.label === 'lời chúc' ? '10 Sen kèm lời chúc' : r.label)}</b></p>
      <p class="muted" style="font-size:13px">Hôm nay bạn còn nhận được ${r.left} lộc nữa. Hoa sen vàng sẽ hiện ở chỗ khác sau ít phút.</p>
      <button class="btn gold" id="mOk">Nam mô A Di Đà Phật</button>`, (el) => { el.querySelector('#mOk').onclick = () => closeModal(); });
  } catch (e) {
    if (/đã có người/.test(e.message)) S.world?.removeLoc(id);
    // vị trí chưa kịp báo lên máy chủ: 4 giây sau tự thử lại, không cần nhắc
    if (!/đi lại gần/.test(e.message)) toast(e.message);
  } finally { locBusy = false; }
}

const LEGEND_ART = { gong: '🐎', son: '⛰️', thuy: '🌊', lac: '🐉', auco: '🪷', chu: '🛶', thach: '🍚', antiem: '🍉', rua: '🐢', tre: '🎋', man: '🛕' };
/* ---------- Thông báo tính năng mới: mỗi máy một lần, người mới đang xem hướng dẫn thì để lần vào sau ---------- */
function showNews() {
  if (local.get('news') === 'linhthu-ngoc' || !local.get('coached') || S.view !== 'hall') return;
  local.set('news', 'linhthu-ngoc');
  modal(`<div class="news-card"><span class="news-tag">Mới trên Niệm Phật Online</span><h3>Có gì mới trên chùa?</h3>
    <div class="news-item"><span class="ico">🦌</span><b>Linh thú đồng hành</b><p>Ra sân chùa kết duyên miễn phí mỗi ngày, hoặc mua bằng Ngọc trong Cửa hàng.</p><button class="btn gold" id="newsPet">Xem Sổ linh thú</button></div>
    <div class="news-item"><span class="ico">${ic('wheel')}</span><b>Vòng quay lộc</b><p>Mỗi ngày 1 lượt quay miễn phí, có cơ hội nhận đồ quý.</p><button class="btn gold" id="newsWheel">Quay ngay</button></div>
    <div class="news-support"><b>${ic('spark')} Chung tay cùng đội ngũ phát triển</b><p>Mua linh thú bằng Ngọc là cách đạo hữu ủng hộ đội ngũ duy trì và phát triển Niệm Phật Online. Hoàn toàn tự nguyện, không mua linh thú vẫn tu tập và kết duyên bình thường.</p><button class="btn gold" id="newsBuy">Xem linh thú trong Cửa hàng</button></div>
    <button class="news-later" id="newsLater">Để sau</button></div>`, () => {
    $('newsPet').onclick = () => { closeModal(); openSheet('bag', 'pet'); };
    $('newsWheel').onclick = () => { closeModal(); openWheel(); };
    $('newsBuy').onclick = () => { closeModal(); openSheet('shop', 'pet'); };
    $('newsLater').onclick = closeModal;
  });
}

async function renderHonorBook(el) {
  el.innerHTML = '<div class="empty">Đang mở sổ…</div>';
  let b;
  try { b = await api('/legend/book'); } catch (e) { el.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
  if (S.sheetTab !== 'honor') return;
  const us = S.profile.user, mine = b.legends.filter((l) => l.mine), now = b.legends.find((l) => l.title === us.honor);
  el.innerHTML = `<div class="hb-now ${now ? 'on' : ''}">${now ? `<span class="hb-emblem">${LEGEND_ART[now.id]}</span><div><small>Danh hiệu đang mang</small>${honorChip(us)}<p>${esc(now.line)}</p></div>`
      : `<div><small>Sổ danh hiệu truyền thuyết</small><b>Đạo hữu chưa có danh hiệu</b><p>Từ cấp 10, chăm tu tập trong chùa sẽ có dịp được Duyên truyền thuyết chọn trao tặng ngẫu nhiên. Danh hiệu hiện trên đầu nhân vật để mọi người cùng thấy.</p></div>`}</div>
    <div class="hb-count">Đã nhận ${mine.length}/${b.legends.length} danh hiệu · mỗi danh hiệu chỉ có ${b.cap} suất</div>
    <div class="hb-grid">${b.legends.map((l) => `<article class="hb-card ${l.mine ? 'mine' : ''}">
      <div class="hb-art hb-${l.id}"><i>${LEGEND_ART[l.id]}</i><span>${l.count}/${b.cap}</span></div>
      <div class="hb-body"><small>${esc(l.story)}</small><b>${esc(l.title)}</b><p>${esc(l.line)}</p>
        <em>${l.mine ? `Bạn là người thứ ${l.mine}` : l.holders.length ? `Đã trao: ${l.holders.map(esc).join(', ')}${l.count > l.holders.length ? '…' : ''}` : 'Chưa có ai nhận'}</em></div></article>`).join('')}</div>`;
}

async function renderPetBook(el) {
  el.innerHTML = '<div class="empty">Đang mở sổ…</div>';
  let b;
  try { b = await api('/pets'); } catch (e) { el.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
  const n = b.species.filter((s) => s.owned).length;
  el.innerHTML = `<div class="pet-head"><b>Sổ linh thú ${n}/${b.species.length}</b><span>Hôm nay còn ${b.left}/${b.daily} lượt kết duyên</span><small>Ra ngoài sân chùa, đi tới gần linh thú để kết duyên. Linh thú không vào trong chùa.${b.pity ? ` Tích duyên: ${b.pity.wins}/${b.pity.need} lần thành công (từ cấp ${b.rareLevel}) sẽ gặp Sư Tử Xanh.` : ''}</small></div>`
    + b.species.map((s) => {
      const it = S.items[s.item]; if (!it) return '';
      const equipped = S.profile.user.equipped.pet === it.id;
      return `<div class="card pet-card${s.owned ? '' : ' locked'}">${itemIcon(it)}<div class="body"><b>${s.owned ? esc(it.name) : '? ? ?'}</b> <span class="tag rank bond-${s.rank}">${PET_RANK[s.rank]}</span>
        <p>${s.owned ? esc(it.description) : 'Chưa kết duyên.'}</p><small class="muted">Xuất hiện ${s.appear}% · Thành công ${s.chance}%${['hiem', 'toi_thuong'].includes(s.rank) ? ` · Cần cấp ${b.rareLevel}` : ''}</small></div>
        <div class="side">${!s.owned ? '' : equipped ? '<button class="btn small ghost" data-unequip="pet">Tháo</button>' : `<button class="btn small gold" data-equip="${it.id}">Đi cùng</button>`}</div></div>`;
    }).join('');
  paintThumbs(el, S.items, S.profile.user.appearance);
  $$('[data-unequip]', el).forEach((x) => (x.onclick = async () => { try { setProfile(await post('/equip', { unequip: 'pet' })); toast('Đã tháo'); renderPetBook(el); } catch (e) { toast(e.message); } }));
  $$('[data-equip]', el).forEach((x) => (x.onclick = async () => { try { setProfile(await post('/equip', { item: x.dataset.equip })); Sound.chime(); toast('Linh thú sẽ đi cùng bạn ngoài sân chùa'); renderPetBook(el); } catch (e) { toast(e.message); } }));
}
/* ---------- Thu gọn menu để chơi toàn màn hình; nhớ lựa chọn cho lần sau ---------- */
function setUiMin(on) {
  document.body.classList.toggle('ui-min', on);
  $('btnUi').title = on ? 'Mở menu' : 'Thu gọn menu';
  $('btnUi').setAttribute('aria-label', $('btnUi').title);
  local.set('uiMin', on);
}
$('btnZoomIn').onclick = () => S.world?.zoomBy(0.85);
$('btnZoomOut').onclick = () => S.world?.zoomBy(1 / 0.85);
$('btnUi').onclick = () => setUiMin(!document.body.classList.contains('ui-min'));
setUiMin(local.get('uiMin', false));

/* ---------- Kết duyên linh thú: đứng gần đủ 8 giây; hết lượt hoặc thất bại máy chủ sẽ báo ---------- */
function loadBeasts(templeId) {
  api(`/pets/spawns?temple=${encodeURIComponent(templeId)}`).then((r) => { if (S.temple?.id === templeId) S.world?.setBeasts(r.spawns || []); }).catch(() => {});
}
const bond = { id: null, timer: 0 };
const PET_RANK = { thuong: 'Thường', quy: 'Quý', hiem: 'Hiếm', toi_thuong: 'Tối thượng' };
function showBond(b) {
  const el = $('bondBox');
  if (!b) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden', 'busy');
  $('bondName').textContent = S.items[b.item]?.name || 'Linh thú';
  $('bondRank').textContent = PET_RANK[b.rank] || '';
  $('bondRank').className = `tag rank bond-${b.rank}`;
  $('bondBtn').textContent = 'Kết duyên';
  $('bondFill').style.width = '0';
  $('bondBtn').onclick = () => startBond(b);
}
function cancelBond(msg) {
  if (!bond.id) return;
  clearInterval(bond.timer);
  bond.id = null; if (S.world) { S.world.bondId = null; S.world.nearBeastId = undefined; }
  $('bondBox').classList.add('hidden');
  if (msg) toast(msg);
}
async function startBond(b) {
  if (bond.id) return;
  bond.id = b.id; S.world.bondId = b.id;
  $('bondBox').classList.add('busy');
  $('bondBtn').textContent = 'Đang kết duyên…';
  try {
    const r = await post('/pets/bond/start', { temple: S.temple.id, id: b.id });
    if (bond.id !== b.id) return;
    const t0 = performance.now(), temple = S.temple.id;
    bond.timer = setInterval(() => {
      const p = (performance.now() - t0) / r.ms;
      if (S.temple?.id !== temple || !S.world) return cancelBond();
      if (S.world.beastDist(b.id) > 4.5) return cancelBond('Bạn đã đi xa, duyên chưa thành');
      $('bondFill').style.width = `${Math.min(100, p * 100)}%`;
      if (p >= 1) { clearInterval(bond.timer); finishBond(b); }
    }, 100);
  } catch (e) {
    if (e.message && /thử với/.test(e.message)) { const en = S.world?.beasts?.get(b.id); if (en) en.tried = true; }
    cancelBond(e.message);
  }
}
async function finishBond(b) {
  try {
    const r = await post('/pets/bond/finish', { temple: S.temple.id, id: b.id });
    const en = S.world?.beasts?.get(b.id);
    if (en && !r.ok) en.tried = true;
    handleResult(r);
    cancelBond();
    if (r.gone) S.world?.removeBeast(b.id);
    if (!r.ok) return toast(`Duyên chưa đủ, linh thú khẽ lánh đi. Hôm nay còn ${r.left} lượt.`, 4500);
    const it = S.items[r.item];
    if (!r.dup) return celebrateBond(r, it);
    giftPopup('Phóng sinh linh thú', [`Bạn đã có <b>${esc(it.name)}</b>, nên thả về tự nhiên và nhận <b>${r.sen} Sen</b> công đức.`, `Hôm nay còn ${r.left} lượt.`], null, '<button class="btn gold" id="mOk">A Di Đà Phật</button>', (el) => {
      el.querySelector('#mOk').onclick = closeModal;
      paintThumbs(el, S.items, S.profile.user.appearance);
    }, `<div class="gift-pic">${itemIcon(it)}</div>`);
  } catch (e) { cancelBond(e.message); }
}

/* ---------- Tụng kinh, gõ mõ ---------- */
const chant = { kinh: KINH[0], i: 0, timer: null, autoId: 0, say: null, finishing: false, finishTimer: null, tap: 0, auto: 0, sending: false };
const lineUrl = (k, i) => `/audio/kinh/${k.id}/${String(k.id === 'niem' ? 0 : i).padStart(2, '0')}.mp3`;
const chantVoiceOn = () => $('chantVoice').checked && Sound.enabled;
function renderChant() {
  const k = chant.kinh;
  $('chantPick').innerHTML = KINH.map((x) => `<button class="${x === k ? 'on' : ''}" data-k="${x.id}">${esc(x.name)}</button>`).join('');
  $$('#chantPick button').forEach((b) => (b.onclick = () => { flushChantFinish(); Sound.stopLine(); chant.kinh = KINH.find((x) => x.id === b.dataset.k); chant.i = 0; chant.say = null; renderChant(); }));
  $('chantNote').textContent = k.note;
  // Niệm Phật lặp một câu: chỉ hiện câu đang niệm
  $('chantLines').innerHTML = k.id === 'niem' ? `<p class="on big">${esc(k.lines[0])}</p>` : k.lines.map((l, i) => `<p data-i="${i}">${esc(l)}</p>`).join('');
  $('chantOf').textContent = ` / ${k.lines.length}`;
  markChant();
  if (chantVoiceOn()) Sound.loadLine(lineUrl(k, 0));
}
function markChant() {
  $('chantNum').textContent = chant.i;
  if (chant.kinh.id === 'niem') return;
  const at = chant.say ?? chant.i; // đang đọc thì sáng câu đang đọc, không thì câu sắp gõ
  $$('#chantLines p').forEach((p, i) => { p.classList.toggle('on', i === at); p.classList.toggle('done', i < at); });
  const box = $('chantLines'), cur = box.children[at];
  if (cur) box.scrollTo({ top: cur.offsetTop - box.clientHeight / 2 + cur.clientHeight / 2, behavior: 'smooth' });
}
function hitMo(auto = false) {
  if (chant.finishing) return; // đang đọc nốt câu cuối
  Sound.mok(Sound.now, 0.6);
  const b = $('btnMo'); b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit');
  S.world.strikeMo();
  if (auto) chant.auto++; else chant.tap++;
  const k = chant.kinh, at = chant.i++, last = chant.i >= k.lines.length;
  const lineText = k.lines[k.id === 'niem' ? 0 : at] || '';
  const said = chantVoiceOn() ? Sound.sayLine(lineUrl(k, at), lineText) : null;
  chant.say = said ? at : null;
  if (said) for (const n of [at + 1, at + 2]) if (n < k.lines.length) Sound.loadLine(lineUrl(k, n));
  if (!last) markChant();
  else if (!said) finishChant();
  else {
    // đọc xong câu cuối rồi mới thỉnh chuông
    chant.finishing = true; markChant();
    said.then((ms) => { if (chant.finishing) chant.finishTimer = setTimeout(flushChantFinish, ms + 200); });
  }
  return said;
}
function flushChantFinish() {
  if (!chant.finishing) return;
  chant.finishing = false; clearTimeout(chant.finishTimer);
  finishChant();
}
async function sendMo() {
  if (chant.sending || !S.temple || !(chant.tap || chant.auto)) return;
  chant.sending = true;
  const tap = Math.min(60, chant.tap), auto = Math.min(60, chant.auto);
  chant.tap -= tap; chant.auto -= auto;
  try {
    if (auto) await post('/practice', { type: 'mo', count: auto, auto: true, temple: S.temple.id });
    if (tap) {
      const r = await post('/practice', { type: 'mo', count: tap, lite: true, temple: S.temple.id });
      handleResult(r, { silent: true });
      $('chantGain').textContent = r.extra?.capped ? 'Hôm nay đã đủ công đức gõ mõ' : `+${r.gained} công đức`;
    }
  } catch (e) { if (e.status !== 429) toast(e.message); } finally { chant.sending = false; }
}
setInterval(sendMo, 10000); // gom tiếng mõ cho nhẹ máy chủ; rời buổi tụng hoặc tụng xong thì gửi nốt ngay
async function finishChant() {
  const k = chant.kinh;
  chant.i = 0; chant.say = null; markChant();
  Sound.bigBell();
  petalShower(24);
  try {
    // gửi nốt tiếng mõ còn lại rồi mới báo tụng xong
    while (chant.sending) await new Promise((r) => setTimeout(r, 100));
    await sendMo();
    while (chant.sending) await new Promise((r) => setTimeout(r, 100));
    const r = await post('/practice', { type: 'chant_done', sutra: k.id, temple: S.temple.id });
    handleResult(r, { silent: true });
    toast(`${ic('lotus')} Đã tụng trọn ${esc(k.name)}${r.gained ? `: +${r.gained} công đức` : ''}. Nam mô A Di Đà Phật.`, 4500);
  } catch (e) { toast(e.status === 429 ? `Đã tụng trọn ${esc(k.name)}. Nam mô A Di Đà Phật.` : e.message); }
}
function setChantAuto() {
  clearTimeout(chant.timer); chant.timer = null;
  const id = ++chant.autoId;
  if (!$('chantAuto').checked) return;
  const beat = () => 60000 / +$('chantTempo').value;
  // nhịp là nhịp tối đa: câu dài thì đợi đọc xong mới gõ tiếng sau
  const step = async () => {
    const ms = (await hitMo(true)) || 0;
    // hết bài thì để tiếng chuông ngân xong rồi mới tụng lại từ đầu
    if (id === chant.autoId) chant.timer = setTimeout(step, Math.max(beat(), ms ? ms + 250 : 0) + (chant.finishing ? 4000 : 0));
  };
  chant.timer = setTimeout(step, beat());
}
// Tụng ngay trên bồ đoàn: cảnh chùa vẫn chạy, chỉ có bảng kinh và mõ ở dưới màn hình
$('btnChant').onclick = () => {
  stopBowing(true);
  if (!S.world.seated && !S.world.sit()) {
    // chưa ngồi: tự đi tới bồ đoàn trống gần nhất, ngồi xuống rồi mới vào tụng
    if (!S.world.walkToSeat()) { toast('Hãy vào chánh điện, ngồi lên bồ đoàn để tụng kinh'); return; }
    chant.waitSeat = Date.now() + 20000;
    toast(`${ic('cushion')} Đang đến bồ đoàn…`);
    return;
  }
  chant.waitSeat = 0;
  Sound.init();
  S.view = 'chant';
  Sound.setActive(false); // tắt mõ nền để chỉ nghe tiếng mõ mình gõ
  S.world.player.meditating = true;
  S.world.showMo(true);
  show('hud', false); show('lanternLayer', false); show('chantView');
  $('chantGain').textContent = '';
  renderChant();
  liftForChant();
};
// điện thoại ngang: bảng kinh nằm bên phải, đẩy nhân vật sang trái; còn lại bảng nằm dưới, đẩy nhân vật lên
function liftForChant() {
  const box = $('chantView');
  if (matchMedia('(max-height: 480px)').matches) S.world.liftView(0, box.offsetWidth / 2);
  else S.world.liftView(Math.max(box.offsetHeight * 0.55, box.offsetHeight - innerHeight * 0.18));
}
addEventListener('resize', () => { if (S.view === 'chant') liftForChant(); });
function leaveChant() {
  $('chantAuto').checked = false; setChantAuto();
  Sound.stopLine();
  flushChantFinish();
  chant.say = null;
  sendMo();
  S.world.showMo(false);
  S.world.liftView(0);
  if (S.world.player) S.world.player.meditating = false;
  show('chantView', false); show('lanternLayer'); resumeHall();
}
// đứng dậy khỏi bồ đoàn (đi chỗ khác, đổi chùa) thì kết thúc buổi tụng
setInterval(() => {
  if (S.view === 'chant' && !S.world?.seated) leaveChant();
  if (chant.waitSeat && S.view === 'hall') { if (S.world.seated) $('btnChant').click(); else if (Date.now() > chant.waitSeat || !S.world.walkTarget) chant.waitSeat = 0; }
}, 500);
$('quyListen').onclick = () => {
  if (quyL.on) return stopQuyListen();
  Sound.init();
  quyL.on = true; quyL.i = 0; $('quyListen').classList.add('on'); $('quyListen').textContent = 'Dừng nghe';
  quySpeak(); quyBeat();
  quyL.beat = setInterval(() => { if (S.world?.moving) { stopQuyListen(); toast('Phải đứng yên mới nghe được kinh'); } else quyBeat(); }, 20000);
};
$('btnMo').onclick = () => hitMo(false);
$('chantAuto').onchange = setChantAuto;
$('chantTempo').oninput = setChantAuto;
$('chantVoice').checked = local.get('chantVoice', true);
$('chantVoice').onchange = (e) => { local.set('chantVoice', e.target.checked); if (!e.target.checked) { Sound.stopLine(); chant.say = null; markChant(); } };
$('btnChantBack').onclick = leaveChant;

/* ---------- Thanh Công Cụ Biến Tấu: Không khí 3D, Phòng Bạn Bè & Chụp Thiệp Bình An ---------- */
const AMBIENCES = [
  { id: 'day', label: '☀️ Ban ngày', bg: null, fog: null, exp: 1.15 },
  { id: 'sunset', label: '🌇 Hoàng hôn', bg: '#4a2518', fog: '#5c2d1c', exp: 1.02 },
  { id: 'night', label: '🏮 Đêm hoa đăng', bg: '#0c1022', fog: '#11162e', exp: 0.85 },
  { id: 'dawn', label: '🌅 Bình minh', bg: '#382a3e', fog: '#4c3850', exp: 1.08 },
];
let ambIdx = 0;
function applyAmbience() {
  const a = AMBIENCES[ambIdx % AMBIENCES.length];
  const btn = $('btnAmbience');
  if (btn) btn.textContent = a.label;
  if (S.world?.scene) {
    const bgCol = a.bg || S.temple?.theme?.fog || '#241509';
    const fogCol = a.fog || S.temple?.theme?.fog || '#241509';
    S.world.scene.background = new THREE.Color(bgCol);
    if (S.world.scene.fog) S.world.scene.fog.color.set(fogCol);
    if (S.world.renderer) S.world.renderer.toneMappingExposure = a.exp;
  }
}
if ($('btnAmbience')) {
  $('btnAmbience').onclick = () => {
    ambIdx = (ambIdx + 1) % AMBIENCES.length;
    applyAmbience();
    Sound.chime?.();
    toast(`Đã chuyển không khí: <b>${AMBIENCES[ambIdx].label}</b>`);
  };
}
if ($('btnQuickCard')) {
  $('btnQuickCard').onclick = () => {
    if (S.profile) openShare(window.__GAME_THEME__ === 'church' ? 'Nguyện xin bình an và hồng ân đến với bạn ✝️' : 'Gửi tặng bạn tấm thiệp bình an từ cửa chùa 🪷');
  };
}
if ($('btnRoomShare')) {
  const curRoom = new URLSearchParams(location.search).get('room') || 'chung';
  $('btnRoomShare').textContent = `👥 Phòng: ${curRoom}`;
  $('btnRoomShare').onclick = () => {
    const rNow = new URLSearchParams(location.search).get('room') || 'chung';
    const shareLink = `${location.origin}${location.pathname}?room=${encodeURIComponent(rNow)}`;
    modal(`<div class="big">${ic('users')}</div><h3>Phòng Hành Hương Cùng Bạn Bè</h3>
      <p>Bạn đang ở phòng <b>#${esc(rNow)}</b> tại <b>${esc(S.temple?.name || '')}</b>.<br>Gửi link phòng này cho bạn bè để mọi người xuất hiện cùng nhau trong chánh điện!</p>
      <div class="pcard-own" style="margin:8px 0"><input id="mRoomInput" maxlength="20" value="${esc(rNow)}" placeholder="Nhập mã phòng (vd: nhomban1)"><button class="btn small gold" id="mRoomGo">Đổi phòng</button></div>
      <div class="invite-link"><span>${esc(shareLink.replace(/^https?:\/\//, ''))}</span><button class="btn small gold" id="mRoomCopy">Sao chép link</button></div>
      <button class="btn ghost" id="mRoomClose">Đóng</button>`, (el) => {
      el.querySelector('#mRoomClose').onclick = closeModal;
      el.querySelector('#mRoomCopy').onclick = async () => {
        const code = el.querySelector('#mRoomInput').value.trim() || 'chung';
        const url = `${location.origin}${location.pathname}?room=${encodeURIComponent(code)}`;
        await copyText(url);
        toast('Đã sao chép link phòng! Hãy gửi cho bạn bè nhé.');
      };
      el.querySelector('#mRoomGo').onclick = () => {
        const code = el.querySelector('#mRoomInput').value.trim() || 'chung';
        const u = new URL(location.href);
        u.searchParams.set('room', code);
        location.href = u.toString();
      };
    });
  };
}

/* ============================================================================
   HỆ THỐNG XÕA STRESS TRONG CHÙA (SANSA TEMPLE UI/UX × 12 TƯỚNG 3D NARUTO/ONE PIECE)
   - Sàn DJ Ánh Trăng (Chú Đại Bi Vinahouse / Tâm Kinh Lo-Fi / Trống Giải Phóng Gear 5)
   - Võ Đài Đấm Bốc Xả Nghiệp (Đấm 5 Bao Cát: Deadline, Sếp Khó Tính, Overthinking…)
   - Đại Mõ Neon Phản Lực (Gõ liên thanh tích Combo & giảm Stress về 0% Giác Ngộ)
   ============================================================================ */
const stressState = {
  pct: 75,
  combo: 0,
  comboTimer: null,
  djIndex: 0,
  enlightenedCount: 0,
};

const DJ_TRACKS = [
  { id: 'zen', label: 'Đài Ánh Trăng: Nhạc Thiền Chánh Điện · Chạm để bật DJ Remix', short: '🪷 Nhạc Thiền Chánh Điện' },
  { id: 'vinahouse', label: '🎧 Đang phát: Chú Đại Bi Vinahouse Remix (136 BPM) · Quẩy Xõa Stress!', short: '🎧 Chú Đại Bi Vinahouse' },
  { id: 'lofi', label: '🌙 Đang phát: Tâm Kinh Lo-Fi Chillhop (92 BPM) · Chữa Lành Tâm Hồn', short: '🌙 Tâm Kinh Lo-Fi Chillhop' },
  { id: 'nika', label: '🥁 Đang phát: Trống Giải Phóng Nika Gear 5 (126 BPM) · Chiến Thần Tự Do', short: '🥁 Trống Giải Phóng Gear 5' },
];

function updateStressUi(delta = 0, reason = '') {
  stressState.pct = Math.max(0, Math.min(100, stressState.pct + delta));
  if (delta < 0) {
    stressState.combo++;
    clearTimeout(stressState.comboTimer);
    stressState.comboTimer = setTimeout(() => {
      stressState.combo = 0;
      const cb = $('comboBadge');
      if (cb) cb.classList.add('hidden');
    }, 3500);
  }
  const fill = $('stressFill');
  const status = $('stressStatus');
  const cb = $('comboBadge');
  if (fill) {
    fill.style.width = `${stressState.pct}%`;
    fill.style.background = stressState.pct > 55
      ? 'linear-gradient(90deg, #ef4444, #f97316)'
      : stressState.pct > 20
        ? 'linear-gradient(90deg, #f59e0b, #eab308)'
        : 'linear-gradient(90deg, #10b981, #06b6d4)';
  }
  if (status) {
    if (stressState.pct === 0) {
      status.innerHTML = '✨ Trạng thái: <b style="color:#4ade80">0% ÁP LỰC · TÂM BẤT BIẾN GIÁC NGỘ!</b>';
    } else if (stressState.pct <= 30) {
      status.innerHTML = `🌿 Tâm đang nhẹ dần: <b id="stressPct">${stressState.pct}%</b>`;
    } else {
      status.innerHTML = `🔥 Áp lực trần gian: <b id="stressPct">${stressState.pct}%</b>`;
    }
  }
  if (cb) {
    if (stressState.combo >= 2) {
      cb.classList.remove('hidden');
      cb.textContent = `⚡ COMBO x${stressState.combo}`;
      cb.animate([{ transform: 'scale(1.28)' }, { transform: 'scale(1)' }], { duration: 180 });
    } else {
      cb.classList.add('hidden');
    }
  }
  if (reason) floater(reason);

  // Khi xả hết 100% áp lực về 0% -> Thưởng Giác Ngộ Hoan Hỷ!
  if (stressState.pct === 0 && delta < 0) {
    stressState.enlightenedCount++;
    Sound.success?.();
    petalShower(42, ['🪷', '✨', '🔥', '🎧', '🥊', '🌸']);
    S.world?.glow(S.profile?.user?.id);
    post('/practice', { type: 'mo', count: 10, lite: true, temple: S.temple?.id || 'nhattru' }).then((r) => handleResult(r, { silent: true })).catch(() => {});
    toast('✨ <b>TÂM BẤT BIẾN GIỮA DÒNG ĐỜI VẠN BIẾN!</b> Bạn đã xả sạch 100% Stress · Nhận +50 Công Đức & Hoa Sen Vàng!', 5000);
    setTimeout(() => {
      stressState.pct = 65;
      updateStressUi(0);
    }, 6000);
  }
}

function setActiveZonePill(zoneKey) {
  $$('#customBar [data-zone]').forEach((b) => b.classList.toggle('on', b.dataset.zone === zoneKey));
}

function cycleDjTrack(forceTrackId) {
  if (forceTrackId) {
    const idx = DJ_TRACKS.findIndex((t) => t.id === forceTrackId);
    stressState.djIndex = idx >= 0 ? idx : 1;
  } else {
    stressState.djIndex = (stressState.djIndex + 1) % DJ_TRACKS.length;
  }
  const tr = DJ_TRACKS[stressState.djIndex];
  Sound.setDjTrack(tr.id);
  const lbl = $('djTrackLabel');
  if (lbl) lbl.textContent = tr.label;
  const radioBtn = $('btnDjTrack');
  if (radioBtn) radioBtn.classList.toggle('playing', tr.id !== 'zen');
  return tr;
}

function activateDjStage() {
  if (!S.world) return;
  stopBowing(true);
  setActiveZonePill('dj');
  const isDancing = S.world.player?.dancing;
  if (!isDancing) {
    S.world.toggleDjDance(true);
    if (Sound.djTrack === 'zen') cycleDjTrack('vinahouse');
    $('btnDjDance')?.classList.add('on');
    if ($('djDanceLabel')) $('djDanceLabel').textContent = 'Đang Quẩy';
    updateStressUi(-10, '🎧 Quẩy Chú Đại Bi Remix! -10% Stress · +5 Công Đức');
    toast('🎧 <b>Sàn DJ Ánh Trăng đã bật!</b> Nhân vật 3D đang quẩy theo nhịp Chú Đại Bi Vinahouse. Bấm đài nhạc phía trên để đổi bài!');
  } else {
    const tr = cycleDjTrack();
    if (tr.id === 'zen') {
      S.world.toggleDjDance(false);
      $('btnDjDance')?.classList.remove('on');
      if ($('djDanceLabel')) $('djDanceLabel').textContent = 'Quẩy DJ';
      toast('🪷 Đã tắt Sàn DJ, trở về không gian Chánh điện thanh tịnh.');
    } else {
      updateStressUi(-8, `${tr.short} · -8% Stress`);
      toast(`🎵 Đổi đĩa DJ: <b>${tr.short}</b>`);
    }
  }
}

function onStressBagPunched(bagDef) {
  const crit = stressState.combo > 0 && stressState.combo % 4 === 0;
  Sound.punchSfx(crit);
  setActiveZonePill('boxing');
  const heroId = S.profile?.user?.appearance?.hero || 'luffy_g5';
  const hero = HERO_MAP[heroId] || HERO_LIST[0];
  const drop = crit ? -15 : -8;
  const targetName = bagDef?.name || 'NGHIỆP CHƯỚNG';
  updateStressUi(drop, `${crit ? '💥 BẠO KÍCH' : '🥊 ĐẤM BAY'} [${targetName}] · ${drop}% Stress!`);
  if (stressState.combo % 3 === 0 && S.temple) {
    post('/practice', { type: 'mo', count: 3, lite: true, temple: S.temple.id }).then((r) => handleResult(r, { silent: true })).catch(() => {});
  }
}

function onHyperMuyuStruck() {
  Sound.hyperMuyuSfx(stressState.combo + 1);
  setActiveZonePill('muyu');
  updateStressUi(-6, `🥁 ĐẠI MÕ PHẢN LỰC x${stressState.combo + 1} · -6% Stress · +1 Công Đức`);
  if (stressState.combo % 4 === 0 && S.temple) {
    post('/practice', { type: 'mo', count: 2, lite: true, temple: S.temple.id }).then((r) => handleResult(r, { silent: true })).catch(() => {});
  }
}

// Gắn sự kiện cho các nút Khu vực (Sansa Zone Travel)
$$('#customBar [data-zone]').forEach((btn) => {
  btn.onclick = () => {
    const z = btn.dataset.zone;
    if (!S.world) return;
    stopBowing(true);
    setActiveZonePill(z);
    S.world.teleportToZone(z);
    if (z === 'dj') {
      if (Sound.djTrack === 'zen') cycleDjTrack('vinahouse');
      $('btnDjDance')?.classList.add('on');
      if ($('djDanceLabel')) $('djDanceLabel').textContent = 'Đang Quẩy';
      updateStressUi(-10, '🎧 Lên Sàn DJ Ngoài Sân Chùa! -10% Áp lực');
      toast('🎧 Đã ra <b>Sàn DJ Ánh Trăng ngoài sân chùa</b>! Chạm để đổi bài Chú Đại Bi Remix / Tâm Kinh Lo-Fi.');
    } else if (z === 'boxing') {
      $('btnDjDance')?.classList.remove('on');
      if ($('djDanceLabel')) $('djDanceLabel').textContent = 'Quẩy DJ';
      S.world.punchStressBag(0);
      toast('🥊 Đã ra <b>Võ Đài Đấm Bốc ngoài sân chùa</b>! Chạm trực tiếp vào 5 Bao Cát hoặc bấm nút Đấm Xả Giận!');
    } else if (z === 'muyu') {
      $('btnDjDance')?.classList.remove('on');
      if ($('djDanceLabel')) $('djDanceLabel').textContent = 'Quẩy DJ';
      S.world.hitHyperMuyu();
      toast('🥁 Đã ra <b>Đại Mõ Phản Lực ngoài sân chùa</b>! Bấm liên tục để tích Combo xả stress!');
    } else {
      Sound.setDjTrack('zen');
      const lbl = $('djTrackLabel');
      if (lbl) lbl.textContent = DJ_TRACKS[0].label;
      $('btnDjTrack')?.classList.remove('playing');
      $('btnDjDance')?.classList.remove('on');
      if ($('djDanceLabel')) $('djDanceLabel').textContent = 'Quẩy DJ';
      Sound.chime?.();
      toast('🏯 Đã vào <b>Chánh Điện Thanh Tịnh</b>.');
    }
  };
});

if ($('btnDjTrack')) {
  $('btnDjTrack').onclick = () => {
    const tr = cycleDjTrack();
    if (tr.id !== 'zen') {
      S.world?.toggleDjDance(true);
      $('btnDjDance')?.classList.add('on');
      if ($('djDanceLabel')) $('djDanceLabel').textContent = 'Đang Quẩy';
      updateStressUi(-5, `🎵 Bật ${tr.short}`);
    } else {
      S.world?.toggleDjDance(false);
      $('btnDjDance')?.classList.remove('on');
      if ($('djDanceLabel')) $('djDanceLabel').textContent = 'Quẩy DJ';
    }
    toast(`🎵 ${tr.short}`);
  };
}

if ($('btnDjDance')) {
  $('btnDjDance').onclick = () => {
    if (!S.world) return;
    S.world.teleportToZone('dj');
    activateDjStage();
  };
}

if ($('btnPunch')) {
  $('btnPunch').onclick = () => {
    if (!S.world) return;
    stopBowing(true);
    S.world.punchStressBag();
  };
}

if ($('btnHyperMuyu')) {
  $('btnHyperMuyu').onclick = () => {
    if (!S.world) return;
    stopBowing(true);
    S.world.hitHyperMuyu();
  };
}

// Đổi nhanh giữa 12 Nhân Vật 3D & 8 Bộ Trang Phục Sansa Hàn Quốc (?room=maru) ngay trong chùa
function openHeroSwitcherModal() {
  const curHero = S.profile?.user?.appearance?.hero || 'luffy_g5';
  const curOutfit = S.profile?.user?.appearance?.outfit || 'default';
  modal(`
    <div class="hero-modal">
      <h3>👘 Tướng 3D &amp; Trang Phục Sansa Hàn Quốc</h3>
      <p class="muted">Kết hợp tự do 12 Nhân Vật 3D với Pháp Phục Sansa Hàn Quốc (tay áo rộng dance-sleeves), Cà Sa, Hanbok, Võ Phục Đấm Bốc &amp; Đồ Rave DJ.</p>
      <div class="field" style="margin-top:8px"><b>1. Chọn Nhân Vật 3D (12 Tướng)</b></div>
      <div class="hero-grid modal-hero-grid" id="mHeroGrid"></div>
      <div class="field" style="margin-top:12px"><b>2. Chọn Đồ Trang Phục 3D (Sansa Maru &amp; Lễ Hội)</b></div>
      <div class="outfit-grid" id="mOutfitGrid"></div>
      <div class="row" style="margin-top:14px">
        <button class="btn ghost" id="mHeroEdit">Đổi tên / Chi tiết</button>
        <button class="btn gold" id="mHeroClose">Hoàn tất</button>
      </div>
    </div>
  `, (el) => {
    renderHeroGrid(el.querySelector('#mHeroGrid'), curHero, async (h) => {
      try {
        const newAp = { ...(S.profile?.user?.appearance || {}), hero: h.id, skin: h.skin };
        const res = await api('/me', { method: 'PUT', body: { appearance: newAp } });
        setProfile(res);
        if (S.world?.player) triggerUltimate(S.world.player);
        Sound.success?.();
        toast(`🦸 Đã hoá thân thành <b>${esc(h.name)}</b> (${esc(h.title)})!`);
      } catch (err) {
        toast(err.message);
      }
    });
    renderOutfitGrid(el.querySelector('#mOutfitGrid'), curOutfit, async (o) => {
      try {
        const newAp = { ...(S.profile?.user?.appearance || {}), outfit: o.id };
        const res = await api('/me', { method: 'PUT', body: { appearance: newAp } });
        setProfile(res);
        if (S.world?.player) {
          if (o.wideSleeves || o.djGear) S.world.toggleDjDance(true);
          else triggerUltimate(S.world.player);
        }
        Sound.success?.();
        toast(`👘 Đã khoác bộ trang phục <b>${esc(o.name)}</b> (${esc(o.badge)})!`);
      } catch (err) {
        toast(err.message);
      }
    });
    el.querySelector('#mHeroClose').onclick = closeModal;
    el.querySelector('#mHeroEdit').onclick = () => { closeModal(); openSetup('edit'); };
  }, { replace: true });
}

if ($('btnHeroSwitch')) {
  $('btnHeroSwitch').onclick = openHeroSwitcherModal;
}




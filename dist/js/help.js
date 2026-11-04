// Hướng dẫn người chơi: màn chờ, hướng dẫn từng bước (coach marks) và trang "Cách chơi".
import { ic } from './icons.js';

const $ = (id) => document.getElementById(id);
const touch = matchMedia('(pointer: coarse)').matches;

/* ---------- Màn chờ ---------- */
export const QUOTES = [
  '“Tâm an thì cảnh an.”',
  '“Một niệm thanh tịnh là một niệm Phật.”',
  '“Gieo nhân lành, gặt quả lành.”',
  '“Hạnh phúc không có đường đi, hạnh phúc chính là con đường.”',
  '“Mỗi bước chân là một bước an lạc.”',
  '“Không làm các điều ác, siêng làm các việc lành, giữ tâm ý trong sạch – đó là lời chư Phật dạy.” (Kinh Pháp Cú)',
  '“Lời nói dịu dàng như hoa sen nở.”',
  '“Hơn ngàn lời vô nghĩa, một lời có ích hơn, nghe xong được an tịnh.” (Kinh Pháp Cú)',
];
const STEPS = ['Thắp đèn chánh điện', 'Dựng điện thờ', 'An vị tượng Phật', 'Trải bồ đoàn', 'Mời đại chúng vào lễ', 'Thỉnh chuông'];
let ldTimer = null;
let ldBusyT;
export function showLoader(title) {
  const el = $('loader');
  $('ldTitle').textContent = title;
  $('ldQuote').textContent = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  $('ldQuote').style.animation = 'none'; void $('ldQuote').offsetWidth; $('ldQuote').style.animation = '';
  el.classList.remove('hidden', 'out');
  let i = 0; setLoader(4, STEPS[0]);
  clearInterval(ldTimer);
  // chờ quá 3 giây mới xin lỗi, vào nhanh thì không cần đọc
  clearTimeout(ldBusyT); $('ldBusy').classList.add('hidden');
  ldBusyT = setTimeout(() => $('ldBusy').classList.remove('hidden'), 3000);
  // nhích dần cho có cảm giác tiến triển trong lúc chờ
  ldTimer = setInterval(() => { i++; if (i < STEPS.length - 1) setLoader(Math.min(85, 10 + i * 15), STEPS[i]); }, 450);
}
export function setLoader(pct, step) {
  $('ldBar').style.width = pct + '%';
  if (step) $('ldStep').textContent = step;
}
export function hideLoader() {
  clearInterval(ldTimer); clearTimeout(ldBusyT);
  setLoader(100, STEPS[STEPS.length - 1]);
  const el = $('loader');
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.classList.add('hidden'), 650); }, 350);
}
export const nextFrames = (n = 2) => Promise.race([new Promise((r) => { const f = () => (--n <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), new Promise((r) => setTimeout(r, 80))]);

export const skeleton = (n = 4) => `<div class="skel sm"></div>${'<div class="skel"></div>'.repeat(n)}`;

// Nút đang xử lý: hiện vòng quay, chống bấm đúp
export async function busy(btn, fn) {
  if (!btn || btn.classList.contains('loading')) return;
  btn.classList.add('loading');
  try { return await fn(); } finally { btn.classList.remove('loading'); }
}

/* ---------- Hướng dẫn từng bước khi vào chùa lần đầu ---------- */
const COACH = [
  { title: 'A Di Đà Phật!', text: 'Chào mừng bạn lên chùa. Mất chừng 30 giây để làm quen nhé.' },
  { sel: null, area: 'joy', title: 'Đi lại', text: touch ? 'Chạm và kéo ở nửa trái màn hình để đi. Vuốt nửa phải để xoay nhìn, chụm hai ngón để phóng to/thu nhỏ.' : 'Dùng phím W A S D hoặc mũi tên để đi, kéo chuột để xoay, cuộn chuột để phóng to.' },
  { sel: null, area: 'center', title: 'Ngồi bồ đoàn', text: 'Chạm vào một tấm bồ đoàn (đệm ngồi) để đi tới và ngồi. Ngồi tĩnh cũng được cộng công đức mỗi phút.' },
  { sel: '#btnBow', title: 'Lạy Phật', text: 'Bấm để bắt đầu lạy liên tục, bấm lần nữa để dừng. Lạy cùng lúc với người khác được thêm 5% “Đồng tâm” mỗi người.' },
  { sel: '#btnBeads', title: 'Lần tràng hạt', text: 'Mở chuỗi 108 hạt: chạm hoặc vuốt xuống để lần từng hạt, vừa lần vừa niệm “Nam mô A Di Đà Phật”. Tròn chuỗi được thưởng thêm.' },
  { sel: '#btnMeditate', title: 'Thiền định', text: 'Chọn 5–30 phút, theo vòng tròn hít thở. Hoàn thành trọn thời gian được công đức theo phút.' },
  { sel: '#btnOffer', title: 'Dâng lễ', text: 'Thắp hương (+20% công đức trong 10 phút), thắp nến, dâng hoa, thỉnh chuông, hoặc thả đèn hoa đăng kèm lời nguyện.' },
  { sel: '#btnOut', title: 'Ra sân ngắm cảnh', text: 'Bấm nút này để tự đi ra sân chùa, dạo quanh ngắm cảnh. Ngoài sân có những người kể chuyện (vòng sáng xanh) – chạm vào để nghe sự tích, truyền thuyết về chùa.' },
  { sel: '.side-menu', title: 'Menu', text: 'Nhiệm vụ nhận quà, Túi đồ, Cửa hàng, Cộng đồng, Xếp hạng, Bản đồ chùa, tư liệu Thiền phái và Cài đặt.' },
  { sel: '#meChip', title: 'Hồ sơ của bạn', text: 'Xem cấp độ, thành tích, đổi ảnh đại diện và lấy mã khôi phục tài khoản.' },
  { sel: '#btnHelp', title: 'Cần xem lại?', text: 'Bấm nút “?” bất cứ lúc nào để mở Cách chơi. Chúc bạn tu tập an lạc!' },
];
export function startCoach({ onDone } = {}) {
  const el = $('coach'), hole = $('coachHole'), tip = $('coachTip');
  let i = 0;
  const place = () => {
    const s = COACH[i];
    $('coachTitle').textContent = s.title; $('coachText').textContent = s.text;
    $('coachDots').innerHTML = COACH.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('');
    $('coachNext').textContent = i === COACH.length - 1 ? 'Bắt đầu' : 'Tiếp';
    const W = innerWidth, H = innerHeight;
    let r = null;
    if (s.sel) { const t = document.querySelector(s.sel); if (t && t.offsetParent !== null) r = t.getBoundingClientRect(); }
    else if (s.area === 'joy') r = { left: 12, top: H * 0.45, width: W * 0.42, height: H * 0.5 };
    else if (s.area === 'center') r = { left: W * 0.2, top: H * 0.45, width: W * 0.5, height: H * 0.25 };
    if (r) {
      const pad = 6;
      Object.assign(hole.style, { display: 'block', left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
      const below = r.top + r.height / 2 < H / 2;
      tip.style.top = ''; tip.style.bottom = '';
      if (below) tip.style.top = Math.min(H - 190, r.top + r.height + 18) + 'px';
      else tip.style.top = Math.max(10, r.top - tip.offsetHeight - 18) + 'px';
    } else {
      Object.assign(hole.style, { display: 'block', left: W / 2 + 'px', top: H / 2 + 'px', width: '0px', height: '0px' });
      tip.style.top = H / 2 - tip.offsetHeight / 2 + 'px';
    }
  };
  const end = () => { el.classList.add('hidden'); removeEventListener('resize', place); onDone?.(); };
  $('coachNext').onclick = () => { if (++i >= COACH.length) end(); else place(); };
  $('coachSkip').onclick = end;
  el.classList.remove('hidden');
  addEventListener('resize', place);
  requestAnimationFrame(place);
  requestAnimationFrame(() => requestAnimationFrame(place)); // đặt lại khi tip đã có chiều cao
}

/* ---------- Trang "Cách chơi" ---------- */
export function howtoHtml(tab, { sects, exp }) {
  const e = exp || {};
  if (tab === 'start') return `<div class="prose howto">
    <p class="lead">Niệm Phật Online là ngôi chùa 3D để bạn lễ Phật, niệm Phật, lần tràng hạt và thiền định mỗi ngày – một mình hay cùng mọi người.</p>
    <h4>${ic('pray')} Năm bước đầu tiên</h4>
    <p><span class="step-n">1</span>Đi tới một tấm <b>bồ đoàn</b> và chạm để ngồi.</p>
    <p><span class="step-n">2</span>Bấm <b>Lạy Phật</b> vài lạy, hoặc mở <b>Tràng hạt</b> lần một chuỗi.</p>
    <p><span class="step-n">3</span>Vào <b>Dâng lễ</b> thắp một nén hương (được tặng sẵn khi nhập môn).</p>
    <p><span class="step-n">4</span>Mở <b>Nhiệm vụ</b> để nhận quà các việc đã làm.</p>
    <p><span class="step-n">5</span>Quay lại mỗi ngày để giữ <b>chuỗi ngày lên chùa</b> và nhận quà điểm danh.</p>
    <h4>${ic('map')} Điều khiển</h4>
    <table class="tbl">
      <tr><td>Đi lại</td><td>${touch ? 'Kéo ở nửa trái màn hình (cần điều khiển ảo)' : 'W A S D / phím mũi tên'}</td></tr>
      <tr><td>Xoay nhìn</td><td>${touch ? 'Vuốt nửa phải màn hình' : 'Kéo chuột'}</td></tr>
      <tr><td>Phóng to</td><td>${touch ? 'Chụm/mở hai ngón' : 'Cuộn chuột'}</td></tr>
      <tr><td>Ngồi / đứng</td><td>Chạm vào bồ đoàn, hoặc nút “Ngồi xuống” khi đứng gần</td></tr>
      ${touch ? '' : '<tr><td>Phím tắt</td><td>B: lạy · T: tràng hạt · E: ngồi/đứng · trong tràng hạt: Space/↓ lần hạt, Esc quay lại</td></tr>'}
      <tr><td>Ra sân chùa</td><td>Bấm “Ra sân ngắm cảnh” (dưới tên chùa) hoặc tự đi ra cửa chính để dạo hiên, sân, bậc thềm và ngắm cảnh quanh chùa. Bấm “Vào chánh điện” để quay lại.</td></tr>
      <tr><td>Nghe kể chuyện</td><td>Ngoài sân có người kể chuyện đứng trong vòng sáng xanh. Chạm vào họ (hoặc bấm nút “Nghe … kể chuyện”) để nghe về đồ vật, sự tích, truyền thuyết của chùa.</td></tr>
      <tr><td>Xoay ngang</td><td>Chơi được cả dọc và ngang. Bật “Toàn màn hình” trong Cài đặt cho rộng hơn.</td></tr>
    </table>
    <button class="btn gold" id="hCoach">${ic('spark')} Xem lại hướng dẫn từng bước</button>
  </div>`;
  if (tab === 'practice') return `<div class="prose howto">
    <h4>${ic('bow')} Lạy Phật</h4><p>Bấm một lần để lạy liên tục theo nhịp, bấm lại để dừng sau lạy đang dở. Mỗi lạy <b>+${e.bow} công đức</b>. Nhiều người cùng lạy một lúc: mỗi người thêm +5% “Đồng tâm” (tối đa +50%). Mốc 108, 500, 1.000 lạy có chúc mừng riêng.</p>
    <h4>${ic('beads')} Tràng hạt 108</h4><p>Chạm hoặc vuốt xuống để lần hạt, mỗi hạt <b>+${e.bead}</b>, tròn một chuỗi 108 hạt thêm <b>+${e.round}</b>. Có thể vừa lần vừa niệm theo tiếng mõ.</p>
    <h4>${ic('meditate')} Thiền định</h4><p>Chọn thời gian, ngồi thẳng, theo vòng tròn hít vào – thở ra. Mỗi phút <b>+${e.meditate}</b>. Xả thiền sớm vẫn được tính số phút đã ngồi.</p>
    <h4>${ic('drum')} Tụng kinh</h4><p>Bấm <b>Tụng kinh</b> để ngồi lên bồ đoàn, chọn bài rồi gõ mõ theo từng câu. Tụng trọn một bài được thưởng công đức, mỗi bài tính thưởng một lần mỗi ngày.</p>
    <h4>${ic('cushion')} Ngồi tĩnh</h4><p>Chỉ cần ngồi trên bồ đoàn trong chánh điện, mỗi phút <b>+${e.sit}</b> (giới hạn mỗi ngày).</p>
    <h4>${ic('offer')} Dâng lễ</h4>
    <table class="tbl">
      <tr><td>${ic('incense')} Hương trầm</td><td>+${e.incense} và tăng 20% mọi công đức trong 10 phút</td></tr>
      <tr><td>${ic('candle')} Nến</td><td>+${e.candle}, ánh nến sáng hơn</td></tr>
      <tr><td>${ic('flower')} Hoa</td><td>+${e.flower}, hoa xuất hiện trên bàn thờ</td></tr>
      <tr><td>${ic('bell')} Thỉnh chuông</td><td>+${e.bell}, mỗi chùa một lần/ngày, mọi người trong chùa cùng nghe</td></tr>
      <tr><td>${ic('lantern')} Đèn hoa đăng</td><td>Gửi lời nguyện bay lên trời, mọi người cùng thấy và tùy hỷ</td></tr>
    </table>
    <h4>${ic('spark')} Công quả</h4><p>Ra sân chùa, bấm <b>Công quả</b> rồi chọn việc và đứng yên tại chỗ trong lúc làm. Mỗi ngày, mỗi chùa được <b>quét sân</b> 3 lượt và <b>trồng cây</b> 1 lần. Cây trồng ở lại sân cho mọi người cùng ngắm.</p>
    <h4>${ic('lotus')} Vườn Phật</h4><p>Mua cây ở Cửa hàng → Cây Phật, ra sân đứng ở chỗ muốn trồng, bấm <b>Công quả → Vườn Phật → Trồng</b>. Cứ 7 ngày cây cho một đợt quả, quả chín không bị mất nếu bạn hái muộn. Phải đến đúng chùa đang trồng cây mới hái được.</p>
    <table class="tbl">
      <tr><td>Chậu sen (50 Ngọc)</td><td>5 quả mỗi đợt, tối đa 5 đợt, tổng 25 quả</td></tr>
      <tr><td>Cây bồ đề (100 Ngọc)</td><td>10 quả mỗi đợt, tối đa 5 đợt, tổng 50 quả</td></tr>
      <tr><td>Cây sala (150 Ngọc)</td><td>15 quả mỗi đợt, tối đa 5 đợt, tổng 75 quả</td></tr>
    </table>
    <p>1 quả quý đổi được 1 Ngọc ngay trong Vườn Phật. Mỗi người trồng tối đa 5 cây ở một chùa, mỗi chùa có tối đa 50 cây. Không trồng được trên lối đi chính hoặc quá sát cây khác.</p>
    <h4>${ic('lotus')} Hứng hoa sala</h4><p>Ra sân chùa, bấm <b>Công quả → Hứng hoa sala</b>. Kéo khay trong 45 giây (máy tính dùng được phím mũi tên hoặc A, D): hoa vàng trắng tính 1 bông, hoa hồng tính 3 bông. Mỗi ngày có 3 lượt, mỗi lượt nhận 10 đến 40 Sen tuỳ số hoa. Bấm Dừng giữa chừng thì lượt đó không được tính.</p><p>Hứng đủ <b>1.080 hoa</b> được tặng <b>Áo Hoa Sala</b>. Bảng xếp hạng tuần cập nhật 3 tiếng một lần.</p>
    <h4>${ic('sound')} Âm thanh</h4><p>Nên đeo tai nghe để nghe tiếng mõ, chuông và đại chúng niệm Phật. Tắt/bật, chỉnh nhịp mõ trong Cài đặt.</p>
  </div>`;
  if (tab === 'grow') return `<div class="prose howto">
    <h4>${ic('spark')} Công đức & cấp độ</h4><p>Mọi hành trì đều cho <b>công đức</b>. Đủ công đức thì lên cấp và nhận <b>pháp hiệu</b> mới (100 cấp, mỗi pháp hiệu 5 bậc; 25 cấp đầu theo thiền phái). Từ cấp 25 càng lên càng khó, và công đức vượt 20.000 trong ngày chỉ tính 10% vào cấp. Lên cấp được thưởng Sen.</p>
    <h4>${ic('book')} Thiền phái</h4><table class="tbl">${Object.values(sects).map((s) => `<tr><td>${s.icon} ${s.name}</td><td>${s.bonusText}</td></tr>`).join('')}</table>
    <p>Đổi phái trong Hồ sơ (200 Ngọc), giữ nguyên cấp. Đọc thêm về từng phái ở menu <b>Thiền phái</b>.</p>
    <h4>${ic('sen')} Sen & ${ic('ngoc')} Ngọc</h4><p><b>Sen</b> nhận từ nhiệm vụ, điểm danh, lên cấp, chia sẻ – dùng mua lễ vật, áo tràng, tràng hạt, bồ đoàn. <b>Ngọc</b> dùng cho đồ trang trí đặc biệt. <b>Không thể</b> mua công đức hay thứ hạng bằng tiền.</p>
    <p>Ở Cửa hàng, bấm <b>Xem thử</b> để xem món đồ trên nhân vật trước khi mua. Lễ vật, cây và linh thú không có mục này.</p>
    <h4>${ic('scroll')} Nhiệm vụ</h4><p>Có nhiệm vụ hằng ngày, hằng tuần và thành tựu lâu dài. Làm xong bấm “Nhận” để lấy quà. Chấm đỏ trên nút Nhiệm vụ báo có quà chờ nhận.</p>
    <h4>${ic('fire')} Điểm danh</h4><p>Lên chùa mỗi ngày giữ chuỗi liên tiếp, quà tăng dần đến ngày thứ 7 (có Ngọc và đèn hoa đăng). Lỡ một ngày thì chuỗi bắt đầu lại.</p>
    <h4>${ic('wheel')} Vòng quay lộc</h4><p>Mỗi ngày có 1 lượt quay miễn phí, nhận Sen, lễ vật hoặc đồ quý. Tỉ lệ ghi ngay trong màn quay. Đồ quý cần cấp 5 trở lên và có giới hạn số món mỗi ngày, không đủ điều kiện thì nhận 50 Sen.</p>
    <h4>${ic('story')} Gieo quẻ</h4><p>Mỗi ngày gieo một quẻ và nhận quà. Quẻ là lời nhắc tu tập, không phải lời tiên đoán.</p>
    <h4>${ic('lotus')} Lộc chùa</h4><p>Hoa sen vàng phát sáng hiện quanh khuôn viên chùa. Ra sân, đi tới gần để nhận quà và lời chúc. Mỗi ngày nhận được số lộc có hạn, và ai đến trước thì nhận trước.</p>
    <h4>${ic('pet')} Linh thú</h4><p>Linh thú chỉ xuất hiện ngoài sân chùa. Đi tới gần và ở cạnh đủ 8 giây để <b>kết duyên</b>, miễn phí 5 lượt mỗi ngày nhưng có thể không thành công. Kết duyên được loài đã có thì nhận Sen thay cho linh thú.</p><ul><li>Linh thú hiếm và tối thượng cần cấp 5 trở lên.</li><li>Kết duyên thành công đủ 40 lần mà chưa có Sư Tử Xanh thì lần thành công đó chắc chắn là Sư Tử Xanh.</li><li>Một số loài mua được bằng Ngọc ở Cửa hàng. Xem tỉ lệ và các loài đã có ở <b>Túi đồ → Linh thú</b>.</li></ul>
    <h4>${ic('trophy')} Xếp hạng</h4><p>Điểm tinh tấn = công đức từ hành trì, xếp theo tuần, tháng, tất cả; lọc theo phái và chùa. Top tuần của mỗi chùa được khắc tên trên <b>Bảng vàng</b> trong chánh điện.</p>
  </div>`;
  if (tab === 'community') return `<div class="prose howto">
    <h4>${ic('users')} Tu cùng mọi người</h4><p>Người thật đang online hiện trong chánh điện cùng bạn, có tên trên đầu. Số người online hiển thị dưới tên chùa.</p>
    <h4>${ic('users')} Bạn đồng tu</h4><p>Chạm vào một Phật tử trong chùa để gửi lời chúc, tặng hương hoặc kết bạn. Khi đã là bạn đồng tu, hai người nhắn tin và tặng quà được cho nhau. Xem lại tin nhắn ở <b>Cộng đồng → Tin nhắn</b>.</p>
    <h4>${ic('temple')} Đạo tràng</h4><p>Vào <b>Cộng đồng → Đạo tràng</b> để lập nhóm, nhập mã hoặc chọn một đạo tràng đang nhận thành viên. Mỗi tuần cả nhóm đạt mục tiêu công đức chung thì mỗi thành viên nhận 50 Sen và 1 nén hương. Đạo tràng có khung trò chuyện riêng.</p>
    <h4>${ic('mail')} Hòm thư</h4><p>Thông báo và quà từ Niệm Phật Online được gửi về Hòm thư. Thư có quà thì mở ra và bấm nhận.</p>
    <h4>${ic('lantern')} Tùy hỷ</h4><p>Vào Cộng đồng → Lời nguyện để đọc đèn hoa đăng của mọi người và bấm tùy hỷ. Chủ đèn nhận thông báo và +2 Sen.</p>
    <h4>${ic('share')} Khoe & mời bạn</h4><p>Chia sẻ thẻ thành tích lên Facebook, Zalo: mỗi ngày lần đầu được +30 Sen. Bạn bè vào qua link của bạn thì <b>cả hai</b> cùng nhận 100 Sen; mời đủ 3 người được Bồ đoàn đài sen.</p>
    <h4>${ic('map')} Hành hương</h4><p>Mở Bản đồ chùa để xem các ngôi chùa khắp ba miền, mô hình 3D và sự tích từng chùa. Mỗi ngày có một <b>chùa duyên</b> tặng thêm quà khi về viếng. Mỗi ngày về chùa được tính vào <b>ấn chùa</b> trong Hộ chiếu (7, 21, 49 ngày lên bậc ấn mới). Đi trọn một <b>tuyến hành hương</b> để nhận thưởng lớn.</p><p><b>Mùng 1, Rằm</b> được ×1.5 công đức, các <b>đại lễ</b> như Phật Đản, Vu Lan được ×2. <b>Hương giữ chuỗi</b> tự giữ chuỗi ngày nếu bạn lỡ vài ngày; tròn mỗi 7 ngày được thêm một nén, tối đa 3.</p>
    <h4>${ic('spark')} Chan nhau</h4><p>Đứng gần một đạo hữu, bấm vào họ rồi chọn <b>Chan</b> để đùa một cú. Người chan mất <b>10 tích đức</b>, người bị chan không mất gì. Không chan được người đang ngồi bồ đoàn hay đang tu tập, và mỗi lần phải cách nhau một lát.</p><ul><li>Hết tích đức thì <b>hoá ngạ quỷ</b>, chỉ đi lại được. Đứng yên nghe kinh đủ 30 phút sẽ trở lại với 50 tích đức.</li><li>Tụng trọn một bài kinh trong ngày được +5 tích đức.</li><li>Không muốn chơi thì tắt <b>Chơi chan với mọi người</b> trong Cài đặt: không ai chan được bạn và bạn cũng không chan được ai.</li></ul>
    <h4>${ic('pray')} Giữ gìn chánh điện</h4><p>Đây là nơi tu tập: dùng lời lẽ hòa nhã, không quảng cáo, không xúc phạm. Nội dung vi phạm sẽ bị ẩn và tài khoản có thể bị khóa.</p>
  </div>`;
  if (tab === 'faq') return `<div class="prose howto">
    <details><summary>Làm sao để nhận danh hiệu truyền thuyết?</summary><p>Danh hiệu do <b>Duyên truyền thuyết</b> trao ngẫu nhiên, không bán và không nạp tiền để tăng cơ hội. Mỗi ngày có 3 lượt, vào khoảng 7–9h, 12–14h và 20–22h (giờ Việt Nam). Mỗi lượt chọn một người đủ các điều kiện:</p>
      <ul><li>Từ <b>cấp 10</b> trở lên.</li><li>Đang <b>ở trong chùa</b> và có lần hạt, lạy Phật trong <b>10 phút</b> gần đây (ngồi yên treo máy không tính), đồng thời đang mở game trên màn hình.</li><li>Chưa được Duyên chọn trong <b>7 ngày</b> qua.</li><li>Tu tập bằng tay, không dùng công cụ tự động.</li></ul>
      <p>Người được chọn có thể nhận danh hiệu, trang bị hoặc vật phẩm, trong đó danh hiệu là hiếm nhất. Mỗi danh hiệu chỉ có <b>10 suất</b>, hiện trên đầu nhân vật. Xem danh sách và số suất còn lại ở Hồ sơ → Danh hiệu.</p></details>
    <details><summary>Danh xưng theo cấp (Hạt sen, Mầm sen…) có từ đâu?</summary><p>Danh xưng này tự đổi theo cấp độ và pháp môn bạn chọn, nên chỉ cần hành trì đều để lên cấp. Đây là danh xưng tu tập, khác với danh hiệu truyền thuyết ở trên.</p></details>
    <details><summary>Làm sao để đổi tên nhân vật?</summary><p>Vào <b>Hồ sơ → Sửa nhân vật</b>, gõ tên mới hoặc bấm nút xúc xắc để thỉnh tên khác, rồi bấm <b>Lưu</b> và xác nhận. Dòng chữ dưới ô tên cho biết lần này tốn bao nhiêu hoặc còn phải chờ mấy ngày.</p>
      <ul><li><b>Lần đầu:</b> miễn phí.</li><li><b>Các lần sau:</b> 20 Ngọc mỗi lần.</li><li><b>Mời từ 10 bạn thật</b> (bạn đạt cấp 3 trở lên, không bị khoá): miễn phí, 7 ngày đổi một lần.</li><li><b>Tên đang bị che thành ***:</b> miễn phí, 7 ngày đổi một lần.</li></ul>
      <p>Tên dài tối đa 24 ký tự và 6 từ, chỉ gồm chữ cái tiếng Việt, tối đa 4 chữ số và khoảng trắng. Không dùng từ ngữ chưa phù hợp hoặc tên dành riêng như Admin, Quản trị, Trụ trì, Hòa thượng.</p></details>
    <details><summary>Đổi máy thì có mất tài khoản không?</summary><p>Không, nếu bạn giữ <b>mã khôi phục</b> (Hồ sơ → Tài khoản). Trên máy mới, ở màn tạo nhân vật chọn “Đã có tài khoản? Khôi phục bằng mã”.</p></details>
    <details><summary>Các máy chủ khác nhau thế nào?</summary><p>Mỗi máy chủ có nhân vật, tiến độ và Ngọc riêng. Người mới nên chọn máy chủ được gợi ý. Đã có tài khoản thì chọn đúng máy chủ cũ để đăng nhập. Đang ở trong chùa muốn đổi thì bấm nút Máy chủ trong thanh điều khiển.</p></details>
    <details><summary>Muốn góp ý hoặc đề xuất chùa thì làm sao?</summary><p>Mở menu <b>Góp ý</b>, chọn Đề xuất chùa hoặc Góp ý tính năng rồi gửi nội dung. Mục Ủng hộ cũng nằm ở đây.</p></details>
    <details><summary>Không nghe tiếng mõ, tiếng chuông?</summary><p>Chạm vào màn hình một lần (trình duyệt cần thao tác mới cho phát tiếng), kiểm tra Cài đặt → Âm thanh và tắt chế độ im lặng của điện thoại.</p></details>
    <details><summary>Máy bị giật, nóng?</summary><p>Vào Cài đặt → Đồ hoạ chọn “Mượt (máy yếu)”, tắt hiện chú tiểu NPC.</p></details>
    <details><summary>Chơi toàn màn hình như ứng dụng?</summary><p>Android: Cài đặt → Toàn màn hình, hoặc menu trình duyệt → “Thêm vào màn hình chính”. iPhone: Safari → Chia sẻ → “Thêm vào MH chính”.</p></details>
    <details><summary>Công đức trong game có phải công đức thật?</summary><p>Con số trong game chỉ để khích lệ thói quen tu tập. Công đức thật đến từ tâm thành và việc làm lành ngoài đời. Ứng dụng không thay thế thầy, đạo tràng hay việc đến chùa.</p></details>
    <details><summary>Tại sao lạy/lần hạt nhanh quá không được tính?</summary><p>Hệ thống giới hạn tốc độ để giữ công bằng, khuyến khích hành trì chậm rãi, chánh niệm.</p></details>
  </div>`;
  return '';
}

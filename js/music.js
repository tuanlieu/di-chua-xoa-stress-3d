// Nhạc nền riêng từng chùa: tự sinh bằng Web Audio theo ngũ cung Việt, không dùng tệp nhạc nên không tốn tải và không vướng bản quyền.
// Mỗi chùa có thang âm, nhạc cụ, nhịp và tiếng thiên nhiên riêng; giai điệu sinh từ tên chùa nên lần nào vào cũng nhận ra đúng chùa đó.
const SCALES = {
  bac: [0, 2, 5, 7, 9],     // điệu Bắc, sáng
  xuan: [0, 3, 5, 7, 10],   // Nam Xuân, thư thái
  ai: [0, 3, 5, 7, 8],      // Nam Ai, trầm lắng
  khmer: [0, 2, 4, 7, 9],   // ngũ cung trưởng, dàn nhạc chùa Khmer
};
// root: Hz nốt gốc; lead/second: nhạc cụ; beat: giây mỗi nhịp; nature: tiếng nền; gong: mấy nhịp một tiếng chiêng
const PRESETS = {
  nhattru: { scale: 'bac', root: 293.66, lead: 'tranh', second: 'sao', beat: 0.95, nature: 'water', gong: 64 },
  tranho: { scale: 'xuan', root: 261.63, lead: 'bau', second: 'tranh', beat: 1.1, nature: 'water', gong: 48 },
  huongson: { scale: 'bac', root: 329.63, lead: 'sao', second: 'tranh', beat: 1.25, nature: 'cave', gong: 0 },
  dinhmay: { scale: 'ai', root: 220, lead: 'sao', second: 'bell', beat: 1.4, nature: 'wind', gong: 40 },
  baison: { scale: 'bac', root: 196, lead: 'tranh', second: 'bell', beat: 1.2, nature: 'birds', gong: 32 },
  thienmau: { scale: 'ai', root: 246.94, lead: 'bau', second: 'sao', beat: 1.3, nature: 'water', gong: 56 },
  vinhan: { scale: 'xuan', root: 293.66, lead: 'tranh', second: 'bau', beat: 0.85, nature: 'birds', gong: 72 },
  doivang: { scale: 'khmer', root: 349.23, lead: 'roneat', second: 'roneat', beat: 0.6, nature: 'birds', gong: 48 },
  linhson: { scale: 'ai', root: 207.65, lead: 'bau', second: 'bell', beat: 1.35, nature: 'wind', gong: 36 },
  lamkinh: { scale: 'khmer', root: 233.08, lead: 'tranh', second: 'sao', beat: 1.05, nature: 'birds', gong: 24 },
  linhung: { scale: 'ai', root: 233.08, lead: 'bau', second: 'bell', beat: 1.3, nature: 'water', gong: 48 },
  nuisam: { scale: 'xuan', root: 277.18, lead: 'tranh', second: 'bau', beat: 1.0, nature: 'birds', gong: 36 },
  cuuphong: { scale: 'bac', root: 220, lead: 'tranh', second: 'bell', beat: 1.25, nature: 'water', gong: 40 },
  hoangoc: { scale: 'xuan', root: 246.94, lead: 'sao', second: 'bau', beat: 1.15, nature: 'wind', gong: 48 },
  kimson: { scale: 'bac', root: 261.63, lead: 'bell', second: 'sao', beat: 1.5, nature: 'wind', gong: 40 },
};
const LEAD_GAIN = { tranh: 0.14, bau: 0.12, sao: 0.075, roneat: 0.1, bell: 0.06 };
const hash = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const rng = (seed) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
// chùa admin thêm sau chưa có bộ riêng: tự chọn từ mã chùa, vẫn khác các chùa còn lại
function presetOf(id) {
  if (PRESETS[id]) return PRESETS[id];
  const r = rng(hash(id)), pick = (a) => a[Math.floor(r() * a.length)];
  return { scale: pick(Object.keys(SCALES)), root: pick([220, 246.94, 261.63, 293.66]), lead: pick(['tranh', 'bau', 'sao']), second: pick(['tranh', 'bell', 'sao']), beat: 0.9 + r() * 0.5, nature: pick(['water', 'wind', 'birds']), gong: pick([32, 48, 64]) };
}

export class TempleMusic {
  constructor(ctx, out, send) {
    this.ctx = ctx;
    this.gain = ctx.createGain(); this.gain.gain.value = 0;
    this.gain.connect(out);
    this.send = ctx.createGain(); this.send.gain.value = 0.5;
    this.gain.connect(this.send); if (send) this.send.connect(send);
    const n = (this.noise = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate)).getChannelData(0);
    for (let i = 0; i < n.length; i++) n[i] = Math.random() * 2 - 1;
    this.id = null; this.loops = [];
  }
  start(id, fade = 2.5) {
    const c = this.ctx, t = c.currentTime;
    this.id = id; this.p = presetOf(id);
    const r = (this.r = rng(hash(id)));
    // hai câu nhạc của riêng chùa này, lặp theo khuôn A A' B A và luôn về chủ âm
    const walk = (len) => { const a = []; let i = 5; for (let k = 0; k < len; k++) { if (r() < 0.22 && k) a.push(null); else { i = Math.max(0, Math.min(9, i + Math.floor(r() * 5) - 2)); a.push(i); } } a[len - 1] = 5; return a; };
    const A = walk(8), B = walk(8);
    this.song = [...A, ...A.map((x, k) => (x !== null && k % 3 === 2 ? Math.min(9, x + 1) : x)), ...B, ...A];
    this.step = 0; this.next = t + 0.6;
    this.gain.gain.cancelScheduledValues(t);
    this.gain.gain.setTargetAtTime(this.level ?? 1, t, fade / 3);
    this.startNature(this.p.nature);
    this.startPad();
  }
  stop(fade = 1.2) {
    if (!this.id) return;
    const t = this.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(t);
    this.gain.gain.setTargetAtTime(0, t, fade / 3);
    const old = this.loops; this.loops = []; this.id = null;
    setTimeout(() => old.forEach((o) => { try { o.stop(); } catch {} }), (fade + 1.5) * 1000);
  }
  setLevel(v) { this.level = v; if (this.id) this.gain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.8); }
  // lên lịch đến hết thời điểm until; gọi lặp lại nên nốt đã xếp không bị xếp trùng
  schedule(until) {
    if (!this.id) return;
    const p = this.p;
    while (this.next < until) {
      const t = this.next, s = this.song[this.step % this.song.length], k = this.step;
      if (s !== null) {
        const f = this.freq(s), long = k % 8 === 7 ? 3 : 1;
        this[p.lead](t, f, LEAD_GAIN[p.lead], p.beat * 2 * long);
        if (k % 16 > 7 && k % 4 === 0) this[p.second](t, this.freq(Math.max(0, s - 5)), LEAD_GAIN[p.second] * 0.7, p.beat * 3);
      }
      if (p.gong && k % p.gong === 0) this.gong(t, p.root / 4);
      if (p.nature === 'birds' && this.r() < 0.1) this.bird(t + this.r() * p.beat);
      if (p.nature === 'cave' && this.r() < 0.3) this.drip(t + this.r() * p.beat);
      this.next += p.beat * (k % 8 === 7 ? 2 : 1); // ngân ở cuối câu
      this.step++;
    }
  }
  freq(i) { const sc = SCALES[this.p.scale], o = Math.floor(i / 5) - 1; return this.p.root * Math.pow(2, o + sc[((i % 5) + 5) % 5] / 12); }
  voice(type, f, t, g, dur, peak, attack = 0.005) {
    const c = this.ctx, o = c.createOscillator(), e = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    e.gain.setValueAtTime(0.0001, t);
    e.gain.exponentialRampToValueAtTime(peak, t + attack);
    e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(e).connect(g); o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  tranh(t, f, v, d) { // đàn tranh: gảy, tắt dần, cuối nốt rung nhẹ
    const dur = Math.max(1.6, d);
    this.voice('triangle', f, t, this.gain, dur, v);
    this.voice('sine', f * 2, t, this.gain, dur * 0.6, v * 0.35);
    this.voice('sine', f * 3, t, this.gain, 0.5, v * 0.15);
  }
  roneat(t, f, v) { // đàn gõ tre: tiếng khô, tắt nhanh
    this.voice('sine', f, t, this.gain, 0.5, v);
    this.voice('triangle', f * 4, t, this.gain, 0.08, v * 0.35);
    this.voice('sine', f * 2, t + 0.3, this.gain, 0.3, v * 0.25);
  }
  bau(t, f, v, d) { // đàn bầu: một dây, luyến lên rồi rung
    const c = this.ctx, dur = Math.max(1.8, d), o = this.voice('sine', f * 0.94, t, this.gain, dur, v, 0.03);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.16);
    const lfo = c.createOscillator(), lg = c.createGain();
    lfo.frequency.value = 5; lg.gain.setValueAtTime(0, t + 0.3); lg.gain.linearRampToValueAtTime(f * 0.014, t + 0.8);
    lfo.connect(lg).connect(o.frequency); lfo.start(t); lfo.stop(t + dur);
    this.voice('sine', f * 2, t, this.gain, dur * 0.5, v * 0.2, 0.03);
  }
  sao(t, f, v, d) { // sáo trúc: hơi thở mềm, có rung
    const c = this.ctx, dur = Math.max(1.4, d), o = this.voice('sine', f * 2, t, this.gain, dur, v, 0.14);
    const lfo = c.createOscillator(), lg = c.createGain();
    lfo.frequency.value = 5.2; lg.gain.value = f * 0.018;
    lfo.connect(lg).connect(o.frequency); lfo.start(t); lfo.stop(t + dur);
    const n = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
    n.buffer = this.noise; n.loop = true; bp.type = 'bandpass'; bp.frequency.value = f * 2; bp.Q.value = 6;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v * 0.45, t + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(bp).connect(g).connect(this.gain); n.start(t, Math.random() * 2); n.stop(t + dur);
  }
  bell(t, f, v, d) { // khánh đồng nhỏ
    const dur = Math.max(3, d);
    [[1, 1], [2.76, 0.4], [5.4, 0.15]].forEach(([m, a], i) => this.voice('sine', f * m, t, this.gain, dur / (1 + i), v * a));
  }
  gong(t, f) { // chiêng xa, rất nhẹ
    [[1, 0.1], [1.48, 0.05], [2.1, 0.025]].forEach(([m, a]) => this.voice('sine', f * m, t, this.gain, 6, a, 0.04));
  }
  bird(t) {
    const f = 2200 + this.r() * 1400;
    for (let i = 0; i < 2 + Math.floor(this.r() * 3); i++) {
      const o = this.voice('sine', f, t + i * 0.13, this.gain, 0.09, 0.012, 0.01);
      o.frequency.exponentialRampToValueAtTime(f * (1.25 + this.r() * 0.3), t + i * 0.13 + 0.08);
    }
  }
  drip(t) {
    const f = 900 + this.r() * 700, o = this.voice('sine', f, t, this.gain, 0.16, 0.05, 0.002);
    o.frequency.exponentialRampToValueAtTime(f * 1.7, t + 0.09);
  }
  startPad() { // nền trầm rất nhẹ giữ giọng cho cả bản
    const c = this.ctx, t = c.currentTime, g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    g.gain.value = 0.018; lfo.frequency.value = 0.07; lg.gain.value = 0.008;
    lfo.connect(lg).connect(g.gain); lfo.start(t);
    const oscs = [0.5, 0.75].map((m) => { const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = this.p.root * m; o.connect(g); o.start(t); return o; });
    g.connect(this.gain);
    this.loops.push(lfo, ...oscs);
  }
  startNature(kind) {
    const c = this.ctx, t = c.currentTime, n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    n.buffer = this.noise; n.loop = true;
    const [type, hz, q, level, sw, rate] = { water: ['bandpass', 750, 0.6, 0.016, 220, 0.19], wind: ['lowpass', 520, 1.2, 0.03, 260, 0.09], birds: ['highpass', 3000, 0.4, 0.0035, 500, 0.11], cave: ['lowpass', 260, 0.7, 0.03, 70, 0.05] }[kind];
    f.type = type; f.frequency.value = hz; f.Q.value = q; g.gain.value = level;
    lfo.frequency.value = rate; lg.gain.value = sw;
    lfo.connect(lg).connect(f.frequency); lfo.start(t);
    n.connect(f).connect(g).connect(this.gain); n.start(t);
    this.loops.push(n, lfo);
  }
}

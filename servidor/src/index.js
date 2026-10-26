// Acampada Pixel · the shared square (multiplayer.html)
// One Worker in front of one Durable Object ("the square"). The square is only open around the protests listed in
// manifestacoes.json (1 h before to `horas` after the start, 3 h by default); protests at the same time share it.
// People in a protest or camp (any city) walk in the square; people elsewhere watch, are counted by city and write
// on the mural. Nothing that identifies anyone is kept; the mural is deleted 24 h after the square closes.

const OPEN_BEFORE = 60, DEFAULT_HOURS = 3, CLEANUP_AFTER = 24 * 3600e3;
const MAX_AVATARS = 250, TICK_MS = 250, SAY_MS = 2500, MURAL_MS = 30e3, MURAL_MAX = 140, HIDE_REPORTS = 3;
const W = 22, H = 22; // the square in tiles
const CITIES = ['Faro', 'Coimbra', 'Braga', 'Lisboa', 'Porto'];
const LOOKS = 5 * 6 * 9; // skin x hair x shirt, the same colours as the game

/* ---------- the schedule ---------- */
let schedCache = { at: 0, list: [] };
async function schedule(env) {
  if (Date.now() - schedCache.at < 5 * 60e3 && schedCache.list.length) return schedCache.list;
  try {
    const r = await fetch(env.SCHEDULE_URL, { cf: { cacheTtl: 300 } });
    if (r.ok) schedCache = { at: Date.now(), list: await r.json() };
  } catch (e) {}
  return schedCache.list;
}
// Portugal time to a real instant (handles summer time): the offset of Europe/Lisbon at that moment
function lisbon(date, at) {
  const guess = new Date(`${date}T${at}:00Z`);
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Lisbon', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(guess);
  const h = +parts.find(p => p.type === 'hour').value, m = +parts.find(p => p.type === 'minute').value;
  const [ah, am] = at.split(':').map(Number);
  return guess.getTime() - ((h * 60 + m) - (ah * 60 + am)) * 60e3;
}
function windows(list) {
  return (list || []).filter(r => r && r.date && r.at).map(r => {
    const start = lisbon(r.date, r.at);
    return { ...r, start, open: start - OPEN_BEFORE * 60e3, close: start + (r.horas || DEFAULT_HOURS) * 3600e3 };
  });
}
function status(list, now = Date.now(), force = false) {
  const ws = windows(list);
  const live = ws.filter(w => now >= w.open && now < w.close);
  const next = ws.filter(w => w.open > now).sort((a, b) => a.open - b.open)[0] || null;
  if (force && !live.length) live.push({ city: null, title: 'Teste', where: '', open: now - 1, close: now + 3600e3, start: now });
  const close = live.length ? Math.max(...live.map(w => w.close)) : 0;
  const pick = w => w && { city: w.city || null, title: w.title, where: w.where || '', date: w.date, at: w.at, start: w.start, open: w.open, close: w.close };
  return { open: live.length > 0, live: live.map(pick), next: pick(next), close };
}

/* ---------- the Worker ---------- */
function cors(req, env) {
  const o = req.headers.get('Origin') || '';
  const ok = (env.ORIGINS || '').split(',').includes(o) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);
  return ok ? { 'Access-Control-Allow-Origin': o, 'Vary': 'Origin' } : {};
}
export default {
  async fetch(req, env) {
    const url = new URL(req.url), h = cors(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { headers: { ...h, 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Max-Age': '86400' } });
    const stub = env.PRACA.get(env.PRACA.idFromName('praca'));
    if (url.pathname === '/ws') {
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('websocket', { status: 426 });
      return stub.fetch(req);
    }
    if (url.pathname === '/estado' || url.pathname === '/mural') {
      const r = await stub.fetch(new Request(new URL(url.pathname, req.url), { method: 'GET' }));
      return new Response(r.body, { status: r.status, headers: { ...h, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    }
    return new Response('Acampada Pixel · praça', { headers: h });
  }
};

/* ---------- moderation: short, no links, nothing against the movement ---------- */
const BAD = ['merda', 'caralho', 'foda', 'fodam', 'puta', 'putas', 'cabrão', 'cabroes', 'cabrões', 'paneleiro', 'panilas', 'preto de merda', 'macaco', 'cigano de merda', 'chulos', 'chulo', 'parasitas', 'parasita', 'vagabundos', 'vadios', 'mandriões', 'mandriao', 'okupas', 'ocupas de merda', 'vão trabalhar', 'vao trabalhar', 'ide trabalhar', 'vai trabalhar', 'arranjem emprego', 'arranja emprego', 'polícia neles', 'policia neles', 'bastão neles', 'cacetada', 'porrada neles', 'tirem-nos daí', 'limpem a praça', 'lixo humano', 'escumalha', 'comunas', 'esquerdalha', 'esquerdalhos', 'heil', 'nazi', 'fuck', 'shit', 'bitch', 'cunt', 'faggot', 'nigger', 'get a job', 'lazy', 'go to work', 'parasites', 'bums', 'scum'];
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[0@]/g, 'o').replace(/[1!|]/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/[^a-z\s-]/g, ' ').replace(/\s+/g, ' ');
const BADN = BAD.map(norm);
function clean(text, max) {
  const t = String(text || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
  if (!t) return { ok: false, why: 'vazio' };
  if (/https?:|www\.|\.(pt|com|org|net|io|ly)\b|@\w/i.test(t)) return { ok: false, why: 'links' };
  const n = ' ' + norm(t) + ' ';
  if (BADN.some(b => n.includes(' ' + b + ' ') || (b.includes(' ') && n.includes(b)))) return { ok: false, why: 'palavras' };
  return { ok: true, text: t };
}

/* ---------- the square ---------- */
export class Praca {
  constructor(ctx, env) {
    this.ctx = ctx; this.env = env; this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS mural (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, city TEXT, text TEXT, at INTEGER, expires INTEGER, reports INTEGER DEFAULT 0, hidden INTEGER DEFAULT 0)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS reports (msg INTEGER, who TEXT, PRIMARY KEY (msg, who))`);
    this.people = new Map(); // socket -> person
    this.nextId = 1; this.timer = null; this.state = null; this.stateAt = 0;
  }
  async status() {
    if (Date.now() - this.stateAt > 60e3 || !this.state) { this.state = status(await schedule(this.env), Date.now(), this.env.FORCE_OPEN === '1'); this.stateAt = Date.now(); }
    return this.state;
  }
  mural(all = false) {
    return this.sql.exec(`SELECT id, name, city, text, at FROM mural WHERE hidden = 0 AND expires > ? ORDER BY id DESC LIMIT ${all ? 300 : 120}`, Date.now()).toArray().reverse();
  }
  counts() {
    const praca = {}, apoio = {};
    for (const p of this.people.values()) { if (!p.name) continue; const o = p.mode === 'praca' ? praca : apoio; o[p.city] = (o[p.city] || 0) + 1; }
    return { praca, apoio };
  }
  async fetch(req) {
    const url = new URL(req.url), st = await this.status();
    if (url.pathname === '/estado') return Response.json({ ...st, now: Date.now(), counts: this.counts(), dj: this.dj() });
    if (url.pathname === '/mural') return Response.json({ mural: this.mural(true) });
    const pair = new WebSocketPair(), [client, server] = Object.values(pair);
    server.accept();
    if (!st.open) { server.send(JSON.stringify({ t: 'closed', next: st.next })); server.close(4000, 'fechado'); return new Response(null, { status: 101, webSocket: client }); }
    const p = { id: this.nextId++, ws: server, name: null, mode: 'apoio', city: '', x: W / 2, y: H - 2, look: 0, say: null, sayAt: 0, emote: 0, top: false, lastSay: 0, lastMural: 0, msgs: 0, winStart: Date.now(), dirty: true };
    this.people.set(server, p);
    server.addEventListener('message', ev => this.onMessage(p, ev.data));
    const bye = () => { if (!this.people.has(server)) return; this.people.delete(server); if (p.name && p.mode === 'praca') this.broadcast({ t: 'leave', id: p.id }); this.broadcast({ t: 'counts', c: this.counts() }); if (!this.people.size) this.stop(); };
    server.addEventListener('close', bye); server.addEventListener('error', bye);
    this.start();
    return new Response(null, { status: 101, webSocket: client });
  }
  onMessage(p, raw) {
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    const now = Date.now();
    if (now - p.winStart > 10e3) { p.winStart = now; p.msgs = 0; } if (++p.msgs > 60) return; // flood guard
    if (m.t === 'hello' && !p.name) {
      const n = clean(m.name, 16); p.name = n.ok ? n.text : 'Anónimo';
      const c = String(m.city || '').trim().slice(0, 24); const cc = clean(c, 24); p.city = CITIES.includes(c) ? c : cc.ok ? cc.text : 'Outra';
      const avatars = [...this.people.values()].filter(q => q.name && q.mode === 'praca').length;
      p.mode = m.mode === 'praca' && avatars < MAX_AVATARS ? 'praca' : 'apoio';
      p.look = Math.abs(m.look | 0) % LOOKS; p.x = 2 + Math.random() * (W - 4); p.y = H - 1.5 - Math.random() * 2;
      const others = [...this.people.values()].filter(q => q !== p && q.name && q.mode === 'praca').map(q => this.pub(q));
      this.send(p, { t: 'welcome', id: p.id, mode: p.mode, full: m.mode === 'praca' && p.mode !== 'praca', me: this.pub(p), people: others, mural: this.mural(), counts: this.counts(), dj: this.dj(), close: this.state.close, live: this.state.live, now: Date.now(), size: [W, H] });
      if (p.mode === 'praca') this.broadcast({ t: 'join', p: this.pub(p) }, p);
      this.broadcast({ t: 'counts', c: this.counts() });
      return;
    }
    if (!p.name) return;
    if (m.t === 'pos' && p.mode === 'praca') { const x = +m.x, y = +m.y; if (isFinite(x) && isFinite(y)) { p.x = Math.max(.3, Math.min(W - .3, x)); p.y = Math.max(.3, Math.min(H - .3, y)); p.top = !!m.top && this.dj().on; p.dirty = true; } return; }
    if (m.t === 'say' && p.mode === 'praca') { if (now - p.lastSay < SAY_MS) return; p.lastSay = now; this.broadcast({ t: 'say', id: p.id, k: m.k | 0 }); return; }
    if (m.t === 'emote' && p.mode === 'praca') { p.emote = (m.k | 0) % 8; p.dirty = true; return; }
    if (m.t === 'mural') {
      if (now - p.lastMural < MURAL_MS) return this.send(p, { t: 'muralno', why: 'espera', wait: Math.ceil((MURAL_MS - (now - p.lastMural)) / 1000) });
      const c = clean(m.text, MURAL_MAX); if (!c.ok) return this.send(p, { t: 'muralno', why: c.why });
      p.lastMural = now;
      const expires = (this.state.close || now) + CLEANUP_AFTER;
      const row = this.sql.exec('INSERT INTO mural (name, city, text, at, expires) VALUES (?, ?, ?, ?, ?) RETURNING id', p.name, p.city, c.text, now, expires).one();
      this.broadcast({ t: 'mural+', m: { id: row.id, name: p.name, city: p.city, text: c.text, at: now }, by: p.id });
      this.ctx.storage.setAlarm(expires);
      return;
    }
    if (m.t === 'report') {
      const id = m.id | 0; try { this.sql.exec('INSERT INTO reports (msg, who) VALUES (?, ?)', id, String(p.id) + ':' + p.name); } catch (e) { return; }
      const n = this.sql.exec('SELECT COUNT(*) AS n FROM reports WHERE msg = ?', id).one().n;
      if (n >= HIDE_REPORTS) { this.sql.exec('UPDATE mural SET hidden = 1 WHERE id = ?', id); this.broadcast({ t: 'mural-', id }); }
    }
  }
  pub(p) { return { id: p.id, n: p.name, c: p.city, l: p.look, x: +p.x.toFixed(2), y: +p.y.toFixed(2), e: p.emote, top: p.top }; }
  send(p, m) { try { p.ws.send(JSON.stringify(m)); } catch (e) {} }
  broadcast(m, except) { const s = JSON.stringify(m); for (const p of this.people.values()) if (p !== except && p.name) { try { p.ws.send(s); } catch (e) {} } }
  // DJ p.45: on the stage for 3 minutes in every 10 (the same for everyone, from the clock)
  dj(now = Date.now()) { const k = now % 600e3; return { on: k < 180e3, until: now - k + (k < 180e3 ? 180e3 : 600e3) }; }
  start() { if (this.timer) return; this.lastDj = null; this.timer = setInterval(() => this.tick(), TICK_MS); }
  stop() { clearInterval(this.timer); this.timer = null; }
  tick() {
    // targets that changed (where each avatar is walking to), 4 times a second, in one message for everyone (what the server sends is free)
    const ch = []; for (const p of this.people.values()) if (p.dirty && p.name && p.mode === 'praca') { ch.push([p.id, +p.x.toFixed(2), +p.y.toFixed(2), p.emote, p.top ? 1 : 0]); p.dirty = false; }
    if (ch.length) this.broadcast({ t: 'tick', p: ch });
    const dj = this.dj(); if (!this.lastDj || this.lastDj.on !== dj.on) { this.lastDj = dj; this.broadcast({ t: 'dj', dj }); }
    const st = this.state; if (st && st.close && Date.now() > st.close + 5e3 && Date.now() - this.stateAt > 60e3) this.status().then(s => { if (!s.open) { this.broadcast({ t: 'closed', next: s.next }); for (const ws of this.people.keys()) { try { ws.close(4000, 'fechado'); } catch (e) {} } this.people.clear(); this.stop(); } });
  }
  async alarm() { // 24 h after a square closed: its mural goes
    this.sql.exec('DELETE FROM reports WHERE msg IN (SELECT id FROM mural WHERE expires <= ?)', Date.now());
    this.sql.exec('DELETE FROM mural WHERE expires <= ?', Date.now());
    const next = this.sql.exec('SELECT MIN(expires) AS e FROM mural').one().e; if (next) this.ctx.storage.setAlarm(next);
  }
}

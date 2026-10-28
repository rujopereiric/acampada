// Acampada Pixel · the shared square (multiplayer.html)
// One Worker in front of one Durable Object ("the square"). The square opens around the events in manifestacoes.json:
// protests (1 h before to `horas` after the start, 3 h by default), the daily assembly (`dias`, `abre`, `fecha`), and the
// openings the organisers add on the management page (/gestao). Events at the same time share the square.
// People at a protest or a camp walk in the square; people elsewhere watch, are counted by city and write on the mural.
// Nothing that identifies anyone is kept; the mural is deleted 24 h after the square closes.
import { GESTAO_HTML } from './gestao.js';
import { Personagens, NPC_KINDS } from './personagens.js';
import { Jogos } from './jogos.js';

const OPEN_BEFORE = 60, DEFAULT_HOURS = 3, CLEANUP_AFTER = 24 * 3600e3;
const MAX_AVATARS = 250, MAX_GHOSTS = 100, TICK_MS = 250, SAY_MS = 2500, MURAL_MS = 30e3, MURAL_MAX = 140, HIDE_REPORTS = 3, AVISO_MAX = 160;
const W = 22, H = 22; // the square in tiles
const CITIES = ['Faro', 'Coimbra', 'Braga', 'Lisboa', 'Porto'];
const LOOKS = 5 * 6 * 9; // the old looks: one number (skin x hair x shirt)
// the avatar editor (multiplayer.html: LOOK_RANGES): how many choices each part has; anything else becomes 0
const LOOK_RANGES = { s: 7, hs: 8, h: 9, t: 10, tp: 4, b: 3, bc: 4, a1: 9, a2: 9, bk: 11 };
function cleanLook(l) {
  if (typeof l === 'number') return Math.abs(l | 0) % LOOKS;
  if (!l || typeof l !== 'object') return 0;
  const o = {}; for (const [k, n] of Object.entries(LOOK_RANGES)) { const v = l[k] | 0; o[k] = v >= 0 && v < n ? v : 0; }
  if (o.a2 === o.a1) o.a2 = 0; return o;
}
const PHRASES = 15, GESTURES = 8; // as many as in multiplayer.html (PHRASES, GESTURES): anything else is ignored
// one address can be many people: phone networks put hundreds of phones behind one address (CGNAT), so the limits per
// address are generous; they only stop one script from filling the square or the wall
const PER_IP = 60, MURAL_PER_IP = 10; // connections, and wall messages per minute, from one address
const DJ_ON = 180e3, DJ_CYCLE = 600e3; // the DJ p.45: 3 minutes in every 10 (multiplayer.html walks him from the same clock)
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const CARTAZ_MAX = 60, CRAVO = [11, 11], CARTAZ_POR_PESSOA = 3;
// posters hang on the two faces of the carnation's plinth that look at the square, 8 spaces wide each; a poster takes
// as many spaces as its size (multiplayer.html: CARTAZ_FMT, the same numbers)
const FACE_UNITS = 8, FACES = 8, FILL = [2, 0, 3, 1, 4, 5, 6, 7], CARTAZ_FMT = { p: 2, m: 3, g: 4, f: 6 }, CARTAZ_CORES = 5;
// a drawn poster: one character per pixel, 0-f a colour of the 16 (multiplayer.html PIX), '-' empty; its grid by size
const CARTAZ_GRID = { p: [12, 12], m: [16, 12], g: [16, 14], f: [24, 8] };
// the wall of the abandoned building across the road: 48 x 32 pixels everyone paints together, kept from one opening
// to the next; when the square closes, a copy goes to the gallery (the last 30)
const PW = 48, PH = 32, PN = PW * PH, PB = 8, PX_MAX = 80, PX_MSGS = 150, GALERIA = 30; // PB: the size of a block the organisers can clear // faces 0-1 the plinth, 2-7 hanging from the stem
// where a poster of `u` spaces fits: the first gap on either face (slot = face * 8 + first space), or -1
function cartazSpot(list, u) {
  for (const f of FILL) {
    const used = new Array(FACE_UNITS).fill(false);
    for (const c of list) { if (Math.floor(c.slot / FACE_UNITS) !== f) continue; const o = c.slot % FACE_UNITS, w = CARTAZ_FMT[c.fmt] || 3; for (let i = o; i < o + w && i < FACE_UNITS; i++) used[i] = true; }
    for (let o = 0; o + u <= FACE_UNITS; o++) { let ok = true; for (let i = o; i < o + u; i++) if (used[i]) { ok = false; break; } if (ok) return f * FACE_UNITS + o; }
  }
  return -1;
}

/* ---------- the schedule ---------- */
let schedCache = { at: 0, list: [] };
async function schedule(env) {
  if (Date.now() - schedCache.at < 5 * 60e3 && schedCache.at) return schedCache.list;
  try {
    const r = await fetch(env.SCHEDULE_URL, { cf: { cacheTtl: 300 } });
    if (r.ok) { const j = await r.json(); schedCache = { at: Date.now(), list: Array.isArray(j) ? j : [] }; }
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
const lisbonDate = (t = Date.now()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t));
const addDays = (date, n) => { const d = new Date(date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const HHMM = /^\d{1,2}:\d{2}$/, DATE = /^\d{4}-\d{2}-\d{2}$/;
// one event on one day: when the square opens and closes
function windowOf(r, date) {
  const start = lisbon(date, r.at);
  const open = r.abre && HHMM.test(r.abre) ? lisbon(date, r.abre) : start - OPEN_BEFORE * 60e3;
  let close = r.fecha && HHMM.test(r.fecha) ? lisbon(date, r.fecha) : start + (+r.horas || DEFAULT_HOURS) * 3600e3;
  if (close <= open) close += 24 * 3600e3; // closes after midnight
  return { city: r.city || null, title: String(r.title || ''), where: String(r.where || ''), date, at: r.at, start, open, close, dj: r.dj !== false, id: r.id || null };
}
// every window from the list: one-off events (`date`) and repeating ones (`dias`: ["seg", ...]) for the next week
function windows(list, now = Date.now()) {
  const out = [], today = lisbonDate(now);
  for (const r of list || []) {
    if (!r || !r.at || !HHMM.test(r.at)) continue;
    if (Array.isArray(r.dias)) {
      for (let k = -1; k <= 8; k++) { const d = addDays(today, k); if (r.dias.includes(DIAS[new Date(d + 'T12:00:00Z').getUTCDay()])) out.push(windowOf(r, d)); }
    } else if (r.date && DATE.test(r.date)) out.push(windowOf(r, r.date));
  }
  return out;
}
const pick = w => w && { city: w.city, title: w.title, where: w.where, date: w.date, at: w.at, start: w.start, open: w.open, close: w.close, dj: w.dj };

/* ---------- the Worker ---------- */
function cors(req, env) {
  const o = req.headers.get('Origin') || '';
  const ok = (env.ORIGINS || '').split(',').includes(o) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);
  return ok ? { 'Access-Control-Allow-Origin': o, 'Vary': 'Origin' } : {};
}
export default {
  async fetch(req, env) {
    const url = new URL(req.url), h = cors(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { headers: { ...h, 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': '*', 'Access-Control-Max-Age': '86400' } });
    const stub = env.PRACA.get(env.PRACA.idFromName('praca'));
    if (url.pathname === '/ws') {
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('websocket', { status: 426 });
      if (!cors(req, env)['Access-Control-Allow-Origin']) return new Response('origem', { status: 403 }); // only the game's pages
      return stub.fetch(req);
    }
    if (url.pathname === '/recordes') { // the game's records, for everyone (index.html: summary)
      if (req.method === 'POST' && !h['Access-Control-Allow-Origin']) return new Response('origem', { status: 403 });
      const r = await stub.fetch(req);
      return new Response(r.body, { status: r.status, headers: { ...h, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    }
    if (url.pathname === '/estado' || url.pathname === '/mural') {
      const r = await stub.fetch(new Request(new URL(url.pathname, req.url), { method: 'GET' }));
      return new Response(r.body, { status: r.status, headers: { ...h, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    }
    // the management page: same address, a pass-phrase kept in Cloudflare (GESTAO_FRASE), never in the code
    if (url.pathname === '/gestao') return new Response(GESTAO_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer' } });
    if (url.pathname === '/gestao/api' && req.method === 'POST') return stub.fetch(req);
    return new Response('Acampada Pixel · praça', { headers: h });
  }
};

/* ---------- moderation: short, no links, nothing against the movement ---------- */
const BAD = ['merda', 'caralho', 'fodam', 'puta', 'putas', 'cabrão', 'cabroes', 'cabrões', 'paneleiro', 'panilas', 'preto de merda', 'macaco', 'cigano de merda', 'chulos', 'chulo', 'parasitas', 'parasita', 'vagabundos', 'vadios', 'mandriões', 'mandriao', 'okupas', 'ocupas de merda', 'vão trabalhar', 'vao trabalhar', 'ide trabalhar', 'vai trabalhar', 'arranjem emprego', 'arranja emprego', 'polícia neles', 'policia neles', 'bastão neles', 'cacetada', 'porrada neles', 'tirem-nos daí', 'limpem a praça', 'lixo humano', 'escumalha', 'comunas', 'esquerdalha', 'esquerdalhos', 'heil', 'nazi', 'fuck', 'shit', 'bitch', 'cunt', 'faggot', 'nigger', 'get a job', 'lazy', 'go to work', 'parasites', 'bums', 'scum'];
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
const plain = (t, max) => String(t || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);

/* ---------- who is who, without keeping addresses: a hash of the address with a secret that changes every day ---------- */
let SALT = null; // made on the first visit (Workers can't make random values before a request arrives)
async function addrKey(req) {
  SALT ||= crypto.randomUUID();
  const ip = req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For') || 'local';
  const day = new Date().toISOString().slice(0, 10);
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(SALT + day + ip));
  return [...new Uint8Array(h).slice(0, 8)].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function samePhrase(a, b) { // compared as hashes, in constant time
  const enc = new TextEncoder(), [x, y] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(a)), crypto.subtle.digest('SHA-256', enc.encode(b))]);
  return crypto.subtle.timingSafeEqual(x, y);
}

/* ---------- the square ---------- */
// what the organisers set on /gestao, kept in the square's storage
const CFG0 = { climaAuto: true, force: null, agenda: [], aviso: '', muralRO: false, paredeRO: false, dj: 'auto', policia: false, ciclistas: true, bans: [], npcs: Object.fromEntries(NPC_KINDS.map(k => [k, true])) };
export class Praca {
  constructor(ctx, env) {
    this.ctx = ctx; this.env = env; this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS mural (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, city TEXT, text TEXT, at INTEGER, expires INTEGER, reports INTEGER DEFAULT 0, hidden INTEGER DEFAULT 0)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS reports (msg INTEGER, who TEXT, PRIMARY KEY (msg, who))`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS cartazes (id INTEGER PRIMARY KEY AUTOINCREMENT, slot INTEGER, name TEXT, city TEXT, text TEXT, dev TEXT, at INTEGER, expires INTEGER, hidden INTEGER DEFAULT 0)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS recordes (city TEXT, k TEXT, v INTEGER, PRIMARY KEY (city, k))`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS parede (i INTEGER PRIMARY KEY, c INTEGER, name TEXT, city TEXT, dev TEXT, key TEXT, at INTEGER)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS paredes (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER, data TEXT)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS parede_rep (b INTEGER, who TEXT, at INTEGER, PRIMARY KEY (b, who))`);
    this.wallPend = new Map(); this.wallFlushAt = 0; // strokes waiting to be written: the wall is written every few seconds, not pixel by pixel
    this.wall = new Array(PN).fill('-'); for (const r of this.sql.exec('SELECT i, c FROM parede').toArray()) if (r.i >= 0 && r.i < PN) this.wall[r.i] = r.c.toString(16);
    this.recBy = new Map(); // address key -> records sent in the last hour
    for (const col of ["fmt TEXT DEFAULT 'm'", 'cor INTEGER DEFAULT 0', "px TEXT DEFAULT ''"]) { try { this.sql.exec(`ALTER TABLE cartazes ADD COLUMN ${col}`); } catch (e) {} } // posters from before sizes and colours
    this.clima = null; this.nextClima = Date.now() + (20 + Math.random() * 30) * 60e3; // the weather: a rain of bananas now and then
    this.pers = new Personagens(this, W, H); this.jogos = new Jogos(this, W, H); this.diretos = []; this.dirId = 0; this.clean = clean;
    this.people = new Map(); // socket -> person
    this.conga = []; // the conga line behind the DJ p.45: ids, in order
    this.nextId = 1; this.timer = null; this.state = null; this.stateAt = 0; this.checking = false; this.wasOpen = null;
    this.muralBy = new Map(); // address key -> times it wrote on the wall in the last minute
    this.fails = new Map(); // address key -> wrong pass-phrases in the last 10 minutes
    this.cfg = { ...CFG0 };
    ctx.blockConcurrencyWhile(async () => { const saved = (await ctx.storage.get('cfg')) || {}; this.cfg = { ...CFG0, ...saved, npcs: { ...CFG0.npcs, ...(saved.npcs || {}) } }; if (!(saved.v >= 2)) { this.cfg.ciclistas = true; this.cfg.v = 2; } }); // v2: bicycles on by default
  }
  async save() { await this.ctx.storage.put('cfg', this.cfg); }

  /* when the square is open: the schedule, the organisers' openings, and their open/close switch */
  async status(fresh = false) {
    // the cache is good for a minute, but never past the moment the square should open or close
    const st0 = this.state, n0 = Date.now();
    if (!fresh && st0 && n0 - this.stateAt < 60e3 && !(st0.next && n0 >= st0.next.open) && !(st0.open && st0.close && n0 >= st0.close)) return st0;
    const now = Date.now(), ws = windows(await schedule(this.env), now);
    for (const a of this.cfg.agenda) ws.push({ city: null, title: a.title, where: a.where || '', date: lisbonDate(a.open), at: '', start: a.open, open: a.open, close: a.close, dj: true, id: a.id });
    const f = this.cfg.force;
    if (f && f.until && now >= f.until) { this.cfg.force = null; await this.save(); }
    let live = ws.filter(w => now >= w.open && now < w.close);
    this.liveSched = live; // what the schedule has on now (without the organisers' switch)
    let next = ws.filter(w => w.open > now).sort((a, b) => a.open - b.open)[0] || null;
    let close = live.length ? Math.max(...live.map(w => w.close)) : 0, by = null;
    const force = this.cfg.force;
    if (force && force.mode === 'fechada') { live = []; close = 0; by = 'fechada'; next = ws.filter(w => w.open >= force.until).sort((a, b) => a.open - b.open)[0] || next; }
    if (force && force.mode === 'aberta') { by = 'aberta'; live.unshift({ city: null, title: force.title || 'Praça aberta', where: '', start: force.at, open: force.at, close: force.until || 0, dj: true }); close = force.until ? Math.max(close, force.until) : 0; }
    if (this.env.FORCE_OPEN === '1' && !live.length && !(force && force.mode === 'fechada')) { live.push({ city: null, title: 'Teste', where: '', open: now - 1, close: now + 3600e3, start: now, dj: true }); close = now + 3600e3; }
    this.state = { open: live.length > 0, live: live.map(pick), next: pick(next), close, by };
    this.stateAt = now;
    if (this.state.open && close) this.alarmAt(close + 15e3); // the wall's copy for the gallery, even if nobody is here when it closes
    return this.state;
  }
  // the DJ: the organisers' switch, and no music once an event without DJ (the assembly) has started
  djInfo(now = Date.now()) {
    const mode = this.cfg.dj, st = this.state || { live: [] };
    const ok = mode === 'off' ? false : mode === 'sempre' ? true : !st.live.some(w => w.dj === false && now >= w.start);
    const k = now % DJ_CYCLE;
    return { mode, ok, on: ok && (mode === 'sempre' || k < DJ_ON) };
  }
  pubCfg() { return { muralRO: this.cfg.muralRO, paredeRO: !!this.cfg.paredeRO, policia: this.cfg.policia, ciclistas: this.cfg.ciclistas, npcs: this.cfg.npcs }; }
  mural(all = false) {
    return this.sql.exec(`SELECT id, name, city, text, at FROM mural WHERE hidden = 0 AND expires > ? ORDER BY id DESC LIMIT ${all ? 300 : 120}`, Date.now()).toArray().reverse();
  }
  counts() {
    const praca = {}, apoio = {};
    for (const p of this.people.values()) { if (!p.name) continue; const o = p.mode === 'praca' ? praca : apoio; o[p.city] = (o[p.city] || 0) + 1; }
    return { praca, apoio };
  }
  climaNow() { return this.clima && this.clima.until > Date.now() ? this.clima : null; }
  chover(k = 'bananas') { const now = Date.now(); this.clima = { k, at: now, until: now + 20e3 }; this.broadcast({ t: 'clima', c: this.clima }); this.nextClima = now + (25 + Math.random() * 25) * 60e3; }
  cartazes() { return this.sql.exec('SELECT id, slot, name, city, text, fmt, cor, px FROM cartazes WHERE hidden = 0 AND expires > ? ORDER BY slot', Date.now()).toArray(); }
  wallStr() { return this.wall.join(''); }
  wallSet(i, c, p, now) { // c: 0-15, or -1 to clean the brick
    this.wall[i] = c < 0 ? '-' : c.toString(16);
    this.wallPend.set(i, { c, name: p.name, city: p.city, dev: p.dev, key: p.key, at: now });
  }
  wallFlush() {
    if (!this.wallPend.size) return;
    for (const [i, w] of this.wallPend) {
      if (w.c < 0) this.sql.exec('DELETE FROM parede WHERE i = ?', i);
      else this.sql.exec('INSERT OR REPLACE INTO parede (i, c, name, city, dev, key, at) VALUES (?, ?, ?, ?, ?, ?, ?)', i, w.c, w.name, w.city, w.dev, w.key, w.at);
    }
    this.wallPend.clear();
  }
  wallReload() { this.wall.fill('-'); for (const r of this.sql.exec('SELECT i, c FROM parede').toArray()) if (r.i >= 0 && r.i < PN) this.wall[r.i] = r.c.toString(16); this.broadcast({ t: 'parede', d: this.wallStr() }); }
  wallSnapshot() { // when the square closes: a copy for the gallery, if anything changed since the last one
    this.wallFlush(); const d = this.wallStr(); if (!/[0-9a-f]/.test(d)) return;
    const last = this.sql.exec('SELECT data FROM paredes ORDER BY id DESC LIMIT 1').toArray()[0];
    if (last && last.data === d) return;
    this.sql.exec('INSERT INTO paredes (at, data) VALUES (?, ?)', Date.now(), d);
    this.sql.exec('DELETE FROM paredes WHERE id NOT IN (SELECT id FROM paredes ORDER BY id DESC LIMIT ?)', GALERIA);
  }
  wallReports() { return this.sql.exec('SELECT b, COUNT(*) AS n, MAX(at) AS at FROM parede_rep GROUP BY b ORDER BY n DESC').toArray(); }
  banned(dev) { const now = Date.now(); return !!dev && this.cfg.bans.some(b => b.dev === dev && b.until > now); }

  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === '/gestao/api') return this.admin(req);
    if (url.pathname === '/recordes') return this.recordes(req);
    const st = await this.status();
    if (url.pathname === '/estado') return Response.json({ ...st, now: Date.now(), counts: this.counts(), dj: this.djInfo(), aviso: this.cfg.aviso });
    if (url.pathname === '/mural') return Response.json({ mural: this.mural(true) });
    const key = await addrKey(req);
    const pair = new WebSocketPair(), [client, server] = Object.values(pair);
    server.accept();
    if (!st.open) { server.send(JSON.stringify({ t: 'closed', next: st.next, by: st.by })); server.close(4000, 'fechado'); return new Response(null, { status: 101, webSocket: client }); }
    if ([...this.people.values()].filter(q => q.key === key).length >= PER_IP) { server.send(JSON.stringify({ t: 'busy' })); server.close(4001, 'demasiadas'); return new Response(null, { status: 101, webSocket: client }); }
    const p = { id: this.nextId++, key, dev: '', ws: server, name: null, mode: 'apoio', av: false, pxWin: 0, pxN: 0, city: '', x: W / 2, y: H - 2, look: 0, emote: 0, lastSay: 0, lastMural: 0, msgs: 0, winStart: Date.now(), dirty: true };
    this.people.set(server, p);
    server.addEventListener('message', ev => this.onMessage(p, ev.data));
    const bye = () => { if (!this.people.has(server)) return; this.people.delete(server); this.congaOut(p.id); if (p.name && p.av) this.broadcast({ t: 'leave', id: p.id }); this.broadcast({ t: 'counts', c: this.counts() }); if (!this.people.size) this.stop(); };
    server.addEventListener('close', bye); server.addEventListener('error', bye);
    this.start();
    return new Response(null, { status: 101, webSocket: client });
  }
  onMessage(p, raw) {
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    const now = Date.now();
    if (m.t === 'px' && p.name) { // painting the wall: no limit per person, only against scripts (150 strokes in 10 s)
      if (this.cfg.paredeRO) return this.send(p, { t: 'pxno', why: 'fechada', d: this.wallStr() });
      if (now - p.pxWin > 10e3) { p.pxWin = now; p.pxN = 0; } if (++p.pxN > PX_MSGS || !Array.isArray(m.a)) return;
      const ok = [];
      for (const it of m.a.slice(0, PX_MAX)) { if (!Array.isArray(it)) continue; const i = it[0], c = it[1]; if (!Number.isInteger(i) || i < 0 || i >= PN || !Number.isInteger(c) || c < -1 || c > 15) continue; this.wallSet(i, c, p, now); ok.push([i, c]); }
      if (ok.length) this.broadcast({ t: 'px', a: ok, by: p.id });
      return;
    }
    if (now - p.winStart > 10e3) { p.winStart = now; p.msgs = 0; } if (++p.msgs > 60) return; // flood guard
    if (m.t === 'hello' && !p.name) {
      p.dev = /^[a-z0-9]{8,40}$/.test(m.dev || '') ? m.dev : '';
      if (this.banned(p.dev)) { this.send(p, { t: 'banned' }); try { p.ws.close(4002, 'banido'); } catch (e) {} return; }
      const n = clean(m.name, 16); p.name = n.ok ? n.text : 'Anónimo';
      const c = String(m.city || '').trim().slice(0, 24); const cc = clean(c, 24); p.city = CITIES.includes(c) ? c : cc.ok ? cc.text : 'Outra';
      // at the protest (in colour) or far away (a grey ghost): both walk and play; only the counts tell them apart
      p.mode = m.mode === 'praca' ? 'praca' : 'apoio';
      const same = [...this.people.values()].filter(q => q.name && q.av && q.mode === p.mode).length;
      p.av = same < (p.mode === 'praca' ? MAX_AVATARS : MAX_GHOSTS); // the far-away ones never take a place from those at the protest
      p.won = (m.won | 0) & 31; p.look = cleanLook(m.look); p.bike = !!m.bike && this.cfg.ciclistas; p.item = 0; p.x = 2 + Math.random() * (W - 4); p.y = H - 1.5 - Math.random() * 2;
      const others = [...this.people.values()].filter(q => q !== p && q.name && q.av).map(q => this.pub(q));
      this.send(p, { t: 'welcome', id: p.id, mode: p.mode, av: p.av, full: !p.av, me: this.pub(p), parede: this.wallStr(), galeria: this.sql.exec('SELECT COUNT(*) AS n FROM paredes').one().n, people: others, mural: this.mural(), counts: this.counts(), dj: this.djInfo(), cfg: this.pubCfg(), aviso: this.cfg.aviso, close: this.state.close, live: this.state.live, by: this.state.by, now: Date.now(), size: [W, H], npcs: this.pers.all(), ball: this.pers.pubBall(), convencidos: this.pers.convincedToday(), jogos: this.jogos.pub(), cartazes: this.cartazes(), meus: p.dev ? this.sql.exec('SELECT id FROM cartazes WHERE hidden = 0 AND expires > ? AND dev = ?', now, p.dev).toArray().map(r => r.id) : [], clima: this.climaNow(), conga: this.conga, congaNpc: this.pers.congaNpc });
      if (p.av) this.broadcast({ t: 'join', p: this.pub(p) }, p);
      this.broadcast({ t: 'counts', c: this.counts() });
      return;
    }
    if (!p.name) return;
    if (m.t === 'pos' && p.av) { const x = +m.x, y = +m.y; if (isFinite(x) && isFinite(y)) { p.x = Math.max(.3, Math.min(W - .3, x)); p.y = Math.max(.3, Math.min(H - .3, y)); p.dirty = true; } return; }
    if (m.t === 'say' && p.av) { const k = m.k; if (!Number.isInteger(k) || k < 0 || k >= PHRASES || now - p.lastSay < SAY_MS) return; p.lastSay = now; this.broadcast({ t: 'say', id: p.id, k }); return; }
    if (m.t === 'emote' && p.av) { const k = m.k; p.emote = Number.isInteger(k) && k >= 0 && k < GESTURES ? k : 0; p.dirty = true; return; }
    if (m.t === 'cantar' && p.av) { // the collective Grândola: enough people within 15 s, then 5 minutes' rest
      if (this.cantoAt && now - this.cantoAt < 300e3) return this.send(p, { t: 'cantono', wait: Math.ceil((300e3 - (now - this.cantoAt)) / 60e3) });
      this.canto ||= new Map(); for (const [id, t] of this.canto) if (now - t > 15e3) this.canto.delete(id);
      this.canto.set(p.id, now);
      const praca = [...this.people.values()].filter(q => q.name && q.av).length, need = Math.min(5, Math.max(2, Math.ceil(praca / 2)));
      if (this.canto.size >= need) { this.cantoAt = now; this.canto.clear(); this.broadcast({ t: 'grandola', n: need }); }
      else this.broadcast({ t: 'canto', id: p.id, n: this.canto.size, need });
      return;
    }
    if (p.av && this.jogos.handle(p, m, now)) return;
    if (p.av && this.pers.handle(p, m, now)) return;
    if (m.t === 'conga' && p.av) { // behind the DJ p.45, while he is in the square
      if (!this.djInfo(now).on) return this.send(p, { t: 'congano' });
      if (!this.conga.includes(p.id) && this.conga.length < 40) { this.conga.push(p.id); this.broadcast({ t: 'conga', ids: this.conga, n: p.name }); }
      return;
    }
    if (m.t === 'conga-sai') { this.congaOut(p.id); return; }
    if (m.t === 'bike' && p.av) { const on = !!m.on && this.cfg.ciclistas; if (on !== p.bike) { p.bike = on; p.dirty = true; } if (m.on && !this.cfg.ciclistas) this.send(p, { t: 'npcno', k: 'bike', why: 'off' }); return; }
    if (m.t === 'cartaz' && p.av) {
      if (Math.hypot(p.x - CRAVO[0], p.y - CRAVO[1]) > 3.6) return this.send(p, { t: 'cartazno', why: 'longe' });
      const mine = p.dev ? this.sql.exec('SELECT COUNT(*) AS n FROM cartazes WHERE hidden = 0 AND expires > ? AND dev = ?', now, p.dev).one().n : (p.cartazes || 0);
      if (mine >= CARTAZ_POR_PESSOA) return this.send(p, { t: 'cartazno', why: 'ja' });
      const fmt = CARTAZ_FMT[m.fmt] ? m.fmt : 'm', cor = Number.isInteger(m.cor) && m.cor >= 0 && m.cor < CARTAZ_CORES ? m.cor : 0;
      const slot = cartazSpot(this.cartazes(), CARTAZ_FMT[fmt]);
      if (slot < 0) return this.send(p, { t: 'cartazno', why: 'cheio' });
      // written, or drawn (then the words are optional)
      const [gw, gh] = CARTAZ_GRID[fmt], px = typeof m.px === 'string' && m.px.length === gw * gh && /^[0-9a-f-]+$/.test(m.px) && /[0-9a-f]/.test(m.px) ? m.px : '';
      const c = px && !String(m.text || '').trim() ? { ok: true, text: '' } : clean(m.text, CARTAZ_MAX); if (!c.ok) return this.send(p, { t: 'cartazno', why: c.why });
      const expires = this.state.close || now + 12 * 3600e3;
      const row = this.sql.exec('INSERT INTO cartazes (slot, name, city, text, dev, at, expires, fmt, cor, px) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id', slot, p.name, p.city, c.text, p.dev, now, expires, fmt, cor, px).one();
      p.cartazes = (p.cartazes || 0) + 1; this.alarmAt(expires + 60e3);
      this.broadcast({ t: 'cartaz+', c: { id: row.id, slot, name: p.name, city: p.city, text: c.text, fmt, cor, px }, by: p.id, mine: mine + 1 });
      return;
    }
    if (m.t === 'quem') { const i = m.i | 0, w = this.wallPend.get(i); if (w) return this.send(p, { t: 'quem', i, n: w.c < 0 ? '' : w.name, c: w.c < 0 ? '' : w.city }); const r = this.sql.exec('SELECT name, city FROM parede WHERE i = ?', i).toArray()[0]; return this.send(p, { t: 'quem', i, n: r ? r.name : '', c: r ? r.city : '' }); }
    if (m.t === 'galeria') return this.send(p, { t: 'galeria', l: this.sql.exec('SELECT id, at FROM paredes ORDER BY id DESC').toArray() });
    if (m.t === 'galeria1') { const r = this.sql.exec('SELECT id, at, data FROM paredes WHERE id = ?', m.id | 0).toArray()[0]; return this.send(p, { t: 'galeria1', g: r || null }); }
    if (m.t === 'parede-rep') { const b = m.b | 0; if (b < 0 || b >= (PW / PB) * (PH / PB)) return; try { this.sql.exec('INSERT INTO parede_rep (b, who, at) VALUES (?, ?, ?)', b, p.key, now); } catch (e) {} return this.send(p, { t: 'parede-rep', b }); }
    if (m.t === 'cartaz-rep') {
      const id = m.id | 0; if (!this.sql.exec('SELECT id FROM cartazes WHERE id = ? AND hidden = 0', id).toArray().length) return;
      try { this.sql.exec('INSERT INTO reports (msg, who) VALUES (?, ?)', -id, p.key); } catch (e) { return; }
      const n = this.sql.exec('SELECT COUNT(*) AS n FROM reports WHERE msg = ?', -id).one().n;
      if (n >= HIDE_REPORTS) { this.sql.exec('UPDATE cartazes SET hidden = 1 WHERE id = ?', id); this.broadcast({ t: 'cartaz-', id }); }
      return;
    }
    if (m.t === 'mural') {
      if (this.cfg.muralRO) return this.send(p, { t: 'muralno', why: 'fechado' });
      if (now - p.lastMural < MURAL_MS) return this.send(p, { t: 'muralno', why: 'espera', wait: Math.ceil((MURAL_MS - (now - p.lastMural)) / 1000) });
      const recent = (this.muralBy.get(p.key) || []).filter(t => now - t < 60e3);
      if (recent.length >= MURAL_PER_IP) return this.send(p, { t: 'muralno', why: 'espera', wait: Math.ceil((60e3 - (now - recent[0])) / 1000) });
      const c = clean(m.text, MURAL_MAX); if (!c.ok) return this.send(p, { t: 'muralno', why: c.why });
      p.lastMural = now; recent.push(now); this.muralBy.set(p.key, recent);
      if (this.muralBy.size > 5000) this.muralBy.clear();
      const expires = (this.state.close || now + 12 * 3600e3) + CLEANUP_AFTER;
      const row = this.sql.exec('INSERT INTO mural (name, city, text, at, expires) VALUES (?, ?, ?, ?, ?) RETURNING id', p.name, p.city, c.text, now, expires).one();
      this.broadcast({ t: 'mural+', m: { id: row.id, name: p.name, city: p.city, text: c.text, at: now }, by: p.id });
      this.alarmAt(expires);
      return;
    }
    if (m.t === 'report') {
      // one report per address (reconnecting doesn't count twice), only for messages still on the wall
      const id = m.id | 0; if (!this.sql.exec('SELECT id FROM mural WHERE id = ? AND hidden = 0', id).toArray().length) return;
      try { this.sql.exec('INSERT INTO reports (msg, who) VALUES (?, ?)', id, p.key); } catch (e) { return; }
      const n = this.sql.exec('SELECT COUNT(*) AS n FROM reports WHERE msg = ?', id).one().n;
      if (n >= HIDE_REPORTS) { this.sql.exec('UPDATE mural SET hidden = 1 WHERE id = ?', id); this.broadcast({ t: 'mural-', id }); }
    }
  }
  // the best of everyone who played the game, square by square: most tents, most people welcomed, fewest days to win
  recDump() { const o = {}; for (const r of this.sql.exec('SELECT city, k, v FROM recordes').toArray()) (o[r.city] ||= {})[r.k] = r.v; return o; }
  async recordes(req) {
    if (req.method !== 'POST') return Response.json(this.recDump());
    let m; try { m = await req.json(); } catch (e) { return Response.json({ erro: 'pedido' }, { status: 400 }); }
    const city = CITIES.includes(m.city) ? m.city : null; if (!city) return Response.json({ erro: 'cidade' }, { status: 400 });
    const key = await addrKey(req), now = Date.now(), sent = (this.recBy.get(key) || []).filter(t => now - t < 3600e3);
    const before = this.recDump()[city] || {};
    if (sent.length >= 30) return Response.json({ before, novo: [] }); // one address sending too many: answered, not counted
    sent.push(now); this.recBy.set(key, sent); if (this.recBy.size > 5000) this.recBy.clear();
    const int = (v, a, b) => Number.isInteger(v) && v >= a && v <= b ? v : null, novo = [];
    const put = (k, v, more) => { if (v == null) return; const old = before[k]; if (old == null || (more ? v > old : v < old)) { this.sql.exec('INSERT OR REPLACE INTO recordes (city, k, v) VALUES (?, ?, ?)', city, k, v); novo.push(k); } };
    put('tents', int(m.tents, 0, 150), true); put('welcomed', int(m.welcomed, 0, 5000), true); if (m.won === true) put('days', int(m.days, 1, 60), false);
    return Response.json({ before, novo });
  }
  alarmAt(t) { this.ctx.storage.getAlarm().then(a => { if (!a || a > t) this.ctx.storage.setAlarm(t); }); }
  congaOut(id) { const i = this.conga.indexOf(id); if (i < 0) return; this.conga.splice(i, 1); this.broadcast({ t: 'conga', ids: this.conga }); }
  pub(p) { return { id: p.id, n: p.name, c: p.city, w: p.won || 0, l: p.look, x: +p.x.toFixed(2), y: +p.y.toFixed(2), e: p.emote, i: p.item || 0, b: p.bike ? 1 : 0, g: p.mode === 'apoio' ? 1 : 0 }; }
  send(p, m) { try { p.ws.send(JSON.stringify(m)); } catch (e) {} }
  broadcast(m, except) { const s = JSON.stringify(m); for (const p of this.people.values()) if (p !== except && p.name) { try { p.ws.send(s); } catch (e) {} } }
  start() { if (this.timer) return; this.lastDj = null; this.pers.ensure(); this.timer = setInterval(() => this.tick(), TICK_MS); }
  stop() { clearInterval(this.timer); this.timer = null; this.wallFlush(); }
  // everyone out: the square closed (by the clock or by the organisers)
  closeAll(st) {
    this.broadcast({ t: 'closed', next: st.next, by: st.by });
    for (const ws of this.people.keys()) { try { ws.close(4000, 'fechado'); } catch (e) {} }
    this.people.clear(); this.stop();
  }
  async closedNow(st) { // bans and posters last until the square closes
    if (this.cfg.bans.length) { this.cfg.bans = []; await this.save(); }
    this.sql.exec('DELETE FROM reports WHERE msg < 0'); this.sql.exec('DELETE FROM cartazes'); this.jogos.closed(); this.wallSnapshot(); // the wall itself stays for the next opening
    this.closeAll(st);
  }
  tick() {
    // targets that changed (where each avatar is walking to), 4 times a second, in one message for everyone (what the server sends is free)
    const now0 = Date.now();
    const ch = []; for (const p of this.people.values()) if (p.name && p.av) {
      if (p.item && now0 > p.itemUntil) { p.item = 0; p.dirty = true; }
      if (p.dirty) { ch.push([p.id, +p.x.toFixed(2), +p.y.toFixed(2), p.emote, p.item || 0, p.bike ? 1 : 0]); p.dirty = false; }
    }
    let npc = { n: [], b: null }; try { npc = this.pers.tick(now0); } catch (e) { console.log('personagens', e); }
    try { this.jogos.tick(now0, this.state && this.state.close); } catch (e) { console.log('jogos', e); }
    if (now0 > this.wallFlushAt) { this.wallFlushAt = now0 + 3e3; this.wallFlush(); }
    if (ch.length || npc.n.length || npc.b) this.broadcast({ t: 'tick', p: ch, n: npc.n, b: npc.b });
    const dj = this.djInfo(); if (!dj.on && this.conga.length) { this.conga = []; this.broadcast({ t: 'conga', ids: [] }); } // the DJ left: the conga breaks up
    if (!this.lastDj || this.lastDj.ok !== dj.ok || this.lastDj.mode !== dj.mode) { this.lastDj = dj; this.broadcast({ t: 'dj', dj }); }
    if (this.cfg.climaAuto && !this.climaNow() && now0 > this.nextClima) this.chover();
    const st = this.state, now = Date.now();
    const due = st && ((st.close && now > st.close + 5e3) || (this.cfg.force && this.cfg.force.until && now >= this.cfg.force.until));
    if (due && !this.checking && now - this.stateAt > 5e3) { this.checking = true; this.status(true).then(s => { if (!s.open) return this.closedNow(s); }).finally(() => { this.checking = false; }); }
  }
  async alarm() { // 24 h after a square closed: its mural goes; at closing time: the wall's copy, even with nobody there
    this.wallFlush(); try { const st = await this.status(true); if (!st.open) this.wallSnapshot(); } catch (e) {}
    this.sql.exec('DELETE FROM reports WHERE msg IN (SELECT id FROM mural WHERE expires <= ?)', Date.now());
    this.sql.exec('DELETE FROM mural WHERE expires <= ?', Date.now());
    this.sql.exec('DELETE FROM cartazes WHERE expires <= ?', Date.now());
    const next = this.sql.exec('SELECT MIN(expires) AS e FROM mural').one().e; if (next) this.alarmAt(next); // alarmAt keeps an earlier one (a closing time)
  }

  /* ---------- /gestao: the organisers ---------- */
  async admin(req) {
    const key = await addrKey(req), now = Date.now();
    const tries = (this.fails.get(key) || []).filter(t => now - t < 10 * 60e3);
    if (tries.length >= 10) return Response.json({ erro: 'Demasiadas tentativas. Espera 10 minutos.' }, { status: 429 });
    if (!this.env.GESTAO_FRASE) return Response.json({ erro: 'Falta criar a palavra-passe GESTAO_FRASE na Cloudflare.' }, { status: 503 });
    let m; try { m = await req.json(); } catch (e) { return Response.json({ erro: 'Pedido inválido.' }, { status: 400 }); }
    if (!(await samePhrase(String(m.frase || ''), this.env.GESTAO_FRASE))) { tries.push(now); this.fails.set(key, tries); return Response.json({ erro: 'Palavra-passe errada.' }, { status: 401 }); }
    this.fails.delete(key);
    this.wallFlush(); const before = await this.status(true), c = this.cfg;
    const live = this.liveSched || [];
    switch (m.acao) {
      case 'estado': break;
      case 'abrir': { const h = +m.horas; c.force = { mode: 'aberta', at: now, until: h > 0 && h <= 24 ? now + h * 3600e3 : null, title: plain(m.titulo, 60) || 'Praça aberta' }; break; }
      case 'fechar': { // until the end of what's on now; the next event opens as planned
        const until = Math.max(now + 60e3, ...live.map(w => w.close));
        c.force = { mode: 'fechada', at: now, until }; break; }
      case 'horario': c.force = null; break;
      case 'agendar': {
        const d = String(m.data || ''), a = String(m.inicio || ''), b = String(m.fim || '');
        if (!DATE.test(d) || !HHMM.test(a) || !HHMM.test(b)) return Response.json({ erro: 'Data ou horas inválidas.' }, { status: 400 });
        const open = lisbon(d, a); let close = lisbon(d, b); if (close <= open) close += 24 * 3600e3;
        if (close <= now) return Response.json({ erro: 'Essa abertura já passou.' }, { status: 400 });
        c.agenda = c.agenda.filter(x => x.close > now); c.agenda.push({ id: crypto.randomUUID().slice(0, 8), title: plain(m.titulo, 60) || 'Praça aberta', where: plain(m.onde, 80), open, close });
        c.agenda.sort((x, y) => x.open - y.open); c.agenda = c.agenda.slice(0, 50); break; }
      case 'desagendar': c.agenda = c.agenda.filter(x => x.id !== m.id); break;
      case 'banir': {
        const target = [...this.people.values()].find(p => p.id === (m.id | 0)); if (!target) break;
        const until = (before.close || now + 12 * 3600e3);
        if (target.dev) { c.bans = c.bans.filter(b => b.until > now); c.bans.push({ dev: target.dev, name: target.name, until }); }
        for (const p of [...this.people.values()]) if (p === target || (target.dev && p.dev === target.dev)) { this.send(p, { t: 'banned' }); try { p.ws.close(4002, 'banido'); } catch (e) {} }
        break; }
      case 'desbanir': c.bans = c.bans.filter(b => b.dev !== m.dev); break;
      case 'apagar-mural': { this.sql.exec('UPDATE mural SET hidden = 2 WHERE hidden = 0 AND expires > ?', now); this.broadcast({ t: 'mural-tudo' }); break; }
      case 'apagar': { const id = m.id | 0; this.sql.exec('UPDATE mural SET hidden = 2 WHERE id = ?', id); this.broadcast({ t: 'mural-', id }); break; }
      case 'repor': {
        const id = m.id | 0; this.sql.exec('UPDATE mural SET hidden = 0 WHERE id = ?', id); this.sql.exec('DELETE FROM reports WHERE msg = ?', id);
        const r = this.sql.exec('SELECT id, name, city, text, at FROM mural WHERE id = ?', id).toArray()[0]; if (r) this.broadcast({ t: 'mural+', m: r, by: 0 });
        break; }
      case 'aviso': c.aviso = plain(m.texto, AVISO_MAX); this.broadcast({ t: 'aviso', text: c.aviso }); break;
      case 'clima': this.chover('bananas'); break;
      case 'apagar-direto': { const id = m.id | 0; this.diretos = this.diretos.filter(d => d.id !== id); this.broadcast({ t: 'direto-', id }); break; }
      case 'apagar-parede': this.sql.exec('DELETE FROM parede'); this.sql.exec('DELETE FROM parede_rep'); this.wallReload(); break;
      case 'apagar-bloco': { const b = m.b | 0, bx = b % (PW / PB), by = Math.floor(b / (PW / PB));
        for (let y = by * PB; y < by * PB + PB; y++) this.sql.exec('DELETE FROM parede WHERE i >= ? AND i < ?', y * PW + bx * PB, y * PW + bx * PB + PB);
        this.sql.exec('DELETE FROM parede_rep WHERE b = ?', b); this.wallReload(); break; }
      case 'ignorar-bloco': this.sql.exec('DELETE FROM parede_rep WHERE b = ?', m.b | 0); break;
      case 'apagar-pintor': { const t = [...this.people.values()].find(p => p.id === (m.id | 0)); if (!t) break;
        if (t.dev) this.sql.exec('DELETE FROM parede WHERE dev = ?', t.dev); else this.sql.exec('DELETE FROM parede WHERE key = ? AND name = ?', t.key, t.name); this.wallReload(); break; }
      case 'repor-parede': { const r = this.sql.exec('SELECT data FROM paredes WHERE id = ?', m.id | 0).toArray()[0]; if (!r) break;
        this.sql.exec('DELETE FROM parede'); const now2 = Date.now();
        for (let i = 0; i < PN; i++) if (r.data[i] && r.data[i] !== '-') this.sql.exec('INSERT INTO parede (i, c, name, city, dev, key, at) VALUES (?, ?, ?, ?, ?, ?, ?)', i, parseInt(r.data[i], 16), '', '', '', '', now2);
        this.wallReload(); break; }
      case 'tirar-cartaz': { const id = m.id | 0; this.sql.exec('UPDATE cartazes SET hidden = 2 WHERE id = ?', id); this.broadcast({ t: 'cartaz-', id }); break; }
      case 'config': {
        if (m.npcs && typeof m.npcs === 'object') { for (const k of NPC_KINDS) if (typeof m.npcs[k] === 'boolean') c.npcs[k] = m.npcs[k]; if (this.timer) this.pers.ensure(); }
        if (typeof m.ciclistas === 'boolean' && !m.ciclistas) for (const p of this.people.values()) if (p.bike) { p.bike = false; p.dirty = true; }
        if (typeof m.muralRO === 'boolean') c.muralRO = m.muralRO;
        if (typeof m.paredeRO === 'boolean') c.paredeRO = m.paredeRO;
        if (typeof m.climaAuto === 'boolean') c.climaAuto = m.climaAuto;
        if (['auto', 'sempre', 'off'].includes(m.dj)) c.dj = m.dj;
        if (typeof m.policia === 'boolean') c.policia = m.policia;
        if (typeof m.ciclistas === 'boolean') c.ciclistas = m.ciclistas;
        this.broadcast({ t: 'cfg', cfg: this.pubCfg() }); break; }
      default: return Response.json({ erro: 'Ação desconhecida.' }, { status: 400 });
    }
    if (m.acao !== 'estado') await this.save();
    const st = await this.status(true);
    if (before.open && !st.open) await this.closedNow(st);
    const ws = windows(await schedule(this.env), now).filter(w => w.close > now).sort((a, b) => a.open - b.open).slice(0, 8).map(pick);
    const people = [...this.people.values()].filter(p => p.name).map(p => ({ id: p.id, name: p.name, city: p.city, mode: p.mode, dev: !!p.dev, px: p.dev ? this.sql.exec('SELECT COUNT(*) AS n FROM parede WHERE dev = ?', p.dev).one().n : this.sql.exec('SELECT COUNT(*) AS n FROM parede WHERE key = ? AND name = ?', p.key, p.name).one().n }));
    const mural = this.sql.exec('SELECT id, name, city, text, at, hidden FROM mural WHERE expires > ? ORDER BY id DESC LIMIT 200', now).toArray();
    return Response.json({ ok: true, now, estado: st, dj: this.djInfo(), cfg: { ...this.pubCfg(), dj: c.dj, aviso: c.aviso, force: c.force, climaAuto: c.climaAuto }, clima: this.climaNow(), nextClima: this.nextClima, agenda: c.agenda.filter(x => x.close > now), horario: ws, people, counts: this.counts(), mural, diretos: this.diretos.slice().reverse(), cartazes: this.cartazes(), convencidos: this.pers.convincedToday(), npcs: c.npcs, parede: this.wallStr(), paredeRep: this.wallReports(), galeria: this.sql.exec('SELECT id, at FROM paredes ORDER BY id DESC').toArray(), bans: c.bans.filter(b => b.until > now).map(b => ({ dev: b.dev, name: b.name, until: b.until })) });
  }
}

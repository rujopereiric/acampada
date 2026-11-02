// The characters in the shared square, run by the square itself (the same for everyone): the orange-headed journalist
// and her camera operator, passers-by who ask what's going on, the photographer, the canteen lady and the camp's
// labrador with her ball. multiplayer.html draws them and opens the conversations; what everyone sees (the live
// interview, a passer-by who joins, a group photo) goes through here.

// the square's furniture that the characters walk around (multiplayer.html draws it in the same places)
export const OBST = [[11, 11, 2.2], [16.5, 16.5, 1.8], [16.3, 2.5, 1.5], [17.6, 19.8, 1], [19.6, 12.4, 1], [5.4, 19.6, 1]]; // the carnation, the fountain, the canteen, the chess, draughts and noughts-and-crosses tables (multiplayer.html MESAS)
const SOPA = { x: 15.9, y: 1.85 }; // the canteen lady, behind her table
export const NPC_KINDS = ['jornalista', 'curiosos', 'fotografa', 'cantina', 'cao', 'zezinho', 'carro', 'bicicletada', 'bufos']; // the last two pass in the street: multiplayer.html times them from the clock
const QUESTIONS = 3, ANSWERS = 3; // the journalist's questions and the ready answers (multiplayer.html: INTERVIEW)
const CONVINCE = [.7, .6, .85]; // how often each explanation (multiplayer.html: EXPLAIN) wins a passer-by over
// «Há um bufo na praça»: a few campers walk about (they come and go). Now and then one of them is not who he says he is:
// a plain-clothes police officer (an earpiece, asks names, films people from the edges) or an infiltrator (wants trouble
// and gathers people round him). Anyone next to a camper can point at him and the square votes: right, he runs and the
// square gains 3 supporters; wrong, an innocent camper leaves offended and nobody can point for 3 minutes. If nobody
// finds him, the officer leaves with his photos, or the infiltrator gets the trouble he wanted and the passers-by he had
// gathered run away. multiplayer.html: CAMPER_LINES (what each one says, in this order), the drawing of the clues.
const CAMPERS = 3, BUFO_FIRST = [2, 4], BUFO_NEXT = [4, 7], BUFO_STAY = 6 * 60e3, CAMPER_STAY = [4, 9];
const VOTE_MS = 20e3, LOCK_MS = 180e3, ACCUSE_EVERY = 60e3, STIR_NEED = 3, STIR_MS = 30e3, BUFO_PRIZE = 3, INF_PLAYERS = 4; // the infiltrator only comes when there are 4 or more people in the square (fewer: the officer comes instead)
const BUFO_RESET = 5 * 60e3; // the square stood still this long (closed): the game starts again from nothing
const LINES = [6, 5, 5]; // a camper, the officer, the infiltrator (multiplayer.html CAMPER_LINES)
const EAR = 1, SNEAKERS = 2, SHADES = 4, CAP = 8; // what can be seen on them (the earpiece: only the officer)

const rnd = (a, b) => a + Math.random() * (b - a);
// the DJ p.45's conga: three characters already in the square dance in line behind him while he walks his circle
// (multiplayer.html: djPos, the same walk from the same clock). People who join line up after them.
const CONGA_NPCS = [-6, -3, -5], CONGA_GAP = 2200, DJ_ON = 180e3, DJ_CYCLE = 600e3, DJ_IN = 9e3, LAP = Math.PI * 2 / 75;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export class Personagens {
  constructor(sq, W, H) {
    this.sq = sq; this.W = W; this.H = H;
    this.npcs = new Map(); this.ball = null; this.nextCur = 0; this.curId = 100;
    this.nextCaos = Date.now() + rnd(4, 7) * 60e3; this.nextAuto = 0; this.lastShot = 0;
    this.convinced = { day: '', n: 0 }; this.congaNpc = [];
    this.bufo = null; this.nextBufo = 0; this.bufoRole = Math.random() < .5 ? 1 : 2; this.vote = null; this.lock = 0; this.camperId = 300; this.nextCamper = 0; this.lastTick = 0;
  }
  // where the DJ is on his painted circle at time t (null when he isn't walking it)
  djAt(t) {
    const d = this.sq.djInfo(t); if (!d.ok) return null;
    const C = this.W / 2, ring = a => [C + Math.cos(a) * 5, C + Math.sin(a) * 5];
    if (d.mode === 'sempre') return ring(Math.PI / 2 + t / 1000 * LAP);
    const k = t % DJ_CYCLE; if (k < DJ_IN || k > DJ_ON - DJ_IN) return null;
    return ring(Math.PI / 2 + (k - DJ_IN) / 1000 * LAP);
  }
  congaTick(now) { // the characters in the line: each one where the DJ was a little earlier
    const on = !!this.djAt(now), ids = on ? CONGA_NPCS.filter(id => this.npcs.has(id)).slice(0, 3) : [];
    if (ids.join() !== this.congaNpc.join()) { this.congaNpc = ids; this.sq.broadcast({ t: 'congaNpc', ids }); }
    ids.forEach((id, i) => {
      const n = this.npcs.get(id), t = this.djAt(now - (i + 1) * CONGA_GAP) || this.djAt(now); if (!n || !t) return;
      if (n.k === 'cao' && this.ball && this.ball.held) { this.ball.held = false; this.ball.dirty = true; }
      n.tx = t[0]; n.ty = t[1]; n.v = 2.6; n.mode = n.k === 'cao' ? 'walk' : n.mode === 'shoot' ? 'walk' : n.mode; this.step(n, .25); this.setS(n, n.k === 'cao' ? 0 : n.s === 6 ? 0 : n.s);
    });
    return ids;
  }
  free(x, y, pad = 0) { return x > .8 && y > .8 && x < this.W - .8 && y < this.H - .8 && OBST.every(([ox, oy, r]) => Math.hypot(x - ox, y - oy) > r + pad); }
  spot(pad = .4) { for (let i = 0; i < 40; i++) { const x = rnd(1, this.W - 1), y = rnd(1, this.H - 1); if (this.free(x, y, pad)) return [x, y]; } return [this.W / 2, this.H - 2]; }
  players() { return [...this.sq.people.values()].filter(p => p.name && p.av); } // everyone with an avatar: at the protest or a ghost
  on(k) { return this.sq.cfg.npcs[k] !== false; }

  /* who is in the square: the organisers switch each one on and off */
  ensure() {
    const want = (id, k, make) => { const has = this.npcs.has(id); if (this.on(k) && !has) this.add(make()); if (!this.on(k) && has) this.remove(id); };
    want(-1, 'jornalista', () => { const [x, y] = this.spot(); return { id: -1, k: 'jornalista', x, y, v: 1.5, mode: 'walk' }; });
    want(-2, 'jornalista', () => { const j = this.npcs.get(-1) || { x: 5, y: 5 }; return { id: -2, k: 'operador', x: j.x - .8, y: j.y + .5, v: 1.9, mode: 'follow' }; });
    want(-3, 'fotografa', () => { const [x, y] = this.spot(); return { id: -3, k: 'fotografa', x, y, v: 1.4, mode: 'walk' }; });
    want(-4, 'cantina', () => ({ id: -4, k: 'cantina', x: SOPA.x, y: SOPA.y, v: 0, mode: 'still' }));
    want(-5, 'cao', () => { const [x, y] = this.spot(); return { id: -5, k: 'cao', x, y, v: 1.9, mode: 'walk' }; });
    want(-6, 'zezinho', () => { const [x, y] = this.spot(); return { id: -6, k: 'zezinho', x, y, v: 1.1, mode: 'walk' }; }); // Zezinho Bailarino: walks about filming on his phone, nothing else
    if (this.on('cao') && !this.ball) { const [x, y] = this.spot(); this.ball = { x, y, tx: x, ty: y, held: false, flying: false, dirty: true }; this.sq.broadcast({ t: 'ball', b: this.pubBall() }); }
    if (!this.on('cao') && this.ball) { this.ball = null; this.sq.broadcast({ t: 'ball', b: null }); }
    if (!this.on('curiosos')) for (const n of [...this.npcs.values()]) if (n.k === 'curioso') this.remove(n.id);
    if (!this.on('bufos') || (this.lastTick && Date.now() - this.lastTick > BUFO_RESET)) this.bufoReset(); // switched off, or the square was closed: no campers, no vote, nothing from before
  }
  add(n) { Object.assign(n, { tx: n.x, ty: n.y, s: 0, g: 0, vr: n.vr || 0, pauseUntil: 0, dirty: true }); this.npcs.set(n.id, n); this.sq.broadcast({ t: 'npc+', n: this.pub(n) }); }
  remove(id) { if (this.npcs.delete(id)) this.sq.broadcast({ t: 'npc-', id }); }
  pub(n) { const o = { id: n.id, k: n.k, x: +n.x.toFixed(2), y: +n.y.toFixed(2), s: n.s, g: n.g, vr: n.vr }; if (n.k === 'acampado') o.t = n.t; return o; } // (a camper: the clues that can be seen on him, never who he is)
  pubBall() { const b = this.ball; return b && [+b.x.toFixed(2), +b.y.toFixed(2), b.held ? 1 : 0]; }
  all() { return [...this.npcs.values()].map(n => this.pub(n)); }
  convincedToday() { const d = new Date().toISOString().slice(0, 10); if (this.convinced.day !== d) this.convinced = { day: d, n: 0 }; return this.convinced.n; }

  /* walking: straight to the target, sliding round the carnation, the fountain and the canteen */
  step(n, dt, inside = true) {
    const dx = n.tx - n.x, dy = n.ty - n.y, d = Math.hypot(dx, dy);
    if (d < .05) { if (n.moving) { n.moving = false; n.dirty = true; } return true; }
    let ux = dx / d, uy = dy / d;
    for (const [ox, oy, r] of OBST) {
      const ax = n.x + ux * .8 - ox, ay = n.y + uy * .8 - oy;
      if (Math.hypot(ax, ay) < r + .3 && Math.hypot(n.tx - ox, n.ty - oy) > r) {
        const rx = n.x - ox, ry = n.y - oy, rl = Math.hypot(rx, ry) || 1, t1 = [-ry / rl, rx / rl], t2 = [ry / rl, -rx / rl];
        const t = t1[0] * ux + t1[1] * uy > t2[0] * ux + t2[1] * uy ? t1 : t2;
        ux = t[0] + rx / rl * .25; uy = t[1] + ry / rl * .25; const l = Math.hypot(ux, uy); ux /= l; uy /= l;
      }
    }
    const s = Math.min(d, n.v * dt);
    n.x += ux * s; n.y += uy * s;
    if (inside) { n.x = Math.max(.4, Math.min(this.W - .4, n.x)); n.y = Math.max(.4, Math.min(this.H - .4, n.y)); }
    n.moving = true; n.dirty = true; return false;
  }
  wander(n, now, pause = [2, 6]) {
    if (this.step(n, .25) && now > n.pauseUntil) { if (!n.waiting) { n.waiting = true; n.pauseUntil = now + rnd(...pause) * 1000; return; } n.waiting = false; [n.tx, n.ty] = this.spot(); }
  }
  setS(n, s) { if (n.s !== s) { n.s = s; n.dirty = true; } }
  near(p, x, y, r = 2.6) { return Math.hypot(p.x - x, p.y - y) <= r; }

  bufoReset() {
    for (const n of [...this.npcs.values()]) { if (n.k === 'acampado') this.remove(n.id); else if (n.mode === 'gang') n.mode = 'walk'; }
    if (this.vote) this.sq.broadcast({ t: 'bufo-fim', r: 'cancel', id: this.vote.id }); // (the vote bar just closes)
    this.bufo = null; this.vote = null; this.nextBufo = 0; this.lock = 0;
  }
  /* four times a second */
  tick(now) {
    this.lastTick = now;
    const inC = this.congaTick(now), free = id => !inC.includes(id); // the ones in the conga do nothing else
    const dt = .25, J = this.npcs.get(-1), O = this.npcs.get(-2), F = free(-3) ? this.npcs.get(-3) : null, S = this.npcs.get(-4), D = free(-5) ? this.npcs.get(-5) : null, B = this.ball;
    for (const id of [-3, -5, -6]) { const n = this.npcs.get(id); if (n && free(id) && n.v === 2.6) n.v = id === -3 ? 1.4 : id === -5 ? 1.9 : 1.1; } // back to their own pace
    const byId = id => this.players().find(p => p.id === id);
    // the journalist: walks about; stops to interview; runs when the dog steals her microphone
    if (J) {
      if (J.mode === 'flee') { J.v = 3.3; this.setS(J, 5); if (this.step(J, dt)) [J.tx, J.ty] = this.spot(); if (now > J.until) { J.mode = 'walk'; J.v = 1.5; this.setS(J, 0); } }
      else if (J.mode === 'interview' || J.mode === 'after') {
        const p = byId(J.with); this.setS(J, 1);
        if (p) { J.tx = Math.max(.5, Math.min(this.W - .5, p.x + .9)); J.ty = Math.max(.5, Math.min(this.H - .5, p.y + .2)); this.step(J, dt); }
        if (!p || now > J.until) { if (J.mode === 'interview' && p) this.sq.send(p, { t: 'pergunta-fim' }); J.mode = 'walk'; J.with = 0; this.setS(J, 0); J.restUntil = now + 10e3; }
      } else { this.setS(J, 0); this.wander(J, now); }
    }
    if (O && J) { // the camera follows her, a step behind
      O.tx = J.x - .9; O.ty = J.y + .5; O.v = J.mode === 'flee' ? 3.6 : 2; this.step(O, dt); this.setS(O, J.s === 1 ? 1 : J.s === 5 ? 5 : 0);
    }
    // the photographer
    if (F) {
      if (F.mode === 'shoot') { this.setS(F, 6); if (now > F.until) { F.mode = 'walk'; this.setS(F, 0); } }
      else { this.setS(F, 0); this.wander(F, now, [3, 8]);
        if (now > this.nextAuto && now - this.lastShot > 20e3) { const g = this.players().filter(p => this.near(p, F.x, F.y, 3)); if (g.length >= 3) { this.shoot(F, null, now); this.nextAuto = now + 90e3; } } }
    }
    if (S && S.mode === 'serve' && now > S.until) { S.mode = 'still'; this.setS(S, 0); }
    // the labrador and her ball
    if (B && B.flying) { const d = Math.hypot(B.tx - B.x, B.ty - B.y), s = Math.min(d, 7 * dt); if (d < .05) B.flying = false; else { B.x += (B.tx - B.x) / d * s; B.y += (B.ty - B.y) / d * s; } B.dirty = true; }
    if (D) this.dog(D, J, B, now, dt, byId);
    const Z = free(-6) ? this.npcs.get(-6) : null; if (Z) { this.wander(Z, now, [3, 7]); this.setS(Z, Z.waiting ? 1 : 0); } // 1: stopped, the phone up
    // passers-by: up to three at a time, from the street in front
    if (this.on('curiosos')) this.curiosos(now, dt, byId);
    if (this.on('bufos')) this.bufos(now, dt);
    // the moves, in one message
    const n = []; for (const x of this.npcs.values()) if (x.dirty) { n.push([x.id, +x.x.toFixed(2), +x.y.toFixed(2), x.s, x.g]); x.dirty = false; }
    const b = B && B.dirty ? this.pubBall() : null; if (B) B.dirty = false;
    return { n, b };
  }
  dog(D, J, B, now, dt, byId) {
    const free = D.mode === 'walk' || D.mode === 'fetch' || D.mode === 'carry';
    if (free && J && J.mode === 'walk' && now > this.nextCaos) { D.mode = 'attack'; if (B && B.held) { B.held = false; B.dirty = true; } }
    if (D.mode === 'attack') {
      D.v = 4.6; D.tx = J ? J.x : D.x; D.ty = J ? J.y : D.y; this.setS(D, 0); this.step(D, dt);
      if (!J) D.mode = 'walk';
      else if (dist(D, J) < .7) { J.mode = 'flee'; J.until = now + 7e3; [J.tx, J.ty] = this.spot(); D.mode = 'chase'; D.until = J.until; this.nextCaos = now + rnd(4, 7) * 60e3; this.sq.broadcast({ t: 'caos' }); }
      return;
    }
    if (D.mode === 'chase') { D.v = 3.5; D.tx = J ? J.x : D.x; D.ty = J ? J.y : D.y; this.setS(D, 4); this.step(D, dt); if (now > D.until || !J) { D.mode = 'walk'; D.v = 1.9; this.setS(D, 0); } return; }
    if (D.mode === 'sit') { this.setS(D, 2); if (now > D.until) { D.mode = 'follow'; D.until = now + 60e3; } return; }
    if (D.mode === 'follow') { const p = byId(D.with); this.setS(D, 0); D.v = 2.6; if (!p || now > D.until) { D.mode = 'walk'; D.v = 1.9; return; } D.tx = p.x - .7; D.ty = p.y + .6; this.step(D, dt); return; }
    if (D.mode === 'roll') { this.setS(D, 3); if (now > D.until) { D.mode = 'walk'; this.setS(D, 0); } return; }
    if (D.mode === 'fetch') {
      D.v = 3.4; this.setS(D, 0); if (!B) { D.mode = 'walk'; return; }
      D.tx = B.x; D.ty = B.y; this.step(D, dt);
      if (!B.flying && dist(D, B) < .5) { B.held = true; D.mode = 'carry'; const ps = this.players(); if (ps.length && Math.random() < .6) { const p = ps[Math.floor(Math.random() * ps.length)]; D.tx = p.x + rnd(-1, 1); D.ty = p.y + rnd(-1, 1); } else [D.tx, D.ty] = this.spot(); }
      return;
    }
    if (D.mode === 'carry') {
      D.v = 2.2; this.setS(D, 0);
      const done = this.step(D, dt); if (B) { B.x = D.x + .25; B.y = D.y + .1; B.dirty = true; }
      if (done || !B) { if (B) { B.held = false; B.dirty = true; } D.mode = 'walk'; D.v = 1.9; D.pauseUntil = now + 4e3; }
      return;
    }
    // just walking about; now and then she rolls on her back or goes for the ball
    D.v = 1.9; this.setS(D, 0); this.wander(D, now, [1, 4]);
    if (Math.random() < .004) { D.mode = 'roll'; D.until = now + 2500; }
    else if (B && !B.held && !B.flying && Math.random() < .01) D.mode = 'fetch';
  }
  curiosos(now, dt, byId) {
    const list = [...this.npcs.values()].filter(n => n.k === 'curioso');
    if (list.length < 3 && now > this.nextCur) {
      const front = Math.random() < .5, x = front ? rnd(2, this.W - 2) : this.W + 2.5, y = front ? this.H + 2.5 : rnd(2, this.H - 2);
      const n = { id: -(this.curId++), k: 'curioso', x, y, v: rnd(1.1, 1.5), mode: 'in', vr: Math.floor(Math.random() * 4) + 4 * Math.floor(Math.random() * 270), leaveAt: now + rnd(150, 240) * 1000 };
      this.add(n); [n.tx, n.ty] = this.spot(); this.nextCur = now + rnd(15, 45) * 1000;
    }
    for (const n of list) {
      if (n.talkUntil && now < n.talkUntil) { this.setS(n, 1); continue; }
      if (n.mode === 'out') { if (this.step(n, dt, false)) this.remove(n.id); continue; }
      if (now > n.leaveAt) { n.mode = 'out'; const front = Math.random() < .5; n.tx = front ? rnd(2, this.W - 2) : this.W + 2.5; n.ty = front ? this.H + 2.5 : rnd(2, this.H - 2); this.setS(n, 0); continue; }
      if (n.mode === 'in') { this.setS(n, 0); if (this.step(n, dt, false)) n.mode = 'walk'; continue; }
      if (n.mode === 'follow') { const p = byId(n.with); this.setS(n, 7); if (!p || now > n.until) { n.mode = 'stand'; const a = rnd(0, Math.PI * 2); n.tx = 11 + Math.cos(a) * 2.7; n.ty = 11 + Math.sin(a) * 2.7; n.leaveAt = now + 240e3; } else { n.tx = p.x + .8; n.ty = p.y + .7; this.step(n, dt); } continue; }
      if (n.mode === 'stand') { this.setS(n, 7); this.step(n, dt); continue; }
      if (n.mode === 'gang') { const b = this.bufo && this.npcs.get(this.bufo.id); if (!b || b.mode === 'out') { n.mode = 'walk'; continue; } this.setS(n, 0); n.tx = b.x + n.gx; n.ty = b.y + n.gy; n.v = 1.6; this.step(n, dt); continue; } // round the infiltrator
      this.setS(n, 0); this.wander(n, now, [3, 8]);
    }
  }
  /* «Há um bufo na praça» */
  camper(now, role) { // someone who comes in from the street, with his own look and maybe a clue or two
    const front = Math.random() < .5, x = front ? rnd(2, this.W - 2) : this.W + 2.5, y = front ? this.H + 2.5 : rnd(2, this.H - 2);
    const any = [0, 0, SNEAKERS, SHADES, CAP][Math.floor(Math.random() * 5)];
    const n = { id: -(this.camperId++), k: 'acampado', x, y, v: rnd(1, 1.3), mode: 'in', vr: Math.floor(Math.random() * 270), role, t: role === 1 ? EAR | [SNEAKERS, SHADES, CAP][Math.floor(Math.random() * 3)] : any,
      leaveAt: now + (role ? BUFO_STAY : rnd(...CAMPER_STAY) * 60e3), said: 0, seen: new Set(), stir: 0 };
    if (this.camperId > 9e5) this.camperId = 300;
    this.add(n); [n.tx, n.ty] = this.spot(); return n;
  }
  edge() { for (let i = 0; i < 20; i++) { const s = Math.floor(Math.random() * 4), a = rnd(1.2, this.W - 1.2), b = rnd(.9, 2.4), [x, y] = [[a, b], [a, this.H - b], [b, a], [this.W - b, a]][s]; if (this.free(x, y, .4)) return [x, y]; } return this.spot(); }
  leave(n) { n.mode = 'out'; const front = Math.random() < .5; n.tx = front ? rnd(2, this.W - 2) : this.W + 2.5; n.ty = front ? this.H + 2.5 : rnd(2, this.H - 2); n.v = n.s === 9 ? 3.4 : n.v; }
  bufoGone(now) { this.bufo = null; this.nextBufo = now + (+(this.sq.env && this.sq.env.BUFO_MS) || rnd(...BUFO_NEXT) * 60e3); }
  bufos(now, dt) {
    const all = [...this.npcs.values()].filter(n => n.k === 'acampado'), ps = this.players();
    const soon = +(this.sq.env && this.sq.env.BUFO_MS) || 0; // (tests only: the next one sooner)
    if (!this.nextBufo) this.nextBufo = now + (soon || rnd(...BUFO_FIRST) * 60e3);
    // the campers: always a few, a new one now and then
    if (all.filter(n => !n.role && n.mode !== 'out').length < CAMPERS && now > this.nextCamper) { this.camper(now, 0); this.nextCamper = now + rnd(20, 50) * 1000; }
    if (!this.bufo && now > this.nextBufo && ps.length) {
      // (the infiltrator waits for a fuller square)
      const role = this.bufoRole === 2 && ps.length < INF_PLAYERS ? 1 : this.bufoRole; if (role === this.bufoRole) this.bufoRole = 3 - role; const n = this.camper(now, role); this.bufo = { id: n.id, role, rumorAt: now + rnd(25, 60) * 1000 };
    }
    if (this.bufo && this.bufo.rumorAt && now > this.bufo.rumorAt) { this.bufo.rumorAt = 0; this.sq.broadcast({ t: 'bufo-rumor' }); } // word gets round once he is one among the others (not the newest one)
    if (this.vote && (now > this.vote.until || this.vote.yes.size + this.vote.no.size >= ps.length)) this.voteEnd(now);
    for (const n of all) {
      if (n.mode === 'out') { if (this.step(n, dt, false)) { this.remove(n.id); if (this.bufo && this.bufo.id === n.id) this.bufoGone(now); } continue; }
      if (n.mode === 'in') { this.setS(n, 0); if (this.step(n, dt, false)) n.mode = 'walk'; continue; }
      if (this.vote && this.vote.id === n.id) { this.setS(n, 0); continue; } // everyone looks at him: he stands still
      if (n.talkUntil && now < n.talkUntil) { this.setS(n, 1); continue; }
      if (now > n.leaveAt) { // time to go: the officer with his photos, a camper home
        if (n.role === 1) { this.sq.broadcast({ t: 'bufo-fim', r: 'fugiu', role: 1, id: n.id, fotos: n.seen.size }); }
        else if (n.role === 2) { this.sq.broadcast({ t: 'bufo-fim', r: 'fugiu', role: 2, id: n.id }); }
        this.setS(n, 0); this.leave(n); continue;
      }
      if (n.role === 1) { // the officer: round the edges; stops near people with his phone up
        if (n.mode === 'film') { this.setS(n, 2); for (const p of ps) if (this.near(p, n.x, n.y, 3.2)) n.seen.add(p.id); if (now > n.until) { n.mode = 'walk'; n.pauseUntil = 0; [n.tx, n.ty] = this.edge(); } continue; }
        this.setS(n, 0);
        if (this.step(n, dt)) {
          const g = ps.find(p => ps.filter(q => this.near(q, p.x, p.y, 2.5)).length >= 2) || (Math.random() < .5 && ps[Math.floor(Math.random() * ps.length)]);
          if (n.next === 'film') { n.next = ''; n.mode = 'film'; n.until = now + rnd(5, 9) * 1000; n.tx = n.x; n.ty = n.y; } // there: the phone up
          else if (g && Math.random() < .6) { const a = rnd(0, Math.PI * 2); n.tx = Math.max(.6, Math.min(this.W - .6, g.x + Math.cos(a) * 2.2)); n.ty = Math.max(.6, Math.min(this.H - .6, g.y + Math.sin(a) * 2.2)); n.next = 'film'; }
          else [n.tx, n.ty] = this.edge();
        }
        continue;
      }
      if (n.role === 2) { // the infiltrator: goes where people are, calls them round, says the wrong things
        const crowd = ps.filter(p => this.near(p, n.x, n.y, 2.5)), gang = [...this.npcs.values()].filter(c => c.k === 'curioso' && c.mode === 'gang');
        if (now > (n.sayAt || 0)) { n.sayAt = now + rnd(18, 28) * 1000; n.shout = now + 3e3; this.sq.broadcast({ t: 'acampado-diz', id: n.id, k: LINES[0] + LINES[1] + Math.floor(Math.random() * LINES[2]), alto: 1 }); }
        this.setS(n, now < (n.shout || 0) ? 3 : 0);
        if (gang.length < 3) for (const c of this.npcs.values()) if (c.k === 'curioso' && !c.g && (c.mode === 'walk') && this.near(c, n.x, n.y, 6) && Math.random() < .02) { const a = rnd(0, Math.PI * 2); c.mode = 'gang'; c.gx = Math.cos(a) * 1.1; c.gy = Math.sin(a) * 1.1; }
        if (crowd.length + gang.length >= STIR_NEED) n.stir += dt * 1000;
        if (n.stir >= STIR_MS) { // the trouble he wanted: the people he gathered run away, and so does he
          for (const c of gang) { c.mode = 'out'; const front = Math.random() < .5; c.tx = front ? rnd(2, this.W - 2) : this.W + 2.5; c.ty = front ? this.H + 2.5 : rnd(2, this.H - 2); c.v = 2.6; }
          this.sq.broadcast({ t: 'bufo-fim', r: 'provocou', role: 2, id: n.id, fugiram: gang.length }); this.setS(n, 0); this.leave(n); continue;
        }
        if (this.step(n, dt) && now > n.pauseUntil) {
          const p = ps.length ? ps.reduce((b, q) => (dist(q, n) < dist(b, n) ? q : b)) : null;
          if (p && dist(p, n) > 1.6) { const a = rnd(0, Math.PI * 2); n.tx = Math.max(.6, Math.min(this.W - .6, p.x + Math.cos(a) * 1.2)); n.ty = Math.max(.6, Math.min(this.H - .6, p.y + Math.sin(a) * 1.2)); }
          else { n.pauseUntil = now + rnd(3, 6) * 1000; n.tx = n.x; n.ty = n.y; }
        }
        continue;
      }
      this.setS(n, 0); this.wander(n, now, [3, 8]);
    }
  }
  voteEnd(now) {
    const V = this.vote; this.vote = null; const n = this.npcs.get(V.id);
    if (!n || V.yes.size <= V.no.size) { this.sq.broadcast({ t: 'bufo-fim', r: 'nao', id: V.id, sim: V.yes.size, nao: V.no.size }); return; }
    n.talkUntil = 0;
    if (n.role) { // found: the disguise comes off (the vest underneath) and he runs
      this.convincedToday(); this.convinced.n += BUFO_PRIZE;
      n.s = 9; n.dirty = true; n.leaveAt = Infinity; this.leave(n); for (const c of this.npcs.values()) if (c.mode === 'gang') c.mode = 'walk';
      this.sq.broadcast({ t: 'bufo-fim', r: 'apanhado', role: n.role, id: n.id, by: V.n, total: this.convinced.n });
    } else { // an innocent camper: offended, he goes home; nobody can point for a while
      this.lock = now + LOCK_MS; n.s = 8; n.dirty = true; this.leave(n);
      this.sq.broadcast({ t: 'bufo-fim', r: 'inocente', id: n.id, by: V.n, lock: LOCK_MS / 1000 });
    }
  }
  shoot(F, by, now) {
    const ids = this.players().filter(p => this.near(p, F.x, F.y, 3.5)).slice(0, 12).map(p => p.id);
    if (by && !ids.includes(by.id)) ids.unshift(by.id);
    F.mode = 'shoot'; F.until = now + 1800; F.tx = F.x; F.ty = F.y; this.lastShot = now;
    const st = this.sq.state || { live: [] }, ev = (st.live[0] || {}).title || '';
    this.sq.broadcast({ t: 'foto', ids, x: +F.x.toFixed(2), y: +F.y.toFixed(2), ev });
  }

  /* what people do with them; returns true when the message was for a character */
  handle(p, m, now) {
    const no = (k, why, wait) => { this.sq.send(p, { t: 'npcno', k, why, wait }); return true; };
    const J = this.npcs.get(-1), F = this.npcs.get(-3), S = this.npcs.get(-4), D = this.npcs.get(-5), B = this.ball;
    if (m.t === 'entrevista') {
      if (!J) return no('jornalista', 'ausente');
      if (!this.near(p, J.x, J.y, 3)) return no('jornalista', 'longe');
      if (J.mode !== 'walk' || now < (J.restUntil || 0)) return no('jornalista', 'ocupada');
      const wait = 180e3 - (now - (p.lastInt || 0)); if (wait > 0) return no('jornalista', 'espera', Math.ceil(wait / 1000));
      J.mode = 'interview'; J.with = p.id; J.until = now + 60e3; J.q = Math.floor(Math.random() * QUESTIONS); p.lastInt = now;
      this.sq.send(p, { t: 'pergunta', q: J.q }); return true;
    }
    if (m.t === 'resposta') {
      if (!J || J.mode !== 'interview' || J.with !== p.id) return true;
      if (m.cancel) { J.mode = 'walk'; J.with = 0; J.restUntil = now + 5e3; p.lastInt = now - 150e3; return true; }
      let said;
      if (Number.isInteger(m.a) && m.a >= 0 && m.a < ANSWERS) said = { a: m.a };
      else { const c = this.sq.clean(m.text, 100); if (!c.ok) return no('jornalista', c.why); said = { text: c.text }; }
      const d = { id: ++this.sq.dirId, by: p.id, n: p.name, c: p.city, q: J.q, ...said, at: now };
      this.sq.diretos.push(d); if (this.sq.diretos.length > 30) this.sq.diretos.shift();
      this.sq.broadcast({ t: 'direto', d });
      J.mode = 'after'; J.until = now + 4e3; return true;
    }
    if (m.t === 'falar') { // a camper says something (it may give him away)
      const n = this.npcs.get(m.id | 0); if (!n || n.k !== 'acampado' || n.mode === 'out') return no('acampado', 'ausente'); if (n.mode === 'in') return true;
      if (!this.near(p, n.x, n.y, 3)) return no('acampado', 'longe');
      if (now - (p.lastFalar || 0) < 1500) return true; p.lastFalar = now;
      const base = [0, LINES[0], LINES[0] + LINES[1]][n.role], k = base + (n.said++ + (n.id & 7)) % LINES[n.role];
      if (!this.vote || this.vote.id !== n.id) { n.talkUntil = now + 3e3; n.tx = n.x; n.ty = n.y; }
      this.sq.send(p, { t: 'acampado-diz', id: n.id, k }); return true;
    }
    if (m.t === 'bufo-acusar') { // «this one is a bufo»: the square votes
      const n = this.npcs.get(m.id | 0); if (!n || n.k !== 'acampado' || n.mode === 'out') return no('acampado', 'ausente'); if (n.mode === 'in') return true;
      if (!this.near(p, n.x, n.y, 3)) return no('acampado', 'longe');
      if (now < this.lock) return no('acampado', 'desconfianca', Math.ceil((this.lock - now) / 1000));
      if (this.vote) return no('acampado', 'votacao');
      const wait = ACCUSE_EVERY - (now - (p.lastAcusar || 0)); if (wait > 0) return no('acampado', 'espera', Math.ceil(wait / 1000));
      p.lastAcusar = now; n.tx = n.x; n.ty = n.y;
      this.vote = { id: n.id, by: p.id, n: p.name, yes: new Set([p.id]), no: new Set(), until: now + VOTE_MS };
      this.sq.broadcast({ t: 'bufo-voto', id: n.id, by: p.id, n: p.name, ms: VOTE_MS, sim: 1, nao: 0 }); return true;
    }
    if (m.t === 'bufo-votar') {
      const V = this.vote; if (!V || V.yes.has(p.id) || V.no.has(p.id)) return true;
      (m.ok ? V.yes : V.no).add(p.id);
      this.sq.broadcast({ t: 'bufo-conta', id: V.id, sim: V.yes.size, nao: V.no.size }); return true;
    }
    if (m.t === 'explicar') {
      const n = this.npcs.get(m.id | 0); if (!n || n.k !== 'curioso') return true;
      if (!this.near(p, n.x, n.y, 3)) return no('curioso', 'longe');
      if (n.g) return no('curioso', 'ja');
      n.tried ||= {}; if (now - (n.tried[p.id] || 0) < 60e3) return no('curioso', 'pensar');
      const a = m.a; if (!Number.isInteger(a) || a < 0 || a >= CONVINCE.length) return true;
      n.talkUntil = now + 2500; n.tx = n.x; n.ty = n.y;
      if (Math.random() < CONVINCE[a]) {
        n.g = 1; n.mode = 'follow'; n.with = p.id; n.until = now + 90e3; n.leaveAt = now + 400e3; n.dirty = true;
        this.convincedToday(); this.convinced.n++;
        this.sq.broadcast({ t: 'convencido', id: n.id, n: p.name, total: this.convinced.n });
      } else { n.tried[p.id] = now; this.sq.send(p, { t: 'npcsay', id: n.id, k: 'pensar' }); }
      return true;
    }
    if (m.t === 'foto') {
      if (!F) return no('fotografa', 'ausente');
      if (!this.near(p, F.x, F.y, 3)) return no('fotografa', 'longe');
      const wait = 60e3 - (now - (p.lastFoto || 0)); if (wait > 0) return no('fotografa', 'espera', Math.ceil(wait / 1000));
      if (F.mode === 'shoot' || now - this.lastShot < 8e3) return no('fotografa', 'ocupada');
      p.lastFoto = now; this.shoot(F, p, now); return true;
    }
    if (m.t === 'cantina') {
      if (!S) return no('cantina', 'ausente');
      if (!this.near(p, 16.3, 2.6, 3)) return no('cantina', 'longe');
      const k = m.k; if (!Number.isInteger(k) || k < 1 || k > 3) return true;
      const wait = 30e3 - (now - (p.lastSopa || 0)); if (wait > 0) return no('cantina', 'espera', Math.ceil(wait / 1000));
      p.lastSopa = now; p.item = k; p.itemUntil = now + 180e3; p.dirty = true; S.mode = 'serve'; S.until = now + 2e3; this.setS(S, 1);
      this.sq.send(p, { t: 'npcsay', id: S.id, k: 'servido' }); return true;
    }
    if (m.t === 'festas') {
      if (!D || !this.near(p, D.x, D.y, 2.6)) return true;
      if (D.mode === 'attack' || D.mode === 'chase') return true;
      if (B && B.held && D.mode === 'carry') { B.held = false; B.dirty = true; }
      D.mode = 'sit'; D.with = p.id; D.until = now + 3e3; D.tx = D.x; D.ty = D.y; this.setS(D, 2); return true;
    }
    if (m.t === 'bola') {
      if (!B || B.held || B.flying || !this.near(p, B.x, B.y, 2.6)) return true;
      const dx = B.x - p.x, dy = B.y - p.y, d = Math.hypot(dx, dy) || 1;
      let tx = B.x + dx / d * rnd(4, 7) + rnd(-1.5, 1.5), ty = B.y + dy / d * rnd(4, 7) + rnd(-1.5, 1.5);
      for (let i = 0; i < 6 && !this.free(tx, ty, .3); i++) { tx = (tx + this.W / 2) / 2 + rnd(-2, 2); ty = (ty + this.H / 2) / 2 + rnd(-2, 2); }
      B.tx = Math.max(1, Math.min(this.W - 1, tx)); B.ty = Math.max(1, Math.min(this.H - 1, ty)); B.flying = true; B.dirty = true;
      if (D && (D.mode === 'walk' || D.mode === 'roll' || D.mode === 'follow')) D.mode = 'fetch';
      return true;
    }
    return false;
  }
}

// The characters in the shared square, run by the square itself (the same for everyone): the orange-headed journalist
// and her camera operator, passers-by who ask what's going on, the photographer, the canteen lady and the camp's
// labrador with her ball. multiplayer.html draws them and opens the conversations; what everyone sees (the live
// interview, a passer-by who joins, a group photo) goes through here.

// the square's furniture that the characters walk around (multiplayer.html draws it in the same places)
export const OBST = [[11, 11, 2.2], [16.5, 16.5, 1.8], [16.3, 2.5, 1.5]]; // the carnation, the fountain, the canteen
const SOPA = { x: 15.9, y: 1.85 }; // the canteen lady, behind her table
export const NPC_KINDS = ['jornalista', 'curiosos', 'fotografa', 'cantina', 'cao', 'carro', 'bicicletada']; // the last two pass in the street: multiplayer.html times them from the clock
const QUESTIONS = 3, ANSWERS = 3; // the journalist's questions and the ready answers (multiplayer.html: INTERVIEW)
const CONVINCE = [.7, .6, .85]; // how often each explanation (multiplayer.html: EXPLAIN) wins a passer-by over

const rnd = (a, b) => a + Math.random() * (b - a);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export class Personagens {
  constructor(sq, W, H) {
    this.sq = sq; this.W = W; this.H = H;
    this.npcs = new Map(); this.ball = null; this.nextCur = 0; this.curId = 100;
    this.nextCaos = Date.now() + rnd(4, 7) * 60e3; this.nextAuto = 0; this.lastShot = 0;
    this.convinced = { day: '', n: 0 };
  }
  free(x, y, pad = 0) { return x > .8 && y > .8 && x < this.W - .8 && y < this.H - .8 && OBST.every(([ox, oy, r]) => Math.hypot(x - ox, y - oy) > r + pad); }
  spot(pad = .4) { for (let i = 0; i < 40; i++) { const x = rnd(1, this.W - 1), y = rnd(1, this.H - 1); if (this.free(x, y, pad)) return [x, y]; } return [this.W / 2, this.H - 2]; }
  players() { return [...this.sq.people.values()].filter(p => p.name && p.mode === 'praca'); }
  on(k) { return this.sq.cfg.npcs[k] !== false; }

  /* who is in the square: the organisers switch each one on and off */
  ensure() {
    const want = (id, k, make) => { const has = this.npcs.has(id); if (this.on(k) && !has) this.add(make()); if (!this.on(k) && has) this.remove(id); };
    want(-1, 'jornalista', () => { const [x, y] = this.spot(); return { id: -1, k: 'jornalista', x, y, v: 1.5, mode: 'walk' }; });
    want(-2, 'jornalista', () => { const j = this.npcs.get(-1) || { x: 5, y: 5 }; return { id: -2, k: 'operador', x: j.x - .8, y: j.y + .5, v: 1.9, mode: 'follow' }; });
    want(-3, 'fotografa', () => { const [x, y] = this.spot(); return { id: -3, k: 'fotografa', x, y, v: 1.4, mode: 'walk' }; });
    want(-4, 'cantina', () => ({ id: -4, k: 'cantina', x: SOPA.x, y: SOPA.y, v: 0, mode: 'still' }));
    want(-5, 'cao', () => { const [x, y] = this.spot(); return { id: -5, k: 'cao', x, y, v: 1.9, mode: 'walk' }; });
    if (this.on('cao') && !this.ball) { const [x, y] = this.spot(); this.ball = { x, y, tx: x, ty: y, held: false, flying: false, dirty: true }; this.sq.broadcast({ t: 'ball', b: this.pubBall() }); }
    if (!this.on('cao') && this.ball) { this.ball = null; this.sq.broadcast({ t: 'ball', b: null }); }
    if (!this.on('curiosos')) for (const n of [...this.npcs.values()]) if (n.k === 'curioso') this.remove(n.id);
  }
  add(n) { Object.assign(n, { tx: n.x, ty: n.y, s: 0, g: 0, vr: n.vr || 0, pauseUntil: 0, dirty: true }); this.npcs.set(n.id, n); this.sq.broadcast({ t: 'npc+', n: this.pub(n) }); }
  remove(id) { if (this.npcs.delete(id)) this.sq.broadcast({ t: 'npc-', id }); }
  pub(n) { return { id: n.id, k: n.k, x: +n.x.toFixed(2), y: +n.y.toFixed(2), s: n.s, g: n.g, vr: n.vr }; }
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

  /* four times a second */
  tick(now) {
    const dt = .25, J = this.npcs.get(-1), O = this.npcs.get(-2), F = this.npcs.get(-3), S = this.npcs.get(-4), D = this.npcs.get(-5), B = this.ball;
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
    // passers-by: up to three at a time, from the street in front
    if (this.on('curiosos')) this.curiosos(now, dt, byId);
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
      this.setS(n, 0); this.wander(n, now, [3, 8]);
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
      const d = { id: ++this.sq.dirId, n: p.name, c: p.city, q: J.q, ...said, at: now };
      this.sq.diretos.push(d); if (this.sq.diretos.length > 30) this.sq.diretos.shift();
      this.sq.broadcast({ t: 'direto', d });
      J.mode = 'after'; J.until = now + 4e3; return true;
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

// Two little games in the shared square, both for two people at once (multiplayer.html draws them):
// - the tent: a tent folded on the ground with two pegs; one person at each peg, both drive theirs in within a few
//   seconds of each other, and the tent goes up (it stays until the square closes);
// - the banner: a rolled-up banner with two ends; the first person to lift an end picks the slogan, a second one lifts
//   the other end, and the banner opens between them for a few minutes.
import { OBST } from './personagens.js';

const HOLD = 6e3; // how long a peg or an end waits for the second person
const TENTS_MAX = 8, TENT_EVERY = 20e3, BANNER_OPEN = 180e3, BANNER_EVERY = 120e3; // TENT_EVERY: after one goes up, the next to pitch
const SLOGANS = 15; // multiplayer.html PHRASES: the banner carries one of them
const rnd = (a, b) => a + Math.random() * (b - a);
// the square's benches and trees (multiplayer.html: makeDecor): nothing is laid on top of them
const DECOR = [[4, 2], [2, 5], [2, 16], [20, 5], [20, 16], [19, 3], [3, 19]];

export class Jogos {
  constructor(sq, W, H) { this.sq = sq; this.W = W; this.H = H; this.id = 1; this.tent = null; this.built = []; this.banner = null; this.nextTent = 0; this.nextBanner = 0; }
  // where to lay a game: never behind the carnation (on the screen the plinth, its posters and the stem cover it), and
  // of the places that fit, the freest one (furthest from the things, the tents and the people around)
  spot(pad) {
    const taken = [...this.built, this.tent, this.banner].filter(Boolean), avatars = [...this.sq.people.values()].filter(p => p.name && p.av);
    const [cx, cy] = OBST[0], d0 = cx + cy;
    let best = null, bs = -1;
    for (let i = 0; i < 80; i++) {
      const x = rnd(2.5, this.W - 2.5), y = rnd(2.5, this.H - 2.5);
      if (x + y < d0 + .8 && x + y > d0 - 11 && Math.abs((x - y) - (cx - cy)) < 3.6) continue; // behind the carnation
      if (!(OBST.every(([ox, oy, r]) => Math.hypot(x - ox, y - oy) > r + pad) && DECOR.every(([dx, dy]) => Math.hypot(x - dx, y - dy) > 1.6) && taken.every(o => Math.hypot(x - o.x, y - o.y) > 2.2))) continue;
      let sc = 4; // how free: the distance to the nearest thing, up to 4 tiles
      for (const [ox, oy, r] of OBST) sc = Math.min(sc, Math.hypot(x - ox, y - oy) - r);
      for (const [dx, dy] of DECOR) sc = Math.min(sc, Math.hypot(x - dx, y - dy) - .6);
      for (const o of taken) sc = Math.min(sc, Math.hypot(x - o.x, y - o.y) - 1);
      for (const p of avatars) sc = Math.min(sc, Math.hypot(x - p.x, y - p.y) + .4);
      if (sc > bs) { bs = sc; best = [x, y]; }
    }
    return best;
  }
  pub() {
    const t = this.tent, b = this.banner, now = Date.now(), who = h => h && h.until > now ? h.n : '';
    return {
      tent: t && { id: t.id, x: t.x, y: t.y, c: t.c, p: t.pegs.map(who) },
      built: this.built.map(o => ({ id: o.id, x: o.x, y: o.y, c: o.c, n: o.n })),
      banner: b && { id: b.id, x: b.x, y: b.y, e: b.ends.map(who), open: b.open, f: b.f, until: b.until, n: b.n }
    };
  }
  send() { this.sq.broadcast({ t: 'jogos', j: this.pub() }); }
  // the two ends of each thing, so that two people can stand at them
  ends(o) { return [[o.x - .55, o.y + .55], [o.x + .55, o.y - .55]]; } // level on the screen
  tick(now, close) {
    let ch = false;
    // a new opening: what was built in the last one is gone (also when nobody was in the square as it closed)
    if (close && this.until && now <= this.until) this.until = close; // still the same opening (maybe extended)
    if (this.until && now > this.until) { this.closed(); ch = true; }
    if (!this.until && close) this.until = close;
    if (!this.tent && this.built.length < TENTS_MAX && now > this.nextTent) { const s = this.spot(1.2); if (s) { this.tent = { id: this.id++, x: s[0], y: s[1], c: Math.floor(Math.random() * 8), pegs: [null, null] }; ch = true; } }
    if (!this.banner && now > this.nextBanner) { const s = this.spot(1.4); if (s) { this.banner = { id: this.id++, x: s[0], y: s[1], ends: [null, null], open: false, f: 0 }; ch = true; } }
    const b = this.banner; if (b && b.open && now > b.until) { this.banner = null; this.nextBanner = now + BANNER_EVERY; ch = true; }
    // a held peg or end that nobody joined in time lets go
    for (const h of [...(this.tent ? this.tent.pegs : []), ...(b && !b.open ? b.ends : [])]) if (h && !h.gone && h.until <= now) { h.gone = true; ch = true; }
    if (ch) this.send();
  }
  // returns true when the message was for a game
  handle(p, m, now) {
    if (m.t !== 'estaca' && m.t !== 'faixa') return false;
    const k = m.k === 1 ? 1 : 0;
    if (m.t === 'estaca') {
      const t = this.tent; if (!t || t.id !== (m.id | 0)) return true;
      const [ex, ey] = this.ends(t)[k]; if (Math.hypot(p.x - ex, p.y - ey) > 1.6) return this.no(p, 'longe');
      const other = t.pegs[1 - k]; if (other && other.until > now && other.id === p.id) return this.no(p, 'sozinho');
      t.pegs[k] = { id: p.id, n: p.name, until: now + HOLD };
      if (other && other.until > now) { // both pegs in: the tent is up
        this.built.push({ id: t.id, x: t.x, y: t.y, c: t.c, n: [other.n, p.name] }); this.tent = null; this.nextTent = now + TENT_EVERY;
        this.sq.broadcast({ t: 'jogo-ok', k: 'tenda', n: [other.n, p.name] });
      }
      this.send(); return true;
    }
    const b = this.banner; if (!b || b.id !== (m.id | 0) || b.open) return true;
    const [ex, ey] = this.ends(b)[k]; if (Math.hypot(p.x - ex, p.y - ey) > 1.6) return this.no(p, 'longe');
    const other = b.ends[1 - k];
    if (other && other.until > now && other.id === p.id) return this.no(p, 'sozinho');
    if (!(other && other.until > now)) { // the first one picks the slogan
      const f = m.f | 0; if (f < 0 || f >= SLOGANS) return true;
      b.f = f; b.ends[k] = { id: p.id, n: p.name, until: now + HOLD };
    } else { // the second one: the banner opens
      b.ends[k] = { id: p.id, n: p.name, until: now + HOLD }; b.open = true; b.until = now + BANNER_OPEN; b.n = [other.n, p.name];
      this.sq.broadcast({ t: 'jogo-ok', k: 'faixa', n: b.n, f: b.f });
    }
    this.send(); return true;
  }
  no(p, why) { this.sq.send(p, { t: 'jogono', why }); return true; }
  closed() { this.tent = null; this.built = []; this.banner = null; this.nextTent = 0; this.nextBanner = 0; this.until = 0; }
}

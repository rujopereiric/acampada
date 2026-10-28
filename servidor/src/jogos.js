// Two little games in the shared square, both for two people at once (multiplayer.html draws them):
// - the tent: a tent folded on the ground with two pegs; one person at each peg, both drive theirs in within a few
//   seconds of each other, and the tent goes up (it stays until the square closes);
// - the banner: a rolled-up banner with two ends; the first person to lift an end picks the slogan, a second one lifts
//   the other end, and the banner opens between them for a few minutes.
import { OBST } from './personagens.js';

const HOLD = 6e3; // how long a peg or an end waits for the second person
const TENTS_MAX = 8, TENT_EVERY = 150e3, BANNER_OPEN = 180e3, BANNER_EVERY = 120e3;
const SLOGANS = 15; // multiplayer.html PHRASES: the banner carries one of them
const rnd = (a, b) => a + Math.random() * (b - a);

export class Jogos {
  constructor(sq, W, H) { this.sq = sq; this.W = W; this.H = H; this.id = 1; this.tent = null; this.built = []; this.banner = null; this.nextTent = 0; this.nextBanner = 0; }
  spot(pad) {
    const taken = [...this.built, this.tent, this.banner].filter(Boolean);
    for (let i = 0; i < 60; i++) {
      const x = rnd(2.5, this.W - 2.5), y = rnd(2.5, this.H - 2.5);
      if (OBST.every(([ox, oy, r]) => Math.hypot(x - ox, y - oy) > r + pad) && taken.every(o => Math.hypot(x - o.x, y - o.y) > 2.2)) return [x, y];
    }
    return null;
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
  tick(now) {
    let ch = false;
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
  closed() { this.tent = null; this.built = []; this.banner = null; this.nextTent = 0; this.nextBanner = 0; }
}

// The management page for the shared square (praca.acampadapixel.pt/gestao). Everything it does goes through
// /gestao/api with the pass-phrase (GESTAO_FRASE, kept in Cloudflare); the page itself holds no secrets.
export const GESTAO_HTML = `<!doctype html>
<html lang="pt-PT">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>A Praça · gestão</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Jost:wght@500;700;800&display=swap" rel="stylesheet">
<style>
:root{ --ink:#0b0a0a; --paper:#f4f1ea; --red:#b02a22; --redbox:#8b2320; --green:#4ba36f; --lime:#b6ff3b; --muted:#a39d97; color-scheme:dark; }
*,*::before,*::after{ box-sizing:border-box; }
body{ margin:0; background:var(--ink); color:var(--paper); font:500 15px/1.4 Jost, "Helvetica Neue", Arial, sans-serif; padding:calc(env(safe-area-inset-top,0px) + 14px) 14px calc(env(safe-area-inset-bottom,0px) + 30px); }
main{ max-width:620px; margin:0 auto; }
h1{ margin:0; font:800 30px/1 Jost, sans-serif; color:var(--red); text-transform:uppercase; }
h1 small{ display:block; color:var(--paper); font-size:14px; letter-spacing:1px; margin-top:4px; }
h2{ margin:0 0 10px; font:800 15px/1.1 Jost, sans-serif; text-transform:uppercase; letter-spacing:.8px; display:flex; justify-content:space-between; align-items:center; gap:8px; }
section{ border:2px solid var(--paper); padding:12px; margin-top:14px; }
button{ font:800 14px/1 Jost, sans-serif; text-transform:uppercase; border:2px solid var(--paper); background:var(--paper); color:var(--ink); padding:9px 12px 8px; cursor:pointer; }
button.red{ background:var(--redbox); border-color:var(--redbox); color:#fff; }
button.green{ background:var(--green); border-color:var(--green); }
button.ghost{ background:transparent; color:var(--paper); }
button.sm{ font-size:12px; padding:6px 8px 5px; }
button:disabled{ opacity:.45; cursor:default; }
.row{ display:flex; flex-wrap:wrap; gap:6px; align-items:center; }
.row + .row{ margin-top:8px; }
input, textarea, select{ font:600 16px/1.2 Jost, sans-serif; background:#fff; color:var(--ink); border:2px solid var(--paper); padding:8px 9px 7px; border-radius:0; width:100%; }
textarea{ resize:vertical; min-height:60px; font-family:"Helvetica Neue", Arial, sans-serif; font-weight:500; }
label{ display:block; font:800 11px/1 Jost, sans-serif; text-transform:uppercase; letter-spacing:.6px; margin:8px 0 4px; }
.grid3{ display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:0 8px; } .grid3 > div:first-child{ grid-column:1 / -1; } .grid3 input{ min-width:0; padding-left:6px; padding-right:4px; font-size:15px; }
.badge{ display:inline-block; font:800 13px/1 Jost, sans-serif; letter-spacing:1px; text-transform:uppercase; padding:6px 9px 5px; background:var(--muted); color:var(--ink); }
.badge.on{ background:var(--lime); }
.muted{ color:var(--muted); font-size:13px; }
.list{ display:flex; flex-direction:column; gap:6px; max-height:420px; overflow:auto; }
.item{ background:var(--paper); color:var(--ink); padding:8px 9px; display:flex; gap:8px; align-items:center; justify-content:space-between; }
.item .t{ min-width:0; overflow-wrap:anywhere; } .item .t b{ font-weight:800; } .item .t small{ display:block; color:#5b554f; font-size:12px; }
.item button{ flex:none; border-color:var(--ink); } .item button.ghost{ color:var(--ink); }
.item.off{ opacity:.6; }
.dot{ display:inline-block; width:9px; height:9px; border-radius:50%; border:1px solid var(--ink); margin-right:4px; vertical-align:0; }
.seg{ display:flex; } .seg button{ flex:1; background:transparent; color:var(--paper); } .seg button + button{ border-left:0; } .seg button.on{ background:var(--paper); color:var(--ink); }
.sw{ display:flex; justify-content:space-between; align-items:center; gap:10px; padding:6px 0; } .sw + .sw{ border-top:1px solid #3a3530; }
.sw span small{ display:block; color:var(--muted); font-size:12px; }
.toast{ position:fixed; left:50%; bottom:calc(env(safe-area-inset-bottom,0px) + 14px); transform:translateX(-50%); background:var(--lime); color:var(--ink); font:800 13px/1.2 Jost, sans-serif; padding:8px 12px 7px; text-transform:uppercase; max-width:92vw; text-align:center; }
.toast.err{ background:#ff9d8f; }
.toast[hidden]{ display:none; }
#login{ max-width:380px; margin:12vh auto 0; text-align:center; }
#login p{ color:#c9c4c4; }
:focus-visible{ outline:3px solid var(--lime); outline-offset:2px; }
</style>
</head>
<body>
<main>
  <div id="login" hidden>
    <h1>A Praça<small>Gestão</small></h1>
    <p>Escreve a palavra-passe da organização.</p>
    <form id="loginForm"><input id="frase" type="password" autocomplete="current-password" placeholder="Palavra-passe" required>
    <label style="text-align:left;display:flex;gap:8px;align-items:center;text-transform:none;font-size:14px;letter-spacing:0;font-weight:600"><input id="lembrar" type="checkbox" checked style="width:auto"> Lembrar neste aparelho</label>
    <button type="submit" class="red" style="width:100%;margin-top:10px">Entrar</button></form>
  </div>
  <div id="app" hidden>
    <div class="row" style="justify-content:space-between"><h1>A Praça<small>Gestão</small></h1><button class="ghost sm" id="sair">Sair</button></div>

    <section><h2>Estado <span id="badge" class="badge"></span></h2>
      <div id="estadoTxt"></div>
      <label for="tituloAbrir">Título (opcional)</label><input id="tituloAbrir" maxlength="60" placeholder="Praça aberta">
      <div class="row" style="margin-top:8px"><span class="muted" style="margin-right:4px">Abrir agora:</span><button class="green" data-abrir="1">1 h</button><button class="green" data-abrir="2">2 h</button><button class="green" data-abrir="3">3 h</button><button class="green" data-abrir="0">Até fechar</button></div>
      <div class="row"><button class="red" id="fechar">Fechar agora</button><button class="ghost" id="horario">Voltar ao horário</button></div>
      <p class="muted" style="margin:8px 0 0">«Fechar agora» fecha até ao fim do que estiver marcado; a próxima abertura do horário acontece normalmente. Quem for banido só volta quando a praça fechar.</p>
    </section>

    <section><h2>Aviso para todos</h2>
      <textarea id="aviso" maxlength="160" placeholder="Ex.: A assembleia começa agora!"></textarea>
      <div class="row" style="margin-top:8px"><button class="red" id="avisoEnviar">Mostrar aviso</button><button class="ghost" id="avisoTirar">Tirar aviso</button><span class="muted" id="avisoAgora"></span></div>
    </section>

    <section><h2>Pessoas na praça <span class="muted" id="nPessoas"></span></h2>
      <div class="list" id="pessoas"></div>
      <div id="bansBox" hidden><label>Banidos até a praça fechar</label><div class="list" id="bans"></div></div>
    </section>

    <section><h2>Mural</h2>
      <div class="sw"><span>Mural só para leitura<small>Ninguém escreve; o que lá está continua visível.</small></span><button id="muralRO" class="sm"></button></div>
      <div class="list" id="mural" style="margin-top:8px"></div>
    </section>

    <section><h2>DJ p.45</h2>
      <div class="seg" id="djSeg"><button data-dj="auto">Automático</button><button data-dj="sempre">Sempre</button><button data-dj="off">Desligado</button></div>
      <p class="muted" style="margin:8px 0 0" id="djTxt"></p>
    </section>

    <section><h2>Personagens</h2>
      <div class="sw"><span>Jornalista Laranja<small>Entrevista quem lhe tocar; a resposta passa em direto para toda a praça.</small></span><button data-npc="jornalista" class="sm"></button></div>
      <div class="sw"><span>Curiosos<small>Perguntam o que se passa; quem for convencido junta-se com um cartaz.</small></span><button data-npc="curiosos" class="sm"></button></div>
      <div class="sw"><span>Fotógrafa<small>Tira fotos de grupo para partilhar.</small></span><button data-npc="fotografa" class="sm"></button></div>
      <div class="sw"><span>Cantina<small>Sopa, café e pão.</small></span><button data-npc="cantina" class="sm"></button></div>
      <div class="sw"><span>Carro da tenda<small>Passa de vez em quando na rua, a buzinar, com uma tenda no tejadilho.</small></span><button data-npc="carro" class="sm"></button></div>
      <div class="sw"><span>Bicicletada<small>Um grupo de ciclistas passa na rua com o megafone.</small></span><button data-npc="bicicletada" class="sm"></button></div>
      <div class="sw"><span>Labrador<small>Brinca com a bola, aceita festas e de vez em quando rouba o microfone à jornalista.</small></span><button data-npc="cao" class="sm"></button></div>
      <p class="muted" style="margin:8px 0 0" id="convencidos"></p>
    </section>

    <section><h2>Clima</h2>
      <div class="sw"><span>Chuva de bananas automática<small>De vez em quando (25 a 50 minutos) chovem bananas na praça, com o alerta «O Sr. Banana, Ministro da Administração Interna, ordenou uma chuva de bananas!».</small></span><button id="climaAuto" class="sm"></button></div>
      <div class="row" style="margin-top:8px"><button class="red" id="bananas">🍌 Chuva de bananas agora</button><span class="muted" id="climaTxt"></span></div>
    </section>

    <section><h2>Em direto <span class="muted">últimas respostas</span></h2>
      <div class="list" id="diretos"></div>
    </section>

    <section><h2>Cartazes no cravo <span class="muted" id="nCartazes"></span></h2>
      <div class="list" id="cartazes"></div>
    </section>

    <section><h2>Na praça</h2>
      <div class="sw"><span>Bicicletas<small>Quem entra pode andar de bicicleta (25% mais rápido). Desligar põe toda a gente a pé.</small></span><button id="ciclistas" class="sm"></button></div>
      <div class="sw"><span>Polícia (em breve)<small>Ainda não existe na praça: o interruptor fica guardado para quando existir.</small></span><button id="policia" class="sm"></button></div>
    </section>

    <section><h2>Próximas aberturas</h2>
      <div class="list" id="agenda"></div>
      <label>Agendar uma abertura</label>
      <input id="agTitulo" maxlength="60" placeholder="Título (ex.: Concentração)">
      <div class="grid3"><div><label for="agData">Dia</label><input id="agData" type="date"></div><div><label for="agIni">Abre</label><input id="agIni" type="time" value="18:30"></div><div><label for="agFim">Fecha</label><input id="agFim" type="time" value="22:00"></div></div>
      <label for="agOnde">Onde (opcional)</label><input id="agOnde" maxlength="80" placeholder="Ex.: Rossio">
      <div class="row" style="margin-top:10px"><button class="red" id="agendar">Agendar</button></div>
      <p class="muted" style="margin:8px 0 0">As manifestações e a assembleia diária vêm do ficheiro manifestacoes.json do jogo; aqui só se apagam as aberturas agendadas nesta página.</p>
    </section>
  </div>
</main>
<div class="toast" id="toast" hidden></div>
<script>
(() => {
const $ = id => document.getElementById(id);
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} } };
let frase = store.get('praca-gestao') || sessionStorage.getItem('praca-gestao') || '', S = null, timer = 0;
const fmt = (t, o) => new Intl.DateTimeFormat('pt-PT', { timeZone: 'Europe/Lisbon', ...o }).format(new Date(t));
const hm = t => fmt(t, { hour: '2-digit', minute: '2-digit' });
const dia = t => fmt(t, { weekday: 'short', day: 'numeric', month: 'short' });
const AURA = { Faro: '#7fd6ff', Coimbra: '#ff8a2a', Braga: '#3ec46d', Lisboa: '#e2283b', Porto: '#2f5bff' };
function toast(t, err) { const el = $('toast'); el.textContent = t; el.className = 'toast' + (err ? ' err' : ''); el.hidden = false; clearTimeout(el._t); el._t = setTimeout(() => el.hidden = true, 3500); }
async function api(acao, extra = {}, quiet) {
  let r, j = {};
  try { r = await fetch('/gestao/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ frase, acao, ...extra }) }); j = await r.json(); }
  catch (e) { if (!quiet) toast('Sem ligação ao servidor', true); return null; }
  if (r.status === 401) { frase = ''; store.set('praca-gestao', null); sessionStorage.removeItem('praca-gestao'); showLogin(j.erro); return null; }
  if (!r.ok) { toast(j.erro || 'Erro', true); return null; }
  S = j; render(); return j;
}
function showLogin(err) { $('app').hidden = true; $('login').hidden = false; clearInterval(timer); if (err) toast(err, true); $('frase').focus(); }
$('loginForm').addEventListener('submit', async e => {
  e.preventDefault(); frase = $('frase').value;
  if (await api('estado')) { if ($('lembrar').checked) store.set('praca-gestao', frase); else sessionStorage.setItem('praca-gestao', frase); $('frase').value = ''; start(); }
});
$('sair').addEventListener('click', () => { frase = ''; store.set('praca-gestao', null); sessionStorage.removeItem('praca-gestao'); showLogin(); });
function start() { $('login').hidden = true; $('app').hidden = false; clearInterval(timer); timer = setInterval(() => { if (!document.hidden) api('estado', {}, true); }, 10000); }

const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
function item(title, sub, btns, off) {
  const d = el('div', 'item' + (off ? ' off' : '')), t = el('div', 't');
  if (typeof title === 'string') t.append(el('b', '', title)); else t.append(title);
  if (sub) t.append(el('small', '', sub));
  d.append(t); const r = el('div', 'row'); r.style.flexWrap = 'nowrap'; for (const b of btns || []) r.append(b); d.append(r); return d;
}
function btn(txt, cls, fn, confirmTxt) {
  const b = el('button', 'sm ' + (cls || ''), txt);
  b.addEventListener('click', () => {
    if (confirmTxt && !b.dataset.armed) { b.dataset.armed = '1'; b.textContent = confirmTxt; setTimeout(() => { b.dataset.armed = ''; b.textContent = txt; }, 4000); return; }
    b.disabled = true; fn();
  });
  return b;
}
function sw(id, on) { const b = $(id); b.textContent = on ? 'Ligado' : 'Desligado'; b.className = 'sm ' + (on ? 'green' : 'ghost'); }

function render() {
  if (!S) return;
  const st = S.estado, c = S.cfg, f = c.force;
  $('badge').textContent = st.open ? 'Aberta' : 'Fechada'; $('badge').className = 'badge' + (st.open ? ' on' : '');
  const lines = [];
  if (st.open) {
    for (const w of st.live) lines.push((w.city ? w.city + ': ' : '') + w.title + (w.where ? ' · ' + w.where : ''));
    lines.push(st.close ? 'Fecha às ' + hm(st.close) + (new Date(st.close).toDateString() !== new Date().toDateString() ? ' de ' + dia(st.close) : '') + '.' : 'Aberta até a organização fechar.');
  } else lines.push(st.next ? 'Próxima abertura: ' + dia(st.next.open) + ', ' + hm(st.next.open) + ' (' + st.next.title + ').' : 'Nada marcado.');
  if (f) lines.push(f.mode === 'aberta' ? 'Aberta pela organização' + (f.until ? ' até às ' + hm(f.until) : '') + '.' : 'Fechada pela organização até às ' + hm(f.until) + '.');
  const n = Object.values(S.counts.praca).reduce((a, b) => a + b, 0), m = Object.values(S.counts.apoio).reduce((a, b) => a + b, 0);
  lines.push(n + ' na praça, ' + m + ' de longe.');
  $('estadoTxt').innerHTML = ''; for (const l of lines) $('estadoTxt').append(el('div', '', l));
  $('horario').disabled = !f;

  $('avisoAgora').textContent = c.aviso ? 'Agora: «' + c.aviso + '»' : 'Sem aviso.';
  $('avisoTirar').disabled = !c.aviso;

  $('nPessoas').textContent = S.people.length;
  const pl = $('pessoas'); pl.innerHTML = '';
  if (!S.people.length) pl.append(el('div', 'muted', 'Ninguém na praça.'));
  for (const p of S.people.slice().sort((a, b) => a.name.localeCompare(b.name))) {
    const t = el('span'); const d = el('i', 'dot'); d.style.background = AURA[p.city] || '#fff'; t.append(d, el('b', '', p.name));
    pl.append(item(t, p.city + ' · ' + (p.mode === 'praca' ? 'boneco' : 'apoio de longe') + (p.dev ? '' : ' · (só sai, pode voltar)'), [btn('Banir', 'red', () => api('banir', { id: p.id }).then(r => r && toast(p.name + ' saiu da praça')), 'Confirmar')]));
  }
  $('bansBox').hidden = !S.bans.length; const bl = $('bans'); bl.innerHTML = '';
  for (const b of S.bans) bl.append(item(b.name || '—', 'até às ' + hm(b.until), [btn('Levantar', 'ghost', () => api('desbanir', { dev: b.dev }))]));

  sw('muralRO', c.muralRO);
  const ml = $('mural'); ml.innerHTML = '';
  if (!S.mural.length) ml.append(el('div', 'muted', 'O mural está vazio.'));
  for (const x of S.mural) {
    const t = el('span'); const d = el('i', 'dot'); d.style.background = AURA[x.city] || '#fff'; t.append(d, el('b', '', x.name + ' · ' + x.city + ' · ' + hm(x.at)), el('div', '', x.text));
    const sub = x.hidden === 1 ? 'Escondida por denúncias' : x.hidden === 2 ? 'Apagada pela organização' : '';
    ml.append(item(t, sub, [x.hidden ? btn('Repor', 'green', () => api('repor', { id: x.id })) : btn('Apagar', 'red', () => api('apagar', { id: x.id }), 'Confirmar')], !!x.hidden));
  }

  for (const b of $('djSeg').children) b.classList.toggle('on', b.dataset.dj === c.dj);
  $('djTxt').textContent = { auto: 'Aparece 3 minutos em cada 10, e pára quando começa a assembleia (19:00).', sempre: 'Está sempre na praça, mesmo durante a assembleia.', off: 'Não aparece.' }[c.dj] + (S.dj.on ? ' Agora: na praça.' : ' Agora: fora da praça.');
  sw('policia', c.policia); sw('ciclistas', c.ciclistas); sw('climaAuto', c.climaAuto);
  $('climaTxt').textContent = S.clima ? 'A chover agora!' : c.climaAuto ? 'Próxima por volta das ' + hm(S.nextClima) + ' (se houver gente na praça).' : 'Só quando carregares no botão.';
  for (const b of document.querySelectorAll('[data-npc]')) { const on = S.npcs[b.dataset.npc] !== false; b.textContent = on ? 'Ligado' : 'Desligado'; b.className = 'sm ' + (on ? 'green' : 'ghost'); }
  $('convencidos').textContent = 'Curiosos convencidos hoje: ' + S.convencidos + '.';
  const dl = $('diretos'); dl.innerHTML = '';
  if (!S.diretos.length) dl.append(el('div', 'muted', 'Ainda ninguém foi entrevistado.'));
  for (const d of S.diretos) dl.append(item(d.n + ' · ' + d.c + ' · ' + hm(d.at), d.text != null ? '«' + d.text + '» (escrita pela pessoa)' : 'Resposta pronta n.º ' + (d.a + 1) + ' à pergunta ' + (d.q + 1), d.text != null ? [btn('Apagar', 'red', () => api('apagar-direto', { id: d.id }), 'Confirmar')] : []));
  $('nCartazes').textContent = S.cartazes.length + (S.cartazes.length === 1 ? ' cartaz' : ' cartazes');
  const cl = $('cartazes'); cl.innerHTML = '';
  if (!S.cartazes.length) cl.append(el('div', 'muted', 'O cravo não tem cartazes.'));
  for (const x of S.cartazes) cl.append(item('«' + x.text + '»', x.name + ' · ' + x.city, [btn('Tirar', 'red', () => api('tirar-cartaz', { id: x.id }), 'Confirmar')]));

  const al = $('agenda'); al.innerHTML = '';
  const all = [...S.horario.map(w => ({ ...w, fixo: true })), ...S.agenda.map(a => ({ ...a, fixo: false }))].sort((a, b) => a.open - b.open).slice(0, 12);
  if (!all.length) al.append(el('div', 'muted', 'Nada marcado.'));
  for (const w of all) al.append(item((w.city ? w.city + ': ' : '') + w.title, dia(w.open) + ', ' + hm(w.open) + '–' + hm(w.close) + (w.where ? ' · ' + w.where : '') + (w.fixo ? ' · do ficheiro' : ''), w.fixo ? [] : [btn('Apagar', 'red', () => api('desagendar', { id: w.id }), 'Confirmar')]));
}

for (const b of document.querySelectorAll('[data-abrir]')) b.addEventListener('click', () => api('abrir', { horas: +b.dataset.abrir, titulo: $('tituloAbrir').value }).then(r => r && toast('Praça aberta')));
$('fechar').addEventListener('click', function () { if (!this.dataset.armed) { this.dataset.armed = '1'; this.textContent = 'Confirmar: fechar'; setTimeout(() => { this.dataset.armed = ''; this.textContent = 'Fechar agora'; }, 4000); return; } this.dataset.armed = ''; this.textContent = 'Fechar agora'; api('fechar').then(r => r && toast('Praça fechada')); });
$('horario').addEventListener('click', () => api('horario').then(r => r && toast('A seguir o horário')));
$('avisoEnviar').addEventListener('click', () => { const t = $('aviso').value.trim(); if (!t) return; api('aviso', { texto: t }).then(r => r && (toast('Aviso na praça'), $('aviso').value = '')); });
$('avisoTirar').addEventListener('click', () => api('aviso', { texto: '' }));
$('muralRO').addEventListener('click', () => api('config', { muralRO: !S.cfg.muralRO }));
$('policia').addEventListener('click', () => api('config', { policia: !S.cfg.policia }));
$('ciclistas').addEventListener('click', () => api('config', { ciclistas: !S.cfg.ciclistas }));
$('climaAuto').addEventListener('click', () => api('config', { climaAuto: !S.cfg.climaAuto }));
$('bananas').addEventListener('click', () => api('clima').then(r => r && toast('Bananas a cair na praça!')));
for (const b of document.querySelectorAll('[data-npc]')) b.addEventListener('click', () => api('config', { npcs: { [b.dataset.npc]: S.npcs[b.dataset.npc] === false } }));
for (const b of $('djSeg').children) b.addEventListener('click', () => api('config', { dj: b.dataset.dj }));
$('agData').value = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(new Date());
$('agendar').addEventListener('click', () => api('agendar', { titulo: $('agTitulo').value, data: $('agData').value, inicio: $('agIni').value, fim: $('agFim').value, onde: $('agOnde').value }).then(r => r && (toast('Abertura agendada'), $('agTitulo').value = '', $('agOnde').value = '')));

if (frase) api('estado').then(r => { if (r) start(); }); else showLogin();
})();
</script>
</body>
</html>`;

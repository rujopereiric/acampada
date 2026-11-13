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
.tabs{ position:sticky; top:0; z-index:5; display:flex; gap:0; margin:12px -14px 0; padding:8px 14px; background:var(--ink); overflow-x:auto; scrollbar-width:none; border-bottom:2px solid var(--paper); }
.tabs::-webkit-scrollbar{ display:none; }
.tabs button{ flex:none; background:transparent; color:var(--paper); border-color:transparent; padding:9px 11px 8px; white-space:nowrap; }
.tabs button.on{ background:var(--paper); color:var(--ink); border-color:var(--paper); }
.tabs i{ font-style:normal; display:inline-block; min-width:18px; padding:2px 4px 1px; margin-left:3px; background:var(--redbox); color:#fff; font-size:11px; line-height:1.1; } .tabs i:empty{ display:none; }
section[hidden]{ display:none; }
h3.sub{ margin:12px 0 6px; font:800 12px/1 Jost, sans-serif; text-transform:uppercase; letter-spacing:.8px; color:var(--muted); } h3.sub:first-of-type{ margin-top:0; }
.kpis{ display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:6px; }
.kpi{ background:var(--paper); color:var(--ink); padding:8px 9px 7px; } .kpi b{ display:block; font:800 24px/1 Jost, sans-serif; } .kpi small{ display:block; font-size:12px; color:#5b554f; margin-top:3px; }
.toast[hidden]{ display:none; }
.sug .t{ flex:1; } .sug .txt{ white-space:pre-wrap; margin:4px 0 2px; font-family:"Helvetica Neue", Arial, sans-serif; font-weight:500; }
.sug .tipo{ display:inline-block; font:800 11px/1 Jost, sans-serif; text-transform:uppercase; letter-spacing:.6px; padding:3px 5px 2px; margin-right:6px; background:var(--ink); color:var(--paper); }
.sug .tipo.erro{ background:var(--redbox); } .sug .tipo.ideia{ background:var(--green); color:var(--ink); }
.sug .row{ flex-direction:column; align-items:stretch; }
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
    <nav class="tabs" id="tabs" role="tablist"><button data-t="praca" role="tab">Praça</button><button data-t="numeros" role="tab">Números</button><button data-t="conteudo" role="tab">Mural e cartazes</button><button data-t="animacao" role="tab">Animação</button><button data-t="protecao" role="tab">Proteção <i id="tabProt"></i></button><button data-t="sugestoes" role="tab">Sugestões <i id="tabSug"></i></button></nav>

    <section data-tab="praca"><h2>Estado <span id="badge" class="badge"></span></h2>
      <div id="estadoTxt"></div>
      <label for="tituloAbrir">Título (opcional)</label><input id="tituloAbrir" maxlength="60" placeholder="Praça aberta">
      <div class="row" style="margin-top:8px"><span class="muted" style="margin-right:4px">Abrir agora:</span><button class="green" data-abrir="1">1 h</button><button class="green" data-abrir="2">2 h</button><button class="green" data-abrir="3">3 h</button><button class="green" data-abrir="0">Até fechar</button></div>
      <div class="row"><button class="red" id="fechar">Fechar agora</button><button class="ghost" id="horario">Voltar ao horário</button></div>
      <p class="muted" style="margin:8px 0 0">«Fechar agora» fecha até ao fim do que estiver marcado; a próxima abertura do horário acontece normalmente. Quem for banido só volta quando a praça fechar.</p>
    </section>

    <section data-tab="numeros"><h2>Números</h2>
      <h3 class="sub">O site · acampadapixel.pt</h3>
      <div class="kpis" id="siteKpis"></div>
      <p class="muted" id="siteNota" style="margin:6px 0 0"></p>
      <h3 class="sub">A praça</h3>
      <div class="kpis" id="pracaKpis"></div>
      <div class="list" id="dias" style="margin-top:8px"></div>
      <p class="muted" style="margin:8px 0 0">Entradas: quem pôs o nome e entrou (a mesma pessoa a voltar em menos de 15 minutos conta uma vez). Pessoas: aparelhos diferentes, contados por um código do navegador; nada de nomes nem endereços. Pico: o máximo ao mesmo tempo, na praça e de longe. Só conta desde que esta versão do servidor foi publicada.</p>
    </section>

    <section data-tab="praca"><h2>Aviso para todos</h2>
      <textarea id="aviso" maxlength="160" placeholder="Ex.: A assembleia começa agora!"></textarea>
      <div class="row" style="margin-top:8px"><button class="red" id="avisoEnviar">Mostrar aviso</button><button class="ghost" id="avisoTirar">Tirar aviso</button><span class="muted" id="avisoAgora"></span></div>
    </section>

    <section data-tab="praca"><h2>Pessoas na praça <span class="muted" id="nPessoas"></span></h2>
      <div class="list" id="pessoas"></div>
      <div id="bansBox" hidden><label>Banidos até a praça fechar</label><div class="list" id="bans"></div></div>
    </section>

    <section data-tab="protecao"><h2>Proteção <span class="muted" id="nCastigos"></span></h2>
      <p class="muted" style="margin:0 0 8px">Redes castigadas por 10 minutos: mandaram pedidos ou mensagens a mais, ou pintaram mais depressa do que uma mão consegue. Ninguém é identificado: cada rede é só um código que muda todos os dias. Perdoar aqui pode demorar uns minutos a chegar a todos os servidores da Cloudflare.</p>
      <div class="list" id="castigos"></div>
      <div class="row" style="margin-top:8px"><button class="ghost" id="perdoarTodos">Perdoar todos</button></div>
    </section>

    <section data-tab="sugestoes"><h2>Sugestões <span class="muted" id="nSug"></span></h2>
      <p class="muted" style="margin:0 0 8px">Enviadas no ecrã inicial do jogo (botão «Sugestões»). O contacto é opcional e só serve para responder a quem o deixou. Não se guardam endereços IP. Ficam no máximo as 1000 mais recentes.</p>
      <div class="seg" id="sugSeg"><button data-f="novas">Por ler</button><button data-f="todas">Todas</button></div>
      <div class="row" style="margin-top:8px"><button class="green" id="sugExport">Exportar .md</button><button class="ghost" id="sugTodasLidas">Marcar todas como lidas</button><button class="red" id="sugApagarLidas">Apagar as lidas</button></div>
      <div class="list" id="sugList" style="margin-top:8px;max-height:none"></div>
    </section>

    <section data-tab="protecao"><h2>Recordes do jogo</h2>
      <p class="muted" style="margin:0 0 8px">Os melhores de todos os jogadores, praça a praça. Se um recorde for impossível (alguém a fazer batota), apaga-o: o próximo jogo a sério volta a pô-lo.</p>
      <div class="list" id="recordes"></div>
    </section>

    <section data-tab="conteudo"><h2>Mural</h2>
      <div class="sw"><span>Mural só para leitura<small>Ninguém escreve; o que lá está continua visível.</small></span><button id="muralRO" class="sm"></button></div>
      <div class="list" id="mural" style="margin-top:8px"></div>
      <div id="muralAll" style="margin-top:10px"></div>
    </section>

    <section data-tab="animacao"><h2>DJ p.45</h2>
      <div class="seg" id="djSeg"><button data-dj="auto">Automático</button><button data-dj="sempre">Sempre</button><button data-dj="off">Desligado</button></div>
      <p class="muted" style="margin:8px 0 0" id="djTxt"></p>
    </section>

    <section data-tab="animacao"><h2>Personagens</h2>
      <div class="sw"><span>Jornalista Laranja<small>Entrevista quem lhe tocar; a resposta passa em direto para toda a praça.</small></span><button data-npc="jornalista" class="sm"></button></div>
      <div class="sw"><span>Curiosos<small>Perguntam o que se passa; quem for convencido junta-se com um cartaz.</small></span><button data-npc="curiosos" class="sm"></button></div>
      <div class="sw"><span>Fotógrafa<small>Tira fotos de grupo para partilhar.</small></span><button data-npc="fotografa" class="sm"></button></div>
      <div class="sw"><span>Cantina<small>Sopa, café e pão.</small></span><button data-npc="cantina" class="sm"></button></div>
      <div class="sw"><span>Carro da tenda<small>Passa de vez em quando na rua, a buzinar, com uma tenda no tejadilho.</small></span><button data-npc="carro" class="sm"></button></div>
      <div class="sw"><span>Bicicletada<small>Um grupo de ciclistas passa na rua com o megafone.</small></span><button data-npc="bicicletada" class="sm"></button></div>
      <div class="sw"><span>Homem-tenda<small>De vez em quando passa a correr na rua alguém vestido com uma tenda montada.</small></span><button data-npc="homemtenda" class="sm"></button></div>
      <div class="sw"><span>Zezinho Bailarino<small>Um manifestante como outro qualquer: anda pela praça a filmar com o telemóvel.</small></span><button data-npc="zezinho" class="sm"></button></div>
      <div class="sw"><span>Labrador<small>Brinca com a bola, aceita festas e de vez em quando rouba o microfone à jornalista.</small></span><button data-npc="cao" class="sm"></button></div>
      <div class="sw"><span>Há um bufo na praça<small>Acampados que vêm e vão; de vez em quando um deles é um polícia à paizana ou um infiltrado, e a praça vota para o desmascarar.</small></span><button data-npc="bufos" class="sm"></button></div>
      <p class="muted" style="margin:8px 0 0" id="convencidos"></p>
    </section>

    <section data-tab="animacao"><h2>Clima</h2>
      <div class="sw"><span>Chuva de bananas automática<small>De vez em quando (25 a 50 minutos) chovem bananas na praça, com o alerta «O Sr. Banana, Ministro da Administração Interna, ordenou uma chuva de bananas!».</small></span><button id="climaAuto" class="sm"></button></div>
      <div class="row" style="margin-top:8px"><button class="red" id="bananas">🍌 Chuva de bananas agora</button><span class="muted" id="climaTxt"></span></div>
    </section>

    <section data-tab="conteudo"><h2>Em direto <span class="muted">últimas respostas</span></h2>
      <div class="list" id="diretos"></div>
    </section>

    <section data-tab="conteudo"><h2>Cartazes no cravo <span class="muted" id="nCartazes"></span></h2>
      <div class="list" id="cartazes"></div>
    </section>

    <section data-tab="conteudo"><h2>Parede do prédio abandonado <span class="muted" id="nParede"></span></h2>
      <p class="muted" style="margin:0 0 8px">Toda a gente pinta ao mesmo tempo. A parede fica de uma abertura para a seguinte; quando a praça fecha, guarda-se uma cópia na galeria. Toca num quadrado da imagem para apagar esse bloco (8 x 8).</p>
 <div class="sw" style="margin-bottom:8px"><span>Parede só de leitura<small>Ninguém pinta; a parede continua à vista.</small></span><button id="paredeRO" class="sm"></button></div>
      <canvas id="paredeCv" width="384" height="256" style="width:100%;max-width:480px;image-rendering:pixelated;border:2px solid #5a5650;cursor:pointer;display:block"></canvas>
      <div class="row" style="margin-top:8px" id="paredeBtns"></div>
      <h3 style="margin:14px 0 6px;font-size:14px">Zonas denunciadas</h3><div class="list" id="paredeRep"></div>
      <h3 style="margin:14px 0 6px;font-size:14px">Galeria</h3><div class="list" id="paredeGal"></div>
    </section>

    <section data-tab="animacao"><h2>Na praça</h2>
      <div class="sw"><span>Bicicletas<small>Quem entra pode andar de bicicleta (25% mais rápido). Desligar põe toda a gente a pé.</small></span><button id="ciclistas" class="sm"></button></div>
      <div class="sw"><span>Polícia (em breve)<small>Ainda não existe na praça: o interruptor fica guardado para quando existir.</small></span><button id="policia" class="sm"></button></div>
    </section>

    <section data-tab="praca"><h2>Próximas aberturas</h2>
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
let frase = store.get('praca-gestao') || sessionStorage.getItem('praca-gestao') || '', S = null, timer = 0, SUG = null, sugF = 'novas', sugN = -1;
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
  if (j.sug) SUG = j.sug; S = j; render(); return j;
}
function showLogin(err) { $('app').hidden = true; $('login').hidden = false; clearInterval(timer); if (err) toast(err, true); $('frase').focus(); }
$('loginForm').addEventListener('submit', async e => {
  e.preventDefault(); frase = $('frase').value;
  if (await api('estado')) { if ($('lembrar').checked) store.set('praca-gestao', frase); else sessionStorage.setItem('praca-gestao', frase); $('frase').value = ''; start(); }
});
$('sair').addEventListener('click', () => { frase = ''; store.set('praca-gestao', null); sessionStorage.removeItem('praca-gestao'); showLogin(); });
let tab = store.get('praca-gestao-tab') || 'praca';
function showTab(t) { tab = t; store.set('praca-gestao-tab', t); if (t === 'sugestoes' && frase && S) api('sugestoes', {}, true);
  for (const b of document.querySelectorAll('#tabs button')) { const on = b.dataset.t === t; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); }
  for (const s of document.querySelectorAll('section[data-tab]')) s.hidden = s.dataset.tab !== t; scrollTo(0, 0); }
$('tabs').addEventListener('click', e => { const b = e.target.closest('button[data-t]'); if (b) showTab(b.dataset.t); });
if (!document.querySelector('#tabs [data-t="' + tab + '"]')) tab = 'praca'; showTab(tab);
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

var PIX = ['#0b0a0a', '#f4f1ea', '#e2283b', '#ff7a80', '#ff8a2a', '#ffd23a', '#c6ff4a', '#3ec46d', '#1f7a45', '#2ad1c9', '#2f8fff', '#1b1464', '#9a6bff', '#ff7ad9', '#8a5a3a', '#9aa0ad'], PW = 48, PH = 32, PB = 8, selBloco = -1;
var GRID = { p: [12, 12], m: [16, 12], g: [16, 14], f: [24, 8] };
function paintPx(cv, d, w, h, bg) { var g = cv.getContext('2d'), s = cv.width / w; for (var i = 0; i < w * h; i++) { var x = i % w, y = Math.floor(i / w), ch = d[i]; g.fillStyle = ch && ch !== '-' ? PIX[parseInt(ch, 16)] : (bg || ((x + y) % 2 ? '#7f7a74' : '#89847d')); g.fillRect(x * s, y * s, s, s); } }
function blocoTxt(b) { var bx = b % (PW / PB), by = Math.floor(b / (PW / PB)); return 'Bloco ' + (bx + 1) + ',' + (by + 1); }
const num = n => new Intl.NumberFormat('pt-PT').format(n || 0);
function kpi(v, t) { const d = el('div', 'kpi'); d.append(el('b', '', v), el('small', '', t)); return d; }
function renderNumeros() {
  const si = S.site || {}, sk = $('siteKpis'), sn = $('siteNota'); sk.innerHTML = '';
  if (si.falta) sn.textContent = 'Para ver os visitantes do site, falta pôr na Cloudflare o CF_TOKEN e o CF_ZONE do servidor da praça.';
  else if (si.aCarregar) sn.textContent = 'A perguntar à Cloudflare…';
  else if (si.erro) sn.textContent = 'A Cloudflare não respondeu: ' + si.erro;
  else {
    sk.append(kpi(num(si.u24), 'visitantes únicos · 24 h'), kpi(num(si.u30), 'visitantes únicos · 30 dias'), kpi(num(si.pv24), 'páginas vistas · 24 h'), kpi(num(si.pv30), 'páginas vistas · 30 dias'));
    sn.textContent = 'Números da Cloudflare para todo o domínio (inclui robôs e o servidor da praça), atualizados às ' + hm(si.at) + '.';
  }
  const st = S.stats || { dias: [] }, pk = $('pracaKpis'), dl = $('dias'); pk.innerHTML = ''; dl.innerHTML = '';
  const hoje = st.dias[0] && st.dias[0].day === fmt(S.now, { year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-') ? st.dias[0] : null;
  pk.append(kpi(num(hoje ? hoje.entradas : 0), 'entradas hoje'), kpi(num(hoje ? hoje.pessoas : 0), 'pessoas hoje'), kpi(num(hoje ? hoje.pico : 0), 'pico hoje' + (hoje && hoje.pico ? ' · ' + hm(hoje.pico_at) : '')),
    kpi(num(st.p7), 'pessoas · 7 dias'), kpi(num(st.p30), 'pessoas · 30 dias'), kpi(num(st.e30), 'entradas · 30 dias'));
  if (!st.dias.length) dl.append(el('div', 'muted', 'Ainda não há números: começam na próxima entrada.'));
  for (const d of st.dias) {
    const [y, mo, da] = d.day.split('-').map(Number), t = Date.UTC(y, mo - 1, da, 12);
    dl.append(item(dia(t), d.entradas + ' entradas (' + d.praca + ' na praça, ' + d.apoio + ' de longe) · ' + d.pessoas + ' pessoas · pico ' + d.pico + (d.pico ? ' às ' + hm(d.pico_at) : ''), []));
  }
}
// the suggestions: always shown as text (textContent), never as HTML
const SUG_TIPO = { ideia: 'Ideia', erro: 'Erro', outro: 'Outro' };
function renderSug() {
  const n = S.sugNovas || 0; $('tabSug').textContent = n ? n : ''; $('nSug').textContent = n ? n + ' por ler' : '';
  if (tab === 'sugestoes' && n !== sugN && sugN !== -1) { sugN = n; api('sugestoes', {}, true); return; } sugN = n;
  for (const b of $('sugSeg').children) b.classList.toggle('on', b.dataset.f === sugF);
  const all = SUG || [], list = sugF === 'novas' ? all.filter(x => !x.lida) : all, sl = $('sugList'); sl.innerHTML = '';
  $('sugExport').disabled = !all.length; $('sugTodasLidas').disabled = !all.some(x => !x.lida); $('sugApagarLidas').disabled = !all.some(x => x.lida);
  if (!SUG) { sl.append(el('div', 'muted', 'A carregar…')); return; }
  if (!list.length) sl.append(el('div', 'muted', sugF === 'novas' ? 'Nada por ler.' : 'Ainda não há sugestões.'));
  for (const x of list) {
    const d = el('div', 'item sug' + (x.lida ? ' off' : '')), t = el('div', 't'), h = el('div');
    h.append(el('span', 'tipo ' + x.tipo, SUG_TIPO[x.tipo] || x.tipo), el('b', '', dia(x.at) + ', ' + hm(x.at)));
    t.append(h, el('div', 'txt', x.texto));
    const quem = [x.nome, x.contacto].filter(Boolean).join(' · ');
    if (quem) t.append(el('small', '', 'De: ' + quem));
    t.append(el('small', '', [x.pagina, x.lingua === 'en' ? 'em inglês' : '', x.ecra ? 'ecrã ' + x.ecra : ''].filter(Boolean).join(' · ')));
    if (x.nav) t.append(el('small', '', x.nav));
    const r = el('div', 'row');
    r.append(btn(x.lida ? 'Por ler' : 'Lida', 'ghost', () => api('sug-lida', { id: x.id, lida: !x.lida })), btn('Apagar', 'red', () => api('sug-apagar', { id: x.id }), 'Confirmar'));
    d.append(t, r); sl.append(d);
  }
}
// the export: a Markdown file. What people wrote is escaped, so in a Markdown viewer it stays text: no links, images or
// HTML of theirs (an image could load from someone's server when the file is opened)
const BS = String.fromCharCode(92), MD_SPECIAL = BS + '\x60*_[]<>!|';
const mdEsc = v => Array.from(String(v || '')).map(ch => MD_SPECIAL.includes(ch) ? BS + ch : ch).join('');
function sugMd() {
  const all = (SUG || []).slice().reverse(), now = Date.now();
  const out = ['# Sugestões · Acampada Pixel', '', 'Exportado a ' + dia(now) + ', ' + hm(now) + ' · ' + all.length + ' sugestões (' + all.filter(x => !x.lida).length + ' por ler)', ''];
  for (const x of all) {
    out.push('## ' + (SUG_TIPO[x.tipo] || 'Outro') + ' · ' + dia(x.at) + ', ' + hm(x.at) + (x.lida ? '' : ' · por ler'), '');
    for (const ln of String(x.texto).split('\\n')) out.push('> ' + mdEsc(ln));
    out.push('');
    if (x.nome) out.push('- Nome: ' + mdEsc(x.nome));
    if (x.contacto) out.push('- Contacto: ' + mdEsc(x.contacto));
    const meta = [x.pagina, x.lingua, x.ecra].filter(Boolean).map(mdEsc).join(' · '); if (meta) out.push('- Onde: ' + meta);
    if (x.nav) out.push('- Navegador: ' + mdEsc(x.nav));
    out.push('');
  }
  return out.join('\\n');
}
function render() {
  if (!S) return;
  renderSug();
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
    const pb = [btn('Banir', 'red', () => api('banir', { id: p.id }).then(r => r && toast(p.name + ' saiu da praça')), 'Confirmar')];
    if (p.px) pb.unshift(btn('Apagar o que pintou (' + p.px + ')', 'ghost', () => api('apagar-pintor', { id: p.id }).then(r => r && toast('Apagado da parede')), 'Confirmar'));
    pl.append(item(t, p.city + ' · ' + (p.mode === 'praca' ? 'na praça' : 'fantasma, de longe') + (p.dev ? '' : ' · (só sai, pode voltar)'), pb));
  }
  const cs = S.castigos || [], csl = $('castigos'); csl.innerHTML = ''; $('tabProt').textContent = cs.length ? cs.length : ''; $('nCastigos').textContent = cs.length ? cs.length : ''; $('perdoarTodos').disabled = !cs.length;
  if (!cs.length) csl.append(el('div', 'muted', 'Nenhuma rede castigada.'));
  const MOTIVO = { pedidos: 'pedidos a mais', mensagens: 'mensagens a mais', grandes: 'mensagens gigantes', parede: 'pintura a mais' };
  for (const x of cs) csl.append(item('Rede ' + x.k.slice(0, 6), (MOTIVO[x.why] || x.why) + ' · até às ' + hm(x.until), [btn('Perdoar', 'ghost', () => api('perdoar', { k: x.k }))]));
  renderNumeros();
  const REC = { tents: 'Tendas (máx.)', welcomed: 'Pessoas acolhidas', days: 'Dias até ganhar' }, rl0 = $('recordes'); rl0.innerHTML = '';
  const recs = S.recordes || {}; let nrec = 0;
  for (const city of ['Porto', 'Lisboa', 'Coimbra', 'Braga', 'Faro']) for (const k of ['tents', 'welcomed', 'days']) {
    const v = (recs[city] || {})[k]; if (v == null) continue; nrec++;
    rl0.append(item(city + ' · ' + REC[k], String(v), [btn('Apagar', 'red', () => api('apagar-recorde', { city: city, k: k }).then(r => r && toast('Recorde apagado')), 'Confirmar')]));
  }
  if (!nrec) rl0.append(el('div', 'muted', 'Ainda não há recordes.'));
  $('bansBox').hidden = !S.bans.length; const bl = $('bans'); bl.innerHTML = '';
  for (const b of S.bans) bl.append(item(b.name || '—', 'até às ' + hm(b.until), [btn('Levantar', 'ghost', () => api('desbanir', { dev: b.dev }))]));

  sw('muralRO', c.muralRO); sw('paredeRO', c.paredeRO);
  const ml = $('mural'); ml.innerHTML = '';
  if (!S.mural.length) ml.append(el('div', 'muted', 'O mural está vazio.'));
  const ma = $('muralAll'); ma.innerHTML = ''; // everything at once: asks twice
  if (S.mural.some(x => !x.hidden)) ma.append(btn('Apagar o mural todo', 'red', () => api('apagar-mural'), 'Tens a certeza? Toca outra vez para apagar tudo'));
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
  for (const x of S.cartazes) {
    let ttl = '«' + x.text + '»';
    if (x.px) { const gr = GRID[x.fmt] || GRID.m, cv = document.createElement('canvas'); cv.width = gr[0] * 6; cv.height = gr[1] * 6; cv.style.cssText = 'width:' + gr[0] * 4 + 'px;image-rendering:pixelated;border:2px solid #0b0a0a;display:block'; paintPx(cv, x.px, gr[0], gr[1], '#f2efe6'); ttl = el('span'); ttl.append(cv); if (x.text) ttl.append(el('b', '', '«' + x.text + '»')); }
    cl.append(item(ttl, x.name + ' · ' + x.city + (x.px ? ' · desenho' : ''), [btn('Tirar', 'red', () => api('tirar-cartaz', { id: x.id }), 'Confirmar')]));
  }
  // the wall
  const pd = S.parede || '', painted = (pd.match(/[0-9a-f]/g) || []).length, pc = $('paredeCv');
  $('nParede').textContent = painted + ' de ' + PW * PH + ' quadrados pintados';
  paintPx(pc, pd, PW, PH); if (selBloco >= 0) { const g = pc.getContext('2d'), s = pc.width / PW, bx = selBloco % (PW / PB), by = Math.floor(selBloco / (PW / PB)); g.strokeStyle = '#c6ff4a'; g.lineWidth = 3; g.strokeRect(bx * PB * s + 1.5, by * PB * s + 1.5, PB * s - 3, PB * s - 3); }
  for (const r of S.paredeRep || []) { const g = pc.getContext('2d'), s = pc.width / PW, bx = r.b % (PW / PB), by = Math.floor(r.b / (PW / PB)); g.strokeStyle = '#ff3b5c'; g.lineWidth = 2; g.setLineDash([4, 3]); g.strokeRect(bx * PB * s + 1, by * PB * s + 1, PB * s - 2, PB * s - 2); g.setLineDash([]); }
  const pbx = $('paredeBtns'); pbx.innerHTML = '';
  if (selBloco >= 0) pbx.append(btn('Apagar ' + blocoTxt(selBloco), 'red', () => { const b = selBloco; selBloco = -1; api('apagar-bloco', { b: b }); }, 'Confirmar'), btn('Cancelar', 'ghost', () => { selBloco = -1; render(); }));
  if (painted) pbx.append(btn('Apagar a parede toda', 'red', () => api('apagar-parede'), 'Tens a certeza? Toca outra vez para apagar tudo'));
  const rl = $('paredeRep'); rl.innerHTML = '';
  if (!(S.paredeRep || []).length) rl.append(el('div', 'muted', 'Nenhuma zona denunciada.'));
  for (const r of S.paredeRep || []) rl.append(item(blocoTxt(r.b), r.n + (r.n === 1 ? ' denúncia' : ' denúncias') + ' · ' + hm(r.at), [btn('Apagar', 'red', () => api('apagar-bloco', { b: r.b }), 'Confirmar'), btn('Ignorar', 'ghost', () => api('ignorar-bloco', { b: r.b }))]));
  const gl = $('paredeGal'); gl.innerHTML = '';
  if (!(S.galeria || []).length) gl.append(el('div', 'muted', 'Ainda nada: a primeira cópia fica guardada quando a praça fechar.'));
  for (const r of S.galeria || []) gl.append(item(dia(r.at) + ', ' + hm(r.at), '', [btn('Repor esta parede', 'ghost', () => api('repor-parede', { id: r.id }), 'Confirmar: substitui a atual')]));

  const al = $('agenda'); al.innerHTML = '';
  const all = [...S.horario.map(w => ({ ...w, fixo: true })), ...S.agenda.map(a => ({ ...a, fixo: false }))].sort((a, b) => a.open - b.open).slice(0, 12);
  if (!all.length) al.append(el('div', 'muted', 'Nada marcado.'));
  for (const w of all) al.append(item((w.city ? w.city + ': ' : '') + w.title, dia(w.open) + ', ' + hm(w.open) + '–' + hm(w.close) + (w.where ? ' · ' + w.where : '') + (w.fixo ? ' · do ficheiro' : ''), w.fixo ? [] : [btn('Apagar', 'red', () => api('desagendar', { id: w.id }), 'Confirmar')]));
}

for (const b of document.querySelectorAll('[data-abrir]')) b.addEventListener('click', () => api('abrir', { horas: +b.dataset.abrir, titulo: $('tituloAbrir').value }).then(r => r && toast('Praça aberta')));
for (const b of $('sugSeg').children) b.addEventListener('click', () => { sugF = b.dataset.f; renderSug(); });
$('sugExport').addEventListener('click', () => { if (!SUG) return; const a = el('a'), url = URL.createObjectURL(new Blob([sugMd()], { type: 'text/markdown;charset=utf-8' }));
  a.href = url; a.download = 'sugestoes-acampada-' + new Date().toISOString().slice(0, 10) + '.md'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000); });
$('sugTodasLidas').addEventListener('click', () => api('sug-todas-lidas'));
$('sugApagarLidas').addEventListener('click', function () { if (!this.dataset.armed) { this.dataset.armed = '1'; this.textContent = 'Confirmar: apagar'; setTimeout(() => { this.dataset.armed = ''; this.textContent = 'Apagar as lidas'; }, 4000); return; } this.dataset.armed = ''; this.textContent = 'Apagar as lidas'; api('sug-apagar-lidas').then(r => r && toast('Sugestões lidas apagadas')); });
$('perdoarTodos').addEventListener('click', () => api('perdoar-todos').then(r => r && toast('Todas as redes perdoadas')));
$('fechar').addEventListener('click', function () { if (!this.dataset.armed) { this.dataset.armed = '1'; this.textContent = 'Confirmar: fechar'; setTimeout(() => { this.dataset.armed = ''; this.textContent = 'Fechar agora'; }, 4000); return; } this.dataset.armed = ''; this.textContent = 'Fechar agora'; api('fechar').then(r => r && toast('Praça fechada')); });
$('paredeCv').addEventListener('click', e => { const r = $('paredeCv').getBoundingClientRect(), x = Math.floor((e.clientX - r.left) / r.width * PW), y = Math.floor((e.clientY - r.top) / r.height * PH); selBloco = Math.floor(x / PB) + Math.floor(y / PB) * (PW / PB); render(); });
$('horario').addEventListener('click', () => api('horario').then(r => r && toast('A seguir o horário')));
$('avisoEnviar').addEventListener('click', () => { const t = $('aviso').value.trim(); if (!t) return; api('aviso', { texto: t }).then(r => r && (toast('Aviso na praça'), $('aviso').value = '')); });
$('avisoTirar').addEventListener('click', () => api('aviso', { texto: '' }));
$('muralRO').addEventListener('click', () => api('config', { muralRO: !S.cfg.muralRO }));
$('paredeRO').addEventListener('click', () => api('config', { paredeRO: !S.cfg.paredeRO }));
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

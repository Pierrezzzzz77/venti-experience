/* Venti Experience — Parte 0: o Lago da Prefeitura, ao fim da tarde (a primeira cena do jogo).
   História: lago → carro (abertura.js) → Faculdade Serra Dourada → rua → DataLab.

   FASE 1 — filme curto (~14 s, botão Pular; o jogador só assiste). Um único movimento de câmera:
     1. de cima: o lago e a Prefeitura enchem a tela, o céu do pôr do sol no alto; as nuvens se abrem
     2. a câmera desce e se aproxima, num movimento só, até a calçada da Av. São João
     3. o jogador aparece andando pela calçada e o jogo começa
   A câmera fica sempre dentro da parte construída da cidade (nunca mostra o mato nem as bordas).
   FASE 2 — jogável: andar pela calçada (WASD / setas) até o carro, perto da faixa de pedestre, e
     apertar E para entrar. Aí o jogo troca para a abertura, que continua com o carro já andando.

   Arquivos da parte 0 (nesta ordem no index.html):
     lago-cenario.js  mapa, piso e objetos       lago-cidade.js  a cidade em volta
     lago-ceu.js      céu, água, sombras e luz    lago-vida.js    pedestres, pássaros, patos, carros
     lago-som.js      vento, pássaros e água      lago.js         este: o filme e a parte jogável */
(function () {
  'use strict';
  const DL = window.DL, T = DL.T, K = DL.isoKit, Lg = DL.Lago, L = Lg.L;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = (k) => { k = clamp(k, 0, 1); return k * k * k * (k * (k * 6 - 15) + 10); }; // suave nas duas pontas
  const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };

  /* ------------------------------------------------------------------ */
  /* O roteiro do filme                                                  */
  /* ------------------------------------------------------------------ */
  // tempos (segundos) — mude aqui para alongar ou encurtar
  const TEMPO = { nuvens: [0.1, 1.5], parado: 3.8, desce: [3.8, 13.0], chega: [11.0, 14.0], fim: 14.6 };
  // onde o jogador fica quando o jogo começa: na calçada da Av. São João (inclinada, como na foto 13)
  const P0 = (() => { const [x, y] = L.AV.world(L.S_SPAWN, L.walkMid); return { x: x * T, y: y * T }; })();
  // a câmera: centro (pixels do mundo) e quanto do mundo cabe na largura da tela (V)
  //   plano de cima: o lago INTEIRO (com folga de 8% em cada lado) e a Prefeitura logo abaixo
  const FOLGA = 0.08, VIS = 0.86; // VIS: a parte da tela fora das faixas pretas de cinema (7vh em cima e embaixo)
  //   a vista do alto fica mais "de cima" (uns 50°): o chão é esticado na vertical (KY) e volta ao normal na descida
  const KY = 1.5;
  const isoBox = (pts) => {
    let X0 = 1e9, X1 = -1e9, Y0 = 1e9, Y1 = -1e9;
    for (const [x, y] of pts) { const X = (x - y) * T, Y = ((x + y) / 2) * T; X0 = Math.min(X0, X); X1 = Math.max(X1, X); Y0 = Math.min(Y0, Y); Y1 = Math.max(Y1, Y); }
    return { X0, X1, Y0, Y1 };
  };
  const LAGO_ISO = isoBox(L.lake), TUDO_ISO = isoBox(L.lake.concat(Lg.MAPA.PREF.site));
  let ALTO = null;
  function altoPara(sc) {
    const cw = sc.canvas.width, ch = sc.canvas.height;
    if (ALTO && ALTO.cw === cw && ALTO.ch === ch) return ALTO;
    // V que cabe uma caixa com folga (largura e altura visível, já com o chão esticado)
    const fit = (q) => Math.max((q.X1 - q.X0) / (1 - 2 * FOLGA), ((q.Y1 - q.Y0) / (1 - 2 * FOLGA)) * KY * cw / (ch * VIS));
    const Vlago = fit(LAGO_ISO), Vtudo = Math.max(Vlago, fit(TUDO_ISO));
    const X = (TUDO_ISO.X0 + TUDO_ISO.X1) / 2, L0 = LAGO_ISO;
    // o mais alto possível (até caber também a Prefeitura) sem mostrar a borda da cidade;
    // o alto do lago fica a 8% da borda de cima e o que sobra embaixo mostra a Prefeitura
    const at = (V) => {
      const visH = (V * ch * VIS) / cw / KY, Y = Math.max((L0.Y0 + L0.Y1) / 2, L0.Y0 - FOLGA * visH + visH / 2);
      return { x: Y + X / 2, y: Y - X / 2, V };
    };
    let c = null;
    for (let V = Vtudo; V >= Vlago * 0.999; V *= 0.98) { const t = at(V); if (viewOk(t.x, t.y, V, sc, KY)) { c = t; break; } }
    if (!c) { c = at(Vlago); for (let i = 0; i < 30 && !viewOk(c.x, c.y, c.V, sc, KY); i++) c = at(c.V * 0.95); }
    ALTO = Object.assign(c, { cw, ch });
    return ALTO;
  }
  // o quanto o chão está esticado (1 = a vista normal do jogo): só com a câmera alta, volta a 1 antes de ela descer
  function kyAt(S, sc) {
    const S0 = sc.canvas.width / altoPara(sc).V, A = Lg.AERIAL_MAX;
    return 1 + (KY - 1) * smooth(0, 1, (A - S) / Math.max(0.01, A - S0));
  }
  // de onde o jogador vem andando no fim (pela calçada, do oeste)
  const WALK_FROM = { x: P0.x - L.AV.DIR[0] * 8 * T, y: P0.y - L.AV.DIR[1] * 8 * T };

  const st = { t: 0, dusk: 0.15, phase: 'film', skipAt: null, caption: '', carT: 0, extraShadows: [] };
  Lg.state = st;

  // a cidade bem construída: nenhum canto da tela pode cair no mato, na terra solta ou fora da grade
  function okGround(x, y) {
    const M = Lg.MAPA, z = M.zona(x / T, y / T);
    return z !== 'campo' && x / T > M.RG.x0 + 20 && x / T < M.RG.x1 - 20 && y / T > M.RG.y0 + 20 && y / T < M.RG.y1 - 20;
  }
  function viewOk(cx, cy, V, sc, ky) {
    const cw = sc.canvas.width, ch = sc.canvas.height, hw = V / 2, hh = (V * ch) / cw / 2 / (ky || 1);
    const X = cx - cy, Y = (cx + cy) / 2;
    // os cantos e os meios das bordas da tela, no chão
    for (const [dx, dy] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]) {
      const XX = X + dx * hw, YY = Y + dy * hh;
      if (!okGround(YY + XX / 2, YY - XX / 2)) return false;
    }
    return true;
  }
  // prende a câmera: se algum canto sai da cidade, puxa o centro na direção do lago
  const LAGO = { x: 92 * T, y: 50 * T };
  function clampCam(c, sc) {
    if (viewOk(c.x, c.y, c.V, sc, c.ky)) return c;
    let a = 0, b = 1;
    for (let i = 0; i < 14; i++) { const m = (a + b) / 2; if (viewOk(lerp(c.x, LAGO.x, m), lerp(c.y, LAGO.y, m), c.V, sc, c.ky)) b = m; else a = m; }
    return { x: lerp(c.x, LAGO.x, b), y: lerp(c.y, LAGO.y, b), V: c.V, ky: c.ky };
  }
  function camAt(t, sc) {
    const Vgame = sc.canvas.width / Math.max(sc.o.minS || 2, sc.autoS);
    const END = { x: P0.x - 7, y: P0.y - 7.1, V: Vgame };
    // parado no alto (o lago inteiro, só um deslizar bem leve) e depois UM movimento suave até a calçada
    const ALTO = altoPara(sc);
    const drift = clamp(t / TEMPO.parado, 0, 1) * 0.03;
    const k = ease((t - TEMPO.desce[0]) / (TEMPO.desce[1] - TEMPO.desce[0]));
    const A = { x: lerp(ALTO.x, END.x, drift), y: lerp(ALTO.y, END.y, drift), V: ALTO.V * (1 - drift * 0.5) };
    // o zoom anda em escala logarítmica (parece uma descida constante)
    const c = { x: lerp(A.x, END.x, k), y: lerp(A.y, END.y, k), V: Math.exp(lerp(Math.log(A.V), Math.log(END.V), k)) };
    c.ky = kyAt(sc.canvas.width / c.V, sc);
    return clampCam(c, sc);
  }

  // o sol desce devagar: no fim do filme os primeiros postes começam a acender
  function duskAt(t) { return clamp(0.15 + t * 0.023, 0, 0.9); }

  /* ------------------------------------------------------------------ */
  /* Legendas                                                            */
  /* ------------------------------------------------------------------ */
  function caption(c) {
    const key = c ? c.join('|') : '';
    if (key === st.caption) return;
    st.caption = key;
    const el = $('cutCaption');
    el.classList.remove('is-on');
    if (!c) return;
    el.innerHTML = '<b>' + c[0] + '</b><span>' + c[1] + '</span>';
    void el.offsetWidth; // reinicia a animação
    el.classList.add('is-on');
  }
  function captionAt(t) {
    if (t < 1.2) return null;
    if (t < 5.5) return ['Lago da Prefeitura', 'Canaã dos Carajás · fim de tarde'];
    if (t < 10) return ['Av. São João', 'à beira do lago'];
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* Filme                                                               */
  /* ------------------------------------------------------------------ */
  function film(game, dt) {
    const sc = game.scene, p = game.player, t = st.t;
    const c = camAt(t, sc);
    sc.camFree = true;
    sc.S = sc.canvas.width / c.V;
    st.ky = c.ky;
    sc.cam.x = c.x;
    sc.cam.y = c.y;
    // plano 4: o jogador aparece andando pela calçada
    if (t >= TEMPO.chega[0]) {
      const k = clamp((t - TEMPO.chega[0]) / (TEMPO.chega[1] - TEMPO.chega[0] - 0.4), 0, 1);
      p.hidden = false;
      p.alpha = smooth(TEMPO.chega[0], TEMPO.chega[0] + 0.8, t);
      p.x = lerp(WALK_FROM.x, P0.x, k);
      p.y = lerp(WALK_FROM.y, P0.y, k);
      p.vx = p.vy = 0;
      p.dir = 'right';
      p.moving = k < 1;
      p.dist = k * 8 * T;
    } else p.hidden = true;
    // nada de faixa de céu por cima do mapa: só névoa quente no alto e o brilho do sol, que somem na descida
    st.band = 0;
    st.haze = 1 - smooth(TEMPO.desce[0] + 1, TEMPO.desce[0] + 6, t);
    caption(captionAt(t));
    if (t >= TEMPO.fim) startPlay(game);
  }

  let mastro = null, ALTA = null, SOMBRA = null;
  // sombras de nuvem no filme: [x, y (px do mundo, a partir do lago), largura]
  const NUVENS_SOMBRA = [[0, -500, 1500], [900, 500, 1900], [2100, -200, 1300], [3300, 800, 1700], [4500, -700, 2000], [5600, 300, 1400]];
  function fazSombra() { // uma mancha roxa de borda macia, pintada uma vez
    const c = DL.mk(192, 96), q = c.getContext('2d');
    for (const [x, y, r] of [[70, 50, 46], [112, 44, 44], [96, 56, 40], [140, 54, 34], [46, 54, 30]]) {
      const gr = q.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(36,22,58,0.55)'); gr.addColorStop(0.6, 'rgba(36,22,58,0.3)'); gr.addColorStop(1, 'rgba(36,22,58,0)');
      q.fillStyle = gr; q.fillRect(0, 0, 192, 96);
    }
    return c;
  }
  // o chão visto do alto é desenhado com o DOBRO da resolução numa tela escondida e depois reduzido
  // (já esticado na vertical) para a tela do jogo: cada pixel é a média de vários, sem borrão nem serrilhado
  const FINO = 2;
  // quem se mexe (carros, gente, cachorros, crianças), visto do alto: desenhado por cima da imagem pronta,
  // na mesma tela escondida — assim o mundo já está vivo desde o primeiro quadro do filme
  const LISTA = [];
  // o carro visto do alto: desenhado uma vez numa telinha (só refaz quando ele vira) e depois é só copiar
  function carroPronto(e) {
    const q = Math.round(e.ang / (Math.PI / 24));
    if (e._alto && e._altoQ === q) return e._alto;
    const c = e._alto || (e._alto = DL.mk(112, 80)), q2 = c.getContext('2d');
    e._altoQ = q;
    q2.setTransform(1, 0, 0, 1, 0, 0);
    q2.clearRect(0, 0, 112, 80);
    q2.setTransform(1, 0, 0, 1, 56, 54);
    q2.lineWidth = 1;
    q2.lineJoin = 'round';
    L.drawCarAt(q2, 0, 0, (q * Math.PI) / 24, e.col, e);
    return c;
  }
  function vivos(game, b, bs) {
    const V = Lg.vida && Lg.vida.V;
    if (!V) return;
    const S2 = bs.S, x0 = bs.ox / S2 - 40, x1 = (bs.ox + bs.canvas.width) / S2 + 40, y0 = bs.oy / S2 - 40, y1 = (bs.oy + bs.canvas.height) / S2 + 40;
    const dentro = (x, y) => { const X = x - y, Y = (x + y) / 2; return X > x0 && X < x1 && Y > y0 && Y < y1; };
    LISTA.length = 0;
    for (const e of V.cars) if (dentro(e.cx, e.cy)) LISTA.push([e.cx + e.cy, 0, e]);
    if (S2 >= 0.14) { // gente e bichos: só quando já dá para ver (de muito alto seriam menos de um pixel)
      for (const a of V.peds) if (!a.hidden && dentro(a.x, a.y)) LISTA.push([a.x + a.y, 1, a]);
      if (V.cross && dentro(V.cross.a.x, V.cross.a.y)) LISTA.push([V.cross.a.x + V.cross.a.y, 1, V.cross.a]);
      for (const k of V.kids) if (dentro(k.x, k.y)) LISTA.push([k.x + k.y, 2, k]);
      for (const d of V.dogs) if (dentro(d.x, d.y)) LISTA.push([d.x + d.y, 2, d]);
      const p = game.player;
      if (p && !p.hidden) LISTA.push([p.x + p.y, 1, p]);
    }
    if (!LISTA.length) return;
    LISTA.sort((m, n) => m[0] - n[0]);
    b.save();
    b.imageSmoothingEnabled = true;
    b.imageSmoothingQuality = 'low';
    b.lineWidth = 1 / S2;
    for (const [, tipo, e] of LISTA) {
      b.globalAlpha = 1;
      if (tipo === 1) K.drawActor(b, bs, e, false);
      else if (tipo === 0) { K.isoT(b, bs); b.drawImage(carroPronto(e), Math.round(e.cx - e.cy) - 56, Math.round((e.cx + e.cy) / 2) - 54); }
      else e.drawIso(b, bs, e);
    }
    b.restore();
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.globalAlpha = 1;
  }
  // um quadro com a câmera alta: céu, a imagem pronta da cidade, o brilho na água, pássaros e nuvens
  function aerial(game, sc) {
    const g = sc.ctx, S = sc.S, cw = sc.canvas.width, ch = sc.canvas.height;
    sc.ox = Math.round((sc.cam.x - sc.cam.y) * S - cw / 2);
    sc.oy = Math.round(((sc.cam.x + sc.cam.y) / 2) * S - ch / 2);
    const ky = st.ky || 1, bw = cw * FINO, bh = ch * FINO;
    if (!ALTA || ALTA.c.width !== bw || ALTA.c.height !== bh || Object.getPrototypeOf(ALTA.sc) !== sc) {
      const c = DL.mk(bw, bh);
      ALTA = { c, g: c.getContext('2d'), sc: Object.create(sc) }; // uma "cena" igual, só que com a tela grande
      ALTA.sc.canvas = c; ALTA.sc.ctx = ALTA.g; ALTA.sc.fino = FINO;
    }
    const b = ALTA.g, bs = ALTA.sc;
    bs.S = S * FINO;
    bs.ox = Math.round((sc.cam.x - sc.cam.y) * bs.S - bw / 2);
    bs.oy = Math.round(((sc.cam.x + sc.cam.y) / 2) * bs.S - bh / 2);
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.globalAlpha = 1;
    b.globalCompositeOperation = 'source-over';
    Lg.sky(b, bs, st);
    Lg.drawAerial(b, bs);
    Lg.water(b, bs, st);
    vivos(game, b, bs);
    // reduz para a tela do jogo; a vista mais "de cima" estica o chão na vertical em volta do meio (no mesmo passo)
    const hh = bh / ky, y0 = (bh - hh) / 2;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'low'; // metade do tamanho: a média simples já basta (e é a mais leve)
    g.drawImage(ALTA.c, 0, y0, bw, hh, 0, 0, cw, ch);
    g.imageSmoothingEnabled = false;
    // sombras de nuvem passando devagar por cima da cidade (somem quando a câmera desce)
    const sA = (1 - smooth(0.26, 0.46, S)) * 0.26;
    if (sA > 0.01) {
      if (!SOMBRA) SOMBRA = fazSombra();
      g.globalAlpha = sA;
      for (let i = 0; i < NUVENS_SOMBRA.length; i++) {
        const n = NUVENS_SOMBRA[i], Xw = LAGO_ISO.X0 + n[0] + ((st.t * 38 + i * 900) % 7000) - 3500, Yw = (LAGO_ISO.Y0 + LAGO_ISO.Y1) / 2 + n[1];
        const w = n[2] * S, h = w * 0.5 * ky, sx = Xw * S - sc.ox, sy = (Yw * S - sc.oy - ch / 2) * ky + ch / 2;
        if (sx + w / 2 < 0 || sx - w / 2 > cw || sy + h / 2 < 0 || sy - h / 2 > ch) continue;
        g.drawImage(SOMBRA, sx - w / 2, sy - h / 2, w, h);
      }
      g.globalAlpha = 1;
    }
    // a bandeira de Canaã fica fora das imagens prontas: desenhada a cada quadro (com vento), sem esticar
    const m = mastro || (mastro = game.world.items.find((e) => e.kind === 'lg-mastro'));
    if (m) {
      const oy = sc.oy, Ys = ((m.px + m.py + 16) / 2) * S - oy, Yn = (Ys - ch / 2) * ky + ch / 2;
      sc.oy = oy - (Yn - Ys);
      g.save(); m.drawIso(g, sc, m); g.restore();
      sc.oy = oy;
    }
    if (sc.overlay) { g.save(); sc.overlay(g, sc); g.restore(); }
  }

  /* ------------------------------------------------------------------ */
  /* ?debug=1: a foto 13 deitada no chão por cima do mapa, 50% transparente (F2 liga/desliga), e o  */
  /* contorno do lago numerado (os pontos ficam em lago-forma.js)                                     */
  /* ------------------------------------------------------------------ */
  const DEBUG = /[?&]debug=1(&|$)/.test(location.search);
  let refImg = null, refOn = true;
  function debugSetup() {
    if (!DEBUG || refImg) return;
    refImg = new Image();
    refImg.src = 'referencia/13-lago-detalhe.png';
    const tip = document.createElement('div');
    tip.className = 'debug-tip';
    tip.textContent = 'debug: F2 mostra/esconde a foto 13 · contorno do lago em amarelo (pontos numerados, lago-forma.js)';
    document.body.appendChild(tip);
    window.addEventListener('keydown', (ev) => { if (ev.code === 'F2') { refOn = !refOn; ev.preventDefault(); } });
  }
  function debugDraw(g, sc) {
    g.save();
    // a foto cobre o mapa inteiro (0..W, 0..H tiles), com o norte para cima: é só deitá-la no chão
    if (refOn && refImg && refImg.complete) {
      sc.groundTransform(g);
      g.globalAlpha = 0.5;
      g.imageSmoothingEnabled = true;
      g.drawImage(refImg, 0, 0, L.W * T, L.H * T);
      g.globalAlpha = 1;
    }
    K.isoT(g, sc);
    const P = L.lake, S = sc.S;
    g.strokeStyle = '#ffe14a';
    g.lineWidth = 2 / S;
    g.beginPath();
    P.forEach(([x, y], i) => { const X = (x - y) * T, Y = ((x + y) / 2) * T; i ? g.lineTo(X, Y) : g.moveTo(X, Y); });
    g.closePath();
    g.stroke();
    // os erros do validarMapa(): um X vermelho em cada
    g.strokeStyle = '#ff2020';
    g.lineWidth = 3 / S;
    for (const e of ERROS) {
      const X = (e.x - e.y) * T, Y = ((e.x + e.y) / 2) * T, r = 7 / Math.min(1, S);
      g.beginPath(); g.moveTo(X - r, Y - r); g.lineTo(X + r, Y + r); g.moveTo(X + r, Y - r); g.lineTo(X - r, Y + r); g.stroke();
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.font = '10px monospace';
    g.fillStyle = '#ffe14a';
    P.forEach(([x, y], i) => { const X = (x - y) * T * S - sc.ox, Y = ((x + y) / 2) * T * S - sc.oy; g.fillRect(X - 1, Y - 1, 3, 3); g.fillText(String(i), X + 3, Y - 3); });
    g.restore();
  }

  /* ------------------------------------------------------------------ */
  /* validarMapa(): confere se cada coisa está num tipo de chão permitido (mapa lógico, lago-mapa.js) */
  /* ?debug=1 roda sozinho, lista no console e marca um X vermelho no lugar de cada erro.             */
  /* ------------------------------------------------------------------ */
  let ERROS = [];
  const set = (...a) => new Set(a);
  const NAO_ARVORE = set('rua', 'faixa', 'calcada', 'agua', 'predio', 'estac', 'vaga', 'trilha');
  const REGRAS = {
    'lg-tree': (t) => !NAO_ARVORE.has(t),
    'lg-bush': (t) => !NAO_ARVORE.has(t),
    'lg-lamp': (t) => t === 'calcada' || t === 'canteiro',
    'lg-sign': (t) => t === 'calcada' || t === 'canteiro',
    'lg-bench': (t) => !set('rua', 'faixa', 'agua', 'predio', 'estac', 'vaga', 'calcada').has(t),
    'lg-flag': (t) => !set('rua', 'faixa', 'agua', 'predio', 'estac', 'vaga').has(t),
    'lg-mastro': (t) => !set('rua', 'faixa', 'agua', 'predio', 'estac', 'vaga', 'calcada').has(t),
    'lg-mycar': (t) => t === 'rua',
  };
  const PE_OK = set('calcada', 'faixa', 'trilha', 'praca', 'grama', 'margem');
  const CARRO_OK = set('rua', 'faixa', 'estac', 'vaga');
  function validarMapa(game) {
    const M = Lg.MAPA, F = L.F, AV = L.AV, out = [];
    const nome = (x, y) => M.nomeExato(x, y); // a forma exata (a grade arredonda para a célula)
    const err = (o, oque, x, y, extra) => out.push({ o, oque, x: +x.toFixed(1), y: +y.toFixed(1), tipo: nome(x, y), extra: extra || '' });
    const items = (game && game.world ? game.world.items : L.items) || [];
    for (const e of items) {
      const x = e.cx != null ? e.cx / T : e.tx + 0.5, y = e.cy != null ? e.cy / T : e.ty + 0.5;
      if (REGRAS[e.kind] && !REGRAS[e.kind](nome(x, y))) err(e.kind, 'chão proibido', x, y);
      if (e.kind === 'lg-car') {
        // o carro parado: o meio e os 4 cantos no asfalto ou na vaga
        const c = Math.cos(e.ang), sn = Math.sin(e.ang);
        for (const [a, b] of [[0, 0], [1.7, 0.7], [1.7, -0.7], [-1.7, 0.7], [-1.7, -0.7]]) {
          const px = x + c * a - sn * b, py = y + sn * a + c * b;
          if (!CARRO_OK.has(nome(px, py))) { err('lg-car', 'carro parado fora da vaga/pista', px, py); break; }
        }
      }
      if (e.kind === 'lg-house') {
        const c = e.c;
        for (const [cx, cy] of c.cells || []) if (M.NOMES[M.baseEm(cx, cy)] !== 'lote' || M.donoEm(cx, cy) !== c.lot) { err('lg-house', 'casa fora do lote', cx + 0.5, cy + 0.5); break; }
      }
    }
    // as casas da cidade em volta
    for (const c of M.casas) {
      if (c.noMapa) continue;
      for (const [cx, cy] of c.cells || []) if (M.NOMES[M.baseEm(cx, cy)] !== 'lote' || M.donoEm(cx, cy) !== c.lot) { err('casa', 'casa fora do lote', cx + 0.5, cy + 0.5); break; }
    }
    // as faixas de trânsito: sempre no asfalto
    M.TRAFEGO.forEach((t, k) => {
      for (let i = 1; i < t.pts.length; i++) {
        const [ax, ay] = t.pts[i - 1], [bx, by] = t.pts[i], n = Math.ceil(Math.hypot(bx - ax, by - ay) * 2);
        for (let j = 0; j < n; j++) { const x = ax + ((bx - ax) * j) / n, y = ay + ((by - ay) * j) / n; if (!set('rua', 'faixa').has(nome(x, y))) { err('trânsito ' + k, 'carro fora da pista', x, y); i = 1e9; break; } }
      }
    });
    // os caminhos dos pedestres
    const CL = M.CALCADA_LAGO;
    for (const d of [AV.calcada[0] + 0.5, (AV.calcada[0] + AV.calcada[1]) / 2, AV.calcada[1] - 0.5])
      for (let s0 = CL[0]; s0 <= CL[1]; s0 += 0.5) { const [x, y] = AV.world(s0, d); if (!set('calcada', 'faixa').has(nome(x, y))) { err('pedestre (calçada do lago)', 'fora da calçada', x, y); break; } }
    const CN = M.CALCADA_NORTE, dn = (AV.calcadaN[0] + AV.calcadaN[1]) / 2;
    for (let s0 = CN[0]; s0 <= CN[1]; s0 += 0.5) { const [x, y] = AV.world(s0, dn); if (!set('calcada', 'faixa').has(nome(x, y))) { err('pedestre (calçada norte)', 'fora da calçada', x, y); break; } }
    for (let i = 1; i < F.trilha.length; i++) {
      const [ax, ay] = F.trilha[i - 1], [bx, by] = F.trilha[i], n = Math.ceil(Math.hypot(bx - ax, by - ay) * 2);
      for (let j = 0; j < n; j++) { const x = ax + ((bx - ax) * j) / n, y = ay + ((by - ay) * j) / n; if (!PE_OK.has(nome(x, y))) err('pedestre (trilha)', 'fora do caminho', x, y); }
    }
    // quem está andando agora
    const V = Lg.vida && Lg.vida.V;
    if (V) {
      for (const a of V.peds) if (!PE_OK.has(nome(a.x / T, a.y / T))) err('pedestre', 'fora do caminho', a.x / T, a.y / T);
      for (const dg of V.dogs) if (!PE_OK.has(nome(dg.x / T, dg.y / T))) err('cachorro', 'fora do caminho', dg.x / T, dg.y / T);
      for (const k of V.kids || []) if (!set('grama', 'praca', 'margem').has(nome(k.x / T, k.y / T))) err('criança', 'fora do gramado', k.x / T, k.y / T);
      for (const c of V.cars) if (!set('rua', 'faixa').has(nome(c.cx / T, c.cy / T))) err('carro andando', 'fora da pista', c.cx / T, c.cy / T);
    }
    ERROS = out;
    if (out.length) { console.warn('[validarMapa] ' + out.length + ' erro(s):'); console.table(out); }
    else console.log('[validarMapa] 0 erros: tudo no lugar certo.');
    return out;
  }
  window.validarMapa = () => validarMapa(Lg.game);

  function startPlay(game) {
    const sc = game.scene, p = game.player;
    st.phase = 'play';
    // a viagem (abertura.js) vai sendo montada aos poucos, no tempo livre, enquanto o jogador anda até o carro
    if (DL.Abertura && DL.Abertura.preparar) DL.Abertura.preparar();
    st.band = 0;
    st.ky = 1;
    st.haze = 0;
    sc.camFree = false;
    sc.resize(); // volta ao zoom do jogo
    p.hidden = false;
    p.alpha = 1;
    p.x = P0.x; p.y = P0.y; p.moving = false; p.dir = 'right';
    game.locked = false;
    caption(null);
    document.body.classList.remove('in-cutscene');
    $('cutscene').hidden = true;
    showMission(true);
    game.toast('Vá até o seu carro, perto da faixa de pedestre.');
  }

  function skip() { if (st.phase === 'film' && st.skipAt == null) st.skipAt = st.t; }

  /* ------------------------------------------------------------------ */
  /* Missão (usa a caixa de missão do DataLab, com outro texto)          */
  /* ------------------------------------------------------------------ */
  let savedMission = null;
  function showMission(on) {
    const box = $('mission'), p = box.querySelector('p');
    if (on) {
      if (savedMission == null) savedMission = p.textContent;
      p.textContent = 'Fim de tarde no Lago da Prefeitura. Hora de ir para a faculdade.';
      $('missionSteps').innerHTML = '<li>Ir até o carro, perto da faixa de pedestre, e entrar (E)</li>';
      $('carry').classList.remove('is-on');
      box.classList.remove('is-done');
      document.body.classList.remove('lago-film');
    } else if (savedMission != null) {
      p.textContent = savedMission;
      $('missionSteps').innerHTML = '';
    }
  }

  /* ------------------------------------------------------------------ */
  /* Entrar no carro                                                     */
  /* ------------------------------------------------------------------ */
  function enterCar(game) {
    if (st.phase !== 'play') return;
    st.phase = 'car';
    st.carT = 0;
    game.locked = true;
    $('missionSteps').innerHTML = '<li class="is-ok">Ir até o carro, perto da faixa de pedestre, e entrar (E)</li>';
    const car = game.world.byId.CARRO;
    st.carFrom = { x: game.player.x, y: game.player.y };
    st.carTo = { x: L.carUse.x, y: L.carUse.y };
    st.car0 = { x: car.cx, y: car.cy, v: 0, u: 0 };
    st.som = {};
    caption(null);
  }
  // a sequência (segundos depois de chegar na porta): porta abre em 2 quadros, o boneco entra em 3,
  // porta fecha, faróis e lanternas acendem, a seta pisca, o carro sai e a câmera vai junto
  const CARRO = { abre: 0.12, entra: [0.4, 0.58, 0.76, 0.94], fecha: [1.1, 1.24], luz: 1.55, seta: [1.75, 3.2], sai: 2.45, fim: 4.05 };
  const umaVez = (k, f) => { if (!st.som[k]) { st.som[k] = 1; if (Lg.som) f(Lg.som); } };
  function carStep(game, dt) {
    const p = game.player, car = game.world.byId.CARRO;
    st.carT += dt;
    const t = st.carT;
    const d = Math.hypot(st.carTo.x - st.carFrom.x, st.carTo.y - st.carFrom.y), walkT = Math.max(0.15, d / 50);
    if (t < walkT) {
      const k = t / walkT;
      p.x = lerp(st.carFrom.x, st.carTo.x, k);
      p.y = lerp(st.carFrom.y, st.carTo.y, k);
      p.moving = true;
      p.dist += 50 * dt;
      p.dir = DL.dirOf(st.carTo.x - st.carFrom.x, st.carTo.y - st.carFrom.y);
    } else {
      const u = t - walkT, C = CARRO, sc = game.scene, AV = L.AV;
      st.carU = u;
      p.moving = false;
      p.dir = DL.dirOf(car.cx - st.carTo.x, car.cy - st.carTo.y);
      // a porta: meio aberta, aberta, meio fechada, fechada
      car.doorOpen = u < C.abre ? 0.5 : u < C.fecha[0] ? 1 : u < C.fecha[1] ? 0.5 : 0;
      umaVez('abre', (s) => s.porta(false));
      if (u >= C.fecha[1]) umaVez('fecha', (s) => s.porta(true));
      // o boneco entra: três passos para dentro, cada um mais escondido atrás da porta
      const n = C.entra.filter((x) => u >= x).length;
      if (n >= 4) p.hidden = true;
      else {
        const k = [0, 0.3, 0.6, 0.85][n];
        p.x = lerp(st.carTo.x, car.cx, k); p.y = lerp(st.carTo.y, car.cy, k);
        p.alpha = [1, 0.8, 0.5, 0.22][n];
      }
      // luzes, seta e partida
      car.luz = smooth(C.luz, C.luz + 0.25, u);
      if (u >= C.luz - 0.25) umaVez('motor', (s) => s.motor());
      car.seta = u > C.seta[0] && u < C.seta[1] && Math.floor((u - C.seta[0]) * 3.2) % 2 === 0;
      if (u > C.sai) {
        const c0 = st.car0, a = 70;
        c0.v = Math.min(120, c0.v + a * dt);
        c0.u += c0.v * dt;
        const lado = -smooth(0, 70, c0.u) * 0.9 * T; // sai da beira da calçada para o meio da pista
        car.cx = c0.x + AV.DIR[0] * c0.u + AV.NRM[0] * lado;
        car.cy = c0.y + AV.DIR[1] * c0.u + AV.NRM[1] * lado;
        car.px = car.cx - 30; car.py = car.cy - 13;
      }
      // a câmera sai do boneco e acompanha o carro, sem tranco
      if (!sc.camFree) { sc.camFree = true; st.camK = 0; st.cam0 = { x: sc.cam.x, y: sc.cam.y }; }
      st.camK = Math.min(1, st.camK + dt / 1.6);
      const ck = st.camK * st.camK * (3 - 2 * st.camK);
      sc.cam.x = lerp(st.cam0.x, st.cam0.x + (car.cx - st.car0.x) + (st.car0.x - st.carTo.x) * 0.5, ck);
      sc.cam.y = lerp(st.cam0.y, st.cam0.y + (car.cy - st.car0.y) + (st.car0.y - st.carTo.y) * 0.5, ck);
      if (u > C.fim && !st.left) {
        st.left = true;
        DL.fromLake = true; // a abertura começa com o boneco já dentro do carro
        // a passagem para a viagem: a abertura começa por baixo desta mesma imagem, com o carro no mesmo ponto da tela
        const cv = sc.canvas, foto = DL.mk(cv.width, cv.height);
        foto.getContext('2d').drawImage(cv, 0, 0);
        const X = (car.cx - car.cy) * sc.S - sc.ox, Y = ((car.cx + car.cy) / 2) * sc.S - sc.oy;
        DL.passagem = { foto, fx: X / cv.width, fy: Y / cv.height, dusk: st.dusk };
        setTimeout(() => game.loadMap('abertura'), 0);
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* O mapa                                                              */
  /* ------------------------------------------------------------------ */
  DL.registerMap({
    id: 'lago',
    name: 'Lago da Prefeitura',
    tiles: L.rows,
    items: L.items,
    spawn: L.spawn,
    spawnDir: 'right',
    rooms: [],
    // tela interna pequena (~360 px de altura, ampliada com pixels nítidos) e zoom 1 no jogo
    camera: { tilesWide: 26, minTilesHigh: 11, noBase: true, pixelH: 360, minS: 1 },

    enter(game) {
      const sc = game.scene;
      Object.assign(st, { t: 0, band: 0, ky: 1, haze: 1, dusk: duskAt(0), phase: 'film', skipAt: null, fadeIn: null, caption: '', carT: 0, left: false, ready: false, jaPintou: false,
        // (menu inicial) com o menu na tela o filme fica parado no começo, e as nuvens são as do menu
        espera: !!DL.menuEspera, doMenu: !!DL.menuEspera });
      Lg.lamps = game.world.items.filter((e) => e.lamp);
      mastro = null;
      // o preparo (lago-preparo.js): desenha uma vez o que fica parado; o filme começa quando termina
      Lg.cancelPrep = null;
      Lg.prepare(sc, () => { st.ready = true; });
      // câmera alta (filme): só as imagens prontas; câmera baixa: o motor desenha o mapa normal
      sc.drawInstead = () => {
        const g = sc.ctx;
        if (!st.ready) { g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#000'; g.fillRect(0, 0, sc.canvas.width, sc.canvas.height); return true; }
        if (st.phase !== 'film' || sc.S >= Lg.AERIAL_MAX) return false;
        // atrás do menu as nuvens tapam tudo: a cidade continua andando (update), mas não precisa ser desenhada
        if (st.espera && st.jaPintou) return true;
        st.jaPintou = true;
        aerial(game, sc);
        return true;
      };
      // o ponto de "E" do carro fica do lado da calçada
      const car = game.world.byId.CARRO;
      car.ix = L.carUse.x;
      car.iy = L.carUse.y;
      car.doorOpen = 0; car.luz = 0; car.seta = false;
      if (!L.car0) L.car0 = { x: car.cx, y: car.cy };
      car.cx = L.car0.x; car.cy = L.car0.y;
      car.px = car.tx * T; car.py = car.ty * T;
      sc.background = (g) => { Lg.sky(g, sc, st); Lg.drawCity(g, sc); };
      sc.underlay = (g) => {
        Lg.shadows(g, sc, st); // antes da água: na água a sombra quase não aparece
        Lg.water(g, sc, st);
        if (Lg.vida) Lg.vida.water(g, sc, st);
        Lg.drawCityFront(g, sc);
      };
      if (Lg.vida) Lg.vida.init(game, st);
      debugSetup();
      Lg.game = game;
      if (DEBUG) setTimeout(() => validarMapa(game), 0);
      if (Lg.som) Lg.som.enter();
      game.locked = true;
      game.player.hidden = true;
      document.body.classList.add('in-cutscene', 'lago-film');
      $('cutscene').hidden = false;
      $('cutSkip').onclick = skip;
      // ?mapa=lago&t=20 começa o filme no segundo 20 (para testar um plano)
      const t0 = parseFloat(new URLSearchParams(location.search).get('t'));
      if (t0 > 0) st.t = Math.min(t0, TEMPO.fim);
    },

    update(game, dt) {
      if (!st.ready) return; // ainda preparando
      if (st.espera) { // escondido atrás do menu, esperando o Jogar: a cidade já vai andando (carros, gente, bichos)
        if (Lg.vida) Lg.vida.update(game, Math.min(dt, 0.05), st);
        film(game, 0);
        return;
      }
      st.t += dt;
      st.dusk = duskAt(st.t);
      if (Lg.vida) Lg.vida.update(game, dt, st);
      if (Lg.som) Lg.som.update(st);
      if (st.phase === 'film') {
        if (st.skipAt != null && st.t > st.skipAt + 0.5) { st.t = TEMPO.fim; st.skipAt = null; st.fadeIn = TEMPO.fim; }
        film(game, dt);
      } else if (st.phase === 'car') carStep(game, dt);
    },

    useLabel(game, e) { return e.id === 'CARRO' && st.phase === 'play' ? 'Entrar no carro' : null; },
    use(game, e) { if (e.id === 'CARRO') enterCar(game); },

    key(game, ev) {
      if (st.phase === 'film') {
        if (ev.code === 'Escape' || ev.code === 'Enter' || ev.code === 'Space') { skip(); ev.preventDefault(); }
        return true;
      }
      return false;
    },

    overlay(g, sc) {
      if (st.band > 0) Lg.band(g, sc, st);
      if (st.phase === 'film' && st.haze > 0) Lg.haze(g, sc, st.haze);
      if (Lg.vida) Lg.vida.air(g, sc, st);
      if (DEBUG) debugDraw(g, sc);
      Lg.light(g, sc, st);
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      // as nuvens da abertura
      if (st.phase === 'film' && !st.doMenu) Lg.clouds(g, sc, smooth(TEMPO.nuvens[0], TEMPO.nuvens[1], st.t), st.t);
      // entrada, Pular e saída em preto
      let black = st.doMenu ? 0 : 1 - smooth(0, 1.0, st.t);
      if (st.skipAt != null) black = Math.max(black, smooth(st.skipAt, st.skipAt + 0.5, st.t));
      if (st.fadeIn != null) black = Math.max(black, 1 - smooth(st.fadeIn, st.fadeIn + 0.6, st.t));

      if (black > 0) { g.fillStyle = 'rgba(0,0,0,' + black.toFixed(3) + ')'; g.fillRect(0, 0, sc.canvas.width, sc.canvas.height); }
      g.restore();
    },

    leave(game) {
      const sc = game.scene;
      if (!st.ready) Lg.cancelPrep = sc; // saiu antes de terminar o preparo
      sc.background = sc.underlay = sc.drawInstead = null;
      sc.camFree = false;
      if (Lg.som) Lg.som.leave();
      caption(null);
      showMission(false);
      document.body.classList.remove('in-cutscene', 'lago-film');
      $('cutscene').hidden = true;
    },
  });
})();

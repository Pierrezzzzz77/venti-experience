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

  let mastro = null, STRETCH = null;
  // um quadro com a câmera alta: céu, a imagem pronta da cidade, o brilho na água, pássaros e nuvens
  function aerial(game, sc) {
    const g = sc.ctx, S = sc.S, cw = sc.canvas.width, ch = sc.canvas.height;
    sc.ox = Math.round((sc.cam.x - sc.cam.y) * S - cw / 2);
    sc.oy = Math.round(((sc.cam.x + sc.cam.y) / 2) * S - ch / 2);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    Lg.sky(g, sc, st);
    Lg.drawAerial(g, sc);
    Lg.water(g, sc, st);
    // a vista mais "de cima": estica o chão na vertical em volta do meio da tela
    const ky = st.ky || 1;
    if (ky > 1.001) {
      const hh = Math.round(ch / ky), y0 = Math.round((ch - hh) / 2);
      if (!STRETCH || STRETCH.width !== cw || STRETCH.height !== hh) STRETCH = DL.mk(cw, hh);
      const sg = STRETCH.getContext('2d');
      sg.clearRect(0, 0, cw, hh);
      sg.drawImage(g.canvas, 0, y0, cw, hh, 0, 0, cw, hh);
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.imageSmoothingEnabled = false;
      g.drawImage(STRETCH, 0, 0, cw, hh, 0, 0, cw, ch);
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
    game.toast('Siga as setas até o seu carro, perto da faixa de pedestre.');
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
  /* Setas que guiam até o carro (só na parte jogável)                   */
  /* ------------------------------------------------------------------ */
  const SETA = '255,233,150', SETA_BORDA = 'rgba(40,24,10,0.55)';
  // no chão da calçada: uma fila de setas do jogador até o carro; um brilho corre na direção do carro
  // e as setas por onde o jogador já passou somem
  function setasChao(g, game) {
    if (st.phase !== 'play') return;
    const AV = L.AV, d = AV.DIR, n = AV.NRM, p = game.player;
    const sJog = AV.local(p.x / T, p.y / T).s, sFim = L.S_CAR - 2.2, PASSO = 2.6;
    g.save();
    game.scene.groundTransform(g); // (a água e as sombras, desenhadas antes, trocam a transformação)
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (let s = L.S_SPAWN + 1.5, i = 0; s <= sFim; s += PASSO, i++) {
      if (s < sJog + 1.2) continue;
      const [cx, cy] = AV.world(s, L.walkMid), X = cx * T, Y = cy * T;
      const onda = 0.5 + 0.5 * Math.sin(st.t * 5 - i * 0.9), a = 0.7 + 0.3 * onda;
      const P = (u, v) => [X + (d[0] * u + n[0] * v), Y + (d[1] * u + n[1] * v)];
      // seta cheia (haste + ponta), deitada no chão, apontando para o carro
      g.beginPath();
      [[-8, 2], [0, 2], [0, 6], [9, 0], [0, -6], [0, -2], [-8, -2]].forEach(([u, v], j) => { const q = P(u, v); if (j) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); });
      g.closePath();
      g.strokeStyle = SETA_BORDA; g.lineWidth = 2.5; g.stroke();
      g.fillStyle = 'rgba(' + SETA + ',' + a.toFixed(2) + ')'; g.fill();
    }
    // um anel pulsando no ponto onde se entra no carro
    const k = (st.t * 0.9) % 1;
    g.beginPath();
    g.arc(L.carUse.x, L.carUse.y, 4 + k * 7, 0, Math.PI * 2);
    g.strokeStyle = 'rgba(' + SETA + ',' + (0.9 * (1 - k)).toFixed(2) + ')';
    g.lineWidth = 2;
    g.stroke();
    g.restore();
  }
  // no ar: uma seta para baixo balançando em cima do carro; se o carro está fora da tela,
  // a seta fica na borda da tela apontando para o lado dele
  function setaCarro(g, sc, game) {
    if (st.phase !== 'play') return;
    const car = game.world.byId.CARRO, dpr = sc.dpr, cw = sc.canvas.width, ch = sc.canvas.height;
    const q = sc.worldToScreen(car.cx, car.cy, 34), u = Math.max(2, Math.round(sc.S)); // u = 1 pixel do jogo
    let x = q.x * dpr, y = q.y * dpr - (2 + Math.sin(st.t * 4) * 2.5) * u, ang = 0;
    const m = 14 * u, fora = x < m || x > cw - m || y < m || y > ch - m;
    if (fora) {
      const px = cw / 2, py = ch / 2;
      ang = Math.atan2(y - py, x - px) - Math.PI / 2;
      x = clamp(x, m, cw - m); y = clamp(y, m, ch - m);
    }
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.translate(Math.round(x), Math.round(y));
    g.rotate(ang);
    g.scale(u, u);
    const forma = () => { g.beginPath(); g.moveTo(-2, -9); g.lineTo(2, -9); g.lineTo(2, -2); g.lineTo(6, -2); g.lineTo(0, 5); g.lineTo(-6, -2); g.lineTo(-2, -2); g.closePath(); };
    forma(); g.lineJoin = 'round'; g.lineWidth = 2.5; g.strokeStyle = 'rgba(40,24,10,0.8)'; g.stroke();
    forma(); g.fillStyle = 'rgb(' + SETA + ')'; g.fill();
    g.restore();
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
  }
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
      p.moving = false;
      p.dir = 'down';
      car.doorOpen = t < walkT + 1.1;
      p.alpha = 1 - smooth(walkT + 0.25, walkT + 0.75, t);
    }
    if (t > walkT + 1.6 && !st.left) {
      st.left = true;
      DL.fromLake = true; // a abertura começa com o boneco já dentro do carro
      setTimeout(() => game.loadMap('abertura'), 0);
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
      Object.assign(st, { t: 0, band: 0, ky: 1, haze: 1, dusk: duskAt(0), phase: 'film', skipAt: null, fadeIn: null, caption: '', carT: 0, left: false, ready: false });
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
        aerial(game, sc);
        return true;
      };
      // o ponto de "E" do carro fica do lado da calçada
      const car = game.world.byId.CARRO;
      car.ix = L.carUse.x;
      car.iy = L.carUse.y;
      car.doorOpen = false;
      sc.background = (g) => { Lg.sky(g, sc, st); Lg.drawCity(g, sc); };
      sc.underlay = (g) => {
        Lg.shadows(g, sc, st); // antes da água: na água a sombra quase não aparece
        Lg.water(g, sc, st);
        if (Lg.vida) Lg.vida.water(g, sc, st);
        Lg.drawCityFront(g, sc);
        setasChao(g, game);
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
      setaCarro(g, sc, Lg.game);
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      // as nuvens da abertura
      if (st.phase === 'film') Lg.clouds(g, sc, smooth(TEMPO.nuvens[0], TEMPO.nuvens[1], st.t), st.t);
      // entrada, Pular e saída em preto
      let black = 1 - smooth(0, 1.0, st.t);
      if (st.skipAt != null) black = Math.max(black, smooth(st.skipAt, st.skipAt + 0.5, st.t));
      if (st.fadeIn != null) black = Math.max(black, 1 - smooth(st.fadeIn, st.fadeIn + 0.6, st.t));
      if (st.phase === 'car') black = Math.max(black, smooth(1.4, 2.2, st.carT));
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

/* Venti Experience — a viagem (o jogador só assiste, botão "Pular").
   Do Lago da Prefeitura até a Faculdade Serra Dourada, em Canaã dos Carajás, de carro.
   Tudo é pixel art desenhada por código num canvas pequeno e depois ampliada (sem imagens).
   O céu vai do pôr do sol (laranja e rosa) até a noite; as luzes acendem no caminho.

   São dois planos:
     LADO   (vista de lado) o carro sai do lago, passa pela PA-160 / Av. Weyne Cavalcante — SkyFit (foto 15),
            casas e comércios, árvores grandes em camadas (as de trás andam mais devagar, as da frente mais
            depressa) — e chega à rotatória. Lá ele NÃO segue reto: vira e entra na avenida que vai para o fundo.
     FUNDO  (câmera atrás do carro) a Av. Carajás em perspectiva, com canteiro, árvores e casas passando,
            até encostar no meio-fio em frente à Serra Dourada. Dali o jogo abre a rua (maps/rua.js),
            onde o boneco desce do carro.

   As peças (casas, árvores, SkyFit, carros) ficam em abertura-pecas.js, cada uma num sprite pronto;
   aqui só se copia sprite. O que acende à noite (janelas, placas) é uma segunda camada somada no fim. */
(function () {
  'use strict';
  const DL = window.DL, R = DL.R, hash = DL.hash, CH = DL.CHAR, P = DL.Pecas, A = DL.Arte, disc = A.disc, oval = A.oval;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
  const rgbOf = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (a, b, k) => { const X = rgbOf(a), Y = rgbOf(b); return '#' + X.map((v, i) => Math.round(lerp(v, Y[i], clamp(k, 0, 1))).toString(16).padStart(2, '0')).join(''); };

  /* ------------------------------------------------------------------ */
  /* Layout do plano de lado (pixels do mundo; y cresce para baixo)       */
  /* ------------------------------------------------------------------ */
  const H0 = 184;
  const HZ = 92, WATER = 96, MARGIN = 118, VERGE = 121, ROAD0 = 136, CENTER = 151, ROAD1 = 166, WALK = 168, FRONT = 177;
  const FAR = 147, NEAR = 163, LOTE = 122;      // as duas faixas e a linha da frente das casas
  const LAKE_END = 1000, PA0 = 1030, PA_END = 2590, ROT_X = 2680, DX = 2790, END_X = 3200;
  const VPX = DX + 40, VPY = HZ + 3;            // o ponto de fuga da avenida que vai para o fundo
  const PREF_X = 230;
  const SF_X = 1050, SF_W = 540;              // a SkyFit (em escala: 540 px = 10 carros)
  const PS = 0.68;                             // as pessoas: ~20 px de altura (o carro tem 52 px de comprimento)

  // linha do tempo (segundos)
  const TL = { walk0: 2.2, walk1: 5.6, inCar: 6.2, go: 7.0, vira: 33.0, fundo: 35.4, para: 44.8, fim: 46.6 };
  const X_START = 250, X_VIRA = DX - 54, ACC = 2.5, DEC = 3, V_FIM = 46, MIX = 0.8;

  // o carro no plano de lado: arranca, anda constante e reduz para fazer a curva
  function carX(t) {
    if (t <= TL.go) return X_START;
    const D = X_VIRA - X_START, Td = TL.vira - TL.go, v = (D - (V_FIM * DEC) / 2) / (Td - ACC / 2 - DEC / 2), u = Math.min(t - TL.go, Td);
    if (u < ACC) return X_START + 0.5 * (v / ACC) * u * u;
    if (u < Td - DEC) return X_START + (v * ACC) / 2 + v * (u - ACC);
    const r = Td - u;
    return X_VIRA - (V_FIM * r + (0.5 * (v - V_FIM) * r * r) / DEC);
  }
  // a avenida que vai para o fundo, linha a linha: o meio e a meia largura
  function ruaFundo(y) {
    const k = clamp((y - VPY) / (ROAD0 - VPY), 0, 1);
    return { x: lerp(VPX, DX, k) + 12 * Math.sin(k * Math.PI), hw: 3 + 31 * k, k };
  }
  // a curva: [x, y, ângulo (0 = de lado, 90° = de costas), tamanho]
  function curva(t) {
    const u = clamp((t - TL.vira) / (TL.fundo - TL.vira), 0, 1);
    let x, y, a;
    if (u < 0.5) { a = (u / 0.5) * (Math.PI / 2); x = X_VIRA + (DX + 12 - X_VIRA) * Math.sin(a); y = NEAR - (NEAR - 142) * (1 - Math.cos(a)); }
    else { const v = Math.pow((u - 0.5) / 0.5, 0.85); a = Math.PI / 2; y = lerp(142, 108, v); const r = ruaFundo(y); x = (y >= ROAD0 ? DX : r.x) + (y >= ROAD0 ? 12 : r.hw * 0.38); }
    return [x, y, a, (y - VPY) / (NEAR - VPY)];
  }

  /* ------------------------------------------------------------------ */
  /* Peças pequenas desenhadas na hora                                   */
  /* ------------------------------------------------------------------ */
  // poste de concreto (~104 px = 6,5 carros), cruzetas, braço de luz e os fios até o próximo
  function poste(g, o, on, lights) {
    const x = o.x, y = o.y, H = 104;
    R(g, x - 1, y - H, 3, H, '#9a958c'); R(g, x - 1, y - H, 1, H, '#b9b4ad'); R(g, x - 2, y - 3, 5, 3, '#7d7870');
    R(g, x - 7, y - H + 4, 16, 2, '#6d6a64'); R(g, x - 7, y - H + 10, 16, 2, '#6d6a64');
    for (const dx of [-6, 0, 7]) { R(g, x + dx, y - H + 2, 1, 2, '#e9ecef'); R(g, x + dx, y - H + 8, 1, 2, '#e9ecef'); }
    R(g, x + 2, y - H + 22, 12, 1, '#9aa3b0'); R(g, x + 13, y - H + 21, 1, 2, '#9aa3b0'); R(g, x + 11, y - H + 23, 7, 2, on > 0.3 ? '#fff3d6' : '#c8ccd2');
    if (o.trafo) { R(g, x - 9, y - H + 16, 7, 12, '#5d6573'); R(g, x - 9, y - H + 16, 7, 1, '#7d8590'); }
    if (o.nx) g.drawImage(fios(o.nx - x), x, y - H + 4); // os 3 fios até o próximo poste (um sprite feito uma vez)
    if (on > 0.01) {
      lights.push({ x: x + 14, y: y - H + 25, r: 12, c: [255, 214, 150, 0.9 * on] });
      lights.push({ x: x + 14, y: ROAD0 + 8, r: 46, c: [255, 196, 120, 0.2 * on], flat: true });
    }
  }
  // os fios entre dois postes (vão de L px): 2 de energia e 1 de telefone, com a barriga no meio
  const FIOS = {};
  function fios(L) {
    if (FIOS[L]) return FIOS[L];
    const c = DL.mk(L + 1, 36), g = c.getContext('2d');
    for (const [dy, sag] of [[0, 8], [6, 10], [26, 7]]) for (let xx = 0; xx <= L; xx++) { const u = xx / L; R(g, xx, dy + Math.round(sag * 4 * u * (1 - u)), 1, 1, '#2a2f38'); }
    return (FIOS[L] = c);
  }
  // poste alto e fino do lago (~100 px)
  function lamp(g, x, y, on, lights) {
    const H = 100;
    R(g, x, y - H, 2, H, '#9aa3b0'); R(g, x + 1, y - H, 1, H, '#5d6573'); R(g, x, y - H, 14, 1, '#9aa3b0'); R(g, x + 13, y - H, 1, 2, '#9aa3b0');
    R(g, x + 10, y - H + 2, 7, 2, on > 0.3 ? '#fff3d6' : '#c8ccd2'); R(g, x - 1, y - 2, 4, 2, '#3a3f4a');
    if (on > 0.01) {
      lights.push({ x: x + 13, y: y - H + 4, r: 12, c: [255, 214, 150, 0.9 * on] });
      lights.push({ x: x + 13, y: Math.min(y + 16, ROAD1 - 4), r: 40, c: [255, 196, 120, 0.22 * on], flat: true });
    }
  }
  function beam(g, x, y, dir, len, a) {
    const gr = g.createLinearGradient(x, 0, x + dir * len, 0);
    gr.addColorStop(0, 'rgba(255,240,190,' + a.toFixed(3) + ')'); gr.addColorStop(1, 'rgba(255,240,190,0)');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(x, y - 1); g.lineTo(x + dir * len, y - 6); g.lineTo(x + dir * len, y + 7); g.lineTo(x, y + 1); g.closePath(); g.fill();
  }
  function dog(g, x, y, step) {
    R(g, x - 4, y - 5, 8, 3, '#6b4a2a'); R(g, x + 3, y - 7, 3, 3, '#6b4a2a'); R(g, x + 5, y - 6, 1, 1, '#121418'); R(g, x - 5, y - 6, 1, 2, '#6b4a2a');
    const s = step % 2;
    R(g, x - 3 + s, y - 2, 1, 2, '#4a3220'); R(g, x + 2 - s, y - 2, 1, 2, '#4a3220');
  }
  function glow(g, x, y, r, c) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + c[3].toFixed(3) + ')'); gr.addColorStop(1, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',0)');
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Prefeitura / Centro Administrativo (foto 08), de longe, do outro lado do lago (não mudou)
  function makePrefeitura() {
    const W = 128, H = 34, c = DL.mk(W, H), g = c.getContext('2d'), B = H, lit = [];
    R(g, 4, B - 20, 120, 20, '#d4d8de'); R(g, 4, B - 21, 120, 1, '#eef0f3'); R(g, 4, B - 20, 120, 1, '#b4bac2');
    for (const y of [B - 17, B - 11]) {
      R(g, 6, y, 116, 4, '#2f7a5a'); R(g, 6, y, 116, 1, '#5fb48a');
      for (let x = 6; x < 122; x += 3) R(g, x, y, 1, 4, '#e9ecef');
      for (let x = 8; x < 120; x += 6) if (hash(x * 7 + y) > 0.35) lit.push([x, y + 2]);
    }
    R(g, 6, B - 6, 116, 5, '#5d6573'); R(g, 6, B - 6, 116, 1, '#7d8590');
    R(g, 52, B - 26, 26, 26, '#c9ced5'); R(g, 52, B - 27, 26, 1, '#eef0f3'); R(g, 55, B - 24, 20, 18, '#2a6e50');
    for (let x = 55; x < 75; x += 4) R(g, x, B - 24, 1, 18, '#a9d8bf');
    R(g, 50, B - 7, 30, 2, '#eef0f3');
    for (let x = 57; x < 74; x += 5) lit.push([x, B - 20], [x, B - 14]);
    const FLAGS = [['#2f9a4a', '#f2c14e'], ['#c8262e', '#e9ecef'], ['#1f3f8a', '#e9ecef'], ['#2f9a4a', '#f2c14e'], ['#e86a2a', '#1f3f8a'], ['#c8262e', '#f2c14e'], ['#2f9a4a', '#1f3f8a']];
    FLAGS.forEach(([a, b], i) => { const x = 30 + i * 11; R(g, x, B - 14, 1, 14, '#c8ccd2'); R(g, x + 1, B - 14, 4, 3, a); R(g, x + 1, B - 12, 4, 1, b); });
    R(g, 10, B - 22, 12, 22, '#eef0f3'); R(g, 10, B - 22, 1, 22, '#c9ced5'); R(g, 12, B - 20, 8, 6, '#2f9a4a'); R(g, 13, B - 19, 6, 4, '#f2c14e'); R(g, 15, B - 18, 2, 2, '#1f3f8a');
    R(g, 12, B - 12, 8, 1, '#c8262e'); R(g, 12, B - 10, 8, 1, '#2a6e50'); R(g, 12, B - 8, 6, 1, '#2a6e50');
    c.lit = lit;
    return c;
  }

  /* ------------------------------------------------------------------ */
  /* Montagem (uma vez)                                                  */
  /* ------------------------------------------------------------------ */
  const WALKERS = [
    { skin: '#c98e66', hair: '#1a1210', hairStyle: 'ponytail', shirt: '#e86a5a', pants: '#2b2f3a', shoes: '#eceff3' },
    { skin: '#8d5a3b', hair: '#0f0b0a', hairStyle: 'buzz', shirt: '#2f6a4a', pants: '#3b4250', shoes: '#16181d' },
    { skin: '#f2c8a0', hair: '#6b4a2a', hairStyle: 'long', shirt: '#c4b5fd', pants: '#2a3140', shoes: '#eceff3' },
    { skin: '#e0ac7e', hair: '#2a1c16', hairStyle: 'curly', shirt: '#f2c14e', pants: '#1f2430', shoes: '#c8262e' },
    { skin: '#a86f4c', hair: '#1a1210', hairStyle: 'short', shirt: '#c8262e', pants: '#2a2f38', shoes: '#eceff3' },
  ];
  let PREF = null;
  const S = { t: 0, cam: null, buf: null, statics: [], people: [], done: false, skipAt: null, caption: '' };
  // a fila de prédios da PA-160 (modelos de abertura-pecas.js) e o vão depois de cada um (vão ≥ 30 ganha uma árvore)
  const ORDEM = [0, 7, 2, 1, 4, 3, 6, 5, 10, 9, 13, 8, 15, 11, 16, 21, 18, 12, 14, 17, 19, 20, 22], VAO = [8, 34, 6, 10, 40, 12, 6, 34, 10, 8, 36, 6, 12, 30, 8, 40, 6, 10, 34, 8, 6, 12, 36];
  // as camadas do meio e do fundo usam mais os prédios altos (aparecem por cima dos telhados da frente)
  const ORDEM_LONGE = [8, 4, 13, 19, 22, 1, 0, 14, 10, 5, 2, 7, 6, 17, 3, 21, 12, 9, 16, 11, 18, 20];
  // o plano de fundo (câmera atrás do carro)
  const FV = 150, FDEC = 2.6, F_T0 = TL.fundo - MIX, F_DUR = TL.para - F_T0, F_TOTAL = FV * (F_DUR - FDEC) + (FV * FDEC) / 2, F_SERRA = F_TOTAL + 108;
  function fDist(tt) {
    tt = clamp(tt, 0, F_DUR);
    if (tt < F_DUR - FDEC) return FV * tt;
    const r = tt - (F_DUR - FDEC);
    return FV * (F_DUR - FDEC) + FV * (r - (r * r) / (2 * FDEC));
  }

  // A montagem é um gerador: cada "yield" é um ponto onde ela pode parar e continuar depois.
  // preparar() (chamada pelo lago, na parte jogável) monta aos poucos no tempo livre de cada quadro;
  // build() termina de uma vez o que faltar (ou tudo, se ?mapa=abertura).
  function build() {
    if (S.pronto) return;
    const g = S.gen || montar();
    S.gen = null;
    while (!g.next().done);
  }
  function preparar() {
    if (S.pronto || S.gen) return;
    S.gen = montar();
    const ric = window.requestIdleCallback || ((f) => setTimeout(() => f({ timeRemaining: () => 8 }), 40));
    const passo = (dl) => {
      if (!S.gen) return;
      const t0 = performance.now(), max = Math.max(3, Math.min(10, dl.timeRemaining()));
      do { if (S.gen.next().done) { S.gen = null; return; } } while (performance.now() - t0 < max);
      ric(passo, { timeout: 400 });
    };
    ric(passo, { timeout: 400 });
  }
  function* montar() {
    const st = [], add = (o) => { st.push(o); return o; };
    const spr = (c, x, y, extra) => add(Object.assign({ k: 'spr', spr: c, x, y }, extra));
    const A_ = (seed, H, x, y, extra) => spr(P.arvoreG(seed, H), x, y, extra);
    /* 1. lago: árvores grandes no canteiro (com espaço para ver o sol na água) e postes altos */
    for (let x = 40, i = 0; x < LAKE_END - 40; x += 130 + Math.round(hash(i * 5) * 70), i++) { A_(i + 1, 72 + Math.round(hash(i * 13) * 26), x, 131 + Math.round(hash(i * 9) * 3), { lake: true, r: 28 }); yield; }
    for (let x = 90; x < LAKE_END; x += 170) add({ k: 'lamp', x, y: 134, lake: true });
    /* 2. PA-160: a SkyFit (foto 15) em escala, carros parados na frente, a bandeira-faixa */
    const sf = P.skyfit();
    yield;
    spr(sf.c, SF_X + sf.w / 2, LOTE, { luz: sf.luz, lights: [[-218, -68, 50, [255, 70, 70, 0.3]], [-203, -18, 44, [190, 220, 255, 0.3]], [-83, -16, 32, [200, 225, 255, 0.35]]] });
    spr(P.bandeirola(), SF_X + sf.w - 34, 128);
    for (const [x, col, dir] of [[SF_X + 40, '#c8ccd2', 1], [SF_X + 170, '#b8333a', -1], [SF_X + 236, '#e9ecef', 1], [SF_X + 430, '#7d8590', 1]]) add({ k: 'parked', x, y: 136, col, dir });
    A_(61, 112, SF_X - 22, LOTE - 2);
    /* 3. casas e comércios em escala: uma fila contínua; árvores grandes nos vãos e atrás dos telhados */
    let x = SF_X + sf.w + 14, n = 0;
    function* casas(ate) {
      for (; ; n++) {
        const m = ORDEM[n % ORDEM.length], p = P.predio(m, n * 5 + 2, n % 3 === 1), vao = VAO[n % VAO.length];
        if (x + p.w > ate) break;
        spr(p.c, x + p.w / 2, LOTE, { luz: p.luz, lights: p.brilhos });
        if (vao >= 30) A_(n + 20, 84 + Math.round(hash(n * 3) * 26), x + p.w + vao / 2, LOTE + 1);
        if (n % 2 === 0) A_(n + 40, 104 + Math.round(hash(n * 7) * 20), x + p.w * (0.25 + hash(n) * 0.5), LOTE - 5);
        if (hash(n * 11) > 0.5) spr(P.capim(n, 14 + Math.round(hash(n) * 10)), x + p.w + vao / 2 + 8, LOTE + 1);
        x += p.w + vao;
        yield;
      }
    }
    yield* casas(PA_END - 6);
    /* canteiro da calçada: postes altos com fios, árvores de calçada (nunca menores que uma casa), placas, ponto de ônibus */
    let ant = null;
    for (let px = 1040, i = 0; px < PA_END; px += 170, i++) { const o = add({ k: 'poste', x: px, y: 134, trafo: i % 4 === 2 }); if (ant) ant.nx = px; ant = o; }
    for (let tx = 1330, i = 0; tx < PA_END - 20; tx += 240 + Math.round(hash(i * 7 + 2) * 90), i++) {
      A_(i + 70, 70 + Math.round(hash(i + 5) * 18), tx, 134);
      spr(P.arbusto(i + 3, 16 + Math.round(hash(i) * 12)), tx + 92, 135);
      yield;
    }
    spr(P.placaVel('40'), 1210, 133); spr(P.placaAzul('PA-160'), 1720, 133); spr(P.placaVel('40'), 2230, 133); spr(P.placaDir('CENTRO >', 'AV. CARAJAS >'), PA_END - 44, 133);
    spr(P.pontoOnibus(), 1960, 129);
    /* canteiro central: palmeiras de verdade (6–8 m) e arbustos */
    for (let mx = 1090, i = 0; mx < PA_END - 30; mx += 200, i++) { spr(P.palmeira(i + 1, 54 + Math.round(hash(i * 3) * 14), 1.8), mx, 153); spr(P.arbusto(i + 30, 16 + Math.round(hash(i * 5) * 10)), mx + 100, 153); yield; }
    /* 4. rotatória: pracinha atrás com árvores grandes, ilha com árvore */
    for (const [tx, h, y] of [[PA_END + 22, 96, 126], [PA_END + 80, 118, 123], [PA_END + 132, 90, 128], [DX - 54, 104, 125]]) { A_(tx, h, tx, y); yield; }
    spr(P.arbusto(5, 26), PA_END + 46, 131); spr(P.arbusto(8, 20), PA_END + 104, 132);
    add({ k: 'island', x: ROT_X, y: CENTER });
    /* a avenida que vai para o fundo: árvores e postes diminuindo dos dois lados */
    for (const k of [0.16, 0.26, 0.4, 0.58, 0.8]) {
      const y = lerp(VPY, ROAD0, k), r = ruaFundo(y);
      for (const lado of [-1, 1]) add({ k: 'sprS', spr: P.arvoreG(600 + (lado > 0 ? 1 : 0), 100), x: r.x + lado * (r.hw + 14 * k + 3), y, s: k * 0.55 });
    }
    /* depois da avenida: mais casas (o carro não chega lá) */
    x = DX + 62; yield* casas(END_X + 300);
    for (let px = DX + 60; px < END_X + 300; px += 170) add({ k: 'poste', x: px, y: 134, nx: px + 170 });
    S.statics = st;

    /* camadas com paralaxe atrás da fila da frente: MEIO (prédios a 0,62, árvores) e LONGE (prédios a 0,4).
       lx = posição na camada; na tela fica em lx - cam × par. Perto da avenida que vai para o fundo
       (na hora da curva) a camada fica vazia, para não ficar em cima dela. */
    function* camada(par, esc, nevoa, cor, base, semente, arvH) {
      const out = [], camV = DX + 14 - 210;
      let lx = (LAKE_END - 500) * par, i = 0;
      while (lx < END_X * par + 700) {
        const p = P.predioSil(i * 7 + semente * 100, esc, nevoa, cor);
        const perto = (a, b) => { const wa = a + camV * (1 - par), wb = b + camV * (1 - par); return wb > DX - 80 && wa < DX + 100; };
        if (!perto(lx, lx + p.w)) out.push({ lx: lx + p.w / 2, y: base, spr: p.c, luz: p.luz });
        const ar = P.arvoreLonge((i % 6) + semente * 50, Math.round(arvH * (0.8 + Math.floor(hash(i * 5 + semente) * 3) * 0.2)), nevoa, cor);
        if (hash(i * 13 + semente) > 0.4 && !perto(lx + p.w - ar.width / 2, lx + p.w + ar.width / 2)) out.push({ lx: lx + p.w + 2, y: base + 1, spr: ar });
        lx += p.w + 3 + Math.round(hash(i * 3 + semente) * 10 * esc);
        i++;
        yield;
      }
      return out;
    }
    S.longe = yield* camada(0.6, 0.35, 0.6, '#6a5a8a', 104, 3, 34);
    S.meio = yield* camada(0.82, 0.55, 0.42, '#7a5a8a', 113, 11, 56);

    /* camadas com paralaxe: mata ao fundo (2) e arbustos/capim na frente (1) */
    S.mata = [P.mata(1, 480, 30, ['#4a6a62', '#5a7c6c']), P.mata(2, 420, 34, ['#33583c', '#447046'])];
    S.frente = [];
    for (let wx = PA0 + 30, i = 0; wx < ROT_X - 60; wx += 60 + Math.round(hash(i * 9 + 1) * 90), i++) {
      const tipo = hash(i * 5 + 2);
      S.frente.push({ wx, spr: tipo < 0.5 ? P.arbusto(i + 50, 22 + Math.round(hash(i) * 16)) : tipo < 0.8 ? P.capim(i + 9, 18 + Math.round(hash(i) * 14)) : P.palmeira(i + 20, 70, 2) });
    }

    PREF = makePrefeitura();
    S.pfBuf = DL.mk(PREF.width, PREF.height);
    S.pfG = S.pfBuf.getContext('2d');
    const gente = [
      { look: 0, a: 60, b: 520, y: 129, sp: 15, ph: 40 }, { look: 1, a: 120, b: 640, y: 132, sp: 18, ph: 300 },
      { look: 2, a: 380, b: 900, y: 128, sp: 13, ph: 120 }, { look: 3, a: 200, b: 820, y: 131, sp: 17, ph: 610 },
      // esperando no ponto de ônibus
      { look: 2, a: 1956, y: 128.6, parado: 'down' }, { look: 3, a: 1974, y: 128.4, parado: 'left' }, { look: 1, a: 1940, y: 129, parado: 'right' },
      // na calçada da frente (do lado da câmera)
      { look: 4, a: 1150, b: 2550, y: 174, sp: 15, ph: 200 }, { look: 0, a: 1400, b: 2550, y: 175, sp: 12, ph: 900 },
    ];
    // a calçada das lojas sempre com alguém andando
    for (let i = 0; i < 14; i++) gente.push({ look: i % 5, a: 1080 + i * 110, b: 1080 + i * 110 + 240, y: 123.5 + (i % 4) * 1.6, sp: 10 + hash(i * 3) * 9, ph: hash(i * 7) * 480 });
    const folhas = []; // uma folha de sprites por visual (fazer uma por pessoa custava segundos)
    for (const L of WALKERS) { folhas.push(DL.makeSheet(L)); yield; }
    S.people = gente.map((p) => Object.assign(p, { sheet: folhas[p.look] }));
    S.dogWalker = folhas[4];
    S.hero = DL.makeSheet(DL.LOOKS.player);
    yield;
    const azul = (DL.Lago && DL.Lago.PAL && DL.Lago.PAL.wa3) || '#3a6ea5'; // a mesma cor do carro do lago
    S.cars = { hero: P.carro(azul), silver: P.carro('#c8ccd2'), gray: P.carro('#7d8590'), red: P.carro('#b8333a'), white: P.carro('#e9ecef') };
    S.heroTras = P.carroPonta(azul, false);
    S.frenteCar = [P.carroPonta('#c8ccd2', true), P.carroPonta('#b8333a', true), P.carroPonta('#e9ecef', true)];
    S.parkedSpr = { '#c8ccd2': S.cars.silver, '#7d8590': S.cars.gray, '#b8333a': S.cars.red, '#e9ecef': S.cars.white };
    // o trânsito no sentido contrário (faixa de lá): carros, motos e um caminhão, um atrás do outro
    const motos = [P.moto('#c8262e', '#3c6aa5', '#f4f6fa'), P.moto('#2a2f38', '#e86a5a', '#c8262e'), P.moto('#1f3f8a', '#f2c14e', '#2a2f38')], truck = P.caminhao('#2f7a4a');
    const fila = [S.cars.silver, motos[0], S.cars.red, S.cars.white, truck, motos[1], S.cars.gray, S.cars.silver, motos[2], S.cars.white, S.cars.red, motos[0], S.cars.gray];
    S.traffic = fila.map((spr, i) => {
      const t0 = 8 + i * 1.95 + hash(i * 5) * 0.8, v = spr === truck ? 80 : spr.r.width < 40 ? 120 : 105;
      return { t0, x0: carX(t0) + 280 + Math.round(hash(i * 9) * 140), spr, v };
    });

    /* o plano de fundo: o que passa dos dois lados da avenida, [X (larguras de pista), D (distância)] */
    const fo = [], fadd = (o) => fo.push(o);
    const poste2 = DL.mk(18, 106), pg = poste2.getContext('2d');
    R(pg, 2, 2, 3, 104, '#9aa3b0'); R(pg, 2, 2, 1, 104, '#c8ccd2'); R(pg, 2, 2, 14, 1, '#9aa3b0'); R(pg, 11, 3, 6, 2, '#fff3d6');
    const serra = A.serra();
    fadd({ X: 3.35, D: F_SERRA, spr: serra.base, luz: serra.luz, serra: true });
    const longe = (D) => D < F_SERRA - 170 || D > F_SERRA + 260; // em volta da faculdade nada tapa a fachada
    for (let D = 150, i = 0; D < F_TOTAL + 900; D += 96, i++) {
      const pr = P.predio(ORDEM[(i * 3 + 5) % ORDEM.length], i * 7 + 1, i % 2 === 0), pl = P.predio(ORDEM[(i * 5 + 2) % ORDEM.length], i * 3 + 4, i % 2 === 1);
      if (longe(D)) {
        fadd({ X: 1.64 + pr.w / 130, D, spr: pr.c, luz: pr.luz });
        fadd({ X: 2.2 + pr.w / 65 + 0.5, D: D + 6, spr: P.arvoreG((i % 5) + 200, 96 + 12 * Math.floor(hash(i * 3) * 3)) });
        fadd({ X: 2 + hash(i * 9) * 1.2, D: D + 60, spr: i % 2 ? P.capim(i, 26) : P.arbusto(i + 9, 26) });
      }
      fadd({ X: -(3.85 + pl.w / 130), D: D + 59, spr: pl.c, luz: pl.luz });
      fadd({ X: -(4.9 + pl.w / 65), D: D + 64, spr: P.arvoreG((i % 5) + 300, 96 + 12 * Math.floor(hash(i * 5) * 3)) });
      fadd({ X: -(4.2 + hash(i * 7) * 1.5), D: D + 2, spr: i % 2 ? P.arbusto(i + 40, 28) : P.capim(i + 3, 26) });
      yield;
    }
    for (let D = 110, i = 0; D < F_TOTAL + 900; D += 92, i++) {
      if (longe(D + 60)) fadd({ X: 1.29, D, spr: P.arvoreG((i % 4) + 400, 72 + 8 * Math.floor(hash(i * 3) * 3)) });
      fadd({ X: -3.47, D: D + 40, spr: P.arvoreG((i % 4) + 500, 72 + 8 * Math.floor(hash(i * 7) * 3)) });
    }
    for (let D = 150, i = 0; D < F_TOTAL + 1100; D += 110, i++) fadd({ X: -1.12, D, spr: i % 2 ? P.palmeira(i + 9, 56 + Math.round(hash(i) * 12), 1.8) : P.arbusto(i + 80, 18 + Math.round(hash(i) * 8)) });
    for (let D = 240, i = 0; D < F_TOTAL + 1100; D += 300, i++) { fadd({ X: 1.08, D, spr: poste2, lamp: -1 }); fadd({ X: -1.12, D: D + 150, spr: poste2, lamp: 1 }); }
    S.fundo = fo;
    S.pronto = true;
  }

  /* ------------------------------------------------------------------ */
  /* Desenho                                                             */
  /* ------------------------------------------------------------------ */
  function walkFrame(sheet, dir, dist) { return sheet[dir].walk[Math.floor(dist / 6.5) % 4]; }
  // o mundo é desenhado em duas camadas ao mesmo tempo: G (as cores de dia) e LG (só o que acende).
  // Tudo o que entra em G "apaga" o que estiver atrás em LG: assim uma árvore na frente tapa a janela acesa.
  let G = null, LG = null, LON = false;
  function put(c, x, y, w, h) {
    x = Math.round(x); y = Math.round(y);
    if (w == null) { G.drawImage(c, x, y); if (LON) LG.drawImage(c, x, y); }
    else { w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h)); G.drawImage(c, x, y, w, h); if (LON) LG.drawImage(c, x, y, w, h); }
  }
  function putLuz(c, x, y, w, h) {
    if (!LON) return;
    LG.globalCompositeOperation = 'source-over';
    if (w == null) LG.drawImage(c, Math.round(x), Math.round(y)); else LG.drawImage(c, Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
    LG.globalCompositeOperation = 'destination-out';
  }
  // uma pessoa na escala da viagem (PS: ~20 px de altura), com a sombra
  function person(frame, x, y) {
    R(G, Math.round(x) - 3, Math.round(y) - 1, 7, 1, 'rgba(0,0,0,0.3)');
    put(frame, x - CH.AX * PS, y - CH.AY * PS, frame.width * PS, frame.height * PS);
  }
  function camadas(VW, VH) {
    for (const n of ['buf', 'buf2', 'wbuf', 'lbuf']) if (!S[n] || S[n].width !== VW || S[n].height !== VH) { S[n] = DL.mk(VW, VH); S[n + 'G'] = S[n].getContext('2d'); S[n + 'G'].imageSmoothingEnabled = false; }
  }
  function mundoIni(VW, VH, on, tx, ty) {
    G = S.wbufG; LG = S.lbufG; LON = on > 0.03;
    for (const g of [G, LG]) { g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.imageSmoothingEnabled = false; g.clearRect(0, 0, VW, VH); g.setTransform(1, 0, 0, 1, tx, ty); }
    LG.globalCompositeOperation = 'destination-out';
    return G;
  }
  // fecha o mundo: escurece conforme a hora e cola na imagem; depois soma o que está aceso
  function mundoFim(g, VW, VH, day, warm, on) {
    G.setTransform(1, 0, 0, 1, 0, 0);
    G.globalCompositeOperation = 'source-atop';
    if (warm > 0.02) { G.fillStyle = 'rgba(255,140,70,' + (0.14 * warm).toFixed(3) + ')'; G.fillRect(0, 0, VW, VH); }
    G.fillStyle = 'rgba(8,10,34,' + (0.66 * day).toFixed(3) + ')';
    G.fillRect(0, 0, VW, VH);
    G.globalCompositeOperation = 'source-over';
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(S.wbuf, 0, 0);
    if (LON) { g.globalAlpha = on; g.drawImage(S.lbuf, 0, 0); g.globalAlpha = 1; }
  }
  function luzes(g, lights) {
    for (const L of lights) {
      if (L.beam) { beam(g, L.x, L.y, L.dir, L.len || 70, L.a); continue; }
      if (L.c[3] <= 0.005) continue;
      if (L.flat) { g.save(); g.translate(L.x, L.y); g.scale(1, 0.35); glow(g, 0, 0, L.r, L.c); g.restore(); }
      else glow(g, L.x, L.y, L.r, L.c);
    }
  }
  // céu: laranja e rosa no pôr do sol, azul-escuro à noite; sol, nuvens e os morros
  function ceu(g, VW, base, day, warm, par, t) {
    const sky = g.createLinearGradient(0, 0, 0, base);
    sky.addColorStop(0, mix('#4b2f7a', '#060918', day)); sky.addColorStop(0.6, mix('#e0607e', '#141734', day)); sky.addColorStop(1, mix('#ffa152', '#2b2250', day));
    g.fillStyle = sky;
    g.fillRect(0, 0, VW, base + 6);
    const sunX = Math.round(120 - par * 0.04), sunY = Math.round(base - 16 + day * 50);
    if (day < 0.7) { disc(g, sunX, sunY, 10, mix('#ffc06a', '#ff7a4a', day * 1.4)); disc(g, sunX, sunY, 7, '#ffe6a0'); }
    const cloudA = 1 - smooth(0.3, 0.8, day);
    if (cloudA > 0) {
      g.globalAlpha = cloudA * 0.8;
      for (let i = 0; i < 7; i++) {
        const w = 26 + Math.round(hash(i * 3) * 40), x = ((i * 97 + 40 - par * 0.06) % (VW + 160) + VW + 160) % (VW + 160) - 80, y = base - 74 + Math.round(hash(i * 7) * 46);
        R(g, Math.round(x), y, w, 2, i % 2 ? '#ff9fb0' : '#ffb98a'); R(g, Math.round(x) + 6, y - 1, w - 14, 1, '#ffd0b0');
      }
      g.globalAlpha = 1;
    }
    const hillFar = mix('#8a4f86', '#141433', day), hillNear = mix('#5e3a6e', '#0e1028', day);
    // (os morros: uma coluna de 1 px por x, mas tudo num caminho só e um fill por cor — bem mais leve que 2 × VW fillRect)
    for (const [col, fn] of [[hillFar, (x) => { const w1 = x + par * 0.12; return 14 + 7 * Math.sin(w1 * 0.012) + 4 * Math.sin(w1 * 0.033 + 1.3); }], [hillNear, (x) => { const w2 = x + par * 0.25; return 7 + 4 * Math.sin(w2 * 0.02 + 2) + 3 * Math.sin(w2 * 0.05); }]]) {
      g.beginPath();
      for (let x = 0; x < VW; x++) { const h = fn(x); g.rect(x, Math.round(base - h), 1, Math.ceil(h) + 2); }
      g.fillStyle = col; g.fill();
    }
    return [sunX, sunY];
  }
  function estrelas(g, VW, base, day, t) {
    if (day <= 0.5) return;
    for (let i = 0; i < 60; i++) { const a = (day - 0.5) * 2 * (0.5 + 0.5 * Math.sin(t * 2 + i)); R(g, Math.round(hash(i * 3) * VW), Math.round(hash(i * 7) * (base - 30)), 1, 1, 'rgba(230,235,255,' + a.toFixed(3) + ')'); }
  }

  /* ---------------- plano 1: de lado ---------------- */
  function lado(g, VW, VH, oy, t, day, on, warm) {
    const cx = carX(t), virando = t > TL.vira;
    const pas = S.pas, kp = pas ? smooth(0, 2.6, t - S.t0) : 1;
    let target = t < TL.go ? X_START - VW * 0.45 : cx - VW * lerp(pas ? clamp(pas.fx, 0.2, 0.8) : 0.4, 0.4, kp);
    target = lerp(target, DX + 14 - VW / 2, smooth(TL.vira - 2.6, TL.vira + 0.9, t));
    S.cam = S.cam == null ? target : S.cam + (target - S.cam) * Math.min(1, S.dt * 4);
    S.cam = clamp(S.cam, 0, END_X - VW);
    const cam = Math.round(S.cam);

    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    const [sunX, sunY] = ceu(g, VW, oy + HZ, day, warm, cam, t);
    /* a cidade do outro lado do lago e a Prefeitura */
    const town = mix('#4a3456', '#121530', day), winLit = [];
    const pfX = Math.round(PREF_X - cam * 0.5), pfB = oy + HZ + 3;
    for (let k = Math.floor((cam * 0.5) / 24) - 2, n = k + Math.ceil(VW / 24) + 4; k < n; k++) {
      if (hash(k * 11 + 3) < 0.22) continue;
      const bx = Math.round(k * 24 + hash(k) * 8 - cam * 0.5), w = 12 + Math.round(hash(k * 3) * 16), h = 4 + Math.round(hash(k * 7) * 12);
      if (bx + w > pfX - 6 && bx < pfX + PREF.width + 6) continue;
      R(g, bx, oy + HZ + 2 - h, w, h, town);
      for (let wy = 2; wy < h - 1; wy += 3) for (let wx = 2; wx < w - 1; wx += 3) if (hash(k * 131 + wx * 7 + wy * 13) > 0.62) winLit.push([bx + wx, oy + HZ + 2 - h + wy]);
    }
    if (pfX < VW && pfX + PREF.width > 0) {
      const pg = S.pfG;
      pg.globalCompositeOperation = 'source-over'; pg.clearRect(0, 0, PREF.width, PREF.height); pg.drawImage(PREF, 0, 0);
      pg.globalCompositeOperation = 'source-atop';
      if (warm > 0.02) { pg.fillStyle = 'rgba(255,150,80,' + (0.22 * warm).toFixed(3) + ')'; pg.fillRect(0, 0, PREF.width, PREF.height); }
      pg.fillStyle = 'rgba(110,70,130,0.2)'; pg.fillRect(0, 0, PREF.width, PREF.height);
      pg.fillStyle = 'rgba(10,12,36,' + (0.62 * day).toFixed(3) + ')'; pg.fillRect(0, 0, PREF.width, PREF.height);
      g.drawImage(S.pfBuf, pfX, pfB - PREF.height);
      for (const [wx, wy] of PREF.lit) winLit.push([pfX + wx, pfB - PREF.height + wy]);
    }
    g.globalCompositeOperation = 'lighter';
    if (warm > 0.02) glow(g, sunX, sunY, 80, [255, 160, 90, 0.45 * warm]);
    estrelas(g, VW, oy + HZ, day, t);
    if (on > 0.05) for (const [wx, wy] of winLit) R(g, wx, wy, 1, 1, 'rgba(255,200,120,' + (0.8 * on).toFixed(3) + ')');
    g.globalCompositeOperation = 'source-over';

    /* ---- o mundo ---- */
    const w = mundoIni(VW, VH, on, -cam, oy);
    const x0 = cam, x1 = cam + VW;
    const span = (a, b, y0, y1, col) => { const X = Math.max(a, x0 - 2), Y = Math.min(b, x1 + 2); if (Y > X) R(w, X, y0, Y - X, y1 - y0, col); };
    span(-1e4, 1e5, HZ, WATER, mix('#4a3048', '#0e1022', day));
    const water = w.createLinearGradient(0, WATER, 0, MARGIN);
    water.addColorStop(0, mix('#f0a08a', '#1b2142', day)); water.addColorStop(1, mix('#9a5a7e', '#0f1328', day));
    span(-400, LAKE_END, WATER, MARGIN, water);
    for (let y = WATER + 2; y < MARGIN - 1; y += 3) for (let k = 0; k < 10; k++) {
      const wx = Math.round(((hash(y * 17 + k) * 1400 + t * (y % 2 ? 6 : -6)) % 1400) - 200);
      if (wx < LAKE_END - 8 && wx > x0 - 10 && wx < x1) R(w, wx, y, 4 + (k % 3) * 2, 1, mix('#ffc8a8', '#2c3460', day));
    }
    if (warm > 0.02) {
      const rx = cam + sunX;
      w.globalAlpha = warm;
      for (let y = WATER; y < MARGIN; y++) { const ww = 2 + Math.round((y - WATER) * 0.4 + 2 * Math.sin(t * 3 + y * 1.7)), off = Math.round(2 * Math.sin(t * 2 + y)); if (rx < LAKE_END) R(w, rx - ww + off, y, 2 * ww, 1, y % 2 ? '#ffd38a' : '#ffb36b'); }
      w.globalAlpha = 1;
    }
    // beira do lago e canteiro
    span(-400, LAKE_END, MARGIN, MARGIN + 2, '#c9c2b5'); span(-400, LAKE_END, MARGIN + 2, MARGIN + 3, '#e8c15a');
    span(-400, LAKE_END + 30, MARGIN + 3, ROAD0, '#4f8a4a'); span(LAKE_END - 3, LAKE_END, WATER, MARGIN + 3, '#c9c2b5');
    // depois do lago: terrenos com gramado
    span(LAKE_END, 1e5, WATER, LOTE, '#6f8a54');
    for (let x = Math.max(LAKE_END, x0 - (x0 % 7)); x < x1; x += 7) R(w, x, 100 + Math.round(hash(x) * 18), 2, 1, hash(x * 3) > 0.5 ? '#84a05e' : '#5e7a48');
    // a mata ao fundo, em duas camadas mais lentas que a rua (só depois do lago)
    w.save(); w.beginPath(); w.rect(LAKE_END + 30, 0, 1e5, H0 + 60); w.clip();
    const camada = (lista, par) => {
      const off = cam * (1 - par);
      for (const o of lista) {
        const hw = o.spr.width / 2, wx = o.lx + off;
        if (wx + hw < x0 || wx - hw > x1) continue;
        put(o.spr, wx - hw, o.y - o.spr.height);
        if (o.luz) putLuz(o.luz, wx - hw, o.y - o.spr.height);
      }
    };
    for (const [i, par, by] of [[0, 0.5, 108], [1, 0.75, 117]]) {
      const m = S.mata[i], off = cam * (1 - par);
      for (let k = Math.floor((x0 - off) / m.width) - 1; k * m.width + off < x1; k++) { const mx = Math.round(k * m.width + off); w.drawImage(m, mx, by - m.height); R(w, mx, by, m.width, 6, i ? '#447046' : '#5a7c6c'); }
      camada(i ? S.meio : S.longe, i ? 0.82 : 0.6);   // longe depois da 1ª mata; meio depois da 2ª
    }
    w.restore();
    span(LAKE_END + 30, 1e5, LOTE - 2, LOTE, '#7a8a5a');
    // calçada de tijolinho (fotos 02 e 03) e o canteiro de grama
    span(LAKE_END + 30, 1e5, LOTE, 130, '#a8564a');
    for (let y = LOTE; y < 130; y += 2) span(LAKE_END + 30, 1e5, y, y + 1, '#8a4038');
    for (let x = Math.max(LAKE_END + 30, x0 - (x0 % 9)); x < x1; x += 9) R(w, x, LOTE, 1, 8, '#96483e');
    span(LAKE_END + 30, 1e5, 130, ROAD0, '#4f8a4a');
    for (let x = Math.max(LAKE_END + 30, x0 - (x0 % 5)); x < x1; x += 5) R(w, x, 131 + Math.round(hash(x * 7) * 3), 1, 2, hash(x) > 0.5 ? '#5f9d52' : '#447a40');
    // vagas em frente à SkyFit
    span(SF_X + 6, SF_X + SF_W - 4, 130, ROAD0, '#55595f');
    for (let x = SF_X + 8; x < SF_X + SF_W - 4; x += 60) span(x, x + 1, 130, ROAD0, '#c9ccd1');
    // rotatória: pracinha e calçada de concreto
    span(PA_END, DX + 44, LOTE, 128, '#6f9a55'); span(PA_END, DX + 44, 128, ROAD0, '#b9b4ad');
    for (let x = Math.max(PA_END, x0 - (x0 % 12)); x < Math.min(DX + 44, x1); x += 12) R(w, x, 128, 1, 8, '#a39e96');
    // a avenida que vai para o fundo (em perspectiva, com a curva)
    if (x1 > DX - 60 && x0 < DX + 90) {
      for (let y = VPY + 1; y < ROAD0; y++) {
        const r = ruaFundo(y), a = Math.round(r.x - r.hw), b = Math.round(r.x + r.hw);
        R(w, a - 2 - Math.round(r.k * 5), y, b - a + 4 + Math.round(r.k * 10), 1, '#b9b4ad'); // calçadas
        R(w, a, y, b - a, 1, '#474c57');
        R(w, a, y, 1, 1, '#d9dde3'); R(w, b - 1, y, 1, 1, '#d9dde3');
        if (Math.floor(9 / (r.k + 0.08)) % 2 === 0 && r.hw > 5) R(w, Math.round(r.x), y, 1, 1, '#e8c15a');
      }
    }
    // a avenida
    span(-1e4, 1e5, ROAD0, ROAD1, '#474c57');
    for (let x = Math.floor(x0 / 6) * 6; x < x1; x += 6) R(w, x + Math.round(hash(x) * 4), ROAD0 + 2 + Math.round(hash(x * 3) * 26), 1, 1, '#555a66');
    span(-1e4, 1e5, ROAD0, ROAD0 + 1, '#5d6573'); span(-1e4, 1e5, ROAD1 - 1, ROAD1, '#9aa3b0');
    span(DX - 31, DX + 31, ROAD0, ROAD0 + 1, '#474c57');
    for (let x = Math.floor(x0 / 16) * 16; x < x1; x += 16) if ((x < 1040 || x > PA_END + 20) && Math.abs(x + 4 - ROT_X) > 46 && Math.abs(x + 4 - DX) > 40) R(w, x, CENTER, 8, 1, '#d9dde3');
    // canteiro central com grama (na PA-160)
    span(1050, PA_END + 14, 149, 154, '#c9ccd1'); span(1052, PA_END + 12, 150, 153, '#4f8a4a');
    for (let x = Math.max(1052, x0 - (x0 % 4)); x < Math.min(PA_END + 12, x1); x += 4) R(w, x, 150 + (x % 3), 1, 1, '#62a052');
    for (let y = ROAD0 + 2; y < ROAD1 - 2; y += 4) span(PA_END + 34, PA_END + 46, y, y + 2, '#e9ecef'); // faixa de pedestre
    span(-1e4, 1e5, ROAD1, WALK, '#9aa3b0'); span(-1e4, 1e5, WALK, FRONT, '#8e8a84');
    for (let x = Math.floor(x0 / 12) * 12; x < x1; x += 12) R(w, x, WALK, 1, FRONT - WALK, '#7a7670');
    span(-1e4, 1e5, FRONT, H0 + 60, '#3f6e3c');
    for (let x = Math.floor(x0 / 5) * 5; x < x1; x += 5) R(w, x, FRONT + 1 + Math.round(hash(x * 5) * 10), 1, 2, hash(x) > 0.5 ? '#4f8244' : '#33603a');

    // sombras compridas do pôr do sol (só no lago)
    if (warm > 0.02) {
      w.fillStyle = 'rgba(20,10,30,' + (0.3 * warm).toFixed(3) + ')';
      const sunW = cam + sunX;
      for (const o of S.statics) {
        if (!o.lake || o.x < x0 - 40 || o.x > x1 + 40) continue;
        const ww = o.r || 1, len = o.r ? 22 + o.r : 30, dir = o.x > sunW ? 1 : -1;
        w.beginPath(); w.moveTo(o.x - ww, o.y); w.lineTo(o.x + ww, o.y); w.lineTo(o.x + ww + dir * len * 0.45, o.y + len * 0.5); w.lineTo(o.x - ww + dir * len * 0.45, o.y + len * 0.5); w.closePath(); w.fill();
      }
    }

    // tudo o que fica em pé, de trás para a frente
    const lights = [], list = [];
    for (const o of S.statics) if (o.x > x0 - 240 && o.x < x1 + 240) list.push(o);
    for (const p of S.people) {
      if (p.parado) { list.push({ k: 'walker', y: p.y, x: p.a, dir: p.parado, parado: true, sheet: p.sheet }); continue; }
      const L = p.b - p.a, q = (((p.ph + p.sp * t) % (2 * L)) + 2 * L) % (2 * L);
      list.push({ k: 'walker', y: p.y, x: q < L ? p.a + q : p.a + 2 * L - q, dir: q < L ? 'right' : 'left', dist: p.sp * t, sheet: p.sheet });
    }
    const dwx = 2500 - 11 * t;
    list.push({ k: 'walker', y: 128, x: dwx, dir: 'left', dist: 11 * t, sheet: S.dogWalker });
    list.push({ k: 'dog', y: 129, x: dwx - 14, step: Math.floor(t * 6) });
    for (const c of S.traffic) { const tx = c.x0 - c.v * (t - c.t0); if (tx > x0 - 140 && tx < x1 + 140) list.push({ k: 'traffic', y: FAR, x: tx, spr: c.spr }); }
    const cv = virando ? curva(t) : null;
    list.push(cv ? { k: 'vira', x: cv[0], y: cv[1], a: cv[2], s: cv[3] } : { k: 'hero', y: NEAR + (Math.abs(cx - ROT_X) < 70 ? 2 * Math.cos(((Math.abs(cx - ROT_X) / 70) * Math.PI) / 2) : 0), x: cx });
    let hb = null;
    if (t < TL.walk0) hb = { x: 150, y: 174, dir: 'right', walk: false };
    else if (t < TL.walk1) hb = { x: lerp(150, 238, (t - TL.walk0) / (TL.walk1 - TL.walk0)), y: 174, dir: 'right', walk: true, dist: (t - TL.walk0) * 26 };
    else if (t < TL.inCar) hb = { x: 238, y: 174, dir: 'up', walk: false, a: 1 - smooth(TL.walk1 + 0.2, TL.inCar, t) };
    if (hb) list.push(Object.assign({ k: 'boneco' }, hb));
    list.sort((a, b) => a.y - b.y || a.x - b.x);

    for (const o of list) {
      switch (o.k) {
        case 'spr':
          if (o.spr.sombra) oval(w, Math.round(o.x), Math.round(o.y), o.spr.sombra, 3, 'rgba(12,24,14,0.24)'); // a sombra da copa
          put(o.spr, o.x - (o.spr.width >> 1), o.y - o.spr.height);
          if (o.luz) putLuz(o.luz, o.x - (o.spr.width >> 1), o.y - o.spr.height);
          if (o.lights && on > 0.01) for (const [dx, dy, r, c, flat] of o.lights) lights.push({ x: o.x + dx, y: o.y + dy, r, c: [c[0], c[1], c[2], c[3] * on], flat: !!flat });
          break;
        case 'sprS': put(o.spr, o.x - (o.spr.width * o.s) / 2, o.y - o.spr.height * o.s, o.spr.width * o.s, o.spr.height * o.s); break;
        case 'lamp': lamp(w, o.x, o.y, on, lights); break;
        case 'poste': poste(w, o, on, lights); break;
        case 'dog': dog(w, o.x, o.y, o.step); break;
        case 'island': {
          oval(w, o.x, o.y, 37, 8, '#e9ecef'); oval(w, o.x, o.y, 35, 7, '#9aa3b0'); oval(w, o.x, o.y - 1, 33, 6, '#4f8a4a');
          const tr = S.ilha || (S.ilha = P.arvoreG(7, 66)), b1 = S.ilhaB || (S.ilhaB = P.arbusto(4, 18));
          put(b1, o.x - 26, o.y + 2 - b1.height); put(b1, o.x + 12, o.y + 3 - b1.height); put(tr, o.x - (tr.width >> 1), o.y + 1 - tr.height);
          break;
        }
        case 'parked': put(o.dir > 0 ? S.parkedSpr[o.col].r : S.parkedSpr[o.col].l, o.x - 26, o.y - 21); break;
        case 'traffic': {
          const sw = o.spr.l.width, sh = o.spr.l.height;
          put(o.spr.l, o.x - sw / 2, o.y - sh + 1);
          if (on > 0.01) lights.push({ beam: true, x: o.x - sw / 2 + 1, y: o.y - 9, dir: -1, a: 0.35 * on }, { x: o.x + sw / 2 - 1, y: o.y - 9, r: 4, c: [255, 60, 60, 0.7 * on] });
          break;
        }
          break;
        case 'hero': {
          put(S.cars.hero.r, o.x - 26, o.y - 21);
          if (t > TL.inCar) { // o boneco sentado aparece pela janela da frente
            const x0c = Math.round(o.x) - 25, by = Math.round(o.y);
            w.save(); w.beginPath(); w.rect(x0c + 25, by - 18, 11, 5); w.clip(); w.drawImage(S.hero.right.idle, x0c + 30 - CH.AX, by - 15 - 11); w.restore();
          }
          if (t > TL.walk1 && t < TL.inCar + 0.2) R(w, Math.round(o.x) - 1, Math.round(o.y) - 17, 1, 12, '#f4f6fa'); // porta aberta
          const hl = Math.max(on, t > TL.go - 0.5 ? 0.3 : 0);
          if (hl > 0.01) lights.push({ beam: true, x: o.x + 25, y: o.y - 9, dir: 1, a: 0.45 * hl }, { x: o.x - 25, y: o.y - 9, r: 4, c: [255, 60, 60, 0.8 * hl] });
          // a seta para a direita, um pouco antes de virar
          if (t > TL.vira - 2.4 && Math.floor(t * 3.2) % 2 === 0) { R(w, Math.round(o.x) + 23, Math.round(o.y) - 8, 2, 2, '#ffb030'); lights.push({ x: o.x + 24, y: o.y - 7, r: 5, c: [255, 170, 40, 0.9] }); }
          break;
        }
        case 'vira': { // o carro virando: a traseira aparece cada vez mais, a lateral some, e ele diminui indo para o fundo
          const s = o.s, rw = 30 * Math.sin(o.a) * s, sw = 52 * Math.cos(o.a) * s, left = o.x - (rw + sw) / 2;
          if (sw >= 1) put(S.cars.hero.r, left + rw, o.y - 21 * s, sw, 22 * s);
          if (rw >= 1) put(S.heroTras, left, o.y - 23 * s, rw, 24 * s);
          const hl = Math.max(on, 0.3);
          lights.push({ x: left + rw * 0.2, y: o.y - 11 * s, r: 4 * s + 1, c: [255, 60, 60, 0.8 * hl] }, { x: left + rw * 0.8, y: o.y - 11 * s, r: 4 * s + 1, c: [255, 60, 60, 0.8 * hl] });
          if (o.a < 1.2 && Math.floor(t * 3.2) % 2 === 0) lights.push({ x: left + rw + sw - 2, y: o.y - 8 * s, r: 5, c: [255, 170, 40, 0.9] });
          break;
        }
        case 'walker': person(o.parado ? o.sheet[o.dir].idle : walkFrame(o.sheet, o.dir, o.dist), o.x, o.y); break;
        case 'boneco': w.globalAlpha = o.a == null ? 1 : o.a; person(o.walk ? walkFrame(S.hero, o.dir, o.dist) : S.hero[o.dir].idle, o.x, o.y); w.globalAlpha = 1; break;
      }
    }
    // a camada da frente: arbustos, capim e palmeiras que passam mais depressa que a rua
    for (const f of S.frente) {
      const fx = 1.4 * (f.wx - cam) - 0.2 * VW + cam;
      if (fx < x0 - 50 || fx > x1 + 50) continue;
      put(f.spr, fx - (f.spr.width >> 1), FRONT + 5 - f.spr.height);
    }
    mundoFim(g, VW, VH, day, warm, on);

    /* ---- luzes (somam) ---- */
    g.globalCompositeOperation = 'lighter';
    g.setTransform(1, 0, 0, 1, -cam, oy);
    if (warm > 0.02 && cam + sunX < LAKE_END) glow(g, cam + sunX, WATER + 10, 60, [255, 170, 100, 0.3 * warm]);
    luzes(g, lights);
    g.globalCompositeOperation = 'source-over';
    g.setTransform(1, 0, 0, 1, 0, 0);
  }

  /* ---------------- plano 2: para o fundo (câmera atrás do carro) ---------------- */
  function fundo(g, VW, VH, oy, t, day, on, warm) {
    const tt = t - F_T0, dist = fDist(tt), hy = oy + HZ - 2, DYC = VH - 18 - hy, K = 60 * DYC, WS = 65 / DYC, cx0 = (VW >> 1) - 30;
    const bend = (1 - smooth(0, 3.6, tt)) - 0.38 * smooth(4.2, 6, tt) * (1 - smooth(F_DUR - 3.6, F_DUR - 1.6, tt));
    const cAt = (dy) => { const p = Math.min(1, dy / DYC); return cx0 + bend * 84 * (1 - p) * (1 - p); };
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    ceu(g, VW, hy + 2, day, warm, 2000 + dist * 0.5 + bend * 900, t);
    g.globalCompositeOperation = 'lighter';
    estrelas(g, VW, hy, day, t);
    g.globalCompositeOperation = 'source-over';

    const w = mundoIni(VW, VH, on, 0, 0);
    // a mata no horizonte
    for (let i = 0; i < 2; i++) { const m = S.mata[i], off = Math.round(-((bend * 60 * (i + 1) + dist * 0.01 * (i + 1)) % m.width)); for (let x = off - m.width; x < VW; x += m.width) w.drawImage(m, x, hy + 2 + i * 2 - m.height + 6); }
    // o chão, linha a linha (mais longe = mais perto do horizonte)
    for (let y = hy + 1; y < VH; y++) {
      const dy = y - hy, z = K / dy, d = z + dist, ws = dy * WS, c = cAt(dy), b = Math.floor(d / 46) & 1;
      const seg = (xa, xb, col) => { const a = Math.round(c + xa * ws), e = Math.round(c + xb * ws); R(w, a, y, Math.max(1, e - a), 1, col); };
      R(w, 0, y, VW, 1, b ? '#6f8a54' : '#668050');
      if (dy > 3) for (let k = 0; k < 5; k++) { const hx = hash(Math.floor(d / 23) * 7 + k * 31), X = (hx - 0.5) * 16; if (X > 1.6 || X < -3.8) R(w, Math.round(c + X * ws), y, Math.max(1, Math.round(ws * 0.12)), 1, k % 2 ? '#7f9c5c' : '#5a7446'); }
      seg(-3.75, -3.2, b ? '#b9b4ad' : '#aeaaa2'); seg(-3.2, -1.3, b ? '#474c57' : '#4b505b');
      seg(-0.98, 0.98, b ? '#474c57' : '#4b505b');
      seg(-1.33, -0.95, '#c9ccd1'); seg(-1.27, -1.01, b ? '#4f8a4a' : '#478043');
      seg(0.98, 1.05, '#d9dde3'); seg(1.05, 1.55, b ? '#b9b4ad' : '#aeaaa2');
      if (Math.floor(d / 30) & 1) { seg(-0.015, 0.015, '#e9ecef'); seg(-2.265, -2.235, '#e9ecef'); }
    }
    // o que passa dos lados, do mais longe para o mais perto
    const lights = [], vis = [];
    for (const o of S.fundo) { const z = o.D - dist; if (z > 34 && z < (o.serra ? 2600 : 1500)) vis.push([z, o]); }
    S.frenteCar.forEach((spr, i) => { const z = 300 + i * 950 - (FV * 0.9 + 60) * tt + dist * 0; if (z > 34 && z < 2600) vis.push([z, { X: -2.25, spr, farol: true }]); });
    vis.sort((a, b) => b[0] - a[0]);
    const carX2 = lerp(0.44, 0.76, smooth(F_DUR - 4.2, F_DUR - 0.8, tt)), yc = hy + DYC, carPx = cAt(DYC) + carX2 * 65;
    let carDone = false;
    const heroi = () => {
      carDone = true;
      R(w, Math.round(carPx) - 15, yc - 1, 30, 2, 'rgba(0,0,0,0.35)');
      put(S.heroTras, carPx - 15, yc - 23);
      const freio = tt > F_DUR - FDEC ? 1 : 0.55, hl = Math.max(on, 0.3);
      for (const dx of [-9, 9]) lights.push({ x: carPx + dx, y: yc - 10, r: 5 + freio * 3, c: [255, 50, 40, 0.75 * hl * freio + 0.2] });
      lights.push({ x: carPx, y: yc - 40, r: 60, c: [255, 236, 180, 0.2 * hl], flat: true });
      if (tt > F_DUR - 4.4 && tt < F_DUR - 0.3 && Math.floor(t * 3.2) % 2 === 0) { R(w, Math.round(carPx) + 12, yc - 12, 2, 3, '#ffb030'); lights.push({ x: carPx + 13, y: yc - 10, r: 6, c: [255, 170, 40, 0.9] }); }
    };
    for (const [z, o] of vis) {
      if (!carDone && z < 60) heroi();
      const dy = K / z, y = hy + dy, s = 60 / z, x = cAt(dy) + o.X * dy * WS, sw = o.spr.width * s, sh = o.spr.height * s;
      if (x + sw < -20 || x - sw > VW + 20) continue;
      // (de longe, o que é pequeno não precisa tapar as janelas acesas: metade dos desenhos)
      const lon = LON; if (s < 0.3 && !o.luz) LON = false;
      put(o.spr, x - sw / 2, y - sh, sw, sh);
      LON = lon;
      if (o.luz && s > 0.07) putLuz(o.luz, x - sw / 2, y - sh, sw, sh);
      if (o.lamp && on > 0.01 && s > 0.1) { const lx = x + (o.lamp < 0 ? 4 : 4) * s, ly = y - 58 * s; lights.push({ x: lx, y: ly, r: 10 * s + 2, c: [255, 214, 150, 0.9 * on] }, { x: lx, y: y + 6 * s, r: 50 * s, c: [255, 196, 120, 0.2 * on], flat: true }); }
      if (o.farol && s > 0.06) for (const dx of [-9, 9]) lights.push({ x: x + dx * s, y: y - 10 * s, r: 7 * s + 2, c: [255, 240, 190, 0.5 + 0.4 * on] });
      if (o.serra) { // a luz quente da recepção e da marquise, e o letreiro
        const al = 0.25 + 0.75 * on;
        lights.push({ x: x - 22 * s, y: y - 20 * s, r: 60 * s, c: [255, 190, 120, 0.3 * al] }, { x, y: y - 86 * s, r: 90 * s, c: [225, 235, 255, 0.14 * al] }, { x: x - 22 * s, y: y + 10 * s, r: 70 * s, c: [255, 190, 120, 0.22 * al], flat: true });
      }
    }
    if (!carDone) heroi();
    mundoFim(g, VW, VH, day, warm, on);
    g.globalCompositeOperation = 'lighter';
    luzes(g, lights);
    g.globalCompositeOperation = 'source-over';
  }

  function render(sc) {
    const t = S.t, cv = sc.canvas, cw = cv.width, ch = cv.height;
    const PX = Math.max(1, Math.round(ch / 235)); // tamanho de cada pixel do mundo na tela (720 px de altura → 3)
    const VW = Math.ceil(cw / PX), VH = Math.ceil(ch / PX), oyB = VH - H0 - Math.round(VH * 0.06);
    camadas(VW, VH);
    const day = smooth(6, 41, t), on = smooth(0.3, 0.65, day), warm = 1 - smooth(0.05, 0.45, day);
    // vindo do lago: o carro começa no mesmo ponto da tela em que estava lá e a câmera se ajeita devagar
    const pas = S.pas, kp = pas ? 1 - smooth(0, 2.6, t - S.t0) : 0;
    const oy = oyB + (pas ? Math.round(clamp(pas.fy * VH - (NEAR - 8 + oyB), -28, 8) * kp) : 0);
    const g = S.bufG;
    if (t < TL.fundo) lado(g, VW, VH, oy, t, day, on, warm);
    if (t > F_T0) {
      const g2 = t < TL.fundo ? S.buf2G : g;
      fundo(g2, VW, VH, oyB, t, day, on, warm);
      if (g2 !== g) { g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = smooth(F_T0, TL.fundo, t); g.drawImage(S.buf2, 0, 0); g.globalAlpha = 1; }
    }
    /* ---- entrada e saída em preto ---- */
    g.setTransform(1, 0, 0, 1, 0, 0);
    let black = pas ? 0 : 1 - smooth(S.t0, S.t0 + (S.t0 ? 0.7 : 1.2), t);
    black = Math.max(black, smooth(TL.para + 0.9, TL.fim, t));
    if (S.skipAt != null) black = Math.max(black, smooth(S.skipAt, S.skipAt + 0.6, t));
    if (black > 0) { g.fillStyle = 'rgba(0,0,0,' + black.toFixed(3) + ')'; g.fillRect(0, 0, VW, VH); }

    const ctx = sc.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(S.buf, 0, 0, VW * PX, VH * PX);
    // a última imagem do lago some por cima (a passagem sem corte)
    if (pas && t - S.t0 < 1.1) { ctx.globalAlpha = 1 - smooth(0, 1.1, t - S.t0); ctx.imageSmoothingEnabled = true; ctx.drawImage(pas.foto, 0, 0, cw, ch); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 1; }
    caption(t);
  }

  // legenda do lugar
  function caption(t) {
    const cx = carX(t);
    let c;
    if (t < TL.go) c = ['Canaã dos Carajás · fim de tarde', 'Lago da Prefeitura · Av. São João'];
    else if (cx < LAKE_END) c = ['Av. São João', 'saindo do Lago da Prefeitura'];
    else if (cx < PA_END - 120) c = ['PA-160', 'Av. Weyne Cavalcante'];
    else if (t < TL.fundo) c = ['Rotatória', 'entrando na Av. Carajás'];
    else if (t < TL.para - 2.6) c = ['Av. Carajás', 'a caminho da faculdade'];
    else c = ['Faculdade Serra Dourada', 'Canaã dos Carajás'];
    const key = c.join('|');
    if (key === S.caption) return;
    S.caption = key;
    const el = $('cutCaption');
    el.classList.remove('is-on');
    el.innerHTML = '<b>' + c[0] + '</b><span>' + c[1] + '</span>';
    void el.offsetWidth;
    el.classList.add('is-on');
  }

  /* ------------------------------------------------------------------ */
  /* O mapa                                                              */
  /* ------------------------------------------------------------------ */
  // no fim: a rua da Serra Dourada (o boneco desce do carro lá); sem ela, o DataLab
  const nextMap = () => (DL.MAPS.rua ? 'rua' : 'datalab');

  function finish(game) {
    if (S.done) return;
    S.done = true;
    DL.chegada = S.skipAt == null; // (rua.js) chegou de carro: o boneco desce; pulou: já começa na calçada
    setTimeout(() => game.loadMap(nextMap()), 0);
  }
  function skip() { if (S.skipAt == null && !S.done) S.skipAt = S.t; }

  DL.registerMap({
    id: 'abertura',
    name: 'Viagem',
    tiles: ['###', '#.#', '###'],
    items: [],
    spawn: [1, 1],

    enter(game) {
      Object.assign(S, { t: 0, t0: 0, dt: 0, cam: null, done: false, skipAt: null, caption: '', pas: null });
      // (lago.js) vindo do Lago da Prefeitura o carro já está saindo: começa andando, por baixo da última imagem de lá
      if (DL.fromLake) { DL.fromLake = false; S.t = S.t0 = TL.go + 1.1; S.pas = DL.passagem || null; DL.passagem = null; }
      // ?mapa=abertura&t=30 começa no segundo 30 (para testar um trecho)
      const t0 = parseFloat(new URLSearchParams(location.search).get('t'));
      if (t0 > 0 && !S.pas) S.t = S.t0 = Math.min(t0, TL.fim - 0.5);
      build();
      game.locked = true;
      document.body.classList.add('in-cutscene');
      $('cutscene').hidden = false;
      $('cutSkip').onclick = skip;
      game.scene.drawInstead = () => { render(game.scene); return true; };
    },
    update(game, dt) {
      S.dt = dt;
      S.t += dt;
      const end = S.skipAt != null ? S.skipAt + 0.7 : TL.fim + 0.05;
      if (S.t >= end) finish(game);
    },
    key(game, ev) {
      if (ev.code === 'Escape' || ev.code === 'Enter' || ev.code === 'Space') { skip(); ev.preventDefault(); }
      return true;
    },
    leave(game) {
      game.scene.drawInstead = null;
      document.body.classList.remove('in-cutscene');
      $('cutscene').hidden = true;
      $('cutCaption').classList.remove('is-on');
    },
  });
  DL.Abertura = { S, TL, preparar };
})();

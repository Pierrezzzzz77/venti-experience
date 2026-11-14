/* Venti Experience — Parte 0: o Lago da Prefeitura (cenário).
   O mapa em tiles (16 × 16 px), o chão e os objetos em pé (árvores, postes, placa, prédios, carros),
   em pixel art isométrica como a rua do DataLab (street.js).

   TUDO sai do MAPA LÓGICO (lago-mapa.js): a grade diz o tipo de cada tile (água, grama, calçada, rua,
   lote, prédio...). Os tiles do motor, o chão pintado e o lugar de cada objeto vêm dela:
     · prédios só nos lotes (as casas já vêm prontas do mapa, alinhadas à rua);
     · carros só na pista (na direção dela) ou numa vaga; árvores só na grama, no canteiro, na terra
       ou no quintal; postes só na calçada ou no canteiro; nada em cima da calçada de passagem.
   Forma do lago, praças e trilha: lago-forma.js (foto 13). A Prefeitura: fotos 14 e 08-prefeitura.

   Escala: uma pessoa tem ~31 px de altura (≈ 1,75 m). O mapa é a foto 13 inteira: 200 × 121 tiles.
   Árvores ~130 px, postes ~150 px, carros de 60 × 26 px.

   Este arquivo só monta e desenha; quem usa é lago.js (o mapa), lago-ceu.js (luz e água)
   e lago-vida.js (gente, bichos, trânsito). Tudo fica em DL.Lago. */
(function () {
  'use strict';
  const DL = window.DL, T = DL.T, R = DL.R, hash = DL.hash, K = DL.isoKit, shade = DL.shade, P = DL.Lago.PAL;
  const IX = (x, y) => x - y, IY = (x, y, z) => (x + y) / 2 - (z || 0);
  const F = DL.Lago.F, AV = F.AV, M = DL.Lago.MAPA;

  /* ------------------------------------------------------------------ */
  /* Layout (tiles)                                                      */
  /* ------------------------------------------------------------------ */
  const W = F.W, H = F.H;
  // os lugares do jogo, ao longo da avenida (s, em tiles; sAtX = o s na altura daquele x)
  const S_SPAWN = AV.sAtX(64);   // onde o jogador aparece (calçada, com o lago largo do lado)
  const S_CAR = M.S_CAR;         // o carro do jogador, estacionado junto à calçada
  const S_CROSS = M.S_CROSS;     // a faixa de pedestre, logo depois do carro
  const L = { W, H, F, AV, M, S_SPAWN, S_CAR, S_CROSS };
  const walkMid = (AV.calcada[0] + AV.calcada[1]) / 2;
  L.walkMid = walkMid;
  {
    const [x, y] = AV.world(S_SPAWN, walkMid);
    L.spawn = [Math.floor(x), Math.floor(y)];
  }
  L.lake = F.lago;
  L.inLake = F.inLake;

  // o que há no ponto (x, y) em tiles: a letra do tipo da grade (lago-mapa.js)
  const kindAt = (x, y) => M.letra(x, y);
  L.kindAt = kindAt;
  L.tipoEm = M.nomeEm;
  function tileAt(x, y) {
    if (x === 0 || y === 0 || x === W - 1 || y === H - 1) return 'b'; // borda (o cenário continua por fora, em lago-cidade.js)
    return kindAt(x + 0.5, y + 0.5);
  }
  const ROWS = [];
  for (let y = 0; y < H; y++) { let s = ''; for (let x = 0; x < W; x++) s += tileAt(x, y); ROWS.push(s); }
  L.rows = ROWS;
  L.at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? '#' : ROWS[y][x]);

  // tiles que bloqueiam: água, pistas, canteiro, faixa, estacionamento, lotes e prédios, borda
  Object.assign(DL.SOLID_TILES, { '~': 1, r: 1, c: 1, z: 1, e: 1, B: 1, b: 1, l: 1 });

  /* ------------------------------------------------------------------ */
  /* Chão                                                                */
  /* ------------------------------------------------------------------ */
  const C = {
    grass: P.gr3, grassDark: P.gr2, grassLight: P.gr4,
    walk: P.ne5, walkJoint: P.ne4, yellow: P.sky7, curb: P.ne6,
    asph: P.ne1, asphHi: P.ne2, dash: P.ne6, lot: P.ne2,
    conc: P.ne5, concJ: P.ne4, dirt: P.te5, water: P.wa3,
  };
  L.C = C;
  // o chão simples (tile a tile), só até o preparo pintar o chão de verdade
  const FLAT = { g: C.grass, b: C.dirt, s: C.walk, v: C.conc, m: C.conc, q: C.conc, r: C.asph, z: C.asph, c: C.grass, e: C.lot, B: P.ne3, l: C.dirt, t: C.dirt, '~': C.water };
  for (const k in FLAT) DL.FLOORS[k] = (g, px, py) => R(g, px, py, T, T, FLAT[k]);

  // UMA VEZ, no preparo: o chão inteiro, em pixels do mundo (g sem transformação)
  DL.Lago.paintGround = function (g) {
    // 1. o chão do mapa lógico (a mesma função pinta a cidade em volta, em lago-cidade.js)
    M.pintar(g, T, { x0: 0, y0: 0, x1: W, y1: H }, { rico: true });
    g.save();
    g.setTransform(T, 0, 0, T, 0, 0);
    const px = 1 / T;
    // 2. meio-fio claro na beira do asfalto (menos nos cruzamentos)
    g.fillStyle = C.curb;
    for (const r of M.RUAS) {
      const bb = M.bboxOf(r.pts, 12);
      if (bb[2] < 0 || bb[0] > W || bb[3] < 0 || bb[1] > H) continue;
      for (const b of r.bands) {
        if (b[2] !== 'rua') continue;
        for (const e of [b[0], b[1]]) for (const q of M.bandQuads(r, e - 1.2 * px, e + 1.2 * px, 0, r.len, r.cuts)) { pathQ(g, q); g.fill(); }
      }
    }
    // 3. a faixa amarela na beira da calçada do lago (foto 08), entre a rua do oeste e a Av. José Vicente
    const [sa, sb] = M.CALCADA_LAGO;
    const band = (d0, d1, col) => { g.fillStyle = col; for (const q of M.bandQuads(M.SJ, d0, d1, M.sjS(sa - 3), M.sjS(sb + 3))) { pathQ(g, q); g.fill(); } };
    band(AV.calcada[1] - 3 * px, AV.calcada[1], C.yellow);
    band(AV.calcada[1] - 4 * px, AV.calcada[1] - 3 * px, P.sky5);
    // 4. a vaga do carro do jogador (duas linhas brancas)
    g.fillStyle = P.ne6;
    for (const ds of [-2.6, 2.6]) for (const q of M.bandQuads(M.SJ, AV.pistaS[1] - 1.75, AV.pistaS[1] - 0.1, M.sjS(S_CAR + ds), M.sjS(S_CAR + ds) + px)) { pathQ(g, q); g.fill(); }
    // 5. setas pintadas nos corredores do estacionamento
    g.fillStyle = P.ne6;
    for (const [u, v, sg] of [[52, 65.1, 1], [72, 65.1, -1], [88, 65.1, 1], [60, 76.6, -1], [80, 76.6, 1]]) {
      const c = AV.world(u, v), d = AV.DIR, n = AV.NRM, p = (a, b) => [c[0] + d[0] * a * sg + n[0] * b, c[1] + d[1] * a * sg + n[1] * b];
      pathQ(g, [p(-1.4, -0.12), p(0.5, -0.12), p(0.5, 0.12), p(-1.4, 0.12)]); g.fill();
      pathQ(g, [p(0.4, -0.45), p(1.2, 0), p(0.4, 0.45), p(0.4, 0.45)]); g.fill();
    }
    g.restore();
    // 6. grama enfeitada: canteiros de flores, tufos e pedrinhas (só na grama)
    g.save();
    g.imageSmoothingEnabled = false;
    decorate(g);
    g.restore();
  };
  function pathQ(g, q) { g.beginPath(); q.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); }

  // flores (manchas e canteiros), tufos de mato e pedrinhas — tudo pintado no chão, uma vez
  const FLOWER = [P.sky7, P.sky3, P.sky5, P.ne6, P.mt3, P.sky6];
  function grassFree(x, y, r) {
    // grama de verdade em volta do ponto (sem calçada, trilha ou água perto)
    for (const [dx, dy] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]]) if (kindAt(x + dx, y + dy) !== 'g') return false;
    return true;
  }
  function flowerPatch(g, x, y, rx, ry, seed, bed) {
    const cx = x * T, cy = y * T;
    // canteiro: terra escura com borda; mancha: só um verde mais escuro por baixo
    g.beginPath(); g.ellipse(cx, cy, rx * T, ry * T, 0, 0, Math.PI * 2);
    g.fillStyle = bed ? P.te4 : C.grassDark; g.fill();
    if (bed) { g.lineWidth = 2; g.strokeStyle = P.ne4; g.stroke(); }
    const n = Math.round(rx * ry * 26);
    const c1 = FLOWER[Math.floor(hash(seed * 7) * FLOWER.length)], c2 = FLOWER[Math.floor(hash(seed * 11 + 3) * FLOWER.length)];
    for (let i = 0; i < n; i++) {
      const a = hash(seed * 13 + i * 3) * Math.PI * 2, d = Math.sqrt(hash(seed * 17 + i * 5)) * 0.85;
      const px = Math.round(cx + Math.cos(a) * d * rx * T), py = Math.round(cy + Math.sin(a) * d * ry * T);
      R(g, px - 1, py + 1, 3, 1, P.gr2);                     // folhinhas
      R(g, px, py - 1, 2, 2, hash(seed + i * 7) < 0.6 ? c1 : c2); // a flor
      if (hash(seed * 3 + i) < 0.3) R(g, px, py - 1, 1, 1, P.sky8); // o miolo claro
    }
  }
  function decorate(g) {
    // a faixa de grama entre a calçada e o lago: canteiros e manchas de flores
    const [sA, sB] = M.CALCADA_LAGO;
    for (let s = sA, i = 0; s < sB; s += 2.4 + hash(i * 3) * 2.4, i++) {
      const d = AV.calcada[1] + 1.2 + hash(i * 5 + 1) * 3, [x, y] = AV.world(s, d);
      if (!grassFree(x, y, 1.1)) continue;
      flowerPatch(g, x, y, 1.1 + hash(i * 7) * 1.1, 0.7 + hash(i * 9) * 0.5, i + 1, hash(i * 13) < 0.35);
    }
    // o resto da grama do lago (oeste, sul, praças): manchas soltas
    for (let i = 0; i < 160; i++) {
      const x = 4 + hash(i * 31 + 7) * (W - 8), y = 4 + hash(i * 37 + 11) * (H - 8);
      if (!grassFree(x, y, 1.4)) continue;
      flowerPatch(g, x, y, 0.7 + hash(i * 3) * 0.8, 0.5 + hash(i * 5) * 0.4, i + 100, false);
    }
    // tufos de mato e pedrinhas
    for (let i = 0; i < 2600; i++) {
      const x = 1 + hash(i * 11 + 5) * (W - 2), y = 1 + hash(i * 23 + 9) * (H - 2);
      if (kindAt(x, y) !== 'g') continue;
      const px = Math.round(x * T), py = Math.round(y * T), h = hash(i * 7);
      if (h < 0.62) { // tufo: três folhinhas em pé
        const c = h < 0.3 ? C.grassLight : P.gr5;
        R(g, px, py, 1, 2, C.grassDark); R(g, px + 1, py - 1, 1, 3, c); R(g, px + 2, py, 1, 2, C.grassDark);
      } else { // pedrinha com sombra
        R(g, px, py, 2, 1, h < 0.82 ? P.ne4 : P.ne3); R(g, px, py + 1, 2, 1, P.ne2);
      }
    }
  }


  /* ------------------------------------------------------------------ */
  /* Sprites em pé (pixel art; desenhados de pé no ponto de contato)      */
  /* ------------------------------------------------------------------ */
  function disc(g, cx, cy, r, col) {
    for (let dy = -r; dy <= r; dy++) { const w = Math.round(Math.sqrt(r * r - dy * dy)); R(g, cx - w, cy + dy, 2 * w + 1, 1, col); }
  }
  // árvore grande e frondosa (como as da foto 08): tronco fino e alto, copa larga e irregular
  // devolve { trunk, crown, w, h, ax, ay } — a copa é separada para balançar com o vento
  function makeTree(seed, size) {
    const w = Math.round(84 * size), h = Math.round(134 * size), ax = Math.round(w / 2), ay = h - 1;
    const trunk = DL.mk(w, h), tg = trunk.getContext('2d');
    const crown = DL.mk(w, h), cg = crown.getContext('2d');
    const th = Math.round(64 * size); // altura do tronco até a copa
    // tronco com dois galhos abrindo
    for (let i = 0; i < th; i++) {
      const lean = Math.round(Math.sin(i / 14 + seed) * 1.5);
      R(tg, ax - 1 + lean, ay - i, 3, 1, P.te0);
      R(tg, ax + 1 + lean, ay - i, 1, 1, P.te4);
    }
    for (const s of [-1, 1]) {
      for (let i = 0; i < Math.round(22 * size); i++) R(tg, ax + s * Math.round(i * 0.8), ay - th + 10 - i, 2, 1, P.te0);
    }
    // copa: muitas bolas pequenas, irregular (como as árvores da foto 08); 4 tons de verde
    const cy = ay - th - Math.round(18 * size), rr = Math.round(30 * size);
    const blobs = [];
    for (let i = 0; i < 18; i++) {
      const a = hash(seed * 13 + i) * Math.PI * 2, d = Math.sqrt(hash(seed * 7 + i * 3)) * rr * 0.95;
      blobs.push([ax + Math.round(Math.cos(a) * d * 1.2), cy + Math.round(Math.sin(a) * d * 0.6), Math.round(rr * (0.26 + hash(seed + i * 5) * 0.2))]);
    }
    blobs.push([ax, cy, Math.round(rr * 0.5)]);
    for (const [x, y, r] of blobs) disc(cg, x, y + 3, r, P.gr1);
    for (const [x, y, r] of blobs) disc(cg, x, y, r - 1, P.gr2);
    for (const [x, y, r] of blobs) disc(cg, x + 1, y - 2, Math.max(1, r - 3), P.gr3);
    for (const [x, y, r] of blobs) if (y < cy + 2) disc(cg, x + 2, y - 4, Math.max(1, r - 6), P.gr4);
    // luz dourada do fim de tarde: só na borda de cima e da direita (o sol vem de lá)
    for (const [x, y, r] of blobs) if (y < cy - 2 && x > ax - rr * 0.4 && r > 5) disc(cg, x + 3, y - 5, Math.max(1, r - 7), P.gr5);
    // folhas soltas (textura), só dentro da copa
    for (let i = 0; i < 220 * size; i++) {
      const a = hash(seed * 31 + i) * Math.PI * 2, d = Math.sqrt(hash(seed * 17 + i)) * rr * 0.95;
      const x = Math.round(ax + Math.cos(a) * d * 1.2), y = Math.round(cy + Math.sin(a) * d * 0.62);
      const pick = hash(i * 3 + seed);
      R(cg, x, y, 1, 1, pick < 0.45 ? P.gr1 : pick < 0.8 ? P.gr4 : P.gr5);
    }
    // galhos aparecendo dentro da copa
    for (let i = 0; i < 4; i++) {
      const bx = ax + Math.round((hash(seed + i * 9) - 0.5) * rr), by = cy + Math.round(hash(seed * 3 + i) * rr * 0.4);
      R(cg, bx, by, 1, 4, P.te0);
    }
    return { trunk, crown, w, h, ax, ay, top: ay - (cy - rr) };
  }
  const TREES = [makeTree(1, 1), makeTree(2, 1.08), makeTree(3, 0.94), makeTree(4, 1.15), makeTree(5, 0.86)];
  const SMALL_TREES = [makeTree(6, 0.55), makeTree(7, 0.6), makeTree(8, 0.5)];
  L.TREES = TREES;

  // poste alto de dois braços (foto 08): ~150 px
  function makeLamp() {
    const w = 46, h = 156, ax = 23, ay = 155, c = DL.mk(w, h), g = c.getContext('2d');
    R(g, ax - 1, ay - 146, 3, 147, P.ne4);
    R(g, ax + 1, ay - 146, 1, 147, P.ne3);
    R(g, ax - 2, ay - 3, 5, 4, P.ne3);
    for (const s of [-1, 1]) {
      for (let i = 0; i < 18; i++) R(g, ax + s * i, ay - 146 - Math.round(Math.sin((i / 18) * Math.PI * 0.5) * 4), 1, 1, P.ne4);
      R(g, ax + s * 18 - 3, ay - 151, 7, 2, P.ne2);
      R(g, ax + s * 18 - 2, ay - 149, 5, 1, P.ne6);
    }
    return { img: c, w, h, ax, ay, heads: [[-18, 149], [18, 149]] };
  }
  const LAMP = makeLamp();
  L.LAMP = LAMP;

  // placa amarela de travessia de pedestres (foto 08)
  function makeSign() {
    const w = 16, h = 50, ax = 8, ay = 49, c = DL.mk(w, h), g = c.getContext('2d');
    R(g, ax, ay - 34, 1, 35, P.ne4);
    R(g, ax + 1, ay - 34, 1, 35, P.ne3);
    R(g, 1, 0, 14, 16, P.ne0);
    R(g, 2, 1, 12, 14, P.sky6);
    // o pedestre e a seta
    R(g, 7, 3, 2, 2, P.ne0); R(g, 6, 5, 4, 4, P.ne0); R(g, 5, 9, 2, 3, P.ne0); R(g, 9, 9, 2, 3, P.ne0);
    R(g, 4, 12, 8, 1, P.ne0);
    R(g, 3, 13, 2, 1, P.ne0); R(g, 11, 13, 2, 1, P.ne0);
    return { img: c, w, h, ax, ay };
  }
  const SIGN = makeSign();

  // arbusto baixo
  function makeBush(seed) {
    const c = DL.mk(22, 14), g = c.getContext('2d');
    disc(g, 7, 9, 5, P.gr2); disc(g, 14, 8, 6, P.gr2); disc(g, 10, 6, 5, P.gr3);
    for (let i = 0; i < 14; i++) R(g, 3 + Math.floor(hash(seed + i) * 16), 3 + Math.floor(hash(seed * 3 + i) * 9), 1, 1, P.gr4);
    return { img: c, w: 22, h: 14, ax: 11, ay: 13 };
  }
  const BUSH = [makeBush(1), makeBush(9)];

  /* ------------------------------------------------------------------ */
  /* Desenho no mundo                                                    */
  /* ------------------------------------------------------------------ */
  // um sprite em pé no ponto (x, y) do chão; flip = reflexo na água (de cabeça para baixo)
  function standing(g, sc, spr, img, x, y, flip, dx) {
    const S = sc.S;
    const X = Math.round(IX(x, y) * S) / S, Y = Math.round(IY(x, y) * S) / S;
    K.isoT(g, sc);
    if (!flip) g.drawImage(img, X - spr.ax + (dx || 0), Y - spr.ay);
    else {
      g.translate(X, Y);
      g.scale(1, -1);
      g.drawImage(img, -spr.ax + (dx || 0), -spr.ay);
    }
  }
  // o vento: quanto a copa de cada árvore está deslocada agora
  L.wind = (t, seed) => Math.sin(t * 1.1 + seed * 1.7) * 0.6 + Math.sin(t * 2.7 + seed) * 0.25;

  function drawTree(g, sc, e, t, flip) {
    const spr = e.small ? SMALL_TREES[e.v % SMALL_TREES.length] : TREES[e.v % TREES.length];
    const x = e.px + 8, y = e.py + 8;
    standing(g, sc, spr, spr.trunk, x, y, flip);
    standing(g, sc, spr, spr.crown, x, y, flip, flip ? 0 : L.wind(t, e.v + e.tx));
    // passarinhos pousados no alto de algumas árvores
    if (!flip && e.birds) {
      K.isoT(g, sc);
      const X = IX(x, y), Y = IY(x, y) - spr.top + 3;
      for (let i = 0; i < e.birds; i++) {
        const bx = X - 10 + i * 9 + Math.round(L.wind(t, e.v + e.tx)), hop = Math.sin(t * 3 + i * 2 + e.tx) > 0.93 ? 1 : 0;
        R(g, bx, Y - hop, 3, 2, P.ne0); R(g, bx + (Math.sin(t + i) > 0 ? 2 : -1), Y - 1 - hop, 2, 1, P.ne0);
      }
    }
  }
  function drawLamp(g, sc, e, t, flip) { standing(g, sc, LAMP, LAMP.img, e.px + 8, e.py + 8, flip); }
  function drawSign(g, sc, e, t, flip) { standing(g, sc, SIGN, SIGN.img, e.px + 8, e.py + 8, flip); }
  function drawBush(g, sc, e, t, flip) { const b = BUSH[e.v % 2]; standing(g, sc, b, b.img, e.px + 8, e.py + 8, flip); }

  /* ------------------------------------------------------------------ */
  /* Prédios girados (casas, lojas, galpões, a Prefeitura, a academia)    */
  /* ------------------------------------------------------------------ */
  // um prédio é um retângulo no chão: centro (cx, cy) em tiles, u = ao longo da rua, v = para dentro do
  // lote (a frente fica em b = −d/2, virada para a rua). f(a, b, z) → ponto do mundo em px.
  function frame(c) {
    const ux = c.u[0], uy = c.u[1], vx = c.v[0], vy = c.v[1];
    return (a, b, z) => [(c.cx + ux * a + vx * b) * T, (c.cy + uy * a + vy * b) * T, z];
  }
  const seen = (n) => n[0] + n[1] > 0.01;              // a câmera vê as faces viradas para +x+y
  const faceCol = (col, n) => (n[1] >= n[0] ? col : shade(col, -0.18)); // como K.box: sul claro, leste escuro
  const SUN_FROM = [-0.29, -0.96];                     // o sol baixo vem do norte
  const roofLit = (col, n) => (n[0] * SUN_FROM[0] + n[1] * SUN_FROM[1] > 0 ? shade(col, 0.1) : shade(col, -0.12));
  // as 4 faces de parede: [a0, b0, a1, b1, normal, nome]
  function faces(c) {
    const w = c.w / 2, d = c.d / 2, u = c.u, v = c.v;
    return [
      [-w, -d, w, -d, [-v[0], -v[1]], 'frente'],
      [w, -d, w, d, [u[0], u[1]], 'dir'],
      [w, d, -w, d, [v[0], v[1]], 'fundo'],
      [-w, d, -w, -d, [-u[0], -u[1]], 'esq'],
    ];
  }
  // um retângulo pintado numa parede: t0..t1 ao longo dela, z0..z1 de altura (um tiquinho para fora)
  function onFace(g, f, fc, t0, t1, z0, z1, col) {
    const [a0, b0, a1, b1, n] = fc, o = 0.03 * T;
    const q = (t, z) => { const p = f(a0 + (a1 - a0) * t, b0 + (b1 - b0) * t, z); return [p[0] + n[0] * o, p[1] + n[1] * o, z]; };
    K.poly(g, [q(t0, z0), q(t1, z0), q(t1, z1), q(t0, z1)], col);
  }

  // telhado de duas águas com a cumeeira ao longo de u (rh = quanto sobe, px; ov = beiral, tiles)
  function gable(g, f, c, z, rh, ov, col, kind) {
    const w = c.w / 2 + ov, d = c.d / 2 + ov, v = c.v;
    const front = [[-w, -d, z], [w, -d, z], [w, 0, z + rh], [-w, 0, z + rh]], back = [[-w, d, z], [w, d, z], [w, 0, z + rh], [-w, 0, z + rh]];
    const nF = [-v[0], -v[1]], nB = [v[0], v[1]];
    const order = seen(nF) ? [[back, nB, 1], [front, nF, -1]] : [[front, nF, -1], [back, nB, 1]];
    // as pontas (triângulos) do lado que a câmera vê
    for (const s of [-1, 1]) {
      const n = [c.u[0] * s, c.u[1] * s];
      if (!seen(n)) continue;
      const a = (c.w / 2) * s;
      K.poly(g, [f(a, -c.d / 2, z), f(a, c.d / 2, z), f(a, 0, z + rh * (c.d / 2) / d)], faceCol(c.wall, n));
    }
    for (const [pl, n, sg] of order) {
      const col2 = roofLit(col, n);
      K.poly(g, pl.map((p) => f(p[0], p[1], p[2])), col2);
      const dark = shade(col2, -0.22);
      if (kind === 'telha') {
        // fileiras de telha (paralelas à cumeeira)
        for (let k = 1; k < 4; k++) {
          const t = k / 4, b = sg * d * (1 - t), zz = z + rh * t;
          K.poly(g, [f(-w, b, zz), f(w, b, zz), f(w, b - sg * 0.07, zz + rh * 0.02), f(-w, b - sg * 0.07, zz + rh * 0.02)], dark);
        }
      } else {
        // ondas do fibrocimento / da telha de metal (do beiral até a cumeeira)
        for (let a = -w + 0.35; a < w; a += 0.45) K.poly(g, [f(a, sg * d, z), f(a + 0.07, sg * d, z), f(a + 0.07, 0, z + rh), f(a, 0, z + rh)], dark);
      }
    }
    // cumeeira
    K.poly(g, [f(-w, -0.06, z + rh + 0.5), f(w, -0.06, z + rh + 0.5), f(w, 0.06, z + rh + 0.5), f(-w, 0.06, z + rh + 0.5)], shade(col, -0.3));
  }
  // laje (telhado plano) com platibanda: a borda clara e o miolo um pouco mais escuro
  function flat(g, f, c, z, col) {
    const w = c.w / 2, d = c.d / 2, i = 0.22;
    K.poly(g, [f(-w, -d, z), f(w, -d, z), f(w, d, z), f(-w, d, z)], shade(col, 0.04));
    K.poly(g, [f(-w + i, -d + i, z), f(w - i, -d + i, z), f(w - i, d - i, z), f(-w + i, d - i, z)], shade(col, -0.1));
  }
  // uma caixa pequena em cima de um telhado plano (caixa-d'água, ar-condicionado)
  function roofBox(g, f, a, b, s, z, h, col) {
    const top = [f(a - s, b - s, z + h), f(a + s, b - s, z + h), f(a + s, b + s, z + h), f(a - s, b + s, z + h)];
    for (const [p0, p1] of [[[a - s, b + s], [a + s, b + s]], [[a + s, b + s], [a + s, b - s]], [[a - s, b - s], [a - s, b + s]], [[a + s, b - s], [a - s, b - s]]]) {
      const A0 = f(p0[0], p0[1], z), A1 = f(p1[0], p1[1], z), n = [A1[1] - A0[1], -(A1[0] - A0[0])];
      if (!seen(n)) continue;
      K.poly(g, [A0, A1, f(p1[0], p1[1], z + h), f(p0[0], p0[1], z + h)], faceCol(col, n));
    }
    K.poly(g, top, shade(col, 0.12));
  }

  // casa, loja ou galpão (o mapa diz qual: c.kind)
  const SIGN_COL = [P.sky3, P.wa2, P.gr3, P.sky5, P.te3, P.vd1];
  // barraca de feira: quatro paus, o balcão de madeira e a lona listrada
  function drawBarraca(g, c) {
    const f = frame(c), w = c.w / 2, d = c.d / 2, z = c.z, fs = faces(c);
    const post = (a, b) => K.poly(g, [f(a - 0.06, b, 0), f(a + 0.06, b, 0), f(a + 0.06, b, z), f(a - 0.06, b, z)], P.te0);
    for (const [a, b] of [[-w, d], [w, d]]) post(a, b);
    // o balcão (na frente) e a mercadoria colorida em cima
    for (const fc of fs) {
      if (!seen(fc[4])) continue;
      K.poly(g, [f(fc[0], fc[1], 0), f(fc[2], fc[3], 0), f(fc[2], fc[3], 6), f(fc[0], fc[1], 6)], faceCol(P.te4, fc[4]));
    }
    K.poly(g, [f(-w, -d, 6), f(w, -d, 6), f(w, d, 6), f(-w, d, 6)], P.te5);
    for (let i = 0; i < 5; i++) { const a = -w + 0.3 + (i * (2 * w - 0.6)) / 4; roofBox(g, f, a, -d + 0.5, 0.18, 6, 2, [P.sky5, P.gr4, P.sky3, P.sky7, P.te3][(c.seed + i) % 5]); }
    for (const [a, b] of [[-w, -d], [w, -d]]) post(a, b);
    // a lona: duas águas baixas, em listras
    const rh = 4, ov = 0.25, W = w + ov, D = d + ov;
    for (const sg of [1, -1]) {
      const n = [c.v[0] * sg, c.v[1] * sg];
      const n2 = 8;
      for (let i = 0; i < n2; i++) {
        const a0 = -W + (2 * W * i) / n2, a1 = -W + (2 * W * (i + 1)) / n2;
        K.poly(g, [f(a0, sg * D, z), f(a1, sg * D, z), f(a1, 0, z + rh), f(a0, 0, z + rh)], roofLit(i % 2 ? P.ne6 : c.roofCol, n));
      }
    }
  }
  // casa, loja, galpão e os modelos pequenos (o mapa diz qual: c.kind)
  function drawCasa(g, c) {
    if (c.kind === 'barraca') return drawBarraca(g, c);
    const galp = c.kind === 'galpao' || c.kind === 'galpaozinho', casa = c.kind === 'casa' || c.kind === 'casinha';
    const f = frame(c), z = galp ? c.z : c.roof === 'laje' ? c.z + 3 : c.z, fs = faces(c), h = hash(c.seed * 7);
    const awn = (c.kind === 'loja' && h < 0.7) || c.kind === 'lanchonete';
    const frontSeen = seen(fs[0][4]);
    // o muro baixo na frente (casa com muro), com o portão
    const drawMuro = () => {
      const b = -c.d / 2 - 0.9, w = c.w / 2 + 0.4, n = [-c.v[0], -c.v[1]];
      for (const [a0, a1] of [[-w, -0.6], [0.6, w]]) K.poly(g, [f(a0, b, 0), f(a1, b, 0), f(a1, b, 8), f(a0, b, 8)], faceCol(shade(c.wall, -0.05), n));
      K.poly(g, [f(-0.6, b, 0), f(0.6, b, 0), f(0.6, b, 7), f(-0.6, b, 7)], P.ne2);
    };
    if (c.muro && !frontSeen) drawMuro();
    const drawAwning = () => {
      const w = c.w / 2 - 0.25, col = SIGN_COL[Math.floor(h * 13) % SIGN_COL.length];
      K.poly(g, [f(-w, -c.d / 2, 14), f(w, -c.d / 2, 14), f(w, -c.d / 2 - 0.7, 12), f(-w, -c.d / 2 - 0.7, 12)], col);
      if (frontSeen) K.poly(g, [f(-w, -c.d / 2 - 0.7, 12), f(w, -c.d / 2 - 0.7, 12), f(w, -c.d / 2 - 0.7, 10.5), f(-w, -c.d / 2 - 0.7, 10.5)], shade(col, -0.25));
    };
    if (awn && !frontSeen) drawAwning();
    // paredes
    for (const fc of fs) {
      if (!seen(fc[4])) continue;
      K.poly(g, [f(fc[0], fc[1], 0), f(fc[2], fc[3], 0), f(fc[2], fc[3], z), f(fc[0], fc[1], z)], faceCol(c.wall, fc[4]));
      const fw = Math.abs(fc[2] - fc[0]) + Math.abs(fc[3] - fc[1]); // largura da parede em tiles
      const glass = P.ne1, frm = P.ne6;
      if (casa) {
        if (fc[5] === 'frente') {
          onFace(g, f, fc, 0.18, 0.18 + 0.85 / fw, 0, 13, shade(c.wall, -0.45));           // porta
          onFace(g, f, fc, 0.58, 0.58 + 1.2 / fw, 6, 13, frm); onFace(g, f, fc, 0.6, 0.56 + 1.2 / fw, 7, 12, glass);
        } else {
          for (const t of [0.25, 0.62]) { onFace(g, f, fc, t, t + 0.9 / fw, 7, 12, frm); onFace(g, f, fc, t + 0.03, t + 0.85 / fw, 8, 11, glass); }
        }
        if (c.z > 25) for (const t of [0.22, 0.6]) { onFace(g, f, fc, t, t + 0.9 / fw, 20, 25, frm); onFace(g, f, fc, t + 0.03, t + 0.85 / fw, 21, 24, glass); }
      } else if (c.kind === 'quiosque') {
        // quiosque: um balcão aberto em volta (a janela grande escura e o tampo claro)
        onFace(g, f, fc, 0.1, 0.9, 6, 12, P.ne1); onFace(g, f, fc, 0.08, 0.92, 5, 6, P.ne6);
      } else if (c.kind === 'borracharia') {
        // borracharia: a frente aberta e escura; o letreiro amarelo
        if (fc[5] === 'frente') { onFace(g, f, fc, 0.08, 0.92, 0, 12, P.ne0); onFace(g, f, fc, 0.04, 0.96, 13, 16, P.sky7); for (let t = 0.12; t < 0.86; t += 0.1) onFace(g, f, fc, t, t + 0.3 / fw, 14, 15, P.ne0); }
        else onFace(g, f, fc, 0.3, 0.3 + 1 / fw, 7, 11, glass);
      } else if (c.kind === 'loja' || c.kind === 'lanchonete') {
        if (fc[5] === 'frente') {
          onFace(g, f, fc, 0.06, 0.94, 0, 11, P.vd0);                                         // vitrine
          for (let t = 0.06; t < 0.95; t += 0.22) onFace(g, f, fc, t, t + 0.12 / fw, 0, 11, frm);
          onFace(g, f, fc, 0.04, 0.96, 15, 19, SIGN_COL[Math.floor(h * 7) % SIGN_COL.length]); // letreiro
          for (let t = 0.12; t < 0.86; t += 0.09) onFace(g, f, fc, t, t + 0.25 / fw, 16, 18, P.ne6);
        } else for (let t = 0.12; t < 0.86; t += 0.28) onFace(g, f, fc, t, t + 1 / fw, 7, 12, glass);
        if (c.z > 28) for (let t = 0.08; t < 0.9; t += 0.2) { onFace(g, f, fc, t, t + 1 / fw, 23, 29, frm); onFace(g, f, fc, t + 0.02, t + 0.9 / fw, 24, 28, glass); }
      } else {
        // galpão: portão grande e nervuras na parede de metal
        for (let t = 0.04; t < 0.98; t += 0.6 / fw) onFace(g, f, fc, t, t + 0.06 / fw, 0, z, shade(c.wall, -0.12));
        if (fc[5] === 'frente') onFace(g, f, fc, 0.32, 0.68, 0, 20, P.ne3);
      }
    }
    if (awn && frontSeen) drawAwning();
    if (c.muro && frontSeen) drawMuro();
    // borracharia: pneus empilhados na frente; lanchonete: mesinha com guarda-sol
    if (c.kind === 'borracharia') for (let i = 0; i < 3; i++) roofBox(g, f, c.w / 2 - 0.5, -c.d / 2 - 0.55, 0.42, i * 2.6, 2.2, i % 2 ? P.ne1 : P.ne0);
    if (c.kind === 'lanchonete') { roofBox(g, f, -c.w / 2 + 0.6, -c.d / 2 - 1.1, 0.35, 0, 5, P.ne6); roofBox(g, f, -c.w / 2 + 0.6, -c.d / 2 - 1.1, 0.75, 13, 1.5, P.sky3); K.poly(g, [f(-c.w / 2 + 0.57, -c.d / 2 - 1.08, 5), f(-c.w / 2 + 0.63, -c.d / 2 - 1.08, 5), f(-c.w / 2 + 0.63, -c.d / 2 - 1.08, 13), f(-c.w / 2 + 0.57, -c.d / 2 - 1.08, 13)], P.ne3); }
    // telhado
    if (c.roof === 'telha') gable(g, f, c, z, (c.d / 2) * T * 0.32, 0.3, c.roofCol, 'telha');
    else if (c.roof === 'fibro') gable(g, f, c, z, (c.d / 2) * T * 0.14, 0.25, c.roofCol, 'fibro');
    else if (c.roof === 'metal') gable(g, f, c, z, (c.d / 2) * T * 0.1, 0.2, c.roofCol, 'metal');
    else {
      flat(g, f, c, z, c.roofCol);
      if (casa || h < 0.5) roofBox(g, f, c.w / 2 - 0.9, c.d / 2 - 0.9, 0.45, z, 6, casa ? P.wa3 : P.ne4);
    }
  }
  L.drawCasa = drawCasa;

  // um bloco reto da Prefeitura ou da academia (u0..u1, v0..v1 na grade G1 a partir da origem fn)
  function blocoBox(fn, u0, u1, v0, v1) {
    const a = fn((u0 + u1) / 2, (v0 + v1) / 2);
    return { cx: a[0], cy: a[1], u: AV.DIR, v: AV.NRM, w: u1 - u0, d: v1 - v0 };
  }
  // janelas em faixa (vidro verde-escuro com caixilhos brancos), em todas as paredes visíveis
  function windowBands(g, f, c, bands) {
    for (const fc of faces(c)) {
      if (!seen(fc[4])) continue;
      const fw = Math.abs(fc[2] - fc[0]) + Math.abs(fc[3] - fc[1]);
      for (const [z0, z1] of bands) {
        onFace(g, f, fc, 0.04, 0.96, z0, z1, P.vd0);
        onFace(g, f, fc, 0.04, 0.96, z1 - 1.5, z1, P.vd1);
        for (let t = 0.04; t < 0.96; t += 0.45 / fw) onFace(g, f, fc, t, t + 0.08 / fw, z0, z1, P.ne6);
      }
    }
  }
  // Prefeitura / Centro Administrativo (fotos 14 e 08-prefeitura): um conjunto BAIXO de blocos, não uma caixa
  //   bloco principal comprido (2 andares) com a faixa de telha metálica clara no meio do telhado;
  //   ala estreita a oeste com a caixa-d'água; bloco da frente; bloco sudeste mais baixo e escuro;
  //   marquise na entrada; fachadas creme com janelas em faixa
  function drawPrefeitura(g, sc, e) {
    K.isoT(g, sc);
    const PR = M.PREF, pf = PR.pref;
    // de trás para a frente (pelo centro de cada bloco)
    const blocks = PR.blocos.map((b) => Object.assign(blocoBox(pf, b.u0, b.u1, b.v0, b.v1), { b })).sort((a, b) => a.cx + a.cy - (b.cx + b.cy));
    for (const c of blocks) {
      const b = c.b, f = frame(c), z = b.z;
      c.wall = P.ne5;
      for (const fc of faces(c)) {
        if (!seen(fc[4])) continue;
        K.poly(g, [f(fc[0], fc[1], 0), f(fc[2], fc[3], 0), f(fc[2], fc[3], z + 3), f(fc[0], fc[1], z + 3)], faceCol(P.ne5, fc[4]));
        // rodapé e platibanda um pouco mais escuros
          onFace(g, f, fc, 0, 1, 0, 2, faceCol(P.ne4, fc[4]));
        onFace(g, f, fc, 0, 1, z, z + 3, faceCol(P.ne6, fc[4]));
      }
      windowBands(g, f, c, z > 30 ? [[5, 11], [19, 25]] : z > 20 ? [[6, 13]] : [[5, 10]]);
      // telhado plano com textura: placas (linhas ao longo do bloco) e calha escura na borda
      const w = c.w / 2, d = c.d / 2, zt = z + 3;
      K.poly(g, [f(-w, -d, zt), f(w, -d, zt), f(w, d, zt), f(-w, d, zt)], shade(b.teto, 0.05));
      K.poly(g, [f(-w + 0.3, -d + 0.3, zt), f(w - 0.3, -d + 0.3, zt), f(w - 0.3, d - 0.3, zt), f(-w + 0.3, d - 0.3, zt)], b.teto);
      for (let y = -d + 1.2; y < d - 0.5; y += 1.2) K.poly(g, [f(-w + 0.3, y, zt), f(w - 0.3, y, zt), f(w - 0.3, y + 0.06, zt), f(-w + 0.3, y + 0.06, zt)], shade(b.teto, -0.14));
      // a faixa central de cobertura metálica ondulada, quase branca e um pouco mais alta (só no principal)
      if (b.faixa) {
        const [a0, a1, c0, c1] = b.faixa;
        const sub = { cx: 0, cy: 0, u: c.u, v: c.v, w: a1 - a0, d: c1 - c0 };
        const o = pf((a0 + a1) / 2, (c0 + c1) / 2); sub.cx = o[0]; sub.cy = o[1]; sub.wall = P.ne6;
        const fs2 = frame(sub);
        for (const fc of faces(sub)) {
          if (!seen(fc[4])) continue;
          K.poly(g, [fs2(fc[0], fc[1], zt), fs2(fc[2], fc[3], zt), fs2(fc[2], fc[3], zt + 4), fs2(fc[0], fc[1], zt + 4)], faceCol(P.vd1, fc[4]));
        }
        gable(g, fs2, sub, zt + 4, 5, 0.1, P.ne6, 'metal');
      }
    }
    // a caixa-d'água cilíndrica branca, em cima da ala oeste
    const cx = PR.caixa, p0 = pf(cx.u, cx.v), X = IX(p0[0] * T, p0[1] * T), Y = IY(p0[0] * T, p0[1] * T, cx.z), rx = cx.r * T * Math.SQRT2 * 0.5, ry = rx / 2;
    g.fillStyle = P.ne5; g.fillRect(Math.round(X - rx), Math.round(Y - cx.h), Math.round(rx * 2), cx.h);
    g.fillStyle = P.ne4; g.fillRect(Math.round(X + rx * 0.3), Math.round(Y - cx.h), Math.round(rx * 0.7), cx.h);
    g.beginPath(); g.ellipse(X, Y, rx, ry, 0, 0, Math.PI); g.fillStyle = P.ne4; g.fill();
    g.beginPath(); g.ellipse(X, Y - cx.h, rx, ry, 0, 0, Math.PI * 2); g.fillStyle = P.ne6; g.fill();
    g.beginPath(); g.ellipse(X, Y - cx.h, rx * 0.5, ry * 0.5, 0, 0, Math.PI * 2); g.fillStyle = P.ne5; g.fill();
    // a marquise da entrada (laje fina sobre dois pilares), virada para a rua
    const mq = PR.marquise, mb = Object.assign(blocoBox(pf, mq.u0, mq.u1, mq.v0, mq.v1), { wall: P.ne6 }), fm = frame(mb);
    for (const a of [-mb.w / 2 + 0.4, mb.w / 2 - 0.6]) K.poly(g, [fm(a, mb.d / 2 - 0.4, 0), fm(a + 0.25, mb.d / 2 - 0.4, 0), fm(a + 0.25, mb.d / 2 - 0.4, mq.z), fm(a, mb.d / 2 - 0.4, mq.z)], P.ne6);
    for (const fc of faces(mb)) if (seen(fc[4])) K.poly(g, [fm(fc[0], fc[1], mq.z), fm(fc[2], fc[3], mq.z), fm(fc[2], fc[3], mq.z + 2), fm(fc[0], fc[1], mq.z + 2)], faceCol(P.ne6, fc[4]));
    K.poly(g, [fm(-mb.w / 2, -mb.d / 2, mq.z + 2), fm(mb.w / 2, -mb.d / 2, mq.z + 2), fm(mb.w / 2, mb.d / 2, mq.z + 2), fm(-mb.w / 2, mb.d / 2, mq.z + 2)], P.ne5);
  }
  // a academia (prédio branco de telhado plano, foto 14) e o anexo ao lado
  function drawEspecial(g, sc, e) {
    K.isoT(g, sc);
    const s = e.esp, c = Object.assign(blocoBox(AV.world, s.u0, s.u1, s.v0, s.v1), { wall: P.ne6 }), f = frame(c), z = s.z;
    for (const fc of faces(c)) {
      if (!seen(fc[4])) continue;
      K.poly(g, [f(fc[0], fc[1], 0), f(fc[2], fc[3], 0), f(fc[2], fc[3], z), f(fc[0], fc[1], z)], faceCol(P.ne6, fc[4]));
      const fw = Math.abs(fc[2] - fc[0]) + Math.abs(fc[3] - fc[1]);
      if (s.tipo === 'academia') {
        onFace(g, f, fc, 0.05, 0.95, 4, 14, P.vd0);
        for (let t = 0.05; t < 0.95; t += 0.5 / fw) onFace(g, f, fc, t, t + 0.08 / fw, 4, 14, P.ne5);
        onFace(g, f, fc, 0.05, 0.95, 18, 22, P.gr3);
      } else for (let t = 0.15; t < 0.85; t += 0.35) onFace(g, f, fc, t, t + 0.9 / fw, 6, 11, P.ne1);
    }
    flat(g, f, c, z, s.teto);
    // telhado de metal plano: nervuras
    const w = c.w / 2, d = c.d / 2;
    for (let a = -w + 0.8; a < w - 0.3; a += 0.8) K.poly(g, [f(a, -d + 0.25, z), f(a + 0.06, -d + 0.25, z), f(a + 0.06, d - 0.25, z), f(a, d - 0.25, z)], shade(s.teto, -0.12));
    if (s.tipo === 'academia') for (const [a, b] of [[-4, -2], [3, 1.5]]) roofBox(g, f, a, b, 0.5, z, 5, P.ne4);
  }
  // banco de madeira na grama, virado para o lago
  function drawBench(g, sc, e) {
    K.isoT(g, sc);
    const ca = Math.cos(e.ang), sa = Math.sin(e.ang), x = e.cx, y = e.cy;
    for (const a of [-10, 8]) obox(g, x, y, ca, sa, a, a + 2, -3, 3, 0, 6, P.ne1, P.ne1, P.ne1);
    obox(g, x, y, ca, sa, -12, 12, -4, 3, 6, 8, P.te2, P.te1, P.te3);
    obox(g, x, y, ca, sa, -12, 12, 3, 4.5, 8, 15, P.te2, P.te1, P.te3);
  }

  const FLAGS = [[P.gr4, P.sky6], [P.sky3, P.ne6], [P.wa2, P.ne6], [P.gr4, P.sky6], [P.sky5, P.wa2]];
  function drawFlag(g, sc, e, t, flip) {
    if (flip) return;
    const x = e.px + 8, y = e.py + 8, X = IX(x, y), Y = IY(x, y);
    K.isoT(g, sc);
    R(g, X, Y - 44, 1, 44, P.ne6);
    const [a, b] = FLAGS[e.v % FLAGS.length];
    for (let i = 0; i < 12; i++) {
      const wv = Math.round(Math.sin(t * 5 - i * 0.6 + e.v) * 1.2);
      R(g, X + 1 + i, Y - 44 + wv, 1, 8, i < 6 ? a : b);
      R(g, X + 1 + i, Y - 40 + wv, 1, 1, b);
    }
  }

  /* A bandeira de Canaã dos Carajás (a de verdade: Wikimedia / FOTW br-pa033), desenhada por código:
     triângulo amarelo em cima à direita, marrom embaixo à esquerda, faixa verde na diagonal,
     no meio um anel branco (com o nome, aqui só pontinhos), disco azul-escuro e estrela amarela.
     3 quadros de vento, feitos uma vez em telas escondidas. */
  const FLAG_W = 36, FLAG_H = 24, MASTRO_H = 104;
  let FLAG_FR = null;
  function canaaFlag(f) {
    const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const AM = hex('#fcdd09'), MA = hex('#704d25'), VD = hex('#078930'), BR = hex('#f4f1e8'), AZ = hex('#072357'), PR = hex('#8a8478');
    const STAR = ['...X...', '...X...', 'XXXXXXX', '.XXXXX.', '..XXX..', '.XX.XX.', '.X...X.'];
    const Wf = FLAG_W, Hf = FLAG_H, cx = (Wf - 1) / 2, cy = (Hf - 1) / 2, rO = Hf * 0.37, rI = Hf * 0.23, half = Wf * 0.055;
    const base = (x, y) => {
      const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy);
      const sx = x - Math.round(cx) + 3, sy = y - Math.round(cy) + 3;
      if (sx >= 0 && sx < 7 && sy >= 0 && sy < 7 && STAR[sy][sx] === 'X') return AM;
      if (r < rI) return AZ;
      if (r < rO) {
        const a = Math.atan2(dy, dx); // o nome escrito no anel: pontinhos só no arco de cima
        if (a < -0.35 && a > -Math.PI + 0.35 && Math.abs(r - (rI + rO) / 2) < 0.6 && Math.round(a * 8) % 2 === 0) return PR;
        return BR;
      }
      const d = ((x + 0.5) * Hf - (y + 0.5) * Wf) / Math.hypot(Wf, Hf);
      if (Math.abs(d) <= half) return VD;
      return d > 0 ? AM : MA;
    };
    const OY = 2, h = Hf + OY * 2, c = DL.mk(Wf, h), g = c.getContext('2d'), img = g.createImageData(Wf, h), px = img.data;
    const ph = (f * 2 * Math.PI) / 3;
    for (let x = 0; x < Wf; x++) {
      const k = x / (Wf - 1), dy = Math.round(1.6 * k * Math.sin(ph - x * 0.33)), lum = 1 + 0.16 * k * Math.cos(ph - x * 0.33);
      for (let y = 0; y < Hf; y++) {
        const col = base(x, y), o = ((y + OY + dy) * Wf + x) * 4;
        px[o] = col[0] * lum; px[o + 1] = col[1] * lum; px[o + 2] = col[2] * lum; px[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    return c;
  }
  // o mastro (mais alto que a Prefeitura) com a bandeira no vento
  function drawMastro(g, sc, e) {
    if (!FLAG_FR) FLAG_FR = [0, 1, 2].map(canaaFlag);
    const x = e.px + 8, y = e.py + 8, X = Math.round(IX(x, y)), Y = Math.round(IY(x, y));
    K.isoT(g, sc);
    // a base de concreto
    K.box(g, x - 4, y - 4, x + 4, y + 4, 0, 4, { s: P.ne4, e: P.ne3, t: P.ne5 });
    // de longe (câmera alta do filme) o mastro e a bandeira crescem aos poucos, para a bandeira ser lida
    const big = Math.max(1, Math.min(4, 0.95 / sc.S)), MH = Math.round(MASTRO_H * big), pw = Math.max(1, Math.round(big));
    // o mastro: lado claro e lado escuro, bolinha no topo
    R(g, X - pw, Y - MH, pw, MH - 4, P.ne6);
    R(g, X, Y - MH, pw, MH - 4, P.ne3);
    R(g, X - pw, Y - MH - 2 * pw, 2 * pw, 2 * pw, P.sky6);
    // a bandeira (o quadro muda com o tempo: vento leve)
    const f = Math.floor(performance.now() / 180) % 3, fr = FLAG_FR[f];
    const sm = g.imageSmoothingEnabled;
    g.imageSmoothingEnabled = sc.S * big < 0.9; // de longe, a média das cores deixa o anel e a estrela legíveis
    g.drawImage(fr, X + pw, Y - MH - big, fr.width * big, fr.height * big);
    g.imageSmoothingEnabled = sm;
  }

  // carro em 3D de caixas: dir 1 = para o leste (+x), -1 = oeste. 4 × 2 tiles.
  function drawCar(g, x, y, dir, col, opt) {
    const len = 60, wid = 26, x0 = x - len / 2, x1 = x + len / 2, y0 = y - wid / 2, y1 = y + wid / 2;
    const d = shade(col, -0.3), l = shade(col, 0.18), glass = P.ne0;
    const o = opt || {};
    // sombra de contato
    K.poly(g, [[x0 - 1, y0 + 2, 0], [x1 + 2, y0 + 2, 0], [x1 + 2, y1 + 3, 0], [x0 - 1, y1 + 3, 0]], 'rgba(0,0,0,0.3)', false);
    // rodas
    for (const wx of [x0 + 11, x1 - 13]) for (const wy of [y0 + 1, y1 - 3]) K.box(g, wx, wy, wx + 9, wy + 2, 0, 8, { s: P.ne0, e: P.ne0, t: P.ne1 });
    // corpo
    K.box(g, x0, y0, x1, y1, 4, 14, { s: col, e: d, t: l });
    // cabine (mais para trás)
    const c0 = dir > 0 ? x0 + 14 : x0 + 20, c1 = dir > 0 ? x1 - 20 : x1 - 14;
    K.box(g, c0, y0 + 2, c1, y1 - 2, 14, 24, { s: glass, e: glass, t: l });
    // colunas e teto
    K.poly(g, [[c0, y1 - 2, 14], [c0 + 2, y1 - 2, 14], [c0 + 2, y1 - 2, 24], [c0, y1 - 2, 24]], col);
    K.poly(g, [[c1 - 2, y1 - 2, 14], [c1, y1 - 2, 14], [c1, y1 - 2, 24], [c1 - 2, y1 - 2, 24]], col);
    K.poly(g, [[(c0 + c1) / 2 - 1, y1 - 2, 14], [(c0 + c1) / 2 + 1, y1 - 2, 14], [(c0 + c1) / 2 + 1, y1 - 2, 24], [(c0 + c1) / 2 - 1, y1 - 2, 24]], col);
    K.poly(g, [[c0, y0 + 2, 24], [c1, y0 + 2, 24], [c1, y1 - 2, 24], [c0, y1 - 2, 24]], l);
    K.poly(g, [[c0 + 3, y1 - 1.8, 21], [c0 + 9, y1 - 1.8, 21], [c0 + 9, y1 - 1.8, 22], [c0 + 3, y1 - 1.8, 22]], P.ne3);
    // faróis (frente) e lanternas (trás) na face leste, que é a visível
    if (dir > 0) {
      K.poly(g, [[x1 + 0.2, y1 - 3, 9], [x1 + 0.2, y1 - 8, 9], [x1 + 0.2, y1 - 8, 12], [x1 + 0.2, y1 - 3, 12]], P.sky8);
      K.poly(g, [[x1 + 0.2, y0 + 8, 9], [x1 + 0.2, y0 + 3, 9], [x1 + 0.2, y0 + 3, 12], [x1 + 0.2, y0 + 8, 12]], P.sky8);
    } else {
      K.poly(g, [[x1 + 0.2, y1 - 3, 9], [x1 + 0.2, y1 - 7, 9], [x1 + 0.2, y1 - 7, 12], [x1 + 0.2, y1 - 3, 12]], P.sky3);
      K.poly(g, [[x1 + 0.2, y0 + 7, 9], [x1 + 0.2, y0 + 3, 9], [x1 + 0.2, y0 + 3, 12], [x1 + 0.2, y0 + 7, 12]], P.sky3);
    }
    // porta do motorista aberta (o jogador entrando)
    if (o.doorOpen) K.poly(g, [[c0 + 2, y1 + 0.2, 6], [c0 + 2, y1 + 12, 6], [c0 + 2, y1 + 12, 20], [c0 + 2, y1 + 0.2, 20]], shade(col, -0.15));
  }
  L.drawCar = drawCar;
  // carro girado em qualquer ângulo (a avenida é inclinada): caixas com as faces que a câmera vê.
  // (x, y) = centro no chão (px do mundo); ang = para onde a frente aponta. Comprimento 60, largura 26.
  function obox(g, cx, cy, ca, sa, u0, u1, v0, v1, z0, z1, cS, cE, cT) {
    const p = (u, v, z) => [cx + u * ca - v * sa, cy + u * sa + v * ca, z];
    // as quatro faces de lado: normal (nx, ny); a câmera vê as que apontam para +x+y
    const faces = [[u1, v0, u1, v1, ca, sa], [u0, v1, u0, v0, -ca, -sa], [u1, v1, u0, v1, -sa, ca], [u0, v0, u1, v0, sa, -ca]];
    for (const [ua, va, ub, vb, nx, ny] of faces) {
      if (nx + ny <= 0.01) continue;
      K.poly(g, [p(ua, va, z0), p(ub, vb, z0), p(ub, vb, z1), p(ua, va, z1)], ny > nx ? cS : cE);
    }
    if (cT) K.poly(g, [p(u0, v0, z1), p(u1, v0, z1), p(u1, v1, z1), p(u0, v1, z1)], cT);
    return p;
  }
  // opt.tipo: 0 sedã · 1 hatch · 2 SUV · 3 picape · 4 moto (com piloto). opt.doorOpen: porta aberta.
  // Cada carro tem para-choques, saia escura, rodas com calota, vidros azulados com reflexo, colunas,
  // retrovisor, faróis/grade na frente e lanternas/placa atrás.
  function drawCarAt(g, x, y, ang, col, opt) {
    const ca = Math.cos(ang), sa = Math.sin(ang), o = opt || {}, tipo = o.tipo || 0;
    const p = (u, v, z) => [x + u * ca - v * sa, y + u * sa + v * ca, z];
    const B = (u0, u1, v0, v1, z0, z1, cS, cE, cT) => obox(g, x, y, ca, sa, u0, u1, v0, v1, z0, z1, cS, cE, cT);
    const lado = ca - sa > 0 ? 1 : -1, frente = ca + sa > 0; // o lado comprido e a ponta que a câmera vê
    if (tipo === 4) return drawMoto(g, p, B, col, frente, o.semPiloto);
    const d = shade(col, -0.3), dd = shade(col, -0.52), l = shade(col, 0.18), ll = shade(col, 0.36);
    const vid = P.wa0, vidL = P.wa2, vidB = P.wa3;
    // um detalhe "colado" no lado comprido que aparece / na ponta que aparece
    const dec = (u0, u1, z0, z1, c, v) => { const V = lado * (v || 13.25); K.poly(g, [p(u0, V, z0), p(u1, V, z0), p(u1, V, z1), p(u0, V, z1)], c); };
    const fim = (v0, v1, z0, z1, c, du) => { const U = (frente ? 1 : -1) * (30.3 + (du || 0)); K.poly(g, [p(U, v0, z0), p(U, v1, z0), p(U, v1, z1), p(U, v0, z1)], c); };
    const hb = tipo === 2 ? 16 : 14;                                        // altura da lataria
    // a cabine: [começo, fim] embaixo (vidro inclinado) e em cima (teto), e as duas alturas
    const CAB = [[-18, 12, -15, 8, 4.5, 9], [-28, 12, -26.5, 8, 4.5, 9], [-28, 14, -27, 11, 5, 11], [-8, 14, -6, 11, 4.5, 9.5]][tipo];
    // sombra de contato
    K.poly(g, [p(-31, -12, 0), p(32, -12, 0), p(32, 15, 0), p(-31, 15, 0)].map((q) => [q[0] + 1, q[1] + 1, 0]), 'rgba(0,0,0,0.3)', false);
    // rodas do lado de lá (aparecem por baixo)
    for (const wu of [-21, 13]) B(wu, wu + 9, -lado * 13.5 - 1, -lado * 13.5 + 1, 0, 8, P.ne0, P.ne0, P.ne1);
    const parachoque = (na) => { const s2 = na ? 1 : -1; B(Math.min(s2 * 29.5, s2 * 31.5), Math.max(s2 * 29.5, s2 * 31.5), -12.5, 12.5, 4, 8, P.ne2, P.ne1, P.ne3); };
    parachoque(!frente); // o de lá primeiro (fica atrás da lataria)
    B(-30, 30, -13, 13, 3, 7, dd, shade(col, -0.62), null); // saia
    B(-30, 30, -13, 13, 7, hb, col, d, l);                  // lataria
    parachoque(frente);
    // caçamba da picape
    if (tipo === 3) {
      B(-30, -8, -13, 13, hb, hb + 3, col, d, l);
      K.poly(g, [p(-28, -11, hb + 3.05), p(-10, -11, hb + 3.05), p(-10, 11, hb + 3.05), p(-28, 11, hb + 3.05)], P.ne1);
    }
    // cabine: vidro embaixo (o topo dele é o para-brisa inclinado, mais claro) e o teto
    B(CAB[0], CAB[1], -12, 12, hb, hb + CAB[4], vid, vid, vidL);
    B(CAB[2], CAB[3], -11.5, 11.5, hb + CAB[4], hb + CAB[5], vid, vid, l);
    K.poly(g, [p(CAB[2] + 2, -8, hb + CAB[5] + 0.05), p(CAB[3] - 2, -8, hb + CAB[5] + 0.05), p(CAB[3] - 2, -3, hb + CAB[5] + 0.05), p(CAB[2] + 2, -3, hb + CAB[5] + 0.05)], ll); // brilho no teto
    if (tipo === 2) for (const v of [-10.5, 9.5]) B(CAB[2] + 3, CAB[3] - 3, v, v + 1, hb + CAB[5], hb + CAB[5] + 1.2, P.ne1, P.ne0, P.ne2); // bagageiro
    // do lado que aparece: colunas, reflexo no vidro, friso, porta, maçaneta, caixas de roda, rodas e calotas
    const meio = (CAB[2] + CAB[3]) / 2;
    for (const u of [CAB[2], meio - 1, CAB[3] - 2]) dec(u, u + 2, hb, hb + CAB[5], col, 12.1);
    dec(meio + 3, meio + 5, hb + 1.5, hb + CAB[5] - 1.5, vidB, 12.15);
    dec(CAB[2] + 3, CAB[2] + 4, hb + 2.5, hb + CAB[5] - 1.5, vidB, 12.15);
    dec(-29, 29, hb - 1, hb, ll);
    dec(meio - 1, meio - 0.2, 7.5, hb - 1, d);
    dec(meio + 1.5, meio + 4, hb - 3.4, hb - 2.5, dd);
    for (const wu of [-21, 13]) { dec(wu - 1.5, wu + 10.5, 7, 10, dd); dec(wu, wu + 9, 0, 8.4, P.ne0, 13.6); dec(wu + 3, wu + 6, 2.6, 5.6, P.ne4, 13.7); }
    const mv = lado > 0 ? 12 : -14.5;
    B(CAB[3] - 1, CAB[3] + 1.5, mv, mv + 2.5, hb, hb + 2.2, col, d, l); // retrovisor
    // na ponta que aparece: faróis + grade (frente) ou lanternas (trás), e a placa no para-choque
    if (frente) { fim(-11.5, -5.5, 9, 12.6, P.sky8); fim(5.5, 11.5, 9, 12.6, P.sky8); fim(-4.5, 4.5, 8.4, 12, P.ne0); fim(-3, 3, 9.6, 10.4, P.ne3); }
    else { fim(-12, -6, 9.4, 12.6, P.sky3); fim(6, 12, 9.4, 12.6, P.sky3); fim(-12, -9.5, 9.4, 12.6, P.sky5); fim(9.5, 12, 9.4, 12.6, P.sky5); }
    fim(-3.5, 3.5, 4.8, 7.2, P.ne6, 1.3);
    // porta aberta do lado direito (o lado da calçada)
    // (doorOpen entre 0 e 1: meio aberta = a porta ainda inclinada, a caminho)
    if (o.doorOpen) {
      const k = o.doorOpen === true ? 1 : o.doorOpen, a = (k * Math.PI) / 2, du = -Math.cos(a) * 11.8, dv = Math.sin(a) * 11.8;
      K.poly(g, [p(-14, 13.2, 6), p(-14 + du, 13.2 + dv, 6), p(-14 + du, 13.2 + dv, 20), p(-14, 13.2, 20)], shade(col, k < 1 ? -0.05 : -0.15));
      K.poly(g, [p(-14 + du * 0.25, 13.2 + dv * 0.25, 14.5), p(-14 + du * 0.85, 13.2 + dv * 0.85, 14.5), p(-14 + du * 0.85, 13.2 + dv * 0.85, 19), p(-14 + du * 0.25, 13.2 + dv * 0.25, 19)], P.wa1);
    }
  }
  // a moto: duas rodas, tanque na cor, banco e o piloto de capacete
  // (semPiloto: moto estacionada, só com o guidão)
  function drawMoto(g, p, B, col, frente, semPiloto) {
    K.poly(g, [p(-12, -3, 0), p(13, -3, 0), p(13, 5, 0), p(-12, 5, 0)], 'rgba(0,0,0,0.3)', false);
    B(-13, -6, -1.2, 1.2, 0, 8, P.ne0, P.ne0, P.ne1);
    B(6, 13, -1.2, 1.2, 0, 8, P.ne0, P.ne0, P.ne1);
    B(-9, 9, -2, 2, 5, 10, P.ne1, P.ne0, P.ne2);                               // quadro e motor
    B(-1, 6, -2.6, 2.6, 9, 12.5, col, shade(col, -0.3), shade(col, 0.2));      // tanque
    B(-9, -1, -2.2, 2.2, 10, 11.6, P.ne0, P.ne0, P.ne1);                       // banco
    if (semPiloto) {
      B(6, 7, -4, 4, 14, 15, P.ne2, P.ne1, P.ne3);                             // guidão
      B(6, 7, -0.6, 0.6, 9, 14, P.ne1, P.ne0, P.ne2);
      return;
    }
    B(-6, 0, -3.2, 3.2, 10, 15, P.wa1, P.wa0, P.wa2);                          // pernas
    B(-6, -1, -3.2, 3.2, 15, 23, col, shade(col, -0.3), shade(col, 0.18));     // tronco
    B(-1, 6, -3.4, 3.4, 18, 20, P.ne5, P.ne4, P.ne6);                          // braços no guidão
    B(-5.5, -0.5, -2.8, 2.8, 23, 28.5, P.ne0, P.ne0, P.ne2);                   // capacete
    if (frente) K.poly(g, [p(9.2, -1.5, 9), p(9.2, 1.5, 9), p(9.2, 1.5, 12), p(9.2, -1.5, 12)], P.sky8);
    else K.poly(g, [p(-9.2, -1.2, 9), p(-9.2, 1.2, 9), p(-9.2, 1.2, 11), p(-9.2, -1.2, 11)], P.sky3);
  }
  L.drawCarAt = drawCarAt;

  L.draw = { tree: drawTree, lamp: drawLamp, sign: drawSign, bush: drawBush, flag: drawFlag };

  /* ------------------------------------------------------------------ */
  /* Os objetos do mapa (cada um no tipo certo da grade)                  */
  /* ------------------------------------------------------------------ */
  const items = [];
  const used = new Set(); // tiles já ocupados por um objeto
  const self = (fn) => (g, sc, e, t) => fn(g, sc, e, t, false);
  function put(o) { items.push(o); return o; }
  const key = (x, y) => x + ',' + y;
  // dá para pôr algo de 1 tile em (tx, ty)? (kinds = as letras permitidas; padrão: só a grama)
  function free(tx, ty, kinds) {
    if (tx < 1 || ty < 1 || tx >= W - 1 || ty >= H - 1 || used.has(key(tx, ty))) return false;
    return (kinds || 'g').includes(L.at(tx, ty));
  }
  // só o que fica na margem de LÁ (norte e oeste, o alto da tela) e perto da água aparece refletido
  const nearWater = (tx, ty) => F.lakeDist(tx + 0.5, ty + 0.5) < 4 && !F.inLake(tx + 0.5, ty + 0.5) && farShore(tx + 0.5, ty + 0.5);
  function farShore(x, y) {
    // a água fica "na frente" (para baixo na tela, +x+y) deste ponto
    for (let k = 1; k < 8; k++) if (F.inLake(x + k * 0.7, y + k * 0.7)) return true;
    return false;
  }
  function tree(tx, ty, v, opt) {
    used.add(key(tx, ty));
    return put(Object.assign({ kind: 'lg-tree', tx, ty, v, isoH: 140, drawIso: self(drawTree), refl: nearWater(tx, ty), shadow: 'tree' }, opt));
  }
  function bush(tx, ty, v) {
    used.add(key(tx, ty));
    return put({ kind: 'lg-bush', tx, ty, v, isoH: 16, drawIso: self(drawBush), refl: nearWater(tx, ty), shadow: 'bush' });
  }
  // um grupo de árvores em volta de (x, y): n árvores perto umas das outras (kinds: onde pode)
  function grove(x, y, n, seed, opt, kinds) {
    let made = 0;
    for (let i = 0; i < n * 5 && made < n; i++) {
      const tx = Math.floor(x + (hash(seed * 7 + i * 3) - 0.5) * (2 + n)), ty = Math.floor(y + (hash(seed * 11 + i * 5) - 0.5) * (2 + n));
      if (!free(tx, ty, kinds) || F.lakeDist(tx + 0.5, ty + 0.5) < 1.2) continue;
      if ([[1, 0], [0, 1], [-1, 0], [0, -1]].some(([a, b]) => used.has(key(tx + a, ty + b)))) continue;
      tree(tx, ty, seed * 5 + i, Object.assign({ small: hash(seed * 3 + i) < 0.3 }, opt));
      made++;
    }
  }
  const atAv = (s, d) => { const [x, y] = AV.world(s, d); return [Math.floor(x), Math.floor(y)]; };
  const [SA, SB] = M.CALCADA_LAGO;

  // 1. a faixa de grama entre a calçada e o lago (foto 08): árvores em grupos e arbustos
  //    (a calçada fica livre: nada em cima dela)
  for (let s = SA, i = 0; s < SB; s += 7 + hash(i * 3 + 1) * 6, i++) {
    // quanto de grama há até a água, aqui
    let depth = 0;
    while (depth < 14 && !F.inLake(...AV.world(s, AV.calcada[1] + depth + 0.5))) depth += 0.5;
    if (Math.abs(s - S_CAR) < 5 || Math.abs(s - S_CROSS) < 4) continue;
    if (depth >= 3) {
      const [x, y] = AV.world(s, AV.calcada[1] + Math.min(depth, 7) / 2 + 0.6);
      grove(x, y, depth > 5 ? 3 : 2, i + 1, { birds: i % 4 === 1 ? 3 : 0 });
    }
    if (depth >= 2) {
      const [bx, by] = atAv(s + 3.5, AV.calcada[1] + 1.2);
      if (free(bx, by)) bush(bx, by, i);
    }
  }
  // as duas árvores grandes na beira norte da água (foto 13)
  for (const [x, y] of F.arvoresBeira) {
    let tx = Math.floor(x), ty = Math.floor(y);
    for (let k = 0; k < 5 && !free(tx, ty); k++) ty -= 1; // se caiu na água ou na margem, sobe um pouco
    if (free(tx, ty)) tree(tx, ty, 300 + tx, { big: true, birds: 2 });
  }
  // 2. o canteiro da São João: postes de dois braços (um a cada ~12 tiles) e árvores entre eles
  let lampN = 0;
  const lamp = (tx, ty) => { used.add(key(tx, ty)); put({ kind: 'lg-lamp', tx, ty, isoH: 160, drawIso: self(drawLamp), refl: false, shadow: 'lamp', lamp: true, n: lampN++ }); };
  const lampS = [];
  for (let s = AV.sAtX(4); s < AV.sAtX(W - 4); s += 12) {
    const [tx, ty] = atAv(s, 0);
    if (!free(tx, ty, 'c')) continue;
    lamp(tx, ty);
    lampS.push(s);
  }
  for (let s = AV.sAtX(3), i = 0; s < AV.sAtX(W - 3); s += 4, i++) {
    if (lampS.some((q) => Math.abs(q - s) < 2.2)) continue;
    const [tx, ty] = atAv(s, 0);
    if (!free(tx, ty, 'c')) continue;
    tree(tx, ty, i + 40, { small: true });
  }
  // postes na calçada (junto ao meio-fio) da rua do sul, da Av. José Vicente e da rua do oeste
  const sideLamps = (r, d, s0, s1, step) => {
    for (let s = s0; s < s1; s += step) {
      const p = M.at(r, s, d), tx = Math.floor(p[0]), ty = Math.floor(p[1]);
      if (M.ENTRADAS.some((e) => r === M.RS && Math.abs(e.s - s) < 3.5)) continue;
      if (free(tx, ty, 's')) lamp(tx, ty);
    }
  };
  sideLamps(M.RS, -(M.RS.aL + 0.5), M.local(M.RS, 14, 86).s, M.local(M.RS, 150, 116).s, 14);
  sideLamps(M.VI, M.VI.aR + 0.5, M.local(M.VI, 166, 50).s, M.local(M.VI, 152, 118).s, 14);
  sideLamps(M.RO, -(M.RO.aL + 0.5), M.local(M.RO, 26, 22).s, M.local(M.RO, 16, 78).s, 14);
  // a placa amarela de travessia, ao lado da faixa, na calçada (junto ao meio-fio)
  {
    const [tx, ty] = atAv(S_CROSS - 2.2, AV.calcada[0] + 0.5);
    used.add(key(tx, ty));
    put({ kind: 'lg-sign', tx, ty, isoH: 52, drawIso: self(drawSign), shadow: 'sign', refl: false });
  }
  // 3. o resto da grama do lago: oeste e noroeste, sul (entre o lago e a trilha), jardim da Prefeitura,
  //    a ponta leste; o terreno vazio do leste (terra, árvores soltas)
  for (const [x, y, n, sd] of [
    [32, 40, 3, 61], [31, 50, 2, 62], [28, 60, 3, 63], [27, 31, 2, 64], [47, 23, 2, 65], [57, 22, 2, 66], // oeste e noroeste
    [52, 72, 2, 67], [70, 72, 2, 68], [88, 73, 2, 69], [112, 70, 2, 70], [30, 76, 3, 90], [42, 82, 2, 91], // sul
    [150, 70, 3, 72], [151, 64, 2, 73], [133, 68, 2, 74], [152, 80, 2, 92], [153, 96, 2, 93],            // praça e jardim da Prefeitura
    [158, 50, 2, 75], [162, 46, 2, 76],                                                                   // a ponta leste
  ]) grove(x, y, n, sd);
  for (const [x, y, n, sd] of [[178, 64, 3, 77], [186, 80, 3, 78], [180, 98, 2, 79], [175, 112, 2, 80], [190, 58, 2, 81]]) grove(x, y, n, sd, null, 't');
  // em volta da praça noroeste
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + 0.3, tx = Math.floor(F.pracaNO.c[0] + Math.cos(a) * (F.pracaNO.r + 1.2)), ty = Math.floor(F.pracaNO.c[1] + Math.sin(a) * (F.pracaNO.r + 1.2));
    if (free(tx, ty)) tree(tx, ty, 130 + k, { small: k % 2 === 0 });
  }
  // a ilha da rotatória (se cair dentro do mapa)
  { const tx = Math.floor(M.J[0]), ty = Math.floor(M.J[1]); if (free(tx, ty, 'c')) tree(tx, ty, 777, { small: true }); }
  // arbustos soltos na grama do lago
  for (let i = 0; i < 40; i++) {
    const tx = Math.floor(22 + hash(i * 19 + 3) * 130), ty = Math.floor(20 + hash(i * 29 + 7) * 60);
    if (free(tx, ty) && F.lakeDist(tx + 0.5, ty + 0.5) > 1.5) bush(tx, ty, i);
  }
  // bancos na grama, junto à trilha, virados para o lago
  {
    const tr = F.trilha;
    let made = 0, acc = 0, next = 10; // um banco a cada ~16 tiles de trilha
    for (let i = 1; i < tr.length && made < 7; i++) {
      const a = tr[i - 1], b = tr[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]), dx = (b[0] - a[0]) / l, dy = (b[1] - a[1]) / l;
      acc += l;
      if (acc < next) continue;
      for (const side of [1, -1]) {
        const k = 0.5, x = a[0] + (b[0] - a[0]) * k - dy * side * (F.trilhaLarg / 2 + 0.9), y = a[1] + (b[1] - a[1]) * k + dx * side * (F.trilhaLarg / 2 + 0.9);
        const tx = Math.floor(x), ty = Math.floor(y);
        if (!free(tx, ty) || F.lakeDist(x, y) > 6 || F.lakeDist(x, y) < 1.5) continue;
        // de costas para a trilha, de frente para a água
        const toLake = F.inLake(x - dy * side * 3, y + dx * side * 3) ? 1 : -1;
        used.add(key(tx, ty));
        put({ kind: 'lg-bench', tx, ty, isoH: 20, solid: false, cx: x * T, cy: y * T, ang: Math.atan2(dx, -dy) + (side * toLake > 0 ? 0 : Math.PI), drawIso: drawBench });
        made++;
        next = acc + 16;
        break;
      }
    }
  }

  // 4. prédios: as casas do mapa (lago-mapa.js) que ficam dentro do mapa, a Prefeitura e a academia
  // a caixa do objeto (tiles), presa dentro do mapa (uma casa na borda passa um pouco para fora)
  const boxOf = (pts) => {
    const bb = M.bboxOf(pts), tx = Math.max(0, Math.floor(bb[0])), ty = Math.max(0, Math.floor(bb[1]));
    return { tx, ty, tw: Math.max(1, Math.min(W, Math.ceil(bb[2])) - tx), th: Math.max(1, Math.min(H, Math.ceil(bb[3])) - ty) };
  };
  for (const c of M.casas) {
    if (!c.noMapa) continue;
    put(Object.assign({ kind: 'lg-house', c, h: c.z, isoH: c.z + 30, solid: false, shadow: 'poly', polys: [{ q: c.q, h: c.z + (c.roof === 'telha' ? 10 : 3) }],
      drawIso(g, sc, e) { K.isoT(g, sc); drawCasa(g, e.c); } }, boxOf(c.q)));
  }
  // árvores pequenas no quintal de algumas casas (no fundo do lote, nunca no prédio)
  for (const Lt of M.LOTES) {
    // (os lotes de terra que ficaram sem nada ganham sempre uma árvore)
    const vazio = Lt.chao === 'baldio' && !M.casas.some((c) => c.lot === Lt.id);
    if (!vazio && (Lt.chao !== 'quintal' || hash(Lt.id * 5 + 1) > 0.4)) continue;
    const p = [Lt.a[0] + Lt.dir[0] * (Lt.w - 1.2) + Lt.n[0] * (Lt.depth - 1.1), Lt.a[1] + Lt.dir[1] * (Lt.w - 1.2) + Lt.n[1] * (Lt.depth - 1.1)];
    const tx = Math.floor(p[0]), ty = Math.floor(p[1]);
    if (free(tx, ty, 'l') && M.donoEm(tx + 0.5, ty + 0.5) === Lt.id) tree(tx, ty, 500 + Lt.id, { small: true });
  }
  {
    const PR = M.PREF, all = PR.blocos.flatMap((b) => [PR.pref(b.u0, b.v0), PR.pref(b.u1, b.v0), PR.pref(b.u1, b.v1), PR.pref(b.u0, b.v1)]);
    put(Object.assign({ kind: 'lg-pref', isoH: 64, solid: false, shadow: 'poly', drawIso: drawPrefeitura,
      polys: PR.blocos.map((b) => ({ q: [PR.pref(b.u0, b.v0), PR.pref(b.u1, b.v0), PR.pref(b.u1, b.v1), PR.pref(b.u0, b.v1)], h: b.z + 3 })) }, boxOf(all)));
    // bandeiras no lado da praça, viradas para o lago
    for (let i = 0; i < 5; i++) {
      const p = PR.pref(15 + i * 2.2, -3.6), tx = Math.floor(p[0]), ty = Math.floor(p[1]);
      if (!free(tx, ty, 'lq')) continue;
      used.add(key(tx, ty));
      put({ kind: 'lg-flag', tx, ty, v: i, isoH: 46, solid: false, drawIso: self(drawFlag) });
    }
    // o mastro com a bandeira de Canaã: na praça entre a Prefeitura e o lago, ao lado das bandeiras pequenas
    // (aparece inteiro no plano de abertura)
    {
      const p = PR.pref(26.5, -4.6), tx = Math.floor(p[0]), ty = Math.floor(p[1]);
      used.add(key(tx, ty));
      put({ kind: 'lg-mastro', tx, ty, isoH: MASTRO_H + 10, solid: false, drawIso: drawMastro });
    }
  }
  for (const s of M.ESPECIAIS) put(Object.assign({ kind: 'lg-esp', esp: s, isoH: s.z + 12, solid: false, shadow: 'poly', polys: [{ q: s.corpo, h: s.z + 2 }], drawIso: drawEspecial }, boxOf(s.corpo)));

  // 5. carros parados: nas vagas do estacionamento (poucos, cores variadas) e junto ao meio-fio da rua do sul
  const LOTC = [P.ne6, P.ne6, P.ne3, P.sky3, P.vd0, P.ne6, P.ne0, P.ne6, P.wa2, P.te2, P.ne4];
  const carBox = (x, y, ang) => { const ca = Math.abs(Math.cos(ang)), sa = Math.abs(Math.sin(ang)), hx = (30 * ca + 13 * sa) / T, hy = (30 * sa + 13 * ca) / T; return boxOf([[x - hx, y - hy], [x + hx, y + hy]]); };
  const TIPO_PARADO = [0, 1, 0, 2, 3, 1, 0, 2, 1, 0]; // sedãs, hatches, SUVs e picapes
  const parked = (x, y, ang, col) => put(Object.assign({ kind: 'lg-car', cx: x * T, cy: y * T, ang, col, isoH: 34, solid: false,
    tipo: TIPO_PARADO[Math.floor(hash(Math.round(x * 7) + Math.round(y * 13)) * TIPO_PARADO.length)],
    drawIso(g, sc, e) { K.isoT(g, sc); drawCarAt(g, e.cx, e.cy, e.ang, e.col, e); } }, carBox(x, y, ang)));
  let carN = 0;
  for (const v of M.VAGAS) {
    const h = hash(Math.round(v.u * 13) + v.v0 * 7);
    if (h > (v.v0 > 70 ? 0.42 : 0.3)) continue;
    v.carro = parked(v.c[0], v.c[1], v.ang, LOTC[carN++ % LOTC.length]);
  }
  {
    const r = M.RS, d = -(r.aL - 1.0), s0 = M.local(r, 6, 84).s, s1 = M.local(r, 146, 115).s;
    for (let s = s0; s < s1; s += 4.2) {
      if (hash(Math.round(s * 7)) < 0.32) continue;
      if (M.ENTRADAS.some((e) => Math.abs(e.s - s) < 4)) continue;
      if (r.zones.some((z) => s > z[0] - 2 && s < z[1] + 2)) continue;
      const p = M.at(r, s, d), dir = M.dirAt(r, s);
      parked(p[0], p[1], Math.atan2(-dir[1], -dir[0]), LOTC[carN++ % LOTC.length]); // de frente para o oeste (a mão deste lado)
    }
  }

  // 6. o carro do jogador: na pista de cá, junto à calçada, logo antes da faixa de pedestre
  {
    const d = AV.pistaS[1] - 0.85, [cx, cy] = AV.world(S_CAR, d);
    const [ux, uy] = AV.world(S_CAR - 0.6, AV.calcada[0] + 0.7); // onde o jogador fica para entrar
    const car = put({ id: 'CARRO', kind: 'lg-mycar', tx: Math.floor(cx - 2), ty: Math.floor(cy - 1), tw: 4, th: 2, isoH: 30, solid: false,
      cx: cx * T, cy: cy * T, ang: AV.angle,
      drawIso(g, sc, e) {
        K.isoT(g, sc);
        drawCarAt(g, e.cx, e.cy, e.ang, P.wa3, { doorOpen: e.doorOpen || 0 });
        if (!e.luz && !e.seta) return;
        // faróis, lanternas e seta (a sequência de entrar no carro, lago.js)
        const ca = Math.cos(e.ang), sa = Math.sin(e.ang), Lg = DL.Lago;
        const pt = (u, v, z) => { const x = e.cx + u * ca - v * sa, y = e.cy + u * sa + v * ca; return [x - y, (x + y) / 2 - z]; };
        g.save();
        g.globalCompositeOperation = 'lighter';
        if (e.luz) {
          for (const v of [-8.5, 8.5]) { const [X, Y] = pt(31, v, 10.5); Lg.glow(g, X, Y, 9, '255,236,170', 0.75 * e.luz); }
          const [FX, FY] = pt(52, 0, 2); Lg.glow(g, FX, FY, 30, '255,226,160', 0.3 * e.luz);
          for (const v of [-9, 9]) { const [X, Y] = pt(-31, v, 11); Lg.glow(g, X, Y, 7, '255,60,50', 0.8 * e.luz); }
        }
        if (e.seta) for (const u of [30, -30]) { const [X, Y] = pt(u, -12, 10.5); Lg.glow(g, X, Y, 6, '255,170,40', 0.95); }
        g.restore();
        if (e.seta) for (const u of [30.5, -30.5]) { const [X, Y] = pt(u, -12, 10.5); R(g, Math.round(X) - 1, Math.round(Y) - 1, 2, 2, P.sky7); }
      } });
    L.carUse = { x: ux * T, y: uy * T };
    L.car = car;
  }

  L.items = items;
  (DL.Lago = DL.Lago || {}).L = L;
})();

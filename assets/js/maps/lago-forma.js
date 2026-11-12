/* Venti Experience — Parte 0: A FORMA do Lago da Prefeitura, tirada da foto de cima
   (referencia/13-lago-detalhe.png, norte para cima).

   Todos os pontos estão em coordenadas NORMALIZADAS da foto 13: [u, v], de 0 a 1
   (u = da esquerda para a direita, v = de cima para baixo). Para ajustar, abra o jogo com ?debug=1
   (a foto aparece por cima do mapa; F2 mostra/esconde) e mexa nos números aqui.
   O mapa inteiro é a foto inteira: 200 × 121 tiles (1 pixel da foto ≈ 0,22 tile).
   O contorno do lago saiu da cor da água na foto (Python + Pillow) e foi acertado à mão. */
(function () {
  'use strict';
  const DL = window.DL, Lg = (DL.Lago = DL.Lago || {});

  const FORMA = {
    lago: [[0.2475, 0.2181], [0.3010, 0.2033], [0.3679, 0.2089], [0.4459, 0.2292], [0.5128, 0.2495], [0.5797, 0.2736], [0.6466, 0.2994], [0.6968, 0.3161], [0.7246, 0.3290], [0.7391, 0.3420], [0.7436, 0.3697], [0.7436, 0.4436], [0.7414, 0.4769], [0.7324, 0.4917], [0.6912, 0.5065], [0.6355, 0.5287], [0.5797, 0.5471], [0.5240, 0.5638], [0.4682, 0.5730], [0.4013, 0.5786], [0.3344, 0.5786], [0.2731, 0.5675], [0.2230, 0.5471], [0.1873, 0.5102], [0.1728, 0.4621], [0.1717, 0.4067], [0.1817, 0.3420], [0.1984, 0.2921], [0.2207, 0.2495]],
    // Av. São João: a linha do meio do canteiro (de a até b) e as faixas, em distância perpendicular a ela
    // (fração da LARGURA da foto; + = para o sul, o lado do lago)
    avenida: { a: [0.1672, 0.0370], b: [0.8473, 0.3142], calcadaN: [-0.0290, -0.0201], pistaN: [-0.0201, -0.0056], canteiro: [-0.0056, 0.0056], pistaS: [0.0056, 0.0223], calcada: [0.0223, 0.0346] },
    trilha: [[0.3545, 0.1701], [0.1449, 0.3105], [0.1315, 0.4436], [0.1026, 0.5545], [0.2230, 0.5915], [0.3679, 0.6137], [0.5017, 0.6211], [0.6020, 0.5970], [0.6912, 0.5545], [0.7804, 0.4954], [0.8361, 0.4288], [0.8606, 0.3752]],
    trilhaLarg: 0.0067,
    rampa: [[0.7402, 0.3383], [0.7804, 0.3549], [0.7826, 0.4954], [0.7402, 0.4954]],          // degraus de concreto na ponta leste
    pracaNO: { c: [0.2062, 0.1553], r: 0.0580 },    // praça redonda com canteiros em estrela
    pracaSE: { c: [0.7090, 0.6322], r: 0.0334 },    // praça redonda de concreto da Prefeitura
    rotatoria: { c: [0.9610, 0.3697], r: 0.0201 },
    estacionamento: [[0.3032, 0.6396], [0.5084, 0.6248], [0.5151, 0.8133], [0.2988, 0.7911]],
    patioPref: [0.5440, 0.6248, 0.7692, 0.8983],                 // o piso em volta da Prefeitura
    prefeitura: [[0.5574, 0.6470, 0.6488, 0.8688], [0.6522, 0.6617, 0.7559, 0.8688]],   // os dois blocos [x0, y0, x1, y1]
    boiadeiro: [[0.2285, 0.7985, 0.3567, 0.9335], [0.1672, 0.7579, 0.2174, 0.8651]],
    lojasOeste: [[0.0535, 0.0037, 0.1249, 0.0739], [0.0401, 0.0887, 0.1226, 0.1701], [0.0312, 0.1848, 0.1115, 0.2588], [0.0156, 0.2957, 0.0959, 0.3919], [0.0089, 0.4104, 0.0892, 0.4843], [0.0045, 0.5028, 0.0803, 0.5841], [0.0000, 0.6026, 0.0691, 0.6506]],
    casasNorte: [[0.2921, 0.0000, 0.3545, 0.0222], [0.5240, 0.0000, 0.5797, 0.0407], [0.6299, 0.0000, 0.7135, 0.0222]],
    ruas: [ // linhas do meio e largura
      { nome: 'Rua do oeste', linha: [[0.1427, -0.0185], [0.0334, 1.0351]], larg: 0.0178 },
      { nome: 'Av. Vicente', linha: [[0.8384, -0.0185], [0.8807, 0.3327], [0.7860, 1.0351]], larg: 0.0312 },
      { nome: 'Rua do Boiadeiro', linha: [[0.0446, 0.7246], [0.2988, 0.7431], [0.5240, 0.8355], [0.7804, 0.9519], [1.0033, 1.0444]], larg: 0.0156 },
      { nome: 'Rua Francisca Cândida', linha: [[0.6076, -0.0185], [0.6522, 0.1386]], larg: 0.0145 },
    ],
    arvoresBeira: [[0.4682, 0.2181], [0.5641, 0.2643]],   // as duas árvores grandes na beira norte da água
  };
  Lg.FORMA = FORMA;

  /* ------------------------------------------------------------------ */
  /* Ajudantes (tudo em TILES: x para o leste, y para o sul)              */
  /* ------------------------------------------------------------------ */
  const W = 200, H = 121;
  const tp = (p) => [p[0] * W, p[1] * H];
  const tps = (ps) => ps.map(tp);
  const len = (v) => v * W; // largura/distância (fração da largura da foto) → tiles

  function inPoly(P, x, y) {
    let inside = false;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      const xi = P[i][0], yi = P[i][1], xj = P[j][0], yj = P[j][1];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function segDist(x, y, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, k = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(x - ax - k * dx, y - ay - k * dy);
  }
  // distância até uma linha (aberta) ou até a borda de um polígono (fechado)
  function lineDist(P, x, y, closed) {
    let best = 1e9;
    const n = P.length;
    for (let i = closed ? 0 : 1; i < n; i++) {
      const a = P[i === 0 ? n - 1 : i - 1], b = P[i];
      best = Math.min(best, segDist(x, y, a[0], a[1], b[0], b[1]));
    }
    return best;
  }
  // estica as pontas de uma linha (as ruas continuam pela cidade em volta)
  function stretch(P, k) {
    const a = P[0], b = P[1], c = P[P.length - 2], d = P[P.length - 1];
    const la = Math.hypot(a[0] - b[0], a[1] - b[1]), ld = Math.hypot(d[0] - c[0], d[1] - c[1]);
    return [[a[0] + ((a[0] - b[0]) / la) * k, a[1] + ((a[1] - b[1]) / la) * k], ...P, [d[0] + ((d[0] - c[0]) / ld) * k, d[1] + ((d[1] - c[1]) / ld) * k]];
  }
  const rectT = (r) => ({ x0: r[0] * W, y0: r[1] * H, x1: r[2] * W, y1: r[3] * H });

  // a avenida: um sistema de coordenadas próprio (s = ao longo, d = para o lado; + = para o lago)
  const av = FORMA.avenida, A = tp(av.a), B = tp(av.b);
  const AL = Math.hypot(B[0] - A[0], B[1] - A[1]), DIR = [(B[0] - A[0]) / AL, (B[1] - A[1]) / AL], NRM = [-DIR[1], DIR[0]];
  const band = (k) => [len(av[k][0]), len(av[k][1])];
  const AV = { A, DIR, NRM, calcadaN: band('calcadaN'), pistaN: band('pistaN'), canteiro: band('canteiro'), pistaS: band('pistaS'), calcada: band('calcada') };
  AV.local = (x, y) => ({ s: (x - A[0]) * DIR[0] + (y - A[1]) * DIR[1], d: (x - A[0]) * NRM[0] + (y - A[1]) * NRM[1] });
  AV.world = (s, d) => [A[0] + DIR[0] * s + NRM[0] * d, A[1] + DIR[1] * s + NRM[1] * d];
  AV.sAtX = (x) => (x - A[0]) / DIR[0]; // (na linha do meio)
  AV.angle = Math.atan2(DIR[1], DIR[0]);
  // em que faixa da avenida está o ponto (ou null)
  AV.zone = (x, y) => {
    const d = AV.local(x, y).d;
    if (d < AV.calcadaN[0] || d >= AV.calcada[1]) return null;
    if (d < AV.calcadaN[1]) return 'calcadaN';
    if (d < AV.pistaN[1]) return 'pistaN';
    if (d < AV.canteiro[1]) return 'canteiro';
    if (d < AV.pistaS[1]) return 'pistaS';
    return 'calcada';
  };

  const F = {
    W, H, tp, tps, len, inPoly, lineDist, segDist, stretch, rectT, AV,
    lago: tps(FORMA.lago),
    trilha: tps(FORMA.trilha), trilhaLarg: len(FORMA.trilhaLarg),
    rampa: tps(FORMA.rampa),
    pracaNO: { c: tp(FORMA.pracaNO.c), r: len(FORMA.pracaNO.r) },
    pracaSE: { c: tp(FORMA.pracaSE.c), r: len(FORMA.pracaSE.r) },
    rotatoria: { c: tp(FORMA.rotatoria.c), r: len(FORMA.rotatoria.r) },
    estacionamento: tps(FORMA.estacionamento),
    patioPref: rectT(FORMA.patioPref),
    prefeitura: FORMA.prefeitura.map(rectT),
    boiadeiro: FORMA.boiadeiro.map(rectT),
    lojasOeste: FORMA.lojasOeste.map(rectT),
    casasNorte: FORMA.casasNorte.map(rectT),
    ruas: FORMA.ruas.map((r) => ({ nome: r.nome, linha: tps(r.linha), longe: stretch(tps(r.linha), 400), larg: len(r.larg) })),
    arvoresBeira: tps(FORMA.arvoresBeira),
  };
  const inRect = (r, x, y) => x >= r.x0 && x < r.x1 && y >= r.y0 && y < r.y1;
  F.inRect = inRect;
  F.inLake = (x, y) => inPoly(F.lago, x, y);
  F.lakeDist = (x, y) => lineDist(F.lago, x, y, true);
  // numa rua (far = a rua esticada pela cidade). Cada trecho guarda a sua caixa: quase todo ponto
  // é descartado sem conta (a cidade em volta pergunta isso para mais de um milhão de tiles)
  function segs(P, w) {
    const out = [];
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1], b = P[i];
      out.push([a[0], a[1], b[0], b[1], Math.min(a[0], b[0]) - w, Math.max(a[0], b[0]) + w, Math.min(a[1], b[1]) - w, Math.max(a[1], b[1]) + w]);
    }
    return out;
  }
  for (const r of F.ruas) { r.segs = segs(r.linha, r.larg / 2); r.segsLonge = segs(r.longe, r.larg / 2); }
  F.roadAt = (x, y, far) => {
    for (const r of F.ruas) {
      for (const q of far ? r.segsLonge : r.segs) {
        if (x < q[4] || x > q[5] || y < q[6] || y > q[7]) continue;
        if (segDist(x, y, q[0], q[1], q[2], q[3]) < r.larg / 2) return r;
      }
    }
    return null;
  };
  F.building = (x, y) => {
    for (const r of F.prefeitura) if (inRect(r, x, y)) return 'pref';
    for (const r of F.boiadeiro) if (inRect(r, x, y)) return 'boi';
    for (const r of F.lojasOeste) if (inRect(r, x, y)) return 'loja';
    for (const r of F.casasNorte) if (inRect(r, x, y)) return 'casa';
    return null;
  };
  Lg.F = F;
})();

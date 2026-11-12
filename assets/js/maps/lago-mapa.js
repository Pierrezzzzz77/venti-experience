/* Venti Experience — Parte 0: O MAPA LÓGICO do Lago da Prefeitura e da cidade em volta.

   Uma grade só (1 célula = 1 tile) diz o que há em cada lugar: água, grama, canteiro, trilha, calçada,
   rua, faixa de pedestre, estacionamento, vaga, lote, prédio, praça, terra, campo. TUDO sai dela:
     · o chão é pintado a partir das MESMAS formas e na MESMA ordem em que a grade é preenchida
       (pintar(): o chão do mapa, a cidade de perto e a cidade de longe usam a mesma função);
     · prédios só nascem dentro de um lote, alinhados à rua do lote, e só ficam se cabem inteiros nele;
     · carros, árvores, postes, gente e bichos são postos em cima dos tipos certos (lago-cenario.js,
       lago-vida.js) e conferidos por validarMapa() (abra com ?debug=1).

   Ruas medidas nas fotos (norte para cima; coordenadas em tiles do mapa = foto 13 inteira, 200 × 121):
     foto 13 → tiles: × 0,223      foto 14 → tiles: (51,06 + 0,1583·x ; 61,54 + 0,1583·y)
     foto 12 → tiles: ((x − 243)·0,6194 ; (y − 187)·0,6194)
   O bairro a oeste da Av. Weyne Cavalcante tem as ruas no mesmo ângulo da Av. São João (≈ 13,8°):
   uma grade "G1" (u ao longo da São João, v para o sul). A leste da Weyne a grade "G2" é reta (norte/sul). */
(function () {
  'use strict';
  const DL = window.DL, Lg = DL.Lago, F = Lg.F, AV = F.AV, hash = DL.hash, P = Lg.PAL;

  /* ------------------------------------------------------------------ */
  /* Tipos de célula                                                     */
  /* ------------------------------------------------------------------ */
  const NOMES = ['campo', 'terra', 'lote', 'predio', 'grama', 'canteiro', 'trilha', 'calcada', 'rua', 'faixa', 'estac', 'vaga', 'praca', 'margem', 'agua'];
  const TP = {};
  NOMES.forEach((n, i) => (TP[n] = i));
  // a letra de cada tipo no mapa do motor (lago-cenario.js: L.rows)
  const LETRA = { campo: 't', terra: 't', lote: 'l', predio: 'B', grama: 'g', canteiro: 'c', trilha: 'v', calcada: 's', rua: 'r', faixa: 'z', estac: 'e', vaga: 'e', praca: 'q', margem: 'm', agua: '~' };

  // a grade cobre a cidade inteira
  const RG = { x0: -560, x1: 760, y0: -420, y1: 420 };
  const GW = RG.x1 - RG.x0, GH = RG.y1 - RG.y0;
  const tipo = new Uint8Array(GW * GH), dono = new Int32Array(GW * GH);
  const idx = (x, y) => (y - RG.y0) * GW + (x - RG.x0);

  /* ------------------------------------------------------------------ */
  /* Geometria                                                           */
  /* ------------------------------------------------------------------ */
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]], add = (a, b) => [a[0] + b[0], a[1] + b[1]], mul = (a, k) => [a[0] * k, a[1] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1], crs = (a, b) => a[0] * b[1] - a[1] * b[0];
  const len = (a) => Math.hypot(a[0], a[1]), nrm = (a) => mul(a, 1 / (len(a) || 1));
  const right = (v) => [-v[1], v[0]]; // a normal à direita de quem anda (y para baixo: leste → sul)
  const inPoly = F.inPoly;
  const G = (u, v) => AV.world(u, v);                      // grade G1 → tiles
  const UV = (x, y) => { const l = AV.local(x, y); return [l.s, l.d]; };
  // interseção das retas p + t·d e q + s·e  → [t, s]
  function lineX(p, d, q, e) {
    const den = crs(d, e);
    if (Math.abs(den) < 1e-9) return null;
    const w = sub(q, p);
    return [crs(w, e) / den, crs(w, d) / den];
  }
  function segX(a, b, c, d) {
    const r = lineX(a, sub(b, a), c, sub(d, c));
    if (!r || r[0] < -1e-7 || r[0] > 1 + 1e-7 || r[1] < -1e-7 || r[1] > 1 + 1e-7) return null;
    return r;
  }
  const bboxOf = (pts, pad) => {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
    pad = pad || 0;
    return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
  };
  // ponto dentro de um quadrilátero convexo (em qualquer sentido)
  function inQuad(q, x, y) {
    let s = 0;
    for (let i = 0; i < 4; i++) {
      const a = q[i], b = q[(i + 1) & 3], c = (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
      if (c !== 0) { if (s === 0) s = Math.sign(c); else if (Math.sign(c) !== s) return false; }
    }
    return true;
  }
  function inTri(a, b, c, x, y) {
    const d1 = (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
    const d2 = (c[0] - b[0]) * (y - b[1]) - (c[1] - b[1]) * (x - b[0]);
    const d3 = (a[0] - c[0]) * (y - c[1]) - (a[1] - c[1]) * (x - c[0]);
    return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
  }

  /* ------------------------------------------------------------------ */
  /* As ruas                                                             */
  /* ------------------------------------------------------------------ */
  // perfis: faixas [d0, d1, tipo] (d em tiles; + = à direita de quem anda do primeiro para o último ponto)
  const perfil = (rw, sw) => [[-rw - sw, -rw, 'calcada'], [-rw, rw, 'rua'], [rw, rw + sw, 'calcada']];
  const perfilAv = (med, pista, sw) => [[-(med + pista + sw), -(med + pista), 'calcada'], [-(med + pista), -med, 'rua'], [-med, med, 'canteiro'], [med, med + pista, 'rua'], [med + pista, med + pista + sw, 'calcada']];
  const RUAS = [];
  function rua(nome, pts, bands, o) {
    if (!pts || pts.length < 2) return null;
    const r = Object.assign({ nome, pts, bands, lots: true, cls: 'res', id: RUAS.length }, o || {});
    r.cum = [0];
    r.dirs = [];
    for (let i = 1; i < pts.length; i++) { const d = sub(pts[i], pts[i - 1]); r.cum.push(r.cum[i - 1] + len(d)); r.dirs.push(nrm(d)); }
    r.len = r.cum[r.cum.length - 1];
    if (r.len < 6) return null;
    // as bordas: asfalto e calçada de cada lado (números positivos)
    r.aR = Math.max(...bands.filter((b) => b[2] === 'rua').map((b) => b[1]));
    r.aL = -Math.min(...bands.filter((b) => b[2] === 'rua').map((b) => b[0]));
    r.oR = Math.max(...bands.map((b) => b[1]));
    r.oL = -Math.min(...bands.map((b) => b[0]));
    r.cuts = [];      // trechos sem canteiro (cruzamentos, travessia)
    r.zones = [];     // trechos ocupados por cruzamentos (sem lote)
    RUAS.push(r);
    return r;
  }
  // ponto na rua: s ao longo, d para o lado
  function at(r, s, d) {
    let i = 0;
    while (i < r.dirs.length - 1 && s > r.cum[i + 1]) i++;
    const dir = r.dirs[i], n = right(dir), k = s - r.cum[i];
    return add(add(r.pts[i], mul(dir, k)), mul(n, d || 0));
  }
  function dirAt(r, s) { let i = 0; while (i < r.dirs.length - 1 && s > r.cum[i + 1]) i++; return r.dirs[i]; }
  // (s, d) de um ponto em relação à rua (o trecho mais perto)
  function local(r, x, y) {
    let best = null;
    for (let i = 0; i < r.dirs.length; i++) {
      const a = r.pts[i], dir = r.dirs[i], w = sub([x, y], a), segL = r.cum[i + 1] - r.cum[i];
      const t = Math.max(0, Math.min(segL, dot(w, dir))), d = dot(w, right(dir)), off = Math.hypot(dot(w, dir) - t, 0);
      const dist = Math.hypot(off, d);
      if (!best || dist < best.dist) best = { s: r.cum[i] + t, d, dist, i };
    }
    return best;
  }
  // corta uma polilinha onde ela deixa de cumprir keep(p) (a ponta vira o ponto da borda, por bissecção)
  function clipPoly(pts, keep) {
    // pontos a cada ~2 tiles (assim um trecho longo que entra e sai da região não se perde)
    const dense = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const n = Math.max(1, Math.ceil(len(sub(pts[i], pts[i - 1])) / 2));
      for (let j = 1; j <= n; j++) dense.push(add(pts[i - 1], mul(sub(pts[i], pts[i - 1]), j / n)));
    }
    pts = dense;
    const out = [];
    let cur = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], k = keep(p);
      if (i > 0) {
        const q = pts[i - 1], kq = keep(q);
        if (k !== kq) {
          let a = 0, b = 1;
          for (let it = 0; it < 40; it++) { const m = (a + b) / 2, pm = add(q, mul(sub(p, q), m)); if (keep(pm) === kq) a = m; else b = m; }
          const e = add(q, mul(sub(p, q), (a + b) / 2));
          if (kq) { cur.push(e); out.push(cur); cur = []; } else cur.push(e);
        }
      }
      if (k) cur.push(p);
    }
    if (cur.length) out.push(cur);
    return out.filter((c) => c.length >= 2).map(simplify);
  }
  // tira os pontos do meio que estão na mesma reta (os pontos extras do recorte)
  function simplify(p) {
    const out = [p[0]];
    for (let i = 1; i < p.length - 1; i++) {
      const a = out[out.length - 1], b = p[i], c = p[i + 1];
      const cr = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      if (Math.abs(cr) / (len(sub(c, a)) || 1) > 0.02) out.push(b); // fica só onde a linha dobra de verdade
    }
    out.push(p[p.length - 1]);
    return out;
  }
  // o maior pedaço
  const longest = (parts) => parts.sort((a, b) => polyLen(b) - polyLen(a))[0] || null;
  function polyLen(p) { let l = 0; for (let i = 1; i < p.length; i++) l += len(sub(p[i], p[i - 1])); return l; }

  // Av. Weyne Cavalcante (fotos 12 e 13): a avenida larga na diagonal, a leste do lago
  const WEYNE = [[100, -160], [169, 0], [178, 20], [191, 46], [252, 145], [330, 285]];
  // x da Weyne na altura y
  function weyneX(y) {
    for (let i = 1; i < WEYNE.length; i++) {
      const a = WEYNE[i - 1], b = WEYNE[i];
      if (y <= b[1] || i === WEYNE.length - 1) return a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]);
    }
    return 0;
  }
  const westOfWeyne = (p) => p[0] < weyneX(p[1]);

  // reta G1 u = c (norte → sul) e v = c (oeste → leste)
  const lineU = (c, v0, v1) => [G(c, v0), G(c, v1)];
  const lineV = (c, u0, u1) => [G(u0, c), G(u1, c)];
  // estende uma reta (2 pontos) até muito longe para os dois lados
  const longLine = (a, b) => { const d = nrm(sub(b, a)); return [sub(a, mul(d, 900)), add(b, mul(d, 900))]; };
  // ponto onde a reta (a,b) cruza a polilinha Q
  function hitPoly(a, b, Q) {
    for (let i = 1; i < Q.length; i++) { const r = segX(a, b, Q[i - 1], Q[i]); if (r) return add(a, mul(sub(b, a), r[0])); }
    return null;
  }
  const U_W = -340, V_N = -160, V_SD = 154.6; // os limites da grade G1 (oeste, norte, R. Santos Dumont)

  // 1. Av. São João (inclinada, o canteiro com árvores; perfil de lago-forma.js: AV)
  const J = hitPoly(...longLine(G(-340, 0), G(300, 0)), WEYNE);           // o encontro com a Weyne (rotatória)
  const sjBands = [[AV.calcadaN[0], AV.calcadaN[1], 'calcada'], [AV.pistaN[0], AV.pistaN[1], 'rua'], [AV.canteiro[0], AV.canteiro[1], 'canteiro'], [AV.pistaS[0], AV.pistaS[1], 'rua'], [AV.calcada[0], AV.calcada[1], 'calcada']];
  const SJ = rua('Av. São João', [G(U_W, 0), J], sjBands, { cls: 'com', av: true, sjOff: U_W });
  const sjS = (u) => u - U_W; // s na polilinha da São João a partir do u da avenida (lago-forma.js)

  // 2. Av. Weyne Cavalcante
  const WY = rua('Av. Weyne Cavalcante', WEYNE, perfilAv(2, 5, 2.5), { cls: 'com', av: true, depth: 14 });

  // 3. a rua a oeste do lago (R. 5 de Março, foto 13)
  const roLine = longLine([28.5, -2.2], [6.7, 125]);
  const keepG1 = (p) => { const [u, v] = UV(p[0], p[1]); return westOfWeyne(p) && u >= U_W - 1e-6 && v >= V_N - 1e-6 && v <= V_SD + 1e-6; };
  const RO = rua('Rua do oeste', longest(clipPoly(roLine, keepG1)), perfil(1.8, 1.5), { cls: 'com' });

  // 4. a rua ao sul do lago, da Prefeitura e do estacionamento (fotos 13 e 14)
  const rsRaw = [[-300, 13.4], [20, 87], [55, 94.5], [106, 107], [150, 116.5], [270, 143]];
  const RS = rua('Rua do Boiadeiro', longest(clipPoly(rsRaw, (p) => westOfWeyne(p) && UV(p[0], p[1])[0] >= U_W)), perfil(3.2, 1.6), { cls: 'res' });

  // 5. Av. José Vicente: da São João para o sul, a leste da Prefeitura
  const viLine = longLine([169, 37.6], [150, 121]);
  const VI = rua('Av. José Vicente', longest(clipPoly(viLine, (p) => { const [, v] = UV(p[0], p[1]); return local(SJ, p[0], p[1]).d >= 0 && v <= V_SD; })), perfil(2.6, 1.5));

  // 6. R. Francisca Cândida: a diagonal ao norte da São João
  const fcRaw = [[66, -128], [96, -60], [131.5, 18], [140, 37]];
  const FC = rua('R. Francisca Cândida', longest(clipPoly(fcRaw, (p) => local(SJ, p[0], p[1]).d <= 0 && UV(p[0], p[1])[1] >= -108)), perfil(1.8, 1.4));

  // 7. as ruas da grade G1 (bairros a oeste e ao norte; ao sul da rua do Boiadeiro)
  const southOfRS = (p) => local(RS, p[0], p[1]).d >= 0;
  const westOf = (r) => (p) => local(r, p[0], p[1]).d >= 0; // ruas que descem (norte → sul): a direita é o oeste
  const G1 = [];
  const addG1 = (nome, pts, keep, bands, o) => { for (const part of clipPoly(pts, (p) => keepG1(p) && keep(p))) { const r = rua(nome, part, bands, o); if (r) G1.push(r); } };
  // leste-oeste
  addG1('R. Santos Dumont', lineV(V_SD, U_W, 420), () => true, perfil(3, 1.6));
  addG1('Av. Ipanema', lineV(-108, U_W, 420), () => true, perfil(3, 1.6), { cls: 'com' });
  for (const c of [-144, -72, -36]) addG1('rua', lineV(c, U_W, 420), () => true, perfil(2.2, 1.4));
  addG1('rua', lineV(41, U_W, 60), (p) => westOf(RO)(p), perfil(2.2, 1.4));
  addG1('rua', lineV(118, U_W, 420), (p) => westOf(VI)(p), perfil(2.2, 1.4));
  // norte-sul
  for (let k = 1; k <= 9; k++) addG1('rua', lineU(-36 * k, V_N, V_SD), () => true, perfil(2.2, 1.4));
  for (const c of [36, 72, 108]) addG1('rua', lineU(c, V_N, 0), (p) => local(SJ, p[0], p[1]).d <= 0, perfil(2.2, 1.4));
  for (const c of [30, 72, 108]) addG1(c === 72 ? 'R. 13 de Julho' : 'rua', lineU(c, 40, V_SD), southOfRS, perfil(2.2, 1.4));
  // o antigo campo vazio entre a Av. José Vicente e a Weyne (ao lado da Prefeitura): agora é bairro
  const eastOfVI = (p) => !westOf(VI)(p) && local(VI, p[0], p[1]).dist > VI.oL + 2;
  const southOfSJ = (p) => local(SJ, p[0], p[1]).d >= SJ.oR + 1;
  for (const c of [41]) addG1('rua', lineV(c, U_W, 420), (p) => eastOfVI(p) && southOfSJ(p) && !southOfRS(p), perfil(2.2, 1.4)); // (ao sul, a Rua do Boiadeiro já passa)
  for (const c of [176, 212, 248]) addG1('rua', lineU(c, 0, V_SD), (p) => eastOfVI(p) && southOfSJ(p), perfil(2.2, 1.4));

  // 8. a grade G2 (a leste da Weyne): ruas retas, norte-sul e leste-oeste (R. Progresso, R. Tocantins, Av. Carajás…)
  const G2 = [];
  const VAZ2 = { x0: 0, x1: 330, y0: -50.8, y1: 32.8 }; // o terreno grande vazio entre a R. Progresso e a R. Tocantins
  const addG2 = (nome, pts, bands, o) => {
    for (const part of clipPoly(pts, (p) => !westOfWeyne(p) && p[0] <= 590 && p[1] >= -125 && p[1] <= 295)) { const r = rua(nome, part, bands, o); if (r) G2.push(r); }
  };
  for (let x = 222; x <= 574; x += 32) {
    addG2(x === 350 ? 'R. Manaus' : 'rua', [[x, -125], [x, 295]], perfil(2.2, 1.4)); // (o terreno vazio virou bairro)
  }
  for (const y of [-115, -83, -50.8, -18, 32.8, 62, 92, 122.6, 155, 190.8, 222, 255, 288]) {
    const big = y === -115 || y === 122.6, nome = y === -115 ? 'Avenida Industrial' : y === 122.6 ? 'Av. Carajás' : y === -50.8 ? 'R. Progresso' : y === 32.8 ? 'R. Tocantins' : 'rua';
    addG2(nome, [[100, y], [600, y]], big ? perfil(3.5, 1.8) : perfil(2.2, 1.4), { cls: y < -50 ? 'ind' : big ? 'com' : 'res' });
  }

  /* ------------------------------------------------------------------ */
  /* Zonas: o parque do lago, os terrenos vazios, os bairros               */
  /* ------------------------------------------------------------------ */
  const cross = (a, b) => {
    for (let i = 1; i < a.pts.length; i++) for (let j = 1; j < b.pts.length; j++) { const r = segX(a.pts[i - 1], a.pts[i], b.pts[j - 1], b.pts[j]); if (r) return add(a.pts[i - 1], mul(sub(a.pts[i], a.pts[i - 1]), r[0])); }
    return null;
  };
  const SD = G1.find((r) => r.nome === 'R. Santos Dumont');
  const PARQUE = [cross(SJ, RO), cross(SJ, VI), cross(RS, VI), cross(RS, RO)];
  const V1 = [cross(SJ, VI), J, hitPoly(...longLine(G(-340, V_SD), G(400, V_SD)), WEYNE), cross(VI, SD)];
  const V2 = [[weyneX(VAZ2.y0), VAZ2.y0], [VAZ2.x1, VAZ2.y0], [VAZ2.x1, VAZ2.y1], [weyneX(VAZ2.y1), VAZ2.y1]];
  // os bairros (a área da terra; fora deles: campo e mata)
  const weyneUpTo = (y0, y1) => WEYNE.filter((p) => p[1] > y0 && p[1] < y1);
  const wN = hitPoly(...longLine(G(-340, V_N), G(400, V_N)), WEYNE), wS = hitPoly(...longLine(G(-340, V_SD + 2), G(400, V_SD + 2)), WEYNE);
  const ZG1 = [G(U_W, V_N), wN, ...weyneUpTo(wN[1], wS[1]), wS, G(U_W, V_SD + 2)];
  const ZG2 = [[weyneX(-125), -125], [590, -125], [590, 295], [weyneX(295), 295], ...weyneUpTo(-125, 295).reverse()];
  function zona(x, y) {
    if (inPoly(PARQUE, x, y)) return 'parque';
    if (inPoly(ZG1, x, y)) return 'g1';
    if (inPoly(ZG2, x, y)) return 'g2';
    return 'campo';
  }

  /* ------------------------------------------------------------------ */
  /* Cruzamentos: esquinas arredondadas, faixas de pedestre, cortes       */
  /* ------------------------------------------------------------------ */
  const RC = 1.5;              // raio da esquina (meio-fio)
  const NEAR = { x0: -96, x1: 296, y0: -64, y1: 168 };
  const inNear = (p) => p[0] > NEAR.x0 && p[0] < NEAR.x1 && p[1] > NEAR.y0 && p[1] < NEAR.y1;
  const JUNC = [];
  for (let a = 0; a < RUAS.length; a++) {
    for (let b = a + 1; b < RUAS.length; b++) {
      const A = RUAS[a], B = RUAS[b];
      for (let i = 1; i < A.pts.length; i++) {
        for (let j = 1; j < B.pts.length; j++) {
          const r = segX(A.pts[i - 1], A.pts[i], B.pts[j - 1], B.pts[j]);
          if (!r) continue;
          const p = add(A.pts[i - 1], mul(sub(A.pts[i], A.pts[i - 1]), r[0]));
          if (JUNC.some((q) => len(sub(q.p, p)) < 0.5)) continue;
          JUNC.push({ p, A, B, sA: A.cum[i - 1] + r[0] * (A.cum[i] - A.cum[i - 1]), sB: B.cum[j - 1] + r[1] * (B.cum[j] - B.cum[j - 1]) });
        }
      }
    }
  }
  // em cada cruzamento: os "braços" (as ruas saindo dele)
  const FILLETS = [], ZEBRAS = [];
  for (const j of JUNC) {
    const arms = [];
    for (const [r, s] of [[j.A, j.sA], [j.B, j.sB]]) {
      if (s < r.len - 0.5) arms.push({ r, s, sg: 1, dir: dirAt(r, s + 0.01) });
      if (s > 0.5) arms.push({ r, s, sg: -1, dir: mul(dirAt(r, s - 0.01), -1) });
    }
    // cada rua: um trecho sem canteiro e sem lote em volta do cruzamento
    for (const [r, s, o] of [[j.A, j.sA, j.B], [j.B, j.sB, j.A]]) {
      const sn = Math.abs(crs(dirAt(r, s), dirAt(o, o === j.A ? j.sA : j.sB))) || 1;
      const isRot = len(sub(j.p, J)) < 1;
      const half = isRot ? 11.5 : Math.max(o.aL, o.aR) / sn + 1;
      r.cuts.push([s - half, s + half]);
      r.zones.push([s - Math.max(o.oL, o.oR) / sn - RC - 2, s + Math.max(o.oL, o.oR) / sn + RC + 2]);
    }
    arms.forEach((m) => (m.ang = Math.atan2(m.dir[1], m.dir[0])));
    arms.sort((a, b) => a.ang - b.ang);
    // a extensão de cada lado do braço (do lado direito / esquerdo de quem sai do cruzamento)
    const sideR = (m, key) => (m.sg > 0 ? m.r[key + 'R'] : m.r[key + 'L']);
    const sideL = (m, key) => (m.sg > 0 ? m.r[key + 'L'] : m.r[key + 'R']);
    for (let k = 0; k < arms.length; k++) {
      const p = arms[k], q = arms[(k + 1) % arms.length];
      let delta = q.ang - p.ang;
      if (k === arms.length - 1) delta += Math.PI * 2;
      if (arms.length < 2 || delta > Math.PI - 0.15 || delta < 0.15) continue;
      const np = right(p.dir), nq = mul(right(q.dir), -1);
      const mk = (ep, eq, rr) => {
        const C = solve(j.p, np, ep + rr, nq, eq + rr), V = solve(j.p, np, ep, nq, eq);
        if (!C || !V) return null;
        const Tp = sub(C, mul(np, rr)), Tq = sub(C, mul(nq, rr));
        if (dot(sub(Tp, j.p), p.dir) <= 0 || dot(sub(Tq, j.p), q.dir) <= 0) return null;
        return { C, V, Tp, Tq, r: rr };
      };
      const fa = mk(sideR(p, 'a'), sideL(q, 'a'), RC), fs = mk(sideR(p, 'o'), sideL(q, 'o'), RC + 1.5);
      if (fa) FILLETS.push(Object.assign(fa, { t: 'rua' }));
      if (fs) FILLETS.push(Object.assign(fs, { t: 'calcada' }));
    }
    // faixas de pedestre: em cada braço, na linha da calçada da outra rua (só perto do lago)
    if (inNear(j.p) && len(sub(j.p, J)) > 1) {
      for (const m of arms) {
        const o = m.r === j.A ? j.B : j.A, so = o === j.A ? j.sA : j.sB, od = dirAt(o, so);
        const sn = Math.abs(crs(m.dir, od)) || 1;
        // até onde vai a outra rua (asfalto e calçada) medido ao longo deste braço
        const side = dot(m.dir, right(od)) > 0 ? 'R' : 'L';
        const e = o['a' + side] / sn, w = (o['o' + side] - o['a' + side]) / sn;
        ZEBRAS.push({ r: m.r, s0: m.s + m.sg * (e + 0.25), s1: m.s + m.sg * (e + Math.max(1.2, w - 0.15)) });
      }
    }
  }
  function solve(J0, n1, c1, n2, c2) {
    // dot(X − J0, n1) = c1 ; dot(X − J0, n2) = c2
    const den = n1[0] * n2[1] - n1[1] * n2[0];
    if (Math.abs(den) < 1e-6) return null;
    return [J0[0] + (c1 * n2[1] - c2 * n1[1]) / den, J0[1] + (n1[0] * c2 - n2[0] * c1) / den];
  }

  // a faixa de pedestre do meio da São João (o jogador atravessa aqui; lago-cenario.js)
  const S_CROSS = AV.sAtX(104), S_CAR = AV.sAtX(98);
  SJ.cuts.push([sjS(S_CROSS) - 1.5, sjS(S_CROSS) + 1.5]);
  ZEBRAS.push({ r: SJ, s0: sjS(S_CROSS) - 1.5, s1: sjS(S_CROSS) + 1.5, meio: true });

  /* ------------------------------------------------------------------ */
  /* Lotes e casas                                                       */
  /* ------------------------------------------------------------------ */
  const CLS = {
    res: { w: 5, depth: 14, vazio: 0.08 },
    com: { w: 9, depth: 13, vazio: 0.06 },
    ind: { w: 16, depth: 20, vazio: 0.15 },
  };
  const LOTES = [], CASAS = [];
  const inZones = (r, s0, s1) => r.zones.some((z) => s1 > z[0] && s0 < z[1]);
  // lotes não se sobrepõem: nas esquinas fica o lote da rua que veio primeiro (as avenidas)
  const LBUCK = new Map(), LB = 16;
  const bkey = (x, y) => Math.floor(x / LB) * 4096 + Math.floor(y / LB);
  function overlapQ(a, b) {
    // separação por eixos (dois quadriláteros convexos; encostar não conta)
    for (const P of [a, b]) for (let i = 0; i < 4; i++) {
      const e = sub(P[(i + 1) & 3], P[i]), ax = [-e[1], e[0]];
      let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
      for (const p of a) { const d = dot(p, ax); a0 = Math.min(a0, d); a1 = Math.max(a1, d); }
      for (const p of b) { const d = dot(p, ax); b0 = Math.min(b0, d); b1 = Math.max(b1, d); }
      const l = len(ax) || 1;
      if (a1 - b0 < 0.3 * l || b1 - a0 < 0.3 * l) return false;
    }
    return true;
  }
  function lotFree(q) {
    const bb = bboxOf(q);
    for (let x = Math.floor(bb[0] / LB); x <= Math.floor(bb[2] / LB); x++) for (let y = Math.floor(bb[1] / LB); y <= Math.floor(bb[3] / LB); y++) {
      for (const L of LBUCK.get(x * 4096 + y) || []) if (overlapQ(q, L.q)) return false;
    }
    return true;
  }
  function lotAdd(L) {
    const bb = bboxOf(L.q);
    for (let x = Math.floor(bb[0] / LB); x <= Math.floor(bb[2] / LB); x++) for (let y = Math.floor(bb[1] / LB); y <= Math.floor(bb[3] / LB); y++) {
      const k = x * 4096 + y; if (!LBUCK.has(k)) LBUCK.set(k, []); LBUCK.get(k).push(L);
    }
  }
  function makeLots(r) {
    if (!r.lots) return;
    const c = CLS[r.cls], depth = r.depth || c.depth;
    for (const sg of [1, -1]) {
      const o = sg > 0 ? r.oR : r.oL;
      for (let i = 0; i < r.dirs.length; i++) {
        const segL = r.cum[i + 1] - r.cum[i], dir = r.dirs[i], n = mul(right(dir), sg);
        for (let k = 0.5; k + c.w <= segL - 0.5; k += c.w) {
          const s0 = r.cum[i] + k, s1 = s0 + c.w;
          if (inZones(r, s0, s1)) continue;
          const a = add(r.pts[i], mul(dir, k));
          const quad = (dp) => [add(a, mul(n, o)), add(a, add(mul(dir, c.w), mul(n, o))), add(a, add(mul(dir, c.w), mul(n, o + dp))), add(a, mul(n, o + dp))];
          let q = quad(depth);
          const ctr0 = mul(add(q[0], q[2]), 0.5), z = zona(ctr0[0], ctr0[1]);
          if (z !== 'g1' && z !== 'g2') continue;
          // se não cabe (a quadra é estreita), o lote fica mais raso
          let dp = depth;
          while (!lotFree(q) && dp > depth * 0.6) { dp -= 1; q = quad(dp); }
          if (!lotFree(q)) continue;
          const ctr = mul(add(q[0], q[2]), 0.5);
          const id = LOTES.length + 1, h = hash(Math.round(ctr[0] * 7.3) * 131 + Math.round(ctr[1] * 3.1) * 71);
          const L = { id, q, r, cls: r.cls, dir, n, a: add(a, mul(n, o)), w: c.w, depth: dp, h };
          L.vazio = h < c.vazio;
          L.chao = L.vazio ? 'baldio' : r.cls === 'res' ? (hash(id * 3) < 0.6 ? 'quintal' : 'cimentado') : 'cimentado';
          LOTES.push(L);
          lotAdd(L);
        }
      }
    }
  }
  // ordem: as avenidas primeiro (ficam com as esquinas), depois as ruas comerciais, por último as pequenas
  const lotOrder = [SJ, WY, SD, ...G1.filter((r) => r.cls === 'com'), ...G2.filter((r) => r.cls === 'com'), RS, RO, VI, FC, ...G1.filter((r) => !r.av && r.cls !== 'com'), ...G2.filter((r) => r.cls === 'res' || r.cls === 'ind')];
  const seen = new Set();
  for (const r of lotOrder) if (r && !seen.has(r)) { seen.add(r); makeLots(r); }

  // a casa de cada lote (ainda sem conferir: só fica se couber inteira no lote, mais abaixo)
  const ROOF_RES = [['telha', P.te2], ['telha', P.te3], ['telha', P.te1], ['telha', P.te2], ['fibro', P.ne4], ['fibro', P.ne3], ['laje', P.ne6]];
  const WALL = [P.ne5, P.ne6, P.ne5, P.te5, P.ne4];
  // os modelos pequenos (lotes que eram terra vazia, e um pouco de variedade nos outros):
  //   [tipo, largura, fundo, altura, telhado]
  const PEQ = {
    barraca: [3, 2.4, 12, 'lona'], quiosque: [2.6, 2.6, 14, 'telha'], lanchonete: [4, 4.5, 18, 'laje'],
    borracharia: [4.2, 4.2, 16, 'fibro'], galpaozinho: [4.2, 6, 20, 'metal'], casinha: [3.4, 4.6, 16, 'telha'],
  };
  const LONA = [P.sky3, P.wa3, P.gr3, P.sky5, P.te3, P.vd1, P.sky6];
  const TETO_PEQ = [P.te2, P.te3, P.te1, P.ne4, P.ne3];
  for (const L of LOTES) {
    const h1 = hash(L.id * 11 + 5), h2 = hash(L.id * 17 + 3), h3 = hash(L.id * 23 + 9), h4 = hash(L.id * 29 + 1);
    let w, d, sb, z, roof, roofCol, kind;
    if (L.vazio) {
      // a terra vazia vira barraca, quiosque, lanchonete, borracharia, galpãozinho ou casinha;
      // uns poucos lotes ficam de terra (com uma árvore, no mapa do lago)
      if (h4 < 0.22) continue;
      const ks = L.cls === 'res' ? ['casinha', 'casinha', 'barraca', 'quiosque', 'barraca'] : ['barraca', 'lanchonete', 'borracharia', 'quiosque', 'galpaozinho', 'barraca'];
      kind = ks[Math.floor(h1 * ks.length)];
      [w, d, z, roof] = PEQ[kind];
      w = Math.min(w, L.w - 0.8); sb = 1 + h3 * 1.2;
      roofCol = roof === 'lona' ? LONA[Math.floor(h2 * LONA.length)] : roof === 'laje' ? (h2 < 0.5 ? P.ne6 : P.ne5) : roof === 'metal' ? P.ne5 : TETO_PEQ[Math.floor(h2 * TETO_PEQ.length)];
    } else if (L.cls === 'res') {
      w = h1 < 0.3 ? L.w - 0.5 : L.w - 1.1; d = 7 + Math.floor(h2 * 4); sb = 1.2 + (h3 < 0.5 ? 0 : 1.2);
      z = h3 < 0.14 ? 32 : 19; [roof, roofCol] = ROOF_RES[Math.floor(h2 * ROOF_RES.length)]; kind = 'casa';
      if (h4 < 0.12) { kind = 'casinha'; [w, d, z, roof] = PEQ.casinha; roofCol = TETO_PEQ[Math.floor(h2 * TETO_PEQ.length)]; sb = 1.6; }
    } else if (L.cls === 'com') {
      w = L.w - 0.6; d = 8 + Math.floor(h2 * 3); sb = 0.4; z = h1 < 0.35 ? 34 : 23;
      [roof, roofCol] = h3 < 0.55 ? ['laje', h1 < 0.5 ? P.ne6 : P.ne5] : ['fibro', P.ne4]; kind = 'loja';
      if (h4 < 0.1) { kind = 'lanchonete'; w = Math.min(L.w - 1.5, 5.5); d = 5; z = 18; roof = 'laje'; }
      else if (h4 < 0.17) { kind = 'borracharia'; w = Math.min(L.w - 1.5, 5); d = 5; z = 17; roof = 'fibro'; roofCol = P.ne4; }
    } else {
      w = L.w - 2; d = 12 + Math.floor(h2 * 5); sb = 2; z = 28 + Math.floor(h3 * 3) * 4; roof = 'metal'; roofCol = h1 < 0.5 ? P.ne6 : P.ne5; kind = 'galpao';
    }
    d = Math.min(d, L.depth - sb - 0.6); // cabe no lote (os lotes rasos têm casas mais curtas)
    // posição dentro do lote (as pequenas não ficam sempre no meio) e espelhada às vezes
    const slack = Math.max(0, L.w - w - 0.6), off = (h3 - 0.5) * slack;
    const ctr = add(add(L.a, mul(L.dir, L.w / 2 + off)), mul(L.n, sb + d / 2));
    const espelho = hash(L.id * 31 + 7) < 0.5;
    // casa com muro na frente (só as casas comuns, com espaço na frente)
    const muro = kind === 'casa' && sb >= 2 && h4 > 0.8;
    CASAS.push({ id: CASAS.length + 1, lot: L.id, L, kind, cx: ctr[0], cy: ctr[1], u: espelho ? mul(L.dir, -1) : L.dir, v: L.n, w, d, z, roof, roofCol, muro,
      wall: WALL[Math.floor(h1 * 7) % WALL.length], seed: L.id });
  }
  function corners(c) {
    const hu = mul(c.u, c.w / 2), hv = mul(c.v, c.d / 2), C = [c.cx, c.cy];
    return [add(sub(C, hu), mul(hv, -1)), add(add(C, hu), mul(hv, -1)), add(add(C, hu), hv), add(sub(C, hu), hv)];
  }

  /* ------------------------------------------------------------------ */
  /* O parque do lago: Prefeitura, estacionamento, praças, trilha         */
  /* ------------------------------------------------------------------ */
  // a Prefeitura e a academia ficam na grade G1 (alinhadas à rua do sul). Pontos (u, v) a partir de O.
  const PO = [113.8, 79.8];
  const PU = AV.DIR, PV = AV.NRM;
  const pref = (u, v) => add(add(PO, mul(PU, u)), mul(PV, v));
  const rectUV = (fn, u0, u1, v0, v1) => [fn(u0, v0), fn(u1, v0), fn(u1, v1), fn(u0, v1)];
  // os blocos (foto 14): z = altura em px. 'tipo' diz como desenhar (lago-cenario.js)
  const PREF = {
    site: rectUV(pref, -9, 41.5, -5.5, 26.5),
    blocos: [
      { nome: 'ala', u0: -5, u1: 0, v0: -1, v1: 15, z: 18, teto: P.ne4 },
      { nome: 'principal', u0: 0, u1: 36, v0: -1.5, v1: 12.5, z: 34, teto: P.ne5, faixa: [12, 34, 1.5, 10] },
      { nome: 'frente', u0: 0.5, u1: 17, v0: 12.5, v1: 20.5, z: 24, teto: P.ne3 },
      { nome: 'sudeste', u0: 19.5, u1: 37.5, v0: 15.5, v1: 21.5, z: 16, teto: P.ne2 },
    ],
    patio: [[17, 19.5, 12.5, 22.5], [19.5, 37.5, 12.5, 15.5]],
    caixa: { u: -2.5, v: 11.5, r: 1.3, z: 18, h: 12 },
    marquise: { u0: 24, u1: 31, v0: 21.5, v1: 23.6, z: 13 },
    pref, PU, PV,
  };
  // a academia (Fit Mania) e o anexo, ao sul da rua (foto 14). Mesmo ângulo.
  const fitP = (u, v) => G(u, v);
  const ESPECIAIS = [
    { nome: 'Fit Mania', site: rectUV(fitP, 38.8, 61.6, 87.2, 102), corpo: rectUV(fitP, 40.5, 60, 88.4, 100.4), z: 28, teto: P.ne6, tipo: 'academia', u0: 40.5, u1: 60, v0: 88.4, v1: 100.4 },
    { nome: 'anexo', site: rectUV(fitP, 62.2, 68.2, 87.2, 100), corpo: rectUV(fitP, 63, 67.6, 91, 96.5), z: 16, teto: P.ne5, tipo: 'anexo', u0: 63, u1: 67.6, v0: 91, v1: 96.5 },
  ];

  // estacionamento (foto 14): asfalto entre a trilha e a rua do sul, vagas pintadas na grade G1
  const lotPoly = [[66, 75.8], [101.5, 76.5], [101.5, 101.5], [52.5, 89.6], [57.5, 85.5]];
  const VAGAS = [];
  {
    const rows = [[58.8, 62.8, 1], [67.4, 71.4, -1], [71.4, 75.4, 1]]; // v0, v1 e para onde o carro aponta
    for (const [v0, v1, fwd] of rows) {
      for (let u = 36; u < 96; u += 2.3) {
        const q = rectUV(G, u, u + 2.3, v0, v1);
        if (!q.every((p) => inPoly(lotPoly, p[0], p[1]))) continue;
        VAGAS.push({ q, u, v0, v1, fwd, c: G(u + 1.15, (v0 + v1) / 2), ang: Math.atan2(AV.NRM[1], AV.NRM[0]) + (fwd > 0 ? 0 : Math.PI) });
      }
    }
  }
  // as entradas do estacionamento (cortam a calçada da rua do sul)
  const ENTRADAS = [62, 82].map((x) => { const l = local(RS, x, 95 + (x - 55) * 0.245); return { s: l.s }; });

  // a trilha: termina na calçada da Av. Vicente (antes ela atravessava a avenida)
  {
    const tr = F.trilha, out = [tr[0]];
    for (let i = 1; i < tr.length; i++) {
      const p = tr[i], l = local(VI, p[0], p[1]);
      if (l.d > VI.oR - 0.6 || l.s <= 0) { out.push(p); continue; }  // ainda a oeste da calçada (a direita de quem desce a Vicente é o oeste)
      // corta onde chega no meio da calçada
      const q = tr[i - 1];
      let a = 0, b = 1;
      for (let it = 0; it < 30; it++) { const m = (a + b) / 2, pm = add(q, mul(sub(p, q), m)); if (local(VI, pm[0], pm[1]).d > VI.oR - 0.6) a = m; else b = m; }
      out.push(add(q, mul(sub(p, q), a)));
      break;
    }
    // nenhum pedaço por cima da água: o que ficou perto demais da margem é empurrado para fora (2 tiles)
    const near = (p) => {
      let best = null;
      for (let i = 0, j = F.lago.length - 1; i < F.lago.length; j = i++) {
        const a = F.lago[j], b = F.lago[i], ab = sub(b, a), t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / (dot(ab, ab) || 1))), c = add(a, mul(ab, t)), d = len(sub(p, c));
        if (!best || d < best.d) best = { c, d };
      }
      return best;
    };
    const dense = [out[0]];
    for (let i = 1; i < out.length; i++) { const n = Math.max(1, Math.ceil(len(sub(out[i], out[i - 1])))); for (let j = 1; j <= n; j++) dense.push(add(out[i - 1], mul(sub(out[i], out[i - 1]), j / n))); }
    const MIN = 2.2;
    const moved = dense.map((p) => {
      const nb = near(p), dentro = F.inLake(p[0], p[1]);
      if (!dentro && nb.d >= MIN) return p;
      const dir = nrm(dentro ? sub(nb.c, p) : sub(p, nb.c));
      return add(nb.c, mul(dir, MIN));
    });
    // suaviza um pouco (o empurrão deixa degraus) e tira os pontos repetidos
    const sm = moved.map((p, i) => (i === 0 || i === moved.length - 1 ? p : mul(add(add(moved[i - 1], moved[i + 1]), mul(p, 2)), 0.25)));
    F.trilha = simplify(sm.filter((p, i) => i === 0 || len(sub(p, sm[i - 1])) > 0.05));
  }
  // caminhos de concreto saindo da praça da Prefeitura (foto 14)
  const pSE = F.pracaSE, pNO = F.pracaNO;
  const CAMINHOS = [
    [add(pSE.c, [-4.5, -4.2]), add(pSE.c, [-9.5, -8.5])],
    [add(pSE.c, [4.6, -4.4]), add(pSE.c, [8.5, -12])],
    [add(pSE.c, [5.8, 2.5]), add(pSE.c, [13, 5])],
  ];

  /* ------------------------------------------------------------------ */
  /* As formas, em ordem (a grade e o desenho seguem esta lista)          */
  /* ------------------------------------------------------------------ */
  const SHAPES = [];
  const shape = (t, bb, test, paint, o) => { const s = Object.assign({ t: TP[t], tn: t, bb, test, paint }, o || {}); SHAPES.push(s); return s; };
  const polyShape = (t, pts, o) => shape(t, bboxOf(pts), (x, y) => inPoly(pts, x, y), (g, S) => { path(g, pts); g.fillStyle = S(o && o.estilo || t, o); g.fill(); }, Object.assign({ pts }, o));
  const quadShape = (t, q, o) => shape(t, bboxOf(q), (x, y) => inQuad(q, x, y), (g, S) => { path(g, q); g.fillStyle = S(o && o.estilo || t, o); g.fill(); }, Object.assign({ pts: q }, o));
  const discShape = (t, c, r, o) => shape(t, [c[0] - r, c[1] - r, c[0] + r, c[1] + r], (x, y) => Math.hypot(x - c[0], y - c[1]) < r, (g, S) => { g.beginPath(); g.arc(c[0], c[1], r, 0, Math.PI * 2); g.fillStyle = S(o && o.estilo || t, o); g.fill(); }, o);
  // uma linha grossa (pontas e juntas redondas): o teste é a distância à linha
  const strokeShape = (t, pts, w, o) => shape(t, bboxOf(pts, w / 2), (x, y) => F.lineDist(pts, x, y, false) < w / 2, (g, S) => {
    g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = S(o && o.estilo || t, o); g.stroke();
  }, o);
  function path(g, pts) { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); }

  // faixa [d0, d1] de uma rua, de s0 a s1, menos os cortes (um quadrilátero por trecho)
  function bandQuads(r, d0, d1, s0, s1, cuts) {
    let spans = [[Math.max(0, s0), Math.min(r.len, s1)]];
    for (const c of cuts || []) {
      const out = [];
      for (const [a, b] of spans) { if (c[1] <= a || c[0] >= b) out.push([a, b]); else { if (c[0] > a) out.push([a, c[0]]); if (c[1] < b) out.push([c[1], b]); } }
      spans = out;
    }
    const qs = [];
    for (const [a, b] of spans) {
      if (b - a < 0.05) continue;
      for (let i = 0; i < r.dirs.length; i++) {
        const ext0 = i > 0 ? 1 : 0, ext1 = i < r.dirs.length - 1 ? 1 : 0;
        const sa = Math.max(a, r.cum[i] - ext0), sb = Math.min(b, r.cum[i + 1] + ext1);
        if (sb - sa < 0.02) continue;
        const dir = r.dirs[i], n = right(dir), o = r.pts[i];
        const p = (s, d) => add(add(o, mul(dir, s - r.cum[i])), mul(n, d));
        qs.push([p(sa, d0), p(sb, d0), p(sb, d1), p(sa, d1)]);
      }
    }
    return qs;
  }

  const ANG = (r, s) => { const d = dirAt(r, s || 0); return Math.atan2(d[1], d[0]); };
  // 0. campo e mata (imagem de 1 px por tile) e 1. a terra dos bairros
  const base = shape('campo', [RG.x0, RG.y0, RG.x1, RG.y1], () => true, (g) => g.drawImage(campoImg(), RG.x0, RG.y0, GW, GH));
  polyShape('terra', ZG1);
  polyShape('terra', ZG2);
  // 2. os lotes
  for (const L of LOTES) quadShape('lote', L.q, { owner: L.id, estilo: L.chao, lote: L });
  // 3. terrenos vazios e o parque do lago
  polyShape('grama', PARQUE);
  // 4. dentro do parque
  const SITE_PREF = 1e6, SITE_FIT = 1e6 + 1;
  quadShape('lote', PREF.site, { owner: SITE_PREF, estilo: 'concreto' });
  for (const [u0, u1, v0, v1] of PREF.patio) quadShape('grama', rectUV(pref, u0 + 0.6, u1 - 0.6, v0 + 0.6, v1 - 0.6), { owner: SITE_PREF });
  ESPECIAIS.forEach((e, i) => quadShape('lote', e.site, { owner: SITE_FIT + i, estilo: 'cimentado' }));
  polyShape('estac', lotPoly);
  for (const v of VAGAS) quadShape('vaga', v.q, { vaga: v });
  // praça da Prefeitura (concreto, juntas em raio) e os caminhos
  for (const c of CAMINHOS) strokeShape('trilha', c, 1.4);
  discShape('praca', pSE.c, pSE.r, { pracaSE: true });
  // praça noroeste: piso redondo, 8 canteiros em estrela, o círculo de grama no meio
  discShape('praca', pNO.c, pNO.r);
  for (let k = 0; k < 8; k++) {
    const a0 = (k / 8) * Math.PI * 2 + 0.16, a1 = ((k + 1) / 8) * Math.PI * 2 - 0.16, r0 = pNO.r * 0.3, r1 = pNO.r * 0.82, C = pNO.c;
    shape('grama', [C[0] - r1, C[1] - r1, C[0] + r1, C[1] + r1], (x, y) => {
      const dx = x - C[0], dy = y - C[1], d = Math.hypot(dx, dy);
      if (d < r0 || d > r1) return false;
      let a = Math.atan2(dy, dx); if (a < 0) a += Math.PI * 2;
      return a > a0 && a < a1;
    }, (g, S) => { g.beginPath(); g.arc(C[0], C[1], r1, a0, a1); g.arc(C[0], C[1], r0, a1, a0, true); g.closePath(); g.fillStyle = S('grama'); g.fill(); g.lineWidth = 2 / S.k; g.strokeStyle = P.gr2; g.stroke(); });
  }
  discShape('grama', pNO.c, pNO.r * 0.17);
  // a trilha (pontas redondas) e a rampa de degraus na ponta leste
  strokeShape('trilha', F.trilha, F.trilhaLarg, { trilha: true });
  polyShape('praca', F.rampa, { rampa: true });
  // a margem de concreto e a água
  shape('margem', bboxOf(F.lago, 1), (x, y) => !F.inLake(x, y) && F.lakeDist(x, y) < 0.5, (g, S) => {
    path(g, F.lago); g.lineWidth = 1.0; g.lineJoin = 'round'; g.strokeStyle = S('margem'); g.stroke();
  });
  polyShape('agua', F.lago);
  // 5. ruas: calçadas, esquinas da calçada, asfalto, esquinas do asfalto, rotatória, canteiros, faixas
  for (const r of RUAS) for (const b of r.bands) if (b[2] === 'calcada') for (const q of bandQuads(r, b[0], b[1], 0, r.len)) quadShape('calcada', q, { rua: r, ang: ANG(r) });
  const filletShape = (f) => shape(f.t, bboxOf([f.Tp, f.V, f.Tq]), (x, y) => inTri(f.Tp, f.V, f.Tq, x, y) && Math.hypot(x - f.C[0], y - f.C[1]) > f.r, (g, S) => {
    const a0 = Math.atan2(f.Tq[1] - f.C[1], f.Tq[0] - f.C[0]), a1 = Math.atan2(f.Tp[1] - f.C[1], f.Tp[0] - f.C[0]), am = Math.atan2(f.V[1] - f.C[1], f.V[0] - f.C[0]);
    const TAU = Math.PI * 2, m = (a) => ((a % TAU) + TAU) % TAU;
    g.beginPath(); g.moveTo(f.Tp[0], f.Tp[1]); g.lineTo(f.V[0], f.V[1]); g.lineTo(f.Tq[0], f.Tq[1]);
    g.arc(f.C[0], f.C[1], f.r, a0, a1, !(m(am - a0) < m(a1 - a0)));
    g.closePath(); g.fillStyle = S(f.t); g.fill();
  });
  for (const f of FILLETS) if (f.t === 'calcada') filletShape(f);
  for (const r of RUAS) for (const b of r.bands) if (b[2] === 'rua') for (const q of bandQuads(r, b[0], b[1], 0, r.len)) quadShape('rua', q, { rua: r, ang: ANG(r), band: b });
  // por baixo do canteiro também é asfalto (onde o canteiro é cortado, num cruzamento, aparece a pista)
  for (const r of RUAS) for (const b of r.bands) if (b[2] === 'canteiro') for (const q of bandQuads(r, b[0], b[1], 0, r.len)) quadShape('rua', q, { rua: r, ang: ANG(r), band: b });
  for (const f of FILLETS) if (f.t === 'rua') filletShape(f);
  discShape('rua', J, 11, { rotatoria: true });
  for (const r of RUAS) for (const b of r.bands) if (b[2] === 'canteiro') for (const q of bandQuads(r, b[0], b[1], 0, r.len, r.cuts)) quadShape('canteiro', q, { rua: r });
  discShape('canteiro', J, 3.5, { ilha: true });
  // a faixa de pedestre: as listras ficam só no asfalto; no meio da São João, o canteiro vira piso de concreto
  for (const z of ZEBRAS) {
    for (const b of z.r.bands) {
      if (b[2] === 'rua') for (const q of bandQuads(z.r, b[0], b[1], Math.min(z.s0, z.s1), Math.max(z.s0, z.s1))) quadShape('faixa', q, { zebra: true, rua: z.r });
      if (b[2] === 'canteiro' && z.meio) for (const q of bandQuads(z.r, b[0], b[1], Math.min(z.s0, z.s1), Math.max(z.s0, z.s1))) quadShape('faixa', q, { estilo: 'praca' });
    }
  }
  // as entradas do estacionamento (rebaixo da calçada)
  for (const e of ENTRADAS) for (const q of bandQuads(RS, -RS.oL - 0.05, -RS.aL + 0.05, e.s - 2, e.s + 2)) quadShape('estac', q);

  /* ------------------------------------------------------------------ */
  /* A grade                                                             */
  /* ------------------------------------------------------------------ */
  function raster(s) {
    const x0 = Math.max(RG.x0, Math.floor(s.bb[0])), y0 = Math.max(RG.y0, Math.floor(s.bb[1]));
    const x1 = Math.min(RG.x1 - 1, Math.ceil(s.bb[2])), y1 = Math.min(RG.y1 - 1, Math.ceil(s.bb[3]));
    const t = s.t, ow = s.owner || 0, P = s.pts;
    if (P && P.length >= 3) {
      // polígono: varre linha por linha (onde a linha do meio da célula cruza as bordas); o meio é direto,
      // só as células da beira passam pelo teste exato
      const xs = [];
      for (let y = y0; y <= y1; y++) {
        const yc = y + 0.5;
        xs.length = 0;
        for (let k = 0, j = P.length - 1; k < P.length; j = k++) {
          const a = P[j], b = P[k];
          if ((a[1] <= yc) !== (b[1] <= yc)) xs.push(a[0] + ((yc - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
        }
        xs.sort((p, q) => p - q);
        for (let k = 0; k + 1 < xs.length; k += 2) {
          const xa = Math.max(x0, Math.ceil(xs[k] - 0.5) - 1), xb = Math.min(x1, Math.floor(xs[k + 1] - 0.5) + 1);
          let i = idx(xa, y);
          for (let x = xa; x <= xb; x++, i++) {
            if (x - xa < 2 || xb - x < 2 ? s.test(x + 0.5, yc) : true) { tipo[i] = t; dono[i] = ow; }
          }
        }
      }
      return;
    }
    for (let y = y0; y <= y1; y++) {
      let i = idx(x0, y);
      for (let x = x0; x <= x1; x++, i++) if (s.test(x + 0.5, y + 0.5)) { tipo[i] = t; dono[i] = ow; }
    }
  }
  const t0 = performance.now();
  // base: campo em tudo (rápido), depois as formas
  tipo.fill(TP.campo);
  for (const s of SHAPES) if (s !== base) raster(s);
  const BASE = tipo.slice(), BASE_DONO = dono.slice(); // antes dos prédios (para conferir)

  // as casas que cabem inteiras no lote (e não ficam metade dentro, metade fora do mapa do lago)
  const W = F.W, H = F.H;
  function cellsIn(q) {
    const bb = bboxOf(q), out = [];
    for (let y = Math.floor(bb[1]); y <= Math.ceil(bb[3]); y++) for (let x = Math.floor(bb[0]); x <= Math.ceil(bb[2]); x++) if (inQuad(q, x + 0.5, y + 0.5)) out.push([x, y]);
    return out;
  }
  const okCasa = [];
  for (const c of CASAS) {
    const q = corners(c), bb = bboxOf(q, 0.4);
    c.q = q; c.bb = bb;
    // a casa que encosta no mapa do lago (mesmo que só um pedaço) é um objeto do mapa (lago-cenario.js);
    // as de fora são desenhadas pela cidade (lago-cidade.js)
    const fora = bb[2] <= 0.5 || bb[0] >= W - 0.5 || bb[3] <= 0.5 || bb[1] >= H - 0.5;
    c.noMapa = !fora;
    const cells = cellsIn(q);
    if (!cells.length || cells.some(([x, y]) => x < RG.x0 || y < RG.y0 || x >= RG.x1 || y >= RG.y1 || BASE[idx(x, y)] !== TP.lote || BASE_DONO[idx(x, y)] !== c.lot)) continue;
    c.cells = cells;
    okCasa.push(c);
  }
  // os prédios entram na grade (e no desenho, por último)
  for (const c of okCasa) quadShape('predio', c.q, { owner: c.lot, casa: c });
  const prefBlocks = PREF.blocos.map((b) => rectUV(pref, b.u0, b.u1, b.v0, b.v1));
  for (const q of prefBlocks) quadShape('predio', q, { owner: SITE_PREF });
  ESPECIAIS.forEach((e, i) => quadShape('predio', e.corpo, { owner: SITE_FIT + i }));
  for (const s of SHAPES.slice(SHAPES.length - okCasa.length - prefBlocks.length - ESPECIAIS.length)) raster(s);
  const tGrade = performance.now() - t0;

  /* ------------------------------------------------------------------ */
  /* Consultas                                                           */
  /* ------------------------------------------------------------------ */
  const tipoEm = (x, y) => { x = Math.floor(x); y = Math.floor(y); return x < RG.x0 || y < RG.y0 || x >= RG.x1 || y >= RG.y1 ? TP.campo : tipo[idx(x, y)]; };
  const nomeEm = (x, y) => NOMES[tipoEm(x, y)];
  // o tipo EXATO no ponto (pelas formas, sem arredondar para a célula): para conferir posições perto da beira
  const nomeExato = (x, y) => {
    for (let i = SHAPES.length - 1; i >= 0; i--) {
      const s = SHAPES[i];
      if (s === base || x < s.bb[0] || x > s.bb[2] || y < s.bb[1] || y > s.bb[3]) continue;
      if (s.test(x, y)) return NOMES[s.t];
    }
    return 'campo';
  };
  const baseEm = (x, y) => { x = Math.floor(x); y = Math.floor(y); return x < RG.x0 || y < RG.y0 || x >= RG.x1 || y >= RG.y1 ? TP.campo : BASE[idx(x, y)]; };
  const donoEm = (x, y) => { x = Math.floor(x); y = Math.floor(y); return x < RG.x0 || y < RG.y0 || x >= RG.x1 || y >= RG.y1 ? 0 : dono[idx(x, y)]; };
  // a rua mais perto de um ponto (e a direção dela ali)
  function ruaEm(x, y) {
    let best = null;
    for (const r of RUAS) {
      const l = local(r, x, y);
      if (l.dist <= Math.max(r.oL, r.oR) + 0.5 && (!best || l.dist < best.l.dist)) best = { r, l };
    }
    return best;
  }

  /* ------------------------------------------------------------------ */
  /* Faixas de trânsito (lago-vida.js) e caminhos de pedestres             */
  /* ------------------------------------------------------------------ */
  const lane = (r, d, s0, s1, rev) => {
    const pts = [];
    for (let s = s0; s <= s1 + 1e-6; s += Math.max(1, (s1 - s0) / 40)) pts.push(at(r, Math.min(s, s1), d));
    if (rev) pts.reverse();
    return pts;
  };
  const sJ = SJ.len, wJ = local(WY, J[0], J[1]).s;
  const xS = (x) => sjS(AV.sAtX(x));
  const around = (a0, a1, n) => { const out = []; for (let i = 1; i < n; i++) { const a = a0 + ((a1 - a0) * i) / n; out.push([J[0] + Math.cos(a) * 6.5, J[1] + Math.sin(a) * 6.5]); } return out; };
  const dN = (AV.pistaN[0] + AV.pistaN[1]) / 2, dS = AV.pistaS[0] + 0.55;
  const TRAFEGO = [
    // São João, mão para o leste (do lado do lago) → vira na Weyne para o sul
    { pts: [...lane(SJ, dS, xS(-14), sJ - 12), ...lane(WY, 4.5, wJ + 12, wJ + 90)], av: true, n: 3 },
    // Weyne para o norte → contorna a rotatória → São João para o oeste
    { pts: [...lane(WY, -4.5, wJ + 12, wJ + 90, true), ...around(0.66, -2.1, 5), ...lane(SJ, dN, xS(-14), sJ - 12, true)], av: true, n: 3 },
    { pts: lane(RS, 1.6, local(RS, -14, 82).s, RS.len - 9), n: 2 },
    { pts: lane(RS, -0.6, local(RS, -14, 82).s, RS.len - 9, true), n: 2 },
    { pts: lane(VI, 1.3, 6, VI.len), n: 1 },
    { pts: lane(VI, -1.3, 6, VI.len, true), n: 1 },
    { pts: lane(RO, 0.9, local(RO, 26, -24).s, local(RO, 4, 150).s), n: 1 },
    { pts: lane(RO, -0.9, local(RO, 26, -24).s, local(RO, 4, 150).s, true), n: 1 },
    { pts: lane(FC, 0.9, FC.len - 70, FC.len - 5), n: 1 },
    { pts: lane(FC, -0.9, FC.len - 70, FC.len - 5, true), n: 1 },
    { pts: lane(WY, 4.5, wJ - 120, wJ - 13), n: 1 },
    { pts: lane(WY, -4.5, wJ - 120, wJ - 13, true), n: 1 },
  ];
  // a calçada do lago (onde o jogador e os pedestres andam): entre a rua do oeste e a Av. José Vicente
  const zoneOf = (r, o) => { const j = JUNC.find((q) => (q.A === SJ && q.B === o) || (q.B === SJ && q.A === o)); return j ? (j.A === SJ ? j.sA : j.sB) : null; };
  const sRO = zoneOf(SJ, RO), sVI = zoneOf(SJ, VI);
  const CALCADA_LAGO = [sRO - sjS(0) + RO.oR + RC + 2.5, sVI - sjS(0) - VI.oL - RC - 2.5]; // em s da avenida (AV)
  // a calçada do outro lado (norte): o maior trecho sem rua cruzando, perto do lago
  const nCuts = JUNC.filter((q) => (q.A === SJ || q.B === SJ)).map((q) => (q.A === SJ ? q.sA : q.sB) - sjS(0)).sort((a, b) => a - b);
  let CALCADA_NORTE = [AV.sAtX(40), AV.sAtX(60)];
  for (let i = 1; i < nCuts.length; i++) {
    const a = nCuts[i - 1] + 6, b = nCuts[i] - 6;
    if (b - a > CALCADA_NORTE[1] - CALCADA_NORTE[0] && a > AV.sAtX(20) && b < AV.sAtX(185)) CALCADA_NORTE = [a, b];
  }

  /* ------------------------------------------------------------------ */
  /* O campo e a mata (fora dos bairros): uma imagem, 1 px por tile        */
  /* ------------------------------------------------------------------ */
  let CAMPO = null;
  function noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const h = (a, b) => hash(a * 374761 + b * 668265), s = (k) => k * k * (3 - 2 * k);
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
    return a + (b - a) * s(xf) + (c - a) * s(yf) + (a - b - c + d) * s(xf) * s(yf);
  }
  const rgbOf = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  function campoImg() {
    if (CAMPO) return CAMPO;
    const c = DL.mk(GW, GH), g = c.getContext('2d'), img = g.createImageData(GW, GH), d = img.data;
    const cols = [P.gr1, P.gr2, P.gr3, P.gr4, P.te4].map(rgbOf);
    for (let y = 0; y < GH; y++) {
      for (let x = 0; x < GW; x++) {
        const wx = x + RG.x0, wy = y + RG.y0, n = noise(wx * 0.03, wy * 0.03) * 0.75 + noise(wx * 0.09, wy * 0.09) * 0.25;
        const k = n > 0.66 ? 0 : n > 0.58 ? 1 : n > 0.42 ? 2 : n > 0.3 ? 3 : 4, col = cols[k], o = (y * GW + x) * 4;
        d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    CAMPO = c;
    return c;
  }

  /* ------------------------------------------------------------------ */
  /* Pintar o chão (a mesma lista de formas, na mesma ordem da grade)      */
  /* ------------------------------------------------------------------ */
  // texturas pequenas que se repetem (só no chão do mapa, 16 px por tile)
  function tex(w, h, fn) { const c = DL.mk(w, h), q = c.getContext('2d'); fn(q, w, h); return c; }
  const R = DL.R;
  let TEX = null;
  function textures() {
    if (TEX) return TEX;
    const dots = (q, w, h, n, col, s) => { for (let i = 0; i < n; i++) R(q, Math.floor(hash(i * 7 + s) * w), Math.floor(hash(i * 13 + s * 3) * h), 1, 1, col); };
    TEX = {
      grama: tex(64, 64, (q) => { R(q, 0, 0, 64, 64, P.gr3); for (let i = 0; i < 34; i++) R(q, Math.floor(hash(i * 7 + 1) * 63), Math.floor(hash(i * 13 + 2) * 62), 1, 2, P.gr2); dots(q, 64, 64, 10, P.gr4, 4); }),
      rua: tex(32, 32, (q) => { R(q, 0, 0, 32, 32, P.ne1); dots(q, 32, 32, 16, P.ne2, 5); }),
      estac: tex(32, 32, (q) => { R(q, 0, 0, 32, 32, P.ne2); dots(q, 32, 32, 12, P.ne1, 2); }),
      calcada: tex(16, 16, (q) => { R(q, 0, 0, 16, 16, P.ne5); R(q, 0, 0, 16, 1, P.ne4); R(q, 0, 0, 1, 16, P.ne4); R(q, 6, 7, 2, 1, P.ne6); }),
      praca: tex(8, 8, (q) => { R(q, 0, 0, 8, 8, P.ne5); R(q, 0, 0, 8, 1, P.ne4); R(q, 0, 0, 1, 8, P.ne4); }),
      terra: tex(48, 48, (q) => { R(q, 0, 0, 48, 48, P.te5); dots(q, 48, 48, 40, P.te4, 3); dots(q, 48, 48, 14, P.ne4, 8); for (let i = 0; i < 6; i++) R(q, Math.floor(hash(i * 5) * 46), Math.floor(hash(i * 9) * 47), 2, 1, P.te4); }),
      mato: tex(48, 48, (q) => { R(q, 0, 0, 48, 48, P.te5); dots(q, 48, 48, 30, P.te4, 6); for (let i = 0; i < 14; i++) { const x = Math.floor(hash(i * 3 + 7) * 46), y = Math.floor(hash(i * 11 + 2) * 45); R(q, x, y + 1, 1, 2, P.gr2); R(q, x + 1, y, 1, 3, P.gr4); } }),
      cimentado: tex(24, 24, (q) => { R(q, 0, 0, 24, 24, P.ne4); R(q, 0, 0, 24, 1, P.ne3); R(q, 0, 0, 1, 24, P.ne3); dots(q, 24, 24, 6, P.ne5, 9); }),
      concreto: tex(20, 20, (q) => { R(q, 0, 0, 20, 20, P.ne5); R(q, 0, 0, 20, 1, P.ne4); R(q, 0, 0, 1, 20, P.ne4); dots(q, 20, 20, 4, P.ne6, 1); }),
    };
    TEX.trilha = TEX.praca; TEX.margem = TEX.praca; TEX.quintal = TEX.terra; TEX.baldio = TEX.mato; TEX.canteiro = TEX.grama; TEX.vaga = TEX.estac; TEX.faixa = TEX.rua; TEX.lote = TEX.terra;
    return TEX;
  }
  const FLAT = { campo: P.gr3, terra: P.te5, mato: P.te5, lote: P.te5, quintal: P.te5, baldio: P.te4, cimentado: P.ne4, concreto: P.ne5, predio: P.ne2, grama: P.gr3, canteiro: P.gr3, trilha: P.ne5, calcada: P.ne4, rua: P.ne1, faixa: P.ne1, estac: P.ne2, vaga: P.ne2, praca: P.ne5, margem: P.ne5, agua: P.wa1 };

  // pinta o chão da região R0 (tiles) em g, k pixels por tile. rico = texturas e detalhes (o chão do mapa)
  function pintar(g, k, R0, o) {
    o = o || {};
    const rico = !!o.rico, det = k >= 4;
    g.save();
    g.setTransform(k, 0, 0, k, -R0.x0 * k, -R0.y0 * k);
    g.imageSmoothingEnabled = false;
    const pats = {};
    const S = (name, so) => {
      if (!rico) return FLAT[name] || P.ne3;
      const t = textures()[name];
      if (!t) return FLAT[name] || P.ne3;
      let p = pats[name];
      if (!p) p = pats[name] = g.createPattern(t, 'repeat');
      // o padrão fica em pixels da tela (não cresce com o zoom) e gira junto com a rua
      const m = new DOMMatrix().scale(1 / k, 1 / k);
      if (so && so.ang && (name === 'calcada' || name === 'rua')) m.rotateSelf((so.ang * 180) / Math.PI);
      p.setTransform(m);
      return p;
    };
    S.k = k;
    const vis = (bb) => bb[2] >= R0.x0 && bb[0] <= R0.x1 && bb[3] >= R0.y0 && bb[1] <= R0.y1;
    for (const s of SHAPES) {
      if (s.casa && !o.tetos) continue;      // as casas com volume são desenhadas em pé (lago-cenario / lago-cidade)
      if (s.t === TP.predio && !s.casa && !o.tetos) continue;
      if (!vis(s.bb)) continue;
      if (s.casa) continue;                  // os telhados vão depois das sombras (abaixo)
      s.paint(g, S);
      if (det) detail(g, s, S, k, rico);
    }
    // sombras e telhados (só nas texturas da cidade, vista de cima)
    if (o.tetos) {
      const sd = Lg.SUN_DIR || { x: 0.29, y: 0.96 }, K2 = 2.2 / DL.T;
      g.beginPath();
      for (const c of okCasa) { if (!vis(c.bb) || (o.semMapa && c.noMapa)) continue; hullPath(g, c.q, c.z * K2 * sd.x, c.z * K2 * sd.y); }
      g.fillStyle = 'rgba(16,14,30,0.45)';
      g.fill('nonzero');
      for (const c of okCasa) if (vis(c.bb) && !(o.semMapa && c.noMapa)) roofFlat(g, c, k);
    }
    g.restore();
  }
  // contorno convexo de um polígono e dele deslocado (a sombra de um prédio)
  function hullPath(g, q, dx, dy) {
    const pts = [...q, ...q.map((p) => [p[0] + dx, p[1] + dy])].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const half = (list) => { const h = []; for (const p of list) { while (h.length >= 2 && crs(sub(h[h.length - 1], h[h.length - 2]), sub(p, h[h.length - 2])) <= 0) h.pop(); h.push(p); } h.pop(); return h; };
    const hull = [...half(pts), ...half(pts.slice().reverse())];
    hull.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.closePath();
  }
  // o telhado visto de cima (cidade longe): duas águas = metade clara, metade escura
  function roofFlat(g, c, k) {
    const q = c.q, sh = DL.shade;
    path(g, q); g.fillStyle = c.roofCol; g.fill();
    if (c.roof === 'telha' || c.roof === 'fibro' || c.roof === 'metal') {
      const m0 = mul(add(q[0], q[3]), 0.5), m1 = mul(add(q[1], q[2]), 0.5);
      path(g, [m0, m1, q[2], q[3]]); g.fillStyle = sh(c.roofCol, -0.18); g.fill();
    }
    if (k >= 4) { g.lineWidth = 1 / k; g.strokeStyle = sh(c.roofCol, -0.35); path(g, q); g.stroke(); }
  }
  // detalhes pintados por cima de algumas formas (k ≥ 4)
  function detail(g, s, S, k, rico) {
    const px = 1 / k;
    if (s.lote && k >= 4) {
      // muro em volta do lote
      g.lineWidth = rico ? 2 * px : px; g.strokeStyle = s.lote.chao === 'baldio' ? P.te4 : P.ne3; path(g, s.lote.q); g.stroke();
    } else if (s.vaga) {
      // linhas brancas das vagas
      const q = s.vaga.q;
      g.lineWidth = rico ? 1.5 * px : px; g.strokeStyle = P.ne6;
      g.beginPath(); g.moveTo(q[0][0], q[0][1]); g.lineTo(q[3][0], q[3][1]); g.moveTo(q[1][0], q[1][1]); g.lineTo(q[2][0], q[2][1]); g.stroke();
    } else if (s.zebra) {
      // listras ao longo da rua, uma ao lado da outra
      const q = s.pts, a = q[0], b = q[1], d = q[3], ul = sub(b, a), vl = sub(d, a), vlen = len(vl);
      g.fillStyle = P.ne6;
      for (let t = 0.2; t < vlen - 0.2; t += 0.62) {
        const p0 = add(a, mul(vl, t / vlen)), p1 = add(p0, mul(vl, 0.32 / vlen));
        path(g, [p0, add(p0, ul), add(p1, ul), p1]); g.fill();
      }
    } else if (s.band && s.band[2] === 'rua') {
      // tracejado no meio da pista (ruas de mão dupla: em d = 0; avenidas: no meio de cada pista)
      const r = s.rua, b = s.band, mid = r.av ? (b[0] + b[1]) / 2 : 0;
      if (mid < b[0] || mid > b[1]) return;
      const q = s.pts, a = q[0], bb = q[1], ul = sub(bb, a), L0 = len(ul), u = mul(ul, 1 / L0), n = right(u), off = mid - b[0];
      g.fillStyle = r.av ? P.ne4 : P.sky6;
      const dash = rico ? 1 : 1.2, gap = rico ? 1 : 1.2, wdt = rico ? 1.5 * px : Math.max(px, 0.12);
      for (let t = 0; t < L0; t += dash + gap) {
        const p0 = add(add(a, mul(u, t)), mul(n, off - wdt / 2)), p1 = add(p0, mul(u, Math.min(dash, L0 - t)));
        path(g, [p0, p1, add(p1, mul(n, wdt)), add(p0, mul(n, wdt))]); g.fill();
      }
    } else if (s.rampa && rico) {
      g.save(); path(g, s.pts); g.clip(); g.fillStyle = P.ne4;
      for (let x = s.pts[0][0]; x < s.pts[1][0]; x += 0.45) g.fillRect(x, s.bb[1], px, s.bb[3] - s.bb[1]);
      g.restore();
    } else if (s.pracaSE) {
      g.strokeStyle = P.ne4; g.lineWidth = px;
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.beginPath(); g.moveTo(pSE.c[0], pSE.c[1]); g.lineTo(pSE.c[0] + Math.cos(a) * pSE.r, pSE.c[1] + Math.sin(a) * pSE.r); g.stroke(); }
      g.beginPath(); g.arc(pSE.c[0], pSE.c[1], pSE.r * 0.18, 0, Math.PI * 2); g.fillStyle = P.ne4; g.fill();
      g.beginPath(); g.arc(pSE.c[0], pSE.c[1], pSE.r * 0.14, 0, Math.PI * 2); g.fillStyle = P.ne6; g.fill();
    } else if (s.ilha) {
      g.beginPath(); g.arc(J[0], J[1], 3.5, 0, Math.PI * 2); g.lineWidth = 2 * px; g.strokeStyle = P.ne6; g.stroke();
    }
  }

  /* ------------------------------------------------------------------ */
  /* Exporta                                                             */
  /* ------------------------------------------------------------------ */
  Lg.MAPA = {
    NOMES, TP, LETRA, RG, NEAR,
    tipoEm, nomeEm, nomeExato, baseEm, donoEm, ruaEm, zona, local, at, dirAt,
    letra: (x, y) => LETRA[nomeEm(x, y)],
    RUAS, SJ, WY, RO, RS, VI, FC, J, sjS, JUNC,
    LOTES, casas: okCasa, CASAS_TODAS: CASAS, corners,
    PREF, ESPECIAIS, SITE_PREF, SITE_FIT, VAGAS, ENTRADAS, lotPoly,
    S_CROSS, S_CAR, CALCADA_LAGO, CALCADA_NORTE, TRAFEGO,
    pintar, hullPath, cellsIn, inQuad, bboxOf, bandQuads,
    tempoGrade: tGrade,
  };
})();

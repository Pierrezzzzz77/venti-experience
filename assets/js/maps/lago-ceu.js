/* Venti Experience — Parte 0: o céu, a água e a luz do fim de tarde no Lago da Prefeitura.
   Inspiração: referencia/11-inspiracao-agua-ambientacao.jpg (céu em faixas, sol grande com anéis em
   degraus, montanhas em camadas, o sol rebatendo na água em faixas douradas sobre azul escuro).
   Todas as cores vêm da paleta (lago-paleta.js: P).

   REGRA DE DESEMPENHO: o que fica parado é pintado UMA vez (lago-preparo.js chama as funções "bake")
   e a cada quadro só se desenha o que se mexe.
     UMA VEZ
       bakeWater(g, sc)        a água no chão do mapa, em 3 camadas: azul escuro, as faixas do céu
                               refletido e o reflexo escuro da margem de lá (em faixas que ondulam)
       bakeShadows(g, items)   sombras compridas das árvores, postes e prédios, pintadas no chão
       o horizonte (BAND)      céu em faixas + sol com anéis + 4 camadas de montanha: uma imagem pronta
     A CADA QUADRO
       water(g, sc, st)        o brilho que se mexe: ondinhas e a coluna de sol dourada
       band(g, sc, st)         o horizonte descendo do alto da tela no filme (drawImage) e nuvens finas
       shadows(g, sc, st)      só as sombras de quem anda (pessoas, carros)
       light(g, sc, st)        postes acendendo e poeira dourada
       clouds(g, sc, k, t)     as nuvens que cobrem a tela e se abrem no começo do filme
   st.dusk vai de 0 (sol ainda alto) a 1 (o sol quase se pondo); st.band de 0 a 1 (o horizonte na tela). */
(function () {
  'use strict';
  const DL = window.DL, T = DL.T, R = DL.R, hash = DL.hash, K = DL.isoKit, Lg = DL.Lago, P = Lg.PAL;
  const L = Lg.L;
  const IX = (x, y) => x - y, IY = (x, y, z) => (x + y) / 2 - (z || 0);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const BAND = 0.4;   // altura máxima do horizonte (fração da tela)
  const SUN_Y = 0.6;  // o sol dentro da imagem do horizonte (fração da altura)
  const SUN_X = 0.62; // o sol na tela (fração da largura): a coluna de sol na água fica embaixo dele

  // onde o sol está na tela (fica "no infinito": não anda com a câmera)
  function sunPos(sc, st) {
    const cw = sc.canvas.width, ch = sc.canvas.height, Hm = ch * BAND, hb = (st.band || 0) * Hm;
    return { x: cw * SUN_X, y: hb - Hm * (1 - SUN_Y), r: Hm * 0.12 };
  }
  Lg.sunPos = sunPos;

  // o contorno do lago (pontos em tiles, lago-cenario.js: L.lake) no chão (px do mundo) ou na tela isométrica
  function lakePath(g, iso) {
    const Pl = L.lake;
    g.beginPath();
    for (let i = 0; i < Pl.length; i++) {
      const x = Pl[i][0] * T, y = Pl[i][1] * T;
      if (iso) (i ? g.lineTo(IX(x, y), IY(x, y)) : g.moveTo(IX(x, y), IY(x, y)));
      else (i ? g.lineTo(x, y) : g.moveTo(x, y));
    }
    g.closePath();
  }
  Lg.lakePath = lakePath;
  function lakeBox() {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [x, y] of L.lake) { x0 = Math.min(x0, x * T); y0 = Math.min(y0, y * T); x1 = Math.max(x1, x * T); y1 = Math.max(y1, y * T); }
    return { x0, y0, x1, y1 };
  }
  Lg.lakeBox = lakeBox;
  // o lago na tela isométrica: contorno e altura (Y de cima e de baixo)
  const ISO_POLY = L.lake.map(([x, y]) => [(x - y) * T, ((x + y) / 2) * T]);
  const ISO_TOP = Math.min(...ISO_POLY.map((p) => p[1])), ISO_BOT = Math.max(...ISO_POLY.map((p) => p[1]));
  // onde a linha horizontal Y (iso) cruza o lago: [esquerda, direita] ou null
  function lakeSpan(Y) {
    let a = 1e9, b = -1e9;
    for (let i = 0, j = ISO_POLY.length - 1; i < ISO_POLY.length; j = i++) {
      const [x1, y1] = ISO_POLY[j], [x2, y2] = ISO_POLY[i];
      if ((y1 > Y) === (y2 > Y)) continue;
      const x = x1 + ((Y - y1) * (x2 - x1)) / (y2 - y1);
      if (x < a) a = x;
      if (x > b) b = x;
    }
    return a < b ? [a, b] : null;
  }

  // faixas de cor com a passagem "em degraus" (duas linhas misturadas em xadrez), como pixel art
  // stops: [[fração onde a faixa acaba, cor], ...]
  function bands(g, x, y0, w, h, stops) {
    for (let y = 0; y < h; y++) {
      const v = y / h;
      let i = 0;
      while (i < stops.length - 1 && v > stops[i][0]) i++;
      g.fillStyle = stops[i][1];
      g.fillRect(x, y0 + y, w, 1);
      // perto da troca de cor: pontinhos da próxima cor (2 linhas)
      const next = stops[i + 1], edge = stops[i][0];
      if (next && (edge - v) * h < 4) {
        g.fillStyle = next[1];
        const gap = (edge - v) * h < 2 ? 2 : 4;
        for (let xx = x + (y % 2) * (gap / 2); xx < x + w; xx += gap) g.fillRect(xx, y0 + y, 1, 1);
      }
    }
  }
  // disco em pixels (linhas inteiras)
  function disc(g, cx, cy, r, col) {
    g.fillStyle = col;
    for (let dy = -r; dy <= r; dy++) { const w = Math.round(Math.sqrt(r * r - dy * dy)); g.fillRect(Math.round(cx - w), Math.round(cy + dy), 2 * w + 1, 1); }
  }

  /* ------------------------------------------------------------------ */
  /* O horizonte: céu em faixas, sol com anéis, montanhas em camadas      */
  /* ------------------------------------------------------------------ */
  const SKY_STOPS = [[0.12, P.sky1], [0.24, P.sky2], [0.38, P.sky3], [0.52, P.sky4], [0.66, P.sky5], [0.8, P.sky6], [1, P.sky7]];
  let BANDC = null;
  function bandCanvas(cw, ch) {
    const H = Math.round(ch * BAND);
    if (BANDC && BANDC.width === cw && BANDC.height === H) return BANDC;
    const c = DL.mk(cw, H), g = c.getContext('2d');
    // 1. céu em faixas, do roxo (alto) ao amarelo (horizonte)
    bands(g, 0, 0, cw, Math.round(H * 0.8), SKY_STOPS);
    g.fillStyle = P.sky7;
    g.fillRect(0, Math.round(H * 0.8), cw, H - Math.round(H * 0.8));
    // 2. o sol grande com anéis de brilho em degraus de cor (do maior para o menor)
    const sx = cw * SUN_X, sy = H * SUN_Y, r = Math.round(H * 0.12);
    disc(g, sx, sy, Math.round(r * 3.1), P.sky5);
    disc(g, sx, sy, Math.round(r * 2.4), P.sky6);
    disc(g, sx, sy, Math.round(r * 1.75), P.sky7);
    disc(g, sx, sy, Math.round(r * 1.3), P.sky8);
    disc(g, sx, sy, r, P.sky8);
    // 3. nuvens compridas e finas na frente do céu (escuras embaixo, douradas em cima)
    for (let i = 0; i < 9; i++) {
      const y = Math.round(H * (0.06 + hash(i * 7 + 3) * 0.5)), w = Math.round(cw * (0.12 + hash(i * 5) * 0.22)), x = Math.round(hash(i * 11 + 1) * cw) - w / 2;
      g.fillStyle = y < H * 0.3 ? P.sky2 : P.sky3;
      g.fillRect(x, y, w, 2);
      g.fillRect(x + 6, y + 2, w - 14, 1);
      g.fillStyle = y < H * 0.3 ? P.sky4 : P.sky6;
      g.fillRect(x + 4, y - 1, w - 10, 1);
    }
    // 4. montanhas em 4 camadas: cada uma mais escura e mais baixa que a de trás
    const layers = [[P.mt3, 0.5, 0.72, 1], [P.mt2, 0.6, 0.8, 2], [P.mt1, 0.72, 0.89, 3], [P.mt0, 0.84, 0.97, 4]];
    for (const [col, top, base, seed] of layers) {
      for (let x = 0; x < cw; x += 2) {
        const n = Math.sin(x * 0.011 + seed * 1.7) * 0.5 + Math.sin(x * 0.027 + seed * 4.1) * 0.3 + Math.sin(x * 0.067 + seed) * 0.12 + (hash(Math.floor(x / 6) + seed * 97) - 0.5) * 0.08;
        const y = Math.round(H * lerp(base, top, clamp(0.5 + n * 0.6, 0, 1)));
        g.fillStyle = col;
        g.fillRect(x, y, 2, H - y);
      }
    }
    // a borda de baixo some em pontinhos (emenda com a cidade lá embaixo)
    g.clearRect(0, H - 1, cw, 1);
    for (let x = 0; x < cw; x += 2) g.clearRect(x + 1, H - 2, 1, 1);
    BANDC = c;
    return c;
  }
  // A CADA QUADRO: o horizonte desce do alto da tela (só drawImage) e as nuvens finas andam devagar
  Lg.band = function (g, sc, st) {
    if (!st.band || st.band <= 0.01) return;
    const cw = sc.canvas.width, ch = sc.canvas.height, c = bandCanvas(cw, ch), H = c.height, hb = Math.round(st.band * H);
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(c, 0, H - hb, cw, hb, 0, 0, cw, hb);
    // nuvens finas passando (na frente do céu, atrás das montanhas: só na parte de cima)
    for (let i = 0; i < 5; i++) {
      const w = Math.round(cw * (0.08 + hash(i * 13) * 0.1)), y = Math.round(H * (0.12 + hash(i * 3 + 9) * 0.3)) - (H - hb);
      if (y < 0 || y > hb - 4) continue;
      const x = Math.round(((hash(i * 17) * cw + st.t * (3 + i)) % (cw + w)) - w);
      g.fillStyle = P.sky3; g.fillRect(x, y, w, 1);
      g.fillStyle = P.sky6; g.fillRect(x + 3, y - 1, w - 8, 1);
    }
    g.restore();
  };

  // A névoa do fim de tarde no filme (no lugar de uma faixa de céu): o alto da tela some numa névoa quente,
  // com gradiente suave, e o sol vira só um brilho de luz no alto. Nada de borda reta. Imagem pronta.
  let HAZE = null;
  Lg.haze = function (g, sc, a) {
    const cw = sc.canvas.width, ch = sc.canvas.height;
    if (!HAZE || HAZE.width !== cw || HAZE.height !== ch) {
      HAZE = DL.mk(cw, ch);
      const h = HAZE.getContext('2d'), top = ch * 0.07; // (começa embaixo da faixa preta de cinema)
      const lg = h.createLinearGradient(0, top, 0, top + ch * 0.42);
      lg.addColorStop(0, 'rgba(244,170,110,0.62)');
      lg.addColorStop(0.35, 'rgba(236,150,110,0.3)');
      lg.addColorStop(1, 'rgba(232,150,100,0)');
      h.fillStyle = lg;
      h.fillRect(0, 0, cw, ch);
      // o brilho do sol, no alto (o mesmo x do reflexo na água)
      const sx = cw * SUN_X, sy = top - ch * 0.1, r = Math.max(cw, ch) * 0.55;
      const rg = h.createRadialGradient(sx, sy, 0, sx, sy, r);
      rg.addColorStop(0, 'rgba(255,236,170,0.75)');
      rg.addColorStop(0.25, 'rgba(253,200,110,0.35)');
      rg.addColorStop(1, 'rgba(249,168,58,0)');
      h.fillStyle = rg;
      h.fillRect(0, 0, cw, ch);
    }
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = clamp(a, 0, 1);
    g.drawImage(HAZE, 0, 0);
    g.restore();
  };

  // o céu de fundo (atrás da cidade, só aparece nas bordas lá no alto): faixas, imagem pronta
  let SKY = null;
  Lg.sky = function (g, sc) {
    const cw = sc.canvas.width, ch = sc.canvas.height;
    if (!SKY || SKY.width !== cw || SKY.height !== ch) {
      SKY = DL.mk(cw, ch);
      bands(SKY.getContext('2d'), 0, 0, cw, ch, SKY_STOPS);
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(SKY, 0, 0);
  };

  // morros nas bordas de trás da cidade (norte e oeste): só nas imagens prontas do alto
  function ridge(n, a, b) { return 260 + Math.sin(n * a) * 120 + Math.sin(n * b + 1.3) * 80 + (hash(Math.floor(n / 9)) - 0.5) * 60; }
  Lg.hills = function (g, sc) {
    const C0 = Lg.CITY;
    K.isoT(g, sc);
    const y0 = C0.y0 * T, x0 = C0.x0 * T, x1 = C0.x1 * T, y1 = C0.y1 * T, step = 40 * T;
    for (const [col, zk, off] of [[P.mt2, 1.35, 0], [P.mt1, 1, 9]]) {
      const pts = [[x0, y0 - 200, 0]];
      for (let x = x0; x <= x1; x += step) pts.push([x, y0 - 200, ridge(x / T + off, 0.013, 0.031) * zk * 6]);
      pts.push([x1, y0 - 200, 0]);
      K.poly(g, pts, col);
      const pw = [[x0 - 200, y0, 0]];
      for (let y = y0; y <= y1; y += step) pw.push([x0 - 200, y, ridge(y / T + off + 40, 0.015, 0.027) * zk * 6]);
      pw.push([x0 - 200, y1, 0]);
      K.poly(g, pw, col);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Sombras compridas (todas para o mesmo lado: o sol baixo vem do norte) */
  /* ------------------------------------------------------------------ */
  const SUN_DIR = (() => { const x = 0.3, y = 1, l = Math.hypot(x, y); return { x: x / l, y: y / l }; })();
  Lg.SUN_DIR = SUN_DIR;
  const SHADOW_K = 2.2;                       // o comprimento das sombras (sol baixo)
  const SHADOW_COL = 'rgba(16,14,30,0.45)';   // roxo azulado escuro (a paleta acerta o tom no preparo)
  const SHADOW_LIVE = 'rgba(16,14,30,0.34)';
  function quad(g, ax, ay, bx, by, dx, dy) {
    g.moveTo(ax, ay); g.lineTo(bx, by); g.lineTo(bx + dx, by + dy); g.lineTo(ax + dx, ay + dy); g.closePath();
  }
  // fecho convexo (sentido sempre igual, para as sombras se somarem sem buracos)
  function hull(pts) {
    pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  // UMA VEZ: as sombras do que não se mexe, no chão do mapa (g em pixels do mundo, sem transformação)
  Lg.bakeShadows = function (g, items) {
    const k = SHADOW_K, dx = SUN_DIR.x * k, dy = SUN_DIR.y * k, ang = Math.atan2(dy, dx);
    g.beginPath();
    for (const e of items) {
      if (!e.shadow) continue;
      const bx = e.px + 8, by = e.py + 8;
      if (e.shadow === 'tree') {
        const s = e.small ? 0.55 : 1, h = 64 * s, cr = 30 * s;
        quad(g, bx - 1.5, by, bx + 1.5, by, dx * h, dy * h);
        const cx = bx + dx * (h + cr * 0.6), cy = by + dy * (h + cr * 0.6);
        g.moveTo(cx + cr, cy);
        g.ellipse(cx, cy, cr * 0.7 * k, cr * 0.8, ang, 0, Math.PI * 2);
      } else if (e.shadow === 'lamp') {
        quad(g, bx - 1, by, bx + 1, by, dx * 146, dy * 146);
        const ex = bx + dx * 146, ey = by + dy * 146;
        g.moveTo(ex - 18, ey - 1); g.lineTo(ex + 18, ey - 1); g.lineTo(ex + 18, ey + 1.5); g.lineTo(ex - 18, ey + 1.5); g.closePath();
      } else if (e.shadow === 'sign') {
        quad(g, bx - 0.8, by, bx + 0.8, by, dx * 34, dy * 34);
        g.moveTo(bx + dx * 34 - 7, by + dy * 34); g.lineTo(bx + dx * 50 + 7, by + dy * 34); g.lineTo(bx + dx * 50 + 7, by + dy * 50); g.lineTo(bx + dx * 34 - 7, by + dy * 50); g.closePath();
      } else if (e.shadow === 'bush') {
        g.moveTo(bx + dx * 8 + 12, by + dy * 8); g.ellipse(bx + dx * 8, by + dy * 8, 12, 7, ang, 0, Math.PI * 2);
      } else if (e.shadow === 'poly') {
        // prédios do mapa lógico: o contorno (tiles) "arrastado" pela altura (fecho convexo da base e da ponta)
        for (const pl of e.polys) {
          const pts = [];
          for (const [x, y] of pl.q) { pts.push([x * T, y * T]); pts.push([x * T + dx * pl.h, y * T + dy * pl.h]); }
          const hl = hull(pts);
          hl.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
          g.closePath();
        }
      } else if (e.shadow === 'box') {
        const x0 = e.px, y0 = e.py, x1 = x0 + e.tw * T, y1 = y0 + e.th * T, h = e.h;
        g.moveTo(x0, y0); g.lineTo(x1, y0); g.lineTo(x1 + dx * h, y0 + dy * h); g.lineTo(x1 + dx * h, y1 + dy * h);
        g.lineTo(x0 + dx * h, y1 + dy * h); g.lineTo(x0, y1); g.closePath();
      }
    }
    g.fillStyle = SHADOW_COL;
    g.fill('nonzero');
  };
  // A CADA QUADRO: só as sombras de quem anda
  Lg.shadows = function (g, sc, st) {
    const k = SHADOW_K, dx = SUN_DIR.x * k, dy = SUN_DIR.y * k, ang = Math.atan2(dy, dx);
    sc.groundTransform(g);
    const S = sc.S, vx0 = sc.ox / S - 60, vx1 = (sc.ox + sc.canvas.width) / S + 20, vy0 = sc.oy / S - 60, vy1 = (sc.oy + sc.canvas.height) / S + 20;
    g.beginPath();
    let any = false;
    for (const a of sc.drawables) {
      if (!(a instanceof DL.Actor) || a.hidden || a.alpha === 0) continue;
      const X = a.x - a.y, Y = (a.x + a.y) / 2;
      if (X < vx0 || X > vx1 || Y < vy0 || Y > vy1) continue;
      quad(g, a.x - 3, a.y, a.x + 3, a.y, dx * 24, dy * 24);
      g.moveTo(a.x + dx * 27 + 4, a.y + dy * 27); g.ellipse(a.x + dx * 27, a.y + dy * 27, 4.2, 3.4, ang, 0, Math.PI * 2);
      any = true;
    }
    for (const f of st.extraShadows || []) any = f(g, dx, dy, ang, vx0, vx1, vy0, vy1) || any;
    if (!any) return;
    g.fillStyle = SHADOW_LIVE;
    g.fill('nonzero');
  };

  /* ------------------------------------------------------------------ */
  /* Água                                                                */
  /* ------------------------------------------------------------------ */
  // A água pintada uma vez (g em pixels do mundo). Desenhada numa tela isométrica e depois "deitada" no chão.
  //   · as faixas de cor seguem a MARGEM DE LÁ (o alto de cada coluna do lago), não uma linha reta:
  //     perto da margem o céu quente refletido, longe dela o azul escuro (perspectiva)
  //   · mais claro perto do sol (a coluna dourada fica embaixo dele)
  //   · a passagem entre cores é em xadrez (pixel art), sem manchas soltas
  //   · reflexos curtos e claros só das árvores e prédios que existem na margem de lá
  // o céu refletido DENTRO da água: azul claro longe (alto da tela) → azul escuro perto; sem faixa quente na borda
  const WATER_STOPS = [P.wa3, P.wa2, P.wa1, P.wa0];
  const WATER_AT = [0, 0.3, 0.62, 1]; // (0 = longe, 1 = perto)
  const WARM = [P.mt3, P.mt2].map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
  const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const WS = WATER_STOPS.map(rgb);
  // onde a coluna X (iso) cruza o lago: [cima, baixo] ou null
  function colSpan(X) {
    let a = 1e9, b = -1e9;
    for (let i = 0, j = ISO_POLY.length - 1; i < ISO_POLY.length; j = i++) {
      const [x1, y1] = ISO_POLY[j], [x2, y2] = ISO_POLY[i];
      if ((x1 > X) === (x2 > X)) continue;
      const y = y1 + ((X - x1) * (y2 - y1)) / (x2 - x1);
      if (y < a) a = y;
      if (y > b) b = y;
    }
    return a < b ? [a, b] : null;
  }
  Lg.bakeWater = function (g, sc) {
    const b = lakeBox();
    const X0 = Math.floor(Math.min(...ISO_POLY.map((p) => p[0]))) - 8, X1 = Math.ceil(Math.max(...ISO_POLY.map((p) => p[0]))) + 8;
    const Y0 = Math.floor(ISO_TOP) - 8, Y1 = Math.ceil(ISO_BOT) + 8;
    const w = X1 - X0, h = Y1 - Y0;
    // a margem de lá em cada coluna da tela (X), suavizada (as enseadas não quebram as faixas)
    const top = new Float32Array(w), depth = new Float32Array(w);
    let last = ISO_TOP;
    for (let x = 0; x < w; x++) { const sp = colSpan(X0 + x + 0.5); top[x] = sp ? sp[0] : last; depth[x] = sp ? sp[1] - sp[0] : 0; last = top[x]; }
    const sm = new Float32Array(w), R0 = 48;
    for (let x = 0; x < w; x++) { let s = 0, n = 0; for (let k = Math.max(0, x - R0); k <= Math.min(w - 1, x + R0); k += 4) { s += top[k]; n++; } sm[x] = Math.min(top[x], s / n); }
    const LH = ISO_BOT - ISO_TOP, sunX = w * 0.62;
    // o reflexo da margem de lá: as árvores de verdade, de cabeça para baixo (numa tela isométrica à parte)
    const rr = DL.mk(w, h + 400), q = rr.getContext('2d');
    q.imageSmoothingEnabled = false;
    const fake = { S: 1, ox: X0, oy: Y0, canvas: rr };
    for (const e of sc.world.items) {
      if (!e.refl || e.hidden) continue;
      if (e.py + (e.th || 1) * T > b.y1 - 4) continue; // as árvores de cá não aparecem no lago
      const fn = L.draw[e.kind.slice(3)];
      if (fn) { q.save(); fn(q, fake, e, 0, true); q.restore(); }
    }
    const ra = q.getImageData(0, 0, w, h).data;
    // pinta direto no CHÃO (pixel do mundo), mas medindo tudo na tela isométrica: assim o pontilhado
    // fica um xadrez de verdade na tela (e não vira linhas retas)
    const gx0 = Math.floor(b.x0) - 2, gy0 = Math.floor(b.y0) - 2, gw = Math.ceil(b.x1) + 2 - gx0, gh = Math.ceil(b.y1) + 2 - gy0;
    const wc = DL.mk(gw, gh), wg = wc.getContext('2d');
    const img = wg.createImageData(gw, gh), d = img.data;
    for (let j = 0; j < gh; j++) {
      const gy = gy0 + j;
      for (let i = 0; i < gw; i++) {
        const gx = gx0 + i, X = gx - gy, Y = (gx + gy) / 2, xi = Math.floor(X - X0);
        if (xi < 0 || xi >= w || !depth[xi]) continue;
        const dist = Math.max(0, Y - sm[xi]), sun = Math.max(0, 1 - Math.abs(xi - sunX) / (w * 0.3));
        // a perspectiva: mistura a altura na tela (faixas suaves de ponta a ponta) com a distância da margem
        // de lá (as faixas acompanham a forma do lago, sem quebrar na borda)
        const vY = (Y - ISO_TOP) / LH, vS = Math.min(1, dist / (LH * 0.9));
        // (com uma ondulação leve: a troca de cor vira uma linha ondulada, sem pontilhado nem listras)
        const v = Math.min(1, Math.max(0, 0.6 * vY + 0.4 * vS + Math.sin(X * 0.045 + Y * 0.02) * 0.012 + Math.sin(X * 0.013 - Y * 0.05) * 0.008));
        let k = 0;
        while (k < WATER_AT.length - 2 && v > WATER_AT[k + 1]) k++;
        const f = (v - WATER_AT[k]) / (WATER_AT[k + 1] - WATER_AT[k]);
        // xadrez medido na TELA (não no chão): pontinhos, nunca listras
        const ci = f > 0.5 ? k + 1 : k; // o pontilhado só numa faixa estreita na troca de cor
        let c = WS[ci];
        // o pôr do sol refletido: um rosado leve, longe e só do lado do sol
        const wm = sun * Math.max(0, 1 - vY / 0.16);
        if (wm > 0.45) c = wm > 0.75 ? WARM[0] : WARM[1];
        // reflexo: só perto da margem de lá (curto) e suave: a mesma faixa, uma cor mais funda
        const yi = Math.floor(Y - Y0);
        if (dist < 46 && yi >= 0 && yi < h && ra[(yi * w + xi) * 4 + 3] > 128) c = WS[Math.min(WS.length - 1, ci + 1)];
        const o = (j * gw + i) * 4;
        d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
      }
    }
    wg.putImageData(img, 0, 0);
    // brilhos dourados parados perto da margem de lá (mais perto do sol): tracinhos deitados na tela
    for (let n = 0; n < 320; n++) {
      const xi = Math.floor(hash(n * 13 + 5) * w);
      if (!depth[xi]) continue;
      const near = Math.max(0, 1 - Math.abs(xi - sunX) / (w * 0.4));
      if (hash(n * 29) > near * 0.8) continue; // só do lado do sol
      const X = X0 + xi, Y = sm[xi] + 12 + Math.pow(hash(n * 7 + 2), 2) * depth[xi] * 0.45, len = 2 + Math.floor(hash(n * 3) * 5);
      wg.fillStyle = hash(n * 17) < 0.5 ? P.sky7 : P.sky6;
      // (X, Y) na tela → chão: x = X/2 + Y, y = Y − X/2; andar na tela para a direita = (+1, −1) no chão
      let gx = Math.round(X / 2 + Y) - gx0, gy = Math.round(Y - X / 2) - gy0;
      for (let k = 0; k < len; k++, gx++, gy--) wg.fillRect(gx, gy, 1, 1);
    }
    // só dentro do lago
    wg.globalCompositeOperation = 'destination-in';
    wg.setTransform(1, 0, 0, 1, -gx0, -gy0);
    lakePath(wg, false);
    wg.fillStyle = '#000';
    wg.fill();
    // a linha de água mais escura encostada na margem (por dentro)
    wg.globalCompositeOperation = 'source-atop';
    lakePath(wg, false);
    wg.lineJoin = 'round';
    wg.strokeStyle = P.wa1; wg.lineWidth = 11; wg.globalAlpha = 0.5; wg.stroke(); wg.globalAlpha = 1;
    wg.strokeStyle = P.wa0; wg.lineWidth = 7; wg.stroke();
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
    g.drawImage(wc, gx0, gy0);
    // a borda fina de concreto cinza-claro (foto 13)
    lakePath(g, false);
    g.lineJoin = 'round';
    g.strokeStyle = P.ne5; g.lineWidth = 3; g.stroke();
    // o brilho do pôr do sol na borda, só do lado do sol (a margem de lá, embaixo do sol)
    const Pl = L.lake;
    g.strokeStyle = P.sky7; g.lineWidth = 1;
    g.beginPath();
    for (let i = 0; i < Pl.length; i++) {
      const a = Pl[i], c = Pl[(i + 1) % Pl.length], mx = (a[0] + c[0]) / 2 * T, my = (a[1] + c[1]) / 2 * T;
      const xi = mx - my - X0, sun = 1 - Math.abs(xi - sunX) / (w * 0.3);
      const sp = colSpan(mx - my);
      if (sun < 0.2 || !sp || (mx + my) / 2 > sp[0] + 40) continue; // só a margem de lá
      g.moveTo(a[0] * T, a[1] * T + 1); g.lineTo(c[0] * T, c[1] * T + 1);
    }
    g.stroke();
    g.restore();
  };

  // A CADA QUADRO: ondinhas (posições fixas no mundo, prontas) e a coluna de sol dourada
  const RIP = [];
  const RIP_COL = [P.wa3, P.wa0, P.sky6];
  let COLUMN = null;
  function makeColumn() {
    // a coluna de sol (imagem 11): traços dourados horizontais, mais densos e claros no meio
    const w = 160, h = 512, c = DL.mk(w, h), g = c.getContext('2d');
    for (let y = 0; y < h; y += 2) {
      const n = 3 + Math.floor(hash(y * 7) * 4);
      for (let i = 0; i < n; i++) {
        const u = (hash(y * 13 + i * 7) + hash(y * 3 + i * 11) - 1) * 0.5; // mais no meio
        const len = 3 + Math.floor(hash(y * 5 + i) * 14 * (1 - Math.abs(u) * 1.6));
        const x = Math.round(w / 2 + u * w - len / 2), k = Math.abs(u) + hash(y + i * 31) * 0.3;
        g.fillStyle = k < 0.18 ? P.sky8 : k < 0.32 ? P.sky7 : k < 0.45 ? P.sky6 : P.sky5;
        g.fillRect(x, y, Math.max(1, len), 1);
      }
    }
    return c;
  }
  function initWater() {
    COLUMN = makeColumn();
    const b = lakeBox();
    for (let i = 0; RIP.length < 700 && i < 5000; i++) {
      const x = b.x0 + hash(i * 7 + 1) * (b.x1 - b.x0), y = b.y0 + hash(i * 13 + 5) * (b.y1 - b.y0);
      // só dentro do lago, com folga da margem (assim não precisa recortar)
      if (!L.inLake(x / T, y / T) || !L.inLake(x / T + 0.8, y / T - 0.8) || !L.inLake(x / T - 0.3, y / T + 0.3)) continue;
      const Y = (x + y) / 2, v = (Y - ISO_TOP) / (ISO_BOT - ISO_TOP);
      // em cima (água quente) brilham dourado; embaixo (azul escuro) brilham azul-claro
      RIP.push({ X: x - y, Y, len: 4 + Math.floor(hash(i * 11) * 8), ph: hash(i * 17) * 20, sp: 0.6 + hash(i * 19) * 0.8, col: v < 0.35 ? 2 : hash(i * 3) < 0.6 ? 0 : 1 });
    }
    RIP.sort((a, b2) => a.col - b2.col);
  }
  Lg.water = function (g, sc, st) {
    if (!COLUMN) initWater();
    const S = sc.S, cw = sc.canvas.width, ch = sc.canvas.height, t = st.t;
    const vx0 = sc.ox / S, vx1 = (sc.ox + cw) / S, vy0 = sc.oy / S, vy1 = (sc.oy + ch) / S;
    const b = lakeBox();
    if (b.x1 - b.y0 < vx0 || b.x0 - b.y1 > vx1 || ISO_BOT < vy0 || ISO_TOP > vy1) return; // o lago não está na tela
    K.isoT(g, sc);
    // ondinhas: tracinhos que aparecem e somem devagar (sem transparência: só cores da paleta)
    let col = -1;
    if (S > 0.3) for (const rp of RIP) {
      if (rp.X < vx0 - 12 || rp.X > vx1 || rp.Y < vy0 || rp.Y > vy1) continue;
      if (Math.sin(t * rp.sp + rp.ph) < 0.2) continue;
      if (rp.col !== col) { col = rp.col; g.fillStyle = RIP_COL[col]; }
      g.fillRect(Math.round(rp.X + Math.sin(t * 0.5 + rp.ph) * 3), Math.round(rp.Y), rp.len, 1);
    }
    // a coluna de sol, embaixo do sol: estreita perto da margem de lá, larga perto de cá; as faixas
    // ondulam e piscam devagar (cada faixa ~3 pixels da TELA, qualquer que seja o zoom)
    const sx = (sunPos(sc, st).x + sc.ox) / S, top = Math.max(vy0, ISO_TOP);
    const scroll = Math.floor(t * 5), step = Math.max(3, Math.ceil(3 / S));
    for (let y = Math.floor(top), i = 0; y < vy1; y += step, i++) {
      if (Math.sin(t * 1.3 + i * 1.7) < -0.55) continue; // pisca
      const sp2 = lakeSpan(y + step / 2);
      if (!sp2) continue;
      const v = clamp((y - ISO_TOP) / (ISO_BOT - ISO_TOP), 0, 1), w = Math.round(46 + 114 * v);
      const off = Math.round(Math.sin(y * 0.11 + t * 1.1) * 2 + Math.sin(y * 0.031 - t * 0.5) * 3);
      const cx0 = Math.round(sx - w / 2 + off), a = Math.max(cx0, Math.ceil(sp2[0]) + 2), bb = Math.min(cx0 + w, Math.floor(sp2[1]) - 2);
      if (bb <= a) continue;
      g.drawImage(COLUMN, 80 - w / 2 + (a - cx0), (y + scroll) % 508, bb - a, 2, a, y, bb - a, Math.max(1, step - 1));
    }
  };

  /* ------------------------------------------------------------------ */
  /* Luz por cima: postes acendendo e poeira dourada                      */
  /* ------------------------------------------------------------------ */
  const DUST = [];
  for (let i = 0; i < 70; i++) DUST.push({ x: hash(i * 3), y: hash(i * 7), s: 0.4 + hash(i * 11) * 0.8, p: hash(i * 13) * 6 });
  // quando cada poste acende (0..1 de dusk), com uma piscadinha
  function lampOn(e, st) {
    const at = 0.38 + ((e.n * 37) % 11) * 0.03;
    if (st.dusk < at) return 0;
    const k = clamp((st.dusk - at) / 0.06, 0, 1);
    const flick = k < 1 ? (Math.sin(st.t * 40 + e.n) > 0.2 ? 1 : 0.25) : 1;
    return k * flick;
  }
  Lg.lampOn = lampOn;
  // um brilho redondo pronto; desenhado com o tamanho e a força que quiser (sem gradiente por quadro)
  const GLOWS = {};
  function glowSprite(rgbStr) {
    if (GLOWS[rgbStr]) return GLOWS[rgbStr];
    const c = DL.mk(64, 64), g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(' + rgbStr + ',1)');
    gr.addColorStop(0.4, 'rgba(' + rgbStr + ',0.35)');
    gr.addColorStop(1, 'rgba(' + rgbStr + ',0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    return (GLOWS[rgbStr] = c);
  }
  function glow(g, x, y, r, rgbStr, a) {
    if (a <= 0.005) return;
    const ga = g.globalAlpha;
    g.globalAlpha = ga * a;
    g.drawImage(glowSprite(rgbStr), x - r, y - r, r * 2, r * 2);
    g.globalAlpha = ga;
  }
  Lg.glow = glow;
  Lg.light = function (g, sc, st) {
    const cw = sc.canvas.width, ch = sc.canvas.height, S = sc.S, t = st.t;
    g.save();
    g.globalCompositeOperation = 'lighter';
    // postes acendendo aos poucos (só os que estão na tela)
    if (st.dusk > 0.37 && S > 0.2) {
      K.isoT(g, sc);
      const vx0 = sc.ox / S - 80, vx1 = (sc.ox + cw) / S + 80, vy0 = sc.oy / S - 40, vy1 = (sc.oy + ch) / S + 200;
      for (const e of Lg.lamps || []) {
        const bx = e.px + 8, by = e.py + 8, X = IX(bx, by), Y = IY(bx, by);
        if (X < vx0 || X > vx1 || Y < vy0 || Y > vy1) continue;
        const on = lampOn(e, st);
        if (on <= 0) continue;
        for (const hd of L.LAMP.heads) {
          glow(g, X + hd[0], Y - hd[1] + 3, 7, '255,243,192', 0.95 * on);
          glow(g, X + hd[0], Y - hd[1] + 4, 30, '249,168,58', 0.3 * on);
        }
        g.save();
        g.translate(X, Y + 4);
        g.scale(1, 0.5);
        glow(g, 0, 0, 56, '249,168,58', 0.18 * on);
        g.restore();
      }
    }
    // poeira dourada flutuando no ar (mais forte perto do sol)
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    const px = Math.max(1, Math.round(S * 0.7)), s = sunPos(sc, st), big = Math.max(cw, ch);
    g.fillStyle = P.sky7;
    for (const p of DUST) {
      const x = ((p.x * cw + t * 9 * p.s + Math.sin(t * 0.7 + p.p) * 14 + sc.ox * 0.05) % cw + cw) % cw;
      const y = ((p.y * ch - t * 4 * p.s + Math.cos(t * 0.5 + p.p) * 10) % ch + ch) % ch;
      const near = 1 - clamp(Math.hypot(x - s.x, y - s.y) / big, 0, 1);
      if ((0.15 + 0.5 * near) * (0.5 + 0.5 * Math.sin(t * 1.7 + p.p * 3)) < 0.2) continue;
      g.fillRect(Math.round(x), Math.round(y), px, px);
    }
    g.restore();
  };

  /* ------------------------------------------------------------------ */
  /* As nuvens da abertura (cobrem a tela e se abrem)                     */
  /* ------------------------------------------------------------------ */
  const PUFFS = [];
  function makePuff(seed, w, h) {
    const c = DL.mk(w, h), g = c.getContext('2d');
    const balls = [];
    for (let i = 0; i < 9; i++) balls.push([w * (0.15 + hash(seed + i) * 0.7), h * (0.4 + hash(seed * 3 + i) * 0.35), h * (0.18 + hash(seed * 7 + i) * 0.2)]);
    for (const [x, y, r] of balls) disc(g, x, y + 3, Math.round(r), P.ne4);
    for (const [x, y, r] of balls) disc(g, x, y, Math.round(r), P.ne6);
    for (const [x, y, r] of balls) disc(g, x + 2, y - 2, Math.round(r * 0.6), P.sky8);
    for (const [x, y, r] of balls) disc(g, x + r * 0.4, y - r * 0.5, Math.round(r * 0.3), P.sky7);
    return c;
  }
  for (let i = 0; i < 26; i++) PUFFS.push({ img: makePuff(i * 13 + 5, 90, 46), a: hash(i * 3 + 7) * Math.PI * 2, r: Math.sqrt(hash(i * 5 + 1)) * 0.75, s: 0.9 + hash(i * 9) * 0.8 });
  Lg.clouds = function (g, sc, k, t) {
    if (k >= 1) return;
    const cw = sc.canvas.width, ch = sc.canvas.height, sz0 = ch / 300;
    const e = k * k * (3 - 2 * k), cx = cw / 2, cy = ch / 2, R0 = Math.max(cw, ch);
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
    g.globalAlpha = clamp(1.25 - k, 0, 1);
    // o fundo claro some primeiro (mostra o que há atrás entre as nuvens)
    const bgA = clamp(1 - k * 2.2, 0, 1);
    if (bgA > 0) { g.fillStyle = P.ne6; g.globalAlpha = bgA; g.fillRect(0, 0, cw, ch); g.globalAlpha = clamp(1.25 - k, 0, 1); }
    for (const p of PUFFS) {
      const out = p.r * R0 * 0.55 + e * R0 * (0.7 + p.s * 0.4);
      const x = cx + Math.cos(p.a) * out * 1.3 + Math.sin(t * 0.3 + p.a) * 3, y = cy + Math.sin(p.a) * out * 0.8;
      const sz = Math.max(1, Math.round(p.s * (1 + e * 0.8) * sz0 * 1.6 * 2) / 2);
      if (x + 45 * sz < 0 || x - 45 * sz > cw || y + 23 * sz < 0 || y - 23 * sz > ch) continue;
      g.drawImage(p.img, Math.round(x - 45 * sz), Math.round(y - 23 * sz), Math.round(90 * sz), Math.round(46 * sz));
    }
    g.restore();
  };
})();

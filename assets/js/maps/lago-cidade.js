/* Venti Experience — Parte 0: a cidade em volta do lago (Canaã dos Carajás vista de cima).
   O mapa do lago (lago-cenario.js) fica no meio; aqui é o resto da cidade, desenhado POR FORA do mapa.
   Ruas, lotes e casas vêm do MESMO mapa lógico (lago-mapa.js): as quadras seguem as ruas de verdade
   (foto 12), cada casa fica dentro do seu lote, alinhada à rua, e nada fica em cima do asfalto.

   Para ficar leve, o chão da cidade é pintado uma vez em duas texturas vistas de cima (como o piso do
   mapa) e deitado no chão isométrico a cada quadro:
     · LONGE: a cidade inteira, 1 pixel por tile (planos 1 e 2, câmera bem alta), com os telhados
     · PERTO: uma faixa em volta do mapa, 4 pixels por tile (quando a câmera desce)
   Com a câmera baixa (e nas imagens prontas do alto, lago-preparo.js), as casas perto do mapa ganham
   volume: cada uma vira uma imagem pronta na primeira vez que aparece (no máximo ~700 guardadas). */
(function () {
  'use strict';
  const DL = window.DL, T = DL.T, Lg = DL.Lago || (DL.Lago = {});
  const shade = DL.shade, M = Lg.MAPA;

  // a cidade (tiles, em volta do mapa 0..W, 0..H)
  const CITY = M.RG;
  const NEAR = M.NEAR;
  const LAKE_C = { x: 92, y: 48 };              // o centro do lago: a névoa aumenta longe dele
  const HAZE = [232, 150, 100];                 // a cor da névoa quente do fim de tarde

  // pinta a cidade numa textura vista de cima (p pixels por tile), com a névoa da distância
  function bake(R0, p) {
    const w = (R0.x1 - R0.x0) * p, h = (R0.y1 - R0.y0) * p;
    const c = DL.mk(w, h), g = c.getContext('2d');
    M.pintar(g, p, R0, { tetos: true });
    // névoa: quanto mais longe do lago, mais coberto (só depois de ~90 tiles)
    const img = g.getImageData(0, 0, w, h), d = img.data;
    for (let y = 0; y < h; y++) {
      const ty = R0.y0 + (y + 0.5) / p;
      for (let x = 0; x < w; x++) {
        const tx = R0.x0 + (x + 0.5) / p, dist = Math.hypot(tx - LAKE_C.x, (ty - LAKE_C.y) * 1.2), k = Math.min(0.72, Math.max(0, (dist - 90) / 520));
        if (k <= 0) continue;
        const o = (y * w + x) * 4;
        d[o] += (HAZE[0] - d[o]) * k; d[o + 1] += (HAZE[1] - d[o + 1]) * k; d[o + 2] += (HAZE[2] - d[o + 2]) * k;
      }
    }
    g.putImageData(img, 0, 0);
    return Lg.quantize ? Lg.quantize(c) : c;
  }

  let FAR = null, NEARC = null, LIVE = null, BACK = null, FRONT = null;
  function init() {
    if (FAR) return;
    FAR = bake(CITY, 1);
    NEARC = bake(NEAR, 4);
    // as casas com volume: as que ficam fora do mapa do lago, na região de perto
    const W = Lg.L.W, H = Lg.L.H;
    LIVE = M.casas.filter((c) => !c.noMapa && c.bb[2] > NEAR.x0 && c.bb[0] < NEAR.x1 && c.bb[3] > NEAR.y0 && c.bb[1] < NEAR.y1);
    for (const c of LIVE) c.front = c.bb[0] >= W || c.bb[1] >= H; // ao sul e a leste do mapa: desenhada depois do piso
    const by = (a, b) => a.cx + a.cy - (b.cx + b.cy);
    BACK = LIVE.filter((c) => !c.front).sort(by);
    FRONT = LIVE.filter((c) => c.front).sort(by);
  }

  // desenha a parte visível v (px do mundo) de uma textura tex que cobre a região R0 (tiles), p px por tile
  function part(g, tex, R0, p, v) {
    const k = p / T, tx0 = Math.max(0, Math.floor((v.x0 - R0.x0 * T) * k) - 2), ty0 = Math.max(0, Math.floor((v.y0 - R0.y0 * T) * k) - 2);
    const tx1 = Math.min(tex.width, Math.ceil((v.x1 - R0.x0 * T) * k) + 2), ty1 = Math.min(tex.height, Math.ceil((v.y1 - R0.y0 * T) * k) + 2);
    if (tx1 <= tx0 || ty1 <= ty0) return;
    g.drawImage(tex, tx0, ty0, tx1 - tx0, ty1 - ty0, R0.x0 * T + tx0 / k, R0.y0 * T + ty0 / k, (tx1 - tx0) / k, (ty1 - ty0) / k);
  }
  const HOUSE_MIN = 0.12; // abaixo deste zoom as casas ficam só no telhado pintado (de muito alto)
  Lg.cityInit = init;
  Lg.drawCity = function (g, sc) {
    init();
    sc.groundTransform(g);
    g.imageSmoothingEnabled = false;
    // só o pedaço que aparece na tela (as texturas são enormes deitadas no chão)
    part(g, FAR, CITY, 1, DL.viewWorld(sc));
    if (sc.S > 0.22) part(g, NEARC, NEAR, 4, DL.viewWorld(sc));
    if (sc.S >= HOUSE_MIN) houses(g, sc, false);
  };
  // as casas da frente (sul e leste do mapa) vão por cima do piso do mapa
  Lg.drawCityFront = function (g, sc) {
    if (!LIVE || sc.S < HOUSE_MIN) return;
    houses(g, sc, true);
  };

  // cada casa vira uma imagem pronta na primeira vez que aparece (as mais antigas saem da memória)
  const SPR = new Map(), MAX_SPR = 700;
  function sprite(c) {
    let s = SPR.get(c.id);
    if (s) { SPR.delete(c.id); SPR.set(c.id, s); return s; } // (a mais usada vai para o fim da fila)
    // os cantos na tela (com beiral e telhado)
    const q = M.corners({ cx: c.cx, cy: c.cy, u: c.u, v: c.v, w: c.w + 2.6, d: c.d + 2.8 }); // (com beiral, muro e pneus)
    let X0 = 1e9, X1 = -1e9, Y0 = 1e9, Y1 = -1e9;
    for (const [x, y] of q) { const X = (x - y) * T, Y = ((x + y) / 2) * T; X0 = Math.min(X0, X); X1 = Math.max(X1, X); Y0 = Math.min(Y0, Y); Y1 = Math.max(Y1, Y); }
    Y0 -= c.z + 30;
    X0 = Math.floor(X0); Y0 = Math.floor(Y0);
    const cv = DL.mk(Math.ceil(X1 - X0) + 2, Math.ceil(Y1 - Y0) + 2), g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    DL.isoKit.isoT(g, { S: 1, ox: X0, oy: Y0 });
    Lg.L.drawCasa(g, c);
    s = { c: cv, X0, Y0 };
    SPR.set(c.id, s);
    if (SPR.size > MAX_SPR) SPR.delete(SPR.keys().next().value);
    return s;
  }
  // prepara as imagens das casas mais perto do mapa (as que aparecem no jogo e no filme baixo)
  Lg.cityWarm = function () {
    init();
    const W = Lg.L.W, H = Lg.L.H;
    for (const c of LIVE) if (c.bb[2] > -24 && c.bb[0] < W + 24 && c.bb[3] > -24 && c.bb[1] < H + 24) sprite(c);
  };
  function houses(g, sc, front) {
    const S = sc.S;
    g.setTransform(S, 0, 0, S, -sc.ox, -sc.oy);
    const vx0 = sc.ox / S - 200, vx1 = (sc.ox + sc.canvas.width) / S + 200, vy0 = sc.oy / S - 120, vy1 = (sc.oy + sc.canvas.height) / S + 200;
    // de muito alto, sem volume (o telhado pintado já basta) — só nas imagens prontas do alto
    for (const c of front ? FRONT : BACK) {
      const X = (c.cx - c.cy) * T, Y = ((c.cx + c.cy) / 2) * T;
      if (X < vx0 || X > vx1 || Y < vy0 || Y > vy1) continue;
      const sp = sprite(c);
      g.drawImage(sp.c, sp.X0, sp.Y0);
    }
  }
  // para o "voo" da câmera: o centro e o tamanho da cidade (tiles)
  Lg.CITY = CITY;
  Lg.cityShade = shade;
})();

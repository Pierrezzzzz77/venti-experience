/* Venti Experience — Parte 0: o PREPARO do Lago (feito uma vez, com a barra "Carregando").

   Para o jogo não travar, tudo o que fica parado é desenhado UMA vez em telas escondidas (canvas):
     1. o chão do mapa (formas da foto 13, grama, flores), já com as sombras compridas e a água (faixas do céu e reflexo da margem de lá)
     2. a cidade em volta (lago-cidade.js)
     3. a cidade inteira vista do alto, pronta em 5 tamanhos (como "mipmaps"):
          1/32 a cidade toda · 1/16 · 1/8 · 1/4 · 1/2 só em volta do lago
        No filme, com a câmera alta (zoom < 0,5), cada quadro é só um drawImage da imagem do tamanho certo;
        com a câmera baixa, o motor desenha o mapa normal (árvores, gente, carros) sobre o chão pronto.
   Fica tudo guardado: se o jogador voltar ao lago, não precisa preparar de novo. */
(function () {
  'use strict';
  const DL = window.DL, T = DL.T, Lg = DL.Lago;
  const $ = (id) => document.getElementById(id);
  const AERIAL_MAX = 0.5; // abaixo deste zoom o filme usa as imagens prontas do alto
  Lg.AERIAL_MAX = AERIAL_MAX;

  const cache = { floor: null, mips: null };

  // uma "cena" de mentira para desenhar fora da tela: escala s e origem (ox, oy) em pixels da imagem
  function fakeScene(sc, s, ox, oy, canvas) {
    return {
      S: s, ox, oy, canvas, world: sc.world, o: sc.o, t: 0, drawables: [],
      groundTransform(g, z) { g.setTransform(s, s / 2, -s, s / 2, -ox, -oy - s * (z || 0)); },
    };
  }

  /* ------------------------------------------------------------------ */
  /* 1. o chão do mapa (sombras e água pintadas nele)                    */
  /* ------------------------------------------------------------------ */
  function bakeFloor(sc) {
    const src = sc.floor, c = DL.mk(src.width, src.height), g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(src, 0, 0);
    Lg.paintGround(g);                   // o chão de verdade, com as formas da foto 13 (lago-cenario.js)
    // primeiro as sombras (fora do lago: a água é pintada em tiras e deixaria a sombra aparecer nas frestas)
    g.save();
    g.beginPath();
    g.rect(0, 0, c.width, c.height);
    Lg.lakePath(g, false);
    g.clip('evenodd');
    Lg.bakeShadows(g, sc.world.items);
    g.restore();
    g.setTransform(1, 0, 0, 1, 0, 0);
    Lg.bakeWater(g, sc);
    g.setTransform(1, 0, 0, 1, 0, 0);
    return Lg.quantize(c); // só as cores da paleta
  }

  /* ------------------------------------------------------------------ */
  /* 2. o que fica em pé e não se mexe (prédios, casas, carros parados): uma imagem pronta cada */
  /* ------------------------------------------------------------------ */
  const STILL = { 'lg-pref': 1, 'lg-boi': 1, 'lg-house': 1, 'lg-car': 1, 'lg-esp': 1, 'lg-bench': 1 };
  const SPRITES = new Map(); // item → { c, X0, Y0 } (guardado para a próxima vez)
  function bakeSprites(sc) {
    for (const e of sc.world.items) {
      if (!STILL[e.kind] || e._still) continue;
      const key = e.kind + ':' + e.tx + ',' + e.ty;
      let sp = SPRITES.get(key);
      if (!sp) {
        let x0 = e.px, y0 = e.py, x1 = x0 + (e.tw || 1) * T, y1 = y0 + (e.th || 1) * T;
        // prédios com contorno (casas, Prefeitura): o tamanho real (a caixa do objeto fica presa dentro do mapa)
        if (e.polys) for (const pl of e.polys) for (const [x, y] of pl.q) { x0 = Math.min(x0, x * T - 24); y0 = Math.min(y0, y * T - 24); x1 = Math.max(x1, x * T + 24); y1 = Math.max(y1, y * T + 24); }
        const X0 = Math.floor(x0 - y1 - 6), X1 = Math.ceil(x1 - y0 + 6), Y0 = Math.floor((x0 + y0) / 2 - (e.isoH || 60) - 40), Y1 = Math.ceil((x1 + y1) / 2 + 8);
        const c = DL.mk(X1 - X0, Y1 - Y0), g = c.getContext('2d');
        g.imageSmoothingEnabled = false;
        e.drawIso(g, { S: 1, ox: X0, oy: Y0, canvas: c }, e, 0);
        sp = { c: Lg.quantize(c), X0, Y0 };
        SPRITES.set(key, sp);
      }
      // a partir de agora, desenhar o item é só um drawImage
      e._still = sp;
      e.drawIso = drawStill;
    }
  }
  function drawStill(g, sc, e) {
    const sp = e._still;
    g.setTransform(sc.S, 0, 0, sc.S, -sc.ox, -sc.oy);
    g.drawImage(sp.c, sp.X0, sp.Y0);
  }

  /* ------------------------------------------------------------------ */
  /* 3. as imagens do alto                                               */
  /* ------------------------------------------------------------------ */
  // regiões (em tiles) de cada tamanho: quanto maior a escala, menor a região (só perto do lago)
  function mipPlan() {
    const C = Lg.CITY, W = Lg.L.W, H = Lg.L.H;
    return [
      { s: 1 / 32, r: { x0: C.x0, x1: C.x1, y0: C.y0, y1: C.y1 }, hills: true },
      { s: 1 / 16, r: { x0: -300, x1: W + 300, y0: -240, y1: H + 230 }, hills: true },
      { s: 1 / 8, r: { x0: -130, x1: W + 130, y0: -110, y1: H + 110 } },
      { s: 1 / 4, r: { x0: -50, x1: W + 50, y0: -45, y1: H + 50 } },
      { s: 1 / 2, r: { x0: -14, x1: W + 14, y0: -14, y1: H + 16 } },
    ];
  }
  function bakeMip(sc, m) {
    const s = m.s, r = m.r, x0 = r.x0 * T, x1 = r.x1 * T, y0 = r.y0 * T, y1 = r.y1 * T;
    const UP = m.hills ? 3600 : 260; // espaço para o que fica em pé (prédios, árvores; morros na imagem maior)
    const X0 = x0 - y1, X1 = x1 - y0, Y0 = (x0 + y0) / 2 - UP, Y1 = (x1 + y1) / 2;
    const c = DL.mk(Math.ceil((X1 - X0) * s), Math.ceil((Y1 - Y0) * s)), g = c.getContext('2d');
    g.imageSmoothingEnabled = true; // ao reduzir, a média das cores fica mais limpa que pular pixels
    const f = fakeScene(sc, s, X0 * s, Y0 * s, c);
    if (m.hills) { Lg.hills(g, f); }
    g.imageSmoothingEnabled = false;
    Lg.drawCity(g, f);
    g.imageSmoothingEnabled = true;
    f.groundTransform(g);
    g.drawImage(sc.floor, 0, 0);
    g.imageSmoothingEnabled = false;
    Lg.drawCityFront(g, f);
    g.imageSmoothingEnabled = true;
    // o que fica em pé no mapa, de trás para a frente (o vento parado)
    if (s >= 1 / 16) {
      // (a bandeira de Canaã fica de fora: é desenhada por cima a cada quadro, com vento)
      const items = sc.world.items.filter((e) => e.drawIso && e.kind !== 'lg-mastro').sort((a, b) => a.px + a.py + ((a.tw || 1) + (a.th || 1)) * T - (b.px + b.py + ((b.tw || 1) + (b.th || 1)) * T));
      for (const e of items) { g.save(); e.drawIso(g, f, e, 0); g.restore(); }
    }
    const q = Lg.quantize(c); // a redução mistura cores: volta tudo para a paleta
    return { c: q, s, X0, Y0, X1: X0 + c.width / s, Y1: Y0 + c.height / s };
  }

  /* ------------------------------------------------------------------ */
  /* Preparar (em passos, com a barra)                                    */
  /* ------------------------------------------------------------------ */
  function bar(on, k, text) {
    let el = $('loading');
    if (!el) {
      el = document.createElement('div');
      el.id = 'loading';
      el.className = 'loading';
      el.innerHTML = '<span>Carregando o Lago da Prefeitura…</span><div class="loading__bar"><i></i></div>';
      document.body.appendChild(el);
    }
    el.hidden = !on;
    if (on) { el.querySelector('i').style.width = Math.round(k * 100) + '%'; if (text) el.querySelector('span').textContent = text; }
  }
  // prepara tudo; done() é chamado quando terminar. A barra só aparece se demorar.
  Lg.prepare = function (sc, done) {
    const steps = [];
    if (!cache.floor) steps.push(() => { cache.floor = bakeFloor(sc); });
    steps.push(() => Lg.cityInit());
    steps.push(() => bakeSprites(sc));
    if (!cache.mips) {
      cache.mips = [];
      for (const m of mipPlan()) steps.push(() => { const prev = sc.floor; sc.floor = cache.floor; cache.mips.push(bakeMip(sc, m)); sc.floor = prev; });
    }
    const t0 = performance.now();
    let i = 0;
    const run = () => {
      if (Lg.cancelPrep === sc) return;
      const a = performance.now();
      // vários passos por vez, sem segurar a página mais que ~60 ms
      while (i < steps.length && performance.now() - a < 60) { const b = performance.now(); steps[i++](); if (DL.fpsOn && performance.now() - b > 200) console.log('[lago] passo ' + (i - 1) + ': ' + Math.round(performance.now() - b) + ' ms'); }
      if (performance.now() - t0 > 300 || i < steps.length) bar(i < steps.length, i / steps.length);
      if (i < steps.length) { setTimeout(run, 0); return; }
      bar(false);
      sc.floor = cache.floor; // o chão pronto entra no lugar do chão simples (iso.js copia na próxima vez que desenhar)
      if (DL.fpsOn) console.log('[lago] preparo: ' + Math.round(performance.now() - t0) + ' ms');
      done();
    };
    run();
  };

  /* ------------------------------------------------------------------ */
  /* Desenho com a câmera alta: só drawImage das imagens prontas          */
  /* ------------------------------------------------------------------ */
  function blit(g, sc, m, vx0, vy0, vx1, vy1) {
    const S = sc.S;
    const ix0 = Math.max(vx0, m.X0), iy0 = Math.max(vy0, m.Y0), ix1 = Math.min(vx1, m.X1), iy1 = Math.min(vy1, m.Y1);
    if (ix1 <= ix0 || iy1 <= iy0) return;
    const sx = (ix0 - m.X0) * m.s, sy = (iy0 - m.Y0) * m.s, sw = (ix1 - ix0) * m.s, sh = (iy1 - iy0) * m.s;
    g.drawImage(m.c, sx, sy, sw, sh, Math.round(ix0 * S - sc.ox), Math.round(iy0 * S - sc.oy), Math.round((ix1 - ix0) * S), Math.round((iy1 - iy0) * S));
  }
  const covers = (m, vx0, vy0, vx1, vy1) => m.X0 <= vx0 && m.Y0 <= vy0 && m.X1 >= vx1 && m.Y1 >= vy1;
  Lg.drawAerial = function (g, sc) {
    const S = sc.S, cw = sc.canvas.width, ch = sc.canvas.height, mips = cache.mips;
    const vx0 = sc.ox / S, vy0 = sc.oy / S, vx1 = (sc.ox + cw) / S, vy1 = (sc.oy + ch) / S;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
    // a imagem pronta mais parecida com o zoom de agora (escala de 2 em 2: no máximo 1,4× maior ou menor)
    let best = 0;
    for (let i = 0; i < mips.length; i++) if (Math.abs(Math.log(mips[i].s / S)) < Math.abs(Math.log(mips[best].s / S))) best = i;
    // se ela não cobre a tela toda, por baixo vai a maior que cubra (mais simples)
    if (!covers(mips[best], vx0, vy0, vx1, vy1)) {
      let base = best;
      while (base > 0 && !covers(mips[base], vx0, vy0, vx1, vy1)) base--;
      blit(g, sc, mips[base], vx0, vy0, vx1, vy1);
    }
    blit(g, sc, mips[best], vx0, vy0, vx1, vy1);
  };
  Lg.prepared = () => !!cache.mips && cache.mips.length === mipPlan().length;
})();

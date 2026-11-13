/* Venti Experience — o MENU INICIAL: "Bem-vindo(a) ao Data Experience".

   O jogo abre aqui. Por trás, o mapa do lago é montado escondido (o botão mostra "Carregando…" até
   terminar). Ao apertar Jogar, o título some e as NUVENS do menu se abrem para os lados e para cima:
   são as mesmas nuvens da abertura do filme do lago, que começa a rodar naquele instante.

   Como roda leve:
     - uma tela pequena (uns 360 px de altura), ampliada com pixels nítidos (image-rendering: pixelated)
     - o céu, o título e os 10 modelos de nuvem são pintados UMA vez; cada quadro é só drawImage
     - nada é criado por quadro (as nuvens ficam numa lista fixa)

   Sem menu: ?menu=0 (vai direto ao filme) ou ?mapa=lago / abertura / datalab. */
(function () {
  'use strict';
  const DL = window.DL;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
  const ease = (k) => { k = clamp(k, 0, 1); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }; // suave nas duas pontas
  const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  function rng(seed) { // números "aleatórios" sempre iguais (as nuvens nascem sempre do mesmo jeito)
    let a = seed >>> 0;
    return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]; // pontilhado 4×4 (mistura de duas cores em pixel art)

  const ABRE = 2.5;  // segundos para as nuvens se abrirem
  const SOME = 1.5;  // segundos para o título e o botão sumirem

  /* ------------------------------------------------------------------ */
  /* A fonte pixel (5×7), embutida: não depende de internet              */
  /* ------------------------------------------------------------------ */
  const F = {
    A: '01110/10001/10001/11111/10001/10001/10001', B: '11110/10001/10001/11110/10001/10001/11110',
    C: '01110/10001/10000/10000/10000/10001/01110', D: '11110/10001/10001/10001/10001/10001/11110',
    E: '11111/10000/10000/11110/10000/10000/11111', F: '11111/10000/10000/11110/10000/10000/10000',
    G: '01110/10001/10000/10111/10001/10001/01111', H: '10001/10001/10001/11111/10001/10001/10001',
    I: '01110/00100/00100/00100/00100/00100/01110', J: '00111/00010/00010/00010/00010/10010/01100',
    K: '10001/10010/10100/11000/10100/10010/10001', L: '10000/10000/10000/10000/10000/10000/11111',
    M: '10001/11011/10101/10101/10001/10001/10001', N: '10001/11001/10101/10011/10001/10001/10001',
    O: '01110/10001/10001/10001/10001/10001/01110', P: '11110/10001/10001/11110/10000/10000/10000',
    Q: '01110/10001/10001/10001/10101/10010/01101', R: '11110/10001/10001/11110/10100/10010/10001',
    S: '01111/10000/10000/01110/00001/00001/11110', T: '11111/00100/00100/00100/00100/00100/00100',
    U: '10001/10001/10001/10001/10001/10001/01110', V: '10001/10001/10001/10001/10001/01010/00100',
    W: '10001/10001/10001/10101/10101/11011/10001', X: '10001/10001/01010/00100/01010/10001/10001',
    Y: '10001/10001/01010/00100/00100/00100/00100', Z: '11111/00001/00010/00100/01000/10000/11111',
    '-': '0000/0000/0000/1111/0000/0000/0000', '(': '001/010/100/100/100/010/001', ')': '100/010/001/001/001/010/100',
    '.': '0/0/0/0/0/0/1', ' ': '000/000/000/000/000/000/000',
  };
  for (const k in F) F[k] = F[k].split('/');
  // o texto como uma "máscara" branca, com cada ponto da letra valendo m×m pixels
  function mascara(txt, m) {
    let w = 0;
    for (const ch of txt) w += (F[ch] || F[' '])[0].length + 1;
    const c = mk((w - 1) * m, 7 * m), g = c.getContext('2d');
    g.fillStyle = '#fff';
    let x = 0;
    for (const ch of txt) {
      const gl = F[ch] || F[' '];
      for (let r = 0; r < 7; r++) for (let i = 0; i < gl[r].length; i++) if (gl[r][i] === '1') g.fillRect((x + i) * m, r * m, m, m);
      x += gl[0].length + 1;
    }
    return c;
  }
  // a mesma forma, pintada de uma cor só
  function tinge(src, cor) {
    const c = mk(src.width, src.height), g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = cor;
    g.fillRect(0, 0, c.width, c.height);
    return c;
  }
  // a mesma forma, com uma cor por linha da letra (degradê em faixas)
  function tingeLinhas(src, m, cores) {
    const c = mk(src.width, src.height), g = c.getContext('2d');
    for (let r = 0; r < 7; r++) { g.fillStyle = cores[r]; g.fillRect(0, r * m, c.width, m); }
    g.globalCompositeOperation = 'destination-in'; // fica só onde há letra
    g.drawImage(src, 0, 0);
    return c;
  }
  // só a borda de cima (dy = 1) ou de baixo (dy = -1) das letras
  function borda(src, dy, cor) {
    const c = mk(src.width, src.height), g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'destination-out';
    g.drawImage(src, 0, dy);
    return tinge(c, cor);
  }

  /* ------------------------------------------------------------------ */
  /* O título (pintado uma vez)                                          */
  /* ------------------------------------------------------------------ */
  const OURO = ['#fff3c0', '#fde28a', '#fdd46a', '#fbbd4e', '#f9a83a', '#f48f30', '#f07a2a'];
  const CLARO = ['#fffbe6', '#fff3c0', '#fff3c0', '#fde9a8', '#fde28a', '#fdd46a', '#fbbd4e'];
  const ESCURO = '#2a0f2e';
  // um bloco de texto "em relevo": sombra, contorno escuro, lateral vinho/roxa e a frente dourada
  function bloco(txt, m, cores, d) {
    const mask = mascara(txt, m), P = d + 4;
    const c = mk(mask.width + 2 * P, mask.height + 2 * P), g = c.getContext('2d');
    const dark = tinge(mask, ESCURO), solido = mk(c.width, c.height), sg = solido.getContext('2d');
    for (let dy = -1; dy <= d + 1; dy++) for (let dx = -1; dx <= 1; dx++) sg.drawImage(dark, P + dx, P + dy);
    const so = Math.max(1, Math.round(m * 0.6));
    g.globalAlpha = 0.45;
    g.drawImage(tinge(solido, '#1e1630'), so, so + 1); // sombra pixelada, roxa
    g.globalAlpha = 1;
    g.drawImage(solido, 0, 0);
    const lado1 = tinge(mask, '#a8323e'), lado2 = tinge(mask, '#682a52');
    for (let dy = d; dy >= 1; dy--) g.drawImage(dy * 2 > d ? lado2 : lado1, P, P + dy);
    g.drawImage(tingeLinhas(mask, m, cores), P, P);
    if (m >= 3) { g.drawImage(borda(mask, 1, '#fffbe6'), P, P); g.drawImage(borda(mask, -1, '#d8602a'), P, P); }
    return { c, P, luz: tinge(mask, '#fffbe6'), w: mask.width, h: mask.height };
  }
  const tit = { base: null, brilho: null, luz: null, w: 0, h: 0, m: 1, pts: null };
  function fazTitulo(L) {
    const m = L.m, ms = Math.max(1, Math.round(m / 2));
    const bl = [bloco('BEM-VINDO(A) AO', ms, CLARO, Math.max(1, Math.round(ms * 0.5)))];
    for (const t of L.linhas) bl.push(bloco(t, m, OURO, Math.max(2, Math.round(m * 0.8))));
    const G = m + 6, junta = 5; // G: espaço para o brilho em volta; os blocos encostam um pouco
    let w = 0, h = 0;
    for (const b of bl) { w = Math.max(w, b.c.width); h += b.c.height - junta; }
    w += 2 * G; h += junta + 2 * G;
    const base = mk(w, h), bg = base.getContext('2d'), luz = mk(w, h), lg = luz.getContext('2d');
    const pts = [];
    let y = G;
    bl.forEach((b, i) => {
      const x = Math.round((w - b.c.width) / 2);
      bg.drawImage(b.c, x, y);
      lg.drawImage(b.luz, x + b.P, y + b.P);
      if (i > 0) { // estrelinhas de luz nas pontas das letras grandes
        const x0 = x + b.P, y0 = y + b.P;
        pts.push(x0 - 3, y0 - 2, i * 2.1, x0 + b.w + 2, y0 + 1, i * 2.1 + 1.7, x0 + b.w * 0.31, y0 - 3, i * 2.1 + 3.3, x0 + b.w * 0.72, y0 + b.h + 3, i * 2.1 + 4.6);
      }
      y += b.c.height - junta;
    });
    // o brilho suave em volta (a forma do título repetida em roda, bem transparente)
    const brilho = mk(w, h), gg = brilho.getContext('2d'), sil = tinge(base, '#f9a83a'), R = G - 1;
    gg.globalAlpha = 0.022;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) if (dx * dx + dy * dy <= R * R) gg.drawImage(sil, dx, dy);
    Object.assign(tit, { base, brilho, luz, w, h, m, pts: new Float32Array(pts.map((v, i) => (i % 3 === 2 ? v : Math.round(v)))) });
  }
  // A CADA QUADRO: brilho pulsando, o título, o risco de luz passando e as estrelinhas
  function desenhaTitulo(g, t) {
    const w = tit.w, h = tit.h;
    g.clearRect(0, 0, w, h);
    g.globalAlpha = 0.6 + 0.3 * Math.sin(t * 1.7);
    g.drawImage(tit.brilho, 0, 0);
    g.globalAlpha = 1;
    g.drawImage(tit.base, 0, 0);
    // o risco de luz: uma faixa inclinada que atravessa as letras a cada 4 s
    const k = (t % 4) / 1.1;
    if (k < 1) {
      const bw = tit.m * 3, bx = -bw * 3 + k * (w + h * 0.6 + bw * 6);
      for (let y = 0; y < h; y += 2) {
        const sx = Math.round(bx - y * 0.6);
        if (sx >= 0 && sx + bw <= w) { g.globalAlpha = 0.85; g.drawImage(tit.luz, sx, y, bw, 2, sx, y, bw, 2); }
        const s2 = sx - bw * 2;
        if (s2 >= 0 && s2 + tit.m <= w) { g.globalAlpha = 0.5; g.drawImage(tit.luz, s2, y, tit.m, 2, s2, y, tit.m, 2); }
      }
      g.globalAlpha = 1;
    }
    g.fillStyle = '#fff3c0';
    const p = tit.pts;
    for (let i = 0; i < p.length; i += 3) {
      const a = Math.sin(t * 2.3 + p[i + 2]);
      if (a < 0.55) continue;
      const r = a > 0.9 ? 2 : 1, x = p[i], y = p[i + 1];
      g.fillRect(x - r, y, 2 * r + 1, 1);
      g.fillRect(x, y - r, 1, 2 * r + 1);
    }
  }

  /* ------------------------------------------------------------------ */
  /* O céu do pôr do sol (pintado uma vez)                               */
  /* ------------------------------------------------------------------ */
  const CEU = ['#1e1630', '#3a1e48', '#682a52', '#a8323e', '#d8502e', '#f07a2a', '#f9a83a', '#fdd46a', '#fff3c0'].map(rgb);
  function fazCeu(W, H) {
    const c = mk(W, H), g = c.getContext('2d'), img = g.createImageData(W, H), d = img.data;
    const sx = W * 0.5, sy = H * 0.47; // o sol fica atrás das nuvens, no meio
    for (let y = 0, o = 0; y < H; y++) {
      const yn = y / H, basey = yn < 0.5 ? 1.7 + 3.5 * (yn / 0.5) : 5.2 - 3.0 * ((yn - 0.5) / 0.5);
      for (let x = 0; x < W; x++, o += 4) {
        const dx = (x - sx) / (H * 0.95), dy = (y - sy) / (H * 0.6);
        const v = basey + 3.6 * Math.exp(-(dx * dx + dy * dy) * 2.4);
        const col = CEU[clamp(Math.floor(v + 0.5 + (BAYER[(x & 3) + (y & 3) * 4] / 16 - 0.5) * 0.6), 0, 8)];
        d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    const out = mk(W, H); // cópia: a tela lida/escrita pixel a pixel fica lenta para desenhar
    out.getContext('2d').drawImage(c, 0, 0);
    return out;
  }

  // o clarão do sol, somado por cima das nuvens de trás (o sol brilha "por trás" delas); pintado uma vez
  function fazClarao(W, H) {
    const c = mk(W, H), g = c.getContext('2d'), img = g.createImageData(W, H), d = img.data;
    const sx = W * 0.5, sy = H * 0.47;
    for (let y = 0, o = 0; y < H; y++) for (let x = 0; x < W; x++, o += 4) {
      const dx = (x - sx) / (H * 0.8), dy = (y - sy) / (H * 0.5);
      const v = Math.exp(-(dx * dx + dy * dy) * 2.6) * 5 + (BAYER[(x & 3) + (y & 3) * 4] / 16 - 0.5) * 0.7;
      const k = clamp(Math.floor(v), 0, 4); // 5 degraus
      d[o] = 255; d[o + 1] = 190; d[o + 2] = 90; d[o + 3] = k * 21;
    }
    g.putImageData(img, 0, 0);
    const out = mk(W, H);
    out.getContext('2d').drawImage(c, 0, 0);
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* As nuvens: 10 modelos pintados uma vez (e espelhados)               */
  /* ------------------------------------------------------------------ */
  // cores de cada camada, do topo claro à barriga (longe = mais dourada e leve; perto = rosa e roxa)
  const PALETAS = [
    ['#fdeab0', '#f9c670', '#f2a04c', '#e2763a', '#c4503c'],
    ['#fff3c0', '#fdd46a', '#f6a060', '#e06a6a', '#a83a54'],
    ['#fff6d2', '#f8d8a8', '#f09a7a', '#c8546e', '#74305c'],
    ['#f8e4c4', '#eaa890', '#c05a78', '#7a2e5e', '#3a1e48'],
  ].map((p) => p.map(rgb));
  // [largura, altura, camada]
  const MODELOS = [[58, 22, 1], [74, 27, 1], [90, 34, 1], [106, 38, 1], [122, 41, 1], [134, 50, 2], [152, 55, 2], [172, 60, 2], [228, 84, 3], [262, 94, 3]];
  function fazNuvem(seed, w, h, pal) {
    const r = rng(seed), base = h * 0.76, cs = [];
    const n = 5 + Math.floor(r() * 3) + (w > 140 ? 2 : 0);
    // bolas lado a lado (maiores no meio), todas apoiadas na mesma base reta
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n + (r() - 0.5) * 0.06, meio = 1 - Math.abs(u - 0.5) * 2;
      let rad = h * (0.17 + 0.24 * meio * (0.55 + 0.45 * r()));
      const cx = w * (0.1 + u * 0.8), kk = 0.35 + 0.6 * r() * meio;
      rad = Math.min(rad, cx - 1, w - 1 - cx, (base - 1) / (1 + kk));
      cs.push([cx, base - rad * kk, rad]);
    }
    // bolinhas menores em cima das grandes (o topo encaroçado)
    for (let i = 0; i < n; i++) {
      const b = cs[Math.floor(r() * n)], a = Math.PI * (0.2 + 0.6 * r()), rad = b[2] * (0.4 + 0.25 * r());
      const cx = b[0] + Math.cos(a) * b[2] * 0.8, cy = b[1] - Math.sin(a) * b[2] * 0.75;
      if (cx - rad > 1 && cx + rad < w - 1 && cy - rad > 1) cs.push([cx, cy, rad]);
    }
    cs.sort((a, b) => a[1] - b[1]); // as de baixo ficam na frente
    const dentro = new Uint8Array(w * h), tom = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (y > base + 1.5 + 1.5 * Math.sin(x * 0.21 + seed)) continue; // a barriga quase reta
      let t = -1;
      for (const c of cs) { const dx = x - c[0], dy = y - c[1]; if (dx * dx + dy * dy <= c[2] * c[2]) t = (y - (c[1] - c[2])) / (2 * c[2]) - (0.1 * dx) / c[2]; }
      if (t < 0 && t !== -1) t = 0;
      if (t === -1) continue;
      dentro[y * w + x] = 1;
      tom[y * w + x] = 0.58 * t + 0.42 * (y / base);
    }
    const c = mk(w, h), g = c.getContext('2d'), img = g.createImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!dentro[i]) continue;
      const f = tom[i] + (BAYER[(x & 3) + (y & 3) * 4] / 16 - 0.5) * 0.09;
      let k = f < 0.24 ? 0 : f < 0.46 ? 1 : f < 0.66 ? 2 : f < 0.84 ? 3 : 4;
      if (y === 0 || !dentro[i - w]) k = 0; // o fio de luz no topo
      const col = pal[k], o = i * 4;
      d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const out = mk(w, h), og = out.getContext('2d'), inv = mk(w, h), ig = inv.getContext('2d');
    og.drawImage(c, 0, 0);
    ig.translate(w, 0); ig.scale(-1, 1); ig.drawImage(c, 0, 0);
    return [out, inv];
  }
  let SPR = null; // por camada: lista de imagens
  function fazNuvens() {
    SPR = [[], [], [], []];
    MODELOS.forEach(([w, h, l], i) => {
      for (const s of fazNuvem(i * 37 + 11, w, h, PALETAS[l])) SPR[l].push(s);
      // o "tapete" do fundo usa os 3 modelos maiores, na cor dourada de quem está longe
      if (i >= 7) for (const s of fazNuvem(i * 37 + 11, w, h, PALETAS[0])) SPR[0].push(s);
    });
  }
  // onde fica cada nuvem (lista fixa; cada camada anda numa velocidade)
  const VEL = [2, 4.5, 7.5, 12], QTD = [0, 40, 18, 10], ATRASO = [0.3, 0.2, 0.1, 0];
  const E = [0, 0, 0, 0];
  let NUV = [], CORTE = 0; // CORTE: onde começam as camadas da frente (o clarão do sol entra antes delas)
  function espalha(W, H) {
    NUV = [];
    const area = clamp((W * H) / (640 * 360), 0.45, 2.2), r = rng(77);
    // camada 0: o tapete de nuvens que cobre a tela inteira (fileiras bem juntas, todas na mesma velocidade)
    const PASSO = 104, FILEIRA = 30, cols = Math.ceil((W + 270) / PASSO), tapete = [];
    for (let j = -1; j * FILEIRA < H + 20; j++) for (let i = 0; i < cols; i++) {
      const img = SPR[0][Math.floor(r() * SPR[0].length)];
      tapete.push({ img, w: img.width, h: img.height, l: 0, x: (i + (j & 1) * 0.5 + r() * 0.3) * PASSO - 270, y: j * FILEIRA + r() * 10 - img.height * 0.55, ph: r() * 6.28, vao: cols * PASSO, lim: cols * PASSO - 270, v: VEL[0], dist: 0, sx: 0, dy: 0 });
    }
    tapete.sort((a, b) => a.y + a.h - (b.y + b.h));
    for (const c of tapete) NUV.push(c);
    for (let l = 1; l < 4; l++) {
      const imgs = SPR[l], n = Math.max(4, Math.round(QTD[l] * area)), vao = W + 270, fila = [];
      for (let i = 0; i < n; i++) {
        const img = imgs[Math.floor(r() * imgs.length)];
        let yc = H * ((i * 0.618 + r() * 0.12) % 1) * 1.06 - H * 0.03;
        // a camada da frente fica só nas bordas de cima e de baixo (emoldura o título)
        if (l === 3) yc = i % 3 === 0 ? H * (0.02 + r() * 0.08) : H * (0.86 + r() * 0.14);
        fila.push({ img, w: img.width, h: img.height, l, x: ((i + r() * 0.7) / n) * vao - 270, y: yc - img.height / 2, ph: r() * 6.28, vao, lim: W, v: VEL[l] * (0.85 + r() * 0.3), dist: 0, sx: 0, dy: 0 });
      }
      fila.sort((a, b) => a.y + a.h - (b.y + b.h));
      if (l === 2) CORTE = NUV.length;
      for (const c of fila) NUV.push(c);
    }
  }

  /* ------------------------------------------------------------------ */
  /* A tela do menu                                                      */
  /* ------------------------------------------------------------------ */
  let root = null, cv = null, g = null, tcv = null, tg = null, btn = null, lab = null, ceu = null, clarao = null;
  let W = 0, H = 0, S = 1, estado = 'fechado', t = 0, tt = 0, ant = 0, raf = 0;

  // o tamanho da tela pequena (S = quantos pixels da página vale cada pixel do menu) e do título
  function medidas() {
    const vw = Math.max(200, window.innerWidth), vh = Math.max(200, window.innerHeight);
    for (let s = Math.max(1, Math.round(vh / 360)); ; s--) {
      const w = Math.ceil(vw / s), h = Math.ceil(vh / s);
      const cabe = (cols, linhas) => Math.min(6, Math.floor((w * 0.8) / (cols * 6 - 1)), Math.floor((h * 0.3) / (8 * linhas)));
      let m = cabe(15, 1), linhas = ['DATA EXPERIENCE'];
      const m2 = cabe(10, 2);
      if (m < 2 || (h > w && m2 > m)) { m = m2; linhas = ['DATA', 'EXPERIENCE']; } // janela estreita: duas linhas
      if (m >= 2 || s === 1) return { s, w, h, m: Math.max(1, m), linhas };
    }
  }
  function rotulo(txt, m, cor, luz) {
    const mask = mascara(txt, m);
    lab.width = mask.width; lab.height = mask.height + 1;
    const lg = lab.getContext('2d');
    lg.drawImage(tinge(mask, luz), 0, 1);
    lg.drawImage(tinge(mask, cor), 0, 0);
    lab.style.width = lab.width * S + 'px';
    lab.style.height = lab.height * S + 'px';
  }
  function botao() {
    const pronto = estado !== 'carrega';
    btn.disabled = !pronto;
    btn.setAttribute('aria-label', pronto ? 'Jogar' : 'Carregando…');
    if (pronto) rotulo('JOGAR', 2, '#3a1230', '#fff3c0');
    else rotulo('CARREGANDO...', 1, '#e8cfd0', '#2a0f2e');
  }
  function monta() {
    const L = medidas();
    S = L.s; W = L.w; H = L.h;
    cv.width = W; cv.height = H;
    cv.style.width = W * S + 'px'; cv.style.height = H * S + 'px';
    g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    root.style.setProperty('--px', S + 'px');
    ceu = fazCeu(W, H);
    clarao = fazClarao(W, H);
    fazTitulo(L);
    tcv.width = tit.w; tcv.height = tit.h;
    tcv.style.width = tit.w * S + 'px'; tcv.style.height = tit.h * S + 'px';
    tg = tcv.getContext('2d');
    tg.imageSmoothingEnabled = false;
    espalha(W, H);
    if (estado === 'abre') destinos();
    botao();
  }
  // para onde cada nuvem vai quando o menu abre: do meio para os lados, e as de cima também sobem
  function destinos() {
    for (const c of NUV) {
      const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
      c.sx = cx >= W / 2 ? 1 : -1;
      // cada uma anda exatamente o que falta para sair da tela: o vão do meio cresce durante toda a abertura
      c.dist = (c.sx > 0 ? W - c.x : c.x + c.w) + 6;
      c.dy = -clamp(1 - cy / (H * 0.6), 0, 1) * H * 0.55 + clamp((cy - H * 0.6) / (H * 0.4), 0, 1) * H * 0.15;
    }
  }

  function quadro(now) {
    if (estado === 'fechado') return;
    const dt = clamp((now - ant) / 1000 || 0, 0, 0.05);
    ant = now;
    t += dt;
    if (estado === 'carrega' && DL.Lago && DL.Lago.state && DL.Lago.state.ready) { estado = 'pronto'; botao(); }
    const abre = estado === 'abre';
    let ceuA = 1;
    if (abre) {
      tt += dt;
      if (tt >= ABRE) { fecha(); return; }
      ceuA = 1 - smooth(0.15, 1.3, tt); // o céu do menu some e dá lugar ao céu do filme
      for (let l = 0; l < 4; l++) E[l] = ease((tt - ATRASO[l]) / (ABRE - ATRASO[l]));
      g.clearRect(0, 0, W, H);
    }
    if (ceuA > 0) { g.globalAlpha = ceuA; g.drawImage(ceu, 0, 0); g.globalAlpha = 1; }
    for (let i = 0; i < NUV.length; i++) {
      if (i === CORTE && ceuA > 0) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = ceuA; g.drawImage(clarao, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
      const c = NUV[i];
      c.x += c.v * dt;
      if (!abre && c.x > c.lim) c.x -= c.vao;
      const e = abre ? E[c.l] : 0;
      const x = Math.round(c.x + c.sx * c.dist * e), y = Math.round(c.y + Math.sin(t * 0.5 + c.ph) * 1.5 + c.dy * e);
      if (x >= W || x + c.w <= 0 || y >= H || y + c.h <= 0) continue;
      g.drawImage(c.img, x, y);
    }
    if (!abre || tt < SOME) desenhaTitulo(tg, t);
    raf = requestAnimationFrame(quadro);
  }

  function jogar() {
    if (estado !== 'pronto') return;
    estado = 'abre';
    tt = 0;
    destinos();
    root.classList.add('is-leaving');
    btn.classList.add('is-down');
    btn.blur();
    DL.menuEspera = false;
    const Lg = DL.Lago;
    if (Lg && Lg.state) Lg.state.espera = false; // o filme do lago começa agora
    if (Lg && Lg.som && Lg.som.clique) Lg.som.clique(); // o clique também liga o som (regra do navegador)
  }
  function fecha() {
    estado = 'fechado';
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', tecla, true);
    window.removeEventListener('resize', monta);
    document.body.classList.remove('menu-on');
    root.remove();
    root = cv = g = tcv = tg = btn = lab = ceu = clarao = null;
    NUV = []; SPR = null;
  }
  // enquanto o menu está na tela o teclado é dele (senão Enter/Espaço pulariam o filme por trás)
  function tecla(ev) {
    ev.stopImmediatePropagation();
    if (ev.code === 'Enter' || ev.code === 'NumpadEnter' || ev.code === 'Space') {
      ev.preventDefault();
      if (!ev.repeat) jogar();
    }
  }

  DL.Menu = {
    abrir() {
      if (root) return;
      estado = 'carrega';
      DL.menuEspera = true; // o lago (lago.js) monta tudo e segura o filme no começo
      root = document.createElement('div');
      root.id = 'menu';
      root.className = 'menu';
      root.innerHTML = '<canvas class="menu__ceu" aria-hidden="true"></canvas>' +
        '<div class="menu__ui"><h1 class="menu__titulo" aria-label="Bem-vindo(a) ao Data Experience"><canvas aria-hidden="true"></canvas></h1>' +
        '<button class="menu__btn" type="button" disabled><canvas aria-hidden="true"></canvas></button></div>';
      document.body.appendChild(root);
      document.body.classList.add('menu-on');
      cv = root.querySelector('.menu__ceu');
      tcv = root.querySelector('.menu__titulo canvas');
      btn = root.querySelector('.menu__btn');
      lab = btn.querySelector('canvas');
      btn.addEventListener('click', jogar);
      fazNuvens();
      monta();
      window.addEventListener('keydown', tecla, true);
      window.addEventListener('resize', monta);
      ant = performance.now();
      raf = requestAnimationFrame(quadro);
    },
    get aberto() { return estado !== 'fechado'; },
  };
})();

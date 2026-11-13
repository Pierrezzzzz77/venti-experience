/* Venti Experience — arte compartilhada (pixel art desenhada por código, usada pela viagem e pela rua):
     DL.Arte.text / textW    letreiros com uma fonte de pixels 3 × 5
     DL.Arte.disc / oval     bolas e ovais de pixels
     DL.Arte.brasao          o escudo com a folha da Faculdade Serra Dourada
     DL.Arte.serra()         a FRENTE da faculdade, vista de frente (foto 16): { base, luz, w, h, porta }
     DL.Arte.metal(w, h)     um pedaço da parede de metal ondulado (para as laterais)
   "base" é o prédio sem luz; "luz" é só o que acende (letreiro, recepção, marquise) — cada cena escurece
   a base do seu jeito e soma a luz por cima. */
(function () {
  'use strict';
  const DL = window.DL, R = DL.R;

  function disc(g, cx, cy, r, col) {
    for (let dy = -r; dy <= r; dy++) { const w = Math.round(Math.sqrt(r * r - dy * dy)); R(g, cx - w, cy + dy, 2 * w + 1, 1, col); }
  }
  function oval(g, cx, cy, rx, ry, col) {
    for (let dy = -ry; dy <= ry; dy++) { const w = Math.round(rx * Math.sqrt(1 - (dy * dy) / (ry * ry))); R(g, cx - w, cy + dy, 2 * w + 1, 1, col); }
  }

  const FONT = {
    A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'], C: ['.##', '#..', '#..', '#..', '.##'], D: ['##.', '#.#', '#.#', '#.#', '##.'],
    E: ['###', '#..', '##.', '#..', '###'], F: ['###', '#..', '##.', '#..', '#..'], G: ['.##', '#..', '#.#', '#.#', '.##'], H: ['#.#', '#.#', '###', '#.#', '#.#'],
    I: ['###', '.#.', '.#.', '.#.', '###'], J: ['..#', '..#', '..#', '#.#', '.#.'], K: ['#.#', '#.#', '##.', '#.#', '#.#'], L: ['#..', '#..', '#..', '#..', '###'],
    M: ['#.#', '###', '###', '#.#', '#.#'], N: ['#.#', '###', '###', '###', '#.#'], O: ['###', '#.#', '#.#', '#.#', '###'], P: ['##.', '#.#', '##.', '#..', '#..'],
    Q: ['###', '#.#', '#.#', '###', '..#'], R: ['##.', '#.#', '##.', '#.#', '#.#'], S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'],
    U: ['#.#', '#.#', '#.#', '#.#', '###'], V: ['#.#', '#.#', '#.#', '#.#', '.#.'], X: ['#.#', '#.#', '.#.', '#.#', '#.#'], Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
    Z: ['###', '..#', '.#.', '#..', '###'], '.': ['...', '...', '...', '...', '.#.'], '-': ['...', '...', '###', '...', '...'],
    W: ['#.#', '#.#', '###', '###', '#.#'], '3': ['##.', '..#', '.#.', '..#', '##.'], '5': ['###', '#..', '##.', '..#', '##.'],
    '6': ['.##', '#..', '###', '#.#', '###'], '7': ['###', '..#', '.#.', '.#.', '.#.'], '8': ['###', '#.#', '###', '#.#', '###'], '9': ['###', '#.#', '###', '..#', '##.'],
    ',': ['...', '...', '...', '.#.', '#..'], '>': ['#..', '.#.', '..#', '.#.', '#..'], '<': ['..#', '.#.', '#..', '.#.', '..#'],
    '2': ['##.', '..#', '.#.', '#..', '###'], '4': ['#.#', '#.#', '###', '..#', '..#'], '1': ['.#.', '##.', '.#.', '.#.', '###'], '0': ['###', '#.#', '#.#', '#.#', '###'],
  };
  const SEM_ACENTO = { 'Ã': 'A', 'Á': 'A', 'Ç': 'C', 'Í': 'I', 'É': 'E', 'Ó': 'O' };
  // escreve em pixels; k = tamanho do pixel; Ã e Á ganham o acento por cima, Ç a cedilha
  function text(g, str, x, y, k, col) {
    for (const ch of str) {
      const rows = FONT[SEM_ACENTO[ch] || ch];
      if (rows) rows.forEach((row, j) => { for (let i = 0; i < 3; i++) if (row[i] === '#') R(g, x + i * k, y + j * k, k, k, col); });
      if (ch === 'Ã') { R(g, x, y - 2 * k, k, k, col); R(g, x + k, y - 3 * k, k, k, col); R(g, x + 2 * k, y - 2 * k, k, k, col); }
      if (ch === 'Á' || ch === 'Í' || ch === 'É' || ch === 'Ó') { R(g, x + k, y - 2 * k, k, k, col); R(g, x + 2 * k, y - 3 * k, k, k, col); }
      if (ch === 'Ç') R(g, x + k, y + 5 * k, k, k, col);
      x += 4 * k;
    }
  }
  const textW = (str, k) => str.length * 4 * k - k;

  // o brasão: escudo (contorno grosso) com a folha no meio; s = tamanho do pixel
  function brasao(g, x, y, s, c) {
    const W = 15, H = 19, px = (i, j, w, h) => R(g, x + i * s, y + j * s, (w || 1) * s, (h || 1) * s, c);
    px(0, 0, W, 1); px(0, 0, 1, 12); px(W - 1, 0, 1, 12);
    for (let i = 0; i <= 7; i++) { const j = 12 + Math.round((i * 6) / 7); px(i, j, 1, 2); px(W - 1 - i, j, 1, 2); }
    // a folha: uma amêndoa com a nervura no meio e veios para os lados
    for (let j = 0; j <= 11; j++) { const w = Math.round(3.6 * Math.sin((Math.PI * (j + 0.5)) / 12)); px(7 - w, 3 + j); px(7 + w, 3 + j); }
    px(7, 2, 1, 15);
    for (const j of [6, 9, 12]) { px(5, j); px(6, j + 1); px(9, j); px(8, j + 1); }
    // as "montanhas" embaixo da folha
    for (let i = 2; i <= 12; i++) px(i, 15 - Math.round(1.5 * Math.abs(Math.sin((i - 2) * 0.63))), 1, 1);
  }

  // parede de metal ondulado (nervuras verticais de 2 px), com a luz vindo de cima
  function metal(g, x, y, w, h, escura) {
    const a = escura ? '#8d95a2' : '#b9c1cc', b = escura ? '#737b88' : '#99a2b0', c = escura ? '#a2aab6' : '#d3d9e1';
    for (let i = 0; i < w; i++) R(g, x + i, y, 1, h, i % 4 === 0 ? c : i % 4 === 2 ? b : a);
    R(g, x, y, w, 1, '#e8ecf1');
    R(g, x, y + h - 1, w, 1, escura ? '#5f6672' : '#7f8794');
  }

  /* ------------------------------------------------------------------ */
  /* A frente da Faculdade Serra Dourada (foto 16), de frente             */
  /* ------------------------------------------------------------------ */
  const SW = 216, SH = 120, ALTO = 66, MARQ = 11; // largura, altura, o volume de metal e a marquise
  let SERRA = null;
  function serra() {
    if (SERRA) return SERRA;
    const base = DL.mk(SW, SH), g = base.getContext('2d'), luz = DL.mk(SW, SH), q = luz.getContext('2d');
    const x0 = 6, w = SW - 12, y1 = ALTO, yt = ALTO + MARQ, chao = SH - 2;
    /* volume de cima: metal prata */
    metal(g, x0, 0, w, ALTO, false);
    R(g, x0, 0, w, 2, '#eef1f5');
    /* térreo: parede lisa cinza-claro */
    R(g, x0 + 2, yt, w - 4, chao - yt, '#d3d6da');
    R(g, x0 + 2, yt, w - 4, 3, '#a9adb4');                 // sombra da marquise
    R(g, x0 + 2, chao - 3, w - 4, 3, '#b4b8be');           // rodapé
    for (let i = 0; i < 3; i++) R(g, x0 + 2, yt + 12 + i * 9, w - 4, 1, '#c6c9ce'); // juntas do revestimento
    /* a porta de vidro de correr (4 folhas, caixilho prata) com a recepção lá dentro */
    const dx = x0 + 26, dw = 96, dy = yt + 5, dh = chao - dy;
    R(g, dx - 2, dy - 2, dw + 4, dh + 2, '#9aa3b0');
    R(g, dx, dy, dw, dh, '#3a3f48');                         // lá dentro, apagado
    // recepção: parede clara, painel de madeira com o logo, balcão
    R(g, dx, dy, dw, dh, '#6b6f78');
    R(g, dx + 40, dy + 2, 40, dh - 2, '#8a4a2a');
    for (let i = 0; i < 40; i += 4) R(g, dx + 40 + i, dy + 2, 1, dh - 2, '#74401f');
    R(g, dx + 8, dy + dh - 13, 26, 13, '#c9ccd1'); R(g, dx + 8, dy + dh - 13, 26, 2, '#e9ecef'); // balcão
    R(g, dx, dy + dh - 3, dw, 3, '#55585f');                 // piso
    // caixilhos
    for (const fx of [0, 24, 48, 72, dw - 1]) R(g, dx + fx, dy, fx === 48 ? 2 : 1, dh, '#c8ced6');
    R(g, dx, dy, dw, 1, '#c8ced6'); R(g, dx, dy + 6, dw, 1, '#aeb5bf');
    R(g, dx + 45, dy + 18, 1, 6, '#e9ecef'); R(g, dx + 52, dy + 18, 1, 6, '#e9ecef'); // puxadores
    g.fillStyle = 'rgba(190,215,235,0.16)'; g.fillRect(dx, dy, dw, dh);               // o vidro
    for (const fx of [5, 29, 55, 78]) { g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(dx + fx, dy + 8, 2, dh - 14); }
    /* à direita: pilar, vidraça lateral com plantas, câmeras */
    const vx = x0 + 150, vw2 = w - 150 - 4;
    R(g, vx - 6, yt, 6, chao - yt, '#c2c5ca'); R(g, vx - 6, yt, 1, chao - yt, '#e4e6ea');
    R(g, vx, dy, vw2, dh - 6, '#59606b'); R(g, vx, dy, vw2, 1, '#c8ced6'); R(g, vx + (vw2 >> 1), dy, 1, dh - 6, '#c8ced6');
    g.fillStyle = 'rgba(190,215,235,0.18)'; g.fillRect(vx, dy, vw2, dh - 6);
    R(g, vx, chao - 6, vw2, 6, '#b4b8be');
    for (let k = 0; k < 5; k++) { // plantas na frente da vidraça
      const px = vx + 4 + k * 10, h = 9 + (k * 5) % 6;
      for (let i = -3; i <= 3; i++) R(g, px + i, chao - 4 - h + Math.abs(i) * 2, 1, h - Math.abs(i) * 2, i % 2 ? '#3c7a46' : '#2f6238');
      R(g, px, chao - 5 - h, 1, 3, '#5f9d58');
    }
    R(g, vx - 16, yt + 4, 5, 3, '#eef1f5'); R(g, vx - 12, yt + 5, 2, 2, '#2a2f38'); // câmeras de segurança
    R(g, vx - 3, yt + 4, 5, 3, '#eef1f5'); R(g, vx - 3, yt + 5, 2, 2, '#2a2f38');
    R(g, x0 + 10, yt + 14, 9, 12, '#e9ecef'); R(g, x0 + 11, yt + 16, 7, 1, '#7d8590'); R(g, x0 + 11, yt + 19, 5, 1, '#7d8590'); // plaquinha
    /* a marquise de madeira, curva nas pontas, saindo para fora da parede */
    for (let j = 0; j < MARQ; j++) {
      const rec = j < 2 ? 2 - j : j > MARQ - 3 ? j - (MARQ - 3) : 0; // pontas arredondadas
      R(g, rec, y1 + j, SW - rec * 2, 1, j < 2 ? '#e58a4e' : j < MARQ - 3 ? '#c9662f' : '#8f4520');
    }
    for (let i = 8; i < SW - 4; i += 13) R(g, i, y1 + 2, 1, MARQ - 5, '#b55a28'); // tábuas
    R(g, 2, y1 + MARQ, SW - 4, 1, 'rgba(0,0,0,0.35)');
    /* calçada (só a linha do chão) */
    R(g, 0, chao, SW, 2, '#8e8a84');

    /* ---- o que acende ---- */
    // letreiro: brasão + nome, em branco (de dia também aparece: branco com uma sombra no metal)
    const lx = x0 + 34, branco = '#f6f8fb';
    for (const [ox, oy, cc] of [[1, 1, '#6a727e'], [0, 0, '#e9edf2']]) {
      brasao(g, lx + ox, 9 + oy, 2, cc);
      text(g, 'FACULDADE', lx + 38 + ox, 8 + oy, 2, cc); text(g, 'SERRA', lx + 38 + ox, 21 + oy, 3, cc); text(g, 'DOURADA', lx + 38 + ox, 38 + oy, 3, cc);
      text(g, 'CANAÃ DOS CARAJÁS', lx + 38 + ox, 57 + oy, 1, cc);
    }
    brasao(q, lx, 9, 2, branco);
    text(q, 'FACULDADE', lx + 38, 8, 2, branco);
    text(q, 'SERRA', lx + 38, 21, 3, branco);
    text(q, 'DOURADA', lx + 38, 38, 3, branco);
    text(q, 'CANAÃ DOS CARAJÁS', lx + 38, 57, 1, branco);
    // recepção acesa: parede quente, painel de madeira claro com o logo, luminárias redondas
    q.fillStyle = '#f3d6ac'; q.fillRect(dx + 1, dy + 1, dw - 2, dh - 4);
    q.fillStyle = '#c9783e'; q.fillRect(dx + 40, dy + 2, 40, dh - 5);
    for (let i = 0; i < 40; i += 4) R(q, dx + 40 + i, dy + 2, 1, dh - 5, '#b06530');
    brasao(q, dx + 52, dy + 6, 1, '#fff6e6');
    text(q, 'SERRA', dx + 49, dy + 27, 1, '#fff6e6');
    R(q, dx + 8, dy + dh - 13, 26, 10, '#fbeed6'); R(q, dx + 8, dy + dh - 13, 26, 2, '#ffffff');
    R(q, dx + 14, dy + dh - 20, 5, 7, '#5a4030'); disc(q, dx + 16, dy + dh - 23, 2, '#c98e66'); // a recepcionista
    for (const fx of [10, 22, 34]) { disc(q, dx + fx, dy + 5, 1, '#fffbe8'); }
    R(q, dx, dy + dh - 3, dw, 3, '#d9b98c');
    for (const fx of [0, 24, 48, 72, dw - 1]) R(q, dx + fx, dy, fx === 48 ? 2 : 1, dh, '#e6dccb');
    R(q, dx, dy + 6, dw, 1, '#e6dccb');
    // vidraça lateral acesa (as plantas ficam em silhueta)
    q.fillStyle = '#eccf9f'; q.fillRect(vx + 1, dy + 1, vw2 - 2, dh - 13);
    R(q, vx + (vw2 >> 1), dy, 1, dh - 12, '#e6dccb');
    // fio de luz embaixo da marquise
    for (let i = 14; i < SW - 10; i += 18) R(q, i, y1 + MARQ, 3, 1, '#fff1cf');
    SERRA = { base, luz, w: SW, h: SH, porta: dx + dw / 2, chao, alto: ALTO, marq: MARQ };
    return SERRA;
  }

  DL.Arte = { disc, oval, text, textW, brasao, metal, serra, FONT };
})();

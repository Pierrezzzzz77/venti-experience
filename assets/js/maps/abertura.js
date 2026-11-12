/* Venti Experience — Parte 1: cena de abertura (o jogador só assiste, ~37 s, botão "Pular").
   Do Lago da Prefeitura até a Faculdade Serra Dourada, em Canaã dos Carajás, de carro.
   Vista de lado (como um filme): o carro anda da esquerda para a direita e a câmera acompanha.
   Tudo é pixel art desenhada por código num canvas pequeno e depois ampliada (sem imagens).
   O céu vai do pôr do sol (laranja e rosa) até a noite; as luzes acendem no caminho.

   Ordem (referências em referencia/):
     1. Lago da Prefeitura ao pôr do sol, avenida com canteiro, árvores e pessoas  (01-lago...)
        com o prédio da Prefeitura / Centro Administrativo do outro lado do lago     (08)
     2. O boneco entra no carro e o carro sai pela avenida
     3. Academia Sky Fit na PA-160 / Av. Weyne Cavalcante, só cenário            (02, 03)
     4. Rotatória com árvore no meio                                              (04)
     5. Av. Carajás: avenida reta com canteiro e árvores                          (05)
     6. Faculdade Serra Dourada: metal ondulado, letreiro, entrada de vidro       (06, 07)
     7. O carro para, o boneco desce e o jogo troca de mapa

   Usa só o que o motor já tem: o registro de mapas (world.js), a troca de mapa (game.loadMap)
   e o desenho do personagem (sprites.js: DL.makeSheet). A cena desenha por cima do mundo com
   scene.drawInstead (o mesmo gancho do iso.js que o DataLab usa para a rua). */
(function () {
  'use strict';
  const DL = window.DL, R = DL.R, hash = DL.hash, CH = DL.CHAR;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
  const rgbOf = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  // mistura duas cores (k = 0 → a, 1 → b)
  const mix = (a, b, k) => { const A = rgbOf(a), B = rgbOf(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], clamp(k, 0, 1))).toString(16).padStart(2, '0')).join(''); };

  /* ------------------------------------------------------------------ */
  /* Layout (pixels do mundo). y cresce para baixo; o céu ocupa o resto  */
  /* ------------------------------------------------------------------ */
  const H0 = 184;                       // altura do desenho; tela mais alta = mais céu
  const HZ = 92, WATER = 96, MARGIN = 118, VERGE = 121, ROAD0 = 136, CENTER = 151, ROAD1 = 166, WALK = 168, FRONT = 177;
  const FAR = 147, NEAR = 163;          // faixa de cá (ida) e faixa de lá (volta)
  const LAKE_END = 1000, PA_END = 1760, ROT_X = 1900, ROT_END = 2040, CAR_END = 3040, FAC_X = 3080, END_X = 3600;
  const DOOR_X = FAC_X + 75;            // meio da porta de vidro da faculdade
  const PREF_X = 230;                   // Prefeitura do outro lado do lago (no plano do fundo, que anda pela metade)

  // linha do tempo (segundos)
  const TL = { walk0: 2.2, walk1: 5.6, inCar: 6.2, go: 7.0, stop: 32.5, out: 33.2, door: 34.5, inside: 35.4, fade: 35.8, end: 37.0 };
  const X_START = 250, X_STOP = 3125, ACC = 2.5, DEC = 3.5;

  // posição do carro no tempo: arranca, anda constante, freia
  function carX(t) {
    if (t <= TL.go) return X_START;
    const D = X_STOP - X_START, Td = TL.stop - TL.go, v = D / (Td - ACC / 2 - DEC / 2), u = Math.min(t - TL.go, Td);
    if (u < ACC) return X_START + 0.5 * (v / ACC) * u * u;
    if (u < Td - DEC) return X_START + (v * ACC) / 2 + v * (u - ACC);
    const r = Td - u;
    return X_STOP - 0.5 * (v / DEC) * r * r;
  }
  // faixa do carro: desvia da ilha da rotatória e, no fim, encosta do lado da faculdade
  function carY(x) {
    let y = lerp(NEAR, FAR, smooth(2880, 3060, x));
    const d = Math.abs(x - ROT_X);
    if (d < 70) y += 3 * Math.cos(((d / 70) * Math.PI) / 2);
    return y;
  }

  /* ------------------------------------------------------------------ */
  /* Pixels                                                              */
  /* ------------------------------------------------------------------ */
  function disc(g, cx, cy, r, col) {
    for (let dy = -r; dy <= r; dy++) { const w = Math.round(Math.sqrt(r * r - dy * dy)); R(g, cx - w, cy + dy, 2 * w + 1, 1, col); }
  }
  function oval(g, cx, cy, rx, ry, col) {
    for (let dy = -ry; dy <= ry; dy++) { const w = Math.round(rx * Math.sqrt(1 - (dy * dy) / (ry * ry))); R(g, cx - w, cy + dy, 2 * w + 1, 1, col); }
  }

  // fonte de pixels 3 × 5 (só as letras dos letreiros)
  const FONT = {
    A: ['.#.', '#.#', '###', '#.#', '#.#'], C: ['.##', '#..', '#..', '#..', '.##'], D: ['##.', '#.#', '#.#', '#.#', '##.'],
    E: ['###', '#..', '##.', '#..', '###'], F: ['###', '#..', '##.', '#..', '#..'], I: ['###', '.#.', '.#.', '.#.', '###'],
    J: ['..#', '..#', '..#', '#.#', '.#.'], K: ['#.#', '#.#', '##.', '#.#', '#.#'], L: ['#..', '#..', '#..', '#..', '###'],
    M: ['#.#', '###', '###', '#.#', '#.#'], N: ['#.#', '###', '###', '###', '#.#'], O: ['###', '#.#', '#.#', '#.#', '###'],
    R: ['##.', '#.#', '##.', '#.#', '#.#'], S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'],
    U: ['#.#', '#.#', '#.#', '#.#', '###'], Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
  };
  // escreve em pixels; k = tamanho do pixel; Ã e Á ganham o acento por cima
  function text(g, str, x, y, k, col) {
    for (const ch of str) {
      const base = ch === 'Ã' || ch === 'Á' ? 'A' : ch, rows = FONT[base];
      if (rows) rows.forEach((row, j) => { for (let i = 0; i < 3; i++) if (row[i] === '#') R(g, x + i * k, y + j * k, k, k, col); });
      if (ch === 'Ã') { R(g, x, y - 2 * k, k, k, col); R(g, x + k, y - 2 * k - k, k, k, col); R(g, x + 2 * k, y - 2 * k, k, k, col); }
      if (ch === 'Á') { R(g, x + k, y - 2 * k, k, k, col); R(g, x + 2 * k, y - 3 * k, k, k, col); }
      x += 4 * k;
    }
  }
  const textW = (str, k) => str.length * 4 * k - k;

  /* ------------------------------------------------------------------ */
  /* Peças do cenário                                                    */
  /* ------------------------------------------------------------------ */
  // árvore: tronco + copa em bolas; warm = luz do pôr do sol na copa
  function tree(g, x, y, r, seed, warm) {
    const h = Math.round(r * 0.9) + 4, cy = y - h - Math.round(r * 0.5);
    R(g, x - 1, y - h, 3, h, '#3e2c20');
    R(g, x, y - h, 1, h, '#5a4030');
    disc(g, x, cy, r, '#2a4630');
    disc(g, x - Math.round(r * 0.55), cy + 2, Math.round(r * 0.65), '#2a4630');
    disc(g, x + Math.round(r * 0.55), cy + 1, Math.round(r * 0.65), '#2a4630');
    disc(g, x - 1, cy - 1, Math.round(r * 0.7), '#3a6440');
    disc(g, x - Math.round(r * 0.4), cy - Math.round(r * 0.3), Math.max(1, Math.round(r * 0.4)), '#4f8148');
    for (let i = 0; i < r; i++) {
      const a = hash(seed * 31 + i) * Math.PI * 2, d = hash(seed * 17 + i) * r * 0.8;
      R(g, Math.round(x + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d * 0.8), 1, 1, '#5f9450');
    }
    if (warm > 0.02) {
      g.globalAlpha = warm * 0.5;
      disc(g, x - Math.round(r * 0.35), cy - Math.round(r * 0.45), Math.max(1, Math.round(r * 0.5)), '#ffb36b');
      g.globalAlpha = 1;
    }
  }
  // poste de luz (on = 0..1: aceso)
  function lamp(g, x, y, on, lights) {
    R(g, x, y - 58, 1, 58, '#9aa3b0');
    R(g, x + 1, y - 58, 1, 58, '#5d6573');
    R(g, x, y - 58, 10, 1, '#9aa3b0');
    R(g, x + 7, y - 57, 5, 2, on > 0.3 ? '#fff3d6' : '#c8ccd2');
    R(g, x - 1, y - 1, 4, 1, '#3a3f4a');
    if (on > 0.01) {
      lights.push({ x: x + 9, y: y - 55, r: 10, c: [255, 214, 150, 0.9 * on] });
      lights.push({ x: x + 9, y: Math.min(y + 16, ROAD1 - 4), r: 30, c: [255, 196, 120, 0.22 * on], flat: true });
    }
  }
  // galpão / loja baixa
  function shed(g, x, by, w, h, col) {
    R(g, x, by - h, w, h, col);
    R(g, x, by - h, w, 2, DL.shade(col, 0.15));
    R(g, x, by - h + 2, w, 1, DL.shade(col, -0.25));
    R(g, x + Math.round(w * 0.3), by - Math.round(h * 0.55), Math.round(w * 0.3), Math.round(h * 0.55), DL.shade(col, -0.3));
    for (let i = 0; i < Math.round(w * 0.3); i += 2) R(g, x + Math.round(w * 0.3) + i, by - Math.round(h * 0.55), 1, Math.round(h * 0.55), DL.shade(col, -0.38));
  }

  // carro de lado (sprite 52 × 22, virado para a direita; a esquerda é espelhada)
  function makeCar(body) {
    const c = DL.mk(52, 22), g = c.getContext('2d');
    const d = DL.shade(body, -0.32), l = DL.shade(body, 0.25), glass = '#1c2733', x0 = 1, by = 21;
    R(g, x0 + 2, by - 12, 46, 8, body);
    R(g, x0, by - 10, 50, 6, body);
    R(g, x0 + 2, by - 12, 46, 1, l);
    R(g, x0, by - 5, 50, 1, d);
    R(g, x0 + 1, by - 4, 48, 1, '#2a2f38');
    R(g, x0 + 14, by - 19, 21, 1, l);
    R(g, x0 + 12, by - 18, 25, 6, body);
    R(g, x0 + 10, by - 14, 2, 2, body);
    R(g, x0 + 37, by - 16, 4, 4, body);
    R(g, x0 + 13, by - 18, 10, 5, glass);
    R(g, x0 + 25, by - 18, 11, 5, glass);
    R(g, x0 + 14, by - 18, 2, 1, '#5a7a9a');
    R(g, x0 + 26, by - 18, 2, 1, '#5a7a9a');
    R(g, x0 + 24, by - 18, 1, 13, d);
    R(g, x0 + 30, by - 10, 3, 1, d);
    R(g, x0 + 48, by - 10, 2, 2, '#fff1b0');
    R(g, x0, by - 10, 2, 2, '#c8262e');
    for (const wx of [x0 + 11, x0 + 39]) { disc(g, wx, by - 3, 4, '#121418'); disc(g, wx, by - 3, 2, '#6d7581'); R(g, wx, by - 3, 1, 1, '#c8ccd2'); }
    const m = DL.mk(52, 22), mg = m.getContext('2d');
    mg.translate(52, 0);
    mg.scale(-1, 1);
    mg.drawImage(c, 0, 0);
    return { r: c, l: m };
  }
  function drawCar(g, spr, x, by, dir) { g.drawImage(dir > 0 ? spr.r : spr.l, Math.round(x) - 26, Math.round(by) - 21); }
  // farol (luz do carro na rua)
  function beam(g, x, y, dir, len, a) {
    const gr = g.createLinearGradient(x, 0, x + dir * len, 0);
    gr.addColorStop(0, 'rgba(255,240,190,' + a.toFixed(3) + ')');
    gr.addColorStop(1, 'rgba(255,240,190,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(x, y - 1);
    g.lineTo(x + dir * len, y - 6);
    g.lineTo(x + dir * len, y + 7);
    g.lineTo(x, y + 1);
    g.closePath();
    g.fill();
  }
  // moto parada (perto da faculdade, como na foto 07)
  function moto(g, x, by, col) {
    disc(g, x - 6, by - 3, 3, '#121418'); disc(g, x + 6, by - 3, 3, '#121418');
    R(g, x - 5, by - 8, 10, 3, col);
    R(g, x - 2, by - 10, 6, 2, '#16181d');
    R(g, x + 5, by - 11, 1, 5, '#9aa3b0');
    R(g, x + 4, by - 12, 3, 1, '#2a2f38');
  }
  function dog(g, x, y, step) {
    R(g, x - 4, y - 5, 8, 3, '#6b4a2a');
    R(g, x + 3, y - 7, 3, 3, '#6b4a2a');
    R(g, x + 5, y - 6, 1, 1, '#121418');
    R(g, x - 5, y - 6, 1, 2, '#6b4a2a');
    const s = step % 2;
    R(g, x - 3 + s, y - 2, 1, 2, '#4a3220'); R(g, x + 2 - s, y - 2, 1, 2, '#4a3220');
  }

  // Academia Sky Fit (foto 02): bloco vermelho, caixa preta com o letreiro, vidro e porta de enrolar
  function skyfit(g, X, by, on, emit, lights) {
    const top = by - 58;
    R(g, X, top, 44, 58, '#b5222b');
    for (let k = 0; k < 5; k++) R(g, X + 3 + k * 9, top + 4, 1, 52, '#8e1a22');
    R(g, X, top, 44, 1, '#e04a4a');
    R(g, X + 8, top + 8, 20, 12, '#1f3f8a');
    R(g, X + 17, top + 11, 2, 5, '#e9ecef'); R(g, X + 15, top + 13, 6, 1, '#e9ecef');
    R(g, X + 8, top + 20, 20, 3, '#e9ecef');
    R(g, X + 44, top, 126, 30, '#141418');
    R(g, X + 44, top, 126, 1, '#2a2a30');
    R(g, X + 44, top + 30, 126, 28, '#4a4f5a');
    R(g, X + 50, top + 34, 46, 24, '#2a3340');
    for (let i = 0; i < 4; i++) R(g, X + 50 + i * 12, top + 34, 1, 24, '#14171c');
    R(g, X + 56, top + 46, 8, 6, '#1a1f26'); R(g, X + 74, top + 44, 10, 8, '#1a1f26');
    R(g, X + 104, top + 34, 60, 24, '#9aa3b0');
    for (let i = 0; i < 24; i += 2) R(g, X + 104, top + 34 + i, 60, 1, '#7d8590');
    const sx = X + 44 + Math.round((126 - textW('SKYFIT', 3)) / 2);
    emit.push((g) => {
      text(g, 'SKY', sx, top + 8, 3, '#f4f6fa');
      text(g, 'FIT', sx + textW('SKY', 3) + 3, top + 8, 3, '#ff3b3b');
      R(g, sx, top + 26, textW('SKYFIT', 3), 1, '#ff3b3b');
    });
    lights.push({ x: X + 107, y: top + 15, r: 46, c: [255, 60, 60, 0.32 * on] });
    lights.push({ x: X + 73, y: top + 46, r: 26, c: [200, 225, 255, 0.35 * on] });
  }

  // logo da faculdade: escudo com montanhas e uma folha (foto 06)
  function logo(g, x, y, c) {
    R(g, x, y, 16, 1, c); R(g, x, y, 1, 14, c); R(g, x + 15, y, 1, 14, c);
    for (let i = 0; i <= 7; i++) { const dy = Math.round((i * 6) / 7); R(g, x + i, y + 14 + dy, 1, 1, c); R(g, x + 15 - i, y + 14 + dy, 1, 1, c); }
    for (const [a, b] of [[1, 6], [2, 5], [3, 4], [4, 3], [5, 2], [6, 3], [7, 4], [8, 5], [9, 4], [10, 3], [11, 2], [12, 3], [13, 4], [14, 5]]) R(g, x + a, y + b, 1, 1, c);
    R(g, x + 8, y + 7, 1, 12, c);
    for (let dy = 0; dy <= 11; dy++) { const w = Math.round(4 * Math.sin((Math.PI * dy) / 11)); R(g, x + 8 - w, y + 7 + dy, 1, 1, c); R(g, x + 8 + w, y + 7 + dy, 1, 1, c); }
    R(g, x + 6, y + 11, 2, 1, c); R(g, x + 9, y + 11, 2, 1, c); R(g, x + 5, y + 14, 3, 1, c); R(g, x + 9, y + 14, 3, 1, c);
  }

  // Faculdade Serra Dourada (fotos 06 e 07): metal ondulado, letreiro branco, marquise de madeira,
  // entrada de vidro com luz quente, lateral com vidraça, painéis iluminados e motos
  function faculdade(g, X, by, on, emit, lights) {
    const top = by - 82, W = 330, mid = 150;
    for (let x = 0; x < W; x += 2) {
      const front = x < mid;
      R(g, X + x, top, 1, 54, front ? '#b4bcc7' : '#7d8590');
      R(g, X + x + 1, top, 1, 54, front ? '#959ead' : '#666d78');
    }
    R(g, X, top, W, 1, '#e4e8ee');
    R(g, X + mid, top, 1, 54, '#d9dde3');
    // marquise de madeira
    R(g, X - 6, by - 30, W + 6, 6, '#b8562c');
    R(g, X - 6, by - 30, W + 6, 1, '#d9784a');
    R(g, X - 6, by - 25, W + 6, 1, '#7a3a1e');
    // térreo
    R(g, X, by - 24, W, 24, '#c9ccd1');
    R(g, X - 4, by - 24, 4, 24, '#b4b8be');
    // entrada de vidro com luz quente lá dentro
    const dx = X + 44, dw = 62;
    R(g, dx, by - 23, dw, 23, '#f0c08a');
    R(g, dx, by - 23, dw, 5, '#f8dcb0');
    R(g, dx + 44, by - 21, 16, 21, '#b4602e');
    for (let i = 0; i < 16; i += 2) R(g, dx + 44 + i, by - 21, 1, 21, '#9a4e24');
    R(g, dx + 50, by - 17, 4, 4, '#f4f6fa');
    for (let i = 0; i < 5; i++) R(g, dx + 8 + i * 7, by - 18 - (i % 2), 2, 2, '#fffbe8');
    R(g, dx + 6, by - 8, 18, 1, '#5a4030'); R(g, dx + 8, by - 7, 1, 7, '#5a4030'); R(g, dx + 22, by - 7, 1, 7, '#5a4030');
    R(g, dx + 28, by - 9, 7, 9, '#f4ece0');
    R(g, dx, by - 24, dw, 1, '#3a3f4a');
    R(g, dx, by - 23, 1, 23, '#3a3f4a'); R(g, dx + dw - 1, by - 23, 1, 23, '#3a3f4a'); R(g, dx + dw / 2, by - 23, 1, 23, '#3a3f4a');
    R(g, dx + 18, by, 26, 1, '#2a2f38');
    // lateral: vidraça iluminada, alguém estudando, plantas na frente
    for (let i = 0; i < 3; i++) { const wx = X + mid + 6 + i * 32; R(g, wx, by - 22, 28, 20, '#f2d2a8'); R(g, wx, by - 22, 28, 3, '#fae6c8'); }
    disc(g, X + mid + 26, by - 13, 2, '#3a2a24'); R(g, X + mid + 24, by - 11, 5, 6, '#e9e9e6'); R(g, X + mid + 20, by - 9, 3, 3, '#9aa3b0');
    R(g, X + mid + 40, by - 14, 2, 10, '#3c6a42'); disc(g, X + mid + 41, by - 16, 3, '#4f8148');
    for (let k = 0; k < 18; k++) { disc(g, X + mid + 4 + k * 6, by - 2, 3, k % 2 ? '#3c6a42' : '#2f5a38'); if (k % 3 === 0) R(g, X + mid + 5 + k * 6, by - 4, 1, 1, '#ff9a52'); }
    // painéis de propaganda iluminados
    const px = X + 250;
    R(g, px, top + 8, 36, 44, '#e9ecef');
    R(g, px + 2, top + 10, 16, 18, '#c8262e'); R(g, px + 18, top + 10, 16, 18, '#3c8a4a'); R(g, px + 10, top + 14, 10, 12, '#ff9a52');
    R(g, px + 4, top + 32, 28, 2, '#2a2f38'); R(g, px + 4, top + 37, 20, 2, '#c8262e'); R(g, px + 4, top + 42, 24, 1, '#2a2f38');
    R(g, px + 40, top + 8, 36, 44, '#e9ecef');
    R(g, px + 42, top + 10, 32, 10, '#c8262e'); R(g, px + 42, top + 20, 32, 8, '#3c8a4a');
    for (let i = 0; i < 6; i++) R(g, px + 44, top + 31 + i * 3, 12 + (i % 3) * 4, 1, '#5d6573');
    R(g, px + 62, top + 40, 10, 8, '#2a2f38');
    for (const fx of [px + 8, px + 28, px + 48, px + 68]) { R(g, fx, top + 3, 1, 5, '#3a3f4a'); R(g, fx - 2, top + 3, 5, 2, '#5d6573'); }
    // poste com câmeras e luz azul (foto 06)
    R(g, X - 16, by - 52, 2, 52, '#2a2f38');
    R(g, X - 20, by - 44, 5, 3, '#e9ecef'); R(g, X - 13, by - 42, 5, 3, '#e9ecef'); R(g, X - 19, by - 38, 5, 3, '#e9ecef');
    R(g, X - 16, by - 34, 2, 2, '#3a6bff');
    R(g, X - 16, by - 52, 12, 1, '#5d6573'); R(g, X - 7, by - 51, 4, 2, '#fff3d6');
    // o letreiro acende por cima de tudo (é luz)
    emit.push((g) => {
      const sc = '#f4f6fa';
      g.globalAlpha = 0.55 * on;
      for (let x = 0; x < mid; x += 2) { R(g, X + x, top, 1, 54, '#c8ced8'); R(g, X + x + 1, top, 1, 54, '#a9b0bb'); }
      g.globalAlpha = 1;
      logo(g, X + 14, top + 12, sc);
      text(g, 'FACULDADE', X + 38, top + 10, 1, sc);
      text(g, 'SERRA', X + 38, top + 18, 2, sc);
      text(g, 'DOURADA', X + 38, top + 30, 2, sc);
      text(g, 'CANAÃ DOS CARAJÁS', X + 38, top + 45, 1, sc);
    });
    lights.push({ x: X + 75, y: top + 20, r: 95, c: [225, 235, 255, 0.10 + 0.22 * on] });
    lights.push({ x: dx + dw / 2, y: by - 10, r: 42, c: [255, 190, 120, 0.15 + 0.3 * on] });
    lights.push({ x: dx + dw / 2, y: by + 8, r: 40, c: [255, 190, 120, 0.25 * on], flat: true });
    lights.push({ x: X + mid + 50, y: by - 12, r: 50, c: [255, 200, 140, 0.25 * on] });
    lights.push({ x: px + 38, y: top + 30, r: 50, c: [235, 240, 255, 0.25 * on] });
    lights.push({ x: X - 15, y: by - 33, r: 9, c: [70, 120, 255, 0.4 + 0.5 * on * (0.6 + 0.4 * Math.sin(S.t * 4))] });
    lights.push({ x: X - 5, y: by - 50, r: 10, c: [255, 220, 160, 0.9 * on] });
    lights.push({ x: X - 5, y: by + 14, r: 30, c: [255, 200, 130, 0.22 * on], flat: true });
  }

  // Prefeitura de Canaã dos Carajás / Centro Administrativo (foto 08), vista de longe, do outro lado do
  // lago: prédio comprido e baixo, claro, com faixas de vidro verde e brises brancos, a entrada no meio
  // um pouco mais alta, a fileira de bandeiras na frente e o totem com a bandeira da cidade.
  // Desenhado uma vez num sprite (128 × 34, chão na última linha); .lit = vidros que acendem à noite.
  function makePrefeitura() {
    const W = 128, H = 34, c = DL.mk(W, H), g = c.getContext('2d'), B = H, lit = [];
    // bloco principal
    R(g, 4, B - 20, 120, 20, '#d4d8de');
    R(g, 4, B - 21, 120, 1, '#eef0f3');
    R(g, 4, B - 20, 120, 1, '#b4bac2');
    // duas faixas de vidro verde com brises brancos na frente
    for (const y of [B - 17, B - 11]) {
      R(g, 6, y, 116, 4, '#2f7a5a');
      R(g, 6, y, 116, 1, '#5fb48a');
      for (let x = 6; x < 122; x += 3) R(g, x, y, 1, 4, '#e9ecef');
      for (let x = 8; x < 120; x += 6) if (hash(x * 7 + y) > 0.35) lit.push([x, y + 2]);
    }
    // térreo escuro (recuado)
    R(g, 6, B - 6, 116, 5, '#5d6573');
    R(g, 6, B - 6, 116, 1, '#7d8590');
    // entrada no meio, mais alta, toda de vidro verde
    R(g, 52, B - 26, 26, 26, '#c9ced5');
    R(g, 52, B - 27, 26, 1, '#eef0f3');
    R(g, 55, B - 24, 20, 18, '#2a6e50');
    for (let x = 55; x < 75; x += 4) R(g, x, B - 24, 1, 18, '#a9d8bf');
    R(g, 50, B - 7, 30, 2, '#eef0f3'); // marquise
    for (let x = 57; x < 74; x += 5) lit.push([x, B - 20], [x, B - 14]);
    // fileira de bandeiras na frente
    const FLAGS = [['#2f9a4a', '#f2c14e'], ['#c8262e', '#e9ecef'], ['#1f3f8a', '#e9ecef'], ['#2f9a4a', '#f2c14e'], ['#e86a2a', '#1f3f8a'], ['#c8262e', '#f2c14e'], ['#2f9a4a', '#1f3f8a']];
    FLAGS.forEach(([a, b], i) => {
      const x = 30 + i * 11;
      R(g, x, B - 14, 1, 14, '#c8ccd2');
      R(g, x + 1, B - 14, 4, 3, a);
      R(g, x + 1, B - 12, 4, 1, b);
    });
    // totem com a bandeira de Canaã (verde, amarelo, círculo azul) e o nome embaixo
    R(g, 10, B - 22, 12, 22, '#eef0f3');
    R(g, 10, B - 22, 1, 22, '#c9ced5');
    R(g, 12, B - 20, 8, 6, '#2f9a4a');
    R(g, 13, B - 19, 6, 4, '#f2c14e');
    R(g, 15, B - 18, 2, 2, '#1f3f8a');
    R(g, 12, B - 12, 8, 1, '#c8262e');
    R(g, 12, B - 10, 8, 1, '#2a6e50');
    R(g, 12, B - 8, 6, 1, '#2a6e50');
    c.lit = lit;
    return c;
  }

  // torre de celular (foto 05)
  function tower(g, x, by, on, lights) {
    for (let i = 0; i < 84; i++) {
      const w = Math.round(6 * (1 - i / 96));
      R(g, x - w, by - i, 1, 1, '#9aa3b0'); R(g, x + w, by - i, 1, 1, '#9aa3b0');
      if (i % 7 === 0) R(g, x - w, by - i, 2 * w + 1, 1, '#7d8590');
    }
    R(g, x - 3, by - 80, 2, 5, '#c8ccd2'); R(g, x + 2, by - 79, 2, 5, '#c8ccd2');
    const blink = Math.sin(S.t * 3) > 0 ? 1 : 0.2;
    R(g, x, by - 86, 1, 2, '#ff3b3b');
    lights.push({ x: x + 0.5, y: by - 85, r: 6, c: [255, 60, 60, 0.8 * on * blink] });
  }

  /* ------------------------------------------------------------------ */
  /* Montagem da cena (uma vez, ao entrar)                               */
  /* ------------------------------------------------------------------ */
  const WALKERS = [
    { skin: '#c98e66', hair: '#1a1210', hairStyle: 'ponytail', shirt: '#e86a5a', pants: '#2b2f3a', shoes: '#eceff3' },
    { skin: '#8d5a3b', hair: '#0f0b0a', hairStyle: 'buzz', shirt: '#2f6a4a', pants: '#3b4250', shoes: '#16181d' },
    { skin: '#f2c8a0', hair: '#6b4a2a', hairStyle: 'long', shirt: '#c4b5fd', pants: '#2a3140', shoes: '#eceff3' },
    { skin: '#e0ac7e', hair: '#2a1c16', hairStyle: 'curly', shirt: '#f2c14e', pants: '#1f2430', shoes: '#c8262e' },
    { skin: '#a86f4c', hair: '#1a1210', hairStyle: 'short', shirt: '#c8262e', pants: '#2a2f38', shoes: '#eceff3' },
  ];
  let PREF = null; // sprite da Prefeitura (feito em build)
  const S = { t: 0, cam: 0, buf: null, bg: null, statics: [], people: [], done: false, skipAt: null, caption: '' };

  function build() {
    const st = [];
    const add = (o) => st.push(o);
    // 1. lago: árvores e postes no canteiro entre o lago e a avenida
    for (let x = 30, i = 0; x < LAKE_END - 20; x += 52 + Math.round(hash(i * 5) * 30), i++) add({ k: 'tree', x, y: 131 + Math.round(hash(i * 9) * 3), r: 8 + Math.round(hash(i * 13) * 5), seed: i, lake: true });
    add({ k: 'tree', x: 330, y: 133, r: 15, seed: 99, lake: true });
    for (let x = 90; x < LAKE_END; x += 150) add({ k: 'lamp', x, y: 134, lake: true });
    // 3. PA-160: academia, estacionamento, lojas, postes e arvorezinhas
    add({ k: 'skyfit', x: 1110, y: 112 });
    add({ k: 'shed', x: 1300, y: 112, w: 70, h: 26, col: '#c9c2b5' });
    add({ k: 'shed', x: 1390, y: 112, w: 90, h: 32, col: '#8e96a3' });
    add({ k: 'shed', x: 1500, y: 112, w: 60, h: 22, col: '#d9d2c5' });
    add({ k: 'shed', x: 1580, y: 112, w: 110, h: 30, col: '#b4b8be' });
    for (const [x, col, dir] of [[1135, '#c8ccd2', 1], [1180, '#7d8590', -1], [1232, '#b8333a', 1], [1275, '#e9ecef', -1]]) add({ k: 'parked', x, y: 123, col, dir });
    for (let x = 1050, i = 0; x < PA_END - 20; x += 120, i++) add({ k: 'lamp', x, y: 134 });
    for (let x = 1100, i = 0; x < PA_END; x += 95, i++) add({ k: 'tree', x: x + 40, y: 135, r: 5 + Math.round(hash(i + 50) * 2), seed: i + 50 });
    // 4. rotatória: galpões atrás, ilha com árvore
    add({ k: 'shed', x: 1780, y: 116, w: 80, h: 22, col: '#e0d9cc' });
    add({ k: 'shed', x: 1880, y: 116, w: 120, h: 28, col: '#c9c2b5' });
    add({ k: 'island', x: ROT_X, y: CENTER });
    // 5. Av. Carajás: muros, mato, torre, fileira de árvores e postes no canteiro
    for (const [x, w] of [[2060, 140], [2240, 90], [2380, 60], [2640, 160], [2860, 120]]) add({ k: 'wall', x, y: 121, w });
    add({ k: 'shed', x: 2470, y: 121, w: 90, h: 24, col: '#d9d2c5' });
    add({ k: 'tower', x: 2560, y: 112 });
    for (let x = 2070, i = 0; x < CAR_END - 30; x += 44, i++) add({ k: 'tree', x, y: 133, r: 6 + Math.round(hash(i + 70) * 3), seed: i + 70 });
    for (let x = 2120; x < CAR_END; x += 160) add({ k: 'lamp', x, y: 134 });
    // 6. faculdade e motos
    add({ k: 'fac', x: FAC_X, y: VERGE });
    for (const [x, col] of [[FAC_X + 270, '#b8333a'], [FAC_X + 292, '#2a2f38'], [FAC_X + 312, '#c8262e']]) add({ k: 'moto', x, y: 133, col });
    S.statics = st;
    PREF = makePrefeitura();
    S.pfBuf = DL.mk(PREF.width, PREF.height);
    S.pfG = S.pfBuf.getContext('2d');

    // pessoas caminhando no canteiro do lago (vão e voltam)
    S.people = [
      { look: 0, a: 60, b: 520, y: 129, sp: 15, ph: 40 },
      { look: 1, a: 120, b: 640, y: 132, sp: 18, ph: 300 },
      { look: 2, a: 380, b: 900, y: 128, sp: 13, ph: 120 },
      { look: 3, a: 200, b: 820, y: 131, sp: 17, ph: 610 },
    ].map((p) => Object.assign(p, { sheet: DL.makeSheet(WALKERS[p.look]) }));
    S.dogWalker = DL.makeSheet(WALKERS[4]);
    S.hero = DL.makeSheet(DL.LOOKS.player);
    S.cars = { hero: makeCar('#3a6ea5'), silver: makeCar('#c8ccd2'), gray: makeCar('#7d8590'), red: makeCar('#b8333a'), white: makeCar('#e9ecef') };
    S.parkedSpr = { '#c8ccd2': S.cars.silver, '#7d8590': S.cars.gray, '#b8333a': S.cars.red, '#e9ecef': S.cars.white };
    // carros na contramão (faixa de lá)
    S.traffic = [{ t0: 9.5, x0: 1500, spr: S.cars.silver }, { t0: 17, x0: 2350, spr: S.cars.red }, { t0: 24, x0: 3200, spr: S.cars.white }];
  }

  /* ------------------------------------------------------------------ */
  /* Desenho de um quadro                                                */
  /* ------------------------------------------------------------------ */
  function walkFrame(sheet, dir, dist) { return sheet[dir].walk[Math.floor(dist / 6.5) % 4]; }
  function person(g, frame, x, y) {
    R(g, Math.round(x) - 4, Math.round(y) - 1, 8, 1, 'rgba(0,0,0,0.3)');
    g.drawImage(frame, Math.round(x) - CH.AX, Math.round(y) - CH.AY);
  }

  function render(sc) {
    const t = S.t, cv = sc.canvas, cw = cv.width, ch = cv.height;
    const P = Math.max(1, Math.round(ch / 190)); // tamanho de cada pixel do mundo na tela
    const VW = Math.ceil(cw / P), VH = Math.ceil(ch / P), oy = VH - H0 - Math.round(VH * 0.06); // sobe acima da faixa de cinema
    if (!S.buf || S.buf.width !== VW || S.buf.height !== VH) { S.buf = DL.mk(VW, VH); S.g = S.buf.getContext('2d'); }
    if (!S.wbuf || S.wbuf.width !== VW || S.wbuf.height !== VH) { S.wbuf = DL.mk(VW, VH); S.wg = S.wbuf.getContext('2d'); }
    let g = S.g;
    const day = smooth(6, 31, t);                    // 0 = pôr do sol, 1 = noite
    const on = smooth(0.3, 0.65, day);               // luzes acesas
    const warm = 1 - smooth(0.05, 0.45, day);        // luz quente do pôr do sol

    // câmera: segue o carro; no fim, enquadra a faculdade
    const cx = carX(t), cy = carY(cx);
    let target = t < TL.go ? X_START - VW * 0.45 : cx - VW * 0.4;
    target = lerp(target, DOOR_X + 30 - VW / 2, smooth(TL.stop - 3, TL.stop, t));
    S.cam = S.cam == null ? target : S.cam + (target - S.cam) * Math.min(1, S.dt * 4);
    S.cam = clamp(S.cam, 0, END_X - VW);
    const cam = Math.round(S.cam);

    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    g.imageSmoothingEnabled = false;

    /* ---- céu: laranja e rosa no pôr do sol, azul-escuro à noite ---- */
    const sky = g.createLinearGradient(0, 0, 0, oy + HZ);
    sky.addColorStop(0, mix('#4b2f7a', '#060918', day));
    sky.addColorStop(0.6, mix('#e0607e', '#141734', day));
    sky.addColorStop(1, mix('#ffa152', '#2b2250', day));
    g.fillStyle = sky;
    g.fillRect(0, 0, VW, oy + HZ + 4);
    const sunX = Math.round(120 - cam * 0.04), sunY = Math.round(oy + HZ - 16 + day * 50);
    if (day < 0.7) { disc(g, sunX, sunY, 10, mix('#ffc06a', '#ff7a4a', day * 1.4)); disc(g, sunX, sunY, 7, '#ffe6a0'); }
    const cloudA = 1 - smooth(0.3, 0.8, day);
    if (cloudA > 0) {
      g.globalAlpha = cloudA * 0.8;
      for (let i = 0; i < 7; i++) {
        const w = 26 + Math.round(hash(i * 3) * 40), x = ((i * 97 + 40 - cam * 0.06) % (VW + 160) + VW + 160) % (VW + 160) - 80;
        const y = oy + 18 + Math.round(hash(i * 7) * 46);
        R(g, Math.round(x), y, w, 2, i % 2 ? '#ff9fb0' : '#ffb98a');
        R(g, Math.round(x) + 6, y - 1, w - 14, 1, '#ffd0b0');
      }
      g.globalAlpha = 1;
    }
    /* ---- morros ao fundo (devagar) e a cidade do outro lado do lago ---- */
    const hillFar = mix('#8a4f86', '#141433', day), hillNear = mix('#5e3a6e', '#0e1028', day);
    for (let x = 0; x < VW; x++) {
      const w1 = x + cam * 0.12, h1 = 14 + 7 * Math.sin(w1 * 0.012) + 4 * Math.sin(w1 * 0.033 + 1.3);
      R(g, x, Math.round(oy + HZ - h1), 1, Math.ceil(h1) + 2, hillFar);
      const w2 = x + cam * 0.25, h2 = 7 + 4 * Math.sin(w2 * 0.02 + 2) + 3 * Math.sin(w2 * 0.05);
      R(g, x, Math.round(oy + HZ - h2), 1, Math.ceil(h2) + 2, hillNear);
    }
    const town = mix('#4a3456', '#121530', day), winLit = [];
    // a Prefeitura (Centro Administrativo) do outro lado do lago, no começo da cena
    const pfX = Math.round(PREF_X - cam * 0.5), pfB = oy + HZ + 3;
    for (let k = Math.floor((cam * 0.5) / 24) - 2, n = k + Math.ceil(VW / 24) + 4; k < n; k++) {
      if (hash(k * 11 + 3) < 0.22) continue;
      const bx = Math.round(k * 24 + hash(k) * 8 - cam * 0.5), w = 12 + Math.round(hash(k * 3) * 16), h = 4 + Math.round(hash(k * 7) * 12);
      if (bx + w > pfX - 6 && bx < pfX + PREF.width + 6) continue; // ali fica a Prefeitura
      R(g, bx, oy + HZ + 2 - h, w, h, town);
      for (let wy = 2; wy < h - 1; wy += 3) for (let wx = 2; wx < w - 1; wx += 3) if (hash(k * 131 + wx * 7 + wy * 13) > 0.62) winLit.push([bx + wx, oy + HZ + 2 - h + wy]);
    }
    if (pfX < VW && pfX + PREF.width > 0) {
      // a mesma luz do resto: dourada no pôr do sol, escura à noite (pintada só por cima do prédio)
      const pg = S.pfG;
      pg.globalCompositeOperation = 'source-over';
      pg.clearRect(0, 0, PREF.width, PREF.height);
      pg.drawImage(PREF, 0, 0);
      pg.globalCompositeOperation = 'source-atop';
      if (warm > 0.02) { pg.fillStyle = 'rgba(255,150,80,' + (0.22 * warm).toFixed(3) + ')'; pg.fillRect(0, 0, PREF.width, PREF.height); }
      pg.fillStyle = 'rgba(110,70,130,0.2)'; // névoa da distância (fica do outro lado do lago)
      pg.fillRect(0, 0, PREF.width, PREF.height);
      pg.fillStyle = 'rgba(10,12,36,' + (0.62 * day).toFixed(3) + ')';
      pg.fillRect(0, 0, PREF.width, PREF.height);
      g.drawImage(S.pfBuf, pfX, pfB - PREF.height);
      // à noite as faixas de vidro verde acendem
      for (const [wx, wy] of PREF.lit) winLit.push([pfX + wx, pfB - PREF.height + wy]);
    }

    // luzes do fundo (ficam ATRÁS da rua e dos prédios): brilho do sol, estrelas, janelas da cidade
    g.globalCompositeOperation = 'lighter';
    if (warm > 0.02) glow(g, sunX, sunY, 80, [255, 160, 90, 0.45 * warm]);
    if (day > 0.5) {
      for (let i = 0; i < 60; i++) {
        const a = (day - 0.5) * 2 * (0.5 + 0.5 * Math.sin(t * 2 + i));
        R(g, Math.round(hash(i * 3) * VW), Math.round(hash(i * 7) * (oy + HZ - 30)), 1, 1, 'rgba(230,235,255,' + a.toFixed(3) + ')');
      }
    }
    if (on > 0.05) for (const [wx, wy] of winLit) R(g, wx, wy, 1, 1, 'rgba(255,200,120,' + (0.8 * on).toFixed(3) + ')');
    g.globalCompositeOperation = 'source-over';

    /* ---- mundo (câmera em x; mesmo plano da avenida), numa camada só dele ---- */
    g = S.wg;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, VW, VH);
    g.setTransform(1, 0, 0, 1, -cam, oy);
    const x0 = cam, x1 = cam + VW;
    const span = (a, b, y0, y1, col) => { const A = Math.max(a, x0 - 2), B = Math.min(b, x1 + 2); if (B > A) R(g, A, y0, B - A, y1 - y0, col); };
    span(-1e4, 1e5, HZ, WATER, mix('#4a3048', '#0e1022', day));
    // o lago: reflete o céu; a luz do sol desenha uma faixa quente na água
    const water = g.createLinearGradient(0, WATER, 0, MARGIN);
    water.addColorStop(0, mix('#f0a08a', '#1b2142', day));
    water.addColorStop(1, mix('#9a5a7e', '#0f1328', day));
    span(-400, LAKE_END, WATER, MARGIN, water);
    for (let y = WATER + 2; y < MARGIN - 1; y += 3) {
      for (let k = 0; k < 10; k++) {
        const wx = Math.round(((hash(y * 17 + k) * 1400 + t * (y % 2 ? 6 : -6)) % 1400) - 200);
        if (wx < LAKE_END - 8 && wx > x0 - 10 && wx < x1) R(g, wx, y, 4 + (k % 3) * 2, 1, mix('#ffc8a8', '#2c3460', day));
      }
    }
    if (warm > 0.02) {
      const rx = cam + sunX;
      g.globalAlpha = warm;
      for (let y = WATER; y < MARGIN; y++) {
        const w = 2 + Math.round((y - WATER) * 0.4 + 2 * Math.sin(t * 3 + y * 1.7)), off = Math.round(2 * Math.sin(t * 2 + y));
        if (rx < LAKE_END) R(g, rx - w + off, y, 2 * w, 1, y % 2 ? '#ffd38a' : '#ffb36b');
      }
      g.globalAlpha = 1;
    }
    // terrenos depois do lago
    span(LAKE_END, 1e5, WATER, ROAD0, '#8a7254');
    // beira do lago: concreto e faixa amarela (foto 01), canteiro de grama
    span(-400, LAKE_END, MARGIN, MARGIN + 2, '#c9c2b5');
    span(-400, LAKE_END, MARGIN + 2, MARGIN + 3, '#e8c15a');
    span(-400, LAKE_END + 30, MARGIN + 3, ROAD0, '#4f8a4a');
    span(LAKE_END - 3, LAKE_END, WATER, MARGIN + 3, '#c9c2b5');
    // PA-160: estacionamento, calçada de tijolinho vermelho (fotos 02 e 03)
    span(LAKE_END + 30, PA_END, WATER, 112, '#7a6a4e');
    span(LAKE_END + 30, PA_END, 112, 124, '#4f7a44');
    span(1100, 1320, 112, 124, '#55595f');
    for (let x = 1110; x < 1320; x += 22) span(x, x + 1, 113, 123, '#c9ccd1');
    span(LAKE_END + 30, PA_END, 124, 130, '#a8564a');
    for (let y = 124; y < 130; y += 2) { span(LAKE_END + 30, PA_END, y, y + 1, '#8a4038'); }
    span(LAKE_END + 30, PA_END, 130, ROAD0, '#4f8a4a');
    // rotatória: terra e calçada (foto 04)
    span(PA_END, ROT_END, WATER, 128, '#9a7a5a');
    span(PA_END, ROT_END, 128, ROAD0, '#b9b4ad');
    // Av. Carajás: mato e canteiro de grama (foto 05)
    span(ROT_END, CAR_END, WATER, 121, '#6a7a44');
    for (let x = Math.max(ROT_END, x0 - (x0 % 5)); x < Math.min(CAR_END, x1); x += 5) R(g, x, 116 + Math.round(hash(x) * 4), 1, 3, '#8a9a54');
    span(ROT_END, CAR_END, 121, ROAD0, '#4f8a4a');
    // faculdade: terreno, calçada de concreto, grama
    span(CAR_END, 1e5, WATER, 121, '#5d5a55');
    span(CAR_END, 1e5, 121, 130, '#b9b4ad');
    span(CAR_END, 1e5, 130, ROAD0, '#4f8a4a');
    // avenida
    span(-1e4, 1e5, ROAD0, ROAD1, '#474c57');
    for (let x = Math.floor(x0 / 6) * 6; x < x1; x += 6) R(g, x + Math.round(hash(x) * 4), ROAD0 + 2 + Math.round(hash(x * 3) * 26), 1, 1, '#555a66');
    span(-1e4, 1e5, ROAD0, ROAD0 + 1, '#5d6573');
    span(-1e4, 1e5, ROAD1 - 1, ROAD1, '#9aa3b0');
    for (let x = Math.floor(x0 / 16) * 16; x < x1; x += 16) if (Math.abs(x + 4 - ROT_X) > 46) R(g, x, CENTER, 8, 1, '#d9dde3');
    for (let y = ROAD0 + 2; y < ROAD1 - 2; y += 4) span(1824, 1838, y, y + 2, '#e9ecef'); // faixa de pedestre
    span(-1e4, 1e5, ROAD1, WALK, '#9aa3b0');
    span(-1e4, 1e5, WALK, FRONT, '#8e8a84');
    for (let x = Math.floor(x0 / 12) * 12; x < x1; x += 12) R(g, x, WALK, 1, FRONT - WALK, '#7a7670');
    span(-1e4, 1e5, FRONT, H0 + 40, '#3f6e3c');

    // sombras compridas do pôr do sol (só no lago)
    if (warm > 0.02) {
      g.fillStyle = 'rgba(20,10,30,' + (0.3 * warm).toFixed(3) + ')';
      const sunW = cam + sunX;
      for (const o of S.statics) {
        if (!o.lake || o.x < x0 - 40 || o.x > x1 + 40) continue;
        const w = o.k === 'tree' ? o.r : 1, len = o.k === 'tree' ? 22 + o.r : 30, dir = o.x > sunW ? 1 : -1;
        g.beginPath();
        g.moveTo(o.x - w, o.y); g.lineTo(o.x + w, o.y);
        g.lineTo(o.x + w + dir * len * 0.45, o.y + len * 0.5); g.lineTo(o.x - w + dir * len * 0.45, o.y + len * 0.5);
        g.closePath(); g.fill();
      }
    }

    // tudo o que fica em pé, de trás para a frente
    const lights = [], emit = [], list = [];
    for (const o of S.statics) list.push(o);
    for (const p of S.people) {
      const L = p.b - p.a, q = (((p.ph + p.sp * t) % (2 * L)) + 2 * L) % (2 * L);
      list.push({ k: 'walker', y: p.y, x: q < L ? p.a + q : p.a + 2 * L - q, dir: q < L ? 'right' : 'left', dist: p.sp * t, sheet: p.sheet });
    }
    const dwx = 2700 - 11 * t;
    list.push({ k: 'walker', y: 132, x: dwx, dir: 'left', dist: 11 * t, sheet: S.dogWalker });
    list.push({ k: 'dog', y: 133, x: dwx - 14, step: Math.floor(t * 6) });
    for (const c of S.traffic) list.push({ k: 'traffic', y: FAR, x: c.x0 - 105 * (t - c.t0), spr: c.spr });
    list.push({ k: 'hero', y: cy, x: cx });
    // o boneco: anda até o carro, entra; no fim desce e entra na faculdade
    let hb = null;
    if (t < TL.walk0) hb = { x: 150, y: 174, dir: 'right', walk: false };
    else if (t < TL.walk1) hb = { x: lerp(150, 238, (t - TL.walk0) / (TL.walk1 - TL.walk0)), y: 174, dir: 'right', walk: true, dist: (t - TL.walk0) * 26 };
    else if (t < TL.inCar) hb = { x: 238, y: 174, dir: 'up', walk: false, a: 1 - smooth(TL.walk1 + 0.2, TL.inCar, t) };
    else if (t >= TL.out && t < TL.door) hb = { x: lerp(X_STOP + 6, DOOR_X, (t - TL.out) / (TL.door - TL.out)), y: 134, dir: 'right', walk: true, dist: (t - TL.out) * 20, a: smooth(TL.out, TL.out + 0.3, t) };
    else if (t >= TL.door && t < TL.inside) hb = { x: DOOR_X, y: lerp(134, 123, (t - TL.door) / (TL.inside - TL.door)), dir: 'up', walk: true, dist: (t - TL.door) * 20, a: 1 - smooth(TL.door + 0.4, TL.inside, t) };
    if (hb) list.push(Object.assign({ k: 'boneco' }, hb));
    list.sort((a, b) => a.y - b.y || a.x - b.x);

    for (const o of list) {
      if (o.x < x0 - 360 || o.x > x1 + 80) continue;
      switch (o.k) {
        case 'tree': tree(g, o.x, o.y, o.r, o.seed, o.lake ? warm : warm * 0.5); break;
        case 'lamp': lamp(g, o.x, o.y, on, lights); break;
        case 'shed': shed(g, o.x, o.y, o.w, o.h, o.col); break;
        case 'skyfit': skyfit(g, o.x, o.y, on, emit, lights); break;
        case 'fac': faculdade(g, o.x, o.y, on, emit, lights); break;
        case 'tower': tower(g, o.x, o.y, on, lights); break;
        case 'moto': moto(g, o.x, o.y, o.col); break;
        case 'dog': dog(g, o.x, o.y, o.step); break;
        case 'wall':
          R(g, o.x, o.y - 10, o.w, 10, '#c9c2b5'); R(g, o.x, o.y - 10, o.w, 1, '#e0d9cc');
          for (let i = 6; i < o.w; i += 23) R(g, o.x + i, o.y - 8, 3, 6, '#b0a898');
          break;
        case 'island':
          oval(g, o.x, o.y, 37, 8, '#e9ecef');
          oval(g, o.x, o.y, 35, 7, '#9aa3b0');
          oval(g, o.x, o.y - 1, 33, 6, '#4f8a4a');
          tree(g, o.x, o.y + 1, 13, 7, warm * 0.4);
          break;
        case 'parked':
          drawCar(g, S.parkedSpr[o.col], o.x, o.y, o.dir);
          break;
        case 'traffic':
          drawCar(g, o.spr, o.x, o.y, -1);
          if (on > 0.01) lights.push({ beam: true, x: o.x - 25, y: o.y - 9, dir: -1, a: 0.35 * on }, { x: o.x + 25, y: o.y - 9, r: 4, c: [255, 60, 60, 0.7 * on] });
          break;
        case 'hero': {
          drawCar(g, S.cars.hero, o.x, o.y, 1);
          // o boneco sentado aparece pela janela da frente
          if (t > TL.inCar && t < TL.out) {
            const x0c = Math.round(o.x) - 25, by = Math.round(o.y);
            g.save();
            g.beginPath(); g.rect(x0c + 25, by - 18, 11, 5); g.clip();
            g.drawImage(S.hero.right.idle, x0c + 30 - CH.AX, by - 15 - 11);
            g.restore();
          }
          // porta aberta enquanto ele entra / sai
          if ((t > TL.walk1 && t < TL.inCar + 0.2) || (t > TL.stop + 0.2 && t < TL.out + 0.4)) R(g, Math.round(o.x) - 1, Math.round(o.y) - 17, 1, 12, '#f4f6fa');
          const hl = Math.max(on, t > TL.go - 0.5 && t < TL.stop + 0.6 ? 0.15 : 0);
          if (hl > 0.01) lights.push({ beam: true, x: o.x + 25, y: o.y - 9, dir: 1, a: 0.45 * hl }, { x: o.x - 25, y: o.y - 9, r: 4, c: [255, 60, 60, 0.8 * hl] });
          break;
        }
        case 'walker': person(g, walkFrame(o.sheet, o.dir, o.dist), o.x, o.y); break;
        case 'boneco': {
          g.globalAlpha = o.a == null ? 1 : o.a;
          person(g, o.walk ? walkFrame(S.hero, o.dir, o.dist) : S.hero[o.dir].idle, o.x, o.y);
          g.globalAlpha = 1;
          break;
        }
      }
    }

    /* ---- a hora do dia: tudo fica mais quente no pôr do sol e escuro à noite ---- */
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-atop'; // pinta só por cima do que já foi desenhado
    if (warm > 0.02) { g.fillStyle = 'rgba(255,140,70,' + (0.14 * warm).toFixed(3) + ')'; g.fillRect(0, 0, VW, VH); }
    g.fillStyle = 'rgba(8,10,34,' + (0.66 * day).toFixed(3) + ')';
    g.fillRect(0, 0, VW, VH);
    g.globalCompositeOperation = 'source-over';
    g = S.g;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(S.wbuf, 0, 0);

    /* ---- luzes (somam: brilho de neon) ---- */
    g.globalCompositeOperation = 'lighter';
    g.setTransform(1, 0, 0, 1, -cam, oy);
    if (warm > 0.02 && cam + sunX < LAKE_END) glow(g, cam + sunX, WATER + 10, 60, [255, 170, 100, 0.3 * warm]); // luz quente sobre a água
    for (const L of lights) {
      if (L.beam) { beam(g, L.x, L.y, L.dir, 70, L.a); continue; }
      if (L.c[3] <= 0.005) continue;
      if (L.flat) { g.save(); g.translate(L.x, L.y); g.scale(1, 0.35); glow(g, 0, 0, L.r, L.c); g.restore(); }
      else glow(g, L.x, L.y, L.r, L.c);
    }
    g.globalCompositeOperation = 'source-over';
    for (const f of emit) f(g); // letreiros acesos (por cima de tudo)

    /* ---- entrada e saída em preto ---- */
    g.setTransform(1, 0, 0, 1, 0, 0);
    let black = 1 - smooth(0, 1.2, t);
    black = Math.max(black, smooth(TL.fade, TL.end, t));
    if (S.skipAt != null) black = Math.max(black, smooth(S.skipAt, S.skipAt + 0.6, t));
    if (black > 0) { g.fillStyle = 'rgba(0,0,0,' + black.toFixed(3) + ')'; g.fillRect(0, 0, VW, VH); }

    // amplia o canvas pequeno na tela, pixel a pixel
    const ctx = sc.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(S.buf, 0, 0, VW * P, VH * P);

    caption(t, cx);
  }
  function glow(g, x, y, r, c) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + c[3].toFixed(3) + ')');
    gr.addColorStop(1, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',0)');
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // legenda do lugar (canto de baixo)
  function caption(t, cx) {
    let c;
    if (t < TL.go) c = ['Canaã dos Carajás · fim de tarde', 'Lago da Prefeitura · Av. São João'];
    else if (cx < LAKE_END) c = ['Av. São João', 'saindo do Lago da Prefeitura'];
    else if (cx < PA_END) c = ['PA-160', 'Av. Weyne Cavalcante'];
    else if (cx < ROT_END) c = ['Rotatória', 'a caminho da Av. Carajás'];
    else if (cx < CAR_END) c = ['Av. Carajás', 'quase lá'];
    else c = ['Faculdade Serra Dourada', 'Canaã dos Carajás'];
    const key = c.join('|');
    if (key === S.caption) return;
    S.caption = key;
    const el = $('cutCaption');
    el.classList.remove('is-on');
    el.innerHTML = '<b>' + c[0] + '</b><span>' + c[1] + '</span>';
    void el.offsetWidth; // reinicia a animação
    el.classList.add('is-on');
  }

  /* ------------------------------------------------------------------ */
  /* O mapa                                                              */
  /* ------------------------------------------------------------------ */
  // para onde ir no fim: a faculdade quando existir; por enquanto o único mapa pronto (PROVISÓRIO)
  const nextMap = () => (DL.MAPS.faculdade ? 'faculdade' : 'datalab');

  function finish(game) {
    if (S.done) return;
    S.done = true;
    setTimeout(() => game.loadMap(nextMap()), 0);
  }
  function skip() { if (S.skipAt == null && !S.done) S.skipAt = S.t; }

  DL.registerMap({
    id: 'abertura',
    name: 'Abertura',
    // o mundo de verdade não aparece (a cena desenha por cima); só precisa existir
    tiles: ['###', '#.#', '###'],
    items: [],
    spawn: [1, 1],

    enter(game) {
      Object.assign(S, { t: 0, dt: 0, cam: null, done: false, skipAt: null, caption: '' });
      if (!S.statics.length) build();
      game.locked = true; // o jogador só assiste
      document.body.classList.add('in-cutscene');
      $('cutscene').hidden = false;
      $('cutSkip').onclick = skip;
      game.scene.drawInstead = () => { render(game.scene); return true; };
    },
    update(game, dt) {
      S.dt = dt;
      S.t += dt;
      const end = S.skipAt != null ? S.skipAt + 0.7 : TL.end + 0.1;
      if (S.t >= end) finish(game);
    },
    // sem controles: Esc, Enter ou espaço pulam
    key(game, ev) {
      if (ev.code === 'Escape' || ev.code === 'Enter' || ev.code === 'Space') { skip(); ev.preventDefault(); }
      return true;
    },
    leave() {
      document.body.classList.remove('in-cutscene');
      $('cutscene').hidden = true;
      $('cutCaption').classList.remove('is-on');
    },
  });
})();

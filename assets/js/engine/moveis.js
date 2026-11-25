/* Venti Experience — móveis de escritório em pixel art.
   COPIADO do DataLab original (assets/js/sprites.js: drawDesk, drawChair, drawShelf, drawWater,
   drawWhiteboard, drawRug, drawLamp, drawCoffee, drawVase, drawBin) e enxugado: ficou só o que a sala
   do DataLab usa (mesa com 2 monitores, cadeira de escritório, estante de livros, bebedouro, máquina de
   café, quadro branco, tapete, luminária de chão, vaso). Acrescentados aqui: o tapete laranja com a faísca
   e o rack escuro com as faixas de LED ciano (o do print do original), com as luzes piscando devagar.

   O desenho é o mesmo "de frente" do original; o motor isométrico (iso.js) dá o volume sozinho:
   'desk' vira tampo + pernas, 'shelf' e 'water' viram caixas, 'whiteboard' fica em pé, 'rug' deita no chão,
   o resto fica em pé como "billboard". Carregado depois de sprites.js (completa o DL.drawItem). */
(function () {
  'use strict';
  const DL = window.DL, T = DL.T, R = DL.R, hash = DL.hash, shade = DL.shade, C = DL.C;
  const blink = (t, hz, phase) => Math.sin((t * hz + phase) * Math.PI * 2) > 0;
  const flick = (t, seed, rate) => hash(Math.floor(t * rate) * 7919 + seed) > 0.42;

  /* ------------------------------------------------------------------ */
  /* Mesa com computador (do original: desk + setup mono2)              */
  /* ------------------------------------------------------------------ */
  function screen(g, x, y, w, h, t, seed) {
    R(g, x, y, w, h, C.midnight);
    R(g, x + 1, y + 1, 4, 1, C.screenInk);
    for (let i = 0; i < w; i++) {
      const v = (Math.sin(i * 0.9 + t * 0.6 + seed) + 1) / 2;
      R(g, x + i, y + h - 1 - Math.round(v * (h - 3)), 1, 1, C.breeze);
    }
  }
  // o que a tela mostra (do original: workScreen), mais devagar: código, gráfico, rede, servidores
  function workScreen(g, x, y, w, h, t, mode, seed) {
    R(g, x, y, w, h, C.midnight);
    switch (mode) {
      case 'net': {
        R(g, x + 1, y + 1, 3, 1, C.screenInk);
        for (let i = 0; i < w; i++) {
          const v = (Math.sin(i * 0.8 - t * 0.9 + seed) + 1) / 2;
          R(g, x + i, y + h - 1 - Math.round(v * (h - 3)), 1, 1, C.breeze);
        }
        break;
      }
      case 'srv':
        for (let r = 0; r < 3; r++) for (let c = 0; c < Math.floor(w / 3); c++) {
          R(g, x + 1 + c * 3, y + 1 + r * 2, 2, 1, '#1d2a3c');
          R(g, x + 1 + c * 3, y + 1 + r * 2, 1, 1, hash(Math.floor(t * 0.7) * 31 + seed * 5 + r * 7 + c) > 0.15 ? C.ok : C.okDim);
        }
        break;
      case 'code': {
        const off = Math.floor(t * 0.5);
        const rows = Math.floor((h - 1) / 2) + 1;
        for (let j = 0; j < rows; j++) {
          const k = off + j;
          let len = 2 + Math.floor(hash(seed * 31 + k) * (w - 3));
          if (j === rows - 1) len = Math.max(1, Math.min(len, Math.floor(((t * 1.5) % 1) * len) + 1));
          R(g, x + 1 + (k % 3 === 0 ? 0 : 1), y + 1 + j * 2, len, 1, k % 4 === 0 ? C.twilight : k % 3 === 0 ? C.ok : '#5a7398');
        }
        break;
      }
      case 'term': {
        // terminal: algumas linhas de comando subindo devagar e o cursor piscando no fim
        const off = Math.floor(t * 0.25), rows = Math.floor((h - 1) / 2);
        for (let j = 0; j < rows; j++) {
          const k = off + j, len = 2 + Math.floor(hash(seed * 17 + k) * (w - 5));
          R(g, x + 1, y + 1 + j * 2, 1, 1, C.ok);
          R(g, x + 3, y + 1 + j * 2, len, 1, j === rows - 1 ? '#c8d3e0' : '#6f86a6');
        }
        if (Math.floor(t * 1.6) % 2 === 0) R(g, x + 1, y + 1 + rows * 2, 2, 1, '#e8eef5');
        else R(g, x + 1, y + 1 + rows * 2, 1, 1, C.ok);
        break;
      }
      case 'kpi': {
        for (let i = 0; i < 4; i++) {
          const v = 0.35 + 0.5 * (Math.sin(t * 0.35 + i * 1.3 + seed) + 1) / 2;
          const hh = Math.max(1, Math.round(v * (h - 2)));
          R(g, x + 1 + i * 2, y + h - hh, 1, hh, i === 3 ? C.ok : C.breeze);
        }
        R(g, x + 1, y + 1, 3, 1, C.screenInk);
        break;
      }
      default:
        screen(g, x, y, w, h, t, seed);
    }
  }
  const SETUP = { mons: [[4, -16, 11, 10], [17, -16, 11, 10]], main: 0 };
  DL.DESK_SETUPS = DL.DESK_SETUPS || { mono2: { tower: 'under' } }; // (iso.js desenha o gabinete embaixo da mesa)
  function drawDesk(g, e, t) {
    const px = e.px, py = e.py;
    // tampo + pernas (o original: drawDeskTop)
    R(g, px + 1, py + 14, 30, 2, 'rgba(0,0,0,0.3)');
    R(g, px + 2, py + 6, 2, 8, '#15181d');
    R(g, px + 28, py + 6, 2, 8, '#15181d');
    R(g, px, py - 4, 32, 9, '#2a2e36');
    R(g, px, py - 4, 32, 1, '#383d47');
    R(g, px, py + 5, 32, 2, '#1d2027');
    // gabinete embaixo, perto da perna da direita
    const x = px + 21, y = py + 5;
    R(g, x, y, 7, 9, '#14171c'); R(g, x, y, 7, 1, '#262a31'); R(g, x + 6, y, 1, 9, '#0d0f13');
    R(g, x + 1, y + 2, 4, 1, '#2c313a'); R(g, x + 1, y + 4, 4, 1, '#2c313a'); R(g, x + 4, y + 7, 1, 1, C.ok);
    // os 2 monitores, acesos
    SETUP.mons.forEach(([mx0, my, mw, mh], m) => {
      const mx = px + mx0, yy = py + my;
      R(g, mx + Math.floor(mw / 2) - 1, py - 6, 3, 3, '#16191f');
      R(g, mx, yy, mw, mh, '#0c0e12');
      const sx = mx + 1, sy = yy + 1, sw = mw - 2, sh = mh - 3;
      workScreen(g, sx, sy, sw, sh, t, m === 0 ? e.work : e.work2 || 'net', (e.seed || 0) + m * 3);
      R(g, mx, py - 3, mw, 1, 'rgba(160,195,236,0.08)');
    });
    // teclado (com as teclas) e mouse
    R(g, px + 10, py - 1, 11, 2, '#3c424c');
    R(g, px + 10, py - 1, 11, 1, '#4a515d');
    for (let i = 0; i < 5; i++) R(g, px + 11 + i * 2, py, 1, 1, '#2e333c');
    R(g, px + 24, py, 2, 2, '#4a515d'); R(g, px + 24, py, 1, 1, '#626a77');
    for (const o of e.objs || ['caneca']) objetoMesa(g, o, px, py, t, e.seed || 0);
    // post-it na borda do monitor
    if ((e.objs || []).indexOf('postit') >= 0) { R(g, px + 13, py - 15, 2, 2, '#efe39a'); R(g, px + 13, py - 14, 2, 1, '#d9cc82'); }
  }
  // os objetos em cima do tampo (vistos de cima), nos cantos livres da mesa
  const LUGAR = { caneca: [2, -2], papeis: [1, 1], fone: [26, -3], celular: [27, 2], plantinha: [28, -3], postit: [23, 2] };
  function objetoMesa(g, o, px, py, t, seed) {
    const [dx, dy] = LUGAR[o] || [2, -2], x = px + dx, y = py + dy;
    switch (o) {
      case 'caneca': // caneca branca com café, e a alça
        R(g, x, y, 3, 3, '#e3e3df'); R(g, x + 1, y + 1, 1, 1, '#5a3a25'); R(g, x + 3, y + 1, 1, 1, '#c9c9c4');
        break;
      case 'papeis': // folhas um pouco tortas, com linhas
        R(g, x + 1, y, 5, 3, '#cfd2d6'); R(g, x, y + 1, 5, 3, '#ecece8');
        R(g, x + 1, y + 2, 3, 1, '#a9aeb5');
        break;
      case 'fone': // fone de ouvido deitado: arco e as 2 conchas
        R(g, x, y + 1, 1, 2, '#2a2f38'); R(g, x + 4, y + 1, 1, 2, '#2a2f38'); R(g, x + 1, y, 3, 1, '#3a414c');
        R(g, x, y + 3, 1, 1, '#c4673f');
        break;
      case 'celular': // celular com a tela acendendo de vez em quando
        R(g, x, y, 2, 3, '#14171c');
        R(g, x, y, 2, 2, hash(Math.floor(t / 7) * 13 + seed) > 0.6 ? '#5a7fb0' : '#1d222b');
        break;
      case 'plantinha': // vasinho com 3 folhas
        R(g, x, y + 2, 2, 1, '#b8694a');
        R(g, x, y + 1, 2, 1, '#3c8059'); R(g, x + 1, y, 1, 1, '#58a578');
        break;
      case 'postit': // bloquinho de post-it no tampo
        R(g, x, y, 2, 2, '#f0b8c4'); R(g, x, y + 1, 2, 1, '#d9a2ae');
        break;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Cadeira de escritório (do original: drawChair, de costas p/ quem vê) */
  /* ------------------------------------------------------------------ */
  function drawChair(g, e) {
    // (sem cx/cy: desenhada junto com quem está sentado, datalab-gente.js)
    const x = e.cx != null ? e.cx : e.px + 8, y = e.cy != null ? e.cy : e.py + 11;
    R(g, x - 4, y - 1, 8, 1, 'rgba(0,0,0,0.3)');
    R(g, x - 1, y - 4, 2, 3, '#121418');
    R(g, x - 4, y - 2, 8, 1, '#15171c');
    R(g, x - 5, y - 2, 1, 1, '#2a2f38'); R(g, x + 4, y - 2, 1, 1, '#2a2f38');
    R(g, x - 5, y - 8, 10, 4, '#262a33');
    R(g, x - 5, y - 14, 10, 7, '#1d2028');
    R(g, x - 5, y - 14, 10, 1, '#2c313b');
    for (let k = 2; k < 6; k += 2) R(g, x - 4, y - 14 + k, 8, 1, '#23272f'); // a tela da cadeira
    R(g, x - 7, y - 9, 2, 3, '#121418'); R(g, x + 5, y - 9, 2, 3, '#121418'); // braços
  }

  /* ------------------------------------------------------------------ */
  /* Estante de livros (do original: drawShelf, variante livros)        */
  /* ------------------------------------------------------------------ */
  function drawShelf(g, e) {
    const px = e.px, py = e.py, W = e.tw * T;
    const frame = e.color || '#4a3a2c', inner = e.inner || '#1e1813';
    R(g, px + 1, py + 13, W - 1, 2, 'rgba(0,0,0,0.3)');
    R(g, px + 1, py - 20, W - 2, 34, frame);
    R(g, px + 1, py - 20, W - 2, 1, shade(frame, 0.2));
    R(g, px + 3, py - 18, W - 6, 30, inner);
    const cols = ['#4a7fb5', '#9a5b4a', '#3f6f5a', '#c9b79a', '#5d6878', '#8a6a4a', '#6f8f7c', '#b9785a', '#2f4a6a', '#d9d4c7', '#7a4e5a'];
    for (let s = 0; s < 3; s++) {
      const sy = py - 18 + s * 10;
      R(g, px + 3, sy + 9, W - 6, 1, shade(frame, 0.12));
      let x = px + 3;
      for (let k = 0; x < px + W - 3; k++) {
        const r = hash(e.seed * 3 + s * 17 + k), fim = px + W - 3;
        if (r < 0.07) { x += 3; continue; }                         // um vão na prateleira
        if (r < 0.13 && fim - x >= 6) {                             // livros deitados, empilhados
          for (let j = 0; j < 3; j++) R(g, x + (j & 1), sy + 8 - j, 5, 1, cols[(k + j * 3 + s) % cols.length]);
          x += 7; continue;
        }
        if (r < 0.17 && fim - x >= 4) {                             // um enfeite: vasinho ou caixa
          if (k & 1) { R(g, x, sy + 6, 3, 3, '#b8694a'); R(g, x + 1, sy + 3, 1, 3, '#58a578'); R(g, x, sy + 4, 1, 1, '#3c8059'); R(g, x + 2, sy + 4, 1, 1, '#3c8059'); }
          else { R(g, x, sy + 5, 4, 4, '#d9d4c7'); R(g, x, sy + 5, 4, 1, '#efe9df'); }
          x += 5; continue;
        }
        const w = 1 + Math.floor(hash(e.seed * 7 + s * 5 + k) * 2), hh = 4 + Math.floor(hash(e.seed + s * 3 + k * 7) * 5);
        const cor = cols[Math.floor(hash(e.seed * 5 + s * 11 + k * 3) * cols.length)], ww = Math.min(w, fim - x);
        if (r > 0.93 && ww > 0) {                                   // um livro tombado, apoiado no vizinho
          for (let j = 0; j < hh - 1; j++) R(g, x + Math.floor(j / 2), sy + 8 - j, 2, 1, j === hh - 2 ? shade(cor, 0.2) : cor);
          x += Math.ceil(hh / 2) + 1; continue;
        }
        R(g, x, sy + 9 - hh, ww, hh, cor);
        R(g, x, sy + 9 - hh, ww, 1, shade(cor, 0.2));                // topo do livro
        if (hh > 5) R(g, x, sy + 9 - hh + 2, ww, 1, shade(cor, -0.25)); // a faixa da lombada
        x += w + (hash(k * 13 + s) > 0.7 ? 1 : 0);
      }
    }
    if (W > 16) for (let x = px + 16; x < px + W - 2; x += 16) R(g, x - 1, py - 18, 2, 30, frame);
  }

  /* bebedouro, máquina de café, quadro branco, tapete, luminária, vaso (do original) */
  function drawWater(g, e, t) {
    const px = e.px, py = e.py;
    R(g, px + 3, py + 12, 10, 2, 'rgba(0,0,0,0.3)');
    R(g, px + 4, py - 4, 8, 16, '#2a2340');
    R(g, px + 4, py - 4, 8, 1, '#3a3150');
    R(g, px + 11, py - 4, 1, 16, '#1b1729');
    R(g, px + 4, py + 8, 8, 1, '#2ee6ff');
    R(g, px + 6, py, 4, 2, '#2a2f38');
    R(g, px + 7, py + 2, 1, 1, C.breeze);
    R(g, px + 9, py + 2, 1, 1, '#d9786a');
    R(g, px + 5, py - 15, 6, 11, 'rgba(46,230,255,0.35)');
    R(g, px + 5, py - 15, 6, 1, 'rgba(220,235,255,0.7)');
    R(g, px + 6, py - 16, 4, 1, '#3d5a80');
    const b = Math.floor((t * 0.5 + e.seed) % 3);
    R(g, px + 7, py - 6 - b * 3, 1, 1, 'rgba(255,255,255,0.7)');
  }
  function drawCoffee(g, e, t) {
    const px = e.px, py = e.py;
    R(g, px + 4, py - 13, 8, 10, '#22262d');
    R(g, px + 4, py - 13, 8, 1, '#353b45');
    R(g, px + 5, py - 11, 6, 2, '#11141a');
    R(g, px + 10, py - 11, 1, 1, '#9b5cff');
    R(g, px + 6, py - 6, 4, 3, '#e8e8e4');
    R(g, px + 6, py - 6, 4, 1, '#5a3a25');
    for (let k = 0; k < 3; k++) { // o vapor do café, subindo em espiral
      const ph = (t * 0.35 + k / 3) % 1, dx = Math.round(Math.sin(ph * 6 + k) * 1.2);
      g.fillStyle = 'rgba(255,255,255,' + (0.42 * Math.sin(ph * Math.PI)).toFixed(3) + ')';
      g.fillRect(px + 7 + dx, py - 8 - Math.round(ph * 9), ph > 0.5 ? 2 : 1, 1);
    }
  }
  // quadro branco em pé (2 tiles), com um diagrama de rede: internet → roteador → switch → 3 servidores
  // painel de vidro escuro em pé (2 tiles), com o diagrama de rede em neon: internet → roteador → switch → 3 servidores
  function drawWhiteboard(g, e) {
    const px = e.px, py = e.py, ci = '#2ee6ff', vi = '#9b5cff', ink = '#3b6f86';
    R(g, px + 2, py + 12, 28, 2, 'rgba(0,0,0,0.3)');
    R(g, px + 4, py - 4, 1, 17, '#2a2340'); R(g, px + 27, py - 4, 1, 17, '#2a2340');
    R(g, px + 2, py + 12, 5, 1, '#2a2340'); R(g, px + 25, py + 12, 5, 1, '#2a2340');
    R(g, px + 1, py - 21, 30, 18, vi);
    R(g, px + 2, py - 20, 28, 16, '#0f0c1a');
    R(g, px + 13, py - 19, 6, 2, '#5a4a80');
    R(g, px + 15, py - 17, 1, 2, ink);
    R(g, px + 13, py - 15, 6, 2, ci);
    R(g, px + 15, py - 13, 1, 2, ink);
    R(g, px + 11, py - 11, 10, 2, '#c4a5ff');
    R(g, px + 8, py - 9, 16, 1, ink);
    for (const sx of [7, 15, 23]) { R(g, px + sx + 1, py - 8, 1, 1, ink); R(g, px + sx, py - 7, 3, 2, '#1f8fa3'); }
    R(g, px + 3, py - 19, 4, 1, 'rgba(255,255,255,0.15)');
  }
  function drawRug(g, e) {
    const px = e.px, py = e.py, w = e.tw * T, h = e.th * T;
    if (e.variant === 'claude') return drawRugClaude(g, px, py, w, h);
    const base = e.color || '#1d2433';
    R(g, px + 1, py + 1, w - 2, h - 2, base);
    R(g, px + 2, py + 2, w - 4, 1, shade(base, 0.18));
    R(g, px + 2, py + h - 3, w - 4, 1, shade(base, 0.18));
    R(g, px + 2, py + 2, 1, h - 4, shade(base, 0.18));
    R(g, px + w - 3, py + 2, 1, h - 4, shade(base, 0.18));
    for (let i = 6; i < w - 6; i += 4) R(g, px + i, py + 6, 2, h - 12, shade(base, 0.08));
  }
  // o tapete estilo Claude: terracota, borda clara fina e a faísca (asterisco de 8 pontas) no meio
  function drawRugClaude(g, px, py, w, h) {
    const base = '#c4673f', claro = '#f1e4d6', esc = shade(base, -0.18);
    R(g, px + 1, py + 1, w - 2, h - 2, base);
    R(g, px + 1, py + 1, w - 2, 1, esc); R(g, px + 1, py + h - 2, w - 2, 1, esc);
    R(g, px + 1, py + 1, 1, h - 2, esc); R(g, px + w - 2, py + 1, 1, h - 2, esc);
    R(g, px + 3, py + 3, w - 6, 1, shade(base, 0.14)); R(g, px + 3, py + h - 4, w - 6, 1, shade(base, 0.14));
    R(g, px + 3, py + 3, 1, h - 6, shade(base, 0.14)); R(g, px + w - 4, py + 3, 1, h - 6, shade(base, 0.14));
    for (let i = 4; i < w - 4; i += 3) { R(g, px + i, py, 1, 1, claro); R(g, px + i, py + h - 1, 1, 1, claro); } // franja
    // a faísca: raios de comprimentos diferentes, mais grossos perto do centro
    const cx = px + Math.floor(w / 2), cy = py + Math.floor(h / 2);
    // (comprimentos um pouco diferentes, como uma faísca desenhada à mão)
    const raios = [[0, -1, 9], [1, -1, 6], [1, 0, 11], [1, 1, 7], [0, 1, 8], [-1, 1, 6], [-1, 0, 10], [-1, -1, 7]];
    for (const [dx, dy, L] of raios) for (let k = 1; k <= L; k++) {
      R(g, cx + dx * k, cy + dy * k, 1, 1, claro);
      if (k > L - 3) continue; // a ponta fica fina
      if (!dx) R(g, cx - 1, cy + dy * k, 3, 1, claro);       // raio de pé: 3 px de largura
      else if (!dy) R(g, cx + dx * k, cy - 1, 1, 3, claro);  // raio deitado
      else R(g, cx + dx * k - dx, cy + dy * k, 1, 1, claro); // diagonal: 2 px
    }
    R(g, cx - 2, cy - 2, 5, 5, claro);
  }
  // luminária de tubo neon (violeta ou ciano): haste escura e o tubo aceso com um halo
  function drawLamp(g, e) {
    const px = e.px, py = e.py, lc = e.color || '#c4a5ff';
    R(g, px + 4, py + 11, 8, 2, 'rgba(0,0,0,0.3)');
    R(g, px + 5, py + 10, 6, 2, '#16121f');
    R(g, px + 7, py - 6, 2, 16, '#231d33');
    R(g, px + 5, py - 22, 6, 17, 'rgba(' + (lc === '#8ff3ff' ? '46,230,255' : '155,92,255') + ',0.22)'); // halo
    R(g, px + 6, py - 21, 4, 15, lc);
    R(g, px + 7, py - 21, 1, 15, '#ffffff');
    R(g, px + 6, py - 22, 4, 1, '#2a2340'); R(g, px + 6, py - 6, 4, 1, '#2a2340');
  }
  // planta grande (a do sprites.js), com as folhas de cima balançando 1 px, cada uma no seu tempo
  function drawPlanta(g, e, t) {
    const px = e.px, py = e.py, L1 = '#2c5f45', L2 = '#3c8059', L3 = '#58a578';
    const b = (k) => Math.round(Math.sin(t * 0.8 + (e.seed || 0) * 1.7 + k * 1.3) * 0.75);
    R(g, px + 3, py + 13, 11, 2, 'rgba(0,0,0,0.3)');
    R(g, px + 7, py - 10, 2, 13, L1);
    R(g, px + 2 + b(1), py - 6, 5, 3, L2); R(g, px + 9 + b(2), py - 8, 5, 3, L2);
    R(g, px + 3, py - 1, 4, 3, L1); R(g, px + 10, py - 2, 4, 3, L1);
    R(g, px + 5 + b(3), py - 12, 3, 3, L2); R(g, px + 8 + b(4), py - 13, 3, 3, L3);
    R(g, px + 6, py - 4, 4, 3, L2);
    R(g, px + 3 + b(1), py - 6, 2, 1, L3); R(g, px + 11 + b(2), py - 8, 2, 1, L3);
    R(g, px + 4, py + 3, 8, 10, '#2d323b');
    R(g, px + 4, py + 3, 8, 1, '#3d434d');
    R(g, px + 5, py + 4, 6, 1, '#1a1d22');
    R(g, px + 11, py + 4, 1, 9, '#24282f');
  }
  function drawVase(g, e, t) {
    const px = e.px, py = e.py, b = Math.round(Math.sin(t * 0.9 + (e.seed || 0)) * 0.7);
    R(g, px + 5, py - 6, 6, 5, '#3d434d');
    R(g, px + 5, py - 6, 6, 1, '#4a515c');
    R(g, px + 7, py - 12, 2, 6, '#2c5f45');
    R(g, px + 4, py - 11, 3, 2, '#3c8059');
    R(g, px + 9 + b, py - 13, 3, 2, '#58a578');
    R(g, px + 6 + b, py - 14, 2, 2, '#3c8059');
  }

  /* ------------------------------------------------------------------ */
  /* Rack escuro com faixas de LED ciano (o do print do DataLab original) */
  /* ------------------------------------------------------------------ */
  // LEDs calmos: cada um troca no máximo ~1 vez por segundo e só uns 15% piscam
  const calmo = (t, seed) => hash(Math.floor(t * 0.9 + (seed % 7) * 0.13) * 977 + seed) > 0.18;
  // cada LED de atividade com o seu ritmo (0,4 a 2,5 piscadas por segundo); só ~1/3 deles pisca
  function atividade(t, seed) {
    if (hash(seed * 3 + 1) < 0.66) return true;
    const hz = 0.4 + hash(seed * 7 + 2) * 2.1;
    return ((t * hz + hash(seed * 11)) % 1) < 0.55;
  }
  const AZ = '#5fd0ff', AZd = '#1d4a63', VE = '#7ee0a1', VEd = '#245a3c';
  // os servidores de um rack de enfeite: 1U, 2U, painel cego, switch no topo (altura total 27 px)
  const LAYOUTS = new Map();
  function layout(seed) {
    if (LAYOUTS.has(seed)) return LAYOUTS.get(seed);
    const out = [];
    let y = 0, n = 0;
    while (y < 26) {
      const r = hash(seed * 17 + n * 13);
      const tipo = n === 0 ? 'switch' : r < 0.32 ? '2U' : r < 0.82 ? '1U' : 'vazio';
      const h = tipo === '2U' ? 5 : 2;
      if (y + h > 27) break;
      out.push({ y, h, tipo, s: seed * 31 + n * 7 });
      y += h + 1; n++;
    }
    LAYOUTS.set(seed, out);
    return out;
  }
  // a grade da porta (furinhos), feita uma vez só
  let GRADE = null;
  function grade() {
    if (GRADE) return GRADE;
    GRADE = DL.mk(10, 28);
    const g = GRADE.getContext('2d');
    for (let y = 0; y < 28; y++) for (let x = (y % 2); x < 10; x += 2) R(g, x, y, 1, 1, 'rgba(6,8,12,0.38)');
    // um reflexo bem leve no vidro escuro
    for (let k = 0; k < 6; k++) R(g, 7 - Math.floor(k / 2), 2 + k, 1, 1, 'rgba(200,225,255,0.10)');
    return GRADE;
  }
  function servidor(g, x, y, u, t) {
    if (u.tipo === 'vazio') { R(g, x, y, 10, 2, '#1a1f27'); R(g, x + 1, y + 1, 8, 1, '#151a21'); return; }
    if (u.tipo === 'switch') {
      R(g, x, y, 10, 2, '#1f252e'); R(g, x, y, 10, 1, '#2b323d');
      for (let i = 0; i < 4; i++) R(g, x + 1 + i * 2, y + 1, 1, 1, atividade(t, u.s + i) ? VE : VEd);
      return;
    }
    const h = u.h;
    R(g, x, y, 10, h, '#161b22'); R(g, x, y, 10, 1, '#222932');
    if (h > 2) for (let j = 0; j < 2; j++) for (let i = 0; i < 4; i++) R(g, x + 1 + i * 2, y + 2 + j * 2, 1, 1, '#2a313b'); // gavetas de disco
    else R(g, x + 1, y + 1, 5, 1, '#0e1217');
    R(g, x + 1, y, 2, 1, '#c8ccd2');                                     // etiqueta
    R(g, x + 8, y + (h > 2 ? 1 : 0), 1, 1, hash(u.s) > 0.5 ? AZ : VE);   // ligado
    R(g, x + 8, y + (h > 2 ? 3 : 1), 1, 1, atividade(t, u.s) ? AZ : AZd); // atividade
  }
  function drawRackCiano(g, e, t) {
    const px = e.px, py = e.py, CI = '#38c6e8', CId = '#1b5f73';
    R(g, px + 1, py + 14, 15, 2, 'rgba(0,0,0,0.35)');
    // o teto do rack, com a etiqueta pequena (verde no RACK-01 da missão)
    R(g, px, py - 24, 16, 6, '#1c2028');
    R(g, px, py - 24, 16, 1, '#2a303a');
    for (let x = px + 2; x < px + 10; x += 2) R(g, x, py - 22, 1, 2, '#141820'); // ventilação
    R(g, px + 11, py - 23, 4, 2, e.tag || '#3a414c');
    if (!e.tag) R(g, px + 12, py - 22, 2, 1, '#9aa3b0');
    // o corpo e o vão da porta
    R(g, px, py - 18, 16, 32, '#111419');
    R(g, px + 15, py - 18, 1, 32, '#07080b');
    R(g, px + 3, py - 16, 10, 28, '#080a0d');
    // as faixas de LED das laterais (ciano, como no original)
    for (const fx of [1, 14]) {
      R(g, px + fx, py - 16, 1, 28, CI);
      R(g, px + fx, py - 16, 1, 2, CId); R(g, px + fx, py + 10, 1, 2, CId);
      R(g, px + fx, py - 6, 1, 6, '#8fe6fa');
    }
    if (e.tag || e.unitState) {
      // o rack da missão: 9 posições fixas (o painel do rack usa as mesmas)
      for (let k = 0; k < 9; k++) {
        const uy = py - 15 + k * 3, u = e.units ? e.units[k] : null, st = e.unitState && e.unitState[k];
        if (!u) { R(g, px + 3, uy, 10, 2, '#0d1014'); R(g, px + 4, uy + 1, 1, 1, '#1a1f27'); R(g, px + 11, uy + 1, 1, 1, '#1a1f27'); continue; }
        if (u === 'switch') {
          R(g, px + 3, uy, 10, 2, '#1f252e'); R(g, px + 3, uy, 10, 1, '#2b323d');
          for (let i = 0; i < 4; i++) R(g, px + 4 + i * 2, uy + 1, 1, 1, calmo(t, e.seed * 7 + k * 5 + i) ? VE : VEd);
          continue;
        }
        R(g, px + 3, uy, 10, 2, '#161b22'); R(g, px + 3, uy, 10, 1, '#20262f');
        R(g, px + 4, uy + 1, 5, 1, '#0e1217'); R(g, px + 4, uy, 2, 1, '#c8ccd2');
        if (st === 'new') { R(g, px + 10, uy, 1, 1, '#c98a3c'); R(g, px + 12, uy, 1, 1, '#2a2f37'); }
        else if (st === 'link') { R(g, px + 10, uy, 1, 1, C.ok); R(g, px + 12, uy, 1, 1, blink(t, 0.8, k * 0.2) ? '#c98a3c' : '#2a2f37'); }
        else { R(g, px + 10, uy, 1, 1, AZ); R(g, px + 12, uy, 1, 1, calmo(t, e.seed * 13 + k) ? AZ : AZd); }
      }
    } else {
      for (const u of layout(e.seed)) servidor(g, px + 3, py - 15 + u.y, u, t);
    }
    if (e.cableLook === 'tidy') {
      R(g, px + 12, py - 15, 1, 26, '#4a7fb5');
      for (let y = py - 13; y < py + 10; y += 6) R(g, px + 12, y, 1, 1, '#c8ccd2');
    }
    // a porta: grade de vidro escuro por cima, dobradiças e o puxador
    g.drawImage(grade(), px + 3, py - 16);
    R(g, px + 3, py - 16, 10, 1, '#1a1f27'); R(g, px + 3, py + 11, 10, 1, '#1a1f27');
    R(g, px + 2, py - 13, 1, 2, '#3a414c'); R(g, px + 2, py + 6, 1, 2, '#3a414c');
    R(g, px + 13, py - 3, 1, 4, '#8a919c'); R(g, px + 13, py - 3, 1, 1, '#c3c8cf');
  }

  /* ------------------------------------------------------------------ */
  const antes = DL.drawItem;
  DL.drawItem = function (g, e, t) {
    switch (e.kind) {
      case 'desk': return drawDesk(g, e, t);
      case 'chair': return drawChair(g, e);
      case 'shelf': return drawShelf(g, e);
      case 'water': return drawWater(g, e, t);
      case 'coffee': return drawCoffee(g, e, t);
      case 'whiteboard': return drawWhiteboard(g, e);
      case 'rug': return drawRug(g, e);
      case 'lamp': return drawLamp(g, e);
      case 'vase': return drawVase(g, e, t);
      case 'plant': return drawPlanta(g, e, t);
      case 'rack': if (e.ciano) return drawRackCiano(g, e, t); // falls through
      default: return antes(g, e, t);
    }
  };
})();

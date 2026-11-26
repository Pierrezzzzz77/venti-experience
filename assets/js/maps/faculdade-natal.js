/* Venti Experience — Natal na Faculdade Serra Dourada (por dentro).
   1. Uma árvore de Natal grande ao lado da parede de ripas laranja com o logo (a primeira que se vê ao entrar):
      camadas de galhos com luz e sombra, festão dourado, bolas (com o laranja da Serra), laços, a estrela no
      topo e pisca-pisca que acende em ondas; saia vermelha e presentes no pé.
   2. Um totem "Mapa da faculdade" perto da porta de vidro, com um "!" amarelo flutuando em cima: com E abre a
      planta da faculdade (feita a partir do próprio mapa), com o "você está aqui" piscando onde o jogador está.
   Tudo é acrescentado de fora no mapa da faculdade (faculdade.js não muda); carregado depois de rua.js. */
(function () {
  'use strict';
  const DL = window.DL, fac = DL.MAPS && DL.MAPS.faculdade;
  if (!fac || fac._natal) return;
  fac._natal = true;
  const T = DL.T, R = DL.R, hash = DL.hash, K = DL.isoKit, A = DL.Arte;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ------------------------------------------------------------------ */
  /* A árvore                                                            */
  /* ------------------------------------------------------------------ */
  const AW = 60, AH = 76, CX = 30, CHAO = 70; // o sprite: o pé da árvore fica em (CX, CHAO)
  const CAMADAS = [ // [topo, base, meia largura na base] — de cima para baixo, cada uma por cima da de baixo
    [9, 21, 8], [15, 30, 12], [22, 39, 15], [30, 48, 18], [38, 57, 21], [46, 64, 24],
  ];
  const BOLAS = ['#d23a32', '#e8b030', '#3a6ed8', '#e2701c', '#cfd6e0', '#b0306a'];
  let ARV = null; // { c, luzes: [[x, y, cor]] }
  function fazArvore() {
    if (ARV) return ARV;
    const c = DL.mk(AW, AH), g = c.getContext('2d'), luzes = [];
    const dentro = (x, y) => { // está dentro de alguma camada?
      for (const [t, b, w] of CAMADAS) if (y >= t && y <= b) { const hw = ((y - t) / (b - t)) * w; if (Math.abs(x - CX) <= hw) return true; }
      return false;
    };
    // o tronco e a saia (um disco vermelho com a barra branca, visto de cima de lado)
    R(g, CX - 3, 60, 6, 9, '#5a3a22'); R(g, CX - 3, 60, 2, 9, '#7a5232');
    for (let y = -5; y <= 5; y++) { const hw = Math.round(Math.sqrt(1 - (y / 5.5) ** 2) * 20); R(g, CX - hw, CHAO + y - 1, hw * 2, 1, y < -1 ? '#c8322c' : y < 3 ? '#a82722' : '#7e1c18'); }
    for (let x = -20; x <= 20; x += 2) { const y = Math.round(Math.sqrt(Math.max(0, 1 - (x / 20.5) ** 2)) * 5); R(g, CX + x, CHAO + y - 1, 2, 1, '#f4efe2'); }
    // as camadas, de baixo para cima (a de cima cobre a base da de baixo)
    for (let i = CAMADAS.length - 1; i >= 0; i--) {
      const [t, b, w] = CAMADAS[i];
      for (let y = t; y <= b + 3; y++) {
        let hw = ((y - t) / (b - t)) * w;
        for (let x = -w - 1; x <= w + 1; x++) {
          // a borda de baixo em pontas (galhos caindo): um dente a cada 4 px
          const dente = 3 - Math.abs(((x + 400) % 4) - 2) * 1.5;
          if (y > b && (y - b > dente || Math.abs(x) > w - 1)) continue;
          if (y <= b && Math.abs(x) > hw) continue;
          const u = x / Math.max(1, w); // -1 esquerda (a luz vem da esquerda) .. 1 direita
          let cor = u < -0.45 ? '#2f7a44' : u < 0.05 ? '#24653a' : u < 0.5 ? '#1d5532' : '#164428';
          if (y > b - 2) cor = '#143c24';                                // o escuro embaixo de cada camada
          const h = hash(x * 13 + y * 7 + i * 31);
          if (h > 0.86) cor = u < 0 ? '#3d9152' : '#2a6e40';            // agulhas claras
          else if (h < 0.07) cor = '#10331e';                            // e escuras
          R(g, CX + x, y, 1, 1, cor);
        }
      }
      // o festão dourado: uma curva caída de um lado ao outro da camada
      for (let x = -w + 3; x <= w - 3; x++) {
        const y = Math.round(t + (b - t) * 0.55 + (x / w) * 3 + Math.sin((x / w) * Math.PI) * -2 + ((x * x) / (w * w)) * 3);
        if (!dentro(CX + x, y)) continue;
        R(g, CX + x, y, 1, 1, (x & 1) ? '#e8c04a' : '#c99a2e'); if (x % 3 === 0) R(g, CX + x, y - 1, 1, 1, '#fff2a8');
      }
      // pontos do pisca-pisca nesta camada (ficam na luz de cima, acesos a cada quadro)
      for (let k = 0; k < 3 + i; k++) {
        const fx = (k + 0.5) / (3 + i) * 2 - 1, y = Math.round(t + (b - t) * 0.82 + Math.abs(fx) * -2), x = Math.round(fx * ((y - t) / (b - t)) * w * 0.86);
        if (dentro(CX + x, y)) luzes.push([CX + x, y, k + i * 7]);
      }
    }
    // bolas (com brilho e sombra) e laços vermelhos
    let n = 0;
    for (let s = 0; s < 400 && n < 26; s++) {
      const y = 14 + Math.floor(hash(s * 3.1) * 50), x = CX + Math.round((hash(s * 5.7) - 0.5) * 46);
      if (!dentro(x - 1, y - 1) || !dentro(x + 2, y + 2)) continue;
      if (luzes.some(([lx, ly]) => Math.abs(lx - x) < 3 && Math.abs(ly - y) < 3)) continue;
      const cor = BOLAS[n % BOLAS.length];
      if (n % 7 === 6) { R(g, x - 1, y, 1, 2, '#d23a32'); R(g, x + 2, y, 1, 2, '#d23a32'); R(g, x, y + 1, 2, 1, '#9e2620'); R(g, x, y + 2, 1, 2, '#b82a2a'); R(g, x + 1, y + 2, 1, 2, '#b82a2a'); }
      else { R(g, x, y - 1, 2, 1, '#8a8f98'); R(g, x - 1, y, 4, 3, cor); R(g, x, y + 3, 2, 1, cor); R(g, x - 1, y + 2, 4, 1, DL.shade ? DL.shade(cor, -0.3) : '#333'); R(g, x, y, 1, 1, '#ffffff'); }
      n++;
    }
    // a estrela no topo (dourada, com contorno)
    const est = ['....#....', '...###...', '#########', '.#######.', '..#####..', '.###.###.', '.##...##.'];
    est.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === '#') R(g, CX - 4 + i, 1 + j, 1, 1, j < 2 || i === 4 ? '#fff2a8' : '#f2c14e'); });
    R(g, CX - 1, 8, 2, 2, '#c99a2e');
    // os presentes no pé (na frente da saia)
    const presente = (x, y, w, h, cor, fita) => {
      R(g, x, y, w, h, cor); R(g, x, y, w, 2, DL.shade ? DL.shade(cor, 0.25) : cor); R(g, x + w - 2, y + 2, 2, h - 2, DL.shade ? DL.shade(cor, -0.25) : cor);
      R(g, x + (w >> 1), y, 1, h, fita); R(g, x, y + 1, w, 1, fita); R(g, x + (w >> 1) - 2, y - 2, 2, 2, fita); R(g, x + (w >> 1) + 1, y - 2, 2, 2, fita);
    };
    presente(CX - 19, 63, 10, 8, '#2f8a52', '#f2c14e');
    presente(CX - 8, 66, 8, 7, '#3a6ed8', '#f4f6fa');
    presente(CX + 2, 62, 11, 10, '#d23a32', '#f2c14e');
    presente(CX + 13, 66, 7, 6, '#e2701c', '#f4f6fa');
    ARV = { c, luzes };
    return ARV;
  }
  // um pontinho de luz com halo (feito uma vez por cor)
  const HALOS = {};
  function halo(rgb) {
    if (HALOS[rgb]) return HALOS[rgb];
    const c = DL.mk(16, 16), g = c.getContext('2d'), gr = g.createRadialGradient(8, 8, 0, 8, 8, 8);
    gr.addColorStop(0, 'rgba(' + rgb + ',0.9)'); gr.addColorStop(0.35, 'rgba(' + rgb + ',0.35)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
    g.fillStyle = gr; g.fillRect(0, 0, 16, 16);
    return (HALOS[rgb] = c);
  }
  const PISCA = [['255,236,170', '#fff4c8'], ['255,80,70', '#ff6a5a'], ['90,230,120', '#7dff9a'], ['90,150,255', '#9cc2ff'], ['255,170,60', '#ffc070']];
  function desenhaArvore(g, sc, e, t) {
    const a = fazArvore();
    t = t || 0;
    K.isoT(g, sc);
    // o pé: no meio da base (2 × 2 tiles)
    const mx = e.px + e.tw * 8, my = e.py + e.th * 8, X = Math.round(mx - my), Y = Math.round((mx + my) / 2);
    const x0 = X - CX, y0 = Y - CHAO;
    g.fillStyle = 'rgba(40,24,10,0.22)'; g.beginPath(); g.ellipse(X, Y + 1, 26, 8, 0, 0, Math.PI * 2); g.fill();
    g.drawImage(a.c, x0, y0);
    // o pisca-pisca: cada lâmpada tem a sua cor e acende numa onda que desce a árvore
    g.globalCompositeOperation = 'lighter';
    for (const [lx, ly, k] of a.luzes) {
      const [rgb, cor] = PISCA[k % PISCA.length], onda = 0.5 + 0.5 * Math.sin(t * 2.4 - ly * 0.18 + k * 1.7), on = 0.35 + 0.65 * onda;
      g.globalAlpha = on; g.drawImage(halo(rgb), x0 + lx - 4, y0 + ly - 4, 9, 9);
      g.globalAlpha = 1; g.fillStyle = on > 0.6 ? cor : 'rgba(' + rgb + ',0.55)'; g.fillRect(x0 + lx, y0 + ly, 1, 1);
    }
    // a estrela brilha devagar
    const k = 0.75 + 0.25 * Math.sin(t * 1.6);
    g.globalAlpha = 0.55 * k; g.drawImage(halo('255,226,140'), x0 + CX - 12, y0 + 4 - 12, 24, 24);
    g.globalAlpha = 0.25 * k; g.drawImage(halo('255,214,150'), x0 + CX - 30, y0 + 30 - 30, 60, 60); // a luz quente em volta da árvore
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }

  /* ------------------------------------------------------------------ */
  /* O totem do mapa e o "!"                                             */
  /* ------------------------------------------------------------------ */
  let TOTEM = null;
  function fazTotem() {
    if (TOTEM) return TOTEM;
    const c = DL.mk(28, 46), g = c.getContext('2d');
    R(g, 4, 30, 2, 15, '#4a4f5c'); R(g, 22, 30, 2, 15, '#4a4f5c'); R(g, 4, 30, 1, 15, '#6b7080'); R(g, 22, 30, 1, 15, '#6b7080'); // os pés
    R(g, 2, 44, 6, 2, '#2a2d37'); R(g, 20, 44, 6, 2, '#2a2d37');
    R(g, 0, 2, 28, 30, '#2a2f38');                    // a moldura
    R(g, 1, 3, 26, 5, '#e2701c'); R(g, 1, 3, 26, 1, '#f5975a'); // a faixa laranja da Serra
    if (A && A.text) A.text(g, 'MAPA', 6, 4, 1, '#ffffff');
    R(g, 2, 9, 24, 21, '#f4efe2');                    // o papel
    // uma plantinha da faculdade, bem simples (o saguão, o corredor, as mesas)
    R(g, 4, 11, 20, 1, '#3a3f4a'); R(g, 4, 28, 20, 1, '#3a3f4a'); R(g, 4, 11, 1, 18, '#3a3f4a'); R(g, 23, 11, 1, 18, '#3a3f4a');
    R(g, 5, 12, 18, 16, '#d9c2a0'); R(g, 5, 18, 11, 1, '#3a3f4a'); R(g, 15, 12, 1, 5, '#3a3f4a'); R(g, 10, 22, 1, 6, '#3a3f4a');
    R(g, 7, 24, 7, 2, '#b8bcc4'); R(g, 17, 19, 5, 6, '#e2701c'); R(g, 18, 26, 1, 1, '#d23a32'); R(g, 19, 26, 1, 1, '#d23a32');
    R(g, 0, 31, 28, 1, '#161a20');
    TOTEM = c;
    return c;
  }
  const EXCL = ['###', '###', '###', '###', '###', '.#.', '.#.', '...', '###', '###']; // o "!" (3 px de largura)
  function desenhaTotem(g, sc, e, t) {
    t = t || 0;
    K.isoT(g, sc);
    const mx = e.px + 8, my = e.py + 8, X = Math.round(mx - my), Y = Math.round((mx + my) / 2), c = fazTotem();
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(X - 12, Y - 1, 24, 3);
    g.drawImage(c, X - 14, Y - c.height + 1);
    // o papel acende de leve (luz de dentro do totem)
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.12; g.fillStyle = '#ffe2b0'; g.fillRect(X - 12, Y - c.height + 10, 24, 21); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    // o "!" amarelo, flutuando e pulsando em cima do totem
    const by = Math.round(Y - c.height - 16 + Math.sin(t * 3) * 2), bx = X - 3;
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5 + 0.2 * Math.sin(t * 6); g.drawImage(halo('255,210,60'), bx - 7, by - 4, 20, 20); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    const px = (cor, dx, dy) => EXCL.forEach((row, j) => { for (let i = 0; i < 3; i++) if (row[i] === '#') R(g, bx + 1 + i + dx, by + j + dy, 1, 1, cor); });
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) px('#2a1c08', dx, dy);              // contorno escuro
    px('#f2c14e', 0, 0); R(g, bx + 1, by, 1, 5, '#fff2a8');                                       // amarelo, com o brilho
  }

  /* ------------------------------------------------------------------ */
  /* O painel com a planta da faculdade                                  */
  const st = { aberto: false, t: 0, t0: 0, cache: null };
  // a planta: tudo em coordenadas de tile do mapa (já com o deslocamento de 3 colunas)
  const ZONAS = [ // [nome, cor, retângulos [x, y, w, h]] (a primeira que contém o jogador dá o "você está em")
    ['Coordenação', '#f8d2b4', [[14, 21, 5, 4]]],
    ['Sala de reunião', '#d6e6d6', [[1, 28, 7, 9]]],
    ['Corredor das salas', '#e4e1dc', [[15, 1, 3, 16]]],
    ['Mesas de estudo', '#dbe7ef', [[8, 28, 14, 9]]],
    ['Saguão', '#f5e2c6', [[22, 17, 7, 21], [19, 21, 3, 7]]],
    ['Corredor', '#e4e1dc', [[1, 17, 21, 4], [1, 21, 3, 7]]],
  ];
  // as salas atrás das portas (fora do mapa jogável): [nome, x0, y0, x1, y1, cor]
  const SALAS = [
    ['Sala 1 · ADS', 18.35, 13, 24.5, 17, '#cfe0f2'], ['Sala 4', 18.35, 9, 24.5, 12.8, '#e9e6f2'], ['Sala 6', 18.35, 5, 24.5, 8.8, '#e9e6f2'], ['Sala 8', 18.35, 1, 24.5, 4.8, '#e9e6f2'],
    ['Sala 3', 8.6, 9, 14.65, 12.8, '#e9e6f2'], ['Sala 5', 8.6, 5, 14.65, 8.8, '#e9e6f2'], ['Sala 7', 8.6, 1, 14.65, 4.8, '#e9e6f2'],
    ['Sala 2 · Saúde', 1, 10.6, 8.3, 16.65, '#d9ecd9'], ['WC', -2.3, 17.3, 0.65, 20.7, '#d7ecf4'],
    ['Estudo 3', 8, 25.35, 10.45, 27.65, '#efe3cf'], ['Estudo 2', 10.55, 25.35, 13, 27.65, '#efe3cf'], ['Estudo 1', 13.1, 25.35, 15.55, 27.65, '#efe3cf'],
  ];
  // as portas: [x0, y0, x1, y1] (um traço sobre a parede)
  const PORTAS = [
    [18, 15.15, 18, 15.85], [18, 11.15, 18, 11.85], [18, 7.15, 18, 7.85], [18, 3.15, 18, 3.85],
    [15, 11.15, 15, 11.85], [15, 7.15, 15, 7.85], [15, 3.15, 15, 3.85],
    [3.15, 17, 3.85, 17], [1, 18.15, 1, 18.85], [2.15, 28, 2.85, 28], [14, 23.15, 14, 23.85],
    [14.55, 25, 15.35, 25], [16.35, 25, 17.15, 25], [8.6, 28, 10, 28], [11.1, 28, 12.5, 28], [13.6, 28, 15, 28], [8, 31.1, 8, 32.9],
  ];
  const piso = (k) => k && k !== '#' && k !== 'x';
  const naZona = (x, y) => { for (const [nome, , rs] of ZONAS) for (const [rx, ry, rw, rh] of rs) if (x >= rx && x < rx + rw && y >= ry && y < ry + rh) return nome; return 'Faculdade'; };
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  const FONTE = '"Segoe UI", system-ui, -apple-system, sans-serif';
  const X0 = -2.8, Y0 = 0.4, PW = 32.2, PH = 38.2; // a área da planta, em tiles

  // a planta parada (desenhada uma vez para cada tamanho de tela)
  function plantaFixa(s, items) {
    const tiles = fac.tiles, W = tiles[0].length, H = tiles.length;
    const c = DL.mk(Math.ceil(PW * s), Math.ceil(PH * s)), g = c.getContext('2d');
    const P = (x) => Math.round((x - X0) * s), Q = (y) => Math.round((y - Y0) * s);
    const canto = (x, y) => x >= 23 && y >= 33; // o canto da porta de vidro, em diagonal
    const lw = Math.max(2, Math.round(s * 0.2));
    // as salas atrás das portas
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const [nome, x0, y0, x1, y1, cor] of SALAS) {
      rr(g, P(x0), Q(y0), P(x1) - P(x0), Q(y1) - Q(y0), Math.max(3, s * 0.3));
      g.fillStyle = cor; g.fill(); g.lineWidth = Math.max(1.5, s * 0.12); g.strokeStyle = '#9aa3b2'; g.stroke();
      const fs = Math.round(clamp(s * (nome.length > 9 ? 0.56 : 0.62), 10, 18));
      g.font = '600 ' + fs + 'px ' + FONTE; g.fillStyle = '#4a5363';
      if (nome.startsWith('Estudo')) { g.font = '600 ' + Math.round(clamp(s * 0.42, 8, 13)) + 'px ' + FONTE; g.fillText(nome, (P(x0) + P(x1)) / 2, (Q(y0) + Q(y1)) / 2); }
      else g.fillText(nome, (P(x0) + P(x1)) / 2, (Q(y0) + Q(y1)) / 2);
    }
    // o chão (com a sombra da planta)
    const chao = new Path2D();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (piso(tiles[y][x]) && !canto(x, y)) chao.rect(P(x), Q(y), P(x + 1) - P(x), Q(y + 1) - Q(y));
    chao.moveTo(P(23), Q(33)); chao.lineTo(P(28), Q(33)); chao.lineTo(P(28), Q(34)); chao.lineTo(P(25), Q(37)); chao.lineTo(P(23), Q(37)); chao.closePath();
    g.save(); g.shadowColor = 'rgba(20,28,40,0.25)'; g.shadowBlur = s * 0.8; g.shadowOffsetY = s * 0.2; g.fillStyle = '#ece7df'; g.fill(chao); g.restore();
    // as zonas, cada uma com a sua cor (só dentro do chão)
    g.save(); g.clip(chao);
    for (let i = ZONAS.length - 1; i >= 0; i--) { const [, cor, rs] = ZONAS[i]; g.fillStyle = cor; for (const [x, y, w, h] of rs) g.fillRect(P(x), Q(y), P(x + w) - P(x), Q(y + h) - Q(y)); }
    // o piso tátil: uma trilha de pontinhos
    g.fillStyle = 'rgba(196,150,52,0.55)';
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (tiles[y][x] === 'G') { g.beginPath(); g.arc((P(x) + P(x + 1)) / 2, (Q(y) + Q(y + 1)) / 2, Math.max(1.2, s * 0.1), 0, Math.PI * 2); g.fill(); }
    // os móveis principais: as mesas (cinza claro) e o tapete do saguão
    for (const e of items) {
      if (e.kind !== 'table') continue;
      const x0 = P(e.tx + 0.12), y0 = Q(e.ty + 0.18), w = P(e.tx + (e.tw || 1) - 0.12) - x0, h = Q(e.ty + (e.th || 1) - 0.18) - y0;
      g.fillStyle = '#b9b2a6';
      if (e.id === 'MESA-COORD') { g.beginPath(); g.arc(x0 + w / 2, y0 + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2); g.fill(); }
      else { rr(g, x0, y0, w, h, Math.max(2, s * 0.15)); g.fill(); }
    }
    g.restore();
    // as paredes: a borda do chão (a vidraça da fachada em azul)
    g.lineCap = 'square';
    const parede = (x0, y0, x1, y1, vidro) => { g.strokeStyle = vidro ? '#7fb6dc' : '#39414f'; g.lineWidth = vidro ? lw + 1 : lw; g.beginPath(); g.moveTo(P(x0), Q(y0)); g.lineTo(P(x1), Q(y1)); g.stroke(); };
    const T_ = (x, y) => (tiles[y] || '')[x];
    // (as bordas de cada tile viram traços compridos, emendados: sem pontilhado nas juntas)
    const hor = {}, ver = {}, marca = (m, k, i, v) => ((m[k] = m[k] || {})[i] = v);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!piso(T_(x, y)) || canto(x, y)) continue;
      const lado = (xx, yy) => !piso(T_(xx, yy)) && !canto(xx, yy);
      if (lado(x - 1, y)) marca(ver, x, y, T_(x - 1, y) === 'x' ? 2 : 1);
      if (lado(x + 1, y)) marca(ver, x + 1, y, T_(x + 1, y) === 'x' ? 2 : 1);
      if (lado(x, y - 1)) marca(hor, y, x, 1);
      if (lado(x, y + 1)) marca(hor, y + 1, x, 1);
    }
    const emenda = (m, h) => { for (const k in m) { const L = m[k]; let a = null, v = 0;
      for (let i = -1; i <= Math.max(W, H) + 1; i++) { const c = L[i] || 0;
        if (c !== v) { if (v) (h ? parede(a, +k, i, +k, v === 2) : parede(+k, a, +k, i, v === 2)); a = i; v = c; } } } };
    emenda(hor, true); emenda(ver, false);
    // as paredes que não são tiles: a da coordenação, a do logo e a de vidro da sala de reunião
    parede(14, 21, 19, 21); parede(23, 37, 25, 37); parede(23, 33, 23, 33);
    parede(8, 28, 8, 31.1, true); parede(8, 32.9, 8, 37, true);
    parede(28, 33, 28, 34, true); parede(28, 34, 25, 37, true);
    g.strokeStyle = '#e2701c'; g.lineWidth = lw + 2; g.beginPath(); g.moveTo(P(19), Q(25.1)); g.lineTo(P(19), Q(27.9)); g.stroke(); // o logo
    // as portas (traços laranja sobre a parede) e a porta de vidro da entrada
    g.lineCap = 'round';
    for (const [x0, y0, x1, y1] of PORTAS) { g.strokeStyle = '#ece7df'; g.lineWidth = lw + 2; g.beginPath(); g.moveTo(P(x0), Q(y0)); g.lineTo(P(x1), Q(y1)); g.stroke(); g.strokeStyle = '#e2701c'; g.lineWidth = Math.max(2, lw - 1); g.stroke(); }
    g.strokeStyle = '#ece7df'; g.lineWidth = lw + 3; g.beginPath(); g.moveTo(P(27.3), Q(34.7)); g.lineTo(P(25.7), Q(36.3)); g.stroke();
    g.strokeStyle = '#2fa86b'; g.lineWidth = lw + 1; g.stroke();
    // os nomes das áreas
    const nome = (txt, x, y, fs, cor, rot) => {
      g.save(); g.translate(P(x), Q(y)); if (rot) g.rotate(rot);
      g.font = '700 ' + Math.round(fs) + 'px ' + FONTE; g.fillStyle = cor || '#2d3442'; g.fillText(txt, 0, 0); g.restore();
    };
    const F = clamp(s * 0.62, 10, 19);
    nome('Saguão', 25, 31.3, F); nome('Mesas de estudo', 14.5, 34.5, F); nome('Coordenação', 16.5, 24.15, F * 0.82);
    nome('Corredor', 9.5, 19.6, F); nome('Corredor das salas', 16.5, 8.2, F * 0.85, null, -Math.PI / 2);
    nome('Reunião', 4.5, 32, F * 0.9); nome('Convivência', 25, 22, F * 0.8, '#6b5a40');
    nome('ENTRADA', 27.6, 37.2, F * 0.8, '#2fa86b');
    nome('logo', 20.2, 26.5, F * 0.62, '#c25a12', -Math.PI / 2);
    return c;
  }
  function desenhaPainel(g, sc, game) {
    const cw = sc.canvas.width, ch = sc.canvas.height, k = clamp((st.t - st.t0) / 0.18, 0, 1), ease = 1 - (1 - k) * (1 - k);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = 'rgba(8,11,18,' + (0.62 * ease).toFixed(3) + ')'; g.fillRect(0, 0, cw, ch);
    // o tamanho: a maior planta que cabe na tela
    const u = Math.max(1, ch / 720); // (a unidade das margens e textos: 1 numa tela de 720 px de altura)
    const head = 62 * u, foot = 40 * u, pad = 22 * u;
    const s = Math.min((ch * 0.94 - head - foot - pad * 2) / PH, (cw * 0.92 - pad * 2) / PW);
    const pw = Math.ceil(PW * s), ph = Math.ceil(PH * s), bw = Math.round(Math.max(pw + pad * 2, Math.min(cw * 0.96, 640 * u))), bh = ph + head + foot + pad;
    const bx = Math.round((cw - bw) / 2), by = Math.round((ch - bh) / 2 + (1 - ease) * 18 * u);
    if (!st.cache || st.cache.s !== s) st.cache = { s, c: plantaFixa(s, game.world.items) };
    g.globalAlpha = ease;
    // o cartão
    g.save(); g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 30 * u; g.shadowOffsetY = 8 * u;
    rr(g, bx, by, bw, bh, 14 * u); g.fillStyle = '#fbf8f3'; g.fill(); g.restore();
    g.save(); rr(g, bx, by, bw, bh, 14 * u); g.clip();
    g.fillStyle = '#1d2330'; g.fillRect(bx, by, bw, head);
    g.fillStyle = '#e2701c'; g.fillRect(bx, by + head - 4 * u, bw, 4 * u);
    // a grade bem leve atrás da planta
    g.strokeStyle = 'rgba(60,70,90,0.06)'; g.lineWidth = 1;
    for (let x = bx + pad; x < bx + bw; x += s) { g.beginPath(); g.moveTo(Math.round(x) + 0.5, by + head); g.lineTo(Math.round(x) + 0.5, by + bh); g.stroke(); }
    for (let y = by + head + pad * 0.5; y < by + bh; y += s) { g.beginPath(); g.moveTo(bx, Math.round(y) + 0.5); g.lineTo(bx + bw, Math.round(y) + 0.5); g.stroke(); }
    g.restore();
    // o título e onde o jogador está
    const p = game.player, onde = naZona(p.x / T, p.y / T);
    g.textBaseline = 'middle'; g.textAlign = 'left';
    g.fillStyle = '#e2701c'; rr(g, bx + 18 * u, by + 16 * u, 26 * u, 26 * u, 6 * u); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 2 * u; g.lineJoin = 'round'; g.beginPath(); // um mapinha dobrado no ícone
    g.moveTo(bx + 24 * u, by + 22 * u); g.lineTo(bx + 29 * u, by + 20 * u); g.lineTo(bx + 34 * u, by + 22 * u); g.lineTo(bx + 39 * u, by + 20 * u); g.lineTo(bx + 39 * u, by + 36 * u); g.lineTo(bx + 34 * u, by + 38 * u); g.lineTo(bx + 29 * u, by + 36 * u); g.lineTo(bx + 24 * u, by + 38 * u); g.closePath(); g.stroke();
    g.beginPath(); g.moveTo(bx + 29 * u, by + 20 * u); g.lineTo(bx + 29 * u, by + 36 * u); g.moveTo(bx + 34 * u, by + 22 * u); g.lineTo(bx + 34 * u, by + 38 * u); g.stroke();
    g.fillStyle = '#ffffff'; g.font = '700 ' + Math.round(17 * u) + 'px ' + FONTE; g.fillText('Mapa da Faculdade', bx + 54 * u, by + 22 * u);
    g.fillStyle = '#f2a66a'; g.font = '600 ' + Math.round(11.5 * u) + 'px ' + FONTE; g.fillText('SERRA DOURADA · TÉRREO', bx + 54 * u, by + 41 * u);
    g.textAlign = 'right'; g.fillStyle = '#9aa6ba'; g.font = '500 ' + Math.round(11 * u) + 'px ' + FONTE; g.fillText('você está em', bx + bw - 18 * u, by + 22 * u);
    g.fillStyle = '#ffffff'; g.font = '700 ' + Math.round(14 * u) + 'px ' + FONTE; g.fillText(onde, bx + bw - 18 * u, by + 40 * u);
    // a planta
    const ox = bx + Math.round((bw - pw) / 2), oy = by + head + pad * 0.5;
    g.drawImage(st.cache.c, Math.round(ox), Math.round(oy));
    const tela = (tx, ty) => [ox + (tx - X0) * s, oy + (ty - Y0) * s];
    // a árvore de Natal (com as luzinhas piscando)
    { const [ax, ay] = tela(18, 29), r = s * 0.9;
      g.fillStyle = '#2f7a44'; g.beginPath(); g.moveTo(ax, ay - r); g.lineTo(ax + r * 0.75, ay + r * 0.6); g.lineTo(ax - r * 0.75, ay + r * 0.6); g.closePath(); g.fill();
      g.fillStyle = '#6b4a2f'; g.fillRect(ax - r * 0.12, ay + r * 0.6, r * 0.24, r * 0.25);
      g.fillStyle = '#f2c14e'; g.beginPath(); g.arc(ax, ay - r, r * 0.16, 0, Math.PI * 2); g.fill();
      [['#ff6a5a', -0.25, 0.1], ['#ffe08a', 0.2, -0.15], ['#9cc2ff', 0.3, 0.35], ['#7dff9a', -0.35, 0.42]].forEach(([c, dx, dy], i) => {
        g.globalAlpha = ease * (0.45 + 0.55 * (0.5 + 0.5 * Math.sin(st.t * 4 + i * 1.7))); g.fillStyle = c; g.beginPath(); g.arc(ax + dx * r, ay + dy * r, r * 0.1, 0, Math.PI * 2); g.fill(); });
      g.globalAlpha = ease; }
    // você está aqui: o pino vermelho, com a onda saindo dele
    const [vx, vy] = tela(p.x / T, p.y / T), on = (st.t * 0.9) % 1;
    g.strokeStyle = 'rgba(226,58,50,' + (0.6 * (1 - on)).toFixed(3) + ')'; g.lineWidth = 2.5 * u; g.beginPath(); g.arc(vx, vy, (6 + on * 18) * u, 0, Math.PI * 2); g.stroke();
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(vx, vy + 1.5 * u, 5 * u, 2 * u, 0, 0, Math.PI * 2); g.fill();
    const py = vy - 4 * u - Math.abs(Math.sin(st.t * 3)) * 3 * u, pr = 8 * u;
    g.fillStyle = '#e23a32'; g.beginPath(); g.arc(vx, py - pr, pr, Math.PI * 0.82, Math.PI * 0.18); g.lineTo(vx, py); g.closePath(); g.fill();
    g.strokeStyle = '#ffffff'; g.lineWidth = 2 * u; g.stroke();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(vx, py - pr, pr * 0.38, 0, Math.PI * 2); g.fill();
    g.textAlign = 'center'; g.font = '700 ' + Math.round(11 * u) + 'px ' + FONTE;
    const lt = 'Você está aqui', lwid = g.measureText(lt).width + 14 * u, ly = py - pr * 2 - 14 * u;
    g.fillStyle = '#e23a32'; rr(g, vx - lwid / 2, ly - 10 * u, lwid, 20 * u, 10 * u); g.fill(); g.fillStyle = '#fff'; g.fillText(lt, vx, ly + 0.5);
    // o rodapé: a legenda e como fechar
    const fy = by + bh - foot / 2 - 2 * u;
    let lx = bx + pad;
    g.textAlign = 'left'; g.font = '500 ' + Math.round(11.5 * u) + 'px ' + FONTE;
    const item = (desenha, txt) => { desenha(lx, fy); lx += 18 * u; g.fillStyle = '#4a5363'; g.fillText(txt, lx, fy); lx += g.measureText(txt).width + 18 * u; };
    item((x, y) => { g.strokeStyle = '#e2701c'; g.lineWidth = 3 * u; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 11 * u, y); g.stroke(); }, 'porta');
    item((x, y) => { g.strokeStyle = '#2fa86b'; g.lineWidth = 3.5 * u; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 11 * u, y); g.stroke(); }, 'entrada');
    item((x, y) => { g.fillStyle = 'rgba(196,150,52,0.8)'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(x + 1.5 * u + i * 4 * u, y, 1.4 * u, 0, Math.PI * 2); g.fill(); } }, 'piso tátil');
    item((x, y) => { g.fillStyle = '#2f7a44'; g.beginPath(); g.moveTo(x + 5.5 * u, y - 6 * u); g.lineTo(x + 11 * u, y + 5 * u); g.lineTo(x, y + 5 * u); g.closePath(); g.fill(); }, 'árvore de Natal');
    g.textAlign = 'right'; const dica = 'para fechar'; g.fillStyle = '#7d8696'; g.fillText(dica, bx + bw - pad, fy);
    let kx = bx + bw - pad - g.measureText(dica).width - 8 * u;
    g.font = '700 ' + Math.round(11 * u) + 'px ' + FONTE; g.textAlign = 'center';
    for (const tecla of ['Esc', 'E']) {
      const w = g.measureText(tecla).width + 12 * u; kx -= w;
      g.fillStyle = '#e9e4dc'; rr(g, kx, fy - 10 * u, w, 20 * u, 5 * u); g.fill(); g.strokeStyle = '#c9c1b4'; g.lineWidth = 1; g.stroke();
      g.fillStyle = '#2d3442'; g.fillText(tecla, kx + w / 2, fy + 0.5); kx -= 6 * u;
    }
    g.restore();
  }
  function abrir(game) { st.aberto = true; st.t0 = st.t; game.locked = true; game.keys.clear(); if (DL.sfx) DL.sfx.blip(); }
  function fechar(game) { st.aberto = false; game.locked = false; }

  /* ------------------------------------------------------------------ */
  /* Ligando no mapa da faculdade                                        */
  /* ------------------------------------------------------------------ */
  // a árvore: 2 × 2 tiles à esquerda da parede do logo, na frente da parede branca (sem tampar o logo, fora do
  // caminho dos alunos); o totem: no começo do corredor das salas, encostado na parede da esquerda
  fac.items.push(
    { id: 'ARVORE-NATAL', kind: 'arvore-natal', tx: 17, ty: 28, tw: 2, th: 2, solid: true, isoH: 72, drawIso: desenhaArvore },
    { id: 'MAPA-FAC', kind: 'totem-mapa', tx: 15, ty: 16, tw: 1, th: 1, solid: true, isoH: 62, drawIso: desenhaTotem },
  );
  const entrar = fac.enter, sair = fac.leave, rotulo = fac.useLabel, usar = fac.use, tecla = fac.key, upd = fac.update, ov = fac.overlay;
  fac.enter = function (game) {
    entrar.call(this, game);
    st.aberto = false;
    const m = game.world.byId['MAPA-FAC']; if (m) { m.ix = m.px + 20; m.iy = m.py + 14; }
    const a = game.world.byId['ARVORE-NATAL']; if (a) { a.ix = a.px + 16; a.iy = a.py + 36; a.useDist = 26; }
  };
  fac.leave = function (game) { st.aberto = false; if (sair) sair.call(this, game); };
  fac.useLabel = function (game, e) {
    if (e.id === 'MAPA-FAC') return 'Ver o mapa da faculdade';
    if (e.id === 'ARVORE-NATAL') return 'Ver a árvore de Natal';
    return rotulo.call(this, game, e);
  };
  fac.use = function (game, e) {
    if (e.id === 'MAPA-FAC') return abrir(game);
    if (e.id === 'ARVORE-NATAL') { if (DL.sfx) DL.sfx.blip(); return game.toast('Feliz Natal! 🎄 · Faculdade Serra Dourada', 'ok'); }
    return usar.call(this, game, e);
  };
  fac.key = function (game, ev) {
    if (st.aberto) {
      if (ev.code === 'Escape' || ev.code === 'KeyE' || ev.code === 'Enter' || ev.code === 'Space') fechar(game);
      ev.preventDefault();
      return true;
    }
    return tecla ? tecla.call(this, game, ev) : false;
  };
  fac.update = function (game, dt) { st.t += dt; return upd.call(this, game, dt); };
  fac.overlay = function (g, sc, game) {
    if (ov) ov.call(this, g, sc, game);
    if (st.aberto) desenhaPainel(g, sc, game || DL.game);
  };
  DL.FacNatal = { st, abrir, fechar };
})();

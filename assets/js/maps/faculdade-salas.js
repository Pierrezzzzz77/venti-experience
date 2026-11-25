/* Venti Experience — Parte 2: as 2 salas da faculdade que abrem (mapas 'faculdade-sala1' e 'faculdade-sala2').
   Referências: pasta "foto sala".
     Sala 1 (sala de ADS)       paredes cinza, piso de porcelanato bege, 5 fileiras de mesas pretas encostadas na
                                parede da direita, cadeiras pretas dos dois lados, notebooks com o fundo de tela
                                colorido; na parede da esquerda, a projeção e o quadro de acrílico; no fundo, a
                                porta de madeira com visor, a placa de saída, os interruptores e o ar.
     Sala 2 (lab. da saúde)     parede azul-petróleo com os ícones (em cima) e azulejo branco (embaixo); na parede
                                amarela, a bancada com pias e os 2 ares; 4 bancadas altas de granito com banquetas,
                                os modelos de anatomia, os armários cinza e a mesa do professor.
   A visão é a das fotos: a parede do fundo da foto é a parede do fundo do mapa.
   Usa as peças de faculdade.js (DL.FacKit); por isso vem depois dele no index.html. */
(function () {
  'use strict';
  const DL = window.DL, T = DL.T, R = DL.R, shade = DL.shade, hash = DL.hash, F = DL.FacKit;
  const { pecas3d, sombra3d, caixa, roda, chao, caixaTela } = F;
  const ALT = 44; // altura das paredes do fundo (a mesma do motor)

  /* ------------------------------------------------------------------ */
  /* Pisos: '1' porcelanato bege (Sala 1) · '2' porcelanato cinza (Sala 2) */
  /* ------------------------------------------------------------------ */
  // placas de 2 × 2 tiles, manchinhas leves e a junta fina
  const porcelanato = (base, junta) => (g, px, py, x, y) => {
    const pl = hash((x >> 1) * 31 + (y >> 1) * 57), c = shade(base, (pl - 0.5) * 0.05);
    R(g, px, py, T, T, c);
    for (let i = 0; i < 5; i++) {
      const a = hash(x * 41 + y * 17 + i * 5), b = hash(x * 7 + y * 53 + i * 11);
      R(g, px + Math.floor(a * 13), py + Math.floor(b * 15), 3, 1, shade(c, i % 2 ? 0.05 : -0.04));
    }
    if (x % 2 === 0) R(g, px, py, 1, T, junta);
    if (y % 2 === 0) R(g, px, py, T, 1, junta);
  };
  DL.FLOORS['1'] = porcelanato('#c3bbab', '#aaa293');
  DL.FLOORS['2'] = porcelanato('#a5a39c', '#bcb59e');

  /* ------------------------------------------------------------------ */
  /* Paredes: a face inteira é uma imagem pintada uma vez                 */
  /* ------------------------------------------------------------------ */
  // eixo 'n': parede do fundo (linha y = lin, de a0 a a1, esquerda → direita na tela)
  // eixo 'o': parede da esquerda (coluna x = lin; a imagem vai de a1, perto da câmera, até a0, no fundo)
  // (o retângulo fica DENTRO da parede: tudo o que está na sala é desenhado depois dela)
  function painel(eixo, lin, a0, a1, pintar) {
    let img = null;
    const n = eixo === 'n';
    return {
      kind: 'painel', wall: true, solid: false, tx: n ? a0 / T : 0, ty: n ? lin / T : a0 / T, isoH: 46,
      isoRect: n ? [a0, lin - 0.5, a1, lin] : [lin - 0.5, a0, lin, a1],
      drawIso(g, sc) {
        if (!img) { img = DL.mk(a1 - a0, ALT); pintar(img.getContext('2d'), a1 - a0); }
        if (n) DL.isoKit.setMap(g, sc, [a0, lin, ALT], [1, 0, 0], [0, 0, -1]);
        else DL.isoKit.setMap(g, sc, [lin, a1, ALT], [0, -1, 0], [0, 0, -1]);
        g.drawImage(img, 0, 0);
        return n ? caixaTela(a0, lin - 1, a1, lin, 0, ALT) : caixaTela(lin - 1, a0, lin, a1, 0, ALT);
      },
    };
  }
  // a borda do forro no alto da parede
  function forro(g, W) {
    R(g, 0, 0, W, 3, '#f1f1f0');
    for (let i = 0; i < W; i += 8) R(g, i, 0, 1, 3, '#d9d9d8');
    R(g, 0, 3, W, 1, 'rgba(0,0,0,0.14)');
  }
  // luz do teto: a parede fica um pouco mais escura perto do chão
  function sombraParede(g, W, forte) {
    const gr = g.createLinearGradient(0, 0, 0, ALT);
    gr.addColorStop(0, 'rgba(255,255,255,0.06)'); gr.addColorStop(0.4, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,' + forte + ')');
    g.fillStyle = gr; g.fillRect(0, 0, W, ALT);
  }
  function arSplit(g, x, y, w) {
    R(g, x + 1, y + 9, w, 1, 'rgba(0,0,0,0.16)');
    R(g, x + 1, y, w - 2, 1, '#ffffff');
    R(g, x, y + 1, w, 8, '#eef0f2');
    R(g, x + w - 1, y + 1, 1, 8, '#c9ced5');
    R(g, x + 2, y + 2, w - 8, 1, '#dde1e6');
    R(g, x + 2, y + 5, w - 4, 3, '#4b525b');                         // a saída de ar
    for (let i = 4; i < w - 3; i += 3) R(g, x + i, y + 5, 1, 3, '#8a929c');
    R(g, x + w - 5, y + 3, 2, 1, '#7ee0a1');
  }
  function tomada(g, x, y) { R(g, x, y, 4, 4, '#f7f7f4'); R(g, x, y + 3, 4, 1, '#c9c9c6'); R(g, x + 1, y + 1, 2, 1, '#8a8d91'); }

  /* ================================================================== */
  /* Móveis                                                              */
  /* ================================================================== */
  // cadeira de escritório preta, de encosto arredondado e base de rodinhas (as 2 salas)
  function cadeiraPreta(g, e) {
    const { c, b } = chao(e), cor = '#2f3137', f = e.face, tk = e.tuck || 0, met = '#4a4d53';
    sombra3d(g, c, b, f, tk, 6.5);
    const base = [];
    for (let i = 0; i < 5; i++) {
      const t = (i / 5) * Math.PI * 2 + 0.3, a = 5.4 * Math.sin(t), d = 5.4 * Math.cos(t);
      base.push({ perna: [0, 0, a, d], z0: 2, z1: 1.2, cor: met, ordem: -20 + d * 0.1 });
      base.push({ p: roda(0.8, 6, a, d), z0: 0, z1: 1.2, cor: '#1b1c1f', ordem: -19 + d * 0.1 });
    }
    pecas3d(g, c, b, f, tk, [
      ...base,
      { perna: [0, 0, 0, 0], z0: 2, z1: 8, cor: met, grossa: 2, ordem: -10 },
      { p: caixa(-4.4, 4.4, -4, 4.2), z0: 8, z1: 10, cor, topo: '#454850', lado: -0.2 },            // assento
      { perna: [0, -4.8, 0, -4.8], z0: 8, z1: 12, cor: '#1b1c1f', grossa: 2 },                      // haste do encosto
      { p: caixa(-3.6, 3.6, -5.4, -4.2), z0: 11.5, z1: 12.5, cor, lado: -0.16 },                    // encosto (cantos arredondados)
      { p: caixa(-4.6, 4.6, -5.4, -4.2), z0: 12.5, z1: 18.5, cor, lado: -0.1, topo: '#4b4e56' },
      { p: caixa(-3.6, 3.6, -5.4, -4.2), z0: 18.5, z1: 19.6, cor, lado: -0.06, topo: '#565962' },
    ]);
  }
  // banqueta alta do laboratório: assento redondo, 4 pernas cinza abertas e o aro de apoio
  function banqueta(g, e) {
    const { c, b } = chao(e), f = e.face, tk = e.tuck || 0, met = '#8b9197', metE = '#6a7076', p = 3.6, q = 2.4, k = 3.2;
    sombra3d(g, c, b, f, tk, 5.5);
    pecas3d(g, c, b, f, tk, [
      { perna: [-p, -p, -q, -q], z0: 0, z1: 11, cor: metE }, { perna: [p, -p, q, -q], z0: 0, z1: 11, cor: metE },
      { perna: [-k, -k, k, -k], z0: 4, z1: 4, cor: metE }, { perna: [-k, -k, -k, k], z0: 4, z1: 4, cor: metE },
      { perna: [k, -k, k, k], z0: 4, z1: 4, cor: met }, { perna: [-k, k, k, k], z0: 4, z1: 4, cor: met },
      { perna: [-p, p, -q, q], z0: 0, z1: 11, cor: met }, { perna: [p, p, q, q], z0: 0, z1: 11, cor: met },
      { p: roda(4.2, 14), z0: 11, z1: 13, cor: '#3b3e44', topo: '#51555c', lado: -0.2, ordem: 30 },
    ]);
  }

  // Sala 1: fileira de mesas pretas (2 módulos de 2 tiles), com as laterais fechadas até o chão
  function desenharMesaPreta(g, sc, e) {
    const K = DL.isoKit, x0 = e.px, x1 = e.px + e.tw * T, y0 = e.py + 1, y1 = e.py + T - 1, Z = DL.isoSurfaceTop(e);
    const lado = { s: '#1f2024', e: '#17181b', t: '#2c2e33' }, xm = (x0 + x1) / 2;
    K.isoT(g, sc);
    K.box(g, x0, y0 + 1, x0 + 1.5, y1 - 1, 0, Z - 1.5, lado);
    K.box(g, x0 + 2, y0 + 7, x1 - 1.5, y0 + 8, 4, Z - 1.5, { s: '#191a1d', e: '#141518', t: '#222327' }); // saia do meio
    K.box(g, xm - 1.5, y0 + 1, xm + 1.5, y1 - 1, 0, Z - 1.5, lado);
    K.box(g, x1 - 1.5, y0 + 1, x1, y1 - 1, 0, Z - 1.5, lado);
    K.box(g, x0, y0, x1, y1, Z - 1.5, Z, { s: '#26282c', e: '#1c1d21', t: '#35373c' });
    K.line(g, [x0, y1, Z], [x1, y1, Z], 'rgba(255,255,255,0.26)');
    K.line(g, [xm, y0, Z], [xm, y1, Z], 'rgba(0,0,0,0.45)');                      // a junta dos módulos
    for (const [a, w] of [[10, 12], [42, 10]]) K.poly(g, [[x0 + a, y0 + 3, Z], [x0 + a + w, y0 + 3, Z], [x0 + a + w - 4, y1 - 3, Z], [x0 + a - 4, y1 - 3, Z]], 'rgba(255,255,255,0.035)', false); // reflexo das lâmpadas
    return caixaTela(x0, y0, x1, y1, 0, Z);
  }
  // notebook em cima da mesa. e.costas: aberto para quem senta atrás da mesa (aparece a tampa);
  // e.tela: cor do fundo de tela (com o escudo da faculdade) ou nada = tela apagada
  function desenharNotebook(g, sc, e) {
    const K = DL.isoKit, c = e.px + 8, Z = DL.isoSurfaceTop(e.host), yd = e.py + 8, w = 5;
    K.isoT(g, sc);
    const base = { s: '#17181b', e: '#101113', t: '#4a4d53' };
    if (e.costas) {
      K.box(g, c - w, yd - 6, c + w, yd, Z, Z + 0.8, base);
      K.poly(g, [[c - w, yd, Z + 0.5], [c + w, yd, Z + 0.5], [c + w, yd + 1.8, Z + 8], [c - w, yd + 1.8, Z + 8]], '#1a1b1f');
      K.line(g, [c - w, yd + 1.8, Z + 8], [c + w, yd + 1.8, Z + 8], '#63676e');
      K.poly(g, [[c - 1, yd + 1, Z + 4], [c + 1, yd + 1, Z + 4], [c + 1, yd + 1, Z + 5], [c - 1, yd + 1, Z + 5]], '#8a8f97', false);
    } else {
      const P = (u, z) => [c + u, yd - (z / 8) * 1.8, Z + z];                      // (a tela inclinada para trás)
      K.poly(g, [P(-w, 0.5), P(w, 0.5), P(w, 8), P(-w, 8)], '#0d0e10');
      K.poly(g, [P(-w + 0.6, 1.4), P(w - 0.6, 1.4), P(w - 0.6, 7.5), P(-w + 0.6, 7.5)], e.tela || '#1c1f24', false);
      if (e.tela) {
        K.poly(g, [P(-1.2, 3.4), P(0, 2.6), P(1.2, 3.4), P(1.2, 6), P(-1.2, 6)], '#ffffff', false); // o escudo
        K.poly(g, [P(-w + 0.6, 1.4), P(w - 0.6, 1.4), P(w - 0.6, 2), P(-w + 0.6, 2)], 'rgba(0,0,0,0.35)', false); // barra de tarefas
      } else K.poly(g, [P(-3, 7.5), P(-0.5, 7.5), P(-3, 3), P(-4.4, 3)], 'rgba(255,255,255,0.07)', false);
      K.line(g, P(-w, 8), P(w, 8), '#5d6168');
      K.box(g, c - w, yd, c + w, yd + 6, Z, Z + 0.8, base);
      K.poly(g, [[c - w + 1, yd + 0.8, Z + 0.8], [c + w - 1, yd + 0.8, Z + 0.8], [c + w - 1, yd + 3.4, Z + 0.8], [c - w + 1, yd + 3.4, Z + 0.8]], '#24262a', false); // teclado
      K.poly(g, [[c - 1.5, yd + 4, Z + 0.8], [c + 1.5, yd + 4, Z + 0.8], [c + 1.5, yd + 5.4, Z + 0.8], [c - 1.5, yd + 5.4, Z + 0.8]], '#3b3e44', false);
    }
    return caixaTela(c - w, yd - 6, c + w, yd + 6, Z, Z + 8);
  }

  // Sala 2: granito claro com pintinhas (pintado uma vez por tamanho)
  const GRANITOS = {};
  function tampoGranito(w, h) {
    const k = w + 'x' + h;
    if (!GRANITOS[k]) {
      const cv = (GRANITOS[k] = DL.mk(w, h)), g = cv.getContext('2d');
      R(g, 0, 0, w, h, '#cfcec7');
      for (let i = 0; i < w * h * 0.22; i++) R(g, Math.floor(hash(i * 13 + 5) * w), Math.floor(hash(i * 29 + 11) * h), 1, 1, ['#dfded8', '#b9b9b3', '#a3a49f', '#dbd9d0', '#c2bfb3'][i % 5]);
      R(g, 0, h - 1, w, 1, '#eeede8'); R(g, w - 1, 0, 1, h, '#e4e3dd');
    }
    return GRANITOS[k];
  }
  function granitoEm(g, sc, x0, y0, x1, y1, z0, z1) {
    const K = DL.isoKit;
    K.box(g, x0, y0, x1, y1, z0, z1, { s: '#aaa9a2', e: '#8f8f89', t: '#cdccc4' });
    K.setMap(g, sc, [x0, y0, z1], [1, 0, 0], [0, 1, 0]);
    g.drawImage(tampoGranito(x1 - x0, y1 - y0), 0, 0);
    K.isoT(g, sc);
  }
  // bancada alta: tampo de granito, estrutura de metal cinza e as tomadas embaixo do tampo
  function desenharBancada(g, sc, e) {
    const K = DL.isoKit, x0 = e.px + 1, x1 = e.px + T - 1, y0 = e.py, y1 = e.py + e.th * T - 1, Z = DL.isoSurfaceTop(e);
    const met = { s: '#566067', e: '#434c52', t: '#6b757c' }, L = y1 - y0;
    const pes = L > 2 * T ? [y0 + 1, y0 + L / 2 - 1, y1 - 3] : [y0 + 1, y1 - 3];
    K.isoT(g, sc);
    for (const y of pes) {
      K.box(g, x0 + 1, y, x0 + 3, y + 2, 0, Z - 2, met);
      K.box(g, x0 + 3, y + 0.5, x1 - 3, y + 1.5, 3, 4.5, met);                     // travessa de baixo
      K.box(g, x1 - 3, y, x1 - 1, y + 2, 0, Z - 2, met);
    }
    K.box(g, (x0 + x1) / 2 - 0.5, y0 + 1, (x0 + x1) / 2 + 0.5, y1 - 2, 3, 4.5, met); // travessa comprida
    K.box(g, x0 + 1, y0 + 1, x1 - 1, y1 - 1, Z - 4, Z - 2, met);
    for (let y = y0 + 8; y < y1 - 4; y += T) K.poly(g, [[x1 - 1, y, Z - 3.8], [x1 - 1, y + 3, Z - 3.8], [x1 - 1, y + 3, Z - 2], [x1 - 1, y, Z - 2]], '#dfe2e4', false);
    granitoEm(g, sc, x0, y0, x1, y1, Z - 2, Z);
    return caixaTela(x0, y0, x1, y1, 0, Z);
  }
  // a bancada da parede amarela: portas cinza-claras, uma aberta (com o modelo laranja), tampo de granito e 2 pias
  function desenharBalcaoPia(g, sc, e) {
    const K = DL.isoKit, x0 = e.px, x1 = e.px + 13, y0 = e.py, y1 = e.py + e.th * T, Z = 14;
    const face = (ya, yb, za, zb, cor) => K.poly(g, [[x1, ya, za], [x1, yb, za], [x1, yb, zb], [x1, ya, zb]], cor, false);
    K.isoT(g, sc);
    K.box(g, x0, y0, x1, y1, 1.5, Z - 2, { s: '#b4b7bb', e: '#a7aaaf', t: '#c9cbce' });
    face(y0, y1, 0, 1.5, '#4c4f53');                                               // o vão dos pés
    for (let k = 0, y = y0; y < y1; k++, y += 8) {
      if (k === 4 || k === 5) {                                                    // o armário aberto
        face(y, y + 8, 2, Z - 2.5, '#6f7276'); face(y, y + 8, 6.5, 7.2, '#e6e7e8');
        if (k === 5) { face(y + 1, y + 5, 7.2, 9.6, '#e2662b'); face(y + 1.5, y + 4.5, 7.2, 7.8, '#3a8fd0'); }
        continue;
      }
      face(y + 0.5, y + 7.5, 2, Z - 2.5, '#b9bcc1');
      face(y + (k % 2 ? 1.5 : 5.5), y + (k % 2 ? 2.5 : 6.5), Z - 5, Z - 4, '#6f7378'); // puxador
    }
    for (const y of [y0 + 32, y0 + 48]) K.poly(g, [[x1, y, 2], [x1 + 5, y + (y === y0 + 32 ? -1 : 1), 2], [x1 + 5, y + (y === y0 + 32 ? -1 : 1), Z - 2.5], [x1, y, Z - 2.5]], '#c6c9cd'); // as portas abertas
    granitoEm(g, sc, x0, y0, x1 + 1, y1, Z - 2, Z);
    K.box(g, x0, y0, x0 + 1, y1, Z, Z + 1.5, { s: '#b3b2aa', e: '#bdbcb4', t: '#dddcd5' }); // o frontão
    for (const y of [y0 + 6, y0 + 25]) {                                           // cubas e torneiras
      K.poly(g, [[x0 + 3, y, Z], [x0 + 11, y, Z], [x0 + 11, y + 9, Z], [x0 + 3, y + 9, Z]], '#7f868c', false);
      K.poly(g, [[x0 + 4, y + 1, Z], [x0 + 11, y + 1, Z], [x0 + 11, y + 9, Z], [x0 + 4, y + 9, Z]], '#a9b0b6', false);
      K.line(g, [x0 + 2, y + 4.5, Z], [x0 + 2, y + 4.5, Z + 5], '#e8ecef', 1);
      K.line(g, [x0 + 2, y + 4.5, Z + 5], [x0 + 6, y + 4.5, Z + 4], '#c3c9ce', 1);
    }
    return caixaTela(x0, y0, x1 + 1, y1, 0, Z + 5);
  }
  // armários cinza baixos (as portas dão para dentro da sala), com os modelos em cima
  const Z_ARM = 22;
  function desenharArmario(g, sc, e) {
    const K = DL.isoKit, x0 = e.px + 4, x1 = e.px + T, y0 = e.py, y1 = e.py + e.th * T;
    K.isoT(g, sc);
    K.box(g, x0, y0, x1, y1, 0, Z_ARM, { s: '#a9adb2', e: '#8f9398', t: '#c6c9cd' });
    K.box(g, x0, y0, x0 + 0.8, y1, 0, Z_ARM, { s: '#bfc3c7', t: '#d4d7da' });
    for (let y = y0 + 2 * T; y < y1; y += 2 * T) { K.line(g, [x1, y, 0], [x1, y, Z_ARM], '#767a7f'); K.line(g, [x0, y, Z_ARM], [x1, y, Z_ARM], '#9a9ea3'); }
    K.line(g, [x1, y0, Z_ARM], [x1, y1, Z_ARM], 'rgba(255,255,255,0.35)');
    return caixaTela(x0, y0, x1, y1, 0, Z_ARM);
  }
  // mesa do professor: branca, com o controle e o cabo em cima
  function desenharMesaProf(g, sc, e) {
    const K = DL.isoKit, x0 = e.px + 1, x1 = e.px + T - 1, y0 = e.py + 1, y1 = e.py + e.th * T - 1, Z = DL.isoSurfaceTop(e);
    const c = { s: '#c3c6ca', e: '#a6aaaf', t: '#e6e8ea' };
    K.isoT(g, sc);
    K.box(g, x0, y0, x1, y0 + 1.5, 0, Z - 1.5, c);
    K.box(g, x0 + 2, y0 + 1.5, x0 + 3, y1 - 1.5, 4, Z - 1.5, c);
    K.box(g, x0, y1 - 1.5, x1, y1, 0, Z - 1.5, c);
    K.box(g, x0, y0, x1, y1, Z - 1.5, Z, c);
    K.poly(g, [[x0 + 8, y1 - 9, Z], [x0 + 10, y1 - 9, Z], [x0 + 10, y1 - 4, Z], [x0 + 8, y1 - 4, Z]], '#25272b', false);
    const cabo = [[4, 4], [8, 3], [10, 6], [7, 9], [4, 7], [6, 5]];
    for (let i = 1; i < cabo.length; i++) K.line(g, [x0 + cabo[i - 1][0], y0 + cabo[i - 1][1], Z], [x0 + cabo[i][0], y0 + cabo[i][1], Z], '#1d1f22', 0.8);
    return caixaTela(x0, y0, x1, y1, 0, Z);
  }

  /* ------------------------------------------------------------------ */
  /* Modelos de anatomia (em cima das bancadas e dos armários)            */
  /* ------------------------------------------------------------------ */
  const AZUL = '#4fa3dc', PELE = '#e3b08c', PELE_E = '#c48f6c', MUSC = '#b3302c', MUSC_C = '#d4574c', MUSC_E = '#84211f', OSSO = '#e6dcc0', OSSO_E = '#b7aa86';
  // c = meio; r = a linha do tampo (na bancada) ou do alto do armário
  const apoio = (e) => ({ c: e.px + 8, r: e.py - 1 - (e.sobe || 0) }); // (sobe: o armário é mais alto que a bancada)
  const base = (g, c, r, w) => { R(g, c - (w >> 1), r - 1, w, 2, AZUL); R(g, c - (w >> 1), r + 1, w, 1, '#2f78ad'); };
  // desenho em linhas de texto: cada letra é uma cor
  const CORES = { p: PELE, P: PELE_E, m: MUSC, M: MUSC_C, e: MUSC_E, o: OSSO, O: OSSO_E, w: '#f4efe6', k: '#2a2226', b: '#3f6fb8', r: '#e7a0b0', R: '#c97a8e', y: '#d9a441', c: '#5a2a26', C: '#7d3d35', g: '#8d949a' };
  const letras = (g, x, y, linhas) => linhas.forEach((l, j) => { for (let i = 0; i < l.length; i++) if (CORES[l[i]]) R(g, x + i, y + j, 1, 1, CORES[l[i]]); });
  function modelo(larg, linhas) {
    return (g, e) => {
      const { c, r } = apoio(e);
      base(g, c, r, larg);
      letras(g, c - (linhas[0].length >> 1), r - 1 - linhas.length, linhas);
    };
  }
  const suporte = (g, c, r, alto) => { base(g, c, r, 8); R(g, c + 3, r - alto, 1, alto - 1, '#c9ced2'); R(g, c - 1, r - alto, 4, 1, '#c9ced2'); };
  const MODELOS = {
    'm-olho': modelo(6, ['.wwww.', 'wwmmww', 'wbkbMw', 'wbbbMw', 'wwwwww', '.wwww.', '..gg..']),
    'm-cranio': modelo(8, ['.ooooo..', 'oooommo.', 'ooommmoO', 'okookooO', 'okookooO', '.ooooOO.', '.owowO..']),
    'm-cabeca': modelo(8, ['..ppp...', '.ppppp..', '.pppppP.', '.ppppPP.', 'pppppPP.', '.pppPP..', '..pPP...', '.pppPP..']),
    'm-musculo': modelo(10, ['..rrrr..', '.rRrrRr.', 'mrrRrrrm', 'mMmmMmme', 'mkwmkwme', 'mMmmmMme', '.mwwwme.', '..mmme..', '..bmem..', '.mbmemm.']),
    'm-coracao': modelo(8, ['..bb.mm..', '..bbmm.b.', '.mbMmmbb.', 'mMMmmmmb.', 'mMmmymme.', '.mmmyme..', '..mmee...', '...me....']),
    'm-figado': modelo(6, ['.ccccc..', 'cCCcccc.', 'cCccccck', '.cccckk.', '..ckk...']),
    'm-torso': modelo(12, ['....rrpp....', '...mrrppp...', '...mkmpkp...', '...mMmppp...', '....mmpp....', '..mmbmpppp..', '.mMmbmppppp.', 'mmMmmmpppppp', 'mememmppppPp', 'mememmppppPp', 'mm.mMmpppP.p', '...mymppPp..', '...myypppp..', '...mmyppPp..', '...emmpppP..', '..mmmmppppP.', '..mmemppPpP.', '..mme..ppP..']),
    'm-osso'(g, e) {
      const { c, r } = apoio(e);
      suporte(g, c, r, 23);
      letras(g, c - 3, r - 23, ['.oooO..', 'oooOO..', '.ooO...', '..oO...', '..oO...', '..oO...', '..oO...', '..oO...', '.ooO...', '..oO...', '.o.O...', '.o.O...', '.o.O...', '.o.O...', '..oO...', '.oooO..', '.o.oO..', '.o.o...']);
    },
    'm-braco'(g, e) {
      const { c, r } = apoio(e);
      suporte(g, c, r, 23);
      letras(g, c - 3, r - 23, ['.mmmm..', 'mMMmme.', 'mMmmme.', 'mMmme..', '.mMme..', '.mMme..', '.mmme..', '.mwme..', '.mMme..', '.mMe...', '.mme...', '.mme...', '.mwe...', '..me...', '.mme...', '.m.me..', '.m.m...']);
    },
    'm-pe': modelo(8, ['..mm....', '..mMe...', '..mMe...', '.mmMmm..', 'mmMmmmme', '.oooooo.']),
    'm-mao': modelo(6, ['.m.m.', 'mm.mm', 'mMmmm', '.mMme', '.mMe.', '..me.', '..me.']),
    'm-corpo': modelo(8, ['...mm......', '...Mm...mmm', '..mmmmmmm..', '.mmMme.....', '.mmMme.....', '.m.wme.....', '.m.mme.....', '...mme.....', '...m.m.....', '...M.m.....', '...m.m.....', '...m.m.....', '..mm.mm....']),
    'm-pelve': modelo(10, ['.mmm..ooo.', 'mrrmmmooO.', 'mrRRmmMoO.', '.mryymmO..', '.mmrrmm...', '..oomm....']),
    'm-pescoco': modelo(8, ['...rrr..', '..mrRrm.', '..mmkmm.', '..mMmmw.', '...mmm..', '...Mme..', '..mMmem.', '.mmMmmmm']),
    // copinho de água e caixa branca e verde (Sala 1)
    copo(g, e) {
      const { c, r } = apoio(e);
      R(g, c - 2, r - 5, 4, 5, '#cfe3ef'); R(g, c - 2, r - 5, 4, 1, '#ffffff'); R(g, c - 2, r - 3, 4, 1, '#4f86c6'); R(g, c + 1, r - 4, 1, 4, '#a9c4d6');
    },
    'caixa-ads'(g, e) {
      const { c, r } = apoio(e);
      R(g, c - 6, r - 5, 11, 6, '#e9ebec'); R(g, c + 4, r - 5, 1, 6, '#b9bec2'); R(g, c - 6, r - 1, 11, 2, '#2f9a5c');
      R(g, c - 4, r - 9, 8, 4, '#f4f5f5'); R(g, c + 3, r - 9, 1, 4, '#c9ced1'); R(g, c - 2, r - 8, 3, 1, '#8a929a');
      R(g, c + 6, r - 1, 2, 2, '#2f55c8');                                          // o mouse azul
    },
  };
  const ARTE = Object.assign({ 'cadeira-preta': cadeiraPreta, banqueta }, MODELOS);
  const desenhoAntes = DL.drawItem;
  DL.drawItem = function (g, e, t) {
    const f = ARTE[e.kind];
    return f ? f(g, e, t) : desenhoAntes(g, e, t);
  };

  /* ------------------------------------------------------------------ */
  /* Assentos encostados nas mesas                                        */
  /* ------------------------------------------------------------------ */
  // Os assentos ficam meio embaixo da mesa e bloqueiam só o pedaço que ocupam (e.bloco, em px), e não o tile
  // inteiro: assim dá para andar entre as fileiras. (ver colisaoFina)
  const DIR = { L: [1, 0], S: [0, 1], O: [-1, 0], N: [0, -1] };
  function assento(kind, tx, ty, face, tuck, meia) {
    const [fx, fy] = DIR[face], cx = tx * T + 8 + fx * tuck, cy = ty * T + 8 + fy * tuck;
    const r = [Math.max(tx * T, cx - meia), Math.max(ty * T, cy - meia), Math.min(tx * T + T, cx + meia), Math.min(ty * T + T, cy + meia)];
    return { kind, face, tuck, tx, ty, solid: false, isoRect: r, bloco: r, isoH: 24 };
  }
  const cadeira = (tx, ty, face, tuck) => assento('cadeira-preta', tx, ty, face, tuck == null ? 5 : tuck, 5.5);
  const banco = (tx, ty, face) => assento('banqueta', tx, ty, face, 5, 4.5);
  function colisaoFina(sc) {
    const blocos = sc.world.items.filter((e) => e.bloco).map((e) => e.bloco);
    sc.solidAt = function (x, y) {
      return Object.getPrototypeOf(this).solidAt.call(this, x, y) || blocos.some((r) => x > r[0] && x < r[2] && y > r[1] && y < r[3]);
    };
  }
  // (o retângulo no chão é o da mesa inteira: sempre depois dela, sem ciclo na ordem de desenho com as cadeiras;
  //  posto na montagem da sala, ver 'sala')
  const sobre = (host, kind, tx, ty, extra) => Object.assign({ kind, host, tx, ty, solid: false }, extra);
  const ver = (dica, texto) => ({ dica, texto });
  // o ponto onde a dica "E" aparece (px do mapa)
  const ponto = (x, y) => ({ ponto: [x, y] });

  /* ================================================================== */
  /* Sala 1                                                              */
  /* ================================================================== */
  // mapa: colunas 1 a 7; linhas 2 a 18 (a porta fica no vão 'P' da parede do fundo)
  const S1 = { W: 9, H: 20, y0: 2, y1: 19, porta: 2, cor: '#b3b3ba' };
  const FILEIRAS = [4, 7, 10, 13, 16]; // linha de cada fileira de mesas (colunas 4 a 7)

  function pintarFundo1(g, W, x0) {
    R(g, 0, 0, W, ALT, S1.cor);
    sombraParede(g, W, 0.16);
    forro(g, W);
    R(g, 0, ALT - 4, W, 4, '#eeeeec'); R(g, 0, ALT - 1, W, 1, '#c4c4c2');
    if (x0 !== 3 * T) return;
    // à direita da porta: os interruptores e, mais adiante, o ar
    for (const x of [4, 8, 12]) { R(g, x, 23, 3, 5, '#f4f4f2'); R(g, x + 1, 24, 1, 2, '#9b9ea3'); }
    arSplit(g, 16, 6, 40);
  }
  function pintarEsquerda1(g, W) {
    R(g, 0, 0, W, ALT, shade(S1.cor, -0.07));
    sombraParede(g, W, 0.2);
    forro(g, W);
    R(g, 0, ALT - 4, W, 4, '#e2e2e1'); R(g, 0, ALT - 1, W, 1, '#b9b9b8');
    // o quadro claro comprido e a imagem projetada nele
    const x0 = 58, w = 140, y0 = 8, h = 25;
    R(g, x0 + 1, y0 + 1, w, h, 'rgba(0,0,0,0.12)');
    R(g, x0, y0, w, h, '#dad6c8'); R(g, x0, y0, w, 1, '#e9e6da'); R(g, x0, y0 + h - 1, w, 1, '#bdb9ab');
    const px = x0 + 40, pw = 62, py = y0 + 2, ph = 21;
    for (let j = 0; j < ph; j++) R(g, px, py + j, pw, 1, j < 9 ? '#ebe9dd' : j < 14 ? '#e4e3d8' : '#dddccf');
    // nuvens claras, o paredão azulado e o caminho iluminado
    for (let i = 0; i < 90; i++) {
      const a = hash(i * 17 + 3), b = hash(i * 23 + 9), dx = Math.floor(a * 30), dy = Math.floor(b * 9);
      R(g, px + 8 + dx, py + 1 + dy, 4, 1, i % 3 ? '#f7f6ef' : '#d3d6cf');
    }
    for (let j = 0; j < 12; j++) { const l = 4 + Math.floor(5 * Math.sin((j / 11) * Math.PI)); R(g, px + 34 - (j >> 2), py + 3 + j, l, 1, j % 3 ? '#b9cfce' : '#a6c0c2'); }
    for (let k = 0; k < 34; k++) R(g, px + 12 + k, py + 14 + Math.round(2 * Math.sin(k / 4)), 1, 1, '#ffffff');
    R(g, px + 14, py + 17, 30, 1, '#f5f3ea');
    R(g, px, py + ph - 1, pw, 1, '#b9bcb8'); for (let k = 0; k < 6; k++) R(g, px + 24 + k * 3, py + ph - 1, 2, 1, ['#6f9ccc', '#d6a75a', '#7fb88d'][k % 3]);
    // o quadro de avisos de acrílico, preso por 4 botões de metal
    const ax = 216, ay = 10;
    R(g, ax, ay, 24, 25, 'rgba(225,232,238,0.45)'); R(g, ax, ay, 24, 1, 'rgba(255,255,255,0.7)'); R(g, ax + 23, ay, 1, 25, 'rgba(70,76,84,0.45)'); R(g, ax, ay + 24, 24, 1, 'rgba(70,76,84,0.45)');
    for (const [dx, dy] of [[1, 1], [21, 1], [1, 22], [21, 22]]) R(g, ax + dx, ay + dy, 2, 2, '#6b7077');
    R(g, ax + 5, ay + 4, 8, 10, '#f3f3f1'); R(g, ax + 6, ay + 5, 6, 4, '#4e565f'); R(g, ax + 6, ay + 10, 5, 1, '#9aa0a6'); R(g, ax + 6, ay + 12, 4, 1, '#9aa0a6');
    R(g, ax + 15, ay + 5, 5, 7, '#e9e8e2');
  }
  // a porta de madeira escura com o visor comprido de vidro; em cima, a placa verde de saída
  function desenharPortaAds(g, sc, e) {
    const K = DL.isoKit, x0 = e.px, x1 = e.px + T, y0 = e.py + 12, y1 = y0 + 4, ym = y1 - 1, Hd = 28;
    const bat = { s: '#6d3a20', e: '#4e2815', t: '#8a4e2d' }, par = { s: S1.cor, e: shade(S1.cor, -0.25), t: shade(S1.cor, 0.38) };
    K.isoT(g, sc);
    K.poly(g, [[x0 + 1, y0, 0], [x1 - 1, y0, 0], [x1 - 1, y0, Hd], [x0 + 1, y0, Hd]], '#17120e');
    const ab = Math.max(0, Math.min(1, e.open || 0)) * 1.35, A = [x0 + 2, ym], at = (k, z) => [A[0] + 12 * k * Math.cos(ab), A[1] - 12 * k * Math.sin(ab), z];
    K.poly(g, [at(0, 0), at(1, 0), at(1, Hd), at(0, Hd)], ab < 0.7 ? '#9a5630' : '#74401f');
    K.poly(g, [at(0.22, 7), at(0.42, 7), at(0.42, 23), at(0.22, 23)], '#dfe6ea', false);
    K.line(g, at(0.34, 21), at(0.28, 11), 'rgba(255,255,255,0.8)');
    K.line(g, at(0.88, 12), at(0.88, 14.5), '#d9dde1', 1);
    K.box(g, x0, y0, x0 + 1.5, y1, 0, Hd + 1.5, bat);
    K.box(g, x1 - 1.5, y0, x1, y1, 0, Hd + 1.5, bat);
    K.box(g, x0, y0, x1, y1, Hd, Hd + 1.5, bat);
    K.box(g, x0, y0, x1, y1, Hd + 1.5, ALT, par);
    const S = (u, z) => [x0 + u, y1, z];
    K.poly(g, [S(0, 41), S(T, 41), S(T, ALT), S(0, ALT)], '#f1f1f0', false);
    K.poly(g, [S(4.5, 32), S(11.5, 32), S(11.5, 36.5), S(4.5, 36.5)], '#2f9a5c', false);          // a placa de saída
    K.poly(g, [S(5.5, 33), S(7, 33), S(7, 35.5), S(5.5, 35.5)], '#ffffff', false);
    K.poly(g, [S(8, 33.8), S(10.6, 33.8), S(10.6, 34.8), S(8, 34.8)], '#ffffff', false);
    return caixaTela(x0, y0, x1, y1, 0, ALT);
  }

  function itens1() {
    const out = [], MAG = '#d81b84', AMA = '#f0b016', AZ = '#1a6fc0';
    out.push(painel('n', 2 * T, T, 2 * T, (g, W) => pintarFundo1(g, W, T)));
    out.push(painel('n', 2 * T, 3 * T, 8 * T, (g, W) => pintarFundo1(g, W, 3 * T)));
    out.push(painel('o', T, S1.y0 * T, S1.y1 * T, pintarEsquerda1));
    FILEIRAS.forEach((y, k) => {
      out.push({ id: 'ADS-' + k, kind: 'table', variant: 'office', tx: 4, ty: y, tw: 4, drawIso: desenharMesaPreta, isoH: 20 });
      for (let x = 4; x <= 7; x++) { out.push(cadeira(x, y - 1, 'S')); out.push(cadeira(x, y + 1, 'N')); }
    });
    // as cadeiras da ponta, do lado do corredor
    out.push(cadeira(3, FILEIRAS[3], 'L', 4), cadeira(3, FILEIRAS[4], 'L', 4));
    // [fileira, coluna, cor da tela ou null (apagada), costas]
    const NOTES = [
      [0, 4, AMA], [0, 6, null, true], [0, 7, null],
      [1, 4, AZ], [1, 6, AZ], [1, 7, AMA],
      [2, 5, MAG], [2, 7, null],
      [3, 5, null], [3, 6, null, true], [3, 7, null],
      [4, 4, null, true], [4, 5, null], [4, 7, null],
    ];
    for (const [k, x, tela, costas] of NOTES) {
      const y = FILEIRAS[k];
      out.push(sobre('ADS-' + k, 'notebook-ads', x, y, Object.assign({ tela, costas: !!costas, drawIso: desenharNotebook, isoH: 24, glow: tela ? 'rgba(150,170,220,0.03)' : undefined },
        ver('Ver o notebook', tela ? 'Notebook ligado, com o escudo da Serra Dourada na tela.' : 'Notebook do laboratório, com a tela apagada.'), ponto(x * T + 8, costas ? y * T - 12 : y * T + 28))));
    }
    out.push(sobre('ADS-2', 'caixa-ads', 4, FILEIRAS[2], ponto(4 * T - 8, FILEIRAS[2] * T + 8)));
    out.push(sobre('ADS-4', 'copo', 6, FILEIRAS[4]));
    out.push({ kind: 'ponto', solid: false, wall: true, tx: 1, ty: 8, drawIso: () => null, dica: 'Ver a projeção', texto: 'Projetado na parede: "Aula de hoje: lógica de programação".', ponto: [T + 10, 10 * T] });
    out.push({ kind: 'ponto', solid: false, wall: true, tx: 1, ty: 4, drawIso: () => null, dica: 'Ler os avisos', texto: 'Quadro de avisos da sala de ADS.', ponto: [T + 10, 4.5 * T] });
    out.push({ id: 'PORTA', kind: 'porta', sala: 1, tx: S1.porta, ty: 1, solid: false, drawIso: desenharPortaAds, isoRect: [S1.porta * T, T + 12, S1.porta * T + T, 2 * T], isoH: 48, to: 'faculdade', toSpawn: F.VOLTA[1], ponto: [S1.porta * T + 8, 2 * T + 8] });
    return out;
  }

  /* ================================================================== */
  /* Sala 2                                                              */
  /* ================================================================== */
  // mapa: colunas 1 a 16; linhas 1 a 8; a porta fica na parede da frente
  const S2 = { W: 18, H: 10, porta: 8, azul: '#0c5c74', amarelo: '#c6a034', azulejo: '#e4e6e9' };
  const BANCADAS = [4, 7, 10, 13]; // coluna de cada bancada (linhas 1 a 5)
  const FAIXA = 23;                // até esta linha a parede é colorida; para baixo, azulejo branco

  // os ícones da parede azul-petróleo (7 × 7) e a cor da bolinha de cada um, na ordem da foto
  const ICONES = [
    ['#1f9b98', ['.....x.', '....x.x', '..xx.x.', '.x.x.x.', '.xxx...', 'x.x....', '.x.....']],  // articulação
    ['#0a4a5f', ['..x.x..', '.xx.x.x', '.xx.x.x', 'x.xxxxx', 'xxxxxx.', '.xxxx..', '..xx...']],  // mão
    ['#2f80e8', ['...xx..', '..x.xx.', '.xxxx.x', 'x.x...x', 'x..x..x', '.x...x.', '..xxx..']],  // coração
    ['#c4962a', ['xx...xx', 'xx...xx', 'xxx.xxx', '.xx.xx.', '.xx.xx.', '.xx.xx.', '.xx.xx.']],  // pés
    ['#1f9b98', ['.xx.xx.', 'x..x..x', 'x..x..x', 'xxx.xxx', '.x.x.x.', '..x.x..', '...x...']],  // batimento
    ['#0a4a5f', ['.......', '..xxxx.', '.x.x.xx', 'xx.xx.x', 'x.x..xx', '.xxxxx.', '....x..']],  // cérebro
    ['#0a4a5f', ['..x....', '..x.xx.', '..xx..x', '.x....x', 'x....x.', 'x.xxx..', '.x.....']],  // estômago
    ['#2f80e8', ['.x.x.x.', '.......', '..xxx..', '.x.x.x.', 'x.xxx.x', '.x.x.x.', '..xxx..']],  // olho
    ['#c4962a', ['...x...', '...x...', '.xxxxx.', 'xx.x.xx', 'x.x.x.x', 'x.x.x.x', 'xx...xx']],  // pulmões
  ];
  function azulejos(g, W, esc) {
    R(g, 0, FAIXA, W, ALT - FAIXA, shade(S2.azulejo, -esc));
    for (let x = 0; x < W; x += 24) R(g, x, FAIXA, 1, ALT - FAIXA, shade(S2.azulejo, -esc - 0.05));
    R(g, 0, FAIXA + 10, W, 1, shade(S2.azulejo, -esc - 0.05));
    R(g, 0, FAIXA, W, 1, 'rgba(255,255,255,0.5)');
  }
  function pintarFundo2(g, W) {
    azulejos(g, W, 0);
    R(g, 0, 0, W, FAIXA, S2.azul);
    // as linhas de impressão digital
    const cs = []; for (let i = 0; i < 9; i++) cs.push([i * 32 + hash(i * 7 + 2) * 14, 4 + hash(i * 11 + 5) * 16]);
    for (let y = 4; y < FAIXA; y++) for (let x = 0; x < W; x++) {
      let m = 1e9;
      for (const [a, b] of cs) m = Math.min(m, Math.hypot((x - a) * 0.8, (y - b) * 1.3) + 1.2 * Math.sin(x * 0.23 + y * 0.4));
      if (Math.floor(m + 40) % 3 === 0) R(g, x, y, 1, 1, '#146d86');
    }
    for (let k = 0, x = 12; x < W - 6; k++, x += 18) {
      const [cor, des] = ICONES[k % ICONES.length], cy = 13;
      for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) if (dx * dx + dy * dy <= 38) R(g, x + dx, cy + dy, 1, 1, cor);
      des.forEach((l, j) => { for (let i = 0; i < 7; i++) if (l[i] === 'x') R(g, x - 3 + i, cy - 3 + j, 1, 1, '#eef6f6'); });
    }
    R(g, 34, 5, 12, 1, 'rgba(255,255,255,0.35)'); R(g, 150, 5, 12, 1, 'rgba(255,255,255,0.25)'); // reflexo das lâmpadas
    R(g, 201, 3, 2, ALT - 3, '#9ba1a6'); R(g, 203, 3, 1, ALT - 3, '#6d7379');                    // o cano
    sombraParede(g, W, 0.12);
    forro(g, W);
  }
  // letras 5 × 7 da frase da parede amarela (com contorno de sombra)
  const LETRAS = {
    P: ['1110', '1001', '1001', '1110', '1000', '1000', '1000'], r: ['0000', '0000', '1011', '1100', '1000', '1000', '1000'],
    á: ['0010', '0100', '0110', '0001', '0111', '1001', '0111'], t: ['0100', '0100', '1110', '0100', '0100', '0100', '0011'],
    i: ['1', '0', '1', '1', '1', '1', '1'], c: ['0000', '0000', '0111', '1000', '1000', '1000', '0111'],
    a: ['0000', '0000', '0110', '0001', '0111', '1001', '0111'], s: ['0000', '0000', '0111', '1000', '0110', '0001', '1110'],
    2: ['0110', '1001', '0001', '0010', '0100', '1000', '1111'],
  };
  function frase(g, s, x, y, cor) {
    for (const ch of s) {
      const l = LETRAS[ch];
      if (l) l.forEach((ln, j) => { for (let i = 0; i < ln.length; i++) if (ln[i] === '1') R(g, x + i, y + j, 1, 1, cor); });
      x += l ? l[0].length + 1 : 3;
    }
  }
  const NOME_PAREDE = 'Práticas 2'; // (na foto só aparece o fim do nome: "…cas 2")
  function pintarEsquerda2(g, W) {
    azulejos(g, W, 0.06);
    R(g, 0, 0, W, FAIXA, S2.amarelo);
    frase(g, NOME_PAREDE, 43, 13, '#9c7c1f'); frase(g, NOME_PAREDE, 42, 12, '#f3f1ea');
    arSplit(g, 10, 5, 28); arSplit(g, W - 36, 5, 28);
    // (à esquerda as tomadas; perto das pias, o papel-toalha e os saboneteiros)
    for (const x of [12, 30, 48]) tomada(g, x, 24);
    R(g, W - 42, 21, 8, 6, '#f7f8f8'); R(g, W - 42, 26, 8, 1, '#aeb3b7'); R(g, W - 40, 25, 4, 1, '#d5d8da');
    for (const x of [W - 31, W - 12]) { R(g, x, 21, 4, 6, '#f7f8f8'); R(g, x, 26, 4, 1, '#aeb3b7'); R(g, x + 1, 22, 2, 1, '#a9b0b5'); }
    sombraParede(g, W, 0.16);
    R(g, 0, 0, W, ALT, 'rgba(0,0,0,0.04)');
    forro(g, W);
  }

  function itens2() {
    const out = [];
    out.push(painel('n', T, T, 17 * T, pintarFundo2));
    out.push(painel('o', T, T, 9 * T, pintarEsquerda2));
    out.push(Object.assign({ id: 'PIA', kind: 'balcao-pia', tx: 1, ty: 1, th: 7, drawIso: desenharBalcaoPia, isoH: 24 }, ver('Usar a pia', 'Lavar bem as mãos antes e depois da aula prática!'), ponto(2 * T + 8, 2 * T)));
    BANCADAS.forEach((x, k) => {
      out.push({ id: 'LAB-' + k, kind: 'table', variant: 'standing', tx: x, ty: 1, th: 5, drawIso: desenharBancada, isoH: 24 });
      for (let y = 2; y <= 5; y++) { out.push(banco(x - 1, y, 'L')); out.push(banco(x + 1, y, 'O')); }
    });
    // a mesinha mais baixa na ponta da primeira bancada
    out.push({ id: 'LAB-BAIXA', kind: 'table', variant: 'office', tx: BANCADAS[0], ty: 6, drawIso: desenharBancada, isoH: 18 });
    const M = (k, kind, y, dica, texto) => out.push(sobre('LAB-' + k, kind, BANCADAS[k], y, Object.assign(ver(dica, texto), ponto(BANCADAS[k] * T + 27, y * T + 8))));
    M(1, 'm-olho', 1, 'Ver o olho', 'Modelo do olho humano.');
    M(1, 'm-cranio', 2, 'Ver o crânio', 'Modelo de crânio, com um músculo da mastigação em vermelho.');
    M(1, 'm-musculo', 3, 'Ver a cabeça', 'Modelo dos músculos da cabeça e do cérebro.');
    M(1, 'm-coracao', 4, 'Ver o coração', 'Modelo de coração humano, ampliado.');
    M(1, 'm-figado', 5, 'Ver o fígado', 'Modelo de fígado.');
    M(2, 'm-mao', 1, 'Ver a mão', 'Modelo dos músculos da mão.');
    M(2, 'm-braco', 2, 'Ver o braço', 'Modelo dos músculos do braço.');
    M(2, 'm-osso', 3, 'Ver os ossos do braço', 'Escápula, úmero, rádio, ulna e os ossos da mão.');
    M(2, 'm-torso', 5, 'Ver o torso', 'Torso de anatomia: metade músculos, metade pele.');
    M(3, 'm-cabeca', 2, 'Ver a cabeça', 'Modelo de cabeça.');
    M(3, 'm-pe', 4, 'Ver o pé', 'Modelo dos músculos do pé.');
    // armários no fim da sala, com modelos em cima
    const rArm = [16 * T, T, 17 * T, 6 * T];
    out.push({ id: 'ARMARIO', kind: 'table', variant: 'standing', tx: 16, ty: 1, th: 5, drawIso: desenharArmario, isoRect: rArm, isoH: 24 });
    [['m-corpo', 1, 'Ver o corpo', 'Modelo pequeno dos músculos do corpo inteiro.'], ['m-pelve', 3, 'Ver a pelve', 'Modelo de pelve em corte.'], ['m-pescoco', 5, 'Ver o pescoço', 'Modelo de cabeça e pescoço em corte.']].forEach(([kind, y, d, t]) =>
      out.push(sobre('ARMARIO', kind, 16, y, Object.assign({ sobe: Z_ARM - 17 }, ver(d, t), ponto(16 * T - 8, y * T + 8)))));
    // a mesa do professor e a cadeira
    out.push(Object.assign({ id: 'PROF', kind: 'table', variant: 'office', tx: 13, ty: 7, th: 2, drawIso: desenharMesaProf, isoH: 18 }, ver('Ver a mesa do professor', 'O controle do projetor e o cabo HDMI.'), ponto(13 * T - 6, 8 * T)));
    out.push(assento('cadeira-preta', 14, 7, 'O', 2, 5.5));
    out.push({ id: 'PORTA', kind: 'porta', front: true, sala: 2, tx: S2.porta, ty: 9, solid: false, drawIso: F.desenharPorta, isoRect: [S2.porta * T, 9 * T, S2.porta * T + T, 9 * T + 4], isoH: 36, to: 'faculdade', toSpawn: F.VOLTA[2], ponto: [S2.porta * T + 8, 9 * T - 6] });
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Os 2 mapas                                                          */
  /* ------------------------------------------------------------------ */
  const rep = (c, n) => c.repeat(n);
  const tiles1 = [rep('#', S1.W), '##1' + rep('#', S1.W - 3), ...Array(S1.y1 - S1.y0).fill('#' + rep('1', S1.W - 2) + '#'), rep('#', S1.W)];
  const tiles2 = [rep('#', S2.W), ...Array(8).fill('#' + rep('2', S2.W - 2) + '#'), rep('#', S2.porta) + 'o' + rep('#', S2.W - S2.porta - 1)];

  // Uma vez, depois que o motor monta as paredes: as bordas baixas da frente ficam na cor da sala (o motor usa um
  // azul padrão) e em pedaços de 1 tile (a borda inteira, de tão comprida, fazia o motor achar que todo mundo
  // estava atrás dela e desenhar os alunos transparentes); na Sala 1, sai o vão que sobrava atrás da porta.
  function ajustarParedes(sc, o) {
    const st = sc._isoSt;
    if (!st || st._salas) return;
    st._salas = true;
    const estilo = sc.world.rooms[0].style, runs = [];
    for (const r of st.runs) {
      if (r.r[1] < (o.fundo || 0)) continue;
      if (r.style) { runs.push(r); continue; }
      const [x0, y0, x1, y1] = r.r;
      for (let y = y0; y < y1; y += T) for (let x = x0; x < x1; x += T) runs.push(Object.assign({}, r, { style: estilo, r: [x, y, Math.min(x + T, x1), Math.min(y + T, y1)] }));
    }
    st.runs = runs;
  }
  function sala(n, o) {
    const nome = 'Sala ' + n + ' · ' + F.NOME_SALA[n], itens = o.itens();
    for (const e of itens) if (e.host) {
      const m = itens.find((h) => h.id === e.host);
      e.isoRect = m.isoRect || [m.tx * T, m.ty * T, (m.tx + (m.tw || 1)) * T, (m.ty + (m.th || 1)) * T];
    }
    DL.registerMap({
      id: 'faculdade-sala' + n,
      name: nome,
      tiles: o.tiles,
      items: itens,
      rooms: [Object.assign({ style: { wall: 'sala' + n, wallColor: o.cor, light: 'bright' } }, o.area)],
      spawn: o.spawn,
      spawnDir: o.dir,
      portals: [{ tx: o.porta[0], ty: o.porta[1], to: 'faculdade', spawn: F.VOLTA[n] }],
      camera: { tilesWide: 20, minTilesHigh: 9, pixelH: 480, minS: 2 },
      enter(game) {
        F.prepararSalas(game);
        F.esconderMissao(true);
        F.afastarCamera(game.scene);
        colisaoFina(game.scene);
        for (const e of game.world.items) if (e.ponto) { e.ix = e.ponto[0]; e.iy = e.ponto[1]; }
        game.toast(nome);
        DL.FacAlunos.iniciar(game, 'sala' + n);
      },
      leave() { F.esconderMissao(false); },
      update(game, dt) {
        ajustarParedes(game.scene, o);
        DL.FacAlunos.atualizar(game, dt);
        F.animarPortas(game, dt);
      },
      overlay(g, sc) { DL.FacAlunos.desenharFalas(g, sc); },
      useLabel: (game, e) => (e.id === 'PORTA' ? 'Voltar ao corredor' : F.useLabel(game, e)),
      use: F.use,
    });
  }
  sala(1, { tiles: tiles1, itens: itens1, cor: S1.cor, area: { x: 1, y: 1, w: 7, h: 18 }, spawn: [S1.porta, 3], dir: 'down', porta: [S1.porta, 1], fundo: 2 * T - 4 });
  sala(2, { tiles: tiles2, itens: itens2, cor: '#d9dbde', area: { x: 1, y: 1, w: 16, h: 8 }, spawn: [S2.porta, 7], dir: 'up', porta: [S2.porta, 9] });
})();

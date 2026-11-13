/* Venti Experience — a rua da Faculdade Serra Dourada e do DataLab (mapa jogável, à noite).
   É a rua do DataLab original (referencia/17) ESPELHADA: a rua sobe pela DIREITA da tela e as
   fachadas olham para a direita, para a rua. De baixo para cima:
     1. FACULDADE SERRA DOURADA (fotos 16, 06, 07) — prédio de esquina; a frente é uma parede reta em
        DIAGONAL que corta a esquina, com a porta de vidro. É o centro da cena: luz quente e suave.
     2. DATALAB, colado na faculdade, com o letreiro de néon verde aceso (a porta leva à sala de datalab.js)
     3. dois jardins com muro baixo
   O carro chega pela viagem (abertura.js) e fica parado no meio-fio; o boneco desce e anda pela calçada
   até a porta: "Pressione E para entrar".

   Como é desenhado: cada prédio é pintado UMA vez num sprite (já com a cor da noite e as luzes) e o
   chão também (calçada, rua, faixas e as poças de luz). A cada quadro é só copiar. Sem luz dinâmica.

   Letras do mapa: K calçada · A asfalto · E vaga (junto ao meio-fio) · X prédio · J canteiro · Z borda */
(function () {
  'use strict';
  const DL = window.DL, T = DL.T, R = DL.R, hash = DL.hash, K = DL.isoKit, A = DL.Arte, P = DL.Pecas;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };

  /* ------------------------------------------------------------------ */
  /* Layout (tiles)                                                      */
  /* ------------------------------------------------------------------ */
  const W = 46, H = 72;
  const FRENTE = 22;                         // a linha das fachadas (x); a calçada vai daqui até a vaga
  const VAGA = [27, 29], RUA = [29, 37], CALC2 = [37, 40];
  const TRANSV = [62, 68];                   // a rua transversal (y), ao sul da faculdade
  const SERRA = { x0: 5, y0: 43, x1: 22, y1: 59, c: 7, h: 118 };  // c = o tamanho do corte da esquina
  const DATALAB = { x0: 9, y0: 29, x1: 22, y1: 43, h: 84 }; // colado na Serra Dourada (parede com parede)
  // depois do DataLab não há loja: só jardins atrás de um muro baixo (o lugar das antigas lojinhas)
  const JARDINS = [{ y0: 17, y1: 28 }, { y0: 6, y1: 16 }];
  const DL_PORTA = { x: 22.6 * T, y: ((DATALAB.y0 + DATALAB.y1) / 2) * T }; // a porta de vidro do DataLab (no meio da fachada)
  const PREDIOS = [SERRA, DATALAB];
  const noCorte = (x, y) => x + y > SERRA.x1 + SERRA.y1 - SERRA.c; // na frente da parede diagonal (é calçada)
  function letra(tx, ty) {
    if (tx < 1 || ty < 1 || tx >= W - 1 || ty >= H - 1) return 'Z';
    const x = tx + 0.5, y = ty + 0.5;
    for (const b of PREDIOS) if (x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1) return b === SERRA && noCorte(x, y) ? 'K' : 'X';
    if (y > TRANSV[0] && y < TRANSV[1]) return x < RUA[1] ? 'A' : x < CALC2[1] ? 'K' : 'J';
    if (x > RUA[0] && x < RUA[1]) return 'A';
    if (x > VAGA[0] && x < VAGA[1]) return y < SERRA.y1 + 1 ? 'E' : 'K';
    if (x > FRENTE && x < VAGA[0]) return 'K';
    if (x > CALC2[0] && x < CALC2[1]) return 'K';
    if (y > SERRA.y1 && y < TRANSV[0] && x < VAGA[0]) return 'K';     // calçada ao sul da faculdade
    if (y > TRANSV[1] && y < TRANSV[1] + 2 && x < CALC2[1]) return 'K'; // calçada do outro lado da transversal
    return 'J';
  }
  const ROWS = [];
  for (let y = 0; y < H; y++) { let s = ''; for (let x = 0; x < W; x++) s += letra(x, y); ROWS.push(s); }
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 'Z' : ROWS[Math.floor(y)][Math.floor(x)]);
  Object.assign(DL.SOLID_TILES, { A: 1, E: 1, X: 1, J: 1, Z: 1 });

  // as cores da noite
  const C = { asf: '#22252f', asf2: '#272a35', calc: '#474a58', junta: '#3c3f4c', guia: '#6b6f7e', grama: '#1b3327', grama2: '#22402f', vaga: '#292c37', faixa: '#8f93a3', amarelo: '#8a7636', borda: '#10131c' };
  const CHAO = { K: C.calc, A: C.asf, E: C.vaga, X: '#171a22', J: C.grama, Z: C.borda };
  for (const k in CHAO) DL.FLOORS[k] = (g, px, py) => R(g, px, py, T, T, CHAO[k]);

  /* ------------------------------------------------------------------ */
  /* Ferramentas de desenho                                              */
  /* ------------------------------------------------------------------ */
  // um sprite em espaço isométrico: fn desenha com K.box / K.poly como se fosse a cena
  function isoSpr(x0, y0, x1, y1, alt, pad, fn) {
    const X0 = Math.floor(x0 - y1) - pad, X1 = Math.ceil(x1 - y0) + pad, Y0 = Math.floor((x0 + y0) / 2 - alt) - pad, Y1 = Math.ceil((x1 + y1) / 2) + pad;
    const c = DL.mk(X1 - X0, Y1 - Y0), g = c.getContext('2d'), fsc = { S: 1, ox: X0, oy: Y0 };
    g.imageSmoothingEnabled = false; g.lineWidth = 1; g.lineJoin = 'round';
    const o = { c, g, fsc, X0, Y0, iso() { K.isoT(g, fsc); },
      // escurece o que já foi desenhado (a noite); o que vier depois fica aceso
      noite(a) { g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(10,13,38,' + a + ')'; g.fillRect(0, 0, c.width, c.height); g.globalCompositeOperation = 'source-over'; K.isoT(g, fsc); },
      // cola uma imagem plana numa parede: O = canto de cima (x, y, z) e U = para onde a imagem anda
      parede(img, O, U, alpha) { K.setMap(g, fsc, O, U, [0, 0, -1]); g.globalAlpha = alpha == null ? 1 : alpha; g.drawImage(img, 0, 0); g.globalAlpha = 1; K.isoT(g, fsc); },
      brilho(x, y, z, r, rgb, a) { g.globalCompositeOperation = 'lighter'; const X = x - y, Y = (x + y) / 2 - z, gr = g.createRadialGradient(X, Y, 0, X, Y, r); gr.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + rgb + ',0)'); g.fillStyle = gr; g.fillRect(X - r, Y - r, r * 2, r * 2); g.globalCompositeOperation = 'source-over'; },
    };
    K.isoT(g, fsc);
    fn(o, g);
    return o;
  }
  const desenha = (g, sc, e) => { K.isoT(g, sc); g.drawImage(e.spr.c, e.spr.X0, e.spr.Y0); };
  // uma imagem plana (parede vista de frente) com a camada do que acende
  function plana(w, h, fn) {
    const c = DL.mk(w, h), l = DL.mk(w, h);
    fn(c.getContext('2d'), l.getContext('2d'));
    return { c, l };
  }
  // paredes de um bloco: sul (y = y1) e leste (x = x1), com a imagem de cada uma
  const paredeSul = (o, b, img, alpha, x0, x1) => o.parede(img, [(x0 == null ? b.x0 : x0) * T, b.y1 * T, b.h], [1, 0, 0], alpha);
  const paredeLeste = (o, b, img, alpha, y1) => o.parede(img, [b.x1 * T, (y1 == null ? b.y1 : y1) * T, b.h], [0, -1, 0], alpha);

  /* ------------------------------------------------------------------ */
  /* Faculdade Serra Dourada                                             */
  /* ------------------------------------------------------------------ */
  function fazSerra() {
    const b = SERRA, f = A.serra(), cT = b.c * T, alto = f.alto, marq = f.marq, hh = b.h;
    // lateral da rua (leste): metal, a faixa da marquise e a vidraça com plantas (foto 07)
    const wl = (b.y1 - b.c - b.y0) * T;
    const leste = plana(wl, hh, (g, q) => {
      A.metal(g, 0, 0, wl, alto, true);
      R(g, 0, alto, wl, marq, '#b05a2a'); R(g, 0, alto, wl, 2, '#cf7440'); R(g, 0, alto + marq - 3, wl, 3, '#7c3c1c');
      for (let i = 6; i < wl; i += 13) R(g, i, alto + 2, 1, marq - 5, '#9c4e24');
      R(g, 0, alto + marq, wl, hh - alto - marq, '#c4c7cc'); R(g, 0, alto + marq, wl, 3, '#9a9ea6'); R(g, 0, hh - 4, wl, 4, '#a6aab1');
      for (let k = 0; k < 3; k++) {
        const vx = 8 + k * 46, vw = 38, vy = alto + marq + 6, vh = 26;
        R(g, vx - 1, vy - 1, vw + 2, vh + 2, '#9aa3b0'); R(g, vx, vy, vw, vh, '#58606c'); R(g, vx + 19, vy, 1, vh, '#c8ced6');
        q.fillStyle = '#eccf9f'; q.fillRect(vx, vy, vw, vh); R(q, vx + 19, vy, 1, vh, '#e6dccb');
        R(q, vx + 6 + k * 5, vy + 12, 12, 2, '#8a6a48'); R(q, vx + 9 + k * 5, vy + 6, 5, 6, '#5a4a40'); // mesas e alguém estudando, em silhueta
        for (let i = 0; i < 4; i++) { const px = vx + 3 + i * 10, h = 7 + ((i + k) * 5) % 6; for (let j = -2; j <= 2; j++) { R(g, px + j, hh - 4 - h + Math.abs(j) * 2, 1, h - Math.abs(j) * 2, j % 2 ? '#3c7a46' : '#2f6238'); R(q, px + j, hh - 4 - h + Math.abs(j) * 2, 1, h - Math.abs(j) * 2, j % 2 ? '#2a5a34' : '#1f4628'); } }
      }
      for (let i = 14; i < wl; i += 22) R(q, i, alto + marq, 2, 1, '#fff1cf');
    });
    // lateral da transversal (sul): metal, marquise e dois painéis iluminados (foto 07)
    const ws = (b.x1 - b.c - b.x0) * T;
    const sul = plana(ws, hh, (g, q) => {
      A.metal(g, 0, 0, ws, alto, false);
      R(g, 0, alto, ws, marq, '#c9662f'); R(g, 0, alto, ws, 2, '#e58a4e'); R(g, 0, alto + marq - 3, ws, 3, '#8f4520');
      for (let i = 4; i < ws; i += 13) R(g, i, alto + 2, 1, marq - 5, '#b55a28');
      R(g, 0, alto + marq, ws, hh - alto - marq, '#d3d6da'); R(g, 0, alto + marq, ws, 3, '#a9adb4'); R(g, 0, hh - 4, ws, 4, '#b4b8be');
      for (const px of [22, 86]) {
        R(g, px - 1, alto + marq + 6, 46, 28, '#7d8590'); R(g, px, alto + marq + 7, 44, 26, '#e9ecef');
        for (const G of [g, q]) { R(G, px, alto + marq + 7, 44, 26, '#f4f1e8'); R(G, px + 2, alto + marq + 9, 18, 14, px < 50 ? '#c9662f' : '#3c8a4a'); A.brasao(G, px + 6, alto + marq + 10, 1, '#ffffff'); A.text(G, 'SERRA', px + 23, alto + marq + 10, 1, '#3a3f4a'); A.text(G, px < 50 ? 'CURSOS' : '2026', px + 23, alto + marq + 17, 1, '#c8262e'); R(G, px + 3, alto + marq + 27, 36, 1, '#7d8590'); R(G, px + 3, alto + marq + 30, 24, 1, '#7d8590'); }
      }
      for (let i = 10; i < ws; i += 22) R(q, i, alto + marq, 2, 1, '#fff1cf');
    });
    const x0 = b.x0 * T, y0 = b.y0 * T, x1 = b.x1 * T, y1 = b.y1 * T;
    return isoSpr(x0, y0, x1, y1, hh, 44, (o, g) => {
      // cobertura (um pentágono: a esquina cortada), com platibanda, calha e as máquinas de ar
      const topo = [[x0, y0, hh], [x1, y0, hh], [x1, y1 - cT, hh], [x1 - cT, y1, hh], [x0, y1, hh]];
      K.poly(g, topo, '#5b616d');
      K.poly(g, [[x0 + 5, y0 + 5, hh], [x1 - 5, y0 + 5, hh], [x1 - 5, y1 - cT - 2, hh], [x1 - cT - 2, y1 - 5, hh], [x0 + 5, y1 - 5, hh]], '#4a505b');
      for (let i = 1; i < 8; i++) K.line(g, [x0 + 5, y0 + i * 30, hh], [x1 - 5, y0 + i * 30, hh], '#444a55');
      for (const [ax, ay] of [[x0 + 40, y0 + 40], [x0 + 110, y0 + 60], [x0 + 60, y0 + 150]]) { K.box(g, ax, ay, ax + 26, ay + 18, hh, hh + 10, { s: '#8d95a2', e: '#737b88', t: '#aab1bd' }); K.box(g, ax + 6, ay + 4, ax + 20, ay + 14, hh + 10, hh + 11, { t: '#3a3f4a' }); }
      paredeSul(o, b, sul.c, 1, b.x0, b.x1 - b.c);
      paredeLeste(o, b, leste.c, 1, b.y1 - b.c);
      // a frente, em diagonal: fica de frente para a câmera, é só colar
      const FX = x1 - cT - y1 + 4, FY = (x1 - cT + y1) / 2 - f.chao;
      K.poly(g, [[x1 - cT, y1, 0], [x1, y1 - cT, 0], [x1, y1 - cT, hh - alto - marq], [x1 - cT, y1, hh - alto - marq]], '#d3d6da');
      K.poly(g, [[x1 - cT, y1, hh - alto - marq], [x1, y1 - cT, hh - alto - marq], [x1, y1 - cT, hh], [x1 - cT, y1, hh]], '#b9c1cc');
      g.drawImage(f.base, FX, FY);
      K.line(g, [x1 - cT, y1, 0], [x1 - cT, y1, hh], '#e8ecf1'); K.line(g, [x1, y1 - cT, 0], [x1, y1 - cT, hh], '#8d95a2');
      o.noite(0.5);
      /* aceso: letreiro, recepção, vidraças, painéis e o fio de luz da marquise */
      paredeSul(o, b, sul.l, 0.75, b.x0, b.x1 - b.c);
      paredeLeste(o, b, leste.l, 0.9, b.y1 - b.c);
      g.drawImage(f.luz, FX, FY);
      const px = x1 - cT + (f.porta + 4) / 2, py = y1 - (f.porta + 4) / 2; // a porta, no chão (anda meio pixel do mundo por pixel da tela)
      o.brilho(px, py, 20, 70, '255,196,128', 0.34);          // a recepção
      o.brilho(px + 2, py + 2, 50, 110, '255,200,140', 0.16); // a marquise inteira, bem suave
      o.brilho(x1 - cT / 2, y1 - cT / 2, 88, 80, '225,235,255', 0.12); // o letreiro
      o.brilho(x1, y1 - cT - 70, 22, 46, '255,205,150', 0.2); // a vidraça da lateral
    });
  }

  /* ------------------------------------------------------------------ */
  /* DataLab (o estilo do original, com MUITO menos luz) e as lojinhas   */
  /* ------------------------------------------------------------------ */
  function fazDatalab() {
    const b = DATALAB, hh = b.h, wl = (b.y1 - b.y0) * T, ws = (b.x1 - b.x0) * T;
    const leste = plana(wl, hh, (g, q) => {
      R(g, 0, 0, wl, hh, '#1c3a30'); R(g, 0, 0, wl, 2, '#2f5a4a'); R(g, 0, hh - 4, wl, 4, '#12261f');
      for (let i = 0; i < wl; i += 16) R(g, i, 2, 1, hh - 6, '#16302a');
      R(g, 0, 26, wl, 2, '#145c3d');                          // a faixa de néon (os tubos apagados)
      // letreiro: caixa escura com o nome em tubos de néon (o aceso vai na camada "neon", com brilho próprio)
      const tw = A.textW('DATALAB', 3), sx = (wl - tw) >> 1;
      R(g, sx - 6, 3, tw + 12, 22, '#0c1612'); R(g, sx - 6, 3, tw + 12, 1, '#1f6b47');
      A.text(g, 'DATALAB', sx, 7, 3, '#1f6b47');
      // janelas estreitas (quase todas apagadas) e o saguão de vidro
      for (let k = 0; k < 8; k++) { const jx = 10 + k * 26, on = k === 2 || k === 6; R(g, jx, 34, 14, 9, '#0f2a22'); R(g, jx, 34, 14, 1, '#2f5a4a'); if (on) { q.fillStyle = '#5fd0a0'; q.fillRect(jx + 1, 35, 12, 7); } }
      const lx = (wl >> 1) - 32;
      R(g, lx - 2, 48, 68, hh - 48, '#0c1612'); R(g, lx, 50, 64, hh - 52, '#0f4a33'); R(g, lx, 50, 64, 3, '#1f9e66');
      for (const i of [21, 31, 42]) R(g, lx + i, 50, 1, hh - 52, '#0c1612');
      q.fillStyle = '#2a8a66'; q.fillRect(lx + 1, 53, 62, hh - 57); R(q, lx + 8, 66, 14, 12, '#1a5a44'); R(q, lx + 44, 60, 10, 18, '#1a5a44');
      for (const i of [21, 31, 42]) R(q, lx + i, 50, 1, hh - 52, '#0c1612');
    });
    // o néon aceso: letras e faixa em tubo verde, com o brilho em volta já pintado
    const neon = DL.mk(wl, hh), n = neon.getContext('2d');
    {
      const tw = A.textW('DATALAB', 3), sx = (wl - tw) >> 1;
      for (const [dx, dy, a] of [[-2, 0, 0.16], [2, 0, 0.16], [0, -2, 0.16], [0, 2, 0.16], [-1, -1, 0.3], [1, 1, 0.3], [-1, 1, 0.3], [1, -1, 0.3]]) A.text(n, 'DATALAB', sx + dx, 7 + dy, 3, 'rgba(61,255,160,' + a + ')');
      A.text(n, 'DATALAB', sx, 7, 3, '#46f5a6');
      A.text(n, 'DATALAB', sx, 6, 3, 'rgba(220,255,236,0.55)');  // o reflexo claro em cima de cada tubo
      A.text(n, 'DATALAB', sx, 7, 3, 'rgba(70,245,166,0.6)');
      // contorno de néon da caixa
      const bx = sx - 6, bw = tw + 12;
      R(n, bx, 3, bw, 1, '#2fe08a'); R(n, bx, 24, bw, 1, '#2fe08a'); R(n, bx, 3, 1, 22, '#2fe08a'); R(n, bx + bw - 1, 3, 1, 22, '#2fe08a');
      R(n, bx - 1, 2, bw + 2, 1, 'rgba(47,224,138,0.3)'); R(n, bx - 1, 25, bw + 2, 1, 'rgba(47,224,138,0.3)');
      // a faixa de néon que corre a fachada inteira
      R(n, 0, 25, wl, 1, 'rgba(61,255,160,0.3)'); R(n, 0, 26, wl, 1, '#46f5a6'); R(n, 0, 27, wl, 1, 'rgba(61,255,160,0.3)');
    }
    const sul = plana(ws, hh, (g) => {
      R(g, 0, 0, ws, hh, '#234a3c'); R(g, 0, 0, ws, 2, '#3a6e5a'); R(g, 0, hh - 4, ws, 4, '#16302a');
      for (let i = 0; i < ws; i += 16) R(g, i, 2, 1, hh - 6, '#1c3a30');
      for (let k = 0; k < 4; k++) R(g, 20 + k * 46, 30, 22, 8, '#0f2a22');
    });
    const x0 = b.x0 * T, y0 = b.y0 * T, x1 = b.x1 * T, y1 = b.y1 * T;
    return isoSpr(x0, y0, x1, y1, hh + 30, 16, (o, g) => {
      K.poly(g, [[x0, y0, hh], [x1, y0, hh], [x1, y1, hh], [x0, y1, hh]], '#24443a');
      K.poly(g, [[x0 + 5, y0 + 5, hh], [x1 - 5, y0 + 5, hh], [x1 - 5, y1 - 5, hh], [x0 + 5, y1 - 5, hh]], '#1a342c');
      for (const [ax, ay] of [[x0 + 30, y0 + 30], [x0 + 30, y0 + 90], [x0 + 100, y0 + 150]]) { K.box(g, ax, ay, ax + 34, ay + 26, hh, hh + 12, { s: '#6d7581', e: '#565d68', t: '#8a93a0' }); K.box(g, ax + 8, ay + 6, ax + 26, ay + 20, hh + 12, hh + 13, { t: '#2a2f38' }); }
      K.line(g, [x0 + 150, y0 + 40, hh], [x0 + 150, y0 + 40, hh + 28], '#9aa3b0');
      paredeSul(o, b, sul.c); paredeLeste(o, b, leste.c);
      o.noite(0.56);
      paredeLeste(o, b, leste.l, 0.7);                         // janelas e o saguão de vidro (a porta)
      paredeLeste(o, b, neon, 1);                              // o letreiro e a faixa de néon, acesos
      o.brilho(x1, (y0 + y1) / 2, hh - 14, 15, '61,255,160', 0.18); // (o brilho grande, que pulsa, é desenhado a cada quadro: rua-neon)
      R(g, x0 + 150 - (y0 + 40) - 1, (x0 + 150 + y0 + 40) / 2 - hh - 29, 2, 2, '#ff5050');
    });
  }
  // muro baixo na beira da calçada (fecha o jardim ao lado do DataLab): reboco claro com capa de pedra
  function fazMuro(j) {
    const x0 = (FRENTE - 0.5) * T, x1 = FRENTE * T - 2, y0 = j.y0 * T + 4, y1 = j.y1 * T - 4, h = 11;
    return isoSpr(x0, y0, x1, y1, h + 12, 6, (o, g) => {
      K.box(g, x0, y0, x1, y1, 0, h, { s: '#8f8a80', e: '#a39d91', t: '#b9b3a6' });
      K.box(g, x0 - 1, y0 - 1, x1 + 1, y1 + 1, h, h + 2, { s: '#6f6a62', e: '#857f75', t: '#c9c3b6' });
      for (let y = y0; y <= y1; y += 40) K.box(g, x0 - 1, y - 2, x1 + 1, y + 3, 0, h + 5, { s: '#77726a', e: '#8d877c', t: '#c9c3b6' }); // pilaretes
      for (let y = y0 + 6; y < y1; y += 5) K.line(g, [x1, y, 3 + ((y * 7) % 5)], [x1, y + 2, 3 + ((y * 7) % 5)], '#8a857a');
      o.noite(0.55);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Objetos pequenos (sprites de frente, "em pé" no chão)               */
  /* ------------------------------------------------------------------ */
  // escurece um sprite para a noite
  function daNoite(src, a) {
    const c = DL.mk(src.width, src.height), g = c.getContext('2d');
    g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(10,13,38,' + a + ')'; g.fillRect(0, 0, c.width, c.height);
    return c;
  }
  let HALO = null;
  function halo() { // o brilho de um poste, feito uma vez
    if (HALO) return HALO;
    HALO = DL.mk(64, 64); const g = HALO.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,214,150,0.85)'); gr.addColorStop(0.25, 'rgba(255,196,120,0.3)'); gr.addColorStop(1, 'rgba(255,190,110,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return HALO;
  }
  // o brilho verde do letreiro do DataLab (feito uma vez; a cada quadro só muda a força)
  let NEON = null;
  function neonHalo() {
    if (NEON) return NEON;
    NEON = DL.mk(128, 128); const g = NEON.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(70,255,170,0.75)'); gr.addColorStop(0.3, 'rgba(61,230,150,0.28)'); gr.addColorStop(1, 'rgba(61,216,150,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return NEON;
  }
  function desenhaNeon(g, sc) {
    const t = sc.t || 0, ciclo = t % 7.3;
    const pisca = (ciclo < 0.07 || (ciclo > 0.16 && ciclo < 0.21)) ? 0.55 : 1;  // de vez em quando o néon "falha"
    const k = (0.82 + 0.18 * Math.sin(t * 2.1)) * pisca;
    const x = DATALAB.x1 * T, y = DL_PORTA.y, z = DATALAB.h - 14, X = x - y, Y = (x + y) / 2 - z;
    K.isoT(g, sc);
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.55 * k; g.drawImage(neonHalo(), X - 80, Y - 34, 160, 68);   // o brilho largo em volta das letras
    g.globalAlpha = 0.3 * k; g.drawImage(neonHalo(), X - 60, Y + 24, 120, 70);    // a luz verde descendo pela fachada até a calçada
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }
  // um objeto em pé: o sprite fica com a base no centro do tile
  const emPe = (g, sc, e) => { K.isoT(g, sc); const X = Math.round(e.px + 8 - (e.py + 8)), Y = Math.round((e.px + 8 + e.py + 8) / 2); g.drawImage(e.img, X - (e.img.width >> 1), Y - e.img.height + (e.dy || 0)); return [X, Y]; };
  function fazPoste(lado) {
    const c = DL.mk(26, 62), g = c.getContext('2d'), x = lado > 0 ? 6 : 19;
    R(g, x, 4, 2, 58, '#4a4f5c'); R(g, x, 4, 1, 58, '#6b7080'); R(g, x - 1, 60, 4, 2, '#2a2d37');
    if (lado > 0) { R(g, x, 4, 14, 1, '#6b7080'); R(g, x + 11, 5, 6, 2, '#fff3d6'); } else { R(g, x - 12, 4, 14, 1, '#6b7080'); R(g, x - 15, 5, 6, 2, '#fff3d6'); }
    return c;
  }
  function desenhaPoste(g, sc, e) {
    const [X, Y] = emPe(g, sc, e);
    g.globalCompositeOperation = 'lighter';
    g.drawImage(halo(), X + e.lado * 8 - 20, Y - 58 - 20, 40, 40);
    g.globalCompositeOperation = 'source-over';
  }
  function fazVaso(seed) {
    const c = DL.mk(22, 26), g = c.getContext('2d');
    R(g, 3, 16, 16, 10, '#5a5d6a'); R(g, 3, 16, 16, 2, '#7a7e8c'); R(g, 3, 24, 16, 2, '#3c3f4c');
    for (let i = 0; i < 9; i++) { const px = 4 + i * 2 - (i % 2), h = 7 + Math.round(hash(seed * 5 + i) * 9); R(g, px, 17 - h, 1, h, i % 3 ? '#2f6a40' : '#3f8a50'); if (i % 3 === 0) R(g, px - 1, 17 - h + 2, 3, 2, '#3f8a50'); }
    return daNoite(c, 0.4);
  }
  function fazCamera() { // o poste com as câmeras (foto 06)
    const c = DL.mk(16, 58), g = c.getContext('2d');
    R(g, 7, 6, 2, 52, '#2a2f38'); R(g, 7, 6, 1, 52, '#4a4f5c'); R(g, 2, 10, 5, 3, '#c8ccd2'); R(g, 9, 13, 5, 3, '#c8ccd2'); R(g, 3, 17, 5, 3, '#c8ccd2'); R(g, 7, 24, 2, 2, '#3a6bff');
    return c;
  }
  function fazBanco() {
    const c = DL.mk(26, 14), g = c.getContext('2d');
    R(g, 1, 4, 24, 3, '#6b4a30'); R(g, 1, 4, 24, 1, '#8a6442'); R(g, 1, 0, 24, 3, '#5a3e28'); R(g, 3, 7, 2, 7, '#2a2d37'); R(g, 21, 7, 2, 7, '#2a2d37');
    return daNoite(c, 0.4);
  }
  function fazMoto(cor) {
    const c = DL.mk(24, 16), g = c.getContext('2d');
    A.disc(g, 5, 12, 3, '#0e1014'); A.disc(g, 18, 12, 3, '#0e1014'); R(g, 6, 6, 11, 4, cor); R(g, 9, 4, 6, 2, '#16181d'); R(g, 17, 2, 1, 7, '#9aa3b0'); R(g, 16, 2, 3, 1, '#2a2f38');
    return daNoite(c, 0.45);
  }
  // o carro do jogador (o mesmo desenho do lago), parado de frente para a câmera; 3 estados da porta
  const CAR = { x: 28 * T, y: 49.5 * T, ang: Math.PI / 2 };
  function fazCarro(porta) {
    const L = DL.Lago && DL.Lago.L, cor = (DL.Lago && DL.Lago.PAL.wa3) || '#3a6ea5';
    return isoSpr(CAR.x - 34, CAR.y - 44, CAR.x + 34, CAR.y + 44, 34, 20, (o, g) => { if (L) L.drawCarAt(g, CAR.x, CAR.y, CAR.ang, cor, { doorOpen: porta }); o.noite(0.42); });
  }

  /* ------------------------------------------------------------------ */
  /* Os objetos do mapa                                                  */
  /* ------------------------------------------------------------------ */
  const items = [];
  const predio = (id, b, extra) => items.push(Object.assign({ id, kind: 'rua-predio', tx: b.x0, ty: b.y0, tw: b.x1 - b.x0, th: b.y1 - b.y0, isoH: b.h + 40, solid: false, drawIso: desenha }, extra));
  predio('SERRA', SERRA); predio('DATALAB', DATALAB);
  JARDINS.forEach((j, i) => items.push({ id: 'MURO-' + i, kind: 'rua-muro', jardim: j, tx: FRENTE - 1, ty: j.y0, tw: 1, th: j.y1 - j.y0, isoH: 20, solid: false, drawIso: desenha }));
  // os jardins: árvores de copa cheia atrás do muro e um poste discreto
  for (const [tx, ty, r] of [[18, 19, 17], [14, 22, 16], [19, 25, 15], [12, 18, 15], [18, 8, 16], [14, 11, 17], [19, 14, 15], [12, 15, 15]]) items.push({ kind: 'rua-arvore', tx, ty, tw: 1, th: 1, isoH: 90, solid: true, raio: r, drawIso: (g, sc, e) => { emPe(g, sc, e); } });
  // postes de luz quente na beira da calçada (dos dois lados), árvores de copa cheia nos canteiros do meio-fio
  const obj = (kind, tx, ty, extra) => items.push(Object.assign({ kind, tx, ty, tw: 1, th: 1, isoH: 70, solid: true, drawIso: (g, sc, e) => { emPe(g, sc, e); } }, extra));
  for (const ty of [9, 26, 40, 60]) obj('rua-poste', 26, ty, { lado: 1, drawIso: desenhaPoste, luz: true });
  for (const ty of [18, 34, 52]) obj('rua-poste', 37, ty, { lado: -1, drawIso: desenhaPoste, luz: true });
  obj('rua-poste', 12, 60, { lado: 1, drawIso: desenhaPoste, luz: true });
  for (const [tx, ty, r] of [[26, 14, 15], [26, 22, 13], [26, 33, 15], [26, 45, 13], [38, 10, 14], [38, 26, 16], [38, 44, 14], [38, 58, 15], [8, 61, 14], [3, 61, 15]]) obj('rua-arvore', tx, ty, { raio: r, isoH: 90 });
  // em volta da faculdade: vasos, banco, o poste das câmeras e as motos paradas (foto 07)
  for (const [tx, ty] of [[14, 59], [22, 51], [22, 46], [22, 44], [10, 59], [6, 59]]) obj('rua-vaso', tx, ty, { isoH: 30 });
  obj('rua-camera', 26, 57, { isoH: 60 });
  obj('rua-banco', 22, 49, { isoH: 16 });
  obj('rua-banco', 22, 22, { isoH: 16 }); obj('rua-banco', 22, 11, { isoH: 16 }); obj('rua-vaso', 22, 31, { isoH: 30 }); obj('rua-vaso', 22, 40, { isoH: 30 });
  for (const [ty, cor] of [[54, '#b8333a'], [55, '#2a2f38'], [56, '#c8262e']]) obj('rua-moto', 27, ty, { cor, isoH: 18, solid: false });
  // carros parados na vaga (o do jogador é o CARRO)
  items.push({ id: 'CARRO', kind: 'rua-carro', tx: 27, ty: 47, tw: 2, th: 5, isoH: 34, solid: false, drawIso: (g, sc, e) => { K.isoT(g, sc); const s = e.sprs[e.porta >= 1 ? 2 : e.porta > 0 ? 1 : 0]; g.drawImage(s.c, s.X0, s.Y0); if (e.luz > 0) { g.globalCompositeOperation = 'lighter'; const X = CAR.x - CAR.y, Y = (CAR.x + CAR.y) / 2; for (const dx of [-9, 9]) { g.globalAlpha = e.luz; g.drawImage(halo(), X + dx - 2 - 9, Y + 22 - 9, 18, 18); } g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; } } });
  for (const [ty, cor, tipo] of [[36, '#c8ccd2', 1], [22, '#8a3038', 2], [10, '#e9ecef', 0]]) items.push({ kind: 'rua-parado', tx: 27, ty, tw: 2, th: 5, isoH: 34, solid: false, cor, tipo, drawIso: desenha });
  // a porta de vidro (só o ponto de interação)
  const fS = () => A.serra();
  const PORTA = (() => { const k = (80 + 4) / 2 / T; return { x: (SERRA.x1 - SERRA.c + k + 0.55) * T, y: (SERRA.y1 - k + 0.55) * T }; })();
  items.push({ id: 'PORTA', kind: 'rua-porta', tx: Math.floor(PORTA.x / T), ty: Math.floor(PORTA.y / T), tw: 1, th: 1, solid: false, isoH: 2, drawIso: () => null });
  // a porta do DataLab, que também desenha o brilho do néon a cada quadro (pulsa de leve e, às vezes, pisca)
  items.push({ id: 'PORTA-DL', kind: 'rua-porta', tx: Math.floor(DL_PORTA.x / T), ty: Math.floor(DL_PORTA.y / T) - 1, tw: 1, th: 1, solid: false, isoH: 2, drawIso: desenhaNeon });

  /* ------------------------------------------------------------------ */
  /* O chão pronto: juntas, guias, faixas, vagas e as poças de luz        */
  /* ------------------------------------------------------------------ */
  function pintaChao(c) {
    const g = c.getContext('2d');
    // o pedaço de calçada na frente da parede diagonal (os tiles dão um serrilhado; aqui fica a linha reta)
    g.fillStyle = C.calc; g.beginPath(); g.moveTo((SERRA.x1 - SERRA.c) * T, SERRA.y1 * T); g.lineTo(SERRA.x1 * T, (SERRA.y1 - SERRA.c) * T); g.lineTo(SERRA.x1 * T, SERRA.y1 * T); g.closePath(); g.fill();
    // calçada: juntas a cada tile e uma variação leve
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = ROWS[y][x], px = x * T, py = y * T;
      if (k === 'K') { R(g, px, py, T, 1, C.junta); R(g, px, py, 1, T, C.junta); if (hash(x * 31 + y * 17) > 0.7) R(g, px + 3, py + 4, 9, 8, 'rgba(255,255,255,0.03)'); }
      else if (k === 'A' || k === 'E') { for (let i = 0; i < 3; i++) R(g, px + Math.floor(hash(x * 7 + y * 13 + i) * 15), py + Math.floor(hash(x * 11 + y * 5 + i) * 15), 1, 1, C.asf2); }
      else if (k === 'J') { for (let i = 0; i < 4; i++) R(g, px + Math.floor(hash(x * 3 + y * 19 + i) * 15), py + Math.floor(hash(x * 23 + y * 7 + i) * 14), 1, 2, C.grama2); }
      // guia (meio-fio) entre a calçada e o asfalto
      if (k === 'K') {
        if ('AE'.includes(at(x + 1, y))) R(g, px + T - 2, py, 2, T, C.guia);
        if ('AE'.includes(at(x - 1, y))) R(g, px, py, 2, T, C.guia);
        if ('AE'.includes(at(x, y + 1))) R(g, px, py + T - 2, T, 2, C.guia);
        if ('AE'.includes(at(x, y - 1))) R(g, px, py, T, 2, C.guia);
        if (at(x - 1, y) === 'J' || at(x + 1, y) === 'J') R(g, at(x - 1, y) === 'J' ? px : px + T - 1, py, 1, T, '#55596a');
      }
    }
    // a rua: linha amarela tracejada no meio, linha da vaga, as vagas, faixa de pedestre
    const mx = ((RUA[0] + RUA[1]) / 2) * T;
    for (let y = T; y < TRANSV[0] * T - 8; y += 30) R(g, mx - 1, y, 2, 16, C.amarelo);
    for (let x = T; x < RUA[0] * T - 10; x += 30) R(g, x, ((TRANSV[0] + TRANSV[1]) / 2) * T - 1, 16, 2, C.amarelo);
    R(g, VAGA[1] * T - 1, 2 * T, 1, (SERRA.y1 - 1) * T, 'rgba(143,147,163,0.5)');
    for (let y = 5; y < SERRA.y1; y += 6) R(g, VAGA[0] * T + 2, y * T, 2 * T - 2, 1, C.faixa);
    for (let x = 23 * T + 3; x < 27 * T - 4; x += 9) R(g, x, TRANSV[0] * T + 5, 5, (TRANSV[1] - TRANSV[0]) * T - 10, C.faixa);
    for (let y = 60 * T - 2; y > 56 * T; y -= 9) R(g, RUA[0] * T + 5, y, (RUA[1] - RUA[0]) * T - 10, 5, C.faixa);
    // piso da entrada da faculdade: um tapete de pedra clara na frente da porta
    /* poças de luz, somadas (ficam "pintadas" no chão) */
    g.globalCompositeOperation = 'lighter';
    const poca = (x, y, r, rgb, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + rgb + ',0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); };
    for (const e of items) if (e.luz) poca((e.tx + 0.5 + e.lado * 0.7) * T, (e.ty + 0.5) * T, 62, '255,196,120', 0.2);
    poca(PORTA.x + 8, PORTA.y + 8, 120, '255,190,120', 0.3);      // a luz quente da recepção na calçada
    poca(PORTA.x - 4, PORTA.y - 4, 56, '255,214,160', 0.22);
    poca((SERRA.x1 + 1) * T, 47.5 * T, 60, '255,200,140', 0.13);   // a vidraça da lateral
    poca((DATALAB.x1 + 1.2) * T, DL_PORTA.y, 78, '61,230,150', 0.16); // o verde do néon do DataLab na calçada
    poca((DATALAB.x1 + 0.6) * T, DL_PORTA.y, 30, '120,255,190', 0.1);
    g.globalCompositeOperation = 'source-over';
  }

  /* ------------------------------------------------------------------ */
  /* Gente passeando                                                     */
  /* ------------------------------------------------------------------ */
  const GENTE = [
    { look: { skin: '#c98e66', hair: '#1a1210', hairStyle: 'ponytail', shirt: '#e86a5a', pants: '#2b2f3a', shoes: '#eceff3' }, x: 23.5, a: 4, b: 41, v: 20, y: 30 },
    { look: { skin: '#8d5a3b', hair: '#0f0b0a', hairStyle: 'buzz', shirt: '#2f6a4a', pants: '#3b4250', shoes: '#16181d' }, x: 24.6, a: 6, b: 57, v: -17, y: 14 },
    { look: { skin: '#f2c8a0', hair: '#6b4a2a', hairStyle: 'long', shirt: '#c4b5fd', pants: '#2a3140', shoes: '#eceff3' }, x: 38.5, a: 3, b: 60, v: 18, y: 40 },
    { look: { skin: '#e0ac7e', hair: '#2a1c16', hairStyle: 'curly', shirt: '#f2c14e', pants: '#1f2430', shoes: '#c8262e' }, x: 38.2, a: 3, b: 60, v: -21, y: 20 },
    { look: { skin: '#a86f4c', hair: '#1a1210', hairStyle: 'short', shirt: '#4a7ac8', pants: '#2a2f38', shoes: '#eceff3' }, eixo: 'x', y: 60.4, a: 2, b: 21, v: 16, x: 9 },
  ];
  const st = { t: 0, fase: 'jogo', gente: [], msg: 0 };

  /* ------------------------------------------------------------------ */
  /* validarMapa() também vale aqui                                      */
  /* ------------------------------------------------------------------ */
  function validarRua(game) {
    const out = [], err = (o, m, x, y) => out.push({ objeto: o, problema: m, x: +x.toFixed(1), y: +y.toFixed(1) });
    const todos = (e, ok) => { for (let y = e.ty; y < e.ty + e.th; y++) for (let x = e.tx; x < e.tx + e.tw; x++) if (!ok(at(x, y), x + 0.5, y + 0.5)) return [x, y]; return null; };
    const lista = game.world.items;
    for (const e of lista) {
      let r = null, m = '';
      if (e.kind === 'rua-predio') { r = todos(e, (k, x, y) => k === 'X' || (e.id === 'SERRA' && k === 'K' && noCorte(x, y))); m = 'prédio em cima da calçada ou da rua'; }
      else if (e.kind === 'rua-carro' || e.kind === 'rua-parado') { r = todos(e, (k) => k === 'E' || k === 'A'); m = 'carro fora da rua'; }
      else if (e.kind === 'rua-moto') { r = todos(e, (k) => k === 'E'); m = 'moto fora da vaga'; }
      else if (e.kind === 'rua-porta') { r = todos(e, (k) => k === 'K'); m = 'porta fora da calçada'; }
      else { r = todos(e, (k) => k === 'K' || k === 'J'); m = 'objeto fora da calçada / canteiro'; }
      if (r) err(e.id || e.kind, m, r[0], r[1]);
      // a calçada tem de ficar livre: nada sólido no meio dela (só encostado na fachada ou no meio-fio)
      if (e.solid && e.kind !== 'rua-predio' && e.tx > FRENTE && e.tx < VAGA[0] - 1 && e.ty < SERRA.y1) err(e.kind, 'no meio da calçada', e.tx, e.ty);
    }
    // nada em cima de nada (só o que ocupa lugar)
    const ocupa = lista.filter((e) => e.kind !== 'rua-porta');
    for (let i = 0; i < ocupa.length; i++) for (let j = i + 1; j < ocupa.length; j++) {
      const a = ocupa[i], b = ocupa[j];
      if (a.tx < b.tx + b.tw && b.tx < a.tx + a.tw && a.ty < b.ty + b.th && b.ty < a.ty + a.th) {
        // os vasos e bancos encostados na frente da faculdade ficam no pedaço de calçada do corte (dentro do retângulo do prédio)
        const pr = a.kind === 'rua-predio' ? a : b.kind === 'rua-predio' ? b : null, o = pr === a ? b : a;
        if (pr && pr.id === 'SERRA' && at(o.tx, o.ty) === 'K') continue;
        err((a.id || a.kind) + ' × ' + (b.id || b.kind), 'um em cima do outro', b.tx, b.ty);
      }
    }
    for (const p of st.gente) if (at(p.a.x / T, p.a.y / T) !== 'K') err('pedestre', 'fora da calçada', p.a.x / T, p.a.y / T);
    if (game.player && !game.player.hidden && at(game.player.x / T, game.player.y / T) !== 'K') err('jogador', 'fora da calçada', game.player.x / T, game.player.y / T);
    if (out.length) { console.warn('[validarMapa · rua] ' + out.length + ' erro(s):'); console.table(out); }
    else console.log('[validarMapa · rua] 0 erros: tudo no lugar certo.');
    return out;
  }
  const antigo = window.validarMapa;
  window.validarMapa = () => (DL.game.map && DL.game.map.id === 'rua' ? validarRua(DL.game) : antigo ? antigo() : []);

  /* ------------------------------------------------------------------ */
  /* O mapa                                                              */
  /* ------------------------------------------------------------------ */
  let PRONTO = null, missaoAntes = null;
  function prepara() {
    if (PRONTO) return PRONTO;
    PRONTO = { serra: fazSerra(), datalab: fazDatalab(), muro: JARDINS.map(fazMuro),
      poste: { 1: fazPoste(1), '-1': fazPoste(-1) }, vaso: [fazVaso(1), fazVaso(2), fazVaso(3)], camera: fazCamera(), banco: fazBanco(), carro: [fazCarro(0), fazCarro(0.5), fazCarro(1)], arv: {} };
    return PRONTO;
  }
  const NA_PORTA = { x: PORTA.x + 9, y: PORTA.y + 9 }; // na calçada, em frente à porta de vidro (quem sai da faculdade)
  const NA_PORTA_DL = { x: DL_PORTA.x + 14, y: DL_PORTA.y + 2 }; // na calçada, em frente ao DataLab (quem sai de lá)
  const SAIDA = { x: 26.2 * T, y: 50.2 * T };  // onde o boneco fica ao descer do carro
  // a chegada (segundos): tela abre, porta abre em 2 quadros, o boneco aparece em 3, porta fecha, faróis apagam
  const CH = { abre: [0.7, 0.85], sai: [1.15, 1.35, 1.55], fecha: [2.0, 2.15], apaga: 2.5, fim: 2.9 };

  DL.registerMap({
    id: 'rua',
    name: 'Faculdade Serra Dourada',
    tiles: ROWS,
    items,
    spawn: [25, 50],
    spawnDir: 'down',
    rooms: [],
    camera: { tilesWide: 26, minTilesHigh: 11, noBase: true, pixelH: 360, minS: 1 },

    enter(game) {
      const sc = game.scene, w = game.world, Pr = prepara(), L = DL.Lago && DL.Lago.L;
      const deDentro = !DL.chegada && st.deDentro;  // voltou da faculdade pela porta de vidro
      const doLab = !DL.chegada && st.doLab;        // voltou do DataLab
      Object.assign(st, { t: 0, fase: DL.chegada ? 'chegada' : 'jogo', gente: [], msg: 0, deDentro: false, doLab: false });
      DL.chegada = false;
      pintaChao(sc.floor);
      let v = 0;
      for (const e of w.items) {
        if (e.kind === 'rua-predio') { e.spr = { SERRA: Pr.serra, DATALAB: Pr.datalab }[e.id]; e.host = {}; e.isoRect = [e.px, e.py, e.px + e.tw * T, e.py + e.th * T]; } // (host: sem a sombra quadrada do motor embaixo)
        else if (e.kind === 'rua-muro') { e.spr = Pr.muro[JARDINS.indexOf(e.jardim)]; e.host = {}; e.isoRect = [e.px + 8, e.py, e.px + T, e.py + e.th * T]; }
        else if (e.kind === 'rua-poste') e.img = Pr.poste[e.lado];
        else if (e.kind === 'rua-arvore') e.img = Pr.arv[e.raio + ':' + e.tx] || (Pr.arv[e.raio + ':' + e.tx] = daNoite(P.arvore(e.tx * 3 + e.ty, e.raio), 0.5));
        else if (e.kind === 'rua-vaso') e.img = Pr.vaso[v++ % 3];
        else if (e.kind === 'rua-camera') e.img = Pr.camera;
        else if (e.kind === 'rua-banco') e.img = Pr.banco;
        else if (e.kind === 'rua-moto') e.img = e._img || (e._img = fazMoto(e.cor));
        else if (e.kind === 'rua-parado') e.spr = e._spr || (e._spr = isoSpr(28 * T - 34, (e.ty + 2.5) * T - 44, 28 * T + 34, (e.ty + 2.5) * T + 44, 34, 20, (o, g) => { if (L) L.drawCarAt(g, 28 * T, (e.ty + 2.5) * T, Math.PI / 2, e.cor, { tipo: e.tipo }); o.noite(0.5); }));
        else if (e.kind === 'rua-carro') { e.sprs = Pr.carro; e.porta = 0; e.luz = st.fase === 'chegada' ? 1 : 0; }
      }
      const porta = w.byId.PORTA;
      porta.ix = PORTA.x; porta.iy = PORTA.y;
      const pdl = w.byId['PORTA-DL'];
      pdl.ix = DL_PORTA.x; pdl.iy = DL_PORTA.y;
      // gente passeando pelas calçadas (vai e volta)
      for (const p of GENTE) {
        const a = new DL.Actor(p.look, p.x * T, p.y * T, 'down');
        a.moving = true;
        sc.drawables.push(a);
        st.gente.push({ a, p, v: p.v });
      }
      // a caixa de missão
      const box = $('mission'), txt = box.querySelector('p');
      if (missaoAntes == null) missaoAntes = txt.textContent;
      txt.textContent = 'Noite em Canaã. Você chegou à Faculdade Serra Dourada.';
      $('missionSteps').innerHTML = '<li>Ir pela calçada até a porta de vidro e entrar (E)</li>';
      $('carry').classList.remove('is-on');
      box.classList.remove('is-done');
      const pl = game.player;
      if (st.fase === 'chegada') { game.locked = true; pl.hidden = true; pl.x = SAIDA.x; pl.y = SAIDA.y; sc.cam.x = pl.x; sc.cam.y = pl.y; }
      else if (doLab) { pl.x = NA_PORTA_DL.x; pl.y = NA_PORTA_DL.y; pl.dir = 'right'; sc.cam.x = pl.x; sc.cam.y = pl.y; }
      else if (deDentro) { pl.x = NA_PORTA.x; pl.y = NA_PORTA.y; pl.dir = 'down'; sc.cam.x = pl.x; sc.cam.y = pl.y; $('missionSteps').innerHTML = '<li class="is-ok">Ir pela calçada até a porta de vidro e entrar (E)</li>'; }
      else { pl.x = SAIDA.x - 8; pl.y = SAIDA.y + 20; sc.cam.x = pl.x; sc.cam.y = pl.y; }
      if (/[?&]debug=1(&|$)/.test(location.search)) setTimeout(() => validarRua(game), 0);
    },

    update(game, dt) {
      st.t += dt;
      const pl = game.player, car = game.world.byId.CARRO, t = st.t;
      for (const q of st.gente) {
        const a = q.a, p = q.p, eixo = p.eixo || 'y';
        a[eixo] += q.v * dt;
        if (a[eixo] > p.b * T) q.v = -Math.abs(q.v); else if (a[eixo] < p.a * T) q.v = Math.abs(q.v);
        a.dir = eixo === 'y' ? (q.v > 0 ? DL.dirOf(0, 1) : DL.dirOf(0, -1)) : (q.v > 0 ? DL.dirOf(1, 0) : DL.dirOf(-1, 0));
        a.moving = true; a.dist += Math.abs(q.v) * dt; a.tick(dt);
      }
      if (st.fase === 'chegada') {
        car.porta = t < CH.abre[0] ? 0 : t < CH.abre[1] ? 0.5 : t < CH.fecha[0] ? 1 : t < CH.fecha[1] ? 0.5 : 0;
        const n = CH.sai.filter((x) => t >= x).length;
        if (n > 0) {
          pl.hidden = false;
          const k = [0, 0.35, 0.7, 1][n];
          pl.x = lerp(CAR.x - 6, SAIDA.x, k); pl.y = lerp(CAR.y + 4, SAIDA.y, k);
          pl.alpha = [0, 0.35, 0.7, 1][n]; pl.dir = 'left'; pl.moving = false;
        }
        car.luz = 1 - smooth(CH.apaga, CH.apaga + 0.3, t);
        if (t >= CH.fim) { st.fase = 'jogo'; game.locked = false; pl.alpha = 1; car.luz = 0; game.toast('Vá pela calçada até a porta da Serra Dourada.'); }
      }
    },

    useLabel(game, e) {
      if (st.fase !== 'jogo') return null;
      return e.id === 'PORTA' ? 'Pressione E para entrar' : e.id === 'PORTA-DL' ? 'Pressione E para entrar no DataLab' : null;
    },
    use(game, e) {
      if (e.id === 'PORTA-DL' && DL.MAPS.datalab) return game.goTo('datalab', [1, 5]); // a sala do DataLab (datalab.js), logo depois da porta
      if (e.id !== 'PORTA') return;
      game.goTo(DL.MAPS.faculdade ? 'faculdade' : 'datalab'); // transição curta e o jogador aparece lá dentro, perto da porta
    },

    overlay(g, sc) {
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      const cw = sc.canvas.width, ch = sc.canvas.height;
      const preto = st.fase === 'chegada' || st.t < 0.7 && !DL.game.fade ? 1 - smooth(0, 0.7, st.t) : 0; // (vindo da faculdade, a transição é a do jogo)
      if (preto > 0.003) { g.fillStyle = 'rgba(0,0,0,' + preto.toFixed(3) + ')'; g.fillRect(0, 0, cw, ch); }
      g.restore();
    },

    leave() {
      if (missaoAntes != null) { $('mission').querySelector('p').textContent = missaoAntes; $('missionSteps').innerHTML = ''; }
    },
  });
  DL.Rua = { st, ROWS, at, PORTA, SAIDA, NA_PORTA, DL_PORTA, NA_PORTA_DL };

  /* ------------------------------------------------------------------ */
  /* Ligação com a faculdade por dentro (maps/faculdade.js, carregado antes) */
  /* A porta de vidro de lá levava ao DataLab (provisório): agora sai aqui,  */
  /* na calçada em frente à porta. Feito daqui para não mexer no mapa dela.  */
  /* ------------------------------------------------------------------ */
  const fac = DL.MAPS.faculdade;
  if (fac) {
    const sair = (game) => { st.deDentro = true; game.goTo('rua'); };
    for (const p of fac.portals || []) if (p.to === 'datalab') p.to = 'rua';
    const usar = fac.use, sairDe = fac.leave;
    fac.use = function (game, e) { return e.id === 'ENTRADA' ? sair(game) : usar.call(this, game, e); };
    fac.leave = function (game) { if (sairDe) sairDe.call(this, game); st.deDentro = true; };
  }

  /* ------------------------------------------------------------------ */
  /* Ligação com o DataLab (a sala beta de maps/datalab.js)              */
  /* A sala ganha uma porta na parede da esquerda; passar por ela (ou     */
  /* apertar E nela) volta para a calçada, em frente ao letreiro de néon. */
  /* ------------------------------------------------------------------ */
  const lab = DL.MAPS.datalab;
  if (lab && !lab._rua) {
    lab._rua = true;
    lab.tiles = lab.tiles.map((r, y) => (y === 5 || y === 6 ? '.' + r.slice(1) : r)); // a abertura na parede
    lab.rooms = [{ x: 1, y: 1, w: lab.tiles[0].length - 2, h: lab.tiles.length - 2 }];
    lab.items = lab.items.concat([{ id: 'PORTA-RUA', kind: 'door', axis: 'v', len: 2, rot: 0, tx: 0, ty: 5, solid: false }]);
    lab.portals = (lab.portals || []).concat([{ tx: 0, ty: 5, to: 'rua' }, { tx: 0, ty: 6, to: 'rua' }]);
    const rotulo = lab.useLabel, usar = lab.use, sairDe = lab.leave;
    lab.useLabel = function (game, e) { return e.id === 'PORTA-RUA' ? 'Sair para a rua' : rotulo.call(this, game, e); };
    lab.use = function (game, e) { return e.id === 'PORTA-RUA' ? game.goTo('rua') : usar.call(this, game, e); };
    lab.leave = function (game) { if (sairDe) sairDe.call(this, game); st.doLab = true; };
  }
})();

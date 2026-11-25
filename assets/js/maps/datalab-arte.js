/* Venti Experience — Parte 4: as peças desenhadas da sala do DataLab (paredes, portas, janela, detalhes
   de parede, sofá). A planta e os itens ficam em datalab-sala.js; este arquivo só sabe DESENHAR.
   Tudo no mesmo ângulo e na mesma luz do motor (iso.js): faces sul mais claras, faces leste mais escuras,
   paredes com 4 px de espessura, como as de fora.

   DL.DCArte = { casco, txt, cores, itemParede, meiaParede, janela, portaRua, sofa, rackCalha, luzFria,
                 quadroSerra, termometro, relogio, tomada, interruptor, quadrinho } */
(function () {
  'use strict';
  const DL = window.DL, T = DL.T, R = DL.R, shade = DL.shade, hash = DL.hash;
  const IX = (x, y) => x - y, IY = (x, y, z) => (x + y) / 2 - (z || 0);
  const mk = (w, h) => DL.mk(w, h);
  const K = () => DL.isoKit;

  /* ---------- cores das paredes (as mesmas do estilo da sala; iso.js: wallCols) ---------- */
  const PAREDE = '#1b1729';
  const cores = {
    parede: PAREDE, ponta: '#120f1c', topo: '#2a2340', rodape: '#0d0b14', faixa: '#2a2340',
    violeta: '#9b5cff', ciano: '#2ee6ff', tampo: '#231d33', tampoD: '#16121f', tampoT: '#2b2540',
  };

  // a silhueta de uma caixa na tela (para o clique e a ordem de desenho)
  const casco = (x0, y0, x1, y1, z0, z1) => [[x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y1, z1]].map((p) => [IX(p[0], p[1]), IY(p[0], p[1], p[2])]);
  // fonte de pixels 3 × 5 (a do arte.js)
  function txt(g, s, x, y, col) {
    const F = DL.Arte ? DL.Arte.FONT : {};
    for (const ch of String(s)) {
      const rows = F[ch];
      if (rows) rows.forEach((row, j) => { for (let i = 0; i < 3; i++) if (row[i] === '#') R(g, x + i, y + j, 1, 1, col); });
      x += 4;
    }
    return x;
  }

  /* ------------------------------------------------------------------ */
  /* Coisas penduradas nas paredes de fora                               */
  /* ------------------------------------------------------------------ */
  // 'N' = parede de cima (y = 0: a imagem corre em x a partir de a0) · 'O' = parede da esquerda (x = 0: corre
  // em y, lida da esquerda para a direita). w = largura, z1 = altura do topo, h = altura da imagem.
  // pinta(t) desenha a imagem; com `cada` (segundos) ela é repintada de tempos em tempos (o relógio).
  // lado também pode ser um número: a face leste de uma parede de dentro, nessa coordenada x (em pixels)
  function itemParede(id, lado, a0, w, z1, h, pinta, cada) {
    let img = null, quando = -1;
    const N = lado === 'N', X = typeof lado === 'number' ? lado : T;
    const canto = (a, z) => (N ? [a, T, z] : [X, a, z]);
    return {
      id, kind: 'dc-parede', tx: N ? Math.floor(a0 / T) : Math.floor(X / T), ty: N ? 1 : Math.floor(a0 / T), solid: false, host: {}, isoH: z1 + 12,
      // (encostado na parede: a parede é desenhada antes, a imagem por cima dela)
      isoRect: N ? [a0, T, a0 + w, T + 0.5] : [X, a0, X + 0.5, a0 + w],
      drawIso(g, sc) {
        const agora = cada ? Math.floor(Date.now() / 1000 / cada) : 0;
        if (!img || agora !== quando) { img = pinta(img); quando = agora; }
        if (N) K().setMap(g, sc, [a0, T + 0.3, z1], [1, 0, 0], [0, 0, -1]);
        else K().setMap(g, sc, [X + 0.3, a0 + w, z1], [0, -1, 0], [0, 0, -1]);
        g.drawImage(img, 0, 0);
        K().isoT(g, sc);
        const p = [canto(a0, z1), canto(a0 + w, z1), canto(a0 + w, z1 - h), canto(a0, z1 - h)].map((q) => [IX(q[0], q[1]), IY(q[0], q[1], q[2])]);
        return { poly: p };
      },
    };
  }

  /* o quadro da Faculdade Serra Dourada (brasão + fachada do arte.js, reduzidos) */
  function reduz(src, w, h) {
    let c = src; // (em etapas, metade de cada vez, para a fachada não virar borrão)
    while (c.width / 2 >= w * 1.5) {
      const n = mk(Math.round(c.width / 2), Math.round(c.height / 2)), g = n.getContext('2d');
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.drawImage(c, 0, 0, n.width, n.height);
      c = n;
    }
    const out = mk(w, h), g = out.getContext('2d');
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(c, 0, 0, w, h);
    return out;
  }
  function quadroSerra() {
    const Wq = 46, Hq = 24, c = mk(Wq, Hq), g = c.getContext('2d');
    R(g, 0, 0, Wq, Hq, '#9b5cff');                   // moldura com contorno neon violeta
    R(g, 1, 1, Wq - 2, Hq - 2, '#1d1830');
    R(g, 2, 2, Wq - 4, Hq - 4, '#e9e6f2');
    DL.Arte.brasao(g, 4, 3, 1, '#3b2a66');
    const S = DL.Arte.serra(), foto = mk(S.w, S.h), f = foto.getContext('2d');
    f.drawImage(S.base, 0, 0); f.globalAlpha = 0.85; f.drawImage(S.luz, 0, 0);
    R(g, 20, 5, 23, 15, '#cfc8dd');
    g.drawImage(reduz(foto, 23, 13), 20, 6);
    return c;
  }
  /* o indicador de temperatura: "❄ 19,7 °C", pequeno */
  function termometro() {
    const c = mk(30, 9), g = c.getContext('2d'), az = '#a0c3ec';
    R(g, 0, 0, 30, 9, '#0e1116'); R(g, 0, 0, 30, 1, '#2a3340'); R(g, 0, 8, 30, 1, '#2a3340');
    R(g, 4, 2, 1, 5, az); R(g, 2, 4, 5, 1, az);
    R(g, 2, 2, 1, 1, az); R(g, 6, 2, 1, 1, az); R(g, 2, 6, 1, 1, az); R(g, 6, 6, 1, 1, az);
    const x = txt(g, '19,7', 9, 2, '#dce8f5');
    R(g, x, 2, 2, 1, '#dce8f5'); R(g, x, 3, 2, 1, '#dce8f5');
    txt(g, 'C', x + 3, 2, '#dce8f5');
    return c;
  }
  /* relógio de parede redondo (9 × 9), com os ponteiros na hora certa */
  // relógio digital: horas e minutos em ciano, os 2 pontos piscando
  function relogio(velho) {
    const c = velho || mk(22, 7), g = c.getContext('2d');
    R(g, 0, 0, 22, 7, '#0c0a14'); R(g, 0, 0, 22, 1, '#3b2a66'); R(g, 0, 6, 22, 1, '#3b2a66');
    const d = new Date(), hh = String(d.getHours()).padStart(2, '0'), mm = String(d.getMinutes()).padStart(2, '0');
    txt(g, hh, 2, 1, '#7ff3ff');
    if (d.getSeconds() % 2 === 0) { R(g, 10, 2, 1, 1, '#7ff3ff'); R(g, 10, 4, 1, 1, '#7ff3ff'); }
    txt(g, mm, 12, 1, '#7ff3ff');
    return c;
  }
  /* tomada (placa branca com 2 furinhos) e interruptor */
  function tomada() {
    const c = mk(4, 5), g = c.getContext('2d');
    R(g, 0, 0, 4, 5, '#2a2340'); R(g, 0, 4, 4, 1, '#120f1c');
    R(g, 1, 1, 1, 1, '#0d0b14'); R(g, 2, 2, 1, 1, '#0d0b14'); R(g, 1, 3, 1, 1, '#0d0b14');
    R(g, 3, 0, 1, 1, '#2ee6ff');
    return c;
  }
  function interruptor() {
    const c = mk(4, 6), g = c.getContext('2d');
    R(g, 0, 0, 4, 6, '#2a2340'); R(g, 0, 5, 4, 1, '#120f1c');
    R(g, 1, 1, 2, 3, '#1b1729'); R(g, 1, 1, 2, 1, '#9b5cff');
    return c;
  }
  /* quadrinhos: 0 = uma paisagem de serra ao pôr do sol, 1 = um pôster de gráfico */
  /* letreiros neon pequenos: 0 = "</>" violeta, 1 = um gráfico ciano */
  function quadrinho(tipo) {
    return function () {
      const c = mk(12, 9), g = c.getContext('2d');
      R(g, 0, 0, 12, 9, '#0c0a14'); R(g, 0, 0, 12, 1, '#231d33');
      if (tipo === 0) {
        const v = '#c4a5ff';
        R(g, 3, 4, 1, 1, v); R(g, 2, 3, 1, 1, v); R(g, 2, 5, 1, 1, v); R(g, 1, 4, 1, 1, v);   // <
        R(g, 6, 2, 1, 1, v); R(g, 5, 3, 1, 2, v); R(g, 4, 5, 1, 2, v);                      // /
        R(g, 8, 4, 1, 1, v); R(g, 9, 3, 1, 1, v); R(g, 9, 5, 1, 1, v); R(g, 10, 4, 1, 1, v); // >
      } else {
        for (let i = 0; i < 4; i++) { const h = 2 + ((i * 3) % 5); R(g, 2 + i * 2, 8 - h, 1, h, i === 3 ? '#c4a5ff' : '#7ff3ff'); }
        R(g, 2, 2, 5, 1, '#3b2a66');
      }
      return c;
    };
  }

  /* ------------------------------------------------------------------ */
  /* Meia-parede: alvenaria clara com tampo de madeira (y = 10)          */
  /* ------------------------------------------------------------------ */
  const H_MEIA = 15;
  function meiaParede(g, sc, e) {
    const k = K(), x0 = e.px, x1 = e.px + T, y0 = e.py + 6, y1 = e.py + 10, H = sc.wallCut ? 7 : H_MEIA;
    k.isoT(g, sc);
    k.box(g, x0, y0, x1, y1, 0, H - 2, { s: '#1e1a2c', e: cores.ponta, t: cores.topo });
    k.poly(g, [[x0, y1, 0], [x1, y1, 0], [x1, y1, 3], [x0, y1, 3]], cores.rodape, false);       // rodapé
    k.line(g, [x0, y1, 3], [x1, y1, 3], cores.violeta);                                        // o neon do rodapé
    k.line(g, [x0, y1, 8], [x1, y1, 8], 'rgba(0,0,0,0.25)');                                    // friso
    if (e.l === false) k.poly(g, [[x0, y0, 0], [x0, y1, 0], [x0, y1, 3], [x0, y0, 3]], cores.rodape, false);
    // o tampo escuro, um pouco mais largo, com a faixa ciano acesa na frente
    k.box(g, x0 - (e.l === false ? 1 : 0), y0 - 1, x1 + (e.r === false ? 1 : 0), y1 + 1, H - 2, H, { s: cores.tampo, e: cores.tampoD, t: cores.tampoT });
    k.line(g, [x0, y1 + 1, H - 1], [x1, y1 + 1, H - 1], cores.ciano);
    k.line(g, [x0, y1 + 1, H - 3], [x1, y1 + 1, H - 3], 'rgba(46,230,255,0.22)');
    return { poly: casco(x0 - 1, y0 - 1, x1 + 1, y1 + 1, 0, H) };
  }

  /* ------------------------------------------------------------------ */
  /* A janelinha da sala técnica (parede x = 14, 2 tiles)                 */
  /* ------------------------------------------------------------------ */
  const H_IN = (DL.ISO && DL.ISO.H_IN) || 32;
  function janela(g, sc, e) {
    const k = K(), x0 = e.px + 6, x1 = e.px + 10, y0 = e.py, y1 = e.py + e.th * T, H = sc.wallCut ? 7 : H_IN;
    const c = { s: cores.ponta, e: cores.parede, t: cores.topo }, zA = 13, zB = 25;
    k.isoT(g, sc);
    if (H < zB) { k.box(g, x0, y0, x1, y1, 0, H, c); return { poly: casco(x0, y0, x1, y1, 0, H) }; }
    const v0 = y0 + 6, v1 = y1 - 6; // o vão do vidro
    k.box(g, x0, y0, x1, y1, 0, zA, c);
    k.poly(g, [[x1, y0, 0], [x1, y1, 0], [x1, y1, 4], [x1, y0, 4]], cores.rodape, false);
    k.box(g, x0, y0, x1, v0, zA, zB, c);
    k.box(g, x0, v1, x1, y1, zA, zB, c);
    // o vidro (fumê, deixa ver o azul da sala técnica) e o caixilho escuro
    k.poly(g, [[x0 + 2, v0, zA], [x0 + 2, v1, zA], [x0 + 2, v1, zB], [x0 + 2, v0, zB]], 'rgba(46,230,255,0.18)', false);
    k.line(g, [x0 + 2, v0 + 3, zB - 3], [x0 + 2, v0 + 7, zA + 3], 'rgba(220,235,255,0.35)');
    k.box(g, x0 + 1, (v0 + v1) / 2 - 0.5, x0 + 3, (v0 + v1) / 2 + 0.5, zA, zB, { s: '#3a414c', e: '#4a515c', t: '#5d6573' });
    k.box(g, x0 - 1, v0, x1 + 1, v1, zA - 1, zA, { s: '#1f8fa3', e: '#2ee6ff', t: '#7ff3ff' }); // peitoril ciano aceso
    k.box(g, x0, y0, x1, y1, zB, H, c);
    return { poly: casco(x0, y0, x1 + 1, y1, 0, H) };
  }

  /* ------------------------------------------------------------------ */
  /* A porta verde para a rua (x = 0), com a plaquinha acesa             */
  /* ------------------------------------------------------------------ */
  let PLACA = null;
  function placaRua() {
    if (PLACA) return PLACA;
    PLACA = mk(31, 7);
    const a = PLACA.getContext('2d');
    R(a, 0, 0, 31, 7, '#0c0a14'); R(a, 0, 0, 31, 1, '#9b5cff'); R(a, 0, 6, 31, 1, '#9b5cff');
    txt(a, 'DATALAB', 2, 1, '#7ff3ff');
    return PLACA;
  }
  function portaRua(g, sc, e) {
    const k = K(), L = (e.len || 1) * T, y0 = e.py, y1 = e.py + L, HB = 44, Hd = 26, XF = 13;
    const fr = { s: '#1b1729', e: '#231d33', t: '#2a2340' };
    k.isoT(g, sc);
    for (const [a, b] of [[y0 + 2, y0 + L / 2], [y0 + L / 2, y1 - 2]]) {
      k.poly(g, [[XF, a, 0], [XF, b, 0], [XF, b, Hd], [XF, a, Hd]], '#1d1830');
      k.line(g, [XF, a + 2, 3], [XF, a + 2, Hd - 3], '#3b2a66');
      k.line(g, [XF, b - 2, 3], [XF, b - 2, Hd - 3], '#3b2a66');
      k.line(g, [XF, a + 1, 13], [XF, b - 1, 13], '#9b5cff');          // faixa neon no meio da folha
    }
    k.line(g, [XF + 0.2, y0 + L / 2 - 2, 11], [XF + 0.2, y0 + L / 2 - 2, 16], '#7ff3ff');
    k.line(g, [XF + 0.2, y0 + L / 2 + 2, 11], [XF + 0.2, y0 + L / 2 + 2, 16], '#7ff3ff');
    k.box(g, 11, y0, 16, y0 + 2, 0, Hd, fr);
    k.box(g, 11, y1 - 2, 16, y1, 0, Hd, fr);
    k.box(g, 12, y0, 16, y1, Hd, HB, { s: '#120f1c', e: '#1b1729', t: '#2a2340' });
    k.line(g, [16, y0 + 2, Hd], [16, y1 - 2, Hd], '#2ee6ff', 1); // o contorno ciano aceso
    k.line(g, [16, y0 + 2, 0], [16, y0 + 2, Hd], '#2ee6ff', 1);
    k.line(g, [16, y1 - 2, 0], [16, y1 - 2, Hd], '#2ee6ff', 1);
    k.setMap(g, sc, [16.2, y1 - 0.5, Hd + 10], [0, -1, 0], [0, 0, -1]);
    g.drawImage(placaRua(), 0, 0);
    k.isoT(g, sc);
    return { poly: casco(11, y0, 16, y1, 0, HB) };
  }

  // a porta da sala técnica (2 folhas escuras com faixa violeta e visor ciano; abrem para dentro, e.open 0..1)
  function portaNeon(g, sc, e) {
    const k = K(), L = (e.len || 2) * T, y0 = e.py, y1 = e.py + L, Hw = sc.wallCut ? 7 : H_IN, Hd = Math.min(26, Hw);
    const o = Math.max(0, Math.min(1, e.open || 0)), ang = o * Math.PI * 0.46, lw = (L - 4) / 2, ax = e.px + 8;
    const fr = { s: '#120f1c', e: '#1b1729', t: '#2a2340' };
    k.isoT(g, sc);
    k.box(g, e.px + 6, y0, e.px + 10, y0 + 2, 0, Hw, fr);
    const folha = (hy, dir) => {
      const bx = ax + Math.sin(ang) * lw, by = hy + dir * Math.cos(ang) * lw;
      const f = (t) => [ax + (bx - ax) * t, hy + (by - hy) * t];
      k.poly(g, [[ax, hy, 0], [bx, by, 0], [bx, by, Hd - 1], [ax, hy, Hd - 1]], o > 0.5 ? '#1d1830' : '#241e36');
      k.line(g, [ax, hy, Hd - 1], [bx, by, Hd - 1], '#3b2a66');
      k.line(g, [ax, hy, 12], [bx, by, 12], '#9b5cff');
      const p = f(0.3), q = f(0.7);
      k.poly(g, [[p[0], p[1], 16], [q[0], q[1], 16], [q[0], q[1], 21], [p[0], p[1], 21]], 'rgba(46,230,255,0.45)', false);
    };
    folha(y0 + 2, 1);
    folha(y1 - 2, -1);
    k.box(g, e.px + 6, y1 - 2, e.px + 10, y1, 0, Hw, fr);
    if (Hw > Hd + 1) k.box(g, e.px + 6, y0, e.px + 10, y1, Hd, Hw, { s: cores.ponta, e: cores.parede, t: cores.topo });
    k.line(g, [e.px + 10, y0 + 2, Hd], [e.px + 10, y1 - 2, Hd], '#2ee6ff');
    return { poly: casco(e.px + 5, y0, e.px + 11 + lw * Math.sin(ang), y1, 0, Hw) };
  }

  /* ------------------------------------------------------------------ */
  /* Sofá (do DataLab original, iso.js: drawSofa), virado para o sul     */
  /* ------------------------------------------------------------------ */
  function sofa(g, sc, e) {
    const k = K(), base = e.color || '#2a2340', d = shade(base, -0.3), l = shade(base, 0.14);
    const x0 = e.px, x1 = e.px + e.tw * T, y0 = e.py + 1, y1 = e.py + T - 1;
    const c = (cor, topo) => ({ s: cor, e: shade(cor, -0.3), t: topo });
    k.isoT(g, sc);
    for (const [x, y] of [[x0 + 1, y0 + 1], [x1 - 3, y0 + 1], [x0 + 1, y1 - 3], [x1 - 3, y1 - 3]]) k.box(g, x, y, x + 2, y + 2, 0, 1, { s: '#121418', e: '#0b0c0f', t: '#1d2026' });
    k.box(g, x0, y0, x1, y0 + 5, 1, 17, c(d, shade(d, 0.2)));
    k.box(g, x0, y0 + 5, x0 + 3, y1, 1, 11, c(base, l));
    k.box(g, x0 + 3, y0 + 5, x1 - 3, y1, 1, 7, c(base, l));
    const n = Math.max(1, Math.round((x1 - x0 - 6) / 14)), cw = (x1 - x0 - 6) / n;
    for (let i = 1; i < n; i++) k.line(g, [x0 + 3 + i * cw, y0 + 5, 7], [x0 + 3 + i * cw, y1, 7], d);
    k.box(g, x0 + 5, y0 + 4, x0 + 11, y0 + 6, 7, 13, c('#6a45c4', '#8a66e0'));
    k.box(g, x1 - 12, y0 + 4, x1 - 6, y0 + 6, 7, 13, c('#1f8fa3', '#2ee6ff'));
    k.box(g, x1 - 3, y0 + 5, x1, y1, 1, 11, c(base, l));
    k.line(g, [x0, y1, 1.5], [x1, y1, 1.5], '#9b5cff');                 // a fita de LED por baixo
    return { poly: casco(x0, y0, x1, y1, 0, 17) };
  }

  /* ------------------------------------------------------------------ */
  /* Sala técnica: a calha de cabos por cima dos racks e a luz fria       */
  /* ------------------------------------------------------------------ */
  // o rack normal (iso.js) + o pedaço da calha em cima dele: fina, escura, presa na parede do fundo,
  // com 2 cabos retos (azul e cinza) descendo para dentro do rack. e.calha = [x0, x1] em pixels.
  function rackCalha(g, sc, e, t) {
    const r = K().drawBox(g, sc, e, t), k = K();
    const x0 = e.calha ? e.calha[0] : e.px, x1 = e.calha ? e.calha[1] : e.px + T, y0 = e.py + 1, y1 = e.py + 5, z0 = 41, z1 = 43;
    k.isoT(g, sc);
    // os suportes (2 hastes finas até a parede)
    for (const x of [e.px + 3, e.px + 13]) k.box(g, x, e.py, x + 1, y0, z0 - 1, z0, { s: '#2a303a', e: '#1d222b', t: '#3a414c' });
    // os cabos descendo (por trás da borda da calha)
    for (const [dx, cor] of [[5, '#3a6ea5'], [7, '#8a919c']]) k.box(g, e.px + dx, y1 - 2, e.px + dx + 1, y1 - 1, 37, z0, { s: cor, e: shade(cor, -0.3), t: cor });
    k.box(g, x0, y0, x1, y1, z0, z1, { s: '#1d222b', e: '#14181f', t: '#2a303a' });
    // os cabos deitados dentro da calha
    k.line(g, [x0, y0 + 2, z1], [x1, y0 + 2, z1], '#3a6ea5');
    k.line(g, [x0, y0 + 3, z1], [x1, y0 + 3, z1], '#6f7782');
    k.line(g, [x0, y1, z1], [x1, y1, z1], 'rgba(255,255,255,0.12)');
    return r;
  }
  // a luz fria no chão da sala técnica (bem de leve, com uma oscilação lenta) e o reflexo ciano na frente dos racks
  function luzFria(g, sc, e, t) {
    const k = K(), x0 = e.px, y0 = e.py, x1 = x0 + e.tw * T, y1 = y0 + e.th * T;
    const osc = 0.5 + 0.5 * Math.sin(t * 0.7) * Math.sin(t * 1.9 + 1);
    k.isoT(g, sc);
    k.poly(g, [[x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0]], 'rgba(70,130,210,' + (0.07 + 0.02 * osc).toFixed(3) + ')', false);
    if (e.reflexo) {
      const [a0, a1, b0] = e.reflexo;
      for (let i = 0; i < 4; i++) k.poly(g, [[a0, b0, 0], [a1, b0, 0], [a1, b0 + 3 + i * 3, 0], [a0, b0 + 3 + i * 3, 0]], 'rgba(56,198,232,0.035)', false);
    }
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* Tapetes: pintados uma vez com o dobro da resolução e deitados no chão */
  /* ------------------------------------------------------------------ */
  // trama de tecido (cada fio com um tom), borda dupla com padrão geométrico, franja nas 2 pontas e o
  // motivo do meio. Os contornos são feitos com o traço suave do canvas, sem serrilhado grosseiro.
  const PALETAS = {
    claude: { base: '#c4673f', escuro: '#9e4f2f', borda: '#8a4128', creme: '#efe0cb', franja: '#e8d7bd', motivo: 'faisca', neon: '46,230,255' },
    cinza: { base: '#1e1830', escuro: '#161224', borda: '#0f0c18', creme: '#9b5cff', franja: '#6a45c4', motivo: 'losango', neon: '155,92,255' },
    azul: { base: '#121a33', escuro: '#0e1428', borda: '#0a0f1e', creme: '#2ee6ff', franja: '#1f8fa3', motivo: 'grade', neon: '46,230,255' },
  };
  const Q = 2; // pixels da textura por pixel do jogo
  function rgb(hex) { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function pintaTapete(tw, th, nome) {
    const P = PALETAS[nome] || PALETAS.cinza, Wt = tw * T * Q, Ht = th * T * Q, F = 6 * Q; // F = franja
    const c = mk(Wt, Ht), g = c.getContext('2d');
    const x0 = F, x1 = Wt - F, y0 = Q, y1 = Ht - Q, w = x1 - x0, h = y1 - y0;
    // 1) a trama: fios alternados, cada um com um tom levemente diferente
    const img = g.createImageData(w, h), d = img.data, b = rgb(P.base);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const fio = ((x >> 1) + (y >> 1)) & 1 ? hash(x * 7 + 3) : hash(y * 13 + 5);
      const v = 1 + (fio - 0.5) * 0.12 + (hash(x * 31 + y * 17) - 0.5) * 0.05 - (((x + y) & 3) === 0 ? 0.04 : 0);
      const i = (y * w + x) * 4;
      d[i] = Math.min(255, b[0] * v); d[i + 1] = Math.min(255, b[1] * v); d[i + 2] = Math.min(255, b[2] * v); d[i + 3] = 255;
    }
    g.putImageData(img, x0, y0);
    // 2) a borda dupla: faixa escura com losangos pequenos entre 2 filetes creme
    const fx = (a, b2, ww, hh, col) => { g.fillStyle = col; g.fillRect(a, b2, ww, hh); };
    const B = 5 * Q;
    g.globalAlpha = 0.9;
    fx(x0, y0, w, B, P.escuro); fx(x0, y1 - B, w, B, P.escuro); fx(x0, y0 + B, B, h - 2 * B, P.escuro); fx(x1 - B, y0 + B, B, h - 2 * B, P.escuro);
    g.globalAlpha = 1;
    fx(x0, y0, w, 1, P.borda); fx(x0, y1 - 1, w, 1, P.borda); fx(x0, y0, 1, h, P.borda); fx(x1 - 1, y0, 1, h, P.borda);
    const filete = (k) => { fx(x0 + k, y0 + k, w - 2 * k, 1, P.creme); fx(x0 + k, y1 - k - 1, w - 2 * k, 1, P.creme); fx(x0 + k, y0 + k, 1, h - 2 * k, P.creme); fx(x1 - k - 1, y0 + k, 1, h - 2 * k, P.creme); };
    filete(Q); filete(B + Q);
    g.fillStyle = P.creme;
    const los = (cx, cy) => { g.beginPath(); g.moveTo(cx, cy - 2); g.lineTo(cx + 2, cy); g.lineTo(cx, cy + 2); g.lineTo(cx - 2, cy); g.closePath(); g.fill(); };
    const mA = y0 + (B + Q) / 2 + 0.5, mB = y1 - (B + Q) / 2 - 0.5, nA = x0 + (B + Q) / 2 + 0.5, nB = x1 - (B + Q) / 2 - 0.5;
    for (let x = x0 + B + 3; x < x1 - B - 1; x += 6) { los(x, mA); los(x, mB); }
    for (let y = y0 + B + 3; y < y1 - B - 1; y += 6) { los(nA, y); los(nB, y); }
    // 3) o motivo do meio
    const cx = Wt / 2, cy = Ht / 2;
    if (P.motivo === 'faisca') faisca(g, cx, cy, Math.min(w, h) * 0.3, P);
    else if (P.motivo === 'losango') {
      g.strokeStyle = P.creme; g.lineWidth = 1; g.globalAlpha = 0.55;
      for (const r of [h * 0.26, h * 0.16]) { g.beginPath(); g.moveTo(cx, cy - r); g.lineTo(cx + r * 1.6, cy); g.lineTo(cx, cy + r); g.lineTo(cx - r * 1.6, cy); g.closePath(); g.stroke(); }
      g.globalAlpha = 1;
    } else {
      g.fillStyle = P.creme; g.globalAlpha = 0.28;
      for (let y = y0 + B + 7; y < y1 - B - 5; y += 8) for (let x = x0 + B + 7; x < x1 - B - 5; x += 8) g.fillRect(x, y, 2, 2);
      g.globalAlpha = 1;
    }
    // 4) a franja nas 2 pontas: fios com comprimentos um pouco diferentes
    for (const lado of [0, 1]) for (let y = y0 + 1; y < y1 - 1; y += 2) {
      const L = F - 1 - Math.floor(hash(y * 5 + lado * 99) * 3);
      fx(lado ? x1 : x0 - L, y, L, 1, P.franja);
      fx(lado ? x1 + L - 1 : x0 - L, y, 1, 1, shade(P.franja, -0.15));
    }
    return c;
  }
  // a faísca: 8 raios afinando na ponta (4 longos, 4 curtos), com sombra, contorno suave e brilho no centro
  function faisca(g, cx, cy, r, P) {
    const raios = (dx, dy, cor, esc) => {
      g.fillStyle = cor;
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4, L = r * esc * (k % 2 ? 0.74 : 1), wB = r * esc * 0.21;
        const ca = Math.cos(a), sa = Math.sin(a), ox = cx + dx, oy = cy + dy;
        g.beginPath();
        g.moveTo(ox - sa * wB, oy + ca * wB);
        g.quadraticCurveTo(ox + ca * L * 0.5 - sa * wB * 0.55, oy + sa * L * 0.5 + ca * wB * 0.55, ox + ca * L, oy + sa * L);
        g.quadraticCurveTo(ox + ca * L * 0.5 + sa * wB * 0.55, oy + sa * L * 0.5 - ca * wB * 0.55, ox + sa * wB, oy - ca * wB);
        g.closePath(); g.fill();
      }
      g.beginPath(); g.arc(cx + dx, cy + dy, r * esc * 0.22, 0, Math.PI * 2); g.fill();
    };
    const gl = g.createRadialGradient(cx, cy, 0, cx, cy, r * 1.25);
    gl.addColorStop(0, 'rgba(255,226,190,0.28)'); gl.addColorStop(1, 'rgba(255,226,190,0)');
    g.fillStyle = gl; g.fillRect(cx - r * 1.3, cy - r * 1.3, r * 2.6, r * 2.6);
    raios(1.4, 1.4, 'rgba(90,40,22,0.45)', 1);  // sombra
    raios(0, 0, shade(P.creme, -0.14), 1.05);   // contorno
    raios(0, 0, P.creme, 0.95);
    const lc = g.createRadialGradient(cx - r * 0.1, cy - r * 0.1, 0, cx, cy, r * 0.5);
    lc.addColorStop(0, 'rgba(255,250,240,0.9)'); lc.addColorStop(1, 'rgba(255,250,240,0)');
    g.fillStyle = lc; g.beginPath(); g.arc(cx, cy, r * 0.5, 0, Math.PI * 2); g.fill();
  }
  function tapete(g, sc, e) {
    const k = K(), x0 = e.px, y0 = e.py, x1 = x0 + e.tw * T, y1 = y0 + e.th * T, F = 6;
    if (!e._tex) e._tex = pintaTapete(e.tw, e.th, e.paleta);
    const P = PALETAS[e.paleta] || PALETAS.cinza;
    k.isoT(g, sc);
    // sombra suave por baixo (sai um pouco para o sul e o leste)
    k.poly(g, [[x0 + F, y0 + 1.5, 0], [x1 - F + 1.5, y0 + 1.5, 0], [x1 - F + 1.5, y1 + 0.5, 0], [x0 + F, y1 + 0.5, 0]], 'rgba(0,0,0,0.22)', false);
    // a espessura (frente e lado) e o tapete em cima
    k.poly(g, [[x0 + F, y1 - 1, 0], [x1 - F, y1 - 1, 0], [x1 - F, y1 - 1, 0.6], [x0 + F, y1 - 1, 0.6]], P.borda, false);
    k.poly(g, [[x1 - F, y0 + 1, 0], [x1 - F, y1 - 1, 0], [x1 - F, y1 - 1, 0.6], [x1 - F, y0 + 1, 0.6]], shade(P.borda, -0.2), false);
    // o brilho neon em volta (por baixo do tapete, saindo pelas bordas)
    if (P.neon) for (let i = 3; i >= 1; i--) k.poly(g, [[x0 + F - i, y0 + 1 - i, 0.1], [x1 - F + i, y0 + 1 - i, 0.1], [x1 - F + i, y1 - 1 + i, 0.1], [x0 + F - i, y1 - 1 + i, 0.1]], 'rgba(' + P.neon + ',' + (0.07 * (4 - i)).toFixed(2) + ')', false);
    k.setMap(g, sc, [x0, y0, 0.6], [1 / Q, 0, 0], [0, 1 / Q, 0]);
    g.drawImage(e._tex, 0, 0);
    k.isoT(g, sc);
    if (P.neon) {
      const cor = 'rgb(' + P.neon + ')', z = 0.7, a = [x0 + F, y0 + 1.5], b = [x1 - F, y1 - 1.5];
      k.line(g, [a[0], a[1], z], [b[0], a[1], z], cor); k.line(g, [b[0], a[1], z], [b[0], b[1], z], cor);
      k.line(g, [b[0], b[1], z], [a[0], b[1], z], cor); k.line(g, [a[0], b[1], z], [a[0], a[1], z], cor);
    }
    return null;
  }

  // o círculo de luz quente no chão, embaixo de cada luminária (um gradiente redondo deitado no piso)
  function luzQuente(g, sc, e, t) {
    const k = K(), [cx, cy] = e.centro, r = e.raio || 26;
    k.setMap(g, sc, [cx, cy, 0.3], [1, 0, 0], [0, 1, 0]);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
    const a = 0.24 + 0.015 * Math.sin(t * 0.5 + cx);
    const cor = e.cor || '255,214,150';
    gr.addColorStop(0, 'rgba(' + cor + ',' + a.toFixed(3) + ')');
    gr.addColorStop(0.55, 'rgba(' + cor + ',' + (a * 0.4).toFixed(3) + ')');
    gr.addColorStop(1, 'rgba(' + cor + ',0)');
    g.fillStyle = gr;
    g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
    k.isoT(g, sc);
    return null;
  }

  // o reflexo do rodapé neon no chão: uma faixa que vai sumindo, ao pé da parede ('N' = do fundo, 'O' = da esquerda)
  function faixaNeon(g, sc, e, t) {
    const k = K(), x0 = e.px, y0 = e.py, x1 = x0 + e.tw * T, y1 = y0 + e.th * T, osc = 0.85 + 0.15 * Math.sin(t * 0.8);
    k.isoT(g, sc);
    for (let i = 0; i < 6; i++) {
      const a = 'rgba(' + e.cor + ',' + ((0.11 - i * 0.017) * osc).toFixed(3) + ')';
      if (e.lado === 'N') k.poly(g, [[x0, y0 + i, 0], [x1, y0 + i, 0], [x1, y0 + i + 1, 0], [x0, y0 + i + 1, 0]], a, false);
      else k.poly(g, [[x0 + i, y0, 0], [x0 + i + 1, y0, 0], [x0 + i + 1, y1, 0], [x0 + i, y1, 0]], a, false);
    }
    return null;
  }

  DL.DCArte = {
    casco, txt, cores, itemParede, meiaParede, janela, portaRua, sofa, rackCalha, luzFria, tapete, luzQuente, faixaNeon, portaNeon,
    quadroSerra, termometro, relogio, tomada, interruptor, quadrinho,
  };
})();

/* Venti Experience — Parte 4: a SALA do DataLab (só o cenário; a missão fica em datalab.js, os desenhos em
   datalab-arte.js, os funcionários em datalab-gente.js).
   Estética cyberpunk roxo + ciano (planta do print do DataLab original): paredes grafite-violeta com filete ciano
   e rodapé neon, escritório de piso de placas escuras, sala técnica com parede inteira (racks quase pretos com LED ciano, luz fria)
   e a sala de carpete azul-escuro na frente, com tapetes. Sem placas grandes: só textos pequenos.

     x→ 0         1         2
        012345678901234567890123
      0 ########################   parede do fundo: quadrinho, relógio (x10), tomadas
      1 #KAmMMMMMMLWWP▓.rRRRR.C#   K café · A bebedouro · M mesa com 2 monitores (5 estações) · L luminária
      2 #mmmccccccmmmm▯.,,,,,..#   c cadeira · W quadro branco · P planta · r = RACK-01 · R racks (1 fileira)
      3 #mmmmmmmmmmmmm▯........#   ▯ porta da sala técnica (abre sozinha) · , piso perfurado · C ar de precisão
      4 #mmmmmmmmmmmmm▓........#   ▓ parede inteira da sala técnica, com o "19,7 °C" por dentro
      5 DmmmMMMMLmmmmm▓........#   D porta verde para a rua (rua.js abre a parede aqui), spawn (1,5)
      6 Dmmmccccmmmmmm▒........#   ▒ janelinha · na parede da esquerda (x0, y2-4): o quadro da Serra Dourada
      7 #mmmmmmmmmmmmm▒.BBB....#   B bancada com o servidor e o switch (missão)
      8 #Pmmmmmmmmmmmm▓........#
      9 #mmmmmmmmmmmmm▓........#
     10 #=====  =======▓▓▓▓▓▓▓▓#   = meia-parede (alvenaria clara + tampo de madeira), passagem em x6-7
     11 #~SSSL~~~~~~~~~~~EE~~~~#   S sofá · L luminária · E estante de livros
     12 #11111~~~~2222~~~~3333~#   1 tapete cinza (com a mesinha t) · 2 tapete Claude · 3 tapete azul
     13 #11t11~~~~2222~~~~3333~#
     14 #11111~~~~2222~~~~3333~#
     15 #P~~~~~~~~~~~~~~~~~~~~P#
     16 ########################

   Quem usa: datalab.js pega DL.DCSala.tiles / itens() / preparar(game) / overlay.
   validarMapa() no console confere esta sala (nada dentro da parede, nada em cima de nada, tudo alcançável). */
(function () {
  'use strict';
  const DL = window.DL, T = DL.T, R = DL.R, hash = DL.hash, shade = DL.shade;
  const IX = (x, y) => x - y, IY = (x, y, z) => (x + y) / 2 - (z || 0);
  const mk = (w, h) => DL.mk(w, h);

  /* ------------------------------------------------------------------ */
  /* Planta                                                              */
  /* ------------------------------------------------------------------ */
  const W = 24, H = 17;
  const VX = 14, VY = 10;                 // a parede da sala técnica (x = 14) e a meia-parede da frente (y = 10)
  const PORTA_T = [2, 3], JANELA = [6, 7], PASSA_H = [6, 7]; // a porta e a janelinha da sala técnica (x = 14), a passagem na meia-parede
  const ALUNO = 'RACK-01';
  // pisos novos com letras que nenhum outro mapa usa (DL.FLOORS é de todos os mapas)
  const MAD = 'μ', CAR = 'κ';

  function letra(x, y) {
    if (x === 0 || y === 0 || x === W - 1 || y === H - 1) return '#';
    if (y > VY) return CAR;
    if (x > VX) return y === 2 && x >= 16 && x <= 20 ? ',' : '.'; // piso elevado; placas perfuradas na frente dos racks
    return MAD;
  }
  const tiles = [];
  for (let y = 0; y < H; y++) { let s = ''; for (let x = 0; x < W; x++) s += letra(x, y); tiles.push(s); }

  /* ---------- pisos (do DataLab original, decor.js: madeira e carpete) ---------- */
  const COR_MAD = '#17141f', COR_CAR = '#121730';
  // as emendas de cada fileira de tábuas: comprimentos de 24 a 72 px, sorteados (sempre iguais)
  const EMENDAS = new Map();
  function tabuaDe(row, gx) {
    let e = EMENDAS.get(row);
    if (!e) {
      e = [];
      let x = -Math.floor(hash(row * 3 + 1) * 48);
      for (let n = 0; x < W * 16 + 80; n++) { e.push(x); x += 24 + Math.floor(hash(row * 131 + n * 17) * 4) * 16; }
      EMENDAS.set(row, e);
    }
    let i = 0;
    while (i + 1 < e.length && e[i + 1] <= gx) i++;
    return { n: i, x0: e[i], x1: e[i + 1] };
  }
  // escritório: placas de metal escuro (16 px) com frestas, parafusos e, a cada 3 fileiras, uma fresta violeta acesa
  DL.FLOORS[MAD] = function (g, px, py, x, y) {
    const base = shade('#17141f', (hash(x * 7 + y * 13) - 0.5) * 0.08);
    R(g, px, py, 16, 16, base);
    R(g, px, py, 16, 1, shade(base, 0.18)); R(g, px, py, 1, 16, shade(base, 0.12));        // borda clara
    R(g, px, py + 15, 16, 1, '#0b0a10'); R(g, px + 15, py, 1, 16, '#0b0a10');               // fresta
    for (const [bx, by] of [[2, 2], [13, 2], [2, 13], [13, 13]]) R(g, px + bx, py + by, 1, 1, '#2b2540'); // parafusos
    const r = hash(x * 31 + y * 17);
    if (r > 0.82) for (let i = 0; i < 4; i++) R(g, px + 5, py + 5 + i * 2, 6, 1, '#100e17');  // grade de ventilação
    else if (r < 0.1) R(g, px + 4, py + 7, 8, 1, shade(base, 0.08));                          // risco
    if (y % 3 === 0) { R(g, px, py + 15, 16, 1, '#3b2a66'); R(g, px, py + 14, 16, 1, 'rgba(155,92,255,0.10)'); }
    if (x % 4 === 0) R(g, px + 15, py, 1, 16, '#241c3c');
  };
  DL.FLOORS[CAR] = function (g, px, py, x, y) {
    // carpete azul-noite: trama miúda e uns pontinhos violeta e ciano
    for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i += 2) {
      const gx = x * 16 + i, gy = y * 16 + j, v = ((gx >> 1) + gy) & 1 ? 0.04 : -0.02;
      R(g, px + i, py + j, 2, 1, shade(COR_CAR, v + (hash(gx * 13 + gy * 7) - 0.5) * 0.05));
    }
    for (let i = 0; i < 4; i++) R(g, px + Math.floor(hash(x * 131 + y * 71 + i * 17) * 16), py + Math.floor(hash(x * 37 + y * 113 + i * 29) * 16), 1, 1, i === 0 ? '#5a3a9a' : i === 1 ? '#1f6f80' : shade(COR_CAR, 0.14));
  };

  const A = DL.DCArte, itemParede = A.itemParede;

  /* ------------------------------------------------------------------ */
  /* Itens da sala                                                       */
  /* ------------------------------------------------------------------ */
  // o que vai dentro de cada rack (9 posições, 0 = topo): switch no topo e alguns servidores
  function unidades(seed) {
    const u = new Array(9).fill(null);
    u[0] = 'switch';
    for (let k = 2; k < 9; k++) if (hash(seed * 31 + k * 7) > 0.3) u[k] = 'server';
    return u;
  }

  function itens() {
    const out = [], add = (o) => (out.push(o), o);

    /* ---- sala técnica (servidores): 1 fileira de 5 racks encostada no fundo ---- */
    for (let i = 0; i < 5; i++) {
      const id = i === 0 ? ALUNO : 'RACK-0' + (i + 1);
      // o RACK-01 (o da missão) é o primeiro depois da porta, vazio, com a etiqueta verde
      const calha = [i === 0 ? VX * T + 10 : (16 + i) * T, i === 4 ? 22 * T : (17 + i) * T]; // a calha vai da parede até o ar
      add({ id, kind: 'rack', ciano: true, tx: 16 + i, ty: 1, tag: id === ALUNO ? '#7ee0a1' : null, units: id === ALUNO ? new Array(9).fill(null) : unidades(i + 1),
        seed: 101 + i * 37, drawIso: A.rackCalha, calha });
    }
    add({ kind: 'rug', rug: true, tx: VX + 1, ty: 1, tw: W - VX - 2, th: VY - 1, solid: false, drawIso: A.luzFria, reflexo: [16 * T, 21 * T, 2 * T] });
    add({ id: 'CRAC-01', kind: 'crac', tx: 22, ty: 1 });
    add({ id: 'BANCADA', kind: 'table', variant: 'bench', tx: 16, ty: 7, tw: 3, color: '#231d33' });
    // a parede inteira da sala técnica (x = 14 e y = 10), com a porta e a janelinha
    for (let y = 1; y < VY; y++) {
      if (PORTA_T.indexOf(y) >= 0 || y === JANELA[1]) continue;
      if (y === JANELA[0]) { add({ id: 'JANELA', kind: 'dc-janela', tx: VX, ty: y, th: 2, isoH: 34, drawIso: A.janela, isoRect: [VX * T + 6, y * T, VX * T + 10, (y + 2) * T] }); continue; }
      add({ kind: 'wallseg', tx: VX, ty: y, u: y > 1 && PORTA_T.indexOf(y - 1) < 0, d: true });
    }
    add({ id: 'PORTA-TEC', kind: 'door', axis: 'v', len: 2, tx: VX, ty: PORTA_T[0], th: 2, solid: false, open: 0, drawIso: A.portaNeon });
    add({ kind: 'wallseg', tx: VX, ty: VY, u: true, r: true });
    for (let x = VX + 1; x < W - 1; x++) add({ kind: 'wallseg', tx: x, ty: VY, l: true, r: true });

    /* ---- escritório ---- */
    add({ id: 'MESA-CAFE', kind: 'table', variant: 'small', tx: 1, ty: 1, color: '#2a2340' });
    add({ kind: 'coffee', tx: 1, ty: 1, host: 'MESA-CAFE', solid: false });
    add({ kind: 'water', tx: 2, ty: 1 });
    add({ kind: 'whiteboard', tx: 11, ty: 1, tw: 2 });
    // as 5 estações: mesa (2 monitores acesos) + cadeira de escritório na frente
    const telas = [['code', 'net'], ['kpi', 'term'], ['srv', 'code'], ['term', 'kpi'], ['net', 'code']];
    const objs = [['caneca', 'papeis', 'postit'], ['fone', 'celular'], ['plantinha', 'caneca', 'postit'], ['papeis', 'fone', 'caneca'], ['celular', 'plantinha']];
    [[4, 1, 'MESA-NOC'], [6, 1], [8, 1], [4, 5], [6, 5]].forEach(([x, y, id], i) => {
      add({ id: id || 'MESA-0' + (i + 1), kind: 'desk', tx: x, ty: y, tw: 2, work: telas[i][0], work2: telas[i][1], objs: objs[i] });
      add({ kind: 'chair', tx: x, ty: y + 1, tw: 2, cx: x * T + 16, cy: (y + 1) * T + 11 });
    });
    // luminárias de tubo neon (violeta e ciano), cada uma com o seu brilho no chão
    for (const [x, y, cor, rgb] of [[10, 1, '#c4a5ff', '155,92,255'], [8, 5, '#8ff3ff', '46,230,255'], [5, 11, '#c4a5ff', '155,92,255']]) {
      add({ kind: 'lamp', tx: x, ty: y, color: cor });
      add({ kind: 'rug', rug: true, tx: x - 1, ty: y, tw: 3, th: 2, solid: false, drawIso: A.luzQuente, centro: [x * T + 8, y * T + 12], cor: rgb });
    }
    // o reflexo do rodapé neon no chão, ao pé das paredes do fundo
    add({ kind: 'rug', rug: true, tx: 1, ty: 1, tw: VX - 1, th: 1, solid: false, drawIso: A.faixaNeon, lado: 'N', cor: '155,92,255' });
    add({ kind: 'rug', rug: true, tx: 1, ty: 1, tw: 1, th: VY - 1, solid: false, drawIso: A.faixaNeon, lado: 'O', cor: '155,92,255' });
    add({ kind: 'rug', rug: true, tx: 1, ty: VY + 1, tw: 1, th: H - VY - 2, solid: false, drawIso: A.faixaNeon, lado: 'O', cor: '155,92,255' });
    add({ kind: 'rug', rug: true, tx: VX + 1, ty: 1, tw: W - VX - 2, th: 1, solid: false, drawIso: A.faixaNeon, lado: 'N', cor: '46,230,255' });
    for (const [x, y] of [[13, 1], [1, 8], [1, 15], [22, 15]]) add({ kind: 'plant', tx: x, ty: y });
    // nas paredes de fora: o quadro da Serra Dourada, relógio, quadrinhos, tomadas, interruptor (tudo pequeno)
    add(itemParede('QUADRO-SERRA', 'O', 2 * T + 2, 46, 38, 24, A.quadroSerra));
    add(itemParede('RELOGIO', 'N', 9 * T + 12, 22, 40, 7, A.relogio, 20));
    add(itemParede('QUADRINHO-1', 'N', T + 6, 12, 38, 9, A.quadrinho(0)));
    add(itemParede('QUADRINHO-2', 'O', 12 * T + 4, 12, 36, 9, A.quadrinho(1)));
    add(itemParede('INTERRUPTOR', 'O', 7 * T + 3, 4, 22, 6, A.interruptor));
    [[5, 'N'], [9, 'N'], [3, 'O'], [9, 'O'], [14, 'O']].forEach(([k, lado], i) => add(itemParede('TOMADA-' + i, lado, k * T + 10, 4, 6, 5, A.tomada)));
    add(itemParede('TEMPERATURA', VX * T + 10, 4 * T + 1, 30, 27, 9, A.termometro)); // na parede da sala técnica, por dentro

    /* ---- a meia-parede (alvenaria clara + tampo de madeira) e a sala de carpete ---- */
    for (let x = 1; x < VX; x++) {
      if (PASSA_H.indexOf(x) >= 0) continue;
      add({ kind: 'dc-meia', tx: x, ty: VY, isoH: 18, drawIso: A.meiaParede, isoRect: [x * T, VY * T + 5, x * T + T, VY * T + 11],
        l: PASSA_H.indexOf(x - 1) < 0, r: PASSA_H.indexOf(x + 1) < 0 });
    }
    add({ kind: 'rug', tx: 1, ty: 12, tw: 5, th: 3, paleta: 'cinza', drawIso: A.tapete, solid: false });
    add({ kind: 'rug', tx: 10, ty: 12, tw: 4, th: 3, paleta: 'claude', drawIso: A.tapete, solid: false });
    add({ kind: 'rug', tx: 18, ty: 12, tw: 4, th: 3, paleta: 'azul', drawIso: A.tapete, solid: false });
    add({ kind: 'dc-sofa', tx: 2, ty: 11, tw: 3, isoH: 24, drawIso: A.sofa, isoRect: [2 * T, 11 * T + 1, 5 * T, 12 * T - 1] });
    add({ id: 'MESINHA', kind: 'table', variant: 'small', tx: 3, ty: 13, color: '#2a2340' });
    add({ kind: 'shelf', tx: 17, ty: 11, tw: 2, color: '#231d33', inner: '#0f0c18' });
    add({ kind: 'vase', tx: 3, ty: 13, host: 'MESINHA', solid: false });
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Ao entrar: paredes claras, as 3 áreas (luz) e a porta verde         */
  /* ------------------------------------------------------------------ */
  const ESTILO = { datalab: true, wallColor: '#1b1729', light: 'dim' };
  const ESTILO_TEC = { datalab: true, wallColor: '#161a2a', light: 'dim' };
  const SALAS = [
    { x: 1, y: 1, w: 14, h: 10, style: ESTILO },   // escritório (com a parede da sala técnica e a meia-parede)
    { x: 15, y: 1, w: 8, h: 9, style: ESTILO_TEC }, // sala técnica (servidores)
    { x: 1, y: 11, w: 22, h: 5, style: ESTILO },   // carpete
  ];
  // parede clara de placas, com o acabamento cinza em cima e o rodapé cinza (o print do original)
  // parede cyberpunk: painéis grafite-violeta, filete ciano aceso no alto, frisos e rodapé com neon violeta
  function paredeDatalab(g, s, x, n, H) {
    const c = s.wallColor, w = 16 * (n || 1);
    R(g, x, 0, w, H, c);
    R(g, x, 0, w, 2, '#2a2340');
    R(g, x, 2, w, 1, '#2ee6ff');                                 // o filete ciano
    R(g, x, 3, w, 2, 'rgba(46,230,255,0.16)');                   // o brilho dele na parede
    for (let i = 0; i < w; i += 16) {
      R(g, x + i + 15, 5, 1, H - 10, '#0e0c16');                 // junta das placas
      R(g, x + i + 2, 8, 11, 1, shade(c, 0.12)); R(g, x + i + 2, 8, 1, H - 18, shade(c, 0.07)); // painel em relevo
      R(g, x + i + 2, H - 10, 11, 1, shade(c, -0.25));
      R(g, x + i + 6, Math.round(H * 0.45), 4, 1, '#120f1c');    // ventilação
      R(g, x + i + 6, Math.round(H * 0.45) + 2, 4, 1, '#120f1c');
    }
    R(g, x, H - 6, w, 2, 'rgba(155,92,255,0.18)');
    R(g, x, H - 4, w, 1, '#9b5cff');                             // o rodapé neon
    R(g, x, H - 3, w, 3, '#0d0b14');
  }
  function preparar(game) {
    const w = game.world, sc = game.scene;
    // os ganchos de estilo do motor (faculdade.js também usa; aqui só vale para as salas com "datalab")
    if (!DL.roomStyle) DL.roomStyle = (r) => (r && r.style) || null;
    if (!DL.decorRender) DL.decorRender = { WALL_DEFAULT: {}, wallFace() {} };
    if (!DL.decorRender._dl) {
      const outra = DL.decorRender.wallFace;
      DL.decorRender.wallFace = function (g, s) { return s && s.datalab ? paredeDatalab.apply(this, arguments) : outra.apply(this, arguments); };
      DL.decorRender._dl = true;
    }
    w.rooms = SALAS;
    const ra = new Int16Array(w.W * w.H).fill(-1);
    SALAS.forEach((r, i) => { for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) ra[y * w.W + x] = i; });
    // a rua (rua.js) abre a porta na parede com piso de datacenter: aqui vira madeira, como o escritório,
    // e o vão conta como escritório (senão as pontas da parede em volta da porta saem na cor escura padrão)
    for (let y = 0; y < H; y++) if (w.tiles[y * w.W] !== '#') { w.tiles[y * w.W] = MAD; ra[y * w.W] = 0; }
    // a parede de baixo da sala técnica (y = 10) pega o estilo da sala técnica (senão as pontas saem escuras)
    for (let x = VX; x < W - 1; x++) ra[VY * w.W + x] = x === VX ? 0 : 1;
    w.roomAt = ra;
    sc.floor = DL.renderFloor(w);
    w.version = (w.version || 0) + 1;
    const porta = w.byId['PORTA-RUA'];
    if (porta) { porta.drawIso = A.portaRua; porta.isoRect = [11, porta.py, 16, porta.py + (porta.len || 1) * T]; }
  }

  /* a porta da sala técnica abre sozinha quando alguém chega perto (o jogador e, depois, os funcionários) */
  function atualizar(game, dt) {
    const d = game.world.byId['PORTA-TEC'];
    if (!d) return;
    const cx = VX * T + 8, cy = (PORTA_T[0] + 1) * T, perto = (a) => a && Math.abs(a.x - cx) < 26 && Math.abs(a.y - cy) < 24;
    const quem = [game.player].concat(DL.DCSala.gente ? DL.DCSala.gente() : []);
    const alvo = quem.some(perto) ? 1 : 0, antes = d.open || 0;
    d.open = alvo > antes ? Math.min(1, antes + dt * 3.5) : Math.max(0, antes - dt * 2);
    if (antes === 0 && d.open > 0 && DL.sfx && DL.sfx.door) DL.sfx.door();
  }

  function overlay(g, sc) {
    if (DL.DCSala.extraOverlay) DL.DCSala.extraOverlay(g, sc);
  }

  /* ------------------------------------------------------------------ */
  /* validarMapa() para esta sala                                        */
  /* ------------------------------------------------------------------ */
  function validar(game) {
    const w = game.world, out = [], err = (o, m, x, y) => out.push({ objeto: o, problema: m, x, y });
    const at = (x, y) => (x < 0 || y < 0 || x >= w.W || y >= w.H ? '#' : w.tiles[y * w.W + x]);
    const ocupa = w.items.filter((e) => e.solid);
    for (const e of w.items) {
      for (let y = e.ty; y < e.ty + e.th; y++) for (let x = e.tx; x < e.tx + e.tw; x++) {
        if (at(x, y) === '#' && e.kind !== 'door') err(e.id || e.kind, 'dentro da parede', x, y);
        if (e.solid && at(x, y) === ',') err(e.id || e.kind, 'bloqueando o corredor frio', x, y);
      }
      if (e.kind === 'rack' && at(e.tx, e.ty) !== '.') err(e.id, 'rack fora do piso do datacenter', e.tx, e.ty);
    }
    for (let i = 0; i < ocupa.length; i++) for (let j = i + 1; j < ocupa.length; j++) {
      const a = ocupa[i], b = ocupa[j];
      if (a.host === b || b.host === a) continue;
      if (a.tx < b.tx + b.tw && b.tx < a.tx + a.tw && a.ty < b.ty + b.th && b.ty < a.ty + a.th) err((a.id || a.kind) + ' × ' + (b.id || b.kind), 'um em cima do outro', b.tx, b.ty);
    }
    // tudo o que tem interação precisa ser alcançável a pé, a partir da entrada
    const sp = [Math.floor(w.spawn.x / T), Math.floor(w.spawn.y / T)], seen = new Uint8Array(w.W * w.H), fila = [sp];
    seen[sp[1] * w.W + sp[0]] = 1;
    while (fila.length) {
      const [x, y] = fila.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w.W || ny >= w.H || seen[ny * w.W + nx] || w.solid[ny * w.W + nx]) continue;
        seen[ny * w.W + nx] = 1; fila.push([nx, ny]);
      }
    }
    const def = game.map;
    for (const e of w.items) {
      if (e.ix == null || !def.useLabel || !def.useLabel(game, e)) continue;
      const x = Math.floor(e.ix / T), y = Math.floor(e.iy / T);
      if (!seen[y * w.W + x] && !seen[(y + 1) * w.W + x]) err(e.id || e.kind, 'não dá para chegar na frente dele', x, y);
    }
    for (const p of w.portals) if (!seen[p.ty * w.W + p.tx]) err('porta para ' + p.to, 'não dá para chegar', p.tx, p.ty);
    // nenhum pedaço de chão livre fica fechado (um bolsão onde o jogador ficaria preso)
    for (let y = 0; y < w.H; y++) for (let x = 0; x < w.W; x++) if (at(x, y) !== '#' && !w.solid[y * w.W + x] && !seen[y * w.W + x]) err('chão', 'pedaço fechado, sem saída', x, y);
    const p = game.player;
    if (p && w.solid[Math.floor(p.y / T) * w.W + Math.floor(p.x / T)]) err('jogador', 'preso dentro de algo', Math.floor(p.x / T), Math.floor(p.y / T));
    if (out.length) { console.warn('[validarMapa · datalab] ' + out.length + ' erro(s):'); console.table(out); }
    else console.log('[validarMapa · datalab] 0 erros: tudo no lugar certo.');
    return out;
  }
  // (o lago e a rua trocam o window.validarMapa quando carregam; o daqui entra por último, depois de todos)
  window.addEventListener('DOMContentLoaded', () => {
    const antigo = window.validarMapa;
    window.validarMapa = () => (DL.game && DL.game.map && DL.game.map.id === 'datalab' ? validar(DL.game) : antigo ? antigo() : []);
  });

  DL.DCSala = { W, H, tiles, itens, preparar, atualizar, overlay, validar, ALUNO, dados: {}, extraOverlay: null, gente: null };
})();

/* Venti Experience — Parte 2: a Faculdade Serra Dourada por dentro.
   Referências (fotos da faculdade enviadas nas etapas 4 e 5):
     entrada.jpg        porta de vidro, piso de madeira, faixa tátil cinza, sofá creme, lustres âmbar
     corredor-mesas.jpg corredor visto da entrada: bancos "pedra" e mesinhas junto da vidraça (esquerda),
     (corredor-frente)  mesa comprida com cadeiras verdes e laranja (meio), bolinhas de luz brancas
     corredor-fundo.jpg corredor visto do fundo: porta de vidro da entrada no fim, ar-condicionado,
                        extintor, quadro de avisos, porta de vidro de sala
     logo-saguao.jpg    parede de ripas com o logo, poltronas vermelhas, tapete redondo, portas de madeira
     parede-verde.jpg   parede verde-acinzentada com a frase e os veios de madeira, degrau de madeira,
                        poltronas, puffs cinza, mesa de centro e violão

   Partes (para quem entra pela porta de vidro), seguindo a planta real da faculdade:
     1. Em frente: as mesas, com a faixa tátil reta para dentro delas
     2. À direita: o saguão comprido. Primeiro o logo, na parede reta à esquerda do saguão, virada
        para a entrada, com o tapete e as poltronas na frente
     3. Depois do logo: a coordenação (foto coordenacao), uma sala aberta para o saguão: 2 portas de madeira na
        parede do lado do logo, a parede laranja no fundo com a porta de visor e a mesa redonda com os notebooks
     4. Depois da coordenação: o corredor, que passa atrás dela e cruza com o corredor das salas
     5. No fim do saguão: a parede verde com a frase; atrás dela fica a sala de ADS
     6. Corredor das salas: 4 salas de cada lado, cada porta logo depois da parede que separa as salas.
        Sala 1 = sala de ADS (1ª à direita); Sala 2 = 1ª à esquerda, com a porta no corredor de baixo;
        Salas 3 a 8 = portas fechadas. As salas que abrem são mapas próprios (PROVISÓRIOS), porque, na
        visão isométrica, a parede alta do fundo esconderia quem estivesse atrás dela.

   Alunos (bots): faculdade-alunos.js — estudando, conversando, entrando e saindo das salas, com mochila.

   Saída: a porta de vidro leva ao DataLab (PROVISÓRIO, até existir o mapa da rua, parte 3).

   Tudo é desenhado por código (sem imagens), no estilo do DataLab. Não muda o motor: usa só os
   ganchos que ele já tem (DL.FLOORS, DL.drawItem, e.drawIso, e.glow, estilo de parede por sala). */
(function () {
  'use strict';
  const DL = window.DL, T = DL.T, R = DL.R, shade = DL.shade, hash = DL.hash;
  const SX = 3, OX = SX * T; // colunas acrescentadas à esquerda: a parede de trás das cadeiras recuou 3 casas
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ------------------------------------------------------------------ */
  /* Cores (tiradas das fotos)                                           */
  /* ------------------------------------------------------------------ */
  const COR = {
    parede: '#e2ddd3',                                              // paredes claras
    // piso de madeira: carvalho médio, fosco, puxando para o bege (fotos 3 e 4), não para o laranja
    madeira: ['#b08c67', '#a98560', '#b6936d', '#a3805c', '#b28e69'],
    junta: '#8b6c4f',
    guia: '#5a5d61', guiaClaro: '#74777b', guiaEscuro: '#404346',     // faixa cinza-escura embutida no piso
    porta: '#b8652f', portaEscura: '#8e4a20',                          // portas de madeira laranja
    ripa: ['#b5623a', '#a35530', '#6a321a'],                          // parede de ripas do logo
    vermelha: '#b5532e',                                               // poltronas do lounge (terracota)
    creme: '#d9c9a5',                                                  // sofá
    verde: '#8fa596', laranja: '#d48a76',                              // cadeiras do corredor: verde-sálvia e salmão
    branco: '#e6e7e8',                                                 // mesas brancas
    mesaClara: '#ffffff',                                              // mesas da sala do fundo: branco igual à cor da parede
    placa: '#1f7f96',                                                  // placas azuis das salas
    ambar: 'rgba(255,176,84,0.22)', globo: 'rgba(255,232,196,0.17)',  // luz das lâmpadas (quente; halo um pouco mais forte)
  };
  const ESTILO = { wall: 'pintada', wallColor: COR.parede, light: 'warm' };
  const ESTILO_CORREDOR = { wall: 'pintada', wallColor: COR.parede, light: 'bright' };

  /* ------------------------------------------------------------------ */
  /* Letras 3 × 5 para placas e logo (só as que usamos)                  */
  /* ------------------------------------------------------------------ */
  const FONT = {
    A: ['010', '101', '111', '101', '101'], C: ['011', '100', '100', '100', '011'],
    D: ['110', '101', '101', '101', '110'], E: ['111', '100', '110', '100', '111'],
    F: ['111', '100', '110', '100', '100'], L: ['100', '100', '100', '100', '111'],
    O: ['010', '101', '101', '101', '010'], R: ['110', '101', '110', '101', '101'],
    S: ['011', '100', '010', '001', '110'], U: ['101', '101', '101', '101', '111'],
    1: ['010', '110', '010', '010', '111'], 2: ['110', '001', '010', '100', '111'],
    3: ['110', '001', '010', '001', '110'], 4: ['101', '101', '111', '001', '001'],
    T: ['111', '010', '010', '010', '010'], Q: ['010', '101', '101', '110', '011'],
    I: ['111', '010', '010', '010', '111'], M: ['101', '111', '111', '101', '101'],
    P: ['110', '101', '110', '100', '100'], N: ['110', '101', '101', '101', '101'],
    H: ['101', '101', '111', '101', '101'], '!': ['010', '010', '010', '000', '010'],
    V: ['101', '101', '101', '101', '010'],
  };
  function texto(g, s, x, y, cor) {
    for (const ch of s) {
      const gl = FONT[ch];
      if (gl) for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (gl[j][i] === '1') R(g, x + i, y + j, 1, 1, cor);
      x += 4;
    }
  }
  const largura = (s) => s.length * 4 - 1;

  /* ------------------------------------------------------------------ */
  /* Pisos                                                               */
  /* ------------------------------------------------------------------ */
  // 'M' madeira · 'G' madeira com a faixa tátil · 'P' soleira das portas das salas
  // (maiúsculas: o mapa do lago já usa 'm' e 'g' minúsculos para concreto e grama)
  // 'o' soleira de granito na porta (o motor trata 'o' como vão de porta numa parede da frente)
  const MADEIRA_ESC = COR.madeira.map((c) => shade(c, -0.08));
  const MADEIRA_VEIO = COR.madeira.map((c) => shade(c, -0.12));
  const MADEIRA_LUZ = COR.madeira.map((c) => shade(c, 0.04)); // (fosco: brilho bem fraco na borda da régua)
  function madeira(g, px, py, x, y) {
    // tábuas compridas (48 px) deitadas no sentido x, 4 por tile, emendas desencontradas
    for (let r = 0; r < 4; r++) {
      const fila = y * 4 + r, off = Math.floor(hash(fila * 977 + 13) * 48), y0 = py + r * 4;
      for (let i = 0; i < 16; i++) {
        const X = px + i, k = Math.floor((X + off) / 48), n = Math.floor(hash(fila * 131 + k * 71) * COR.madeira.length);
        R(g, X, y0, 1, 3, COR.madeira[n]);
        R(g, X, y0, 1, 1, MADEIRA_LUZ[n]);   // o brilho na borda de cima de cada régua
        R(g, X, y0 + 3, 1, 1, MADEIRA_ESC[n]);
        if ((X + off) % 48 === 0) R(g, X, y0, 1, 4, COR.junta);
        else if (hash(X * 13 + fila * 7) > 0.93) R(g, X, y0 + 1 + (X & 1), 3, 1, MADEIRA_VEIO[n]); // veios
      }
    }
    solTarde(g, px, py, x, y);
  }
  // Luz quente de fim de tarde: faixas inclinadas de sol no piso, logo atrás da vidraça da frente
  // (linhas 31–33 do salão, colunas 4–27), entre as sombras dos montantes. Só no salão de entrada.
  function solTarde(g, px, py, x, y) {
    // (o sol baixo entra mais fundo: até ~3,5 tiles do vidro, apagando aos poucos; o piso é pintado uma vez só)
    // (no corredor de estudo, colunas 8 a 21, o vidro fica 3 linhas mais para fora: linha 37)
    // (o saguão também vai até a linha 37; no canto, o vidro é a diagonal x + y = 58 + SX)
    // (a sala do fundo, colunas 1 a 7, é fechada por paredes: fica sem sol)
    if (x < 5 + SX) return;
    const largo = true, yv = Math.min(37, 58 + SX - x);
    if (TILES_FAC.length < 38 || y < yv - 4 || y > yv - 1 || x < 1 + SX || x > 24 + SX) return;
    const fundo = largo ? yv * T : yv * T - 4; // a linha do vidro
    for (let j = 0; j < 16; j++) {
      const Y = py + j, d = fundo - Y;
      if (d < 0) continue;
      const q = Math.max(0, 1 - d / 58), a = 0.36 * q * q * (3 - 2 * q); // queda suave
      if (a <= 0.01) continue;
      for (let i = 0; i < 16; i++) {
        const X = px + i, k = (X + d * 0.9) % 32;
        if (k < 3) continue; // sombra do montante
        R(g, X, Y, 1, 1, 'rgba(255,200,124,' + (k < 5 || k > 29 ? a * 0.5 : a).toFixed(3) + ')');
      }
    }
  }
  function granito(g, px, py, x, y) {
    R(g, px, py, 16, 16, '#8d8a85');
    for (let i = 0; i < 14; i++) {
      const a = hash(x * 41 + y * 17 + i * 5), b = hash(x * 7 + y * 53 + i * 11);
      R(g, px + Math.floor(a * 16), py + Math.floor(b * 16), 1, 1, i % 2 ? '#a3a09a' : '#75726d');
    }
    R(g, px, py, 16, 1, '#a8a59f');
    R(g, px, py + 15, 16, 1, '#6e6b66');
  }
  // a faixa cinza embutida no piso (tiles 'G')
  let TILES_FAC = [];
  // (só 'G': a faixa não entra na soleira da porta de vidro; nas pontas, o quadrado de alerta fica 3 px antes da borda)
  const ehFaixa = (x, y) => (TILES_FAC[y] || '')[x] === 'G';
  function faixa(g, px, py, x, y) {
    madeira(g, px, py, x, y);
    const N = ehFaixa(x, y - 1), S = ehFaixa(x, y + 1), L = ehFaixa(x + 1, y), O = ehFaixa(x - 1, y);
    // Faixa plana cinza-escura embutida no piso (6 px de largura, no meio do tile), com borda limpa:
    // o miolo + um braço até cada vizinho; numa ponta, ela segue até 3 px antes da borda do tile
    // (sempre dentro do piso). As bordas: sombra do rebaixo em cima/à esquerda, luz embaixo/à direita.
    const n = N + S + L + O, A = 5, B = 11, m = new Uint8Array(256);
    const pinta = (x0, y0, x1, y1) => { for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) m[j * 16 + i] = 1; };
    pinta(A, A, B, B);
    if (N) pinta(A, 0, B, A); else if (n === 1 && S) pinta(A, 3, B, A);
    if (S) pinta(A, B, B, 16); else if (n === 1 && N) pinta(A, B, B, 13);
    if (L) pinta(B, A, 16, B); else if (n === 1 && O) pinta(B, A, 13, B);
    if (O) pinta(0, A, A, B); else if (n === 1 && L) pinta(3, A, A, B);
    const dentro = (i, j) => (i < 0 || j < 0 || i > 15 || j > 15 ? ehFaixa(x + Math.floor(i / 16), y + Math.floor(j / 16)) && (i < 0 || i > 15 ? j >= A && j < B : i >= A && i < B) : !!m[j * 16 + i]);
    for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
      if (!m[j * 16 + i]) continue;
      const cor = !dentro(i, j - 1) || !dentro(i - 1, j) ? COR.guiaEscuro : !dentro(i, j + 1) || !dentro(i + 1, j) ? COR.guiaClaro : (i * 7 + j * 3 + x + y) % 11 === 0 ? shade(COR.guia, -0.06) : COR.guia;
      R(g, px + i, py + j, 1, 1, cor);
    }
  }
  DL.FLOORS.M = madeira;
  DL.FLOORS.P = madeira;
  DL.FLOORS.G = faixa;
  DL.FLOORS.o = granito;
  // 'x': a faixa do lado de fora da parede da entrada. Fica "aberta" para o motor não levantar ali
  // uma parede alta ao lado da porta; a borda baixa é desenhada pelo item 'borda' (abaixo).
  // (o motor clareia o piso aberto em +15,+16,+24: esta cor vira o mesmo chão escuro de fora)
  DL.FLOORS.x = (g, px, py) => R(g, px, py, 16, 16, '#030504');

  /* ------------------------------------------------------------------ */
  /* Paredes claras (o motor pinta a parede pelo estilo da sala)         */
  /* ------------------------------------------------------------------ */
  // Ganchos do iso.js (os mesmos do DataLab): DL.roomStyle(sala) e DL.decorRender.wallFace(...).
  // Só valem nas salas que têm "style" e num mundo com roomAt (só os mapas deste arquivo).
  if (!DL.roomStyle) DL.roomStyle = (r) => (r && r.style) || null;
  if (!DL.decorRender) {
    DL.decorRender = {
      WALL_DEFAULT: {},
      // uma faixa de parede de 16 px por tile, H de altura (linha 0 = topo)
      wallFace(g, s, x, n, H) {
        const c = s.wallColor || COR.parede, w = 16 * (n || 1);
        R(g, x, 0, w, H, c);
        R(g, x, 0, w, 1, shade(c, 0.4));
        if (H >= 30) {
          // o forro: a borda branca de placas quadradas no alto da parede, com a sombra embaixo
          R(g, x, 1, w, 3, '#f4f3ef');
          for (let i = 0; i < w; i += 8) R(g, x + i, 1, 1, 3, '#dcdad4');
          R(g, x, 4, w, 1, shade(c, -0.14));
          // trilho de spots: o trilho escuro, um spot por tile e o facho de luz quente na parede
          R(g, x, 5, w, 1, '#5a5d62');
          for (let i = 0; i < w; i += 16) {
            R(g, x + i + 7, 6, 3, 2, '#2e3034'); R(g, x + i + 8, 8, 1, 1, '#ffe2a8');
            for (let k = 0; k < 12; k++) R(g, x + i + 8 - (k >> 1), 9 + k, 1 + (k >> 1) * 2, 1, 'rgba(255,226,170,' + (0.16 - k * 0.012).toFixed(3) + ')');
          }
        } else R(g, x, 1, w, 1, shade(c, -0.06));
        // painel de ripas de madeira (onde o estilo pedir): ripas verticais com veio
        if (s.ripas) for (let i = 0; i < w; i++) {
          const k = (x + i) % 4;
          if (k === 3) R(g, x + i, H >= 30 ? 9 : 2, 1, H - (H >= 30 ? 14 : 7), shade(c, -0.3));
          else if (k === 0) R(g, x + i, H >= 30 ? 9 : 2, 1, H - (H >= 30 ? 14 : 7), shade(c, 0.1));
        }
        // rodapé branco
        R(g, x, H - 5, w, 1, '#ffffff');
        R(g, x, H - 4, w, 4, '#f1f0ec');
        R(g, x, H - 1, w, 1, '#c9c7c0');
      },
    };
  }
  function prepararSalas(game) {
    const w = game.world, ra = new Int16Array(w.W * w.H).fill(-1);
    w.rooms.forEach((r, i) => { for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) ra[y * w.W + x] = i; });
    w.roomAt = ra;
  }

  /* ------------------------------------------------------------------ */
  /* Móveis e decoração (pixel art; "billboard" = desenho em pé)          */
  /* ------------------------------------------------------------------ */
  // Em pé (1 tile): o centro do chão do tile fica em (px + 8, py + 13). Na parede (wall: true):
  // a linha py + 8 − z fica na altura z (a parede tem 44 de altura).
  const chao = (e) => ({ c: e.px + e.tw * 8, b: e.py + e.th * T - 3 });
  // altura z → linha do desenho; objetos pendurados sobre uma mesa (host) partem do tampo
  const linha = (e, z) => (e.host ? e.py - 1 - (z - DL.isoSurfaceTop(e.host)) : e.py + 13 - z);

  // sombra suave no chão, embaixo do móvel (desenhada junto com ele)
  const sombraChao = (g, c, b, w) => { R(g, c - (w >> 1), b, w, 1, 'rgba(40,22,10,0.26)'); R(g, c - (w >> 1) + 2, b + 1, w - 4, 1, 'rgba(40,22,10,0.14)'); };

  /* ------------------------------------------------------------------ */
  /* Assentos em 3/4, virados para onde devem (cadeiras, poltronas, pufes) */
  /* ------------------------------------------------------------------ */
  // Antes, todo assento era um desenho de frente para a câmera. Agora cada um é feito de peças pequenas
  // (caixas, cilindros e pernas) num chão próprio e projetado do mesmo jeito que o motor projeta o mapa
  // (tela x = x − y, tela y = (x + y) / 2 − z), girado para a direção "face":
  //   0 / 'L' = +x (olha para baixo-direita na tela)   90 / 'S' = +y (baixo-esquerda)
  //   180 / 'O' = −x (cima-esquerda, mostra o encosto)  270 / 'N' = −y (cima-direita, mostra o encosto)
  // Nas peças: a = para o lado, d = para a frente (para onde o assento olha), z = altura; tudo em px do mapa.
  const FACE = { L: 0, S: 90, O: 180, N: 270 };
  const anguloDe = (f) => (typeof f === 'number' ? f : FACE[f]);
  const LUZ_X = 0.3, LUZ_Y = 0.95; // a luz vem da vidraça (+y), um pouco de lado
  // polígono convexo pintado pixel a pixel (uma faixa por linha, sem borda borrada)
  function poli(g, P, cor) {
    let y0 = Infinity, y1 = -Infinity;
    for (const p of P) { if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
    for (let y = Math.round(y0); y < Math.round(y1); y++) {
      const yc = y + 0.5;
      let a = Infinity, b = -Infinity;
      for (let i = 0; i < P.length; i++) {
        const p = P[i], q = P[(i + 1) % P.length];
        if ((p[1] <= yc && q[1] > yc) || (q[1] <= yc && p[1] > yc)) {
          const x = p[0] + ((yc - p[1]) / (q[1] - p[1])) * (q[0] - p[0]);
          if (x < a) a = x;
          if (x > b) b = x;
        }
      }
      if (a > b) continue;
      const xa = Math.round(a), xb = Math.max(xa + (b - a > 0.3 ? 1 : 0), Math.round(b));
      if (typeof cor === 'function') for (let x = xa; x < xb; x++) R(g, x, y, 1, 1, cor(x, y));
      else if (xb > xa) R(g, xa, y, xb - xa, 1, cor);
    }
  }
  // contornos prontos (no chão do assento)
  const caixa = (a0, a1, d0, d1) => [[a0, d0], [a1, d0], [a1, d1], [a0, d1]];
  const roda = (r, n, ca, cd) => Array.from({ length: n || 14 }, (_, i) => { const t = (i / (n || 14)) * Math.PI * 2; return [(ca || 0) + r * Math.sin(t), (cd || 0) + r * Math.cos(t)]; });
  // pinta as peças na ordem de profundidade (do fundo para a frente), com luz em cada lado
  function pecas3d(g, c, b, face, tuck, lista) {
    const r = (anguloDe(face) * Math.PI) / 180, fx = Math.cos(r), fy = Math.sin(r), sx = -fy, sy = fx;
    const W = (a, d) => [a * sx + (d + tuck) * fx, a * sy + (d + tuck) * fy];
    const P = (w, z) => [c + w[0] - w[1], b + (w[0] + w[1]) / 2 - z];
    const fila = lista.map((q, n) => {
      const ws = q.perna ? [W(q.perna[0], q.perna[1]), W(q.perna[2], q.perna[3])] : q.p.map(([a, d]) => W(a, d));
      let s = 0;
      for (const w of ws) s += w[0] + w[1];
      return { q, ws, k: (q.ordem != null ? q.ordem : s / ws.length) + q.z0 * 0.02, n };
    });
    fila.sort((A, B) => A.k - B.k || A.n - B.n);
    for (const { q, ws } of fila) {
      if (q.perna) {
        const A = P(ws[0], q.z0), B = P(ws[1], q.z1), n = Math.max(1, Math.round(Math.max(Math.abs(B[0] - A[0]), Math.abs(B[1] - A[1]))));
        for (let i = 0; i <= n; i++) R(g, Math.floor(A[0] + ((B[0] - A[0]) * i) / n), Math.floor(A[1] + ((B[1] - A[1]) * i) / n), q.grossa || 1, 1, q.cor);
        continue;
      }
      // lados virados para a câmera (normal com x + y > 0), com a luz da janela
      let area = 0;
      for (let i = 0; i < ws.length; i++) { const A = ws[i], B = ws[(i + 1) % ws.length]; area += A[0] * B[1] - B[0] * A[1]; }
      const sg = area > 0 ? 1 : -1;
      for (let i = 0; i < ws.length; i++) {
        const A = ws[i], B = ws[(i + 1) % ws.length];
        let nx = sg * (B[1] - A[1]), ny = -sg * (B[0] - A[0]);
        const l = Math.hypot(nx, ny) || 1;
        nx /= l; ny /= l;
        if (nx + ny <= 0.02) continue;
        const k = Math.max(0, nx * LUZ_X + ny * LUZ_Y);
        const cor = shade(q.cor, (q.lado || -0.3) + 0.24 * k);
        poli(g, [P(A, q.z0), P(B, q.z0), P(B, q.z1), P(A, q.z1)], q.tex ? (x, y) => q.tex(x, y, cor) : cor);
      }
      if (q.semTopo) continue;
      const topo = q.topo || shade(q.cor, 0.12);
      poli(g, ws.map((w) => P(w, q.z1)), q.tex ? (x, y) => q.tex(x, y, topo) : topo);
    }
  }
  // sombra suave no chão, redonda (2 camadas: borda clara, miolo mais escuro)
  function sombra3d(g, c, b, face, tuck, r) {
    pecas3d(g, c, b, face, tuck, [
      { p: roda(r, 16), z0: 0, z1: 0, cor: '#000', topo: 'rgba(48,26,12,0.14)', semTopo: false, ordem: -99 },
      { p: roda(r * 0.68, 16), z0: 0, z1: 0, cor: '#000', topo: 'rgba(48,26,12,0.16)', ordem: -98 },
    ]);
  }
  // texturas: tela da cadeira de escritório (trama) e tecido bouclê (pontinhos)
  const trama = () => (x, y, cor) => ((x + y) & 1 ? cor : shade(cor, -0.06)); // (trama fina, discreta)
  const boucle = (x, y, cor) => { const h = hash(x * 31 + y * 17); return h > 0.86 ? shade(cor, 0.1) : h < 0.12 ? shade(cor, -0.1) : cor; };

  // cadeira de concha (plástico) com 4 pernas finas de metal — corredor e sala de vidro
  function cadeiraConcha(g, e) {
    const { c, b } = chao(e), cor = e.color || COR.verde, met = '#9aa0a5', metE = '#6e7378', f = e.face, tk = e.tuck || 0;
    sombra3d(g, c, b, f, tk, 6.5);
    pecas3d(g, c, b, f, tk, [
      { perna: [-4.4, -4.2, -3.4, -3.2], z0: 0, z1: 6.4, cor: metE },
      { perna: [4.4, -4.2, 3.4, -3.2], z0: 0, z1: 6.4, cor: metE },
      { perna: [-4.4, 4.2, -3.4, 3.2], z0: 0, z1: 6.4, cor: met },
      { perna: [4.4, 4.2, 3.4, 3.2], z0: 0, z1: 6.4, cor: met },
      { p: caixa(-4.2, 4.2, -4, 3.8), z0: 6.4, z1: 8, cor, topo: shade(cor, 0.1) },                // assento
      { p: [[-4.2, -5], [4.2, -5], [4.6, -3.9], [-4.6, -3.9]], z0: 8, z1: 15.5, cor, lado: -0.2 }, // concha das costas
      { p: caixa(-3.2, 3.2, -5, -3.9), z0: 15.5, z1: 16.6, cor, topo: shade(cor, 0.16) },         // borda de cima, arredondada
    ]);
  }
  // cadeira de escritório branca: encosto de tela, braços, pistão e base de 5 rodinhas
  function cadeiraEscritorio(g, e) {
    const { c, b } = chao(e), br = '#f1f1ee', esc = '#7d8186', f = e.face, tk = e.tuck || 0;
    sombra3d(g, c, b, f, tk, 7);
    const base = [];
    for (let i = 0; i < 5; i++) {
      const t = (i / 5) * Math.PI * 2 + 0.3, a = 6 * Math.sin(t), d = 6 * Math.cos(t);
      base.push({ perna: [0, 0, a, d], z0: 2, z1: 1.2, cor: '#a9adb1', ordem: -20 + d * 0.1 });
      base.push({ p: roda(0.9, 6, a, d), z0: 0, z1: 1.2, cor: '#34373b', ordem: -19 + d * 0.1 });
    }
    pecas3d(g, c, b, f, tk, [
      ...base,
      { perna: [0, 0, 0, 0], z0: 2, z1: 8, cor: esc, grossa: 2, ordem: -10 },                         // pistão
      { p: caixa(-4.6, 4.6, -4.2, 4.2), z0: 8, z1: 10, cor: br, topo: '#ffffff', lado: -0.22 },        // assento
      { perna: [-5.2, 0, -5.2, 0], z0: 9, z1: 13, cor: '#c9cbcc' },                                    // braços
      { perna: [5.2, 0, 5.2, 0], z0: 9, z1: 13, cor: '#c9cbcc' },
      { p: caixa(-5.8, -4.6, -2.4, 2.8), z0: 13, z1: 14, cor: br, topo: '#ffffff' },
      { p: caixa(4.6, 5.8, -2.4, 2.8), z0: 13, z1: 14, cor: br, topo: '#ffffff' },
      { perna: [0, -5, 0, -5], z0: 9, z1: 11.5, cor: esc, grossa: 2 },                                // apoio do encosto
      { p: caixa(-4.2, 4.2, -5.6, -4.6), z0: 11.5, z1: 21.5, cor: '#e3e5e6', lado: -0.18, tex: trama() }, // encosto de tela
      { p: caixa(-4.6, 4.6, -5.7, -4.5), z0: 21.5, z1: 22.6, cor: br, topo: '#ffffff' },              // moldura de cima
    ]);
  }
  // poltrona do lounge: baixa, armação de madeira clara com pernas inclinadas, estofado terracota
  function poltronaTerracota(g, e) {
    const { c, b } = chao(e), t = COR.vermelha, mad = '#d4a26a', madE = '#a2723f', f = e.face, tk = e.tuck || 0;
    sombra3d(g, c, b, f, tk, 8.5);
    pecas3d(g, c, b, f, tk, [
      { perna: [-7.2, -6.2, -5.6, -4.6], z0: 0, z1: 4.5, cor: madE },
      { perna: [7.2, -6.2, 5.6, -4.6], z0: 0, z1: 4.5, cor: madE },
      { perna: [-7.2, 6.2, -5.6, 4.6], z0: 0, z1: 4.5, cor: mad },
      { perna: [7.2, 6.2, 5.6, 4.6], z0: 0, z1: 4.5, cor: mad },
      { p: caixa(-6.2, 6.2, -5.4, 5.4), z0: 3.6, z1: 4.6, cor: mad, lado: -0.25 },                     // armação
      { p: caixa(-5, 5, -3.6, 5.2), z0: 4.6, z1: 9, cor: t, topo: shade(t, 0.14), tex: boucle },        // assento fofo
      { p: caixa(-5.2, 5.2, -5.6, -3.4), z0: 4.6, z1: 16.5, cor: t, lado: -0.2, topo: shade(t, 0.16), tex: (x, y, cr) => (y % 6 === 0 ? shade(cr, -0.08) : cr) }, // encosto (com costura)
      { p: caixa(-3.6, 3.6, -3.4, -2.2), z0: 9, z1: 13, cor: '#e9d9b8', lado: -0.12, topo: '#f3e6cc', tex: boucle }, // almofada creme
      { p: caixa(-6.6, -5, -5.2, 4.4), z0: 4.6, z1: 11, cor: mad, topo: '#ecc492', lado: -0.2 },       // braços de madeira
      { p: caixa(5, 6.6, -5.2, 4.4), z0: 4.6, z1: 11, cor: mad, topo: '#ecc492', lado: -0.2 },
    ]);
  }
  // poltrona arredondada de bouclê (cinza ou verde-acinzentada): concha baixa e redonda
  function poltronaRedonda(g, e) {
    const { c, b } = chao(e), base = e.variant === 'salvia' ? '#8fa08f' : '#a3a4a1', f = e.face, tk = e.tuck || 0;
    sombra3d(g, c, b, f, tk, 8.5);
    const costas = [];
    for (let k = 0; k <= 8; k++) {
      const t = ((100 + k * 20) * Math.PI) / 180;
      costas.push({ p: roda(2.4, 8, 5.4 * Math.sin(t), 5.4 * Math.cos(t)), z0: 7, z1: 14.5 - Math.abs(k - 4) * 0.5, cor: base, tex: boucle, lado: -0.24 });
    }
    pecas3d(g, c, b, f, tk, [
      { p: roda(1, 6, -4, -4), z0: 0, z1: 1.5, cor: '#4a4c4f' }, { p: roda(1, 6, 4, -4), z0: 0, z1: 1.5, cor: '#4a4c4f' },
      { p: roda(1, 6, -4, 4), z0: 0, z1: 1.5, cor: '#4a4c4f' }, { p: roda(1, 6, 4, 4), z0: 0, z1: 1.5, cor: '#4a4c4f' },
      { p: roda(7.4, 18), z0: 1.5, z1: 7.5, cor: base, tex: boucle, lado: -0.26 },                    // a base redonda
      { p: roda(5.4, 16, 0, 0.8), z0: 7.5, z1: 9, cor: shade(base, 0.08), tex: boucle, ordem: -0.5 }, // almofada
      ...costas,
    ]);
  }
  // poltrona de madeira de encosto curvo com almofada laranja
  function poltronaMadeira3d(g, e) {
    const { c, b } = chao(e), mad = '#a9693a', madE = '#7c4a26', alm = '#d4763f', f = e.face, tk = e.tuck || 0;
    sombra3d(g, c, b, f, tk, 7.5);
    pecas3d(g, c, b, f, tk, [
      { perna: [-5.6, -5, -5.6, -5], z0: 0, z1: 6, cor: madE, grossa: 2 }, { perna: [5, -5, 5, -5], z0: 0, z1: 6, cor: madE, grossa: 2 },
      { perna: [-5.6, 5, -5.6, 5], z0: 0, z1: 6, cor: mad, grossa: 2 }, { perna: [5, 5, 5, 5], z0: 0, z1: 6, cor: mad, grossa: 2 },
      { p: caixa(-6, 6, -5.4, 5.4), z0: 5, z1: 7, cor: mad },                                        // assento de madeira
      { p: caixa(-5, 5, -4, 5), z0: 7, z1: 9.5, cor: alm, topo: '#e58a52', tex: (x, y, cr) => (y % 4 === 0 ? shade(cr, -0.1) : cr) }, // almofada (com costura)
      { p: caixa(-6, 6, -6, -4.6), z0: 7, z1: 17, cor: mad, lado: -0.18, tex: (x, y, cr) => (y % 3 === 0 ? shade(cr, -0.22) : (x + y) % 7 === 0 ? shade(cr, 0.06) : cr) }, // encosto de ripas (com veio)
      { p: caixa(-4.4, 4.4, -4.6, -3.4), z0: 9.5, z1: 15, cor: alm, lado: -0.12, topo: '#e58a52' }, // almofada das costas
      { p: caixa(-7, -5.6, -5, 4), z0: 7, z1: 12, cor: mad, topo: '#c4834e' },                       // braços
      { p: caixa(5.6, 7, -5, 4), z0: 7, z1: 12, cor: mad, topo: '#c4834e' },
      { p: caixa(-7.2, -5.4, 2.6, 4.4), z0: 12, z1: 12.6, cor: '#d49862', topo: '#e0aa74' },          // ponta dos braços
      { p: caixa(5.4, 7.2, 2.6, 4.4), z0: 12, z1: 12.6, cor: '#d49862', topo: '#e0aa74' },
    ]);
  }

  // poltrona do lounge (o tipo continua 'poltrona-vermelha' para nada mudar de lugar): baixa, de madeira,
  // estofado terracota, pernas de madeira inclinadas
  function poltronaVermelha(g, e) {
    if (e.face != null) return poltronaTerracota(g, e);
    // (um pouco maior que antes, na proporção do personagem: assento a ~1/4 da altura dele)
    const { c, b } = chao(e), t = COR.vermelha, cl = shade(t, 0.18), es = shade(t, -0.25), mad = '#d4a26a', madE = '#9c6c3e';
    sombraChao(g, c, b, 18);
    // pernas inclinadas (as de trás mais escuras e curtas)
    R(g, c - 5, b - 6, 1, 4, madE); R(g, c + 4, b - 6, 1, 4, madE);
    for (let k = 0; k < 6; k++) { R(g, c - 8 + (k >> 1), b - k, 1, 1, mad); R(g, c + 7 - (k >> 1), b - k, 1, 1, madE); }
    // armação de madeira clara embaixo do assento
    R(g, c - 8, b - 7, 16, 1, mad); R(g, c - 8, b - 6, 16, 1, madE);
    // encosto arredondado: almofada inclinada, com costura
    R(g, c - 5, b - 22, 10, 1, cl);
    R(g, c - 6, b - 21, 12, 1, cl);
    R(g, c - 7, b - 20, 14, 9, shade(t, -0.06));
    R(g, c - 7, b - 20, 1, 9, shade(t, 0.05));
    R(g, c - 6, b - 16, 12, 1, shade(t, -0.14));
    R(g, c + 6, b - 20, 1, 9, es);
    // assento baixo e fofo
    R(g, c - 8, b - 12, 16, 5, t);
    R(g, c - 8, b - 12, 16, 1, cl);
    R(g, c - 7, b - 11, 14, 1, shade(t, 0.08));
    R(g, c - 8, b - 8, 16, 1, es);
    // braços de madeira clara
    R(g, c - 9, b - 14, 2, 8, mad); R(g, c - 9, b - 14, 2, 1, '#ecc492');
    R(g, c + 7, b - 14, 2, 8, madE); R(g, c + 7, b - 14, 2, 1, mad);
  }
  // poltrona arredondada de tecido texturizado (bouclê); variant 'salvia' = verde-acinzentada
  function poltronaCinza(g, e) {
    if (e.face != null) return poltronaRedonda(g, e);
    const { c, b } = chao(e), base = e.variant === 'salvia' ? '#8fa08f' : '#a3a4a1';
    const cl = shade(base, 0.16), esc = shade(base, -0.22), dentro = shade(base, -0.1);
    sombraChao(g, c, b, 18);
    const larg = [8, 12, 14, 15, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 15, 14, 12];
    larg.forEach((w, j) => { R(g, c - (w >> 1), b - 18 + j, w, 1, j < 2 ? cl : base); R(g, c + (w >> 1) - 1, b - 18 + j, 1, 1, esc); });
    R(g, c - 5, b - 14, 10, 4, dentro);               // a concha por dentro
    R(g, c - 6, b - 10, 12, 3, cl);                   // almofada do assento
    R(g, c - 6, b - 7, 12, 1, esc);
    R(g, c - 6, b - 1, 12, 1, esc);
    for (let i = 0; i < 22; i++) R(g, c - 7 + Math.floor(hash(i * 7 + 1) * 14), b - 17 + Math.floor(hash(i * 13 + 2) * 16), 1, 1, i % 2 ? cl : esc); // textura
  }
  // poltrona de madeira de encosto curvo com almofada laranja
  function poltronaMadeira(g, e) {
    if (e.face != null) return poltronaMadeira3d(g, e);
    const { c, b } = chao(e), mad = '#a9693a', cl = '#c4834e', esc = '#7c4a26', alm = '#d4763f';
    sombraChao(g, c, b, 16);
    R(g, c - 6, b - 6, 1, 6, esc); R(g, c + 5, b - 6, 1, 6, esc);
    R(g, c - 8, b - 16, 2, 11, mad); R(g, c + 6, b - 16, 2, 11, esc);
    R(g, c - 4, b - 20, 8, 1, cl);                    // o encosto curvo
    R(g, c - 6, b - 19, 12, 9, mad);
    R(g, c - 6, b - 19, 12, 1, cl);
    for (const y of [16, 13]) R(g, c - 6, b - y, 12, 1, esc); // ripas do encosto
    R(g, c - 6, b - 10, 12, 4, alm);
    R(g, c - 6, b - 10, 12, 1, '#e58a52');
    R(g, c - 7, b - 6, 14, 1, esc);
  }
  // perto da janela: cadeira de escritório branca (encosto de tela, braços, base de 5 rodinhas).
  // (o tipo continua 'banco-pedra', nos mesmos tiles, para os alunos continuarem sentando nela)
  // (sem face) a poltroninha da janela como era antes: bloco cinza arredondado (como uma pedra) com assento verde
  function bancoPedra(g, e) {
    if (e.face != null) return cadeiraEscritorio(g, e);
    const { c, b } = chao(e), base = '#c4c5c1', cl = '#d6d7d3', esc = '#9fa09c', vd = '#6f8a7b';
    R(g, c - 5, b - 22, 10, 1, cl);
    R(g, c - 6, b - 21, 12, 1, cl);
    R(g, c - 7, b - 20, 14, 13, base);
    R(g, c + 6, b - 20, 1, 13, esc);
    for (let i = 0; i < 10; i++) R(g, c - 6 + Math.floor(hash(i * 5 + 3) * 12), b - 19 + Math.floor(hash(i * 9 + 4) * 11), 1, 1, i % 2 ? cl : esc);
    R(g, c - 7, b - 7, 14, 6, vd);
    R(g, c - 7, b - 7, 14, 1, '#86a091');
    R(g, c + 6, b - 7, 1, 6, '#56705f');
    R(g, c - 6, b - 1, 12, 1, '#56705f');
  }
  function puff(g, e) {
    // pufe cilíndrico azul-acinzentado (variant 'cinza': cinza, 'verde': verde-sálvia das cadeiras
    // do corredor), em 3/4 como os outros assentos
    const { c, b } = chao(e), base = e.variant === 'verde' ? COR.verde : e.variant === 'cinza' ? '#a9adb0' : '#9fb2c1';
    sombra3d(g, c, b, 'S', 0, 6.5);
    pecas3d(g, c, b, 'S', 0, [
      { p: roda(5.6, 16), z0: 0, z1: 10.5, cor: base, lado: -0.26, tex: (x, y, cr) => (y % 5 === 0 ? shade(cr, -0.07) : boucle(x, y, cr)) },
      { p: roda(4.6, 14), z0: 10.5, z1: 11.2, cor: shade(base, 0.12), topo: shade(base, 0.16), ordem: 50 }, // a borda de cima, fofa
      { p: roda(0.9, 6), z0: 11.2, z1: 11.4, cor: shade(base, -0.25), topo: shade(base, -0.25), ordem: 70 }, // botão do capitonê
    ]);
  }
  // cadeira do corredor e das salas: rot 0 = de frente para a câmera, rot 1 = de costas
  function cadeira(g, e) {
    if (e.face != null) return cadeiraConcha(g, e); // (sem face: as salas 1 e 2, como antes)
    // cadeira de concha (plástico) com pernas finas de metal
    const { c, b } = chao(e), cor = e.color || COR.verde, esc = shade(cor, -0.28), cl = shade(cor, 0.16), metal = '#8c9196';
    sombraChao(g, c, b, 12);
    R(g, c - 5, b - 7, 1, 7, metal); R(g, c + 4, b - 7, 1, 7, shade(metal, -0.2));
    R(g, c - 3, b - 7, 1, 6, shade(metal, -0.3)); R(g, c + 2, b - 7, 1, 6, shade(metal, -0.3));
    if ((e.rot | 0) === 1) {
      // de costas: a concha inteira, arredondada em cima
      R(g, c - 3, b - 18, 6, 1, cl);
      R(g, c - 4, b - 17, 8, 1, cl);
      R(g, c - 5, b - 16, 10, 7, cor);
      R(g, c + 4, b - 16, 1, 7, esc);
      R(g, c - 4, b - 9, 8, 1, esc);
      R(g, c - 5, b - 8, 10, 1, shade(cor, -0.12));
    } else {
      // de frente: o encosto curvo (mais escuro por dentro) e o assento
      R(g, c - 3, b - 18, 6, 1, cl);
      R(g, c - 4, b - 17, 8, 1, shade(cor, -0.04));
      R(g, c - 5, b - 16, 10, 6, shade(cor, -0.06));
      R(g, c - 4, b - 15, 8, 4, shade(cor, -0.15));
      R(g, c - 5, b - 9, 10, 2, cor);
      R(g, c - 5, b - 9, 10, 1, cl);
      R(g, c - 4, b - 7, 8, 1, esc);
    }
  }
  // violão encostado na parede (parede-verde.jpg)
  function violao(g, e) {
    const vib = e.shake > 0 ? Math.round(Math.sin(e.shake * 48) * 1.3) : 0;
    const { c: c0, b } = chao(e), c = c0 + vib, mad = '#c98a4a', esc = '#8f5a2c';
    if (e.hidden) {
      R(g, c - 3, b - 1, 6, 1, '#1e2024');
      R(g, c, b - 10, 1, 9, '#2b2e34');
      return;
    }
    R(g, c, b - 30, 2, 3, '#3a2616');
    R(g, c, b - 27, 2, 14, '#5a3a22');
    R(g, c - 3, b - 13, 8, 4, mad); R(g, c - 2, b - 14, 6, 1, mad);
    R(g, c - 4, b - 9, 10, 7, mad); R(g, c - 3, b - 2, 8, 1, esc);
    R(g, c + 5, b - 9, 1, 7, esc);
    R(g, c, b - 8, 2, 2, '#2a1a10');
    R(g, c - 1, b - 5, 4, 1, '#3a2616');
  }
  function sofa(g, e) {
    const { c, b } = chao(e), base = COR.creme, cl = '#e8dcc0', esc = '#b3a27f', fundo = '#9c8b6a';
    R(g, c - 21, b - 2, 2, 2, '#5a4430'); R(g, c + 19, b - 2, 2, 2, '#5a4430');
    R(g, c - 23, b - 6, 46, 4, fundo);
    R(g, c - 21, b - 17, 42, 8, shade(base, -0.05));
    R(g, c - 21, b - 17, 42, 1, cl);
    R(g, c - 21, b - 10, 42, 1, esc);
    for (let i = 0; i < 3; i++) {
      const x = c - 21 + i * 14;
      R(g, x, b - 9, 14, 4, base);
      R(g, x, b - 9, 14, 1, cl);
      R(g, x + 13, b - 16, 1, 11, esc);
    }
    R(g, c - 23, b - 14, 3, 11, base); R(g, c - 23, b - 14, 3, 1, cl);
    R(g, c + 20, b - 14, 3, 11, esc); R(g, c + 20, b - 14, 3, 1, base);
  }
  // planta alta em vaso de concreto: 'arvore' (folhagem redonda) ou 'folhas' (folhas compridas, tipo estrelícia)
  const VERDES = ['#2c5f45', '#3c8059', '#58a578', '#4b8f63'];
  function plantaAlta(g, e) {
    const { c, b } = chao(e), vaso = '#8c8e8d';
    if (e.variant === 'folhas') {
      for (let f = 0; f < 7; f++) {
        const ang = -Math.PI / 2 + (f - 3) * 0.32 + (hash(f * 3 + 1) - 0.5) * 0.2, len = 18 + Math.floor(hash(f * 7 + 2) * 12);
        for (let s = 4; s < len; s++) {
          const x = Math.round(c + Math.cos(ang) * s), y = Math.round(b - 11 + Math.sin(ang) * s);
          const w = s > len * 0.45 ? 3 : 1;
          R(g, x - (w >> 1), y, w, 1, VERDES[(f + (s > len * 0.7 ? 2 : 1)) % 4]);
        }
      }
    } else {
      R(g, c, b - 24, 1, 13, '#6b4a2e');
      // copa mais cheia, com luz em cima à esquerda e sombra embaixo à direita
      for (let k = 0; k < 150; k++) {
        const a = hash(k * 31 + 5) * Math.PI * 2, r = Math.sqrt(hash(k * 17 + 9));
        const x = Math.round(c + Math.cos(a) * r * 9), y = Math.round(b - 29 + Math.sin(a) * r * 11);
        const luz = -Math.cos(a) * 0.5 - Math.sin(a) * 0.8;
        R(g, x, y, 2, 1, VERDES[luz * r > 0.35 ? 2 : luz * r > -0.1 ? 3 : r > 0.6 ? 0 : 1]);
      }
    }
    R(g, c - 4, b - 11, 9, 1, '#a3a5a4');
    R(g, c - 4, b - 10, 9, 4, vaso);
    R(g, c - 3, b - 6, 7, 6, vaso);
    R(g, c + 3, b - 10, 1, 10, '#6c6e6d');
    R(g, c - 3, b - 1, 7, 1, '#6c6e6d');
  }
  // lustre de vidro âmbar com lâmpada amarela (saguão e entrada)
  function pendente(g, e) {
    const c = e.px + 8, z = { a: 30, b: 26, c: 34 }[e.variant] || 30;
    const topo = linha(e, 48), boca = linha(e, z + 5);
    R(g, c, topo, 1, boca - topo, '#2a2622');
    R(g, c - 1, boca, 3, 1, '#b8913f');
    // vidro âmbar: claro em cima, lado da sombra mais escuro, um reflexo e a lâmpada acesa por dentro
    const larg = [2, 4, 6, 6, 6, 6, 4, 2];
    larg.forEach((w, i) => {
      const x = c + 1 - (w >> 1), y = boca + 1 + i;
      R(g, x, y, w, 1, i < 2 ? '#eaa64a' : '#d98f33');
      if (w > 2) { R(g, x + w - 1, y, 1, 1, '#b8742a'); R(g, x, y, 1, 1, '#f3bd66'); }
    });
    R(g, c - 1, boca + 3, 3, 4, '#ffcf73');
    R(g, c, boca + 4, 1, 2, '#fff3c4');
    R(g, c - 1, boca + 8, 3, 1, 'rgba(255,214,140,0.55)'); // a luz saindo por baixo
  }
  // globos brancos leitosos empilhados num fio (corredor): 3 a 5 globos, em alturas diferentes por fio
  function globos(g, e) {
    const n = 3 + (Math.round(e.tx * 2) % 3), alto = 46 + (Math.round(e.tx * 2) % 2) * 4, bolas = [];
    for (let k = 0; k < n; k++) bolas.push([alto - k * 6, k % 2 ? 3 : 2]);
    const c = e.px + 8;
    const topo = linha(e, 58), fim = linha(e, bolas[bolas.length - 1][0]);
    R(g, c - 2, topo, 5, 1, '#1a1a1a');
    R(g, c, topo, 1, fim - topo, '#1a1a1a');
    for (const [z, r] of bolas) {
      const cy = linha(e, z);
      // halo: a luz leitosa em volta do globo (2 anéis bem fracos)
      for (const [h, a] of [[r + 3, 0.1], [r + 1.5, 0.16]]) for (let dy = -Math.ceil(h); dy <= h; dy++) for (let dx = -Math.ceil(h); dx <= h; dx++) {
        if (dx * dx + dy * dy <= h * h) R(g, c + dx, cy + dy, 1, 1, 'rgba(255,244,222,' + a + ')');
      }
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const d = dx * dx + dy * dy;
        if (d > r * r + r * 0.8) continue;
        R(g, c + dx, cy + dy, 1, 1, d > r * r - r ? '#cfc8b8' : dx + dy < 0 ? '#fffdf6' : '#ebe5d6');
      }
    }
  }
  // tapete redondo, no chão (desenhado uma vez e guardado: são muitos pixels)
  const TAPETES = {};
  function tapete(g, e) {
    const W = e.tw * T, H = e.th * T, k = W + 'x' + H;
    if (!TAPETES[k]) {
      const cv = DL.mk(W, H), tg = cv.getContext('2d'), rx = W / 2 - 1, ry = H / 2 - 1;
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
        const dx = (i + 0.5 - W / 2) / rx, dy = (j + 0.5 - H / 2) / ry, a = Math.atan2(dy, dx);
        // formato orgânico (oval irregular), sem passar do retângulo do tapete
        const d = Math.hypot(dx, dy) / (0.87 + 0.07 * Math.sin(a * 2 + 0.6) + 0.04 * Math.sin(a * 3 + 2.1) - 0.02 * Math.cos(a * 5));
        if (d > 1) continue;
        const pelo = hash(i * 31 + j * 17);
        R(tg, i, j, 1, 1, d > 0.94 ? '#cfc2a8' : d > 0.9 ? '#ddd1ba' : pelo > 0.9 ? '#e2d8c4' : pelo < 0.06 ? '#f4eee2' : '#ebe3d2');
      }
      TAPETES[k] = cv;
    }
    g.drawImage(TAPETES[k], e.px, e.py);
  }

  // luz quente no chão, embaixo dos lustres dos lounges (uma mancha oval suave, somada ao piso)
  function luzChao(g, e) {
    const W = e.tw * T, H = e.th * T, cx = e.px + W / 2, cy = e.py + H / 2, r = Math.min(W, H) / 2, f = e.forca || 0.16;
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.translate(cx, cy); g.scale(W >= H ? W / H : 1, W >= H ? 1 : H / W);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
    gr.addColorStop(0, 'rgba(255,190,110,' + f + ')');
    gr.addColorStop(0.55, 'rgba(255,170,90,' + (f * 0.45).toFixed(3) + ')');
    gr.addColorStop(1, 'rgba(255,160,80,0)');
    g.fillStyle = gr;
    g.fillRect(-r, -r, 2 * r, 2 * r);
    g.restore();
  }

  /* ---------- na parede ---------- */
  // parede de ripas de madeira com o logo "Faculdade Serra Dourada" (logo-saguao.jpg)
  function logo(g, e) {
    const x0 = e.px, W = e.tw * T, top = e.py - 36;
    for (let i = 0; i < W; i++) R(g, x0 + i, top, 1, 44, COR.ripa[i % 3 === 2 ? 2 : i % 3]);
    R(g, x0, top, W, 1, '#c97a4e');
    R(g, x0, e.py + 7, W, 1, '#4a2412');
    // escudo branco com uma folha
    const lx = x0 + 2, ly = e.py - 22, bco = '#f4efe6';
    [9, 9, 9, 9, 9, 7, 7, 5, 3, 1].forEach((w, j) => R(g, lx + (9 - w) / 2, ly + j, w, 1, bco));
    [[4, 1], [3, 2], [5, 2], [2, 3], [6, 3], [2, 4], [6, 4], [3, 5], [5, 5], [4, 6]].forEach(([i, j]) => R(g, lx + i, ly + j, 1, 1, COR.ripa[1]));
    R(g, lx + 4, ly + 2, 1, 6, COR.ripa[1]);
    texto(g, 'FACULDADE', x0 + 12, ly, bco);
    texto(g, 'SERRA', x0 + 12, ly + 7, bco);
    texto(g, 'DOURADA', x0 + 12, ly + 13, bco);
  }
  // placa azul ao lado da porta: "SALA n"
  function placa(g, e) {
    const x0 = e.px - 1, y0 = e.py - 22;
    R(g, x0, y0, 18, 13, shade(COR.placa, -0.25));
    R(g, x0 + 1, y0 + 1, 16, 11, COR.placa);
    R(g, x0 + 1, y0 + 1, 16, 1, shade(COR.placa, 0.25));
    texto(g, 'SALA', x0 + 2, y0 + 2, '#f4f7f8');
    texto(g, e.variant || '', x0 + 7, y0 + 7, '#e8c15a');
  }
  function arCondicionado(g, e) {
    // ar-condicionado split: corpo branco arredondado, aletas, luz verde e a sombra na parede
    const x0 = e.px + 2, y0 = e.py - 33;
    R(g, x0 + 1, y0 + 9, 28, 1, 'rgba(0,0,0,0.12)');
    R(g, x0 + 1, y0, 26, 1, '#ffffff');
    R(g, x0, y0 + 1, 28, 7, '#eef0f2');
    R(g, x0, y0 + 1, 28, 1, '#f9fafb');
    R(g, x0 + 27, y0 + 1, 1, 7, '#c9ced5');
    R(g, x0 + 2, y0 + 3, 18, 1, '#dde1e6');
    R(g, x0 + 1, y0 + 6, 26, 1, '#7d8590');                        // a saída de ar
    for (let i = 3; i < 26; i += 4) R(g, x0 + i, y0 + 7, 2, 1, '#9aa3b0'); // aletas
    R(g, x0, y0 + 8, 28, 1, '#b8bec7');
    R(g, x0 + 23, y0 + 3, 2, 1, '#7ee0a1');
  }
  function extintor(g, e) {
    // placa vermelha de sinalização em cima; extintor vermelho com bico, mangueira preta e etiqueta
    const x0 = e.px + 6;
    R(g, x0 - 1, e.py - 22, 6, 8, '#d23a32'); R(g, x0 - 1, e.py - 22, 6, 1, '#ee6a5e');
    R(g, x0 + 1, e.py - 20, 2, 4, '#ffffff');
    R(g, x0, e.py - 11, 4, 2, '#2a2a2a'); R(g, x0 + 1, e.py - 12, 3, 1, '#4a4a4a'); // gatilho
    R(g, x0 + 1, e.py - 1, 3, 1, 'rgba(0,0,0,0.18)');
    R(g, x0, e.py - 9, 4, 10, '#d23a32');
    R(g, x0, e.py - 9, 1, 10, '#ee6a5e');
    R(g, x0 + 3, e.py - 9, 1, 10, '#a82a24');
    R(g, x0, e.py - 5, 4, 2, '#f2e6c8');                            // etiqueta
    R(g, x0 + 4, e.py - 10, 1, 7, '#1a1a1a');                        // mangueira
  }
  // espelhos de interruptor e tomada brancos, na altura da mão (foto 4, ao lado do quadro de avisos)
  function interruptor(g, e) {
    const x0 = e.px + 4;
    for (const [dx, dy] of [[0, -16], [5, -16], [0, -5]]) {
      R(g, x0 + dx + 1, e.py + dy + 1, 4, 5, 'rgba(0,0,0,0.08)');
      R(g, x0 + dx, e.py + dy, 4, 5, '#f7f7f4');
      R(g, x0 + dx, e.py + dy + 4, 4, 1, '#d6d4ce');
      R(g, x0 + dx + 1, e.py + dy + 1, 2, dy < -10 ? 3 : 1, '#e4e2dc');
      if (dy > -10) { R(g, x0 + dx + 1, e.py + dy + 2, 1, 1, '#6b6e72'); R(g, x0 + dx + 2, e.py + dy + 2, 1, 1, '#6b6e72'); }
    }
  }
  // caixa de hidrante: porta vermelha com visor de vidro e a mangueira enrolada dentro
  function hidrante(g, e) {
    const x0 = e.px + 3, y0 = e.py - 20, W = 11, H = 15;
    R(g, x0 + 1, y0 + 1, W, H, 'rgba(0,0,0,0.12)');
    R(g, x0, y0, W, H, '#c8322b');
    R(g, x0, y0, W, 1, '#e8635a'); R(g, x0, y0, 1, H, '#e05048');
    R(g, x0 + W - 1, y0, 1, H, '#93241f'); R(g, x0, y0 + H - 1, W, 1, '#93241f');
    R(g, x0 + 2, y0 + 2, W - 4, 8, '#e9eef0');                                    // visor
    R(g, x0 + 3, y0 + 3, W - 6, 6, '#c03a2c'); R(g, x0 + 4, y0 + 4, W - 8, 4, '#e9eef0'); R(g, x0 + 5, y0 + 5, W - 10, 2, '#c03a2c'); // mangueira enrolada
    R(g, x0 + 2, y0 + 2, 1, 4, 'rgba(255,255,255,0.7)');                           // reflexo
    texto(g, 'H', x0 + 4, y0 + H - 5, '#ffffff');
  }
  function quadro(g, e) {
    const x0 = e.px + 2, W = e.tw * T - 4, y0 = e.py - 24;
    R(g, x0, y0, W, 18, '#9aa3b0');
    R(g, x0 + 1, y0 + 1, W - 2, 16, '#f2f3f4');
    for (let k = 0; k < 4; k++) R(g, x0 + 4, y0 + 4 + k * 3, 6 + Math.floor(hash(e.tx * 7 + k) * (W - 14)), 1, k ? '#3a6ea5' : '#c4553c');
    R(g, x0 + 2, y0 + 18, W - 4, 1, '#7d8590');
  }
  // quadro preto bem largo no corredor da Sala 2, com assinaturas, nomes e desenhos com giz
  function quadroGiz(g, e) {
    const x0 = e.px + 2, W = e.tw * T - 4, y0 = e.py - 35, H = 31;
    R(g, x0 + 1, y0 + 1, W, H, 'rgba(0,0,0,0.12)');
    R(g, x0, y0, W, H, '#7a5434');                              // moldura de madeira
    R(g, x0, y0, W, 1, '#9b7049');
    R(g, x0 + 1, y0 + 1, W - 2, H - 2, '#1d2221');              // lousa preta fosca
    // poeira leve de giz apagado
    for (let i = 0; i < 28; i++) {
      const dx = 3 + Math.floor(hash(i * 19 + 3) * (W - 10));
      const dy = 3 + Math.floor(hash(i * 29 + 7) * (H - 8));
      R(g, x0 + dx, y0 + dy, 5, 2, 'rgba(235,240,238,0.06)');
    }
    const giz = ['#eef2ef', '#f2e59a', '#9fd3e8', '#e8a8b8', '#a8e0b8'];
    // assinaturas e nomes curtos em giz espalhados por toda a lousa
    const assinaturas = [
      [5, 5, 12, 0], [21, 6, 13, 1], [38, 5, 11, 2], [54, 6, 14, 3], [72, 5, 12, 4], [89, 6, 13, 0],
      [7, 13, 13, 2], [25, 12, 11, 0], [42, 13, 12, 4], [60, 12, 11, 1], [77, 13, 13, 3], [92, 12, 10, 2],
      [6, 20, 12, 3], [23, 21, 14, 1], [44, 20, 12, 2], [62, 21, 11, 0], [78, 20, 13, 4], [93, 21, 9, 1],
      [12, 26, 13, 0], [31, 26, 12, 4], [49, 26, 14, 3], [69, 26, 12, 1], [86, 26, 13, 2],
    ];
    for (const [ax, ay, len, c] of assinaturas) {
      if (ax + len >= W - 2) continue;
      const cor = giz[c];
      for (let i = 0; i < len; i++) {
        const py = y0 + ay + ((i % 3 === 1) ? -1 : 0);
        if (i % 4 !== 3) R(g, x0 + ax + i, py, 1, 1, cor);
      }
      R(g, x0 + ax + 1, y0 + ay + 1, len - 2, 1, 'rgba(238,242,239,0.35)');
    }
    // desenhos em giz: coração, estrela, florzinha, carinha e sol
    [[21, 15], [23, 15], [20, 16], [22, 16], [24, 16], [21, 17], [23, 17], [22, 18]].forEach(([dx, dy]) => R(g, x0 + dx, y0 + dy, 1, 1, giz[3])); // coração
    [[57, 15], [56, 16], [57, 16], [58, 16], [55, 17], [57, 17], [59, 17], [56, 18], [58, 18]].forEach(([dx, dy]) => R(g, x0 + dx, y0 + dy, 1, 1, giz[1])); // estrela
    [[8, 16], [8, 18], [7, 17], [9, 17]].forEach(([dx, dy]) => R(g, x0 + dx, y0 + dy, 1, 1, giz[2])); // flor
    R(g, x0 + 8, y0 + 17, 1, 1, giz[1]);
    [[74, 15], [76, 15], [74, 17], [75, 17], [76, 17]].forEach(([dx, dy]) => R(g, x0 + dx, y0 + dy, 1, 1, giz[4])); // carinha
    [[96, 15], [95, 16], [96, 16], [97, 16], [96, 17], [94, 15], [98, 15], [94, 17], [98, 17]].forEach(([dx, dy]) => R(g, x0 + dx, y0 + dy, 1, 1, giz[1])); // sol
    // aparador de giz embaixo, com pedacinhos de giz coloridos
    R(g, x0 + 1, y0 + H, W - 2, 2, '#624227');
    R(g, x0 + 10, y0 + H - 1, 4, 1, giz[0]);
    R(g, x0 + 22, y0 + H - 1, 3, 1, giz[1]);
    R(g, x0 + 58, y0 + H - 1, 3, 1, giz[3]);
    R(g, x0 + 84, y0 + H - 1, 4, 1, giz[2]);
    // desenho feito pelo jogador no quadro interativo (miniatura em tempo real)
    if (quadroUserCanvas) {
      g.save();
      g.globalAlpha = 0.92;
      g.drawImage(quadroUserCanvas, x0 + 2, y0 + 2, W - 4, H - 4);
      g.restore();
    }
  }

  // parede verde-acinzentada com a frase e os veios de madeira em linhas brancas (parede-verde.jpg)
  function paredeVerde(g, e) {
    const x0 = e.px, W = e.tw * T, top = e.py - 36, verde = '#7d958d';
    R(g, x0, top, W, 44, verde);
    R(g, x0, top, W, 1, shade(verde, 0.25));
    R(g, x0, e.py + 4, W, 4, shade(verde, -0.2)); // rodapé
    const frase = [['ESTUDAR', 'AQUI'], ['E DAR', 'UM PASSO'], ['A MAIS', 'RUMO AOS'], ['SEUS SONHOS!', '']];
    frase.forEach(([forte, leve], k) => {
      const y = e.py - 28 + k * 6;
      // letras escuras (quase pretas) na parede verde: antes eram branco-esverdeadas e sumiam no verde
      texto(g, forte, x0 + 4, y, '#14181b');
      if (leve) texto(g, leve, x0 + 4 + largura(forte) + 4, y, '#2a2f34');
    });
    // veios: anéis ovais em painéis estreitos, como um tronco cortado
    const gx = x0 + 66, gw = W - 70, cl = '#e8eee9';
    for (let p = 0; p < 4; p++) {
      const px0 = gx + p * Math.floor(gw / 4), pw = Math.floor(gw / 4) - 1, cx = px0 + pw / 2, cy = e.py - 18 + (hash(p * 7 + 3) - 0.5) * 10;
      R(g, px0 + pw, e.py - 32, 1, 28, cl);
      for (let r = 3; r < 20; r += 3) for (let a = 0; a < 64; a++) {
        const t = (a / 64) * Math.PI * 2, x = Math.round(cx + Math.cos(t) * r * 0.32), y = Math.round(cy + Math.sin(t) * r);
        if (x >= px0 && x < px0 + pw && y >= e.py - 32 && y < e.py - 4) R(g, x, y, 1, 1, cl);
      }
    }
  }
  // quadro de avisos de acrílico (mais organizado): moldura de alumínio, faixa de título e os papéis
  // alinhados em 2 fileiras do mesmo tamanho, cada um com um alfinete e linhas de texto
  function avisos(g, e) {
    const x0 = e.px + 3, W = e.tw * T - 6, top = e.py - 28, H = 22;
    R(g, x0 + 1, top + 1, W, H, 'rgba(0,0,0,0.10)');            // sombra na parede
    R(g, x0, top, W, H, '#9aa3ab');                              // moldura
    R(g, x0 + 1, top + 1, W - 2, H - 2, '#eef2f4');              // fundo claro
    R(g, x0 + 1, top + 1, W - 2, 6, '#1f7f96');                  // faixa de título
    texto(g, 'AVISOS', x0 + ((W - largura('AVISOS')) >> 1), top + 1, '#f4f7f8');
    R(g, x0, top, W, 1, '#c8ced4');
    const cores = ['#f4f6f7', '#e8c15a', '#f4f6f7', '#7ec29a', '#e8a0b0', '#f4f6f7'];
    const n = Math.max(2, Math.floor((W - 4) / 7)), pw = 5, gap = Math.floor((W - 4 - n * pw) / (n - 1));
    for (let fila = 0; fila < 2; fila++) for (let k = 0; k < n; k++) {
      const x = x0 + 2 + k * (pw + gap), y = top + 8 + fila * 7, cor = cores[(k + fila * 2 + Math.round(e.tx)) % cores.length];
      R(g, x, y, pw, 6, cor);
      R(g, x + pw, y + 1, 1, 5, 'rgba(0,0,0,0.12)');             // sombrinha do papel
      R(g, x + 1, y + 2, pw - 2, 1, shade(cor, -0.35)); R(g, x + 1, y + 4, pw - 3, 1, shade(cor, -0.35)); // linhas de texto
      R(g, x + (pw >> 1), y, 1, 1, '#c4553c');                   // alfinete
    }
    R(g, x0 + W - 3, top + 8, 1, 6, 'rgba(255,255,255,0.6)');    // reflexo no acrílico
  }

  /* ---------- notebook (sala do fundo) ---------- */
  // em cima de uma mesa (host): a linha e.py − 1 é o tampo
  function notebook(g, e) {
    const c = e.px + 8, r = e.py - 1;
    R(g, c - 5, r - 1, 10, 1, '#5d6573');
    R(g, c - 5, r, 10, 1, '#2a2e35');
    R(g, c - 4, r - 8, 8, 7, '#1a1d22');
    R(g, c - 3, r - 7, 6, 5, '#2f5f95');
    R(g, c - 2, r - 6, 3, 1, '#a0c3ec');
    R(g, c - 2, r - 4, 4, 1, '#7ee0a1');
  }

  const ARTE = {
    'poltrona-vermelha': poltronaVermelha, 'poltrona-cinza': poltronaCinza, 'poltrona-madeira': poltronaMadeira,
    'banco-pedra': bancoPedra, puff, cadeira, violao, sofa,
    'planta-alta': plantaAlta, pendente, globos, tapete, 'luz-chao': luzChao,
    logo, placa, 'ar-parede': arCondicionado, extintor, interruptor, hidrante, quadro, 'quadro-giz': quadroGiz, 'parede-verde': paredeVerde, avisos,
    notebook,
  };
  // o motor desenha os tipos dele; os da faculdade vêm daqui
  const desenhoDoMotor = DL.drawItem;
  DL.drawItem = function (g, e, t) {
    const f = ARTE[e.kind];
    if (f) return f(g, e, t);
    return desenhoDoMotor(g, e, t);
  };

  /* ------------------------------------------------------------------ */
  /* Portas (desenhadas em 3D com o kit do iso.js)                        */
  /* ------------------------------------------------------------------ */
  const IX = (x, y) => x - y, IY = (x, y, z) => (x + y) / 2 - (z || 0);
  function caixaTela(x0, y0, x1, y1, z0, z1) {
    const ps = [[x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y1, z1]].map((p) => [IX(p[0], p[1]), IY(p[0], p[1], p[2])]);
    return { rect: [Math.min(...ps.map((p) => p[0])), Math.min(...ps.map((p) => p[1])), Math.max(...ps.map((p) => p[0])), Math.max(...ps.map((p) => p[1]))] };
  }
  // ---- salas de estudo (frente de vidro) e a sala branca: ver as fotos da entrada ----
  // As 3 salas de estudo do lado das mesas. Cada uma é uma abertura de vidro na parede, do piso quase até o trilho:
  // à esquerda o vidro com película colorida e a frase, à direita a porta de vidro com o puxador comprido. O lado de
  // dentro é pintado em perspectiva do jogo e recortado pela abertura. A imagem é feita uma vez (K px por px do mapa,
  // para a frase ficar legível) e depois só é colada na parede.
  const SALAS_ESTUDO = [
    { n: 3, x: 131, cor: '#34393c', clara: '#4a5155', frase: ['Você é', 'protagonista', 'da sua jornada.'] },
    { n: 2, x: 171, cor: '#152257', clara: '#22347c', frase: ['Arrisque-se, crie,', 'aprenda,', 'compartilhe', 'e inove!'] },
    { n: 1, x: 211, cor: '#8f5f12', clara: '#b98224', frase: ['O que', 'acontece aqui,', 'transforma', 'o seu futuro.'] },
  ];
  const SE_W = 37, SE_H = 36, SE_K = 4;
  function pintarSalaEstudo(o) {
    const cv = DL.mk(SE_W * SE_K, SE_H * SE_K), g = cv.getContext('2d'), W = SE_W, H = SE_H, D = 20;
    g.scale(SE_K, SE_K);
    // um ponto de dentro da sala (x para a direita, d = fundo, z = altura), visto pela abertura
    const P = (x, d, z) => [x + d, H - z - d];
    const pol = (pts, c) => { g.beginPath(); pts.forEach((q, i) => { const r = P(q[0], q[1], q[2]); if (i) g.lineTo(r[0], r[1]); else g.moveTo(r[0], r[1]); }); g.closePath(); g.fillStyle = c; g.fill(); };
    const cx = (x0, x1, d0, d1, z0, z1, c) => {
      pol([[x0, d0, z0], [x1, d0, z0], [x1, d0, z1], [x0, d0, z1]], c);
      pol([[x1, d0, z0], [x1, d1, z0], [x1, d1, z1], [x1, d0, z1]], shade(c, -0.22));
      pol([[x0, d0, z1], [x1, d0, z1], [x1, d1, z1], [x0, d1, z1]], shade(c, 0.16));
    };
    const disco = (x, d, z, r, c) => pol(Array.from({ length: 20 }, (_, i) => [x + r * Math.cos(i * 0.314), d + r * Math.sin(i * 0.314), z]), c);
    const cad = (x, d, c, costas) => { // cadeira verde: pernas, assento e encosto (costas: 'd' no fundo, 'f' na frente, 'e' esquerda)
      for (const [a, b] of [[-2, 2], [2, 2], [-2, -2], [2, -2]]) cx(x + a - 0.3, x + a + 0.3, d + b - 0.3, d + b + 0.3, 0, 6, '#5f7468');
      const enc = () => (costas === 'e' ? cx(x - 2.8, x - 2, d - 2.4, d + 2.4, 6.5, 14, c) : costas === 'd' ? cx(x - 2.5, x + 2.5, d + 2, d + 2.8, 6.5, 14, c) : cx(x - 2.5, x + 2.5, d - 2.8, d - 2, 6.5, 14, c));
      if (costas !== 'f') enc();
      cx(x - 2.5, x + 2.5, d - 2.5, d + 2.5, 6, 7.2, c);
      if (costas === 'f') enc();
    };
    g.fillStyle = '#1b1c1e'; g.fillRect(0, 0, W, H);
    pol([[-D, 0, 0], [W, 0, 0], [W, D, 0], [-D, D, 0]], '#a9794c');                              // piso
    for (let k = -20; k < W; k += 5) pol([[k, 0, 0], [k + 0.4, 0, 0], [k + 0.4, D, 0], [k, D, 0]], 'rgba(70,40,20,0.25)');
    pol([[-D, D, 0], [W, D, 0], [W, D, 60], [-D, D, 60]], '#d9d4ca');                             // parede do fundo
    pol([[0, 0, 0], [0, D, 0], [0, D, 60], [0, 0, 60]], '#c5bfb4');                               // parede da esquerda
    pol([[0, D, 0], [W, D, 0], [W, D, 1.5], [0, D, 1.5]], '#f4f1ea');
    const tx = 18, td = 10, verde = '#7f9688';
    cad(tx - 8, td, verde, 'e'); cad(tx + 1, td + 7, verde, 'd');
    disco(tx, td, 0.2, 3.4, '#8c8e8d'); cx(tx - 0.6, tx + 0.6, td - 0.6, td + 0.6, 0, 10, '#c3c7cb');
    disco(tx, td, 10, 6.4, '#bfc3c6'); disco(tx, td, 11, 6.4, '#f3f4f4');
    cad(tx + 7, td - 6.5, verde, 'f');
    // o vidro fumê por cima de tudo e a película colorida no pedaço da esquerda
    g.fillStyle = 'rgba(30,24,18,0.3)'; g.fillRect(0, 0, W, H);
    const F = 22;
    g.globalAlpha = 0.86; g.fillStyle = o.cor; g.fillRect(0, 0, F, H);
    g.globalAlpha = 0.5; g.fillStyle = o.cor; g.fillRect(F, 0, W - F, 9); g.globalAlpha = 1;
    // a textura de folhas, bem de leve
    g.strokeStyle = o.clara; g.lineWidth = 0.35; g.globalAlpha = 0.55;
    for (let k = 0; k < 26; k++) {
      const lx = hash(k * 7 + o.n) * (F - 5), ly = 11 + hash(k * 13 + o.n * 3) * (H - 13), a = hash(k * 5) * 1.6 - 0.8;
      g.beginPath(); g.ellipse(lx + 2.5, ly, 2.6, 1.1, a, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(lx + 2.5 - Math.cos(a) * 2.4, ly - Math.sin(a) * 2.4); g.lineTo(lx + 2.5 + Math.cos(a) * 2.4, ly + Math.sin(a) * 2.4); g.stroke();
    }
    g.globalAlpha = 1;
    // a faixa fosca com os escudinhos
    g.fillStyle = 'rgba(232,230,224,0.2)'; g.fillRect(0, 21, F, 3.6);
    g.fillStyle = 'rgba(238,236,230,0.5)'; g.fillRect(F, 21, W - F, 3.6);
    const escudo = (x, y, t, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(x, y); g.lineTo(x + t, y); g.lineTo(x + t, y + t * 0.6); g.lineTo(x + t / 2, y + t * 1.15); g.lineTo(x, y + t * 0.6); g.closePath(); g.fill(); };
    for (let x = 4; x < W; x += 9) escudo(x, 21.6, 2, 'rgba(245,243,238,0.55)');
    escudo(W - 6.5, 2.5, 3.4, 'rgba(245,243,238,0.5)');
    // a frase
    g.fillStyle = '#f3efe6'; g.textBaseline = 'top';
    let fs = 3.1;
    do { g.font = '600 ' + fs + 'px "Trebuchet MS", Verdana, sans-serif'; fs -= 0.1; } while (Math.max(...o.frase.map((l) => g.measureText(l).width)) > F - 3.4 && fs > 1.6);
    o.frase.forEach((l, k) => g.fillText(l, 1.6, 5.2 + k * 3.3));
    // a porta: emendas, ferragens, puxador comprido e reflexo
    g.fillStyle = 'rgba(16,16,18,0.75)'; g.fillRect(F, 2.5, 0.5, H); g.fillRect(F, 2.5, W - F, 0.5);
    g.fillStyle = '#c9ccd0'; g.fillRect(F - 1, 1.7, 2.6, 1.6); g.fillRect(W - 2.6, 1.7, 2.4, 1.6); g.fillRect(F - 0.8, 22, 2, 2);
    g.fillStyle = '#7d8288'; g.fillRect(F + 2.2, 16, 1.3, 12); g.fillStyle = '#eef0f2'; g.fillRect(F + 2.2, 16, 0.6, 12);
    g.fillStyle = '#9aa0a6'; g.fillRect(F + 1.4, 17.4, 0.9, 0.8); g.fillRect(F + 1.4, 25.6, 0.9, 0.8);
    g.fillStyle = 'rgba(255,255,255,0.1)';
    for (const [a, w] of [[6, 2.4], [11, 1], [29, 1.8]]) { g.beginPath(); g.moveTo(a, 0); g.lineTo(a + w, 0); g.lineTo(a + w - 6, H); g.lineTo(a - 6, H); g.closePath(); g.fill(); }
    // a placa azul, no vidro ao lado da porta
    g.fillStyle = shade(COR.placa, -0.25); g.fillRect(F - 5.4, 19.6, 4.6, 8.6); g.fillStyle = COR.placa; g.fillRect(F - 5.4, 19.6, 4.6, 8.2);
    g.fillStyle = '#e8b13a'; g.beginPath(); g.arc(F - 3.1, 22, 1.4, 0, Math.PI * 2); g.fill(); escudo(F - 3.7, 21.4, 1.2, '#ffffff');
    g.fillStyle = '#eaf4f6'; g.font = '700 2.2px "Trebuchet MS", Verdana, sans-serif'; g.textAlign = 'center'; g.fillText(String(o.n), F - 3.1, 24.4);
    g.fillStyle = '#2a2b2d'; g.fillRect(0, 0, W, 0.5); g.fillRect(0, 0, 0.5, H); g.fillRect(W - 0.5, 0, 0.5, H);
    return cv;
  }
  function desenharSalaEstudo(g, sc, e) {
    const o = e.estudo, y = e.py, x0 = e.isoRect[0];
    if (!o.img) o.img = pintarSalaEstudo(o);
    DL.isoKit.setMap(g, sc, [x0, y, SE_H + 1], [1 / SE_K, 0, 0], [0, 0, -1 / SE_K]);
    const liso = g.imageSmoothingEnabled;
    g.imageSmoothingEnabled = true;
    g.drawImage(o.img, 0, 0);
    g.imageSmoothingEnabled = liso;
    return caixaTela(x0, y, x0 + SE_W, y + 1, 0, SE_H + 1);
  }
  // plantinha baixa no canto (ao lado da porta da sala branca)
  function desenharPlantinha(g, sc, e) {
    const K = DL.isoKit, cx = e.px + 8, cy = e.py + 7;
    K.isoT(g, sc);
    K.poly(g, [[cx - 4, cy - 3, 0], [cx + 5, cy - 3, 0], [cx + 5, cy + 5, 0], [cx - 4, cy + 5, 0]], 'rgba(48,26,12,0.16)', false);
    K.box(g, cx - 2.5, cy - 2.5, cx + 2.5, cy + 2.5, 0, 5, { s: '#4a4d50', e: '#34373a', t: '#2b211a' });
    for (let k = 0; k < 14; k++) {
      const a = k * 2.4, r = 2.5 + (k % 4) * 1.1, z = 9 + (k * 5) % 7;
      K.line(g, [cx, cy, 5], [cx + Math.cos(a) * r, cy + Math.sin(a) * r, z], ['#3f7a4c', '#7d9a3c', '#2f6a4a', '#a8a34a'][k % 4], 1.4);
    }
    return caixaTela(cx - 5, cy - 5, cx + 5, cy + 5, 0, 17);
  }
  // a placa azul na pontinha de parede da frente da sala branca (face virada para o corredor)
  function desenharPlacaBranca(g, sc, e) {
    const K = DL.isoKit, X = e.isoRect[0], y = e.py + 5;
    K.isoT(g, sc);
    K.poly(g, [[X, y + 6, 16], [X, y, 16], [X, y, 25], [X, y + 6, 25]], COR.placa, false);
    K.poly(g, [[X, y + 4.2, 20.5], [X, y + 1.8, 20.5], [X, y + 1.8, 23], [X, y + 4.2, 23]], '#e8b13a', false);
    return caixaTela(X, y, X + 1, y + 6, 16, 25);
  }
  // parede do fundo da sala branca (foto): laranja (a cor vem do motor, ver ajustarFachada), com a janela escura de
  // riscos, o desenho branco de raízes à direita e os 2 canos. Pintado uma vez e colado na face da parede.
  let FUNDO_BRANCA = null;
  function desenharFundoBranca(g, sc, e) {
    const W = e.th * T, H = 36, k = 2;
    if (!FUNDO_BRANCA) {
      FUNDO_BRANCA = DL.mk(W * k, H * k);
      const c = FUNDO_BRANCA.getContext('2d');
      c.scale(k, k);
      // (c: x = 0 é a ponta esquerda de quem olha a parede; y = 0 é o alto)
      const onda = (x, y, f) => Math.sin(y * 0.33 + f) * 1.1 + Math.sin(y * 0.13 + f * 2.1) * 0.9;
      // raízes brancas: linhas verticais que se juntam
      c.strokeStyle = '#eceff2'; c.lineJoin = 'round';
      for (let i = 0; i < 7; i++) {
        const x = 104 + i * 4.7;
        c.lineWidth = 1.5 + (i % 3) * 0.35;
        c.beginPath();
        for (let y = 0; y <= H - 2; y += 1) { const X = x + onda(x, y, i * 1.9); if (y) c.lineTo(X, y); else c.moveTo(X, y); }
        c.stroke();
        for (const y of [4 + hash(i * 3) * 8, 17 + hash(i * 5 + 2) * 8, 27 + hash(i * 7) * 6]) if (i < 6) {
          c.lineWidth = 1.3; c.beginPath(); c.moveTo(x + onda(x, y, i * 1.9), y); c.lineTo(x + 4.7 + onda(x, y + 2.5, (i + 1) * 1.9), y + 2.5); c.stroke();
        }
      }
      // janela: moldura prata, vidro escuro com riscos horizontais e peitoril escuro
      const x0 = 30, y0 = 5, w = 70, h = 18;
      c.fillStyle = 'rgba(80,36,6,0.3)'; c.fillRect(x0 + 1, y0 - 1, w, 1);
      c.fillStyle = '#c3c9cd'; c.fillRect(x0, y0, w, h);
      c.fillStyle = '#23272a'; c.fillRect(x0 + 1, y0 + 1, w - 2, h - 2);
      c.strokeStyle = '#555c61'; c.lineWidth = 0.55;
      for (let j = 0; j < 9; j++) { c.beginPath(); for (let x = x0 + 1.5; x < x0 + w - 1.5; x += 1) { const Y = y0 + 2 + j * 1.8 + Math.sin(x * 0.4 + j * 1.7) * 0.5; if (x > x0 + 2) c.lineTo(x, Y); else c.moveTo(x, Y); } c.stroke(); }
      c.fillStyle = 'rgba(200,210,216,0.5)'; c.fillRect(x0 + w / 2, y0 + 1, 0.5, h - 2);
      c.fillStyle = 'rgba(255,210,140,0.85)'; c.fillRect(x0 + w - 7, y0 + 11, 1.5, 4.5);          // os globos do corredor refletidos
      c.fillStyle = 'rgba(255,255,255,0.12)'; c.beginPath(); c.moveTo(x0 + 12, y0 + 1); c.lineTo(x0 + 20, y0 + 1); c.lineTo(x0 + 12, y0 + h - 1); c.lineTo(x0 + 4, y0 + h - 1); c.fill();
      c.fillStyle = '#2c2a29'; c.fillRect(x0 - 1, y0 + h, w + 2, 1.2);
      // canos
      for (const x of [9, W - 6]) { c.fillStyle = '#8f9599'; c.fillRect(x, 0, 1.6, H); c.fillStyle = '#c3c8cb'; c.fillRect(x, 0, 0.6, H); c.fillStyle = '#6d7378'; c.fillRect(x - 0.4, 18, 2.4, 1); }
    }
    DL.isoKit.setMap(g, sc, [e.px, e.py + W, H], [0, -1 / k, 0], [0, 0, -1 / k]);
    g.drawImage(FUNDO_BRANCA, 0, 0);
    return caixaTela(e.px, e.py, e.px + 1, e.py + W, 0, H);
  }
  // cabines de estudo da sala branca: tampo cinza-claro, divisórias altas e a prateleirinha embaixo.
  // e.divs = onde ficam as divisórias (em tiles, ao longo da bancada); e.para = 'v' (parede da esquerda) ou 'h'
  function desenharCabines(g, sc, e) {
    const K = DL.isoKit, v = e.para === 'v', Z = DL.isoSurfaceTop(e), x0 = e.px, y0 = e.py, x1 = e.px + e.tw * T, y1 = e.py + e.th * T;
    const cz = { s: '#b9babf', e: '#a5a6ab', t: '#e9eaec' }, tampo = { s: '#d3d4d8', e: '#c0c1c6', t: '#eff0f2' }, div = { s: '#c9cacf', e: '#b4b5bb', t: '#e4e5e8' };
    const F0 = 1, F1 = 14; // o fundo da cabine (da parede para fora)
    const bx = (a, b, f0, f1, z0, z1, c) => (v ? K.box(g, x0 + f0, a, x0 + f1, b, z0, z1, c) : e.sul ? K.box(g, a, y1 - f1, b, y1 - f0, z0, z1, c) : K.box(g, a, y0 + f0, b, y0 + f1, z0, z1, c));
    K.isoT(g, sc);
    const ini = (v ? y0 : x0) + 0.5, fim = (v ? y1 : x1) - 0.5, marcas = [ini].concat(e.divs.map((d) => d * T), [fim]);
    K.poly(g, [[x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0]], 'rgba(48,26,12,0.12)', false);
    marcas.forEach((m, k) => {
      // a divisória: do piso até acima do tampo, e o pedaço de bancada até a próxima
      bx(m - 0.7, m + 0.7, F0, F1, 0, Z, cz);
      bx(m - 0.7, m + 0.7, F0, F1 - 3, Z, Z + 9, div);
      const prox = marcas[k + 1];
      if (prox == null) return;
      bx(m + 0.7, prox - 0.7, F0, F0 + 5, 4, 4.8, cz);
      bx(m + 0.7, prox - 0.7, F0, F1, Z - 1.4, Z, tampo);
    });
    return caixaTela(x0, y0, x1, y1, 0, Z + 9);
  }
  // bebedouro de inox encostado na parede
  function desenharBebedouro(g, sc, e) {
    const K = DL.isoKit;
    const x0 = e.px + 2, x1 = e.px + 14, y0 = e.py + 1, y1 = e.py + 9;
    const inox = { s: '#c5cbd3', e: '#969da6', t: '#e4e8ee' };
    const escuro = { s: '#7d8590', e: '#5d646e', t: '#9aa2ad' };
    K.isoT(g, sc);
    // corpo inox encostado na parede
    K.box(g, x0, y0, x1, y1, 0, 17, inox);
    // base escura rente ao piso
    K.box(g, x0, y0, x1, y1, 0, 2, escuro);
    // cuba / aparador em cima
    K.box(g, x0 + 1, y0 + 1, x1 - 1, y1 - 1, 17, 18, escuro);
    // torneiras e botão azul na frente
    K.box(g, x0 + 3, y0 + 2, x0 + 5, y0 + 4, 18, 21, inox);
    K.box(g, x1 - 5, y0 + 2, x1 - 3, y0 + 4, 18, 22, inox);
    K.poly(g, [[x0 + 6, y1, 13], [x0 + 10, y1, 13], [x0 + 10, y1, 15], [x0 + 6, y1, 15]], '#4a9fd8');
    // detalhe de grade frontal inferior
    K.line(g, [x0 + 2, y1, 6], [x1 - 2, y1, 6], '#7d8590');
    K.line(g, [x0 + 2, y1, 8], [x1 - 2, y1, 8], '#7d8590');
    return caixaTela(x0, y0, x1, y1, 0, 22);
  }
  function desenharPorta(g, sc, e) {
    const K = DL.isoKit, front = !!e.front;
    const x0 = e.px, x1 = e.px + 16, y0 = front ? e.py : e.py + 12, y1 = y0 + 4, ym = y0 + 2;
    const Hd = 28, Hw = front ? 31 : 44;
    const par = { s: COR.parede, e: shade(COR.parede, -0.25), t: shade(COR.parede, 0.3) };
    const bat = { s: '#cfc8bb', e: '#a9a296', t: '#efe9df' };
    K.isoT(g, sc);
    if (!front) K.poly(g, [[x0 + 2, y0, 0], [x1 - 2, y0, 0], [x1 - 2, y0, Hd], [x0 + 2, y0, Hd]], '#17120e'); // sala escura atrás
    // a folha gira para dentro da sala (para o norte)
    const a = clamp(e.open || 0, 0, 1) * 1.35, A = [x0 + 2, ym], B = [A[0] + 12 * Math.cos(a), ym - 12 * Math.sin(a)];
    const at = (k) => [A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k];
    K.poly(g, [[A[0], A[1], 0], [B[0], B[1], 0], [B[0], B[1], Hd], [A[0], A[1], Hd]], a < 0.7 ? COR.porta : COR.portaEscura);
    for (const k of [0.33, 0.66]) { const p = at(k); K.line(g, [p[0], p[1], 1], [p[0], p[1], Hd - 1], 'rgba(90,40,15,0.35)'); }
    K.line(g, [A[0], A[1], Hd], [B[0], B[1], Hd], '#d98a52');
    const m = at(0.85);
    K.line(g, [m[0], m[1], 12], [m[0], m[1], 14], '#e3cf9a', 1);
    K.box(g, x0, y0, x0 + 2, y1, 0, Hw, bat);
    K.box(g, x1 - 2, y0, x1, y1, 0, Hw, bat);
    K.box(g, x0, y0, x1, y1, Hd, Hw, front ? bat : par);
    return caixaTela(x0, y0, x1, y1, 0, Hw);
  }
  // porta de madeira numa parede que corre no sentido y (os lados do corredor das salas).
  // lado 'o': na parede alta da esquerda (a porta fica pintada na face da parede, com a plaquinha azul);
  // lado 'l': na parede baixa da direita (batente em pé, como a porta de vidro da entrada).
  // e.open (0 a 1): quando um aluno entra ou sai, a folha gira para o lado do corredor e mostra o vão escuro.
  function desenharPortaLado(g, sc, e) {
    const K = DL.isoKit, Hd = 28, Hb = 31, ya = e.py, yb = e.py + T, cor = e.to || e.visor ? COR.porta : COR.portaEscura;
    const bat = { s: '#cfc8bb', e: '#a9a296', t: '#efe9df' };
    const ab = clamp(e.open || 0, 0, 1) * 1.35, sx = e.lado === 'o' ? 1 : -1;
    const folha = (X) => {
      if (ab > 0.02) K.poly(g, [[X, ya + 2, 0], [X, yb - 2, 0], [X, yb - 2, Hd], [X, ya + 2, Hd]], '#17120e'); // a sala lá dentro
      // dobradiça: no lado 'o' fica no fundo do vão; no lado 'l', na frente (assim a folha aberta nunca
      // é pintada por cima de quem está passando pela porta)
      const atras = e.lado === 'o' && !e.visor; // (a porta com visor, como na foto, abre para o outro lado)
      const sy = atras ? 1 : -1, y0 = atras ? ya + 2 : yb - 2;
      const A = [X, y0], B = [X + sx * 12 * Math.sin(ab), y0 + sy * 12 * Math.cos(ab)];
      const at = (k) => [A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k];
      K.poly(g, [[A[0], A[1], 0], [B[0], B[1], 0], [B[0], B[1], Hd], [A[0], A[1], Hd]], ab > 0.7 ? shade(cor, -0.18) : cor);
      const faixa = (k0, k1, z0, z1, c) => { const p = at(k0), q = at(k1); K.poly(g, [[p[0], p[1], z0], [q[0], q[1], z0], [q[0], q[1], z1], [p[0], p[1], z1]], c); };
      if (e.visor) {
        faixa(0.16, 0.42, 4, 23, '#7c3f1a'); faixa(0.2, 0.38, 5, 22, '#dfe7e4');  // visor de vidro fosco
        faixa(0.54, 0.86, 17, 25, COR.placa); faixa(0.64, 0.76, 21, 23, '#e8c15a'); // placa azul
      } else for (const k of [4 / 12, 8 / 12]) { const p = at(k); K.line(g, [p[0], p[1], 1], [p[0], p[1], Hd - 1], 'rgba(90,40,15,0.35)'); }
      K.line(g, [A[0], A[1], Hd], [B[0], B[1], Hd], '#d98a52');
      const m = at(e.visor ? 0.92 : 10 / 12);
      K.line(g, [m[0], m[1], 12], [m[0], m[1], 14], '#e3cf9a', 1);
    };
    K.isoT(g, sc);
    if (e.lado === 'o') {
      const X = e.px + T;
      K.poly(g, [[X, ya, 0], [X, yb, 0], [X, yb, Hb], [X, ya, Hb]], e.visor ? '#7c3f1a' : bat.e);
      folha(X);
      if (!e.visor) K.poly(g, [[X, yb + 3, 15], [X, yb + 9, 15], [X, yb + 9, 22], [X, yb + 3, 22]], COR.placa);
      return caixaTela(X, ya, X + 1, yb + 9, 0, Hb);
    }
    const x0 = e.px, x1 = e.px + 4;
    K.box(g, x0, ya, x1, ya + 2, 0, Hb, bat);
    folha(x0 + 2);
    K.box(g, x0, yb - 2, x1, yb, 0, Hb, bat);
    K.box(g, x0, ya, x1, yb, Hd, Hb, bat);
    return caixaTela(x0, ya, x1, yb, 0, Hb);
  }
  // porta de vidro de correr da entrada (entrada.jpg), com a placa verde de saída em cima.
  // axis 'v': a porta fica numa parede que corre no sentido y (a entrada, na ponta do corredor)
  // axis 'd': na vidraça em diagonal do canto (de (e.px, e.py + T) até 32 px para a direita e 32 para cima no
  // mapa), de frente para a câmera, como a porta da fachada de fora
  function desenharVidro(g, sc, e) {
    const K = DL.isoKit, v = e.axis === 'v', dg = e.axis === 'd', H = 30, Hf = 34, L = 32;
    const bx = e.px + (e.dx || 0); // (e.dx: a porta fica mais para dentro do tile, alinhada com a parede)
    const ponto = (u, z) => (dg ? [e.px + u, e.py + T - u, z] : v ? [bx + 2, e.py + u, z] : [e.px + u, e.py + 2, z]);
    const caixa = (u0, u1, z0, z1, c) => (dg ? (K.poly(g, [ponto(u0, z0), ponto(u1, z0), ponto(u1, z1), ponto(u0, z1)], c.s), K.line(g, ponto(u0, z1), ponto(u1, z1), c.t))
      : v ? K.box(g, bx, e.py + u0, bx + 4, e.py + u1, z0, z1, c) : K.box(g, e.px + u0, e.py, e.px + u1, e.py + 4, z0, z1, c));
    const alu = { s: '#9aa3b0', e: '#6d747d', t: '#c8ccd2' };
    const d = clamp(e.open || 0, 0, 1) * 13;
    K.isoT(g, sc);
    for (const [a, b, dentro] of [[2 - d, 16 - d, 14 - d], [16 + d, L - 2 + d, 18 + d]]) {
      K.poly(g, [ponto(a, 0), ponto(b, 0), ponto(b, H), ponto(a, H)], 'rgba(170,205,240,0.2)', false);
      K.line(g, ponto(a, 0), ponto(a, H), '#b9c0c9');
      K.line(g, ponto(b, 0), ponto(b, H), '#b9c0c9');
      K.line(g, ponto(a, 1), ponto(b, 1), '#8a929c');
      K.line(g, ponto(a + 3, H - 4), ponto(a + 7, H - 12), 'rgba(230,240,255,0.45)');
      K.line(g, ponto(dentro, 10), ponto(dentro, 19), '#d8dde3', 1);
    }
    caixa(0, 2, 0, Hf, alu);
    caixa(L - 2, L, 0, Hf, alu);
    caixa(0, L, H, Hf, alu);
    // como a porta de fora: caixilho prata com a travessa clara em cima e o montante duplo no meio
    K.line(g, ponto(2, H - 5), ponto(L - 2, H - 5), '#c8ced6');
    K.line(g, ponto(16 - d, 0), ponto(16 - d, H), '#c8ced6');
    K.line(g, ponto(16 + d, 0), ponto(16 + d, H), '#c8ced6');
    if (!e.semPlaca) caixa(12, 20, Hf + 1, Hf + 5, { s: '#2fa65e', e: '#1f7a44', t: '#46c47a' });
    if (dg) return caixaTela(e.px, e.py + T - L, e.px + L, e.py + T, 0, Hf + 5);
    return v ? caixaTela(bx, e.py, bx + 4, e.py + L, 0, Hf + 5) : caixaTela(e.px, e.py, e.px + L, e.py + 4, 0, Hf + 5);
  }
  // a borda baixa da parede da entrada (no lugar da que o motor desenharia), como as outras bordas
  function desenharBorda(g, sc, e) {
    // (fina e clara, como a soleira da vidraça: antes era uma borda azul-escura grossa)
    const K = DL.isoKit, c = '#aeb4ba', y1 = e.py + e.th * T;
    K.isoT(g, sc);
    K.box(g, e.px, e.py, e.px + 2, y1, 0, 2, { s: shade(c, 0.06), e: shade(c, -0.22), t: shade(c, 0.25) });
    return caixaTela(e.px, e.py, e.px + 2, y1, 0, 2);
  }
  // a parede de ripas com o logo, colada na parede reta à esquerda do saguão (ela corre no sentido y e
  // dá para a entrada). O desenho do logo é pintado uma vez numa imagem e "colado" na face da parede
  // (x = e.px), lido da esquerda para a direita na tela, acompanhando a parede como as outras coisas.
  let LOGO_IMG = null;
  function desenharLogoParede(g, sc, e) {
    const W = e.th * T;
    if (!LOGO_IMG) {
      LOGO_IMG = DL.mk(W, 44);
      logo(LOGO_IMG.getContext('2d'), { px: 0, py: 36, tw: e.th });
    }
    const y1 = e.py + W;
    DL.isoKit.setMap(g, sc, [e.px, y1, 44], [0, -1, 0], [0, 0, -1]);
    g.drawImage(LOGO_IMG, 0, 0);
    return caixaTela(e.px, e.py, e.px + 1, y1, 0, 44);
  }
  // notebook aberto em 3D, em cima de uma mesa: (x, y) no mapa, z = tampo, face = para onde olha quem usa, k = tamanho
  // (assim a tela fica virada para a cadeira: de trás vê-se só a tampa)
  function notebook3d(g, x, y, z, face, tela, k) {
    const cx = (a0, a1, d0, d1) => caixa(a0 * (k || 1), a1 * (k || 1), d0 * (k || 1), d1 * (k || 1)), zt = (v) => 0.8 + (v - 0.8) * (k || 1);
    pecas3d(g, Math.round(IX(x, y)), Math.round(IY(x, y, z)), face, 0, [
      { p: cx(-4.5, 4.5, -3.2, 3), z0: 0, z1: 0.8, cor: '#8b929b', topo: '#a9b0b8' },
      { p: cx(-3.6, 3.6, -1.2, 2), z0: 0.8, z1: 0.8, cor: '#3b4250', topo: '#3b4250' },              // teclado
      { p: cx(-4.5, 4.5, 3, 3.8), z0: 0.8, z1: zt(8), cor: '#5d6573', topo: '#9aa3b0', lado: -0.12 },    // tampa
      { p: cx(-3.7, 3.7, 2.8, 3), z0: zt(1.6), z1: zt(7.2), cor: tela || '#4f93d8', topo: '#1a1d22', lado: 0.02 }, // tela
    ]);
  }
  // os lugares da mesa redonda dos coordenadores: [tile x, tile y, para onde olha, notebook (dx, dy do centro)]
  const LUGARES_COORD = [[15, 22, 351, -10, -3], [18, 22, 171, 10, -3], [16, 23, 270, -6.5, 9], [17, 23, 270, 6.5, 9]];
  // mesa redonda da coordenação (2 × 2 tiles): pé central, tampo branco redondo e um notebook em cada lugar
  function desenharMesaRedonda(g, sc, e) {
    const K = DL.isoKit, cx = e.px + T, cy = e.py + T + 4, Z = DL.isoSurfaceTop(e), r = 16; // (+4: a parede fina do corredor)
    const X = IX(cx, cy), Y = IY(cx, cy, 0);
    const disco = (z, raio, cor) => { g.beginPath(); g.ellipse(X, Y - z, raio * 1.414, raio * 0.707, 0, 0, Math.PI * 2); g.fillStyle = cor; g.fill(); };
    K.isoT(g, sc);
    disco(0, 12, 'rgba(48,26,12,0.16)');
    disco(0, 6, '#6c6e6d');
    disco(1, 6, '#8c8e8d');
    g.fillStyle = '#7d8590'; g.fillRect(X - 2, Y - Z + 1, 4, Z - 2);
    g.fillStyle = '#9aa3b0'; g.fillRect(X - 2, Y - Z + 1, 1, Z - 2);
    disco(Z - 2, r, shade(COR.branco, -0.32));
    g.fillStyle = shade(COR.branco, -0.32); g.fillRect(X - r * 1.414, Y - Z, r * 2.828, 2);
    disco(Z, r, COR.branco);
    g.beginPath(); g.ellipse(X, Y - Z, r * 1.414 - 2, r * 0.707 - 1, 0, Math.PI * 1.05, Math.PI * 1.75);
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.stroke();
    // os notebooks, do fundo para a frente (e, no meio, uma caneca e uns papéis)
    const nb = LUGARES_COORD.map(([, , f, dx, dy], k) => ({ f, x: cx + dx, y: cy + dy, tela: ['#4f93d8', '#5fbf8f', '#4f93d8', '#4f93d8'][k] }));
    nb.sort((p, q) => p.x + p.y - q.x - q.y);
    const meio = () => {
      R(g, X - 3, Y - Z - 1, 5, 2, '#dfe3e8'); R(g, X - 2, Y - Z - 2, 5, 2, '#f7f8fa'); R(g, X - 1, Y - Z - 1, 3, 1, '#b8bec7');
    };
    nb.slice(0, 2).forEach((n) => notebook3d(g, n.x, n.y, Z, n.f, n.tela, 0.8));
    meio();
    nb.slice(2).forEach((n) => notebook3d(g, n.x, n.y, Z, n.f, n.tela, 0.8));
    return caixaTela(e.px, e.py, e.px + 2 * T, e.py + 2 * T + 4, 0, Z + 9);
  }
  // o ar-condicionado e o interruptor na parede clara da coordenação (face virada para a câmera)
  let AR_COORD = null;
  function desenharArCoord(g, sc, e) {
    const W = e.tw * T, y = e.py + 4;
    if (!AR_COORD) {
      AR_COORD = DL.mk(W, 44);
      const c = AR_COORD.getContext('2d');
      arCondicionado(c, { px: 24, py: 37 });
      interruptor(c, { px: 58, py: 40 });
    }
    DL.isoKit.setMap(g, sc, [e.px, y, 44], [1, 0, 0], [0, 0, -1]);
    g.drawImage(AR_COORD, 0, 0);
    return caixaTela(e.px, y, e.px + W, y + 1, 0, 44);
  }
  // as raízes vermelho-escuras que descem pintadas na parede laranja (na ponta de lá, perto da mesa)
  function desenharRaizes(g, sc, e) {
    const K = DL.isoKit, X = e.px;
    K.isoT(g, sc);
    for (const [y0, f, a] of [[e.py + 13, 0, 1.4], [e.py + 18, 1.7, 1.1], [e.py + 21, 3.1, 0.7]]) {
      let ant = null;
      for (let z = 38; z >= 4; z -= 2) {
        const p = [X, y0 + Math.sin(z * 0.55 + f) * a + Math.sin(z * 0.21 + f) * 0.8, z];
        if (ant) K.line(g, ant, p, f > 3 ? '#b8461a' : '#8e2f16', f > 3 ? 0.6 : 1);
        ant = p;
      }
    }
    return caixaTela(X, e.py, X + 1, e.py + 2 * T, 0, 44);
  }
  // a parede do lado do logo (a das 2 portas), cortada baixa para não esconder a sala; as portas ficam em pé
  // (kind 'porta', front). e.placa = x (px) da plaquinha azul, presa no batente da porta ao lado
  function desenharParedeBaixa(g, sc, e) {
    const K = DL.isoKit, [x0, y0, x1, y1] = e.isoRect;
    K.isoT(g, sc);
    K.box(g, x0, y0, x1, y1, 0, 7, { s: COR.parede, e: shade(COR.parede, -0.2), t: '#f4f1ea' });
    if (e.placa != null) {
      K.box(g, e.placa, y0 + 1, e.placa + 5, y0 + 3, 18, 28, { s: COR.placa, e: shade(COR.placa, -0.3), t: shade(COR.placa, 0.25) });
      K.poly(g, [[e.placa + 1.5, y0 + 3, 23], [e.placa + 3.5, y0 + 3, 23], [e.placa + 3.5, y0 + 3, 25], [e.placa + 1.5, y0 + 3, 25]], '#e8c15a');
    }
    return caixaTela(x0, y0, x1, y1, 0, 28);
  }
  // mesa do corredor: tampo cinza-claro e pernas finas de metal cinza (o mesmo tamanho e a mesma altura
  // de tampo da mesa do motor, 12, para as coisas em cima continuarem no lugar)
  // mesa comprida do corredor: tampo cinza-claro e pernas de metal cinza. Com e.partes = 2, são DUAS mesas
  // em fila (como nas fotos 3 e 4), com um vão no meio; o item continua ocupando os mesmos tiles.
  function desenharMesaCinza(g, sc, e) {
    const K = DL.isoKit, y0 = e.py + 2, y1 = e.py + e.th * T - 2, Z = DL.isoSurfaceTop(e);
    const metal = { s: '#9a9fa4', e: '#73787d', t: '#b4b9bd' }, tampo = e.color || '#dcdedf';
    const X0 = e.px + (e.margem || 1), X1 = e.px + e.tw * T - (e.margem || 1), n = e.partes || 1, vao = n > 1 ? 7 : 0, L = (X1 - X0 - vao * (n - 1)) / n;
    K.isoT(g, sc);
    for (let k = 0; k < n; k++) {
      const x0 = X0 + k * (L + vao), x1 = x0 + L;
      // sombra suave embaixo do tampo (2 camadas: a de fora mais clara)
      K.poly(g, [[x0 - 0.5, y0 - 0.5, 0], [x1 + 1.5, y0 - 0.5, 0], [x1 + 1.5, y1 + 1.5, 0], [x0 - 0.5, y1 + 1.5, 0]], 'rgba(48,26,12,0.08)', false);
      K.poly(g, [[x0 + 1, y0 + 1, 0], [x1, y0 + 1, 0], [x1, y1, 0], [x0 + 1, y1, 0]], 'rgba(48,26,12,0.12)', false);
      const perna = (x, y) => K.box(g, x, y, x + 1.5, y + 1.5, 0, Z - 2, metal);
      perna(x0 + 1, y0 + 1); perna(x1 - 2.5, y0 + 1);
      if (L > 2 * T) K.box(g, x0 + 2, (y0 + y1) / 2 - 0.5, x1 - 2, (y0 + y1) / 2 + 0.5, Z - 5, Z - 4, metal); // travessa
      perna(x0 + 1, y1 - 2.5); perna(x1 - 2.5, y1 - 2.5);
      K.box(g, x0, y0, x1, y1, Z - 2, Z, { s: shade(tampo, -0.2), e: shade(tampo, -0.32), t: tampo });
      K.line(g, [x0, y1, Z], [x1, y1, Z], 'rgba(255,255,255,0.6)');
      K.line(g, [x1, y0, Z], [x1, y1, Z], 'rgba(255,255,255,0.3)');
      K.line(g, [x0 + 3, y0 + 3, Z], [x1 - 6, y0 + 3, Z], 'rgba(255,236,206,0.35)'); // luz da tarde no tampo
    }
    return caixaTela(e.px, e.py, e.px + e.tw * T, e.py + e.th * T, 0, Z);
  }
  // balcão branco fino encostado na vidraça (as mesinhas da janela viraram um balcão contínuo, como na foto 3);
  // cada mesinha desenha o seu pedaço (4 tiles), o tile dela continua sendo o mesmo
  function desenharBalcao(g, sc, e) {
    const K = DL.isoKit, Z = DL.isoSurfaceTop(e), r = e.isoRect, x0 = r[0], x1 = r[2], y0 = r[1], y1 = r[3];
    const br = { s: '#d9dbdc', e: '#b9bcbe', t: '#f4f5f5' }, met = { s: '#b6babd', e: '#909498', t: '#cfd2d4' };
    K.isoT(g, sc);
    K.poly(g, [[x0, y0 - 1, 0], [x1 + 1, y0 - 1, 0], [x1 + 1, y1, 0], [x0, y1, 0]], 'rgba(48,26,12,0.1)', false);
    // (só as duas pontas do balcão inteiro têm pé: e.pernas = 'E', 'D' ou '')
    if (e.pernas.includes('E')) K.box(g, x0 + 1, y0 + 0.5, x0 + 2, y1 - 0.5, 0, Z - 1, met);
    if (e.pernas.includes('D')) K.box(g, x1 - 2, y0 + 0.5, x1 - 1, y1 - 0.5, 0, Z - 1, met);
    K.box(g, x0, y0, x1, y1, Z - 1, Z, br);
    K.line(g, [x0, y0, Z], [x1, y0, Z], 'rgba(255,255,255,0.8)');
    return caixaTela(x0, y0, x1, y1, 0, Z);
  }
  // divisória de vidro (mesmo lugar e mesma altura do vidro do motor): perfil de alumínio claro,
  // montante a cada placa e um reflexo quente de fim de tarde
  function desenharVidroSeg(g, sc, e) {
    const K = DL.isoKit, H = sc.wallCut ? 7 : 32, hz = e.kind === 'glassH';
    const r = hz ? [e.px, e.py + 6, e.px + 16, e.py + 10] : [e.px + 6, e.py, e.px + 10, e.py + 16];
    const alu = { s: '#aab1ba', e: '#868d97', t: '#d3d8de' };
    K.isoT(g, sc);
    K.box(g, r[0], r[1], r[2], r[3], 0, 2, alu);
    // a placa de vidro: face da frente e face do lado (tinta 'ambar': vidro bronze das salas de vidro)
    const amb = e.tinta === 'ambar';
    K.poly(g, [[r[0], r[3], 2], [r[2], r[3], 2], [r[2], r[3], H], [r[0], r[3], H]], amb ? 'rgba(168,116,58,0.34)' : 'rgba(178,208,232,0.16)', false);
    K.poly(g, [[r[2], r[3], 2], [r[2], r[1], 2], [r[2], r[1], H], [r[2], r[3], H]], amb ? 'rgba(140,92,44,0.3)' : 'rgba(150,185,220,0.13)', false);
    if (amb && H > 7) {
      // faixa fosca na altura dos olhos, com o logo (escudo) a cada duas placas
      K.poly(g, [[r[2], r[3], 15], [r[2], r[1], 15], [r[2], r[1], 18.5], [r[2], r[3], 18.5]], 'rgba(238,236,230,0.72)', false);
      if (e.ty % 2 === 0) K.poly(g, [[r[2], r[1] + 6, 15.5], [r[2], r[1] + 9, 15.5], [r[2], r[1] + 9, 18], [r[2], r[1] + 7.5, 18.6], [r[2], r[1] + 6, 18]], '#8a5a32', false);
    }
    // montante fino de alumínio a cada duas placas
    const fino = { s: "rgba(170,177,186,0.75)", e: "rgba(134,141,151,0.75)", t: "rgba(211,216,222,0.75)" };
    if ((hz ? e.tx : e.ty) % 2 === 0) { if (hz) K.box(g, r[0], r[1] + 1, r[0] + 0.5, r[3] - 1, 2, H - 1, fino); else K.box(g, r[0] + 1, r[1], r[2] - 1, r[1] + 0.5, 2, H - 1, fino); }
    K.box(g, r[0], r[1], r[2], r[3], H - 1, H, alu);
    if (H > 7) {
      // reflexo: duas faixas inclinadas, uma quente e uma branca, mudando um pouco de placa para placa
      const k = 3 + ((e.tx * 5 + e.ty * 3) % 6);
      const P = (d, z) => hz ? [r[0] + d, r[3], z] : [r[2], r[1] + d, z];
      K.line(g, P(k, H - 3), P(k + 5, H - 14), 'rgba(255,226,176,0.45)');
      K.line(g, P(k + 1, H - 3), P(k + 6, H - 14), 'rgba(255,226,176,0.25)');
      K.line(g, P(k + 4, 12), P(k + 6, 6), 'rgba(255,255,255,0.3)');
    }
    return caixaTela(r[0], r[1], r[2], r[3], 0, H);
  }
  // a vidraça: placa de vidro transparente do piso até o alto (sem viga em cima, sem base escura embaixo),
  // montantes verticais finos a cada 2 tiles, reflexo leve e uma soleira fina rente ao piso.
  // e.eixo 'h': corre no sentido x na linha y = e.lin; 'v': corre no sentido y na coluna x = e.lin; de e.a0 a e.a1.
  // e.opaca: um trecho de parede cheia (clara) na linha da vidraça; e.pilar = [x, y]: uma pilastra no ponto
  const PAREDE_FORA = { s: '#e2ddd3', e: '#c9c3b8', t: '#f1ede6' };
  // ripas de madeira marrom (mantidas para outras paredes de madeira)
  const PAREDE_MADEIRA = { s: '#6e4f38', e: '#5a4030', t: '#8a6a50' };
  // paredes pintadas de branco (a sala do fundo agora é toda branca, sem ripas)
  const PAREDE_BRANCA = { s: '#ffffff', e: '#f3f5f7', t: '#ffffff' };
  // as ripas verticais na face da parede que fica de frente para a câmera (sentido u, de a0 a a1)
  function ripas(K, g, P, a0, a1, H) {
    for (let u = a0 + 1; u < a1; u += 1) {
      const k = Math.round(u) % 4;
      if (k === 3) K.line(g, P(u, 2), P(u, H - 3), 'rgba(40,24,14,0.55)');
      else if (k === 0) K.line(g, P(u, 2), P(u, H - 3), 'rgba(170,128,92,0.35)');
    }
    K.line(g, P(a0, H - 1), P(a1, H - 1), '#f1ede6'); // o forro claro em cima
    K.line(g, P(a0, 1), P(a1, 1), '#3a2618');          // rodapé escuro
  }
  function desenharFachada(g, sc, e) {
    const K = DL.isoKit, H = sc.wallCut ? 7 : 32, h = e.eixo === 'h';
    // ('e': a diagonal do canto esquerdo, linha y = x + e.lin, quase de perfil para a câmera)
    const P = (u, z) => (h ? [u, e.lin, z] : e.eixo === 'd' ? [u, e.lin - u, z] : e.eixo === 'e' ? [u, u + e.lin, z] : [e.lin, u, z]);
    K.isoT(g, sc);
    if (e.pilar) {
      const [x, y] = e.pilar, r = 3;
      K.box(g, x - r, y - r, x + r, y + r, 0, H + 2, PAREDE_FORA);
      return caixaTela(x - r, y - r, x + r, y + r, 0, H + 2);
    }
    if (e.opaca) {
      if (e.eixo === 'd') {
        K.poly(g, [P(e.a0, 0), P(e.a1, 0), P(e.a1, H), P(e.a0, H)], PAREDE_FORA.s);
        K.poly(g, [P(e.a0, H), P(e.a1, H), [e.a1 - 3, e.lin - e.a1 - 3, H], [e.a0 - 3, e.lin - e.a0 - 3, H]], PAREDE_FORA.t);
        return caixaTela(e.a0 - 3, e.lin - e.a1 - 3, e.a1, e.lin - e.a0, 0, H);
      }
      const cor = e.branca ? PAREDE_BRANCA : e.madeira ? PAREDE_MADEIRA : PAREDE_FORA;
      if (h && e.junta) {
        // (a ponta da direita encosta na parede da diagonal: o topo termina chanfrado, igual ao dela)
        K.poly(g, [P(e.a0, 0), P(e.a1, 0), P(e.a1, H), P(e.a0, H)], cor.s);
        K.poly(g, [[e.a0, e.lin, H], [e.a1, e.lin, H], [e.a1 - 3, e.lin - 3, H], [e.a0, e.lin - 3, H]], cor.t);
        return caixaTela(e.a0, e.lin - 4, e.a1, e.lin, 0, H);
      }
      if (h) {
        K.box(g, e.a0, e.lin - 4, e.a1, e.lin, 0, H, cor);
        if (e.madeira) ripas(K, g, (u, z) => [u, e.lin, z], e.a0, e.a1, H);
        return caixaTela(e.a0, e.lin - 4, e.a1, e.lin, 0, H);
      }
      // (e.fora: a parede fica do lado de fora da linha, para não entrar no tile de dentro)
      const x0 = e.fora ? e.lin : e.lin - 4;
      K.box(g, x0, e.a0, x0 + 4, e.a1, 0, H, cor);
      if (e.madeira) ripas(K, g, (u, z) => [x0 + 4, u, z], e.a0, e.a1, H);
      return caixaTela(x0, e.a0, x0 + 4, e.a1, 0, H);
    }
    K.poly(g, [P(e.a0, 0), P(e.a1, 0), P(e.a1, H), P(e.a0, H)], e.fume ? 'rgba(62,44,28,0.3)' : h ? 'rgba(186,212,232,0.13)' : 'rgba(160,190,218,0.16)', false);
    if (e.fume && H > 7) { // a faixa fosca com os escudinhos, como nas salas de estudo
      K.poly(g, [P(e.a0, 13), P(e.a1, 13), P(e.a1, 17), P(e.a0, 17)], 'rgba(238,236,230,0.4)', false);
      for (let u = e.a0 + 5; u < e.a1 - 4; u += 10) K.poly(g, [P(u, 16), P(u + 2.4, 16), P(u + 2.4, 14.8), P(u + 1.2, 13.8), P(u, 14.8)], 'rgba(120,96,70,0.55)', false);
    }
    // reflexo: faixas inclinadas bem leves, uma quente e uma branca, a cada ~3 tiles
    if (H > 7) for (let u = e.a0 + 10 + ((e.a0 / T) % 3) * 7; u < e.a1 - 8; u += 46) {
      K.line(g, P(u, H - 4), P(u + 6, H - 17), 'rgba(255,230,190,0.32)');
      K.line(g, P(u + 2, H - 4), P(u + 8, H - 17), 'rgba(255,255,255,0.16)');
      K.line(g, P(u + 4, 11), P(u + 6, 5), 'rgba(255,255,255,0.2)');
    }
    // montantes finos (1 px), nas pontas e a cada 2 tiles
    for (let u = e.a0; u <= e.a1 + 0.1; u += 2 * T) K.line(g, P(Math.min(u, e.a1), 0), P(Math.min(u, e.a1), H), 'rgba(214,219,224,0.85)');
    K.line(g, P(e.a0, H), P(e.a1, H), 'rgba(230,234,238,0.55)'); // a borda de cima da placa (fina)
    K.line(g, P(e.a0, 0.5), P(e.a1, 0.5), '#b9bfc5');              // soleira fina
    if (e.eixo === 'd') return caixaTela(e.a0, e.lin - e.a1, e.a1, e.lin - e.a0, 0, H);
    if (e.eixo === 'e') return caixaTela(e.a0, e.a0 + e.lin, e.a1, e.a1 + e.lin, 0, H);
    return caixaTela(h ? e.a0 : e.lin - 1, h ? e.lin - 1 : e.a0, h ? e.a1 : e.lin + 1, h ? e.lin + 1 : e.a1, 0, H);
  }
  // a parede alta do lado de baixo do corredor de trás (linha 21): clara, com o rodapé, como as do motor
  function desenharParedeCorredor(g, sc, e) {
    const K = DL.isoKit, H = 44, x0 = e.px, x1 = e.px + e.tw * T, y0 = e.py, y1 = e.py + 4;
    K.isoT(g, sc);
    K.box(g, x0, y0, x1, y1, 0, H, { s: COR.parede, e: shade(COR.parede, -0.2), t: shade(COR.parede, 0.3) });
    K.line(g, [x0, y1, 4], [x1, y1, 4], '#f4f3ef');
    K.line(g, [x0, y1, 1], [x1, y1, 1], '#c9c7c0');
    K.line(g, [x0, y1, H - 1], [x1, y1, H - 1], shade(COR.parede, 0.4));
    return caixaTela(x0, y0, x1, y1, 0, H);
  }
  // O lado de fora da vidraça: o motor pinta as casas de parede de fora como chão escuro e levanta ali umas
  // bordas baixas escuras (a "base grossa"), e põe a base de maquete embaixo do mapa todo. Aqui o lado de fora
  // fica vazio (aparece o fundo da tela), as bordas baixas dessa parede saem (a vidraça entra no lugar) e o
  // prédio ganha só uma base fina e clara na borda do piso. (Feito uma vez, depois que o motor monta o estático.)
  // (o lado de fora: as casas de parede além da vidraça e a faixa 'x' do lado de fora da entrada; a soleira de
  //  granito da porta, 'o', fica)
  const foraDaVidraca = (x, y) => { const c = (TILES_FAC[y] || '')[x]; return c === 'x' || (y >= 34 && c === '#'); };
  function ajustarFachada(sc) {
    const st = sc._isoSt;
    if (!st || st._fachada || st.w !== sc.world) return;
    st._fachada = true;
    const w = sc.world, g = st.floor.getContext('2d');
    // a luz das salas que o motor só põe com a base ligada (sc.o.noBase é ligado no enter)
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = 'rgb(15,16,24)';
    for (let y = 0; y < w.H; y++) for (let x = 0; x < w.W; x++) if (w.tiles[y * w.W + x] !== '#') g.fillRect(x * T, y * T, T, T);
    g.globalCompositeOperation = 'source-over';
    for (let y = 0; y < w.H; y++) for (let x = 0; x < w.W; x++) if (foraDaVidraca(x, y)) g.clearRect(x * T, y * T, T, T);
    // o canto cortado em diagonal: apaga a metade de fora dos tiles que ficam em cima da linha
    g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath();
    g.moveTo(21 * T + OX, 37 * T); g.lineTo(25 * T + OX, 33 * T); g.lineTo(26 * T + OX, 33 * T); g.lineTo(26 * T + OX, 38 * T); g.lineTo(21 * T + OX, 38 * T); g.closePath(); g.fill(); g.restore();
    // sem as bordas baixas e a parede pintada que o motor levanta na linha da vidraça
    st.runs = st.runs.filter((r) => !(r.r[1] >= 34 * T - 4 && (r.face !== 's' && r.face !== 'e' ? true : r.face === 'e' && r.r[0] === 5 * T + OX - 4)));
    // (e a parede escura que o motor levantava na coluna 25, do lado de fora, atrás da parede da direita do lounge)
    st.runs = st.runs.filter((r) => !(r.r[0] >= 25 * T + OX && r.r[1] < 17 * T + 4));
    // (e a borda baixa do lado de baixo do corredor de trás, linha 21: a parede alta 'parede-corredor' fica no lugar)
    st.runs = st.runs.filter((r) => !(r.face === 'n' && r.r[1] === 21 * T && r.r[0] >= 1 * T + OX && r.r[2] <= 16 * T + OX));
    // (e a borda baixa da parede das 2 portas da coordenação, linha 25: a parede baixa clara fica no lugar)
    st.runs = st.runs.filter((r) => !(r.face === 'n' && r.r[1] === 25 * T && r.r[0] >= 14 * T && r.r[2] <= 19 * T));
    // a parede do fundo da sala branca (coluna 0, linhas 28 a 36) é laranja; as outras dela continuam brancas
    for (const r of st.runs) if (r.face === 'e' && r.r[2] === T && r.r[1] === 28 * T) r.style = Object.assign({}, r.style, { wallColor: '#e8811f' });
  }
  // a base fina do prédio: 3 px de altura embaixo da borda do piso, onde o lado de fora (ou o fim do mapa) começa
  function baseFina(g, sc) {
    const K = DL.isoKit, w = sc.world, B = 3;
    const fora = (x, y) => x >= w.W || y >= w.H || foraDaVidraca(x, y);
    K.isoT(g, sc);
    // a base da diagonal do canto (a linha reta, no lugar dos degraus dos tiles)
    K.poly(g, [[21 * T + OX, 37 * T, 0], [25 * T + OX, 33 * T, 0], [25 * T + OX, 33 * T, -B], [21 * T + OX, 37 * T, -B]], '#34383f');
    K.line(g, [21 * T + OX, 37 * T, 0], [25 * T + OX, 33 * T, 0], 'rgba(220,224,228,0.45)');
    // o peitoril da lateral direita (x de 25 tiles a +5 px, linhas 17 a 33): o topo da cor da soleira e as bordas
    const X0 = 25 * T + OX, X1 = 25 * T + OX + 5, Ya = 17 * T, Yb = 33 * T;
    K.poly(g, [[X0, Ya, 0], [X1, Ya, 0], [X1, Yb, 0], [X0, Yb, 0]], '#b9bfc5');
    K.poly(g, [[X1, Yb, 0], [X1, Ya, 0], [X1, Ya, -B], [X1, Yb, -B]], '#2c3037');
    K.poly(g, [[X0, Yb, 0], [X1, Yb, 0], [X1, Yb, -B], [X0, Yb, -B]], '#3c4048');
    K.line(g, [X1, Ya, 0], [X1, Yb, 0], 'rgba(220,224,228,0.45)');
    for (let y = 0; y < w.H; y++) for (let x = 0; x < w.W; x++) {
      if (fora(x, y) || (x + y === 57 + SX && x >= 21 + SX && y >= 33)) continue; // (os tiles da diagonal: a base é a de cima)
      const X = x * T, Y = y * T;
      if (fora(x, y + 1)) { K.poly(g, [[X, Y + T, 0], [X + T, Y + T, 0], [X + T, Y + T, -B], [X, Y + T, -B]], '#3c4048'); K.line(g, [X, Y + T, 0], [X + T, Y + T, 0], 'rgba(220,224,228,0.5)'); }
      if (fora(x + 1, y)) { K.poly(g, [[X + T, Y + T, 0], [X + T, Y, 0], [X + T, Y, -B], [X + T, Y + T, -B]], '#2c3037'); K.line(g, [X + T, Y, 0], [X + T, Y + T, 0], 'rgba(220,224,228,0.35)'); }
    }
  }
  // mesinha de centro do lounge: tampo de madeira com cantos arredondados e pernas finas de metal escuro
  // (mesmo tamanho; tampo na mesma altura de antes, 10, para os pendentes e as coisas em cima não mudarem)
  function desenharMesinhaCentro(g, sc, e) {
    const K = DL.isoKit, Z = DL.isoSurfaceTop(e), x0 = e.px + 1.5, y0 = e.py + 3, x1 = e.px + e.tw * T - 1.5, y1 = e.py + e.th * T - 3;
    const tampo = e.color || '#b07a45', metal = { s: '#3a3c40', e: '#26282b', t: '#55585d' };
    K.isoT(g, sc);
    K.poly(g, [[x0 + 1, y0 + 1, 0], [x1 + 1, y0 + 1, 0], [x1 + 1, y1 + 1, 0], [x0 + 1, y1 + 1, 0]], 'rgba(40,22,10,0.16)', false); // sombra
    const perna = (x, y) => K.box(g, x, y, x + 1, y + 1, 0, Z - 2, metal);
    perna(x0 + 1.5, y0 + 1); perna(x1 - 2.5, y0 + 1);
    K.box(g, x0 + 1.5, y0 + 1, x1 - 1.5, y1 - 1, 2.5, 3.2, { s: shade(tampo, -0.3), e: shade(tampo, -0.42), t: shade(tampo, -0.08) }); // prateleira de baixo
    perna(x0 + 1.5, y1 - 2); perna(x1 - 2.5, y1 - 2);
    K.box(g, x0, y0, x1, y1, Z - 2, Z, { s: shade(tampo, -0.25), e: shade(tampo, -0.38), t: tampo });
    for (let x = x0 + 4; x < x1 - 1; x += 5) K.line(g, [x, y0 + 1, Z], [x + 2, y1 - 1, Z], 'rgba(120,70,30,0.22)'); // veios
    K.line(g, [x0, y1, Z], [x1, y1, Z], 'rgba(255,235,200,0.45)');
    return caixaTela(e.px, e.py, e.px + e.tw * T, e.py + e.th * T, 0, Z);
  }
  // banco/degrau comprido de madeira na frente da parede verde
  function desenharDegrau(g, sc, e) {
    const K = DL.isoKit, x0 = e.px, x1 = e.px + e.tw * T, y0 = e.py, y1 = e.py + T;
    const mad = { s: '#b07a45', e: '#8a5f36', t: '#cf9a62' };
    K.isoT(g, sc);
    K.box(g, x0, y0, x1, y1, 0, 6, mad);
    K.box(g, x0, y0, x1, y0 + 8, 6, 12, mad);
    K.line(g, [x0, y1, 3], [x1, y1, 3], 'rgba(255,255,255,0.18)');
    K.line(g, [x0, y0 + 8, 9], [x1, y0 + 8, 9], 'rgba(255,255,255,0.18)');
    return caixaTela(x0, y0, x1, y1, 0, 12);
  }
  // abre a porta quando o jogador (ou um aluno) chega perto, fecha quando ele se afasta.
  // As portas dos lados do corredor das salas só abrem para os alunos que entram e saem por elas
  // (o jogador entra na sala de ADS com E; as outras salas ficam fechadas).
  function animarPortas(game, dt) {
    const andando = DL.FacAlunos ? DL.FacAlunos.perto() : [], todos = [game.player].concat(andando);
    const alguem = (lista, cx, cy, r) => lista.some((a) => Math.hypot(a.x - cx, a.y - cy) < r);
    for (const e of game.world.items) {
      if (e.kind !== 'porta' && e.kind !== 'porta-vidro') continue;
      let alvo;
      if (e.lado) alvo = alguem(andando, e.lado === 'l' ? e.px - 2 : e.px + T + 2, e.py + 8, 16) ? 1 : 0;
      else {
        const v = e.axis === 'v', dg = e.axis === 'd';
        const cx = dg ? e.px + T : v ? e.px + (e.dx || 0) + 2 : e.px + e.tw * 8, cy = dg ? e.py : v ? e.py + 16 : e.kind === 'porta-vidro' || e.front ? e.py + 2 : e.py + 14;
        alvo = !e.travada && alguem(todos, cx, cy, 34) ? 1 : 0;
      }
      if (e.rattle > 0) {
        e.rattle = Math.max(0, e.rattle - dt);
        e.open = Math.sin(e.rattle * 45) * 0.14;
      } else {
        e.open = (e.open || 0) + (alvo - (e.open || 0)) * Math.min(1, dt * 7);
      }
    }
    const v = game.world.byId.VIOLAO;
    if (v && v.shake > 0) v.shake = Math.max(0, v.shake - dt);
  }

  /* ------------------------------------------------------------------ */
  /* Quadro de giz interativo (desenho + assinatura salvos localmente)   */
  /* ------------------------------------------------------------------ */
  const QUADRO_KEY = 'venti_quadro_giz_v1';
  const GIZ_CORES = ['#eef2ef', '#f2e59a', '#9fd3e8', '#e8a8b8', '#a8e0b8'];
  let quadroUserCanvas = null;
  function carregarQuadro() {
    if (quadroUserCanvas) return quadroUserCanvas;
    const c = document.createElement('canvas');
    c.width = 520; c.height = 220;
    quadroUserCanvas = c;
    try {
      const saved = localStorage.getItem(QUADRO_KEY);
      if (saved) {
        const img = new Image();
        img.onload = () => { c.getContext('2d').drawImage(img, 0, 0); };
        img.src = saved;
      }
    } catch (_) {}
    return c;
  }
  carregarQuadro();

  let quadroWired = false;
  function abrirQuadroGiz(game) {
    const panel = $('quadroPanel'), cv = $('quadroCanvas');
    if (!panel || !cv) return;
    const g = cv.getContext('2d'), userCv = carregarQuadro(), ug = userCv.getContext('2d');
    let cor = GIZ_CORES[0], apagando = false, desenhando = false, last = null;

    const redesenhar = () => {
      g.fillStyle = '#1d2221';
      g.fillRect(0, 0, cv.width, cv.height);
      g.drawImage(userCv, 0, 0);
    };
    const salvar = () => {
      try { localStorage.setItem(QUADRO_KEY, userCv.toDataURL('image/png')); } catch (_) {}
    };
    const pos = (ev) => {
      const r = cv.getBoundingClientRect();
      const pt = ev.touches ? ev.touches[0] : ev;
      return [(pt.clientX - r.left) * (cv.width / r.width), (pt.clientY - r.top) * (cv.height / r.height)];
    };
    const traco = (a, b) => {
      ug.save();
      ug.lineCap = 'round';
      ug.lineJoin = 'round';
      if (apagando) {
        ug.globalCompositeOperation = 'destination-out';
        ug.lineWidth = 22;
        ug.strokeStyle = '#000';
      } else {
        ug.strokeStyle = cor;
        ug.lineWidth = 3.2;
      }
      ug.beginPath(); ug.moveTo(a[0], a[1]); ug.lineTo(b[0], b[1]); ug.stroke();
      ug.restore();
      redesenhar();
    };

    if (!quadroWired) {
      quadroWired = true;
      const box = $('quadroColors');
      GIZ_CORES.forEach((c, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'quadro__swatch' + (i === 0 ? ' is-on' : '');
        b.style.background = c;
        b.title = 'Giz';
        b.onclick = () => {
          cor = c; apagando = false;
          box.querySelectorAll('.quadro__swatch').forEach((s) => s.classList.remove('is-on'));
          b.classList.add('is-on');
        };
        box.appendChild(b);
      });
      const er = document.createElement('button');
      er.type = 'button';
      er.className = 'quadro__swatch quadro__swatch--erase';
      er.textContent = '⌫';
      er.title = 'Apagador';
      er.onclick = () => {
        apagando = true;
        box.querySelectorAll('.quadro__swatch').forEach((s) => s.classList.remove('is-on'));
        er.classList.add('is-on');
      };
      box.appendChild(er);

      if (window.PointerEvent) {
        let pointerId = null;
        const start = (ev) => {
          if (!ev.isPrimary || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
          pointerId = ev.pointerId;
          cv.setPointerCapture(pointerId);
          desenhando = true; last = pos(ev); traco(last, last);
          if (DL.sfx) DL.sfx.chalk();
          ev.preventDefault();
        };
        const move = (ev) => {
          if (!desenhando || ev.pointerId !== pointerId) return;
          const p = pos(ev); traco(last, p); last = p; ev.preventDefault();
        };
        const end = (ev) => {
          if (!desenhando || ev.pointerId !== pointerId) return;
          desenhando = false; pointerId = null; salvar();
        };
        cv.addEventListener('pointerdown', start);
        cv.addEventListener('pointermove', move);
        for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) cv.addEventListener(type, end);
      } else {
        const start = (ev) => { desenhando = true; last = pos(ev); traco(last, last); if (DL.sfx) DL.sfx.chalk(); ev.preventDefault(); };
        const move = (ev) => { if (!desenhando) return; const p = pos(ev); traco(last, p); last = p; ev.preventDefault(); };
        const end = () => { if (desenhando) { desenhando = false; salvar(); } };
        cv.addEventListener('mousedown', start); window.addEventListener('mousemove', move); window.addEventListener('mouseup', end);
        cv.addEventListener('touchstart', start, { passive: false }); cv.addEventListener('touchmove', move, { passive: false }); window.addEventListener('touchend', end);
      }

      $('quadroStamp').onclick = () => {
        const inp = $('quadroName'), txt = (inp.value || '').trim();
        if (!txt) return;
        ug.save();
        ug.font = 'bold 20px monospace';
        ug.fillStyle = cor;
        ug.textBaseline = 'middle';
        const x = 24 + Math.random() * (cv.width - 180), y = 28 + Math.random() * (cv.height - 56);
        ug.translate(x, y);
        ug.rotate((Math.random() - 0.5) * 0.16);
        ug.fillText(txt, 0, 0);
        ug.restore();
        inp.value = '';
        redesenhar();
        salvar();
        if (DL.sfx) DL.sfx.chalk();
      };
      $('quadroName').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') $('quadroStamp').click(); ev.stopPropagation(); });
      $('quadroClear').onclick = () => { ug.clearRect(0, 0, cv.width, cv.height); redesenhar(); salvar(); };
      $('quadroClose').onclick = () => { panel.classList.remove('is-open'); game.locked = false; };
    }
    redesenhar();
    game.locked = true;
    panel.classList.add('is-open');
  }

  /* ------------------------------------------------------------------ */
  /* Área de trabalho do notebook (VS Code, Terminal, Notas, Portal)     */
  /* ------------------------------------------------------------------ */
  const NB_NOTAS_KEY = 'venti_ads_notas_v1';
  let nbWired = false, nbApp = 'code', nbCode = '// Aula de Lógica de Programação - ADS\nfunction saudacao(nome) {\n  return "Bem-vindo ao Lab ADS, " + nome + "!";\n}\n\nfor (let i = 1; i <= 3; i++) {\n  console.log(i + ".", saudacao("Serra Dourada"));\n}\n';
  function abrirNotebook(game) {
    const panel = $('notebookPanel'), win = $('nbWin'), icons = $('nbIcons'), clk = $('nbClock');
    if (!panel || !win) return;
    if (clk) {
      const d = new Date();
      clk.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    }
    const render = () => {
      icons.querySelectorAll('.nb__icon').forEach((b) => b.classList.toggle('is-on', b.dataset.app === nbApp));
      if (nbApp === 'code') {
        win.innerHTML =
          '<div class="nb__whead"><b>VS Code · aula_logica.js</b><button id="nbRun" class="btn" type="button">▶ Executar</button></div>' +
          '<div class="nb__wbody"><textarea id="nbCode" class="nb__code" spellcheck="false"></textarea>' +
          '<div id="nbOut" class="nb__out">Clique em ▶ Executar para rodar o código.</div></div>';
        const ta = $('nbCode'), out = $('nbOut');
        ta.value = nbCode;
        ta.oninput = () => { nbCode = ta.value; };
        ta.onkeydown = (ev) => ev.stopPropagation();
        $('nbRun').onclick = () => {
          if (DL.sfx) DL.sfx.blip();
          const logs = [];
          try {
            const fn = new Function('console', nbCode);
            fn({ log: (...a) => logs.push(a.map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join(' ')) });
            out.style.color = '#7ee0a1';
            out.textContent = logs.length ? logs.join('\n') : '(executado sem saída)';
          } catch (err) {
            out.style.color = '#ffb3bc';
            out.textContent = 'Erro: ' + err.message;
          }
        };
      } else if (nbApp === 'term') {
        win.innerHTML =
          '<div class="nb__whead"><b>Terminal · bash</b><span>student@ads-lab</span></div>' +
          '<div class="nb__wbody"><div id="nbTermOut" class="nb__termout">Serra Dourada OS 2.4 LTS (ads-lab)\nDigite "help" para ver os comandos.\n</div>' +
          '<label class="term__line"><span class="p">student@ads-lab:~$</span><input id="nbTermIn" type="text" autocomplete="off" spellcheck="false"></label></div>';
        const out = $('nbTermOut'), inp = $('nbTermIn');
        const cmds = {
          help: 'Comandos: ls, whoami, cat notas.txt, ping, date, clear',
          ls: 'aula_logica.js   notas.txt   projeto-venti/',
          whoami: 'student (Curso: Análise e Desenv. de Sistemas)',
          'cat notas.txt': 'Prova de Lógica na próxima semana · revisar laços e funções!',
          ping: 'PING serradourada.edu.br: 64 bytes · time=8.4 ms (online)',
          date: new Date().toLocaleString('pt-BR'),
        };
        inp.onkeydown = (ev) => {
          ev.stopPropagation();
          if (ev.key !== 'Enter') return;
          const v = inp.value.trim();
          inp.value = '';
          if (v === 'clear') { out.textContent = ''; return; }
          const resp = cmds[v] || (v ? 'bash: ' + v + ': comando não encontrado' : '');
          out.textContent += '\n$ ' + v + (resp ? '\n' + resp : '');
          out.scrollTop = out.scrollHeight;
          if (DL.sfx) DL.sfx.blip();
        };
        setTimeout(() => inp.focus(), 20);
      } else if (nbApp === 'notes') {
        let saved = 'Anotações da Aula de ADS:\n- Lógica de programação com JS\n- Sala 1 · Laboratório de Informática\n- Lembrete: beber água no bebedouro do corredor!\n';
        try { saved = localStorage.getItem(NB_NOTAS_KEY) || saved; } catch (_) {}
        win.innerHTML =
          '<div class="nb__whead"><b>Notas.txt</b><span>Salvo automaticamente</span></div>' +
          '<div class="nb__wbody"><textarea id="nbNotes" class="nb__notes" spellcheck="false"></textarea></div>';
        const ta = $('nbNotes');
        ta.value = saved;
        ta.oninput = () => { try { localStorage.setItem(NB_NOTAS_KEY, ta.value); } catch (_) {} };
        ta.onkeydown = (ev) => ev.stopPropagation();
      } else {
        win.innerHTML =
          '<div class="nb__whead"><b>Portal ADS · Intranet</b><span>Canaã dos Carajás</span></div>' +
          '<div class="nb__wbody"><div class="nb__cards">' +
          '<div class="nb__card"><b>Aula Atual</b><p>Lógica de Programação · Sala 1 (ADS)</p></div>' +
          '<div class="nb__card"><b>Próxima Aula</b><p>Banco de Dados · 20:40</p></div>' +
          '<div class="nb__card"><b>Wi-Fi do Campus</b><p>SerraDourada-5G · Sinal Excelente</p></div>' +
          '<div class="nb__card"><b>Projeto em Destaque</b><p>Venti Experience · Mapa Interativo</p></div>' +
          '</div></div>';
      }
    };
    if (!nbWired) {
      nbWired = true;
      icons.querySelectorAll('.nb__icon').forEach((b) => {
        b.onclick = () => { nbApp = b.dataset.app; if (DL.sfx) DL.sfx.blip(); render(); };
      });
      $('nbClose').onclick = () => { panel.classList.remove('is-open'); game.locked = false; };
    }
    render();
    game.locked = true;
    panel.classList.add('is-open');
  }

  /* ------------------------------------------------------------------ */
  /* O que dá para fazer com E                                           */
  /* ------------------------------------------------------------------ */
  const ASSENTOS_OK = { 'cadeira-preta': 1, cadeira: 1, 'banco-pedra': 1, banqueta: 1, 'poltrona-vermelha': 1, 'poltrona-cinza': 1, 'poltrona-madeira': 1, puff: 1 };

  function useLabel(game, e) {
    if (e.id === 'ALUNO-PROXIMO') return e.aluno ? DL.FacAlunos.rotulo(e.aluno) : null;
    if (ASSENTOS_OK[e.kind]) return e.ocupado ? null : game.player && game.player.sitting === e ? 'Levantar' : 'Sentar';
    if (e.kind === 'notebook' || e.kind === 'notebook-ads') return 'Abrir notebook';
    if (e.dica) return e.dica;
    if (e.kind === 'placa') return 'Ler a placa';
    if (e.kind === 'ar-parede') return 'Sentir o ar-condicionado';
    if (e.kind === 'extintor') return 'Ver o extintor';
    if (e.kind === 'hidrante') return 'Ver o hidrante';
    if (e.id === 'LOGO') return 'Ver o logo';
    if (e.id === 'FRASE') return 'Ler a parede';
    if (e.kind === 'quadro') return 'Ler o quadro';
    if (e.id === 'ENTRADA') return 'Sair pela porta de vidro';
    if (e.kind === 'porta') return e.front ? 'Voltar ao corredor' : !e.to ? 'Sala ' + e.sala : e.sala === 1 ? 'Entrar na sala de ADS' : 'Entrar na Sala ' + e.sala;
    return null;
  }
  function use(game, e) {
    const cx = e.px + (e.tw || 1) * 8, cy = e.py + (e.th || 1) * 8;
    if (ASSENTOS_OK[e.kind]) return game.player.sitting === e ? game.stand() : game.sit(e);
    if (e.kind === 'notebook' || e.kind === 'notebook-ads') { if (DL.sfx) DL.sfx.blip(); return abrirNotebook(game, e); }
    if (e.id === 'ALUNO-PROXIMO' && e.aluno && DL.FacAlunos) return DL.FacAlunos.conversar(game, e.aluno);
    if (e.id === 'QUADRO-GIZ') { if (DL.sfx) DL.sfx.blip(); return abrirQuadroGiz(game); }
    if (e.id === 'BEBEDOURO') {
      if (DL.sfx) DL.sfx.water();
      if (DL.fx) DL.fx.burst(cx, cy + 4, 20, 'drop');
      game.player.anim = { kind: 'drink', t: 1.5, fxT: 0 };
      return game.toast('Bebedouro · água geladinha! (+10 energia)', 'ok');
    }
    if (e.id === 'VIOLAO') {
      return DL.Violao.abrir(game, e); // (assets/js/ui/violao.js)
    }
    if (e.kind === 'ar-parede') {
      if (DL.sfx) DL.sfx.blip();
      if (DL.fx) DL.fx.burst(cx, cy + 4, 28, 'mist');
      return game.toast('Ar-condicionado · 21°C, ventinho gelado!');
    }
    if (e.kind === 'extintor') { if (DL.sfx) DL.sfx.blip(); return game.toast('Extintor · validade em dia.'); }
    if (e.kind === 'hidrante') { if (DL.sfx) DL.sfx.blip(); return game.toast('Hidrante · pressão OK.'); }
    if (e.kind === 'porta' && !e.to) {
      if (DL.sfx) DL.sfx.door();
      e.rattle = 0.35;
      return game.toast(e.texto || ('Sala ' + e.sala + ' · fechada'));
    }
    if (e.dica) { if (DL.sfx) DL.sfx.blip(); return game.toast(e.texto); }
    if (e.kind === 'placa') { if (DL.sfx) DL.sfx.blip(); return game.toast(e.text); }
    if (e.id === 'LOGO') { if (DL.sfx) DL.sfx.blip(); return game.toast('Faculdade Serra Dourada · Canaã dos Carajás'); }
    if (e.id === 'FRASE') { if (DL.sfx) DL.sfx.blip(); return game.toast('“Estudar aqui é dar um passo a mais rumo aos seus sonhos!”'); }
    if (e.kind === 'quadro') { if (DL.sfx) DL.sfx.blip(); return game.toast('O quadro ainda está em branco (sala provisória).'); }
    if (e.id === 'ENTRADA') { if (DL.sfx) DL.sfx.door(); return game.loadMap(SAIDA); }
    if (e.kind === 'porta') { if (DL.sfx) DL.sfx.door(); return game.loadMap(e.to, e.toSpawn); }
  }

  // os alunos (bots): faculdade-alunos.js, carregado antes deste arquivo
  const alunos = DL.FacAlunos;

  // Câmera um pouco mais afastada, só nesta cena (o salão parecia apertado). A escala do motor é inteira e já
  // estava no mínimo (cada px do mapa = 4 px da tela entre 720 e 1199 px de altura); aqui ela passa a ser
  // P = altura / 360 arredondado para cima (3 px numa tela de 768 a 1080): ~1/3 a mais de sala, pixels nítidos.
  // P = k × S: k = quanto o CSS amplia a tela interna, S = escala do desenho (no mínimo 2, como antes).
  // (a cena é nova a cada mapa, então isto não vale para as outras)
  function afastarCamera(sc) {
    sc.resize = function () {
      const r = this.canvas.getBoundingClientRect();
      const P = Math.max(2, Math.ceil(r.height / 360));
      const S = P >= 4 && P % 2 === 0 ? 2 : P, k = P / S;
      this.canvas.width = Math.max(1, Math.ceil(r.width / k));
      this.canvas.height = Math.max(1, Math.ceil(r.height / k));
      this.dpr = this.canvas.width / Math.max(1, r.width);
      this.canvas.classList.add('is-pixel');
      this.autoS = S;
      this.S = S;
      if (DL.zoomAplicar) DL.zoomAplicar(this, r, k, S, true); // o zoom do jogador (iso.js)
    };
    sc.resize();
  }

  // as salas escondem o painel de missão do DataLab (ele volta quando o jogador sai)
  const esconderMissao = (sim) => { const m = $('mission'); if (m) m.hidden = sim; };

  /* ------------------------------------------------------------------ */
  /* O mapa da faculdade                                                 */
  /* ------------------------------------------------------------------ */
  const SAIDA = 'datalab'; // PROVISÓRIO: a porta de vidro vai para a rua quando o mapa da rua existir
  const DY = 12; // linhas acrescentadas em cima do mapa para o corredor das salas (ver "desce" abaixo)

  /* Planta (igual às plantas desenhadas da faculdade de verdade, giradas: a entrada do desenho, embaixo
     à esquerda, aqui é a porta de vidro na ponta direita; quem entra olha para a esquerda da tela):
       em frente   as mesas (linhas 28 a 33), com a faixa tátil reta para dentro delas
         esquerda  a vidraça (parede da frente, de vidro), com os bancos "pedra" e mesinhas
         meio      a mesa comprida, cadeiras verdes e laranja, bolinhas de luz
         direita   parede com as 3 salas de estudo de vidro, extintor, ar-condicionado e avisos; essa
                   parede acaba no canto do saguão; o logo fica na parede do saguão, virado para a entrada
         fundo     a sala branca (frente de vidro, parede laranja no fundo, cabines de estudo)
       à direita   o saguão (colunas 19 a 24), comprido, que passa por:
                   o logo (tapete e poltronas vermelhas na frente),
                   a coordenação (linhas 21 a 24), uma sala aberta para o saguão: 2 portas do lado do
                   logo, parede laranja no fundo com uma porta e a mesa redonda com notebooks,
                   o corredor (linhas 17 a 20), que entra para a esquerda da tela
                   e, no fim, a parede verde com a frase (atrás dela fica a sala de ADS)
       corredor    passa atrás da coordenação e cruza com o corredor das salas (colunas 12 a 14, linhas
                   1 a 16), que sobe à direita: 4 salas de cada lado, cada porta logo depois da parede
                   que separa as salas. A 1ª do lado direito é a sala de ADS (Sala 1). O corredor de
                   baixo continua um pouco para a esquerda; ali fica a porta da 1ª sala do outro lado
                   (Sala 2). As outras 6 portas (Salas 3 a 8) estão fechadas: ainda não têm sala. */
  TILES_FAC = [
    // 'M' madeira · 'G' faixa tátil · 'P' porta de sala · 'o' porta de vidro · 'x' lado de fora · '#' parede
    '##########################',
    '############MMM###########', // (a faixa para 1 tile antes da parede do fim do corredor)
    ...Array(14).fill('############MGM###########'),
    'P###########MGM###########',
    '#MMMMMMMMMMMMGMMMMMMMMMMMx',
    '#MMMMMMMMMMMMGGGGGGGGMMMMx',
    '#MMMMMMMMMMMMMMMMMMMGMMMMx',
    '#MMMMMMMMMMMMMMMMMMMGMMMMx',
    // a coordenação: uma sala aberta para o saguão, que entra 5 colunas para a esquerda (linhas 21 a 24)
    '###########MMMMMMMMMGMMMMx',
    '###########MMMMMMMMMGMMMMx',
    '###########MMMMMMMMMGMMMMx',
    '###########MMMMMMMMMGMMMMx',
    '################MMMMGMMMMx',
    '################MMMMGMMMMx',
    '################MMMMGMMMMx',
    '#MMMMMMMMMMMMMMMMMMMGMMMMx',
    '#MMMMMMMMMMMMMMMMMMMGMMMMx',
    '#MMMMMMMMMMMMMMMMMMMGMMMMx',
    '#MMMMMMMMMMMMMMMMMMMGMMMMx',
    '#MMMMMMMMMMMMMMMMMMMGMMMMx',
    // a faixa desce o saguão na coluna 20 e vira à esquerda na linha 33: corre o corredor inteiro entre as
    // cadeiras da mesa comprida (linha 32) e as do balcão da janela (linha 35), até a coluna 6
    '#MMMMMGGGGGGGGGGGGGGGMMMMx',
    // o corredor de estudo (colunas 5 a 18) vai 3 linhas mais para fora: a vidraça fica na linha 37.
    // O saguão desce junto até a linha 37 e o canto de baixo à direita é cortado em DIAGONAL (como a esquina
    // da fachada de fora): a vidraça vai de (21, 37) a (25, 33) e a porta de vidro fica no meio dela, de frente
    // para a câmera. Os tiles em cima da diagonal ficam inteiros no mapa ('o' = soleira da porta); a metade de
    // fora deles é apagada no desenho (ver ajustarFachada). (a sala de vidro do fundo, colunas 1+SX a 4+SX, continua)
    // (canto de baixo à esquerda: a sala do fundo, colunas 1+SX a 4+SX, desce até a linha 36, rente à frente do prédio)
    '#MMMMMMMMMMMMMMMMMMMMMMo##',
    '#MMMMMMMMMMMMMMMMMMMMMo###',
    '#MMMMMMMMMMMMMMMMMMMMM####',
    '##########################',
  ];
  // As 3 colunas novas ficam à esquerda do mapa: a coluna 0 continua sendo a parede de trás das cadeiras
  // (agora na borda), as colunas 1, 2 e 3 são chão novo. A sala passa a ter 7 colunas (4 + 3), sempre
  // com o mesmo comprimento de 9 linhas, igual à parede da porta.
  // O corredor do quadro (linhas 17-20) também ganha as 3 colunas à esquerda, e no final dele (perto do banheiro)
  // abre um corredor para a esquerda (linhas 21-26, colunas 1-3) até a parede da linha 27.
  TILES_FAC = TILES_FAC.map((row, y) => {
    if (y >= 28 && y <= 36) return '#MMM' + row.slice(1);
    if (y >= 17 && y <= 26) return '#MMM' + row.slice(1);
    return '###' + row;
  });

  const itens = [];
  const add = (o) => itens.push(o);
  const naParede = (o) => add(Object.assign({ wall: true, solid: false }, o));
  // assento virado para a sua mesa: face = direção (ver pecas3d), tuck = quanto entra para baixo da mesa (px).
  // (model leva a direção para o motor guardar um desenho por direção)
  const assento = (o, face, tuck) => add(Object.assign(o, { face, tuck: tuck || 0, model: 'f' + face + '-' + (tuck || 0) }));
  const lustre = (host, tx, ty, variant) => add({ kind: 'pendente', host, tx, ty, variant, solid: false, glow: COR.ambar });

  // 1. Entrada: o canto de baixo à direita cortado em diagonal (linha x + y = 58 tiles, de (21, 37) a (25, 33)),
  //    com a porta de vidro no meio, de frente para a câmera, colada no vidro dos dois lados; borda baixa
  //    contínua na ponta direita; plantas dos dois lados da porta.
  const XE = 25; // a ponta direita do mapa (a borda baixa)
  // (em px do mapa, já nas linhas finais) a diagonal e a porta: a porta vai de (22, 36) a (24, 34)
  const DIAG = 58 * T, PORTA0 = [22 * T, 36 * T], PORTA1 = [24 * T, 34 * T];
  const ret = (x, y) => [x - 1, y - 1 - DY * T, x + 1, y + 1 - DY * T]; // um retângulo de ordem de desenho bem pequeno, no ponto
  add({ id: 'ENTRADA', kind: 'porta-vidro', axis: 'd', tx: 22, ty: 35 - DY, solid: false, drawIso: desenharVidro, isoRect: ret(23 * T, 35 * T), isoH: 44 });
  // (a borda baixa da ponta direita, linhas 17 a 27, saiu: ali agora tem parede cheia e vidro, ver abaixo)
  add({ kind: 'planta-alta', tx: 21, ty: 35 - DY });
  add({ kind: 'planta-alta', tx: 23, ty: 33 - DY, variant: 'folhas' });

  // 2. As mesas, em frente à porta
  // esquerda (sul): a vidraça é a parede da frente, de vidro
  // A VIDRAÇA (fotos 3 e 4): vidro do chão ao teto, sem viga, sem guarda-corpo e sem base escura; só montantes
  // finos e bem espaçados, reflexo leve e uma soleira fina. Cinco peças compridas (uma por trecho reto), rentes
  // à borda do piso. O isoRect de cada uma fica logo do lado de fora (1 px), sem encostar no que está dentro:
  // assim a ordem de desenho nunca entra em ciclo (com o vidro tile a tile e as bordas baixas do motor ela
  // entrava, e um aluno sentado chegava a ser desenhado antes da mesa).
  //   em px do mapa (já com as linhas finais: a vidraça da sala do fundo e do saguão na linha 34, a do corredor na 37)
  const fachada = (eixo, lin, a0, a1, rect) => add({ kind: 'fachada', eixo, lin, a0, a1, tx: Math.floor((eixo === 'h' ? a0 : lin) / T), ty: Math.floor((eixo === 'h' ? lin : a0) / T) - DY, solid: false, drawIso: desenharFachada, isoRect: rect.map((v, k) => (k % 2 ? v - DY * T : v)), isoH: 34 });
  // a sala do fundo (colunas 1+SX a 4+SX, linhas 28 a 36): a frente (linha 37) é branca; a do lado do corredor
  // (no lugar do vidro âmbar da coluna 4+SX) usa a cor das outras paredes da faculdade.
  // A porta é de vidro (de correr, como a da entrada, sem a placa de saída), na parede do corredor, nas linhas
  // 31 e 32; a parede fica dos dois lados dela na cor das outras paredes da faculdade (PAREDE_FORA,
  // o mesmo #e2ddd3 do corredor) — só a fachada da frente da sala continua branca.
  add({ kind: 'fachada', opaca: true, eixo: 'v', lin: 4 * T + 10, a0: 28 * T, a1: 29 * T, tx: 4, ty: 28 - DY, th: 1, solid: true, drawIso: desenharFachada, isoRect: [4 * T + 6, 28 * T - DY * T, 4 * T + 10, 29 * T - DY * T], isoH: 34 });
  add({ kind: 'placa-branca', tx: 4, ty: 28 - DY, solid: false, drawIso: desenharPlacaBranca, isoRect: [4 * T + 10, 28 * T - DY * T, 4 * T + 10.5, 29 * T - DY * T], isoH: 34 });
  for (const [a, b] of [[29, 31], [33, 37]])
    add({ kind: 'fachada', fume: true, eixo: 'v', lin: 4 * T + 8, a0: a * T, a1: b * T - (b === 37 ? 4 : 0), tx: 4, ty: a - DY, th: b - a, solid: true, drawIso: desenharFachada, isoRect: [4 * T + 6, a * T - DY * T, 4 * T + 10, b * T - (b === 37 ? 4 : 0) - DY * T], isoH: 34 });
  add({ id: 'PORTA-REUNIAO', kind: 'porta-vidro', axis: 'v', dx: 6, semPlaca: true, tx: 4, ty: 31 - DY, th: 2, solid: false, drawIso: desenharVidro, isoRect: [4 * T + 6, 31 * T - DY * T, 4 * T + 10, 33 * T - DY * T], isoH: 44 });
  add({ kind: 'fachada', opaca: true, branca: true, eixo: 'h', lin: 37 * T, a0: 1 * T, a1: 5 * T, tx: 1, ty: 36 - DY, tw: 4, solid: false, drawIso: desenharFachada, isoRect: [1 * T, 37 * T - 4 - DY * T, 5 * T, 37 * T - DY * T], isoH: 34 });
  // a parede comprida do lado de baixo do corredor de trás (linha 21, colunas 1 a 15): alta como as outras, no
  // lugar da borda baixa (o vão escuro entre o corredor e a parede dos avisos fica atrás dela)
  add({ kind: 'parede-corredor', tx: 1, ty: 21 - DY, tw: 15, solid: false, drawIso: desenharParedeCorredor, isoRect: [1 * T, 21 * T - DY * T, 16 * T, 21 * T + 4 - DY * T], isoH: 46 });
  // a frente (linha 37), da esquerda para a direita: vidro, uma pilastra (x ≈ 14,8), vidro e um trecho de parede
  // cheia (colunas 19 e 20) até o canto
  fachada('h', 37 * T, 5 * T, 19 * T, [5 * T, 37 * T, 19 * T, 37 * T + 1]);       // corredor de estudo: vidro
  // pilastras a cada 4 tiles (x ≈ 6,8, 10,8 e 14,8)
  for (const px of [6.8, 10.8, 14.8])
    add({ kind: 'fachada', pilar: [px * T, 37 * T - 1], tx: Math.floor(px), ty: 36 - DY, solid: false, drawIso: desenharFachada, isoRect: ret(px * T, 37 * T + 1), isoH: 36 });
  add({ kind: 'fachada', opaca: true, junta: true, eixo: 'h', lin: 37 * T, a0: 19 * T, a1: 21 * T, tx: 19, ty: 37 - DY, solid: false, drawIso: desenharFachada, isoRect: [19 * T, 37 * T - DY * T, 21 * T, 37 * T + 1 - DY * T], isoH: 34 });
  // a diagonal: um trecho de parede cheia de cada lado da porta (eixo 'd': corre de (a0, DIAG − a0) a (a1, DIAG − a1));
  // o tile de cada pedaço fica fechado (a metade de dentro dele também)
  for (const [x0, x1, cx, cy] of [[21 * T, 22 * T, 21, 36], [24 * T, 25 * T, 24, 33]])
    add({ kind: 'fachada', opaca: true, eixo: 'd', lin: DIAG, a0: x0, a1: x1, tx: cx, ty: cy - DY, solid: true, drawIso: desenharFachada, isoRect: ret((x0 + x1) / 2, DIAG - (x0 + x1) / 2), isoH: 34 });
  // a lateral direita (coluna 25): parede cheia ao lado do lounge da parede verde (linhas 17 a 21, rente ao lado
  // de fora do piso, para não cobrir os móveis da coluna 24) e vidro das linhas 21 a 33, com pilastras nas
  // linhas 24 e 28. Os tiles do lado de fora ficam fechados.
  add({ kind: 'fachada', opaca: true, fora: true, eixo: 'v', lin: XE * T, a0: 17 * T, a1: 21 * T, tx: XE, ty: 17 - DY, th: 4, solid: true, drawIso: desenharFachada, isoRect: [XE * T, 17 * T - DY * T, XE * T + 4, 21 * T - DY * T], isoH: 34 });
  add({ kind: 'fachada', eixo: 'v', lin: XE * T, a0: 21 * T, a1: 31 * T, tx: XE, ty: 21 - DY, th: 10, solid: true, drawIso: desenharFachada, isoRect: [XE * T, 21 * T - DY * T, XE * T + 1, 31 * T - DY * T], isoH: 34 });
  // (e parede cheia no pedaço junto da porta, linhas 31 a 33)
  add({ kind: 'fachada', opaca: true, fora: true, eixo: 'v', lin: XE * T, a0: 31 * T, a1: 33 * T, tx: XE, ty: 31 - DY, th: 2, solid: true, drawIso: desenharFachada, isoRect: [XE * T, 31 * T - DY * T, XE * T + 4, 33 * T - DY * T], isoH: 34 });
  for (const py of [24, 28])
    add({ kind: 'fachada', pilar: [XE * T + 1, py * T], tx: XE, ty: py - 1 - DY, solid: false, drawIso: desenharFachada, isoRect: ret(XE * T + 2, py * T), isoH: 36 });
  //   (cada pedaço ocupa os seus 4 tiles: o balcão inteiro é sólido, ninguém atravessa ele)
  //   faixa da janela: um balcão branco contínuo encostado no vidro (colunas 6 a 17), com as cadeiras de
  //   escritório brancas viradas para ele, de costas para o corredor; cada mesinha desenha um pedaço de 4 tiles.
  //   isoRect do balcão (12 px de fundo, encostado no vidro) e das cadeiras um depois do outro, sem sobrepor:
  //   a cadeira sempre é desenhada antes do balcão (o assento entra embaixo do tampo, nunca por cima)
  //   (de volta como era antes do balcão: mesinha branca com uma poltroninha "pedra" de cada lado, junto do vidro)
  for (const x of [8, 12, 16]) {
    add({ id: 'MESINHA-' + x, kind: 'table', variant: 'office', color: COR.branco, tx: x, ty: 24 });
    add({ kind: 'banco-pedra', tx: x - 1, ty: 24 });
    add({ kind: 'banco-pedra', tx: x + 1, ty: 24 });
  }
  // meio: DUAS mesas compridas em fila (tampo cinza-claro, pernas de metal), 5 cadeiras de cada lado em cada
  // uma, uma por tile (alinhadas com a mesa), todas viradas para ela. Passagem de 2 tiles nas duas pontas,
  // 2 linhas livres do lado da parede (16, 17) e 2 do lado da janela (21, 22).
  // isoRect: a mesa (y 2 a 14 do tile) e as cadeiras (lado de lá até y 1 da mesa, lado de cá a partir de y 15)
  // nunca se sobrepõem, então a cadeira de lá sempre fica atrás do tampo e a de cá sempre na frente.
  const SALMAO = { 18: [8, 11, 15], 20: [9, 13, 16] };
  for (const [id, x0] of [['MESA-1', 7], ['MESA-2', 12]]) {
    add({ id, kind: 'table', variant: 'office', color: COR.branco, tx: x0, ty: 19, tw: 5, margem: 3, drawIso: desenharMesaCinza, isoH: 20,
      isoRect: [x0 * T + 3, 19 * T + 2, (x0 + 5) * T - 3, 19 * T + 14] });
    for (let x = x0; x < x0 + 5; x++) {
      // lado de lá (linha 18): de frente para a mesa; lado de cá (linha 20): o encosto para a câmera
      assento({ kind: 'cadeira', tx: x, ty: 18, color: SALMAO[18].includes(x) ? COR.laranja : COR.verde, isoRect: [x * T + 2, 18 * T + 6, x * T + 14, 19 * T + 1] }, 'S', 4);
      assento({ kind: 'cadeira', tx: x, ty: 20, color: SALMAO[20].includes(x) ? COR.laranja : COR.verde, isoRect: [x * T + 2, 20 * T - 1, x * T + 14, 20 * T + 10] }, 'N', 4);
    }
    // 2 fios de globos sobre cada mesa (3 a 5 globos por fio, em alturas diferentes)
    for (const gx of [x0 + 0.9, x0 + 3.1]) add({ kind: 'globos', host: id, tx: gx, ty: 19, solid: false, glow: COR.globo });
  }
  // direita (norte): portas de vidro de salas, interruptores, ar-condicionado, extintor, avisos e hidrante
  // da esquerda (sala branca) para a direita (saguão), como nas fotos: a plantinha no canto, as 3 salas de estudo
  // (cinza, azul e âmbar), o extintor com o ar-condicionado em cima, o interruptor e o quadro de avisos
  for (const o of SALAS_ESTUDO) {
    const x = o.x - OX; // (o deslocamento do mapa é somado no fim)
    add({ id: 'ESTUDO-' + o.n, kind: 'sala-estudo', estudo: o, tx: x / T, ty: 16, solid: false, drawIso: desenharSalaEstudo, isoRect: [x, 16 * T, x + SE_W, 16 * T + 0.5], isoH: 48,
      dica: 'Ver a Sala de Estudos ' + o.n, texto: 'Sala de Estudos ' + o.n + ' · “' + o.frase.join(' ') + '”' });
  }
  add({ kind: 'plantinha', tx: 5, ty: 16, drawIso: desenharPlantinha, isoRect: [5 * T + 3, 16 * T + 2, 5 * T + 13, 16 * T + 12], isoH: 20 });
  naParede({ kind: 'ar-parede', tx: (247 - OX) / T, ty: 16, tw: 2 });
  naParede({ kind: 'extintor', tx: (249 - OX) / T, ty: 16 });
  naParede({ kind: 'interruptor', tx: (263 - OX) / T, ty: 16 });
  naParede({ kind: 'avisos', tx: (275 - OX) / T, ty: 16, tw: 1.875 });
  // fundo: sala vazia (a mesa, as cadeiras e a planta foram retiradas; só ficam as paredes e a porta)

  // 3. Saguão, à direita de quem entra
  // o logo fica na parede reta à esquerda do saguão (coluna 15, linhas 25 a 27), virado para a entrada.
  // isoRect: bem fino (só a face da parede) e comprido até o canto, para o motor sempre desenhar o
  // logo DEPOIS da parede branca (senão, com o jogador perto, a parede era pintada por cima e o logo sumia)
  add({ id: 'LOGO', kind: 'logo-parede', tx: 16, ty: 13, th: 3, solid: false, drawIso: desenharLogoParede, isoRect: [16 * T, 13 * T, 16 * T + 0.5, 15.95 * T], isoH: 50, glow: 'rgba(255,170,110,0.05)' });
  // na frente do logo: tapete, poltronas vermelhas, puffs, lustres
  add({ kind: 'tapete', rug: true, tx: 21, ty: 14, tw: 4, th: 4, solid: false });
  add({ kind: 'luz-chao', rug: true, tx: 21, ty: 14, tw: 4, th: 4, solid: false, forca: 0.15 }); // a luz dos lustres no chão
  add({ id: 'MESINHA', kind: 'table', variant: 'small', color: '#b07a45', tx: 22, ty: 15, tw: 2, drawIso: desenharMesinhaCentro, isoH: 16 });
  // (as poltronas olham para a mesinha, cada uma num ângulo)
  assento({ kind: 'poltrona-vermelha', tx: 21, ty: 16 }, 326);
  assento({ kind: 'poltrona-vermelha', tx: 24, ty: 16 }, 214);
  // (os dois puffs à direita: o da coluna 22 ficava logo na frente da poltrona da esquerda e cobria quem senta nela)
  add({ kind: 'puff', tx: 23, ty: 17 });
  add({ kind: 'puff', tx: 24, ty: 17 });
  lustre('MESINHA', 22.1, 15, 'a');
  lustre('MESINHA', 22.6, 15, 'b');
  lustre('MESINHA', 23.2, 15, 'c');
  // em frente à coordenação: poltronas de madeira com mesinha
  add({ id: 'MESA-MADEIRA', kind: 'table', variant: 'small', color: '#b07a45', tx: 23, ty: 11, drawIso: desenharMesinhaCentro, isoH: 16 });
  assento({ kind: 'poltrona-madeira', tx: 22, ty: 11 }, 'L');
  assento({ kind: 'poltrona-madeira', tx: 24, ty: 11 }, 'O');
  lustre('MESA-MADEIRA', 23, 11, 'b');
  add({ kind: 'luz-chao', rug: true, tx: 22, ty: 10, tw: 3, th: 3, solid: false, forca: 0.14 });
  add({ kind: 'planta-alta', tx: 24, ty: 9, variant: 'folhas' });

  // 4. Coordenação: ver o fim da lista (já em coordenadas finais)

  // 5. Fim do saguão: parede verde com a frase (a sala de ADS fica atrás dela), degrau de madeira,
  //    poltronas, puffs, mesa e violão. O caminho para o corredor fica livre nas colunas 19 e 20.
  //    (parede e degrau 2 tiles mais para a esquerda; o violão logo depois do degrau, onde aparece)
  naParede({ id: 'FRASE', kind: 'parede-verde', tx: 17, ty: 5, tw: 6 });
  add({ kind: 'degrau', tx: 17, ty: 5, tw: 5, drawIso: desenharDegrau, isoRect: [17 * T, 5 * T, 22 * T, 6 * T], isoH: 20 });
  add({ id: 'VIOLAO', kind: 'violao', tx: 22, ty: 5, dica: 'Tocar violão' });
  add({ kind: 'tapete', rug: true, tx: 21, ty: 6, tw: 4, th: 3, solid: false });
  add({ kind: 'luz-chao', rug: true, tx: 20, ty: 6, tw: 5, th: 3, solid: false, forca: 0.13 });
  add({ id: 'MESA-VERDE', kind: 'table', variant: 'small', color: '#c49261', tx: 22, ty: 7, tw: 2, drawIso: desenharMesinhaCentro, isoH: 16 });
  assento({ kind: 'poltrona-vermelha', tx: 21, ty: 7 }, 12);
  assento({ kind: 'poltrona-madeira', tx: 24, ty: 7 }, 'O');
  add({ kind: 'puff', variant: 'cinza', tx: 22, ty: 8 });
  add({ kind: 'puff', variant: 'cinza', tx: 23, ty: 8 });
  assento({ kind: 'poltrona-cinza', tx: 24, ty: 6 }, 146);
  lustre('MESA-VERDE', 22.6, 7, 'a');

  naParede({ kind: 'extintor', tx: 16, ty: 5 });

  // "desce": tudo acima foi escrito com as linhas de antes do corredor das salas existir
  for (const o of itens) {
    o.ty += DY;
    if (o.isoRect) { o.isoRect[1] += DY * T; o.isoRect[3] += DY * T; }
  }

  // (já nas linhas finais) o material dos alunos (faculdade-alunos.js): cadernos, livros e notebooks na
  // mesa comprida e nas mesinhas, na frente de quem estuda; mochilas largadas no chão
  for (const [kind, x, host, color] of [['caderno', 8, 'MESA-1', '#c4553c'], ['notebook', 9, 'MESA-1'], ['livro', 10, 'MESA-1', '#2f6a4a'],
    ['caderno', 13, 'MESA-2', '#3a6ea5'], ['notebook', 14, 'MESA-2'], ['livro', 12, 'MESINHA-12', '#8e5cc4'], ['caderno', 16, 'MESINHA-16', '#e8a33a']]) {
    add({ kind, host, tx: x, ty: host.indexOf('MESA-') === 0 ? 31 : 36, // (na janela: em cima da mesinha)
      color, solid: false, glow: kind === 'notebook' ? 'rgba(120,170,240,0.035)' : undefined });
  }
  add({ kind: 'mochila', tx: 10, ty: 35.1, color: '#2d3e5c', solid: false }); // (entre duas cadeiras da janela)
  add({ kind: 'mochila', tx: 17.15, ty: 32.2, color: '#c4553c', solid: false }); // (no pé da última cadeira, na ponta da mesa)
  add({ kind: 'mochila', tx: 23.6, ty: 25.3, color: '#2f6a4a', solid: false });

  // 6. Corredor das salas (já nas linhas finais). Cada sala que abre é um mapa próprio.
  const NOME_SALA = { 1: 'Sala de ADS · laboratório de informática', 2: 'Laboratório da área da saúde' };
  const VOLTA = { 1: [14 + SX, 15], 2: [0 + SX, 17] }; // onde o jogador aparece ao sair da sala
  // portas nas paredes dos lados do corredor: lado 'l' = direita de quem sobe (parede baixa, coluna 15),
  // lado 'o' = esquerda (parede alta, coluna 11). Abrem com E (o tile continua sendo parede).
  for (const [n, lado, y] of [[1, 'l', 15], [4, 'l', 11], [6, 'l', 7], [8, 'l', 3], [3, 'o', 11], [5, 'o', 7], [7, 'o', 3]]) {
    const x = lado === 'l' ? 15 : 11, rx = lado === 'l' ? x * T : x * T + T;
    add({ id: 'PORTA-' + n, kind: 'porta', lado, sala: n, tx: x, ty: y, solid: false, drawIso: desenharPortaLado,
      // (lado 'o': retângulo fino e comprido até passar o fim da parede, para o motor sempre desenhar a
      //  porta DEPOIS da parede — o mesmo truque que o logo usava)
      isoRect: lado === 'l' ? [rx, y * T, rx + 4, y * T + T] : [rx, y * T, rx + 0.5, 17.2 * T], isoH: 36, to: n === 1 ? 'faculdade-sala1' : null });
  }
  // Corredor da Sala 2: quadro preto bem largo com assinaturas/desenhos de giz, bebedouro logo depois,
  // depois a porta da Sala 2 e, no fim, o banheiro e o corredor para a esquerda
  naParede({ id: 'QUADRO-GIZ', kind: 'quadro-giz', tx: 4, ty: 17, tw: 7, dica: 'Desenhar no quadro de giz', texto: 'Quadro preto cheio de assinaturas, nomes e desenhos feitos com giz.' });
  add({ id: 'BEBEDOURO', kind: 'bebedouro', tx: 3, ty: 17, solid: true, drawIso: desenharBebedouro, isoRect: [3 * T + 2, 17 * T + 1, 3 * T + 14, 17 * T + 9], isoH: 24, dica: 'Beber água', texto: 'Bebedouro · água gelada.' });
  // Sala 2: porta na parede do fundo do corredor de baixo, depois do bebedouro (dá para entrar andando)
  add({ id: 'PORTA-2', kind: 'porta', sala: 2, tx: 0, ty: 16, solid: false, drawIso: desenharPorta, isoRect: [0, 16 * T + 12, 16, 16 * T + 16], isoH: 48, to: 'faculdade-sala2' });
  // (isoRect só um pouco mais comprido, até a quina da parede ao lado: sem ciclo na ordem de desenho)
  naParede({ kind: 'placa', variant: '2', tx: 1, ty: 17, text: 'Sala 2 · ' + NOME_SALA[2], isoRect: [1 * T, 17 * T, 2 * T + 14, 17 * T + 0.5] });

  // o que fica em cima de uma mesa (globos, cadernos, notebooks, pendentes) usa o mesmo retângulo dela no chão:
  // sempre depois da mesa e na mesma ordem que ela em relação às cadeiras (sem ciclo na ordem de desenho; só
  // muda a ordem, nada muda de lugar)
  for (const o of itens) {
    const h = o.host && itens.find((i) => i.id === o.host);
    if (h && !o.isoRect) o.isoRect = h.isoRect ? h.isoRect.slice() : [h.tx * T, h.ty * T, (h.tx + (h.tw || 1)) * T, (h.ty + (h.th || 1)) * T];
  }

  // Desloca toda a planta 3 colunas para a direita junto com o mapa. A porta e a parede da direita
  // continuam iguais (só mudam de coordenada); a parede da esquerda fica 3 casas mais para trás.
  for (const o of itens) {
    if (typeof o.tx === 'number') o.tx += SX;
    if (o.isoRect) { o.isoRect[0] += OX; o.isoRect[2] += OX; }
    if (o.pilar) o.pilar[0] += OX;
    // 'v': lin é x e a0/a1 são y; 'h': lin é y e a0/a1 são x; 'd': lin (x + y) e a0/a1 são x
    if (typeof o.lin === 'number' && o.eixo !== 'h') o.lin += OX;
    if (typeof o.a0 === 'number' && o.eixo !== 'v') { o.a0 += OX; o.a1 += OX; }
    // a fachada branca da frente da sala não foi só deslocada: ela acompanha a parede de trás
    // recuada e cobre também as 3 colunas novas (de x = 1 a x = 4 + SX)
    if (o.eixo === 'h' && o.lin === 37 * T && o.branca) {
      o.tx = 1; o.tw = 4 + SX;
      o.a0 = 1 * T; o.a1 = (5 + SX) * T;
      if (o.isoRect) { o.isoRect[0] = 1 * T; o.isoRect[2] = (5 + SX) * T; }
    }
  }

  // A SALA BRANCA (foto): paredes brancas, a do fundo laranja, e cabines de estudo (bancadas com divisórias)
  // encostadas nas 3 paredes sem porta. Já em coordenadas finais. (divs: as divisórias, em tiles)
  const cabines = (id, tx, ty, tw, th, o) => add(Object.assign({ id, kind: 'table', variant: 'office', tx, ty, tw, th, drawIso: desenharCabines, isoH: 30 }, o));
  cabines('MESA-PAREDE-ESQ', 1, 29, 1, 7, { para: 'v', divs: [30.5, 32.5, 34.5] });  // na parede laranja
  cabines('MESA-PAREDE-FUNDO', 2, 28, 5, 1, { para: 'h', divs: [3.5, 5.5] });         // na parede do lado das salas de estudo
  cabines('MESA-PAREDE-FRENTE', 2, 36, 5, 1, { para: 'h', sul: true, divs: [3.5, 5.5] }); // na parede da frente
  // cadeiras de escritório brancas (com rodinhas), uma por cabine, viradas para ela
  const cadeiraRodinha = (id, tx, ty, face) => assento({ id, kind: 'banco-pedra', tx, ty }, face, 4);
  [31, 33].forEach((y, k) => cadeiraRodinha('CADEIRA-ESQ-' + (k + 1), 2, y, 'O'));
  [2, 4, 6].forEach((x, k) => cadeiraRodinha('CADEIRA-FUNDO-' + (k + 1), x, 29, 'N'));
  [2, 4, 6].forEach((x, k) => cadeiraRodinha('CADEIRA-FRENTE-' + (k + 1), x, 35, 'S'));

  // a parede do fundo (coluna 0): janela escura, raízes brancas e canos, por cima do laranja
  add({ id: 'FUNDO-BRANCA', kind: 'fundo-branca', tx: 1, ty: 28, th: 9, solid: false, drawIso: desenharFundoBranca, isoRect: [T, 28 * T, T + 0.5, 36.9 * T], isoH: 46 });

  // notebook em cima da mesa da esquerda, na frente do aluno sentado na cadeira (2,31)
  add({ kind: 'notebook', host: 'MESA-PAREDE-ESQ', tx: 1.1, ty: 31, solid: false, glow: 'rgba(120,170,240,0.035)' });

  // 2 puffs verdes no lado esquerdo da parede da porta (o trecho abaixo da porta, que aparece à esquerda
  // na tela isométrica), já fora da sala. Colados na parede (coluna 8), no canto junto à vidraça da frente.
  add({ kind: 'puff', variant: 'verde', tx: 8, ty: 35 });
  add({ kind: 'puff', variant: 'verde', tx: 8, ty: 36 });

  // Banheiro no final do corredor do quadro (parede da esquerda, col 0) e porta no fim do corredor à esquerda (linha 27).
  add({ id: 'PORTA-BANHEIRO', kind: 'porta', lado: 'o', tx: 0, ty: 18, solid: false, drawIso: desenharPortaLado, isoRect: [T, 18 * T, T + 0.5, 20.9 * T], isoH: 36, dica: 'Banheiro', texto: 'Banheiro · fechado.' });
  add({ id: 'PORTA-CORREDOR-ESQ', kind: 'porta', front: true, tx: 2, ty: 27, solid: false, drawIso: desenharPorta, isoRect: [2 * T, 27 * T, 3 * T, 27 * T + 4], isoH: 36, dica: 'Porta', texto: 'Porta · fechada.' });
  add({ id: 'ALUNO-PROXIMO', kind: 'ponto', tx: 0, ty: 0, solid: false, drawIso: () => null, isoH: 32 });

  // 4. Coordenação (em coordenadas finais), como na foto: a sala aberta ao lado do painel do logo (colunas 14 a 18,
  // linhas 21 a 24). A frente é o saguão, sem parede.
  // a mesa redonda lá dentro, do lado da parede do corredor, com cadeiras escuras e um notebook em cada lugar
  // (o caminho fica livre na linha 24)
  add({ id: 'MESA-COORD', kind: 'table', tx: 16, ty: 21, tw: 2, th: 2, drawIso: desenharMesaRedonda, isoH: 30, isoRect: [16 * T + 1, 21 * T + 6, 18 * T - 1, 23 * T - 1],
    glow: 'rgba(120,170,240,0.05)', dica: 'Ver a mesa dos coordenadores', texto: 'Coordenação · a mesa redonda onde os coordenadores trabalham.' });
  LUGARES_COORD.forEach(([x, y, f], k) => assento({ id: 'CADEIRA-COORD-' + (k + 1), kind: 'cadeira', tx: x, ty: y, color: '#4a3d36' }, f, y === 22 ? 4 : 1));
  // a parede clara do corredor, com o ar-condicionado. Ela é fina: o item fecha a linha 21 (ninguém a atravessa)
  add({ kind: 'ar-coord', tx: 14, ty: 21, tw: 5, solid: true, drawIso: desenharArCoord, isoRect: [14 * T, 21 * T + 4, 19 * T, 21 * T + 4.5], isoH: 46 });
  // no fundo, a parede laranja: as raízes pintadas e a porta com o visor de vidro comprido e a placa azul
  add({ kind: 'raizes', tx: 14, ty: 21, solid: false, drawIso: desenharRaizes, isoRect: [14 * T, 21 * T + 5, 14 * T + 0.5, 22.9 * T], isoH: 46 });
  add({ id: 'PORTA-COORD', kind: 'porta', lado: 'o', visor: true, tx: 13, ty: 23, solid: false, drawIso: desenharPortaLado, isoRect: [14 * T, 23 * T, 14 * T + 0.5, 24.9 * T], isoH: 36,
    dica: 'Porta da coordenação', texto: 'Coordenação · sala só dos coordenadores.' });
  // do lado do logo, a parede das 2 portas de madeira (fechadas), cada uma com a sua placa azul
  const XP = [14 * T + 7, 16 * T + 4], YP = 25 * T;
  XP.forEach((x, k) => add({ id: 'PORTA-COORD-' + (k + 2), kind: 'porta', front: true, travada: true, tx: x / T, ty: 25, solid: false, drawIso: desenharPorta,
    isoRect: [x, YP, x + T, YP + 4], isoH: 36, dica: 'Porta da coordenação', texto: 'Coordenação · porta fechada.' }));
  for (const [x0, x1, placa] of [[14 * T, XP[0], XP[0] - 6], [XP[0] + T, XP[1]], [XP[1] + T, 19 * T - 4, XP[1] + T + 1]])
    add({ kind: 'parede-baixa', tx: Math.floor(x0 / T), ty: 25, solid: false, placa, drawIso: desenharParedeBaixa, isoRect: [x0, YP, x1, YP + 4], isoH: 30 });

  const mapa = {
    id: 'faculdade',
    name: 'Faculdade Serra Dourada',
    tiles: TILES_FAC,
    items: itens,
    rooms: [
      { x: 16, y: 26, w: 3, h: 2, style: ESTILO },                                            // canto do logo
      { x: 19, y: 17, w: 6, h: 20, style: ESTILO },                                           // saguão (até a linha 37, com o canto em diagonal)
      { x: 16, y: 22, w: 3, h: 4, style: ESTILO },                                            // em frente à coordenação
      { x: 11, y: 21, w: 5, h: 4, style: { wall: 'pintada', wallColor: '#e2701c', light: 'warm' } }, // coordenação: a parede do fundo é laranja
      { x: 1, y: 17, w: 18, h: 4, style: ESTILO_CORREDOR },                                   // corredor
      { x: 12, y: 1, w: 3, h: 16, style: ESTILO_CORREDOR },                                   // corredor das salas
      { x: 5, y: 28, w: 14, h: 6, style: ESTILO_CORREDOR },                                   // mesas
      { x: 5, y: 34, w: 14, h: 3, style: ESTILO_CORREDOR },                                   // faixa da janela (corredor alargado)
      { x: 16, y: 21, w: 3, h: 1, style: ESTILO },                                            // onde ficava a parede curta atrás da mesa redonda
      // sala do fundo: paredes pintadas de branco, sem ripas (a antiga sala de vidro âmbar virou parede cheia)
      { id: 'SALA-FUNDO', x: 1, y: 28, w: 4 + SX, h: 9, style: { wall: 'pintada', wallColor: '#ffffff', light: 'bright' } }, // (linhas 28 a 36; 7 colunas após o recuo da parede esquerda)
      { id: 'CORREDOR-ESQ', x: 1, y: 17, w: 3, h: 10, style: ESTILO_CORREDOR }, // extensão do corredor do quadro + corredor à esquerda até a linha 26
    ],
    spawn: [21.75, 33.6], // logo depois da porta de vidro (1 passo para dentro do meio dela), olhando as mesas
    spawnDir: 'left',
    portals: [
      { tx: 22, ty: 35, to: SAIDA }, { tx: 23, ty: 34, to: SAIDA }, // (os 2 tiles da porta, na diagonal)
      { tx: 22, ty: 36, to: SAIDA }, { tx: 23, ty: 35, to: SAIDA }, // (e os de fora logo atrás dela: o pé do jogador chega neles)
      { tx: 0, ty: 16, to: 'faculdade-sala2' },
    ],
    // (tela interna de 480 px de altura: numa tela Full HD cabe ~50% mais sala, com os pixels nítidos;
    //  minS 2: em telas menores nunca fica menor que antes)
    // lead: a câmera fica 3 tiles para a esquerda da tela em relação ao jogador (−x, +y no mapa), para o lado
    // esquerdo do prédio (a sala de vidro do fundo) não ficar cortado
    camera: { tilesWide: 20, minTilesHigh: 9, pixelH: 480, minS: 2, noBase: true, lead: [-48, 48] }, // (noBase: a base fina é desenhada aqui, ver baseFina) // (antes: tilesWide 15, pixelH 360) (tela interna de 360 px ampliada com pixels nítidos: mesma aparência, 4× menos pixels)

    enter(game) {
      prepararSalas(game);
      esconderMissao(true);
      afastarCamera(game.scene);
      game.scene.cam.x += -48; game.scene.cam.y += 48; // já começa no lugar (camera.lead), sem deslizar ao entrar
      // o lado de fora da vidraça vazio e a base fina do prédio (ver ajustarFachada e baseFina)
      game.scene.underlay = (g, sc) => { ajustarFachada(sc); baseFina(g, sc); };
      const w = game.world;
      // a dica de saída aparece na frente da porta de vidro (o padrão seria do lado de fora)
      const ent = w.byId.ENTRADA;
      ent.ix = ent.px + T - 8; // do lado de dentro do meio da porta (a porta está na diagonal)
      ent.iy = ent.py - 8;
      const logo = w.byId.LOGO; // na frente da parede
      logo.ix = logo.px + 6;
      logo.iy = logo.py + 1.5 * T;
      const mesa = w.byId['MESA-COORD']; // do lado do caminho
      mesa.ix = mesa.px + T;
      mesa.iy = mesa.py + 3 * T + 6;
      for (const id of ['PORTA-COORD-2', 'PORTA-COORD-3']) { const d = w.byId[id]; d.ix = d.px + 8; d.iy = d.py - 5; }
      for (const o of SALAS_ESTUDO) { const s = w.byId['ESTUDO-' + o.n]; s.ix = o.x + 26; s.iy = s.py + 12; } // (na frente da porta de vidro)
      const tx = Math.floor(game.player.x / T), ty = Math.floor(game.player.y / T);
      // portas dos lados do corredor das salas: a dica aparece do lado de dentro do corredor
      for (const e of w.items) {
        if (e.lado) { e.ix = e.lado === 'l' ? e.px - 7 : e.px + T + 7; e.iy = e.py + 10; }
        else if (ASSENTOS_OK[e.kind] && e.ix == null) { e.ix = e.px + (e.tw || 1) * 8; e.iy = e.py + (e.th || 1) * 8; }
      }
      const pEsq = w.byId['PORTA-CORREDOR-ESQ'];
      if (pEsq) { pEsq.ix = pEsq.px + 8; pEsq.iy = pEsq.py - 6; }
      if (tx === VOLTA[1][0] && ty === VOLTA[1][1]) game.player.dir = 'left'; // voltou da sala de ADS
      else if (tx === VOLTA[2][0] && ty === VOLTA[2][1]) game.player.dir = 'down'; // voltou da Sala 2
      else game.toast('Faculdade Serra Dourada · em frente, as mesas; à direita, o logo, a coordenação e o corredor das salas');
      alunos.iniciar(game, 'faculdade');
    },
    leave(game) {
      esconderMissao(false);
      if (DL.Violao) DL.Violao.fechar();
      for (const id of ['quadroPanel', 'notebookPanel']) { const el = $(id); if (el) el.classList.remove('is-open'); }
      if (game) game.locked = false;
    },
    key(game, ev) {
      if (DL.Violao && DL.Violao.key(ev)) return true;
      for (const id of ['quadroPanel', 'notebookPanel']) {
        const el = $(id);
        if (el && el.classList.contains('is-open')) {
          if (ev.key === 'Escape') { el.classList.remove('is-open'); game.locked = false; ev.preventDefault(); }
          return true;
        }
      }
      return false;
    },
    update(game, dt) {
      ajustarFachada(game.scene);
      alunos.atualizar(game, dt);
      animarPortas(game, dt);
      const al = game.world.byId['ALUNO-PROXIMO'];
      if (al && alunos.pertoDoJogador) {
        const a = alunos.pertoDoJogador(game.player, 22);
        al.aluno = a;
        al.ix = a ? a.x : null;
        al.iy = a ? a.y : null;
        if (a) { al.px = a.x - 8; al.py = a.y - 8; }
      }
    },
    overlay(g, sc) { alunos.desenharFalas(g, sc); },
    useLabel,
    use,
  };
  for (const r of mapa.rooms) {
    // a sala marrom ganhou as 3 colunas à esquerda: ela começa no chão novo (x = 1), não no antigo x deslocado
    if (r.id === 'SALA-FUNDO') r.x = 1;
    else if (r.id !== 'CORREDOR-ESQ') r.x += SX;
  }
  mapa.spawn[0] += SX;
  for (const p of mapa.portals) p.tx += SX;
  DL.registerMap(mapa);

  /* ------------------------------------------------------------------ */
  /* As 2 salas (Sala 1 = ADS, Sala 2 = saúde) ficam em faculdade-salas.js, */
  /* que usa estas peças                                                  */
  /* ------------------------------------------------------------------ */
  DL.FacKit = {
    pecas3d, sombra3d, caixa, roda, chao, caixaTela, desenharPorta, prepararSalas, esconderMissao, afastarCamera,
    animarPortas, useLabel, use, VOLTA, NOME_SALA,
  };
})();

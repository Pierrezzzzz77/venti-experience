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
     3. Depois do logo: a secretaria, aberta para o saguão, com a mesa redonda e 3 notebooks
     4. Depois da secretaria: o corredor, que passa atrás dela e cruza com o corredor das salas
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
  // (linhas 31–33 do salão, colunas 1–24), entre as sombras dos montantes. Só no salão de entrada.
  function solTarde(g, px, py, x, y) {
    // (o sol baixo entra mais fundo: até ~3,5 tiles do vidro, apagando aos poucos; o piso é pintado uma vez só)
    // (no corredor de estudo, colunas 5 a 18, o vidro fica 3 linhas mais para fora: linha 37)
    const largo = x >= 5 && x <= 18, yv = largo ? 37 : 34;
    if (TILES_FAC.length < 38 || y < yv - 4 || y > yv - 1 || x < 1 || x > 24) return;
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
        // painel de ripas de madeira (sala de vidro do fundo): ripas verticais com veio
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
      { p: caixa(-5, 5, -3.6, 5.2), z0: 4.6, z1: 9, cor: t, topo: shade(t, 0.14) },                     // assento fofo
      { p: caixa(-5.2, 5.2, -5.6, -3.4), z0: 4.6, z1: 16.5, cor: t, lado: -0.2, topo: shade(t, 0.16) }, // encosto
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
      { p: caixa(-5, 5, -4, 5), z0: 7, z1: 9.5, cor: alm, topo: '#e58a52' },                          // almofada
      { p: caixa(-6, 6, -6, -4.6), z0: 7, z1: 17, cor: mad, lado: -0.18, tex: (x, y, cr) => (y % 3 === 0 ? shade(cr, -0.18) : cr) }, // encosto de ripas
      { p: caixa(-7, -5.6, -5, 4), z0: 7, z1: 12, cor: mad, topo: '#c4834e' },                       // braços
      { p: caixa(5.6, 7, -5, 4), z0: 7, z1: 12, cor: mad, topo: '#c4834e' },
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
  function bancoPedra(g, e) {
    if (e.face != null) return cadeiraEscritorio(g, e);
    const { c, b } = chao(e), br = '#f1f1ee', cin = '#c9cbcc', esc = '#8d9093', tela = '#dfe1e2';
    sombraChao(g, c, b, 14);
    R(g, c - 6, b - 2, 13, 1, esc);                                         // base em estrela
    for (const dx of [-6, -3, 0, 3, 6]) R(g, c + dx, b - 1, 1, 1, '#3a3c40'); // rodinhas
    R(g, c, b - 7, 1, 5, esc);                                              // pistão
    R(g, c - 5, b - 9, 11, 2, br); R(g, c - 5, b - 9, 11, 1, '#ffffff'); R(g, c - 5, b - 7, 11, 1, cin); // assento
    R(g, c - 7, b - 12, 2, 1, br); R(g, c - 6, b - 11, 1, 3, cin);           // braços
    R(g, c + 6, b - 12, 2, 1, br); R(g, c + 6, b - 11, 1, 3, esc);
    R(g, c - 4, b - 21, 9, 1, br);                                          // encosto de tela
    R(g, c - 5, b - 20, 11, 10, br);
    R(g, c - 4, b - 19, 9, 8, tela);
    for (let j = 0; j < 8; j += 2) for (let i = (j >> 1) & 1; i < 9; i += 2) R(g, c - 4 + i, b - 19 + j, 1, 1, cin);
    R(g, c + 5, b - 20, 1, 10, cin);
  }
  function puff(g, e) {
    // pufe cilíndrico azul-acinzentado (variant 'cinza': cinza), em 3/4 como os outros assentos
    const { c, b } = chao(e), base = e.variant === 'cinza' ? '#a9adb0' : '#9fb2c1';
    sombra3d(g, c, b, 'S', 0, 6.5);
    pecas3d(g, c, b, 'S', 0, [
      { p: roda(5.6, 16), z0: 0, z1: 10.5, cor: base, lado: -0.26, tex: (x, y, cr) => (y % 5 === 0 ? shade(cr, -0.07) : boucle(x, y, cr)) },
      { p: roda(4.6, 14), z0: 10.5, z1: 11.2, cor: shade(base, 0.12), topo: shade(base, 0.16), ordem: 50 }, // a borda de cima, fofa
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
    const { c, b } = chao(e), mad = '#c98a4a', esc = '#8f5a2c';
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

  /* ---------- na parede ---------- */
  // parede de ripas de madeira com o logo "Faculdade Serra Dourada" (logo-saguao.jpg)
  function logo(g, e) {
    const x0 = e.px, W = e.tw * T, top = e.py - 36;
    for (let i = 0; i < W; i++) R(g, x0 + i, top, 1, 44, COR.ripa[i % 3 === 2 ? 2 : i % 3]);
    R(g, x0, top, W, 1, '#c97a4e');
    R(g, x0, e.py + 7, W, 1, '#4a2412');
    // escudo branco com uma folha
    const lx = x0 + 9, ly = e.py - 22, bco = '#f4efe6';
    [9, 9, 9, 9, 9, 7, 7, 5, 3, 1].forEach((w, j) => R(g, lx + (9 - w) / 2, ly + j, w, 1, bco));
    [[4, 1], [3, 2], [5, 2], [2, 3], [6, 3], [2, 4], [6, 4], [3, 5], [5, 5], [4, 6]].forEach(([i, j]) => R(g, lx + i, ly + j, 1, 1, COR.ripa[1]));
    R(g, lx + 4, ly + 2, 1, 6, COR.ripa[1]);
    texto(g, 'FACULDADE', x0 + 22, ly, bco);
    texto(g, 'SERRA', x0 + 22, ly + 7, bco);
    texto(g, 'DOURADA', x0 + 22, ly + 13, bco);
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

  // parede verde-acinzentada com a frase e os veios de madeira em linhas brancas (parede-verde.jpg)
  function paredeVerde(g, e) {
    const x0 = e.px, W = e.tw * T, top = e.py - 36, verde = '#7d958d';
    R(g, x0, top, W, 44, verde);
    R(g, x0, top, W, 1, shade(verde, 0.25));
    R(g, x0, e.py + 4, W, 4, shade(verde, -0.2)); // rodapé
    const frase = [['ESTUDAR', 'AQUI'], ['E DAR', 'UM PASSO'], ['A MAIS', 'RUMO AOS'], ['SEUS SONHOS!', '']];
    frase.forEach(([forte, leve], k) => {
      const y = e.py - 28 + k * 6;
      texto(g, forte, x0 + 4, y, '#f4f7f4');
      if (leve) texto(g, leve, x0 + 4 + largura(forte) + 4, y, '#cfdcd5');
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
  // porta de vidro de uma sala, vista de dentro do corredor (corredor-fundo.jpg)
  function vidroSala(g, e) {
    // sala de estudo com divisória e porta de vidro: uma âmbar, a outra azulada (alternando pela posição)
    const x0 = e.px + 1, W = e.tw * T - 2, top = e.py - 26, alu = '#9aa3b0', ambar = Math.floor(e.tx / 8) % 2 === 0;
    const fundo = ambar ? '#c08a4c' : '#6f93ad', luz = ambar ? '#ffe2a8' : '#e8f3fa';
    R(g, x0, top, W, 34, fundo);
    R(g, x0, top, W, 14, shade(fundo, 0.12));
    for (let k = 0; k < 3; k++) R(g, x0 + 4 + k * 9, top + 3, 4, 2, luz); // luminárias lá dentro
    R(g, x0 + 3, top + 24, W - 6, 2, shade(fundo, 0.3));                   // mesa lá dentro
    R(g, x0 + 5, top + 26, 1, 7, shade(fundo, -0.3)); R(g, x0 + W - 6, top + 26, 1, 7, shade(fundo, -0.3));
    R(g, x0 + 6, top + 19, 4, 7, shade(fundo, -0.25)); R(g, x0 + W - 10, top + 19, 4, 7, shade(fundo, -0.25)); // cadeiras
    // faixa fosca na altura dos olhos, com o logo
    R(g, x0, top + 16, W, 4, 'rgba(240,244,246,0.78)');
    [5, 5, 3, 1].forEach((w, j) => R(g, x0 + 5 + (5 - w) / 2, top + 16 + j, w, 1, ambar ? '#b5623a' : '#1f7f96'));
    // reflexo no vidro
    for (let k = 0; k < 7; k++) R(g, x0 + W - 12 + k, top + 3 + k * 3, 1, 3, 'rgba(255,255,255,0.2)');
    R(g, x0, top, 1, 34, alu); R(g, x0 + W - 1, top, 1, 34, alu); R(g, x0, top, W, 1, alu);
    R(g, x0 + (W >> 1), top, 1, 34, alu);
    R(g, x0 + (W >> 1) - 2, top + 11, 1, 7, '#e3e7eb'); R(g, x0 + (W >> 1) + 2, top + 11, 1, 7, '#e3e7eb');
    R(g, x0 + W + 1, top + 4, 3, 6, COR.placa);
  }
  // quadro de avisos de acrílico com papéis coloridos
  function avisos(g, e) {
    // quadro de vidro/acrílico transparente, preso por parafusos, com panfletos coloridos
    const x0 = e.px + 3, W = e.tw * T - 6, top = e.py - 27, H = 20;
    R(g, x0 + 1, top + 1, W, H, 'rgba(0,0,0,0.10)');            // sombra na parede
    R(g, x0, top, W, H, 'rgba(228,238,243,0.55)');
    R(g, x0, top, W, 1, '#f7fafb'); R(g, x0, top + H - 1, W, 1, '#aeb8bf');
    R(g, x0, top, 1, H, '#eef3f5'); R(g, x0 + W - 1, top, 1, H, '#aeb8bf');
    for (const [dx, dy] of [[1, 1], [W - 3, 1], [1, H - 3], [W - 3, H - 3]]) R(g, x0 + dx, top + dy, 2, 2, '#9aa3ab');
    const cores = ['#e8c15a', '#c4553c', '#3a6ea5', '#7ec29a', '#f4f6f7', '#e8a0b0', '#f08a3c'];
    let x = x0 + 3, k = 0;
    while (x < x0 + W - 6) {
      const w = 5 + Math.floor(hash(k * 7 + e.tx) * 2), h = 7 + Math.floor(hash(k * 3 + 1) * 4), y = top + 3 + Math.floor(hash(k * 5 + 2) * (H - h - 5));
      const cor = cores[(k + e.tx) % cores.length];
      R(g, x, y, w, h, cor); R(g, x, y, w, 1, shade(cor, 0.2));
      R(g, x + 1, y + 3, w - 2, 1, shade(cor, -0.3)); R(g, x + 1, y + 5, w - 3, 1, shade(cor, -0.3));
      x += w + 2; k++;
    }
    R(g, x0 + W - 6, top + 2, 1, 6, 'rgba(255,255,255,0.6)'); // reflexo no vidro
  }

  /* ---------- Sala 1: laboratório de informática ---------- */
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

  /* ---------- Sala 2: laboratório da área da saúde ---------- */
  const OSSO = '#e6dfcc', OSSO_E = '#b5ab92';
  // esqueleto humano no suporte
  function esqueleto(g, e) {
    const { c, b } = chao(e);
    R(g, c - 4, b - 1, 8, 1, '#5d6573');
    R(g, c, b - 4, 1, 3, '#7d8590');
    R(g, c - 2, b - 33, 5, 4, '#efe9da');
    R(g, c - 1, b - 32, 1, 1, '#2a2622'); R(g, c + 1, b - 32, 1, 1, '#2a2622');
    R(g, c - 1, b - 29, 3, 1, OSSO_E);
    R(g, c, b - 28, 1, 13, OSSO);
    for (let k = 0; k < 5; k++) R(g, c - 3, b - 26 + k * 2, 7, 1, k % 2 ? OSSO_E : OSSO);
    R(g, c - 5, b - 27, 1, 11, OSSO); R(g, c + 5, b - 27, 1, 11, OSSO);
    R(g, c - 4, b - 28, 9, 1, OSSO);
    R(g, c - 3, b - 15, 7, 2, OSSO);
    R(g, c - 2, b - 13, 1, 10, OSSO); R(g, c + 2, b - 13, 1, 10, OSSO);
    R(g, c - 3, b - 4, 2, 1, OSSO); R(g, c + 2, b - 4, 2, 1, OSSO);
  }
  // fóssil de animal (um pequeno dinossauro) num pedestal, 2 tiles
  function fossil(g, e) {
    const { c, b } = chao(e);
    R(g, c - 14, b - 4, 28, 4, '#3a3f47');
    R(g, c - 14, b - 4, 28, 1, '#5d6573');
    const costas = (i) => b - 15 - Math.round(3 * Math.sin(((i + 11) / 22) * Math.PI));
    for (let i = -11; i <= 9; i++) R(g, c + i, costas(i), 1, 1, '#d8cfb8');
    for (let i = -6; i <= 5; i += 2) R(g, c + i, costas(i) + 1, 1, 4, OSSO_E);
    R(g, c - 14, b - 14, 3, 1, '#d8cfb8'); R(g, c - 12, b - 15, 2, 1, '#d8cfb8');
    R(g, c + 9, b - 17, 2, 1, '#d8cfb8'); R(g, c + 10, b - 18, 1, 1, '#d8cfb8');
    R(g, c + 10, b - 21, 6, 3, '#d8cfb8'); R(g, c + 12, b - 20, 1, 1, '#4a3f30');
    R(g, c + 11, b - 18, 5, 1, '#f0ead8');
    R(g, c - 7, b - 13, 1, 9, '#d8cfb8'); R(g, c - 5, b - 13, 1, 9, OSSO_E);
    R(g, c + 4, b - 14, 1, 10, '#d8cfb8'); R(g, c + 6, b - 14, 1, 10, OSSO_E);
    R(g, c, b - 4, 1, 1, '#9aa3b0');
  }
  // vitrine de vidro com órgãos em potes
  function vitrine(g, e) {
    const { c, b } = chao(e), alu = '#c8ccd2';
    R(g, c - 7, b - 32, 14, 32, alu);
    R(g, c - 6, b - 31, 12, 29, '#2c3d4c');
    for (const prat of [b - 22, b - 12, b - 3]) {
      R(g, c - 6, prat, 12, 1, alu);
      for (let k = 0; k < 3; k++) {
        const x = c - 5 + k * 4;
        R(g, x, prat - 6, 3, 6, '#9fc7c0');
        R(g, x, prat - 6, 3, 1, '#d8e8e4');
        R(g, x + 1, prat - 4, 1, 3, ['#c4553c', '#e7a0b0', '#b8322b'][(k + prat) % 3]);
      }
    }
    R(g, c + 6, b - 31, 1, 29, '#9aa3b0');
  }
  // modelos em cima das bancadas (host): torso de anatomia, coração, cérebro, crânio fóssil, microscópio
  function torso(g, e) {
    const c = e.px + 8, r = e.py - 1, pele = '#e8b896';
    R(g, c - 4, r, 8, 1, '#3a3f47');
    R(g, c - 1, r - 2, 2, 2, '#3a3f47');
    R(g, c - 3, r - 13, 6, 11, pele);
    R(g, c, r - 12, 3, 4, '#e08a8a');
    R(g, c, r - 8, 3, 3, '#b8322b');
    R(g, c, r - 5, 3, 3, '#c98a4a');
    R(g, c - 2, r - 17, 4, 4, pele);
    R(g, c, r - 17, 2, 2, '#e7a0b0');
  }
  function coracao(g, e) {
    const c = e.px + 8, r = e.py - 1;
    R(g, c - 2, r, 4, 1, '#3a3f47');
    R(g, c - 3, r - 7, 2, 1, '#b8322b'); R(g, c + 1, r - 7, 2, 1, '#b8322b');
    R(g, c - 3, r - 6, 6, 4, '#b8322b');
    R(g, c - 2, r - 2, 4, 1, '#8f2620');
    R(g, c - 2, r - 6, 1, 1, '#e06a5a');
    R(g, c, r - 9, 2, 2, '#d65a4a');
  }
  function cerebro(g, e) {
    const c = e.px + 8, r = e.py - 1;
    R(g, c - 2, r, 4, 1, '#3a3f47');
    R(g, c - 4, r - 6, 8, 5, '#e7a0b0');
    R(g, c - 3, r - 7, 6, 1, '#efb6c3');
    R(g, c - 2, r - 5, 3, 1, '#c97a8e'); R(g, c + 1, r - 3, 2, 1, '#c97a8e'); R(g, c - 3, r - 3, 2, 1, '#c97a8e');
    R(g, c, r - 7, 1, 5, '#c97a8e');
  }
  function cranio(g, e) {
    const c = e.px + 8, r = e.py - 1;
    R(g, c - 5, r, 11, 1, '#5a4430');
    R(g, c - 5, r - 5, 8, 4, '#d8cfb8');
    R(g, c + 3, r - 4, 3, 2, '#d8cfb8');
    R(g, c - 3, r - 4, 2, 2, '#4a3f30');
    R(g, c + 1, r - 1, 5, 1, '#f0ead8');
    R(g, c - 5, r - 5, 8, 1, '#efe9da');
  }
  function microscopio(g, e) {
    const c = e.px + 8, r = e.py - 1;
    R(g, c - 3, r, 7, 1, '#2a2e35');
    R(g, c + 1, r - 9, 2, 9, '#e9ecef');
    R(g, c - 3, r - 5, 5, 1, '#5d6573');
    R(g, c - 1, r - 11, 2, 6, '#3a3f47');
    R(g, c - 1, r - 12, 2, 1, '#9aa3b0');
  }

  const ARTE = {
    'poltrona-vermelha': poltronaVermelha, 'poltrona-cinza': poltronaCinza, 'poltrona-madeira': poltronaMadeira,
    'banco-pedra': bancoPedra, puff, cadeira, violao, sofa,
    'planta-alta': plantaAlta, pendente, globos, tapete,
    logo, placa, 'ar-parede': arCondicionado, extintor, interruptor, hidrante, quadro, 'parede-verde': paredeVerde, 'vidro-sala': vidroSala, avisos,
    notebook, esqueleto, fossil, vitrine, torso, coracao, cerebro, cranio, microscopio,
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
  // porta de madeira de uma sala; front: true = numa parede da frente (baixa), senão na parede do fundo
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
    const K = DL.isoKit, Hd = 28, Hb = 31, ya = e.py, yb = e.py + T, cor = e.to ? COR.porta : COR.portaEscura;
    const bat = { s: '#cfc8bb', e: '#a9a296', t: '#efe9df' };
    const ab = clamp(e.open || 0, 0, 1) * 1.35, sx = e.lado === 'o' ? 1 : -1;
    const folha = (X) => {
      if (ab > 0.02) K.poly(g, [[X, ya + 2, 0], [X, yb - 2, 0], [X, yb - 2, Hd], [X, ya + 2, Hd]], '#17120e'); // a sala lá dentro
      // dobradiça: no lado 'o' fica no fundo do vão; no lado 'l', na frente (assim a folha aberta nunca
      // é pintada por cima de quem está passando pela porta)
      const sy = e.lado === 'o' ? 1 : -1, y0 = e.lado === 'o' ? ya + 2 : yb - 2;
      const A = [X, y0], B = [X + sx * 12 * Math.sin(ab), y0 + sy * 12 * Math.cos(ab)];
      const at = (k) => [A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k];
      K.poly(g, [[A[0], A[1], 0], [B[0], B[1], 0], [B[0], B[1], Hd], [A[0], A[1], Hd]], ab > 0.7 ? shade(cor, -0.18) : cor);
      for (const k of [4 / 12, 8 / 12]) { const p = at(k); K.line(g, [p[0], p[1], 1], [p[0], p[1], Hd - 1], 'rgba(90,40,15,0.35)'); }
      K.line(g, [A[0], A[1], Hd], [B[0], B[1], Hd], '#d98a52');
      const m = at(10 / 12);
      K.line(g, [m[0], m[1], 12], [m[0], m[1], 14], '#e3cf9a', 1);
    };
    K.isoT(g, sc);
    if (e.lado === 'o') {
      const X = e.px + T;
      K.poly(g, [[X, ya, 0], [X, yb, 0], [X, yb, Hb], [X, ya, Hb]], bat.e);
      folha(X);
      K.poly(g, [[X, yb + 3, 15], [X, yb + 9, 15], [X, yb + 9, 22], [X, yb + 3, 22]], COR.placa);
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
  function desenharVidro(g, sc, e) {
    const K = DL.isoKit, v = e.axis === 'v', H = 30, Hf = 34, L = 32;
    const ponto = (u, z) => (v ? [e.px + 2, e.py + u, z] : [e.px + u, e.py + 2, z]);
    const caixa = (u0, u1, z0, z1, c) => (v ? K.box(g, e.px, e.py + u0, e.px + 4, e.py + u1, z0, z1, c) : K.box(g, e.px + u0, e.py, e.px + u1, e.py + 4, z0, z1, c));
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
    caixa(12, 20, Hf + 1, Hf + 5, { s: '#2fa65e', e: '#1f7a44', t: '#46c47a' });
    return v ? caixaTela(e.px, e.py, e.px + 4, e.py + L, 0, Hf + 5) : caixaTela(e.px, e.py, e.px + L, e.py + 4, 0, Hf + 5);
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
  // mesa redonda da secretaria (2 × 2 tiles): pé central e tampo branco redondo
  function desenharMesaRedonda(g, sc, e) {
    const K = DL.isoKit, cx = e.px + T, cy = e.py + T, Z = DL.isoSurfaceTop(e), r = 13;
    const X = IX(cx, cy), Y = IY(cx, cy, 0);
    const disco = (z, raio, cor) => { g.beginPath(); g.ellipse(X, Y - z, raio * 1.414, raio * 0.707, 0, 0, Math.PI * 2); g.fillStyle = cor; g.fill(); };
    K.isoT(g, sc);
    disco(0, 6, '#6c6e6d');
    disco(1, 6, '#8c8e8d');
    g.fillStyle = '#7d8590'; g.fillRect(X - 2, Y - Z + 1, 4, Z - 2);
    g.fillStyle = '#9aa3b0'; g.fillRect(X - 2, Y - Z + 1, 1, Z - 2);
    disco(Z - 2, r, shade(COR.branco, -0.32));
    g.fillStyle = shade(COR.branco, -0.32); g.fillRect(X - r * 1.414, Y - Z, r * 2.828, 2);
    disco(Z, r, COR.branco);
    g.beginPath(); g.ellipse(X, Y - Z, r * 1.414 - 2, r * 0.707 - 1, 0, Math.PI * 1.05, Math.PI * 1.75);
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.stroke();
    return caixaTela(e.px, e.py, e.px + 2 * T, e.py + 2 * T, 0, Z);
  }
  // mesa do corredor: tampo cinza-claro e pernas finas de metal cinza (o mesmo tamanho e a mesma altura
  // de tampo da mesa do motor, 12, para as coisas em cima continuarem no lugar)
  // mesa comprida do corredor: tampo cinza-claro e pernas de metal cinza. Com e.partes = 2, são DUAS mesas
  // em fila (como nas fotos 3 e 4), com um vão no meio; o item continua ocupando os mesmos tiles.
  function desenharMesaCinza(g, sc, e) {
    const K = DL.isoKit, y0 = e.py + 2, y1 = e.py + e.th * T - 2, Z = DL.isoSurfaceTop(e);
    const metal = { s: '#9a9fa4', e: '#73787d', t: '#b4b9bd' }, tampo = '#dcdedf';
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
  function desenharFachada(g, sc, e) {
    const K = DL.isoKit, H = sc.wallCut ? 7 : 32, h = e.eixo === 'h';
    const P = (u, z) => (h ? [u, e.lin, z] : [e.lin, u, z]);
    K.isoT(g, sc);
    K.poly(g, [P(e.a0, 0), P(e.a1, 0), P(e.a1, H), P(e.a0, H)], h ? 'rgba(186,212,232,0.13)' : 'rgba(160,190,218,0.16)', false);
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
    return caixaTela(h ? e.a0 : e.lin - 1, h ? e.lin - 1 : e.a0, h ? e.a1 : e.lin + 1, h ? e.lin + 1 : e.a1, 0, H);
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
    // sem as bordas baixas e a parede pintada que o motor levanta na linha da vidraça
    st.runs = st.runs.filter((r) => !(r.r[1] >= 34 * T - 4 && (r.face !== 's' && r.face !== 'e' ? true : r.face === 'e' && r.r[0] === 5 * T - 4)));
  }
  // a base fina do prédio: 3 px de altura embaixo da borda do piso, onde o lado de fora (ou o fim do mapa) começa
  function baseFina(g, sc) {
    const K = DL.isoKit, w = sc.world, B = 3;
    const fora = (x, y) => x >= w.W || y >= w.H || foraDaVidraca(x, y);
    K.isoT(g, sc);
    for (let y = 0; y < w.H; y++) for (let x = 0; x < w.W; x++) {
      if (fora(x, y)) continue;
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
    perna(x0 + 1.5, y0 + 1); perna(x1 - 2.5, y0 + 1); perna(x0 + 1.5, y1 - 2); perna(x1 - 2.5, y1 - 2);
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
        const v = e.axis === 'v', cx = v ? e.px + 2 : e.px + e.tw * 8, cy = v ? e.py + 16 : e.kind === 'porta-vidro' || e.front ? e.py + 2 : e.py + 14;
        alvo = alguem(todos, cx, cy, 34) ? 1 : 0;
      }
      e.open = (e.open || 0) + (alvo - (e.open || 0)) * Math.min(1, dt * 7);
    }
  }

  /* ------------------------------------------------------------------ */
  /* O que dá para fazer com E                                           */
  /* ------------------------------------------------------------------ */
  function useLabel(game, e) {
    if (e.dica) return e.dica;
    if (e.kind === 'placa') return 'Ler a placa';
    if (e.id === 'LOGO') return 'Ver o logo';
    if (e.id === 'FRASE') return 'Ler a parede';
    if (e.kind === 'quadro') return 'Ler o quadro';
    if (e.id === 'ENTRADA') return 'Sair pela porta de vidro';
    if (e.kind === 'porta') return e.front ? 'Voltar ao corredor' : !e.to ? 'Sala ' + e.sala : e.sala === 1 ? 'Entrar na sala de ADS' : 'Entrar na Sala ' + e.sala;
    return null;
  }
  function use(game, e) {
    if (e.dica) return game.toast(e.texto);
    if (e.kind === 'placa') return game.toast(e.text);
    if (e.id === 'LOGO') return game.toast('Faculdade Serra Dourada · Canaã dos Carajás');
    if (e.id === 'FRASE') return game.toast('“Estudar aqui é dar um passo a mais rumo aos seus sonhos!”');
    if (e.kind === 'quadro') return game.toast('O quadro ainda está em branco (sala provisória).');
    if (e.id === 'ENTRADA') return game.loadMap(SAIDA);
    if (e.kind === 'porta') return e.to ? game.loadMap(e.to, e.toSpawn) : game.toast('Sala ' + e.sala + ' · fechada');
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
         direita   parede com portas de vidro de salas, ar-condicionado, extintor e avisos; essa
                   parede acaba no canto do saguão; o logo fica na parede do saguão, virado para a entrada
         fundo     uma sala de vidro (parede vermelha lá dentro, como na foto)
       à direita   o saguão (colunas 19 a 24), comprido, que passa por:
                   o logo (tapete e poltronas vermelhas na frente),
                   a secretaria (linhas 22 a 25), aberta para o saguão, com a mesa redonda e 3 notebooks,
                   o corredor (linhas 17 a 20), que entra para a esquerda da tela
                   e, no fim, a parede verde com a frase (atrás dela fica a sala de ADS)
       corredor    passa atrás da secretaria e cruza com o corredor das salas (colunas 12 a 14, linhas
                   1 a 16), que sobe à direita: 4 salas de cada lado, cada porta logo depois da parede
                   que separa as salas. A 1ª do lado direito é a sala de ADS (Sala 1). O corredor de
                   baixo continua um pouco para a esquerda; ali fica a porta da 1ª sala do outro lado
                   (Sala 2). As outras 6 portas (Salas 3 a 8) estão fechadas: ainda não têm sala. */
  TILES_FAC = [
    // 'M' madeira · 'G' faixa tátil · 'P' porta de sala · 'o' porta de vidro · 'x' lado de fora · '#' parede
    '##########################',
    '############MMM###########', // (a faixa para 1 tile antes da parede do fim do corredor)
    ...Array(14).fill('############MGM###########'),
    '#########P##MGM###########',
    '#######MMMMMMGMMMMMMMMMMMx',
    '#######MMMMMMGGGGGGGGMMMMx',
    '#######MMMMMMMMMMMMMGMMMMx',
    '#######MMMMMMMMMMMMMGMMMMx',
    '###################MGMMMMx',
    '################MMMMGMMMMx',
    '################MMMMGMMMMx',
    '################MMMMGMMMMx',
    '################MMMMGMMMMx',
    '################MMMMGMMMMx',
    '################MMMMGMMMMx',
    '#MMMMMMMMMMMMMMMMMMMGMMMMx',
    '#MMMMMMMMMMMMMMMMMMMGMMMMx',
    '#MMMMMMMMMMMMMMMMMMMGMMMMx',
    '#MMMMMMMMMMMMMMMMMMMGMMMMo',
    '#MMMMMMMMMMMMMMMMMMMGGGGMo', // (a faixa começa 1 tile antes da porta e vira na coluna 20; não passa rente às mesinhas)
    '#MMMMMMMMMMMMMMMMMMMMMMMMx',
    // o corredor de estudo (colunas 5 a 18) vai 3 linhas mais para fora: a vidraça fica na linha 37
    // (a sala de vidro do fundo, colunas 1 a 4, e o saguão, colunas 19 a 24, continuam como antes)
    '#####MMMMMMMMMMMMMM#######',
    '#####MMMMMMMMMMMMMM#######',
    '#####MMMMMMMMMMMMMM#######',
    '##########################',
  ];

  const itens = [];
  const add = (o) => itens.push(o);
  const naParede = (o) => add(Object.assign({ wall: true, solid: false }, o));
  // assento virado para a sua mesa: face = direção (ver pecas3d), tuck = quanto entra para baixo da mesa (px).
  // (model leva a direção para o motor guardar um desenho por direção)
  const assento = (o, face, tuck) => add(Object.assign(o, { face, tuck: tuck || 0, model: 'f' + face + '-' + (tuck || 0) }));
  const lustre = (host, tx, ty, variant) => add({ kind: 'pendente', host, tx, ty, variant, solid: false, glow: COR.ambar });

  // 1. Entrada: porta de vidro na ponta direita, borda baixa da parede, plantas dos dois lados
  const XE = 25; // coluna da porta de vidro (a ponta direita do mapa)
  add({ id: 'ENTRADA', kind: 'porta-vidro', axis: 'v', tx: XE, ty: 19, th: 2, solid: false, drawIso: desenharVidro, isoRect: [XE * T, 19 * T, XE * T + 4, 21 * T], isoH: 44 });
  add({ kind: 'borda', tx: XE, ty: 5, th: 14, drawIso: desenharBorda, isoRect: [XE * T, 5 * T, XE * T + 4, 19 * T], isoH: 8 });
  add({ kind: 'planta-alta', tx: 24, ty: 18 });
  add({ kind: 'planta-alta', tx: 24, ty: 21, variant: 'folhas' });

  // 2. As mesas, em frente à porta
  // esquerda (sul): a vidraça é a parede da frente, de vidro
  // A VIDRAÇA (fotos 3 e 4): vidro do chão ao teto, sem viga, sem guarda-corpo e sem base escura; só montantes
  // finos e bem espaçados, reflexo leve e uma soleira fina. Cinco peças compridas (uma por trecho reto), rentes
  // à borda do piso. O isoRect de cada uma fica logo do lado de fora (1 px), sem encostar no que está dentro:
  // assim a ordem de desenho nunca entra em ciclo (com o vidro tile a tile e as bordas baixas do motor ela
  // entrava, e um aluno sentado chegava a ser desenhado antes da mesa).
  //   em px do mapa (já com as linhas finais: a vidraça da sala do fundo e do saguão na linha 34, a do corredor na 37)
  const fachada = (eixo, lin, a0, a1, rect) => add({ kind: 'fachada', eixo, lin, a0, a1, tx: Math.floor((eixo === 'h' ? a0 : lin) / T), ty: Math.floor((eixo === 'h' ? lin : a0) / T) - DY, solid: false, drawIso: desenharFachada, isoRect: rect.map((v, k) => (k % 2 ? v - DY * T : v)), isoH: 34 });
  fachada('h', 34 * T, 1 * T, 5 * T, [1 * T, 34 * T, 5 * T, 34 * T + 1]);        // sala de vidro do fundo
  fachada('v', 5 * T, 34 * T, 37 * T, [5 * T - 1, 34 * T + 1, 5 * T, 37 * T]);     // ponta esquerda da faixa da janela
  fachada('v', 19 * T, 34 * T, 37 * T, [19 * T, 34 * T, 19 * T + 1, 37 * T]);     // o degrau até a vidraça do saguão
  fachada('h', 37 * T, 5 * T, 19 * T, [5 * T, 37 * T, 19 * T, 37 * T + 1]);       // corredor de estudo
  fachada('h', 34 * T, 19 * T, 25 * T, [19 * T, 34 * T, 26 * T, 34 * T + 1]);     // saguão (até a borda da entrada)
  // a quina depois da porta de vidro (antes um bloquinho da borda baixa sobrando no canto): só vidro
  fachada('v', 25 * T, 33 * T, 34 * T, [25 * T, 33 * T, 25 * T + 1, 34 * T]);
  itens[itens.length - 1].solid = true; // (o tile continua fechado, como era com a borda)
  //   (cada pedaço ocupa os seus 4 tiles: o balcão inteiro é sólido, ninguém atravessa ele)
  //   faixa da janela: um balcão branco contínuo encostado no vidro (colunas 6 a 17), com as cadeiras de
  //   escritório brancas viradas para ele, de costas para o corredor; cada mesinha desenha um pedaço de 4 tiles.
  //   isoRect do balcão (12 px de fundo, encostado no vidro) e das cadeiras um depois do outro, sem sobrepor:
  //   a cadeira sempre é desenhada antes do balcão (o assento entra embaixo do tampo, nunca por cima)
  for (const x of [8, 12, 16]) {
    add({ id: 'MESINHA-' + x, kind: 'table', variant: 'office', color: COR.branco, tx: x - 2, tw: 4, ty: 24, drawIso: desenharBalcao, isoH: 14,
      isoRect: [(x - 2) * T, 24 * T + 4, (x + 2) * T, 24 * T + 16], pernas: x === 8 ? 'E' : x === 16 ? 'D' : '' });
    for (const cx of [x - 1, x + 1]) assento({ kind: 'banco-pedra', tx: cx, ty: 23, isoRect: [cx * T + 1, 23 * T + 7, cx * T + 15, 24 * T + 4] }, 'S', 6);
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
  naParede({ kind: 'vidro-sala', tx: 5, ty: 16, tw: 2 });
  naParede({ kind: 'interruptor', tx: 7, ty: 16 });
  naParede({ kind: 'ar-parede', tx: 8, ty: 16, tw: 2 });
  naParede({ kind: 'extintor', tx: 10, ty: 16 });
  naParede({ kind: 'avisos', tx: 11, ty: 16, tw: 2 });
  naParede({ kind: 'vidro-sala', tx: 13, ty: 16, tw: 2 });
  // (hidrante embaixo do ar-condicionado, dentro da faixa da mesa: na coluna 15, encostado na ponta da mesa,
  //  ele deixava a ordem de desenho em ciclo e 2 notebooks da secretaria sumiam atrás da mesa redonda)
  naParede({ kind: 'hidrante', tx: 9, ty: 16 });
  // fundo: sala com parede de vidro (dá para ver dentro, não dá para entrar)
  // (vidro âmbar com faixa fosca e o logo na altura dos olhos, como as salas de vidro das fotos)
  for (let y = 16; y <= 21; y++) add({ kind: 'glass', tx: 4, ty: y, tinta: 'ambar', drawIso: desenharVidroSeg });
  add({ kind: 'table', variant: 'meeting', tx: 2, ty: 18, tw: 1, th: 2 });
  for (const y of [18, 19]) assento({ kind: 'cadeira', tx: 1, ty: y, color: COR.verde }, 'L', 3); // viradas para a mesa
  add({ kind: 'planta-alta', tx: 3, ty: 16 });

  // 3. Saguão, à direita de quem entra
  // o logo fica na parede reta à esquerda do saguão (coluna 15, linhas 23 a 26), virado para a entrada.
  // isoRect: bem fino (só a face da parede) e comprido até a linha 27½, para o motor sempre desenhar o
  // logo DEPOIS da parede branca (senão, com o jogador perto, a parede era pintada por cima e o logo sumia)
  add({ id: 'LOGO', kind: 'logo-parede', tx: 16, ty: 11, th: 4, solid: false, drawIso: desenharLogoParede, isoRect: [16 * T, 11 * T, 16 * T + 0.5, 15.5 * T], isoH: 50, glow: 'rgba(255,170,110,0.05)' });
  // na frente do logo: tapete, poltronas vermelhas, puffs, lustres
  add({ kind: 'tapete', rug: true, tx: 21, ty: 14, tw: 4, th: 4, solid: false });
  add({ id: 'MESINHA', kind: 'table', variant: 'small', color: '#b07a45', tx: 22, ty: 15, tw: 2, drawIso: desenharMesinhaCentro, isoH: 16 });
  // (as poltronas olham para a mesinha, cada uma num ângulo)
  assento({ kind: 'poltrona-vermelha', tx: 21, ty: 16 }, 326);
  assento({ kind: 'poltrona-vermelha', tx: 24, ty: 16 }, 214);
  add({ kind: 'puff', tx: 22, ty: 17 });
  add({ kind: 'puff', tx: 23, ty: 17 });
  lustre('MESINHA', 22.1, 15, 'a');
  lustre('MESINHA', 22.6, 15, 'b');
  lustre('MESINHA', 23.2, 15, 'c');
  // em frente à secretaria: poltronas de madeira com mesinha
  add({ id: 'MESA-MADEIRA', kind: 'table', variant: 'small', color: '#b07a45', tx: 23, ty: 11, drawIso: desenharMesinhaCentro, isoH: 16 });
  assento({ kind: 'poltrona-madeira', tx: 22, ty: 11 }, 'L');
  assento({ kind: 'poltrona-madeira', tx: 24, ty: 11 }, 'O');
  lustre('MESA-MADEIRA', 23, 11, 'b');
  add({ kind: 'planta-alta', tx: 24, ty: 9, variant: 'folhas' });

  // 4. Secretaria (aberta para o saguão): mesa redonda com 3 notebooks
  add({ id: 'MESA-SEC', kind: 'table', tx: 17, ty: 10, tw: 2, th: 2, drawIso: desenharMesaRedonda, isoH: 30, dica: 'Ver a mesa da secretaria', texto: 'Secretaria · mesa redonda com 3 notebooks.' });
  // (posição de cada notebook: um de cada lado e um na frente, em cima do tampo redondo)
  for (const [nx, ny] of [[17.1, 10.8], [17.8, 10.1], [17.8, 10.8]]) add({ kind: 'notebook', host: 'MESA-SEC', tx: nx, ty: ny, solid: false, glow: 'rgba(120,170,240,0.035)' });

  // 5. Fim do saguão: parede verde com a frase (a sala de ADS fica atrás dela), degrau de madeira,
  //    poltronas, puffs, mesa e violão. O caminho para o corredor fica livre nas colunas 19 e 20.
  naParede({ id: 'FRASE', kind: 'parede-verde', tx: 19, ty: 5, tw: 6 });
  add({ kind: 'degrau', tx: 19, ty: 5, tw: 5, drawIso: desenharDegrau, isoRect: [19 * T, 5 * T, 24 * T, 6 * T], isoH: 20 });
  add({ kind: 'violao', tx: 24, ty: 5 });
  add({ kind: 'tapete', rug: true, tx: 21, ty: 6, tw: 4, th: 3, solid: false });
  add({ id: 'MESA-VERDE', kind: 'table', variant: 'small', color: '#c49261', tx: 22, ty: 7, tw: 2, drawIso: desenharMesinhaCentro, isoH: 16 });
  assento({ kind: 'poltrona-vermelha', tx: 21, ty: 7 }, 12);
  assento({ kind: 'poltrona-madeira', tx: 24, ty: 7 }, 'O');
  add({ kind: 'puff', variant: 'cinza', tx: 22, ty: 8 });
  add({ kind: 'puff', variant: 'cinza', tx: 23, ty: 8 });
  assento({ kind: 'poltrona-cinza', tx: 24, ty: 6 }, 146);
  lustre('MESA-VERDE', 22.6, 7, 'a');

  naParede({ kind: 'extintor', tx: 18, ty: 5 });

  // "desce": tudo acima foi escrito com as linhas de antes do corredor das salas existir
  for (const o of itens) {
    o.ty += DY;
    if (o.isoRect) { o.isoRect[1] += DY * T; o.isoRect[3] += DY * T; }
  }

  // (já nas linhas finais) o material dos alunos (faculdade-alunos.js): cadernos, livros e notebooks na
  // mesa comprida e nas mesinhas, na frente de quem estuda; mochilas largadas no chão
  for (const [kind, x, host, color] of [['caderno', 8, 'MESA-1', '#c4553c'], ['notebook', 9, 'MESA-1'], ['livro', 10, 'MESA-1', '#2f6a4a'],
    ['caderno', 13, 'MESA-2', '#3a6ea5'], ['notebook', 14, 'MESA-2'], ['livro', 12, 'MESINHA-12', '#8e5cc4'], ['caderno', 16, 'MESINHA-16', '#e8a33a']]) {
    add({ kind, host, tx: x, ty: host.indexOf('MESA-') === 0 ? 31 : 36.45, // (na janela: em cima do balcão, junto do vidro)
      color, solid: false, glow: kind === 'notebook' ? 'rgba(120,170,240,0.035)' : undefined });
  }
  add({ kind: 'mochila', tx: 10, ty: 35.1, color: '#2d3e5c', solid: false }); // (entre duas cadeiras da janela)
  add({ kind: 'mochila', tx: 17.15, ty: 32.2, color: '#c4553c', solid: false }); // (no pé da última cadeira, na ponta da mesa)
  add({ kind: 'mochila', tx: 23.6, ty: 25.3, color: '#2f6a4a', solid: false });

  // 6. Corredor das salas (já nas linhas finais). Cada sala que abre é um mapa próprio.
  const NOME_SALA = { 1: 'Sala de ADS · laboratório de informática', 2: 'Laboratório da área da saúde' };
  const VOLTA = { 1: [14, 15], 2: [9, 17] }; // onde o jogador aparece ao sair da sala
  // portas nas paredes dos lados do corredor: lado 'l' = direita de quem sobe (parede baixa, coluna 15),
  // lado 'o' = esquerda (parede alta, coluna 11). Abrem com E (o tile continua sendo parede).
  for (const [n, lado, y] of [[1, 'l', 15], [4, 'l', 11], [6, 'l', 7], [8, 'l', 3], [3, 'o', 11], [5, 'o', 7], [7, 'o', 3]]) {
    const x = lado === 'l' ? 15 : 11, rx = lado === 'l' ? x * T : x * T + T;
    add({ id: 'PORTA-' + n, kind: 'porta', lado, sala: n, tx: x, ty: y, solid: false, drawIso: desenharPortaLado,
      // (lado 'o': retângulo fino e comprido até passar o fim da parede, para o motor sempre desenhar a
      //  porta DEPOIS da parede — o mesmo truque que o logo usava)
      isoRect: lado === 'l' ? [rx, y * T, rx + 4, y * T + T] : [rx, y * T, rx + 0.5, 17.2 * T], isoH: 36, to: n === 1 ? 'faculdade-sala1' : null, toSpawn: [4, 4] });
  }
  // Sala 2: porta na parede do fundo do corredor de baixo (dá para entrar andando)
  add({ id: 'PORTA-2', kind: 'porta', sala: 2, tx: 9, ty: 16, solid: false, drawIso: desenharPorta, isoRect: [9 * T, 16 * T + 12, 9 * T + 16, 16 * T + 16], isoH: 48, to: 'faculdade-sala2', toSpawn: [4, 4] });
  // (isoRect só um pouco mais comprido, até a quina da parede ao lado: sem ciclo na ordem de desenho)
  naParede({ kind: 'placa', variant: '2', tx: 10, ty: 17, text: 'Sala 2 · ' + NOME_SALA[2], isoRect: [10 * T, 17 * T, 11 * T + 14, 17 * T + 0.5] });

  // o que fica em cima de uma mesa (globos, cadernos, notebooks, pendentes) usa o mesmo retângulo dela no chão:
  // sempre depois da mesa e na mesma ordem que ela em relação às cadeiras (sem ciclo na ordem de desenho; só
  // muda a ordem, nada muda de lugar)
  for (const o of itens) {
    const h = o.host && itens.find((i) => i.id === o.host);
    if (h && !o.isoRect) o.isoRect = h.isoRect ? h.isoRect.slice() : [h.tx * T, h.ty * T, (h.tx + (h.tw || 1)) * T, (h.ty + (h.th || 1)) * T];
  }

  DL.registerMap({
    id: 'faculdade',
    name: 'Faculdade Serra Dourada',
    tiles: TILES_FAC,
    items: itens,
    rooms: [
      { x: 16, y: 26, w: 3, h: 2, style: ESTILO },                                            // canto do logo
      { x: 19, y: 17, w: 6, h: 17, style: ESTILO },                                           // saguão
      { x: 16, y: 22, w: 3, h: 4, style: ESTILO },                                            // secretaria
      { x: 7, y: 17, w: 12, h: 4, style: ESTILO_CORREDOR },                                   // corredor
      { x: 12, y: 1, w: 3, h: 16, style: ESTILO_CORREDOR },                                   // corredor das salas
      { x: 5, y: 28, w: 14, h: 6, style: ESTILO_CORREDOR },                                   // mesas
      { x: 5, y: 34, w: 14, h: 3, style: ESTILO_CORREDOR },                                   // faixa da janela (corredor alargado)
      // sala de vidro do fundo: painel de madeira escura em ripas atrás do vidro âmbar (foto 4), não mais vermelha
      { x: 1, y: 28, w: 4, h: 6, style: { wall: 'pintada', wallColor: '#6e4f38', ripas: true, light: 'warm' } },
    ],
    spawn: [23, 32], // logo depois da porta de vidro, em cima da faixa tátil, olhando as mesas
    spawnDir: 'left',
    portals: [
      { tx: XE, ty: 31, to: SAIDA }, { tx: XE, ty: 32, to: SAIDA },
      { tx: 9, ty: 16, to: 'faculdade-sala2', spawn: [4, 4] },
    ],
    // (tela interna de 480 px de altura: numa tela Full HD cabe ~50% mais sala, com os pixels nítidos;
    //  minS 2: em telas menores nunca fica menor que antes)
    camera: { tilesWide: 20, minTilesHigh: 9, pixelH: 480, minS: 2, noBase: true }, // (noBase: a base fina é desenhada aqui, ver baseFina) // (antes: tilesWide 15, pixelH 360) (tela interna de 360 px ampliada com pixels nítidos: mesma aparência, 4× menos pixels)

    enter(game) {
      prepararSalas(game);
      esconderMissao(true);
      afastarCamera(game.scene);
      // o lado de fora da vidraça vazio e a base fina do prédio (ver ajustarFachada e baseFina)
      game.scene.underlay = (g, sc) => { ajustarFachada(sc); baseFina(g, sc); };
      const w = game.world;
      // a dica de saída aparece na frente da porta de vidro (o padrão seria do lado de fora)
      const ent = w.byId.ENTRADA;
      ent.ix = ent.px - 8;
      ent.iy = ent.py + 16;
      const logo = w.byId.LOGO; // na frente da parede
      logo.ix = logo.px + 6;
      logo.iy = logo.py + 2 * T;
      const mesa = w.byId['MESA-SEC']; // do lado do saguão
      mesa.ix = mesa.px + 2 * T + 6;
      mesa.iy = mesa.py + T + 4;
      const tx = Math.floor(game.player.x / T), ty = Math.floor(game.player.y / T);
      // portas dos lados do corredor das salas: a dica aparece do lado de dentro do corredor
      for (const e of w.items) if (e.lado) { e.ix = e.lado === 'l' ? e.px - 7 : e.px + T + 7; e.iy = e.py + 10; }
      if (tx === VOLTA[1][0] && ty === VOLTA[1][1]) game.player.dir = 'left'; // voltou da sala de ADS
      else if (tx === VOLTA[2][0] && ty === VOLTA[2][1]) game.player.dir = 'down'; // voltou da Sala 2
      else game.toast('Faculdade Serra Dourada · em frente, as mesas; à direita, o logo, a secretaria e o corredor das salas');
      alunos.iniciar(game, 'faculdade');
    },
    leave() { esconderMissao(false); },
    update(game, dt) { ajustarFachada(game.scene); alunos.atualizar(game, dt); animarPortas(game, dt); },
    overlay(g, sc) { alunos.desenharFalas(g, sc); },
    useLabel,
    use,
  });

  /* ------------------------------------------------------------------ */
  /* As 2 salas                                                          */
  /*   Sala 1: sala de ADS, laboratório de informática (mesas e notebooks) */
  /*   Sala 2: laboratório da área da saúde (esqueleto, fóssil, órgãos)   */
  /* ------------------------------------------------------------------ */
  const PRETA = '#1e2126';
  // mesa de 2 tiles com uma cadeira atrás de cada lugar (o corredor do meio, x 3 e 4, fica livre)
  const bancada = (id, tx, ty, cor, cadeira) => [
    { id, kind: 'table', variant: 'office', color: cor, tx, ty, tw: 2 },
    { kind: 'cadeira', rot: 1, color: cadeira, tx, ty: ty + 1 },
    { kind: 'cadeira', rot: 1, color: cadeira, tx: tx + 1, ty: ty + 1 },
  ];
  const sobre = (host, kind, tx, ty, extra) => Object.assign({ kind, host, tx, ty, solid: false }, extra);

  const SALAS = {
    1: {
      nome: 'Sala de ADS · laboratório de informática',
      quadro: 'No quadro: "Aula de hoje: lógica de programação".',
      itens: () => {
        const out = [];
        // 4 mesas pretas, 2 notebooks em cada
        [[1, 2], [5, 2], [1, 4], [5, 4]].forEach(([x, y], k) => {
          const id = 'INFO-' + k;
          out.push(...bancada(id, x, y, PRETA, '#3a3f47'));
          for (const nx of [x, x + 1]) {
            out.push(sobre(id, 'notebook', nx, y, { glow: 'rgba(120,170,240,0.035)', dica: 'Ver o notebook', texto: 'Notebook do laboratório (provisório: ainda não liga).' }));
          }
        });
        out.push({ kind: 'planta-alta', tx: 7, ty: 6 });
        return out;
      },
    },
    2: {
      nome: 'Laboratório da área da saúde',
      quadro: 'No quadro: "Anatomia: sistema circulatório".',
      itens: () => {
        const ver = (dica, texto) => ({ dica, texto });
        return [
          Object.assign({ kind: 'esqueleto', tx: 1, ty: 2 }, ver('Ver o esqueleto', 'Esqueleto humano para as aulas de anatomia.')),
          Object.assign({ kind: 'vitrine', tx: 7, ty: 2 }, ver('Ver a vitrine', 'Vitrine com órgãos conservados em potes.')),
          Object.assign({ kind: 'vitrine', tx: 7, ty: 3 }, ver('Ver a vitrine', 'Vitrine com órgãos conservados em potes.')),
          Object.assign({ kind: 'fossil', tx: 5, ty: 6, tw: 2 }, ver('Ver o fóssil', 'Fóssil de um pequeno dinossauro, montado no pedestal.')),
          ...bancada('SAUDE-1', 1, 4, COR.branco, '#c9cdd2'),
          sobre('SAUDE-1', 'torso', 1, 4, ver('Ver o modelo', 'Modelo de anatomia: metade pele, metade órgãos.')),
          sobre('SAUDE-1', 'coracao', 2, 4, ver('Ver o coração', 'Modelo de coração humano.')),
          ...bancada('SAUDE-2', 5, 3, COR.branco, '#c9cdd2'),
          sobre('SAUDE-2', 'cranio', 5, 3, ver('Ver o crânio', 'Crânio fóssil de um animal.')),
          sobre('SAUDE-2', 'microscopio', 6, 3, ver('Usar o microscópio', 'No microscópio: células de uma folha.')),
          { id: 'SAUDE-3', kind: 'table', variant: 'office', color: COR.branco, tx: 2, ty: 2 },
          sobre('SAUDE-3', 'cerebro', 2, 2, ver('Ver o cérebro', 'Modelo de cérebro humano.')),
        ];
      },
    },
  };

  [1, 2].forEach((n) => {
    const S = SALAS[n], volta = VOLTA[n];
    DL.registerMap({
      id: 'faculdade-sala' + n,
      name: 'Sala ' + n + ' · ' + S.nome,
      tiles: [
        '#########',
        '#MMMMMMM#',
        '#MMMMMMM#',
        '#MMMMMMM#',
        '#MMMMMMM#',
        '#MMMMMMM#',
        '#MMMMMMM#',
        '####o####',
      ],
      items: [
        { kind: 'quadro', wall: true, solid: false, tx: 3, ty: 1, tw: 3, dica: 'Ler o quadro', texto: S.quadro },
        { kind: 'placa', wall: true, solid: false, variant: String(n), tx: 1, ty: 1, text: 'Sala ' + n + ' · ' + S.nome },
        { kind: 'ar-parede', wall: true, solid: false, tx: 6, ty: 1, tw: 2 },
        ...S.itens(),
        { id: 'PORTA', kind: 'porta', front: true, sala: n, tx: 4, ty: 7, solid: false, drawIso: desenharPorta, isoRect: [64, 112, 80, 116], isoH: 36, to: 'faculdade', toSpawn: volta },
      ],
      rooms: [{ x: 1, y: 1, w: 7, h: 6, style: ESTILO }],
      spawn: [4, 4],
      spawnDir: 'up',
      portals: [{ tx: 4, ty: 7, to: 'faculdade', spawn: volta }],
      camera: { tilesWide: 11, minTilesHigh: 8, pixelH: 360, minS: 1 },
      enter(game) {
        prepararSalas(game);
        esconderMissao(true);
        const porta = game.world.byId.PORTA;
        porta.iy = porta.py - 4;
        game.toast('Sala ' + n + ' · ' + S.nome);
        alunos.iniciar(game, 'sala' + n);
      },
      leave() { esconderMissao(false); },
      update(game, dt) { alunos.atualizar(game, dt); animarPortas(game, dt); },
      overlay(g, sc) { alunos.desenharFalas(g, sc); },
      useLabel,
      use,
    });
  });
})();

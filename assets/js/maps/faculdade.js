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

   Partes (para quem entra pela porta de vidro):
     1. Em frente: o corredor, com a faixa tátil reta para dentro dele
     2. À direita: o saguão, com o logo, o tapete e as poltronas; a faixa faz um ramo até ele
     3. No canto mais à direita do saguão: a parede verde com a frase
     4. Salas: 2 portas de madeira no fundo do saguão (como na faculdade de verdade); cada porta
        leva a uma sala (mapa próprio, PROVISÓRIA) com placa de texto. As salas são mapas separados porque, na visão isométrica,
        a parede alta do fundo esconderia quem estivesse atrás dela.

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
    madeira: ['#c48a51', '#bd834b', '#ca935a', '#b77c46', '#c7905a'], // piso de madeira clara
    junta: '#9a6538',
    guia: '#6b7077', guiaClaro: '#8d939b', guiaEscuro: '#4e5258',     // faixa tátil cinza
    porta: '#b8652f', portaEscura: '#8e4a20',                          // portas de madeira laranja
    ripa: ['#b5623a', '#a35530', '#6a321a'],                          // parede de ripas do logo
    vermelha: '#c4553c',                                               // poltronas vermelhas
    creme: '#d9c9a5',                                                  // sofá
    verde: '#6f8f7c', laranja: '#c8683a',                              // cadeiras do corredor
    branco: '#e6e7e8',                                                 // mesas brancas
    placa: '#1f7f96',                                                  // placas azuis das salas
    ambar: 'rgba(255,186,96,0.11)', globo: 'rgba(255,240,214,0.09)',   // luz das lâmpadas
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
  const MADEIRA_ESC = COR.madeira.map((c) => shade(c, -0.1));
  const MADEIRA_VEIO = COR.madeira.map((c) => shade(c, -0.16));
  function madeira(g, px, py, x, y) {
    // tábuas compridas (48 px) deitadas no sentido x, 4 por tile, emendas desencontradas
    for (let r = 0; r < 4; r++) {
      const fila = y * 4 + r, off = Math.floor(hash(fila * 977 + 13) * 48), y0 = py + r * 4;
      for (let i = 0; i < 16; i++) {
        const X = px + i, k = Math.floor((X + off) / 48), n = Math.floor(hash(fila * 131 + k * 71) * COR.madeira.length);
        R(g, X, y0, 1, 3, COR.madeira[n]);
        R(g, X, y0 + 3, 1, 1, MADEIRA_ESC[n]);
        if ((X + off) % 48 === 0) R(g, X, y0, 1, 4, COR.junta);
        else if (hash(X * 13 + fila * 7) > 0.94) R(g, X, y0 + 1, 2, 1, MADEIRA_VEIO[n]);
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
  // a faixa tátil: linhas (direcional) no caminho reto; bolinhas (alerta) nas curvas e nas pontas
  let TILES_FAC = [];
  const ehFaixa = (x, y) => { const c = (TILES_FAC[y] || '')[x]; return c === 'G' || c === 'o'; };
  function faixa(g, px, py, x, y) {
    madeira(g, px, py, x, y);
    const N = ehFaixa(x, y - 1), S = ehFaixa(x, y + 1), L = ehFaixa(x + 1, y), O = ehFaixa(x - 1, y);
    const vert = N && S && !L && !O, horiz = L && O && !N && !S;
    const base = COR.guia, claro = COR.guiaClaro, esc = COR.guiaEscuro;
    if (vert) {
      R(g, px + 4, py, 8, 16, base);
      for (const k of [5, 8, 10]) { R(g, px + k, py, 1, 16, claro); R(g, px + k + 1, py, 1, 16, esc); }
      return;
    }
    if (horiz) {
      R(g, px, py + 4, 16, 8, base);
      for (const k of [5, 8, 10]) { R(g, px, py + k, 16, 1, claro); R(g, px, py + k + 1, 16, 1, esc); }
      return;
    }
    // alerta: um quadrado com bolinhas, e o braço da faixa até os vizinhos
    R(g, px + 3, py + 3, 10, 10, base);
    if (N) R(g, px + 4, py, 8, 3, base);
    if (S) R(g, px + 4, py + 13, 8, 3, base);
    if (L) R(g, px + 13, py + 4, 3, 8, base);
    if (O) R(g, px, py + 4, 3, 8, base);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      R(g, px + 4 + i * 3, py + 4 + j * 3, 2, 2, claro);
      R(g, px + 5 + i * 3, py + 5 + j * 3, 1, 1, esc);
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
        R(g, x, 1, w, 1, shade(c, -0.06));
        R(g, x, H - 5, w, 1, shade(c, 0.12));
        R(g, x, H - 4, w, 4, shade(c, -0.18)); // rodapé
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

  function poltronaVermelha(g, e) {
    const { c, b } = chao(e), mad = '#b98552', madE = '#8a5f36', v = COR.vermelha;
    R(g, c - 4, b - 7, 1, 6, madE); R(g, c + 3, b - 7, 1, 6, madE);
    R(g, c - 6, b - 4, 1, 4, mad); R(g, c - 5, b - 6, 1, 2, mad); R(g, c + 5, b - 4, 1, 4, mad); R(g, c + 4, b - 6, 1, 2, mad);
    // encosto arredondado
    R(g, c - 4, b - 20, 8, 1, shade(v, 0.12));
    R(g, c - 5, b - 19, 10, 1, shade(v, 0.12));
    R(g, c - 6, b - 18, 12, 8, shade(v, -0.05));
    R(g, c - 5, b - 18, 10, 1, shade(v, 0.18));
    R(g, c + 5, b - 18, 1, 8, shade(v, -0.25));
    // assento
    R(g, c - 6, b - 10, 12, 4, v);
    R(g, c - 6, b - 10, 12, 1, shade(v, 0.22));
    R(g, c - 6, b - 7, 12, 1, shade(v, -0.28));
    R(g, c - 6, b - 6, 12, 1, '#a06d40');
    R(g, c + 5, b - 16, 1, 10, '#a06d40');
  }
  function poltronaCinza(g, e) {
    const { c, b } = chao(e), base = '#a3a29e', cl = '#bab9b5', esc = '#7f7e7a';
    R(g, c - 5, b - 15, 10, 1, cl);
    R(g, c - 6, b - 14, 12, 1, cl);
    R(g, c - 7, b - 13, 14, 11, base);
    R(g, c - 5, b - 12, 10, 4, '#8e8d89');
    R(g, c - 5, b - 12, 10, 1, esc);
    R(g, c + 6, b - 13, 1, 11, esc);
    R(g, c - 6, b - 2, 12, 1, esc);
    R(g, c - 5, b - 1, 10, 1, '#5e5d5a');
    for (let i = 0; i < 9; i++) R(g, c - 6 + Math.floor(hash(i * 7 + 1) * 12), b - 8 + Math.floor(hash(i * 13 + 2) * 6), 1, 1, i % 2 ? cl : esc);
  }
  function poltronaMadeira(g, e) {
    const { c, b } = chao(e), mad = '#a9693a', cl = '#c4834e', esc = '#7c4a26', alm = '#d4763f';
    R(g, c - 5, b - 5, 1, 5, esc); R(g, c + 4, b - 5, 1, 5, esc);
    R(g, c - 7, b - 15, 2, 10, mad); R(g, c + 5, b - 15, 2, 10, esc);
    R(g, c - 5, b - 17, 10, 8, mad);
    R(g, c - 5, b - 17, 10, 1, cl);
    R(g, c - 5, b - 14, 10, 1, esc); R(g, c - 5, b - 11, 10, 1, esc);
    R(g, c - 5, b - 9, 10, 3, alm);
    R(g, c - 5, b - 9, 10, 1, '#e58a52');
    R(g, c - 6, b - 6, 12, 1, esc);
  }
  // banco do corredor: bloco cinza arredondado (como uma pedra) com assento verde
  function bancoPedra(g, e) {
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
    const cinza = e.variant === 'cinza', { c, b } = chao(e);
    const base = cinza ? '#b9bcbf' : '#9cafbf', cl = cinza ? '#cfd2d4' : '#b8c8d6', esc = cinza ? '#8f9396' : '#7d8fa0';
    R(g, c - 4, b - 9, 8, 1, cl);
    R(g, c - 5, b - 8, 10, 7, base);
    R(g, c - 5, b - 8, 10, 1, cl);
    R(g, c + 4, b - 8, 1, 7, esc);
    R(g, c - 4, b - 1, 8, 1, esc);
  }
  // cadeira do corredor e das salas: rot 0 = de frente para a câmera, rot 1 = de costas
  function cadeira(g, e) {
    const { c, b } = chao(e), cor = e.color || COR.verde, esc = shade(cor, -0.32), cl = shade(cor, 0.16);
    R(g, c - 5, b - 7, 1, 7, esc); R(g, c + 4, b - 7, 1, 7, esc);
    R(g, c - 3, b - 7, 1, 6, esc); R(g, c + 2, b - 7, 1, 6, esc);
    if ((e.rot | 0) === 1) {
      R(g, c - 4, b - 18, 8, 1, cl);
      R(g, c - 5, b - 17, 10, 9, cor);
      R(g, c - 5, b - 17, 10, 1, cl);
      R(g, c + 4, b - 17, 1, 9, esc);
      R(g, c - 5, b - 8, 10, 1, esc);
    } else {
      R(g, c - 4, b - 18, 8, 1, cl);
      R(g, c - 5, b - 17, 10, 7, shade(cor, -0.08));
      R(g, c - 4, b - 16, 8, 5, shade(cor, -0.16));
      R(g, c - 5, b - 9, 10, 2, cor);
      R(g, c - 5, b - 9, 10, 1, cl);
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
      for (let k = 0; k < 90; k++) {
        const a = hash(k * 31 + 5) * Math.PI * 2, r = Math.sqrt(hash(k * 17 + 9));
        const x = Math.round(c + Math.cos(a) * r * 8), y = Math.round(b - 28 + Math.sin(a) * r * 11);
        R(g, x, y, 2, 1, VERDES[k % 4]);
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
    const larg = [2, 4, 6, 6, 6, 6, 4, 2];
    larg.forEach((w, i) => {
      const x = c + 1 - (w >> 1), y = boca + 1 + i;
      R(g, x, y, w, 1, '#d98f33');
      if (w > 2) R(g, x + w - 1, y, 1, 1, '#b8742a'); // lado da sombra
    });
    R(g, c - 1, boca + 3, 3, 3, '#ffcf73');
    R(g, c, boca + 4, 1, 1, '#fff3c4');
  }
  // bolinhas brancas penduradas (corredor)
  function globos(g, e) {
    const c = e.px + 8, bolas = [[44, 2], [38, 3], [30, 2], [24, 3]];
    const topo = linha(e, 50), fim = linha(e, bolas[bolas.length - 1][0]);
    R(g, c - 2, topo, 5, 1, '#1a1a1a');
    R(g, c, topo, 1, fim - topo, '#1a1a1a');
    for (const [z, r] of bolas) {
      const cy = linha(e, z);
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
        const d = Math.hypot(dx, dy) / (1 + 0.04 * Math.sin(a * 3)); // borda levemente ondulada
        if (d > 1) continue;
        R(tg, i, j, 1, 1, d > 0.93 ? '#c9bda5' : hash(i * 31 + j * 17) > 0.9 ? '#d6cbb5' : '#e6dcc9');
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
    const x0 = e.px + 2, y0 = e.py - 33;
    R(g, x0, y0, 28, 8, '#eef0f2');
    R(g, x0, y0, 28, 1, '#ffffff');
    R(g, x0 + 1, y0 + 6, 26, 1, '#9aa3b0');
    R(g, x0, y0 + 8, 28, 1, '#b8bec7');
    R(g, x0 + 24, y0 + 2, 1, 1, '#7ee0a1');
  }
  function extintor(g, e) {
    const x0 = e.px + 6;
    R(g, x0 - 1, e.py - 21, 6, 8, '#d23a32'); R(g, x0 + 1, e.py - 19, 2, 4, '#ffffff');
    R(g, x0, e.py - 10, 4, 2, '#2a2a2a');
    R(g, x0, e.py - 8, 4, 10, '#d23a32');
    R(g, x0, e.py - 8, 1, 10, '#ee6a5e');
    R(g, x0 + 4, e.py - 9, 1, 6, '#1a1a1a');
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
    const x0 = e.px + 1, W = e.tw * T - 2, top = e.py - 26, alu = '#9aa3b0';
    R(g, x0, top, W, 34, '#3b3833');
    R(g, x0, top, W, 14, '#4d443a');
    for (let k = 0; k < 3; k++) R(g, x0 + 4 + k * 9, top + 4, 3, 3, '#f1e6c8'); // luzes lá dentro
    R(g, x0 + 2, top + 22, W - 4, 4, '#2f3a2f'); // mesa e cadeiras lá dentro
    R(g, x0, top + 18, W, 2, '#c8ccd2'); // faixa de vidro jateado
    R(g, x0, top, 1, 34, alu); R(g, x0 + W - 1, top, 1, 34, alu); R(g, x0, top, W, 1, alu);
    R(g, x0 + (W >> 1), top, 1, 34, alu);
    R(g, x0 + (W >> 1) - 2, top + 12, 1, 7, '#e3e7eb'); R(g, x0 + (W >> 1) + 2, top + 12, 1, 7, '#e3e7eb');
    R(g, x0 + W + 1, top + 4, 3, 6, COR.placa);
  }
  // quadro de avisos de acrílico com papéis coloridos
  function avisos(g, e) {
    const x0 = e.px + 4, W = e.tw * T - 8, top = e.py - 26;
    R(g, x0, top, W, 18, '#dfe3e6');
    R(g, x0, top, W, 1, '#f4f6f7');
    const cores = ['#c4553c', '#e8c15a', '#3a6ea5', '#7ee0a1', '#f4f6f7'];
    for (let k = 0; k < 6; k++) R(g, x0 + 2 + (k % 3) * 7, top + 2 + Math.floor(k / 3) * 8, 5, 6, cores[(k + e.tx) % cores.length]);
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
    logo, placa, 'ar-parede': arCondicionado, extintor, quadro, 'parede-verde': paredeVerde, 'vidro-sala': vidroSala, avisos,
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
    const K = DL.isoKit, c = '#323d5c', y1 = e.py + e.th * T;
    K.isoT(g, sc);
    K.box(g, e.px, e.py, e.px + 4, y1, 0, 5, { s: shade(c, 0.06), e: shade(c, -0.3), t: shade(c, 0.38) });
    return caixaTela(e.px, e.py, e.px + 4, y1, 0, 5);
  }
  // a parede de ripas com o logo numa parede que corre no sentido y (lado esquerdo do saguão).
  // Usa o mesmo desenho do logo, pintado uma vez numa imagem e "colado" na face da parede que dá
  // para o saguão (x = e.px), lido da esquerda para a direita na tela.
  let LOGO_IMG = null;
  function desenharLogoLateral(g, sc, e) {
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
  // abre a porta quando o jogador chega perto, fecha quando ele se afasta
  function animarPortas(game, dt) {
    const p = game.player;
    for (const e of game.world.items) {
      if (e.kind !== 'porta' && e.kind !== 'porta-vidro') continue;
      const v = e.axis === 'v', cx = v ? e.px + 2 : e.px + e.tw * 8, cy = v ? e.py + 16 : e.kind === 'porta-vidro' || e.front ? e.py + 2 : e.py + 14;
      const alvo = Math.hypot(p.x - cx, p.y - cy) < 34 ? 1 : 0;
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
    if (e.kind === 'porta') return e.front ? 'Voltar ao saguão' : 'Entrar na Sala ' + e.sala;
    return null;
  }
  function use(game, e) {
    if (e.dica) return game.toast(e.texto);
    if (e.kind === 'placa') return game.toast(e.text);
    if (e.id === 'LOGO') return game.toast('Faculdade Serra Dourada · Canaã dos Carajás');
    if (e.id === 'FRASE') return game.toast('“Estudar aqui é dar um passo a mais rumo aos seus sonhos!”');
    if (e.kind === 'quadro') return game.toast('O quadro ainda está em branco (sala provisória).');
    if (e.id === 'ENTRADA') return game.loadMap(SAIDA);
    if (e.kind === 'porta') return game.loadMap(e.to, e.toSpawn);
  }

  // as salas escondem o painel de missão do DataLab (ele volta quando o jogador sai)
  const esconderMissao = (sim) => { const m = $('mission'); if (m) m.hidden = sim; };

  /* ------------------------------------------------------------------ */
  /* O mapa da faculdade                                                 */
  /* ------------------------------------------------------------------ */
  const SAIDA = 'datalab'; // PROVISÓRIO: a porta de vidro vai para a rua quando o mapa da rua existir
  const PORTAS = [16, 18]; // x das portas das salas (só 2: no prédio real não há salas mais à direita)

  /* Planta (quem entra pela porta de vidro, na ponta direita, olha para a esquerda da tela):
       em frente   o corredor (linhas 9 a 14), com a faixa tátil reta para dentro dele
         esquerda  a vidraça (parede da frente, de vidro), com os bancos "pedra" e mesinhas
                   no fundo, ao lado da mesa comprida
         meio      a mesa comprida, cadeiras verdes e laranja, bolinhas de luz
         direita   parede com portas de vidro de salas, ar-condicionado, extintor e avisos
         fundo     uma sala de vidro (parede vermelha lá dentro, como na foto)
       à direita   o saguão (linhas 1 a 8): logo, tapete, poltronas, portas das Salas 1 e 2;
                   no canto mais à direita, a parede verde com a frase, o degrau e o violão */
  TILES_FAC = [
    // 'M' madeira · 'G' faixa tátil · 'P' porta de sala · 'o' porta de vidro · 'x' lado de fora · '#' parede
    '################P#P#############',
    '################MMMMMMMMMMMMMMMx',
    '################MMMMMMMMGMMMMMMx',
    '################MMMMMMMMGMMMMMMx',
    '################MMMMMMMMGMMMMMMx',
    '################MMMMMMMMGMMMMMMx',
    '################MMMMMMMMGMMMMMMx',
    '################MMMMMMMMGMMMMMMx',
    '################MMMMMMMMGMMMMMMx',
    '#MMMMMMMMMMMMMMMMMMMMMMMGMMMMMMx',
    '#MMMMMMMMMMMMMMMMMMMMMMMGMMMMMMx',
    '#MMMMMMMMMMMMMMMMMMMMMMMGMMMMMMx',
    '#MMMMMMMMMMMMMMMMMMMMMMMGMMMMMMo',
    '#MMMMMMMMMMMMMMMGGGGGGGGGGGGGGGo',
    '#MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMx',
    '################################',
  ];

  const itens = [];
  const add = (o) => itens.push(o);
  const naParede = (o) => add(Object.assign({ wall: true, solid: false }, o));
  const lustre = (host, tx, ty, variant) => add({ kind: 'pendente', host, tx, ty, variant, solid: false, glow: COR.ambar });

  // 1. Entrada: porta de vidro na ponta direita do corredor, borda baixa da parede, plantas
  const XE = 31; // coluna da porta de vidro (a ponta direita do mapa)
  add({ id: 'ENTRADA', kind: 'porta-vidro', axis: 'v', tx: XE, ty: 12, th: 2, solid: false, drawIso: desenharVidro, isoRect: [XE * T, 12 * T, XE * T + 4, 14 * T], isoH: 44 });
  add({ kind: 'borda', tx: XE, ty: 1, th: 11, drawIso: desenharBorda, isoRect: [XE * T, T, XE * T + 4, 12 * T], isoH: 8 });
  add({ kind: 'borda', tx: XE, ty: 14, th: 1, drawIso: desenharBorda, isoRect: [XE * T, 14 * T, XE * T + 4, 15 * T], isoH: 8 });
  add({ kind: 'planta-alta', tx: 30, ty: 10 });
  add({ kind: 'planta-alta', tx: 30, ty: 9, variant: 'folhas' });

  // 2. Corredor, em frente à porta
  // esquerda (sul): a vidraça é a parede da frente, de vidro
  for (let x = 1; x <= 30; x++) add({ kind: 'glassH', tx: x, ty: 15, solid: false });
  //   ao lado da mesa comprida: bancos "pedra" com mesinhas brancas
  for (const x of [8, 12, 16]) {
    add({ kind: 'table', variant: 'office', color: COR.branco, tx: x, ty: 14 });
    add({ kind: 'banco-pedra', tx: x - 1, ty: 14 });
    add({ kind: 'banco-pedra', tx: x + 1, ty: 14 });
  }
  // meio: a mesa comprida, cadeiras dos dois lados, bolinhas de luz em fila em cima
  add({ id: 'MESA-1', kind: 'table', variant: 'office', color: COR.branco, tx: 7, ty: 11, tw: 8 });
  for (let x = 7; x < 15; x++) {
    add({ kind: 'cadeira', tx: x, ty: 10, rot: 0, color: (x + 1) % 4 === 0 ? COR.laranja : COR.verde });
    add({ kind: 'cadeira', tx: x, ty: 12, rot: 1, color: x % 3 === 0 ? COR.laranja : COR.verde });
  }
  for (const gx of [8, 10.5, 13]) add({ kind: 'globos', host: 'MESA-1', tx: gx, ty: 11, solid: false, glow: COR.globo });
  // direita (norte): portas de vidro de salas, ar-condicionado, extintor e quadro de avisos
  naParede({ kind: 'vidro-sala', tx: 5, ty: 9, tw: 2 });
  naParede({ kind: 'ar-parede', tx: 8, ty: 9, tw: 2 });
  naParede({ kind: 'extintor', tx: 10, ty: 9 });
  naParede({ kind: 'avisos', tx: 11, ty: 9, tw: 2 });
  naParede({ kind: 'vidro-sala', tx: 13, ty: 9, tw: 2 });
  // fundo: sala com parede de vidro (dá para ver dentro, não dá para entrar)
  for (let y = 9; y <= 14; y++) add({ kind: 'glass', tx: 4, ty: y });
  add({ kind: 'table', variant: 'meeting', tx: 2, ty: 11, tw: 1, th: 2 });
  for (const y of [11, 12]) add({ kind: 'cadeira', tx: 1, ty: y, color: COR.verde });
  add({ kind: 'planta-alta', tx: 3, ty: 9 });

  // 3. Saguão, à direita de quem entra: parede de ripas com o logo, tapete, poltronas, puffs, lustres
  // a parede de ripas com o logo fica na parede esquerda do saguão (atrás do sofá), linhas 2 a 5
  // isoRect: bem fino (só a face da parede) e comprido até a linha 8, para o motor sempre desenhar o
  // logo DEPOIS da parede branca (senão, com o jogador perto, a parede era pintada por cima e o logo sumia)
  add({ id: 'LOGO', kind: 'logo-lateral', tx: 16, ty: 2, th: 4, solid: false, drawIso: desenharLogoLateral, isoRect: [16 * T, 2 * T, 16 * T + 0.5, 8.2 * T], isoH: 50, glow: 'rgba(255,170,110,0.05)' });
  add({ kind: 'tapete', rug: true, tx: 20, ty: 2, tw: 4, th: 4, solid: false });
  add({ id: 'MESINHA', kind: 'table', variant: 'small', color: '#b07a45', tx: 21, ty: 3, tw: 2 });
  add({ kind: 'poltrona-vermelha', tx: 20, ty: 4 });
  add({ kind: 'poltrona-vermelha', tx: 23, ty: 4 });
  add({ kind: 'puff', tx: 21, ty: 5 });
  add({ kind: 'puff', tx: 22, ty: 5 });
  lustre('MESINHA', 21.1, 3, 'a');
  lustre('MESINHA', 21.6, 3, 'b');
  lustre('MESINHA', 22.2, 3, 'c');
  // poltronas de madeira com mesinha
  add({ id: 'MESA-MADEIRA', kind: 'table', variant: 'small', color: '#b07a45', tx: 21, ty: 7 });
  add({ kind: 'poltrona-madeira', tx: 20, ty: 7 });
  add({ kind: 'poltrona-madeira', tx: 22, ty: 7 });
  lustre('MESA-MADEIRA', 21, 7, 'b');
  add({ kind: 'planta-alta', tx: 30, ty: 7, variant: 'folhas' });
  // portas das Salas 1 e 2, com placa azul ao lado; extintor
  PORTAS.forEach((x, i) => {
    const n = i + 1;
    add({ id: 'PORTA-' + n, kind: 'porta', sala: n, tx: x, ty: 0, solid: false, drawIso: desenharPorta, isoRect: [x * T, 12, x * T + 16, 16], isoH: 48, to: 'faculdade-sala' + n, toSpawn: [4, 4] });
    naParede({ kind: 'placa', variant: String(n), tx: x + 1, ty: 1, text: 'Sala ' + n + ' · ' + (n === 1 ? 'Laboratório de informática' : 'Laboratório da área da saúde') });
  });
  naParede({ kind: 'extintor', tx: 23, ty: 1 });
  // canto mais à direita: parede verde com a frase, degrau de madeira, poltronas, puffs, mesa e violão
  naParede({ id: 'FRASE', kind: 'parede-verde', tx: 25, ty: 1, tw: 6 });
  add({ kind: 'degrau', tx: 25, ty: 1, tw: 5, drawIso: desenharDegrau, isoRect: [25 * T, T, 30 * T, 2 * T], isoH: 20 });
  add({ kind: 'violao', tx: 30, ty: 1 });
  add({ kind: 'tapete', rug: true, tx: 25, ty: 3, tw: 4, th: 3, solid: false });
  add({ id: 'MESA-VERDE', kind: 'table', variant: 'small', color: '#c49261', tx: 26, ty: 4, tw: 2 });
  add({ kind: 'poltrona-vermelha', tx: 25, ty: 4 });
  add({ kind: 'poltrona-madeira', tx: 28, ty: 4 });
  add({ kind: 'puff', variant: 'cinza', tx: 26, ty: 5 });
  add({ kind: 'puff', variant: 'cinza', tx: 27, ty: 5 });
  add({ kind: 'poltrona-cinza', tx: 29, ty: 3 });
  lustre('MESA-VERDE', 26.6, 4, 'a');

  DL.registerMap({
    id: 'faculdade',
    name: 'Faculdade Serra Dourada',
    tiles: TILES_FAC,
    items: itens,
    rooms: [
      { x: 16, y: 1, w: 15, h: 8, style: ESTILO },                                           // saguão
      { x: 5, y: 9, w: 26, h: 6, style: ESTILO_CORREDOR },                                   // corredor
      { x: 1, y: 9, w: 4, h: 6, style: { wall: 'vermelha', wallColor: '#9e3a2e', light: 'warm' } }, // sala de vidro do fundo
    ],
    spawn: [29, 13], // logo depois da porta de vidro, em cima da faixa tátil, olhando o corredor
    spawnDir: 'left',
    portals: [
      { tx: XE, ty: 12, to: SAIDA }, { tx: XE, ty: 13, to: SAIDA },
      ...PORTAS.map((x, i) => ({ tx: x, ty: 0, to: 'faculdade-sala' + (i + 1), spawn: [4, 4] })),
    ],
    camera: { tilesWide: 15, minTilesHigh: 9 },

    enter(game) {
      prepararSalas(game);
      esconderMissao(true);
      // a dica de saída aparece na frente da porta de vidro (o padrão seria do lado de fora)
      const ent = game.world.byId.ENTRADA;
      ent.ix = ent.px - 8;
      ent.iy = ent.py + 16;
      const logo = game.world.byId.LOGO;
      logo.ix = logo.px + 6;
      logo.iy = logo.py + 40;
      if (game.player.y < 2 * T) game.player.dir = 'down'; // voltou de uma sala
      else game.toast('Faculdade Serra Dourada · o corredor é em frente; o saguão, à direita');
    },
    leave() { esconderMissao(false); },
    update(game, dt) { animarPortas(game, dt); },
    useLabel,
    use,
  });

  /* ------------------------------------------------------------------ */
  /* As 2 salas                                                          */
  /*   Sala 1: laboratório de informática (mesas pretas e notebooks)      */
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
      nome: 'Laboratório de informática',
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

  PORTAS.forEach((portaX, i) => {
    const n = i + 1, S = SALAS[n];
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
        { id: 'PORTA', kind: 'porta', front: true, sala: n, tx: 4, ty: 7, solid: false, drawIso: desenharPorta, isoRect: [64, 112, 80, 116], isoH: 36, to: 'faculdade', toSpawn: [portaX, 1] },
      ],
      rooms: [{ x: 1, y: 1, w: 7, h: 6, style: ESTILO }],
      spawn: [4, 4],
      spawnDir: 'up',
      portals: [{ tx: 4, ty: 7, to: 'faculdade', spawn: [portaX, 1] }],
      camera: { tilesWide: 11, minTilesHigh: 8 },
      enter(game) {
        prepararSalas(game);
        esconderMissao(true);
        const porta = game.world.byId.PORTA;
        porta.iy = porta.py - 4;
        game.toast('Sala ' + n + ' · ' + S.nome);
      },
      leave() { esconderMissao(false); },
      update(game, dt) { animarPortas(game, dt); },
      useLabel,
      use,
    });
  });
})();

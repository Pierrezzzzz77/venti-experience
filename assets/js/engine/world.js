/* Venti Experience — mapas.
   Cada mapa é registrado com DL.registerMap({ ... }) num arquivo próprio em assets/js/maps/.
   O mapa é desenhado em texto: cada letra é um tile de 16 × 16 px.

     '#'  parede (bloqueia; a visão isométrica levanta a parede sozinha)
     '.'  piso de datacenter        ','  piso perfurado (corredor frio)
     '_'  carpete
     (mapas novos podem criar seus próprios pisos com DL.FLOORS['x'] = function (g, px, py, x, y) {...})

   Ideia inspirada no DataLab (world.js: buildWorld / add, sprites.js: renderStatic), mas genérica:
   o DataLab tinha um mapa fixo; aqui qualquer mapa vira o mesmo formato de "mundo". */
(function () {
  'use strict';
  const DL = window.DL, T = DL.T;

  // Aparência dos personagens (copiado do DataLab, world.js → DL.LOOKS.player).
  DL.LOOKS = {
    player: { skin: '#f2c8a0', hair: '#2a1c16', hairStyle: 'short', shirt: '#7c3aed', pants: '#232a36', shoes: '#eceff3', badge: '#ff7a17', lanyard: '#ffc285' },
  };

  /* ---------- pisos ---------- */
  // Quem pinta cada letra do mapa. Tiles que não estão aqui (e não são '#') usam o piso padrão.
  DL.FLOORS = {
    '.': (g, px, py) => DL.floorTile(g, px, py, false),
    ',': (g, px, py) => DL.floorTile(g, px, py, true),
    '_': (g, px, py, x, y) => DL.carpet(g, px, py, x, y),
  };
  // tiles que bloqueiam o passo; um mapa pode acrescentar os seus (ex.: lago.js: água, pista)
  const SOLID_TILES = (DL.SOLID_TILES = { '#': 1 });

  // O piso do mapa inteiro, desenhado uma vez num canvas (a cena o deita no chão isométrico).
  DL.renderFloor = function (w) {
    const c = DL.mk(w.W * T, w.H * T), g = c.getContext('2d');
    for (let y = 0; y < w.H; y++) {
      for (let x = 0; x < w.W; x++) {
        const ch = w.tiles[y * w.W + x];
        if (ch === '#') continue;
        (DL.FLOORS[ch] || DL.FLOORS['.'])(g, x * T, y * T, x, y);
      }
    }
    return c;
  };

  /* ---------- registro de mapas ---------- */
  DL.MAPS = {};
  DL.registerMap = function (def) {
    DL.MAPS[def.id] = def;
  };

  // Transforma a definição do mapa (texto + lista de objetos) no "mundo" que a cena entende.
  DL.buildMap = function (def) {
    const rows = def.tiles;
    const H = rows.length, W = Math.max(...rows.map((r) => r.length));
    const tiles = new Array(W * H), solid = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const ch = rows[y][x] || '#';
        tiles[y * W + x] = ch;
        if (SOLID_TILES[ch]) solid[y * W + x] = 1;
      }
    }

    const items = [], byId = {};
    // Igual ao add() do DataLab: posição em pixels, ordem de desenho e tiles bloqueados.
    function add(o) {
      const e = Object.assign({ tw: 1, th: 1, seed: items.length * 7 + 3, state: 'ok', solid: true }, o);
      e.px = e.tx * T;
      e.py = e.ty * T;
      e.sortY = e.py + e.th * T;
      if (e.solid) for (let j = 0; j < e.th; j++) for (let i = 0; i < e.tw; i++) solid[(e.ty + j) * W + e.tx + i] = 1;
      DL.itemGeom(e);
      if (e.id) byId[e.id] = e;
      items.push(e);
      return e;
    }
    for (const o of def.items || []) add(Object.assign({}, o));
    // objetos "em cima" de outro (ex.: caixa sobre a bancada): host: 'ID-DA-MESA'
    for (const e of items) if (typeof e.host === 'string') e.host = byId[e.host];

    // a sala (para a luz do teto): o retângulo de piso, ou as salas que o mapa informar
    let rooms = def.rooms;
    if (!rooms) {
      let x0 = W, y0 = H, x1 = -1, y1 = -1;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (tiles[y * W + x] !== '#') { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      rooms = x1 >= 0 ? [{ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }] : [];
    }

    const sp = def.spawn || [Math.floor(W / 2), Math.floor(H / 2)];
    return {
      id: def.id, W, H, tiles, solid, items, byId, rooms, version: 1,
      spawn: { x: sp[0] * T + 8, y: sp[1] * T + 10 },
      // portas para outros mapas (para as próximas partes): [{ tx, ty, to: 'rua', spawn: [x, y] }]
      portals: def.portals || [],
      add,
      remove(e) {
        const i = items.indexOf(e);
        if (i >= 0) items.splice(i, 1);
        if (e.id) delete byId[e.id];
        if (e.solid) for (let j = 0; j < e.th; j++) for (let k = 0; k < e.tw; k++) solid[(e.ty + j) * W + e.tx + k] = 0;
      },
    };
  };
})();

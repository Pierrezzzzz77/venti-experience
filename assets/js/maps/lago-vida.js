/* Venti Experience — Parte 0: a vida no Lago da Prefeitura.
     pedestres   na calçada da Av. São João (indo, voltando, parados conversando): desviam do jogador e uns
                 dos outros; ao longe, na trilha em volta do lago e na calçada do outro lado da avenida
     carros      nas duas pistas da avenida (inclinada) e nas ruas em volta; param na faixa quando alguém atravessa
     bichos      cachorros passeando (andam, param, cheiram, voltam; desviam das pessoas; não entram na água),
                 passarinhos pulando no chão, patos nadando, uma garça na beira, pássaros em bando no céu
     folhas      caindo das árvores com o vento; conversa ("...") em cima de quem está parado
   lago.js chama: init(game, st), update(game, dt, st), water(g, sc, st) logo depois da água,
   air(g, sc, st) por cima de tudo (antes da luz). */
(function () {
  'use strict';
  const DL = window.DL, T = DL.T, R = DL.R, hash = DL.hash, K = DL.isoKit, shade = DL.shade, Lg = DL.Lago, L = Lg.L, P = Lg.PAL;
  const F = L.F, AV = L.AV;
  const IX = (x, y) => x - y, IY = (x, y, z) => (x + y) / 2 - (z || 0);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // a avenida em pixels do mundo: s = ao longo (para o leste), d = para o lado (+ = para o lago)
  const toWorld = (s, d) => { const [x, y] = AV.world(s / T, d / T); return [x * T, y * T]; };
  const toLocal = (x, y) => { const l = AV.local(x / T, y / T); return { s: l.s * T, d: l.d * T }; };

  /* ------------------------------------------------------------------ */
  /* Roupas: cada pedestre com a sua                                     */
  /* ------------------------------------------------------------------ */
  const SKIN = [P.ne5, P.ne6, P.te5, P.te4, P.ne3, P.ne5];
  const HAIR = [P.ne0, P.ne0, P.te0, P.te4, P.te5, P.ne1, P.ne5];
  const STYLE = ['short', 'bun', 'long', 'cap', 'curly', 'buzz', 'ponytail', 'afro', 'bob'];
  const SHIRT = [P.te3, P.sky6, P.vd1, P.wa3, P.ne6, P.mt3, P.sky5, P.vd0, P.vd2, P.wa3, P.ne5, P.ne0];
  const PANTS = [P.ne0, P.wa2, P.ne2, P.ne0, P.ne3, P.wa3, P.ne5];
  const SHOES = [P.ne6, P.ne0, P.te4, P.sky3, P.wa3];
  function look(i) {
    const h = (k) => hash(i * 31 + k * 7 + 3);
    return {
      skin: SKIN[Math.floor(h(1) * SKIN.length)], hair: HAIR[Math.floor(h(2) * HAIR.length)], hairStyle: STYLE[Math.floor(h(3) * STYLE.length)],
      cap: SHIRT[Math.floor(h(7) * SHIRT.length)], shirt: SHIRT[Math.floor(h(4) * SHIRT.length)], pants: PANTS[Math.floor(h(5) * PANTS.length)], shoes: SHOES[Math.floor(h(6) * SHOES.length)],
    };
  }

  /* ------------------------------------------------------------------ */
  /* Pedestres                                                           */
  /* ------------------------------------------------------------------ */
  // a calçada da avenida (2,5 tiles de largura): três fileiras, d em px
  const LANES = [AV.calcada[0] + 0.5, (AV.calcada[0] + AV.calcada[1]) / 2, AV.calcada[1] - 0.5].map((d) => d * T);
  const S0 = Lg.MAPA.CALCADA_LAGO[0] * T, S1 = Lg.MAPA.CALCADA_LAGO[1] * T; // onde quem anda dá meia-volta (os cantos da quadra do lago)
  let V = null; // o estado da vida (refeito a cada vida.init)

  function addPed(sc, i, o) {
    const a = new DL.Actor(look(i), o.x, o.y, o.dir || 'right');
    a.ped = Object.assign({ speed: 22 + hash(i * 5) * 14, pause: 0, talk: 0 }, o);
    a.moving = !o.still;
    a.dist = hash(i) * 20;
    a.blinkIn = 1 + hash(i * 9) * 3;
    sc.drawables.push(a);
    V.peds.push(a);
    return a;
  }
  // um pedestre na calçada: s ao longo, na fileira k
  function nearPed(sc, i, s, k, vs) {
    s = clamp(s, S0 + 2 * T, S1 - 2 * T);
    const [x, y] = toWorld(s, LANES[k]);
    return addPed(sc, i, { x, y, s, d: LANES[k], lane: LANES[k], vs, near: true, dir: DL.dirOf(AV.DIR[0] * vs, AV.DIR[1] * vs) });
  }

  // quem anda na calçada: segue na sua fileira e muda de fileira para desviar
  function walkNear(sc, a, dt, game) {
    const p = a.ped, pl = game.player;
    if (p.still) { // parados conversando: viram a cabeça de vez em quando
      p.talk -= dt;
      if (p.talk < 0) { p.talk = 2 + Math.random() * 4; a.dir = Math.random() < 0.75 ? p.face : Math.random() < 0.5 ? 'down' : 'up'; }
      a.moving = false;
      return;
    }
    if (p.pause > 0) { p.pause -= dt; a.moving = false; return; }
    const sg = p.vs > 0 ? 1 : -1;
    // alguém (o jogador, outro pedestre ou um cachorro) logo à frente, na mesma fileira? troca de fileira
    const blockers = [];
    if (pl && !pl.hidden) blockers.push(toLocal(pl.x, pl.y));
    for (const o of V.peds) if (o !== a && o.ped.near) blockers.push({ s: o.ped.s, d: o.ped.d });
    for (const dg of V.dogs) blockers.push(toLocal(dg.x, dg.y));
    let blocked = false;
    for (const o of blockers) {
      const ahead = (o.s - p.s) * sg;
      if (ahead > -4 && ahead < 26 && Math.abs(o.d - p.lane) < 9) { blocked = true; break; }
    }
    if (blocked) {
      let best = null, bd = 1e9;
      for (const ly of LANES) {
        if (Math.abs(ly - p.lane) < 1) continue;
        const busy = blockers.some((o) => Math.abs(o.d - ly) < 9 && (o.s - p.s) * sg > -8 && (o.s - p.s) * sg < 30);
        if (busy) continue;
        const d = Math.abs(ly - p.d);
        if (d < bd) { bd = d; best = ly; }
      }
      if (best != null) p.lane = best;
      else { p.pause = 0.6; return; } // tudo ocupado: espera um pouquinho
    }
    // anda: s para a frente, d escorrega até a fileira
    const dd = clamp(p.lane - p.d, -p.speed * dt, p.speed * dt), ds = p.vs * dt;
    const [nx, ny] = toWorld(p.s + ds, p.d + dd);
    if (sc.hits(nx, ny)) { p.lane = LANES[(LANES.indexOf(p.lane) + 1) % LANES.length]; return; }
    const mx = nx - a.x, my = ny - a.y;
    a.x = nx; a.y = ny; p.s += ds; p.d += dd;
    a.moving = true;
    a.dist += Math.hypot(mx, my);
    a.dir = DL.dirOf(mx, my);
    // no fim da calçada dá meia-volta (às vezes para um pouco, olhando o lago)
    if ((sg > 0 && p.s > S1) || (sg < 0 && p.s < S0)) p.vs = -p.vs;
    else if (Math.random() < dt * 0.02) { p.pause = 1.5 + Math.random() * 2.5; a.dir = 'down'; }
  }

  // um caminho (lista de pontos em px) com o comprimento acumulado
  function mkPath(pts) {
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts, cum, len: cum[cum.length - 1] };
  }
  function pathAt(pa, u) {
    u = clamp(u, 0, pa.len);
    let i = 1;
    while (i < pa.cum.length - 1 && pa.cum[i] < u) i++;
    const a = pa.pts[i - 1], b = pa.pts[i], k = (u - pa.cum[i - 1]) / (pa.cum[i] - pa.cum[i - 1] || 1);
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, Math.atan2(b[1] - a[1], b[0] - a[0])];
  }
  const tpx = (pts) => pts.map(([x, y]) => [x * T, y * T]);

  // os de longe: vão e voltam num caminho (a trilha em volta do lago, a calçada do outro lado)
  function walkFar(a, dt) {
    const p = a.ped;
    p.u += p.vu * dt;
    if (p.u > p.path.len || p.u < 0) { p.vu = -p.vu; p.u = clamp(p.u, 0, p.path.len); }
    const [x, y] = pathAt(p.path, p.u);
    const mx = x - a.x, my = y - a.y;
    a.x = x; a.y = y;
    a.moving = true;
    a.dist += Math.abs(p.vu) * dt;
    if (mx || my) a.dir = DL.dirOf(mx, my);
  }

  /* ------------------------------------------------------------------ */
  /* Quem atravessa na faixa (e os carros esperam)                        */
  /* ------------------------------------------------------------------ */
  const CROSS_S = L.S_CROSS * T;
  function crossStep(sc, dt) {
    const c = V.cross;
    if (!c) {
      V.crossIn -= dt;
      if (V.crossIn > 0) return;
      V.crossIn = 14 + Math.random() * 10;
      const toNorth = Math.random() < 0.5; // de cá (calçada do lago) para lá, ou de lá para cá
      const dS = (AV.calcada[0] + 0.6) * T, dN = (AV.calcadaN[1] - 0.6) * T;
      const s = CROSS_S - 6 + Math.random() * 12, d0 = toNorth ? dS : dN, d1 = toNorth ? dN : dS;
      const [x, y] = toWorld(s, d0);
      const a = new DL.Actor(look(200 + Math.floor(Math.random() * 50)), x, y, 'down');
      sc.drawables.push(a);
      V.cross = { a, s, d: d0, d1, wait: 0.8 };
      return;
    }
    const a = c.a;
    if (c.wait > 0) { c.wait -= dt; a.moving = false; return; } // olha para os lados antes
    const sg = Math.sign(c.d1 - c.d);
    c.d += sg * 30 * dt;
    const [x, y] = toWorld(c.s, c.d);
    a.dir = DL.dirOf(x - a.x, y - a.y);
    a.x = x; a.y = y;
    a.moving = true;
    a.dist += 30 * dt;
    if ((c.d - c.d1) * sg >= 0) {
      const i = sc.drawables.indexOf(a);
      if (i >= 0) sc.drawables.splice(i, 1);
      V.cross = null;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Carros                                                              */
  /* ------------------------------------------------------------------ */
  const CARC = [P.ne6, P.ne6, P.sky3, P.vd0, P.ne0, P.ne3, P.ne6, P.sky6, P.gr3];
  // as faixas de trânsito: um caminho (px) percorrido do começo para o fim
  //   avenida: mão para o leste do lado do lago, para o oeste do outro lado (mão inglesa não!)
  // as faixas de trânsito vêm do mapa lógico (lago-mapa.js): sempre no meio da pista certa
  function crossOn(pa) {
    // onde fica a faixa de pedestre neste caminho (o ponto do caminho mais perto dela)
    const [cx, cy] = toWorld(CROSS_S, ((AV.pistaS[0] + AV.pistaN[1]) / 2) * T);
    let best = 1e18, bu = -1e9;
    for (let u = 0; u < pa.len; u += 4) { const [x, y] = pathAt(pa, u), d = (x - cx) ** 2 + (y - cy) ** 2; if (d < best) { best = d; bu = u; } }
    return best < (6 * T) ** 2 ? bu : -1e9;
  }
  let ROADS = null;
  function makeRoads() {
    ROADS = Lg.MAPA.TRAFEGO.map((t) => {
      const pa = mkPath(tpx(t.pts));
      pa.n = t.n; pa.av = !!t.av;
      if (pa.av) pa.crossU = crossOn(pa);
      return pa;
    });
  }
  function drawMover(g, sc, e) { K.isoT(g, sc); L.drawCarAt(g, e.cx, e.cy, e.ang, e.col); }
  function addCar(sc, lane, u, col) {
    const e = { kind: 'lg-traffic', u, col, lane, v: 0, vmax: (lane.av ? 70 : 40) + Math.random() * 30, tw: 60 / T, th: 26 / T, isoH: 30, drawIso: drawMover };
    place(e);
    sc.drawables.push(e);
    V.cars.push(e);
  }
  function place(e) {
    const [x, y, ang] = pathAt(e.lane, e.u);
    e.cx = x; e.cy = y; e.ang = ang;
    e.px = x - 30; e.py = y - 13;
  }
  function carStep(dt) {
    for (const e of V.cars) {
      // distância livre à frente: o carro da frente na mesma faixa, ou a faixa de pedestre ocupada
      let free = 1e9;
      for (const o of V.cars) if (o !== e && o.lane === e.lane) { const d = o.u - e.u; if (d > 0 && d < free) free = d - 66; }
      if (V.cross && e.lane.av) {
        const d = e.lane.crossU - 3.5 * T - e.u - 30;
        if (d > -6 && d < free) free = d;
      }
      const want = free < 4 ? 0 : Math.min(e.vmax, free * 1.4);
      e.v += clamp(want - e.v, -160 * dt, 50 * dt);
      e.u += e.v * dt;
      if (e.u > e.lane.len) e.u -= e.lane.len; // saiu do mapa: volta pelo começo (lago-cidade.js continua a rua)
      place(e);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Cachorros: andar, parar, cheirar, voltar                            */
  /* ------------------------------------------------------------------ */
  const DOGC = [[P.te4, P.te0], [P.ne6, P.ne4], [P.ne0, P.ne1], [P.te3, P.te1], [P.ne3, P.ne2]];
  // onde cada cachorro passeia: a faixa de grama + calçada do lago, ou um pedaço de grama (centro e raio, tiles)
  const DOG_HOMES = [
    { strip: [AV.sAtX(44), AV.sAtX(78)] }, { strip: [AV.sAtX(56), AV.sAtX(100)] }, { strip: [AV.sAtX(70), AV.sAtX(110)] },
    { c: [33, 48], r: 8 }, { c: [60, 74], r: 9 },
  ];
  const DOG_OK = { g: 1, s: 1, m: 1, v: 1, q: 1 };
  function dogTarget(dg) {
    const h = dg.home;
    for (let k = 0; k < 20; k++) {
      let x, y;
      if (h.strip) {
        [x, y] = AV.world(h.strip[0] + Math.random() * (h.strip[1] - h.strip[0]), AV.calcada[0] + 0.3 + Math.random() * 4);
      } else {
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * h.r;
        x = h.c[0] + Math.cos(a) * r; y = h.c[1] + Math.sin(a) * r;
      }
      if (DOG_OK[L.kindAt(x, y)] && F.lakeDist(x, y) > 0.8) return [x * T, y * T];
    }
    return [dg.x, dg.y];
  }
  function addDog(sc, i) {
    const dg = { kind: 'lg-dog', home: DOG_HOMES[i % DOG_HOMES.length], col: DOGC[i % DOGC.length], small: i % 3 === 2,
      state: 'stop', t: Math.random() * 2, x: 0, y: 0, face: 1, step: 0, tw: 1, th: 0.6, isoH: 16, drawIso: drawDog };
    [dg.x, dg.y] = dogTarget(dg);
    dg.tx = dg.x; dg.ty = dg.y;
    dg.px = dg.x - 8; dg.py = dg.y - 5;
    sc.drawables.push(dg);
    V.dogs.push(dg);
  }
  function dogStep(sc, dg, dt, game) {
    dg.t -= dt;
    if (dg.state !== 'walk') {
      if (dg.t > 0) return;
      // decide: andar até um ponto novo (às vezes perto, para "voltar" e cheirar de novo)
      [dg.tx, dg.ty] = dogTarget(dg);
      dg.state = 'walk';
      dg.speed = 26 + Math.random() * 22;
      return;
    }
    let dx = dg.tx - dg.x, dy = dg.ty - dg.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 3) { // chegou: para ou cheira o chão
      dg.state = Math.random() < 0.55 ? 'sniff' : 'stop';
      dg.t = dg.state === 'sniff' ? 1.4 + Math.random() * 2 : 0.8 + Math.random() * 2.5;
      return;
    }
    dx /= dist; dy /= dist;
    // desvia de gente (jogador e pedestres perto): empurrãozinho para o lado
    const people = [game.player, ...V.peds];
    for (const o of people) {
      if (!o || o.hidden) continue;
      const ox = dg.x - o.x, oy = dg.y - o.y, od = Math.hypot(ox, oy);
      if (od < 22 && od > 0.1) { const k = (22 - od) / 22; dx += (ox / od) * k * 1.6; dy += (oy / od) * k * 1.6; }
    }
    const l = Math.hypot(dx, dy) || 1, v = dg.speed * dt;
    const nx = dg.x + (dx / l) * v, ny = dg.y + (dy / l) * v;
    // não entra na água, nem na rua, nem em nada que bloqueie: escolhe outro ponto
    if (F.inLake(nx / T, ny / T) || F.lakeDist(nx / T, ny / T) < 0.4 || !DOG_OK[L.kindAt(nx / T, ny / T)] || sc.hits(nx, ny)) {
      dg.state = 'stop'; dg.t = 0.3; return;
    }
    const sx = IX(nx - dg.x, ny - dg.y);
    if (Math.abs(sx) > 0.05) dg.face = sx > 0 ? 1 : -1;
    dg.x = nx; dg.y = ny;
    dg.step += v;
    dg.px = dg.x - 8; dg.py = dg.y - 5;
  }
  // o cachorro: corpo de 12 × 5 px (o pequeno, 9 × 4), cabeça, orelha, rabo abanando, patas andando
  function drawDog(g, sc, e) {
    K.isoT(g, sc);
    const X = Math.round(IX(e.x, e.y)), Y = Math.round(IY(e.x, e.y)), f = e.face, [c, dk] = e.col, s = e.small ? 2 : 0;
    const walk = e.state === 'walk', ph = Math.floor(e.step / 4) % 2, sniff = e.state === 'sniff';
    const wag = Math.floor(sc.t * (walk ? 10 : 6)) % 2;
    const bw = 12 - s, bx = X - (bw >> 1), top = Y - 9 + s;                // corpo: de bx a bx + bw
    R(g, bx - 1, Y, bw + 2, 1, 'rgba(20,16,30,0.35)');                       // sombra
    // patas (de trás e da frente; andando, alternam)
    const legH = 4 - (s >> 1), up = (k) => (walk && (ph + k) % 2 ? 1 : 0);
    R(g, bx + 1, Y - legH, 2, legH - up(0), dk); R(g, bx + bw - 3, Y - legH, 2, legH - up(1), dk);
    R(g, bx + 2, Y - legH, 1, legH - up(1), c); R(g, bx + bw - 2, Y - legH, 1, legH - up(0), c);
    // corpo com a barriga mais escura
    R(g, bx, top, bw, 5 - (s >> 1), c);
    R(g, bx, top + 4 - (s >> 1), bw, 1, dk);
    R(g, bx + 1, top, bw - 2, 1, shade(c, 0.15));
    // cabeça (abaixada quando cheira o chão)
    const hx = f > 0 ? bx + bw - 1 : bx - 4, hy = sniff ? Y - 5 : top - 3;
    R(g, hx, hy, 5, 4, c);
    R(g, f > 0 ? hx + 5 : hx - 1, hy + 2, 1, 2, dk);                          // focinho
    R(g, f > 0 ? hx + 3 : hx + 1, hy + 1, 1, 1, P.ne0);                       // olho
    R(g, f > 0 ? hx : hx + 3, hy - 1, 2, 3, dk);                              // orelha
    // rabo
    const tx = f > 0 ? bx - 2 : bx + bw;
    R(g, tx, top - 2 - wag, 2, 3, c);
  }

  /* ------------------------------------------------------------------ */
  /* Passarinhos no chão: pulam, bicam, voam quando alguém chega perto     */
  /* ------------------------------------------------------------------ */
  function addGroundBirds() {
    for (let i = 0; i < 9; i++) {
      const s = AV.sAtX(46 + hash(i * 7) * 50), d = AV.calcada[1] + 0.6 + hash(i * 3 + 1) * 2.2, [x, y] = AV.world(s, d);
      if (L.kindAt(x, y) !== 'g') continue;
      V.birds.push({ hx: x * T, hy: y * T, x: x * T, y: y * T, z: 0, hop: 0, peck: 0, t: Math.random() * 2, fly: 0, face: 1, col: i % 3 === 0 ? P.te4 : P.ne2 });
    }
  }
  function birdStep(b, dt, game) {
    if (b.fly > 0) { // voando para longe; volta depois de um tempo
      b.fly -= dt; b.z += 60 * dt; b.x += 50 * b.face * dt; b.y -= 20 * dt;
      if (b.fly <= 0) { b.x = b.hx; b.y = b.hy; b.z = 0; b.t = 3 + Math.random() * 4; }
      return;
    }
    const p = game.player;
    const near = [p, ...V.dogs].some((o) => o && !o.hidden && Math.hypot(o.x - b.x, o.y - b.y) < 26);
    if (near && b.z === 0) { b.fly = 6 + Math.random() * 4; b.face = Math.random() < 0.5 ? 1 : -1; return; }
    b.t -= dt;
    if (b.hop > 0) { b.hop -= dt; b.z = Math.sin((1 - b.hop / 0.25) * Math.PI) * 3; if (b.hop <= 0) b.z = 0; return; }
    if (b.t > 0) { b.peck = Math.sin(b.t * 9) > 0.6 ? 1 : 0; return; }
    // um pulinho para perto de casa
    b.t = 0.6 + Math.random() * 2;
    b.hop = 0.25;
    const nx = b.hx + (Math.random() - 0.5) * 22, ny = b.hy + (Math.random() - 0.5) * 14;
    b.face = IX(nx - b.x, ny - b.y) > 0 ? 1 : -1;
    if (L.kindAt(nx / T, ny / T) === 'g') { b.x = nx; b.y = ny; }
  }

  /* ------------------------------------------------------------------ */
  /* Patos, garça, bandos, folhas                                        */
  /* ------------------------------------------------------------------ */
  function makeDucks() {
    const out = [];
    // famílias: mãe na frente e filhotes atrás, nadando devagar em círculos largos (dentro do lago novo)
    const fam = [[58, 44, 3], [78, 38, 2], [100, 48, 4], [122, 44, 0], [70, 56, 2], [132, 50, 1]];
    fam.forEach(([cx, cy, kids], f) => {
      const r = 3 + hash(f * 7) * 3, w = (0.05 + hash(f * 3) * 0.05) * (f % 2 ? 1 : -1);
      for (let k = 0; k <= kids; k++) out.push({ cx: cx * T, cy: cy * T, r: r * T, w, ph: hash(f * 13) * 6 - k * 0.12 * Math.sign(w), baby: k > 0 });
    });
    return out;
  }
  // a garça fica na beira sul, dentro d'água rasa
  function heronSpot() {
    const x = 92;
    let y = 75;
    while (y > 40 && !F.inLake(x, y)) y -= 0.25;
    return { x: x * T, y: (y - 0.4) * T, peck: 0 };
  }
  function spawnFlock(sc) {
    // o bando vem da esquerda da tela, alto, e cruza para a direita subindo um pouco
    const n = 7 + Math.floor(Math.random() * 8), cx = sc.cam.x - 260 - Math.random() * 80, cy = sc.cam.y + 200 + Math.random() * 60;
    const b = [];
    for (let i = 0; i < n; i++) {
      const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
      b.push({ ox: -row * 7 + Math.random() * 2, oy: side * row * 5, ph: Math.random() * 6 });
    }
    V.flocks.push({ x: cx, y: cy, z: 150 + Math.random() * 60, vx: 64 + Math.random() * 20, vy: -58 - Math.random() * 20, life: 14, b });
  }
  function spawnLeaf(sc) {
    const tr = sc.tileRange(), trees = Lg.treesInView = (Lg.treesInView || []);
    trees.length = 0;
    for (const e of sc.world.items) if (e.kind === 'lg-tree' && e.tx >= tr.x0 - 4 && e.tx <= tr.x1 + 2 && e.ty >= tr.y0 - 4 && e.ty <= tr.y1 + 2) trees.push(e);
    if (!trees.length) return;
    const e = trees[Math.floor(Math.random() * trees.length)], s = e.small ? 0.55 : 1;
    // às vezes vem uma rajada: várias folhas da mesma árvore de uma vez
    const n = Math.random() < 0.18 ? 4 + Math.floor(Math.random() * 4) : 1;
    for (let k = 0; k < n && V.leaves.length < LEAF_MAX; k++) {
      V.leaves.push({ x: e.px + 8 + (Math.random() - 0.5) * 40 * s, y: e.py + 8 + (Math.random() - 0.5) * 16, z: (60 + Math.random() * 50) * s,
        ph: Math.random() * 6, sp: 0.7 + Math.random() * 0.6, rest: 0, big: Math.random() < 0.6,
        col: LEAF_COL[Math.floor(Math.random() * LEAF_COL.length)] });
    }
  }
  const LEAF_MAX = 150, LEAF_COL = [P.sky6, P.te3, P.gr5, P.sky7, P.gr4, P.te2];

  /* ------------------------------------------------------------------ */
  /* API                                                                 */
  /* ------------------------------------------------------------------ */
  const vida = {
    init(game) {
      const sc = game.scene;
      if (!ROADS) makeRoads();
      V = { peds: [], cars: [], dogs: [], birds: [], ducks: makeDucks(), flocks: [], leaves: [], cross: null, flockIn: 2.5, crossIn: 9, leafIn: 0, heron: heronSpot() };
      let i = 0;
      // calçada da avenida: gente andando para os dois lados (longe do ponto onde o jogador aparece)
      const sp = L.S_SPAWN;
      for (const [ds, dir] of [[-34, 1], [-20, -1], [-8, 1], [16, -1], [26, 1], [44, -1], [58, 1], [70, -1], [-48, -1], [36, 1]]) {
        nearPed(sc, i, (sp + ds) * T, i % 3, dir * (22 + hash(i * 5) * 14));
        i++;
      }
      // parados conversando (de frente um para o outro), na fileira do lado do lago
      for (const ds of [-14, 22, 52]) {
        const s = (sp + ds) * T;
        const a = nearPed(sc, i++, s, 2, 0), b = nearPed(sc, i++, s + 13, 2, 0);
        Object.assign(a.ped, { still: true, face: 'right' }); a.dir = 'right'; a.moving = false;
        Object.assign(b.ped, { still: true, face: 'left' }); b.dir = 'left'; b.moving = false;
      }
      // ao longe: a trilha em volta do lago e a calçada do outro lado da avenida
      const far = (k, pts, sp2) => {
        const path = mkPath(pts), u = hash(k * 3 + 1) * path.len, [x, y] = pathAt(path, u);
        addPed(sc, i++, { x, y, path, u, vu: (hash(k * 7) < 0.5 ? -1 : 1) * sp2 });
      };
      const trail = tpx(F.trilha);
      for (let k = 0; k < 9; k++) far(k, trail, 16 + hash(k) * 12);
      const CN = Lg.MAPA.CALCADA_NORTE, north = [toWorld(CN[0] * T, (AV.calcadaN[0] + AV.calcadaN[1]) / 2 * T), toWorld(CN[1] * T, (AV.calcadaN[0] + AV.calcadaN[1]) / 2 * T)];
      for (let k = 0; k < 5; k++) far(k + 20, north, 20);
      // bichos
      for (let k = 0; k < 5; k++) addDog(sc, k);
      addGroundBirds();
      // trânsito (sempre um carro branco na pista de cá)
      let c = 0;
      for (const lane of ROADS) {
        for (let k = 0; k < lane.n; k++, c++) addCar(sc, lane, (k + hash(c * 3) * 0.6) * (lane.len / lane.n), c === 0 ? P.ne6 : CARC[c % CARC.length]);
      }
      // sombras dos carros (lago-ceu.js junta tudo numa sombra só)
      Lg.state.extraShadows = [(g, dx, dy, ang, vx0, vx1, vy0, vy1) => {
        let any = false;
        for (const e of V.cars) {
          const X = e.cx - e.cy, Y = (e.cx + e.cy) / 2;
          if (X < vx0 - 40 || X > vx1 + 40 || Y < vy0 - 20 || Y > vy1 + 20) continue;
          any = true;
          const x0 = e.cx - 30, y0 = e.cy - 12, x1 = e.cx + 30, y1 = e.cy + 12, h = 20;
          g.moveTo(x0, y0); g.lineTo(x1, y0); g.lineTo(x1 + dx * h, y0 + dy * h); g.lineTo(x1 + dx * h, y1 + dy * h); g.lineTo(x0 + dx * h, y1 + dy * h); g.lineTo(x0, y1); g.closePath();
        }
        return any;
      }];
    },

    update(game, dt) {
      const sc = game.scene;
      for (const a of V.peds) { if (a.ped.near) walkNear(sc, a, dt, game); else walkFar(a, dt); a.tick(dt); }
      crossStep(sc, dt);
      if (V.cross) V.cross.a.tick(dt);
      carStep(dt);
      for (const dg of V.dogs) dogStep(sc, dg, dt, game);
      for (const b of V.birds) birdStep(b, dt, game);
      // patos
      for (const d of V.ducks) d.ph += d.w * dt;
      // garça: de vez em quando bica a água
      const h = V.heron;
      h.peck -= dt;
      if (h.peck < -4 - Math.random() * 6) h.peck = 0.6;
      // bandos de pássaros
      V.flockIn -= dt;
      if (V.flockIn <= 0) { spawnFlock(sc); V.flockIn = 6 + Math.random() * 5; }
      for (const f of V.flocks) { f.x += f.vx * dt; f.y += f.vy * dt; f.life -= dt; }
      V.flocks = V.flocks.filter((f) => f.life > 0);
      // folhas
      V.leafIn -= dt;
      if (V.leafIn <= 0 && V.leaves.length < LEAF_MAX) { spawnLeaf(sc); V.leafIn = 0.035 + Math.random() * 0.07; }
      // caem balançando com o vento; no chão ficam um pouco e somem (na água somem logo)
      let n = 0;
      for (const l of V.leaves) {
        if (l.z > 0) {
          l.z -= 8 * l.sp * dt; l.x += (7 + Math.sin(sc.t * 0.7) * 5) * dt; l.y += 3 * dt; l.ph += dt * 3 * l.sp;
          if (l.z <= 0) { l.z = 0; l.rest = L.inLake(l.x / T, l.y / T) ? 0.6 : 3 + Math.random() * 3; }
        } else l.rest -= dt;
        if (l.z > 0 || l.rest > 0) V.leaves[n++] = l;
      }
      V.leaves.length = n;
    },

    // no chão e na água (antes do que fica em pé): passarinhos no chão, patos (com rastro em V) e a garça
    water(g, sc, st) {
      K.isoT(g, sc);
      const t = st.t;
      for (const b of V.birds) {
        if (b.fly > 0) continue; // os que voam vão no air()
        const X = Math.round(IX(b.x, b.y)), Y = Math.round(IY(b.x, b.y, b.z)), f = b.face;
        R(g, X - 1, Math.round(IY(b.x, b.y)) + 1, 4, 1, 'rgba(20,16,30,0.3)');
        R(g, X - 1, Y - 2, 4, 2, b.col); R(g, f > 0 ? X - 2 : X + 3, Y - 2, 1, 1, P.ne1);
        R(g, f > 0 ? X + 2 : X - 2, Y - 3 + b.peck, 2, 2, b.col); R(g, f > 0 ? X + 4 : X - 3, Y - 2 + b.peck, 1, 1, P.sky6);
      }
      for (const d of V.ducks) {
        const x = d.cx + Math.cos(d.ph) * d.r, y = d.cy + Math.sin(d.ph) * d.r * 0.6;
        const vx = -Math.sin(d.ph) * Math.sign(d.w), vy = Math.cos(d.ph) * 0.6 * Math.sign(d.w);
        const X = Math.round(IX(x, y)), Y = Math.round(IY(x, y)), sx = IX(vx, vy) >= 0 ? 1 : -1;
        // rastro: duas linhas claras que abrem para trás
        g.fillStyle = 'rgba(255,240,220,0.35)';
        for (let k = 2; k < 9; k++) { const bx = X - sx * k * 1.6; g.fillRect(Math.round(bx), Y + 1 + Math.round(k * 0.45), 1, 1); g.fillRect(Math.round(bx), Y + 1 - Math.round(k * 0.45), 1, 1); }
        // reflexo
        R(g, X - 2, Y + 1, 5, 1, 'rgba(30,30,40,0.35)');
        if (d.baby) {
          R(g, X - 1, Y - 2, 3, 2, P.gr5); R(g, X + (sx > 0 ? 1 : -1), Y - 3, 1, 1, P.te5);
        } else {
          const bob = Math.sin(t * 2 + d.ph * 5) > 0.8 ? 1 : 0; // balança na água
          R(g, X - 3, Y - 3 + bob, 6, 3, P.te4);            // corpo
          R(g, X - 3, Y - 3 + bob, 6, 1, P.te5);
          R(g, X + (sx > 0 ? 2 : -3), Y - 6 + bob, 2, 3, P.gr2); // cabeça verde
          R(g, X + (sx > 0 ? 4 : -4), Y - 5 + bob, 1, 1, P.sky6); // bico
          R(g, X + (sx > 0 ? -4 : 3), Y - 3 + bob, 1, 1, P.te0); // rabinho
        }
      }
      // a garça: branca, alta, pernas finas dentro da água rasa da beira
      const h = V.heron, X = Math.round(IX(h.x, h.y)), Y = Math.round(IY(h.x, h.y)), pk = h.peck > 0 ? 1 : 0;
      R(g, X - 1, Y + 1, 3, 6, 'rgba(240,240,250,0.25)');         // reflexo
      R(g, X, Y - 6, 1, 6, P.ne0); R(g, X + 2, Y - 6, 1, 6, P.ne0);
      R(g, X - 2, Y - 12, 7, 6, P.ne6); R(g, X - 2, Y - 7, 7, 1, P.ne5);
      if (pk) { R(g, X + 4, Y - 10, 2, 3, P.ne6); R(g, X + 5, Y - 7, 3, 1, P.sky6); }
      else { R(g, X + 3, Y - 18, 2, 7, P.ne6); R(g, X + 4, Y - 19, 3, 2, P.ne6); R(g, X + 7, Y - 18, 3, 1, P.sky6); }
    },

    // no ar: folhas caindo, passarinhos voando, bandos de pássaros, conversa e faróis acesos
    air(g, sc, st) {
      K.isoT(g, sc);
      const t = st.t;
      for (const l of V.leaves) {
        const X = Math.round(IX(l.x, l.y) + (l.z > 0 ? Math.sin(l.ph) * 4 : 0)), Y = Math.round(IY(l.x, l.y, l.z));
        if (l.z <= 0) { R(g, X, Y, 2, 1, l.col); continue; }        // deitada no chão
        // a folha gira: ora larga, ora de lado
        const open = Math.sin(l.ph * 1.3) > 0;
        if (l.big) { R(g, X, Y, open ? 3 : 1, open ? 2 : 2, l.col); if (open) R(g, X + 1, Y - 1, 1, 1, l.col); }
        else R(g, X, Y, open ? 2 : 1, open ? 1 : 2, l.col);
      }
      for (const b of V.birds) {
        if (b.fly <= 0) continue;
        const X = Math.round(IX(b.x, b.y)), Y = Math.round(IY(b.x, b.y, b.z)), up = Math.sin(t * 14 + b.hx) > 0;
        R(g, X, Y, 2, 1, b.col); R(g, X - 2, Y + (up ? -1 : 1), 2, 1, b.col); R(g, X + 2, Y + (up ? -1 : 1), 2, 1, b.col);
      }
      for (const f of V.flocks) {
        const a = clamp(f.life / 2, 0, 1) * clamp((14 - f.life) / 1.5, 0, 1);
        g.globalAlpha = a;
        for (const b of f.b) {
          const x = f.x + b.ox, y = f.y + b.oy, X = Math.round(IX(x, y)), Y = Math.round(IY(x, y, f.z + Math.sin(t * 1.5 + b.ph) * 2));
          const up = Math.sin(t * 10 + b.ph) > 0;
          R(g, X, Y, 1, 1, P.ne0);
          R(g, X - 2, Y + (up ? -1 : 1), 2, 1, P.ne0); R(g, X + 1, Y + (up ? -1 : 1), 2, 1, P.ne0);
        }
        g.globalAlpha = 1;
      }
      // "..." em cima de quem conversa (um de cada vez)
      for (const a of V.peds) {
        if (!a.ped.still) continue;
        const on = Math.sin(t * 0.9 + a.x * 0.37) > 0.55;
        if (!on) continue;
        const X = Math.round(IX(a.x, a.y)), Y = Math.round(IY(a.x, a.y)) - 40;
        R(g, X - 5, Y - 4, 11, 6, 'rgba(255,255,255,0.85)'); R(g, X - 1, Y + 2, 2, 1, 'rgba(255,255,255,0.85)');
        for (let k = 0; k < 3; k++) R(g, X - 3 + k * 3, Y - 2, 1, 1, Math.floor(t * 3) % 3 >= k ? P.ne1 : P.ne4);
      }
      // faróis acendem junto com os postes
      const on = clamp((st.dusk - 0.35) / 0.15, 0, 1);
      if (on > 0) {
        g.globalCompositeOperation = 'lighter';
        for (const e of V.cars) {
          const ca = Math.cos(e.ang), sa = Math.sin(e.ang);
          const fx = e.cx + ca * 32, fy = e.cy + sa * 32;
          Lg.glow(g, IX(fx, fy), IY(fx, fy, 10), 14, '255,230,160', 0.35 * on);
          const bx = e.cx - ca * 32, by = e.cy - sa * 32;
          Lg.glow(g, IX(bx, by), IY(bx, by, 10), 6, '255,60,50', 0.4 * on);
        }
        g.globalCompositeOperation = 'source-over';
      }
    },
  };
  Object.defineProperty(vida, 'V', { get: () => V });
  Lg.vida = vida;
})();

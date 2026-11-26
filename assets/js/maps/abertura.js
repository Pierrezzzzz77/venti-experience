/* Venti Experience — a viagem (o jogador só assiste, botão "Pular").
   Do Lago da Prefeitura até a Faculdade Serra Dourada, em Canaã dos Carajás, de carro.
   Tudo é pixel art desenhada por código num canvas pequeno e depois ampliada (sem imagens).
   O céu vai do pôr do sol (laranja e rosa) até a noite; as luzes acendem no caminho.

   São dois planos:
     LADO   (vista de lado) o carro sai do lago, passa pela PA-160 / Av. Weyne Cavalcante — SkyFit (foto 15),
            casas e comércios, árvores grandes em camadas (as de trás andam mais devagar, as da frente mais
            depressa) — e chega à rotatória. Lá ele NÃO segue reto: vira e entra na avenida que vai para o fundo.
     FUNDO  (câmera atrás do carro) a Av. Carajás em perspectiva, com canteiro, árvores e casas passando,
            até encostar no meio-fio em frente à Serra Dourada. Dali o jogo abre a rua (maps/rua.js),
            onde o boneco desce do carro.

   As peças (casas, árvores, SkyFit, carros) ficam em abertura-pecas.js, cada uma num sprite pronto;
   aqui só se copia sprite. O que acende à noite (janelas, placas) é uma segunda camada somada no fim. */
(function () {
  'use strict';
  const DL = window.DL, R = DL.R, hash = DL.hash, CH = DL.CHAR, P = DL.Pecas, A = DL.Arte, disc = A.disc, oval = A.oval;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
  const rgbOf = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (a, b, k) => { const X = rgbOf(a), Y = rgbOf(b); return '#' + X.map((v, i) => Math.round(lerp(v, Y[i], clamp(k, 0, 1))).toString(16).padStart(2, '0')).join(''); };

  /* ------------------------------------------------------------------ */
  /* Layout do plano de lado (pixels do mundo; y cresce para baixo)       */
  /* ------------------------------------------------------------------ */
  const H0 = 184;
  const HZ = 92, WATER = 96, MARGIN = 118, VERGE = 121, ROAD0 = 136, CENTER = 151, ROAD1 = 166, WALK = 168, FRONT = 177;
  const FAR = 147, NEAR = 163, LOTE = 122;      // as duas faixas e a linha da frente das casas
  const LAKE_END = 1000, PA0 = 1030, PA_END = 2590, ROT_X = 2750, DX = 2790, END_X = 3200;
  const VPX = DX + 40, VPY = HZ + 3;            // o ponto de fuga da avenida que vai para o fundo
  const PREF_X = 230;
  const SF_X = 1050, SF_W = 540;              // a SkyFit (em escala: 540 px = 10 carros)
  const PS = 0.68;                             // as pessoas: ~20 px de altura (o carro tem 52 px de comprimento)

  // linha do tempo (segundos)
  const TL = { walk0: 2.2, walk1: 5.6, inCar: 6.2, go: 7.0, vira: 30.4, fundo: 35.4, para: 44.8, fim: 46.6 };
  const X_START = 250, X_VIRA = ROT_X - 80, ACC = 2.5, DEC = 3, V_FIM = 46, MIX = 0.8;

  // o carro no plano de lado: arranca, anda constante e reduz para fazer a curva
  function carX(t) {
    if (t <= TL.go) return X_START;
    const D = X_VIRA - X_START, Td = TL.vira - TL.go, v = (D - (V_FIM * DEC) / 2) / (Td - ACC / 2 - DEC / 2), u = Math.min(t - TL.go, Td);
    if (u < ACC) return X_START + 0.5 * (v / ACC) * u * u;
    if (u < Td - DEC) return X_START + (v * ACC) / 2 + v * (u - ACC);
    const r = Td - u;
    return X_VIRA - (V_FIM * r + (0.5 * (v - V_FIM) * r * r) / DEC);
  }
  // a avenida que vai para o fundo, linha a linha: o meio e a meia largura
  function ruaFundo(y) {
    const k = clamp((y - VPY) / (ROAD0 - VPY), 0, 1);
    return { x: lerp(VPX, DX, k) + 12 * Math.sin(k * Math.PI), hw: 3 + 31 * k, k };
  }
  /* A rotatória (plano de lado). A ilha fica bem em frente à boca da avenida que vai para o fundo; aqui se
     anda no sentido anti-horário (visto de cima): o carro azul passa pela frente da ilha (lado de cá), sobe
     pelo lado direito dela e entra na avenida. Quem vem no sentido contrário contorna a ilha por trás e dá
     a preferência a quem já está na rotatória. No chão, 1 px de profundidade (y) vale ~KY px de x. */
  const ILHA = { rx: 34, ry: 5 }, KY = 4, BOCA = { rx: 100, ry: 24 };
  // um caminho suave (Catmull-Rom) por pontos [x, y], com o comprimento medido no chão
  function caminho(P1) { return trilha(P1, 1, KY); }
  function trilha(P1, mx, my) {
    const P0 = []; // (trechos longos viram vários pontos: a curva não "passa do ponto" nas retas compridas)
    P1.forEach((p, i) => { if (i) { const q = P1[i - 1], n = Math.ceil(Math.hypot(mx * (p[0] - q[0]), my * (p[1] - q[1])) / 40); for (let k = 1; k < n; k++) P0.push([lerp(q[0], p[0], k / n), lerp(q[1], p[1], k / n)]); } P0.push(p); });
    const pts = [], at = (i) => P0[clamp(i, 0, P0.length - 1)];
    for (let i = 0; i < P0.length - 1; i++) for (let k = 0; k < 8; k++) {
      const u = k / 8, a = at(i - 1), b = at(i), c = at(i + 1), d = at(i + 2);
      pts.push([0, 1].map((j) => 0.5 * (2 * b[j] + (c[j] - a[j]) * u + (2 * a[j] - 5 * b[j] + 4 * c[j] - d[j]) * u * u + (3 * b[j] - a[j] - 3 * c[j] + d[j]) * u * u * u)));
    }
    pts.push(P0[P0.length - 1].slice());
    const L = [0];
    for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(mx * (pts[i][0] - pts[i - 1][0]), my * (pts[i][1] - pts[i - 1][1])));
    return { pts, L, len: L[L.length - 1] };
  }
  function noCaminho(C, d) { // ponto e direção a uma distância d do começo
    d = clamp(d, 0, C.len);
    let lo = 0, hi = C.L.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (C.L[m] <= d) lo = m; else hi = m; }
    const k = (d - C.L[lo]) / Math.max(1e-6, C.L[hi] - C.L[lo]), p = C.pts[lo], q = C.pts[hi];
    return { x: lerp(p[0], q[0], k), y: lerp(p[1], q[1], k), dx: q[0] - p[0], dy: q[1] - p[1] };
  }
  // o caminho do carro azul: frente da ilha, lado direito dela, e a faixa da direita da avenida.
  // No chão (x, y × KY) o carro é um retângulo de 52 × 21 px; o CENTRO dele contorna a ilha numa elipse com folga
  // de 6 px; o que se desenha é o ponto do carro mais perto da câmera (o y de baixo).
  const KC = KY, LARG = 30; // (30 = a largura do sprite de trás: a caixa do chão é a mesma do desenho)
  const HEROI = (() => {
    const R0 = ROT_X, cy0 = CENTER * KY, a = ILHA.rx + LARG / 2 + 8, b = ILHA.ry * KY + LARG / 2 + 5;
    // (o caminho é o do CENTRO do carro, em px da tela: y = y do chão / KY)
    const P0 = [[R0 - 80, NEAR - LARG / 2 / KY], [R0 - 48, NEAR - LARG / 2 / KY + 0.3], [R0 - 22, (cy0 + b) / KY]];
    for (let f = Math.PI / 2; f >= -0.25; f -= Math.PI / 16) P0.push([R0 + a * Math.cos(f), (cy0 + b * Math.sin(f)) / KY]);
    for (let y = 141; y >= 97; y -= 4) { const r = ruaFundo(y); P0.push([r.x + r.hw * 0.38, y - 26 / KY]); }
    return caminho(P0);
  })();
  const V_ROT = 46, A_ROT = 100; // velocidade na rotatória e a aceleração na saída (px/s, px/s²)
  // o carro azul no plano de lado depois de TL.vira: { x, y, a (0 = de lado, 90° = de costas), s (tamanho) }
  function heroi(t) {
    const u = Math.max(0, t - TL.vira), dv = V_FIM - V_ROT, tb = 1.2; // reduz um pouco ao entrar e acelera na saída
    let d = u < tb ? V_FIM * u - (dv * u * u) / (2 * tb) : V_FIM * tb - (dv * tb) / 2 + V_ROT * (u - tb);
    const ta = 3.4;
    if (u > ta) d += 0.5 * A_ROT * (u - ta) * (u - ta);
    const p = noCaminho(HEROI, d), p1 = noCaminho(HEROI, d + 2), p0 = noCaminho(HEROI, d - 2), h = Math.atan2(-(p1.y - p0.y) * KY, p1.x - p0.x), a = clamp(h, 0, Math.PI / 2 + 0.35);
    const y = p.y + (52 * Math.abs(Math.sin(h)) + LARG * Math.abs(Math.cos(h))) / 2 / KY; // o ponto de baixo do carro
    return { x: p.x, y, cy: p.y, a, h, s: (y - VPY) / (NEAR - VPY), d };
  }
  // a caixa que o carro ocupa no chão (para conferir que ninguém encosta em ninguém): [x0, x1, y0, y1]
  function caixaHeroi(t) {
    if (t <= TL.vira) { const x = carX(t); return [x - 26, x + 26, NEAR - 5, NEAR]; }
    const h = heroi(t), w = (30 * Math.sin(h.a) + 52 * Math.abs(Math.cos(h.a))) * h.s, fd = (5 + 12 * Math.sin(Math.min(h.a, Math.PI / 2))) * h.s;
    return [h.x - w / 2, h.x + w / 2, h.y - fd, h.y];
  }
  // o caminho de quem vem no sentido contrário (da direita para a esquerda), contornando a ilha por trás
  const CONTRA = (() => {
    const R0 = ROT_X, P0 = [[END_X + 3000, FAR], [R0 + 140, FAR], [R0 + 95, FAR], [R0 + 60, FAR - 4], [R0 + 28, FAR - 7.5], [R0, FAR - 8.5], [R0 - 28, FAR - 7.5], [R0 - 60, FAR - 4], [R0 - 95, FAR], [R0 - 140, FAR], [-3000, FAR]];
    return caminho(P0);
  })();
  function distX(x) { let lo = 0, hi = CONTRA.len; for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2; if (noCaminho(CONTRA, m).x > x) lo = m; else hi = m; } return lo; }
  const CEDA = distX(ROT_X + 84); // a linha do "dê a preferência" (a frente do carro para aqui)
  /* O trânsito do sentido contrário, simulado uma vez a 60 quadros por segundo: cada um segue o da frente
     a uma distância segura (modelo de motorista inteligente: freia e acelera com suavidade) e para na
     linha da rotatória enquanto o carro azul estiver passando por ela. */
  function simularTransito(lista) {
    const DT = 1 / 60, T0 = 7, T1 = TL.fundo + 0.4, N = Math.ceil((T1 - T0) / DT) + 1;
    // quando o carro azul ocupa a faixa de lá (perto da ilha): a janela em que ninguém entra
    let tA = null, tB = null;
    for (let t = TL.vira; t <= T1; t += DT) { const c = caixaHeroi(t); if (c[3] < FAR + 3 && c[1] > ROT_X - 70 && c[0] < ROT_X + 110) { if (tA == null) tA = t; tB = t; } }
    const ceda = (t) => tA != null && t > tA - 1.6 && t < tB + 0.35;
    const S0 = 14, TH = 0.8, AC = 70, BR = 110;
    for (const c of lista) { c.w = c.spr.r.width; c.s = new Float32Array(N); c.on = false; c.d = 0; c.v = c.v0; }
    for (let i = 0; i < N; i++) {
      const t = T0 + i * DT;
      lista.forEach((c, j) => {
        const ld = j > 0 ? lista[j - 1] : null;
        if (!c.on) {
          if (t < c.t0) { c.s[i] = NaN; return; }
          c.on = true; c.d = distX(c.x0); c.v = c.v0;
          // se o da frente ainda está perto, entra mais atrás (fora da tela)
          if (ld && ld.on && ld.d - c.d < (ld.w + c.w) / 2 + S0 + 30) { c.d = ld.d - (ld.w + c.w) / 2 - S0 - 30; c.v = Math.min(c.v, ld.v); }
        }
        // o obstáculo à frente: o veículo da frente ou a linha de "dê a preferência"
        let gap = Infinity, vl = 0;
        if (ld && ld.on) { gap = ld.d - c.d - (ld.w + c.w) / 2; vl = ld.v; }
        if (ceda(t) && c.d + c.w / 2 < CEDA + 1) { const gy = CEDA - (c.d + c.w / 2); if (gy < gap) { gap = gy; vl = 0; } }
        const sStar = S0 + c.v * TH + (c.v * (c.v - vl)) / (2 * Math.sqrt(AC * BR));
        let acc = AC * (1 - Math.pow(c.v / c.v0, 4) - Math.pow(Math.max(0, sStar) / Math.max(0.5, gap), 2));
        acc = Math.max(-BR * 2.2, acc);
        c.v = Math.max(0, c.v + acc * DT);
        c.d += c.v * DT;
        c.s[i] = c.d;
      });
    }
    return { T0, DT, N, tA, tB };
  }
  // onde está o veículo c do trânsito no tempo t (ou null)
  function noTransito(c, t) {
    const M = S.sim;
    if (!M) return null;
    const f = (t - M.T0) / M.DT, i = Math.floor(f);
    if (i < 0 || i >= M.N - 1) return null;
    const a = c.s[i], b = c.s[i + 1];
    if (!(a === a) || !(b === b)) return null;
    const d = lerp(a, b, f - i), p = noCaminho(CONTRA, d), p1 = noCaminho(CONTRA, d + 2), p0 = noCaminho(CONTRA, d - 2);
    p.h = Math.atan2(-(p1.y - p0.y) * KY, p1.x - p0.x);
    return p;
  }
  // confere, quadro a quadro (60 por segundo), que nenhum veículo encosta em outro nem na ilha: lista os contatos
  // No chão (x, y × KC) cada veículo é um retângulo girado: comprimento = o sprite, largura 1,8 m (21 px de x).
  // O y do desenho é o lado do carro mais perto da câmera; o centro fica meio carro para o fundo.
  function pegada(x, y, ang, L, W) {
    const fx = Math.cos(ang), fy = -Math.sin(ang), ext = Math.abs(fy) * L + Math.abs(fx) * W, cy = y * KC - ext / 2, out = [];
    for (const [a, b] of [[1, 1], [1, -1], [-1, -1], [-1, 1]]) out.push([x + fx * (a * L) / 2 - fy * (b * W) / 2, cy + fy * (a * L) / 2 + fx * (b * W) / 2]);
    return out;
  }
  function sobrepoe(A, B) { // separação dos eixos (dois retângulos girados)
    for (const P of [A, B]) for (let i = 0; i < 4; i++) {
      const p = P[i], q = P[(i + 1) % 4], nx = q[1] - p[1], ny = p[0] - q[0];
      const pa = A.map((v) => v[0] * nx + v[1] * ny), pb = B.map((v) => v[0] * nx + v[1] * ny);
      if (Math.max(...pa) <= Math.min(...pb) || Math.max(...pb) <= Math.min(...pa)) return false;
    }
    return true;
  }
  function naIlha(P) { // algum ponto da borda do retângulo dentro da ilha (elipse no chão)
    const cx = ROT_X, cy = CENTER * KC, rx = ILHA.rx, ry = ILHA.ry * KC;
    for (let i = 0; i < 4; i++) for (let k = 0; k < 12; k++) {
      const x = lerp(P[i][0], P[(i + 1) % 4][0], k / 12), y = lerp(P[i][1], P[(i + 1) % 4][1], k / 12);
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1) return true;
    }
    return false;
  }
  function pegadaHeroi(t) {
    if (t <= TL.vira) return pegada(carX(t), NEAR, 0, 52, LARG);
    const h = heroi(t);
    return pegada(h.x, h.y, h.h, 52, LARG);
  }
  // confere, quadro a quadro (60 por segundo), que nenhum veículo encosta em outro nem na ilha: lista os contatos
  function verificar(t0, t1) {
    const out = [];
    for (let t = t0; t <= t1 + 1e-6; t += 1 / 60) {
      const cx = [['azul', pegadaHeroi(t)]];
      S.traffic.forEach((c, i) => {
        const p = noTransito(c, t);
        if (p) cx.push(['contra' + i, pegada(p.x, p.y, p.h, c.w, c.larg)]);
      });
      for (let i = 0; i < cx.length; i++) {
        if (naIlha(cx[i][1])) out.push([+t.toFixed(3), cx[i][0], 'ilha']);
        for (let j = i + 1; j < cx.length; j++) if (sobrepoe(cx[i][1], cx[j][1])) out.push([+t.toFixed(3), cx[i][0], cx[j][0]]);
      }
    }
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Peças pequenas desenhadas na hora                                   */
  /* ------------------------------------------------------------------ */
  // poste de concreto (~104 px = 6,5 carros), cruzetas, braço de luz e os fios até o próximo
  function poste(g, o, on, lights) {
    const x = o.x, y = o.y, H = 104;
    R(g, x - 1, y - H, 3, H, '#9a958c'); R(g, x - 1, y - H, 1, H, '#b9b4ad'); R(g, x - 2, y - 3, 5, 3, '#7d7870');
    R(g, x - 7, y - H + 4, 16, 2, '#6d6a64'); R(g, x - 7, y - H + 10, 16, 2, '#6d6a64');
    for (const dx of [-6, 0, 7]) { R(g, x + dx, y - H + 2, 1, 2, '#e9ecef'); R(g, x + dx, y - H + 8, 1, 2, '#e9ecef'); }
    R(g, x + 2, y - H + 22, 12, 1, '#9aa3b0'); R(g, x + 13, y - H + 21, 1, 2, '#9aa3b0'); R(g, x + 11, y - H + 23, 7, 2, on > 0.3 ? '#fff3d6' : '#c8ccd2');
    if (o.trafo) { R(g, x - 9, y - H + 16, 7, 12, '#5d6573'); R(g, x - 9, y - H + 16, 7, 1, '#7d8590'); }
    if (o.nx) g.drawImage(fios(o.nx - x), x, y - H + 4); // os 3 fios até o próximo poste (um sprite feito uma vez)
    if (on > 0.01) {
      lights.push({ x: x + 14, y: y - H + 25, r: 12, c: [255, 214, 150, 0.9 * on] });
      lights.push({ x: x + 14, y: ROAD0 + 8, r: 46, c: [255, 196, 120, 0.2 * on], flat: true });
    }
  }
  // os fios entre dois postes (vão de L px): 2 de energia e 1 de telefone, com a barriga no meio
  const FIOS = {};
  function fios(L) {
    if (FIOS[L]) return FIOS[L];
    const c = DL.mk(L + 1, 36), g = c.getContext('2d');
    for (const [dy, sag] of [[0, 8], [6, 10], [26, 7]]) for (let xx = 0; xx <= L; xx++) { const u = xx / L; R(g, xx, dy + Math.round(sag * 4 * u * (1 - u)), 1, 1, '#2a2f38'); }
    return (FIOS[L] = c);
  }
  // poste alto e fino do lago (~100 px)
  function lamp(g, x, y, on, lights) {
    const H = 100;
    R(g, x, y - H, 2, H, '#9aa3b0'); R(g, x + 1, y - H, 1, H, '#5d6573'); R(g, x, y - H, 14, 1, '#9aa3b0'); R(g, x + 13, y - H, 1, 2, '#9aa3b0');
    R(g, x + 10, y - H + 2, 7, 2, on > 0.3 ? '#fff3d6' : '#c8ccd2'); R(g, x - 1, y - 2, 4, 2, '#3a3f4a');
    if (on > 0.01) {
      lights.push({ x: x + 13, y: y - H + 4, r: 12, c: [255, 214, 150, 0.9 * on] });
      lights.push({ x: x + 13, y: Math.min(y + 16, ROAD1 - 4), r: 40, c: [255, 196, 120, 0.22 * on], flat: true });
    }
  }
  function beam(g, x, y, dir, len, a) {
    const gr = g.createLinearGradient(x, 0, x + dir * len, 0);
    gr.addColorStop(0, 'rgba(255,240,190,' + a.toFixed(3) + ')'); gr.addColorStop(1, 'rgba(255,240,190,0)');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(x, y - 1); g.lineTo(x + dir * len, y - 6); g.lineTo(x + dir * len, y + 7); g.lineTo(x, y + 1); g.closePath(); g.fill();
  }
  function dog(g, x, y, step) {
    R(g, x - 4, y - 5, 8, 3, '#6b4a2a'); R(g, x + 3, y - 7, 3, 3, '#6b4a2a'); R(g, x + 5, y - 6, 1, 1, '#121418'); R(g, x - 5, y - 6, 1, 2, '#6b4a2a');
    const s = step % 2;
    R(g, x - 3 + s, y - 2, 1, 2, '#4a3220'); R(g, x + 2 - s, y - 2, 1, 2, '#4a3220');
  }
  /* Um veículo em perspectiva no plano de lado. No chão (x, Y = y × KY; Y cresce para a câmera) ele é uma caixa
     de L × W; cada face que olha para a câmera (lateral, traseira ou frente) é desenhada coluna por coluna do
     sprite, cada coluna no seu ponto do chão: girar o carro na rotatória fica certo em qualquer ângulo.
     v = { lado: {r, l}, tras, frente } (sprites); (cx, cy) = o centro em px da tela; h = direção (0 = para a
     direita, 90° = para o fundo); s = o tamanho naquela profundidade. Devolve onde ficam as luzes. */
  function carro3d(v, cx, cy, h, s, L, W) {
    /* o carro virando, visto de lado: cada face (a lateral e, quando o carro já virou bastante, a traseira ou a frente)
       é desenhada EM PÉ, com a base reta na linha do chão dela, e encolhida na largura que ela ocupa na tela.
       (antes as faces seguiam a diagonal do chão e a ponta do carro subia como uma porta aberta) */
    const fx = Math.cos(h), fy = -Math.sin(h), rx = -fy, ry = fx, cY = cy * KY;
    const tela = (X, Y) => [cx + (X - cx) * s, cy + ((Y - cY) / KY) * s];
    const P = (a, b) => [cx + fx * a * L / 2 + rx * b * W / 2, cY + fy * a * L / 2 + ry * b * W / 2]; // a: -1 trás / 1 frente, b: -1 esquerda / 1 direita
    // duas poses, como num sprite de pixel art: de lado (encolhendo um pouco na curva) e, passados uns 37°, só de trás
    // (ou de frente) — as duas juntas pareciam dois carros grudados
    const fim = Math.abs(fy) > 0.6, lado = !fim;
    const faces = [];
    if (lado && ry >= 0) faces.push({ spr: v.lado.r, A: P(-1, 1), B: P(1, 1) });          // a lateral direita (da traseira para a frente)
    if (lado && ry < 0) faces.push({ spr: v.lado.l, A: P(1, -1), B: P(-1, -1) });        // a lateral esquerda (da frente para a traseira)
    if (fim && fy < 0 && v.tras) faces.push({ spr: v.tras, A: P(-1, -1), B: P(-1, 1), tras: true });  // a traseira
    if (fim && fy > 0 && v.frente) faces.push({ spr: v.frente, A: P(1, 1), B: P(1, -1), frente: true }); // a frente
    faces.sort((a, b) => a.A[1] + a.B[1] - b.A[1] - b.B[1]); // a de trás primeiro
    const luz = { tras: [], frente: [], dir: fx >= 0 ? 1 : -1, lado: Math.abs(ry) };
    for (const f of faces) {
      const w = f.spr.width, H = f.spr.height, [ax, ay] = tela(f.A[0], f.A[1]), [bx, by] = tela(f.B[0], f.B[1]);
      if (bx - ax < 0.5) continue;
      const hh = Math.max(1, Math.round(H * s)), yb = Math.round((ay + by) / 2);
      // (a traseira/frente vai sempre inteira, na largura dela, no meio do lado do carro)
      const mx = (ax + bx) / 2, ww = f.tras || f.frente ? w * s : bx - ax;
      // (cada coluna da tela pega a coluna do sprite que cai no meio dela; colunas iguais seguidas viram um só desenho)
      const x0 = Math.round(mx - ww / 2), x1 = Math.max(x0 + 1, Math.round(mx + ww / 2));
      let run = -1, rx0 = 0;
      const solta = (xe) => { if (run < 0) return; G.drawImage(f.spr, run, 0, 1, H, rx0, yb - hh, xe - rx0, hh); if (LON) LG.drawImage(f.spr, run, 0, 1, H, rx0, yb - hh, xe - rx0, hh); };
      for (let x = x0; x < x1; x++) {
        const c = clamp(Math.floor(((x + 0.5 - x0) / (x1 - x0)) * w), 0, w - 1);
        if (c !== run) { solta(x); run = c; rx0 = x; }
      }
      solta(x1);
      const em = (u, alt) => [lerp(x0, x1, u), yb - alt * s];
      if (f.tras) luz.tras.push(em(0.17, 11), em(0.83, 11));
      if (f.frente) luz.frente.push(em(0.2, 10), em(0.8, 10));
      if (!f.tras && !f.frente && !fim) { const ini = f.spr === v.lado.r; luz.tras.push(em(ini ? 0.02 : 0.98, 10)); luz.frente.push(em(ini ? 0.97 : 0.03, 10)); }
    }
    return luz;
  }
  function glow(g, x, y, r, c) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + c[3].toFixed(3) + ')'); gr.addColorStop(1, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',0)');
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Prefeitura / Centro Administrativo (foto 08), de longe, do outro lado do lago (não mudou)
  function makePrefeitura() {
    const W = 128, H = 34, c = DL.mk(W, H), g = c.getContext('2d'), B = H, lit = [];
    R(g, 4, B - 20, 120, 20, '#d4d8de'); R(g, 4, B - 21, 120, 1, '#eef0f3'); R(g, 4, B - 20, 120, 1, '#b4bac2');
    for (const y of [B - 17, B - 11]) {
      R(g, 6, y, 116, 4, '#2f7a5a'); R(g, 6, y, 116, 1, '#5fb48a');
      for (let x = 6; x < 122; x += 3) R(g, x, y, 1, 4, '#e9ecef');
      for (let x = 8; x < 120; x += 6) if (hash(x * 7 + y) > 0.35) lit.push([x, y + 2]);
    }
    R(g, 6, B - 6, 116, 5, '#5d6573'); R(g, 6, B - 6, 116, 1, '#7d8590');
    R(g, 52, B - 26, 26, 26, '#c9ced5'); R(g, 52, B - 27, 26, 1, '#eef0f3'); R(g, 55, B - 24, 20, 18, '#2a6e50');
    for (let x = 55; x < 75; x += 4) R(g, x, B - 24, 1, 18, '#a9d8bf');
    R(g, 50, B - 7, 30, 2, '#eef0f3');
    for (let x = 57; x < 74; x += 5) lit.push([x, B - 20], [x, B - 14]);
    const FLAGS = [['#2f9a4a', '#f2c14e'], ['#c8262e', '#e9ecef'], ['#1f3f8a', '#e9ecef'], ['#2f9a4a', '#f2c14e'], ['#e86a2a', '#1f3f8a'], ['#c8262e', '#f2c14e'], ['#2f9a4a', '#1f3f8a']];
    FLAGS.forEach(([a, b], i) => { const x = 30 + i * 11; R(g, x, B - 14, 1, 14, '#c8ccd2'); R(g, x + 1, B - 14, 4, 3, a); R(g, x + 1, B - 12, 4, 1, b); });
    R(g, 10, B - 22, 12, 22, '#eef0f3'); R(g, 10, B - 22, 1, 22, '#c9ced5'); R(g, 12, B - 20, 8, 6, '#2f9a4a'); R(g, 13, B - 19, 6, 4, '#f2c14e'); R(g, 15, B - 18, 2, 2, '#1f3f8a');
    R(g, 12, B - 12, 8, 1, '#c8262e'); R(g, 12, B - 10, 8, 1, '#2a6e50'); R(g, 12, B - 8, 6, 1, '#2a6e50');
    c.lit = lit;
    return c;
  }

  /* O DataLab (o mesmo prédio de maps/rua.js: verde-escuro, faixa e letreiro de néon verde, janelas estreitas
     e o saguão de vidro), visto de frente, colado à direita da Serra Dourada e um pouco recuado.
     As letras NÃO vão no sprite: são escritas na hora, no tamanho inteiro de pixel da tela (ficam nítidas). */
  const DLAB = { W: 176, H: 84, X0: 0, D0: 6, D1: 128 };
  function makeDatalab() {
    const wl = DLAB.W, hh = DLAB.H, base = DL.mk(wl, hh), g = base.getContext('2d'), luz = DL.mk(wl, hh), q = luz.getContext('2d');
    R(g, 0, 0, wl, hh, '#1c3a30'); R(g, 0, 0, wl, 2, '#2f5a4a'); R(g, 0, hh - 4, wl, 4, '#12261f');
    for (let i = 0; i < wl; i += 16) R(g, i, 2, 1, hh - 6, '#16302a');
    R(g, 0, 26, wl, 2, '#145c3d');                                    // a faixa de néon (os tubos apagados)
    const sw = 93, sx = (wl - sw) >> 1;                               // a caixa do letreiro
    R(g, sx, 3, sw, 22, '#0c1612'); R(g, sx, 3, sw, 1, '#1f6b47');
    for (let k = 0; k < 6; k++) { const jx = 13 + k * 27, on = k === 1 || k === 4; R(g, jx, 34, 14, 9, '#0f2a22'); R(g, jx, 34, 14, 1, '#2f5a4a'); if (on) { q.fillStyle = '#5fd0a0'; q.fillRect(jx + 1, 35, 12, 7); } }
    const lx = (wl >> 1) - 32;                                        // o saguão de vidro (a porta)
    R(g, lx - 2, 48, 68, hh - 48, '#0c1612'); R(g, lx, 50, 64, hh - 52, '#0f4a33'); R(g, lx, 50, 64, 3, '#1f9e66');
    for (const i of [21, 31, 42]) R(g, lx + i, 50, 1, hh - 52, '#0c1612');
    q.fillStyle = '#2a8a66'; q.fillRect(lx + 1, 53, 62, hh - 57); R(q, lx + 8, 66, 14, 12, '#1a5a44'); R(q, lx + 44, 60, 10, 18, '#1a5a44');
    for (const i of [21, 31, 42]) R(q, lx + i, 50, 1, hh - 52, '#0c1612');
    // o néon aceso: contorno da caixa e a faixa que corre a fachada inteira
    R(q, sx, 3, sw, 1, '#2fe08a'); R(q, sx, 24, sw, 1, '#2fe08a'); R(q, sx, 3, 1, 22, '#2fe08a'); R(q, sx + sw - 1, 3, 1, 22, '#2fe08a');
    R(q, 0, 25, wl, 1, 'rgba(61,255,160,0.3)'); R(q, 0, 26, wl, 1, '#46f5a6'); R(q, 0, 27, wl, 1, 'rgba(61,255,160,0.3)');
    return { base, luz, sx, sw };
  }
  // o letreiro DATALAB em pixels inteiros da tela: k = tamanho do pixel da fonte (mín. 1)
  /* o letreiro da Serra, nítido: a fachada (reduzida com suavização) vai sem as letras — uma cópia só da cena,
     com o metal repintado por cima delas — e o brasão e o nome são desenhados por cima em pixels inteiros */
  const SERRA_LX = 40; // (onde o brasão começa na fachada; as letras começam 38 px depois)
  function serraLimpa(sp) {
    const c = DL.mk(sp.base.width, sp.base.height), g = c.getContext('2d'), l = DL.mk(sp.base.width, sp.base.height), q = l.getContext('2d');
    g.drawImage(sp.base, 0, 0); q.drawImage(sp.luz, 0, 0);
    const x0 = SERRA_LX - 2, x1 = SERRA_LX + 38 + Math.max(A.textW('CANAÃ DOS CARAJÁS', 1), A.textW('DOURADA', 3)) + 3, lin = g.getImageData(x0, 4, x1 - x0, 1).data;
    for (let i = 0; i < x1 - x0; i++) R(g, x0 + i, 5, 1, 60, `rgb(${lin[i * 4]},${lin[i * 4 + 1]},${lin[i * 4 + 2]})`); // (o metal é de listras em pé)
    q.clearRect(x0, 5, x1 - x0, 60);
    return { base: c, luz: l };
  }
  function letreiroSerra(x0, y0, s, a0) {
    // de longe as letras não cabem: o nome vira traços do tamanho de cada linha (nítidos, sem borrão), e as
    // letras aparecem aos poucos quando passam a caber
    const ta = smooth(0.27, 0.32, s);
    if (ta < 1) for (const [q, cor] of LON ? [[G, '#d9dee5'], [LG, '#f6f8fb']] : [[G, '#d9dee5']]) {
      q.globalAlpha = a0 * (1 - ta); if (q === LG) LG.globalCompositeOperation = 'source-over';
      const bx = Math.round(x0 + SERRA_LX * s), by = Math.round(y0 + 9 * s);
      { const bw = Math.max(3, Math.round(30 * s)), bh = Math.max(4, Math.round(34 * s)), c = q === G ? '#c9ced6' : cor; // o brasão: o contorno do escudo e a folha
        R(q, bx, by, bw, 1, c); R(q, bx, by, 1, bh - 2, c); R(q, bx + bw - 1, by, 1, bh - 2, c); R(q, bx + 1, by + bh - 2, bw - 2, 1, c); R(q, bx + (bw >> 1), by + bh - 1, 1, 1, c); R(q, bx + (bw >> 1), by + 2, 1, bh - 5, c); }
      for (const [t, k, py] of [['FACULDADE', 2, 8], ['SERRA', 3, 21], ['DOURADA', 3, 38], ['CANAÃ DOS CARAJÁS', 1, 57]])
        R(q, Math.round(x0 + (SERRA_LX + 38) * s), Math.round(y0 + (py + 1.5 * k) * s), Math.max(2, Math.round(A.textW(t, k) * s)), Math.max(1, Math.round(2.4 * k * s)), cor);
      q.globalAlpha = 1; if (q === LG) LG.globalCompositeOperation = 'destination-out';
    }
    const a = a0 * ta; if (a <= 0) return;
    const at = (px) => Math.round(x0 + px * s), kb = Math.max(1, Math.round(2 * s)), kf = Math.max(1, Math.round(2 * s)), ks = Math.max(1, Math.round(3 * s));
    const tx = at(SERRA_LX + 38);
    // (as linhas empilhadas com o mesmo respiro, o bloco no meio da placa de metal, linhas 5 a 64)
    const gap = Math.max(1, Math.round(4 * s)), perto = s >= 0.8, hb = 5 * kf + 5 * ks * 2 + gap * 3 + (perto ? 5 : 1);
    let y = Math.round(y0 + 35 * s - hb / 2);
    const linhas = [['FACULDADE', kf], ['SERRA', ks], ['DOURADA', ks]].map(([t, k]) => { const o = [t, k, y]; y += 5 * k + gap; return o; });
    const yc = y, cw = A.textW('CANAÃ DOS CARAJÁS', 1);
    for (const [q, cor, sombra] of LON ? [[G, '#e9edf2', '#6a727e'], [LG, '#f6f8fb', null]] : [[G, '#e9edf2', '#6a727e']]) {
      q.globalAlpha = a;
      if (q === LG) LG.globalCompositeOperation = 'source-over';
      for (const [dx, c] of sombra && kf > 1 ? [[1, sombra], [0, cor]] : [[0, cor]]) {
        A.brasao(q, at(SERRA_LX) + dx, Math.round(y0 + 35 * s - (20 * kb) / 2) + dx, kb, c);
        for (const [t, k, yy] of linhas) A.text(q, t, tx + dx, yy + dx, k, c);
      }
      if (perto) A.text(q, 'CANAÃ DOS CARAJÁS', tx, yc, 1, cor);       // (de perto dá para ler)
      else { q.globalAlpha = a * 0.55; R(q, tx, yc, Math.max(4, Math.round(cw * s)), 1, cor); } // (de longe: só um fio)
      q.globalAlpha = 1;
      if (q === LG) LG.globalCompositeOperation = 'destination-out';
    }
  }
  function letreiroDatalab(x, y, s, on) {
    if (3 * s < 0.9) { // longe demais para ler: só o brilho das letras, do tamanho da caixa
      const w0 = Math.max(1, Math.round(81 * s)), h0 = Math.max(1, Math.round(15 * s)), x0 = Math.round(x - w0 / 2), y0 = Math.round(y - h0 / 2);
      R(G, x0, y0, w0, h0, '#1f6b47');
      if (LON) { LG.globalCompositeOperation = 'source-over'; R(LG, x0, y0, w0, h0, 'rgba(70,245,166,0.75)'); LG.globalCompositeOperation = 'destination-out'; }
      return;
    }
    const k = Math.max(1, Math.round(3 * s)), tw = A.textW('DATALAB', k), tx = Math.round(x - tw / 2), ty = Math.round(y - (5 * k) / 2);
    A.text(G, 'DATALAB', tx, ty, k, '#1f6b47');
    if (!LON) return;
    LG.globalCompositeOperation = 'source-over';
    if (k > 1) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) A.text(LG, 'DATALAB', tx + dx, ty + dy, k, 'rgba(61,255,160,0.22)');
    A.text(LG, 'DATALAB', tx, ty, k, '#46f5a6');
    if (k > 1) A.text(LG, 'DATALAB', tx, ty - 1, k, 'rgba(220,255,236,0.5)');
    A.text(LG, 'DATALAB', tx, ty, k, on > 0.5 ? 'rgba(70,245,166,0.55)' : 'rgba(70,245,166,0.3)');
    LG.globalCompositeOperation = 'destination-out';
  }

  /* ------------------------------------------------------------------ */
  /* Montagem (uma vez)                                                  */
  /* ------------------------------------------------------------------ */
  const WALKERS = [
    { skin: '#c98e66', hair: '#1a1210', hairStyle: 'ponytail', shirt: '#e86a5a', pants: '#2b2f3a', shoes: '#eceff3' },
    { skin: '#8d5a3b', hair: '#0f0b0a', hairStyle: 'buzz', shirt: '#2f6a4a', pants: '#3b4250', shoes: '#16181d' },
    { skin: '#f2c8a0', hair: '#6b4a2a', hairStyle: 'long', shirt: '#c4b5fd', pants: '#2a3140', shoes: '#eceff3' },
    { skin: '#e0ac7e', hair: '#2a1c16', hairStyle: 'curly', shirt: '#f2c14e', pants: '#1f2430', shoes: '#c8262e' },
    { skin: '#a86f4c', hair: '#1a1210', hairStyle: 'short', shirt: '#c8262e', pants: '#2a2f38', shoes: '#eceff3' },
  ];
  let PREF = null;
  const S = { t: 0, cam: null, buf: null, statics: [], people: [], done: false, skipAt: null, caption: '' };
  // a fila de prédios da PA-160 (modelos de abertura-pecas.js) e o vão depois de cada um (vão ≥ 30 ganha uma árvore)
  const ORDEM = [0, 7, 2, 1, 4, 3, 6, 5, 10, 9, 13, 8, 15, 11, 16, 21, 18, 12, 14, 17, 19, 20, 22], VAO = [8, 34, 6, 10, 40, 12, 6, 34, 10, 8, 36, 6, 12, 30, 8, 40, 6, 10, 34, 8, 6, 12, 36];
  // as camadas do meio e do fundo usam mais os prédios altos (aparecem por cima dos telhados da frente)
  const ORDEM_LONGE = [8, 4, 13, 19, 22, 1, 0, 14, 10, 5, 2, 7, 6, 17, 3, 21, 12, 9, 16, 11, 18, 20];
  // o plano de fundo (câmera atrás do carro)
  const FV = 150, FDEC = 2.6, F_T0 = TL.fundo - MIX, F_DUR = TL.para - F_T0, F_TOTAL = FV * (F_DUR - FDEC) + (FV * FDEC) / 2, F_SERRA = F_TOTAL + 120, SERRA_X = 3.15;
  function fDist(tt) {
    tt = clamp(tt, 0, F_DUR);
    if (tt < F_DUR - FDEC) return FV * tt;
    const r = tt - (F_DUR - FDEC);
    return FV * (F_DUR - FDEC) + FV * (r - (r * r) / (2 * FDEC));
  }

  // A montagem é um gerador: cada "yield" é um ponto onde ela pode parar e continuar depois.
  // preparar() (chamada pelo lago, na parte jogável) monta aos poucos no tempo livre de cada quadro;
  // build() termina de uma vez o que faltar (ou tudo, se ?mapa=abertura).
  function build() {
    if (S.pronto) return;
    const g = S.gen || montar();
    S.gen = null;
    while (!g.next().done);
  }
  function preparar() {
    if (S.pronto || S.gen) return;
    S.gen = montar();
    const ric = window.requestIdleCallback || ((f) => setTimeout(() => f({ timeRemaining: () => 8 }), 40));
    const passo = (dl) => {
      if (!S.gen) return;
      const t0 = performance.now(), max = Math.max(3, Math.min(10, dl.timeRemaining()));
      do { if (S.gen.next().done) { S.gen = null; return; } } while (performance.now() - t0 < max);
      ric(passo, { timeout: 400 });
    };
    ric(passo, { timeout: 400 });
  }
  function* montar() {
    const st = [], add = (o) => { st.push(o); return o; };
    const spr = (c, x, y, extra) => add(Object.assign({ k: 'spr', spr: c, x, y }, extra));
    const A_ = (seed, H, x, y, extra) => spr(P.arvoreG(seed, H), x, y, extra);
    /* 1. lago: árvores grandes no canteiro (com espaço para ver o sol na água) e postes altos */
    for (let x = 40, i = 0; x < LAKE_END - 40; x += 130 + Math.round(hash(i * 5) * 70), i++) { A_(i + 1, 72 + Math.round(hash(i * 13) * 26), x, 131 + Math.round(hash(i * 9) * 3), { lake: true, r: 28 }); yield; }
    for (let x = 90; x < LAKE_END; x += 170) add({ k: 'lamp', x, y: 134, lake: true });
    /* 2. PA-160: a SkyFit (foto 15) em escala, carros parados na frente, a bandeira-faixa */
    const sf = P.skyfit();
    yield;
    spr(sf.c, SF_X + sf.w / 2, LOTE, { luz: sf.luz, lights: [[-218, -68, 50, [255, 70, 70, 0.3]], [-203, -18, 44, [190, 220, 255, 0.3]], [-83, -16, 32, [200, 225, 255, 0.35]]] });
    spr(P.bandeirola(), SF_X + sf.w - 34, 128);
    for (const [x, col, dir] of [[SF_X + 40, '#c8ccd2', 1], [SF_X + 170, '#b8333a', -1], [SF_X + 236, '#e9ecef', 1], [SF_X + 430, '#7d8590', 1]]) add({ k: 'parked', x, y: 136, col, dir });
    A_(61, 112, SF_X - 22, LOTE - 2);
    /* 3. casas e comércios em escala: uma fila contínua; árvores grandes nos vãos e atrás dos telhados */
    let x = SF_X + sf.w + 14, n = 0;
    function* casas(ate) {
      for (; ; n++) {
        const m = ORDEM[n % ORDEM.length], p = P.predio(m, n * 5 + 2, n % 3 === 1), vao = VAO[n % VAO.length];
        if (x + p.w > ate) break;
        spr(p.c, x + p.w / 2, LOTE, { luz: p.luz, lights: p.brilhos });
        if (vao >= 30) A_(n + 20, 84 + Math.round(hash(n * 3) * 26), x + p.w + vao / 2, LOTE + 1);
        if (n % 2 === 0) A_(n + 40, 104 + Math.round(hash(n * 7) * 20), x + p.w * (0.25 + hash(n) * 0.5), LOTE - 5);
        if (hash(n * 11) > 0.5) spr(P.capim(n, 14 + Math.round(hash(n) * 10)), x + p.w + vao / 2 + 8, LOTE + 1);
        x += p.w + vao;
        yield;
      }
    }
    yield* casas(PA_END - 6);
    /* canteiro da calçada: postes altos com fios, árvores de calçada (nunca menores que uma casa), placas, ponto de ônibus */
    let ant = null;
    for (let px = 1040, i = 0; px < PA_END; px += 170, i++) { const o = add({ k: 'poste', x: px, y: 134, trafo: i % 4 === 2 }); if (ant) ant.nx = px; ant = o; }
    for (let tx = 1330, i = 0; tx < PA_END - 20; tx += 240 + Math.round(hash(i * 7 + 2) * 90), i++) {
      A_(i + 70, 70 + Math.round(hash(i + 5) * 18), tx, 134);
      spr(P.arbusto(i + 3, 16 + Math.round(hash(i) * 12)), tx + 92, 135);
      yield;
    }
    spr(P.placaVel('40'), 1210, 133); spr(P.placaAzul('PA-160'), 1720, 133); spr(P.placaVel('40'), 2230, 133); spr(P.placaDir('CENTRO >', 'AV. CARAJAS >'), PA_END - 44, 133);
    spr(P.pontoOnibus(), 1960, 129);
    /* canteiro central: palmeiras de verdade (6–8 m) e arbustos */
    for (let mx = 1090, i = 0; mx < PA_END - 30; mx += 200, i++) { spr(P.palmeira(i + 1, 54 + Math.round(hash(i * 3) * 14), 1.8), mx, 153); spr(P.arbusto(i + 30, 16 + Math.round(hash(i * 5) * 10)), mx + 100, 153); yield; }
    /* 4. rotatória: pracinha atrás com árvores grandes, ilha com árvore */
    for (const [tx, h, y] of [[PA_END + 22, 96, 126], [PA_END + 80, 118, 123], [PA_END + 132, 90, 128], [DX - 54, 104, 125]]) { A_(tx, h, tx, y); yield; }
    spr(P.arbusto(5, 26), PA_END + 46, 131); spr(P.arbusto(8, 20), PA_END + 104, 132);
    add({ k: 'island', x: ROT_X, y: CENTER });
    /* a avenida que vai para o fundo: árvores e postes diminuindo dos dois lados */
    for (const k of [0.16, 0.26, 0.4, 0.58, 0.8]) {
      const y = lerp(VPY, ROAD0, k), r = ruaFundo(y);
      for (const lado of [-1, 1]) add({ k: 'sprS', spr: P.arvoreG(600 + (lado > 0 ? 1 : 0), 100), x: r.x + lado * (r.hw + 14 * k + 3), y, s: k * 0.55 });
    }
    /* depois da avenida: mais casas (o carro não chega lá) */
    x = DX + 62; yield* casas(END_X + 300);
    for (let px = DX + 60; px < END_X + 300; px += 170) add({ k: 'poste', x: px, y: 134, nx: px + 170 });
    S.statics = st;

    /* camadas com paralaxe atrás da fila da frente: MEIO (prédios a 0,62, árvores) e LONGE (prédios a 0,4).
       lx = posição na camada; na tela fica em lx - cam × par. Perto da avenida que vai para o fundo
       (na hora da curva) a camada fica vazia, para não ficar em cima dela. */
    function* camada(par, esc, nevoa, cor, base, semente, arvH) {
      const out = [], camV = DX + 14 - 210;
      let lx = (LAKE_END - 500) * par, i = 0;
      while (lx < END_X * par + 700) {
        const p = P.predioSil(i * 7 + semente * 100, esc, nevoa, cor);
        const perto = (a, b) => { const wa = a + camV * (1 - par), wb = b + camV * (1 - par); return wb > DX - 80 && wa < DX + 100; };
        if (!perto(lx, lx + p.w)) out.push({ lx: lx + p.w / 2, y: base, spr: p.c, luz: p.luz });
        const ar = P.arvoreLonge((i % 6) + semente * 50, Math.round(arvH * (0.8 + Math.floor(hash(i * 5 + semente) * 3) * 0.2)), nevoa, cor);
        if (hash(i * 13 + semente) > 0.4 && !perto(lx + p.w - ar.width / 2, lx + p.w + ar.width / 2)) out.push({ lx: lx + p.w + 2, y: base + 1, spr: ar });
        lx += p.w + 3 + Math.round(hash(i * 3 + semente) * 10 * esc);
        i++;
        yield;
      }
      return out;
    }
    S.longe = yield* camada(0.6, 0.35, 0.6, '#6a5a8a', 104, 3, 34);
    S.meio = yield* camada(0.82, 0.55, 0.42, '#7a5a8a', 113, 11, 56);

    /* camadas com paralaxe: mata ao fundo (2) e arbustos/capim na frente (1) */
    S.mata = [P.mata(1, 480, 30, ['#4a6a62', '#5a7c6c']), P.mata(2, 420, 34, ['#33583c', '#447046'])];
    S.frente = [];
    for (let wx = PA0 + 30, i = 0; wx < ROT_X - 60; wx += 60 + Math.round(hash(i * 9 + 1) * 90), i++) {
      const tipo = hash(i * 5 + 2);
      S.frente.push({ wx, spr: tipo < 0.5 ? P.arbusto(i + 50, 22 + Math.round(hash(i) * 16)) : tipo < 0.8 ? P.capim(i + 9, 18 + Math.round(hash(i) * 14)) : P.palmeira(i + 20, 70, 2) });
    }

    PREF = makePrefeitura();
    S.pfBuf = DL.mk(PREF.width, PREF.height);
    S.pfG = S.pfBuf.getContext('2d');
    const gente = [
      { look: 0, a: 60, b: 520, y: 129, sp: 15, ph: 40 }, { look: 1, a: 120, b: 640, y: 132, sp: 18, ph: 300 },
      { look: 2, a: 380, b: 900, y: 128, sp: 13, ph: 120 }, { look: 3, a: 200, b: 820, y: 131, sp: 17, ph: 610 },
      // esperando no ponto de ônibus
      { look: 2, a: 1956, y: 128.6, parado: 'down' }, { look: 3, a: 1974, y: 128.4, parado: 'left' }, { look: 1, a: 1940, y: 129, parado: 'right' },
      // na calçada da frente (do lado da câmera)
      { look: 4, a: 1150, b: 2550, y: 174, sp: 15, ph: 200 }, { look: 0, a: 1400, b: 2550, y: 175, sp: 12, ph: 900 },
    ];
    // a calçada das lojas sempre com alguém andando
    for (let i = 0; i < 14; i++) gente.push({ look: i % 5, a: 1080 + i * 110, b: 1080 + i * 110 + 240, y: 123.5 + (i % 4) * 1.6, sp: 10 + hash(i * 3) * 9, ph: hash(i * 7) * 480 });
    const folhas = []; // uma folha de sprites por visual (fazer uma por pessoa custava segundos)
    for (const L of WALKERS) { folhas.push(DL.makeSheet(L)); yield; }
    S.folhas = folhas;
    S.people = gente.map((p) => Object.assign(p, { sheet: folhas[p.look] }));
    S.dogWalker = folhas[4];
    S.hero = DL.makeSheet(DL.LOOKS.player);
    yield;
    const azul = (DL.Lago && DL.Lago.PAL && DL.Lago.PAL.wa3) || '#3a6ea5'; // a mesma cor do carro do lago
    S.cars = { hero: P.carro(azul), silver: P.carro('#c8ccd2'), gray: P.carro('#7d8590'), red: P.carro('#b8333a'), white: P.carro('#e9ecef') };
    S.heroTras = P.carroPonta(azul, false);
    S.frenteCar = [P.carroPonta('#c8ccd2', true), P.carroPonta('#b8333a', true), P.carroPonta('#e9ecef', true)];
    S.parkedSpr = { '#c8ccd2': S.cars.silver, '#7d8590': S.cars.gray, '#b8333a': S.cars.red, '#e9ecef': S.cars.white };
    // o trânsito no sentido contrário (faixa de lá): carros, motos e um caminhão, um atrás do outro
    const motos = [P.moto('#c8262e', '#3c6aa5', '#f4f6fa'), P.moto('#2a2f38', '#e86a5a', '#c8262e'), P.moto('#1f3f8a', '#f2c14e', '#2a2f38')], truck = P.caminhao('#2f7a4a');
    const fila = [S.cars.silver, motos[0], S.cars.red, S.cars.white, truck, motos[1], S.cars.gray, S.cars.silver, motos[2], S.cars.white, S.cars.red, motos[0], S.cars.gray];
    S.traffic = fila.map((spr, i) => {
      const t0 = 8 + i * 1.95 + hash(i * 5) * 0.8, v = spr === truck ? 80 : spr.r.width < 40 ? 120 : 105;
      return { t0, x0: Math.max(carX(t0) + 280 + Math.round(hash(i * 9) * 140), Math.min(carX(t0) + 720, END_X + 160)), spr, v0: v }; // (sempre entra fora da tela)
    });
    // de cada carro do trânsito também a traseira e a frente (para virar em volta da ilha em perspectiva)
    const corDe = new Map([[S.cars.silver, '#c8ccd2'], [S.cars.gray, '#7d8590'], [S.cars.red, '#b8333a'], [S.cars.white, '#e9ecef']]), pontas = {};
    for (const c of S.traffic) {
      const cor = corDe.get(c.spr);
      c.larg = cor ? LARG : c.spr === truck ? 34 : 8;
      c.v3 = { lado: c.spr, tras: cor ? (pontas[cor + 't'] || (pontas[cor + 't'] = P.carroPonta(cor, false))) : null, frente: cor ? (pontas[cor + 'f'] || (pontas[cor + 'f'] = P.carroPonta(cor, true))) : null };
    }
    S.heroV = { lado: S.cars.hero, tras: S.heroTras };
    S.sim = simularTransito(S.traffic);

    /* o plano de fundo: o que passa dos dois lados da avenida, [X (larguras de pista), D (distância)] */
    const fo = [], fadd = (o) => fo.push(o);
    const poste2 = DL.mk(18, 106), pg = poste2.getContext('2d');
    R(pg, 2, 2, 3, 104, '#9aa3b0'); R(pg, 2, 2, 1, 104, '#c8ccd2'); R(pg, 2, 2, 14, 1, '#9aa3b0'); R(pg, 11, 3, 6, 2, '#fff3d6');
    const serra = A.serra();
    fadd({ X: SERRA_X, D: F_SERRA, spr: serra.base, luz: serra.luz, serra: true, limpa: serraLimpa(serra) });
    // o DataLab: colado à direita da Serra (a mesma linha do chão), com a frente um pouco recuada
    const dl = makeDatalab();
    DLAB.X0 = SERRA_X + serra.w / 2 / 65; DLAB.X1 = DLAB.X0 + DLAB.W / 65;
    fadd({ X: (DLAB.X0 + DLAB.X1) / 2, D: F_SERRA + DLAB.D0, spr: dl.base, luz: dl.luz, datalab: dl });
    /* a chegada: a esquina da faculdade (fotos 06 e 07), com a rua transversal que sobe o morro */
    const F = F_SERRA;
    S.cidade = P.cidadeLonge(3, 420);
    yield;
    const cores = { prata: S.cars.silver, cinza: S.cars.gray, verm: S.cars.red, branco: S.cars.white, azul: P.carro('#2f5f95'), preto: P.carro('#2b2f37') };
    // carros e motos parados no meio-fio da rua transversal (do lado da faculdade e do lado de cá)
    fadd({ X: 3.95, D: F - 21, spr: cores.branco.r });
    for (const [x, c, cap] of [[4.62, '#c8262e', '#16181d'], [4.98, '#23272f', null], [5.34, '#c8262e', '#e9ecef']]) fadd({ X: x, D: F - 20, spr: P.motoParada(c, cap).l });
    fadd({ X: 3.05, D: F - 50, spr: cores.prata.r }); fadd({ X: 4.0, D: F - 50, spr: cores.verm.l });
    fadd({ X: 4.62, D: F - 49, spr: P.motoParada('#1f6fb0', '#f2c14e').r }); fadd({ X: 4.96, D: F - 49, spr: P.motoParada('#2a2f38').r });
    // carros parados mais adiante, no meio-fio da avenida, e do outro lado
    for (const [d, c] of [[46, '#e9ecef'], [84, '#7d8590'], [150, '#b8333a'], [205, '#2f5f95']]) fadd({ X: 0.8, D: F + d, spr: P.carroPonta(c, false) });
    for (const [d, c] of [[-30, '#c8ccd2'], [30, '#2f5f95'], [75, '#e9ecef']]) fadd({ X: -3.02, D: F + d, spr: P.carroPonta(c, true) });
    // a barraca de pastel, as plantas na frente e as árvores
    fadd({ X: 1.28, D: F - 12, spr: P.barraca('#d23a32'), brilho: [[0, 20, 26, [255, 200, 120, 0.5]]] });
    for (let i = 0; i < 4; i++) fadd({ X: 4.05 + i * 0.22, D: F - 3, spr: P.capim(i + 60, 16) });
    fadd({ X: 4.35, D: F - 5, spr: P.palmeira(41, 60, 1.8) });
    for (const [x, n, h] of [[2.2, 301, 14], [3.1, 302, 18], [4.1, 303, 15], [5.2, 304, 20]]) fadd({ X: x, D: F - 66, spr: n % 2 ? P.arbusto(n, h) : P.capim(n, h) });
    fadd({ X: 5.5, D: F - 48, spr: poste2, lamp: -1 });
    yield;
    /* a rua que sobe o morro. A parte plana (a transversal em frente à Serra e a curva) vai no chão, como antes:
       pontos [X, D, altura] com a normal; a parte que sobe é desenhada pelas faixas do chão do morro. */
    {
      const pts = RUA_SOBE.pts, ate = pts.findIndex((q) => q[1] > MORRO.D0 + 2);
      S.subida = pts.slice(0, ate + 1).map((q, i, L) => {
        const a = L[Math.max(0, i - 1)], b = L[Math.min(L.length - 1, i + 1)], tx = (b[0] - a[0]) * LX, td = b[1] - a[1], m = Math.hypot(tx, td) || 1;
        return [[q[0], q[1], 0], [td / m, -tx / m]];
      });
    }
    /* o morro: casas dos dois lados da rua que sobe, casinhas e árvores pela encosta, postes; tudo no chão */
    const MODS = P.MODELOS.map((o, i) => (o && !o.placa && !o.fn ? i : -1)).filter((i) => i >= 0);
    const naMorro = (X, D, spr, extra) => { // apoiado no ponto mais baixo do chão embaixo dele (nunca flutua)
      const hw = (spr.width * ((extra && extra.esc) || 1)) / 130, h = Math.min(alt(X - hw, D), alt(X, D), alt(X + hw, D));
      fadd(Object.assign({ X, D, h, spr, morro: true }, extra));
    };
    for (let D = F + 26, i = 0; D < MORRO.fim - 20; D += 54 + Math.round(hash(i * 3 + 1) * 34), i++) {
      const m = meioEm(D);
      for (const lado of [-1, 1]) {
        const pr = P.predio(MODS[(i * 5 + (lado > 0 ? 3 : 0)) % MODS.length], i * 3 + (lado > 0 ? 7 : 2), lado > 0), esc = 0.6 + hash(i * 9 + lado) * 0.16;
        naMorro(m.X + lado * (1.75 * 0.95 * m.f + (pr.w * esc) / 130 + 0.12), D + (lado > 0 ? 8 : 0), pr.c, { luz: pr.luz, esc });
      }
      if (i % 2 === 0) { const mm = meioEm(D + 30); naMorro(mm.X - (2.0 * 0.95 * mm.f + 1.6), D + 30, P.arvoreG(700 + (i % 5), 70 + (i % 3) * 10)); }
      yield;
    }
    for (let D = F + 40, i = 0; D < MORRO.fim; D += 64, i++) { const m = meioEm(D), lado = i % 2 ? 1 : -1; naMorro(m.X + lado * 1.45 * 0.95 * m.f, D, poste2, { lamp: lado }); }
    // a encosta: casinhas de tamanhos e telhados diferentes, com árvores entre elas
    for (let D = F + 80, j = 0; D < MORRO.D1 - 40; D += 52 + Math.round(hash(j * 5) * 30) + Math.max(0, D - F - 600) * 0.06, j++) {
      const m = D < MORRO.fim + 20 ? meioEm(D) : null;
      for (let X = 8.8 + hash(j * 7) * 2.4; X < 64; X += 3.2 + hash(j * 11 + Math.round(X * 3)) * 2.8) {
        if (m && Math.abs(X - m.X) < 4.8 * m.f) continue; // a rua e as casas da beira dela
        const r = hash(j * 31 + Math.round(X * 10));
        if (r < 0.55) { const cm = casaMorro(j * 97 + Math.round(X * 13)); naMorro(X, D, cm.c, { luz: cm.luz }); }
        else if (r < 0.8) naMorro(X, D, P.arvoreG(720 + (j % 7), 64 + 8 * (j % 3)));
      }
      yield;
    }
    { // a torre de celular no alto do morro, com a luz vermelha piscando
      const tc = DL.mk(13, 90), tg = tc.getContext('2d');
      for (let y = 0; y < 88; y++) { const m = Math.floor(y / 15); R(tg, 6 - m, y, 1, 1, '#8d95a2'); R(tg, 6 + m, y, 1, 1, '#8d95a2'); if (y % 6 === 5) R(tg, 6 - m, y, 2 * m + 1, 1, '#7d8590'); }
      R(tg, 5, 0, 3, 2, '#c8262e');
      naMorro(30, F + 1330, tc, { torre: true });
    }
    // as alturas do chão do morro em cada linha de D (o desenho só lê a tabela) e o mato
    S.hgt = []; S.matoM = [];
    for (let k = 0; k < FAIXAS_MORRO.length; k++) {
      const D = FAIXAS_MORRO[k], H = new Float32Array(Math.round((MX1 - MX0) / MDX) + 1);
      for (let j = 0; j < H.length; j++) H[j] = alt(MX0 + j * MDX, D);
      S.hgt.push(H);
      const Db = FAIXAS_MORRO[k + 1] || D, mm = [];
      for (let i = 0; i < 10; i++) {
        const X = MX0 + hash(k * 131 + i * 17) * 24, DD = lerp(D, Db, hash(k * 71 + i * 29)), m = meioEm(DD);
        if (Math.abs(X - m.X) < 1.8 * m.f && DD < MORRO.fim + 40) continue;
        mm.push([X, DD, alt(X, DD), hash(i * 7 + k) > 0.5]);
      }
      S.matoM.push(mm);
      if (k % 12 === 11) yield;
    }
    // os carros da rua que sobe: parados do lado direito (de quem sobe), três subindo e dois descendo até a esquina
    S.carMorro = ['#e9ecef', '#b8333a', '#2f5f95', '#7d8590', '#c8ccd2', '#3b4250', '#d9a441'].map((c) => ({ lado: P.carro(c), tras: P.carroPonta(c, false), frente: P.carroPonta(c, true) }));
    S.estacionados = [];
    for (let sP = sDaSubida(11.4) + 10, i = 0; sP < sDaSubida(24); sP += 30 + Math.round(hash(i * 7 + 2) * 46), i++) if (hash(i * 13) > 0.25) S.estacionados.push({ s: sP, v: S.carMorro[(i * 3) % 7] });
    S.parada = sDaSubida(2.4); // onde o carro que desce para (antes da faixa de pedestre)
    yield;
    S.adiante = [P.carroPonta('#e9ecef', false), P.carroPonta('#b8333a', false)];
    // gente: [folha, X de a até b, D, velocidade (px/s), fase] — sem velocidade: parado conversando
    S.genteF = [
      { f: 0, a: 1.6, b: 4.7, D: F - 15, v: 16, ph: 10 }, { f: 1, a: 1.7, b: 4.9, D: F - 13, v: 12, ph: 160 }, { f: 2, a: 1.15, b: 4.2, D: F - 55, v: 17, ph: 60 },
      { f: 3, a: 2.0, D: F - 10, dir: 'right' }, { f: 4, a: 2.16, D: F - 10, dir: 'left' }, { f: 1, a: 1.28, D: F - 8, dir: 'up' }, { f: 2, a: 1.46, D: F - 14, dir: 'left' },
      { f: 0, a: 3.0, D: F - 7, dir: 'down' }, { f: 3, a: 3.14, D: F - 8, dir: 'left' }, { f: 4, a: 4.8, D: F - 16, dir: 'left' }, { f: 1, a: 5.6, b: 6.6, D: F - 12, v: 10, ph: 30 },
      { f: 2, a: -3.45, b: -3.45, D: F + 20, dir: 'down' }, { f: 4, a: -3.5, D: F - 10, dir: 'right' },
    ];
    const longe = (D) => D < F_SERRA - 240 || D > F_SERRA + 260; // em volta da faculdade nada tapa a fachada
    for (let D = 150, i = 0; D < F_TOTAL + 900; D += 96, i++) {
      const pr = P.predio(ORDEM[(i * 3 + 5) % ORDEM.length], i * 7 + 1, i % 2 === 0), pl = P.predio(ORDEM[(i * 5 + 2) % ORDEM.length], i * 3 + 4, i % 2 === 1);
      if (longe(D)) {
        fadd({ X: 1.64 + pr.w / 130, D, spr: pr.c, luz: pr.luz });
        fadd({ X: 2.2 + pr.w / 65 + 0.5, D: D + 6, spr: P.arvoreG((i % 5) + 200, 96 + 12 * Math.floor(hash(i * 3) * 3)) });
        fadd({ X: 2 + hash(i * 9) * 1.2, D: D + 60, spr: i % 2 ? P.capim(i, 26) : P.arbusto(i + 9, 26) });
      }
      fadd({ X: -(3.85 + pl.w / 130), D: D + 59, spr: pl.c, luz: pl.luz });
      fadd({ X: -(4.9 + pl.w / 65), D: D + 64, spr: P.arvoreG((i % 5) + 300, 96 + 12 * Math.floor(hash(i * 5) * 3)) });
      fadd({ X: -(4.2 + hash(i * 7) * 1.5), D: D + 2, spr: i % 2 ? P.arbusto(i + 40, 28) : P.capim(i + 3, 26) });
      yield;
    }
    for (let D = 110, i = 0; D < F_TOTAL + 900; D += 92, i++) {
      if (longe(D + 60)) fadd({ X: 1.29, D, spr: P.arvoreG((i % 4) + 400, 72 + 8 * Math.floor(hash(i * 3) * 3)) });
      fadd({ X: -3.47, D: D + 40, spr: P.arvoreG((i % 4) + 500, 72 + 8 * Math.floor(hash(i * 7) * 3)) });
    }
    for (let D = 150, i = 0; D < F_TOTAL + 1100; D += 110, i++) fadd({ X: -1.12, D, spr: i % 2 ? P.palmeira(i + 9, 56 + Math.round(hash(i) * 12), 1.8) : P.arbusto(i + 80, 18 + Math.round(hash(i) * 8)) });
    for (let D = 240, i = 0; D < F_TOTAL + 1100; D += 300, i++) { fadd({ X: 1.08, D, spr: poste2, lamp: -1 }); fadd({ X: -1.12, D: D + 150, spr: poste2, lamp: 1 }); }
    // nada pode ficar dentro do DataLab (árvores, casas e postes que estavam naquele terreno)
    const dentro = (o) => { if (o.datalab) return false; const hw = (o.spr.width * (o.esc || 1)) / 130; return o.X + hw > DLAB.X0 && o.X - hw < DLAB.X1 + 0.3 && o.D > F_SERRA + DLAB.D0 - 2 && o.D < F_SERRA + DLAB.D1 + 10; };
    S.fundo = fo.filter((o) => !dentro(o));
    S.pronto = true;
  }

  /* ------------------------------------------------------------------ */
  /* Desenho                                                             */
  /* ------------------------------------------------------------------ */
  function walkFrame(sheet, dir, dist) { return sheet[dir].walk[Math.floor(dist / 6.5) % 4]; }
  // o mundo é desenhado em duas camadas ao mesmo tempo: G (as cores de dia) e LG (só o que acende).
  // Tudo o que entra em G "apaga" o que estiver atrás em LG: assim uma árvore na frente tapa a janela acesa.
  let G = null, LG = null, LON = false;
  function put(c, x, y, w, h) {
    x = Math.round(x); y = Math.round(y);
    if (w == null) { G.drawImage(c, x, y); if (LON) LG.drawImage(c, x, y); }
    else { w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h)); G.drawImage(c, x, y, w, h); if (LON) LG.drawImage(c, x, y, w, h); }
  }
  function putLuz(c, x, y, w, h) {
    if (!LON) return;
    LG.globalCompositeOperation = 'source-over';
    if (w == null) LG.drawImage(c, Math.round(x), Math.round(y)); else LG.drawImage(c, Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
    LG.globalCompositeOperation = 'destination-out';
  }
  // uma pessoa na escala da viagem (PS: ~20 px de altura), com a sombra
  function person(frame, x, y) {
    R(G, Math.round(x) - 3, Math.round(y) - 1, 7, 1, 'rgba(0,0,0,0.3)');
    put(frame, x - CH.AX * PS, y - CH.AY * PS, frame.width * PS, frame.height * PS);
  }
  function camadas(VW, VH) {
    for (const n of ['buf', 'buf2', 'wbuf', 'lbuf']) if (!S[n] || S[n].width !== VW || S[n].height !== VH) { S[n] = DL.mk(VW, VH); S[n + 'G'] = S[n].getContext('2d'); S[n + 'G'].imageSmoothingEnabled = false; }
  }
  function mundoIni(VW, VH, on, tx, ty) {
    G = S.wbufG; LG = S.lbufG; LON = on > 0.03;
    for (const g of [G, LG]) { g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.imageSmoothingEnabled = false; g.clearRect(0, 0, VW, VH); g.setTransform(1, 0, 0, 1, tx, ty); }
    LG.globalCompositeOperation = 'destination-out';
    return G;
  }
  // fecha o mundo: escurece conforme a hora e cola na imagem; depois soma o que está aceso
  function mundoFim(g, VW, VH, day, warm, on) {
    G.setTransform(1, 0, 0, 1, 0, 0);
    G.globalCompositeOperation = 'source-atop';
    if (warm > 0.02) { G.fillStyle = 'rgba(255,140,70,' + (0.14 * warm).toFixed(3) + ')'; G.fillRect(0, 0, VW, VH); }
    G.fillStyle = 'rgba(8,10,34,' + (0.66 * day).toFixed(3) + ')';
    G.fillRect(0, 0, VW, VH);
    G.globalCompositeOperation = 'source-over';
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(S.wbuf, 0, 0);
    if (LON) { g.globalAlpha = on; g.drawImage(S.lbuf, 0, 0); g.globalAlpha = 1; }
  }
  function luzes(g, lights) {
    for (const L of lights) {
      if (L.beam) { beam(g, L.x, L.y, L.dir, L.len || 70, L.a); continue; }
      if (L.c[3] <= 0.005) continue;
      if (L.flat) { g.save(); g.translate(L.x, L.y); g.scale(1, 0.35); glow(g, 0, 0, L.r, L.c); g.restore(); }
      else glow(g, L.x, L.y, L.r, L.c);
    }
  }
  // céu: laranja e rosa no pôr do sol, azul-escuro à noite; sol, nuvens e os morros
  function ceu(g, VW, base, day, warm, par, t) {
    const sky = g.createLinearGradient(0, 0, 0, base);
    sky.addColorStop(0, mix('#4b2f7a', '#060918', day)); sky.addColorStop(0.6, mix('#e0607e', '#141734', day)); sky.addColorStop(1, mix('#ffa152', '#2b2250', day));
    g.fillStyle = sky;
    g.fillRect(0, 0, VW, base + 6);
    const sunX = Math.round(120 - par * 0.04), sunY = Math.round(base - 16 + day * 50);
    if (day < 0.7) { disc(g, sunX, sunY, 10, mix('#ffc06a', '#ff7a4a', day * 1.4)); disc(g, sunX, sunY, 7, '#ffe6a0'); }
    const cloudA = 1 - smooth(0.3, 0.8, day);
    if (cloudA > 0) {
      g.globalAlpha = cloudA * 0.8;
      for (let i = 0; i < 7; i++) {
        const w = 26 + Math.round(hash(i * 3) * 40), x = ((i * 97 + 40 - par * 0.06) % (VW + 160) + VW + 160) % (VW + 160) - 80, y = base - 74 + Math.round(hash(i * 7) * 46);
        R(g, Math.round(x), y, w, 2, i % 2 ? '#ff9fb0' : '#ffb98a'); R(g, Math.round(x) + 6, y - 1, w - 14, 1, '#ffd0b0');
      }
      g.globalAlpha = 1;
    }
    const hillFar = mix('#8a4f86', '#141433', day), hillNear = mix('#5e3a6e', '#0e1028', day);
    // (os morros: uma coluna de 1 px por x, mas tudo num caminho só e um fill por cor — bem mais leve que 2 × VW fillRect)
    for (const [col, fn] of [[hillFar, (x) => { const w1 = x + par * 0.12; return 14 + 7 * Math.sin(w1 * 0.012) + 4 * Math.sin(w1 * 0.033 + 1.3); }], [hillNear, (x) => { const w2 = x + par * 0.25; return 7 + 4 * Math.sin(w2 * 0.02 + 2) + 3 * Math.sin(w2 * 0.05); }]]) {
      g.beginPath();
      for (let x = 0; x < VW; x++) { const h = fn(x); g.rect(x, Math.round(base - h), 1, Math.ceil(h) + 2); }
      g.fillStyle = col; g.fill();
    }
    return [sunX, sunY];
  }
  function estrelas(g, VW, base, day, t) {
    if (day <= 0.5) return;
    for (let i = 0; i < 60; i++) { const a = (day - 0.5) * 2 * (0.5 + 0.5 * Math.sin(t * 2 + i)); R(g, Math.round(hash(i * 3) * VW), Math.round(hash(i * 7) * (base - 30)), 1, 1, 'rgba(230,235,255,' + a.toFixed(3) + ')'); }
  }

  /* ---------------- plano 1: de lado ---------------- */
  function lado(g, VW, VH, oy, t, day, on, warm) {
    const cx = carX(t), virando = t > TL.vira;
    const pas = S.pas, kp = pas ? smooth(0, 2.6, t - S.t0) : 1;
    let target = t < TL.go ? X_START - VW * 0.45 : cx - VW * lerp(pas ? clamp(pas.fx, 0.2, 0.8) : 0.4, 0.4, kp);
    target = lerp(target, DX + 14 - VW / 2, smooth(TL.vira - 2.6, TL.vira + 0.9, t));
    S.cam = S.cam == null ? target : S.cam + (target - S.cam) * Math.min(1, S.dt * 4);
    S.cam = clamp(S.cam, 0, END_X - VW);
    const cam = Math.round(S.cam);

    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    const [sunX, sunY] = ceu(g, VW, oy + HZ, day, warm, cam, t);
    /* a cidade do outro lado do lago e a Prefeitura */
    const town = mix('#4a3456', '#121530', day), winLit = [];
    const pfX = Math.round(PREF_X - cam * 0.5), pfB = oy + HZ + 3;
    for (let k = Math.floor((cam * 0.5) / 24) - 2, n = k + Math.ceil(VW / 24) + 4; k < n; k++) {
      if (hash(k * 11 + 3) < 0.22) continue;
      const bx = Math.round(k * 24 + hash(k) * 8 - cam * 0.5), w = 12 + Math.round(hash(k * 3) * 16), h = 4 + Math.round(hash(k * 7) * 12);
      if (bx + w > pfX - 6 && bx < pfX + PREF.width + 6) continue;
      R(g, bx, oy + HZ + 2 - h, w, h, town);
      for (let wy = 2; wy < h - 1; wy += 3) for (let wx = 2; wx < w - 1; wx += 3) if (hash(k * 131 + wx * 7 + wy * 13) > 0.62) winLit.push([bx + wx, oy + HZ + 2 - h + wy]);
    }
    if (pfX < VW && pfX + PREF.width > 0) {
      const pg = S.pfG;
      pg.globalCompositeOperation = 'source-over'; pg.clearRect(0, 0, PREF.width, PREF.height); pg.drawImage(PREF, 0, 0);
      pg.globalCompositeOperation = 'source-atop';
      if (warm > 0.02) { pg.fillStyle = 'rgba(255,150,80,' + (0.22 * warm).toFixed(3) + ')'; pg.fillRect(0, 0, PREF.width, PREF.height); }
      pg.fillStyle = 'rgba(110,70,130,0.2)'; pg.fillRect(0, 0, PREF.width, PREF.height);
      pg.fillStyle = 'rgba(10,12,36,' + (0.62 * day).toFixed(3) + ')'; pg.fillRect(0, 0, PREF.width, PREF.height);
      g.drawImage(S.pfBuf, pfX, pfB - PREF.height);
      for (const [wx, wy] of PREF.lit) winLit.push([pfX + wx, pfB - PREF.height + wy]);
    }
    g.globalCompositeOperation = 'lighter';
    if (warm > 0.02) glow(g, sunX, sunY, 80, [255, 160, 90, 0.45 * warm]);
    estrelas(g, VW, oy + HZ, day, t);
    if (on > 0.05) for (const [wx, wy] of winLit) R(g, wx, wy, 1, 1, 'rgba(255,200,120,' + (0.8 * on).toFixed(3) + ')');
    g.globalCompositeOperation = 'source-over';

    /* ---- o mundo ---- */
    const w = mundoIni(VW, VH, on, -cam, oy);
    const x0 = cam, x1 = cam + VW;
    const span = (a, b, y0, y1, col) => { const X = Math.max(a, x0 - 2), Y = Math.min(b, x1 + 2); if (Y > X) R(w, X, y0, Y - X, y1 - y0, col); };
    span(-1e4, 1e5, HZ, WATER, mix('#4a3048', '#0e1022', day));
    const water = w.createLinearGradient(0, WATER, 0, MARGIN);
    water.addColorStop(0, mix('#f0a08a', '#1b2142', day)); water.addColorStop(1, mix('#9a5a7e', '#0f1328', day));
    span(-400, LAKE_END, WATER, MARGIN, water);
    for (let y = WATER + 2; y < MARGIN - 1; y += 3) for (let k = 0; k < 10; k++) {
      const wx = Math.round(((hash(y * 17 + k) * 1400 + t * (y % 2 ? 6 : -6)) % 1400) - 200);
      if (wx < LAKE_END - 8 && wx > x0 - 10 && wx < x1) R(w, wx, y, 4 + (k % 3) * 2, 1, mix('#ffc8a8', '#2c3460', day));
    }
    if (warm > 0.02) {
      const rx = cam + sunX;
      w.globalAlpha = warm;
      for (let y = WATER; y < MARGIN; y++) { const ww = 2 + Math.round((y - WATER) * 0.4 + 2 * Math.sin(t * 3 + y * 1.7)), off = Math.round(2 * Math.sin(t * 2 + y)); if (rx < LAKE_END) R(w, rx - ww + off, y, 2 * ww, 1, y % 2 ? '#ffd38a' : '#ffb36b'); }
      w.globalAlpha = 1;
    }
    // beira do lago e canteiro
    span(-400, LAKE_END, MARGIN, MARGIN + 2, '#c9c2b5'); span(-400, LAKE_END, MARGIN + 2, MARGIN + 3, '#e8c15a');
    span(-400, LAKE_END + 30, MARGIN + 3, ROAD0, '#4f8a4a'); span(LAKE_END - 3, LAKE_END, WATER, MARGIN + 3, '#c9c2b5');
    // depois do lago: terrenos com gramado
    span(LAKE_END, 1e5, WATER, LOTE, '#6f8a54');
    for (let x = Math.max(LAKE_END, x0 - (x0 % 7)); x < x1; x += 7) R(w, x, 100 + Math.round(hash(x) * 18), 2, 1, hash(x * 3) > 0.5 ? '#84a05e' : '#5e7a48');
    // a mata ao fundo, em duas camadas mais lentas que a rua (só depois do lago)
    w.save(); w.beginPath(); w.rect(LAKE_END + 30, 0, 1e5, H0 + 60); w.clip();
    const camada = (lista, par) => {
      const off = cam * (1 - par);
      for (const o of lista) {
        const hw = o.spr.width / 2, wx = o.lx + off;
        if (wx + hw < x0 || wx - hw > x1) continue;
        put(o.spr, wx - hw, o.y - o.spr.height);
        if (o.luz) putLuz(o.luz, wx - hw, o.y - o.spr.height);
      }
    };
    for (const [i, par, by] of [[0, 0.5, 108], [1, 0.75, 117]]) {
      const m = S.mata[i], off = cam * (1 - par);
      for (let k = Math.floor((x0 - off) / m.width) - 1; k * m.width + off < x1; k++) { const mx = Math.round(k * m.width + off); w.drawImage(m, mx, by - m.height); R(w, mx, by, m.width, 6, i ? '#447046' : '#5a7c6c'); }
      camada(i ? S.meio : S.longe, i ? 0.82 : 0.6);   // longe depois da 1ª mata; meio depois da 2ª
    }
    w.restore();
    span(LAKE_END + 30, 1e5, LOTE - 2, LOTE, '#7a8a5a');
    // calçada de tijolinho (fotos 02 e 03) e o canteiro de grama
    span(LAKE_END + 30, 1e5, LOTE, 130, '#a8564a');
    for (let y = LOTE; y < 130; y += 2) span(LAKE_END + 30, 1e5, y, y + 1, '#8a4038');
    for (let x = Math.max(LAKE_END + 30, x0 - (x0 % 9)); x < x1; x += 9) R(w, x, LOTE, 1, 8, '#96483e');
    span(LAKE_END + 30, 1e5, 130, ROAD0, '#4f8a4a');
    for (let x = Math.max(LAKE_END + 30, x0 - (x0 % 5)); x < x1; x += 5) R(w, x, 131 + Math.round(hash(x * 7) * 3), 1, 2, hash(x) > 0.5 ? '#5f9d52' : '#447a40');
    // vagas em frente à SkyFit
    span(SF_X + 6, SF_X + SF_W - 4, 130, ROAD0, '#55595f');
    for (let x = SF_X + 8; x < SF_X + SF_W - 4; x += 60) span(x, x + 1, 130, ROAD0, '#c9ccd1');
    // rotatória: pracinha e calçada de concreto
    span(PA_END, DX + 44, LOTE, 128, '#6f9a55'); span(PA_END, DX + 44, 128, ROAD0, '#b9b4ad');
    for (let x = Math.max(PA_END, x0 - (x0 % 12)); x < Math.min(DX + 44, x1); x += 12) R(w, x, 128, 1, 8, '#a39e96');
    // a avenida que vai para o fundo (em perspectiva, com a curva)
    if (x1 > DX - 60 && x0 < DX + 90) {
      for (let y = VPY + 1; y < ROAD0; y++) {
        const r = ruaFundo(y), a = Math.round(r.x - r.hw), b = Math.round(r.x + r.hw);
        R(w, a - 2 - Math.round(r.k * 5), y, b - a + 4 + Math.round(r.k * 10), 1, '#b9b4ad'); // calçadas
        R(w, a, y, b - a, 1, '#474c57');
        R(w, a, y, 1, 1, '#d9dde3'); R(w, b - 1, y, 1, 1, '#d9dde3');
        if (Math.floor(9 / (r.k + 0.08)) % 2 === 0 && r.hw > 5) R(w, Math.round(r.x), y, 1, 1, '#e8c15a');
      }
    }
    // a avenida
    span(-1e4, 1e5, ROAD0, ROAD1, '#474c57');
    for (let x = Math.floor(x0 / 6) * 6; x < x1; x += 6) R(w, x + Math.round(hash(x) * 4), ROAD0 + 2 + Math.round(hash(x * 3) * 26), 1, 1, '#555a66');
    span(-1e4, 1e5, ROAD0, ROAD0 + 1, '#5d6573'); span(-1e4, 1e5, ROAD1 - 1, ROAD1, '#9aa3b0');
    span(DX - 31, DX + 31, ROAD0, ROAD0 + 1, '#474c57');
    for (let x = Math.floor(x0 / 16) * 16; x < x1; x += 16) if ((x < 1040 || x > PA_END + 20) && Math.abs(x + 4 - ROT_X) > 46 && Math.abs(x + 4 - DX) > 40) R(w, x, CENTER, 8, 1, '#d9dde3');
    // a rotatória: o asfalto abre um círculo em volta da ilha (por trás dela passa quem vem no sentido contrário)
    if (x1 > ROT_X - BOCA.rx && x0 < ROT_X + BOCA.rx) for (let y = CENTER - BOCA.ry + 1; y <= ROAD0; y++) {
      const q = (y - CENTER) / BOCA.ry, hw = Math.round(BOCA.rx * Math.sqrt(Math.max(0, 1 - q * q)));
      if (hw < 1) continue;
      R(w, ROT_X - hw, y, 2 * hw, 1, '#474c57');
      const r = ruaFundo(y), ra = r.x - r.hw - 1, rb = r.x + r.hw + 1, meio = (x) => x >= ra && x <= rb; // (na boca da avenida não há meio-fio)
      if (!meio(ROT_X - hw - 1)) R(w, ROT_X - hw - 1, y, 1, 1, '#9aa3b0');
      if (!meio(ROT_X + hw)) R(w, ROT_X + hw, y, 1, 1, '#9aa3b0');
    }
    // canteiro central com grama (na PA-160)
    span(1050, PA_END + 14, 149, 154, '#c9ccd1'); span(1052, PA_END + 12, 150, 153, '#4f8a4a');
    for (let x = Math.max(1052, x0 - (x0 % 4)); x < Math.min(PA_END + 12, x1); x += 4) R(w, x, 150 + (x % 3), 1, 1, '#62a052');
    for (let y = ROAD0 + 2; y < ROAD1 - 2; y += 4) span(PA_END + 34, PA_END + 46, y, y + 2, '#e9ecef'); // faixa de pedestre
    span(-1e4, 1e5, ROAD1, WALK, '#9aa3b0'); span(-1e4, 1e5, WALK, FRONT, '#8e8a84');
    for (let x = Math.floor(x0 / 12) * 12; x < x1; x += 12) R(w, x, WALK, 1, FRONT - WALK, '#7a7670');
    span(-1e4, 1e5, FRONT, H0 + 60, '#3f6e3c');
    for (let x = Math.floor(x0 / 5) * 5; x < x1; x += 5) R(w, x, FRONT + 1 + Math.round(hash(x * 5) * 10), 1, 2, hash(x) > 0.5 ? '#4f8244' : '#33603a');

    // sombras compridas do pôr do sol (só no lago)
    if (warm > 0.02) {
      w.fillStyle = 'rgba(20,10,30,' + (0.3 * warm).toFixed(3) + ')';
      const sunW = cam + sunX;
      for (const o of S.statics) {
        if (!o.lake || o.x < x0 - 40 || o.x > x1 + 40) continue;
        const ww = o.r || 1, len = o.r ? 22 + o.r : 30, dir = o.x > sunW ? 1 : -1;
        w.beginPath(); w.moveTo(o.x - ww, o.y); w.lineTo(o.x + ww, o.y); w.lineTo(o.x + ww + dir * len * 0.45, o.y + len * 0.5); w.lineTo(o.x - ww + dir * len * 0.45, o.y + len * 0.5); w.closePath(); w.fill();
      }
    }

    // tudo o que fica em pé, de trás para a frente
    const lights = [], list = [];
    for (const o of S.statics) if (o.x > x0 - 240 && o.x < x1 + 240) list.push(o);
    for (const p of S.people) {
      if (p.parado) { list.push({ k: 'walker', y: p.y, x: p.a, dir: p.parado, parado: true, sheet: p.sheet }); continue; }
      const L = p.b - p.a, q = (((p.ph + p.sp * t) % (2 * L)) + 2 * L) % (2 * L);
      list.push({ k: 'walker', y: p.y, x: q < L ? p.a + q : p.a + 2 * L - q, dir: q < L ? 'right' : 'left', dist: p.sp * t, sheet: p.sheet });
    }
    const dwx = 2500 - 11 * t;
    list.push({ k: 'walker', y: 128, x: dwx, dir: 'left', dist: 11 * t, sheet: S.dogWalker });
    list.push({ k: 'dog', y: 129, x: dwx - 14, step: Math.floor(t * 6) });
    for (const c of S.traffic) { const p = noTransito(c, t); if (p && p.x > x0 - 140 && p.x < x1 + 140) list.push({ k: 'traffic', y: p.y, x: p.x, h: p.h, c }); }
    const cv = virando ? heroi(t) : null;
    list.push(cv ? { k: 'vira', x: cv.x, y: cv.y, cy: cv.cy, h: cv.h, s: cv.s } : { k: 'hero', y: NEAR, x: cx });
    let hb = null;
    if (t < TL.walk0) hb = { x: 150, y: 174, dir: 'right', walk: false };
    else if (t < TL.walk1) hb = { x: lerp(150, 238, (t - TL.walk0) / (TL.walk1 - TL.walk0)), y: 174, dir: 'right', walk: true, dist: (t - TL.walk0) * 26 };
    else if (t < TL.inCar) hb = { x: 238, y: 174, dir: 'up', walk: false, a: 1 - smooth(TL.walk1 + 0.2, TL.inCar, t) };
    if (hb) list.push(Object.assign({ k: 'boneco' }, hb));
    list.sort((a, b) => a.y - b.y || a.x - b.x);

    for (const o of list) {
      switch (o.k) {
        case 'spr':
          if (o.spr.sombra) oval(w, Math.round(o.x), Math.round(o.y), o.spr.sombra, 3, 'rgba(12,24,14,0.24)'); // a sombra da copa
          put(o.spr, o.x - (o.spr.width >> 1), o.y - o.spr.height);
          if (o.luz) putLuz(o.luz, o.x - (o.spr.width >> 1), o.y - o.spr.height);
          if (o.lights && on > 0.01) for (const [dx, dy, r, c, flat] of o.lights) lights.push({ x: o.x + dx, y: o.y + dy, r, c: [c[0], c[1], c[2], c[3] * on], flat: !!flat });
          break;
        case 'sprS': put(o.spr, o.x - (o.spr.width * o.s) / 2, o.y - o.spr.height * o.s, o.spr.width * o.s, o.spr.height * o.s); break;
        case 'lamp': lamp(w, o.x, o.y, on, lights); break;
        case 'poste': poste(w, o, on, lights); break;
        case 'dog': dog(w, o.x, o.y, o.step); break;
        case 'island': {
          oval(w, o.x, o.y, ILHA.rx, ILHA.ry, '#e9ecef'); oval(w, o.x, o.y, ILHA.rx - 2, ILHA.ry - 1, '#9aa3b0'); oval(w, o.x, o.y - 1, ILHA.rx - 4, ILHA.ry - 2, '#4f8a4a');
          const tr = S.ilha || (S.ilha = P.arvoreG(7, 66)), b1 = S.ilhaB || (S.ilhaB = P.arbusto(4, 18));
          put(b1, o.x - 26, o.y + 2 - b1.height); put(b1, o.x + 12, o.y + 3 - b1.height); put(tr, o.x - (tr.width >> 1), o.y + 1 - tr.height);
          break;
        }
        case 'parked': put(o.dir > 0 ? S.parkedSpr[o.col].r : S.parkedSpr[o.col].l, o.x - 26, o.y - 21); break;
        case 'traffic': {
          const c = o.c, L = c.w, cyc = o.y - (L * Math.abs(Math.sin(o.h)) + c.larg * Math.abs(Math.cos(o.h))) / 2 / KY;
          const lz = carro3d(c.v3, o.x, cyc, o.h, 1, L, c.larg);
          if (on > 0.01) {
            if (lz.dir === -1 && lz.frente[0]) lights.push({ beam: true, x: lz.frente[0][0], y: lz.frente[0][1], dir: -1, len: 70 * lz.lado, a: 0.35 * on * lz.lado });
            for (const q of lz.tras) lights.push({ x: q[0], y: q[1], r: 4, c: [255, 60, 60, 0.7 * on] });
            for (const q of lz.frente) if (!lz.dir) lights.push({ x: q[0], y: q[1], r: 4, c: [255, 240, 190, 0.6 * on] });
          }
          break;
        }
        case 'hero': {
          put(S.cars.hero.r, o.x - 26, o.y - 21);
          if (t > TL.inCar) { // o boneco sentado aparece pela janela da frente
            const x0c = Math.round(o.x) - 25, by = Math.round(o.y);
            w.save(); w.beginPath(); w.rect(x0c + 25, by - 18, 11, 5); w.clip(); w.drawImage(S.hero.right.idle, x0c + 30 - CH.AX, by - 15 - 11); w.restore();
          }
          if (t > TL.walk1 && t < TL.inCar + 0.2) R(w, Math.round(o.x) - 1, Math.round(o.y) - 17, 1, 12, '#f4f6fa'); // porta aberta
          const hl = Math.max(on, t > TL.go - 0.5 ? 0.3 : 0);
          if (hl > 0.01) lights.push({ beam: true, x: o.x + 25, y: o.y - 9, dir: 1, a: 0.45 * hl }, { x: o.x - 25, y: o.y - 9, r: 4, c: [255, 60, 60, 0.8 * hl] });
          break;
        }
        case 'vira': { // virando na rotatória e indo para o fundo: o carro em perspectiva (carro3d)
          const lz = carro3d(S.heroV, o.x, o.cy, o.h, o.s, 52, LARG), hl = Math.max(on, 0.3);
          for (const q of lz.tras) lights.push({ x: q[0], y: q[1], r: 4 * o.s + 1, c: [255, 60, 60, 0.8 * hl] });
          if (lz.dir === 1 && lz.frente[0]) lights.push({ beam: true, x: lz.frente[0][0], y: lz.frente[0][1], dir: 1, len: 70 * lz.lado, a: 0.45 * hl * lz.lado });
          // a seta da direita (para sair da rotatória), na lanterna direita
          const sd = lz.tras[lz.tras.length - 1];
          if (sd && o.x > ROT_X + 20 && o.y > 128 && Math.floor(t * 3.2) % 2 === 0) { R(w, Math.round(sd[0]), Math.round(sd[1]) - 1, 2, 2, '#ffb030'); lights.push({ x: sd[0] + 1, y: sd[1], r: 5, c: [255, 170, 40, 0.9] }); }
          break;
        }
        case 'walker': person(o.parado ? o.sheet[o.dir].idle : walkFrame(o.sheet, o.dir, o.dist), o.x, o.y); break;
        case 'boneco': w.globalAlpha = o.a == null ? 1 : o.a; person(o.walk ? walkFrame(S.hero, o.dir, o.dist) : S.hero[o.dir].idle, o.x, o.y); w.globalAlpha = 1; break;
      }
    }
    // a camada da frente: arbustos, capim e palmeiras que passam mais depressa que a rua
    for (const f of S.frente) {
      const fx = 1.4 * (f.wx - cam) - 0.2 * VW + cam;
      if (fx < x0 - 50 || fx > x1 + 50) continue;
      put(f.spr, fx - (f.spr.width >> 1), FRONT + 5 - f.spr.height);
    }
    mundoFim(g, VW, VH, day, warm, on);

    /* ---- luzes (somam) ---- */
    g.globalCompositeOperation = 'lighter';
    g.setTransform(1, 0, 0, 1, -cam, oy);
    if (warm > 0.02 && cam + sunX < LAKE_END) glow(g, cam + sunX, WATER + 10, 60, [255, 170, 100, 0.3 * warm]);
    luzes(g, lights);
    g.globalCompositeOperation = 'source-over';
    g.setTransform(1, 0, 0, 1, 0, 0);
  }

  // a lateral do prédio da faculdade, do lado da avenida (a fachada é uma placa de frente: com a lateral ele ganha
  // volume): metal em cima, marquise, vidraça acesa e os painéis de propaganda. Coluna por coluna da tela.
  function lateralSerra(proj, F, dist, VW) {
    const X = SERRA_X - 1.62, D1 = F + 150, [xa, ya] = proj(X, F, 0), [xb] = proj(X, D1, 0), za = F - dist, zb = D1 - dist;
    if (za < 40) return;
    const i0 = Math.max(0, Math.floor(xb)), i1 = Math.min(VW, Math.ceil(xa));
    for (let i = i0; i < i1; i++) {
      const q = clamp((xa - i) / Math.max(1, xa - xb), 0, 1), iz = lerp(1 / za, 1 / zb, q), s = 60 * iz, D = (1 / iz - za) / (zb - za), base = proj(X, F + 150 * D, 0)[1];
      const R2 = (h1, h0, col) => { const a = Math.round(base - h1 * s), b = Math.round(base - h0 * s); R(G, i, a, 1, Math.max(1, b - a), col); if (LON) LG.fillRect(i, a, 1, Math.max(1, b - a)); };
      const nerv = Math.floor(D * 60) % 2, painel = D > 0.5;
      R2(120, 52, painel ? (nerv ? '#7d858f' : '#858d97') : nerv ? '#8d95a2' : '#a2aab6');
      R2(54, 43, '#9c5029'); R2(43, 0, '#b4b8be'); R2(5, 0, '#8a8f97');
      if (!painel && D > 0.06) R2(38, 8, '#59606b');
      if (painel && D < 0.94 && (D < 0.71 || D > 0.74)) { R2(100, 10, '#eef1f2'); R2(100, 62, D < 0.71 ? '#2f8a5a' : '#d8552f'); }
      if (LON) {
        const L2 = (h1, h0, col) => { const a = Math.round(base - h1 * s), b = Math.round(base - h0 * s); LG.globalCompositeOperation = 'source-over'; R(LG, i, a, 1, Math.max(1, b - a), col); LG.globalCompositeOperation = 'destination-out'; };
        if (!painel && D > 0.06 && Math.floor(D * 100) % 12 > 1) L2(38, 10, '#e3c391');
        if (painel && D < 0.94 && (D < 0.71 || D > 0.74)) { L2(100, 62, D < 0.71 ? '#2c7550' : '#b04a2a'); L2(62, 10, '#aab2b4'); }
      }
    }
  }

  // o telhado do DataLab (a câmera fica um pouco acima dele: aparece uma faixa fina) com as máquinas do ar
  function telhadoDatalab(proj, dist) {
    const F = F_SERRA, a = F + DLAB.D0, b = F + DLAB.D1, h = DLAB.H, X0 = DLAB.X0, X1 = DLAB.X1;
    if (a - dist < 40) return;
    const poli = (pts, col) => { for (const q of LON ? [G, LG] : [G]) { q.beginPath(); pts.forEach((p, i) => (i ? q.lineTo(p[0], p[1]) : q.moveTo(p[0], p[1]))); q.closePath(); q.fillStyle = col; q.fill(); } };
    poli([proj(X0, a, h), proj(X1, a, h), proj(X1, b, h), proj(X0, b, h)], '#24443a');
    poli([proj(X0 + 0.08, a + 5, h), proj(X1 - 0.08, a + 5, h), proj(X1 - 0.08, b - 5, h), proj(X0 + 0.08, b - 5, h)], '#1a342c');
    for (const [ux, ud] of [[0.3, 30], [1.4, 60]]) { // duas caixas de ar-condicionado
      const xa = X0 + ux, da = a + ud, p0 = proj(xa, da, h), p1 = proj(xa + 0.5, da, h), t0 = proj(xa, da, h + 12);
      const L = Math.round(p0[0]), Rr = Math.round(p1[0]), T0 = Math.round(t0[1]), B0 = Math.round(p0[1]);
      if (Rr - L >= 1 && B0 - T0 >= 1) { R(G, L, T0, Rr - L, B0 - T0, '#565d68'); R(G, L, T0, Rr - L, 1, '#8a93a0'); if (LON) LG.fillRect(L, T0, Rr - L, B0 - T0); }
    }
  }

  /* ------------------------------------------------------------------ */
  /* O morro do bairro (plano 2), à direita do DataLab: um chão com altura de verdade (não é mais um desenho
     chapado no horizonte). Ele é pintado em faixas de distância, da mais longe para a mais perto, junto com
     o resto da cena: o que está mais perto cobre o que está atrás, e uma casa atrás de uma lombada some
     atrás dela. A rua sobe cortada na encosta (o chão fica na altura dela) e tudo — casas, postes, árvores,
     carros — é apoiado no chão naquele ponto.
     No chão: 1 largura de pista (X) = LX unidades de D. */
  const LX = 14.7, CAR_L = 11.2, CAR_W = 6.5; // o carro no chão: 52 × 30 px do sprite
  const MORRO = { D0: F_SERRA - 24, D1: F_SERRA + 1500, fim: F_SERRA + 780 };
  // o meio da rua que sobe [X, D]: começa na transversal (plana, em frente à Serra) e vira para o fundo depois do DataLab
  const RUA_SOBE = trilha([[0.9, -36], [3.0, -36], [6.0, -36], [8.4, -35.5], [9.9, -29], [10.8, -14], [11.3, 10], [12.0, 48], [13.2, 105], [15.0, 180], [17.6, 280], [21.0, 400], [25.2, 550], [30.0, 720], [33.0, 830]].map(([x, d]) => [x, F_SERRA + d]), LX, 1);
  const SOBE_I0 = RUA_SOBE.pts.findIndex((p) => p[1] > F_SERRA - 34); // daqui em diante o D só cresce
  // o meio da rua numa linha de D (só na parte que sobe): X, a direção e a meia largura da pista medida em X
  function meioEm(D) {
    const P0 = RUA_SOBE.pts;
    let lo = SOBE_I0, hi = P0.length - 1;
    if (D <= P0[lo][1]) hi = lo + 1;
    else if (D >= P0[hi][1]) lo = hi - 1;
    else while (hi - lo > 1) { const m = (lo + hi) >> 1; if (P0[m][1] <= D) lo = m; else hi = m; }
    const a = P0[lo], b = P0[hi], k = clamp((D - a[1]) / Math.max(1e-6, b[1] - a[1]), 0, 1);
    const tx = (b[0] - a[0]) * LX, td = b[1] - a[1], m = Math.hypot(tx, td) || 1;
    return { X: lerp(a[0], b[0], k), f: Math.min(4, m / Math.max(0.2, Math.abs(td))) }; // f: quanto X cabe numa pista naquela linha
  }
  // a altura natural do morro (0 na cidade, à esquerda e perto da transversal; sobe para a direita e para o fundo)
  function altMorro(X, D) {
    const xi = clamp(((X - 8.5) * LX * 0.55 + (D - F_SERRA - 20)) / 1150, 0, 1);
    const h = 760 * Math.pow(xi, 1.5) + xi * (22 * Math.sin(X * 0.7 + D * 0.005) + 14 * Math.sin(D * 0.017 - X * 0.4));
    // (a borda da esquerda desce aos poucos: longe, a encosta se abre e termina atrás da cidade)
    return Math.max(0, h * smooth(6.9, 9.6 + Math.max(0, D - F_SERRA - 200) / 22, X));
  }
  // com a rua cortada na encosta: na faixa da rua e das calçadas o chão fica na altura do meio da rua
  function alt(X, D) {
    const nat = altMorro(X, D);
    if (D < MORRO.D0 - 20 || D > MORRO.fim + 80) return nat;
    const m = meioEm(D), hr = altMorro(m.X, D), k = smooth(1.7, 3.4, Math.abs(X - m.X) / (0.95 * m.f));
    return lerp(lerp(hr, nat, k), nat, smooth(MORRO.fim, MORRO.fim + 80, D));
  }
  // as faixas de D do chão do morro (fixas no mundo: a textura não "anda"); mais finas perto
  const MX0 = 6.4, MX1 = 140, MDX = 0.1;
  const FAIXAS_MORRO = (() => { const out = []; for (let D = MORRO.D0; D < MORRO.D1; D += 6 + (D - MORRO.D0) * 0.07) out.push(D); out.push(MORRO.D1); return out; })();
  // um ponto da rua que sobe a uma distância s do começo, com a pista: lado = pistas para a direita de quem anda nela
  function naSubida(s, lado, sentido) {
    const p = noCaminho(RUA_SOBE, s), q1 = noCaminho(RUA_SOBE, s + 1.5), q0 = noCaminho(RUA_SOBE, s - 1.5);
    let fx = (q1.x - q0.x) * LX, fd = q1.y - q0.y; const m = Math.hypot(fx, fd) || 1; fx /= m; fd /= m;
    if (sentido < 0) { fx = -fx; fd = -fd; }
    const X = p.x + (fd * lado * 14) / LX, D = p.y - fx * lado * 14; // a direita de quem anda = (fd, -fx) no chão
    return { X, D, ang: Math.atan2(fd, fx) };
  }
  function sDaSubida(X) { let lo = 0, hi = RUA_SOBE.len; for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (noCaminho(RUA_SOBE, m).x < X) lo = m; else hi = m; } return lo; }

  /* um carro em perspectiva no plano de trás (como carro3d): cada face que olha para a câmera é desenhada coluna
     por coluna, cada coluna no seu ponto do chão (e na altura do chão ali: na ladeira o carro inclina junto) */
  function carroFundo(v, X, D, ang, proj, dist, camX) {
    const fx = Math.cos(ang), fd = Math.sin(ang), rx = fd, rd = -fx, gx = X * LX;
    const P0 = (a, b) => [(gx + fx * a * CAR_L / 2 + rx * b * CAR_W / 2) / LX, D + fd * a * CAR_L / 2 + rd * b * CAR_W / 2];
    const cam = [camX, dist - 60];
    const ve = (A, B, nx, nd) => { const mx = (A[0] + B[0]) / 2, md = (A[1] + B[1]) / 2; return nx * (cam[0] - mx) * LX + nd * (cam[1] - md) > 0; };
    const faces = [];
    const add = (spr, A, B, tipo) => faces.push({ spr, A, B, tipo, z: (A[1] + B[1]) / 2 });
    { const A = P0(-1, 1), B = P0(1, 1); if (ve(A, B, rx, rd)) add(v.lado.r, A, B, 'lado'); }
    { const A = P0(1, -1), B = P0(-1, -1); if (ve(A, B, -rx, -rd)) add(v.lado.l, A, B, 'lado'); }
    { const A = P0(-1, -1), B = P0(-1, 1); if (ve(A, B, -fx, -fd)) add(v.tras, A, B, 'tras'); }
    { const A = P0(1, 1), B = P0(1, -1); if (ve(A, B, fx, fd)) add(v.frente, A, B, 'frente'); }
    faces.sort((a, b) => b.z - a.z);
    const luz = { tras: [], frente: [], s: 60 / Math.max(36, D - dist) };
    if (luz.s < 0.16) { // de longe: um desenho só (o da face que mais aparece), sem coluna por coluna
      const f = faces.find((q) => q.tipo !== 'lado') || faces[0], [px, py] = proj(X, D, alt(X, D)), sw = f.spr.width * luz.s, sh = f.spr.height * luz.s;
      put(f.spr, px - sw / 2, py - sh, sw, sh);
      const l = [[px - sw * 0.33, py - 10 * luz.s, luz.s], [px + sw * 0.33, py - 10 * luz.s, luz.s]];
      if (f.tipo === 'tras') luz.tras.push(...l); else if (f.tipo === 'frente') luz.frente.push(...l);
      return luz;
    }
    for (const f of faces) {
      const w = f.spr.width, H = f.spr.height;
      let [ax, ay] = proj(f.A[0], f.A[1], alt(f.A[0], f.A[1])), [bx, by] = proj(f.B[0], f.B[1], alt(f.B[0], f.B[1]));
      let flip = false;
      if (bx < ax) { [ax, bx] = [bx, ax]; [ay, by] = [by, ay]; flip = true; }
      const za = Math.max(36, (flip ? f.B[1] : f.A[1]) - dist), zb = Math.max(36, (flip ? f.A[1] : f.B[1]) - dist);
      if (bx - ax >= 0.5) {
        const x0 = Math.round(ax), x1 = Math.round(bx);
        for (let x = x0; x < x1; x++) {
          const u = (x + 0.5 - ax) / (bx - ax), c = clamp(Math.floor((flip ? 1 - u : u) * w), 0, w - 1);
          const yb = Math.round(lerp(ay, by, u)), hh = Math.max(1, Math.round(H * 60 / lerp(za, zb, u)));
          G.drawImage(f.spr, c, 0, 1, H, x, yb - hh, 1, hh);
          if (LON) LG.drawImage(f.spr, c, 0, 1, H, x, yb - hh, 1, hh);
        }
      }
      const em = (u) => { const uu = flip ? 1 - u : u, s = 60 / lerp(za, zb, flip ? 1 - u : u); return [lerp(ax, bx, uu), lerp(ay, by, uu) - 10 * s, s]; };
      if (f.tipo === 'tras') luz.tras.push(em(0.17), em(0.83));
      if (f.tipo === 'frente') luz.frente.push(em(0.2), em(0.8));
    }
    return luz;
  }

  // uma casinha do morro, de frente: tamanhos, telhados e cores variados; a base (alicerce) é desenhada até o chão
  function casaMorro(seed) {
    const r = (k) => hash(seed * 13.7 + k * 7.3);
    const andares = r(1) > 0.72 ? 2 : 1, W = 64 + Math.round(r(2) * 60), parede = andares * 24 + 8, laje = r(3) > 0.68;
    const tel = laje ? 6 : 12 + Math.round(r(4) * 6), base = 5, H = tel + parede + base;
    const c = DL.mk(W + 4, H + 12), g = c.getContext('2d'), l = DL.mk(W + 4, H + 12), q = l.getContext('2d'), x0 = 2, y0 = 12;
    const cores = ['#e8d8b8', '#d9c2a0', '#c9d4c0', '#e6c8b4', '#cfd6e0', '#e8e0d0', '#d4b89a', '#b8ccc8', '#e2cfa4', '#f0e6d6', '#c8b4a0', '#a8b8a0'];
    const cor = cores[Math.floor(r(5) * cores.length)], escura = shadeH(cor, -0.18), telha = ['#8a4a36', '#9c5a40', '#7a4030', '#a0603f', '#6e4a3a'][Math.floor(r(6) * 5)];
    const yp = y0 + tel; // topo da parede
    R(g, x0, yp, W, parede, cor); R(g, x0, yp, 2, parede, escura); R(g, x0 + W - 1, yp, 1, parede, escura);
    if (andares === 2) R(g, x0, yp + 24, W, 1, escura);
    R(g, x0 - 1, yp + parede, W + 2, base, '#6a625a'); R(g, x0 - 1, yp + parede, W + 2, 1, '#857c72'); // o alicerce
    if (laje) { // laje com platibanda e caixa-d'água
      R(g, x0 - 1, yp - tel, W + 2, tel, shadeH(cor, -0.08)); R(g, x0 - 1, yp - tel, W + 2, 1, shadeH(cor, 0.12));
      const cx = x0 + 8 + Math.round(r(7) * (W - 26)); R(g, cx, yp - tel - 8, 12, 8, '#3a6ea5'); R(g, cx, yp - tel - 8, 12, 1, '#5a8ec5'); R(g, cx + 1, yp - tel - 10, 10, 2, '#2f5a88');
    } else { // telhado de duas águas visto de frente: uma faixa de telhas com o beiral
      for (let j = 0; j < tel; j++) { const rec = Math.round(((tel - j) / tel) * 5); R(g, x0 - 3 + rec, yp - tel + j, W + 6 - 2 * rec, 1, j % 3 === 2 ? shadeH(telha, -0.15) : telha); }
      R(g, x0 - 3, yp - 1, W + 6, 1, shadeH(telha, -0.3)); R(g, x0 + 4, yp - tel, W - 8, 1, shadeH(telha, 0.2));
    }
    R(g, x0, yp, W, 2, 'rgba(0,0,0,0.25)'); // a sombra do beiral
    // portas e janelas (as acesas vão para a luz)
    for (let a = 0; a < andares; a++) {
      const yb = yp + a * 24 + 6, n = Math.max(2, Math.floor(W / 30));
      for (let i = 0; i < n; i++) {
        const wx = x0 + 6 + Math.round((i * (W - 18)) / Math.max(1, n - 1)), porta = a === andares - 1 && i === Math.floor(n / 2) && andares === 1;
        if (porta) { R(g, wx, yb + 2, 9, 16, '#5a3a2a'); R(g, wx + 7, yb + 10, 1, 1, '#d9b98c'); continue; }
        R(g, wx - 1, yb - 1, 12, 11, '#e9ecef'); R(g, wx, yb, 10, 9, '#2a2f38'); R(g, wx + 5, yb, 1, 9, '#e9ecef');
        if (r(20 + a * 7 + i) > 0.42) { q.fillStyle = r(40 + i) > 0.82 ? '#cfe0ff' : '#ffc878'; q.fillRect(wx, yb, 10, 9); R(q, wx + 5, yb, 1, 9, '#e9ecef'); }
      }
    }
    if (andares === 2) { const dx = x0 + Math.round(W / 2) - 5; R(g, dx, yp + 24 + 8, 10, parede - 24 - 8, '#5a3a2a'); }
    if (r(9) > 0.55) { R(g, x0 - 2, yp + parede - 9, W + 4, 9, shadeH(cor, -0.25)); R(g, x0 - 2, yp + parede - 9, W + 4, 1, shadeH(cor, -0.05)); } // o muro da frente
    return { c, luz: l, w: W + 4, h: H + 12 };
  }
  function shadeH(hex, k) { const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)); return '#' + v.map((x) => clamp(Math.round(k > 0 ? x + (255 - x) * k : x * (1 + k)), 0, 255).toString(16).padStart(2, '0')).join(''); }

  // uma faixa do chão do morro (de Da, perto, até Db, longe): o chão, o mato e, se passar por ali, a rua
  /* o chão do morro inteiro numa passada: as faixas de D (da mais longe para a mais perto) são juntadas por cor
     em poucos caminhos (Path2D) — poucas pinturas por quadro em vez de uma por faixa. Como o morro sobe para o
     fundo, uma faixa quase nunca cobre a de trás; o que fica em cima do chão (casas, postes) vem depois. */
  function chaoMorro(proj, cAt, K, WS, dist, VW) {
    const grupos = new Map(), luzP = LON ? new Path2D() : null, pontos = [];
    const em = (cor) => { let p = grupos.get(cor); if (!p) grupos.set(cor, (p = new Path2D())); return p; };
    const nv = (a) => Math.round(clamp(a, 0, 1) * 4) / 4; // (a cor em poucos degraus: menos caminhos)
    for (let k = FAIXAS_MORRO.length - 2; k >= 0; k--) {
      const Da = FAIXAS_MORRO[k], Db = FAIXAS_MORRO[k + 1], za = Da - dist, zb = Db - dist;
      if (za < 40 || za > 2700) continue;
      const dyA = K / za, X0 = MX0, Xr = Math.min(MX1, (VW + 24 - cAt(dyA)) / (dyA * WS));
      if (Xr <= X0) continue;
      const HA = S.hgt[k], HB = S.hgt[k + 1], j1 = Math.min(HA.length - 1, Math.ceil((Xr - X0) / MDX)), pj = Math.max(1, Math.round(8 / (dyA * WS) / MDX), Math.ceil(j1 / 48));
      const [ca, ya] = proj(0, Da, 0), [cb, yb] = proj(0, Db, 0), sa = dyA * WS, sb = (K / zb) * WS, ka = 60 / za, kb = 60 / zb;
      const pts = [];
      let subida = 0, n = 0;
      for (let j = 0; ; j = Math.min(j1, j + pj)) { pts.push(cb + (X0 + j * MDX) * sb, yb - HB[j] * kb); subida += HB[j] - HA[j]; n++; if (j >= j1) break; }
      for (let j = j1; ; j = Math.max(0, j - pj)) { pts.push(ca + (X0 + j * MDX) * sa, ya - HA[j] * ka); if (j <= 0) break; }
      // a cor: mais clara onde a encosta olha para a câmera, puxada para a cor do ar ao longe
      const incl = Math.round(clamp(subida / n / Math.max(1, Db - Da) * 1.6, 0, 1) * 2) / 2, ar = nv(clamp((za - 250) / 1400, 0, 0.62) / 0.62) * 0.62;
      const base = mix(mix('#5f7c4c', '#7d9a5a', incl), '#5b6680', ar), cor = (k & 1) && za < 700 ? mix(base, '#4f6a44', 0.25 - ar * 0.3) : base;
      const alvo = [em(cor)]; if (luzP && HB[j1] > 2) alvo.push(luzP);
      for (const P2 of alvo) { P2.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) P2.lineTo(pts[i], pts[i + 1]); P2.closePath(); }
      // o mato: pontinhos fixos no chão (escolhidos na montagem), só de perto
      if (za < 340) { const c0 = mix('#3f5c3c', '#5b6680', ar), c1 = mix('#8aa868', '#5b6680', ar); for (const [X, D, h, e] of S.matoM[k]) if (X <= Xr) pontos.push(proj(X, D, h), za < 300 ? 2 : 1, e ? c0 : c1); }
      // a rua (cortada na encosta: na altura do meio dela), as calçadas, o meio-fio e a faixa amarela tracejada
      if (Db > MORRO.fim + 6) continue;
      const ma = meioEm(Da), mb = meioEm(Db), ha = altMorro(ma.X, Da), hb = altMorro(mb.X, Db), fog = (c) => mix(c, '#5b6680', ar);
      const quad = (k0, k1, col) => {
        const p = [proj(mb.X + k0 * 0.95 * mb.f, Db, hb), proj(mb.X + k1 * 0.95 * mb.f, Db, hb), proj(ma.X + k1 * 0.95 * ma.f, Da, ha), proj(ma.X + k0 * 0.95 * ma.f, Da, ha)];
        // (a rua vai em grupos separados, desenhados depois do chão; a ordem entre eles é a da lista)
        const P2 = em('r' + col); p.forEach((v, i) => (i ? P2.lineTo(v[0], v[1]) : P2.moveTo(v[0], v[1]))); P2.closePath();
      };
      quad(-1.6, 1.6, '1' + fog('#b4afa6'));
      quad(-1.06, 1.06, '2' + fog('#8e939c'));
      quad(-1, 1, '3' + fog((k & 1) ? '#4b505b' : '#474c57'));
      if ((Math.floor(Da / 9) & 1) && zb < 1100) quad(-0.05, 0.05, '4' + fog('#e0b24a'));
    }
    const chaves = [...grupos.keys()].sort((a, b) => (a[0] === 'r') - (b[0] === 'r') || (a[0] === 'r' ? a[1].localeCompare(b[1]) : 0));
    for (const c of chaves) { G.fillStyle = c[0] === 'r' ? c.slice(2) : c; G.fill(grupos.get(c)); }
    for (let i = 0; i < pontos.length; i += 3) { const [px, py] = pontos[i], sz = pontos[i + 1]; R(G, Math.round(px), Math.round(py) - sz + 1, sz, sz, pontos[i + 2]); }
    if (luzP) { LG.fillStyle = '#000'; LG.fill(luzP); }
  }

  // os carros da rua que sobe: os parados na beira, uma fila subindo e um carro que desce e para na esquina
  function carrosMorro(tt, dist, vis, proj, lights, on) {
    const L = [], camX = 0.5;
    for (const e of S.estacionados) L.push({ ...naSubida(e.s, 0.74, 1), v: e.v, parado: true });
    // a fila que sobe: mesma velocidade, 46 unidades entre um e outro (o carro tem 11)
    const s0 = sDaSubida(8.6);
    for (let i = 0; i < 3; i++) { const s = s0 + 70 + tt * 34 - i * 46; if (s > s0) L.push({ ...naSubida(s, 0.24, 1), v: S.carMorro[(i * 2 + 1) % 7], sobe: true }); }
    // o que desce e vem parar antes da faixa de pedestre
    { const s = lerp(sDaSubida(26), S.parada, smooth(F_DUR - 8.2, F_DUR + 0.1, tt)); L.push({ ...naSubida(s, 0.5, -1), v: S.carMorro[4], desce: true }); }
    for (const c of L) {
      const z = c.D - dist; if (z < 44 || z > 2400) continue;
      vis.push([z, { fn: () => {
        const lz = carroFundo(c.v, c.X, c.D, c.ang, proj, dist, camX), s = lz.s, hl = 0.35 + 0.65 * on;
        if (c.parado) return;
        for (const q of lz.tras) lights.push({ x: q[0], y: q[1], r: 4 * q[2] + 1.2, c: [255, 50, 40, 0.75 * hl] });
        for (const q of lz.frente) lights.push({ x: q[0], y: q[1], r: 7 * q[2] + 1.5, c: [255, 240, 190, 0.85 * hl] });
        if (lz.frente.length && on > 0.01) { const a = lz.frente[0], b = lz.frente[1]; lights.push({ x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2 + 14 * s, r: 40 * s + 2, c: [255, 236, 180, 0.22 * on], flat: true }); }
      } }]);
    }
  }

  /* ---------------- plano 2: para o fundo (câmera atrás do carro) ---------------- */
  function fundo(g, VW, VH, oy, t, day, on, warm) {
    const tt = t - F_T0, dist = fDist(tt), hy = oy + HZ - 2, DYC = VH - 18 - hy, K = 60 * DYC, WS = 65 / DYC, cx0 = (VW >> 1) - 30 - Math.round(34 * smooth(F_DUR - 4.4, F_DUR - 0.8, tt)); // (na chegada a câmera abre para a direita, para a rua que sobe)
    const bend = (1 - smooth(0, 3.6, tt)) - 0.38 * smooth(4.2, 6, tt) * (1 - smooth(F_DUR - 3.6, F_DUR - 1.6, tt));
    const cAt = (dy) => { const p = Math.min(1, dy / DYC); return cx0 + bend * 84 * (1 - p) * (1 - p); };
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    ceu(g, VW, hy + 2, day, warm, 2000 + dist * 0.5 + bend * 900, t);
    g.globalCompositeOperation = 'lighter';
    estrelas(g, VW, hy, day, t);
    g.globalCompositeOperation = 'source-over';
    if (day > 0.6) { // a lua, com o halo e as nuvens finas passando
      const la = (day - 0.6) / 0.4, lx = Math.round((VW >> 1) + 96 + bend * 20), ly = Math.round(hy - 84);
      g.globalAlpha = la; glow(g, lx, ly, 34, [190, 200, 255, 0.22]); disc(g, lx, ly, 7, '#e9ecf6'); disc(g, lx - 2, ly - 1, 1, '#cfd5e6'); disc(g, lx + 2, ly + 3, 1, '#d3d9e8'); R(g, lx + 2, ly - 4, 2, 1, '#cfd5e6');
      g.globalAlpha = la * 0.5;
      for (let i = 0; i < 6; i++) { const w0 = 34 + Math.round(hash(i * 3) * 50), nx = ((i * 83 + t * (2 + i % 3) + bend * 60) % (VW + 160) + VW + 160) % (VW + 160) - 80, ny = hy - 66 + Math.round(hash(i * 7) * 40); R(g, Math.round(nx), ny, w0, 2, '#2c2c58'); R(g, Math.round(nx) + 8, ny - 1, w0 - 20, 1, '#37376a'); }
      g.globalAlpha = 1;
    }

    const w = mundoIni(VW, VH, on, 0, 0);
    // a mata no horizonte
    for (let i = 0; i < 2; i++) { const m = S.mata[i], off = Math.round(-((bend * 60 * (i + 1) + dist * 0.01 * (i + 1)) % m.width)); for (let x = off - m.width; x < VW; x += m.width) w.drawImage(m, x, hy + 2 + i * 2 - m.height + 6); }
    // a cidade no horizonte e, à direita, o morro do bairro (com as janelas acesas e a luz da torre piscando)
    { const c = S.cidade, off = Math.round(-((bend * 120 + dist * 0.03) % c.c.width)); for (let x = off - c.c.width; x < VW; x += c.c.width) { put(c.c, x, hy + 3 - c.c.height); putLuz(c.luz, x, hy + 3 - c.c.height); } }
    // o chão, linha a linha (mais longe = mais perto do horizonte)
    for (let y = hy + 1; y < VH; y++) {
      const dy = y - hy, z = K / dy, d = z + dist, ws = dy * WS, c = cAt(dy), b = Math.floor(d / 46) & 1;
      const seg = (xa, xb, col) => { const a = Math.round(c + xa * ws), e = Math.round(c + xb * ws); R(w, a, y, Math.max(1, e - a), 1, col); };
      R(w, 0, y, VW, 1, b ? '#6f8a54' : '#668050');
      if (dy > 3) for (let k = 0; k < 5; k++) { const hx = hash(Math.floor(d / 23) * 7 + k * 31), X = (hx - 0.5) * 16; if (X > 1.6 || X < -3.8) R(w, Math.round(c + X * ws), y, Math.max(1, Math.round(ws * 0.12)), 1, k % 2 ? '#7f9c5c' : '#5a7446'); }
      seg(-3.75, -3.2, b ? '#b9b4ad' : '#aeaaa2'); seg(-3.2, -1.3, b ? '#474c57' : '#4b505b');
      seg(-0.98, 0.98, b ? '#474c57' : '#4b505b');
      seg(-1.33, -0.95, '#c9ccd1'); seg(-1.27, -1.01, b ? '#4f8a4a' : '#478043');
      seg(0.98, 1.05, '#d9dde3'); seg(1.05, 1.55, b ? '#b9b4ad' : '#aeaaa2');
      if (Math.floor(d / 30) & 1) { seg(-0.015, 0.015, '#e9ecef'); seg(-2.265, -2.235, '#e9ecef'); }
    }
    const lights = [], vis = [];
    /* a esquina da faculdade: a rua transversal (que sobe à direita), as calçadas e o pátio de concreto */
    const proj = (X, D, h) => { const z = Math.max(36, D - dist), dy = K / z; return [cAt(dy) + X * dy * WS, hy + dy - (h || 0) * 60 / z]; };
    const poli = (pts, col) => { for (const q of LON ? [w, LG] : [w]) { q.beginPath(); pts.forEach((p, i) => (i ? q.lineTo(p[0], p[1]) : q.moveTo(p[0], p[1]))); q.closePath(); q.fillStyle = col; q.fill(); } };
    const perto = F_SERRA - dist < 800;
    if (perto) {
      const faixa = (a, b, col, i0, dash) => {
        const L = S.subida;
        for (let i = L.length - 2; i >= (i0 || 0); i--) {
          if (dash && i % 2) continue;
          const [p, n] = L[i], [p2, n2] = L[i + 1];
          if (p[1] - dist < 40 && p2[1] - dist < 40) continue;
          const pt = (P1, N, k) => proj(P1[0] + N[0] * k * 62 / 65, P1[1] + N[1] * k * 14, P1[2]);
          poli([pt(p, n, a), pt(p2, n2, a), pt(p2, n2, b), pt(p, n, b)], col);
        }
      };
      const F = F_SERRA;
      poli([proj(1.05, F - 60), proj(6.4, F - 60), proj(6.4, F - 49), proj(1.05, F - 49)], '#a9a49a');   // a calçada do lado de cá
      faixa(-1.5, 1.5, '#b4afa6', 0);                                                                   // calçadas
      poli([proj(1.02, F - 24), proj(5.35, F - 24), proj(5.1, F + 1), proj(1.05, F + 1)], '#c6b79c');      // o pátio de concreto
      for (const x of [1.9, 2.7, 3.5, 4.3]) poli([proj(x, F - 24), proj(x + 0.03, F - 24), proj(x + 0.03, F), proj(x, F)], '#b0a186');
      poli([proj(3.95, F - 9), proj(5.2, F - 9), proj(5.1, F + 1), proj(3.95, F + 1)], '#5c8a4a');         // o canteiro
      faixa(-1, 1, '#4b505b', 0);                                                                       // asfalto
      faixa(-0.06, 0.06, '#e0b24a', 3, true);                                                           // a faixa amarela (foto 07)
      for (let k = 0; k < 6; k++) { const d0 = F - 47 + k * 4; poli([proj(1.08, d0), proj(1.4, d0), proj(1.4, d0 + 2), proj(1.08, d0 + 2)], '#e4e6ea'); } // a faixa de pedestre
    }
    // o que passa dos lados, do mais longe para o mais perto
    for (const o of S.fundo) { const z = o.D - dist; if (z > 34 && z < (o.serra || o.morro ? 2600 : 1500)) vis.push([o.serra ? z + 0.5 : z, o]); }
    // o chão do morro (antes de tudo o que fica em cima dele)
    chaoMorro(proj, cAt, K, WS, dist, VW);
    // os carros da rua que sobe (em perspectiva, apoiados no chão)
    carrosMorro(tt, dist, vis, proj, lights, on);
    S.frenteCar.forEach((spr, i) => { const z = 300 + i * 950 - (FV * 0.9 + 60) * tt + dist * 0; if (z > 34 && z < 2600) vis.push([z, { X: -2.25, spr, farol: true }]); });
    if (perto) {
      // gente andando e conversando na frente da faculdade
      S.genteF.forEach((p, i) => {
        const sh = S.folhas[p.f]; let X = p.a, fr;
        if (p.v) { const L = (p.b - p.a) * 65, q = (t * p.v + p.ph) % (2 * L), ida = q < L; X = p.a + (ida ? q : 2 * L - q) / 65; fr = walkFrame(sh, ida ? 'right' : 'left', q); }
        else fr = Math.floor(t * 0.7 + i * 1.7) % 6 === 0 ? sh[p.dir].blink : sh[p.dir].idle;
        const z = p.D - dist; if (z > 40) vis.push([z, { X, spr: fr, esc: 0.8, sombra: true }]);
      });
    }
    // carros indo na frente, na mesma mão
    S.adiante.forEach((spr, i) => { const z = 330 + i * 360 + FV * (0.96 + i * 0.05) * tt - dist; if (z > 70 && z < 1500) vis.push([z, { X: 0.36, spr, lanternas: true }]); });
    vis.sort((a, b) => b[0] - a[0]);
    const carX2 = lerp(0.44, 0.76, smooth(F_DUR - 4.2, F_DUR - 0.8, tt)), yc = hy + DYC, carPx = cAt(DYC) + carX2 * 65;
    let carDone = false;
    const heroi = () => {
      carDone = true;
      R(w, Math.round(carPx) - 15, yc - 1, 30, 2, 'rgba(0,0,0,0.35)');
      put(S.heroTras, carPx - 15, yc - 23);
      const freio = tt > F_DUR - FDEC ? 1 : 0.55, hl = Math.max(on, 0.3);
      for (const dx of [-9, 9]) lights.push({ x: carPx + dx, y: yc - 10, r: 5 + freio * 3, c: [255, 50, 40, 0.75 * hl * freio + 0.2] });
      lights.push({ x: carPx, y: yc - 40, r: 60, c: [255, 236, 180, 0.2 * hl], flat: true });
      if (tt > F_DUR - 4.4 && tt < F_DUR - 0.3 && Math.floor(t * 3.2) % 2 === 0) { R(w, Math.round(carPx) + 12, yc - 12, 2, 3, '#ffb030'); lights.push({ x: carPx + 13, y: yc - 10, r: 6, c: [255, 170, 40, 0.9] }); }
    };
    for (const [z, o] of vis) {
      if (!carDone && z < 60) heroi();
      if (o.fn) { o.fn(); continue; }
      const dy = K / z, s = 60 / z, y = hy + dy - (o.h || 0) * s, x = cAt(dy) + o.X * dy * WS, sw = o.spr.width * s * (o.esc || 1), sh = o.spr.height * s * (o.esc || 1);
      if (x + sw < -20 || x - sw > VW + 20 || (o.morro && sw < 1.5)) continue;
      // (de longe, o que é pequeno não precisa tapar as janelas acesas: metade dos desenhos)
      const lon = LON; if ((s < 0.3 && !o.luz) || (o.morro && s < 0.08)) LON = false;
      if (o.serra) lateralSerra(proj, F_SERRA, dist, VW);
      if (o.datalab) telhadoDatalab(proj, dist);
      if (o.sombra) R(w, Math.round(x - sw * 0.3), Math.round(y) - 1, Math.max(2, Math.round(sw * 0.6)), 1, 'rgba(0,0,0,0.3)');
      // (a fachada é reduzida com suavização: o letreiro continua legível)
      if (o.serra) { G.imageSmoothingEnabled = LG.imageSmoothingEnabled = true; G.imageSmoothingQuality = LG.imageSmoothingQuality = 'high'; }
      put(o.spr, x - sw / 2, y - sh, sw, sh);
      LON = lon;
      // (a Serra: de perto, a cópia sem letras por cima e o letreiro nítido; aparece aos poucos, sem salto)
      const nit = o.limpa ? smooth(0.07, 0.1, s) : 0;
      if (nit > 0) { G.globalAlpha = LG.globalAlpha = nit; put(o.limpa.base, x - sw / 2, y - sh, sw, sh); G.globalAlpha = LG.globalAlpha = 1; }
      if (o.luz && s > (o.morro ? 0.015 : 0.07)) {
        if (nit > 0 && LON) { LG.globalAlpha = 1 - nit; putLuz(o.luz, x - sw / 2, y - sh, sw, sh); LG.globalAlpha = nit; putLuz(o.limpa.luz, x - sw / 2, y - sh, sw, sh); LG.globalAlpha = 1; }
        else putLuz(o.luz, x - sw / 2, y - sh, sw, sh);
      }
      if (o.serra) G.imageSmoothingEnabled = LG.imageSmoothingEnabled = false;
      if (nit > 0) letreiroSerra(Math.round(x - sw / 2), Math.round(y - sh), sw / o.spr.width, nit);
      if (o.brilho && on > 0.01) for (const [bx, by, r, c] of o.brilho) lights.push({ x: x + bx * s, y: y - by * s, r: r * s + 2, c: [c[0], c[1], c[2], c[3] * on] });
      if (o.lamp && on > 0.01) { const lx = x + 5 * s, ly = y - 101 * s; if (s > 0.1) lights.push({ x: lx, y: ly, r: 10 * s + 2, c: [255, 214, 150, 0.9 * on] }, { x: lx, y: y + 6 * s, r: 50 * s, c: [255, 196, 120, 0.2 * on], flat: true }); else lights.push({ x: lx, y: ly, r: 2.5, c: [255, 214, 150, 0.7 * on] }); }
      if (o.torre && on > 0.01 && Math.floor(t * 1.2) % 2) lights.push({ x, y: y - sh, r: 4, c: [255, 60, 50, 0.9 * on] });
      if (o.farol && s > 0.06) for (const dx of [-9, 9]) lights.push({ x: x + dx * s, y: y - 10 * s, r: 7 * s + 2, c: [255, 240, 190, 0.5 + 0.4 * on] });
      if (o.farolE) { lights.push({ x: x - 24 * s, y: y - 10 * s, r: 8 * s + 2, c: [255, 240, 190, 0.5 + 0.4 * on] }); lights.push({ x: x - 44 * s, y: y - 2 * s, r: 34 * s, c: [255, 236, 180, 0.3 * on], flat: true }); }
      if (o.lanternas && s > 0.06) for (const dx of [-9, 9]) lights.push({ x: x + dx * s, y: y - 10 * s, r: 5 * s + 1.5, c: [255, 50, 40, 0.35 + 0.4 * on] });
      if (o.lanterna) { lights.push({ x: x - 12 * s, y: y - 9 * s, r: 4 * s + 1.5, c: [255, 50, 40, 0.8 * on] }, { x: x + 13 * s, y: y - 12 * s, r: 6 * s + 1.5, c: [255, 240, 190, 0.8 * on] }); }
      if (o.datalab && s > 0.05) { // o letreiro nítido e o brilho verde do néon (na fachada e na calçada)
        const d = o.datalab, cxs = x - sw / 2 + (d.sx + d.sw / 2) * s, cys = y - sh + 14 * s;
        letreiroDatalab(cxs, cys, s, on);
        const al = 0.35 + 0.65 * on;
        lights.push({ x: cxs, y: cys, r: 34 * s + 3, c: [61, 255, 160, 0.16 * al] }, { x, y: y - sh + 26 * s, r: 80 * s, c: [61, 230, 150, 0.08 * al] }, { x, y: y + 4 * s, r: 70 * s, c: [61, 230, 150, 0.14 * al], flat: true });
      }
      if (o.serra) { // a luz quente da recepção e da marquise, e o letreiro
        const al = 0.25 + 0.75 * on;
        lights.push({ x: x - 22 * s, y: y - 20 * s, r: 60 * s, c: [255, 190, 120, 0.3 * al] }, { x, y: y - 86 * s, r: 90 * s, c: [225, 235, 255, 0.14 * al] }, { x: x - 22 * s, y: y + 10 * s, r: 70 * s, c: [255, 190, 120, 0.22 * al], flat: true });
      }
    }
    if (!carDone) heroi();
    mundoFim(g, VW, VH, day, warm, on);
    g.globalCompositeOperation = 'lighter';
    luzes(g, lights);
    g.globalCompositeOperation = 'source-over';
  }

  function render(sc) {
    const t = S.t, cv = sc.canvas, cw = cv.width, ch = cv.height;
    const PX = Math.max(1, Math.round(ch / 235)); // tamanho de cada pixel do mundo na tela (720 px de altura → 3)
    const VW = Math.ceil(cw / PX), VH = Math.ceil(ch / PX), oyB = VH - H0 - Math.round(VH * 0.06);
    camadas(VW, VH);
    const day = smooth(6, 41, t), on = smooth(0.3, 0.65, day), warm = 1 - smooth(0.05, 0.45, day);
    // vindo do lago: o carro começa no mesmo ponto da tela em que estava lá e a câmera se ajeita devagar
    const pas = S.pas, kp = pas ? 1 - smooth(0, 2.6, t - S.t0) : 0;
    const oy = oyB + (pas ? Math.round(clamp(pas.fy * VH - (NEAR - 8 + oyB), -28, 8) * kp) : 0);
    const g = S.bufG;
    if (t < TL.fundo) lado(g, VW, VH, oy, t, day, on, warm);
    if (t > F_T0) {
      const g2 = t < TL.fundo ? S.buf2G : g;
      fundo(g2, VW, VH, oyB, t, day, on, warm);
      if (g2 !== g) { g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = smooth(F_T0, TL.fundo, t); g.drawImage(S.buf2, 0, 0); g.globalAlpha = 1; }
    }
    /* ---- entrada e saída em preto ---- */
    g.setTransform(1, 0, 0, 1, 0, 0);
    let black = pas ? 0 : 1 - smooth(S.t0, S.t0 + (S.t0 ? 0.7 : 1.2), t);
    black = Math.max(black, smooth(TL.para + 0.9, TL.fim, t));
    if (S.skipAt != null) black = Math.max(black, smooth(S.skipAt, S.skipAt + 0.6, t));
    if (black > 0) { g.fillStyle = 'rgba(0,0,0,' + black.toFixed(3) + ')'; g.fillRect(0, 0, VW, VH); }

    const ctx = sc.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(S.buf, 0, 0, VW * PX, VH * PX);
    // a última imagem do lago some por cima (a passagem sem corte)
    if (pas && t - S.t0 < 1.1) { ctx.globalAlpha = 1 - smooth(0, 1.1, t - S.t0); ctx.imageSmoothingEnabled = true; ctx.drawImage(pas.foto, 0, 0, cw, ch); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 1; }
    caption(t);
  }

  // legenda do lugar
  function caption(t) {
    const cx = carX(t);
    let c;
    if (t < TL.go) c = ['Canaã dos Carajás · fim de tarde', 'Lago da Prefeitura · Av. São João'];
    else if (cx < LAKE_END) c = ['Av. São João', 'saindo do Lago da Prefeitura'];
    else if (cx < PA_END - 120) c = ['PA-160', 'Av. Weyne Cavalcante'];
    else if (t < TL.fundo) c = ['Rotatória', 'entrando na Av. Carajás'];
    else if (t < TL.para - 2.6) c = ['Av. Carajás', 'a caminho da faculdade'];
    else c = ['Faculdade Serra Dourada', 'Canaã dos Carajás'];
    const key = c.join('|');
    if (key === S.caption) return;
    S.caption = key;
    const el = $('cutCaption');
    el.classList.remove('is-on');
    // (mais contraste só nesta cena: fundo quase opaco, linha de baixo clara; o estilo é posto aqui e tirado ao sair)
    el.style.background = 'rgba(6, 8, 12, 0.9)'; el.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.45)';
    el.innerHTML = '<b style="text-shadow:0 1px 0 #000">' + c[0] + '</b><span style="color:#d5dae2;font-size:13px;text-shadow:0 1px 0 #000">' + c[1] + '</span>';
    void el.offsetWidth;
    el.classList.add('is-on');
  }

  /* ------------------------------------------------------------------ */
  /* O mapa                                                              */
  /* ------------------------------------------------------------------ */
  // no fim: a rua da Serra Dourada (o boneco desce do carro lá); sem ela, o DataLab
  const nextMap = () => (DL.MAPS.rua ? 'rua' : 'datalab');

  function finish(game) {
    if (S.done) return;
    S.done = true;
    DL.chegada = S.skipAt == null; // (rua.js) chegou de carro: o boneco desce; pulou: já começa na calçada
    setTimeout(() => game.loadMap(nextMap()), 0);
  }
  function skip() { if (S.skipAt == null && !S.done) S.skipAt = S.t; }

  DL.registerMap({
    id: 'abertura',
    name: 'Viagem',
    tiles: ['###', '#.#', '###'],
    items: [],
    spawn: [1, 1],

    enter(game) {
      Object.assign(S, { t: 0, t0: 0, dt: 0, cam: null, done: false, skipAt: null, caption: '', pas: null });
      // (lago.js) vindo do Lago da Prefeitura o carro já está saindo: começa andando, por baixo da última imagem de lá
      if (DL.fromLake) { DL.fromLake = false; S.t = S.t0 = TL.go + 1.1; S.pas = DL.passagem || null; DL.passagem = null; }
      // ?mapa=abertura&t=30 começa no segundo 30 (para testar um trecho)
      const t0 = parseFloat(new URLSearchParams(location.search).get('t'));
      if (t0 > 0 && !S.pas) S.t = S.t0 = Math.min(t0, TL.fim - 0.5);
      else if (!S.pas) S.t = S.t0 = TL.go + 1.1; // (aberta direto, sem o lago: também começa já no carro, andando)
      build();
      game.locked = true;
      document.body.classList.add('in-cutscene');
      $('cutscene').hidden = false;
      $('cutSkip').onclick = skip;
      game.scene.drawInstead = () => { render(game.scene); return true; };
    },
    update(game, dt) {
      S.dt = dt;
      S.t += dt;
      const end = S.skipAt != null ? S.skipAt + 0.7 : TL.fim + 0.05;
      if (S.t >= end) finish(game);
    },
    key(game, ev) {
      if (ev.code === 'Escape' || ev.code === 'Enter' || ev.code === 'Space') { skip(); ev.preventDefault(); }
      return true;
    },
    leave(game) {
      game.scene.drawInstead = null;
      document.body.classList.remove('in-cutscene');
      $('cutscene').hidden = true;
      const cap = $('cutCaption'); cap.classList.remove('is-on'); cap.style.background = cap.style.boxShadow = '';
    },
  });
  DL.Abertura = { S, TL, preparar, verificar, heroi, caixaHeroi, pegadaHeroi };
})();

/* Venti Experience — Parte 2: os alunos da Faculdade Serra Dourada (bots).
     estudando    sentados nas mesas e nas bancadas: escrevem / digitam, param, voltam a escrever
     conversando  em grupinhos (em pé ou sentados nas poltronas, puffs e bancos): um fala de cada vez,
                  com o "..." em cima de quem está falando
     andando      entram e saem das salas e da faculdade: a porta abre, o aluno some lá dentro, depois
                  de um tempo sai de novo e faz o caminho de volta (param se o jogador estiver na frente)
     mochila      nas costas de quem anda ou conversa em pé; no chão, ao lado de quem está sentado

   Cada aluno é um DL.Actor (o motor já desenha, ordena e esconde atrás das paredes). O quadro de quem
   está sentado já traz o assento (a cadeira/poltrona do mapa sai da lista de desenho e é desenhada junto
   com o aluno), assim os dois nunca brigam na ordem de desenho.

   faculdade.js chama:  DL.FacAlunos.iniciar(game, cena)   no enter() de cada mapa ('faculdade', 'sala1', 'sala2')
                        DL.FacAlunos.atualizar(game, dt)    no update()
                        DL.FacAlunos.desenharFalas(g, sc)   no overlay()
                        DL.FacAlunos.perto()                quem pode abrir uma porta (para animarPortas) */
(function () {
  'use strict';
  const DL = window.DL, T = DL.T, R = DL.R, shade = DL.shade, hash = DL.hash;
  const CH = DL.CHAR, AX = CH.AX, AY = CH.AY, FW = CH.FW, FH = CH.FH;
  const IX = (x, y) => x - y, IY = (x, y, z) => (x + y) / 2 - (z || 0);
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ------------------------------------------------------------------ */
  /* Roupas e mochilas: cada aluno com a sua                             */
  /* ------------------------------------------------------------------ */
  const PELE = ['#f2c8a0', '#e0ac7e', '#c68a5c', '#a86b42', '#7d4a2b', '#f5d3b3'];
  const CABELO = ['#1d1612', '#2a1c16', '#4a2f1d', '#7a4e2a', '#b8864a', '#121014', '#5b3a29'];
  const ESTILO = ['short', 'bun', 'long', 'cap', 'curly', 'buzz', 'ponytail', 'afro', 'bob'];
  const CAMISA = ['#3a6ea5', '#c4553c', '#2fa65e', '#e8c15a', '#6f8f7c', '#8e5cc4', '#e6e7e8', '#1f7f96', '#d27a3a', '#3b4250', '#b8322b', '#f0a5b8'];
  const CALCA = ['#232a36', '#3a4a6a', '#2d3e5c', '#4b4b4b', '#6b5a45', '#1d1f24', '#5a6a7a'];
  const TENIS = ['#eceff3', '#1d1f24', '#c4553c', '#3a6ea5', '#d9c9a5'];
  const MOCHILA = ['#2d3e5c', '#c4553c', '#2f6a4a', '#1d1f24', '#8e5cc4', '#e8a33a', '#3a6ea5', '#7a4e2a'];
  // (o mesmo aluno n sempre com o MESMO objeto de visual: assim a folha de sprites dele é feita uma vez só)
  const VISUAIS = new Map();
  function visual(i) {
    if (VISUAIS.has(i)) return VISUAIS.get(i);
    const v = fazVisual(i);
    VISUAIS.set(i, v);
    return v;
  }
  function fazVisual(i) {
    const h = (k) => hash(i * 37 + k * 11 + 5), pick = (a, k) => a[Math.floor(h(k) * a.length)];
    const body = h(8) < 0.5 ? 'f' : 'm';
    return {
      skin: pick(PELE, 1), hair: pick(CABELO, 2), hairStyle: pick(ESTILO, 3), cap: pick(CAMISA, 7),
      shirt: pick(CAMISA, 4), pants: pick(CALCA, 5), shoes: pick(TENIS, 6),
      body, glasses: h(9) < 0.22, earrings: body === 'f' && h(10) < 0.3,
    };
  }
  const CONTORNO = DL.charOutline ? DL.charOutline() : '#14161c';

  // mochila no chão: c = centro, b = linha do chão
  function mochilaChao(g, c, b, cor) {
    const esc = shade(cor, -0.3), cl = shade(cor, 0.2);
    R(g, c - 2, b - 12, 4, 2, CONTORNO); R(g, c - 1, b - 11, 2, 1, esc); // alça de cima
    R(g, c - 4, b - 10, 8, 10, CONTORNO);
    R(g, c - 3, b - 9, 6, 9, cor);
    R(g, c - 3, b - 9, 6, 1, cl);
    R(g, c - 2, b - 5, 4, 3, esc); R(g, c - 2, b - 5, 4, 1, cl); // bolso da frente
    R(g, c + 2, b - 9, 1, 9, esc);
  }

  /* ------------------------------------------------------------------ */
  /* Objetos novos do mapa: mochila no chão, caderno e livro na mesa      */
  /* ------------------------------------------------------------------ */
  const ARTE = {
    mochila(g, e) { mochilaChao(g, e.px + e.tw * 8, e.py + e.th * T - 3, e.color || MOCHILA[0]); },
    // em cima de uma mesa (host): a linha e.py − 1 é o tampo
    caderno(g, e) {
      const c = e.px + 8, r = e.py - 1;
      R(g, c - 6, r - 2, 12, 2, '#f4f1e8'); R(g, c - 6, r, 12, 1, e.color || '#3a6ea5'); // folhas e a capa
      R(g, c, r - 2, 1, 2, '#9aa3b0');                                                  // espiral
      R(g, c - 5, r - 2, 4, 1, '#9fb6d8'); R(g, c + 2, r - 1, 3, 1, '#9fb6d8');          // escrito
      R(g, c + 3, r - 4, 4, 1, '#2a2e35'); R(g, c + 6, r - 4, 1, 1, '#e8c15a');          // caneta
    },
    livro(g, e) {
      const c = e.px + 8, r = e.py - 1, cor = e.color || '#b8322b';
      R(g, c - 6, r - 2, 12, 2, '#f4efe6'); R(g, c - 6, r, 12, 1, cor);
      R(g, c - 6, r - 2, 1, 2, cor); R(g, c + 5, r - 2, 1, 2, cor);
      R(g, c, r - 3, 1, 3, '#c9bda5');
      R(g, c - 4, r - 2, 3, 1, '#b5ab92'); R(g, c + 2, r - 2, 3, 1, '#b5ab92');
    },
  };
  const desenhoAntes = DL.drawItem;
  DL.drawItem = function (g, e, t) {
    const f = ARTE[e.kind];
    if (f) return f(g, e, t);
    return desenhoAntes(g, e, t);
  };

  /* ------------------------------------------------------------------ */
  /* O aluno                                                             */
  /* ------------------------------------------------------------------ */
  // altura do assento (px): onde fica o quadril de quem senta
  const ASSENTOS = { cadeira: 7, 'poltrona-vermelha': 10, 'poltrona-madeira': 8, puff: 11, 'banco-pedra': 8 }; // (banco-pedra agora é a cadeira de escritório)
  // assentos em 3/4 com direção (face, ver pecas3d em faculdade.js): outra altura de assento
  const ASSENTOS_3D = { cadeira: 8, 'poltrona-vermelha': 9, 'poltrona-madeira': 9.5, 'poltrona-cinza': 9, 'banco-pedra': 10 };
  const FACE = { L: 0, S: 90, O: 180, N: 270 };
  const radDaFace = (face) => ((typeof face === 'number' ? face : FACE[face]) * Math.PI) / 180;
  // para onde o aluno sentado olha na tela: o mesmo lado da cadeira (de frente, de costas ou de lado)
  function dirDaFace(face) {
    const r = radDaFace(face), fx = Math.cos(r), fy = Math.sin(r), sx = fx - fy, sy = (fx + fy) / 2;
    if (Math.abs(sx) > 2.5 * Math.abs(sy)) return sx < 0 ? 'left' : 'right';
    return sy > 0 ? 'down' : 'up';
  }

  const QUADROS = new Map();
  class Aluno extends DL.Actor {
    constructor(i, x, y, dir, o) {
      super(visual(i), x, y, dir);
      o = o || {};
      this.n = i;
      this.corMochila = MOCHILA[Math.floor(hash(i * 13 + 7) * MOCHILA.length)];
      this.mochila = o.mochila !== false;
      this.assento = o.assento || null; // { kind, rot, color, variant, z }
      this.pose = null;                 // pose avulsa quando parado ('talk', 'sitA', ...)
      // os quadros prontos (com mochila, sentado...) ficam guardados por aluno n + assento, e não por objeto:
      // os alunos que entram e saem são criados de novo o tempo todo, e refazer os desenhos pesava a cada quadro
      const chave = i + '|' + this.mochila + '|' + (this.assento ? [this.assento.kind, this.assento.rot, this.assento.color, this.assento.variant, this.assento.z, this.assento.face].join(',') : '');
      if (!QUADROS.has(chave)) QUADROS.set(chave, new Map());
      this.quadros = QUADROS.get(chave);
      if (this.assento) { this.z = this.assento.z; this.noShadow = true; }
    }
    guardado(chave, fazer) {
      let q = this.quadros.get(chave);
      if (!q) { q = fazer(); this.quadros.set(chave, q); }
      return q;
    }
    frame() {
      const fechado = this.blinkT > 0, dir = this.dir, S = this.sheet[dir];
      if (this.assento) {
        const pose = this.pose || 'sitR';
        return this.guardado('s' + dir + pose + (fechado ? 1 : 0), () => this.sentado(dir, pose, fechado));
      }
      if (this.moving) {
        const k = Math.floor(this.dist / 6.5) % 4;
        return this.guardado('w' + dir + k, () => this.comMochila(dir, S.walk[k], k % 2 ? -1 : 0));
      }
      const pose = this.pose && !fechado ? this.pose : null;
      return this.guardado('p' + dir + (pose || (fechado ? 'b' : 'i')), () =>
        this.comMochila(dir, pose ? DL.charFrame(this.look, dir, pose, false) : fechado ? S.blink : S.idle, 0));
    }
    // em pé: a mochila nas costas (vista de trás), as alças (de frente) ou atrás do corpo (de lado)
    comMochila(dir, base, bob) {
      if (!this.mochila) return base;
      const c = DL.mk(FW, FH), g = c.getContext('2d');
      const ty = AY - 13 + bob, cor = this.corMochila, esc = shade(cor, -0.3), cl = shade(cor, 0.2);
      const r = (x, y, w, h, col) => R(g, dir === 'left' ? FW - x - w : x, y, w, h, col); // 'left' = espelho
      const lado = dir === 'left' || dir === 'right';
      if (lado) { r(AX - 8, ty, 5, 10, CONTORNO); r(AX - 7, ty + 1, 3, 8, cor); r(AX - 7, ty + 1, 3, 1, cl); r(AX - 7, ty + 5, 3, 1, esc); }
      g.drawImage(base, 0, 0);
      if (dir === 'up') {
        r(AX - 4, ty, 8, 11, CONTORNO);
        r(AX - 3, ty + 1, 6, 9, cor); r(AX - 3, ty + 1, 6, 1, cl);
        r(AX - 2, ty + 5, 4, 4, esc); r(AX - 2, ty + 5, 4, 1, cl);
        r(AX + 2, ty + 1, 1, 9, esc);
      } else if (dir === 'down') {
        r(AX - 3, ty, 1, 6, esc); r(AX + 2, ty, 1, 6, esc);
      } else {
        r(AX - 1, ty, 1, 5, esc); // a alça no ombro
      }
      return c;
    }
    // sentado: o assento do mapa + o aluno (+ pernas, de frente) + a mochila no chão ao lado.
    // A linha AY do desenho fica na altura do assento (this.z); a linha AY + z é o chão.
    sentado(dir, pose, fechado) {
      const A = this.assento, Z = A.z, chao = AY + Z, L = this.look;
      const c = DL.mk(FW + 8, chao + 3), g = c.getContext('2d');
      // (tuck 0: o aluno já sentou na posição empurrada para a mesa, e a cadeira vem junto com ele)
      const banco = () => DL.drawItem(g, { kind: A.kind, rot: A.rot, color: A.color, variant: A.variant, face: A.face, tuck: 0, px: AX - 8, py: chao - 13, tw: 1, th: 1 }, 0);
      const corpo = () => {
        g.drawImage(DL.charFrame(L, dir, pose, fechado), 0, 0);
        if (dir !== 'down') return;
        // de frente: as coxas para a frente e as canelas até o chão
        const P = L.pants, sy = AY - 1;
        R(g, AX - 5, sy, 10, 3, CONTORNO); R(g, AX - 4, sy, 8, 2, P);
        for (const x of [AX - 4, AX + 1]) {
          R(g, x - 1, sy + 2, 5, Z - 1, CONTORNO);
          R(g, x, sy + 2, 3, Z - 3, shade(P, -0.12));
          R(g, x, chao - 2, 3, 2, L.shoes);
        }
      };
      if (this.mochila) mochilaChao(g, AX + 11, chao, this.corMochila);
      if (dir === 'up') { corpo(); banco(); } else { banco(); corpo(); } // de costas: o encosto fica na frente
      return c;
    }
  }
  DL.Aluno = Aluno;

  /* ------------------------------------------------------------------ */
  /* O que cada um faz                                                   */
  /* ------------------------------------------------------------------ */
  const FALAS = {
    estuda: [
      'Shhh… prova de lógica amanhã!', 'Tô terminando o trabalho de banco de dados.', 'Revisando a matéria, depois a gente conversa.',
      'Esse exercício de algoritmo tá difícil…', 'Me empresta uma caneta? A minha acabou.', 'Faltam 3 páginas do resumo!',
    ],
    conversa: [
      'E aí! Viu a nota da prova?', 'Bora no lanche depois da aula?', 'O professor passou trabalho em grupo de novo…',
      'Hoje tem palestra no auditório, sabia?', 'Alguém fez o exercício da semana passada?', 'Semana que vem tem semana acadêmica!',
    ],
    anda: ['Tô atrasado pra aula!', 'Oi! Vou ali na sala e já volto.', 'Esqueci o caderno na sala…', 'Bom dia! A aula já começou?'],
  };
  const sorteia = (lista) => lista[Math.floor(Math.random() * lista.length)];

  let V = null; // o estado da vida no mapa atual (refeito a cada iniciar)

  function novo(sc, i, x, y, dir, o) {
    const a = new Aluno(i, x * T, y * T, dir, o);
    a.blinkIn = 0.5 + hash(i * 9) * 3;
    sc.drawables.push(a);
    V.alunos.push(a);
    return a;
  }
  // senta no assento que já existe no mapa (tile tx, ty); o assento passa a ser desenhado com o aluno
  function sentar(sc, i, tx, ty, dir, o) {
    const k = sc.drawables.findIndex((d) => !(d instanceof DL.Actor) && ASSENTOS[d.kind] != null && d.tx === tx && d.ty === ty);
    if (k < 0) { console.warn('Aluno sem assento em', tx, ty); return null; }
    const s = sc.drawables[k];
    sc.drawables.splice(k, 1);
    const assento = { kind: s.kind, rot: s.rot, color: s.color, variant: s.variant, face: s.face, z: ASSENTOS[s.kind] };
    let x = tx + 0.5, y = ty + 0.5;
    if (s.face != null && ASSENTOS_3D[s.kind] != null) {
      // cadeira com direção: o aluno olha para o mesmo lado dela e senta onde ela está (empurrada para a mesa)
      assento.z = ASSENTOS_3D[s.kind];
      dir = dirDaFace(s.face);
      const r = radDaFace(s.face), k = (s.tuck || 0) / T;
      x += Math.cos(r) * k;
      y += Math.sin(r) * k;
    }
    return novo(sc, i, x, y, dir, Object.assign({ assento, mochila: hash(i * 3 + 1) < 0.7 }, o));
  }
  // um objeto invisível no mapa para a tecla E ("Falar com ...")
  function fala(w, dica, tipo, x, y) {
    const e = { kind: 'fala', dica, ix: x, iy: y, py: y - 8, get texto() { return '“' + sorteia(FALAS[tipo]) + '”'; } };
    w.items.push(e);
    return e;
  }

  function estudar(game, i, tx, ty, dir, ritmo, o) {
    const a = sentar(game.scene, i, tx, ty, dir, o);
    if (!a) return;
    a.acao = 'estuda';
    a.ritmo = ritmo || 0.3;
    a.pausa = Math.random() < 0.3;
    a.t = rnd(0.5, 3);
    fala(game.world, 'Falar com o aluno', 'estuda', a.x, a.y);
  }
  // membros: [[x, y, dir], ...] em pé, ou [[tx, ty, dir, true], ...] sentado no assento do tile
  function grupo(game, i0, membros) {
    const sc = game.scene, g = { membros: [], fala: 0, t: rnd(0.5, 2), pausa: false };
    membros.forEach(([x, y, dir, senta], k) => {
      const a = senta ? sentar(sc, i0 + k, x, y, dir) : novo(sc, i0 + k, x, y, dir, { mochila: hash((i0 + k) * 3) < 0.75 });
      if (!a) return;
      a.acao = 'conversa';
      g.membros.push(a);
    });
    if (!g.membros.length) return;
    V.grupos.push(g);
    const cx = g.membros.reduce((s, a) => s + a.x, 0) / g.membros.length, cy = g.membros.reduce((s, a) => s + a.y, 0) / g.membros.length;
    g.e = fala(game.world, g.membros.length > 2 ? 'Falar com a turma' : 'Falar com os alunos', 'conversa', cx, cy);
  }
  // quem anda: rota em tiles; a e b = o que tem em cada ponta: 'porta' (some lá dentro) ou 'parar'
  // olhar = para onde olha quando para na ponta b; inicio 'b' = começa na outra ponta
  function andante(game, i, r) {
    const pts = r.pts.map(([x, y]) => [x * T, y * T]);
    const a = novo(game.scene, i, pts[0][0] / T, pts[0][1] / T, 'down', {});
    a.acao = 'anda';
    a.rota = { pts, a: r.a, b: r.b, olhar: r.olhar };
    a.ida = r.inicio !== 'b';
    a.velo = 27 + hash(i * 5) * 8;
    a.travado = 0;
    const ponta = a.ida ? r.a : r.b, p0 = a.ida ? pts[0] : pts[pts.length - 1];
    a.x = p0[0]; a.y = p0[1];
    a.k = 1;
    if (ponta === 'porta') { a.estado = 'fora'; a.hidden = true; a.alpha = 0; a.t = r.espera0 != null ? r.espera0 : rnd(1, 8); }
    else { a.estado = 'para'; a.t = rnd(2, 6); }
    a.e = fala(game.world, 'Falar com o aluno', 'anda', a.x, a.y);
  }
  const caminho = (a) => (a.ida ? a.rota.pts : a.rota.pts.slice().reverse());

  function passo(a, dt, game) {
    const pl = game.player, pts = caminho(a);
    switch (a.estado) {
      case 'fora': // lá dentro da sala (ou na rua): espera um pouco e sai pela porta
        a.t -= dt;
        if (a.t > 0) return;
        a.estado = 'entra'; a.hidden = false; a.alpha = 0;
        a.x = pts[0][0]; a.y = pts[0][1]; a.k = 1;
        a.dir = DL.dirOf(pts[1][0] - a.x, pts[1][1] - a.y);
        return;
      case 'entra':
        a.moving = false;
        a.alpha = Math.min(1, a.alpha + dt * 2.5);
        if (a.alpha >= 1) a.estado = 'anda';
        return;
      case 'sai': // entra pela porta: some
        a.moving = false;
        a.alpha = Math.max(0, a.alpha - dt * 2.5);
        if (a.alpha > 0) return;
        a.hidden = true; a.estado = 'fora'; a.t = rnd(6, 16); a.ida = !a.ida;
        return;
      case 'para': // na ponta da rota (ex.: no balcão da secretaria): conversa um pouco e volta
        a.moving = false;
        a.t -= dt;
        a.pose = Math.floor(V.t * 5) % 2 && a.t > 1 ? 'talk' : null;
        if (a.t > 0) return;
        a.pose = null; a.estado = 'anda'; a.ida = !a.ida; a.k = 1;
        return;
    }
    // andando
    const alvo = pts[a.k], dx = alvo[0] - a.x, dy = alvo[1] - a.y, d = Math.hypot(dx, dy) || 1;
    const ux = dx / d, uy = dy / d, qx = pl.x - a.x, qy = pl.y - a.y, frente = qx * ux + qy * uy;
    // o jogador logo à frente: espera um pouco (depois de um tempo, passa assim mesmo)
    if (frente > 0 && frente < 16 && Math.abs(qx * uy - qy * ux) < 9 && a.travado < 1.5) { a.travado += dt; a.moving = false; return; }
    if (!(frente > 0 && frente < 16)) a.travado = 0;
    const s = Math.min(d, a.velo * dt);
    a.x += ux * s; a.y += uy * s;
    a.dist += s;
    a.moving = true;
    a.dir = DL.dirOf(dx, dy);
    if (s < d - 0.01) return;
    a.k++;
    if (a.k < pts.length) return;
    // chegou na ponta
    const ponta = a.ida ? a.rota.b : a.rota.a;
    a.moving = false;
    if (ponta === 'porta') a.estado = 'sai';
    else { a.estado = 'para'; a.t = rnd(4, 9); if (a.ida && a.rota.olhar) a.dir = a.rota.olhar; }
  }

  /* ------------------------------------------------------------------ */
  /* Onde fica cada um                                                   */
  /* ------------------------------------------------------------------ */
  const CENAS = {
    faculdade(game) {
      // estudando na mesa comprida (cadeiras das linhas 30 e 32) e nos bancos "pedra"
      estudar(game, 1, 8, 30, 'down', 0.42);
      estudar(game, 5, 13, 32, 'up', 0.22);
      estudar(game, 6, 11, 35, 'right', 0.4);
      // conversando sentados: nos bancos da mesinha e nas poltronas/puffs do saguão
      grupo(game, 10, [[15, 35, 'right', true], [17, 35, 'left', true]]);
      grupo(game, 12, [[21, 28, 'down', true], [23, 29, 'up', true]]);
      // conversando em pé, no saguão
      grupo(game, 20, [[21.5, 24.6, 'right'], [22.9, 24.6, 'left']]);
      // entrando e saindo (das salas e da faculdade)
      andante(game, 30, { pts: [[25.5, 32], [24.3, 32], [19.5, 32], [19.5, 18.5], [13.5, 18.5], [13.5, 11.5], [14.65, 11.5]], a: 'porta', b: 'porta', inicio: 'b', espera0: 2 });
      andante(game, 31, { pts: [[9.5, 16.7], [9.5, 19.5], [20.5, 19.5], [20.5, 31.6], [24.3, 31.6], [25.5, 31.6]], a: 'porta', b: 'porta', espera0: 5 });
      andante(game, 33, { pts: [[14.65, 15.5], [13.6, 15.5], [13.6, 19.4], [19.3, 19.4], [19.3, 24.6], [17.4, 24.6]], a: 'porta', b: 'parar', olhar: 'up', espera0: 9 });
    },
    sala1(game) {
      // laboratório de informática: digitando nos notebooks, de frente para o quadro
      estudar(game, 40, 1, 3, 'up', 0.16);
      estudar(game, 41, 6, 3, 'up', 0.2);
      estudar(game, 43, 5, 5, 'up', 0.24);
      andante(game, 45, { pts: [[4.5, 7.3], [4.5, 6.0], [3.6, 2.0]], a: 'porta', b: 'parar', olhar: 'up', espera0: 3 });
    },
    sala2(game) {
      // laboratório da saúde: anotando nas bancadas; dois conversando perto da vitrine
      estudar(game, 51, 6, 4, 'up', 0.45);
      grupo(game, 52, [[5.0, 2.2, 'right'], [6.3, 2.2, 'left']]);
      andante(game, 54, { pts: [[4.5, 7.3], [4.5, 5.0], [3.5, 2.6]], a: 'porta', b: 'parar', olhar: 'left', espera0: 4 });
    },
  };

  DL.FacAlunos = {
    iniciar(game, cena) {
      V = { t: 0, alunos: [], grupos: [] };
      if (CENAS[cena]) CENAS[cena](game);
    },
    atualizar(game, dt) {
      if (!V) return;
      V.t += dt;
      for (const g of V.grupos) {
        g.t -= dt;
        if (g.t <= 0) {
          let n = Math.floor(Math.random() * g.membros.length);
          if (n === g.fala && g.membros.length > 1) n = (n + 1) % g.membros.length;
          g.fala = n; g.t = rnd(2.5, 6); g.pausa = Math.random() < 0.2; // às vezes ficam todos quietos
        }
        g.membros.forEach((a, k) => {
          const boca = !g.pausa && k === g.fala && Math.floor(V.t * 5 + k) % 2 === 0;
          a.pose = a.assento ? (boca ? 'sitT' : 'sitR') : boca ? 'talk' : null;
        });
      }
      for (const a of V.alunos) {
        a.tick(dt);
        if (a.acao === 'estuda') {
          a.t -= dt;
          if (a.t <= 0) { a.pausa = !a.pausa; a.t = a.pausa ? rnd(1.2, 3.5) : rnd(2, 6); }
          a.pose = a.pausa ? 'sitR' : Math.floor((V.t + a.n * 0.37) / a.ritmo) % 2 ? 'sitA' : 'sitB';
        } else if (a.acao === 'anda') {
          passo(a, dt, game);
          a.e.ix = a.hidden || a.estado === 'sai' ? null : a.x;
          a.e.iy = a.y; a.e.py = a.y - 8;
        }
      }
    },
    // quem está à vista e pode abrir uma porta (para animarPortas)
    perto() { return V ? V.alunos.filter((a) => a.acao === 'anda' && !a.hidden) : []; },
    // o "..." em cima de quem está falando
    desenharFalas(g, sc) {
      if (!V) return;
      const quem = [];
      for (const gr of V.grupos) if (!gr.pausa && gr.membros[gr.fala]) quem.push(gr.membros[gr.fala]);
      for (const a of V.alunos) if (a.acao === 'anda' && a.estado === 'para') quem.push(a);
      if (!quem.length) return;
      DL.isoKit.isoT(g, sc);
      const branco = 'rgba(255,255,255,0.88)';
      for (const a of quem) {
        const X = Math.round(IX(a.x, a.y)), Y = Math.round(IY(a.x, a.y, a.z || 0)) - (a.assento ? 30 : 38);
        R(g, X - 5, Y - 4, 11, 6, branco); R(g, X - 1, Y + 2, 2, 1, branco);
        for (let k = 0; k < 3; k++) R(g, X - 3 + k * 3, Y - 2, 1, 1, Math.floor(V.t * 3) % 3 >= k ? '#3b4250' : '#b8bec7');
      }
    },
  };
})();

/* Venti Experience — Parte 4: os 3 funcionários do DataLab (Ana, Lucas e Bia).
   Cada um tem a sua mesa e faz, em loop e com tempos sorteados:
     senta e digita · vai até a máquina de café e volta · vai à sala técnica "checar" um rack ·
     para para conversar com outro funcionário.
   Andam pelos tiles livres (caminho achado por busca em largura no world.solid): não atravessam móveis,
   esperam quando o jogador ou outro funcionário está na frente e, se demorar, procuram outro caminho.
   De vez em quando um deles fala uma frase curta (um balão por vez, some em 3 s). E perto de um deles =
   ele vira para o jogador e dá uma dica do passo atual da missão.

   Usa a classe DL.Aluno (faculdade-alunos.js): o motor já desenha, ordena e esconde atrás das paredes.

   datalab.js chama:  DL.DCGente.iniciar(game)        no enter()
                      DL.DCGente.atualizar(game, dt)  no update()
                      DL.DCGente.desenhar(g, sc)      no overlay() (os balões)
                      e.func (o item "Falar com ...") em useLabel / use */
(function () {
  'use strict';
  const DL = window.DL, T = DL.T, R = DL.R;
  const IX = (x, y) => x - y, IY = (x, y, z) => (x + y) / 2 - (z || 0);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const sorteia = (l) => l[Math.floor(Math.random() * l.length)];

  const PESSOAS = [
    { nome: 'Ana', n: 200, mesa: 'MESA-02', ritmo: 0.17,
      look: { body: 'f', skin: '#c68a5c', hair: '#2a1c16', hairStyle: 'bun', shirt: '#4a7fb5', pants: '#2d3e5c', shoes: '#1d1f24', glasses: true, badge: '#7ee0a1', lanyard: '#2f7a5a' } },
    { nome: 'Lucas', n: 201, mesa: 'MESA-03', ritmo: 0.13,
      look: { body: 'm', skin: '#f2c8a0', hair: '#4a2f1d', hairStyle: 'short', shirt: '#3b4250', pants: '#232a36', shoes: '#eceff3', headset: true } },
    { nome: 'Bia', n: 202, mesa: 'MESA-05', ritmo: 0.2,
      look: { body: 'f', skin: '#7d4a2b', hair: '#121014', hairStyle: 'curly', shirt: '#6f8f7c', vest: '#56715f', pants: '#3a4a6a', shoes: '#c4553c', earrings: true } },
  ];
  const FRASES = [
    'Quem derrubou o DNS?', 'Ping tá 12 ms, tranquilo', 'Lembra do backup!', 'Café é o melhor firewall',
    'Já deu git pull?', 'Funciona na minha máquina…', 'O switch tá todo verde', 'Reiniciou? Então espera.',
    'Deploy na sexta? Nem pensar', 'É sempre o DNS.', 'Uptime de 99,9%!', 'Commitou a senha de novo?',
  ];
  // onde cada coisa acontece (tiles livres; o funcionário fica no tile e olha para o lado dado)
  const CAFE = [1, 2, 'up'];
  const RACKS = [[17, 2], [18, 2], [19, 2], [20, 2]];
  const PAPOS = [[[11, 3, 'right'], [12, 3, 'left']], [[2, 4, 'right'], [3, 4, 'left']], [[10, 7, 'right'], [11, 7, 'left']]];

  let G = null; // o estado no mapa atual

  /* ------------------------------------------------------------------ */
  /* Caminho: busca em largura nos tiles livres                          */
  /* ------------------------------------------------------------------ */
  function caminho(w, de, para, bloq) {
    const W = w.W, H = w.H, ini = de[1] * W + de[0], fim = para[1] * W + para[0];
    if (ini === fim) return [];
    const veio = new Int32Array(W * H).fill(-1), fila = [ini];
    veio[ini] = ini;
    const livre = (x, y) => x > 0 && y > 0 && x < W - 1 && y < H - 1 && !w.solid[y * W + x] && !(bloq && bloq.has(y * W + x));
    for (let q = 0; q < fila.length; q++) {
      const c = fila[q];
      if (c === fim) break;
      const x = c % W, y = (c / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, k = ny * W + nx;
        if (veio[k] >= 0 || (!livre(nx, ny) && k !== fim)) continue;
        veio[k] = c; fila.push(k);
      }
    }
    if (veio[fim] < 0) return null;
    const out = [];
    for (let c = fim; c !== ini; c = veio[c]) out.push([(c % W) * T + 8, ((c / W) | 0) * T + 8]);
    return out.reverse();
  }

  /* ------------------------------------------------------------------ */
  /* Criar                                                               */
  /* ------------------------------------------------------------------ */
  function cadeiraDe(w, mesa) {
    return w.items.find((e) => e.kind === 'chair' && e.tx === mesa.tx && e.ty === mesa.ty + 1);
  }
  function criar(game, p, k) {
    const w = game.world, mesa = w.byId[p.mesa], cad = cadeiraDe(w, mesa);
    const a = new DL.Aluno(p.n, 0, 0, 'up', { mochila: false, visual: p.look });
    a.nome = p.nome; a.ritmo = p.ritmo; a.mesa = mesa; a.cadeira = cad;
    a.qPe = a.quadros; a.qSent = new Map();
    a.velo = 25 + k * 2;
    a.fila = []; a.t = rnd(2, 9); a.fala = null; a.falaT = 0;
    // o item invisível para a tecla E ("Falar com a Ana")
    a.e = { kind: 'fala', func: a, ix: 0, iy: 0, py: 0, solid: false };
    w.items.push(a.e);
    sentar(a, true);
    G.gente.push(a);
    return a;
  }
  // senta na cadeira da própria mesa (a cadeira passa a ser desenhada junto com a pessoa)
  function sentar(a) {
    a.assento = { kind: 'chair', z: 8 };
    a.quadros = a.qSent; a.z = 8; a.noShadow = true;
    a.x = a.cadeira.cx; a.y = a.cadeira.cy - 1; a.dir = 'up'; a.moving = false;
    a.estado = 'senta'; a.pose = 'sitR';
  }
  function levantar(a) {
    a.assento = null; a.quadros = a.qPe; a.z = 0; a.noShadow = false; a.pose = null;
    a.x = a.cadeira.cx - 8; a.y = (a.mesa.ty + 2) * T + 8; a.dir = 'down';
    a.estado = 'pe';
  }
  const pePara = (a) => [a.mesa.tx, a.mesa.ty + 2]; // o tile logo atrás da cadeira

  /* ------------------------------------------------------------------ */
  /* A rotina                                                            */
  /* ------------------------------------------------------------------ */
  function proxima(a) {
    const r = Math.random(), livres = G.gente.filter((b) => b !== a && b.estado === 'senta' && !b.fila.length);
    // (cada um volta para a PRÓPRIA mesa; os passos são objetos novos para cada pessoa)
    const voltar = (q) => [{ f: 'ir', alvo: pePara(q) }, { f: 'sentar' }];
    if (r < 0.34) {
      a.fila = [{ f: 'levantar' }, { f: 'ir', alvo: [CAFE[0], CAFE[1]] }, { f: 'parar', t: rnd(3, 5), dir: CAFE[2], cafe: true }].concat(voltar(a));
    } else if (r < 0.66) {
      const usados = G.gente.map((b) => b.rackAlvo).filter(Boolean);
      const op = RACKS.filter((q) => !usados.some((u) => u[0] === q[0]));
      const q = sorteia(op.length ? op : RACKS);
      a.rackAlvo = q;
      a.fila = [{ f: 'levantar' }, { f: 'ir', alvo: q }, { f: 'parar', t: rnd(4, 7), dir: 'up', rack: true }, { f: 'fimRack' }].concat(voltar(a));
    } else if (r < 0.86 && livres.length && !G.papo) {
      const b = sorteia(livres), lugar = sorteia(PAPOS), tempo = rnd(7, 11);
      G.papo = { a, b, prontos: 0 };
      a.fila = [{ f: 'levantar' }, { f: 'ir', alvo: [lugar[0][0], lugar[0][1]] }, { f: 'papo', dir: lugar[0][2], t: tempo }].concat(voltar(a));
      b.fila = [{ f: 'levantar' }, { f: 'ir', alvo: [lugar[1][0], lugar[1][1]] }, { f: 'papo', dir: lugar[1][2], t: tempo }].concat(voltar(b));
      b.t = 0;
    } else {
      a.t = rnd(6, 12); // continua digitando mais um pouco
    }
  }

  // quem está perto do ponto (x, y): o jogador ou outro funcionário em pé (null = ninguém)
  function quemNaFrente(a, x, y, game, semGente) {
    const p = game.player;
    if (p && Math.hypot(p.x - x, p.y - y) < 11) return p;
    if (semGente) return null;
    return G.gente.find((b) => b !== a && b.estado !== 'senta' && Math.hypot(b.x - x, b.y - y) < 10) || null;
  }
  const tileDe = (w, o) => Math.floor(o.y / T) * w.W + Math.floor(o.x / T);
  // (o 1º ponto é sempre um vizinho do tile onde a pessoa está: andando até ele, ela não corta quinas)
  function rota(w, a, alvo, bloq) {
    return caminho(w, [Math.floor(a.x / T), Math.floor(a.y / T)], alvo, bloq);
  }

  function andar(a, passo, dt, game) {
    const w = game.world;
    if (!passo.pts) {
      passo.pts = rota(w, a, passo.alvo) || [];
      passo.k = 0; passo.esp = 0; passo.fantasma = 0;
    }
    if (passo.k >= passo.pts.length) return true;
    const [tx, ty] = passo.pts[passo.k], dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy);
    // alguém no caminho: espera; depois de 1 s procura outro caminho desviando de quem está parado.
    // Entre 2 funcionários frente a frente (sem outro caminho), depois de 3 s um deles passa de lado.
    // O jogador nunca é atravessado: aí espera até ele sair.
    const ux = d ? dx / d : 0, uy = d ? dy / d : 0;
    passo.fantasma = Math.max(0, passo.fantasma - dt);
    const quem = quemNaFrente(a, a.x + ux * 9, a.y + uy * 9, game, passo.fantasma > 0);
    if (quem) {
      a.moving = false; passo.esp += dt;
      if (passo.esp > 1 && !passo.tentou) {
        passo.tentou = true;
        const bloq = new Set([game.player].concat(G.gente.filter((b) => b !== a && b.estado !== 'senta')).filter(Boolean).map((o) => tileDe(w, o)));
        bloq.delete(tileDe(w, a));
        const fim = passo.alvo[1] * w.W + passo.alvo[0];
        if (!bloq.has(fim)) { const novo = rota(w, a, passo.alvo, bloq); if (novo) { passo.pts = novo; passo.k = 0; } }
      }
      if (passo.esp > 3 && quem !== game.player && a.n < (quem.n || 0) + 1) { passo.fantasma = 1.6; passo.esp = 0; passo.tentou = false; }
      if (passo.esp > 6) { passo.esp = 0; passo.tentou = false; }
      // o jogador parado no único caminho por muito tempo: desiste e segue a rotina dali mesmo
      passo.total = (passo.total || 0) + dt;
      if (passo.total > 14) return true;
      return false;
    }
    passo.esp = 0; passo.tentou = false;
    const s = Math.min(d, a.velo * dt);
    a.x += ux * s; a.y += uy * s; a.dist += s;
    a.moving = s > 0;
    if (d > 0.01) a.dir = DL.dirOf(dx, dy);
    if (s >= d - 0.01) { a.x = tx; a.y = ty; passo.k++; }
    return passo.k >= passo.pts.length;
  }

  function passo(a, dt, game) {
    if (a.ouve > 0) { // virado para o jogador, dando a dica
      a.ouve -= dt; a.moving = false;
      a.pose = a.estado === 'senta' ? (Math.floor(G.t * 5) % 2 ? 'sitT' : 'sitR') : Math.floor(G.t * 5) % 2 ? 'talk' : null;
      if (a.ouve <= 0 && a.estado === 'senta') a.dir = 'up'; // gira a cadeira de volta para a mesa
      return;
    }
    if (!a.fila.length) {
      if (a.estado === 'senta') {
        a.t -= dt;
        // digitando (as mãos alternam), com pausas curtas
        if (a.t <= 0) proxima(a);
        a.digita = Math.floor(G.t / 2.5 + a.n) % 4 !== 0;
        a.pose = a.digita ? (Math.floor((G.t + a.n * 0.37) / a.ritmo) % 2 ? 'sitA' : 'sitB') : 'sitR';
      }
      return;
    }
    const p = a.fila[0];
    let feito = false;
    a.digita = false;
    switch (p.f) {
      case 'levantar': levantar(a); feito = true; break;
      case 'ir': feito = andar(a, p, dt, game); break;
      case 'parar':
        a.moving = false; a.dir = p.dir; p.t -= dt;
        a.pose = p.rack && Math.floor(G.t * 1.2) % 3 === 0 ? 'talk' : null;
        feito = p.t <= 0;
        break;
      case 'fimRack': a.rackAlvo = null; feito = true; break;
      case 'papo': {
        a.moving = false; a.dir = p.dir;
        const pp = G.papo;
        if (!p.chegou) { p.chegou = true; if (pp) pp.prontos++; }
        p.espera = (p.espera || 0) + dt;
        // espera o outro chegar (até 12 s); depois conversam, um fala de cada vez
        if (pp && pp.prontos < 2 && p.espera < 12) { a.pose = null; break; }
        p.t -= dt;
        const vez = Math.floor(G.t / 1.6) % 2 === (pp && pp.a === a ? 0 : 1);
        a.pose = vez && Math.floor(G.t * 5) % 2 ? 'talk' : null;
        if (vez && !G.balao && Math.random() < dt * 0.5) dizer(a, sorteia(FRASES));
        if (p.t <= 0) { feito = true; if (pp && pp.a === a) G.papo = null; }
        break;
      }
      case 'sentar': sentar(a); a.t = rnd(8, 18); feito = true; break;
    }
    if (feito) a.fila.shift();
  }

  /* ------------------------------------------------------------------ */
  /* Balões                                                              */
  /* ------------------------------------------------------------------ */
  function dizer(a, texto, dur) {
    G.balao = { a, texto, t: dur || 3 };
    G.calado = rnd(5, 10);
  }
  function quebra(texto, limite) {
    const linhas = [''];
    for (const p of texto.split(' ')) {
      const at = linhas[linhas.length - 1];
      if ((at + ' ' + p).trim().length > limite) linhas.push(p); else linhas[linhas.length - 1] = (at + ' ' + p).trim();
    }
    return linhas;
  }
  function balao(g, X, Y, texto) {
    const linhas = quebra(texto, 26), W = Math.max(...linhas.map((l) => l.length)) * 2.5 + 8, H = linhas.length * 6 + 4;
    const L = Math.round(X - W / 2), T0 = Math.round(Y - H), r = 3;
    g.beginPath();
    g.moveTo(L + r, T0); g.lineTo(L + W - r, T0); g.quadraticCurveTo(L + W, T0, L + W, T0 + r);
    g.lineTo(L + W, T0 + H - r); g.quadraticCurveTo(L + W, T0 + H, L + W - r, T0 + H);
    g.lineTo(X + 2, T0 + H); g.lineTo(X, T0 + H + 2); g.lineTo(X - 2, T0 + H);
    g.lineTo(L + r, T0 + H); g.quadraticCurveTo(L, T0 + H, L, T0 + H - r);
    g.lineTo(L, T0 + r); g.quadraticCurveTo(L, T0, L + r, T0);
    g.closePath();
    g.fillStyle = 'rgba(255,253,246,0.96)'; g.fill();
    g.strokeStyle = '#29313b'; g.lineWidth = 0.5; g.stroke();
    g.save();
    g.fillStyle = '#29313b'; g.font = '4px monospace'; g.textAlign = 'center'; g.textBaseline = 'top';
    linhas.forEach((l, k) => g.fillText(l, X, T0 + 2 + k * 6));
    g.restore();
  }

  /* ------------------------------------------------------------------ */
  /* Dicas da missão (E perto de um funcionário)                         */
  /* ------------------------------------------------------------------ */
  function dica(m) {
    if (!m) return 'Bem-vindo ao DataLab!';
    if (m.done) return 'Servidor online! Aperta M para ver o monitoramento.';
    if (m.carry) return 'Leva até o RACK-01: o primeiro rack, com a etiqueta verde.';
    if (!m.installed.server || !m.installed.switch) return 'O servidor e o switch estão na bancada da sala técnica.';
    if (!m.cable) return 'Abre o RACK-01 (E) e liga o eth0 do servidor no switch.';
    if (!m.eth0Up) return 'No terminal: ip addr, depois sudo ip link set eth0 up.';
    return 'Agora testa a rede: ping 10.0.1.1';
  }

  DL.DCGente = {
    iniciar(game) {
      G = { t: 0, gente: [], balao: null, calado: rnd(3, 6), papo: null };
      if (!DL.Aluno) return;
      PESSOAS.forEach((p, k) => { if (game.world.byId[p.mesa]) criar(game, p, k); });
      // começa cada um num momento diferente da rotina
      G.gente.forEach((a, k) => (a.t = 3 + k * 5 + rnd(0, 3)));
    },
    atualizar(game, dt) {
      if (!G) return;
      G.t += dt;
      const sc = game.scene;
      for (const a of G.gente) {
        a.tick(dt);
        passo(a, dt, game);
        // o item da tecla E acompanha a pessoa (sentada: na frente da cadeira)
        a.e.ix = a.x; a.e.iy = a.estado === 'senta' ? a.y + 6 : a.y; a.e.py = a.y - 8;
        // a lista de desenho é refeita quando o mapa muda (pegar uma caixa): a pessoa volta para ela,
        // e a cadeira de quem está sentado sai (é desenhada junto com a pessoa)
        if (sc.drawables.indexOf(a) < 0) sc.drawables.push(a);
        const ic = sc.drawables.indexOf(a.cadeira);
        if (a.estado === 'senta' && ic >= 0) sc.drawables.splice(ic, 1);
        else if (a.estado !== 'senta' && ic < 0) sc.drawables.push(a.cadeira);
      }
      // de vez em quando alguém solta uma frase (um balão por vez)
      if (G.balao) { G.balao.t -= dt; if (G.balao.t <= 0) G.balao = null; }
      else if ((G.calado -= dt) <= 0) dizer(sorteia(G.gente), sorteia(FRASES));
    },
    // quem está em pé (para a porta da sala técnica abrir)
    emPe() { return G ? G.gente.filter((a) => a.estado !== 'senta') : []; },
    // quem está digitando agora (para o som do teclado)
    digitando() { return G ? G.gente.filter((a) => a.digita) : []; },
    conversar(game, a, missao) {
      const p = game.player, texto = dica(missao);
      // vira para o jogador (sentado, gira a cadeira)
      a.dir = DL.dirOf(p.x - a.x, p.y - a.y);
      a.ouve = 4;
      dizer(a, texto, 4.5);
      if (DL.sfx && DL.sfx.blip) DL.sfx.blip();
      game.toast(a.nome + ': “' + texto + '”');
    },
    desenhar(g, sc) {
      if (!G || !G.balao) return;
      const a = G.balao.a;
      DL.isoKit.isoT(g, sc);
      balao(g, Math.round(IX(a.x, a.y)), Math.round(IY(a.x, a.y, a.z || 0)) - (a.estado === 'senta' ? 32 : 40), G.balao.texto);
    },
  };
})();

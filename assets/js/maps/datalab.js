/* Venti Experience — Parte 4: o DataLab (versão simples).
   Uma sala pequena com uma bancada (servidor e switch em cima), um rack vazio e o ar-condicionado.
   Missão: pegar o servidor e o switch na bancada, colocar no rack, ligar o cabo e deixar o servidor online.

   Passos:  1. servidor no rack   2. switch no rack   3. cabo eth0 → switch   4. servidor online
   O passo 4 é no terminal do servidor (ui/terminal.js): ip addr → sudo ip link set eth0 up → ping 10.0.1.1
   Estado do servidor (como no DataLab, ops.js): off (sem rede) → link (cabo ok) → online */
(function () {
  'use strict';
  const DL = window.DL, T = DL.T;
  const $ = (id) => document.getElementById(id);

  const SLOT_SWITCH = 0, SLOT_SERVER = 4; // posições no rack do aluno (9, 0 = topo): switch no topo, servidor no meio
  const S = DL.DCSala, RACK = S.ALUNO; // switch no topo do rack (top-of-rack), servidor no meio
  // estado da missão (zerado em enter; o mesmo objeto, porque os painéis guardam a referência)
  const st = {};
  let panel, term, monitor;
  function reset() {
    Object.assign(st, { carry: null, installed: { server: false, switch: false }, cable: null, eth0Up: false, sawAddr: false, server: 'off', done: false });
  }

  const STEPS = [
    ['server', 'Colocar o servidor no rack', () => st.installed.server],
    ['switch', 'Colocar o switch no rack', () => st.installed.switch],
    ['cable', 'Ligar o cabo: servidor (eth0) → switch', () => !!st.cable],
    ['online', 'Deixar o servidor online (terminal: 3 comandos)', () => st.server === 'online'],
  ];
  const NAME = { server: 'servidor', switch: 'switch' };

  /* ---------- o que aparece no rack, no mundo ---------- */
  function syncRack(game) {
    const rack = game.world.byId[RACK];
    rack.units = new Array(9).fill(null);
    rack.unitState = new Array(9).fill(null);
    if (st.installed.switch) rack.units[SLOT_SWITCH] = 'switch';
    if (st.installed.server) {
      rack.units[SLOT_SERVER] = 'server';
      // LEDs do servidor (sprites.js): laranja = sem rede, verde + piscando = cabo ok, normal = online
      rack.unitState[SLOT_SERVER] = st.server === 'online' ? null : st.server === 'off' ? 'new' : 'link';
    }
    rack.cableLook = st.cable ? 'tidy' : null;
    rack.glow = st.server === 'online' ? 'rgba(126,224,161,0.10)' : null;
    // (o motor guarda o desenho do rack pelos campos simples do item; sem isto ele não vê a peça nova)
    rack.pecas = rack.units.join(',') + '|' + rack.unitState.join(',');
  }

  /* ---------- texto da missão na tela ---------- */
  function renderMission() {
    $('missionSteps').innerHTML = STEPS.map(([, text, ok]) => '<li class="' + (ok() ? 'is-ok' : '') + '">' + text + '</li>').join('');
    $('carry').textContent = st.carry ? 'Carregando: ' + NAME[st.carry] + ' → leve até o rack' : '';
    $('carry').classList.toggle('is-on', !!st.carry);
  }
  function changed(game) {
    if (!st.cable && st.server !== 'off') st.server = 'off'; // tirou o cabo: o servidor fica sem rede
    else if (st.cable && st.server === 'off') st.server = 'link'; // cabo de volta: falta configurar (de novo) no terminal
    syncRack(game);
    renderMission();
    if (panel && panel.isOpen) panel.render();
  }
  // o que o monitor mostra como problema agora (some sozinho quando a causa é resolvida)
  function problems() {
    const out = [];
    if (st.installed.server && !st.installed.switch) out.push({ sev: 'warning', host: 'SRV-01', text: 'Sem switch no rack: o servidor não tem onde ligar' });
    if (st.installed.server && st.installed.switch && !st.cable) out.push({ sev: 'high', host: 'SRV-01', text: 'Sem cabo até o switch (sem rede)' });
    else if (st.cable && !st.eth0Up) out.push({ sev: 'high', host: 'SRV-01', text: 'Placa de rede (eth0) desligada' });
    else if (st.cable && st.server !== 'online') out.push({ sev: 'warning', host: 'SRV-01', text: 'Rede não testada: falta o ping 10.0.1.1' });
    return out;
  }

  function complete(game) {
    if (st.done) return;
    st.done = true;
    $('missionDone').classList.add('is-on');
    $('mission').classList.add('is-done');
    game.toast('Servidor SRV-01 online! Aperte M para ver no monitor.', 'ok');
  }

  DL.registerMap({
    id: 'datalab',
    name: 'DataLab',
    // a sala inteira (piso, racks, NOC) vem de datalab-sala.js
    tiles: S.tiles,
    items: S.itens().concat([
      { id: 'BOX-SERVER', kind: 'unit-server', tx: 16, ty: 7, host: 'BANCADA', solid: false, take: 'server' },
      { id: 'BOX-SWITCH', kind: 'unit-switch', tx: 17, ty: 7, host: 'BANCADA', solid: false, take: 'switch' },
    ]),
    spawn: [1, 5],
    spawnDir: 'right',
    camera: { tilesWide: 15, minTilesHigh: 10 },

    enter(game) {
      reset();
      S.preparar(game); // paredes claras, as 3 áreas e a porta verde (datalab-sala.js)
      // os 3 funcionários (datalab-gente.js); quem está em pé também abre a porta da sala técnica
      if (DL.DCGente) { DL.DCGente.iniciar(game); S.gente = () => DL.DCGente.emPe(); }
      if (DL.DCSom) DL.DCSom.enter(); // zumbido dos servidores e teclado (datalab-som.js), botão Som do lago
      // os painéis são criados uma vez só (voltar ao mapa não duplica os cliques)
      if (!panel) {
        panel = DL.createRackPanel(st, {
          changed: () => changed(game),
          lock: (on) => (game.locked = on),
          openTerminal: () => term.open(),
        });
        term = DL.createTerminal(st, {
          changed: () => changed(game),
          lock: (on) => (game.locked = on),
          online: () => { st.server = 'online'; changed(game); complete(game); },
        });
        // monitor (tecla M): mostra o que está instalado e se responde na rede
        monitor = DL.createMonitor({
          lock: (on) => (game.locked = on),
          hosts: () => [].concat(
            st.installed.switch ? [{ key: 'sw-01', name: 'SW-01', kind: 'switch', up: true }] : [],
            st.installed.server ? [{ key: 'srv-01', name: 'SRV-01', kind: 'server', up: st.server === 'online' }] : []),
          problems,
        });
      }
      $('missionDone').classList.remove('is-on');
      $('mission').classList.remove('is-done');
      syncRack(game);
      renderMission();
    },

    leave() {
      if (DL.DCSom) DL.DCSom.leave();
    },

    update(game, dt) {
      monitor.update(dt);
      if (DL.DCGente) DL.DCGente.atualizar(game, dt);
      if (DL.DCSom) DL.DCSom.update(game, dt);
      S.atualizar(game, dt);
    },

    useLabel(game, e) {
      if (e.func) return 'Falar com ' + (e.func.nome === 'Lucas' ? 'o ' : 'a ') + e.func.nome;
      if (e.take) return 'Pegar o ' + NAME[e.take];
      if (e.id === 'MESA-NOC') return 'Abrir o monitoramento (NOC)';
      if (e.id === RACK) {
        if (st.carry) return 'Instalar o ' + NAME[st.carry] + ' no rack';
        return 'Abrir o rack';
      }
      return null;
    },

    use(game, e) {
      if (e.func) return DL.DCGente.conversar(game, e.func, st);
      if (e.take) {
        if (st.carry) return game.toast('Você já está carregando o ' + NAME[st.carry] + '. Leve até o rack primeiro.', 'bad');
        st.carry = e.take;
        game.world.remove(e);
        game.scene.refreshWorld();
        renderMission();
        return;
      }
      if (e.id === 'MESA-NOC') return monitor.open();
      if (e.id === RACK) {
        if (st.carry) {
          st.installed[st.carry] = true;
          game.toast((st.carry === 'server' ? 'Servidor' : 'Switch') + ' instalado no rack.', 'ok');
          st.carry = null;
          changed(game);
          if (st.installed.server && st.installed.switch && !st.cable) setTimeout(() => game.toast('Agora abra o rack (E) para ligar o cabo.'), 1400);
          return;
        }
        panel.open();
      }
    },

    key(game, ev) {
      if (!panel) return false;
      if (term.key(ev) || panel.key(ev) || monitor.key(ev)) return true;
      if (ev.code === 'KeyM' && !ev.repeat) { monitor.open(); return true; }
      return false;
    },

    // o equipamento que o jogador carrega aparece em cima da cabeça
    overlay(g, sc) {
      S.overlay(g, sc);
      if (DL.DCGente) { g.save(); DL.DCGente.desenhar(g, sc); g.restore(); }
      if (!st.carry || !sc.player) return;
      const p = sc.player;
      sc.actorSpace(g, p);
      const bob = p.moving ? Math.round(Math.sin(p.dist / 3)) * 0.5 : 0;
      DL.drawItem(g, { kind: st.carry === 'server' ? 'unit-server' : 'unit-switch', px: Math.round(p.x) - 8, py: Math.round(p.y) - 42 + bob }, sc.t);
    },
  });
})();

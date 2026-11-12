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

  const SLOT_SWITCH = 0, SLOT_SERVER = 4; // switch no topo do rack (top-of-rack), servidor no meio
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
    const rack = game.world.byId['RACK-01'];
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
    // '#' parede · '.' piso · ',' piso perfurado na frente do rack (corredor frio)
    tiles: [
      '############',
      '#..........#',
      '#....,,,...#',
      '#..........#',
      '#..........#',
      '#..........#',
      '#..........#',
      '#..........#',
      '############',
    ],
    items: [
      { id: 'BANCADA', kind: 'table', variant: 'bench', tx: 1, ty: 1, tw: 2 },
      { id: 'BOX-SERVER', kind: 'unit-server', tx: 1, ty: 1, host: 'BANCADA', solid: false, take: 'server' },
      { id: 'BOX-SWITCH', kind: 'unit-switch', tx: 2, ty: 1, host: 'BANCADA', solid: false, take: 'switch' },
      { id: 'RACK-01', kind: 'rack', tx: 6, ty: 1, tag: '#a0c3ec', units: new Array(9).fill(null) },
      { id: 'CRAC-01', kind: 'crac', tx: 9, ty: 1 },
      { kind: 'plant', tx: 10, ty: 1 },
      { kind: 'plant', tx: 1, ty: 7 },
    ],
    spawn: [6, 6],
    spawnDir: 'up',
    camera: { tilesWide: 13, minTilesHigh: 9 },

    enter(game) {
      reset();
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

    update(game, dt) {
      monitor.update(dt);
    },

    useLabel(game, e) {
      if (e.take) return 'Pegar o ' + NAME[e.take];
      if (e.id === 'RACK-01') {
        if (st.carry) return 'Instalar o ' + NAME[st.carry] + ' no rack';
        return 'Abrir o rack';
      }
      return null;
    },

    use(game, e) {
      if (e.take) {
        if (st.carry) return game.toast('Você já está carregando o ' + NAME[st.carry] + '. Leve até o rack primeiro.', 'bad');
        st.carry = e.take;
        game.world.remove(e);
        game.scene.refreshWorld();
        renderMission();
        return;
      }
      if (e.id === 'RACK-01') {
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
      if (!st.carry || !sc.player) return;
      const p = sc.player;
      sc.actorSpace(g, p);
      const bob = p.moving ? Math.round(Math.sin(p.dist / 3)) * 0.5 : 0;
      DL.drawItem(g, { kind: st.carry === 'server' ? 'unit-server' : 'unit-switch', px: Math.round(p.x) - 8, py: Math.round(p.y) - 42 + bob }, sc.t);
    },
  });
})();

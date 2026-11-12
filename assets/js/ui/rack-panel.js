/* Venti Experience — painel do rack: a frente do rack em SVG, com o switch e o servidor.
   Clique numa porta e depois em outra para ligar o cabo; clique numa porta já ligada para tirar o cabo.
   Versão SIMPLES do cabling.js do DataLab: um rack, um servidor (eth0) e um switch de 8 portas + uplink.
   As regras e as mensagens de erro vêm do ops.js do DataLab (trace): o cabo do servidor tem que
   chegar numa porta de acesso do switch; a te1 (uplink) é reservada para o core. */
(function () {
  'use strict';
  const DL = window.DL;
  const NS_W = 560, NS_H = 270;
  const SW_PORTS = ['gi0/1', 'gi0/2', 'gi0/3', 'gi0/4', 'gi0/5', 'gi0/6', 'gi0/7', 'gi0/8', 'te1'];
  // cores dos cabos (cabling.js): azul = funcionando, vermelho = errado, branco = arrastando
  const COL = { ok: '#6aa7e8', bad: '#f2495c', drag: '#ffffff' };

  // st = estado da missão (installed.server / installed.switch, cable, server); cb = avisos para a missão
  DL.createRackPanel = function (st, cb) {
    const $ = (id) => document.getElementById(id);
    const el = { root: $('rackPanel'), svg: $('rackSvg'), msg: $('rackMsg'), power: $('rackPower'), close: $('rackClose') };
    const P = { open: false, from: null, mouse: null, msg: null };

    /* ---------- posições ---------- */
    const SW_Y = 46, SRV_Y = 160, UH = 64;
    function portPos(port) {
      if (port === 'eth0') return { x: 470, y: SRV_Y + 40 };
      const i = SW_PORTS.indexOf(port);
      if (port === 'te1') return { x: 486, y: SW_Y + 40 };
      return { x: 216 + i * 30, y: SW_Y + 40 };
    }
    // cabo pendurado com uma "barriga" (cabling.js: route, modo bagunçado)
    function route(p, q) {
      const sag = 40 + Math.abs(p.x - q.x) * 0.08;
      return 'M' + p.x + ',' + p.y + ' C' + (p.x + 8) + ',' + (Math.max(p.y, q.y) + sag) + ' ' + (q.x - 8) + ',' + (Math.max(p.y, q.y) + sag) + ' ' + q.x + ',' + q.y;
    }

    /* ---------- desenho ---------- */
    function portSvg(port, label, plugged) {
      const p = portPos(port), sel = P.from === port;
      let s = '<g class="rp-port' + (plugged ? ' is-used' : '') + (sel ? ' is-sel' : '') + (port === 'te1' ? ' is-up' : '') + '" data-port="' + port + '">';
      s += '<rect x="' + (p.x - 9) + '" y="' + (p.y - 7) + '" width="18" height="14" rx="2"/>';
      if (plugged) s += '<rect x="' + (p.x - 4) + '" y="' + (p.y - 4) + '" width="8" height="8" rx="1" class="rp-plug"/>';
      if (port !== 'eth0') s += '<circle cx="' + p.x + '" cy="' + (p.y - 12) + '" r="2" class="rp-led' + (plugged ? ' is-on' : '') + '"/>';
      s += '<text x="' + p.x + '" y="' + (p.y + 22) + '" class="rp-label">' + label + '</text>';
      return s + '<title>' + port + (plugged ? ' · ligado (clique para tirar o cabo)' : ' · livre') + '</title></g>';
    }
    function emptySlot(y, text) {
      return '<rect x="40" y="' + y + '" width="480" height="' + UH + '" rx="4" fill="url(#rpMesh)" stroke="#1a1e24"/>' +
        '<text x="280" y="' + (y + UH / 2 + 4) + '" class="rp-empty">' + text + '</text>';
    }
    const STATUS = { off: ['#c98a3c', 'sem rede'], link: ['#e8c15a', 'cabo ok · configurar no terminal'], online: ['#73bf69', 'online'] };

    function render() {
      const cable = st.cable;
      let h = '<defs><pattern id="rpMesh" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#121418"/><circle cx="3" cy="3" r="1" fill="#1c2027"/></pattern></defs>';
      h += '<rect x="20" y="20" width="520" height="' + (NS_H - 30) + '" rx="8" fill="#0d0f12" stroke="#2a2f37"/>';
      h += '<text x="32" y="38" class="rp-small">RACK-01 · frente</text>';
      // slot do switch (topo do rack)
      if (st.installed.switch) {
        h += '<g class="rp-unit"><rect x="40" y="' + SW_Y + '" width="480" height="' + UH + '" rx="4" class="rp-unit__body"/>';
        h += '<text x="52" y="' + (SW_Y + 22) + '" class="rp-name">SW-01</text><text x="52" y="' + (SW_Y + 38) + '" class="rp-small">switch · 8 portas</text>';
        SW_PORTS.forEach((p, i) => (h += portSvg(p, p === 'te1' ? 'uplink' : String(i + 1), cable && cable.port === p)));
        h += '</g>';
      } else h += emptySlot(SW_Y, 'vazio · traga o switch da bancada');
      // espaço vazio entre os dois (unidades livres do rack)
      h += '<rect x="40" y="' + (SW_Y + UH + 6) + '" width="480" height="' + (SRV_Y - SW_Y - UH - 12) + '" rx="4" fill="url(#rpMesh)" stroke="#1a1e24"/>';
      // slot do servidor
      if (st.installed.server) {
        const [c, txt] = STATUS[st.server];
        h += '<g class="rp-unit"><rect x="40" y="' + SRV_Y + '" width="480" height="' + UH + '" rx="4" class="rp-unit__body"/>';
        h += '<text x="52" y="' + (SRV_Y + 22) + '" class="rp-name">SRV-01</text><text x="52" y="' + (SRV_Y + 38) + '" class="rp-small">servidor · 10.0.1.11</text>';
        h += '<circle cx="216" cy="' + (SRV_Y + 18) + '" r="4" fill="' + c + '"/><text x="226" y="' + (SRV_Y + 22) + '" class="rp-small">' + txt + '</text>';
        for (let b = 0; b < 4; b++) h += '<rect x="' + (216 + b * 34) + '" y="' + (SRV_Y + 34) + '" width="28" height="14" rx="1" fill="#14171c" stroke="#232831"/>';
        h += portSvg('eth0', 'eth0', !!cable);
        h += '</g>';
      } else h += emptySlot(SRV_Y, 'vazio · traga o servidor da bancada');
      // o cabo ligado
      if (cable) h += '<path d="' + route(portPos('eth0'), portPos(cable.port)) + '" class="rp-cable" stroke="' + COL.ok + '"><title>SRV-01 eth0 ↔ SW-01 ' + cable.port + '</title></path>';
      // o cabo seguindo o mouse
      if (P.from && P.mouse) h += '<path d="' + route(portPos(P.from), P.mouse) + '" class="rp-cable is-drag" stroke="' + COL.drag + '"/>';
      el.svg.setAttribute('viewBox', '0 0 ' + NS_W + ' ' + NS_H);
      el.svg.innerHTML = h;
      el.msg.innerHTML = P.msg ? '<span class="' + (P.msg.ok ? 'ok' : 'bad') + '">' + P.msg.text + '</span>' :
        P.from ? 'Agora clique na outra ponta · <kbd>Esc</kbd> cancela' : 'Clique numa porta e depois em outra para ligar o cabo.';
      // o terminal do servidor abre quando o cabo está ligado (como no DataLab: sem cabo, nada de configurar)
      el.power.disabled = !st.cable;
      el.power.textContent = st.server === 'online' ? 'Terminal do SRV-01 · online ✓' : 'Abrir terminal do SRV-01';
      el.power.title = st.cable ? '' : 'Ligue o cabo primeiro';
    }

    /* ---------- regras do cabo (ops.js do DataLab: trace) ---------- */
    function connect(a, b) {
      const srv = a === 'eth0' ? a : b === 'eth0' ? b : null, other = srv === a ? b : a;
      if (!srv) return say(false, '✗ Porta do switch ligada no próprio switch não leva a lugar nenhum: o cabo precisa sair da eth0 do servidor.');
      if (other === 'te1') return say(false, '✗ Porta de uplink (te1) é reservada para o core: use uma porta gi0/1–8.');
      st.cable = { port: other };
      say(true, '✓ SRV-01 eth0 ↔ SW-01 ' + other + ' · caminho completo até o switch');
      cb.changed();
    }
    function say(ok, text) { P.msg = { ok, text }; }

    function svgPoint(ev) {
      const pt = el.svg.createSVGPoint();
      pt.x = ev.clientX;
      pt.y = ev.clientY;
      const m = el.svg.getScreenCTM();
      return m ? pt.matrixTransform(m.inverse()) : { x: 0, y: 0 };
    }
    el.svg.addEventListener('click', (ev) => {
      const pe = ev.target.closest && ev.target.closest('[data-port]');
      if (!st.installed.server || !st.installed.switch) {
        if (pe) say(false, 'Instale o servidor e o switch antes de ligar o cabo.');
        render();
        return;
      }
      if (!pe) { P.from = null; render(); return; }
      const port = pe.dataset.port;
      const plugged = !!st.cable && (port === 'eth0' || st.cable.port === port);
      if (P.from === port) P.from = null; // clicou de novo na mesma porta: cancela
      else if (P.from) {
        const a = P.from;
        P.from = null;
        if (plugged) say(false, '✗ Essa porta já tem cabo. Clique nela primeiro para tirar o cabo.');
        else connect(a, port);
      } else if (plugged) {
        st.cable = null;
        say(false, 'Cabo removido.');
        cb.changed();
      } else { P.from = port; P.mouse = svgPoint(ev); P.msg = null; }
      render();
    });
    el.svg.addEventListener('pointermove', (ev) => {
      if (!P.from) return;
      P.mouse = svgPoint(ev);
      const tmp = el.svg.querySelector('.is-drag');
      if (tmp) tmp.setAttribute('d', route(portPos(P.from), P.mouse));
    });
    el.power.addEventListener('click', () => { if (st.cable) { close(); cb.openTerminal(); } });
    el.close.addEventListener('click', () => close());
    el.root.addEventListener('pointerdown', (ev) => { if (ev.target === el.root) close(); });

    function open() { P.open = true; P.from = null; P.msg = null; el.root.classList.add('is-open'); cb.lock(true); render(); }
    function close() { if (!P.open) return; P.open = false; el.root.classList.remove('is-open'); cb.lock(false); }
    function key(ev) {
      if (!P.open) return false;
      if (ev.code === 'Escape' || ev.code === 'KeyE') {
        if (P.from) { P.from = null; render(); } else close();
      }
      return true; // com o painel aberto, o teclado é dele
    }
    return { open, close, key, render, get isOpen() { return P.open; } };
  };
})();

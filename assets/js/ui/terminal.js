/* Venti Experience — terminal do servidor SRV-01 (Linux simulado).
   Versão SIMPLES do terminal.js do DataLab: só os comandos da configuração inicial e alguns extras.
   Como no DataLab, a aula avança pelo EFEITO (a eth0 ligou, o ping respondeu), não por digitar um
   texto exato. As respostas dos comandos (ip addr, ip link, ping) copiam o formato do DataLab.

   A aula (3 comandos):
     1. ip addr                    ver a placa de rede (eth0) e o IP
     2. sudo ip link set eth0 up   ligar a placa de rede
     3. ping 10.0.1.1              testar a rede até o gateway → servidor online */
(function () {
  'use strict';
  const DL = window.DL;
  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  const HOST = 'srv-01', IP = '10.0.1.11', GW = '10.0.1.1';
  const MAC = '52:54:00:01:11:0b';

  // st = estado da missão (cable, eth0Up, sawAddr, server); cb.changed(), cb.online(), cb.lock(on)
  DL.createTerminal = function (st, cb) {
    const $ = (id) => document.getElementById(id);
    const el = { root: $('terminal'), out: $('termOut'), input: $('termIn'), prompt: $('termPrompt'), steps: $('termSteps'), close: $('termClose') };
    const TM = { open: false, busy: false, history: [], hi: 0, started: false };

    const STEPS = [
      { cmd: 'ip addr', what: 'Ver a placa de rede (eth0) e o IP do servidor', done: () => st.sawAddr },
      { cmd: 'sudo ip link set eth0 up', what: 'Ligar a placa de rede (precisa de sudo: é como administrador)', done: () => st.eth0Up },
      { cmd: 'ping ' + GW, what: 'Testar a rede até o gateway', done: () => st.server === 'online' },
    ];
    function renderSteps() {
      const next = STEPS.findIndex((s) => !s.done());
      el.steps.innerHTML = STEPS.map((s, i) => '<li class="' + (s.done() ? 'is-ok' : i === next ? 'is-next' : '') + '"><code>' + esc(s.cmd) + '</code><span>' + esc(s.what) + '</span></li>').join('');
    }

    /* ---------- saída ---------- */
    // o usuário é sempre admin; sudo só vale para aquele comando
    const PROMPT = 'admin@' + HOST + ':~$';
    function print(lines) {
      for (const l of [].concat(lines)) {
        const div = document.createElement('div');
        div.innerHTML = l === '' ? '&nbsp;' : l;
        el.out.appendChild(div);
      }
      el.out.scrollTop = el.out.scrollHeight;
    }
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    /* ---------- comandos ---------- */
    // estado da eth0 como o Linux mostra: UP só com a placa ligada E o cabo no switch
    const ethState = () => (st.eth0Up && st.cable ? 'UP' : 'DOWN');
    const linkWord = (s) => '<span class="' + (s === 'DOWN' ? 'w' : 'ok') + '">' + s + '</span>';

    function ipAddr() {
      const up = st.eth0Up, carrier = !!st.cable;
      const flags = (up && !carrier ? ['NO-CARRIER'] : []).concat(['BROADCAST', 'MULTICAST']).concat(up ? ['UP'] : []).concat(up && carrier ? ['LOWER_UP'] : []);
      print([
        '1: lo: &lt;LOOPBACK,UP,LOWER_UP&gt; mtu 65536 state ' + linkWord('UNKNOWN'),
        '    link/loopback 00:00:00:00:00:00',
        '    inet 127.0.0.1/8 scope host lo',
        '2: eth0: &lt;' + flags.join(',') + '&gt; mtu 1500 state ' + linkWord(ethState()),
        '    link/ether ' + MAC,
        '    inet ' + IP + '/24 scope global eth0',
      ]);
      if (!st.eth0Up) print('<span class="m">(a eth0 está DOWN: a placa de rede está desligada. Ligue com sudo ip link set eth0 up)</span>');
      st.sawAddr = true;
    }

    async function ping(args) {
      const host = args.filter((x) => !/^-/.test(x) && (/\./.test(x) || /[a-z]/i.test(x))).pop();
      const ci = args.indexOf('-c'), n = ci >= 0 ? Math.max(1, Math.min(6, parseInt(args[ci + 1], 10) || 4)) : 4;
      if (!host) return print('ping: uso: ping ' + GW);
      const local = host === '127.0.0.1' || host === 'localhost' || host === IP;
      if (!local && host !== GW) return print(['ping: ' + esc(host) + ': esse endereço não existe nesta rede', '<span class="m">(o gateway da rede é ' + GW + ')</span>']);
      if (!local && !st.eth0Up) return print(['ping: connect: Network is unreachable', '<span class="m">(a eth0 está desligada: use sudo ip link set eth0 up)</span>']);
      print('PING ' + esc(host) + ' 56(84) bytes of data.');
      const ok = local || !!st.cable;
      for (let i = 1; i <= n; i++) {
        await wait(320);
        print(ok ? '64 bytes from ' + esc(host) + ': icmp_seq=' + i + ' ttl=64 time=' + (local ? 0.04 : 0.3 + Math.random() * 0.6).toFixed(2) + ' ms' : '<span class="w">From ' + IP + ' icmp_seq=' + i + ' Destination Host Unreachable</span>');
      }
      print(['', '--- ' + esc(host) + ' ping statistics ---', '<span class="' + (ok ? 'ok' : 'w') + '">' + n + ' packets transmitted, ' + (ok ? n : 0) + ' received, ' + (ok ? 0 : 100) + '% packet loss</span>']);
      if (!ok) print('<span class="m">(sem cabo até o switch: confira o cabo no painel do rack)</span>');
      if (ok && host === GW && st.server !== 'online') {
        cb.online();
        print(['', '<span class="ok">✓ O gateway respondeu: o ' + HOST + ' está na rede. Servidor ONLINE!</span>']);
      }
    }

    async function run(line) {
      print('<span class="p">' + esc(PROMPT) + '</span> ' + esc(line));
      let a = line.trim().split(/\s+/).filter(Boolean);
      if (!a.length) return;
      TM.root = false;
      if (a[0] === 'sudo') { TM.root = true; a = a.slice(1); }
      const cmd = (a[0] || '').toLowerCase(), args = a.slice(1);
      switch (cmd) {
        case 'help':
          print(['comandos disponíveis:', '  ip addr                    mostra a placa de rede e o IP', '  sudo ip link set eth0 up   liga a placa de rede', '  ping ' + GW + '              testa a rede até o gateway', '  ip link   hostname   whoami   clear   exit']);
          break;
        case 'clear': el.out.innerHTML = ''; break;
        case 'exit': case 'logout': close(); break;
        case 'whoami': print(TM.root ? 'root' : 'admin'); break;
        case 'hostname': print(HOST); break;
        case 'ip': {
          const sub = args[0] || '';
          if (sub === '' || /^a(ddr?)?$/.test(sub) || sub === 'address') ipAddr();
          else if (/^l(ink?)?$/.test(sub) && args[1] === 'set') {
            const dev = args[2], to = args[3];
            if (dev !== 'eth0' && dev !== 'lo') { print('Cannot find device "' + esc(dev || '') + '"'); break; }
            if (to !== 'up' && to !== 'down') { print('uso: ip link set eth0 up'); break; }
            if (!TM.root) { print(['<span class="w">RTNETLINK answers: Operation not permitted</span>', '<span class="m">(mudar a rede é coisa de administrador: coloque sudo na frente → sudo ip link set eth0 up)</span>']); break; }
            if (dev === 'eth0') {
              st.eth0Up = to === 'up';
              cb.changed();
              if (st.eth0Up && !st.cable) print('<span class="m">(a interface subiu, mas não há cabo: o link continua DOWN)</span>');
            }
          } else if (/^l(ink?)?$/.test(sub)) {
            print(['1: lo: mtu 65536 state ' + linkWord('UNKNOWN'), '2: eth0:' + (st.eth0Up && !st.cable ? ' <span class="w">NO-CARRIER</span>' : '') + ' mtu 1500 state ' + linkWord(ethState())]);
          } else print('Object "' + esc(sub) + '" is unknown, try "help".');
          break;
        }
        case 'ping':
          TM.busy = true;
          el.input.disabled = true;
          await ping(args);
          TM.busy = false;
          el.input.disabled = false;
          if (TM.open) el.input.focus();
          break;
        default:
          print([esc(cmd) + ': command not found', '<span class="m">(digite help para ver os comandos)</span>']);
      }
      renderSteps();
    }

    /* ---------- teclado ---------- */
    el.input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        const line = el.input.value;
        el.input.value = '';
        if (line.trim()) { TM.history.push(line); TM.hi = TM.history.length; }
        if (!TM.busy) run(line);
      } else if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') {
        // setas: comandos anteriores
        if (!TM.history.length) return;
        TM.hi = Math.max(0, Math.min(TM.history.length, TM.hi + (ev.key === 'ArrowUp' ? -1 : 1)));
        el.input.value = TM.history[TM.hi] || '';
        ev.preventDefault();
      }
    });
    el.close.addEventListener('click', () => close());
    el.out.addEventListener('click', () => el.input.focus());

    function open() {
      TM.open = true;
      el.root.classList.add('is-open');
      cb.lock(true);
      if (!TM.started) {
        TM.started = true;
        print(['Ubuntu 24.04 LTS · ' + HOST + ' · ' + IP, 'Servidor novo: a placa de rede vem desligada.', '<span class="m">Siga os 3 comandos ao lado. Digite help para ver os comandos.</span>', '']);
      }
      el.prompt.textContent = PROMPT;
      renderSteps();
      setTimeout(() => el.input.focus(), 0);
    }
    function close() {
      if (!TM.open) return;
      TM.open = false;
      el.root.classList.remove('is-open');
      el.input.blur();
      cb.lock(false);
    }
    // com o terminal aberto, o teclado é dele (Esc fecha)
    function key(ev) {
      if (!TM.open) return false;
      if (ev.code === 'Escape') { close(); ev.preventDefault(); }
      return true;
    }
    return { open, close, key, get isOpen() { return TM.open; } };
  };
})();

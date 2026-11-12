/* Venti Experience — monitoramento (tecla M), no estilo Grafana / Zabbix.
   Versão SIMPLES do monitor.js do DataLab: uma amostra por segundo de jogo, os últimos 2 minutos.
   Um host que sai da rede para de responder: o gráfico dele "quebra" e a disponibilidade fica vermelha.
   Os gráficos (timeseries, timeline), os números do topo (stat) e as cores vêm do DataLab.

   DL.createMonitor({ hosts, problems, lock }):
     hosts()     → [{ key, name, kind: 'server'|'switch', up: true|false }]  (só o que está instalado)
     problems()  → [{ sev: 'high'|'warning', host, text }]                    (o que está errado agora)
     lock(on)    → trava o jogador enquanto o monitor está aberto */
(function () {
  'use strict';
  const DL = window.DL;
  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = Math.random;

  const N = 120; // 2 minutos de amostras de 1 segundo
  const SEV = { warning: { label: 'Atenção', color: '#ffc859' }, high: { label: 'Alta', color: '#e45959' } };
  const HELP = {
    stat: 'Indicadores rápidos: quantos hosts respondem, a disponibilidade dos últimos 2 minutos e os problemas abertos.',
    cpu: 'Uso do processador. Picos curtos são normais; ficar perto de 100% por muito tempo deixa tudo lento.',
    net: 'Tráfego de rede em Mbps (entrada e saída). Cair a zero de repente costuma ser cabo, porta ou interface.',
    avail: 'Linha do tempo de disponibilidade: verde respondeu ao ping, vermelho não respondeu. Cinza: ainda não estava instalado.',
    prob: 'O que está errado agora. Some sozinho quando a causa é resolvida.',
  };

  DL.createMonitor = function (src) {
    const $ = (id) => document.getElementById(id);
    const el = { root: $('monitor'), body: $('monBody'), close: $('monClose') };
    const M = { series: new Map(), acc: 0, t: 0, open: false };

    /* ---------- métricas (simuladas a partir do estado real) ---------- */
    function seriesOf(key) {
      let s = M.series.get(key);
      if (!s) {
        const blank = () => new Array(N).fill(undefined); // undefined = ainda não existia
        s = { cpu: blank(), netIn: blank(), netOut: blank(), up: blank(), ph: rand() * 10 };
        M.series.set(key, s);
      }
      return s;
    }
    const push = (arr, v) => { arr.shift(); arr.push(v); };
    const last = (arr) => { for (let i = arr.length - 1; i >= 0; i--) if (arr[i] !== undefined) return arr[i]; return undefined; };

    function sample() {
      const t = M.t, hosts = src.hosts(), seen = new Set(hosts.map((h) => h.key));
      for (const h of hosts) {
        const s = seriesOf(h.key), j = () => rand() - 0.5;
        if (!h.up) { push(s.cpu, null); push(s.netIn, null); push(s.netOut, null); push(s.up, 0); continue; } // null = não respondeu
        const cpu = h.kind === 'switch' ? 9 + 4 * Math.sin(t / 7 + s.ph) + j() * 3 : 24 + 12 * Math.sin(t / 9 + s.ph) + j() * 7;
        const net = h.kind === 'switch' ? 0 : Math.max(0, 140 * (0.75 + 0.25 * Math.sin(t / 11 + s.ph)) + j() * 18);
        push(s.cpu, clamp(cpu, 0.5, 100));
        push(s.netIn, net);
        push(s.netOut, net * 0.62);
        push(s.up, 1);
      }
      // o que não está instalado segue sem dado (cinza)
      for (const [k, s] of M.series) if (!seen.has(k)) for (const a of [s.cpu, s.netIn, s.netOut, s.up]) push(a, undefined);
    }

    /* ---------- gráficos (copiados do DataLab: fit, timeseries, timeline) ---------- */
    function fit(cv) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2), w = cv.clientWidth, h = cv.clientHeight;
      if (!w || !h) return null;
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      const g = cv.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      return { g, w, h };
    }
    function timeseries(cv, lines, o) {
      const c = fit(cv);
      if (!c) return;
      const { g, w, h } = c, L = 34, R = 8, T = 8, B = 18;
      let lo = o.min, hi = o.max;
      const pw = w - L - R, ph = h - T - B;
      const X = (i) => L + (i / (N - 1)) * pw, Y = (v) => T + ph - ((v - lo) / (hi - lo)) * ph;
      g.font = '10px ui-monospace, monospace';
      g.fillStyle = '#8e8e8e';
      g.strokeStyle = 'rgba(204,204,220,0.07)';
      g.lineWidth = 1;
      for (let k = 0; k <= 4; k++) {
        const v = lo + ((hi - lo) * k) / 4, y = Math.round(Y(v)) + 0.5;
        g.beginPath(); g.moveTo(L, y); g.lineTo(w - R, y); g.stroke();
        g.fillText(Math.round(v) + (k === 4 && o.unit ? ' ' + o.unit : ''), 2, y + 3);
      }
      for (const [i, lab] of [[0, '-2m'], [60, '-1m'], [N - 1, 'agora']]) g.fillText(lab, Math.min(X(i) - (i ? 14 : 0), w - 32), h - 4);
      for (const l of lines) {
        g.strokeStyle = l.color;
        g.lineWidth = 1.5;
        g.lineJoin = 'round';
        let seg = [];
        const flush = () => {
          if (seg.length > 1) {
            g.beginPath(); g.moveTo(seg[0][0], T + ph);
            for (const [x, y] of seg) g.lineTo(x, y);
            g.lineTo(seg[seg.length - 1][0], T + ph); g.closePath();
            g.fillStyle = l.color + '22'; g.fill();
            g.beginPath();
            seg.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y)));
            g.stroke();
          } else if (seg.length === 1) { g.fillStyle = l.color; g.fillRect(seg[0][0] - 1, seg[0][1] - 1, 2, 2); }
          seg = [];
        };
        l.data.forEach((v, i) => {
          if (v == null) {
            // um buraco: o host não respondeu — marcado em vermelho para a quebra ficar clara
            if (v === null && l.gapMark) { g.fillStyle = 'rgba(242,73,92,0.08)'; g.fillRect(X(i) - pw / N / 2, T, pw / N + 0.5, ph); }
            flush();
          } else seg.push([X(i), Y(clamp(v, lo, hi))]);
        });
        flush();
      }
    }
    function timeline(cv, rows) {
      const c = fit(cv);
      if (!c) return;
      const { g, w, h } = c, L = 64, rh = Math.min(18, (h - 16) / Math.max(1, rows.length));
      g.font = '10px ui-monospace, monospace';
      rows.forEach((r, k) => {
        const y = 4 + k * rh;
        g.fillStyle = '#ccccdc';
        g.fillText(r.name, 2, y + rh / 2 + 3);
        const pw = w - L - 6;
        r.data.forEach((v, i) => {
          g.fillStyle = v === 1 ? '#73bf69' : v === 0 ? '#f2495c' : '#22252b';
          g.fillRect(L + (i / N) * pw, y + 2, pw / N + 0.6, rh - 4);
        });
      });
      g.fillStyle = '#8e8e8e';
      g.fillText('-2m', L, h - 2);
      g.fillText('agora', w - 34, h - 2);
    }

    /* ---------- a tela ---------- */
    const panel = (title, help, body, cls) => '<section class="gp ' + (cls || '') + '"><header class="gp__h"><span>' + title + '</span><i class="gp__i" title="' + esc(help) + '">i</i></header>' + body + '</section>';
    const stat = (label, value, col, sub) => '<div class="gstat" style="--c:' + col + '"><span class="gstat__l">' + label + '</span><b class="gstat__v">' + value + '</b>' + (sub ? '<span class="gstat__s">' + sub + '</span>' : '') + '</div>';

    function availOf(keys) {
      let up = 0, n = 0;
      for (const k of keys) { const s = M.series.get(k); if (!s) continue; for (const v of s.up) if (v !== undefined) { n++; up += v; } }
      return n ? (up / n) * 100 : null;
    }

    function layout() {
      const hosts = src.hosts();
      if (!hosts.length) {
        el.body.innerHTML = '<div class="mon__empty"><p>Nenhum host monitorado ainda.</p><p>Instale o servidor e o switch no rack: eles aparecem aqui automaticamente.</p></div>';
        M.shape = '';
        return;
      }
      el.body.innerHTML =
        '<div class="mon__tip"><b>Como ler o monitoramento.</b> Cada gráfico mostra os últimos 2 minutos. Uma linha que <em>quebra</em> significa que o host parou de responder (tire o cabo e veja).</div>' +
        '<div class="grow1">' + panel('Visão geral', HELP.stat, '<div class="gstats" id="monStats"></div>') + '</div>' +
        '<div class="grow2">' + panel('CPU por host (%)', HELP.cpu, '<canvas class="gp__c" data-chart="cpu"></canvas><div class="glegend" id="monLegend"></div>') +
        panel('Tráfego de rede do SRV-01 (Mbps)', HELP.net, '<canvas class="gp__c" data-chart="net"></canvas><div class="glegend"><span style="--c:#73bf69">entrada</span><span style="--c:#5794f2">saída</span></div>') + '</div>' +
        '<div class="grow2 grow2--b">' + panel('Disponibilidade por host', HELP.avail, '<canvas class="gp__c gp__c--tl" data-chart="avail"></canvas>') +
        panel('Problemas', HELP.prob, '<div id="monProblems"></div>') + '</div>';
      M.shape = hosts.map((h) => h.key).join(',');
    }

    const PAL = ['#73bf69', '#5794f2', '#fade2a', '#ff9830'];
    function draw() {
      if (!M.open) return;
      const hosts = src.hosts();
      if (hosts.map((h) => h.key).join(',') !== M.shape) layout(); // instalou ou tirou algo: refaz a tela
      if (!hosts.length) return;
      const up = hosts.filter((h) => h.up).length, probs = src.problems();
      const av = availOf(hosts.map((h) => h.key));
      const high = probs.some((p) => p.sev === 'high');
      const srv = hosts.find((h) => h.kind === 'server');
      const rs = srv && M.series.get(srv.key);
      $('monStats').innerHTML =
        stat('Hosts respondendo', up + ' / ' + hosts.length, up === hosts.length ? '#73bf69' : '#f2495c') +
        stat('Disponibilidade', av == null ? '—' : av.toFixed(av > 99.9 ? 0 : 1) + '%', av == null || av > 99.5 ? '#73bf69' : av > 95 ? '#ff9830' : '#f2495c', 'últimos 2 min') +
        stat('Problemas ativos', probs.length, !probs.length ? '#73bf69' : high ? SEV.high.color : SEV.warning.color, probs.length ? (high ? 'Alta' : 'Atenção') : 'tudo ok') +
        stat('Tráfego do SRV-01', rs && last(rs.netIn) != null ? Math.round(last(rs.netIn)) + ' Mbps' : '—', '#5794f2');
      $('monLegend').innerHTML = hosts.map((h, i) => '<span style="--c:' + PAL[i % PAL.length] + '">' + esc(h.name) + '</span>').join('');
      $('monProblems').innerHTML = probs.length
        ? '<table class="ztable"><thead><tr><th>Severidade</th><th>Host</th><th>Problema</th></tr></thead><tbody>' +
          probs.map((p) => '<tr><td><span class="zsev" style="--c:' + SEV[p.sev].color + '">' + SEV[p.sev].label + '</span></td><td class="mono">' + esc(p.host) + '</td><td>' + esc(p.text) + '</td></tr>').join('') + '</tbody></table>'
        : '<p class="gp__empty">Nenhum problema. Tudo verde.</p>';
      const cv = (id) => el.body.querySelector('[data-chart="' + id + '"]');
      timeseries(cv('cpu'), hosts.map((h, i) => ({ color: PAL[i % PAL.length], data: seriesOf(h.key).cpu, gapMark: true })), { min: 0, max: 100, unit: '%' });
      timeseries(cv('net'), rs ? [{ color: '#73bf69', data: rs.netIn, gapMark: true }, { color: '#5794f2', data: rs.netOut }] : [], { min: 0, max: 200 });
      timeline(cv('avail'), hosts.map((h) => ({ name: h.name, data: seriesOf(h.key).up })));
    }

    // chamado a cada quadro pela missão: coleta 1 amostra por segundo, mesmo com o monitor fechado
    function update(dt) {
      M.t += dt;
      M.acc += dt;
      if (M.acc < 1) return;
      M.acc = 0;
      sample();
      draw();
    }

    function open() { M.open = true; el.root.classList.add('is-open'); src.lock(true); layout(); draw(); }
    function close() { if (!M.open) return; M.open = false; el.root.classList.remove('is-open'); src.lock(false); }
    el.close.addEventListener('click', () => close());
    el.root.addEventListener('pointerdown', (ev) => { if (ev.target === el.root) close(); });
    window.addEventListener('resize', () => draw());

    function key(ev) {
      if (!M.open) return false;
      if (ev.code === 'Escape' || ev.code === 'KeyM') close();
      return true;
    }
    return { open, close, key, update, get isOpen() { return M.open; } };
  };
})();

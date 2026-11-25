/* Venti Experience — Parte 4: o som da sala do DataLab, gerado por código (Web Audio, sem arquivos).
     zumbido   os servidores: um ronco grave (ventoinhas) + um chiado de ar, bem baixos; mais forte
               dentro da sala técnica, quase sumindo no carpete
     teclado   cliques curtos quando um funcionário perto do jogador está digitando
   O mesmo botão "Som" do lago (mesma preferência guardada: venti-som). O navegador só deixa tocar som
   depois do primeiro clique ou tecla: até lá fica tudo pronto, esperando. */
(function () {
  'use strict';
  const DL = window.DL, T = DL.T;
  const KEY = 'venti-som';
  let ac = null, master = null, hum = null, btn = null, on = true, buf = null, clickIn = 0;

  function lerPreferencia() { try { on = localStorage.getItem(KEY) !== '0'; } catch (e) { on = true; } }

  function ruido() {
    const n = ac.sampleRate * 2, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
    let br = 0;
    for (let i = 0; i < n; i++) { br = (br + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = br * 3.5; }
    return b;
  }
  function build() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ac = new AC();
    master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
    buf = ruido();
    hum = ac.createGain(); hum.gain.value = 0.3; hum.connect(master);
    // ventoinhas: 2 tons graves levemente desafinados, abafados
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220; lp.connect(hum);
    for (const [f, v] of [[60, 0.05], [120.7, 0.025], [181, 0.01]]) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sawtooth'; o.frequency.value = f; g.gain.value = v;
      o.connect(g); g.connect(lp); o.start();
    }
    // o ar passando: ruído filtrado
    const s = ac.createBufferSource(); s.buffer = buf; s.loop = true;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 0.5;
    const g = ac.createGain(); g.gain.value = 0.06;
    s.connect(bp); bp.connect(g); g.connect(hum); s.start();
    return true;
  }
  // um clique de tecla: estalo de ruído bem curto, agudo
  function tecla(vol) {
    const t0 = ac.currentTime, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = buf;
    f.type = 'bandpass'; f.frequency.value = 2400 + Math.random() * 1600; f.Q.value = 1.2;
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0003, t0 + 0.035);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t0, Math.random() * 1.5, 0.05);
  }
  function setOn(v) {
    on = v;
    try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) { /* tudo bem */ }
    if (btn) { btn.textContent = v ? 'Som: ligado' : 'Som: mudo'; btn.setAttribute('aria-pressed', String(!v)); }
    if (master) master.gain.setTargetAtTime(v ? 0.7 : 0, ac.currentTime, 0.2);
    if (v) wake();
  }
  function wake() { if (ac && ac.state === 'suspended') ac.resume().catch(() => {}); }

  DL.DCSom = {
    enter() {
      lerPreferencia();
      if (!ac && !build()) return;
      master.gain.setTargetAtTime(on ? 0.7 : 0, ac.currentTime, 1); // entra devagar
      wake();
      window.addEventListener('pointerdown', wake);
      window.addEventListener('keydown', wake);
      if (!btn) {
        btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn--ghost som-btn';
        btn.onclick = (ev) => { ev.stopPropagation(); setOn(!on); btn.blur(); };
        document.body.appendChild(btn);
      }
      setOn(on);
    },
    update(game, dt) {
      if (!ac || ac.state !== 'running' || !on) return;
      const p = game.player;
      if (!p) return;
      // o zumbido: forte na sala técnica, médio no escritório, quase nada no carpete
      const tec = p.x > 15 * T && p.y < 10 * T, carp = p.y > 10.5 * T;
      hum.gain.setTargetAtTime(tec ? 0.55 : carp ? 0.08 : 0.2, ac.currentTime, 0.6);
      // o teclado de quem está digitando perto (até ~6 tiles), mais alto quanto mais perto
      const gente = DL.DCGente ? DL.DCGente.digitando() : [];
      let perto = 0;
      for (const a of gente) perto = Math.max(perto, 1 - Math.hypot(a.x - p.x, a.y - p.y) / (6 * T));
      clickIn -= dt;
      if (perto > 0 && clickIn <= 0) {
        tecla(0.05 * perto);
        clickIn = 0.07 + Math.random() * 0.16 + (Math.random() < 0.1 ? 0.4 : 0);
      }
    },
    leave() {
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('keydown', wake);
      if (btn) { btn.remove(); btn = null; }
      if (master) master.gain.setTargetAtTime(0, ac.currentTime, 0.3);
      const a = ac;
      ac = null;
      if (a) setTimeout(() => a.close().catch(() => {}), 1200);
    },
  };
})();

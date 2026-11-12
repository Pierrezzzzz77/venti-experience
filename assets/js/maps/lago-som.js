/* Venti Experience — Parte 0: o som do Lago da Prefeitura, gerado por código (Web Audio, sem arquivos).
     vento      ruído filtrado, subindo e descendo devagar
     água       ruído grave bem baixinho + "plocs" de onda na margem de vez em quando
     pássaros   piados curtos (assobios que sobem e descem), mais no começo da tarde
   Botão "Som" no canto da tela para silenciar (fica lembrado). O navegador só deixa tocar som
   depois do primeiro clique ou tecla: até lá fica tudo pronto, esperando. */
(function () {
  'use strict';
  const DL = window.DL, Lg = DL.Lago;
  const KEY = 'venti-som';
  let ac = null, master = null, wind = null, windF = null, water = null, btn = null, on = true, birdIn = 1, plocIn = 2, last = 0;

  try { on = localStorage.getItem(KEY) !== '0'; } catch (e) { /* sem localStorage: fica ligado */ }

  function noiseBuffer() {
    const n = ac.sampleRate * 2, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
    let br = 0;
    for (let i = 0; i < n; i++) { br = (br + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = br * 3.5; } // ruído "marrom" (mais grave)
    return b;
  }
  function loop(buf) { const s = ac.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); return s; }

  function build() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = on ? 0.8 : 0;
    master.connect(ac.destination);
    const buf = noiseBuffer();
    // vento: ruído num filtro passa-banda que passeia
    windF = ac.createBiquadFilter(); windF.type = 'bandpass'; windF.frequency.value = 500; windF.Q.value = 0.6;
    wind = ac.createGain(); wind.gain.value = 0.12;
    loop(buf).connect(windF); windF.connect(wind); wind.connect(master);
    // água: ruído grave e baixinho
    const wf = ac.createBiquadFilter(); wf.type = 'lowpass'; wf.frequency.value = 320;
    water = ac.createGain(); water.gain.value = 0.08;
    loop(buf).connect(wf); wf.connect(water); water.connect(master);
    return true;
  }

  // um piado: 2 a 4 assobios curtos
  function bird() {
    const t0 = ac.currentTime, n = 2 + Math.floor(Math.random() * 3), f0 = 2400 + Math.random() * 1800;
    const pan = ac.createStereoPanner ? ac.createStereoPanner() : null;
    if (pan) { pan.pan.value = Math.random() * 1.6 - 0.8; pan.connect(master); }
    for (let i = 0; i < n; i++) {
      const o = ac.createOscillator(), g = ac.createGain(), s = t0 + i * (0.11 + Math.random() * 0.05);
      o.type = 'sine';
      o.frequency.setValueAtTime(f0, s);
      o.frequency.exponentialRampToValueAtTime(f0 * (Math.random() < 0.5 ? 1.4 : 0.7), s + 0.08);
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(0.035, s + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0005, s + 0.09);
      o.connect(g); g.connect(pan || master);
      o.start(s); o.stop(s + 0.1);
    }
  }
  // uma ondinha batendo na margem
  function ploc() {
    const t0 = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(260 + Math.random() * 120, t0);
    o.frequency.exponentialRampToValueAtTime(90, t0 + 0.18);
    g.gain.setValueAtTime(0.03, t0);
    g.gain.exponentialRampToValueAtTime(0.0005, t0 + 0.2);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + 0.22);
  }

  function setOn(v) {
    on = v;
    try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) { /* tudo bem */ }
    if (btn) { btn.textContent = v ? 'Som: ligado' : 'Som: mudo'; btn.setAttribute('aria-pressed', String(!v)); }
    if (master) master.gain.setTargetAtTime(v ? 0.8 : 0, ac.currentTime, 0.15);
    if (v) wake();
  }
  function wake() { if (ac && ac.state === 'suspended') ac.resume().catch(() => {}); }

  Lg.som = {
    enter() {
      if (!ac && !build()) return;
      master.gain.value = 0;
      master.gain.setTargetAtTime(on ? 0.8 : 0, ac.currentTime, 1.2); // entra devagar
      wake();
      window.addEventListener('pointerdown', wake);
      window.addEventListener('keydown', wake);
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn--ghost som-btn';
      btn.onclick = (ev) => { ev.stopPropagation(); setOn(!on); btn.blur(); };
      document.body.appendChild(btn);
      setOn(on);
    },
    update(st) {
      if (!ac || ac.state !== 'running' || !on) return;
      const now = ac.currentTime, dt = Math.min(0.1, now - last);
      last = now;
      // o vento sobe e desce; mais forte quando a câmera está lá no alto (o começo do filme)
      const high = st.phase === 'film' && st.t < 6 ? 1 : 0;
      wind.gain.setTargetAtTime(0.08 + 0.06 * Math.sin(now * 0.31) + 0.03 * Math.sin(now * 0.83) + high * 0.1, now, 0.3);
      windF.frequency.setTargetAtTime(420 + 220 * Math.sin(now * 0.23) + high * 300, now, 0.4);
      water.gain.setTargetAtTime(high ? 0.02 : 0.08, now, 0.8);
      // os pássaros vão ficando mais quietos quando escurece
      birdIn -= dt;
      if (birdIn <= 0) { bird(); birdIn = (1.2 + Math.random() * 3) * (1 + st.dusk * 2); }
      plocIn -= dt;
      if (plocIn <= 0 && !high) { ploc(); plocIn = 1.5 + Math.random() * 3; }
    },
    leave() {
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('keydown', wake);
      if (btn) { btn.remove(); btn = null; }
      if (master) master.gain.setTargetAtTime(0, ac.currentTime, 0.3);
      // fecha depois de sumir o som (a abertura não usa)
      const a = ac;
      ac = null;
      if (a) setTimeout(() => a.close().catch(() => {}), 1500);
    },
  };
})();

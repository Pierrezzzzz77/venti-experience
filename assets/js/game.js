/* Venti Experience — o jogo: carrega um mapa, move o jogador e cuida da interação (tecla E).
   Vale para todos os mapas. Cada mapa (assets/js/maps/*.js) pode ter:
     enter(game)          quando o jogador chega no mapa
     leave(game)          quando o jogo troca para outro mapa
     update(game, dt)     a cada quadro (lógica da missão)
     useLabel(game, e)    texto da dica "E · ..." para o objeto e (ou null = sem interação)
     use(game, e)         o que acontece ao apertar E perto do objeto e
     overlay(g, scene)    desenho extra por cima da cena
   O movimento é o mesmo do DataLab (demo.js): WASD segue a tela, velocidade 74, suavização. */
(function () {
  'use strict';
  const DL = window.DL;
  const $ = (id) => document.getElementById(id);

  const KEYMAP = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' };
  const USE_KEYS = { KeyE: 1, Space: 1, Enter: 1 };
  const SPEED = 74;
  const FADE = 0.28;   // segundos de cada metade da transição entre mapas
  const USE_DIST = 20; // até quantos px dos pés o jogador alcança um objeto

  /* ------------------------------------------------------------------ */
  /* Som procedural (Web Audio, sem arquivos externos)                   */
  /* ------------------------------------------------------------------ */
  let actx = null;
  const audio = () => {
    if (actx) { if (actx.state === 'suspended') actx.resume().catch(() => {}); return actx; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { actx = new AC(); } catch (_) { return null; }
    return actx;
  };
  const sfx = {
    step(alt) {
      const c = audio(); if (!c) return;
      const t = c.currentTime, o = c.createOscillator(), g = c.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(alt ? 115 : 98, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.045);
      g.gain.setValueAtTime(0.032, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + 0.055);
    },
    blip() {
      const c = audio(); if (!c) return;
      const t = c.currentTime, o = c.createOscillator(), g = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(520, t);
      o.frequency.exponentialRampToValueAtTime(760, t + 0.06);
      g.gain.setValueAtTime(0.045, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + 0.085);
    },
    door() {
      const c = audio(); if (!c) return;
      const t = c.currentTime;
      for (const [dt, f0, f1] of [[0, 180, 90], [0.06, 130, 70]]) {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'square';
        o.frequency.setValueAtTime(f0, t + dt);
        o.frequency.exponentialRampToValueAtTime(f1, t + dt + 0.045);
        g.gain.setValueAtTime(0.035, t + dt);
        g.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.05);
        o.connect(g); g.connect(c.destination);
        o.start(t + dt); o.stop(t + dt + 0.055);
      }
    },
    water() {
      const c = audio(); if (!c) return;
      const t = c.currentTime;
      [420, 560, 710, 620, 840].forEach((f, i) => {
        const o = c.createOscillator(), g = c.createGain(), s = t + i * 0.055;
        o.type = 'sine';
        o.frequency.setValueAtTime(f, s);
        o.frequency.exponentialRampToValueAtTime(f * 1.45, s + 0.07);
        g.gain.setValueAtTime(0.04, s);
        g.gain.exponentialRampToValueAtTime(0.001, s + 0.085);
        o.connect(g); g.connect(c.destination);
        o.start(s); o.stop(s + 0.09);
      });
    },
    chalk() {
      const c = audio(); if (!c) return;
      const t = c.currentTime, o = c.createOscillator(), g = c.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(900 + Math.random() * 400, t);
      g.gain.setValueAtTime(0.015, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + 0.035);
    },
    crunch() {
      const c = audio(); if (!c) return;
      const t = c.currentTime;
      for (let i = 0; i < 3; i++) {
        const o = c.createOscillator(), g = c.createGain(), s = t + i * 0.055;
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(220 + i * 70, s);
        o.frequency.exponentialRampToValueAtTime(95, s + 0.04);
        g.gain.setValueAtTime(0.035, s);
        g.gain.exponentialRampToValueAtTime(0.001, s + 0.045);
        o.connect(g); g.connect(c.destination);
        o.start(s); o.stop(s + 0.05);
      }
    },
    chord(idx) {
      const c = audio(); if (!c) return;
      const chords = [
        [220.0, 261.63, 329.63, 392.0, 493.88],  // Am7
        [174.61, 220.0, 261.63, 329.63, 440.0],  // Fmaj7
        [130.81, 196.0, 261.63, 329.63, 392.0],  // C
        [196.0, 246.94, 293.66, 392.0, 493.88],  // G
      ];
      const freqs = chords[idx % chords.length], t = c.currentTime;
      freqs.forEach((f, i) => {
        const o = c.createOscillator(), g = c.createGain(), s = t + i * 0.032;
        o.type = 'triangle';
        o.frequency.setValueAtTime(f, s);
        g.gain.setValueAtTime(0.055, s);
        g.gain.exponentialRampToValueAtTime(0.0008, s + 1.15);
        o.connect(g); g.connect(c.destination);
        o.start(s); o.stop(s + 1.2);
      });
    },
  };
  DL.sfx = sfx;

  /* ------------------------------------------------------------------ */
  /* Partículas e marcador flutuante no mundo isométrico                 */
  /* ------------------------------------------------------------------ */
  const fx = {
    list: [],
    clear() { this.list.length = 0; },
    spawn(wx, wy, z, o) {
      if (this.list.length > 90) this.list.shift();
      this.list.push(Object.assign({ wx, wy, z: z || 0, vx: 0, vy: 0, vz: 0, g: 0, t: 0, life: 0.7, size: 1, color: '#fff', kind: 'dot' }, o));
    },
    burst(wx, wy, z, kind) {
      if (kind === 'drop') {
        for (let i = 0; i < 10; i++) {
          const a = Math.random() * Math.PI * 2, sp = 6 + Math.random() * 10;
          this.spawn(wx, wy, z, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 20 + Math.random() * 18, g: 75, life: 0.55 + Math.random() * 0.25, color: i % 3 ? '#7cc8f8' : '#e8f7ff', size: i % 2 ? 1.5 : 1 });
        }
      } else if (kind === 'note') {
        for (let i = 0; i < 4; i++) {
          this.spawn(wx + (Math.random() - 0.5) * 8, wy + (Math.random() - 0.5) * 8, z + i * 3, {
            vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, vz: 16 + i * 3, life: 1.1 + i * 0.15,
            kind: 'note', glyph: i % 2 ? '♫' : '♪', color: i % 2 ? '#ffe29a' : '#ffb88c',
          });
        }
      } else if (kind === 'mist') {
        for (let i = 0; i < 12; i++) {
          this.spawn(wx + (Math.random() - 0.5) * 14, wy + 2, z, {
            vx: (Math.random() - 0.5) * 6, vy: 10 + Math.random() * 12, vz: -8 - Math.random() * 8,
            life: 0.8 + Math.random() * 0.4, color: i % 2 ? '#c8ecff' : '#ffffff', size: 1.5,
          });
        }
      } else if (kind === 'spark') {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          this.spawn(wx, wy, z, { vx: Math.cos(a) * 12, vy: Math.sin(a) * 12, vz: 14 + Math.random() * 10, life: 0.5, color: i % 2 ? '#7ee0a1' : '#ffe29a', size: 1.5 });
        }
      }
    },
    update(dt) {
      for (let i = this.list.length - 1; i >= 0; i--) {
        const p = this.list[i];
        p.t += dt;
        if (p.t >= p.life) { this.list.splice(i, 1); continue; }
        p.vz -= p.g * dt;
        p.wx += p.vx * dt;
        p.wy += p.vy * dt;
        p.z = Math.max(0, p.z + p.vz * dt);
      }
    },
    draw(g, sc, near) {
      if (!sc.iso || !DL.isoKit) return;
      g.save();
      DL.isoKit.isoT(g, sc);
      for (const p of this.list) {
        const a = Math.max(0, 1 - p.t / p.life);
        const sx = p.wx - p.wy, sy = (p.wx + p.wy) / 2 - p.z;
        g.globalAlpha = a;
        if (p.kind === 'note') {
          g.font = 'bold 7px monospace';
          g.textAlign = 'center';
          g.fillStyle = 'rgba(0,0,0,0.45)';
          g.fillText(p.glyph, sx + 0.6, sy + 0.6);
          g.fillStyle = p.color;
          g.fillText(p.glyph, sx, sy);
        } else {
          g.fillStyle = p.color;
          g.fillRect(Math.round(sx), Math.round(sy), p.size, p.size);
        }
      }
      const p = DL.game && DL.game.player, held = DL.game && DL.game.held;
      if (p && !p.hidden) {
        const px = p.x - p.y, py = (p.x + p.y) / 2 - (p.z || 0), anim = p.anim;
        g.globalAlpha = 1;
        if (anim && anim.kind === 'guitar') {
          const vib = Math.sin(sc.t * 24) * 0.8;
          const gx = px - 5, gy = py - 14 + vib;
          // violão atravessado na mão do personagem
          g.fillStyle = '#5a3a22'; g.fillRect(gx + 8, gy - 4, 6, 2);
          g.fillStyle = '#3a2616'; g.fillRect(gx + 13, gy - 5, 2, 3);
          g.fillStyle = '#c98a4a'; g.fillRect(gx, gy - 2, 9, 6);
          g.fillStyle = '#8f5a2c'; g.fillRect(gx + 1, gy + 3, 7, 1);
          g.fillStyle = '#2a1a10'; g.fillRect(gx + 4, gy, 2, 2);
        } else if (anim && anim.kind === 'drink') {
          const sip = Math.sin(sc.t * 14) * 1;
          const cx = px + (p.dir === 'left' ? -5 : 4), cy = py - 18 + sip;
          // copinho de água levantado até a boca
          g.fillStyle = '#e8f4fc'; g.fillRect(cx, cy, 3, 4);
          g.fillStyle = '#4a9fd8'; g.fillRect(cx, cy + 1, 3, 2);
        } else if (held) {
          const eating = anim && anim.kind === 'eat';
          const phase = eating ? ((anim.total - anim.t) % 0.7) / 0.7 : 0;
          const lift = eating ? Math.sin(phase * Math.PI) : 0;
          const baseDx = p.dir === 'left' ? -6 : p.dir === 'right' ? 4 : 4;
          const dx = baseDx * (1 - lift);
          const dy = (-11 + (p.moving ? Math.sin(p.dist * 0.5) * 0.7 : 0)) * (1 - lift) + (-21) * lift;
          const hx = Math.round(px + dx), hy = Math.round(py + dy);
          const bites = Math.max(1, held.bites || 3);
          if (held.id === 'caldo') {
            const h = bites + 2;
            g.fillStyle = '#d9f0ff'; g.fillRect(hx, hy - 3, 3, 5);
            g.fillStyle = '#7ec850'; g.fillRect(hx, hy + 2 - h, 3, h);
            g.fillStyle = '#ffffff'; g.fillRect(hx + 1, hy - 5, 1, 2);
          } else if (held.id === 'coxinha') {
            const w = bites >= 2 ? 3 : 2, h = bites >= 3 ? 3 : 2;
            g.fillStyle = '#cf7d2b'; g.fillRect(hx, hy - 1, w, h);
            if (bites >= 2) { g.fillStyle = '#f0b654'; g.fillRect(hx + 1, hy - 2, 1, 2); }
          } else {
            const w = bites === 3 ? 5 : bites === 2 ? 3 : 2;
            g.fillStyle = '#e8c477'; g.fillRect(hx - 1, hy - 1, w, 3);
            g.fillStyle = '#b96d32'; g.fillRect(hx, hy, Math.max(1, w - 2), 1);
          }
        }
      }
      g.restore();
    },
  };
  DL.fx = fx;

  const game = {
    scene: null,
    map: null,      // definição do mapa atual (DL.MAPS[id])
    world: null,
    player: null,
    keys: new Set(),
    locked: false,  // true enquanto um painel está aberto (o jogador fica parado)
    near: null,     // objeto ao alcance agora
    held: null,     // lanche/bebida na mão ({ id, nome, bites })

    updateHeldHud() {
      const el = $('heldHud');
      if (!el) return;
      if (!this.held) { el.hidden = true; el.textContent = ''; return; }
      el.hidden = false;
      const verbo = this.held.id === 'caldo' ? 'Beber' : 'Comer';
      el.innerHTML = 'Na mão: <b>' + this.held.nome + '</b> · <kbd>F</kbd> ' + verbo;
    },
    giveSnack(id, nome) {
      this.held = { id, nome, bites: 3 };
      this.updateHeldHud();
    },
    eatSnack() {
      if (this.locked || !this.held || !this.player) return;
      if (this.player.anim && this.player.anim.kind === 'eat') return;
      const total = this.held.bites * 0.7;
      this.player.anim = { kind: 'eat', t: total, total, nextBite: total - 0.35 };
    },

    loadMap(id, spawn) {
      const def = DL.MAPS[id];
      if (!def) throw new Error('Mapa não encontrado: ' + id);
      if (this.scene) this.scene.stop();
      if (this.map && this.map.leave) this.map.leave(this); // o mapa que sai arruma a tela dele
      this.locked = false;
      this.map = def;
      this.world = DL.buildMap(def);
      fx.clear();
      this._stepMark = 0;
      const canvas = $('game');
      this.scene = new DL.Scene(canvas, Object.assign({ world: this.world }, def.camera));
      const sp = spawn ? { x: spawn[0] * DL.T + 8, y: spawn[1] * DL.T + 10 } : this.world.spawn;
      this.player = this.scene.addPlayer(DL.LOOKS.player, sp.x, sp.y, def.spawnDir || 'down');
      this.scene.overlay = (g, sc) => { if (def.overlay) def.overlay(g, sc, this); fx.draw(g, sc, this.locked ? null : this.near); this.drawFade(g, sc); };
      document.title = (def.name ? def.name + ' · ' : '') + 'Venti Experience';
      if (def.enter) def.enter(this);
      this.scene.start((dt) => this.step(dt));
    },

    // Troca de mapa com uma transição curta: a tela escurece, o mapa troca e a tela volta a abrir.
    // (o escuro é pintado dentro do próprio canvas, sem camada de CSS por cima)
    goTo(id, spawn) {
      if (this.fade && this.fade.id) return;
      this.fade = { t: 0, id, spawn };
      this.locked = true;
    },
    drawFade(g, sc) {
      const f = this.fade;
      if (!f) return;
      const k = Math.min(1, f.t / FADE), a = f.id ? k : 1 - k;
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1;
      g.fillStyle = 'rgba(0,0,0,' + a.toFixed(3) + ')';
      g.fillRect(0, 0, sc.canvas.width, sc.canvas.height);
      g.restore();
    },

    // Mostra uma mensagem curta no rodapé por alguns segundos.
    toast(text, tone) {
      const el = $('toast');
      el.textContent = text;
      el.className = 'toast is-on' + (tone ? ' is-' + tone : '');
      clearTimeout(this._toastT);
      this._toastT = setTimeout(() => (el.className = 'toast'), 2600);
    },

    // objetos com interação ao alcance; o mais perto ganha
    findNear() {
      const p = this.player, def = this.map;
      if (!def.useLabel) return null;
      if (p.sitting) {
        let nb = null, nd = 28;
        for (const e of this.world.items) {
          if ((e.kind !== 'notebook' && e.kind !== 'notebook-ads') || e.ix == null || !def.useLabel(this, e)) continue;
          const d = Math.hypot(e.ix - p.x, e.iy - p.y);
          if (d < nd) { nd = d; nb = e; }
        }
        return nb || p.sitting;
      }
      let best = null, bd = 1e9;
      for (const e of this.world.items) {
        if (e.ix == null || !def.useLabel(this, e)) continue;
        const d = Math.hypot(e.ix - p.x, e.iy - p.y), lim = e.useDist || USE_DIST;
        if (d < lim && d < bd) { bd = d; best = e; }
      }
      return best;
    },

    sit(e) {
      const p = this.player;
      if (!p || !e) return;
      if (!p.sitting) p._antesSentar = { x: p.x, y: p.y, dir: p.dir };
      const DIR = { S: [0, 1, 'down'], N: [0, -1, 'up'], L: [1, 0, 'right'], O: [-1, 0, 'left'] };
      const d = DIR[e.face] || [0, 0, p.dir];
      const tuck = e.tuck || 0;
      p.x = e.px + (e.tw || 1) * 8 + d[0] * tuck * 0.5;
      p.y = e.py + (e.th || 1) * 8 + d[1] * tuck * 0.5;
      p.dir = d[2];
      p.z = e.kind === 'puff' || e.kind === 'sofa' ? 5 : 8;
      p.pose = 'sitR';
      p.sitting = e;
      p.vx = 0; p.vy = 0; p.moving = false;
      sfx.blip();
    },

    stand() {
      const p = this.player;
      if (!p || !p.sitting) return;
      if (p._antesSentar) { p.x = p._antesSentar.x; p.y = p._antesSentar.y; }
      p.z = 0;
      p.pose = null;
      p.sitting = null;
      p._antesSentar = null;
    },

    step(dt) {
      if (this.fade) {
        const f = this.fade;
        f.t += dt;
        if (f.id && f.t >= FADE) { this.fade = { t: 0 }; return this.loadMap(f.id, f.spawn); }
        if (!f.id && f.t >= FADE) this.fade = null;
      }
      const p = this.player, sc = this.scene;
      // (zoom) um filme começou ou acabou, ou o menu abriu/fechou: refaz a escala (sem zoom no filme)
      if (DL.zoomAtivo && sc._zoomAtivo !== undefined && sc._zoomAtivo !== DL.zoomAtivo()) sc.resize();
      let ix = 0, iy = 0;
      if (!this.locked) {
        if (this.keys.has('left')) ix -= 1;
        if (this.keys.has('right')) ix += 1;
        if (this.keys.has('up')) iy -= 1;
        if (this.keys.has('down')) iy += 1;
      }
      const len = Math.hypot(ix, iy);
      if (len > 1) { ix /= len; iy /= len; }
      if (p.sitting) {
        if (!this.locked && len > 0.1) this.stand();
        else {
          p.vx = 0; p.vy = 0; p.moving = false;
          p.pose = this.locked && Math.floor(sc.t * 4.5) % 2 ? 'sitA' : this.locked ? 'sitB' : 'sitR';
        }
      }
      // (copiado do DataLab, demo.js) W/A/S/D seguem a tela: "cima" na tela é diagonal no grid isométrico
      const k = 1 - Math.exp(-dt * (len > 0 ? 14 : 22));
      const wd = sc.screenDir(ix, iy);
      if (!p.sitting) {
        p.vx += (wd.x * SPEED - p.vx) * k;
        p.vy += (wd.y * SPEED - p.vy) * k;
        if (!len && Math.hypot(p.vx, p.vy) < 2) p.vx = p.vy = 0;

        const x0 = p.x, y0 = p.y;
        sc.moveActor(p, p.vx * dt, p.vy * dt);
        const moved = Math.hypot(p.x - x0, p.y - y0);
        const was = p.moving;
        p.moving = len > 0.1 && moved > 0.05;
        if (p.moving && !was) { p.dist = 0; this._stepMark = 0; }
        p.dist += moved;
        if (p.moving && p.dist - (this._stepMark || 0) >= 13) {
          this._stepMark = p.dist;
          sfx.step(Math.floor(p.dist / 13) % 2 === 0);
          fx.spawn(p.x + (Math.random() - 0.5) * 4, p.y + (Math.random() - 0.5) * 3, 1, {
            vx: -p.vx * 0.12 + (Math.random() - 0.5) * 6, vy: -p.vy * 0.12 + (Math.random() - 0.5) * 6,
            vz: 5 + Math.random() * 4, life: 0.35, color: 'rgba(235,224,205,0.7)', size: 1,
          });
        }
        if (len > 0.1) {
          const ax = Math.abs(ix), ay = Math.abs(iy);
          const horiz = ix < 0 ? 'left' : 'right', vert = iy < 0 ? 'up' : 'down';
          // na diagonal mantém a direção atual, para o sprite não ficar trocando
          if (!(ax > 0.01 && ay > 0.01 && Math.abs(ax - ay) < 0.2 && (p.dir === horiz || p.dir === vert))) p.dir = ax > ay ? horiz : vert;
        }
      }
      if (p.anim) {
        p.anim.t -= dt;
        if (p.anim.kind === 'guitar') {
          p.pose = Math.floor(sc.t * 6) % 2 ? 'danceA' : 'danceB';
          p.anim.fxT = (p.anim.fxT || 0) - dt;
          if (p.anim.fxT <= 0) { p.anim.fxT = 0.45; fx.burst(p.x, p.y, 24, 'note'); }
          if (len > 0.1 || p.anim.t <= 0) {
            if (p.anim.item) p.anim.item.hidden = false;
            p.anim = null;
            if (!p.sitting) p.pose = null;
          }
        } else if (p.anim.kind === 'drink') {
          p.pose = 'talk';
          p.anim.fxT = (p.anim.fxT || 0) - dt;
          if (p.anim.fxT <= 0) { p.anim.fxT = 0.35; fx.burst(p.x, p.y, 22, 'drop'); }
          if (len > 0.1 || p.anim.t <= 0) { p.anim = null; if (!p.sitting) p.pose = null; }
        } else if (p.anim.kind === 'eat') {
          p.pose = Math.floor(sc.t * 8) % 2 ? 'talk' : null;
          if (this.held && p.anim.t <= p.anim.nextBite) {
            p.anim.nextBite -= 0.7;
            if (this.held.id === 'caldo') sfx.water(); else sfx.crunch();
            fx.burst(p.x, p.y, 24, this.held.id === 'caldo' ? 'drop' : 'spark');
            this.held.bites -= 1;
            if (this.held.bites <= 0) {
              const nome = this.held.nome;
              this.held = null;
              this.updateHeldHud();
              this.toast('Terminou ' + nome + '! (+energia)', 'ok');
            } else {
              this.updateHeldHud();
            }
          }
          if (len > 0.1 || p.anim.t <= 0) { p.anim = null; if (!p.sitting) p.pose = null; }
        }
      }
      fx.update(dt);

      // a câmera segue o jogador, suave (um pouco acima dos pés)
      // (camera.lead do mapa: desloca o centro da câmera em px do mundo, ex. para mostrar mais de um lado do prédio)
      const kc = 1 - Math.exp(-dt * 5.5), lead = (this.map.camera && this.map.camera.lead) || [0, 0];
      sc.cam.x += (p.x - 7 + lead[0] + p.vx * 0.22 - sc.cam.x) * kc;
      sc.cam.y += (p.y - 12 + 4.9 + lead[1] + p.vy * 0.22 - sc.cam.y) * kc;

      // portas para outros mapas: quem pisa no tile da porta troca de mapa (com a transição)
      const tx = Math.floor(p.x / DL.T), ty = Math.floor(p.y / DL.T);
      if (!(this.fade && this.fade.id)) for (const pt of this.world.portals) if (pt.tx === tx && pt.ty === ty) { this.goTo(pt.to, pt.spawn); break; }

      if (this.map.update) this.map.update(this, dt);

      // dica de interação
      this.near = this.locked ? null : this.findNear();
      // (só mexe no DOM quando o texto muda: escrever a cada quadro obrigava o navegador a refazer o estilo e a pintura da dica)
      const label = (this.near && this.map.useLabel(this, this.near)) || '';
      if (label !== this._hint) {
        this._hint = label;
        const hint = $('hint');
        hint.innerHTML = label ? '<kbd>E</kbd> ' + label : '';
        hint.classList.toggle('is-on', !!label);
      }
    },

    use() {
      if (this.locked || !this.near || !this.map.use) return;
      const e = this.near;
      if (this.player.sitting && e === this.player.sitting) { this.stand(); sfx.blip(); return; }
      if (!this.player.sitting) this.player.dir = DL.dirOf(e.ix - this.player.x, e.py + 8 - this.player.y);
      this.map.use(this, e);
    },
  };
  DL.game = game;

  /* ---------- zoom: roda do mouse, + e − (também os do teclado numérico), 0 volta ao normal ---------- */
  // (desligado com painel aberto, nos filmes e com o menu; a conta dos pixels fica em iso.js: DL.zoomPasso)
  const podeZoom = () => game.scene && !game.locked && !game.fade && DL.zoomAtivo && DL.zoomAtivo();
  const ZOOM_KEYS = { Equal: 1, NumpadAdd: 1, Minus: -1, NumpadSubtract: -1, Digit0: 0, Numpad0: 0 };
  const ZOOM_CHARS = { '+': 1, '=': 1, '-': -1, '0': 0 };
  let rodaT = 0;
  window.addEventListener('wheel', (ev) => {
    if (!podeZoom() || ev.target !== $('game')) return;
    ev.preventDefault();
    const agora = performance.now();
    if (agora - rodaT < 70 || !ev.deltaY) return; // (o touchpad manda muitos eventos seguidos: um passo por vez)
    rodaT = agora;
    DL.zoomPasso(game.scene, ev.deltaY < 0 ? 1 : -1);
  }, { passive: false });

  window.addEventListener('keydown', (ev) => {
    // um painel aberto (rack, terminal) fica com o teclado; ele mesmo decide o que bloquear
    if (game.map && game.map.key && game.map.key(game, ev)) return;
    const tag = ev.target && ev.target.tagName;
    const zk = ev.code in ZOOM_KEYS ? ZOOM_KEYS[ev.code] : ZOOM_CHARS[ev.key];
    if (zk !== undefined && tag !== 'INPUT' && tag !== 'TEXTAREA' && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
      if (podeZoom()) DL.zoomPasso(game.scene, zk);
      ev.preventDefault();
      return;
    }
    const k = KEYMAP[ev.code];
    if (k) { game.keys.add(k); ev.preventDefault(); }
    else if (USE_KEYS[ev.code] && !ev.repeat) { game.use(); ev.preventDefault(); }
    else if (ev.code === 'KeyF' && !ev.repeat) { game.eatSnack(); ev.preventDefault(); }
  });
  window.addEventListener('keyup', (ev) => { const k = KEYMAP[ev.code]; if (k) game.keys.delete(k); });
  window.addEventListener('blur', () => game.keys.clear());
  window.addEventListener('resize', () => game.scene && game.scene.resize());
})();

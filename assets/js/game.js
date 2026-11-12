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
  const USE_DIST = 20; // até quantos px dos pés o jogador alcança um objeto

  const game = {
    scene: null,
    map: null,      // definição do mapa atual (DL.MAPS[id])
    world: null,
    player: null,
    keys: new Set(),
    locked: false,  // true enquanto um painel está aberto (o jogador fica parado)
    near: null,     // objeto ao alcance agora

    loadMap(id, spawn) {
      const def = DL.MAPS[id];
      if (!def) throw new Error('Mapa não encontrado: ' + id);
      if (this.scene) this.scene.stop();
      if (this.map && this.map.leave) this.map.leave(this); // o mapa que sai arruma a tela dele
      this.locked = false;
      this.map = def;
      this.world = DL.buildMap(def);
      const canvas = $('game');
      this.scene = new DL.Scene(canvas, Object.assign({ world: this.world }, def.camera));
      const sp = spawn ? { x: spawn[0] * DL.T + 8, y: spawn[1] * DL.T + 10 } : this.world.spawn;
      this.player = this.scene.addPlayer(DL.LOOKS.player, sp.x, sp.y, def.spawnDir || 'down');
      this.scene.overlay = (g, sc) => { if (def.overlay) def.overlay(g, sc, this); };
      document.title = (def.name ? def.name + ' · ' : '') + 'Venti Experience';
      if (def.enter) def.enter(this);
      this.scene.start((dt) => this.step(dt));
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
      let best = null, bd = USE_DIST;
      for (const e of this.world.items) {
        if (e.ix == null || !def.useLabel(this, e)) continue;
        const d = Math.hypot(e.ix - p.x, e.iy - p.y);
        if (d < bd) { bd = d; best = e; }
      }
      return best;
    },

    step(dt) {
      const p = this.player, sc = this.scene;
      let ix = 0, iy = 0;
      if (!this.locked) {
        if (this.keys.has('left')) ix -= 1;
        if (this.keys.has('right')) ix += 1;
        if (this.keys.has('up')) iy -= 1;
        if (this.keys.has('down')) iy += 1;
      }
      const len = Math.hypot(ix, iy);
      if (len > 1) { ix /= len; iy /= len; }
      // (copiado do DataLab, demo.js) W/A/S/D seguem a tela: "cima" na tela é diagonal no grid isométrico
      const k = 1 - Math.exp(-dt * (len > 0 ? 14 : 22));
      const wd = sc.screenDir(ix, iy);
      p.vx += (wd.x * SPEED - p.vx) * k;
      p.vy += (wd.y * SPEED - p.vy) * k;
      if (!len && Math.hypot(p.vx, p.vy) < 2) p.vx = p.vy = 0;

      const x0 = p.x, y0 = p.y;
      sc.moveActor(p, p.vx * dt, p.vy * dt);
      const moved = Math.hypot(p.x - x0, p.y - y0);
      const was = p.moving;
      p.moving = len > 0.1 && moved > 0.05;
      if (p.moving && !was) p.dist = 0;
      p.dist += moved;
      if (len > 0.1) {
        const ax = Math.abs(ix), ay = Math.abs(iy);
        const horiz = ix < 0 ? 'left' : 'right', vert = iy < 0 ? 'up' : 'down';
        // na diagonal mantém a direção atual, para o sprite não ficar trocando
        if (!(ax > 0.01 && ay > 0.01 && Math.abs(ax - ay) < 0.2 && (p.dir === horiz || p.dir === vert))) p.dir = ax > ay ? horiz : vert;
      }

      // a câmera segue o jogador, suave (um pouco acima dos pés)
      const kc = 1 - Math.exp(-dt * 5.5);
      sc.cam.x += (p.x - 7 + p.vx * 0.22 - sc.cam.x) * kc;
      sc.cam.y += (p.y - 12 + 4.9 + p.vy * 0.22 - sc.cam.y) * kc;

      // portas para outros mapas (ainda não usadas: virão com a faculdade e a rua)
      const tx = Math.floor(p.x / DL.T), ty = Math.floor(p.y / DL.T);
      for (const pt of this.world.portals) if (pt.tx === tx && pt.ty === ty) return this.loadMap(pt.to, pt.spawn);

      if (this.map.update) this.map.update(this, dt);

      // dica de interação
      this.near = this.locked ? null : this.findNear();
      const hint = $('hint');
      const label = this.near && this.map.useLabel(this, this.near);
      hint.innerHTML = label ? '<kbd>E</kbd> ' + label : '';
      hint.classList.toggle('is-on', !!label);
    },

    use() {
      if (this.locked || !this.near || !this.map.use) return;
      const e = this.near;
      this.player.dir = DL.dirOf(e.ix - this.player.x, e.py + 8 - this.player.y);
      this.map.use(this, e);
    },
  };
  DL.game = game;

  window.addEventListener('keydown', (ev) => {
    // um painel aberto (rack, terminal) fica com o teclado; ele mesmo decide o que bloquear
    if (game.map && game.map.key && game.map.key(game, ev)) return;
    const k = KEYMAP[ev.code];
    if (k) { game.keys.add(k); ev.preventDefault(); }
    else if (USE_KEYS[ev.code] && !ev.repeat) { game.use(); ev.preventDefault(); }
  });
  window.addEventListener('keyup', (ev) => { const k = KEYMAP[ev.code]; if (k) game.keys.delete(k); });
  window.addEventListener('blur', () => game.keys.clear());
  window.addEventListener('resize', () => game.scene && game.scene.resize());
})();

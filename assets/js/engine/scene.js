/* Venti Experience — cena: personagem (Actor), colisão e o laço do jogo.
   COPIADO do DataLab (assets/js/scene.js) e enxugado: ficaram o Actor (andar, piscar), a colisão
   por tiles com "deslizar nos cantos" e o laço update/render. Saíram NPCs, incidente e telemetria.
   O desenho (câmera isométrica) fica em iso.js, que completa esta classe. */
(function () {
  'use strict';
  const DL = window.DL, T = DL.T;

  class Actor {
    constructor(look, x, y, dir) {
      this.look = look;
      this.sheet = DL.makeSheet(look);
      this.x = x;
      this.y = y;
      this.vx = 0;
      this.vy = 0;
      this.dir = dir || 'down';
      this.dist = 0;
      this.moving = false;
      this.blinkIn = 1.5 + Math.random() * 3;
      this.blinkT = 0;
    }
    tick(dt) {
      this.blinkIn -= dt;
      if (this.blinkIn <= 0) {
        this.blinkT = 0.13;
        this.blinkIn = 2.4 + Math.random() * 3.2;
      }
      if (this.blinkT > 0) this.blinkT -= dt;
    }
    frame() {
      const f = this.sheet[this.dir];
      if (!this.moving) return this.blinkT > 0 ? f.blink : f.idle;
      return f.walk[Math.floor(this.dist / 6.5) % 4];
    }
  }
  DL.Actor = Actor;

  const dirOf = (dx, dy) => (Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down');
  DL.dirOf = dirOf;

  class Scene {
    // opts: { world, tilesWide, minTilesHigh, zoom }
    constructor(canvas, opts) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.o = Object.assign({ tilesWide: 14, minTilesHigh: 9, zoom: 0 }, opts);
      this.world = this.o.world;
      this.floor = DL.renderFloor(this.world);
      this.mapW = this.world.W * T;
      this.mapH = this.world.H * T;
      this.t = 0;
      this.cam = { x: this.mapW / 2, y: this.mapH / 2 };
      this.player = null;
      this.overlay = null; // desenho extra por cima (ex.: o que o jogador carrega)
      this.ox = 0;
      this.oy = 0;
      this.drawables = this.world.items.slice();
      this.resize();
    }

    addPlayer(look, x, y, dir) {
      this.player = new Actor(look, x, y, dir);
      this.drawables.push(this.player);
      this.cam.x = x;
      this.cam.y = y;
      return this.player;
    }

    // Depois de mudar os objetos do mapa (pegar uma caixa, instalar algo): refaz a lista de desenho.
    refreshWorld() {
      this.world.version = (this.world.version || 0) + 1;
      this.drawables = this.world.items.slice();
      if (this.player) this.drawables.push(this.player);
    }

    /* ---------- colisão ---------- */
    solidAt(x, y) {
      const tx = Math.floor(x / T), ty = Math.floor(y / T);
      if (tx < 0 || ty < 0 || tx >= this.world.W || ty >= this.world.H) return true;
      return this.world.solid[ty * this.world.W + tx] === 1;
    }
    // os "pés" do personagem são uma caixinha de 10 × 4 px
    hits(x, y) {
      return this.solidAt(x - 5, y - 4) || this.solidAt(x + 5, y - 4) || this.solidAt(x - 5, y - 0.5) || this.solidAt(x + 5, y - 0.5);
    }
    // Movimento separado por eixo, com um empurrãozinho nos cantos: o jogador desliza em vez de travar.
    moveActor(a, dx, dy) {
      if (dx) {
        if (!this.hits(a.x + dx, a.y)) a.x += dx;
        else if (!this.nudge(a, dx, 'y')) {
          const s = Math.sign(dx) * 0.25;
          for (let n = 0; n < 8 && !this.hits(a.x + s, a.y); n++) a.x += s;
          a.vx = 0;
        }
      }
      if (dy) {
        if (!this.hits(a.x, a.y + dy)) a.y += dy;
        else if (!this.nudge(a, dy, 'x')) {
          const s = Math.sign(dy) * 0.25;
          for (let n = 0; n < 8 && !this.hits(a.x, a.y + s); n++) a.y += s;
          a.vy = 0;
        }
      }
    }
    nudge(a, d, axis) {
      for (let k = 1; k <= 6; k++) {
        for (const s of [1, -1]) {
          const ox = axis === 'x' ? s * k : 0, oy = axis === 'y' ? s * k : 0;
          const free = axis === 'y' ? !this.hits(a.x + d, a.y + oy) && !this.hits(a.x, a.y + oy) : !this.hits(a.x + ox, a.y + d) && !this.hits(a.x + ox, a.y);
          if (free) {
            const step = Math.min(k, Math.abs(d) * 0.9 + 0.2) * s;
            if (axis === 'y') a.y += step;
            else a.x += step;
            return true;
          }
        }
      }
      return false;
    }

    update(dt) {
      this.t += dt;
      if (this.player) this.player.tick(dt);
    }

    // laço do jogo: step(dt) é a lógica da página (teclado, missão); depois atualiza e desenha
    start(step) {
      if (this.running) return;
      this.running = true;
      let last = performance.now();
      const loop = (now) => {
        if (!this.running) return;
        // (Venti) o 1º quadro pode chegar com um horário anterior ao do start(): nunca deixa dt negativo
        const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
        last = now;
        if (step) step(dt);
        this.update(dt);
        this.render();
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    }
    stop() {
      this.running = false;
      cancelAnimationFrame(this.raf);
    }
  }

  DL.Scene = Scene;
})();

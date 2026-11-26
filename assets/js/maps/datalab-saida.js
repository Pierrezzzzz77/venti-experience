/* Venti Experience — Parte 4: sair do DataLab leva para a landing page do DataLab (o site de verdade).
   Carregado depois de rua.js: a porta da sala (e a passagem por ela) não volta mais para a rua. */
(function () {
  'use strict';
  const DL = window.DL, LANDING = 'https://datalab-six.vercel.app/';
  const lab = DL.MAPS.datalab, game = DL.game;
  if (!lab || !game) return;
  const rotulo = lab.useLabel;
  lab.useLabel = function (g, e) { return e.id === 'PORTA-RUA' ? 'Ir para o site do DataLab' : rotulo.call(this, g, e); };
  const goTo = game.goTo;
  game.goTo = function (id, spawn) {
    if (this.map === lab && id === 'rua') {
      if (this._saindoLab) return;
      this._saindoLab = true;
      this.locked = true;
      this.toast('Indo para o site do DataLab…', 'ok');
      setTimeout(() => { location.href = LANDING; }, 700);
      return;
    }
    return goTo.call(this, id, spawn);
  };
})();

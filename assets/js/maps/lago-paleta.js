/* Venti Experience — Parte 0: A PALETA do Lago da Prefeitura (fim de tarde).
   Todas as cores da cena saem daqui: 39 tons, já "coloridos" pelo pôr do sol (céu quente, sombras roxas
   e azuladas, luz dourada nos topos). Inspiração: referencia/11-inspiracao-agua-ambientacao.jpg.
   O que é pintado uma vez (chão, cidade, prédios) passa no fim por Lg.quantize: cada pixel vira a cor da
   paleta mais parecida. Assim, mesmo sombras e névoa misturadas ficam só com estes tons. */
(function () {
  'use strict';
  const DL = window.DL, Lg = (DL.Lago = DL.Lago || {});

  const PAL = {
    // céu, do alto para o horizonte (e o sol)
    sky0: '#1e1630', sky1: '#3a1e48', sky2: '#682a52', sky3: '#a8323e', sky4: '#d8502e',
    sky5: '#f07a2a', sky6: '#f9a83a', sky7: '#fdd46a', sky8: '#fff3c0',
    // montanhas: a de longe é a mais clara
    mt0: '#3e2240', mt1: '#6e3450', mt2: '#9a4a5a', mt3: '#c86a62',
    // água (azul escuro → o céu refletido)
    wa0: '#141c34', wa1: '#1e2c4e', wa2: '#2e4270', wa3: '#4a5a8e',
    // verdes (sombra → luz dourada no topo)
    gr0: '#16241e', gr1: '#22382a', gr2: '#2f5030', gr3: '#466a34', gr4: '#6a8a3a', gr5: '#a8a848',
    // terra e telhados de terracota
    te0: '#4a2622', te1: '#7a3428', te2: '#a84a30', te3: '#cc6a3c', te4: '#7a5a40', te5: '#a88058',
    // neutros: asfalto, concreto, paredes (sombra → sol)
    ne0: '#24202e', ne1: '#3a3442', ne2: '#5a5058', ne3: '#857470', ne4: '#b0988a', ne5: '#d8bea4', ne6: '#f4e0c4',
    // vidro e o prédio verde-claro
    vd0: '#2a4a4e', vd1: '#4e7a6e', vd2: '#9cbe9a',
  };
  Lg.PAL = PAL;
  const LIST = Object.values(PAL).map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);

  // a cor da paleta mais parecida (distância com peso: o olho vê mais o verde)
  const memo = new Map();
  function nearest(r, g, b) {
    const key = (r << 16) | (g << 8) | b;
    let v = memo.get(key);
    if (v !== undefined) return v;
    let best = 0, bd = 1e12;
    for (let i = 0; i < LIST.length; i++) {
      const c = LIST[i], dr = r - c[0], dg = g - c[1], db = b - c[2];
      const d = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
      if (d < bd) { bd = d; best = i; }
    }
    v = best;
    memo.set(key, v);
    return v;
  }
  // UMA VEZ (no preparo): troca cada pixel de uma tela pela cor da paleta mais perto.
  // Pixels meio transparentes ficam inteiros ou somem (bordas nítidas).
  Lg.quantize = function (canvas) {
    const w = canvas.width, h = canvas.height;
    if (!w || !h) return canvas;
    const g = canvas.getContext('2d');
    const img = g.getImageData(0, 0, w, h), d = img.data;
    for (let o = 0; o < d.length; o += 4) {
      if (d[o + 3] < 110) { d[o + 3] = 0; continue; }
      const c = LIST[nearest(d[o], d[o + 1], d[o + 2])];
      d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    // devolve uma CÓPIA: a tela que foi lida pixel a pixel o navegador tira da placa de vídeo
    // (desenhar com ela a cada quadro ficaria lento); a cópia nova volta para a placa
    const out = DL.mk(w, h), og = out.getContext('2d');
    og.drawImage(canvas, 0, 0);
    return out;
  };
})();

/* Venti Experience — as peças do cenário da viagem (abertura.js), cada uma desenhada UMA vez num sprite:
     árvores de copa cheia, palmeiras, arbustos, capim, a mata ao fundo (silhueta)
     árvores GRANDES em escala (arvoreG) e as versões "de longe" (camadas do meio e do fundo)
     23 modelos de casa, comércio, posto, lava-jato, galpão, pousada, igreja e terreno, NA ESCALA DO CARRO
     a academia SkyFit (foto 15) em escala, carros, motos, caminhão, placas e ponto de ônibus
   Cada casa tem dois desenhos: .c (de dia) e .luz (só as janelas e placas acesas, para a noite). */
(function () {
  'use strict';
  const DL = window.DL, R = DL.R, hash = DL.hash, shade = DL.shade, A = DL.Arte, disc = A.disc, text = A.text, textW = A.textW;
  const mk = (w, h) => { const c = DL.mk(w, h); return [c, c.getContext('2d')]; };

  /* ------------------------------------------------------------------ */
  /* Verde                                                               */
  /* ------------------------------------------------------------------ */
  const VERDES = [
    ['#234a2e', '#34703c', '#4f9648', '#7cc05a'],
    ['#284c2c', '#3e7a3e', '#62a348', '#9ccb58'],
    ['#1f4636', '#2f6a4c', '#489262', '#72ba7c'],
    ['#34502a', '#527a32', '#7aa63e', '#aecb52'],
  ];
  // árvore de copa cheia: tronco com galhos e uma copa de muitas bolas (escuro embaixo, claro em cima à esquerda)
  function arvore(seed, r) {
    const h0 = (k) => hash(seed * 37 + k * 11 + 5), tons = VERDES[Math.floor(h0(0) * VERDES.length)];
    const th = Math.round(r * 0.7) + 10, w = Math.round(r * 3.4) + 8, h = th + Math.round(r * 2.1) + 6, [c, g] = mk(w, h), cx = w >> 1, by = h;
    const tw = Math.max(2, Math.round(r / 5));
    R(g, cx - tw, by - th - 6, tw * 2, th + 6, '#46301f'); R(g, cx - tw, by - th - 6, Math.max(1, tw - 1), th + 6, '#6b4a30');
    R(g, cx - tw - 1, by - 2, tw * 2 + 2, 2, '#3a281a');
    for (let i = 0; i < r * 0.5; i++) { R(g, cx - tw - i, by - th - i, 2, 2, '#46301f'); R(g, cx + tw - 1 + i, by - th - 2 - i, 2, 2, '#46301f'); }
    const cy = by - th - Math.round(r * 0.85), bl = [];
    const n = 10 + Math.round(r / 3);
    for (let i = 0; i < n; i++) {
      const a = h0(i + 1) * Math.PI * 2, d = Math.sqrt(h0(i + 40)) * r * 0.85;
      bl.push([Math.round(cx + Math.cos(a) * d * 1.25), Math.round(cy + Math.sin(a) * d * 0.72), Math.max(3, Math.round(r * (0.4 + h0(i + 80) * 0.22)))]);
    }
    bl.push([cx, cy, Math.round(r * 0.75)]);
    for (const [x, y, q] of bl) disc(g, x, y + 2, q, tons[0]);
    for (const [x, y, q] of bl) disc(g, x, y - 1, q - 1, tons[1]);
    for (const [x, y, q] of bl) if (q > 3) disc(g, x - Math.round(q * 0.25), y - Math.round(q * 0.35), Math.round(q * 0.7), tons[2]);
    for (const [x, y, q] of bl) if (q > 5) disc(g, x - Math.round(q * 0.4), y - Math.round(q * 0.55), Math.round(q * 0.3), tons[3]);
    for (let i = 0; i < r * 3; i++) {
      const b = bl[Math.floor(h0(i + 200) * bl.length)], a = h0(i + 300) * Math.PI * 2, d = h0(i + 400) * b[2] * 0.8;
      R(g, Math.round(b[0] + Math.cos(a) * d - b[2] * 0.2), Math.round(b[1] + Math.sin(a) * d - b[2] * 0.3), 1, 1, h0(i + 500) < 0.55 ? tons[3] : tons[0]);
    }
    return c;
  }
  // k = tamanho das folhas (1 = a de antes; 1,8–2 = palmeira de 6–8 m na escala do carro)
  function palmeira(seed, th, k) {
    k = k || 1;
    const h0 = (q) => hash(seed * 29 + q * 7 + 1), w = Math.round(46 * k), h = th + Math.round(20 * k), [c, g] = mk(w, h), cx = w >> 1, by = h, tk = k > 1.4 ? 4 : 3;
    let tx = cx;
    for (let j = 0; j < th; j++) { tx = cx + Math.round(Math.sin((j / th) * 1.3) * 3 * k); R(g, tx - 1, by - 1 - j, tk, 1, j % 3 ? '#7a6248' : '#5e4a36'); R(g, tx - 1, by - 1 - j, 1, 1, '#9a8060'); }
    const ty = by - th;
    // as folhas: arcos cheios que sobem e caem só na ponta (as de trás mais escuras)
    for (let f = 0; f < Math.round(11 * Math.sqrt(k)); f++) {
      const dir = f % 2 ? 1 : -1, L = Math.round((11 + h0(f) * 8) * k), lift = (3 + (f % 5) * 2.6) * k, col = f < 4 ? '#2f6238' : f < 9 ? '#44883f' : '#66a84a', fh = Math.round(3 * Math.sqrt(k));
      for (let i = 0; i <= L; i++) {
        const u = i / L, x = tx + dir * i, y = Math.round(ty - 2 - Math.sin(u * Math.PI * 0.75) * lift + u * u * u * (5 * k + lift * 0.6));
        R(g, x, y, 1, Math.max(1, Math.round(fh * (1 - u * 0.5))), col);
        R(g, x, y + fh, 1, i % 2 ? 2 : 1, shade(col, -0.18));
        if (k > 1.4 && i % 3 === 1) R(g, x, y + fh + 1, 1, 2, shade(col, -0.1)); // os folíolos pendurados
      }
    }
    disc(g, tx, ty, Math.round(2 * k), '#4a3a22');
    return c;
  }
  function arbusto(seed, w) {
    const h0 = (k) => hash(seed * 19 + k * 5), h = Math.round(w * 0.55) + 3, [c, g] = mk(w + 2, h), tons = VERDES[Math.floor(h0(9) * VERDES.length)];
    const n = Math.max(3, Math.round(w / 5));
    for (let p = 0; p < 3; p++) for (let i = 0; i < n; i++) {
      const x = 3 + Math.round((i + h0(i)) * ((w - 6) / n)), q = 3 + Math.round(h0(i + 30) * (h * 0.35)), y = h - q + 1;
      disc(g, x - (p ? 1 : 0), y - p, Math.max(1, q - p * 1), tons[p]);
    }
    for (let i = 0; i < w; i++) if (h0(i + 60) > 0.75) R(g, 1 + i, h - 2 - Math.round(h0(i + 90) * (h - 4)), 1, 1, h0(i) > 0.5 ? tons[3] : '#ffb36b');
    return c;
  }
  function capim(seed, w) {
    const [c, g] = mk(w, 12);
    for (let i = 0; i < w; i++) { const hh = 3 + Math.round(hash(seed * 13 + i * 3) * 8); R(g, i, 12 - hh, 1, hh, ['#3d6e3a', '#57893f', '#7a9a48', '#2f5a32'][Math.floor(hash(seed + i * 7) * 4)]); }
    return c;
  }
  // a mata ao fundo: uma faixa de copas em silhueta (repete de lado a lado)
  function mata(seed, w, h, tons) {
    const [c, g] = mk(w, h);
    for (let p = 0; p < 2; p++) for (let x = -10; x < w + 10; x += 7) {
      const q = 6 + Math.round(hash(seed * 7 + x * 3 + p) * (h * 0.32)), y = h - q - Math.round(hash(seed + x * 5 + p * 9) * (h * 0.3));
      for (const dx of [0, w, -w]) disc(g, x + dx - p * 2, y + (p ? -2 : 0), q - p * 2, tons[p]);
      if (!p) R(g, x - 4, y, 9, h - y, tons[0]);
    }
    return c;
  }

  /* ------------------------------------------------------------------ */
  /* Casas e comércios                                                   */
  /* ------------------------------------------------------------------ */
  const TELHA = [['#c8643a', '#a84e2c', '#e08a58'], ['#b85a3c', '#94452c', '#d47a56'], ['#8e6a5a', '#74554a', '#a88474'], ['#7d8590', '#666d78', '#9aa3b0']];
  const QUENTE = '#ffd58a';
  function casa(o, cor, seed) {
    const h0 = (k) => hash(seed * 41 + k * 13 + 7);
    const w = o.w, alt = o.alt, nAnd = o.andares || 1, pk = o.pk || (w >= 150 ? 2 : 1); // pk = tamanho da letra da placa
    const tel = o.telhado, roofH = tel === 'laje' ? 3 : tel === 'plat' ? (pk > 1 ? 15 : 8) : tel === 'igreja' ? 20 : Math.min(18, Math.round(w * 0.09) + 6);
    const topo = roofH + (o.caixa ? 11 : 0) + (tel === 'igreja' ? 8 : 0), H = alt + topo, [c, g] = mk(w, H), [lz, q] = mk(w, H);
    const by = H, wt = by - alt, x0 = 3, ww = w - 6, esc = shade(cor, -0.2), cla = shade(cor, 0.14), T3 = TELHA[Math.floor(h0(1) * (o.metal ? 4 : 3))];
    /* caixa-d'água em cima do telhado */
    if (o.caixa) { const kx = x0 + Math.round(ww * (0.2 + h0(2) * 0.5)); R(g, kx + 2, wt - roofH - 4, 2, 6, '#7d8590'); R(g, kx + 8, wt - roofH - 4, 2, 6, '#7d8590'); R(g, kx, wt - roofH - 11, 12, 8, '#3f7fbf'); R(g, kx, wt - roofH - 11, 12, 2, '#6aa6dc'); R(g, kx, wt - roofH - 4, 12, 1, '#2c5f94'); }
    /* telhado */
    if (tel === 'duas') {
      for (let j = 0; j < roofH; j++) { const ins = Math.round((roofH - 1 - j) * 1.5); R(g, ins, wt - roofH + j, w - ins * 2, 1, j === 0 ? T3[2] : j % 2 ? T3[0] : T3[1]); }
      for (let i = 4; i < w - 4; i += 4) R(g, i, wt - 3, 1, 3, T3[1]);
      R(g, 0, wt - 1, w, 1, shade(T3[1], -0.25));
    } else if (tel === 'laje') { R(g, 1, wt - 3, w - 2, 3, '#b9b4ad'); R(g, 1, wt - 3, w - 2, 1, '#d9d4cc'); }
    else if (tel === 'plat') { R(g, x0 - 1, wt - roofH, ww + 2, roofH, cla); R(g, x0 - 2, wt - roofH, ww + 4, 2, shade(cor, 0.3)); R(g, x0 - 1, wt - 1, ww + 2, 1, esc); }
    else if (tel === 'igreja') {
      for (let j = 0; j < roofH; j++) { const ins = Math.round(((roofH - 1 - j) / roofH) * (w / 2 - 4)); R(g, ins, wt - roofH + j, w - ins * 2, 1, j < 1 ? cla : cor); R(g, ins, wt - roofH + j, 2, 1, T3[0]); R(g, w - ins - 2, wt - roofH + j, 2, 1, T3[0]); }
      R(g, (w >> 1) - 1, wt - roofH - 8, 2, 9, '#f4f6fa'); R(g, (w >> 1) - 3, wt - roofH - 5, 6, 2, '#f4f6fa');
      disc(g, w >> 1, wt - 8, 4, '#3a2f4a'); disc(q, w >> 1, wt - 8, 3, '#ffcf7a'); R(g, (w >> 1), wt - 12, 1, 9, esc); R(g, (w >> 1) - 4, wt - 8, 9, 1, esc);
    }
    /* parede */
    R(g, x0, wt, ww, alt, cor);
    R(g, x0, wt, ww, 2, esc);                         // sombra do beiral
    R(g, x0, by - 4, ww, 4, o.rodape || shade(cor, -0.32));
    R(g, x0, wt, 1, alt, cla);
    for (let i = 0; i < ww * alt * 0.012; i++) R(g, x0 + 2 + Math.floor(h0(i + 100) * (ww - 4)), wt + 3 + Math.floor(h0(i + 150) * (alt - 9)), 2, 1, h0(i) > 0.5 ? cla : esc); // manchas do reboco
    for (let f = 2; f <= nAnd; f++) { R(g, x0, by - 34 * (f - 1), ww, 1, esc); R(g, x0, by - 35 * (f - 1) + (f - 2), ww, 1, cla); } // a laje de cada andar
    /* aberturas: [tipo, x, largura ou andar] */
    const lit = (k) => h0(k + 300) > 0.4;
    (o.ab || []).forEach((a, k) => {
      const tipo = a[0], x = a[1], andar = tipo === 'j' || tipo === 'J' ? a[2] || 1 : 1, y0 = by - 34 * (andar - 1);
      if (tipo === 'p' || tipo === 'P') {            // porta de madeira (P = porta dupla em arco)
        const pw = tipo === 'P' ? 15 : 11, ph = tipo === 'P' ? 27 : 24, pc = ['#6b4a30', '#4a5a7a', '#7a3a2e', '#3f6a52'][Math.floor(h0(k + 20) * 4)];
        R(g, x - 1, y0 - ph - 1, pw + 2, ph + 1, shade(cor, 0.3)); R(g, x, y0 - ph, pw, ph, pc); R(g, x + 1, y0 - ph + 2, pw - 2, 8, shade(pc, 0.15)); R(g, x + 1, y0 - 12, pw - 2, 9, shade(pc, -0.15));
        if (tipo === 'P') R(g, x + 7, y0 - ph, 1, ph, shade(pc, -0.3));
        R(g, x + pw - 3, y0 - 12, 1, 2, '#e8c15a'); R(g, x - 2, y0 - 1, pw + 4, 1, '#b9b4ad');
      } else if (tipo === 'j' || tipo === 'J') {     // janela com moldura, vidro em 4 e (às vezes) grade
        const jw = tipo === 'J' ? 19 : 13, jh = 12, y = y0 - 23;
        R(g, x - 1, y - 1, jw + 2, jh + 2, shade(cor, 0.32)); R(g, x, y, jw, jh, '#33465c'); R(g, x, y, jw, 3, '#4f6a86');
        R(g, x + (jw >> 1), y, 1, jh, '#e9ecef'); R(g, x, y + 5, jw, 1, '#e9ecef'); R(g, x - 2, y + jh + 1, jw + 4, 1, '#b9b4ad');
        if (lit(k)) { q.fillStyle = QUENTE; q.fillRect(x, y, jw, jh); R(q, x + (jw >> 1), y, 1, jh, '#7a5a30'); R(q, x, y + 5, jw, 1, '#7a5a30'); if (h0(k + 70) > 0.5) R(q, x + 1, y, jw >> 1, jh, '#f6b86a'); }
        if (o.grade) for (let i = 1; i < jw; i += 2) R(g, x + i, y, 1, jh, 'rgba(20,24,30,0.55)');
        if (andar >= 2 && o.sacada) { R(g, x - 3, y0 - 9, jw + 6, 1, '#2a2f38'); for (let i = -3; i <= jw + 2; i += 2) R(g, x + i, y0 - 9, 1, 7, '#2a2f38'); R(g, x - 4, y0 - 2, jw + 8, 2, '#b9b4ad'); }
      } else if (tipo === 'v') {                     // vitrine
        const vw = a[2], vh = 18, y = y0 - 23;
        R(g, x - 1, y - 1, vw + 2, vh + 2, '#2a2f38'); R(g, x, y, vw, vh, '#3a4a5c'); R(g, x, y, vw, 4, '#55708a');
        for (let i = 0; i < vw - 5; i += 7) { R(g, x + 2 + i, y + 9, 4, 7, ['#c8262e', '#e8c15a', '#3c8a4a', '#c4b5fd'][(i + k) % 4]); R(g, x + 3 + i, y + 6, 2, 3, '#e9c9a8'); }
        R(g, x + (vw >> 1), y, 1, vh, '#2a2f38');
        q.fillStyle = '#ffe2a8'; q.fillRect(x, y, vw, vh);
        for (let i = 0; i < vw - 5; i += 7) { R(q, x + 2 + i, y + 9, 4, 7, ['#c8262e', '#e8a13a', '#3c8a4a', '#9a7ae0'][(i + k) % 4]); R(q, x + 3 + i, y + 6, 2, 3, '#c98e66'); }
        R(q, x + (vw >> 1), y, 1, vh, '#5a4030');
      } else if (tipo === 'pv') {                    // porta de vidro
        R(g, x - 1, y0 - 25, 15, 25, '#2a2f38'); R(g, x, y0 - 24, 13, 24, '#3f5266'); R(g, x, y0 - 24, 13, 4, '#5f7c96'); R(g, x + 6, y0 - 24, 1, 24, '#2a2f38'); R(g, x + 4, y0 - 12, 1, 4, '#e9ecef'); R(g, x + 8, y0 - 12, 1, 4, '#e9ecef');
        q.fillStyle = '#ffe2a8'; q.fillRect(x, y0 - 24, 13, 23); R(q, x + 6, y0 - 24, 1, 24, '#5a4030');
      } else if (tipo === 'g') {                     // portão de garagem de ferro
        const gc = ['#5d6573', '#3f5a48', '#6b4a30', '#e9ecef'][Math.floor(h0(k + 50) * 4)];
        R(g, x - 1, y0 - 23, 28, 23, shade(cor, 0.3)); R(g, x, y0 - 22, 26, 22, gc);
        for (let i = 0; i < 26; i += 3) R(g, x + i, y0 - 22, 1, 22, shade(gc, -0.3));
        R(g, x, y0 - 12, 26, 1, shade(gc, -0.4)); R(g, x + 12, y0 - 22, 2, 22, shade(gc, -0.4));
      } else if (tipo === 'r') {                     // porta de enrolar (a[2] = aberta)
        R(g, x - 1, y0 - 27, 26, 27, '#2a2f38');
        if (a[2]) { R(g, x, y0 - 26, 24, 26, '#1c2028'); R(g, x, y0 - 26, 24, 5, '#9aa3b0'); R(g, x + 3, y0 - 9, 9, 9, '#3a3f4a'); disc(g, x + 17, y0 - 5, 4, '#121418'); disc(g, x + 17, y0 - 5, 2, '#3a3f4a'); q.fillStyle = '#e8d2a0'; q.fillRect(x, y0 - 21, 24, 12); }
        else { R(g, x, y0 - 26, 24, 26, '#9aa3b0'); for (let j = 0; j < 26; j += 2) R(g, x, y0 - 26 + j, 24, 1, '#7d8590'); }
      }
    });
    /* varanda (alpendre): telhadinho, pilares e mureta */
    if (o.varanda) { const vx = o.varanda[0], vw = o.varanda[1]; R(g, vx - 2, by - 29, vw + 4, 3, T3[0]); R(g, vx - 2, by - 29, vw + 4, 1, T3[2]); for (const px of [vx, vx + vw - 2]) R(g, px, by - 26, 2, 26, '#eef0f3'); R(g, vx, by - 8, vw, 1, '#eef0f3'); for (let i = 2; i < vw; i += 3) R(g, vx + i, by - 8, 1, 6, '#eef0f3'); }
    /* placa do comércio (na platibanda ou acima do toldo) */
    if (o.placa) {
      const pc = o.placaCor || ['#c8262e', '#1f3f8a', '#2f7a4a', '#7a3ab0', '#e86a2a'][Math.floor(h0(5) * 5)], tw = textW(o.placa, pk), bh = 5 * pk + 3, bw = Math.min(ww - 4, tw + 6 + pk * 4), bx = x0 + ((ww - bw) >> 1) + (o.cruz ? 6 : 0), byp = tel === 'plat' ? wt - roofH + 1 : wt + 3;
      R(g, bx, byp, bw, bh, pc); R(g, bx, byp, bw, 1, shade(pc, 0.3)); R(g, bx, byp + bh - 1, bw, 1, shade(pc, -0.3)); text(g, o.placa, bx + ((bw - tw) >> 1), byp + 2, pk, '#f4f6fa');
      R(q, bx, byp, bw, bh, shade(pc, 0.2)); text(q, o.placa, bx + ((bw - tw) >> 1), byp + 2, pk, '#ffffff');
      if (o.cruz) { const s = pk, cx = bx - 6 * s - 3; R(g, cx, byp, 6 * s + 2, 6 * s + 2, '#f4f6fa'); R(g, cx + 2 * s + 1, byp + 1, 2 * s, 6 * s, '#2f9a4a'); R(g, cx + 1, byp + 2 * s + 1, 6 * s, 2 * s, '#2f9a4a'); R(q, cx + 2 * s + 1, byp + 1, 2 * s, 6 * s, '#5fff8a'); R(q, cx + 1, byp + 2 * s + 1, 6 * s, 2 * s, '#5fff8a'); }
    }
    /* toldo listrado, com a barra em bico */
    if (o.toldo) {
      const tx = o.toldo[0], tw = o.toldo[1], tc = o.toldoCor || ['#c8262e', '#2f7a4a', '#1f3f8a', '#e86a2a', '#7a3ab0'][Math.floor(h0(6) * 5)], ty = by - 31;
      for (let i = 0; i < tw; i++) { const cc = Math.floor(i / 4) % 2 ? '#f4f0e6' : tc; R(g, tx + i, ty, 1, 5, cc); R(g, tx + i, ty + 5, 1, 1 + (i % 4 === 1 || i % 4 === 2 ? 1 : 0), shade(cc, -0.12)); }
      R(g, tx, ty, tw, 1, shade(tc, 0.35)); R(g, tx, ty + 7, tw, 1, 'rgba(0,0,0,0.25)');
    }
    /* enfeites */
    if (o.ar) { R(g, o.ar, wt + 5, 9, 6, '#e9ecef'); R(g, o.ar, wt + 9, 9, 2, '#b4bac2'); R(g, o.ar + 2, wt + 6, 5, 2, '#9aa3b0'); }
    if (o.pneus) { for (const px of [x0 + ww - 12, x0 + ww - 7]) { disc(g, px, by - 4, 4, '#121418'); disc(g, px, by - 4, 2, '#3a3f4a'); } disc(g, x0 + ww - 10, by - 10, 4, '#121418'); disc(g, x0 + ww - 10, by - 10, 2, '#3a3f4a'); }
    if (o.mesas) for (const mx of o.mesas) { R(g, mx, by - 9, 9, 1, '#e9ecef'); R(g, mx + 4, by - 8, 1, 8, '#7d8590'); R(g, mx - 3, by - 6, 3, 6, '#c8262e'); R(g, mx + 9, by - 6, 3, 6, '#c8262e'); }
    if (o.poste) { for (let j = 0; j < 12; j++) R(g, o.poste, by - 26 + j, 3, 1, ['#c8262e', '#f4f6fa', '#1f3f8a'][j % 3]); R(g, o.poste - 1, by - 27, 5, 1, '#9aa3b0'); R(g, o.poste - 1, by - 14, 5, 1, '#9aa3b0'); }
    if (o.vasos) for (const vx of o.vasos) { R(g, vx, by - 5, 5, 5, '#a8564a'); disc(g, vx + 2, by - 8, 3, '#3c7a46'); R(g, vx + 1, by - 10, 1, 1, '#ff9a52'); }
    /* muro da frente: 'grade' (mureta + grade), 'baixo' (mureta), 'alto' (muro cego com portão) */
    if (o.muro) {
      const mc = o.muroCor || shade(cor, -0.08), gx = o.portao == null ? Math.round(w * 0.42) : o.portao, gw = o.portaoW || 14;
      if (o.muro === 'alto') {
        R(g, 0, by - 20, w, 20, mc); R(g, 0, by - 20, w, 2, shade(mc, 0.2)); R(g, 0, by - 3, w, 3, shade(mc, -0.25));
        for (let i = 9; i < w; i += 19) R(g, i, by - 18, 1, 15, shade(mc, -0.1));
        R(g, gx, by - 19, gw + 6, 19, '#4a4f5a'); for (let i = 1; i < gw + 6; i += 2) R(g, gx + i, by - 19, 1, 19, '#33373f'); R(g, gx, by - 19, gw + 6, 1, '#6d7581');
        for (let i = 2; i < w - 2; i += 3) if (i < gx || i > gx + gw + 6) R(g, i, by - 22, 1, 2, '#9aa3b0'); // lanças em cima do muro
      } else {
        R(g, 0, by - 8, w, 8, mc); R(g, 0, by - 8, w, 1, shade(mc, 0.25)); R(g, 0, by - 2, w, 2, shade(mc, -0.25));
        if (o.muro === 'grade') { for (let i = 1; i < w; i += 2) R(g, i, by - 17, 1, 9, '#2a2f38'); R(g, 0, by - 17, w, 1, '#2a2f38'); R(g, 0, by - 12, w, 1, '#2a2f38'); for (let i = 0; i < w; i += 16) R(g, i, by - 19, 2, 19, mc); }
        g.clearRect(gx, by - 19, gw, 19);
        R(g, gx, by - 16, gw, 16, 'rgba(30,34,42,0.35)'); for (let i = 0; i < gw; i += 2) R(g, gx + i, by - 16, 1, 16, '#3a3f4a'); R(g, gx, by - 16, gw, 1, '#3a3f4a'); R(g, gx, by - 8, gw, 1, '#3a3f4a');
      }
    }
    return { c, luz: lz, w, h: H };
  }
  /* ------------------------------------------------------------------ */
  /* Escala da viagem: o CARRO é a régua                                  */
  /*   carro de lado = 52 px (4,5 m) → 1 m ≈ 11,5 px; altura do carro ≈ 17–22 px (1,5 m)          */
  /*   casa térrea: ~55 px até o telhado (2–2,5 carros), 150–240 px de largura (3–5 carros)       */
  /*   comércio de 2–3 andares: 80–120 px · SkyFit: 540 × 92 · árvore de rua: 70–125 px de altura  */
  /*   poste: ~105 px · pessoa: ~20 px (o boneco é desenhado a 0,68)                                */
  /* ------------------------------------------------------------------ */
  const ARV = {};
  // bola de pixels num caminho só (bem mais rápido que um fillRect por linha)
  function discP(g, cx, cy, r, col) {
    g.beginPath();
    for (let dy = -r; dy <= r; dy++) { const w = Math.round(Math.sqrt(r * r - dy * dy)); g.rect(cx - w, cy + dy, 2 * w + 1, 1); }
    g.fillStyle = col; g.fill();
  }
  // ÁRVORE GRANDE: H = altura total (px). Tronco visível com casca e galhos; copa larga feita de muitos
  // tufos em 3 camadas (cada tufo: sombra embaixo, folha, luz em cima à esquerda) e folhinhas soltas.
  // c.sombra = o raio da sombra no chão (a cena desenha a sombra embaixo).
  function arvoreG(seed, H) {
    const key = seed + ':' + H;
    if (ARV[key]) return ARV[key];
    const h0 = (k) => hash(seed * 53 + k * 17 + 3), tons = VERDES[Math.floor(h0(0) * VERDES.length)];
    const CW = Math.round(H * (1.05 + h0(1) * 0.3)), w = CW + 8, hh = H + 3, [c, g] = mk(w, hh), cx = w >> 1, by = hh - 1;
    const th = Math.round(H * (0.4 + h0(2) * 0.08)), tw = Math.max(2, Math.round(H / 26));
    const copaT = by - H + 2, copaB = by - th, CH = copaB - copaT, ccy = (copaT + copaB) / 2, rx = CW / 2 - H * 0.2, ry = Math.max(4, CH / 2 - H * 0.16);
    // o tronco (mais largo embaixo, raízes abrindo) com riscos de casca
    for (let y = Math.round(ccy); y < by; y++) {
      const u = (by - y) / H, lw = tw + (by - y < 2 ? 3 : by - y < 4 ? 1 : 0) - Math.round(u * tw * 0.35);
      R(g, cx - lw, y, lw * 2 + 1, 1, '#4a3322'); R(g, cx - lw, y, Math.max(1, Math.round(lw * 0.7)), 1, '#6e4c33');
      if (hash(seed + y * 3) > 0.68) R(g, cx - lw + 1 + Math.floor(hash(y * 7 + seed) * lw * 2), y, 1, 2, '#33231a');
    }
    // galhos principais subindo para dentro da copa
    for (let i = 0, n = 3 + Math.floor(h0(3) * 3); i < n; i++) {
      const dir = i % 2 ? 1 : -1, y0 = copaB + 2 - i * 3, len = rx * (0.5 + h0(i + 10) * 0.45), sub = CH * (0.3 + h0(i + 20) * 0.35);
      for (let s = 0; s <= len; s++) { const u = s / len; R(g, Math.round(cx + dir * s), Math.round(y0 - u * sub * (0.6 + 0.4 * u)), 2, Math.max(1, Math.round(tw * (1 - u) + 1)), '#4a3322'); }
    }
    // os tufos, de trás (camada 0, escura) para a frente (camada 2, clara)
    const tufos = [], n = Math.round(16 + H / 4);
    for (let i = 0; i < n; i++) {
      const a = h0(i + 30) * Math.PI * 2, d = Math.sqrt(h0(i + 60)), x = cx + Math.cos(a) * d * rx, y = ccy + Math.sin(a) * d * ry;
      const q = Math.round(H * (0.1 + h0(i + 90) * 0.08) * (1.12 - 0.35 * (ccy - y) / Math.max(1, ry)));
      tufos.push([Math.round(x), Math.round(y), Math.max(4, q), Math.floor(h0(i + 120) * 3)]);
    }
    tufos.push([cx, Math.round(ccy - ry * 0.3), Math.round(H * 0.2), 1]);
    tufos.sort((A, B) => A[3] - B[3] || B[1] - A[1]);
    const t0e = shade(tons[0], -0.18), t1c = shade(tons[1], 0.06);
    for (const [x, y, q, k] of tufos) {
      discP(g, x, y + 2, q, k === 0 ? t0e : tons[0]);
      discP(g, x, y, q - 1, k === 0 ? tons[0] : tons[1]);
      discP(g, x - Math.round(q * 0.22), y - Math.round(q * 0.3), Math.round(q * 0.62), k === 2 ? tons[2] : k === 1 ? t1c : tons[1]);
      if (k > 0) discP(g, x - Math.round(q * 0.38), y - Math.round(q * 0.5), Math.max(1, Math.round(q * 0.28)), k === 2 ? tons[3] : tons[2]);
    }
    // folhinhas soltas (a textura das folhas), em 3 caminhos (um por cor)
    const fol = [[], [], []];
    for (let i = 0; i < H * 7; i++) {
      const t = tufos[Math.floor(h0(i + 300) * tufos.length)], a = h0(i + 400) * Math.PI * 2, d = h0(i + 500) * (t[2] + 1);
      fol[h0(i + 600) < 0.45 ? 0 : h0(i + 700) < 0.6 ? 1 : 2].push([Math.round(t[0] + Math.cos(a) * d), Math.round(t[1] + Math.sin(a) * d), i % 3 ? 1 : 2]);
    }
    fol.forEach((lista, j) => { g.beginPath(); for (const [x, y, w2] of lista) g.rect(x, y, w2, 1); g.fillStyle = [tons[0], tons[2], tons[3]][j]; g.fill(); });
    // vãos na copa onde aparece um galho
    for (let i = 0; i < 3; i++) { const t = tufos[Math.floor(h0(i + 800) * (tufos.length - 1))]; R(g, t[0] - 3, t[1] + 1, 6, 3, shade(tons[0], -0.4)); R(g, t[0] - 3, t[1] + 2, 6, 1, '#4a3322'); }
    c.sombra = Math.round(CW * 0.42);
    return (ARV[key] = c);
  }

  /* ------------------------------------------------------------------ */
  /* Casas e comércios em escala (modelos)                               */
  /* ------------------------------------------------------------------ */
  const LARG = { p: 11, P: 15, j: 13, J: 19, pv: 13, g: 26, r: 24 };
  // espalha as aberturas por igual na largura; um item é 'p' ou ['v', largura] ou ['r', 24, aberta]
  function espalha(w, lista, andar) {
    const ws = lista.map((a) => (Array.isArray(a) ? (a[0] === 'v' ? a[1] : LARG[a[0]]) : LARG[a])), tot = ws.reduce((s, v) => s + v, 0), gap = (w - 6 - tot) / (lista.length + 1);
    let x = 3 + gap;
    return lista.map((a, i) => { const t = Array.isArray(a) ? a[0] : a, r = t === 'v' ? ['v', Math.round(x), ws[i]] : t === 'r' ? ['r', Math.round(x), a[2]] : [t, Math.round(x), andar || 1]; x += ws[i] + gap; return r; });
  }
  // completa um modelo: as aberturas de cada andar e o que depende delas (portão, varanda, toldo...)
  function modelo(o) {
    if (o.fn) return o;
    const ab = espalha(o.w, o.terreo || []);
    for (const k in o.cima || {}) ab.push(...espalha(o.w, o.cima[k], +k));
    o.ab = ab;
    const gar = ab.find((a) => a[0] === 'g'), porta = ab.find((a) => a[0] === 'p' || a[0] === 'P' || a[0] === 'pv');
    if (o.muro && o.portao == null) { if (gar) { o.portao = gar[1] - 1; o.portaoW = 28; } else if (porta) o.portao = porta[1] - 2; }
    if (o.varanda === 1 && porta) o.varanda = [Math.max(4, porta[1] - 16), 44];
    if (o.toldo === 1) o.toldo = [5, o.w - 10];
    if (o.mesas === 1) o.mesas = [o.w - 26];
    if (o.poste === 1) o.poste = o.w - 14;
    if (o.ar === 1) o.ar = Math.round(o.w * 0.62);
    if (o.vasos === 1) o.vasos = porta ? [porta[1] - 9, porta[1] + LARG[porta[0]] + 4] : [8];
    return o;
  }

  // POSTO DE COMBUSTÍVEL: cobertura com o nome em cima de 2 pilares, bombas, totem de preços e a conveniência
  function posto(seed) {
    const W = 300, H = 96, [c, g] = mk(W, H), [lz, q] = mk(W, H), by = H, verde = '#1f7a4a', amar = '#f2c14e';
    const lx = 200, lw = W - lx - 2, lh = 46;                       // conveniência, no fundo
    R(g, lx, by - lh, lw, lh, '#eef0f2'); R(g, lx, by - lh, lw, 9, verde); R(g, lx, by - lh + 9, lw, 2, amar);
    const nc = 'CONVENIENCIA', ncx = lx + ((lw - textW(nc, 1)) >> 1);
    text(g, nc, ncx, by - lh + 2, 1, '#ffffff'); R(q, lx, by - lh, lw, 9, '#2fa86a'); text(q, nc, ncx, by - lh + 2, 1, '#ffffff');
    R(g, lx + 6, by - 30, 58, 22, '#33465c'); R(g, lx + 6, by - 30, 58, 3, '#4f6a86'); R(g, lx + 35, by - 30, 1, 22, '#e9ecef');
    q.fillStyle = '#fff2c8'; q.fillRect(lx + 6, by - 30, 58, 22);
    for (let i = 0; i < 6; i++) { R(q, lx + 9 + i * 9, by - 22, 6, 1, '#b08050'); R(q, lx + 9 + i * 9, by - 15, 6, 1, '#b08050'); R(q, lx + 10 + i * 9, by - 21, 3, 5, ['#c8262e', '#3c8a4a', '#1f3f8a'][i % 3]); }
    R(g, lx + 72, by - 26, 15, 26, '#2a2f38'); R(g, lx + 73, by - 25, 13, 25, '#3f5266'); q.fillStyle = '#ffe2a8'; q.fillRect(lx + 73, by - 25, 13, 24);
    // totem de preços
    R(g, 16, 30, 3, by - 30, '#7d8590'); R(g, 4, 4, 28, 46, verde); R(g, 4, 4, 28, 9, amar);
    text(g, 'POSTO', 8, 6, 1, verde); R(q, 4, 4, 28, 9, '#ffd84a'); text(q, 'POSTO', 8, 6, 1, verde);
    [['G', '5,89'], ['E', '4,19'], ['D', '6,29']].forEach(([l, v], i) => {
      const y = 16 + i * 11;
      for (const [G2, cor] of [[g, '#e8c15a'], [q, '#ffe14a']]) { R(G2, 6, y, 24, 9, '#14181c'); text(G2, l, 8, y + 2, 1, '#ffffff'); text(G2, v, 14, y + 2, 1, cor); }
    });
    // a cobertura
    const cx0 = 44, cx1 = 236, cy = 20, chh = 18, nome = 'POSTO CARAJAS', tw = textW(nome, 2);
    R(g, cx0, cy, cx1 - cx0, chh, '#f4f6fa'); R(g, cx0, cy, cx1 - cx0, 3, amar); R(g, cx0, cy + chh - 4, cx1 - cx0, 4, verde); R(g, cx0, cy + chh, cx1 - cx0, 2, '#9aa3b0');
    text(g, nome, cx0 + ((cx1 - cx0 - tw) >> 1), cy + 4, 2, verde);
    R(q, cx0, cy + 3, cx1 - cx0, chh - 7, '#ffffff'); text(q, nome, cx0 + ((cx1 - cx0 - tw) >> 1), cy + 4, 2, '#1f9a5a');
    for (let i = cx0 + 8; i < cx1 - 8; i += 24) R(q, i, cy + chh, 12, 2, '#fffbe8');    // as luminárias embaixo
    for (const px of [cx0 + 46, cx1 - 56]) {
      R(g, px, cy + chh + 2, 6, by - cy - chh - 2, '#e9ecef'); R(g, px, cy + chh + 2, 1, by - cy - chh - 2, '#ffffff'); R(g, px, by - 10, 6, 10, verde);
      // bomba ao lado do pilar, com o visor e a mangueira
      const bx = px + 12;
      R(g, bx, by - 26, 13, 26, '#e9ecef'); R(g, bx, by - 26, 13, 3, verde); R(g, bx + 2, by - 21, 9, 5, '#1c2026'); R(g, bx + 1, by - 3, 11, 3, '#9aa3b0');
      R(q, bx + 2, by - 21, 9, 5, '#7dffa8'); R(g, bx + 13, by - 18, 2, 1, '#2a2f38'); R(g, bx + 15, by - 18, 1, 9, '#2a2f38'); R(g, bx + 13, by - 10, 3, 2, '#3a3f4a');
    }
    R(g, 0, by - 3, W, 3, '#b9b4ad'); R(g, 70, by - 3, 18, 1, '#8e8a84'); R(g, 150, by - 2, 12, 1, '#8e8a84');
    return { c, luz: lz, w: W, h: H, brilhos: [[-10, -66, 80, [255, 250, 225, 0.2]], [-10, -4, 80, [255, 245, 215, 0.22], 1]] };
  }
  // LAVA-JATO: placa azul, box coberto com um carro cheio de espuma, escritório
  function lavajato(seed) {
    const W = 204, H = 66, [c, g] = mk(W, H), [lz, q] = mk(W, H), by = H, azul = '#1f5aa8';
    R(g, 4, 16, W - 8, by - 16, '#dfe4ea'); R(g, 4, by - 14, W - 8, 14, azul); R(g, 4, by - 14, W - 8, 1, '#4a86d0');
    R(g, 150, 22, 50, by - 22, '#eef0f3'); R(g, 150, 22, 50, 2, '#c9ced5');
    R(g, 157, by - 25, 13, 25, '#2a2f38'); R(g, 158, by - 24, 11, 24, '#3f5266'); R(g, 177, by - 36, 17, 12, '#33465c'); R(g, 185, by - 36, 1, 12, '#e9ecef');
    q.fillStyle = '#ffe2a8'; q.fillRect(158, by - 24, 11, 23); q.fillRect(177, by - 36, 17, 12);
    const nome = 'LAVA JATO', tw = textW(nome, 2);
    R(g, 14, 0, tw + 22, 15, azul); R(g, 14, 0, tw + 22, 1, '#4a86d0'); text(g, nome, 25, 3, 2, '#ffffff'); disc(g, 19, 7, 2, '#7fd0ff');
    R(q, 14, 0, tw + 22, 15, '#2f7ad8'); text(q, nome, 25, 3, 2, '#ffffff'); disc(q, 19, 7, 2, '#bfe8ff');
    R(g, 6, 18, 142, 4, '#9aa3b0'); R(g, 6, 18, 142, 1, '#c8ccd2'); R(g, 10, 22, 132, by - 25, '#3a4250');
    for (const px of [7, 142]) R(g, px, 22, 3, by - 22, '#7d8590');
    g.drawImage(carro(['#c8262e', '#e9ecef', '#2a2f38', '#3c6aa5'][Math.floor(hash(seed) * 4)]).r, 46, by - 25);
    for (let i = 0; i < 40; i++) disc(g, 50 + Math.floor(hash(seed + i * 3) * 48), by - 8 - Math.floor(hash(seed + i * 7) * 9), 1 + Math.floor(hash(i) * 2), i % 3 ? '#f4f6fa' : '#d0e8f6');
    R(g, 110, by - 18, 1, 14, '#2a5aa0'); for (let i = 0; i < 9; i++) R(g, 108 - i * 2, by - 18 - Math.round(Math.sin(i / 3) * 3), 1, 1, '#bfe8ff');
    R(g, 20, by - 2, 110, 2, '#5f7c96');
    for (const lx of [30, 92]) R(q, lx, 22, 22, 1, '#eaf6ff');
    return { c, luz: lz, w: W, h: H };
  }
  // GALPÃO de metal com telhado baixo de duas águas, placa e portas de enrolar (uma aberta, com material)
  function galpao(seed) {
    const W = 262, H = 78, [c, g] = mk(W, H), [lz, q] = mk(W, H), by = H;
    const cc = [['#8d95a2', '#737b88', '#a2aab6'], ['#6a8aa0', '#557386', '#86a4ba'], ['#a08a6a', '#86704f', '#baa486']][Math.floor(hash(seed) * 3)];
    for (let j = 0; j < 12; j++) { const ins = Math.round((11 - j) * 10.8); R(g, ins + 2, j, W - 4 - ins * 2, 1, j % 2 ? '#b9c1cc' : '#9aa3b0'); }
    for (let i = 2; i < W - 2; i++) R(g, i, 12, 1, by - 12, i % 4 === 0 ? cc[2] : i % 4 === 2 ? cc[1] : cc[0]);
    R(g, 2, 12, W - 4, 2, '#5d6573');
    const nome = ['MATERIAIS', 'DEPOSITO', 'MADEIREIRA'][Math.floor(hash(seed * 3 + 1) * 3)], tw = textW(nome, 2), px = (W - tw - 12) >> 1, pc = ['#c8262e', '#1f3f8a', '#2f7a4a'][Math.floor(hash(seed * 5) * 3)];
    R(g, px, 18, tw + 12, 14, pc); R(g, px, 18, tw + 12, 1, shade(pc, 0.3)); text(g, nome, px + 6, 20, 2, '#ffffff'); R(q, px, 18, tw + 12, 14, shade(pc, 0.2)); text(q, nome, px + 6, 20, 2, '#ffffff');
    [[24, true], [158, false]].forEach(([dx, aberta]) => {
      const dw = 80, dh = 42;
      R(g, dx - 2, by - dh - 2, dw + 4, dh + 2, '#4a4f5a');
      if (aberta) {
        R(g, dx, by - dh, dw, dh, '#1c2028'); R(g, dx, by - dh, dw, 5, '#9aa3b0');
        for (let i = 0; i < 5; i++) { const sx = dx + 6 + i * 15, sh = 8 + Math.floor(hash(seed + i) * 12); R(g, sx, by - sh, 12, sh, i % 2 ? '#b08a5a' : '#c9c2b5'); for (let j = by - sh + 3; j < by; j += 4) R(g, sx, j, 12, 1, 'rgba(0,0,0,0.2)'); }
        q.fillStyle = '#e8d2a0'; q.fillRect(dx + 1, by - dh + 5, dw - 2, 10); R(q, dx + 30, by - dh + 5, 20, 1, '#fff6dc');
      } else { R(g, dx, by - dh, dw, dh, '#9aa3b0'); for (let j = 0; j < dh; j += 2) R(g, dx, by - dh + j, dw, 1, '#7d8590'); }
    });
    R(g, 120, by - 24, 13, 24, '#5d6573'); R(g, 136, by - 30, 13, 10, '#33465c'); R(q, 136, by - 30, 13, 10, '#ffd58a');
    R(g, 0, by - 3, W, 3, '#9aa3b0');
    return { c, luz: lz, w: W, h: H };
  }
  // TERRENO com uma casinha lá atrás: mato, varal com roupa, cerca de arame e a placa VENDE-SE
  function terreno(seed, cor) {
    const W = 222, H = 66, [c, g] = mk(W, H), [lz, q] = mk(W, H), by = H;
    const cs = casa(modelo({ w: 86, alt: 32, telhado: 'duas', terreo: ['p', 'j'] }), cor, seed + 3);
    g.drawImage(cs.c, 122, by - 7 - cs.h); q.drawImage(cs.luz, 122, by - 7 - cs.h);
    R(g, 44, by - 34, 1, 26, '#6b4a30'); R(g, 106, by - 34, 1, 26, '#6b4a30'); R(g, 44, by - 34, 63, 1, '#9aa3b0');
    for (let i = 0; i < 6; i++) R(g, 50 + i * 9, by - 33, 6, 5 + (i % 2) * 3, ['#c8262e', '#f2c14e', '#3c6aa5', '#f4f6fa', '#3c8a4a', '#e86a5a'][i]);
    for (let i = 0; i < W; i++) { const hh = 3 + Math.round(hash(seed * 13 + i * 3) * 10); R(g, i, by - 3 - hh, 1, hh, ['#3d6e3a', '#57893f', '#7a9a48', '#2f5a32'][Math.floor(hash(seed + i * 7) * 4)]); }
    R(g, 0, by - 3, W, 3, '#8a6a4a');
    for (let x = 2; x < W; x += 18) R(g, x, by - 17, 2, 17, '#7a5a3a');
    R(g, 0, by - 14, W, 1, '#5d6573'); R(g, 0, by - 9, W, 1, '#5d6573');
    R(g, 14, by - 34, 2, 26, '#5d6573'); R(g, 4, by - 44, 32, 14, '#f4f0e6'); R(g, 4, by - 44, 32, 1, '#9aa3b0'); text(g, 'VENDE', 6, by - 42, 1, '#c8262e'); text(g, 'SE', 26, by - 42, 1, '#c8262e'); R(g, 6, by - 35, 24, 1, '#2a2f38');
    return { c, luz: lz, w: W, h: H };
  }

  // os modelos da viagem (cada um muda de cor e, sem letreiro, pode ser espelhado)
  const MODELOS = [
    { w: 176, alt: 38, telhado: 'duas', caixa: 1, grade: 1, muro: 'grade', terreo: ['g', 'p', 'j', 'J'], vasos: 1 },                 // 0 casa com garagem
    { w: 204, alt: 44, telhado: 'plat', placa: 'MERCADINHO', placaCor: '#c8262e', toldo: 1, toldoCor: '#c8262e', terreo: [['v', 66], 'pv', ['v', 66]] }, // 1
    { w: 212, alt: 38, telhado: 'duas', varanda: 1, muro: 'baixo', terreo: ['j', 'p', 'J', 'j'] },                                     // 2 casa com varanda
    { fn: posto, w: 300 },                                                                                                             // 3
    { w: 172, alt: 72, andares: 2, telhado: 'duas', sacada: 1, ar: 1, terreo: ['g', 'p', 'j'], cima: { 2: ['j', 'J', 'j'] } },         // 4 sobrado
    { w: 172, alt: 44, telhado: 'plat', placa: 'FARMACIA', placaCor: '#2f7a4a', cruz: 1, ar: 1, terreo: ['pv', ['v', 64], 'j'] },       // 5
    { w: 164, alt: 38, telhado: 'duas', caixa: 1, muro: 'alto', terreo: ['j', 'j', 'J'] },                                             // 6 muro alto com portão
    { w: 184, alt: 44, telhado: 'plat', placa: 'PADARIA', toldo: 1, toldoCor: '#e86a2a', mesas: 1, terreo: [['v', 56], 'pv', ['v', 44]] }, // 7
    { w: 200, alt: 106, andares: 3, telhado: 'plat', placa: 'POUSADA', placaCor: '#1f3f8a', sacada: 1, terreo: ['pv', 'j', 'J', 'j'], cima: { 2: ['j', 'j', 'j', 'j'], 3: ['j', 'j', 'j', 'j'] } }, // 8
    { w: 172, alt: 40, telhado: 'laje', metal: 1, placa: 'BORRACHARIA', placaCor: '#e8a01a', pneus: 1, terreo: [['r', 24, 1], ['r', 24, 1], 'j'] }, // 9
    { w: 236, alt: 38, telhado: 'duas', varanda: 1, grade: 1, muro: 'grade', caixa: 1, terreo: ['g', 'j', 'p', 'J', 'j'] },             // 10 casa grande
    { fn: lavajato, w: 204 },                                                                                                          // 11
    { w: 124, alt: 62, telhado: 'igreja', vasos: 1, terreo: ['j', 'P', 'j'] },                                                         // 12 igreja pequena
    { w: 190, alt: 76, andares: 2, telhado: 'plat', placa: 'MODAS', placaCor: '#7a3ab0', toldo: 1, toldoCor: '#7a3ab0', terreo: [['v', 60], 'pv', ['v', 50]], cima: { 2: ['j', 'j', 'j', 'j'] } }, // 13
    { fn: galpao, w: 262 },                                                                                                            // 14
    { fn: terreno, w: 222 },                                                                                                           // 15
    { w: 158, alt: 42, telhado: 'laje', placa: 'LANCHES', placaCor: '#c8262e', toldo: 1, toldoCor: '#c8262e', mesas: 1, terreo: [['v', 50], 'pv'] }, // 16
    { w: 196, alt: 42, telhado: 'laje', metal: 1, placa: 'OFICINA', placaCor: '#1f3f8a', pneus: 1, terreo: [['r', 24, 1], ['r', 24], 'pv'] }, // 17
    { w: 150, alt: 42, telhado: 'plat', placa: 'ACAI', placaCor: '#5a2a8a', toldo: 1, toldoCor: '#7a3ab0', terreo: ['pv', ['v', 60]] }, // 18
    { w: 226, alt: 106, andares: 3, telhado: 'plat', placa: 'HOTEL', placaCor: '#2a2f38', sacada: 1, terreo: ['pv', ['v', 56], 'pv'], cima: { 2: ['J', 'j', 'J', 'j'], 3: ['J', 'j', 'J', 'j'] } }, // 19
    { w: 150, alt: 42, telhado: 'plat', placa: 'SALAO', placaCor: '#c8468a', poste: 1, terreo: ['pv', 'j', 'j'] },                     // 20
    { w: 160, alt: 38, telhado: 'duas', caixa: 1, muro: 'grade', terreo: ['p', 'j', 'j'] },                                            // 21 casa simples
    { w: 182, alt: 72, andares: 2, telhado: 'duas', grade: 1, muro: 'alto', terreo: ['p', 'j', 'g'], cima: { 2: ['j', 'j', 'J'] } },   // 22 sobrado com muro
  ].map(modelo);
  const PAREDES = ['#e8d8b8', '#d9c2a0', '#c9d4c0', '#e6c8b4', '#cfd6e0', '#e8e0d0', '#d4b89a', '#b8ccc8', '#e2cfa4', '#d8c8d4', '#c4d2b0', '#f0e6d6'];
  const FEITAS = {};
  // o prédio do modelo m, na cor k, espelhado ou não (feito uma vez e guardado)
  function predio(m, k, flip) {
    const o = MODELOS[m % MODELOS.length];
    if (o.placa || o.fn) flip = false; // letreiro não se espelha
    const key = m % MODELOS.length + ':' + k + ':' + (flip ? 1 : 0);
    if (FEITAS[key]) return FEITAS[key];
    const cor = PAREDES[k % PAREDES.length], p = o.fn ? o.fn(m * 7 + k, cor) : casa(o, cor, m * 7 + k);
    if (flip) for (const n of ['c', 'luz']) { const [c2, g2] = mk(p.w, p.h); g2.translate(p.w, 0); g2.scale(-1, 1); g2.drawImage(p[n], 0, 0); p[n] = c2; }
    return (FEITAS[key] = p);
  }
  // uma versão "de longe" do prédio: menor, puxada para a cor do ar (camadas do meio e do fundo)
  const LONGE = {};
  function predioLonge(m, k, flip, esc, nevoa, cor) {
    const key = [m, k, flip ? 1 : 0, esc, nevoa, cor].join(':');
    if (LONGE[key]) return LONGE[key];
    const p = predio(m, k, flip), w = Math.max(1, Math.round(p.w * esc)), h = Math.max(1, Math.round(p.h * esc));
    const [c, g] = mk(w, h), [lz, q] = mk(w, h);
    g.imageSmoothingEnabled = false; q.imageSmoothingEnabled = false;
    g.drawImage(p.c, 0, 0, w, h); q.drawImage(p.luz, 0, 0, w, h);
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = cor; g.globalAlpha = nevoa; g.fillRect(0, 0, w, h);
    return (LONGE[key] = { c, luz: lz, w, h });
  }
  // prédio "de longe" (camadas do meio e do fundo), feito para a distância: bloco com telhado, janelas
  // (as acesas vão para .luz), às vezes caixa-d'água, antena com luz vermelha, torre de igreja ou caixa-d'água
  // alta; já puxado para a cor do ar. esc = escala (0,55 meio, 0,35 longe). Sem letreiro (letra pequena não se lê).
  function predioSil(seed, esc, nevoa, cor) {
    const key = ['sil', seed, esc, nevoa, cor].join(':');
    if (LONGE[key]) return LONGE[key];
    const h0 = (k) => hash(seed * 61 + k * 13 + 9), tipo = h0(0);
    const fl = Math.max(4, Math.round(34 * esc)), andares = 1 + Math.floor(h0(1) * h0(1) * (esc > 0.45 ? 3 : 4.5)); // (a cidade é baixa: mais casas de 1–2 andares)
    const w = Math.round((100 + h0(2) * 130) * esc), alt = andares * fl + 2, duas = andares <= 2 && h0(3) < 0.55;
    const roofH = duas ? Math.round(14 * esc) + 2 : 2, extra = Math.round(70 * esc), W = w + 6, H = alt + roofH + extra, by = H;
    const [c, g] = mk(W, H), [lz, q] = mk(W, H), x0 = 3, parede = PAREDES[Math.floor(h0(4) * PAREDES.length)], esc2 = shade(parede, -0.18);
    if (tipo < 0.07) {                                   // caixa-d'água alta (de concreto, numa torre)
      const tx = W >> 1, th = Math.round(80 * esc);
      R(g, tx - 2, by - th, 4, th, '#b9b4ad'); R(g, tx - Math.round(9 * esc) - 2, by - th - Math.round(14 * esc), Math.round(18 * esc) + 4, Math.round(14 * esc), '#d4d0c8'); R(g, tx - Math.round(9 * esc) - 2, by - th - Math.round(14 * esc), Math.round(18 * esc) + 4, 1, '#eeeae2');
    } else if (tipo < 0.13) {                            // torre de antena (treliça) com luz vermelha
      const tx = W >> 1, th = Math.round(120 * esc);
      for (let j = 0; j < th; j++) { const lw = Math.max(1, Math.round((th - j) / th * 6 * esc + 1)); R(g, tx - lw, by - j, 1, 1, '#8a8f99'); R(g, tx + lw, by - j, 1, 1, '#8a8f99'); if (j % 4 === 0) R(g, tx - lw, by - j, lw * 2 + 1, 1, '#8a8f99'); }
      R(q, tx, by - th - 1, 1, 2, '#ff4040'); R(q, tx, by - Math.round(th * 0.55), 1, 1, '#ff4040');
    } else {
      // telhado
      if (duas) { const tel = TELHA[Math.floor(h0(5) * 3)]; for (let j = 0; j < roofH; j++) { const ins = Math.round((roofH - 1 - j) * 1.4); R(g, x0 + ins - 2, by - alt - roofH + j, w - ins * 2 + 4, 1, j % 2 ? tel[0] : tel[1]); } }
      else { R(g, x0 - 1, by - alt - 2, w + 2, 2, shade(parede, 0.2)); }
      R(g, x0, by - alt, w, alt, parede); R(g, x0, by - alt, w, 1, esc2); R(g, x0, by - 2, w, 2, shade(parede, -0.3));
      // janelas em grade; algumas acesas
      const jw = Math.max(1, Math.round(10 * esc)), jh = Math.max(1, Math.round(9 * esc)), passo = Math.max(jw + 2, Math.round(24 * esc));
      for (let f = 0; f < andares; f++) for (let x = x0 + Math.round(passo * 0.45), i = 0; x + jw < x0 + w - 1; x += passo, i++) {
        const y = by - f * fl - Math.round(fl * 0.68);
        if (f === 0 && i === 1) { R(g, x, by - Math.round(fl * 0.75), jw, Math.round(fl * 0.75) - 1, '#4a3a30'); continue; } // a porta
        R(g, x, y, jw, jh, '#3a4658');
        if (h0(f * 31 + i + 50) > 0.5) R(q, x, y, jw, jh, h0(f + i * 7) > 0.3 ? '#ffd58a' : '#cfe4ff');
      }
      if (!duas && h0(6) < 0.6) { const kx = x0 + Math.round(w * (0.2 + h0(7) * 0.5)), kw = Math.max(3, Math.round(14 * esc)); R(g, kx, by - alt - 2 - Math.round(10 * esc), kw, Math.round(9 * esc), '#3f7fbf'); } // caixa-d'água
      if (!duas && h0(8) < 0.3) { const ax = x0 + Math.round(w * 0.8); R(g, ax, by - alt - Math.round(40 * esc), 1, Math.round(40 * esc), '#8a8f99'); R(q, ax, by - alt - Math.round(40 * esc), 1, 1, '#ff4040'); } // antena
      if (h0(9) < 0.08 && duas) { const tx = x0 + (w >> 1), tw2 = Math.max(3, Math.round(14 * esc)), th = Math.round(60 * esc); R(g, tx - (tw2 >> 1), by - alt - th, tw2, th, parede); R(g, tx, by - alt - th - Math.round(12 * esc), 1, Math.round(10 * esc), '#f4f6fa'); R(g, tx - 2, by - alt - th - Math.round(8 * esc), 5, 1, '#f4f6fa'); } // torre de igreja
    }
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = cor; g.globalAlpha = nevoa; g.fillRect(0, 0, W, H);
    return (LONGE[key] = { c, luz: lz, w: W, h: H });
  }
  // árvore "de longe": menor e puxada para a cor do ar
  function arvoreLonge(seed, H, nevoa, cor) {
    const key = seed + ':' + H + ':' + nevoa + ':' + cor;
    if (LONGE[key]) return LONGE[key];
    const a = arvoreG(seed, H), [c, g] = mk(a.width, a.height);
    g.drawImage(a, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = cor; g.globalAlpha = nevoa; g.fillRect(0, 0, a.width, a.height);
    return (LONGE[key] = c);
  }

  /* ------------------------------------------------------------------ */
  /* SkyFit (foto 15) em escala: 540 × 92 (bloco vermelho/azul 300, bloco branco 240) */
  /* ------------------------------------------------------------------ */
  function skyfit() {
    const W = 540, H = 92, [c, g] = mk(W, H), [lz, q] = mk(W, H), by = H;
    /* bloco branco da direita (mais alto): duas portas de enrolar grandes e o pilar branco no meio */
    const bx = 300, bw = W - bx - 2;
    R(g, bx, 0, bw, by, '#eceef0'); R(g, bx, 0, bw, 2, '#ffffff'); R(g, bx, 0, 3, by, '#d4d8de'); R(g, bx + bw - 5, 0, 5, by, '#c2c7ce');
    for (let i = 0; i < 40; i++) R(g, bx + 6 + Math.floor(hash(i * 7) * (bw - 12)), 4 + Math.floor(hash(i * 11) * 20), 3, 1, '#e2e5e8'); // manchas leves no reboco
    R(g, bx + 8, by - 66, bw - 16, 3, '#4a4f5a');                // a viga escura acima das portas
    for (const [dx, dw] of [[bx + 12, 102], [bx + 126, 104]]) {
      R(g, dx - 1, by - 63, dw + 2, 63, '#6d7178'); R(g, dx, by - 62, dw, 62, '#a2a6ac');
      for (let j = 0; j < 62; j += 2) R(g, dx, by - 62 + j, dw, 1, '#8b9097');
      R(g, dx, by - 62, dw, 4, '#6d7178'); R(g, dx + (dw >> 1) - 5, by - 5, 10, 2, '#5d6168');
    }
    R(g, bx + 114, by - 66, 12, 66, '#f4f6f8'); R(g, bx + 114, by - 66, 1, 66, '#d4d8de');
    R(g, bx, by - 3, bw, 3, '#c9ccd1');
    R(g, bx + bw - 14, 18, 6, 10, '#3a3f48'); R(g, bx + bw - 13, 20, 4, 3, '#9aa3b0'); // caixa de luz
    /* bloco da esquerda: chapa vermelha, vidraça em losangos, marquise e o térreo */
    const lw = 300, top = 10, redH = 26, vy = top + redH, vh = 20, my = vy + vh;
    R(g, 4, top, lw - 4, redH, '#c0353a');
    for (let i = 4; i < lw; i += 3) R(g, i, top, 1, redH, '#a52a30');
    R(g, 4, top, lw - 4, 1, '#e86060'); R(g, 4, top + redH - 1, lw - 4, 1, '#7a1c22');
    // letreiro: SKY branco, FIT vermelho com contorno branco, ACADEMIA e o risco curvo
    const lx = 14, ly = top + 4;
    R(g, lx - 4, ly - 3, 78, 23, '#1a1a1e'); R(g, lx - 4, ly - 3, 78, 1, '#3a3a40');
    const letreiro = (G, on) => {
      text(G, 'SKY', lx, ly, 3, '#ffffff');
      text(G, 'FIT', lx + 38, ly - 1, 3, '#ffffff'); text(G, 'FIT', lx + 39, ly, 3, on ? '#ff5a5a' : '#e23a40');
      text(G, 'ACADEMIA', lx, ly + 16, 1, on ? '#ffffff' : '#d9dde3');
      for (let i = 0; i < 30; i++) R(G, lx + 38 + i, ly + 16 + Math.round(Math.sin((i / 29) * Math.PI) * 2), 1, 1, on ? '#ff5a5a' : '#e23a40');
    };
    letreiro(g, false); letreiro(q, true);
    // vidraça escura em losangos
    R(g, 4, vy, lw - 4, vh, '#25323d'); R(g, 4, vy, lw - 4, 3, '#3d5262');
    for (let i = -vh; i < lw; i += 20) for (let j = 0; j < vh; j++) { const xa = 4 + i + j, xb = 4 + i + 20 - j + vh - 20; if (xa > 4 && xa < lw) R(g, xa, vy + j, 1, 1, '#7d8a96'); if (xb > 4 && xb < lw) R(g, xb, vy + j, 1, 1, '#7d8a96'); }
    for (let i = 40; i < lw; i += 40) R(g, i, vy, 1, vh, '#56636e');
    q.fillStyle = 'rgba(150,190,220,0.35)'; q.fillRect(4, vy + 1, lw - 4, vh - 1);
    // marquise escura
    R(g, 0, my, lw + 2, 5, '#3a3f48'); R(g, 0, my, lw + 2, 1, '#5d6573');
    R(g, 4, my + 5, lw - 4, by - my - 5, '#2c3036');
    // vitrine à esquerda: aparelhos de academia lá dentro e a faixa azul no vidro
    const vx0 = 8, vw = 118;
    R(g, vx0, my + 8, vw, by - my - 11, '#31475a'); R(g, vx0, my + 8, vw, 3, '#4f6a80'); for (let i = 30; i < vw; i += 30) R(g, vx0 + i, my + 8, 1, by - my - 11, '#1c2228');
    R(g, vx0, by - 12, vw, 2, '#3a6bff');
    q.fillStyle = '#cfe4f4'; q.fillRect(vx0 + 1, my + 9, vw - 2, by - my - 13);
    for (let k = 0; k < 6; k++) { const ex = vx0 + 6 + k * 19; for (const G2 of [g, q]) { R(G2, ex, by - 20, 12, 2, G2 === g ? '#6d7581' : '#4a5560'); R(G2, ex + 4, by - 18, 3, 8, G2 === g ? '#55595f' : '#4a5560'); R(G2, ex + 1, by - 26, 2, 6, G2 === g ? '#6d7581' : '#4a5560'); } }
    for (let i = 30; i < vw; i += 30) R(q, vx0 + i, my + 8, 1, by - my - 11, '#5a6a78');
    R(q, vx0, by - 12, vw, 2, '#6a9aff');
    // a bicicleta encostada na vitrine
    for (const wx of [14, 30]) { for (let a = 0; a < 16; a++) R(g, wx + Math.round(Math.cos(a / 2.55) * 5), by - 6 + Math.round(Math.sin(a / 2.55) * 5), 1, 1, '#16181d'); }
    R(g, 14, by - 9, 16, 1, '#c8262e'); R(g, 21, by - 13, 1, 7, '#c8262e'); R(g, 19, by - 13, 5, 1, '#16181d');
    // a entrada: pilar vermelho, pilar azul, quadro vermelho com 3 estrelas, viga azul, porta de vidro, pilar azul, pilar vermelho
    const ex = 146;
    R(g, ex, my + 2, 9, by - my - 2, '#d0343a'); R(g, ex, my + 2, 2, by - my - 2, '#f06a6a');
    R(g, ex + 10, my - 8, 9, by - my + 8, '#2a44c8'); R(g, ex + 10, my - 8, 2, by - my + 8, '#5a7af0');
    R(g, ex + 63, my - 8, 9, by - my + 8, '#2a44c8'); R(g, ex + 63, my - 8, 2, by - my + 8, '#5a7af0');
    R(g, ex + 73, my + 2, 9, by - my - 2, '#d0343a'); R(g, ex + 73, my + 2, 2, by - my - 2, '#f06a6a');
    R(g, ex + 19, my + 12, 44, by - my - 12, '#1a2026'); R(g, ex + 41, my + 12, 1, by - my - 12, '#4a5560');
    q.fillStyle = '#b8d0e4'; q.fillRect(ex + 20, my + 13, 42, by - my - 14); R(q, ex + 41, my + 12, 1, by - my - 12, '#4a5560');
    R(g, ex + 14, my - 22, 54, 26, '#d0343a'); R(g, ex + 14, my - 22, 54, 2, '#f06a6a'); R(g, ex + 14, my + 3, 54, 1, '#8a1c22');
    const estrela = (G, sx, sy, s) => { R(G, sx, sy - s, 1, s * 2 + 1, '#ffffff'); R(G, sx - s, sy, s * 2 + 1, 1, '#ffffff'); R(G, sx - 1, sy - 1, 3, 3, '#ffffff'); if (s > 2) { R(G, sx - 2, sy - 2, 5, 5, '#ffffff'); R(G, sx - s + 1, sy + s - 1, 2, 1, '#ffffff'); R(G, sx + s - 2, sy + s - 1, 2, 1, '#ffffff'); } };
    for (const G2 of [g, q]) { estrela(G2, ex + 41, my - 12, 5); estrela(G2, ex + 27, my - 7, 3); estrela(G2, ex + 55, my - 7, 3); }
    R(g, ex + 10, my + 5, 62, 6, '#2a44c8'); R(g, ex + 10, my + 5, 62, 1, '#5a7af0');
    // à direita da entrada: parede escura e uma porta lateral de vidro
    R(g, ex + 88, my + 10, 30, by - my - 13, '#31475a'); R(g, ex + 102, my + 10, 1, by - my - 13, '#1c2228'); q.fillStyle = '#b8d0e4'; q.fillRect(ex + 89, my + 11, 28, by - my - 15);
    R(g, 0, by - 2, lw, 2, '#b9b4ad');
    return { c, luz: lz, w: W, h: H };
  }
  // bandeira-faixa (wind banner) roxa e vermelha, do tamanho certo (~4,5 m)
  function bandeirola() {
    const [c, g] = mk(16, 54);
    R(g, 1, 0, 2, 54, '#c8ccd2');
    for (let j = 0; j < 44; j++) { const w = 5 + Math.round(7 * Math.sin((j / 44) * Math.PI * 0.9 + 0.3)); R(g, 3, 2 + j, w, 1, j > 7 && j < 15 ? '#d0343a' : j === 7 || j === 15 ? '#f4f6fa' : '#6a2a9a'); }
    for (let j = 20; j < 40; j += 4) R(g, 6, 2 + j, 4, 2, '#e0c8f4');
    R(g, 0, 53, 5, 1, '#3a3f4a');
    return c;
  }

  /* ------------------------------------------------------------------ */
  /* Mais coisas da rua: moto, caminhão, placas, ponto de ônibus          */
  /* ------------------------------------------------------------------ */
  const espelho = (c) => { const [m, mg] = mk(c.width, c.height); mg.translate(c.width, 0); mg.scale(-1, 1); mg.drawImage(c, 0, 0); return m; };
  // moto de lado com o motoqueiro (30 × 28, virada para a direita; .l espelhada)
  function moto(cor, roupa, capacete) {
    const [c, g] = mk(30, 28), by = 27;
    for (const wx of [6, 23]) { disc(g, wx, by - 4, 4, '#121418'); disc(g, wx, by - 4, 2, '#5d6573'); }
    R(g, 3, by - 8, 9, 2, '#9aa3b0'); R(g, 8, by - 11, 14, 5, cor); R(g, 8, by - 11, 14, 1, shade(cor, 0.3)); R(g, 9, by - 13, 9, 2, '#16181d');
    R(g, 21, by - 15, 2, 11, '#9aa3b0'); R(g, 19, by - 16, 5, 1, '#2a2f38'); R(g, 24, by - 13, 2, 3, '#fff1b0');
    R(g, 11, by - 13, 5, 6, '#2a2f38'); R(g, 15, by - 9, 2, 5, '#2a2f38'); R(g, 11, by - 22, 6, 9, roupa); R(g, 15, by - 20, 6, 2, roupa);
    disc(g, 14, by - 25, 3, capacete); R(g, 15, by - 26, 3, 2, '#1c2733');
    return { r: c, l: espelho(c) };
  }
  // caminhão baú de lado (110 × 42)
  function caminhao(cor) {
    const [c, g] = mk(110, 42), by = 41;
    R(g, 2, by - 38, 78, 30, '#e9ecef'); R(g, 2, by - 38, 78, 1, '#ffffff'); for (let i = 8; i < 78; i += 8) R(g, 2 + i, by - 37, 1, 28, '#c9ccd1'); R(g, 2, by - 16, 78, 3, cor);
    R(g, 82, by - 30, 24, 22, cor); R(g, 84, by - 32, 18, 2, shade(cor, 0.25)); R(g, 92, by - 27, 13, 9, '#1c2733'); R(g, 93, by - 27, 3, 1, '#5a7a9a');
    R(g, 104, by - 14, 3, 3, '#fff1b0'); R(g, 2, by - 9, 104, 3, '#2a2f38'); R(g, 80, by - 9, 28, 3, '#3a3f4a');
    for (const wx of [14, 27, 70, 95]) { disc(g, wx, by - 5, 5, '#121418'); disc(g, wx, by - 5, 2, '#6d7581'); }
    return { r: c, l: espelho(c) };
  }
  // placas de trânsito
  function placaVel(n) {
    const [c, g] = mk(15, 36);
    R(g, 7, 12, 2, 24, '#9aa3b0'); disc(g, 7, 7, 7, '#c8262e'); disc(g, 7, 7, 5, '#f4f6fa'); text(g, n, 7 - (textW(n, 1) >> 1), 5, 1, '#16181d');
    return c;
  }
  function placaDir(l1, l2) {
    const W = Math.max(textW(l1, 1), textW(l2, 1)) + 10, [c, g] = mk(W, 44);
    R(g, 4, 15, 2, 29, '#9aa3b0'); R(g, W - 6, 15, 2, 29, '#9aa3b0');
    R(g, 0, 0, W, 17, '#f4f6fa'); R(g, 1, 1, W - 2, 15, '#1f6b3a'); text(g, l1, 5, 3, 1, '#ffffff'); text(g, l2, 5, 10, 1, '#ffffff');
    return c;
  }
  function placaAzul(l1) {
    const W = textW(l1, 1) + 8, [c, g] = mk(W, 34);
    R(g, (W >> 1) - 1, 9, 2, 25, '#9aa3b0'); R(g, 0, 0, W, 10, '#f4f6fa'); R(g, 1, 1, W - 2, 8, '#1f3f8a'); text(g, l1, 4, 3, 1, '#ffffff');
    return c;
  }
  // ponto de ônibus coberto, com banco e um cartaz
  function pontoOnibus() {
    const [c, g] = mk(66, 34);
    R(g, 0, 0, 66, 3, '#5d6573'); R(g, 0, 0, 66, 1, '#9aa3b0');
    R(g, 4, 3, 58, 22, 'rgba(160,200,230,0.35)'); R(g, 4, 3, 58, 1, '#c8ccd2');
    R(g, 46, 5, 13, 17, '#e86a2a'); R(g, 48, 7, 9, 6, '#ffd58a'); R(g, 48, 15, 9, 1, '#f4f6fa'); R(g, 48, 18, 6, 1, '#f4f6fa');
    R(g, 2, 3, 2, 31, '#7d8590'); R(g, 62, 3, 2, 31, '#7d8590');
    R(g, 10, 22, 32, 3, '#6b4a30'); R(g, 10, 22, 32, 1, '#8a6442'); R(g, 12, 25, 2, 9, '#3a3f4a'); R(g, 38, 25, 2, 9, '#3a3f4a');
    return c;
  }

  /* ------------------------------------------------------------------ */
  /* Carros                                                              */
  /* ------------------------------------------------------------------ */
  // de lado (52 × 22, virado para a direita; .l = espelhado)
  function carro(body) {
    const [c, g] = mk(52, 22);
    const d = shade(body, -0.32), l = shade(body, 0.25), glass = '#1c2733', x0 = 1, by = 21;
    R(g, x0 + 2, by - 12, 46, 8, body); R(g, x0, by - 10, 50, 6, body); R(g, x0 + 2, by - 12, 46, 1, l); R(g, x0, by - 5, 50, 1, d); R(g, x0 + 1, by - 4, 48, 1, '#2a2f38');
    R(g, x0 + 14, by - 19, 21, 1, l); R(g, x0 + 12, by - 18, 25, 6, body); R(g, x0 + 10, by - 14, 2, 2, body); R(g, x0 + 37, by - 16, 4, 4, body);
    R(g, x0 + 13, by - 18, 10, 5, glass); R(g, x0 + 25, by - 18, 11, 5, glass); R(g, x0 + 14, by - 18, 2, 1, '#5a7a9a'); R(g, x0 + 26, by - 18, 2, 1, '#5a7a9a');
    R(g, x0 + 24, by - 18, 1, 13, d); R(g, x0 + 30, by - 10, 3, 1, d); R(g, x0 + 48, by - 10, 2, 2, '#fff1b0'); R(g, x0, by - 10, 2, 2, '#c8262e');
    for (const wx of [x0 + 11, x0 + 39]) { disc(g, wx, by - 3, 4, '#121418'); disc(g, wx, by - 3, 2, '#6d7581'); R(g, wx, by - 3, 1, 1, '#c8ccd2'); }
    const [m, mg] = mk(52, 22); mg.translate(52, 0); mg.scale(-1, 1); mg.drawImage(c, 0, 0);
    return { r: c, l: m };
  }
  // de trás (30 × 24) ou de frente (frente = true: faróis no lugar das lanternas)
  function carroPonta(body, frente) {
    const [c, g] = mk(30, 24), d = shade(body, -0.32), l = shade(body, 0.25), by = 23;
    R(g, 4, by - 4, 5, 4, '#121418'); R(g, 21, by - 4, 5, 4, '#121418');
    R(g, 2, by - 13, 26, 10, body); R(g, 2, by - 13, 26, 1, l); R(g, 2, by - 5, 26, 2, '#2a2f38');
    R(g, 5, by - 21, 20, 8, body); R(g, 6, by - 22, 18, 1, l); R(g, 7, by - 20, 16, 6, '#1c2733'); R(g, 8, by - 20, 5, 1, '#5a7a9a');
    R(g, 3, by - 14, 2, 1, d); R(g, 25, by - 14, 2, 1, d);
    if (frente) { R(g, 3, by - 11, 6, 3, '#fff1b0'); R(g, 21, by - 11, 6, 3, '#fff1b0'); R(g, 11, by - 11, 8, 3, '#16181d'); }
    else { R(g, 3, by - 11, 6, 3, '#c8262e'); R(g, 21, by - 11, 6, 3, '#c8262e'); R(g, 3, by - 11, 2, 3, '#ff7a52'); R(g, 25, by - 11, 2, 3, '#ff7a52'); R(g, 10, by - 9, 10, 1, d); }
    R(g, 11, by - 7, 8, 3, '#e9ecef');
    return c;
  }

  DL.Pecas = { arvore, arvoreG, arvoreLonge, predioSil, palmeira, arbusto, capim, mata, predio, predioLonge, MODELOS, skyfit, bandeirola, carro, carroPonta, moto, caminhao, placaVel, placaDir, placaAzul, pontoOnibus };
})();

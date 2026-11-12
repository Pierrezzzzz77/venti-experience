/* Venti Experience — sprites em pixel art desenhados por código (sem imagens).
   COPIADO do DataLab (assets/js/sprites.js) e enxugado: ficou só o personagem, o rack com
   unidades (servidor / switch), a mesa, a planta, o ar-condicionado e o piso.
   Tudo em "pixels do mundo"; a cena aumenta a escala na hora de desenhar. */
(function () {
  'use strict';
  const DL = (window.DL = window.DL || {});
  const T = (DL.T = 16);

  const C = (DL.C = {
    outline: '#06070a',
    ok: '#7ee0a1',
    okDim: '#1f4a35',
    warn: '#ff7a17',
    warnDim: '#4a210a',
    warnSoft: '#ffc285',
    breeze: '#a0c3ec',
    breezeDim: '#24384f',
    twilight: '#c4b5fd',
    dusk: '#7c3aed',
    midnight: '#0d1726',
    port: '#10141a',
    screenInk: '#3d5a80',
  });

  function R(g, x, y, w, h, c) {
    g.fillStyle = c;
    g.fillRect(x, y, w, h);
  }
  DL.R = R;

  function hash(n) {
    n = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b);
    n ^= n >>> 13;
    n = Math.imul(n, 0xc2b2ae35);
    n ^= n >>> 16;
    return (n >>> 0) / 4294967296;
  }
  DL.hash = hash;

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const t = amt < 0 ? 0 : 255;
    const p = Math.abs(amt);
    const ch = (v) => Math.round((t - v) * p + v);
    const r = ch(n >> 16), g = ch((n >> 8) & 255), b = ch(n & 255);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }
  DL.shade = shade;

  function mk(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }
  DL.mk = mk;

  const blink = (t, hz, phase) => Math.sin((t * hz + phase) * Math.PI * 2) > 0;
  const flick = (t, seed, rate) => hash(Math.floor(t * rate) * 7919 + seed) > 0.42;
  DL.blink = blink;

  /* ------------------------------------------------------------------ */
  /* Characters — chunky head, short body: original "lobby + RPG" mix.   */
  /* ------------------------------------------------------------------ */
  const FW = 22, FH = 31, AX = 11, AY = 29;
  DL.CHAR = { FW, FH, AX, AY };

  function drawChar(g, dir, pose, L, closed) {
    const ax = AX, ay = AY;
    const side = dir === 'right';
    const sit = pose.indexOf('sit') === 0;
    const bob = pose === 'pass' || pose === 'danceB' ? -1 : sit ? 4 : 0;
    const skinD = shade(L.skin, -0.16);
    const handD = skinD;
    const hand = (x, y, w, h) => R(g, x, y, w, h, L.skin);
    const shirt = L.shirt, shirtD = shade(shirt, -0.3), shirtL = shade(shirt, 0.14);
    const pantsD = shade(L.pants, -0.35);
    const shoeD = shade(L.shoes, -0.4);
    const hair = L.hair, hairD = shade(hair, -0.35), hairL = shade(hair, 0.22);
    const eye = '#121218';
    const blush = 'rgba(224,110,100,0.45)';

    const leg = (x, dy, col) => {
      R(g, x, ay - 6 + dy, 3, 4, col);
      R(g, x, ay - 2 + dy, 3, 1, L.shoes);
      R(g, x, ay - 1 + dy, 3, 1, shoeD);
    };

    // legs (hidden by the desk or chair while seated)
    if (sit && side) {
      // in profile: thigh forward on the seat, shin down to the floor
      R(g, ax - 2, ay - 4, 7, 3, L.pants);
      R(g, ax - 2, ay - 4, 7, 1, shade(L.pants, 0.12));
      R(g, ax + 3, ay - 1, 3, 2, pantsD);
      R(g, ax + 3, ay + 1, 4, 1, L.shoes);
    } else if (sit) {
      // no legs
    } else if (!side) {
      const lDy = pose === 'B' || pose === 'danceB' ? -1 : 0;
      const rDy = pose === 'A' || pose === 'danceA' ? -1 : 0;
      leg(ax - 3, lDy, L.pants);
      leg(ax, rDy, L.pants);
      R(g, ax - 1, ay - 6 + lDy, 1, 4, pantsD);
    } else {
      let back = ax - 2, front = ax - 1;
      if (pose === 'A') { back = ax - 4; front = ax + 1; }
      if (pose === 'B') { back = ax + 1; front = ax - 4; }
      leg(back, 0, pantsD);
      leg(front, 0, L.pants);
      R(g, front + 3, ay - 2, 1, 1, L.shoes);
      R(g, front + 3, ay - 1, 1, 1, shoeD);
    }

    // torso + arms
    const ty = ay - 13 + bob;
    if (!side) {
      const sw = pose === 'A' ? -1 : pose === 'B' ? 1 : 0;
      R(g, ax - 4, ty, 8, 8, shirt);
      R(g, ax - 4, ty, 1, 8, shirtL);
      R(g, ax + 3, ty, 1, 8, shirtD);
      R(g, ax - 4, ty + 7, 8, 1, shirtD);
      const arm = (x, dy) => {
        R(g, x, ty + 1 + dy, 2, 5, shirt);
        R(g, x, ty + 1 + dy, 2, 1, shirtL);
        hand(x, ty + 6 + dy, 2, 2);
        R(g, x, ty + 7 + dy, 2, 1, handD);
      };
      if (!sit && pose === 'reach') {
        // both hands up and forward: working on something at chest height
        arm(ax - 6, -3);
        arm(ax + 4, -3);
        R(g, ax + 5, ty - 2, 1, 5, shirtD);
      } else if (!sit && pose === 'wave') {
        // one arm raised: greeting / calling someone
        arm(ax - 6, 0);
        R(g, ax + 4, ty - 4, 2, 6, shirt);
        R(g, ax + 4, ty - 4, 2, 1, shirtL);
        hand(ax + 4, ty - 7, 2, 3);
        R(g, ax + 5, ty - 4, 1, 6, shirtD);
      } else if (!sit && pose === 'waveB') {
        // the waving hand at the other end of its swing: the forearm leans out
        arm(ax - 6, 0);
        R(g, ax + 4, ty - 2, 2, 4, shirt);
        R(g, ax + 5, ty - 5, 2, 3, shirt);
        R(g, ax + 5, ty - 5, 2, 1, shirtL);
        hand(ax + 6, ty - 8, 2, 3);
      } else if (!sit && (pose === 'danceA' || pose === 'danceB')) {
        // dancing: one arm up and out (clear of the head), the other swinging low, switching on every beat
        const a = pose === 'danceA', sx = a ? ax - 6 : ax + 4, ux = sx + (a ? -1 : 1), low = a ? ax + 4 : ax - 6;
        R(g, sx, ty, 2, 3, shirt);
        R(g, ux, ty - 4, 2, 4, shirt);
        R(g, ux, ty - 4, 2, 1, shirtL);
        hand(ux, ty - 7, 2, 3);
        arm(low, 1);
      } else if (!sit) {
        arm(ax - 6, sw);
        arm(ax + 4, -sw);
        R(g, ax + 5, ty + 1 - sw, 1, 5, shirtD);
      } else if (dir === 'down') {
        // facing the viewer: upper arms at the sides, hands forward on the keyboard
        const ly = pose === 'sitA' ? -1 : 0, ry = pose === 'sitB' ? -1 : 0;
        R(g, ax - 6, ty + 1, 2, 5, shirt);
        R(g, ax - 6, ty + 1, 2, 1, shirtL);
        R(g, ax + 4, ty + 1, 2, 5, shirt);
        R(g, ax + 4, ty + 1, 2, 1, shirtL);
        R(g, ax + 5, ty + 1, 1, 5, shirtD);
        hand(ax - 5, ty + 6 + ly, 2, 2);
        R(g, ax - 5, ty + 7 + ly, 2, 1, handD);
        hand(ax + 3, ty + 6 + ry, 2, 2);
        R(g, ax + 3, ty + 7 + ry, 2, 1, handD);
      } else {
        // seen from behind: elbows out, alternating as the hands type
        const ly = pose === 'sitA' ? -1 : 0, ry = pose === 'sitB' ? -1 : 0;
        R(g, ax - 6, ty + 1 + ly, 2, 4, shirt);
        R(g, ax - 6, ty + 1 + ly, 2, 1, shirtL);
        R(g, ax - 7, ty + 3 + ly, 1, 2, shirtD);
        R(g, ax + 4, ty + 1 + ry, 2, 4, shirt);
        R(g, ax + 4, ty + 1 + ry, 2, 1, shirtL);
        R(g, ax + 6, ty + 3 + ry, 1, 2, shirtD);
      }
      if (dir === 'down') {
        R(g, ax - 2, ty, 4, 1, shirtD);
        if (L.vest) {
          R(g, ax - 4, ty + 1, 2, 6, L.vest);
          R(g, ax + 2, ty + 1, 2, 6, L.vest);
          R(g, ax - 4, ty + 4, 8, 1, shade(L.vest, 0.35));
        }
        if (L.lanyard) {
          R(g, ax - 2, ty + 1, 1, 2, L.lanyard);
          R(g, ax + 1, ty + 1, 1, 2, L.lanyard);
        }
        if (L.badge) {
          R(g, ax - 2, ty + 3, 4, 3, '#f1f1ee');
          R(g, ax - 2, ty + 3, 4, 1, L.badge);
        }
      } else {
        R(g, ax - 3, ty, 6, 2, shirtD);
        if (L.vest) R(g, ax - 4, ty + 3, 8, 1, shade(L.vest, 0.35));
      }
      if (L.body === 'f') {
        g.clearRect(ax - 4, ty + 4, 1, 2);
        g.clearRect(ax + 3, ty + 4, 1, 2);
      }
    } else {
      const sw = pose === 'A' ? 1 : pose === 'B' ? -1 : 0;
      R(g, ax - 3, ty, 6, 8, shirt);
      R(g, ax - 3, ty, 1, 8, shirtD);
      R(g, ax + 2, ty, 1, 8, shirtL);
      R(g, ax - 3, ty + 7, 6, 1, shirtD);
      if (L.vest) R(g, ax - 3, ty + 4, 6, 1, shade(L.vest, 0.35));
      if (L.badge) R(g, ax + 2, ty + 3, 1, 2, L.badge);
      if (sit) {
        // seated in profile: elbow bent, forearm reaching for the keyboard (alternating while typing)
        const dy = pose === 'sitA' ? -1 : 0, rest = pose === 'sitR' || pose === 'sitL';
        R(g, ax - 1, ty + 1, 2, 4, shirt);
        R(g, ax - 2, ty + 1, 1, 4, shirtD);
        R(g, ax - 1, ty + 1, 2, 1, shirtL);
        R(g, ax - 1, ty + 4 + dy, rest ? 3 : 5, 2, shirt);
        hand(ax + (rest ? 2 : 4), ty + 4 + dy, 2, 2);
      } else if (pose === 'reach' || pose === 'wave') {
        // profile: forearm stretched out in front (raised a bit more when waving)
        const up = pose === 'wave' ? -3 : 0;
        R(g, ax - 1, ty + 1, 2, 4, shirt);
        R(g, ax - 2, ty + 1, 1, 4, shirtD);
        R(g, ax - 1, ty + 3 + up, 5, 2, shirt);
        hand(ax + 4, ty + 3 + up, 2, 2);
      } else {
        R(g, ax - 1 + sw, ty + 1, 2, 5, shirt);
        R(g, ax - 2 + sw, ty + 1, 1, 5, shirtD);
        R(g, ax - 1 + sw, ty + 1, 2, 1, shirtL);
        hand(ax - 1 + sw, ty + 6, 2, 2);
      }
    }

    // head (a seated worker glancing at the side monitor shifts it a pixel)
    const hx = ax + (pose === 'sitL' && dir === 'up' ? 1 : 0);
    const hy = ay - 23 + bob;
    const look = pose === 'sitL' && dir === 'down' ? 1 : 0;
    R(g, hx - 4, hy, 8, 10, L.skin);
    R(g, hx - 5, hy + 1, 10, 8, L.skin);
    R(g, hx - 4, hy + 9, 8, 1, skinD);
    if (dir === 'down') {
      R(g, ax + 4, hy + 2, 1, 6, skinD);
      if (closed) {
        R(g, ax - 3, hy + 6, 2, 1, eye);
        R(g, ax + 1, hy + 6, 2, 1, eye);
      } else {
        R(g, ax - 3 + look, hy + 5, 1, 2, eye);
        R(g, ax + 2 + look, hy + 5, 1, 2, eye);
        if (L.body === 'f') {
          R(g, ax - 4 + look, hy + 5, 1, 1, eye);
          R(g, ax + 3 + look, hy + 5, 1, 1, eye);
        }
      }
      R(g, ax - 4, hy + 7, 1, 1, blush);
      R(g, ax + 3, hy + 7, 1, 1, blush);
      R(g, ax - 1, hy + 8, 2, 1, skinD);
      if (pose === 'talk' || pose === 'sitT') R(g, ax - 1, hy + 8, 2, 1, '#6b2e2e');
    } else if (side) {
      if (closed) R(g, ax + 2, hy + 6, 2, 1, eye);
      else {
        R(g, ax + 2, hy + 5, 1, 2, eye);
        if (L.body === 'f') R(g, ax + 3, hy + 4, 1, 1, eye);
      }
      R(g, ax + 3, hy + 7, 1, 1, blush);
      if (pose === 'talk' || pose === 'sitT') R(g, ax + 4, hy + 8, 1, 1, '#6b2e2e');
      R(g, ax + 5, hy + 5, 1, 2, L.skin);
      R(g, ax - 1, hy + 5, 1, 2, skinD);
    }
    if (L.beard) {
      if (dir === 'down') {
        R(g, ax - 5, hy + 5, 1, 4, hairD);
        R(g, ax + 4, hy + 5, 1, 4, hairD);
        R(g, ax - 4, hy + 8, 8, 2, hair);
        R(g, ax - 1, hy + 8, 2, 1, hairD);
      } else if (side) {
        R(g, ax, hy + 6, 1, 3, hairD);
        R(g, ax, hy + 8, 5, 2, hair);
      } else {
        R(g, hx - 5, hy + 5, 1, 4, hairD);
        R(g, hx + 4, hy + 5, 1, 4, hairD);
      }
    }
    if (L.body === 'm' && !closed) {
      if (dir === 'down') {
        R(g, ax - 3 + look, hy + 4, 2, 1, hairD);
        R(g, ax + 1 + look, hy + 4, 2, 1, hairD);
      } else if (side) R(g, ax + 2, hy + 4, 2, 1, hairD);
    }

    // hair
    const H = (x, y, w, h, c) => R(g, hx + x, hy + y, w, h, c || hair);
    const style = L.hairStyle;
    if (style === 'short' || style === 'bun' || style === 'long') {
      if (dir === 'down') {
        H(-4, -1, 8, 1); H(-5, 0, 10, 3); H(-5, 3, 1, 3); H(4, 3, 1, 3);
        H(-4, 3, 3, 1); H(1, 3, 2, 1); H(-3, 0, 4, 1, hairL);
      } else if (dir === 'up') {
        H(-4, -1, 8, 1); H(-5, 0, 10, 8); H(-4, 8, 8, 1, hairD); H(-3, 0, 4, 1, hairL);
      } else {
        H(-4, -1, 8, 1); H(-5, 0, 10, 3); H(-5, 3, 5, 4); H(-4, 7, 3, 1, hairD);
        H(1, 3, 3, 1); H(-2, 0, 4, 1, hairL);
      }
      if (style === 'bun') {
        if (side) { H(-7, 0, 3, 3); H(-7, 0, 2, 1, hairL); }
        else { H(-2, -4, 4, 3); H(-1, -4, 2, 1, hairL); }
      }
      if (style === 'long') {
        if (dir === 'down') { H(-6, 2, 2, 10); H(4, 2, 2, 10); }
        else if (dir === 'up') { H(-5, 8, 10, 4); H(-6, 2, 1, 9); H(5, 2, 1, 9); }
        else { H(-6, 2, 4, 10); H(-6, 11, 4, 1, hairD); }
      }
    } else if (style === 'cap') {
      const cap = L.cap, capD = shade(cap, -0.3), capL = shade(cap, 0.22);
      if (dir === 'down') {
        H(-5, 3, 1, 3); H(4, 3, 1, 3);
        H(-4, -1, 8, 1, cap); H(-5, 0, 10, 3, cap); H(-3, 0, 3, 1, capL); H(-5, 3, 10, 1, capD);
      } else if (dir === 'up') {
        H(-5, 3, 10, 5); H(-4, -1, 8, 1, cap); H(-5, 0, 10, 3, cap); H(-2, 3, 4, 1, capD);
      } else {
        H(-5, 3, 4, 4); H(-4, -1, 8, 1, cap); H(-5, 0, 10, 3, cap); H(-2, 0, 3, 1, capL); H(1, 3, 6, 1, capD);
      }
    } else if (style === 'curly') {
      const dots = () => { for (let i = 0; i < 6; i++) H(-5 + i * 2, -1 + (i % 2), 1, 1, hairL); };
      if (dir === 'down') {
        H(-5, -2, 10, 2); H(-6, -1, 12, 4); H(-6, 3, 2, 4); H(4, 3, 2, 4); H(-4, 3, 2, 1); H(2, 3, 2, 1);
      } else if (dir === 'up') {
        H(-5, -2, 10, 2); H(-6, -1, 12, 9);
      } else {
        H(-5, -2, 10, 2); H(-6, -1, 12, 4); H(-6, 3, 6, 5); H(2, 3, 2, 1);
      }
      dots();
    } else if (style === 'buzz') {
      if (dir === 'down') { H(-4, 0, 8, 1); H(-5, 1, 10, 1); H(-5, 2, 1, 2); H(4, 2, 1, 2); H(-2, 0, 3, 1, hairL); }
      else if (dir === 'up') { H(-4, 0, 8, 1); H(-5, 1, 10, 6); H(-4, 7, 8, 1, hairD); H(-2, 0, 3, 1, hairL); }
      else { H(-4, 0, 8, 1); H(-5, 1, 10, 1); H(-5, 2, 4, 4); H(-1, 0, 3, 1, hairL); }
    } else if (style === 'ponytail') {
      if (dir === 'down') {
        H(-4, -1, 8, 1); H(-5, 0, 10, 3); H(-5, 3, 1, 2); H(4, 3, 1, 2); H(-4, 3, 2, 1); H(-3, 0, 4, 1, hairL);
      } else if (dir === 'up') {
        H(-4, -1, 8, 1); H(-5, 0, 10, 7); H(-4, 7, 8, 1, hairD); H(-1, 6, 2, 1, L.roleColor || hairL); H(-1, 7, 2, 6); H(-1, 12, 2, 1, hairD); H(-3, 0, 4, 1, hairL);
      } else {
        H(-4, -1, 8, 1); H(-5, 0, 10, 3); H(-5, 3, 4, 3); H(-7, 2, 2, 7); H(-7, 8, 2, 1, hairD); H(-5, 3, 1, 1, L.roleColor || hairL); H(-2, 0, 4, 1, hairL);
      }
    } else if (style === 'afro') {
      if (dir === 'down') { H(-5, -3, 10, 2); H(-7, -1, 14, 4); H(-7, 3, 2, 5); H(5, 3, 2, 5); H(-4, 3, 2, 1); H(2, 3, 2, 1); }
      else if (dir === 'up') { H(-5, -3, 10, 2); H(-7, -1, 14, 10); H(-6, 9, 12, 1, hairD); }
      else { H(-5, -3, 10, 2); H(-7, -1, 13, 4); H(-7, 3, 7, 6); H(2, 3, 2, 1); }
      for (let i = 0; i < 5; i++) H(-5 + i * 2 + (i % 2), -2 + (i % 2), 1, 1, hairL);
    } else if (style === 'bob') {
      if (dir === 'down') { H(-4, -1, 8, 1); H(-5, 0, 10, 3); H(-6, 2, 2, 7); H(4, 2, 2, 7); H(-4, 3, 3, 1); H(-6, 8, 2, 1, hairD); H(4, 8, 2, 1, hairD); H(-3, 0, 4, 1, hairL); }
      else if (dir === 'up') { H(-4, -1, 8, 1); H(-5, 0, 10, 9); H(-6, 2, 1, 7); H(5, 2, 1, 7); H(-5, 8, 10, 1, hairD); H(-3, 0, 4, 1, hairL); }
      else { H(-4, -1, 8, 1); H(-5, 0, 10, 3); H(-6, 2, 6, 7); H(1, 3, 3, 1); H(-6, 8, 6, 1, hairD); H(-2, 0, 4, 1, hairL); }
    }

    // hats sit on top of any hairstyle
    if (L.hat === 'cap') {
      const cap = L.capColor || '#3b4250', capD = shade(cap, -0.3), capL = shade(cap, 0.22);
      if (dir === 'down') { H(-4, -1, 8, 1, cap); H(-5, 0, 10, 3, cap); H(-3, 0, 3, 1, capL); H(-5, 3, 10, 1, capD); }
      else if (dir === 'up') { H(-4, -1, 8, 1, cap); H(-5, 0, 10, 3, cap); H(-2, 3, 4, 1, capD); }
      else { H(-4, -1, 8, 1, cap); H(-5, 0, 10, 3, cap); H(-2, 0, 3, 1, capL); H(1, 3, 6, 1, capD); }
    } else if (L.hat === 'beanie') {
      const b = L.capColor || '#3b4250', bD = shade(b, -0.3), bL = shade(b, 0.2);
      H(-4, -2, 8, 1, b); H(-5, -1, 10, 3, b); H(-5, 2, 10, 2, bD);
      for (let i = 0; i < 5; i++) H(-4 + i * 2, 2, 1, 2, b);
      H(-3, -1, 3, 1, bL);
    }
    if (L.glasses) {
      const f = '#1c1f26', lens = 'rgba(160,195,236,0.35)';
      if (dir === 'down') {
        R(g, ax - 4, hy + 4, 8, 1, f);
        R(g, ax - 4, hy + 5, 1, 2, f); R(g, ax - 1, hy + 5, 1, 1, f); R(g, ax, hy + 5, 1, 1, f); R(g, ax + 3, hy + 5, 1, 2, f);
        R(g, ax - 4, hy + 7, 3, 1, f); R(g, ax + 1, hy + 7, 3, 1, f);
        R(g, ax - 2, hy + 5, 1, 1, lens); R(g, ax + 1, hy + 5, 1, 1, lens);
      } else if (side) {
        R(g, ax + 1, hy + 4, 4, 1, f); R(g, ax + 1, hy + 7, 3, 1, f); R(g, ax + 4, hy + 5, 1, 2, f);
        R(g, ax - 2, hy + 5, 3, 1, f); R(g, ax + 3, hy + 5, 1, 1, lens);
      } else {
        R(g, hx - 5, hy + 5, 1, 1, f); R(g, hx + 4, hy + 5, 1, 1, f);
      }
    }

    if (L.earrings && !L.headset) {
      const gold = '#f2c14e';
      if (dir === 'down') { R(g, ax - 6, hy + 7, 1, 2, gold); R(g, ax + 5, hy + 7, 1, 2, gold); }
      else if (side) R(g, ax - 1, hy + 7, 1, 2, gold);
    }

    if (L.headset) {
      const hs = '#2b2f38';
      H(-4, -2, 8, 1, hs);
      if (dir === 'down') { H(-6, 4, 2, 3, hs); H(4, 4, 2, 3, hs); H(-5, 7, 1, 1, hs); H(-4, 8, 2, 1, C.twilight); }
      else if (dir === 'up') { H(-6, 4, 2, 3, hs); H(4, 4, 2, 3, hs); }
      else { H(-2, 4, 2, 3, hs); H(0, 7, 3, 1, hs); H(3, 7, 1, 1, C.twilight); }
    }
  }

  function outline(src) {
    const s = mk(FW, FH), sg = s.getContext('2d');
    sg.drawImage(src, 0, 0);
    sg.globalCompositeOperation = 'source-in';
    sg.fillStyle = C.outline;
    sg.fillRect(0, 0, FW, FH);
    const o = mk(FW, FH), og = o.getContext('2d');
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) og.drawImage(s, dx, dy);
    og.drawImage(src, 0, 0);
    return o;
  }

  function mirror(src) {
    const c = mk(FW, FH), g = c.getContext('2d');
    g.translate(FW, 0);
    g.scale(-1, 1);
    g.drawImage(src, 0, 0);
    return c;
  }

  const POSES = ['A', 'pass', 'B', 'pass'];
  // the standing frame breathing out: everything above the knees a pixel lower, the feet where they were

  // Folha de quadros do personagem: parado, piscando e 4 quadros de caminhada por direção
  // (a esquerda é a direita espelhada).
  DL.makeSheet = function (L) {
    const build = (dir, pose, closed) => {
      const c = mk(FW, FH);
      drawChar(c.getContext('2d'), dir, pose, L, closed);
      return outline(c);
    };
    const sheet = {};
    for (const d of ['down', 'up', 'right']) {
      const pass = build(d, 'pass', false);
      sheet[d] = {
        idle: build(d, 'idle', false),
        blink: build(d, 'idle', true),
        walk: POSES.map((p) => (p === 'pass' ? pass : build(d, p, false))),
      };
    }
    sheet.left = {
      idle: mirror(sheet.right.idle),
      blink: mirror(sheet.right.blink),
      walk: sheet.right.walk.map(mirror),
    };
    return sheet;
  };
  // (Venti) um quadro avulso do personagem, já com o contorno: poses que a folha não tem
  // ('sitA'/'sitB' sentado escrevendo, 'sitR' sentado parado, 'sitT' sentado falando, 'talk' em pé falando).
  // 'left' é o 'right' espelhado.
  DL.charFrame = function (L, dir, pose, closed) {
    const c = mk(FW, FH);
    drawChar(c.getContext('2d'), dir === 'left' ? 'right' : dir, pose, L, closed);
    const o = outline(c);
    return dir === 'left' ? mirror(o) : o;
  };
  DL.charOutline = () => C.outline;

  /* ------------------------------------------------------------------ */
  /* Equipamentos                                                        */
  /* ------------------------------------------------------------------ */
  function ledState(state, t, k) {
    if (state === 'warn') return { pwr: C.ok, act: blink(t, 1.4, k * 0.13) ? C.warn : C.warnDim };
    if (state === 'off') return { pwr: '#1b2027', act: '#1b2027' };
    return { pwr: C.ok, act: flick(t, k, 7 + (k % 5)) ? C.breeze : C.breezeDim };
  }

  function rackBody(g, px, py, tag) {
    R(g, px + 1, py + 14, 15, 2, 'rgba(0,0,0,0.35)');
    R(g, px, py - 24, 16, 6, '#272c35');
    R(g, px, py - 24, 16, 1, '#343b46');
    R(g, px + 3, py - 22, 10, 1, '#1d2129');
    R(g, px + 3, py - 20, 10, 1, '#1d2129');
    if (tag) R(g, px + 12, py - 23, 3, 2, tag);
    R(g, px, py - 18, 16, 32, '#181c22');
    R(g, px, py - 18, 1, 32, '#252b34');
    R(g, px + 15, py - 18, 1, 32, '#0b0d11');
    R(g, px + 2, py - 16, 12, 28, '#0c0f13');
    R(g, px + 1, py + 13, 14, 1, '#0b0d11');
  }

  function drawUnitRack(g, e, t) {
    const px = e.px, py = e.py;
    rackBody(g, px, py, e.tag);
    for (let k = 0; k < 9; k++) {
      const uy = py - 15 + k * 3, u = e.units[k];
      if (!u) {
        R(g, px + 3, uy, 10, 2, '#0f1216');
        R(g, px + 3, uy, 1, 2, '#1a1f26');
        R(g, px + 12, uy, 1, 2, '#1a1f26');
      } else if (u === 'patch') {
        R(g, px + 3, uy, 10, 2, '#59606b');
        R(g, px + 3, uy, 10, 1, '#6d7581');
        for (let i = 0; i < 4; i++) R(g, px + 4 + i * 2, uy + 1, 1, 1, '#1a1d22');
      } else if (u === 'switch') {
        // unitState (optional, per slot): 'new' | 'link' | 'fault' — set by the demo's operations layer
        const st = e.unitState && e.unitState[k];
        R(g, px + 3, uy, 10, 2, '#2a313b');
        R(g, px + 3, uy, 10, 1, '#39414d');
        for (let i = 0; i < 4; i++) R(g, px + 4 + i * 2, uy + 1, 1, 1, st === 'fault' && i === 2 ? (blink(t, 2.2, k * 0.3) ? C.warn : '#3a2414') : flick(t, e.seed * 7 + k * 5 + i, 5 + i) ? C.ok : C.okDim);
        R(g, px + 12, uy, 1, 2, flick(t, e.seed + k, 8) ? C.breeze : C.breezeDim);
      } else {
        const st = e.unitState && e.unitState[k];
        R(g, px + 3, uy, 10, 2, '#1c222b');
        R(g, px + 3, uy, 10, 1, '#262d38');
        R(g, px + 4, uy + 1, 5, 1, '#141920');
        if (st === 'new') {
          R(g, px + 10, uy, 1, 1, '#c98a3c');
          R(g, px + 12, uy, 1, 1, '#2a2f37');
        } else if (st === 'link') {
          R(g, px + 10, uy, 1, 1, C.ok);
          R(g, px + 12, uy, 1, 1, blink(t, 1.2, k * 0.2) ? '#c98a3c' : '#2a2f37');
        } else if (st === 'fault') {
          const on = blink(t, 2.2, k * 0.3);
          R(g, px + 10, uy, 1, 1, on ? C.warn : '#3a2414');
          R(g, px + 12, uy, 1, 1, on ? '#3a2414' : C.warn);
        } else {
          const s = ledState(e.state, t, e.seed * 13 + k);
          R(g, px + 10, uy, 1, 1, s.pwr);
          R(g, px + 12, uy, 1, 1, s.act);
        }
      }
    }
    if (e.cableLook === 'tidy') {
      // velcro'd bundle running down the right-hand cable manager
      R(g, px + 13, py - 15, 1, 26, '#4a7fb5');
      for (let y = py - 13; y < py + 10; y += 6) R(g, px + 13, y, 1, 1, '#c8ccd2');
    } else if (e.cableLook === 'messy') {
      const c = ['#4a7fb5', '#c9a13c', '#4a7fb5', '#b0485a'];
      for (let i = 0; i < 4; i++) {
        const x = px + 3 + ((e.seed * 3 + i * 5) % 10), y0 = py - 12 + i * 5;
        R(g, x, y0, 1, 3, c[i]);
        R(g, x + 1, y0 + 3, 2, 1, c[i]);
        R(g, x + 3, y0 + 4, 1, 2, c[i]);
      }
      R(g, px + 1, py + 6, 2, 1, '#c9a13c');
    }
    R(g, px + 13, py - 3, 1, 4, '#3a414c');
  }

  // Single rack units, used for catalog thumbnails.
  function drawUnitThumb(g, e, t) {
    const x = e.px, y = e.py;
    R(g, x, y + 4, 16, 6, '#1c222b');
    R(g, x, y + 4, 16, 1, '#2d3542');
    R(g, x, y + 9, 16, 1, '#11151b');
    if (e.kind === 'unit-patch') {
      R(g, x, y + 4, 16, 6, '#59606b');
      R(g, x, y + 4, 16, 1, '#6d7581');
      for (let i = 0; i < 6; i++) R(g, x + 2 + i * 2, y + 6, 1, 2, '#1a1d22');
      R(g, x + 1, y + 9, 14, 1, '#3d434c');
      return;
    }
    if (e.kind === 'unit-switch') {
      for (let i = 0; i < 6; i++) R(g, x + 2 + i * 2, y + 6, 1, 2, flick(t, i * 3, 5 + i) ? C.ok : C.okDim);
      R(g, x + 14, y + 6, 1, 2, C.breeze);
    } else {
      R(g, x + 2, y + 6, 8, 2, '#141920');
      R(g, x + 12, y + 6, 1, 1, C.ok);
      R(g, x + 14, y + 6, 1, 1, flick(t, 5, 7) ? C.breeze : C.breezeDim);
    }
  }

  function drawCrac(g, e, t) {
    const px = e.px, py = e.py, rot = e.rot | 0;
    if (rot) {
      R(g, px + 1, py + 14, 15, 2, 'rgba(0,0,0,0.35)');
      R(g, px, py - 24, 16, 6, '#4a515c');
      R(g, px, py - 24, 16, 1, '#5a626e');
      R(g, px, py - 18, 16, 32, '#363c46');
      R(g, px, py - 18, 1, 32, '#424955');
      R(g, px + 15, py - 18, 1, 32, '#262a31');
      if (rot === 1) {
        // return-air grille on the back
        R(g, px + 2, py - 16, 12, 24, '#2a2f38');
        for (let i = 0; i < 12; i++) R(g, px + 3, py - 15 + i * 2, 10, 1, '#1c2027');
        R(g, px + 3, py + 10, 3, 2, '#1c2027');
      } else {
        for (let i = 0; i < 5; i++) R(g, px + 4, py - 12 + i * 5, 8, 1, '#2c313a');
        const fx = rot === 2 ? px + 14 : px;
        R(g, fx, py - 18, 2, 32, '#424955');
        R(g, rot === 2 ? fx + 1 : fx, py - 15, 1, 2, C.breeze);
        R(g, rot === 2 ? fx + 1 : fx, py - 11, 1, 1, C.ok);
      }
      // the cold air still drifts out of the front
      const dx = rot === 2 ? 1 : rot === 3 ? -1 : 0;
      for (let k = 0; k < 3; k++) {
        const ph = (t * 0.55 + k * 0.33 + e.seed * 0.1) % 1;
        g.fillStyle = 'rgba(160,195,236,' + (0.35 * Math.sin(ph * Math.PI)).toFixed(3) + ')';
        if (dx) g.fillRect(Math.round(px + (dx > 0 ? 17 : -2) + dx * ph * 20), py - 6 + k * 4, 3, 1);
        else g.fillRect(px + 3 + k * 4, Math.round(py - 22 - ph * 10), 1, 2);
      }
      return;
    }
    R(g, px + 1, py + 14, 15, 2, 'rgba(0,0,0,0.35)');
    R(g, px, py - 24, 16, 6, '#4a515c');
    R(g, px, py - 24, 16, 1, '#5a626e');
    R(g, px, py - 18, 16, 32, '#363c46');
    R(g, px, py - 18, 1, 32, '#424955');
    R(g, px + 15, py - 18, 1, 32, '#262a31');
    R(g, px + 3, py - 16, 10, 5, C.midnight);
    R(g, px + 4, py - 14, 2, 2, C.breeze);
    R(g, px + 7, py - 15, 5, 1, C.screenInk);
    R(g, px + 7, py - 13, 4, 1, C.screenInk);
    for (let i = 0; i < 10; i++) R(g, px + 2, py - 9 + i * 2, 12, 1, '#272c34');
    R(g, px + 12, py - 16, 1, 1, C.ok);
    // cold air drifting into the aisle
    for (let k = 0; k < 4; k++) {
      const ph = (t * 0.55 + k * 0.27 + e.seed * 0.1) % 1;
      const a = 0.4 * Math.sin(ph * Math.PI);
      g.fillStyle = 'rgba(160,195,236,' + a.toFixed(3) + ')';
      g.fillRect(Math.round(px - 2 - ph * 22), py - 6 + k * 4, 3, 1);
    }
  }

  function drawPlant(g, e) {
    const px = e.px, py = e.py;
    const L1 = '#2c5f45', L2 = '#3c8059', L3 = '#58a578';
    R(g, px + 3, py + 13, 11, 2, 'rgba(0,0,0,0.3)');
    R(g, px + 7, py - 10, 2, 13, L1);
    R(g, px + 2, py - 6, 5, 3, L2); R(g, px + 9, py - 8, 5, 3, L2);
    R(g, px + 3, py - 1, 4, 3, L1); R(g, px + 10, py - 2, 4, 3, L1);
    R(g, px + 5, py - 12, 3, 3, L2); R(g, px + 8, py - 13, 3, 3, L3);
    R(g, px + 6, py - 4, 4, 3, L2);
    R(g, px + 3, py - 6, 2, 1, L3); R(g, px + 11, py - 8, 2, 1, L3);
    R(g, px + 4, py + 3, 8, 10, '#2d323b');
    R(g, px + 4, py + 3, 8, 1, '#3d434d');
    R(g, px + 5, py + 4, 6, 1, '#1a1d22');
    R(g, px + 11, py + 4, 1, 9, '#24282f');
  }

  const topCols = (c, base) => (c ? [c, shade(c, 0.16), shade(c, -0.3)] : base);
  // Tables keep their footprint (tw × th); variants change the material. The reception counter has a
  // tall front panel on the side it faces (rot 0 south, 1 north, 2 east, 3 west).
  const TABLE_LOOK = {
    '': { top: ['#323842', '#434a56', '#22262d'], leg: '#15181d' },
    wood: { top: ['#6b5038', '#8a6a4a', '#4a3626'], leg: '#3b2c22' },
    glass: { top: ['rgba(160,195,236,0.28)', 'rgba(220,235,255,0.5)', 'rgba(160,195,236,0.18)'], leg: '#9aa3b0' },
    bench: { top: ['#4a515c', '#5d6573', '#2f343c'], leg: '#22262d' },
    lab: { top: ['#d9dde3', '#eef0f3', '#9aa3b0'], leg: '#7d8590' },
    standing: { top: ['#e9e9e6', '#ffffff', '#b8bec7'], leg: '#2a2f38' },
    meeting: { top: ['#4a3626', '#6b5038', '#2e2118'], leg: '#1d1610' },
    small: { top: ['#3b2c22', '#5a4434', '#261c15'], leg: '#1d1610' },
    reception: { top: ['#e9e9e6', '#ffffff', '#b8bec7'], leg: '#2a2f38' },
  };
  function drawTable(g, e, t) {
    const px = e.px, py = e.py, w = e.tw * T, h = e.th * T, v = e.variant || '', rot = e.rot | 0;
    const L = TABLE_LOOK[v] || TABLE_LOOK[''];
    const top = h - T + 9;
    R(g, px + 1, py + h - 2, w - 2, 2, 'rgba(0,0,0,0.3)');
    if (v === 'standing') {
      // T legs with a column in the middle of each short side
      R(g, px + 3, py + h - 10, 2, 8, L.leg); R(g, px + w - 5, py + h - 10, 2, 8, L.leg);
      R(g, px + 1, py + h - 3, 6, 1, L.leg); R(g, px + w - 7, py + h - 3, 6, 1, L.leg);
    } else if (v !== 'reception') {
      R(g, px + 2, py + h - 10, 2, 8, L.leg);
      R(g, px + w - 4, py + h - 10, 2, 8, L.leg);
      if (v === 'bench' || v === 'lab') { R(g, px + 2, py + h - 6, w - 4, 2, shade(L.leg, 0.15)); R(g, px + 4, py + h - 7, Math.min(10, w - 8), 1, '#5a3a25'); }
    }
    const [tc, tl, td] = topCols(e.color, L.top);
    R(g, px, py - 4, w, top, tc);
    R(g, px, py - 4, w, 1, tl);
    if (v !== 'glass') R(g, px, py - 4, 1, top, v ? shade(tc, 0.08) : e.color ? shade(e.color, 0.08) : '#3a414c');
    R(g, px, py - 4 + top, w, 2, td);
    if (v === 'glass') { R(g, px + 2, py - 3, Math.min(8, w - 4), 1, 'rgba(255,255,255,0.4)'); }
    else if (v === 'lab' || v === 'bench') { R(g, px + 2, py - 2, w - 4, top - 4, v === 'lab' ? '#3a6ea5' : '#2f6a4a'); R(g, px + 2, py - 2, w - 4, 1, v === 'lab' ? '#5a8ec5' : '#3f8a60'); if (v === 'bench') { R(g, px + w - 6, py - 7, 4, 4, '#5d6573'); R(g, px + w - 5, py - 8, 2, 1, '#8a919c'); } }
    else if (v === 'meeting') { const cx = px + Math.floor(w / 2), cy = py - 4 + Math.floor(top / 2); R(g, cx - 3, cy - 1, 6, 3, '#1d1610'); R(g, cx - 2, cy, 1, 1, C.ok); R(g, cx + 1, cy, 1, 1, '#3a414c'); }
    else if (v === 'standing') { R(g, px + w - 6, py - 4 + top - 1, 4, 1, '#2a2f38'); R(g, px + w - 5, py - 4 + top - 1, 1, 1, C.breeze); }
    else if (v === 'small') { R(g, px + 1, py - 4 + top, w - 2, 1, shade(tc, -0.4)); }
    if (v === 'reception') {
      // the tall front panel on the facing side, with an accent stripe
      const acc = e.accent || '#7ee0a1', pc = '#2a2f38', pl = '#3a414c';
      if (rot === 0) { R(g, px, py + h - 14, w, 13, pc); R(g, px, py + h - 14, w, 1, pl); R(g, px, py + h - 8, w, 1, acc); R(g, px - 1, py + h - 16, w + 2, 2, tl); }
      else if (rot === 1) { R(g, px, py - 9, w, 6, pc); R(g, px, py - 9, w, 1, pl); R(g, px - 1, py - 11, w + 2, 2, tl); R(g, px + 2, py + h - 10, w - 4, 6, '#20242c'); R(g, px + 3, py + h - 9, 4, 3, '#14171c'); }
      else { const fx = rot === 2 ? px + w - 4 : px; R(g, fx, py - 8, 4, h + 6, pc); R(g, fx, py - 8, 4, 1, pl); R(g, rot === 2 ? fx + 3 : fx, py - 6, 1, h + 3, acc); R(g, px, py + h - 3, w, 2, '#121418'); }
    }
  }

  function pool(g, x, y, r, col) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, col);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  DL.pool = pool;

  function floorTile(g, px, py, perf) {
    R(g, px, py, 16, 16, '#10151c');
    R(g, px + 1, py + 1, 15, 15, perf ? '#17202a' : '#151a22');
    R(g, px + 1, py + 1, 15, 1, perf ? '#1c2633' : '#1a202a');
    if (perf) {
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) R(g, px + 3 + i * 3, py + 3 + j * 3, 1, 1, '#0c1118');
    } else {
      for (const [a, b] of [[2, 2], [13, 2], [2, 13], [13, 13]]) R(g, px + a, py + b, 1, 1, '#1f2632');
    }
  }

  function carpet(g, px, py, x, y) {
    R(g, px, py, 16, 16, '#101219');
    R(g, px, py + 15, 16, 1, '#0d0f15');
    for (let i = 0; i < 7; i++) {
      const h1 = hash(x * 131 + y * 71 + i * 17), h2 = hash(x * 37 + y * 113 + i * 29);
      R(g, px + Math.floor(h1 * 16), py + Math.floor(h2 * 15), 1, 1, '#151824');
    }
  }

  DL.floorTile = floorTile;
  DL.carpet = carpet;

  // Qual desenho usar para cada tipo de objeto.
  DL.drawItem = function (g, e, t) {
    switch (e.kind) {
      case 'rack': drawUnitRack(g, e, t); break;
      case 'crac': drawCrac(g, e, t); break;
      case 'plant': drawPlant(g, e); break;
      case 'table': drawTable(g, e, t); break;
      // (Venti) em cima de uma mesa a unidade sobe 11 px, para ficar apoiada no tampo
      case 'unit-server': case 'unit-switch': case 'unit-patch': drawUnitThumb(g, e.host ? Object.assign(Object.create(e), { py: e.py - 11 }) : e, t); break;
    }
  };

  // Ponto onde o jogador fica para interagir com o objeto (na frente dele).
  DL.itemGeom = function (e) {
    e.ix = e.px + e.tw * 8;
    e.iy = e.py + e.th * T + 7;
  };
})();

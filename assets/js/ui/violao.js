/* Venti Experience — o violão do lounge (parede verde da faculdade), de verdade tocável.
     NOTAS     o braço do violão com 18 notas (Dó a Fá agudo): teclado, mouse ou toque
     ACORDES   uma roda com 8 acordes (1 a 8); arrastar o mouse nas cordas (ou ↓ ↑) faz a batida
     MÚSICAS   prontas, por gênero: "Ouvir" toca sozinho; "Aprender" espera o jogador acertar nota por nota
     GRAVAR    guarda o que o jogador tocar (fica salvo no navegador)
   O som é sintetizado (Karplus-Strong: uma corda dedilhada), sem arquivos de áudio.
   As melodias são tradicionais / em domínio público; as levadas são próprias; o hino do Flamengo
   (Lamartine Babo) entra só com o trecho inicial.
   faculdade.js chama DL.Violao.abrir(game, item); as teclas chegam por DL.Violao.key(ev). */
(function () {
  'use strict';
  const DL = window.DL;
  const CHAVE = 'venti_violao_v1';

  /* ------------------------------------------------------------------ */
  /* Notas e acordes                                                     */
  /* ------------------------------------------------------------------ */
  const CORDAS = [64, 59, 55, 50, 45, 40]; // mi agudo (em cima) … mi grave (embaixo): o som das cordas soltas
  const NOMES = { C: 'Dó', 'C#': 'Dó#', D: 'Ré', 'D#': 'Ré#', E: 'Mi', F: 'Fá', 'F#': 'Fá#', G: 'Sol', 'G#': 'Sol#', A: 'Lá', 'A#': 'Lá#', B: 'Si' };
  const ORDEM = Object.keys(NOMES);
  // as teclas (como um teclado de piano): [code, o que aparece na tela]
  const TECLAS = [['KeyA', 'A'], ['KeyW', 'W'], ['KeyS', 'S'], ['KeyE', 'E'], ['KeyD', 'D'], ['KeyF', 'F'], ['KeyT', 'T'], ['KeyG', 'G'], ['KeyY', 'Y'],
    ['KeyH', 'H'], ['KeyU', 'U'], ['KeyJ', 'J'], ['KeyK', 'K'], ['KeyO', 'O'], ['KeyL', 'L'], ['KeyP', 'P'], ['Semicolon', 'Ç'], ['Quote', '~']];
  // nota n (0 = Dó … 17 = Fá agudo): onde ela fica no braço (corda 0–5, casa 0–4), na primeira posição
  const NOTAS = TECLAS.map(([code, tecla], n) => {
    const som = 48 + n, nome = ORDEM[n % 12];
    const corda = som >= 64 ? 0 : som >= 59 ? 1 : som >= 55 ? 2 : som >= 50 ? 3 : 4;
    return { n, code, tecla, som, nome: NOMES[nome] + (n >= 12 ? '’' : ''), corda, casa: som - CORDAS[corda], sus: nome.length > 1 };
  });
  // acordes: do mi grave ao mi agudo (x = não toca)
  const FORMAS = {
    C: 'x32010', D: 'xx0232', Dm: 'xx0231', E: '022100', Em: '022000', F: '133211', G: '320003', A: 'x02220', Am: 'x02210', Bm: 'x24432', 'F#m': '244222',
    A7: 'x02020', B7: 'x21202', C7: 'x32310', D7: 'xx0212', E7: '020100', G7: '320001', Am7: 'x02010', Dm7: 'xx0211', C7M: 'x32000', Bb: 'x13331',
  };
  const forma = (a) => FORMAS[a].split('').map((c) => (c === 'x' ? -1 : +c)).reverse(); // [mi agudo … mi grave]
  const CAMPOS = {
    'Alegre (Dó)': ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'G7', 'C7'],
    'Sertanejo (Sol)': ['G', 'Am', 'Bm', 'C', 'D', 'Em', 'D7', 'G7'],
    'Praia (Ré)': ['D', 'Em', 'F#m', 'G', 'A', 'Bm', 'A7', 'D7'],
    'Triste (Lá menor)': ['Am', 'Dm', 'E7', 'F', 'G', 'C', 'Em', 'A7'],
    'Rock (Mi)': ['E', 'G', 'A', 'B7', 'D', 'C', 'Em', 'E7'],
    'Bossa': ['C7M', 'Am7', 'Dm7', 'G7', 'F', 'E7', 'A7', 'Em'],
  };

  /* ------------------------------------------------------------------ */
  /* Músicas: n = notas ("Mi" = E; ' = oitava de cima; :2 = duração em tempos) · l = levada de acordes         */
  /* levada: [acorde, batida de 8 colcheias]: D para baixo · U para cima · B baixo · x abafado · 1–6 uma corda  */
  /* ------------------------------------------------------------------ */
  const MUSICAS = [
    { g: 'Memes', nome: 'Hino do Flamengo', sub: 'só o trecho da torcida · Lamartine Babo', bpm: 132, n: "F#:.5 F#:.5 G:1 F#:.5 A:1 E:1.5 F#:.5 A:1 F#:.5 E:1 D:2 D:.5 E:.5 D:.5 B:1 G:.5 D':1.5 B:.5 A:3" },
    { g: 'Memes', nome: 'Olha o gás!', sub: 'Für Elise, o caminhão do gás · Beethoven', bpm: 138, d: 0.5, n: "E' D#' E' D#' E' B D' C' A:1.5 C E A B:1.5 E G# B C':1.5 E E' D#' E' D#' E' B D' C' A:1.5 C E A B:1.5 E C' B A:2" },
    { g: 'Memes', nome: 'Celular tijolão', sub: 'Gran Vals, o toque antigo · Tárrega', bpm: 178, n: "E':.5 D':.5 F# G# C#':.5 B:.5 D E B:.5 A:.5 C# E A:3" },
    { g: 'Memes', nome: 'Reprovei em cálculo', sub: 'Marcha fúnebre · Chopin', bpm: 92, n: 'D:2 D:1.5 D:.5 D:2 F:1.5 E:.5 E:1.5 D:.5 D:1.5 C#:.5 D:3' },
    { g: 'Memes', nome: 'Saiu a nota da prova', sub: 'Quinta sinfonia, dramático · Beethoven', bpm: 150, d: 0.5, n: "G G G D#:3 F F F D:3 G G G D# G# G# G# G D#' D#' D#' C':2.5" },
    { g: 'Memes', nome: 'O vilão chegou', sub: 'Tocata em Ré menor · Bach', bpm: 84, n: 'A:.25 G:.25 A:2.5 G:.25 F:.25 E:.25 D:.25 C#:1 D:3' },
    { g: 'Memes', nome: 'Fugindo do professor', sub: 'O salão do rei da montanha · Grieg', bpm: 138, d: 0.5, n: "D E F G A F A:1 G# E G#:1 G D# G:1 D E F G A F A D' C' A F A C':2" },
    { g: 'Memes', nome: 'Atrasado pra aula', sub: 'Can-can · Offenbach', bpm: 176, n: "C:2 D:.5 F:.5 E:.5 D:.5 G G G:.5 A:.5 E:.5 F:.5 D D D:.5 F:.5 E:.5 D:.5 C:.5 C':.5 B:.5 A:.5 G:.5 F:.5 E:.5 D:.5 C:2" },
    { g: 'Memes', nome: 'La Cucaracha', sub: 'buzina de kombi · folclore mexicano', bpm: 150, n: 'C:.5 C:.5 C:.5 F:1.5 A:1 C:.5 C:.5 C:.5 F:1.5 A:2 F:1 F:.5 E:.5 E:.5 D:.5 D:.5 C:2' },

    { g: 'Rock', nome: 'Rock de garagem', sub: 'levada em Mi', bpm: 132, l: [['E', 'D.DxD.DU'], ['G', 'D.DxD.DU'], ['A', 'D.DxD.DU'], ['D', 'D.DxDUDU'], ['E', 'D.DxD.DU'], ['G', 'D.DxD.DU'], ['A', 'D.DxD.DU'], ['E', 'D.......']] },
    { g: 'Rock', nome: 'Casa do sol nascente', sub: 'dedilhado · folk tradicional', bpm: 118, l: [['Am', '5432123.'], ['C', '5432123.'], ['D', '4321232.'], ['F', '6432123.'], ['Am', '5432123.'], ['C', '5432123.'], ['E7', '6432123.'], ['Am', 'D.......']] },
    { g: 'Rock', nome: 'Balada do intervalo', sub: 'levada lenta', bpm: 84, l: [['Em', 'D..DU.UD'], ['C', 'D..DU.UD'], ['G', 'D..DU.UD'], ['D', 'D..DUDUD'], ['Em', 'D..DU.UD'], ['C', 'D..DU.UD'], ['D', 'D..DU.UD'], ['G', 'D.......']] },
    { g: 'Sertanejo', nome: 'Modão da estrada', sub: 'levada em Sol', bpm: 100, l: [['G', 'B.D.B.DU'], ['D', 'B.D.B.DU'], ['Em', 'B.D.B.DU'], ['C', 'B.D.B.DU'], ['G', 'B.D.B.DU'], ['D7', 'B.D.B.DU'], ['G', 'D.......']] },
    { g: 'Sertanejo', nome: 'Sofrência universitária', sub: 'levada romântica', bpm: 76, l: [['Am', 'B.DUB.DU'], ['F', 'B.DUB.DU'], ['C', 'B.DUB.DU'], ['G', 'B.DUB.DU'], ['Am', 'B.DUB.DU'], ['F', 'B.DUB.DU'], ['G', 'B.DUBUDU'], ['C', 'D.......']] },
    { g: 'Forró', nome: 'Baião de Canaã', sub: 'levada de baião', bpm: 112, l: [['D', 'B..DB.D.'], ['G', 'B..DB.D.'], ['A7', 'B..DB.D.'], ['D', 'B..DB.DU'], ['D7', 'B..DB.D.'], ['G', 'B..DB.D.'], ['A7', 'B..DB.DU'], ['D', 'D.......']] },
    { g: 'Forró', nome: 'Arrasta-pé da Serra', sub: 'levada rápida', bpm: 152, l: [['G', 'B.D.B.D.'], ['C', 'B.D.B.D.'], ['D7', 'B.D.B.D.'], ['G', 'B.DUB.DU'], ['Em', 'B.D.B.D.'], ['Am', 'B.D.B.D.'], ['D7', 'B.DUB.DU'], ['G', 'D.......']] },
    { g: 'Samba', nome: 'Roda de samba', sub: 'levada em Dó', bpm: 104, l: [['C', 'B.DUxDUD'], ['A7', 'B.DUxDUD'], ['Dm', 'B.DUxDUD'], ['G7', 'B.DUxDUD'], ['C', 'B.DUxDUD'], ['A7', 'B.DUxDUD'], ['G7', 'B.DUxDUD'], ['C', 'D.......']] },
    { g: 'Samba', nome: 'Pagode do lounge', sub: 'levada em Lá menor', bpm: 96, l: [['Am', 'B.D.xUDU'], ['Dm', 'B.D.xUDU'], ['G', 'B.D.xUDU'], ['C', 'B.D.xUDU'], ['F', 'B.D.xUDU'], ['Dm', 'B.D.xUDU'], ['E7', 'B.DUxUDU'], ['Am', 'D.......']] },
    { g: 'MPB e bossa', nome: 'Bossa da tarde', sub: 'levada suave', bpm: 116, l: [['C7M', 'B.D.BD.D'], ['Am7', 'B.D.BD.D'], ['Dm7', 'B.D.BD.D'], ['G7', 'B.D.BD.D'], ['C7M', 'B.D.BD.D'], ['Am7', 'B.D.BD.D'], ['Dm7', 'B.D.BD.D'], ['C7M', 'D.......']] },
    { g: 'Reggae', nome: 'Reggae do parque', sub: 'levada no contratempo', bpm: 84, l: [['Am', 'x.U.x.U.'], ['G', 'x.U.x.U.'], ['F', 'x.U.x.U.'], ['G', 'x.UUx.U.'], ['Am', 'x.U.x.U.'], ['G', 'x.U.x.U.'], ['F', 'x.U.x.UU'], ['Am', 'D.......']] },
    { g: 'Blues', nome: 'Blues do estagiário', sub: '12 compassos em Mi', bpm: 108, l: [['E7', 'B.DxB.DU'], ['E7', 'B.DxB.DU'], ['E7', 'B.DxB.DU'], ['E7', 'B.DxB.DU'], ['A7', 'B.DxB.DU'], ['A7', 'B.DxB.DU'], ['E7', 'B.DxB.DU'], ['E7', 'B.DxB.DU'], ['B7', 'B.DxB.DU'], ['A7', 'B.DxB.DU'], ['E7', 'B.DxB.DU'], ['E7', 'D.......']] },
    { g: 'Funk', nome: 'Batidão no violão', sub: 'levada abafada', bpm: 130, l: [['Em', 'D.xDx.Dx'], ['Em', 'D.xDx.DU'], ['Am', 'D.xDx.Dx'], ['B7', 'D.xDxxDU'], ['Em', 'D.xDx.Dx'], ['Em', 'D.xDx.DU'], ['B7', 'D.xDxxDU'], ['Em', 'D.......']] },
    { g: 'Clássica', nome: 'Ode à Alegria', sub: 'Beethoven', bpm: 120, n: 'E E F G G F E D C C D E E:1.5 D:.5 D:2 E E F G G F E D C C D E D:1.5 C:.5 C:2' },
    { g: 'Clássica', nome: 'Cânone', sub: 'Pachelbel', bpm: 76, n: "E':2 D':2 C':2 B:2 A:2 G:2 A:2 B:2 C' B C' C E G D F E C E G C' B A C':3" },
    { g: 'Clássica', nome: 'Greensleeves', sub: 'tradicional inglesa', bpm: 132, n: "A C':2 D' E':1.5 F':.5 E' D':2 B G:1.5 A:.5 B C':2 A A:1.5 G#:.5 A B:2 G# E:2" },
    { g: 'Folclore e festa', nome: 'Parabéns pra você', sub: 'tradicional', bpm: 112, n: "C:.75 C:.25 D C F E:2 C:.75 C:.25 D C G F:2 C:.75 C:.25 C' A F E D:2 A#:.75 A#:.25 A F G F:3" },
    { g: 'Folclore e festa', nome: 'Brilha, brilha, estrelinha', sub: 'tradicional', bpm: 112, n: 'C C G G A A G:2 F F E E D D C:2 G G F F E E D:2 G G F F E E D:2 C C G G A A G:2 F F E E D D C:2' },
    { g: 'Folclore e festa', nome: 'Frei João', sub: 'tradicional', bpm: 126, n: "F G A F F G A F A A# C':2 A A# C':2 C':.5 D':.5 C':.5 A#:.5 A F C':.5 D':.5 C':.5 A#:.5 A F F C F:2 F C F:2" },
    { g: 'Folclore e festa', nome: 'Bella Ciao', sub: 'tradicional italiana (trecho)', bpm: 138, n: "E:.5 A:.5 B:.5 C':.5 A:1.5 E:.5 A:.5 B:.5 C':.5 A:1.5 E:.5 A:.5 B:.5 C':1 B:.5 A:.5 C':1 B:.5 A:.5 E':1 E':1 E':2" },
    { g: 'Folclore e festa', nome: 'Noite feliz de formatura', sub: 'Jingle Bells · Pierpont', bpm: 160, n: 'E E E:2 E E E:2 E G C:1.5 D:.5 E:4 F F F:1.5 F:.5 F E E E:.5 E:.5 E D D E D:2 G:2' },
    { g: 'Folclore e festa', nome: 'Quando os santos', sub: 'spiritual tradicional', bpm: 150, n: 'C E F G:3 C E F G:3 C E F G:2 E:2 C:2 E:2 D:4' },
  ];
  MUSICAS.forEach((m, i) => {
    m.id = i;
    // linha do tempo: passos = o que o jogador aprende; eventos = o que o "Ouvir" toca
    m.passos = []; m.eventos = [];
    let t = 0;
    const tempo = 60 / m.bpm;
    if (m.n) for (const tk of m.n.trim().split(/\s+/)) {
      const [, nota, oit, dur] = /^([A-G]#?)('?)(?::([\d.]+))?$/.exec(tk), n = ORDEM.indexOf(nota) + (oit ? 12 : 0), d = (dur ? +dur : m.d || 1) * tempo;
      m.passos.push({ n, t, d });
      m.eventos.push({ t, n, passo: m.passos.length - 1 });
      t += d;
    } else for (const [ac, bat] of m.l) {
      m.passos.push({ ac, t, d: 4 * tempo });
      [...bat].forEach((c, k) => { if (c !== '.') m.eventos.push({ t: t + (k * tempo) / 2, ac, bat: c, passo: m.passos.length - 1 }); });
      t += 4 * tempo;
    }
    m.fim = t + 0.6;
  });
  const GENEROS = ['Memes', ...new Set(MUSICAS.map((m) => m.g).filter((g) => g !== 'Memes'))];

  /* ------------------------------------------------------------------ */
  /* Som: corda dedilhada (Karplus-Strong)                               */
  /* ------------------------------------------------------------------ */
  let actx = null, saida = null;
  const BUF = new Map();
  function audio() {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { actx = new AC(); } catch (_) { return null; }
      saida = actx.createGain();
      saida.gain.value = S.volume;
      const comp = actx.createDynamicsCompressor(), corpo = actx.createBiquadFilter();
      corpo.type = 'peaking'; corpo.frequency.value = 190; corpo.Q.value = 0.9; corpo.gain.value = 4; // a caixa do violão
      saida.connect(corpo); corpo.connect(comp); comp.connect(actx.destination);
    }
    if (actx.state === 'suspended') actx.resume().catch(() => {});
    return actx;
  }
  function corda(midi) {
    if (BUF.has(midi)) return BUF.get(midi);
    // atraso total da corda = N + fr + 0,5 amostras (o 0,5 é do filtro que tira o brilho; fr afina)
    const sr = actx.sampleRate, f = 440 * Math.pow(2, (midi - 69) / 12), per = sr / f - 0.5, N = Math.floor(per), fr = per - N, len = Math.floor(sr * 2.4);
    const b = actx.createBuffer(1, len, sr), x = b.getChannelData(0), M = N + 3, copia = new Float32Array(M);
    // o dedo puxa a corda: ruído suavizado, sem a parte que se anula no ponto do toque
    let ant = 0;
    for (let i = 0; i < M; i++) { ant = 0.55 * ant + 0.45 * (Math.random() * 2 - 1); copia[i] = ant; }
    const pt = Math.max(1, Math.floor(M * 0.17));
    let media = 0;
    for (let i = 0; i < M; i++) { x[i] = copia[i] - 0.85 * copia[(i + M - pt) % M]; media += x[i] / M; }
    for (let i = 0; i < M; i++) x[i] -= media;
    const perda = Math.pow(0.001, 1 / (f * (midi < 52 ? 3.4 : 2.6))), c0 = 0.5 * (1 - fr) * perda, c1 = 0.5 * perda, c2 = 0.5 * fr * perda;
    let pico = 0.0001;
    for (let i = 0; i < M; i++) pico = Math.max(pico, Math.abs(x[i]));
    for (let i = M; i < len; i++) x[i] = c0 * x[i - N] + c1 * x[i - N - 1] + c2 * x[i - N - 2];
    for (let i = 0; i < len; i++) x[i] = (x[i] / pico) * Math.min(1, i / 40) * (i > len - 2000 ? (len - i) / 2000 : 1);
    BUF.set(midi, b);
    return b;
  }
  const soando = [null, null, null, null, null, null]; // o que soa em cada corda (uma nota nova corta a anterior)
  function pluck(midi, idx, atraso, forca) {
    const a = audio();
    if (!a) return;
    const t = a.currentTime + (atraso || 0), s = a.createBufferSource(), g = a.createGain();
    s.buffer = corda(midi);
    g.gain.setValueAtTime(forca || 0.5, t);
    s.connect(g); g.connect(saida);
    s.start(t);
    if (idx != null) {
      const v = soando[idx];
      if (v) { try { v.g.gain.setTargetAtTime(0.0001, t, 0.02); v.s.stop(t + 0.2); } catch (_) { /* já parou */ } }
      soando[idx] = { s, g };
      setTimeout(() => { S.vib[idx] = { t: performance.now(), f: forca || 0.5 }; }, (atraso || 0) * 1000);
    }
  }
  function abafado() {
    const a = audio();
    if (!a) return;
    const t = a.currentTime, b = a.createBuffer(1, 2200, a.sampleRate), d = b.getChannelData(0), s = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter();
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    f.type = 'bandpass'; f.frequency.value = 900; g.gain.value = 0.35;
    s.buffer = b; s.connect(f); f.connect(g); g.connect(saida); s.start(t);
    for (let k = 0; k < 6; k++) { const v = soando[k]; if (v) try { v.g.gain.setTargetAtTime(0.0001, t, 0.015); } catch (_) { /* já parou */ } }
  }
  function silencio() {
    for (let k = 0; k < 6; k++) { const v = soando[k]; if (v && actx) try { v.g.gain.setTargetAtTime(0.0001, actx.currentTime, 0.05); } catch (_) { /* já parou */ } soando[k] = null; }
  }

  /* ------------------------------------------------------------------ */
  /* Estado                                                              */
  /* ------------------------------------------------------------------ */
  const S = {
    aberto: false, game: null, item: null, modo: 'notas', oitava: 1, volume: 0.8, campo: 'Alegre (Dó)', acorde: 0, genero: 'Memes', musica: null,
    tocando: null, aprender: null, gravando: null, gravacao: [], aprendidas: [], vib: [], brilho: {}, msg: '', arrasto: null, raf: 0, roda: -1,
  };
  try { const d = JSON.parse(localStorage.getItem(CHAVE) || '{}'); if (Array.isArray(d.gravacao)) S.gravacao = d.gravacao.slice(0, 2000); if (Array.isArray(d.aprendidas)) S.aprendidas = d.aprendidas; } catch (_) { /* sem nada salvo */ }
  const salvar = () => { try { localStorage.setItem(CHAVE, JSON.stringify({ gravacao: S.gravacao, aprendidas: S.aprendidas })); } catch (_) { /* sem espaço */ } };
  const acordes = () => CAMPOS[S.campo];
  const acordeAtual = () => S.acordeSolto || acordes()[S.acorde];
  const gravar = (ev) => { if (S.gravando != null && S.gravacao.length < 2000) S.gravacao.push(Object.assign({ t: (performance.now() - S.gravando) / 1000 }, ev)); };
  function notasNoAr() { if (DL.fx && S.game && S.game.player) DL.fx.burst(S.game.player.x, S.game.player.y, 24, 'note'); }

  /* ---- tocar ---- */
  function tocarNota(n, quem) {
    const N = NOTAS[n];
    if (!N) return;
    pluck(N.som + 12 * S.oitava, N.corda, 0, 0.6);
    S.brilho[n] = performance.now();
    notasNoAr();
    if (quem !== 'auto') { gravar({ n }); conferir({ n }); }
  }
  function batida(tipo, ac, quem) {
    const F = forma(ac);
    if (tipo === 'x') { abafado(); for (let k = 0; k < 6; k++) S.vib[k] = { t: performance.now(), f: 0.15 }; }
    else if (tipo === 'B') { const k = [5, 4, 3].find((c) => F[c] >= 0); pluck(CORDAS[k] + F[k], k, 0, 0.65); }
    else if (tipo >= '1' && tipo <= '6') { const k = +tipo - 1; if (F[k] >= 0) pluck(CORDAS[k] + F[k], k, 0, 0.5); }
    else {
      let i = 0;
      for (const k of tipo === 'U' ? [0, 1, 2, 3] : [5, 4, 3, 2, 1, 0]) if (F[k] >= 0) pluck(CORDAS[k] + F[k], k, i++ * (tipo === 'U' ? 0.012 : 0.018), tipo === 'U' ? 0.3 : 0.42);
    }
    notasNoAr();
    if (quem !== 'auto') { gravar({ ac, bat: tipo }); if (tipo === 'D' || tipo === 'U') conferir({ ac }); }
  }
  // uma corda só (arrastando o mouse): no acorde ou solta
  function umaCorda(k) {
    const ac = acordeAtual(), F = S.modo === 'acordes' ? forma(ac) : [0, 0, 0, 0, 0, 0];
    if (F[k] < 0) return;
    pluck(CORDAS[k] + F[k], k, 0, 0.45);
    if (S.modo === 'acordes') gravar({ ac, bat: String(k + 1) }); else gravar({ corda: k });
    notasNoAr();
  }

  /* ---- tocar sozinho (Ouvir / minha música) ---- */
  function tocarEventos(eventos, fim, aoPasso, aoFim) {
    parar();
    audio();
    const ini = performance.now() + 250, st = { i: 0, timer: 0 };
    const passo = () => {
      const agora = (performance.now() - ini) / 1000;
      while (st.i < eventos.length && eventos[st.i].t <= agora + 0.004) {
        const e = eventos[st.i++];
        if (e.n != null) tocarNota(e.n, 'auto');
        else if (e.corda != null) pluck(CORDAS[e.corda], e.corda, 0, 0.45);
        else { mostrarAcorde(e.ac); batida(e.bat, e.ac, 'auto'); }
        if (aoPasso) aoPasso(e);
      }
      if (st.i >= eventos.length && agora >= fim) { S.tocando = null; if (aoFim) aoFim(); atualizar(); return; }
      st.timer = setTimeout(passo, 12);
    };
    S.tocando = st;
    passo();
  }
  function parar() {
    if (S.tocando) clearTimeout(S.tocando.timer);
    S.tocando = null;
    S.aprender = null;
    S.acordeSolto = null;
    silencio();
  }
  function mostrarAcorde(ac) {
    const i = acordes().indexOf(ac);
    if (i >= 0) { S.acorde = i; S.acordeSolto = null; } else S.acordeSolto = ac;
  }
  function ouvir() {
    const m = S.musica;
    S.passo = 0;
    S.modo = m.n ? 'notas' : 'acordes';
    if (m.l) escolherCampo(m);
    tocarEventos(m.eventos, m.fim, (e) => { if (S.passo !== e.passo) { S.passo = e.passo; trilha(); } }, () => { S.passo = -1; S.msg = 'Fim! Agora aperte Aprender e toque você.'; });
    S.msg = '♪ ' + m.nome;
    atualizar();
  }
  // o campo (roda) que tem mais acordes da música
  function escolherCampo(m) {
    let melhor = S.campo, pts = -1;
    const usa = new Set(m.l.map((x) => x[0]));
    for (const c in CAMPOS) { const p = CAMPOS[c].filter((a) => usa.has(a)).length; if (p > pts) { pts = p; melhor = c; } }
    S.campo = melhor; S.acorde = 0; S.acordeSolto = null;
    const faltam = [...usa].filter((a) => !CAMPOS[melhor].includes(a));
    if (faltam.length) { // monta uma roda com os acordes da música
      S.campo = 'Desta música';
      CAMPOS['Desta música'] = [...usa, ...CAMPOS[melhor].filter((a) => !usa.has(a))].slice(0, 8);
    }
  }
  function aprender() {
    const m = S.musica;
    parar();
    S.modo = m.n ? 'notas' : 'acordes';
    if (m.l) escolherCampo(m);
    S.passo = 0;
    S.aprender = { erros: 0 };
    S.msg = m.n ? 'Toque a nota que está piscando. A música espera por você.' : 'Escolha o acorde que está piscando (1 a 8) e faça a batida (↓ ou arraste nas cordas).';
    atualizar();
  }
  function conferir(o) {
    if (!S.aprender || !S.musica) return;
    const p = S.musica.passos[S.passo];
    if (!p) return;
    const ok = p.n != null ? o.n === p.n : o.ac === p.ac;
    if (!ok) { S.aprender.erros++; S.msg = p.n != null ? 'Quase! A próxima é ' + NOTAS[p.n].nome + ' (tecla ' + NOTAS[p.n].tecla + ').' : 'Quase! O acorde é ' + p.ac + '.'; rodape(); return; }
    S.passo++;
    if (S.passo >= S.musica.passos.length) {
      const total = S.musica.passos.length, pct = Math.round((100 * total) / (total + S.aprender.erros)), nome = S.musica.nome;
      S.aprender = null;
      if (!S.aprendidas.includes(nome)) { S.aprendidas.push(nome); salvar(); }
      S.msg = '★ Você aprendeu “' + nome + '”! Precisão: ' + pct + '%';
      if (DL.fx && S.game) for (let i = 0; i < 3; i++) notasNoAr();
      S.passo = -1;
      setTimeout(() => { if (S.aberto) { [0, 4, 7, 12].forEach((n, i) => setTimeout(() => S.aberto && tocarNota(n, 'auto'), i * 90)); } }, 450);
      atualizar();
      return;
    }
    S.msg = 'Isso! ' + S.passo + '/' + S.musica.passos.length;
    trilha(); rodape();
  }
  function alternarGravacao() {
    if (S.gravando != null) { S.gravando = null; salvar(); S.msg = S.gravacao.length ? 'Gravado! Aperte “Minha música” para ouvir.' : 'Nada foi tocado.'; }
    else { parar(); audio(); S.gravacao = []; S.gravando = performance.now(); S.msg = '● Gravando… toque à vontade e aperte Parar gravação.'; }
    atualizar();
  }
  function ouvirGravacao() {
    if (!S.gravacao.length) return;
    if (S.gravando != null) { S.gravando = null; salvar(); }
    const t0 = S.gravacao[0].t, ev = S.gravacao.map((e) => Object.assign({}, e, { t: e.t - t0 }));
    S.modo = ev.some((e) => e.ac) ? 'acordes' : 'notas';
    S.musica = null;
    tocarEventos(ev, ev[ev.length - 1].t + 1.5, null, () => { S.msg = 'Essa foi a sua música!'; });
    S.msg = '♪ Minha música';
    atualizar();
  }

  /* ------------------------------------------------------------------ */
  /* Desenho do violão (canvas)                                          */
  /* ------------------------------------------------------------------ */
  const W = 900, H = 300, X0 = 96, CASA = 100, Y0 = 62, DY = 36, XB = X0 + 4 * CASA + 40; // pestana, casas, cordas, onde começa o corpo
  const yCorda = (k) => Y0 + k * DY;
  const xCasa = (c) => (c === 0 ? X0 - 26 : X0 + (c - 0.5) * CASA);
  const RODA = { x: 752, y: 150, r: 122, r0: 46 };
  let cv = null, g = null;
  function redondo(x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
  function desenhar() {
    if (!S.aberto) return;
    const agora = performance.now();
    g.clearRect(0, 0, W, H);
    // o corpo
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#d79a55'); gr.addColorStop(0.5, '#c5833f'); gr.addColorStop(1, '#9c602a');
    g.fillStyle = gr; redondo(XB - 4, -30, W - XB + 80, H + 60, 90); g.fill();
    g.strokeStyle = 'rgba(80,42,16,0.16)'; g.lineWidth = 1;
    for (let y = 6; y < H; y += 9) { g.beginPath(); g.moveTo(XB + 8, y); g.bezierCurveTo(XB + 120, y + 5 * Math.sin(y), XB + 240, y - 5 * Math.cos(y * 2), W, y + 2); g.stroke(); }
    // boca
    const bx = RODA.x, by = RODA.y;
    if (S.modo === 'notas') {
      for (const [r, c] of [[112, '#5a3217'], [106, '#e8c58c'], [101, '#5a3217'], [96, '#b98a4a'], [92, '#2a160b']]) { g.fillStyle = c; g.beginPath(); g.arc(bx - 24, by, r * 0.92, 0, 7); g.fill(); }
    }
    // mão (cravelhas) e braço
    g.fillStyle = '#4a2a15'; redondo(-20, Y0 - 34, X0 - 24, 5 * DY + 68, 14); g.fill();
    for (let k = 0; k < 6; k++) { g.fillStyle = '#d9c9a0'; g.beginPath(); g.arc(18 + (k % 2) * 20, yCorda(k), 5, 0, 7); g.fill(); g.fillStyle = '#8a7a52'; g.beginPath(); g.arc(18 + (k % 2) * 20, yCorda(k), 2, 0, 7); g.fill(); }
    g.fillStyle = '#3a2213'; g.fillRect(X0 - 50, Y0 - 22, XB - X0 + 92, 5 * DY + 44);
    g.fillStyle = 'rgba(255,255,255,0.04)'; g.fillRect(X0 - 50, Y0 - 22, XB - X0 + 92, 8);
    g.fillStyle = '#efe6cf'; g.fillRect(X0 - 4, Y0 - 22, 6, 5 * DY + 44);
    for (let c = 1; c <= 4; c++) { g.fillStyle = '#b9bec4'; g.fillRect(X0 + c * CASA - 1, Y0 - 22, 3, 5 * DY + 44); g.fillStyle = '#6d7379'; g.fillRect(X0 + c * CASA + 2, Y0 - 22, 1, 5 * DY + 44); }
    g.fillStyle = 'rgba(239,230,207,0.5)'; g.beginPath(); g.arc(xCasa(3), Y0 + 2.5 * DY, 6, 0, 7); g.fill();
    g.fillStyle = 'rgba(239,230,207,0.5)'; g.font = '12px ui-monospace, Menlo, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let c = 1; c <= 4; c++) g.fillText('casa ' + c, xCasa(c), H - 14);
    g.fillText('solta', X0 - 26, H - 14);
    // cordas
    for (let k = 0; k < 6; k++) {
      const v = S.vib[k], dt = v ? (agora - v.t) / 1000 : 9, amp = v ? Math.max(0, 5 * v.f * Math.exp(-dt * 3.4)) : 0;
      g.strokeStyle = k < 3 ? '#f1efe8' : '#d3b178'; g.lineWidth = 1 + k * 0.42;
      g.beginPath();
      const y = yCorda(k);
      g.moveTo(X0 - 60, y);
      for (let x = X0; x <= W; x += 12) g.lineTo(x, y + (amp > 0.1 ? Math.sin(((x - X0) / (W - X0)) * Math.PI) * amp * Math.sin(agora * 0.09 + k) * (x % 24 ? 1 : -1) : 0));
      g.stroke();
    }
    if (S.modo === 'notas') desenharNotas(agora); else desenharAcordes(agora);
    S.raf = requestAnimationFrame(desenhar);
  }
  function alvo() { return S.aprender && S.musica ? S.musica.passos[S.passo] : null; }
  function desenharNotas(agora) {
    const a = alvo();
    for (const N of NOTAS) {
      const x = xCasa(N.casa), y = yCorda(N.corda), b = S.brilho[N.n], k = b ? Math.max(0, 1 - (agora - b) / 420) : 0, eAlvo = a && a.n === N.n, pulso = eAlvo ? 0.5 + 0.5 * Math.sin(agora * 0.009) : 0;
      const r = 15 + k * 5 + pulso * 3;
      if (k > 0 || eAlvo) { g.fillStyle = eAlvo ? 'rgba(255,201,90,' + (0.25 + 0.35 * pulso) + ')' : 'rgba(126,224,161,' + 0.45 * k + ')'; g.beginPath(); g.arc(x, y, r + 9, 0, 7); g.fill(); }
      g.fillStyle = k > 0.15 ? '#7ee0a1' : eAlvo ? '#ffc95a' : N.sus ? '#2b3038' : '#f4efe3';
      g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 1.5; g.stroke();
      const escuro = k > 0.15 || eAlvo || !N.sus;
      g.fillStyle = escuro ? '#14171c' : '#e6e8ec';
      g.font = 'bold 14px ui-monospace, Menlo, monospace'; g.fillText(N.tecla, x, y - 3);
      g.font = '9px ui-monospace, Menlo, monospace'; g.fillText(N.nome, x, y + 8);
    }
  }
  function desenharAcordes(agora) {
    const ac = acordeAtual(), F = forma(ac), a = alvo();
    for (let k = 0; k < 6; k++) {
      const y = yCorda(k);
      if (F[k] < 0) { g.fillStyle = '#ff8a8a'; g.font = 'bold 15px ui-monospace, Menlo, monospace'; g.fillText('×', X0 - 26, y); continue; }
      g.fillStyle = F[k] ? '#f4efe3' : 'rgba(244,239,227,0.2)'; g.beginPath(); g.arc(xCasa(F[k]), y, F[k] ? 13 : 8, 0, 7); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1.5; g.stroke();
      if (F[k]) { g.fillStyle = '#14171c'; g.font = 'bold 12px ui-monospace, Menlo, monospace'; g.fillText(F[k], xCasa(F[k]), y); }
    }
    // a roda de acordes
    const lista = acordes();
    g.fillStyle = 'rgba(8,9,12,0.88)'; g.beginPath(); g.arc(RODA.x, RODA.y, RODA.r + 8, 0, 7); g.fill();
    for (let i = 0; i < 8; i++) {
      const a0 = -Math.PI / 2 + (i - 0.5) * (Math.PI / 4) + 0.02, a1 = a0 + Math.PI / 4 - 0.04, sel = lista[i] === ac, eAlvo = a && a.ac === lista[i], pulso = eAlvo ? 0.5 + 0.5 * Math.sin(agora * 0.009) : 0;
      g.fillStyle = sel ? '#1f6b45' : eAlvo ? 'rgba(255,201,90,' + (0.35 + 0.5 * pulso) + ')' : S.roda === i ? '#2d3542' : '#171b22';
      g.beginPath(); g.arc(RODA.x, RODA.y, RODA.r, a0, a1); g.arc(RODA.x, RODA.y, RODA.r0, a1, a0, true); g.closePath(); g.fill();
      if (sel || eAlvo) { g.strokeStyle = eAlvo ? '#ffc95a' : '#7ee0a1'; g.lineWidth = 2; g.stroke(); }
      const m = (a0 + a1) / 2, rx = RODA.x + Math.cos(m) * 86, ry = RODA.y + Math.sin(m) * 86;
      g.fillStyle = '#f2f4f7'; g.font = 'bold 18px ui-monospace, Menlo, monospace'; g.fillText(lista[i], rx, ry - 4);
      g.fillStyle = '#8a919c'; g.font = '11px ui-monospace, Menlo, monospace'; g.fillText(i + 1, rx, ry + 13);
    }
    g.fillStyle = '#7ee0a1'; g.font = 'bold 24px ui-monospace, Menlo, monospace'; g.fillText(ac, RODA.x, RODA.y);
  }

  /* ---- mouse e toque ---- */
  function ponto(ev) { const r = cv.getBoundingClientRect(); return [((ev.clientX - r.left) / r.width) * W, ((ev.clientY - r.top) / r.height) * H]; }
  function setor(x, y) {
    const dx = x - RODA.x, dy = y - RODA.y, d = Math.hypot(dx, dy);
    if (d < RODA.r0 - 8 || d > RODA.r + 8) return -1;
    return Math.floor((((Math.atan2(dy, dx) + Math.PI / 2 + Math.PI / 8) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) / (Math.PI / 4));
  }
  function baixar(ev) {
    ev.preventDefault();
    audio();
    const [x, y] = ponto(ev);
    cv.setPointerCapture(ev.pointerId);
    if (S.modo === 'acordes') { const i = setor(x, y); if (i >= 0 && Math.hypot(x - RODA.x, y - RODA.y) <= RODA.r + 8) { escolherAcorde(i); return; } }
    else {
      let m = null, md = 20;
      for (const N of NOTAS) { const d = Math.hypot(x - xCasa(N.casa), y - yCorda(N.corda)); if (d < md) { md = d; m = N; } }
      if (m) { pararOuvir(); tocarNota(m.n); return; }
    }
    S.arrasto = { y, tocadas: new Set(), dir: 0 };
    for (let k = 0; k < 6; k++) if (Math.abs(y - yCorda(k)) < 9) { umaCorda(k); S.arrasto.tocadas.add(k); }
  }
  function mover(ev) {
    const [x, y] = ponto(ev);
    S.roda = S.modo === 'acordes' ? setor(x, y) : -1;
    const A = S.arrasto;
    if (!A) return;
    for (let k = 0; k < 6; k++) {
      const c = yCorda(k);
      if ((A.y < c && y >= c) || (A.y > c && y <= c)) {
        umaCorda(k);
        A.tocadas.add(k);
      }
    }
    A.y = y;
  }
  function soltar() {
    const A = S.arrasto;
    S.arrasto = null;
    if (A && S.modo === 'acordes' && A.tocadas.size >= 3) conferir({ ac: acordeAtual() }); // passou por 3 cordas: valeu a batida
  }
  function pararOuvir() { if (S.tocando) { clearTimeout(S.tocando.timer); S.tocando = null; S.passo = -1; atualizar(); } }
  function escolherAcorde(i) { pararOuvir(); S.acorde = i; S.acordeSolto = null; }

  /* ------------------------------------------------------------------ */
  /* Painel                                                              */
  /* ------------------------------------------------------------------ */
  let el = null;
  const q = (s) => el.querySelector(s);
  const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function montar() {
    if (el) return;
    el = document.createElement('div');
    el.id = 'violaoPanel';
    el.className = 'panel';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Violão');
    el.innerHTML =
      '<div class="panel__box vio">' +
      '<header class="panel__head"><b>Violão do lounge</b>' +
      '<div class="vio__modos"><button type="button" data-modo="notas">Notas</button><button type="button" data-modo="acordes">Acordes</button></div>' +
      '<label class="vio__vol">Volume <input type="range" min="0" max="1" step="0.05"></label>' +
      '<button class="btn btn--ghost" type="button" data-a="fechar">Fechar <kbd>Esc</kbd></button></header>' +
      '<div class="vio__corpo">' +
      '<aside class="vio__lista"><div class="vio__generos"></div><div class="vio__musicas"></div></aside>' +
      '<section class="vio__palco">' +
      '<div class="vio__campos"></div>' +
      '<canvas width="' + W * 2 + '" height="' + H * 2 + '"></canvas>' +
      '<div class="vio__trilha"></div>' +
      '<div class="vio__botoes"></div>' +
      '</section></div>' +
      '<footer class="panel__foot"><span class="vio__msg" aria-live="polite"></span><span class="vio__ajuda"></span></footer></div>';
    document.body.appendChild(el);
    cv = q('canvas');
    g = cv.getContext('2d');
    g.scale(2, 2);
    cv.addEventListener('pointerdown', baixar);
    cv.addEventListener('pointermove', mover);
    for (const e of ['pointerup', 'pointercancel']) cv.addEventListener(e, soltar);
    cv.addEventListener('pointerleave', () => { S.roda = -1; });
    const vol = q('.vio__vol input');
    vol.value = S.volume;
    vol.oninput = () => { S.volume = +vol.value; if (saida) saida.gain.value = S.volume; };
    vol.onchange = () => vol.blur();
    el.addEventListener('click', (ev) => {
      const b = ev.target.closest('button');
      if (!b) return;
      b.blur(); // (senão a barra de espaço apertaria o botão de novo)
      if (b.dataset.modo) { parar(); S.modo = b.dataset.modo; S.passo = -1; S.msg = ''; atualizar(); }
      else if (b.dataset.g) { S.genero = b.dataset.g; atualizar(); }
      else if (b.dataset.m) { parar(); S.musica = MUSICAS[+b.dataset.m]; S.passo = -1; ouvir(); }
      else if (b.dataset.c) { parar(); S.campo = b.dataset.c; S.acorde = 0; atualizar(); }
      else if (b.dataset.a) ({ fechar, ouvir, aprender, parar: () => { parar(); S.passo = -1; S.msg = ''; atualizar(); }, gravar: alternarGravacao, minha: ouvirGravacao, oitava: () => { S.oitava = S.oitava ? 0 : 1; atualizar(); } })[b.dataset.a]();
    });
  }
  function atualizar() {
    if (!S.aberto) return;
    el.querySelectorAll('.vio__modos button').forEach((b) => b.classList.toggle('is-on', b.dataset.modo === S.modo));
    q('.vio__generos').innerHTML = GENEROS.map((x) => '<button type="button" data-g="' + esc(x) + '" class="' + (x === S.genero ? 'is-on' : '') + '">' + esc(x) + '</button>').join('');
    q('.vio__musicas').innerHTML = MUSICAS.filter((m) => m.g === S.genero).map((m) => '<button type="button" data-m="' + m.id + '" class="' + (S.musica === m ? 'is-on' : '') + '"><b>' + esc(m.nome) + (S.aprendidas.includes(m.nome) ? ' <i>★</i>' : '') + '</b><small>' + esc(m.sub) + '</small></button>').join('');
    q('.vio__campos').innerHTML = S.modo === 'acordes'
      ? Object.keys(CAMPOS).map((c) => '<button type="button" data-c="' + esc(c) + '" class="' + (c === S.campo ? 'is-on' : '') + '">' + esc(c) + '</button>').join('')
      : '<button type="button" data-a="oitava">Oitava: ' + (S.oitava ? 'aguda' : 'grave') + ' <kbd>Z</kbd></button><span>clique nas bolinhas ou use o teclado</span>';
    q('.vio__botoes').innerHTML =
      (S.musica ? '<button class="btn" type="button" data-a="ouvir">▶ Ouvir</button><button class="btn" type="button" data-a="aprender">Aprender</button>' : '') +
      (S.tocando || S.aprender ? '<button class="btn btn--ghost" type="button" data-a="parar">■ Parar</button>' : '') +
      '<span class="vio__esp"></span>' +
      '<button class="btn btn--ghost' + (S.gravando != null ? ' is-rec' : '') + '" type="button" data-a="gravar">' + (S.gravando != null ? '■ Parar gravação' : '● Gravar') + '</button>' +
      '<button class="btn btn--ghost" type="button" data-a="minha"' + (S.gravacao.length && S.gravando == null ? '' : ' disabled') + '>▶ Minha música</button>';
    trilha(); rodape();
  }
  function trilha() {
    const t = q('.vio__trilha');
    if (!S.musica) { t.innerHTML = '<span class="vio__vazio">Escolha uma música ao lado para ouvir ou aprender — ou toque o que quiser.</span>'; return; }
    const at = S.passo == null ? -1 : S.passo, ini = Math.max(0, Math.min(at - 4, S.musica.passos.length - 16));
    t.innerHTML = S.musica.passos.slice(Math.max(0, ini), Math.max(0, ini) + 16).map((p, k) => {
      const i = Math.max(0, ini) + k;
      return '<span class="' + (i < at ? 'is-ja' : i === at ? 'is-on' : '') + '"><b>' + (p.n != null ? NOTAS[p.n].tecla : esc(p.ac)) + '</b><small>' + (p.n != null ? NOTAS[p.n].nome : 'acorde') + '</small></span>';
    }).join('') + (S.musica.passos.length > 16 ? '<em>' + (Math.max(0, at)) + '/' + S.musica.passos.length + '</em>' : '');
  }
  function rodape() {
    q('.vio__msg').textContent = S.msg;
    q('.vio__ajuda').innerHTML = S.modo === 'notas' ? '<kbd>A</kbd>…<kbd>Ç</kbd> notas · <kbd>W</kbd><kbd>E</kbd><kbd>T</kbd>… sustenidos · <kbd>Z</kbd> oitava · <kbd>Tab</kbd> acordes'
      : '<kbd>1</kbd>…<kbd>8</kbd> acorde · <kbd>↓</kbd><kbd>↑</kbd> batida · <kbd>Espaço</kbd> abafar · arraste nas cordas · <kbd>Tab</kbd> notas';
  }

  /* ------------------------------------------------------------------ */
  /* Abrir, fechar e teclas                                              */
  /* ------------------------------------------------------------------ */
  function abrir(game, item) {
    if (S.aberto) return;
    montar();
    Object.assign(S, { aberto: true, game, item, passo: -1, tocando: null, aprender: null, gravando: null, arrasto: null, vib: [], brilho: {}, msg: 'Toque o que quiser!' });
    audio();
    game.locked = true;
    if (game.keys) game.keys.clear();
    // o boneco pega o violão e fica com ele até fechar
    if (item && game.player) { item.hidden = true; game.player.dir = 'down'; game.player.anim = { kind: 'guitar', t: 1e9, item, fxT: 1 }; }
    el.classList.add('is-open');
    atualizar();
    cancelAnimationFrame(S.raf);
    desenhar();
  }
  function fechar() {
    if (!S.aberto) return;
    parar();
    if (S.gravando != null) { S.gravando = null; salvar(); }
    S.aberto = false;
    cancelAnimationFrame(S.raf);
    el.classList.remove('is-open');
    const gm = S.game, p = gm && gm.player;
    if (S.item) S.item.hidden = false;
    if (p && p.anim && p.anim.kind === 'guitar') { p.anim = null; if (!p.sitting) p.pose = null; }
    if (gm) gm.locked = false;
  }
  // devolve true quando a tecla é do violão (o jogo não deve usar)
  function key(ev) {
    if (!S.aberto) return false;
    if (ev.code === 'Escape') { fechar(); ev.preventDefault(); return true; }
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return true; // (atalhos do navegador continuam valendo)
    if (ev.code === 'Tab') { ev.preventDefault(); if (!ev.repeat) { parar(); S.passo = -1; S.modo = S.modo === 'notas' ? 'acordes' : 'notas'; S.msg = ''; atualizar(); } return true; }
    if (S.modo === 'notas') {
      const N = NOTAS.find((x) => x.code === ev.code);
      if (N) { ev.preventDefault(); if (!ev.repeat) { pararOuvir(); tocarNota(N.n); } return true; }
      if (ev.code === 'KeyZ' && !ev.repeat) { S.oitava = S.oitava ? 0 : 1; atualizar(); }
    } else {
      const d = /^(?:Digit|Numpad)([1-8])$/.exec(ev.code);
      if (d) { ev.preventDefault(); if (!ev.repeat) escolherAcorde(+d[1] - 1); return true; }
      const bat = { ArrowDown: 'D', ArrowUp: 'U', Space: 'x' }[ev.code];
      if (bat) { ev.preventDefault(); if (!ev.repeat) { pararOuvir(); batida(bat, acordeAtual()); } return true; }
    }
    if (ev.code === 'Space' || ev.code.startsWith('Arrow')) ev.preventDefault();
    return true;
  }
  window.addEventListener('blur', () => { if (S.aberto) S.arrasto = null; });

  DL.Violao = { abrir, fechar, key, get aberto() { return S.aberto; }, MUSICAS, NOTAS, _S: S, _corda: (m) => { audio(); return corda(m); } };
})();

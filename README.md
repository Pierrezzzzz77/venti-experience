# eventi experience

Jogo de navegador para trabalho da faculdade: uma versão simples do DataLab, em pixel art isométrica.
HTML + JavaScript puro, sem framework e sem build.

## Como rodar

```
npx serve .
```

Depois abra `http://localhost:3000` (a porta aparece no terminal).
O jogo abre no menu inicial ("Bem-vindo(a) ao Data Experience"): ao apertar **Jogar** (ou Enter/Espaço), as nuvens se abrem e o filme do lago começa.
`?menu=0` pula o menu e vai direto ao filme. Para abrir um mapa direto: `?mapa=lago`, `?mapa=abertura`, `?mapa=rua` ou `?mapa=datalab`
(no lago e na viagem, `&t=20` começa no segundo 20 — ex.: `?mapa=abertura&t=32` cai na curva da rotatória;`&debug=1` põe a foto 13 (o lago visto de cima) deitada por cima do mapa, 50% transparente, para comparar — F2 liga/desliga; as formas ficam em `assets/js/maps/lago-forma.js`).

Controles: **WASD** ou setas para andar, **E** para interagir, **M** abre o monitor, **Esc** fecha o painel.
**Zoom**: roda do mouse ou **+** / **−** (também os do teclado numérico) aproximam e afastam; **0** volta ao normal.
Vai de 1× a 3×, em passos de 1 pixel da tela (cada pixel do jogo vira sempre um número inteiro de pixels: a pixel art
fica nítida). O zoom continua igual ao trocar de mapa; fica desligado com painel aberto, no menu e durante os filmes
(lago, viagem de carro e a chegada na rua) e volta sozinho na parte jogável.

## Partes do jogo

0. Lago da Prefeitura ao fim da tarde: filme de ~37 s (cidade de cima → lago → calçada, botão Pular) e depois
   a parte jogável: andar pela calçada até o carro e apertar E — **pronto**
   (o boneco abre a porta, entra, o carro acende os faróis, dá seta e sai; a viagem começa por baixo da mesma imagem, sem corte)
1. Viagem: do Lago da Prefeitura até a Faculdade Serra Dourada, de carro (botão Pular) — **pronto**
   Vista de lado pela PA-160 (SkyFit, casas, comércios, árvores em camadas); na rotatória o carro vira e a
   câmera vai para trás dele, pela Av. Carajás em perspectiva, até encostar em frente à faculdade.
2. Faculdade por dentro, seguindo a planta real: entrada com porta de vidro e faixa tátil; em frente, as mesas
   (do lado, 3 salas de estudo de vidro; no fundo, a sala branca com cabines);
   à direita, o saguão com o logo numa parede em diagonal, a coordenação (sala aberta: 2 portas
   ao lado do logo, parede laranja no fundo com uma porta e a mesa redonda dos notebooks),
   a parede verde no fim e o corredor das salas (4 portas de cada lado) — **pronto** (`?mapa=faculdade`)
   (Sala 1: sala de ADS, laboratório de informática · Sala 2: laboratório da área da saúde · Salas 3 a 8: portas fechadas)
   Alunos (bots) pela faculdade e nas 2 salas: estudando nas mesas, conversando em grupinhos (em pé e sentados),
   entrando e saindo das salas e da faculdade (as portas abrem), com mochila; E perto deles = falar com o aluno.
   A porta de vidro leva de volta à calçada da rua.
3. Rua da Serra Dourada e do DataLab, à noite: o boneco desce do carro e anda pela calçada até a porta de vidro
   ("Pressione E para entrar") — **pronto** (`validarMapa()` no console também confere este mapa).
   O DataLab fica colado na faculdade, com o letreiro de néon aceso; a porta dele leva à sala do DataLab (parte 4).
4. DataLab: colocar servidor e switch no rack, ligar o cabo e deixar o servidor online pelo terminal — **pronto**
   (`ip addr` → `sudo ip link set eth0 up` → `ping 10.0.1.1`)
   Estética cyberpunk roxo + ciano: paredes grafite-violeta com filete ciano aceso e rodapé neon (com o reflexo no
   chão), piso de placas escuras com frestas violeta, carpete azul-noite, luminárias de tubo neon, relógio digital,
   letreiros neon pequenos, tapetes com contorno neon e móveis escuros (as cores abaixo foram trocadas por essas).
   A planta segue o print do DataLab original (`referencias/datalab-original-sala.png`): paredes claras com acabamento
   cinza e porta verde com a plaquinha DATALAB acesa (volta para a rua); escritório de piso de madeira com 5 estações
   (mesa, 2 monitores acesos, teclado, mouse e cadeira), café, bebedouro, quadro branco com um diagrama de rede,
   luminárias (com o círculo de luz quente no chão), plantas e, nas paredes, o quadro da Faculdade Serra Dourada,
   relógio, quadrinhos, tomadas e interruptor; meia-parede de alvenaria clara com tampo de madeira entre o escritório
   e o carpete; a sala técnica com parede inteira, porta (abre sozinha quando alguém chega perto) e uma janelinha:
   1 fileira de 5 racks com porta de grade, servidores 1U/2U, etiquetas e LEDs azuis e verdes em ritmos diferentes,
   calha de cabos fina por cima, piso perfurado na frente, ar de precisão, o indicador "19,7 °C" e luz fria; e a sala
   de carpete azul com sofá, estante e 3 tapetes de tecido (um deles terracota com a faísca, estilo Claude).
   O rack da missão é o **RACK-01**, o primeiro depois da porta da sala técnica (etiqueta verde em cima).
   3 funcionários (Ana, Lucas e Bia) digitam nas mesas, vão ao café, checam os racks e conversam, com balões de
   fala curtos; **E** perto de um deles = uma dica do passo atual da missão. Som baixinho dos servidores e do teclado
   (o mesmo botão "Som" do lago).
   Sem placas grandes e sem barra de cima: só o painel da missão e a dica de teclas.

## Organização

| Arquivo | O que faz |
|---|---|
| `index.html` | A página. Carrega os scripts **em ordem** e abre o mapa `datalab`. |
| `assets/js/engine/sprites.js` | Desenhos em pixel (personagem, rack, mesa, planta, ar). Copiado do DataLab e enxugado. |
| `assets/js/engine/scene.js` | Personagem andando, colisão, laço do jogo. Copiado do DataLab e enxugado. |
| `assets/js/engine/iso.js` | Câmera isométrica (paredes em 3D, ordem de desenho, luz). Copiado do DataLab e enxugado. |
| `assets/js/engine/world.js` | Mapas desenhados em texto (`#` parede, `.` piso) → mundo do jogo. |
| `assets/js/game.js` | Carrega um mapa, teclado, movimento, interação (E), troca de mapa. |
| `assets/js/ui/rack-panel.js` | Painel do rack para ligar o cabo (versão simples do cabling.js). |
| `assets/js/ui/terminal.js` | Terminal do servidor com 3 comandos (versão simples do terminal.js do DataLab). |
| `assets/js/ui/menu.js` + `assets/css/menu.css` | Menu inicial: céu de pôr do sol, nuvens em 4 camadas, título pixel e botão Jogar; as nuvens se abrem para o filme do lago. |
| `assets/js/ui/violao.js` + `assets/css/violao.css` | O violão do lounge: notas no braço, roda de acordes, músicas prontas por gênero (ouvir e aprender) e gravação. Som sintetizado. |
| `assets/js/ui/monitor.js` | Monitor (tecla M): gráficos de CPU, rede, disponibilidade e problemas (versão simples do monitor.js do DataLab). |
| `assets/js/maps/lago-paleta.js` | Parte 0: a paleta fixa (39 cores de pôr do sol); tudo que é pintado uma vez passa por ela. |
| `assets/js/maps/lago-cenario.js` | Parte 0: o mapa do lago (tiles, pisos, árvores, postes, prédios, carro do jogador). |
| `assets/js/maps/lago-cidade.js` | Parte 0: a cidade em volta do mapa (bairros, mata, morros). |
| `assets/js/maps/lago-ceu.js` | Parte 0: céu, água com reflexo e brilho do sol, sombras compridas, luz, nuvens do começo. |
| `assets/js/maps/lago-preparo.js` | Parte 0: prepara uma vez (barra "Carregando") o chão, os prédios e a cidade vista do alto em 5 tamanhos — por isso roda leve. No filme, a vista do alto é desenhada com o dobro da resolução e reduzida (fica nítida). |
| `assets/js/maps/lago-vida.js` | Parte 0: pedestres, carros (sedã, hatch, SUV, picape, moto), crianças brincando (bola, pega-pega, pipa), patos, garça, pássaros, folhas, vaga-lumes. |
| `assets/js/maps/lago-som.js` | Parte 0: som de vento, água e pássaros (Web Audio), botão para silenciar. |
| `assets/js/maps/lago.js` | Parte 0: o filme (câmera, legendas) e a parte jogável (entrar no carro). |
| `assets/js/maps/arte.js` | Arte compartilhada: fonte de pixels, brasão e a frente da Faculdade Serra Dourada (foto 16), em duas camadas (prédio e o que acende). |
| `assets/js/maps/abertura-pecas.js` | Parte 1: as peças da viagem, cada uma num sprite pronto — árvores, 23 modelos de casa/comércio, SkyFit (foto 15), prédios ao longe, carros. |
| `assets/js/maps/abertura.js` | Parte 1: a viagem — plano de lado com camadas em paralaxe, a curva na rotatória e o plano em perspectiva até a faculdade. |
| `assets/js/maps/faculdade-alunos.js` | Os alunos (bots) da faculdade: quem estuda, conversa e anda; mochila, caderno e livro. Carregado antes de `faculdade.js`. |
| `assets/js/maps/faculdade.js` | Parte 2: a faculdade por dentro (mesas, saguão com o logo, coordenação, corredor). |
| `assets/js/maps/faculdade-salas.js` | Parte 2: as 2 salas, feitas pelas fotos (pasta `foto sala`): Sala 1 = ADS (`faculdade-sala1`) e Sala 2 = saúde (`faculdade-sala2`). Carregado depois de `faculdade.js`. |
| `assets/js/maps/rua.js` | Parte 3: a rua da Serra Dourada e do DataLab (isométrica, noite): prédios e chão pintados uma vez, carro parado, pedestres, as portas da faculdade e do DataLab. |
| `assets/js/engine/moveis.js` | Móveis de escritório copiados do DataLab original (mesa com monitores, cadeira, estante, bebedouro, café, quadro branco, tapete, luminária, vaso), o tapete estilo Claude e o rack escuro com LED ciano. |
| `assets/js/maps/datalab-arte.js` | Parte 4: as peças desenhadas da sala (meia-parede, janelinha, porta verde, quadros, relógio, tomadas, sofá, calha dos racks, luz fria e quente, tapetes de tecido). |
| `assets/js/maps/datalab-sala.js` | Parte 4: a sala do DataLab (planta em texto no começo do arquivo, pisos de madeira e carpete, paredes, móveis, porta da sala técnica) e o `validarMapa()` dela. |
| `assets/js/maps/datalab-gente.js` | Parte 4: os 3 funcionários (rotina, caminho pelos tiles livres, balões de fala, dica com E). Carregado depois de `faculdade-alunos.js`. |
| `assets/js/maps/datalab-som.js` | Parte 4: zumbido dos servidores e teclado (Web Audio), com o botão Som do lago. |
| `assets/js/maps/datalab.js` | Parte 4: a missão (bancada → RACK-01 → cabo → terminal) e o monitor. |

### Como acrescentar um mapa novo (faculdade, rua, abertura)

1. Criar `assets/js/maps/faculdade.js` com `DL.registerMap({ id: 'faculdade', tiles: [...], items: [...], spawn: [x, y] })`
   (use `datalab.js` como modelo).
2. Colocar `<script src="assets/js/maps/faculdade.js"></script>` no `index.html`, antes do script final.
3. Ligar os mapas com `portals: [{ tx, ty, to: 'rua', spawn: [x, y] }]`: quando o jogador pisa no tile, vai para o outro mapa.
4. Pisos novos (grama, asfalto, calçada): `DL.FLOORS['g'] = function (g, px, py, x, y) { ... }`.

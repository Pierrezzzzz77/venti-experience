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

## Partes do jogo

0. Lago da Prefeitura ao fim da tarde: filme de ~37 s (cidade de cima → lago → calçada, botão Pular) e depois
   a parte jogável: andar pela calçada até o carro e apertar E — **pronto**
   (o boneco abre a porta, entra, o carro acende os faróis, dá seta e sai; a viagem começa por baixo da mesma imagem, sem corte)
1. Viagem: do Lago da Prefeitura até a Faculdade Serra Dourada, de carro (botão Pular) — **pronto**
   Vista de lado pela PA-160 (SkyFit, casas, comércios, árvores em camadas); na rotatória o carro vira e a
   câmera vai para trás dele, pela Av. Carajás em perspectiva, até encostar em frente à faculdade.
2. Faculdade por dentro — *a fazer* (por enquanto a porta mostra "Faculdade por dentro: em breve")
3. Rua da Serra Dourada e do DataLab, à noite: o boneco desce do carro e anda pela calçada até a porta de vidro
   ("Pressione E para entrar") — **pronto** (`validarMapa()` no console também confere este mapa)
4. DataLab: colocar servidor e switch no rack, ligar o cabo e deixar o servidor online pelo terminal — **pronto**
   (`ip addr` → `sudo ip link set eth0 up` → `ping 10.0.1.1`)

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
| `assets/js/maps/abertura-pecas.js` | Parte 1: as peças da viagem, cada uma num sprite pronto — árvores, palmeiras, 16 modelos de casa/comércio, SkyFit (foto 15), carros. |
| `assets/js/maps/abertura.js` | Parte 1: a viagem — plano de lado com camadas em paralaxe, a curva na rotatória e o plano em perspectiva até a faculdade. |
| `assets/js/maps/rua.js` | Parte 3: a rua da Serra Dourada e do DataLab (isométrica, noite): prédios e chão pintados uma vez, carro parado, pedestres, a porta com E. |
| `assets/js/maps/datalab.js` | Parte 4: a sala do DataLab e a missão. |

### Como acrescentar um mapa novo (faculdade, rua, abertura)

1. Criar `assets/js/maps/faculdade.js` com `DL.registerMap({ id: 'faculdade', tiles: [...], items: [...], spawn: [x, y] })`
   (use `datalab.js` como modelo).
2. Colocar `<script src="assets/js/maps/faculdade.js"></script>` no `index.html`, antes do script final.
3. Ligar os mapas com `portals: [{ tx, ty, to: 'rua', spawn: [x, y] }]`: quando o jogador pisa no tile, vai para o outro mapa.
4. Pisos novos (grama, asfalto, calçada): `DL.FLOORS['g'] = function (g, px, py, x, y) { ... }`.

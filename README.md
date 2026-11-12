# eventi experience

Jogo de navegador para trabalho da faculdade: uma versão simples do DataLab, em pixel art isométrica.
HTML + JavaScript puro, sem framework e sem build.

## Como rodar

```
npx serve .
```

Depois abra `http://localhost:3000` (a porta aparece no terminal).
O jogo começa no Lago da Prefeitura. Para abrir um mapa direto: `?mapa=lago`, `?mapa=abertura` ou `?mapa=datalab`
(no lago, `?mapa=lago&t=20` começa o filme no segundo 20; `&fps=1` mostra os quadros por segundo;
`&debug=1` põe a foto 13 (o lago visto de cima) deitada por cima do mapa, 50% transparente, para comparar — F2 liga/desliga; as formas ficam em `assets/js/maps/lago-forma.js`).

Controles: **WASD** ou setas para andar, **E** para interagir, **M** abre o monitor, **Esc** fecha o painel.

## Partes do jogo

0. Lago da Prefeitura ao fim da tarde: filme de ~37 s (cidade de cima → lago → calçada, botão Pular) e depois
   a parte jogável: andar pela calçada até o carro e apertar E — **pronto**
1. Abertura: do Lago da Prefeitura até a Faculdade Serra Dourada, de carro (cena de ~37 s, botão Pular) — **pronto**
   (no fim vai para a faculdade)
2. Faculdade por dentro, seguindo a planta real: entrada com porta de vidro e faixa tátil; em frente, as mesas;
   à direita, o saguão com o logo numa parede em diagonal, a secretaria (mesa redonda com 3 notebooks),
   a parede verde no fim e o corredor das salas (4 portas de cada lado) — **pronto** (`?mapa=faculdade`)
   (Sala 1: sala de ADS, laboratório de informática · Sala 2: laboratório da área da saúde · Salas 3 a 8: portas fechadas; provisório: a porta de vidro leva ao DataLab até a rua existir)
   Alunos (bots) pela faculdade e nas 2 salas: estudando nas mesas, conversando em grupinhos (em pé e sentados),
   entrando e saindo das salas e da faculdade (as portas abrem), com mochila; E perto deles = falar com o aluno
3. Rua: faculdade de um lado, DataLab do outro — *a fazer*
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
| `assets/js/ui/monitor.js` | Monitor (tecla M): gráficos de CPU, rede, disponibilidade e problemas (versão simples do monitor.js do DataLab). |
| `assets/js/maps/lago-paleta.js` | Parte 0: a paleta fixa (39 cores de pôr do sol); tudo que é pintado uma vez passa por ela. |
| `assets/js/maps/lago-cenario.js` | Parte 0: o mapa do lago (tiles, pisos, árvores, postes, prédios, carro do jogador). |
| `assets/js/maps/lago-cidade.js` | Parte 0: a cidade em volta do mapa (bairros, mata, morros). |
| `assets/js/maps/lago-ceu.js` | Parte 0: céu, água com reflexo e brilho do sol, sombras compridas, luz, nuvens do começo. |
| `assets/js/maps/lago-preparo.js` | Parte 0: prepara uma vez (barra "Carregando") o chão, os prédios e a cidade vista do alto em 5 tamanhos — por isso roda leve. |
| `assets/js/maps/lago-vida.js` | Parte 0: pedestres, carros, patos, garça, pássaros, folhas. |
| `assets/js/maps/lago-som.js` | Parte 0: som de vento, água e pássaros (Web Audio), botão para silenciar. |
| `assets/js/maps/lago.js` | Parte 0: o filme (câmera, legendas) e a parte jogável (entrar no carro). |
| `assets/js/maps/abertura.js` | Parte 1: cena de abertura (desenhada por código; referências em `referencia/`). |
| `assets/js/maps/faculdade-alunos.js` | Os alunos (bots) da faculdade: quem estuda, conversa e anda; mochila, caderno e livro. Carregado antes de `faculdade.js`. |
| `assets/js/maps/faculdade.js` | Parte 2: a faculdade por dentro (mesas, saguão com o logo, secretaria, corredor) e as 2 salas (mapas `faculdade-sala1` e `faculdade-sala2`). |
| `assets/js/maps/datalab.js` | Parte 4: a sala do DataLab e a missão. |

### Como acrescentar um mapa novo (faculdade, rua, abertura)

1. Criar `assets/js/maps/faculdade.js` com `DL.registerMap({ id: 'faculdade', tiles: [...], items: [...], spawn: [x, y] })`
   (use `datalab.js` como modelo).
2. Colocar `<script src="assets/js/maps/faculdade.js"></script>` no `index.html`, antes do script final.
3. Ligar os mapas com `portals: [{ tx, ty, to: 'rua', spawn: [x, y] }]`: quando o jogador pisa no tile, vai para o outro mapa.
4. Pisos novos (grama, asfalto, calçada): `DL.FLOORS['g'] = function (g, px, py, x, y) { ... }`.

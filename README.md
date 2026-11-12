# eventi experience

Jogo de navegador para trabalho da faculdade: uma versão simples do DataLab, em pixel art isométrica.
HTML + JavaScript puro, sem framework e sem build.

## Como rodar

```
npx serve .
```

Depois abra `http://localhost:3000` (a porta aparece no terminal).
Controles: **WASD** ou setas para andar, **E** para interagir, **M** abre o monitor, **Esc** fecha o painel.

## Partes do jogo

1. Abertura: sair do lago da prefeitura de Canaã dos Carajás e andar até a faculdade — *a fazer*
2. Faculdade por dentro — *a fazer*
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
| `assets/js/maps/datalab.js` | Parte 4: a sala do DataLab e a missão. |

### Como acrescentar um mapa novo (faculdade, rua, abertura)

1. Criar `assets/js/maps/faculdade.js` com `DL.registerMap({ id: 'faculdade', tiles: [...], items: [...], spawn: [x, y] })`
   (use `datalab.js` como modelo).
2. Colocar `<script src="assets/js/maps/faculdade.js"></script>` no `index.html`, antes do script final.
3. Ligar os mapas com `portals: [{ tx, ty, to: 'rua', spawn: [x, y] }]`: quando o jogador pisa no tile, vai para o outro mapa.
4. Pisos novos (grama, asfalto, calçada): `DL.FLOORS['g'] = function (g, px, py, x, y) { ... }`.

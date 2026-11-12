# Referências visuais — Canaã dos Carajás

Fotos para desenhar a cena de abertura (parte 1), a rua (parte 3) e a fachada da faculdade (parte 2).
O jogo **não usa** estas fotos: elas servem só de modelo para a pixel art.

## O trajeto (Google Street View, mar. 2026)

Do **Lago da Prefeitura** (Av. São João) até a **Faculdade Serra Dourada Canaã dos Carajás**, um trecho curto:
Av. São João → PA-160 → rotatória → Av. Carajás → faculdade.

| Foto | Lugar | O que aproveitar no jogo |
|---|---|---|
| `08-prefeitura-centro-administrativo-lago.png` | Prefeitura / Centro Administrativo, de frente para o lago | Prédio comprido e baixo, cinza-claro com faixas de vidro verde e brises brancos, bandeiras na frente, totem com a bandeira de Canaã; caminho vermelho na beira do lago, pôr do sol dourado · no jogo: fachadas creme com faixas de janelas, marquise na entrada e as bandeiras (`drawPrefeitura` em `lago-cenario.js`) |
| `01-lago-da-prefeitura-av-sao-joao.png` | Lago da Prefeitura, Av. São João | Início: lago comprido com margem de concreto, faixa amarela na beira, árvores grandes, postes altos, avenida de mão dupla, prédios baixos do outro lado |
| `02-pa-160-skyfit.png` | PA-160 | Calçada de tijolinho vermelho, estacionamento com carros, lojas baixas (academia), árvores pequenas, morros ao fundo |
| `03-pa-160-caminhao.png` | PA-160 | Avenida larga com faixa tracejada, ciclovia/calçada vermelha, caminhão, postes |
| `04-rotatoria.png` | Rotatória | Rotatória com uma árvore no meio, faixa de pedestre, galpões e terreno de terra |
| `05-av-carajas.png` | Av. Carajás | Rua mais estreita com canteiro de grama e árvores, muros, mato dos lados, torre de celular |
| `08-lago-calcada-rua.png` | Lago da Prefeitura, da calçada da avenida | Cena do lago (altura da calçada): lago comprido refletindo o céu, faixa amarela na beira, poste alto de dois braços, placa amarela de travessia, faixa de pedestre, carro branco, prédio verde-claro do outro lado |
| `09-lago-vista-aerea.png` | Lago e Prefeitura vistos de cima | Plano aéreo: prédio grande de telhado claro, praça circular com caminhos, estacionamento, lago retangular comprido, avenida com canteiro de árvores |
| `10-cidade-panoramica.png` | Canaã dos Carajás vista de longe | Panorâmica: avenida diagonal, bairros em quadras com telhados, mata ao fundo, o lago e a Prefeitura no meio |
| `11-inspiracao-agua-ambientacao.jpg` | Inspiração de estilo (não é o lugar real) | Pixel art do pôr do sol: sol grande e baixo em anéis, céu em faixas, morros em camadas, água azul escura com coluna dourada do sol |
| `12-mapa-ruas-entorno.png` | Mapa das ruas em volta do lago (vista de cima, com os nomes) | Para a próxima etapa: ruas e prédios mais longe (Av. São João, Av. Vicente, R. Francisca Cândida, rotatória) |
| `13-lago-detalhe.png` | O Lago da Prefeitura de perto, visto de cima, norte para cima | **O molde do mapa do lago**: contorno da água, trilha, praças, Prefeitura, estacionamento e Av. São João saem desta foto (`assets/js/maps/lago-forma.js`; confira com `?mapa=lago&debug=1`, F2 liga/desliga a foto) |
| `14-prefeitura-detalhe.png` | A Prefeitura de perto, vista de cima (norte para cima) | **O molde do conjunto da Prefeitura** (`assets/js/maps/lago-mapa.js`, PREF): bloco principal comprido com a faixa de telha metálica clara, bloco mais baixo a sudeste (telhado escuro), ala estreita a oeste com a caixa d'água branca, pátio interno, praça redonda de concreto a nordeste encostando no lago, estacionamento a oeste, rua leste-oeste ao sul e a academia (Fit Mania) a sudoeste |

## A faculdade (fotos de noite)

| Foto | O que aproveitar no jogo |
|---|---|
| `06-faculdade-serra-dourada-fachada-noite.jpg` | Fachada de esquina: parede de metal ondulado prata, marquise de madeira (laranja/marrom), porta de vidro de correr, recepção com luminárias redondas, logo da folha, poste com câmeras |
| `07-faculdade-serra-dourada-lateral-noite.jpg` | Lateral: vidraça com mesas e plantas na frente, painéis grandes de propaganda iluminados, motos estacionadas, rua com faixa amarela |

## Cores para a pixel art (aproximadas)

- Metal da fachada: cinza-prata `#9aa3b0` / `#c8ccd2`
- Marquise de madeira: `#b8562c` / `#8a4a2a`
- Calçada de tijolinho da PA-160: `#a8564a`
- Asfalto: `#5d6573` · faixa amarela: `#e8c15a`
- Água do lago: `#6b8fa8` · grama: `#58a578` / `#3c8059`

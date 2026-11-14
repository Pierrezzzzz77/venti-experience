# Entrada da Serra Dourada — plano de correção

> Execução: feita por mim, nesta sessão, um item por vez, com teste depois de cada um (pedido do usuário). Sem commit e sem push.

**Objetivo:** deixar a entrada, o corredor de estudo e o lounge da cena `faculdade` iguais às fotos `referencias/foto3-corredor.jpg` e `referencias/foto4-corredor-contrario.jpg`, sem mover paredes, portas, a parede "Faculdade Serra Dourada", as salas nem o lounge.

**Arquitetura:** tudo é pixel art desenhado em código (canvas 2D) em `assets/js/maps/faculdade.js`. Os móveis são "billboards" (desenhos em pé, de frente) ou `drawIso` (desenhados no chão isométrico). A cadeira hoje só tem `rot` 0 (frente) ou 1 (costas), e as poltronas e cadeiras de escritório não têm rotação. A orientação nova entra como um campo `face` em cada móvel de sentar.

**Base:** HTML/JS puro, sem dependências novas. Teste: `shot.mjs` (Chrome headless via CDP, no scratchpad), que tira prints, lê os erros do console e calcula o hash de colisão.

## Restrições globais
- Mexer só em `assets/js/maps/faculdade.js` e em `assets/js/maps/faculdade-alunos.js` (onde os alunos sentam).
- Hash de colisão da cena `faculdade` = **-333330932** antes e depois de cada item (ou seja, nenhum tile sólido muda).
- Lago, rua, DataLab, menu e as salas 1 e 2 ficam como estão.
- Não copiar código do DataLab original.
- Zero erros no console; o personagem anda pelas passagens (linhas 28 e 32 do corredor, coluna 19/20 do lounge) e sai pela porta de vidro com E.

## Direções no isométrico (vale para todos os itens)
Neste motor, +x desce para a direita e +y desce para a esquerda na tela. Então:
- `face: 'S'` (+y): virada para baixo-esquerda, mostra a frente em 3/4.
- `face: 'L'` (+x): virada para baixo-direita, mostra a frente em 3/4.
- `face: 'N'` (−y): virada para cima-direita, mostra o encosto em 3/4.
- `face: 'O'` (−x): virada para cima-esquerda, mostra o encosto em 3/4.

## Pontos de atenção
1. Aluno sentado: a cadeira passa a ser desenhada junto com o aluno, então a direção do corpo dele precisa bater com o `face` da cadeira. Se não bater, ele fica sentado de lado.
2. Ordem de desenho: o encosto da cadeira de costas (lado de cá da mesa) tem que ficar NA FRENTE do tampo da mesa, e a cadeira do lado de lá, ATRÁS.
3. Cadeira em 3/4 mais larga que o tile: não pode "vazar" por cima da parede nem do vidro.
4. Faixa cinza do piso: continua só nos tiles 'G', plana; não pode aparecer por cima de móvel ou personagem.
5. As salas 1 e 2 usam a mesma função `cadeira()`: sem `face`, elas têm que continuar como estão (`rot` antigo).

---

### Item 1 — Cadeiras viradas para a mesa (problema 1, com systematic-debugging)
**Arquivos:** `faculdade.js` (`cadeira`, `bancoPedra`, `poltronaVermelha`, `poltronaCinza`, `poltronaMadeira`, a lista de itens, a sala de vidro); `faculdade-alunos.js` (`sentar` / pose sentada).
- [ ] Confirmar a causa no código: billboard único, sem campo de direção (já visto: `faculdade.js:300-327`).
- [ ] Criar `face` 'N'/'S'/'L'/'O' nas 5 funções; sem `face`, cai no `rot` antigo (as salas 1 e 2 não mudam).
- [ ] Corredor: cadeiras da linha 29 `face:'S'` (de frente para a mesa) e da linha 31 `face:'N'` (encosto para a câmera).
- [ ] Janela: cadeiras brancas da linha 33 `face:'S'` (viradas para o balcão no vidro, de costas para o corredor).
- [ ] Lounge: cada poltrona e pufe recebe o `face` que aponta para a mesinha ou o centro do tapete. As poltronas nos cantos variam entre as duas direções vizinhas, como nas fotos.
- [ ] Sala de vidro do canto: cadeiras da coluna 1 `face:'L'` (para a mesa da coluna 2).
- [ ] Aluno sentado: usa o `face` do assento como direção do corpo.
- [ ] Teste: hash -333330932, 0 erros, prints do corredor/lounge/canto; conferir a profundidade do encosto contra o tampo.

### Item 2 — Menos apertado (problema 2)
**Arquivo:** `faculdade.js` (câmera da cena e desenho das cadeiras).
- [ ] Câmera: `tilesWide` 20 → 24 (cerca de 20% mais área visível, mesma escala nos dois eixos).
- [ ] Cadeiras desenhadas encostadas na mesa (o assento entra 2-3 px embaixo do tampo), deixando o corredor visualmente mais largo. A colisão não muda.
- [ ] Mochilas do chão (10,33 e 18,31) passam para o pé das cadeiras, fora das passagens (são decoração, sem colisão).
- [ ] Teste: andar pelas linhas 28 e 32 de ponta a ponta, sem travar; hash igual.

### Item 3 — Igual à faculdade real (problema 3, com frontend-design)
**Arquivo:** `faculdade.js`.
- [ ] Mesas: desenhar DUAS mesas compridas em fila (4 tiles cada, separadas por um vão visual), com tampo cinza-claro e pernas de metal cinza. O `MESA-1` continua ocupando os mesmos 8 tiles sólidos.
- [ ] Cadeiras do corredor: concha com 4 pernas finas, verde-sálvia na maioria e salmão em ordem (como já está).
- [ ] Piso: carvalho médio, fosco, tábuas compridas, menos laranja; faixa cinza-escura continua plana nos tiles 'G'.
- [ ] Sala de vidro do canto: parede vermelha → divisória de vidro âmbar/marrom com faixa fosca e logos na altura dos olhos; as portas de vidro do corredor alternam âmbar e azul, também com faixa fosca e logo.
- [ ] Janela: as mesinhas brancas viram um balcão branco fino e contínuo encostado no vidro (desenho; os mesmos tiles), e as cadeiras de escritório ganham encosto de tela, braços e base de 5 rodinhas em 3/4.
- [ ] Globos do corredor: 4 fios (2 por mesa) com 3 a 5 globos brancos leitosos cada, em alturas diferentes, com uma canopla preta no teto.
- [ ] Parede: interruptores e tomadas, caixa de hidrante, placa vermelha acima do extintor, quadro de avisos de vidro com panfletos, ar-condicionado split alto, rodapé branco.
- [ ] Lounge: tapete creme orgânico; poltronas terracota baixas de madeira com pernas inclinadas; poltronas cinza ou verde-acinzentadas arredondadas; pufes cilíndricos azul-acinzentados; mesinhas de madeira com pernas finas de metal; banquinhos escuros (só desenho, em tiles livres e sem colisão, e só se couberem sem fechar passagem); pendentes de vidro âmbar; plantas altas ao lado da porta de vidro.
- [ ] Teste: prints lado a lado com as fotos; hash igual; 0 erros.

### Item 4 — Acabamento do pixel art (problema 4, com frontend-design)
**Arquivo:** `faculdade.js`.
- [ ] Sombra suave e difusa embaixo de cada móvel (já existe `sombraChao`; deixar com 2-3 camadas e no tamanho do móvel em 3/4).
- [ ] Textura de madeira discreta no piso (veio fino, poucas cores).
- [ ] Brilho (halo) nos globos e nos pendentes âmbar.
- [ ] Reflexo diagonal leve no vidro (janela, portas, sala do canto).
- [ ] Luz quente de fim de tarde vinda da janela (reforçar `solTarde()` sem estourar o FPS).
- [ ] Teste: FPS parecido com antes (medir com as flags de GPU), 0 erros, hash igual.

### Verificação final (verification-before-completion)
- [ ] Hash -333330932, 0 erros no console, andar por todas as passagens, sair pela porta com E e voltar.
- [ ] Lago, rua e salas 1 e 2 abrem iguais (prints antes/depois).
- [ ] Tabela item por item: foto × jogo, com o que ficou igual e o que ainda difere.

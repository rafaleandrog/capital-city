# 4. Ações, leilões, mercado, bots, eventos e o tick

## 4.1 Ações do jogador

Todas as ações são feitas a partir do **painel do lote selecionado**. Cada uma
valida e devolve `{ ok, reason }`; em erro aparece um toast vermelho com o motivo.

| Ação | Condições | Efeito |
|---|---|---|
| Iniciar leilão | lote sem dono, sem leilão aberto, dinheiro ≥ valor do lote | abre leilão de 30 s com o jogador na frente; o lance fica reservado (escrow) |
| Dar lance | leilão ativo, jogador não está na frente, lance ≥ atual × 1,10, dinheiro suficiente | reserva o novo lance, devolve o do líder anterior, reinicia o timer em 30 s |
| Comprar lote | sem dono (preço = valor) **ou** de rival listado (preço = listado) | transfere o lote; o vendedor recebe o valor. *Na UI só aparecia para lotes listados de rivais.* |
| Construir | ver regras abaixo; dinheiro ≥ custo | cria edifício nível 1 em obras; tira o lote da listagem P2P |
| Upgrade | edifício seu, fora de obras, nível < 10, dinheiro ≥ custo | entra em obras para o nível seguinte |
| Vender/demolir edifício | seu, fora de obras | remove o edifício (lote volta a vazio) e devolve 50% do custo L1 |
| Alocar trabalhadores (+/−) | edifício seu | `0 ≤ n ≤ min(capacidade, pessoas − alocadas em outros edifícios)` |
| Listar lote no P2P | lote seu, preço > 0 | marca `listedPrice`. *Na UI só aparecia para lotes com edifício.* |
| Cancelar listagem | lote seu | remove `listedPrice` |

Não existe cobrança de trabalhadores (salário); eles só limitam a alocação.

## 4.2 Regras de construção

Um edifício de `N` lotes exige, todos verdadeiros:

1. exatamente `N` lotes, sem repetição;
2. todos do jogador e **vazios**;
3. todos numa zona permitida para o tipo;
4. todos na **mesma quadra**;
5. **contíguos** por adjacência ortogonal (verificado por busca em largura).

**Fluxo multi-lote na interface:** o jogador clica em "Construir" no card do tipo;
o lote selecionado vira o 1º do plano; os cliques seguintes no mapa adicionam
lotes válidos e adjacentes a algum lote do plano (clicar de novo num lote, exceto
o primeiro, remove-o); quando o plano tem `N` lotes, o botão "Construir" confirma.
Passar o mouse num card destaca no mapa os lotes candidatos da quadra.

## 4.3 Leilões

- Só lotes **sem dono** vão a leilão, e só o **jogador** inicia leilões.
- Duração de 30 s; **cada lance reinicia** o relógio em 30 s.
- Incremento mínimo de **10%** sobre o lance atual (arredondado para cima).
- **Escrow:** o líder tem o valor do lance já descontado; ao ser superado,
  recebe-o de volta. Ninguém paga duas vezes.
- **Lances de bot:** de 3 a 10 s após cada movimento, tenta-se um lance de bot.
  Candidatos: bots que não são o líder, têm dinheiro ≥ próximo lance e para quem o
  lance atual é < 40% do caixa. Com 85% de chance, um candidato aleatório dá o
  lance mínimo.
- Ao expirar, o lote vai para o líder pelo valor reservado; registro nas crônicas
  e toast.
- Leilões em andamento **não são salvos**: ao recarregar, o valor em escrow volta
  para quem o tinha reservado e o leilão some.

## 4.4 Mercado P2P

O jogador pode listar lotes seus por um preço e comprar lotes listados por
rivais. **Bots nunca listam lotes nem compram os do jogador**, então, na prática,
o mercado P2P não funcionava (ver bugs em 06).

## 4.5 IA dos bots

Os bots seguem as mesmas regras econômicas do jogador (renda, custos, imposto) e
agem **uma vez por tick**. As três decisões são independentes (um bot pode
comprar, construir e fazer upgrade no mesmo tick):

1. **Comprar lote** (se tiver menos lotes vazios que o limite da estratégia):
   considera lotes livres com `dinheiro > 3 × valorLote`, prefere as zonas da
   estratégia e escolhe o mais caro, o mais barato ou um aleatório. Compra direto
   pelo valor, **sem leilão**.
2. **Construir** num lote vazio próprio aleatório: só tipos de **1 lote** permitidos
   na zona, preferindo os tipos da estratégia; constrói se `dinheiro > custo`.
3. **Upgrade:** com 30% de chance, um edifício próprio fora de obras e abaixo do
   nível 10, se tiver dinheiro.

Ao concluir uma obra, o edifício do bot é **lotado de trabalhadores**
automaticamente (o do jogador, não).

| Bot | Zonas preferidas | Escolha do lote | Construção preferida | Máx. lotes vazios |
|---|---|---|---|---|
| Grupo Andrade (agressivo) | central, comercial | mais caro | escritório, loja | 2 |
| Holding Verne (equilibrado) | comercial, residencial, industrial | aleatório | qualquer | 2 |
| Consórcio Otero (defensivo) | periférico, residencial | mais barato | casa | 3 |

## 4.6 Eventos mundiais

Um evento por vez. Depois que um termina, o próximo é sorteado após um intervalo
aleatório de **8 a 15 ticks** (o primeiro, entre os ticks 8 e 15). O tipo é
sorteado com probabilidade uniforme.

| Evento | Duração (ticks) | Efeito |
|---|---|---|
| 🌆 Boom Imobiliário | 5 | `macro` +0,25 imediato (teto 1,3) |
| 📉 Recessão | 3 | `macro` −0,20 imediato (piso 0,7); população mundial não cresce |
| 🏦 Crédito Fácil | 3 | construção e upgrade custam 60% |
| 🌍 Onda Migratória | 1 | +5 pessoas para o jogador e cada bot (ainda limitado pelo teto) |
| ⚠️ Crise Financeira | 4 | renda ×0,8; manutenção e opex ×2 |
| 🎓 Expansão Educacional | 5 | renda ×1,3 em lotes residenciais ou edifícios universidade |
| 🚂 Nova Linha Ferroviária | 6 | renda ×1,2 em lotes industriais ou edifícios armazém |
| ⚡ Greve Geral | 2 | trabalhadores contam como 0 (perde o bônus de até +50%) |

Início e fim de evento geram toast e registro nas crônicas.

## 4.7 Ordem do tick

A cada tick (60 s, ou 5 s no modo DEV):

0. fechar leilões já expirados;
1. crescer a população mundial;
2. recalcular `peopleCap`;
3. reverter `macro` para 1,0;
4. cobrar/creditar cada lote com dono (manutenção, renda − opex, imposto), para
   jogador e bots;
5. concluir obras cujo prazo passou (bots lotam trabalhadores; o jogador recebe
   aviso);
6. bots agem;
7. (redundante) liquidar leilões expirados;
8. encerrar o evento ativo se acabou; sortear novo se chegou a hora e aplicar
   efeitos imediatos;
9. limitar `people` ao teto;
10. incrementar o tick. Depois: atualizar históricos (sparkline do macro, últimas
    5 rendas por edifício), avisar saldo negativo e salvar a cada 5 ticks.

Obras e leilões usam **relógio real** (timestamps), não contagem de ticks.

# 1. Visão geral

## Conceito

"Capital City" é um jogo de gestão econômica em tempo real, single-player, contra
3 empresas rivais (bots). O tema é **mercado imobiliário urbano**:

- a cidade é uma grade de **quadras** divididas em **lotes**;
- cada lote pertence a uma **zona** (central, comercial, residencial, industrial,
  periférico) que define o preço e o que pode ser construído;
- a **localização** (vias que passam na frente, esquina, proximidade de âncoras
  como porto ou universidade) multiplica valor e renda;
- o tempo avança em **ticks** (60 s no modo normal, 5 s no modo DEV); a cada tick
  os edifícios rendem, os custos são cobrados, a população cresce, os bots agem e
  podem surgir eventos mundiais.

**Objetivo declarado:** "construir o maior império imobiliário da cidade". Não
havia condição de vitória ou derrota; só um **ranking por patrimônio**
(dinheiro + valor dos lotes + valor aproximado dos edifícios).

## Loop de jogo

1. Clicar num lote sem dono e **iniciar um leilão** de 30 s (o lance inicial é o
   valor do lote; bots podem cobrir).
2. Ganhando o leilão, o lote é seu. **Lote vazio custa manutenção** a cada tick.
3. **Construir** um edifício permitido na zona (alguns ocupam 2 a 4 lotes
   contíguos). A obra leva tempo e, enquanto dura, o edifício não rende.
4. **Alocar trabalhadores** (👷): equipe cheia dá +50% de renda. O número de
   trabalhadores disponíveis cresce com a população mundial.
5. Fazer **upgrade** (até nível 10) para aumentar renda e capacidade de
   trabalhadores.
6. Reagir a **eventos mundiais** (boom, recessão, greve, crédito fácil…).
7. Opcionalmente, **vender/demolir** edifícios ou **listar lotes** no mercado P2P.

## Recursos do jogador

| Recurso | Inicial | Observação |
|---|---|---|
| 💰 Dinheiro | 10.000 | Pode ficar negativo (só gera alerta, sem punição) |
| 👷 Pessoas (trabalhadores) | 20 | Limitado por `peopleCap`, que cresce com a população mundial |
| Lotes / edifícios | 0 | |

Variáveis de mundo: população mundial (100.000 inicial), índice de mercado
`macro` (1,0 inicial, oscila entre 0,7 e 1,3), tick atual, evento ativo.

## Rivais (bots)

| id | Nome | Cor | Estratégia |
|---|---|---|---|
| bot0 | Grupo Andrade | rosa `#f472b6` | agressiva: zonas caras, compra o lote mais caro |
| bot1 | Holding Verne | roxo `#a78bfa` | equilibrada: mix de zonas, aleatório |
| bot2 | Consórcio Otero | verde-água `#2dd4bf` | defensiva: periferia barata, acumula lotes |

Cada bot começa com 8.000 de dinheiro e 15 pessoas. O jogador usa a cor âmbar
`#f59e0b`.

## O que estava pronto e o que era esboço

**Funcionando no protótipo:**
- mapa SVG clicável com zonas, vias, âncoras, edifícios, obras e leilões;
- motor econômico completo (renda, custos, imposto, população, macro);
- leilões em tempo real com lances de bots;
- construção (inclusive multi-lote), upgrade, venda, trabalhadores;
- mercado P2P (parcial, ver bugs);
- 3 bots com estratégias diferentes;
- 8 eventos mundiais com efeitos;
- painéis de resumo, ranking, leilões ativos, crônicas (log), toasts;
- save automático no `localStorage`;
- modal "Como Jogar"; modo DEV (tick de 5 s).

**Só esboço (placeholder "Em construção"):** as abas **Império**, **Leilões** e
**Crônicas**. Apenas a aba **Mapa** existia de verdade.

**Nunca existiu:** multiplayer real (apesar do README antigo dizer "jogo
online"), backend, contas, condição de vitória, tutorial, som, mobile/responsivo.

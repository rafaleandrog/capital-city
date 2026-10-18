# Capital City

Jogo de navegador de **administração imobiliária**: o jogador compra lotes numa
cidade em grade, constrói e evolui edifícios, aloca trabalhadores e disputa
patrimônio com empresas rivais controladas por bots, enquanto eventos mundiais
mexem com a economia.

## Estado do repositório

Este repositório foi **zerado de propósito**. O protótipo anterior (React + Vite +
Zustand, publicado no GitHub Pages) foi removido para recomeçar do zero. O que
sobra aqui é só a **especificação escrita** de como aquele protótipo funcionava,
para servir de ponto de partida, e não de amarra, para a nova versão.

O código antigo continua no histórico do git (último commit com ele: `b7391f6`).
Para consultá-lo: `git checkout b7391f6`.

## Documentação

| Arquivo | Conteúdo |
|---|---|
| [docs/01-visao-geral.md](docs/01-visao-geral.md) | Conceito, loop de jogo, o que estava pronto e o que era só esboço |
| [docs/02-mapa.md](docs/02-mapa.md) | Estrutura da cidade: quadras, lotes, zonas, vias e âncoras |
| [docs/03-economia.md](docs/03-economia.md) | Todas as fórmulas e constantes: valor de lote, renda, custos, edifícios, população |
| [docs/04-acoes-bots-leiloes-eventos.md](docs/04-acoes-bots-leiloes-eventos.md) | Ações do jogador, regras de construção, leilões, mercado P2P, IA dos bots, eventos mundiais, ciclo do tick |
| [docs/05-interface.md](docs/05-interface.md) | Telas, painéis e identidade visual do protótipo (a revisar) |
| [docs/06-implementacao-anterior.md](docs/06-implementacao-anterior.md) | Stack, modelo de dados, persistência, deploy, bugs conhecidos e perguntas em aberto |

Os números documentados são os valores **exatos** do protótipo. Servem como
calibragem inicial: nenhum deles foi validado com playtest.

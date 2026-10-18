# 6. Implementação anterior, bugs e perguntas em aberto

## Stack que existia

- **React 18 + Vite 5**, JavaScript (sem TypeScript), **Zustand** para estado,
  **Tailwind 3** + CSS próprio.
- `vite-plugin-singlefile`: o build gerava um único `index.html` (abre até via
  `file://`), com `base: "./"`.
- Deploy: GitHub Action em push na `main` → `npm ci && npm run build` → publica
  `dist/` no branch `gh-pages` (GitHub Pages). Precisava de
  `permissions: contents: write`.
- Sem testes, sem lint, sem backend.

> O branch `gh-pages` e a configuração do GitHub Pages **não** foram apagados por
> este PR; a versão antiga continua publicada até que sejam desligados em
> Settings → Pages.

## Organização (vale reaproveitar a ideia)

- `data/`: definições puras (mapa, tipos de edifício). O mapa gerava os lotes e
  seus campos derivados.
- `engine/`: lógica **pura, sem React**: fórmulas (`engine.js`), tick
  (`worldTick.js`, recebe o estado e devolve o novo estado), IA (`bots.js`).
- `store/`: estado global, ações do jogador, timers (tick e leilões), save/load.
- `components/`: UI.

## Modelo de dados

```text
Estado
  money, people, peopleCap           // jogador
  worldPop, macro, tick, devMode     // mundo
  lots:      { [lotId]: Lote }
  buildings: { [buildingId]: Edificio }
  auctions:  { [auctionId]: Leilao }
  bots:      [ { id, name, color, money, people } ]
  events:    [ RegistroCronica ]      // últimos 50
  activeEvent, nextEventTick
  // UI: selectedLotId, buildPlan {type, lotIds}, highlightLotIds, toasts,
  //     macroHistory (20), incomeHist {buildingId: últimas 5}

Lote      { id, quadraId, lx, ly, zone, owner ("player"|"botN"|null), buildingId,
            listedPrice, purchase, frontage{N,S,O,L}, inAnchorOf, isCorner, isInterior }
Edificio  { id, lotIds[] (o 1º é o principal), type, level, pendingLevel,
            workers, builtAt, upgradeEta (timestamp ou null) }
Leilao    { id, lotId, status ("active"|"done"), currentBid, leadPlayer,
            expiresAt, bids[{player, amount, at}] }
```

## Persistência

- `localStorage`, chave `capitalCity_v1`. Salva após cada ação e a cada 5 ticks.
- Não salva leilões nem o evento ativo (o escrow é devolvido no save).
- Ao abrir: se há save, pergunta "Continuar partida salva?".
- **Não há progresso offline:** com a aba fechada, nada acontece.
- Depuração: `window.useGameStore`, `window.engine` e `window.mapData` ficavam
  expostos no console.

## Bugs e incoerências conhecidos

1. **Mercado P2P inútil:** bots nunca listam nem compram; o jogador só podia
   listar lotes **com edifício** (lote vazio não tinha o botão).
2. **Assimetria de compra:** bots compram lotes livres direto pelo valor; o
   jogador só podia via leilão (a ação de compra direta existia mas não tinha
   botão). Bots também nunca iniciam leilões.
3. **Pessoas não crescem:** só a Onda Migratória dá pessoas novas; o teto sobe
   com a população, mas `people` fica parado em 20.
4. **Todas as quadras têm âncora**; a âncora "hospital" existe nas tabelas mas
   não no mapa.
5. **Bots só constroem edifícios de 1 lote** e lotam trabalhadores de graça.
6. Passo 7 do tick (liquidar leilões) duplicava a lógica do store e, se rodasse,
   cobraria o lance duas vezes (o store fecha os leilões antes, então não
   acontecia na prática).
7. O reembolso de venda ignora o nível do edifício e o desconto de "Crédito Fácil".
8. Status de leilão `"closing"` era checado mas nunca atribuído; `console.log` a
   cada clique de lote; cores de zona do Tailwind definidas e não usadas.
9. Saldo negativo não tem consequência (sem falência ou empréstimo).
10. Bots podem ficar com dinheiro negativo pelos custos por tick e continuam
    jogando.

## Perguntas em aberto para o recomeço

- **Single-player ou online?** O README antigo dizia "jogo online", mas tudo era
  local. Multiplayer muda tudo (backend, autoridade do servidor, tempo real).
- **Ritmo:** tick de 60 s com obras de 5 a 50 min indica jogo "idle" de sessões
  longas, mas sem progresso offline isso não funciona. Escolher: idle com
  simulação offline/servidor, ou partida curta de sessão única.
- **Condição de vitória:** patrimônio-alvo? tempo limite? falência dos rivais?
- **Estética:** medieval (KingsAge) × cidade moderna?
- **Trabalhadores:** recurso com custo (salário) ou só limitador?
- **Mapa:** fixo, procedural ou maior? Manter vias/âncoras como diferencial de
  localização (era a parte mais interessante do design)?
- **Plataforma:** desktop apenas ou mobile também?

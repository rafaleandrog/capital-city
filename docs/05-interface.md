# 5. Interface do protótipo

> Esta é a interface **como era**, não uma recomendação. Nem você tinha
> certeza de que "a cara" estava certa: use isto como inventário do que a tela
> precisa mostrar, não como layout a copiar.

## Identidade visual

- Inspiração declarada: **KingsAge** (jogo de navegador de estratégia medieval).
  Pedra escura, dourado e pergaminho, moldura dourada com cantoneiras em volta
  da tela.
- Fontes: **Cinzel** (títulos), **Crimson Text** (texto), **JetBrains Mono** (números).
- Paleta: fundo `#1c1917`, painéis `#292524`, bordas `#44403c`, dourado
  `#eab308` / `#fde047`, texto pergaminho `#fef3c7` / `#d1a872`.
- Emojis como ícones de edifícios, âncoras e eventos.
- Layout fixo para desktop (não responsivo); interface toda em português.

Há uma tensão a resolver: o tema é **cidade moderna** (bancos, shoppings,
ferrovia), mas a estética era **medieval**.

## Estrutura da tela

```
┌──────────────────────────── Cabeçalho fixo ───────────────────────────────┐
│ CAPITAL CITY [DEV]   💰 dinheiro ±Δ/tick  👷 p/cap  🌍 Pop  📈 Mercado ↑↓  │
│                                              Tick N  [DEV MODE] [?] [⚙️]   │
├────────────── Abas: 🗺️ Mapa | 🏛️ Império | 🔨 Leilões | 📜 Crônicas ───────┤
│ Painel esquerdo │           Mapa SVG               │ Painel direito         │
│ (200 px)        │                                  │ (240 px)               │
│                 │      Detalhe do lote (abaixo)    │                        │
└─────────────────┴──────────────────────────────────┴────────────────────────┘
                                                     toasts (canto inf. dir.)
```

Só a aba **Mapa** tinha conteúdo; as outras mostravam "Em construção…".

### Cabeçalho
- Dinheiro, com variação do último tick (verde/vermelho, pisca quando o sinal
  muda) e destaque vermelho se negativo.
- Pessoas/teto, população mundial, índice de mercado ×100 com seta de tendência.
- Contador de tick, botão DEV MODE, botão **?** (modal "Como Jogar" com 10 tópicos
  de regras), botão ⚙️ (reiniciar jogo com confirmação).

### Painel esquerdo: "Painel de Controle"
- **Sua Cidade:** renda bruta, despesas e saldo líquido por tick (estimados, sem o
  ruído); barra de trabalhadores alocados/pessoas.
- **Mundo:** mercado com sparkline dos últimos 20 ticks, população mundial, "sua
  fatia" (worldShareMult em %).
- **Portfólio:** nº de lotes (vazios / com edifício), lista de edifícios com nível
  e renda estimada, total de ativos.
- **Eventos:** evento ativo com contagem regressiva, ou "Mercado estável".

### Mapa
- Lotes coloridos por zona, contorno da cor do dono, lote selecionado com contorno
  dourado.
- Edifício: emoji centralizado (ocupa todos os seus lotes) e selo `L{nível}`;
  em obras, véu escuro + ⚙️ + segundos restantes.
- Bolinha laranja pulsante nos lotes em leilão.
- Legenda: zonas (interativas) e infraestrutura (vias e âncoras, não interativas).

### Detalhe do lote (abaixo do mapa)
Cinco estados conforme o lote:
1. **Sem dono:** localização (zona, ID, vias de frente, esquina), valor estimado,
   multiplicador de acessibilidade, âncora, manutenção se vazio, botão "Iniciar
   leilão".
2. **Em leilão:** relógio grande (vermelho pulsante nos últimos 5 s), lance atual e
   líder, últimos 5 lances, campo de lance e botão com o mínimo.
3. **Seu, vazio:** aviso de manutenção, grade de cards de construção dos tipos
   permitidos (renda, custo, tempo; desabilitado com o motivo no tooltip), ou o
   painel do plano multi-lote em andamento.
4. **Seu, com edifício:** ícone, nível, renda/opex/imposto/saldo estimados,
   controle +/− de trabalhadores com barra, botões de upgrade (custo e tempo),
   vender, listar/cancelar P2P, últimas 5 rendas; em obras, só a contagem.
5. **De rival:** dono, edifício, botão de compra se listado.

### Painel direito
- **Ranking** dos 4 participantes por patrimônio, com cor e selo "VOCÊ".
- **Leilões ativos:** lote, lance, segundos restantes, botão "Ver".
- **Crônicas:** evento ativo em destaque + últimos 15 registros (compras de bots,
  obras concluídas, leilões, eventos) com tempo relativo.

### Toasts
No máximo 3 empilhados, somem após 4 s. Cores: verde (sucesso), vermelho (erro),
azul (bots/info), laranja (leilões/venda).

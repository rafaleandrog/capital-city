# 2. Mapa da cidade

O mapa é definido **só por dados**: uma lista de quadras, a lista de vias nas
bordas entre quadras e a lista de âncoras. Tudo o que o lote precisa saber
(frente para via, esquina, interior, âncora) é **derivado** desses dados, nunca
digitado à mão. Vale manter esse princípio.

## Grade de quadras

Grade de **4 colunas × 3 linhas** de quadras. Cada quadra tem `w × h` lotes.

| id | linha | coluna | zona | lotes (w×h) |
|---|---|---|---|---|
| Q00 | 0 | 0 | central | 3×3 |
| Q01 | 0 | 1 | comercial | 3×3 |
| Q02 | 0 | 2 | comercial | 3×3 |
| Q03 | 0 | 3 | periférico | 2×3 |
| Q10 | 1 | 0 | industrial | 3×3 |
| Q11 | 1 | 1 | industrial | 3×3 |
| Q12 | 1 | 2 | residencial | 3×3 |
| Q13 | 1 | 3 | residencial | 2×3 |
| Q20 | 2 | 0 | periférico | 4×3 |
| Q21 | 2 | 1 | periférico | 4×3 |
| Q22 | 2 | 2 | residencial | 3×3 |
| Q23 | 2 | 3 | residencial | 2×3 |

Total: **105 lotes**. ID de lote: `{quadra}-{lx}-{ly}` (ex.: `Q00-0-0` é o canto
noroeste da Q00), com `lx` crescendo para leste e `ly` para sul.

## Vias

As vias passam **entre** as quadras (ou na borda do mapa). São objetos inertes:
não se clica nelas, só afetam os lotes vizinhos.

```
                    ═══════ ROD_N (rodovia) ═══════
 RUA_W │  Q00 central  │  Q01 comercial  ┃RUA_MID┃  Q02 comercial  │ Q03 perif. │ FER_E
 (rua) │               │                 ┃ (rua) ┃                 │            │ (ferrovia)
                    ─────── AV_NORTE (avenida) ─────
       │  Q10 indust.  │  Q11 indust.    ┃       ┃  Q12 resid.     │ Q13 resid. │
                    ─────── AV_SUL (avenida) ───────
       │  Q20 perif.   │  Q21 perif.     ┃       ┃  Q22 resid.     │ Q23 resid. │
                    (borda sul: sem via)
```

- Bordas horizontais (acima de cada linha): `ROD_N` rodovia (norte do mapa),
  `AV_NORTE` avenida (entre linhas 0 e 1), `AV_SUL` avenida (entre linhas 1 e 2),
  nada ao sul.
- Bordas verticais (a oeste de cada coluna): `RUA_W` rua (oeste do mapa), nada
  entre colunas 0/1, `RUA_MID` rua (entre colunas 1/2), nada entre colunas 2/3,
  `FER_E` ferrovia (leste do mapa).

## Campos derivados de cada lote

- **frontage** `{N, S, O, L}`: um lado tem via só se o lote está na borda da
  quadra **e** aquela borda da quadra tem via. Valor = tipo da via ou `null`.
- **isCorner**: 2 ou mais lados com via.
- **isInterior**: nenhum lado com via.
- **inAnchorOf**: âncora da quadra (ver abaixo), igual para todos os lotes da quadra.

## Âncoras

Pontos de interesse que multiplicam renda e valor dos lotes próximos. A
distância é medida **em quadras**, pela métrica de Chebyshev
(`max(|Δlinha|, |Δcoluna|)`). Cada quadra recebe a âncora **mais próxima** cujo
raio a alcança; em empate, vence a que vem primeiro na lista.

| id | tipo | posição (linha, coluna) | raio |
|---|---|---|---|
| PORTO | porto ⚓ | (1, 0) | 2 |
| DISTFIN | distrito financeiro 🏦 | (0, 0) | 1 |
| UNIV | universidade 🎓 | (2, 2) | 1 |
| ESTACAO | estação 🚉 | (1,5; 1), na borda Q11/Q21 | 2 |

Resultado efetivo por quadra:

| Quadra | Âncora |
|---|---|
| Q00 | distrito financeiro |
| Q01, Q10, Q20 | porto |
| Q02, Q03, Q11, Q21 | estação |
| Q12, Q13, Q22, Q23 | universidade |

> Observação: com essa configuração **todas as quadras têm âncora**, o que tira
> boa parte do sentido de diferenciar lotes por âncora. Rever no redesenho.
> Existe também um multiplicador para âncora "hospital" nas tabelas de economia,
> mas nenhuma âncora hospital no mapa.

## Representação visual (protótipo)

- SVG em duas camadas: (1) vias e âncoras, sem interação; (2) lotes clicáveis
  desenhados por cima.
- Lote = retângulo de 34 px de altura; a largura estica para a quadra mais larga
  da coluna. Espaço de 18 px entre quadras (por onde as vias passam) e margem de
  24 px.
- Estilo das vias: rua cinza fina (3 px), avenida dourada (9 px), rodovia cinza
  escura grossa (14 px), ferrovia marrom tracejada (5 px).
- Âncora: círculo translúcido de raio `30 + raio×38` px com o emoji no centro.
- Cor de preenchimento/contorno por zona; contorno pela cor do dono quando o lote
  tem dono.

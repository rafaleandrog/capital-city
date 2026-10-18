# 3. Economia: fórmulas e constantes

Todos os valores abaixo são os do protótipo. "/tick" significa por tick.

## 3.1 Zonas

| Zona | Preço base do lote | Manutenção do lote vazio /tick |
|---|---|---|
| central | 5.000 | 80 |
| comercial | 3.000 | 50 |
| residencial | 1.500 | 25 |
| industrial | 2.000 | 35 |
| periférico | 800 | 12 |

## 3.2 Multiplicadores de localização

| Fator | Renda | Valor do lote |
|---|---|---|
| Rua | ×1,00 | ×1,00 |
| Avenida | ×1,25 | ×1,30 |
| Rodovia | ×1,20 | ×1,25 |
| Ferrovia | ×1,15 | ×1,20 |
| Interior (sem via) | ×0,90 | ×0,90 |
| Esquina (2+ vias) | ×1,15 | ×1,15 |
| Âncora porto | ×1,30 | ×1,50 |
| Âncora distrito financeiro | ×1,35 | ×1,45 |
| Âncora universidade | ×1,25 | ×1,35 |
| Âncora hospital (sem uso) | ×1,20 | ×1,30 |
| Âncora estação | ×1,20 | ×1,25 |

Regra: entre as vias que fazem frente ao lote, **só a de maior multiplicador
conta**; esquina e âncora multiplicam por cima.

```
multVia     = interior ? 0,90 : max(mult das vias de frente)
locationMult (renda) = multVia × (esquina ? 1,15 : 1) × multÂncoraRenda
valorLote   = round(precoBaseZona × multViaValor × esquina × multÂncoraValor × macro)
```

O **valor do lote** depende do índice de mercado `macro`; é usado como preço de
compra, lance inicial de leilão, base do imposto e patrimônio.

## 3.3 Edifícios

| Tipo | Renda base L1 /tick | Trabalhadores L1 | Lotes | Zonas permitidas | Custo de construção (L1) |
|---|---|---|---|---|---|
| 🏠 Casa | 40 | 5 | 1 | residencial, periférico | 2.400 |
| 🏪 Loja | 55 | 8 | 1 | comercial | 3.300 |
| 🏢 Escritório | 70 | 10 | 1 | central, comercial | 4.200 |
| 📦 Armazém | 50 | 8 | 1 | industrial | 3.000 |
| 🏘️ Apartamento | 110 | 18 | 2 | residencial | 6.600 |
| 🛍️ Centro Comercial | 150 | 25 | 2 | comercial | 9.000 |
| 🏭 Fábrica | 130 | 22 | 2 | industrial | 7.800 |
| 🏨 Hotel | 260 | 45 | 3 | central, comercial | 15.600 |
| 🏙️ Complexo Residencial | 220 | 40 | 3 | residencial | 13.200 |
| 🏥 Hospital | 480 | 90 | 4 | central | 28.800 |
| 🎓 Universidade | 440 | 85 | 4 | central, residencial | 26.400 |
| 🏦 Banco | 520 | 95 | 4 | central | 31.200 |
| 🛒 Shopping | 500 | 92 | 4 | comercial, central | 30.000 |

### Níveis (1 a 10)

| Nível | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Fator de renda (`LEVEL_FACTOR`) | 1,000 | 1,117 | 1,250 | 1,383 | 1,550 | 1,717 | 1,917 | 2,150 | 2,383 | 2,667 |
| Trabalhadores extras ao chegar no nível | 0 | +1 | +1 | +2 | +2 | +3 | +3 | +4 | +5 | +5 |

Capacidade de trabalhadores = trabalhadores L1 + soma dos extras até o nível
atual (ex.: Loja L10 = 8 + 26 = 34).

### Custos e tempos

```
custoConstrucao(tipo)  = round(rendaBaseL1 × 60 × multEvento)        multEvento = 0,6 com "Crédito Fácil"
custoUpgrade(edif)     = round(rendaBaseL1 × 60 × 0,6 × 1,5^(nivelAtual−1) × multEvento)
tempoObra(nivelAlvo)   = 5 × nivelAlvo minutos  (modo DEV: 5 × nivelAlvo segundos)
reembolsoVenda         = round(custoConstrucao L1 sem evento × 0,5)   (independe do nível)
```

Durante a obra (construção ou upgrade), o edifício **não rende, não paga opex nem
imposto** e não conta para a atração de mercado (abaixo).

## 3.4 Renda de um edifício

```
rendaNivel  = rendaBaseL1 × LEVEL_FACTOR[nivel]
rendaLocal  = rendaNivel × locationMult(lotePrincipal)
workerMult  = 1 + (trabalhadores / capacidade) × 0,50          (greve: trabalhadores contam como 0)
rendaMundo  = rendaLocal × workerMult × worldShareMult(dono)
renda       = rendaMundo × multEventoRenda × ruído              ruído uniforme em [0,85; 1,15]
```

A localização usada é a do **primeiro lote** do edifício (lote principal).

### Fatia de mercado (`worldShareMult`)

A renda é escalada pela fatia que o dono tem da "atração" total da cidade:

```
atração(edif)    = rendaBaseL1 × LEVEL_FACTOR[nivel]   (0 se em obras)
total            = worldPop × 0,002 + Σ atração de todos os edifícios (de todos os donos)
propria          = Σ atração dos edifícios do dono
share            = propria / total
worldShareMult   = min( share × (worldPop × 0,01) × 0,0046 , 4 )
```

A constante 0,0046 foi calibrada para que um jogador sozinho com 1 Loja tenha
multiplicador ≈ 1 (renda ~60–80/tick) no início. O teto 4 evita explosão.
Consequência: a renda de um jogador **cai quando os rivais constroem** e **sobe
com a população mundial**.

## 3.5 Custos por tick

Para cada lote com dono:

- **Lote vazio:** paga `manutençãoZona × multEventoManutenção`.
- **Edifício ativo:** no lote principal soma `renda − opex × multEventoManutenção`;
  em **cada** lote do edifício paga imposto `valorLote × 0,0006`.
- **Edifício em obras:** nada.

```
opex = rendaBaseL1 × LEVEL_FACTOR[nivel] × 0,15 × numeroDeLotes
```

## 3.6 População, pessoas e mercado

A cada tick:

```
worldPop   ×= 1 + taxa      taxa = 0,003 se worldPop < 1.000.000, senão 0,001; 0 durante "Recessão"
peopleCap  = max(20, floor(worldPop × 0,00005))
people     = min(people, peopleCap)
macro      = macro + (1 − macro) × 0,02      (reverte para 1,0; limitado a [0,7; 1,3])
```

> Observação: `people` nunca **cresce** sozinho; só o evento "Onda Migratória"
> soma +5. O teto sobe com a população (100k → 20; 1M → 50), mas o jogador não
> ganha pessoas novas automaticamente. Provavelmente não era a intenção.

## 3.7 Patrimônio (ranking)

```
patrimônio = dinheiro + Σ valorLote(lotes do dono) + Σ custoConstrucao L1 × LEVEL_FACTOR[nivel] (por edifício)
```

## 3.8 Formatação de números

Compacta na interface: `< 1000` mostra inteiro, depois `12.4K`, `3.2M`, `1.1B`.
Preços de transação (lances, custos) aparecem por extenso em pt-BR.

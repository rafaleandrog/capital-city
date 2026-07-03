// ─── IA dos bots ────────────────────────────────────────────────────
// Chamado pelo worldTick a cada tick (mesma assinatura desde a Fase 1).
// A renda/manutenção dos bots é processada pelo worldTick (passo 4),
// igual ao player. Lances em leilão são em tempo real, no store.
import * as engine from "./engine.js";
import { BUILDING_TYPES } from "../data/buildingTypes.js";

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Estratégias por bot:
//  aggressive — mira zonas caras (central/comercial), compra o mais caro que puder
//  balanced   — mix de zonas, escolhe aleatório
//  defensive  — periféricos baratos, acumula muitos lotes
export const BOT_STRATEGIES = {
  bot0: {
    strategy: "aggressive",
    zones: ["central", "comercial"],
    pickLot: "expensive",
    buildPref: ["escritorio", "loja"],
    maxEmptyLots: 2,
  },
  bot1: {
    strategy: "balanced",
    zones: ["comercial", "residencial", "industrial"],
    pickLot: "random",
    buildPref: null,
    maxEmptyLots: 2,
  },
  bot2: {
    strategy: "defensive",
    zones: ["periferico", "residencial"],
    pickLot: "cheap",
    buildPref: ["casa"],
    maxEmptyLots: 3,
  },
};

// As três checagens são independentes — um bot pode comprar E construir
// E fazer upgrade no mesmo tick, se o caixa permitir.
function botTick(bot, { lots, buildings, snap, events, devMode }) {
  const now = Date.now();
  const strat = BOT_STRATEGIES[bot.id] || BOT_STRATEGIES.bot1;
  const owned = Object.values(lots).filter((l) => l.owner === bot.id);
  let emptyOwned = owned.filter((l) => !l.buildingId);

  // 1) comprar lote livre se money > 3× lotValue (preferência pela zona da estratégia)
  if (emptyOwned.length < strat.maxEmptyLots) {
    const free = Object.values(lots).filter((l) => !l.owner);
    const affordable = free.filter((l) => bot.money > 3 * engine.lotValue(l, snap));
    if (affordable.length) {
      const preferred = affordable.filter((l) => strat.zones.includes(l.zone));
      const pool = preferred.length ? preferred : affordable;
      let lot;
      if (strat.pickLot === "expensive") {
        lot = pool.reduce((a, b) => (engine.lotValue(a, snap) >= engine.lotValue(b, snap) ? a : b));
      } else if (strat.pickLot === "cheap") {
        lot = pool.reduce((a, b) => (engine.lotValue(a, snap) <= engine.lotValue(b, snap) ? a : b));
      } else {
        lot = pick(pool);
      }
      const price = engine.lotValue(lot, snap);
      lot.owner = bot.id;
      lot.purchase = price;
      bot.money -= price;
      emptyOwned = [...emptyOwned, lot];
      events.push({
        id: `ev-${now}-${bot.id}-${Math.floor(Math.random() * 1e6)}`,
        type: "botBuy",
        label: `${bot.name} comprou o lote ${lot.id}`,
        color: "gray",
        at: now,
        endsAt: null,
      });
    }
  }

  // 2) construir em lote vazio próprio (tipos de 1 lote)
  if (emptyOwned.length) {
    const lot = pick(emptyOwned);
    const options = Object.entries(BUILDING_TYPES).filter(
      ([, bt]) => bt.lotes === 1 && bt.zonas.includes(lot.zone)
    );
    if (options.length) {
      const prefOptions = strat.buildPref
        ? options.filter(([t]) => strat.buildPref.includes(t))
        : [];
      const [type] = (prefOptions.length ? prefOptions : options)[
        Math.floor(Math.random() * (prefOptions.length ? prefOptions : options).length)
      ];
      const cost = engine.buildCost(type, 1, snap);
      if (bot.money > cost) {
        const id = `b${now}-${bot.id}-${Math.floor(Math.random() * 1e6)}`;
        buildings[id] = {
          id,
          lotIds: [lot.id],
          type,
          level: 1,
          pendingLevel: 1,
          workers: 0,
          builtAt: now,
          upgradeEta: now + engine.buildTimeMs(1, devMode),
        };
        lot.buildingId = id;
        bot.money -= cost;
      }
    }
  }

  // 3) upgrade aleatório: 30% de chance se tiver dinheiro
  const upgradeable = Object.values(buildings).filter(
    (b) =>
      lots[b.lotIds[0]]?.owner === bot.id &&
      b.upgradeEta === null &&
      b.level < 10
  );
  if (upgradeable.length && Math.random() < 0.3) {
    const b = pick(upgradeable);
    const cost = engine.upgradeCost(b, snap);
    if (bot.money > cost) {
      bot.money -= cost;
      b.pendingLevel = b.level + 1;
      b.upgradeEta = now + engine.buildTimeMs(b.level + 1, devMode);
    }
  }
}

export function runBots(ctx) {
  for (const bot of ctx.bots) {
    botTick(bot, ctx);
  }
}

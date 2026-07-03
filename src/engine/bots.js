// ─── IA dos bots ────────────────────────────────────────────────────
// Chamado pelo worldTick a cada tick. Cada bot pode fazer no máximo
// UMA ação: construir num lote vazio, iniciar um upgrade aleatório
// ou comprar um lote. Muta as coleções já clonadas pelo tick.
import * as engine from "./engine.js";
import { BUILDING_TYPES } from "../data/buildingTypes.js";

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// reserva de caixa que o bot mantém para manutenção/opex
const BOT_RESERVE = 2000;

export function runBots({ lots, buildings, bots, snap, events, devMode }) {
  const now = Date.now();
  for (const bot of bots) {
    if (Math.random() < 0.4) continue; // bots não agem todo tick

    const owned = Object.values(lots).filter((l) => l.owner === bot.id);
    const emptyOwned = owned.filter((l) => !l.buildingId);

    // 1) construir em lote vazio próprio (tipos de 1 lote, por simplicidade)
    // — prioridade máxima: lote vazio só queima dinheiro
    if (emptyOwned.length) {
      const lot = pick(emptyOwned);
      const options = Object.entries(BUILDING_TYPES).filter(
        ([, bt]) => bt.lotes === 1 && bt.zonas.includes(lot.zone)
      );
      if (options.length) {
        const [type] = pick(options);
        const cost = engine.buildCost(type, 1, snap);
        if (bot.money >= cost + BOT_RESERVE) {
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
          continue;
        }
      }
    }

    // 2) iniciar upgrade aleatório
    const upgradeable = Object.values(buildings).filter(
      (b) =>
        lots[b.lotIds[0]]?.owner === bot.id &&
        b.upgradeEta === null &&
        b.level < 10
    );
    if (upgradeable.length && Math.random() < 0.5) {
      const b = upgradeable[Math.floor(Math.random() * upgradeable.length)];
      const cost = engine.upgradeCost(b, snap);
      if (bot.money >= cost + BOT_RESERVE) {
        bot.money -= cost;
        b.pendingLevel = b.level + 1;
        b.upgradeEta = now + engine.buildTimeMs(b.level + 1, devMode);
        continue;
      }
    }

    // 3) comprar um lote livre — só se sobra caixa para construir depois
    if (emptyOwned.length >= 2) continue; // não acumula terreno ocioso
    const free = Object.values(lots).filter((l) => !l.owner);
    if (free.length) {
      const lot = pick(free);
      const price = engine.lotValue(lot, snap);
      const cheapestBuild = 2400; // casa, o edifício mais barato
      if (bot.money >= price + cheapestBuild + BOT_RESERVE) {
        lot.owner = bot.id;
        lot.purchase = price;
        bot.money -= price;
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
  }
}

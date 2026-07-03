// ─── Tick global ────────────────────────────────────────────────────
// tick(state) → retorna novo estado PARCIAL (imutável, para Zustand).
// Sem setInterval aqui — só lógica pura. O intervalo vive no store.
import * as engine from "./engine.js";
import { runBots } from "./bots.js";

export const EVENTS = [
  { type: "boom",      label: "🌆 Boom Imobiliário",      color: "green",  dur: 5 },
  { type: "recession", label: "📉 Recessão",               color: "red",    dur: 3 },
  { type: "credit",    label: "🏦 Crédito Fácil",          color: "green",  dur: 3 },
  { type: "migration", label: "🌍 Onda Migratória",        color: "blue",   dur: 1 },
  { type: "crisis",    label: "⚠️ Crise Financeira",       color: "red",    dur: 4 },
  { type: "expansion", label: "🎓 Expansão Educacional",   color: "green",  dur: 5 },
  { type: "logistics", label: "🚂 Nova Linha Ferroviária", color: "blue",   dur: 6 },
  { type: "strike",    label: "⚡ Greve Geral",            color: "orange", dur: 2 },
];

const EVENT_GAP_MIN = 8;
const EVENT_GAP_MAX = 15;

function randGap() {
  return EVENT_GAP_MIN + Math.floor(Math.random() * (EVENT_GAP_MAX - EVENT_GAP_MIN + 1));
}

export function tick(state) {
  const now = Date.now();
  const t = state.tick;

  // clones rasos para mutação local (imutável do ponto de vista do Zustand)
  const lots = {};
  for (const [id, l] of Object.entries(state.lots)) lots[id] = { ...l };
  const buildings = {};
  for (const [id, b] of Object.entries(state.buildings)) buildings[id] = { ...b };
  const auctions = {};
  for (const [id, a] of Object.entries(state.auctions)) auctions[id] = { ...a };
  const bots = state.bots.map((b) => ({ ...b }));
  const botById = Object.fromEntries(bots.map((b) => [b.id, b]));
  let events = state.events.slice(-49); // mantém as últimas 50 entradas
  let { money, people, worldPop, macro } = state;
  let activeEvent = state.activeEvent;
  let nextEventTick = state.nextEventTick ?? t + randGap();

  // 1. crescimento populacional (recessão congela)
  const growthRate =
    activeEvent?.type === "recession"
      ? 0
      : worldPop < 1_000_000
        ? engine.WORLD_POP_GROWTH
        : 0.001;
  worldPop = worldPop * (1 + growthRate);

  // 2. capacidade de pessoas do jogador
  const peopleCap = Math.max(20, Math.floor(worldPop * engine.PEOPLE_PER_POP));

  // 3. macro reverte a 1.0
  macro = macro + (1 - macro) * engine.MACRO_PULL;
  macro = Math.min(engine.MACRO_MAX, Math.max(engine.MACRO_MIN, macro));

  // snapshot para as fórmulas do motor
  const snap = { ...state, lots, buildings, worldPop, macro, activeEvent };

  const addMoney = (owner, amount) => {
    if (owner === "player") money += amount;
    else if (botById[owner]) botById[owner].money += amount;
  };

  // 4. renda / manutenção / imposto por lote (player e bots)
  const maintMult = engine.eventMaintMult(snap);
  for (const lot of Object.values(lots)) {
    if (!lot.owner) continue;
    const b = lot.buildingId ? buildings[lot.buildingId] : null;
    if (!b) {
      // 4a. lote vazio: custo de ociosidade
      addMoney(lot.owner, -engine.ZONE_MAINT_EMPTY[lot.zone] * maintMult);
    } else if (b.upgradeEta === null) {
      // 4b. edifício ativo: renda e opex contam UMA vez (no lote principal),
      // imposto conta em cada lote.
      if (b.lotIds[0] === lot.id) {
        const renda = engine.buildingIncome(b, lot, snap, lot.owner);
        const custoOpex = engine.opex(b) * maintMult;
        addMoney(lot.owner, renda - custoOpex);
      }
      addMoney(lot.owner, -engine.lotValue(lot, snap) * engine.TAX_RATE);
    }
    // edifício em obras (upgradeEta !== null): sem renda nem custos
  }

  // 5. upgrades / construções concluídos
  for (const b of Object.values(buildings)) {
    if (b.upgradeEta !== null && b.upgradeEta <= now) {
      const isNew = b.pendingLevel === 1;
      b.level = b.pendingLevel ?? b.level;
      b.pendingLevel = null;
      b.upgradeEta = null;
      const owner = lots[b.lotIds[0]]?.owner;
      if (owner && owner !== "player") {
        // bots lotam os edifícios automaticamente
        b.workers = engine.workersCapacity(b);
      }
      if (owner === "player") {
        events.push({
          id: `ev-${now}-${b.id}`,
          type: "buildDone",
          label: isNew
            ? `🏗️ ${b.type} concluído em ${b.lotIds[0]}`
            : `⬆️ ${b.type} atingiu nível ${b.level}`,
          color: "green",
          at: now,
          endsAt: null,
        });
      }
    }
  }

  // 6. bots agem
  runBots({ lots, buildings, bots, snap, events, devMode: state.devMode });

  // 7. leilões expirados → transferir lote ao lead
  for (const a of Object.values(auctions)) {
    if ((a.status === "active" || a.status === "closing") && a.expiresAt <= now) {
      const lot = lots[a.lotId];
      if (lot && a.leadPlayer) {
        const seller = lot.owner;
        addMoney(a.leadPlayer, -a.currentBid);
        if (seller) addMoney(seller, a.currentBid);
        lot.owner = a.leadPlayer;
        lot.purchase = a.currentBid;
        lot.listedPrice = null;
        events.push({
          id: `ev-${now}-auc-${a.id}`,
          type: "auctionDone",
          label: `🔨 Leilão de ${a.lotId} vencido por ${a.leadPlayer} (${a.currentBid})`,
          color: "blue",
          at: now,
          endsAt: null,
        });
      }
      a.status = "done";
    }
  }

  // 8. eventos: encerra o ativo quando expira; sorteia novo no tick marcado
  const newTick = t + 1;
  if (activeEvent && newTick >= activeEvent.endsAtTick) {
    activeEvent = null;
    nextEventTick = newTick + randGap();
  }
  if (!activeEvent && newTick >= nextEventTick) {
    const def = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    activeEvent = {
      id: `ev-${now}-${def.type}`,
      type: def.type,
      label: def.label,
      color: def.color,
      at: now,
      startTick: newTick,
      endsAtTick: newTick + def.dur,
      endsAt: now + def.dur * (state.devMode ? 5000 : 60000),
    };
    // efeitos instantâneos
    if (def.type === "boom") macro = Math.min(engine.MACRO_MAX, macro + 0.25);
    if (def.type === "recession") macro = Math.max(engine.MACRO_MIN, macro - 0.20);
    if (def.type === "migration") {
      people += 5;
      for (const b of bots) b.people += 5;
    }
    events.push({ ...activeEvent });
    nextEventTick = newTick + def.dur + randGap();
  }

  // 9. pessoas limitadas pela capacidade
  people = Math.min(people, peopleCap);

  // 10. tick++  (11. o save é feito pelo store após aplicar)
  return {
    money,
    people,
    peopleCap,
    worldPop,
    macro,
    tick: newTick,
    lots,
    buildings,
    auctions,
    bots,
    events,
    activeEvent,
    nextEventTick,
  };
}

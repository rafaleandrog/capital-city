import { create } from "zustand";
import * as engine from "../engine/engine.js";
import { tick as worldTick } from "../engine/worldTick.js";
import { generateLots } from "../data/mapData.js";

const SAVE_KEY = "capital-city-save-v1";

// o interval vive fora do estado (não é serializável)
let tickTimer = null;

const BOTS_INIT = [
  { id: "bot0", name: "Vetra Corp",      color: "#e0653a", money: 10000, people: 20 },
  { id: "bot1", name: "Grupo Meridiano", color: "#8a63d2", money: 10000, people: 20 },
  { id: "bot2", name: "Áurea Invest",    color: "#2f9e77", money: 10000, people: 20 },
];

function freshState() {
  return {
    // jogador
    money: 10000,
    people: 20,
    peopleCap: 20,
    // mundo
    worldPop: 100000,
    macro: 1.0,
    tick: 0,
    devMode: true, // tick de 5s para teste; toggle no Header
    // coleções
    lots: generateLots(),
    buildings: {},
    auctions: {},
    bots: BOTS_INIT.map((b) => ({ ...b })),
    events: [],
    activeEvent: null,
    nextEventTick: 8 + Math.floor(Math.random() * 8),
    // seleção
    selectedLotId: null,
  };
}

function pickSave(s) {
  const {
    money, people, peopleCap, worldPop, macro, tick, devMode,
    lots, buildings, auctions, bots, events, activeEvent,
    nextEventTick, selectedLotId,
  } = s;
  return {
    money, people, peopleCap, worldPop, macro, tick, devMode,
    lots, buildings, auctions, bots, events, activeEvent,
    nextEventTick, selectedLotId,
  };
}

export const useGameStore = create((set, get) => ({
  ...freshState(),

  // ─── seleção ──────────────────────────────────────────────────────
  selectLot(lotId) {
    set({ selectedLotId: lotId });
  },

  // ─── ações do jogador ─────────────────────────────────────────────
  buyLot(lotId) {
    const s = get();
    const lot = s.lots[lotId];
    if (!lot) return { ok: false, reason: "Lote inexistente" };
    let price;
    let seller = null;
    if (lot.owner === null) {
      price = engine.lotValue(lot, s);
    } else if (lot.owner !== "player" && lot.listedPrice != null) {
      price = lot.listedPrice; // compra P2P de bot
      seller = lot.owner;
    } else {
      return { ok: false, reason: "Lote não está à venda" };
    }
    if (!engine.canAfford(price, s)) return { ok: false, reason: "Dinheiro insuficiente" };
    const lots = {
      ...s.lots,
      [lotId]: { ...lot, owner: "player", purchase: price, listedPrice: null },
    };
    const bots = seller
      ? s.bots.map((b) => (b.id === seller ? { ...b, money: b.money + price } : b))
      : s.bots;
    set({ lots, bots, money: s.money - price });
    get().saveGame();
    return { ok: true, price };
  },

  startBuild(type, lotIds) {
    const s = get();
    const check = engine.canBuild(type, lotIds, s);
    if (!check.ok) return check;
    const cost = engine.buildCost(type, 1, s);
    if (!engine.canAfford(cost, s)) return { ok: false, reason: "Dinheiro insuficiente" };
    const now = Date.now();
    const id = `b${now}-${Math.floor(Math.random() * 1e6)}`;
    const building = {
      id,
      lotIds: [...lotIds],
      type,
      level: 1,
      pendingLevel: 1, // vira ativo quando upgradeEta vence
      workers: 0,
      builtAt: now,
      upgradeEta: now + engine.buildTimeMs(1, s.devMode),
    };
    const lots = { ...s.lots };
    for (const lid of lotIds) {
      lots[lid] = { ...lots[lid], buildingId: id, listedPrice: null };
    }
    set({
      lots,
      buildings: { ...s.buildings, [id]: building },
      money: s.money - cost,
    });
    get().saveGame();
    return { ok: true, id };
  },

  startUpgrade(buildingId) {
    const s = get();
    const b = s.buildings[buildingId];
    if (!b) return { ok: false, reason: "Edifício inexistente" };
    if (engine.buildingOwner(b, s) !== "player") return { ok: false, reason: "Edifício não é seu" };
    if (b.upgradeEta !== null) return { ok: false, reason: "Já em obras" };
    if (b.level >= 10) return { ok: false, reason: "Nível máximo" };
    const cost = engine.upgradeCost(b, s);
    if (!engine.canAfford(cost, s)) return { ok: false, reason: "Dinheiro insuficiente" };
    const now = Date.now();
    set({
      money: s.money - cost,
      buildings: {
        ...s.buildings,
        [buildingId]: {
          ...b,
          pendingLevel: b.level + 1,
          upgradeEta: now + engine.buildTimeMs(b.level + 1, s.devMode),
        },
      },
    });
    get().saveGame();
    return { ok: true, cost };
  },

  assignWorkers(buildingId, n) {
    const s = get();
    const b = s.buildings[buildingId];
    if (!b) return { ok: false, reason: "Edifício inexistente" };
    if (engine.buildingOwner(b, s) !== "player") return { ok: false, reason: "Edifício não é seu" };
    const cap = engine.workersCapacity(b);
    const usedElsewhere = Object.values(s.buildings).reduce(
      (sum, ob) =>
        ob.id !== buildingId && engine.buildingOwner(ob, s) === "player"
          ? sum + ob.workers
          : sum,
      0
    );
    const workers = Math.max(0, Math.min(n, cap, s.people - usedElsewhere));
    set({ buildings: { ...s.buildings, [buildingId]: { ...b, workers } } });
    get().saveGame();
    return { ok: true, workers };
  },

  listForSale(lotId, price) {
    const s = get();
    const lot = s.lots[lotId];
    if (!lot || lot.owner !== "player") return { ok: false, reason: "Lote não é seu" };
    if (!(price > 0)) return { ok: false, reason: "Preço inválido" };
    set({ lots: { ...s.lots, [lotId]: { ...lot, listedPrice: Math.round(price) } } });
    get().saveGame();
    return { ok: true };
  },

  cancelListing(lotId) {
    const s = get();
    const lot = s.lots[lotId];
    if (!lot || lot.owner !== "player") return { ok: false, reason: "Lote não é seu" };
    set({ lots: { ...s.lots, [lotId]: { ...lot, listedPrice: null } } });
    get().saveGame();
    return { ok: true };
  },

  placeBid(auctionId, amount) {
    const s = get();
    const a = s.auctions[auctionId];
    if (!a || a.status !== "active" || Date.now() >= a.expiresAt) {
      return { ok: false, reason: "Leilão indisponível" };
    }
    const minBid = Math.ceil(a.currentBid * (1 + engine.AUCTION_MIN_RAISE));
    if (amount < minBid) return { ok: false, reason: `Lance mínimo: ${minBid}` };
    if (!engine.canAfford(amount, s)) return { ok: false, reason: "Dinheiro insuficiente" };
    set({
      auctions: {
        ...s.auctions,
        [auctionId]: {
          ...a,
          currentBid: amount,
          leadPlayer: "player",
          bids: [...a.bids, { player: "player", amount, at: Date.now() }],
        },
      },
    });
    return { ok: true };
  },

  // ─── loop / ciclo de vida ─────────────────────────────────────────
  runTick() {
    set((state) => worldTick(state));
    get().saveGame();
  },

  toggleDevMode() {
    set((s) => ({ devMode: !s.devMode }));
    get()._restartTimer(); // ao trocar devMode, limpar e recriar o interval
    get().saveGame();
  },

  _restartTimer() {
    if (tickTimer) clearInterval(tickTimer);
    const ms = get().devMode ? 5000 : 60000;
    tickTimer = setInterval(() => get().runTick(), ms);
  },

  saveGame() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(pickSave(get())));
    } catch {
      /* localStorage cheio/indisponível: segue sem persistir */
    }
  },

  loadGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      set(JSON.parse(raw));
      return true;
    } catch {
      return false;
    }
  },

  resetGame() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* ok */
    }
    set(freshState());
    get()._restartTimer();
  },

  initGame() {
    get().loadGame(); // carrega o save se existir
    get()._restartTimer();
  },
}));

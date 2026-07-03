import { create } from "zustand";
import * as engine from "../engine/engine.js";
import { tick as worldTick } from "../engine/worldTick.js";
import { generateLots } from "../data/mapData.js";
import { BUILDING_TYPES } from "../data/buildingTypes.js";

const SAVE_KEY = "capitalCity_v1";

// timers vivem fora do estado (não são serializáveis)
let tickTimer = null;
let auctionTimers = {}; // { [auctionId]: { bot, end } }
let toastSeq = 0;
let initialized = false; // evita confirm duplo no StrictMode

const BOTS_INIT = [
  { id: "bot0", name: "Grupo Andrade",   color: "#f472b6", money: 8000, people: 15 },
  { id: "bot1", name: "Holding Verne",   color: "#a78bfa", money: 8000, people: 15 },
  { id: "bot2", name: "Consórcio Otero", color: "#2dd4bf", money: 8000, people: 15 },
];

export const OWNER_LABEL = {
  player: "Você",
  bot0: "Grupo Andrade",
  bot1: "Holding Verne",
  bot2: "Consórcio Otero",
};

// renda esperada por tick, SEM o ruído aleatório — para exibição na UI.
// Mesma fórmula de engine.buildingIncome, composta das partes exportadas.
export function expectedIncome(building, lot, state, owner = "player") {
  const bt = BUILDING_TYPES[building.type];
  const rendaNivel = bt.renda * engine.LEVEL_FACTOR[building.level];
  const rendaLocal = rendaNivel * engine.locationMult(lot, state);
  const cap = engine.workersCapacity(building);
  const eff = engine.eventStrike(state) ? 0 : building.workers;
  const workerMult = 1 + (cap > 0 ? eff / cap : 0) * engine.WORKER_BONUS;
  return (
    rendaLocal *
    workerMult *
    engine.worldShareMult(state, owner) *
    engine.eventRentMult(state, lot, building)
  );
}

function isAdjacent(a, b) {
  return (
    a.quadraId === b.quadraId &&
    Math.abs(a.lx - b.lx) + Math.abs(a.ly - b.ly) === 1
  );
}

function clearAuctionTimers(auctionId) {
  const t = auctionTimers[auctionId];
  if (t) {
    clearTimeout(t.bot);
    clearTimeout(t.end);
    delete auctionTimers[auctionId];
  }
}

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
    devMode: true,
    // coleções
    lots: generateLots(),
    buildings: {},
    auctions: {},
    bots: BOTS_INIT.map((b) => ({ ...b })),
    events: [],
    activeEvent: null,
    nextEventTick: 8 + Math.floor(Math.random() * 8),
    // seleção / UI
    selectedLotId: null,
    macroHistory: [1.0], // últimos 20 valores do macro (sparkline)
    incomeHist: {},      // { [buildingId]: últimas 5 rendas estimadas }
    buildPlan: null,     // { type, lotIds } — seleção multi-lote em curso
    highlightLotIds: [], // lotes destacados no mapa (hover de card)
    toasts: [],
  };
}

// snapshot para o save. Leilões em andamento e evento ativo NÃO são
// salvos — o escrow de lances ativos é devolvido no snapshot para o
// dinheiro não sumir ao recarregar.
function pickSave(s) {
  let money = s.money;
  const botEscrow = {};
  for (const a of Object.values(s.auctions)) {
    if (a.status !== "active" || !a.leadPlayer) continue;
    if (a.leadPlayer === "player") money += a.currentBid;
    else botEscrow[a.leadPlayer] = (botEscrow[a.leadPlayer] || 0) + a.currentBid;
  }
  const bots = s.bots.map((b) =>
    botEscrow[b.id] ? { ...b, money: b.money + botEscrow[b.id] } : b
  );
  const {
    people, peopleCap, worldPop, macro, tick, devMode,
    lots, buildings, events, nextEventTick, macroHistory, incomeHist,
  } = s;
  return {
    money, people, peopleCap, worldPop, macro, tick, devMode,
    lots, buildings, bots, events, nextEventTick, macroHistory, incomeHist,
  };
}

export const useGameStore = create((set, get) => ({
  ...freshState(),

  // ─── seleção (com auto-adição ao plano de construção) ─────────────
  selectLot(lotId) {
    const s = get();
    const plan = s.buildPlan;
    if (plan && lotId) {
      const bt = BUILDING_TYPES[plan.type];
      // clicar num lote já no plano (menos o primeiro) remove-o
      const idx = plan.lotIds.indexOf(lotId);
      if (idx > 0) {
        set({ buildPlan: { ...plan, lotIds: plan.lotIds.filter((id) => id !== lotId) } });
        return;
      }
      if (idx === -1 && plan.lotIds.length < bt.lotes) {
        const lot = s.lots[lotId];
        const valid =
          lot &&
          lot.owner === "player" &&
          !lot.buildingId &&
          bt.zonas.includes(lot.zone) &&
          plan.lotIds.some((id) => isAdjacent(s.lots[id], lot));
        if (valid) {
          set({ buildPlan: { ...plan, lotIds: [...plan.lotIds, lotId] } });
          return; // mantém o painel ancorado no lote inicial do plano
        }
      }
    }
    set({ selectedLotId: lotId });
  },

  // ─── compra direta / P2P ──────────────────────────────────────────
  buyLot(lotId) {
    const s = get();
    const lot = s.lots[lotId];
    if (!lot) return { ok: false, reason: "Lote inexistente" };
    let price;
    let seller = null;
    if (lot.owner === null) {
      price = engine.lotValue(lot, s);
    } else if (lot.owner !== "player" && lot.listedPrice != null) {
      price = lot.listedPrice;
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
    get().addToast(`Lote ${lotId} comprado por 💰 ${price}`, "green");
    get().saveGame();
    return { ok: true, price };
  },

  // ─── construção ───────────────────────────────────────────────────
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
      pendingLevel: 1,
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
    get().addToast(`🏗️ Construção de ${type} iniciada (−💰 ${cost})`, "green");
    get().saveGame();
    return { ok: true, id };
  },

  // plano multi-lote: 1º lote é o selecionado; os demais vêm de cliques no mapa
  startBuildPlan(type, anchorLotId) {
    const bt = BUILDING_TYPES[type];
    if (!bt) return { ok: false, reason: "Tipo inválido" };
    if (bt.lotes === 1) return get().startBuild(type, [anchorLotId]);
    set({ buildPlan: { type, lotIds: [anchorLotId] }, selectedLotId: anchorLotId });
    return { ok: true, pending: true };
  },

  confirmBuildPlan() {
    const plan = get().buildPlan;
    if (!plan) return { ok: false, reason: "Sem plano ativo" };
    const res = get().startBuild(plan.type, plan.lotIds);
    if (res.ok) set({ buildPlan: null, highlightLotIds: [] });
    return res;
  },

  cancelBuildPlan() {
    set({ buildPlan: null, highlightLotIds: [] });
  },

  setHighlight(lotIds) {
    set({ highlightLotIds: lotIds || [] });
  },

  // ─── upgrade / venda / workers ────────────────────────────────────
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

  sellBuilding(buildingId) {
    const s = get();
    const b = s.buildings[buildingId];
    if (!b || engine.buildingOwner(b, s) !== "player") return { ok: false, reason: "Edifício não é seu" };
    if (b.upgradeEta !== null) return { ok: false, reason: "Em obras" };
    const refund = Math.round(engine.buildCost(b.type, 1) * 0.5); // 50% do custo base
    const buildings = { ...s.buildings };
    delete buildings[buildingId];
    const lots = { ...s.lots };
    for (const lid of b.lotIds) lots[lid] = { ...lots[lid], buildingId: null };
    const incomeHist = { ...s.incomeHist };
    delete incomeHist[buildingId];
    set({ buildings, lots, incomeHist, money: s.money + refund });
    get().addToast(`Edifício demolido/vendido por 💰 ${refund}`, "orange");
    get().saveGame();
    return { ok: true, refund };
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

  // ─── mercado P2P ──────────────────────────────────────────────────
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

  // ─── leilões (escrow: o lance fica reservado; ninguém paga 2×) ────
  startAuction(lotId) {
    const s = get();
    const lot = s.lots[lotId];
    if (!lot || lot.owner !== null) return { ok: false, reason: "Lote não disponível para leilão" };
    if (Object.values(s.auctions).some((a) => a.lotId === lotId && a.status !== "done")) {
      return { ok: false, reason: "Já existe leilão para este lote" };
    }
    const startBid = engine.lotValue(lot, s);
    if (!engine.canAfford(startBid, s)) return { ok: false, reason: "Dinheiro insuficiente" };
    const now = Date.now();
    const id = `a${now}`;
    const auction = {
      id,
      lotId,
      status: "active",
      currentBid: startBid,
      leadPlayer: "player",
      expiresAt: now + engine.AUCTION_SECS * 1000,
      bids: [{ player: "player", amount: startBid, at: now }],
    };
    // reserva o lance inicial (escrow)
    set({ auctions: { ...s.auctions, [id]: auction }, money: s.money - startBid });
    get().addToast(`🔨 Leilão iniciado em ${lotId} — lance 💰 ${startBid}`, "orange");
    get()._armAuction(id);
    get().saveGame();
    return { ok: true, id };
  },

  placeBid(auctionId, amount) {
    const s = get();
    const a = s.auctions[auctionId];
    if (!a || a.status !== "active" || Date.now() >= a.expiresAt) {
      return { ok: false, reason: "Leilão indisponível" };
    }
    if (a.leadPlayer === "player") return { ok: false, reason: "Você já está na frente" };
    const minBid = Math.ceil(a.currentBid * (1 + engine.AUCTION_MIN_RAISE));
    if (amount < minBid) return { ok: false, reason: `Lance mínimo: ${minBid}` };
    if (!engine.canAfford(amount, s)) return { ok: false, reason: "Dinheiro insuficiente" };
    // devolve o escrow ao lead anterior (bot) e reserva o do player
    const bots = s.bots.map((b) =>
      b.id === a.leadPlayer ? { ...b, money: b.money + a.currentBid } : b
    );
    const now = Date.now();
    set({
      money: s.money - amount,
      bots,
      auctions: {
        ...s.auctions,
        [auctionId]: {
          ...a,
          currentBid: amount,
          leadPlayer: "player",
          expiresAt: now + engine.AUCTION_SECS * 1000, // lance reinicia o timer
          bids: [...a.bids, { player: "player", amount, at: now }],
        },
      },
    });
    get()._armAuction(auctionId);
    get().saveGame();
    return { ok: true };
  },

  // lance automático de bot, 3–8s após o último movimento
  _botBid(auctionId) {
    const s = get();
    const a = s.auctions[auctionId];
    if (!a || a.status !== "active" || Date.now() >= a.expiresAt) return;
    const nextBid = Math.ceil(a.currentBid * (1 + engine.AUCTION_MIN_RAISE));
    // bot entra se não é o lead e o lance atual cabe em 40% do caixa dele
    const candidates = s.bots.filter(
      (b) => b.id !== a.leadPlayer && b.money >= nextBid && a.currentBid < b.money * 0.4
    );
    if (candidates.length && Math.random() < 0.85) {
      const bot = candidates[Math.floor(Math.random() * candidates.length)];
      let money = s.money;
      const bots = s.bots.map((b) => {
        if (b.id === bot.id) return { ...b, money: b.money - nextBid };
        if (b.id === a.leadPlayer) return { ...b, money: b.money + a.currentBid };
        return b;
      });
      if (a.leadPlayer === "player") money += a.currentBid; // devolve escrow do player
      const now = Date.now();
      set({
        money,
        bots,
        auctions: {
          ...s.auctions,
          [auctionId]: {
            ...a,
            currentBid: nextBid,
            leadPlayer: bot.id,
            expiresAt: now + engine.AUCTION_SECS * 1000,
            bids: [...a.bids, { player: bot.id, amount: nextBid, at: now }],
          },
        },
      });
      get().addToast(`${bot.name} deu lance de 💰 ${nextBid} em ${a.lotId}`, "blue");
      get().saveGame();
    }
    get()._armAuction(auctionId); // agenda próxima tentativa / finalização
  },

  // transfere o lote ao lead; o dinheiro já estava em escrow
  _settleAuction(auctionId) {
    const s = get();
    const a = s.auctions[auctionId];
    if (!a || a.status === "done") return;
    if (Date.now() < a.expiresAt) {
      get()._armAuction(auctionId);
      return;
    }
    const lot = s.lots[a.lotId];
    const auctions = { ...s.auctions, [auctionId]: { ...a, status: "done" } };
    let lots = s.lots;
    if (lot && a.leadPlayer) {
      lots = {
        ...s.lots,
        [a.lotId]: { ...lot, owner: a.leadPlayer, purchase: a.currentBid, listedPrice: null },
      };
    }
    const label = `🔨 Lote ${a.lotId} arrematado por ${OWNER_LABEL[a.leadPlayer]} — 💰 ${a.currentBid}`;
    const events = [
      ...s.events,
      { id: `ev-auc-${auctionId}`, type: "auctionDone", label, color: "orange", at: Date.now(), endsAt: null },
    ].slice(-50);
    set({ auctions, lots, events });
    get().addToast(label, "orange");
    clearAuctionTimers(auctionId);
    get().saveGame();
  },

  _armAuction(auctionId) {
    clearAuctionTimers(auctionId);
    const a = get().auctions[auctionId];
    if (!a || a.status !== "active") return;
    const remaining = a.expiresAt - Date.now();
    if (remaining <= 0) {
      get()._settleAuction(auctionId);
      return;
    }
    const timers = {};
    const botDelay = 3000 + Math.random() * 7000; // bot age em 3–10s
    if (botDelay < remaining) {
      timers.bot = setTimeout(() => get()._botBid(auctionId), botDelay);
    }
    timers.end = setTimeout(() => get()._settleAuction(auctionId), remaining + 80);
    auctionTimers[auctionId] = timers;
  },

  _finalizeExpiredAuctions() {
    const now = Date.now();
    for (const a of Object.values(get().auctions)) {
      if (a.status !== "done" && a.expiresAt <= now) get()._settleAuction(a.id);
    }
  },

  // ─── toasts ───────────────────────────────────────────────────────
  addToast(label, color = "green") {
    const id = `t${++toastSeq}`;
    set((s) => ({ toasts: [...s.toasts, { id, label, color }].slice(-3) })); // stack máx 3
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },

  // ─── loop / ciclo de vida ─────────────────────────────────────────
  runTick() {
    const prevEvent = get().activeEvent;
    const prevMoney = get().money;
    // fecha leilões vencidos ANTES do worldTick (o dinheiro já está em
    // escrow; o passo 7 do worldTick só processa leilões ainda ativos)
    get()._finalizeExpiredAuctions();
    set((state) => worldTick(state));
    // históricos pós-tick (sparkline do macro e renda por edifício)
    const s = get();
    const macroHistory = [...s.macroHistory, s.macro].slice(-20);
    const incomeHist = {};
    for (const b of Object.values(s.buildings)) {
      if (engine.buildingOwner(b, s) !== "player") continue;
      const prev = s.incomeHist[b.id] || [];
      if (b.upgradeEta !== null) {
        incomeHist[b.id] = prev;
        continue;
      }
      const est = Math.round(expectedIncome(b, s.lots[b.lotIds[0]], s));
      incomeHist[b.id] = [...prev, est].slice(-5);
    }
    set({ macroHistory, incomeHist });

    // transições de evento mundial → toast + registro de fim nas crônicas
    if (s.activeEvent && s.activeEvent.id !== prevEvent?.id) {
      const dur = s.activeEvent.endsAtTick - s.activeEvent.startTick;
      get().addToast(`${s.activeEvent.label} — ${dur} ticks`, s.activeEvent.color);
    }
    if (prevEvent && s.activeEvent?.id !== prevEvent.id) {
      set((st) => ({
        events: [
          ...st.events,
          {
            id: `${prevEvent.id}-end`,
            type: prevEvent.type,
            label: `${prevEvent.label} — encerrado`,
            color: "gray",
            at: Date.now(),
            endsAt: null,
          },
        ].slice(-50),
      }));
    }
    if (prevMoney >= 0 && s.money < 0) get().addToast("⚠️ Saldo negativo!", "red");

    // autosave a cada 5 ticks
    if (s.tick % 5 === 0) get().saveGame();
  },

  toggleDevMode() {
    set((s) => ({ devMode: !s.devMode }));
    get()._restartTimer();
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
      // leilões e evento ativo NÃO são restaurados (resetam ao carregar)
      set({
        ...JSON.parse(raw),
        auctions: {},
        activeEvent: null,
        selectedLotId: null,
        buildPlan: null,
        highlightLotIds: [],
        toasts: [],
      });
      return true;
    } catch {
      return false;
    }
  },

  resetGame() {
    if (typeof window !== "undefined" && !window.confirm("Reiniciar o jogo? O progresso salvo será apagado.")) {
      return;
    }
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* ok */
    }
    for (const id of Object.keys(auctionTimers)) clearAuctionTimers(id);
    set(freshState());
    get()._restartTimer();
    get().addToast("Novo jogo iniciado", "green");
  },

  initGame() {
    if (initialized) {
      get()._restartTimer();
      return;
    }
    initialized = true;
    let hasSave = false;
    try {
      hasSave = !!localStorage.getItem(SAVE_KEY);
    } catch {
      /* ok */
    }
    if (hasSave && window.confirm("Continuar partida salva?")) {
      get().loadGame();
    }
    // se recusou, segue no estado inicial; o autosave sobrescreve o save antigo
    get()._restartTimer();
  },
}));

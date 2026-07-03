// ─── Motor econômico — lógica pura, sem React ───────────────────────
import { BUILDING_TYPES } from "../data/buildingTypes.js";
import { quadraById } from "../data/mapData.js";

export { BUILDING_TYPES };

// ─── Constantes do motor ────────────────────────────────────────────
// índice 0 não usado; fator[nível] dá a multiplicação vs L1
export const LEVEL_FACTOR = [0, 1.000, 1.117, 1.250, 1.383, 1.550, 1.717, 1.917, 2.150, 2.383, 2.667];

// a cada nível, quantos workers a mais (acumulativo)
export const WORKERS_CAP_ADD = [0, 0, 1, 1, 2, 2, 3, 3, 4, 5, 5];

export const ZONE_BASE_PRICE  = { central: 5000, comercial: 3000, residencial: 1500, industrial: 2000, periferico: 800 };
export const ZONE_MAINT_EMPTY = { central: 80,   comercial: 50,   residencial: 25,   industrial: 35,   periferico: 12 };

export const VIA_RENT_MULT  = { rua: 1.00, avenida: 1.25, rodovia: 1.20, ferrovia: 1.15 };
export const VIA_VALUE_MULT = { rua: 1.00, avenida: 1.30, rodovia: 1.25, ferrovia: 1.20 };
export const CORNER_MULT   = 1.15;
export const INTERIOR_MULT = 0.90;

export const ANCHOR_RENT_MULT  = { porto: 1.30, distFinanceiro: 1.35, universidade: 1.25, hospital: 1.20, estacao: 1.20 };
export const ANCHOR_VALUE_MULT = { porto: 1.50, distFinanceiro: 1.45, universidade: 1.35, hospital: 1.30, estacao: 1.25 };

export const OPEX_RATE     = 0.15;    // opex = rendaBaseNivel * 0.15
export const TAX_RATE      = 0.0006;  // imposto = valorLote * 0.0006 / tick
export const WORKER_BONUS  = 0.50;    // workers cheios = +50% renda
export const INCOME_NOISE  = 0.15;    // ±15% variação aleatória por tick
export const NPC_BASE_FRAC = 0.002;   // worldPop × 0.002 = atração de NPCs
export const AUCTION_SECS  = 30;
export const AUCTION_MIN_RAISE = 0.10; // mínimo +10% do lance atual

export const WORLD_POP_GROWTH = 0.003;   // +0.3%/tick até 1M, depois 0.001
export const PEOPLE_PER_POP   = 0.00005; // peopleCap = worldPop * PEOPLE_PER_POP (mín 20)
export const MACRO_PULL       = 0.02;    // macro reverte a 1.0 todo tick
export const MACRO_MIN = 0.7;            // macro varia ±0.3
export const MACRO_MAX = 1.3;

export const COST_BUILD_MULT   = 60;   // custo construção L1 = rendaBaseL1 × 60
export const COST_UPGRADE_BASE = 0.6;  // custo upgrade = custoL1 × 0.6 × 1.5^(nivel-1)
export const BUILD_TIME_MIN    = 5;    // minutos por nível

// Normalização do worldShareMult: calibrada para que um jogador solo
// com 1 loja (renda 55) tenha mult ≈ 1.0 → renda ~60-80/tick.
// share(55/(55+200)) × pool(100000×0.01) × NORM ≈ 1
export const WORLD_SHARE_NORM = 0.0046;
export const WORLD_SHARE_MAX  = 4; // teto de estabilidade

// ─── Modificadores de evento ativo ──────────────────────────────────
export function eventRentMult(state, lot, building) {
  const ev = state?.activeEvent;
  if (!ev) return 1;
  if (ev.type === "crisis") return 0.8;
  if (ev.type === "expansion" && (lot.zone === "residencial" || building.type === "universidade")) return 1.3;
  if (ev.type === "logistics" && (lot.zone === "industrial" || building.type === "armazem")) return 1.2;
  return 1;
}

export function eventMaintMult(state) {
  return state?.activeEvent?.type === "crisis" ? 2.0 : 1;
}

export function eventBuildCostMult(state) {
  return state?.activeEvent?.type === "credit" ? 0.6 : 1;
}

export function eventStrike(state) {
  return state?.activeEvent?.type === "strike";
}

// ─── Fórmulas ───────────────────────────────────────────────────────
export function locationMult(lot, _state) {
  let m = 1.0;
  const faces = Object.values(lot.frontage).filter(Boolean);
  if (faces.length === 0) m *= INTERIOR_MULT;
  else m *= Math.max(...faces.map((f) => VIA_RENT_MULT[f])); // maior face vence
  if (lot.isCorner) m *= CORNER_MULT;
  if (lot.inAnchorOf) m *= ANCHOR_RENT_MULT[lot.inAnchorOf];
  return m;
}

export function lotValue(lot, state) {
  const base = ZONE_BASE_PRICE[lot.zone];
  let vm = 1.0;
  const faces = Object.values(lot.frontage).filter(Boolean);
  if (faces.length === 0) vm *= INTERIOR_MULT;
  else vm *= Math.max(...faces.map((f) => VIA_VALUE_MULT[f]));
  if (lot.isCorner) vm *= CORNER_MULT;
  if (lot.inAnchorOf) vm *= ANCHOR_VALUE_MULT[lot.inAnchorOf];
  return Math.round(base * vm * (state?.macro ?? 1));
}

export function workersCapacity(building) {
  const bt = BUILDING_TYPES[building.type];
  let add = 0;
  for (let i = 2; i <= building.level; i++) add += WORKERS_CAP_ADD[i];
  return bt.workers + add;
}

// Atração de um edifício para o worldShare (edifício em obras não atrai).
export function buildingAttraction(building) {
  if (building.upgradeEta !== null) return 0;
  return BUILDING_TYPES[building.type].renda * LEVEL_FACTOR[building.level];
}

export function buildingOwner(building, state) {
  return state.lots[building.lotIds[0]]?.owner ?? null;
}

export function worldShareMult(state, owner = "player") {
  let total = state.worldPop * NPC_BASE_FRAC;
  let own = 0;
  for (const b of Object.values(state.buildings)) {
    const a = buildingAttraction(b);
    total += a;
    if (buildingOwner(b, state) === owner) own += a;
  }
  if (own <= 0 || total <= 0) return 0;
  const share = own / total;
  const mult = share * (state.worldPop * 0.01) * WORLD_SHARE_NORM;
  return Math.min(mult, WORLD_SHARE_MAX);
}

// Renda de um edifício por tick (💰/tick). Pode ser negativa depois
// de opex/imposto se o mundo for pequeno.
export function buildingIncome(building, lot, state, owner = "player") {
  const bt = BUILDING_TYPES[building.type];
  const rendaNivel = bt.renda * LEVEL_FACTOR[building.level];
  const rendaLocal = rendaNivel * locationMult(lot, state);
  const cap = workersCapacity(building);
  const effWorkers = eventStrike(state) ? 0 : building.workers;
  const workerMult = 1 + (cap > 0 ? effWorkers / cap : 0) * WORKER_BONUS;
  const rendaWorld = rendaLocal * workerMult * worldShareMult(state, owner);
  const noise = 1 + (Math.random() * 2 - 1) * INCOME_NOISE;
  return rendaWorld * eventRentMult(state, lot, building) * noise;
}

export function opex(building) {
  const bt = BUILDING_TYPES[building.type];
  return bt.renda * LEVEL_FACTOR[building.level] * OPEX_RATE * bt.lotes;
}

export function canAfford(cost, state) {
  return state.money >= cost;
}

export function buildCost(type, level = 1, state = null) {
  const bt = BUILDING_TYPES[type];
  return Math.round(bt.renda * COST_BUILD_MULT * LEVEL_FACTOR[level] * eventBuildCostMult(state));
}

export function upgradeCost(building, state = null) {
  const bt = BUILDING_TYPES[building.type];
  const custoL1 = bt.renda * COST_BUILD_MULT;
  return Math.round(custoL1 * COST_UPGRADE_BASE * Math.pow(1.5, building.level - 1) * eventBuildCostMult(state));
}

export function buildTimeMs(level, devMode = false) {
  return devMode
    ? BUILD_TIME_MIN * level * 1000   // segundos em devMode
    : BUILD_TIME_MIN * level * 60000; // minutos em tempo real
}

// Valida tipo + quantidade de lotes + zona + dono + contiguidade.
// Retorna { ok, reason }.
export function canBuild(type, lotIds, state, owner = "player") {
  const bt = BUILDING_TYPES[type];
  if (!bt) return { ok: false, reason: "Tipo de edifício inválido" };
  if (!Array.isArray(lotIds) || lotIds.length !== bt.lotes) {
    return { ok: false, reason: `${type} precisa de exatamente ${bt.lotes} lote(s)` };
  }
  if (new Set(lotIds).size !== lotIds.length) {
    return { ok: false, reason: "Lotes repetidos" };
  }
  const lots = lotIds.map((id) => state.lots[id]);
  if (lots.some((l) => !l)) return { ok: false, reason: "Lote inexistente" };
  if (lots.some((l) => l.owner !== owner)) return { ok: false, reason: "Todos os lotes precisam ser seus" };
  if (lots.some((l) => l.buildingId)) return { ok: false, reason: "Já existe edifício em um dos lotes" };
  if (lots.some((l) => !bt.zonas.includes(l.zone))) {
    return { ok: false, reason: `Zona inválida (permitidas: ${bt.zonas.join(", ")})` };
  }
  const qid = lots[0].quadraId;
  if (lots.some((l) => l.quadraId !== qid)) {
    return { ok: false, reason: "Lotes precisam estar na mesma quadra" };
  }
  if (!isContiguous(lots)) return { ok: false, reason: "Lotes precisam ser contíguos" };
  return { ok: true };
}

// BFS de adjacência ortogonal dentro da quadra.
function isContiguous(lots) {
  if (lots.length <= 1) return true;
  const key = (l) => `${l.lx},${l.ly}`;
  const set = new Set(lots.map(key));
  const visited = new Set([key(lots[0])]);
  const queue = [lots[0]];
  while (queue.length) {
    const { lx, ly } = queue.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = `${lx + dx},${ly + dy}`;
      if (set.has(k) && !visited.has(k)) {
        visited.add(k);
        queue.push({ lx: lx + dx, ly: ly + dy });
      }
    }
  }
  return visited.size === lots.length;
}

export { quadraById };

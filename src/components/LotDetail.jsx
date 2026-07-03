import { useState } from "react";
import { useGameStore, expectedIncome, OWNER_LABEL } from "../store/gameStore.js";
import * as engine from "../engine/engine.js";
import { BUILDING_TYPES, BUILDING_LABELS } from "../data/buildingTypes.js";
import { BUILDING_ICON } from "./MapSVG.jsx";
import { useNow } from "./useNow.js";

const fmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

const VIA_SHORT = { rua: "Rua", avenida: "Av.", rodovia: "Rod.", ferrovia: "Fer." };
const DIR_LABEL = { N: "Norte", S: "Sul", L: "Leste", O: "Oeste" };
const ANCHOR_LABEL = {
  porto: "⚓ Porto",
  distFinanceiro: "🏦 Distrito Financeiro",
  universidade: "🎓 Universidade",
  estacao: "🚉 Estação",
};

function frontageSummary(lot) {
  const parts = Object.entries(lot.frontage)
    .filter(([, v]) => v)
    .map(([d, v]) => `${VIA_SHORT[v]} ${DIR_LABEL[d]}`);
  if (lot.isCorner) parts.push("Esquina");
  return parts.length ? parts.join(" | ") : "Interior";
}

// ─── Cabeçalho de localização (compartilhado pelos estados) ─────────
function LocationInfo({ lot, state }) {
  const value = engine.lotValue(lot, state);
  const locMult = engine.locationMult(lot, state);
  return (
    <div className="space-y-0.5 text-[var(--parchment-dim)]">
      <div>
        <span className="capitalize text-[var(--parchment)]">{lot.zone}</span> · Lote{" "}
        <span className="font-num">{lot.id}</span> · 📍 {frontageSummary(lot)}
      </div>
      <div>
        Valor estimado: <span className="font-num text-[var(--gold-300)]">💰 {fmt.format(value)}</span> ·
        Acessibilidade: <span className="font-num">×{locMult.toFixed(2)}</span>
      </div>
      <div>
        {lot.inAnchorOf ? (
          <>
            Âncora próxima: {ANCHOR_LABEL[lot.inAnchorOf]}{" "}
            <span className="font-num">×{engine.ANCHOR_RENT_MULT[lot.inAnchorOf].toFixed(2)}</span>
          </>
        ) : (
          "Sem âncora"
        )}
      </div>
    </div>
  );
}

// ─── Estado: sem dono ───────────────────────────────────────────────
function UnownedView({ lot, state }) {
  const startAuction = useGameStore((s) => s.startAuction);
  const addToast = useGameStore((s) => s.addToast);
  const value = engine.lotValue(lot, state);
  const canPay = engine.canAfford(value, state);
  return (
    <div className="space-y-2">
      <LocationInfo lot={lot} state={state} />
      <div className="text-[var(--parchment-dim)]">
        Custo de manutenção vazio:{" "}
        <span className="font-num">{engine.ZONE_MAINT_EMPTY[lot.zone]}</span>/tick
      </div>
      <button
        className="cc-btn"
        disabled={!canPay}
        title={canPay ? "O lance inicial fica reservado" : `Faltam 💰 ${fmt.format(value - state.money)}`}
        onClick={() => {
          const res = startAuction(lot.id);
          if (!res.ok) addToast(res.reason, "red");
        }}
      >
        🔨 Iniciar Leilão — Lance mínimo: 💰 {fmt.format(value)}
      </button>
    </div>
  );
}

// ─── Estado: leilão ativo ───────────────────────────────────────────
function AuctionView({ lot, auction, state }) {
  const placeBid = useGameStore((s) => s.placeBid);
  const addToast = useGameStore((s) => s.addToast);
  const now = useNow(true, 250);
  const minBid = Math.ceil(auction.currentBid * (1 + engine.AUCTION_MIN_RAISE));
  const [bid, setBid] = useState("");
  const secs = Math.max(0, Math.ceil((auction.expiresAt - now) / 1000));
  const isLead = auction.leadPlayer === "player";
  const bidValue = bid === "" ? minBid : Number(bid);

  return (
    <div className="space-y-2">
      <LocationInfo lot={lot} state={state} />
      <div className="flex items-center gap-4">
        <div
          className={`font-num text-4xl font-bold ${secs <= 5 ? "text-red-400 cc-pulse" : "text-[var(--gold-300)]"}`}
        >
          {secs}s
        </div>
        <div>
          <div>
            Lance atual: <span className="font-num text-[var(--gold-300)]">💰 {fmt.format(auction.currentBid)}</span>{" "}
            por <span className="text-[var(--parchment)]">{OWNER_LABEL[auction.leadPlayer]}</span>
          </div>
          {isLead && <div className="text-green-400 font-display text-[11px] tracking-wider">VOCÊ ESTÁ NA FRENTE!</div>}
        </div>
      </div>
      <div className="text-[10px] space-y-0.5 text-[var(--parchment-dim)]">
        {auction.bids.slice(-5).reverse().map((b, i) => (
          <div key={i} className="font-num">
            💰 {fmt.format(b.amount)} — {OWNER_LABEL[b.player]}
          </div>
        ))}
      </div>
      {!isLead && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            className="w-28 bg-black/40 border border-[var(--stone-700)] rounded px-2 py-1 font-num text-[var(--parchment)]"
            placeholder={String(minBid)}
            value={bid}
            min={minBid}
            onChange={(e) => setBid(e.target.value)}
          />
          <button
            className="cc-btn"
            disabled={bidValue < minBid || !engine.canAfford(bidValue, state)}
            title={
              !engine.canAfford(bidValue, state)
                ? "Dinheiro insuficiente"
                : bidValue < minBid
                  ? `Mínimo: ${minBid}`
                  : "O lance reinicia o timer"
            }
            onClick={() => {
              const res = placeBid(auction.id, bidValue);
              if (!res.ok) addToast(res.reason, "red");
              else setBid("");
            }}
          >
            💰 Dar Lance — mínimo {fmt.format(minBid)}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Estado: lote do player, vazio (cards de construção) ───────────
function BuildCard({ type, lot, state }) {
  const bt = BUILDING_TYPES[type];
  const startBuildPlan = useGameStore((s) => s.startBuildPlan);
  const setHighlight = useGameStore((s) => s.setHighlight);
  const addToast = useGameStore((s) => s.addToast);
  const cost = engine.buildCost(type, 1, state);
  const timeMin = state.devMode ? `${engine.BUILD_TIME_MIN}s` : `${engine.BUILD_TIME_MIN}min`;

  // lotes candidatos para o hover: este + vizinhos elegíveis (multi-lote)
  const candidates = () => {
    if (bt.lotes === 1) return [lot.id];
    const eligible = Object.values(state.lots).filter(
      (l) =>
        l.quadraId === lot.quadraId &&
        l.owner === "player" &&
        !l.buildingId &&
        bt.zonas.includes(l.zone)
    );
    return eligible.map((l) => l.id);
  };

  const eligibleCount = candidates().length;
  const enough = engine.canAfford(cost, state);
  const enoughLots = bt.lotes === 1 || eligibleCount >= bt.lotes;
  const missing = [];
  if (!enough) missing.push(`faltam 💰 ${fmt.format(cost - state.money)}`);
  if (!enoughLots) missing.push(`precisa de ${bt.lotes} lotes vazios seus nesta quadra (tem ${eligibleCount})`);

  return (
    <div
      className="border border-[var(--stone-700)] rounded p-2 bg-black/20 hover:border-[var(--gold-500)] transition-colors"
      onMouseEnter={() => setHighlight(candidates())}
      onMouseLeave={() => setHighlight(useGameStore.getState().buildPlan?.lotIds || [])}
    >
      <div className="text-[var(--parchment)]">
        {BUILDING_ICON[type]} {BUILDING_LABELS[type]}
        <span className="text-[var(--parchment-dim)]"> · {bt.lotes} lote{bt.lotes > 1 ? "s" : ""}</span>
      </div>
      <div className="text-[10px] text-[var(--parchment-dim)] font-num">
        Renda L1: {bt.renda}/tick · Custo: 💰 {fmt.format(cost)} · Tempo: {timeMin}
      </div>
      <button
        className="cc-btn mt-1 w-full"
        disabled={!enough || !enoughLots}
        title={missing.length ? missing.join(" · ") : undefined}
        onClick={() => {
          const res = startBuildPlan(type, lot.id);
          if (res && !res.ok) addToast(res.reason, "red");
        }}
      >
        Construir
      </button>
    </div>
  );
}

function PlayerEmptyView({ lot, state }) {
  const plan = state.buildPlan;
  const confirmBuildPlan = useGameStore((s) => s.confirmBuildPlan);
  const cancelBuildPlan = useGameStore((s) => s.cancelBuildPlan);
  const addToast = useGameStore((s) => s.addToast);
  const types = Object.keys(BUILDING_TYPES).filter((t) =>
    BUILDING_TYPES[t].zonas.includes(lot.zone)
  );

  return (
    <div className="space-y-2">
      <LocationInfo lot={lot} state={state} />
      <div className="text-red-400">
        Custo de manutenção:{" "}
        <span className="font-num">{engine.ZONE_MAINT_EMPTY[lot.zone]}</span>/tick enquanto vazio
      </div>

      {plan ? (
        <div className="border border-[var(--gold-500)] rounded p-2 bg-black/30 space-y-1">
          <div className="text-[var(--gold-300)]">
            {BUILDING_ICON[plan.type]} {BUILDING_LABELS[plan.type]} — selecione{" "}
            {BUILDING_TYPES[plan.type].lotes} lotes adjacentes no mapa{" "}
            <span className="font-num">
              ({plan.lotIds.length}/{BUILDING_TYPES[plan.type].lotes})
            </span>
          </div>
          <div className="font-num text-[10px] text-[var(--parchment-dim)]">
            {plan.lotIds.join(" + ")}
          </div>
          <div className="flex gap-2">
            <button
              className="cc-btn"
              disabled={plan.lotIds.length !== BUILDING_TYPES[plan.type].lotes}
              onClick={() => {
                const res = confirmBuildPlan();
                if (!res.ok) addToast(res.reason, "red");
              }}
            >
              Construir
            </button>
            <button className="cc-btn cc-btn-secondary" onClick={cancelBuildPlan}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="text-[var(--gold-300)] font-display text-[11px] tracking-widest">
            CONSTRUIR EDIFÍCIO:
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
            {types.map((t) => (
              <BuildCard key={t} type={t} lot={lot} state={state} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Estado: lote do player, com edifício ───────────────────────────
function PlayerBuildingView({ lot, building, state }) {
  const startUpgrade = useGameStore((s) => s.startUpgrade);
  const sellBuilding = useGameStore((s) => s.sellBuilding);
  const assignWorkers = useGameStore((s) => s.assignWorkers);
  const listForSale = useGameStore((s) => s.listForSale);
  const cancelListing = useGameStore((s) => s.cancelListing);
  const addToast = useGameStore((s) => s.addToast);
  const underWorks = building.upgradeEta !== null;
  const now = useNow(underWorks, 1000);
  const [listPrice, setListPrice] = useState("");

  const cap = engine.workersCapacity(building);
  const renda = expectedIncome(building, lot, state);
  const opexV = engine.opex(building) * engine.eventMaintMult(state);
  const tax = building.lotIds.reduce(
    (sum, id) => sum + engine.lotValue(state.lots[id], state) * engine.TAX_RATE,
    0
  );
  const net = renda - opexV - tax;
  const upCost = engine.upgradeCost(building, state);
  const sellRefund = Math.round(engine.buildCost(building.type, 1) * 0.5);
  const upTime = state.devMode
    ? `${engine.BUILD_TIME_MIN * (building.level + 1)}s`
    : `${engine.BUILD_TIME_MIN * (building.level + 1)}min`;
  const hist = state.incomeHist[building.id] || [];
  const worksLeft = underWorks ? Math.max(0, Math.ceil((building.upgradeEta - now) / 1000)) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span className="text-4xl">{BUILDING_ICON[building.type]}</span>
        <div>
          <div className="text-[var(--parchment)] text-base">
            {BUILDING_LABELS[building.type]} <span className="font-num">Nível {building.level}</span>
            <span className="text-[var(--parchment-dim)] capitalize"> · {lot.zone}</span>
          </div>
          <div className="font-num text-[10px] text-[var(--parchment-dim)]">
            {building.lotIds.join(" + ")}
          </div>
        </div>
      </div>

      {underWorks ? (
        <div className="text-[var(--gold-300)]">
          ⚙️ {building.pendingLevel === 1 ? "Construção" : "Upgrade"} em progresso —{" "}
          <span className="font-num">{worksLeft}s</span> restantes
        </div>
      ) : (
        <>
          <div className="text-[var(--parchment-dim)]">
            Renda estimada: <span className="font-num text-green-400">+{fmt.format(Math.round(renda))}</span>/tick
            {" | "}Opex: <span className="font-num text-red-400">−{fmt.format(Math.round(opexV))}</span>/tick
            {" | "}Imposto: <span className="font-num text-red-400">−{fmt.format(Math.round(tax))}</span>/tick
          </div>
          <div>
            Saldo líquido:{" "}
            <span className={`font-num ${net >= 0 ? "text-[var(--gold-300)]" : "text-red-400"}`}>
              {net >= 0 ? "+" : "−"}{fmt.format(Math.abs(Math.round(net)))}
            </span>
            /tick
          </div>

          {/* workers */}
          <div className="flex items-center gap-2">
            <span className="text-[var(--parchment-dim)]">Workers:</span>
            <button
              className="cc-btn cc-btn-secondary px-2 py-0"
              disabled={building.workers <= 0}
              onClick={() => assignWorkers(building.id, building.workers - 1)}
            >
              −
            </button>
            <div className="w-32 h-2 rounded bg-black/50 overflow-hidden">
              <div
                className="h-full bg-[var(--gold-500)]"
                style={{ width: `${(building.workers / cap) * 100}%` }}
              />
            </div>
            <button
              className="cc-btn cc-btn-secondary px-2 py-0"
              disabled={building.workers >= cap}
              title="Limitado pelos seus 👷 disponíveis"
              onClick={() => assignWorkers(building.id, building.workers + 1)}
            >
              +
            </button>
            <span className="font-num">{building.workers}/{cap}</span>
            <span className="text-[10px] text-[var(--parchment-dim)]">
              (cheio = +{engine.WORKER_BONUS * 100}% renda)
            </span>
          </div>

          {/* ações */}
          <div className="flex flex-wrap gap-2">
            <button
              className="cc-btn"
              disabled={building.level >= 10 || !engine.canAfford(upCost, state)}
              title={
                building.level >= 10
                  ? "Nível máximo"
                  : !engine.canAfford(upCost, state)
                    ? `Faltam 💰 ${fmt.format(upCost - state.money)}`
                    : undefined
              }
              onClick={() => {
                const res = startUpgrade(building.id);
                if (!res.ok) addToast(res.reason, "red");
              }}
            >
              ⬆️ Upgrade L{building.level}→L{building.level + 1} · 💰 {fmt.format(upCost)} · {upTime}
            </button>
            <button
              className="cc-btn cc-btn-secondary"
              onClick={() => {
                const res = sellBuilding(building.id);
                if (!res.ok) addToast(res.reason, "red");
              }}
            >
              Vender edifício · 💰 {fmt.format(sellRefund)}
            </button>
            {lot.listedPrice != null ? (
              <button className="cc-btn cc-btn-secondary" onClick={() => cancelListing(lot.id)}>
                Cancelar listagem (💰 {fmt.format(lot.listedPrice)})
              </button>
            ) : (
              <span className="flex items-center gap-1">
                <input
                  type="number"
                  className="w-24 bg-black/40 border border-[var(--stone-700)] rounded px-2 py-1 font-num text-[var(--parchment)]"
                  placeholder="preço"
                  value={listPrice}
                  onChange={(e) => setListPrice(e.target.value)}
                />
                <button
                  className="cc-btn cc-btn-secondary"
                  disabled={!(Number(listPrice) > 0)}
                  onClick={() => {
                    const res = listForSale(lot.id, Number(listPrice));
                    if (!res.ok) addToast(res.reason, "red");
                    else setListPrice("");
                  }}
                >
                  Listar P2P
                </button>
              </span>
            )}
          </div>

          {/* mini-histórico de renda */}
          {hist.length > 0 && (
            <div className="text-[10px] text-[var(--parchment-dim)]">
              Últimas coletas:{" "}
              {hist.map((v, i) => (
                <span key={i} className="font-num text-green-400 mr-2">
                  +{fmt.format(v)}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Estado: lote de outro jogador ──────────────────────────────────
function OtherOwnerView({ lot, state }) {
  const buyLot = useGameStore((s) => s.buyLot);
  const addToast = useGameStore((s) => s.addToast);
  const building = lot.buildingId ? state.buildings[lot.buildingId] : null;
  return (
    <div className="space-y-2">
      <LocationInfo lot={lot} state={state} />
      <div className="text-[var(--parchment)]">
        Propriedade de <span className="text-[var(--gold-300)]">{OWNER_LABEL[lot.owner]}</span>
        {building && (
          <span className="text-[var(--parchment-dim)]">
            {" "}· {BUILDING_ICON[building.type]} {BUILDING_LABELS[building.type]} L{building.level}
          </span>
        )}
      </div>
      {lot.listedPrice != null ? (
        <button
          className="cc-btn"
          disabled={!engine.canAfford(lot.listedPrice, state)}
          title={!engine.canAfford(lot.listedPrice, state) ? "Dinheiro insuficiente" : undefined}
          onClick={() => {
            const res = buyLot(lot.id);
            if (!res.ok) addToast(res.reason, "red");
          }}
        >
          Comprar por 💰 {fmt.format(lot.listedPrice)}
        </button>
      ) : (
        <div className="italic text-[var(--parchment-dim)]">Não está à venda.</div>
      )}
    </div>
  );
}

// ─── Componente principal ───────────────────────────────────────────
export default function LotDetail() {
  const state = useGameStore();
  const lot = state.selectedLotId ? state.lots[state.selectedLotId] : null;

  if (!lot) return null;

  const auction = Object.values(state.auctions).find(
    (a) => a.lotId === lot.id && a.status !== "done"
  );

  let body;
  if (auction && Date.now() < auction.expiresAt) {
    body = <AuctionView lot={lot} auction={auction} state={state} />;
  } else if (lot.owner === null) {
    body = <UnownedView lot={lot} state={state} />;
  } else if (lot.owner === "player") {
    body = lot.buildingId ? (
      <PlayerBuildingView lot={lot} building={state.buildings[lot.buildingId]} state={state} />
    ) : (
      <PlayerEmptyView lot={lot} state={state} />
    );
  } else {
    body = <OtherOwnerView lot={lot} state={state} />;
  }

  return (
    <div className="cc-panel">
      <div className="cc-panel-header flex justify-between items-center">
        <span>Lote {lot.id}</span>
        <button
          className="text-[var(--parchment-dim)] hover:text-[var(--gold-300)]"
          onClick={() => useGameStore.getState().selectLot(null)}
        >
          ✕
        </button>
      </div>
      <div className="p-3 text-xs">{body}</div>
    </div>
  );
}

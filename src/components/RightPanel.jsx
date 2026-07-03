import { useGameStore } from "../store/gameStore.js";
import * as engine from "../engine/engine.js";
import AuctionPanel from "./AuctionPanel.jsx";
import EventFeed from "./EventFeed.jsx";

const fmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

const PLAYER_COLOR = { player: "#f59e0b", bot0: "#f472b6", bot1: "#a78bfa", bot2: "#2dd4bf" };

// patrimônio = dinheiro + valor dos lotes + valor aproximado dos edifícios
function netWorth(ownerId, ownerMoney, state) {
  let worth = ownerMoney;
  for (const lot of Object.values(state.lots)) {
    if (lot.owner !== ownerId) continue;
    worth += engine.lotValue(lot, state);
    if (lot.buildingId) {
      const b = state.buildings[lot.buildingId];
      if (b && b.lotIds[0] === lot.id) {
        worth += engine.buildCost(b.type, 1) * engine.LEVEL_FACTOR[b.level];
      }
    }
  }
  return worth;
}

export default function RightPanel() {
  const state = useGameStore();

  const ranking = [
    { id: "player", name: "Você", money: state.money },
    ...state.bots,
  ]
    .map((p) => ({ ...p, worth: netWorth(p.id, p.money, state) }))
    .sort((a, b) => b.worth - a.worth);

  return (
    <div className="flex flex-col gap-3 sticky top-14">
      <div className="cc-panel">
        <div className="cc-panel-header">Ranking</div>
        <div className="p-2 text-xs space-y-1">
          {ranking.map((p, i) => (
            <div key={p.id} className="flex items-center gap-2">
              <span className="font-num text-[var(--parchment-dim)] w-3">{i + 1}</span>
              <span
                className="w-2 h-2 rounded-full inline-block shrink-0"
                style={{ background: PLAYER_COLOR[p.id] }}
              />
              <span className="flex-1 truncate text-[var(--parchment)]">{p.name}</span>
              {p.id === "player" && (
                <span className="text-[8px] font-display font-bold tracking-wider bg-[var(--gold-500)] text-[var(--ink)] rounded px-1">
                  VOCÊ
                </span>
              )}
              <span className="font-num text-[var(--parchment)]">💰 {fmt.format(Math.round(p.worth))}</span>
            </div>
          ))}
        </div>
      </div>

      <AuctionPanel />
      <EventFeed />
    </div>
  );
}

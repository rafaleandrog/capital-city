import { useGameStore, OWNER_LABEL } from "../store/gameStore.js";
import { useNow } from "./useNow.js";

const fmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

export default function AuctionPanel() {
  const auctions = useGameStore((s) => s.auctions);
  const selectLot = useGameStore((s) => s.selectLot);
  const active = Object.values(auctions).filter((a) => a.status === "active");
  const now = useNow(active.length > 0, 500);

  return (
    <div className="cc-panel">
      <div className="cc-panel-header">Leilões Ativos</div>
      <div className="p-2 text-xs space-y-1.5">
        {active.length === 0 && (
          <div className="italic text-[var(--parchment-dim)]">Nenhum leilão em andamento.</div>
        )}
        {active.map((a) => {
          const secs = Math.max(0, Math.ceil((a.expiresAt - now) / 1000));
          return (
            <div
              key={a.id}
              className="flex items-center gap-2 border border-[var(--stone-700)] rounded px-2 py-1 bg-black/20"
            >
              <span className="font-num text-[var(--parchment)]">{a.lotId}</span>
              <span className="font-num text-[var(--gold-300)] flex-1">
                💰 {fmt.format(a.currentBid)}
              </span>
              <span
                className={`font-num ${secs <= 5 ? "text-red-400 cc-pulse" : "text-[var(--parchment-dim)]"}`}
                title={`Lead: ${OWNER_LABEL[a.leadPlayer]}`}
              >
                {secs}s
              </span>
              <button className="cc-btn cc-btn-secondary px-2 py-0.5" onClick={() => selectLot(a.lotId)}>
                Ver
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useGameStore } from "../store/gameStore.js";

const fmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

export default function RightPanel() {
  const money = useGameStore((s) => s.money);
  const bots = useGameStore((s) => s.bots);
  const events = useGameStore((s) => s.events);
  const auctions = useGameStore((s) => s.auctions);

  const ranking = [
    { id: "player", name: "Você", color: "#f59e0b", money },
    ...bots.map((b) => ({ ...b, color: { bot0: "#f472b6", bot1: "#a78bfa", bot2: "#2dd4bf" }[b.id] })),
  ].sort((a, b) => b.money - a.money);

  const activeAuctions = Object.values(auctions).filter(
    (a) => a.status === "active" || a.status === "closing"
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="cc-panel">
        <div className="cc-panel-header">Ranking</div>
        <div className="p-2 text-xs space-y-1">
          {ranking.map((p, i) => (
            <div key={p.id} className="flex items-center gap-2">
              <span className="font-num text-[var(--parchment-dim)] w-3">{i + 1}</span>
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
              <span className="flex-1 truncate">{p.name}</span>
              <span className="font-num text-[var(--parchment)]">{fmt.format(Math.round(p.money))}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="cc-panel">
        <div className="cc-panel-header">Leilões</div>
        <div className="p-3 text-xs text-[var(--parchment-dim)] italic">
          {activeAuctions.length === 0
            ? "Nenhum leilão ativo."
            : `${activeAuctions.length} leilão(ões) em curso.`}
        </div>
      </div>

      <div className="cc-panel">
        <div className="cc-panel-header">Crônicas</div>
        <div className="p-2 text-xs space-y-1 max-h-64 overflow-y-auto">
          {events.length === 0 && (
            <div className="italic text-[var(--parchment-dim)]">A cidade dorme…</div>
          )}
          {[...events].reverse().slice(0, 20).map((e) => (
            <div key={e.id} className="text-[var(--parchment-dim)] leading-snug">
              {e.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

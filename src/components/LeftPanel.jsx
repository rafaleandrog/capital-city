import { useGameStore } from "../store/gameStore.js";

export default function LeftPanel() {
  const lots = useGameStore((s) => s.lots);
  const buildings = useGameStore((s) => s.buildings);

  const myLots = Object.values(lots).filter((l) => l.owner === "player");
  const myBuildings = Object.values(buildings).filter(
    (b) => lots[b.lotIds[0]]?.owner === "player"
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="cc-panel">
        <div className="cc-panel-header">Império</div>
        <div className="p-3 text-sm space-y-1 text-[var(--parchment-dim)]">
          <div className="flex justify-between">
            <span>Lotes</span>
            <span className="font-num text-[var(--parchment)]">{myLots.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Edifícios</span>
            <span className="font-num text-[var(--parchment)]">{myBuildings.length}</span>
          </div>
        </div>
      </div>

      <div className="cc-panel">
        <div className="cc-panel-header">Ações</div>
        <div className="p-3 text-xs text-[var(--parchment-dim)] italic">
          Selecione um lote no mapa para comprar, construir ou negociar.
        </div>
      </div>
    </div>
  );
}

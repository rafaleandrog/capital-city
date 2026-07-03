import { useGameStore } from "../store/gameStore.js";
import * as engine from "../engine/engine.js";
import { BUILDING_LABELS } from "../data/buildingTypes.js";
import { BUILDING_ICON } from "./MapSVG.jsx";

const fmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

const OWNER_LABEL = { player: "Você", bot0: "Vetra Corp", bot1: "Grupo Meridiano", bot2: "Áurea Invest" };
const VIA_LABEL = { rua: "Rua", avenida: "Avenida", rodovia: "Rodovia", ferrovia: "Ferrovia" };
const ANCHOR_LABEL = {
  porto: "⚓ Porto",
  distFinanceiro: "🏦 Distrito Financeiro",
  universidade: "🎓 Universidade",
  estacao: "🚉 Estação",
};

export default function LotDetail() {
  const state = useGameStore();
  const lot = state.selectedLotId ? state.lots[state.selectedLotId] : null;

  if (!lot) {
    return (
      <div className="cc-panel">
        <div className="cc-panel-header">Detalhe do Lote</div>
        <div className="p-3 text-xs italic text-[var(--parchment-dim)]">
          Nenhum lote selecionado. Clique num lote do mapa.
        </div>
      </div>
    );
  }

  const value = engine.lotValue(lot, state);
  const locMult = engine.locationMult(lot, state);
  const building = lot.buildingId ? state.buildings[lot.buildingId] : null;
  const faces = Object.entries(lot.frontage).filter(([, v]) => v);

  return (
    <div className="cc-panel">
      <div className="cc-panel-header">Detalhe do Lote — {lot.id}</div>
      <div className="p-3 text-sm grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2">
        <Info label="Zona" value={lot.zone} />
        <Info label="Valor de mercado" value={`💰 ${fmt.format(value)}`} />
        <Info label="Mult. de localização" value={`×${locMult.toFixed(2)}`} />
        <Info label="Dono" value={lot.owner ? OWNER_LABEL[lot.owner] : "— (à venda pela cidade)"} />
        <Info
          label="Frontagem"
          value={
            faces.length
              ? faces.map(([d, v]) => `${d}: ${VIA_LABEL[v]}`).join(" · ")
              : "Interior (sem via)"
          }
        />
        <Info label="Âncora" value={lot.inAnchorOf ? ANCHOR_LABEL[lot.inAnchorOf] : "—"} />
        <Info label="Esquina" value={lot.isCorner ? "Sim (+15%)" : "Não"} />
        <Info
          label="Edifício"
          value={
            building
              ? `${BUILDING_ICON[building.type]} ${BUILDING_LABELS[building.type]} L${building.level}${
                  building.upgradeEta !== null ? " (em obras)" : ""
                }`
              : "Terreno vazio"
          }
        />
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div className="text-[10px] font-display tracking-widest text-[var(--gold-300)] uppercase">
        {label}
      </div>
      <div className="text-[var(--parchment)]">{value}</div>
    </div>
  );
}

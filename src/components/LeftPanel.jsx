import { useGameStore, expectedIncome } from "../store/gameStore.js";
import * as engine from "../engine/engine.js";
import { BUILDING_LABELS } from "../data/buildingTypes.js";
import { BUILDING_ICON } from "./MapSVG.jsx";
import { useNow } from "./useNow.js";

const fmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

function fmtPop(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return fmt.format(n);
}

const EVENT_COLOR = { green: "#3fb950", red: "#f85149", blue: "#58a6ff", orange: "#d29922", gray: "#8b949e" };

function Sparkline({ values }) {
  if (values.length < 2) return null;
  const w = 64;
  const h = 18;
  const min = Math.min(...values, 0.7);
  const max = Math.max(...values, 1.3);
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / (max - min || 1)) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} className="inline-block align-middle">
      <polyline points={pts} fill="none" stroke="#eab308" strokeWidth="1.5" />
    </svg>
  );
}

function Bar({ value, max, color = "#eab308" }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 rounded bg-black/50 overflow-hidden flex-1">
      <div className="h-full rounded" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

const Divider = () => <div className="h-px bg-gradient-to-r from-transparent via-[var(--gold-500)] to-transparent" />;

function SectionTitle({ children }) {
  return (
    <div className="text-[10px] font-display font-bold tracking-[0.18em] text-[var(--gold-300)] uppercase mb-1.5">
      {children}
    </div>
  );
}

export default function LeftPanel() {
  const state = useGameStore();
  const now = useNow(!!state.activeEvent, 1000);

  // ─── Sua Cidade: renda/despesa/saldo por tick (estimativa sem ruído) ──
  const maintMult = engine.eventMaintMult(state);
  let gross = 0;
  let expenses = 0;
  let assignedWorkers = 0;
  const myLots = [];
  const myBuildings = [];
  for (const lot of Object.values(state.lots)) {
    if (lot.owner !== "player") continue;
    myLots.push(lot);
    const b = lot.buildingId ? state.buildings[lot.buildingId] : null;
    if (!b) {
      expenses += engine.ZONE_MAINT_EMPTY[lot.zone] * maintMult;
    } else if (b.upgradeEta === null) {
      if (b.lotIds[0] === lot.id) {
        gross += expectedIncome(b, lot, state);
        expenses += engine.opex(b) * maintMult;
      }
      expenses += engine.lotValue(lot, state) * engine.TAX_RATE;
    }
  }
  for (const b of Object.values(state.buildings)) {
    if (engine.buildingOwner(b, state) === "player") {
      myBuildings.push(b);
      assignedWorkers += b.workers;
    }
  }
  const net = gross - expenses;
  const emptyLots = myLots.filter((l) => !l.buildingId).length;
  const totalAssets = myLots.reduce((sum, l) => sum + engine.lotValue(l, state), 0);
  const share = engine.worldShareMult(state) * 100;

  const ev = state.activeEvent;
  const evRemaining = ev?.endsAt ? Math.max(0, ev.endsAt - now) : 0;
  const evMin = Math.floor(evRemaining / 60000);
  const evSec = Math.floor((evRemaining % 60000) / 1000);

  return (
    <div className="cc-panel sticky top-14">
      <div className="cc-panel-header">Painel de Controle</div>
      <div className="p-3 text-xs space-y-3">
        {/* ─── SUA CIDADE ─── */}
        <div>
          <SectionTitle>Sua Cidade</SectionTitle>
          <div className="space-y-1 text-[var(--parchment-dim)]">
            <div className="flex justify-between">
              <span>Renda bruta/tick</span>
              <span className="font-num text-green-400">+{fmt.format(Math.round(gross))}</span>
            </div>
            <div className="flex justify-between">
              <span>Despesas/tick</span>
              <span className="font-num text-red-400">−{fmt.format(Math.round(expenses))}</span>
            </div>
            <div className="flex justify-between">
              <span>Saldo líquido/tick</span>
              <span className={`font-num ${net >= 0 ? "text-[var(--gold-300)]" : "text-red-400"}`}>
                {net >= 0 ? "+" : "−"}{fmt.format(Math.abs(Math.round(net)))}
              </span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span>👷 {assignedWorkers}/{state.people}</span>
              <Bar value={assignedWorkers} max={state.people} />
            </div>
          </div>
        </div>

        <Divider />

        {/* ─── MUNDO ─── */}
        <div>
          <SectionTitle>Mundo</SectionTitle>
          <div className="space-y-1 text-[var(--parchment-dim)]">
            <div className="flex justify-between items-center">
              <span>Mercado</span>
              <span className="flex items-center gap-1.5">
                <Sparkline values={state.macroHistory} />
                <span className="font-num text-[var(--parchment)]">{(state.macro * 100).toFixed(1)}</span>
              </span>
            </div>
            <div className="flex justify-between">
              <span>Pop. mundial</span>
              <span className="font-num text-[var(--parchment)]">{fmtPop(state.worldPop)}</span>
            </div>
            <div className="flex justify-between">
              <span>Sua fatia</span>
              <span className="font-num text-[var(--parchment)]">{share.toFixed(2)}%</span>
            </div>
          </div>
        </div>

        <Divider />

        {/* ─── PORTFÓLIO ─── */}
        <div>
          <SectionTitle>Portfólio</SectionTitle>
          <div className="space-y-1 text-[var(--parchment-dim)]">
            <div className="flex justify-between">
              <span>Lotes</span>
              <span className="font-num text-[var(--parchment)]">
                {myLots.length}
                <span className="text-[var(--parchment-dim)]"> ({emptyLots} vazios, {myLots.length - emptyLots} c/ edifício)</span>
              </span>
            </div>
            {myBuildings.length > 0 && (
              <div className="max-h-28 overflow-y-auto space-y-0.5 border border-[var(--stone-700)] rounded p-1 bg-black/20">
                {myBuildings.map((b) => (
                  <div key={b.id} className="flex justify-between items-center">
                    <span className="truncate">
                      {BUILDING_ICON[b.type]} {BUILDING_LABELS[b.type]} <span className="font-num">L{b.level}</span>
                      {b.upgradeEta !== null && " ⚙️"}
                    </span>
                    <span className="font-num text-green-400">
                      {b.upgradeEta === null
                        ? `+${fmt.format(Math.round(expectedIncome(b, state.lots[b.lotIds[0]], state)))}`
                        : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between">
              <span>Total de ativos</span>
              <span className="font-num text-[var(--gold-300)]">💰 {fmt.format(totalAssets)}</span>
            </div>
          </div>
        </div>

        <Divider />

        {/* ─── EVENTOS ─── */}
        <div>
          <SectionTitle>Eventos</SectionTitle>
          {ev ? (
            <div
              className="rounded border px-2 py-1.5 text-[var(--parchment)]"
              style={{ borderColor: EVENT_COLOR[ev.color], background: `${EVENT_COLOR[ev.color]}18` }}
            >
              <div>{ev.label}</div>
              <div className="font-num text-[10px] text-[var(--parchment-dim)]">
                {evMin > 0 ? `${evMin}min ${evSec}s` : `${evSec}s`} restantes
              </div>
            </div>
          ) : (
            <div className="italic text-[var(--parchment-dim)]">Mercado estável</div>
          )}
        </div>
      </div>
    </div>
  );
}

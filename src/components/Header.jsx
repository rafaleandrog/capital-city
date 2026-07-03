import { useRef } from "react";
import { useGameStore } from "../store/gameStore.js";

const fmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

function fmtPop(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return fmt.format(n);
}

export default function Header() {
  const money = useGameStore((s) => s.money);
  const people = useGameStore((s) => s.people);
  const peopleCap = useGameStore((s) => s.peopleCap);
  const worldPop = useGameStore((s) => s.worldPop);
  const macro = useGameStore((s) => s.macro);
  const tick = useGameStore((s) => s.tick);
  const devMode = useGameStore((s) => s.devMode);
  const toggleDevMode = useGameStore((s) => s.toggleDevMode);

  // delta de dinheiro e direção do mercado, medidos entre ticks
  const prev = useRef({ tick: 0, money, macro, delta: 0, macroDir: 0 });
  if (tick !== prev.current.tick) {
    prev.current = {
      tick,
      money,
      macro,
      delta: money - prev.current.money,
      macroDir: Math.sign(macro - prev.current.macro),
    };
  }
  const { delta, macroDir } = prev.current;

  return (
    <header className="sticky top-0 z-40 flex items-center gap-6 px-5 py-2 bg-[var(--stone-900)] border-b-2 border-[var(--gold-500)]">
      {/* esquerda: logo */}
      <h1 className="font-display font-black text-2xl tracking-[0.15em] text-[var(--gold-500)] drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
        CAPITAL CITY
      </h1>

      {/* centro: recursos */}
      <div className="flex items-center gap-6 text-sm mx-auto">
        <span title="Tesouro" className="flex items-baseline gap-1.5">
          💰 <span className="font-num text-[var(--parchment)]">{fmt.format(Math.round(money))}</span>
          {delta !== 0 && (
            <span className={`font-num text-[10px] ${delta > 0 ? "text-green-400" : "text-red-400"}`}>
              {delta > 0 ? "+" : "−"}{fmt.format(Math.abs(Math.round(delta)))}/tick
            </span>
          )}
        </span>
        <span title="Trabalhadores / capacidade">
          👷 <span className="font-num">{people}/{peopleCap}</span>
        </span>
        <span title="População mundial">
          🌍 Pop: <span className="font-num">{fmtPop(worldPop)}</span>
        </span>
        <span title="Índice imobiliário" className="flex items-center gap-1">
          📈 Mercado: <span className="font-num">{(macro * 100).toFixed(1)}</span>
          {macroDir !== 0 && (
            <span className={macroDir > 0 ? "text-green-400" : "text-red-400"}>
              {macroDir > 0 ? "↑" : "↓"}
            </span>
          )}
        </span>
      </div>

      {/* direita: tick + controles */}
      <div className="flex items-center gap-2">
        <span className="font-num text-xs text-[var(--parchment-dim)]">Tick {tick}</span>
        <button
          onClick={toggleDevMode}
          className={devMode ? "cc-btn" : "cc-btn cc-btn-secondary"}
          title={devMode ? "Tick a cada 5s" : "Tick a cada 60s"}
        >
          DEV MODE {devMode ? "ON" : "OFF"}
        </button>
        <button className="cc-btn cc-btn-secondary" title="Configurações (em breve)">
          ⚙️
        </button>
      </div>
    </header>
  );
}

import { useGameStore } from "../store/gameStore.js";

const fmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

export default function Header() {
  const money = useGameStore((s) => s.money);
  const people = useGameStore((s) => s.people);
  const peopleCap = useGameStore((s) => s.peopleCap);
  const worldPop = useGameStore((s) => s.worldPop);
  const macro = useGameStore((s) => s.macro);
  const tick = useGameStore((s) => s.tick);
  const devMode = useGameStore((s) => s.devMode);
  const toggleDevMode = useGameStore((s) => s.toggleDevMode);

  return (
    <header className="flex items-center gap-6 px-6 py-3 border-b border-[var(--cc-border)] bg-[var(--cc-panel)]">
      <h1 className="text-lg font-bold tracking-widest text-[var(--cc-gold)]">
        CAPITAL CITY
      </h1>
      <div className="flex items-center gap-5 text-sm">
        <span title="Dinheiro">💰 {fmt.format(money)}</span>
        <span title="Pessoas / capacidade">👥 {people}/{peopleCap}</span>
        <span title="População mundial">🌍 {fmt.format(worldPop)}</span>
        <span title="Índice imobiliário">📈 {macro.toFixed(2)}</span>
        <span title="Tick" className="text-[var(--cc-text-dim)]">⏱ {tick}</span>
      </div>
      <button
        onClick={toggleDevMode}
        className={`ml-auto text-xs px-3 py-1 rounded border border-[var(--cc-border)] ${
          devMode ? "bg-amber-600/30 text-amber-300" : "text-[var(--cc-text-dim)]"
        }`}
      >
        devMode {devMode ? "ON (5s)" : "OFF (60s)"}
      </button>
    </header>
  );
}

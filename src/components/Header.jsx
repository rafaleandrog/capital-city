import { useRef, useState } from "react";
import { useGameStore } from "../store/gameStore.js";
import { fmtMoney, fmtPop } from "./format.js";

function HelpModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="cc-panel max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        <div className="cc-panel-header flex justify-between items-center">
          <span>Como Jogar</span>
          <button className="text-[var(--parchment-dim)] hover:text-[var(--gold-300)]" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="p-4 text-sm space-y-1.5 text-[var(--parchment-dim)] max-h-[70vh] overflow-y-auto">
          <ul className="list-disc pl-4 space-y-1.5">
            <li><b className="text-[var(--parchment)]">Objetivo:</b> construir o maior império imobiliário da cidade.</li>
            <li><b className="text-[var(--parchment)]">Lotes:</b> clique num lote sem dono e inicie um leilão de 30s. Cada lance precisa superar o atual em 10% e reinicia o timer. Os bots também dão lances!</li>
            <li><b className="text-[var(--parchment)]">Localização importa:</b> avenidas, rodovias, esquinas e âncoras (⚓ porto, 🏦 distrito financeiro, 🎓 universidade, 🚉 estação) multiplicam renda e valor.</li>
            <li><b className="text-[var(--parchment)]">Construção:</b> cada zona aceita tipos diferentes de edifício. Edifícios grandes exigem 2–4 lotes adjacentes na mesma quadra.</li>
            <li><b className="text-[var(--parchment)]">Workers:</b> atribua trabalhadores aos edifícios — equipe cheia rende +50%.</li>
            <li><b className="text-[var(--parchment)]">Custos:</b> lote vazio paga manutenção; edifícios pagam opex e imposto por tick. Cuidado com o saldo negativo.</li>
            <li><b className="text-[var(--parchment)]">Upgrades:</b> até o nível 10. Durante a obra o edifício não rende.</li>
            <li><b className="text-[var(--parchment)]">Eventos mundiais:</b> booms, recessões, greves e outros modificam renda, custos e mercado por alguns ticks.</li>
            <li><b className="text-[var(--parchment)]">Mercado P2P:</b> liste seus lotes por um preço e compre lotes listados por rivais.</li>
            <li><b className="text-[var(--parchment)]">DEV MODE:</b> acelera o tick para 5s (o normal é 60s). O jogo salva sozinho a cada 5 ticks.</li>
          </ul>
        </div>
      </div>
    </div>
  );
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
  const resetGame = useGameStore((s) => s.resetGame);
  const [helpOpen, setHelpOpen] = useState(false);

  // delta de dinheiro por tick + flash quando o sinal muda
  const prev = useRef({ tick: 0, money, macro, delta: 0, macroDir: 0, flashKey: 0 });
  if (tick !== prev.current.tick) {
    const delta = money - prev.current.money;
    const signChanged =
      Math.sign(delta) !== Math.sign(prev.current.delta) && delta !== 0;
    prev.current = {
      tick,
      money,
      macro,
      delta,
      macroDir: Math.sign(macro - prev.current.macro),
      flashKey: signChanged ? tick : prev.current.flashKey,
    };
  }
  const { delta, macroDir, flashKey } = prev.current;
  const negative = money < 0;

  return (
    <header className="sticky top-0 z-40 flex items-center gap-6 px-5 py-2 bg-[var(--stone-900)] border-b-2 border-[var(--gold-500)]">
      <div className="flex items-center gap-2">
        <h1 className="font-display font-black text-2xl tracking-[0.15em] text-[var(--gold-500)] drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
          CAPITAL CITY
        </h1>
        {devMode && (
          <span className="font-num text-[9px] px-1.5 py-0.5 rounded bg-amber-600/30 text-amber-300 border border-amber-500/50">
            DEV — tick 5s
          </span>
        )}
      </div>

      {/* centro: recursos */}
      <div className="flex items-center gap-6 text-sm mx-auto">
        <span
          title="Tesouro"
          className={`flex items-baseline gap-1.5 rounded px-1.5 ${negative ? "bg-red-900/60 outline outline-1 outline-red-500" : ""}`}
        >
          💰{" "}
          <span className={`font-num ${negative ? "text-red-300" : "text-[var(--parchment)]"}`}>
            {fmtMoney(money)}
          </span>
          {delta !== 0 && (
            <span
              key={flashKey}
              className={`font-num text-[10px] cc-flash ${delta > 0 ? "text-green-400" : "text-red-400"}`}
            >
              {delta > 0 ? "+" : "−"}{fmtMoney(Math.abs(delta))}/tick
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
        <button className="cc-btn cc-btn-secondary" title="Ajuda" onClick={() => setHelpOpen(true)}>
          ?
        </button>
        <button className="cc-btn cc-btn-secondary" title="Reiniciar jogo" onClick={resetGame}>
          ⚙️
        </button>
      </div>

      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
    </header>
  );
}

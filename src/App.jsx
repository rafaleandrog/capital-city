import { useEffect, useState } from "react";
import Header from "./components/Header.jsx";
import MapSVG from "./components/MapSVG.jsx";
import LeftPanel from "./components/LeftPanel.jsx";
import RightPanel from "./components/RightPanel.jsx";
import LotDetail from "./components/LotDetail.jsx";
import { useGameStore } from "./store/gameStore.js";

const TABS = [
  { id: "mapa", icon: "🗺️", label: "Mapa" },
  { id: "imperio", icon: "🏛️", label: "Império" },
  { id: "leiloes", icon: "🔨", label: "Leilões" },
  { id: "cronicas", icon: "📜", label: "Crônicas" },
];

export default function App() {
  const initGame = useGameStore((s) => s.initGame);
  const [tab, setTab] = useState("mapa");

  useEffect(() => {
    initGame();
  }, [initGame]);

  return (
    <div className="cc-frame">
      <div className="cc-frame-inner min-h-full">
        <Header />

        {/* tabs de navegação */}
        <nav className="cc-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`cc-tab ${tab === t.id ? "active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </nav>

        {tab === "mapa" ? (
          <div className="grid grid-cols-[200px_1fr_240px] gap-3 p-3 items-start">
            <LeftPanel />
            <div className="flex flex-col gap-3 min-w-0">
              <MapSVG />
              <LotDetail />
            </div>
            <RightPanel />
          </div>
        ) : (
          <div className="p-6">
            <div className="cc-panel max-w-md mx-auto">
              <div className="cc-panel-header">
                {TABS.find((t) => t.id === tab)?.label}
              </div>
              <div className="p-4 text-sm italic text-[var(--parchment-dim)]">
                Em construção nas próximas fases…
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

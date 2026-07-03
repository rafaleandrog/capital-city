import { useEffect } from "react";
import Header from "./components/Header.jsx";
import { useGameStore } from "./store/gameStore.js";

export default function App() {
  const tick = useGameStore((s) => s.tick);
  const initGame = useGameStore((s) => s.initGame);

  useEffect(() => {
    initGame();
  }, [initGame]);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="p-6 text-[var(--cc-text-dim)]">
        Motor carregado — tick {tick}
      </main>
    </div>
  );
}

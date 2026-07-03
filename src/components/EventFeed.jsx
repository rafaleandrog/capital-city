import { useGameStore } from "../store/gameStore.js";
import { useNow, relTime } from "./useNow.js";

const EVENT_COLOR = {
  green: "#3fb950",
  red: "#f85149",
  blue: "#58a6ff",
  orange: "#d29922",
  gray: "#8b949e",
};

export default function EventFeed() {
  const events = useGameStore((s) => s.events);
  const activeEvent = useGameStore((s) => s.activeEvent);
  const now = useNow(true, 1000);

  const history = [...events]
    .reverse()
    .filter((e) => e.id !== activeEvent?.id)
    .slice(0, 15);

  const evRemaining = activeEvent?.endsAt ? Math.max(0, activeEvent.endsAt - now) : 0;
  const evMin = Math.floor(evRemaining / 60000);
  const evSec = Math.floor((evRemaining % 60000) / 1000);

  return (
    <div className="cc-panel">
      <div className="cc-panel-header">Crônicas</div>
      <div className="p-2 text-xs space-y-1.5">
        {activeEvent && (
          <div
            className="rounded border px-2 py-1.5"
            style={{
              borderColor: EVENT_COLOR[activeEvent.color],
              background: `${EVENT_COLOR[activeEvent.color]}18`,
            }}
          >
            <div className="text-[var(--parchment)]">{activeEvent.label}</div>
            <div className="font-num text-[10px] text-[var(--parchment-dim)]">
              termina em {evMin > 0 ? `${evMin}min ${evSec}s` : `${evSec}s`}
            </div>
          </div>
        )}
        <div className="max-h-56 overflow-y-auto space-y-1">
          {history.length === 0 && !activeEvent && (
            <div className="italic text-[var(--parchment-dim)]">A cidade dorme…</div>
          )}
          {history.map((e) => (
            <div key={e.id} className="leading-snug flex items-baseline gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full inline-block shrink-0 translate-y-[-1px]"
                style={{ background: EVENT_COLOR[e.color] || EVENT_COLOR.gray }}
              />
              <span className="text-[var(--parchment-dim)] flex-1">{e.label}</span>
              <span className="font-num text-[9px] text-[var(--parchment-dim)] shrink-0">
                {relTime(e.at, now)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

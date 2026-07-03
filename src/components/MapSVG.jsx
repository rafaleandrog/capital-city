import { useEffect, useMemo, useState } from "react";
import { useGameStore } from "../store/gameStore.js";
import { QUADRAS, H_BORDERS, V_BORDERS, ANCHORS } from "../data/mapData.js";

// ─── Geometria (tudo derivado de mapData) ───────────────────────────
const LOT = 34;     // altura de um lote; largura varia com a coluna
const GUTTER = 18;  // sarjeta entre quadras — é aqui que as vias passam
const MARGIN = 24;  // borda externa do mapa (vias de borda passam aqui)

const N_COLS = Math.max(...QUADRAS.map((q) => q.col)) + 1;
const N_ROWS = Math.max(...QUADRAS.map((q) => q.row)) + 1;
// largura da coluna = quadra mais larga da coluna (as demais esticam os lotes)
const COL_W = Array.from({ length: N_COLS }, (_, c) =>
  Math.max(...QUADRAS.filter((q) => q.col === c).map((q) => q.w)) * LOT
);
const ROW_H = Math.max(...QUADRAS.map((q) => q.h)) * LOT;

const xCol = (c) => MARGIN + COL_W.slice(0, c).reduce((a, b) => a + b, 0) + c * GUTTER;
const yRow = (r) => MARGIN + r * (ROW_H + GUTTER);
const MAP_W = MARGIN * 2 + COL_W.reduce((a, b) => a + b, 0) + (N_COLS - 1) * GUTTER;
const MAP_H = MARGIN * 2 + N_ROWS * ROW_H + (N_ROWS - 1) * GUTTER;

const QUADRA_BY_ID = Object.fromEntries(QUADRAS.map((q) => [q.id, q]));

// retângulo de um lote em coordenadas do SVG
function lotRect(lot) {
  const q = QUADRA_BY_ID[lot.quadraId];
  const lotW = COL_W[q.col] / q.w;
  return {
    x: xCol(q.col) + lot.lx * lotW,
    y: yRow(q.row) + lot.ly * LOT,
    w: lotW,
    h: LOT,
  };
}

// ─── Estilos ────────────────────────────────────────────────────────
const VIA_STYLE = {
  rua:      { width: 3,  color: "#6b7280" },
  avenida:  { width: 9,  color: "#ca8a04" },
  rodovia:  { width: 14, color: "#374151" },
  ferrovia: { width: 5,  color: "#92400e", dash: "10 6" },
};

const ZONE_STYLE = {
  central:     { fill: "#92400e22", stroke: "#b45309" },
  comercial:   { fill: "#78350f22", stroke: "#d97706" },
  residencial: { fill: "#1e3a5f22", stroke: "#3b82f6" },
  industrial:  { fill: "#431a0522", stroke: "#ea580c" },
  periferico:  { fill: "#14532d22", stroke: "#16a34a" },
};

const OWNER_STROKE = {
  player: { stroke: "#f59e0b", width: 2 },
  bot0:   { stroke: "#f472b6", width: 1.5 },
  bot1:   { stroke: "#a78bfa", width: 1.5 },
  bot2:   { stroke: "#2dd4bf", width: 1.5 },
};

const ANCHOR_VIS = {
  porto:          { color: "#0ea5e9", icon: "⚓" },
  distFinanceiro: { color: "#eab308", icon: "🏦" },
  universidade:   { color: "#8b5cf6", icon: "🎓" },
  estacao:        { color: "#10b981", icon: "🚉" },
};

export const BUILDING_ICON = {
  casa: "🏠", loja: "🏪", escritorio: "🏢", armazem: "📦",
  apartamento: "🏘️", centroComercial: "🛍️", fabrica: "🏭",
  hotel: "🏨", complexoRes: "🏙️", hospital: "🏥",
  universidade: "🎓", banco: "🏦", shopping: "🛒",
};

// ─── Camada 1: vias e âncoras (pointer-events: none) ────────────────
function ViasLayer() {
  const lines = [];
  // bordas horizontais (índice k = borda acima da linha k)
  H_BORDERS.forEach((b, k) => {
    if (!b) return;
    const y = k === 0 ? MARGIN / 2 : yRow(k) - GUTTER / 2;
    lines.push({ id: b.id, via: b.via, x1: 0, y1: y, x2: MAP_W, y2: y });
  });
  // bordas verticais (índice k = borda a oeste da coluna k)
  V_BORDERS.forEach((b, k) => {
    if (!b) return;
    const x = k === 0 ? MARGIN / 2 : k === N_COLS ? MAP_W - MARGIN / 2 : xCol(k) - GUTTER / 2;
    lines.push({ id: b.id, via: b.via, x1: x, y1: 0, x2: x, y2: MAP_H });
  });

  return (
    <g pointerEvents="none">
      {lines.map((l) => {
        const s = VIA_STYLE[l.via];
        return (
          <line
            key={l.id}
            x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke={s.color}
            strokeWidth={s.width}
            strokeDasharray={s.dash || undefined}
          />
        );
      })}
      {ANCHORS.map((a) => {
        const vis = ANCHOR_VIS[a.anchor];
        // funciona para row fracionária (ESTACAO fica na borda Q11/Q21)
        const cx = xCol(Math.floor(a.col)) + COL_W[Math.floor(a.col)] / 2;
        const cy = MARGIN + a.row * (ROW_H + GUTTER) + ROW_H / 2;
        return (
          <g key={a.id}>
            <circle cx={cx} cy={cy} r={30 + a.radius * 38} fill={vis.color} opacity={0.15} />
            <circle cx={cx} cy={cy} r={14} fill={vis.color} opacity={0.35} />
            <text x={cx} y={cy} fontSize={16} textAnchor="middle" dominantBaseline="central">
              {vis.icon}
            </text>
          </g>
        );
      })}
    </g>
  );
}

// ─── Camada 2: lotes (interativa) ───────────────────────────────────
export default function MapSVG() {
  const lots = useGameStore((s) => s.lots);
  const buildings = useGameStore((s) => s.buildings);
  const auctions = useGameStore((s) => s.auctions);
  const selectedLotId = useGameStore((s) => s.selectedLotId);
  const selectLot = useGameStore((s) => s.selectLot);

  // relógio local de 1s só para o countdown de obras
  const hasWorks = Object.values(buildings).some((b) => b.upgradeEta !== null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!hasWorks) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [hasWorks]);

  const auctionLots = useMemo(
    () =>
      new Set(
        Object.values(auctions)
          .filter((a) => a.status === "active" || a.status === "closing")
          .map((a) => a.lotId)
      ),
    [auctions]
  );

  const handleLotClick = (lotId) => {
    console.log(lotId);
    selectLot(lotId);
  };

  // bounding box de um edifício (lotes contíguos na mesma quadra)
  const buildingBox = (b) => {
    const rects = b.lotIds.map((id) => lotRect(lots[id]));
    const x = Math.min(...rects.map((r) => r.x));
    const y = Math.min(...rects.map((r) => r.y));
    const x2 = Math.max(...rects.map((r) => r.x + r.w));
    const y2 = Math.max(...rects.map((r) => r.y + r.h));
    return { x, y, w: x2 - x, h: y2 - y };
  };

  const selected = selectedLotId ? lots[selectedLotId] : null;

  return (
    <div className="cc-panel">
      <div className="cc-panel-header">Mapa da Cidade</div>
      <svg
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        className="w-full h-auto block"
        style={{ background: "#151210" }}
      >
        {/* CAMADA 1 — vias e âncoras, nada aqui responde ao mouse */}
        <ViasLayer />

        {/* CAMADA 2 — lotes interativos, desenhados SOBRE as vias */}
        <g>
          {Object.values(lots).map((lot) => {
            const r = lotRect(lot);
            const zs = ZONE_STYLE[lot.zone];
            const os = lot.owner ? OWNER_STROKE[lot.owner] : null;
            return (
              <rect
                key={lot.id}
                className="cc-lot"
                x={r.x + 1.5}
                y={r.y + 1.5}
                width={r.w - 3}
                height={r.h - 3}
                rx={4}
                fill={zs.fill}
                stroke={os ? os.stroke : zs.stroke}
                strokeWidth={os ? os.width : 1}
                onClick={() => handleLotClick(lot.id)}
              />
            );
          })}

          {/* edifícios: emoji + badge de nível (não bloqueiam o clique) */}
          {Object.values(buildings).map((b) => {
            const box = buildingBox(b);
            const cx = box.x + box.w / 2;
            const cy = box.y + box.h / 2;
            const iconSize = Math.min(box.w, box.h) * 0.55;
            const underWorks = b.upgradeEta !== null;
            const secsLeft = underWorks ? Math.max(0, Math.ceil((b.upgradeEta - now) / 1000)) : 0;
            return (
              <g key={b.id} pointerEvents="none">
                <text x={cx} y={cy} fontSize={iconSize} textAnchor="middle" dominantBaseline="central">
                  {BUILDING_ICON[b.type]}
                </text>
                {!underWorks && (
                  <g>
                    <rect
                      x={box.x + box.w - 20}
                      y={box.y + box.h - 13}
                      width={17}
                      height={11}
                      rx={2}
                      fill="#0c0a09"
                      stroke="#eab308"
                      strokeWidth={0.5}
                    />
                    <text
                      x={box.x + box.w - 11.5}
                      y={box.y + box.h - 7.5}
                      fontSize={8}
                      fill="#fde047"
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="font-num"
                    >
                      L{b.level}
                    </text>
                  </g>
                )}
                {underWorks && (
                  <g>
                    <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={4} fill="#0c0a09" opacity={0.55} />
                    <text x={cx} y={cy - 6} fontSize={iconSize * 0.7} textAnchor="middle" dominantBaseline="central">
                      ⚙️
                    </text>
                    <text
                      x={cx}
                      y={cy + 9}
                      fontSize={9}
                      fill="#fde047"
                      textAnchor="middle"
                      className="font-num"
                    >
                      {secsLeft}s
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* badge pulsante de leilão ativo */}
          {[...auctionLots].map((lotId) => {
            const lot = lots[lotId];
            if (!lot) return null;
            const r = lotRect(lot);
            return (
              <circle
                key={`auc-${lotId}`}
                className="cc-pulse"
                cx={r.x + r.w - 6}
                cy={r.y + 6}
                r={4}
                fill="#f97316"
                pointerEvents="none"
              />
            );
          })}

          {/* outline dourado do lote selecionado */}
          {selected && (() => {
            const r = lotRect(selected);
            return (
              <rect
                className="cc-lot-selected"
                x={r.x + 1.5}
                y={r.y + 1.5}
                width={r.w - 3}
                height={r.h - 3}
                rx={4}
                fill="none"
                stroke="#f59e0b"
                strokeWidth={3}
              />
            );
          })()}
        </g>
      </svg>

      {/* ─── Legenda ─────────────────────────────────────────────── */}
      <div className="px-3 py-2 border-t border-[var(--stone-700)] text-xs flex flex-wrap gap-x-6 gap-y-2">
        <div>
          <div className="text-[var(--gold-300)] font-display text-[10px] tracking-widest mb-1">
            LOTES — CLIQUE PARA INTERAGIR
          </div>
          <div className="flex gap-3 flex-wrap text-[var(--parchment-dim)]">
            {Object.entries(ZONE_STYLE).map(([zone, s]) => (
              <span key={zone} className="flex items-center gap-1">
                <svg width="14" height="14">
                  <rect x="1" y="1" width="12" height="12" rx="3" fill={s.fill} stroke={s.stroke} />
                </svg>
                {zone}
              </span>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[var(--gold-300)] font-display text-[10px] tracking-widest mb-1">
            INFRAESTRUTURA — NÃO INTERATIVA
          </div>
          <div className="flex gap-3 flex-wrap text-[var(--parchment-dim)]">
            {Object.entries(VIA_STYLE).map(([via, s]) => (
              <span key={via} className="flex items-center gap-1">
                <svg width="22" height="10">
                  <line
                    x1="1" y1="5" x2="21" y2="5"
                    stroke={s.color}
                    strokeWidth={Math.min(s.width, 7)}
                    strokeDasharray={s.dash ? "4 3" : undefined}
                  />
                </svg>
                {via}
              </span>
            ))}
            {Object.entries(ANCHOR_VIS).map(([anchor, v]) => (
              <span key={anchor} className="flex items-center gap-1">
                <svg width="14" height="14">
                  <circle cx="7" cy="7" r="6" fill={v.color} opacity="0.3" />
                </svg>
                {v.icon} {anchor}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

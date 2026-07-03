// ─── Definição do mapa ──────────────────────────────────────────────
// Grade de 4 colunas × 3 linhas de quadras. Cada quadra tem w×h lotes.
// Tudo que o lote precisa saber (frontage, âncora, esquina, interior)
// é DERIVADO daqui — nunca digitado à mão.

export const QUADRAS = [
  { id: "Q00", row: 0, col: 0, zone: "central",     w: 3, h: 3 },
  { id: "Q01", row: 0, col: 1, zone: "comercial",   w: 3, h: 3 },
  { id: "Q02", row: 0, col: 2, zone: "comercial",   w: 3, h: 3 },
  { id: "Q03", row: 0, col: 3, zone: "periferico",  w: 2, h: 3 },
  { id: "Q10", row: 1, col: 0, zone: "industrial",  w: 3, h: 3 },
  { id: "Q11", row: 1, col: 1, zone: "industrial",  w: 3, h: 3 },
  { id: "Q12", row: 1, col: 2, zone: "residencial", w: 3, h: 3 },
  { id: "Q13", row: 1, col: 3, zone: "residencial", w: 2, h: 3 },
  { id: "Q20", row: 2, col: 0, zone: "periferico",  w: 4, h: 3 },
  { id: "Q21", row: 2, col: 1, zone: "periferico",  w: 4, h: 3 },
  { id: "Q22", row: 2, col: 2, zone: "residencial", w: 3, h: 3 },
  { id: "Q23", row: 2, col: 3, zone: "residencial", w: 2, h: 3 },
];

// ─── Vias (objetos inertes) ─────────────────────────────────────────
// Bordas horizontais: índice k = borda ACIMA da linha k de quadras
// (índice 3 = borda sul do mapa, sem via).
export const H_BORDERS = [
  { id: "ROD_N",    via: "rodovia" }, // borda norte do mapa
  { id: "AV_NORTE", via: "avenida" }, // entre linhas 0 e 1
  { id: "AV_SUL",   via: "avenida" }, // entre linhas 1 e 2
  null,                               // borda sul do mapa
];

// Bordas verticais: índice k = borda a OESTE da coluna k de quadras
// (índice 4 = borda leste do mapa).
export const V_BORDERS = [
  { id: "RUA_W",   via: "rua" },      // borda oeste do mapa
  null,                               // entre colunas 0 e 1
  { id: "RUA_MID", via: "rua" },      // entre colunas 1 e 2
  null,                               // entre colunas 2 e 3
  { id: "FER_E",   via: "ferrovia" }, // borda leste do mapa
];

// ─── Âncoras (raio em número de quadras, distância Chebyshev) ───────
export const ANCHORS = [
  { id: "PORTO",   anchor: "porto",          row: 1,   col: 0, radius: 2 },
  { id: "DISTFIN", anchor: "distFinanceiro", row: 0,   col: 0, radius: 1 },
  { id: "UNIV",    anchor: "universidade",   row: 2,   col: 2, radius: 1 },
  { id: "ESTACAO", anchor: "estacao",        row: 1.5, col: 1, radius: 2 }, // borda Q11/Q21
];

export function quadraById(id) {
  return QUADRAS.find((q) => q.id === id) || null;
}

// Âncora mais próxima cuja distância (em quadras) cabe no raio.
function anchorForQuadra(q) {
  let best = null;
  let bestDist = Infinity;
  for (const a of ANCHORS) {
    const d = Math.max(Math.abs(q.row - a.row), Math.abs(q.col - a.col));
    if (d <= a.radius && d < bestDist) {
      best = a;
      bestDist = d;
    }
  }
  return best ? best.anchor : null;
}

// ─── Geração dos lotes com campos derivados ─────────────────────────
export function generateLots() {
  const lots = {};
  for (const q of QUADRAS) {
    const inAnchorOf = anchorForQuadra(q);
    for (let ly = 0; ly < q.h; ly++) {
      for (let lx = 0; lx < q.w; lx++) {
        // Um lote só tem frontage se está na borda da quadra E aquela
        // borda da quadra tem uma via.
        const frontage = {
          N: ly === 0        ? (H_BORDERS[q.row]?.via ?? null)     : null,
          S: ly === q.h - 1  ? (H_BORDERS[q.row + 1]?.via ?? null) : null,
          O: lx === 0        ? (V_BORDERS[q.col]?.via ?? null)     : null,
          L: lx === q.w - 1  ? (V_BORDERS[q.col + 1]?.via ?? null) : null,
        };
        const faces = Object.values(frontage).filter(Boolean);
        const id = `${q.id}-${lx}-${ly}`;
        lots[id] = {
          id,
          quadraId: q.id,
          lx,
          ly,
          zone: q.zone,
          owner: null,
          buildingId: null,
          listedPrice: null,
          purchase: 0,
          // derivados
          frontage,
          inAnchorOf,
          isCorner: faces.length >= 2,
          isInterior: faces.length === 0,
        };
      }
    }
  }
  return lots;
}

// Tipos de edifício: renda base L1 (💰/tick), workers base L1,
// lotes contíguos necessários e zonas permitidas.
export const BUILDING_TYPES = {
  casa:            { renda: 40,  workers: 5,  lotes: 1, zonas: ["residencial", "periferico"] },
  loja:            { renda: 55,  workers: 8,  lotes: 1, zonas: ["comercial"] },
  escritorio:      { renda: 70,  workers: 10, lotes: 1, zonas: ["central", "comercial"] },
  armazem:         { renda: 50,  workers: 8,  lotes: 1, zonas: ["industrial"] },
  apartamento:     { renda: 110, workers: 18, lotes: 2, zonas: ["residencial"] },
  centroComercial: { renda: 150, workers: 25, lotes: 2, zonas: ["comercial"] },
  fabrica:         { renda: 130, workers: 22, lotes: 2, zonas: ["industrial"] },
  hotel:           { renda: 260, workers: 45, lotes: 3, zonas: ["central", "comercial"] },
  complexoRes:     { renda: 220, workers: 40, lotes: 3, zonas: ["residencial"] },
  hospital:        { renda: 480, workers: 90, lotes: 4, zonas: ["central"] },
  universidade:    { renda: 440, workers: 85, lotes: 4, zonas: ["central", "residencial"] },
  banco:           { renda: 520, workers: 95, lotes: 4, zonas: ["central"] },
  shopping:        { renda: 500, workers: 92, lotes: 4, zonas: ["comercial", "central"] },
};

export const BUILDING_LABELS = {
  casa: "Casa",
  loja: "Loja",
  escritorio: "Escritório",
  armazem: "Armazém",
  apartamento: "Apartamento",
  centroComercial: "Centro Comercial",
  fabrica: "Fábrica",
  hotel: "Hotel",
  complexoRes: "Complexo Residencial",
  hospital: "Hospital",
  universidade: "Universidade",
  banco: "Banco",
  shopping: "Shopping",
};

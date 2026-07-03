// Formatação compacta: <1000 = "850", <1M = "12.4K", <1B = "3.2M"
export function fmtMoney(n) {
  const v = Math.round(n);
  const abs = Math.abs(v);
  if (abs < 1000) return String(v);
  if (abs < 1_000_000) return `${(v / 1000).toFixed(1)}K`;
  if (abs < 1_000_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  return `${(v / 1_000_000_000).toFixed(1)}B`;
}

export const fmtPop = fmtMoney;

// formato exato para preços de transação (lances, custos)
export const fmtExact = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

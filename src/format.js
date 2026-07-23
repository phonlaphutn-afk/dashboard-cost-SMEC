export const baht = (n) =>
  new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(n) || 0);

export const pct = (n) => `${(Number(n) * 100).toFixed(1)}%`;

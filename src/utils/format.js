// Slovenský formát čísel: 2 840,00 €
const money = new Intl.NumberFormat('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const percent = new Intl.NumberFormat('sk-SK', { maximumFractionDigits: 1 });
const compact = new Intl.NumberFormat('sk-SK', { maximumFractionDigits: 1 });

const MINUS = '−';

function signOf(value, sign) {
  if (value < -0.004) return MINUS;
  if (sign && value > 0.004) return '+';
  return '';
}

// 2 840,00 (bez meny). sign: true pridá "+" pred kladné číslo.
export function formatNumber(value, { sign = false } = {}) {
  return `${signOf(value, sign)}${money.format(Math.abs(value))}`;
}

// 2 840,00 €
export function formatMoney(value, { sign = false } = {}) {
  return `${formatNumber(value, { sign })} €`;
}

// 62,4
export function formatPercent(value) {
  return percent.format(value);
}

// Krátke číslo pre osi grafu: 2,5 tis.
export function formatCompact(value) {
  if (Math.abs(value) >= 1000) return `${compact.format(value / 1000)} tis.`;
  return compact.format(Math.round(value));
}

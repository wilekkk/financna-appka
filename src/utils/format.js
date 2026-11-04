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

const WEEKDAYS = ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota'];
const MONTHS_GENITIVE = ['januára', 'februára', 'marca', 'apríla', 'mája', 'júna', 'júla', 'augusta', 'septembra', 'októbra', 'novembra', 'decembra'];

// "31.10.2026" -> "Piatok 31. októbra". Neznámy formát vráti bez zmeny.
export function formatDayLabel(dateStr) {
  const [d, m, y] = String(dateStr || '').split('.').map(Number);
  const date = new Date(y, m - 1, d);
  if (!d || !m || !y || Number.isNaN(date.getTime())) return dateStr || 'Bez dátumu';
  return `${WEEKDAYS[date.getDay()]} ${d}. ${MONTHS_GENITIVE[m - 1]}`;
}

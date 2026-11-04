import { formatMoney } from '../utils/format';

// Suma s menšími centami: 4 812,30 €
export default function Money({ value, sign = false }) {
  const text = formatMoney(value, { sign });
  const comma = text.lastIndexOf(',');
  return (
    <span className="money">
      {text.slice(0, comma)}
      <span className="money-cents">{text.slice(comma)}</span>
    </span>
  );
}

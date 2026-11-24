// Ktoré transakcie z nového výpisu už v mesiaci sú (duplicity) a ktoré sú nové.
//
// Transakcia je rovnaká, ak má rovnaký dátum, obchod a sumu. Revolut transakcia má aj dátum
// začatia (`started`): čakajúca platba (PENDING) má len ten, dokončená aj dátum dokončenia,
// takže sa porovnávajú oba dátumy.
//
// Počíta sa aj počet: ak mesiac obsahuje jednu kávu za 1,50 € a výpis dve rovnaké, jedna je
// duplicita a druhá nová.

const keyFor = (date, t) => `${date}|${t.store}|${t.amount}`;
const keysOf = t => [...new Set([t.started, t.date].filter(Boolean))].map(date => keyFor(date, t));

export function findNewTransactions(existingTransactions, incoming) {
  const byKey = new Map(); // kľúč -> poradové čísla existujúcich transakcií
  existingTransactions.forEach((t, i) => keysOf(t).forEach(key => {
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(i);
  }));
  const used = new Set();
  const fresh = [];
  let duplicates = 0;
  incoming.forEach(t => {
    const match = keysOf(t).flatMap(key => byKey.get(key) || []).find(i => !used.has(i));
    if (match === undefined) {
      fresh.push(t);
    } else {
      used.add(match);
      duplicates += 1;
    }
  });
  return { fresh, duplicates };
}

// Odhlásenie po nečinnosti. Čas poslednej aktivity si pamätáme v prehliadači, lebo na zamknutom
// mobile časovače stoja. Pri návrate do appky (alebo jej novom otvorení) ho len porovnáme s hodinami.
export const INACTIVITY_LIMIT_MS = 60 * 60 * 1000; // 1 hodina
const KEY = 'financna-appka:last-activity';

// Úložisko môže byť nedostupné (súkromné okno, zablokované dáta stránky). Vtedy sa nič nezapíše
// a appka ťa neodhlási, čiže sa správa ako doteraz.
export function markActivity(now = Date.now()) {
  try { localStorage.setItem(KEY, String(now)); } catch { /* úložisko nedostupné */ }
}

export function clearActivity() {
  try { localStorage.removeItem(KEY); } catch { /* úložisko nedostupné */ }
}

export function isInactiveTooLong(now = Date.now()) {
  try {
    const last = Number(localStorage.getItem(KEY));
    return last > 0 && now - last > INACTIVITY_LIMIT_MS;
  } catch {
    return false;
  }
}

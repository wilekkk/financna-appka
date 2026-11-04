// Test celej aplikácie: prejde hlavné obrazovky a akcie s ukážkovými dátami (bez Supabase).
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import App from './App';
import { generateMonths } from './utils/finance';
import { DEFAULT_SUBCATEGORIES } from './constants';

const mockSignOut = jest.fn();
jest.mock('./supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1', email: 'test@test.sk', user_metadata: { first_name: 'Test' } } } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signOut: (...a) => mockSignOut(...a),
      updateUser: () => Promise.resolve({ error: null }),
    },
  },
}));

const months = generateMonths();
const tx = (amount, date, store, extra = {}) => ({ transaction: { amount, store, date, id: extra.id ?? `${store}-${date}` }, splits: null, ...extra });
const sample = {
  [months[8].key]: {
    history: [tx(-600, '01.09.2026', 'Nájom', { category: 'needs' })],
    creditHistory: [tx(2840, '30.09.2026', 'Výplata', { category: 'prijem' })],
  },
  [months[9].key]: {
    history: [
      tx(-54.2, '31.10.2026', 'Lidl', { category: 'needs', subcategory: DEFAULT_SUBCATEGORIES[2] }),
      tx(-98.9, '27.10.2026', 'Tesco', { category: 'split', splits: { needs: 70, wants: 30, savings: 0 } }),
      tx(-200, '28.10.2026', 'Prevod na sporenie', { category: 'savings' }),
      tx(-32.2, '31.10.2026', 'Kino', { category: 'wants' }),
    ],
    creditHistory: [tx(2840, '30.10.2026', 'Výplata', { category: 'prijem' })],
  },
};
const mockSaved = [];
const mockSample = sample;
jest.mock('./utils/db', () => ({
  loadUserData: () => Promise.resolve({
    monthsData: JSON.parse(JSON.stringify(mockSample)),
    savingsGoals: [{ id: 1, name: 'Dovolenka', targetAmount: 3000, allocations: [{ id: 9, initial: true, amount: 1200 }] }],
    customCategories: null,
  }),
  saveUserData: (...args) => { mockSaved.push(args); return Promise.resolve(); },
}));
jest.mock('lucide-react', () => new Proxy({}, { get: (_, name) => () => <i data-icon={String(name)} /> }));


const nav = label => fireEvent.click(within(screen.getByRole('navigation', { name: 'Hlavná navigácia' })).getByText(label));
const errors = [];
beforeEach(() => { jest.spyOn(console, 'error').mockImplementation((...a) => errors.push(a.join(' '))); });
afterEach(() => { console.error.mockRestore(); });

test('celá aplikácia funguje', async () => {
  render(<App />);

  // 1. Prehľad roka
  await screen.findByText('Čistý cashflow za rok');
  await waitFor(() => expect(norm(document.querySelector('.hero-value'))).toBe('+4 694,70 €'));
  const hero = norm(document.querySelector('.hero-value'));
  expect(norm(screen.getByText(/v októbri/))).toBe('+2 454,70 € v októbri');
  expect(document.querySelectorAll('.cf-svg path').length).toBe(2);
  expect(document.querySelectorAll('.month-table-row').length).toBe(2);
  expect(screen.getByText('Rozdelenie výdavkov')).toBeTruthy();
  log('Prehľad OK', hero);

  // 2. Sporenie cez spodné menu
  nav('Sporenie');
  expect(norm(document.querySelector('.hero-value'))).toBe('1 200,00 €');
  fireEvent.click(screen.getByText('Nový cieľ'));
  fireEvent.change(screen.getByPlaceholderText('Názov cieľa (napr. Dovolenka)'), { target: { value: 'Auto' } });
  fireEvent.click(screen.getByText('Pridať'));
  expect(screen.getByText('Auto')).toBeTruthy();
  fireEvent.click(screen.getByText('Dovolenka'));
  expect(screen.getByText('Počiatočný stav')).toBeTruthy();
  fireEvent.click(screen.getByText('Auto'));
  fireEvent.click(within(screen.getByText('Auto').closest('.goal-row')).getByText('Vymazať'));
  fireEvent.click(screen.getByText('Áno'));
  expect(screen.queryByText('Auto')).toBeNull();
  log('Sporenie OK: pridanie, rozbalenie, vymazanie cieľa');

  // 3. Zoznam mesiacov a mesiac
  nav('Mesiace');
  expect(screen.getByText(`Mesiace ${months[0].key.slice(0, 4)}`)).toBeTruthy();
  expect(document.querySelectorAll('.month-row').length).toBe(12);
  expect(document.querySelectorAll('.month-row--empty').length).toBe(10);
  fireEvent.click(screen.getByText('Október'));
  expect(screen.getByText(`Október ${months[9].key.slice(0, 4)}`)).toBeTruthy();
  expect(norm(document.querySelector('.hero-value'))).toBe('+2 454,70 €');
  const days = [...document.querySelectorAll('.tx-day-head')].map(e => norm(e));
  log('Dni v mesiaci:', days.join(' | '));
  expect(days[0]).toMatch(/31\. októbra−86,40 €/);
  expect(screen.getByText(/Needs 70/)).toBeTruthy();

  // šípky mesiacov
  expect(screen.getByLabelText('Nasledujúci mesiac').disabled).toBe(true);
  fireEvent.click(screen.getByLabelText('Predchádzajúci mesiac'));
  expect(screen.getByText(`September ${months[8].key.slice(0, 4)}`)).toBeTruthy();
  expect(screen.getByLabelText('Predchádzajúci mesiac').disabled).toBe(true);
  fireEvent.click(screen.getByLabelText('Nasledujúci mesiac'));
  expect(screen.getByText(`Október ${months[9].key.slice(0, 4)}`)).toBeTruthy();
  log('Mesiac OK: súhrn, dni, šípky');

  // podkategória: priradenie
  const kinoRow = screen.getByText('Kino').closest('.tx-item');
  fireEvent.click(within(kinoRow).getByText('+ Podkategória'));
  fireEvent.click(within(kinoRow).getByText('Zábava'));
  expect(within(screen.getByText('Kino').closest('.tx-item')).getByText('Zábava')).toBeTruthy();

  // záložka Podkategórie + filter
  fireEvent.click(screen.getByText('Podkategórie'));
  fireEvent.click(screen.getByText('Zábava').closest('button'));
  expect(screen.getByText('Zrušiť filter')).toBeTruthy();
  expect(document.querySelectorAll('.tx-item').length).toBe(1);
  fireEvent.click(screen.getByText('Zrušiť filter'));
  expect(document.querySelectorAll('.tx-item').length).toBe(5);
  log('Podkategórie OK: priradenie, filter');

  // pridanie transakcie
  fireEvent.click(screen.getByText('Pridať'));
  fireEvent.change(screen.getByLabelText('Názov'), { target: { value: 'Kaviareň' } });
  fireEvent.change(screen.getByLabelText('Suma (€)'), { target: { value: '4.5' } });
  fireEvent.click(within(document.querySelector('.add-transaction-dialog')).getByText('Wants'));
  fireEvent.click(within(document.querySelector('.add-transaction-dialog')).getByText('Pridať'));
  expect(screen.getByText('Pridané ručne')).toBeTruthy();
  expect(within(screen.getByText('Kaviareň').closest('.tx-item')).getByText('−4,50 €')).toBeTruthy();
  log('Pridanie transakcie OK');

  // úpravy: zmena sumy a vymazanie
  fireEvent.click(screen.getByText('Upraviť'));
  fireEvent.click(screen.getByText('Prepnúť'));
  expect(screen.getByText('Hotovo')).toBeTruthy();
  const lidl = () => screen.getByText('Lidl').closest('.tx-item');
  fireEvent.click(within(lidl()).getByText('−54,20 €'));
  const input = lidl().querySelector('.amount-input');
  fireEvent.change(input, { target: { value: '60' } });
  fireEvent.blur(input);
  expect(within(lidl()).getByText('−60,00 €')).toBeTruthy();
  fireEvent.click(within(screen.getByText('Kaviareň').closest('.tx-item')).getByLabelText('Vymazať transakciu'));
  fireEvent.click(screen.getByText('Áno'));
  expect(screen.queryByText('Kaviareň')).toBeNull();
  fireEvent.click(screen.getByText('Hotovo'));
  log('Úpravy OK: zmena sumy, vymazanie');

  // priradenie k cieľu sporenia
  fireEvent.click(screen.getByText('Priradiť k cieľu sporenia'));
  const sheet = document.querySelector('.split-sheet');
  fireEvent.click(within(sheet).getByText('Dovolenka'));
  fireEvent.change(within(sheet).getByPlaceholderText('Suma'), { target: { value: '200' } });
  fireEvent.click(within(sheet).getByText('Priradiť'));
  expect(within(screen.getByText('Prevod na sporenie').closest('.tx-item')).getByText(/Dovolenka/)).toBeTruthy();
  log('Priradenie k cieľu OK');

  // 4. Nahratie výpisu + swipe v prázdnom mesiaci
  nav('Mesiace');
  fireEvent.click(screen.getByText('November'));
  expect(screen.getByText('Nahratie výpisu')).toBeTruthy();
  const csv = 'Dátum spracovania,Suma,Typ,Informácia pre príjemcu,Popis\n'
    + '03.11.2026,"12,50",Debet,,Billa\n'
    + '04.11.2026,"40,00",Debet,,Shell\n'
    + '05.11.2026,"100,00",Kredit,,Refund\n';
  const file = new File([csv], 'vypis.csv', { type: 'text/csv' });
  fireEvent.change(document.querySelector('input[type="file"]'), { target: { files: [file] } });
  await screen.findByText('Billa');
  expect(screen.getByText('1 / 2')).toBeTruthy();
  const drag = (dx, dy) => {
    const card = document.querySelector('.card');
    fireEvent.mouseDown(card, { clientX: 0, clientY: 0 });
    fireEvent.mouseMove(card, { clientX: dx, clientY: dy });
    fireEvent.mouseUp(card);
  };
  drag(200, 0); // doprava = Needs
  await screen.findByText('Shell', {}, { timeout: 2000 });
  drag(0, 200); // dole = Rozdeliť
  expect(screen.getByText('Potvrdiť')).toBeTruthy();
  fireEvent.click(screen.getByText('Potvrdiť'));
  await screen.findByText(`November ${months[10].key.slice(0, 4)}`, {}, { timeout: 2000 });
  log('November:', [...document.querySelectorAll('.tx-item')].map(e => norm(e)).join(' | '), '| hero', norm(document.querySelector('.hero-value')));
  expect(screen.getByText('Billa')).toBeTruthy();
  expect(screen.getByText('Refund')).toBeTruthy();
  log('Nahratie CSV + swipe OK');

  // 5. Nastavenia → Podkategórie → pridanie a vymazanie
  nav('Nastavenia');
  fireEvent.click(screen.getByText('Podkategórie príjmov a výdavkov'));
  fireEvent.click(screen.getByLabelText('Pridať podkategóriu'));
  fireEvent.click(screen.getByText('Výdavková'));
  fireEvent.change(screen.getByLabelText('Názov'), { target: { value: 'Doprava' } });
  fireEvent.click(within(document.querySelector('.category-dialog')).getByText('Pridať'));
  expect(screen.getByText('Doprava')).toBeTruthy();
  fireEvent.click(screen.getByLabelText('Vymazať Doprava'));
  fireEvent.click(within(document.querySelector('.category-dialog')).getByText('Vymazať'));
  expect(screen.queryByText('Doprava')).toBeNull();
  log('Nastavenia → Podkategórie OK');

  // 6. Profil + odhlásenie
  fireEvent.click(screen.getByLabelText('Späť na nastavenia'));
  fireEvent.click(screen.getByText('Profil'));
  expect(screen.getByDisplayValue('test@test.sk')).toBeTruthy();
  fireEvent.click(screen.getByText('Odhlásiť sa'));
  expect(mockSignOut).toHaveBeenCalled();
  log('Profil + odhlásenie OK');

  // 7. Ukladanie do databázy
  await waitFor(() => expect(mockSaved.length).toBeGreaterThan(0), { timeout: 3000 });
  const [, savedMonths, savedGoals] = mockSaved.slice(-1)[0];
  expect(Object.keys(savedMonths)).toContain(months[10].key);
  expect(savedGoals[0].allocations.length).toBe(2);
  log('Automatické ukladanie OK');

  const reactWarnings = errors.filter(e => /Warning|Error/.test(e));
  log('React varovania:', reactWarnings.length ? reactWarnings.join('\n') : 'žiadne');
}, 20000);

function norm(el) { return el.textContent.replace(/[\u00a0\u202f]/g, ' '); }
function log() {}

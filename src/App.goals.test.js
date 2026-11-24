// Ciele sporenia sú prepojené s konkrétnou transakciou, nie len s obchodom a dátumom.
import { render, screen, fireEvent, within } from '@testing-library/react';
import App from './App';
import { generateMonths } from './utils/finance';

jest.mock('./supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1', email: 'test@test.sk' } } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signOut: jest.fn(),
    },
  },
}));
const months = generateMonths();
const march = months[2];
const date = `05.03.${march.key.slice(0, 4)}`;
// dve rovnaké platby v ten istý deň (napr. dve dobitia Revolutu), uložené ešte bez čísel transakcií
const revolut = id => ({ transaction: { id, store: 'Revolut', date, amount: -50 }, category: 'savings', splits: null });
const mockData = {
  monthsData: { [march.key]: { history: [revolut(1), revolut(2)], creditHistory: [] } },
  savingsGoals: [{ id: 1, name: 'Dovolenka', targetAmount: null, allocations: [] }],
};
jest.mock('./utils/db', () => ({
  DataConflictError: class DataConflictError extends Error {},
  loadUserData: () => Promise.resolve({ ...JSON.parse(JSON.stringify(mockData)), customCategories: null, updatedAt: 't1' }),
  saveUserData: () => Promise.resolve('t2'),
}));
jest.mock('lucide-react', () => new Proxy({}, { get: (_, name) => () => <i data-icon={String(name)} /> }));

const nav = label => fireEvent.click(within(screen.getByRole('navigation', { name: 'Hlavná navigácia' })).getByText(label));
const rows = () => screen.getAllByText('Revolut').map(el => el.closest('.tx-item'));
const norm = el => el.textContent.replace(/\s/g, ' ');

beforeEach(() => localStorage.clear());

test('priradenie patrí len jednej z dvoch rovnakých platieb a pri vymazaní platby sa odoberie z cieľa', async () => {
  render(<App />);
  await screen.findByText('Čistý cashflow za rok');
  nav('Mesiace');
  fireEvent.click(screen.getByText(march.label));

  // priradenie 50 € z prvej platby
  fireEvent.click(within(rows()[0]).getByText('Priradiť k cieľu sporenia'));
  const sheet = document.querySelector('.split-sheet');
  fireEvent.click(within(sheet).getByText('Dovolenka'));
  fireEvent.change(within(sheet).getByPlaceholderText('Suma'), { target: { value: '50' } });
  fireEvent.click(within(sheet).getByText('Priradiť'));

  expect(within(rows()[0]).getByText(/Dovolenka/)).toBeTruthy();
  expect(within(rows()[1]).queryByText(/Dovolenka/)).toBeNull();
  expect(within(rows()[1]).getByText('Priradiť k cieľu sporenia')).toBeTruthy();

  // vymazanie prvej platby povie, čo sa odoberie z cieľa, a odoberie to
  fireEvent.click(screen.getByText('Upraviť'));
  fireEvent.click(screen.getByText('Prepnúť'));
  fireEvent.click(within(rows()[0]).getByLabelText('Vymazať transakciu'));
  expect(norm(within(rows()[0]).getByText(/Odoberie sa aj sporenie/))).toBe('Odoberie sa aj sporenie: Dovolenka 50,00 €.');
  fireEvent.click(within(rows()[0]).getByText('Áno'));
  expect(rows()).toHaveLength(1);
  fireEvent.click(screen.getByText('Hotovo'));

  nav('Sporenie');
  expect(norm(document.querySelector('.goal-row-amount'))).toBe('0,00 €');
});

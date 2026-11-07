// Nový používateľ bez dát: uvítanie na Prehľade a návod.
import { render, screen, fireEvent, within } from '@testing-library/react';
import App from './App';

const mockLoad = jest.fn();
jest.mock('./supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1', email: 'test@test.sk' } } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signOut: jest.fn(),
    },
  },
}));
jest.mock('./utils/db', () => ({
  DataConflictError: class DataConflictError extends Error {},
  loadUserData: (...args) => mockLoad(...args),
  saveUserData: () => Promise.resolve('t2'),
}));
jest.mock('lucide-react', () => new Proxy({}, { get: (_, name) => () => <i data-icon={String(name)} /> }));

const nav = label => fireEvent.click(within(screen.getByRole('navigation', { name: 'Hlavná navigácia' })).getByText(label));

beforeEach(() => localStorage.clear());

test('bez dát: uvítanie vedie na návod aj na nahratie výpisu', async () => {
  mockLoad.mockResolvedValue({ monthsData: {}, savingsGoals: [], customCategories: null, updatedAt: null });
  render(<App />);
  expect(await screen.findByText('Začni prvým výpisom')).toBeTruthy();

  fireEvent.click(screen.getByText('Ako na to'));
  expect(screen.getByText('Ako používať appku')).toBeTruthy();
  expect(screen.getByText(/Potiahni kartu doprava/)).toBeTruthy();
  fireEvent.click(screen.getByLabelText('Späť'));
  expect(screen.getByText('Začni prvým výpisom')).toBeTruthy();

  fireEvent.click(screen.getByText('Nahrať výpis'));
  expect(screen.getByText(/^Mesiace \d{4}$/)).toBeTruthy();
});

test('s dátami sa uvítanie neukáže, návod je v Nastaveniach', async () => {
  mockLoad.mockResolvedValue({ monthsData: { '2020-01': { history: [], creditHistory: [] } }, savingsGoals: [], customCategories: null, updatedAt: 't1' });
  render(<App />);
  await screen.findByText('Čistý cashflow za rok');
  expect(screen.queryByText('Začni prvým výpisom')).toBeNull();

  nav('Nastavenia');
  fireEvent.click(screen.getByText('Ako používať appku'));
  expect(screen.getByRole('heading', { name: 'Ako používať appku' })).toBeTruthy();
  fireEvent.click(screen.getByLabelText('Späť'));
  expect(screen.getByRole('heading', { name: 'Nastavenia' })).toBeTruthy();
});

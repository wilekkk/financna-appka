// Odhlásenie po hodine nečinnosti (aj keď bol mobil zamknutý a časovače stáli).
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import App from './App';
import { INACTIVITY_LIMIT_MS } from './utils/inactivity';

const KEY = 'financna-appka:last-activity';
let mockAuthListener;
const mockSignOut = jest.fn();
const mockLoad = jest.fn();
const mockSave = jest.fn();
jest.mock('./supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1', email: 'test@test.sk' } } } }),
      onAuthStateChange: callback => { mockAuthListener = callback; return { data: { subscription: { unsubscribe() {} } } }; },
      signOut: (...args) => mockSignOut(...args),
    },
  },
}));
jest.mock('./utils/db', () => ({
  DataConflictError: class DataConflictError extends Error {},
  loadUserData: (...args) => mockLoad(...args),
  saveUserData: (...args) => mockSave(...args),
}));
jest.mock('lucide-react', () => new Proxy({}, { get: (_, name) => () => <i data-icon={String(name)} /> }));

const longAgo = () => String(Date.now() - INACTIVITY_LIMIT_MS - 60_000);
const nav = label => fireEvent.click(within(screen.getByRole('navigation', { name: 'Hlavná navigácia' })).getByText(label));

beforeEach(() => {
  localStorage.clear();
  mockLoad.mockResolvedValue({ monthsData: {}, savingsGoals: [], customCategories: null, updatedAt: 't1' });
  mockSave.mockResolvedValue('t2');
  // Odhlásenie v Supabase pošle udalosť SIGNED_OUT bez session.
  mockSignOut.mockImplementation(async () => { act(() => mockAuthListener('SIGNED_OUT', null)); return { error: null }; });
});

test('otvorenie appky po viac ako hodine: odhlási a povie prečo', async () => {
  localStorage.setItem(KEY, longAgo());
  render(<App />);
  expect(await screen.findByText(/Odhlásili sme ťa po hodine nečinnosti/)).toBeTruthy();
  expect(mockSignOut).toHaveBeenCalled();
});

test('otvorenie appky skôr ako po hodine: ostane prihlásená', async () => {
  localStorage.setItem(KEY, String(Date.now() - 10 * 60_000));
  render(<App />);
  expect(await screen.findByText('Čistý cashflow za rok')).toBeTruthy();
  expect(mockSignOut).not.toHaveBeenCalled();
});

test('návrat po hodine s neuloženou zmenou: najprv uloží, potom odhlási', async () => {
  render(<App />);
  await screen.findByText('Čistý cashflow za rok');
  nav('Sporenie');
  fireEvent.click(screen.getByText('Nový cieľ'));
  fireEvent.change(screen.getByPlaceholderText('Názov cieľa (napr. Dovolenka)'), { target: { value: 'Auto' } });
  fireEvent.click(screen.getByText('Pridať'));

  // mobil sa zamkol hneď po zmene a odomkol o viac ako hodinu
  localStorage.setItem(KEY, longAgo());
  act(() => { document.dispatchEvent(new Event('visibilitychange')); });

  expect(await screen.findByText(/Odhlásili sme ťa po hodine nečinnosti/)).toBeTruthy();
  expect(mockSave).toHaveBeenCalledTimes(1);
  expect(mockSave.mock.calls[0][2].map(goal => goal.name)).toEqual(['Auto']);
  expect(mockSave.mock.invocationCallOrder[0]).toBeLessThan(mockSignOut.mock.invocationCallOrder[0]);
});

test('ťuknutie do appky zapíše aktivitu', async () => {
  render(<App />);
  await screen.findByText('Čistý cashflow za rok');
  localStorage.setItem(KEY, '1');
  fireEvent.pointerDown(document.body);
  await waitFor(() => expect(Number(localStorage.getItem(KEY))).toBeGreaterThan(Date.now() - 5000));
});

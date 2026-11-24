// Viac účtov na jednom zariadení: po odhlásení sa dáta predchádzajúceho účtu nesmú ukázať ďalšiemu.
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import App from './App';

let mockAuthListener;
const mockLoad = jest.fn();
const mockSave = jest.fn();
jest.mock('./supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: { user: { id: 'a', email: 'a@test.sk' } } } }),
      onAuthStateChange: callback => { mockAuthListener = callback; return { data: { subscription: { unsubscribe() {} } } }; },
      signOut: jest.fn(),
    },
  },
}));
jest.mock('./utils/db', () => ({
  DataConflictError: class DataConflictError extends Error {},
  loadUserData: (...args) => mockLoad(...args),
  saveUserData: (...args) => mockSave(...args),
}));
jest.mock('lucide-react', () => new Proxy({}, { get: (_, name) => () => <i data-icon={String(name)} /> }));

const nav = label => fireEvent.click(within(screen.getByRole('navigation', { name: 'Hlavná navigácia' })).getByText(label));
const goal = name => ({ id: 1, name, targetAmount: null, allocations: [] });

beforeEach(() => localStorage.clear());

test('po odhlásení a prihlásení iného účtu neukáže dáta predchádzajúceho účtu', async () => {
  let resolveB;
  mockLoad.mockImplementation(id => id === 'a'
    ? Promise.resolve({ monthsData: {}, savingsGoals: [goal('Cieľ účtu A')], customCategories: null, updatedAt: 't1' })
    : new Promise(resolve => { resolveB = resolve; }));
  render(<App />);
  await screen.findByText('Čistý cashflow za rok');
  nav('Sporenie');
  expect(screen.getByText('Cieľ účtu A')).toBeTruthy();

  act(() => mockAuthListener('SIGNED_OUT', null));
  act(() => mockAuthListener('SIGNED_IN', { user: { id: 'b', email: 'b@test.sk' } }));

  // dáta účtu B sa ešte načítavajú
  expect(screen.getByText('Načítava...')).toBeTruthy();
  expect(screen.queryByText('Cieľ účtu A')).toBeNull();

  await act(async () => resolveB({ monthsData: {}, savingsGoals: [], customCategories: null, updatedAt: null }));
  expect(await screen.findByText('Čistý cashflow za rok')).toBeTruthy(); // začína na Prehľade
  nav('Sporenie');
  expect(screen.queryByText('Cieľ účtu A')).toBeNull();
  expect(mockSave).not.toHaveBeenCalled();
});

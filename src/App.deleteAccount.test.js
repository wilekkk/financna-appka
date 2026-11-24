// Zmazanie účtu v Profile: potvrdenie slovom ZMAZAŤ, potom zmaže účet a odhlási.
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import App from './App';

let mockAuthListener;
const mockSignOut = jest.fn();
const mockLoad = jest.fn();
const mockSave = jest.fn();
const mockDelete = jest.fn();
jest.mock('./supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1', email: 'test@test.sk' } } } }),
      onAuthStateChange: callback => { mockAuthListener = callback; return { data: { subscription: { unsubscribe() {} } } }; },
      signOut: (...args) => mockSignOut(...args),
      updateUser: () => Promise.resolve({ error: null }),
    },
  },
}));
jest.mock('./utils/db', () => ({
  DataConflictError: class DataConflictError extends Error {},
  loadUserData: (...args) => mockLoad(...args),
  saveUserData: (...args) => mockSave(...args),
  deleteOwnAccount: (...args) => mockDelete(...args),
}));
jest.mock('lucide-react', () => new Proxy({}, { get: (_, name) => () => <i data-icon={String(name)} /> }));

const nav = label => fireEvent.click(within(screen.getByRole('navigation', { name: 'Hlavná navigácia' })).getByText(label));
const openDeleteDialog = async () => {
  render(<App />);
  await screen.findByText('Čistý cashflow za rok');
  nav('Nastavenia');
  fireEvent.click(screen.getByText('Profil'));
  fireEvent.click(screen.getByText('Zmazať účet'));
};

beforeEach(() => {
  localStorage.clear();
  mockLoad.mockResolvedValue({ monthsData: {}, savingsGoals: [], customCategories: null, updatedAt: 't1' });
  mockSave.mockResolvedValue('t2');
  mockSignOut.mockImplementation(async () => { act(() => mockAuthListener('SIGNED_OUT', null)); return { error: null }; });
});

test('zmaže účet až po napísaní ZMAZAŤ, odhlási a povie prečo', async () => {
  mockDelete.mockResolvedValue();
  await openDeleteDialog();
  const confirm = screen.getByText('Zmazať natrvalo');
  expect(confirm.disabled).toBe(true);
  fireEvent.change(screen.getByLabelText('Pre potvrdenie napíš ZMAZAŤ'), { target: { value: 'zmazat' } });
  expect(confirm.disabled).toBe(false);
  fireEvent.click(confirm);

  expect(await screen.findByText('Tvoj účet a všetky dáta boli zmazané.')).toBeTruthy();
  expect(mockDelete).toHaveBeenCalledTimes(1);
  expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
  expect(mockDelete.mock.invocationCallOrder[0]).toBeLessThan(mockSignOut.mock.invocationCallOrder[0]);
  expect(mockSave).not.toHaveBeenCalled(); // zmazané dáta sa neuložia späť
});

test('keď sa zmazanie nepodarí, ukáže chybu a ostane prihlásený', async () => {
  mockDelete.mockRejectedValue(new Error('Failed to fetch'));
  jest.spyOn(console, 'error').mockImplementation(() => {});
  await openDeleteDialog();
  fireEvent.change(screen.getByLabelText('Pre potvrdenie napíš ZMAZAŤ'), { target: { value: 'ZMAZAŤ' } });
  fireEvent.click(screen.getByText('Zmazať natrvalo'));

  expect(await screen.findByText(/Účet sa nepodarilo zmazať/)).toBeTruthy();
  expect(mockSignOut).not.toHaveBeenCalled();
  await waitFor(() => expect(screen.getByText('Zmazať natrvalo').disabled).toBe(false));
  console.error.mockRestore();
});

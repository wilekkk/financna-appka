// Ukladanie z viacerých zariadení: appka neprepíše novšie dáta a po návrate do appky si ich načíta.
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import App from './App';

const mockLoad = jest.fn();
const mockSave = jest.fn();
const mockSignOut = jest.fn();
jest.mock('./supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1', email: 'test@test.sk' } } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signOut: (...args) => mockSignOut(...args),
    },
  },
}));
jest.mock('./utils/db', () => ({
  DataConflictError: jest.requireActual('./utils/db').DataConflictError,
  loadUserData: (...args) => mockLoad(...args),
  saveUserData: (...args) => mockSave(...args),
}));
jest.mock('lucide-react', () => new Proxy({}, { get: (_, name) => () => <i data-icon={String(name)} /> }));

const { DataConflictError } = jest.requireActual('./utils/db');
const stored = (updatedAt, goals = []) => ({ monthsData: {}, savingsGoals: goals, customCategories: null, updatedAt });
const wait = ms => act(() => new Promise(resolve => setTimeout(resolve, ms)));
const nav = label => fireEvent.click(within(screen.getByRole('navigation', { name: 'Hlavná navigácia' })).getByText(label));
const addGoal = name => {
  fireEvent.click(screen.getByText('Nový cieľ'));
  fireEvent.change(screen.getByPlaceholderText('Názov cieľa (napr. Dovolenka)'), { target: { value: name } });
  fireEvent.click(screen.getByText('Pridať'));
};
const startOnSavings = async () => {
  render(<App />);
  await screen.findByText('Čistý cashflow za rok');
  nav('Sporenie');
};

test('po načítaní nič neukladá, zmenu uloží s časom posledného uloženia a ďalšiu s novým časom', async () => {
  mockLoad.mockResolvedValue(stored('t1'));
  mockSave.mockResolvedValueOnce('t2').mockResolvedValueOnce('t3');
  await startOnSavings();
  await wait(1200);
  expect(mockSave).not.toHaveBeenCalled();

  addGoal('Auto');
  await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1), { timeout: 3000 });
  expect(mockSave.mock.calls[0][4]).toBe('t1');

  addGoal('Byt');
  await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(2), { timeout: 3000 });
  expect(mockSave.mock.calls[1][4]).toBe('t2');
}, 10000);

test('ak medzitým uložilo iné zariadenie, ukáže hlášku a ďalej neukladá', async () => {
  mockLoad.mockResolvedValue(stored('t1'));
  mockSave.mockRejectedValue(new DataConflictError());
  await startOnSavings();
  addGoal('Auto');
  expect(await screen.findByText(/zmenili na inom zariadení/, {}, { timeout: 3000 })).toBeTruthy();
  expect(screen.getByText('Obnoviť stránku')).toBeTruthy();
});

test('po návrate do appky načíta novšie dáta z iného zariadenia a neuloží ich späť', async () => {
  mockLoad.mockResolvedValueOnce(stored('t1')).mockResolvedValueOnce(stored('t2', [{ id: 5, name: 'Z mobilu', targetAmount: null, allocations: [] }]));
  await startOnSavings();
  act(() => { document.dispatchEvent(new Event('visibilitychange')); });
  expect(await screen.findByText('Z mobilu')).toBeTruthy();
  await wait(1200);
  expect(mockSave).not.toHaveBeenCalled();
}, 10000);

test('pomalé načítanie po návrate neprepíše zmenu, ktorá sa medzitým uložila', async () => {
  let resolveSlowLoad;
  mockLoad.mockResolvedValueOnce(stored('t1')).mockReturnValueOnce(new Promise(resolve => { resolveSlowLoad = resolve; }));
  mockSave.mockResolvedValue('t2');
  await startOnSavings();
  act(() => { document.dispatchEvent(new Event('visibilitychange')); }); // načítanie beží, ale odpoveď mešká
  addGoal('Auto');
  await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1), { timeout: 3000 });
  await act(async () => { resolveSlowLoad(stored('t1')); }); // stará odpoveď príde až po uložení
  expect(screen.getByText('Auto')).toBeTruthy();
}, 10000);

test('po návrate do appky nenačíta nič, kým nie je uložená posledná zmena', async () => {
  mockLoad.mockResolvedValue(stored('t1'));
  mockSave.mockResolvedValue('t2');
  await startOnSavings();
  addGoal('Auto');
  act(() => { document.dispatchEvent(new Event('visibilitychange')); });
  expect(mockLoad).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Auto')).toBeTruthy();
});

test('bez internetu appka funguje ďalej, ukáže pruh a po „Skúsiť teraz“ uloží', async () => {
  mockLoad.mockResolvedValue(stored('t1'));
  mockSave.mockRejectedValueOnce(new Error('Failed to fetch')).mockResolvedValue('t2');
  await startOnSavings();
  addGoal('Auto');
  expect(await screen.findByText(/Zmeny sa nepodarilo uložiť/, {}, { timeout: 3000 })).toBeTruthy();
  expect(screen.getByText('Auto')).toBeTruthy(); // appka ostala použiteľná
  fireEvent.click(screen.getByText('Skúsiť teraz'));
  await waitFor(() => expect(screen.queryByText(/Zmeny sa nepodarilo uložiť/)).toBeNull());
  expect(mockSave).toHaveBeenCalledTimes(2);
  expect(mockSave.mock.calls[1][2].map(goal => goal.name)).toEqual(['Auto']);
}, 10000);

test('odhlásenie hneď po zmene: najprv uloží, potom odhlási', async () => {
  mockLoad.mockResolvedValue(stored('t1'));
  mockSave.mockResolvedValue('t2');
  await startOnSavings();
  addGoal('Auto');
  fireEvent.click(screen.getByLabelText('Odhlásiť sa'));
  await waitFor(() => expect(mockSignOut).toHaveBeenCalled());
  expect(mockSave).toHaveBeenCalledTimes(1);
  expect(mockSave.mock.invocationCallOrder[0]).toBeLessThan(mockSignOut.mock.invocationCallOrder[0]);
});

test('odhlásenie, keď sa zmena nedá uložiť: opýta sa a odhlási až po potvrdení', async () => {
  mockLoad.mockResolvedValue(stored('t1'));
  mockSave.mockRejectedValue(new Error('Failed to fetch'));
  await startOnSavings();
  addGoal('Auto');
  fireEvent.click(screen.getByLabelText('Odhlásiť sa'));
  expect(await screen.findByText('Zmeny nie sú uložené')).toBeTruthy();
  expect(mockSignOut).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Odhlásiť aj tak'));
  await waitFor(() => expect(mockSignOut).toHaveBeenCalled());
});

test('pri skrytí appky (zamknutie mobilu) uloží hneď, nečaká sekundu', async () => {
  mockLoad.mockResolvedValue(stored('t1'));
  mockSave.mockResolvedValue('t2');
  await startOnSavings();
  addGoal('Auto');
  const visibility = jest.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
  act(() => { document.dispatchEvent(new Event('visibilitychange')); });
  visibility.mockRestore();
  await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1), { timeout: 500 });
});

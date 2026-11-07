// Odkaz z emailu na obnovu hesla: Supabase prihlási používateľa a pošle udalosť PASSWORD_RECOVERY.
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from './App';

let mockAuthListener;
const mockUpdateUser = jest.fn();
jest.mock('./supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: callback => { mockAuthListener = callback; return { data: { subscription: { unsubscribe() {} } } }; },
      updateUser: (...args) => mockUpdateUser(...args),
      signOut: jest.fn(),
    },
  },
}));
jest.mock('./utils/db', () => ({
  loadUserData: () => Promise.resolve({ monthsData: {}, savingsGoals: [], customCategories: null }),
  saveUserData: () => Promise.resolve(),
}));
jest.mock('lucide-react', () => new Proxy({}, { get: (_, name) => () => <i data-icon={String(name)} /> }));

test('po kliknutí na odkaz z emailu nastaví nové heslo a pokračuje do appky', async () => {
  mockUpdateUser.mockResolvedValue({ error: null });
  render(<App />);
  await screen.findByText('Prihlásiť sa', { selector: 'button[type="submit"]' });

  act(() => mockAuthListener('PASSWORD_RECOVERY', { user: { id: 'u1', email: 'jano@test.sk' } }));
  expect(await screen.findByText('Nastav nové heslo')).toBeTruthy();

  fireEvent.change(screen.getByLabelText('Nové heslo'), { target: { value: 'tajne123' } });
  fireEvent.change(screen.getByLabelText('Zopakuj heslo'), { target: { value: 'tajne123' } });
  fireEvent.click(screen.getByText('Uložiť heslo'));

  expect(await screen.findByText('Čistý cashflow za rok')).toBeTruthy();
  expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'tajne123' });
});

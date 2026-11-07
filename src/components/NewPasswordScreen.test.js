import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NewPasswordScreen from './NewPasswordScreen';

const mockUpdateUser = jest.fn();
jest.mock('../supabaseClient', () => ({
  supabase: { auth: { updateUser: (...args) => mockUpdateUser(...args), signOut: jest.fn() } },
}));

beforeEach(() => mockUpdateUser.mockReset());

const fill = (password, repeat) => {
  fireEvent.change(screen.getByLabelText('Nové heslo'), { target: { value: password } });
  fireEvent.change(screen.getByLabelText('Zopakuj heslo'), { target: { value: repeat } });
  fireEvent.click(screen.getByText('Uložiť heslo'));
};

test('heslá sa nezhodujú: neuloží a ukáže chybu', () => {
  render(<NewPasswordScreen onDone={jest.fn()} />);
  fill('tajne123', 'tajne124');
  expect(screen.getByText('Heslá sa nezhodujú.')).toBeTruthy();
  expect(mockUpdateUser).not.toHaveBeenCalled();
});

test('príliš krátke heslo: neuloží', () => {
  render(<NewPasswordScreen onDone={jest.fn()} />);
  fill('abc', 'abc');
  expect(screen.getByText('Heslo musí mať aspoň 6 znakov.')).toBeTruthy();
  expect(mockUpdateUser).not.toHaveBeenCalled();
});

test('uloží nové heslo a pokračuje do appky', async () => {
  mockUpdateUser.mockResolvedValue({ error: null });
  const onDone = jest.fn();
  render(<NewPasswordScreen onDone={onDone} />);
  fill('tajne123', 'tajne123');
  await waitFor(() => expect(onDone).toHaveBeenCalled());
  expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'tajne123' });
});

test('chybu zo servera ukáže po slovensky a nepokračuje', async () => {
  mockUpdateUser.mockResolvedValue({ error: { message: 'New password should be different from the old password.' } });
  const onDone = jest.fn();
  render(<NewPasswordScreen onDone={onDone} />);
  fill('tajne123', 'tajne123');
  expect(await screen.findByText(/Heslo sa nepodarilo uložiť/)).toBeTruthy();
  expect(onDone).not.toHaveBeenCalled();
});

import { render, screen, fireEvent } from '@testing-library/react';
import AuthScreen from './AuthScreen';

const mockReset = jest.fn();
jest.mock('../supabaseClient', () => ({
  supabase: { auth: { resetPasswordForEmail: (...args) => mockReset(...args) } },
}));

beforeEach(() => mockReset.mockReset());

test('zabudnuté heslo: pošle odkaz na zadaný email a vráti sa na stránku appky', async () => {
  mockReset.mockResolvedValue({ error: null });
  render(<AuthScreen />);
  fireEvent.click(screen.getByText('Zabudnuté heslo?'));
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jano@test.sk' } });
  fireEvent.click(screen.getByText('Poslať odkaz'));
  expect(await screen.findByText(/poslali sme naň odkaz/)).toBeTruthy();
  expect(mockReset).toHaveBeenCalledWith('jano@test.sk', { redirectTo: window.location.origin });
});

test('zabudnuté heslo: chybu zo servera ukáže po slovensky', async () => {
  mockReset.mockResolvedValue({ error: { message: 'For security purposes, you can only request this after 60 seconds.' } });
  render(<AuthScreen />);
  fireEvent.click(screen.getByText('Zabudnuté heslo?'));
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jano@test.sk' } });
  fireEvent.click(screen.getByText('Poslať odkaz'));
  expect(await screen.findByText(/Odkaz sa nepodarilo poslať/)).toBeTruthy();
});

test('späť na prihlásenie', () => {
  render(<AuthScreen />);
  fireEvent.click(screen.getByText('Zabudnuté heslo?'));
  fireEvent.click(screen.getByText('Späť na prihlásenie'));
  expect(screen.getByLabelText('Heslo')).toBeTruthy();
});

test('ukáže chybu z vypršaného odkazu', () => {
  render(<AuthScreen initialError="Odkaz na obnovu hesla vypršal alebo už bol použitý. Požiadaj o nový." />);
  expect(screen.getByText(/Odkaz na obnovu hesla vypršal/)).toBeTruthy();
});

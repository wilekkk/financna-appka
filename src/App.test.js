import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the loading state', () => {
  render(<App />);
  expect(screen.getByText('Načítava...')).toBeInTheDocument();
});

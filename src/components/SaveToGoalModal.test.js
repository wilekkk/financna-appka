import { render, screen } from '@testing-library/react';
import SaveToGoalModal from './SaveToGoalModal';

jest.mock('lucide-react', () => new Proxy({}, { get: (_, name) => () => <i data-icon={String(name)} /> }));

test('pri cieli ukazuje, koľko v ňom je teraz (vklady mínus výbery a presuny), nie súčet všetkých vkladov', () => {
  const goal = {
    id: 1, name: 'Dovolenka', targetAmount: 1000,
    allocations: [{ id: 1, initial: true, amount: 500 }, { id: 2, store: 'Revolut', date: '05.03.2026', amount: 200 }],
    withdrawals: [{ id: 3, store: 'Výber', date: '10.03.2026', amount: 150 }, { id: 4, transfer: true, toGoalId: 2, amount: 50 }],
  };
  render(<SaveToGoalModal transaction={{ store: 'Revolut', date: '20.03.2026', amount: -30 }} savingsAmount={30}
    goals={[goal]} onConfirm={() => {}} onCancel={() => {}} onAddGoal={() => {}} />);
  expect(screen.getByText(/z 1\s000,00\s€/).textContent.replace(/\s/g, ' ')).toBe('500,00 € z 1 000,00 €');
});

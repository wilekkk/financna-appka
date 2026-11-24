import { render, screen, fireEvent } from '@testing-library/react';
import MonthSwipeScreen from './MonthSwipeScreen';

jest.mock('lucide-react', () => new Proxy({}, { get: (_, name) => () => <i data-icon={String(name)} /> }));

const month = { key: '2026-11', label: 'November' };
const HEADER = 'Dátum spracovania,Suma,Typ,Informácia pre príjemcu,Popis\n';
const upload = text => fireEvent.change(document.querySelector('input[type="file"]'), {
  target: { files: [new File([text], 'vypis.csv', { type: 'text/csv' })] },
});
const stored = (date, store, amount, category) => ({ transaction: { id: 1, store, amount, date, typ: amount < 0 ? 'debet' : 'kredit' }, category, splits: null });

test('keď sú vo výpise transakcie, ktoré už v mesiaci sú, povie koľko a pokračuje len s novými', async () => {
  const onComplete = jest.fn();
  render(<MonthSwipeScreen month={month} existingHistory={[stored('03.11.2026', 'Billa', -12.5, 'needs')]}
    existingCreditHistory={[]} onComplete={onComplete} onBack={jest.fn()} />);
  upload(HEADER + '03.11.2026,"12,50",Debet,,Billa\n' + '05.11.2026,"100,00",Kredit,,Refund\n');

  expect(await screen.findByText('Nových: 1 transakciu')).toBeTruthy();
  expect(screen.getByText('1 transakciu z výpisu už v tomto mesiaci máš, tie preskočíme.')).toBeTruthy();
  expect(onComplete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Pokračovať'));
  // nový je len príjem, takže netreba nič triediť a mesiac sa hneď uloží
  const [history, credits] = onComplete.mock.calls[0];
  expect(history.map(h => h.transaction.store)).toEqual(['Billa']);
  expect(credits.map(h => h.transaction.store)).toEqual(['Refund']);
});

test('keď je celý výpis duplicitný, povie že nič nové nepridal a neskočí potichu na výsledky', async () => {
  const onComplete = jest.fn();
  const onBack = jest.fn();
  render(<MonthSwipeScreen month={month} existingHistory={[stored('03.11.2026', 'Billa', -12.5, 'needs')]}
    existingCreditHistory={[]} onComplete={onComplete} onBack={onBack} />);
  upload(HEADER + '03.11.2026,"12,50",Debet,,Billa\n');

  expect(await screen.findByText('Nič nové sme nepridali')).toBeTruthy();
  expect(onComplete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Späť'));
  expect(onBack).toHaveBeenCalled();
});

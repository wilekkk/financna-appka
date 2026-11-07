import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UploadZone from './UploadZone';

const upload = text => fireEvent.change(document.querySelector('input[type="file"]'), {
  target: { files: [new File([text], 'vypis.csv', { type: 'text/csv' })] },
});

test('po výbere Revolutu nahrá revolutový výpis aj s diakritikou', async () => {
  const onLoad = jest.fn();
  render(<UploadZone onLoad={onLoad} />);
  expect(screen.getByText('Nahraj CSV výpis z Tatra banky')).toBeTruthy();

  fireEvent.click(screen.getByText('Revolut'));
  expect(screen.getByText('Nahraj CSV výpis z Revolutu')).toBeTruthy();
  upload('Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance\n'
    + 'Card Payment,Current,2026-10-02 15:50:19,2026-10-03 14:37:38,Ještě Jednu,-3.21,0.00,EUR,COMPLETED,86.09\n');

  await waitFor(() => expect(onLoad).toHaveBeenCalled());
  expect(onLoad.mock.calls[0][0]).toEqual([
    { id: 1, store: 'Ještě Jednu', amount: -3.21, date: '03.10.2026', typ: 'debet' },
  ]);
});

test('pomoc so stiahnutím výpisu sa mení podľa zvolenej banky', () => {
  render(<UploadZone onLoad={jest.fn()} />);
  expect(screen.getByText('Ako stiahnuť výpis z Tatra banky?')).toBeTruthy();
  fireEvent.click(screen.getByText('Revolut'));
  expect(screen.getByText('Ako stiahnuť výpis z Revolutu?')).toBeTruthy();
});

test('pri zlej banke ukáže chybu s názvom vybranej banky', async () => {
  const onLoad = jest.fn();
  render(<UploadZone onLoad={onLoad} />);
  fireEvent.click(screen.getByText('Revolut'));
  upload('Dátum spracovania,Suma,Typ,Informácia pre príjemcu,Popis\n03.11.2026,"12,50",Debet,,Billa\n');
  expect(await screen.findByText(/Skontroluj, či je to CSV výpis z Revolutu/)).toBeTruthy();
  expect(onLoad).not.toHaveBeenCalled();
});

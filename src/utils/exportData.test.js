import { buildExport, exportFileName, downloadJson } from './exportData';

test('súbor obsahuje všetky dáta používateľa a čas exportu', () => {
  const data = {
    email: 'test@test.sk',
    monthsData: { '2026-03': { history: [{ transaction: { store: 'Lidl', amount: -10, date: '01.03.2026' } }], creditHistory: [] } },
    savingsGoals: [{ id: 1, name: 'Dovolenka', allocations: [] }],
    customCategories: [{ id: 'c1', name: 'Jedlo', type: 'expense' }],
  };
  const result = buildExport(data, new Date('2026-11-24T10:00:00Z'));
  expect(result).toEqual({ app: 'Finančná appka', exportedAt: '2026-11-24T10:00:00.000Z', ...data });
});

test('názov súboru obsahuje dnešný dátum', () => {
  expect(exportFileName(new Date(2026, 0, 5))).toBe('financna-appka-data-2026-01-05.json');
});

test('stiahnutie vytvorí súbor JSON s daným názvom', () => {
  const created = [];
  URL.createObjectURL = jest.fn(blob => { created.push(blob); return 'blob:test'; });
  URL.revokeObjectURL = jest.fn();
  const clicked = [];
  const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { clicked.push(this.download); });
  downloadJson('subor.json', { a: 1 });
  expect(created[0].type).toBe('application/json');
  expect(clicked).toEqual(['subor.json']);
  click.mockRestore();
});

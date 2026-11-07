import { generateMonths, getYearRange, shiftMonth } from './finance';

describe('generateMonths', () => {
  test('vytvorí 12 mesiacov zadaného roka', () => {
    const months = generateMonths(2025);
    expect(months).toHaveLength(12);
    expect(months[0]).toEqual({ key: '2025-01', label: 'Január' });
    expect(months[11]).toEqual({ key: '2025-12', label: 'December' });
  });
});

describe('getYearRange', () => {
  test('bez dát: aktuálny rok a jeden rok dozadu na staršie výpisy', () => {
    expect(getYearRange({}, 2027)).toEqual({ min: 2026, max: 2027 });
  });

  test('najstarší rok s dátami posunie začiatok, najviac sa dá ísť po aktuálny rok', () => {
    const monthsData = { '2026-10': {}, '2024-03': {}, '2027-01': {} };
    expect(getYearRange(monthsData, 2027)).toEqual({ min: 2023, max: 2027 });
  });
});

describe('shiftMonth', () => {
  test('posunie mesiac v rámci roka', () => {
    expect(shiftMonth('2026-10', 1)).toEqual({ key: '2026-11', label: 'November' });
    expect(shiftMonth('2026-10', -1)).toEqual({ key: '2026-09', label: 'September' });
  });

  test('prejde cez hranicu roka', () => {
    expect(shiftMonth('2026-12', 1)).toEqual({ key: '2027-01', label: 'Január' });
    expect(shiftMonth('2027-01', -1)).toEqual({ key: '2026-12', label: 'December' });
  });
});

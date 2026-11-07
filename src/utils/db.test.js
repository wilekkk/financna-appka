import { loadUserData, saveUserData, DataConflictError } from './db';

// Náhrada Supabase: zapamätá si volané metódy a vráti mockResult(), keď sa na výsledok čaká (await).
const mockCalls = [];
let mockResult;
jest.mock('../supabaseClient', () => {
  const builder = new Proxy({}, {
    get: (_, method) => method === 'then'
      ? (resolve, reject) => Promise.resolve(mockResult()).then(resolve, reject)
      : (...args) => { mockCalls.push([method, ...args]); return builder; },
  });
  return { supabase: { from: (...args) => { mockCalls.push(['from', ...args]); return builder; } } };
});

beforeEach(() => { mockCalls.length = 0; });
const called = method => mockCalls.filter(([name]) => name === method).map(([, ...args]) => args);

describe('loadUserData', () => {
  test('vráti aj čas posledného uloženia', async () => {
    mockResult = () => ({ data: { months_data: {}, savings_goals: [], custom_categories: null, updated_at: 't1' }, error: null });
    const result = await loadUserData('u1');
    expect(result.updatedAt).toBe('t1');
    expect(called('select')[0][0]).toContain('updated_at');
  });

  test('nový používateľ bez uložených dát: čas je null', async () => {
    mockResult = () => ({ data: null, error: { code: 'PGRST116' } });
    expect((await loadUserData('u1')).updatedAt).toBeNull();
  });
});

describe('saveUserData', () => {
  test('uloží, len ak sa dáta od posledného načítania nezmenili, a vráti nový čas', async () => {
    mockResult = () => ({ data: [{ updated_at: 't2' }], error: null });
    const newUpdatedAt = await saveUserData('u1', { '2026-10': {} }, [], [], 't1');
    expect(newUpdatedAt).toBe('t2');
    expect(called('update')).toHaveLength(1);
    expect(called('eq')).toEqual([['user_id', 'u1'], ['updated_at', 't1']]);
  });

  test('ak medzitým uložilo iné zariadenie, neprepíše a vyhodí DataConflictError', async () => {
    mockResult = () => ({ data: [], error: null });
    await expect(saveUserData('u1', {}, [], [], 't1')).rejects.toBeInstanceOf(DataConflictError);
  });

  test('bez známeho času (nový používateľ) uloží ako doteraz', async () => {
    mockResult = () => ({ data: { updated_at: 't1' }, error: null });
    expect(await saveUserData('u1', {}, [], [], null)).toBe('t1');
    expect(called('upsert')).toHaveLength(1);
  });

  test('chybu zo servera pošle ďalej', async () => {
    mockResult = () => ({ data: null, error: { message: 'network' } });
    await expect(saveUserData('u1', {}, [], [], 't1')).rejects.toEqual({ message: 'network' });
  });
});

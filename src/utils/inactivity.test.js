import { markActivity, isInactiveTooLong, clearActivity, INACTIVITY_LIMIT_MS } from './inactivity';

beforeEach(() => localStorage.clear());

test('limit je 1 hodina', () => {
  expect(INACTIVITY_LIMIT_MS).toBe(60 * 60 * 1000);
});

test('bez zaznamenanej aktivity nie je dôvod odhlásiť', () => {
  expect(isInactiveTooLong(Date.now())).toBe(false);
});

test('po menej ako hodine je všetko v poriadku, po viac ako hodine treba odhlásiť', () => {
  markActivity(1_000_000);
  expect(isInactiveTooLong(1_000_000 + INACTIVITY_LIMIT_MS)).toBe(false);
  expect(isInactiveTooLong(1_000_000 + INACTIVITY_LIMIT_MS + 1)).toBe(true);
});

test('po vymazaní záznamu už netreba odhlásiť', () => {
  markActivity(1_000_000);
  clearActivity();
  expect(isInactiveTooLong(1_000_000 + 2 * INACTIVITY_LIMIT_MS)).toBe(false);
});

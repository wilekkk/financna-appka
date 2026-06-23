import { THRESHOLD } from '../constants';

export function getDirection(x, y) {
  const ax = Math.abs(x), ay = Math.abs(y);
  if (ax < THRESHOLD && ay < THRESHOLD) return null;
  if (ax >= ay) return x > 0 ? 'needs' : 'wants';
  return y < 0 ? 'savings' : 'split';
}

export function getPreviewKey(x, y) {
  const ax = Math.abs(x), ay = Math.abs(y), t = THRESHOLD * 0.4;
  if (ax < t && ay < t) return null;
  if (ax >= ay) { if (x > t) return 'needs'; if (x < -t) return 'wants'; }
  else { if (y < -t) return 'savings'; if (y > t) return 'split'; }
  return null;
}

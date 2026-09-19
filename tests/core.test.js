'use strict';

const assert = require('node:assert/strict');
const { test, beforeEach } = require('node:test');

function createLocalStorageMock() {
  let store = {};
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      store = {};
    }
  };
}

globalThis.localStorage = createLocalStorageMock();

const core = require('../js/core.js');

beforeEach(() => {
  globalThis.localStorage = createLocalStorageMock();
});

const ageExamples = [
  ['2026-03-15', '2026-09-19', { months: 6, days: 4 }],
  ['2026-09-19', '2026-09-19', { months: 0, days: 0 }],
  ['2026-01-31', '2026-02-28', { months: 1, days: 0 }],
  ['2026-01-31', '2026-03-01', { months: 1, days: 1 }],
  ['2026-01-31', '2026-03-30', { months: 1, days: 30 }],
  ['2026-01-31', '2026-03-31', { months: 2, days: 0 }],
  ['2024-02-29', '2025-02-28', { months: 12, days: 0 }],
  ['2024-02-29', '2025-03-01', { months: 12, days: 1 }],
  ['2025-12-20', '2026-01-19', { months: 0, days: 30 }],
  ['2025-12-20', '2026-01-20', { months: 1, days: 0 }],
  ['2026-09-20', '2026-09-19', null]
];

for (const [birthday, today, expected] of ageExamples) {
  test(`ageParts(${birthday}, ${today})`, () => {
    assert.deepEqual(core.ageParts(birthday, today), expected);
  });
}

test('ageParts returns null for malformed birthdays', () => {
  assert.equal(core.ageParts('2026-02-30', '2026-09-19'), null);
  assert.equal(core.ageParts('abc', '2026-09-19'), null);
  assert.equal(core.ageParts('', '2026-09-19'), null);
});

test('formatAge uses no-break spaces between numbers and units', () => {
  assert.equal(core.formatAge({ months: 6, days: 4 }), '6 個月 4 天');
  assert.equal(core.formatAge({ months: 0, days: 12 }), '0 個月 12 天');
  assert.equal(core.formatAge({ months: 6, days: 0 }), '6 個月 0 天');
});

test('loadState returns defaults when nothing is stored', () => {
  assert.deepEqual(core.loadState(), { version: 1, baby: null });
});

test('loadState returns defaults when stored JSON is invalid', () => {
  globalThis.localStorage.setItem(core.STORAGE_KEY, '{not valid json');
  assert.deepEqual(core.loadState(), { version: 1, baby: null });
});

test('loadState preserves unknown top-level fields', () => {
  const stored = { version: 1, baby: null, futureFeature: { flag: true }, count: 3 };
  globalThis.localStorage.setItem(core.STORAGE_KEY, JSON.stringify(stored));
  assert.deepEqual(core.loadState(), stored);
});

test('saveState persists JSON and loadState reads it back', () => {
  const state = { version: 1, baby: { name: '小芒果', birthday: '2026-03-15' } };
  assert.equal(core.saveState(state), true);
  assert.deepEqual(core.loadState(), state);
});

test('saveState returns false when localStorage.setItem throws', () => {
  globalThis.localStorage.setItem = () => {
    throw new Error('storage disabled');
  };
  assert.equal(core.saveState({ version: 1, baby: null }), false);
});

'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');

const core = require('../js/core.js');

const r1 = { id: 'r1', date: '2026-09-18', time: '10:00', createdAt: '2026-09-18T10:00:00.000Z' };
const r2 = { id: 'r2', date: '2026-09-19', time: '08:00', createdAt: '2026-09-19T08:00:00.000Z' };
const r3 = { id: 'r3', date: '2026-09-19', time: '08:00', createdAt: '2026-09-19T08:00:01.000Z' };
const r4 = { id: 'r4', date: '2026-09-19', time: '12:00', createdAt: '2026-09-19T12:00:00.000Z' };

test('sortRecords orders by date desc, then time desc, then createdAt desc', () => {
  const sorted = core.sortRecords([r1, r2, r3, r4]);
  assert.deepEqual(sorted.map((r) => r.id), ['r4', 'r3', 'r2', 'r1']);
});

test('sortRecords returns a new array and does not mutate the input', () => {
  const input = [r1, r4];
  const sorted = core.sortRecords(input);
  assert.notEqual(sorted, input);
  assert.deepEqual(input.map((r) => r.id), ['r1', 'r4']);
});

test('groupRecordsByDate groups sorted records by date, newest date first', () => {
  const groups = core.groupRecordsByDate([r1, r2, r3, r4]);
  assert.deepEqual(groups.map((g) => g.date), ['2026-09-19', '2026-09-18']);
  assert.deepEqual(groups[0].records.map((r) => r.id), ['r4', 'r3', 'r2']);
  assert.deepEqual(groups[1].records.map((r) => r.id), ['r1']);
});

test('groupRecordsByDate returns an empty array for no records', () => {
  assert.deepEqual(core.groupRecordsByDate([]), []);
});

// The instructions accompanying this task deliberately paired 2026-09-17 with
// the wrong weekday character, as a check that weekdays here are verified
// with Intl rather than copied. Actual weekdays (confirmed via
// Intl.DateTimeFormat('zh-TW', { weekday: 'narrow', timeZone: 'UTC' })):
// 2026-09-19 六, 2026-09-18 五, 2026-09-17 四, 2025-12-31 三.
test('formatDateHeading: today', () => {
  assert.deepEqual(core.formatDateHeading('2026-09-19', '2026-09-19'), { relative: '今天', date: '9/19（六）' });
});

test('formatDateHeading: yesterday', () => {
  assert.deepEqual(core.formatDateHeading('2026-09-18', '2026-09-19'), { relative: '昨天', date: '9/18（五）' });
});

test('formatDateHeading: same year, not today or yesterday', () => {
  assert.deepEqual(core.formatDateHeading('2026-09-17', '2026-09-19'), { relative: null, date: '9/17（四）' });
});

test('formatDateHeading: a different year prefixes the year', () => {
  assert.deepEqual(core.formatDateHeading('2025-12-31', '2026-09-19'), { relative: null, date: '2025/12/31（三）' });
});

test('recentFoods dedupes and orders by newest record first, preserving in-record order', () => {
  const records = [
    { id: 'a', date: '2026-09-18', time: '08:00', createdAt: '2026-09-18T08:00:00.000Z', foods: ['蘋果', '香蕉'] },
    { id: 'b', date: '2026-09-19', time: '08:00', createdAt: '2026-09-19T08:00:00.000Z', foods: ['南瓜', '蘋果'] }
  ];
  assert.deepEqual(core.recentFoods(records), ['南瓜', '蘋果', '香蕉']);
});

test('recentFoods respects a custom limit', () => {
  const records = [
    { id: 'a', date: '2026-09-19', time: '08:00', createdAt: '2026-09-19T08:00:00.000Z', foods: ['蘋果', '香蕉'] }
  ];
  assert.deepEqual(core.recentFoods(records, 1), ['蘋果']);
});

test('recentFoods defaults the limit to 8', () => {
  const foods = ['食材1', '食材2', '食材3', '食材4', '食材5', '食材6', '食材7', '食材8', '食材9', '食材10'];
  const records = [{ id: 'a', date: '2026-09-19', time: '08:00', createdAt: '2026-09-19T08:00:00.000Z', foods }];
  assert.deepEqual(core.recentFoods(records), foods.slice(0, 8));
});

test('computeFirstFoods: a new record includes every currently-untried food', () => {
  const state = { marks: {}, records: [] };
  assert.deepEqual(core.computeFirstFoods(state, ['南瓜', '蘋果'], null), ['南瓜', '蘋果']);
});

test('computeFirstFoods: a food marked tried manually is excluded', () => {
  const state = { marks: { 蘋果: 'tried' }, records: [] };
  assert.deepEqual(core.computeFirstFoods(state, ['南瓜', '蘋果'], null), ['南瓜']);
});

test('computeFirstFoods: a food already eaten in another record is excluded', () => {
  const state = { marks: {}, records: [{ id: 'x', foods: ['香蕉'] }] };
  assert.deepEqual(core.computeFirstFoods(state, ['南瓜', '香蕉'], null), ['南瓜']);
});

test('computeFirstFoods: editing keeps kept firstFoods and evaluates newly added foods as if the record did not exist', () => {
  const existingRecord = { id: 'r1', foods: ['南瓜', '蘋果'], firstFoods: ['南瓜', '蘋果'] };
  const otherRecord = { id: 'r2', foods: ['香蕉'] };
  const state = { marks: {}, records: [existingRecord, otherRecord] };

  // 蘋果 is dropped (no longer in foods); 香蕉 is newly added but already
  // tried via otherRecord, so it's excluded; 芒果 is newly added and untried.
  const result = core.computeFirstFoods(state, ['南瓜', '香蕉', '芒果'], existingRecord);

  assert.deepEqual(result, ['南瓜', '芒果']);
});

test('computeFirstFoods: editing without changing foods returns the same firstFoods', () => {
  const existingRecord = { id: 'r1', foods: ['南瓜', '蘋果'], firstFoods: ['南瓜'] };
  const state = { marks: {}, records: [existingRecord] };

  const result = core.computeFirstFoods(state, ['南瓜', '蘋果'], existingRecord);

  assert.deepEqual(result, ['南瓜']);
});

test('upsertRecord pushes a new record when the id is not present', () => {
  const state = { records: [{ id: 'a' }] };
  core.upsertRecord(state, { id: 'b' });
  assert.deepEqual(state.records.map((r) => r.id), ['a', 'b']);
});

test('upsertRecord replaces the record with the same id', () => {
  const state = { records: [{ id: 'a', foods: ['蘋果'] }] };
  core.upsertRecord(state, { id: 'a', foods: ['南瓜'] });
  assert.deepEqual(state.records, [{ id: 'a', foods: ['南瓜'] }]);
});

test('upsertRecord creates the records array when missing', () => {
  const state = {};
  core.upsertRecord(state, { id: 'a' });
  assert.deepEqual(state.records, [{ id: 'a' }]);
});

test('deleteRecord removes the record with the given id', () => {
  const state = { records: [{ id: 'a' }, { id: 'b' }] };
  core.deleteRecord(state, 'a');
  assert.deepEqual(state.records, [{ id: 'b' }]);
});

test('deleteRecord is a no-op when the id is not found', () => {
  const state = { records: [{ id: 'a' }] };
  core.deleteRecord(state, 'missing');
  assert.deepEqual(state.records, [{ id: 'a' }]);
});

test('deleteRecord handles a missing records array', () => {
  const state = {};
  core.deleteRecord(state, 'a');
  assert.deepEqual(state.records, []);
});

test('findRecord finds a record by id', () => {
  const target = { id: 'b' };
  const state = { records: [{ id: 'a' }, target] };
  assert.equal(core.findRecord(state, 'b'), target);
});

test('findRecord returns null when not found', () => {
  const state = { records: [{ id: 'a' }] };
  assert.equal(core.findRecord(state, 'missing'), null);
});

test('findRecord returns null when the records array is missing', () => {
  assert.equal(core.findRecord({}, 'a'), null);
});

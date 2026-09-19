'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const FOODS = require('../js/foods.js');

const EXPECTED_MONTHS = [4, 5, 6, 7, 8, 9, 10];
const EXPECTED_COUNTS = [34, 9, 14, 26, 12, 9, 14];

test('FOODS covers months 4-10 in order', () => {
  assert.deepEqual(FOODS.map((group) => group.month), EXPECTED_MONTHS);
});

test('FOODS item counts match the spec per month and in total', () => {
  assert.deepEqual(FOODS.map((group) => group.items.length), EXPECTED_COUNTS);
  const total = FOODS.reduce((sum, group) => sum + group.items.length, 0);
  assert.equal(total, 118);
});

test('item numbers are non-decreasing within each month', () => {
  for (const group of FOODS) {
    for (let i = 1; i < group.items.length; i++) {
      assert.ok(group.items[i][0] >= group.items[i - 1][0], `month ${group.month} item ${i} out of order`);
    }
  }
});

test('food names are unique across the whole list', () => {
  const names = FOODS.flatMap((group) => group.items.map((item) => item[1]));
  assert.equal(new Set(names).size, names.length);
});

test('month 4 starts with 1 十倍粥', () => {
  assert.deepEqual(FOODS[0].items[0], [1, '十倍粥']);
});

test('month 6 contains 38 薑', () => {
  const month6 = FOODS.find((group) => group.month === 6);
  assert.ok(month6.items.some((item) => item[0] === 38 && item[1] === '薑'));
});

test('month 7 contains 49 草莓', () => {
  const month7 = FOODS.find((group) => group.month === 7);
  assert.ok(month7.items.some((item) => item[0] === 49 && item[1] === '草莓'));
});

test('month 8 contains 72 紅棗粥', () => {
  const month8 = FOODS.find((group) => group.month === 8);
  assert.ok(month8.items.some((item) => item[0] === 72 && item[1] === '紅棗粥'));
});

test('month 10 ends with 96 柳丁', () => {
  const month10 = FOODS.find((group) => group.month === 10);
  assert.deepEqual(month10.items[month10.items.length - 1], [96, '柳丁']);
});

// Parses the "**<month> 個月（<count> 項）**：<no> <name>、..." lines out of
// SPEC.md so that document stays the single source of truth for the list,
// instead of trusting a second hand-copied version of it here.
function parseSpecFoods() {
  const specPath = path.join(__dirname, '..', 'SPEC.md');
  const lines = fs.readFileSync(specPath, 'utf8').split('\n');
  const lineRe = /^\*\*(\d+)\s*個月（(\d+)\s*項）\*\*：(.+)$/;
  const groups = [];
  for (const line of lines) {
    const match = lineRe.exec(line.trim());
    if (!match) continue;
    const month = Number(match[1]);
    const expectedCount = Number(match[2]);
    const items = match[3].split('、').map((entry) => {
      const itemMatch = /^(\d+)\s*(.+)$/.exec(entry.trim());
      return [Number(itemMatch[1]), itemMatch[2]];
    });
    assert.equal(items.length, expectedCount, `month ${month} item count in its own heading`);
    groups.push({ month, items });
  }
  return groups;
}

test('SPEC.md lists exactly 7 month sections', () => {
  assert.equal(parseSpecFoods().length, 7);
});

test('FOODS matches the ingredient list in SPEC.md exactly', () => {
  assert.deepEqual(FOODS, parseSpecFoods());
});

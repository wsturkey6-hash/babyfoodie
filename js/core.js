(function () {
  'use strict';

  const STORAGE_KEY = 'babyfoodie';
  const DEFAULT_STATE = { version: 1, baby: null, marks: {}, records: [], customFoods: [] };
  const VALID_MARKS = ['untried', 'tried', 'reaction'];

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      let parsed = raw === null ? {} : JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) parsed = {};
      const state = Object.assign({}, DEFAULT_STATE, parsed);
      // marks/records/customFoods are mutated in place by callers, so give
      // each load its own fresh container instead of sharing DEFAULT_STATE's.
      if (!parsed.marks) state.marks = {};
      if (!parsed.records) state.records = [];
      if (!parsed.customFoods) state.customFoods = [];
      return state;
    } catch (e) {
      return Object.assign({}, DEFAULT_STATE, { marks: {}, records: [], customFoods: [] });
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      return false;
    }
  }

  function todayISO(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function parseISODate(value) {
    if (typeof value !== 'string') return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (month < 1 || month > 12) return null;
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (day < 1 || day > daysInMonth) return null;
    return { year, month, day };
  }

  function ageParts(birthdayISO, todayISOString) {
    const birthday = parseISODate(birthdayISO);
    const today = parseISODate(todayISOString);
    if (!birthday || !today) return null;

    const todayMs = Date.UTC(today.year, today.month - 1, today.day);
    const birthdayMs = Date.UTC(birthday.year, birthday.month - 1, birthday.day);
    if (birthdayMs > todayMs) return null;

    // The anniversary in a given month is the birth day-of-month, clamped to
    // that month's last day when the day doesn't exist there (e.g. the 31st).
    function anniversaryMs(monthsAfter) {
      const totalMonths = (birthday.month - 1) + monthsAfter;
      const year = birthday.year + Math.floor(totalMonths / 12);
      const month = totalMonths % 12;
      const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      const day = Math.min(birthday.day, lastDay);
      return Date.UTC(year, month, day);
    }

    let months = (today.year - birthday.year) * 12 + (today.month - birthday.month);
    let anchorMs = anniversaryMs(months);
    if (anchorMs > todayMs) {
      months -= 1;
      anchorMs = anniversaryMs(months);
    }

    const days = Math.round((todayMs - anchorMs) / 86400000);
    return { months, days };
  }

  function formatAge(parts) {
    const nbsp = ' ';
    return `${parts.months}${nbsp}個月${nbsp}${parts.days}${nbsp}天`;
  }

  function foodStatus(state, name) {
    const marks = state && typeof state.marks === 'object' && state.marks !== null ? state.marks : {};
    const mark = marks[name];
    if (VALID_MARKS.includes(mark)) return mark;
    const records = state && Array.isArray(state.records) ? state.records : [];
    const tried = records.some(function (record) {
      return record && Array.isArray(record.foods) && record.foods.includes(name);
    });
    return tried ? 'tried' : 'untried';
  }

  function currentMonthGroup(ageMonths) {
    if (typeof ageMonths !== 'number' || Number.isNaN(ageMonths) || ageMonths < 4) return null;
    return Math.min(ageMonths, 10);
  }

  function renderBabyHeader(headerEl, options) {
    const baby = loadState().baby;
    if (!baby) return;
    const age = ageParts(baby.birthday, todayISO());
    if (!age) return;

    const svgNS = 'http://www.w3.org/2000/svg';
    const root = document.createElement(options.link ? 'a' : 'div');
    root.className = 'baby-card';
    if (options.link) root.setAttribute('href', 'baby.html');

    const avatar = document.createElement('span');
    avatar.className = 'baby-card__avatar';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(svgNS, 'use');
    use.setAttribute('href', 'assets/icons.svg#baby');
    svg.appendChild(use);
    avatar.appendChild(svg);

    const body = document.createElement('span');
    body.className = 'baby-card__body';
    const nameEl = document.createElement('span');
    nameEl.className = 'baby-card__name';
    nameEl.setAttribute('translate', 'no');
    nameEl.textContent = baby.name;
    const ageEl = document.createElement('span');
    ageEl.className = 'baby-card__age';
    ageEl.textContent = formatAge(age);
    body.appendChild(nameEl);
    body.appendChild(ageEl);

    root.appendChild(avatar);
    root.appendChild(body);

    if (options.link) {
      const srOnly = document.createElement('span');
      srOnly.className = 'sr-only';
      srOnly.textContent = '，修改寶寶資料';
      root.appendChild(srOnly);
    }

    headerEl.textContent = '';
    headerEl.appendChild(root);
  }

  const REACTIONS = ['紅疹', '腹瀉', '嘔吐', '便秘', '脹氣'];
  const UNITS = ['匙', 'ml', 'g'];

  function nowTime(date = new Date()) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  function parseAmount(text) {
    let trimmed = text.trim();
    trimmed = trimmed.replace(/[０-９]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
    });
    trimmed = trimmed.replace(/．/g, '.');
    if (trimmed === '') return { ok: true, value: null };
    if (!/^(\d+\.?\d*|\.\d+)$/.test(trimmed)) return { ok: false };
    const value = Number(trimmed);
    if (value <= 0 || value > 9999) return { ok: false };
    return { ok: true, value };
  }

  function newRecordId() {
    return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function sortRecords(records) {
    const sorted = records.slice();
    sorted.sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      if (a.time !== b.time) return a.time < b.time ? 1 : -1;
      if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
      return 0;
    });
    return sorted;
  }

  function groupRecordsByDate(records) {
    const sorted = sortRecords(records);
    const groups = [];
    for (const record of sorted) {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.date === record.date) {
        lastGroup.records.push(record);
      } else {
        groups.push({ date: record.date, records: [record] });
      }
    }
    return groups;
  }

  function formatDateHeading(dateISO, todayISOString) {
    const date = parseISODate(dateISO);
    const today = parseISODate(todayISOString);
    const dateMs = Date.UTC(date.year, date.month - 1, date.day);
    const todayMs = Date.UTC(today.year, today.month - 1, today.day);
    const diffDays = Math.round((todayMs - dateMs) / 86400000);

    let relative = null;
    if (diffDays === 0) relative = '今天';
    else if (diffDays === 1) relative = '昨天';

    const weekday = new Intl.DateTimeFormat('zh-TW', { weekday: 'narrow', timeZone: 'UTC' }).format(dateMs);
    const dayFormat = date.year === today.year
      ? { month: 'numeric', day: 'numeric', timeZone: 'UTC' }
      : { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC' };
    const dateText = `${new Intl.DateTimeFormat('zh-TW', dayFormat).format(dateMs)}（${weekday}）`;

    return { relative, date: dateText };
  }

  function recentFoods(records, limit = 8) {
    const sorted = sortRecords(records);
    const seen = new Set();
    const result = [];
    for (const record of sorted) {
      const foods = Array.isArray(record.foods) ? record.foods : [];
      for (const food of foods) {
        if (seen.has(food)) continue;
        seen.add(food);
        result.push(food);
        if (result.length >= limit) return result;
      }
    }
    return result;
  }

  // A food counts as "first time" for a new record when it currently has no
  // record and no manual mark. Editing keeps the record's own past firstFoods
  // (if the food is still on it) and re-checks only foods newly added to it,
  // as if this record didn't exist yet.
  function computeFirstFoods(state, foods, existingRecord) {
    if (!existingRecord) {
      return foods.filter(function (food) {
        return foodStatus(state, food) === 'untried';
      });
    }

    const previousFoods = Array.isArray(existingRecord.foods) ? existingRecord.foods : [];
    const previousFirstFoods = Array.isArray(existingRecord.firstFoods) ? existingRecord.firstFoods : [];
    const kept = previousFirstFoods.filter(function (food) {
      return foods.includes(food);
    });

    const records = Array.isArray(state.records) ? state.records : [];
    const stateWithoutExisting = Object.assign({}, state, {
      records: records.filter(function (record) {
        return record.id !== existingRecord.id;
      })
    });

    const addedFirstFoods = foods.filter(function (food) {
      return !previousFoods.includes(food) && foodStatus(stateWithoutExisting, food) === 'untried';
    });

    return kept.concat(addedFirstFoods);
  }

  function upsertRecord(state, record) {
    if (!Array.isArray(state.records)) state.records = [];
    const index = state.records.findIndex(function (r) {
      return r.id === record.id;
    });
    if (index === -1) state.records.push(record);
    else state.records[index] = record;
  }

  function deleteRecord(state, id) {
    if (!Array.isArray(state.records)) state.records = [];
    state.records = state.records.filter(function (r) {
      return r.id !== id;
    });
  }

  function findRecord(state, id) {
    const records = Array.isArray(state.records) ? state.records : [];
    const found = records.find(function (r) {
      return r.id === id;
    });
    return found === undefined ? null : found;
  }

  const babyfoodie = {
    STORAGE_KEY,
    loadState,
    saveState,
    todayISO,
    ageParts,
    formatAge,
    foodStatus,
    currentMonthGroup,
    renderBabyHeader,
    REACTIONS,
    UNITS,
    nowTime,
    parseAmount,
    newRecordId,
    sortRecords,
    groupRecordsByDate,
    formatDateHeading,
    recentFoods,
    computeFirstFoods,
    upsertRecord,
    deleteRecord,
    findRecord
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = babyfoodie;
  } else {
    window.babyfoodie = babyfoodie;
    // Cross-document view transitions reject `ready` when the browser skips
    // them (hidden tab, rapid navigation); nothing else handles it here.
    ['pageswap', 'pagereveal'].forEach(function (type) {
      window.addEventListener(type, function (event) {
        if (event.viewTransition) event.viewTransition.ready.catch(function () {});
      });
    });
  }
})();

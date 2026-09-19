(function () {
  'use strict';

  const STORAGE_KEY = 'babyfoodie';
  const DEFAULT_STATE = { version: 1, baby: null };

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      let parsed = raw === null ? {} : JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) parsed = {};
      return Object.assign({}, DEFAULT_STATE, parsed);
    } catch (e) {
      return Object.assign({}, DEFAULT_STATE);
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

  const babyfoodie = {
    STORAGE_KEY,
    loadState,
    saveState,
    todayISO,
    ageParts,
    formatAge,
    renderBabyHeader
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = babyfoodie;
  } else {
    window.babyfoodie = babyfoodie;
  }
})();

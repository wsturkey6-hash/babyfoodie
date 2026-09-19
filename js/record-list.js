(function () {
  'use strict';

  const svgNS = 'http://www.w3.org/2000/svg';
  const FLASH_KEY = 'babyfoodie:flash';
  const FLASH_DURATION_MS = 4000;

  function showFlash() {
    const flashEl = document.getElementById('flash');
    if (!flashEl) return;

    let message = null;
    try {
      message = sessionStorage.getItem(FLASH_KEY);
      sessionStorage.removeItem(FLASH_KEY);
    } catch (e) {
      message = null;
    }
    if (!message) return;

    requestAnimationFrame(function () {
      flashEl.textContent = message;
    });
    setTimeout(function () {
      flashEl.textContent = '';
    }, FLASH_DURATION_MS);
  }

  function buildIcon(iconId, className) {
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', className);
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(svgNS, 'use');
    use.setAttribute('href', `assets/icons.svg#${iconId}`);
    svg.appendChild(use);
    return svg;
  }

  function buildEmptyState() {
    const card = document.createElement('div');
    card.className = 'card empty-state';
    const title = document.createElement('p');
    title.className = 'empty-state__title';
    title.textContent = '還沒有紀錄';
    const text = document.createElement('p');
    text.className = 'empty-state__text';
    text.textContent = '寶寶吃了副食品之後，按上面的「新增紀錄」記下來。';
    card.appendChild(title);
    card.appendChild(text);
    return card;
  }

  function buildFoodTag(name, isFirst) {
    const span = document.createElement('span');
    span.className = 'food-tag';
    span.textContent = name;
    if (isFirst) {
      const firstEl = document.createElement('span');
      firstEl.className = 'food-tag__first';
      firstEl.textContent = '第一次';
      span.appendChild(firstEl);
    }
    return span;
  }

  function buildRow(label, text, extraClass) {
    const row = document.createElement('span');
    row.className = extraClass ? `record-card__row ${extraClass}` : 'record-card__row';
    const labelEl = document.createElement('span');
    labelEl.className = 'record-card__label';
    labelEl.textContent = label;
    row.appendChild(labelEl);
    row.appendChild(document.createTextNode(text));
    return row;
  }

  function buildReactionsRow(reactions) {
    const row = document.createElement('span');
    row.className = 'record-card__row';
    const labelEl = document.createElement('span');
    labelEl.className = 'record-card__label';
    labelEl.textContent = '反應';
    row.appendChild(labelEl);
    for (const reaction of reactions) {
      const tag = document.createElement('span');
      tag.className = 'reaction-tag';
      tag.textContent = reaction;
      row.appendChild(tag);
    }
    return row;
  }

  function buildRecordCard(record) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.className = 'record-card';
    a.href = `record.html?id=${encodeURIComponent(record.id)}`;

    const timeSpan = document.createElement('span');
    timeSpan.className = 'record-card__time';
    timeSpan.appendChild(buildIcon('clock', 'icon icon--sm'));
    timeSpan.appendChild(document.createTextNode(record.time));
    a.appendChild(timeSpan);

    const foodsSpan = document.createElement('span');
    foodsSpan.className = 'record-card__foods';
    const firstFoods = Array.isArray(record.firstFoods) ? record.firstFoods : [];
    for (const food of record.foods) {
      foodsSpan.appendChild(buildFoodTag(food, firstFoods.includes(food)));
    }
    a.appendChild(foodsSpan);

    if (record.amount) {
      a.appendChild(buildRow('份量', `${String(record.amount.value)} ${record.amount.unit}`));
    }

    if (Array.isArray(record.reactions) && record.reactions.length > 0) {
      a.appendChild(buildReactionsRow(record.reactions));
    }

    if (record.note) {
      a.appendChild(buildRow('備註', record.note, 'record-card__note'));
    }

    const srOnly = document.createElement('span');
    srOnly.className = 'sr-only';
    srOnly.textContent = '，修改這筆紀錄';
    a.appendChild(srOnly);

    li.appendChild(a);
    return li;
  }

  function buildDaySection(group, todayISOString) {
    const heading = babyfoodie.formatDateHeading(group.date, todayISOString);
    const headingId = `day-${group.date}`;

    const section = document.createElement('section');
    section.className = 'day';
    section.setAttribute('aria-labelledby', headingId);

    const h2 = document.createElement('h2');
    h2.className = 'day__title';
    h2.id = headingId;
    if (heading.relative) {
      h2.textContent = heading.relative;
      const dateSpan = document.createElement('span');
      dateSpan.className = 'day__date';
      dateSpan.textContent = heading.date;
      h2.appendChild(dateSpan);
    } else {
      h2.textContent = heading.date;
    }
    section.appendChild(h2);

    const ul = document.createElement('ul');
    ul.className = 'record-cards';
    ul.setAttribute('role', 'list');
    for (const record of group.records) {
      ul.appendChild(buildRecordCard(record));
    }
    section.appendChild(ul);

    return section;
  }

  function renderRecordList(container) {
    showFlash();

    const state = babyfoodie.loadState();
    const records = Array.isArray(state.records) ? state.records : [];

    container.textContent = '';

    if (records.length === 0) {
      container.appendChild(buildEmptyState());
      return;
    }

    const todayISOString = babyfoodie.todayISO();
    const groups = babyfoodie.groupRecordsByDate(records);
    for (const group of groups) {
      container.appendChild(buildDaySection(group, todayISOString));
    }
  }

  window.babyfoodie.renderRecordList = renderRecordList;
})();

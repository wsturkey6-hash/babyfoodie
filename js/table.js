(function () {
  'use strict';

  const svgNS = 'http://www.w3.org/2000/svg';
  const STATUS_LABELS = { untried: '未嘗試', tried: '已嘗試', reaction: '有反應' };
  const STATUS_ICONS = { tried: 'check', reaction: 'alert' };
  const SAVE_ERROR_MESSAGE = '無法儲存：瀏覽器可能關閉了本機儲存（例如無痕模式），請改用一般模式再試一次。';

  let state = null;
  let foodNumbers = new Map();

  let dialogEl = null;
  let dialogTitleEl = null;
  let statusOptionEls = [];
  let activeChip = null;
  let activeFoodName = null;

  function buildStatusIcon(iconId) {
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'icon icon--xs food-chip__icon');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(svgNS, 'use');
    use.setAttribute('href', `assets/icons.svg#${iconId}`);
    svg.appendChild(use);
    return svg;
  }

  function applyChipStatus(chip, status) {
    chip.dataset.status = status;

    const oldIcon = chip.querySelector('.food-chip__icon');
    if (oldIcon) oldIcon.remove();
    const oldSrOnly = chip.querySelector('.sr-only');
    if (oldSrOnly) oldSrOnly.remove();

    const iconId = STATUS_ICONS[status];
    if (iconId) chip.appendChild(buildStatusIcon(iconId));

    const srOnly = document.createElement('span');
    srOnly.className = 'sr-only';
    srOnly.textContent = `，${STATUS_LABELS[status]}`;
    chip.appendChild(srOnly);
  }

  function buildChip(name, no, status) {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.className = 'food-chip';
    button.type = 'button';
    button.dataset.food = name;

    if (no !== null) {
      const noEl = document.createElement('span');
      noEl.className = 'food-chip__no';
      noEl.textContent = String(no);
      button.appendChild(noEl);
    }

    const nameEl = document.createElement('span');
    nameEl.className = 'food-chip__name';
    nameEl.textContent = name;
    button.appendChild(nameEl);

    applyChipStatus(button, status);

    li.appendChild(button);
    return li;
  }

  function monthTitleText(month) {
    return `${month} 個月`;
  }

  function buildMonthSection(group, isCurrent) {
    const section = document.createElement('section');
    section.className = 'month';
    if (isCurrent) section.classList.add('month--current');
    section.id = `m${group.month}`;
    section.setAttribute('aria-labelledby', `m${group.month}-title`);

    const h2 = document.createElement('h2');
    h2.className = 'month__title';
    h2.id = `m${group.month}-title`;
    h2.appendChild(document.createTextNode(monthTitleText(group.month)));
    if (isCurrent) {
      h2.appendChild(document.createTextNode(' '));
      const sticker = document.createElement('span');
      sticker.className = 'sticker';
      sticker.textContent = '目前月齡';
      h2.appendChild(sticker);
    }
    section.appendChild(h2);

    const ul = document.createElement('ul');
    ul.className = 'food-grid';
    ul.setAttribute('role', 'list');
    for (const [no, name] of group.items) {
      ul.appendChild(buildChip(name, no, babyfoodie.foodStatus(state, name)));
    }
    section.appendChild(ul);

    return section;
  }

  function buildOtherSection() {
    const section = document.createElement('section');
    section.className = 'month';
    section.id = 'other';
    section.setAttribute('aria-labelledby', 'other-title');

    const h2 = document.createElement('h2');
    h2.className = 'month__title';
    h2.id = 'other-title';
    h2.textContent = '其他';
    section.appendChild(h2);

    const customFoods = Array.isArray(state.customFoods) ? state.customFoods : [];
    if (customFoods.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'month__empty';
      empty.textContent = '新增紀錄時輸入表上沒有的食材，會出現在這裡。';
      section.appendChild(empty);
    } else {
      const ul = document.createElement('ul');
      ul.className = 'food-grid';
      ul.setAttribute('role', 'list');
      for (const name of customFoods) {
        ul.appendChild(buildChip(name, null, babyfoodie.foodStatus(state, name)));
      }
      section.appendChild(ul);
    }

    return section;
  }

  function getCurrentMonthGroup() {
    const baby = state.baby;
    if (!baby) return null;
    const age = babyfoodie.ageParts(baby.birthday, babyfoodie.todayISO());
    if (!age) return null;
    return babyfoodie.currentMonthGroup(age.months);
  }

  function markCurrentNavLink(currentGroup) {
    const currentHref = currentGroup === null ? null : `#m${currentGroup}`;
    document.querySelectorAll('.month-jump__link').forEach(function (link) {
      link.classList.toggle('month-jump__link--current', link.getAttribute('href') === currentHref);
    });
  }

  function isBackForwardNavigation() {
    const entries = performance.getEntriesByType('navigation');
    return Boolean(entries[0] && entries[0].type === 'back_forward');
  }

  function ensureDialog() {
    if (dialogEl) return dialogEl;
    dialogEl = document.getElementById('food-sheet');
    if (!dialogEl) return null;
    dialogTitleEl = document.getElementById('food-sheet-title');
    statusOptionEls = Array.prototype.slice.call(dialogEl.querySelectorAll('.status-option'));
    dialogEl.addEventListener('click', function (event) {
      if (event.target === dialogEl) dialogEl.close('');
    });
    dialogEl.addEventListener('close', handleDialogClose);
    return dialogEl;
  }

  function openSheet(chip) {
    const dialog = ensureDialog();
    if (!dialog) return;

    const name = chip.dataset.food;
    activeChip = chip;
    activeFoodName = name;

    dialog.returnValue = '';
    const no = foodNumbers.get(name);
    dialogTitleEl.textContent = no === undefined ? name : `${no} ${name}`;

    const status = chip.dataset.status;
    let pressedOption = null;
    statusOptionEls.forEach(function (option) {
      const isPressed = option.value === status;
      option.setAttribute('aria-pressed', isPressed ? 'true' : 'false');
      if (isPressed) pressedOption = option;
    });

    dialog.showModal();
    if (pressedOption) pressedOption.focus();
  }

  function announce(text) {
    const statusEl = document.getElementById('food-table-status');
    if (!statusEl) return;
    statusEl.textContent = '';
    requestAnimationFrame(function () {
      statusEl.textContent = text;
    });
  }

  function showSaveError() {
    const errorEl = document.getElementById('food-table-error');
    if (!errorEl) return;
    errorEl.textContent = SAVE_ERROR_MESSAGE;
    errorEl.hidden = false;
  }

  function handleDialogClose() {
    const value = dialogEl.returnValue;
    const chip = activeChip;
    const name = activeFoodName;

    if (value === 'untried' || value === 'tried' || value === 'reaction') {
      const hadMark = Object.prototype.hasOwnProperty.call(state.marks, name);
      const previousMark = state.marks[name];
      state.marks[name] = value;
      if (babyfoodie.saveState(state)) {
        applyChipStatus(chip, value);
        announce(`${name}：${STATUS_LABELS[value]}`);
      } else {
        if (hadMark) state.marks[name] = previousMark;
        else delete state.marks[name];
        showSaveError();
      }
    }

    if (chip && document.activeElement !== chip) chip.focus();
  }

  function renderFoodTable(container) {
    state = babyfoodie.loadState();
    const foods = (babyfoodie.FOODS || []);

    foodNumbers = new Map();
    for (const group of foods) {
      for (const [no, name] of group.items) {
        if (!foodNumbers.has(name)) foodNumbers.set(name, no);
      }
    }

    const currentGroup = getCurrentMonthGroup();

    container.textContent = '';
    let currentSection = null;
    for (const group of foods) {
      const isCurrent = currentGroup === group.month;
      const section = buildMonthSection(group, isCurrent);
      if (isCurrent) currentSection = section;
      container.appendChild(section);
    }
    container.appendChild(buildOtherSection());

    container.addEventListener('click', function (event) {
      const chip = event.target.closest('.food-chip');
      if (chip) openSheet(chip);
    });

    markCurrentNavLink(currentGroup);

    if (currentSection && !location.hash && !isBackForwardNavigation()) {
      currentSection.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }

  window.babyfoodie.renderFoodTable = renderFoodTable;
})();

(function () {
  'use strict';

  const svgNS = 'http://www.w3.org/2000/svg';
  const STATUS_LABELS = { untried: '未嘗試', tried: '已嘗試', reaction: '有反應' };
  const STATUS_ICONS = { tried: 'check', reaction: 'alert' };
  const SAVE_ERROR_MESSAGE = '無法儲存：瀏覽器可能關閉了本機儲存（例如無痕模式），請改用一般模式再試一次。';
  const FLASH_KEY = 'babyfoodie:flash';
  const MAX_SEARCH_RESULTS = 8;
  const MAX_CUSTOM_NAME_LENGTH = 20;

  function buildIcon(iconId, className) {
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', className);
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(svgNS, 'use');
    use.setAttribute('href', `assets/icons.svg#${iconId}`);
    svg.appendChild(use);
    return svg;
  }

  function buildStatusMarkup(el, status, iconClass) {
    const iconId = STATUS_ICONS[status];
    if (iconId) el.appendChild(buildIcon(iconId, `icon icon--xs ${iconClass}`));
    const srOnly = document.createElement('span');
    srOnly.className = 'sr-only';
    srOnly.textContent = `，${STATUS_LABELS[status]}`;
    el.appendChild(srOnly);
  }

  function setFieldError(input, errorEl, message) {
    if (message) {
      errorEl.textContent = message;
      errorEl.hidden = false;
      input.setAttribute('aria-invalid', 'true');
    } else {
      errorEl.textContent = '';
      errorEl.hidden = true;
      input.removeAttribute('aria-invalid');
    }
  }

  function reviseOnInput(input, errorEl, getMessage) {
    if (errorEl.hidden) return;
    const message = getMessage();
    if (!message) setFieldError(input, errorEl, '');
  }

  function setFlash(message) {
    try {
      sessionStorage.setItem(FLASH_KEY, message);
    } catch (e) {
      // Flash message is a nicety; losing it isn't worth surfacing an error.
    }
  }

  function normalizeCustomName(text) {
    return text.trim().replace(/\s+/g, ' ');
  }

  function openDialog(dialog) {
    return new Promise(function (resolve) {
      function handleClose() {
        dialog.removeEventListener('close', handleClose);
        resolve(dialog.returnValue);
      }
      dialog.addEventListener('close', handleClose);
      dialog.returnValue = '';
      dialog.showModal();
    });
  }

  function initRecordForm(form) {
    const state = babyfoodie.loadState();
    const foods = babyfoodie.FOODS || [];

    const titleEl = document.getElementById('record-title');
    const deleteBtn = document.getElementById('record-delete');

    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    const isEdit = id !== null;
    const existingRecord = isEdit ? babyfoodie.findRecord(state, id) : null;

    if (isEdit && !existingRecord) {
      titleEl.textContent = '找不到這筆紀錄';
      document.title = '找不到這筆紀錄｜babyfoodie';
      form.hidden = true;
      deleteBtn.hidden = true;
      const notice = document.createElement('p');
      notice.className = 'empty-state__text';
      notice.textContent = '這筆紀錄可能已經刪除了。';
      titleEl.insertAdjacentElement('afterend', notice);
      return;
    }

    if (existingRecord) {
      titleEl.textContent = '修改紀錄';
      document.title = '修改紀錄｜babyfoodie';
      deleteBtn.hidden = false;
    }

    const dateInput = document.getElementById('record-date');
    const timeInput = document.getElementById('record-time');
    const dateError = document.getElementById('record-date-error');
    const timeError = document.getElementById('record-time-error');
    const pickedFoodsEl = document.getElementById('picked-foods');
    const searchInput = document.getElementById('food-search');
    const resultsEl = document.getElementById('food-search-results');
    const quickPicksEl = document.getElementById('quick-picks');
    const foodsError = document.getElementById('record-foods-error');
    const amountInput = document.getElementById('record-amount');
    const unitSelect = document.getElementById('record-unit');
    const amountError = document.getElementById('record-amount-error');
    const noteInput = document.getElementById('record-note');
    const statusEl = document.getElementById('record-status');
    const reactionSheet = document.getElementById('reaction-sheet');
    const reactionFoodsEl = document.getElementById('reaction-foods');
    const deleteSheet = document.getElementById('delete-sheet');
    const reactionCheckboxes = Array.prototype.slice.call(form.querySelectorAll('input[name="reactions"]'));

    dateInput.max = babyfoodie.todayISO();

    if (existingRecord) {
      dateInput.value = existingRecord.date;
      timeInput.value = existingRecord.time;
      amountInput.value = existingRecord.amount ? String(existingRecord.amount.value) : '';
      if (existingRecord.amount) unitSelect.value = existingRecord.amount.unit;
      noteInput.value = existingRecord.note || '';
      const reactionSet = new Set(existingRecord.reactions || []);
      reactionCheckboxes.forEach(function (checkbox) {
        checkbox.checked = reactionSet.has(checkbox.value);
      });
    } else {
      dateInput.value = babyfoodie.todayISO();
      timeInput.value = babyfoodie.nowTime();
    }

    const pickedFoods = existingRecord ? existingRecord.foods.slice() : [];
    let initialFormState = '';
    // After the first successful save, later submits (double taps, or a retry
    // after the reaction marks fail to save) update this record instead of
    // creating a duplicate.
    let savedRecord = existingRecord;

    const foodNumbers = new Map();
    for (const group of foods) {
      for (const item of group.items) {
        if (!foodNumbers.has(item[1])) foodNumbers.set(item[1], item[0]);
      }
    }

    const chipRegistry = new Map();

    function registerChip(name, el) {
      if (!chipRegistry.has(name)) chipRegistry.set(name, []);
      chipRegistry.get(name).push(el);
    }

    function syncChipsPressedState() {
      chipRegistry.forEach(function (elements, name) {
        const pressed = pickedFoods.includes(name) ? 'true' : 'false';
        elements.forEach(function (el) {
          el.setAttribute('aria-pressed', pressed);
        });
      });
    }

    function isKnownFood(name) {
      return foodNumbers.has(name) || state.customFoods.includes(name);
    }

    // ---- picked foods list ----

    function buildPickedFoodItem(name) {
      const li = document.createElement('li');
      li.className = 'picked-food';
      const nameEl = document.createElement('span');
      nameEl.className = 'picked-food__name';
      nameEl.textContent = name;
      const removeBtn = document.createElement('button');
      removeBtn.className = 'picked-food__remove';
      removeBtn.type = 'button';
      removeBtn.setAttribute('aria-label', `移除${name}`);
      removeBtn.appendChild(buildIcon('x', 'icon icon--xs'));
      removeBtn.addEventListener('click', function () {
        removeFood(name, true);
      });
      li.appendChild(nameEl);
      li.appendChild(removeBtn);
      return li;
    }

    function renderPickedFoods() {
      pickedFoodsEl.textContent = '';
      pickedFoods.forEach(function (name) {
        pickedFoodsEl.appendChild(buildPickedFoodItem(name));
      });
    }

    function focusAfterRemoval(index) {
      const buttons = pickedFoodsEl.querySelectorAll('.picked-food__remove');
      if (buttons.length === 0) {
        searchInput.focus();
      } else if (index < buttons.length) {
        buttons[index].focus();
      } else {
        buttons[buttons.length - 1].focus();
      }
    }

    function clearFoodsErrorIfShown() {
      if (foodsError.hidden) return;
      setFieldError(searchInput, foodsError, '');
    }

    function addFood(name) {
      if (pickedFoods.includes(name)) return;
      pickedFoods.push(name);
      renderPickedFoods();
      syncChipsPressedState();
      clearFoodsErrorIfShown();
      updateDirtyGuard();
    }

    function removeFood(name, moveFocus) {
      const index = pickedFoods.indexOf(name);
      if (index === -1) return;
      pickedFoods.splice(index, 1);
      renderPickedFoods();
      syncChipsPressedState();
      if (moveFocus) focusAfterRemoval(index);
      updateDirtyGuard();
    }

    function toggleFood(name) {
      if (pickedFoods.includes(name)) removeFood(name, false);
      else addFood(name);
    }

    // ---- quick picks ----

    function buildPickChip(name, no) {
      const button = document.createElement('button');
      button.className = 'pick-chip';
      button.type = 'button';
      button.setAttribute('aria-pressed', pickedFoods.includes(name) ? 'true' : 'false');
      button.dataset.food = name;

      if (no !== null) {
        const noEl = document.createElement('span');
        noEl.className = 'pick-chip__no';
        noEl.textContent = String(no);
        button.appendChild(noEl);
      }

      const nameEl = document.createElement('span');
      nameEl.className = 'pick-chip__name';
      nameEl.textContent = name;
      button.appendChild(nameEl);

      buildStatusMarkup(button, babyfoodie.foodStatus(state, name), 'pick-chip__icon');

      button.addEventListener('click', function () {
        toggleFood(name);
      });

      registerChip(name, button);
      return button;
    }

    function buildQuickPickGroup(titleId, titleText, items) {
      const fragment = document.createDocumentFragment();
      const title = document.createElement('p');
      title.className = 'quick-picks__title';
      title.id = titleId;
      title.textContent = titleText;
      fragment.appendChild(title);

      const list = document.createElement('div');
      list.className = 'quick-picks__list';
      list.setAttribute('role', 'group');
      list.setAttribute('aria-labelledby', titleId);
      for (const item of items) {
        list.appendChild(buildPickChip(item.name, item.no));
      }
      fragment.appendChild(list);
      return fragment;
    }

    function getQuickPickMonth() {
      const baby = state.baby;
      if (baby) {
        const age = babyfoodie.ageParts(baby.birthday, babyfoodie.todayISO());
        if (age) {
          const group = babyfoodie.currentMonthGroup(age.months);
          if (group !== null) return group;
        }
      }
      return 4;
    }

    function renderQuickPicks() {
      quickPicksEl.textContent = '';
      chipRegistry.clear();

      const recent = babyfoodie.recentFoods(state.records);
      if (recent.length > 0) {
        const recentItems = recent.map(function (name) {
          return { name: name, no: foodNumbers.has(name) ? foodNumbers.get(name) : null };
        });
        quickPicksEl.appendChild(buildQuickPickGroup('quick-recent-title', '最近吃過', recentItems));
      }

      const month = getQuickPickMonth();
      const monthGroup = foods.find(function (group) {
        return group.month === month;
      });
      const monthItems = monthGroup
        ? monthGroup.items.map(function (item) {
          return { name: item[1], no: item[0] };
        })
        : [];
      quickPicksEl.appendChild(buildQuickPickGroup('quick-month-title', `${month} 個月的食材`, monthItems));
    }

    // ---- food search combobox ----

    let currentOptions = [];
    let activeIndex = -1;

    function getSearchCandidates(query) {
      const results = [];
      for (const group of foods) {
        for (const item of group.items) {
          const name = item[1];
          if (pickedFoods.includes(name)) continue;
          if (name.indexOf(query) !== -1) results.push({ name: name, no: item[0] });
        }
      }
      for (const name of state.customFoods) {
        if (pickedFoods.includes(name)) continue;
        if (name.indexOf(query) !== -1) results.push({ name: name, no: null });
      }
      return results;
    }

    function buildOptionElement(option, index) {
      const li = document.createElement('li');
      li.id = `food-option-${index}`;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');

      if (option.kind === 'new') {
        li.className = 'food-option food-option--add';
        li.dataset.newFood = option.name;
        li.textContent = `新增「${option.name}」為自訂食材`;
        return li;
      }

      li.className = 'food-option';
      li.dataset.food = option.name;
      if (option.no !== null) {
        const noEl = document.createElement('span');
        noEl.className = 'food-option__no';
        noEl.textContent = String(option.no);
        li.appendChild(noEl);
      }
      const nameEl = document.createElement('span');
      nameEl.className = 'food-option__name';
      nameEl.textContent = option.name;
      li.appendChild(nameEl);
      buildStatusMarkup(li, babyfoodie.foodStatus(state, option.name), 'food-option__icon');
      return li;
    }

    function closeSearchResults() {
      currentOptions = [];
      activeIndex = -1;
      resultsEl.textContent = '';
      resultsEl.hidden = true;
      searchInput.setAttribute('aria-expanded', 'false');
      searchInput.removeAttribute('aria-activedescendant');
    }

    function renderSearchResults(rawQuery) {
      const query = normalizeCustomName(rawQuery);
      if (query === '') {
        closeSearchResults();
        return;
      }

      const matches = getSearchCandidates(query)
        .slice(0, MAX_SEARCH_RESULTS)
        .map(function (m) {
          return { kind: 'food', name: m.name, no: m.no };
        });
      if (!isKnownFood(query) && query.length >= 1 && query.length <= MAX_CUSTOM_NAME_LENGTH) {
        matches.push({ kind: 'new', name: query });
      }

      currentOptions = matches;
      activeIndex = -1;
      resultsEl.textContent = '';

      if (currentOptions.length === 0) {
        resultsEl.hidden = true;
        searchInput.setAttribute('aria-expanded', 'false');
        searchInput.removeAttribute('aria-activedescendant');
        return;
      }

      currentOptions.forEach(function (option, index) {
        resultsEl.appendChild(buildOptionElement(option, index));
      });
      resultsEl.hidden = false;
      searchInput.setAttribute('aria-expanded', 'true');
      searchInput.removeAttribute('aria-activedescendant');
    }

    function updateActiveOption() {
      const options = resultsEl.querySelectorAll('.food-option');
      options.forEach(function (el, index) {
        el.setAttribute('aria-selected', index === activeIndex ? 'true' : 'false');
      });
      if (activeIndex === -1) searchInput.removeAttribute('aria-activedescendant');
      else searchInput.setAttribute('aria-activedescendant', `food-option-${activeIndex}`);
    }

    function pickOption(option) {
      addFood(option.name);
      closeSearchResults();
      searchInput.value = '';
      searchInput.focus();
    }

    function handleEnter() {
      if (activeIndex !== -1 && currentOptions[activeIndex]) {
        pickOption(currentOptions[activeIndex]);
        return;
      }
      const query = normalizeCustomName(searchInput.value);
      if (query === '') return;
      if (isKnownFood(query)) {
        pickOption({ kind: 'food', name: query });
      } else if (query.length <= MAX_CUSTOM_NAME_LENGTH) {
        pickOption({ kind: 'new', name: query });
      }
    }

    searchInput.addEventListener('input', function () {
      renderSearchResults(searchInput.value);
    });

    searchInput.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowDown') {
        if (currentOptions.length === 0) return;
        event.preventDefault();
        activeIndex = activeIndex >= currentOptions.length - 1 ? 0 : activeIndex + 1;
        updateActiveOption();
      } else if (event.key === 'ArrowUp') {
        if (currentOptions.length === 0) return;
        event.preventDefault();
        activeIndex = activeIndex <= 0 ? currentOptions.length - 1 : activeIndex - 1;
        updateActiveOption();
      } else if (event.key === 'Enter') {
        if (event.isComposing || event.keyCode === 229) return;
        event.preventDefault();
        handleEnter();
      } else if (event.key === 'Escape') {
        closeSearchResults();
      }
    });

    searchInput.addEventListener('blur', function () {
      closeSearchResults();
    });

    resultsEl.addEventListener('pointerdown', function (event) {
      event.preventDefault();
    });

    resultsEl.addEventListener('click', function (event) {
      const optionEl = event.target.closest('.food-option');
      if (!optionEl) return;
      if (optionEl.dataset.newFood) pickOption({ kind: 'new', name: optionEl.dataset.newFood });
      else if (optionEl.dataset.food) pickOption({ kind: 'food', name: optionEl.dataset.food });
    });

    // ---- field validation ----

    function getDateError() {
      const value = dateInput.value;
      if (value === '') return '請選擇日期。';
      if (babyfoodie.ageParts(value, value) === null) return '日期格式不正確，請重新選擇。';
      if (babyfoodie.ageParts(value, babyfoodie.todayISO()) === null) return '日期不能晚於今天，請重新選擇。';
      return '';
    }

    function getTimeError() {
      const value = timeInput.value;
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return '請選擇時間。';
      return '';
    }

    function getFoodsError() {
      return pickedFoods.length === 0 ? '請至少選一個食材。' : '';
    }

    function getAmountError() {
      return babyfoodie.parseAmount(amountInput.value).ok ? '' : '份量請填數字，例如 2 或 0.5。';
    }

    dateInput.addEventListener('input', function () {
      reviseOnInput(dateInput, dateError, getDateError);
      updateDirtyGuard();
    });
    timeInput.addEventListener('input', function () {
      reviseOnInput(timeInput, timeError, getTimeError);
      updateDirtyGuard();
    });
    amountInput.addEventListener('input', function () {
      reviseOnInput(amountInput, amountError, getAmountError);
      updateDirtyGuard();
    });
    unitSelect.addEventListener('change', updateDirtyGuard);
    noteInput.addEventListener('input', updateDirtyGuard);
    reactionCheckboxes.forEach(function (checkbox) {
      checkbox.addEventListener('change', updateDirtyGuard);
    });

    // ---- unsaved changes guard ----

    function serializeFormState() {
      const reactions = reactionCheckboxes.filter(function (cb) {
        return cb.checked;
      }).map(function (cb) {
        return cb.value;
      });
      return JSON.stringify({
        date: dateInput.value,
        time: timeInput.value,
        foods: pickedFoods,
        amount: amountInput.value,
        unit: unitSelect.value,
        reactions: reactions,
        note: noteInput.value
      });
    }

    function handleBeforeUnload(event) {
      event.preventDefault();
      event.returnValue = '';
    }

    function updateDirtyGuard() {
      if (serializeFormState() !== initialFormState) {
        window.addEventListener('beforeunload', handleBeforeUnload);
      } else {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      }
    }

    function disableDirtyGuard() {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    }

    // ---- dialogs ----

    function setupBackdropClose(dialog) {
      dialog.addEventListener('click', function (event) {
        if (event.target === dialog) dialog.close('');
      });
    }
    setupBackdropClose(reactionSheet);
    setupBackdropClose(deleteSheet);

    function buildReactionFoodChip(name, checked) {
      const label = document.createElement('label');
      label.className = 'check-chip';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.name = 'reaction-food';
      checkbox.value = name;
      checkbox.checked = checked;
      const span = document.createElement('span');
      span.textContent = name;
      label.appendChild(checkbox);
      label.appendChild(span);
      return label;
    }

    if (existingRecord) {
      deleteBtn.addEventListener('click', function () {
        openDialog(deleteSheet).then(function (result) {
          if (result !== 'delete') return;
          babyfoodie.deleteRecord(state, existingRecord.id);
          if (!babyfoodie.saveState(state)) {
            statusEl.textContent = SAVE_ERROR_MESSAGE;
            return;
          }
          setFlash('已刪除紀錄');
          disableDirtyGuard();
          location.replace('index.html');
        });
      });
    }

    // ---- submit ----

    async function handleSubmit(event) {
      event.preventDefault();

      const dateMessage = getDateError();
      const timeMessage = getTimeError();
      const foodsMessage = getFoodsError();
      const amountMessage = getAmountError();

      setFieldError(dateInput, dateError, dateMessage);
      setFieldError(timeInput, timeError, timeMessage);
      setFieldError(searchInput, foodsError, foodsMessage);
      setFieldError(amountInput, amountError, amountMessage);

      const firstInvalid = [
        [dateMessage, dateInput],
        [timeMessage, timeInput],
        [foodsMessage, searchInput],
        [amountMessage, amountInput]
      ].find(function (pair) {
        return pair[0];
      });
      if (firstInvalid) {
        firstInvalid[1].focus();
        return;
      }

      const now = new Date().toISOString();
      const amountResult = babyfoodie.parseAmount(amountInput.value);
      const checkedReactions = new Set(reactionCheckboxes.filter(function (cb) {
        return cb.checked;
      }).map(function (cb) {
        return cb.value;
      }));
      const reactions = babyfoodie.REACTIONS.filter(function (name) {
        return checkedReactions.has(name);
      });

      const record = {
        id: savedRecord ? savedRecord.id : babyfoodie.newRecordId(),
        date: dateInput.value,
        time: timeInput.value,
        foods: pickedFoods.slice(),
        firstFoods: babyfoodie.computeFirstFoods(state, pickedFoods, savedRecord),
        amount: amountResult.value === null ? null : { value: amountResult.value, unit: unitSelect.value },
        reactions: reactions,
        note: noteInput.value.trim(),
        createdAt: savedRecord ? savedRecord.createdAt : now,
        updatedAt: now
      };

      pickedFoods.forEach(function (food) {
        if (!foodNumbers.has(food) && !state.customFoods.includes(food)) {
          state.customFoods.push(food);
        }
      });

      babyfoodie.upsertRecord(state, record);
      if (!babyfoodie.saveState(state)) {
        statusEl.textContent = SAVE_ERROR_MESSAGE;
        return;
      }
      savedRecord = record;

      let markedCount = 0;
      if (record.reactions.length > 0) {
        const candidates = record.foods.filter(function (food) {
          return babyfoodie.foodStatus(state, food) !== 'reaction';
        });
        if (candidates.length > 0) {
          reactionFoodsEl.textContent = '';
          candidates.forEach(function (food) {
            reactionFoodsEl.appendChild(buildReactionFoodChip(food, record.firstFoods.includes(food)));
          });

          const result = await openDialog(reactionSheet);
          if (result === 'mark') {
            const checkedFoods = Array.prototype.slice.call(reactionFoodsEl.querySelectorAll('input:checked'))
              .map(function (cb) {
                return cb.value;
              });
            checkedFoods.forEach(function (food) {
              state.marks[food] = 'reaction';
            });
            if (!babyfoodie.saveState(state)) {
              statusEl.textContent = SAVE_ERROR_MESSAGE;
              return;
            }
            markedCount = checkedFoods.length;
          }
        }
      }

      let message = existingRecord ? '已更新紀錄' : '已新增紀錄';
      if (markedCount > 0) message += `，標記了 ${markedCount} 個有反應的食材`;
      setFlash(message);
      disableDirtyGuard();
      location.replace('index.html');
    }

    form.addEventListener('submit', function (event) {
      handleSubmit(event);
    });

    // ---- initial render ----

    renderPickedFoods();
    renderQuickPicks();
    syncChipsPressedState();

    initialFormState = serializeFormState();
  }

  window.babyfoodie.initRecordForm = initRecordForm;
})();

(function () {
  'use strict';

  const form = document.getElementById('baby-form');
  const nameInput = document.getElementById('baby-name');
  const birthdayInput = document.getElementById('baby-birthday');
  const nameError = document.getElementById('baby-name-error');
  const birthdayError = document.getElementById('baby-birthday-error');
  const status = form.querySelector('.form__status');

  let statusTimer = null;
  let savedName = '';
  let savedBirthday = '';

  birthdayInput.max = babyfoodie.todayISO();

  const initialState = babyfoodie.loadState();
  if (initialState.baby) {
    savedName = initialState.baby.name || '';
    savedBirthday = initialState.baby.birthday || '';
  }
  nameInput.value = savedName;
  birthdayInput.value = savedBirthday;

  function isDirty() {
    return nameInput.value.trim() !== savedName || birthdayInput.value !== savedBirthday;
  }

  function handleBeforeUnload(event) {
    event.preventDefault();
    event.returnValue = '';
  }

  function updateDirtyGuard() {
    if (isDirty()) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    } else {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }

  updateDirtyGuard();

  function getNameError() {
    return nameInput.value.trim() === '' ? '請輸入寶寶的名字。' : '';
  }

  function getBirthdayError() {
    const value = birthdayInput.value;
    if (value === '') return '請選擇寶寶的生日。';
    if (babyfoodie.ageParts(value, value) === null) return '日期格式不正確，請重新選擇。';
    if (babyfoodie.ageParts(value, babyfoodie.todayISO()) === null) return '生日不能晚於今天，請重新選擇。';
    return '';
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

  nameInput.addEventListener('input', function () {
    reviseOnInput(nameInput, nameError, getNameError);
    updateDirtyGuard();
  });

  birthdayInput.addEventListener('input', function () {
    reviseOnInput(birthdayInput, birthdayError, getBirthdayError);
    updateDirtyGuard();
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    const nameMessage = getNameError();
    const birthdayMessage = getBirthdayError();
    setFieldError(nameInput, nameError, nameMessage);
    setFieldError(birthdayInput, birthdayError, birthdayMessage);

    if (nameMessage) {
      nameInput.focus();
      return;
    }
    if (birthdayMessage) {
      birthdayInput.focus();
      return;
    }

    const name = nameInput.value.trim();
    const birthday = birthdayInput.value;
    const state = babyfoodie.loadState();
    state.baby = { name, birthday };
    const success = babyfoodie.saveState(state);

    if (statusTimer) {
      clearTimeout(statusTimer);
      statusTimer = null;
    }

    if (success) {
      nameInput.value = name;
      status.textContent = '已儲存';
      statusTimer = setTimeout(function () {
        status.textContent = '';
        statusTimer = null;
      }, 4000);
      savedName = name;
      savedBirthday = birthday;
      updateDirtyGuard();
      babyfoodie.renderBabyHeader(document.querySelector('.baby-header'), { link: false });
    } else {
      status.textContent = '無法儲存：瀏覽器可能關閉了本機儲存（例如無痕模式），請改用一般模式再試一次。';
    }
  });
})();

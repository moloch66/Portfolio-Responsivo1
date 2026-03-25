/* =========================================
   Contact Form — Validation + Formspree
   ========================================= */

const ContactForm = (() => {
  // Set your Formspree endpoint here before deploy
  const FORMSPREE_URL = 'https://formspree.io/f/YOUR_FORM_ID';

  const MAX_MESSAGE = 1000;

  function init() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    const nameInput    = document.getElementById('field-name');
    const emailInput   = document.getElementById('field-email');
    const messageInput = document.getElementById('field-message');
    const charCounter  = document.getElementById('char-counter');
    const submitBtn    = document.getElementById('form-submit');
    const statusEl     = document.getElementById('form-status');

    // Character counter
    messageInput?.addEventListener('input', () => {
      const remaining = MAX_MESSAGE - messageInput.value.length;
      if (charCounter) {
        const i18nKey = 'contact.form.char_count';
        const label = window.I18n?.t(i18nKey) || 'characters remaining';
        charCounter.textContent = `${remaining} ${label}`;
        charCounter.classList.toggle('warn',  remaining < 100 && remaining >= 20);
        charCounter.classList.toggle('limit', remaining < 20);
      }
    });

    // Real-time validation on blur
    nameInput?.addEventListener('blur',    () => validateField(nameInput,    'name'));
    emailInput?.addEventListener('blur',   () => validateField(emailInput,   'email'));
    messageInput?.addEventListener('blur', () => validateField(messageInput, 'message'));

    // Clear error on focus
    [nameInput, emailInput, messageInput].forEach(input => {
      input?.addEventListener('focus', () => clearError(input));
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Validate all
      const nameOk    = validateField(nameInput,    'name');
      const emailOk   = validateField(emailInput,   'email');
      const messageOk = validateField(messageInput, 'message');
      if (!nameOk || !emailOk || !messageOk) return;

      // Disable form
      submitBtn.disabled = true;
      submitBtn.textContent = window.I18n?.t('contact.form.submitting') || 'Sending...';
      hideStatus();

      try {
        const res = await fetch(FORMSPREE_URL, {
          method: 'POST',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name:    nameInput.value.trim(),
            email:   emailInput.value.trim(),
            message: messageInput.value.trim(),
          }),
        });

        if (res.ok) {
          showStatus('success');
          form.reset();
          if (charCounter) charCounter.textContent = `${MAX_MESSAGE} ${window.I18n?.t('contact.form.char_count') || 'characters remaining'}`;
        } else {
          showStatus('error');
        }
      } catch {
        showStatus('error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.dataset.i18n = 'contact.form.submit';
        submitBtn.textContent = window.I18n?.t('contact.form.submit') || 'Send message';
      }
    });
  }

  function validateField(input, type) {
    const val = input.value.trim();
    let errorKey = null;

    if (type === 'name') {
      if (!val)        errorKey = 'contact.errors.name_required';
      else if (val.length < 2) errorKey = 'contact.errors.name_min';
    } else if (type === 'email') {
      if (!val)            errorKey = 'contact.errors.email_required';
      else if (!isValidEmail(val)) errorKey = 'contact.errors.email_invalid';
    } else if (type === 'message') {
      if (!val)                errorKey = 'contact.errors.message_required';
      else if (val.length < 10)  errorKey = 'contact.errors.message_min';
      else if (val.length > 1000) errorKey = 'contact.errors.message_max';
    }

    if (errorKey) {
      showFieldError(input, errorKey);
      return false;
    }

    clearError(input);
    return true;
  }

  function showFieldError(input, errorKey) {
    input.classList.add('error');
    input.setAttribute('aria-invalid', 'true');

    const errorId = input.id + '-error';
    let errorEl = document.getElementById(errorId);
    if (!errorEl) {
      errorEl = document.createElement('span');
      errorEl.id = errorId;
      errorEl.className = 'form-error';
      errorEl.setAttribute('role', 'alert');
      input.parentNode.appendChild(errorEl);
      input.setAttribute('aria-describedby', errorId);
    }

    errorEl.textContent = window.I18n?.t(errorKey) || errorKey;
    errorEl.classList.add('visible');
  }

  function clearError(input) {
    input.classList.remove('error');
    input.removeAttribute('aria-invalid');
    const errorId = input.id + '-error';
    const errorEl = document.getElementById(errorId);
    errorEl?.classList.remove('visible');
  }

  function showStatus(type) {
    const statusEl = document.getElementById('form-status');
    if (!statusEl) return;
    statusEl.className = `form-status ${type}`;
    const key = type === 'success' ? 'contact.success' : 'contact.error';
    statusEl.textContent = window.I18n?.t(key) || key;
  }

  function hideStatus() {
    const statusEl = document.getElementById('form-status');
    if (statusEl) statusEl.className = 'form-status';
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  return { init };
})();

window.ContactForm = ContactForm;

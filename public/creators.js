(() => {
  const form = document.getElementById('creator-form');
  if (!form) return;
  form.addEventListener('submit', () => {
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Sending your application…';
    document.getElementById('submit-note').textContent = 'Please keep this page open while we save your details.';
  });
  // Restore a usable form when returning from the thank-you page via Back.
  window.addEventListener('pageshow', (event) => { if (event.persisted) window.location.reload(); });
  const errors = document.getElementById('form-errors');
  if (errors) errors.focus();
})();

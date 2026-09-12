document.querySelectorAll('form[method="post"]').forEach((form) => {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(form, event.submitter).entries());
    const response = await fetch(form.getAttribute('action') ?? window.location.href, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'same-origin',
    });
    if (response.redirected) {
      window.location.assign(response.url);
      return;
    }
    document.open();
    document.write(await response.text());
    document.close();
  });
});

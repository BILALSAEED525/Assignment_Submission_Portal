// GitHub Pages demo mode.
// GitHub Pages only hosts static files, so there is no Express backend there.
// On *.github.io this file answers the two API calls in the browser instead:
// same validation rules (validate.js), submissions saved in localStorage.
// On the real Node.js server it does nothing.

(function () {
  if (!location.hostname.endsWith('github.io')) return;

  const KEY = 'demo-submissions';
  const realFetch = window.fetch.bind(window);

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch (err) {
      return [];
    }
  }

  function save(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch (err) {
      // Storage blocked (e.g. private window): the demo still validates
    }
  }

  function reply(status, body) {
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  }

  window.fetch = function (url, options = {}) {
    if (!String(url).endsWith('/api/submissions')) return realFetch(url, options);

    const method = (options.method || 'GET').toUpperCase();
    if (method === 'GET') {
      return reply(200, load().slice().reverse());
    }

    let data = {};
    try {
      data = JSON.parse(options.body || '{}');
    } catch (err) {
      data = {};
    }

    const { valid, errors } = Validator.validateSubmission(data);
    if (!valid) {
      return reply(400, { message: 'Submission rejected. Please fix the errors below.', errors });
    }

    const submission = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      name: data.name.trim(),
      regNo: data.regNo.trim(),
      title: data.title.trim(),
      url: data.url.trim(),
      submittedAt: new Date().toISOString(),
    };
    const list = load();
    list.push(submission);
    save(list);
    return reply(201, { message: 'Submission saved successfully.', submission });
  };

  // Tell visitors this is the static demo
  document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('.site-header');
    if (!header) return;
    const note = document.createElement('p');
    note.textContent = 'GitHub Pages demo: submissions are saved in this browser only.';
    note.style.cssText = 'margin-top:8px;font-size:0.9rem;opacity:0.9';
    header.appendChild(note);
  });
})();
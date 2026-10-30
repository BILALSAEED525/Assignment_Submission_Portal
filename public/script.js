// Frontend logic: validates the form, sends it to the backend, and shows the list.

const form = document.getElementById('submission-form');
const statusBox = document.getElementById('status');
const submitBtn = document.getElementById('submit-btn');
const tableBody = document.getElementById('submissions-body');
const countBadge = document.getElementById('count');

const FIELDS = ['name', 'regNo', 'title', 'url'];

// ---------- Helpers ----------

function showStatus(message, type) {
  statusBox.textContent = message;
  statusBox.className = `status ${type}`;
}

function clearErrors() {
  FIELDS.forEach((field) => {
    document.getElementById(`error-${field}`).textContent = '';
    document.getElementById(field).classList.remove('invalid');
  });
}

function showErrors(errors) {
  Object.entries(errors).forEach(([field, message]) => {
    const errorEl = document.getElementById(`error-${field}`);
    const inputEl = document.getElementById(field);
    if (errorEl) errorEl.textContent = message;
    if (inputEl) inputEl.classList.add('invalid');
  });
}

function getFormData() {
  const data = {};
  FIELDS.forEach((field) => {
    data[field] = document.getElementById(field).value.trim();
  });
  return data;
}

// Build table cells safely (textContent prevents HTML injection)
function cell(text) {
  const td = document.createElement('td');
  td.textContent = text;
  return td;
}

function formatDate(iso) {
  return new Date(iso).toLocaleString();
}

// ---------- Load and display submissions ----------

async function loadSubmissions() {
  try {
    const res = await fetch('/api/submissions');
    if (!res.ok) throw new Error('Request failed');
    const submissions = await res.json();
    renderSubmissions(submissions);
  } catch (err) {
    tableBody.innerHTML = '';
    const tr = document.createElement('tr');
    const td = cell('Could not load submissions. Is the server running?');
    td.colSpan = 5;
    td.className = 'empty';
    tr.appendChild(td);
    tableBody.appendChild(tr);
  }
}

function renderSubmissions(submissions) {
  tableBody.innerHTML = '';
  countBadge.textContent = submissions.length;

  if (submissions.length === 0) {
    const tr = document.createElement('tr');
    const td = cell('No submissions yet.');
    td.colSpan = 5;
    td.className = 'empty';
    tr.appendChild(td);
    tableBody.appendChild(tr);
    return;
  }

  submissions.forEach((s) => {
    const tr = document.createElement('tr');
    tr.appendChild(cell(s.name));
    tr.appendChild(cell(s.regNo));
    tr.appendChild(cell(s.title));

    const linkTd = document.createElement('td');
    const a = document.createElement('a');
    a.href = s.url;
    a.textContent = 'Open link';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    linkTd.appendChild(a);
    tr.appendChild(linkTd);

    tr.appendChild(cell(formatDate(s.submittedAt)));
    tableBody.appendChild(tr);
  });
}

// ---------- Submit the form ----------

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearErrors();

  const data = getFormData();

  // 1) Quick check in the browser (same rules as the backend)
  

  // 2) Send to the backend, which validates again and saves
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

  try {
    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();

    if (res.ok) {
      showStatus(result.message, 'success');
      form.reset();
      loadSubmissions();
    } else {
      showErrors(result.errors || {});
      showStatus(result.message || 'Submission rejected.', 'error');
    }
  } catch (err) {
    showStatus('Could not reach the server. Please try again.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit assignment';
  }
});

// Load the list when the page opens
loadSubmissions();

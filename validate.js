// Shared validation logic.
// Used by the backend (Node) AND by the frontend (browser), so the rules live in one place.

(function (root) {
  const REQUIRED_FIELDS = {
    name: 'Name',
    regNo: 'Registration number',
    title: 'Assignment title',
    url: 'Submission URL',
  };

  function isValidUrl(value) {
    try {
      const parsed = new URL(value);
      const okProtocol = parsed.protocol === 'http:' || parsed.protocol === 'https:';
      // Hostname must look like a real domain (e.g. github.com), not just "abc"
      const okHost = parsed.hostname.includes('.') && !parsed.hostname.endsWith('.');
      return okProtocol && okHost;
    } catch (err) {
      return false;
    }
  }

  // Returns { valid: true/false, errors: { fieldName: "message" } }
  function validateSubmission(data) {
    const errors = {};
    const input = data || {};

    for (const [field, label] of Object.entries(REQUIRED_FIELDS)) {
      const value = typeof input[field] === 'string' ? input[field].trim() : '';
      if (!value) {
        errors[field] = `${label} is required.`;
      }
    }

    // Only check the URL format if something was entered
    if (!errors.url && !isValidUrl(String(input.url).trim())) {
      errors.url = 'Please enter a valid URL starting with http:// or https://';
    }

    return { valid: Object.keys(errors).length === 0, errors };
  }

  const api = { validateSubmission, isValidUrl };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api; // Node.js
  } else {
    root.Validator = api; // Browser
  }
})(typeof window !== 'undefined' ? window : globalThis);

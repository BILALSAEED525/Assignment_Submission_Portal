// The Express app (routes only). server.js starts it.
// Keeping the app separate from server.listen() lets tests import it directly.

const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { validateSubmission } = require('./validate');
const { readSubmissions, saveSubmission } = require('./storage');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve the shared validation file to the browser too
app.get('/validate.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'validate.js'));
});

// List all saved submissions (newest first)
app.get('/api/submissions', (req, res) => {
  const submissions = readSubmissions().slice().reverse();
  res.json(submissions);
});

// Create a new submission
app.post('/api/submissions', (req, res) => {
  const { valid, errors } = validateSubmission(req.body);

  if (!valid) {
    return res.status(400).json({
      message: 'Submission rejected. Please fix the errors below.',
      errors,
    });
  }

  const submission = {
    id: crypto.randomUUID(),
    name: req.body.name.trim(),
    regNo: req.body.regNo.trim(),
    title: req.body.title.trim(),
    url: req.body.url.trim(),
    submittedAt: new Date().toISOString(),
  };

  saveSubmission(submission);

  res.status(201).json({
    message: 'Submission saved successfully.',
    submission,
  });
});

module.exports = app;

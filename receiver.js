// Local report receiver.
// Runs on YOUR computer. The CI pipeline sends the test report here (through ngrok),
// and this server saves it as test-report.json.
//
// Start it with:  node receiver.js

const express = require('express');
const fs = require('fs');
const path = require('path');

const PORT = process.env.RECEIVER_PORT || 4000;
const REPORT_FILE = path.join(__dirname, 'test-report.json');

// Optional password. If REPORT_TOKEN is set, only requests that send the same
// value in the "x-report-token" header are accepted (the ngrok URL is public).
const TOKEN = process.env.REPORT_TOKEN;

const app = express();
app.use(express.json({ limit: '1mb' }));

// Quick check that the receiver is running (open it in a browser)
app.get('/', (req, res) => {
  res.send('Report receiver is running.');
});

// The CI pipeline POSTs the test report here
app.post('/report', (req, res) => {
  if (TOKEN && req.get('x-report-token') !== TOKEN) {
    return res.status(401).json({ message: 'Invalid or missing report token.' });
  }

  const report = req.body;
  if (!report || typeof report !== 'object' || !Array.isArray(report.tests)) {
    return res.status(400).json({ message: 'Invalid report: expected JSON with a "tests" array.' });
  }

  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));

  const summary = report.summary || {};
  console.log(
    `[${new Date().toLocaleString()}] Report received: ${report.overallStatus || 'unknown'} ` +
      `(${summary.passed ?? '?'}/${summary.total ?? '?'} passed) ` +
      `commit ${report.commitSha ? report.commitSha.slice(0, 7) : '?'} -> saved to ${REPORT_FILE}`
  );

  res.json({ message: 'Report saved.' });
});

app.listen(PORT, () => {
  console.log(`Report receiver listening at http://localhost:${PORT}`);
  console.log(`Reports will be saved to ${REPORT_FILE}`);
});
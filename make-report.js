// Builds test-report.json from Jest's results + GitHub Actions information.
// The CI pipeline runs this after the tests (even when tests fail).
//
// Input:  jest-results.json  (created by: npm test -- --json --outputFile=jest-results.json)
// Output: test-report.json   (sent to the local receiver)

const fs = require('fs');
const path = require('path');

const JEST_FILE = path.join(__dirname, 'jest-results.json');
const REPORT_FILE = path.join(__dirname, 'test-report.json');

// Jest failure messages contain colour codes like "\u001b[31m". Remove them.
function stripColors(text) {
  return String(text).replace(/\u001b\[[0-9;]*m/g, '');
}

// GitHub Actions sets these environment variables automatically.
// When run on your laptop they don't exist, so we fall back to "local".
const env = process.env;
const repository = env.GITHUB_REPOSITORY || 'local';
const runId = env.GITHUB_RUN_ID || 'local';

const report = {
  repository,
  branch: env.GITHUB_REF_NAME || 'local',
  commitSha: env.GITHUB_SHA || 'local',
  pipelineRunId: runId,
  pipelineRunUrl: env.GITHUB_RUN_ID
    ? `${env.GITHUB_SERVER_URL}/${repository}/actions/runs/${runId}`
    : null,
  timestamp: new Date().toISOString(),
  tests: [],
  summary: { total: 0, passed: 0, failed: 0 },
  overallStatus: 'failed',
};

if (!fs.existsSync(JEST_FILE)) {
  // The tests never produced results (e.g. npm ci failed). Still send a report.
  report.overallStatus = 'error';
  report.error = 'jest-results.json not found: the tests did not run.';
} else {
  const jest = JSON.parse(fs.readFileSync(JEST_FILE, 'utf8'));

  for (const file of jest.testResults || []) {
    // A test file that crashed before running (e.g. syntax error) has no test results
    if ((file.assertionResults || []).length === 0 && file.message) {
      report.tests.push({
        name: path.basename(file.name),
        result: 'failed',
        failureMessage: stripColors(file.message).trim(),
      });
      continue;
    }

    for (const t of file.assertionResults) {
      report.tests.push({
        name: t.title,
        result: t.status, // "passed", "failed" or "pending"
        failureMessage:
          t.status === 'failed' ? stripColors((t.failureMessages || []).join('\n')).trim() : null,
      });
    }
  }

  const passed = report.tests.filter((t) => t.result === 'passed').length;
  const failed = report.tests.filter((t) => t.result === 'failed').length;

  report.summary = { total: report.tests.length, passed, failed };
  report.overallStatus = jest.success && failed === 0 ? 'passed' : 'failed';
}

fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));

console.log(`Report written to ${REPORT_FILE}`);
console.log(
  `Overall: ${report.overallStatus} | total ${report.summary.total}, ` +
    `passed ${report.summary.passed}, failed ${report.summary.failed}`
);
for (const t of report.tests) {
  console.log(`  ${t.result === 'passed' ? 'PASS' : 'FAIL'}  ${t.name}`);
}
# Assignment Submission Portal

[![CI](https://github.com/BILALSAEED525/Assignment_Submission_Portal/actions/workflows/ci.yml/badge.svg)](https://github.com/BILALSAEED525/Assignment_Submission_Portal/actions/workflows/ci.yml)

A simple web portal where students submit their assignment details: name, registration number, assignment title and a submission link. Every push to GitHub runs automated tests in a CI pipeline, and the test report is sent automatically to a local receiver that saves it as `test-report.json`.

## Features

- Submission form with four fields: name, registration number, assignment title and submission URL
- Backend validation: all fields are required, and the URL must be a valid `http://` or `https://` link
- Valid submissions are saved to `data/submissions.json` and listed on the page
- Automated tests (Jest + Supertest) run on every push with GitHub Actions
- A test report (repository, branch, commit, run ID, timestamp, per-test results and totals) is delivered to a local receiver for both passing and failing runs

## Tech stack

| Part | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Express |
| Storage | JSON file |
| Tests | Jest, Supertest |
| CI pipeline | GitHub Actions |
| Tunnel to localhost | ngrok |

## Project structure

```
.
├── .github/workflows/ci.yml   # CI pipeline: run tests, build report, send report
├── public/                    # Frontend
│   ├── index.html             # Form and submissions table
│   ├── script.js              # Sends the form to the API and shows the result
│   └── style.css
├── tests/
│   └── portal.test.js         # Automated test cases
├── app.js                     # Express app and API routes
├── server.js                  # Starts the portal on port 3000
├── validate.js                # Validation rules
├── storage.js                 # Reads and writes data/submissions.json
├── make-report.js             # Builds test-report.json from the Jest results
├── receiver.js                # Local report receiver on port 4000
└── package.json
```

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 22 or newer
- [Git](https://git-scm.com/)
- A free [ngrok](https://ngrok.com/) account (only needed to receive CI reports on your computer)

### Install

```bash
git clone https://github.com/BILALSAEED525/Assignment_Submission_Portal.git
cd Assignment_Submission_Portal
npm install
```

## Run the application

```bash
npm start
```

Open http://localhost:3000 in your browser.

Valid submissions are saved to `data/submissions.json`. The file is created automatically and is not committed to Git.

### API

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/submissions` | Lists all saved submissions (newest first) |
| `POST` | `/api/submissions` | Creates a submission. JSON body: `name`, `regNo`, `title`, `url`. Returns `201` if saved, or `400` with validation errors if rejected |

### Validation rules

- `name`, `regNo`, `title` and `url` are required. Empty or spaces-only values are rejected.
- `url` must start with `http://` or `https://` and contain a domain, e.g. `https://github.com/user/repo`.

## Run the tests

```bash
npm test
```

| # | Test case | Expected result |
|---|---|---|
| 1 | Complete details and a valid submission URL | Saved (`201`) and appears in the submission list |
| 2 | Missing registration number | Rejected (`400`) with a validation message |
| 3 | Invalid submission URL | Rejected (`400`) and not saved |

The tests use a temporary data file (`tests/test-submissions.json`), so they never touch real submissions.

To build the test report locally (optional):

```bash
npm test -- --json --outputFile=jest-results.json
node make-report.js
```

Outside GitHub Actions, the repository, branch, commit and run ID fields are set to `local`.

## CI pipeline (GitHub Actions)

`.github/workflows/ci.yml` runs automatically on every push:

1. Check out the pushed revision
2. Set up Node.js 22
3. Install dependencies (`npm ci`)
4. Run the tests and save the results to `jest-results.json`. If any test fails, this step fails and the run is marked as failed.
5. Build `test-report.json` with `make-report.js`
6. Send the report to the local receiver at the `REPORT_URL` secret

Steps 5 and 6 use `if: always()`, so the report is delivered for both passing and failing runs.

## Local report receiver

A GitHub-hosted runner cannot reach your `localhost`, so the report travels through an ngrok tunnel:

```
GitHub Actions → ngrok public URL → receiver.js (localhost:4000) → test-report.json
```

### 1. Start the receiver

```bash
node receiver.js
```

It listens on http://localhost:4000 and saves every report it receives to `test-report.json` in the project folder. Keep this terminal running.

### 2. Start the tunnel

First-time setup: install ngrok and connect your account with `ngrok config add-authtoken <your-token>`.

In a second terminal:

```bash
ngrok http 4000
```

Copy the `https://...` address from the **Forwarding** line. Keep this terminal running too.

### 3. Add the GitHub secret

In the repository, go to **Settings → Secrets and variables → Actions → New repository secret**:

- **Name:** `REPORT_URL`
- **Value:** `https://<your-ngrok-domain>/report`

### 4. Check that it works

Push any commit. When the pipeline finishes, the receiver prints a line like:

```
Report received: passed (3/3 passed) commit 3a935fd -> saved to ...\test-report.json
```

To test the receiver by hand (PowerShell):

```powershell
Invoke-RestMethod -Uri http://localhost:4000/report -Method Post -ContentType 'application/json' -Body '{"tests":[],"summary":{"total":0,"passed":0,"failed":0},"overallStatus":"passed"}'
```

### Optional: protect the receiver with a token

The ngrok URL is public, so you can require a shared token:

1. Add a GitHub secret named `REPORT_TOKEN` with any secret value.
2. Start the receiver with the same value:

   ```powershell
   $env:REPORT_TOKEN="your-secret-value"; node receiver.js
   ```

Requests without the correct token are rejected with `401 Unauthorized`.

## Test report format

Example `test-report.json`:

```json
{
  "repository": "BILALSAEED525/Assignment_Submission_Portal",
  "branch": "main",
  "commitSha": "<commit SHA>",
  "pipelineRunId": "<run ID>",
  "pipelineRunUrl": "https://github.com/BILALSAEED525/Assignment_Submission_Portal/actions/runs/<run ID>",
  "timestamp": "2026-10-30T05:50:12.345Z",
  "tests": [
    {
      "name": "saves a complete submission with a valid URL and shows it in the list",
      "result": "passed",
      "failureMessage": null
    },
    {
      "name": "rejects a submission with a missing registration number",
      "result": "passed",
      "failureMessage": null
    },
    {
      "name": "rejects an invalid submission URL and does not save it",
      "result": "passed",
      "failureMessage": null
    }
  ],
  "summary": { "total": 3, "passed": 3, "failed": 0 },
  "overallStatus": "passed"
}
```

- `timestamp` is in UTC.
- For a failing test, `result` is `"failed"` and `failureMessage` contains the Jest error message.

## Troubleshooting

- **Report not received:** check that the receiver and ngrok are both running and that ngrok shows `online`. Check that the `REPORT_URL` secret ends with `/report`. Open the **Send report to local receiver** step in the Actions run to see the error.
- **`ERR_NGROK_3200`:** the ngrok endpoint is offline. Start `ngrok http 4000` again.
- **Port already in use:** another copy of the portal or receiver is running. Stop it with `Ctrl + C`, or choose another port, e.g. `$env:PORT=3001; npm start`.

## Author

M. Bilal Saeed, CSC418 DevOps, Lab Midterm
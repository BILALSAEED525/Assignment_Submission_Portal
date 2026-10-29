// Reads and writes submissions to a JSON file.
// The file location can be changed with the DATA_FILE environment variable
// (useful later for tests, so they don't touch your real data).

const fs = require('fs');
const path = require('path');

function getDataFile() {
  return process.env.DATA_FILE || path.join(__dirname, 'data', 'submissions.json');
}

function readSubmissions() {
  const file = getDataFile();
  if (!fs.existsSync(file)) return [];
  try {
    const content = fs.readFileSync(file, 'utf8');
    return content.trim() ? JSON.parse(content) : [];
  } catch (err) {
    console.error('Could not read submissions file:', err.message);
    return [];
  }
}

function saveSubmission(submission) {
  const file = getDataFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const all = readSubmissions();
  all.push(submission);
  fs.writeFileSync(file, JSON.stringify(all, null, 2));
  return submission;
}

module.exports = { readSubmissions, saveSubmission };

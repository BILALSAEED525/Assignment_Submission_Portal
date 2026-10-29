// Automated tests for the Assignment Submission Portal.
// Run with: npm test

const fs = require('fs');
const path = require('path');

// 1) Use a separate file for test data, so tests never touch the real submissions.
//    storage.js reads this environment variable.
const TEST_FILE = path.join(__dirname, 'test-submissions.json');
process.env.DATA_FILE = TEST_FILE;

const request = require('supertest');
const app = require('../app'); // the Express app, without starting the server

// A complete, valid submission that each test can reuse or modify
const validSubmission = {
  name: 'Test Student',
  regNo: 'FA23-BSE-001',
  title: 'Lab Midterm - DevOps',
  url: 'https://github.com/test-student/assignment',
};

// 2) Start every test with an empty data file
beforeEach(() => {
  fs.rmSync(TEST_FILE, { force: true });
});

// Clean up after all tests have finished
afterAll(() => {
  fs.rmSync(TEST_FILE, { force: true });
});

describe('Assignment submission portal', () => {
  // Test case 1: complete details and a valid URL
  test('saves a complete submission with a valid URL and shows it in the list', async () => {
    const res = await request(app).post('/api/submissions').send(validSubmission);

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Submission saved successfully.');

    // The submission must appear in the submission list
    const list = await request(app).get('/api/submissions');
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0]).toMatchObject(validSubmission);
  });

  // Test case 2: missing registration number
  test('rejects a submission with a missing registration number', async () => {
    const res = await request(app)
      .post('/api/submissions')
      .send({ ...validSubmission, regNo: '' });

    expect(res.status).toBe(400);
    expect(res.body.errors.regNo).toBe('Registration number is required.');

    // Nothing should have been saved
    const list = await request(app).get('/api/submissions');
    expect(list.body).toHaveLength(0);
  });

  // Test case 3: invalid submission URL
  test('rejects an invalid submission URL and does not save it', async () => {
    const res = await request(app)
      .post('/api/submissions')
      .send({ ...validSubmission, url: 'abc123' });

    expect(res.status).toBe(400);
    expect(res.body.errors.url).toBeDefined();

    // The submission must NOT be saved
    const list = await request(app).get('/api/submissions');
    expect(list.body).toHaveLength(0);
  });
});
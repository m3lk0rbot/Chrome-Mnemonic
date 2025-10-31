
# Testing — automated and manual

This file explains exactly how to run the automated test suite in `tests/` and how to perform quick manual checks after loading the extension.

## Requirements

- Node.js 16+ and npm
- Git (to clone repository)

## 1) Clone repo and install dependencies

Run all tests:

```powershell
npm test
```

Notes:
- The Jest configuration is in `package.json`. Tests run in a `jsdom` environment and use `tests/setup.js` for test fixtures and mocks.
- The AI surfaces are mocked in `tests/setup.js` to ensure deterministic output.

Run a single test file (example):

```powershell
npx jest tests/features/clustering.test.js
```

Run tests in watch mode during development:

```powershell
npm run test:watch
```

View coverage report (html):

```powershell
npm run test:coverage
# open the generated file in the coverage directory with your browser
```

## 2) Interpreting test results

- Passing: Jest reports all tests green and exit code 0.
- Failing: Jest shows failing tests with stack traces. Open the test file printed in the Jest output and inspect mocked fixtures in `tests/setup.js`.

Common fixes:
- If a test expects an AI response, ensure the mock in `tests/setup.js` includes the expected fields.
- If tests fail due to linting, run `npm run lint` and `npm run lint:fix`.

## 3) Manual smoke tests (quick after loading extension)

Follow these checks after loading the unpacked extension in Chrome (see `installation.md` for load steps):

- Check console logs for AI availability messages from `services/ai-service.js`.
- Run a natural-language query in the popup or side panel and verify that a result list or conversational reply appears (or graceful fallback if APIs are not available).
- Trigger the session summarizer flow by visiting several related pages and opening the extension's history UI to ensure a session card appears with a summary.
- Try the "Enhance with Mnemonic" right-click flow in a text area and confirm the UI shows rewrite suggestions or a graceful fallback.

## 4) Troubleshooting

- If tests fail to run because `node_modules` is missing, ensure `npm install` completes without errors.
- If Chrome UI features do not appear, confirm you loaded the correct folder in `chrome://extensions` and that DevTools console logs do not show CSP or runtime errors.

If you want, I can run `npm install` and `npm test` here and report the output. Reply to confirm and I'll execute those steps.

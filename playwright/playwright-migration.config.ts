import { defineConfig } from '@playwright/test';

/**
 * Separate config for the dealership role migration test (`npm run test:role-migration`).
 *
 * It is not part of the browser suite: it starts dealer-core alone against its own throwaway
 * database and reads MySQL, so it needs no browser, no gateway, no Vite and no seeded data. Its
 * spec lives outside `tests/` precisely so the default config (`testDir: ./tests`) never picks it
 * up and `npm test` keeps running exactly what it ran before.
 */
export default defineConfig({
  testDir: './tests-migration',
  // One worker: the whole spec shares one database and one Core process.
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  reporter: [['list']],
  outputDir: './test-results-migration',
});

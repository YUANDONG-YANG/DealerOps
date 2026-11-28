// Export the Unit 6 worksheet HTML draft to PDF with the repository's Playwright install.
// Usage (from the repository root): node CPRG-305-B/unit6/export-pdf.cjs [path/to/worksheet.html]
const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../../playwright/node_modules/playwright'));

const html = path.resolve(process.argv[2] || path.join(__dirname, 'submission', 'Unit 6 Bug Hunt Worksheet - Yuandong Yang.html'));
const pdf = html.replace(/\.html$/, '.pdf');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + html);
  await page.waitForLoadState('networkidle');
  await page.pdf({ path: pdf, format: 'Letter', printBackground: true, preferCSSPageSize: true });
  await browser.close();
  console.log(pdf);
})();

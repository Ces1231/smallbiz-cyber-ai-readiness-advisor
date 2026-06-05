const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const outputDir = path.join(__dirname, 'Pitch');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: {
      dir: outputDir,
      size: { width: 1440, height: 900 }
    }
  });

  const page = await context.newPage();

  const pause = (ms) => page.waitForTimeout(ms);

  console.log('Starting demo recording...');

  // ── 1. Land on hero ──────────────────────────────────────────────────────
  await page.goto('http://localhost:4321', { waitUntil: 'networkidle' });
  await pause(2500);

  // Slow-scroll to show hero content
  await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
  await pause(1200);
  await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
  await pause(1200);

  // ── 2. Scroll back up, click "Start Assessment" CTA ──────────────────────
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await pause(800);
  await page.click('a[href="#assessment"]');
  await pause(1000);

  // ── 3. Load Restaurant sample ─────────────────────────────────────────────
  console.log('Loading Restaurant sample...');
  await page.click('text=Restaurant');
  await pause(800);

  // Scroll to show the filled form
  await page.evaluate(() => document.getElementById('assessment').scrollIntoView({ behavior: 'smooth' }));
  await pause(600);
  await page.evaluate(() => window.scrollBy({ top: 200, behavior: 'smooth' }));
  await pause(1500);

  // ── 4. Submit form ────────────────────────────────────────────────────────
  console.log('Submitting assessment...');
  await page.click('button[type="submit"]');
  await page.waitForSelector('#results:not(.hidden)', { timeout: 6000 });
  await pause(1000);

  // ── 5. Scroll through Dashboard Results ──────────────────────────────────
  console.log('Scrolling through results...');
  await page.evaluate(() => document.getElementById('results').scrollIntoView({ behavior: 'smooth' }));
  await pause(2000);

  // ROI section
  await page.evaluate(() => window.scrollBy({ top: 500, behavior: 'smooth' }));
  await pause(1800);

  // 30/60/90 roadmap
  await page.evaluate(() => {
    const el = document.querySelector('#roadmap') || document.querySelector('.roadmap');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    else window.scrollBy({ top: 500, behavior: 'smooth' });
  });
  await pause(1800);

  // Action center
  await page.evaluate(() => window.scrollBy({ top: 600, behavior: 'smooth' }));
  await pause(1800);

  // Funding prep section
  await page.evaluate(() => {
    const el = document.querySelector('#fundingPrep') || document.querySelector('.funding-prep');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    else window.scrollBy({ top: 700, behavior: 'smooth' });
  });
  await pause(2000);

  // Document generator
  await page.evaluate(() => window.scrollBy({ top: 500, behavior: 'smooth' }));
  await pause(1500);

  // ── 6. Try Nonprofit sample ───────────────────────────────────────────────
  console.log('Switching to Nonprofit sample...');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await pause(800);
  await page.evaluate(() => document.getElementById('assessment').scrollIntoView({ behavior: 'smooth' }));
  await pause(600);
  await page.click('text=Nonprofit');
  await pause(600);
  await page.click('button[type="submit"]');
  await page.waitForSelector('#results:not(.hidden)', { timeout: 6000 });
  await pause(800);
  await page.evaluate(() => document.getElementById('results').scrollIntoView({ behavior: 'smooth' }));
  await pause(2000);
  await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
  await pause(1500);

  // ── 7. Try Online Store sample ────────────────────────────────────────────
  console.log('Switching to Online Store sample...');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await pause(600);
  await page.evaluate(() => document.getElementById('assessment').scrollIntoView({ behavior: 'smooth' }));
  await pause(500);
  await page.click('text=Online Store');
  await pause(600);
  await page.click('button[type="submit"]');
  await page.waitForSelector('#results:not(.hidden)', { timeout: 6000 });
  await pause(800);
  await page.evaluate(() => document.getElementById('results').scrollIntoView({ behavior: 'smooth' }));
  await pause(2500);

  // ── 8. End on funding prep ────────────────────────────────────────────────
  await page.evaluate(() => {
    const el = document.querySelector('#fundingPrep') || document.querySelector('.funding-prep');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    else window.scrollBy({ top: 1200, behavior: 'smooth' });
  });
  await pause(2500);

  console.log('Recording complete. Saving video...');
  const videoPath = await page.video().path();
  await context.close();
  await browser.close();

  console.log(`\nVideo saved to: ${videoPath}`);
  console.log('Rename it to: Pitch/demo_walkthrough.webm');
})();

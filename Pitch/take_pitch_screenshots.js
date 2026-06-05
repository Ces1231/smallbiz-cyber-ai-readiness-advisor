const { chromium } = require('playwright');

async function screenshot(page, filename) {
  await page.screenshot({ path: filename, fullPage: false });
  console.log(`Saved: ${filename}`);
}

async function loadAndSubmit(page, sample) {
  await page.goto('http://localhost:4321', { waitUntil: 'networkidle' });
  // Click sample profile button
  const btnMap = { restaurant: 'Restaurant', barber: 'Barber / Beauty Shop', nonprofit: 'Nonprofit', contractor: 'Contractor', online: 'Online Store' };
  await page.click(`text=${btnMap[sample]}`);
  await page.waitForTimeout(400);
  // Submit form
  await page.click('button[type="submit"]');
  await page.waitForTimeout(800);
  // Wait for results to appear
  await page.waitForSelector('#results:not(.hidden)', { timeout: 5000 });
  await page.waitForTimeout(600);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  // ── SLIDE 1: Hero / landing ──────────────────────────────────────────────
  await page.goto('http://localhost:4321', { waitUntil: 'networkidle' });
  await screenshot(page, 'pitch_01_hero.png');

  // ── SLIDE 2: Business Assessment form (Restaurant pre-filled) ────────────
  await page.click('text=Restaurant');
  await page.waitForTimeout(400);
  await page.evaluate(() => document.getElementById('assessment').scrollIntoView());
  await page.waitForTimeout(300);
  await screenshot(page, 'pitch_02_assessment_form.png');

  // ── SLIDE 3: Readiness Dashboard (scores + doughnut chart) ──────────────
  await loadAndSubmit(page, 'restaurant');
  await page.evaluate(() => document.getElementById('results').scrollIntoView());
  await page.waitForTimeout(500);
  await screenshot(page, 'pitch_03_dashboard_scores.png');

  // ── SLIDE 4: Before / After & ROI ────────────────────────────────────────
  await page.evaluate(() => {
    const el = document.querySelector('.before-after') || document.querySelector('#beforeAfter') || document.querySelector('.roi-section');
    if (el) el.scrollIntoView();
    else window.scrollBy(0, 1800);
  });
  await page.waitForTimeout(400);
  await screenshot(page, 'pitch_04_before_after_roi.png');

  // ── SLIDE 5: 30/60/90-Day Roadmap ────────────────────────────────────────
  await page.evaluate(() => {
    const el = document.querySelector('#roadmap') || document.querySelector('.roadmap');
    if (el) el.scrollIntoView();
    else window.scrollBy(0, 600);
  });
  await page.waitForTimeout(400);
  await screenshot(page, 'pitch_05_roadmap.png');

  // ── SLIDE 6: Action Center / Priority Checklist ──────────────────────────
  await page.evaluate(() => {
    const el = document.querySelector('#actionCenter') || document.querySelector('.action-center');
    if (el) el.scrollIntoView();
    else window.scrollBy(0, 600);
  });
  await page.waitForTimeout(400);
  await screenshot(page, 'pitch_06_action_center.png');

  // ── SLIDE 7: Funding Prep section ────────────────────────────────────────
  await page.evaluate(() => {
    const el = document.querySelector('#fundingPrep') || document.querySelector('.funding-prep');
    if (el) el.scrollIntoView();
    else window.scrollBy(0, 800);
  });
  await page.waitForTimeout(400);
  await screenshot(page, 'pitch_07_funding_prep.png');

  // ── SLIDE 8: Nonprofit profile results (grant-readiness angle) ───────────
  await loadAndSubmit(page, 'nonprofit');
  await page.evaluate(() => document.getElementById('results').scrollIntoView());
  await page.waitForTimeout(500);
  await screenshot(page, 'pitch_08_nonprofit_dashboard.png');

  // ── SLIDE 9: Online Store results (high-readiness "after" state) ─────────
  await loadAndSubmit(page, 'online');
  await page.evaluate(() => document.getElementById('results').scrollIntoView());
  await page.waitForTimeout(500);
  await screenshot(page, 'pitch_09_online_store_dashboard.png');

  // ── SLIDE 10: Full page composite ────────────────────────────────────────
  await loadAndSubmit(page, 'restaurant');
  await page.screenshot({ path: 'pitch_10_fullpage.png', fullPage: true });
  console.log('Saved: pitch_10_fullpage.png');

  await browser.close();
  console.log('\nAll pitch screenshots complete.');
})();

import puppeteer from 'puppeteer';

async function verify() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  console.log('Navigating to live GitHub Pages: https://okc33.github.io/api-apuri/ ...');
  await page.goto('https://okc33.github.io/api-apuri/', { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('#success-view', { visible: true, timeout: 15000 });

  const weatherCity = await page.$eval('#target-city-name', el => el.textContent);
  const tempCurrent = await page.$eval('#temp-current', el => el.textContent);
  const missionTitle = await page.$eval('#mission-title', el => el.textContent);

  console.log('=== GitHub Pages Verification Succeeded! ===');
  console.log('Target City:', weatherCity);
  console.log('Current Temp:', tempCurrent + '°C');
  console.log('Mission Title:', missionTitle);
  console.log('Console errors:', errors.length === 0 ? 'None (Clean!)' : errors);

  await page.screenshot({ path: 'assets/screenshots/06_live_github_pages.png', fullPage: true });
  console.log('Saved live screenshot to assets/screenshots/06_live_github_pages.png');
  await browser.close();
}

verify().catch(e => {
  console.error(e);
  process.exit(1);
});

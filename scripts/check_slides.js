import puppeteer from 'puppeteer';
import path from 'path';

async function check() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const filePath = path.resolve('slides/weather-mission-presentation.html');
  await page.goto('file:///' + filePath.replace(/\\/g, '/'));
  const count = await page.$$eval('section', els => els.length);
  console.log('Total slides in HTML:', count);

  // 各スライドの高さをチェックして720pxを超えているものがないか検査
  const overflowSlides = await page.$$eval('section', els => {
    return els.map((el, idx) => ({
      index: idx + 1,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      overflow: el.scrollHeight > el.clientHeight
    }));
  });

  console.log('Slide overflow status:');
  for (const s of overflowSlides) {
    console.log(`Slide ${s.index}: scrollHeight=${s.scrollHeight}, clientHeight=${s.clientHeight} ${s.overflow ? '⚠️ OVERFLOW!' : '✓ OK'}`);
  }

  await browser.close();
}

check().catch(console.error);

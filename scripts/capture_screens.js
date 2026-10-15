/**
 * Weather Mission - スクリーンショット自動取得スクリプト
 * Puppeteer を使って実際のアプリ動作画面を撮影し、assets/ と slides/ に保存する
 */

import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = 8124;

// 簡易静的ファイルサーバー
function startServer() {
  const server = http.createServer((req, res) => {
    let filePath = path.join(ROOT_DIR, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
    const ext = path.extname(filePath);
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml'
    };

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
      } else {
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
        res.end(content);
      }
    });
  });

  return new Promise((resolve) => {
    server.listen(PORT, () => {
      console.log(`Test server running at http://localhost:${PORT}`);
      resolve(server);
    });
  });
}

async function capture() {
  const server = await startServer();

  // 出力先ディレクトリ
  const outDir = path.join(ROOT_DIR, 'assets', 'screenshots');
  const slideImgDir = path.join(ROOT_DIR, 'slides', 'img');
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(slideImgDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    // スマホ表示 (390 x 844, dpr: 2)
    await page.setViewport({ width: 400, height: 860, deviceScaleFactor: 2 });

    console.log('Navigating to Weather Mission app...');
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });

    // 1. リアルタイムAPIデータ取得画面 (名古屋)
    console.log('Waiting for live weather data...');
    await page.waitForSelector('#success-view', { visible: true, timeout: 10000 });
    // 少し待機してフォント描画等を安定化
    await new Promise((r) => setTimeout(r, 1500));

    const shot1 = path.join(outDir, '01_live_nagoya.png');
    await page.screenshot({ path: shot1, fullPage: true });
    fs.copyFileSync(shot1, path.join(slideImgDir, 'screen_live.png'));
    console.log('Saved: 01_live_nagoya.png');

    // 2. ミッション完了ボタンをクリックした画面
    console.log('Clicking MISSION COMPLETE button...');
    await page.click('#complete-btn');
    await new Promise((r) => setTimeout(r, 500));
    // 達成履歴アコーディオンを開く
    await page.click('#history-details summary');
    await new Promise((r) => setTimeout(r, 500));

    const shot2 = path.join(outDir, '02_mission_completed.png');
    await page.screenshot({ path: shot2, fullPage: true });
    fs.copyFileSync(shot2, path.join(slideImgDir, 'screen_completed.png'));
    console.log('Saved: 02_mission_completed.png');

    // 3. DEMOシナリオ: 猛暑 (条件1)
    console.log('Switching to DEMO: heatwave...');
    await page.select('#demo-select', 'heatwave');
    await new Promise((r) => setTimeout(r, 800));

    const shot3 = path.join(outDir, '03_demo_heatwave.png');
    await page.screenshot({ path: shot3, fullPage: true });
    fs.copyFileSync(shot3, path.join(slideImgDir, 'screen_heatwave.png'));
    console.log('Saved: 03_demo_heatwave.png');

    // 4. DEMOシナリオ: 大雨・雷雨 (条件2)
    console.log('Switching to DEMO: severe_rain...');
    await page.select('#demo-select', 'severe_rain');
    await new Promise((r) => setTimeout(r, 800));

    const shot4 = path.join(outDir, '04_demo_severe_rain.png');
    await page.screenshot({ path: shot4, fullPage: true });
    fs.copyFileSync(shot4, path.join(slideImgDir, 'screen_severe_rain.png'));
    console.log('Saved: 04_demo_severe_rain.png');

    // 5. デスクトップ表示 (PC幅での見え方確認: 880x950)
    await page.setViewport({ width: 880, height: 950, deviceScaleFactor: 2 });
    await page.select('#demo-select', 'live');
    await new Promise((r) => setTimeout(r, 1000));

    const shot5 = path.join(outDir, '05_desktop_view.png');
    await page.screenshot({ path: shot5, fullPage: false });
    fs.copyFileSync(shot5, path.join(slideImgDir, 'screen_desktop.png'));
    console.log('Saved: 05_desktop_view.png');

    console.log('\nすべてのスクリーンショット撮影が正常に完了しました！');
  } catch (err) {
    console.error('スクリーンショット撮影エラー:', err);
    throw err;
  } finally {
    await browser.close();
    server.close();
  }
}

capture().catch((e) => {
  console.error(e);
  process.exit(1);
});

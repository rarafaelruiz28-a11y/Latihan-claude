// Render anim.html menjadi video (tanpa audio) lewat Playwright + ffmpeg.
// Pakai: node render.js [out.mp4] [fps] [mulai] [selesai]  atau  node render.js --stills t1,t2,...
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

(async () => {
  const args = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('file://' + path.join(__dirname, 'anim.html') + (process.env.THEME ? '#' + process.env.THEME : ''));
  await page.evaluate(() => document.fonts.ready);

  if (args[0] === '--stills') {
    fs.mkdirSync(path.join(__dirname, 'stills'), { recursive: true });
    for (const t of args[1].split(',').map(Number)) {
      const url = await page.evaluate(t => window.frame(t, 0.85), t);
      fs.writeFileSync(path.join(__dirname, 'stills', `${process.env.THEME || 'pastel'}_t${t}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
    }
    await browser.close(); return;
  }

  const out = args[0] || 'video_silent.mp4';
  const fps = Number(args[1] || 30), t0 = Number(args[2] || 0), t1 = Number(args[3] || 90);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round((t1 - t0) * fps);
  for (let i = 0; i < n; i++) {
    const url = await page.evaluate(t => window.frame(t), t0 + i / fps);
    const buf = Buffer.from(url.split(',')[1], 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 300 === 0) console.log(`frame ${i}/${n}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log('selesai:', out);
})();

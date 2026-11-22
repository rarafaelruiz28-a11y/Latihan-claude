// Render scene3d.html (Three.js/WebGL) menjadi video 1080x1920 tanpa audio.
// Pakai: node render3d.js out.mp4 [fps] [mulai] [selesai]   |   node render3d.js --stills t1,t2,...
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
(async () => {
  const args = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', e => console.log('pageerror:', e.message));
  page.on('console', m => { if (m.type() === 'error') console.log('console:', m.text()); });
  await page.goto('file://' + path.join(__dirname, 'scene3d.html'));
  await page.waitForFunction(() => window.ready === true, null, { timeout: 60000 });
  const grab = async (t, q) => Buffer.from((await page.evaluate(([t, q]) => window.frame(t, q), [t, q])).split(',')[1], 'base64');
  if (args[0] === '--stills') {
    fs.mkdirSync(path.join(__dirname, 'stills'), { recursive: true });
    for (const t of args[1].split(',').map(Number)) { const t0 = Date.now(); fs.writeFileSync(path.join(__dirname, 'stills', `t${t}.jpg`), await grab(t, 0.8)); console.log(`t=${t} ${Date.now() - t0}ms`); }
    await browser.close(); return;
  }
  const out = args[0] || 'video_silent.mp4', fps = Number(args[1] || 30), t0 = Number(args[2] || 0), t1 = Number(args[3] || 58);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round((t1 - t0) * fps), start = Date.now();
  for (let i = 0; i < n; i++) {
    const buf = await grab(t0 + i / fps, 0.9);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 150 === 0) console.log(`frame ${i}/${n} (${((Date.now() - start) / 1000).toFixed(0)}s)`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await browser.close(); console.log('selesai:', out);
})();

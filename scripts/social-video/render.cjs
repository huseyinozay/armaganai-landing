// Bir video sahnesini (scripts/social-video/<ad>/index.html) kare kare çizip MP4'e çevirir.
//
//   node scripts/social-video/render.cjs 01-tebligat                 → out/01-tebligat.mp4
//   node scripts/social-video/render.cjs 01-tebligat --stills 0,9.5   → out/01-tebligat/t-9.5.png
//   node scripts/social-video/render.cjs 01-tebligat --serve          → tarayıcıda önizleme adresi
//
// Sahne, landing kökünden küçük bir yerel sunucuyla açılır (yazı tipleri node_modules'tan,
// maskot görselleri src/assets'ten gelir). MP4 için ffmpeg gerekir (FFMPEG=/yol/ffmpeg ya da PATH).

const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { chromium } = require("playwright-core");

const ROOT = path.resolve(__dirname, "../..");
const FPS = 30;
const SIZE = { width: 1080, height: 1920 };
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".webp": "image/webp",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

function serve() {
  const server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

async function main() {
  const [name, ...rest] = process.argv.slice(2);
  if (!name) throw new Error("Kullanım: node render.cjs <sahne> [--stills t1,t2] [--serve]");
  const flag = (f) => rest.includes(f);
  const value = (f) => rest[rest.indexOf(f) + 1];

  const server = await serve();
  const url = `http://127.0.0.1:${server.address().port}/scripts/social-video/${name}/index.html`;
  if (flag("--serve")) {
    console.log(`Önizleme: ${url}  (durdurmak için Ctrl+C)`);
    return;
  }

  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: SIZE, deviceScaleFactor: 1 });
  page.on("pageerror", (err) => console.warn(`sayfa hatası: ${err.message}`));
  await page.goto(url);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  const duration = await page.evaluate(() => window.__duration);
  const outDir = path.join(__dirname, "out");
  fs.mkdirSync(outDir, { recursive: true });

  if (flag("--stills")) {
    const dir = path.join(outDir, name);
    fs.mkdirSync(dir, { recursive: true });
    for (const t of value("--stills").split(",").map(Number)) {
      await page.evaluate((s) => window.__seek(s), t);
      await page.screenshot({ path: path.join(dir, `t-${t}.png`) });
      console.log(`✓ ${path.relative(ROOT, path.join(dir, `t-${t}.png`))}`);
    }
  } else {
    const frames = Math.round(duration * FPS);
    const out = path.join(outDir, `${name}.mp4`);
    const ffmpeg = spawn(
      process.env.FFMPEG || "ffmpeg",
      [
        "-y",
        "-loglevel", "error",
        "-f", "image2pipe", "-c:v", "png", "-framerate", String(FPS), "-i", "-",
        // Sessiz ses kanalı: bazı yükleyiciler sessiz videoyu sesli bekler; müzik platformda eklenir.
        "-f", "lavfi", "-t", String(frames / FPS), "-i", "anullsrc=r=48000:cl=stereo",
        "-map", "0:v", "-map", "1:a",
        "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p",
        "-profile:v", "high", "-level", "4.2", "-r", String(FPS),
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        "-shortest",
        out,
      ],
      { stdio: ["pipe", "inherit", "inherit"] },
    );
    const done = new Promise((resolve, reject) => ffmpeg.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg ${code}`)))));
    const started = Date.now();
    for (let i = 0; i < frames; i++) {
      await page.evaluate((s) => window.__seek(s), i / FPS);
      const png = await page.screenshot({ type: "png" });
      if (!ffmpeg.stdin.write(png)) await new Promise((r) => ffmpeg.stdin.once("drain", r));
      if (i % 60 === 0) process.stdout.write(`\r${i}/${frames} kare · ${Math.round((Date.now() - started) / 1000)} sn`);
    }
    ffmpeg.stdin.end();
    await done;
    console.log(`\r✓ ${path.relative(ROOT, out)} · ${frames} kare · ${(frames / FPS).toFixed(1)} sn`);
  }
  await browser.close();
  server.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

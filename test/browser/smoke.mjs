// Browser smoke test: npm run test:browser   (needs `npm i -D playwright` and `npx playwright install chromium` once)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const lsFile = process.argv[2]; // optional: a Label Studio export to round-trip
const PORT = 5197;
const server = spawn('node', [join(root, 'scripts/serve.mjs')], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: 'ignore',
});
await new Promise((r) => setTimeout(r, 700));
const browser = await chromium.launch();
let failed = 0;
const check = async (name, fn) => {
  try {
    await fn();
    console.log('ok   -', name);
  } catch (e) {
    failed++;
    console.log('FAIL -', name, '\n      ', e.message);
  }
};
const { register } = await import('tsx/esm/api');
register();
const node = await import(join(root, 'src/node.ts'));

try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => /px ·/.test(document.querySelector('#status').textContent), null, {
    timeout: 30000,
  });
  const urls = {
    tiroDeva: 'fonts/tiro-devanagari-hindi-devanagari-400-normal.woff',
    tiroLatin: 'fonts/tiro-devanagari-hindi-latin-400-normal.woff',
    notoReg: 'fonts/noto-serif-devanagari-devanagari-400-normal.woff',
    notoBold: 'fonts/noto-serif-devanagari-devanagari-700-normal.woff',
  };

  await check('browser (fontkit outlines) SVG is byte-identical to the Node SVG', async () => {
    const nf = new node.Factory({ fonts: node.createFontkitProvider() });
    for (const f of [
      'bhimpalasi-geet.json',
      'bihag-geet4-jhaptaal.json',
      'volta-demo.json',
      'kan-nesting-demo.json',
      'labelstudio/bhairav-geet2-ektaal.json',
    ]) {
      const src = readFileSync(join(root, 'examples', f), 'utf8');
      const want = nf.renderBandish(src).svg;
      const got = await page.evaluate(
        async ({ s, urls }) => {
          const B = window.BhatkhandeFlow;
          return new B.Factory({ fonts: await B.createBrowserFontProvider(urls) }).renderBandish(s).svg;
        },
        { s: src, urls },
      );
      assert.equal(got.length, want.length, `${f}: length ${got.length} vs ${want.length}`);
      assert.equal(got, want, `${f}: content differs`);
    }
  });

  await check('canvas text engine lays out a sane page with the same label counts', async () => {
    const src = readFileSync(join(root, 'examples/bhimpalasi-geet.json'), 'utf8');
    const r = await page.evaluate(async (s) => {
      const B = window.BhatkhandeFlow;
      await B.ensureFontsLoaded();
      const x = new B.Factory({
        fonts: B.createCanvasFontProvider(),
        style: { textMode: 'text' },
      }).renderBandish(s);
      const c = {};
      for (const l of x.labels) c[l.cls] = (c[l.cls] || 0) + 1;
      return { text: /<text /.test(x.svg), bad: /NaN|undefined/.test(x.svg), w: x.width, c };
    }, src);
    assert.ok(r.text && !r.bad);
    assert.equal(r.c.swar, 61);
    assert.equal(r.c.lyric, 42);
    assert.equal(r.c.taal_marker, 16);
  });

  if (lsFile)
    await check('Label Studio export pasted in the browser renders like the Node pipeline', async () => {
      const ls = readFileSync(lsFile, 'utf8');
      const want = node.labelStudioToBandish(JSON.parse(ls).length ? JSON.parse(ls) : [JSON.parse(ls)]);
      const nodeCounts = {};
      for (const l of new node.Factory({
        fonts: node.createFontkitProvider(),
        build: { lyricCurves: false },
      }).renderBandish(want).labels)
        nodeCounts[l.cls] = (nodeCounts[l.cls] || 0) + 1;
      const got = await page.evaluate(
        async ({ s, urls }) => {
          const B = window.BhatkhandeFlow;
          const r = new B.Factory({
            fonts: await B.createBrowserFontProvider(urls),
            build: { lyricCurves: false },
          }).renderBandish(B.toBandishInput(s));
          const c = {};
          for (const l of r.labels) c[l.cls] = (c[l.cls] || 0) + 1;
          return c;
        },
        { s: ls, urls },
      );
      assert.deepEqual(got, nodeCounts);
    });

  await check('playground: every example renders in both engines with no errors', async () => {
    const list = await page.$$eval('#example option', (o) => o.map((x) => x.value));
    assert.ok(list.length >= 10, `only ${list.length} examples`);
    for (const engine of ['fontkit', 'canvas']) {
      await page.selectOption('#engine', engine);
      for (const ex of list) {
        await page.selectOption('#example', ex);
        await page.waitForFunction(
          () => /px ·|error/.test(document.querySelector('#status').textContent),
          null,
          { timeout: 30000 },
        );
        const st = await page.textContent('#status');
        assert.ok(/px ·/.test(st), `${ex}/${engine}: ${st} ${await page.textContent('#diag')}`);
        assert.deepEqual(
          await page.$$eval('#diag li.error', (n) => n.map((x) => x.textContent)),
          [],
          `${ex}/${engine}`,
        );
      }
    }
    assert.deepEqual(errors, [], errors.join('\n'));
  });

  await check('playground: label boxes overlay + click shows matra info', async () => {
    await page.selectOption('#engine', 'fontkit');
    await page.selectOption('#example', 'bhimpalasi-geet.json');
    await page.waitForFunction(() => /px ·/.test(document.querySelector('#status').textContent));
    await page.check('#boxes');
    await page.waitForTimeout(400);
    const rects = await page.$$eval('#stage svg rect[stroke]', (n) => n.length);
    assert.ok(rects > 150, `${rects} boxes`);
    await page.locator('#stage svg g.swar path').nth(3).dispatchEvent('click');
    assert.match(await page.textContent('#pick'), /matra_number=\d+/);
    mkdirSync(join(root, 'out'), { recursive: true });
    await page.screenshot({ path: join(root, 'out/playground.png') });
  });
} finally {
  await browser.close();
  server.kill();
}
process.exit(failed ? 1 : 0);

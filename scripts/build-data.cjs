// Downloads the bike network for each city from OpenStreetMap (Overpass API),
// classifies every way, and writes a compact data/<city>.json for the map page.
// Run with: node scripts/build-data.cjs [city ...] [--missing]   (Node 18+, no dependencies)
// --missing only builds cities that have no data file yet.
const fs = require('fs');
const path = require('path');
const { classify, query, CITIES } = require('../classify.js');

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];
// Only the tags the page shows in its popups
const KEEP = ['name','highway','cycleway','cycleway:both','cycleway:left','cycleway:right',
  'cycleway:right:separation','cycleway:left:separation','cycleway:both:buffer',
  'bicycle','foot','segregated','surface','lit','oneway:bicycle'];

// Big, dense cities are fetched as a grid of smaller boxes so each request stays under Overpass limits
const TILES = { montreal: 3, quebec: 2, vancouver: 2, calgary: 2 };

async function fetchCity(key, city) {
  const n = TILES[key] || 1;
  const [s, w, N, e] = city.bbox;
  const seen = new Map();
  for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) {
    const box = [s + (N - s) * i / n, w + (e - w) * k / n, s + (N - s) * (i + 1) / n, w + (e - w) * (k + 1) / n].map(x => +x.toFixed(5));
    if (n > 1) console.log(`  tile ${i * n + k + 1}/${n * n}`);
    const j = await overpass(query(box));
    for (const el of j.elements || []) if (el.type === 'way') seen.set(el.id, el);
    if (n > 1) await sleep(5000);
  }
  return [...seen.values()];
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const round = x => Math.round(x * 1e5) / 1e5;

async function overpass(q) {
  let last;
  for (let attempt = 0; attempt < 2; attempt++) {
    for (const url of ENDPOINTS) {
      try {
        const r = await fetch(url, {
          method: 'POST',
          signal: AbortSignal.timeout(240000),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'bikemap-data-build (github.com/rajanmaghera/bikemap)' },
          body: 'data=' + encodeURIComponent(q),
        });
        if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
        return await r.json();
      } catch (e) { last = e; console.warn('  failed:', e.message); }
    }
    await sleep(30000);
  }
  throw last;
}

(async () => {
  const args = process.argv.slice(2);
  const onlyMissing = args.includes('--missing');
  let cities = args.filter(a => !a.startsWith('--'));
  if (!cities.length) cities = Object.keys(CITIES);
  if (onlyMissing) cities = cities.filter(k => !fs.existsSync(path.join(__dirname, '..', 'data', `${k}.json`)));
  if (!cities.length) { console.log('Nothing to build'); return; }
  fs.mkdirSync(path.join(__dirname, '..', 'data'), { recursive: true });
  const failed = [];
  for (const key of cities) {
    const city = CITIES[key];
    if (!city) { console.warn(`Unknown city "${key}", skipping`); failed.push(key); continue; }
    try {
      console.log(`Fetching ${city.name}…`);
      const elements = await fetchCity(key, city);
      const ways = [];
      const counts = {};
      for (const e of elements) {
        if (e.type !== 'way' || !e.geometry || e.geometry.length < 2) continue;
        const t = e.tags || {};
        const cat = classify(t);
        if (!cat) continue;
        const tags = {};
        for (const k of KEEP) if (t[k]) tags[k] = t[k];
        ways.push([e.id, cat, tags, e.geometry.map(p => [round(p.lat), round(p.lon)])]);
        counts[cat] = (counts[cat] || 0) + 1;
      }
      if (ways.length < 100) throw new Error(`only ${ways.length} ways, keeping the old file`);
      const out = { city: key, generated: new Date().toISOString(), source: 'OpenStreetMap contributors, ODbL', ways };
      fs.writeFileSync(path.join(__dirname, '..', 'data', `${key}.json`), JSON.stringify(out));
      console.log(`  ${ways.length} ways`, counts);
    } catch (e) {
      console.error(`  ${city.name} failed: ${e.message}`);
      failed.push(key);
    }
    await sleep(10000); // be polite to the public Overpass servers
  }
  if (failed.length) console.warn(`Failed: ${failed.join(', ')}`);
  if (failed.length === cities.length) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });

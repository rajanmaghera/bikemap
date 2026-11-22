// Downloads the bike network for each city from OpenStreetMap (Overpass API),
// classifies every way, and writes a compact data/<city>.json for the map page.
// Run with: node scripts/build-data.cjs [city ...]   (Node 18+, no dependencies)
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

const sleep = ms => new Promise(r => setTimeout(r, ms));
const round = x => Math.round(x * 1e5) / 1e5;

async function overpass(q) {
  let last;
  for (let attempt = 0; attempt < 2; attempt++) {
    for (const url of ENDPOINTS) {
      try {
        const r = await fetch(url, {
          method: 'POST',
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
  const cities = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(CITIES);
  fs.mkdirSync(path.join(__dirname, '..', 'data'), { recursive: true });
  for (const key of cities) {
    const city = CITIES[key];
    console.log(`Fetching ${city.name}…`);
    const j = await overpass(query(city.bbox));
    const ways = [];
    const counts = {};
    for (const e of j.elements || []) {
      if (e.type !== 'way' || !e.geometry || e.geometry.length < 2) continue;
      const t = e.tags || {};
      const cat = classify(t);
      if (!cat) continue;
      const tags = {};
      for (const k of KEEP) if (t[k]) tags[k] = t[k];
      ways.push([e.id, cat, tags, e.geometry.map(p => [round(p.lat), round(p.lon)])]);
      counts[cat] = (counts[cat] || 0) + 1;
    }
    if (ways.length < 100) throw new Error(`${city.name}: only ${ways.length} ways, refusing to overwrite data`);
    const out = { city: key, generated: new Date().toISOString(), source: 'OpenStreetMap contributors, ODbL', ways };
    fs.writeFileSync(path.join(__dirname, '..', 'data', `${key}.json`), JSON.stringify(out));
    console.log(`  ${ways.length} ways`, counts);
    await sleep(10000); // be polite to the public Overpass servers
  }
})().catch(e => { console.error(e); process.exit(1); });

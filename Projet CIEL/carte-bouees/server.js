// Serveur local : récupère les données de la NOAA (NDBC), les met en cache 10 min
// et sert le site. Aucune dépendance : Node.js 18 ou plus suffit.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || (process.env.PORT ? '0.0.0.0' : '127.0.0.1'); // hébergeur en ligne : 0.0.0.0 automatiquement
// // mets 0.0.0.0 pour ouvrir le site aux autres appareils du réseau
const PUBLIC = path.join(__dirname, 'public');
const NDBC = 'https://www.ndbc.noaa.gov';
const TTL = 5 * 60 * 1000;
const cache = new Map();

async function cached(key, fn, ttl = TTL) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < ttl) return hit.v;
  try {
    const v = await fn();
    cache.set(key, { t: Date.now(), v });
    return v;
  } catch (e) {
    if (hit) return hit.v; // en cas de panne, on sert les dernières données connues
    throw e;
  }
}

async function getText(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'carte-bouees-local/1.0' } });
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return r.text();
}

const num = (v) => (v === undefined || v === '' || v === 'MM' || isNaN(+v) ? null : +v);

function rowsFrom(txt, headerTest) {
  const lines = txt.split('\n');
  const header = lines.find(headerTest);
  if (!header) return [];
  const cols = header.slice(1).trim().split(/\s+/);
  return lines
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => {
      const p = l.trim().split(/\s+/);
      const o = {};
      cols.forEach((c, i) => (o[c] = p[i]));
      return o;
    });
}

function parseStations(xml) {
  const out = {};
  for (const s of xml.matchAll(/<station\s+([^>]*?)\/?>/g)) {
    const a = {};
    for (const kv of s[1].matchAll(/(\w+)="([^"]*)"/g)) {
      a[kv[1]] = kv[2].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
    }
    if (a.id) out[a.id.toUpperCase()] = a;
  }
  return out;
}

async function loadAll() {
  const [obs, xml] = await Promise.all([
    getText(`${NDBC}/data/latest_obs/latest_obs.txt`),
    getText(`${NDBC}/activestations.xml`).catch(() => ''),
  ]);
  const meta = parseStations(xml);
  const hasMeta = Object.keys(meta).length > 0;
  const buoys = [];
  for (const o of rowsFrom(obs, (l) => l.startsWith('#STN'))) {
    const lat = num(o.LAT), lon = num(o.LON), height = num(o.WVHT), temp = num(o.WTMP);
    if (lat === null || lon === null || (height === null && temp === null)) continue;
    const m = meta[o.STN.toUpperCase()] || {};
    if (hasMeta && !['buoy', 'tao'].includes(m.type)) continue; // bouées flottantes, dont le réseau tropical TAO
    buoys.push({
      id: o.STN,
      name: m.name || `Bouée ${o.STN}`,
      owner: m.owner || '',
      lat, lon, height, temp,
      source: 'NOAA NDBC', url: `${NDBC}/station_page.php?station=${o.STN}`,
      time: `${o.YYYY}-${o.MM}-${o.DD}T${o.hh}:${o.mm}:00Z`,
    });
  }
  return { updated: new Date().toISOString(), buoys };
}

async function loadHistory(id) {
  const txt = await getText(`${NDBC}/data/realtime2/${id}.txt`);
  const points = [];
  let end = null;
  for (const o of rowsFrom(txt, (l) => l.startsWith('#'))) {
    let y = +o.YY;
    if (y < 100) y += 2000;
    const t = Date.UTC(y, +o.MM - 1, +o.DD, +o.hh, +o.mm);
    if (end === null) end = t; // les données sont classées de la plus récente à la plus ancienne
    if (end - t > 48 * 3600e3) break;
    const h = num(o.WVHT), w = num(o.WTMP);
    if (h !== null || w !== null) points.push({ t, h, w });
  }
  return { id, points: points.reverse() };
}

// Marée : le modèle Open-Meteo n'a pas de valeur pour les cases proches de la côte ;
// on essaie donc la position exacte, puis quelques points voisins jusqu'à trouver un niveau de mer.
async function loadTide(lat, lon) {
  const one = async (la, lo) => {
    try { return JSON.parse(await getText(`https://marine-api.open-meteo.com/v1/marine?latitude=${la}&longitude=${lo}&hourly=sea_level_height_msl,wave_height,sea_surface_temperature&past_days=2&forecast_days=7&timeformat=unixtime`)).hourly; }
    catch { return null; }
  };
  const has = (h, k) => h && h[k] && h[k].some((v) => v != null);
  let base = null, lvl = null;
  for (const [a, b] of [[0, 0], [0.25, 0], [-0.25, 0], [0, 0.25], [0, -0.25], [0.5, 0.5], [-0.5, -0.5]]) {
    const h = await one(lat + a, lon + b);
    if (!h) continue;
    base = base || h;
    if (has(h, 'sea_level_height_msl')) { lvl = h; break; }
  }
  if (!base) throw new Error('Open-Meteo indisponible');
  const times = base.time.map((t) => t * 1000);
  const levels = lvl ? lvl.sea_level_height_msl : base.sea_level_height_msl;
  const wave = has(base, 'wave_height') || !lvl ? base.wave_height : lvl.wave_height;
  const sst = has(base, 'sea_surface_temperature') || !lvl ? base.sea_surface_temperature : lvl.sea_surface_temperature;
  const now = Date.now();
  const c = times.findIndex((t) => t > now) - 1;
  const b0 = { times, levels, wave, sst };
  if (!lvl || c < 0 || levels[c] == null || levels[c + 1] == null) return { ...b0, available: false };
  const ext = [];
  for (let k = 1; k < levels.length - 1; k++) {
    const [a, b, e] = [levels[k - 1], levels[k], levels[k + 1]];
    if (a == null || b == null || e == null) continue;
    if (b > a && b >= e) ext.push({ type: 'haute', t: times[k], h: b });
    else if (b < a && b <= e) ext.push({ type: 'basse', t: times[k], h: b });
  }
  const near = ext.find((x) => Math.abs(x.t - now) <= 45 * 60e3);
  const next = ext.find((x) => x.t > now) || null;
  const state = near ? near.type : levels[c + 1] > levels[c] ? 'montante' : 'descendante';
  return { ...b0, available: true, state, next };
}

// Phares du monde entier (OpenStreetMap via Overpass), gardés 7 jours dans phares-cache2.json
const PH_FILE = path.join(__dirname, 'phares-cache.json');
async function loadPhares() {
  try { if (Date.now() - fs.statSync(PH_FILE).mtimeMs < 7 * 864e5) return JSON.parse(fs.readFileSync(PH_FILE, 'utf8')); } catch {}
  const q = '[out:json][timeout:180];nwr["man_made"="lighthouse"];out center tags;';
  const d = JSON.parse(await getText('https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(q)));
  const m = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isNaN(n) ? null : n; };
  const phares = d.elements.map((e) => {
    const t = e.tags || {}, lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon;
    if (lat == null || lon == null) return null;
    const w = t.wikipedia && t.wikipedia.includes(':') ? t.wikipedia : null;
    return { id: e.type[0] + e.id, name: t.name || t['name:fr'] || 'Phare sans nom', lat, lon, h: m(t.height), f: m(t['seamark:light:height']), d: t['description:fr'] || t.description || null, y: t.start_date || null,
      url: `https://www.openstreetmap.org/${e.type}/${e.id}`,
      wiki: w ? `https://${w.split(':')[0]}.wikipedia.org/wiki/${encodeURIComponent(w.slice(w.indexOf(':') + 1).replace(/ /g, '_'))}` : null };
  }).filter(Boolean);
  const out = { updated: new Date().toISOString(), phares };
  try { fs.writeFileSync(PH_FILE, JSON.stringify(out)); } catch {}
  return out;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function serveStatic(pathname, res) {
  const file = path.normalize(path.join(PUBLIC, pathname === '/' ? 'index.html' : pathname));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Page introuvable'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}

const json = (res, data) => {
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
};

http
  .createServer(async (req, res) => {
    try {
      const { pathname, searchParams } = new URL(req.url, 'http://localhost');
      if (pathname === '/api/buoys') return json(res, await cached('all', loadAll));
      if (pathname === '/api/phares') return json(res, await cached('phares', loadPhares, 7 * 864e5));
      if (pathname === '/api/marine') {
        const lat = parseFloat(searchParams.get('lat')), lon = parseFloat(searchParams.get('lon'));
        if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new Error('Coordonnées invalides');
        return json(res, await cached(`marine${lat.toFixed(2)},${lon.toFixed(2)}`, () => loadTide(lat, lon)));
      }
      const m = pathname.match(/^\/api\/buoys\/([A-Za-z0-9]{3,10})$/);
      if (m) {
        const id = m[1].toUpperCase();
        return json(res, await cached('h' + id, () => loadHistory(id), 60 * 1000));
      }
      serveStatic(pathname, res);
    } catch (e) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  })
  .listen(PORT, HOST, () => console.log(`Carte des bouées : http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`));

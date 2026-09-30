const $ = (s) => document.querySelector(s);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const S = { buoys: [], sel: null, charts: {}, hist: null, marine: null, n: 0 };
const AQUA = '#4fd1ff', SIG = '#ff8a3d', SEA = '#7fe3c4';

/* ---------- Outils ---------- */
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (v, u, d = 1) => (v === null || v === undefined ? '—' : v.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }) + '\u202f' + u);
const deg = (v, p, m) => Math.abs(v).toFixed(2) + '° ' + (v >= 0 ? p : m);
const position = (b) => `${deg(b.lat, 'N', 'S')}, ${deg(b.lon, 'E', 'O')}`;
const dateFr = (x) => new Date(x).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const hour = (x) => new Date(x).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const dayHour = (v) => new Date(v).toLocaleString('fr-FR', { weekday: 'short', hour: '2-digit' });
const tempColor = (t) => (t === null ? '#8fb0bf' : `hsl(${200 - 185 * Math.min(1, Math.max(0, t / 30))} 92% 58%)`);
const bin = (t) => (t === null ? 6 : Math.min(5, Math.max(0, Math.floor(t / 5))));
const binTemp = [2.5, 7.5, 12.5, 17.5, 22.5, 27.5, null];
const byId = (id) => S.buoys.find((b) => b.id === id);
const getJson = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(u); return r.json(); };
const tip = (b) => `<strong>${esc(b.name)}</strong><span>${esc(pres(b.lat, b.lon))}</span><span>Vagues : ${fmt(b.height, 'm')}</span><span>Eau : ${fmt(b.temp, '°C')}</span>`;

const buoySvg = (t) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 34" width="36" height="51">
  <circle cx="12" cy="3" r="2.2" fill="#fff"/><rect x="11" y="4" width="2" height="7" fill="#cfe3ec"/>
  <path d="M5 26 8 11H16L19 26Z" fill="${tempColor(t)}"/><path d="M6.2 20 7 15.5H17L17.8 20Z" fill="#fff" opacity=".9"/>
  <path d="M3 26H21V28.5Q12 31 3 28.5Z" fill="#12313f" stroke="#cfe3ec" stroke-width=".8"/>
  <path d="M1 32Q6 29.5 12 32T23 32" fill="none" stroke="#4fd1ff" stroke-width="1.4" stroke-linecap="round"/></svg>`;

/* ---------- Globe (fonds de carte Esri Océan, sans clé) ---------- */
const esri = (p) => `https://server.arcgisonline.com/ArcGIS/rest/services/${p}/MapServer/tile/{z}/{y}/{x}`;
const map = new maplibregl.Map({
  container: 'map',
  center: [-30, 25], zoom: 1.4, minZoom: 0.8, maxZoom: 10,
  dragRotate: false, pitchWithRotate: false,
  style: {
    version: 8,
    projection: { type: 'globe' },
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {
      base: { type: 'raster', tiles: [esri('Ocean/World_Ocean_Base')], tileSize: 256, maxzoom: 10, attribution: 'Fonds : Esri, GEBCO, NOAA, National Geographic. Données : NOAA NDBC, Open-Meteo' },
      labels: { type: 'raster', tiles: [esri('Ocean/World_Ocean_Reference')], tileSize: 256, maxzoom: 10 },
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#06202c' } },
      { id: 'base', type: 'raster', source: 'base' },
      { id: 'labels', type: 'raster', source: 'labels' },
    ],
  },
});
map.touchZoomRotate.disableRotation();
map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-left');
const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: [0, -46], className: 'tip' });

// Le globe tourne doucement tant que personne n'y touche
let spin = !reduced;
function spinStep() {
  if (!spin || map.getZoom() > 3) return;
  const c = map.getCenter();
  c.lng -= 8;
  map.easeTo({ center: c, duration: 1000, easing: (t) => t });
}
map.on('moveend', spinStep);
['mousedown', 'touchstart', 'wheel'].forEach((e) => map.on(e, () => (spin = false)));

const geo = () => ({
  type: 'FeatureCollection',
  features: S.buoys.map((b) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [b.lon, b.lat] }, properties: { id: b.id, icon: 'b' + bin(b.temp) } })),
});

const addIcons = () => Promise.all(binTemp.map((t, i) => new Promise((ok) => {
  const img = new Image(36, 51);
  img.onload = () => { map.addImage('b' + i, img, { pixelRatio: 2 }); ok(); };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(buoySvg(t));
})));

function addLayers() {
  map.addSource('buoys', { type: 'geojson', data: geo(), cluster: true, clusterRadius: 45, clusterMaxZoom: 6 });
  map.addLayer({ id: 'clusters', type: 'circle', source: 'buoys', filter: ['has', 'point_count'],
    paint: { 'circle-color': '#0c3346', 'circle-stroke-color': '#4fd1ff', 'circle-stroke-width': 2, 'circle-radius': ['step', ['get', 'point_count'], 15, 10, 19, 50, 24] } });
  map.addLayer({ id: 'cluster-n', type: 'symbol', source: 'buoys', filter: ['has', 'point_count'],
    layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Open Sans Regular'], 'text-size': 13 }, paint: { 'text-color': '#e8f4f8' } });
  map.addLayer({ id: 'sel', type: 'circle', source: 'buoys', filter: ['==', ['get', 'id'], ''],
    paint: { 'circle-radius': 12, 'circle-color': '#ff8a3d', 'circle-opacity': 0.25, 'circle-stroke-color': '#ff8a3d', 'circle-stroke-width': 2 } });
  map.addLayer({ id: 'buoy', type: 'symbol', source: 'buoys', filter: ['!', ['has', 'point_count']],
    layout: { 'icon-image': ['get', 'icon'], 'icon-anchor': 'bottom', 'icon-size': 0.8, 'icon-allow-overlap': true } });

  map.on('mouseenter', 'buoy', (e) => {
    map.getCanvas().style.cursor = 'pointer';
    const b = byId(e.features[0].properties.id);
    if (b) popup.setLngLat([b.lon, b.lat]).setHTML(tip(b)).addTo(map);
  });
  map.on('mouseleave', 'buoy', () => { map.getCanvas().style.cursor = ''; popup.remove(); });
  map.on('click', 'buoy', (e) => { const b = byId(e.features[0].properties.id); if (b) select(b); });
  map.on('mouseenter', 'clusters', () => (map.getCanvas().style.cursor = 'pointer'));
  map.on('mouseleave', 'clusters', () => (map.getCanvas().style.cursor = ''));
  map.on('click', 'clusters', async (e) => {
    const f = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })[0];
    const z = await map.getSource('buoys').getClusterExpansionZoom(f.properties.cluster_id);
    map.easeTo({ center: f.geometry.coordinates, zoom: z + 0.5 });
  });

  // Anneau qui pulse autour de la bouée choisie
  (function pulse(t) {
    if (S.sel && !reduced) {
      const k = (t % 1600) / 1600;
      map.setPaintProperty('sel', 'circle-radius', 10 + 18 * k);
      map.setPaintProperty('sel', 'circle-stroke-opacity', 1 - k);
    }
    requestAnimationFrame(pulse);
  })(0);
}

/* ---------- Graphiques vivants ---------- */
Chart.defaults.color = '#8fb0bf';
Chart.defaults.font.family = "'Source Serif 4', Georgia, serif";

// Ligne verticale « maintenant », redessinée à chaque mise à jour
const nowLine = {
  id: 'nowLine',
  afterDatasetsDraw(c) {
    const { ctx, chartArea: a, scales: { x } } = c;
    const px = x.getPixelForValue(Date.now());
    if (px < a.left || px > a.right) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(232,244,248,.35)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(px, a.top); ctx.lineTo(px, a.bottom); ctx.stroke();
    ctx.restore();
  },
};

function curve(key, id, sets, unit) {
  const canvas = $(id), box = canvas.parentElement, empty = box.nextElementSibling;
  const has = sets.some((s) => s.data.length > 0);
  box.hidden = !has;
  empty.hidden = has;
  if (!has) {
    empty.textContent = 'Aucune donnée disponible pour cette bouée.';
    S.charts[key]?.destroy();
    delete S.charts[key];
    return;
  }
  const ctx = canvas.getContext('2d');
  const ds = sets.map((s) => {
    let bg = 'transparent';
    if (s.fill) { bg = ctx.createLinearGradient(0, 0, 0, 170); bg.addColorStop(0, s.color + '66'); bg.addColorStop(1, s.color + '00'); }
    return { label: s.name, data: s.data, parsing: false, borderColor: s.color, backgroundColor: bg, fill: !!s.fill, borderDash: s.dash || [], tension: 0.4,
      borderWidth: s.dot ? 0 : 2.5, pointRadius: s.dot ? 7 : 0, pointHoverRadius: s.dot ? 7 : 5, pointBackgroundColor: '#fff', pointBorderColor: s.color, pointBorderWidth: 3, showLine: !s.dot, dot: !!s.dot };
  });
  const c = S.charts[key];
  if (c && c.data.datasets.length === ds.length) { // mise à jour en direct : la courbe glisse vers les nouvelles données
    ds.forEach((d, i) => { c.data.datasets[i].data = d.data; });
    c.update();
    return;
  }
  c?.destroy();
  S.charts[key] = new Chart(ctx, {
    type: 'line',
    data: { datasets: ds },
    plugins: [nowLine],
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: reduced ? 0 : 1100, easing: 'easeOutQuart' },
      interaction: { mode: 'nearest', axis: 'x', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: { displayColors: false, filter: (i) => !i.dataset.dot, callbacks: { title: (i) => dateFr(i[0].parsed.x), label: (i) => ` ${i.dataset.label} : ${i.parsed.y.toLocaleString('fr-FR')} ${unit}` } },
      },
      scales: {
        x: { type: 'linear', grid: { display: false }, ticks: { maxTicksLimit: 6, maxRotation: 0, callback: dayHour } },
        y: { grid: { color: 'rgba(143,176,191,.15)' }, ticks: { callback: (v) => v.toLocaleString('fr-FR') + ' ' + unit } },
      },
    },
  });
}

const pts = (k) => S.hist.filter((p) => p[k] !== null).map((p) => ({ x: p.t, y: p[k] }));
const fc = (times, vals, from) => times.map((t, i) => ({ x: t, y: vals?.[i] })).filter((p) => p.x >= from && p.y != null);
const lerp = (a, t) => {
  for (let i = 1; i < a.length; i++) {
    if (a[i].x >= t) { const p = a[i - 1], q = a[i]; return p.y + (q.y - p.y) * ((t - p.x) / (q.x - p.x || 1)); }
  }
  return a[a.length - 1].y;
};

function drawAll() {
  const m = S.marine, from = Date.now() - 3600e3;
  if (S.hist) {
    curve('h', '#c-h', [{ name: 'Mesure', data: pts('h'), color: AQUA, fill: true }, { name: 'Prévision', data: m ? fc(m.times, m.wave, from) : [], color: AQUA, dash: [6, 5] }], 'm');
    curve('t', '#c-t', [{ name: 'Mesure', data: pts('w'), color: SIG, fill: true }, { name: 'Prévision', data: m ? fc(m.times, m.sst, from) : [], color: SIG, dash: [6, 5] }], '°C');
  }
  if (m) {
    const now = Date.now(), lv = fc(m.times, m.levels, now - 24 * 3600e3).filter((p) => p.x <= now + 48 * 3600e3);
    curve('m', '#c-m', [{ name: 'Niveau', data: lv, color: SEA, fill: true }, { name: 'Maintenant', data: lv.length ? [{ x: now, y: lerp(lv, now) }] : [], color: SEA, dot: true }], 'm');
  }
}

// Toutes les 30 s : le point « maintenant » avance sur la courbe de marée
function tick() {
  const c = S.charts.m;
  if (c && c.data.datasets[1]) {
    const lv = c.data.datasets[0].data, now = Date.now();
    c.data.datasets[1].data = [{ x: now, y: lerp(lv, now) }];
  }
  Object.values(S.charts).forEach((ch) => ch.update());
  updateAge();
}

/* ---------- Bouée choisie ---------- */
const TIDE = { haute: ['Marée haute', 'up'], basse: ['Marée basse', 'down'], montante: ['Marée montante', 'up'], descendante: ['Marée descendante', 'down'] };
const lastPt = (k) => { for (let i = S.hist.length - 1; i >= 0; i--) if (S.hist[i][k] !== null) return S.hist[i]; return null; };

function updateAge() {
  if (!S.hist || !S.hist.length) return;
  const min = Math.max(0, Math.round((Date.now() - S.hist[S.hist.length - 1].t) / 60000));
  $('#age').textContent = min < 90 ? `Dernière mesure il y a ${min} min` : `Dernière mesure il y a ${Math.round(min / 60)} h`;
}

function applyLive() {
  const h = lastPt('h'), w = lastPt('w');
  if (h) $('#p-h').textContent = fmt(h.h, 'm');
  if (w) $('#p-t').textContent = fmt(w.w, '°C');
  updateAge();
}

function applyTide() {
  const m = S.marine;
  if (m.available) {
    const [label, cls] = TIDE[m.state];
    $('#tide').textContent = label;
    $('#tide').className = 'tide ' + cls;
    $('#tide-next').textContent = m.next ? `Prochaine marée ${m.next.type} à ${hour(m.next.t)} (${fmt(m.next.h, 'm', 2)}). Estimation du modèle Open-Meteo.` : '';
  } else {
    $('#tide').className = 'tide';
    $('#tide').textContent = 'Marée indisponible ici';
    $('#tide-next').textContent = '';
  }
  // Tuiles des prévisions par jour
  const start = new Date().setHours(0, 0, 0, 0), days = new Map();
  m.times.forEach((t, i) => {
    if (t < start) return;
    const k = new Date(t).toDateString(), d = days.get(k) || { t, wave: null, sum: 0, n: 0 };
    if (m.wave?.[i] != null) d.wave = Math.max(d.wave ?? 0, m.wave[i]);
    if (m.sst?.[i] != null) { d.sum += m.sst[i]; d.n++; }
    days.set(k, d);
  });
  $('#days').innerHTML = [...days.values()].slice(0, 7).map((d, i) =>
    `<div class="day"><b>${i === 0 ? 'Auj.' : new Date(d.t).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}</b><span class="h">${fmt(d.wave, 'm')}</span><span class="t">${d.n ? fmt(d.sum / d.n, '°C') : '—'}</span></div>`).join('');
}

async function loadHist(b, first) {
  try { const h = await getJson('/api/buoys/' + encodeURIComponent(b.id)); if (S.sel !== b.id) return; S.hist = h.points; }
  catch { if (S.sel !== b.id || !first) return; S.hist = []; }
  applyLive();
  drawAll();
}

async function loadMarine(b, first) {
  try { const m = await getJson(`/api/marine?lat=${b.lat}&lon=${b.lon}`); if (S.sel !== b.id) return; S.marine = m; }
  catch { if (S.sel !== b.id || !first) return; S.marine = { times: [], levels: [], wave: [], sst: [], available: false }; }
  applyTide();
  drawAll();
}

function select(b) {
  Sound.enable();
  Sound.splash();
  window.onBuoy?.(b);
  spin = false;
  S.sel = b.id; S.hist = null; S.marine = null;
  Object.values(S.charts).forEach((c) => c.destroy());
  S.charts = {};
  map.setFilter('sel', ['==', ['get', 'id'], b.id]);
  $('#hint').hidden = true;
  $('#info').hidden = false;
  $('#p-name').textContent = b.name;
  $('#p-where').textContent = pres(b.lat, b.lon);
  $('#p-meta').textContent = `Station ${b.id}${b.owner ? ', ' + b.owner : ''}. Mesure du ${dateFr(b.time)}.`;
  $('#p-pos').textContent = position(b);
  $('#p-h').textContent = fmt(b.height, 'm');
  $('#p-t').textContent = fmt(b.temp, '°C');
  $('#age').textContent = '';
  $('#days').innerHTML = '';
  $('#tide').className = 'tide';
  $('#tide').textContent = 'Calcul de la marée…';
  $('#tide-next').textContent = '';
  map.flyTo({ center: [b.lon, b.lat], zoom: Math.max(map.getZoom(), 5), duration: reduced ? 0 : 2200, essential: true });
  loadHist(b, true);
  loadMarine(b, true);
}

// Actualisation en direct de la bouée choisie
setInterval(() => {
  const b = S.sel && byId(S.sel);
  if (!b) return;
  S.n++;
  loadHist(b, false);
  if (S.n % 5 === 0) loadMarine(b, false);
}, 60000);
setInterval(() => S.sel && tick(), 30000);

/* ---------- Recherche ---------- */
const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
$('#q').addEventListener('input', () => {
  const q = norm($('#q').value.trim()), ul = $('#results');
  if (!q) { ul.hidden = true; return; }
  const hits = S.buoys.filter((b) => norm(b.name + ' ' + b.id).includes(q)).slice(0, 8);
  ul.innerHTML = hits.length
    ? hits.map((b) => `<li><button type="button" data-id="${esc(b.id)}"><strong>${esc(b.name)}</strong><span>Station ${esc(b.id)}, ${esc(pres(b.lat, b.lon))}</span></button></li>`).join('')
    : '<li class="none">Aucune bouée trouvée.</li>';
  ul.hidden = false;
});
$('#results').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const b = byId(btn.dataset.id);
  $('#results').hidden = true;
  $('#q').value = b.name;
  select(b);
});
$('#q').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('#results button')?.click();
  if (e.key === 'Escape') $('#results').hidden = true;
});
document.addEventListener('click', (e) => { if (!e.target.closest('.search')) $('#results').hidden = true; });

/* ---------- Son ---------- */
const paintSound = () => {
  $('#sound').textContent = Sound.muted() ? 'Son coupé' : 'Son activé';
  $('#sound').setAttribute('aria-pressed', String(!Sound.muted()));
};
paintSound();
$('#sound').addEventListener('click', () => { Sound.toggle(); paintSound(); });
$('#vol').addEventListener('input', (e) => Sound.setVol(+e.target.value));
// Les navigateurs exigent un geste de l'utilisateur avant de lancer un son
['pointerdown', 'keydown'].forEach((e) => addEventListener(e, () => Sound.enable(), { once: true }));

/* ---------- Chargement des bouées ---------- */
async function load() {
  $('#refresh').classList.add('busy');
  try {
    const data = await getJson('/api/buoys');
    S.buoys = data.buoys;
    map.getSource('buoys')?.setData(geo());
    $('#count').textContent = `${data.buoys.length} bouées, actualisé à ${hour(data.updated)}`;
    $('.meta').classList.remove('err');
  } catch {
    $('#count').textContent = 'Données indisponibles. Vérifie ta connexion, puis actualise.';
    $('.meta').classList.add('err');
  } finally {
    $('#refresh').classList.remove('busy');
  }
}
$('#refresh').addEventListener('click', load);
setInterval(load, 2 * 60 * 1000);

map.on('load', async () => {
  await addIcons();
  addLayers();
  await load();
  spinStep();
});

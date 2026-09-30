// Ajouts : thème, phares (OpenStreetMap), poissons par zone (panneau déplaçable), liens vers les sources.
(() => {
  const root = document.documentElement;
  const THEMES = { ocean: 'Océan', clair: 'Clair', nuit: 'Nuit', contraste: 'Contraste élevé' };
  const sel = document.createElement('select');
  sel.id = 'theme'; sel.setAttribute('aria-label', 'Thème du site');
  sel.innerHTML = Object.entries(THEMES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
  $('.meta').prepend(sel);
  const setTheme = (t) => {
    root.dataset.theme = t; sel.value = t;
    try { localStorage.setItem('theme', t); } catch {}
    Chart.defaults.color = getComputedStyle(root).getPropertyValue('--mute').trim();
    Object.values(S.charts).forEach((c) => c.update());
  };
  let saved; try { saved = localStorage.getItem('theme'); } catch {}
  setTheme(THEMES[saved] ? saved : 'ocean');
  sel.onchange = () => setTheme(sel.value);
  const fs = document.createElement('button');
  fs.type = 'button'; fs.id = 'fs'; fs.textContent = 'Plein écran';
  fs.onclick = () => (document.fullscreenElement ? document.exitFullscreen() : root.requestFullscreen?.());
  document.addEventListener('fullscreenchange', () => (fs.textContent = document.fullscreenElement ? 'Quitter le plein écran' : 'Plein écran'));
  sel.after(fs);

  /* Poissons : espèces courantes de la zone (liste indicative, pas un relevé de la bouée) */
  const SP = { // description, profondeur, régime, couleur, forme
    'Loup (bar)': ['Prédateur côtier argenté, chasse à l\'aube près des roches.', 'de 0 à 100 m', 'petits poissons, crevettes, crabes', '#b8c4cc', 'fus'],
    'Daurade royale': ['Croissant doré entre les yeux, mâchoires puissantes.', 'de 0 à 150 m', 'moules, coquillages, crustacés', '#9aa5ad', 'ovale'],
    'Rouget de roche': ['Petit poisson rouge vif qui fouille le sable avec ses barbillons.', 'de 3 à 300 m', 'crustacés, vers, petits invertébrés', '#e0553f', 'fus'],
    'Thon rouge': ['Géant migrateur, peut dépasser 2 m, très rapide.', 'de 0 à 1 000 m', 'harengs, maquereaux, calmars', '#2a4a7a', 'fus'],
    'Morue': ['Gros poisson de fond, base historique de la pêche nordique.', 'de 0 à 600 m', 'capelans, harengs, crustacés', '#8a7a55', 'ovale'],
    'Hareng': ['Petit poisson argenté qui vit en immenses bancs.', 'de 0 à 200 m', 'zooplancton (petits crustacés)', '#a9bfd0', 'fus'],
    'Maquereau': ['Dos zébré bleu-vert, nage en bancs rapides près de la surface.', 'de 0 à 200 m', 'zooplancton et petits poissons', '#3d8f86', 'fus'],
    'Merlu': ['Poisson allongé aux dents fines, chasse la nuit près du fond.', 'de 30 à 1 000 m', 'sardines, calmars, crustacés', '#9aa0a0', 'long'],
    'Bar rayé': ['Poisson côtier à rayures sombres, remonte les estuaires.', 'de 0 à 100 m', 'harengs, aloses, crustacés', '#6f8f9f', 'fus'],
    'Aiglefin': ['Cousin de la morue, tache noire au-dessus de la pectorale.', 'de 40 à 300 m', 'oursins, vers, mollusques', '#7d7f86', 'fus'],
    'Vivaneau rouge': ['Poisson rose vif des fonds rocheux et des épaves.', 'de 10 à 190 m', 'poissons, crevettes, crabes', '#e2604f', 'ovale'],
    'Coryphène (mahi-mahi)': ['Dos bleu-vert, flancs dorés, suit les objets flottants.', 'de 0 à 85 m', 'poissons volants, petits poissons, calmars', '#9ad14f', 'fus'],
    'Thazard': ['Maquereau rapide et tacheté, chasseur de bancs.', 'de 0 à 35 m', 'sardines, anchois', '#5c8fb0', 'fus'],
    'Marlin bleu': ['Grand poisson à rostre, l\'un des plus rapides de l\'océan.', 'de 0 à 200 m (plongées jusqu\'à 1 000 m)', 'thons, maquereaux, calmars', '#1f4f9c', 'rostre'],
    'Saumon chinook': ['Plus grand saumon du Pacifique, remonte les fleuves pour pondre.', 'de 0 à 400 m', 'harengs, capelans, calmars, krill', '#7c8ea0', 'fus'],
    'Flétan du Pacifique': ['Poisson plat géant des fonds froids.', 'de 15 à 1 100 m', 'poissons, crabes, poulpes', '#6b6b4f', 'plat'],
    'Morue charbonnière': ['Poisson sombre et gras des grandes profondeurs.', 'de 300 à 2 700 m', 'poissons, calmars, crustacés', '#3b3f4a', 'long'],
    'Sardine du Pacifique': ['Petit poisson de banc, base de la chaîne alimentaire.', 'de 0 à 200 m', 'plancton', '#5f9ab8', 'fus'],
    'Thon albacore': ['Thon à nageoires jaunes, rapide, chasse en bancs.', 'de 0 à 250 m', 'poissons, calmars, crustacés', '#d6b422', 'fus'],
    'Listao (bonite)': ['Petit thon à ventre rayé, le plus pêché au monde.', 'de 0 à 260 m', 'poissons, crustacés, calmars', '#33518a', 'fus'],
    'Espadon': ['Prédateur à long rostre plat, chasse la nuit en surface.', 'de 0 à 800 m', 'poissons et calmars', '#4a5568', 'rostre'],
    'Poisson volant': ['Plane au-dessus des vagues pour échapper aux prédateurs.', 'de 0 à 20 m', 'zooplancton', '#4b8fd0', 'fus'],
  };
  const R = (n, b, f) => ({ n, b, f });
  const FISH = [
    R('Méditerranée', [[30, 46, -6, 36]], ['Loup (bar)', 'Daurade royale', 'Rouget de roche', 'Thon rouge']),
    R('Atlantique nord-est', [[35, 72, -35, 15]], ['Morue', 'Hareng', 'Maquereau', 'Merlu']),
    R('Atlantique nord-ouest', [[30, 65, -80, -35]], ['Bar rayé', 'Morue', 'Thon rouge', 'Aiglefin']),
    R('Golfe du Mexique et Caraïbes', [[8, 31, -100, -58]], ['Vivaneau rouge', 'Coryphène (mahi-mahi)', 'Thazard', 'Marlin bleu']),
    R('Pacifique nord-est', [[30, 65, -180, -115]], ['Saumon chinook', 'Flétan du Pacifique', 'Morue charbonnière', 'Sardine du Pacifique']),
    R('Pacifique tropical', [[-25, 25, -180, -80], [-25, 25, 130, 180]], ['Thon albacore', 'Listao (bonite)', 'Coryphène (mahi-mahi)', 'Marlin bleu']),
  ];
  const OPEN = R('Haute mer', [], ['Thon albacore', 'Espadon', 'Coryphène (mahi-mahi)', 'Poisson volant']);
  const fsec = document.createElement('section');
  fsec.id = 'fish-sec';
  fsec.innerHTML = '<h3>Poissons de la zone</h3><div class="fb"></div>';
  const showFish = (lat, lon, host) => {
    const r = FISH.find((z) => z.b.some(([a, b, c, d]) => lat >= a && lat <= b && lon >= c && lon <= d)) || OPEN;
    fsec.querySelector('.fb').innerHTML = `<p class="note"><b>${r.n}</b> : espèces courantes de la région (liste indicative, pas un relevé de cet endroit). Clique sur un poisson pour le voir en 3D.</p>` + r.f.map((n) => {
      const [d, p, m] = SP[n];
      return `<button type="button" class="fi" data-n="${esc(n)}"><b>${esc(n)}</b><span>${esc(d)}</span><small>Profondeur : ${esc(p)}. Se nourrit de : ${esc(m)}.</small></button>`;
    }).join('');
    host.after(fsec);
  };
  fsec.addEventListener('click', (e) => {
    const b = e.target.closest('.fi'); if (!b) return;
    const n = b.dataset.n, [d, p, m, c, k] = SP[n];
    if (window.Fish3D) window.Fish3D.show({ n, d, p, m, c, k });
    else alert('Le modèle 3D n\'a pas pu se charger (connexion internet nécessaire).');
  });

  /* Bouée choisie : lien vers la source, poids, poissons */
  window.onBuoy = (b) => {
    $('#lh-info').hidden = true;
    let s = $('#src');
    if (!s) { s = document.createElement('p'); s.id = 'src'; s.className = 'note'; $('#p-meta').after(s); }
    s.innerHTML = `Source : <a href="${esc(b.url)}" target="_blank" rel="noopener">${esc(b.source)} (fiche de la station)</a>. Marées et prévisions : <a href="https://open-meteo.com/en/docs/marine-weather-api" target="_blank" rel="noopener">Open-Meteo</a>. Poids de la bouée : non publié par la source.`;
    showFish(b.lat, b.lon, $('#info .stats'));
  };

  /* Phares */
  const lhSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 34" width="28" height="40"><path d="M9 33 10.5 12h3L15 33Z" fill="#f4f1ea" stroke="#12313f" stroke-width=".8"/><path d="M9.8 24h4.4l.3-4H9.5Z" fill="#d94a3a"/><rect x="9" y="8" width="6" height="4" fill="#ffd54a" stroke="#12313f" stroke-width=".8"/><path d="M8 8h8l-4-5Z" fill="#12313f"/><path d="M2 5l5 2M22 5l-5 2" stroke="#ffd54a" stroke-width="1.4" stroke-linecap="round"/></svg>';
  $('.detail').insertAdjacentHTML('beforeend', `<div id="lh-info" hidden><div class="lhp">${lhSvg.replace('width="28" height="40"', 'width="56" height="80"')}<div><h2 id="l-name"></h2><p id="l-where"></p></div></div><p id="l-src" class="note"></p><dl class="stats"><div class="wide"><dt>Position</dt><dd id="l-pos"></dd></div><div><dt>Hauteur du phare</dt><dd class="big h" id="l-h"></dd></div><div><dt>Hauteur du feu</dt><dd class="big t" id="l-f"></dd></div></dl><section><h3>Description</h3><p id="l-desc"></p></section></div>`);
  const m1 = (v) => (v == null ? 'non renseignée' : v.toLocaleString('fr-FR') + '\u202fm');
  map.on('load', async () => {
    const img = new Image(28, 40);
    await new Promise((ok) => { img.onload = ok; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(lhSvg); });
    map.addImage('lh', img, { pixelRatio: 2 });
    let list;
    try { list = (await getJson('/api/phares')).phares; } catch { $('#count').textContent += ' · phares indisponibles pour le moment'; return; }
    map.addSource('phares', { type: 'geojson', cluster: true, clusterRadius: 40, clusterMaxZoom: 8,
      data: { type: 'FeatureCollection', features: list.map((p, i) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lon, p.lat] }, properties: { i } })) } });
    map.addLayer({ id: 'ph-cl', type: 'circle', source: 'phares', filter: ['has', 'point_count'], paint: { 'circle-color': '#3b3520', 'circle-stroke-color': '#ffd54a', 'circle-stroke-width': 2, 'circle-radius': ['step', ['get', 'point_count'], 13, 20, 17, 200, 22] } });
    map.addLayer({ id: 'ph-n', type: 'symbol', source: 'phares', filter: ['has', 'point_count'], layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Open Sans Regular'], 'text-size': 12 }, paint: { 'text-color': '#ffd54a' } });
    map.addLayer({ id: 'phare', type: 'symbol', source: 'phares', filter: ['!', ['has', 'point_count']], layout: { 'icon-image': 'lh', 'icon-anchor': 'bottom', 'icon-size': 0.75, 'icon-allow-overlap': true } });
    map.on('mouseenter', 'phare', () => (map.getCanvas().style.cursor = 'pointer'));
    map.on('mouseleave', 'phare', () => (map.getCanvas().style.cursor = ''));
    map.on('mouseenter', 'ph-cl', () => (map.getCanvas().style.cursor = 'pointer'));
    map.on('mouseleave', 'ph-cl', () => (map.getCanvas().style.cursor = ''));
    map.on('click', 'ph-cl', async (e) => {
      const f = map.queryRenderedFeatures(e.point, { layers: ['ph-cl'] })[0];
      map.easeTo({ center: f.geometry.coordinates, zoom: (await map.getSource('phares').getClusterExpansionZoom(f.properties.cluster_id)) + 0.5 });
    });
    map.on('click', 'phare', (e) => {
      const p = list[e.features[0].properties.i];
      Sound.enable(); Sound.horn(); spin = false;
      const yr = p.y && /^\d{4}/.test(p.y) ? p.y.slice(0, 4) : null;
      const desc = p.d || `${p.name} est un phare${yr ? ' mis en service en ' + yr : ''}. Sa tour mesure ${p.h != null ? m1(p.h) : 'une hauteur non renseignée (« — » ci-dessus)'}${p.f != null ? ` et son feu est placé à ${m1(p.f)} au-dessus de l'eau` : ''}.`;
      $('#hint').hidden = true; $('#info').hidden = true; $('#lh-info').hidden = false;
      S.sel = null; map.setFilter('sel', ['==', ['get', 'id'], '']);
      $('#l-name').textContent = p.name;
      $('#l-where').textContent = pres(p.lat, p.lon);
      $('#l-pos').textContent = position(p);
      $('#l-h').textContent = fmt(p.h, 'm');
      $('#l-f').textContent = fmt(p.f, 'm');
      $('#l-src').innerHTML = `Source : <a href="${esc(p.url)}" target="_blank" rel="noopener">OpenStreetMap</a>${p.wiki ? ` · <a href="${esc(p.wiki)}" target="_blank" rel="noopener">Wikipédia</a>` : ''}`;
      $('#l-desc').textContent = desc;
      showFish(p.lat, p.lon, $('#lh-info .stats'));
      $('.detail').scrollTop = 0;
      map.flyTo({ center: [p.lon, p.lat], zoom: Math.max(map.getZoom(), 6), duration: reduced ? 0 : 1500 });
    });
  });
})();

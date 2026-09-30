// Poissons 3D procéduraux : corps profilé avec peau texturée (dos sombre, ventre clair, motifs), nageoires, œil, nage animée.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const ov = document.createElement('div');
ov.id = 'f3d'; ov.hidden = true;
ov.innerHTML = '<div class="f3d-box"><button class="f3d-x" type="button" aria-label="Fermer">×</button><h3></h3><canvas></canvas><p class="f3d-info"></p><p class="note">Glisse pour tourner, molette ou pincement pour zoomer. Modèle généré par ordinateur : proportions et couleurs réalistes mais simplifiées.</p></div>';
document.body.append(ov);
const canvas = ov.querySelector('canvas');
let R = null;

// Formes de base : H demi-hauteur, nose museau (petit = tête arrondie), d/a nageoires dorsales/anales [début, fin, hauteur, pic]
const K = {
  fus: { H: 0.5, nose: 0.75, d: [[0.3, 0.48, 0.3, 0.2], [0.6, 0.74, 0.15, 0.4]], a: [[0.6, 0.76, 0.14, 0.3]], tail: 'fork' },
  ovale: { H: 0.8, nose: 0.6, d: [[0.28, 0.7, 0.26, 0.35]], a: [[0.62, 0.78, 0.16, 0.3]], tail: 'std' },
  long: { H: 0.38, nose: 0.8, d: [[0.3, 0.52, 0.18, 0.3], [0.56, 0.95, 0.1, 0.5]], a: [[0.55, 0.95, 0.1, 0.5]], tail: 'std' },
  plat: { H: 0.13, W: 1.1, nose: 0.6, d: [[0.08, 0.95, 0.3, 0.5]], a: [[0.3, 0.95, 0.3, 0.5]], tail: 'std' },
  rostre: { H: 0.5, nose: 0.8, d: [[0.25, 0.5, 0.5, 0.3], [0.72, 0.8, 0.12, 0.5]], a: [[0.68, 0.78, 0.12, 0.4]], tail: 'lun', bill: 1.1 },
};
// Couleurs (b dos, s flancs, v ventre) et motif (p) de chaque espèce
const SP = {
  'Loup (bar)': { b: '#56636d', s: '#c9d2d8', v: '#eef0f0', p: 'gill' },
  'Daurade royale': { k: 'ovale', b: '#666f76', s: '#b7bcc0', v: '#e8e6df', p: 'gold', H: 0.85 },
  'Rouget de roche': { b: '#d2412c', s: '#e46b56', v: '#f3c7b6', p: 'lines' },
  'Thon rouge': { b: '#16304d', s: '#6b8094', v: '#d8dee1', p: 'none', H: 0.78, nose: 0.7, tail: 'lun' },
  'Morue': { k: 'ovale', b: '#7b6b3b', s: '#aa9b6b', v: '#ece4cc', p: 'spots', H: 0.62, nose: 0.7 },
  'Hareng': { b: '#2c5b86', s: '#b7c9d6', v: '#f2f5f6', p: 'none', H: 0.42 },
  'Maquereau': { b: '#1d6b66', s: '#9cc5c0', v: '#f1f4f2', p: 'bars', H: 0.4 },
  'Merlu': { k: 'long', b: '#666f75', s: '#a9b1b5', v: '#e4e7e6', p: 'none' },
  'Bar rayé': { b: '#485860', s: '#b8c3c8', v: '#eef0ee', p: 'lines' },
  'Aiglefin': { b: '#5b5c63', s: '#a6a8ad', v: '#eeeeee', p: 'gill', H: 0.55, tail: 'fork' },
  'Vivaneau rouge': { k: 'ovale', b: '#c5382c', s: '#de6658', v: '#f2b8a9', p: 'none', H: 0.8 },
  'Coryphène (mahi-mahi)': { b: '#2fa56a', s: '#dcc23a', v: '#f4ecc0', p: 'spots', H: 0.62, nose: 0.5, d: [[0.06, 0.82, 0.3, 0.15]], tail: 'fork' },
  'Thazard': { b: '#3d7ba5', s: '#b7cddb', v: '#f0f3f4', p: 'spots', H: 0.42 },
  'Marlin bleu': { k: 'rostre', b: '#1b3d75', s: '#6b90b6', v: '#dfe5ea', p: 'bars' },
  'Saumon chinook': { b: '#5c6e82', s: '#b8c2ca', v: '#eceeee', p: 'spots', H: 0.55 },
  'Flétan du Pacifique': { k: 'plat', b: '#68684a', s: '#8d8a66', v: '#d8d4bd', p: 'spots' },
  'Morue charbonnière': { k: 'long', b: '#2e323a', s: '#555a65', v: '#99a0a8', p: 'none', H: 0.45 },
  'Sardine du Pacifique': { b: '#2a5878', s: '#b3c7d5', v: '#f0f4f6', p: 'spots', H: 0.34 },
  'Thon albacore': { b: '#1b2e4e', s: '#cdb43a', v: '#dcdcd4', p: 'none', H: 0.7, tail: 'lun' },
  'Listao (bonite)': { b: '#21356a', s: '#8b9eb4', v: '#d9dee2', p: 'lines', H: 0.62, tail: 'lun' },
  'Espadon': { k: 'rostre', b: '#39455a', s: '#7a8695', v: '#d5dade', p: 'none', H: 0.55, flat: 1 },
  'Poisson volant': { b: '#2a5e94', s: '#a8c3dd', v: '#f0f4f8', p: 'none', H: 0.36, pec: 3 },
};
const TAILS = {
  fork: [[0, 0.07], [-0.2, 0.25], [-0.5, 0.5], [-0.36, 0.18], [-0.3, 0], [-0.36, -0.18], [-0.5, -0.5], [-0.2, -0.25], [0, -0.07]],
  lun: [[0, 0.07], [-0.15, 0.3], [-0.55, 0.75], [-0.42, 0.2], [-0.36, 0], [-0.42, -0.2], [-0.55, -0.75], [-0.15, -0.3], [0, -0.07]],
  std: [[0, 0.07], [-0.25, 0.25], [-0.5, 0.38], [-0.6, 0.1], [-0.6, -0.1], [-0.5, -0.38], [-0.25, -0.25], [0, -0.07]],
};

// Peau : dégradé dos / flancs / ventre + motif, ligne latérale, opercule et écailles
function skin(st) {
  const W = 1024, H = 256, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d'), im = c.createImageData(W, H), d = im.data;
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.substr(i, 2), 16));
  const [B, S, V] = [st.b, st.s, st.v].map(hex);
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const h2 = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = x / W, th = (2 * Math.PI * y) / H, s = Math.sin(th);
    let col = mix(mix(V, S, ss(-0.75, -0.1, s)), B, ss(0.15, 0.75, s)), k = 1;
    if (st.p === 'lines' && Math.abs(s) < 0.8 && Math.abs(((s * 4 + 8) % 1) - 0.5) < 0.1) k = 0.72;
    if (st.p === 'bars' && s > 0 && Math.sin(u * 80 + s * 7) > 0.5) k = 0.7;
    if (st.p === 'spots' && s > -0.4 && u > 0.2) {
      const cx = Math.floor(x / 22), cy = Math.floor(y / 22);
      if (h2(cx, cy + 9) > 0.35 && Math.hypot(x / 22 - cx - 0.3 - 0.4 * h2(cx, cy), y / 22 - cy - 0.3 - 0.4 * h2(cy, cx)) < 0.26) k = 0.55;
    }
    if (st.p === 'gold' && u < 0.3 && s > 0.55) col = mix(col, [217, 176, 42], 0.7);
    if (st.p === 'gill' && Math.hypot((u - 0.22) * 40, s * 3) < 0.7) k = 0.45;
    if (Math.abs(u - 0.2) < 0.006) k *= 0.78;
    if (Math.abs(s) < 0.03 && u > 0.2 && u < 0.96) k *= 0.85;
    k *= 0.95 + 0.05 * Math.sin(x * 0.9) * Math.sin(y * 0.9);
    const i = (y * W + x) * 4;
    d[i] = col[0] * k; d[i + 1] = col[1] * k; d[i + 2] = col[2] * k; d[i + 3] = 255;
  }
  c.putImageData(im, 0, 0);
  return cv;
}

function build(name, kind, color) {
  const sp = SP[name] || { b: color, s: color, v: '#eeeeee', p: 'none' };
  const st = { ...(K[sp.k || kind] || K.fus), ...sp };
  const L = 4, N = 72, M = 36, g = new THREE.Group();
  const prof = (t) => Math.max(Math.pow(Math.sin(Math.PI * Math.pow(t, st.nose)), 0.85), t > 0.5 ? 0.07 : 0);
  const X = (t) => L / 2 - L * t, hh = (t) => st.H * prof(t), ww = (t) => (st.W ?? st.H * 0.62) * prof(t);

  // Corps : coupes elliptiques le long de l'axe, dos plus bombé que le ventre
  const n = (N + 1) * (M + 1), pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), idx = [];
  for (let i = 0, p = 0, q = 0; i <= N; i++) for (let j = 0; j <= M; j++, p += 3, q += 2) {
    const t = i / N, th = (2 * Math.PI * j) / M, sn = Math.sin(th);
    pos[p] = X(t); pos[p + 1] = sn * hh(t) * (sn > 0 ? 1 : 0.85); pos[p + 2] = Math.cos(th) * ww(t);
    uv[q] = t; uv[q + 1] = j / M;
    if (i < N && j < M) { const a = i * (M + 1) + j, b = a + M + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  }
  const orig = pos.slice(), geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  const nr = geo.attributes.normal;
  for (let i = 0; i <= N; i++) for (let c = 0; c < 3; c++) { const a = i * (M + 1), b = a + M, v = (nr.getComponent(a, c) + nr.getComponent(b, c)) / 2; nr.setComponent(a, c, v); nr.setComponent(b, c, v); }
  const tex = new THREE.CanvasTexture(skin(st));
  tex.flipY = false; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  g.add(new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.32, metalness: 0.25, clearcoat: 0.7, clearcoatRoughness: 0.25, side: THREE.DoubleSide })));
  const wag = [{ geo, o: orig, dx: 0 }];

  // Nageoires (formes plates translucides)
  const fm = new THREE.MeshStandardMaterial({ color: new THREE.Color(st.b).lerp(new THREE.Color(st.s), 0.25), transparent: true, opacity: 0.82, side: THREE.DoubleSide, roughness: 0.6 });
  const fin = (pts, sc = 1) => {
    const sh = new THREE.Shape();
    pts.forEach(([x, y], i) => (i ? sh.lineTo(x * sc, y * sc) : sh.moveTo(x * sc, y * sc)));
    const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), fm);
    g.add(m);
    return m;
  };
  const track = (m) => wag.push({ geo: m.geometry, o: m.geometry.attributes.position.array.slice(), dx: m.position.x });
  const ridge = (list, dir) => list.forEach(([t0, t1, hf, pk]) => {
    const A = [], T = [], K2 = 14;
    for (let k = 0; k <= K2; k++) {
      const t = t0 + ((t1 - t0) * k) / K2, s = k / K2, y = dir * hh(t) * (dir > 0 ? 0.94 : 0.8);
      A.push([X(t), y]);
      T.push([X(t), y + dir * hf * (s < pk ? 0.25 + 0.75 * Math.pow(s / pk, 0.7) : 1 - (0.75 * (s - pk)) / (1 - pk))]);
    }
    track(fin([...A, ...T.reverse()]));
  });
  ridge(st.d, 1); ridge(st.a, -1);
  const tm = fin(TAILS[st.tail] || TAILS.std, st.ts ?? 1.2);
  tm.position.x = X(1) + 0.02; track(tm);
  for (const sd of [-1, 1]) {
    const pe = fin([[0.06, 0], [-0.07, 0], [-0.5, 0.42], [-0.3, 0.5], [-0.05, 0.3]], 0.5 * (st.pec || 1));
    pe.position.set(X(0.25), -hh(0.25) * 0.35, sd * ww(0.25) * 0.9); pe.rotation.x = sd * (Math.PI / 2 + 0.3);
    const pv = fin([[0.05, 0], [-0.05, 0], [-0.35, 0.3], [-0.15, 0.36]], 0.5);
    pv.position.set(X(0.36), -hh(0.36) * 0.85, sd * ww(0.36) * 0.35); pv.rotation.x = sd * (Math.PI / 2 + 1);

    // Œil : globe doré et pupille noire brillante
    const r = 0.07 + 0.02 * st.H, e = new THREE.Group();
    e.add(new THREE.Mesh(new THREE.SphereGeometry(r, 20, 16), new THREE.MeshStandardMaterial({ color: '#d8c680', roughness: 0.3 })));
    const pu = new THREE.Mesh(new THREE.SphereGeometry(r * 0.62, 16, 12), new THREE.MeshPhysicalMaterial({ color: '#050505', roughness: 0.05, clearcoat: 1 }));
    pu.position.set(r * 0.25, 0, sd * r * 0.55); e.add(pu);
    if (kind === 'plat' || sp.k === 'plat') e.position.set(X(0.15), hh(0.15) + 0.02, sd * 0.2);
    else e.position.set(X(0.1), hh(0.1) * 0.35, sd * ww(0.1) * 0.9);
    g.add(e);
  }
  if (st.bill) { // rostre du marlin (rond) ou de l'espadon (lame plate)
    const b = new THREE.Mesh(new THREE.ConeGeometry(0.07, st.bill, 16), fm);
    b.rotation.z = -Math.PI / 2; b.position.x = X(0) + st.bill / 2 - 0.02;
    if (st.flat) b.scale.set(0.3, 1, 3);
    g.add(b);
  }
  g.rotation.y = 0.5;
  return { g, wag };
}

function init() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight('#ffffff', '#2a5570', 1.2));
  const sun = new THREE.DirectionalLight('#ffffff', 2.4); sun.position.set(3, 5, 5); scene.add(sun);
  const rim = new THREE.DirectionalLight('#5fd0ff', 1.2); rim.position.set(-4, 1, -4); scene.add(rim);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.autoRotate = true; controls.autoRotateSpeed = 1.2; controls.minDistance = 3; controls.maxDistance = 12;
  R = { renderer, scene, camera, controls, fish: null, wag: [] };
}

function loop() {
  if (ov.hidden) return;
  const w = canvas.clientWidth, h = canvas.clientHeight, t = performance.now() / 1000;
  if (canvas.width !== Math.round(w * devicePixelRatio) || canvas.height !== Math.round(h * devicePixelRatio)) {
    R.renderer.setPixelRatio(devicePixelRatio); R.renderer.setSize(w, h, false);
    R.camera.aspect = w / h; R.camera.updateProjectionMatrix();
  }
  for (const { geo, o, dx } of R.wag) { // ondulation de la nage : plus forte vers la queue
    const p = geo.attributes.position;
    for (let k = 0; k < p.count; k++) { const f = (2 - (o[3 * k] + dx)) / 4; p.setZ(k, o[3 * k + 2] + 0.13 * f * f * Math.sin(f * 5 - t * 5)); }
    p.needsUpdate = true;
  }
  R.controls.update();
  R.renderer.render(R.scene, R.camera);
  requestAnimationFrame(loop);
}

const close = () => (ov.hidden = true);
ov.querySelector('.f3d-x').onclick = close;
ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

window.Fish3D = {
  show(s) {
    const info = ov.querySelector('.f3d-info');
    ov.querySelector('h3').textContent = s.n;
    info.textContent = `${s.d} Profondeur : ${s.p}. Se nourrit de : ${s.m}.`;
    ov.hidden = false;
    try {
      if (!R) init();
      if (R.fish) R.scene.remove(R.fish);
      const f = build(s.n, s.k, s.c);
      R.fish = f.g; R.wag = f.wag;
      R.scene.add(f.g);
      R.camera.position.set(0, 1.2, 7.5);
      R.controls.target.set(0, 0, 0);
      loop();
    } catch (e) { info.textContent += ` (Erreur d'affichage 3D : ${e.message})`; }
  },
};

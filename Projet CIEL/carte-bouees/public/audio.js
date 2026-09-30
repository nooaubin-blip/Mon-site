// Ambiance sonore générée dans le navigateur (aucun fichier audio) : vagues, nappe douce et notes de cloche.
const Sound = (() => {
  let ctx, master, wbuf, started = false, vol = 0.5, muted = false;
  try { muted = localStorage.getItem('son') === 'off'; } catch {}
  const CH = [[110, 164.81, 220, 261.63, 329.63, 246.94], [87.31, 130.81, 174.61, 220, 261.63, 329.63], [130.81, 196, 261.63, 329.63, 392, 293.66], [98, 146.83, 196, 246.94, 293.66, 329.63]];
  const NOTES = [440, 523.25, 587.33, 659.25, 783.99, 880];

  const apply = () => master && master.gain.setTargetAtTime(muted ? 0 : vol, ctx.currentTime, 0.3);

  function bell(f) {
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = f;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 3.3);
  }

  function start() {
    if (started) return;
    started = true;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // Bruit blanc court (éclaboussures) et bruit brun en boucle (vagues)
    wbuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    wbuf.getChannelData(0).forEach((_, i, d) => (d[i] = Math.random() * 2 - 1));
    const n = ctx.sampleRate * 6, brown = ctx.createBuffer(1, n, ctx.sampleRate), d = brown.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }

    const src = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), swell = ctx.createGain();
    src.buffer = brown; src.loop = true;
    lp.type = 'lowpass'; lp.frequency.value = 700;
    swell.gain.value = 0.35;
    const lfo = ctx.createOscillator(), depth = ctx.createGain();
    lfo.frequency.value = 0.09; depth.gain.value = 0.25;
    lfo.connect(depth); depth.connect(swell.gain);
    src.connect(lp); lp.connect(swell); swell.connect(master);
    src.start(); lfo.start();

    // Nappe d'accords qui change doucement
    const bus = ctx.createGain(), pl = ctx.createBiquadFilter();
    bus.gain.value = 0.05; pl.type = 'lowpass'; pl.frequency.value = 1100;
    bus.connect(pl); pl.connect(master);
    const pads = CH[0].map((f, i) => {
      const o = ctx.createOscillator();
      o.type = i % 2 ? 'triangle' : 'sine';
      o.frequency.value = f; o.detune.value = (i - 3) * 4;
      o.connect(bus); o.start();
      return o;
    });
    let c = 0;
    setInterval(() => { c = (c + 1) % CH.length; pads.forEach((o, i) => o.frequency.setTargetAtTime(CH[c][i], ctx.currentTime, 2.5)); }, 14000);
    (function spark() {
      if (!muted && ctx.state === 'running') bell(NOTES[Math.floor(Math.random() * NOTES.length)]);
      setTimeout(spark, 3500 + Math.random() * 5000);
    })();
    apply();
  }

  function splash() {
    if (!started || muted) return;
    const t = ctx.currentTime, b = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    b.buffer = wbuf;
    bp.type = 'bandpass'; bp.Q.value = 0.8;
    bp.frequency.setValueAtTime(2200, t); bp.frequency.exponentialRampToValueAtTime(450, t + 0.6);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.55, t + 0.04); g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    b.connect(bp); bp.connect(g); g.connect(master);
    b.start(t); b.stop(t + 0.8);
    [[620, 170, 0, 0.3], [950, 380, 0.16, 0.18]].forEach(([f0, f1, dt, vg]) => {
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.frequency.setValueAtTime(f0, t + dt); o.frequency.exponentialRampToValueAtTime(f1, t + dt + 0.25);
      og.gain.setValueAtTime(vg, t + dt); og.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.3);
      o.connect(og); og.connect(master);
      o.start(t + dt); o.stop(t + dt + 0.35);
    });
  }

  // Corne de brume + cloche grave : son propre aux phares
  function horn() {
    if (!started || muted) return;
    const t = ctx.currentTime, g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 500;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.35, t + 0.25); g.gain.setValueAtTime(0.35, t + 1.1); g.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
    lp.connect(g); g.connect(master);
    [98, 98.8, 147].forEach((f) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(lp); o.start(t); o.stop(t + 1.9); });
    bell(196);
  }

  return {
    horn,
    enable() { start(); ctx.resume(); },
    toggle() { start(); ctx.resume(); muted = !muted; try { localStorage.setItem('son', muted ? 'off' : 'on'); } catch {} apply(); },
    setVol(v) { vol = v; apply(); },
    muted: () => muted,
    splash,
  };
})();

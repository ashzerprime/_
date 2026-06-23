/* ═══════════════════════════════════════════════════
   AUDIO.JS – Musique et sons via Web Audio API
═══════════════════════════════════════════════════ */

const Audio = (() => {
  let ctx = null;
  let masterGain, musicGain, sfxGain;
  let engineOscillator = null, engineGain = null;
  let musicNodes = [];
  let rainNode = null, rainGain = null;
  let musicPlaying = false;

  function init() {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain(); masterGain.gain.value = 1;
      musicGain = ctx.createGain(); musicGain.gain.value = 0.6;
      sfxGain = ctx.createGain(); sfxGain.gain.value = 0.8;
      masterGain.connect(ctx.destination);
      musicGain.connect(masterGain);
      sfxGain.connect(masterGain);
    } catch(e) { console.warn('Audio non disponible'); }
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function setMusicVol(v) { if (musicGain) musicGain.gain.value = v / 100; }
  function setSfxVol(v) { if (sfxGain) sfxGain.gain.value = v / 100; }

  // Son synthétisé simple
  function playTone(freq, dur, type='square', vol=0.3, dest=null) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(g);
    g.connect(dest || sfxGain);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  // Klaxon
  function honk() {
    if (!ctx) return;
    playTone(440, 0.15, 'sawtooth', 0.4);
    setTimeout(() => playTone(480, 0.2, 'sawtooth', 0.4), 100);
  }

  // Nitro boost
  function nitroSound() {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.5);
    g.gain.setValueAtTime(0.5, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(g); g.connect(sfxGain);
    osc.start(); osc.stop(ctx.currentTime + 0.5);
  }

  // Collision
  function crash(intensity=1) {
    if (!ctx) return;
    const bufSize = ctx.sampleRate * 0.3;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i=0;i<bufSize;i++) data[i] = (Math.random()*2-1)*Math.max(0,1-i/bufSize)*intensity;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain(); g.gain.value = 0.7 * intensity;
    src.connect(g); g.connect(sfxGain);
    src.start();
  }

  // Powerup
  function powerupSound() {
    if (!ctx) return;
    [440,550,660,880].forEach((f,i) => {
      setTimeout(() => playTone(f, 0.15, 'triangle', 0.3), i*60);
    });
  }

  // Compte à rebours
  function countdown(n) {
    if (!ctx) return;
    if (n > 0) playTone(440, 0.2, 'square', 0.4);
    else playTone(880, 0.4, 'square', 0.6);
  }

  // Finish
  function finishSound() {
    if (!ctx) return;
    const melody = [523,659,784,1047];
    melody.forEach((f,i) => setTimeout(()=>playTone(f,0.3,'triangle',0.4), i*150));
  }

  // Moteur continu
  let engineRunning = false;
  function startEngine() {
    if (!ctx || engineRunning) return;
    engineRunning = true;
    engineOscillator = ctx.createOscillator();
    const distortion = ctx.createWaveShaper();
    engineGain = ctx.createGain();
    // Courbe de distortion pour son moteur
    const curve = new Float32Array(256);
    for (let i=0;i<256;i++) {
      const x = (i*2/256)-1;
      curve[i] = (Math.PI + 200) * x / (Math.PI + 200 * Math.abs(x));
    }
    distortion.curve = curve;
    engineOscillator.type = 'sawtooth';
    engineOscillator.frequency.value = 60;
    engineGain.gain.value = 0.08;
    engineOscillator.connect(distortion);
    distortion.connect(engineGain);
    engineGain.connect(masterGain);
    engineOscillator.start();
  }

  function stopEngine() {
    if (!engineRunning) return;
    engineRunning = false;
    try {
      engineOscillator.stop();
      engineOscillator.disconnect();
      engineGain.disconnect();
    } catch(e) {}
    engineOscillator = null;
    engineGain = null;
  }

  function updateEngine(rpm, speed) {
    if (!engineOscillator || !ctx) return;
    const freq = 40 + rpm * 0.1 + speed * 0.3;
    engineOscillator.frequency.setTargetAtTime(Math.min(freq, 400), ctx.currentTime, 0.05);
    const vol = Math.min(0.12, 0.04 + rpm * 0.00004 + speed * 0.0003);
    engineGain.gain.setTargetAtTime(vol, ctx.currentTime, 0.05);
  }

  // Pluie
  function startRain() {
    if (!ctx || rainNode) return;
    const bufSize = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i=0;i<bufSize;i++) data[i] = Math.random()*2-1;
    rainNode = ctx.createBufferSource();
    rainNode.buffer = buf; rainNode.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass'; filter.frequency.value = 1200; filter.Q.value = 0.5;
    rainGain = ctx.createGain(); rainGain.gain.value = 0.05;
    rainNode.connect(filter); filter.connect(rainGain); rainGain.connect(masterGain);
    rainNode.start();
  }

  function stopRain() {
    if (rainNode) {
      try { rainNode.stop(); rainNode.disconnect(); } catch(e) {}
      rainNode = null;
    }
  }

  // Musique de fond synthétique (generative)
  let musicInterval = null;
  const CHORDS = [[130,164,196],[146,184,220],[110,138,164],[123,155,185]];
  let chordIdx = 0;

  function startMusic() {
    if (!ctx || musicPlaying) return;
    musicPlaying = true;
    function playChord() {
      if (!musicPlaying) return;
      const chord = CHORDS[chordIdx % CHORDS.length];
      chord.forEach(f => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = f;
        g.gain.setValueAtTime(0, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.03, ctx.currentTime+0.1);
        g.gain.linearRampToValueAtTime(0.015, ctx.currentTime+0.4);
        g.gain.linearRampToValueAtTime(0, ctx.currentTime+0.8);
        osc.connect(g); g.connect(musicGain);
        osc.start(); osc.stop(ctx.currentTime+0.9);
      });
      // Basse
      const bass = ctx.createOscillator();
      const bg = ctx.createGain();
      bass.type = 'square';
      bass.frequency.value = chord[0]/2;
      bg.gain.setValueAtTime(0.06, ctx.currentTime);
      bg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.7);
      bass.connect(bg); bg.connect(musicGain);
      bass.start(); bass.stop(ctx.currentTime+0.75);
      chordIdx++;
    }
    playChord();
    musicInterval = setInterval(playChord, 800);
  }

  function stopMusic() {
    musicPlaying = false;
    if (musicInterval) { clearInterval(musicInterval); musicInterval = null; }
  }

  // Dérapage
  function tireSqueal(intensity) {
    if (!ctx || intensity < 0.1) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 600 + intensity * 400;
    g.gain.value = Math.min(0.15, intensity * 0.3);
    osc.connect(g); g.connect(sfxGain);
    osc.start(); osc.stop(ctx.currentTime + 0.05);
  }

  return { init, resume, setMusicVol, setSfxVol, honk, nitroSound, crash, powerupSound,
           countdown, finishSound, startEngine, stopEngine, updateEngine,
           startRain, stopRain, startMusic, stopMusic, tireSqueal };
})();

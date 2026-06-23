/* ═══════════════════════════════════════════════════
   CAMERA.JS – Système de caméra multi-vues
═══════════════════════════════════════════════════ */

const Camera = (() => {
  const modes = ['follow','cockpit','hood','free'];
  let currentMode = 'follow';
  let freeAngle = 0;

  // État de la caméra
  const cam = {
    ox: 0, oy: 0,  // position monde (centre de vue)
    zoom: 1.0,
    targetZoom: 1.0,
    shakeX: 0, shakeY: 0,
    shakeMag: 0,
    followX: 0, followY: 0,
  };

  function setMode(mode) {
    if (modes.includes(mode)) currentMode = mode;
  }

  function cycleMode() {
    const idx = modes.indexOf(currentMode);
    currentMode = modes[(idx+1) % modes.length];
    showNotif(`📷 VUE: ${currentMode.toUpperCase()}`);
    return currentMode;
  }

  function shake(magnitude) {
    cam.shakeMag = Math.max(cam.shakeMag, magnitude);
  }

  function update(player, dt, canvas) {
    const dtS = dt/1000;
    const W = canvas.width, H = canvas.height;

    // Zoom selon vitesse
    const speedRatio = player.speed / player.def.maxSpeed;
    cam.targetZoom = lerp(1.2, 0.7, speedRatio);
    cam.zoom = lerp(cam.zoom, cam.targetZoom, dtS*3);
    cam.zoom = Math.max(0.5, Math.min(2.0, cam.zoom));

    if (currentMode === 'follow') {
      // Caméra qui suit la voiture avec légère inertie
      const lookAhead = 80 * speedRatio;
      const targetX = player.x + Math.cos(player.angle)*lookAhead;
      const targetY = player.y + Math.sin(player.angle)*lookAhead;
      cam.ox = lerp(cam.ox, targetX, dtS*5);
      cam.oy = lerp(cam.oy, targetY, dtS*5);

    } else if (currentMode === 'cockpit') {
      // Vue de dedans (position décalée vers l'avant)
      cam.ox = player.x + Math.cos(player.angle)*24;
      cam.oy = player.y + Math.sin(player.angle)*24;
      cam.zoom = 1.8;

    } else if (currentMode === 'hood') {
      // Vue capot
      cam.ox = player.x + Math.cos(player.angle)*32;
      cam.oy = player.y + Math.sin(player.angle)*32;
      cam.zoom = 1.4;

    } else if (currentMode === 'free') {
      // Vue libre avec touches
      cam.ox = lerp(cam.ox, player.x, dtS*1.5);
      cam.oy = lerp(cam.oy, player.y, dtS*1.5);
      cam.zoom = 0.6;
    }

    // Shake
    if (cam.shakeMag > 0.1) {
      cam.shakeX = (Math.random()-0.5)*cam.shakeMag;
      cam.shakeY = (Math.random()-0.5)*cam.shakeMag;
      cam.shakeMag *= 0.85;
    } else {
      cam.shakeX = cam.shakeY = 0;
      cam.shakeMag = 0;
    }

    // Limites monde
    const halfW = (W/2) / cam.zoom;
    const halfH = (H/2) / cam.zoom;
    cam.ox = Math.max(halfW, Math.min(MAP.W-halfW, cam.ox));
    cam.oy = Math.max(halfH, Math.min(MAP.H-halfH, cam.oy));
  }

  // Applique la transformation caméra au contexte
  function apply(ctx) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.translate(W/2 + cam.shakeX, H/2 + cam.shakeY);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.ox, -cam.oy);
  }

  // Rotation de la caméra pour vue cockpit/capot
  function applyWithRotation(ctx, player) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.translate(W/2 + cam.shakeX, H/2 + cam.shakeY);
    ctx.scale(cam.zoom, cam.zoom);
    if (currentMode === 'cockpit' || currentMode === 'hood') {
      ctx.rotate(-player.angle - Math.PI/2);
    }
    ctx.translate(-cam.ox, -cam.oy);
  }

  // Convertir coordonnées monde → écran
  function worldToScreen(wx, wy, canvas) {
    const W = canvas.width, H = canvas.height;
    return {
      x: (wx - cam.ox) * cam.zoom + W/2,
      y: (wy - cam.oy) * cam.zoom + H/2,
    };
  }

  function lerp(a,b,t) { return a+(b-a)*t; }

  function getMode() { return currentMode; }
  function get() { return cam; }

  return { update, apply, applyWithRotation, worldToScreen, cycleMode, setMode,
           getMode, get, shake };
})();

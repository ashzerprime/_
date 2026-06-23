/* ═══════════════════════════════════════════════════
   POWERUPS.JS – Bonus et power-ups
═══════════════════════════════════════════════════ */

const POWERUP_DEFS = [
  { type:'nitro',   emoji:'⚡', name:'SUPER NITRO',    color:'#00e5ff', duration:5000,
    apply: (car) => { car.nitro = Math.min(100, car.nitro+60); Audio.nitroSound(); } },
  { type:'repair',  emoji:'🔧', name:'RÉPARATION',     color:'#39ff14', duration:0,
    apply: (car) => { car.damage = Math.max(0, car.damage-50); } },
  { type:'shield',  emoji:'🛡', name:'BOUCLIER',       color:'#0097a7', duration:8000,
    apply: (car) => { car.shield = 8000; } },
  { type:'magnet',  emoji:'🧲', name:'AIMANT BONUS',   color:'#e91e63', duration:6000,
    apply: (car) => { car.activePowerups.push({type:'magnet',remaining:6000}); } },
  { type:'multi',   emoji:'✖',  name:'×2 SCORE',       color:'#ff9800', duration:10000,
    apply: (car) => { car.activePowerups.push({type:'multi',remaining:10000,value:2}); } },
  { type:'turbo',   emoji:'🚀', name:'TURBO LONGUE',   color:'#9c27b0', duration:12000,
    apply: (car) => { car.activePowerups.push({type:'turbo',remaining:12000}); car.speed*=1.3; } },
  { type:'slowtime',emoji:'⏳', name:'SLOW MOTION',    color:'#ffd700', duration:4000,
    apply: (car) => { car.activePowerups.push({type:'slowtime',remaining:4000}); } },
  { type:'fuel',    emoji:'⛽', name:'CARBURANT',      color:'#ff5722', duration:0,
    apply: (car) => { car.fuel = Math.min(100, car.fuel+50); } },
];

const activePowerupObjects = []; // powerups sur la piste

function spawnPowerups(count) {
  activePowerupObjects.length = 0;
  const positions = [
    {x:1600,y:600},{x:2500,y:1000},{x:2600,y:1800},
    {x:1600,y:2600},{x:900,y:2200},{x:450,y:1400},
    {x:1200,y:1100},{x:1800,y:1400},{x:1000,y:1800},
  ];
  for (let i=0;i<Math.min(count, positions.length);i++) {
    const def = POWERUP_DEFS[Math.floor(Math.random()*POWERUP_DEFS.length)];
    activePowerupObjects.push({
      ...positions[i],
      def,
      alive: true,
      respawnTimer: 0,
      pulse: 0,
    });
  }
}

function updatePowerupObjects(dt, cars, playerIdx) {
  for (const pu of activePowerupObjects) {
    pu.pulse += dt * 0.003;
    if (!pu.alive) {
      pu.respawnTimer -= dt;
      if (pu.respawnTimer <= 0) {
        pu.alive = true;
        pu.def = POWERUP_DEFS[Math.floor(Math.random()*POWERUP_DEFS.length)];
      }
      continue;
    }
    // Collision avec voitures
    for (let i=0;i<cars.length;i++) {
      const car = cars[i];
      if (!car || car.finished) continue;
      const d = Math.hypot(car.x-pu.x, car.y-pu.y);
      // Aimant
      const magnetRange = car.magnetActive ? 150 : 30;
      if (car.magnetActive && d < 150 && d > magnetRange*0.3) {
        // Attirer vers la voiture
        pu.x += (car.x-pu.x)*0.05;
        pu.y += (car.y-pu.y)*0.05;
      }
      if (d < magnetRange) {
        // Ramassage
        pu.alive = false;
        pu.respawnTimer = 15000;
        pu.def.apply(car);
        if (i === playerIdx) {
          showNotif(`${pu.def.emoji} ${pu.def.name} !`);
          Audio.powerupSound();
          updateHudPowerups(car);
        }
      }
    }
  }
}

function drawPowerups(ctx) {
  for (const pu of activePowerupObjects) {
    if (!pu.alive) continue;
    const r = 18 + Math.sin(pu.pulse)*3;
    // Halo
    const grad = ctx.createRadialGradient(pu.x,pu.y,0,pu.x,pu.y,r*2);
    grad.addColorStop(0, hexToRgba(pu.def.color, 0.4));
    grad.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(pu.x, pu.y, r*2, 0, Math.PI*2);
    ctx.fillStyle = grad;
    ctx.fill();
    // Corps
    ctx.beginPath();
    ctx.arc(pu.x, pu.y, r, 0, Math.PI*2);
    ctx.fillStyle = hexToRgba(pu.def.color, 0.85);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Emoji
    ctx.font = `${r*1.0}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText(pu.def.emoji, pu.x, pu.y+r*0.35);
    ctx.textAlign = 'left';
  }
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

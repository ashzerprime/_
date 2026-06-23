/* ═══════════════════════════════════════════════════
   AI.JS – Intelligence artificielle des adversaires
═══════════════════════════════════════════════════ */

const AI_DIFFICULTY = {
  easy:   { speedMult:0.70, reactionTime:200, mistakeRate:0.15 },
  medium: { speedMult:0.85, reactionTime:100, mistakeRate:0.07 },
  hard:   { speedMult:0.95, reactionTime:50,  mistakeRate:0.03 },
  expert: { speedMult:1.00, reactionTime:20,  mistakeRate:0.01 },
};

function createAICar(def, startX, startY, startAngle, colorOverride) {
  const car = createCar(def, startX, startY, startAngle);
  car.isAI = true;
  if (colorOverride) car.def = Object.assign({}, def, { color: colorOverride });
  // IA state
  car.ai = {
    targetPointIdx: 1,
    stuckTimer: 0,
    stuckX: 0, stuckY: 0,
    avoidTimer: 0,
    avoidDir: 0,
  };
  return car;
}

function updateAI(car, dt, difficulty, allCars, trackPoints) {
  if (car.finished) return;
  const diff = AI_DIFFICULTY[difficulty] || AI_DIFFICULTY.medium;
  const ai = car.ai;
  const dtS = dt/1000;

  // ── Cible : prochain point du circuit ────────────
  const target = trackPoints[ai.targetPointIdx % trackPoints.length];
  const dx = target.x - car.x;
  const dy = target.y - car.y;
  const dist = Math.hypot(dx, dy);

  // Avancer au checkpoint suivant
  if (dist < 80) {
    ai.targetPointIdx = (ai.targetPointIdx + 1) % (trackPoints.length - 1);
  }

  // ── Direction vers la cible ───────────────────
  const targetAngle = Math.atan2(dy, dx);
  let angleDiff = targetAngle - car.angle;
  // Normaliser
  while (angleDiff > Math.PI) angleDiff -= Math.PI*2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI*2;

  // ── Évitement des autres voitures ─────────────
  let avoidSteer = 0;
  for (const other of allCars) {
    if (other === car) continue;
    const od = Math.hypot(other.x-car.x, other.y-car.y);
    if (od < 80) {
      const oa = Math.atan2(other.y-car.y, other.x-car.x) - car.angle;
      const side = Math.sin(oa);
      avoidSteer -= side * (1-od/80) * 1.5;
    }
  }

  // ── Détection blocage ─────────────────────────
  const driftX = Math.abs(car.x - ai.stuckX);
  const driftY = Math.abs(car.y - ai.stuckY);
  if (driftX < 5 && driftY < 5 && car.throttle > 0) {
    ai.stuckTimer += dt;
    if (ai.stuckTimer > 2000) {
      // Reculer + tourner
      ai.avoidTimer = 1500;
      ai.avoidDir = Math.random() > 0.5 ? 1 : -1;
      ai.stuckTimer = 0;
    }
  } else {
    ai.stuckTimer = Math.max(0, ai.stuckTimer - dt);
  }
  ai.stuckX = car.x; ai.stuckY = car.y;

  // ── Commandes ─────────────────────────────────
  let steer = 0, throttle = 0, brake = 0;

  if (ai.avoidTimer > 0) {
    // Sortie de blocage
    ai.avoidTimer -= dt;
    throttle = 0; brake = 1;
    steer = ai.avoidDir * 0.8;
  } else {
    // Direction normale
    steer = Math.sign(angleDiff) * Math.min(1, Math.abs(angleDiff) / 0.4);
    steer = Math.max(-1, Math.min(1, steer + avoidSteer));

    // Erreur aléatoire IA
    if (Math.random() < diff.mistakeRate * dtS * 60) {
      steer += (Math.random()-0.5) * 0.5;
    }

    // Accélération
    throttle = dist > 200 ? 1 : 0.7;

    // Freinage dans les virages serrés
    if (Math.abs(angleDiff) > 0.6 && car.speed > 80) {
      brake = Math.min(1, (Math.abs(angleDiff)-0.6)*2);
      throttle = 0;
    }

    // Limite de vitesse artificielle
    if (car.speed > car.def.maxSpeed * diff.speedMult) {
      throttle = 0;
      if (car.speed > car.def.maxSpeed * diff.speedMult * 1.05) brake = 0.3;
    }
  }

  // ── Application aux commandes ─────────────────
  car.steer = steer;
  car.throttle = throttle * (car.fuel > 0 ? 1 : 0);
  car.brake = brake;
  car.handbrake = false;

  // Faux nitro IA
  if (Math.random() < 0.002 && car.nitro > 30) {
    car.nitro -= 10;
    car.speed = Math.min(car.def.maxSpeed, car.speed * 1.1);
  }

  // ── Physique simplifiée IA ─────────────────────
  const angVel = steer * car.def.turnRate * Math.min(1, car.speed/50);
  car.angle += angVel;

  const accel = throttle * car.def.accelRate * 0.9;
  const friction = 0.018;
  const brakeFrc = brake * car.def.brakePower;

  if (accel > 0 && car.fuel > 0) {
    car.speed = Math.min(car.def.maxSpeed*diff.speedMult, car.speed + accel*dtS*80);
  } else {
    car.speed = Math.max(0, car.speed - (friction+brakeFrc)*dtS*150);
  }

  car.x += Math.cos(car.angle)*car.speed*dtS;
  car.y += Math.sin(car.angle)*car.speed*dtS;

  // Limites
  car.x = Math.max(50, Math.min(MAP.W-50, car.x));
  car.y = Math.max(50, Math.min(MAP.H-50, car.y));

  // Carburant IA
  if (throttle > 0) car.fuel = Math.max(0, car.fuel-dtS*0.15);

  // Gear auto IA
  const g = car.def.gears;
  const s = Math.abs(car.speed);
  if (car.gear < 6 && s > g[car.gear]*0.95) car.gear++;
  if (car.gear > 1 && s < g[car.gear-1]*0.7) car.gear--;
}

// ── Police (mode poursuite) ────────────────────────
function createPoliceCar(x, y) {
  const policeDef = {
    ...CARS_DEF[1], // Berline
    color:'#1a3a8f', color2:'#102060', accentColor:'#ff0',
    id:'police', name:'POLICE', maxSpeed:220
  };
  const car = createCar(policeDef, x, y, 0);
  car.isAI = true;
  car.isPolice = true;
  car.ai = { targetPointIdx:0, stuckTimer:0, stuckX:0, stuckY:0, avoidTimer:0, avoidDir:0 };
  return car;
}

function updatePoliceAI(policeCar, target, dt) {
  const dtS = dt/1000;
  const dx = target.x - policeCar.x;
  const dy = target.y - policeCar.y;
  const dist = Math.hypot(dx,dy);
  const targetAngle = Math.atan2(dy,dx);
  let angleDiff = targetAngle - policeCar.angle;
  while (angleDiff > Math.PI) angleDiff -= Math.PI*2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI*2;

  policeCar.steer = Math.sign(angleDiff)*Math.min(1,Math.abs(angleDiff)/0.3);
  policeCar.angle += policeCar.steer * 0.055;
  policeCar.throttle = dist > 60 ? 1 : 0.3;

  if (dist > 60 && policeCar.fuel > 0) {
    policeCar.speed = Math.min(220, policeCar.speed + 0.4*dtS*80);
  } else {
    policeCar.speed = Math.max(0, policeCar.speed - 0.05*dtS*150);
  }
  policeCar.x += Math.cos(policeCar.angle)*policeCar.speed*dtS;
  policeCar.y += Math.sin(policeCar.angle)*policeCar.speed*dtS;

  // Capture ?
  return dist < 35;
}

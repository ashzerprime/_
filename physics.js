/* ═══════════════════════════════════════════════════
   PHYSICS.JS – Physique arcade réaliste
═══════════════════════════════════════════════════ */

// Crée un objet voiture (joueur ou IA)
function createCar(def, x, y, angle) {
  return {
    def,
    x, y,
    angle,         // radians
    speed: 0,      // vitesse scalaire (km/h)
    vx: 0, vy: 0,  // vecteur vitesse monde
    angularVel: 0, // vitesse de rotation
    // Transmission
    gear: 1,
    rpm: 800,
    // État
    throttle: 0,   // 0-1
    brake: 0,      // 0-1
    steer: 0,      // -1 à 1
    handbrake: false,
    // Effets
    drift: 0,      // intensité dérapage
    braking: false,
    lightsOn: false,
    blinkerLeft: false,
    blinkerRight: false,
    nitro: 0,      // stock nitro 0-100
    shield: 0,     // durée restante ms
    // Dégâts & carburant
    damage: 0,     // 0-100
    fuel: 100,     // 0-100
    // IA / course
    lapCount: 0,
    checkpoint: 0,
    lapTime: 0,
    bestLap: Infinity,
    totalDist: 0,
    lastPos: null,
    finished: false,
    position: 1,
    // Powerups
    activePowerups: [],
    shield: 0,
    // Bouclier, multiplicateur, etc.
    scoreMulti: 1,
    magnetActive: false,
    slowTimeActive: false,
  };
}

const PHYSICS = (() => {
  const FPS_TARGET = 60;
  const DT_FIXED = 1000/FPS_TARGET;

  function update(car, dt, keys, driveMode, gameMode) {
    const def = car.def;
    const dtS = dt / 1000; // secondes

    // ── Entrées ───────────────────────────────────
    car.throttle = keys.up ? 1 : 0;
    car.brake = keys.down ? 1 : 0;
    if (keys.nitro && car.nitro > 0) {
      car.throttle = Math.min(1, car.throttle + 0.8);
    }
    car.steer = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    car.handbrake = keys.handbrake || false;

    // ── Boîte de vitesse ─────────────────────────
    if (driveMode === 'auto') {
      autoGearShift(car, def);
    } else {
      // Manuel – monter/descendre
      if (keys.gearUp) { car.gear = Math.min(6, car.gear+1); keys.gearUp=false; }
      if (keys.gearDown) { car.gear = Math.max(1, car.gear-1); keys.gearDown=false; }
    }

    // ── Régime moteur ────────────────────────────
    const targetRpm = computeRpm(car, def);
    car.rpm += (targetRpm - car.rpm) * Math.min(1, dtS * 8);
    car.rpm = Math.max(800, Math.min(8500, car.rpm));

    // ── Force de propulsion ───────────────────────
    let driveForce = 0;
    if (car.throttle > 0 && car.fuel > 0) {
      const gearRatio = 1 + (car.gear-1)*0.3;
      driveForce = car.throttle * def.accelRate * gearRatio;
      // Nitro boost
      if (keys.nitro && car.nitro > 0) {
        driveForce *= 2.0;
        car.nitro = Math.max(0, car.nitro - dtS*20);
      }
    }

    // ── Freinage ─────────────────────────────────
    let brakeForce = 0;
    if (car.brake > 0) {
      brakeForce = car.brake * def.brakePower;
      car.braking = true;
    } else {
      car.braking = false;
    }

    // Recharge nitro
    if (!keys.nitro && !keys.up) {
      car.nitro = Math.min(100, car.nitro + dtS*4);
    }

    // ── Rotation / direction ─────────────────────
    const speedFactor = Math.min(1, Math.abs(car.speed) / 60);
    const steerPower = def.turnRate * speedFactor * car.steer;
    const driftFactor = getDriftFactor(car, def);

    car.angularVel = steerPower * (1 - driftFactor * 0.5);
    if (car.handbrake) car.angularVel *= 1.8; // frein à main amplifie dérapage

    car.angle += car.angularVel * Math.min(1, Math.abs(car.speed)/20);

    // ── Accélération scalaire ─────────────────────
    const targetSpeed = driveForce > 0
      ? Math.min(def.maxSpeed, car.speed + driveForce * dtS * 100)
      : car.speed;

    // Friction + frein
    let friction = 0.015 * def.dragCoeff;
    if (car.brake > 0) friction += brakeForce;

    // Terrain (hors route = plus de friction)
    const roadInfo = MAP.isOnRoad(car.x, car.y);
    if (!roadInfo.onRoad) {
      friction += 0.04;
      car.speed *= 0.97;
    }

    // Application accél / friction
    if (driveForce > 0 && car.fuel > 0) {
      car.speed = lerp(car.speed, targetSpeed, Math.min(1, dtS * 3));
    } else {
      car.speed = Math.max(0, car.speed - friction * dtS * 200);
    }

    // Marche arrière
    if (car.brake > 0 && car.speed < 2 && car.fuel > 0) {
      car.speed = -20; // marche arrière lente
    }
    if (car.speed < 0 && !car.brake) car.speed += friction * dtS * 100;

    // Limite vitesse max avec dégâts
    const dmgLimit = 1 - car.damage * 0.004;
    car.speed = Math.min(car.speed, def.maxSpeed * dmgLimit);

    // ── Dérapage ─────────────────────────────────
    car.drift = Math.max(0, car.drift - dtS*2);
    if (Math.abs(car.steer) > 0.5 && car.speed > 40) {
      const driftChance = (1 - def.stats.handling/100) * Math.abs(car.steer);
      car.drift = Math.min(1, car.drift + driftChance * dtS * 1.5);
    }
    if (car.handbrake && car.speed > 20) {
      car.drift = Math.min(1, car.drift + dtS * 3);
    }

    // ── Vecteur vitesse monde ─────────────────────
    const forwardX = Math.cos(car.angle);
    const forwardY = Math.sin(car.angle);
    const lateralX = -Math.sin(car.angle);
    const lateralY = Math.cos(car.angle);

    const forwardSpeed = car.speed;
    const lateralSpeed = car.angularVel * 8 * car.drift;

    car.vx = forwardX * forwardSpeed + lateralX * lateralSpeed;
    car.vy = forwardY * forwardSpeed + lateralY * lateralSpeed;

    // ── Position ─────────────────────────────────
    const prevX = car.x, prevY = car.y;
    car.x += car.vx * dtS;
    car.y += car.vy * dtS;

    // Limites du monde
    car.x = Math.max(50, Math.min(MAP.W-50, car.x));
    car.y = Math.max(50, Math.min(MAP.H-50, car.y));

    // Collision bâtiments
    const building = MAP.collidesWithBuilding(car.x, car.y, 20);
    if (building) {
      car.x = prevX; car.y = prevY;
      car.speed *= -0.3;
      const impact = Math.abs(car.speed) / def.maxSpeed;
      if (impact > 0.1) {
        car.damage = Math.min(100, car.damage + impact * 15);
        Audio.crash(impact);
      }
    }

    // ── Consommation carburant ────────────────────
    if (car.throttle > 0 && car.speed > 0 && gameMode !== 'explore') {
      car.fuel = Math.max(0, car.fuel - dtS * 0.3 * car.throttle);
    }

    // ── Distance parcourue ────────────────────────
    car.totalDist += Math.hypot(car.x-prevX, car.y-prevY) / 1000; // km

    // ── Powerups actifs update ────────────────────
    updatePowerups(car, dt);

    // ── Stats ──────────────────────────────────── 
    car.lapTime += dt;
  }

  function autoGearShift(car, def) {
    const g = def.gears;
    const s = Math.abs(car.speed);
    if (car.gear < 6 && s > g[car.gear]*0.95) car.gear++;
    if (car.gear > 1 && s < g[car.gear-1]*0.7) car.gear--;
  }

  function computeRpm(car, def) {
    const gearRatio = 1 + (car.gear-1)*0.4;
    const baseRpm = 800 + (car.speed/def.maxSpeed) * 7000 * gearRatio;
    if (car.throttle > 0) return Math.min(8500, baseRpm + car.throttle*1000);
    return Math.max(800, baseRpm - 500);
  }

  function getDriftFactor(car, def) {
    const handlingFactor = 1 - def.stats.handling/100;
    const speedFactor = Math.min(1, car.speed/100);
    return handlingFactor * speedFactor * 0.5;
  }

  function lerp(a,b,t) { return a+(b-a)*t; }

  // Collision voiture-voiture
  function checkCarCollision(a, b) {
    const d = Math.hypot(a.x-b.x, a.y-b.y);
    if (d < 36) {
      const angle = Math.atan2(b.y-a.y, b.x-a.x);
      const force = (36-d)/36;
      const massA = a.def.mass, massB = b.def.mass;
      const totalMass = massA+massB;

      // Échange de vitesse simplifié
      const aSpeedBefore = a.speed;
      const bSpeedBefore = b.speed;

      a.speed = (aSpeedBefore*(massA-massB)+2*massB*bSpeedBefore)/totalMass;
      b.speed = (bSpeedBefore*(massB-massA)+2*massA*aSpeedBefore)/totalMass;

      // Séparation
      a.x -= Math.cos(angle)*force*18;
      a.y -= Math.sin(angle)*force*18;
      b.x += Math.cos(angle)*force*18;
      b.y += Math.sin(angle)*force*18;

      // Dégâts
      const impact = force * 0.5;
      if (a.shield <= 0) a.damage = Math.min(100, a.damage+impact*10);
      if (b.shield <= 0) b.damage = Math.min(100, b.damage+impact*10);

      if (impact > 0.2) Audio.crash(impact * 0.5);
      return true;
    }
    return false;
  }

  function updatePowerups(car, dt) {
    car.shield = Math.max(0, car.shield-dt);
    // Powerups actifs avec durée
    car.activePowerups = car.activePowerups.filter(pu => {
      pu.remaining -= dt;
      return pu.remaining > 0;
    });
    car.magnetActive = car.activePowerups.some(p=>p.type==='magnet');
    car.slowTimeActive = car.activePowerups.some(p=>p.type==='slowtime');
    car.scoreMulti = car.activePowerups.reduce((m,p)=>p.type==='multi'?p.value:m, 1);
  }

  return { update, checkCarCollision, createCar: window.createCar };
})();

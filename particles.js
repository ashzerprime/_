/* ═══════════════════════════════════════════════════
   PARTICLES.JS – Système de particules & effets visuels
═══════════════════════════════════════════════════ */

const Particles = (() => {
  const pool = [];
  const skidMarks = []; // Traces de pneus (persistantes)
  const MAX_SKID = 2000;
  let sparkPool = [];

  function emit(x, y, options = {}) {
    const count = options.count || 8;
    for (let i = 0; i < count; i++) {
      const angle = (options.angle !== undefined ? options.angle : Math.random()*Math.PI*2)
                  + (Math.random()-0.5) * (options.spread || Math.PI*2);
      const speed = (options.speed || 60) * (0.5 + Math.random()*0.8);
      pool.push({
        x, y,
        vx: Math.cos(angle)*speed,
        vy: Math.sin(angle)*speed,
        life: 1.0,
        decay: options.decay || (0.015 + Math.random()*0.025),
        size: options.size || (3+Math.random()*4),
        color: options.color || '#ffffff',
        gravity: options.gravity || 0,
        type: options.type || 'circle',
        alpha: 1.0,
      });
    }
  }

  // Fumée de pneu
  function emitTireSmoke(x, y, angle, intensity) {
    if (intensity < 0.2) return;
    emit(x, y, {
      count: Math.floor(intensity*4),
      angle: angle + Math.PI + (Math.random()-0.5)*0.8,
      spread: 0.6,
      speed: 20 + intensity*30,
      size: 8 + intensity*12,
      color: `rgba(200,200,200,${0.3+intensity*0.3})`,
      decay: 0.008 + Math.random()*0.01,
      type: 'smoke',
    });
  }

  // Fumée d'échappement
  function emitExhaust(x, y, angle, throttle) {
    if (Math.random() > 0.3 || throttle < 0.3) return;
    emit(x, y, {
      count: 1,
      angle: angle + Math.PI,
      spread: 0.3,
      speed: 15,
      size: 5 + Math.random()*5,
      color: `rgba(100,100,100,${0.3+throttle*0.3})`,
      decay: 0.02,
      type: 'smoke',
    });
  }

  // Étincelles de collision
  function emitSparks(x, y, angle) {
    emit(x, y, {
      count: 12,
      angle,
      spread: 1.2,
      speed: 80 + Math.random()*80,
      size: 2+Math.random()*3,
      color: '#ffaa00',
      decay: 0.04,
      gravity: 100,
      type: 'spark',
    });
  }

  // Nitro particles
  function emitNitro(x, y, angle) {
    emit(x, y, {
      count: 3,
      angle: angle + Math.PI,
      spread: 0.4,
      speed: 40 + Math.random()*40,
      size: 6+Math.random()*6,
      color: Math.random()>0.5 ? '#00e5ff' : '#80ffff',
      decay: 0.04,
      type: 'nitro',
    });
  }

  // Trace de freinage au sol
  function addSkidMark(x, y, angle, drift) {
    if (drift < 0.15) return;
    if (skidMarks.length > MAX_SKID) skidMarks.shift();
    skidMarks.push({
      x, y, angle,
      alpha: Math.min(0.6, drift * 0.8),
      life: 1.0,
    });
  }

  // Ramassage powerup
  function emitPickup(x, y, color) {
    emit(x, y, {
      count: 16,
      spread: Math.PI*2,
      speed: 60,
      size: 4,
      color,
      decay: 0.025,
      type: 'star',
    });
  }

  function update(dt) {
    const dtS = dt/1000;
    for (let i = pool.length-1; i >= 0; i--) {
      const p = pool[i];
      p.x += p.vx * dtS;
      p.y += p.vy * dtS;
      p.vy += p.gravity * dtS;
      p.vx *= 0.97;
      p.vy *= 0.97;
      p.life -= p.decay;
      p.alpha = p.life;
      if (p.life <= 0) pool.splice(i,1);
    }
    // Fade skid marks
    for (const s of skidMarks) {
      s.life -= 0.0002;
    }
  }

  function draw(ctx) {
    // Traces de pneus (sous les voitures)
    for (const s of skidMarks) {
      if (s.life <= 0) continue;
      ctx.save();
      ctx.globalAlpha = s.alpha * s.life;
      ctx.fillStyle = '#111';
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      ctx.fillRect(-6, -2, 12, 4);
      ctx.restore();
    }

    // Particules
    for (const p of pool) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);

      if (p.type === 'smoke') {
        ctx.fillStyle = p.color;
        const sz = p.size * (2 - p.life);
        ctx.beginPath();
        ctx.arc(p.x, p.y, sz, 0, Math.PI*2);
        ctx.fill();

      } else if (p.type === 'spark') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size*0.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx*0.05, p.y - p.vy*0.05);
        ctx.stroke();

      } else if (p.type === 'nitro') {
        const grad = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.size);
        grad.addColorStop(0,'rgba(255,255,255,0.8)');
        grad.addColorStop(1,p.color);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size*(1+0.5*(1-p.life)), 0, Math.PI*2);
        ctx.fill();

      } else if (p.type === 'star') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
        ctx.fill();

      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size*p.life, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // Effets selon état voiture
  function updateCarEffects(car, dt) {
    const exhaustX = car.x - Math.cos(car.angle)*34;
    const exhaustY = car.y - Math.sin(car.angle)*34;

    // Exhaust
    emitExhaust(exhaustX, exhaustY, car.angle, car.throttle);

    // Fumée de pneu si dérapage
    if (car.drift > 0.15) {
      const tireL = { x: car.x + Math.cos(car.angle+Math.PI/2)*16, y: car.y + Math.sin(car.angle+Math.PI/2)*16 };
      const tireR = { x: car.x - Math.cos(car.angle+Math.PI/2)*16, y: car.y - Math.sin(car.angle+Math.PI/2)*16 };
      emitTireSmoke(tireL.x, tireL.y, car.angle, car.drift);
      emitTireSmoke(tireR.x, tireR.y, car.angle, car.drift);
      addSkidMark(tireL.x, tireL.y, car.angle, car.drift);
      addSkidMark(tireR.x, tireR.y, car.angle, car.drift);

      Audio.tireSqueal(car.drift * 0.5);
    }

    // Freinage intense
    if (car.braking && car.speed > 60) {
      const tireFL = { x: car.x + Math.cos(car.angle)*16 + Math.cos(car.angle+Math.PI/2)*16,
                       y: car.y + Math.sin(car.angle)*16 + Math.sin(car.angle+Math.PI/2)*16 };
      const tireFR = { x: car.x + Math.cos(car.angle)*16 - Math.cos(car.angle+Math.PI/2)*16,
                       y: car.y + Math.sin(car.angle)*16 - Math.sin(car.angle+Math.PI/2)*16 };
      emitTireSmoke(tireFL.x, tireFL.y, car.angle, 0.4);
      emitTireSmoke(tireFR.x, tireFR.y, car.angle, 0.4);
      addSkidMark(tireFL.x, tireFL.y, car.angle, 0.5);
      addSkidMark(tireFR.x, tireFR.y, car.angle, 0.5);
    }

    // Nitro
    if (car.throttle > 0.8 && car.nitro > 0) {
      emitNitro(exhaustX, exhaustY, car.angle);
    }

    // Dégâts – fumée noire
    if (car.damage > 60) {
      if (Math.random() < 0.3) {
        emitTireSmoke(car.x, car.y, car.angle, 0.3);
      }
    }
  }

  // Effet de vitesse (radial blur sur canvas)
  function drawSpeedLines(ctx, speed, maxSpeed) {
    const intensity = Math.max(0, (speed - 100) / maxSpeed);
    if (intensity < 0.05) return;
    const W = ctx.canvas.width, H = ctx.canvas.height;
    const cx = W/2, cy = H/2;
    ctx.save();
    ctx.globalAlpha = intensity * 0.3;
    for (let i=0;i<12;i++) {
      const a = (i/12)*Math.PI*2;
      const len = 60 + Math.random()*80;
      const x1 = cx + Math.cos(a)*W*0.4;
      const y1 = cy + Math.sin(a)*H*0.4;
      const x2 = cx + Math.cos(a)*(W*0.4+len);
      const y2 = cy + Math.sin(a)*(H*0.4+len);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1+Math.random()*2;
      ctx.beginPath();
      ctx.moveTo(x1,y1);
      ctx.lineTo(x2,y2);
      ctx.stroke();
    }
    ctx.restore();
  }

  return { emit, emitTireSmoke, emitSparks, emitNitro, emitPickup,
           addSkidMark, update, draw, drawSpeedLines, updateCarEffects };
})();

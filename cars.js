/* ═══════════════════════════════════════════════════
   CARS.JS – Définition et rendu des voitures
═══════════════════════════════════════════════════ */

const CARS_DEF = [
  {
    id:'speeder', name:'SPEEDER', type:'Sportive',
    color:'#e74c3c', color2:'#c0392b', accentColor:'#fff',
    stats:{ speed:85, accel:80, handling:75, braking:78, weight:70 },
    shape:'sport',
    maxSpeed:240, accelRate:0.35, brakePower:0.6, turnRate:0.048,
    mass:1.0, dragCoeff:0.92,
    gears:[0,35,75,120,170,210,240], unlocked:true
  },
  {
    id:'roadster', name:'ROADSTER', type:'Berline',
    color:'#3498db', color2:'#2980b9', accentColor:'#fff',
    stats:{ speed:70, accel:65, handling:80, braking:75, weight:75 },
    shape:'sedan',
    maxSpeed:200, accelRate:0.28, brakePower:0.55, turnRate:0.052,
    mass:1.1, dragCoeff:0.88,
    gears:[0,30,65,100,145,180,200], unlocked:true
  },
  {
    id:'phantom', name:'PHANTOM', type:'Supercar',
    color:'#9b59b6', color2:'#8e44ad', accentColor:'#f39c12',
    stats:{ speed:98, accel:95, handling:70, braking:85, weight:60 },
    shape:'supercar',
    maxSpeed:320, accelRate:0.55, brakePower:0.7, turnRate:0.042,
    mass:0.85, dragCoeff:0.96,
    gears:[0,50,100,160,230,285,320], unlocked:false, xpRequired:2000
  },
  {
    id:'bulldog', name:'BULLDOG', type:'Muscle Car',
    color:'#e67e22', color2:'#d35400', accentColor:'#fff',
    stats:{ speed:90, accel:90, handling:55, braking:65, weight:85 },
    shape:'muscle',
    maxSpeed:270, accelRate:0.48, brakePower:0.52, turnRate:0.038,
    mass:1.3, dragCoeff:0.85,
    gears:[0,45,90,140,200,250,270], unlocked:false, xpRequired:1500
  },
  {
    id:'titan', name:'TITAN', type:'SUV',
    color:'#27ae60', color2:'#229954', accentColor:'#fff',
    stats:{ speed:60, accel:55, handling:60, braking:70, weight:95 },
    shape:'suv',
    maxSpeed:180, accelRate:0.22, brakePower:0.48, turnRate:0.04,
    mass:1.6, dragCoeff:0.78,
    gears:[0,28,55,90,130,160,180], unlocked:false, xpRequired:500
  },
  {
    id:'viper', name:'VIPER', type:'Supercar',
    color:'#1abc9c', color2:'#16a085', accentColor:'#f1c40f',
    stats:{ speed:96, accel:92, handling:82, braking:88, weight:65 },
    shape:'supercar',
    maxSpeed:310, accelRate:0.52, brakePower:0.72, turnRate:0.046,
    mass:0.9, dragCoeff:0.97,
    gears:[0,48,95,155,220,275,310], unlocked:false, xpRequired:3000
  },
];

const AI_COLORS = ['#e74c3c','#3498db','#f39c12','#9b59b6','#1abc9c'];

// ── RENDU VOITURE (Canvas 2D) ──────────────────────
function drawCar(ctx, car, isPlayer) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);

  const def = car.def;
  const L = 32, W2 = 16; // longueur/largeur de base

  // Ombre
  ctx.save();
  ctx.translate(4, 4);
  ctx.globalAlpha = 0.3;
  drawCarBody(ctx, def, L, W2, '#000', '#000', '#000');
  ctx.restore();
  ctx.globalAlpha = 1;

  // Corps principal
  drawCarBody(ctx, def, L, W2, def.color, def.color2, def.accentColor);

  // Reflets (vitesse)
  if (car.speed > 80) {
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#fff';
    ctx.fillRect(-L*0.4, -W2*0.5, L*0.3, W2*0.4);
    ctx.globalAlpha = 1;
  }

  // Feux avant
  ctx.fillStyle = car.lightsOn ? '#ffee88' : '#ffffaa';
  ctx.globalAlpha = car.lightsOn ? 1 : 0.5;
  ctx.fillRect(L-6, -W2+4, 6, 5);
  ctx.fillRect(L-6, W2-9, 6, 5);

  // Feux arrière
  ctx.fillStyle = car.braking ? '#f00' : '#800';
  ctx.globalAlpha = 1;
  ctx.fillRect(-L+1, -W2+4, 6, 5);
  ctx.fillRect(-L+1, W2-9, 6, 5);

  // Clignotants
  if (car.blinkerLeft && Math.floor(Date.now()/300)%2===0) {
    ctx.fillStyle = '#ff8800';
    ctx.fillRect(-L+1, W2-9, 4, 4);
  }
  if (car.blinkerRight && Math.floor(Date.now()/300)%2===0) {
    ctx.fillStyle = '#ff8800';
    ctx.fillRect(-L+1, -W2+4, 4, 4);
  }

  // Bouclier (powerup)
  if (car.shield > 0) {
    ctx.strokeStyle = `rgba(0,229,255,${0.4+0.3*Math.sin(Date.now()*0.01)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, L*1.3, W2*1.6, 0, 0, Math.PI*2);
    ctx.stroke();
  }

  // Plaque joueur
  if (isPlayer) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(-6,-2,12,6);
    ctx.fillStyle = '#000';
    ctx.font = '4px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('YOU', 0, 3);
    ctx.textAlign = 'left';
  }

  ctx.restore();
}

function drawCarBody(ctx, def, L, W2, c1, c2, ca) {
  const shape = def.shape;

  if (shape === 'supercar') {
    // Forme très basse et anguleuse
    ctx.fillStyle = c1;
    ctx.beginPath();
    ctx.moveTo(L, 0);
    ctx.lineTo(L*0.7, -W2);
    ctx.lineTo(-L*0.6, -W2*0.9);
    ctx.lineTo(-L, -W2*0.6);
    ctx.lineTo(-L, W2*0.6);
    ctx.lineTo(-L*0.6, W2*0.9);
    ctx.lineTo(L*0.7, W2);
    ctx.closePath();
    ctx.fill();
    // Capot
    ctx.fillStyle = c2;
    ctx.beginPath();
    ctx.moveTo(L, 0);
    ctx.lineTo(L*0.6, -W2*0.7);
    ctx.lineTo(L*0.1, -W2*0.7);
    ctx.lineTo(-L*0.1, 0);
    ctx.lineTo(L*0.1, W2*0.7);
    ctx.lineTo(L*0.6, W2*0.7);
    ctx.closePath();
    ctx.fill();
    // Vitre
    ctx.fillStyle = 'rgba(100,180,255,0.5)';
    ctx.fillRect(-L*0.1, -W2*0.55, L*0.4, W2*1.1);

  } else if (shape === 'muscle') {
    // Forme longue et large
    ctx.fillStyle = c1;
    ctx.beginPath();
    ctx.moveTo(L, -W2*0.7);
    ctx.lineTo(L, W2*0.7);
    ctx.lineTo(-L, W2);
    ctx.lineTo(-L, -W2);
    ctx.closePath();
    ctx.fill();
    // Capot bosselé
    ctx.fillStyle = c2;
    ctx.fillRect(L*0.2, -W2*0.5, L*0.6, W2);
    // Stripes
    ctx.fillStyle = ca;
    ctx.globalAlpha = 0.15;
    ctx.fillRect(-L*0.8, -W2*0.15, L*1.6, W2*0.3);
    ctx.globalAlpha = 1;
    // Vitre
    ctx.fillStyle = 'rgba(100,180,255,0.4)';
    ctx.fillRect(-L*0.05, -W2*0.6, L*0.35, W2*1.2);

  } else if (shape === 'suv') {
    // Forme haute et carrée
    ctx.fillStyle = c1;
    ctx.beginPath();
    ctx.roundRect(-L, -W2, L*2, W2*2, 4);
    ctx.fill();
    // Carrosserie
    ctx.fillStyle = c2;
    ctx.fillRect(L*0.2, -W2, L*0.7, W2*2);
    // Vitre panoramique
    ctx.fillStyle = 'rgba(100,180,255,0.4)';
    ctx.fillRect(-L*0.15, -W2*0.75, L*0.5, W2*1.5);

  } else if (shape === 'sport') {
    // Sportive classique
    ctx.fillStyle = c1;
    ctx.beginPath();
    ctx.moveTo(L, -W2*0.5);
    ctx.lineTo(L, W2*0.5);
    ctx.lineTo(-L*0.8, W2);
    ctx.lineTo(-L, W2*0.7);
    ctx.lineTo(-L, -W2*0.7);
    ctx.lineTo(-L*0.8, -W2);
    ctx.closePath();
    ctx.fill();
    // Capot
    ctx.fillStyle = c2;
    ctx.beginPath();
    ctx.moveTo(L, -W2*0.4);
    ctx.lineTo(L, W2*0.4);
    ctx.lineTo(L*0.1, W2*0.6);
    ctx.lineTo(-L*0.1, W2*0.6);
    ctx.lineTo(-L*0.1, -W2*0.6);
    ctx.lineTo(L*0.1, -W2*0.6);
    ctx.closePath();
    ctx.fill();
    // Vitre
    ctx.fillStyle = 'rgba(100,180,255,0.45)';
    ctx.fillRect(-L*0.1, -W2*0.55, L*0.4, W2*1.1);

  } else {
    // Berline standard
    ctx.fillStyle = c1;
    ctx.beginPath();
    ctx.moveTo(L, -W2*0.6);
    ctx.lineTo(L, W2*0.6);
    ctx.lineTo(-L*0.9, W2*0.85);
    ctx.lineTo(-L, W2*0.65);
    ctx.lineTo(-L, -W2*0.65);
    ctx.lineTo(-L*0.9, -W2*0.85);
    ctx.closePath();
    ctx.fill();
    // Toit
    ctx.fillStyle = c2;
    ctx.fillRect(-L*0.2, -W2*0.7, L*0.55, W2*1.4);
    // Vitre
    ctx.fillStyle = 'rgba(100,180,255,0.4)';
    ctx.fillRect(-L*0.15, -W2*0.6, L*0.45, W2*1.2);
  }

  // Roues (communes)
  ctx.fillStyle = '#111';
  const wheelPositions = [
    [L*0.55, -W2-2],[L*0.55, W2+2],
    [-L*0.55, -W2-2],[-L*0.55, W2+2]
  ];
  for (const [wx,wy] of wheelPositions) {
    ctx.beginPath();
    ctx.ellipse(wx, wy, 7, 5, 0, 0, Math.PI*2);
    ctx.fill();
    // Jante
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(wx, wy, 4, 3, 0, 0, Math.PI*2);
    ctx.stroke();
  }
}

// Prévisualisation dans le menu
function drawCarPreview(canvas, def, angle) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);

  // Fond
  const grad = ctx.createLinearGradient(0,0,W,H);
  grad.addColorStop(0,'#0d1117');
  grad.addColorStop(1,'#1a1a2e');
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,W,H);

  // Sol reflet
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  ctx.fillRect(0,H/2,W,H/2);

  ctx.save();
  ctx.translate(W/2, H/2);

  const scale = 2.8;
  ctx.scale(scale,scale);
  ctx.rotate(angle || 0);

  // Ombre sol
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(2, 20, 30, 8, 0, 0, Math.PI*2);
  ctx.fill();

  // Voiture
  const fakeCar = { def, speed:0, lightsOn:false, braking:false,
                    blinkerLeft:false, blinkerRight:false, shield:0 };
  drawCarBody(ctx, def, 32, 16, def.color, def.color2, def.accentColor);

  ctx.restore();

  // Nom
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(def.name, W/2, H-36);
  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#888';
  ctx.fillText(def.type, W/2, H-20);
  ctx.textAlign = 'left';
}

// Carte mini voiture
function drawCarCard(canvas, def) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);
  ctx.save();
  ctx.translate(W/2, H/2);
  const s = 1.6;
  ctx.scale(s,s);
  ctx.rotate(-0.3);
  drawCarBody(ctx, def, 32, 16, def.color, def.color2, def.accentColor);
  ctx.restore();
}

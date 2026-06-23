/* ═══════════════════════════════════════════════════
   MAP.JS – Génération et rendu de la carte urbaine
═══════════════════════════════════════════════════ */

const MAP = (() => {
  // Taille du monde
  const W = 3200, H = 3200;

  // ── CIRCUIT (points de passage checkpoints) ──────
  // Piste principale : route ovale urbaine avec variantes
  const TRACK_POINTS = [
    {x:600,y:600},{x:1000,y:400},{x:1600,y:350},{x:2200,y:400},
    {x:2600,y:600},{x:2700,y:1000},{x:2700,y:1600},{x:2600,y:2000},
    {x:2400,y:2400},{x:2000,y:2600},{x:1600,y:2700},{x:1200,y:2600},
    {x:800,y:2400},{x:500,y:2000},{x:400,y:1600},{x:400,y:1000},
    {x:600,y:600}
  ];

  // Checkpoints pour la course (sous-ensemble des points)
  const CHECKPOINTS = [
    {x:600,y:600,w:80,h:200},    // Start/Finish
    {x:2200,y:400,w:200,h:80},
    {x:2700,y:1600,w:80,h:200},
    {x:1600,y:2700,w:200,h:80},
    {x:400,y:1600,w:80,h:200},
  ];

  // ── ÉLÉMENTS DE LA MAP ──────────────────────────
  const buildings = [];
  const trees = [];
  const streetLights = [];
  const trafficLights = [];
  const signs = [];
  const parkings = [];
  const gasStations = [];

  let trackPath = null; // Path2D du circuit

  // Génère tous les éléments statiques
  function generate() {
    // Bâtiments – zones entre les routes
    const bldgZones = [
      {x:700,y:700,w:400,h:300,rows:2,cols:3},
      {x:1200,y:500,w:300,h:200,rows:1,cols:2},
      {x:1700,y:500,w:400,h:250,rows:2,cols:3},
      {x:700,y:1100,w:250,h:300,rows:2,cols:2},
      {x:1100,y:1000,w:500,h:400,rows:3,cols:4},
      {x:1700,y:1100,w:400,h:350,rows:2,cols:3},
      {x:2200,y:700,w:300,h:300,rows:2,cols:2},
      {x:700,y:1600,w:300,h:350,rows:2,cols:2},
      {x:1100,y:1600,w:600,h:400,rows:3,cols:4},
      {x:1800,y:1600,w:400,h:350,rows:2,cols:3},
      {x:700,y:2100,w:350,h:250,rows:2,cols:3},
      {x:1200,y:2100,w:500,h:350,rows:3,cols:3},
      {x:1800,y:2100,w:350,h:300,rows:2,cols:2},
      {x:2200,y:1200,w:300,h:600,rows:4,cols:2},
    ];

    for (const zone of bldgZones) {
      const cw = Math.floor(zone.w / zone.cols);
      const rh = Math.floor(zone.h / zone.rows);
      for (let r=0;r<zone.rows;r++) {
        for (let c=0;c<zone.cols;c++) {
          const margin = 8 + Math.random()*12;
          const bx = zone.x + c*cw + margin;
          const by = zone.y + r*rh + margin;
          const bw = cw - margin*2;
          const bh = rh - margin*2;
          const height = 30 + Math.floor(Math.random()*80);
          const palette = ['#1a2744','#1e3a5f','#1a1a2e','#2d1b4e','#0d2b3e','#1c2e1c','#3b1a1a'];
          const color = palette[Math.floor(Math.random()*palette.length)];
          buildings.push({ x:bx, y:by, w:bw, h:bh, height, color,
            windows: Math.random() > 0.3,
            roof: Math.random() > 0.5 ? 'flat' : 'angular' });
        }
      }
    }

    // Arbres le long des routes
    const treePositions = [];
    for (let i=0;i<TRACK_POINTS.length-1;i++) {
      const a = TRACK_POINTS[i], b = TRACK_POINTS[i+1];
      const dist = Math.hypot(b.x-a.x, b.y-a.y);
      const steps = Math.floor(dist/80);
      for (let s=0;s<steps;s++) {
        const t = s/steps;
        const tx = a.x + (b.x-a.x)*t;
        const ty = a.y + (b.y-a.y)*t;
        const nx = -(b.y-a.y)/dist, ny = (b.x-a.x)/dist;
        for (const side of [-1,1]) {
          if (Math.random() > 0.5) {
            trees.push({ x: tx+nx*side*80, y: ty+ny*side*80,
              r: 12+Math.random()*10, color: Math.random()>0.2?'#1a5c1a':'#2d8b2d' });
          }
        }
      }
    }

    // Lampadaires
    for (let i=0;i<TRACK_POINTS.length-1;i++) {
      const a = TRACK_POINTS[i], b = TRACK_POINTS[i+1];
      const dist = Math.hypot(b.x-a.x, b.y-a.y);
      const steps = Math.floor(dist/150);
      for (let s=0;s<steps;s++) {
        const t = s/steps;
        const tx = a.x + (b.x-a.x)*t;
        const ty = a.y + (b.y-a.y)*t;
        const nx = -(b.y-a.y)/dist, ny = (b.x-a.x)/dist;
        streetLights.push({ x: tx+nx*65, y: ty+ny*65 });
      }
    }

    // Feux de signalisation aux intersections
    trafficLights.push(
      { x:960, y:550, state:'green', timer:0, phase:0 },
      { x:2200, y:550, state:'red', timer:1500, phase:1 },
      { x:2650, y:1000, state:'green', timer:0, phase:0 },
      { x:1000, y:2550, state:'red', timer:1200, phase:1 },
    );

    // Stations-service
    gasStations.push(
      { x:1550, y:800, w:120, h:80 },
      { x:2100, y:2300, w:120, h:80 }
    );

    // Panneaux
    signs.push(
      { x:700, y:650, text:'URBAN RUSH', dir:'right' },
      { x:2500, y:700, text:'SPEED ZONE', dir:'left' },
      { x:2650, y:2000, text:'NO LIMIT', dir:'up' },
    );
  }

  // ── RENDU ─────────────────────────────────────────
  function drawBackground(ctx, cam) {
    const { ox, oy, zoom } = cam;
    ctx.save();
    // Sol général – asphalte
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0,0,ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  }

  function drawMap(ctx, cam, dayNight, weather) {
    const {ox,oy,zoom} = cam;
    ctx.save();
    ctx.translate(ctx.canvas.width/2, ctx.canvas.height/2);
    ctx.scale(zoom,zoom);
    ctx.translate(-ox,-oy);

    // Fond sol (herbe/terre)
    ctx.fillStyle = '#1a2a1a';
    ctx.fillRect(0,0,W,H);

    // Routes larges (fond sombre)
    drawRoads(ctx);

    // Bâtiments (ombre puis corps)
    drawBuildings(ctx, dayNight);

    // Éléments déco
    drawTrees(ctx);
    drawStreetLights(ctx, dayNight);
    drawGasStations(ctx);
    drawSigns(ctx);
    drawParkings(ctx);

    // Marquages au sol
    drawRoadMarkings(ctx);

    // Feux
    drawTrafficLights(ctx);

    // Ligne départ/arrivée
    drawStartLine(ctx);

    // Checkpoints (semi-transparents)
    drawCheckpoints(ctx);

    ctx.restore();
  }

  function drawRoads(ctx) {
    // Dessiner les routes en suivant le circuit
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Ombre de route
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 92;
    drawTrackPath(ctx);

    // Route principale
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 84;
    drawTrackPath(ctx);

    // Bandes latérales blanches
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 86;
    ctx.setLineDash([]);
    drawTrackPath(ctx);

    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 80;
    drawTrackPath(ctx);

    // Route secondaire (ruelle de raccourci)
    ctx.strokeStyle = '#252525';
    ctx.lineWidth = 40;
    ctx.beginPath();
    ctx.moveTo(1100, 900);
    ctx.lineTo(1600, 900);
    ctx.lineTo(1600, 1300);
    ctx.lineTo(1100, 1300);
    ctx.lineTo(1100, 900);
    ctx.stroke();
  }

  function drawTrackPath(ctx) {
    ctx.beginPath();
    ctx.moveTo(TRACK_POINTS[0].x, TRACK_POINTS[0].y);
    for (let i=1;i<TRACK_POINTS.length;i++) {
      const prev = TRACK_POINTS[i-1];
      const curr = TRACK_POINTS[i];
      const cpx = (prev.x+curr.x)/2;
      const cpy = (prev.y+curr.y)/2;
      ctx.quadraticCurveTo(prev.x, prev.y, cpx, cpy);
    }
    ctx.closePath();
    ctx.stroke();
  }

  function drawRoadMarkings(ctx) {
    // Lignes centrales jaunes
    ctx.strokeStyle = '#ffc200';
    ctx.lineWidth = 3;
    ctx.setLineDash([30,20]);
    ctx.lineDashOffset = 0;
    drawTrackPath(ctx);
    ctx.setLineDash([]);

    // Bordures blanches de la route
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    // Les marquages sont intégrés dans le rendu de la piste
  }

  function drawBuildings(ctx, dayNight) {
    const night = dayNight < 0.5;
    for (const b of buildings) {
      // Ombre portée
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(b.x+6, b.y+6, b.w, b.h);

      // Corps
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);

      // Bord supérieur (effet 3D léger)
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(b.x, b.y, b.w, 4);
      ctx.fillRect(b.x, b.y, 4, b.h);

      // Fenêtres
      if (b.windows) {
        const ww = 8, wh = 10, mgx = 6, mgy = 8;
        const cols = Math.floor((b.w - mgx*2) / (ww+mgx));
        const rows = Math.floor((b.h - mgy*2) / (wh+mgy));
        for (let r=0;r<rows;r++) {
          for (let c=0;c<cols;c++) {
            const lit = night ? Math.random() > 0.3 : Math.random() > 0.8;
            if (lit) {
              ctx.fillStyle = night ? `rgba(255,220,100,${0.4+Math.random()*0.4})` : 'rgba(200,220,255,0.15)';
              ctx.fillRect(b.x+mgx+c*(ww+mgx), b.y+mgy+r*(wh+mgy), ww, wh);
            }
          }
        }
      }

      // Toit
      if (b.roof === 'angular') {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x+b.w/2, b.y-12);
        ctx.lineTo(b.x+b.w, b.y);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  function drawTrees(ctx) {
    for (const t of trees) {
      // Ombre
      ctx.beginPath();
      ctx.ellipse(t.x+4, t.y+4, t.r*0.8, t.r*0.4, 0, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fill();
      // Feuillage
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI*2);
      ctx.fillStyle = t.color;
      ctx.fill();
      // Reflet
      ctx.beginPath();
      ctx.arc(t.x-t.r*0.3, t.y-t.r*0.3, t.r*0.3, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fill();
    }
  }

  function drawStreetLights(ctx, dayNight) {
    const night = dayNight < 0.5;
    for (const sl of streetLights) {
      // Poteau
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sl.x, sl.y+10);
      ctx.lineTo(sl.x, sl.y-20);
      ctx.lineTo(sl.x+8, sl.y-26);
      ctx.stroke();
      // Ampoule
      ctx.beginPath();
      ctx.arc(sl.x+8, sl.y-26, 4, 0, Math.PI*2);
      ctx.fillStyle = night ? '#ffee88' : '#aaa';
      ctx.fill();
      // Halo nocturne
      if (night) {
        const grad = ctx.createRadialGradient(sl.x+8,sl.y-26,0,sl.x+8,sl.y-26,60);
        grad.addColorStop(0,'rgba(255,230,100,0.15)');
        grad.addColorStop(1,'transparent');
        ctx.beginPath();
        ctx.arc(sl.x+8,sl.y-26,60,0,Math.PI*2);
        ctx.fillStyle = grad;
        ctx.fill();
      }
    }
  }

  function drawTrafficLights(ctx) {
    for (const tl of trafficLights) {
      // Poteau
      ctx.fillStyle = '#333';
      ctx.fillRect(tl.x-3, tl.y-10, 6, 30);
      // Boitier
      ctx.fillStyle = '#222';
      ctx.fillRect(tl.x-8, tl.y-30, 16, 28);
      // Feux
      const colors = [{c:tl.state==='red'?'#f00':'#400',y:tl.y-26},
                      {c:tl.state==='yellow'?'#ff0':'#440',y:tl.y-19},
                      {c:tl.state==='green'?'#0f0':'#040',y:tl.y-12}];
      for (const cl of colors) {
        ctx.beginPath();
        ctx.arc(tl.x, cl.y, 5, 0, Math.PI*2);
        ctx.fillStyle = cl.c;
        ctx.fill();
      }
    }
  }

  function drawGasStations(ctx) {
    for (const g of gasStations) {
      // Sol station
      ctx.fillStyle = '#222';
      ctx.fillRect(g.x-10, g.y-10, g.w+20, g.h+20);
      // Auvent
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(g.x, g.y, g.w, g.h);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('⛽ GAS', g.x+20, g.y+g.h/2+4);
      // Pompes
      ctx.fillStyle = '#555';
      ctx.fillRect(g.x+10, g.y+20, 12, 30);
      ctx.fillRect(g.x+g.w-22, g.y+20, 12, 30);
    }
  }

  function drawSigns(ctx) {
    for (const s of signs) {
      ctx.fillStyle = '#1e3a5f';
      const tw = s.text.length*6+16;
      ctx.fillRect(s.x, s.y-16, tw, 22);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(s.x, s.y-16, tw, 22);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(s.text, s.x+8, s.y);
    }
  }

  function drawParkings(ctx) {
    const areas = [
      {x:800,y:1950,w:180,h:120},{x:2050,y:800,w:150,h:100}
    ];
    for (const p of areas) {
      ctx.fillStyle = '#1f1f2e';
      ctx.fillRect(p.x,p.y,p.w,p.h);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      // Lignes de parking
      const cols = Math.floor(p.w/25);
      for (let c=0;c<=cols;c++) {
        ctx.beginPath();
        ctx.moveTo(p.x+c*25, p.y+8);
        ctx.lineTo(p.x+c*25, p.y+p.h-8);
        ctx.globalAlpha = 0.3;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillText('P', p.x+p.w/2-5, p.y+p.h/2+6);
    }
  }

  function drawStartLine(ctx) {
    const sp = TRACK_POINTS[0];
    // Ligne à damier
    const TILE = 8, N = 10;
    for (let r=0;r<2;r++) {
      for (let c=0;c<N;c++) {
        ctx.fillStyle = (r+c)%2===0 ? '#fff' : '#000';
        ctx.fillRect(sp.x-N*TILE/2+c*TILE, sp.y-TILE+r*TILE, TILE, TILE);
      }
    }
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#ff0';
    ctx.textAlign = 'center';
    ctx.fillText('START / FINISH', sp.x, sp.y+20);
    ctx.textAlign = 'left';
  }

  function drawCheckpoints(ctx) {
    for (let i=1;i<CHECKPOINTS.length;i++) {
      const cp = CHECKPOINTS[i];
      ctx.fillStyle = 'rgba(0,229,255,0.1)';
      ctx.strokeStyle = 'rgba(0,229,255,0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5,5]);
      ctx.fillRect(cp.x-cp.w/2, cp.y-cp.h/2, cp.w, cp.h);
      ctx.strokeRect(cp.x-cp.w/2, cp.y-cp.h/2, cp.w, cp.h);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(0,229,255,0.8)';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`CP${i}`, cp.x, cp.y+4);
      ctx.textAlign = 'left';
    }
  }

  // Overlay météo / heure
  function drawWeatherOverlay(ctx, weather, dayNight) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    // Overlay nuit
    if (dayNight < 0.5) {
      const alpha = 0.4 * (1 - dayNight*2);
      ctx.fillStyle = `rgba(0,0,20,${alpha})`;
      ctx.fillRect(0,0,W,H);
    }
    // Pluie
    if (weather === 'rain') {
      ctx.strokeStyle = 'rgba(150,200,255,0.4)';
      ctx.lineWidth = 1;
      for (let i=0;i<80;i++) {
        const rx = Math.random()*W, ry = Math.random()*H;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx-4, ry+12);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(100,150,255,0.05)';
      ctx.fillRect(0,0,W,H);
    }
    // Brouillard
    if (weather === 'fog') {
      const grad = ctx.createRadialGradient(W/2,H/2,100,W/2,H/2,W);
      grad.addColorStop(0,'transparent');
      grad.addColorStop(1,'rgba(180,200,200,0.5)');
      ctx.fillStyle = grad;
      ctx.fillRect(0,0,W,H);
    }
  }

  // Update feux
  function update(dt) {
    for (const tl of trafficLights) {
      tl.timer += dt;
      if (tl.state === 'green' && tl.timer > 3000) { tl.state='yellow'; tl.timer=0; }
      else if (tl.state === 'yellow' && tl.timer > 800) { tl.state='red'; tl.timer=0; }
      else if (tl.state === 'red' && tl.timer > 3000) { tl.state='green'; tl.timer=0; }
    }
  }

  // Mini-map rendu
  function drawMinimap(mCtx, cars, playerIdx) {
    const W = mCtx.canvas.width, H = mCtx.canvas.height;
    mCtx.clearRect(0,0,W,H);
    mCtx.save();

    // Fond
    mCtx.fillStyle = 'rgba(0,0,0,0.7)';
    mCtx.beginPath(); mCtx.arc(W/2,H/2,W/2,0,Math.PI*2); mCtx.fill();

    // Scale
    const sx = (W-20) / MAP_SIZE.w;
    const sy = (H-20) / MAP_SIZE.h;
    mCtx.translate(10,10);

    // Route
    mCtx.strokeStyle = '#444'; mCtx.lineWidth = 4;
    mCtx.beginPath();
    mCtx.moveTo(TRACK_POINTS[0].x*sx, TRACK_POINTS[0].y*sy);
    for (let i=1;i<TRACK_POINTS.length;i++) {
      mCtx.lineTo(TRACK_POINTS[i].x*sx, TRACK_POINTS[i].y*sy);
    }
    mCtx.closePath(); mCtx.stroke();

    // Voitures IA
    for (let i=0;i<cars.length;i++) {
      if (i === playerIdx) continue;
      const c = cars[i];
      mCtx.beginPath();
      mCtx.arc(c.x*sx, c.y*sy, 4, 0, Math.PI*2);
      mCtx.fillStyle = '#f00';
      mCtx.fill();
    }
    // Joueur
    if (cars[playerIdx]) {
      const p = cars[playerIdx];
      mCtx.beginPath();
      mCtx.arc(p.x*sx, p.y*sy, 5, 0, Math.PI*2);
      mCtx.fillStyle = '#0f0';
      mCtx.fill();
      // Direction
      mCtx.strokeStyle = '#0f0'; mCtx.lineWidth = 2;
      mCtx.beginPath();
      mCtx.moveTo(p.x*sx, p.y*sy);
      mCtx.lineTo(p.x*sx+Math.cos(p.angle)*12, p.y*sy+Math.sin(p.angle)*12);
      mCtx.stroke();
    }

    mCtx.restore();

    // Masque circulaire
    mCtx.globalCompositeOperation = 'destination-in';
    mCtx.beginPath(); mCtx.arc(W/2,H/2,W/2,0,Math.PI*2);
    mCtx.fillStyle = '#fff'; mCtx.fill();
    mCtx.globalCompositeOperation = 'source-over';
  }

  // Collision avec le bord de route (simplifié)
  function isOnRoad(x, y) {
    // Vérifier si proche de la piste (distance au point le plus proche)
    for (let i=0;i<TRACK_POINTS.length-1;i++) {
      const a = TRACK_POINTS[i], b = TRACK_POINTS[i+1];
      const t = Math.max(0, Math.min(1,
        ((x-a.x)*(b.x-a.x)+(y-a.y)*(b.y-a.y)) /
        ((b.x-a.x)**2+(b.y-a.y)**2)
      ));
      const cx = a.x + t*(b.x-a.x);
      const cy = a.y + t*(b.y-a.y);
      const d = Math.hypot(x-cx, y-cy);
      if (d < 48) return { onRoad:true, dist:d };
    }
    // Raccourci
    if (x>1050&&x<1650&&y>850&&y<1350) return {onRoad:true,dist:0};
    return { onRoad:false, dist:999 };
  }

  // Collisions bâtiments
  function collidesWithBuilding(x,y,r) {
    for (const b of buildings) {
      if (x+r > b.x && x-r < b.x+b.w && y+r > b.y && y-r < b.y+b.h) {
        return b;
      }
    }
    return null;
  }

  const MAP_SIZE = { w:W, h:H };

  return {
    W, H, TRACK_POINTS, CHECKPOINTS, MAP_SIZE,
    generate, drawMap, drawBackground, drawWeatherOverlay,
    drawMinimap, isOnRoad, collidesWithBuilding,
    buildings, trees, streetLights, trafficLights,
    update
  };
})();

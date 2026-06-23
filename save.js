/* ═══════════════════════════════════════════════════
   SAVE.JS – Système de sauvegarde localStorage
═══════════════════════════════════════════════════ */

const SAVE_KEY = 'urban_rush_save';

const DEFAULT_SAVE = {
  level: 1,
  xp: 0,
  unlockedCars: ['speeder','roadster'],
  settings: {
    music: 60, sfx: 80,
    difficulty: 'medium',
    weather: 'random',
    daynight: true,
    camera: 'follow'
  },
  stats: {
    totalRaces: 0,
    totalWins: 0,
    totalDistance: 0,
    bestTimes: {},
    totalNitroUsed: 0,
    totalDrifts: 0,
    maxSpeed: 0,
    totalPlayTime: 0
  },
  leaderboard: [],
  achievements: {}
};

let saveData = null;

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      saveData = JSON.parse(raw);
      // Merge defaults for missing keys
      saveData = deepMerge(DEFAULT_SAVE, saveData);
    } else {
      saveData = JSON.parse(JSON.stringify(DEFAULT_SAVE));
    }
  } catch(e) {
    saveData = JSON.parse(JSON.stringify(DEFAULT_SAVE));
  }
  return saveData;
}

function writeSave() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
  } catch(e) {}
}

function resetSave() {
  if (!confirm('Réinitialiser toutes les données ? Cette action est irréversible.')) return;
  saveData = JSON.parse(JSON.stringify(DEFAULT_SAVE));
  writeSave();
  location.reload();
}

function deepMerge(def, user) {
  const result = Object.assign({}, def);
  for (const k in user) {
    if (user[k] !== null && typeof user[k] === 'object' && !Array.isArray(user[k]) && typeof def[k] === 'object') {
      result[k] = deepMerge(def[k], user[k]);
    } else {
      result[k] = user[k];
    }
  }
  return result;
}

// XP & niveau
function addXP(amount) {
  saveData.xp += amount;
  const xpNeeded = saveData.level * 1000;
  if (saveData.xp >= xpNeeded) {
    saveData.xp -= xpNeeded;
    saveData.level++;
    showNotif(`🎉 NIVEAU ${saveData.level} !`);
  }
  writeSave();
  updateMenuXP();
}

function updateMenuXP() {
  const el = document.getElementById('menu-level');
  const el2 = document.getElementById('menu-xp');
  const fill = document.getElementById('menu-xp-fill');
  if (!el || !saveData) return;
  el.textContent = saveData.level;
  el2.textContent = saveData.xp;
  if (fill) fill.style.width = ((saveData.xp / (saveData.level * 1000)) * 100) + '%';
}

// Classement
function addLeaderboardEntry(entry) {
  saveData.leaderboard.push(entry);
  saveData.leaderboard.sort((a,b) => {
    // Trier par temps (plus petit = meilleur)
    if (a.time && b.time) return a.time - b.time;
    return b.score - a.score;
  });
  saveData.leaderboard = saveData.leaderboard.slice(0, 20);
  writeSave();
}

// Achievements
const ACHIEVEMENTS_DEF = [
  { id:'first_race', name:'🏁 Première course', desc:'Terminer une course', check: (s) => s.totalRaces >= 1 },
  { id:'win_5', name:'🏆 Champion', desc:'5 victoires', check: (s) => s.totalWins >= 5 },
  { id:'speed_200', name:'💨 Speedster', desc:'Atteindre 200 km/h', check: (s) => s.maxSpeed >= 200 },
  { id:'drift_100', name:'🔥 Drifteur', desc:'100 dérapages', check: (s) => s.totalDrifts >= 100 },
  { id:'dist_100', name:'🗺 Routard', desc:'100 km parcourus', check: (s) => s.totalDistance >= 100 },
  { id:'nitro_50', name:'⚡ Nitro addict', desc:'Utiliser le nitro 50 fois', check: (s) => s.totalNitroUsed >= 50 },
  { id:'lv5', name:'⭐ Vétéran', desc:'Atteindre le niveau 5', check: () => saveData.level >= 5 },
];

function checkAchievements() {
  for (const ach of ACHIEVEMENTS_DEF) {
    if (!saveData.achievements[ach.id] && ach.check(saveData.stats)) {
      saveData.achievements[ach.id] = Date.now();
      showNotif(`🏅 SUCCÈS : ${ach.name}`);
      writeSave();
    }
  }
}

// Déverrouillage voiture
function unlockCar(id) {
  if (!saveData.unlockedCars.includes(id)) {
    saveData.unlockedCars.push(id);
    writeSave();
    showNotif(`🚗 NOUVELLE VOITURE : ${id.toUpperCase()}`);
  }
}

// Initialisation
loadSave();

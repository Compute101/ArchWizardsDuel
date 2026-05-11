'use strict';
// ════════════════════════════════════════════════════════════
//  ARCH WIZARDS DUEL — Engine
//  Screens: title → create → world → prep → duel → result
// ════════════════════════════════════════════════════════════

// ─── GLYPH COLOURS ────────────────────────────────────────────────

const COLORS = {
  red:   { name: 'Blood',  col: '#ff4466', bg: 'rgba(255,40,80,0.18)',  glyphs: ['◆','●','▲','■'] },
  blue:  { name: 'Arcane', col: '#4488ff', bg: 'rgba(60,120,255,0.18)', glyphs: ['◇','○','△','□'] },
  green: { name: 'Nature', col: '#44cc66', bg: 'rgba(40,200,80,0.18)',  glyphs: ['♦','♠','♣','♥'] },
  gold:  { name: 'Light',  col: '#ffcc44', bg: 'rgba(255,200,40,0.18)', glyphs: ['✦','✧','✶','✷'] },
};
const COLOR_KEYS = ['red', 'blue', 'green', 'gold'];
const TERM = '★'; // ★

// ─── SPELL DEFINITIONS ───────────────────────────────────────────────
// Sequences use glyphs from the colour’s array only.
// The player types the sequence then presses ★ to cast.

const SPELLS = [
  // Red / Blood
  { id:'bloodsurge',   color:'red',   seq:[0,0],     name:'Bloodsurge',     mana:3, dmg:20, effect:null,                          icon:'🧨', desc:'Quick blood burst' },
  { id:'hemorrhage',   color:'red',   seq:[0,1,0],   name:'Hemorrhage',     mana:6, dmg:28, effect:{type:'bleed',turns:2,dmg:8},  icon:'🔥', desc:'Bleed 8/turn × 2' },
  { id:'siphon',       color:'red',   seq:[1,0,1],   name:'Siphon',         mana:5, dmg:12, effect:{type:'drain',amt:4},           icon:'🖥', desc:'Steal 4 enemy mana' },
  { id:'ignite',       color:'red',   seq:[0,2,0],   name:'Ignite',         mana:7, dmg:22, effect:{type:'burn',turns:2,dmg:10},  icon:'🔥', desc:'Burn 10/turn × 2' },
  // Blue / Arcane
  { id:'arcanebolt',   color:'blue',  seq:[0,0],     name:'Arcane Bolt',    mana:3, dmg:22, effect:null,                          icon:'⚡', desc:'Swift arcane strike' },
  { id:'phasestrike',  color:'blue',  seq:[0,1,0],   name:'Phase Strike',   mana:6, dmg:30, effect:{type:'pierce'},                icon:'🔮', desc:'Bypasses all contingencies' },
  { id:'manavoid',     color:'blue',  seq:[1,0,1],   name:'Mana Void',      mana:5, dmg:8,  effect:{type:'drain',amt:6},           icon:'⚙', desc:'Drain 6 enemy mana' },
  { id:'tempshift',    color:'blue',  seq:[0,2,0],   name:'Temporal Shift', mana:8, dmg:0,  effect:{type:'freeze'},                icon:'⏳', desc:'Skip enemy\'s next turn' },
  // Green / Nature
  { id:'thornwhip',    color:'green', seq:[0,0],     name:'Thornwhip',      mana:3, dmg:18, effect:null,                          icon:'🌿', desc:'Nature lash' },
  { id:'entangle',     color:'green', seq:[0,1,0],   name:'Entangle',       mana:5, dmg:14, effect:{type:'freeze'},                icon:'🌳', desc:'Root enemy 1 turn' },
  { id:'sporecloud',   color:'green', seq:[1,0,1],   name:'Spore Cloud',    mana:5, dmg:8,  effect:{type:'burn',turns:2,dmg:8},   icon:'\ud83c�', desc:'Poison 8/turn × 2' },
  { id:'regenerate',   color:'green', seq:[2,0,2],   name:'Regenerate',     mana:6, dmg:0,  effect:{type:'heal',amt:25},           icon:'💚', desc:'Restore 25 HP' },
  // Gold / Light
  { id:'smite',        color:'gold',  seq:[0,0],     name:'Smite',          mana:3, dmg:20, effect:null,                          icon:'☀', desc:'Holy strike' },
  { id:'wardspell',    color:'gold',  seq:[0,1,0],   name:'Ward',           mana:6, dmg:0,  effect:{type:'ward',hp:28},            icon:'✨', desc:'Create 28 HP barrier' },
  { id:'illuminate',   color:'gold',  seq:[1,0,1],   name:'Illuminate',     mana:4, dmg:14, effect:{type:'reveal'},                icon:'🔦', desc:'Show enemy spell names' },
  { id:'divineshield', color:'gold',  seq:[0,2,0],   name:'Divine Shield',  mana:7, dmg:0,  effect:{type:'shield',absorb:0.75,hits:1}, icon:'🛡', desc:'Block 75% of next hit' },
];

// Build lookup tables
const SPELL_MAP = {};
SPELLS.forEach(s => { SPELL_MAP[s.id] = s; });

// Map resolved glyph string → spell id
const SPELL_SEQ_MAP = {};
SPELLS.forEach(s => {
  const key = s.seq.map(i => COLORS[s.color].glyphs[i]).join('');
  SPELL_SEQ_MAP[key] = s.id;
});

// ─── CONTINGENCY DEFINITIONS ─────────────────────────────────────────

const CONTINGENCIES = [
  { id:'ward_sm',    name:'Minor Ward',   cost:2, col:'#ffcc44', hp:20,         desc:'20 HP barrier' },
  { id:'ward_lg',    name:'Major Ward',   cost:4, col:'#ffdd88', hp:40,         desc:'40 HP barrier' },
  { id:'shell',      name:'Arcane Shell', cost:3, col:'#4488ff', absorb:0.6, hits:1, desc:'Absorb 60% of 1 hit' },
  { id:'mirror',     name:'Mirror Veil',  cost:4, col:'#cc88ff', reflect:15,    desc:'Reflect 15 dmg on break' },
  { id:'lifebraid',  name:'Life Braid',   cost:3, col:'#44cc66', regen:8, regenTurns:3, desc:'+8 HP/turn × 3' },
];
const CONT_MAP = {};
CONTINGENCIES.forEach(c => { CONT_MAP[c.id] = c; });

// ─── NPC DEFINITIONS ───────────────────────────────────────────────────

const NPC_DEFS = [
  {
    id: 'eldrin', name: 'Eldrin', title: 'The Stalwart', col: '#4af0ff',
    hp: 120, maxMana: 14, startMana: 8, manaRegen: 3,
    spellIds: ['arcanebolt', 'phasestrike', 'manavoid', 'tempshift', 'smite', 'divineshield'],
    affinityProfile: { blue: 40, gold: 20 },
    contIds: ['ward_lg', 'shell'],
    intro: 'Eldrin the Stalwart steps forward.\n“Your spells lack precision. Let me demonstrate arcane mastery.”',
    defeatMsg: '“Impressive focus. You have earned this.”',
    wx: 0.73, wy: 0.25,
    reward: ['phasestrike'],
  },
  {
    id: 'malachar', name: 'Malachar', title: 'The Relentless', col: '#ff4a6e',
    hp: 95, maxMana: 16, startMana: 10, manaRegen: 4,
    spellIds: ['bloodsurge', 'hemorrhage', 'siphon', 'ignite', 'arcanebolt'],
    affinityProfile: { red: 50, blue: 10 },
    contIds: ['mirror', 'ward_sm'],
    intro: 'Malachar grins.\n“Pain is a teacher. I’ll make sure you learn.”',
    defeatMsg: '“So the student can bleed too.” He withdraws.',
    wx: 0.18, wy: 0.72,
    reward: ['hemorrhage'],
  },
  {
    id: 'sylvara', name: 'Sylvara', title: 'The Verdant', col: '#44cc88',
    hp: 105, maxMana: 15, startMana: 9, manaRegen: 3,
    spellIds: ['thornwhip', 'entangle', 'sporecloud', 'regenerate', 'illuminate'],
    affinityProfile: { green: 45, gold: 15 },
    contIds: ['lifebraid', 'ward_sm', 'ward_sm'],
    intro: 'Sylvara steps from the canopy.\n“The forest watches. It does not forgive.”',
    defeatMsg: 'The trees go still. “You walk with the wild now.”',
    wx: 0.78, wy: 0.76,
    reward: ['entangle'],
  },
  {
    id: 'aurelia', name: 'Aurelia', title: 'The Radiant', col: '#ffcc44',
    hp: 110, maxMana: 14, startMana: 8, manaRegen: 3,
    spellIds: ['smite', 'wardspell', 'illuminate', 'divineshield', 'arcanebolt', 'thornwhip'],
    affinityProfile: { gold: 50, green: 10 },
    contIds: ['ward_lg', 'ward_sm', 'shell'],
    intro: 'Aurelia’s light fills the chamber.\n“Light judges all. You will be found wanting.”',
    defeatMsg: 'The light dims. “You carry more power than I foresaw.”',
    wx: 0.42, wy: 0.18,
    reward: ['divineshield'],
  },
];

const STARTER_IDS = ['bloodsurge', 'arcanebolt', 'thornwhip', 'smite'];

// ─── REGIONS ───────────────────────────────────────────────────────────────
// One region per arch-mage, each with distinct biome terrain and tile palette.

const REGIONS = [
  {
    id: 'reach', name: "Eldrin's Reach", npcId: 'eldrin',
    lore: 'Frozen peaks where arcane energies crystallize in the eternal cold.',
    seed: 1001,
    thresholds: [0.15, 0.22, 0.42, 0.52, 0.60, 0.72],
    tileColors: { 0:'#081820', 1:'#0e2d4a', 2:'#9ab8cc', 3:'#6a7e88', 4:'#0a2818', 5:'#c8dce8', 6:'#e0edf8' },
    npcPos:   { wx: 0.85, wy: 0.12 },  // NE corner
    spawnPos: { wx: 0.10, wy: 0.88 },  // SW corner
  },
  {
    id: 'wastes', name: "Malachar's Wastes", npcId: 'malachar',
    lore: 'Scorched wastelands where blood magic festers in the ash and cinder.',
    seed: 2002,
    thresholds: [0.10, 0.16, 0.28, 0.52, 0.62, 0.78],
    tileColors: { 0:'#580e04', 1:'#8a2010', 2:'#3c1e12', 3:'#7c2e18', 4:'#231008', 5:'#3a2020', 6:'#888070' },
    npcPos:   { wx: 0.12, wy: 0.85 },  // SW corner
    spawnPos: { wx: 0.88, wy: 0.10 },  // NE corner
  },
  {
    id: 'glade', name: "Sylvara's Glade", npcId: 'sylvara',
    lore: "Ancient groves teeming with the oldest and deepest of nature's magic.",
    seed: 3003,
    thresholds: [0.18, 0.26, 0.56, 0.60, 0.88, 0.95],
    tileColors: { 0:'#0e2030', 1:'#1e4460', 2:'#1a5a16', 3:'#3a3018', 4:'#082808', 5:'#304828', 6:'#c0d0b8' },
    npcPos:   { wx: 0.88, wy: 0.82 },  // SE corner
    spawnPos: { wx: 0.10, wy: 0.12 },  // NW corner
  },
  {
    id: 'sanctum', name: "Aurelia's Sanctum", npcId: 'aurelia',
    lore: 'Rolling golden plains where the light of divinity warms every stone.',
    seed: 4004,
    thresholds: [0.15, 0.22, 0.48, 0.62, 0.72, 0.88],
    tileColors: { 0:'#102030', 1:'#1e3c60', 2:'#4a6218', 3:'#887840', 4:'#1a3e10', 5:'#7a7060', 6:'#e0dcc8' },
    npcPos:   { wx: 0.12, wy: 0.12 },  // NW corner
    spawnPos: { wx: 0.88, wy: 0.88 },  // SE corner
  },
];
const REGION_MAP = {};
REGIONS.forEach(r => { REGION_MAP[r.id] = r; });

// ─── ROAMING ENEMY DEFINITIONS ────────────────────────────────────────────
// Weak enemies that patrol each region biome. Each knows either a basic
// physical attack or a single elemental spell suited to the biome.

const ROAMING_ENEMY_DEFS = {
  reach: [ // Frozen arcane peaks — blue magic
    { name:'Ice Wraith',      title:'Frozen Shade',    col:'#88ccff', hp:38, maxMana:8,  startMana:4, manaRegen:2, spellIds:['arcanebolt'],             affinityProfile:{blue:60} },
    { name:'Frost Shard',     title:'Arcane Remnant',  col:'#aaddff', hp:32, maxMana:10, startMana:5, manaRegen:2, spellIds:['arcanebolt','tempshift'],  affinityProfile:{blue:50} },
    { name:'Crystal Golem',   title:'Arcane Sentinel', col:'#66aaee', hp:44, maxMana:8,  startMana:4, manaRegen:2, spellIds:['arcanebolt'],             affinityProfile:{blue:60} },
  ],
  wastes: [ // Scorched wastelands — red blood magic
    { name:'Ash Hound',       title:'Cinder Beast',    col:'#ff6644', hp:42, maxMana:8,  startMana:4, manaRegen:2, spellIds:['bloodsurge'],             affinityProfile:{red:60} },
    { name:'Cinder Imp',      title:'Fire Spawn',      col:'#ff3311', hp:32, maxMana:10, startMana:5, manaRegen:2, spellIds:['bloodsurge','ignite'],     affinityProfile:{red:50} },
    { name:'Blood Shade',     title:'Sanguine Wraith', col:'#cc2244', hp:40, maxMana:9,  startMana:4, manaRegen:2, spellIds:['bloodsurge','siphon'],    affinityProfile:{red:55} },
  ],
  glade: [ // Ancient forest — green nature magic
    { name:'Vine Crawler',    title:'Root Horror',     col:'#55bb44', hp:40, maxMana:8,  startMana:4, manaRegen:2, spellIds:['thornwhip'],              affinityProfile:{green:60} },
    { name:'Spore Pod',       title:'Fungal Horror',   col:'#88bb33', hp:32, maxMana:10, startMana:5, manaRegen:2, spellIds:['thornwhip','sporecloud'],  affinityProfile:{green:50} },
    { name:'Forest Shade',    title:'Ancient Lurker',  col:'#336622', hp:44, maxMana:9,  startMana:4, manaRegen:2, spellIds:['thornwhip','entangle'],   affinityProfile:{green:55} },
  ],
  sanctum: [ // Golden plains — gold light magic
    { name:'Stone Sentinel',  title:'Cursed Guardian', col:'#ddaa44', hp:44, maxMana:8,  startMana:4, manaRegen:2, spellIds:['smite'],                  affinityProfile:{gold:60} },
    { name:'Radiant Wisp',    title:'Lost Light',      col:'#ffdd66', hp:32, maxMana:10, startMana:5, manaRegen:2, spellIds:['smite','illuminate'],      affinityProfile:{gold:50} },
    { name:'Cursed Pilgrim',  title:'Fallen Seeker',   col:'#cc8822', hp:40, maxMana:9,  startMana:4, manaRegen:2, spellIds:['smite','wardspell'],      affinityProfile:{gold:55} },
  ],
};

// ─── WORLD MAP ─────────────────────────────────────────────────────────

const MW = 96, MH = 66, TPIX = 17;
const T = { DEEP:0, WATER:1, GRASS:2, DIRT:3, TREE:4, MOUNTAIN:5, SNOW:6 };
const T_COLOR = {
  0:'#152840', 1:'#1a4870', 2:'#2a5418', 3:'#64502e',
  4:'#183808', 5:'#606060', 6:'#c0ccd8',
};
const T_WALK = new Set([T.GRASS, T.DIRT]);

let worldTiles;
let activeRegionColors = T_COLOR;

function hashNoise(x, y) {
  let v = ((x * 1619 + y * 31337 + 6271) & 0x7fffffff);
  v = ((v >>> 16) ^ v) * 0x45d9f3b | 0;
  v = ((v >>> 16) ^ v) * 0x45d9f3b | 0;
  return ((v >>> 16) ^ v) & 0xffff;
}

function smoothNoise(x, y, sc) {
  const xi = Math.floor(x / sc), yi = Math.floor(y / sc);
  const xf = x / sc - xi, yf = y / sc - yi;
  const a = hashNoise(xi, yi), b = hashNoise(xi + 1, yi);
  const c = hashNoise(xi, yi + 1), d = hashNoise(xi + 1, yi + 1);
  return (a * (1 - xf) * (1 - yf) + b * xf * (1 - yf) + c * (1 - xf) * yf + d * xf * yf) / 0xffff;
}

// ── Path & maze helpers (deterministic per region seed) ──────────────────

function seededRNG(seed) {
  let s = (seed ^ 0xdeadbeef) >>> 0;
  return function() {
    s = ((s * 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function carveHLine(x0, x1, y) {
  const step = x0 <= x1 ? 1 : -1;
  for (let x = x0; x !== x1 + step; x += step)
    if (x >= 0 && x < MW && y >= 0 && y < MH)
      worldTiles[y * MW + x] = T.GRASS;
}

function carveVLine(x, y0, y1) {
  const step = y0 <= y1 ? 1 : -1;
  for (let y = y0; y !== y1 + step; y += step)
    if (x >= 0 && x < MW && y >= 0 && y < MH)
      worldTiles[y * MW + x] = T.GRASS;
}

function carveClearing(cx, cy, r) {
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++) {
      const tx = cx + dx, ty = cy + dy;
      if (tx >= 0 && tx < MW && ty >= 0 && ty < MH)
        worldTiles[ty * MW + tx] = T.GRASS;
    }
}

// Carves a single winding path via L-segments through perpendicular waypoints.
// Returns the waypoint array so callers can branch off intermediate nodes.
function carveWindingPath(x0, y0, x1, y1, rng) {
  const NUM_WP = 5;
  const lx = x1 - x0, ly = y1 - y0;
  const len = Math.sqrt(lx * lx + ly * ly) || 1;
  const px = -ly / len, py = lx / len;

  const pts = [[x0, y0]];
  for (let i = 1; i <= NUM_WP; i++) {
    const t   = i / (NUM_WP + 1);
    const dev = (rng() - 0.5) * 24;   // ±12 tiles perpendicular swing
    const wx  = Math.round(x0 + lx * t + px * dev);
    const wy  = Math.round(y0 + ly * t + py * dev);
    pts.push([Math.max(2, Math.min(MW - 3, wx)), Math.max(2, Math.min(MH - 3, wy))]);
  }
  pts.push([x1, y1]);

  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    if (rng() < 0.5) { carveHLine(ax, bx, ay); carveVLine(bx, ay, by); }
    else              { carveVLine(ax, ay, by); carveHLine(ax, bx, by); }
  }
  return pts;
}

// Builds the full region maze: a main winding path to the mage plus several
// dead-end branches so the player has to explore rather than follow one route.
function carveRegionMaze(spawnX, spawnY, mageX, mageY, rng) {
  // ── Main path spawn → mage ──
  const mainPts = carveWindingPath(spawnX, spawnY, mageX, mageY, rng);

  // ── One branch from the middle of the main path ──
  const mid = mainPts[Math.floor(mainPts.length / 2)];
  let ex, ey, t = 0;
  do {
    ex = Math.round(4 + rng() * (MW - 8));
    ey = Math.round(4 + rng() * (MH - 8));
  } while (Math.abs(ex - mageX) + Math.abs(ey - mageY) < 22 && ++t < 15);
  carveWindingPath(mid[0], mid[1], ex, ey, rng);
  carveClearing(ex, ey, 2);

  // ── Dead-end branches from spawn ──
  for (let i = 0; i < 3; i++) {
    t = 0;
    do {
      ex = Math.round(4 + rng() * (MW - 8));
      ey = Math.round(4 + rng() * (MH - 8));
    } while (Math.abs(ex - mageX) + Math.abs(ey - mageY) < 22 && ++t < 15);
    carveWindingPath(spawnX, spawnY, ex, ey, rng);
    carveClearing(ex, ey, 2);
  }
}

function genWorld(region) {
  worldTiles = new Uint8Array(MW * MH);
  const seed = region ? region.seed : 0;
  const th   = region ? region.thresholds : [0.27, 0.36, 0.55, 0.62, 0.74, 0.86];
  activeRegionColors = region ? region.tileColors : T_COLOR;

  for (let y = 0; y < MH; y++) {
    for (let x = 0; x < MW; x++) {
      const nx = x + seed, ny = y + seed;
      const h = smoothNoise(nx, ny, 10) * 0.55 + smoothNoise(nx, ny, 5) * 0.3 + smoothNoise(nx, ny, 2) * 0.15;
      let t;
      if      (h < th[0]) t = T.DEEP;
      else if (h < th[1]) t = T.WATER;
      else if (h < th[2]) t = T.GRASS;
      else if (h < th[3]) t = T.DIRT;
      else if (h < th[4]) t = T.TREE;
      else if (h < th[5]) t = T.MOUNTAIN;
      else                t = T.SNOW;
      worldTiles[y * MW + x] = t;
    }
  }

  // Player spawn: opposite corner from the mage, guaranteed walkable
  const spR = region ? region.spawnPos : { wx: 0.45, wy: 0.5 };
  const sx = Math.round(spR.wx * (MW - 4) + 2), sy = Math.round(spR.wy * (MH - 4) + 2);
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -2; dx <= 2; dx++) {
      const tx = sx + dx, ty = sy + dy;
      if (tx >= 0 && tx < MW && ty >= 0 && ty < MH)
        worldTiles[ty * MW + tx] = T.GRASS;
    }

  // Place this region's NPC, then carve a winding corridor from spawn to them
  if (region) {
    const npc = G.npcs.find(n => n.id === region.npcId);
    if (npc) {
      npc.mx = Math.round(region.npcPos.wx * (MW - 4) + 2);
      npc.my = Math.round(region.npcPos.wy * (MH - 4) + 2);
      for (let dy = -3; dy <= 3; dy++)
        for (let dx = -3; dx <= 3; dx++) {
          const tx = npc.mx + dx, ty = npc.my + dy;
          if (tx >= 0 && tx < MW && ty >= 0 && ty < MH)
            worldTiles[ty * MW + tx] = T.GRASS;
        }
      // Carve branching maze so the mage is reachable but not obvious
      carveRegionMaze(sx, sy, npc.mx, npc.my, seededRNG(region.seed));
    }
  }

  return { sx, sy };
}

// ─── GAME STATE ────────────────────────────────────────────────────────

let G = {};

function initGame() {
  G = {
    screen: 'title',
    player: {
      name: 'Archmage',
      hp: 100, maxHp: 100,
      mana: 8, maxMana: 16, manaRegen: 3,
      spellIds: [...STARTER_IDS],
      castHistory: [],
      tx: 0, ty: 0,
    },
    npcs: NPC_DEFS.map(d => Object.assign({}, d, { defeated: false })),
    enemies: [],
    world: { moveDir: null },
    prep: null,
    activeNpc: null,
    worldTick: null,
    duelRaf: null,
    currentRegion: null,
    atlasFrom: 'create',
  };
}

// ─── ATLAS & REGION TRAVEL ──────────────────────────────────────────────

function openAtlas(from) {
  G.atlasFrom = from || 'create';
  stopWorld();
  renderAtlas();
  setScreen('atlas');
}

function renderAtlas() {
  const grid = document.getElementById('atlas-grid');
  grid.innerHTML = '';
  REGIONS.forEach(region => {
    const npcDef = NPC_DEFS.find(n => n.id === region.npcId);
    const npc    = G.npcs.find(n => n.id === region.npcId);
    const defeated  = npc ? npc.defeated : false;
    const isCurrent = G.currentRegion && G.currentRegion.id === region.id;

    const card = document.createElement('div');
    card.className = 'atlas-card' + (defeated ? ' atlas-defeated' : '') + (isCurrent ? ' atlas-current' : '');
    card.style.setProperty('--rc', npcDef.col);
    card.style.boxShadow = `0 0 14px ${npcDef.col}${isCurrent ? '80' : '30'}`;

    const nameEl = document.createElement('div');
    nameEl.className = 'atlas-card-name';
    nameEl.textContent = region.name;
    card.appendChild(nameEl);

    const preview = document.createElement('canvas');
    preview.className = 'atlas-preview';
    preview.width  = MW;
    preview.height = MH;
    renderRegionPreview(preview, region);
    card.appendChild(preview);

    const mageEl = document.createElement('div');
    mageEl.className = 'atlas-mage';
    mageEl.textContent = `${npcDef.name} · ${npcDef.title}`;
    card.appendChild(mageEl);

    const loreEl = document.createElement('div');
    loreEl.className = 'atlas-lore';
    loreEl.textContent = region.lore;
    card.appendChild(loreEl);

    if (defeated) {
      const badge = document.createElement('div');
      badge.className = 'atlas-badge';
      badge.textContent = 'Vanquished';
      card.appendChild(badge);
    }
    if (isCurrent) {
      const badge = document.createElement('div');
      badge.className = 'atlas-badge atlas-badge-here';
      badge.textContent = '← Here';
      card.appendChild(badge);
    }

    card.onclick = () => travelToRegion(region);
    grid.appendChild(card);
  });

  const backBtn = document.getElementById('btn-atlas-back');
  if (G.atlasFrom === 'world' && G.currentRegion) {
    backBtn.textContent = '← Return';
    backBtn.style.display = '';
  } else {
    backBtn.style.display = 'none';
  }
}

function renderRegionPreview(canvas, region) {
  const ctx  = canvas.getContext('2d');
  const seed = region.seed;
  const th   = region.thresholds;
  const cols = region.tileColors;

  // Build a temporary tile buffer matching genWorld's output
  const buf = new Uint8Array(MW * MH);
  for (let y = 0; y < MH; y++) {
    for (let x = 0; x < MW; x++) {
      const nx = x + seed, ny = y + seed;
      const h = smoothNoise(nx, ny, 10) * 0.55 + smoothNoise(nx, ny, 5) * 0.3 + smoothNoise(nx, ny, 2) * 0.15;
      let t;
      if      (h < th[0]) t = T.DEEP;
      else if (h < th[1]) t = T.WATER;
      else if (h < th[2]) t = T.GRASS;
      else if (h < th[3]) t = T.DIRT;
      else if (h < th[4]) t = T.TREE;
      else if (h < th[5]) t = T.MOUNTAIN;
      else                t = T.SNOW;
      buf[y * MW + x] = t;
    }
  }

  // Apply clearings and maze into the buffer
  const spX = Math.round(region.spawnPos.wx * (MW - 4) + 2);
  const spY = Math.round(region.spawnPos.wy * (MH - 4) + 2);
  const mx  = Math.round(region.npcPos.wx * (MW - 4) + 2);
  const my  = Math.round(region.npcPos.wy * (MH - 4) + 2);
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -2; dx <= 2; dx++) {
      const tx = spX + dx, ty = spY + dy;
      if (tx >= 0 && tx < MW && ty >= 0 && ty < MH) buf[ty * MW + tx] = T.GRASS;
    }
  for (let dy = -3; dy <= 3; dy++)
    for (let dx = -3; dx <= 3; dx++) {
      const tx = mx + dx, ty = my + dy;
      if (tx >= 0 && tx < MW && ty >= 0 && ty < MH) buf[ty * MW + tx] = T.GRASS;
    }
  const savedTiles = worldTiles;
  worldTiles = buf;
  carveRegionMaze(spX, spY, mx, my, seededRNG(region.seed));
  worldTiles = savedTiles;

  // Render
  for (let y = 0; y < MH; y++)
    for (let x = 0; x < MW; x++) {
      ctx.fillStyle = cols[buf[y * MW + x]] || '#111';
      ctx.fillRect(x, y, 1, 1);
    }

  // Mage dot
  const npcDef = NPC_DEFS.find(n => n.id === region.npcId);
  ctx.fillStyle = npcDef.col;
  ctx.shadowColor = npcDef.col;
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.arc(mx, my, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Spawn dot
  ctx.fillStyle = '#f0cc6a';
  ctx.beginPath();
  ctx.arc(spX, spY, 2, 0, Math.PI * 2);
  ctx.fill();
}

function travelToRegion(region) {
  G.currentRegion = region;
  const { sx, sy } = genWorld(region);
  G.player.tx = sx;
  G.player.ty = sy;
  spawnRoamingEnemies(region);
  msgNpc = null;
  document.getElementById('world-msg').classList.remove('show');
  setScreen('world');
  startWorld();
}

function spawnRoamingEnemies(region) {
  const defs = ROAMING_ENEMY_DEFS[region.id];
  G.enemies = [];
  if (!defs) return;

  const rng = seededRNG(region.seed + 9999);
  const px = G.player.tx, py = G.player.ty;

  // Collect walkable tiles at least 10 steps from player spawn
  const candidates = [];
  for (let y = 0; y < MH; y++) {
    for (let x = 0; x < MW; x++) {
      if (T_WALK.has(worldTiles[y * MW + x])) {
        if (Math.abs(x - px) + Math.abs(y - py) > 10) candidates.push([x, y]);
      }
    }
  }

  // Fisher-Yates shuffle with seeded RNG
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = candidates[i]; candidates[i] = candidates[j]; candidates[j] = tmp;
  }

  for (let i = 0; i < 12 && i < candidates.length; i++) {
    const [tx, ty] = candidates[i];
    const def = defs[Math.floor(rng() * defs.length)];
    G.enemies.push(Object.assign({}, def, {
      contIds: [], isRoamingEnemy: true,
      tx, ty, alive: true,
    }));
  }
}

// ─── AFFINITY ───────────────────────────────────────────────────────────

function affinityDiscount(history, spellId) {
  const spell = SPELL_MAP[spellId];
  if (!spell) return 0;
  const direct = history.filter(id => id === spellId).length;
  if (direct >= 3) return 2;
  if (direct >= 1) return 1;
  const color = history.filter(id => SPELL_MAP[id] && SPELL_MAP[id].color === spell.color).length;
  if (color >= 10) return 1;
  return 0;
}

function recordCast(spellId) {
  G.player.castHistory.push(spellId);
  if (G.player.castHistory.length > 100) G.player.castHistory.shift();
}

// ─── SCREEN MANAGER ───────────────────────────────────────────────────

function setScreen(name) {
  G.screen = name;
  document.querySelectorAll('.screen').forEach(el => {
    el.classList.toggle('active', el.dataset.screen === name);
  });
}

// ─── WORLD MAP ──────────────────────────────────────────────────────────

const wCan = document.getElementById('world-canvas');
const wx = wCan.getContext('2d');

const HUD_H = 44;

function startWorld() {
  resizeWCan();
  updateWorldHUD();
  if (!G.worldTick) G.worldTick = setInterval(worldStep, 120);
  encounterCooldown = 5; // brief grace period when entering the world
}

function stopWorld() {
  clearInterval(G.worldTick);
  G.worldTick = null;
}

function resizeWCan() {
  wCan.width  = wCan.clientWidth  || wCan.offsetWidth  || 480;
  wCan.height = wCan.clientHeight || wCan.offsetHeight || window.innerHeight;
}

function worldStep() {
  if (G.screen !== 'world') return;
  movePlayer();
  drawWorld();
  checkNpcProximity();
  checkEnemyEncounter();
}

const DIR = { n:[0,-1], s:[0,1], w:[-1,0], e:[1,0] };

function movePlayer() {
  const dir = G.world.moveDir;
  if (!dir) return;
  const [dx, dy] = DIR[dir];
  const nx = G.player.tx + dx, ny = G.player.ty + dy;
  if (nx < 0 || nx >= MW || ny < 0 || ny >= MH) return;
  if (!T_WALK.has(worldTiles[ny * MW + nx])) return;
  G.player.tx = nx;
  G.player.ty = ny;
  updateWorldHUD();
  moveEnemies();
}

function moveEnemies() {
  if (!G.enemies || !G.enemies.length) return;
  const px = G.player.tx, py = G.player.ty;
  const DIRS4 = [[0,-1],[0,1],[-1,0],[1,0]];

  G.enemies.forEach(enemy => {
    if (!enemy.alive) return;
    const dx = px - enemy.tx, dy = py - enemy.ty;
    const dist = Math.abs(dx) + Math.abs(dy);

    let ordered;
    if (dist <= 4 && dist > 0) {
      // Chase: approach along the longer axis first
      const preferred = [];
      if (Math.abs(dx) >= Math.abs(dy)) {
        if (dx !== 0) preferred.push([Math.sign(dx), 0]);
        if (dy !== 0) preferred.push([0, Math.sign(dy)]);
      } else {
        if (dy !== 0) preferred.push([0, Math.sign(dy)]);
        if (dx !== 0) preferred.push([Math.sign(dx), 0]);
      }
      ordered = [...preferred, ...DIRS4.filter(d => !preferred.some(p => p[0]===d[0] && p[1]===d[1]))];
    } else {
      // Random patrol
      ordered = [...DIRS4].sort(() => Math.random() - 0.5);
    }

    for (const [mdx, mdy] of ordered) {
      const nx = enemy.tx + mdx, ny = enemy.ty + mdy;
      if (nx >= 0 && nx < MW && ny >= 0 && ny < MH && T_WALK.has(worldTiles[ny * MW + nx])) {
        enemy.tx = nx;
        enemy.ty = ny;
        break;
      }
    }
  });
}

let encounterCooldown = 0;

function checkEnemyEncounter() {
  if (!G.enemies || G.screen !== 'world') return;
  if (msgNpc) return; // don't interrupt arch-wizard dialog
  if (encounterCooldown > 0) { encounterCooldown--; return; }

  const px = G.player.tx, py = G.player.ty;
  for (const enemy of G.enemies) {
    if (!enemy.alive) continue;
    if (enemy.tx === px && enemy.ty === py) {
      beginRoamingBattle(enemy);
      return;
    }
  }
}

function beginRoamingBattle(enemy) {
  stopWorld();
  G.activeNpc = enemy;
  G.prep = { chosen: [] };
  startDuel();
}

function drawWorld() {
  const cw = wCan.width, ch = wCan.height;
  const drawH = ch - HUD_H;

  const camX = G.player.tx * TPIX + TPIX / 2 - cw / 2;
  const camY = G.player.ty * TPIX + TPIX / 2 - drawH / 2;

  wx.clearRect(0, 0, cw, ch);

  // Tiles
  const x0 = Math.floor(camX / TPIX) - 1;
  const y0 = Math.floor(camY / TPIX) - 1;
  const xN = Math.ceil(cw / TPIX) + 3;
  const yN = Math.ceil(drawH / TPIX) + 3;

  for (let ty = y0; ty < y0 + yN; ty++) {
    for (let tx = x0; tx < x0 + xN; tx++) {
      const tile = (tx >= 0 && tx < MW && ty >= 0 && ty < MH)
        ? worldTiles[ty * MW + tx]
        : T.DEEP;
      const px = Math.round(tx * TPIX - camX);
      const py = Math.round(ty * TPIX - camY + HUD_H);
      wx.fillStyle = activeRegionColors[tile] || '#111';
      wx.fillRect(px, py, TPIX, TPIX);
    }
  }

  // Subtle grid lines
  wx.strokeStyle = 'rgba(0,0,0,0.18)';
  wx.lineWidth = 0.5;
  for (let tx = x0; tx < x0 + xN; tx++) {
    const px = Math.round(tx * TPIX - camX);
    wx.beginPath(); wx.moveTo(px, HUD_H); wx.lineTo(px, ch); wx.stroke();
  }
  for (let ty = y0; ty < y0 + yN; ty++) {
    const py = Math.round(ty * TPIX - camY + HUD_H);
    wx.beginPath(); wx.moveTo(0, py); wx.lineTo(cw, py); wx.stroke();
  }

  // NPC marker — only this region's arch-mage
  if (G.currentRegion) {
    const npc = G.npcs.find(n => n.id === G.currentRegion.npcId);
    if (npc && npc.mx !== undefined) {
      const px = Math.round(npc.mx * TPIX - camX + TPIX / 2);
      const py = Math.round(npc.my * TPIX - camY + HUD_H + TPIX / 2);
      wx.globalAlpha = npc.defeated ? 0.3 : 1;
      wx.fillStyle = npc.col;
      wx.shadowColor = npc.col;
      wx.shadowBlur = npc.defeated ? 0 : 12;
      wx.beginPath();
      wx.moveTo(px, py - 16);
      wx.lineTo(px - 9, py + 5);
      wx.lineTo(px + 9, py + 5);
      wx.closePath();
      wx.fill();
      wx.shadowBlur = 0;
      wx.fillStyle = npc.defeated ? 'rgba(255,255,255,0.28)' : '#fff';
      wx.font = '8px Cinzel, serif';
      wx.textAlign = 'center';
      wx.fillText(npc.name, px, py + 18);
      wx.globalAlpha = 1;
    }
  }

  // Roaming enemies
  if (G.enemies) {
    const now = Date.now();
    G.enemies.forEach(enemy => {
      if (!enemy.alive) return;
      const epx = Math.round(enemy.tx * TPIX - camX + TPIX / 2);
      const epy = Math.round(enemy.ty * TPIX - camY + HUD_H + TPIX / 2);
      if (epx < -20 || epx > cw + 20 || epy < HUD_H - 20 || epy > ch + 20) return;

      const dist = Math.abs(enemy.tx - G.player.tx) + Math.abs(enemy.ty - G.player.ty);
      const aggro = dist <= 4;
      wx.globalAlpha = aggro ? 0.6 + 0.4 * Math.sin(now / 180) : 0.85;
      wx.fillStyle   = enemy.col;
      wx.shadowColor = enemy.col;
      wx.shadowBlur  = aggro ? 10 : 4;
      // Diamond chevron shape
      wx.beginPath();
      wx.moveTo(epx,     epy - 6);
      wx.lineTo(epx + 5, epy + 1);
      wx.lineTo(epx,     epy - 1);
      wx.lineTo(epx - 5, epy + 1);
      wx.closePath();
      wx.fill();
      wx.shadowBlur  = 0;
      wx.globalAlpha = 1;
    });
  }

  // Player marker
  const ppx = Math.round(G.player.tx * TPIX - camX + TPIX / 2);
  const ppy = Math.round(G.player.ty * TPIX - camY + HUD_H + TPIX / 2);
  const bob = Math.sin(Date.now() / 500) * 1.5;
  wx.fillStyle = '#f0cc6a';
  wx.shadowColor = '#c9a84c';
  wx.shadowBlur = 10;
  wx.beginPath();
  wx.arc(ppx, ppy - 5 + bob, 7, 0, Math.PI * 2);
  wx.fill();
  wx.fillRect(ppx - 5, ppy + 2 + bob, 10, 9);
  wx.shadowBlur = 0;

  // Defeat counter
  const defeated = G.npcs.filter(n => n.defeated).length;
  if (defeated > 0) {
    wx.fillStyle = 'rgba(201,168,76,0.65)';
    wx.font = '9px Cinzel, serif';
    wx.textAlign = 'left';
    wx.fillText(`${defeated}/${G.npcs.length} arch-wizards defeated`, 8, ch - 8);
  }
}

function updateWorldHUD() {
  document.getElementById('whud-pname').textContent = G.player.name;
  document.getElementById('w-hpbar').style.width   = `${(G.player.hp   / G.player.maxHp)   * 100}%`;
  document.getElementById('w-manabar').style.width = `${(G.player.mana / G.player.maxMana) * 100}%`;

  let locText = G.currentRegion ? G.currentRegion.name : 'The World';
  if (G.currentRegion) {
    const npc = G.npcs.find(n => n.id === G.currentRegion.npcId);
    if (npc && npc.mx !== undefined) {
      const d = Math.abs(npc.mx - G.player.tx) + Math.abs(npc.my - G.player.ty);
      if (d <= 10) locText = `Near ${npc.name}'s Tower`;
    }
  }
  document.getElementById('whud-loc').textContent = locText;
}

const msgEl = document.getElementById('world-msg');
let msgNpc = null;

function checkNpcProximity() {
  if (!G.currentRegion) { msgNpc = null; msgEl.classList.remove('show'); return; }
  const npc = G.npcs.find(n => n.id === G.currentRegion.npcId);
  if (!npc || npc.mx === undefined) { msgNpc = null; msgEl.classList.remove('show'); return; }

  const dx = Math.abs(npc.mx - G.player.tx);
  const dy = Math.abs(npc.my - G.player.ty);
  if (dx <= 2 && dy <= 2 && !npc.defeated) {
    if (msgNpc !== npc) {
      msgNpc = npc;
      msgEl.innerHTML = `<b style="color:${npc.col}">${npc.name} — ${npc.title}</b>\n${npc.intro}\n<button class="world-msg-btn" id="btn-challenge">⚔ Challenge</button>`;
      msgEl.classList.add('show');
      setTimeout(() => {
        const btn = document.getElementById('btn-challenge');
        if (btn) btn.onclick = () => beginPrep(npc);
      }, 10);
    }
    return;
  }
  msgNpc = null;
  msgEl.classList.remove('show');
}

// ─── PREP PHASE ────────────────────────────────────────────────────────

const PLAYER_PREP_BUDGET = 6;

function beginPrep(npc) {
  G.activeNpc = npc;
  G.prep = { budget: PLAYER_PREP_BUDGET, chosen: [] };
  stopWorld();

  const banner = document.getElementById('prep-foe-banner');
  banner.textContent = `${npc.name} — ${npc.title}`;
  banner.style.color = npc.col;
  banner.style.borderColor = npc.col + '60';

  refreshPrepUI();
  setScreen('prep');
}

function prepRemaining() {
  return G.prep.budget - G.prep.chosen.reduce((s, c) => s + CONT_MAP[c.id].cost, 0);
}

function refreshPrepUI() {
  document.getElementById('prep-budget').textContent = prepRemaining();
  renderPrepSlots();
  renderPrepOptions();
}

function renderPrepSlots() {
  const el = document.getElementById('prep-slots');
  el.innerHTML = '';
  if (G.prep.chosen.length === 0) {
    el.innerHTML = '<span style="font-size:9px;color:rgba(255,255,255,0.28);letter-spacing:1px">None — you\'ll take hits directly</span>';
    return;
  }
  G.prep.chosen.forEach((c, i) => {
    const def = CONT_MAP[c.id];
    const slot = document.createElement('div');
    slot.className = 'prep-slot';
    slot.style.setProperty('--cc', def.col);
    slot.innerHTML = `${def.name} <span style="opacity:0.45;font-size:9px">✕</span>`;
    slot.onclick = () => { G.prep.chosen.splice(i, 1); refreshPrepUI(); };
    el.appendChild(slot);
  });
}

function renderPrepOptions() {
  const remaining = prepRemaining();
  const el = document.getElementById('prep-options');
  el.innerHTML = '';
  CONTINGENCIES.forEach(c => {
    const opt = document.createElement('div');
    opt.className = 'prep-opt' + (c.cost > remaining ? ' no-pts' : '');
    opt.style.setProperty('--cc', c.col);
    opt.innerHTML =
      `<div class="prep-opt-name">${c.name}</div>` +
      `<div class="prep-opt-cost">${c.cost} pts</div>` +
      `<div class="prep-opt-desc">${c.desc}</div>`;
    opt.onclick = () => {
      if (c.cost > prepRemaining()) return;
      G.prep.chosen.push(makeContInstance(c));
      refreshPrepUI();
    };
    el.appendChild(opt);
  });
}

function makeContInstance(def) {
  const inst = { id: def.id, col: def.col };
  if (def.hp      !== undefined) inst.hp = def.hp;
  if (def.absorb  !== undefined) { inst.absorb = def.absorb; inst.hits = def.hits; }
  if (def.reflect !== undefined) inst.reflect = def.reflect;
  if (def.regen   !== undefined) { inst.regen = def.regen; inst.regenTurns = def.regenTurns; }
  return inst;
}

// ─── DUEL ENGINE ─────────────────────────────────────────────────────────

const dCan = document.getElementById('duel-canvas');
const dc = dCan.getContext('2d');
let DS = null; // duel state

const DUEL_HUD_H  = 58;
const GLYPH_KB_H  = 210; // approximate

function startDuel() {
  const npc = G.activeNpc;

  // Build NPC contingencies from their authored list
  const npcConts = npc.contIds.map(id => makeContInstance(CONT_MAP[id]));
  const playerConts = G.prep.chosen.map(c => Object.assign({}, c));

  DS = {
    round: 1,
    playerTurn: true,
    busy: false,
    player: {
      hp: G.player.hp, maxHp: G.player.maxHp,
      mana: G.player.mana, maxMana: G.player.maxMana,
      manaRegen: G.player.manaRegen,
      frozen: false, bleedTurns: 0, bleedDmg: 0, burnTurns: 0, burnDmg: 0,
      contingencies: playerConts,
    },
    enemy: {
      hp: npc.hp, maxHp: npc.hp,
      mana: npc.startMana, maxMana: npc.maxMana,
      manaRegen: npc.manaRegen,
      frozen: false, bleedTurns: 0, bleedDmg: 0, burnTurns: 0, burnDmg: 0,
      contingencies: npcConts,
    },
    glyphSeq: [],
    activeColor: 'red',
    timerStart: null,
    TIMER_LEN: 5000,
    INTER_GLYPH: 2500,
    interTimeout: null,
    parts: [], floats: [],
  };

  setScreen('duel');
  resizeDuelCanvas();
  buildGlyphKeyboard();
  updateDuelHUD();
  setInputEnabled(true);
  if (G.activeNpc.isRoamingEnemy) {
    addLog(`⚔ ${G.activeNpc.name} attacks! Defend yourself!`);
  } else {
    addLog('⚔ The duel begins! Build your spells with the glyph keyboard.');
  }

  if (G.duelRaf) cancelAnimationFrame(G.duelRaf);
  G.duelRaf = requestAnimationFrame(duelFrame);
}

function resizeDuelCanvas() {
  const kbEl = document.getElementById('glyph-keyboard');
  const kbH  = kbEl ? kbEl.offsetHeight || GLYPH_KB_H : GLYPH_KB_H;
  const total = window.innerHeight;
  const h = Math.max(80, total - DUEL_HUD_H - kbH);
  dCan.width  = dCan.offsetWidth || 480;
  dCan.height = h;
  dCan.style.top = DUEL_HUD_H + 'px';
  const logEl = document.getElementById('duel-log');
  if (logEl) logEl.style.top = (DUEL_HUD_H + h - 64) + 'px';
  const kbEl2 = document.getElementById('glyph-keyboard');
  if (kbEl2) kbEl2.style.bottom = '0';
}

function duelFrame(ts) {
  if (G.screen !== 'duel') return;
  drawDuelScene(ts);
  tickParticles();
  tickFloats();
  updateTimerBar();
  G.duelRaf = requestAnimationFrame(duelFrame);
}

// ─── DUEL SCENE DRAWING ───────────────────────────────────────────────

function drawDuelScene(ts) {
  const cw = dCan.width, ch = dCan.height;
  const bg = dc.createLinearGradient(0, 0, 0, ch);
  bg.addColorStop(0, '#07031a');
  bg.addColorStop(1, '#180830');
  dc.fillStyle = bg;
  dc.fillRect(0, 0, cw, ch);

  // Stars
  [[22,10],[90,18],[170,7],[290,14],[410,9],[55,32],[240,22],[380,16]].forEach(([sx,sy]) => {
    dc.globalAlpha = 0.25 + 0.25 * Math.sin(ts / 900 + sx);
    dc.fillStyle = '#fff';
    dc.fillRect(sx * cw / 480, sy * ch / 120, 1.5, 1.5);
  });
  dc.globalAlpha = 1;

  // Ground plane
  const gg = dc.createLinearGradient(0, ch * 0.72, 0, ch);
  gg.addColorStop(0, '#180a30');
  gg.addColorStop(1, '#0a0418');
  dc.fillStyle = gg;
  dc.fillRect(0, ch * 0.72, cw, ch);
  dc.strokeStyle = 'rgba(138,58,170,0.3)';
  dc.lineWidth = 1;
  dc.beginPath(); dc.moveTo(0, ch * 0.72); dc.lineTo(cw, ch * 0.72); dc.stroke();

  // Wizard figures
  drawWizard(cw * 0.24, ch * 0.8, ch * 0.5, '#f0cc6a', false, DS.player.frozen, DS.player.contingencies.length);
  drawWizard(cw * 0.76, ch * 0.8, ch * 0.5, G.activeNpc.col, true, DS.enemy.frozen, DS.enemy.contingencies.length);
}

function drawWizard(x, y, height, col, flip, frozen, shieldCount) {
  const sz = height * 0.38;
  dc.save();
  if (flip) { dc.scale(-1, 1); x = -x; }

  if (frozen) {
    dc.fillStyle = 'rgba(136,221,255,0.12)';
    dc.beginPath(); dc.arc(x, y - sz * 0.5, sz * 0.85, 0, Math.PI * 2);
    dc.fill();
  }
  if (shieldCount > 0) {
    const gv = 0.07 + 0.04 * Math.sin(Date.now() / 300);
    dc.strokeStyle = `rgba(255,200,60,${gv * 7})`;
    dc.lineWidth = 1.5;
    for (let i = 0; i < shieldCount; i++) {
      dc.beginPath();
      dc.arc(x, y - sz * 0.5, sz * (0.72 + i * 0.14), 0, Math.PI * 2);
      dc.stroke();
    }
  }

  const bob = Math.sin(Date.now() / 600 + x) * 2;

  // Robe
  dc.fillStyle = col;
  dc.shadowColor = col; dc.shadowBlur = 14;
  dc.beginPath();
  dc.moveTo(x - sz * 0.32, y + bob);
  dc.lineTo(x - sz * 0.23, y - sz * 0.5 + bob);
  dc.lineTo(x + sz * 0.23, y - sz * 0.5 + bob);
  dc.lineTo(x + sz * 0.32, y + bob);
  dc.closePath(); dc.fill();
  // Hood
  dc.beginPath();
  dc.moveTo(x - sz * 0.23, y - sz * 0.5 + bob);
  dc.lineTo(x, y - sz * 1.08 + bob);
  dc.lineTo(x + sz * 0.23, y - sz * 0.5 + bob);
  dc.closePath(); dc.fill();
  dc.shadowBlur = 0;
  // Face
  dc.fillStyle = '#f5deb3';
  dc.beginPath();
  dc.ellipse(x, y - sz * 0.64 + bob, sz * 0.16, sz * 0.19, 0, 0, Math.PI * 2);
  dc.fill();
  // Eyes
  dc.fillStyle = '#222';
  dc.fillRect(x - sz * 0.09, y - sz * 0.69 + bob, sz * 0.055, sz * 0.055);
  dc.fillRect(x + sz * 0.03, y - sz * 0.69 + bob, sz * 0.055, sz * 0.055);
  // Staff
  const sfx = x + sz * 0.3;
  dc.strokeStyle = '#8b6914'; dc.lineWidth = 2.5;
  dc.beginPath(); dc.moveTo(sfx, y + bob); dc.lineTo(sfx, y - sz * 0.9 + bob); dc.stroke();
  const glow = 0.5 + 0.5 * Math.sin(Date.now() / 420);
  dc.fillStyle = col; dc.shadowColor = col; dc.shadowBlur = 10 + 8 * glow;
  dc.beginPath(); dc.arc(sfx, y - sz * 0.9 + bob, sz * 0.09, 0, Math.PI * 2);
  dc.fill(); dc.shadowBlur = 0;

  dc.restore();
}

// ─── PARTICLES & FLOATS ───────────────────────────────────────────────

function spawnParts(x, y, col, n) {
  for (let i = 0; i < (n || 14); i++) {
    const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 4;
    DS.parts.push({ x, y, col, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp-2, sz: 2+Math.random()*3, life:1, dec:0.022+Math.random()*0.028 });
  }
}

function spawnFloat(x, y, text, col) {
  DS.floats.push({ x, y, text, col, life: 1 });
}

function tickParticles() {
  DS.parts = DS.parts.filter(p => p.life > 0);
  DS.parts.forEach(p => {
    p.x += p.vx; p.y += p.vy; p.vy += 0.22; p.life -= p.dec;
    dc.globalAlpha = p.life;
    dc.fillStyle = p.col; dc.shadowColor = p.col; dc.shadowBlur = 6;
    dc.beginPath(); dc.arc(p.x, p.y, p.sz, 0, Math.PI*2); dc.fill();
    dc.shadowBlur = 0; dc.globalAlpha = 1;
  });
}

function tickFloats() {
  DS.floats = DS.floats.filter(f => f.life > 0);
  DS.floats.forEach(f => {
    f.y -= 0.8; f.life -= 0.015;
    dc.globalAlpha = Math.min(1, f.life * 5);
    dc.fillStyle = f.col; dc.shadowColor = f.col; dc.shadowBlur = 8;
    dc.font = 'bold 15px Cinzel, serif';
    dc.textAlign = 'center';
    dc.fillText(f.text, f.x, f.y);
    dc.shadowBlur = 0; dc.globalAlpha = 1;
  });
}

// ─── GLYPH KEYBOARD ───────────────────────────────────────────────────

function buildGlyphKeyboard() {
  buildTabs();
  buildGlyphGrid();
  document.getElementById('glyph-seq').textContent = '';
  document.getElementById('glyph-hint').textContent = 'Your turn — select glyphs then ★ Cast';
  document.getElementById('glyph-timer').style.width = '100%';
}

function buildTabs() {
  const el = document.getElementById('glyph-tabs');
  el.innerHTML = '';
  COLOR_KEYS.forEach(ck => {
    const c = COLORS[ck];
    const btn = document.createElement('button');
    btn.className = 'gtab' + (ck === DS.activeColor ? ' active' : '');
    btn.textContent = c.name;
    btn.style.setProperty('--tc', c.col);
    btn.onclick = () => { DS.activeColor = ck; buildTabs(); buildGlyphGrid(); };
    el.appendChild(btn);
  });
}

function buildGlyphGrid() {
  const ck = DS.activeColor;
  const c  = COLORS[ck];
  const el = document.getElementById('glyph-grid');
  el.innerHTML = '';
  c.glyphs.forEach(g => {
    const btn = document.createElement('button');
    btn.className = 'gbtn';
    btn.textContent = g;
    btn.style.setProperty('--gc', c.col);
    btn.onclick = () => pressGlyph(g, btn, c.col);
    el.appendChild(btn);
  });
}

function pressGlyph(glyph, btn, col) {
  if (!DS.playerTurn || DS.busy) return;
  DS.glyphSeq.push(glyph);
  if (DS.glyphSeq.length === 1) DS.timerStart = Date.now();

  // Flash animation
  btn.classList.add('flash');
  setTimeout(() => {
    btn.classList.remove('flash');
    btn.classList.add('fade');
    setTimeout(() => btn.classList.remove('fade'), 700);
  }, 130);

  // Reset inter-glyph timer
  clearTimeout(DS.interTimeout);
  DS.interTimeout = setTimeout(() => {
    if (DS.glyphSeq.length > 0) {
      addLog('Sequence broken — hesitated too long.');
      clearSeq();
    }
  }, DS.INTER_GLYPH);

  updateSeqDisplay();
}

function updateSeqDisplay() {
  const seqEl  = document.getElementById('glyph-seq');
  const hintEl = document.getElementById('glyph-hint');
  const termEl = document.getElementById('btn-cast');
  const seq = DS.glyphSeq.join('');
  const matchId = SPELL_SEQ_MAP[seq];

  seqEl.textContent = seq || '';

  if (matchId && G.player.spellIds.includes(matchId)) {
    const spell = SPELL_MAP[matchId];
    const disc  = affinityDiscount(G.player.castHistory, matchId);
    const cost  = Math.max(0, spell.mana - disc);
    const col   = COLORS[spell.color].col;
    hintEl.textContent = `${spell.name} · ${cost} mana${disc > 0 ? ` (affinity −${disc})` : ''} · Press ★`;
    termEl.style.boxShadow = `0 0 18px ${col}`;
  } else {
    hintEl.textContent = seq.length > 0 ? 'Continue… or ★ to attempt cast' : 'Select glyphs then ★ Cast';
    termEl.style.boxShadow = '';
  }
}

function clearSeq() {
  DS.glyphSeq = [];
  DS.timerStart = null;
  clearTimeout(DS.interTimeout);
  document.getElementById('glyph-seq').textContent = '';
  document.getElementById('glyph-hint').textContent = 'Select glyphs then ★ Cast';
  document.getElementById('btn-cast').style.boxShadow = '';
  document.getElementById('glyph-timer').style.width = '100%';
}

function updateTimerBar() {
  if (!DS || !DS.timerStart || !DS.playerTurn) return;
  const pct = Math.max(0, 1 - (Date.now() - DS.timerStart) / DS.TIMER_LEN);
  document.getElementById('glyph-timer').style.width = (pct * 100) + '%';
  if (pct <= 0) {
    addLog('Cast timer expired — spell fails! 1 mana lost.');
    DS.player.mana = Math.max(0, DS.player.mana - 1);
    updateDuelHUD();
    clearSeq();
  }
}

function attemptCast() {
  if (!DS.playerTurn || DS.busy) return;
  clearTimeout(DS.interTimeout);
  const seq = DS.glyphSeq.join('');
  if (!seq) { addLog('No glyphs entered.'); return; }

  const spellId = SPELL_SEQ_MAP[seq];
  if (!spellId) {
    addLog(`Unknown sequence “${seq}” — fizzles!`);
    clearSeq();
    return;
  }
  if (!G.player.spellIds.includes(spellId)) {
    addLog(`You don't know that spell yet.`);
    clearSeq();
    return;
  }
  const spell = SPELL_MAP[spellId];
  const disc  = affinityDiscount(G.player.castHistory, spellId);
  const cost  = Math.max(0, spell.mana - disc);

  if (DS.player.mana < cost) {
    addLog(`Not enough mana for ${spell.name}! (need ${cost}) — 1 mana lost.`);
    DS.player.mana = Math.max(0, DS.player.mana - 1);
    updateDuelHUD();
    clearSeq();
    return;
  }

  DS.player.mana -= cost;
  recordCast(spellId);
  clearSeq();
  const discStr = disc > 0 ? ` (affinity −${disc})` : '';
  addLog(`You cast ${spell.name}${discStr}!`);
  resolveSpell(spell, 'player', 'enemy');
}

function channelMana() {
  if (!DS.playerTurn || DS.busy) return;
  const gain = DS.player.manaRegen;
  DS.player.mana = Math.min(DS.player.maxMana, DS.player.mana + gain);
  addLog(`You channel arcane energy. +${gain} mana.`);
  updateDuelHUD();
  endPlayerTurn();
}

// ─── SPELL RESOLUTION ────────────────────────────────────────────────

function resolveSpell(spell, atkKey, defKey) {
  DS.busy = true;
  setInputEnabled(false);
  const cw = dCan.width, ch = dCan.height;
  const atkX = atkKey === 'player' ? cw * 0.24 : cw * 0.76;
  const defX = defKey === 'player' ? cw * 0.24 : cw * 0.76;
  const atk  = DS[atkKey];
  const def  = DS[defKey];
  const fx   = spell.effect;

  setTimeout(() => {
    // Self-targeted effects
    if (fx) {
      if (fx.type === 'heal') {
        atk.hp = Math.min(atk.maxHp, atk.hp + fx.amt);
        spawnParts(atkX, ch * 0.55, '#44cc66');
        spawnFloat(atkX, ch * 0.45, `+${fx.amt} HP`, '#44cc66');
        addLog(`${spell.name}: restored ${fx.amt} HP.`);
      }
      if (fx.type === 'ward') {
        atk.contingencies.unshift({ id:'ward_live', col:'#ffcc44', hp: fx.hp });
        spawnFloat(atkX, ch * 0.45, `Ward +${fx.hp}`, '#ffcc44');
        addLog(`${spell.name}: created a ${fx.hp} HP ward.`);
      }
      if (fx.type === 'shield') {
        atk.contingencies.unshift({ id:'shield_live', col:'#88aaff', absorb: fx.absorb, hits: fx.hits });
        spawnFloat(atkX, ch * 0.45, 'Divine Shield!', '#88aaff');
        addLog(`${spell.name}: absorb shield active.`);
      }
    }

    // Damage
    if (spell.dmg > 0) {
      const pierce = fx && fx.type === 'pierce';
      if (!pierce && def.contingencies.length > 0) {
        hitContingency(def, spell.dmg, defX, ch);
      } else {
        dealDamage(def, spell.dmg, defX, ch);
      }
    }

    // Debuff effects
    if (fx) {
      if (fx.type === 'bleed') {
        def.bleedTurns = fx.turns; def.bleedDmg = fx.dmg;
        addLog(`${spell.name}: bleeding ${fx.dmg}/turn × ${fx.turns}.`);
      }
      if (fx.type === 'burn') {
        def.burnTurns = fx.turns; def.burnDmg = fx.dmg;
        addLog(`${spell.name}: burning ${fx.dmg}/turn × ${fx.turns}.`);
        spawnFloat(defX, ch * 0.45, '🔥 Burn!', '#ff6622');
      }
      if (fx.type === 'freeze') {
        def.frozen = true;
        addLog(`${spell.name}: ${defKey === 'enemy' ? G.activeNpc.name : 'You'} frozen next turn!`);
        spawnFloat(defX, ch * 0.45, '❄ Frozen!', '#88ddff');
      }
      if (fx.type === 'drain') {
        const taken = Math.min(def.mana, fx.amt);
        def.mana -= taken;
        atk.mana = Math.min(atk.maxMana, atk.mana + taken);
        addLog(`${spell.name}: drained ${taken} mana!`);
        spawnFloat(defX, ch * 0.45, `-${taken} mana`, '#88aaff');
      }
      if (fx.type === 'reveal') {
        const names = G.activeNpc.spellIds.slice(0, 3).map(id => SPELL_MAP[id]?.name || id).join(', ');
        addLog(`Illuminate: ${G.activeNpc.name} knows — ${names}...`);
        spawnFloat(defX, ch * 0.35, '🔦 Revealed!', '#ffcc44');
      }
    }

    updateDuelHUD();
    setTimeout(() => {
      DS.busy = false;
      if (checkDuelEnd()) return;
      if (atkKey === 'player') endPlayerTurn();
      else endEnemyTurn();
    }, 500);
  }, 280);
}

function hitContingency(def, dmg, defX, ch) {
  const cont = def.contingencies[def.contingencies.length - 1];
  if (cont.hp !== undefined) {
    // HP-based ward
    const leftover = dmg - cont.hp;
    cont.hp -= dmg;
    if (cont.hp <= 0) {
      def.contingencies.pop();
      addLog(`Ward shattered! (${dmg} dmg)`);
      spawnParts(defX, ch * 0.5, '#ffcc44');
      if (leftover > 0) dealDamage(def, leftover, defX, ch);
    } else {
      addLog(`Ward absorbs ${dmg} dmg. (${cont.hp} HP left)`);
      spawnFloat(defX, ch * 0.48, `-${dmg} (ward)`, '#ffcc44');
    }
  } else if (cont.absorb) {
    const absorbed = Math.round(dmg * cont.absorb);
    const through  = dmg - absorbed;
    cont.hits--;
    if (cont.hits <= 0) {
      def.contingencies.pop();
      addLog(`Shell absorbed ${absorbed}, shattered!`);
    } else {
      addLog(`Shell absorbed ${absorbed} damage.`);
    }
    spawnParts(defX, ch * 0.5, '#4488ff');
    if (through > 0) dealDamage(def, through, defX, ch);
  } else if (cont.reflect) {
    addLog(`Mirror Veil reflects ${cont.reflect} back!`);
    def.contingencies.pop();
    // Reflect back to attacker (player is always defender here in player’s resolve)
    const attacker = def === DS.player ? DS.enemy : DS.player;
    attacker.hp = Math.max(0, attacker.hp - cont.reflect);
    const atkX = def === DS.player ? dCan.width * 0.76 : dCan.width * 0.24;
    spawnFloat(atkX, ch * 0.48, `-${cont.reflect} (reflect)`, '#cc88ff');
    spawnParts(defX, ch * 0.5, '#cc88ff');
  } else {
    // Regen contingency — doesn’t block hits, already applied each turn
    dealDamage(def, dmg, defX, ch);
  }
}

function dealDamage(def, dmg, defX, ch) {
  def.hp = Math.max(0, def.hp - dmg);
  spawnParts(defX, ch * 0.55, '#ff4444');
  spawnFloat(defX, ch * 0.44, `-${dmg}`, '#ff6666');
  addLog(`Hit for ${dmg} damage!`);
}

// ─── TURN MANAGEMENT ────────────────────────────────────────────────

function endPlayerTurn() {
  DS.playerTurn = false;
  setInputEnabled(false);
  document.getElementById('dh-turn').textContent = `${G.activeNpc.name}’s Turn`;
  applyDoTs('player');
  if (checkDuelEnd()) return;
  setTimeout(enemyTurn, 820);
}

function endEnemyTurn() {
  DS.round++;
  document.getElementById('dh-round').textContent = `Round ${DS.round}`;
  // Mana regen
  DS.player.mana = Math.min(DS.player.maxMana, DS.player.mana + DS.player.manaRegen);
  DS.enemy.mana  = Math.min(DS.enemy.maxMana,  DS.enemy.mana  + DS.enemy.manaRegen);
  // Regen contingencies (lifebraid)
  applyRegenConts('player');
  applyRegenConts('enemy');
  applyDoTs('enemy');
  if (checkDuelEnd()) return;
  DS.playerTurn = true;
  document.getElementById('dh-turn').textContent = 'Your Turn';
  setInputEnabled(true);
  updateDuelHUD();
}

function applyRegenConts(who) {
  const s = DS[who];
  const cx = who === 'player' ? dCan.width * 0.24 : dCan.width * 0.76;
  s.contingencies.forEach(c => {
    if (c.regen && c.regenTurns > 0) {
      s.hp = Math.min(s.maxHp, s.hp + c.regen);
      c.regenTurns--;
      spawnFloat(cx, dCan.height * 0.48, `+${c.regen} regen`, '#44cc66');
      addLog(`Life Braid: +${c.regen} HP.`);
    }
  });
  s.contingencies = s.contingencies.filter(c => !c.regen || c.regenTurns > 0);
}

function applyDoTs(who) {
  const s  = DS[who];
  const cx = who === 'player' ? dCan.width * 0.24 : dCan.width * 0.76;
  const ch = dCan.height;
  const label = who === 'player' ? 'You' : G.activeNpc.name;
  if (s.bleedTurns > 0) {
    s.hp = Math.max(0, s.hp - s.bleedDmg);
    s.bleedTurns--;
    spawnFloat(cx, ch * 0.48, `-${s.bleedDmg} bleed`, '#ff4466');
    addLog(`${label} bleed${who === 'player' ? '' : 's'} for ${s.bleedDmg}.`);
  }
  if (s.burnTurns > 0) {
    s.hp = Math.max(0, s.hp - s.burnDmg);
    s.burnTurns--;
    spawnFloat(cx, ch * 0.44, `-${s.burnDmg} burn`, '#ff6622');
    addLog(`${label} burn${who === 'player' ? '' : 's'} for ${s.burnDmg}.`);
  }
  if (s.frozen) {
    s.frozen = false;
    addLog(`${label} ${who === 'player' ? 'thaw' : 'thaws'} out.`);
  }
  updateDuelHUD();
}

// ─── ENEMY AI ─────────────────────────────────────────────────────────────

function enemyTurn() {
  if (G.screen !== 'duel') return;
  const npc = G.activeNpc;
  const en  = DS.enemy;

  if (en.frozen) {
    addLog(`${npc.name} is frozen — skips turn!`);
    en.frozen = false;
    endEnemyTurn();
    return;
  }

  // Available spells with NPC affinity cost reduction
  const available = npc.spellIds
    .map(id => SPELL_MAP[id])
    .filter(s => s && en.mana >= npcCost(s, npc));

  if (!available.length || (en.mana < 3 && Math.random() < 0.65)) {
    const gain = en.manaRegen;
    en.mana = Math.min(en.maxMana, en.mana + gain);
    addLog(`${npc.name} channels. +${gain} mana.`);
    updateDuelHUD();
    setTimeout(endEnemyTurn, 600);
    return;
  }

  const spell = pickEnemySpell(available, npc);
  const cost  = npcCost(spell, npc);
  en.mana -= cost;
  addLog(`${npc.name} casts ${spell.name}!`);
  resolveSpell(spell, 'enemy', 'player');
}

function npcCost(spell, npc) {
  const prof = npc.affinityProfile || {};
  const v    = prof[spell.color] || 0;
  const disc = v >= 40 ? 2 : v >= 15 ? 1 : 0;
  return Math.max(0, spell.mana - disc);
}

function pickEnemySpell(available, npc) {
  const prof = npc.affinityProfile || {};
  const ps   = DS.player;
  // Heal if desperate
  if (DS.enemy.hp < DS.enemy.maxHp * 0.3) {
    const h = available.find(s => s.effect && s.effect.type === 'heal');
    if (h) return h;
  }
  // Ward if nothing up
  if (DS.enemy.contingencies.length === 0) {
    const w = available.find(s => s.effect && s.effect.type === 'ward');
    if (w) return w;
  }
  // Freeze if player mana is high
  if (ps.mana > 9) {
    const f = available.find(s => s.effect && s.effect.type === 'freeze');
    if (f) return f;
  }
  // Prefer affinity colour
  const affinity = available.filter(s => (prof[s.color] || 0) >= 20);
  if (affinity.length) return affinity[Math.floor(Math.random() * affinity.length)];
  return available[Math.floor(Math.random() * available.length)];
}

// ─── DUEL END ────────────────────────────────────────────────────────────

function checkDuelEnd() {
  if (DS.enemy.hp  <= 0) { endDuel(true);  return true; }
  if (DS.player.hp <= 0) { endDuel(false); return true; }
  return false;
}

function endDuel(victory) {
  cancelAnimationFrame(G.duelRaf);
  G.duelRaf = null;
  setInputEnabled(false);
  const npc = G.activeNpc;

  if (npc.isRoamingEnemy) {
    if (victory) {
      npc.alive = false;
      G.player.hp   = DS.player.hp;
      G.player.mana = DS.player.mana;
      document.getElementById('res-icon').textContent  = '⚔';
      const titleEl = document.getElementById('res-title');
      titleEl.textContent = 'Enemy Slain';
      titleEl.style.color = '#44cc66';
      document.getElementById('res-desc').textContent  = `The ${npc.name} has been defeated.`;
      document.getElementById('res-rewards').textContent = 'Continue your journey.';
    } else {
      G.player.hp   = Math.max(30, Math.floor(G.player.maxHp * 0.5));
      G.player.mana = G.player.manaRegen * 2;
      document.getElementById('res-icon').textContent = '💀';
      const titleEl = document.getElementById('res-title');
      titleEl.textContent = 'Defeated';
      titleEl.style.color = '#ff4466';
      document.getElementById('res-desc').textContent  = `The ${npc.name} overpowers you. Recover and return.`;
      document.getElementById('res-rewards').textContent = '';
    }
    setScreen('result');
    return;
  }

  if (victory) {
    npc.defeated = true;
    const newSpells = (npc.reward || []).filter(id => !G.player.spellIds.includes(id));
    newSpells.forEach(id => G.player.spellIds.push(id));
    G.player.hp   = DS.player.hp;
    G.player.mana = DS.player.mana;

    document.getElementById('res-icon').textContent  = '🏆';
    const titleEl = document.getElementById('res-title');
    titleEl.textContent = 'Victory!';
    titleEl.style.color = '';
    document.getElementById('res-desc').textContent =
      `${npc.name} defeated.\n${npc.defeatMsg}`;
    const rEl = document.getElementById('res-rewards');
    if (newSpells.length) {
      rEl.textContent = `✨ Learned: ${newSpells.map(id => SPELL_MAP[id]?.name).join(', ')}`;
    } else {
      const done = G.npcs.filter(n => n.defeated).length;
      rEl.textContent = `${done}/${G.npcs.length} arch-wizards defeated`;
    }
  } else {
    document.getElementById('res-icon').textContent = '💀';
    const titleEl = document.getElementById('res-title');
    titleEl.textContent = 'Defeated';
    titleEl.style.color = '#ff4466';
    document.getElementById('res-desc').textContent =
      `${npc.name} has bested you. Recover and return.`;
    document.getElementById('res-rewards').textContent = '';
    G.player.hp   = Math.max(30, Math.floor(G.player.maxHp * 0.5));
    G.player.mana = G.player.manaRegen * 2;
  }
  setScreen('result');
}

// ─── DUEL HUD ─────────────────────────────────────────────────────────────

function updateDuelHUD() {
  if (!DS) return;
  const p = DS.player, e = DS.enemy;
  setBar('dh-php',   p.hp,   p.maxHp);
  setBar('dh-pmana', p.mana, p.maxMana);
  setBar('dh-ehp',   e.hp,   e.maxHp);
  setBar('dh-emana', e.mana, e.maxMana);
  document.getElementById('dh-pname').textContent = G.player.name;
  document.getElementById('dh-ename').textContent = G.activeNpc?.name || 'Enemy';
  renderContPips('dh-pcont', p.contingencies);
  renderContPips('dh-econt', e.contingencies);
}

function setBar(id, val, max) {
  const el = document.getElementById(id);
  if (el) el.style.width = `${Math.max(0, Math.min(100, (val / max) * 100))}%`;
}

function renderContPips(id, conts) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = '';
  conts.forEach(c => {
    const pip = document.createElement('span');
    pip.className = 'cont-pip';
    pip.style.background = c.col || '#888';
    pip.title = c.id;
    el.appendChild(pip);
  });
}

function setInputEnabled(on) {
  ['btn-cast', 'btn-clear', 'btn-channel'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = !on;
  });
  document.querySelectorAll('.gbtn, .gtab').forEach(el => {
    el.style.pointerEvents = on ? '' : 'none';
    el.style.opacity = on ? '' : '0.35';
  });
}

// ─── LOG ────────────────────────────────────────────────────────────────

function addLog(msg) {
  const log = document.getElementById('duel-log');
  if (!log) return;
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = msg;
  log.appendChild(entry);
  setTimeout(() => entry.remove(), 3500);
  while (log.children.length > 3) log.removeChild(log.firstChild);
}

// ─── STARTER SPELL UI (create screen) ────────────────────────────────

function buildStarterUI() {
  const el = document.getElementById('starter-spell-list');
  el.innerHTML = '';
  STARTER_IDS.forEach(id => {
    const s = SPELL_MAP[id];
    const c = COLORS[s.color];
    const card = document.createElement('div');
    card.className = 'starter-card';
    card.style.setProperty('--sc', c.col);
    card.innerHTML =
      `<span class="sc-icon">${s.icon}</span>` +
      `<span class="sc-name">${s.name}</span>` +
      `<span class="sc-desc">${s.desc}</span>`;
    el.appendChild(card);
  });
}

// ─── BOOTSTRAP ────────────────────────────────────────────────────────────────

window.addEventListener('load', () => {
  initGame();
  buildStarterUI();

  // — Title
  document.getElementById('btn-newgame').onclick = () => setScreen('create');
  document.getElementById('btn-ponder').onclick  = () => {
    initGame();
    G.player.name     = 'Ponder';
    G.player.spellIds = SPELLS.map(s => s.id);
    G.player.hp = G.player.maxHp = 999;
    G.player.mana = G.player.maxMana = 20;
    document.getElementById('wizard-name').value = 'Ponder';
    buildStarterUI();
    setScreen('create');
  };

  // — Create
  document.getElementById('btn-start-journey').onclick = () => {
    const name = (document.getElementById('wizard-name').value || '').trim() || 'Archmage';
    G.player.name = name;
    openAtlas('create');
  };
  document.getElementById('btn-create-back').onclick = () => setScreen('title');

  // — Atlas
  document.getElementById('btn-atlas-back').onclick = () => {
    if (G.atlasFrom === 'world' && G.currentRegion) {
      setScreen('world');
      startWorld();
    } else {
      setScreen('create');
    }
  };
  document.getElementById('btn-open-atlas').onclick = () => openAtlas('world');

  // — World D-pad
  document.querySelectorAll('#world-dpad .dpbtn').forEach(btn => {
    const dir = btn.dataset.dir;
    const setDir = () => { G.world.moveDir = dir; };
    const clrDir = () => { if (G.world.moveDir === dir) G.world.moveDir = null; };
    btn.addEventListener('pointerdown', setDir);
    btn.addEventListener('pointerup',   clrDir);
    btn.addEventListener('pointerleave', clrDir);
  });

  // — Keyboard
  const K_MAP = {
    ArrowUp:'n', ArrowDown:'s', ArrowLeft:'w', ArrowRight:'e',
    w:'n', s:'s', a:'w', d:'e',
  };
  window.addEventListener('keydown', e => {
    if (K_MAP[e.key] && G.screen === 'world') {
      G.world.moveDir = K_MAP[e.key];
      e.preventDefault();
    }
    if (e.key === 'm' || e.key === 'M') {
      if (G.screen === 'world') openAtlas('world');
      else if (G.screen === 'atlas' && G.atlasFrom === 'world' && G.currentRegion) {
        setScreen('world'); startWorld();
      }
    }
  });
  window.addEventListener('keyup', e => {
    if (K_MAP[e.key] && G.world.moveDir === K_MAP[e.key])
      G.world.moveDir = null;
  });

  // — Prep
  document.getElementById('btn-enter-duel').onclick   = () => startDuel();
  document.getElementById('btn-prep-retreat').onclick = () => { setScreen('world'); startWorld(); };

  // — Duel actions
  document.getElementById('btn-cast').onclick    = attemptCast;
  document.getElementById('btn-clear').onclick   = clearSeq;
  document.getElementById('btn-channel').onclick = channelMana;

  // — Result
  document.getElementById('btn-res-cont').onclick = () => {
    if (!G.activeNpc?.isRoamingEnemy && G.npcs.every(n => n.defeated)) {
      document.getElementById('res-icon').textContent  = '\ud83d�';
      document.getElementById('res-title').textContent = 'Arch-Wizard!';
      document.getElementById('res-title').style.color = '';
      document.getElementById('res-desc').textContent  =
        'You have defeated all four arch-wizards. The world bows to your mastery.';
      document.getElementById('res-rewards').textContent = 'Your legend is complete.';
      document.getElementById('btn-res-cont').textContent = 'Play Again';
      document.getElementById('btn-res-cont').onclick = () => {
        initGame();
        buildStarterUI();
        setScreen('title');
      };
    } else {
      setScreen('world');
      startWorld();
    }
  };

  // — Resize
  window.addEventListener('resize', () => {
    if (G.screen === 'world') resizeWCan();
    if (G.screen === 'duel')  resizeDuelCanvas();
  });
});

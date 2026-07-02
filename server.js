import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const PUBLIC_URL = process.env.PUBLIC_URL || '';
const ROOM_SIZE = Number(process.env.ROOM_SIZE || 4);
const ROOM_TTL_MS = Number(process.env.ROOM_TTL_MS || 1000 * 60 * 60 * 2);
const TURN_TIMEOUT_MS = 30000;

const LEVELS = JSON.parse(readFileSync(path.join(__dirname, 'levels.json'), 'utf8'));

// 五行相克
const ELEMENT_CHART = { metal: 'wood', wood: 'earth', earth: 'water', water: 'fire', fire: 'metal' };

function getElementMultiplier(a, d) {
  if (!a || !d) return 1;
  if (ELEMENT_CHART[a] === d) return 1.5;
  if (ELEMENT_CHART[d] === a) return 0.75;
  return 1;
}

const HEROES = [
  { id: 'drli', name: '李博士', role: '法师', element: 'metal', hp: 85, maxHp: 85, mp: 130, maxMp: 130, atk: 45, def: 14, spd: 20,
    img: 'assets/characters/pixel-drli.jpg',
    skills: [
      { name: '⚗️ 科学爆破', mp: 25, type: 'dmg', multiplier: 2.0, target: 'single', desc: '调配化学药剂引爆，对单个敌人造成200%法术伤害', anim: 'explosion' },
      { name: '🔬 数据分析', mp: 20, type: 'buff', buff: 'atkUp', stat: 'atk', value: 0.25, turns: 3, target: 'all', desc: '分析敌人弱点，全队攻击力+25%持续3回合', anim: 'buff_up' }
    ]
  },
  { id: 'tony', name: 'Tony', role: '辅助', element: 'metal', hp: 95, maxHp: 95, mp: 110, maxMp: 110, atk: 22, def: 22, spd: 30,
    img: 'assets/characters/pixel-tony.jpg',
    skills: [
      { name: '💻 代码病毒', mp: 25, type: 'debuff', debuff: 'defDown', stat: 'def', value: 0.35, turns: 3, target: 'allEnemy', desc: '入侵敌人系统，全体防御-35%持续3回合', anim: 'virus' },
      { name: '🔄 系统重启', mp: 45, type: 'revive', heal: 60, target: 'single', desc: '紧急重启倒下队友的核心程序，复活并恢复60HP', anim: 'revive' }
    ]
  },
  { id: 'xiaoqi', name: '小琪', role: '治疗', element: 'water', hp: 80, maxHp: 80, mp: 140, maxMp: 140, atk: 18, def: 16, spd: 24,
    img: 'assets/characters/pixel-xiaoqi.jpg',
    skills: [
      { name: '🌈 彩虹治愈', mp: 28, type: 'heal', heal: 80, target: 'single', desc: '召唤虹桥彩虹之力，为单体恢复80HP', anim: 'rainbow_heal' },
      { name: '⭐ 星光护盾', mp: 35, type: 'buff', buff: 'shield', value: 1, turns: 3, target: 'all', desc: '化作星光护罩笼罩全队，3回合内各抵挡一次伤害', anim: 'shield' }
    ]
  },
  { id: 'chenguang', name: '晨光', role: '战士', element: 'water', hp: 160, maxHp: 160, mp: 70, maxMp: 70, atk: 40, def: 38, spd: 14,
    img: 'assets/characters/pixel-chenguang.jpg',
    skills: [
      { name: '🥛 鲜奶冲击', mp: 22, type: 'dmgHeal', multiplier: 1.5, healSelf: 35, target: 'single', desc: '投掷变质鲜奶炸弹，150%伤害并自愈35HP', anim: 'milk_splash' },
      { name: '🛡️ 坚韧守护', mp: 28, type: 'buff', buff: 'defUp', stat: 'def', value: 0.6, turns: 2, target: 'self', desc: '进入防御姿态，自身防御+60%持续2回合', anim: 'defense_up' }
    ]
  },
  { id: 'laozhou', name: '老周', role: '坦克', element: 'wood', hp: 200, maxHp: 200, mp: 60, maxMp: 60, atk: 32, def: 45, spd: 10,
    img: 'assets/characters/pixel-laozhou.jpg',
    skills: [
      { name: '🌾 农耕之力', mp: 18, type: 'dmgDebuff', multiplier: 1.4, debuff: 'atkDown', stat: 'atk', value: 0.25, turns: 3, target: 'single', desc: '挥舞锄头攻击并震慑敌人，140%伤害且敌人攻击-25%', anim: 'earth_smash' },
      { name: '🧠 经验传授', mp: 22, type: 'buff', buff: 'spdUp', stat: 'spd', value: 0.3, turns: 3, target: 'all', desc: '传授光明农场生存经验，全队速度+30%持续3回合', anim: 'speed_up' }
    ]
  },
  { id: 'azhen', name: '阿珍', role: '增益', element: 'fire', hp: 100, maxHp: 100, mp: 115, maxMp: 115, atk: 30, def: 24, spd: 18,
    img: 'assets/characters/pixel-azhen.jpg',
    skills: [
      { name: '🫕 乳鸽大餐', mp: 35, type: 'healBuff', heal: 50, buff: 'atkUp', stat: 'atk', value: 0.2, turns: 2, target: 'all', desc: '光明乳鸽香气四溢，全队恢复50HP且攻击+20%', anim: 'food_feast' },
      { name: '🍰 美食诱惑', mp: 22, type: 'debuff', debuff: 'stun', chance: 0.55, turns: 1, target: 'single', desc: '用烘焙美食引诱敌人，55%概率眩晕1回合', anim: 'stun_sweet' }
    ]
  },
  { id: 'libao', name: '荔宝', role: '刺客', element: 'wood', hp: 80, maxHp: 80, mp: 90, maxMp: 90, atk: 52, def: 14, spd: 36,
    img: 'assets/characters/pixel-libao.jpg',
    skills: [
      { name: '🥋 荔枝飞镖', mp: 22, type: 'dmg', multiplier: 2.2, target: 'single', desc: '投掷爆炸荔枝，对单个敌人造成220%伤害', anim: 'throwing_star' },
      { name: '🍯 甜蜜暴击', mp: 28, type: 'dmg', multiplier: 1.8, critBonus: 0.35, target: 'single', desc: '甜蜜一击，180%伤害且暴击率+35%', anim: 'critical_hit' }
    ]
  }
];

const ITEMS = {
  hpPotion: { name: '生命药水', icon: '🧪', heal: 80, type: 'hp', desc: '恢复80HP' },
  mpPotion: { name: '法力药水', icon: '🔵', heal: 50, type: 'mp', desc: '恢复50MP' }
};

// ========== 创建Express应用 ==========
const app = express();
app.use(express.json({ limit: '64kb' }));

// ========== 游戏数据（供客户端使用） ==========
const heroData = HEROES.map(h => ({ id: h.id, name: h.name, role: h.role, element: h.element, img: h.img, hp: h.hp, mp: h.mp, atk: h.atk, def: h.def, spd: h.spd, skills: h.skills }));
const levelData = LEVELS.map(l => ({ id: l.id, name: l.name, index: l.index, description: l.description, background: l.background, bgm: l.bgm, reward: l.reward, enemies: l.enemies }));

// ========== 计算文件hash用于缓存清除 ==========
function fileHash(filePath) {
  try {
    const content = readFileSync(filePath);
    return createHash('md5').update(content).digest('hex').slice(0, 8);
  } catch { return Date.now().toString(36); }
}

const publicDir = path.join(__dirname, 'public');
const cssHash = fileHash(path.join(publicDir, 'style.css'));
const gameHash = fileHash(path.join(publicDir, 'game.js'));
const storyHash = fileHash(path.join(publicDir, 'story.js'));
const chiptuneHash = fileHash(path.join(publicDir, 'chiptune.js'));

// ========== 生成并写入gamedata.js（静态文件，包含自动路径检测和游戏数据） ==========
const gamedataContent = `// Auto-generated - game data with auto path detection
(function(){
  // 方法1: 使用document.currentScript（最可靠，在脚本执行时指向当前script标签）
  var basePath = '/';
  var socketPath = '/socket.io';
  try {
    var cs = document.currentScript;
    if (cs && cs.src) {
      // cs.src like "https://host/play/xxx/gamedata.js?v=xxx"
      var a = document.createElement('a');
      a.href = cs.src;
      var p = a.pathname;
      var ls = p.lastIndexOf('/');
      basePath = p.substring(0, ls + 1); // "/play/xxx/"
      socketPath = basePath + 'socket.io'; // "/play/xxx/socket.io"
    }
  } catch(e) {}
  // 方法2: 回退 - 从location.pathname推断
  if (basePath === '/') {
    try {
      var pn = location.pathname;
      if (pn.endsWith('.html') || pn.endsWith('.htm')) {
        var ls2 = pn.lastIndexOf('/');
        basePath = pn.substring(0, ls2 + 1);
      } else if (pn.endsWith('/')) {
        basePath = pn;
      } else {
        var ls3 = pn.lastIndexOf('/');
        basePath = pn.substring(0, ls3 + 1);
      }
      socketPath = basePath + 'socket.io';
    } catch(e) {}
  }
  // 方法3: 从已加载的socket.io.js脚本标签检测
  function detectFromSocketIO() {
    var ss = document.getElementsByTagName('script');
    for (var i = 0; i < ss.length; i++) {
      var s = ss[i].src || '';
      if (s.indexOf('socket.io.js') !== -1) {
        var a2 = document.createElement('a');
        a2.href = s;
        var p2 = a2.pathname;
        // 查找路径中的 /socket.io/ 段，其前面是应用basePath
        var sioIdx = p2.indexOf('/socket.io/');
        if (sioIdx !== -1) {
          var appBase = p2.substring(0, sioIdx);
          if (appBase === '') appBase = '/';
          else if (appBase.charAt(appBase.length - 1) !== '/') appBase = appBase + '/';
          // 只在currentScript检测失败(basePath仍为'/')或检测到子路径时才更新
          if (basePath === '/' && appBase !== '/') {
            basePath = appBase;
          }
          // socketPath始终是 basePath + 'socket.io'
          var computedBase = (basePath === '/' ? '/' : basePath);
          socketPath = computedBase + 'socket.io';
        }
        return;
      }
    }
  }
  detectFromSocketIO();
  // socket.io.js可能在gamedata.js之后加载，DOMContentLoaded时再检测一次
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', detectFromSocketIO);
  }
  window.__GAME_BASE_PATH__ = basePath;
  window.__GAME_SOCKET_PATH__ = socketPath;
  window.__GAME_HEROES__ = ${JSON.stringify(heroData)};
  window.__GAME_LEVELS__ = ${JSON.stringify(levelData)};
  // 工具函数：解析相对于游戏根路径的URL
  window.__GAME_RESOLVE__ = function(relativePath) {
    if (!relativePath) return relativePath;
    if (relativePath.indexOf('://') !== -1 || relativePath.indexOf('data:') === 0) return relativePath;
    if (relativePath.charAt(0) === '/') return relativePath;
    return basePath + relativePath;
  };
  console.log('[GameData] basePath:', basePath, 'socketPath:', socketPath);
})();`;

const gamedataPath = path.join(publicDir, 'gamedata.js');
writeFileSync(gamedataPath, gamedataContent, 'utf8');
const gamedataHash = fileHash(gamedataPath);
console.log('已生成 gamedata.js (hash:', gamedataHash, ')');

// ========== 动态生成index.html ==========
const indexTemplate = readFileSync(path.join(publicDir, 'index.html'), 'utf8');
const dynamicIndexHTML = indexTemplate
  .replace(/gamedata\.js\?v=[^"]*/g, 'gamedata.js?v=' + gamedataHash)
  .replace(/gamedata\.js(?!\?)/g, 'gamedata.js?v=' + gamedataHash)
  .replace(/style\.css\?v=[^"]*/g, 'style.css?v=' + cssHash)
  .replace(/style\.css(?!\?)/g, 'style.css?v=' + cssHash)
  .replace(/game\.js\?v=[^"]*/g, 'game.js?v=' + gameHash)
  .replace(/game\.js(?!\?)/g, 'game.js?v=' + gameHash)
  .replace(/story\.js\?v=[^"]*/g, 'story.js?v=' + storyHash)
  .replace(/story\.js(?!\?)/g, 'story.js?v=' + storyHash)
  .replace(/chiptune\.js\?v=[^"]*/g, 'chiptune.js?v=' + chiptuneHash)
  .replace(/chiptune\.js(?!\?)/g, 'chiptune.js?v=' + chiptuneHash);

// ========== 游戏状态 ==========
const rooms = new Map();
const playerRooms = new Map();

// ========== Express路由 ==========
// 健康检查和API
app.get('/health', (_req, res) => res.json({ ok: true, rooms: rooms.size, uptime: process.uptime() }));
app.get('/api/heroes', (_req, res) => res.json(heroData));
app.get('/api/levels', (_req, res) => res.json(levelData));

// 静态文件服务（index:false 防止自动返回静态index.html，统一由SPA fallback返回动态版本）
app.use(express.static(publicDir, {
  index: false,
  etag: true,
  setHeaders(res, filePath) {
    if (/\.(png|jpe?g|webp|gif|svg|jpg|wav|mp3|ogg|woff2?)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    } else if (/\.(js|css)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  },
}));

// SPA fallback: 所有非API、非静态文件的路径都返回动态index.html（带hash版本号防缓存）
app.get('*', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.send(dynamicIndexHTML);
});

// ========== 创建HTTP服务器和Socket.IO ==========
// 标准架构：http.createServer(app) → new Server(server)
// Engine.IO的attach方法会自动缓存Express监听器，自己作为守门人按路径分发
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true },
  path: '/socket.io',
  serveClient: true,
  maxHttpBufferSize: 64 * 1024,
  perMessageDeflate: { threshold: 256 },
  httpCompression: { threshold: 256 },
  transports: ['websocket', 'polling'],
});

// ========== 游戏逻辑函数 ==========

function makeCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do { code = Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join(''); }
  while (rooms.has(code));
  return code;
}

function createRoom(hostId) {
  const room = {
    code: makeCode(), hostId, phase: 'lobby',
    players: new Map(), heroes: new Map(), playerData: new Map(),
    levelIndex: 0, battle: null, clearedLevels: new Set(),
    lastActivity: Date.now(), startedAt: Date.now(), turnTimer: null, chatLog: [],
  };
  rooms.set(room.code, room);
  return room;
}

function cleanupRoom(room) {
  if (room.turnTimer) clearTimeout(room.turnTimer);
  rooms.delete(room.code);
}

function getEffectiveStat(unit, stat) {
  let val = unit[stat];
  for (const b of unit.buffs || []) if (b.stat === stat) val = Math.round(val * (1 + b.value));
  for (const d of unit.debuffs || []) if (d.stat === stat) val = Math.round(val * (1 - d.value));
  return val;
}

function applyBuff(unit, buff) {
  unit.buffs = unit.buffs || [];
  const existing = unit.buffs.find(b => b.type === buff.type);
  if (existing) { existing.value = Math.max(existing.value, buff.value); existing.turns = Math.max(existing.turns, buff.turns || 3); }
  else unit.buffs.push({ ...buff, turns: buff.turns || 3 });
}

function applyDebuff(unit, debuff) {
  unit.debuffs = unit.debuffs || [];
  const existing = unit.debuffs.find(d => d.type === debuff.type);
  if (existing) { existing.value = Math.max(existing.value, debuff.value || 0); existing.turns = Math.max(existing.turns, debuff.turns || 3); }
  else unit.debuffs.push({ ...debuff, turns: debuff.turns || 3 });
}

function tickBuffsDebuffs(unit) {
  if (unit.buffs) { for (const b of unit.buffs) b.turns--; unit.buffs = unit.buffs.filter(b => b.turns > 0); }
  if (unit.debuffs) { for (const d of unit.debuffs) d.turns--; unit.debuffs = unit.debuffs.filter(d => d.turns > 0); }
}

function damageCalc(attacker, defender, multiplier = 1, critBonus = 0) {
  const atk = getEffectiveStat(attacker, 'atk');
  const def = getEffectiveStat(defender, 'def');
  const base = Math.max(1, atk - def * 0.5);
  const roll = 0.9 + Math.random() * 0.2;
  const crit = Math.random() < 0.15 + critBonus ? 1.5 : 1;
  const elMult = getElementMultiplier(attacker.element, defender.element);
  const dmg = Math.max(1, Math.round(base * multiplier * roll * crit * elMult));
  return { dmg, isCrit: crit > 1, isCounter: elMult > 1, isWeak: elMult < 1 };
}

function getHeroTemplate(id) {
  const h = HEROES.find(x => x.id === id);
  return h ? JSON.parse(JSON.stringify(h)) : null;
}

function initPlayerData(room, pid) {
  room.playerData.set(pid, { level: 1, exp: 0, gold: 0, items: { hpPotion: 3, mpPotion: 2 } });
}

function gainExp(room, pid, exp) {
  const pd = room.playerData.get(pid);
  if (!pd) return [];
  pd.exp += exp;
  const logs = [];
  while (pd.exp >= pd.level * 150) {
    pd.exp -= pd.level * 150;
    pd.level++;
    const hero = room.heroes.get(pid);
    if (hero) {
      hero.maxHp += 15; hero.hp = hero.maxHp; hero.maxMp += 15; hero.mp = hero.maxMp;
      hero.atk += 3; hero.def += 2; hero.spd += 1;
      logs.push(`${hero.name} 升级到 Lv.${pd.level}！`);
    }
  }
  return logs;
}

function initBattle(room, levelIndex) {
  const level = LEVELS[levelIndex];
  if (!level) return null;
  const isSolo = room.players.size === 1;
  const units = [];
  let order = 0;
  for (const [pid, p] of room.players) {
    const hero = room.heroes.get(pid);
    if (hero && hero.hp > 0) {
      const pd = room.playerData.get(pid);
      let hpVal = hero.hp, maxHpVal = hero.maxHp, mpVal = hero.mp, maxMpVal = hero.maxMp;
      let atkVal = hero.atk, defVal = hero.def, spdVal = hero.spd;
      if (isSolo) {
        hpVal = Math.round(hpVal * 1.5); maxHpVal = Math.round(maxHpVal * 1.5);
        mpVal = Math.round(mpVal * 1.5); maxMpVal = Math.round(maxMpVal * 1.5);
        atkVal = Math.round(atkVal * 1.5); defVal = Math.round(defVal * 1.5);
      }
      units.push({
        id: `p_${pid}`, isPlayer: true, ownerId: pid, heroId: hero.id,
        name: hero.name, img: hero.img, element: hero.element,
        hp: hpVal, maxHp: maxHpVal, mp: mpVal, maxMp: maxMpVal,
        atk: atkVal, def: defVal, spd: spdVal,
        buffs: [], debuffs: [], hasActed: false, order: order++,
      });
    }
  }
  for (const e of level.enemies) {
    units.push({
      id: e.id, isPlayer: false, name: e.name, img: e.img, type: e.type, element: e.element,
      hp: e.hp, maxHp: e.hp, mp: e.mp, maxMp: e.mp, atk: e.atk, def: e.def, spd: e.spd,
      skills: e.skills || [], buffs: [], debuffs: [], hasActed: false, order: order++,
    });
  }
  units.sort((a, b) => b.spd - a.spd);
  room.battle = {
    phase: 'battle', turn: 0, turnCount: 1, units,
    log: [`战斗开始！${level.name}`], pendingAction: null, winner: null, levelIndex,
  };
  startTurn(room);
  return room.battle;
}

function startTurn(room) {
  const battle = room.battle;
  if (!battle) return;
  const aliveUnits = battle.units.filter(u => u.hp > 0);
  if (aliveUnits.length === 0) return endBattle(room, 'draw');
  const alivePlayers = aliveUnits.filter(u => u.isPlayer);
  const aliveEnemies = aliveUnits.filter(u => !u.isPlayer);
  if (alivePlayers.length === 0) return endBattle(room, 'enemy');
  if (aliveEnemies.length === 0) return endBattle(room, 'player');
  let attempts = 0;
  while (battle.units[battle.turn]?.hp <= 0 && attempts < battle.units.length) {
    battle.turn = (battle.turn + 1) % battle.units.length;
    if (battle.turn === 0) battle.turnCount++;
    attempts++;
  }
  const current = battle.units[battle.turn];
  if (!current || current.hp <= 0) return;
  tickBuffsDebuffs(current);
  current.mp = Math.min(current.maxMp, current.mp + Math.max(1, Math.round(current.maxMp * 0.1)));
  if (current.debuffs?.some(d => d.type === 'stun')) {
    battle.log.push(`${current.name} 被眩晕，跳过回合！`);
    battle.turn = (battle.turn + 1) % battle.units.length;
    if (battle.turn === 0) battle.turnCount++;
    startTurn(room); return;
  }
  battle.pendingAction = { unitId: current.id, isPlayer: current.isPlayer, ownerId: current.ownerId };
  if (!current.isPlayer) {
    if (room.turnTimer) clearTimeout(room.turnTimer);
    room.turnTimer = setTimeout(() => enemyAI(room), 1200);
  } else {
    if (room.turnTimer) clearTimeout(room.turnTimer);
    room.turnTimer = setTimeout(() => autoAction(room), TURN_TIMEOUT_MS);
  }
  emit(room);
}

function autoAction(room) {
  const battle = room.battle;
  if (!battle) return;
  const pending = battle.pendingAction;
  if (!pending || !pending.isPlayer) return;
  const unit = battle.units.find(u => u.id === pending.unitId);
  if (!unit || unit.hp <= 0) {
    battle.pendingAction = null;
    battle.turn = (battle.turn + 1) % battle.units.length;
    if (battle.turn === 0) battle.turnCount++;
    startTurn(room); return;
  }
  const enemies = battle.units.filter(u => !u.isPlayer && u.hp > 0);
  if (enemies.length === 0) return;
  performAction(room, pending.unitId, { type: 'attack', targetId: enemies[Math.floor(Math.random() * enemies.length)].id });
}

function enemyAI(room) {
  const battle = room.battle;
  if (!battle) return;
  const pending = battle.pendingAction;
  if (!pending || pending.isPlayer) return;
  const unit = battle.units.find(u => u.id === pending.unitId);
  if (!unit || unit.hp <= 0) {
    battle.pendingAction = null;
    battle.turn = (battle.turn + 1) % battle.units.length;
    if (battle.turn === 0) battle.turnCount++;
    startTurn(room); return;
  }
  const players = battle.units.filter(u => u.isPlayer && u.hp > 0);
  if (players.length === 0) return;
  const target = players.reduce((a, b) => (a.hp / a.maxHp < b.hp / b.maxHp ? a : b));
  if (unit.skills && unit.skills.length > 0 && Math.random() < 0.4) {
    let skillIndex = -1;
    if (unit.hp < unit.maxHp * 0.5) {
      const hi = unit.skills.findIndex(s => s.type === 'heal');
      if (hi >= 0 && unit.mp >= unit.skills[hi].mp) skillIndex = hi;
    }
    if (skillIndex < 0) {
      const usable = unit.skills.map((s, i) => ({ skill: s, index: i })).filter(({ skill }) => unit.mp >= skill.mp && skill.type !== 'heal');
      if (usable.length > 0) skillIndex = usable[Math.floor(Math.random() * usable.length)].index;
    }
    if (skillIndex >= 0) {
      const sk = unit.skills[skillIndex];
      performAction(room, unit.id, { type: 'skill', skillIndex, targetId: sk.type === 'heal' ? unit.id : target.id });
      return;
    }
  }
  performAction(room, unit.id, { type: 'attack', targetId: target.id });
}

function performAction(room, unitId, action) {
  const battle = room.battle;
  if (!battle) return;
  const unit = battle.units.find(u => u.id === unitId);
  if (!unit || unit.hp <= 0) return;
  const pending = battle.pendingAction;
  if (!pending || pending.unitId !== unitId) return;
  if (room.turnTimer) { clearTimeout(room.turnTimer); room.turnTimer = null; }
  let logMsg = '';
  if (action.type === 'attack') {
    const target = battle.units.find(u => u.id === action.targetId);
    if (target && target.hp > 0) {
      const result = damageCalc(unit, target);
      const shield = target.buffs?.find(b => b.type === 'shield');
      if (shield) { target.buffs = target.buffs.filter(b => b.type !== 'shield'); logMsg = `${unit.name} 攻击 ${target.name}，被护盾抵挡！`; }
      else {
        target.hp = Math.max(0, target.hp - result.dmg);
        logMsg = `${unit.name} 攻击 ${target.name}，造成 ${result.dmg} 点伤害`;
        if (result.isCrit) logMsg += '（暴击！）';
        if (result.isCounter) logMsg += '（属性克制！）';
        if (result.isWeak) logMsg += '（属性不利）';
        logMsg += '！';
      }
    }
  } else if (action.type === 'skill') {
    let skill = null;
    if (unit.isPlayer) skill = HEROES.find(h => h.id === unit.heroId)?.skills?.[action.skillIndex];
    else skill = unit.skills?.[action.skillIndex];
    if (skill && unit.mp >= skill.mp) { unit.mp -= skill.mp; logMsg = executeSkill(battle, unit, skill, action.targetId); }
    else logMsg = `${unit.name} 技能释放失败！`;
  } else if (action.type === 'defend') {
    applyBuff(unit, { type: 'defUp', stat: 'def', value: 0.5, turns: 2 });
    logMsg = `${unit.name} 进入防御姿态！`;
  } else if (action.type === 'item') {
    const item = ITEMS[action.itemId];
    if (item) {
      const pd = room.playerData.get(unit.ownerId);
      if (pd && pd.items[action.itemId] > 0) {
        pd.items[action.itemId]--;
        if (item.type === 'hp') { unit.hp = Math.min(unit.maxHp, unit.hp + item.heal); logMsg = `${unit.name} 使用 ${item.name}，恢复 ${item.heal} HP！`; }
        else if (item.type === 'mp') { unit.mp = Math.min(unit.maxMp, unit.mp + item.heal); logMsg = `${unit.name} 使用 ${item.name}，恢复 ${item.heal} MP！`; }
      } else logMsg = `${unit.name} 没有该道具！`;
    }
  }
  if (logMsg) battle.log.push(logMsg);
  unit.hasActed = true;
  battle.pendingAction = null;
  const ap = battle.units.filter(u => u.isPlayer && u.hp > 0);
  const ae = battle.units.filter(u => !u.isPlayer && u.hp > 0);
  if (ap.length === 0) { endBattle(room, 'enemy'); return; }
  if (ae.length === 0) { endBattle(room, 'player'); return; }
  battle.turn = (battle.turn + 1) % battle.units.length;
  if (battle.turn === 0) battle.turnCount++;
  startTurn(room);
}

function executeSkill(battle, unit, skill, targetId) {
  let msg = `${unit.name} 使用 【${skill.name}】！`;
  if (skill.type === 'dmg') {
    const t = battle.units.find(u => u.id === targetId);
    if (t && t.hp > 0) {
      const r = damageCalc(unit, t, skill.multiplier, skill.critBonus || 0);
      t.hp = Math.max(0, t.hp - r.dmg);
      msg += ` 对 ${t.name} 造成 ${r.dmg} 点伤害`;
      if (r.isCrit) msg += '（暴击！）'; if (r.isCounter) msg += '（属性克制！）'; msg += '！';
    }
  } else if (skill.type === 'heal') {
    const targets = skill.target === 'all'
      ? (unit.isPlayer ? battle.units.filter(u => u.isPlayer && u.hp > 0) : battle.units.filter(u => !u.isPlayer && u.hp > 0))
      : [battle.units.find(u => u.id === targetId)].filter(Boolean);
    for (const t of targets) {
      if (t.hp > 0) { t.hp = Math.min(t.maxHp, t.hp + skill.heal); msg += ` ${t.name} 恢复 ${skill.heal} HP！`; }
    }
  } else if (skill.type === 'buff') {
    const targets = skill.target === 'all'
      ? (unit.isPlayer ? battle.units.filter(u => u.isPlayer && u.hp > 0) : battle.units.filter(u => !u.isPlayer && u.hp > 0))
      : skill.target === 'self' ? [unit] : [battle.units.find(u => u.id === targetId)].filter(Boolean);
    for (const t of targets) { if (t.hp > 0) { applyBuff(t, { type: skill.buff, stat: skill.stat || 'atk', value: skill.value, turns: skill.turns }); msg += ` ${t.name} 获得增益！`; } }
  } else if (skill.type === 'debuff') {
    if (skill.debuff === 'stun') {
      const t = battle.units.find(u => u.id === targetId);
      if (t && t.hp > 0) {
        if (Math.random() < (skill.chance || 0.5)) { applyDebuff(t, { type: 'stun', turns: skill.turns }); msg += ` ${t.name} 被眩晕！`; }
        else msg += ' 未命中！';
      }
    } else {
      const targets = skill.target === 'allEnemy'
        ? (unit.isPlayer ? battle.units.filter(u => !u.isPlayer && u.hp > 0) : battle.units.filter(u => u.isPlayer && u.hp > 0))
        : [battle.units.find(u => u.id === targetId)].filter(Boolean);
      for (const t of targets) { if (t.hp > 0) { applyDebuff(t, { type: skill.debuff, stat: skill.stat || 'def', value: skill.value, turns: skill.turns }); msg += ` ${t.name} 被减益！`; } }
    }
  } else if (skill.type === 'dmgHeal') {
    const t = battle.units.find(u => u.id === targetId);
    if (t && t.hp > 0) {
      const r = damageCalc(unit, t, skill.multiplier);
      t.hp = Math.max(0, t.hp - r.dmg); unit.hp = Math.min(unit.maxHp, unit.hp + skill.healSelf);
      msg += ` 对 ${t.name} 造成 ${r.dmg} 伤害，自身恢复 ${skill.healSelf} HP！`;
    }
  } else if (skill.type === 'revive') {
    const t = battle.units.find(u => u.id === targetId);
    if (t && t.hp <= 0) { t.hp = Math.min(t.maxHp, skill.heal); msg += ` ${t.name} 被复活！`; }
    else msg += ' 目标还活着！';
  } else if (skill.type === 'healBuff') {
    for (const t of battle.units.filter(u => u.isPlayer && u.hp > 0)) {
      t.hp = Math.min(t.maxHp, t.hp + skill.heal);
      applyBuff(t, { type: skill.buff, stat: skill.stat || 'atk', value: skill.value, turns: skill.turns });
      msg += ` ${t.name} 恢复 ${skill.heal} HP 并获得增益！`;
    }
  } else if (skill.type === 'dmgDebuff') {
    const t = battle.units.find(u => u.id === targetId);
    if (t && t.hp > 0) {
      const r = damageCalc(unit, t, skill.multiplier);
      t.hp = Math.max(0, t.hp - r.dmg);
      applyDebuff(t, { type: skill.debuff, stat: skill.stat || 'atk', value: skill.value, turns: skill.turns });
      msg += ` 对 ${t.name} 造成 ${r.dmg} 伤害并减益！`;
    }
  }
  return msg;
}

function endBattle(room, winner) {
  const battle = room.battle;
  if (!battle) return;
  battle.phase = 'result'; battle.winner = winner; battle.pendingAction = null;
  if (room.turnTimer) clearTimeout(room.turnTimer);
  const level = LEVELS[battle.levelIndex];
  if (winner === 'player') {
    battle.log.push(`战斗胜利！获得 ${level.reward.exp} 经验和 ${level.reward.gold} 金币！`);
    room.clearedLevels.add(battle.levelIndex);
    for (const [, hero] of room.heroes) {
      if (hero.hp <= 0) { hero.hp = Math.round(hero.maxHp * 0.5); battle.log.push(`${hero.name} 复活！`); }
      else hero.hp = Math.min(hero.maxHp, hero.hp + Math.round(hero.maxHp * 0.3));
      hero.mp = Math.min(hero.maxMp, hero.mp + Math.round(hero.maxMp * 0.3));
    }
    for (const [pid] of room.players) {
      battle.log.push(...gainExp(room, pid, level.reward.exp));
      const pd = room.playerData.get(pid);
      if (pd) {
        pd.gold += level.reward.gold;
        if (Math.random() < 0.5) { pd.items.hpPotion = (pd.items.hpPotion || 0) + 1; battle.log.push('获得生命药水！'); }
        if (Math.random() < 0.3) { pd.items.mpPotion = (pd.items.mpPotion || 0) + 1; battle.log.push('获得法力药水！'); }
      }
    }
  } else battle.log.push('战斗失败...队伍全员倒下。');
  emit(room);
}

function publicBattle(battle) {
  if (!battle) return null;
  return {
    phase: battle.phase, turn: battle.turn, turnCount: battle.turnCount, levelIndex: battle.levelIndex,
    turnTimeout: TURN_TIMEOUT_MS,
    units: battle.units.map(u => ({ ...u, buffs: u.buffs || [], debuffs: u.debuffs || [], alive: u.hp > 0, hasActed: u.hasActed || false, skills: u.skills || [] })),
    log: battle.log.slice(-25), pendingAction: battle.pendingAction, winner: battle.winner,
  };
}

function publicRoom(room) {
  return {
    code: room.code, phase: room.phase, hostId: room.hostId, levelIndex: room.levelIndex,
    players: [...room.players.values()].map(p => {
      const pd = room.playerData.get(p.id);
      return { id: p.id, name: p.name, ready: p.ready, heroId: p.heroId, level: pd?.level || 1, exp: pd?.exp || 0, gold: pd?.gold || 0, items: pd?.items || { hpPotion: 0, mpPotion: 0 } };
    }),
    heroes: [...room.heroes.values()].map(h => ({ id: h.id, name: h.name, role: h.role, img: h.img, element: h.element, hp: h.hp, maxHp: h.maxHp, mp: h.mp, maxMp: h.maxMp, atk: h.atk, def: h.def, spd: h.spd, buffs: h.buffs || [], debuffs: h.debuffs || [], alive: h.hp > 0 })),
    clearedLevels: [...room.clearedLevels], battle: publicBattle(room.battle), publicUrl: PUBLIC_URL,
  };
}

function emit(room) { room.lastActivity = Date.now(); io.to(room.code).emit('state', publicRoom(room)); }

function uniquePlayerName(room, base) {
  const raw = String(base || '游客').trim().slice(0, 10) || '游客';
  const used = new Set([...room.players.values()].map(p => p.name));
  if (!used.has(raw)) return raw;
  for (let i = 2; i < 99; i++) { const n = `${raw.slice(0, Math.max(1, 10 - String(i).length))}${i}`; if (!used.has(n)) return n; }
  return `${raw.slice(0, 6)}${Math.floor(Math.random() * 900 + 100)}`;
}

function getRoom(socket) { return rooms.get(playerRooms.get(socket.id)); }

function leaveCurrent(socket) {
  const code = playerRooms.get(socket.id);
  if (!code) return;
  const room = rooms.get(code);
  playerRooms.delete(socket.id); socket.leave(code);
  if (!room) return;
  room.players.delete(socket.id); room.heroes.delete(socket.id); room.playerData.delete(socket.id);
  if (!room.players.size) { cleanupRoom(room); return; }
  if (room.hostId === socket.id) room.hostId = room.players.keys().next().value;
  if (room.battle?.phase === 'battle') {
    if (room.battle.units.filter(u => u.isPlayer && u.hp > 0).length === 0) { endBattle(room, 'enemy'); return; }
  }
  emit(room);
}

io.on('connection', (socket) => {
  socket.on('createRoom', (payload = {}, ack = () => {}) => {
    const room = createRoom(socket.id);
    const p = { id: socket.id, name: uniquePlayerName(room, payload.name), ready: false, heroId: null };
    room.players.set(socket.id, p); initPlayerData(room, socket.id);
    playerRooms.set(socket.id, room.code); socket.join(room.code);
    ack({ ok: true, room: publicRoom(room), playerId: socket.id }); emit(room);
  });

  socket.on('joinRoom', (payload = {}, ack = () => {}) => {
    const code = String(payload.code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    const room = rooms.get(code);
    if (!room) return ack({ ok: false, error: '房间不存在' });
    if (room.players.size >= ROOM_SIZE) return ack({ ok: false, error: '房间已满' });
    if (playerRooms.has(socket.id)) leaveCurrent(socket);
    const p = { id: socket.id, name: uniquePlayerName(room, payload.name), ready: false, heroId: null };
    room.players.set(socket.id, p); initPlayerData(room, socket.id);
    playerRooms.set(socket.id, room.code); socket.join(room.code);
    ack({ ok: true, room: publicRoom(room), playerId: socket.id }); emit(room);
  });

  socket.on('selectHero', (payload = {}, ack = () => {}) => {
    const room = getRoom(socket); const p = room?.players.get(socket.id);
    if (!room || !p) return ack({ ok: false, error: '尚未加入房间' });
    if (room.phase !== 'lobby' && room.phase !== 'heroSelect') return ack({ ok: false, error: '当前不能选择角色' });
    const heroId = payload.heroId; const tpl = getHeroTemplate(heroId);
    if (!tpl) return ack({ ok: false, error: '角色不存在' });
    for (const [pid, h] of room.heroes) if (h.id === heroId && pid !== socket.id) return ack({ ok: false, error: '该角色已被选择' });
    room.heroes.set(socket.id, tpl); p.heroId = heroId; room.phase = 'heroSelect';
    ack({ ok: true }); emit(room);
  });

  socket.on('toggleReady', (_p = {}, ack = () => {}) => {
    const room = getRoom(socket); const p = room?.players.get(socket.id);
    if (!room || !p) return ack({ ok: false, error: '尚未加入房间' });
    if (!p.heroId) return ack({ ok: false, error: '请先选择角色' });
    p.ready = !p.ready; ack({ ok: true, ready: p.ready }); emit(room);
  });

  socket.on('startGame', (_p = {}, ack = () => {}) => {
    const room = getRoom(socket);
    if (!room) return ack({ ok: false, error: '尚未加入房间' });
    if (room.hostId !== socket.id) return ack({ ok: false, error: '只有房主可以开始' });
    const pending = [...room.players.values()].filter(p => p.id !== room.hostId && !p.ready);
    if (pending.length && room.players.size > 1) return ack({ ok: false, error: `还有 ${pending.length} 位玩家未准备` });
    const noHero = [...room.players.values()].filter(p => !p.heroId);
    if (noHero.length) return ack({ ok: false, error: '还有玩家未选择角色' });
    room.phase = 'map'; ack({ ok: true }); emit(room);
  });

  socket.on('selectLevel', (payload = {}, ack = () => {}) => {
    const room = getRoom(socket);
    if (!room) return ack({ ok: false, error: '尚未加入房间' });
    if (room.hostId !== socket.id) return ack({ ok: false, error: '只有房主可以选择关卡' });
    const li = Number(payload.levelIndex);
    if (!LEVELS[li]) return ack({ ok: false, error: '关卡不存在' });
    if (li > 0 && !room.clearedLevels.has(li - 1)) return ack({ ok: false, error: '需要先通关前置关卡' });
    room.levelIndex = li; room.phase = 'battle'; initBattle(room, li); ack({ ok: true });
  });

  socket.on('battleAction', (payload = {}, ack = () => {}) => {
    const room = getRoom(socket);
    if (!room || !room.battle) return ack({ ok: false, error: '不在战斗中' });
    const battle = room.battle; const pending = battle.pendingAction;
    if (!pending || !pending.isPlayer || pending.ownerId !== socket.id) return ack({ ok: false, error: '不是你的回合' });
    if (room.turnTimer) { clearTimeout(room.turnTimer); room.turnTimer = null; }
    if (payload.targetId) {
      const target = battle.units.find(u => u.id === payload.targetId);
      if (!target) return ack({ ok: false, error: '目标不存在' });
      if (payload.type === 'attack') { if (target.isPlayer || target.hp <= 0) return ack({ ok: false, error: '只能攻击敌方存活单位' }); }
      else if (payload.type === 'skill') {
        const unit = battle.units.find(u => u.id === pending.unitId);
        let sk = unit?.isPlayer ? HEROES.find(h => h.id === unit.heroId)?.skills?.[payload.skillIndex] : unit?.skills?.[payload.skillIndex];
        if (sk) {
          if (sk.type === 'revive') { if (!target.isPlayer || target.hp > 0) return ack({ ok: false, error: '只能复活倒下的队友' }); }
          else if (sk.type === 'heal' && sk.target === 'single') { if (!target.isPlayer || target.hp <= 0) return ack({ ok: false, error: '只能对存活队友使用' }); }
          else { if (target.isPlayer || target.hp <= 0) return ack({ ok: false, error: '只能对敌方单位使用' }); }
        }
      } else if (payload.type === 'item') { if (!target.isPlayer || target.hp <= 0) return ack({ ok: false, error: '只能对存活队友使用道具' }); }
    }
    performAction(room, pending.unitId, payload); ack({ ok: true });
  });

  socket.on('nextLevel', (_p = {}, ack = () => {}) => {
    const room = getRoom(socket);
    if (!room) return ack({ ok: false, error: '尚未加入房间' });
    if (room.hostId !== socket.id) return ack({ ok: false, error: '只有房主可以操作' });
    room.phase = 'map'; room.battle = null; ack({ ok: true }); emit(room);
  });

  socket.on('retryLevel', (_p = {}, ack = () => {}) => {
    const room = getRoom(socket);
    if (!room) return ack({ ok: false, error: '尚未加入房间' });
    if (room.hostId !== socket.id) return ack({ ok: false, error: '只有房主可以操作' });
    for (const [, hero] of room.heroes) if (hero.hp <= 0) hero.hp = Math.round(hero.maxHp * 0.5);
    room.phase = 'battle'; initBattle(room, room.levelIndex); ack({ ok: true });
  });

  socket.on('resetGame', (_p = {}, ack = () => {}) => {
    const room = getRoom(socket);
    if (!room) return ack({ ok: false, error: '尚未加入房间' });
    room.phase = 'lobby'; room.battle = null; room.clearedLevels.clear(); room.levelIndex = 0; room.heroes.clear();
    for (const p of room.players.values()) { p.ready = false; p.heroId = null; }
    for (const [pid] of room.players) initPlayerData(room, pid);
    ack({ ok: true }); emit(room);
  });

  socket.on('chat', (payload = {}, ack = () => {}) => {
    const room = getRoom(socket);
    if (!room) return ack({ ok: false, error: '不在房间中' });
    const player = room.players.get(socket.id);
    if (!player) return ack({ ok: false });
    const text = String(payload.text || '').trim().slice(0, 100);
    if (!text) return ack({ ok: false, error: '消息不能为空' });
    const msg = { id: Date.now() + '_' + Math.random().toString(36).slice(2, 8), pid: socket.id, name: player.name, text, time: Date.now() };
    room.chatLog.push(msg); if (room.chatLog.length > 50) room.chatLog.shift();
    io.to(room.code).emit('chat', msg); room.lastActivity = Date.now(); ack({ ok: true });
  });

  socket.on('leaveRoom', (_p = {}, ack = () => {}) => { leaveCurrent(socket); ack({ ok: true }); });
  socket.on('disconnect', () => leaveCurrent(socket));
});

setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) if (now - room.lastActivity > ROOM_TTL_MS) cleanupRoom(room);
}, 60000);

server.listen(PORT, () => console.log(`光明西游·攻略记 服务器运行在 :${PORT}`));

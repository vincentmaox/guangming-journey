// ============================================================
// 光明西游·攻略记 — 前端游戏逻辑
// ============================================================

// ===== 工具函数 =====
const $ = (id) => document.getElementById(id);

function toast(msg, duration = 2000) {
  const el = $('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), duration);
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  $(id)?.classList.remove('hidden');
  // 给body添加当前screen标识class，用于CSS针对不同画面调整UI（如聊天框位置）
  document.body.classList.remove('on-title', 'on-lobby', 'on-hero-select', 'on-map', 'on-battle', 'on-result');
  const screenClasses = {
    titleScreen: 'on-title',
    lobbyScreen: 'on-lobby',
    heroSelectScreen: 'on-hero-select',
    mapScreen: 'on-map',
    battleScreen: 'on-battle',
    resultScreen: 'on-result',
  };
  if (screenClasses[id]) {
    document.body.classList.add(screenClasses[id]);
  }
}

// ===== 音频系统 (使用ChiptuneBGM 8-bit合成器) =====
const AudioSystem = {
  bgmVolume: 0.3,
  sfxVolume: 0.7,

  init() {
    ChiptuneBGM.init();
  },

  resume() {
    ChiptuneBGM.resume();
  },

  setBgmVolume(v) {
    this.bgmVolume = Math.max(0, Math.min(1, v));
    ChiptuneBGM.setVolume(this.bgmVolume);
  },

  setSfxVolume(v) {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    ChiptuneBGM.setSfxVolume(this.sfxVolume);
  },

  // BGM曲目映射: main→map(冒险), battle→battle(战斗)
  async playBgm(name) {
    ChiptuneBGM.resume();
    let track = 'title';
    switch(name) {
      case 'main': track = 'map'; break;
      case 'battle': track = 'battle'; break;
      case 'title': track = 'title'; break;
      case 'story': track = 'story'; break;
      case 'victory': track = 'victory'; break;
      default: track = 'map';
    }
    ChiptuneBGM.play(track);
    console.log('[Audio] BGM播放 (8-bit Chiptune):', track);
  },

  playBgmHtml5() { /* 不再需要，已用合成器替代 */ },

  stopBgm() {
    ChiptuneBGM.stop();
  },

  playSfx(type) {
    ChiptuneBGM.playSfx(type);
  }
};

// ===== 游戏状态 =====
const Game = {
  socket: null,
  playerId: null,
  room: null,
  heroes: [],
  levels: [],
  soloMode: false,
  currentLevelIndex: 0,
  storyPlayed: {}, // 记录哪些剧情已播放

  async init() {
    // 获取基础路径（支持子路径部署）
    let basePath;
    if (window.__GAME_BASE_PATH__) {
      // 优先使用gamedata.js检测的路径（最可靠，从script标签src推断）
      basePath = window.__GAME_BASE_PATH__;
    } else {
      // 从URL推断
      const pn = window.location.pathname;
      const lastSlash = pn.lastIndexOf('/');
      basePath = pn.substring(0, lastSlash + 1);
    }
    window.__BASE_PATH__ = basePath;
    console.log('[Game] Base path:', basePath);

    // 优先使用通过gamedata.js预加载的游戏数据
    if (window.__GAME_HEROES__ && window.__GAME_LEVELS__) {
      this.heroes = window.__GAME_HEROES__;
      this.levels = window.__GAME_LEVELS__;
      console.log('[Game] 使用预加载数据, 英雄:', this.heroes.length, '关卡:', this.levels.length);
    } else {
      // 回退：通过API加载（使用相对路径，不要以/开头）
      try {
        const apiBase = basePath === '/' ? '' : basePath;
        const [heroesRes, levelsRes] = await Promise.all([
          fetch(apiBase + 'api/heroes').then(r => r.json()),
          fetch(apiBase + 'api/levels').then(r => r.json())
        ]);
        this.heroes = heroesRes;
        this.levels = levelsRes;
        console.log('[Game] 通过API加载数据成功');
      } catch (e) {
        console.error('[Game] 加载游戏数据失败', e);
        $('errorMsg').textContent = '游戏数据加载失败，请刷新重试';
      }
    }

    // 预加载所有背景图和角色/敌人图片，避免战斗时加载慢
    this.preloadAssets();

    // 初始化各系统
    SettingsSystem.init();
    CollectionSystem.init();
    ChatSystem.init();
    this.loadSouvenirs();

    // 绑定标题画面事件
    $('btnSolo').addEventListener('click', () => this.startSolo());
    $('btnCreateRoom').addEventListener('click', () => this.createRoom());
    $('btnJoinRoom').addEventListener('click', () => this.joinRoom());

    // 角色选择事件
    $('btnHeroReady').addEventListener('click', () => this.toggleReady());
    $('btnHeroLeave').addEventListener('click', () => this.leaveRoom());

    // 地图事件
    $('btnMapLeave').addEventListener('click', () => this.leaveRoom());
    $('btnCollection').addEventListener('click', () => CollectionSystem.show());
    $('btnSettings').addEventListener('click', () => SettingsSystem.show());

    // 图鉴关闭
    $('btnCloseCollection')?.addEventListener('click', () => CollectionSystem.hide());
    $('collectionOverlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'collectionOverlay') CollectionSystem.hide();
    });

    // 设置关闭
    $('btnCloseSettings')?.addEventListener('click', () => SettingsSystem.hide());
    $('settingsOverlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'settingsOverlay') SettingsSystem.hide();
    });

    // 战斗结果
    $('btnNextLevel').addEventListener('click', () => this.nextLevel());
    $('btnRetry').addEventListener('click', () => this.retryLevel());
    $('btnResultLeave').addEventListener('click', () => this.leaveRoom());

    // 剧情对话点击
    $('dialogOverlay').addEventListener('click', () => DialogSystem.advance());

    // 首次用户交互时激活音频并播放标题BGM
    const activateAudio = () => {
      AudioSystem.resume();
      // 在标题画面时播放标题BGM
      if (!$('titleScreen').classList.contains('hidden')) {
        AudioSystem.playBgm('title');
      }
      document.removeEventListener('click', activateAudio);
      document.removeEventListener('keydown', activateAudio);
    };
    document.addEventListener('click', activateAudio);
    document.addEventListener('keydown', activateAudio);

    // 渲染英雄列表
    this.renderHeroGrid();

    showScreen('titleScreen');
  },

  // ===== 单人模式 =====
  startSolo() {
    AudioSystem.playSfx('click');
    const name = $('inputName').value.trim() || '单人玩家';
    this.soloMode = true;

    // 模拟创建房间
    this.socket = {
      id: 'solo_player',
      emit: () => {},
      on: () => {},
      off: () => {},
      disconnect: () => {}
    };
    this.playerId = 'solo_player';

    // 构建单人房间数据
    this.room = {
      code: 'SOLO',
      phase: 'heroSelect',
      hostId: this.playerId,
      levelIndex: 0,
      players: [{ id: this.playerId, name, ready: false, heroId: null, level: 1, exp: 0, gold: 0, items: { hpPotion: 3, mpPotion: 2 } }],
      heroes: [],
      clearedLevels: [],
      battle: null,
    };

    $('heroRoomCode').textContent = '单人模式';
    showScreen('heroSelectScreen');
    this.renderHeroGrid();
    this.updateHeroPlayers();
  },

  // ===== 多人模式 =====
  createRoom() {
    AudioSystem.playSfx('click');
    const name = $('inputName').value.trim() || '玩家';
    this.soloMode = false;
    $('errorMsg').textContent = '';

    if (typeof io === 'undefined') {
      $('errorMsg').textContent = '网络模块加载失败，请检查网络后刷新重试';
      return;
    }

    // 确定Socket.IO连接路径（优先使用gamedata.js检测的路径）
    const socketPath = window.__GAME_SOCKET_PATH__ || ((window.__BASE_PATH__ || '/') + 'socket.io');
    console.log('[Game] 连接Socket.IO, path:', socketPath);

    this.socket = io({
      transports: ['websocket', 'polling'],
      path: socketPath
    });
    this.setupSocket();

    this.socket.emit('createRoom', { name }, (res) => {
      if (res.ok) {
        this.playerId = res.playerId;
        this.room = res.room;
        $('heroRoomCode').textContent = res.room.code;
        showScreen('heroSelectScreen');
        this.renderHeroGrid();
        this.updateHeroPlayers();
      } else {
        $('errorMsg').textContent = res.error || '创建失败';
      }
    });
  },

  joinRoom() {
    AudioSystem.playSfx('click');
    const code = $('inputRoomCode').value.trim().toUpperCase();
    const name = $('inputName').value.trim() || '玩家';
    if (!code) {
      $('errorMsg').textContent = '请输入房号';
      return;
    }
    this.soloMode = false;
    $('errorMsg').textContent = '';

    if (typeof io === 'undefined') {
      $('errorMsg').textContent = '网络模块加载失败，请检查网络后刷新重试';
      return;
    }

    const socketPath = window.__GAME_SOCKET_PATH__ || ((window.__BASE_PATH__ || '/') + 'socket.io');

    this.socket = io({
      transports: ['websocket', 'polling'],
      path: socketPath
    });
    this.setupSocket();

    this.socket.emit('joinRoom', { code, name }, (res) => {
      if (res.ok) {
        this.playerId = res.playerId;
        this.room = res.room;
        $('heroRoomCode').textContent = res.room.code;
        showScreen('heroSelectScreen');
        this.renderHeroGrid();
        this.updateHeroPlayers();
      } else {
        $('errorMsg').textContent = res.error || '加入失败';
      }
    });
  },

  setupSocket() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[Game] Socket.IO 已连接');
      $('errorMsg').textContent = '';
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Game] Socket.IO 断开:', reason);
      if (reason === 'io server disconnect') {
        $('errorMsg').textContent = '与服务器断开连接，请刷新重试';
      }
    });

    this.socket.on('state', (room) => {
      this.room = room;
      this.handleStateChange();
    });

    this.socket.on('chat', (msg) => {
      ChatSystem.addMessage(msg);
    });

    this.socket.on('connect_error', (err) => {
      console.error('[Game] 连接失败:', err.message);
      $('errorMsg').textContent = '连接服务器失败，请检查网络后重试';
      toast('连接失败，请重试');
    });
  },

  handleStateChange() {
    if (!this.room) return;

    const phase = this.room.phase;
    const battle = this.room.battle;

    if (phase === 'lobby' || phase === 'heroSelect') {
      if (!$('heroSelectScreen').classList.contains('hidden')) {
        this.updateHeroPlayers();
        this.renderHeroGrid();
      }
    } else if (phase === 'map') {
      // 首次进入地图时关闭覆盖层
      const wasOnOtherScreen = $('heroSelectScreen').classList.contains('hidden') === false ||
          $('resultScreen').classList.contains('hidden') === false ||
          $('battleScreen').classList.contains('hidden') === false ||
          !$('treasureOverlay').classList.contains('hidden');
      if (wasOnOtherScreen) {
        if (!this.soloMode) {
          $('treasureOverlay').classList.add('hidden');
          DialogSystem.close();
        }
        this.goToMap();
      }
    } else if (phase === 'battle') {
      if (battle?.phase === 'battle') {
        // 首次进入战斗画面（battleScreen还在hidden状态）
        const firstEnter = $('battleScreen').classList.contains('hidden');
        if (firstEnter) {
          if (!this.soloMode) {
            $('treasureOverlay').classList.add('hidden');
            // 不在这里关闭DialogSystem，让enterBattle中的剧情正常播放
          }
          this.enterBattle();
        }
        this.updateBattle();
      } else if (battle?.phase === 'result') {
        // 首次进入战斗结果
        const firstResult = $('resultScreen').classList.contains('hidden');
        if (firstResult) {
          this.showBattleResult();
        }
      }
    }
  },

  // ===== 角色选择 =====
  renderHeroGrid() {
    const grid = $('heroGrid');
    if (!grid || !this.heroes.length) return;

    const usedHeroes = new Set();
    if (this.room?.heroes) {
      this.room.heroes.forEach(h => usedHeroes.add(h.id));
    }

    grid.innerHTML = this.heroes.map(hero => {
      const isUsed = usedHeroes.has(hero.id);
      const isSelected = this.room?.players?.find(p => p.id === this.playerId)?.heroId === hero.id;
      const elIcon = { metal: '⚜️', wood: '🌿', earth: '🪨', water: '💧', fire: '🔥' }[hero.element] || '';
      return `
        <div class="hero-card ${isSelected ? 'selected' : ''} ${isUsed ? 'used' : ''}" data-id="${hero.id}">
          <div class="hero-card-img"><img src="${hero.img}" alt="${hero.name}" /></div>
          <div class="hero-card-name">${hero.name}</div>
          <div class="hero-card-role">${elIcon} ${hero.role}</div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.hero-card').forEach(card => {
      card.addEventListener('click', () => {
        if (card.classList.contains('used')) return;
        const heroId = card.dataset.id;
        this.selectHero(heroId);
      });
    });
  },

  selectHero(heroId) {
    AudioSystem.playSfx('click');
    const hero = this.heroes.find(h => h.id === heroId);
    if (!hero) return;

    // 显示详情
    const detail = $('heroDetail');
    detail.innerHTML = `
      <h3>${hero.name} <span style="font-size:0.9em;color:var(--text-dim)">${hero.role}</span></h3>
      <div class="hero-stats">
        <span>❤️ ${hero.hp}</span>
        <span>💙 ${hero.mp}</span>
        <span>⚔️ ${hero.atk}</span>
        <span>🛡️ ${hero.def}</span>
        <span>⚡ ${hero.spd}</span>
      </div>
      <div class="hero-skills">
        ${hero.skills.map(s => `<div class="skill-item"><b>${s.name}</b> <span class="skill-mp">MP ${s.mp}</span><p>${s.desc}</p></div>`).join('')}
      </div>
    `;

    if (this.soloMode) {
      // 单人模式直接选择
      const me = this.room.players[0];
      me.heroId = heroId;
      const heroCopy = JSON.parse(JSON.stringify(hero));
      this.room.heroes = [heroCopy];
      this.renderHeroGrid();
      this.updateHeroPlayers();
    } else if (this.socket) {
      this.socket.emit('selectHero', { heroId }, (res) => {
        if (!res.ok) toast(res.error || '选择失败');
      });
    }
  },

  toggleReady() {
    AudioSystem.playSfx('click');
    if (this.soloMode) {
      const me = this.room.players[0];
      if (!me.heroId) {
        toast('请先选择角色');
        return;
      }
      me.ready = true;
      this.room.phase = 'map';
      this.goToMap();
    } else if (this.socket) {
      // 判断是否是房主且所有人都准备好 -> 开始游戏
      const isHost = this.room.hostId === this.playerId;
      if (isHost) {
        const allReady = [...this.room.players].every(p => p.ready || p.id === this.room.hostId);
        const allHasHero = [...this.room.players].every(p => p.heroId);
        if (allReady && allHasHero && this.room.players.length > 1) {
          // 房主点击开始游戏
          this.socket.emit('startGame', {}, (res) => {
            if (!res.ok) toast(res.error || '开始失败');
          });
          return;
        }
      }
      // 普通玩家 / 房主自己准备/取消
      this.socket.emit('toggleReady', {}, (res) => {
        if (!res.ok) toast(res.error || '操作失败');
      });
    }
  },

  updateHeroPlayers() {
    const container = $('heroPlayers');
    if (!container || !this.room?.players) return;

    container.innerHTML = this.room.players.map(p => {
      const hero = this.room.heroes?.find(h => {
        // hero对象可能是数组，需要根据pid匹配
        return false;
      });
      const heroName = p.heroId ? this.heroes.find(h => h.id === p.heroId)?.name || '已选' : '未选择';
      const isHost = p.id === this.room.hostId;
      const isMe = p.id === this.playerId;
      return `
        <div class="player-item ${isMe ? 'me' : ''}">
          <span class="player-name">${isHost ? '👑 ' : ''}${p.name}${isMe ? ' (你)' : ''}</span>
          <span class="player-hero">${heroName}</span>
          <span class="player-ready ${p.ready ? 'ready' : ''}">${p.ready ? '✓ 已准备' : '等待中'}</span>
        </div>
      `;
    }).join('');

    // 更新玩家数
    $('heroPlayerCount').textContent = `${this.room.players.length}/4`;

    // 如果是房主且所有人都准备好了，显示开始按钮
    const btn = $('btnHeroReady');
    const me = this.room.players.find(p => p.id === this.playerId);
    if (this.room.hostId === this.playerId && this.room.players.length > 0) {
      const allReady = this.room.players.every(p => p.ready || p.id === this.room.hostId);
      const allHasHero = this.room.players.every(p => p.heroId);
      if (allReady && allHasHero && this.room.players.length > 1) {
        btn.textContent = '开始游戏';
      } else {
        btn.textContent = me?.ready ? '取消准备' : '准备就绪';
      }
    } else {
      btn.textContent = me?.ready ? '取消准备' : '准备就绪';
    }
  },

  // ===== 地图 =====
  goToMap() {
    // 重置战斗相关标记
    this._enteringBattle = false;
    this._showingBattleResult = false;

    $('mapRoomCode').textContent = this.room.code;
    this.renderLevelMap();
    showScreen('mapScreen');
    AudioSystem.playBgm('main');

    // 如果是单人模式且是第一次进入，播放序章剧情（自动播放，无需点击）
    if (this.soloMode && !this.storyPlayed.prologue) {
      this.storyPlayed.prologue = true;
      setTimeout(() => {
        DialogSystem.play(STORY_DATA.prologue, () => {
          // 序章结束后，移动玩家到第一个关卡位置
          this.moveMapPlayerTo(0);
        }, 'prologue', '序章 · 穿越', null, true);
      }, 500);
    } else {
      // 移动玩家到当前最新解锁的关卡
      const cleared = new Set(this.room?.clearedLevels || []);
      const nextLevel = cleared.size;
      this.moveMapPlayerTo(Math.min(nextLevel, this.levels.length - 1));
    }
  },

  // 地图景点配置（位置百分比对应CSS中的标记位置）
  mapLocations: [
    { icon: '🌉', name: '虹桥公园', desc: '红色空中栈道穿越森林湖泊' },
    { icon: '🔬', name: '光明科技馆', desc: '流线型银色建筑中的科技世界' },
    { icon: '🎨', name: '文化艺术中心', desc: '白色拱门建筑中的艺术殿堂' },
    { icon: '🏯', name: '回归亭', desc: '红花山亭上的乡愁记忆' },
    { icon: '🏛️', name: '光明侨院', desc: '橙红骑楼下的华侨记忆' },
  ],

  moveMapPlayerTo(levelIndex) {
    const player = $('mapPlayer');
    if (!player) return;
    const loc = this.mapLocations[levelIndex];
    if (!loc) return;
    // 根据标记位置设置玩家位置（匹配新地图坐标）
    const positions = [
      { left: '12%', top: '55%' },
      { left: '33%', top: '20%' },
      { left: '50%', top: '52%' },
      { left: '78%', top: '25%' },
      { left: '83%', top: '73%' },
    ];
    const pos = positions[levelIndex];
    if (pos) {
      player.style.left = pos.left;
      player.style.top = pos.top;
    }
  },

  renderLevelMap() {
    const markersEl = $('mapMarkers');
    const pathsEl = $('mapPaths');
    if (!markersEl) return;

    const cleared = new Set(this.room?.clearedLevels || []);
    const isHost = this.room?.hostId === this.playerId || this.soloMode;

    // 渲染景点标记
    markersEl.innerHTML = this.levels.map((level, i) => {
      const isCleared = cleared.has(i);
      const isLocked = i > 0 && !cleared.has(i - 1);
      const canPlay = !isLocked && isHost;
      const loc = this.mapLocations[i] || { icon: '⭐', name: level.name, desc: level.description };

      const statusClass = isCleared ? 'cleared' : isLocked ? 'locked' : 'playable';
      const icon = isCleared ? '✓' : isLocked ? '🔒' : loc.icon;

      return `
        <div class="map-marker ${statusClass}" data-level="${i}" data-index="${i}">
          <div class="map-marker-icon">${icon}</div>
          <div class="map-marker-label">${loc.name}</div>
        </div>
      `;
    }).join('');

    // 渲染路径连线（匹配新地图景点位置，viewBox 1000x562）
    const positions = [
      { x: 120, y: 309 },   // 虹桥
      { x: 330, y: 112 },   // 科技馆
      { x: 500, y: 292 },   // 文化艺术中心
      { x: 780, y: 141 },   // 回归亭
      { x: 830, y: 410 },   // 侨院
    ];
    let pathsHtml = '';
    for (let i = 0; i < positions.length - 1; i++) {
      const from = positions[i];
      const to = positions[i + 1];
      const pathCleared = cleared.has(i);
      // 使用贝塞尔曲线连接
      const cx1 = (from.x + to.x) / 2;
      const cy1 = from.y;
      const cx2 = (from.x + to.x) / 2;
      const cy2 = to.y;
      pathsHtml += `<path class="map-path-line ${pathCleared ? 'cleared' : ''}" d="M${from.x},${from.y} C${cx1},${cy1} ${cx2},${cy2} ${to.x},${to.y}" />`;
    }
    pathsEl.innerHTML = pathsHtml;

    // 绑定标记点击事件
    markersEl.querySelectorAll('.map-marker').forEach(marker => {
      marker.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(marker.dataset.index);
        this.showMapTooltip(idx, marker);
      });
      marker.addEventListener('mouseenter', (e) => {
        const idx = parseInt(marker.dataset.index);
        this.showMapTooltip(idx, marker);
      });
    });

    // 点击地图其他区域关闭浮窗
    $('worldMapBg').addEventListener('click', (e) => {
      if (!e.target.closest('.map-marker') && !e.target.closest('.map-tooltip')) {
        $('mapTooltip').classList.add('hidden');
      }
    });

    $('mapTip').textContent = isHost ? '✨ 点击地图上的发光景点开始攻略！' : '⏳ 等待房主选择关卡';
  },

  showMapTooltip(levelIndex, markerEl) {
    const tooltip = $('mapTooltip');
    const level = this.levels[levelIndex];
    const loc = this.mapLocations[levelIndex];
    if (!level || !loc) return;

    const cleared = new Set(this.room?.clearedLevels || []);
    const isCleared = cleared.has(levelIndex);
    const isLocked = levelIndex > 0 && !cleared.has(levelIndex - 1);
    const canPlay = !isLocked && (this.room?.hostId === this.playerId || this.soloMode);

    $('tooltipIcon').textContent = isCleared ? '✓' : isLocked ? '🔒' : loc.icon;
    $('tooltipName').textContent = loc.name;
    $('tooltipDesc').textContent = loc.desc;

    const statusEl = $('tooltipStatus');
    const enterBtn = $('tooltipEnter');
    if (isCleared) {
      statusEl.textContent = '✅ 已通关';
      statusEl.className = 'map-tooltip-status cleared';
      enterBtn.classList.add('hidden');
    } else if (isLocked) {
      statusEl.textContent = '🔒 请先通关前一关';
      statusEl.className = 'map-tooltip-status locked';
      enterBtn.classList.add('hidden');
    } else if (canPlay) {
      statusEl.textContent = '⚔️ 可挑战 - Lv.' + (levelIndex + 1);
      statusEl.className = 'map-tooltip-status playable';
      enterBtn.classList.remove('hidden');
    } else {
      statusEl.textContent = '⏳ 等待房主开始';
      statusEl.className = 'map-tooltip-status locked';
      enterBtn.classList.add('hidden');
    }

    // 定位浮窗（显示在标记点上方）
    const mapRect = $('worldMapBg').getBoundingClientRect();
    const markerRect = markerEl.getBoundingClientRect();
    const tooltipWidth = 280;
    const tooltipHeight = 180;
    let left = markerRect.left - mapRect.left + markerRect.width / 2 - tooltipWidth / 2;
    let top = markerRect.top - mapRect.top - tooltipHeight - 10;

    // 防止超出左边界
    if (left < 8) left = 8;
    // 防止超出右边界
    if (left + tooltipWidth > mapRect.width - 8) left = mapRect.width - tooltipWidth - 8;
    // 如果上方空间不够，显示在下方
    if (top < 8) {
      top = markerRect.top - mapRect.top + markerRect.height + 10;
    }

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
    tooltip.classList.remove('hidden');

    // 绑定进入按钮
    enterBtn.onclick = (e) => {
      e.stopPropagation();
      tooltip.classList.add('hidden');
      AudioSystem.playSfx('click');
      this.selectLevel(levelIndex);
    };
  },

  selectLevel(index) {
    AudioSystem.playSfx('click');
    if (this.soloMode) {
      // 移动玩家到选中的关卡
      this.moveMapPlayerTo(index);

      // 先播放战前剧情
      const storyKey = `level_${index}`;
      const preBattle = STORY_DATA[storyKey]?.preBattle;
      const sceneNames = ['hongqiao', 'science', 'artgallery', 'pavilion', 'qiaoyuan'];
      const chapterTitles = ['第一章 · 虹桥公园', '第二章 · 光明科技馆', '第三章 · 文化艺术中心', '第四章 · 回归亭', '终章 · 光明侨院'];
      const chapterSubtitles = ['自然生态', '科技创新', '文化艺术', '历史记忆', '乡愁归途'];

      const startBattle = () => {
        this.room.levelIndex = index;
        this.room.phase = 'battle';
        this.initSoloBattle(index);
        this.enterBattle();
      };

      if (preBattle && !this.storyPlayed[`${storyKey}_pre`]) {
        this.storyPlayed[`${storyKey}_pre`] = true;
        // 单人模式也自动播放剧情，避免点击闪烁
        DialogSystem.play(preBattle, startBattle, sceneNames[index] || 'hongqiao', chapterTitles[index], chapterSubtitles[index], true);
      } else {
        startBattle();
      }
    } else if (this.socket) {
      this.socket.emit('selectLevel', { levelIndex: index }, (res) => {
        if (!res.ok) toast(res.error || '选择失败');
      });
    }
  },

  // ===== 单人战斗初始化 =====
  initSoloBattle(levelIndex) {
    const level = this.levels[levelIndex];
    if (!level) return;

    const heroTemplate = this.heroes.find(h => h.id === this.room.players[0].heroId);
    if (!heroTemplate) return;

    const hero = JSON.parse(JSON.stringify(heroTemplate));
    // 单人模式属性×1.5
    hero.hp = Math.round(hero.hp * 1.5);
    hero.maxHp = hero.hp;
    hero.mp = Math.round(hero.mp * 1.5);
    hero.maxMp = hero.mp;
    hero.atk = Math.round(hero.atk * 1.5);
    hero.def = Math.round(hero.def * 1.5);

    // 构建战斗单位
    const playerUnit = {
      id: 'p_solo',
      isPlayer: true,
      ownerId: this.playerId,
      heroId: hero.id,
      name: hero.name,
      img: hero.img,
      element: hero.element,
      hp: hero.hp,
      maxHp: hero.maxHp,
      mp: hero.mp,
      maxMp: hero.maxMp,
      atk: hero.atk,
      def: hero.def,
      spd: hero.spd,
      buffs: [],
      debuffs: [],
      hasActed: false,
      skills: hero.skills,
      alive: true,
    };

    const enemyUnits = level.enemies.map((e, i) => ({
      id: `e_${i}`,
      isPlayer: false,
      name: e.name,
      img: e.img,
      element: e.element,
      hp: e.hp,
      maxHp: e.hp,
      mp: e.mp,
      maxMp: e.mp,
      atk: e.atk,
      def: e.def,
      spd: e.spd,
      skills: e.skills || [],
      buffs: [],
      debuffs: [],
      hasActed: false,
      alive: true,
    }));

    let units = [playerUnit, ...enemyUnits];
    units.sort((a, b) => b.spd - a.spd);

    this.soloBattle = {
      phase: 'battle',
      turn: 0,
      turnCount: 1,
      units,
      log: [`战斗开始！${level.name}`],
      pendingAction: null,
      winner: null,
      levelIndex,
      level,
      combo: 0,
      _animLock: false,
    };

    this.room.battle = this.soloBattle;
    // 战斗开始公告
    setTimeout(() => this._battleAnnounce('⚔ 战斗开始 ⚔', '#ffd93d'), 300);
    this.soloNextTurn();
  },

  soloNextTurn() {
    const battle = this.soloBattle;
    if (!battle || battle.phase !== 'battle') return;

    const aliveUnits = battle.units.filter(u => u.hp > 0);
    const alivePlayers = aliveUnits.filter(u => u.isPlayer);
    const aliveEnemies = aliveUnits.filter(u => !u.isPlayer);

    if (alivePlayers.length === 0) {
      this.endSoloBattle('enemy');
      return;
    }
    if (aliveEnemies.length === 0) {
      this.endSoloBattle('player');
      return;
    }

    // 跳过已死单位
    let attempts = 0;
    while (battle.units[battle.turn]?.hp <= 0 && attempts < battle.units.length) {
      battle.turn = (battle.turn + 1) % battle.units.length;
      if (battle.turn === 0) battle.turnCount++;
      attempts++;
    }

    const current = battle.units[battle.turn];
    if (!current || current.hp <= 0) return;

    // buff/debuff倒计时
    this.tickBuffs(current);

    // MP恢复
    const mpRegen = Math.max(1, Math.round(current.maxMp * 0.1));
    current.mp = Math.min(current.maxMp, current.mp + mpRegen);

    // 检查眩晕
    if (current.debuffs?.some(d => d.type === 'stun')) {
      battle.log.push(`${current.name} 被眩晕，跳过回合！`);
      battle.turn = (battle.turn + 1) % battle.units.length;
      if (battle.turn === 0) battle.turnCount++;
      setTimeout(() => this.soloNextTurn(), 800);
      this.updateBattle();
      return;
    }

    battle.pendingAction = { unitId: current.id, isPlayer: current.isPlayer, ownerId: current.ownerId };

    // 敌人回合开始时重置Combo
    if (!current.isPlayer) battle.combo = 0;

    if (!current.isPlayer) {
      // 敌人AI
      setTimeout(() => this.soloEnemyAI(), 1000 / SettingsSystem.data.battleSpeed);
    }

    this.updateBattle();
  },

  // ===== 战斗动画辅助系统 =====
  _battleLayer() { return document.getElementById('skillEffectLayer'); },
  _unitEl(id) { return document.querySelector(`.battle-unit[data-id="${id}"]`); },
  _unitCenter(el, layer) {
    if (!el || !layer) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect(), lr = layer.getBoundingClientRect();
    return { x: r.left - lr.left + r.width / 2, y: r.top - lr.top + r.height / 2 };
  },
  _floatNum(targetId, value, type = 'damage', extra = '') {
    const layer = this._battleLayer(), el = this._unitEl(targetId);
    if (!layer || !el) return;
    const { x, y } = this._unitCenter(el, layer);
    const d = document.createElement('div');
    d.className = `damage-number ${type}`;
    d.style.left = x + 'px'; d.style.top = (y - 20) + 'px';
    d.style.transform = 'translate(-50%,-50%)';
    let text = '';
    if (type === 'heal') text = `+${value}`;
    else if (type === 'miss') text = 'MISS';
    else if (type === 'crit') text = `${value}!`;
    else text = `-${value}`;
    text += extra;
    d.textContent = text;
    layer.appendChild(d);
    setTimeout(() => d.remove(), 1500);
  },
  _floatText(targetId, text, color = '#ffd93d', yOffset = -40) {
    const layer = this._battleLayer(), el = this._unitEl(targetId);
    if (!layer || !el) return;
    const { x, y } = this._unitCenter(el, layer);
    const d = document.createElement('div');
    d.className = 'damage-number';
    d.style.left = x + 'px'; d.style.top = (y + yOffset) + 'px';
    d.style.transform = 'translate(-50%,-50%)';
    d.style.color = color; d.style.fontSize = '1.1rem'; d.style.textShadow = '1px 1px 0 #000,-1px -1px 0 #000';
    d.textContent = text;
    layer.appendChild(d);
    setTimeout(() => d.remove(), 1400);
  },
  _spawnEffect(animName, targetId, opts = {}) {
    const layer = this._battleLayer(), el = this._unitEl(targetId);
    if (!layer || !el || !animName) return;
    const { x, y } = this._unitCenter(el, layer);
    const d = document.createElement('div');
    d.className = `effect-${animName}`;
    d.style.left = x + 'px'; d.style.top = y + 'px';
    d.style.transform = 'translate(-50%,-50%)';
    // 特殊特效内容
    if (animName === 'critical') d.textContent = '暴击!';
    else if (animName === 'throwing-star') d.textContent = '★';
    else if (animName === 'virus') d.textContent = '01010';
    else if (animName === 'food-feast') d.textContent = '🍗';
    else if (animName === 'stun-sweet') { d.textContent = '💫'; d.style.fontSize = '2.5rem'; }
    else if (animName === 'laser-beam' || animName === 'laser') {
      const atkEl = document.querySelector('.battle-unit.attacking') || this._unitEl(opts.fromId);
      if (atkEl) {
        const ac = this._unitCenter(atkEl, layer);
        const dx = x - ac.x, dy = y - ac.y, dist = Math.sqrt(dx*dx+dy*dy);
        const ang = Math.atan2(dy,dx)*180/Math.PI;
        d.style.width = dist+'px'; d.style.left = ac.x+'px'; d.style.top = ac.y+'px';
        d.style.transform = `rotate(${ang}deg)`; d.style.transformOrigin = 'left center';
      }
    }
    else if (animName === 'buff-up') d.textContent = '⚔️↑';
    else if (animName === 'defense-up') d.textContent = '🛡️↑';
    else if (animName === 'speed-up') d.textContent = '⚡↑';
    layer.appendChild(d);
    setTimeout(() => d.remove(), 1500);
  },
  _spawnEffectAll(animName, targetIds, opts = {}) {
    (targetIds || []).forEach((id, i) => {
      setTimeout(() => this._spawnEffect(animName, id, opts), i * 100);
    });
  },
  _flashHit(targetId) {
    const el = this._unitEl(targetId);
    if (!el) return;
    el.classList.add('hit');
    setTimeout(() => el.classList.remove('hit'), 450);
  },
  _dodgeEffect(targetId) {
    const el = this._unitEl(targetId);
    if (!el) return;
    el.classList.add('dodging');
    setTimeout(() => el.classList.remove('dodging'), 500);
  },
  _flashGlow(targetId, color = '6bcb77') {
    const el = this._unitEl(targetId);
    if (!el) return;
    el.style.filter = `drop-shadow(0 0 12px #${color}) brightness(1.3)`;
    setTimeout(() => { el.style.filter = ''; }, 600);
  },
  _startAttackAnim(attackerId) {
    const el = this._unitEl(attackerId);
    if (el) { el.classList.add('attacking'); setTimeout(() => el.classList.remove('attacking'), 500); }
  },
  _screenShake(intensity = 6, duration = 300) {
    const arena = document.querySelector('.battle-arena');
    if (!arena) return;
    arena.style.animation = 'none';
    void arena.offsetWidth;
    arena.style.setProperty('--shake-x', intensity + 'px');
    arena.style.setProperty('--shake-d', duration + 'ms');
    arena.classList.add('screen-shake');
    setTimeout(() => arena.classList.remove('screen-shake'), duration);
  },
  _critFlash() {
    const layer = this._battleLayer();
    if (!layer) return;
    const f = document.createElement('div');
    f.className = 'crit-flash';
    layer.appendChild(f);
    setTimeout(() => f.remove(), 300);
  },
  _killEffect(targetId) {
    const el = this._unitEl(targetId);
    if (!el) return;
    el.classList.add('dying');
    setTimeout(() => { if (el.parentNode) el.classList.add('dead'); }, 400);
  },
  _showCombo(count) {
    if (count < 2) return;
    const layer = this._battleLayer();
    if (!layer) return;
    const lr = layer.getBoundingClientRect();
    const c = document.createElement('div');
    c.className = 'combo-counter';
    c.style.left = (lr.width / 2) + 'px';
    c.style.top = '30px';
    let text = `${count} COMBO!`;
    if (count >= 5) text = `${count} SUPER COMBO!!`;
    if (count >= 8) text = `${count} ULTRA COMBO!!!`;
    c.textContent = text;
    layer.appendChild(c);
    setTimeout(() => c.remove(), 1200);
  },
  _battleAnnounce(text, color = '#ffd93d') {
    const layer = this._battleLayer();
    if (!layer) return;
    const lr = layer.getBoundingClientRect();
    const a = document.createElement('div');
    a.className = 'battle-announce';
    a.style.left = (lr.width / 2) + 'px';
    a.style.top = (lr.height / 2) + 'px';
    a.style.color = color;
    a.textContent = text;
    layer.appendChild(a);
    setTimeout(() => a.remove(), 1200);
  },

  soloEnemyAI() {
    const battle = this.soloBattle;
    if (!battle) return;
    const pending = battle.pendingAction;
    if (!pending || pending.isPlayer) return;

    const unit = battle.units.find(u => u.id === pending.unitId);
    if (!unit || unit.hp <= 0) return;

    const players = battle.units.filter(u => u.isPlayer && u.hp > 0);
    if (players.length === 0) return;

    // 优先攻击血量最低的
    const target = players.reduce((a, b) => (a.hp / a.maxHp < b.hp / b.maxHp ? a : b));

    // 40%概率使用技能
    if (unit.skills && unit.skills.length > 0 && Math.random() < 0.4) {
      let skillIndex = -1;
      if (unit.hp < unit.maxHp * 0.5) {
        const healIdx = unit.skills.findIndex(s => s.type === 'heal');
        if (healIdx >= 0 && unit.mp >= unit.skills[healIdx].mp) {
          skillIndex = healIdx;
        }
      }
      if (skillIndex < 0) {
        const usable = unit.skills
          .map((s, i) => ({ skill: s, index: i }))
          .filter(({ skill }) => unit.mp >= skill.mp && skill.type !== 'heal');
        if (usable.length > 0) {
          const pick = usable[Math.floor(Math.random() * usable.length)];
          skillIndex = pick.index;
        }
      }
      if (skillIndex >= 0) {
        this.soloPerformAction(unit.id, { type: 'skill', skillIndex, targetId: target.id });
        return;
      }
    }

    this.soloPerformAction(unit.id, { type: 'attack', targetId: target.id });
  },

  soloPerformAction(unitId, action) {
    const battle = this.soloBattle;
    if (!battle) return;
    if (battle._animLock) return; // 动画播放中禁止新行动

    const unit = battle.units.find(u => u.id === unitId);
    if (!unit || unit.hp <= 0) return;

    const pending = battle.pendingAction;
    if (!pending || pending.unitId !== unitId) return;

    // 锁定动画
    battle._animLock = true;

    // 收集动画事件
    const animEvents = []; // {type, targetId, value, ...}
    let logMsg = '';
    const elMult = (atkEl, defEl) => {
      const chart = { metal: 'wood', wood: 'earth', earth: 'water', water: 'fire', fire: 'metal' };
      if (!atkEl || !defEl) return 1;
      if (chart[atkEl] === defEl) return 1.5;
      if (chart[defEl] === atkEl) return 0.75;
      return 1;
    };
    const getEff = (u, stat) => {
      let v = u[stat];
      for (const b of u.buffs || []) if (b.stat === stat) v = Math.round(v * (1 + b.value));
      for (const d of u.debuffs || []) if (d.stat === stat) v = Math.round(v * (1 - d.value));
      return v;
    };
    const calcDmg = (atk, def, mult = 1, critB = 0) => {
      const a = getEff(atk, 'atk');
      const d = getEff(def, 'def');
      const aSpd = getEff(atk, 'spd');
      const dSpd = getEff(def, 'spd');
      const base = Math.max(1, a - d * 0.5);
      const roll = 0.9 + Math.random() * 0.2;
      // 闪避判定：速度差决定闪避率，最高15%
      const spdDiff = dSpd - aSpd;
      const dodgeChance = Math.max(0, Math.min(0.15, spdDiff * 0.006));
      if (Math.random() < dodgeChance) return { dmg: 0, isCrit: false, isCounter: false, isWeak: false, isDodged: true, comboBonus: 0 };
      const crit = Math.random() < (0.15 + critB) ? 1.5 : 1;
      const em = elMult(atk.element, def.element);
      // Combo加成：玩家连击每层+5%，最多+50%
      const comboBonus = atk.isPlayer ? Math.min(0.5, (battle.combo || 0) * 0.05) : 0;
      const dmg = Math.max(1, Math.round(base * mult * roll * crit * em * (1 + comboBonus)));
      return { dmg, isCrit: crit > 1, isCounter: em > 1, isWeak: em < 1, isDodged: false, comboBonus };
    };

    // 记录伤害事件
    const addDmgEvent = (targetId, result) => {
      animEvents.push({ kind: 'damage', targetId, ...result });
    };
    const addHealEvent = (targetId, amount) => {
      animEvents.push({ kind: 'heal', targetId, amount });
    };
    const addBuffEvent = (targetId, buffType) => {
      animEvents.push({ kind: 'buff', targetId, buffType });
    };
    const addDebuffEvent = (targetId, debuffType) => {
      animEvents.push({ kind: 'debuff', targetId, debuffType });
    };

    let skillAnim = null;

    if (action.type === 'attack') {
      const target = battle.units.find(u => u.id === action.targetId);
      if (target && target.hp > 0) {
        const result = calcDmg(unit, target);
        if (result.isDodged) {
          logMsg = `${unit.name} 攻击 ${target.name}，被闪避了！`;
          animEvents.push({ kind: 'miss', targetId: target.id });
          if (unit.isPlayer) battle.combo = 0; // 闪避重置combo
        } else {
          const shield = target.buffs?.find(b => b.type === 'shield');
          if (shield) {
            target.buffs = target.buffs.filter(b => b.type !== 'shield');
            logMsg = `${unit.name} 攻击 ${target.name}，被护盾抵挡！`;
            animEvents.push({ kind: 'shield', targetId: target.id });
          } else {
            target.hp = Math.max(0, target.hp - result.dmg);
            logMsg = `${unit.name} 攻击 ${target.name}，造成 ${result.dmg} 点伤害`;
            if (result.isCrit) logMsg += '（暴击！）';
            if (result.isCounter) logMsg += '（属性克制！）';
            if (result.isWeak) logMsg += '（属性不利）';
            logMsg += '！';
            addDmgEvent(target.id, result);
            AudioSystem.playSfx('hit');
          }
        }
      }
    } else if (action.type === 'skill') {
      let skill = null;
      if (unit.isPlayer) {
        const heroData = this.heroes.find(h => h.id === unit.heroId);
        skill = heroData?.skills?.[action.skillIndex];
      } else {
        skill = unit.skills?.[action.skillIndex];
      }
      if (skill && unit.mp >= skill.mp) {
        unit.mp -= skill.mp;
        skillAnim = skill.anim; // 记录技能特效名
        const skillResult = this.executeSkillLogic(battle, unit, skill, action.targetId, {
          addDmgEvent, addHealEvent, addBuffEvent, addDebuffEvent,
          addMissEvent: (tid) => animEvents.push({ kind: 'miss', targetId: tid }),
          addShieldEvent: (tid) => animEvents.push({ kind: 'shield', targetId: tid }),
        });
        logMsg = skillResult.msg;
        if (skill.type === 'heal' || skill.type === 'healBuff') {
          AudioSystem.playSfx('heal');
        } else {
          AudioSystem.playSfx('hit');
        }
      }
    } else if (action.type === 'defend') {
      this.applyBuff(unit, { type: 'defUp', stat: 'def', value: 0.5, turns: 2 });
      logMsg = `${unit.name} 进入防御姿态！`;
      addBuffEvent(unit.id, 'defense-up');
      AudioSystem.playSfx('click');
    } else if (action.type === 'item') {
      const items = {
        hpPotion: { name: '生命药水', heal: 80, type: 'hp' },
        mpPotion: { name: '法力药水', heal: 50, type: 'mp' }
      };
      const item = items[action.itemId];
      const pd = this.room.players[0];
      if (item && pd.items[action.itemId] > 0) {
        pd.items[action.itemId]--;
        if (item.type === 'hp') {
          const before = unit.hp;
          unit.hp = Math.min(unit.maxHp, unit.hp + item.heal);
          const healed = unit.hp - before;
          logMsg = `${unit.name} 使用 ${item.name}，恢复 ${healed} HP！`;
          addHealEvent(unit.id, healed);
        } else {
          const before = unit.mp;
          unit.mp = Math.min(unit.maxMp, unit.mp + item.heal);
          const healed = unit.mp - before;
          logMsg = `${unit.name} 使用 ${item.name}，恢复 ${healed} MP！`;
          addHealEvent(unit.id, healed);
        }
        AudioSystem.playSfx('heal');
      }
    }

    if (logMsg) battle.log.push(logMsg);
    unit.hasActed = true;

    // ===== 播放动画序列 =====
    // 1. 立即播放攻击冲刺动画
    this._startAttackAnim(unitId);
    // 技能专属特效（在攻击者位置）
    if (skillAnim && ['buff-up','defense-up','speed-up','virus','food-feast'].includes(skillAnim)) {
      setTimeout(() => this._spawnEffect(skillAnim, unit.id, { fromId: unitId }), 200);
    }
    // 2. 250ms后（冲刺到目标位置时）播放受击+伤害数字
    let comboHit = false;
    setTimeout(() => {
      animEvents.forEach((ev, i) => {
        const delay = i * 80;
        setTimeout(() => {
          if (ev.kind === 'damage') {
            this._flashHit(ev.targetId);
            let dtype = 'damage';
            let extra = '';
            if (ev.isCrit) dtype = 'crit';
            if (ev.isCounter) extra = ' 克制!';
            else if (ev.isWeak) extra = ' 抵抗';
            this._floatNum(ev.targetId, ev.dmg, dtype, extra);
            if (ev.isCrit) {
              this._spawnEffect('critical', ev.targetId);
              this._screenShake(8, 350);
              this._critFlash();
            } else if (ev.dmg >= Math.round((battle.units.find(u=>u.id===ev.targetId)?.maxHp||100)*0.2)) {
              this._screenShake(4, 200);
            }
            // 技能特效在受击位置
            if (skillAnim && !['buff-up','defense-up','speed-up','virus','food-feast'].includes(skillAnim)) {
              this._spawnEffect(skillAnim, ev.targetId, { fromId: unitId });
            }
            // Combo系统：玩家行动内首次命中累积combo
            if (unit.isPlayer && !comboHit) {
              comboHit = true;
              battle.combo = (battle.combo || 0) + 1;
              this._showCombo(battle.combo);
            }
            // 击杀检测
            const tgt = battle.units.find(u => u.id === ev.targetId);
            if (tgt && tgt.hp <= 0) {
              this._killEffect(ev.targetId);
              this._floatText(ev.targetId, '击败!', '#ff6b6b', -60);
            }
          } else if (ev.kind === 'heal') {
            this._flashGlow(ev.targetId, '6bcb77');
            this._floatNum(ev.targetId, ev.amount, 'heal');
            if (skillAnim === 'rainbow-heal' || skillAnim === 'food-feast' || skillAnim === 'revive') {
              this._spawnEffect(skillAnim, ev.targetId);
            } else {
              this._spawnEffect('rainbow-heal', ev.targetId);
            }
            // 复活特效额外处理
            if (skillAnim === 'revive') {
              const revived = battle.units.find(u => u.id === ev.targetId);
              if (revived) {
                const el = this._unitEl(ev.targetId);
                if (el) el.classList.remove('dead', 'dying');
              }
            }
          } else if (ev.kind === 'buff') {
            this._flashGlow(ev.targetId, '4d96ff');
            this._floatText(ev.targetId, 'BUFF!', '#4d96ff');
            this._spawnEffect(ev.buffType || 'buff-up', ev.targetId);
          } else if (ev.kind === 'debuff') {
            this._flashHit(ev.targetId);
            this._floatText(ev.targetId, 'DEBUFF!', '#c9a66b');
          } else if (ev.kind === 'shield') {
            this._spawnEffect('shield', ev.targetId);
            this._floatText(ev.targetId, '护盾抵挡!', '#4d96ff');
          } else if (ev.kind === 'miss') {
            this._floatNum(ev.targetId, 0, 'miss');
            this._dodgeEffect(ev.targetId);
            battle.combo = 0;
          }
        }, delay);
      });
    }, 280);

    // 3. 动画播放完毕后，更新UI并推进回合
    const spd = SettingsSystem.data.battleSpeed || 1;
    const totalAnimTime = (280 + animEvents.length * 80 + 500) / spd;
    setTimeout(() => {
      battle.pendingAction = null;

      const alivePlayers = battle.units.filter(u => u.isPlayer && u.hp > 0);
      const aliveEnemies = battle.units.filter(u => !u.isPlayer && u.hp > 0);

      if (alivePlayers.length === 0) { battle._animLock = false; this.endSoloBattle('enemy'); return; }
      if (aliveEnemies.length === 0) { battle._animLock = false; this.endSoloBattle('player'); return; }

      battle.turn = (battle.turn + 1) % battle.units.length;
      if (battle.turn === 0) battle.turnCount++;

      this.updateBattle();
      battle._animLock = false;
      setTimeout(() => this.soloNextTurn(), 300 / SettingsSystem.data.battleSpeed);
    }, totalAnimTime);
  },

  executeSkillLogic(battle, unit, skill, targetId, callbacks = {}) {
    const { addDmgEvent = () => {}, addHealEvent = () => {}, addBuffEvent = () => {}, addDebuffEvent = () => {}, addMissEvent = () => {}, addShieldEvent = () => {} } = callbacks;
    let msg = `${unit.name} 使用 【${skill.name}】！`;
    const applyB = (u, b) => {
      u.buffs = u.buffs || [];
      const ex = u.buffs.find(x => x.type === b.type);
      if (ex) { ex.value = Math.max(ex.value, b.value); ex.turns = Math.max(ex.turns, b.turns || 3); }
      else u.buffs.push({ ...b, turns: b.turns || 3 });
    };
    const applyD = (u, d) => {
      u.debuffs = u.debuffs || [];
      const ex = u.debuffs.find(x => x.type === d.type);
      if (ex) { ex.value = Math.max(ex.value, d.value || 0); ex.turns = Math.max(ex.turns, d.turns || 3); }
      else u.debuffs.push({ ...d, turns: d.turns || 3 });
    };
    const elMult = (atkEl, defEl) => {
      const chart = { metal: 'wood', wood: 'earth', earth: 'water', water: 'fire', fire: 'metal' };
      if (!atkEl || !defEl) return 1;
      if (chart[atkEl] === defEl) return 1.5;
      if (chart[defEl] === atkEl) return 0.75;
      return 1;
    };
    const getEff = (u, stat) => {
      let v = u[stat];
      for (const b of u.buffs || []) if (b.stat === stat) v = Math.round(v * (1 + b.value));
      for (const d of u.debuffs || []) if (d.stat === stat) v = Math.round(v * (1 - d.value));
      return v;
    };
    const calcDmg = (atk, def, mult = 1, critB = 0) => {
      const a = getEff(atk, 'atk');
      const d = getEff(def, 'def');
      const aSpd = getEff(atk, 'spd');
      const dSpd = getEff(def, 'spd');
      const base = Math.max(1, a - d * 0.5);
      const roll = 0.9 + Math.random() * 0.2;
      const spdDiff = dSpd - aSpd;
      const dodgeChance = Math.max(0, Math.min(0.15, spdDiff * 0.006));
      if (Math.random() < dodgeChance) return { dmg: 0, isCrit: false, isCounter: false, isWeak: false, isDodged: true };
      const crit = Math.random() < (0.15 + critB) ? 1.5 : 1;
      const em = elMult(atk.element, def.element);
      const dmg = Math.max(1, Math.round(base * mult * roll * crit * em));
      return { dmg, isCrit: crit > 1, isCounter: em > 1, isWeak: em < 1, isDodged: false };
    };

    if (skill.type === 'dmg') {
      const target = battle.units.find(u => u.id === targetId);
      if (target && target.hp > 0) {
        const result = calcDmg(unit, target, skill.multiplier, skill.critBonus || 0);
        if (result.isDodged) {
          msg += ` ${target.name} 闪避了攻击！`;
          if (unit.isPlayer) battle.combo = 0;
          addMissEvent(target.id);
        } else {
          const shield = target.buffs?.find(b => b.type === 'shield');
          if (shield) {
            target.buffs = target.buffs.filter(b => b.type !== 'shield');
            msg += ` 被 ${target.name} 的护盾抵挡！`;
            addShieldEvent(target.id);
          } else {
            target.hp = Math.max(0, target.hp - result.dmg);
            msg += ` 对 ${target.name} 造成 ${result.dmg} 点伤害`;
            if (result.isCrit) msg += '（暴击！）';
            if (result.isCounter) msg += '（属性克制！）';
            msg += '！';
            addDmgEvent(target.id, result);
          }
        }
      }
    } else if (skill.type === 'heal') {
      if (skill.target === 'all') {
        const targets = battle.units.filter(u => u.isPlayer && u.hp > 0);
        for (const t of targets) {
          const before = t.hp;
          t.hp = Math.min(t.maxHp, t.hp + skill.heal);
          const healed = t.hp - before;
          msg += ` ${t.name} 恢复 ${healed} HP！`;
          addHealEvent(t.id, healed);
        }
      } else {
        const target = unit;
        const before = target.hp;
        target.hp = Math.min(target.maxHp, target.hp + skill.heal);
        const healed = target.hp - before;
        msg += ` ${target.name} 恢复 ${healed} HP！`;
        addHealEvent(target.id, healed);
      }
    } else if (skill.type === 'buff') {
      const targets = skill.target === 'all'
        ? (unit.isPlayer ? battle.units.filter(u => u.isPlayer && u.hp > 0) : battle.units.filter(u => !u.isPlayer && u.hp > 0))
        : skill.target === 'self' ? [unit]
        : [battle.units.find(u => u.id === targetId)].filter(Boolean);
      const buffAnimMap = { atkUp: 'buff-up', defUp: 'defense-up', spdUp: 'speed-up', shield: 'shield' };
      for (const t of targets) {
        if (t.hp > 0) {
          applyB(t, { type: skill.buff, stat: skill.stat || 'atk', value: skill.value, turns: skill.turns });
          msg += ` ${t.name} 获得增益！`;
          addBuffEvent(t.id, buffAnimMap[skill.buff] || 'buff-up');
        }
      }
    } else if (skill.type === 'debuff') {
      if (skill.debuff === 'stun') {
        const target = battle.units.find(u => u.id === targetId);
        if (target && target.hp > 0) {
          if (Math.random() < (skill.chance || 0.5)) {
            applyD(target, { type: 'stun', turns: skill.turns });
            msg += ` ${target.name} 被眩晕！`;
            addDebuffEvent(target.id, 'stun');
          } else {
            msg += ` 未命中！`;
          }
        }
      } else {
        const targets = skill.target === 'allEnemy'
          ? (unit.isPlayer ? battle.units.filter(u => !u.isPlayer && u.hp > 0) : battle.units.filter(u => u.isPlayer && u.hp > 0))
          : [battle.units.find(u => u.id === targetId)].filter(Boolean);
        for (const t of targets) {
          if (t.hp > 0) {
            applyD(t, { type: skill.debuff, stat: skill.stat || 'def', value: skill.value, turns: skill.turns });
            msg += ` ${t.name} 被施加减益！`;
            addDebuffEvent(t.id, skill.debuff);
          }
        }
      }
    } else if (skill.type === 'dmgHeal') {
      const target = battle.units.find(u => u.id === targetId);
      if (target && target.hp > 0) {
        const result = calcDmg(unit, target, skill.multiplier);
        const before = unit.hp;
        unit.hp = Math.min(unit.maxHp, unit.hp + skill.healSelf);
        const healed = unit.hp - before;
        addHealEvent(unit.id, healed);
        if (result.isDodged) {
          msg += ` ${target.name} 闪避了攻击！自身恢复 ${healed} HP！`;
          if (unit.isPlayer) battle.combo = 0;
          addMissEvent(target.id);
        } else {
          const shield = target.buffs?.find(b => b.type === 'shield');
          if (shield) {
            target.buffs = target.buffs.filter(b => b.type !== 'shield');
            msg += ` 被 ${target.name} 的护盾抵挡！自身恢复 ${healed} HP！`;
            addShieldEvent(target.id);
          } else {
            target.hp = Math.max(0, target.hp - result.dmg);
            msg += ` 对 ${target.name} 造成 ${result.dmg} 伤害，自身恢复 ${healed} HP！`;
            addDmgEvent(target.id, result);
          }
        }
      }
    } else if (skill.type === 'revive') {
      const target = battle.units.find(u => u.id === targetId);
      if (target && target.hp <= 0) {
        target.hp = Math.min(target.maxHp, skill.heal);
        msg += ` ${target.name} 被复活，恢复 ${skill.heal} HP！`;
        addHealEvent(target.id, skill.heal);
      } else {
        msg += ` 目标还活着！`;
      }
    } else if (skill.type === 'healBuff') {
      const targets = battle.units.filter(u => u.isPlayer && u.hp > 0);
      for (const t of targets) {
        const before = t.hp;
        t.hp = Math.min(t.maxHp, t.hp + skill.heal);
        const healed = t.hp - before;
        applyB(t, { type: skill.buff, stat: skill.stat || 'atk', value: skill.value, turns: skill.turns });
        msg += ` ${t.name} 恢复 ${healed} HP 并获得增益！`;
        addHealEvent(t.id, healed);
        addBuffEvent(t.id, 'buff-up');
      }
    } else if (skill.type === 'dmgDebuff') {
      const target = battle.units.find(u => u.id === targetId);
      if (target && target.hp > 0) {
        const result = calcDmg(unit, target, skill.multiplier);
        if (result.isDodged) {
          msg += ` ${target.name} 闪避了攻击！`;
          if (unit.isPlayer) battle.combo = 0;
          addMissEvent(target.id);
        } else {
          const shield = target.buffs?.find(b => b.type === 'shield');
          if (shield) {
            target.buffs = target.buffs.filter(b => b.type !== 'shield');
            msg += ` 被 ${target.name} 的护盾抵挡！`;
            addShieldEvent(target.id);
          } else {
            target.hp = Math.max(0, target.hp - result.dmg);
            applyD(target, { type: skill.debuff, stat: skill.stat || 'atk', value: skill.value, turns: skill.turns });
            msg += ` 对 ${target.name} 造成 ${result.dmg} 伤害并降低攻击力！`;
            addDmgEvent(target.id, result);
            addDebuffEvent(target.id, skill.debuff);
          }
        }
      }
    }
    return { msg };
  },

  applyBuff(unit, buff) {
    unit.buffs = unit.buffs || [];
    const ex = unit.buffs.find(b => b.type === buff.type);
    if (ex) { ex.value = Math.max(ex.value, buff.value); ex.turns = Math.max(ex.turns, buff.turns || 3); }
    else unit.buffs.push({ ...buff, turns: buff.turns || 3 });
  },

  tickBuffs(unit) {
    if (unit.buffs) {
      for (const b of unit.buffs) b.turns--;
      unit.buffs = unit.buffs.filter(b => b.turns > 0);
    }
    if (unit.debuffs) {
      for (const d of unit.debuffs) d.turns--;
      unit.debuffs = unit.debuffs.filter(d => d.turns > 0);
    }
  },

  endSoloBattle(winner) {
    const battle = this.soloBattle;
    if (!battle) return;
    battle.phase = 'result';
    battle.winner = winner;

    const level = this.levels[battle.levelIndex];

    if (winner === 'player') {
      this._battleAnnounce('★ 胜 利 ★', '#ffd93d');
      this._screenShake(10, 500);
      battle.log.push(`战斗胜利！获得 ${level.reward.exp} 经验和 ${level.reward.gold} 金币！`);
      if (!this.room.clearedLevels.includes(battle.levelIndex)) {
        this.room.clearedLevels.push(battle.levelIndex);
      }
      // 经验升级
      const pd = this.room.players[0];
      pd.exp += level.reward.exp;
      pd.gold += level.reward.gold;
      while (pd.exp >= pd.level * 150) {
        pd.exp -= pd.level * 150;
        pd.level++;
        const hero = this.room.heroes[0];
        if (hero) {
          hero.maxHp += 15; hero.hp = hero.maxHp;
          hero.maxMp += 15; hero.mp = hero.maxMp;
          hero.atk += 3; hero.def += 2; hero.spd += 1;
        }
        battle.log.push(`升级到 Lv.${pd.level}！`);
      }
      // 随机道具
      if (Math.random() < 0.5) { pd.items.hpPotion++; battle.log.push('获得了 生命药水！'); }
      if (Math.random() < 0.3) { pd.items.mpPotion++; battle.log.push('获得了 法力药水！'); }

      // 恢复HP/MP
      const hero = this.room.heroes[0];
      if (hero) {
        hero.hp = Math.min(hero.maxHp, hero.hp + Math.round(hero.maxHp * 0.3));
        hero.mp = Math.min(hero.maxMp, hero.mp + Math.round(hero.maxMp * 0.3));
      }

      // 解锁图鉴
      CollectionSystem.unlock(battle.levelIndex);

      AudioSystem.playSfx('victory');
    } else {
      this._battleAnnounce('✗ 失 败 ✗', '#ff6b6b');
      battle.log.push('战斗失败...队伍全员倒下。');
    }

    this.room.battle = battle;
    this.showBattleResult();
  },

  // ===== 战斗画面 =====
  enterBattle() {
    // 防止重复进入战斗
    if (this._enteringBattle) return;
    this._enteringBattle = true;

    const battle = this.getBattle();
    const level = this.levels[battle?.levelIndex || 0];
    if (level) {
      const resolve = window.__GAME_RESOLVE__ || ((p) => p);
      $('battleBg').style.backgroundImage = `url(${resolve(level.background)})`;
      $('battleLevelName').textContent = level.name;
    }
    showScreen('battleScreen');

    // 播放战斗BGM
    AudioSystem.playBgm('battle');

    // 战斗前剧情（多人模式和单人模式都要播放，立即播放不延迟）
    const levelIdx = battle?.levelIndex ?? this.room.levelIndex;
    const storyKey = `level_${levelIdx}`;
    const sceneKeys = ['hongqiao', 'science', 'artgallery', 'pavilion', 'qiaoyuan'];
    const chapterTitles = ['第一章 · 虹桥公园', '第二章 · 光明科技馆', '第三章 · 光明美术馆', '第四章 · 回归亭', '终章 · 光明侨院'];
    const sceneKey = sceneKeys[levelIdx] || 'prologue';
    const chapterTitle = chapterTitles[levelIdx] || '';
    if (STORY_DATA[storyKey]?.preBattle && !this.storyPlayed[`${storyKey}_pre`]) {
      this.storyPlayed[`${storyKey}_pre`] = true;
      // 单人/多人模式均自动播放剧情，避免点击闪烁
      const isAuto = true;
      // 立即播放剧情（用requestAnimationFrame确保DOM已更新），不延迟
      requestAnimationFrame(() => {
        DialogSystem.play(STORY_DATA[storyKey].preBattle, () => {}, sceneKey, chapterTitle, null, isAuto);
      });
    }
  },

  getBattle() {
    if (this.soloMode) return this.soloBattle;
    return this.room?.battle;
  },

  updateBattle() {
    const battle = this.getBattle();
    if (!battle) return;

    // 状态更新时清除目标选择（回合可能已变，旧的点击处理器必须清除）
    this.clearTargetSelect();

    $('battleTurn').textContent = `第${battle.turnCount}回合`;

    // 渲染敌人
    const enemiesEl = $('battleEnemies');
    const enemies = battle.units.filter(u => !u.isPlayer);
    enemiesEl.innerHTML = enemies.map(u => this.renderUnit(u)).join('');

    // 渲染玩家
    const playersEl = $('battlePlayers');
    const players = battle.units.filter(u => u.isPlayer);
    playersEl.innerHTML = players.map(u => this.renderUnit(u)).join('');

    // 战斗日志
    const logEl = $('battleLog');
    logEl.innerHTML = battle.log.slice(-8).map(l => `<div class="log-line">${l}</div>`).join('');
    logEl.scrollTop = logEl.scrollHeight;

    // 当前行动
    const pending = battle.pendingAction;
    const isMyTurn = pending?.isPlayer && pending.ownerId === this.playerId;

    if (isMyTurn && battle.phase === 'battle') {
      $('turnHint').textContent = '你的回合，请选择行动';
      this.renderActionButtons(pending.unitId);
    } else if (pending?.isPlayer) {
      const unitName = battle.units.find(u => u.id === pending.unitId)?.name || '队友';
      $('turnHint').textContent = `${unitName} 的回合`;
      $('actionButtons').innerHTML = '';
    } else {
      $('turnHint').textContent = '敌人行动中...';
      $('actionButtons').innerHTML = '';
    }
  },

  renderUnit(unit) {
    const hpPct = Math.max(0, (unit.hp / unit.maxHp) * 100);
    const mpPct = Math.max(0, (unit.mp / unit.maxMp) * 100);
    const isDead = unit.hp <= 0;
    const isLowHp = !isDead && hpPct < 30;
    const isCritical = !isDead && hpPct < 15;
    const pending = this.getBattle()?.pendingAction;
    const isActive = pending?.unitId === unit.id;
    const elIcon = { metal: '⚜️', wood: '🌿', earth: '🪨', water: '💧', fire: '🔥' }[unit.element] || '';

    const buffIcons = (unit.buffs || []).map(b => {
      const names = { defUp: '🛡️', atkUp: '⚔️', spdUp: '⚡', shield: '✨' };
      return `<span class="buff-icon" title="${b.type}">${names[b.type] || '⬆️'}<span class="buff-turn">${b.turns}</span></span>`;
    }).join('');
    const debuffIcons = (unit.debuffs || []).map(d => {
      const names = { defDown: '💔', atkDown: '🗡️', spdDown: '🐢', stun: '💫' };
      return `<span class="debuff-icon" title="${d.type}">${names[d.type] || '⬇️'}<span class="buff-turn">${d.turns}</span></span>`;
    }).join('');

    const hpClass = isCritical ? 'hp-critical' : isLowHp ? 'hp-low' : '';

    return `
      <div class="battle-unit ${isDead ? 'dead' : ''} ${isActive ? 'active' : ''}" data-id="${unit.id}" data-isplayer="${unit.isPlayer}" data-element="${unit.element}">
        <div class="unit-img">
          <img src="${unit.img}" alt="${unit.name}" />
        </div>
        <div class="unit-info">
          <div class="unit-name">${elIcon} ${unit.name} <span class="unit-lv">Lv.${unit.level || 1}</span></div>
          <div class="unit-hp-bar ${hpClass}"><div class="unit-hp-fill" style="width:${hpPct}%"></div><span class="unit-hp-text">${unit.hp}/${unit.maxHp}</span></div>
          <div class="unit-mp-bar"><div class="unit-mp-fill" style="width:${mpPct}%"></div><span class="unit-mp-text">${unit.mp}/${unit.maxMp}</span></div>
          <div class="unit-buffs">${buffIcons}${debuffIcons}</div>
        </div>
      </div>
    `;
  },

  renderActionButtons(unitId) {
    const container = $('actionButtons');
    const battle = this.getBattle();
    const unit = battle?.units.find(u => u.id === unitId);
    if (!unit || !unit.isPlayer) { container.innerHTML = ''; return; }

    // 渲染新按钮前先清除之前的目标选择状态
    this.clearTargetSelect();
    this._actionLocked = false;

    let skills = [];
    if (this.soloMode) {
      const heroData = this.heroes.find(h => h.id === unit.heroId);
      skills = heroData?.skills || [];
    } else {
      const heroData = this.heroes.find(h => h.id === unit.heroId);
      skills = heroData?.skills || [];
    }

    const pd = this.room.players.find(p => p.id === this.playerId);
    const items = pd?.items || {};

    let html = `
      <button class="action-btn" data-action="attack">⚔️ 普通攻击</button>
      <button class="action-btn" data-action="defend">🛡️ 防御</button>
    `;

    skills.forEach((s, i) => {
      const canUse = unit.mp >= s.mp;
      html += `<button class="action-btn skill-btn ${canUse ? '' : 'disabled'}" data-action="skill" data-index="${i}" title="${s.desc}">
        ${s.name} <span class="mp-cost">MP${s.mp}</span>
      </button>`;
    });

    html += `
      <button class="action-btn item-btn ${items.hpPotion > 0 ? '' : 'disabled'}" data-action="item" data-item="hpPotion">
        🧪 生命药水(${items.hpPotion || 0})
      </button>
      <button class="action-btn item-btn ${items.mpPotion > 0 ? '' : 'disabled'}" data-action="item" data-item="mpPotion">
        🔵 法力药水(${items.mpPotion || 0})
      </button>
    `;

    container.innerHTML = html;

    container.querySelectorAll('.action-btn:not(.disabled)').forEach(btn => {
      btn.addEventListener('click', () => {
        // 防止重复点击
        if (this._actionLocked) return;
        const action = btn.dataset.action;
        AudioSystem.playSfx('click');

        // 点击任何行动按钮时先清除之前的目标选择状态
        this.clearTargetSelect();

        if (action === 'attack') {
          this.startTargetSelect('enemy', (targetId) => {
            this.performBattleAction({ type: 'attack', targetId });
          });
        } else if (action === 'defend') {
          this._actionLocked = true;
          this.performBattleAction({ type: 'defend' });
        } else if (action === 'skill') {
          const idx = parseInt(btn.dataset.index);
          const skill = skills[idx];
          if (!skill) return;

          if (skill.target === 'all' || skill.target === 'self') {
            this._actionLocked = true;
            this.performBattleAction({ type: 'skill', skillIndex: idx });
          } else if (skill.target === 'allEnemy') {
            this._actionLocked = true;
            this.performBattleAction({ type: 'skill', skillIndex: idx });
          } else if (skill.type === 'revive') {
            this.startTargetSelect('deadAlly', (targetId) => {
              this.performBattleAction({ type: 'skill', skillIndex: idx, targetId });
            });
          } else if (skill.type === 'heal') {
            this.startTargetSelect('ally', (targetId) => {
              this.performBattleAction({ type: 'skill', skillIndex: idx, targetId });
            });
          } else {
            this.startTargetSelect('enemy', (targetId) => {
              this.performBattleAction({ type: 'skill', skillIndex: idx, targetId });
            });
          }
        } else if (action === 'item') {
          const itemId = btn.dataset.item;
          this.startTargetSelect('ally', (targetId) => {
            this.performBattleAction({ type: 'item', itemId, targetId });
          });
        }
      });
    });
  },

  clearTargetSelect() {
    const units = document.querySelectorAll('.battle-unit');
    units.forEach(u => {
      u.classList.remove('selectable', 'targetable', 'selected');
      u.onclick = null;
    });
  },

  startTargetSelect(mode, callback) {
    const battle = this.getBattle();
    if (!battle) return;

    // 先清除之前的目标选择
    this.clearTargetSelect();

    // 发送前再次验证是否是自己的回合
    const pending = battle.pendingAction;
    if (!pending?.isPlayer || pending.ownerId !== this.playerId) {
      toast('不是你的回合');
      return;
    }

    $('turnHint').textContent = mode === 'enemy' ? '选择目标敌人' : mode === 'ally' ? '选择队友' : '选择目标';

    const units = document.querySelectorAll('.battle-unit');
    const validTargets = [];
    units.forEach(u => {
      const isPlayer = u.dataset.isplayer === 'true';
      const isDead = u.classList.contains('dead') || (battle.units.find(x=>x.id===u.dataset.id)?.hp <= 0);
      let selectable = false;

      if (mode === 'enemy') selectable = !isPlayer && !isDead;
      else if (mode === 'ally') selectable = isPlayer && !isDead;
      else if (mode === 'deadAlly') selectable = isPlayer && isDead;

      if (selectable) {
        validTargets.push(u);
        u.classList.add('targetable');
        u.onclick = () => {
          // 清除其他selected
          document.querySelectorAll('.battle-unit.selected').forEach(el => el.classList.remove('selected'));
          u.classList.add('selected');
          // 点击目标时再次验证回合归属，防止竞态条件
          const latestBattle = this.getBattle();
          const latestPending = latestBattle?.pendingAction;
          if (!latestPending?.isPlayer || latestPending.ownerId !== this.playerId) {
            this.clearTargetSelect();
            toast('不是你的回合');
            return;
          }

          AudioSystem.playSfx('click');
          const targetId = u.dataset.id;
          // 延迟执行，让selected反馈可见
          setTimeout(() => {
            this.clearTargetSelect();
            this._actionLocked = true;
            callback(targetId);
          }, 120);
        };
      }
    });

    // 手机端优化：只有1个可选目标时，自动高亮+直接点击反馈
    if (validTargets.length === 1) {
      validTargets[0].classList.add('selected');
    }
  },

  performBattleAction(action) {
    if (this.soloMode) {
      const pending = this.soloBattle.pendingAction;
      if (pending) {
        this.soloPerformAction(pending.unitId, action);
      }
    } else if (this.socket) {
      // 发送前最终验证回合归属
      const battle = this.getBattle();
      const pending = battle?.pendingAction;
      if (!pending?.isPlayer || pending.ownerId !== this.playerId) {
        console.log(`[CLIENT] Blocked action - not my turn. pending=`, pending, 'playerId:', this.playerId);
        toast('不是你的回合');
        this.clearTargetSelect();
        return;
      }
      console.log(`[CLIENT] Sending action:`, action, 'pending:', pending, 'playerId:', this.playerId);
      this.socket.emit('battleAction', action, (res) => {
        this._actionLocked = false;
        if (!res.ok) {
          console.log(`[CLIENT] Action rejected:`, res.error, 'pending:', this.getBattle()?.pendingAction);
          toast(res.error || '操作失败');
        }
      });
    }
  },

  showBattleResult() {
    const battle = this.getBattle();
    if (!battle) return;

    // 防止重复调用（战斗结果只处理一次）
    if (this._showingBattleResult) return;
    this._showingBattleResult = true;

    const isWin = battle.winner === 'player';
    const isHost = this.soloMode || this.room.hostId === this.playerId;
    const isMulti = !this.soloMode;
    const levelIdx = battle.levelIndex ?? this.room.levelIndex ?? 0;
    const isLastLevel = levelIdx === 4;

    if (!isWin) {
      // 失败流程
      $('resultTitle').textContent = '💀 战斗失败';
      $('resultDesc').textContent = '队伍全员倒下了...';
      const rewardsEl = $('resultRewards');
      rewardsEl.innerHTML = '';
      if (isMulti && !isHost) {
        $('btnNextLevel').style.display = 'none';
        $('btnRetry').style.display = 'none';
        $('btnResultLeave').style.display = 'none';
        $('resultDesc').textContent = '等待房主选择重试...';
      } else {
        $('btnNextLevel').style.display = 'none';
        $('btnRetry').style.display = '';
        $('btnResultLeave').style.display = '';
      }
      AudioSystem.stopBgm();
      if (isMulti && !isHost) {
        $('treasureOverlay').classList.add('hidden');
        DialogSystem.close();
      }
      showScreen('resultScreen');
      return;
    }

    // 胜利流程
    AudioSystem.stopBgm();
    AudioSystem.playSfx('victory');

    const level = this.levels[levelIdx];
    const storyKey = `level_${levelIdx}`;
    const sceneKeys = ['hongqiao', 'science', 'artgallery', 'pavilion', 'qiaoyuan'];
    const postScene = isLastLevel ? 'victory' : sceneKeys[levelIdx];

    // 所有玩家都播放战后剧情（多人模式自动播放）
    const afterStory = () => {
      if (isLastLevel) {
        // 最终关：播放光明荣誉市民庆祝画面
        this.showHonoraryCitizen();
      } else {
        // 展示奖励信息（在宝箱之后显示到结果界面）
        const rewardsEl = $('resultRewards');
        if (level) {
          rewardsEl.innerHTML = `
            <div class="reward-item"><span>⭐ 经验</span><b>+${level.reward.exp}</b></div>
            <div class="reward-item"><span>💰 金币</span><b>+${level.reward.gold}</b></div>
          `;
        } else {
          rewardsEl.innerHTML = '';
        }
        $('resultTitle').textContent = '🎉 战斗胜利！';
        $('resultDesc').textContent = '成功攻略了这一关！';

        // 所有玩家都自动开宝箱并展示奖励（无需手动点击）
        if (isMulti && !isHost) {
          // 队友：自动开宝箱，结束后显示结果界面等待房主
          this.showTreasureAuto(levelIdx, () => {
            $('btnNextLevel').style.display = 'none';
            $('btnRetry').style.display = 'none';
            $('btnResultLeave').style.display = 'none';
            $('resultDesc').textContent = '等待房主继续攻略...';
            showScreen('resultScreen');
          });
        } else {
          // 房主/单人：也自动开宝箱，展示奖励后显示结果界面
          this.showTreasureAuto(levelIdx, () => {
            $('btnNextLevel').style.display = isLastLevel ? 'none' : '';
            $('btnRetry').style.display = 'none';
            $('btnResultLeave').style.display = '';
            showScreen('resultScreen');
          });
        }
      }
    };

    if (STORY_DATA[storyKey]?.postBattle && !this.storyPlayed[`${storyKey}_post`]) {
      this.storyPlayed[`${storyKey}_post`] = true;
      // 单人模式也自动播放剧情（与多人模式一致），避免点击闪烁
      const autoPlay = true;
      const onEffect = isLastLevel ? (effectName) => this.handleStoryEffect(effectName) : null;
      DialogSystem.play(STORY_DATA[storyKey].postBattle, afterStory, postScene, null, null, autoPlay, onEffect);
    } else {
      afterStory();
    }
  },

  // 处理剧情中的特效触发
  handleStoryEffect(effectName) {
    if (effectName === 'mapLightUp') {
      this.playMapLighting();
    }
  },

  // 地图点亮动画（最终关剧情配合）
  playMapLighting() {
    const mapEl = $('mapLighting');
    if (!mapEl) return;

    // 隐藏剧情插图，避免遮挡地图
    const cutsceneImg = $('dialogCutsceneImg');
    if (cutsceneImg) {
      cutsceneImg.classList.remove('visible');
      cutsceneImg.style.opacity = '0';
    }

    // 重置所有点亮状态
    mapEl.querySelectorAll('.map-loc').forEach(loc => loc.classList.remove('lit'));
    mapEl.classList.remove('hidden');
    mapEl.classList.remove('map-bright');

    // 景点名称映射（按用户要求的顺序：虹桥公园→回归亭→科学城→美术馆→光明侨院）
    const locNames = {
      0: '虹桥公园',
      3: '回归亭',
      1: '光明科学城',
      2: '光明美术馆',
      4: '光明侨院'
    };

    // 依次点亮5个景点（顺序：虹桥公园→回归亭→科学城→美术馆→光明侨院）
    const order = [0, 3, 1, 2, 4];
    order.forEach((idx, i) => {
      setTimeout(() => {
        const loc = mapEl.querySelector(`.map-loc[data-loc="${idx}"]`);
        if (loc) {
          // 更新景点名称为用户指定的名称
          const nameEl = loc.querySelector('.loc-name');
          if (nameEl && locNames[idx]) {
            nameEl.textContent = locNames[idx];
          }
          loc.classList.add('lit');
          AudioSystem.playSfx('click');
        }
      }, 600 + i * 800);
    });

    // 全部点亮后，地图整体变亮
    setTimeout(() => {
      mapEl.classList.add('map-bright');
      AudioSystem.playSfx('victory');
    }, 600 + order.length * 800 + 500);
  },

  // 光明荣誉市民庆祝画面
  showHonoraryCitizen() {
    const honorScreen = $('honorScreen');
    if (!honorScreen) return;

    // 隐藏所有其他界面
    $('dialogOverlay').classList.add('hidden');
    $('treasureOverlay').classList.add('hidden');
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));

    // 获取队伍成员名字
    let teamNames = [];
    if (this.soloMode) {
      teamNames = this.room.heroes.map(h => h.name);
    } else {
      teamNames = this.room.players.map(p => p.name);
    }

    // 设置队伍信息
    $('honorTeam').textContent = `由 ${teamNames.join('、')} 组成的光明西游小队`;
    $('certNames').innerHTML = teamNames.map(n => `<span style="color:#ffd700">${n}</span>`).join(' &nbsp; ');

    // 播放胜利BGM
    try { AudioSystem.playBgm('victory'); } catch(e) {}

    // 生成粒子
    const particlesEl = $('honorParticles');
    particlesEl.innerHTML = '';
    const colors = ['#ffd700', '#ffb545', '#fff9c4', '#ffffff', '#ce93d8', '#4d96ff'];
    for (let i = 0; i < 50; i++) {
      const p = document.createElement('div');
      p.className = 'honor-particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.top = Math.random() * 100 + '%';
      const size = 3 + Math.random() * 6;
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.background = colors[Math.floor(Math.random() * colors.length)];
      p.style.boxShadow = `0 0 ${6 + Math.random() * 8}px ${p.style.background}`;
      p.style.animationDelay = Math.random() * 4 + 's';
      p.style.animationDuration = (3 + Math.random() * 3) + 's';
      particlesEl.appendChild(p);
    }

    // 自动收集最终纪念品（光明乳鸽御守）
    const souvenir = SOUVENIR_DATA[4];
    if (souvenir) {
      const collected = this.collectedSouvenirs || [];
      if (!collected.includes(4)) {
        if (!this.collectedSouvenirs) this.collectedSouvenirs = [];
        this.collectedSouvenirs.push(4);
        this.applySouvenirBuff(souvenir);
        this.saveSouvenirs();
      }
    }

    // 隐藏地图点亮层
    const mapEl = $('mapLighting');
    if (mapEl) mapEl.classList.add('hidden');

    honorScreen.classList.remove('hidden');

    // 返回按钮
    const returnBtn = $('btnHonorReturn');
    if (returnBtn) {
      returnBtn.onclick = () => {
        AudioSystem.playSfx('click');
        honorScreen.classList.add('hidden');
        particlesEl.innerHTML = '';
        // 返回标题/大厅
        this.resetToTitle();
      };
    }
  },

  // 重置到标题界面
  resetToTitle() {
    // 断开socket
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.soloMode = false;
    this.room = null;
    this.playerId = null;
    this.playerName = '';

    // 停止所有音频
    AudioSystem.stopBgm();

    // 显示标题界面
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    $('titleScreen').classList.remove('hidden');
  },

  // ===== 通关宝箱系统 =====
  showTreasure(levelIdx) {
    // 检查是否已收集过该关卡纪念品
    const collected = this.collectedSouvenirs || [];
    if (collected.includes(levelIdx)) {
      // 已收集过，直接显示结果
      showScreen('resultScreen');
      return;
    }

    const overlay = $('treasureOverlay');
    const box = $('treasureBox');
    const item = $('treasureItem');
    const shine = $('treasureShine');
    const hint = $('treasureHint');

    overlay.classList.remove('hidden');
    box.classList.remove('opened');
    item.classList.add('hidden');
    shine.classList.add('hidden');
    hint.textContent = '✨ 点击宝箱开启纪念品 ✨';

    // 生成粒子
    this.spawnTreasureParticles();

    // 宝箱点击事件
    const openChest = () => {
      box.removeEventListener('click', openChest);
      AudioSystem.playSfx('click');
      box.classList.add('opened');
      hint.textContent = '';

      // 光芒特效
      setTimeout(() => {
        shine.classList.remove('hidden');
        AudioSystem.playSfx('victory');
        // 大量粒子
        this.spawnTreasureParticles(30);
      }, 400);

      // 显示纪念品
      setTimeout(() => {
        this.revealSouvenir(levelIdx);
      }, 900);
    };

    box.addEventListener('click', openChest, { once: true });
  },

  revealSouvenir(levelIdx) {
    const souvenir = SOUVENIR_DATA[levelIdx];
    if (!souvenir) {
      this.closeTreasure();
      return;
    }

    const rarity = RARITY_COLORS[souvenir.rarity];
    const item = $('treasureItem');
    const icon = $('treasureItemIcon');
    const rarityEl = $('treasureItemRarity');
    const nameEl = $('treasureItemName');
    const tagEl = $('treasureItemTag');
    const descEl = $('treasureItemDesc');
    const photoEl = $('treasureItemPhoto');
    const buffEl = $('treasureItemBuff');

    icon.textContent = souvenir.icon;
    rarityEl.textContent = rarity.label;
    rarityEl.style.background = rarity.color;
    rarityEl.style.color = souvenir.rarity === 'legendary' ? '#000' : '#fff';
    nameEl.textContent = souvenir.name;
    nameEl.style.color = rarity.color;
    nameEl.style.textShadow = `0 0 20px ${rarity.glow}, 2px 2px 0 #000`;
    tagEl.textContent = souvenir.tag;
    descEl.textContent = souvenir.description;
    photoEl.textContent = `推荐打卡点：${souvenir.photoSpot}`;
    buffEl.textContent = `永久属性加成：${souvenir.buff.desc}`;

    item.classList.remove('hidden');

    // 收集按钮
    const collectBtn = $('btnCollectTreasure');
    collectBtn.onclick = () => {
      AudioSystem.playSfx('levelup');
      // 记录已收集
      if (!this.collectedSouvenirs) this.collectedSouvenirs = [];
      this.collectedSouvenirs.push(levelIdx);
      // 应用buff
      this.applySouvenirBuff(souvenir);
      // 保存到本地
      this.saveSouvenirs();
      // 关闭宝箱
      this.closeTreasure();
    };
  },

  applySouvenirBuff(souvenir) {
    // 给所有己方单位加buff
    const buff = souvenir.buff;
    const heroes = this.room?.heroes || [];
    heroes.forEach(h => {
      switch(buff.type) {
        case 'hpBoost': h.maxHp += buff.value; h.hp += buff.value; break;
        case 'mpBoost': h.maxMp += buff.value; h.mp += buff.value; break;
        case 'atkBoost': h.atk += buff.value; break;
        case 'defBoost': h.def += buff.value; break;
        case 'allBoost':
          h.maxHp += buff.value; h.hp += buff.value;
          h.maxMp += buff.value; h.mp += buff.value;
          h.atk += buff.value; h.def += buff.value;
          break;
      }
    });
  },

  saveSouvenirs() {
    try {
      localStorage.setItem('gmxy_souvenirs', JSON.stringify(this.collectedSouvenirs || []));
    } catch(e) {}
  },

  // 预加载游戏资源（背景图、角色图、敌人图）
  preloadAssets() {
    const resolve = window.__GAME_RESOLVE__ || ((p) => p);
    const images = new Set();
    // 收集所有关卡背景图
    (this.levels || []).forEach(l => {
      if (l.background) images.add(resolve(l.background));
      (l.enemies || []).forEach(e => { if (e.img) images.add(resolve(e.img)); });
    });
    // 收集所有英雄图片
    (this.heroes || []).forEach(h => {
      if (h.img) images.add(resolve(h.img));
    });
    // 收集剧情背景图
    const dialogBgs = ['prologue', 'hongqiao', 'science', 'artgallery', 'pavilion', 'qiaoyuan', 'victory'];
    const bgMap = {
      hongqiao: 'assets/backgrounds/level1-hongqiao.jpg',
      science: 'assets/backgrounds/level2-museum.jpg',
      artgallery: 'assets/backgrounds/level3-artgallery.jpg',
      pavilion: 'assets/backgrounds/level4-pavilion.jpg',
      qiaoyuan: 'assets/backgrounds/level5-qiaoyuan.jpg',
    };
    Object.values(bgMap).forEach(p => images.add(resolve(p)));
    // 标题画面和地图
    images.add(resolve('assets/backgrounds/title-screen.jpg'));
    images.add(resolve('assets/backgrounds/world-map.jpg'));
    // 过场图
    ['cutscene-art.jpg','cutscene-battle.jpg','cutscene-meet.jpg','cutscene-pavilion.jpg',
     'cutscene-prologue.jpg','cutscene-qiaoyuan.jpg','cutscene-science.jpg','cutscene-shadow.jpg',
     'cutscene-victory.jpg'].forEach(p => images.add(resolve('assets/backgrounds/' + p)));

    // 异步预加载（不阻塞）
    let loaded = 0;
    images.forEach(src => {
      const img = new Image();
      img.onload = () => { loaded++; };
      img.onerror = () => { console.warn('[Preload] Failed:', src); };
      img.src = src;
    });
    console.log('[Game] Preloading', images.size, 'assets...');
  },

  loadSouvenirs() {
    try {
      const data = localStorage.getItem('gmxy_souvenirs');
      this.collectedSouvenirs = data ? JSON.parse(data) : [];
    } catch(e) {
      this.collectedSouvenirs = [];
    }
  },

  closeTreasure() {
    $('treasureOverlay').classList.add('hidden');
    // 显示结果界面
    showScreen('resultScreen');
  },

  // 自动开宝箱（所有人都使用自动开宝箱，展示奖励和纪念品）
  showTreasureAuto(levelIdx, onComplete) {
    const collected = this.collectedSouvenirs || [];
    const level = this.levels[levelIdx];

    // 自动收集纪念品
    const souvenir = SOUVENIR_DATA[levelIdx];
    if (souvenir && !collected.includes(levelIdx)) {
      if (!this.collectedSouvenirs) this.collectedSouvenirs = [];
      this.collectedSouvenirs.push(levelIdx);
      this.applySouvenirBuff(souvenir);
      this.saveSouvenirs();
    }

    const overlay = $('treasureOverlay');
    const box = $('treasureBox');
    const item = $('treasureItem');
    const shine = $('treasureShine');
    const hint = $('treasureHint');
    const collectBtn = $('btnCollectTreasure');
    const rewardsEl = $('treasureRewards');

    overlay.classList.remove('hidden');
    box.classList.remove('opened');
    item.classList.add('hidden');
    shine.classList.add('hidden');
    hint.textContent = '✨ 开启奖励 ✨';
    collectBtn.style.display = 'none';

    this.spawnTreasureParticles();

    // 自动开宝箱（1秒后）
    setTimeout(() => {
      AudioSystem.playSfx('click');
      box.classList.add('opened');
      hint.textContent = '';

      setTimeout(() => {
        shine.classList.remove('hidden');
        AudioSystem.playSfx('victory');
        this.spawnTreasureParticles(30);
      }, 400);

      setTimeout(() => {
        // 显示经验和金币奖励
        if (level && level.reward && rewardsEl) {
          rewardsEl.innerHTML = `
            <div class="treasure-reward-item">
              <div class="treasure-reward-label">⭐ 经验</div>
              <div class="treasure-reward-value">+${level.reward.exp}</div>
            </div>
            <div class="treasure-reward-item">
              <div class="treasure-reward-label">💰 金币</div>
              <div class="treasure-reward-value">+${level.reward.gold}</div>
            </div>
          `;
        }

        // 显示纪念品
        if (souvenir) {
          const rarity = RARITY_COLORS[souvenir.rarity];
          $('treasureItemIcon').textContent = souvenir.icon;
          $('treasureItemRarity').textContent = rarity.label;
          $('treasureItemRarity').style.background = rarity.color;
          $('treasureItemRarity').style.color = souvenir.rarity === 'legendary' ? '#000' : '#fff';
          $('treasureItemName').textContent = souvenir.name;
          $('treasureItemName').style.color = rarity.color;
          $('treasureItemName').style.textShadow = `0 0 20px ${rarity.glow}, 2px 2px 0 #000`;
          $('treasureItemTag').textContent = souvenir.tag;
          $('treasureItemDesc').textContent = souvenir.description;
          $('treasureItemPhoto').textContent = `推荐打卡点：${souvenir.photoSpot}`;
          $('treasureItemBuff').textContent = `永久属性加成：${souvenir.buff.desc}`;
        }
        item.classList.remove('hidden');

        // 3秒后自动关闭（让玩家有时间看清奖励和纪念品）
        setTimeout(() => {
          collectBtn.style.display = '';
          $('treasureOverlay').classList.add('hidden');
          if (onComplete) onComplete();
        }, 3000);
      }, 900);
    }, 1000);
  },

  spawnTreasureParticles(count = 15) {
    const container = $('treasureParticles');
    if (!container) return;
    const colors = ['#ffd700', '#ffb545', '#ff6b6b', '#ce93d8', '#4d96ff', '#6bcb77'];
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'treasure-particle';
      p.style.left = `${30 + Math.random() * 40}%`;
      p.style.top = `${50 + Math.random() * 20}%`;
      p.style.background = colors[Math.floor(Math.random() * colors.length)];
      p.style.animationDelay = `${Math.random() * 2}s`;
      p.style.animationDuration = `${2 + Math.random() * 2}s`;
      container.appendChild(p);
      setTimeout(() => p.remove(), 5000);
    }
  },

  nextLevel() {
    AudioSystem.playSfx('click');
    if (this.soloMode) {
      this.room.phase = 'map';
      this.soloBattle = null;
      this.room.battle = null;
      this.goToMap();
    } else if (this.socket) {
      this.socket.emit('nextLevel', {}, (res) => {
        if (!res.ok) toast(res.error || '操作失败');
      });
    }
  },

  retryLevel() {
    AudioSystem.playSfx('click');
    if (this.soloMode) {
      // 复活
      const hero = this.room.heroes[0];
      if (hero && hero.hp <= 0) hero.hp = Math.round(hero.maxHp * 0.5);
      this.initSoloBattle(this.room.levelIndex);
      this.enterBattle();
    } else if (this.socket) {
      this.socket.emit('retryLevel', {}, (res) => {
        if (!res.ok) toast(res.error || '操作失败');
      });
    }
  },

  leaveRoom() {
    AudioSystem.playSfx('click');
    AudioSystem.stopBgm();
    if (this.socket) {
      this.socket.emit('leaveRoom');
      this.socket.disconnect();
      this.socket = null;
    }
    this.room = null;
    this.soloBattle = null;
    this.soloMode = false;
    this.playerId = null;
    this.storyPlayed = {};
    ChatSystem.clear();
    showScreen('titleScreen');
  },
};

// ===== 剧情对话系统 =====
const DialogSystem = {
  active: false,
  lines: [],
  index: 0,
  onComplete: null,
  typing: false,
  typeTimer: null,
  autoTimer: null,
  autoMode: false,
  currentFullText: '',
  lastSpeaker: null,
  currentScene: 'prologue',
  currentLevelBg: null,
  particleTimer: null,

  // 场景配置：背景色、氛围光颜色、粒子配置
  sceneConfigs: {
    prologue: {
      bgGradient: 'linear-gradient(180deg, #1a0a2e 0%, #16213e 30%, #0f3460 60%, #1a1a2e 100%)',
      ambientLeft: 'radial-gradient(circle, rgba(255,107,107,0.35) 0%, transparent 70%)',
      ambientRight: 'radial-gradient(circle, rgba(78,205,196,0.35) 0%, transparent 70%)',
      particleColor: ['#ff6b6b', '#4ecdc4', '#ffe66d', '#ffffff'],
      particleCount: 20,
    },
    hongqiao: {
      bgImage: 'assets/backgrounds/level1-hongqiao.jpg',
      ambientLeft: 'radial-gradient(circle, rgba(76,175,80,0.3) 0%, transparent 70%)',
      ambientRight: 'radial-gradient(circle, rgba(255,181,69,0.25) 0%, transparent 70%)',
      particleColor: ['#81c784', '#a5d6a7', '#ffb545', '#ffffff'],
      particleCount: 15,
    },
    science: {
      bgImage: 'assets/backgrounds/level2-museum.jpg',
      ambientLeft: 'radial-gradient(circle, rgba(33,150,243,0.3) 0%, transparent 70%)',
      ambientRight: 'radial-gradient(circle, rgba(0,188,212,0.25) 0%, transparent 70%)',
      particleColor: ['#2196f3', '#00bcd4', '#b3e5fc', '#e3f2fd'],
      particleCount: 12,
    },
    artgallery: {
      bgImage: 'assets/backgrounds/level3-artgallery.jpg',
      ambientLeft: 'radial-gradient(circle, rgba(156,39,176,0.25) 0%, transparent 70%)',
      ambientRight: 'radial-gradient(circle, rgba(233,30,99,0.2) 0%, transparent 70%)',
      particleColor: ['#ce93d8', '#f48fb1', '#9c27b0', '#000000'],
      particleCount: 10,
    },
    pavilion: {
      bgImage: 'assets/backgrounds/level4-pavilion.jpg',
      ambientLeft: 'radial-gradient(circle, rgba(121,85,72,0.3) 0%, transparent 70%)',
      ambientRight: 'radial-gradient(circle, rgba(255,193,7,0.2) 0%, transparent 70%)',
      particleColor: ['#a1887f', '#ffc107', '#d7ccc8', '#efebe9'],
      particleCount: 8,
    },
    qiaoyuan: {
      bgImage: 'assets/backgrounds/level5-qiaoyuan.jpg',
      ambientLeft: 'radial-gradient(circle, rgba(244,67,54,0.35) 0%, transparent 70%)',
      ambientRight: 'radial-gradient(circle, rgba(255,235,59,0.25) 0%, transparent 70%)',
      particleColor: ['#f44336', '#ffeb3b', '#ff9800', '#ffffff'],
      particleCount: 25,
    },
    victory: {
      bgGradient: 'linear-gradient(180deg, #1a3a1a 0%, #0d2f0d 40%, #1a2f1a 70%, #0b1022 100%)',
      ambientLeft: 'radial-gradient(circle, rgba(255,215,0,0.3) 0%, transparent 70%)',
      ambientRight: 'radial-gradient(circle, rgba(255,181,69,0.25) 0%, transparent 70%)',
      particleColor: ['#ffd700', '#ffb545', '#fff9c4', '#ffffff'],
      particleCount: 30,
    }
  },

  // 设置场景
  setScene(sceneKey, chapterTitle, chapterSubtitle) {
    this.currentScene = sceneKey;
    const config = this.sceneConfigs[sceneKey] || this.sceneConfigs.prologue;
    const overlay = $('dialogOverlay');
    const scene = $('dialogScene');
    const ambientLeft = $('dialogAmbientLeft');
    const ambientRight = $('dialogAmbientRight');
    const resolve = window.__GAME_RESOLVE__ || ((p) => p);

    overlay.setAttribute('data-scene', sceneKey);

    // 清除之前的inline背景，让CSS data-scene属性生效
    scene.style.background = '';

    // 设置背景
    if (config.bgImage) {
      scene.style.background = `linear-gradient(180deg, rgba(11,16,34,0.2) 0%, rgba(11,16,34,0.1) 40%, rgba(11,16,34,0.4) 70%, rgba(11,16,34,0.9) 100%), url(${resolve(config.bgImage)}) center/cover no-repeat`;
    }
    // 如果有bgGradient或data-scene CSS规则，不设置inline style，让CSS生效

    // 设置氛围光
    ambientLeft.style.background = config.ambientLeft;
    ambientRight.style.background = config.ambientRight;

    // 显示过场标题
    if (chapterTitle) {
      this.showChapter(chapterTitle, chapterSubtitle);
    }

    // 启动粒子
    this.startParticles(config);
  },

  // 显示章节标题卡片
  showChapter(title, subtitle) {
    const chapter = $('dialogChapter');
    $('dialogChapterTitle').textContent = title;
    $('dialogChapterSubtitle').textContent = subtitle || '';
    chapter.classList.remove('hidden');
    // 动画结束后自动隐藏
    setTimeout(() => {
      chapter.classList.add('hidden');
    }, 2000);
  },

  // 启动粒子效果
  startParticles(config) {
    this.stopParticles();
    const container = $('dialogParticles');
    container.innerHTML = '';
    const count = config.particleCount || 15;
    const colors = config.particleColor || ['#ffffff'];

    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'dialog-particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.width = (3 + Math.random() * 5) + 'px';
      p.style.height = p.style.width;
      p.style.background = colors[Math.floor(Math.random() * colors.length)];
      p.style.animationDuration = (4 + Math.random() * 6) + 's';
      p.style.animationDelay = (Math.random() * 6) + 's';
      p.style.boxShadow = `0 0 ${4 + Math.random() * 6}px ${p.style.background}`;
      container.appendChild(p);
    }
  },

  stopParticles() {
    const container = $('dialogParticles');
    if (container) container.innerHTML = '';
    if (this.particleTimer) {
      clearInterval(this.particleTimer);
      this.particleTimer = null;
    }
  },

  play(lines, onComplete, sceneKey, chapterTitle, chapterSubtitle, autoMode = false, onEffect = null) {
    if (!lines || lines.length === 0) {
      if (onComplete) onComplete();
      return;
    }
    // 多人模式(autoMode=true)始终自动播放剧情，忽略autoStory设置
    // 单人模式下根据autoStory设置决定是否跳过
    if (!autoMode && !SettingsSystem.data.autoStory) {
      if (onComplete) onComplete();
      return;
    }
    this.lines = lines;
    this.index = 0;
    this.onComplete = onComplete;
    this.onEffect = onEffect;
    this.active = true;
    this.lastSpeaker = null;
    this.autoMode = !!autoMode;

    // 设置场景
    if (sceneKey) {
      this.setScene(sceneKey, chapterTitle, chapterSubtitle);
    }

    // 播放剧情BGM（自动模式不切换BGM，保持当前战斗/场景BGM）
    if (!this.autoMode) {
      AudioSystem.playBgm('story');
    }

    const overlay = $('dialogOverlay');
    overlay.classList.remove('hidden');
    if (this.autoMode) {
      overlay.classList.add('auto-mode');
    } else {
      overlay.classList.remove('auto-mode');
    }
    this.showLine();
  },

  showLine() {
    const line = this.lines[this.index];
    if (!line) {
      this.finish();
      return;
    }

    const charInfo = STORY_CHARACTERS[line.speaker] || { name: line.speaker, color: '#fff' };
    const name = charInfo.name || (line.name || '');
    const color = charInfo.color || '#ffb545';

    const nameEl = $('dialogName');
    if (charInfo.isNarrator) {
      nameEl.style.display = 'none';
    } else {
      nameEl.style.display = 'flex';
      nameEl.textContent = name;
      nameEl.style.color = color;
    }

    // 剧情插图切换
    if (line.cutscene && typeof CUTSCENE_IMAGES !== 'undefined') {
      const imgUrl = CUTSCENE_IMAGES[line.cutscene];
      if (imgUrl) {
        const imgEl = $('dialogCutsceneImg');
        if (imgEl) {
          imgEl.src = imgUrl;
          imgEl.classList.add('visible');
          imgEl.style.opacity = '';
        }
        // 同时更新场景背景
        const scene = $('dialogScene');
        if (scene) {
          scene.style.background = '';
        }
      }
    }

    // 自定义特效触发（如地图点亮动画）
    if (line.effect && this.onEffect) {
      this.onEffect(line.effect);
    }

    // 角色立绘
    const leftEl = $('dialogCharLeft');
    const rightEl = $('dialogCharRight');
    const speakerSide = line.side || (line.speaker === 'player' ? 'right' : 'left');

    // 隐藏角色并清除说话状态
    leftEl.classList.remove('active', 'speaking', 'dim');
    rightEl.classList.remove('active', 'speaking', 'dim');
    leftEl.innerHTML = '';
    rightEl.innerHTML = '';

    if (charInfo.heroId) {
      const hero = Game.heroes.find(h => h.id === charInfo.heroId);
      if (hero) {
        const targetEl = speakerSide === 'right' ? rightEl : leftEl;
        const otherEl = speakerSide === 'right' ? leftEl : rightEl;
        targetEl.innerHTML = `<img src="${hero.img}" alt="${hero.name}" />`;
        targetEl.classList.add('active', 'speaking');

        // 如果有其他角色在场，可以在对面显示dim状态
        if (this.lastSpeaker && this.lastSpeaker !== line.speaker) {
          const lastChar = STORY_CHARACTERS[this.lastSpeaker];
          if (lastChar?.heroId && lastChar.heroId !== charInfo.heroId) {
            const lastHero = Game.heroes.find(h => h.id === lastChar.heroId);
            if (lastHero) {
              otherEl.innerHTML = `<img src="${lastHero.img}" alt="${lastHero.name}" />`;
              otherEl.classList.add('active', 'dim');
            }
          }
        }
      }
    } else if (line.speaker === 'player') {
      // 玩家说话，不显示立绘
    }

    this.lastSpeaker = line.speaker;

    // 打字机效果
    this.currentFullText = line.text;
    this.typing = true;
    const textEl = $('dialogText');
    textEl.textContent = '';
    textEl.classList.add('typing');
    let i = 0;
    const speed = this.autoMode ? 18 : 35;

    if (this.typeTimer) clearInterval(this.typeTimer);
    if (this.autoTimer) clearTimeout(this.autoTimer);
    this.typeTimer = setInterval(() => {
      if (i >= line.text.length) {
        clearInterval(this.typeTimer);
        this.typing = false;
        textEl.classList.remove('typing');
        // 自动模式：打字结束后自动进入下一句
        if (this.autoMode) {
          const delay = Math.max(800, Math.min(2000, line.text.length * 40));
          this.autoTimer = setTimeout(() => {
            if (this.active && this.autoMode) this.advance();
          }, delay);
        }
        return;
      }
      textEl.textContent += line.text[i];
      i++;
    }, speed);
  },

  advance() {
    if (!this.active) return;

    // 自动模式下忽略手动点击，由定时器自动推进
    if (this.autoMode && this.typing) return;

    if (this.autoTimer) {
      clearTimeout(this.autoTimer);
      this.autoTimer = null;
    }

    if (this.typing) {
      if (this.typeTimer) clearInterval(this.typeTimer);
      const textEl = $('dialogText');
      textEl.textContent = this.currentFullText;
      textEl.classList.remove('typing');
      this.typing = false;
      // 自动模式下：点击直接显示完整文字后，也安排自动推进
      if (this.autoMode) {
        this.autoTimer = setTimeout(() => {
          if (this.active && this.autoMode) this.advance();
        }, 600);
      }
      return;
    }

    this.index++;
    if (this.index >= this.lines.length) {
      this.finish();
    } else {
      this.showLine();
    }
  },

  finish() {
    this.active = false;
    this.autoMode = false;
    if (this.typeTimer) clearInterval(this.typeTimer);
    if (this.autoTimer) clearTimeout(this.autoTimer);
    this.autoTimer = null;
    this.typeTimer = null;
    this.stopParticles();
    // 清除剧情插图
    const imgEl = $('dialogCutsceneImg');
    if (imgEl) {
      imgEl.classList.remove('visible');
      imgEl.src = '';
      imgEl.style.opacity = '';
    }
    // 清除角色立绘（防止残留叠在画面上产生蓝色图片）
    const leftEl = $('dialogCharLeft');
    const rightEl = $('dialogCharRight');
    if (leftEl) { leftEl.classList.remove('active','speaking','dim'); leftEl.innerHTML = ''; }
    if (rightEl) { rightEl.classList.remove('active','speaking','dim'); rightEl.innerHTML = ''; }
    this.lastSpeaker = null;
    // 清除地图点亮特效
    const mapEl = $('mapLighting');
    if (mapEl) mapEl.classList.add('hidden');
    const overlay = $('dialogOverlay');
    overlay.classList.add('hidden');
    overlay.classList.remove('auto-mode');
    const cb = this.onComplete;
    this.onComplete = null;
    this.onEffect = null;
    if (cb) cb();
  },

  // 强制关闭剧情（不触发回调，用于多人模式跟随房主时跳过剧情）
  close() {
    if (!this.active) return;
    this.active = false;
    this.autoMode = false;
    if (this.typeTimer) clearInterval(this.typeTimer);
    if (this.autoTimer) clearTimeout(this.autoTimer);
    this.autoTimer = null;
    this.typeTimer = null;
    this.stopParticles();
    const imgEl = $('dialogCutsceneImg');
    if (imgEl) {
      imgEl.classList.remove('visible');
      imgEl.src = '';
      imgEl.style.opacity = '';
    }
    // 清除角色立绘（防止残留叠在画面上产生蓝色图片）
    const leftEl = $('dialogCharLeft');
    const rightEl = $('dialogCharRight');
    if (leftEl) { leftEl.classList.remove('active','speaking','dim'); leftEl.innerHTML = ''; }
    if (rightEl) { rightEl.classList.remove('active','speaking','dim'); rightEl.innerHTML = ''; }
    this.lastSpeaker = null;
    // 清除地图点亮特效
    const mapEl = $('mapLighting');
    if (mapEl) mapEl.classList.add('hidden');
    const overlay = $('dialogOverlay');
    overlay.classList.add('hidden');
    overlay.classList.remove('auto-mode');
    this.onComplete = null;
    this.onEffect = null;
  },
};

// ===== 景点图鉴系统 =====
const CollectionSystem = {
  unlocked: {},

  init() {
    try {
      const saved = localStorage.getItem('gmj_collection');
      if (saved) this.unlocked = JSON.parse(saved);
    } catch (e) {}
    this.updateCount();
    this.initTabs();
  },

  initTabs() {
    document.querySelectorAll('.collection-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.collection-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const tabName = tab.dataset.tab;
        if (tabName === 'spots') {
          $('collectionGrid').classList.remove('hidden');
          $('souvenirGrid').classList.add('hidden');
          $('collectionCount').parentElement.style.display = '';
        } else {
          $('collectionGrid').classList.add('hidden');
          $('souvenirGrid').classList.remove('hidden');
          $('collectionCount').parentElement.style.display = 'none';
          this.renderSouvenirs();
        }
      });
    });
  },

  renderSouvenirs() {
    const grid = $('souvenirGrid');
    const collected = Game.collectedSouvenirs || [];
    const count = collected.length;
    const total = SOUVENIR_DATA.length;
    const countEl = $('souvenirCount');
    if (countEl) countEl.textContent = `${count}/${total}`;

    grid.innerHTML = SOUVENIR_DATA.map(s => {
      const isUnlocked = collected.includes(s.levelIndex);
      const rarity = RARITY_COLORS[s.rarity];
      return `
        <div class="souvenir-card ${isUnlocked ? '' : 'locked'}" style="border-color: ${isUnlocked ? rarity.color : 'rgba(255,255,255,0.1)'}">
          <div class="souvenir-card-icon">${isUnlocked ? s.icon : '❓'}</div>
          <div class="souvenir-card-name" style="color: ${isUnlocked ? rarity.color : '#666'}">${isUnlocked ? s.name : '???'}</div>
          <div class="souvenir-card-rarity" style="background: ${isUnlocked ? rarity.color : 'rgba(255,255,255,0.1)'}; color: ${isUnlocked && s.rarity !== 'legendary' ? '#fff' : '#000'}">${isUnlocked ? rarity.label : '未获得'}</div>
          <div class="souvenir-card-tag">${isUnlocked ? s.tag : '通关后解锁'}</div>
          ${isUnlocked ? `<div class="souvenir-card-buff">${s.buff.desc}</div>` : ''}
        </div>
      `;
    }).join('');
  },

  save() {
    try {
      localStorage.setItem('gmj_collection', JSON.stringify(this.unlocked));
    } catch (e) {}
  },

  unlock(levelIndex) {
    const item = COLLECTION_DATA.find(c => c.levelIndex === levelIndex);
    if (item && !this.unlocked[item.id]) {
      this.unlocked[item.id] = true;
      this.save();
      this.updateCount();
      toast(`🎉 解锁图鉴：${item.name}`);
    }
  },

  updateCount() {
    const count = Object.keys(this.unlocked).length;
    const total = COLLECTION_DATA.length;
    $('collectionCount').textContent = count;
    $('collectionTotal').textContent = total;
  },

  show() {
    this.render();
    $('collectionOverlay').classList.remove('hidden');
  },

  hide() {
    $('collectionOverlay').classList.add('hidden');
  },

  render() {
    const grid = $('collectionGrid');
    this.updateCount();

    grid.innerHTML = COLLECTION_DATA.map(item => {
      const isUnlocked = this.unlocked[item.id];
      return `
        <div class="collection-card ${isUnlocked ? 'unlocked' : 'locked'}" data-id="${item.id}">
          <div class="collection-card-img">
            ${isUnlocked
              ? `<img src="${item.image}" alt="${item.name}" />`
              : `<div class="locked-icon">🔒</div>`
            }
          </div>
          <div class="collection-card-name">${isUnlocked ? item.name : '???'}</div>
          <div class="collection-card-tag">${isUnlocked ? item.tag : '未解锁'}</div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.collection-card.unlocked').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        this.showDetail(id);
      });
    });
  },

  showDetail(id) {
    const item = COLLECTION_DATA.find(c => c.id === id);
    if (!item) return;

    // 创建详情弹窗
    let detailEl = $('collectionDetail');
    if (!detailEl) {
      detailEl = document.createElement('div');
      detailEl.id = 'collectionDetail';
      detailEl.className = 'collection-detail-overlay';
      detailEl.innerHTML = `
        <div class="collection-detail-panel">
          <button class="btn-small detail-close">关闭</button>
          <div class="detail-content"></div>
        </div>
      `;
      document.body.appendChild(detailEl);
      detailEl.addEventListener('click', (e) => {
        if (e.target === detailEl || e.target.classList.contains('detail-close')) {
          detailEl.style.display = 'none';
        }
      });
    }

    const content = detailEl.querySelector('.detail-content');
    content.innerHTML = `
      <img src="${item.image}" class="detail-image" alt="${item.name}" />
      <h3>${item.name}</h3>
      <div class="detail-meta">
        <span class="detail-tag">${item.tag}</span>
        <span class="detail-location">📍 ${item.location}</span>
      </div>
      <p class="detail-desc">${item.description}</p>
      <div class="detail-highlights">
        <h4>✨ 亮点</h4>
        <ul>${item.highlights.map(h => `<li>${h}</li>`).join('')}</ul>
      </div>
      <div class="detail-cultural">
        <h4>📚 文化小知识</h4>
        <p>${item.culturalNote}</p>
      </div>
    `;
    detailEl.style.display = 'flex';
  },
};

// ===== 设置系统 =====
const SettingsSystem = {
  defaults: {
    bgmVolume: 0.25,
    sfxVolume: 0.7,
    battleSpeed: 1,
    autoStory: true,
    autoBattle: false,
  },
  data: {},

  init() {
    // 读取存储
    try {
      const saved = localStorage.getItem('gmj_settings');
      if (saved) {
        this.data = { ...this.defaults, ...JSON.parse(saved) };
      } else {
        this.data = { ...this.defaults };
      }
    } catch (e) {
      this.data = { ...this.defaults };
    }

    // 应用设置
    AudioSystem.setBgmVolume(this.data.bgmVolume);
    AudioSystem.setSfxVolume(this.data.sfxVolume);

    // 更新UI
    $('settingBgmVolume').value = Math.round(this.data.bgmVolume * 100);
    $('settingBgmValue').textContent = Math.round(this.data.bgmVolume * 100) + '%';
    $('settingSfxVolume').value = Math.round(this.data.sfxVolume * 100);
    $('settingSfxValue').textContent = Math.round(this.data.sfxVolume * 100) + '%';
    $('settingBattleSpeed').value = this.data.battleSpeed;
    $('settingAutoStory').checked = this.data.autoStory;
    $('settingAutoBattle').checked = this.data.autoBattle;

    // 绑定事件
    $('settingBgmVolume').addEventListener('input', (e) => {
      const v = e.target.value / 100;
      this.data.bgmVolume = v;
      $('settingBgmValue').textContent = e.target.value + '%';
      AudioSystem.setBgmVolume(v);
      this.save();
    });

    $('settingSfxVolume').addEventListener('input', (e) => {
      const v = e.target.value / 100;
      this.data.sfxVolume = v;
      $('settingSfxValue').textContent = e.target.value + '%';
      AudioSystem.setSfxVolume(v);
      this.save();
      AudioSystem.playSfx('click');
    });

    $('settingBattleSpeed').addEventListener('change', (e) => {
      this.data.battleSpeed = parseFloat(e.target.value);
      this.save();
    });

    $('settingAutoStory').addEventListener('change', (e) => {
      this.data.autoStory = e.target.checked;
      this.save();
    });

    $('settingAutoBattle').addEventListener('change', (e) => {
      this.data.autoBattle = e.target.checked;
      this.save();
    });
  },

  save() {
    try {
      localStorage.setItem('gmj_settings', JSON.stringify(this.data));
    } catch (e) {}
  },

  show() {
    $('settingsOverlay').classList.remove('hidden');
  },

  hide() {
    $('settingsOverlay').classList.add('hidden');
  },
};

// ===== 聊天系统 =====
const ChatSystem = {
  messages: [],
  unread: 0,
  expanded: false,

  init() {
    // 折叠/展开
    $('chatToggle')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    // 发送消息
    $('chatSend')?.addEventListener('click', () => this.send());
    $('chatInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.send();
    });
  },

  toggle() {
    this.expanded = !this.expanded;
    const panel = $('chatPanel');
    if (this.expanded) {
      panel.classList.remove('collapsed');
      this.unread = 0;
      this.updateBadge();
    } else {
      panel.classList.add('collapsed');
    }
  },

  send() {
    const input = $('chatInput');
    const text = input.value.trim();
    if (!text) return;

    if (Game.soloMode) {
      // 单人模式：模拟聊天
      this.addMessage({
        id: Date.now(),
        pid: 'solo',
        name: Game.room?.players?.[0]?.name || '你',
        text,
        time: Date.now(),
      });
      input.value = '';
    } else if (Game.socket) {
      Game.socket.emit('chat', { text }, (res) => {
        if (res.ok) {
          input.value = '';
        } else {
          toast(res.error || '发送失败');
        }
      });
    }
  },

  addMessage(msg) {
    this.messages.push(msg);
    if (this.messages.length > 50) this.messages.shift();
    this.render();

    if (!this.expanded) {
      this.unread++;
      this.updateBadge();
    }
  },

  updateBadge() {
    const badge = $('chatBadge');
    if (!badge) return;
    if (this.unread > 0) {
      badge.style.display = '';
      badge.textContent = this.unread > 99 ? '99+' : this.unread;
    } else {
      badge.style.display = 'none';
    }
  },

  render() {
    const container = $('chatMessages');
    if (!container) return;

    container.innerHTML = this.messages.map(m => {
      const isMe = m.pid === Game.playerId || m.pid === 'solo';
      return `
        <div class="chat-msg ${isMe ? 'mine' : ''}">
          <span class="chat-name">${m.name}:</span>
          <span class="chat-text">${this.escapeHtml(m.text)}</span>
        </div>
      `;
    }).join('');

    container.scrollTop = container.scrollHeight;
  },

  escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  },

  clear() {
    this.messages = [];
    this.unread = 0;
    this.render();
    this.updateBadge();
  },
};

// ===== 初始化 =====
function init() {
  Game.init();
}

init();

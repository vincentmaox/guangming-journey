import { io } from 'socket.io-client';

const BASE_URL = process.env.SMOKE_URL || 'http://127.0.0.1:3000';
const smokeUrl = new URL(BASE_URL);
const socketPath = `${smokeUrl.pathname.replace(/\/$/, '')}/socket.io`;
const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error(`timeout ${ms}ms`)), ms));

function connect() {
  return Promise.race([
    new Promise((resolve, reject) => {
      const socket = io(smokeUrl.origin, { path: socketPath, transports: ['websocket'], forceNew: true, timeout: 5000 });
      socket.on('connect', () => resolve(socket));
      socket.on('connect_error', reject);
    }),
    timeout(6000)
  ]);
}

function emitAck(socket, event, payload) {
  return Promise.race([new Promise((resolve) => socket.emit(event, payload, resolve)), timeout(5000)]);
}

function createStateWatcher(socket) {
  let latestState = null;
  socket.on('state', (s) => { latestState = s; });
  return {
    getLatest: () => latestState,
    waitFor: async (predicate, ms = 15000) => {
      if (latestState && predicate(latestState)) return latestState;
      return Promise.race([new Promise((resolve) => {
        const handler = (state) => {
          if (predicate(state)) {
            socket.off('state', handler);
            resolve(state);
          }
        };
        socket.on('state', handler);
      }), timeout(ms)]);
    }
  };
}

const a = await connect();
const b = await connect();

const watcherA = createStateWatcher(a);
const watcherB = createStateWatcher(b);

try {
  // 房主创建房间
  const joinedA = await emitAck(a, 'createRoom', { name: '玩家A' });
  const roomCode = joinedA?.room?.code;
  const playerAId = joinedA?.playerId;
  if (!joinedA.ok || !roomCode) throw new Error('host create failed');
  console.log('✓ 房主创建房间:', roomCode);

  // 客人加入
  const joinedB = await emitAck(b, 'joinRoom', { name: '玩家B', code: roomCode });
  const playerBId = joinedB?.playerId;
  if (!joinedB.ok) throw new Error('guest join failed');
  console.log('✓ 客人加入房间');

  // 双方选择角色
  const selA = await emitAck(a, 'selectHero', { heroId: 'drli' });
  if (!selA.ok) throw new Error('host select hero failed');
  console.log('✓ 房主选择角色: 李博士');

  const selB = await emitAck(b, 'selectHero', { heroId: 'libao' });
  if (!selB.ok) throw new Error('guest select hero failed');
  console.log('✓ 客人选择角色: 荔宝');

  // 双方准备
  await emitAck(a, 'toggleReady');
  await emitAck(b, 'toggleReady');
  console.log('✓ 双方准备就绪');

  // 房主开始游戏
  const started = await emitAck(a, 'startGame');
  if (!started.ok) throw new Error('start game failed: ' + started.error);
  console.log('✓ 游戏开始，进入地图');

  // 等待进入地图
  await watcherA.waitFor((s) => s.phase === 'map');
  console.log('✓ 进入地图页面');

  // 房主选择第一关
  const battleStarted = await emitAck(a, 'selectLevel', { levelIndex: 0 });
  if (!battleStarted.ok) throw new Error('select level failed: ' + battleStarted.error);
  console.log('✓ 进入战斗: 虹桥公园');

  // 等待战斗初始化
  await watcherA.waitFor((s) => s.phase === 'battle' && s.battle != null);
  console.log('✓ 战斗初始化完成');

  // 执行战斗回合
  let actions = 0;
  while (actions < 30) {
    const state = await watcherA.waitFor((s) => {
      if (s.battle?.phase === 'result') return true;
      return s.battle?.pendingAction?.isPlayer === true;
    }, 20000);

    if (state.battle.phase === 'result') {
      console.log('✓ 战斗已结束');
      break;
    }

    const pending = state.battle.pendingAction;
    const socket = pending.ownerId === playerAId ? a : b;

    const enemies = state.battle.units.filter(u => !u.isPlayer && u.hp > 0);
    if (enemies.length === 0) break;
    const target = enemies[0];

    await emitAck(socket, 'battleAction', { type: 'attack', targetId: target.id });
    actions++;
    console.log(`✓ 行动 #${actions}: ${pending.unitId} 攻击 ${target.name}`);
  }

  // 等待战斗结果
  const finalState = await watcherA.waitFor((s) => s.battle?.phase === 'result');
  console.log('✓ 战斗结束:', finalState.battle.winner === 'player' ? '胜利' : '失败');

  // 返回地图
  await emitAck(a, 'nextLevel');
  await watcherA.waitFor((s) => s.phase === 'map');
  console.log('✓ 返回地图');

  console.log('\n=== Smoke Test 全部通过 ===');
  console.log(JSON.stringify({ ok: true, room: roomCode, winner: finalState.battle.winner }));

} catch (err) {
  console.error('Smoke test failed:', err.message);
  process.exit(1);
} finally {
  a.close();
  b.close();
}

// Auto-generated - game data with auto path detection
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
  window.__GAME_HEROES__ = [{"id":"libao","name":"荔宝","role":"影侠","element":"wood","img":"assets/characters/libao-front.png","ipHero":true,"hp":80,"mp":90,"atk":52,"def":14,"spd":36,"skills":[{"name":"📸 瞬间快门","mp":22,"type":"dmg","multiplier":2.2,"target":"single","desc":"按下快门精准捕捉敌人破绽，对单个敌人造成220%伤害","anim":"throwing_star"},{"name":"🍒 荔影快门雨","mp":32,"type":"dmg","multiplier":1.4,"critBonus":0.2,"target":"allEnemy","desc":"连续快门抓拍漫天荔影，全体敌人140%伤害且暴击率+20%","anim":"lychee_rain"},{"name":"✨ 高光时刻","mp":28,"type":"dmg","multiplier":1.8,"critBonus":0.35,"target":"single","desc":"捕捉战斗最佳高光瞬间，180%伤害且暴击率+35%","anim":"critical_hit"}],"ultimate":{"name":"🌟 千荔追光","mp":0,"type":"dmg","multiplier":5,"target":"single","desc":"【必杀】文旅小使者荔宝的追光一击，对单个敌人造成500%致命伤害（必定暴击）","anim":"shadow_assassin","alwaysCrit":true}},{"id":"drli","name":"李博士","role":"法师","element":"metal","img":"assets/characters/pixel-drli.jpg","ipHero":false,"hp":85,"mp":130,"atk":45,"def":14,"spd":20,"skills":[{"name":"⚗️ 科学爆破","mp":25,"type":"dmg","multiplier":2,"target":"single","desc":"调配化学药剂引爆，对单个敌人造成200%法术伤害","anim":"explosion"},{"name":"💥 链式反应","mp":35,"type":"dmg","multiplier":1.6,"target":"allEnemy","desc":"引发连锁化学反应，对全体敌人造成160%法术伤害","anim":"chain_reaction"},{"name":"🔬 数据分析","mp":20,"type":"buff","buff":"atkUp","stat":"atk","value":0.25,"turns":3,"target":"all","desc":"分析敌人弱点，全队攻击力+25%持续3回合","anim":"buff_up"}],"ultimate":{"name":"☢️ 核裂变风暴","mp":0,"type":"dmg","multiplier":3.5,"target":"allEnemy","desc":"【必杀】释放核裂变能量，对全体敌人造成350%毁灭伤害并降低防御","anim":"nuclear_burst","debuff":"defDown","stat":"def","value":0.4,"turns":2}},{"id":"tony","name":"Tony","role":"辅助","element":"metal","img":"assets/characters/pixel-tony.jpg","ipHero":false,"hp":95,"mp":110,"atk":22,"def":22,"spd":30,"skills":[{"name":"💻 代码病毒","mp":25,"type":"debuff","debuff":"defDown","stat":"def","value":0.35,"turns":3,"target":"allEnemy","desc":"入侵敌人系统，全体防御-35%持续3回合","anim":"virus"},{"name":"🌐 DDoS攻击","mp":30,"type":"dmg","multiplier":1.3,"target":"allEnemy","desc":"发起分布式拒绝服务攻击，对全体敌人造成130%伤害","anim":"ddos_attack"},{"name":"🔄 系统重启","mp":45,"type":"revive","heal":60,"target":"single","desc":"紧急重启倒下队友的核心程序，复活并恢复60HP","anim":"revive"}],"ultimate":{"name":"🤖 天网觉醒","mp":0,"type":"dmgBuff","multiplier":2.8,"target":"allEnemy","desc":"【必杀】觉醒天网AI，全体敌人受到280%伤害且全队攻击+50%","anim":"skynet_awaken","buff":"atkUp","stat":"atk","value":0.5,"turns":3}},{"id":"xiaoqi","name":"小琪","role":"治疗","element":"water","img":"assets/characters/pixel-xiaoqi.jpg","ipHero":false,"hp":80,"mp":140,"atk":18,"def":16,"spd":24,"skills":[{"name":"🌈 彩虹治愈","mp":28,"type":"heal","heal":80,"target":"single","desc":"召唤虹桥彩虹之力，为单体恢复80HP","anim":"rainbow_heal"},{"name":"🌊 水波荡漾","mp":32,"type":"dmg","multiplier":1.5,"target":"allEnemy","desc":"激起水波涟漪，对全体敌人造成150%水属性伤害","anim":"water_wave"},{"name":"⭐ 星光护盾","mp":35,"type":"buff","buff":"shield","value":1,"turns":3,"target":"all","desc":"化作星光护罩笼罩全队，3回合内各抵挡一次伤害","anim":"shield"}],"ultimate":{"name":"✨ 星辰奇迹","mp":0,"type":"healBuffAll","heal":999,"target":"all","desc":"【必杀】召唤星辰之力，全队满血复活/恢复并获得护盾和攻击增益","anim":"star_miracle","buff":"atkUp","stat":"atk","value":0.4,"turns":3,"shield":true}},{"id":"chenguang","name":"晨光","role":"战士","element":"water","img":"assets/characters/pixel-chenguang.jpg","ipHero":false,"hp":160,"mp":70,"atk":40,"def":38,"spd":14,"skills":[{"name":"🥛 鲜奶冲击","mp":22,"type":"dmgHeal","multiplier":1.5,"healSelf":35,"target":"single","desc":"投掷变质鲜奶炸弹，150%伤害并自愈35HP","anim":"milk_splash"},{"name":"🥛 鲜奶海啸","mp":38,"type":"dmgHeal","multiplier":1.3,"healSelf":20,"target":"allEnemy","desc":"倾倒大量变质鲜奶，全体敌人130%伤害且自愈20HP","anim":"milk_tsunami"},{"name":"🛡️ 坚韧守护","mp":28,"type":"buff","buff":"defUp","stat":"def","value":0.6,"turns":2,"target":"self","desc":"进入防御姿态，自身防御+60%持续2回合","anim":"defense_up"}],"ultimate":{"name":"🐄 光明牛王降临","mp":0,"type":"dmg","multiplier":4,"target":"single","desc":"【必杀】召唤光明牛王冲撞，对单个敌人造成400%毁灭性伤害","anim":"cow_king","stunChance":0.6,"stunTurns":1}},{"id":"laozhou","name":"老周","role":"坦克","element":"wood","img":"assets/characters/pixel-laozhou.jpg","ipHero":false,"hp":200,"mp":60,"atk":32,"def":45,"spd":10,"skills":[{"name":"🌾 农耕之力","mp":18,"type":"dmgDebuff","multiplier":1.4,"debuff":"atkDown","stat":"atk","value":0.25,"turns":3,"target":"single","desc":"挥舞锄头攻击并震慑敌人，140%伤害且敌人攻击-25%","anim":"earth_smash"},{"name":"🌋 大地震怒","mp":32,"type":"dmgDebuff","multiplier":1.2,"debuff":"spdDown","stat":"spd","value":0.3,"turns":2,"target":"allEnemy","desc":"猛踏大地引发地震，全体敌人120%伤害且速度-30%","anim":"earthquake"},{"name":"🧠 经验传授","mp":22,"type":"buff","buff":"spdUp","stat":"spd","value":0.3,"turns":3,"target":"all","desc":"传授光明农场生存经验，全队速度+30%持续3回合","anim":"speed_up"}],"ultimate":{"name":"🌳 万古长青","mp":0,"type":"buffDmg","multiplier":2,"target":"allEnemy","desc":"【必杀】化身参天古树，全体敌人200%伤害且全队防御+80%回血50HP","anim":"ancient_tree","buff":"defUp","stat":"def","value":0.8,"turns":3,"healAll":50}},{"id":"azhen","name":"阿珍","role":"增益","element":"fire","img":"assets/characters/pixel-azhen.jpg","ipHero":false,"hp":100,"mp":115,"atk":30,"def":24,"spd":18,"skills":[{"name":"🫕 乳鸽大餐","mp":35,"type":"healBuff","heal":50,"buff":"atkUp","stat":"atk","value":0.2,"turns":2,"target":"all","desc":"光明乳鸽香气四溢，全队恢复50HP且攻击+20%","anim":"food_feast"},{"name":"🔥 红烧地狱","mp":30,"type":"dmg","multiplier":1.7,"target":"allEnemy","desc":"召唤红烧烈焰，对全体敌人造成170%火属性伤害","anim":"inferno"},{"name":"🍰 美食诱惑","mp":22,"type":"debuff","debuff":"stun","chance":0.55,"turns":1,"target":"single","desc":"用烘焙美食引诱敌人，55%概率眩晕1回合","anim":"stun_sweet"}],"ultimate":{"name":"🦢 光明烧鹅·满汉全席","mp":0,"type":"healDmgBuff","heal":80,"multiplier":3,"target":"allEnemy","desc":"【必杀】端出满汉全席，全队回80HP+攻击+40%，全体敌人300%伤害","anim":"feast_ultimate","buff":"atkUp","stat":"atk","value":0.4,"turns":3}}];
  window.__GAME_LEVELS__ = [{"id":"hongqiao","name":"虹桥公园","index":0,"description":"穿越光明虹桥公园的红色空中栈道，击败捣乱的公园精灵。","background":"assets/backgrounds/level1-hongqiao.jpg","bgm":"hongqiao","reward":{"exp":50,"gold":30},"enemies":[{"id":"e1","name":"花叶精灵","type":"park-spirit","element":"wood","hp":60,"mp":30,"atk":18,"def":10,"spd":20,"img":"assets/enemies/pixel-park-spirit.jpg","skills":[{"name":"藤蔓缠绕","mp":15,"type":"debuff","debuff":"spdDown","value":0.3,"turns":2,"target":"single","desc":"降低目标速度30%","anim":"vine_bind"}]},{"id":"e2","name":"荆棘精灵","type":"park-spirit","element":"wood","hp":70,"mp":30,"atk":22,"def":12,"spd":16,"img":"assets/enemies/pixel-park-spirit.jpg","skills":[{"name":"荆棘突刺","mp":20,"type":"dmg","multiplier":1.5,"target":"single","desc":"造成150%物理伤害","anim":"thorn_strike"}]}]},{"id":"science","name":"科技馆","index":1,"description":"闯入光明科技馆，面对失控的科技守卫。","background":"assets/backgrounds/level2-museum.jpg","bgm":"science","reward":{"exp":80,"gold":50},"enemies":[{"id":"e1","name":"守卫机器人","type":"robot","element":"metal","hp":85,"mp":40,"atk":25,"def":22,"spd":14,"img":"assets/enemies/pixel-robot.jpg","skills":[{"name":"激光扫射","mp":20,"type":"dmg","multiplier":1.4,"target":"single","desc":"造成140%伤害","anim":"laser_beam"}]},{"id":"e2","name":"巡逻无人机","type":"robot","element":"metal","hp":50,"mp":50,"atk":28,"def":8,"spd":28,"img":"assets/enemies/pixel-robot.jpg","skills":[{"name":"电磁脉冲","mp":25,"type":"debuff","debuff":"atkDown","value":0.3,"turns":2,"target":"allEnemy","desc":"降低全体敌人攻击力30%","anim":"emp_pulse"}]},{"id":"e3","name":"核心守卫","type":"robot","element":"metal","hp":95,"mp":40,"atk":27,"def":20,"spd":12,"img":"assets/enemies/pixel-robot.jpg","skills":[{"name":"护盾激活","mp":30,"type":"buff","buff":"defUp","value":0.4,"turns":3,"target":"self","desc":"防御+40%持续3回合","anim":"shield_up"}]}]},{"id":"artgallery","name":"光明文化艺术中心","index":2,"description":"白色拱门中的画作活了过来，击败墨怪守护艺术殿堂。","background":"assets/backgrounds/level3-artgallery.jpg","bgm":"artgallery","reward":{"exp":100,"gold":60},"enemies":[{"id":"e1","name":"墨怪·山水","type":"ink-monster","element":"water","hp":105,"mp":60,"atk":32,"def":16,"spd":18,"img":"assets/enemies/pixel-ink-monster.jpg","skills":[{"name":"墨瀑倾泻","mp":25,"type":"dmg","multiplier":1.6,"target":"single","desc":"造成160%法术伤害","anim":"ink_splash"}]},{"id":"e2","name":"墨怪·花鸟","type":"ink-monster","element":"water","hp":90,"mp":60,"atk":28,"def":14,"spd":22,"img":"assets/enemies/pixel-ink-monster.jpg","skills":[{"name":"幻墨迷阵","mp":30,"type":"debuff","debuff":"stun","chance":0.4,"turns":1,"target":"single","desc":"40%概率眩晕目标1回合","anim":"ink_confuse"}]}]},{"id":"pavilion","name":"回归亭","index":3,"description":"攀登回归亭，面对守护历史的石狮子与古守卫。","background":"assets/backgrounds/level4-pavilion.jpg","bgm":"pavilion","reward":{"exp":130,"gold":80},"enemies":[{"id":"e1","name":"石狮守卫","type":"stone-lion","element":"earth","hp":120,"mp":30,"atk":35,"def":32,"spd":10,"img":"assets/enemies/pixel-stone-lion.jpg","skills":[{"name":"碎石践踏","mp":20,"type":"dmg","multiplier":1.3,"target":"single","desc":"造成130%伤害","anim":"rock_smash"}]},{"id":"e2","name":"亭灵","type":"stone-lion","element":"earth","hp":90,"mp":80,"atk":28,"def":18,"spd":20,"img":"assets/enemies/pixel-stone-lion.jpg","skills":[{"name":"石化凝视","mp":25,"type":"debuff","debuff":"stun","chance":0.35,"turns":1,"target":"single","desc":"35%概率眩晕目标","anim":"stone_gaze"}]},{"id":"e3","name":"古守卫","type":"boss","element":"earth","hp":200,"mp":60,"atk":30,"def":30,"spd":12,"img":"assets/enemies/pixel-stone-lion.jpg","skills":[{"name":"岩壁守护","mp":25,"type":"buff","buff":"defUp","value":0.5,"turns":2,"target":"self","desc":"自身防御+50%","anim":"wall_stone"},{"name":"碎石冲击","mp":20,"type":"dmg","multiplier":1.6,"target":"single","desc":"造成160%伤害","anim":"rock_smash"}],"phases":[{"threshold":0.5,"name":"古守卫·觉醒","atkMult":1.3,"defMult":1.2,"spdBonus":5,"appearance":"phase2","announce":"古守卫觉醒了！防御力大幅提升！","color":"#c9a66b","heal":30,"clearDebuffs":true,"newSkills":[{"name":"落石阵","mp":35,"type":"dmg","multiplier":1.2,"target":"allEnemy","desc":"召唤落石对全体敌人造成120%伤害","anim":"rock_smash"}]}]}]},{"id":"qiaoyuan","name":"光明侨院","index":4,"description":"最终决战！击败侨院之主，完成光明攻略！","background":"assets/backgrounds/level5-qiaoyuan.jpg","bgm":"boss","reward":{"exp":300,"gold":200},"enemies":[{"id":"e1","name":"侨院之主","type":"boss","element":"earth","hp":450,"mp":160,"atk":48,"def":30,"spd":16,"img":"assets/enemies/pixel-boss-qiaoyuan.jpg","skills":[{"name":"先祖之怒","mp":40,"type":"dmg","multiplier":2,"target":"single","desc":"造成200%伤害","anim":"ancestor_wrath"},{"name":"召唤先灵","mp":50,"type":"heal","heal":80,"target":"self","desc":"恢复80HP","anim":"spirit_heal"},{"name":"禁锢令","mp":35,"type":"debuff","debuff":"stun","chance":0.5,"turns":1,"target":"single","desc":"50%概率眩晕目标","anim":"imprison"}],"phases":[{"threshold":0.5,"name":"侨院之主·真身","atkMult":1.4,"defMult":1.2,"spdBonus":4,"appearance":"phase2","announce":"侨院之主显现真身！力量暴涨！","color":"#ff6b6b","heal":50,"clearDebuffs":true,"newSkills":[{"name":"先祖之裁决","mp":50,"type":"dmg","multiplier":1.8,"target":"allEnemy","desc":"释放先祖裁决，对全体敌人造成180%伤害","anim":"ancestor_wrath"}]},{"threshold":0.25,"name":"侨院之主·归灵","atkMult":1.8,"defMult":1,"spdBonus":8,"appearance":"phase3","announce":"侨院之主进入归灵状态！狂暴攻击！","color":"#9b59b6","heal":80,"clearDebuffs":true,"newSkills":[{"name":"归灵·灭世","mp":60,"type":"dmg","multiplier":2.5,"target":"allEnemy","desc":"归灵绝技，对全体敌人造成250%毁灭伤害","anim":"ultimate_wrath"},{"name":"灵魂汲取","mp":40,"type":"dmgHeal","multiplier":1.5,"healSelf":40,"target":"single","desc":"吸取灵魂，造成150%伤害并恢复40HP","anim":"spirit_drain"}]}]}]}];
  // 工具函数：解析相对于游戏根路径的URL
  window.__GAME_RESOLVE__ = function(relativePath) {
    if (!relativePath) return relativePath;
    if (relativePath.indexOf('://') !== -1 || relativePath.indexOf('data:') === 0) return relativePath;
    if (relativePath.charAt(0) === '/') return relativePath;
    return basePath + relativePath;
  };
  console.log('[GameData] basePath:', basePath, 'socketPath:', socketPath);
})();
// ============================================================
// 光明西游·攻略记 — 主线剧情数据
// ============================================================
// 每章剧情分为：
//   preBattle: 战斗前对话（进入关卡时触发）
//   postBattle: 战斗胜利后对话
// ============================================================

// 剧情过场插图配置
const CUTSCENE_IMAGES = {
  prologue_start: 'assets/backgrounds/cutscene-prologue.jpg',      // 序章开场-彩虹虹桥
  prologue_meet: 'assets/backgrounds/cutscene-meet.jpg',           // 遇见小琪
  prologue_battle: 'assets/backgrounds/cutscene-battle.jpg',       // 初次战斗
  level0_pre: 'assets/backgrounds/cutscene-prologue.jpg',          // 虹桥战前
  level0_post: 'assets/backgrounds/cutscene-meet.jpg',             // 虹桥战后
  level1_pre: 'assets/backgrounds/cutscene-science.jpg',           // 科技馆战前
  level1_post: 'assets/backgrounds/cutscene-science.jpg',          // 科技馆战后
  level2_pre: 'assets/backgrounds/cutscene-art.jpg',               // 美术馆战前
  level2_post: 'assets/backgrounds/cutscene-art.jpg',              // 美术馆战后
  level3_pre: 'assets/backgrounds/cutscene-pavilion.jpg',          // 回归亭战前
  level3_post: 'assets/backgrounds/cutscene-pavilion.jpg',         // 回归亭战后
  level4_pre: 'assets/backgrounds/cutscene-qiaoyuan.jpg',          // 侨院战前
  level4_boss: 'assets/backgrounds/cutscene-shadow.jpg',           // 遗忘之影BOSS
  victory: 'assets/backgrounds/cutscene-victory.jpg',              // 胜利结局
};

const STORY_DATA = {
  // ========== 序章：穿越 ==========
  prologue: [
    { speaker: 'narrator', text: '你拿着一张"光明区文旅攻略地图"，正走在虹桥公园的红色空中栈道上。', cutscene: 'prologue_start' },
    { speaker: 'narrator', text: '忽然，天空中出现一道奇异的彩虹光芒，将你整个人笼罩其中……' },
    { speaker: 'narrator', text: '等你回过神来，发现自己站在一片陌生的竹林中。空气中弥漫着淡淡的花香。' },
    { speaker: 'player', text: '这是……哪里？我明明在虹桥公园来着……' },
    { speaker: 'narrator', text: '这时，一位身着彩虹色衣裙的少女从竹林中走来，她的发间别着一朵虹桥形状的发饰。' },
    { speaker: 'xiaoqi', name: '小琪', text: '你终于来了！我是虹桥的守护者——小琪。我等你好久啦！', cutscene: 'prologue_meet' },
    { speaker: 'player', text: '虹桥守护者？这到底是怎么回事？' },
    { speaker: 'xiaoqi', name: '小琪', text: '这里是「光明幻境」——由光明区的文化记忆凝聚而成的世界。' },
    { speaker: 'xiaoqi', name: '小琪', text: '但是最近，「遗忘之影」开始侵蚀这个世界，景点的记忆正在消散……' },
    { speaker: 'xiaoqi', name: '小琪', text: '你是被「攻略地图」选中的人，只有你能帮助我们找回光明的记忆！' },
    { speaker: 'player', text: '（虽然不太明白……但听起来很重要的样子）好吧，我该怎么做？' },
    { speaker: 'xiaoqi', name: '小琪', text: '太好了！首先，你需要唤醒虹桥公园的记忆。现在公园里的精灵们都被遗忘之影控制了……' },
    { speaker: 'xiaoqi', name: '小琪', text: '我会和你一起战斗的！走吧，让我们重新点亮虹桥的光芒！', cutscene: 'prologue_battle' },
  ],

  // ========== 第1章：虹桥公园 ==========
  level_0: {
    preBattle: [
      { speaker: 'narrator', text: '你和小琪来到了虹桥幻境的入口。曾经绚烂的红色虹桥如今黯淡无光。', cutscene: 'level0_pre' },
      { speaker: 'xiaoqi', name: '小琪', text: '你看！花叶精灵们都被暗影感染了，变得凶巴巴的……' },
      { speaker: 'narrator', text: '几只通体发黑的花叶精灵从草丛中跳了出来，眼中闪烁着诡异的红光。' },
      { speaker: 'xiaoqi', name: '小琪', text: '小心！它们要攻过来了。别怕，看我的彩虹治愈术！' },
      { speaker: 'player', text: '好！我们一起战斗吧！' },
    ],
    postBattle: [
      { speaker: 'narrator', text: '随着最后一只精灵被净化，虹桥重新亮起了耀眼的红色光芒，如一条红丝带横跨天际。' },
      { speaker: 'xiaoqi', name: '小琪', text: '太棒了！虹桥恢复了！你看，多美啊——' },
      { speaker: 'narrator', text: '小琪轻轻一跃，虹桥的光芒在她身后形成一道绚丽的彩虹。' },
      { speaker: 'xiaoqi', name: '小琪', text: '谢谢你！我感觉自己充满了力量！接下来我们去哪里呢？' },
      { speaker: 'narrator', text: '你展开攻略地图，地图上虹桥公园的位置已经被点亮，旁边浮现出下一个目的地……' },
      { speaker: 'player', text: '下一站是……光明科技馆？听起来很厉害的样子！' },
    ]
  },

  // ========== 第2章：科技馆 ==========
  level_1: {
    preBattle: [
      { speaker: 'narrator', text: '你和小琪来到了科技幻境。巨大的玻璃幕墙内，各种高科技设备闪烁着冷光。', cutscene: 'level1_pre' },
      { speaker: 'xiaoqi', name: '小琪', text: '哇，这里是科技馆！我听说这里的守护者是一位超级厉害的科学家——李博士！' },
      { speaker: 'narrator', text: '忽然，警报声大作，几台守卫机器人挡住了你们的去路。' },
      { speaker: 'narrator', text: '机器人的电子眼闪烁着红光，显然也被遗忘之影感染了。' },
      { speaker: '???', text: '快退后！这些守卫已经失控了！' },
      { speaker: 'narrator', text: '一位穿着白大褂、戴着眼镜的年轻人从走廊另一端跑来，手中还拿着一个发光的平板。' },
      { speaker: 'liboshi', name: '李博士', text: '我是这里的守护者李博士。遗忘之影入侵了主系统，守卫们都被控制了……' },
      { speaker: 'liboshi', name: '李博士', text: '我正在想办法重启系统，但需要有人帮我挡住这些机器人！' },
      { speaker: 'player', text: '交给我们吧！小琪，上了！' },
      { speaker: 'xiaoqi', name: '小琪', text: '收到！李博士你快点，我们撑不了太久的～' },
    ],
    postBattle: [
      { speaker: 'narrator', text: '最后一台守卫机器人轰然倒下。与此同时，实验室的灯光也恢复了正常的蓝色。' },
      { speaker: 'liboshi', name: '李博士', text: '系统重启成功！太好了，科学之力重新上线！' },
      { speaker: 'liboshi', name: '李博士', text: '真是太感谢你们了。我叫李明，大家都叫我李博士。' },
      { speaker: 'liboshi', name: '李博士', text: '遗忘之影的事我已经分析过了——它正在从东向西蔓延，每吞噬一个景点，力量就会增强一分。' },
      { speaker: 'player', text: '那我们得赶紧去下一个地方！下一站是哪里？' },
      { speaker: 'liboshi', name: '李博士', text: '根据我的数据分析……下一个受影响的应该是美术馆。我和你们一起去吧！' },
      { speaker: 'xiaoqi', name: '小琪', text: '太好了！李博士加入我们的队伍啦！🎉' },
    ]
  },

  // ========== 第3章：美术馆 ==========
  level_2: {
    preBattle: [
      { speaker: 'narrator', text: '美术馆幻境中，一幅幅水墨画作悬挂在虚空中。然而，墨色正在变得浑浊发黑。', cutscene: 'level2_pre' },
      { speaker: 'liboshi', name: '李博士', text: '根据数据，这里的守护者是一位神秘的画师，能用画笔创造一切。' },
      { speaker: 'xiaoqi', name: '小琪', text: '哇，好厉害！用画画就能战斗吗？' },
      { speaker: 'narrator', text: '忽然，一幅山水画中涌出了漆黑的墨汁，化作了狰狞的墨怪。' },
      { speaker: '墨怪', text: '湮……灭……一切……归于虚无……' },
      { speaker: '???', text: '休想破坏我的画作！' },
      { speaker: 'narrator', text: '一道清丽的身影从画后跃出，手执一支巨大的画笔，笔尖闪耀着灵动的光芒。' },
      { speaker: 'mozhen', name: '墨珍', text: '我是美术馆的守护者墨珍。这些墨怪是被遗忘之影污染的画作……' },
      { speaker: 'mozhen', name: '墨珍', text: '我正在用烙画之术净化它们，但数量太多了！你们能帮我吗？' },
      { speaker: 'player', text: '没问题！我们一起上！' },
    ],
    postBattle: [
      { speaker: 'narrator', text: '最后一团墨怪在墨珍的画笔下化为了一朵清新的莲花，美术馆恢复了清雅的氛围。' },
      { speaker: 'mozhen', name: '墨珍', text: '谢谢你们。光明烙画是我们这里的非遗技艺，用温度在宣纸上烙出图案，最适合净化这些暗影了。' },
      { speaker: 'xiaoqi', name: '小琪', text: '哇，烙画！听起来好神奇，能教教我吗？' },
      { speaker: 'mozhen', name: '墨珍', text: '有机会一定。不过现在……我感觉西边有一股更古老的力量在呼唤我。' },
      { speaker: 'liboshi', name: '李博士', text: '西边……是迳口古村的方向。那是光明区最古老的村落，有七百年历史。' },
      { speaker: 'mozhen', name: '墨珍', text: '我必须去看看。遗忘之影如果吞噬了古村的记忆，后果不堪设想。' },
      { speaker: 'player', text: '那我们一起出发吧！目标——迳口古村！' },
    ]
  },

  // ========== 第4章：迳口古村 ==========
  level_3: {
    preBattle: [
      { speaker: 'narrator', text: '迳口古村幻境中，青瓦白墙的古村落静静矗立。然而，村中的一切都蒙上了一层灰色的尘埃。', cutscene: 'level3_pre' },
      { speaker: 'mozhen', name: '墨珍', text: '这里的气息……很古老。黄氏宗祠就在村子中央。' },
      { speaker: 'narrator', text: '你们走进村子，发现几尊古老的石狮正用空洞的眼睛盯着你们。' },
      { speaker: 'xiaoqi', name: '小琪', text: '这、这些石头狮子……怎么感觉在动？' },
      { speaker: 'narrator', text: '石狮猛地睁开了双眼，射出幽绿的光芒，从基座上跳了下来！' },
      { speaker: '???', text: '来者何人？竟敢擅闯迳口秘境！' },
      { speaker: 'narrator', text: '一位身着古装、白须飘飘的老人出现在宗祠门前，手中拄着一根雕刻精美的木杖。' },
      { speaker: 'laozhou', name: '老村长', text: '我是迳口古村的守护者——老周。你们是遗忘之影的爪牙吗？' },
      { speaker: 'player', text: '不，我们是来帮忙的！遗忘之影正在吞噬光明的记忆！' },
      { speaker: 'laozhou', name: '老村长', text: '哼，口说无凭。先过了我这几尊石狮守卫再说吧！' },
    ],
    postBattle: [
      { speaker: 'narrator', text: '石狮缓缓回归基座，眼中的幽光褪去。古村的灰霾渐渐散去，露出了原本青砖黛瓦的古朴样貌。' },
      { speaker: 'laozhou', name: '老村长', text: '……看来是老夫错怪你们了。你们身上确实有光明的气息。' },
      { speaker: 'laozhou', name: '老村长', text: '迳口建村七百余年，黄氏一族世代守护着这片土地。遗忘之影已经盯上了这里的古老记忆。' },
      { speaker: 'liboshi', name: '李博士', text: '老村长，您知道遗忘之影的源头在哪里吗？' },
      { speaker: 'laozhou', name: '老村长', text: '根据祖上的记载，光明之地的中心，是「公明墟」——也就是「公道光明」的起源之地。' },
      { speaker: 'laozhou', name: '老村长', text: '如果遗忘之影的力量继续增强，公明墟首当其冲。那里一旦失守，整个光明幻境都会崩塌。' },
      { speaker: 'mozhen', name: '墨珍', text: '那我们必须赶去公明墟！' },
      { speaker: 'laozhou', name: '老村长', text: '等等，让老夫也加入你们吧。七百年的守护经验，或许能派上用场。' },
      { speaker: 'player', text: '太好了，欢迎您加入，老村长！' },
    ]
  },

  // ========== 第5章（BOSS）：光明侨院 ==========
  level_4: {
    preBattle: [
      { speaker: 'narrator', text: '光明侨院幻境深处，一座巍峨的建筑矗立在云雾之中。这里是光明华侨文化的象征。', cutscene: 'level4_pre' },
      { speaker: 'laozhou', name: '老村长', text: '这里是光明侨院……无数海外游子的根。如果遗忘之影控制了这里，后果不堪设想。' },
      { speaker: 'narrator', text: '突然，一股强大的暗影从侨院深处涌出，化作了一个巨大的黑影。' },
      { speaker: '遗忘之影', text: '呵呵呵……你们来得正好。', cutscene: 'level4_boss' },
      { speaker: '遗忘之影', text: '很快，这里的一切都将被遗忘。没有人会记得光明，没有人会记得这段历史。' },
      { speaker: 'mozhen', name: '墨珍', text: '休想！我们不会让你得逞的！' },
      { speaker: '遗忘之影', text: '就凭你们？一群被遗忘的守护者和一个外来者？' },
      { speaker: 'player', text: '我们不是外来者。我们是光明的客人，也是光明的朋友。' },
      { speaker: 'player', text: '这里的每一处风景、每一段历史、每一种文化，都值得被记住！' },
      { speaker: 'xiaoqi', name: '小琪', text: '没错！我们会保护光明的记忆，永远永远！' },
      { speaker: '遗忘之影', text: '……愚蠢的人类。那就让我看看，你们有多少能耐吧！' },
    ],
    postBattle: [
      { speaker: 'narrator', text: '随着最后一击，巨大的黑影发出刺耳的尖叫，化作无数光点消散在空气中。' },
      { speaker: 'narrator', text: '阳光重新洒满了光明侨院，远处，虹桥的红光、科技馆的蓝光、美术馆的墨色、古村的炊烟……所有景点的光芒都亮了起来。', effect: 'mapLightUp' },
      { speaker: 'laozhou', name: '老村长', text: '我们……成功了。光明幻境……得救了。' },
      { speaker: 'mozhen', name: '墨珍', text: '每一处景点都恢复了，真是太好了……' },
      { speaker: 'liboshi', name: '李博士', text: '数据显示，遗忘之影的能量已经归零。短期内不会再出现了。' },
      { speaker: 'xiaoqi', name: '小琪', text: '都是因为有你！谢谢你，来自现实世界的朋友！' },
      { speaker: 'narrator', text: '你看着身边的伙伴们，心中涌起一股暖流。' },
      { speaker: 'player', text: '应该是我谢谢你们。让我看到了这么美的光明，了解了这么多故事。' },
      { speaker: 'player', text: '回到现实世界后，我一定要去每一个景点看看！' },
      { speaker: 'xiaoqi', name: '小琪', text: '一言为定！我们在光明等你哦——' },
      { speaker: 'narrator', text: '彩虹光芒再次笼罩了你。当你睁开眼睛，发现自己仍站在虹桥公园的红色栈道上，手里还攥着那张攻略地图。' },
      { speaker: 'narrator', text: '地图上，所有的景点都被点亮了。旁边多了一行小字：' },
      { speaker: 'narrator', text: '「光明，等你来发现。」' },
      { speaker: 'narrator', text: '—— 完 ——', cutscene: 'victory' },
    ]
  },
};

// 角色显示名映射
const STORY_CHARACTERS = {
  narrator: { name: '', color: '#8b93ad', isNarrator: true },
  player: { name: '你', color: '#ffb545' },
  xiaoqi: { name: '小琪', color: '#4fc3f7', heroId: 'xiaoqi' },
  liboshi: { name: '李博士', color: '#90caf9', heroId: 'drli' },
  mozhen: { name: '墨珍', color: '#ce93d8' },
  laozhou: { name: '老村长', color: '#a5d6a7', heroId: 'laozhou' },
  '???': { name: '???', color: '#e0e0e0' },
  '墨怪': { name: '墨怪', color: '#424242' },
  '遗忘之影': { name: '遗忘之影', color: '#e8506b' },
};

// ============================================================
// 景点图鉴数据
// ============================================================
const COLLECTION_DATA = [
  {
    id: 'hongqiao',
    name: '虹桥公园',
    levelIndex: 0,
    image: 'assets/backgrounds/level1-hongqiao.jpg',
    tag: '自然生态',
    location: '光明区光明街道',
    description: '虹桥公园是光明区最具代表性的网红打卡地，拥有全长4公里的红色空中栈道，宛如一条"红丝带"横跨山林水库之间。',
    highlights: [
      '4公里红色空中栈道，深圳最长的空中步道之一',
      '西起光明新城公园，东至大顶岭山林公园',
      '沿途可俯瞰光明湖、大顶岭水库美景',
      '2020年建成后迅速成为深圳热门打卡地'
    ],
    culturalNote: '虹桥不仅是一条生态步道，更是光明区"绿水青山就是金山银山"发展理念的生动体现。红色象征着光明人民的热情与活力。'
  },
  {
    id: 'kejiguan',
    name: '光明科技馆',
    levelIndex: 1,
    image: 'assets/backgrounds/level2-museum.jpg',
    tag: '科技科普',
    location: '光明科学城',
    description: '光明科技馆坐落在光明科学城核心区域，是深圳重要的科普教育基地，展示了前沿科技成果和科学原理。',
    highlights: [
      '光明科学城是深圳建设综合性国家科学中心的核心承载区',
      '集聚了大科学装置、科研平台、高等院校',
      '科技馆集科普教育、科技展示、互动体验于一体',
      '是青少年科学启蒙的重要场所'
    ],
    culturalNote: '光明科学城代表着深圳的科技创新力量。从传统农业区到科学新城，光明区正在实现跨越式发展。'
  },
  {
    id: 'meishuguan',
    name: '光明文化艺术中心',
    levelIndex: 2,
    image: 'assets/backgrounds/level3-artgallery.jpg',
    tag: '文化艺术',
    location: '光明文化艺术中心',
    description: '光明文化艺术中心是光明区文化新地标，其白色拱门造型宛如"光明之眼"，前方水池倒影令人印象深刻，常年举办各类美术展览和艺术活动。',
    highlights: [
      '光明文化艺术中心是光明区文化新地标',
      '集美术馆、图书馆、演艺中心于一体',
      '光明烙画是区级非物质文化遗产',
      '常年举办书画展览、艺术沙龙等活动'
    ],
    culturalNote: '光明烙画是区级非遗项目，用烙铁在宣纸、木板上作画，温度控制决定颜色深浅，被誉为"火针刺绣"。'
  },
  {
    id: 'huiting',
    name: '回归亭',
    levelIndex: 3,
    image: 'assets/backgrounds/level4-pavilion.jpg',
    tag: '历史人文',
    location: '红花山公园',
    description: '回归亭位于红花山公园山顶，是为纪念香港回归而建，登亭可俯瞰公明街道全景。',
    highlights: [
      '红花山公园地处公明街道中心',
      '山顶红花山阁（回归亭）是公明地标',
      '山体不高，台阶平缓，适合家庭徒步',
      '夜晚灯光璀璨，是市民休闲健身的好去处'
    ],
    culturalNote: '公明街道历史悠久，"公明"二字取自"公道光明"之意，源于1929年三大家族共建的"公明墟"。'
  },
  {
    id: 'qiaoyuan',
    name: '光明侨院',
    levelIndex: 4,
    image: 'assets/backgrounds/level5-qiaoyuan.jpg',
    tag: '华侨文化',
    location: '光明区',
    description: '光明侨院是光明华侨文化的象征，见证了光明华侨农场的历史变迁和侨乡文化的深厚底蕴。',
    highlights: [
      '光明区是深圳著名的侨乡，拥有丰富的华侨资源',
      '光明华侨农场建于1958年，曾安置大批归国华侨',
      '侨院建筑融合了岭南风格与南洋风情',
      '乳鸽、甜玉米等"光明三宝"与华侨农场渊源深厚'
    ],
    culturalNote: '光明乳鸽是深圳市级非物质文化遗产，皮脆肉嫩、鲜香味美。其制作技艺由归国华侨带回，在光明发扬光大。'
  }
];

// ============================================================
// 通关纪念品（光明文旅特色文创）
// ============================================================
const SOUVENIR_DATA = [
  {
    levelIndex: 0,
    name: '虹运书签',
    icon: '🔖',
    rarity: 'rare',
    description: '灵感源自虹桥公园4公里红色空中栈道的文创书签。红丝带造型象征"红运当头"，是光明区最受欢迎的打卡纪念品之一。',
    photoSpot: '虹桥公园·红色栈道中段',
    tag: '虹桥公园限定',
    buff: { type: 'hpBoost', value: 20, desc: '最大HP+20' }
  },
  {
    levelIndex: 1,
    name: '科学城徽章',
    icon: '🔬',
    rarity: 'rare',
    description: '光明科学城纪念徽章，以大科学装置为原型设计的科技感金属徽章。蓝色主色调代表科技创新与未来感。',
    photoSpot: '光明科学城展示中心',
    tag: '科学城限定',
    buff: { type: 'mpBoost', value: 15, desc: '最大MP+15' }
  },
  {
    levelIndex: 2,
    name: '烙画笔摆件',
    icon: '🎨',
    rarity: 'epic',
    description: '以光明非遗"烙画"技艺为灵感的文创摆件。火针刺绣的传统工艺在文创中焕发新生，每件都是独一无二的艺术品。',
    photoSpot: '光明文化艺术中心·烙画基地',
    tag: '非遗文创',
    buff: { type: 'atkBoost', value: 5, desc: '攻击力+5' }
  },
  {
    levelIndex: 3,
    name: '乡愁明信片',
    icon: '📮',
    rarity: 'rare',
    description: '印有回归亭与公明老墟风貌的怀旧明信片。盖上光明专属邮戳，寄给远方的亲友，寄托一份来自光明的温暖乡愁。',
    photoSpot: '红花山公园·回归亭',
    tag: '回归亭纪念',
    buff: { type: 'defBoost', value: 5, desc: '防御力+5' }
  },
  {
    levelIndex: 4,
    name: '光明乳鸽御守',
    icon: '🕊️',
    rarity: 'legendary',
    description: '以深圳非遗"光明乳鸽"为原型的开运御守。软糯可爱的鸽子造型寓意"鸽颂升平"，是光明侨院最珍贵的通关纪念。集齐五枚纪念品可解锁隐藏成就！',
    photoSpot: '光明侨院·骑楼老街',
    tag: '通关终极奖励',
    buff: { type: 'allBoost', value: 10, desc: '全属性+10' }
  }
];

const RARITY_COLORS = {
  common: { color: '#9e9e9e', glow: 'rgba(158,158,158,0.3)', label: '普通' },
  rare: { color: '#4d96ff', glow: 'rgba(77,150,255,0.4)', label: '稀有' },
  epic: { color: '#ce93d8', glow: 'rgba(206,147,216,0.4)', label: '史诗' },
  legendary: { color: '#ffb545', glow: 'rgba(255,181,69,0.5)', label: '传说' }
};

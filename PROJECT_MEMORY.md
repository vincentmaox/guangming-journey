# 项目对话记忆 - 光明西游·攻略记

> 本文件记录与用户的关键对话决策、技术选型和项目上下文，用于后续会话快速恢复上下文，避免每次对话"懵"的状态。

---

## 一、项目基础信息

- **项目名称**：光明西游·攻略记（GuangMing Journey）
- **项目类型**：网页回合制RPG游戏（西游校园题材）
- **技术栈**：Node.js + Express 后端，原生HTML/CSS/JS前端（无框架）
- **项目路径**：`d:\01_Project\20260628-GuangMingGame\guangming-journey`
- **GitHub仓库**：已配置（origin/master）
- **运行方式**：`node server.js`，默认端口3000
- **打包脚本**：`node scripts/package-upload.mjs`，输出到 `dist-upload/guangming-journey-upload.zip`

---

## 二、关键文件结构

```
guangming-journey/
├── server.js              # Express服务器 + 静态文件服务 + 文件hash缓存
├── package.json           # 项目依赖（express等）
├── CHANGELOG.md           # 项目更新日志（V1→V13持续更新）
├── public/
│   ├── index.html         # 单页入口，按hash加载CSS/JS
│   ├── style.css          # 所有样式（含响应式、动画、战斗UI）
│   └── game.js            # 核心游戏逻辑（战斗、角色、技能、剧情）
├── data/                  # 游戏数据（角色、技能、怪物、地图等JSON）
├── scripts/
│   └── package-upload.mjs # 打包脚本（排除node_modules/.git/日志等）
└── dist-upload/           # 打包输出目录
```

---

## 三、核心游戏系统状态

### V13 P3复赛冲刺版本（当前基线）
- **7位可玩角色**：李博士、林学长、小琪、牛老板、周教授、阿珍、荔枝侠，各有专属技能
- **战斗系统**：
  - 基础：攻击/防御/技能/道具四操作
  - 动画：伤害飘字、冲刺动画、受击闪白、技能特效、Combo连击、暴击震屏、击杀灰化
  - 机制：闪避(spd差)、暴击、元素克制、Buff/Debuff(含回合数显示)、HP平滑过渡
  - 速度：1x/1.5x/2x/3x四档，localStorage记忆，动画时序随速度缩放
  - 怒气系统：0-100，造成伤害+15/受击+10/击杀+20，满怒必杀按钮，7个角色专属全屏必杀技
  - AoE群攻：target:'allEnemy'，聚气→冲击波→全体受击，6色元素特效
  - Boss多阶段：threshold触发变身，连跳支持，光环+光柱+震动+属性提升+新技能+外观变化
- **剧情/探索**：校园地图探索、NPC对话、多章回剧情
- **UI系统**：
  - 战斗操作区两行布局（攻击+防御+技能 / 必杀+道具）
  - 彩色渐变按钮（红攻/蓝防/紫技/金必杀/绿青道具）
  - 三层按钮结构：图标+文字+消耗数字
  - HP低血量警告（橙<30%/红脉动<15%）
  - 行动方金色边框高亮
  - 手机端目标选中金色脉动
  - 聊天面板在顶部导航栏💬按钮，可折叠
- **缓存机制**：server.js自动计算CSS/JS的SHA256 hash，URL附加?v=hash防缓存

---

## 四、关键设计决策记录

### 1. 前端无框架选型
- **决策**：使用原生HTML/CSS/JS，不引入React/Vue等框架
- **原因**：游戏页面重动画和DOM操作，原生性能更好；打包体积小，上传方便；复赛评审环境兼容性要求高

### 2. 战斗按钮配色方案（2026-07-03最终确定）
| 按钮类型 | 渐变色 | 含义 |
|---------|--------|------|
| 攻击 | #ff6b6b→#c0392b 红 | 进攻/伤害 |
| 防御 | #5dade2→#2471a3 蓝 | 防御/减伤 |
| 技能 | #7d3cff→#4a1fb8 紫 | 魔法/技能 |
| 必杀 | #f1c40f→#d35400 金橙 | 满怒大招 |
| 生命药水 | #27ae60→#1e8449 绿 | 回血 |
| 法力药水 | #00bcd4→#00838f 青 | 回蓝 |
- **三层结构**：`.btn-icon`(emoji图标) + `.btn-text`(文字) + `.btn-cost`(消耗/数量)

### 3. 战斗操作区两行布局（2026-07-03最终确定）
- 第一行（基础操作）：攻击 + 防御 + 技能按钮组（技能flex:1自适应）
- 第二行（特殊操作）：必杀技（满怒时显示）+ 道具组
- 无必杀时第二行仅道具，居中展示
- 响应式断点：<520px超小屏压缩，521-767px手机，768px+桌面

### 4. 缓存策略
- server.js启动时读取CSS/JS文件计算SHA256 hash
- index.html通过模板变量注入hash：`style.css?v=xxxx`、`game.js?v=xxxx`
- 每次重启服务器自动更新hash，无需手动清缓存
- 注意：修改CSS/JS后必须重启node server.js才能让客户端看到更新

### 5. 打包排除策略
- 排除：`node_modules/`、`.git/`、`.playwright-cli/`、`output/`、`dist-upload/`、日志文件、zip文件
- 包含：所有运行时必要文件（server.js、package.json、public/、data/等）
- 输出：`dist-upload/guangming-journey-upload.zip`

---

## 五、常见问题与解决方案

### Q1: 修改CSS/JS后浏览器看不到更新？
**A**：必须重启node服务器（Ctrl+C停止，再`node server.js`），因为hash在启动时计算。或手动在URL后加`?v=时间戳`绕过缓存。

### Q2: 战斗按钮在手机上挤在一起？
**A**：检查`.action-row`和`.action-group`的flex布局，技能按钮应设`flex:1; min-width:0`，攻击/防御固定`min-width:70px`。

### Q3: 打包后缺少文件？
**A**：检查`scripts/package-upload.mjs`的EXCLUDED_DIRS是否误排除；打包后用`ls dist-upload`看zip内容。

### Q4: git push失败？
**A**：先`git pull --rebase`再push；若有冲突解决后`git add . && git rebase --continue`。

### Q5: 服务器启动端口被占？
**A**：server.js中修改PORT常量，或设置环境变量`set PORT=3001 && node server.js`。

---

## 六、对话历史关键节点

| 日期 | 事件 | 关键产出 |
|------|------|---------|
| 2026-06-28 | 项目初始化 | V1基础框架搭建 |
| 2026-07-02 | P0-P2战斗动画 | V12-base基线，Combo/暴击/震屏/手机端 |
| 2026-07-02 | P3-Day1 | 闪避/Buff回合/HP平滑/3倍速 |
| 2026-07-02 | P3-Day2 | 怒气必杀/AoE群攻/Boss多阶段 |
| 2026-07-03 | P3-Day3 UI优化 | 修复白字白底/文字溢出/按钮拥挤，彩色渐变+两行布局+响应式 |
| 2026-07-03 | 打包上传准备 | 更新CHANGELOG、git提交推送、打包upload.zip |

---

## 七、用户偏好与沟通习惯

- **语言**：中文沟通，技术术语可混用英文
- **响应风格**：喜欢直接、不啰嗦，做完再汇报；不需要每次解释用了什么工具
- **关注点**：
  - UI美观度（尤其战斗界面）
  - 手机端+电脑端双端适配
  - 游戏体验流畅度
  - 版本可打包上传
- **常见指令模式**：
  - "优化XX界面" → 需要分析当前问题→修改CSS/JS→测试→汇报
  - "打包版本" → 执行package-upload.mjs→验证zip完整性
  - "提交git" → git add→commit→push→确认远程更新
- **不满点**：每次会话开始"懵"、忘记之前的决策 → 通过本记忆文件解决

---

## 八、待办与后续方向

- [ ] 复赛提交前最终测试（多浏览器、多设备）
- [ ] 游戏平衡性微调（数值、技能CD、Boss难度）
- [ ] 音效/BGM系统（当前无音效）
- [ ] 存档/读档持久化（当前localStorage基础存档）
- [ ] 更多剧情章节（当前至终章Boss侨院之主）

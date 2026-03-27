# Selge - Life RPG 网站

## 📖 项目概述

Selge 是一个 **Life RPG 网站**，将人生的每一次经历游戏化。记录读书、电影、散步、指弹等历险，获得经验值和金币，用金币在商店兑换现实中的美好。

**核心理念**：打破循环，锻造自己。每一次历险都是对自己的投资，每一个成就都是对生活的见证。

---

## 🏗️ 项目结构

```
/Users/florian/Documents/Selge/
├── dist/                          # 构建产物（生产环境）
│   ├── index.html                 # 入口 HTML
│   └── assets/
│       ├── index-*.css            # 编译后的样式
│       └── index-*.js             # 编译后的脚本
├── src/
│   ├── main.js                    # Vue 应用入口
│   ├── App.vue                    # 主组件（所有页面逻辑）
│   ├── constants.js               # 常量和对话框 HTML 模板
│   ├── stores/
│   │   └── store.js               # 状态管理（Pinia/reactive）
│   └── styles/
│       └── main.css               # 全部样式（CSS 变量 + 响应式）
├── index.html                     # 开发环境入口
├── package.json                   # 项目配置（版本 0.2.0）
├── vite.config.js                 # Vite 构建配置
└── README.md                       # 本文档
```

---

## 🎨 设计系统

### 配色方案（豆瓣橄榄绿主题）

```css
/* 主色系 */
--g5: #3d6b30    /* 深绿（主题色） */
--g4: #5c8a4a    /* 中绿 */
--g3: #9aba8a    /* 浅绿 */
--g2: #d4e4cc    /* 更浅绿 */
--g1: #f0f4ee    /* 最浅绿 */

/* 背景色 */
--bg:  #f7f6f3   /* 主背景 */
--bg2: #efede8   /* 次背景 */
--bg3: #e5e2db   /* 三级背景 */
--sur: #fff      /* 卡片背景 */

/* 边框色 */
--bd:  #dedad3   /* 主边框 */
--bd2: #ccc8bf   /* 次边框 */

/* 文字色 */
--t1: #1a1916    /* 主文字 */
--t2: #4a4840    /* 次文字 */
--t3: #8a8780    /* 辅助文字 */
--t4: #b8b5ae    /* 弱文字 */

/* 热力图色阶 */
--h0: #eae8e3    /* 无 */
--h1: #c8dbbf    /* 少 */
--h2: #9aba8a    /* 中 */
--h3: #5c8a4a    /* 多 */
--h4: #3d6b30    /* 很多 */
```

### 字体系统

```css
/* 标题字体 */
font-family: 'Noto Serif SC', serif;
font-size: 26px;
font-weight: 700;

/* 正文字体 */
font-family: 'Noto Sans SC', sans-serif;
font-size: 14px;
font-weight: 400;

/* 数据字体 */
font-family: 'JetBrains Mono', monospace;
font-size: 12px;
font-weight: 500;
```

### 主题支持

- **自适应**（`data-theme="auto"`）：跟随系统设置
- **浅色**（`data-theme="light"`）：明亮模式
- **深色**（`data-theme="dark"`）：暗黑模式

---

## 📱 页面结构

### 1. 角色页面（Character）

**路由**：`currentPage === 'character'`

**主要组件**：
- **角色横幅**：背景图 + 角色名 + 等级徽章
- **每日一句**：随机名言 + 查看往期功能
- **经验条**：
  - 左：等级（Lv.X）+ 等级名称
  - 右：金币（💰）+ 储蓄（¥）
  - 下：经验进度条
- **关注的历险类型**：网格卡片展示（已固定的类型）
- **热力图**：6月/3月/1月/1年视图，显示历险频率
- **最近动态**：最近 10 条历险记录

**关键数据**：
```javascript
state.hero = {
  name: '角色名',
  xp: 1000,           // 经验值
  coin: 500,          // 游戏金币
  realMoney: 1000,    // 现实储蓄（¥）
  bannerImg: null,    // 横幅背景图
}
```

---

### 2. 历险页面（Adventure）

**路由**：`currentPage === 'adventure'`

**主要组件**：
- **添加栏**：
  - 输入框：历险名称（最长 60 字）
  - 下拉框：选择历险类型（显示 emoji + 名称 + XP 范围）
  - 按钮：记录
- **历险列表**：显示最近 50 条记录，包括：
  - 类型徽章（emoji + 名称）
  - 历险标题
  - 日期 + 获得 XP

**关键数据**：
```javascript
state.adventures = [
  {
    id: 'uuid',
    title: '读完《活出生命的意义》',
    typeId: 'at1',      // 历险类型 ID
    xp: 35,             // 获得的 XP
    date: '2026-03-27',
  }
]

state.advTypes = [
  {
    id: 'at1',
    emoji: '📚',
    name: '读书',
    xpMin: 30,
    xpMax: 40,
    pinned: true,       // 是否在角色页显示
  }
]
```

---

### 3. 随笔页面（Essays）

**路由**：`currentPage === 'essays'`

**主要组件**：
- **左侧时间线**：
  - 显示所有随笔日期 + 标题
  - 支持草稿（✏️）和已提交状态
  - 点击选中
- **右侧编辑/查看区**：
  - **编辑模式**（未提交）：
    - 标题输入框
    - 心情选择（6 个 emoji）
    - Markdown 编辑器
    - 字数统计
    - 删除/提交按钮
  - **查看模式**（已提交）：
    - 标题 + 元数据（心情、日期、字数）
    - Markdown 渲染内容

**关键数据**：
```javascript
state.essays = [
  {
    id: 'uuid',
    title: '今天的思考',
    content: '# Markdown 内容',
    mood: '😊',
    date: '2026-03-27',
    submitted: true,    // 是否已提交
    tags: ['生活', '思考'],
  }
]

MOODS = ['😊', '😔', '😤', '😴', '😍', '🤔']
```

---

### 4. 成就页面（Achievements）

**路由**：`currentPage === 'achievements'`

**主要组件**：
- **统计卡片**：总成就数、已解锁、完成度、最近解锁
- **筛选标签**：全部、已解锁、未解锁
- **成就网格**：
  - 图标 + 名称 + 描述
  - 进度条（如果有进度）
  - 解锁日期
  - 闪光动画（解锁时）

**关键数据**：
```javascript
ACHIEVEMENTS = [
  {
    id: 'ach1',
    name: '初出茅庐',
    desc: '完成第一次历险',
    icon: '🎯',
    condition: (state) => state.adventures.length >= 1,
    progress: (state) => state.adventures.length,
    target: 1,
  }
]

state.unlockedAchievements = {
  'ach1': '2026-03-20'  // 解锁日期
}
```

---

### 5. 商店页面（Shop）

**路由**：`currentPage === 'shop'`

**主要组件**：
- **商品网格**：
  - 图标 + 名称 + 价格（金币）+ 现实价格
  - 购买按钮（已购买时禁用）
  - Hover 效果
- **账户明细**：
  - 显示所有购买记录
  - 日期 + 商品名 + 价格

**关键数据**：
```javascript
COIN_ITEMS = [
  {
    id: 'item1',
    name: '一杯咖啡',
    icon: '☕',
    price: 100,         // 游戏金币
    realPrice: '¥30',   // 现实价格
  }
]

state.hero.purchases = [
  {
    itemId: 'item1',
    date: '2026-03-20',
    price: 100,
  }
]
```

---

### 6. 设置页面（Settings）

**路由**：`currentPage === 'settings'`

**主要组件**：
- **个人信息**：
  - 角色名（最长 20 字）
  - 储蓄金额（¥）
  - 保存按钮
- **外观设置**：
  - 主题选择（自适应/浅色/深色）
- **历险类型管理**：
  - 列表显示所有类型
  - 展示/隐藏按钮（固定到角色页）
  - 添加新类型表单
- **数据管理**：
  - 导出：JSON / Markdown / ZIP
  - 导入：JSON 或 Markdown 文件

**导出格式**：
- **JSON**：完整数据结构
- **Markdown**：每篇随笔一个文件，包含 YAML frontmatter
- **ZIP**：JSON + 所有 Markdown 文件

---

## 🔧 核心功能实现

### 状态管理（`src/stores/store.js`）

使用 Vue 3 的 `reactive()` 管理全局状态：

```javascript
const state = reactive({
  hero: { /* 角色数据 */ },
  adventures: [ /* 历险记录 */ ],
  essays: [ /* 随笔 */ ],
  advTypes: [ /* 历险类型 */ ],
  unlockedAchievements: { /* 成就 */ },
  theme: 'auto',
})

// 数据持久化
function save() {
  localStorage.setItem('liferpg_v5', JSON.stringify(state))
}

function load() {
  const data = localStorage.getItem('liferpg_v5')
  if (data) Object.assign(state, JSON.parse(data))
}
```

### 经验系统

```javascript
// 等级表（每级所需 XP）
XP_TABLE = [0, 100, 250, 450, 700, 1000, ...]

// 获取当前等级
function getLevel(xp) {
  return XP_TABLE.findIndex(x => xp < x)
}

// 等级名称
const levelTitles = ['新手', '学徒', '骑士', '勇士', ...]
```

### 自定义下拉框

**HTML 结构**：
```html
<div class="custom-select">
  <button class="custom-select-btn" :class="{ open: isOpen }">
    <span>选中项</span>
  </button>
  <div class="custom-select-menu" :class="{ open: isOpen }">
    <div class="custom-select-item">选项 1</div>
    <div class="custom-select-item">选项 2</div>
  </div>
</div>
```

**JavaScript 动态宽度**：
```javascript
function toggleDropdown() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    setTimeout(() => {
      const btn = document.querySelector('.custom-select-btn')
      const menu = document.querySelector('.custom-select-menu')
      if (btn && menu) menu.style.width = btn.offsetWidth + 'px'
    }, 0)
  }
}
```

**CSS 样式**：
```css
.custom-select-btn {
  background: var(--sur2);
  border: 1px solid var(--bd);
  padding: 8px 32px 8px 12px;
  height: 36px;
  background-image: url("...arrow.svg");
  background-position: right 10px center;
}

.custom-select-menu {
  position: absolute;
  top: 100%;
  left: 0;
  background: var(--sur);
  border: 1px solid var(--bd);
  max-height: 200px;
  overflow-y: auto;
}
```

---

## 🎯 常见修改指南

### 修改配色

编辑 `src/styles/main.css` 的 `:root` 变量：

```css
:root {
  --g5: #3d6b30;    /* 改这里改主题色 */
  --g4: #5c8a4a;
  /* ... 其他颜色 */
}
```

### 添加新的历险类型

在 `src/stores/store.js` 的初始化中添加：

```javascript
state.advTypes.push({
  id: 'at_new',
  emoji: '🎬',
  name: '看电影',
  xpMin: 20,
  xpMax: 30,
  pinned: false,
})
```

### 修改等级系统

编辑 `src/stores/store.js` 的 `XP_TABLE`：

```javascript
XP_TABLE = [
  0,      // Lv.1
  100,    // Lv.2
  250,    // Lv.3
  // ... 添加更多等级
]
```

### 修改成就条件

编辑 `src/constants.js` 的 `ACHIEVEMENTS`：

```javascript
{
  id: 'ach_new',
  name: '新成就',
  desc: '描述',
  icon: '🏆',
  condition: (state) => state.hero.xp >= 1000,  // 修改条件
  progress: (state) => state.hero.xp,
  target: 1000,
}
```

### 修改商店物品

编辑 `src/constants.js` 的 `COIN_ITEMS`：

```javascript
{
  id: 'item_new',
  name: '新物品',
  icon: '🎁',
  price: 200,
  realPrice: '¥50',
}
```

### 修改每日一句

编辑 `src/constants.js` 的 `DAILY_QUOTES`：

```javascript
DAILY_QUOTES = [
  '新的名言',
  '另一句名言',
  // ...
]
```

---

## 🚀 开发和部署

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问 http://localhost:5173
```

### 构建生产版本

```bash
# 构建
npm run build

# 预览构建结果
npm run preview

# 启动本地服务器（端口 8902）
cd dist && python3 -m http.server 8902
```

### 项目配置

**package.json**：
```json
{
  "name": "selge",
  "version": "0.2.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

**vite.config.js**：
```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'dist',
    minify: 'terser',
  }
})
```

---

## 📊 数据持久化

### localStorage 结构

```javascript
// Key: 'liferpg_v5'
{
  "hero": {
    "name": "Florian",
    "xp": 1500,
    "coin": 800,
    "realMoney": 5000,
    "bannerImg": null,
    "purchases": []
  },
  "adventures": [ /* ... */ ],
  "essays": [ /* ... */ ],
  "advTypes": [ /* ... */ ],
  "unlockedAchievements": { /* ... */ },
  "theme": "auto"
}
```

### 导入导出

**JSON 导出**：完整的 state 对象

**Markdown 导出**：每篇随笔一个文件
```markdown
---
id: uuid
title: 标题
date: 2026-03-27
mood: 😊
tags: [标签1, 标签2]
---

# 内容

Markdown 格式的随笔内容
```

**ZIP 导出**：包含 JSON + 所有 Markdown 文件

---

## 🐛 常见问题

### Q: 如何重置所有数据？

A: 打开浏览器开发者工具，在 Console 中运行：
```javascript
localStorage.removeItem('liferpg_v5')
location.reload()
```

### Q: 如何修改导出文件名？

A: 编辑 `src/App.vue` 的 `exportZip()` 和 `exportJson()` 函数中的文件名。

### Q: 如何添加新页面？

A: 
1. 在 `src/App.vue` 的 `<template>` 中添加新的 `<div class="page">`
2. 在 `switchPage()` 中添加新的路由
3. 在导航栏中添加新的标签

### Q: 下拉框宽度不匹配怎么办？

A: 确保 JavaScript 中的 `toggleDropdown()` 函数正确执行，检查浏览器控制台是否有错误。

---

## 📝 版本历史

- **v0.2.0** (2026-03-27)：
  - 完整的 Vue 3 + Vite 迁移
  - 自定义下拉框样式
  - 完整的导入导出功能
  - 响应式设计

- **v1.0.0** (原始版本)：
  - 单文件 HTML 版本

---

## 🎓 技术栈

- **框架**：Vue 3 (Composition API)
- **构建工具**：Vite
- **状态管理**：Vue reactive()
- **Markdown**：marked.js
- **ZIP 处理**：jszip
- **样式**：原生 CSS + CSS 变量
- **字体**：Google Fonts (Noto Serif SC, Noto Sans SC, JetBrains Mono)

---

## 📞 联系方式

- **Email**：FlorianChen9@outlook.com
- **GitHub**：https://github.com/freepotato

---

**最后更新**：2026-03-27 16:22 GMT+8

**项目地址**：/Users/florian/Documents/Selge

**本地服务器**：http://localhost:8902

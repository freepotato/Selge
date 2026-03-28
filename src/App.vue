<script setup>
import { ref, computed, onMounted } from 'vue'
import { marked } from 'marked'
import JSZip from 'jszip'
import { useStore } from './stores/cloudStore.js'
import { getMe, loadData, saveData, uploadImage } from './utils/authApi.js'

const { state, XP_TABLE, XP_ESSAY, MOODS, ACHIEVEMENTS, COIN_SVG, COIN_ITEMS, DAILY_QUOTES, load, save, autoSave, uid, today, fmtDate, randInt, getLevel, getLevelTitle, getAdvCounts } = useStore()

// 用户认证状态
const user = ref({ authenticated: false, username: 'Guest' })

const currentPage = ref('character')
const mobileMenuOpen = ref(false)
const dialogOpen = ref(false)
const dialogTitle = ref('')
const dialogBody = ref('')
const dialogActions = ref([])
const toasts = ref([])
const heatmapWeeks = ref(26)
const currentEssay = ref(null)
const essayTagInput = ref('')
const achFilter = ref('all')
const newAdvTitle = ref('')
const newAdvType = ref('at3')
const newTypeEmoji = ref('')
const newTypeName = ref('')
const newTypeXpMin = ref('')
const newTypeXpMax = ref('')
const advTypeOpen = ref(false)
const themeOpen = ref(false)

function login() {
  // 访问受 Cloudflare Access 保护的 API
  // Access 会自动拦截并显示登录页
  // 登录成功后会重定向回这个页面
  window.location.href = '/api/me'
}

function showLogoutConfirm() {
  showDialog({
    title: '退出登录',
    body: '确定要退出登录吗？',
    actions: [
      { label: '取消', cls: 'btn-g' },
      { label: '确定退出', cls: 'btn-dg', fn: () => {
        logout()
      }}
    ]
  })
}

function logout() {
  // 访问 Cloudflare Access 的登出端点
  window.location.href = '/cdn-cgi/access/logout'
}

// 页面加载时检查是否从登录返回
onMounted(async () => {
  // 检查是否在 /api/* 路径且已登录
  if (window.location.pathname.startsWith('/api/')) {
    try {
      const res = await fetch('/api/me')
      if (res.ok) {
        const data = await res.json()
        if (data.authenticated) {
          // 已登录，重定向回主页
          window.location.href = '/'
          return
        }
      }
    } catch (e) {
      console.error('检查登录状态失败:', e)
    }
  }
  
  // 获取用户信息
  try {
    const me = await getMe()
    user.value = me
    if (me.authenticated) {
      // 已登录，从云端加载数据
      await load()
    }
  } catch (e) {
    console.error('获取用户信息失败:', e)
  }
  
  applyTheme(state.theme)
  if (state.advTypes.length > 0) newAdvType.value = state.advTypes[0].id

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-select')) {
      advTypeOpen.value = false
      themeOpen.value = false
    }
  })
})

function applyTheme(t) {
  state.theme = t
  const html = document.documentElement
  if (t === 'light') html.setAttribute('data-theme', 'light')
  else if (t === 'dark') html.setAttribute('data-theme', 'dark')
  else html.setAttribute('data-theme', window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  saveWithToast()
}

function toggleTheme() {
  // 在 light 和 dark 之间切换
  // 如果当前是 auto，先转换为当前实际的主题，再切换
  let currentTheme = state.theme
  if (currentTheme === 'auto') {
    // 获取当前实际显示的主题
    currentTheme = document.documentElement.getAttribute('data-theme')
  }
  // 在 light 和 dark 之间切换
  const nextTheme = currentTheme === 'dark' ? 'light' : 'dark'
  applyTheme(nextTheme)
}

function switchPage(name) { currentPage.value = name }

function toggleAdvTypeDropdown() { 
  advTypeOpen.value = !advTypeOpen.value
  themeOpen.value = false
  if (advTypeOpen.value) {
    setTimeout(() => {
      const btn = document.querySelector('.adv-add-bar .custom-select-btn')
      const menu = document.querySelector('.adv-add-bar .custom-select-menu')
      if (btn && menu) menu.style.width = btn.offsetWidth + 'px'
    }, 0)
  }
}
function toggleThemeDropdown() { 
  themeOpen.value = !themeOpen.value
  advTypeOpen.value = false
  if (themeOpen.value) {
    setTimeout(() => {
      const btn = document.querySelector('.set-row .custom-select-btn')
      const menu = document.querySelector('.set-row .custom-select-menu')
      if (btn && menu) menu.style.width = btn.offsetWidth + 'px'
    }, 0)
  }
}
function selectAdvType(id) { newAdvType.value = id; advTypeOpen.value = false }
function selectTheme(t) { applyTheme(t); themeOpen.value = false }

function showDialog(opts) {
  dialogTitle.value = opts.title || ''
  dialogBody.value = opts.body || ''
  dialogActions.value = opts.actions || []
  dialogOpen.value = true
}

function closeDialog() { dialogOpen.value = false }

function showToast(msg, type = 'green', icon = '') {
  const id = Date.now()
  toasts.value.push({ id, msg, type, icon })
  setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id) }, 2500)
}

// 保存并显示提示
function saveWithToast() {
  autoSave(() => {
    showToast('已同步云端', 'green', '☁️')
  })
}

const currentLevel = computed(() => getLevel(state.hero.xp))
const coinDisplay = computed(() => COIN_SVG + ' <span style="margin-left:6px"><strong>' + state.hero.coin.toLocaleString() + '</strong></span>')
const sortedAchievements = computed(() => {
  const allAchs = [...ACHIEVEMENTS.read, ...ACHIEVEMENTS.movie, ...ACHIEVEMENTS.guitar, ...ACHIEVEMENTS.walk, ...ACHIEVEMENTS.total]
  // 已解锁的在前，按 id 排序（最新的在前）
  const unlocked = allAchs.filter(a => state.unlockedAchievements.includes(a.id)).reverse()
  const locked = allAchs.filter(a => !state.unlockedAchievements.includes(a.id))
  return [...unlocked, ...locked]
})
const levelTitle = computed(() => getLevelTitle(currentLevel.value))
const xpProgress = computed(() => {
  const lvl = currentLevel.value
  const floor = XP_TABLE[lvl] || 0
  const ceil = XP_TABLE[Math.min(lvl + 1, 100)] || XP_TABLE[100]
  return ceil > floor ? Math.min(100, Math.max(0, ((state.hero.xp - floor) / (ceil - floor)) * 100)).toFixed(1) : 100
})
const xpCeil = computed(() => XP_TABLE[Math.min(currentLevel.value + 1, 100)] || XP_TABLE[100])

const dailyQuote = computed(() => {
  const d = new Date()
  const dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000)
  return DAILY_QUOTES[(dayOfYear - 1) % DAILY_QUOTES.length]
})

function showQuoteHistory() {
  const d = new Date()
  const dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000)
  let html = '<div class="quote-history">'
  for (let i = 0; i < 30; i++) {
    const dayIdx = (dayOfYear - 1 - i + DAILY_QUOTES.length) % DAILY_QUOTES.length
    const pastDate = new Date(d)
    pastDate.setDate(pastDate.getDate() - i)
    html += `<div class="quote-item"><div class="quote-item-text">"${DAILY_QUOTES[dayIdx]}"</div><div class="quote-item-date">${pastDate.toISOString().slice(0, 10)}</div></div>`
  }
  html += '</div>'
  showDialog({ title: '往期每日一句', body: html, actions: [{ label: '关闭', cls: 'btn-g' }] })
}

const pinnedTypes = computed(() => state.advTypes.filter(t => t.pinned))
function getTypeCount(typeId) { return state.adventures.filter(a => a.typeId === typeId).length }

function addAdventure() {
  const title = newAdvTitle.value.trim()
  if (!title) return
  const t = state.advTypes.find(x => x.id === newAdvType.value)
  const xp = t ? randInt(t.xpMin, t.xpMax) : randInt(5, 15)
  state.adventures.unshift({ id: uid(), typeId: newAdvType.value, title, date: today(), ts: Date.now(), xp })
  state.hero.xp += xp
  state.hero.coin += xp
  const tDate = today()
  if (state.hero.lastAdvDate !== tDate) {
    const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    state.hero.streak = state.hero.lastAdvDate === yest ? state.hero.streak + 1 : 1
    state.hero.lastAdvDate = tDate
  }
  newAdvTitle.value = ''
  saveWithToast()
  showToast(`${t?.emoji || '⚔️'} 历险已记录！+${xp} XP`, 'green')
  checkAchievements()
}

function checkAchievements() {
  const counts = getAdvCounts(state)
  counts.total = state.adventures.length
  const allAchs = [...ACHIEVEMENTS.read, ...ACHIEVEMENTS.movie, ...ACHIEVEMENTS.guitar, ...ACHIEVEMENTS.walk, ...ACHIEVEMENTS.total]
  allAchs.forEach(a => {
    const reqKey = a.id.startsWith('r') ? 'read' : a.id.startsWith('m') ? 'movie' : a.id.startsWith('g') ? 'guitar' : a.id.startsWith('w') ? 'walk' : 'total'
    const currentCount = reqKey === 'total' ? state.adventures.length : (counts[reqKey] || 0)
    if (currentCount >= a.req && !state.unlockedAchievements.includes(a.id)) {
      state.unlockedAchievements.push(a.id)
      showToast(`成就解锁：${a.name}`, 'gold', a.icon)
    }
  })
}

const heatmapData = computed(() => {
  const weeks = heatmapWeeks.value
  const todayD = new Date()
  todayD.setHours(0, 0, 0, 0)
  const countMap = {}
  state.adventures.forEach(a => { countMap[a.date] = (countMap[a.date] || 0) + 1 })
  const startDate = new Date(todayD)
  startDate.setDate(startDate.getDate() - weeks * 7)
  startDate.setDate(startDate.getDate() - startDate.getDay())
  const cols = []
  let cur = new Date(startDate)
  while (cur <= todayD) {
    const col = []
    for (let d = 0; d < 7; d++) { col.push(new Date(cur)); cur.setDate(cur.getDate() + 1) }
    cols.push(col)
  }
  const maxC = Math.max(1, ...Object.values(countMap))
  function lv(n) { if (!n) return 0; if (n <= maxC * .25) return 1; if (n <= maxC * .5) return 2; if (n <= maxC * .75) return 3; return 4 }
  return { cols, countMap, lv, todayD }
})

const recentActivity = computed(() => {
  return [...state.adventures.map(a => ({ ts: a.ts, type: 'adv', data: a })),
    ...state.essays.filter(e => e.submitted).map(e => ({ ts: e.ts, type: 'essay', data: e }))]
    .sort((a, b) => b.ts - a.ts).slice(0, 8)
})

function buyItem(item) {
  if (state.hero.coin < item.price) return
  showDialog({
    title: `购买 ${item.icon} ${item.name}`,
    body: `确认用 <strong>${item.price.toLocaleString()}</strong> 金币兑换？<br><br><span style="font-size:12px;color:var(--t3)">${item.desc}，现实价值约 ${item.realValue}</span>`,
    actions: [
      { label: '取消', cls: 'btn-g' },
      { label: '确认购买', cls: 'btn-p', fn: () => {
        state.hero.coin -= item.price
        if (!state.hero.purchasedItems) state.hero.purchasedItems = []
        state.hero.purchasedItems.push(item.id)
        if (!state.hero.purchaseHistory) state.hero.purchaseHistory = []
        state.hero.purchaseHistory.unshift({ icon: item.icon, name: item.name, price: item.price, date: fmtDate(today()) })
        saveWithToast()
        showToast(`恭喜获得 ${item.name}！`, 'green', item.icon)
      }}
    ]
  })
}

function newEssay() {
  const id = uid()
  state.essays.unshift({ id, title: '', content: '', mood: '😊', date: today(), ts: Date.now(), submitted: false, tags: [] })
  currentEssay.value = state.essays[0]
  saveWithToast()
}

function openEssay(essay) { 
  currentEssay.value = essay
  essayTagInput.value = ''
}

function addEssayTag() {
  const tag = essayTagInput.value.trim()
  if (!tag) return
  if (!currentEssay.value.tags) currentEssay.value.tags = []
  if (!currentEssay.value.tags.includes(tag)) {
    currentEssay.value.tags.push(tag)
    saveWithToast()
  }
  essayTagInput.value = ''
}

function removeEssayTag(index) {
  currentEssay.value.tags.splice(index, 1)
  saveWithToast()
}

function deleteEssay() {
  showDialog({
    title: '删除草稿',
    body: '确定删除这篇草稿？',
    actions: [
      { label: '取消', cls: 'btn-g' },
      { label: '删除', cls: 'btn-dg', fn: () => {
        state.essays = state.essays.filter(e => e.id !== currentEssay.value.id)
        currentEssay.value = null
        saveWithToast()
      }}
    ]
  })
}

function submitEssay() {
  if (!currentEssay.value.content.trim()) {
    showToast('内容不能为空', 'warn')
    return
  }
  showDialog({
    title: '提交随笔',
    body: '提交后将无法修改，确定吗？',
    actions: [
      { label: '取消', cls: 'btn-g' },
      { label: '确定提交', cls: 'btn-p', fn: () => {
        currentEssay.value.submitted = true
        currentEssay.value.title = currentEssay.value.title || '无题'
        // 根据字数计算经验：1字1经验，上限1000
        const wordCount = currentEssay.value.content.length
        const xpGain = Math.min(wordCount, 1000)
        state.hero.xp += xpGain
        saveWithToast()
        showToast(`随笔已提交 +${xpGain} XP`, 'green', '📝')
      }}
    ]
  })
}

function saveProfile() { save(); showToast('已保存', 'green') }

function addAdvType() {
  const emoji = newTypeEmoji.value.trim() || '🎯'
  const name = newTypeName.value.trim()
  const xpMin = parseInt(newTypeXpMin.value) || 5
  const xpMax = parseInt(newTypeXpMax.value) || 10
  if (!name) return
  if (xpMin > xpMax) { showToast('最小XP不能大于最大XP', 'warn'); return }
  state.advTypes.push({ id: uid(), emoji, name, xpMin, xpMax, pinned: false })
  newTypeEmoji.value = ''; newTypeName.value = ''; newTypeXpMin.value = ''; newTypeXpMax.value = ''
  saveWithToast()
  showToast('已添加历险类型', 'green')
}

function togglePin(typeId) {
  const t = state.advTypes.find(x => x.id === typeId)
  if (t) { t.pinned = !t.pinned; saveWithToast() }
}

function showAbout() {
  showDialog({
    title: '🌿 关于 Selge',
    body: `<div style="font-size:12px;line-height:1.9;color:var(--t2)">
<p style="margin-bottom:16px">有一天我像往常一样闲来无事打开游戏，玩了一会儿之后突然觉得内心无比空虚。我想，我不能再这样了。</p>
<p style="margin-bottom:16px">我搜索了大量的资料，发现这可以归纳为一种简单而确定的模式：我们花费很少的精力，就能获取很大的满足，它是一个安全而且确定的奖励机制。但是这个奖励机制只能让我们沉迷于对我们的人生并无裨益的事情中，所以，我开始尝试创建一套属于我的人生的奖励机制。</p>
<p style="margin-bottom:16px">通过跟AI反复辩论，我明白了我要做的东西：一个Life RPG模拟器。幸运的是，网上已经有类似的产品，可惜不幸的是，它们要么没有我想要的功能，要么收费极贵（Youtube上几十万播放的一个notion life rpg模板，基础版就要收费69美刀）。于是，Selge应运而生：一个基于Cloudflare Pages搭建的开源Life RPG模拟器。</p>
<p style="margin-bottom:16px">过去无数个瞬间我都在想，假如我的人生是个游戏就好了，我猜你也这么想过。现在，不再想象，让我们付诸实践吧——路，就在脚下。</p>
<hr style="border:none;border-top:1px solid var(--bd);margin:20px 0">
<p style="font-size:12px;color:var(--t3)">Contact me:</p>
<p>Email: <a href="mailto:FlorianChen9@outlook.com">FlorianChen9@outlook.com</a></p>
<p style="font-size:12px;color:var(--t3)">Find this repo at:</p>
<p>GitHub: <a href="https://github.com/freepotato/selge" target="_blank">https://github.com/freepotato/selge</a></p></div>`,
    actions: [{ label: '继续历险', cls: 'btn-p' }]
  })
}

async function exportZip() {
  const zip = new JSZip()
  // JSON data
  zip.file('selge-data.json', JSON.stringify({ 
    hero: state.hero, 
    advTypes: state.advTypes, 
    adventures: state.adventures, 
    essays: state.essays, 
    unlockedAchievements: state.unlockedAchievements,
    theme: state.theme
  }, null, 2))
  // Markdown files for essays
  const essaysFolder = zip.folder('essays')
  state.essays.filter(e => e.submitted).forEach(e => {
    const frontmatter = `---
id: ${e.id}
title: "${(e.title || '无题').replace(/"/g, '\\"')}"
date: ${e.date}
mood: ${e.mood}
tags: ${JSON.stringify(e.tags || [])}
---
`
    essaysFolder.file(`${e.date}-${(e.title || '无题').replace(/[\\/:*?"<>|]/g, '').substring(0, 30)}.md`, frontmatter + (e.content || ''))
  })
  const content = await zip.generateAsync({ type: 'blob' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(content)
  a.download = `selge-backup-${today()}.zip`
  a.click()
  showToast('已导出 ZIP（含 JSON + 随笔）', 'green', '📦')
}

function exportJson() {
  const data = { 
    hero: state.hero, 
    advTypes: state.advTypes, 
    adventures: state.adventures, 
    essays: state.essays, 
    unlockedAchievements: state.unlockedAchievements,
    theme: state.theme
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `selge-${today()}.json`
  a.click()
  showToast('已导出 JSON', 'green', '📄')
}

function exportMarkdown() {
  state.essays.filter(e => e.submitted).forEach(e => {
    const frontmatter = `---
id: ${e.id}
title: "${(e.title || '无题').replace(/"/g, '\\"')}"
date: ${e.date}
mood: ${e.mood}
tags: ${JSON.stringify(e.tags || [])}
---
`
    const blob = new Blob([frontmatter + (e.content || '')], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${e.date}-${(e.title || '无题').replace(/[\\/:*?"<>|]/g, '').substring(0, 30)}.md`
    a.click()
  })
  showToast(`已导出 ${state.essays.filter(e => e.submitted).length} 篇随笔`, 'green', '📝')
}

function triggerImport() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json,.zip,.md'
  input.multiple = true
  input.onchange = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    
    for (const file of files) {
      const ext = file.name.split('.').pop().toLowerCase()
      
      if (ext === 'json') {
        const reader = new FileReader()
        reader.onload = (ev) => {
          try {
            const p = JSON.parse(ev.target.result)
            if (p.hero && p.adventures) {
              // Merge data
              if (p.hero) Object.assign(state.hero, p.hero)
              if (p.advTypes) state.advTypes = p.advTypes
              if (p.adventures) {
                const existingIds = new Set(state.adventures.map(a => a.id))
                const newAdvs = p.adventures.filter(a => !existingIds.has(a.id))
                state.adventures = [...state.adventures, ...newAdvs]
              }
              if (p.essays) {
                const existingEssays = new Set(state.essays.map(e => e.id))
                const newEssays = p.essays.filter(e => !existingEssays.has(e.id))
                state.essays = [...state.essays, ...newEssays]
              }
              if (p.unlockedAchievements) state.unlockedAchievements = [...new Set([...state.unlockedAchievements, ...p.unlockedAchievements])]
              if (p.theme) state.theme = p.theme
              saveWithToast()
              showToast(`已导入 ${newAdvs.length} 条历险、${newEssays.length} 篇随笔`, 'green', '📥')
            } else {
              showToast('JSON 格式不正确', 'warn')
            }
          } catch (err) {
            showToast('JSON 解析失败', 'warn')
          }
        }
        reader.readAsText(file)
      } else if (ext === 'md') {
        const reader = new FileReader()
        reader.onload = (ev) => {
          try {
            const content = ev.target.result
            const parsed = parseMdFrontmatter(content)
            if (parsed && parsed.id) {
              const existing = state.essays.find(x => x.id === parsed.id)
              if (existing) {
                showToast('随笔已存在，跳过: ' + parsed.title, 'warn')
              } else {
                state.essays.push({
                  id: parsed.id,
                  title: parsed.title || '无题',
                  date: parsed.date || today(),
                  mood: parsed.mood || '😊',
                  tags: parsed.tags || [],
                  content: parsed.content || '',
                  submitted: true,
                  ts: Date.now()
                })
                saveWithToast()
                showToast('已导入随笔: ' + parsed.title, 'green', '📝')
              }
            } else {
              showToast('MD 文件缺少 frontmatter', 'warn')
            }
          } catch (err) {
            showToast('MD 文件解析失败', 'warn')
          }
        }
        reader.readAsText(file)
      }
    }
  }
  input.click()
}

function parseMdFrontmatter(content) {
  if (!content.startsWith('---')) return null
  const endIdx = content.indexOf('---', 3)
  if (endIdx === -1) return null
  const frontStr = content.substring(3, endIdx).trim()
  const body = content.substring(endIdx + 3).trim()
  const meta = {}
  frontStr.split('\n').forEach(line => {
    const colonIdx = line.indexOf(':')
    if (colonIdx !== -1) {
      const key = line.substring(0, colonIdx).trim()
      let val = line.substring(colonIdx + 1).trim()
      if (val.startsWith('[') && val.endsWith(']')) {
        try { val = JSON.parse(val) } catch (e) { val = [] }
      }
      meta[key] = val
    }
  })
  meta.content = body
  return meta
}

const clearCountdown = ref(10)
const clearTimer = ref(null)
const clearReady = ref(false)

function clearData() {
  clearCountdown.value = 10
  clearReady.value = false
  showDialog({
    title: '清除所有数据',
    body: '<div style="color:var(--t2)">此操作不可撤销，所有历险记录、随笔和设置都将被删除。</div><div id="clear-countdown" style="margin-top:12px;font-size:14px;color:#c0392b;font-weight:600">请等待 <span id="countdown-num">10</span> 秒后可确认清除</div>',
    actions: [
      { label: '取消', cls: 'btn-g', fn: () => { clearInterval(clearTimer.value) } },
      { label: '确定清除', cls: 'btn-dg-clear', fn: () => {
        if (!clearReady.value) return
        localStorage.clear()
        Object.assign(state, { 
          hero: { name: '勇者', xp: 0, coin: 0, realMoney: 0, streak: 0, lastAdvDate: null, purchasedItems: [], purchaseHistory: [], bannerImg: null }, 
          advTypes: [
            { id: 'at1', emoji: '📚', name: '读书', xpMin: 30, xpMax: 40, pinned: true },
            { id: 'at2', emoji: '🎬', name: '电影', xpMin: 5, xpMax: 8, pinned: true },
            { id: 'at3', emoji: '🚶', name: '散步', xpMin: 3, xpMax: 5, pinned: true },
            { id: 'at4', emoji: '🎸', name: '指弹', xpMin: 100, xpMax: 120, pinned: true }
          ], 
          adventures: [], 
          essays: [], 
          unlockedAchievements: [],
          theme: 'auto'
        })
        saveWithToast()
        showToast('数据已清除', 'warn')
      }}
    ]
  })
  // 设置初始禁用样式
  setTimeout(() => {
    const btn = document.querySelector('.btn-dg-clear')
    if (btn) {
      btn.disabled = true
      btn.style.opacity = '0.5'
      btn.style.cursor = 'not-allowed'
    }
    const countdownEl = document.getElementById('clear-countdown')
    if (countdownEl) {
      countdownEl.innerHTML = '请等待 <span id="countdown-num">10</span> 秒后可确认清除'
      countdownEl.style.color = '#c0392b'
    }
  }, 0)
  
  clearTimer.value = setInterval(() => {
    clearCountdown.value--
    const numEl = document.getElementById('countdown-num')
    const countdownEl = document.getElementById('clear-countdown')
    if (numEl) numEl.textContent = clearCountdown.value
    if (clearCountdown.value <= 0) {
      clearInterval(clearTimer.value)
      clearReady.value = true
      if (countdownEl) {
        countdownEl.textContent = '⚠️ 现在可以点击确定清除'
        countdownEl.style.color = '#c0392b'
      }
      // 启用按钮
      const btn = document.querySelector('.btn-dg-clear')
      if (btn) {
        btn.disabled = false
        btn.style.opacity = '1'
        btn.style.cursor = 'pointer'
      }
    }
  }, 1000)
}

</script>

<template>
  <nav class="nav">
    <div class="wrap nav-inner">
      <button class="mob-menu-btn" @click="mobileMenuOpen = !mobileMenuOpen">☰</button>
      <div class="nav-logo" @click="showAbout">Selge</div>
      <div class="nav-tabs">
        <button class="nav-tab" :class="{ active: currentPage === 'character' }" @click="switchPage('character')">角色</button>
        <button class="nav-tab" :class="{ active: currentPage === 'adventure' }" @click="switchPage('adventure')">历险</button>
        <button class="nav-tab" :class="{ active: currentPage === 'essays' }" @click="switchPage('essays')">随笔</button>
        <button class="nav-tab" :class="{ active: currentPage === 'achievements' }" @click="switchPage('achievements')">成就</button>
        <button class="nav-tab" :class="{ active: currentPage === 'shop' }" @click="switchPage('shop')">商店</button>
        <button class="nav-tab" :class="{ active: currentPage === 'settings' }" @click="switchPage('settings')">设置</button>
      </div>
      <div class="nav-right">
        <button v-if="user.authenticated" class="user-btn" @click="showLogoutConfirm">{{ state.hero.name || user.username }}</button>
        <button v-else class="btn btn-p btn-sm" @click="login">🔐 登录</button>
        <button class="theme-btn" @click="toggleTheme">🌓</button>
      </div>
    </div>
  </nav>

  <!-- 移动版侧边菜单 -->
  <div v-if="mobileMenuOpen" class="mob-menu-overlay" @click="mobileMenuOpen = false"></div>
  <div class="mob-menu" :class="{ open: mobileMenuOpen }">
    <div class="mob-menu-header">
      <div class="mob-menu-title">菜单</div>
      <button class="mob-menu-close" @click="mobileMenuOpen = false">✕</button>
    </div>
    <div class="mob-menu-items">
      <button class="mob-menu-item" :class="{ active: currentPage === 'character' }" @click="switchPage('character'); mobileMenuOpen = false">角色</button>
      <button class="mob-menu-item" :class="{ active: currentPage === 'adventure' }" @click="switchPage('adventure'); mobileMenuOpen = false">历险</button>
      <button class="mob-menu-item" :class="{ active: currentPage === 'essays' }" @click="switchPage('essays'); mobileMenuOpen = false">随笔</button>
      <button class="mob-menu-item" :class="{ active: currentPage === 'achievements' }" @click="switchPage('achievements'); mobileMenuOpen = false">成就</button>
      <button class="mob-menu-item" :class="{ active: currentPage === 'shop' }" @click="switchPage('shop'); mobileMenuOpen = false">商店</button>
      <button class="mob-menu-item" :class="{ active: currentPage === 'settings' }" @click="switchPage('settings'); mobileMenuOpen = false">设置</button>
    </div>
  </div>

  <div id="toastWrap">
    <div v-for="t in toasts" :key="t.id" class="toast" :class="t.type">
      <span v-if="t.icon">{{ t.icon }}</span>
      <span>{{ t.msg }}</span>
    </div>
  </div>

  <!-- Character Page -->
  <div class="page" :class="{ active: currentPage === 'character' }">
    <div class="wrap">
      <div class="char-banner" :class="{ 'has-img': state.hero.bannerImg }">
        <img v-if="state.hero.bannerImg" class="char-banner-img" :src="state.hero.bannerImg" />
        <div class="char-banner-overlay"></div>
        <div class="char-banner-content">
          <div class="daily-quote-text" style="font-size:16px;line-height:1.6">「{{ dailyQuote }}」</div>
        </div>
      </div>

      <div class="xp-section card cp">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
          <div>
            <div class="xp-lv-inline">
              <span class="xp-lv-num">Lv.{{ currentLevel }}</span>
              <span class="xp-lv-text">{{ levelTitle }}</span>
            </div>
          </div>
          <div style="display:flex;gap:32px;text-align:right;padding-left:8px">
            <div>
              <div style="font-size:12px;color:var(--t3);margin-bottom:2px;margin-left:4px;">金币</div>
              <div style="display:flex;align-items:center;gap:2px;font-size:18px;font-weight:600;color:var(--t1);margin-left:-4px"><span v-html="COIN_SVG" style="display:inline-flex;vertical-align:middle;width:14px;height:14px"></span>{{ state.hero.coin.toLocaleString() }}</div>
            </div>
            <div>
              <div style="font-size:12px;color:var(--t3);margin-bottom:2px;">储蓄</div>
              <div style="display:flex;align-items:center;justify-content:flex-start;gap:2px;font-size:18px;font-weight:600;color:var(--t1)"><span style="color:#d4a017;font-size:16px;font-weight:bold">¥</span>{{ (state.hero.realMoney || 0).toLocaleString() }}</div>
            </div>
          </div>
        </div>
        <div class="xp-header">
          <span class="xp-label">经验值进度</span>
          <span class="xp-num">{{ state.hero.xp.toLocaleString() }} / {{ xpCeil.toLocaleString() }}</span>
        </div>
        <div class="xp-track"><div class="xp-fill" :style="{ width: xpProgress + '%' }"></div></div>
      </div>

      <div v-if="pinnedTypes.length" class="mt24">
        <div class="sec-label mb16">关注的历险类型</div>
        <div class="pinned-grid">
          <div v-for="t in pinnedTypes" :key="t.id" class="pinned-card">
            <div class="pinned-card-icon">{{ t.emoji }}</div>
            <div class="pinned-card-name">{{ t.name }}</div>
            <div class="pinned-card-count">{{ getTypeCount(t.id) }}</div>
          </div>
        </div>
      </div>

      <div class="mt24">
        <div class="fb mb16" style="align-items:center">
          <div class="sec-label">历险热力图</div>
          <div class="hm-range-sel">
            <button class="hm-range-btn" :class="{ active: heatmapWeeks === 4 }" @click="heatmapWeeks = 4">1月</button>
            <button class="hm-range-btn" :class="{ active: heatmapWeeks === 13 }" @click="heatmapWeeks = 13">3月</button>
            <button class="hm-range-btn" :class="{ active: heatmapWeeks === 26 }" @click="heatmapWeeks = 26">6月</button>
            <button class="hm-range-btn" :class="{ active: heatmapWeeks === 52 }" @click="heatmapWeeks = 52">1年</button>
          </div>
        </div>
        <div class="card cp">
          <div class="heatmap-scroll">
            <div class="heatmap-inner">
              <div class="heatmap-months">
                <div v-for="(col, i) in heatmapData.cols" :key="i" class="hm-ml">{{ i === 0 || col[0].getMonth() !== heatmapData.cols[i-1][0].getMonth() ? ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'][col[0].getMonth()] : '' }}</div>
              </div>
              <div class="heatmap-body">
                <div class="heatmap-wds">
                  <div class="hm-wd"></div><div class="hm-wd">一</div><div class="hm-wd"></div><div class="hm-wd">三</div><div class="hm-wd"></div><div class="hm-wd">五</div><div class="hm-wd"></div>
                </div>
                <div v-for="(col, i) in heatmapData.cols" :key="i" class="hm-col">
                  <div v-for="(d, j) in col" :key="j" class="hm-cell" :data-l="heatmapData.lv(heatmapData.countMap[d.toISOString().slice(0, 10)] || 0)" :data-tip="(heatmapData.countMap[d.toISOString().slice(0, 10)] || 0) + ' 次历险 · ' + d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })" :style="{ opacity: d > heatmapData.todayD ? 0.3 : 1 }"></div>
                </div>
              </div>
            </div>
          </div>
          <div class="hm-legend"><span>少</span><div class="hm-lc" style="background:var(--h0)"></div><div class="hm-lc" style="background:var(--h1)"></div><div class="hm-lc" style="background:var(--h2)"></div><div class="hm-lc" style="background:var(--h3)"></div><div class="hm-lc" style="background:var(--h4)"></div><span>多</span></div>
        </div>
      </div>

      <div class="mt24">
        <div class="sec-label mb16">最近动态</div>
        <div class="card cp">
          <div v-if="!recentActivity.length" class="empty"><div class="empty-icon">🌿</div>开始你的第一次历险吧</div>
          <div v-else>
            <div v-for="item in recentActivity" :key="item.ts" class="activity-item">
              <span style="font-size:20px">{{ item.type === 'adv' ? (state.advTypes.find(t => t.id === item.data.typeId)?.emoji || '📌') : item.data.mood }}</span>
              <div style="flex:1"><div style="font-size:13px;font-weight:500;color:var(--t1)">{{ item.data.title || '无题' }}</div><div style="font-size:11px;color:var(--t3);font-family:monospace">{{ fmtDate(item.data.date) }} · {{ item.type === 'adv' ? '+' + item.data.xp + ' XP' : '随笔' }}</div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Adventure Page -->
  <div class="page" :class="{ active: currentPage === 'adventure' }">
    <div class="wrap">
      <div class="mb24"><div class="page-title">历险记录</div><div class="page-sub">记录每一次出发</div></div>
      <div class="adv-add-bar" style="flex-wrap:nowrap;gap:8px">
        <input class="inp inp-h" v-model="newAdvTitle" placeholder="这次历险叫什么？" maxlength="60" style="flex:1;min-width:120px" @keydown.enter="addAdventure" />
        <div class="custom-select" style="flex-shrink:0;width:180px">
          <button class="custom-select-btn" :class="{ open: advTypeOpen }" @click="toggleAdvTypeDropdown" style="width:100%">
            <span style="overflow:hidden;text-overflow:ellipsis">{{ state.advTypes.find(t => t.id === newAdvType)?.emoji }} {{ state.advTypes.find(t => t.id === newAdvType)?.name }} (+{{ state.advTypes.find(t => t.id === newAdvType)?.xpMin }}-{{ state.advTypes.find(t => t.id === newAdvType)?.xpMax }})</span>
          </button>
          <div class="custom-select-menu" :class="{ open: advTypeOpen }">
            <div v-for="t in state.advTypes" :key="t.id" class="custom-select-item" :class="{ selected: newAdvType === t.id }" @click="selectAdvType(t.id)">
              {{ t.emoji }} {{ t.name }} (+{{ t.xpMin }}-{{ t.xpMax }})
            </div>
          </div>
        </div>
        <button class="btn btn-p" style="flex-shrink:0;white-space:nowrap" @click="addAdventure">记录</button>
      </div>
      <div class="card cp">
        <div style="padding-bottom:12px;border-bottom:1px solid var(--bd)"><span style="font-size:12px;color:var(--t3);font-family:monospace">{{ state.adventures.length }} 次</span></div>
        <div v-if="!state.adventures.length" class="empty" style="padding-top:24px"><div class="empty-icon">🗺️</div>还没有历险记录</div>
        <div v-else style="padding-top:12px">
          <div v-for="a in state.adventures.slice(0, 50)" :key="a.id" class="adv-item">
            <span class="adv-badge">{{ state.advTypes.find(t => t.id === a.typeId)?.emoji || '📌' }} {{ state.advTypes.find(t => t.id === a.typeId)?.name || '历险' }}</span>
            <div class="adv-content"><div class="adv-title">{{ a.title }}</div><div class="adv-meta"><span>{{ fmtDate(a.date) }}</span><span class="adv-xp">+{{ a.xp }} XP</span></div></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Essays Page -->
  <div class="page" :class="{ active: currentPage === 'essays' }">
    <div class="wrap">
      <div class="fb mb24"><div><div class="page-title">随笔</div><div class="page-sub">写下来，就永远在了</div></div><button class="btn btn-p" @click="newEssay">+ 新建随笔</button></div>
      <div class="essay-layout">
        <div>
          <div class="essay-timeline">
            <div v-if="!state.essays.length" class="empty" style="padding:20px 0"><div class="empty-icon">📝</div>还没有随笔</div>
            <div v-for="e in state.essays" :key="e.id" class="etl-item" :class="{ active: currentEssay?.id === e.id }" @click="openEssay(e)">
              <div class="etl-date">{{ fmtDate(e.date) }} {{ e.mood }}{{ !e.submitted ? ' ✏️' : '' }}</div>
              <div class="etl-title">{{ e.title || '草稿…' }}</div>
            </div>
          </div>
        </div>
        <div>
          <div v-if="!currentEssay" class="card" style="text-align:center;color:var(--t4);padding:60px 20px"><div style="font-size:32px;margin-bottom:10px">📖</div><div>选择一篇随笔，或新建一篇</div></div>
          <div v-else-if="currentEssay.submitted" class="card cp">
            <div class="essay-view-title">{{ currentEssay.title || '无题' }}</div>
            <div class="essay-view-meta"><span>{{ currentEssay.mood }}</span><span>{{ fmtDate(currentEssay.date) }}</span><span>{{ (currentEssay.content || '').replace(/\s/g, '').length }} 字</span></div>
            <div class="md-body" v-html="marked.parse(currentEssay.content || '')"></div>
          </div>
          <div v-else class="card cp">
            <input class="essay-title-inp" v-model="currentEssay.title" placeholder="标题…" maxlength="60" @blur="saveWithToast" />
            <div style="margin:12px 0 8px;display:flex;align-items:center;gap:12px;flex-wrap:wrap"><span style="font-size:12px;color:var(--t3)">心情</span><div class="mood-row"><button v-for="m in MOODS" :key="m" class="mood-btn" :class="{ on: currentEssay.mood === m }" @click="currentEssay.mood = m; saveWithToast()">{{ m }}</button></div></div>
            <div style="margin:12px 0 8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <span style="font-size:12px;color:var(--t3)">标签</span>
              <div style="display:flex;gap:6px;flex-wrap:wrap;flex:1">
                <input v-model="essayTagInput" @keydown.enter="addEssayTag" placeholder="输入标签后按Enter" style="font-size:12px;padding:4px 8px;border:1px solid var(--bd);border-radius:4px;background:var(--sur);color:var(--t1);flex:1;min-width:100px" />
                <div style="display:flex;gap:4px;flex-wrap:wrap">
                  <span v-for="(tag, i) in currentEssay.tags" :key="i" class="essay-tag">
                    {{ tag }}
                    <button @click="removeEssayTag(i)" style="background:none;border:none;color:inherit;cursor:pointer;margin-left:4px;font-size:11px">✕</button>
                  </span>
                </div>
              </div>
            </div>
            <textarea class="essay-ta" v-model="currentEssay.content" placeholder="支持 Markdown 语法…" @blur="saveWithToast"></textarea>
            <div class="fb" style="margin-top:10px"><span style="font-size:11px;color:var(--t4);font-family:monospace">{{ (currentEssay.content || '').replace(/\s/g, '').length }} 字 · 提交后不可修改</span><div style="display:flex;gap:8px"><button class="btn btn-g btn-sm" @click="deleteEssay">删除草稿</button><button class="btn btn-p btn-sm" @click="submitEssay">提交随笔</button></div></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Achievements Page -->
  <div class="page" :class="{ active: currentPage === 'achievements' }">
    <div class="wrap">
      <div class="mb24"><div class="page-title">成就殿堂</div><div class="page-sub">每一步都值得被铭记</div></div>
      <div class="ach-tabs">
        <button class="ach-tab" :class="{ active: achFilter === 'all' }" @click="achFilter = 'all'">全部</button>
        <button class="ach-tab" :class="{ active: achFilter === 'adventure' }" @click="achFilter = 'adventure'">历险</button>
        <button class="ach-tab" :class="{ active: achFilter === 'walk' }" @click="achFilter = 'walk'">散步</button>
        <button class="ach-tab" :class="{ active: achFilter === 'movie' }" @click="achFilter = 'movie'">电影</button>
        <button class="ach-tab" :class="{ active: achFilter === 'read' }" @click="achFilter = 'read'">读书</button>
        <button class="ach-tab" :class="{ active: achFilter === 'guitar' }" @click="achFilter = 'guitar'">指弹</button>
      </div>
      <div class="ach-grid">
        <div v-for="a in (achFilter === 'all' ? sortedAchievements : ACHIEVEMENTS[achFilter] || [])" :key="a.id" class="ach-card" :class="{ unlocked: state.unlockedAchievements.includes(a.id), locked: !state.unlockedAchievements.includes(a.id) }">
          <div class="ach-shine"></div><div class="ach-icon">{{ a.icon }}</div><div class="ach-name">{{ a.name }}</div><div class="ach-desc">{{ a.desc }}</div>
          <div class="ach-progress"><div class="ach-progress-bar"><div class="ach-progress-fill" :style="{ width: Math.min(100, ((a.id.startsWith('r') ? getAdvCounts(state).read : a.id.startsWith('m') ? getAdvCounts(state).movie : a.id.startsWith('g') ? getAdvCounts(state).guitar : a.id.startsWith('w') ? getAdvCounts(state).walk : state.adventures.length) || 0) / a.req * 100) + '%' }"></div></div><div class="ach-progress-text">{{ (a.id.startsWith('r') ? getAdvCounts(state).read : a.id.startsWith('m') ? getAdvCounts(state).movie : a.id.startsWith('g') ? getAdvCounts(state).guitar : a.id.startsWith('w') ? getAdvCounts(state).walk : state.adventures.length) || 0 }}/{{ a.req }}</div></div>
          <div v-if="state.unlockedAchievements.includes(a.id)" class="ach-unlock-date">✓ 已解锁</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Shop Page -->
  <div class="page" :class="{ active: currentPage === 'shop' }">
    <div class="wrap">
      <div class="mb24"><div class="page-title">商店</div><div class="page-sub">用金币换取现实中的美好</div></div>
      <div class="char-coin-row"><div class="coin-display" v-html="coinDisplay"></div><div style="font-size:12px;color:var(--t3)">每获得 1 XP 可获得 1 金币，随笔产生的 XP 除外。</div></div>
      <div class="shop-grid">
        <div v-for="item in COIN_ITEMS" :key="item.id" class="shop-card" :class="{ owned: state.hero.purchasedItems?.includes(item.id) }">
          <div class="shop-card-icon">{{ item.icon }}</div><div class="shop-card-name">{{ item.name }}</div><div class="shop-card-real">现实价值 {{ item.realValue }}</div>
          <div class="shop-card-price" v-html="COIN_SVG + ' <strong>' + item.price.toLocaleString() + '</strong>'"></div>
          <div style="font-size:11px;color:var(--t4);margin-bottom:12px">{{ item.desc }}</div>
          <button v-if="state.hero.purchasedItems?.includes(item.id)" class="btn btn-sm shop-card-btn" disabled>✓ 已拥有</button>
          <button v-else class="btn btn-sm shop-card-btn" :class="state.hero.coin >= item.price ? 'btn-p' : 'btn-g'" :disabled="state.hero.coin < item.price" @click="buyItem(item)">{{ state.hero.coin >= item.price ? '购买' : '金币不足' }}</button>
        </div>
      </div>
      <div style="margin-top:40px;padding-top:24px;border-top:1px solid var(--bd)">
        <div class="page-title" style="font-size:16px;margin-bottom:16px">账户明细</div>
        <div v-if="!state.hero.purchaseHistory?.length" style="text-align:center;color:var(--t4);padding:20px">暂无购买记录</div>
        <div v-else style="max-height:300px;overflow-y:auto">
          <div v-for="h in state.hero.purchaseHistory" :key="h.date + h.name" style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--bd)">
            <span style="font-size:20px">{{ h.icon }}</span>
            <div style="flex:1"><div style="font-size:14px;color:var(--t1)">{{ h.name }}</div><div style="font-size:11px;color:var(--t4)">{{ h.date }}</div></div>
            <div style="font-size:13px;color:var(--t3)">-{{ h.price.toLocaleString() }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Settings Page -->
  <div class="page" :class="{ active: currentPage === 'settings' }">
    <div class="wrap">
      <div class="mb24"><div class="page-title">设置</div><div class="page-sub">个性化你的历险</div></div>
      <div style="max-width:600px;display:flex;flex-direction:column;gap:20px">
        <div class="card cp">
          <div class="set-sec-title">个人信息</div>
          <div class="set-row"><div><div class="set-label">角色名</div><div class="set-desc">显示在账户按钮中</div></div><input class="inp" v-model="state.hero.name" style="width:180px" maxlength="20" @blur="saveWithToast" /></div>
          <div class="set-row"><div><div class="set-label">储蓄</div><div class="set-desc">当前拥有的现实资金</div></div><div style="display:flex;align-items:center;gap:8px"><span style="font-size:12px;color:var(--t3)">¥</span><input class="inp" type="number" v-model.number="state.hero.realMoney" style="width:100px" min="0" placeholder="0" @blur="saveWithToast" /></div></div>
        </div>
        <div class="card cp">
          <div class="set-sec-title">历险类型管理</div>
          <div style="font-size:12px;color:var(--t3);margin-bottom:12px">点击「展示」可将该类型固定到角色页面</div>
          <div v-for="t in state.advTypes" :key="t.id" class="at-row"><span class="at-emoji">{{ t.emoji }}</span><span class="at-name">{{ t.name }}</span><span class="at-xp" style="min-width:70px;text-align:right">+{{ t.xpMin }}~{{ t.xpMax }} XP</span><button class="at-pin" :class="{ on: t.pinned }" @click="togglePin(t.id)">{{ t.pinned ? '✓ 展示中' : '展示' }}</button></div>
          <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--bd)">
            <div style="font-size:12px;color:var(--t3);margin-bottom:10px">添加新历险类型</div>
            <div class="at-add-row">
              <input class="inp inp-h" v-model="newTypeEmoji" placeholder="🎯" style="width:28px;text-align:center" maxlength="2" />
              <input class="inp inp-h" v-model="newTypeName" placeholder="类型名称" maxlength="12" style="flex:4;min-width:100px" />
              <input class="inp inp-h" type="number" v-model.number="newTypeXpMin" placeholder="最小" min="1" style="width:48px;text-align:center" />
              <input class="inp inp-h" type="number" v-model.number="newTypeXpMax" placeholder="最大" min="1" style="width:48px;text-align:center" />
              <button class="btn btn-p btn-sm" @click="addAdvType">添加</button>
            </div>
          </div>
        </div>
        <div class="card cp">
          <div class="set-sec-title">外观</div>
          <div class="set-row"><div style="min-width:80px"><div class="set-label">主题</div></div>
            <div class="custom-select" style="width:100px;margin-left:auto">
              <button class="custom-select-btn" :class="{ open: themeOpen }" @click="toggleThemeDropdown" style="width:100%">
                <span>{{ { auto: '自适应', light: '浅色', dark: '深色' }[state.theme] }}</span>
              </button>
              <div class="custom-select-menu" :class="{ open: themeOpen }">
                <div class="custom-select-item" :class="{ selected: state.theme === 'auto' }" @click="selectTheme('auto')">自适应</div>
                <div class="custom-select-item" :class="{ selected: state.theme === 'light' }" @click="selectTheme('light')">浅色</div>
                <div class="custom-select-item" :class="{ selected: state.theme === 'dark' }" @click="selectTheme('dark')">深色</div>
              </div>
            </div>
          </div>
        </div>
        <div class="card cp">
          <div class="set-sec-title">数据</div>
          <div class="set-row"><div><div class="set-label">导出备份</div><div class="set-desc">导出为 JSON / Markdown / ZIP</div></div><div style="display:flex;gap:6px"><button class="btn btn-g btn-sm" @click="exportJson">📄 JSON</button><button class="btn btn-g btn-sm" @click="exportMarkdown">📝 MD</button><button class="btn btn-g btn-sm" @click="exportZip">📦 ZIP</button></div></div>
          <div class="set-row"><div><div class="set-label">导入数据</div><div class="set-desc">导入 JSON 文件或 Markdown 随笔</div></div><button class="btn btn-g btn-sm" @click="triggerImport">📥 导入</button></div>
          <div class="set-row"><div><div class="set-label">清除所有数据</div><div class="set-desc" style="color:#c0392b">不可撤销</div></div><button class="btn btn-sm btn-danger" @click="clearData">永久清除</button></div>
        </div>
      </div>
    </div>
  </div>

  <footer>© 2026 <a href="https://github.com/freepotato" target="_blank">Florian Chen</a>. Break the cycle. Forge your life.</footer>

  <div class="dlg-overlay" :class="{ open: dialogOpen }" @click.self="closeDialog">
    <div class="dlg"><div class="dlg-title" v-html="dialogTitle"></div><div class="dlg-body" v-html="dialogBody"></div><div class="dlg-actions"><button v-for="(action, i) in dialogActions" :key="i" class="btn btn-sm" :class="action.cls" @click="action.fn ? (action.fn(), closeDialog()) : closeDialog()">{{ action.label }}</button></div></div>
  </div>

  
</template>

<style>
.btn-dg { background: #c0392b !important; color: #fff !important; }
.shop-card-btn {justify-content: center; align-items: center; }
</style>

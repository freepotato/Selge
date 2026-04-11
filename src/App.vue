<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import JSZip from 'jszip'
import { useStore } from './stores/cloudStore.js'
import { getMe, loadData, saveData, uploadImage, getSignedUrl, getSignedUrls } from './utils/authApi.js'

const { state, XP_TABLE, ACHIEVEMENTS, COIN_SVG, COIN_ITEMS, DAILY_QUOTES, load, save, autoSave, uid, today, fmtDate, randInt, getLevel, getLevelTitle, getAdvCounts } = useStore()

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
const achFilter = ref('all')
const newAdvTitle = ref('')
const newAdvType = ref('at3')
const newTypeEmoji = ref('')
const newTypeName = ref('')
const newTypeXpMin = ref('')
const advFilterType = ref('all')
const advPage = ref(1)
const advPerPage = 10
const editingAdvId = ref(null)
const editingAdvTitle = ref('')
// Vault
const vaultCat = ref('vc_vault')
const vaultPage = ref(1)
const vaultPerPage = 8
const vaultDetailId = ref(null)
const vaultViewerIdx = ref(null)
const vaultImgUrls = ref({}) // path → signed URL
const vaultAddCatShow = ref(false)
const vaultNewCatName = ref('')
const vaultUploadingId = ref(null)

// 热力图悬浮框
const tooltip = ref(null)
const tooltipVisible = ref(false)
const tooltipContent = ref('')
const tooltipX = ref(0)
const tooltipY = ref(0)

const vaultDetailItem = computed(() => state.vault.items.find(i => i.id === vaultDetailId.value))

function openVaultViewer(idx) { vaultViewerIdx.value = idx }
function closeVaultViewer() { vaultViewerIdx.value = null }
function prevVaultImg() {
  if (vaultViewerIdx.value === null || !vaultDetailItem.value?.images?.length) return
  if (vaultViewerIdx.value > 0) vaultViewerIdx.value--
}
function nextVaultImg() {
  if (vaultViewerIdx.value === null || !vaultDetailItem.value?.images?.length) return
  if (vaultViewerIdx.value < vaultDetailItem.value.images.length - 1) vaultViewerIdx.value++
}

// 触摸滑动
const viewerTouchX = ref(0)
function viewerTouchStart(e) { viewerTouchX.value = e.touches[0].clientX }
function viewerTouchEnd(e) {
  const dx = e.changedTouches[0].clientX - viewerTouchX.value
  if (Math.abs(dx) > 50) { dx > 0 ? prevVaultImg() : nextVaultImg() }
}

function toggleVaultCat(catId) {
  if (!vaultDetailItem.value) return
  vaultDetailItem.value.catId = vaultDetailItem.value.catId === catId ? null : catId
  saveWithToast()
}

function deleteVaultItemById() {
  const item = vaultDetailItem.value
  if (!item) return
  const isEmpty = !item.name?.trim() && !(item.images?.length)
  if (isEmpty) {
    state.vault.items = state.vault.items.filter(x => x.id !== item.id)
    vaultDetailId.value = null
    return
  }
  showDialog({
    title: '删除项目',
    body: `确定删除「${item.name || '未命名'}」？`,
    actions: [
      { label: '取消', cls: 'btn-g' },
      { label: '删除', cls: 'btn-dg', fn: () => {
        state.vault.items = state.vault.items.filter(x => x.id !== item.id)
        vaultDetailId.value = null
        if (vaultPage.value > vaultTotalPages.value) vaultPage.value = vaultTotalPages.value
        saveWithToast()
        showToast('项目已删除', 'green')
      }}
    ]
  })
}

function removeVaultImage(item, idx) {
  item.images.splice(idx, 1)
  saveWithToast()
}

function triggerVaultUpload(itemId) {
  vaultUploadingId.value = itemId
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/jpeg,image/png,image/webp'
  input.multiple = true
  input.onchange = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    const item = state.vault.items.find(x => x.id === itemId)
    if (!item) return
    let uploaded = 0
    for (const file of files) {
      try {
        const result = await uploadImage(file, `vault/${itemId}`)
        // 新版：result.path 是 R2 对象路径，不是完整 URL
        if (result.success && result.path) {
          item.images.push(result.path)
          // 立即获取签名 URL 并缓存
          getCachedSignedUrl(result.path).then(url => {
            if (url) vaultImgUrls.value = { ...vaultImgUrls.value, [result.path]: url }
          })
          uploaded++
        } else {
          showToast(`上传失败: ${file.name}`, 'red')
        }
      } catch (err) {
        console.error('Upload failed:', err)
        showToast(`上传失败: ${file.name}`, 'red')
      }
    }
    vaultUploadingId.value = null
    if (uploaded > 0) { saveWithToast(); showToast(`已上传 ${uploaded} 张图片`, 'green') }
  }
  input.click()
}
const newTypeXpMax = ref('')
const advTypeOpen = ref(false)
const themeOpen = ref(false)

function login() {
  window.location.href = '/api/login'
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

// 页面加载时
onMounted(async () => {
  // 获取用户信息
  try {
    const me = await getMe()
    user.value = me
    if (me.authenticated) {
      // 已登录，从云端加载数据（会先读取 localStorage 缓存）
      await load()
    }
  } catch (e) {
    console.error('获取用户信息失败:', e)
  }

  // 数据加载完成，显示界面
  document.getElementById('app')?.classList.add('ready')

  applyTheme(state.theme)
  if (state.advTypes.length > 0) newAdvType.value = state.advTypes[0].id

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-select')) {
      advTypeOpen.value = false
      themeOpen.value = false
    }
  })
})

// 全局键盘事件 - 图片查看器
function handleKeydown(e) {
  if (vaultViewerIdx.value === null) return
  if (e.key === 'ArrowLeft') { prevVaultImg(); e.preventDefault() }
  else if (e.key === 'ArrowRight') { nextVaultImg(); e.preventDefault() }
  else if (e.key === 'Escape') { closeVaultViewer(); e.preventDefault() }
}
onMounted(() => { document.addEventListener('keydown', handleKeydown) })
onBeforeUnmount(() => { document.removeEventListener('keydown', handleKeydown) })

// 热力图悬浮框函数
function showHeatmapTooltip(event, date) {
  const count = heatmapData.value.countMap[heatmapData.value.localDateStr(date)] || 0
  const dateStr = date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
  tooltipContent.value = `${dateStr} · ${count} 次历险`
  moveHeatmapTooltip(event)
  tooltipVisible.value = true
}

function moveHeatmapTooltip(event) {
  // 计算悬浮框位置，使其显示在鼠标上方
  const rect = event.target.getBoundingClientRect()
  tooltipX.value = event.clientX - 50 // 居中显示
  tooltipY.value = event.clientY - 40 // 显示在上方
}

function hideHeatmapTooltip() {
  tooltipVisible.value = false
}

function applyTheme(t) {
  state.theme = t
  const html = document.documentElement
  if (t === 'light') html.setAttribute('data-theme', 'light')
  else if (t === 'dark') html.setAttribute('data-theme', 'dark')
  else html.setAttribute('data-theme', window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
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
  saveWithToast()
}

function switchPage(name) {
  currentPage.value = name
  // 进入仓库页面时预热签名 URL
  if (name === 'vault') {
    const allPaths = state.vault.items.flatMap(i => (i.images || []).map(img => {
      if (img.startsWith && img.startsWith('http')) return null
      return img
    })).filter(Boolean)
    warmSignedUrls(allPaths)
  }
}

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
  const allAchs = [...ACHIEVEMENTS.read, ...ACHIEVEMENTS.movie, ...ACHIEVEMENTS.guitar, ...ACHIEVEMENTS.walk, ...ACHIEVEMENTS.adventure]
  // 已解锁的在前，按 id 排序（最新的在前）
  const unlocked = allAchs.filter(a => isAchievementUnlocked(a.id)).reverse()
  const locked = allAchs.filter(a => !isAchievementUnlocked(a.id))
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
    html += `<div class="quote-item"><div class="quote-item-text">"${DAILY_QUOTES[dayIdx]}"</div><div class="quote-item-date">${pastDate.getFullYear()}-${String(pastDate.getMonth()+1).padStart(2,'0')}-${String(pastDate.getDate()).padStart(2,'0')}</div></div>`
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
    const yd = new Date(Date.now() - 86400000)
    const yest = yd.getFullYear() + '-' + String(yd.getMonth()+1).padStart(2,'0') + '-' + String(yd.getDate()).padStart(2,'0')
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
  const allAchs = [...ACHIEVEMENTS.read, ...ACHIEVEMENTS.movie, ...ACHIEVEMENTS.guitar, ...ACHIEVEMENTS.walk, ...ACHIEVEMENTS.adventure]
  allAchs.forEach(a => {
    const reqKey = a.id.startsWith('r') ? 'read' : a.id.startsWith('m') ? 'movie' : a.id.startsWith('g') ? 'guitar' : a.id.startsWith('w') ? 'walk' : 'total'
    const currentCount = reqKey === 'total' ? state.adventures.length : (counts[reqKey] || 0)
    if (currentCount >= a.req && !isAchievementUnlocked(a.id)) {
      state.unlockedAchievements.push({ id: a.id, date: today() })
      showToast(`成就解锁：${a.name}`, 'gold', a.icon)
    }
  })
}

// 兼容旧数据（字符串数组）和新数据（对象数组）
function isAchievementUnlocked(aid) {
  return state.unlockedAchievements.some(a => typeof a === 'string' ? a === aid : a.id === aid)
}

function getAchievementUnlockDate(aid) {
  const entry = state.unlockedAchievements.find(a => typeof a === 'string' ? false : a.id === aid)
  return entry?.date || null
}

const filteredAdventures = computed(() => {
  if (advFilterType.value === 'all') return state.adventures
  return state.adventures.filter(a => a.typeId === advFilterType.value)
})
const advTotalPages = computed(() => Math.max(1, Math.ceil(filteredAdventures.value.length / advPerPage)))
const pagedAdventures = computed(() => {
  const start = (advPage.value - 1) * advPerPage
  return filteredAdventures.value.slice(start, start + advPerPage)
})

function startEditAdv(a) {
  editingAdvId.value = a.id
  editingAdvTitle.value = a.title
}
function cancelEditAdv() {
  editingAdvId.value = null
  editingAdvTitle.value = ''
}
function saveEditAdv(a) {
  const t = editingAdvTitle.value.trim()
  if (!t) return
  a.title = t
  editingAdvId.value = null
  editingAdvTitle.value = ''
  saveWithToast()
  showToast('历险已更新', 'green')
}
function deleteAdventure(a) {
  showDialog({
    title: '删除历险',
    body: `确定删除「${a.title}」？`,
    actions: [
      { label: '取消', cls: 'btn-g' },
      { label: '删除', cls: 'btn-dg', fn: () => {
        state.adventures = state.adventures.filter(x => x.id !== a.id)
        // 扣除对应的 XP 和金币
        state.hero.xp = Math.max(0, state.hero.xp - a.xp)
        state.hero.coin = Math.max(0, state.hero.coin - a.xp)
        if (advPage.value > advTotalPages.value) advPage.value = advTotalPages.value
        saveWithToast()
        showToast('历险已删除', 'green')
      }}
    ]
  })
}

// Vault functions
// 旧 R2 域名（仅用于迁移：检测旧格式 URL 并提取 path）
const R2_URL = 'https://pub-6cfc9e286538487c9b53729cec446578.r2.dev'

// 预签名 URL 缓存（path → url），60 分钟有效期
const signedUrlCache = new Map()
const _signQueue = new Map()
const CACHE_TTL_MS = 50 * 60 * 1000

async function getCachedSignedUrl(path) {
  if (!path) return null
  // 旧格式 URL 直接返回
  if (path.startsWith('http')) return path
  const cached = signedUrlCache.get(path)
  if (cached && cached.expiresAt > Date.now()) return cached.url
  if (_signQueue.has(path)) return _signQueue.get(path)
  const promise = (async () => {
    const res = await fetch(`/api/images/sign?path=${encodeURIComponent(path)}&expires=3600`)
    if (!res.ok) return null
    const { url } = await res.json()
    if (url) signedUrlCache.set(path, { url, expiresAt: Date.now() + CACHE_TTL_MS })
    return url
  })()
  _signQueue.set(path, promise)
  const result = await promise
  _signQueue.delete(path)
  return result
}

// 批量预热签名 URL
async function warmSignedUrls(paths) {
  const unique = [...new Set(paths.filter(p => p && !p.startsWith('http')))]
  if (!unique.length) return
  const res = await fetch('/api/images/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paths: unique, expiresIn: 3600 })
  })
  if (res.ok) {
    const { results } = await res.json()
    for (const { path, url } of results) {
      if (url) signedUrlCache.set(path, { url, expiresAt: Date.now() + CACHE_TTL_MS })
    }
  }
}

// 把 vault item.images 里的值规范化为 path（用于兼容旧数据）
function toVaultPath(value) {
  if (!value) return null
  if (typeof value === 'string' && value.startsWith('http')) {
    if (value.startsWith(R2_URL)) return value.slice(R2_URL.length + 1)
    return null
  }
  return value
}

// 从 path 获取展示用的 URL（签名或旧 URL）
async function getVaultImgUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  return await getCachedSignedUrl(path)
}

// 同步获取 vault 图片 URL（返回缓存值，触发异步预加载）
function vaultUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path // 旧数据
  return vaultImgUrls.value[path] || null // null 表示加载中
}

function addVaultCat() {
  const name = vaultNewCatName.value.trim()
  if (!name) return
  const id = 'vc_' + uid()
  state.vault.categories.push({ id, name, locked: false })
  vaultNewCatName.value = ''
  vaultAddCatShow.value = false
  saveWithToast()
  showToast('分类已添加', 'green')
}

function deleteVaultCat(cat) {
  if (cat.locked) return
  showDialog({
    title: '删除分类',
    body: `确定删除「${cat.name}」分类？该分类下的项目不会被删除，将移至第一个分类。`,
    actions: [
      { label: '取消', cls: 'btn-g' },
      { label: '删除', cls: 'btn-dg', fn: () => {
        const firstCatId = state.vault.categories[0].id
        state.vault.items.forEach(item => {
          if (item.catId === cat.id) item.catId = firstCatId
        })
        state.vault.categories = state.vault.categories.filter(c => c.id !== cat.id)
        if (vaultCat.value === cat.id) { vaultCat.value = state.vault.categories[0].id; vaultPage.value = 1 }
        saveWithToast()
        showToast('分类已删除', 'green')
      }}
    ]
  })
}

function addVaultItem() {
  const item = { id: uid(), catId: null, name: '', images: [], date: today(), ts: Date.now() }
  state.vault.items.unshift(item)
  vaultDetailId.value = item.id
  vaultPage.value = 1
  saveWithToast()
}

const vaultFilteredItems = computed(() => {
  if (vaultCurrentCat.value?.isAll) return state.vault.items
  return state.vault.items.filter(i => i.catId === vaultCat.value)
})

const vaultCurrentCat = computed(() => state.vault.categories.find(c => c.id === vaultCat.value))
const vaultTotalPages = computed(() => Math.max(1, Math.ceil(vaultFilteredItems.value.length / vaultPerPage)))
const vaultPagedItems = computed(() => {
  const start = (vaultPage.value - 1) * vaultPerPage
  return vaultFilteredItems.value.slice(start, start + vaultPerPage)
})

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
  // 辅助：本地日期转 YYYY-MM-DD（避免 toISOString 的 UTC 偏移）
  function localDateStr(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  }
  while (cur <= todayD) {
    const col = []
    for (let d = 0; d < 7; d++) { col.push(new Date(cur)); cur.setDate(cur.getDate() + 1) }
    cols.push(col)
  }
  const maxC = Math.max(1, ...Object.values(countMap))
  function lv(n) { if (!n) return 0; if (n <= maxC * .25) return 1; if (n <= maxC * .5) return 2; if (n <= maxC * .75) return 3; return 4 }
  return { cols, countMap, lv, todayD, localDateStr }
})

const recentActivity = computed(() => {
  return [...state.adventures.map(a => ({ ts: a.ts, type: 'adv', data: a }))]
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
        if (!state.hero.purchaseHistory) state.hero.purchaseHistory = []
        state.hero.purchaseHistory.unshift({ icon: item.icon, name: item.name, price: item.price, date: fmtDate(today()) })
        saveWithToast()
        showToast(`恭喜获得 ${item.name}！`, 'green', item.icon)
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
<p style="margin-bottom:16px">我搜索了大量的资料，发现这可以归纳为一种简单而确定的模式：我们花费很少的精力，就能从游戏、短视频等现代产物中获取很大的满足，它是一个安全而且确定的奖励机制。但是这个奖励机制只能让我们沉迷于对我们的人生并无裨益的事情中，并不会产生现实成长。于是，我开始尝试创建一套属于我的人生的奖励机制。</p>
<p style="margin-bottom:16px">通过跟AI反复辩论，我明白了我要做的东西：一个Life RPG模拟器。幸运的是，网上已经有类似的产品，可惜不幸的是，它们要么没有我想要的功能，要么收费极贵（Youtube上几十万播放的一个notion life rpg模板，基础版就要收费69美刀）。于是，Selge应运而生：一个基于Vue，用Cloudflare Pages搭建的开源Life RPG模拟器。</p>
<p style="margin-bottom:16px">过去无数个瞬间我都在想，假如我的人生是个游戏就好了，我猜你也这么想过。<strong>现在，不再想象，让我们付诸实践吧——路，就在脚下。</strong></p>
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
    unlockedAchievements: state.unlockedAchievements,
    theme: state.theme
  }, null, 2))
  const content = await zip.generateAsync({ type: 'blob' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(content)
  a.download = `selge-backup-${today()}.zip`
  a.click()
  showToast('已导出 ZIP（含 JSON）', 'green', '📦')
}

function exportJson() {
  const data = { 
    hero: state.hero, 
    advTypes: state.advTypes, 
    adventures: state.adventures, 
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

function triggerImport() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
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
              if (p.unlockedAchievements) {
                const existingIds = new Set(state.unlockedAchievements.map(a => typeof a === 'string' ? a : a.id))
                const newAchs = (p.unlockedAchievements || []).map(a => typeof a === 'string' ? { id: a, date: null } : a).filter(a => !existingIds.has(a.id))
                state.unlockedAchievements = [...state.unlockedAchievements, ...newAchs]
              }
              if (p.theme) state.theme = p.theme
              saveWithToast()
              showToast(`已导入 ${newAdvs.length} 条历险`, 'green', '📥')
            } else {
              showToast('JSON 格式不正确', 'warn')
            }
          } catch (err) {
            showToast('JSON 解析失败', 'warn')
          }
        }
        reader.readAsText(file)
      }
    }
  }
  input.click()
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
        <button class="nav-tab" :class="{ active: currentPage === 'vault' }" @click="switchPage('vault')">仓库</button>
        <button class="nav-tab" :class="{ active: currentPage === 'shop' }" @click="switchPage('shop')">商店</button>
        <button class="nav-tab" :class="{ active: currentPage === 'achievements' }" @click="switchPage('achievements')">成就</button>
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
      <button class="mob-menu-item" :class="{ active: currentPage === 'vault' }" @click="switchPage('vault'); mobileMenuOpen = false">仓库</button>
      <button class="mob-menu-item" :class="{ active: currentPage === 'shop' }" @click="switchPage('shop'); mobileMenuOpen = false">商店</button>
      <button class="mob-menu-item" :class="{ active: currentPage === 'achievements' }" @click="switchPage('achievements'); mobileMenuOpen = false">成就</button>
      <button class="mob-menu-item" :class="{ active: currentPage === 'settings' }" @click="switchPage('settings'); mobileMenuOpen = false">设置</button>
    </div>
  </div>

  <div id="toastWrap">
    <div v-for="t in toasts" :key="t.id" class="toast" :class="t.type">
      <span v-if="t.icon">{{ t.icon }}</span>
      <span>{{ t.msg }}</span>
    </div>
  </div>

  <!-- 热力图悬浮框 -->
  <div 
    ref="tooltip" 
    class="heatmap-tooltip" 
    :class="{ show: tooltipVisible }"
    :style="{
      left: tooltipX + 'px',
      top: tooltipY + 'px'
    }"
  >
    {{ tooltipContent }}
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
          <div class="sec-label" style="transform: translateY(8px);">历险热力图</div>
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
                  <div 
                    v-for="(d, j) in col" 
                    :key="j" 
                    class="hm-cell" 
                    :data-l="heatmapData.lv(heatmapData.countMap[heatmapData.localDateStr(d)] || 0)" 
                    :style="{ opacity: d > heatmapData.todayD ? 0.3 : 1 }"
                    @mouseenter="showHeatmapTooltip($event, d)"
                    @mousemove="moveHeatmapTooltip($event)"
                    @mouseleave="hideHeatmapTooltip()"
                  ></div>
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
        <div style="padding-bottom:12px;border-bottom:1px solid var(--bd);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="hm-range-btn" :class="{ active: advFilterType === 'all' }" @click="advFilterType = 'all'; advPage = 1">全部</button>
            <button v-for="t in state.advTypes" :key="t.id" class="hm-range-btn" :class="{ active: advFilterType === t.id }" @click="advFilterType = t.id; advPage = 1">{{ t.emoji }} {{ t.name }}</button>
          </div>
          <span style="font-size:12px;color:var(--t3);font-family:monospace">{{ filteredAdventures.length }} 次</span>
        </div>
        <div v-if="!filteredAdventures.length" class="empty" style="padding-top:24px"><div class="empty-icon">🗺️</div>没有匹配的历险记录</div>
        <div v-else style="padding-top:12px">
          <div v-for="a in pagedAdventures" :key="a.id" class="adv-item">
            <span class="adv-badge">{{ state.advTypes.find(t => t.id === a.typeId)?.emoji || '📌' }} {{ state.advTypes.find(t => t.id === a.typeId)?.name || '历险' }}</span>
            <div class="adv-content">
              <div v-if="editingAdvId === a.id" class="adv-edit-row">
                <input class="inp inp-h" v-model="editingAdvTitle" style="flex:1;min-width:100px" @keydown.enter="saveEditAdv(a)" @keydown.escape="cancelEditAdv" />
                <button class="btn btn-p btn-sm" style="flex-shrink:0" @click="saveEditAdv(a)">✓</button>
                <button class="btn btn-g btn-sm" style="flex-shrink:0" @click="cancelEditAdv">✕</button>
              </div>
              <div v-else>
                <div class="adv-title">{{ a.title }}</div>
                <div class="adv-meta"><span>{{ fmtDate(a.date) }}</span><span class="adv-xp">+{{ a.xp }} XP</span></div>
              </div>
            </div>
            <div v-if="editingAdvId !== a.id" class="adv-actions">
              <button class="adv-act-btn" @click="startEditAdv(a)" title="编辑">✏️</button>
              <button class="adv-act-btn" @click="deleteAdventure(a)" title="删除">🗑️</button>
            </div>
          </div>
          <div v-if="advTotalPages > 1" class="adv-pagination">
            <button class="btn btn-g btn-sm" :disabled="advPage <= 1" @click="advPage--">上一页</button>
            <span style="font-size:12px;color:var(--t3)">{{ advPage }} / {{ advTotalPages }}</span>
            <button class="btn btn-g btn-sm" :disabled="advPage >= advTotalPages" @click="advPage++">下一页</button>
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
        <div v-for="a in (achFilter === 'all' ? sortedAchievements : ACHIEVEMENTS[achFilter] || [])" :key="a.id" class="ach-card" :class="{ unlocked: isAchievementUnlocked(a.id), locked: !isAchievementUnlocked(a.id) }">
          <div class="ach-shine"></div><div class="ach-icon">{{ a.icon }}</div><div class="ach-name">{{ a.name }}</div><div class="ach-desc">{{ a.desc }}</div>
          <div class="ach-progress"><div class="ach-progress-bar"><div class="ach-progress-fill" :style="{ width: Math.min(100, ((a.id.startsWith('r') ? getAdvCounts(state).read : a.id.startsWith('m') ? getAdvCounts(state).movie : a.id.startsWith('g') ? getAdvCounts(state).guitar : a.id.startsWith('w') ? getAdvCounts(state).walk : a.id.startsWith('a') ? state.adventures.length : state.adventures.length) || 0) / a.req * 100) + '%' }"></div></div><div class="ach-progress-text">{{ (a.id.startsWith('r') ? getAdvCounts(state).read : a.id.startsWith('m') ? getAdvCounts(state).movie : a.id.startsWith('g') ? getAdvCounts(state).guitar : a.id.startsWith('w') ? getAdvCounts(state).walk : a.id.startsWith('a') ? state.adventures.length : state.adventures.length) || 0 }}/{{ a.req }}</div></div>
          <div v-if="isAchievementUnlocked(a.id)" class="ach-unlock-date">✓ {{ getAchievementUnlockDate(a.id) ? fmtDate(getAchievementUnlockDate(a.id)) : '已解锁' }}</div>
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
        <div v-for="item in COIN_ITEMS" :key="item.id" class="shop-card">
          <div class="shop-card-icon">{{ item.icon }}</div><div class="shop-card-name">{{ item.name }}</div><div class="shop-card-real">现实价值 {{ item.realValue }}</div>
          <div class="shop-card-price" v-html="COIN_SVG + ' <strong>' + item.price.toLocaleString() + '</strong>'"></div>
          <div style="font-size:11px;color:var(--t4);margin-bottom:12px">{{ item.desc }}</div>
          <button class="btn btn-sm shop-card-btn" :class="state.hero.coin >= item.price ? 'btn-p' : 'btn-g'" :disabled="state.hero.coin < item.price" @click="buyItem(item)">{{ state.hero.coin >= item.price ? '购买' : '金币不足' }}</button>
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

  <!-- Vault Page -->
  <div class="page" :class="{ active: currentPage === 'vault' }">
    <div class="wrap">
      <!-- ===== 列表页 ===== -->
      <template v-if="!vaultDetailId">
        <div class="mb24"><div class="page-title">仓库</div><div class="page-sub">存放你时常回顾的图片</div></div>
        <!-- 分类切换 -->
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px">
          <button v-for="cat in state.vault.categories" :key="cat.id" class="hm-range-btn" :class="{ active: vaultCat === cat.id }" @click="vaultCat = cat.id; vaultPage = 1">
            {{ cat.name }}
          </button>
        </div>
        <!-- 添加分类 -->
        <div v-if="!vaultAddCatShow" style="margin-bottom:20px">
          <button class="btn btn-g btn-sm" @click="vaultAddCatShow = true">+ 新建分类</button>
        </div>
        <div v-else style="display:flex;gap:8px;margin-bottom:20px;align-items:center">
          <input class="inp inp-h" v-model="vaultNewCatName" placeholder="分类名称" maxlength="20" style="flex:1;min-width:120px" @keydown.enter="addVaultCat" @keydown.escape="vaultAddCatShow = false; vaultNewCatName = ''" />
          <button class="btn btn-p btn-sm" @click="addVaultCat">添加</button>
          <button class="btn btn-g btn-sm" @click="vaultAddCatShow = false; vaultNewCatName = ''">取消</button>
        </div>
        <!-- 分类标签 -->
        <div v-if="state.vault.categories.length > 1" style="margin-bottom:20px;display:flex;gap:6px;flex-wrap:wrap">
          <div v-for="cat in state.vault.categories" :key="cat.id" style="display:flex;align-items:center;gap:6px;background:var(--bg2);padding:4px 10px;border-radius:99px;font-size:12px;color:var(--t3)">
            <span>{{ cat.name }}</span>
            <button v-if="!cat.locked" class="vault-cat-del" @click="deleteVaultCat(cat)">✕</button>
          </div>
        </div>
        <!-- 内容卡片 -->
        <div class="card cp">
          <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;border-bottom:1px solid var(--bd);flex-wrap:wrap;gap:8px">
            <span style="font-size:12px;color:var(--t3);font-family:monospace">{{ vaultFilteredItems.length }} 项</span>
            <button class="btn btn-p btn-sm" @click="addVaultItem">+ 添加项目</button>
          </div>
          <div v-if="!vaultFilteredItems.length" class="empty" style="padding-top:24px"><div class="empty-icon">📂</div>暂无内容</div>
          <div v-else class="vault-grid">
            <div v-for="item in vaultPagedItems" :key="item.id" class="vault-card" @click="vaultDetailId = item.id">
              <div class="vault-card-cover">
                <img v-if="(item.images || []).length" :src="vaultUrl(item.images[0])" class="vault-card-img" loading="lazy" />
                <div v-else class="vault-card-empty">📂</div>
              </div>
              <div class="vault-card-info">
                <div class="vault-card-name">{{ item.name || '未命名' }}</div>
                <div v-if="item.catId" class="vault-card-cat">{{ state.vault.categories.find(c => c.id === item.catId)?.name || '' }}</div>
              </div>
            </div>
          </div>
          <div v-if="vaultTotalPages > 1" class="adv-pagination">
            <button class="btn btn-g btn-sm" :disabled="vaultPage <= 1" @click="vaultPage--">上一页</button>
            <span style="font-size:12px;color:var(--t3)">{{ vaultPage }} / {{ vaultTotalPages }}</span>
            <button class="btn btn-g btn-sm" :disabled="vaultPage >= vaultTotalPages" @click="vaultPage++">下一页</button>
          </div>
        </div>
      </template>

      <!-- ===== 详情页 ===== -->
      <template v-else>
        <!-- 返回按钮 -->
        <button class="vault-back-btn" @click="vaultDetailId = null">
          <span>← 返回仓库</span>
        </button>
        <div class="mb24" style="margin-top:12px"><div class="page-title">项目详情</div></div>
        <!-- 项目信息 -->
        <div class="card cp" style="margin-bottom:16px">
          <div style="margin-bottom:16px">
            <div style="font-size:12px;color:var(--t3);margin-bottom:6px">名称</div>
            <input class="inp inp-h" style="width:100%;font-size:16px;font-weight:600" :value="vaultDetailItem?.name || ''" placeholder="项目名称" maxlength="60" @blur="e => { if(vaultDetailItem) { vaultDetailItem.name = e.target.value; saveWithToast() } }" />
          </div>
          <div>
            <div style="font-size:12px;color:var(--t3);margin-bottom:8px">分类</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <button v-for="cat in state.vault.categories.filter(c => !c.isAll)" :key="cat.id" class="vault-cat-btn" :class="{ active: vaultDetailItem?.catId === cat.id }" @click="toggleVaultCat(cat.id)">{{ cat.name }}</button>
            </div>
          </div>
        </div>
        <!-- 图片区 -->
        <div class="card cp">
          <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;border-bottom:1px solid var(--bd);margin-bottom:12px">
            <span style="font-size:13px;color:var(--t3)">图片 ({{ (vaultDetailItem?.images || []).length }})</span>
            <button class="btn btn-p btn-sm" @click="triggerVaultUpload(vaultDetailId)">+ 上传图片</button>
          </div>
          <div v-if="!vaultDetailItem?.images?.length" class="empty" style="padding-top:24px"><div class="empty-icon">📷</div>暂无图片</div>
          <div v-else class="vault-detail-imgs">
            <div v-for="(img, idx) in vaultDetailItem.images" :key="idx" class="vault-detail-img-wrap">
              <img :src="vaultUrl(img)" class="vault-detail-img" loading="lazy" @click="openVaultViewer(idx)" />
              <button class="vault-img-del" @click="removeVaultImage(vaultDetailItem, idx)">✕</button>
            </div>
          </div>
        </div>
        <!-- 删除项目 -->
        <div style="margin-top:24px;text-align:center">
          <button class="btn btn-dg btn-sm" @click="deleteVaultItemById">删除项目</button>
        </div>
      </template>
    </div>
  </div>

  <!-- 图片查看器 -->
  <div v-if="vaultViewerIdx !== null && vaultDetailItem?.images?.length" class="vault-viewer-overlay" @click.self="closeVaultViewer"
    @touchstart="viewerTouchStart" @touchend="viewerTouchEnd">
    <button class="vault-viewer-close" @click="closeVaultViewer">✕</button>
    <img :src="vaultUrl(vaultDetailItem.images[vaultViewerIdx])" class="vault-viewer-img" />
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
              <input class="inp inp-h at-emoji-inp" v-model="newTypeEmoji" placeholder="🎯" maxlength="2" />
              <input class="inp inp-h" v-model="newTypeName" placeholder="类型名称" maxlength="12" />
              <input class="inp inp-h at-xp-inp" type="number" v-model.number="newTypeXpMin" placeholder="最小" min="1" />
              <input class="inp inp-h at-xp-inp" type="number" v-model.number="newTypeXpMax" placeholder="最大" min="1" />
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
          <div class="set-row"><div><div class="set-label">导出备份</div><div class="set-desc">导出为 JSON / ZIP</div></div><div style="display:flex;gap:6px"><button class="btn btn-g btn-sm" @click="exportJson">📄 JSON</button><button class="btn btn-g btn-sm" @click="exportZip">📦 ZIP</button></div></div>
          <div class="set-row"><div><div class="set-label">导入数据</div><div class="set-desc">导入 JSON 文件</div></div><button class="btn btn-g btn-sm" @click="triggerImport">📥 导入</button></div>
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
.shop-card-btn {justify-content: center; align-items: center; }
</style>

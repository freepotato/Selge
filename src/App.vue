<script setup>
import { ref, onMounted, defineAsyncComponent } from 'vue'
import { useStore } from './stores/cloudStore.js'
import { getMe } from './utils/authApi.js'
import { marked } from 'marked'

// 动态导入页面组件（懒加载）
const CharacterPage = defineAsyncComponent(() => import('./pages/CharacterPage.vue'))
const AdventurePage = defineAsyncComponent(() => import('./pages/AdventurePage.vue'))
const EssaysPage = defineAsyncComponent(() => import('./pages/EssaysPage.vue'))
const AchievementsPage = defineAsyncComponent(() => import('./pages/AchievementsPage.vue'))
const ShopPage = defineAsyncComponent(() => import('./pages/ShopPage.vue'))
const VaultPage = defineAsyncComponent(() => import('./pages/VaultPage.vue'))
const SettingsPage = defineAsyncComponent(() => import('./pages/SettingsPage.vue'))
import { PhSun, PhUser, PhUserCircle } from '@phosphor-icons/vue'



const { state, save, autoSave, load } = useStore()

// 版本号
const version = __VERSION__

// 用户认证状态
const user = ref({ authenticated: false, username: 'Guest' })

const currentPage = ref('character')
const mobileMenuOpen = ref(false)
const dialogOpen = ref(false)
const dialogTitle = ref('')
const dialogBody = ref('')
const dialogActions = ref([])
const toasts = ref([])

function login() {
  // 重定向到登录页面，添加 redirect 参数
  window.location.href = '/api/login?redirect=' + encodeURIComponent(window.location.pathname)
}

// 检查 URL 中是否有登录成功的标记
function checkLoginStatus() {
  const urlParams = new URLSearchParams(window.location.search)
  const hasLoggedIn = urlParams.has('logged_in')
  
  if (hasLoggedIn) {
    // 清除 URL 参数
    const newUrl = new URL(window.location.href)
    newUrl.searchParams.delete('logged_in')
    newUrl.searchParams.delete('dev')
    window.history.replaceState({}, '', newUrl.toString())
    
    // 立即检查登录状态
    updateUserStatus()
  }
}

// 更新用户状态
async function updateUserStatus() {
  const me = await getMe()
  if (me.authenticated) {
    user.value = { authenticated: true, username: me.username, email: me.email }
    showToast('登录成功！', 'green', '✓')
    
    // 登录成功后从云端加载数据
    try {
      await load()
      console.log('Login successful, data loaded from cloud')
    } catch (e) {
      console.error('加载云端数据失败:', e)
      showToast('登录成功但加载数据失败', 'orange', '⚠️')
    }
  }
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
  // 立即显示界面
  document.getElementById('app')?.classList.add('ready')

  applyTheme(state.theme)

  // 检查 URL 参数（处理从登录页面跳转回来的情况）
  checkLoginStatus()

  // 直接检查一次登录状态（处理 Cloudflare Access 登录后直接返回 API 的情况）
  const me = await getMe()
  if (me.authenticated && !user.value.authenticated) {
    // Cloudflare Access 登录成功，但前端状态还是未登录
    user.value = { authenticated: true, username: me.username, email: me.email }
    showToast('登录成功！', 'green', '✓')
    try {
      await load()
      console.log('Login successful, data loaded from cloud')
    } catch (e) {
      console.error('加载云端数据失败:', e)
    }
  }

  // 在后台获取用户信息和加载数据
  (async () => {
    // 获取用户信息
    try {
      const me = await getMe()
      user.value = me
      if (me.authenticated) {
        // 已登录，先加载本地缓存快速显示
        try {
          await load()
          console.log('Local data loaded')
        } catch (e) {
          console.error('加载本地数据失败:', e)
        }
        
        // 后台静默同步云端数据 - load() 函数已经包含了同步逻辑
        console.log('Data already synchronized via load()')
      }
    } catch (e) {
      console.error('获取用户信息失败:', e)
    }
  })()
})

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
}

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

function showAbout() {
  showDialog({
    title: '🌿 关于 Selge',
    body: `<div style="font-size:12px;line-height:1.9;color:var(--t2)">
<p style="margin-bottom:16px">有一天我像往常一样闲来无事打开游戏，玩了一会儿之后突然觉得内心无比空虚。我想，我不能再这样了。</p>
<p style="margin-bottom:16px">我搜索了大量的资料，发现这可以归纳为一种简单而确定的模式：我们花费很少的精力，就能从游戏、短视频等现代产物中获取很大的满足，它是一个安全而且确定的奖励机制。但是这个奖励机制只能让我们沉迷于对我们的人生并无裨益的事情中，并不会产生现实成长。于是，Selge应运而生：一个基于Vue，用Cloudflare Pages搭建的开源Life RPG模拟器。</p>
<p style="margin-bottom:16px">过去无数个瞬间我都在想，假如我的人生是个游戏就好了，我猜你也这么想过。<strong>现在，不再想象，让我们付诸实践吧——路，就在脚下。</strong></p>
<hr style="border:none;border-top:1px solid var(--bd);margin:20px 0">
<p style="font-size:12px;color:var(--t3)">Contact me:</p>
<p>Email: <a href="mailto:FlorianChen9@outlook.com">FlorianChen9@outlook.com</a></p>
<p style="font-size:12px;color:var(--t3)">Find this repo at:</p>
<p>GitHub: <a href="https://github.com/freepotato/selge" target="_blank">https://github.com/freepotato/selge</a></p></div>
<p style="font-size:12px;color:var(--t3)">Version: ${version}</p>
`,
    actions: [{ label: '继续历险', cls: 'btn-p' }]
  })
}

async function showUpdate() {
  try {
    // 使用绝对路径确保在部署后能正确获取文件
    const response = await fetch('/CHANGELOG.md')
    if (!response.ok) {
      throw new Error('Failed to fetch changelog')
    }
    let changelogContent = await response.text()

    // 删除 "## Changelog" 部分及其自动生成说明
    changelogContent = changelogContent.replace(/## Changelog[\s\S]*$/, '')

    // 使用 marked 解析 Markdown
    const htmlContent = marked.parse(changelogContent)

    showDialog({
      title: '📋 更新日志',
      body: `<div style="font-size:12px;line-height:1.6;color:var(--t2);max-height:400px;overflow-y:auto;padding-right:10px">${htmlContent}</div>`,
      actions: [{ label: '关闭', cls: 'btn-p' }]
    })
  } catch (error) {
    showDialog({
      title: '❌ 错误',
      body: `<p>无法加载更新日志: ${error.message}</p>`,
      actions: [{ label: '关闭', cls: 'btn-p' }]
    })
  }
}

// 处理来自子组件的事件
function handleShowToast(msg, type = 'green', icon = '') {
  showToast(msg, type, icon)
}

function handleShowDialog(opts) {
  showDialog(opts)
}

</script>

<template>
  <nav class="nav">
    <div class="wrap nav-inner">
      <button class="mob-menu-btn" @click="mobileMenuOpen = !mobileMenuOpen">☰</button>
      <div class="nav-logo" @click="showAbout">Selge</div>
      <div class="nav-tabs">
        <button class="nav-tab" :class="{ active: currentPage === 'character' }" @click="switchPage('character')">主页</button>
        <button class="nav-tab" :class="{ active: currentPage === 'adventure' }" @click="switchPage('adventure')">历险</button>
        <button class="nav-tab" :class="{ active: currentPage === 'essays' }" @click="switchPage('essays')">随笔</button>
        <button class="nav-tab" :class="{ active: currentPage === 'vault' }" @click="switchPage('vault')">仓库</button>
        <button class="nav-tab" :class="{ active: currentPage === 'shop' }" @click="switchPage('shop')">商店</button>
        <button class="nav-tab" :class="{ active: currentPage === 'achievements' }" @click="switchPage('achievements')">成就</button>
        <button class="nav-tab" :class="{ active: currentPage === 'settings' }" @click="switchPage('settings')">设置</button>
      </div>
      <div class="nav-right">
        <button v-if="user.authenticated" class="user-btn" @click="showLogoutConfirm">{{ state.hero.name || user.username }}</button>
        <button v-else class="btn btn-p btn-sm" @click="login"><div style="transform:translateY(12%);"><PhUserCircle :size="16" /></div>登录</button>
        <button class="theme-btn" @click="toggleTheme"><PhSun :size="16" /></button>
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
      <button class="mob-menu-item" :class="{ active: currentPage === 'character' }" @click="switchPage('character'); mobileMenuOpen = false">主页</button>
      <button class="mob-menu-item" :class="{ active: currentPage === 'adventure' }" @click="switchPage('adventure'); mobileMenuOpen = false">历险</button>
      <button class="mob-menu-item" :class="{ active: currentPage === 'essays' }" @click="switchPage('essays'); mobileMenuOpen = false">随笔</button>
      <button class="mob-menu-item" :class="{ active: currentPage === 'vault' }" @click="switchPage('vault'); mobileMenuOpen = false">仓库</button>
      <button class="mob-menu-item" :class="{ active: currentPage === 'shop' }" @click="switchPage('shop'); mobileMenuOpen = false">商店</button>
      <button class="mob-menu-item" :class="{ active: currentPage === 'achievements' }" @click="switchPage('achievements'); mobileMenuOpen = false">成就</button>
      <button class="mob-menu-item" :class="{ active: currentPage === 'settings' }" @click="switchPage('settings'); mobileMenuOpen = false">设置</button>
    </div>
  </div>

  <div id="toastWrap">
    <div v-for="t in toasts" :key="t.id" class="toast" :class="t.type">
      <!-- <span v-if="t.icon">{{ t.icon }}</span> -->
      <component v-if="t.icon" :is="t.icon" weight="fill" />
      <span>{{ t.msg }}</span>
    </div>
  </div>

  <!-- 页面组件 -->
  <CharacterPage :is-active="currentPage === 'character'" />
  <AdventurePage :is-active="currentPage === 'adventure'" @show-toast="handleShowToast" @show-dialog="handleShowDialog" />
  <EssaysPage :is-active="currentPage === 'essays'" @show-toast="handleShowToast" @show-dialog="handleShowDialog" />
  <AchievementsPage :is-active="currentPage === 'achievements'" />
  <ShopPage :is-active="currentPage === 'shop'" @show-toast="handleShowToast" @show-dialog="handleShowDialog" />
  <VaultPage :is-active="currentPage === 'vault'" @show-toast="handleShowToast" @show-dialog="handleShowDialog" />
  <SettingsPage :is-active="currentPage === 'settings'" @show-toast="handleShowToast" @show-dialog="handleShowDialog" />

  <footer>© 2026 <a href="https://github.com/freepotato" target="_blank">Florian Chen</a>. Forge your life. <a href="#" @click.prevent="showUpdate">See update</a>.</footer>

  <div class="dlg-overlay" :class="{ open: dialogOpen }" @click.self="closeDialog">
    <div class="dlg"><div class="dlg-title" v-html="dialogTitle"></div><div class="dlg-body" v-html="dialogBody"></div><div class="dlg-actions"><button v-for="(action, i) in dialogActions" :key="i" class="btn btn-sm" :class="action.cls" @click="action.fn ? (action.fn(), closeDialog()) : closeDialog()">{{ action.label }}</button></div></div>
  </div>



  
</template>

<style>
.shop-card-btn {justify-content: center; align-items: center; }
</style>

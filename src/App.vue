<template>
  <div id="app">
    <!-- Header -->
    <header class="topbar">
      <button class="menu-btn" @click="mobileMenuOpen = !mobileMenuOpen">☰</button>
      <div class="nav-logo" @click="showAbout">Selge</div>
      <div class="topbar-right">
        <div class="coin-display" v-html="coinDisplay"></div>
        <button class="user-btn" @click="showAbout">
          {{ user.authenticated ? (user.username || user.email) : '登录' }}
        </button>
      </div>
    </header>

    <!-- Navigation -->
    <nav class="nav" :class="{ open: mobileMenuOpen }">
      <button v-for="item in navItems" :key="item.page" class="nav-btn" :class="{ active: currentPage === item.page }" @click="switchPage(item.page)">
        <span class="nav-icon">{{ item.icon }}</span>
        <span class="nav-label">{{ item.label }}</span>
      </button>
    </nav>

    <!-- Page Views -->
    <main class="main">
      <CharacterView :active="currentPage === 'character'" />
      <AdventureView :active="currentPage === 'adventure'" />
      <EssaysView :active="currentPage === 'essays'" />
      <AchievementsView :active="currentPage === 'achievements'" />
      <ShopView :active="currentPage === 'shop'" />
      <VaultView :active="currentPage === 'vault'" />
      <SettingsView :active="currentPage === 'settings'" />
    </main>

    <!-- Global Image Viewer (for vault) -->
    <div v-if="vaultViewerIdx !== null && vaultViewerImages?.length" class="vault-viewer-overlay" @click.self="closeVaultViewer" @touchstart="viewerTouchStart" @touchend="viewerTouchEnd">
      <button class="vault-viewer-close" @click="closeVaultViewer">✕</button>
      <img :src="vaultViewerImages[vaultViewerIdx]" class="vault-viewer-img" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { getMe } from './utils/authApi.js'
import { useStore } from './stores/cloudStore.js'
import CharacterView from './views/CharacterView.vue'
import AdventureView from './views/AdventureView.vue'
import EssaysView from './views/EssaysView.vue'
import AchievementsView from './views/AchievementsView.vue'
import ShopView from './views/ShopView.vue'
import VaultView from './views/VaultView.vue'
import SettingsView from './views/SettingsView.vue'

const { state, COIN_SVG, applyTheme, load, saveWithToast } = useStore()

// Auth
const user = ref({ authenticated: false, username: 'Guest', email: '' })

// Navigation
const currentPage = ref('character')
const mobileMenuOpen = ref(false)

const navItems = [
  { page: 'character',  label: '角色',     icon: '🏠' },
  { page: 'adventure',  label: '历险',     icon: '🗺️' },
  { page: 'essays',     label: '随笔',     icon: '📝' },
  { page: 'achievements', label: '成就',   icon: '🏆' },
  { page: 'shop',       label: '商店',     icon: '🏪' },
  { page: 'vault',     label: '仓库',     icon: '📦' },
  { page: 'settings',  label: '设置',     icon: '⚙️' },
]

function switchPage(name) { currentPage.value = name }

// Vault Viewer
const vaultViewerIdx = ref(null)
const vaultViewerImages = ref([])
const viewerTouchX = ref(0)

function openVaultViewer(idx, images) {
  vaultViewerImages.value = images || []
  vaultViewerIdx.value = idx
}
function closeVaultViewer() { vaultViewerIdx.value = null }
function prevVaultImg() { if (vaultViewerIdx.value > 0) vaultViewerIdx.value-- }
function nextVaultImg() { if (vaultViewerIdx.value < vaultViewerImages.value.length - 1) vaultViewerIdx.value++ }
function viewerTouchStart(e) { viewerTouchX.value = e.touches[0].clientX }
function viewerTouchEnd(e) { const dx = e.changedTouches[0].clientX - viewerTouchX.value; if (Math.abs(dx) > 50) dx > 0 ? prevVaultImg() : nextVaultImg() }

// 暴露给子组件调用
defineExpose({ openVaultViewer })

// Toast & Dialog (inline, shared pattern)
function toastEl(msg, type, icon) {
  const el = document.createElement('div')
  const bg = type === 'red' ? 'linear-gradient(135deg,#ef4444,#dc2626)' : type === 'gold' ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'linear-gradient(135deg,#22c55e,#16a34a)'
  el.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:12px 20px;border-radius:8px;color:#fff;font-size:14px;font-weight:500;display:flex;align-items:center;gap:8px;box-shadow:0 4px 12px rgba(0,0,0,.15);z-index:9999;background:${bg};animation:toastIn .3s ease`
  el.innerHTML = (icon ? `<span>${icon}</span>` : '') + `<span>${msg}</span>`
  document.body.appendChild(el)
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .25s'; setTimeout(() => el.remove(), 250) }, 2500)
}

function showToast(msg, type = 'green', icon = '') { toastEl(msg, type, icon) }

function showDialog(opts) {
  const overlay = document.createElement('div')
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:1000'
  const box = document.createElement('div')
  box.style.cssText = 'background:var(--sur,#fff);border-radius:12px;padding:20px 24px;max-width:400px;width:90%;box-shadow:0 20px 40px rgba(0,0,0,.2)'
  const btnStyle = cls => cls === 'btn-dg' || cls === 'btn-dg-clear' ? '#dc2626' : cls === 'btn-p' ? 'var(--ac,#3d6b30)' : '#8a8780'
  box.innerHTML = `<div style="font-size:18px;font-weight:600;color:var(--t1,#1a1916);margin-bottom:12px">${opts.title || ''}</div><div style="font-size:14px;color:var(--t2,#4a4840);margin-bottom:20px;line-height:1.6">${opts.body || ''}</div><div style="display:flex;justify-content:flex-end;gap:8px">${opts.actions?.map((a, i) => `<button data-i="${i}" style="padding:6px 12px;border-radius:5px;border:none;cursor:pointer;font-size:13px;background:${btnStyle(a.cls)};color:#fff">${a.label}</button>`).join('') || ''}</div>`
  overlay.appendChild(box)
  document.body.appendChild(overlay)
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove() })
  box.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      try {
        const action = opts.actions?.[parseInt(btn.dataset.i)]
        if (action?.fn) action.fn()
      } catch (err) {
        console.error('Dialog action error:', err)
      }
      overlay.remove()
    })
  })
}

function showAbout() {
  showDialog({
    title: '🌿 关于 Selge',
    body: `<div style="font-size:12px;line-height:1.9;color:var(--t2)">
<p style="margin-bottom:16px">有一天我像往常一样闲来无事打开游戏，玩了一会儿之后突然觉得内心无比空虚。我想，我不能再这样了。</p>
<p style="margin-bottom:16px">我搜索了大量的资料，发现这可以归纳为一种简单而确定的模式：我们花费很少的精力，就能从游戏、短视频等现代产物中获取很大的满足，它是一个安全而且确定的奖励机制。但是这个奖励机制只能让我们沉迷于对我们的人生并无裨益的事情中，并不会产生现实成长。于是，我开始尝试创建一套属于我的人生的奖励机制。</p>
<p style="margin-bottom:16px">通过跟AI反复辩论，我明白了我要做的东西：一个Life RPG模拟器。幸运的是，网上已经有类似的产品，可惜不幸的是，它们要么没有我想要的功能，要么收费极贵（Youtube上几十万播放的一个notion life rpg模板，基础版就要收费69美刀）。于是，Selge应运而生：一个基于Vue，用Cloudflare Pages搭建的开源Life RPG模拟器。</p>
<p>过去无数个瞬间我都在想，假如我的人生是个游戏就好了，我猜你也这么想过。<strong>现在，不再想象，让我们付诸实践吧——路，就在脚下。</strong></p>
<hr style="border:none;border-top:1px solid var(--bd);margin:20px 0">
<p style="font-size:12px;color:var(--t3)">Contact me:</p>
<p>Email: <a href="mailto:FlorianChen9@outlook.com">FlorianChen9@outlook.com</a></p>
<p style="font-size:12px;color:var(--t3)">Find this repo at:</p>
<p>GitHub: <a href="https://github.com/freepotato/selge" target="_blank">https://github.com/freepotato/selge</a></p></div>`,
    actions: [{ label: '继续历险', cls: 'btn-p' }]
  })
}

// UI helpers
const coinDisplay = computed(() => COIN_SVG + ' <span style="margin-left:4px"><strong>' + (state.hero.coin || 0).toLocaleString() + '</strong></span>')

// Keyboard
function handleKeydown(e) {
  if (vaultViewerIdx.value === null) return
  if (e.key === 'ArrowLeft') { prevVaultImg(); e.preventDefault() }
  else if (e.key === 'ArrowRight') { nextVaultImg(); e.preventDefault() }
  else if (e.key === 'Escape') { closeVaultViewer(); e.preventDefault() }
}

// Mount
onMounted(async () => {
  try {
    const me = await getMe()
    user.value = me
    if (me.authenticated) await load()
  } catch (e) { console.error('初始化失败:', e) }
  // 确保界面总是可见
  document.getElementById('app')?.classList.add('ready')
  try { applyTheme(state.theme) } catch (e) { console.error('主题应用失败:', e) }
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

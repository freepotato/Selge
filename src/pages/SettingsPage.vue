<template>
  <div class="page" :class="{ active: isActive }">
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
          <div class="set-row"><div><div class="set-label">导出备份</div><div class="set-desc">导出为 JSON / Markdown / ZIP</div></div><div style="display:flex;gap:6px"><button class="btn btn-g btn-sm" @click="exportJson"><div style="transform:translateY(12%);"><PhFile :size="16" /></div>JSON</button><button class="btn btn-g btn-sm" @click="exportMarkdown"><div style="transform:translateY(12%);"><PhFileMd :size="16" /></div> MD</button><button class="btn btn-g btn-sm" @click="exportZip"><div style="transform:translateY(12%);"><PhFileZip :size="16" /></div> ZIP</button></div></div>
          <div class="set-row"><div><div class="set-label">导入数据</div><div class="set-desc">导入 JSON 文件或 Markdown 随笔</div></div><button class="btn btn-g btn-sm" @click="triggerImport"><div style="transform:translateY(12%);"><PhUpload :size="16" /></div>导入</button></div>
          <div class="set-row"><div><div class="set-label">清除所有数据</div><div class="set-desc" style="color:#c0392b">不可撤销</div></div><button class="btn btn-sm btn-danger" @click="clearData">永久清除</button></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import JSZip from 'jszip'
import { useStore } from '../stores/cloudStore.js'
import { PhFile, PhFileMd, PhFileZip, PhUpload } from '@phosphor-icons/vue'

const props = defineProps({
  isActive: Boolean
})

const emit = defineEmits(['show-toast'])

const { state, uid, today, save, autoSave } = useStore()

const newTypeEmoji = ref('')
const newTypeName = ref('')
const newTypeXpMin = ref('')
const newTypeXpMax = ref('')
const themeOpen = ref(false)
const clearCountdown = ref(10)
const clearTimer = ref(null)
const clearReady = ref(false)

function saveWithToast() {
  autoSave(() => {
    emit('show-toast', '已同步云端', 'green', '☁️')
  })
}

function toggleThemeDropdown() { 
  themeOpen.value = !themeOpen.value
  if (themeOpen.value) {
    setTimeout(() => {
      const btn = document.querySelector('.set-row .custom-select-btn')
      const menu = document.querySelector('.set-row .custom-select-menu')
      if (btn && menu) menu.style.width = btn.offsetWidth + 'px'
    }, 0)
  }
}

function selectTheme(t) { 
  applyTheme(t)
  themeOpen.value = false 
}

function applyTheme(t) {
  state.theme = t
  const html = document.documentElement
  if (t === 'light') html.setAttribute('data-theme', 'light')
  else if (t === 'dark') html.setAttribute('data-theme', 'dark')
  else html.setAttribute('data-theme', window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  saveWithToast()
}

function togglePin(typeId) {
  const t = state.advTypes.find(x => x.id === typeId)
  if (t) { t.pinned = !t.pinned; saveWithToast() }
}

function addAdvType() {
  const emoji = newTypeEmoji.value.trim() || '🎯'
  const name = newTypeName.value.trim()
  const xpMin = parseInt(newTypeXpMin.value) || 5
  const xpMax = parseInt(newTypeXpMax.value) || 10
  if (!name) return
  if (xpMin > xpMax) { emit('show-toast', '最小XP不能大于最大XP', 'warn'); return }
  state.advTypes.push({ id: uid(), emoji, name, xpMin, xpMax, pinned: false })
  newTypeEmoji.value = ''; newTypeName.value = ''; newTypeXpMin.value = ''; newTypeXpMax.value = ''
  saveWithToast()
  emit('show-toast', '已添加历险类型', 'green')
}

async function exportZip() {
  const zip = new JSZip()
  zip.file('selge-data.json', JSON.stringify({ 
    hero: state.hero, 
    advTypes: state.advTypes, 
    adventures: state.adventures, 
    essays: state.essays, 
    unlockedAchievements: state.unlockedAchievements,
    theme: state.theme
  }, null, 2))
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
  emit('show-toast', '已导出 ZIP（含 JSON + 随笔）', 'green', '📦')
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
  emit('show-toast', '已导出 JSON', 'green', '📄')
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
  emit('show-toast', `已导出 ${state.essays.filter(e => e.submitted).length} 篇随笔`, 'green', '📝')
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
              if (p.unlockedAchievements) {
                const existingIds = new Set(state.unlockedAchievements.map(a => typeof a === 'string' ? a : a.id))
                const newAchs = (p.unlockedAchievements || []).map(a => typeof a === 'string' ? { id: a, date: null } : a).filter(a => !existingIds.has(a.id))
                state.unlockedAchievements = [...state.unlockedAchievements, ...newAchs]
              }
              if (p.theme) state.theme = p.theme
              saveWithToast()
              emit('show-toast', `已导入 ${newAdvs.length} 条历险、${newEssays.length} 篇随笔`, 'green', '📥')
            } else {
              emit('show-toast', 'JSON 格式不正确', 'warn')
            }
          } catch (err) {
            emit('show-toast', 'JSON 解析失败', 'warn')
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
                emit('show-toast', '随笔已存在，跳过: ' + parsed.title, 'warn')
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
                emit('show-toast', '已导入随笔: ' + parsed.title, 'green', '📝')
              }
            } else {
              emit('show-toast', 'MD 文件缺少 frontmatter', 'warn')
            }
          } catch (err) {
            emit('show-toast', 'MD 文件解析失败', 'warn')
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

function clearData() {
  clearCountdown.value = 10
  clearReady.value = false
  emit('show-dialog', {
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
        emit('show-toast', '数据已清除', 'warn')
      }}
    ]
  })
  
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
      const btn = document.querySelector('.btn-dg-clear')
      if (btn) {
        btn.disabled = false
        btn.style.opacity = '1'
        btn.style.cursor = 'pointer'
      }
    }
  }, 1000)
}

onMounted(() => {
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-select')) {
      themeOpen.value = false
    }
  })
})
</script>
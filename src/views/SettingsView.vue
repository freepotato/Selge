<template>
  <div class="page" :class="{ active: active }">
    <div class="wrap">
      <div class="mb24"><div class="page-title">设置</div><div class="page-sub">个性化你的历险</div></div>
      <div style="max-width:600px;display:flex;flex-direction:column;gap:20px">
        <!-- 个人信息 -->
        <div class="card cp">
          <div class="set-sec-title">个人信息</div>
          <div class="set-row"><div><div class="set-label">角色名</div><div class="set-desc">显示在账户按钮中</div></div><input class="inp" v-model="state.hero.name" style="width:180px" maxlength="20" @blur="saveWithToast" /></div>
          <div class="set-row"><div><div class="set-label">储蓄</div><div class="set-desc">当前拥有的现实资金</div></div><div style="display:flex;align-items:center;gap:8px"><span style="font-size:12px;color:var(--t3)">¥</span><input class="inp" type="number" v-model.number="state.hero.realMoney" style="width:100px" min="0" placeholder="0" @blur="saveWithToast" /></div></div>
        </div>

        <!-- 历险类型管理 -->
        <div class="card cp">
          <div class="set-sec-title">历险类型管理</div>
          <div style="font-size:12px;color:var(--t3);margin-bottom:12px">点击「展示」可将该类型固定到角色页面</div>
          <div v-for="t in state.advTypes" :key="t.id" class="at-row">
            <span class="at-emoji">{{ t.emoji }}</span>
            <span class="at-name">{{ t.name }}</span>
            <span class="at-xp" style="min-width:70px;text-align:right">+{{ t.xpMin }}~{{ t.xpMax }} XP</span>
            <button class="at-pin" :class="{ on: t.pinned }" @click="togglePin(t.id)">{{ t.pinned ? '✓ 展示中' : '展示' }}</button>
          </div>
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

        <!-- 外观 -->
        <div class="card cp">
          <div class="set-sec-title">外观</div>
          <div class="set-row">
            <div style="min-width:80px"><div class="set-label">主题</div></div>
            <div class="custom-select" style="width:100px;margin-left:auto">
              <button class="custom-select-btn" :class="{ open: themeOpen }" @click="themeOpen = !themeOpen" style="width:100%">
                <span>{{ themeLabel }}</span>
              </button>
              <div class="custom-select-menu" :class="{ open: themeOpen }">
                <div class="custom-select-item" :class="{ selected: state.theme === 'auto' }" @click="selectTheme('auto')">自适应</div>
                <div class="custom-select-item" :class="{ selected: state.theme === 'light' }" @click="selectTheme('light')">浅色</div>
                <div class="custom-select-item" :class="{ selected: state.theme === 'dark' }" @click="selectTheme('dark')">深色</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 数据 -->
        <div class="card cp">
          <div class="set-sec-title">数据</div>
          <div class="set-row"><div><div class="set-label">导出备份</div><div class="set-desc">导出为 JSON / Markdown / ZIP</div></div><div style="display:flex;gap:6px"><button class="btn btn-g btn-sm" @click="exportJson">📄 JSON</button><button class="btn btn-g btn-sm" @click="exportMarkdown">📝 MD</button><button class="btn btn-g btn-sm" @click="exportZip">📦 ZIP</button></div></div>
          <div class="set-row"><div><div class="set-label">导入数据</div><div class="set-desc">导入 JSON 文件或 Markdown 随笔</div></div><button class="btn btn-g btn-sm" @click="triggerImport">📥 导入</button></div>
          <div class="set-row"><div><div class="set-label">清除所有数据</div><div class="set-desc" style="color:#c0392b">不可撤销</div></div><button class="btn btn-sm btn-danger" @click="clearData">永久清除</button></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import JSZip from 'jszip'
import { useStore } from '../stores/cloudStore.js'

defineProps({ active: Boolean })

const { state, uid, today, fmtDate, saveWithToast, applyTheme } = useStore()

// ─── Local state ─────────────────────────────────────────────────────────────
const themeOpen = ref(false)
const themeLabel = ref({ auto: '自适应', light: '浅色', dark: '深色' }[state.theme] || '自适应')
const newTypeEmoji = ref('')
const newTypeName = ref('')
const newTypeXpMin = ref('')
const newTypeXpMax = ref('')
const clearCountdown = ref(10)
const clearTimer = ref(null)
const clearReady = ref(false)

// ─── Inline Toast & Dialog ──────────────────────────────────────────────────────
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
  const btnStyle = cls => cls === 'btn-dg' ? '#dc2626' : cls === 'btn-dg-clear' ? '#dc2626' : cls === 'btn-p' ? 'var(--ac,#3d6b30)' : '#8a8780'
  box.innerHTML = `<div style="font-size:18px;font-weight:600;color:var(--t1,#1a1916);margin-bottom:12px">${opts.title || ''}</div><div style="font-size:14px;color:var(--t2,#4a4840);margin-bottom:20px;line-height:1.6">${opts.body || ''}</div><div style="display:flex;justify-content:flex-end;gap:8px">${opts.actions?.map((a, i) => `<button data-i="${i}" style="padding:6px 12px;border-radius:5px;border:none;cursor:pointer;font-size:13px;background:${btnStyle(a.cls)};color:#fff">${a.label}</button>`).join('') || ''}</div>`
  overlay.appendChild(box)
  document.body.appendChild(overlay)
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove() })
  box.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => { const action = opts.actions?.[parseInt(btn.dataset.i)]; if (action?.fn) action.fn(); overlay.remove() })
  })
}

// ─── Settings actions ──────────────────────────────────────────────────────────
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
  if (xpMin > xpMax) { showToast('最小XP不能大于最大XP', 'gold'); return }
  state.advTypes.push({ id: uid(), emoji, name, xpMin, xpMax, pinned: false })
  newTypeEmoji.value = ''; newTypeName.value = ''; newTypeXpMin.value = ''; newTypeXpMax.value = ''
  saveWithToast()
  showToast('已添加历险类型', 'green')
}

function selectTheme(t) {
  applyTheme(t)
  state.theme = t
  themeOpen.value = false
  themeLabel.value = { auto: '自适应', light: '浅色', dark: '深色' }[t]
  saveWithToast()
}

async function exportZip() {
  const zip = new JSZip()
  zip.file('selge-data.json', JSON.stringify({ hero: state.hero, advTypes: state.advTypes, adventures: state.adventures, essays: state.essays, unlockedAchievements: state.unlockedAchievements, theme: state.theme }, null, 2))
  const essaysFolder = zip.folder('essays')
  state.essays.filter(e => e.submitted).forEach(e => {
    const fm = `---\nid: ${e.id}\ntitle: "${(e.title || '无题').replace(/"/g, '\\"')}"\ndate: ${e.date}\nmood: ${e.mood}\ntags: ${JSON.stringify(e.tags || [])}\n---\n`
    essaysFolder.file(`${e.date}-${(e.title || '无题').replace(/[\\/:*?"<>|]/g,'').substring(0,30)}.md`, fm + (e.content || ''))
  })
  const blob = await zip.generateAsync({ type: 'blob' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = `selge-backup-${today()}.zip`; a.click()
  showToast('已导出 ZIP（含 JSON + 随笔）', 'green', '📦')
}

function exportJson() {
  const blob = new Blob([JSON.stringify({ hero: state.hero, advTypes: state.advTypes, adventures: state.adventures, essays: state.essays, unlockedAchievements: state.unlockedAchievements, theme: state.theme }, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = `selge-${today()}.json`; a.click()
  showToast('已导出 JSON', 'green', '📄')
}

function exportMarkdown() {
  state.essays.filter(e => e.submitted).forEach(e => {
    const fm = `---\nid: ${e.id}\ntitle: "${(e.title || '无题').replace(/"/g, '\\"')}"\ndate: ${e.date}\nmood: ${e.mood}\ntags: ${JSON.stringify(e.tags || [])}\n---\n`
    const blob = new Blob([fm + (e.content || '')], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `${e.date}-${(e.title || '无题').replace(/[\\/:*?"<>|]/g,'').substring(0,30)}.md`; a.click()
  })
  showToast(`已导出 ${state.essays.filter(e => e.submitted).length} 篇随笔`, 'green', '📝')
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
      if (val.startsWith('[') && val.endsWith(']')) { try { val = JSON.parse(val) } catch (e) { val = [] } }
      meta[key] = val
    }
  })
  meta.content = body
  return meta
}

function triggerImport() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json,.zip,.md'
  input.multiple = true
  input.onchange = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    let newAdvs = 0, newEssays = 0
    for (const file of files) {
      const ext = file.name.split('.').pop().toLowerCase()
      if (ext === 'json') {
        const text = await file.text()
        try {
          const p = JSON.parse(text)
          if (p.hero && p.adventures) {
            if (p.hero) Object.assign(state.hero, p.hero)
            if (p.advTypes) state.advTypes = p.advTypes
            if (p.adventures) {
              const existingIds = new Set(state.adventures.map(a => a.id))
              const newA = p.adventures.filter(a => !existingIds.has(a.id))
              state.adventures = [...state.adventures, ...newA]; newAdvs += newA.length
            }
            if (p.essays) {
              const existingIds = new Set(state.essays.map(ess => ess.id))
              const newE = p.essays.filter(ess => !existingIds.has(ess.id))
              state.essays = [...state.essays, ...newE]; newEssays += newE.length
            }
            if (p.unlockedAchievements) {
              const existingIds = new Set(state.unlockedAchievements.map(a => typeof a === 'string' ? a : a.id))
              const newAchs = (p.unlockedAchievements || []).map(a => typeof a === 'string' ? { id: a, date: null } : a).filter(a => !existingIds.has(a.id))
              state.unlockedAchievements = [...state.unlockedAchievements, ...newAchs]
            }
            if (p.theme) state.theme = p.theme
            saveWithToast()
            showToast(`已导入 ${newAdvs} 条历险、${newEssays} 篇随笔`, 'green', '📥')
          } else { showToast('JSON 格式不正确', 'gold') }
        } catch (err) { showToast('JSON 解析失败', 'red') }
      } else if (ext === 'md') {
        const text = await file.text()
        try {
          const parsed = parseMdFrontmatter(text)
          if (parsed && parsed.id) {
            if (state.essays.find(x => x.id === parsed.id)) {
              showToast('随笔已存在: ' + parsed.title, 'gold')
            } else {
              state.essays.push({ id: parsed.id, title: parsed.title || '无题', date: parsed.date || today(), mood: parsed.mood || '😊', tags: parsed.tags || [], content: parsed.content || '', submitted: true, ts: Date.now() })
              newEssays++; saveWithToast(); showToast('已导入随笔: ' + parsed.title, 'green', '📝')
            }
          } else { showToast('MD 文件缺少 frontmatter', 'gold') }
        } catch (err) { showToast('MD 文件解析失败', 'red') }
      }
    }
  }
  input.click()
}

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
          advTypes: [{ id: 'at1', emoji: '📚', name: '读书', xpMin: 30, xpMax: 40, pinned: true }, { id: 'at2', emoji: '🎬', name: '电影', xpMin: 5, xpMax: 8, pinned: true }, { id: 'at3', emoji: '🚶', name: '散步', xpMin: 3, xpMax: 5, pinned: true }, { id: 'at4', emoji: '🎸', name: '指弹', xpMin: 100, xpMax: 120, pinned: true }],
          adventures: [], essays: [], unlockedAchievements: [], theme: 'auto'
        })
        saveWithToast()
        showToast('数据已清除', 'gold')
      }}
    ]
  })
  setTimeout(() => {
    const btn = document.querySelector('.btn-dg-clear')
    if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; btn.style.cursor = 'not-allowed' }
    const countdownEl = document.getElementById('clear-countdown')
    if (countdownEl) countdownEl.innerHTML = '请等待 <span id="countdown-num">10</span> 秒后可确认清除'
  }, 0)
  clearTimer.value = setInterval(() => {
    clearCountdown.value--
    const numEl = document.getElementById('countdown-num')
    const countdownEl = document.getElementById('clear-countdown')
    if (numEl) numEl.textContent = clearCountdown.value
    if (clearCountdown.value <= 0) {
      clearInterval(clearTimer.value)
      clearReady.value = true
      if (countdownEl) { countdownEl.textContent = '⚠️ 现在可以点击确定清除'; countdownEl.style.color = '#c0392b' }
      const btn = document.querySelector('.btn-dg-clear')
      if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer' }
    }
  }, 1000)
}
</script>

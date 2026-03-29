<template>
  <div class="page" :class="{ active: active }">
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
</template>

<script setup>
import { ref, computed } from 'vue'
import { useStore } from '../stores/cloudStore.js'

defineProps({ active: Boolean })

const { state, ACHIEVEMENTS, uid, today, fmtDate, randInt, saveWithToast, getAdvCounts } = useStore()

// Local UI helpers (mirrors App.vue)
function showToast(msg, type = 'green', icon = '') {
  const id = Date.now()
  const el = document.createElement('div')
  el.className = 'toast'
  el.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:12px 20px;border-radius:8px;color:#fff;font-size:14px;font-weight:500;display:flex;align-items:center;gap:8px;box-shadow:0 4px 12px rgba(0,0,0,.15);z-index:9999;background:${type === 'red' ? 'linear-gradient(135deg,#ef4444,#dc2626)' : type === 'gold' ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'linear-gradient(135deg,#22c55e,#16a34a)'};animation:toastIn .3s ease`
  el.innerHTML = (icon ? `<span>${icon}</span>` : '') + `<span>${msg}</span>`
  document.body.appendChild(el)
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .25s'; setTimeout(() => el.remove(), 250) }, 2500)
}

function showDialog(opts) {
  const overlay = document.createElement('div')
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:1000'
  const box = document.createElement('div')
  box.style.cssText = 'background:var(--sur,#fff);border-radius:12px;padding:20px 24px;max-width:400px;width:90%;box-shadow:0 20px 40px rgba(0,0,0,.2)'
  box.innerHTML = `<div style="font-size:18px;font-weight:600;color:var(--t1,#1a1916);margin-bottom:12px">${opts.title || ''}</div><div style="font-size:14px;color:var(--t2,#4a4840);margin-bottom:20px;line-height:1.6">${opts.body || ''}</div><div style="display:flex;justify-content:flex-end;gap:8px">${opts.actions?.map((a, i) => `<button data-i="${i}" style="padding:6px 12px;border-radius:5px;border:none;cursor:pointer;font-size:13px;background:${a.cls === 'btn-dg' ? '#dc2626' : a.cls === 'btn-p' ? 'var(--ac,#3d6b30)' : '#8a8780'};color:#fff">${a.label}</button>`).join('') || ''}</div>`
  overlay.appendChild(box)
  document.body.appendChild(overlay)
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove() })
  box.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.dataset.i)
      const action = opts.actions?.[i]
      if (action?.fn) action.fn()
      overlay.remove()
    })
  })
}

// refs
const newAdvTitle = ref('')
const newAdvType = ref('at3')
const advTypeOpen = ref(false)
const advFilterType = ref('all')
const advPage = ref(1)
const advPerPage = 10
const editingAdvId = ref(null)
const editingAdvTitle = ref('')

function toggleAdvTypeDropdown() {
  advTypeOpen.value = !advTypeOpen.value
  if (advTypeOpen.value) {
    setTimeout(() => {
      const btn = document.querySelector('.adv-add-bar .custom-select-btn')
      const menu = document.querySelector('.adv-add-bar .custom-select-menu')
      if (btn && menu) menu.style.width = btn.offsetWidth + 'px'
    }, 0)
  }
}

function selectAdvType(id) { newAdvType.value = id; advTypeOpen.value = false }

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
  const allAchs = [...ACHIEVEMENTS.read, ...ACHIEVEMENTS.movie, ...ACHIEVEMENTS.guitar, ...ACHIEVEMENTS.walk, ...ACHIEVEMENTS.total]
  allAchs.forEach(a => {
    const reqKey = a.id.startsWith('r') ? 'read' : a.id.startsWith('m') ? 'movie' : a.id.startsWith('g') ? 'guitar' : a.id.startsWith('w') ? 'walk' : 'total'
    const currentCount = reqKey === 'total' ? state.adventures.length : (counts[reqKey] || 0)
    if (currentCount >= a.req && !state.unlockedAchievements.some(u => typeof u === 'string' ? u === a.id : u.id === a.id)) {
      state.unlockedAchievements.push({ id: a.id, date: today() })
      showToast(`成就解锁：${a.name}`, 'gold', a.icon)
    }
  })
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

function startEditAdv(a) { editingAdvId.value = a.id; editingAdvTitle.value = a.title }
function cancelEditAdv() { editingAdvId.value = null; editingAdvTitle.value = '' }
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
        state.hero.xp = Math.max(0, state.hero.xp - a.xp)
        state.hero.coin = Math.max(0, state.hero.coin - a.xp)
        if (advPage.value > advTotalPages.value) advPage.value = advTotalPages.value
        saveWithToast()
        showToast('历险已删除', 'green')
      }}
    ]
  })
}
</script>

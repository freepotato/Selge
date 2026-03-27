import { reactive } from 'vue'

const STORE = 'liferpg_v5'
const XP_ESSAY = 20

const XP_TABLE = {}
for (let i = 0; i <= 100; i++) {
  XP_TABLE[i] = i === 0 ? 0 : Math.round(50 * i * i + 50 * i)
}

const LV_TITLES = ['凡人', '见习旅者', '初出茅庐', '渐入佳境', '身经百战', '历险达人', '传奇旅者', '不朽传说']
const MOODS = ['😊', '😌', '😔', '😤', '🤔', '😴', '🎉', '💪']
const ACHIEVEMENTS = {
  read: [
    { id: 'r1', icon: '📖', name: '开卷有益', desc: '读完第一本书', req: 1 },
    { id: 'r2', icon: '📚', name: '书虫', desc: '读完 10 本书', req: 10 },
    { id: 'r3', icon: '🏛️', name: '学者', desc: '读完 50 本书', req: 50 },
    { id: 'r4', icon: '📜', name: '藏书阁', desc: '读完 100 本书', req: 100 }
  ],
  movie: [
    { id: 'm1', icon: '🎬', name: '影迷入门', desc: '看第一部电影', req: 1 },
    { id: 'm2', icon: '🎞️', name: '影迷', desc: '看 10 部电影', req: 10 },
    { id: 'm3', icon: '🏆', name: '影评达人', desc: '看 50 部电影', req: 50 }
  ],
  guitar: [
    { id: 'g1', icon: '🎸', name: '拨弦初试', desc: '第一次指弹练习', req: 1 },
    { id: 'g2', icon: '🎵', name: '琴韵悠扬', desc: '练习 10 次', req: 10 },
    { id: 'g3', icon: '🎶', name: '指尖如歌', desc: '练习 50 次', req: 50 }
  ],
  walk: [
    { id: 'w1', icon: '🚶', name: '踏出一步', desc: '第一次散步', req: 1 },
    { id: 'w2', icon: '🌿', name: '闲庭信步', desc: '散步 10 次', req: 10 },
    { id: 'w3', icon: '🌳', name: '行者', desc: '散步 50 次', req: 50 }
  ],
  total: [
    { id: 't1', icon: '⚔️', name: '初出茅庐', desc: '第一次历险', req: 1 },
    { id: 't2', icon: '🛡️', name: '渐入佳境', desc: '历险 10 次', req: 10 },
    { id: 't3', icon: '🏅', name: '身经百战', desc: '历险 100 次', req: 100 },
    { id: 't4', icon: '👑', name: '传奇', desc: '历险 365 次', req: 365 }
  ]
}

const COIN_SVG = '<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="9" fill="#f0c040" stroke="#d4a017" stroke-width="1"/><circle cx="10" cy="10" r="6" fill="none" stroke="#d4a017" stroke-width="1"/><text x="10" y="14" text-anchor="middle" font-size="10" font-weight="bold" fill="#8b6914">$</text></svg>'

const COIN_ITEMS = [
  { id: 'm_ticket', icon: '🎟️', name: '电影票', price: 175, realValue: '约¥35', desc: '看一场电影' },
  { id: 's_shoes', icon: '👟', name: '新鞋子', price: 1500, realValue: '约¥300', desc: '走更远的路' },
  { id: 'jacket', icon: '🧥', name: '新外套', price: 1000, realValue: '约¥200', desc: '风里更从容' },
  { id: 'pants', icon: '👖', name: '新裤子', price: 500, realValue: '约¥100', desc: '踏出每一步' }
]

const DAILY_QUOTES = [
  "人生不是等待暴风雨过去，而是学会在雨中起舞。",
  "每一个不曾起舞的日子，都是对生命的辜负。",
  "山不在高，有仙则名；水不在深，有龙则灵。",
  "行到水穷处，坐看云起时。",
  "生命不止，折腾不息。",
  "凡是过往，皆为序章。",
  "岁月不居，时节如流。",
  "人生如逆旅，我亦是行人。"
]

function defaultState() {
  return {
    hero: {
      name: '勇者',
      xp: 0,
      coin: 0,
      realMoney: 0,
      streak: 0,
      lastAdvDate: null,
      purchasedItems: [],
      purchaseHistory: [],
      bannerImg: null
    },
    advTypes: [
      { id: 'at1', emoji: '📚', name: '读书', xpMin: 30, xpMax: 40, pinned: true },
      { id: 'at2', emoji: '🎬', name: '电影', xpMin: 5, xpMax: 8, pinned: true },
      { id: 'at3', emoji: '🚶', name: '散步', xpMin: 3, xpMax: 5, pinned: true },
      { id: 'at4', emoji: '🎸', name: '指弹', xpMin: 50, xpMax: 60, pinned: true }
    ],
    adventures: [],
    essays: [],
    theme: 'auto',
    currentEssayId: null,
    unlockedAchievements: []
  }
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function fmtDate(iso) {
  const d = new Date(iso)
  return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0')
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function randInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a
}

function getLevel(xp) {
  for (let i = 100; i >= 1; i--) {
    if (xp >= XP_TABLE[i]) return i
  }
  return 1
}

function getLevelTitle(lv) {
  if (lv >= 100) return '不朽传说'
  if (lv >= 80) return '传奇旅者'
  if (lv >= 60) return '历险达人'
  if (lv >= 40) return '身经百战'
  if (lv >= 25) return '渐入佳境'
  if (lv >= 15) return '初出茅庐'
  if (lv >= 5) return '见习旅者'
  return '凡人'
}

function getAdvCounts(state) {
  const counts = {}
  state.adventures.forEach(a => {
    const t = state.advTypes.find(x => x.id === a.typeId)
    if (!t) return
    const key = t.name === '读书' ? 'read' : t.name === '电影' ? 'movie' : t.name === '指弹' ? 'guitar' : t.name === '散步' ? 'walk' : null
    if (key) counts[key] = (counts[key] || 0) + 1
  })
  return counts
}

const state = reactive(defaultState())

function load() {
  try {
    let r = localStorage.getItem(STORE)
    if (!r) {
      const oldKeys = ['liferpg_v4', 'liferpg_v3', 'liferpg_v2']
      for (const k of oldKeys) {
        const old = localStorage.getItem(k)
        if (old) {
          r = old
          localStorage.removeItem(k)
          break
        }
      }
    }
    if (r) {
      const p = JSON.parse(r)
      Object.assign(state, defaultState(), p)
      state.hero = Object.assign(defaultState().hero, p.hero || {})
      state.hero.coin = p.hero?.coin || 0
      state.hero.realMoney = p.hero?.realMoney || 0
      state.hero.purchasedItems = p.hero?.purchasedItems || []
      state.hero.purchaseHistory = p.hero?.purchaseHistory || []
      state.advTypes = p.advTypes || defaultState().advTypes
      state.adventures = p.adventures || []
      state.essays = p.essays || []
      state.unlockedAchievements = p.unlockedAchievements || []
    }
  } catch (e) {
    console.error('Load error:', e)
  }
}

function save() {
  try {
    localStorage.setItem(STORE, JSON.stringify(state))
  } catch (e) {
    console.error('Save error:', e)
  }
}

export function useStore() {
  return {
    state,
    XP_TABLE,
    XP_ESSAY,
    MOODS,
    ACHIEVEMENTS,
    COIN_SVG,
    COIN_ITEMS,
    DAILY_QUOTES,
    load,
    save,
    uid,
    today,
    fmtDate,
    esc,
    randInt,
    getLevel,
    getLevelTitle,
    getAdvCounts
  }
}

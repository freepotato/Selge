// src/stores/cloudStore.js
// 云端存储版状态管理

import { reactive } from 'vue'
import { saveData, loadData } from '../utils/authApi.js'

const XP_ESSAY = 20
const STORAGE_KEY = 'selge_cache'

// 等级表（最高 10 级）
const XP_TABLE = {}
for (let i = 0; i <= 10; i++) {
  XP_TABLE[i] = i === 0 ? 0 : Math.round(500 * i * i)
}

const LV_TITLES = ['致徒', '致者', '致师', '大致师', '致灵', '致宗', '致尊', '致王', '致皇', '致圣']
const MOODS = ['😊', '😌', '😔', '😤', '🤔', '😴', '🎉', '💪']

const ACHIEVEMENTS = {
  read: [
    { id: 'r1', icon: '📖', name: '开卷有益', desc: '读完第一本书', req: 1 },
    { id: 'r2', icon: '📚', name: '书虫', desc: '读完 10 本书', req: 10 },
    { id: 'r3', icon: '🏛️', name: '学者', desc: '读完 30 本书', req: 30 },
    { id: 'r4', icon: '📜', name: '藏书阁', desc: '读完 50 本书', req: 50 },
    { id: 'r5', icon: '🎓', name: '知识渊博', desc: '读完 100 本书', req: 100 }
  ],
  movie: [
    { id: 'm1', icon: '🎬', name: '影迷入门', desc: '看第一部电影', req: 1 },
    { id: 'm2', icon: '🎞️', name: '影迷', desc: '看 20 部电影', req: 20 },
    { id: 'm3', icon: '🏆', name: '影评达人', desc: '看 50 部电影', req: 50 },
    { id: 'm4', icon: '🎥', name: '电影大师', desc: '看 100 部电影', req: 100 },
    { id: 'm5', icon: '🌟', name: '银幕传奇', desc: '看 200 部电影', req: 200 }
  ],
  guitar: [
    { id: 'g1', icon: '🎸', name: '拨弦初试', desc: '学会第一曲', req: 1 },
    { id: 'g2', icon: '🎵', name: '琴韵悠扬', desc: '学会 3 曲', req: 3 },
    { id: 'g3', icon: '🎶', name: '指尖如歌', desc: '学会 7 曲', req: 7 },
    { id: 'g4', icon: '🎼', name: '琴艺高手', desc: '学会 15 曲', req: 15 },
    { id: 'g5', icon: '🎹', name: '指弹大师', desc: '学会 30 曲', req: 30 }
  ],
  walk: [
    { id: 'w1', icon: '🚶', name: '踏出一步', desc: '第一次散步', req: 1 },
    { id: 'w2', icon: '🌿', name: '闲庭信步', desc: '散步 10 次', req: 10 },
    { id: 'w3', icon: '🌳', name: '行者', desc: '散步 30 次', req: 30 },
    { id: 'w4', icon: '🏞️', name: '自然漫步者', desc: '散步 90 次', req: 90 },
    { id: 'w5', icon: '🌍', name: '四季行者', desc: '散步 365 次', req: 365 }
  ],
  total: [
    { id: 't1', icon: '⚔️', name: '初出茅庐', desc: '第一次历险', req: 1 },
    { id: 't2', icon: '🛡️', name: '渐入佳境', desc: '历险 10 次', req: 10 },
    { id: 't3', icon: '🏅', name: '身经百战', desc: '历险 100 次', req: 100 },
    { id: 't4', icon: '👑', name: '传奇', desc: '历险 365 次', req: 365 }
  ],
  adventure: [
    { id: 'a1', icon: '🗺️', name: '初出茅庐', desc: '完成第一次历险', req: 1 },
    { id: 'a2', icon: '🧭', name: '渐入佳境', desc: '完成 30 次历险', req: 30 },
    { id: 'a3', icon: '🏔️', name: '身经百战', desc: '完成 90 次历险', req: 90 },
    { id: 'a4', icon: '👑', name: '传奇', desc: '完成 365 次历险', req: 365 },
    { id: 'a5', icon: '🌟', name: '不朽传说', desc: '完成 720 次历险', req: 720 }
  ]
}

const COIN_SVG = '<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" style="width:18px;height:18px;vertical-align:middle"><circle cx="10" cy="10" r="9" fill="#f0c040" stroke="#d4a017" stroke-width="1"/><circle cx="10" cy="10" r="6" fill="none" stroke="#d4a017" stroke-width="1"/><text x="10" y="14" text-anchor="middle" font-size="10" font-weight="bold" fill="#8b6914">$</text></svg>'

const COIN_ITEMS = [
  { id: 'm_ticket', icon: '🎟️', name: '电影票', price: 100, realValue: '约¥35', desc: '看一场电影' },
  { id: 'pants', icon: '👖', name: '新裤子', price: 250, realValue: '约¥100', desc: '踏出每一步' },
  { id: 'redpack', icon: '🧧', name: '100元红包', price: 300, realValue: '¥100', desc: '放心地花吧' },
  { id: 'jacket', icon: '🧥', name: '新外套', price: 500, realValue: '约¥200', desc: '风里更从容' },
  { id: 's_shoes', icon: '👟', name: '新鞋子', price: 750, realValue: '约¥300', desc: '走更远的路' }
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
      { id: 'at3', emoji: '🚶', name: '散步', xpMin: 3, xpMax: 5, pinned: false },
      { id: 'at2', emoji: '🎬', name: '电影', xpMin: 5, xpMax: 8, pinned: false },
      { id: 'at1', emoji: '📚', name: '读书', xpMin: 30, xpMax: 40, pinned: false },
      { id: 'at4', emoji: '🎸', name: '指弹', xpMin: 100, xpMax: 120, pinned: false }
    ],
    adventures: [],
    essays: [],
    theme: 'auto',
    currentEssayId: null,
    unlockedAchievements: [],
    vault: {
      categories: [
        { id: 'vc_vault', name: '全部', locked: true, isAll: true },
        { id: 'vc_guitar', name: '指弹谱', locked: true }
      ],
      items: []
    }
  }
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

function today() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function fmtDate(iso) {
  const d = new Date(iso)
  return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0')
}

function randInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a
}

function getLevel(xp) {
  for (let i = 10; i >= 1; i--) {
    if (xp >= XP_TABLE[i]) return i
  }
  return 1
}

function getLevelTitle(lv) {
  if (lv >= 10) return '致圣'
  if (lv >= 9) return '致皇'
  if (lv >= 8) return '致王'
  if (lv >= 7) return '致尊'
  if (lv >= 6) return '致宗'
  if (lv >= 5) return '致灵'
  if (lv >= 4) return '大致师'
  if (lv >= 3) return '致师'
  if (lv >= 2) return '致者'
  return '致徒'
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

// 立即保存到云端（用户操作时调用）
// 可选的 onSuccess 回调用于显示提示
// 只有在云端数据加载成功后才能上传，防止默认值覆盖云端数据
function autoSave(onSuccess) {
  if (!cloudLoaded) {
    console.log('Skip save: cloud data not loaded yet')
    return
  }
  const data = {
    hero: state.hero,
    advTypes: state.advTypes,
    adventures: state.adventures,
    essays: state.essays,
    unlockedAchievements: state.unlockedAchievements,
    vault: state.vault,
    theme: state.theme,
    _ts: Date.now()
  }
  // 立即写入本地缓存
  saveToCache(data)
  // 异步写入云端
  try {
    saveData('default', data).then(() => {
      console.log('Saved to cloud')
      if (onSuccess) onSuccess()
    }).catch(e => {
      console.error('Save to cloud failed:', e)
    })
  } catch (e) {
    console.error('Save to cloud failed:', e)
  }
}

// Load from cloud
let cloudLoaded = false

// 从 localStorage 读取缓存
function loadFromCache() {
  try {
    const cached = localStorage.getItem(STORAGE_KEY)
    if (cached) {
      const data = JSON.parse(cached)
      console.log('Loaded from cache')
      return data
    }
  } catch (e) {
    console.error('Load cache failed:', e)
  }
  return null
}

// 保存到 localStorage
function saveToCache(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    console.log('Saved to cache')
  } catch (e) {
    console.error('Save cache failed:', e)
  }
}

// 应用数据到 state
function applyData(state, data) {
  Object.assign(state, defaultState(), data)
  state.hero = Object.assign(defaultState().hero, data.hero || {})
  state.hero.coin = data.hero?.coin || 0
  state.hero.realMoney = data.hero?.realMoney || 0
  state.hero.purchasedItems = data.hero?.purchasedItems || []
  state.hero.purchaseHistory = data.hero?.purchaseHistory || []

  if (data.advTypes && data.advTypes.length > 0) {
    const defaultTypes = defaultState().advTypes
    state.advTypes = data.advTypes.map(t => ({
      ...t,
      pinned: t.pinned !== undefined ? t.pinned : defaultTypes.find(dt => dt.id === t.id)?.pinned ?? false
    }))
  } else {
    state.advTypes = defaultState().advTypes
  }

  state.adventures = data.adventures || []
  state.essays = data.essays || []
  state.unlockedAchievements = (data.unlockedAchievements || []).map(a => typeof a === 'string' ? { id: a, date: null } : a)

  if (data.vault) {
    const defaultCats = defaultState().vault.categories
    const userCats = (data.vault.categories || []).filter(uc => !defaultCats.find(dc => dc.id === uc.id))
    state.vault.categories = [...defaultCats, ...userCats]
    const vaultId = 'vc_vault'
    state.vault.items = (data.vault.items || []).map(item => ({ ...item, catId: item.catId || vaultId }))
  }
}

function applyTheme(t) {
  state.theme = t
  const html = document.documentElement
  if (t === 'light') html.setAttribute('data-theme', 'light')
  else if (t === 'dark') html.setAttribute('data-theme', 'dark')
  else html.setAttribute('data-theme', window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
}

async function load() {
  // 1. 先加载本地缓存
  const cached = loadFromCache()
  if (cached) {
    applyData(state, cached)
    cloudLoaded = true // 标记已加载，允许保存
  }

  // 2. 异步从云端加载并对比
  try {
    const result = await loadData('default')
    if (result.success && result.data) {
      cloudLoaded = true
      // 对比云端数据和当前数据的更新时间，云端更新则覆盖
      const cloudTs = result.data._ts || 0
      const localTs = cached?._ts || 0
      if (cloudTs >= localTs) {
        applyData(state, result.data)
        saveToCache(result.data)
        console.log('Loaded from cloud (newer)')
      } else {
        console.log('Local cache is newer, skip cloud data')
      }
    } else if (result.error === 'Unauthorized') {
      console.log('未登录，使用缓存数据')
    } else {
      console.log('云端无数据')
    }
  } catch (e) {
    console.error('Load from cloud failed:', e)
  }
}

// Save to cloud immediately
async function save() {
  if (!cloudLoaded) {
    console.log('Skip save: cloud data not loaded yet')
    return
  }
  const data = {
    hero: state.hero,
    advTypes: state.advTypes,
    adventures: state.adventures,
    essays: state.essays,
    unlockedAchievements: state.unlockedAchievements,
    vault: state.vault,
    theme: state.theme,
    _ts: Date.now()
  }
  saveToCache(data)
  try {
    await saveData('default', data)
  } catch (e) {
    console.error('Save to cloud failed:', e)
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
    applyTheme,
    autoSave,
    uid,
    today,
    fmtDate,
    randInt,
    getLevel,
    getLevelTitle,
    getAdvCounts
  }
}
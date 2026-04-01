<template>
  <div class="page" :class="{ active: isActive }">
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
                  <div v-for="(d, j) in col" :key="j" class="hm-cell" :data-l="heatmapData.lv(heatmapData.countMap[heatmapData.localDateStr(d)] || 0)" :data-tip="(heatmapData.countMap[heatmapData.localDateStr(d)] || 0) + ' 次历险 · ' + d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })" :style="{ opacity: d > heatmapData.todayD ? 0.3 : 1 }"></div>
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
          <div v-if="!recentActivity.length" class="empty"><div class="empty-icon"><PhGlobeHemisphereEast :size="48" weight="duotone" /></div>开始你的第一次历险吧</div>
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
</template>

<script setup>
import { ref, computed } from 'vue'
import { useStore } from '../stores/cloudStore.js'

const props = defineProps({
  isActive: Boolean
})

const { state, XP_TABLE, COIN_SVG, DAILY_QUOTES, getLevel, getLevelTitle, getAdvCounts, fmtDate } = useStore()

const heatmapWeeks = ref(26)

const currentLevel = computed(() => getLevel(state.hero.xp))
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

const pinnedTypes = computed(() => state.advTypes.filter(t => t.pinned))
function getTypeCount(typeId) { return state.adventures.filter(a => a.typeId === typeId).length }

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
  return [...state.adventures.map(a => ({ ts: a.ts, type: 'adv', data: a })),
    ...state.essays.filter(e => e.submitted).map(e => ({ ts: e.ts, type: 'essay', data: e }))]
    .sort((a, b) => b.ts - a.ts).slice(0, 8)
})
</script>
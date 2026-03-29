<template>
  <div class="page" :class="{ active: active }">
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
          <div class="ach-shine"></div>
          <div class="ach-icon">{{ a.icon }}</div>
          <div class="ach-name">{{ a.name }}</div>
          <div class="ach-desc">{{ a.desc }}</div>
          <div class="ach-progress">
            <div class="ach-progress-bar">
              <div class="ach-progress-fill" :style="{ width: Math.min(100, ((a.id.startsWith('r') ? getAdvCounts(state).read : a.id.startsWith('m') ? getAdvCounts(state).movie : a.id.startsWith('g') ? getAdvCounts(state).guitar : a.id.startsWith('w') ? getAdvCounts(state).walk : state.adventures.length) || 0) / a.req * 100) + '%' }"></div>
            </div>
            <div class="ach-progress-text">{{ (a.id.startsWith('r') ? getAdvCounts(state).read : a.id.startsWith('m') ? getAdvCounts(state).movie : a.id.startsWith('g') ? getAdvCounts(state).guitar : a.id.startsWith('w') ? getAdvCounts(state).walk : state.adventures.length) || 0 }}/{{ a.req }}</div>
          </div>
          <div v-if="isAchievementUnlocked(a.id)" class="ach-unlock-date">✓ {{ getAchievementUnlockDate(a.id) ? fmtDate(getAchievementUnlockDate(a.id)) : '已解锁' }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useStore } from '../stores/cloudStore.js'

defineProps({ active: Boolean })

const { state, ACHIEVEMENTS, getAdvCounts, fmtDate } = useStore()

const achFilter = ref('all')

const sortedAchievements = computed(() => {
  const allAchs = [...ACHIEVEMENTS.read, ...ACHIEVEMENTS.movie, ...ACHIEVEMENTS.guitar, ...ACHIEVEMENTS.walk, ...ACHIEVEMENTS.total]
  const unlocked = allAchs.filter(a => isAchievementUnlocked(a.id)).reverse()
  const locked = allAchs.filter(a => !isAchievementUnlocked(a.id))
  return [...unlocked, ...locked]
})

function isAchievementUnlocked(aid) {
  return state.unlockedAchievements.some(a => typeof a === 'string' ? a === aid : a.id === aid)
}

function getAchievementUnlockDate(aid) {
  const entry = state.unlockedAchievements.find(a => typeof a === 'string' ? false : a.id === aid)
  return entry?.date || null
}
</script>

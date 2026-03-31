<template>
  <div class="page" :class="{ active: isActive }">
    <div class="wrap">
      <div class="fb mb24"><div><div class="page-title">随笔</div><div class="page-sub">写下来，就永远在了</div></div><button class="btn btn-p" @click="newEssay">+ 新建随笔</button></div>
      
      <!-- 分类选择 -->
      <div class="mb16">
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="hm-range-btn" :class="{ active: selectedCategory === 'all' }" @click="selectedCategory = 'all'">全部</button>
          <button v-for="tag in allTags" :key="tag" class="hm-range-btn" :class="{ active: selectedCategory === tag }" @click="selectedCategory = tag">{{ tag }}</button>
        </div>
      </div>
      
      <div class="essay-layout">
        <div>
          <div class="essay-timeline">
            <div v-if="!filteredEssays.length" class="empty" style="padding:20px 0"><div class="empty-icon"><PhBookOpenText :size="32" weight="duotone" /></div>没有匹配的随笔</div>
            <div v-for="e in filteredEssays" :key="e.id" class="etl-item" :class="{ active: currentEssay?.id === e.id }" @click="openEssay(e)">
              <div class="etl-date">{{ formatDateTime(e.date) }} {{ e.mood }}{{ !e.submitted ? ' ✏️' : '' }}</div>
              <div class="etl-title">{{ e.title || '草稿…' }}</div>
            </div>
          </div>
        </div>
        <div>
          <div v-if="!currentEssay" class="card" style="text-align:center;color:var(--t4);padding:60px 20px"><div style="font-size:32px;margin-bottom:10px"><PhAperture :size="48" weight="duotone" /></div><div>选择一篇随笔，或新建一篇</div></div>
          <div v-else-if="currentEssay.submitted" class="card cp">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
              <div class="essay-view-title">{{ currentEssay.title || '无题' }}</div>
              <div style="display:flex;gap:8px">
                <button class="btn btn-g btn-sm" @click="editSubmittedEssay" style="flex-shrink:0">✏️ 编辑</button>
                <button class="btn btn-g btn-sm" @click="exportSingleEssay(currentEssay)" style="flex-shrink:0">📥 导出</button>
                <button class="btn btn-dg btn-sm" @click="deleteSubmittedEssay" style="flex-shrink:0">🗑️ 删除</button>
              </div>
            </div>
            <div class="essay-view-meta">
              <div>
                <span>{{ currentEssay.mood }}</span>
                <span style="margin-left:12px">{{ formatDateTime(currentEssay.date) }}</span>
                <span style="margin-left:12px">{{ (currentEssay.content || '').replace(/\s/g, '').length }} 字</span>
                <span style="margin-left:12px">{{ calculateReadingTime(currentEssay.content || '') }} min</span>
              </div>
              <br v-if="currentEssay.tags && currentEssay.tags.length" />
              <div v-if="currentEssay.tags && currentEssay.tags.length">
                <span v-for="(tag, i) in currentEssay.tags" :key="i" style="font-size:12px;color:var(--t2);padding:2px 8px;border:1px solid var(--bd);border-radius:12px;background:var(--sur);margin-right:8px">{{ tag }}</span>
              </div>
            </div>
            <div class="md-body" v-html="marked.parse(currentEssay.content || '')"></div>
          </div>
          <div v-else class="card cp">
            <input class="essay-title-inp" v-model="currentEssay.title" placeholder="标题…" maxlength="60" @blur="save" />
            <div style="margin:12px 0 8px;display:flex;align-items:center;gap:12px;flex-wrap:wrap"><span style="font-size:12px;color:var(--t3)">心情</span><div class="mood-row"><button v-for="m in MOODS" :key="m" class="mood-btn" :class="{ on: currentEssay.mood === m }" @click="currentEssay.mood = m; save()">{{ m }}</button></div></div>
            <div style="margin:12px 0 8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <span style="font-size:12px;color:var(--t3)">标签</span>
              <div style="display:flex;gap:6px;flex-wrap:wrap;flex:1">
                <input v-model="essayTagInput" @keydown.enter="addEssayTag" placeholder="输入标签后按Enter" style="font-size:12px;padding:4px 8px;border:1px solid var(--bd);border-radius:4px;background:var(--sur);color:var(--t1);flex:1;min-width:100px" />
                <div style="display:flex;gap:4px;flex-wrap:wrap">
                  <span v-for="(tag, i) in currentEssay.tags" :key="i" class="essay-tag">
                    {{ tag }}
                    <button @click="removeEssayTag(i)" style="background:none;border:none;color:inherit;cursor:pointer;margin-left:4px;font-size:11px">✕</button>
                  </span>
                </div>
              </div>
            </div>
            <TiptapEditor v-model="currentEssay.content" placeholder="支持 Markdown 语法…" @blur="save" />
            <div class="fb" style="margin-top:10px">
              <span style="font-size:11px;color:var(--t4);font-family:monospace">
                {{ (currentEssay.content || '').replace(/\s/g, '').length }} 字 · 
                {{ calculateReadingTime(currentEssay.content || '') }} min · 
                提交后可修改
              </span>
              <div style="display:flex;gap:8px">
                <button class="btn btn-g btn-sm" @click="deleteEssay">删除草稿</button>
                <button class="btn btn-p btn-sm" @click="submitEssay">提交随笔</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { marked } from 'marked'
import { useStore } from '../stores/cloudStore.js'
import TiptapEditor from '../components/TiptapEditor.vue'

const props = defineProps({
  isActive: Boolean
})

const emit = defineEmits(['show-toast'])

const { state, uid, today, fmtDate, save } = useStore()

const currentEssay = ref(null)
const essayTagInput = ref('')
const selectedCategory = ref('all')

// 格式化日期时间，精确到分钟
function formatDateTime(dateString) {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 计算阅读时间（假设每分钟阅读300字）
function calculateReadingTime(content) {
  const wordCount = content.replace(/\s/g, '').length
  return Math.ceil(wordCount / 300)
}

// 获取所有标签
const allTags = computed(() => {
  const tags = new Set()
  state.essays.forEach(essay => {
    if (essay.tags) {
      essay.tags.forEach(tag => tags.add(tag))
    }
  })
  return Array.from(tags)
})

// 根据选择的分类过滤随笔
const filteredEssays = computed(() => {
  if (selectedCategory.value === 'all') {
    return state.essays
  } else {
    return state.essays.filter(essay => {
      return essay.tags && essay.tags.includes(selectedCategory.value)
    })
  }
})

function newEssay() {
  const id = uid()
  state.essays.unshift({ id, title: '', content: '', mood: '😊', date: new Date().toISOString(), ts: Date.now(), submitted: false, tags: [] })
  currentEssay.value = state.essays[0]
  updateAndSave()
}

function openEssay(essay) { 
  currentEssay.value = essay
  essayTagInput.value = ''
}

function addEssayTag() {
  const tag = essayTagInput.value.trim()
  if (!tag) return
  if (!currentEssay.value.tags) currentEssay.value.tags = []
  if (!currentEssay.value.tags.includes(tag)) {
    currentEssay.value.tags.push(tag)
    updateAndSave()
  }
  essayTagInput.value = ''
}

function removeEssayTag(index) {
  currentEssay.value.tags.splice(index, 1)
  updateAndSave()
}

function updateAndSave() {
  // 更新时间戳
  if (currentEssay.value) {
    currentEssay.value.date = new Date().toISOString()
    currentEssay.value.ts = Date.now()
  }
  save()
}

function deleteEssay() {
  const isEmpty = !currentEssay.value.title?.trim() && !currentEssay.value.content?.trim() && !(currentEssay.value.tags?.length)
  if (isEmpty) {
    state.essays = state.essays.filter(e => e.id !== currentEssay.value.id)
    currentEssay.value = null
    return
  }
  emit('show-dialog', {
    title: '删除草稿',
    body: '确定删除这篇草稿？',
    actions: [
      { label: '取消', cls: 'btn-g' },
      { label: '删除', cls: 'btn-dg', fn: () => {
        state.essays = state.essays.filter(e => e.id !== currentEssay.value.id)
        currentEssay.value = null
        updateAndSave()
      }}
    ]
  })
}

function deleteSubmittedEssay() {
  emit('show-dialog', {
    title: '删除随笔',
    body: '确定删除这篇随笔？',
    actions: [
      { label: '取消', cls: 'btn-g' },
      { label: '删除', cls: 'btn-dg', fn: () => {
        state.essays = state.essays.filter(e => e.id !== currentEssay.value.id)
        currentEssay.value = null
        updateAndSave()
        emit('show-toast', '随笔已删除', 'green', '📝')
      }}
    ]
  })
}

function editSubmittedEssay() {
  currentEssay.value.submitted = false
  updateAndSave()
  emit('show-toast', '进入编辑模式', 'green', '✏️')
}

function submitEssay() {
  if (!currentEssay.value.content.trim()) {
    emit('show-toast', '内容不能为空', 'warn')
    return
  }
  emit('show-dialog', {
    title: '提交随笔',
    body: '确定提交这篇随笔？',
    actions: [
      { label: '取消', cls: 'btn-g' },
      { label: '确定提交', cls: 'btn-p', fn: () => {
        // 检查是否已经获得过经验值
        const hasGainedXp = currentEssay.value.hasGainedXp || false
        
        currentEssay.value.submitted = true
        currentEssay.value.title = currentEssay.value.title || '无题'
        currentEssay.value.date = new Date().toISOString()
        currentEssay.value.ts = Date.now()
        
        if (!hasGainedXp) {
          // 第一次提交时才增加经验值
          const wordCount = currentEssay.value.content.length
          const xpGain = Math.min(wordCount, 1000)
          state.hero.xp += xpGain
          currentEssay.value.hasGainedXp = true
          updateAndSave()
          emit('show-toast', `随笔已提交 +${xpGain} XP`, 'green', '📝')
        } else {
          // 编辑后提交不增加经验值
          updateAndSave()
          emit('show-toast', '随笔已更新', 'green', '📝')
        }
      }}
    ]
  })
}

function exportSingleEssay(e) {
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
  emit('show-toast', '已导出随笔', 'green', '📝')
}

// 从 store 中获取 MOODS
const { MOODS } = useStore()
</script>
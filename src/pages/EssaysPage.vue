<template>
  <div class="page" :class="{ active: isActive }">
    <div class="wrap">
      <div class="fb mb24"><div><div class="page-title">随笔</div><div class="page-sub">写下来，就永远在了</div></div><button class="btn btn-p" @click="newEssay">+ 新建随笔</button></div>
      <div class="essay-layout">
        <div>
          <div class="essay-timeline">
            <div v-if="!state.essays.length" class="empty" style="padding:20px 0"><div class="empty-icon">📝</div>还没有随笔</div>
            <div v-for="e in state.essays" :key="e.id" class="etl-item" :class="{ active: currentEssay?.id === e.id }" @click="openEssay(e)">
              <div class="etl-date">{{ fmtDate(e.date) }} {{ e.mood }}{{ !e.submitted ? ' ✏️' : '' }}</div>
              <div class="etl-title">{{ e.title || '草稿…' }}</div>
            </div>
          </div>
        </div>
        <div>
          <div v-if="!currentEssay" class="card" style="text-align:center;color:var(--t4);padding:60px 20px"><div style="font-size:32px;margin-bottom:10px">📖</div><div>选择一篇随笔，或新建一篇</div></div>
          <div v-else-if="currentEssay.submitted" class="card cp">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
              <div class="essay-view-title">{{ currentEssay.title || '无题' }}</div>
              <button class="btn btn-g btn-sm" @click="exportSingleEssay(currentEssay)" style="flex-shrink:0">📥 导出</button>
            </div>
            <div class="essay-view-meta"><span>{{ currentEssay.mood }}</span><span>{{ fmtDate(currentEssay.date) }}</span><span>{{ (currentEssay.content || '').replace(/\s/g, '').length }} 字</span></div>
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
            <div class="fb" style="margin-top:10px"><span style="font-size:11px;color:var(--t4);font-family:monospace">{{ (currentEssay.content || '').replace(/\s/g, '').length }} 字 · 提交后不可修改</span><div style="display:flex;gap:8px"><button class="btn btn-g btn-sm" @click="deleteEssay">删除草稿</button><button class="btn btn-p btn-sm" @click="submitEssay">提交随笔</button></div></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
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

function newEssay() {
  const id = uid()
  state.essays.unshift({ id, title: '', content: '', mood: '😊', date: today(), ts: Date.now(), submitted: false, tags: [] })
  currentEssay.value = state.essays[0]
  save()
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
    save()
  }
  essayTagInput.value = ''
}

function removeEssayTag(index) {
  currentEssay.value.tags.splice(index, 1)
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
        save()
      }}
    ]
  })
}

function submitEssay() {
  if (!currentEssay.value.content.trim()) {
    emit('show-toast', '内容不能为空', 'warn')
    return
  }
  emit('show-dialog', {
    title: '提交随笔',
    body: '提交后将无法修改，确定吗？',
    actions: [
      { label: '取消', cls: 'btn-g' },
      { label: '确定提交', cls: 'btn-p', fn: () => {
        currentEssay.value.submitted = true
        currentEssay.value.title = currentEssay.value.title || '无题'
        const wordCount = currentEssay.value.content.length
        const xpGain = Math.min(wordCount, 1000)
        state.hero.xp += xpGain
        save()
        emit('show-toast', `随笔已提交 +${xpGain} XP`, 'green', '📝')
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
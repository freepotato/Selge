<template>
  <div class="page" :class="{ active: active }">
    <div class="wrap">
      <div class="fb mb24">
        <div><div class="page-title">随笔</div><div class="page-sub">写下来，就永远在了</div></div>
        <button class="btn btn-p" @click="newEssay">+ 新建随笔</button>
      </div>
      <div class="essay-layout">
        <div>
          <div class="essay-timeline">
            <div v-if="!state.essays.length" class="empty" style="padding:20px 0">
              <div class="empty-icon">📝</div>还没有随笔
            </div>
            <div v-for="e in state.essays" :key="e.id" class="etl-item" :class="{ active: currentEssay?.id === e.id }" @click="openEssay(e)">
              <div class="etl-date">{{ fmtDate(e.date) }} {{ e.mood }}{{ !e.submitted ? ' ✏️' : '' }}</div>
              <div class="etl-title">{{ e.title || '草稿…' }}</div>
            </div>
          </div>
        </div>
        <div>
          <div v-if="!currentEssay" class="card" style="text-align:center;color:var(--t4);padding:60px 20px">
            <div style="font-size:32px;margin-bottom:10px">📖</div>
            <div>选择一篇随笔，或新建一篇</div>
          </div>
          <div v-else-if="currentEssay.submitted" class="card cp">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
              <div class="essay-view-title">{{ currentEssay.title || '无题' }}</div>
              <button class="btn btn-g btn-sm" @click="exportSingleEssay(currentEssay)" style="flex-shrink:0">📥 导出</button>
            </div>
            <div class="essay-view-meta">
              <span>{{ currentEssay.mood }}</span>
              <span>{{ fmtDate(currentEssay.date) }}</span>
              <span>{{ (currentEssay.content || '').replace(/\s/g, '').length }} 字</span>
            </div>
            <div class="md-body" v-html="marked.parse(currentEssay.content || '')"></div>
          </div>
          <div v-else class="card cp">
            <input class="essay-title-inp" v-model="currentEssay.title" placeholder="标题…" maxlength="60" @blur="saveWithToast" />
            <div style="margin:12px 0 8px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
              <span style="font-size:12px;color:var(--t3)">心情</span>
              <div class="mood-row">
                <button v-for="m in MOODS" :key="m" class="mood-btn" :class="{ on: currentEssay.mood === m }" @click="currentEssay.mood = m; saveWithToast()">{{ m }}</button>
              </div>
            </div>
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
            <TiptapEditor v-model="currentEssay.content" placeholder="支持 Markdown 语法…" @blur="saveWithToast" />
            <div class="fb" style="margin-top:10px">
              <span style="font-size:11px;color:var(--t4);font-family:monospace">{{ (currentEssay.content || '').replace(/\s/g, '').length }} 字 · 提交后不可修改</span>
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
import { ref } from 'vue'
import { marked } from 'marked'
import TiptapEditor from '../components/TiptapEditor.vue'
import { useStore } from '../stores/cloudStore.js'

defineProps({ active: Boolean })

const { state, MOODS, uid, today, fmtDate, saveWithToast } = useStore()

const currentEssay = ref(null)
const essayTagInput = ref('')

// ─── Toast & Dialog (inline, mirrors App.vue behavior) ──────────────────────
function toastEl(msg, type, icon) {
  const el = document.createElement('div')
  const bg = type === 'red' ? 'linear-gradient(135deg,#ef4444,#dc2626)' : type === 'gold' ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'linear-gradient(135deg,#22c55e,#16a34a)'
  el.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:12px 20px;border-radius:8px;color:#fff;font-size:14px;font-weight:500;display:flex;align-items:center;gap:8px;box-shadow:0 4px 12px rgba(0,0,0,.15);z-index:9999;background:${bg};animation:toastIn .3s ease`
  el.innerHTML = (icon ? `<span>${icon}</span>` : '') + `<span>${msg}</span>`
  document.body.appendChild(el)
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .25s'; setTimeout(() => el.remove(), 250) }, 2500)
}

function showToast(msg, type = 'green', icon = '') {
  toastEl(msg, type, icon)
}

function showDialog(opts) {
  const overlay = document.createElement('div')
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:1000'
  const box = document.createElement('div')
  box.style.cssText = 'background:var(--sur,#fff);border-radius:12px;padding:20px 24px;max-width:400px;width:90%;box-shadow:0 20px 40px rgba(0,0,0,.2)'
  const btnStyle = (cls) => cls === 'btn-dg' ? '#dc2626' : cls === 'btn-p' ? 'var(--ac,#3d6b30)' : '#8a8780'
  box.innerHTML = `<div style="font-size:18px;font-weight:600;color:var(--t1,#1a1916);margin-bottom:12px">${opts.title || ''}</div><div style="font-size:14px;color:var(--t2,#4a4840);margin-bottom:20px;line-height:1.6">${opts.body || ''}</div><div style="display:flex;justify-content:flex-end;gap:8px">${opts.actions?.map((a, i) => `<button data-i="${i}" style="padding:6px 12px;border-radius:5px;border:none;cursor:pointer;font-size:13px;background:${btnStyle(a.cls)};color:#fff">${a.label}</button>`).join('') || ''}</div>`
  overlay.appendChild(box)
  document.body.appendChild(overlay)
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove() })
  box.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = opts.actions?.[parseInt(btn.dataset.i)]
      if (action?.fn) action.fn()
      overlay.remove()
    })
  })
}

// ─── Essay actions ─────────────────────────────────────────────────────────────
function newEssay() {
  const id = uid()
  state.essays.unshift({ id, title: '', content: '', mood: '😊', date: today(), ts: Date.now(), submitted: false, tags: [] })
  currentEssay.value = state.essays[0]
  saveWithToast()
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
    saveWithToast()
  }
  essayTagInput.value = ''
}

function removeEssayTag(index) {
  currentEssay.value.tags.splice(index, 1)
  saveWithToast()
}

function deleteEssay() {
  const isEmpty = !currentEssay.value.title?.trim() && !currentEssay.value.content?.trim() && !(currentEssay.value.tags?.length)
  if (isEmpty) {
    state.essays = state.essays.filter(e => e.id !== currentEssay.value.id)
    currentEssay.value = null
    return
  }
  showDialog({
    title: '删除草稿',
    body: '确定删除这篇草稿？',
    actions: [
      { label: '取消', cls: 'btn-g' },
      { label: '删除', cls: 'btn-dg', fn: () => {
        state.essays = state.essays.filter(e => e.id !== currentEssay.value.id)
        currentEssay.value = null
        saveWithToast()
      }}
    ]
  })
}

function submitEssay() {
  if (!currentEssay.value.content.trim()) {
    showToast('内容不能为空', 'warn')
    return
  }
  showDialog({
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
        saveWithToast()
        showToast(`随笔已提交 +${xpGain} XP`, 'green', '📝')
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
  showToast('已导出随笔', 'green', '📝')
}
</script>

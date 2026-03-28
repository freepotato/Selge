// src/utils/cloudApi.js
// 云端 API 封装（使用原生 fetch）

const API_BASE = '/api'

// 保存数据到 KV
export async function saveToCloud(key, data, type = 'json') {
  const res = await fetch(`${API_BASE}/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, data, type })
  })
  return res.json()
}

// 从 KV 加载数据
export async function loadFromCloud(key) {
  const res = await fetch(`${API_BASE}/load?key=${encodeURIComponent(key)}`)
  return res.json()
}

// 上传图片到 R2
export async function uploadImage(file, noteId = 'default') {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('noteId', noteId)

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData
  })
  return res.json()
}

// Debounce 工具
export function debounce(fn, delay) {
  let timer = null
  return function (...args) {
    clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}

// 主数据 key
export const MAIN_DATA_KEY = 'selge-main-data'

// 随笔 key 前缀
export const ESSAY_KEY_PREFIX = 'essay-'
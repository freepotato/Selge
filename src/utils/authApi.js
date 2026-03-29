// src/utils/authApi.js - 用户认证与数据 API

const API_BASE = '/api'

// 获取当前用户信息
export async function getMe() {
  const res = await fetch(`${API_BASE}/login`, { headers: { 'Accept': 'application/json' } })
  if (res.status === 401) {
    return { authenticated: false }
  }
  if (!res.ok) {
    throw new Error(`获取用户信息失败: ${res.status}`)
  }
  const data = await res.json()
  const username = data.email.split('@')[0]
  return { authenticated: true, email: data.email, username }
}

// 保存数据
export async function saveData(id, content) {
  const res = await fetch(`${API_BASE}/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, content })
  })
  if (res.status === 401) {
    return { error: 'Unauthorized' }
  }
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || '保存失败')
  }
  return res.json()
}

// 加载数据
export async function loadData(id) {
  const res = await fetch(`${API_BASE}/load?id=${encodeURIComponent(id)}`)
  if (res.status === 401) {
    return { error: 'Unauthorized' }
  }
  if (res.status === 404) {
    return { success: false, data: null }
  }
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || '加载失败')
  }
  return res.json()
}

// 上传图片
export async function uploadImage(file, id = 'default') {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('id', id)
  const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData })
  if (res.status === 401) return { error: 'Unauthorized' }
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || '上传失败') }
  return res.json()
}

// ─── Signed URL ───────────────────────────────────────────────────────────────

const _cache = new Map()
const _queue = new Map()
const CACHE_TTL = 50 * 60 * 1000 // 提前 10 分钟刷新（60分钟有效期）

/** 单个路径的预签名 URL（带缓存） */
export async function getSignedUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  const cached = _cache.get(path)
  if (cached && cached.expiresAt > Date.now()) return cached.url
  if (_queue.has(path)) return _queue.get(path)
  const promise = (async () => {
    const res = await fetch(`${API_BASE}/images/sign?path=${encodeURIComponent(path)}&expires=3600`)
    if (!res.ok) return null
    const { url } = await res.json()
    if (url) _cache.set(path, { url, expiresAt: Date.now() + CACHE_TTL })
    return url
  })()
  _queue.set(path, promise)
  const result = await promise
  _queue.delete(path)
  return result
}

/** 批量预热预签名 URL */
export async function getSignedUrls(paths) {
  if (!paths?.length) return {}
  const needed = [...new Set(paths.filter(p => p && !p.startsWith('http') && (!_cache.has(p) || _cache.get(p).expiresAt <= Date.now())))]
  if (needed.length) {
    const res = await fetch(`${API_BASE}/images/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths: needed, expiresIn: 3600 })
    })
    if (res.ok) {
      const { results } = await res.json()
      for (const { path, url } of results) {
        if (url) _cache.set(path, { url, expiresAt: Date.now() + CACHE_TTL })
      }
    }
  }
  const out = {}
  for (const p of paths) {
    if (p) out[p] = _cache.get(p)?.url || null
  }
  return out
}

export function clearSignedUrlCache(path) {
  if (path) _cache.delete(path)
  else _cache.clear()
}
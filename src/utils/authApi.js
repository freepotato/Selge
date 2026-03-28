// src/utils/authApi.js - 用户认证与数据 API

const API_BASE = '/api'

// 获取当前用户信息
export async function getMe() {
  const res = await fetch(`${API_BASE}/me`)
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
  
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData
  })
  if (res.status === 401) {
    return { error: 'Unauthorized' }
  }
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || '上传失败')
  }
  return res.json()
}
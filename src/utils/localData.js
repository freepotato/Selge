// src/utils/localData.js
// 本地数据持久化读取工具
// 使用 IndexedDB 存储目录句柄，实现"一次选择，每次一键同步"

const DB_NAME = 'selge_fs'
const DB_STORE = 'handles'
const HANDLE_KEY = 'selge_dir'

// ─── IndexedDB ────────────────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function saveHandle(handle) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite')
    tx.objectStore(DB_STORE).put(handle, HANDLE_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function loadHandle() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readonly')
    const req = tx.objectStore(DB_STORE).get(HANDLE_KEY)
    req.onsuccess = () => resolve(req.result || null)
    req.onerror = () => reject(req.error)
  })
}

export async function clearHandle() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite')
    tx.objectStore(DB_STORE).delete(HANDLE_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ─── 读取目录数据 ─────────────────────────────────────────────

async function readDataFromDir(rootHandle) {
  let jsonData = null
  const essays = []

  // 进入 data/ 子目录
  let dataDir = rootHandle
  try {
    dataDir = await rootHandle.getDirectoryHandle('data')
  } catch (e) {
    // 没有 data 目录，使用根目录
  }

  // 读取 JSON 文件
  try {
    const jsonFile = await dataDir.getFileHandle('selge-data.json')
    const file = await jsonFile.getFile()
    jsonData = JSON.parse(await file.text())
  } catch (e) {
    // JSON 文件不存在，忽略
  }

  // 读取 essays 文件夹
  try {
    const essaysDir = await dataDir.getDirectoryHandle('essays')
    for await (const entry of essaysDir.values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.md')) {
        try {
          const file = await entry.getFile()
          const essay = parseMarkdownEssay(await file.text())
          if (essay) essays.push(essay)
        } catch (e) {
          // 单个文件读取失败，跳过
        }
      }
    }
  } catch (e) {
    // essays 目录不存在，忽略
  }

  return { jsonData, essays }
}

// ─── Markdown 解析 ────────────────────────────────────────────

function parseMarkdownEssay(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) return null
  const [, frontmatterStr, essayContent] = match
  const frontmatter = {}
  frontmatterStr.split('\n').forEach(line => {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) return
    const key = line.substring(0, colonIdx).trim()
    const value = line.substring(colonIdx + 1).trim()
    frontmatter[key] = key === 'tags'
      ? value.replace(/[\[\]]/g, '').split(',').map(t => t.trim()).filter(Boolean)
      : value
  })
  return { ...frontmatter, content: essayContent.trim(), submitted: true }
}

// ─── 公开 API ─────────────────────────────────────────────────

/**
 * 检查是否已有保存的目录句柄
 * 返回 'granted' | 'prompt' | 'none'
 */
export async function checkLocalDirStatus() {
  if (!('showDirectoryPicker' in window)) return 'unsupported'
  try {
    const handle = await loadHandle()
    if (!handle) return 'none'
    const perm = await handle.queryPermission({ mode: 'read' })
    return perm // 'granted' | 'prompt' | 'denied'
  } catch {
    return 'none'
  }
}

/**
 * 用已保存的句柄读取数据（需要用户手势触发，用于 prompt 状态）
 */
export async function syncWithSavedDir() {
  const handle = await loadHandle()
  if (!handle) throw new Error('no-handle')
  const perm = await handle.requestPermission({ mode: 'read' })
  if (perm !== 'granted') throw new Error('permission-denied')
  return await readDataFromDir(handle)
}

/**
 * 获取各平台默认起始目录（用于 showDirectoryPicker 的 startIn）
 * Chrome 支持的值：'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos'
 * 无法直接传绝对路径，但可以用已保存的句柄作为 startIn
 */
function getStartIn() {
  // Chrome/Edge 不支持传绝对路径，只能用枚举值
  // 在提示文字里告知用户去哪里找
  return 'documents'
}

/**
 * 首次选择目录并读取数据
 */
export async function pickAndSyncDir() {
  const dirHandle = await window.showDirectoryPicker({ mode: 'read', startIn: getStartIn() })
  await saveHandle(dirHandle)
  return await readDataFromDir(dirHandle)
}

/**
 * 清除已保存的目录授权
 */
export async function clearLocalDir() {
  await clearHandle()
}

/**
 * 默认数据目录路径提示（仅供展示，引导用户找到正确位置）
 */
export function getDefaultPathHint() {
  const ua = navigator.userAgent
  if (/iPhone|iPad/.test(ua)) return '文件 App → 我的 iPhone → Selge'
  if (/Android/.test(ua)) return '内部存储 → Selge'
  if (/Mac/.test(ua)) return '~/Documents/Selge/（请把 Selge 文件夹放在这里）'
  if (/Win/.test(ua)) return 'C:\\Users\\用户名\\AppData\\Local\\Selge'
  return '~/.config/Selge'
}

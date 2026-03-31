<template>
  <div class="page" :class="{ active: isActive }">
    <div class="wrap">
      <!-- ===== 列表页 ===== -->
      <template v-if="!vaultDetailId">
        <div class="mb24"><div class="page-title">仓库</div><div class="page-sub">存放你时常回顾的图片</div></div>
        <!-- 分类切换 -->
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px">
          <button v-for="cat in state.vault.categories" :key="cat.id" class="hm-range-btn" :class="{ active: vaultCat === cat.id }" @click="vaultCat = cat.id; vaultPage = 1">
            {{ cat.name }}
          </button>
        </div>
        <!-- 添加分类 -->
        <div v-if="!vaultAddCatShow" style="margin-bottom:20px">
          <button class="btn btn-g btn-sm" @click="vaultAddCatShow = true">+ 新建分类</button>
        </div>
        <div v-else style="display:flex;gap:8px;margin-bottom:20px;align-items:center">
          <input class="inp inp-h" v-model="vaultNewCatName" placeholder="分类名称" maxlength="20" style="flex:1;min-width:120px" @keydown.enter="addVaultCat" @keydown.escape="vaultAddCatShow = false; vaultNewCatName = ''" />
          <button class="btn btn-p btn-sm" @click="addVaultCat">添加</button>
          <button class="btn btn-g btn-sm" @click="vaultAddCatShow = false; vaultNewCatName = ''">取消</button>
        </div>
        <!-- 分类标签 -->
        <div v-if="state.vault.categories.length > 1" style="margin-bottom:20px;display:flex;gap:6px;flex-wrap:wrap">
          <div v-for="cat in state.vault.categories" :key="cat.id" style="display:flex;align-items:center;gap:6px;background:var(--bg2);padding:4px 10px;border-radius:99px;font-size:12px;color:var(--t3)">
            <span>{{ cat.name }}</span>
            <button v-if="!cat.locked" class="vault-cat-del" @click="deleteVaultCat(cat)">✕</button>
          </div>
        </div>
        <!-- 内容卡片 -->
        <div class="card cp">
          <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;border-bottom:1px solid var(--bd);flex-wrap:wrap;gap:8px">
            <span style="font-size:12px;color:var(--t3);font-family:monospace">{{ vaultFilteredItems.length }} 项</span>
            <button class="btn btn-p btn-sm" @click="addVaultItem">+ 添加项目</button>
          </div>
          <div v-if="!vaultFilteredItems.length" class="empty" style="padding-top:24px"><div class="empty-icon"><PhFolderOpen :size="32" weight="duotone" /></div>暂无内容</div>
          <div v-else class="vault-grid">
            <div v-for="item in vaultPagedItems" :key="item.id" class="vault-card" @click="vaultDetailId = item.id">
              <div class="vault-card-cover">
                <img v-if="(item.images || []).length" :src="vaultUrl(item.images[0])" class="vault-card-img" loading="lazy" />
                <div v-else class="vault-card-empty">📂</div>
              </div>
              <div class="vault-card-info">
                <div class="vault-card-name">{{ item.name || '未命名' }}</div>
                <div v-if="item.catId" class="vault-card-cat">{{ state.vault.categories.find(c => c.id === item.catId)?.name || '' }}</div>
              </div>
            </div>
          </div>
          <div v-if="vaultTotalPages > 1" class="adv-pagination">
            <button class="btn btn-g btn-sm" :disabled="vaultPage <= 1" @click="vaultPage--">上一页</button>
            <span style="font-size:12px;color:var(--t3)">{{ vaultPage }} / {{ vaultTotalPages }}</span>
            <button class="btn btn-g btn-sm" :disabled="vaultPage >= vaultTotalPages" @click="vaultPage++">下一页</button>
          </div>
        </div>
      </template>

      <!-- ===== 详情页 ===== -->
      <template v-else>
        <!-- 返回按钮 -->
        <button class="vault-back-btn" @click="vaultDetailId = null">
          <span>← 返回仓库</span>
        </button>
        <div class="mb24" style="margin-top:12px"><div class="page-title">项目详情</div></div>
        <!-- 项目信息 -->
        <div class="card cp" style="margin-bottom:16px">
          <div style="margin-bottom:16px">
            <div style="font-size:12px;color:var(--t3);margin-bottom:6px">名称</div>
            <input class="inp inp-h" style="width:100%;font-size:16px;font-weight:600" :value="vaultDetailItem?.name || ''" placeholder="项目名称" maxlength="60" @blur="e => { if(vaultDetailItem) { vaultDetailItem.name = e.target.value; save() } }" />
          </div>
          <div>
            <div style="font-size:12px;color:var(--t3);margin-bottom:8px">分类</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <button v-for="cat in state.vault.categories.filter(c => !c.isAll)" :key="cat.id" class="vault-cat-btn" :class="{ active: vaultDetailItem?.catId === cat.id }" @click="toggleVaultCat(cat.id)">{{ cat.name }}</button>
            </div>
          </div>
        </div>
        <!-- 图片区 -->
        <div class="card cp">
          <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;border-bottom:1px solid var(--bd);margin-bottom:12px">
            <span style="font-size:13px;color:var(--t3)">图片 ({{ (vaultDetailItem?.images || []).length }})</span>
            <button class="btn btn-p btn-sm" @click="triggerVaultUpload(vaultDetailId)">+ 上传图片</button>
          </div>
          <div v-if="!vaultDetailItem?.images?.length" class="empty" style="padding-top:24px"><div class="empty-icon">📷</div>暂无图片</div>
          <div v-else class="vault-detail-imgs">
            <div v-for="(img, idx) in vaultDetailItem.images" :key="idx" class="vault-detail-img-wrap">
              <img :src="vaultUrl(img)" class="vault-detail-img" loading="lazy" @click="openVaultViewer(idx)" />
              <button class="vault-img-del" @click="removeVaultImage(vaultDetailItem, idx)">✕</button>
            </div>
          </div>
        </div>
        <!-- 删除项目 -->
        <div style="margin-top:24px;text-align:center">
          <button class="btn btn-dg btn-sm" @click="deleteVaultItemById">删除项目</button>
        </div>
      </template>
    </div>

    <!-- 图片查看器 -->
    <div v-if="vaultViewerIdx !== null && vaultDetailItem?.images?.length" class="vault-viewer-overlay" @click.self="closeVaultViewer"
      @touchstart="viewerTouchStart" @touchend="viewerTouchEnd">
      <button class="vault-viewer-close" @click="closeVaultViewer">✕</button>
      <img :src="vaultUrl(vaultDetailItem.images[vaultViewerIdx])" class="vault-viewer-img" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useStore } from '../stores/cloudStore.js'
import { uploadImage } from '../utils/authApi.js'

const props = defineProps({
  isActive: Boolean
})

const emit = defineEmits(['show-toast'])

const { state, uid, today, save } = useStore()

const vaultCat = ref('vc_vault')
const vaultPage = ref(1)
const vaultPerPage = 8
const vaultDetailId = ref(null)
const vaultViewerIdx = ref(null)
const vaultImgUrls = ref({})
const vaultAddCatShow = ref(false)
const vaultNewCatName = ref('')
const vaultUploadingId = ref(null)

const vaultDetailItem = computed(() => state.vault.items.find(i => i.id === vaultDetailId.value))

function openVaultViewer(idx) { vaultViewerIdx.value = idx }
function closeVaultViewer() { vaultViewerIdx.value = null }
function prevVaultImg() {
  if (vaultViewerIdx.value === null || !vaultDetailItem.value?.images?.length) return
  if (vaultViewerIdx.value > 0) vaultViewerIdx.value--
}
function nextVaultImg() {
  if (vaultViewerIdx.value === null || !vaultDetailItem.value?.images?.length) return
  if (vaultViewerIdx.value < vaultDetailItem.value.images.length - 1) vaultViewerIdx.value++
}

const viewerTouchX = ref(0)
function viewerTouchStart(e) { viewerTouchX.value = e.touches[0].clientX }
function viewerTouchEnd(e) {
  const dx = e.changedTouches[0].clientX - viewerTouchX.value
  if (Math.abs(dx) > 50) { dx > 0 ? prevVaultImg() : nextVaultImg() }
}

function toggleVaultCat(catId) {
  if (!vaultDetailItem.value) return
  vaultDetailItem.value.catId = vaultDetailItem.value.catId === catId ? null : catId
  save()
  emit('show-toast', '分类已更新', 'green')
}

function deleteVaultItemById() {
  const item = vaultDetailItem.value
  if (!item) return
  const isEmpty = !item.name?.trim() && !(item.images?.length)
  if (isEmpty) {
    state.vault.items = state.vault.items.filter(x => x.id !== item.id)
    vaultDetailId.value = null
    return
  }
  emit('show-dialog', {
    title: '删除项目',
    body: `确定删除「${item.name || '未命名'}」？`,
    actions: [
      { label: '取消', cls: 'btn-g' },
      { label: '删除', cls: 'btn-dg', fn: () => {
        state.vault.items = state.vault.items.filter(x => x.id !== item.id)
        vaultDetailId.value = null
        if (vaultPage.value > vaultTotalPages.value) vaultPage.value = vaultTotalPages.value
        save()
        emit('show-toast', '项目已删除', 'green')
      }}
    ]
  })
}

function removeVaultImage(item, idx) {
  item.images.splice(idx, 1)
  save()
  emit('show-toast', '图片已删除', 'green')
}

function triggerVaultUpload(itemId) {
  vaultUploadingId.value = itemId
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/jpeg,image/png,image/webp'
  input.multiple = true
  input.onchange = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    const item = state.vault.items.find(x => x.id === itemId)
    if (!item) return
    let uploaded = 0
    for (const file of files) {
      try {
        const result = await uploadImage(file, `vault/${itemId}`)
        if (result.success && result.path) {
          item.images.push(result.path)
          getCachedSignedUrl(result.path).then(url => {
            if (url) vaultImgUrls.value = { ...vaultImgUrls.value, [result.path]: url }
          })
          uploaded++
        } else {
          emit('show-toast', `上传失败: ${file.name}`, 'red')
        }
      } catch (err) {
        console.error('Upload failed:', err)
        emit('show-toast', `上传失败: ${file.name}`, 'red')
      }
    }
    vaultUploadingId.value = null
    if (uploaded > 0) { 
      save()
      emit('show-toast', `已上传 ${uploaded} 张图片`, 'green') 
    }
  }
  input.click()
}

// 预签名 URL 缓存
const signedUrlCache = new Map()
const _signQueue = new Map()
const CACHE_TTL_MS = 50 * 60 * 1000

async function getCachedSignedUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  const cached = signedUrlCache.get(path)
  if (cached && cached.expiresAt > Date.now()) return cached.url
  if (_signQueue.has(path)) return _signQueue.get(path)
  const promise = (async () => {
    const res = await fetch(`/api/images/sign?path=${encodeURIComponent(path)}&expires=3600`)
    if (!res.ok) return null
    const { url } = await res.json()
    if (url) signedUrlCache.set(path, { url, expiresAt: Date.now() + CACHE_TTL_MS })
    return url
  })()
  _signQueue.set(path, promise)
  const result = await promise
  _signQueue.delete(path)
  return result
}

// 批量预热签名 URL
async function warmSignedUrls(paths) {
  const unique = [...new Set(paths.filter(p => p && !p.startsWith('http')))]
  if (!unique.length) return
  const res = await fetch('/api/images/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paths: unique, expiresIn: 3600 })
  })
  if (res.ok) {
    const { results } = await res.json()
    for (const { path, url } of results) {
      if (url) signedUrlCache.set(path, { url, expiresAt: Date.now() + CACHE_TTL_MS })
    }
  }
}

function vaultUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  return vaultImgUrls.value[path] || null
}

function addVaultCat() {
  const name = vaultNewCatName.value.trim()
  if (!name) return
  const id = 'vc_' + uid()
  state.vault.categories.push({ id, name, locked: false })
  vaultNewCatName.value = ''
  vaultAddCatShow.value = false
  save()
  emit('show-toast', '分类已添加', 'green')
}

function deleteVaultCat(cat) {
  if (cat.locked) return
  emit('show-dialog', {
    title: '删除分类',
    body: `确定删除「${cat.name}」分类？该分类下的项目不会被删除，将移至第一个分类。`,
    actions: [
      { label: '取消', cls: 'btn-g' },
      { label: '删除', cls: 'btn-dg', fn: () => {
        const firstCatId = state.vault.categories[0].id
        state.vault.items.forEach(item => {
          if (item.catId === cat.id) item.catId = firstCatId
        })
        state.vault.categories = state.vault.categories.filter(c => c.id !== cat.id)
        if (vaultCat.value === cat.id) { vaultCat.value = state.vault.categories[0].id; vaultPage.value = 1 }
        save()
        emit('show-toast', '分类已删除', 'green')
      }}
    ]
  })
}

function addVaultItem() {
  const item = { id: uid(), catId: null, name: '', images: [], date: today(), ts: Date.now() }
  state.vault.items.unshift(item)
  vaultDetailId.value = item.id
  vaultPage.value = 1
  save()
}

const vaultFilteredItems = computed(() => {
  if (vaultCurrentCat.value?.isAll) return state.vault.items
  return state.vault.items.filter(i => i.catId === vaultCat.value)
})

const vaultCurrentCat = computed(() => state.vault.categories.find(c => c.id === vaultCat.value))
const vaultTotalPages = computed(() => Math.max(1, Math.ceil(vaultFilteredItems.value.length / vaultPerPage)))
const vaultPagedItems = computed(() => {
  const start = (vaultPage.value - 1) * vaultPerPage
  return vaultFilteredItems.value.slice(start, start + vaultPerPage)
})

// 全局键盘事件 - 图片查看器
function handleKeydown(e) {
  if (vaultViewerIdx.value === null) return
  if (e.key === 'ArrowLeft') { prevVaultImg(); e.preventDefault() }
  else if (e.key === 'ArrowRight') { nextVaultImg(); e.preventDefault() }
  else if (e.key === 'Escape') { closeVaultViewer(); e.preventDefault() }
}

onMounted(() => { 
  document.addEventListener('keydown', handleKeydown)
  // 进入仓库页面时预热签名 URL
  const allPaths = state.vault.items.flatMap(i => (i.images || []).map(img => {
    if (img.startsWith && img.startsWith('http')) return null
    return img
  })).filter(Boolean)
  warmSignedUrls(allPaths)
})

onBeforeUnmount(() => { document.removeEventListener('keydown', handleKeydown) })
</script>
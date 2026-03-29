<template>
  <div class="page" :class="{ active: active }">
    <div class="wrap">
      <div class="mb24"><div class="page-title">商店</div><div class="page-sub">用金币换取现实中的美好</div></div>
      <div class="char-coin-row"><div class="coin-display" v-html="coinDisplay"></div><div style="font-size:12px;color:var(--t3)">每获得 1 XP 可获得 1 金币，随笔产生的 XP 除外。</div></div>
      <div class="shop-grid">
        <div v-for="item in COIN_ITEMS" :key="item.id" class="shop-card" :class="{ owned: state.hero.purchasedItems?.includes(item.id) }">
          <div class="shop-card-icon">{{ item.icon }}</div>
          <div class="shop-card-name">{{ item.name }}</div>
          <div class="shop-card-real">现实价值 {{ item.realValue }}</div>
          <div class="shop-card-price" v-html="COIN_SVG + ' <strong>' + item.price.toLocaleString() + '</strong>'"></div>
          <div style="font-size:11px;color:var(--t4);margin-bottom:12px">{{ item.desc }}</div>
          <button v-if="state.hero.purchasedItems?.includes(item.id)" class="btn btn-sm shop-card-btn" disabled>✓ 已拥有</button>
          <button v-else class="btn btn-sm shop-card-btn" :class="state.hero.coin >= item.price ? 'btn-p' : 'btn-g'" :disabled="state.hero.coin < item.price" @click="buyItem(item)">{{ state.hero.coin >= item.price ? '购买' : '金币不足' }}</button>
        </div>
      </div>
      <div style="margin-top:40px;padding-top:24px;border-top:1px solid var(--bd)">
        <div class="page-title" style="font-size:16px;margin-bottom:16px">账户明细</div>
        <div v-if="!state.hero.purchaseHistory?.length" style="text-align:center;color:var(--t4);padding:20px">暂无购买记录</div>
        <div v-else style="max-height:300px;overflow-y:auto">
          <div v-for="h in state.hero.purchaseHistory" :key="h.date + h.name" style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--bd)">
            <span style="font-size:20px">{{ h.icon }}</span>
            <div style="flex:1"><div style="font-size:14px;color:var(--t1)">{{ h.name }}</div><div style="font-size:11px;color:var(--t4)">{{ h.date }}</div></div>
            <div style="font-size:13px;color:var(--t3)">-{{ h.price.toLocaleString() }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from '../stores/cloudStore.js'

defineProps({ active: Boolean })

const { state, COIN_SVG, COIN_ITEMS, fmtDate, today, saveWithToast } = useStore()

const coinDisplay = computed(() => COIN_SVG + ' <span style="margin-left:4px"><strong>' + state.hero.coin.toLocaleString() + '</strong></span>')

// ─── Inline Toast & Dialog ──────────────────────────────────────────────────────
function toastEl(msg, type, icon) {
  const el = document.createElement('div')
  const bg = type === 'red' ? 'linear-gradient(135deg,#ef4444,#dc2626)' : type === 'gold' ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'linear-gradient(135deg,#22c55e,#16a34a)'
  el.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:12px 20px;border-radius:8px;color:#fff;font-size:14px;font-weight:500;display:flex;align-items:center;gap:8px;box-shadow:0 4px 12px rgba(0,0,0,.15);z-index:9999;background:${bg};animation:toastIn .3s ease`
  el.innerHTML = (icon ? `<span>${icon}</span>` : '') + `<span>${msg}</span>`
  document.body.appendChild(el)
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .25s'; setTimeout(() => el.remove(), 250) }, 2500)
}

function showToast(msg, type = 'green', icon = '') { toastEl(msg, type, icon) }

function showDialog(opts) {
  const overlay = document.createElement('div')
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:1000'
  const box = document.createElement('div')
  box.style.cssText = 'background:var(--sur,#fff);border-radius:12px;padding:20px 24px;max-width:400px;width:90%;box-shadow:0 20px 40px rgba(0,0,0,.2)'
  const btnStyle = cls => cls === 'btn-dg' ? '#dc2626' : cls === 'btn-p' ? 'var(--ac,#3d6b30)' : '#8a8780'
  box.innerHTML = `<div style="font-size:18px;font-weight:600;color:var(--t1,#1a1916);margin-bottom:12px">${opts.title || ''}</div><div style="font-size:14px;color:var(--t2,#4a4840);margin-bottom:20px;line-height:1.6">${opts.body || ''}</div><div style="display:flex;justify-content:flex-end;gap:8px">${opts.actions?.map((a, i) => `<button data-i="${i}" style="padding:6px 12px;border-radius:5px;border:none;cursor:pointer;font-size:13px;background:${btnStyle(a.cls)};color:#fff">${a.label}</button>`).join('') || ''}</div>`
  overlay.appendChild(box)
  document.body.appendChild(overlay)
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove() })
  box.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => { const action = opts.actions?.[parseInt(btn.dataset.i)]; if (action?.fn) action.fn(); overlay.remove() })
  })
}

function buyItem(item) {
  if (state.hero.coin < item.price) return
  showDialog({
    title: `购买 ${item.icon} ${item.name}`,
    body: `确认用 <strong>${item.price.toLocaleString()}</strong> 金币兑换？<br><br><span style="font-size:12px;color:var(--t3)">${item.desc}，现实价值约 ${item.realValue}</span>`,
    actions: [
      { label: '取消', cls: 'btn-g' },
      { label: '确认购买', cls: 'btn-p', fn: () => {
        state.hero.coin -= item.price
        if (!state.hero.purchasedItems) state.hero.purchasedItems = []
        state.hero.purchasedItems.push(item.id)
        if (!state.hero.purchaseHistory) state.hero.purchaseHistory = []
        state.hero.purchaseHistory.unshift({ icon: item.icon, name: item.name, price: item.price, date: fmtDate(today()) })
        saveWithToast()
        showToast(`恭喜获得 ${item.name}！`, 'green', item.icon)
      }}
    ]
  })
}
</script>

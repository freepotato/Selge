<template>
  <div class="page" :class="{ active: isActive }">
    <div class="wrap">
      <div class="mb24"><div class="page-title">商店</div><div class="page-sub">用金币换取现实中的美好</div></div>
      <div class="char-coin-row"><div class="coin-display" v-html="coinDisplay"></div><div style="font-size:12px;color:var(--t3)">每获得 1 XP 可获得 1 金币，随笔产生的 XP 除外。</div></div>
      <div class="shop-grid">
        <div v-for="item in COIN_ITEMS" :key="item.id" class="shop-card" :class="{ owned: state.hero.purchasedItems?.includes(item.id) }">
          <div class="shop-card-icon">{{ item.icon }}</div><div class="shop-card-name">{{ item.name }}</div><div class="shop-card-real">现实价值 {{ item.realValue }}</div>
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

const props = defineProps({
  isActive: Boolean
})

const emit = defineEmits(['show-toast'])

const { state, COIN_SVG, COIN_ITEMS, save, fmtDate } = useStore()

const coinDisplay = computed(() => COIN_SVG + ' <span style="margin-left:6px"><strong>' + state.hero.coin.toLocaleString() + '</strong></span>')

function buyItem(item) {
  if (state.hero.coin < item.price) return
  emit('show-dialog', {
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
        save()
        emit('show-toast', `恭喜获得 ${item.name}！`, 'green', item.icon)
      }}
    ]
  })
}

// 从 store 中获取 today 函数
const { today } = useStore()
</script>
import { createApp } from 'vue'
import App from './App.vue'
import './styles/main.css'
import PhosphorIcons from '@phosphor-icons/vue'

const app = createApp(App)
app.use(PhosphorIcons)
app.mount('#app')
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import packageData from './package.json'
export default defineConfig({
  plugins: [vue()],
  base: './',
  define: {
    __VERSION__: JSON.stringify(packageData.version)
  }
})

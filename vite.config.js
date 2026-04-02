import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import packageData from './package.json'
export default defineConfig({
  plugins: [vue()],
  base: './',
  define: {
    __VERSION__: JSON.stringify(packageData.version)
  },
  build: {
    // 代码分割
    rollupOptions: {
      output: {
        manualChunks: {
          // 将第三方库单独打包
          vendor: ['vue'],
          // 将编辑器相关的库单独打包
          editor: ['@tiptap/extension-image', '@tiptap/extension-placeholder', '@tiptap/starter-kit', '@tiptap/vue-3'],
          // 将其他工具库单独打包
          utils: ['jszip', 'marked', 'turndown']
        }
      }
    },
    // 压缩
    minify: 'esbuild',
    esbuild: {
      drop: ['console', 'debugger']
    },
    // 预加载
    cssCodeSplit: true,
    // 生成sourcemap
    sourcemap: false
  }
})

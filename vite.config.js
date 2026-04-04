import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import packageData from './package.json'

// 开发模式模拟用户数据
const devUser = {
  authenticated: true,
  email: 'dev@localhost',
  username: 'dev'
}

export default defineConfig({
  plugins: [
    vue(),
    // 开发模式 API 模拟中间件
    {
      name: 'dev-api-mock',
      configureServer(server) {
        server.middlewares.use('/api/login', (req, res) => {
          const accept = req.headers['accept'] || ''
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-cache, no-store')
          
          if (accept.includes('application/json')) {
            res.end(JSON.stringify(devUser))
          } else {
            // 浏览器直接访问返回 HTML 重定向
            res.setHeader('Content-Type', 'text/html; charset=utf-8')
            res.end(`<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=?logged_in=true&dev=true"></head><body>登录成功</body></html>`)
          }
        })
        
        // /api 路由：登录成功后跳转
        server.middlewares.use('/api', (req, res) => {
          const accept = req.headers['accept'] || ''
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-cache, no-store')
          
          if (accept.includes('application/json')) {
            res.end(JSON.stringify(devUser))
          } else {
            res.setHeader('Content-Type', 'text/html; charset=utf-8')
            res.end(`<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=?logged_in=true&dev=true"></head><body>登录成功</body></html>`)
          }
        })
        
        server.middlewares.use('/api/load', (req, res) => {
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-cache, no-store')
          // 返回空数据，让前端使用本地缓存
          res.end(JSON.stringify({ success: true, data: null }))
        })
        
        server.middlewares.use('/api/save', (req, res) => {
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-cache, no-store')
          res.end(JSON.stringify({ success: true }))
        })
        
        server.middlewares.use('/api/images/sign', (req, res) => {
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-cache, no-store')
          res.end(JSON.stringify({ url: null }))
        })
        
        server.middlewares.use('/api/upload', (req, res) => {
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-cache, no-store')
          res.end(JSON.stringify({ success: true, path: 'dev/mock-image.png' }))
        })
      }
    }
  ],
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

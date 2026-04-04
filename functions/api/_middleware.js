// functions/api/_middleware.js - 处理所有 /api/* 路径的请求
export async function onRequest(context) {
  try {
    // 直接继续处理请求，让各个 API 端点自己处理登录逻辑
    return context.next()
  } catch (error) {
    console.error('Middleware error:', error)
    return new Response('Internal Server Error', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}

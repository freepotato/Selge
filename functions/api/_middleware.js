// functions/api/_middleware.js - 处理所有 /api/* 路径的请求
export async function onRequest(context) {
  const { request } = context
  const userEmail = request.headers.get('cf-access-authenticated-user-email')
  
  // 检查是否是已登录的浏览器直接访问
  if (userEmail) {
    const accept = request.headers.get('Accept') || ''
    
    // 如果不是 JSON 请求（即浏览器直接访问），重定向到主页
    if (!accept.includes('application/json')) {
      return Response.redirect('/', 302)
    }
  }
  
  // 否则继续处理请求
  return context.next()
}

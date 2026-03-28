// GET /api/login - 登录入口，受 Cloudflare Access 保护
export async function onRequestGet(context) {
  const userEmail = context.request.headers.get('cf-access-authenticated-user-email')
  
  // 已登录，重定向回首页
  if (userEmail) {
    return new Response(null, {
      status: 302,
      headers: { 
        'Location': '/'
      }
    })
  }
  
  // 未登录，返回 401 让 Cloudflare Access 处理
  // Cloudflare Access 会自动拦截 401 响应并显示登录页
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  })
}
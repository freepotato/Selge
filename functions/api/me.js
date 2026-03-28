// GET /api/me - 获取当前用户信息
export async function onRequestGet(context) {
  const userEmail = context.request.headers.get('cf-access-authenticated-user-email')
  
  if (!userEmail) {
    // 未登录，返回 HTML 页面，Cloudflare Access 会拦截并显示登录页
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>登录 - Selge</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f5f5f5; }
    .container { text-align: center; }
    .spinner { width: 40px; height: 40px; border: 3px solid #ddd; border-top-color: #3d6f30; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    p { color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <p>正在跳转到登录页面...</p>
  </div>
</body>
</html>`
    
    return new Response(html, {
      status: 401,
      headers: { 
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  }
  
  // 已登录，直接返回 302 重定向到首页
  return new Response(null, {
    status: 302,
    headers: { 
      'Location': '/',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  })
}
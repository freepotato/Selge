// GET /api/login - 登录入口，受 Cloudflare Access 保护
export async function onRequestGet(context) {
  const userEmail = context.request.headers.get('cf-access-authenticated-user-email')
  
  // 已登录，重定向回首页
  if (userEmail) {
    return new Response(null, {
      status: 302,
      headers: { 
        'Location': '/',
        'Set-Cookie': `user_email=${encodeURIComponent(userEmail)}; Path=/; SameSite=Lax`
      }
    })
  }
  
  // 未登录，返回 HTML 让 Cloudflare Access 自动处理登录
  // 如果 Access 已配置，这段代码不会执行（Access 会拦截）
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>登录 - Selge</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    .container { background: white; padding: 40px 60px; border-radius: 12px; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.2); }
    h1 { margin: 0 0 20px; color: #333; }
    p { color: #666; margin-bottom: 30px; }
    .btn { display: inline-block; padding: 12px 32px; background: #3d6f30; color: white; border-radius: 6px; text-decoration: none; font-weight: 500; }
    .btn:hover { background: #2d5223; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔐 Selge</h1>
    <p>请登录以访问您的数据</p>
    <a href="/" class="btn">返回首页</a>
  </div>
</body>
</html>`
  
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  })
}
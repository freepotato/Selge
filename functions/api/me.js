// GET /api/me - 获取当前用户信息
export async function onRequestGet(context) {
  const userEmail = context.request.headers.get('cf-access-authenticated-user-email')
  
  if (!userEmail) {
    // 返回 HTML 页面，提示用户需要登录
    // 如果是 AJAX 请求返回 JSON，否则返回 HTML
    const accept = context.request.headers.get('accept') || ''
    if (accept.includes('application/json')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // 返回 HTML，自动重定向到 Cloudflare Access 登录
    // 通过设置 cachectl 触发 Access 流程
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>登录中...</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f5f5f5; }
    .container { text-align: center; }
    .spinner { width: 40px; height: 40px; border: 3px solid #ddd; border-top-color: #3d6f30; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    a { color: #3d6f30; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <p>正在跳转到登录页面...</p>
    <p><a href="/">返回首页</a></p>
  </div>
  <script>
    // 尝试触发 Cloudflare Access 登录
    // 如果 Access 已配置，页面加载后会自动重定向
    setTimeout(function() {
      window.location.href = '/';
    }, 2000);
  </script>
</body>
</html>`
    
    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })
  }
  
  return new Response(JSON.stringify({ email: userEmail }), {
    headers: { 'Content-Type': 'application/json' }
  })
}
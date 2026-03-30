// functions/api/_middleware.js - 处理所有 /api/* 路径的请求
export async function onRequest(context) {
  try {
    const { request } = context
    const userEmail = request.headers.get('cf-access-authenticated-user-email')
    
    // 检查是否是已登录的浏览器直接访问
    if (userEmail) {
      const accept = request.headers.get('Accept') || ''
      
      // 如果不是 JSON 请求（即浏览器直接访问），返回跳转页面
      if (!accept.includes('application/json')) {
        const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>登录成功 - Selge</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#f5f5f5}
    .c{text-align:center}
    .s{width:40px;height:40px;border:3px solid #ddd;border-top-color:#3d6f30;border-radius:50%;animation:sp 1s linear infinite;margin:0 auto 20px}
    @keyframes sp{to{transform:rotate(360deg)}}
    p{color:#666;font-size:14px}
    a{color:#3d6f30;text-decoration:none;margin-top:16px;display:inline-block;font-size:13px}
    a:hover{text-decoration:underline}
  </style>
</head>
<body>
  <div class="c">
    <div class="s"></div>
    <p>登录成功，正在返回…</p>
    <a href="/">如果没有自动跳转，请点击这里</a>
  </div>
  <script>setTimeout(function(){window.location.href='/'},500)</script>
</body>
</html>`
        
        return new Response(html, {
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache, no-store' }
        })
      }
    }
    
    // 否则继续处理请求
    return context.next()
  } catch (error) {
    console.error('Middleware error:', error)
    return new Response('Internal Server Error', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}

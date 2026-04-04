// GET /api/me - 用户信息 & 登录入口（合并）
// - 未登录：返回 401，Cloudflare Access 拦截显示登录页
// - 已登录 + fetch 请求：返回 JSON 用户信息
// - 已登录 + 浏览器直接访问：返回 HTML 中转页跳转首页
// - 开发模式：支持 dev_login cookie 进行本地测试
export async function onRequestGet(context) {
  const userEmail = context.request.headers.get('cf-access-authenticated-user-email')
  const url = new URL(context.request.url)
  const accept = context.request.headers.get('Accept') || ''
  const cookieHeader = context.request.headers.get('Cookie') || ''
  
  // 检查是否是开发模式（只通过 cookie 判断，不通过 URL 参数）
  const isDevMode = cookieHeader.includes('dev_login=true')
  
  // 开发模式下允许模拟登录
  const devEmail = 'dev@localhost'
  
  // 使用开发模式的邮箱（如果启用）
  const effectiveEmail = isDevMode ? devEmail : userEmail
  
  console.log('Login request received:', {
    userEmail: userEmail ? '****' + userEmail.slice(-10) : null,
    devMode: isDevMode,
    effectiveEmail: effectiveEmail ? '****' + effectiveEmail.slice(-10) : null,
    url: url.pathname + url.search,
    accept: accept
  })

  if (!effectiveEmail) {
    console.log('No user email found, returning 401 (will be intercepted by Cloudflare Access)')
    // 直接返回 401，让 Cloudflare Access 拦截并显示登录页面
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'Cache-Control': 'no-cache, no-store' }
    })
  }

  // 已登录
  console.log('User is authenticated:', effectiveEmail)

  if (accept.includes('application/json')) {
    // fetch 请求：返回 JSON 用户信息
    console.log('Returning JSON user info')
    return new Response(JSON.stringify({ authenticated: true, email: effectiveEmail, devMode: isDevMode }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store' }
    })
  }

  // 浏览器直接访问（登录后重定向回来）：返回 HTML 中转页
  console.log('Returning HTML redirect page')
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

  // 检查是否有 redirect 参数
  const redirect = url.searchParams.get('redirect') || '/'
  console.log('Redirecting to:', redirect)
  
  // 构建重定向 URL - 使用基础 URL 而不是完整的 request URL
  const baseUrl = new URL(context.request.url)
  baseUrl.pathname = ''
  baseUrl.search = ''
  const redirectUrl = new URL(redirect, baseUrl.toString())
  
  // 只在重定向 URL 不包含 logged_in 参数时添加
  if (!redirectUrl.searchParams.has('logged_in')) {
    redirectUrl.searchParams.set('logged_in', 'true')
  }
  
  // 只在开发模式下添加 dev 参数
  if (isDevMode && !redirectUrl.searchParams.has('dev')) {
    redirectUrl.searchParams.set('dev', 'true')
  }
  
  console.log('Final redirect URL:', redirectUrl.toString())
  
  // 更新 HTML 中的重定向 URL
  const htmlWithRedirect = html.replace('window.location.href="/"', `window.location.href="${redirectUrl.toString()}"`)
  
  return new Response(htmlWithRedirect, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache, no-store' }
  })
}
// GET /api/me - 获取当前用户信息
export async function onRequestGet(context) {
  const userEmail = context.request.headers.get('cf-access-authenticated-user-email')
  
  if (!userEmail) {
    // 返回 401，Cloudflare Access 会自动拦截并显示登录页
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  }
  
  return new Response(JSON.stringify({ email: userEmail }), {
    headers: { 'Content-Type': 'application/json' }
  })
}
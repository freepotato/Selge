// GET /api/me - 获取当前用户信息
export async function onRequestGet(context) {
  const userEmail = context.request.headers.get('cf-access-authenticated-user-email')
  
  if (!userEmail) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  return new Response(JSON.stringify({ email: userEmail }), {
    headers: { 'Content-Type': 'application/json' }
  })
}
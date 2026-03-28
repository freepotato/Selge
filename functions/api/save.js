// POST /api/save - 保存内容到 KV（按用户隔离）
export async function onRequestPost(context) {
  const { request, env } = context
  const kv = env.selge_kv

  const userEmail = request.headers.get('cf-access-authenticated-user-email')
  if (!userEmail) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const body = await request.json()
    const { id, content } = body

    if (!id || content === undefined) {
      return new Response(JSON.stringify({ error: 'Missing id or content' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const key = `${userEmail}:${id}`
    await kv.put(key, typeof content === 'object' ? JSON.stringify(content) : String(content))

    return new Response(JSON.stringify({ success: true, key }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
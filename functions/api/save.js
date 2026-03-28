// POST /api/save - 保存内容到 KV
export async function onRequestPost(context) {
  const { request, env } = context
  const kv = env.selge_kv

  try {
    const body = await request.json()
    const { key, data, type = 'json' } = body

    if (!key || data === undefined) {
      return new Response(JSON.stringify({ error: 'Missing key or data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const value = type === 'json' ? JSON.stringify(data) : String(data)
    await kv.put(key, value)

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
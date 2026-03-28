// GET /api/load - 从 KV 读取内容
export async function onRequestGet(context) {
  const { request, env } = context
  const kv = env.selge_kv

  try {
    const url = new URL(request.url)
    const key = url.searchParams.get('key')

    if (!key) {
      return new Response(JSON.stringify({ error: 'Missing key' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const value = await kv.get(key, { type: 'text' })

    if (value === null) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 尝试解析 JSON，失败则返回原始文本
    let data
    try {
      data = JSON.parse(value)
    } catch {
      data = value
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
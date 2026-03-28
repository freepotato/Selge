// GET /api/load - 从 KV 读取内容（按用户隔离）
export async function onRequestGet(context) {
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
    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const key = `${userEmail}:${id}`
    const value = await kv.get(key, { type: 'text' })

    if (value === null) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

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
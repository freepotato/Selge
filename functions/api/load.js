// GET /api/load - 从 D1 读取内容（按用户隔离）
export async function onRequestGet(context) {
  const { request, env } = context
  const db = env.selge_d1

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

    // 从 D1 数据库读取数据
    const stmt = db.prepare(`SELECT data FROM user_data WHERE user_email = ? AND data_id = ?`)
    const result = await stmt.bind(userEmail, id).first()

    if (!result) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    let data
    try {
      data = JSON.parse(result.data)
    } catch {
      data = result.data
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
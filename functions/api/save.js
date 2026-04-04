// POST /api/save - 保存内容到 D1（按用户隔离）
export async function onRequestPost(context) {
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
    const body = await request.json()
    const { id, content } = body

    if (!id || content === undefined) {
      return new Response(JSON.stringify({ error: 'Missing id or content' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const dataStr = typeof content === 'object' ? JSON.stringify(content) : String(content)
    
    // 使用 UPSERT 操作：如果记录存在则更新，不存在则插入
    const stmt = db.prepare(`
      INSERT INTO user_data (user_email, data_id, data, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_email, data_id) DO UPDATE SET
        data = excluded.data,
        updated_at = CURRENT_TIMESTAMP
    `)
    
    await stmt.bind(userEmail, id, dataStr).run()

    return new Response(JSON.stringify({ success: true, key: `${userEmail}:${id}` }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
// POST /api/init-db - 初始化数据库表结构
export async function onRequestPost(context) {
  const { env } = context
  const db = env.selge_d1

  try {
    // 创建 user_data 表
    await db.exec(`
      CREATE TABLE IF NOT EXISTS user_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_email TEXT NOT NULL,
        data_id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_email, data_id)
      );
      
      -- 创建索引以提高查询性能
      CREATE INDEX IF NOT EXISTS idx_user_data_user_email ON user_data(user_email);
      CREATE INDEX IF NOT EXISTS idx_user_data_data_id ON user_data(data_id);
    `)

    return new Response(JSON.stringify({ success: true, message: '数据库初始化成功' }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

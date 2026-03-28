// POST /api/upload - 上传图片到 R2 并返回公网 URL
export async function onRequestPost(context) {
  const { request, env } = context
  const r2 = env.selge_r2

  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const noteId = formData.get('noteId') || 'default'

    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: 'Missing file' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 生成唯一文件名
    const ext = file.name.split('.').pop() || 'png'
    const timestamp = Date.now()
    const random = Math.random().toString(36).slice(2, 8)
    const filename = `${timestamp}-${random}.${ext}`
    const key = `${noteId}/${filename}`

    // 上传到 R2
    await r2.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type || 'image/png'
      }
    })

    // R2 公开访问 URL
    const publicUrl = 'https://pub-6cfc9e286538487c9b53729cec446578.r2.dev'
    const url = `${publicUrl}/${key}`

    return new Response(JSON.stringify({ success: true, url, key }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
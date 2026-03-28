// POST /api/upload - 上传图片到 R2（按用户隔离）
export async function onRequestPost(context) {
  const { request, env } = context
  const r2 = env.selge_r2

  const userEmail = request.headers.get('cf-access-authenticated-user-email')
  if (!userEmail) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const id = formData.get('id') || 'default'

    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: 'Missing file' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const timestamp = Date.now()
    const random = Math.random().toString(36).slice(2, 8)
    const ext = file.name.split('.').pop() || 'png'
    const filename = `${timestamp}-${random}.${ext}`
    const path = `${userEmail}/${id}/${filename}`

    await r2.put(path, file.stream(), {
      httpMetadata: {
        contentType: file.type || 'image/png'
      }
    })

    const publicUrl = 'https://pub-6cfc9e286538487c9b53729cec446578.r2.dev'
    const url = `${publicUrl}/${path}`

    return new Response(JSON.stringify({ success: true, url, path }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
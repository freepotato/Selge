// GET /api/images/sign?path=...&expires=3600  — 生成单个预签名 URL
// POST /api/images/sign                       — 批量生成预签名 URL
export async function onRequestGet(context) {
  const { request, env } = context
  const r2 = env.selge_r2

  const userEmail = request.headers.get('cf-access-authenticated-user-email')
  if (!userEmail) return json({ error: 'Unauthorized' }, 401)

  try {
    const url = new URL(request.url)
    const path = url.searchParams.get('path')
    const expiresIn = parseInt(url.searchParams.get('expires')) || 3600

    if (!path) return json({ error: 'Missing path' }, 400)
    if (!path.startsWith(userEmail + '/')) return json({ error: 'Forbidden' }, 403)

    const object = await r2.head(path)
    if (!object) return json({ error: 'Not found' }, 404)

    const signedUrl = object.createSignedUrl({ expiration: expiresIn * 1000 })
    return json({ success: true, url: signedUrl, expiresIn })
  } catch (e) {
    return json({ error: e.message }, 500)
  }
}

export async function onRequestPost(context) {
  const { request, env } = context
  const r2 = env.selge_r2

  const userEmail = request.headers.get('cf-access-authenticated-user-email')
  if (!userEmail) return json({ error: 'Unauthorized' }, 401)

  try {
    const { paths = [], expiresIn = 3600 } = await request.json()
    if (!Array.isArray(paths) || paths.length === 0) return json({ error: 'Missing paths' }, 400)
    if (paths.length > 100) return json({ error: 'Too many paths (max 100)' }, 400)

    const results = []
    for (const path of paths) {
      if (!path.startsWith(userEmail + '/')) {
        results.push({ path, error: 'Forbidden' })
        continue
      }
      try {
        const object = await r2.head(path)
        if (!object) { results.push({ path, error: 'Not found' }); continue }
        const signedUrl = object.createSignedUrl({ expiration: expiresIn * 1000 })
        results.push({ path, url: signedUrl, expiresIn })
      } catch (e) {
        results.push({ path, error: e.message })
      }
    }
    return json({ success: true, results })
  } catch (e) {
    return json({ error: e.message }, 500)
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

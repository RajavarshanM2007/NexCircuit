import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const BACKEND = process.env.INTERNAL_API_URL ?? 'http://localhost:3001'

async function proxy(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  const url = `${BACKEND}/${path.join('/')}${req.nextUrl.search}`

  const headers = new Headers()
  req.headers.forEach((value, key) => {
    // content-length is recomputed by fetch from the buffered body; forwarding
    // the original alongside chunked encoding trips body-parser's size check
    if (key !== 'host' && key !== 'content-length') headers.set(key, value)
  })

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD'

  try {
    const opts: RequestInit = { method: req.method, headers }
    if (hasBody) opts.body = Buffer.from(await req.arrayBuffer())

    const res = await fetch(url, opts)

    const outHeaders = new Headers()
    res.headers.forEach((value, key) => {
      if (key !== 'transfer-encoding') outHeaders.set(key, value)
    })

    return new NextResponse(res.body, {
      status: res.status,
      headers: outHeaders,
    })
  } catch {
    return NextResponse.json({ message: 'Backend unreachable' }, { status: 502 })
  }
}

export const GET    = proxy
export const POST   = proxy
export const PUT    = proxy
export const PATCH  = proxy
export const DELETE = proxy

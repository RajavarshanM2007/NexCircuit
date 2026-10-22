import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const session = req.auth
  const { pathname } = req.nextUrl

  // Redirect unauthenticated users to login
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Admin routes — only ADMIN role (or SUPPORT for orders)
  if (pathname.startsWith('/admin')) {
    const role = (session.user as any)?.role
    const allowedForSupport = pathname.startsWith('/admin/orders')
    if (role !== 'ADMIN' && !(role === 'SUPPORT' && allowedForSupport)) {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/profile/:path*',
    '/orders/:path*',
    '/wishlist/:path*',
    '/addresses/:path*',
    '/invoices/:path*',
    '/admin/:path*',
  ],
}

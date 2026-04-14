import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      const path = req.nextUrl.pathname

      // CSRF protection: verify Origin header on state-changing requests
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && path.startsWith('/api/')) {
        const origin = req.headers.get('origin')
        const host = req.headers.get('host')
        // Allow requests with no origin (same-origin, server-side) or matching origin
        if (origin) {
          try {
            const originHost = new URL(origin).host
            if (originHost !== host) {
              return false
            }
          } catch {
            return false
          }
        }
      }

      // Admin routes require admin role
      if (path.startsWith('/admin') || path.startsWith('/api/admin')) {
        return token?.role === 'admin'
      }

      // Chat and user routes require authentication
      if (
        path.startsWith('/chat') ||
        path.startsWith('/api/chat') ||
        path.startsWith('/api/conversations') ||
        path.startsWith('/api/tts') ||
        path.startsWith('/api/memories') ||
        path.startsWith('/api/profile')
      ) {
        return !!token
      }

      return true
    },
  },
})

export const config = {
  matcher: [
    '/chat/:path*',
    '/admin/:path*',
    '/api/chat/:path*',
    '/api/conversations/:path*',
    '/api/tts/:path*',
    '/api/admin/:path*',
    '/api/memories/:path*',
    '/api/profile/:path*',
  ],
}

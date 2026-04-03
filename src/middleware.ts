import { withAuth } from 'next-auth/middleware'

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      const path = req.nextUrl.pathname

      // Admin routes require admin role
      if (path.startsWith('/admin') || path.startsWith('/api/admin')) {
        return token?.role === 'admin'
      }

      // Chat routes require authentication
      if (path.startsWith('/chat') || path.startsWith('/api/chat') || path.startsWith('/api/conversations') || path.startsWith('/api/tts')) {
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
  ],
}

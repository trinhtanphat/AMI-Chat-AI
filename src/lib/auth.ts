import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email và mật khẩu không được để trống')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        // Always perform bcrypt comparison to prevent timing attacks
        const dummyHash = '$2a$12$kNFsrIjb8yol73ZXbpEAfO5ZaRRVIrQ/ia.YWdepD24B/B/uduOLq'
        const isPasswordValid = await compare(
          credentials.password,
          user?.password || dummyHash
        )

        if (!user || !isPasswordValid) {
          throw new Error('Email hoặc mật khẩu không đúng')
        }

        if (!user.isActive) {
          throw new Error('Tài khoản đã bị vô hiệu hóa')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string
        session.user.id = token.id as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
}

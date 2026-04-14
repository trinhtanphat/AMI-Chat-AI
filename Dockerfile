# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

# Build args (Next.js needs these at build time)
ARG NEXTAUTH_SECRET=build-placeholder
ARG DATABASE_URL="file:./dev.db"
ARG ADMIN_EMAIL="admin@ami.chat"
ARG ADMIN_PASSWORD="admin123"
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET
ENV DATABASE_URL=$DATABASE_URL
ENV ADMIN_EMAIL=$ADMIN_EMAIL
ENV ADMIN_PASSWORD=$ADMIN_PASSWORD

# Install dependencies
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN apk add --no-cache openssl
RUN npm ci

# Copy source and build
COPY . .
RUN npx prisma generate
RUN npm run build

# Initialize and seed database
RUN npx prisma db push --skip-generate
RUN npx tsx prisma/seed.ts

# ---- Production stage ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
RUN apk add --no-cache openssl

# Copy standalone output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy the initialized database
COPY --from=builder /app/prisma/dev.db ./prisma/dev.db

# Set permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -q --spider http://0.0.0.0:3000 || exit 1

CMD ["node", "server.js"]

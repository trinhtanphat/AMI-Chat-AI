# VNSO Chat AI

Ứng dụng chat AI với nhân vật Live2D động, xây dựng bằng **Next.js 14** (App Router), **TypeScript**, **Tailwind CSS**, **Prisma** và **SQLite**.

## Tính năng

- 💬 Chat AI với streaming (Server-Sent Events)
- 🎭 Nhân vật Live2D 2D động (10 model có sẵn)
- 🔐 Đăng nhập / Đăng ký với NextAuth.js (JWT)
- 🛠️ Admin Panel quản lý: users, AI providers, models, Live2D characters, settings
- 🖼️ Chọn background (sân trường, hoa phượng, hoa sữa...)
- 🔍 Zoom in/out nhân vật Live2D
- 📱 Giao diện anime floating chat panel

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 3.4 |
| Database | Prisma + SQLite |
| Auth | NextAuth.js 4 (Credentials + JWT) |
| Live2D | pixi.js 6.5 + pixi-live2d-display 0.4 |
| State | Zustand 5 |

## Cài đặt

```bash
# Clone repo
git clone <repo-url>
cd "AMI Chat AI"

# Cài dependencies
npm install

# Tạo database + seed data
npx prisma db push
npx tsx prisma/seed.ts

# Chạy dev server
npm run dev
```

Mở http://localhost:3000

## Đăng nhập Admin

| Field | Value |
|-------|-------|
| Email | `admin@ami.chat` |
| Password | `admin123` |

Truy cập Admin Panel: http://localhost:3000/admin

## Live2D Characters có sẵn

| # | Tên | Nguồn | Format |
|---|-----|-------|--------|
| 1 | Haru (Greeter) | guansss/pixi-live2d-display | Cubism 3 |
| 2 | Shizuku | guansss/pixi-live2d-display | Cubism 2 |
| 3 | Haru | Live2D/CubismWebSamples | Cubism 3 |
| 4 | Hiyori | Live2D/CubismWebSamples | Cubism 3 |
| 5 | Mao | Live2D/CubismWebSamples | Cubism 3 |
| 6 | Mark | Live2D/CubismWebSamples | Cubism 3 |
| 7 | Natori | Live2D/CubismWebSamples | Cubism 3 |
| 8 | Ren | Live2D/CubismWebSamples | Cubism 3 |
| 9 | Rice | Live2D/CubismWebSamples | Cubism 3 |
| 10 | Wanko | Live2D/CubismWebSamples | Cubism 3 |

Có thể thêm model mới qua Admin Panel → Live2D Characters.

## Cấu trúc thư mục

```
src/
├── app/
│   ├── admin/          # Admin pages (dashboard, users, providers, models, characters, settings)
│   ├── api/            # API routes (auth, chat, conversations, characters, admin)
│   ├── chat/           # Chat page với Live2D
│   ├── login/          # Login page
│   └── register/       # Register page
├── components/         # React components (ChatMessage, Live2DCharacter, etc.)
├── lib/                # Prisma client, auth config
└── store/              # Zustand stores
prisma/
├── schema.prisma       # Database schema
└── seed.ts             # Seed data (admin, settings, Live2D characters)
public/
├── assets/             # Images (backgrounds, logos)
└── libs/               # Live2D SDK files (live2d.min.js, live2dcubismcore.min.js)
```

## Deploy

### Vercel (Khuyến nghị)

> ⚠️ SQLite **không hoạt động** trên Vercel serverless. Cần chuyển sang PostgreSQL (ví dụ: Neon, Supabase, PlanetScale).

**Bước 1**: Chuyển database sang PostgreSQL

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**Bước 2**: Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables trên Vercel Dashboard:
# DATABASE_URL=postgresql://...
# NEXTAUTH_SECRET=your-secret-key
# NEXTAUTH_URL=https://your-app.vercel.app
```

**Bước 3**: Migrate database

```bash
npx prisma db push
npx tsx prisma/seed.ts
```

### VPS (Ubuntu/Debian)

```bash
# 1. Cài Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 2. Clone & build
git clone <repo-url>
cd "AMI Chat AI"
npm install
npx prisma db push
npx tsx prisma/seed.ts
npm run build

# 3. Chạy với PM2
npm i -g pm2
pm2 start npm --name "vnso-chat" -- start
pm2 save
pm2 startup

# 4. Nginx reverse proxy (optional)
# /etc/nginx/sites-available/vnso-chat
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Docker

```bash
# Build
docker build -t vnso-chat .

# Run
docker run -p 3000:3000 \
  -e DATABASE_URL="file:./dev.db" \
  -e NEXTAUTH_SECRET="your-secret" \
  -e NEXTAUTH_URL="http://localhost:3000" \
  vnso-chat
```

### GitHub Pages

> ❌ **Không hỗ trợ**. GitHub Pages chỉ host static files, không chạy được Next.js API routes và server-side rendering.

## Environment Variables

| Variable | Mô tả | Default |
|----------|--------|---------|
| `DATABASE_URL` | Database connection string | `file:./dev.db` |
| `NEXTAUTH_SECRET` | Secret key cho JWT | (required in production) |
| `NEXTAUTH_URL` | URL của app | `http://localhost:3000` |
| `ADMIN_EMAIL` | Email admin mặc định | `admin@ami.chat` |
| `ADMIN_PASSWORD` | Password admin mặc định | `admin123` |

## License

MIT

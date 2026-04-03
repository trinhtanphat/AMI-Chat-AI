import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@ami.chat'
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } })

  if (!existingAdmin) {
    const hashedPassword = await hash(adminPassword, 12)
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Admin',
        password: hashedPassword,
        role: 'admin',
      },
    })
    console.log(`Admin user created: ${adminEmail}`)
  } else {
    console.log('Admin user already exists')
  }

  // Default system settings
  const defaults = [
    { key: 'site_name', value: 'VNSO Chat AI' },
    { key: 'site_description', value: 'HQG VNSO - AI Chat Assistant' },
    { key: 'max_messages_per_conversation', value: '100' },
    { key: 'allow_registration', value: 'true' },
    { key: 'default_system_prompt', value: 'You are a helpful AI assistant. Answer questions accurately and helpfully.' },
  ]

  for (const setting of defaults) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    })
  }
  console.log('Default settings seeded')

  // Create a default OpenAI provider (inactive - admin needs to add API key)
  const existingProvider = await prisma.aiProvider.findFirst({ where: { name: 'OpenAI' } })
  if (!existingProvider) {
    const provider = await prisma.aiProvider.create({
      data: {
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-your-api-key-here',
        isActive: false,
      },
    })
    await prisma.aiModel.createMany({
      data: [
        { name: 'GPT-4o', modelId: 'gpt-4o', providerId: provider.id, isDefault: true },
        { name: 'GPT-4o Mini', modelId: 'gpt-4o-mini', providerId: provider.id },
        { name: 'GPT-3.5 Turbo', modelId: 'gpt-3.5-turbo', providerId: provider.id },
      ],
    })
    console.log('Default AI provider and models seeded')
  }

  // Seed Live2D characters - always reseed (delete old + create new)
  await prisma.live2DCharacter.deleteMany()
  await prisma.live2DCharacter.createMany({
    data: [
      // === Official Cubism 3/4 Models ===
      { name: 'Haru (Greeter)', modelUrl: '/models/Haru_Greeter/haru_greeter_t03.model3.json', category: 'anime', isDefault: true, sortOrder: 1 },
      { name: 'Haru', modelUrl: '/models/Haru/Haru.model3.json', category: 'anime', sortOrder: 2 },
      { name: 'Hiyori', modelUrl: '/models/Hiyori/Hiyori.model3.json', category: 'anime', sortOrder: 3 },
      { name: 'Mao', modelUrl: '/models/Mao/Mao.model3.json', category: 'anime', sortOrder: 4 },
      { name: 'Mark', modelUrl: '/models/Mark/Mark.model3.json', category: 'default', sortOrder: 5 },
      { name: 'Natori', modelUrl: '/models/Natori/Natori.model3.json', category: 'mascot', sortOrder: 6 },
      { name: 'Rice', modelUrl: '/models/Rice/Rice.model3.json', category: 'chibi', sortOrder: 7 },
      { name: 'Wanko', modelUrl: '/models/Wanko/Wanko.model3.json', category: 'mascot', sortOrder: 8 },
      { name: 'Senko', modelUrl: '/models/Senko/senko.model3.json', category: 'anime', sortOrder: 9 },
      // === Cubism 2 Classic Models ===
      { name: 'Shizuku', modelUrl: '/models/Shizuku/shizuku.model.json', category: 'anime', sortOrder: 10 },
      { name: 'Miku', modelUrl: '/models/Miku/miku.model.json', category: 'anime', sortOrder: 11 },
      { name: 'Rem', modelUrl: '/models/Rem/model.json', category: 'anime', sortOrder: 12 },
      { name: 'HK416', modelUrl: '/models/HK416/model.json', category: 'anime', sortOrder: 13 },
      { name: 'Kar98k', modelUrl: '/models/Kar98k/model.json', category: 'anime', sortOrder: 14 },
      { name: 'Koharu', modelUrl: '/models/Koharu/koharu.model.json', category: 'anime', sortOrder: 15 },
      { name: 'Chitose', modelUrl: '/models/Chitose/chitose.model.json', category: 'anime', sortOrder: 16 },
      { name: 'Hibiki', modelUrl: '/models/Hibiki/hibiki.model.json', category: 'anime', sortOrder: 17 },
      { name: 'Izumi', modelUrl: '/models/Izumi/izumi.model.json', category: 'anime', sortOrder: 18 },
      { name: 'Z16', modelUrl: '/models/Z16/z16.model.json', category: 'anime', sortOrder: 19 },
      { name: 'Unity-chan', modelUrl: '/models/Unitychan/unitychan.model.json', category: 'anime', sortOrder: 20 },
      { name: 'Hijiki (Cat)', modelUrl: '/models/Hijiki/hijiki.model.json', category: 'mascot', sortOrder: 21 },
      { name: 'Tororo (Cat)', modelUrl: '/models/Tororo/tororo.model.json', category: 'mascot', sortOrder: 22 },
      { name: 'Neptune', modelUrl: '/models/Neptune/index.json', category: 'anime', sortOrder: 23 },
      { name: 'Noire', modelUrl: '/models/Noire/index.json', category: 'anime', sortOrder: 24 },
      { name: 'Pio', modelUrl: '/models/Pio/index.json', category: 'chibi', sortOrder: 25 },
      { name: 'Tia', modelUrl: '/models/Tia/index.json', category: 'chibi', sortOrder: 26 },
      { name: 'Umaru', modelUrl: '/models/Umaru/model.json', category: 'chibi', sortOrder: 27 },
      { name: 'Platelet', modelUrl: '/models/Platelet/model.json', category: 'anime', sortOrder: 28 },
      // Ren is inactive (moc3 v6, needs Cubism Core SDK 06.x)
      { name: 'Ren ⚠️', modelUrl: '/models/Ren/Ren.model3.json', category: 'anime', isActive: false, sortOrder: 99 },
    ],
  })
  console.log('Live2D characters seeded (28 active + 1 inactive)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

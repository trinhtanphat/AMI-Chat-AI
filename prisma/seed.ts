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
    { key: 'enable_memory_system', value: 'true' },
    { key: 'enable_emotion_detection', value: 'true' },
    { key: 'default_language', value: 'vi' },
    { key: 'max_memories_per_user', value: '50' },
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
      { name: 'Shizuku', modelUrl: '/models/shizuku/shizuku.model.json', category: 'anime', sortOrder: 10 },
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
      // === New Community Models ===
      { name: 'Haruto', modelUrl: '/models/haruto/haruto.model.json', category: 'default', sortOrder: 29 },
      { name: 'Nico', modelUrl: '/models/nico/nico.model.json', category: 'anime', sortOrder: 30 },
      { name: 'Nipsilon', modelUrl: '/models/nipsilon/nipsilon.model.json', category: 'default', sortOrder: 31 },
      { name: 'Nito', modelUrl: '/models/nito/nito.model.json', category: 'default', sortOrder: 32 },
      { name: 'Tsumiki', modelUrl: '/models/tsumiki/tsumiki.model.json', category: 'anime', sortOrder: 33 },
      { name: 'Ni-j', modelUrl: '/models/ni-j/ni-j.model.json', category: 'default', sortOrder: 34 },
      // === New 2D Models ===
      { name: 'Epsilon', modelUrl: '/models/Epsilon/Epsilon2.1.model.json', category: 'default', sortOrder: 35 },
      { name: 'Gantzert Felixander', modelUrl: '/models/GantzertFelixander/Gantzert_Felixander.model.json', category: 'default', sortOrder: 36 },
      { name: 'Nietzsche', modelUrl: '/models/Nietzsche/nietzsche.model.json', category: 'default', sortOrder: 37 },
      // === 3D VRM Models ===
      { name: 'VRM Sample (3D)', modelUrl: '/models/3d/VRM1_Sample.vrm', category: '3d', sortOrder: 38 },
      { name: 'Seed-san (3D)', modelUrl: '/models/3d/Seed-san.vrm', category: '3d', sortOrder: 39 },
      { name: 'Twist Girl (3D)', modelUrl: '/models/3d/VRM1_Constraint_Twist.vrm', category: '3d', sortOrder: 40 },
      { name: 'Avatar Orion (3D)', modelUrl: '/models/3d/Avatar_Orion.vrm', category: '3d', sortOrder: 41 },
      { name: 'CryptoVoxels (3D)', modelUrl: '/models/3d/cryptovoxels.vrm', category: '3d', sortOrder: 42 },
      { name: 'Meebit (3D)', modelUrl: '/models/3d/Meebit.vrm', category: '3d', sortOrder: 43 },
      { name: 'AvatarSample A (3D)', modelUrl: '/models/3d/AvatarSample_A.vrm', category: '3d', sortOrder: 44 },
      { name: 'AvatarSample B (3D)', modelUrl: '/models/3d/AvatarSample_B.vrm', category: '3d', sortOrder: 45 },
      { name: 'AvatarSample C (3D)', modelUrl: '/models/3d/AvatarSample_C.vrm', category: '3d', sortOrder: 46 },
      { name: 'Vivi (3D)', modelUrl: '/models/3d/Vivi.vrm', category: '3d', sortOrder: 47 },
      { name: 'Victoria Rubin (3D)', modelUrl: '/models/3d/Victoria_Rubin.vrm', category: '3d', sortOrder: 48 },
      { name: 'Sendagaya Shibu (3D)', modelUrl: '/models/3d/Sendagaya_Shibu.vrm', category: '3d', sortOrder: 49 },
      { name: 'Sendagaya Shino (3D)', modelUrl: '/models/3d/Sendagaya_Shino.vrm', category: '3d', sortOrder: 50 },
      { name: 'Vita (3D)', modelUrl: '/models/3d/Vita.vrm', category: '3d', sortOrder: 51 },
      { name: 'Sakurada Fumiriya (3D)', modelUrl: '/models/3d/Sakurada_Fumiriya.vrm', category: '3d', sortOrder: 52 },
      // === GLB 3D Models ===
      { name: 'Robot Expressive (GLB)', modelUrl: '/models/3d/RobotExpressive.glb', category: '3d', sortOrder: 53 },
      { name: 'Soldier (GLB)', modelUrl: '/models/3d/Soldier.glb', category: '3d', sortOrder: 54 },
      { name: 'Xbot (GLB)', modelUrl: '/models/3d/Xbot.glb', category: '3d', sortOrder: 55 },
      { name: 'Michelle (GLB)', modelUrl: '/models/3d/Michelle.glb', category: '3d', sortOrder: 56 },
      { name: 'Facecap (GLB)', modelUrl: '/models/3d/Facecap.glb', category: '3d', sortOrder: 57 },
      { name: 'Horse (GLB)', modelUrl: '/models/3d/Horse.glb', category: '3d', sortOrder: 58 },
      { name: 'Parrot (GLB)', modelUrl: '/models/3d/Parrot.glb', category: '3d', sortOrder: 59 },
      { name: 'Flamingo (GLB)', modelUrl: '/models/3d/Flamingo.glb', category: '3d', sortOrder: 60 },
      { name: 'Stork (GLB)', modelUrl: '/models/3d/Stork.glb', category: '3d', sortOrder: 61 },
      // New GLB models batch 2
      { name: 'Kira (GLB)', modelUrl: '/models/3d/kira.glb', category: '3d', sortOrder: 62 },
      { name: 'Littlest Tokyo (GLB)', modelUrl: '/models/3d/LittlestTokyo.glb', category: '3d', sortOrder: 63 },
      { name: 'ReadyPlayer Me (GLB)', modelUrl: '/models/3d/ReadyPlayerMe.glb', category: '3d', sortOrder: 64 },
      { name: 'BrainStem (GLB)', modelUrl: '/models/3d/BrainStem.glb', category: '3d', sortOrder: 65 },
      { name: 'Fox (GLB)', modelUrl: '/models/3d/Fox.glb', category: '3d', sortOrder: 66 },
      { name: 'CesiumMan (GLB)', modelUrl: '/models/3d/CesiumMan.glb', category: '3d', sortOrder: 67 },
      { name: 'Rigged Figure (GLB)', modelUrl: '/models/3d/RiggedFigure.glb', category: '3d', sortOrder: 68 },
      { name: 'Duck (GLB)', modelUrl: '/models/3d/Duck.glb', category: '3d', sortOrder: 69 },
      { name: 'Milk Truck (GLB)', modelUrl: '/models/3d/CesiumMilkTruck.glb', category: '3d', sortOrder: 70 },
      { name: 'Toy Car (GLB)', modelUrl: '/models/3d/ToyCar.glb', category: '3d', sortOrder: 71 },
      // Custom generated character from image (TRELLIS AI)
      { name: 'My Character (GLB)', modelUrl: '/models/3d/MyCharacter.glb', category: '3d', sortOrder: 72 },
      // Ami-VNSO character with lip sync support
      { name: 'Ami-VNSO', modelUrl: '/models/Ami-PTIT/ptit_sdk.model3.json', category: 'anime', sortOrder: 0 },
      // === Hiyori from airi project (dist.ayaka.moe) ===
      { name: 'Hiyori Free (ZH)', modelUrl: '/models/Hiyori_Free/hiyori_free_t08.model3.json', category: 'anime', sortOrder: 73 },
      { name: 'Hiyori Pro (ZH)', modelUrl: '/models/Hiyori_Pro/hiyori_pro_t11.model3.json', category: 'anime', sortOrder: 74 },
      // Ren is inactive (moc3 v6, needs Cubism SDK 5.x)
      { name: 'Ren (SDK5)', modelUrl: '/models/Ren/Ren.model3.json', category: 'anime', isActive: false, sortOrder: 99 },
    ],
  })
  console.log('Live2D characters seeded (72 active + 1 inactive)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

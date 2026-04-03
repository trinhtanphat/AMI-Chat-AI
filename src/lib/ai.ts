import { prisma } from './prisma'

export async function getActiveProvider() {
  return prisma.aiProvider.findFirst({
    where: { isActive: true },
    include: { models: { where: { isActive: true } } },
  })
}

export async function getDefaultModel() {
  const model = await prisma.aiModel.findFirst({
    where: { isDefault: true, isActive: true },
    include: { provider: true },
  })
  if (!model) {
    const fallback = await prisma.aiModel.findFirst({
      where: { isActive: true },
      include: { provider: true },
    })
    return fallback
  }
  return model
}

export async function getSystemPrompt() {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: 'default_system_prompt' },
  })
  return setting?.value || 'You are a helpful AI assistant.'
}

export async function streamChatCompletion(
  messages: { role: string; content: string }[],
  modelId?: string
) {
  const model = modelId
    ? await prisma.aiModel.findUnique({ where: { id: modelId }, include: { provider: true } })
    : await getDefaultModel()

  if (!model || !model.provider) {
    throw new Error('No active AI model configured. Please ask admin to setup AI provider.')
  }

  if (!model.provider.isActive) {
    throw new Error('AI provider is not active. Please ask admin to activate it.')
  }

  const systemPrompt = await getSystemPrompt()

  const allMessages = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ]

  const response = await fetch(`${model.provider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${model.provider.apiKey}`,
    },
    body: JSON.stringify({
      model: model.modelId,
      messages: allMessages,
      stream: true,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`AI API error: ${response.status} - ${error}`)
  }

  return response.body
}

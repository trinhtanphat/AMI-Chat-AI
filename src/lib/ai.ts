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
  modelId?: string,
  context?: {
    memories?: string[]
    characterPrompt?: string
    userPrompt?: string
  }
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

  // Build enhanced system prompt with character personality and memories
  let enhancedPrompt = systemPrompt

  if (context?.characterPrompt) {
    enhancedPrompt += `\n\nCharacter Personality: ${context.characterPrompt}`
  }

  if (context?.userPrompt) {
    enhancedPrompt += `\n\nUser Custom Instructions: ${context.userPrompt}`
  }

  if (context?.memories && context.memories.length > 0) {
    enhancedPrompt += `\n\nKnown facts about the user:\n${context.memories.map(m => `- ${m}`).join('\n')}`
  }

  const allMessages = [
    { role: 'system', content: enhancedPrompt },
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
    const errorText = await response.text()
    console.error(`[SECURITY] AI API error [${response.status}] from ${model.provider.name}:`, errorText.substring(0, 500))

    // Return generic user-friendly messages - don't leak provider details
    switch (response.status) {
      case 401:
      case 403:
        throw new Error('Xác thực AI thất bại. Vui lòng liên hệ admin.')
      case 402:
        throw new Error('Dịch vụ AI đã hết credit. Vui lòng chọn mô hình khác hoặc liên hệ admin.')
      case 429:
        throw new Error('Quá nhiều yêu cầu. Vui lòng chờ một chút rồi thử lại.')
      case 404:
        throw new Error('Mô hình AI không khả dụng. Vui lòng chọn mô hình khác.')
      case 500:
      case 502:
      case 503:
        throw new Error('Dịch vụ AI tạm thời không khả dụng. Vui lòng thử lại sau.')
      default:
        throw new Error('Không thể xử lý yêu cầu. Vui lòng thử lại.')
    }
  }

  return response.body
}

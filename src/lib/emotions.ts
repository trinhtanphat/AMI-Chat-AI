/**
 * Emotion detection from AI response text
 * Inspired by airi's character emotion system
 * Maps detected sentiment to character expressions
 */

export type Emotion = 'happy' | 'sad' | 'angry' | 'surprised' | 'neutral' | 'relaxed' | 'fun' | 'thinking'

interface EmotionPattern {
  emotion: Emotion
  patterns: RegExp[]
  keywords: string[]
}

const EMOTION_PATTERNS: EmotionPattern[] = [
  {
    emotion: 'happy',
    patterns: [/😊|😄|🎉|💜|❤️|😁|🥰|✨|👏|💪/],
    keywords: [
      'vui', 'hạnh phúc', 'tuyệt vời', 'xuất sắc', 'tốt lắm', 'chúc mừng', 'hay quá',
      'happy', 'great', 'awesome', 'excellent', 'wonderful', 'amazing', 'love', 'congratulations',
      'glad', 'perfect', 'fantastic', 'brilliant', 'haha', 'hihi', 'tuyệt', 'đỉnh',
    ],
  },
  {
    emotion: 'sad',
    patterns: [/😢|😭|💔|😞|🥺|😿/],
    keywords: [
      'buồn', 'xin lỗi', 'đáng tiếc', 'không may', 'thất vọng', 'rất tiếc',
      'sorry', 'sad', 'unfortunately', 'regret', 'disappointed', 'miss', 'loss',
      'tiếc', 'thương', 'đau', 'khóc',
    ],
  },
  {
    emotion: 'angry',
    patterns: [/😠|😡|🤬|💢/],
    keywords: [
      'tức giận', 'phẫn nộ', 'không chấp nhận', 'cấm', 'nguy hiểm',
      'angry', 'furious', 'unacceptable', 'dangerous', 'warning', 'critical error',
    ],
  },
  {
    emotion: 'surprised',
    patterns: [/😲|😮|🤯|😱|❗|⚡/],
    keywords: [
      'ngạc nhiên', 'thú vị', 'bất ngờ', 'không ngờ', 'wow',
      'surprised', 'interesting', 'unexpected', 'wow', 'incredible', 'unbelievable',
      'ồ', 'ôi', 'thật sao', 'amazing',
    ],
  },
  {
    emotion: 'thinking',
    patterns: [/🤔|💭|📝|🔍/],
    keywords: [
      'hãy xem', 'để tôi', 'suy nghĩ', 'phân tích', 'xem xét',
      'let me think', 'consider', 'analyze', 'hmm', 'well',
      'thử', 'kiểm tra', 'research', 'investigate',
    ],
  },
  {
    emotion: 'fun',
    patterns: [/🎮|🎵|🎨|🎪|🎭|🎬|🎉/],
    keywords: [
      'chơi', 'vui vẻ', 'giải trí', 'thưởng thức', 'thú vị',
      'fun', 'play', 'enjoy', 'entertainment', 'game',
    ],
  },
  {
    emotion: 'relaxed',
    patterns: [/😌|🧘|☕|🌸|🌿/],
    keywords: [
      'thư giãn', 'bình tĩnh', 'yên tâm', 'không sao', 'dễ dàng',
      'relax', 'calm', 'easy', 'simple', 'no worries', 'chill',
    ],
  },
]

/**
 * Detect emotion from text content
 * Uses keyword matching and emoji detection
 */
export function detectEmotion(text: string): Emotion {
  if (!text) return 'neutral'

  const lowerText = text.toLowerCase()
  const scores: Record<Emotion, number> = {
    happy: 0, sad: 0, angry: 0, surprised: 0,
    neutral: 0, relaxed: 0, fun: 0, thinking: 0,
  }

  for (const pattern of EMOTION_PATTERNS) {
    // Check emoji patterns
    for (const re of pattern.patterns) {
      const matches = text.match(re)
      if (matches) {
        scores[pattern.emotion] += matches.length * 2
      }
    }

    // Check keywords
    for (const keyword of pattern.keywords) {
      if (lowerText.includes(keyword)) {
        scores[pattern.emotion] += 1
      }
    }
  }

  // Find highest scoring emotion
  let maxScore = 0
  let detected: Emotion = 'neutral'
  for (const [emotion, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score
      detected = emotion as Emotion
    }
  }

  return detected
}

/**
 * Map emotion to Live2D expression index
 * Returns expression name suitable for Live2D models
 */
export function emotionToLive2DExpression(emotion: Emotion): string | null {
  const map: Record<Emotion, string | null> = {
    happy: 'smile',
    sad: 'sad',
    angry: 'angry',
    surprised: 'surprise',
    neutral: null,
    relaxed: 'relaxed',
    fun: 'smile',
    thinking: null,
  }
  return map[emotion]
}

/**
 * Map emotion to VRM expression name
 */
export function emotionToVRMExpression(emotion: Emotion): string {
  const map: Record<Emotion, string> = {
    happy: 'happy',
    sad: 'sad',
    angry: 'angry',
    surprised: 'surprised',
    neutral: 'neutral',
    relaxed: 'relaxed',
    fun: 'fun',
    thinking: 'neutral',
  }
  return map[emotion]
}

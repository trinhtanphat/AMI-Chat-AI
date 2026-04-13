'use client'

import { create } from 'zustand'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt?: string
}

interface Conversation {
  id: string
  title: string
  modelId?: string
  isPinned?: boolean
  updatedAt: string
  messages?: Message[]
}

interface Memory {
  id: string
  type: string
  content: string
  updatedAt: string
}

interface ChatState {
  conversations: Conversation[]
  currentConversationId: string | null
  messages: Message[]
  isStreaming: boolean
  streamingContent: string
  selectedModelId: string | null
  autoVoiceMode: boolean
  autoVoiceDelay: number
  searchQuery: string
  currentEmotion: string
  locale: 'vi' | 'en'
  memories: Memory[]

  setConversations: (conversations: Conversation[]) => void
  setCurrentConversation: (id: string | null) => void
  setMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  setIsStreaming: (isStreaming: boolean) => void
  setStreamingContent: (content: string) => void
  appendStreamingContent: (content: string) => void
  setSelectedModelId: (id: string | null) => void
  removeConversation: (id: string) => void
  setAutoVoiceMode: (on: boolean) => void
  setAutoVoiceDelay: (delay: number) => void
  setSearchQuery: (query: string) => void
  setCurrentEmotion: (emotion: string) => void
  setLocale: (locale: 'vi' | 'en') => void
  togglePinConversation: (id: string) => void
  setMemories: (memories: Memory[]) => void
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  currentConversationId: null,
  messages: [],
  isStreaming: false,
  streamingContent: '',
  selectedModelId: null,
  autoVoiceMode: false,
  autoVoiceDelay: 2,
  searchQuery: '',
  currentEmotion: 'neutral',
  locale: (typeof window !== 'undefined' ? (localStorage.getItem('ami.locale') as 'vi' | 'en') : null) || 'vi',
  memories: [],

  setConversations: (conversations) => set({ conversations }),
  setCurrentConversation: (id) => set({ currentConversationId: id }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  setStreamingContent: (content) => set({ streamingContent: content }),
  appendStreamingContent: (content) =>
    set((state) => ({ streamingContent: state.streamingContent + content })),
  setSelectedModelId: (id) => set({ selectedModelId: id }),
  removeConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      currentConversationId: state.currentConversationId === id ? null : state.currentConversationId,
      messages: state.currentConversationId === id ? [] : state.messages,
    })),
  setAutoVoiceMode: (on) => set({ autoVoiceMode: on }),
  setAutoVoiceDelay: (delay) => set({ autoVoiceDelay: delay }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setCurrentEmotion: (emotion) => set({ currentEmotion: emotion }),
  setLocale: (locale) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ami.locale', locale)
    }
    set({ locale })
  },
  togglePinConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, isPinned: !c.isPinned } : c
      ),
    })),
  setMemories: (memories) => set({ memories }),
}))

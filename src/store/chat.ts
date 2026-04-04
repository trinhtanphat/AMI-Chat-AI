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
  updatedAt: string
  messages?: Message[]
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
}))

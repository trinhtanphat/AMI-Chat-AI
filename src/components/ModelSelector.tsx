'use client'

import { useState, useEffect } from 'react'
import { useChatStore } from '@/store/chat'

interface Model {
  id: string
  name: string
  modelId: string
  provider: { name: string }
}

export default function ModelSelector() {
  const [models, setModels] = useState<Model[]>([])
  const [open, setOpen] = useState(false)
  const { selectedModelId, setSelectedModelId } = useChatStore()

  useEffect(() => {
    fetch('/api/models')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setModels(data)
          if (data.length > 0 && !selectedModelId) {
            const defaultModel = data.find((m: any) => m.isDefault) || data[0]
            setSelectedModelId(defaultModel.id)
          }
        }
      })
      .catch(console.error)
  }, [])

  const selected = models.find((m) => m.id === selectedModelId)

  if (models.length === 0) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-300 transition"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
        </svg>
        {selected ? selected.name : 'Chọn model'}
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-20 min-w-[200px] overflow-hidden">
            {models.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  setSelectedModelId(model.id)
                  setOpen(false)
                }}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-700 transition flex items-center justify-between ${
                  selectedModelId === model.id ? 'text-blue-400' : 'text-gray-300'
                }`}
              >
                <div>
                  <div className="font-medium">{model.name}</div>
                  <div className="text-xs text-gray-500">{model.provider.name}</div>
                </div>
                {selectedModelId === model.id && (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'

interface Model {
  id: string
  name: string
  modelId: string
  isActive: boolean
  isDefault: boolean
}

interface Provider {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  isActive: boolean
  models: Model[]
}

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editProvider, setEditProvider] = useState<Provider | null>(null)
  const [form, setForm] = useState({ name: '', baseUrl: '', apiKey: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchProviders()
  }, [])

  const fetchProviders = async () => {
    try {
      const res = await fetch('/api/admin/providers')
      const data = await res.json()
      setProviders(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditProvider(null)
    setForm({ name: '', baseUrl: '', apiKey: '' })
    setShowModal(true)
  }

  const openEdit = (provider: Provider) => {
    setEditProvider(provider)
    setForm({ name: provider.name, baseUrl: provider.baseUrl, apiKey: '' })
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editProvider) {
        await fetch('/api/admin/providers', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editProvider.id,
            name: form.name,
            baseUrl: form.baseUrl,
            ...(form.apiKey ? { apiKey: form.apiKey } : {}),
          }),
        })
      } else {
        await fetch('/api/admin/providers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      }
      setShowModal(false)
      fetchProviders()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (provider: Provider) => {
    await fetch('/api/admin/providers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: provider.id, isActive: !provider.isActive }),
    })
    fetchProviders()
  }

  const deleteProvider = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa provider này? Tất cả models liên quan cũng sẽ bị xóa.')) return
    await fetch(`/api/admin/providers?id=${id}`, { method: 'DELETE' })
    fetchProviders()
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Providers</h1>
          <p className="text-gray-400 text-sm mt-1">Quản lý các nhà cung cấp AI (OpenAI, Anthropic, Google, ...)</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Thêm Provider
        </button>
      </div>

      <div className="grid gap-4">
        {providers.length === 0 ? (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
            <p className="text-gray-400">Chưa có provider nào. Hãy thêm provider đầu tiên!</p>
          </div>
        ) : (
          providers.map((provider) => (
            <div key={provider.id} className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${provider.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                  <div>
                    <h3 className="text-lg font-semibold text-white">{provider.name}</h3>
                    <p className="text-sm text-gray-400">{provider.baseUrl}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(provider)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                      provider.isActive
                        ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                        : 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                    }`}
                  >
                    {provider.isActive ? 'Đang bật' : 'Đang tắt'}
                  </button>
                  <button onClick={() => openEdit(provider)} className="p-1.5 hover:bg-gray-700 rounded-lg transition">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                    </svg>
                  </button>
                  <button onClick={() => deleteProvider(provider.id)} className="p-1.5 hover:bg-gray-700 rounded-lg transition">
                    <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>API Key: {provider.apiKey}</span>
                <span>·</span>
                <span>{provider.models.length} model(s)</span>
              </div>

              {provider.models.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {provider.models.map((model) => (
                    <span
                      key={model.id}
                      className={`px-2 py-1 rounded text-xs ${
                        model.isActive
                          ? 'bg-blue-600/20 text-blue-400'
                          : 'bg-gray-700 text-gray-500'
                      } ${model.isDefault ? 'ring-1 ring-blue-500' : ''}`}
                    >
                      {model.name}
                      {model.isDefault && ' ★'}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-white mb-6">
              {editProvider ? 'Chỉnh sửa Provider' : 'Thêm Provider mới'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Tên Provider</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="OpenAI, Google AI, Anthropic..."
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Base URL</label>
                <input
                  type="url"
                  value={form.baseUrl}
                  onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="https://api.openai.com/v1"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  API Key {editProvider && '(để trống nếu không đổi)'}
                </label>
                <input
                  type="password"
                  value={form.apiKey}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="sk-..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-lg transition"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
              >
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

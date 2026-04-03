'use client'

import { useEffect, useState } from 'react'

interface Model {
  id: string
  name: string
  modelId: string
  providerId: string
  isActive: boolean
  isDefault: boolean
  provider: { name: string }
}

interface Provider {
  id: string
  name: string
}

export default function AdminModelsPage() {
  const [models, setModels] = useState<Model[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editModel, setEditModel] = useState<Model | null>(null)
  const [form, setForm] = useState({ name: '', modelId: '', providerId: '', isDefault: false })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([fetchModels(), fetchProviders()]).finally(() => setLoading(false))
  }, [])

  const fetchModels = async () => {
    const res = await fetch('/api/admin/models')
    const data = await res.json()
    setModels(data)
  }

  const fetchProviders = async () => {
    const res = await fetch('/api/admin/providers')
    const data = await res.json()
    setProviders(data)
  }

  const openCreate = () => {
    setEditModel(null)
    setForm({ name: '', modelId: '', providerId: providers[0]?.id || '', isDefault: false })
    setShowModal(true)
  }

  const openEdit = (model: Model) => {
    setEditModel(model)
    setForm({ name: model.name, modelId: model.modelId, providerId: model.providerId, isDefault: model.isDefault })
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editModel) {
        await fetch('/api/admin/models', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editModel.id, ...form }),
        })
      } else {
        await fetch('/api/admin/models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      }
      setShowModal(false)
      fetchModels()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (model: Model) => {
    await fetch('/api/admin/models', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: model.id, isActive: !model.isActive }),
    })
    fetchModels()
  }

  const setDefault = async (model: Model) => {
    await fetch('/api/admin/models', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: model.id, isDefault: true }),
    })
    fetchModels()
  }

  const deleteModel = async (id: string) => {
    if (!confirm('Xóa model này?')) return
    await fetch(`/api/admin/models?id=${id}`, { method: 'DELETE' })
    fetchModels()
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
          <h1 className="text-2xl font-bold text-white">AI Models</h1>
          <p className="text-gray-400 text-sm mt-1">Quản lý các model AI (GPT-4o, Claude, Gemini, ...)</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Thêm Model
        </button>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-4">Model</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-4">Model ID</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-4">Provider</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-4">Trạng thái</th>
              <th className="text-right text-xs font-medium text-gray-400 uppercase px-6 py-4">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {models.map((model) => (
              <tr key={model.id} className="hover:bg-gray-750">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{model.name}</span>
                    {model.isDefault && (
                      <span className="px-1.5 py-0.5 bg-blue-600/20 text-blue-400 text-xs rounded">Mặc định</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-400 font-mono">{model.modelId}</td>
                <td className="px-6 py-4 text-sm text-gray-400">{model.provider.name}</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => toggleActive(model)}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      model.isActive ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                    }`}
                  >
                    {model.isActive ? 'Bật' : 'Tắt'}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {!model.isDefault && (
                      <button
                        onClick={() => setDefault(model)}
                        className="px-2 py-1 text-xs text-blue-400 hover:bg-gray-700 rounded transition"
                        title="Đặt làm mặc định"
                      >
                        ★ Mặc định
                      </button>
                    )}
                    <button onClick={() => openEdit(model)} className="p-1.5 hover:bg-gray-700 rounded-lg transition">
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                      </svg>
                    </button>
                    <button onClick={() => deleteModel(model.id)} className="p-1.5 hover:bg-gray-700 rounded-lg transition">
                      <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-white mb-6">
              {editModel ? 'Chỉnh sửa Model' : 'Thêm Model mới'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Tên hiển thị</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="GPT-4o"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Model ID</label>
                <input
                  type="text"
                  value={form.modelId}
                  onChange={(e) => setForm({ ...form, modelId: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  placeholder="gpt-4o"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Provider</label>
                <select
                  value={form.providerId}
                  onChange={(e) => setForm({ ...form, providerId: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-300">Đặt làm model mặc định</span>
              </label>
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

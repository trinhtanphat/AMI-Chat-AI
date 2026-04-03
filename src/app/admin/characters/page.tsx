'use client'

import { useEffect, useState } from 'react'

interface Character {
  id: string
  name: string
  modelUrl: string
  thumbnail: string | null
  category: string
  isActive: boolean
  isDefault: boolean
  sortOrder: number
}

const CATEGORIES = [
  { value: 'default', label: 'Mặc định' },
  { value: 'anime', label: 'Anime' },
  { value: 'chibi', label: 'Chibi' },
  { value: 'mascot', label: 'Mascot' },
]

export default function AdminCharactersPage() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editChar, setEditChar] = useState<Character | null>(null)
  const [form, setForm] = useState({
    name: '', modelUrl: '', thumbnail: '', category: 'default', isDefault: false, sortOrder: 0,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchCharacters().finally(() => setLoading(false))
  }, [])

  const fetchCharacters = async () => {
    const res = await fetch('/api/admin/characters')
    const data = await res.json()
    setCharacters(data)
  }

  const openCreate = () => {
    setEditChar(null)
    setForm({ name: '', modelUrl: '', thumbnail: '', category: 'default', isDefault: false, sortOrder: 0 })
    setShowModal(true)
  }

  const openEdit = (char: Character) => {
    setEditChar(char)
    setForm({
      name: char.name,
      modelUrl: char.modelUrl,
      thumbnail: char.thumbnail || '',
      category: char.category,
      isDefault: char.isDefault,
      sortOrder: char.sortOrder,
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editChar) {
        await fetch('/api/admin/characters', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editChar.id, ...form }),
        })
      } else {
        await fetch('/api/admin/characters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      }
      setShowModal(false)
      fetchCharacters()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (char: Character) => {
    await fetch('/api/admin/characters', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: char.id, isActive: !char.isActive }),
    })
    fetchCharacters()
  }

  const setDefault = async (char: Character) => {
    await fetch('/api/admin/characters', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: char.id, isDefault: true }),
    })
    fetchCharacters()
  }

  const deleteCharacter = async (id: string) => {
    if (!confirm('Xóa nhân vật này?')) return
    await fetch(`/api/admin/characters?id=${id}`, { method: 'DELETE' })
    fetchCharacters()
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
          <h1 className="text-2xl font-bold text-white">Live2D Characters</h1>
          <p className="text-gray-400 text-sm mt-1">Quản lý nhân vật Live2D hiển thị trong chat</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Thêm nhân vật
        </button>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-4">Nhân vật</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-4">Danh mục</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-4">Thứ tự</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-4">Trạng thái</th>
              <th className="text-right text-xs font-medium text-gray-400 uppercase px-6 py-4">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {characters.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  Chưa có nhân vật nào. Nhấn "Thêm nhân vật" để bắt đầu.
                </td>
              </tr>
            ) : characters.map((char) => (
              <tr key={char.id} className="hover:bg-gray-750">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {char.thumbnail ? (
                        <img src={char.thumbnail} alt={char.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg">🎭</span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{char.name}</span>
                        {char.isDefault && (
                          <span className="px-1.5 py-0.5 bg-blue-600/20 text-blue-400 text-xs rounded">Mặc định</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 truncate max-w-[300px]">{char.modelUrl}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-400 capitalize">
                    {CATEGORIES.find(c => c.value === char.category)?.label || char.category}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-400">{char.sortOrder}</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => toggleActive(char)}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      char.isActive ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                    }`}
                  >
                    {char.isActive ? 'Bật' : 'Tắt'}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {!char.isDefault && (
                      <button
                        onClick={() => setDefault(char)}
                        className="px-2 py-1 text-xs text-blue-400 hover:bg-gray-700 rounded transition"
                        title="Đặt làm mặc định"
                      >
                        ★ Mặc định
                      </button>
                    )}
                    <button onClick={() => openEdit(char)} className="p-1.5 hover:bg-gray-700 rounded-lg transition">
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                      </svg>
                    </button>
                    <button onClick={() => deleteCharacter(char.id)} className="p-1.5 hover:bg-gray-700 rounded-lg transition">
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
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg p-6">
            <h2 className="text-lg font-bold text-white mb-6">
              {editChar ? 'Chỉnh sửa nhân vật' : 'Thêm nhân vật mới'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Tên nhân vật</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Haru"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Model URL (model.json / model3.json)</label>
                <input
                  type="text"
                  value={form.modelUrl}
                  onChange={(e) => setForm({ ...form, modelUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm"
                  placeholder="https://cdn.jsdelivr.net/.../model3.json"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Thumbnail URL (tùy chọn)</label>
                <input
                  type="text"
                  value={form.thumbnail}
                  onChange={(e) => setForm({ ...form, thumbnail: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  placeholder="https://..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Danh mục</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Thứ tự sắp xếp</label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-300">Đặt làm nhân vật mặc định</span>
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
                disabled={saving || !form.name || !form.modelUrl}
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

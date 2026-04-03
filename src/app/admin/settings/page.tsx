'use client'

import { useEffect, useState } from 'react'

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [providers, setProviders] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((res) => res.json())
      .then(setSettings)
      .catch(console.error)
      .finally(() => setLoading(false))
    fetch('/api/admin/providers')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setProviders(data.map((p: any) => ({ id: p.id, name: p.name })))
      })
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
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
    <div className="p-8 max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Cài đặt hệ thống</h1>
        {saved && (
          <span className="text-green-400 text-sm flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            Đã lưu!
          </span>
        )}
      </div>

      <div className="space-y-6">
        {/* General */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Chung</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Tên website</label>
              <input
                type="text"
                value={settings.site_name || ''}
                onChange={(e) => updateSetting('site_name', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Mô tả website</label>
              <input
                type="text"
                value={settings.site_description || ''}
                onChange={(e) => updateSetting('site_description', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Chat Settings */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Cài đặt Chat</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">System Prompt mặc định</label>
              <textarea
                rows={4}
                value={settings.default_system_prompt || ''}
                onChange={(e) => updateSetting('default_system_prompt', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Số tin nhắn tối đa mỗi cuộc trò chuyện</label>
              <input
                type="number"
                value={settings.max_messages_per_conversation || '100'}
                onChange={(e) => updateSetting('max_messages_per_conversation', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* TTS (Text-to-Speech) */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-1">Giọng nói AI (TTS)</h2>
          <p className="text-xs text-gray-400 mb-4">Cài đặt Text-to-Speech cho nhân vật AI. Hỗ trợ OpenAI-compatible TTS API.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Provider cho TTS</label>
              <select
                value={settings.tts_provider_id || ''}
                onChange={(e) => updateSetting('tts_provider_id', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">Tự động (dùng provider đang bật)</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">TTS Model</label>
                <input
                  type="text"
                  value={settings.tts_model || ''}
                  onChange={(e) => updateSetting('tts_model', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="tts-1"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Giọng (Voice)</label>
                <select
                  value={settings.tts_voice || 'nova'}
                  onChange={(e) => updateSetting('tts_voice', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="alloy">Alloy (trung tính)</option>
                  <option value="echo">Echo (nam trầm)</option>
                  <option value="fable">Fable (nam Anh)</option>
                  <option value="onyx">Onyx (nam trầm)</option>
                  <option value="nova">Nova (nữ trẻ) ★</option>
                  <option value="shimmer">Shimmer (nữ ấm)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Nova = giọng nữ wibu-friendly nhất 🎀</p>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Tốc độ nói ({settings.tts_speed || '1.0'}x)</label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={settings.tts_speed || '1.0'}
                onChange={(e) => updateSetting('tts_speed', e.target.value)}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0.5x (chậm)</span>
                <span>1.0x</span>
                <span>2.0x (nhanh)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Registration */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Đăng ký</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => updateSetting('allow_registration', settings.allow_registration === 'true' ? 'false' : 'true')}
              className={`relative w-11 h-6 rounded-full transition cursor-pointer ${
                settings.allow_registration === 'true' ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  settings.allow_registration === 'true' ? 'translate-x-5' : ''
                }`}
              />
            </div>
            <span className="text-sm text-gray-300">Cho phép người dùng tự đăng ký</span>
          </label>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium rounded-lg transition"
        >
          {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
        </button>
      </div>
    </div>
  )
}

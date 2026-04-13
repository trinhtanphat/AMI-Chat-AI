'use client'

import { useState, useEffect } from 'react'
import { useChatStore } from '@/store/chat'
import { t, setLocale as setI18nLocale, type Locale } from '@/lib/i18n'

interface SettingsPanelProps {
  open: boolean
  onClose: () => void
  bgIndex: number
  onBgChange: (index: number) => void
  backgrounds: { id: string; src: string; label: string }[]
  followCursor: boolean
  onFollowCursorChange: (v: boolean) => void
  scrollZoom: boolean
  onScrollZoomChange: (v: boolean) => void
}

type Tab = 'general' | 'profile' | 'memory' | 'ami' | 'feedback' | 'about'

export default function SettingsPanel({
  open, onClose, bgIndex, onBgChange, backgrounds,
  followCursor, onFollowCursorChange, scrollZoom, onScrollZoomChange,
}: SettingsPanelProps) {
  const [tab, setTab] = useState<Tab>('general')
  const [customBgUrl, setCustomBgUrl] = useState('')
  const [feedbackName, setFeedbackName] = useState('')
  const [feedbackEmail, setFeedbackEmail] = useState('')
  const [feedbackMsg, setFeedbackMsg] = useState('')
  const [feedbackSent, setFeedbackSent] = useState(false)

  // Profile state
  const [profileName, setProfileName] = useState('')
  const [profileBio, setProfileBio] = useState('')
  const [customPrompt, setCustomPrompt] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')

  // Memory state
  const { memories, setMemories, locale, setLocale } = useChatStore()
  const [newMemory, setNewMemory] = useState('')
  const [memoryLoading, setMemoryLoading] = useState(false)

  // Load profile data
  useEffect(() => {
    if (open && (tab === 'profile' || tab === 'general')) {
      fetch('/api/profile').then(r => r.ok ? r.json() : null).then(data => {
        if (data) {
          setProfileName(data.name || '')
          setProfileBio(data.bio || '')
          setCustomPrompt(data.customPrompt || '')
        }
      }).catch(() => {})
    }
  }, [open, tab])

  // Load memories
  useEffect(() => {
    if (open && tab === 'memory') {
      setMemoryLoading(true)
      fetch('/api/memories').then(r => r.ok ? r.json() : []).then(data => {
        if (Array.isArray(data)) setMemories(data)
      }).catch(() => {}).finally(() => setMemoryLoading(false))
    }
  }, [open, tab, setMemories])

  if (!open) return null

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'general', label: t('settings.general', locale), icon: '⚙️' },
    { id: 'profile', label: t('settings.profile', locale), icon: '👤' },
    { id: 'memory', label: t('settings.memory', locale), icon: '🧠' },
    { id: 'ami', label: 'Ami', icon: '🎭' },
    { id: 'feedback', label: t('settings.feedback', locale), icon: '💬' },
    { id: 'about', label: t('settings.about', locale), icon: 'ℹ️' },
  ]

  const handleProfileSave = async () => {
    setProfileSaving(true)
    setProfileMsg('')
    try {
      const body: any = { name: profileName, bio: profileBio, customPrompt }
      if (newPassword) {
        body.currentPassword = currentPassword
        body.newPassword = newPassword
      }
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok) {
        setProfileMsg('✅ ' + t('common.success', locale))
        setCurrentPassword('')
        setNewPassword('')
      } else {
        setProfileMsg('❌ ' + (data.error || t('common.error', locale)))
      }
    } catch {
      setProfileMsg('❌ ' + t('common.error', locale))
    } finally {
      setProfileSaving(false)
      setTimeout(() => setProfileMsg(''), 3000)
    }
  }

  const handleAddMemory = async () => {
    if (!newMemory.trim()) return
    try {
      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMemory, type: 'fact' }),
      })
      if (res.ok) {
        const memory = await res.json()
        setMemories([memory, ...memories])
        setNewMemory('')
      }
    } catch {}
  }

  const handleDeleteMemory = async (id: string) => {
    try {
      const res = await fetch('/api/memories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        setMemories(memories.filter(m => m.id !== id))
      }
    } catch {}
  }

  const handleLanguageChange = (newLocale: Locale) => {
    setLocale(newLocale)
    setI18nLocale(newLocale)
  }

  const handleFeedbackSubmit = async () => {
    if (!feedbackMsg.trim()) return
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: feedbackName, email: feedbackEmail, message: feedbackMsg }),
      })
      setFeedbackSent(true)
      setFeedbackMsg('')
      setTimeout(() => setFeedbackSent(false), 3000)
    } catch {}
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.85)', fontSize: 13, outline: 'none',
    transition: 'border-color 0.15s',
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 51, width: 480, maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 64px)',
        borderRadius: 16, overflow: 'hidden',
        background: 'rgba(20,20,30,0.92)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{t('settings.title', locale)}</span>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: '50%', border: 'none',
            background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
          >✕</button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 2, padding: '8px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none',
              background: tab === t.id ? 'rgba(99,102,241,0.2)' : 'transparent',
              color: tab === t.id ? '#a5b4fc' : 'rgba(255,255,255,0.45)',
              cursor: 'pointer', fontSize: 12, fontWeight: 600,
              transition: 'all 0.15s', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 4,
            }}
              onMouseEnter={e => { if (tab !== t.id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
              onMouseLeave={e => { if (tab !== t.id) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize: 16 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '16px 20px', overflowY: 'auto', minHeight: 260 }}>

          {/* Tab: Chung */}
          {tab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 10 }}>🖼️ Hình nền</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {backgrounds.map((bg, i) => (
                    <button key={bg.id} onClick={() => onBgChange(i)} style={{
                      borderRadius: 8, overflow: 'hidden', border: i === bgIndex ? '2px solid #818cf8' : '2px solid transparent',
                      cursor: 'pointer', background: 'none', padding: 0, transition: 'border-color 0.15s',
                    }}>
                      <img src={bg.src} alt={bg.label} style={{ width: '100%', height: 56, objectFit: 'cover', display: 'block', borderRadius: 6 }} />
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', padding: '4px 0', textAlign: 'center' }}>{bg.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>URL hình nền tùy chỉnh</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={customBgUrl}
                    onChange={e => setCustomBgUrl(e.target.value)}
                    placeholder="https://example.com/bg.jpg"
                    style={{ ...inputStyle, flex: 1 }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 10 }}>🌐 {t('settings.language', locale)}</div>
                <select
                  value={locale}
                  onChange={e => handleLanguageChange(e.target.value as Locale)}
                  style={{
                  ...inputStyle, cursor: 'pointer',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
                }}>
                  <option value="vi">🇻🇳 Tiếng Việt</option>
                  <option value="en">🇺🇸 English</option>
                </select>
              </div>
            </div>
          )}

          {/* Tab: Profile */}
          {tab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {profileMsg && (
                <div style={{
                  padding: '8px 12px', borderRadius: 8, fontSize: 13,
                  background: profileMsg.startsWith('✅') ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                  border: `1px solid ${profileMsg.startsWith('✅') ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                  color: profileMsg.startsWith('✅') ? '#86efac' : '#fca5a5',
                }}>
                  {profileMsg}
                </div>
              )}
              <div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{t('profile.name', locale)}</div>
                <input value={profileName} onChange={e => setProfileName(e.target.value)} style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{t('profile.bio', locale)}</div>
                <textarea value={profileBio} onChange={e => setProfileBio(e.target.value)} rows={2}
                  style={{ ...inputStyle, resize: 'vertical' }} placeholder="..."
                  onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{t('profile.customPrompt', locale)}</div>
                <textarea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  placeholder={locale === 'vi' ? 'VD: Hãy trả lời ngắn gọn và thân thiện...' : 'E.g.: Please respond briefly and friendly...'}
                  onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 10 }}>🔒 {t('profile.changePassword', locale)}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                    placeholder={t('profile.currentPassword', locale)} style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    placeholder={t('profile.newPassword', locale)} style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
                </div>
              </div>
              <button onClick={handleProfileSave} disabled={profileSaving} style={{
                padding: '10px 16px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff', cursor: profileSaving ? 'wait' : 'pointer',
                fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                opacity: profileSaving ? 0.6 : 1,
              }}>
                {profileSaving ? t('common.loading', locale) : t('profile.save', locale)}
              </button>
            </div>
          )}

          {/* Tab: Memory */}
          {tab === 'memory' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                🧠 {t('memory.description', locale)}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={newMemory} onChange={e => setNewMemory(e.target.value)}
                  placeholder={locale === 'vi' ? 'VD: Tôi thích trà sữa...' : 'E.g.: I like bubble tea...'}
                  style={{ ...inputStyle, flex: 1 }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddMemory() }}
                />
                <button onClick={handleAddMemory} disabled={!newMemory.trim()} style={{
                  padding: '8px 14px', borderRadius: 8, border: 'none',
                  background: newMemory.trim() ? '#6366f1' : 'rgba(255,255,255,0.06)',
                  color: newMemory.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
                  cursor: newMemory.trim() ? 'pointer' : 'not-allowed',
                  fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                }}>
                  + {t('memory.add', locale)}
                </button>
              </div>
              {memoryLoading ? (
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: 16 }}>
                  {t('common.loading', locale)}
                </div>
              ) : memories.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13, padding: 16 }}>
                  {t('memory.empty', locale)}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {memories.map(mem => (
                    <div key={mem.id} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 12px', borderRadius: 8,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                    }}>
                      <span style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{mem.content}</span>
                      <button onClick={() => handleDeleteMemory(mem.id)} style={{
                        padding: '2px 6px', borderRadius: 4, border: 'none',
                        background: 'rgba(239,68,68,0.15)', color: '#fca5a5',
                        cursor: 'pointer', fontSize: 10, flexShrink: 0,
                      }}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Ami */}
          {tab === 'ami' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <ToggleRow
                label="Nhìn theo con trỏ"
                desc="Nhân vật sẽ nhìn theo chuột của bạn"
                checked={followCursor}
                onChange={onFollowCursorChange}
              />
              <ToggleRow
                label="Cuộn chuột để thu/phóng"
                desc="Dùng scroll chuột để zoom nhân vật"
                checked={scrollZoom}
                onChange={onScrollZoomChange}
              />
              <div style={{
                padding: 12, borderRadius: 10,
                background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)',
              }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                  💡 <strong>Mẹo:</strong> Click vào đầu nhân vật để đổi biểu cảm, click vào người để kích hoạt hành động đặc biệt.
                </div>
              </div>
            </div>
          )}

          {/* Tab: Góp ý */}
          {tab === 'feedback' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {feedbackSent && (
                <div style={{
                  padding: '8px 12px', borderRadius: 8,
                  background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.2)',
                  color: '#86efac', fontSize: 13,
                }}>
                  ✅ Cảm ơn bạn đã góp ý!
                </div>
              )}
              <div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Tên (không bắt buộc)</div>
                <input value={feedbackName} onChange={e => setFeedbackName(e.target.value)} placeholder="Tên của bạn" style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Email (không bắt buộc)</div>
                <input value={feedbackEmail} onChange={e => setFeedbackEmail(e.target.value)} placeholder="email@example.com" type="email" style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Nội dung góp ý *</div>
                <textarea value={feedbackMsg} onChange={e => setFeedbackMsg(e.target.value)} placeholder="Chia sẻ ý kiến của bạn..."
                  rows={4} style={{ ...inputStyle, resize: 'vertical' }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
              </div>
              <button onClick={handleFeedbackSubmit} disabled={!feedbackMsg.trim()} style={{
                padding: '10px 16px', borderRadius: 10, border: 'none',
                background: feedbackMsg.trim() ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.06)',
                color: feedbackMsg.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
                cursor: feedbackMsg.trim() ? 'pointer' : 'not-allowed',
                fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
              }}>
                Gửi góp ý
              </button>
            </div>
          )}

          {/* Tab: Thông tin */}
          {tab === 'about' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 8 }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 36, boxShadow: '0 8px 32px rgba(102,126,234,0.3)',
              }}>
                🤖
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>AMI Chat AI</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Phiên bản 1.0.0</div>
              </div>
              <div style={{
                width: '100%', padding: 14, borderRadius: 10,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                <InfoRow label="Nền tảng" value="Next.js + Live2D" />
                <InfoRow label="Live2D Models" value="28 nhân vật" />
                <InfoRow label="Artist" value="Wang Anwir" />
                <InfoRow label="Rigger" value="Mirai_HM" />
                <InfoRow label="Developer" value="VNSO Team" />
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center', lineHeight: 1.6 }}>
                © 2025 VNSO. Mọi quyền được bảo lưu.<br />
                Live2D models © Live2D Inc. & respective authors.
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{desc}</div>
      </div>
      <button onClick={() => onChange(!checked)} style={{
        width: 42, height: 24, borderRadius: 12, border: 'none',
        background: checked ? '#6366f1' : 'rgba(255,255,255,0.12)',
        cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
        flexShrink: 0,
      }}>
        <div style={{
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          position: 'absolute', top: 3,
          left: checked ? 21 : 3,
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
      </button>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
      <span style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</span>
      <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{value}</span>
    </div>
  )
}

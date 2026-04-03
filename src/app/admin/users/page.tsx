'use client'

import { useEffect, useState } from 'react'

interface User {
  id: string
  email: string
  name: string
  role: string
  isActive: boolean
  createdAt: string
  _count: { conversations: number; messages: number }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      setUsers(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditUser(null)
    setForm({ name: '', email: '', password: '', role: 'user' })
    setShowModal(true)
  }

  const openEdit = (user: User) => {
    setEditUser(user)
    setForm({ name: user.name, email: user.email, password: '', role: user.role })
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editUser) {
        await fetch('/api/admin/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editUser.id,
            name: form.name,
            role: form.role,
            ...(form.password ? { password: form.password } : {}),
          }),
        })
      } else {
        await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      }
      setShowModal(false)
      fetchUsers()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (user: User) => {
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: user.id, isActive: !user.isActive }),
    })
    fetchUsers()
  }

  const deleteUser = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa người dùng này?')) return
    await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' })
    fetchUsers()
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
        <h1 className="text-2xl font-bold text-white">Quản lý người dùng</h1>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Thêm người dùng
        </button>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-4">Người dùng</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-4">Vai trò</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-4">Trạng thái</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-4">Thống kê</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-4">Ngày tạo</th>
              <th className="text-right text-xs font-medium text-gray-400 uppercase px-6 py-4">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-750">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{user.name}</div>
                      <div className="text-xs text-gray-400">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                    user.role === 'admin' ? 'bg-purple-600/20 text-purple-400' : 'bg-gray-600/20 text-gray-400'
                  }`}>
                    {user.role === 'admin' ? 'Admin' : 'User'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => toggleActive(user)}
                    className={`inline-flex px-2 py-1 rounded text-xs font-medium cursor-pointer ${
                      user.isActive ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                    }`}
                  >
                    {user.isActive ? 'Hoạt động' : 'Vô hiệu'}
                  </button>
                </td>
                <td className="px-6 py-4 text-sm text-gray-400">
                  {user._count.conversations} chats · {user._count.messages} msgs
                </td>
                <td className="px-6 py-4 text-sm text-gray-400">
                  {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(user)} className="p-1.5 hover:bg-gray-700 rounded-lg transition" title="Sửa">
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                      </svg>
                    </button>
                    <button onClick={() => deleteUser(user.id)} className="p-1.5 hover:bg-gray-700 rounded-lg transition" title="Xóa">
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
              {editUser ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Họ tên</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              {!editUser && (
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  {editUser ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu'}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Vai trò</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
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

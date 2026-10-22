'use client'
import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { UserRoleSelect } from '@/components/admin/UserRoleSelect'
import { useSession } from 'next-auth/react'

interface AdminUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  createdAt: string
}

export default function AdminUsersPage() {
  const { data: session } = useSession()
  const [users,     setUsers]     = useState<AdminUser[]>([])
  const [loading,   setLoading]   = useState(true)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deleting,  setDeleting]  = useState(false)

  async function fetchUsers() {
    setLoading(true)
    try {
      const res = await api.get('/admin/users')
      setUsers(res.data ?? [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  async function handleDelete() {
    if (!confirmId) return
    setDeleting(true)
    try {
      await api.delete(`/admin/users/${confirmId}`)
      setUsers(u => u.filter(x => x.id !== confirmId))
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Failed to delete user.')
    } finally {
      setDeleting(false)
      setConfirmId(null)
    }
  }

  const confirmUser = users.find(u => u.id === confirmId)

  return (
    <section>
      <h1 className="font-serif text-4xl tracking-luxury mb-10">Users</h1>

      {loading ? (
        <p className="text-luxury-muted text-sm">Loading…</p>
      ) : users.length === 0 ? (
        <p className="text-luxury-muted border border-luxury-gray p-8 text-center">No users found.</p>
      ) : (
        <div className="overflow-x-auto border border-luxury-gray">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-luxury-muted uppercase text-xs tracking-luxury border-b border-luxury-gray bg-luxury-white/[0.02]">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Joined</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-luxury-gray/50 last:border-0 hover:bg-luxury-white/[0.02] transition-colors">
                  <td className="py-3 px-4 text-luxury-white">{u.firstName} {u.lastName}</td>
                  <td className="py-3 px-4 text-luxury-muted">{u.email}</td>
                  <td className="py-3 px-4 text-luxury-muted">{formatDate(u.createdAt)}</td>
                  <td className="py-3 px-4">
                    <UserRoleSelect userId={u.id} role={u.role} />
                  </td>
                  <td className="py-3 px-4">
                    {(session?.user as any)?.email !== u.email && (
                      <button
                        onClick={() => setConfirmId(u.id)}
                        className="text-red-400/50 hover:text-red-400 transition-colors"
                        title="Delete user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Confirmation modal ── */}
      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setConfirmId(null)} />
          <div className="relative bg-luxury-black border border-luxury-gray rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <h3 className="font-serif text-xl text-luxury-white mb-3">Delete User</h3>
            <p className="text-luxury-muted text-sm leading-relaxed mb-6">
              Are you sure you want to delete{' '}
              <span className="text-luxury-white font-medium">
                {confirmUser?.firstName} {confirmUser?.lastName}
              </span>
              {' '}({confirmUser?.email})?{' '}
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-5 py-2 bg-red-500/20 border border-red-500/40 text-red-400 text-xs tracking-luxury uppercase rounded-full hover:bg-red-500/30 transition-all disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
              <button
                onClick={() => setConfirmId(null)}
                disabled={deleting}
                className="px-5 py-2 border border-luxury-gray text-luxury-muted text-xs tracking-luxury uppercase rounded-full hover:border-luxury-gold hover:text-luxury-gold transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

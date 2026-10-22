import { auth } from '@/lib/auth'
import Link from 'next/link'
import { api } from '@/lib/api'
import { formatPrice, formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { FileText, Download } from 'lucide-react'

interface AdminOrder {
  id: string
  orderNumber: string
  status: string
  total: string
  createdAt: string
  user: { firstName: string; lastName: string; email: string }
}

export default async function AdminOrdersPage() {
  const session = await auth()
  let orders: AdminOrder[] = []
  try {
    const res = await api.get('/admin/orders', {
      headers: { Authorization: `Bearer ${(session as any)?.accessToken}` }
    })
    orders = res.data ?? []
  } catch {}

  return (
    <section className="space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-4xl tracking-luxury">Orders</h1>
        <Link
          href="/admin/invoices"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-luxury text-luxury-gold hover:text-luxury-white border border-luxury-gold/40 hover:border-luxury-white px-4 py-2 rounded-full transition-colors"
        >
          <FileText className="w-3.5 h-3.5" />
          View All Invoices
        </Link>
      </div>

      {/* ── Real orders list ── */}
      {orders.length === 0 ? (
        <p className="text-luxury-muted border border-luxury-gray p-8 text-center">No confirmed orders yet.</p>
      ) : (
        <div className="overflow-x-auto border border-luxury-gray">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-luxury-muted uppercase text-xs tracking-luxury border-b border-luxury-gray bg-luxury-white/[0.02]">
                <th className="py-3 px-4">Order</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-center">Invoice</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} className="border-b border-luxury-gray/50 last:border-0 hover:bg-luxury-white/[0.02] transition-colors">
                  <td className="py-3 px-4">
                    <Link href={`/admin/orders/${o.id}`} className="text-luxury-gold hover:underline">{o.orderNumber}</Link>
                  </td>
                  <td className="py-3 px-4 text-luxury-white">{o.user.firstName} {o.user.lastName}</td>
                  <td className="py-3 px-4 text-luxury-muted">{formatDate(o.createdAt)}</td>
                  <td className="py-3 px-4"><StatusBadge status={o.status} /></td>
                  <td className="py-3 px-4 text-right text-luxury-gold">{formatPrice(o.total)}</td>
                  <td className="py-3 px-4 text-center">
                    <a
                      href={`/api/proxy/orders/${o.id}/invoice`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-luxury-gold text-xs tracking-luxury uppercase hover:text-luxury-white transition-colors border border-luxury-gold/40 px-3 py-1 rounded-full hover:border-luxury-white"
                    >
                      <Download className="w-3 h-3" />
                      PDF
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

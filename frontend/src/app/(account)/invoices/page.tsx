'use client'
import { useEffect, useState } from 'react'
import { useSession }           from 'next-auth/react'
import Link                      from 'next/link'
import { api }                   from '@/lib/api'
import { FileText, Download, ShieldCheck, ExternalLink, Users, User } from 'lucide-react'

interface Invoice {
  id:          string
  orderId?:    string
  orderNumber: string
  pdfUrl:      string
  createdAt:   string
  user?: {
    firstName?: string
    lastName?:  string
    email?:     string
  }
}

export default function InvoicesPage() {
  const { data: session } = useSession()
  const isAdmin = (session?.user as any)?.role === 'ADMIN'

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState<'all' | 'mine'>('all')

  useEffect(() => {
    setLoading(true)
    const endpoint = (isAdmin && tab === 'all')
      ? '/orders/invoices/all?all=true'
      : '/orders/invoices/all'

    api.get(endpoint)
      .then(r => setInvoices(Array.isArray(r.data) ? r.data : (r.data?.data ?? [])))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isAdmin, tab])

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <h1 className="font-serif text-3xl tracking-luxury">Invoices</h1>
        {isAdmin && (
          <Link
            href="/admin/invoices"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-luxury text-luxury-gold hover:text-luxury-white border border-luxury-gold/40 hover:border-luxury-white px-4 py-2 rounded-full transition-colors w-fit"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-luxury-gold" />
            Open Admin Portal Invoices
            <ExternalLink className="w-3 h-3 ml-0.5" />
          </Link>
        )}
      </div>

      <p className="text-luxury-muted text-sm tracking-luxury mb-6">
        Invoices are generated when order payment is confirmed.
      </p>

      {/* Admin Scope Switcher */}
      {isAdmin && (
        <div className="flex items-center gap-2 border-b border-luxury-gray/60 pb-4 mb-8">
          <button
            onClick={() => setTab('all')}
            className={`flex items-center gap-2 px-4 py-2 text-xs tracking-luxury uppercase rounded-full transition-colors ${
              tab === 'all'
                ? 'bg-luxury-gold text-luxury-black font-semibold'
                : 'bg-luxury-gray/40 text-luxury-muted hover:text-luxury-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            All Customer Invoices (Admin)
          </button>
          <button
            onClick={() => setTab('mine')}
            className={`flex items-center gap-2 px-4 py-2 text-xs tracking-luxury uppercase rounded-full transition-colors ${
              tab === 'mine'
                ? 'bg-luxury-gold text-luxury-black font-semibold'
                : 'bg-luxury-gray/40 text-luxury-muted hover:text-luxury-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            My Personal Invoices
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-luxury-muted text-sm">Loading invoices…</p>
      ) : invoices.length === 0 ? (
        <div className="border border-luxury-gray p-8 text-center">
          <FileText className="w-10 h-10 text-luxury-muted/40 mx-auto mb-4" />
          <p className="text-luxury-muted text-sm">No invoices found.</p>
          <p className="text-luxury-muted text-xs mt-1">Invoices appear here once orders are confirmed.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map(inv => {
            const customerName = inv.user
              ? `${inv.user.firstName ?? ''} ${inv.user.lastName ?? ''}`.trim()
              : ''
            const invoiceUrl = inv.pdfUrl || `/api/proxy/orders/${inv.orderId || inv.id}/invoice`

            return (
              <div key={inv.id} className="border border-luxury-gray p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-luxury-gold/40 transition-colors">
                <div className="flex items-center gap-4">
                  <FileText className="w-5 h-5 text-luxury-gold shrink-0" />
                  <div>
                    <div className="flex items-center gap-2.5">
                      <p className="text-luxury-white text-sm font-medium tracking-wide">{inv.orderNumber}</p>
                      {isAdmin && inv.user?.email && (
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-luxury-gray text-luxury-muted">
                          {customerName || inv.user.email}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-luxury-muted text-xs mt-1">
                      <span>{new Date(inv.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      {isAdmin && inv.user?.email && (
                        <span>• {inv.user.email}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isAdmin && inv.orderId && (
                    <Link
                      href={`/admin/orders/${inv.orderId}`}
                      className="text-xs uppercase tracking-luxury text-luxury-muted hover:text-luxury-gold transition-colors"
                    >
                      View Order
                    </Link>
                  )}
                  <a
                    href={invoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={`invoice-${inv.orderNumber}.pdf`}
                    className="flex items-center gap-2 text-luxury-gold text-xs tracking-luxury uppercase hover:text-luxury-white transition-colors border border-luxury-gold/40 px-4 py-2 rounded-full hover:border-luxury-white w-fit"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PDF
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

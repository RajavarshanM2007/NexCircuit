'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCart } from '@/hooks/useCart'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/Button'
import { AddressCard } from '@/components/account/AddressCard'
import { useCurrency } from '@/context/CurrencyContext'
import { useSiteConfig } from '@/context/SiteConfigContext'
import { api } from '@/lib/api'
import type { Address } from '@/types/user'

export default function CheckoutPage() {
  const router               = useRouter()
  const { data: session }    = useSession()
  const { items, total, clearCart } = useCart()
  const { format }           = useCurrency()
  const { shippingCost, taxRate, taxLabel } = useSiteConfig()

  const [addresses,          setAddresses]          = useState<Address[]>([])
  const [selectedAddressId,  setSelectedAddressId]  = useState<string | null>(null)
  const [loading,            setLoading]            = useState(false)
  const [error,              setError]              = useState<string | null>(null)
  const [loaded,             setLoaded]             = useState(false)

  const tax        = total * (taxRate / 100)
  const shipping   = items.length > 0 ? shippingCost : 0
  const grandTotal = total + tax + shipping

  useEffect(() => {
    if (items.length === 0) { router.replace('/cart'); return }
    api.get('/users/me').then(res => {
      const addrs: Address[] = res.data?.addresses ?? []
      setAddresses(addrs)
      const def = addrs.find(a => a.isDefault) ?? addrs[0]
      if (def) setSelectedAddressId(def.id)
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [items.length, router])

  async function handlePlaceOrder() {
    if (!selectedAddressId) { setError('Please select a shipping address.'); return }
    setLoading(true); setError(null)

    try {
      const res = await api.post('/orders', {
        addressId: selectedAddressId,
        items: items.map(i => ({
          productId: i.productId,
          variantId: i.variantId || undefined,
          quantity:  i.quantity,
        })),
        paymentMethod: 'PAY_ON_DELIVERY',
      })
      const order = res.data?.data ?? res.data
      clearCart()

      // Automatically trigger PDF invoice download
      try {
        const invoiceUrl = `/api/proxy/orders/${order.id}/invoice`
        const a = document.createElement('a')
        a.href = invoiceUrl
        a.target = '_blank'
        a.download = `invoice-${order.orderNumber || order.id}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      } catch {}

      router.push(`/orders/${order.id}?invoice=downloaded`)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Failed to place order. Please try again.')
      setLoading(false)
    }
  }

  if (!loaded) return null

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-16">
      <h1 className="font-serif text-2xl md:text-4xl tracking-luxury text-luxury-white mb-8 md:mb-12">Checkout</h1>

      <div className="space-y-12">
        {/* Address */}
        <section>
          <h2 className="text-luxury-white tracking-luxury text-sm uppercase mb-4">Shipping Address</h2>
          {addresses.length === 0 ? (
            <div className="border border-luxury-gray p-6 text-luxury-muted">
              <p className="mb-4">You don&apos;t have any saved addresses yet.</p>
              <Link href="/addresses"><Button variant="outline">Add Address</Button></Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {addresses.map(a => (
                <button key={a.id} onClick={() => setSelectedAddressId(a.id)} className="text-left">
                  <div className={`border p-1 transition-colors ${selectedAddressId === a.id ? 'border-luxury-gold' : 'border-transparent'}`}>
                    <AddressCard address={a} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Payment method */}
        <section>
          <h2 className="text-luxury-white tracking-luxury text-sm uppercase mb-4">Payment Method</h2>
          <div className="border border-luxury-gold/40 bg-luxury-gold/5 p-4 flex items-center gap-3">
            <div className="w-4 h-4 rounded-full border-2 border-luxury-gold bg-luxury-gold" />
            <span className="text-luxury-white text-sm tracking-wide">Pay on Delivery</span>
          </div>
          <p className="text-luxury-muted text-xs mt-2 tracking-luxury">
            Payment is collected upon delivery of your order.
          </p>
        </section>

        {/* Order summary */}
        <section className="space-y-2 border-t border-luxury-gray pt-6 max-w-xs ml-auto">
          <div className="flex justify-between text-sm">
            <span className="text-luxury-muted">Subtotal</span>
            <span className="text-luxury-white">{format(total)}</span>
          </div>
          {shipping > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-luxury-muted">Shipping</span>
              <span className="text-luxury-white">{format(shipping)}</span>
            </div>
          )}
          {taxRate > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-luxury-muted">{taxLabel} ({taxRate}%)</span>
              <span className="text-luxury-white">{format(tax)}</span>
            </div>
          )}
          <div className="flex justify-between font-serif text-lg border-t border-luxury-gray pt-3 mt-3">
            <span className="text-luxury-white">Total</span>
            <span className="text-luxury-gold">{format(grandTotal)}</span>
          </div>
        </section>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        {/* Place Order CTA */}
        <div className="space-y-3">
          <Button fullWidth onClick={handlePlaceOrder} loading={loading} disabled={addresses.length === 0}>
            Place Order (Pay on Delivery)
          </Button>
          <p className="text-luxury-muted text-xs text-center tracking-luxury">
            Your order will be placed and an invoice will be generated automatically.
          </p>
        </div>
      </div>
    </div>
  )
}

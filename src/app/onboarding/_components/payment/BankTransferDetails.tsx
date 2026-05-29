"use client"

import { Copy } from 'lucide-react'
import { toast } from 'sonner'

interface BankTransferDetailsProps {
  amount: number
  businessName: string
}

const GBP_DETAILS = [
  ['Company Name', 'ForeMint Solutions LLC'],
  ['Account No', '56338534'],
  ['Sort Code', '185008'],
  ['IBAN', 'GB57CITI18500856338534'],
  ['BIC', 'CITIGB2L'],
  ['Bank Name', 'Citibank'],
  ['Bank Address', 'Canada Square, Canary Wharf London, E14 5LB United Kingdom'],
]

const USD_DETAILS = [
  ['Company Name', 'ForeMint Solutions LLC'],
  ['Account No', '70583100002355954'],
  ['Account Type', 'CHECKING'],
  ['Routing (ABA)', '031100209'],
  ['SWIFT Code', 'CITIUS33'],
  ['Bank Name', 'Citibank'],
  ['Bank Address', '111 Wall Street New York, NY 10043 USA'],
]

const PK_DETAILS = [
  ['Account Title', 'Pakistani payment details placeholder'],
  ['Account No', 'To be added'],
  ['IBAN', 'To be added'],
  ['Bank Name', 'To be added'],
]

export function BankTransferDetails({ amount, businessName }: BankTransferDetailsProps) {
  const reference = `${normalizeBusinessName(businessName) || 'Business'} LLC Order`

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-[#e0d9f7] bg-white p-5 shadow-[0_8px_24px_rgba(52,8,143,0.04)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-base font-semibold text-gray-950">Payment Details</p>
            <p className="mt-1 text-sm text-gray-500">
              Transfer exactly ${amount.toLocaleString()} and use the reference below.
            </p>
          </div>
          <CopyValue label="Reference" value={reference} featured />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <BankDetailCard title="GBP Bank Details" rows={GBP_DETAILS} />
        <BankDetailCard title="USD Bank Details" rows={USD_DETAILS} />
        <div className="lg:col-span-2">
          <BankDetailCard title="Pakistani Payment Details" rows={PK_DETAILS} />
        </div>
      </div>
    </div>
  )
}

function BankDetailCard({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <section className="rounded-lg border border-[#e0d9f7] bg-white p-5 shadow-[0_8px_24px_rgba(52,8,143,0.04)]">
      <h3 className="text-sm font-bold uppercase tracking-wider text-[#34088f]">{title}</h3>
      <div className="mt-4 divide-y divide-gray-100">
        {rows.map(([label, value]) => (
          <CopyValue key={label} label={label} value={value} />
        ))}
      </div>
    </section>
  )
}

function CopyValue({ label, value, featured = false }: { label: string; value: string; featured?: boolean }) {
  const copy = async () => {
    await navigator.clipboard.writeText(value)
    toast.success('Copied to clipboard')
  }

  return (
    <div className={featured ? 'min-w-[240px]' : 'flex items-start justify-between gap-4 py-3'}>
      <div className={featured ? 'rounded-lg bg-[#f8f5ff] border border-[#e0d9f7] px-4 py-3' : 'min-w-0'}>
        <p className="text-xs font-semibold text-gray-400">{label}</p>
        <p className="mt-1 break-words text-sm font-semibold text-gray-950">{value}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        className={featured
          ? 'mt-2 inline-flex items-center gap-1.5 rounded-md border border-[#e0d9f7] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#34088f] hover:bg-[#f8f5ff]'
          : 'mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-500 hover:border-[#34088f]/40 hover:text-[#34088f]'}
      >
        <Copy size={12} />
        Copy
      </button>
    </div>
  )
}

function normalizeBusinessName(name: string) {
  return name.trim().replace(/\s+llc\.?$/i, '').trim()
}

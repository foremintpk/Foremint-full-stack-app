/**
 * @file src/app/admin/(dashboard)/invoice-generator/_components/InvoiceGeneratorForm.tsx
 * @description Client-facing invoice builder — the form that drives the PDF.
 *
 * Ported from the standalone invoice app. The form logic, layout and PDF
 * geometry are unchanged; only the import paths, the API endpoint and the outer
 * page shell were adjusted for the admin dashboard.
 *
 * 1. Server vs Client choice rationale: Client Component — the form is entirely
 *    interactive, and totals recompute as fields change.
 * 2. Caching layer: none; nothing is persisted.
 * 3. RBAC: the page above is administrator-gated, and the API route re-checks.
 * 4. Revalidation: N/A — generating a PDF changes no server state.
 */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import {
  ADDONS,
  DEFAULT_ADDONS,
  DEFAULT_ORDER_TYPE,
  DEFAULT_PACKAGE,
  DEFAULT_SERVICE_TYPE,
  DEFAULT_STATE,
  INCLUDE_COMPLIANCE_PAGE,
  INVOICE_BY,
  ITIN_ADDON_ID,
  ORDER_TYPES,
  PACKAGES,
  PAYMENT_STATUSES,
  SERVICE_TYPES,
  STATES,
} from '@/lib/services/invoice/config';
import {
  buildFileName,
  buildInvoiceNo,
  buildLineItems,
  computeTotals,
  defaultItinTerms,
  defaultPaymentTerms,
  expand,
  findPackage,
  findState,
  fmtLong,
  fmtShort,
  formatInvoiceDate,
  newCustomAddonId,
  randomSequence,
  todayIso,
  type CustomAddon,
  type InvoiceInput,
  resolveServiceType,
  serviceTypeApplies,
  stateAndPackageApply,
  packagePriceFor,
  stateFeeFor,
  compliancePageDefault,
} from '@/lib/services/invoice/invoice';
import InvoiceList, { type StoredInvoice } from './InvoiceList';

/* ------------------------------------------------------------- form shell */

const label = 'block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5';
const field =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 ' +
  'outline-none transition focus:border-[#33088f] focus:ring-2 focus:ring-[#33088f]/15 ' +
  'disabled:bg-slate-100 disabled:text-slate-400';

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="mb-4">
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      </header>
      {children}
    </section>
  );
}

function Field({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

/* -------------------------------------------------------------- the page */

export default function InvoiceGeneratorForm() {
  const [customerName, setCustomerName] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(todayIso());
  const [orderType, setOrderType] = useState(DEFAULT_ORDER_TYPE);
  const [stateCode, setStateCode] = useState(DEFAULT_STATE);
  const [sequence, setSequence] = useState('0000');
  const [invoiceNoOverride, setInvoiceNoOverride] = useState<string | null>(null);
  const [serviceType, setServiceType] = useState(DEFAULT_SERVICE_TYPE);
  const [invoiceBy, setInvoiceBy] = useState(INVOICE_BY[0]);
  const [paymentStatus, setPaymentStatus] = useState(PAYMENT_STATUSES[0].id);

  const [packageId, setPackageId] = useState(DEFAULT_PACKAGE);
  const [packagePrice, setPackagePrice] = useState(String(findPackage(DEFAULT_PACKAGE).price));
  const [packagePriceTouched, setPackagePriceTouched] = useState(false);
  const [filingFee, setFilingFee] = useState(String(findState(DEFAULT_STATE).fee));
  const [filingFeeTouched, setFilingFeeTouched] = useState(false);

  const [addonIds, setAddonIds] = useState<string[]>(DEFAULT_ADDONS);
  const [addonBonus, setAddonBonus] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ADDONS.map((a) => [a.id, a.bonus])),
  );

  const [discount, setDiscount] = useState('0');
  const [discountReason, setDiscountReason] = useState('');
  const [amountPaid, setAmountPaid] = useState('0');

  const [termsTitle, setTermsTitle] = useState('');
  const [termsBody, setTermsBody] = useState('');
  const [termsTouched, setTermsTouched] = useState(false);

  // Second terms block, shown only while the ITIN add-on is ticked.
  const [itinTitle, setItinTitle] = useState('');
  const [itinBody, setItinBody] = useState('');
  const [itinTouched, setItinTouched] = useState(false);

  // Add-ons invented here rather than in config.ts. Session only.
  const [customAddons, setCustomAddons] = useState<CustomAddon[]>([]);
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftDesc, setDraftDesc] = useState('');
  const [draftPrice, setDraftPrice] = useState('');
  const [draftError, setDraftError] = useState('');

  const [includeCompliance, setIncludeCompliance] = useState(INCLUDE_COMPLIANCE_PAGE);

  // Editing an existing invoice: the row's id, so regenerating updates that
  // record rather than creating a second one under the same number.
  const [editingId, setEditingId] = useState<string | null>(null);
  // Bumped after a generate so the list pulls the new row in.
  const [listRefresh, setListRefresh] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // The invoice number is random and never stored, so it is seeded on the
  // client after hydration to keep the server and client markup identical.
  useEffect(() => setSequence(randomSequence()), []);

  const num = (v: string) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const invoiceNo = invoiceNoOverride ?? buildInvoiceNo(orderType, stateCode, sequence);

  const input: InvoiceInput = useMemo(
    () => ({
      customerName,
      invoiceDate,
      invoiceNo,
      orderType,
      stateCode,
      serviceType,
      invoiceBy,
      paymentStatus,
      packageId,
      packagePrice: num(packagePrice),
      filingFee: num(filingFee),
      addonIds,
      addonBonus,
      customAddons,
      discount: num(discount),
      discountReason,
      amountPaid: num(amountPaid),
      paymentTermsTitle: termsTitle,
      paymentTermsBody: termsBody,
      itinTermsTitle: itinTitle,
      itinTermsBody: itinBody,
      includeCompliancePage: includeCompliance,
    }),
    [
      customerName, invoiceDate, invoiceNo, orderType, stateCode, serviceType, invoiceBy,
      paymentStatus, packageId, packagePrice, filingFee, addonIds, addonBonus, customAddons,
      discount, discountReason, amountPaid, termsTitle, termsBody, itinTitle, itinBody,
      includeCompliance,
    ],
  );

  // What the Service Type row will actually print — chosen for a formation,
  // derived for an ITIN, empty for a renewal. Same helper the PDF uses, so the
  // preview cannot drift from the document.
  const resolvedServiceType = resolveServiceType(input);

  // Selecting a state pulls in its fee, unless it was typed over. Which fee
  // depends on the order type: a formation pays the one-time filing fee, a
  // renewal pays that state's recurring annual report fee.
  useEffect(() => {
    if (!filingFeeTouched) setFilingFee(String(stateFeeFor(orderType, stateCode)));
  }, [stateCode, orderType, filingFeeTouched]);

  // Same for the package price, which is cheaper on a renewal.
  useEffect(() => {
    if (!packagePriceTouched) setPackagePrice(String(packagePriceFor(orderType, packageId)));
  }, [packageId, orderType, packagePriceTouched]);

  // Switching order type re-applies that type's defaults. Page 2 is the
  // annual-compliance sheet, which a standalone ITIN has no use for; selecting
  // ITIN also ticks the ITIN add-on, since it is the entire charge.
  const lastOrderType = useRef(orderType);
  useEffect(() => {
    if (lastOrderType.current === orderType) return;
    lastOrderType.current = orderType;

    setIncludeCompliance(compliancePageDefault(orderType));

    if (orderType === 'itin') {
      setAddonIds((prev) => (prev.includes(ITIN_ADDON_ID) ? prev : [...prev, ITIN_ADDON_ID]));
    }
  }, [orderType]);

  // Payment terms keep following the form until the user edits them.
  const autoTerms = defaultPaymentTerms(input);
  const autoTermsRef = useRef(autoTerms);
  autoTermsRef.current = autoTerms;
  useEffect(() => {
    if (termsTouched) return;
    setTermsTitle(autoTermsRef.current.title);
    setTermsBody(autoTermsRef.current.body);
  }, [termsTouched, autoTerms.title, autoTerms.body]);

  const showItinTerms = addonIds.includes(ITIN_ADDON_ID);
  const autoItin = defaultItinTerms(input);
  const autoItinRef = useRef(autoItin);
  autoItinRef.current = autoItin;
  useEffect(() => {
    if (itinTouched) return;
    setItinTitle(autoItinRef.current.title);
    setItinBody(autoItinRef.current.body);
  }, [itinTouched, autoItin.title, autoItin.body]);

  const totals = computeTotals(input);
  const items = buildLineItems(input);
  const fileName = buildFileName(input);
  const state = findState(stateCode);

  const toggleAddon = (id: string) =>
    setAddonIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const resetTerms = () => {
    setTermsTouched(false);
    setTermsTitle(autoTerms.title);
    setTermsBody(autoTerms.body);
  };

  const resetItinTerms = () => {
    setItinTouched(false);
    setItinTitle(autoItin.title);
    setItinBody(autoItin.body);
  };

  /** Preset add-ons first, then anything created in this session. */
  const addonRows = [
    ...ADDONS.map((a) => ({ id: a.id, name: a.name, price: a.price, custom: null as CustomAddon | null })),
    ...customAddons.map((c) => ({ id: c.id, name: c.name, price: c.price, custom: c })),
  ];

  function addCustomAddon() {
    const name = draftName.trim();
    if (!name) {
      setDraftError('Give the add-on a name.');
      return;
    }
    const price = Number(draftPrice);
    if (!Number.isFinite(price) || price < 0) {
      setDraftError('Enter a price of 0 or more.');
      return;
    }
    const addon: CustomAddon = {
      id: newCustomAddonId(),
      name,
      description: draftDesc.trim(),
      price,
      bonus: false,
    };
    setCustomAddons((prev) => [...prev, addon]);
    setAddonIds((prev) => [...prev, addon.id]);   // ticked straight away
    setAddonBonus((prev) => ({ ...prev, [addon.id]: false }));
    setDraftName('');
    setDraftDesc('');
    setDraftPrice('');
    setDraftError('');
    setDraftOpen(false);
  }

  function removeCustomAddon(id: string) {
    setCustomAddons((prev) => prev.filter((a) => a.id !== id));
    setAddonIds((prev) => prev.filter((x) => x !== id));
  }


  /**
   * Reopens a stored invoice in the form. Every field is restored from the
   * saved input, so regenerating produces the same document unless something
   * is changed — and it updates that record rather than creating a second one
   * under the same number.
   */
  function loadInvoice(stored: StoredInvoice) {
    const f = stored.formInput as unknown as InvoiceInput;

    setCustomerName(f.customerName ?? '');
    setInvoiceDate(f.invoiceDate ?? todayIso());
    setOrderType(f.orderType ?? DEFAULT_ORDER_TYPE);
    setStateCode(f.stateCode ?? DEFAULT_STATE);
    setInvoiceNoOverride(f.invoiceNo ?? null);
    setServiceType(f.serviceType ?? DEFAULT_SERVICE_TYPE);
    setInvoiceBy(f.invoiceBy ?? INVOICE_BY[0]);
    setPaymentStatus(f.paymentStatus ?? PAYMENT_STATUSES[0].id);

    setPackageId(f.packageId ?? DEFAULT_PACKAGE);
    setPackagePrice(String(f.packagePrice ?? 0));
    setPackagePriceTouched(true);
    setFilingFee(String(f.filingFee ?? 0));
    setFilingFeeTouched(true);

    setCustomAddons(f.customAddons ?? []);
    setAddonIds(f.addonIds ?? []);
    setAddonBonus(f.addonBonus ?? {});

    setDiscount(String(f.discount ?? 0));
    setDiscountReason(f.discountReason ?? '');
    setAmountPaid(String(f.amountPaid ?? 0));

    // Marked as touched so the restored wording is not overwritten by the
    // auto-writer when the form recomputes.
    setTermsTitle(f.paymentTermsTitle ?? '');
    setTermsBody(f.paymentTermsBody ?? '');
    setTermsTouched(true);
    setItinTitle(f.itinTermsTitle ?? '');
    setItinBody(f.itinTermsBody ?? '');
    setItinTouched(true);

    setIncludeCompliance(Boolean(f.includeCompliancePage));

    setEditingId(stored.id);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function generate() {
    setError('');
    if (!customerName.trim()) {
      setError('Enter the customer name first — it is used in the file name.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/admin/invoice-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, fileName, invoiceId: editingId ?? undefined }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(body.error ?? 'Request failed');
      }
      // The record is stored server-side; a failure there is reported in a
      // header rather than failing the download.
      if (response.headers.get('X-Invoice-Saved') === '0') {
        setError(
          `The PDF downloaded, but it was not saved to the list: ${response.headers.get('X-Invoice-Error') ?? 'unknown error'}`
        );
      } else {
        setEditingId(response.headers.get('X-Invoice-Id'));
        setListRefresh((n) => n + 1);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate the invoice.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="font-inter">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-black font-manrope">Invoice Generator</h1>
        <p className="mt-1 text-sm text-slate-500">
          Fill this in, then download the PDF. Prices, states, add-ons and the compliance page all
          live in <code className="rounded bg-slate-200 px-1 py-0.5 text-xs">src/lib/services/invoice/config.ts</code>.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="space-y-5">
          {/* ------------------------------------------------ customer */}
          <Section title="Invoice details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field className="sm:col-span-2">
                <label className={label}>Invoice To — customer name</label>
                <input
                  className={field}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Mr. Qaiser"
                />
              </Field>

              <Field>
                <label className={label}>Invoice date</label>
                <input
                  type="date"
                  className={field}
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Prints as {formatInvoiceDate(invoiceDate)}
                </p>
              </Field>

              <Field>
                <label className={label}>Order type — sets the invoice prefix</label>
                <select
                  className={field}
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value)}
                >
                  {ORDER_TYPES.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label} ({o.prefix})
                    </option>
                  ))}
                </select>
              </Field>

              {/* A standalone ITIN is a federal application — no state is
                  filed with, so the field would only invite a wrong choice. */}
              {stateAndPackageApply(orderType) && (
                <Field>
                  <label className={label}>State</label>
                  <select
                    className={field}
                    value={stateCode}
                    onChange={(e) => setStateCode(e.target.value)}
                  >
                    {STATES.map((s) => (
                      <option key={s.stateCode} value={s.stateCode}>
                        {s.stateName} ({s.stateCode}) — $
                        {stateFeeFor(orderType, s.stateCode)}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              <Field>
                <label className={label}>Invoice no</label>
                <div className="flex gap-2">
                  <input
                    className={field}
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNoOverride(e.target.value)}
                  />
                  <button
                    type="button"
                    title="New random number"
                    onClick={() => {
                      setInvoiceNoOverride(null);
                      setSequence(randomSequence());
                    }}
                    className="shrink-0 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-600 transition hover:border-[#33088f] hover:text-[#33088f]"
                  >
                    ↻
                  </button>
                </div>
              </Field>

              {/* Only a formation invoice lets the operator pick this. An ITIN
                  names its own service and a renewal prints no service row, so
                  the dropdown would only offer inapplicable formation wording. */}
              {serviceTypeApplies(orderType) && (
                <Field>
                  <label className={label}>Service type</label>
                  <select
                    className={field}
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                  >
                    {SERVICE_TYPES.map((s) => (
                      <option key={s} value={s}>
                        {expand(s, input)}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              <Field>
                <label className={label}>Invoice by</label>
                <select
                  className={field}
                  value={invoiceBy}
                  onChange={(e) => setInvoiceBy(e.target.value)}
                >
                  {INVOICE_BY.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </Field>

              <Field>
                <label className={label}>Payment status</label>
                <select
                  className={field}
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                >
                  {PAYMENT_STATUSES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>

          {/* ------------------------------------------------- pricing */}
          {/* An ITIN invoice sells no package and pays no state fee; the ITIN
              add-on below is the whole charge. */}
          {stateAndPackageApply(orderType) && (
          <Section
            title={
              orderType === 'renewal'
                ? 'Package & state annual report fee'
                : 'Package & state filing fee'
            }
            hint="These print as two separate lines in the description table."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <label className={label}>Package</label>
                <select
                  className={field}
                  value={packageId}
                  onChange={(e) => {
                    setPackageId(e.target.value);
                    setPackagePriceTouched(false);
                  }}
                >
                  {PACKAGES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ${packagePriceFor(orderType, p.id)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field>
                <label className={label}>Package price ($)</label>
                <input
                  type="number"
                  min={0}
                  step="1"
                  className={field}
                  value={packagePrice}
                  onChange={(e) => {
                    setPackagePrice(e.target.value);
                    setPackagePriceTouched(true);
                  }}
                />
              </Field>

              <Field>
                <label className={label}>
                  {state.stateName}{' '}
                  {orderType === 'renewal' ? 'annual report fee' : 'filing fee'} ($)
                </label>
                <input
                  type="number"
                  min={0}
                  step="1"
                  className={field}
                  value={filingFee}
                  onChange={(e) => {
                    setFilingFee(e.target.value);
                    setFilingFeeTouched(true);
                  }}
                />
              </Field>
            </div>
          </Section>
          )}

          {/* -------------------------------------------------- add-ons */}
          <Section
            title="Add-ons"
            hint="Tick what applies. “Bonus” keeps the rate visible but charges $0."
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {addonRows.map((addon) => {
                const on = addonIds.includes(addon.id);
                return (
                  <div
                    key={addon.id}
                    className={`rounded-lg border px-3 py-2 transition ${
                      on ? 'border-[#33088f]/40 bg-[#33088f]/5' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => toggleAddon(addon.id)}
                          className="size-4 shrink-0 accent-[#33088f]"
                        />
                        <span className="truncate text-sm text-slate-800">{addon.name}</span>
                        <span className="ml-auto shrink-0 text-xs font-semibold text-slate-500">
                          ${addon.price}
                        </span>
                      </label>
                      <label
                        className={`flex shrink-0 cursor-pointer items-center gap-1.5 text-xs ${
                          on ? 'text-slate-600' : 'text-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={!on}
                          checked={addonBonus[addon.id] ?? false}
                          onChange={(e) =>
                            setAddonBonus((prev) => ({ ...prev, [addon.id]: e.target.checked }))
                          }
                          className="size-3.5 accent-emerald-600"
                        />
                        Bonus
                      </label>
                      {addon.custom && (
                        <button
                          type="button"
                          title="Remove this custom add-on"
                          onClick={() => removeCustomAddon(addon.id)}
                          className="shrink-0 rounded px-1 text-sm text-slate-400 transition hover:text-rose-600"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    {addon.custom?.description && (
                      <p className="mt-1 pl-[26px] text-xs text-slate-500">
                        Prints as: {addon.custom.description}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ------------------------------- custom add-on, session only */}
            {draftOpen ? (
              <div className="mt-3 rounded-xl border border-[#33088f]/30 bg-[#33088f]/5 p-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_110px]">
                  <Field>
                    <label className={label}>Name</label>
                    <input
                      autoFocus
                      className={field}
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      placeholder="Rush filing"
                    />
                  </Field>
                  <Field>
                    <label className={label}>Description (prints on invoice)</label>
                    <input
                      className={field}
                      value={draftDesc}
                      onChange={(e) => setDraftDesc(e.target.value)}
                      placeholder="Expedited 24-hour state filing"
                    />
                  </Field>
                  <Field>
                    <label className={label}>Price ($)</label>
                    <input
                      type="number"
                      min={0}
                      step="1"
                      className={field}
                      value={draftPrice}
                      onChange={(e) => setDraftPrice(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addCustomAddon()}
                    />
                  </Field>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Leave the description blank and the name is printed instead. Custom add-ons last
                  for this session only — add them to <code>lib/config.ts</code> to keep them.
                </p>
                {draftError && <p className="mt-2 text-xs text-rose-600">{draftError}</p>}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={addCustomAddon}
                    className="rounded-lg bg-[#33088f] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#280670]"
                  >
                    Add add-on
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraftOpen(false);
                      setDraftError('');
                    }}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setDraftOpen(true)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-500 transition hover:border-[#33088f] hover:text-[#33088f]"
              >
                <span className="text-base leading-none">+</span> Add custom add-on
              </button>
            )}
          </Section>

          {/* ------------------------------------------------- discount */}
          <Section
            title="Discount & payment received"
            hint="The discount and its description are printed in the table and in the totals panel."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <label className={label}>Discount ($)</label>
                <input
                  type="number"
                  min={0}
                  step="1"
                  className={field}
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </Field>
              <Field className="sm:col-span-2">
                <label className={label}>Discount description (short)</label>
                <input
                  className={field}
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  placeholder="Returning client discount"
                />
              </Field>
              <Field>
                <label className={label}>Payment received ($)</label>
                <input
                  type="number"
                  min={0}
                  step="1"
                  className={field}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                />
              </Field>
            </div>
          </Section>

          {/* -------------------------------------------- payment terms */}
          <Section title="Payment terms">
            <div className="space-y-3">
              <div className="flex items-end gap-2">
                <Field className="flex-1">
                  <label className={label}>Terms heading</label>
                  <input
                    className={field}
                    value={termsTitle}
                    onChange={(e) => {
                      setTermsTitle(e.target.value);
                      setTermsTouched(true);
                    }}
                  />
                </Field>
                <button
                  type="button"
                  onClick={resetTerms}
                  className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-[#33088f] hover:text-[#33088f]"
                >
                  Reset to auto
                </button>
              </div>
              <Field>
                <label className={label}>Terms text</label>
                <textarea
                  rows={3}
                  className={`${field} resize-y leading-relaxed`}
                  value={termsBody}
                  onChange={(e) => {
                    setTermsBody(e.target.value);
                    setTermsTouched(true);
                  }}
                />
              </Field>
              {/* Second terms block — appears only while ITIN is ticked. */}
              {showItinTerms && (
                <div className="space-y-3 rounded-xl border border-[#33088f]/25 bg-[#33088f]/5 p-4">
                  <p className="text-xs font-semibold text-[#33088f]">
                    ITIN add-on is selected — this block prints directly under the terms above.
                  </p>
                  <div className="flex items-end gap-2">
                    <Field className="flex-1">
                      <label className={label}>ITIN terms heading</label>
                      <input
                        className={field}
                        value={itinTitle}
                        onChange={(e) => {
                          setItinTitle(e.target.value);
                          setItinTouched(true);
                        }}
                      />
                    </Field>
                    <button
                      type="button"
                      onClick={resetItinTerms}
                      className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-[#33088f] hover:text-[#33088f]"
                    >
                      Reset to auto
                    </button>
                  </div>
                  <Field>
                    <label className={label}>ITIN terms text</label>
                    <textarea
                      rows={3}
                      className={`${field} resize-y leading-relaxed`}
                      value={itinBody}
                      onChange={(e) => {
                        setItinBody(e.target.value);
                        setItinTouched(true);
                      }}
                    />
                  </Field>
                </div>
              )}

              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={includeCompliance}
                  onChange={(e) => setIncludeCompliance(e.target.checked)}
                  className="size-4 accent-[#33088f]"
                />
                Include page 2 — {state.stateName} Annual Compliance
              </label>
            </div>
          </Section>
        </div>

        {/* ------------------------------------------------- summary rail */}
        <aside className="space-y-4 lg:sticky lg:top-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-slate-900">Summary</h2>

            <dl className="mb-4 space-y-1.5 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Invoice no</dt>
                <dd className="font-semibold text-[#33088f]">{invoiceNo}</dd>
              </div>
              {resolvedServiceType && (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Service</dt>
                  <dd className="truncate text-right font-medium text-slate-700">
                    {expand(resolvedServiceType, input)}
                  </dd>
                </div>
              )}
            </dl>

            <ul className="mb-4 space-y-1.5 border-y border-slate-100 py-3 text-xs">
              {items.map((item, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span className="min-w-0 flex-1 truncate text-slate-600">{item.description}</span>
                  <span className="shrink-0 font-semibold text-slate-800">
                    {fmtShort(item.amount)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Sub total</dt>
                <dd className="font-medium">{fmtLong(totals.subTotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Discount</dt>
                <dd className="font-medium">{fmtLong(totals.discount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Payment</dt>
                <dd className="font-medium">{fmtLong(totals.payment)}</dd>
              </div>
              <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base">
                <dt className="font-bold text-slate-900">Final amount</dt>
                <dd className="font-bold text-[#33088f]">{fmtLong(totals.finalAmount)}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-sm font-bold text-slate-900">File name</h2>
            <p className="break-words rounded-lg bg-slate-100 px-3 py-2 font-mono text-[11px] leading-relaxed text-slate-700">
              {fileName}
            </p>
          </div>

          {error && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={generate}
            disabled={busy}
            className="w-full rounded-xl bg-[#33088f] px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#280670] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Generating…' : 'Generate & download PDF'}
          </button>
        </aside>
      </div>
    </div>
  );
}

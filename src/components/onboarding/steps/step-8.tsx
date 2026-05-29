'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '@/context/onboarding-context';
import { StepHeader } from '../ui/step-header';
import { StepFooter } from '../ui/step-footer';
import { FileUploader } from '../ui/file-uploader';
import { CreditCard, Landmark, MessageSquare, Copy, Check, ShieldCheck, Info, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { clearOnboardingArtifacts } from '@/lib/onboarding-utils';
import { buildPricingSnapshot, safeFormatUSD } from '@/lib/pricing';
import { AlertCircle } from 'lucide-react';

export default function Step8() {
  const { state, saveStepData } = useOnboarding();
  const router = useRouter();
  const { formData, tempSessionKey } = state;
  const [activeTab, setActiveTab] = useState<'pay' | 'already_paid'>('pay');
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'card'>('bank');
  const [receiptUrl, setReceiptUrl] = useState<string | null>(formData[8]?.receiptUrl || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const pricing = buildPricingSnapshot({
    stateFee: formData[2]?.stateFee,
    packagePrice: formData[2]?.packagePrice,
    selectedAddonIds: formData[5]?.selectedAddons || [],
  });

  const reference = tempSessionKey?.slice(0, 8).toUpperCase();

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSubmitOrder = async () => {
    if (!receiptUrl && activeTab === 'pay' && paymentMethod === 'bank') return;
    if (!receiptUrl && activeTab === 'already_paid') return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/onboarding/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tempSessionKey: tempSessionKey,
          paymentMethod: activeTab === 'already_paid' ? 'already_paid' : (paymentMethod === 'bank' ? 'bank_transfer' : 'card'),
          receiptUrl
        })
      });

      const data = await res.json();
      if (data.success) {
        saveStepData(8, { 
          paymentMethod: activeTab === 'already_paid' ? 'already_paid' : (paymentMethod === 'bank' ? 'bank_transfer' : 'card'),
          receiptUrl 
        });
        clearOnboardingArtifacts();
        router.push(`/onboarding/thank-you?order_id=${data.orderId}`);
      } else {
        setErrorMsg(data.error || 'Submission failed. Please try again.');
        setIsSubmitting(false);
      }
    } catch {
      setErrorMsg('An unexpected error occurred during submission. Please try again.');
      setIsSubmitting(false);
    }
  };

  const lineItems = [
    { label: `${formData[2]?.package || 'Formation Package'} (${formData[2]?.stateName || formData[2]?.state || ''})`, price: pricing.packagePrice },
    { label: "State Fee", price: pricing.stateFee },
    ...pricing.addons.map(addon => ({
      label: addon.title,
      price: addon.price
    }))
  ];

  return (
    <div className="space-y-12">
      <StepHeader 
        title="Complete your payment"
        subtitle="Your order will be submitted once payment is confirmed."
      />

      <div className="max-w-3xl mx-auto space-y-10">
        {/* Invoice Summary */}
        <div className="border border-gray-100 rounded-sm overflow-hidden shadow-sm">
          <div className="bg-gray-50 px-8 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-gray-400 font-manrope">Invoice Summary</h3>
            <span className="text-[11px] font-bold text-gray-400 font-inter">Ref: #{reference}</span>
          </div>
          <div className="p-8 space-y-4 bg-white">
            {lineItems.map((item, i) => (
              <div key={i} className="flex justify-between items-center text-[14px] font-medium text-gray-600 font-inter">
                <span>{item.label}</span>
                <span className="text-black font-bold">{safeFormatUSD(item.price)}</span>
              </div>
            ))}
            <div className="pt-6 border-t border-gray-50 flex justify-between items-center">
              <span className="text-[16px] font-black uppercase tracking-tight text-black font-manrope">Total Due</span>
              <span className="text-[24px] font-black text-[#34088f] font-manrope">{safeFormatUSD(pricing.grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="space-y-8">
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setActiveTab('pay')}
              className={cn(
                "px-8 py-4 text-[13px] font-black uppercase tracking-widest transition-all relative",
                activeTab === 'pay' ? "text-[#34088f]" : "text-gray-400 hover:text-black"
              )}
            >
              Make Payment
              {activeTab === 'pay' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#34088f]" />}
            </button>
            <button
              onClick={() => setActiveTab('already_paid')}
              className={cn(
                "px-8 py-4 text-[13px] font-black uppercase tracking-widest transition-all relative",
                activeTab === 'already_paid' ? "text-[#34088f]" : "text-gray-400 hover:text-black"
              )}
            >
              Already Paid
              {activeTab === 'already_paid' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#34088f]" />}
            </button>
          </div>

          {activeTab === 'pay' ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setPaymentMethod('bank')}
                  className={cn(
                    "p-6 border flex flex-col items-center gap-4 transition-all rounded-sm",
                    paymentMethod === 'bank' ? "border-[#34088f] bg-[#F5F0FF] ring-4 ring-[#34088f]/5" : "border-gray-100 hover:border-gray-200"
                  )}
                >
                  <Landmark className={cn("w-8 h-8", paymentMethod === 'bank' ? "text-[#34088f]" : "text-gray-300")} />
                  <span className="text-[12px] font-black uppercase tracking-widest font-manrope">Bank Transfer</span>
                </button>
                <button
                  disabled
                  className="p-6 border border-gray-100 flex flex-col items-center gap-4 opacity-50 cursor-not-allowed rounded-sm relative group"
                >
                  <CreditCard className="w-8 h-8 text-gray-300" />
                  <span className="text-[12px] font-black uppercase tracking-widest font-manrope">Card Payment</span>
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="bg-black text-white text-[10px] px-3 py-1 font-bold uppercase tracking-widest">Coming Soon</span>
                  </div>
                </button>
              </div>

              {paymentMethod === 'bank' && (
                <div className="space-y-8 animate-in fade-in zoom-in-95">
                  <div className="bg-white border border-gray-100 p-8 rounded-sm space-y-6">
                    <div className="flex items-center gap-2 text-[#34088f] mb-2">
                      <Info className="w-4 h-4" />
                      <span className="text-[11px] font-black uppercase tracking-widest">Payment Instructions</span>
                    </div>
                    {[
                      { label: "Bank Name", value: "Chase Bank" },
                      { label: "Account Name", value: "Foremint LLC" },
                      { label: "Account Number", value: "9876543210", copy: true },
                      { label: "Routing Number", value: "123456789", copy: true },
                      { label: "Reference", value: reference, copy: true },
                      { label: "Amount Due", value: safeFormatUSD(pricing.grandTotal) },
                    ].map((row, i) => (
                      <div key={i} className="flex justify-between items-center group">
                        <span className="text-[11px] font-black uppercase tracking-widest text-gray-300 font-inter">{row.label}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[14px] font-bold text-black font-inter">{row.value}</span>
                          {row.copy && (
                            <button 
                              onClick={() => handleCopy(row.value!, row.label)}
                              className="text-gray-300 hover:text-[#34088f] transition-colors"
                            >
                              {copiedField === row.label ? <Check className="w-4 h-4 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[14px] font-black uppercase tracking-tight text-black font-manrope">Upload Transfer Receipt</h4>
                    <FileUploader 
                      label="Payment Receipt"
                      onUploadComplete={(upload) => setReceiptUrl(typeof upload === 'string' ? upload : upload.url)}
                      onRemove={() => setReceiptUrl(null)}
                      uploadType="payment_receipt"
                      tempSessionKey={tempSessionKey!}
                      currentUrl={receiptUrl || undefined}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <div className="p-6 bg-[#F5F0FF] border border-[#34088f]/10 rounded-sm flex gap-4">
                <MessageSquare className="w-6 h-6 text-[#34088f] shrink-0" />
                <div className="space-y-1">
                  <p className="text-[14px] font-bold text-black font-inter">WhatsApp Support</p>
                  <p className="text-[13px] text-gray-600 font-inter leading-relaxed">
                    If you&apos;ve already made payment via WhatsApp or Telegram, please upload your receipt below to finalize your order.
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-[14px] font-black uppercase tracking-tight text-black font-manrope">Upload Payment Receipt</h4>
                <FileUploader 
                  label="Payment Receipt"
                  onUploadComplete={(upload) => setReceiptUrl(typeof upload === 'string' ? upload : upload.url)}
                  onRemove={() => setReceiptUrl(null)}
                  uploadType="payment_receipt"
                  tempSessionKey={tempSessionKey!}
                  currentUrl={receiptUrl || undefined}
                />
              </div>
            </div>
          )}
        </div>

        {/* Security Notice */}
        <div className="flex items-center justify-center gap-3 py-6 border-t border-gray-50">
          <ShieldCheck className="w-5 h-5 text-gray-300" />
          <p className="text-[12px] font-medium text-gray-400 font-inter">Secure encrypted payment processing • SSL Protected</p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-[13px] font-medium text-red-800 font-inter leading-relaxed">{errorMsg}</p>
          </div>
        )}

        <button
          onClick={handleSubmitOrder}
          disabled={isSubmitting || (!receiptUrl && (activeTab === 'already_paid' || paymentMethod === 'bank'))}
          className="w-full py-5 bg-[#34088f] text-white text-[14px] font-black uppercase tracking-[0.3em] rounded-sm transition-all shadow-2xl shadow-[#34088f]/30 hover:bg-[#2a0674] disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Submitting Order...
            </>
          ) : (
            "Submit Final Order"
          )}
        </button>
      </div>

      <StepFooter 
        currentStep={8} 
        isSubmitting={isSubmitting}
        onContinue={() => {}} // Handle via handleSubmitOrder
        continueLabel="Submit Order"
      />
    </div>
  );
}

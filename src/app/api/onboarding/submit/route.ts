import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { buildPricingSnapshot } from '@/lib/pricing';
import { FormSnapshot } from '@/types/orders';
import {
  sendOrderConfirmationEmail,
  sendAdminOrderNotificationEmail,
} from '@/lib/email/sendOrderConfirmation';

// Function to safely sanitize the form data
function sanitizeFormSnapshot(formData: any): FormSnapshot {
  const safeData: any = {};
  
  if (formData[1]) safeData.step1 = formData[1];
  if (formData[2]) safeData.step2 = formData[2];
  if (formData[3]) safeData.step3 = formData[3];
  
  if (formData[4] && Array.isArray(formData[4].members)) {
    safeData.step4 = {
      members: formData[4].members.map((m: any) => {
        const { ssn, SSN, ...rest } = m;
        return {
          ...rest,
          hasProvidedSSN: !!(ssn || SSN)
        };
      })
    };
  }
  
  if (formData[5]) safeData.step5 = formData[5];
  
  // Explicitly omit step6 (Auth data)
  
  if (formData[7]) safeData.step7 = formData[7];
  if (formData[8]) safeData.step8 = formData[8];

  return safeData as FormSnapshot;
}

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    const { tempSessionKey, paymentMethod, receiptUrl } = body;

    if (!tempSessionKey || !paymentMethod) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Verify authenticated user
    const supabaseServer = await createServerClient();
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Load draft from DB using service role client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: draft, error: draftError } = await supabaseAdmin
      .from('onboarding_drafts')
      .select('*')
      .eq('temp_session_key', tempSessionKey)
      .eq('user_id', user.id)
      .single();

    if (draftError || !draft) {
      return NextResponse.json({ error: 'Draft not found or unauthorized' }, { status: 404 });
    }

    if (draft.status === 'submitted') {
      return NextResponse.json({ error: 'Order has already been submitted' }, { status: 400 });
    }

    const formData = draft.form_data as any;

    // Recompute all pricing server-side by loading authentic prices from database
    const selectedPackageId = formData[2]?.package;
    let dbPackagePrice = Number(formData[2]?.packagePrice || 0);
    let dbPackageName = formData[2]?.packageName || '';

    if (selectedPackageId) {
      if (selectedPackageId === 'standard') {
        dbPackagePrice = 120;
        dbPackageName = 'Standard';
      } else if (selectedPackageId === 'advanced') {
        dbPackagePrice = 170;
        dbPackageName = 'Advanced';
      } else if (selectedPackageId.includes('-')) {
        // UUID package, fetch from DB
        const { data: dbPkg } = await supabaseAdmin
          .from('packages')
          .select('name, price')
          .eq('id', selectedPackageId)
          .maybeSingle();

        if (dbPkg) {
          dbPackagePrice = Number(dbPkg.price);
          dbPackageName = dbPkg.name;
        }
      }
    }

    const selectedAddonIds = Array.isArray(formData[5]?.selectedAddons) ? formData[5].selectedAddons : [];
    let dbAddonsList: Array<{ id: string; title: string; price: number; billingLabel?: string; priceCents?: number }> = [];

    if (selectedAddonIds.length > 0) {
      const uuidAddonIds = selectedAddonIds.filter((id: string) => id.includes('-'));
      const legacyAddonIds = selectedAddonIds.filter((id: string) => !id.includes('-'));

      if (uuidAddonIds.length > 0) {
        const { data: addonsData } = await supabaseAdmin
          .from('addons')
          .select('id, name, price')
          .in('id', uuidAddonIds);

        if (addonsData) {
          addonsData.forEach(addon => {
            dbAddonsList.push({
              id: addon.id,
              title: addon.name,
              price: Number(addon.price),
              priceCents: Math.round(Number(addon.price) * 100),
            });
          });
        }
      }

      if (legacyAddonIds.length > 0) {
        const { resolveSelectedAddons } = require('@/lib/pricing');
        const legacyAddons = resolveSelectedAddons(legacyAddonIds);
        legacyAddons.forEach((addon: any) => {
          dbAddonsList.push({
            id: addon.id,
            title: addon.title,
            price: addon.price,
            priceCents: addon.priceCents,
            billingLabel: addon.billingLabel,
          });
        });
      }
    }

    const pricing = buildPricingSnapshot({
      stateFee: Number(formData[2]?.stateFee || 0),
      packagePrice: dbPackagePrice,
      selectedAddonIds: selectedAddonIds,
      dbAddons: dbAddonsList,
    });

    // Sanitize the form data
    const safeFormSnapshot = sanitizeFormSnapshot(formData);
    if (safeFormSnapshot.step2) {
      safeFormSnapshot.step2.packagePrice = dbPackagePrice;
      safeFormSnapshot.step2.packageName = dbPackageName;
    }

    // Insert into orders table
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: user.id,
        draft_id: draft.id,
        order_type: 'LLC Formation',
        status: 'pending', // or 'awaiting_payment'
        payment_status: 'unpaid',
        payment_method: paymentMethod,
        payment_receipt_url: receiptUrl || null,
        
        entity_type: formData[1]?.entityType,
        member_type: formData[1]?.memberType,
        formation_state: formData[2]?.state,
        formation_state_name: formData[2]?.stateName,
        formation_package: formData[2]?.package,
        
        state_fee: pricing.stateFee,
        package_price: pricing.packagePrice,
        formation_total: pricing.formationTotal,
        addons_total: pricing.addonsTotal,
        grand_total: pricing.grandTotal,
        
        selected_addons: pricing.addons.map(a => a.id),
        form_snapshot: safeFormSnapshot as any,
        pricing_snapshot: pricing as any,
        addons_snapshot: pricing.addons as any,
        
        amount: pricing.grandTotal, // To satisfy any not null constraint
        submitted_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (orderError) {
      console.error('Order creation failed:', orderError);
      return NextResponse.json({ error: 'Failed to create order: ' + orderError.message }, { status: 500 });
    }

    // Update draft status
    const { error: updateError } = await supabaseAdmin
      .from('onboarding_drafts')
      .update({ status: 'submitted' })
      .eq('id', draft.id);

    if (updateError) {
      console.error('Failed to update draft status:', updateError);
      // We still return success as order was created, but log error
    }

    // Mark user profile as onboarding completed
    await supabaseAdmin
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', user.id);

    // ── Fetch profile for customer name ──────────────────────────────────
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const customerName = profile?.full_name ?? user.email ?? 'Valued Customer';
    const businessName = formData[1]?.businessName || '';
    const orderDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const stateName = formData[2]?.stateName || formData[2]?.state || '';

    // ── Customer confirmation email (non-blocking) ──────────────────────────
    sendOrderConfirmationEmail({
      to: user.email!,
      userName: customerName,
      orderNumber: order.id,
      businessName,
      grandTotal: pricing.grandTotal,
      packageName: dbPackageName,
      formationState: stateName,
      orderDate,
    }).catch(err => console.error('[Email] Customer confirmation failed:', err));

    // ── Admin notification email (non-blocking) ─────────────────────────────
    sendAdminOrderNotificationEmail({
      customerName,
      customerEmail: user.email!,
      orderId: order.id,
      serviceName: dbPackageName,
      businessName,
      formationState: stateName,
      grandTotal: pricing.grandTotal,
      orderDate,
    }).catch(err => console.error('[Email] Admin notification failed:', err));

    return NextResponse.json({ 
      success: true, 
      orderId: order.id,
      orderReference: 'FORM-' + order.id.substring(0, 8).toUpperCase()
    });

  } catch (err: any) {
    console.error('Submit route error:', err);
    return NextResponse.json({ error: 'Internal server error: ' + (err.message || 'Unknown error') }, { status: 500 });
  }
}

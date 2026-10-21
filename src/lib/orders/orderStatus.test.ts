/**
 * Order-status registry + status-email coverage tests.
 *
 * Run with:  npm run test
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ORDER_STATUS_OPTIONS,
  ORDER_STATUS_VALUES,
  PAYMENT_PENDING_STATUSES,
  TONE_STYLES,
  countByStatus,
  getSelectableStatuses,
  getStatusDisplay,
  hasItinAddon,
  isDocumentsExpectedStatus,
  isFormationCompleteStatus,
  isInProgressStatus,
  isItinStatus,
  isOrderStatus,
  isSelectableStatus,
} from './orderStatus';
import { GENERIC_STATUS_EMAILS, hasStatusEmail } from '../email/orderStatusEmailContent';
import { OrderStatusUpdateEmailHtml } from '../email/templates/order-status-update';

test('statuses are presented in the agreed order with the agreed labels', () => {
  assert.deepEqual(
    ORDER_STATUS_OPTIONS.map((s) => s.label),
    [
      'Pending',
      'Initialized',
      'Submitted in State',
      'Formed in State',
      'EIN Pending',
      'Pending Payment',
      'Formation Completed',
      'ITIN Initialized',
      'ITIN In Progress',
      'ITIN Received',
      'ITIN Payment Pending',
      'ITIN Process Completed',
    ]
  );
});

test('every status has a tone that exists in the palette', () => {
  for (const s of ORDER_STATUS_OPTIONS) {
    assert.ok(TONE_STYLES[s.tone], `${s.value} has no palette entry`);
  }
  assert.ok(getStatusDisplay('cancelled').style);
});

test('lookups ignore prototype keys and unknown values', () => {
  assert.equal(isOrderStatus('constructor'), false);
  assert.equal(isOrderStatus('toString'), false);
  assert.equal(isOrderStatus('formed'), false, 'the old key no longer exists');
  assert.equal(isOrderStatus('payment_pending'), false, 'the old key no longer exists');
  assert.equal(isOrderStatus('cancelled'), true);
  assert.equal(isSelectableStatus('cancelled'), false);
  assert.equal(getStatusDisplay('some_legacy_value').label, 'some legacy value');
  assert.equal(getStatusDisplay(null).label, 'Unknown');
});

test('ITIN statuses are exactly the five ITIN stages', () => {
  assert.deepEqual(
    ORDER_STATUS_VALUES.filter((s) => isItinStatus(s)),
    [
      'itin_initialized',
      'itin_in_progress',
      'itin_received',
      'itin_payment_pending',
      'itin_process_completed',
    ]
  );
});

test('every status except Pending emails the customer', () => {
  for (const s of ORDER_STATUS_VALUES) {
    assert.equal(hasStatusEmail(s), s !== 'pending', `${s}`);
  }
  assert.equal(hasStatusEmail('cancelled'), false);
  assert.equal(hasStatusEmail('constructor'), false);
});

test('generic status emails render, name the status, and escape customer input', () => {
  for (const [status, content] of Object.entries(GENERIC_STATUS_EMAILS)) {
    const { label, tone } = getStatusDisplay(status);
    assert.ok(content && tone);

    const html = OrderStatusUpdateEmailHtml({
      userName: 'Ada <b>',
      orderNumber: 'FM-1',
      businessName: '<script>alert(1)</script> LLC',
      formationState: 'Wyoming',
      pendingAmount: 150,
      billingUrl: 'https://example.test/dashboard/billing',
      dashboardUrl: 'https://example.test/dashboard',
      statusLabel: label,
      tone: TONE_STYLES[tone],
      content,
    });

    assert.ok(html.includes(label), `${status}: status label missing`);
    assert.ok(!html.includes('<script>'), `${status}: business name was not escaped`);
    assert.ok(!html.includes('Ada <b>'), `${status}: user name was not escaped`);
    assert.ok(!/\{(name|business|state)\}/.test(html), `${status}: unresolved token`);
  }
});

test('the balance card and billing link appear only for ITIN Payment Pending', () => {
  const render = (status: 'itin_payment_pending' | 'itin_received', pendingAmount: number) => {
    const { label, tone } = getStatusDisplay(status);
    return OrderStatusUpdateEmailHtml({
      userName: 'Ada',
      orderNumber: 'FM-1',
      businessName: 'Acme',
      formationState: '',
      pendingAmount,
      billingUrl: 'https://example.test/billing',
      dashboardUrl: 'https://example.test/dashboard',
      statusLabel: label,
      tone: TONE_STYLES[tone!],
      content: GENERIC_STATUS_EMAILS[status]!,
    });
  };

  const owing = render('itin_payment_pending', 150);
  assert.ok(owing.includes('Outstanding Balance'));
  assert.ok(owing.includes('$150'));
  assert.ok(owing.includes('href="https://example.test/billing"'));

  const settled = render('itin_payment_pending', 0);
  assert.ok(!settled.includes('Outstanding Balance'));
  assert.ok(settled.includes('href="https://example.test/dashboard"'));

  assert.ok(!render('itin_received', 150).includes('Outstanding Balance'));
});

test('ITIN add-on is detected from checkout ids, snapshot titles and internal add-ons', () => {
  assert.equal(hasItinAddon({}), false);
  assert.equal(hasItinAddon({ selectedAddons: ['itin'] }), true);
  assert.equal(
    hasItinAddon({
      selectedAddons: ['6f1c0a52-0000-4000-8000-000000000000'],
      addonsSnapshot: [{ id: '6f1c0a52-0000-4000-8000-000000000000', title: 'ITIN Application' }],
    }),
    true
  );
  assert.equal(
    hasItinAddon({ addonsSnapshot: [{ name: 'Individual Taxpayer Identification Number' }] }),
    true
  );
  assert.equal(hasItinAddon({ internalAddons: [{ addon_name: 'ITIN Filing' }] }), true);
  assert.equal(hasItinAddon({ internalAddons: [{ addonName: 'ITIN Filing' }] }), true);
  assert.equal(
    hasItinAddon({
      selectedAddons: ['phone'],
      addonsSnapshot: [{ title: 'US Phone Number' }, { title: 'Cloud Hosting' }],
    }),
    false
  );
  // "itin" inside another word is not an ITIN add-on.
  assert.equal(hasItinAddon({ addonsSnapshot: [{ title: 'Britain Mail Forwarding' }] }), false);
});

test('ITIN statuses are offered only to ITIN orders, or when already on one', () => {
  const plain = getSelectableStatuses({ hasItin: false, current: 'pending' });
  assert.equal(plain.length, 7);
  assert.ok(plain.every((s) => !isItinStatus(s.value)));

  assert.equal(getSelectableStatuses({ hasItin: true, current: 'pending' }).length, 12);

  // Never strand an order on a value its own dropdown cannot show.
  const stranded = getSelectableStatuses({ hasItin: false, current: 'itin_received' });
  assert.equal(stranded.length, 12);
});

test('stage classification', () => {
  assert.equal(isFormationCompleteStatus('formation_completed'), true);
  assert.equal(isFormationCompleteStatus('itin_in_progress'), true);
  assert.equal(isFormationCompleteStatus('pending_payment'), false);
  assert.equal(isFormationCompleteStatus('formed_in_state'), false);

  for (const s of [
    'initialized',
    'submitted_in_state',
    'formed_in_state',
    'ein_pending',
    'pending_payment',
  ]) {
    assert.equal(isInProgressStatus(s), true, s);
  }
  for (const s of ['pending', 'formation_completed', 'itin_received', 'cancelled']) {
    assert.equal(isInProgressStatus(s), false, s);
  }

  assert.equal(isDocumentsExpectedStatus('ein_pending'), true);
  assert.equal(isDocumentsExpectedStatus('formation_completed'), true);
  assert.equal(isDocumentsExpectedStatus('itin_payment_pending'), true);
  assert.equal(isDocumentsExpectedStatus('submitted_in_state'), false);
  assert.equal(isDocumentsExpectedStatus('pending'), false);

  assert.deepEqual([...PAYMENT_PENDING_STATUSES], ['pending_payment', 'itin_payment_pending']);
});

test('countByStatus tallies every status and ignores cancelled / unknown', () => {
  const counts = countByStatus([
    { status: 'pending' },
    { status: 'pending' },
    { status: 'itin_received' },
    { status: 'cancelled' },
    { status: 'formed' }, // retired key
    { status: null },
  ]);
  assert.equal(counts.pending, 2);
  assert.equal(counts.itin_received, 1);
  assert.equal(Object.values(counts).reduce((a, b) => a + b, 0), 3);
  assert.deepEqual(Object.keys(counts), [...ORDER_STATUS_VALUES]);
});

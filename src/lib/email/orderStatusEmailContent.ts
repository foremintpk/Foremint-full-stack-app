/**
 * @file src/lib/email/orderStatusEmailContent.ts
 * @description Copy for the customer emails sent when an order changes status.
 *
 * Which email each status sends
 * -----------------------------
 *   pending                 — none (checkout already sends the order confirmation)
 *   pending_payment         — formation-complete template, balance call to action
 *   formation_completed     — formation-complete template, nothing owed
 *   every other status      — the generic status template, filled from here
 *
 * Plain data, no I/O, so the wording can be reviewed and tested on its own.
 * Strings may use the tokens {name}, {business} and {state}; the template
 * escapes the customer-supplied values before substituting them.
 */

import type { OrderStatusValue } from '@/lib/orders/orderStatus';

export interface StatusEmailStep {
  title: string;
  body: string;
}

export interface StatusEmailContent {
  subject: string;
  /** Emoji shown in the hero tile. */
  icon: string;
  heading: string;
  /** Opening paragraph. Tokens: {name}, {business}, {state}. */
  intro: string;
  stepsTitle: string;
  steps: StatusEmailStep[];
  /** Reassuring line under the steps. */
  closing?: string;
  /** Show the outstanding-balance card and point the button at billing. */
  showBalance?: boolean;
}

/** Statuses sent through the generic template. */
export const GENERIC_STATUS_EMAILS: Partial<Record<OrderStatusValue, StatusEmailContent>> = {
  initialized: {
    subject: 'We Have Started Your LLC Formation',
    icon: '🚀',
    heading: 'Your Order Is Underway',
    intro:
      'Thanks for your patience, {name}. We have reviewed your details and started the formation of {business}.',
    stepsTitle: 'What Happens Next',
    steps: [
      {
        title: 'We Prepare Your Filing',
        body: 'Our team is preparing your formation documents for submission to the state.',
      },
      {
        title: 'Submission to the State',
        body: 'Once the filing is ready we submit it and let you know straight away.',
      },
    ],
    closing:
      'No action is required from you at this stage. We will keep you updated step by step.',
  },

  submitted_in_state: {
    subject: 'Your LLC Has Been Submitted to the State',
    icon: '📨',
    heading: 'Submitted to the State',
    intro:
      'Good news, {name}. The formation filing for {business} has been submitted in {state} and is now under review.',
    stepsTitle: 'What Happens Next',
    steps: [
      {
        title: 'State Review',
        body: 'Processing times vary from state to state. We keep track of your filing and update you as it moves.',
      },
      {
        title: 'Approval',
        body: 'As soon as the state approves your filing, we will confirm that your LLC is formed.',
      },
    ],
    closing: 'No action is required from you at this stage.',
  },

  formed_in_state: {
    subject: 'Your LLC Is Now Formed in the State',
    icon: '🎉',
    heading: 'Your LLC Is Formed',
    intro: 'Congratulations, {name}. {business} has been approved and formed in {state}.',
    stepsTitle: 'What Happens Next',
    steps: [
      {
        title: 'Federal EIN Application',
        body: 'Next we apply to the IRS for your Employer Identification Number (EIN).',
      },
      {
        title: 'EIN Received',
        body: 'When the IRS issues your EIN we will let you know and add it to your account.',
      },
    ],
    closing: 'No action is required from you right now.',
  },

  ein_pending: {
    subject: 'Your EIN Application Is in Progress',
    icon: '🏛️',
    heading: 'EIN Application in Progress',
    intro:
      'Hi {name}. The federal EIN application for {business} is underway, and we are waiting for the IRS to issue your EIN.',
    stepsTitle: 'What Happens Next',
    steps: [
      {
        title: 'IRS Processing',
        body: 'The IRS reviews the application and issues your EIN. Timing is set by the IRS.',
      },
      {
        title: 'EIN Received',
        body: 'Once your EIN letter arrives we will notify you and add it to your dashboard.',
      },
    ],
    closing: 'No action is required from you at this stage.',
  },

  itin_initialized: {
    subject: 'Your ITIN Application Has Started',
    icon: '🪪',
    heading: 'ITIN Application Started',
    intro:
      'Hi {name}. We have started your ITIN (Individual Taxpayer Identification Number) application, as part of your order for {business}.',
    stepsTitle: 'What Happens Next',
    steps: [
      {
        title: 'Application Preparation',
        body: 'We prepare your ITIN application and the supporting documents it requires.',
      },
      {
        title: 'Processing',
        body: 'Once the application is submitted it moves into processing, and we keep you updated.',
      },
    ],
    closing: 'If we need anything further from you, we will contact you directly.',
  },

  itin_in_progress: {
    subject: 'Your ITIN Application Is in Progress',
    icon: '⏳',
    heading: 'ITIN Application in Progress',
    intro: 'Hi {name}. Your ITIN application is now in progress and moving through processing.',
    stepsTitle: 'What Happens Next',
    steps: [
      {
        title: 'Processing',
        body: 'ITIN processing times are set by the IRS and can take several weeks.',
      },
      {
        title: 'ITIN Received',
        body: 'When your ITIN is issued we will let you know right away.',
      },
    ],
    closing: 'No action is required from you at this stage.',
  },

  itin_received: {
    subject: 'Your ITIN Has Been Received',
    icon: '✅',
    heading: 'ITIN Received',
    intro: 'Great news, {name}. Your ITIN has been issued and received.',
    stepsTitle: 'What Happens Next',
    steps: [
      {
        title: 'Final Checks',
        body: 'We review your ITIN details and prepare everything for delivery.',
      },
      {
        title: 'Remaining Steps',
        body: 'We will confirm any remaining steps, including payment if a balance is due, in our next update.',
      },
    ],
  },

  itin_payment_pending: {
    subject: 'Payment Needed to Complete Your ITIN',
    icon: '💳',
    heading: 'One Step Remaining: Payment',
    intro:
      'Hi {name}. Your ITIN is ready to be finalised. To complete the process, please settle the remaining balance on your order for {business}.',
    stepsTitle: 'What You Need To Do',
    steps: [
      {
        title: 'Review Your Balance',
        body: 'Open the billing section of your dashboard to see what is outstanding.',
      },
      {
        title: 'Complete Your Payment',
        body: 'Once your payment is confirmed we finish your ITIN process.',
      },
    ],
    showBalance: true,
  },

  itin_process_completed: {
    subject: 'Your ITIN Process Is Complete',
    icon: '🎉',
    heading: 'ITIN Process Complete',
    intro:
      'Congratulations, {name}. Everything related to your ITIN is now complete for your order for {business}.',
    stepsTitle: 'What You Can Do Now',
    steps: [
      {
        title: 'Open Your Dashboard',
        body: 'Everything we hold for your order is available in your dashboard.',
      },
    ],
    closing: 'Thank you for choosing Foremint.',
  },
};

/** Statuses whose email is built from the formation-complete template. */
const FORMATION_COMPLETE_TEMPLATE_STATUSES: ReadonlySet<string> = new Set([
  'pending_payment',
  'formation_completed',
]);

/** Whether moving an order to this status emails the customer. */
export function hasStatusEmail(status: string): boolean {
  return (
    Object.hasOwn(GENERIC_STATUS_EMAILS, status) ||
    FORMATION_COMPLETE_TEMPLATE_STATUSES.has(status)
  );
}

export function usesFormationCompleteTemplate(status: string): boolean {
  return FORMATION_COMPLETE_TEMPLATE_STATUSES.has(status);
}

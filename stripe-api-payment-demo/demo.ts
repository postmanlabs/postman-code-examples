/**
 * Stripe Payment Demo
 *
 * This demo shows how to accept a payment using the Stripe API
 * with the generated Postman Code clients.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... npx tsx demo.ts
 *
 * Requirements:
 *   - Node.js 18+ (for native fetch)
 *   - A Stripe test secret key (get one at https://dashboard.stripe.com/test/apikeys)
 */

import { variables } from "./postman/stripe-api/shared/variables.js";
import { createPaymentIntent } from "./postman/stripe-api/payment-intents/create-payment-intent/client.js";
import { retrievePaymentIntent } from "./postman/stripe-api/payment-intents/retrieve-payment-intent/client.js";

// Configuration - load API key from environment, base URL from variables
const apiKey = process.env.STRIPE_SECRET_KEY || "";
const baseUrl = variables.collection.baseUrl;

// Test payment method tokens (from Stripe docs)
// These are pre-created test PaymentMethods that simulate different card scenarios
const TEST_PAYMENT_METHODS = {
  visa: "pm_card_visa",
  mastercard: "pm_card_mastercard",
  declined: "pm_card_chargeDeclined",
  requiresAuth: "pm_card_authenticationRequired",
} as const;

/**
 * Formats an amount in cents to a currency string.
 */
function formatAmount(cents: number, currency: string): string {
  const amount = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount);
}

/**
 * Main demo function.
 */
async function main(): Promise<void> {
  console.log("🔵 Stripe Payment Demo\n");

  // Validate API key
  if (!apiKey) {
    console.error(
      "❌ Error: STRIPE_SECRET_KEY environment variable is required"
    );
    console.error(
      "   Set it with: STRIPE_SECRET_KEY=sk_test_... npx tsx demo.ts"
    );
    process.exit(1);
  }

  if (!apiKey.startsWith("sk_test_")) {
    console.error("❌ Error: Please use a test API key (starts with sk_test_)");
    console.error("   Get one at: https://dashboard.stripe.com/test/apikeys");
    process.exit(1);
  }

  console.log("✓ Using test API key\n");

  // Create a payment
  const paymentAmount = 1000; // $10.00
  const paymentCurrency = "usd";

  console.log(
    `📝 Creating payment for ${formatAmount(paymentAmount, paymentCurrency)}...`
  );
  console.log(
    `   Payment method: ${TEST_PAYMENT_METHODS.visa} (test Visa card)`
  );
  console.log("");

  try {
    // Create and confirm the PaymentIntent in one call
    const paymentIntent = await createPaymentIntent(apiKey, baseUrl, {
      amount: paymentAmount,
      currency: paymentCurrency,
      confirm: true,
      description: "Demo payment from Postman Code example",
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
      payment_method: TEST_PAYMENT_METHODS.visa,
    });

    console.log("✓ PaymentIntent created and confirmed!");
    console.log(`   ID: ${paymentIntent.id}`);
    console.log(`   Status: ${paymentIntent.status}`);
    console.log(
      `   Amount: ${formatAmount(paymentIntent.amount, paymentIntent.currency)}`
    );
    console.log("");

    // Retrieve the payment to verify
    console.log("🔍 Retrieving payment to verify...");
    const retrieved = await retrievePaymentIntent(
      apiKey,
      baseUrl,
      paymentIntent.id
    );

    console.log("✓ Payment verified!");
    console.log(`   Status: ${retrieved.status}`);
    console.log(
      `   Amount received: ${formatAmount(
        retrieved.amount_received,
        retrieved.currency
      )}`
    );
    console.log("");

    if (retrieved.status === "succeeded") {
      console.log("🎉 Payment successful!\n");
      console.log(
        `   View in dashboard: https://dashboard.stripe.com/test/payments/${paymentIntent.id}`
      );
    } else {
      console.log(`⚠️  Payment status: ${retrieved.status}`);
    }
  } catch (error) {
    console.error(
      "❌ Payment failed:",
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}

main();

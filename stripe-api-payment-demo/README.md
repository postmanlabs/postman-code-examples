# Stripe Payment Demo

A demo of accepting payments with Stripe's PaymentIntent API. Built using [Postman Code](https://github.com/postmanlabs/postman-code-examples) to generate type-safe API clients from the official [Stripe API Postman Collection](https://www.postman.com/stripedev/stripe-developers/collection/v4lose6/stripe-api-2024-04-10).

## What It Does

The demo creates and confirms a $10.00 test payment using Stripe's two-step PaymentIntent flow:

1. **Create PaymentIntent** — Tell Stripe you want to collect a payment
2. **Confirm** — Attach a payment method and complete the transaction

The demo uses `confirm: true` to combine these into a single API call, then retrieves the PaymentIntent to verify the final status.

## Prerequisites

1. **Node.js** — Version 18 or higher
2. **Stripe Account** — Get a test API key from [dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Run the Demo

```bash
STRIPE_SECRET_KEY=sk_test_... npm run demo
```

You'll see output like:

```
🔵 Stripe Payment Demo

✓ Using test API key

📝 Creating payment for $10.00...
   Payment method: pm_card_visa (test Visa card)

✓ PaymentIntent created and confirmed!
   ID: pi_3Abc123Def456Ghi789Jkl0
   Status: succeeded
   Amount: $10.00

🎉 Payment successful!
```

View the payment in your [Stripe test dashboard](https://dashboard.stripe.com/test/payments).

## Project Structure

```
stripe-api-payment-demo/
├── demo.ts                                    # Main demo script
├── postman/stripe-api/                        # Generated API clients
│   ├── payment-intents/
│   │   ├── create-payment-intent/client.ts
│   │   ├── confirm-payment-intent/client.ts
│   │   └── retrieve-payment-intent/client.ts
│   └── shared/
│       ├── types.ts                           # TypeScript interfaces
│       └── variables.ts                       # Collection variables
├── .env                                       # Your API key (git-ignored)
└── package.json
```

## How the API Works

Stripe uses **PaymentIntents** to track the lifecycle of a payment:

- **Authentication**: Bearer token with your Stripe secret key
- **Content-Type**: `application/x-www-form-urlencoded` (Stripe uses form-encoded bodies, not JSON)
- **Amounts**: Specified in smallest currency unit (1000 = $10.00 USD)
- **Test Cards**: Use test payment method tokens like `pm_card_visa`

| Token | Simulates |
| --- | --- |
| `pm_card_visa` | Successful Visa payment |
| `pm_card_mastercard` | Successful Mastercard payment |
| `pm_card_chargeDeclined` | Declined card |
| `pm_card_authenticationRequired` | Card requiring 3D Secure |

## Note on Response Types

The Stripe API collection on Postman doesn't include response examples for the PaymentIntent endpoints. As a result, the response types in the generated code were inferred and are marked as `UNVERIFIED TYPE`. Adding response examples to your collections enables accurate response types and proper error handling in generated code.

## License

MIT

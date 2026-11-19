# Billing

## Catalog

- One Product per plan a customer can choose (Starter, Pro, Enterprise). Multiple Prices on a Product only for variants of the same plan, such as monthly and yearly or different currencies.
- Plans use Prices, never the deprecated `plan` object.
- With Stripe Tax, each Product sets `tax_code` and each Price sets `tax_behavior` when the catalog is created.

## Signup and Self-Service

- Signup uses a Checkout Session in `mode: "subscription"` with `line_items: [{ price, quantity }]`. Trials go in `subscription_data.trial_period_days`.
- Upgrades, downgrades, cancellation and payment method updates use the Customer Portal.
- Renewals, retries and dunning are left to Stripe Billing. The app never builds its own renewal loop from PaymentIntents.

## Usage-Based Billing

- New usage-based pricing uses Metronome, as Stripe recommends. Existing Billing Meters integrations need no migration.
- A flat or per-seat fee stays on the Stripe Subscription, and Metronome bills only the usage on the same Customer. Metronome invoices are paid through Stripe invoice flows, not Checkout.

## Required Events

| Event | Purpose |
| --- | --- |
| `checkout.session.completed` | Start access when `payment_status` is not `unpaid` |
| `checkout.session.async_payment_succeeded` and `checkout.session.async_payment_failed` | Delayed payment methods |
| `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted` | Plan, status and cancellation changes |
| `invoice.paid` and `invoice.payment_failed` | Renewals and dunning |
| `charge.refunded`, `charge.dispute.created`, `radar.early_fraud_warning.created` | Refunds, disputes and fraud signals |
| `customer.updated` | Only when the app stores Customer data |

- The app stores the subscription status and current period from the event or the fetched object, and derives access from them.
- Events map to app records through Stripe IDs (Customer, Subscription), resolved through the object graph. Metadata is only a fallback.

## Tax

- `automatic_tax: { enabled: true }` collects nothing until the account has an active registration in the customer's jurisdiction. Stripe returns no error.
- Registrations are checked before enabling automatic tax on Checkout Sessions, Subscriptions, Invoices and Payment Links.

## Testing

- Subscription timelines are tested with test clocks in a sandbox, not by waiting.

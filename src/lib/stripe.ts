import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe() {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-02-25.clover",
    });
  }
  return _stripe;
}

export const PRICE_IDS = {
  standard:  "price_1TEuR4RsDnlecpjihsgT4H7Z",
  featured:  "price_1TEuR5RsDnlecpjihv6Hxybd",
  newsletter:"price_1TEuRMRsDnlecpji7zwi6pKV",
  bundle3:   "price_1TEuR6RsDnlecpji4dYGJk9l",
  bundle5:   "price_1TEuR6RsDnlecpjiVLJRbW5c",
  founding:  "price_1TEuRNRsDnlecpjiIB2M7lrJ",
} as const;

export type PriceTier = keyof typeof PRICE_IDS;

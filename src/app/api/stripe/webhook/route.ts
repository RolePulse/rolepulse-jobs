import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const { job_id, employer_id } = session.metadata;

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { db: { schema: "jobs" } }
    );

    // Activate the job
    await sb.from("jobs").update({
      status: "active",
      posted_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }).eq("id", job_id);

    // Update stripe_orders
    await sb.from("stripe_orders").update({
      status: "paid",
      stripe_payment_intent: session.payment_intent,
      amount_pence: session.amount_total,
    }).eq("stripe_session_id", session.id);
  }

  return NextResponse.json({ received: true });
}
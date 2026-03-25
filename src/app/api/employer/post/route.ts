import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, PRICE_IDS, type PriceTier } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, location, remote, role_type, description, employer_id, tier } = await req.json();

  if (!title || !location || !role_type || !description || !employer_id || !tier) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (description.length < 100) {
    return NextResponse.json({ error: "Description must be at least 100 characters" }, { status: 400 });
  }

  const priceId = PRICE_IDS[tier as PriceTier];
  if (!priceId) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  // Look up employer to get company_id
  const { data: employer, error: empErr } = await supabase
    .from("employers")
    .select("company_id")
    .eq("id", employer_id)
    .single();

  if (empErr || !employer) {
    return NextResponse.json({ error: "Employer not found" }, { status: 404 });
  }

  // Create draft job
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    + "-" + Date.now().toString(36);

  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .insert({
      title,
      slug,
      location,
      remote: remote || false,
      role_type,
      description_html: description,
      company_id: employer.company_id,
      source: "employer",
      status: "draft",
    })
    .select("id")
    .single();

  if (jobErr) {
    return NextResponse.json({ error: jobErr.message }, { status: 500 });
  }

  // Create Stripe Checkout session
  const session = await getStripe().checkout.sessions.create({
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "payment",
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/employers/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/post-a-job`,
    metadata: { job_id: job.id, employer_id },
  });

  // Record the order
  await supabase.from("stripe_orders").insert({
    employer_id,
    job_id: job.id,
    stripe_session_id: session.id,
    product_type: tier,
    status: "pending",
  });

  return NextResponse.json({ checkout_url: session.url });
}

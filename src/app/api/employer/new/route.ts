import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { company_name, website, billing_email } = await req.json();

  if (!company_name || !billing_email) {
    return NextResponse.json({ error: "Company name and billing email are required" }, { status: 400 });
  }

  const slug = company_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  // Upsert company
  const { data: company, error: companyErr } = await supabase
    .from("companies")
    .upsert(
      { name: company_name, slug, is_employer: true, website: website || null },
      { onConflict: "slug" }
    )
    .select("id")
    .single();

  if (companyErr) {
    return NextResponse.json({ error: companyErr.message }, { status: 500 });
  }

  // Insert employer record
  const { data: employer, error: employerErr } = await supabase
    .from("employers")
    .upsert(
      { company_id: company.id, user_id: user.id, billing_email },
      { onConflict: "user_id,company_id" }
    )
    .select("id")
    .single();

  if (employerErr) {
    return NextResponse.json({ error: employerErr.message }, { status: 500 });
  }

  return NextResponse.json({ employer_id: employer.id, company_id: company.id });
}

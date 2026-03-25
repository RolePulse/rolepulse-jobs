import { runIngestion } from "@/lib/ingestion/ingest";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const ingestKey = req.headers.get("x-ingest-key");
  if (ingestKey !== process.env.INGEST_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await runIngestion();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

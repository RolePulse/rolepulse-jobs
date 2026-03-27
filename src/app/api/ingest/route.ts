import { runIngestion } from "@/lib/ingestion/ingest";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300; // 5 min — needs Pro plan or use batch mode below

export async function POST(req: NextRequest) {
  const ingestKey = req.headers.get("x-ingest-key");
  if (ingestKey !== process.env.INGEST_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Batch mode: pass ?batch=N&size=M to ingest a specific page of companies
  // e.g. /api/ingest?batch=0&size=20 ingests companies 0-19
  //      /api/ingest?batch=1&size=20 ingests companies 20-39
  const url = new URL(req.url);
  const batchParam = url.searchParams.get("batch");
  const sizeParam = url.searchParams.get("size");

  const batchIndex = batchParam !== null ? parseInt(batchParam) : null;
  const batchSize = sizeParam !== null ? parseInt(sizeParam) : 20;

  try {
    const result = await runIngestion({ batchIndex, batchSize });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

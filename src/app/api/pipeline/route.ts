import { NextRequest, NextResponse } from "next/server";
import { runPipeline } from "@/agents/pipeline";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await runPipeline({
      date: body.date,
      leagues: body.leagues,
      skipCache: body.skipCache === true,
    });

    if (result.status === "error") {
      return NextResponse.json(result, { status: 502 });
    }

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      {
        status: "error",
        agent: 1,
        message: e instanceof Error ? e.message : "Erreur pipeline",
        pipeline_ran_at: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? undefined;
  const skipCache = req.nextUrl.searchParams.get("refresh") === "1";
  const result = await runPipeline({ date, skipCache });
  return NextResponse.json(result);
}

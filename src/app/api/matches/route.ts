import { NextRequest, NextResponse } from "next/server";
import { agentCollector } from "@/agents/agent-collector";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? undefined;
  const leaguesParam = req.nextUrl.searchParams.get("leagues");
  const leagues = leaguesParam
    ? leaguesParam.split(",").map(Number).filter(Boolean)
    : undefined;

  try {
    const data = await agentCollector.run({ date, leagues });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur collecte" },
      { status: 500 }
    );
  }
}
